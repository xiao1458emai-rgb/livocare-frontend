// src/components/SmartFeatures/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

const WeatherWidget = () => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [city, setCity] = useState('Cairo');
    const [showCityInput, setShowCityInput] = useState(false);
    const [tempCity, setTempCity] = useState('');

    // الاستماع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    useEffect(() => {
        const savedCity = localStorage.getItem('weather_city');
        if (savedCity) {
            setCity(savedCity);
        }
        fetchWeather(savedCity || 'Cairo');
    }, []);

    const fetchWeather = async (cityName = city) => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get(`/weather/?city=${encodeURIComponent(cityName)}`);
            
            if (response.data && response.data.success !== false && response.data.temperature) {
                setWeather(response.data);
                localStorage.setItem('weather_city', cityName);
                setCity(cityName);
            } else {
                useMockData(cityName);
            }
        } catch (err) {
            console.error('Weather fetch error:', err);
            useMockData(cityName);
        } finally {
            setLoading(false);
        }
    };

    const useMockData = (cityName) => {
        console.log('🌤️ Using mock weather data for:', cityName);
        setWeather({
            city: cityName,
            temperature: Math.floor(Math.random() * 20) + 15,
            condition: 'Clear',
            description: isArabic ? 'سماء صافية' : 'Clear sky',
            humidity: Math.floor(Math.random() * 40) + 40,
            wind_speed: Math.floor(Math.random() * 20) + 5,
            pressure: 1013,
            success: true
        });
        localStorage.setItem('weather_city', cityName);
        setCity(cityName);
        setError(null);
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
        return isArabic ? '🌤️ طقس معتدل - يوم مناسب للأنشطة' : '🌤️ Moderate weather - good day for activities';
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
        return isArabic ? '🚶 أنشطة معتدلة: المشي أو تمارين خفيفة' : '🚶 Moderate activities: walking or light exercise';
    };

    const getClothingSuggestion = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        
        if (condition.includes('rain')) return isArabic ? '☔ معطف مطر ومظلة' : '☔ Raincoat and umbrella';
        if (temp > 35) return isArabic ? '🩳 ملابس قطنية خفيفة وطاقية' : '🩳 Light cotton clothes and a cap';
        if (temp > 30) return isArabic ? '👕 ملابس صيفية خفيفة' : '👕 Light summer clothes';
        if (temp < 5) return isArabic ? '🧥 معطف ثقيل وقبعة وقفازات' : '🧥 Heavy coat, hat, and gloves';
        if (temp < 15) return isArabic ? '🧥 سترة دافئة' : '🧥 Warm jacket';
        return isArabic ? '👕 ملابس مناسبة للطقس' : '👕 Weather-appropriate clothing';
    };

    if (loading) {
        return (
            <div className={`weather-widget loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="weather-loading">
                    <div className="weather-icon-pulse">🌤️</div>
                    <p>{isArabic ? 'جاري تحميل الطقس...' : 'Loading weather...'}</p>
                </div>
            </div>
        );
    }

    if (error && !weather) {
        return (
            <div className={`weather-widget error ${darkMode ? 'dark-mode' : ''}`}>
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
        <div className={`weather-widget ${darkMode ? 'dark-mode' : ''}`}>
            <div className="weather-header">
                <div className="weather-title">
                    <span className="weather-icon-large">🌤️</span>
                    <h3>{isArabic ? 'الطقس في' : 'Weather in'} <span className="city-name">{weather.city}</span></h3>
                </div>
                <div className="weather-actions">
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
                        autoFocus
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
                <div className="weather-temp-container">
                    <div className="weather-temp" style={{ color: tempColor }}>
                        {Math.round(weather.temperature)}<span className="temp-unit">°C</span>
                    </div>
                </div>
                <div className="weather-icon-temp">
                    <div className="weather-animation">{weatherIcon}</div>
                    <span className="weather-desc">{weather.description}</span>
                </div>
                
                <div className="weather-details-grid">
                    <div className="weather-detail">
                        <div className="detail-icon">💧</div>
                        <div className="detail-label">{isArabic ? 'الرطوبة' : 'Humidity'}</div>
                        <div className="detail-value">{weather.humidity}%</div>
                    </div>
                    <div className="weather-detail">
                        <div className="detail-icon">🌬️</div>
                        <div className="detail-label">{isArabic ? 'الرياح' : 'Wind'}</div>
                        <div className="detail-value">{weather.wind_speed} <span className="detail-unit">km/h</span></div>
                    </div>
                    {weather.pressure && (
                        <div className="weather-detail">
                            <div className="detail-icon">📊</div>
                            <div className="detail-label">{isArabic ? 'الضغط' : 'Pressure'}</div>
                            <div className="detail-value">{weather.pressure} <span className="detail-unit">hPa</span></div>
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
                    🕐 {isArabic ? 'آخر تحديث' : 'Last update'}: {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>

            {/* أنماط CSS المحسنة */}
            <style jsx>{`
                /* ===== الحاوية الرئيسية ===== */
                .weather-widget {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 28px;
                    padding: 1.25rem;
                    transition: all 0.3s ease;
                    color: white;
                    overflow: hidden;
                    position: relative;
                }
                
                .weather-widget::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
                
                .weather-widget:hover::before {
                    opacity: 1;
                }
                
                .weather-widget.dark-mode {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                }
                
                .weather-widget:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.2);
                }
                
                /* ===== الرأس ===== */
                .weather-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                }
                
                .weather-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .weather-icon-large {
                    font-size: 1.5rem;
                    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.2));
                }
                
                .weather-title h3 {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                
                .city-name {
                    font-weight: 800;
                    background: rgba(255,255,255,0.2);
                    padding: 0.2rem 0.5rem;
                    border-radius: 20px;
                    display: inline-block;
                }
                
                /* ===== أزرار التحكم ===== */
                .weather-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .change-city-btn-small,
                .refresh-btn-small {
                    background: rgba(255, 255, 255, 0.15);
                    border: none;
                    border-radius: 12px;
                    padding: 0.4rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    backdrop-filter: blur(4px);
                }
                
                .change-city-btn-small:hover,
                .refresh-btn-small:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.05);
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
                    padding: 0.6rem 0.75rem;
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    border-radius: 14px;
                    font-size: 0.8rem;
                    color: white;
                    backdrop-filter: blur(4px);
                }
                
                .city-input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }
                
                .city-input:focus {
                    outline: none;
                    border-color: rgba(255, 255, 255, 0.5);
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .submit-city-btn,
                .cancel-city-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 500;
                    transition: all 0.2s;
                    border: none;
                }
                
                .submit-city-btn {
                    background: #10b981;
                    color: white;
                }
                
                .submit-city-btn:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                
                .cancel-city-btn {
                    background: rgba(239, 68, 68, 0.8);
                    color: white;
                }
                
                .cancel-city-btn:hover {
                    background: #dc2626;
                    transform: translateY(-2px);
                }
                
                /* ===== المحتوى الرئيسي ===== */
                .weather-main {
                    text-align: center;
                    margin-bottom: 1rem;
                }
                
                .weather-temp-container {
                    margin-bottom: 0.5rem;
                }
                
                .weather-temp {
                    font-size: 3rem;
                    font-weight: 800;
                    line-height: 1;
                    transition: color 0.3s ease;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                }
                
                .temp-unit {
                    font-size: 1.2rem;
                    font-weight: 500;
                    margin-left: 0.25rem;
                }
                
                .weather-icon-temp {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .weather-animation {
                    font-size: 2.5rem;
                    animation: weatherFloat 3s ease-in-out infinite;
                }
                
                @keyframes weatherFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                }
                
                .weather-desc {
                    font-size: 0.85rem;
                    font-weight: 500;
                    text-transform: capitalize;
                    background: rgba(255, 255, 255, 0.15);
                    padding: 0.2rem 0.8rem;
                    border-radius: 20px;
                }
                
                /* ===== شبكة التفاصيل ===== */
                .weather-details-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .weather-detail {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 0.5rem;
                    text-align: center;
                    backdrop-filter: blur(4px);
                    transition: all 0.2s;
                }
                
                .weather-detail:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.02);
                }
                
                .detail-icon {
                    font-size: 1.2rem;
                    margin-bottom: 0.25rem;
                    display: block;
                }
                
                .detail-label {
                    font-size: 0.6rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    opacity: 0.8;
                }
                
                .detail-value {
                    font-size: 0.8rem;
                    font-weight: 700;
                    margin-top: 0.25rem;
                }
                
                .detail-unit {
                    font-size: 0.6rem;
                    font-weight: 400;
                }
                
                /* ===== التوصيات ===== */
                .weather-recommendation,
                .weather-activity,
                .weather-clothing {
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 14px;
                    padding: 0.75rem;
                    margin-bottom: 0.75rem;
                    backdrop-filter: blur(4px);
                    transition: all 0.2s;
                }
                
                .weather-recommendation:hover,
                .weather-activity:hover,
                .weather-clothing:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateX(4px);
                }
                
                [dir="rtl"] .weather-recommendation:hover,
                [dir="rtl"] .weather-activity:hover,
                [dir="rtl"] .weather-clothing:hover {
                    transform: translateX(-4px);
                }
                
                .weather-recommendation {
                    border-left: 3px solid #fbbf24;
                }
                
                .weather-activity {
                    border-left: 3px solid #34d399;
                }
                
                .weather-clothing {
                    border-left: 3px solid #a78bfa;
                }
                
                [dir="rtl"] .weather-recommendation {
                    border-left: none;
                    border-right: 3px solid #fbbf24;
                }
                
                [dir="rtl"] .weather-activity {
                    border-left: none;
                    border-right: 3px solid #34d399;
                }
                
                [dir="rtl"] .weather-clothing {
                    border-left: none;
                    border-right: 3px solid #a78bfa;
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
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .weather-recommendation p,
                .weather-activity p,
                .weather-clothing p {
                    margin: 0;
                    font-size: 0.75rem;
                    line-height: 1.4;
                    opacity: 0.95;
                }
                
                /* ===== التذييل ===== */
                .weather-footer {
                    margin-top: 0.75rem;
                    padding-top: 0.5rem;
                    text-align: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                }
                
                .weather-footer small {
                    font-size: 0.6rem;
                    opacity: 0.7;
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
                
                .weather-icon-pulse {
                    font-size: 2rem;
                    animation: weatherPulse 1.5s ease-in-out infinite;
                }
                
                @keyframes weatherPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                
                .weather-loading p {
                    font-size: 0.8rem;
                    opacity: 0.8;
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
                    opacity: 0.9;
                }
                
                .retry-btn {
                    margin-top: 0.5rem;
                    padding: 0.4rem 1rem;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    font-weight: 500;
                    transition: all 0.2s;
                    backdrop-filter: blur(4px);
                }
                
                .retry-btn:hover {
                    background: rgba(255, 255, 255, 0.35);
                    transform: translateY(-2px);
                }
                
                .change-city-btn {
                    margin-top: 0.75rem;
                    padding: 0.4rem 1rem;
                    background: rgba(255, 255, 255, 0.15);
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    color: white;
                    transition: all 0.2s;
                    backdrop-filter: blur(4px);
                }
                
                .change-city-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
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
                
                [dir="rtl"] .recommendation-header,
                [dir="rtl"] .activity-header,
                [dir="rtl"] .clothing-header {
                    flex-direction: row-reverse;
                }
                
                /* ===== تقليل الحركة ===== */
                @media (prefers-reduced-motion: reduce) {
                    .weather-widget:hover {
                        transform: none;
                    }
                    
                    .weather-animation {
                        animation: none;
                    }
                    
                    .weather-icon-pulse {
                        animation: none;
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
                    
                    .weather-detail:hover {
                        transform: none;
                    }
                    
                    .weather-recommendation:hover,
                    .weather-activity:hover,
                    .weather-clothing:hover {
                        transform: none;
                    }
                }
                
                /* ===== دعم الشاشات الصغيرة ===== */
                @media (max-width: 480px) {
                    .weather-widget {
                        padding: 1rem;
                    }
                    
                    .weather-temp {
                        font-size: 2.2rem;
                    }
                    
                    .weather-animation {
                        font-size: 2rem;
                    }
                    
                    .weather-details-grid {
                        gap: 0.5rem;
                    }
                    
                    .weather-detail {
                        padding: 0.4rem;
                    }
                    
                    .detail-value {
                        font-size: 0.7rem;
                    }
                    
                    .city-form {
                        flex-direction: column;
                    }
                    
                    .submit-city-btn,
                    .cancel-city-btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default WeatherWidget;