// src/services/api.js
import axios from 'axios';

// ✅ استخدام متغير البيئة للاتصال بـ Backend على السحابة
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    timeout: 60000,
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
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error('❌ Cannot connect to server. Make sure backend is running');
        }
        
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - redirecting to login');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ✅ API مخصص للبحث عن الطعام
export const foodSearchAPI = {
    search: (query) => 
        axiosInstance.get(`/food/search/?query=${encodeURIComponent(query)}`),
    
    getDetails: (foodId) => 
        axiosInstance.get(`/food/${foodId}/`),
    
    getPopular: () => 
        axiosInstance.get('/food/popular/'),
};

// ✅ API مخصص لتحليل الصور
export const imageAnalysisAPI = {
    analyzeFood: (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        return axiosInstance.post('/analyze-food/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    
    scanBarcode: (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        return axiosInstance.post('/scan-barcode/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    
    analyzeMeal: (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        return axiosInstance.post('/analyze-meal/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

// ✅ API للملصقات الغذائية (باركود)
export const barcodeAPI = {
    lookup: (barcode) => 
        axiosInstance.get(`/barcode/${barcode}/`),
    
    saveProduct: (productData) => 
        axiosInstance.post('/products/', productData),
};

export const uploadImage = async (imageFile, type = 'meal') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('type', type);
    
    return axiosInstance.post('/upload-image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export default axiosInstance;