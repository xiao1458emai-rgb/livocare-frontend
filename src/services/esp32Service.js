// src/services/esp32Service.js
import axios from 'axios';

// ✅ تغيير الرابط إلى Django Backend الخاص بك
const DJANGO_API_URL = process.env.REACT_APP_DJANGO_API_URL || 'https://livocare-backend.onrender.com/api';

class ESP32Service {
    constructor() {
        this.listeners = [];
        this.pollingInterval = null;
        this.isPolling = false;
        this.lastReading = null;
        
        // ✅ إعداد axios interceptor لإضافة التوكن
        this.setupAxiosInterceptor();
    }

    setupAxiosInterceptor() {
        axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.isPolling = true;
        this.pollingInterval = setInterval(async () => {
            await this.fetchLatestReading();
        }, 30000);
        console.log('📡 ESP32 Service: Polling started');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('📡 ESP32 Service: Polling stopped');
    }

    async fetchLatestReading() {
        try {
            // ✅ استخدام المسار الجديد في Django
            const url = `${DJANGO_API_URL}/esp32/latest/`;
            console.log('🔄 Fetching from:', url);
            
            const response = await axios.get(url);
            console.log('📊 Full response:', response.data);
            
            // ✅ التنسيق الجديد للبيانات
            if (response.data?.status === 'success' && response.data?.data) {
                const data = response.data.data;
                
                const newReading = {
                    heartRate: data.heart_rate,
                    spo2: data.blood_oxygen,
                    timestamp: data.recorded_at || new Date().toISOString(),
                    raw: data
                };
                
                console.log('❤️ New reading - BPM:', newReading.heartRate, 'SpO2:', newReading.spo2);
                
                if (this.lastReading?.heartRate !== newReading.heartRate ||
                    this.lastReading?.spo2 !== newReading.spo2) {
                    
                    this.lastReading = newReading;
                    this.notifyListeners('heartRate', newReading.heartRate);
                    this.notifyListeners('spo2', newReading.spo2);
                    this.notifyListeners('data', newReading);
                }
                
                return newReading;
            } else {
                console.log('⚠️ No data available yet');
            }
        } catch (error) {
            console.error('❌ ESP32 Service Error:', error.response?.data?.message || error.message);
            this.notifyListeners('error', error.message);
        }
        return null;
    }

    async fetchAllReadings(limit = 50) {
        try {
            // ✅ استخدام المسار الجديد للتاريخ
            const url = `${DJANGO_API_URL}/esp32/history/`;
            const response = await axios.get(url);
            
            if (response.data?.status === 'success') {
                return response.data.data || [];
            }
            return [];
        } catch (error) {
            console.error('ESP32 Service: Error fetching all readings', error);
            return [];
        }
    }

    async sendReading(bpm, spo2) {
        try {
            const url = `${DJANGO_API_URL}/esp32/update/`;
            const response = await axios.post(url, { bpm, spo2 });
            
            if (response.data?.status === 'success') {
                console.log('✅ Reading sent successfully');
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error sending reading:', error);
            return null;
        }
    }

    async testConnection() {
        try {
            // ✅ اختبار الاتصال بالخادم
            const url = `${DJANGO_API_URL}/esp32/test/`;
            const response = await axios.post(url, { bpm: 75, spo2: 98 });
            console.log('🔌 Test connection:', response.data);
            return response.data?.status === 'success';
        } catch (error) {
            console.error('❌ Test connection failed:', error);
            return false;
        }
    }

    async requestMeasurement() {
        console.log('📡 ESP32 Service: Measurement requested (continuous)');
        return true;
    }

    onData(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners(type, data) {
        this.listeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (err) {
                console.error('ESP32 Service: Listener error', err);
            }
        });
    }

    isSupported() {
        return true;
    }

    setMobileMode(isMobile, ipAddress) {
        console.log(`📡 ESP32 Service: Mobile mode ${isMobile ? 'enabled' : 'disabled'}`);
    }

    disconnectFromWatch() {
        this.stopPolling();
        return Promise.resolve(true);
    }
}

export default new ESP32Service();