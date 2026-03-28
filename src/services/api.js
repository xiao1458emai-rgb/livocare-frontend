// api.js - نسخة معدلة للعمل مع Vite proxy و Render
import axios from 'axios';

// ✅ تحديد عنوان الـ API من متغير البيئة
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    timeout: 30000,
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
        
        console.log(`🌐 Request: ${config.baseURL}${config.url}`);
        
        return config;
    },
    (error) => Promise.reject(error)
);

// interceptor للردود
axiosInstance.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response from ${response.config.url}:`, response.status);
        return response;
    },
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('⏰ Timeout: Server is taking too long to respond');
        } else if (error.code === 'ERR_NETWORK') {
            console.error('❌ Cannot connect to server. Make sure backend is running');
        }
        
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - redirecting to login');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        
        if (error.response) {
            console.error(`❌ Server responded with ${error.response.status}:`, error.response.data);
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;