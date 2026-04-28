// ============================================================
// الشكل المجرد للمكون - فقط الهيكل والبصمات (fingerprints)
// ============================================================

// 🧩 البصمة 1: الواردات (Imports signature)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
// ❌ تم إزالة '../index.css' للتحليل

// 🧩 البصمة 2: تسجيل مكونات Chart.js
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

// 🧩 البصمة 3: دالة ألوان الثيم (Theme colors)
const getThemeColors = (darkMode) => ({
    textPrimary: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#cbd5e1' : '#475569',
    textTertiary: darkMode ? '#94a3b8' : '#64748b',
    gridColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    tooltipBg: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
    weightColor: '#3b82f6',
    systolicColor: '#ef4444',
    diastolicColor: '#8b5cf6',
    glucoseColor: '#10b981',
    heartRateColor: '#ec489a',
    spo2Color: '#06b6d4',
    temperatureColor: '#f97316',
});

// 🧩 البصمة 4: التوقيع العام للمكون (Component signature)
function HealthCharts({ refreshKey, isArabic: propIsArabic }) {
    // 🧩 البصمة 5: حالة اللغة (Language state)
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    
    // 🧩 البصمة 6: حالات البيانات الأساسية (Core data states)
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    
    // 🧩 البصمة 7: المراجع (References)
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    
    // 🧩 البصمة 8: الدوال الرئيسية (Main functions)
    // 8.1 fetchData - جلب البيانات من API (مع دعم درجة الحرارة)
    // 8.2 processChartData - معالجة البيانات للرسوم البيانية (مع درجة الحرارة)
    // 8.3 getChartOptions - خيارات الرسم البياني
    // 8.4 getDynamicRange - حساب النطاق الديناميكي
    // 8.5 calculateStats - حساب الإحصائيات
    
    // 🧩 البصمة 9: تأثيرات جانبية (Effects)
    // Effect 1: مراقبة تغييرات اللغة
    // Effect 2: تحميل إعدادات الوضع المظلم
    // Effect 3: الاستماع لتغييرات الثيم
    // Effect 4: جلب البيانات عند تغيير refreshKey أو fetchData
    // Effect 5: تنظيف عند فك التركيب
    
    // 🧩 البصمة 10: معالجة البيانات (Data processing)
    const { dates, weights, systolic, diastolic, glucose, heartRate, spo2, temperatures } = processChartData();
    const themeColors = getThemeColors(darkMode);
    
    // 🧩 البصمة 11: كشف وجود البيانات (Data presence checks)
    const hasWeightData = weights.some(w => w !== null);
    const hasBPData = systolic.some(s => s !== null) || diastolic.some(d => d !== null);
    const hasGlucoseData = glucose.some(g => g !== null);
    const hasHeartRateData = heartRate.some(h => h !== null);
    const hasSpO2Data = spo2.some(s => s !== null);
    const hasTemperatureData = temperatures.some(t => t !== null);
    
    // 🧩 البصمة 12: الإحصائيات والنطاقات (Stats & ranges)
    const weightStats = calculateStats(weights);
    const glucoseStats = calculateStats(glucose);
    const heartRateStats = calculateStats(heartRate);
    const spo2Stats = calculateStats(spo2);
    const temperatureStats = calculateStats(temperatures);
    
    const weightRange = getDynamicRange(weights);
    const glucoseRange = getDynamicRange(glucose);
    const heartRateRange = getDynamicRange(heartRate, 0.15, 40, 120);
    const spo2Range = getDynamicRange(spo2, 0.1, 85, 100);
    const temperatureRange = getDynamicRange(temperatures, 0.2, 35, 40);
    
    // 🧩 البصمة 13: حالة التحميل (Loading state)
    if (loading) return <div>Loading charts...</div>;
    
    // 🧩 البصمة 14: حالة الخطأ (Error state)
    if (error) return <div>Error: {error}</div>;
    
    // 🧩 البصمة 15: حالة عدم وجود بيانات (Empty state)
    if (!hasWeightData && !hasBPData && !hasGlucoseData && !hasHeartRateData && !hasSpO2Data && !hasTemperatureData) {
        return <div>No data available for charts</div>;
    }
    
    // 🧩 البصمة 16: التصيير (Render)
    // يحتوي على 6 رسوم بيانية (مع إضافة درجة الحرارة):
    // 1. رسم الوزن (Weight) - متغير
    // 2. رسم ضغط الدم (Blood Pressure) - متغيران (systolic/diastolic)
    // 3. رسم سكر الدم (Glucose) - متغير واحد
    // 4. رسم نبضات القلب (Heart Rate) - مع خطوط الحدود الطبيعية
    // 5. رسم الأكسجين (SpO2) - مع خط الحد الطبيعي
    // 6. ✅ رسم درجة حرارة الجسم (Temperature) - مع خطوط الحدود الطبيعية
}

export default HealthCharts;