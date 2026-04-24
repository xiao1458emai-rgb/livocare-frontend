// src/components/SmartFeatures/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../services/api';
import './SmartFeatures.css';

const WeatherWidget = () => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [city, setCity] = useState('Cairo');
    const [showCityInput, setShowCityInput] = useState(false);
    const [tempCity, setTempCity] = useState('');

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // تحميل المدينة المحفوظة
    useEffect(() => {
        const savedCity = localStorage.getItem('weather_city');
        if (savedCity) {
            setCity(savedCity);
        }
        fetchWeather(savedCity || 'Cairo');
    }, []);

    // دالة جلب الطقس
    const fetchWeather = async (cityName = city) => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get(`/weather/?city=${encodeURIComponent(cityName)}`);
            
            if (response.data && response.data.success !== false) {
                setWeather(response.data);
                localStorage.setItem('weather_city', cityName);
                setCity(cityName);
                setError(null);
            } else {
                setError(response.data?.error || (isArabic ? 'حدث خطأ في جلب بيانات الطقس' : 'Error fetching weather data'));
            }
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError(isArabic ? 'فشل الاتصال بخدمة الطقس' : 'Failed to connect to weather service');
        } finally {
            setLoading(false);
        }
    };

    const handleCitySubmit = (e) => {
        e.preventDefault();
        if (tempCity.trim()) {
            fetchWeather(tempCity.trim());
            setShowCityInput(false);
            setTempCity('');
        }
    };

    const getWeatherIcon = (condition) => {
        const iconMap = {
            'clear': '☀️', 'sunny': '☀️', 'partly cloudy': '⛅', 'cloudy': '☁️',
            'overcast': '☁️', 'rain': '🌧️', 'light rain': '🌦️', 'heavy rain': '🌧️',
            'thunderstorm': '⛈️', 'snow': '❄️', 'fog': '🌫️', 'mist': '🌫️'
        };
        const conditionLower = condition?.toLowerCase() || '';
        for (const [key, icon] of Object.entries(iconMap)) {
            if (conditionLower.includes(key)) return icon;
        }
        return '🌤️';
    };

    const getTemperatureColor = (temp) => {
        if (temp > 35) return '#ff6b6b';
        if (temp > 30) return '#ff9f4a';
        if (temp > 20) return '#ffd93d';
        if (temp > 10) return '#6bcf7f';
        return '#74b9ff';
    };

    const getRecommendation = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        const windSpeed = weatherData.wind_speed || 0;
        const humidity = weatherData.humidity || 0;

        if (temp > 35) return isArabic ? '🌡️ حرارة شديدة - ابق في الداخل واشرب الكثير من الماء' : '🌡️ Extreme heat - stay indoors and drink plenty of water';
        if (temp > 30) return isArabic ? '☀️ حار جداً - ارتد ملابس خفيفة واشرب الماء' : '☀️ Very hot - wear light clothes and drink water';
        if (temp < 5) return isArabic ? '❄️ بارد جداً - ارتد ملابس ثقيلة واحمِ نفسك' : '❄️ Very cold - wear heavy clothes and stay warm';
        if (temp < 10) return isArabic ? '🧥 بارد - لا تنسَ ارتداء سترة دافئة' : '🧥 Cold - don\'t forget to wear a warm jacket';
        if (condition.includes('rain')) return isArabic ? '☔ مطر - احمل مظلة وارتدِ ملابس مقاومة للماء' : '☔ Rainy - carry an umbrella and wear waterproof clothes';
        if (windSpeed > 30) return isArabic ? '💨 عاصف - احرص على تثبيت الأجسام الخفيفة' : '💨 Windy - secure light objects';
        if (humidity > 80) return isArabic ? '💧 رطوبة عالية - قد تشعر بالحرارة أكثر' : '💧 High humidity - you may feel hotter';
        if (condition.includes('clear') || condition.includes('sunny')) {
            if (temp >= 18 && temp <= 25) return isArabic ? '🌤️ طقس مثالي - استمتع بالخارج!' : '🌤️ Perfect weather - enjoy the outdoors!';
            return isArabic ? '☀️ طقس مشمس - استخدم واقي الشمس' : '☀️ Sunny - use sunscreen';
        }
        if (temp >= 18 && temp <= 25) return isArabic ? '🌸 طقس لطيف - يوم جميل! 🌸' : '🌸 Pleasant weather - beautiful day! 🌸';
        return null;
    };

    const getActivitySuggestion = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        
        if (condition.includes('rain')) return isArabic ? '🏠 أنشطة داخلية: اقرأ كتاباً أو شاهد فيلماً' : '🏠 Indoor activities: read a book or watch a movie';
        if (temp > 35) return isArabic ? '🏊 أنشطة داخلية: سباحة أو تمارين في مكان مكيف' : '🏊 Indoor activities: swimming or exercise in A/C';
        if (temp < 5) return isArabic ? '🔥 أنشطة داخلية: احتساء مشروب ساخن' : '🔥 Indoor activities: enjoy a hot beverage';
        if (condition.includes('clear') || condition.includes('sunny')) {
            if (temp >= 15 && temp <= 28) return isArabic ? '🚶 أنشطة خارجية: المشي أو الجري أو ركوب الدراجة' : '🚶 Outdoor activities: walking, running, or cycling';
            return isArabic ? '🚶 أنشطة خارجية معتدلة: المشي في الظل' : '🚶 Moderate outdoor activities: walking in shade';
        }
        return null;
    };

    const getClothingSuggestion = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        
        if (condition.includes('rain')) return isArabic ? '☔ معطف مطر ومظلة' : '☔ Raincoat and umbrella';
        if (temp > 35) return isArabic ? '🩳 ملابس قطنية خفيفة وطاقية' : '🩳 Light cotton clothes and a cap';
        if (temp > 30) return isArabic ? '👕 ملابس صيفية خفيفة' : '👕 Light summer clothes';
        if (temp < 5) return isArabic ? '🧥 معطف ثقيل وقبعة وقفازات' : '🧥 Heavy coat, hat, and gloves';
        if (temp < 15) return isArabic ? '🧥 سترة دافئة' : '🧥 Warm jacket';
        return null;
    };

    if (loading) {
        return (
            <div className="weather-widget loading">
                <div className="weather-loading">
                    <span className="weather-icon">🌤️</span>
                    <p>{isArabic ? 'جاري تحميل الطقس...' : 'Loading weather...'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="weather-widget error">
                <div className="weather-error">
                    <span>⚠️</span>
                    <p>{error}</p>
                    <button onClick={() => fetchWeather()} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
                {!showCityInput && (
                    <button onClick={() => setShowCityInput(true)} className="change-city-btn">
                        📍 {isArabic ? 'تغيير المدينة' : 'Change City'}
                    </button>
                )}
                {showCityInput && (
                    <form onSubmit={handleCitySubmit} className="city-form">
                        <input
                            type="text"
                            value={tempCity}
                            onChange={(e) => setTempCity(e.target.value)}
                            placeholder={isArabic ? 'اسم المدينة' : 'City name'}
                            className="city-input"
                        />
                        <button type="submit" className="submit-city-btn">
                            {isArabic ? 'حفظ' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setShowCityInput(false)} className="cancel-city-btn">
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                    </form>
                )}
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    if (!weather) return null;

    const weatherIcon = getWeatherIcon(weather.condition);
    const tempColor = getTemperatureColor(weather.temperature);
    const recommendation = getRecommendation(weather);
    const activitySuggestion = getActivitySuggestion(weather);
    const clothingSuggestion = getClothingSuggestion(weather);

    return (
        <div className="weather-widget">
            <div className="weather-header">
                <div className="weather-title">
                    <span className="weather-icon-large">🌤️</span>
                    <h3>{isArabic ? 'الطقس في' : 'Weather in'} {weather.city}</h3>
                </div>
                <div className="weather-actions">
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                    <button 
                        onClick={() => setShowCityInput(!showCityInput)} 
                        className="change-city-btn-small"
                        title={isArabic ? 'تغيير المدينة' : 'Change city'}
                    >
                        📍
                    </button>
                    <button onClick={() => fetchWeather()} className="refresh-btn-small" title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                </div>
            </div>

            {showCityInput && (
                <form onSubmit={handleCitySubmit} className="city-form">
                    <input
                        type="text"
                        value={tempCity}
                        onChange={(e) => setTempCity(e.target.value)}
                        placeholder={isArabic ? 'اسم المدينة' : 'City name'}
                        className="city-input"
                    />
                    <button type="submit" className="submit-city-btn">
                        {isArabic ? 'حفظ' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setShowCityInput(false)} className="cancel-city-btn">
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                </form>
            )}
            
            <div className="weather-main">
                <div className="weather-temp" style={{ color: tempColor }}>
                    {weather.temperature}°C
                </div>
                <div className="weather-icon-temp">
                    <span className="weather-icon-big">{weatherIcon}</span>
                    <span className="weather-desc">{weather.description}</span>
                </div>
                
                <div className="weather-details-grid">
                    <div className="weather-detail">
                        <span className="detail-icon">💧</span>
                        <span className="detail-label">{isArabic ? 'الرطوبة' : 'Humidity'}</span>
                        <span className="detail-value">{weather.humidity}%</span>
                    </div>
                    <div className="weather-detail">
                        <span className="detail-icon">🌬️</span>
                        <span className="detail-label">{isArabic ? 'الرياح' : 'Wind'}</span>
                        <span className="detail-value">{weather.wind_speed} km/h</span>
                    </div>
                    {weather.pressure && (
                        <div className="weather-detail">
                            <span className="detail-icon">📊</span>
                            <span className="detail-label">{isArabic ? 'الضغط' : 'Pressure'}</span>
                            <span className="detail-value">{weather.pressure} hPa</span>
                        </div>
                    )}
                </div>
            </div>

            {recommendation && (
                <div className="weather-recommendation">
                    <div className="recommendation-header">
                        <span>💡</span>
                        <strong>{isArabic ? 'توصية' : 'Recommendation'}</strong>
                    </div>
                    <p>{recommendation}</p>
                </div>
            )}

            {activitySuggestion && (
                <div className="weather-activity">
                    <div className="activity-header">
                        <span>🏃</span>
                        <strong>{isArabic ? 'نشاط مقترح' : 'Suggested Activity'}</strong>
                    </div>
                    <p>{activitySuggestion}</p>
                </div>
            )}

            {clothingSuggestion && (
                <div className="weather-clothing">
                    <div className="clothing-header">
                        <span>👕</span>
                        <strong>{isArabic ? 'ملابس مناسبة' : 'Suggested Clothing'}</strong>
                    </div>
                    <p>{clothingSuggestion}</p>
                </div>
            )}

            <div className="weather-footer">
                <small>
                    {isArabic ? 'آخر تحديث' : 'Last update'}: {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
        </div>
    );
};

export default WeatherWidget;