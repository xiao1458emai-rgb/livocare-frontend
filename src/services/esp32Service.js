// src/services/esp32Service.js
import axios from 'axios';

const ESP32_API_URL = process.env.REACT_APP_ESP32_API_URL || 'https://sensors-api.onrender.com';

class ESP32Service {
    constructor() {
        this.listeners = [];
        this.pollingInterval = null;
        this.isPolling = false;
        this.lastReading = null;
    }

    // بدء الاستماع للبيانات (Polling كل 5 ثوانٍ)
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.isPolling = true;
        this.pollingInterval = setInterval(async () => {
            await this.fetchLatestReading();
        }, 5000); // كل 5 ثوانٍ

        console.log('📡 ESP32 Service: Polling started');
    }

    // إيقاف الاستماع
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('📡 ESP32 Service: Polling stopped');
    }

    // جلب آخر قراءة من الخادم
    async fetchLatestReading() {
        try {
            const response = await axios.get(`${ESP32_API_URL}/api/readings/latest`);
            
            if (response.data && response.data.bpm && response.data.spo2) {
                const newReading = {
                    heartRate: response.data.bpm,
                    spo2: response.data.spo2,
                    timestamp: response.data.timestamp || new Date().toISOString(),
                    raw: response.data
                };

                // التحقق من تغيير البيانات
                if (this.lastReading?.heartRate !== newReading.heartRate ||
                    this.lastReading?.spo2 !== newReading.spo2) {
                    
                    this.lastReading = newReading;
                    this.notifyListeners('heartRate', newReading.heartRate);
                    this.notifyListeners('spo2', newReading.spo2);
                    this.notifyListeners('data', newReading);
                }
                
                return newReading;
            }
        } catch (error) {
            console.error('ESP32 Service: Error fetching reading', error);
            this.notifyListeners('error', error.message);
        }
        return null;
    }

    // جلب جميع القراءات
    async fetchAllReadings(limit = 50) {
        try {
            const response = await axios.get(`${ESP32_API_URL}/api/readings/all?limit=${limit}`);
            return response.data.data || [];
        } catch (error) {
            console.error('ESP32 Service: Error fetching all readings', error);
            return [];
        }
    }

    // طلب قياس جديد (إرسال إشارة إلى ESP32 - اختياري)
    async requestMeasurement() {
        // في حالة ESP32، القياس مستمر تلقائياً
        console.log('📡 ESP32 Service: Measurement requested (continuous)');
        return true;
    }

    // تسجيل مستمع للأحداث
    onData(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    // إخطار المستمعين
    notifyListeners(type, data) {
        this.listeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (err) {
                console.error('ESP32 Service: Listener error', err);
            }
        });
    }

    // التحقق من دعم الخدمة
    isSupported() {
        return true; // ESP32 API مدعوم دائماً
    }

    // وضع الهاتف المحمول (للتوافق مع الكود القديم)
    setMobileMode(isMobile, ipAddress) {
        console.log(`📡 ESP32 Service: Mobile mode ${isMobile ? 'enabled' : 'disabled'}`);
    }

    // تفعيل ADB (غير مطلوب لـ ESP32)
    enableADBMode() {
        console.log('📡 ESP32 Service: ADB mode not required for ESP32');
    }

    // تعطيل ADB
    disableADBMode() {
        console.log('📡 ESP32 Service: ADB mode disabled');
    }

    // الاتصال بالساعة (غير مطلوب)
    connectToWatch() {
        return Promise.resolve(true);
    }

    // فصل الاتصال
    disconnectFromWatch() {
        this.stopPolling();
        return Promise.resolve(true);
    }

    // مراقبة ADB (غير مطلوب)
    connectADBMonitor() {
        console.log('📡 ESP32 Service: ADB monitor not required');
    }
}

export default new ESP32Service();