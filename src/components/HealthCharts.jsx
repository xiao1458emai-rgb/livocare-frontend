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

// ✅ دالة مساعدة للحصول على ألوان الثيم
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
                 record.spo2 !== null)
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

    // ✅ معالجة البيانات للرسوم البيانية
    const processChartData = useCallback(() => {
        if (!history || history.length === 0) {
            return { dates: [], weights: [], systolic: [], diastolic: [], glucose: [], heartRate: [], spo2: [] };
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

        return { dates, weights, systolic, diastolic, glucose, heartRate, spo2 };
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
                beginAtZero: false,
                grid: {
                    color: themeColors.gridColor,
                },
                ticks: {
                    color: themeColors.textTertiary,
                    stepSize: yLabel === 'BPM' ? 20 : (yLabel === 'SpO₂%' ? 5 : undefined),
                    callback: function(value) {
                        return value;
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
        const avg = Math.round(sum / validData.length);
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

    const { dates, weights, systolic, diastolic, glucose, heartRate, spo2 } = processChartData();
    const themeColors = getThemeColors(darkMode);
    
    const hasWeightData = weights.some(w => w !== null);
    const hasBPData = systolic.some(s => s !== null) || diastolic.some(d => d !== null);
    const hasGlucoseData = glucose.some(g => g !== null);
    const hasHeartRateData = heartRate.some(h => h !== null);
    const hasSpO2Data = spo2.some(s => s !== null);

    // ✅ حالة عدم وجود بيانات كافية
    if (!hasWeightData && !hasBPData && !hasGlucoseData && !hasHeartRateData && !hasSpO2Data) {
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

    // ✅ حساب الإحصائيات
    const weightStats = calculateStats(weights);
    const glucoseStats = calculateStats(glucose);
    const heartRateStats = calculateStats(heartRate);
    const spo2Stats = calculateStats(spo2);
    
    const weightRange = getDynamicRange(weights);
    const glucoseRange = getDynamicRange(glucose);
    const heartRateRange = getDynamicRange(heartRate, 0.15, 40, 120);
    const spo2Range = getDynamicRange(spo2, 0.1, 85, 100);
    
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
            </div>

        </div>
    );
}

export default HealthCharts;