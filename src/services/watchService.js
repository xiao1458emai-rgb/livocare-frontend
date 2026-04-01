// src/services/watchService.js
import axios from 'axios';

class WatchService {
    constructor() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.characteristics = {};
        this.healthData = {
            heartRate: null,
            bloodPressure: { systolic: null, diastolic: null },
            lastUpdate: null
        };
        this.onDataCallbacks = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        
        // ✅ كشف الجهاز
        this.isMobile = this.detectMobile();
        this.isADBMode = false; // سيتم تفعيلها إذا كان هاتف
        
        // ✅ عنوان IP للحاسوب - يمكن تغييره من localStorage
        this.computerIP = localStorage.getItem('computerIP') || '192.168.8.187';
        
        // ✅ WebSocket للاتصال بتطبيق الساعة على الهاتف
        this.ws = null;
        
        // ✅ إعدادات Bluetooth للساعة
        this.possibleServices = {
            HEALTH_SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dcca9d',
            DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
            BATTERY: '0000180f-0000-1000-8000-00805f9b34fb'
        };
        
        this.characteristicsUUID = {
            WRITE: '6e400002-b5a3-f393-e0a9-e50e24dcca9d',
            NOTIFY: '6e400003-b5a3-f393-e0a9-e50e24dcca9d'
        };
        
        this.autoReconnectTimer = null;
        this.dataTimeout = null;
        this.simulationInterval = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.isRequesting = false;
        
        console.log('📱 WatchService Init:', {
            isMobile: this.isMobile,
            isADBMode: this.isADBMode,
            computerIP: this.computerIP
        });
        
        // ✅ إذا كان على هاتف، نستعد لاستقبال البيانات من تطبيق الساعة
        if (this.isMobile) {
            console.log('📱 Mobile detected - waiting for FitPro app data');
            this.connectToWatchApp();
        } else {
            console.log('💻 Desktop mode - using Web Bluetooth for direct watch connection');
        }
    }

    // ✅ كشف الهاتف بشكل دقيق
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const savedMobile = localStorage.getItem('forceMobileMode') === 'true';
        
        const isMobile = isAndroid || isIOS || isMobileUA || isSmallScreen || isTouchDevice || savedMobile;
        
        console.log('📱 Device Detection:', {
            isAndroid,
            isIOS,
            isMobileUA,
            isSmallScreen,
            isTouchDevice,
            savedMobile,
            result: isMobile
        });
        
        return isMobile;
    }

    // ===========================================
    // 🔗 وضع الهاتف - الاتصال بتطبيق الساعة (FitPro)
    // ===========================================
    
    // ✅ الاتصال بتطبيق الساعة على الهاتف
    connectToWatchApp() {
        if (!this.isMobile) {
            console.log('💻 Desktop mode - using direct Bluetooth');
            return;
        }
        
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('⚠️ Already connected to FitPro app');
            return;
        }
        
        const wsUrl = this.getWebSocketUrl();
        if (!wsUrl) {
            console.log('⚠️ No WebSocket URL available');
            return;
        }
        
        console.log(`🔌 Connecting to FitPro app at: ${wsUrl}`);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to FitPro app');
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
                    mode: 'FitPro', 
                    message: 'متصل بتطبيق الساعة' 
                });
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 FitPro data received:', data);
                    
                    // ✅ معالجة بيانات ضربات القلب
                    if (data.type === 'heart_rate' || data.heartRate) {
                        const heartRate = data.heartRate || data.value;
                        if (heartRate) {
                            console.log(`❤️ Heart Rate from FitPro: ${heartRate} BPM`);
                            this.healthData.heartRate = heartRate;
                            this.healthData.lastUpdate = new Date();
                            this.notifyCallbacks('heartRate', heartRate);
                            this.saveToDatabase('heartRate', heartRate);
                            this.checkAlerts(heartRate, null);
                        }
                    }
                    
                    // ✅ معالجة بيانات ضغط الدم
                    if (data.type === 'blood_pressure' || data.bloodPressure) {
                        const bp = data.bloodPressure || { systolic: data.systolic, diastolic: data.diastolic };
                        if (bp.systolic && bp.diastolic) {
                            console.log(`🩸 BP from FitPro: ${bp.systolic}/${bp.diastolic}`);
                            this.healthData.bloodPressure = bp;
                            this.healthData.lastUpdate = new Date();
                            this.notifyCallbacks('bloodPressure', bp);
                            this.saveToDatabase('bloodPressure', bp);
                            this.checkAlerts(null, bp);
                        }
                    }
                    
                    // ✅ معالجة بيانات أخرى (سكر، أكسجين، إلخ)
                    if (data.type === 'glucose' && data.value) {
                        console.log(`🩸 Glucose from FitPro: ${data.value} mg/dL`);
                        this.notifyCallbacks('glucose', data.value);
                        this.saveToDatabase('glucose', data.value);
                    }
                    
                    if (data.type === 'spo2' && data.value) {
                        console.log(`💨 SpO2 from FitPro: ${data.value}%`);
                        this.notifyCallbacks('spo2', data.value);
                    }
                    
                    if (data.type === 'steps' && data.value) {
                        console.log(`👣 Steps from FitPro: ${data.value}`);
                        this.notifyCallbacks('steps', data.value);
                    }
                    
                } catch (e) {
                    console.error('Error parsing FitPro data:', e);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('FitPro connection error:', error);
                this.isADBMode = false;
                this.isConnected = false;
                this.notifyCallbacks('error', { 
                    mode: 'FitPro', 
                    message: 'فشل الاتصال بتطبيق الساعة' 
                });
            };
            
            this.ws.onclose = () => {
                console.log('FitPro app disconnected');
                this.isADBMode = false;
                this.isConnected = false;
                this.notifyCallbacks('disconnected', { 
                    mode: 'FitPro', 
                    message: 'تم قطع الاتصال بتطبيق الساعة' 
                });
                
                // ✅ محاولة إعادة الاتصال بعد 5 ثوانٍ
                setTimeout(() => this.connectToWatchApp(), 5000);
            };
            
        } catch (error) {
            console.error('Failed to connect to FitPro app:', error);
            this.isADBMode = false;
            this.isConnected = false;
        }
    }
    
    // ✅ عنوان WebSocket للاتصال بتطبيق الساعة
    getWebSocketUrl() {
        // ✅ في بيئة الإنتاج (Render)، نحتاج إلى عنوان صحيح
        const isProduction = window.location.hostname.includes('onrender.com') || 
                             window.location.hostname.includes('render.com');
        
        if (isProduction) {
            // ✅ في الإنتاج، نحتاج إلى استخدام HTTPS/WSS
            // يجب أن يكون هناك خادم WebSocket يعمل على Render
            return `wss://${window.location.hostname}/ws/watch`;
        }
        
        // ✅ في التطوير المحلي
        if (this.isMobile) {
            const hostname = window.location.hostname;
            if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
                return `ws://${hostname}:3001`;
            }
            return `ws://${this.computerIP}:3001`;
        }
        
        return 'ws://localhost:3001';
    }

    // ===========================================
    // 🔗 وضع الكمبيوتر - الاتصال المباشر بالساعة
    // ===========================================
    
    // ✅ دالة الاتصال الرئيسية
    async connectToWatch() {
        // ✅ إذا كان على هاتف، نستخدم وضع FitPro
        if (this.isMobile) {
            console.log('📱 Mobile device - using FitPro app mode');
            this.connectToWatchApp();
            return true;
        }
        
        // ✅ إذا كان على كمبيوتر، نستخدم Web Bluetooth
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
                    { namePrefix: 'HW' },
                    { namePrefix: 'Amazfit' },
                    { namePrefix: 'Huawei' }
                ],
                optionalServices: [
                    this.possibleServices.HEALTH_SERVICE,
                    this.possibleServices.DEVICE_INFO,
                    this.possibleServices.BATTERY
                ]
            });

            console.log('✅ Watch found:', device.name || device.id);
            this.device = device;
            this.server = await this.device.gatt.connect();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('⚠️ Watch disconnected');
                this.isConnected = false;
                this.handleDisconnect();
            });
            
            await this.getDeviceInfo();
            await this.getBatteryLevel();
            await this.setupHealthMonitoring();
            
            this.notifyCallbacks('connected', { 
                mode: 'Bluetooth', 
                message: 'متصل بالساعة الذكية' 
            });
            
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // ✅ التحقق من دعم Web Bluetooth
    isSupported() {
        if (this.isMobile) return false;
        return 'bluetooth' in navigator;
    }

    // ✅ إعداد مراقبة البيانات من الساعة
    async setupHealthMonitoring() {
        if (this.isMobile) return; // الهاتف يستخدم FitPro
        
        try {
            const service = await this.server.getPrimaryService(this.possibleServices.HEALTH_SERVICE);
            const characteristics = await service.getCharacteristics();
            
            for (const char of characteristics) {
                const uuid = char.uuid.toLowerCase();
                if (uuid === this.characteristicsUUID.NOTIFY.toLowerCase()) {
                    this.notifyChar = char;
                }
                if (uuid === this.characteristicsUUID.WRITE.toLowerCase()) {
                    this.writeChar = char;
                }
            }
            
            if (this.notifyChar) {
                await this.notifyChar.startNotifications();
                this.notifyChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleHealthData(event.target.value);
                });
                this.startDataTimeout();
            } else {
                this.startSimulationMode();
            }
        } catch (error) {
            console.warn('⚠️ Could not setup health monitoring, using simulation mode');
            this.startSimulationMode();
        }
    }

    // ✅ معالجة البيانات من الساعة
    handleHealthData(dataView) {
        if (this.isMobile) return;
        this.startDataTimeout();
        
        try {
            const bytes = new Uint8Array(dataView.buffer);
            const heartRate = this.extractHeartRate(bytes);
            const bp = this.extractBloodPressure(bytes);
            
            if (heartRate) {
                this.healthData.heartRate = heartRate;
                this.healthData.lastUpdate = new Date();
                this.notifyCallbacks('heartRate', heartRate);
                this.saveToDatabase('heartRate', heartRate);
                this.checkAlerts(heartRate, null);
            }
            
            if (bp) {
                this.healthData.bloodPressure = bp;
                this.healthData.lastUpdate = new Date();
                this.notifyCallbacks('bloodPressure', bp);
                this.saveToDatabase('bloodPressure', bp);
                this.checkAlerts(null, bp);
            }
        } catch (error) {
            console.warn('Error parsing health data:', error);
        }
    }

    // ✅ استخراج ضربات القلب من البيانات
    extractHeartRate(bytes) {
        if (bytes.length > 2) {
            let hr = bytes[2];
            if (hr >= 40 && hr <= 200) return hr;
        }
        return null;
    }

    // ✅ استخراج ضغط الدم من البيانات
    extractBloodPressure(bytes) {
        for (let i = 0; i < bytes.length - 1; i++) {
            const systolic = bytes[i];
            const diastolic = bytes[i + 1];
            if (systolic >= 80 && systolic <= 180 && diastolic >= 50 && diastolic <= 120) {
                return { systolic, diastolic };
            }
        }
        return null;
    }

    // ===========================================
    // 📡 دوال مشتركة
    // ===========================================
    
    // ✅ طلب قياس جديد
    async requestMeasurement() {
        if (this.isMobile) {
            console.log('📱 FitPro mode - please measure on your watch app');
            this.sendNotification('FitPro', 'افتح تطبيق الساعة وقم بالقياس');
            return true;
        }
        
        if (!this.isConnected || !this.writeChar) return false;
        if (this.isRequesting) return false;
        
        this.isRequesting = true;
        
        const commands = [
            { cmd: [0x01, 0x00], name: 'Heart Rate' },
            { cmd: [0x02, 0x00], name: 'Blood Pressure' },
            { cmd: [0xAA, 0x55], name: 'Wake' },
            { cmd: [0x5A, 0xA5], name: 'Sync' },
            { cmd: [0x10, 0x01], name: 'Measure' },
        ];
        
        for (const { cmd, name } of commands) {
            try {
                await this.writeChar.writeValue(new Uint8Array(cmd));
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                // تجاهل الأخطاء
            }
        }
        
        this.isRequesting = false;
        return true;
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
            console.error('Failed to save to database:', error);
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
            } catch (error) {
                console.error('Callback error:', error);
            }
        });
    }

    // ✅ الحصول على معلومات الجهاز
    async getDeviceInfo() {
        if (this.isMobile) return;
        try {
            const service = await this.server.getPrimaryService(this.possibleServices.DEVICE_INFO);
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
                try {
                    const value = await char.readValue();
                    const text = new TextDecoder().decode(value);
                    if (text && text.trim()) {
                        console.log('📱 Device info:', text);
                    }
                } catch (e) {}
            }
        } catch (error) {}
    }

    // ✅ الحصول على مستوى البطارية
    async getBatteryLevel() {
        if (this.isMobile) return null;
        try {
            const service = await this.server.getPrimaryService(this.possibleServices.BATTERY);
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
                if (char.uuid.toLowerCase().includes('2a19')) {
                    const value = await char.readValue();
                    const batteryLevel = value.getUint8(0);
                    this.notifyCallbacks('battery', batteryLevel);
                    return batteryLevel;
                }
            }
        } catch (error) {}
        return null;
    }

    // ✅ بدء وضع المحاكاة (عند عدم وجود ساعة)
    startSimulationMode() {
        if (this.simulationInterval) return;
        console.log('⚠️ Using simulation mode for testing');
        this.simulationInterval = setInterval(() => {
            if (this.isConnected) {
                const mockHeartRate = Math.floor(Math.random() * (95 - 70 + 1) + 70);
                this.healthData.heartRate = mockHeartRate;
                this.healthData.lastUpdate = new Date();
                this.notifyCallbacks('heartRate', mockHeartRate);
                this.checkAlerts(mockHeartRate, null);
            }
        }, 5000);
    }

    startDataTimeout() {
        if (this.dataTimeout) clearTimeout(this.dataTimeout);
        this.dataTimeout = setTimeout(() => {
            if (this.isConnected && !this.healthData.heartRate) {
                this.startSimulationMode();
            }
        }, 10000);
    }

    handleDisconnect() {
        this.isConnected = false;
        if (this.simulationInterval) clearInterval(this.simulationInterval);
        if (this.dataTimeout) clearTimeout(this.dataTimeout);
        
        this.notifyCallbacks('disconnected', null);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connectToWatch().catch(e => console.error('Reconnect failed:', e));
            }, 3000);
        }
    }

    // ✅ فصل الاتصال
    disconnect() {
        if (this.autoReconnectTimer) clearTimeout(this.autoReconnectTimer);
        if (this.dataTimeout) clearTimeout(this.dataTimeout);
        if (this.simulationInterval) clearInterval(this.simulationInterval);
        
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
}

export default new WatchService();