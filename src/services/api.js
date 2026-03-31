// src/services/api.js
import axios from 'axios';

// ✅ استخدم متغير البيئة الصحيح
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://livocare.onrender.com';

console.log('🔧 API_BASE_URL =', API_BASE_URL);
console.log('🔧 Final baseURL =', API_BASE_URL ? `${API_BASE_URL}/api` : '/api');

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
        } else {
            console.log(`⚠️ No token for: ${config.url}`);
        }
        
        console.log(`🌐 Request: ${config.baseURL}${config.url}`);
        
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ interceptor للردود - لا تمسح التوكن عند 401
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error('❌ Cannot connect to server');
        }
        
        // ✅ فقط log الخطأ، لا تمسح التوكن تلقائياً
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - token may be expired');
            console.log('🔑 Current token:', localStorage.getItem('access_token') ? 'exists' : 'missing');
            // ❌ لا تمسح التوكن هنا! دع App.jsx يتعامل معها
        }
        
        return Promise.reject(error);
    }
);

// ✅ باقي الكود كما هو...
export const foodSearchAPI = {
    search: (query) => 
        axiosInstance.get(`/food/search/?query=${encodeURIComponent(query)}`),
    
    getDetails: (foodId) => 
        axiosInstance.get(`/food/${foodId}/`),
    
    getPopular: () => 
        axiosInstance.get('/food/popular/'),
};

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