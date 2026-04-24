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

    // تحميل إعدادات الوضع المظلم - مرة واحدة فقط
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ دالة جلب البيانات - مع useCallback لمنع إعادة الإنشاء
    const fetchData = useCallback(async () => {
        // إلغاء الطلب السابق إذا كان قيد التنفيذ
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // إنشاء AbortController جديد
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/health_status/', {
                signal: abortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            
            // ✅ التحقق الصحيح من البيانات
            let data = [];
            
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                data = response.data.results;
            } else if (response.data && typeof response.data === 'object') {
                data = Object.values(response.data).filter(item => item && typeof item === 'object');
            }
            
            // ✅ تصفية البيانات الصالحة فقط - تشمل جميع القياسات بما فيها القلب والأكسجين
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
                setError(isArabic ? 'خطأ في تحميل البيانات' : 'Error loading data');
                setHistory([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic]);

    // ✅ جلب البيانات عند التغيير
    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshKey, fetchData]);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const processChartData = () => {
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
    };

    const getChartOptions = (min, max, yLabel = '') => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                rtl: isArabic,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    color: darkMode ? '#f8fafc' : '#2c3e50',
                    font: { size: 11 }
                }
            },
            tooltip: {
                rtl: isArabic,
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                titleColor: darkMode ? '#f8fafc' : '#ffffff',
                bodyColor: darkMode ? '#cbd5e1' : '#ffffff',
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        let value = context.raw;
                        if (value !== null) {
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
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    font: { size: 10 }
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    stepSize: yLabel === 'BPM' ? 20 : (yLabel === 'SpO₂%' ? 5 : undefined)
                },
                min: min,
                max: max,
                title: {
                    display: !!yLabel,
                    text: yLabel,
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    font: { size: 11 }
                }
            }
        },
    });

    const getDynamicRange = (data, padding = 0.1, defaultMin = 0, defaultMax = 100) => {
        const validData = data.filter(val => val !== null && !isNaN(val));
        if (validData.length === 0) return { min: defaultMin, max: defaultMax };
        
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const range = max - min;
        
        return {
            min: Math.max(0, min - range * padding),
            max: max + range * padding
        };
    };

    const getHeartRateRange = (data) => {
        const validData = data.filter(val => val !== null && !isNaN(val));
        if (validData.length === 0) return { min: 40, max: 120 };
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        return { min: Math.max(30, min - 10), max: max + 10 };
    };

    const getSpO2Range = (data) => {
        const validData = data.filter(val => val !== null && !isNaN(val));
        if (validData.length === 0) return { min: 85, max: 100 };
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        return { min: Math.max(70, min - 5), max: Math.min(100, max + 5) };
    };

    if (loading) {
        return (
            <div className={`loading-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{isArabic ? 'جاري تحميل الرسوم البيانية...' : 'Loading charts...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`error-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button onClick={fetchData} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    if (!history || history.length < 2) {
        return (
            <div className={`insufficient-data ${darkMode ? 'dark-mode' : ''}`}>
                <div className="data-icon">📊</div>
                <h3>{isArabic ? 'بيانات غير كافية' : 'Insufficient Data'}</h3>
                <p>{isArabic ? 'يلزم على الأقل قراءتان لعرض الرسوم البيانية' : 'At least 2 readings are required to display charts'}</p>
                <p className="hint">{isArabic ? 'أضف المزيد من القراءات الصحية' : 'Add more health readings'}</p>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    const { dates, weights, systolic, diastolic, glucose, heartRate, spo2 } = processChartData();
    
    const hasWeightData = weights.some(w => w !== null);
    const hasBPData = systolic.some(s => s !== null) || diastolic.some(d => d !== null);
    const hasGlucoseData = glucose.some(g => g !== null);
    const hasHeartRateData = heartRate.some(h => h !== null);
    const hasSpO2Data = spo2.some(s => s !== null);

    if (!hasWeightData && !hasBPData && !hasGlucoseData && !hasHeartRateData && !hasSpO2Data) {
        return (
            <div className={`insufficient-data ${darkMode ? 'dark-mode' : ''}`}>
                <div className="data-icon">📊</div>
                <h3>{isArabic ? 'لا توجد بيانات صالحة' : 'No Valid Data'}</h3>
                <p>{isArabic ? 'لا توجد بيانات صحية صالحة لعرضها' : 'No valid health data to display'}</p>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    const weightRange = getDynamicRange(weights);
    const pressureRange = getDynamicRange([...systolic, ...diastolic]);
    const glucoseRange = getDynamicRange(glucose);
    const heartRateRange = getHeartRateRange(heartRate);
    const spo2Range = getSpO2Range(spo2);

    const validHeartRates = heartRate.filter(h => h !== null);
    const validSpO2 = spo2.filter(s => s !== null);
    
    const avgHeartRate = validHeartRates.length > 0 
        ? Math.round(validHeartRates.reduce((a, b) => a + b, 0) / validHeartRates.length) 
        : null;
    const avgSpO2 = validSpO2.length > 0 
        ? Math.round(validSpO2.reduce((a, b) => a + b, 0) / validSpO2.length) 
        : null;

    return (
        <div className={`health-charts-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="charts-header">
                <div className="header-main">
                    <h2>
                        <span className="header-icon">📊</span>
                        {isArabic ? 'الرسوم البيانية' : 'Health Charts'}
                    </h2>
                    <div className="charts-controls">
                        <button 
                            onClick={fetchData} 
                            disabled={loading}
                            className={`refresh-btn ${loading ? 'loading' : ''}`}
                        >
                            {loading ? '⏳' : '🔄'} {isArabic ? 'تحديث' : 'Refresh'}
                        </button>
                        {/* ✅ تم إزالة زر اللغة من هنا */}
                    </div>
                </div>
                <div className="charts-stats">
                    <div className="stat">
                        <span className="stat-icon">📝</span>
                        <span className="stat-label">{isArabic ? 'قراءة' : 'Reading'}</span>
                        <span className="stat-value">{history.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-icon">📅</span>
                        <span className="stat-label">{isArabic ? 'يوم' : 'Day'}</span>
                        <span className="stat-value">{new Set(dates).size}</span>
                    </div>
                    {avgHeartRate && (
                        <div className="stat">
                            <span className="stat-icon">❤️</span>
                            <span className="stat-label">{isArabic ? 'متوسط النبض' : 'Avg Heart Rate'}</span>
                            <span className="stat-value">{avgHeartRate}</span>
                        </div>
                    )}
                    {avgSpO2 && (
                        <div className="stat">
                            <span className="stat-icon">💨</span>
                            <span className="stat-label">{isArabic ? 'متوسط الأكسجين' : 'Avg SpO₂'}</span>
                            <span className="stat-value">{avgSpO2}%</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="charts-grid">
                {/* الرسم البياني للوزن */}
                {hasWeightData && (
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">⚖️</span>
                                {isArabic ? 'تطور الوزن' : 'Weight Trend'}
                            </h3>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [{
                                        label: isArabic ? 'الوزن (كجم)' : 'Weight (kg)',
                                        data: weights,
                                        borderColor: '#3b82f6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderWidth: 3,
                                        tension: 0.4,
                                        pointRadius: 5,
                                        pointHoverRadius: 7,
                                        pointBackgroundColor: '#3b82f6',
                                        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                        pointBorderWidth: 2,
                                        fill: true,
                                    }]
                                }} 
                                options={getChartOptions(weightRange.min, weightRange.max, 'kg')}
                            />
                        </div>
                    </div>
                )}

                {/* الرسم البياني لضغط الدم */}
                {hasBPData && (
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">❤️</span>
                                {isArabic ? 'ضغط الدم' : 'Blood Pressure'}
                            </h3>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'الانقباضي (mmHg)' : 'Systolic (mmHg)',
                                            data: systolic,
                                            borderColor: '#ef4444',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: '#ef4444',
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: false,
                                        },
                                        {
                                            label: isArabic ? 'الانبساطي (mmHg)' : 'Diastolic (mmHg)',
                                            data: diastolic,
                                            borderColor: '#8b5cf6',
                                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: '#8b5cf6',
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(pressureRange.min, pressureRange.max, 'mmHg')}
                            />
                        </div>
                    </div>
                )}

                {/* الرسم البياني للجلوكوز */}
                {hasGlucoseData && (
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">🩸</span>
                                {isArabic ? 'سكر الدم' : 'Blood Glucose'}
                            </h3>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [{
                                        label: isArabic ? 'الجلوكوز (mg/dL)' : 'Glucose (mg/dL)',
                                        data: glucose,
                                        borderColor: '#10b981',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderWidth: 3,
                                        tension: 0.4,
                                        pointRadius: 5,
                                        pointHoverRadius: 7,
                                        pointBackgroundColor: '#10b981',
                                        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                        pointBorderWidth: 2,
                                        fill: true,
                                    }]
                                }} 
                                options={getChartOptions(glucoseRange.min, glucoseRange.max, 'mg/dL')}
                            />
                        </div>
                    </div>
                )}

                {/* ✅ الرسم البياني لمعدل ضربات القلب */}
                {hasHeartRateData && (
                    <div className="chart-card heart-rate-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">❤️</span>
                                {isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}
                            </h3>
                            <div className="chart-legend">
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#ec489a' }}></div>
                                    <span>{isArabic ? 'النبض (BPM)' : 'Heart Rate (BPM)'}</span>
                                </div>
                                <div className="legend-item normal-range">
                                    <div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }}></div>
                                    <span>{isArabic ? 'المعدل الطبيعي (60-100)' : 'Normal Range (60-100)'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'معدل ضربات القلب (BPM)' : 'Heart Rate (BPM)',
                                            data: heartRate,
                                            borderColor: '#ec489a',
                                            backgroundColor: 'rgba(236, 72, 153, 0.1)',
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: '#ec489a',
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: true,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأدنى الطبيعي' : 'Lower Normal Limit',
                                            data: Array(dates.length).fill(60),
                                            borderColor: 'rgba(16, 185, 129, 0.5)',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        },
                                        {
                                            label: isArabic ? 'الحد الأعلى الطبيعي' : 'Upper Normal Limit',
                                            data: Array(dates.length).fill(100),
                                            borderColor: 'rgba(16, 185, 129, 0.5)',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(heartRateRange.min, heartRateRange.max, 'BPM')}
                            />
                        </div>
                        <div className="chart-footer">
                            {avgHeartRate && (
                                <div className="chart-stat">
                                    {isArabic ? 'المتوسط' : 'Average'}: {avgHeartRate} BPM
                                    {avgHeartRate > 100 && <span className="warning"> ⚠️ {isArabic ? 'مرتفع' : 'High'}</span>}
                                    {avgHeartRate < 60 && <span className="warning"> ⚠️ {isArabic ? 'منخفض' : 'Low'}</span>}
                                </div>
                            )}
                            <div className="chart-stat">
                                {isArabic ? 'المعدل الطبيعي: 60-100 نبضة في الدقيقة' : 'Normal range: 60-100 beats per minute'}
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ الرسم البياني لنسبة الأكسجين في الدم */}
                {hasSpO2Data && (
                    <div className="chart-card spo2-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">💨</span>
                                {isArabic ? 'نسبة الأكسجين في الدم' : 'Blood Oxygen Level'}
                            </h3>
                            <div className="chart-legend">
                                <div className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: '#06b6d4' }}></div>
                                    <span>{isArabic ? 'تشبع الأكسجين (SpO₂%)' : 'Oxygen Saturation (SpO₂%)'}</span>
                                </div>
                                <div className="legend-item normal-range">
                                    <div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }}></div>
                                    <span>{isArabic ? 'المعدل الطبيعي (≥95%)' : 'Normal Range (≥95%)'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: dates,
                                    datasets: [
                                        {
                                            label: isArabic ? 'نسبة الأكسجين (SpO₂%)' : 'Oxygen Level (SpO₂%)',
                                            data: spo2,
                                            borderColor: '#06b6d4',
                                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                                            borderWidth: 3,
                                            tension: 0.4,
                                            pointRadius: 5,
                                            pointHoverRadius: 7,
                                            pointBackgroundColor: '#06b6d4',
                                            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                                            pointBorderWidth: 2,
                                            fill: true,
                                        },
                                        {
                                            label: isArabic ? 'الحد الطبيعي' : 'Normal Threshold',
                                            data: Array(dates.length).fill(95),
                                            borderColor: 'rgba(16, 185, 129, 0.5)',
                                            borderWidth: 2,
                                            borderDash: [5, 5],
                                            pointRadius: 0,
                                            fill: false,
                                        }
                                    ]
                                }} 
                                options={getChartOptions(spo2Range.min, 100, 'SpO₂%')}
                            />
                        </div>
                        <div className="chart-footer">
                            {avgSpO2 && (
                                <div className="chart-stat">
                                    {isArabic ? 'المتوسط' : 'Average'}: {avgSpO2}%
                                    {avgSpO2 < 95 && <span className="warning"> ⚠️ {isArabic ? 'منخفض' : 'Low'}</span>}
                                </div>
                            )}
                            <div className="chart-stat">
                                {isArabic ? 'المعدل الطبيعي: 95% - 100%' : 'Normal range: 95% - 100%'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .health-charts-container {
                    background: var(--card-bg);
                    border-radius: 28px;
                    padding: 2rem;
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-xl);
                    margin-top: 2rem;
                    transition: all var(--transition-medium);
                }

                .charts-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 2px solid var(--border-light);
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .header-main {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    flex: 1;
                }

                .charts-header h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.6rem;
                    font-weight: 700;
                }

                .header-icon {
                    font-size: 2rem;
                }

                .charts-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                /* ✅ تم إزالة .lang-btn styles */

                .refresh-btn {
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-weight: 500;
                }

                .refresh-btn:hover:not(:disabled) {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .refresh-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .charts-stats {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--secondary-bg);
                    padding: 0.5rem 1rem;
                    border-radius: 50px;
                    border: 1px solid var(--border-light);
                }

                .stat-icon {
                    font-size: 1.1rem;
                }

                .stat-label {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }

                .stat-value {
                    color: var(--primary-color);
                    font-weight: 700;
                    font-size: 1rem;
                }

                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                    gap: 2rem;
                }

                .chart-card {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                    position: relative;
                    overflow: hidden;
                }

                .chart-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--primary-color), var(--success-color));
                    transform: translateX(-100%);
                    transition: transform var(--transition-medium);
                }

                .chart-card:hover::before {
                    transform: translateX(0);
                }

                .chart-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary-color);
                }

                .heart-rate-card {
                    border-top: 3px solid var(--heart-color);
                }

                .spo2-card {
                    border-top: 3px solid var(--spo2-color);
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }

                .chart-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    font-weight: 600;
                }

                .chart-icon {
                    font-size: 1.4rem;
                }

                .chart-legend {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    padding: 0.25rem 0.5rem;
                    background: var(--card-bg);
                    border-radius: 20px;
                }

                .legend-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 3px;
                }

                .chart-container {
                    height: 280px;
                    margin: 1rem 0;
                    position: relative;
                }

                .chart-footer {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-light);
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .chart-stat {
                    color: var(--text-tertiary);
                    font-size: 0.75rem;
                    background: var(--card-bg);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                }

                .chart-stat .warning {
                    color: var(--warning-color);
                    font-weight: 500;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    background: var(--card-bg);
                    border-radius: 28px;
                    border: 1px solid var(--border-light);
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid var(--border-light);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    background: var(--card-bg);
                    border-radius: 28px;
                    border: 1px solid var(--border-light);
                    text-align: center;
                    padding: 2rem;
                }

                .error-icon {
                    font-size: 3.5rem;
                    margin-bottom: 1rem;
                }

                .error-container p {
                    color: var(--error-color);
                    margin-bottom: 1.5rem;
                }

                .retry-btn {
                    padding: 0.6rem 1.5rem;
                    background: var(--error-color);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .insufficient-data {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    background: var(--card-bg);
                    border-radius: 28px;
                    border: 1px solid var(--border-light);
                    text-align: center;
                    padding: 2rem;
                }

                .data-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .insufficient-data h3 {
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                }

                .insufficient-data p {
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .insufficient-data .hint {
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                    margin-top: 0.5rem;
                }

                [dir="rtl"] .charts-header {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .stat {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .chart-header {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .legend-item {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .chart-footer {
                    flex-direction: row-reverse;
                }

                @media (max-width: 1024px) {
                    .charts-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                    
                    .chart-container {
                        height: 260px;
                    }
                }

                @media (max-width: 768px) {
                    .health-charts-container {
                        padding: 1.25rem;
                        border-radius: 20px;
                    }

                    .charts-header h2 {
                        font-size: 1.3rem;
                    }

                    .charts-controls {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .refresh-btn {
                        width: 100%;
                        justify-content: center;
                    }

                    .chart-card {
                        padding: 1.25rem;
                    }

                    .chart-container {
                        height: 220px;
                    }
                }

                @media (max-width: 480px) {
                    .health-charts-container {
                        padding: 1rem;
                    }

                    .charts-header h2 {
                        font-size: 1.2rem;
                    }

                    .chart-card {
                        padding: 1rem;
                    }

                    .chart-container {
                        height: 180px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .spinner {
                        animation: none;
                    }
                    
                    .chart-card::before {
                        transition: none;
                    }
                    
                    .chart-card:hover {
                        transform: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default HealthCharts;