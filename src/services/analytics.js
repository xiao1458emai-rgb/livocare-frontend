// frontend/src/services/analytics.js
import axiosInstance from './api';

// ✅ دالة للحصول على اللغة الحالية من localStorage
const getCurrentLanguage = () => {
    const saved = localStorage.getItem('app_lang');
    return saved === 'en' ? 'en' : 'ar';
};

// ✅ دالة للحصول على النص المترجم بناءً على اللغة (للاستخدام في البيانات الافتراضية)
const getTranslation = (key) => {
    const isArabic = getCurrentLanguage() === 'ar';
    
    const translations = {
        stable: isArabic ? 'مستقر' : 'Stable',
        increasing: isArabic ? 'في ازدياد' : 'Increasing',
        decreasing: isArabic ? 'في تناقص' : 'Decreasing',
        no_data: isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data',
        error_loading: isArabic ? 'خطأ في تحميل التحليلات' : 'Error loading analytics'
    };
    
    return translations[key] || key;
};

const analyticsService = {
    // الحصول على تحليلات الأنشطة
    getActivityInsights: async () => {
        try {
            // تمرير اللغة في الطلب إذا كان backend يدعمها
            const currentLang = getCurrentLanguage();
            const response = await axiosInstance.get('/analytics/activity-insights/', {
                params: { lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching activity insights:', error);
            throw error;
        }
    },

    // ✅ تحليلات متقدمة باستخدام التعلم الآلي
    getAdvancedAnalytics: async (customLang = null) => {
        try {
            // استخدام اللغة الممررة أو اللغة من localStorage
            const currentLang = customLang || getCurrentLanguage();
            
            const response = await axiosInstance.get('/analytics/advanced/', {
                params: { lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching advanced analytics:', error);
            
            // ✅ إعدادات اللغة من localStorage
            const isArabic = getCurrentLanguage() === 'ar';
            
            // في حالة الخطأ، أرجع بيانات افتراضية
            return {
                stats: {
                    avg_sleep: 0,
                    avg_mood: 0,
                    avg_calories: 0,
                    avg_activity: 0,
                    avg_habits: 0,
                    sleep_trend: isArabic ? 'مستقر' : 'Stable',
                    mood_trend: isArabic ? 'مستقر' : 'Stable'
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
            const currentLang = getCurrentLanguage();
            const response = await axiosInstance.get('/analytics/model-info/', {
                params: { lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching model info:', error);
            throw error;
        }
    },

    // ✅ دالة لتحديث اللغة في الخدمة (يمكن استدعاؤها عند تغيير اللغة)
    updateLanguage: (newLang) => {
        localStorage.setItem('app_lang', newLang);
        console.log('📢 Analytics service language updated to:', newLang);
        
        // إرسال حدث لتحديث أي مكونات تستمع
        const isArabic = newLang === 'ar';
        window.dispatchEvent(new CustomEvent('languageChange', { 
            detail: { lang: newLang, isArabic }
        }));
    },

    // ✅ دالة للحصول على بيانات التحليلات باللغة الحالية
    getAnalyticsWithCurrentLanguage: async () => {
        const currentLang = getCurrentLanguage();
        try {
            const response = await axiosInstance.get('/analytics/advanced/', {
                params: { lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching analytics with language:', error);
            throw error;
        }
    },

    // ✅ دالة لتنظيف البيانات (إزالة القيم غير الصالحة)
    sanitizeAnalyticsData: (data) => {
        if (!data) return null;
        
        const sanitized = { ...data };
        
        // تنظيف الإحصائيات
        if (sanitized.stats) {
            sanitized.stats = {
                avg_sleep: sanitized.stats.avg_sleep || 0,
                avg_mood: sanitized.stats.avg_mood || 0,
                avg_calories: sanitized.stats.avg_calories || 0,
                avg_activity: sanitized.stats.avg_activity || 0,
                avg_habits: sanitized.stats.avg_habits || 0,
                sleep_trend: sanitized.stats.sleep_trend || getTranslation('stable'),
                mood_trend: sanitized.stats.mood_trend || getTranslation('stable')
            };
        }
        
        // تنظيف القوائم
        if (!Array.isArray(sanitized.patterns)) sanitized.patterns = [];
        if (!Array.isArray(sanitized.recommendations)) sanitized.recommendations = [];
        if (!Array.isArray(sanitized.strengths)) sanitized.strengths = [];
        if (!Array.isArray(sanitized.weaknesses)) sanitized.weaknesses = [];
        if (!Array.isArray(sanitized.prediction)) sanitized.prediction = [];
        
        return sanitized;
    },

    // ✅ دالة لتنسيق البيانات قبل العرض
    formatAnalyticsForDisplay: (data, isArabic) => {
        if (!data) return null;
        
        const formatted = { ...data };
        
        // تنسيق التواريخ والأرقام حسب اللغة
        if (formatted.timeline && Array.isArray(formatted.timeline)) {
            formatted.timeline = formatted.timeline.map(item => ({
                ...item,
                formatted_date: new Date(item.date).toLocaleDateString(
                    isArabic ? 'ar-EG' : 'en-US',
                    { month: 'short', day: 'numeric' }
                )
            }));
        }
        
        return formatted;
    }
};

export default analyticsService;