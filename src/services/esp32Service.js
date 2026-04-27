// src/services/esp32Service.js
import axios from 'axios';

const DJANGO_API_URL = process.env.REACT_APP_DJANGO_API_URL || 'https://livocare-backend.onrender.com/api';

class ESP32Service {
    constructor() {
        this.listeners = [];
        this.pollingInterval = null;
        this.isPolling = false;
        this.lastReading = null;
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
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.log('⚠️ No token available');
                return null;
            }

            const url = `${DJANGO_API_URL}/esp32/latest/`;
            console.log('🔄 Fetching from:', url);
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
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

    async sendReading(bpm, spo2) {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.log('⚠️ No token available');
                return null;
            }

            const url = `${DJANGO_API_URL}/esp32/update/`;
            const response = await axios.post(url, { bpm, spo2 }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
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

    // ✅ دالة on المفقودة (هذا كان سبب الخطأ)
    on(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    // ✅ دالة off لإزالة المستمعين
    off(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) this.listeners.splice(index, 1);
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