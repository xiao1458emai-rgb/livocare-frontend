// src/services/esp32Service.js
import axios from 'axios';

// ✅ استخدم خادم ESP32 المنفصل بدلاً من Django Backend
const ESP32_API_URL = process.env.REACT_APP_ESP32_API_URL || 'https://esp32-sensor-api.onrender.com';

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
            // ✅ استخدم مسار خادم ESP32 المنفصل
            const url = `${ESP32_API_URL}/api/readings/latest`;
            
            const response = await axios.get(url, {
            });
            
            if (response.data?.status === 'success' && response.data?.data) {
                const data = response.data.data;
                
                const newReading = {
                    heartRate: data.bpm,
                    spo2: data.spo2,
                    timestamp: data.timestamp || new Date().toISOString(),
                    raw: data
                };
                
                console.log('❤️ New reading - BPM:', newReading.heartRate, 'SpO2:', newReading.spo2);
                
                // ✅ تحديث دائماً (أزل شرط المقارنة للاختبار)
                this.lastReading = newReading;
                this.notifyListeners('heartRate', newReading.heartRate);
                this.notifyListeners('spo2', newReading.spo2);
                this.notifyListeners('data', newReading);
                
                return newReading;
            }
        } catch (error) {
            console.error('❌ ESP32 Service Error:', error.message);
            this.notifyListeners('error', error.message);
        }
        return null;
    }

    async sendReading(bpm, spo2) {
        try {
            const url = `${ESP32_API_URL}/api/readings`;
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

    on(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            console.log(`✅ Listener added. Total: ${this.listeners.length}`);
            return () => {
                const index = this.listeners.indexOf(callback);
                if (index > -1) {
                    this.listeners.splice(index, 1);
                    console.log(`❌ Listener removed. Remaining: ${this.listeners.length}`);
                }
            };
        }
        console.error('❌ on() requires a function callback');
        return () => {};
    }

    off(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
            console.log(`❌ Listener removed. Remaining: ${this.listeners.length}`);
        }
    }

    notifyListeners(type, data) {
        if (this.listeners.length === 0) {
            console.log(`⚠️ No listeners for event: ${type}`);
            return;
        }
        
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