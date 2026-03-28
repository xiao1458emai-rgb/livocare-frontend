// src/services/externalApis.js
import axiosInstance from './api';

const externalApis = {
    // 🌤️ الطقس
    getWeather: async (city = 'Cairo') => {
        try {
            console.log('🔍 Fetching weather for:', city);
            const response = await axiosInstance.get(`/api/weather/?city=${city}`);
            return response.data;
        } catch (error) {
            console.error('❌ Weather error:', error);
            return { success: false, error: 'فشل الاتصال بالخادم' };
        }
    },

    // 🥗 البحث عن طعام
    searchFood: async (query) => {
        try {
            console.log('🔍 Searching food for:', query);
            const response = await axiosInstance.get(`/api/food/search/?query=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            console.error('❌ Food search error:', error);
            return { success: false, data: [] };
        }
    },

    // 💡 التوصيات الذكية
    getSmartRecommendations: async () => {
        try {
            console.log('🔍 Fetching smart recommendations');
            const response = await axiosInstance.get('/api/smart-recommendations/');
            return response.data;
        } catch (error) {
            console.error('❌ Recommendations error:', error);
            return { success: false, data: [] };
        }
    }
};

export default externalApis;