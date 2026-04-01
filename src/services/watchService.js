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
        
        // ✅ كشف الهاتف
        this.isMobile = this.detectMobile();
        
        // ✅ تخزين بيانات الساعة
        this.watchData = null;
        
        console.log('📱 WatchService Init:', { isMobile: this.isMobile });
        
        // ✅ إذا كان على هاتف، نستعد لاستقبال البيانات من تطبيق الساعة
        if (this.isMobile) {
            console.log('📱 Mobile detected - waiting for FitPro app data');
            this.setupWatchDataReceiver();
        } else {
            console.log('💻 Desktop mode - using Web Bluetooth');
        }
    }

    // ✅ كشف الهاتف
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i.test(userAgent);
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        return isAndroid || isIOS || isMobileUA || isTouchDevice;
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
            // ✅ التحقق من مصدر الرسالة
            const data = event.data;
            
            // ✅ إذا كانت البيانات من تطبيق الساعة
            if (data && data.source === 'fitpro' || data.type === 'health_data') {
                console.log('📡 Health data received from FitPro:', data);
                this.processHealthData(data);
            }
            
            // ✅ معالجة تنسيقات مختلفة
            if (data.heartRate || data.heart_rate) {
                const heartRate = data.heartRate || data.heart_rate;
                this.processHeartRate(heartRate);
            }
            
            if (data.bloodPressure || (data.systolic && data.diastolic)) {
                const bp = data.bloodPressure || { systolic: data.systolic, diastolic: data.diastolic };
                this.processBloodPressure(bp);
            }
            
            // ✅ معالجة بيانات أخرى
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
        
        // ✅ إرسال طلب عبر postMessage
        window.postMessage({ type: 'request_health_data', source: 'livocare' }, '*');
        
        // ✅ إذا كان هناك واجهة Android
        if (window.AndroidInterface) {
            window.AndroidInterface.requestWatchData();
        }
        
        // ✅ محاولة الاتصال عبر WebView
        if (window.webkit && window.webkit.messageHandlers) {
            window.webkit.messageHandlers.requestWatchData.postMessage({});
        }
    }
    
    // ✅ معالجة ضربات القلب
    processHeartRate(heartRate) {
        if (heartRate && heartRate !== this.healthData.heartRate) {
            console.log(`❤️ Heart Rate from FitPro: ${heartRate} BPM`);
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
                console.log(`🩸 Blood Pressure from FitPro: ${bp.systolic}/${bp.diastolic} mmHg`);
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
        console.log(`🩸 Glucose from FitPro: ${glucose} mg/dL`);
        this.notifyCallbacks('glucose', glucose);
        this.saveToDatabase('glucose', glucose);
    }
    
    // ✅ معالجة الخطوات
    processSteps(steps) {
        console.log(`👣 Steps from FitPro: ${steps}`);
        this.notifyCallbacks('steps', steps);
    }
    
    // ✅ معالجة الأكسجين
    processSpO2(spo2) {
        console.log(`💨 SpO2 from FitPro: ${spo2}%`);
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
    
    // ✅ الاتصال بالساعة مباشرة (للكمبيوتر)
    async connectToWatch() {
        if (this.isMobile) {
            console.log('📱 Mobile device - using FitPro app');
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

    // ✅ التحقق من دعم Web Bluetooth
    isSupported() {
        if (this.isMobile) return false;
        return 'bluetooth' in navigator;
    }

    // ✅ إعداد مراقبة البيانات من الساعة (للكمبيوتر)
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

    // ✅ معالجة البيانات من الساعة (للكمبيوتر)
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
    
    // ✅ طلب قياس جديد
    async requestMeasurement() {
        if (this.isMobile) {
            console.log('📱 FitPro mode - please measure on your watch app');
            this.requestWatchData();
            return true;
        }
        
        if (!this.isConnected || !this.writeChar) return false;
        
        try {
            await this.writeChar.writeValue(new Uint8Array([0x01, 0x00]));
            return true;
        } catch (error) {
            return false;
        }
    }

    // ✅ قراءة آخر قياس لضربات القلب
    async readHeartRate() {
        return this.healthData.heartRate;
    }

    // ✅ قراءة آخر قياس لضغط الدم
    async readBloodPressure() {
        return this.healthData.bloodPressure;
    }

    // ✅ التحقق من التنبيهات
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

    // ✅ حفظ البيانات في قاعدة البيانات
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

    // ✅ إرسال إشعار
    sendNotification(title, message) {
        const event = new CustomEvent('watchAlert', { detail: { title, message } });
        window.dispatchEvent(event);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
    }

    // ✅ تسجيل دالة استقبال البيانات
    onData(callback) {
        if (typeof callback === 'function') {
            this.onDataCallbacks.push(callback);
        }
    }

    // ✅ إشعار المشتركين بالبيانات
    notifyCallbacks(type, data) {
        this.onDataCallbacks.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {}
        });
    }

    // ✅ فصل الاتصال
    disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        
        this.isConnected = false;
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

    // ✅ دالة لتعيين وضع الهاتف يدوياً (للتوافق مع الكود القديم)
    setMobileMode(isMobile, computerIP) {
        console.log('📱 setMobileMode called with:', { isMobile, computerIP });
        this.isMobile = isMobile;
        if (computerIP) {
            this.computerIP = computerIP;
            localStorage.setItem('computerIP', computerIP);
        }
        localStorage.setItem('forceMobileMode', isMobile ? 'true' : 'false');
        
        if (isMobile && !this.isMobile) {
            this.isMobile = true;
            this.setupWatchDataReceiver();
        }
        return true;
    }

    // ✅ دالة لتفعيل وضع ADB (للتوافق)
    enableADBMode() {
        console.log('📱 enableADBMode called - switching to mobile mode');
        this.isMobile = true;
        this.setupWatchDataReceiver();
        return true;
    }

    // ✅ دالة لتعطيل وضع ADB
    disableADBMode() {
        console.log('📱 disableADBMode called - switching to desktop mode');
        this.isMobile = false;
        return true;
    }
        // ✅ دالة للاتصال بـ ADB Monitor (للتوافق مع الكود القديم)
    connectADBMonitor() {
        console.log('📱 connectADBMonitor called - switching to mobile mode');
        this.isMobile = true;
        this.setupWatchDataReceiver();
        return true;
    }
}

export default new WatchService();