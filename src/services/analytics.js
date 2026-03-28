// frontend/src/services/analytics.js
import axiosInstance from './api';

const analyticsService = {
    // الحصول على تحليلات الأنشطة
    getActivityInsights: async () => {
        try {
            const response = await axiosInstance.get('/analytics/activity-insights/');
            return response.data;
        } catch (error) {
            console.error('Error fetching activity insights:', error);
            throw error;
        }
    },

    // ✅ تحليلات متقدمة باستخدام التعلم الآلي
    getAdvancedAnalytics: async () => {
        try {
            const response = await axiosInstance.get('/analytics/advanced/');
            return response.data;
        } catch (error) {
            console.error('Error fetching advanced analytics:', error);
            
            // في حالة الخطأ، أرجع بيانات افتراضية
            return {
                stats: {
                    avg_sleep: 0,
                    avg_mood: 0,
                    avg_calories: 0,
                    avg_activity: 0,
                    avg_habits: 0,
                    sleep_trend: 'مستقر',
                    mood_trend: 'مستقر'
                },
                patterns: [],
                recommendations: [],
                strengths: [],
                weaknesses: [],
                prediction: []
            };
        }
    },

    // الحصول على معلومات النماذج (للتطوير)
    getModelInfo: async () => {
        try {
            const response = await axiosInstance.get('/analytics/model-info/');
            return response.data;
        } catch (error) {
            console.error('Error fetching model info:', error);
            throw error;
        }
    }
};

export default analyticsService;