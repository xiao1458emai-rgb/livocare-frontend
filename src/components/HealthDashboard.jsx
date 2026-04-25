'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

function HealthDashboard({ refreshKey }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [latestReading, setLatestReading] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [crossInsights, setCrossInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState('');
    
    const [advancedInsights, setAdvancedInsights] = useState(null);
    const [loadingAdvanced, setLoadingAdvanced] = useState(false);
    const [advancedError, setAdvancedError] = useState('');
    
    const [lastRefreshed, setLastRefreshed] = useState(null);
    
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const insightsAbortControllerRef = useRef(null);
    const advancedAbortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    const isFetchingInsightsRef = useRef(false);
    const isFetchingAdvancedRef = useRef(false);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ جلب أحدث قراءة
    const fetchLatestReading = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        isFetchingRef.current = true;
        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError('');
        
        try {
            const response = await axiosInstance.get('/health_status/', {
                signal: abortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            
            let data = [];
            if (Array.isArray(response.data)) data = response.data;
            else if (response.data && Array.isArray(response.data.results)) data = response.data.results;
            
            if (data.length > 0) {
                const sortedData = [...data].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
                setLatestReading(sortedData[0]);
                setLastRefreshed(new Date());
            } else {
                setLatestReading(null);
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch latest health reading:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في جلب البيانات' : '❌ Error fetching data');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    // ✅ جلب الرؤى المتقاطعة
    const fetchCrossInsights = useCallback(async () => {
        if (isFetchingInsightsRef.current || !isMountedRef.current) return;
        if (insightsAbortControllerRef.current) insightsAbortControllerRef.current.abort();
        isFetchingInsightsRef.current = true;
        insightsAbortControllerRef.current = new AbortController();
        setLoadingInsights(true);
        setInsightsError('');
        
        try {
            const response = await axiosInstance.get('/cross-insights/', {
                signal: insightsAbortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            if (response.data.success) setCrossInsights(response.data.data);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch cross insights:', err);
            if (isMountedRef.current) {
                setInsightsError(isArabic ? '📊 تعذر تحميل الرؤى الذكية' : '📊 Failed to load smart insights');
            }
        } finally {
            if (isMountedRef.current) setLoadingInsights(false);
            isFetchingInsightsRef.current = false;
        }
    }, [isArabic]);

    // ✅ جلب التحليلات المتقدمة
    const fetchAdvancedInsights = useCallback(async () => {
        if (isFetchingAdvancedRef.current || !isMountedRef.current) return;
        if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        isFetchingAdvancedRef.current = true;
        advancedAbortControllerRef.current = new AbortController();
        setLoadingAdvanced(true);
        setAdvancedError('');
        
        try {
            const response = await axiosInstance.get('/advanced-insights/', {
                signal: advancedAbortControllerRef.current.signal,
                timeout: 10000
            });
            
            if (!isMountedRef.current) return;
            
            if (response.data && response.data.success && response.data.data) {
                setAdvancedInsights(response.data.data);
                console.log('✅ Advanced insights loaded');
            } else {
                setAdvancedError(response.data?.message || (isArabic ? '📉 لا توجد بيانات كافية للتحليل المتقدم' : '📉 Insufficient data for advanced analysis'));
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch advanced insights:', err);
            if (isMountedRef.current) {
                if (err.response?.status === 404) {
                    setAdvancedError(isArabic ? '🔧 ميزة التحليلات المتقدمة غير متوفرة حالياً' : '🔧 Advanced insights feature is currently unavailable');
                } else {
                    setAdvancedError(isArabic ? '❌ تعذر تحميل التحليلات المتقدمة' : '❌ Failed to load advanced insights');
                }
            }
        } finally {
            if (isMountedRef.current) setLoadingAdvanced(false);
            isFetchingAdvancedRef.current = false;
        }
    }, [isArabic]);

    // ✅ جلب جميع البيانات
    const refreshAllData = useCallback(() => {
        fetchLatestReading();
        fetchCrossInsights();
        fetchAdvancedInsights();
    }, [fetchLatestReading, fetchCrossInsights, fetchAdvancedInsights]);

    useEffect(() => {
        refreshAllData();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (insightsAbortControllerRef.current) insightsAbortControllerRef.current.abort();
            if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        };
    }, [refreshKey, refreshAllData]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (insightsAbortControllerRef.current) insightsAbortControllerRef.current.abort();
            if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        };
    }, []);

    // ✅ تنسيق التاريخ والوقت
    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return { date: '', time: '', full: '' };
        try {
            const date = new Date(dateString);
            const locale = isArabic ? 'ar-EG' : 'en-US';
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            return {
                date: date.toLocaleDateString(locale, dateOptions),
                time: date.toLocaleTimeString(locale, timeOptions),
                full: date.toLocaleString(locale, { ...dateOptions, ...timeOptions })
            };
        } catch (error) {
            return { date: '', time: '', full: '' };
        }
    }, [isArabic]);

    // ✅ تحليل الحالة الصحية
    const getReadingStatus = useCallback(() => {
        if (!latestReading) { 
            return { 
                status: 'no_data', 
                color: '#6b7280', 
                bgColor: '#f3f4f6', 
                icon: '📋', 
                message: isArabic ? 'لا توجد بيانات' : 'No data', 
                issues: [],
                score: 0,
                recommendations: []
            };
        }
        
        let issues = [];
        let recommendations = [];
        let score = 100;
        
        // تحليل الوزن
        if (latestReading.weight_kg) {
            if (latestReading.weight_kg > 100) { 
                issues.push({ type: 'weight', message: isArabic ? 'الوزن مرتفع جداً' : 'Very high weight', icon: '⚖️', severity: 'high', value: `${latestReading.weight_kg} kg` }); 
                score -= 25;
                recommendations.push(isArabic ? '⚖️ يُنصح باستشارة أخصائي تغذية لوضع خطة لخسارة الوزن' : '⚖️ Consult a nutritionist for a weight loss plan');
            } else if (latestReading.weight_kg > 85) { 
                issues.push({ type: 'weight', message: isArabic ? 'الوزن مرتفع' : 'High weight', icon: '⚖️', severity: 'medium', value: `${latestReading.weight_kg} kg` }); 
                score -= 15;
                recommendations.push(isArabic ? '🏃 زد من النشاط البدني وقلل من السعرات الحرارية' : '🏃 Increase physical activity and reduce calories');
            } else if (latestReading.weight_kg < 50 && latestReading.weight_kg > 0) { 
                issues.push({ type: 'weight', message: isArabic ? 'الوزن منخفض' : 'Low weight', icon: '⚖️', severity: 'medium', value: `${latestReading.weight_kg} kg` }); 
                score -= 15;
                recommendations.push(isArabic ? '🥑 زد من تناول الأطعمة الغنية بالبروتين والدهون الصحية' : '🥑 Increase protein and healthy fats intake');
            } else if (latestReading.weight_kg > 0) {
                issues.push({ type: 'weight', message: isArabic ? 'وزن صحي' : 'Healthy weight', icon: '✅', severity: 'good', value: `${latestReading.weight_kg} kg` });
            }
        }
        
        // تحليل ضغط الدم
        if (latestReading.systolic_pressure && latestReading.diastolic_pressure) {
            if (latestReading.systolic_pressure > 140) { 
                issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط الدم مرتفع (انقباضي)' : 'High systolic BP', icon: '⚠️', severity: 'high', value: `${latestReading.systolic_pressure}/${latestReading.diastolic_pressure} mmHg` }); 
                score -= 30;
                recommendations.push(isArabic ? '❤️ قلل من الملح، مارس الرياضة، واستشر الطبيب' : '❤️ Reduce salt, exercise, and consult a doctor');
            } else if (latestReading.systolic_pressure < 90 && latestReading.systolic_pressure > 0) { 
                issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط الدم منخفض' : 'Low blood pressure', icon: '⚠️', severity: 'medium', value: `${latestReading.systolic_pressure}/${latestReading.diastolic_pressure} mmHg` }); 
                score -= 20;
                recommendations.push(isArabic ? '💧 اشرب كميات كافية من الماء وتناول وجبات منتظمة' : '💧 Drink enough water and eat regular meals');
            } else if (latestReading.systolic_pressure > 0) {
                issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط دم طبيعي' : 'Normal BP', icon: '✅', severity: 'good', value: `${latestReading.systolic_pressure}/${latestReading.diastolic_pressure} mmHg` });
            }
        }
        
        // تحليل السكر
        if (latestReading.blood_glucose) {
            if (latestReading.blood_glucose > 140) { 
                issues.push({ type: 'glucose', message: isArabic ? 'سكر الدم مرتفع' : 'High blood sugar', icon: '⚠️', severity: 'high', value: `${latestReading.blood_glucose} mg/dL` }); 
                score -= 25;
                recommendations.push(isArabic ? '🍚 قلل من السكريات والكربوهيدرات البسيطة' : '🍚 Reduce sugars and simple carbohydrates');
            } else if (latestReading.blood_glucose < 70 && latestReading.blood_glucose > 0) { 
                issues.push({ type: 'glucose', message: isArabic ? 'سكر الدم منخفض' : 'Low blood sugar', icon: '⚠️', severity: 'high', value: `${latestReading.blood_glucose} mg/dL` }); 
                score -= 35;
                recommendations.push(isArabic ? '🍯 تناول وجبة صغيرة تحتوي على سكريات طبيعية' : '🍯 Eat a small meal with natural sugars');
            } else if (latestReading.blood_glucose > 0) {
                issues.push({ type: 'glucose', message: isArabic ? 'سكر دم طبيعي' : 'Normal blood sugar', icon: '✅', severity: 'good', value: `${latestReading.blood_glucose} mg/dL` });
            }
        }
        
        // تحليل معدل ضربات القلب (إذا كان متوفراً)
        if (latestReading.heart_rate) {
            if (latestReading.heart_rate > 100) {
                issues.push({ type: 'heart_rate', message: isArabic ? 'معدل ضربات القلب مرتفع' : 'High heart rate', icon: '💓', severity: 'medium', value: `${latestReading.heart_rate} BPM` });
                score -= 10;
                recommendations.push(isArabic ? '🧘 جرب تمارين التنفس العميق والاسترخاء' : '🧘 Try deep breathing and relaxation exercises');
            } else if (latestReading.heart_rate < 60 && latestReading.heart_rate > 0) {
                issues.push({ type: 'heart_rate', message: isArabic ? 'معدل ضربات القلب منخفض' : 'Low heart rate', icon: '💓', severity: 'low', value: `${latestReading.heart_rate} BPM` });
            } else if (latestReading.heart_rate > 0) {
                issues.push({ type: 'heart_rate', message: isArabic ? 'معدل ضربات قلب طبيعي' : 'Normal heart rate', icon: '✅', severity: 'good', value: `${latestReading.heart_rate} BPM` });
            }
        }
        
        // تحليل الأكسجين (إذا كان متوفراً)
        if (latestReading.spo2) {
            if (latestReading.spo2 < 90) {
                issues.push({ type: 'spo2', message: isArabic ? 'نسبة الأكسجين منخفضة جداً' : 'Very low oxygen', icon: '💨', severity: 'critical', value: `${latestReading.spo2}%` });
                score -= 20;
                recommendations.push(isArabic ? '🫁 استشر الطبيب فوراً هذا مؤشر خطر' : '🫁 Consult a doctor immediately - this is critical');
            } else if (latestReading.spo2 < 95) {
                issues.push({ type: 'spo2', message: isArabic ? 'نسبة الأكسجين منخفضة' : 'Low oxygen', icon: '💨', severity: 'medium', value: `${latestReading.spo2}%` });
                score -= 10;
                recommendations.push(isArabic ? '🌬️ مارس تمارين التنفس العميق وحسّن التهوية' : '🌬️ Practice deep breathing exercises');
            } else if (latestReading.spo2 > 0) {
                issues.push({ type: 'spo2', message: isArabic ? 'نسبة أكسجين ممتازة' : 'Excellent oxygen', icon: '✅', severity: 'good', value: `${latestReading.spo2}%` });
            }
        }
        
        score = Math.max(0, Math.min(100, score));
        
        // تحديد الحالة العامة
        let status, color, bgColor, icon, message;
        if (score < 50) {
            status = 'critical';
            color = '#dc2626';
            bgColor = '#fee2e2';
            icon = '🚨';
            message = isArabic ? 'حالة حرجة - يفضل مراجعة الطبيب' : 'Critical - Consult a doctor';
        } else if (score < 70) {
            status = 'warning';
            color = '#f59e0b';
            bgColor = '#fef3c7';
            icon = '⚠️';
            message = isArabic ? 'يحتاج انتباه - هناك قيماً مرتفعة' : 'Needs attention - Some values are high';
        } else if (score < 90) {
            status = 'good';
            color = '#3b82f6';
            bgColor = '#dbeafe';
            icon = '👍';
            message = isArabic ? 'حالة جيدة - استمر في العناية' : 'Good - Keep up the care';
        } else {
            status = 'excellent';
            color = '#10b981';
            bgColor = '#d1fae5';
            icon = '✅';
            message = isArabic ? 'ممتازة - صحتك في أفضل حال' : 'Excellent - You\'re in great health';
        }
        
        return { status, color, bgColor, icon, message, issues, score, recommendations: [...new Set(recommendations)] };
    }, [latestReading, isArabic]);

    const readingStatus = getReadingStatus();

    // ✅ تحويل آمن للقيم
    const toSafeString = useCallback((val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No');
        if (Array.isArray(val)) {
            const strings = val.map(item => toSafeString(item)).filter(s => s);
            return strings.join(' • ');
        }
        if (typeof val === 'object') {
            if (val.message && typeof val.message === 'string') return val.message;
            if (val.text && typeof val.text === 'string') return val.text;
            if (val.advice && typeof val.advice === 'string') return val.advice;
            return isArabic ? 'معلومات صحية' : 'Health information';
        }
        return String(val);
    }, [isArabic]);

    // ✅ عرض التحليلات المتقدمة
    const renderAdvancedInsights = useCallback(() => {
        if (loadingAdvanced) {
            return (
                <div className="insights-loading">
                    <div className="spinner-small"></div>
                    <p>{isArabic ? '🧠 جاري تحليل بياناتك المتقدمة...' : '🧠 Analyzing your data...'}</p>
                </div>
            );
        }
        
        if (advancedError) {
            return (
                <div className="insights-error">
                    <span className="error-icon">⚠️</span>
                    <p>{advancedError}</p>
                    <button onClick={fetchAdvancedInsights} className="retry-insight-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            );
        }
        
        if (!advancedInsights) {
            return (
                <div className="insights-empty">
                    <div className="empty-icon">📊</div>
                    <p>{isArabic ? 'سجل المزيد من البيانات للحصول على تحليلات متقدمة' : 'Log more data to get advanced insights'}</p>
                    <p className="empty-hint">{isArabic ? 'كلما زادت بياناتك، زادت دقة التحليلات' : 'More data means better insights'}</p>
                </div>
            );
        }

        return (
            <div className="advanced-insights-content">
                {/* استهلاك الطاقة */}
                {advancedInsights.energy_consumption && (
                    <div className="insight-card energy">
                        <div className="insight-card-header">
                            <span className="insight-icon">⚡</span>
                            <h4>{isArabic ? 'تحليل استهلاك الطاقة' : 'Energy Consumption'}</h4>
                        </div>
                        <div className="insight-stats-grid">
                            <div className="insight-stat">
                                <span className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</span>
                                <span className="stat-value">{advancedInsights.energy_consumption.weight || '-'} <span className="stat-unit">kg</span></span>
                            </div>
                            <div className="insight-stat">
                                <span className="stat-label">{isArabic ? 'معدل الأيض الأساسي' : 'BMR'}</span>
                                <span className="stat-value">{advancedInsights.energy_consumption.bmr || '-'} <span className="stat-unit">kcal</span></span>
                            </div>
                            <div className="insight-stat">
                                <span className="stat-label">{isArabic ? 'الحرق اليومي' : 'Daily Burn'}</span>
                                <span className="stat-value">{advancedInsights.energy_consumption.total_daily_burn || '-'} <span className="stat-unit">kcal</span></span>
                            </div>
                            <div className="insight-stat">
                                <span className="stat-label">{isArabic ? 'العجز اليومي' : 'Daily Deficit'}</span>
                                <span className={`stat-value ${(advancedInsights.energy_consumption.deficit || 0) > 0 ? 'positive' : (advancedInsights.energy_consumption.deficit || 0) < 0 ? 'negative' : ''}`}>
                                    {Math.abs(advancedInsights.energy_consumption.deficit || 0)} <span className="stat-unit">kcal</span>
                                    {(advancedInsights.energy_consumption.deficit || 0) > 0 ? ' 🔥' : (advancedInsights.energy_consumption.deficit || 0) < 0 ? ' 📈' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ضغط النبض */}
                {advancedInsights.pulse_pressure && (
                    <div className="insight-card pulse">
                        <div className="insight-card-header">
                            <span className="insight-icon">❤️</span>
                            <h4>{isArabic ? 'تحليل ضغط النبض' : 'Pulse Pressure Analysis'}</h4>
                        </div>
                        <div className="pulse-value">
                            <span className="systolic">{advancedInsights.pulse_pressure.systolic || '—'}</span>
                            <span className="separator">/</span>
                            <span className="diastolic">{advancedInsights.pulse_pressure.diastolic || '—'}</span>
                            <span className="unit">mmHg</span>
                        </div>
                        <div className="pulse-difference">
                            {isArabic ? 'فرق الضغط النبضي' : 'Pulse pressure difference'}: 
                            <strong> {(advancedInsights.pulse_pressure.systolic || 0) - (advancedInsights.pulse_pressure.diastolic || 0)} mmHg</strong>
                        </div>
                    </div>
                )}

                {/* التوصيات الشاملة */}
                {advancedInsights.holistic && advancedInsights.holistic.length > 0 && (
                    <div className="insight-card recommendations">
                        <div className="insight-card-header">
                            <span className="insight-icon">💡</span>
                            <h4>{isArabic ? 'توصيات شاملة' : 'Holistic Recommendations'}</h4>
                        </div>
                        <div className="recommendations-list-advanced">
                            {advancedInsights.holistic.slice(0, 4).map((rec, i) => (
                                <div key={i} className="recommendation-item">
                                    <span className="rec-bullet">•</span>
                                    <span className="rec-text">{toSafeString(rec)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [loadingAdvanced, advancedError, advancedInsights, isArabic, fetchAdvancedInsights, toSafeString]);

    // ✅ حالة التحميل
    if (loading && !latestReading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحميل البيانات...' : 'Loading data...'}</p>
                </div>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error && !latestReading) {
        return (
            <div className="dashboard-error">
                <div className="error-content">
                    <div className="error-icon">❌</div>
                    <p>{error}</p>
                    <button onClick={fetchLatestReading} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    const formattedDate = latestReading ? formatDateTime(latestReading.recorded_at) : { date: '', time: '' };

    return (
        <div className="health-dashboard-container">
            {/* ✅ رأس اللوحة */}
            <div className="dashboard-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">🩺</span>
                        {isArabic ? 'لوحة الصحة الذكية' : 'Smart Health Dashboard'}
                    </h2>
                    {readingStatus.score > 0 && (
                        <div className={`health-badge status-${readingStatus.status}`}>
                            <span className="badge-icon">{readingStatus.icon}</span>
                            <span className="badge-text">{readingStatus.message}</span>
                        </div>
                    )}
                </div>
                <div className="header-date">
                    <div className="date-info">
                        <span className="date-icon">📅</span>
                        <span>{formattedDate.date}</span>
                    </div>
                    <div className="time-info">
                        <span className="time-icon">⏰</span>
                        <span>{formattedDate.time}</span>
                    </div>
                </div>
            </div>

            {/* ✅ درجة الصحة */}
            {readingStatus.score > 0 && (
                <div className="health-score-section">
                    <div className="score-circle-container">
                        <div className="score-circle">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-light)" strokeWidth="8"/>
                                <circle 
                                    cx="60" cy="60" r="54" 
                                    fill="none" 
                                    stroke={readingStatus.color} 
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - readingStatus.score / 100)}`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 60 60)"
                                />
                                <text x="60" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor">
                                    {readingStatus.score}%
                                </text>
                            </svg>
                        </div>
                        <div className="score-label">
                            {isArabic ? 'درجة الصحة العامة' : 'Overall Health Score'}
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ بطاقات القراءات */}
            <div className="readings-grid">
                <div className="reading-card weight">
                    <div className="card-icon">⚖️</div>
                    <div className="card-content">
                        <div className="card-label">{isArabic ? 'الوزن' : 'Weight'}</div>
                        <div className="card-value">
                            {latestReading?.weight_kg ? `${latestReading.weight_kg.toFixed(1)}` : '—'}
                            <span className="card-unit">kg</span>
                        </div>
                    </div>
                </div>

                <div className="reading-card blood-pressure">
                    <div className="card-icon">❤️</div>
                    <div className="card-content">
                        <div className="card-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                        <div className="card-value">
                            {latestReading?.systolic_pressure && latestReading?.diastolic_pressure 
                                ? `${latestReading.systolic_pressure}/${latestReading.diastolic_pressure}`
                                : '—'}
                            <span className="card-unit">mmHg</span>
                        </div>
                    </div>
                </div>

                <div className="reading-card glucose">
                    <div className="card-icon">🩸</div>
                    <div className="card-content">
                        <div className="card-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</div>
                        <div className="card-value">
                            {latestReading?.blood_glucose ? `${latestReading.blood_glucose.toFixed(0)}` : '—'}
                            <span className="card-unit">mg/dL</span>
                        </div>
                    </div>
                </div>

                {latestReading?.heart_rate && (
                    <div className="reading-card heart-rate">
                        <div className="card-icon">💓</div>
                        <div className="card-content">
                            <div className="card-label">{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</div>
                            <div className="card-value">
                                {latestReading.heart_rate}
                                <span className="card-unit">BPM</span>
                            </div>
                        </div>
                    </div>
                )}

                {latestReading?.spo2 && (
                    <div className="reading-card spo2">
                        <div className="card-icon">💨</div>
                        <div className="card-content">
                            <div className="card-label">{isArabic ? 'نسبة الأكسجين' : 'Blood Oxygen'}</div>
                            <div className="card-value">
                                {latestReading.spo2}
                                <span className="card-unit">%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ التنبيهات الصحية */}
            {readingStatus.issues && readingStatus.issues.filter(i => i.severity === 'high' || i.severity === 'medium').length > 0 && (
                <div className="alerts-section">
                    <div className="section-header">
                        <span className="section-icon">⚠️</span>
                        <h3>{isArabic ? 'تنبيهات صحية' : 'Health Alerts'}</h3>
                    </div>
                    <div className="alerts-list">
                        {readingStatus.issues.filter(i => i.severity === 'high' || i.severity === 'medium').map((issue, index) => (
                            <div key={index} className={`alert-item severity-${issue.severity}`}>
                                <span className="alert-icon">{issue.icon}</span>
                                <div className="alert-content">
                                    <div className="alert-message">{issue.message}</div>
                                    {issue.value && <div className="alert-value">{issue.value}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ التوصيات */}
            {readingStatus.recommendations && readingStatus.recommendations.length > 0 && (
                <div className="recommendations-section">
                    <div className="section-header">
                        <span className="section-icon">💡</span>
                        <h3>{isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                    </div>
                    <div className="recommendations-list">
                        {readingStatus.recommendations.slice(0, 3).map((rec, index) => (
                            <div key={index} className="recommendation-item">
                                <span className="rec-number">{index + 1}</span>
                                <span className="rec-text">{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ التحليلات المتقدمة */}
            <div className="advanced-insights-section">
                <div className="section-header">
                    <span className="section-icon">🧠</span>
                    <h3>{isArabic ? 'التحليلات المتقدمة' : 'Advanced Insights'}</h3>
                </div>
                {renderAdvancedInsights()}
            </div>

            {/* ✅ الرؤى المتقاطعة */}
            <div className="cross-insights-section">
                <div className="section-header">
                    <span className="section-icon">🔗</span>
                    <h3>{isArabic ? 'الرؤى المتقاطعة' : 'Cross Insights'}</h3>
                </div>
                
                {loadingInsights && (
                    <div className="insights-loading">
                        <div className="spinner-small"></div>
                        <p>{isArabic ? 'جاري تحليل العلاقات بين بياناتك...' : 'Analyzing correlations...'}</p>
                    </div>
                )}
                
                {insightsError && (
                    <div className="insights-error">
                        <span>⚠️</span>
                        <p>{insightsError}</p>
                    </div>
                )}
                
                {crossInsights && !loadingInsights && (
                    <div className="cross-insights-content">
                        <div className="insight-stats">
                            <div className="stat">
                                <span className="stat-value">{crossInsights.correlations_count || 0}</span>
                                <span className="stat-label">{isArabic ? 'علاقة مترابطة' : 'Correlations'}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{crossInsights.data_points || 0}</span>
                                <span className="stat-label">{isArabic ? 'نقطة بيانات' : 'Data points'}</span>
                            </div>
                        </div>
                        <p className="insight-message">
                            {isArabic 
                                ? `📊 تم تحليل ${crossInsights.correlations_count || 0} علاقة بين مختلف القياسات الصحية`
                                : `📊 Analyzed ${crossInsights.correlations_count || 0} correlations between health metrics`}
                        </p>
                    </div>
                )}
            </div>

            {/* ✅ أزرار الإجراءات */}
            <div className="dashboard-actions">
                <button onClick={refreshAllData} className="refresh-all-btn" disabled={loading}>
                    {loading ? '⏳' : '🔄'} {isArabic ? 'تحديث الكل' : 'Refresh All'}
                </button>
                {lastRefreshed && (
                    <div className="last-refreshed">
                        {isArabic ? 'آخر تحديث' : 'Last updated'}: {lastRefreshed.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                    </div>
                )}
            </div>
        </div>
    );
}

export default HealthDashboard;