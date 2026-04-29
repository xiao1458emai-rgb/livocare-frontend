'use client'
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
import '../index.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// ✅ دالة مساعدة للحصول على ألوان الثيم (تمت إضافة temperatureColor)
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
    temperatureColor: '#f97316', // ✅ لون درجة الحرارة
});

function HealthCharts({ refreshKey, isArabic: propIsArabic }) {
    // ✅ استخدام isArabic من props مع إمكانية التحديث عبر الحدث
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);

    // ✅ الاستماع لتغييرات اللغة
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

    // ✅ تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    // ✅ الاستماع لتغييرات الثيم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ دالة جلب البيانات
    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/health_status/', {
                signal: abortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            
            let data = [];
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                data = response.data.results;
            } else if (response.data && typeof response.data === 'object') {
                data = Object.values(response.data).filter(item => item && typeof item === 'object');
            }
            
            const validData = data.filter(record => 
                record && 
                record.recorded_at && 
                (record.weight_kg !== null || 
                 record.systolic_pressure !== null || 
                 record.diastolic_pressure !== null ||
                 record.blood_glucose !== null ||
                 record.heart_rate !== null ||
                 record.spo2 !== null ||
                 record.body_temperature !== null) // ✅ إضافة درجة الحرارة
            );
            
            if (isMountedRef.current) {
                if (validData.length > 0) {
                    setHistory(validData);
                    console.log('📊 Health charts data loaded:', validData.length, 'records');
                } else {
                    setHistory([]);
                }
            }
            
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }
            console.error('Error fetching chart data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في تحميل البيانات' : '❌ Error loading data');
                setHistory([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic]);

    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshKey, fetchData]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // ✅ معالجة البيانات للرسوم البيانية (تمت إضافة درجة الحرارة)
    const processChartData = useCallback(() => {
        if (!history || history.length === 0) {
            return { dates: [], weights: [], systolic: [], diastolic: [], glucose: [], heartRate: [], spo2: [], temperatures: [] };
        }

        const sortedHistory = [...history].sort((a, b) => 
            new Date(a.recorded_at) - new Date(b.recorded_at)
        );

        const dates = sortedHistory.map(record => {
            try {
                return new Date(record.recorded_at).toLocaleDateString(
                    isArabic ? 'ar-EG' : 'en-US',
                    { month: 'short', day: 'numeric' }
                );
            } catch {
                return '—';
            }
        });
        
        const weights = sortedHistory.map(record => {
            const val = record.weight_kg;
            return (val !== null && val !== undefined && !isNaN(parseFloat(val))) ? parseFloat(val) : null;
        });
        
        const systolic = sortedHistory.map(record => {
            const val = record.systolic_pressure;
            return (val !== null && val !== undefined && !isNaN(parseInt(val))) ? parseInt(val) : null;
        });
        
        const diastolic = sortedHistory.map(record => {
            const val = record.diastolic_pressure;
            return (val !== null && val !== undefined && !isNaN(parseInt(val))) ? parseInt(val) : null;
        });

        const glucose = sortedHistory.map(record => {
            const val = record.blood_glucose;
            return (val !== null && val !== undefined && !isNaN(parseFloat(val))) ? parseFloat(val) : null;
        });

        const heartRate = sortedHistory.map(record => {
            const val = record.heart_rate;
            return (val !== null && val !== undefined && !isNaN(parseInt(val))) ? parseInt(val) : null;
        });

        const spo2 = sortedHistory.map(record => {
            const val = record.spo2;
            return (val !== null && val !== undefined && !isNaN(parseInt(val))) ? parseInt(val) : null;
        });

        // ✅ استخراج بيانات درجة الحرارة
        const temperatures = sortedHistory.map(record => {
            const val = record.body_temperature;
            return (val !== null && val !== undefined && !isNaN(parseFloat(val))) ? parseFloat(val) : null;
        });

        return { dates, weights, systolic, diastolic, glucose, heartRate, spo2, temperatures };
    }, [history, isArabic]);

    // ✅ خيارات الرسم البياني
    const getChartOptions = useCallback((min, max, yLabel = '', themeColors) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                rtl: isArabic,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    color: themeColors.textSecondary,
                    font: { size: 11, family: "'Inter', sans-serif" },
                    boxWidth: 10,
                }
            },
            tooltip: {
                rtl: isArabic,
                backgroundColor: themeColors.tooltipBg,
                titleColor: themeColors.textPrimary,
                bodyColor: themeColors.textSecondary,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        let value = context.raw;
                        if (value !== null && value !== undefined) {
                            label += ': ' + value;
                            if (yLabel) label += ' ' + yLabel;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: themeColors.gridColor,
                    drawBorder: true,
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    color: themeColors.textTertiary,
                    font: { size: 10 },
                }
            },
            y: {
                beginAtZero: yLabel !== '°C',
                grid: {
                    color: themeColors.gridColor,
                },
                ticks: {
                    color: themeColors.textTertiary,
                    stepSize: yLabel === 'BPM' ? 20 : (yLabel === 'SpO₂%' ? 5 : (yLabel === '°C' ? 0.5 : undefined)),
                    callback: function(value) {
                        return yLabel === '°C' ? value.toFixed(1) : value;
                    }
                },
                min: min,
                max: max,
                title: {
                    display: !!yLabel,
                    text: yLabel,
                    color: themeColors.textTertiary,
                    font: { size: 11, weight: '500' },
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        elements: {
            line: {
                tension: 0.4,
            },
            point: {
                radius: 4,
                hoverRadius: 6,
                hitRadius: 8,
            }
        },
    }), [isArabic]);

    // ✅ حساب النطاق الديناميكي
    const getDynamicRange = useCallback((data, padding = 0.1, defaultMin = 0, defaultMax = 100) => {
        const validData = data.filter(val => val !== null && !isNaN(val));
        if (validData.length === 0) return { min: defaultMin, max: defaultMax };
        
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const range = max - min;
        
        return {
            min: Math.max(0, min - range * padding),
            max: max + range * padding
        };
    }, []);

    // ✅ حساب إحصائيات البيانات
    const calculateStats = useCallback((data) => {
        const validData = data.filter(val => val !== null && !isNaN(val));
        if (validData.length === 0) return null;
        
        const sum = validData.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / validData.length * 10) / 10;
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const last = validData[validData.length - 1];
        const trend = validData.length > 1 ? last - validData[0] : 0;
        
        return { avg, min, max, last, trend };
    }, []);

    // ✅ حالة التحميل
    if (loading) {
        return (
            <div className={`charts-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحميل الرسوم البيانية...' : 'Loading charts...'}</p>
                </div>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error) {
        return (
            <div className={`charts-error ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <p>{error}</p>
                    <button onClick={fetchData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    const { dates, weights, systolic, diastolic, glucose, heartRate, spo2, temperatures } = processChartData();
    const themeColors = getThemeColors(darkMode);
    
    const hasWeightData = weights.some(w => w !== null);
    const hasBPData = systolic.some(s => s !== null) || diastolic.some(d => d !== null);
    const hasGlucoseData = glucose.some(g => g !== null);
    const hasHeartRateData = heartRate.some(h => h !== null);
    const hasSpO2Data = spo2.some(s => s !== null);
    const hasTemperatureData = temperatures.some(t => t !== null); // ✅ كشف وجود بيانات الحرارة

    // ✅ حساب الإحصائيات (تمت إضافة temperatureStats)
    const weightStats = calculateStats(weights);
    const glucoseStats = calculateStats(glucose);
    const heartRateStats = calculateStats(heartRate);
    const spo2Stats = calculateStats(spo2);
    const temperatureStats = calculateStats(temperatures); // ✅ إحصائيات درجة الحرارة
    
    const weightRange = getDynamicRange(weights);
    const glucoseRange = getDynamicRange(glucose);
    const heartRateRange = getDynamicRange(heartRate, 0.15, 40, 120);
    const spo2Range = getDynamicRange(spo2, 0.1, 85, 100);
    const temperatureRange = getDynamicRange(temperatures, 0.2, 35, 40); // ✅ نطاق درجة الحرارة
    
    const pressureMin = Math.min(
        ...systolic.filter(s => s !== null),
        ...diastolic.filter(d => d !== null),
        90
    );
    const pressureMax = Math.max(
        ...systolic.filter(s => s !== null),
        ...diastolic.filter(d => d !== null),
        140
    );
    const pressureRange = { min: Math.max(0, pressureMin - 10), max: pressureMax + 10 };

    // ✅ حالة عدم وجود بيانات كافية (تمت إضافة hasTemperatureData)
    if (!hasWeightData && !hasBPData && !hasGlucoseData && !hasHeartRateData && !hasSpO2Data && !hasTemperatureData) {
        return (
            <div className={`charts-empty ${darkMode ? 'dark-mode' : ''}`}>
                <div className="empty-content">
                    <div className="empty-icon">📊</div>
                    <h3>{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient Data'}</h3>
                    <p>{isArabic ? 'يلزم على الأقل قراءتان لعرض الرسوم البيانية' : 'At least 2 readings are required to display charts'}</p>
                    <p className="empty-hint">{isArabic ? 'أضف المزيد من القراءات الصحية' : 'Add more health readings'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`health-charts-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس القسم */}
            <div className="charts-header">
                <div className="header-title">
                    <span className="header-icon">📊</span>
                    <h2>{isArabic ? 'الرسوم البيانية' : 'Health Charts'}</h2>
                </div>
                <div className="header-stats">
                    <div className="stat-badge">
                        <span className="stat-icon">📝</span>
                        <span className="stat-value">{history.length}</span>
                        <span className="stat-label">{isArabic ? 'قراءة' : 'readings'}</span>
                    </div>
                    <div className="stat-badge">
                        <span className="stat-icon">📅</span>
                        <span className="stat-value">{new Set(dates).size}</span>
                        <span className="stat-label">{isArabic ? 'يوم' : 'days'}</span>
                    </div>
                    <button 
                        onClick={fetchData} 
                        disabled={loading}
                        className="refresh-charts-btn"
                        title={isArabic ? 'تحديث البيانات' : 'Refresh data'}
                    >
                        {loading ? '⏳' : '🔄'}
                    </button>
                </div>
            </div>

            {/* شبكة الرسوم البيانية */}
            <div className="charts-grid">
                {/* رسم الوزن */}
                {hasWeightData && (
                    <div className="chart-card weight-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">⚖️</span>
                                <h3>{isArabic ? 'تطور الوزن' : 'Weight Trend'}</h3>
                            </div>
                            {weightStats && (
                                <div className="chart-stats">
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط' : 'Avg'}</span>
                                        <span className="stat-value">{weightStats.avg}</span>
                                        <span className="stat-unit">kg</span>
                                    </div>
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'الآخر' : 'Last'}</span>
                                        <span className="stat-value">{weightStats.last}</span>
                                        <span className="stat-unit">kg</span>
                                    </div>
                                    {weightStats.trend !== 0 && (
                                        <div className={`chart-stat trend ${weightStats.trend > 0 ? 'up' : 'down'}`}>
                                            <span>{weightStats.trend > 0 ? '↑' : '↓'}</span>
                                            <span>{Math.abs(weightStats.trend)}</span>
                                            <span className="stat-unit">kg</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [{
                                        label: isArabic ? 'الوزن (كجم)' : 'Weight (kg)',
                                        data: weights,
                                        borderColor: themeColors.weightColor,
                                        backgroundColor: `${themeColors.weightColor}20`,
                                        borderWidth: 3,
                                        tension: 0.4,
                                        pointRadius: 5,
                                        pointHoverRadius: 7,
                                        pointBackgroundColor: themeColors.weightColor,
                                        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                        pointBorderWidth: 2,
                                        fill: true,
                                    }]
                                }} 
                                options={getChartOptions(weightRange.min, weightRange.max, 'kg', themeColors)}
                            />
                        </div>
                    </div>
                )}

                {/* رسم ضغط الدم */}
                {hasBPData && (
                    <div className="chart-card bp-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">❤️</span>
                                <h3>{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</h3>
                            </div>
                            <div className="chart-legend">
                                <div className="legend-dot" style={{ background: themeColors.systolicColor }}></div>
                                <span>{isArabic ? 'انقباضي' : 'Systolic'}</span>
                                <div className="legend-dot" style={{ background: themeColors.diastolicColor }}></div>
                                <span>{isArabic ? 'انبساطي' : 'Diastolic'}</span>
                            </div>
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'الانقباضي (mmHg)' : 'Systolic (mmHg)',
                                            data: systolic,
                                            borderColor: themeColors.systolicColor,
                                            backgroundColor: `${themeColors.systolicColor}20`,
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: themeColors.systolicColor,
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: false,
                                        },
                                        {
                                            label: isArabic ? 'الانبساطي (mmHg)' : 'Diastolic (mmHg)',
                                            data: diastolic,
                                            borderColor: themeColors.diastolicColor,
                                            backgroundColor: `${themeColors.diastolicColor}20`,
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: themeColors.diastolicColor,
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(pressureRange.min, pressureRange.max, 'mmHg', themeColors)}
                            />
                        </div>
                        <div className="chart-card-footer">
                            <div className="normal-range-info">
                                <span className="info-icon">ℹ️</span>
                                <span>{isArabic ? 'الضغط الطبيعي: 120/80' : 'Normal: 120/80 mmHg'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* رسم سكر الدم */}
                {hasGlucoseData && (
                    <div className="chart-card glucose-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">🩸</span>
                                <h3>{isArabic ? 'سكر الدم' : 'Blood Glucose'}</h3>
                            </div>
                            {glucoseStats && (
                                <div className="chart-stats">
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط' : 'Avg'}</span>
                                        <span className="stat-value">{glucoseStats.avg}</span>
                                        <span className="stat-unit">mg/dL</span>
                                    </div>
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'الآخر' : 'Last'}</span>
                                        <span className="stat-value">{glucoseStats.last}</span>
                                        <span className="stat-unit">mg/dL</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [{
                                        label: isArabic ? 'الجلوكوز (mg/dL)' : 'Glucose (mg/dL)',
                                        data: glucose,
                                        borderColor: themeColors.glucoseColor,
                                        backgroundColor: `${themeColors.glucoseColor}20`,
                                        borderWidth: 3,
                                        tension: 0.4,
                                        pointRadius: 5,
                                        pointHoverRadius: 7,
                                        pointBackgroundColor: themeColors.glucoseColor,
                                        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                        pointBorderWidth: 2,
                                        fill: true,
                                    }]
                                }} 
                                options={getChartOptions(glucoseRange.min, glucoseRange.max, 'mg/dL', themeColors)}
                            />
                        </div>
                        <div className="chart-card-footer">
                            <div className="normal-range-info">
                                <span className="info-icon">ℹ️</span>
                                <span>{isArabic ? 'السكر الطبيعي: 70-140 mg/dL' : 'Normal glucose: 70-140 mg/dL'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* رسم نبضات القلب */}
                {hasHeartRateData && (
                    <div className="chart-card heartrate-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">💓</span>
                                <h3>{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</h3>
                            </div>
                            {heartRateStats && (
                                <div className="chart-stats">
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط' : 'Avg'}</span>
                                        <span className="stat-value">{heartRateStats.avg}</span>
                                        <span className="stat-unit">BPM</span>
                                    </div>
                                    <div className={`chart-stat ${heartRateStats.avg > 100 ? 'warning' : heartRateStats.avg < 60 ? 'warning' : ''}`}>
                                        <span className="stat-label">{isArabic ? 'الحالة' : 'Status'}</span>
                                        <span className="stat-value">
                                            {heartRateStats.avg > 100 ? '↑' : heartRateStats.avg < 60 ? '↓' : '✓'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'معدل ضربات القلب (BPM)' : 'Heart Rate (BPM)',
                                            data: heartRate,
                                            borderColor: themeColors.heartRateColor,
                                            backgroundColor: `${themeColors.heartRateColor}20`,
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: themeColors.heartRateColor,
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: true,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأدنى الطبيعي' : 'Lower Normal',
                                            data: Array(dates.length).fill(60),
                                            borderColor: '#10b981',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأعلى الطبيعي' : 'Upper Normal',
                                            data: Array(dates.length).fill(100),
                                            borderColor: '#10b981',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(heartRateRange.min, heartRateRange.max, 'BPM', themeColors)}
                            />
                        </div>
                        <div className="chart-card-footer">
                            <div className="normal-range-info">
                                <span className="info-icon">ℹ️</span>
                                <span>{isArabic ? 'المعدل الطبيعي: 60-100 نبضة في الدقيقة' : 'Normal range: 60-100 BPM'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* رسم الأكسجين */}
                {hasSpO2Data && (
                    <div className="chart-card spo2-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">💨</span>
                                <h3>{isArabic ? 'نسبة الأكسجين' : 'Blood Oxygen'}</h3>
                            </div>
                            {spo2Stats && (
                                <div className="chart-stats">
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط' : 'Avg'}</span>
                                        <span className="stat-value">{spo2Stats.avg}</span>
                                        <span className="stat-unit">%</span>
                                    </div>
                                    <div className={`chart-stat ${spo2Stats.avg < 95 ? 'warning' : ''}`}>
                                        <span className="stat-label">{isArabic ? 'الحالة' : 'Status'}</span>
                                        <span className="stat-value">{spo2Stats.avg < 95 ? '⚠️' : '✓'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'نسبة الأكسجين (SpO₂%)' : 'Oxygen Level (SpO₂%)',
                                            data: spo2,
                                            borderColor: themeColors.spo2Color,
                                            backgroundColor: `${themeColors.spo2Color}20`,
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: themeColors.spo2Color,
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: true,
                                        },
                                        {
                                            label: isArabic ? 'الحد الطبيعي' : 'Normal Threshold',
                                            data: Array(dates.length).fill(95),
                                            borderColor: '#10b981',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(spo2Range.min, 100, 'SpO₂%', themeColors)}
                            />
                        </div>
                        <div className="chart-card-footer">
                            <div className="normal-range-info">
                                <span className="info-icon">ℹ️</span>
                                <span>{isArabic ? 'المعدل الطبيعي: 95% - 100%' : 'Normal range: 95% - 100%'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ رسم درجة حرارة الجسم */}
                {hasTemperatureData && (
                    <div className="chart-card temperature-card">
                        <div className="chart-card-header">
                            <div className="chart-title">
                                <span className="chart-icon">🌡️</span>
                                <h3>{isArabic ? 'درجة حرارة الجسم' : 'Body Temperature'}</h3>
                            </div>
                            {temperatureStats && (
                                <div className="chart-stats">
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط' : 'Avg'}</span>
                                        <span className="stat-value">{temperatureStats.avg.toFixed(1)}</span>
                                        <span className="stat-unit">°C</span>
                                    </div>
                                    <div className="chart-stat">
                                        <span className="stat-label">{isArabic ? 'الآخر' : 'Last'}</span>
                                        <span className="stat-value">{temperatureStats.last.toFixed(1)}</span>
                                        <span className="stat-unit">°C</span>
                                    </div>
                                    <div className={`chart-stat ${temperatureStats.avg > 37.5 ? 'warning' : temperatureStats.avg < 36.5 ? 'warning' : ''}`}>
                                        <span className="stat-label">{isArabic ? 'الحالة' : 'Status'}</span>
                                        <span className="stat-value">
                                            {temperatureStats.avg > 37.5 ? '⚠️' : temperatureStats.avg < 36.5 ? '⚠️' : '✓'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chart-wrapper">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'درجة الحرارة (°C)' : 'Temperature (°C)',
                                            data: temperatures,
                                            borderColor: themeColors.temperatureColor,
                                            backgroundColor: `${themeColors.temperatureColor}20`,
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: themeColors.temperatureColor,
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: true,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأدنى الطبيعي' : 'Lower Normal (36.5°C)',
                                            data: Array(dates.length).fill(36.5),
                                            borderColor: '#10b981',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأعلى الطبيعي' : 'Upper Normal (37.5°C)',
                                            data: Array(dates.length).fill(37.5),
                                            borderColor: '#10b981',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(temperatureRange.min, temperatureRange.max, '°C', themeColors)}
                            />
                        </div>
                        <div className="chart-card-footer">
                            <div className="normal-range-info">
                                <span className="info-icon">ℹ️</span>
                                <span>{isArabic ? 'المعدل الطبيعي: 36.5°C - 37.5°C' : 'Normal range: 36.5°C - 37.5°C'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
   /* ===========================================
   HealthCharts.css - الأنماط الداخلية فقط
   ✅ الرسوم البيانية الصحية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.health-charts-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
    transition: all 0.2s ease;
    margin: 1.5rem 0;
}

.dark-mode .health-charts-container {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس القسم ===== */
.charts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .charts-header {
    border-bottom-color: #334155;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.header-icon {
    font-size: 1.8rem;
}

.header-title h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .header-title h2 {
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.header-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.stat-badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 20px;
    font-size: 0.8rem;
}

.dark-mode .stat-badge {
    background: #0f172a;
}

.stat-badge .stat-icon {
    font-size: 0.9rem;
}

.stat-badge .stat-value {
    font-weight: 700;
    color: #6366f1;
}

.stat-badge .stat-label {
    color: var(--text-secondary, #64748b);
}

.refresh-charts-btn {
    width: 36px;
    height: 36px;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-charts-btn {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.refresh-charts-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    transform: rotate(180deg);
    border-color: transparent;
}

.refresh-charts-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== شبكة الرسوم البيانية ===== */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 1.5rem;
}

/* ===== بطاقات الرسوم البيانية ===== */
.chart-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 24px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s ease;
}

.dark-mode .chart-card {
    background: #0f172a;
    border-color: #334155;
}

.chart-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.dark-mode .chart-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

/* ألوان حواف البطاقات */
.weight-card:hover { border-top: 3px solid #3b82f6; }
.bp-card:hover { border-top: 3px solid #ef4444; }
.glucose-card:hover { border-top: 3px solid #10b981; }
.heartrate-card:hover { border-top: 3px solid #ec489a; }
.spo2-card:hover { border-top: 3px solid #06b6d4; }
.temperature-card:hover { border-top: 3px solid #f97316; }

/* ===== رأس البطاقة ===== */
.chart-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .chart-card-header {
    border-bottom-color: #334155;
}

.chart-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.chart-icon {
    font-size: 1.3rem;
}

.chart-title h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .chart-title h3 {
    color: #f1f5f9;
}

/* ===== وسائل الإيضاح والإحصائيات ===== */
.chart-legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
}

.chart-stats {
    display: flex;
    gap: 0.75rem;
}

.chart-stat {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: 0.7rem;
}

.chart-stat .stat-label {
    color: var(--text-tertiary, #94a3b8);
}

.chart-stat .stat-value {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .chart-stat .stat-value {
    color: #f1f5f9;
}

.chart-stat .stat-unit {
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.65rem;
}

.chart-stat.trend.up .stat-value {
    color: #ef4444;
}

.chart-stat.trend.down .stat-value {
    color: #10b981;
}

.chart-stat.warning .stat-value {
    color: #f59e0b;
}

/* ===== حاوية الرسم البياني ===== */
.chart-wrapper {
    height: 280px;
    position: relative;
}

/* ===== تذييل البطاقة ===== */
.chart-card-footer {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .chart-card-footer {
    border-top-color: #334155;
}

.normal-range-info {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: #10b981;
}

.info-icon {
    font-size: 0.8rem;
}

/* ===== حالات التحميل والخطأ والبيانات الفارغة ===== */
.charts-loading,
.charts-error,
.charts-empty {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 3rem;
    text-align: center;
    border: 1px solid var(--border-light, #eef2f6);
    margin: 1.5rem 0;
}

.dark-mode .charts-loading,
.dark-mode .charts-error,
.dark-mode .charts-empty {
    background: #1e293b;
    border-color: #334155;
}

.loading-spinner .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

.loading-spinner p {
    color: var(--text-secondary, #64748b);
}

.error-content .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.error-content p {
    color: #ef4444;
    margin-bottom: 1rem;
}

.retry-btn {
    padding: 0.5rem 1.25rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.empty-content .empty-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-content h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .empty-content h3 {
    color: #f1f5f9;
}

.empty-content p {
    color: var(--text-secondary, #64748b);
    margin: 0;
}

.empty-content .empty-hint {
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.75rem;
    margin-top: 0.5rem;
}

/* ===== أنيميشن ===== */
@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .header-title {
    flex-direction: row-reverse;
}

[dir="rtl"] .chart-title {
    flex-direction: row-reverse;
}

[dir="rtl"] .chart-legend {
    flex-direction: row-reverse;
}

[dir="rtl"] .chart-stats {
    flex-direction: row-reverse;
}

[dir="rtl"] .normal-range-info {
    flex-direction: row-reverse;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .chart-card:hover {
        transform: none;
    }
    
    .refresh-charts-btn:hover:not(:disabled) {
        transform: none;
    }
    
    .retry-btn:hover {
        transform: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .chart-card {
        border-width: 2px;
    }
    
    .weight-card:hover,
    .bp-card:hover,
    .glucose-card:hover,
    .heartrate-card:hover,
    .spo2-card:hover,
    .temperature-card:hover {
        border-top-width: 4px;
    }
    
    .stat-badge {
        border: 1px solid currentColor;
    }
}
            `}</style>
        </div>
    );
}

export default HealthCharts; 