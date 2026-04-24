// src/services/externalApis.js
import axiosInstance from './api';

// ✅ دالة للحصول على اللغة الحالية من localStorage
const getCurrentLanguage = () => {
    const saved = localStorage.getItem('app_lang');
    return saved === 'en' ? 'en' : 'ar';
};

// ✅ دالة للحصول على النص المترجم (للاستخدام في البيانات الافتراضية)
const getTranslation = (key) => {
    const isArabic = getCurrentLanguage() === 'ar';
    
    const translations = {
        server_connection_failed: isArabic ? 'فشل الاتصال بالخادم' : 'Server connection failed',
        food_search_failed: isArabic ? 'فشل البحث عن الطعام' : 'Food search failed',
        recommendations_failed: isArabic ? 'فشل تحميل التوصيات' : 'Failed to load recommendations',
        weather_failed: isArabic ? 'تعذر جلب بيانات الطقس' : 'Unable to fetch weather data'
    };
    
    return translations[key] || key;
};

const externalApis = {
    // 🌤️ الطقس
    getWeather: async (city = 'Cairo', customLang = null) => {
        try {
            console.log('🔍 Fetching weather for:', city);
            
            // تمرير اللغة في الطلب إذا كان backend يدعمها
            const currentLang = customLang || getCurrentLanguage();
            
            const response = await axiosInstance.get(`/weather/`, {
                params: { city, lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Weather error:', error);
            
            const isArabic = getCurrentLanguage() === 'ar';
            
            return { 
                success: false, 
                error: isArabic ? 'فشل الاتصال بالخادم' : 'Server connection failed',
                message: getTranslation('weather_failed')
            };
        }
    },

    // 🥗 البحث عن طعام
    searchFood: async (query, customLang = null) => {
        try {
            console.log('🔍 Searching food for:', query);
            
            const currentLang = customLang || getCurrentLanguage();
            
            const response = await axiosInstance.get(`/food/search/`, {
                params: { 
                    query: encodeURIComponent(query),
                    lang: currentLang 
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Food search error:', error);
            
            const isArabic = getCurrentLanguage() === 'ar';
            
            return { 
                success: false, 
                data: [],
                error: isArabic ? 'فشل البحث عن الطعام' : 'Food search failed',
                message: getTranslation('food_search_failed')
            };
        }
    },

    // 💡 التوصيات الذكية
    getSmartRecommendations: async (customLang = null) => {
        try {
            console.log('🔍 Fetching smart recommendations');
            
            const currentLang = customLang || getCurrentLanguage();
            
            const response = await axiosInstance.get('/smart-recommendations/', {
                params: { lang: currentLang }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Recommendations error:', error);
            
            const isArabic = getCurrentLanguage() === 'ar';
            
            return { 
                success: false, 
                data: [],
                error: isArabic ? 'فشل تحميل التوصيات' : 'Failed to load recommendations',
                message: getTranslation('recommendations_failed')
            };
        }
    },

    // ✅ دالة لتحديث اللغة في الخدمة
    updateLanguage: (newLang) => {
        localStorage.setItem('app_lang', newLang);
        console.log('📢 External APIs service language updated to:', newLang);
        
        // إرسال حدث لتحديث أي مكونات تستمع
        const isArabic = newLang === 'ar';
        window.dispatchEvent(new CustomEvent('languageChange', { 
            detail: { lang: newLang, isArabic }
        }));
    },

    // ✅ دالة للبحث عن طعام مع تنسيق النتائج حسب اللغة
    searchFoodFormatted: async (query, isArabic) => {
        try {
            const result = await externalApis.searchFood(query);
            
            if (result.success && result.data) {
                // تنسيق النتائج حسب اللغة
                return {
                    ...result,
                    data: result.data.map(food => ({
                        ...food,
                        name: food.name || (isArabic ? 'منتج غذائي' : 'Food product'),
                        brand: food.brand || (isArabic ? 'علامة تجارية غير معروفة' : 'Unknown brand')
                    }))
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error in searchFoodFormatted:', error);
            return {
                success: false,
                data: [],
                error: isArabic ? 'حدث خطأ في البحث' : 'Search error occurred'
            };
        }
    },

    // ✅ دالة للحصول على الطقس مع تنسيق البيانات
    getWeatherFormatted: async (city, isArabic) => {
        try {
            const result = await externalApis.getWeather(city);
            
            if (result.success !== false && result.data) {
                // تنسيق بيانات الطقس حسب اللغة
                return {
                    ...result,
                    condition: result.condition || (isArabic ? 'غير معروف' : 'Unknown'),
                    recommendation: externalApis._generateWeatherRecommendation(result, isArabic)
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error in getWeatherFormatted:', error);
            return {
                success: false,
                error: isArabic ? 'تعذر جلب بيانات الطقس' : 'Unable to fetch weather data'
            };
        }
    },

    // ✅ دالة مساعدة لتوليد توصية الطقس
    _generateWeatherRecommendation: (weather, isArabic) => {
        if (!weather || !weather.temperature) {
            return isArabic ? 'لا توجد توصيات' : 'No recommendations';
        }
        
        const temp = weather.temperature;
        
        if (temp > 35) {
            return isArabic 
                ? '🌡️ حرارة شديدة - ابق في الداخل واشرب الكثير من الماء'
                : '🌡️ Extreme heat - stay indoors and drink plenty of water';
        } else if (temp > 30) {
            return isArabic 
                ? '☀️ حار جداً - ارتد ملابس خفيفة واشرب الماء'
                : '☀️ Very hot - wear light clothes and drink water';
        } else if (temp < 5) {
            return isArabic 
                ? '❄️ بارد جداً - ارتد ملابس ثقيلة واحمِ نفسك'
                : '❄️ Very cold - wear heavy clothes and stay warm';
        } else if (temp < 10) {
            return isArabic 
                ? '🧥 بارد - لا تنسَ ارتداء سترة دافئة'
                : '🧥 Cold - don\'t forget to wear a warm jacket';
        } else if (temp >= 18 && temp <= 25) {
            return isArabic 
                ? '🌸 طقس مثالي للخروج! 🌸'
                : '🌸 Perfect weather for going out! 🌸';
        } else {
            return isArabic 
                ? '🌤️ طقس مناسب للنشاط البدني'
                : '🌤️ Suitable weather for physical activity';
        }
    },

    // ✅ دالة لتنظيف بيانات البحث عن الطعام
    sanitizeFoodSearchResults: (data) => {
        if (!data || !Array.isArray(data)) return [];
        
        return data.filter(item => item && item.name).map(item => ({
            id: item.id || item.barcode || Math.random().toString(36).substr(2, 9),
            name: item.name || 'Unknown',
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0,
            fiber: parseFloat(item.fiber) || 0,
            brand: item.brand || null,
            image: item.image || null,
            barcode: item.barcode || null
        }));
    }
};

export default externalApis;