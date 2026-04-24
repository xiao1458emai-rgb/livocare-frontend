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
    
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const insightsAbortControllerRef = useRef(null);
    const advancedAbortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    const isFetchingInsightsRef = useRef(false);
    const isFetchingAdvancedRef = useRef(false);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // تطبيق اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // جلب أحدث قراءة
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
            } else setLatestReading(null);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch latest health reading:', err);
            if (isMountedRef.current) setError(isArabic ? 'خطأ في جلب البيانات' : 'Error fetching data');
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    // جلب الرؤى المتقاطعة
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
            if (isMountedRef.current) setInsightsError(isArabic ? 'تعذر تحميل الرؤى الذكية' : 'Failed to load smart insights');
        } finally {
            if (isMountedRef.current) setLoadingInsights(false);
            isFetchingInsightsRef.current = false;
        }
    }, [isArabic]);

    // جلب التحليلات المتقدمة
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
                setAdvancedError(response.data?.message || (isArabic ? 'لا توجد بيانات كافية للتحليل المتقدم' : 'Insufficient data for advanced analysis'));
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch advanced insights:', err);
            if (isMountedRef.current) {
                if (err.response?.status === 404) setAdvancedError(isArabic ? 'ميزة التحليلات المتقدمة غير متوفرة حالياً' : 'Advanced insights feature is currently unavailable');
                else setAdvancedError(isArabic ? 'تعذر تحميل التحليلات المتقدمة' : 'Failed to load advanced insights');
            }
        } finally {
            if (isMountedRef.current) setLoadingAdvanced(false);
            isFetchingAdvancedRef.current = false;
        }
    }, [isArabic]);

    useEffect(() => {
        fetchLatestReading();
        fetchCrossInsights();
        fetchAdvancedInsights();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (insightsAbortControllerRef.current) insightsAbortControllerRef.current.abort();
            if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        };
    }, [refreshKey, fetchLatestReading, fetchCrossInsights, fetchAdvancedInsights]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (insightsAbortControllerRef.current) insightsAbortControllerRef.current.abort();
            if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        };
    }, []);

    const formatDateTime = (dateString) => {
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
    };

    // ✅ تحسين تحليل الحالة
    const getReadingStatus = () => {
        if (!latestReading) return { 
            status: 'no_data', 
            color: '#6b7280', 
            bgColor: '#f3f4f6', 
            icon: '📋', 
            message: isArabic ? 'لا توجد بيانات' : 'No data', 
            issues: [],
            score: 0
        };
        
        let issues = [];
        let score = 100;
        
        // تحليل الوزن
        if (latestReading.weight_kg > 100) { 
            issues.push({ type: 'weight', message: isArabic ? 'الوزن مرتفع' : 'High weight', icon: '⚖️', severity: 'high' }); 
            score -= 20;
        } else if (latestReading.weight_kg < 50 && latestReading.weight_kg > 0) { 
            issues.push({ type: 'weight', message: isArabic ? 'الوزن منخفض' : 'Low weight', icon: '⚖️', severity: 'medium' }); 
            score -= 15;
        } else if (latestReading.weight_kg > 0) {
            issues.push({ type: 'weight', message: isArabic ? 'وزن طبيعي' : 'Normal weight', icon: '✅', severity: 'good' });
        }
        
        // تحليل ضغط الدم
        if (latestReading.systolic_pressure > 140) { 
            issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط الدم مرتفع' : 'High blood pressure', icon: '⚠️', severity: 'high' }); 
            score -= 30;
        } else if (latestReading.systolic_pressure < 90 && latestReading.systolic_pressure > 0) { 
            issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط الدم منخفض' : 'Low blood pressure', icon: '⚠️', severity: 'medium' }); 
            score -= 20;
        } else if (latestReading.systolic_pressure > 0) {
            issues.push({ type: 'blood_pressure', message: isArabic ? 'ضغط دم طبيعي' : 'Normal blood pressure', icon: '✅', severity: 'good' });
        }
        
        // تحليل السكر
        if (latestReading.blood_glucose > 140) { 
            issues.push({ type: 'glucose', message: isArabic ? 'سكر الدم مرتفع' : 'High blood sugar', icon: '⚠️', severity: 'high' }); 
            score -= 25;
        } else if (latestReading.blood_glucose < 70 && latestReading.blood_glucose > 0) { 
            issues.push({ type: 'glucose', message: isArabic ? 'سكر الدم منخفض' : 'Low blood sugar', icon: '⚠️', severity: 'high' }); 
            score -= 35;
        } else if (latestReading.blood_glucose > 0) {
            issues.push({ type: 'glucose', message: isArabic ? 'سكر دم طبيعي' : 'Normal blood sugar', icon: '✅', severity: 'good' });
        }
        
        score = Math.max(0, Math.min(100, score));
        
        if (score < 50) {
            return { status: 'critical', color: '#dc2626', bgColor: '#fee2e2', icon: '🚨', message: isArabic ? 'حالة حرجة' : 'Critical', issues, score };
        } else if (score < 70) {
            return { status: 'warning', color: '#f59e0b', bgColor: '#fef3c7', icon: '⚠️', message: isArabic ? 'يحتاج انتباه' : 'Needs attention', issues, score };
        } else if (score < 90) {
            return { status: 'good', color: '#3b82f6', bgColor: '#dbeafe', icon: '👍', message: isArabic ? 'جيدة' : 'Good', issues, score };
        }
        return { status: 'excellent', color: '#10b981', bgColor: '#d1fae5', icon: '✅', message: isArabic ? 'ممتازة' : 'Excellent', issues, score };
    };

    const readingStatus = getReadingStatus();

    const toSafeString = (val) => {
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
    };

    // ✅ عرض التحليلات المتقدمة (مبسط)
    const renderAdvancedInsights = () => {
        if (loadingAdvanced) {
            return (
                <div className="analytics-loading" style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل بياناتك المتقدمة...' : 'Analyzing your data...'}</p>
                </div>
            );
        }
        if (advancedError) {
            return (
                <div className="analytics-error">
                    <span>⚠️</span>
                    <p>{advancedError}</p>
                    <button onClick={fetchAdvancedInsights} className="type-btn">🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
                </div>
            );
        }
        if (!advancedInsights) {
            return (
                <div className="analytics-empty">
                    <div className="empty-icon">🧠</div>
                    <p>{isArabic ? 'سجل المزيد من البيانات للحصول على تحليلات متقدمة' : 'Log more data to get advanced insights'}</p>
                </div>
            );
        }

        return (
            <div className="advanced-insights-content">
                {advancedInsights.energy_consumption && (
                    <div className="insight-card">
                        <div className="insight-icon">⚡</div>
                        <div className="insight-content">
                            <h3>{isArabic ? 'تحليل استهلاك الطاقة' : 'Energy Consumption'}</h3>
                            <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                <div className="analytics-stat-card">
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</div>
                                        <div className="stat-value">{advancedInsights.energy_consumption.weight || '-'} kg</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'معدل الأيض' : 'BMR'}</div>
                                        <div className="stat-value">{advancedInsights.energy_consumption.bmr || '-'} kcal</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'الحرق اليومي' : 'Daily Burn'}</div>
                                        <div className="stat-value">{advancedInsights.energy_consumption.total_daily_burn || '-'} kcal</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'العجز اليومي' : 'Daily Deficit'}</div>
                                        <div className="stat-value">{advancedInsights.energy_consumption.deficit || 0} kcal</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {advancedInsights.pulse_pressure && (
                    <div className="insight-card">
                        <div className="insight-icon">❤️</div>
                        <div className="insight-content">
                            <h3>{isArabic ? 'تحليل ضغط النبض' : 'Pulse Pressure'}</h3>
                            <div className="stat-value" style={{ fontSize: '2rem' }}>
                                {advancedInsights.pulse_pressure.systolic || '—'} / {advancedInsights.pulse_pressure.diastolic || '—'} mmHg
                            </div>
                        </div>
                    </div>
                )}

                {advancedInsights.holistic && advancedInsights.holistic.length > 0 && (
                    <div className="recommendations-section">
                        <h3>💡 {isArabic ? 'توصيات شاملة' : 'Recommendations'}</h3>
                        <div className="recommendations-list">
                            {advancedInsights.holistic.slice(0, 3).map((rec, i) => (
                                <div key={i} className="recommendation-card">
                                    <p className="rec-message">{toSafeString(rec)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <div className="empty-icon">❌</div>
                    <p>{error}</p>
                    <button onClick={fetchLatestReading} className="type-btn active">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>
            </div>
        );
    }

    const formattedDate = latestReading ? formatDateTime(latestReading.recorded_at) : { date: '', time: '' };

    return (
        <div className="analytics-container">
            {/* رأس اللوحة */}
            <div className="analytics-header">
                <h2>
                    {isArabic ? 'آخر قراءة صحية' : 'Latest Health Reading'}
                    <span className={`priority-badge priority-${readingStatus.status === 'critical' ? 'urgent' : readingStatus.status === 'warning' ? 'high' : readingStatus.status === 'good' ? 'medium' : 'low'}`} style={{ marginLeft: 'var(--spacing-sm)' }}>
                        <span className="status-icon">{readingStatus.icon}</span>
                        {readingStatus.message}
                    </span>
                </h2>
                <div className="notification-meta">
                    <span className="notification-time">📅 {formattedDate.date}</span>
                    <span className="notification-time">⏰ {formattedDate.time}</span>
                </div>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>

            {/* درجة الصحة */}
            <div className="global-health-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="health-score-container">
                    <div className="health-score-circle">
                        <svg width="100" height="100" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                            <circle 
                                cx="60" cy="60" r="54" 
                                fill="none" 
                                stroke={readingStatus.color} 
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 54}`}
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - (readingStatus.score || 0) / 100)}`}
                                transform="rotate(-90 60 60)"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor">
                                {readingStatus.score || 0}%
                            </text>
                        </svg>
                    </div>
                    <div className="health-status">
                        <span className="status-badge" style={{ background: readingStatus.color }}>
                            {readingStatus.message}
                        </span>
                    </div>
                </div>
            </div>

            {/* بطاقات القراءات */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</div>
                        <div className="stat-value">
                            {latestReading?.weight_kg ? `${latestReading.weight_kg.toFixed(1)} kg` : '—'}
                        </div>
                    </div>
                </div>

                <div className="analytics-stat-card">
                    <div className="stat-icon">❤️</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                        <div className="stat-value">
                            {latestReading?.systolic_pressure && latestReading?.diastolic_pressure 
                                ? `${latestReading.systolic_pressure} / ${latestReading.diastolic_pressure} mmHg`
                                : '—'}
                        </div>
                    </div>
                </div>

                <div className="analytics-stat-card">
                    <div className="stat-icon">🩸</div>
                    <div className="stat-content">
                        <div className="stat-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</div>
                        <div className="stat-value">
                            {latestReading?.blood_glucose ? `${latestReading.blood_glucose.toFixed(0)} mg/dL` : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* التنبيهات الصحية */}
            {readingStatus.issues && readingStatus.issues.some(i => i.severity === 'high' || i.severity === 'medium') && (
                <div className="recommendations-section">
                    <div className="rec-header">
                        <span className="rec-icon">⚠️</span>
                        <span className="rec-category">{isArabic ? 'تنبيهات صحية' : 'Health Alerts'}</span>
                    </div>
                    <div className="recommendations-list">
                        {readingStatus.issues.filter(i => i.severity === 'high' || i.severity === 'medium').map((issue, index) => (
                            <div key={index} className={`recommendation-card priority-${issue.severity === 'high' ? 'high' : 'medium'}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{issue.icon}</span>
                                    <span className="rec-message">{issue.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* التحليلات المتقدمة */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">🧠</span>
                    <span className="rec-category">{isArabic ? 'التحليلات المتقدمة' : 'Advanced Insights'}</span>
                </div>
                {renderAdvancedInsights()}
            </div>

            {/* الرؤى المتقاطعة */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">🔗</span>
                    <span className="rec-category">{isArabic ? 'الرؤى المتقاطعة' : 'Cross Insights'}</span>
                </div>
                {loadingInsights && (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}</p>
                    </div>
                )}
                {insightsError && (
                    <div className="analytics-error">
                        <span>⚠️</span>
                        <p>{insightsError}</p>
                    </div>
                )}
                {crossInsights && !loadingInsights && (
                    <div className="analytics-empty" style={{ padding: 'var(--spacing-lg)' }}>
                        <span>📊</span>
                        <p>{isArabic ? `تم تحليل ${crossInsights.correlations_count || 0} علاقة صحية` : `Analyzed ${crossInsights.correlations_count || 0} health correlations`}</p>
                    </div>
                )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="type-filters" style={{ justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
                <button onClick={fetchLatestReading} className="type-btn active">
                    🔄 {isArabic ? 'تحديث' : 'Refresh'}
                </button>
            </div>
        </div>
    );
}

export default HealthDashboard;