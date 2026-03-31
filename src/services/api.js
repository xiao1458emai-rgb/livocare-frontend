// src/services/api.js
import axios from 'axios';

// ✅ استخدم متغير البيئة الصحيح
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://livocare.onrender.com';

console.log('🔧 API_BASE_URL =', API_BASE_URL);
console.log('🔧 Final baseURL =', API_BASE_URL ? `${API_BASE_URL}/api` : '/api');

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const axiosInstance = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// ✅ interceptor للطلبات - إضافة التوكن
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

// ✅ interceptor للردود - تجديد التوكن عند 401
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // ✅ إذا كان الخطأ 401 ولم يتم إعادة المحاولة من قبل
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            const refreshToken = localStorage.getItem('refresh_token');
            
            console.log('🔄 Token expired, attempting to refresh...');
            console.log('🔑 Refresh token exists:', !!refreshToken);
            
            // إذا لم يوجد refresh token، امسح كل شيء ووجه إلى تسجيل الدخول
            if (!refreshToken) {
                console.log('❌ No refresh token, redirecting to login');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token');
                window.location.href = '/';
                return Promise.reject(error);
            }
            
            // إذا كان هناك طلب تجديد قيد التنفيذ، أضف هذا الطلب إلى قائمة الانتظار
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                }).catch(err => Promise.reject(err));
            }
            
            isRefreshing = true;
            
            try {
                // ✅ محاولة تجديد التوكن
                const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
                    refresh: refreshToken
                });
                
                const { access } = response.data;
                
                // ✅ حفظ التوكن الجديد
                localStorage.setItem('access_token', access);
                console.log('✅ Token refreshed successfully');
                
                // ✅ معالجة الطلبات المعلقة
                processQueue(null, access);
                
                // ✅ إعادة المحاولة مع التوكن الجديد
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return axiosInstance(originalRequest);
                
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
                
                // ✅ فشل تجديد التوكن - امسح كل شيء ووجه إلى تسجيل الدخول
                processQueue(refreshError, null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token');
                
                // ✅ إعادة توجيه إلى صفحة تسجيل الدخول
                window.location.href = '/';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        // ✅ إذا كان الخطأ 401 ولكن تمت إعادة المحاولة بالفعل
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - token may be expired');
            console.log('🔑 Current token:', localStorage.getItem('access_token') ? 'exists' : 'missing');
        }
        
        // ✅ أخطاء الشبكة
        if (error.code === 'ERR_NETWORK') {
            console.error('❌ Cannot connect to server');
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