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
        
        // ✅ عنوان IP للحاسوب - يمكن تغييره من localStorage
        this.computerIP = localStorage.getItem('computerIP') || '192.168.8.187';
        
        // ✅ كشف الهاتف بشكل أقوى
        this.isMobile = this.detectMobile();
        this.isADBMode = this.isMobile;
        
        // ✅ WebSocket
        this.ws = null;
        
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
        this.lastDataHash = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.isRequesting = false;
        
        console.log('📱 WatchService Init:', {
            isMobile: this.isMobile,
            isADBMode: this.isADBMode,
            computerIP: this.computerIP
        });
        
        // ✅ الاتصال بـ ADB إذا كان على هاتف
        if (this.isMobile) {
            console.log('📱 Mobile detected - connecting to ADB Monitor');
            this.connectADBMonitor();
        } else {
            console.log('💻 Desktop mode - using Web Bluetooth');
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
        
        if (isMobile) {
            localStorage.setItem('isMobileDetected', 'true');
        }
        
        return isMobile;
    }

    // ✅ دالة لتعيين وضع الهاتف يدوياً
    setMobileMode(isMobile, computerIP) {
        this.isMobile = isMobile;
        this.isADBMode = isMobile;
        if (computerIP) {
            this.computerIP = computerIP;
            localStorage.setItem('computerIP', computerIP);
        }
        localStorage.setItem('forceMobileMode', isMobile ? 'true' : 'false');
        console.log('📱 Mobile mode set to:', isMobile, 'IP:', this.computerIP);
        
        if (isMobile && !this.ws) {
            this.connectADBMonitor();
        } else if (!isMobile && this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ✅ عنوان WebSocket
// src/services/watchService.js

getWebSocketUrl() {
    if (this.isMobile) {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
            return `wss://${hostname}:3001`;
        }
        return `wss://${this.computerIP}:3001`;
    }
    return 'wss://localhost:3001';
}

    // ✅ الاتصال بـ ADB Monitor
    connectADBMonitor() {
        if (!this.isMobile) {
            console.log('💻 Desktop mode - not connecting to ADB');
            return;
        }
        
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('⚠️ Already connected or connecting');
            return;
        }
        
        const wsUrl = this.getWebSocketUrl();
        console.log(`🔌 Connecting to ADB Monitor at: ${wsUrl}`);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to ADB Monitor');
                this.isADBMode = true;
                this.isConnected = true;
                
                const token = localStorage.getItem('access_token');
                if (token) {
                    this.ws.send(JSON.stringify({ type: 'token', token }));
                }
                
                this.notifyCallbacks('connected', { mode: 'ADB', message: 'Connected to ADB Monitor' });
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 ADB Monitor data:', data);
                    
                    if (data.type === 'health_data') {
                        if (data.heartRate) {
                            console.log(`❤️ Heart Rate: ${data.heartRate} BPM`);
                            this.healthData.heartRate = data.heartRate;
                            this.healthData.lastUpdate = new Date();
                            this.notifyCallbacks('heartRate', data.heartRate);
                            this.saveToDatabase('heartRate', data.heartRate);
                            this.checkAlerts(data.heartRate, null);
                        }
                        
                        if (data.bloodPressure) {
                            console.log(`🩸 BP: ${data.bloodPressure.systolic}/${data.bloodPressure.diastolic}`);
                            this.healthData.bloodPressure = data.bloodPressure;
                            this.healthData.lastUpdate = new Date();
                            this.notifyCallbacks('bloodPressure', data.bloodPressure);
                            this.saveToDatabase('bloodPressure', data.bloodPressure);
                            this.checkAlerts(null, data.bloodPressure);
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
                this.notifyCallbacks('error', { message: 'ADB connection failed' });
            };
            
            this.ws.onclose = () => {
                console.log('ADB Monitor disconnected');
                this.isADBMode = false;
                this.isConnected = false;
                this.notifyCallbacks('disconnected', { message: 'ADB disconnected' });
                setTimeout(() => this.connectADBMonitor(), 5000);
            };
            
        } catch (error) {
            console.error('Failed to connect to ADB Monitor:', error);
            this.isADBMode = false;
            this.isConnected = false;
        }
    }

    // ✅ دالة الاتصال الرئيسية
    async connectToWatch() {
        if (this.isMobile) {
            console.log('📱 Mobile device - using ADB Mode');
            this.connectADBMonitor();
            return true;
        }
        
        if (this.isADBMode) {
            console.log('📱 ADB Mode active - waiting for FitPro data');
            return true;
        }
        
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth غير مدعوم في هذا المتصفح');
        }

        try {
            console.log('🔍 Searching for watch...');
            
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: false,
                filters: [
                    { namePrefix: 'Z99' },
                    { namePrefix: 'SmartWatch' },
                    { namePrefix: 'MI' },
                    { namePrefix: 'HW' }
                ],
                optionalServices: [
                    this.possibleServices.HEALTH_SERVICE,
                    this.possibleServices.DEVICE_INFO,
                    this.possibleServices.BATTERY
                ]
            });

            console.log('✅ Device found:', device.name || device.id);
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
            
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // ✅ تفعيل وضع ADB
    enableADBMode() {
        this.setMobileMode(true, this.computerIP);
        return true;
    }

    // ✅ تعطيل وضع ADB
    disableADBMode() {
        this.setMobileMode(false);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        console.log('ADB Mode disabled');
    }

    // ✅ طلب قياس
    async requestMeasurement() {
        if (this.isADBMode) {
            console.log('📱 ADB Mode - please measure on FitPro app');
            this.sendNotification('FitPro', 'افتح تطبيق FitPro وقم بالقياس');
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
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {}
        }
        
        this.isRequesting = false;
        return true;
    }

    // ✅ باقي الدوال الأساسية
    isSupported() {
        if (this.isMobile) return false;
        return 'bluetooth' in navigator;
    }

    async setupHealthMonitoring() {
        if (this.isADBMode) return;
        
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
            this.startSimulationMode();
        }
    }

    handleHealthData(dataView) {
        if (this.isADBMode) return;
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
        } catch (error) {}
    }

    extractHeartRate(bytes) {
        if (bytes.length > 2) {
            let hr = bytes[2];
            if (hr >= 40 && hr <= 120) return hr;
        }
        return null;
    }

    extractBloodPressure(bytes) {
        for (let i = 0; i < bytes.length - 1; i++) {
            const systolic = bytes[i];
            const diastolic = bytes[i + 1];
            if (systolic >= 100 && systolic <= 140 && diastolic >= 60 && diastolic <= 90) {
                return { systolic, diastolic };
            }
        }
        return null;
    }

    startDataTimeout() {
        if (this.dataTimeout) clearTimeout(this.dataTimeout);
        this.dataTimeout = setTimeout(() => {
            if (this.isConnected && !this.healthData.heartRate) {
                this.startSimulationMode();
            }
        }, 10000);
    }

    startSimulationMode() {
        if (this.simulationInterval) return;
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

    async getDeviceInfo() {
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

    async getBatteryLevel() {
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
            }
            await axios.post('/api/watch/health-data/', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {}
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
    }
}

export default new WatchService();