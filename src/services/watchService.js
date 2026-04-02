// src/services/watchService.js
import axios from 'axios';

class WatchService {
    constructor() {
        this.isConnected = false;
        this.healthData = {
            heartRate: null,
            bloodPressure: { systolic: null, diastolic: null },
            lastUpdate: null
        };
        this.onDataCallbacks = [];
        
        // ✅ إضافة المتغيرات المفقودة
        this.computerIP = localStorage.getItem('computerIP') || '192.168.8.187';
        this.ws = null;
        this.isADBMode = false;
        
        // ✅ كشف الهاتف
        this.isMobile = this.detectMobile();
        
        // ✅ تخزين بيانات الساعة
        this.watchData = null;
        
        console.log('📱 WatchService Init:', { isMobile: this.isMobile, computerIP: this.computerIP });
        
        // ✅ إذا كان على هاتف، نستعد لاستقبال البيانات من تطبيق الساعة
        if (this.isMobile) {
            console.log('📱 Mobile detected - waiting for FitPro app data');
            this.setupWatchDataReceiver();
            // ✅ محاولة الاتصال بـ ADB Monitor تلقائياً
            setTimeout(() => this.connectADBWebSocket(), 1000);
        } else {
            console.log('💻 Desktop mode - using Web Bluetooth');
        }
    }

    // ✅ كشف الهاتف - نسخة أقوى
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const savedMobile = localStorage.getItem('forceMobileMode') === 'true';
        
        const isMobile = isAndroid || isIOS || isMobileUA || isTouchDevice || savedMobile;
        
        console.log('📱 Device Detection:', {
            isAndroid,
            isIOS,
            isMobileUA,
            isTouchDevice,
            savedMobile,
            result: isMobile
        });
        
        return isMobile;
    }

    // ===========================================
    // 🔌 الاتصال بـ ADB Monitor عبر WebSocket
    // ===========================================
    
    connectADBWebSocket() {
        const wsUrl = `ws://${this.computerIP}:3001`;
        console.log(`🔌 Connecting to ADB Monitor at: ${wsUrl}`);
        
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('⚠️ Already connected or connecting');
            return;
        }
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to ADB Monitor');
                this.isADBMode = true;
                this.isConnected = true;
                
                // ✅ إرسال التوكن للمصادقة
                const token = localStorage.getItem('access_token');
                if (token) {
                    this.ws.send(JSON.stringify({ type: 'token', token }));
                }
                
                // ✅ إرسال طلب بدء البث
                this.ws.send(JSON.stringify({ type: 'start_streaming' }));
                
                this.notifyCallbacks('connected', { 
                    mode: 'ADB', 
                    message: 'متصل بـ ADB Monitor' 
                });
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 ADB Monitor data:', data);
                    
                    if (data.type === 'health_data') {
                        if (data.heartRate) {
                            console.log(`❤️ Heart Rate from ADB: ${data.heartRate} BPM`);
                            this.processHeartRate(data.heartRate);
                        }
                        if (data.bloodPressure) {
                            console.log(`🩸 Blood Pressure from ADB: ${data.bloodPressure.systolic}/${data.bloodPressure.diastolic}`);
                            this.processBloodPressure(data.bloodPressure);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing ADB data:', e);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('ADB Monitor connection error:', error);
                this.isADBMode = false;
                this.isConnected = false;
                this.notifyCallbacks('error', { message: 'فشل الاتصال بـ ADB Monitor' });
            };
            
            this.ws.onclose = () => {
                console.log('ADB Monitor disconnected');
                this.isADBMode = false;
                this.isConnected = false;
                this.notifyCallbacks('disconnected', { message: 'تم قطع الاتصال بـ ADB Monitor' });
                
                // ✅ محاولة إعادة الاتصال بعد 5 ثوانٍ
                setTimeout(() => this.connectADBWebSocket(), 5000);
            };
            
        } catch (error) {
            console.error('Failed to connect to ADB Monitor:', error);
        }
    }
    
    // ✅ طلب قياس من ADB Monitor
    requestADBMeasurement() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'request_measurement' }));
            console.log('📤 Requested measurement from ADB');
            return true;
        } else {
            console.log('⚠️ WebSocket not connected');
            this.connectADBWebSocket();
            return false;
        }
    }

    // ===========================================
    // 📱 وضع الهاتف - استقبال البيانات من تطبيق الساعة
    // ===========================================
    
    setupWatchDataReceiver() {
        // ✅ الاستماع للرسائل من تطبيق الساعة
        window.addEventListener('message', this.handleWatchMessage.bind(this));
        
        // ✅ إرسال طلب لتطبيق الساعة لبدء البث
        this.requestWatchData();
        
        // ✅ محاولة الاتصال بـ WebView إذا كان التطبيق داخل WebView
        if (window.AndroidInterface) {
            console.log('📱 Android WebView detected');
            window.AndroidInterface.requestWatchData();
        }
        
        // ✅ إذا كان هناك أي كائن FitPro في الـ window
        if (window.FitPro) {
            console.log('📱 FitPro object detected');
            window.FitPro.requestData();
        }
    }
    
    // ✅ معالجة الرسائل الواردة من تطبيق الساعة
    handleWatchMessage(event) {
        try {
            const data = event.data;
            
            if (data && (data.source === 'fitpro' || data.type === 'health_data')) {
                console.log('📡 Health data received from FitPro:', data);
                this.processHealthData(data);
            }
            
            if (data.heartRate || data.heart_rate) {
                const heartRate = data.heartRate || data.heart_rate;
                this.processHeartRate(heartRate);
            }
            
            if (data.bloodPressure || (data.systolic && data.diastolic)) {
                const bp = data.bloodPressure || { systolic: data.systolic, diastolic: data.diastolic };
                this.processBloodPressure(bp);
            }
            
            if (data.glucose || data.blood_glucose) {
                const glucose = data.glucose || data.blood_glucose;
                this.processGlucose(glucose);
            }
            
            if (data.steps) {
                this.processSteps(data.steps);
            }
            
            if (data.spo2) {
                this.processSpO2(data.spo2);
            }
            
        } catch (error) {
            console.error('Error handling watch message:', error);
        }
    }
    
    // ✅ طلب البيانات من تطبيق الساعة
    requestWatchData() {
        console.log('📱 Requesting watch data from FitPro app...');
        window.postMessage({ type: 'request_health_data', source: 'livocare' }, '*');
        
        if (window.AndroidInterface) {
            window.AndroidInterface.requestWatchData();
        }
        
        if (window.webkit && window.webkit.messageHandlers) {
            window.webkit.messageHandlers.requestWatchData.postMessage({});
        }
    }
    
    // ✅ معالجة ضربات القلب
    processHeartRate(heartRate) {
        if (heartRate && heartRate !== this.healthData.heartRate) {
            console.log(`❤️ Heart Rate received: ${heartRate} BPM`);
            this.healthData.heartRate = heartRate;
            this.healthData.lastUpdate = new Date();
            this.notifyCallbacks('heartRate', heartRate);
            this.saveToDatabase('heartRate', heartRate);
            this.checkAlerts(heartRate, null);
        }
    }
    
    // ✅ معالجة ضغط الدم
    processBloodPressure(bp) {
        if (bp && bp.systolic && bp.diastolic) {
            if (bp.systolic !== this.healthData.bloodPressure.systolic) {
                console.log(`🩸 Blood Pressure received: ${bp.systolic}/${bp.diastolic} mmHg`);
                this.healthData.bloodPressure = bp;
                this.healthData.lastUpdate = new Date();
                this.notifyCallbacks('bloodPressure', bp);
                this.saveToDatabase('bloodPressure', bp);
                this.checkAlerts(null, bp);
            }
        }
    }
    
    // ✅ معالجة السكر
    processGlucose(glucose) {
        console.log(`🩸 Glucose received: ${glucose} mg/dL`);
        this.notifyCallbacks('glucose', glucose);
        this.saveToDatabase('glucose', glucose);
    }
    
    // ✅ معالجة الخطوات
    processSteps(steps) {
        console.log(`👣 Steps received: ${steps}`);
        this.notifyCallbacks('steps', steps);
    }
    
    // ✅ معالجة الأكسجين
    processSpO2(spo2) {
        console.log(`💨 SpO2 received: ${spo2}%`);
        this.notifyCallbacks('spo2', spo2);
    }
    
    // ✅ معالجة البيانات الصحية الكاملة
    processHealthData(data) {
        if (data.heartRate) this.processHeartRate(data.heartRate);
        if (data.bloodPressure) this.processBloodPressure(data.bloodPressure);
        if (data.glucose) this.processGlucose(data.glucose);
        if (data.steps) this.processSteps(data.steps);
        if (data.spo2) this.processSpO2(data.spo2);
    }

    // ===========================================
    // 💻 وضع الكمبيوتر - الاتصال المباشر بالساعة
    // ===========================================
    
    async connectToWatch() {
        if (this.isMobile) {
            console.log('📱 Mobile device - using ADB Monitor');
            this.connectADBWebSocket();
            return true;
        }
        
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth غير مدعوم في هذا المتصفح');
        }

        try {
            console.log('🔍 Searching for smart watch...');
            
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: false,
                filters: [
                    { namePrefix: 'Z99' },
                    { namePrefix: 'SmartWatch' },
                    { namePrefix: 'MI' },
                    { namePrefix: 'HW' }
                ],
                optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9d']
            });

            console.log('✅ Watch found:', device.name);
            this.device = device;
            this.server = await this.device.gatt.connect();
            this.isConnected = true;
            
            await this.setupHealthMonitoring();
            
            this.notifyCallbacks('connected', { 
                mode: 'Bluetooth', 
                message: 'متصل بالساعة الذكية' 
            });
            
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);
            throw error;
        }
    }

    isSupported() {
        if (this.isMobile) return false;
        return 'bluetooth' in navigator;
    }

    async setupHealthMonitoring() {
        if (this.isMobile) return;
        
        try {
            const service = await this.server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9d');
            const characteristics = await service.getCharacteristics();
            
            for (const char of characteristics) {
                if (char.uuid.toLowerCase().includes('notify')) {
                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleWatchData(event.target.value);
                    });
                }
                if (char.uuid.toLowerCase().includes('write')) {
                    this.writeChar = char;
                }
            }
        } catch (error) {
            console.warn('Could not setup health monitoring');
        }
    }

    handleWatchData(dataView) {
        try {
            const bytes = new Uint8Array(dataView.buffer);
            if (bytes.length > 2) {
                const heartRate = bytes[2];
                if (heartRate >= 40 && heartRate <= 200) {
                    this.processHeartRate(heartRate);
                }
            }
        } catch (error) {}
    }

    // ===========================================
    // 📡 دوال مشتركة
    // ===========================================
    
    async requestMeasurement() {
        if (this.isMobile) {
            console.log('📱 ADB mode - requesting measurement');
            return this.requestADBMeasurement();
        }
        
        if (!this.isConnected || !this.writeChar) return false;
        
        try {
            await this.writeChar.writeValue(new Uint8Array([0x01, 0x00]));
            return true;
        } catch (error) {
            return false;
        }
    }

    async readHeartRate() {
        return this.healthData.heartRate;
    }

    async readBloodPressure() {
        return this.healthData.bloodPressure;
    }

    checkAlerts(heartRate, bp) {
        if (heartRate && (heartRate > 100 || heartRate < 60)) {
            const msg = heartRate > 100 ? `ارتفاع: ${heartRate} BPM` : `انخفاض: ${heartRate} BPM`;
            this.sendNotification('⚠️ ضربات القلب', msg);
        }
        
        if (bp && (bp.systolic > 140 || bp.systolic < 90)) {
            const msg = bp.systolic > 140 ? `ارتفاع الضغط: ${bp.systolic}/${bp.diastolic}` : `انخفاض الضغط: ${bp.systolic}/${bp.diastolic}`;
            this.sendNotification('⚠️ ضغط الدم', msg);
        }
    }

    async saveToDatabase(type, data) {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        try {
            const payload = { recorded_at: new Date().toISOString() };
            if (type === 'heartRate') payload.heart_rate = data;
            else if (type === 'bloodPressure') {
                payload.systolic_pressure = data.systolic;
                payload.diastolic_pressure = data.diastolic;
            } else if (type === 'glucose') {
                payload.blood_glucose = data;
            }
            
            await axios.post('/api/watch/health-data/', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`✅ Saved ${type} to database`);
        } catch (error) {
            console.error('Failed to save:', error);
        }
    }

    sendNotification(title, message) {
        const event = new CustomEvent('watchAlert', { detail: { title, message } });
        window.dispatchEvent(event);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
    }

    onData(callback) {
        if (typeof callback === 'function') {
            this.onDataCallbacks.push(callback);
        }
    }

    notifyCallbacks(type, data) {
        this.onDataCallbacks.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {}
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        
        this.isConnected = false;
        this.isADBMode = false;
        this.healthData = {
            heartRate: null,
            bloodPressure: { systolic: null, diastolic: null },
            lastUpdate: null
        };
        
        console.log('🔌 WatchService disconnected');
    }

    // ===========================================
    // ✅ دوال التوافق مع الكود القديم
    // ===========================================

    setMobileMode(isMobile, computerIP) {
        console.log('📱 setMobileMode called with:', { isMobile, computerIP });
        this.isMobile = isMobile;
        if (computerIP) {
            this.computerIP = computerIP;
            localStorage.setItem('computerIP', computerIP);
        }
        localStorage.setItem('forceMobileMode', isMobile ? 'true' : 'false');
        
        if (isMobile) {
            this.connectADBWebSocket();
        }
        return true;
    }

    enableADBMode() {
        console.log('📱 enableADBMode called - connecting to ADB Monitor');
        this.isMobile = true;
        this.connectADBWebSocket();
        return true;
    }

    disableADBMode() {
        console.log('📱 disableADBMode called - switching to desktop mode');
        this.isMobile = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        return true;
    }

    connectADBMonitor() {
        console.log('📱 connectADBMonitor called - connecting to ADB Monitor');
        this.connectADBWebSocket();
        return true;
    }
}

export default new WatchService();