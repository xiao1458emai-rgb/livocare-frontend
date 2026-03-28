// api.js - النسخة المعدلة للعمل مع Vite proxy
import axios from 'axios';

const axiosInstance = axios.create({
    // ✅ استخدم مسار نسبي بدلاً من baseURL فارغ
    // هذا سيجعل الطلبات تمر عبر proxy Vite
    baseURL: '', // اتركها فارغة للمسارات النسبية
    timeout: 30000, // خفض timeout إلى 30 ثانية
    headers: {
        'Content-Type': 'application/json',
    }
});

// interceptor للطلبات
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`🔑 Token added for: ${config.url}`);
        }
        
        // ✅ تأكد من أن URL يبدأ بـ / لاستخدام proxy
        if (config.url && !config.url.startsWith('http')) {
            console.log(`🌐 Request将通过 Vite proxy: ${config.url}`);
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ interceptor للردود
axiosInstance.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response from ${response.config.url}:`, response.status);
        return response;
    },
    (error) => {
        // تحسين رسائل الخطأ
        if (error.code === 'ECONNABORTED') {
            console.error('⏰ Timeout: Server is taking too long to respond');
        } else if (error.code === 'ERR_NETWORK') {
            console.error('❌ Cannot connect to server. Make sure Django backend is running on 192.168.8.187:8000');
            console.error('   Also check if Vite proxy is configured correctly');
        }
        
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - redirecting to login');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        
        // عرض تفاصيل الخطأ للمساعدة في التصحيح
        if (error.response) {
            console.error(`❌ Server responded with ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            console.error('❌ No response received from server. Check if backend is running');
            console.error('   Request URL:', error.config?.url);
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;