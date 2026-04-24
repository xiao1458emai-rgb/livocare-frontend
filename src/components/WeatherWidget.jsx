// components/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../services/api';

const WeatherWidget = () => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [weather, setWeather] = useState(null);
    const [recommendation, setRecommendation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // إعادة توليد التوصية عند تغيير اللغة
                if (weather) {
                    generateRecommendation(weather);
                }
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang, weather]);

    useEffect(() => {
        fetchWeather();
    }, []);

    const fetchWeather = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/weather/');
            setWeather(response.data);
            generateRecommendation(response.data);
            setError(null);
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError(isArabic ? 'تعذر جلب بيانات الطقس' : 'Unable to fetch weather data');
        } finally {
            setLoading(false);
        }
    };

    const generateRecommendation = (weather) => {
        if (weather.temperature > 35) {
            setRecommendation(isArabic 
                ? '🌡️ الجو حار جداً! اشرب ماء كثيراً وتجنب التمارين الشاقة' 
                : '🌡️ Very hot! Drink plenty of water and avoid strenuous exercise');
        } else if (weather.temperature < 15) {
            setRecommendation(isArabic 
                ? '🧥 الجو بارد! ارتد ملابس دافئة ومارس الرياضة داخل المنزل' 
                : '🧥 Cold weather! Wear warm clothes and exercise indoors');
        } else if (weather.description && (weather.description.includes('مطر') || weather.description.includes('rain'))) {
            setRecommendation(isArabic 
                ? '☔ يوم ممطر! وقت مناسب للتأمل والقراءة' 
                : '☔ Rainy day! Good time for meditation and reading');
        } else {
            setRecommendation(isArabic 
                ? '🌤️ طقس مثالي للنشاط البدني' 
                : '🌤️ Perfect weather for physical activity');
        }
    };

    if (loading) {
        return (
            <div className="weather-widget loading">
                <span>⏳</span> {isArabic ? 'جاري تحميل الطقس...' : 'Loading weather...'}
            </div>
        );
    }

    if (error) {
        return (
            <div className="weather-widget error">
                <span>⚠️</span> {error}
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    if (!weather) {
        return null;
    }

    return (
        <div className="weather-widget">
            <div className="weather-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="weather-icon">🌤️</div>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
            <div className="weather-info">
                <h4>{weather.city || (isArabic ? 'موقعك' : 'Your Location')}</h4>
                <p>{weather.temperature}°C - {weather.description || (isArabic ? 'غير معروف' : 'Unknown')}</p>
                {recommendation && <p className="recommendation">💡 {recommendation}</p>}
            </div>

            <style>{`
                .weather-widget {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }

                .weather-widget.loading {
                    text-align: center;
                    color: var(--text-secondary);
                }

                .weather-widget.error {
                    text-align: center;
                    color: var(--error);
                }

                /* ✅ تم إزالة .lang-btn-small styles */

                .weather-icon {
                    font-size: 2rem;
                }

                .weather-info h4 {
                    margin: 0 0 var(--spacing-xs) 0;
                    color: var(--text-primary);
                }

                .weather-info p {
                    margin: 0;
                    color: var(--text-secondary);
                }

                .recommendation {
                    margin-top: var(--spacing-sm);
                    padding-top: var(--spacing-sm);
                    border-top: 1px solid var(--border-light);
                    color: var(--primary);
                    font-size: 0.85rem;
                }
            `}</style>
        </div>
    );
};

export default WeatherWidget;