// src/services/esp32Service.js
import axios from 'axios';

const ESP32_API_URL = process.env.REACT_APP_ESP32_API_URL || 'https://sensors-api-6mej.onrender.com';

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
        }, 50000);
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
            console.log('🔄 Fetching from:', `${ESP32_API_URL}/api/readings/latest`);
            const response = await axios.get(`${ESP32_API_URL}/api/readings/latest`);
            console.log('📊 Full response:', response.data);
            
            // ✅ التعديل هنا: البيانات موجودة في response.data.data
            const data = response.data?.data;
            
            if (data && data.bpm && data.spo2) {
                const newReading = {
                    heartRate: data.bpm,
                    spo2: data.spo2,
                    timestamp: data.timestamp || new Date().toISOString(),
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
            console.error('❌ ESP32 Service Error:', error.message);
            this.notifyListeners('error', error.message);
        }
        return null;
    }

    async fetchAllReadings(limit = 50) {
        try {
            const response = await axios.get(`${ESP32_API_URL}/api/readings/all?limit=${limit}`);
            return response.data?.data || [];
        } catch (error) {
            console.error('ESP32 Service: Error fetching all readings', error);
            return [];
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