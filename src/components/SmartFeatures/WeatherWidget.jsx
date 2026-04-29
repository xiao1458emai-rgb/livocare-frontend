// src/components/SmartFeatures/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

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
                        {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
/* ===========================================
   WeatherWidget.css - الأنماط الداخلية فقط
   ✅ واجهة الطقس - تصميم نظيف وحديث
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.weather-widget {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 24px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s ease;
}

.dark-mode .weather-widget {
    background: #0f172a;
    border-color: #334155;
}

.weather-widget:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode .weather-widget:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

/* ===== الرأس ===== */
.weather-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .weather-header {
    border-bottom-color: #334155;
}

.weather-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.weather-icon-large {
    font-size: 1.3rem;
}

.weather-title h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .weather-title h3 {
    color: #f1f5f9;
}

.weather-actions {
    display: flex;
    gap: 0.5rem;
}

/* ===== أزرار التحكم ===== */
.change-city-btn-small,
.refresh-btn-small {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .change-city-btn-small,
.dark-mode .refresh-btn-small {
    background: #1e293b;
    border-color: #475569;
    color: #94a3b8;
}

.change-city-btn-small:hover,
.refresh-btn-small:hover {
    background: #3b82f6;
    color: white;
    transform: scale(1.05);
    border-color: transparent;
}

.refresh-btn-small:hover {
    transform: rotate(180deg);
}

/* ===== نموذج تغيير المدينة ===== */
.city-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.city-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .city-input {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.city-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.submit-city-btn,
.cancel-city-btn {
    padding: 0.5rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.submit-city-btn {
    background: #3b82f6;
    border: none;
    color: white;
}

.submit-city-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.cancel-city-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    color: var(--text-secondary, #64748b);
}

.dark-mode .cancel-city-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.cancel-city-btn:hover {
    background: #ef4444;
    color: white;
    border-color: transparent;
}

/* ===== المحتوى الرئيسي ===== */
.weather-main {
    text-align: center;
    margin-bottom: 1rem;
}

.weather-temp {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    transition: color 0.3s ease;
}

.weather-icon-temp {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.weather-icon-big {
    font-size: 2.5rem;
}

.weather-desc {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
    text-transform: capitalize;
}

.dark-mode .weather-desc {
    color: #94a3b8;
}

/* ===== شبكة التفاصيل ===== */
.weather-details-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.weather-detail {
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    padding: 0.5rem;
    text-align: center;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .weather-detail {
    background: #1e293b;
    border-color: #475569;
}

.detail-icon {
    display: block;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
}

.detail-label {
    display: block;
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.detail-value {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .detail-value {
    color: #f1f5f9;
}

/* ===== التوصيات ===== */
.weather-recommendation,
.weather-activity,
.weather-clothing {
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border-left: 3px solid;
}

.dark-mode .weather-recommendation,
.dark-mode .weather-activity,
.dark-mode .weather-clothing {
    background: #1e293b;
}

.weather-recommendation {
    border-left-color: #f59e0b;
}

.weather-activity {
    border-left-color: #10b981;
}

.weather-clothing {
    border-left-color: #8b5cf6;
}

[dir="rtl"] .weather-recommendation,
[dir="rtl"] .weather-activity,
[dir="rtl"] .weather-clothing {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .weather-recommendation {
    border-right-color: #f59e0b;
}

[dir="rtl"] .weather-activity {
    border-right-color: #10b981;
}

[dir="rtl"] .weather-clothing {
    border-right-color: #8b5cf6;
}

.recommendation-header,
.activity-header,
.clothing-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.recommendation-header span,
.activity-header span,
.clothing-header span {
    font-size: 1rem;
}

.recommendation-header strong,
.activity-header strong,
.clothing-header strong {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.dark-mode .recommendation-header strong,
.dark-mode .activity-header strong,
.dark-mode .clothing-header strong {
    color: #f1f5f9;
}

.weather-recommendation p,
.weather-activity p,
.weather-clothing p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
    line-height: 1.4;
}

/* ===== التذييل ===== */
.weather-footer {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    text-align: center;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .weather-footer {
    border-top-color: #334155;
}

.weather-footer small {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== حالات التحميل والخطأ ===== */
.weather-widget.loading,
.weather-widget.error {
    text-align: center;
    padding: 1.5rem;
}

.weather-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.weather-loading .weather-icon {
    font-size: 2rem;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
}

.weather-loading p {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

.weather-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.weather-error span {
    font-size: 2rem;
}

.weather-error p {
    font-size: 0.8rem;
    color: #ef4444;
}

.retry-btn {
    margin-top: 0.5rem;
    padding: 0.4rem 1rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.change-city-btn {
    margin-top: 0.75rem;
    padding: 0.4rem 1rem;
    background: var(--secondary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    transition: all 0.2s;
}

.dark-mode .change-city-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.change-city-btn:hover {
    background: #3b82f6;
    color: white;
    border-color: transparent;
}

/* ===== دعم RTL ===== */
[dir="rtl"] .weather-title {
    flex-direction: row-reverse;
}

[dir="rtl"] .weather-actions {
    flex-direction: row-reverse;
}

[dir="rtl"] .weather-details-grid {
    direction: rtl;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .weather-widget:hover {
        transform: none;
    }
    
    .refresh-btn-small:hover {
        transform: none;
    }
    
    .submit-city-btn:hover,
    .cancel-city-btn:hover,
    .retry-btn:hover,
    .change-city-btn:hover {
        transform: none;
    }
    
    .weather-loading .weather-icon {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .weather-widget {
        border-width: 2px;
    }
    
    .weather-recommendation,
    .weather-activity,
    .weather-clothing {
        border-left-width: 4px;
    }
    
    [dir="rtl"] .weather-recommendation,
    [dir="rtl"] .weather-activity,
    [dir="rtl"] .weather-clothing {
        border-right-width: 4px;
    }
}
            `}</style>
        </div>
    );
};

export default WeatherWidget;
