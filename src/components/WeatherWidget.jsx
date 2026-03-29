// components/WeatherWidget.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../services/api';

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [recommendation, setRecommendation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWeather();
    }, []);

    const fetchWeather = async () => {
        setLoading(true);
        try {
            // ✅ استخدم المسار الصحيح (بدون /api لأن axiosInstance يضيفه)
            const response = await axiosInstance.get('/weather/');
            setWeather(response.data);
            generateRecommendation(response.data);
            setError(null);
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError('تعذر جلب بيانات الطقس');
        } finally {
            setLoading(false);
        }
    };

    const generateRecommendation = (weather) => {
        if (weather.temperature > 35) {
            setRecommendation('🌡️ الجو حار جداً! اشرب ماء كثيراً وتجنب التمارين الشاقة');
        } else if (weather.temperature < 15) {
            setRecommendation('🧥 الجو بارد! ارتد ملابس دافئة ومارس الرياضة داخل المنزل');
        } else if (weather.description && weather.description.includes('مطر')) {
            setRecommendation('☔ يوم ممطر! وقت مناسب للتأمل والقراءة');
        } else {
            setRecommendation('🌤️ طقس مثالي للنشاط البدني');
        }
    };

    if (loading) {
        return <div className="weather-widget loading">⏳ جاري تحميل الطقس...</div>;
    }

    if (error) {
        return <div className="weather-widget error">⚠️ {error}</div>;
    }

    if (!weather) {
        return null;
    }

    return (
        <div className="weather-widget">
            <div className="weather-icon">🌤️</div>
            <div className="weather-info">
                <h4>{weather.city || 'موقعك'}</h4>
                <p>{weather.temperature}°C - {weather.description || 'غير معروف'}</p>
                {recommendation && <p className="recommendation">💡 {recommendation}</p>}
            </div>
        </div>
    );
};

export default WeatherWidget;