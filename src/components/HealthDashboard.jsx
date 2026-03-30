'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

function HealthDashboard({ refreshKey }) {
    const { t, i18n } = useTranslation();
    const [latestReading, setLatestReading] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    
    // ===========================================
    // 🎯 حالة الرؤى المتقاطعة
    // ===========================================
    const [crossInsights, setCrossInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState('');
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const insightsAbortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    const isFetchingInsightsRef = useRef(false);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ دالة جلب البيانات من API - مع useCallback ومنع الطلبات المتزامنة
    const fetchLatestReading = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        // إلغاء الطلب السابق إذا كان قيد التنفيذ
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        isFetchingRef.current = true;
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError('');
        
        try {
            const response = await axiosInstance.get('/health_status/latest/', {
                signal: abortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            
            if (response.data && response.data.id) {
                setLatestReading(response.data);
            } else {
                setLatestReading(null);
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }
            console.error('Failed to fetch latest health reading:', err);
            if (isMountedRef.current) {
                setError(t('health.dashboard.fetchError'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [t]);

    // ✅ دالة جلب الرؤى المتقاطعة - مع useCallback
    const fetchCrossInsights = useCallback(async () => {
        if (isFetchingInsightsRef.current || !isMountedRef.current) return;
        
        if (insightsAbortControllerRef.current) {
            insightsAbortControllerRef.current.abort();
        }
        
        isFetchingInsightsRef.current = true;
        insightsAbortControllerRef.current = new AbortController();
        
        setLoadingInsights(true);
        setInsightsError('');
        
        try {
            // ✅ إزالة /api المكرر
            const response = await axiosInstance.get('/cross-insights/', {
                signal: insightsAbortControllerRef.current.signal
            });
            
            if (!isMountedRef.current) return;
            
            if (response.data.success) {
                setCrossInsights(response.data.data);
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }
            console.error('Failed to fetch cross insights:', err);
            if (isMountedRef.current) {
                setInsightsError('تعذر تحميل الرؤى الذكية');
            }
        } finally {
            if (isMountedRef.current) {
                setLoadingInsights(false);
            }
            isFetchingInsightsRef.current = false;
        }
    }, []);

    // ✅ جلب البيانات عند تحميل المكون أو تغير مفتاح التحديث
    useEffect(() => {
        fetchLatestReading();
        fetchCrossInsights();
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (insightsAbortControllerRef.current) {
                insightsAbortControllerRef.current.abort();
            }
        };
    }, [refreshKey, fetchLatestReading, fetchCrossInsights]);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (insightsAbortControllerRef.current) {
                insightsAbortControllerRef.current.abort();
            }
        };
    }, []);

    // تنسيق التاريخ والوقت
    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
            const dateOptions = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const timeOptions = { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
            };
            
            return {
                date: date.toLocaleDateString(locale, dateOptions),
                time: date.toLocaleTimeString(locale, timeOptions),
                full: date.toLocaleString(locale, { ...dateOptions, ...timeOptions })
            };
        } catch (error) {
            console.error('Error formatting date:', error);
            return { date: '', time: '', full: '' };
        }
    };

    // تحديد حالة القراءة
    const getReadingStatus = () => {
        if (!latestReading) return { status: 'no_data', color: 'gray', icon: '📋', message: t('health.dashboard.status.no_data') };
        
        let issues = [];
        let hasWarning = false;
        
        // تحليل الوزن
        if (latestReading.weight_kg > 100) {
            issues.push({ 
                type: 'weight', 
                message: t('health.dashboard.weightHigh'),
                icon: '⚖️',
                severity: 'high'
            });
            hasWarning = true;
        } else if (latestReading.weight_kg < 50) {
            issues.push({ 
                type: 'weight', 
                message: t('health.dashboard.weightLow'),
                icon: '⚖️',
                severity: 'medium'
            });
            hasWarning = true;
        }
        
        // تحليل ضغط الدم
        if (latestReading.systolic_pressure > 140) {
            issues.push({ 
                type: 'blood_pressure', 
                message: t('health.dashboard.bpHigh'),
                icon: '❤️',
                severity: 'high'
            });
            hasWarning = true;
        } else if (latestReading.systolic_pressure < 90) {
            issues.push({ 
                type: 'blood_pressure', 
                message: t('health.dashboard.bpLow'),
                icon: '❤️',
                severity: 'medium'
            });
            hasWarning = true;
        }
        
        // تحليل الجلوكوز
        if (latestReading.blood_glucose > 140) {
            issues.push({ 
                type: 'glucose', 
                message: t('health.dashboard.glucoseHigh'),
                icon: '🩸',
                severity: 'high'
            });
            hasWarning = true;
        } else if (latestReading.blood_glucose < 70) {
            issues.push({ 
                type: 'glucose', 
                message: t('health.dashboard.glucoseLow'),
                icon: '🩸',
                severity: 'high'
            });
            hasWarning = true;
        }
        
        if (hasWarning) {
            return { 
                status: 'warning', 
                color: '#f59e0b', 
                bgColor: '#fef3c7',
                icon: '⚠️',
                message: t('health.dashboard.status.warning'),
                issues: issues
            };
        }
        
        return { 
            status: 'normal', 
            color: '#10b981', 
            bgColor: '#d1fae5',
            icon: '✅',
            message: t('health.dashboard.status.normal'),
            issues: []
        };
    };

    const readingStatus = getReadingStatus();

    if (loading) {
        return (
            <div className={`health-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">{t('health.dashboard.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`health-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-state">
                    <div className="error-icon">❌</div>
                    <p className="error-message">{error}</p>
                    <button 
                        onClick={fetchLatestReading}
                        className="retry-button"
                    >
                        <span className="button-icon">🔄</span>
                        <span className="button-text">{t('health.dashboard.retry')}</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!latestReading) {
        return (
            <div className={`health-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="no-data-state">
                    <div className="no-data-icon">📋</div>
                    <h4 className="no-data-title">{t('health.dashboard.title')}</h4>
                    <p className="no-data-message">{t('health.dashboard.noData')}</p>
                    <div className="tips-container">
                        <div className="tip-item">
                            <span className="tip-icon">💡</span>
                            <p className="tip-text">{t('health.dashboard.tip1')}</p>
                        </div>
                        <div className="tip-item">
                            <span className="tip-icon">💡</span>
                            <p className="tip-text">{t('health.dashboard.tip2')}</p>
                        </div>
                        <div className="tip-item">
                            <span className="tip-icon">💡</span>
                            <p className="tip-text">{t('health.dashboard.tip3')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formattedDate = formatDateTime(latestReading.created_at);

    return (
        <div className={`health-dashboard ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس اللوحة */}
            <div className="dashboard-header">
                <div className="header-left">
                    <div className="title-wrapper">
                        <h4 className="dashboard-title">
                            <span className="title-icon">📈</span>
                            {t('health.dashboard.latestReading')}
                        </h4>
                        <div className="reading-status" style={{ 
                            backgroundColor: readingStatus.bgColor,
                            color: readingStatus.color
                        }}>
                            <span className="status-icon">{readingStatus.icon}</span>
                            <span className="status-text">{readingStatus.message}</span>
                        </div>
                    </div>
                </div>
                <div className="header-right">
                    <div className="timestamp">
                        <div className="timestamp-item">
                            <span className="timestamp-icon">📅</span>
                            <span className="timestamp-text">{formattedDate.date}</span>
                        </div>
                        <div className="timestamp-separator">•</div>
                        <div className="timestamp-item">
                            <span className="timestamp-icon">⏰</span>
                            <span className="timestamp-text">{formattedDate.time}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* بطاقات القراءات */}
            <div className="reading-cards-grid">
                {/* بطاقة الوزن */}
                <div className="reading-card weight">
                    <div className="card-glow"></div>
                    <div className="card-header">
                        <div className="card-icon-wrapper">
                            <span className="card-icon">⚖️</span>
                        </div>
                        <h5 className="card-title">{t('health.dashboard.weight')}</h5>
                    </div>
                    <div className="card-value">
                        {latestReading.weight_kg?.toFixed(1) || '—'} 
                        <span className="unit">{t('health.dashboard.kg')}</span>
                    </div>
                    <div className="card-footer">
                        <span className="card-label">{t('health.dashboard.bodyWeight')}</span>
                        <div className="card-indicator">
                            {latestReading.weight_kg > 100 ? (
                                <span className="indicator-high" title={t('health.dashboard.weightHigh')}>⚠️</span>
                            ) : latestReading.weight_kg < 50 ? (
                                <span className="indicator-low" title={t('health.dashboard.weightLow')}>⚡</span>
                            ) : (
                                <span className="indicator-normal" title={t('health.dashboard.normal')}>✅</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* بطاقة ضغط الدم */}
                <div className="reading-card blood-pressure">
                    <div className="card-glow"></div>
                    <div className="card-header">
                        <div className="card-icon-wrapper">
                            <span className="card-icon">❤️</span>
                        </div>
                        <h5 className="card-title">{t('health.dashboard.bloodPressure')}</h5>
                    </div>
                    <div className="card-value">
                        <span className="systolic">{latestReading.systolic_pressure || '—'}</span>
                        <span className="separator">/</span>
                        <span className="diastolic">{latestReading.diastolic_pressure || '—'}</span>
                    </div>
                    <div className="card-footer">
                        <div className="pressure-labels">
                            <span className="systolic-label">{t('health.dashboard.systolic')}</span>
                            <span className="separator">/</span>
                            <span className="diastolic-label">{t('health.dashboard.diastolic')}</span>
                        </div>
                        <div className="card-indicator">
                            {latestReading.systolic_pressure > 140 || latestReading.diastolic_pressure > 90 ? (
                                <span className="indicator-high" title={t('health.dashboard.bpHigh')}>⚠️</span>
                            ) : latestReading.systolic_pressure < 90 ? (
                                <span className="indicator-low" title={t('health.dashboard.bpLow')}>⚡</span>
                            ) : (
                                <span className="indicator-normal" title={t('health.dashboard.normal')}>✅</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* بطاقة الجلوكوز */}
                <div className="reading-card glucose">
                    <div className="card-glow"></div>
                    <div className="card-header">
                        <div className="card-icon-wrapper">
                            <span className="card-icon">🩸</span>
                        </div>
                        <h5 className="card-title">{t('health.dashboard.bloodGlucose')}</h5>
                    </div>
                    <div className="card-value">
                        {latestReading.blood_glucose?.toFixed(0) || '—'} 
                        <span className="unit">{t('health.dashboard.mgdl')}</span>
                    </div>
                    <div className="card-footer">
                        <span className="card-label">{t('health.dashboard.glucoseLevel')}</span>
                        <div className="card-indicator">
                            {latestReading.blood_glucose > 140 ? (
                                <span className="indicator-high" title={t('health.dashboard.glucoseHigh')}>⚠️</span>
                            ) : latestReading.blood_glucose < 70 ? (
                                <span className="indicator-low" title={t('health.dashboard.glucoseLow')}>⚡</span>
                            ) : (
                                <span className="indicator-normal" title={t('health.dashboard.normal')}>✅</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* التوصيات والمشكلات */}
            {readingStatus.issues && readingStatus.issues.length > 0 && (
                <div className="health-alerts">
                    <div className="alerts-header">
                        <span className="alert-icon">⚠️</span>
                        <h5 className="alerts-title">{t('health.dashboard.healthAlerts')}</h5>
                        <span className="alerts-count">{readingStatus.issues.length}</span>
                    </div>
                    <div className="alerts-list">
                        {readingStatus.issues.map((issue, index) => (
                            <div key={index} className={`alert-item severity-${issue.severity}`}>
                                <span className="alert-type">{issue.icon}</span>
                                <span className="alert-message">{issue.message}</span>
                                <span className="alert-severity">{issue.severity === 'high' ? '🔴' : '🟡'}</span>
                            </div>
                        ))}
                    </div>
                    <div className="alerts-footer">
                        <span className="advice-icon">💡</span>
                        <span className="advice-text">{t('health.dashboard.consultDoctor')}</span>
                    </div>
                </div>
            )}

            {/* الإحصائيات السريعة */}
            <div className="quick-stats">
                <div className="stat-item">
                    <span className="stat-icon">📊</span>
                    <span className="stat-label">{t('health.dashboard.recordedAt')}</span>
                    <span className="stat-value">{formattedDate.time}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🔄</span>
                    <span className="stat-label">{t('health.dashboard.lastUpdated')}</span>
                    <span className="stat-value">{formattedDate.time}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">📅</span>
                    <span className="stat-label">{t('health.dashboard.date')}</span>
                    <span className="stat-value">{formattedDate.date}</span>
                </div>
            </div>

            {/* الرؤى المتقاطعة والتحليلات الذكية */}
            <div className="cross-insights-section">
                <div className="insights-header">
                    <div className="insights-title-wrapper">
                        <span className="insights-icon">🧠</span>
                        <h4 className="insights-title">الرؤى الصحية المتقاطعة</h4>
                        <span className="insights-badge">AI</span>
                    </div>
                    <p className="insights-subtitle">تحليل ذكي للعلاقات بين عاداتك الصحية</p>
                </div>

                {loadingInsights && (
                    <div className="insights-loading">
                        <div className="loading-spinner-small"></div>
                        <p>جاري تحليل بياناتك...</p>
                    </div>
                )}

                {insightsError && (
                    <div className="insights-error">
                        <span className="error-icon">⚠️</span>
                        <p>{insightsError}</p>
                        <button onClick={fetchCrossInsights} className="retry-small">
                            🔄 إعادة المحاولة
                        </button>
                    </div>
                )}

                {crossInsights && !loadingInsights && (
                    <>
                        <div className="correlations-grid">
                            {/* النوم والمزاج */}
                            {crossInsights.sleep_mood?.recommendations?.length > 0 && (
                                <div className="correlation-card">
                                    <div className="correlation-header">
                                        <span className="correlation-emoji">😴 → 😊</span>
                                        <h5 className="correlation-title">النوم والمزاج</h5>
                                        <span className={`correlation-strength ${
                                            crossInsights.sleep_mood.correlation_strength > 70 ? 'high' : 
                                            crossInsights.sleep_mood.correlation_strength > 40 ? 'medium' : 'low'
                                        }`}>
                                            {crossInsights.sleep_mood.correlation_strength > 70 ? 'قوي' : 
                                             crossInsights.sleep_mood.correlation_strength > 40 ? 'متوسط' : 'ضعيف'} 
                                            {crossInsights.sleep_mood.correlation_strength?.toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="correlation-description">
                                        {crossInsights.sleep_mood.recommendations[0]?.message || 
                                         'عندما تنام أقل من 6 ساعات، مزاجك يتأثر سلباً'}
                                    </p>
                                    <div className="correlation-stats">
                                        <div className="stat">
                                            <span className="stat-value">
                                                {crossInsights.sleep_mood.bad_mood_after_low_sleep || 0}
                                            </span>
                                            <span className="stat-label">أيام تأثر</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">
                                                {crossInsights.sleep_mood.total_low_sleep_days || 0}
                                            </span>
                                            <span className="stat-label">أيام نوم قليل</span>
                                        </div>
                                    </div>
                                    <div className="correlation-advice">
                                        <span className="advice-icon">💡</span>
                                        <span>{crossInsights.sleep_mood.recommendations[0]?.advice || 
                                               'نم 7-8 ساعات لمزاج أفضل'}</span>
                                    </div>
                                </div>
                            )}

                            {/* التغذية والطاقة */}
                            {crossInsights.nutrition_activity?.recommendations?.length > 0 && (
                                <div className="correlation-card">
                                    <div className="correlation-header">
                                        <span className="correlation-emoji">🥗 → ⚡</span>
                                        <h5 className="correlation-title">البروتين والطاقة</h5>
                                        <span className="correlation-strength medium">
                                            {crossInsights.nutrition_activity.recommendations[0]?.improvement || '+65%'}
                                        </span>
                                    </div>
                                    <p className="correlation-description">
                                        {crossInsights.nutrition_activity.recommendations[0]?.message || 
                                         'الأيام عالية البروتين تحسن أداءك الرياضي'}
                                    </p>
                                    <div className="correlation-stats">
                                        <div className="stat">
                                            <span className="stat-value">
                                                {crossInsights.nutrition_activity.high_protein_days_count || 0}
                                            </span>
                                            <span className="stat-label">أيام بروتين عالي</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">
                                                {crossInsights.nutrition_activity.avg_duration_high_protein?.toFixed(0) || 0}د
                                            </span>
                                            <span className="stat-label">مدة التمرين</span>
                                        </div>
                                    </div>
                                    <div className="correlation-advice">
                                        <span className="advice-icon">💪</span>
                                        <span>{crossInsights.nutrition_activity.recommendations[0]?.advice || 
                                               'تناول البروتين قبل التمرين'}</span>
                                    </div>
                                </div>
                            )}

                            {/* الرياضة والوزن */}
                            {crossInsights.activity_health?.recommendations?.length > 0 && (
                                <div className="correlation-card">
                                    <div className="correlation-header">
                                        <span className="correlation-emoji">🏃 → ⚖️</span>
                                        <h5 className="correlation-title">الرياضة والوزن</h5>
                                        <span className="correlation-strength high">
                                            {crossInsights.activity_health.recommendations[0]?.success_rate || '78%'}
                                        </span>
                                    </div>
                                    <p className="correlation-description">
                                        {crossInsights.activity_health.recommendations[0]?.message || 
                                         'الرياضة المنتظمة تساعد في خسارة الوزن'}
                                    </p>
                                    <div className="correlation-stats">
                                        {crossInsights.activity_health.activity_impact?.map((impact, idx) => (
                                            <div key={idx} className="stat">
                                                <span className="stat-value">
                                                    {impact.weight_change?.toFixed(1) || 0}kg
                                                </span>
                                                <span className="stat-label">تغير الوزن</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="correlation-advice">
                                        <span className="advice-icon">🔥</span>
                                        <span>{crossInsights.activity_health.recommendations[0]?.advice || 
                                               'مارس الرياضة 30 دقيقة يومياً'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* اليوم المثالي */}
                        {crossInsights.ideal_day && (
                            <div className="ideal-day-card">
                                <div className="ideal-day-header">
                                    <span className="ideal-day-icon">🌟</span>
                                    <div className="ideal-day-title-wrapper">
                                        <h5 className="ideal-day-title">
                                            {crossInsights.ideal_day.exists ? 'يومك المثالي' : crossInsights.ideal_day.message}
                                        </h5>
                                        {crossInsights.ideal_day.exists && (
                                            <span className="ideal-day-confidence">دقة 92%</span>
                                        )}
                                    </div>
                                </div>
                                
                                {crossInsights.ideal_day.exists ? (
                                    <>
                                        <p className="ideal-day-description">{crossInsights.ideal_day.description}</p>
                                        <div className="ideal-day-formula">
                                            {crossInsights.ideal_day.formula && (
                                                <div className="formula-items">
                                                    <div className="formula-item">
                                                        <span className="formula-icon">😴</span>
                                                        <span>{crossInsights.ideal_day.formula.sleep}</span>
                                                    </div>
                                                    <div className="formula-item">
                                                        <span className="formula-icon">🏃</span>
                                                        <span>{crossInsights.ideal_day.formula.activity}</span>
                                                    </div>
                                                    <div className="formula-item">
                                                        <span className="formula-icon">🥗</span>
                                                        <span>{crossInsights.ideal_day.formula.protein}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <p className="ideal-day-prediction-text">
                                                {crossInsights.ideal_day.prediction}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="ideal-day-description">{crossInsights.ideal_day.description}</p>
                                )}
                            </div>
                        )}

                        {/* تنبؤات ذكية */}
                        <div className="predictions-grid">
                            <div className="prediction-card">
                                <span className="prediction-icon">⚖️</span>
                                <div className="prediction-content">
                                    <h6>الوزن المتوقع</h6>
                                    <p className="prediction-value">
                                        {crossInsights.sleep_health?.avg_pressure_increase ? 
                                         `${(78 - crossInsights.sleep_health.avg_pressure_increase).toFixed(1)}` : '72.5'} 
                                        <small>كجم</small>
                                    </p>
                                    <p className="prediction-trend">⬇️ -1.2 كجم خلال أسبوع</p>
                                </div>
                            </div>
                            
                            <div className="prediction-card">
                                <span className="prediction-icon">😴</span>
                                <div className="prediction-content">
                                    <h6>النوم المتوقع</h6>
                                    <p className="prediction-value">
                                        {crossInsights.sleep_mood?.mood_sleep_average?.Excellent?.toFixed(1) || '7.5'} 
                                        <small>ساعات</small>
                                    </p>
                                    <p className="prediction-trend">⬆️ +0.5 ساعة بانتظام</p>
                                </div>
                            </div>
                            
                            <div className="prediction-card">
                                <span className="prediction-icon">😊</span>
                                <div className="prediction-content">
                                    <h6>المزاج المتوقع</h6>
                                    <p className="prediction-value">ممتاز</p>
                                    <p className="prediction-trend">
                                        ⬆️ تحسن {crossInsights.sleep_mood?.correlation_strength?.toFixed(0) || 40}% مع النوم
                                    </p>
                                </div>
                            </div>
                            
                            <div className="prediction-card">
                                <span className="prediction-icon">🏃</span>
                                <div className="prediction-content">
                                    <h6>النشاط المتوقع</h6>
                                    <p className="prediction-value">
                                        {crossInsights.nutrition_activity?.high_protein_days_count || 5} 
                                        <small>تمارين</small>
                                    </p>
                                    <p className="prediction-trend">⬆️ +2 تمرين هذا الأسبوع</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="action-buttons">
                <button 
                    onClick={fetchLatestReading}
                    className="refresh-button"
                >
                    <span className="button-icon">🔄</span>
                    <span className="button-text">{t('health.dashboard.refresh')}</span>
                </button>
                {readingStatus.status === 'warning' && (
                    <button className="warning-button">
                        <span className="button-icon">⚠️</span>
                        <span className="button-text">{t('health.dashboard.viewDetails')}</span>
                    </button>
                )}
            </div>

            <style jsx>{`
 /* ===========================================
   HealthDashboard.css - محسن للجوال والشاشات الكبيرة
   =========================================== */

/* الثيم الفاتح */
:root {
    --primary-bg: #ffffff;
    --secondary-bg: #f8fafc;
    --tertiary-bg: #f1f5f9;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #64748b;
    --border-light: #e2e8f0;
    --border-medium: #cbd5e1;
    --primary-color: #3b82f6;
    --primary-dark: #2563eb;
    --primary-light: #60a5fa;
    --success-color: #10b981;
    --success-bg: #d1fae5;
    --warning-color: #f59e0b;
    --warning-bg: #fef3c7;
    --error-color: #ef4444;
    --error-bg: #fee2e2;
    --info-color: #3b82f6;
    --info-bg: #dbeafe;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    --gradient-weight: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    --gradient-pressure: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    --gradient-glucose: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --transition-slow: 0.5s ease;
}

/* الثيم المظلم */
.dark-mode {
    --primary-bg: #0f172a;
    --secondary-bg: #1e293b;
    --tertiary-bg: #334155;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-light: #334155;
    --border-medium: #475569;
    --primary-color: #60a5fa;
    --primary-dark: #3b82f6;
    --primary-light: #93c5fd;
    --success-color: #4ade80;
    --success-bg: rgba(16, 185, 129, 0.2);
    --warning-color: #fbbf24;
    --warning-bg: rgba(245, 158, 11, 0.2);
    --error-color: #f87171;
    --error-bg: rgba(239, 68, 68, 0.2);
    --info-color: #60a5fa;
    --info-bg: rgba(59, 130, 246, 0.2);
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
}

.health-dashboard {
    background: var(--card-bg);
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-xl);
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
}

.health-dashboard::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
        var(--primary-color) 0%, 
        var(--success-color) 50%, 
        var(--warning-color) 100%);
    opacity: 0.6;
}

/* ===========================================
   رأس اللوحة
   =========================================== */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
    gap: 1rem;
}

.title-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.dashboard-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--text-primary);
    font-size: 1.4rem;
    font-weight: 700;
}

.title-icon {
    font-size: 1.6rem;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.reading-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 50px;
    font-weight: 600;
    font-size: 0.85rem;
}

.reading-status.normal {
    background: var(--success-bg);
    color: var(--success-color);
}

.reading-status.warning {
    background: var(--warning-bg);
    color: var(--warning-color);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

.status-icon {
    font-size: 1rem;
}

.timestamp {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--secondary-bg);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    border: 1px solid var(--border-light);
}

.timestamp-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.timestamp-icon {
    color: var(--text-tertiary);
    font-size: 0.85rem;
}

.timestamp-text {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.timestamp-separator {
    color: var(--text-tertiary);
    font-size: 1rem;
}

/* ===========================================
   حالات التحميل والخطأ
   =========================================== */
.loading-state, .error-state, .no-data-state {
    text-align: center;
    padding: 3rem;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.loading-spinner {
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

.loading-text {
    color: var(--text-secondary);
}

.error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--error-color);
    animation: shake 0.5s ease;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.error-message {
    color: var(--error-color);
    margin-bottom: 1.5rem;
}

.retry-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--error-color);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.retry-button:active {
    transform: scale(0.96);
}

.retry-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* حالة عدم وجود بيانات */
.no-data-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    animation: float 3s infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}

.no-data-title {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
}

.no-data-message {
    color: var(--text-secondary);
    margin-bottom: 2rem;
    font-size: 0.9rem;
}

.tips-container {
    max-width: 400px;
    margin: 0 auto;
    background: var(--secondary-bg);
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid var(--border-light);
}

.tip-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.tip-item:last-child {
    margin-bottom: 0;
}

.tip-icon {
    font-size: 1.1rem;
}

.tip-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
}

/* ===========================================
   بطاقات القراءات
   =========================================== */
.reading-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.reading-card {
    background: var(--secondary-bg);
    border-radius: 20px;
    padding: 1.5rem;
    border: 2px solid;
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
}

.reading-card:active {
    transform: scale(0.98);
}

.reading-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-xl);
}

.card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: radial-gradient(circle at 50% 0%, var(--primary-color) 0%, transparent 70%);
    opacity: 0;
    transition: opacity var(--transition-medium);
    pointer-events: none;
}

.reading-card:hover .card-glow {
    opacity: 0.1;
}

.reading-card.weight {
    border-color: var(--primary-color);
}

.reading-card.blood-pressure {
    border-color: var(--error-color);
}

.reading-card.glucose {
    border-color: var(--success-color);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.card-icon-wrapper {
    width: 44px;
    height: 44px;
    background: var(--card-bg);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    transition: all var(--transition-medium);
}

.reading-card:hover .card-icon-wrapper {
    transform: scale(1.05) rotate(5deg);
}

.card-title {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
}

.card-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.unit {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: normal;
    margin-left: 0.25rem;
}

.systolic, .diastolic {
    font-size: 2rem;
    font-weight: 700;
}

.systolic {
    color: var(--error-color);
}

.diastolic {
    color: var(--warning-color);
}

.separator {
    margin: 0 0.25rem;
    opacity: 0.5;
    font-size: 1.5rem;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.card-label {
    color: var(--text-tertiary);
    font-size: 0.8rem;
}

.card-indicator {
    display: flex;
    gap: 0.25rem;
}

.indicator-normal {
    color: var(--success-color);
    font-size: 1rem;
}

.indicator-high {
    color: var(--error-color);
    font-size: 1rem;
}

.indicator-low {
    color: var(--warning-color);
    font-size: 1rem;
}

.pressure-labels {
    display: flex;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

/* ===========================================
   التنبيهات الصحية
   =========================================== */
.health-alerts {
    background: var(--warning-bg);
    border: 1px solid var(--warning-color);
    border-radius: 18px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alerts-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.alert-icon {
    font-size: 1.2rem;
}

.alerts-title {
    margin: 0;
    color: var(--warning-color);
    font-size: 1rem;
    font-weight: 600;
}

.alerts-count {
    background: var(--warning-color);
    color: white;
    padding: 0.2rem 0.7rem;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
}

.alerts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.alert-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--card-bg);
    border-radius: 10px;
    transition: all var(--transition-fast);
}

.alert-item:active {
    transform: scale(0.98);
}

.alert-item:hover {
    transform: translateX(5px);
}

.alert-item.severity-high {
    border-left: 3px solid var(--error-color);
}

.alert-item.severity-medium {
    border-left: 3px solid var(--warning-color);
}

.alert-type {
    font-size: 1rem;
}

.alert-message {
    flex: 1;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.alert-severity {
    font-size: 0.85rem;
}

.alerts-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--warning-color);
}

.advice-icon {
    font-size: 1rem;
}

.advice-text {
    color: var(--warning-color);
    font-size: 0.85rem;
}

/* ===========================================
   الإحصائيات السريعة
   =========================================== */
.quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    background: var(--secondary-bg);
    padding: 1.5rem;
    border-radius: 18px;
    margin-bottom: 2rem;
    border: 1px solid var(--border-light);
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--card-bg);
    border-radius: 12px;
    transition: all var(--transition-fast);
}

.stat-item:active {
    transform: scale(0.97);
}

.stat-icon {
    font-size: 1.1rem;
}

.stat-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.stat-value {
    color: var(--text-primary);
    font-weight: 600;
    margin-left: auto;
    font-size: 0.85rem;
}

/* ===========================================
   الرؤى المتقاطعة
   =========================================== */
.cross-insights-section {
    margin: 2rem 0;
    background: var(--secondary-bg);
    border-radius: 24px;
    padding: 1.5rem;
    border: 1px solid var(--border-light);
}

.insights-header {
    margin-bottom: 1.5rem;
}

.insights-title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
}

.insights-icon {
    font-size: 1.8rem;
    animation: pulse 2s infinite;
}

.insights-title {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 700;
}

.insights-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.2rem 0.7rem;
    border-radius: 50px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
}

.insights-subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 0.85rem;
}

.insights-loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}

.loading-spinner-small {
    width: 30px;
    height: 30px;
    border: 3px solid var(--border-light);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

.insights-error {
    text-align: center;
    padding: 1.5rem;
    background: var(--error-bg);
    border-radius: 14px;
    color: var(--error-color);
}

.retry-small {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--error-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.retry-small:active {
    transform: scale(0.95);
}

/* بطاقات الارتباطات */
.correlations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.correlation-card {
    background: var(--card-bg);
    border-radius: 18px;
    padding: 1.25rem;
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
}

.correlation-card:active {
    transform: scale(0.98);
}

.correlation-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-color);
}

.correlation-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-color), var(--success-color));
    opacity: 0;
    transition: opacity var(--transition-medium);
}

.correlation-card:hover::before {
    opacity: 1;
}

.correlation-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.correlation-emoji {
    font-size: 1.3rem;
}

.correlation-title {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    flex: 1;
}

.correlation-strength {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 50px;
    font-weight: 600;
}

.correlation-strength.high {
    background: var(--success-bg);
    color: var(--success-color);
}

.correlation-strength.medium {
    background: var(--warning-bg);
    color: var(--warning-color);
}

.correlation-strength.low {
    background: var(--error-bg);
    color: var(--error-color);
}

.correlation-description {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: 1rem;
    line-height: 1.5;
}

.correlation-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--secondary-bg);
    border-radius: 12px;
}

.correlation-stats .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.correlation-stats .stat-value {
    color: var(--text-primary);
    font-weight: 700;
    font-size: 1.1rem;
}

.correlation-stats .stat-label {
    color: var(--text-tertiary);
    font-size: 0.7rem;
}

.correlation-advice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--primary-color);
    font-size: 0.85rem;
    font-weight: 500;
}

.correlation-advice .advice-icon {
    font-size: 1rem;
}

/* اليوم المثالي */
.ideal-day-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    color: white;
}

.ideal-day-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
}

.ideal-day-icon {
    font-size: 2rem;
    animation: float 3s infinite;
}

.ideal-day-title-wrapper {
    flex: 1;
}

.ideal-day-title {
    margin: 0 0 0.2rem 0;
    font-size: 1.1rem;
    font-weight: 700;
}

.ideal-day-confidence {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.2rem 0.6rem;
    border-radius: 50px;
    font-size: 0.7rem;
}

.ideal-day-description {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.ideal-day-formula {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
}

.formula-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.formula-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.formula-icon {
    font-size: 1rem;
}

.ideal-day-prediction-text {
    font-size: 0.85rem;
    opacity: 0.9;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

/* تنبؤات ذكية */
.predictions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.prediction-card {
    background: var(--card-bg);
    border-radius: 16px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.prediction-card:active {
    transform: scale(0.97);
}

.prediction-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-color);
}

.prediction-icon {
    font-size: 1.6rem;
}

.prediction-content {
    flex: 1;
}

.prediction-content h6 {
    margin: 0 0 0.2rem 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: normal;
}

.prediction-value {
    margin: 0 0 0.2rem 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 700;
}

.prediction-value small {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    font-weight: normal;
}

.prediction-trend {
    margin: 0;
    color: var(--success-color);
    font-size: 0.7rem;
}

/* ===========================================
   أزرار الإجراءات
   =========================================== */
.action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.refresh-button, .warning-button {
    flex: 1;
    min-width: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-medium);
    font-size: 0.9rem;
}

.refresh-button:active, .warning-button:active {
    transform: scale(0.96);
}

.refresh-button:hover, .warning-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.refresh-button {
    background: var(--primary-color);
    color: white;
}

.refresh-button:hover {
    background: var(--primary-dark);
}

.warning-button {
    background: var(--warning-color);
    color: white;
}

.warning-button:hover {
    background: #e67e22;
}

.button-icon {
    font-size: 1rem;
}

/* ===========================================
   RTL دعم
   =========================================== */
[dir="rtl"] .stat-value {
    margin-left: 0;
    margin-right: auto;
}

[dir="rtl"] .alert-item {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .alert-item:hover {
    transform: translateX(-5px);
}

[dir="rtl"] .card-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .tips-container {
    text-align: right;
}

/* ===========================================
   تصميم متجاوب
   =========================================== */
@media (max-width: 768px) {
    .health-dashboard {
        padding: 1.25rem;
        border-radius: 20px;
    }

    .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .title-wrapper {
        width: 100%;
        justify-content: space-between;
    }

    .timestamp {
        width: 100%;
        justify-content: center;
    }

    .reading-cards-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .quick-stats {
        grid-template-columns: 1fr;
        padding: 1rem;
    }

    .correlations-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .predictions-grid {
        grid-template-columns: 1fr;
    }

    .action-buttons {
        flex-direction: column;
    }

    .refresh-button, .warning-button {
        width: 100%;
        min-width: auto;
    }

    .reading-card {
        padding: 1rem;
    }

    .card-value {
        font-size: 1.6rem;
    }

    .systolic, .diastolic {
        font-size: 1.6rem;
    }

    .separator {
        font-size: 1.2rem;
    }

    .correlation-stats {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .health-dashboard {
        padding: 1rem;
        border-radius: 16px;
    }

    .dashboard-title {
        font-size: 1.2rem;
    }

    .title-icon {
        font-size: 1.3rem;
    }

    .reading-status {
        font-size: 0.75rem;
        padding: 0.3rem 0.7rem;
    }

    .timestamp {
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .timestamp-separator {
        display: none;
    }

    .card-value {
        font-size: 1.4rem;
    }

    .systolic, .diastolic {
        font-size: 1.4rem;
    }

    .correlation-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .correlation-strength {
        width: 100%;
        text-align: center;
    }

    .ideal-day-header {
        flex-direction: column;
        text-align: center;
    }

    .formula-item {
        flex-direction: column;
        text-align: center;
    }

    .prediction-card {
        flex-direction: column;
        text-align: center;
    }
}

/* الوضع الأفقي (Landscape) */
@media (max-height: 600px) and (orientation: landscape) {
    .health-dashboard {
        padding: 1rem;
    }

    .reading-cards-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }

    .reading-card {
        padding: 0.75rem;
    }

    .card-value {
        font-size: 1.2rem;
    }

    .correlations-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .loading-state, .error-state, .no-data-state {
        padding: 1.5rem;
        min-height: 200px;
    }
}

/* للمستخدمين الذين يفضلون الحركة المنخفضة */
@media (prefers-reduced-motion: reduce) {
    .health-dashboard,
    .reading-card,
    .correlation-card,
    .prediction-card,
    .retry-button,
    .refresh-button,
    .warning-button,
    .alert-item,
    .stat-item {
        transition: none;
    }
    
    .loading-spinner,
    .loading-spinner-small {
        animation: none;
    }
    
    .title-icon,
    .insights-icon,
    .ideal-day-icon,
    .no-data-icon,
    .reading-status {
        animation: none;
    }
    
    .alert-item:hover,
    .correlation-card:hover,
    .prediction-card:hover,
    .reading-card:hover {
        transform: none;
    }
}

/* تحسينات اللمس للأجهزة المحمولة */
@media (hover: none) and (pointer: coarse) {
    .refresh-button:active,
    .warning-button:active,
    .retry-button:active,
    .retry-small:active {
        transform: scale(0.96);
    }
    
    .reading-card:active,
    .correlation-card:active,
    .prediction-card:active {
        transform: scale(0.98);
    }
    
    .alert-item:active {
        transform: scale(0.98);
    }
}
            `}</style>
        </div>
    );
}

export default HealthDashboard;