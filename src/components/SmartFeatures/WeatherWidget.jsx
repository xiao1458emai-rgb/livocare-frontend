// src/components/SmartFeatures/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import externalApis from '../../services/externalApis';
import './SmartFeatures.css';

const WeatherWidget = () => {
    const { t, i18n } = useTranslation();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [city, setCity] = useState('Cairo');
    const [showCityInput, setShowCityInput] = useState(false);
    const [tempCity, setTempCity] = useState('');

    // معرفة إذا كانت اللغة العربية
    const isArabic = i18n.language.startsWith('ar');

    // تحميل المدينة المحفوظة
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
            const response = await externalApis.getWeather(cityName);
            
            if (response.success) {
                setWeather(response.data);
                // حفظ المدينة في localStorage
                localStorage.setItem('weather_city', cityName);
                setCity(cityName);
                setError(null);
            } else {
                setError(response.error || t('weather.error'));
            }
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError(t('weather.fetchError'));
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
            'clear': '☀️',
            'sunny': '☀️',
            'partly cloudy': '⛅',
            'cloudy': '☁️',
            'overcast': '☁️',
            'rain': '🌧️',
            'light rain': '🌦️',
            'heavy rain': '🌧️',
            'thunderstorm': '⛈️',
            'snow': '❄️',
            'fog': '🌫️',
            'mist': '🌫️'
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

        if (temp > 35) {
            return t('weather.recommendations.extremeHeat');
        }
        if (temp > 30) {
            return t('weather.recommendations.hot');
        }
        if (temp < 5) {
            return t('weather.recommendations.freezing');
        }
        if (temp < 10) {
            return t('weather.recommendations.cold');
        }
        if (condition.includes('rain')) {
            return t('weather.recommendations.rainy');
        }
        if (windSpeed > 30) {
            return t('weather.recommendations.windy');
        }
        if (humidity > 80) {
            return t('weather.recommendations.highHumidity');
        }
        if (condition.includes('clear') || condition.includes('sunny')) {
            return t('weather.recommendations.sunny');
        }
        if (temp >= 18 && temp <= 25) {
            return t('weather.recommendations.perfect');
        }
        return null;
    };

    const getActivitySuggestion = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        
        if (condition.includes('rain')) {
            return t('weather.activities.rainy');
        }
        if (temp > 35) {
            return t('weather.activities.hot');
        }
        if (temp < 5) {
            return t('weather.activities.cold');
        }
        if (condition.includes('clear') || condition.includes('sunny')) {
            if (temp >= 15 && temp <= 28) {
                return t('weather.activities.perfect');
            }
            return t('weather.activities.sunny');
        }
        return null;
    };

    const getClothingSuggestion = (weatherData) => {
        const temp = weatherData.temperature;
        const condition = weatherData.condition?.toLowerCase() || '';
        
        if (condition.includes('rain')) {
            return t('weather.clothing.rainy');
        }
        if (temp > 35) {
            return t('weather.clothing.hot');
        }
        if (temp > 30) {
            return t('weather.clothing.warm');
        }
        if (temp < 5) {
            return t('weather.clothing.freezing');
        }
        if (temp < 15) {
            return t('weather.clothing.cool');
        }
        return null;
    };

    if (loading) {
        return (
            <div className="weather-widget loading">
                <div className="weather-loading">
                    <span className="weather-icon">🌤️</span>
                    <p>{t('weather.loading')}</p>
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
                        🔄 {t('weather.retry')}
                    </button>
                </div>
                {!showCityInput && (
                    <button onClick={() => setShowCityInput(true)} className="change-city-btn">
                        📍 {t('weather.changeCity')}
                    </button>
                )}
                {showCityInput && (
                    <form onSubmit={handleCitySubmit} className="city-form">
                        <input
                            type="text"
                            value={tempCity}
                            onChange={(e) => setTempCity(e.target.value)}
                            placeholder={t('weather.cityPlaceholder')}
                            className="city-input"
                        />
                        <button type="submit" className="submit-city-btn">
                            {t('weather.save')}
                        </button>
                        <button type="button" onClick={() => setShowCityInput(false)} className="cancel-city-btn">
                            {t('weather.cancel')}
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
    const isRTL = isArabic;

    return (
        <div className="weather-widget">
            <div className="weather-header">
                <div className="weather-title">
                    <span className="weather-icon-large">🌤️</span>
                    <h3>{t('weather.title')} {weather.city}</h3>
                </div>
                <div className="weather-actions">
                    <button 
                        onClick={() => setShowCityInput(!showCityInput)} 
                        className="change-city-btn-small"
                        title={t('weather.changeCity')}
                    >
                        📍
                    </button>
                    <button onClick={() => fetchWeather()} className="refresh-btn-small" title={t('weather.refresh')}>
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
                        placeholder={t('weather.cityPlaceholder')}
                        className="city-input"
                    />
                    <button type="submit" className="submit-city-btn">
                        {t('weather.save')}
                    </button>
                    <button type="button" onClick={() => setShowCityInput(false)} className="cancel-city-btn">
                        {t('weather.cancel')}
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
                        <span className="detail-label">{t('weather.humidity')}</span>
                        <span className="detail-value">{weather.humidity}%</span>
                    </div>
                    <div className="weather-detail">
                        <span className="detail-icon">🌬️</span>
                        <span className="detail-label">{t('weather.windSpeed')}</span>
                        <span className="detail-value">{weather.wind_speed} km/h</span>
                    </div>
                    {weather.pressure && (
                        <div className="weather-detail">
                            <span className="detail-icon">📊</span>
                            <span className="detail-label">{t('weather.pressure')}</span>
                            <span className="detail-value">{weather.pressure} hPa</span>
                        </div>
                    )}
                    {weather.uv_index && (
                        <div className="weather-detail">
                            <span className="detail-icon">☀️</span>
                            <span className="detail-label">{t('weather.uvIndex')}</span>
                            <span className="detail-value">{weather.uv_index}</span>
                        </div>
                    )}
                </div>
            </div>

            {recommendation && (
                <div className="weather-recommendation">
                    <div className="recommendation-header">
                        <span>💡</span>
                        <strong>{t('weather.recommendation')}</strong>
                    </div>
                    <p>{recommendation}</p>
                </div>
            )}

            {activitySuggestion && (
                <div className="weather-activity">
                    <div className="activity-header">
                        <span>🏃</span>
                        <strong>{t('weather.activitySuggestion')}</strong>
                    </div>
                    <p>{activitySuggestion}</p>
                </div>
            )}

            {clothingSuggestion && (
                <div className="weather-clothing">
                    <div className="clothing-header">
                        <span>👕</span>
                        <strong>{t('weather.clothingSuggestion')}</strong>
                    </div>
                    <p>{clothingSuggestion}</p>
                </div>
            )}

            <div className="weather-footer">
                <small>
                    {t('weather.lastUpdate')}: {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
        </div>
    );
};

export default WeatherWidget;