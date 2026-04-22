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
            if (isMountedRef.current) setError(t('health.dashboard.fetchError'));
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [t]);

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
            if (isMountedRef.current) setInsightsError('تعذر تحميل الرؤى الذكية');
        } finally {
            if (isMountedRef.current) setLoadingInsights(false);
            isFetchingInsightsRef.current = false;
        }
    }, []);

    // جلب التحليلات المتقدمة
    const fetchAdvancedInsights = useCallback(async () => {
        if (isFetchingAdvancedRef.current || !isMountedRef.current) return;
        if (advancedAbortControllerRef.current) advancedAbortControllerRef.current.abort();
        isFetchingAdvancedRef.current = true;
        advancedAbortControllerRef.current = new AbortController();
        setLoadingAdvanced(true);
        setAdvancedError('');
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            const response = await axiosInstance.get('/advanced-insights/', {
                params: { lang: currentLang },
                signal: advancedAbortControllerRef.current.signal,
                timeout: 10000
            });
            if (!isMountedRef.current) return;
            if (response.data && response.data.success && response.data.data) {
                setAdvancedInsights(response.data.data);
                console.log('✅ Advanced insights loaded');
            } else {
                setAdvancedError(response.data?.message || 'لا توجد بيانات كافية للتحليل المتقدم');
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to fetch advanced insights:', err);
            if (isMountedRef.current) {
                if (err.response?.status === 404) setAdvancedError('⚠️ ميزة التحليلات المتقدمة غير متوفرة حالياً');
                else setAdvancedError('تعذر تحميل التحليلات المتقدمة');
            }
        } finally {
            if (isMountedRef.current) setLoadingAdvanced(false);
            isFetchingAdvancedRef.current = false;
        }
    }, [i18n.language]);

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
            const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
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

    const getReadingStatus = () => {
        if (!latestReading) return { status: 'no_data', color: 'gray', bgColor: '#f3f4f6', icon: '📋', message: t('health.dashboard.status.no_data'), issues: [] };
        let issues = [];
        let hasWarning = false;
        if (latestReading.weight_kg > 100) { issues.push({ type: 'weight', message: t('health.dashboard.weightHigh'), icon: '⚖️', severity: 'high' }); hasWarning = true; }
        else if (latestReading.weight_kg < 50 && latestReading.weight_kg > 0) { issues.push({ type: 'weight', message: t('health.dashboard.weightLow'), icon: '⚖️', severity: 'medium' }); hasWarning = true; }
        if (latestReading.systolic_pressure > 140) { issues.push({ type: 'blood_pressure', message: t('health.dashboard.bpHigh'), icon: '❤️', severity: 'high' }); hasWarning = true; }
        else if (latestReading.systolic_pressure < 90 && latestReading.systolic_pressure > 0) { issues.push({ type: 'blood_pressure', message: t('health.dashboard.bpLow'), icon: '❤️', severity: 'medium' }); hasWarning = true; }
        if (latestReading.blood_glucose > 140) { issues.push({ type: 'glucose', message: t('health.dashboard.glucoseHigh'), icon: '🩸', severity: 'high' }); hasWarning = true; }
        else if (latestReading.blood_glucose < 70 && latestReading.blood_glucose > 0) { issues.push({ type: 'glucose', message: t('health.dashboard.glucoseLow'), icon: '🩸', severity: 'high' }); hasWarning = true; }
        if (hasWarning) return { status: 'warning', color: '#f59e0b', bgColor: '#fef3c7', icon: '⚠️', message: t('health.dashboard.status.warning'), issues: issues };
        return { status: 'normal', color: '#10b981', bgColor: '#d1fae5', icon: '✅', message: t('health.dashboard.status.normal'), issues: [] };
    };

    const readingStatus = getReadingStatus();

    const toSafeString = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? 'نعم' : 'لا';
        if (Array.isArray(val)) {
            const strings = val.map(item => toSafeString(item)).filter(s => s);
            return strings.join(' • ');
        }
        if (typeof val === 'object') {
            if (val.message && typeof val.message === 'string') return val.message;
            if (val.text && typeof val.text === 'string') return val.text;
            if (val.advice && typeof val.advice === 'string') return val.advice;
            if (val.title && typeof val.title === 'string') return val.title;
            if (val.description && typeof val.description === 'string') return val.description;
            if (val.area && val.recommendation) {
                return `${toSafeString(val.area)}: ${toSafeString(val.recommendation)}`;
            }
            return 'معلومات متقدمة';
        }
        return String(val);
    };

    // عرض التحليلات المتقدمة
    const renderAdvancedInsights = () => {
        if (loadingAdvanced) {
            return (
                <div className="analytics-loading" style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="spinner"></div>
                    <p>جاري تحليل بياناتك المتقدمة...</p>
                </div>
            );
        }
        if (advancedError) {
            return (
                <div className="analytics-error">
                    <span>⚠️</span>
                    <p>{advancedError}</p>
                    <button onClick={fetchAdvancedInsights} className="type-btn">🔄 إعادة المحاولة</button>
                </div>
            );
        }
        if (!advancedInsights) {
            return (
                <div className="analytics-empty">
                    <div className="empty-icon">🧠</div>
                    <p>سجل المزيد من البيانات للحصول على تحليلات متقدمة</p>
                </div>
            );
        }

        const isArabic = i18n.language.startsWith('ar');

        try {
            return (
                <div className="advanced-insights-content">
                    {/* تحليل الطاقة */}
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

                    {/* تحليل ضغط النبض */}
                    {advancedInsights.pulse_pressure && (
                        <div className="insight-card">
                            <div className="insight-icon">❤️</div>
                            <div className="insight-content">
                                <h3>{isArabic ? 'تحليل ضغط النبض' : 'Pulse Pressure'}</h3>
                                <div className="stat-value" style={{ fontSize: '2rem' }}>
                                    {advancedInsights.pulse_pressure.systolic || '—'} / {advancedInsights.pulse_pressure.diastolic || '—'} <span style={{ fontSize: '1rem' }}>mmHg</span>
                                </div>
                                <div className="stat-label">
                                    <strong>{isArabic ? 'ضغط النبض:' : 'Pulse Pressure:'}</strong> {advancedInsights.pulse_pressure.pulse_pressure || '-'} mmHg
                                </div>
                                {advancedInsights.pulse_pressure.alert && (
                                    <div className="recommendation-card priority-high" style={{ marginTop: 'var(--spacing-md)' }}>
                                        <div className="rec-message">{toSafeString(advancedInsights.pulse_pressure.alert)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* توصيات ما قبل التمرين */}
                    {advancedInsights.pre_exercise && (
                        <div className="insight-card">
                            <div className="insight-icon">🏃</div>
                            <div className="insight-content">
                                <h3>{isArabic ? 'توصيات ما قبل التمرين' : 'Pre-Exercise Recommendations'}</h3>
                                {advancedInsights.pre_exercise.glucose !== undefined && (
                                    <div className="habit-stats">
                                        <span>{isArabic ? 'السكر:' : 'Glucose:'} {advancedInsights.pre_exercise.glucose} mg/dL</span>
                                        {advancedInsights.pre_exercise.blood_pressure && (
                                            <span>{isArabic ? 'ضغط الدم:' : 'BP:'} {advancedInsights.pre_exercise.blood_pressure}</span>
                                        )}
                                    </div>
                                )}
                                {advancedInsights.pre_exercise.recommendations && advancedInsights.pre_exercise.recommendations.length > 0 && (
                                    <div className="recommendations-list" style={{ marginTop: 'var(--spacing-md)' }}>
                                        {advancedInsights.pre_exercise.recommendations.map((rec, idx) => (
                                            <div key={idx} className="recommendation-card">
                                                <div className="rec-header">
                                                    <span className="rec-icon">💡</span>
                                                    <span className="rec-category">{toSafeString(rec)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* العلامات الحيوية */}
                    {advancedInsights.vital_signs && (
                        <div className="insight-card">
                            <div className="insight-icon">📊</div>
                            <div className="insight-content">
                                <h3>{isArabic ? 'العلامات الحيوية' : 'Vital Signs'}</h3>
                                <div className="habit-stats">
                                    {advancedInsights.vital_signs.heart_rate && (
                                        <span>❤️ {isArabic ? 'ضربات القلب' : 'Heart Rate'}: {
                                            typeof advancedInsights.vital_signs.heart_rate === 'object' 
                                                ? (advancedInsights.vital_signs.heart_rate.value || '-') 
                                                : advancedInsights.vital_signs.heart_rate
                                        } BPM</span>
                                    )}
                                    {advancedInsights.vital_signs.blood_pressure && (
                                        <span>🩸 {isArabic ? 'ضغط الدم' : 'Blood Pressure'}: {
                                            typeof advancedInsights.vital_signs.blood_pressure === 'object'
                                                ? (advancedInsights.vital_signs.blood_pressure.value || '-')
                                                : advancedInsights.vital_signs.blood_pressure
                                        }</span>
                                    )}
                                </div>
                                {advancedInsights.vital_signs.insights && advancedInsights.vital_signs.insights.length > 0 && (
                                    <div className="recommendations-section" style={{ marginTop: 'var(--spacing-md)' }}>
                                        <h4>{isArabic ? 'تحليلات:' : 'Insights:'}</h4>
                                        <div className="recommendations-list">
                                            {advancedInsights.vital_signs.insights.map((insight, i) => (
                                                <div key={i} className="recommendation-card">
                                                    <div className="rec-message">{toSafeString(insight)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* توصيات شاملة */}
                    {advancedInsights.holistic && advancedInsights.holistic.length > 0 && (
                        <div className="recommendations-section">
                            <h3>💡 {isArabic ? 'توصيات شاملة' : 'Holistic Recommendations'}</h3>
                            <div className="recommendations-list">
                                {advancedInsights.holistic.map((rec, i) => (
                                    <div key={i} className="recommendation-card">
                                        <div className="rec-message">{toSafeString(rec)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* تنبيهات تنبؤية */}
                    {advancedInsights.predictive && advancedInsights.predictive.length > 0 && (
                        <div className="recommendations-section">
                            <h3>🔮 {isArabic ? 'تنبيهات تنبؤية' : 'Predictive Alerts'}</h3>
                            <div className="recommendations-list">
                                {advancedInsights.predictive.map((alert, i) => {
                                    const alertText = toSafeString(alert);
                                    const actionText = alert.action ? toSafeString(alert.action) : '';
                                    const titleText = alert.title ? toSafeString(alert.title) : 'تنبيه';
                                    return (
                                        <div key={i} className="recommendation-card priority-high">
                                            <div className="rec-header">
                                                <span className="rec-icon">⚠️</span>
                                                <span className="rec-category">{titleText}</span>
                                            </div>
                                            <p className="rec-message">{alertText}</p>
                                            {actionText && actionText !== alertText && (
                                                <div className="rec-advice">💡 {actionText}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (err) {
            console.error('Error rendering advanced insights:', err);
            return (
                <div className="analytics-error">
                    <span>⚠️</span>
                    <p>حدث خطأ في عرض التحليلات المتقدمة</p>
                    <button onClick={fetchAdvancedInsights} className="type-btn">🔄 إعادة المحاولة</button>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('health.dashboard.loading')}</p>
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
                        🔄 {t('health.dashboard.retry')}
                    </button>
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
                    <span>📈</span>
                    {t('health.dashboard.latestReading')}
                    <span className={`priority-badge priority-${readingStatus.status === 'warning' ? 'high' : 'low'}`} style={{ marginLeft: 'var(--spacing-sm)' }}>
                        <span className="status-icon">{readingStatus.icon}</span>
                        {readingStatus.message}
                    </span>
                </h2>
                <div className="notification-meta">
                    <span className="notification-time">📅 {formattedDate.date}</span>
                    <span className="notification-time">⏰ {formattedDate.time}</span>
                </div>
            </div>

            {/* بطاقات القراءات */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-content">
                        <div className="stat-label">{t('health.dashboard.weight')}</div>
                        <div className="stat-value">
                            {latestReading?.weight_kg?.toFixed(1) || '—'} <span className="stat-label">{t('health.dashboard.kg')}</span>
                        </div>
                        <div className="stat-label">{t('health.dashboard.bodyWeight')}</div>
                    </div>
                </div>

                <div className="analytics-stat-card">
                    <div className="stat-icon">❤️</div>
                    <div className="stat-content">
                        <div className="stat-label">{t('health.dashboard.bloodPressure')}</div>
                        <div className="stat-value">
                            <span style={{ color: 'var(--error)' }}>{latestReading?.systolic_pressure || '—'}</span>
                            <span style={{ fontSize: '1rem' }}>/</span>
                            <span style={{ color: 'var(--warning)' }}>{latestReading?.diastolic_pressure || '—'}</span>
                        </div>
                        <div className="stat-label">
                            <span>{t('health.dashboard.systolic')}</span> / <span>{t('health.dashboard.diastolic')}</span>
                        </div>
                    </div>
                </div>

                <div className="analytics-stat-card">
                    <div className="stat-icon">🩸</div>
                    <div className="stat-content">
                        <div className="stat-label">{t('health.dashboard.bloodGlucose')}</div>
                        <div className="stat-value">
                            {latestReading?.blood_glucose?.toFixed(0) || '—'} <span className="stat-label">{t('health.dashboard.mgdl')}</span>
                        </div>
                        <div className="stat-label">{t('health.dashboard.glucoseLevel')}</div>
                    </div>
                </div>
            </div>

            {/* التوصيات والمشكلات */}
            {readingStatus.issues && readingStatus.issues.length > 0 && (
                <div className="recommendations-section">
                    <div className="rec-header">
                        <span className="rec-icon">⚠️</span>
                        <span className="rec-category">{t('health.dashboard.healthAlerts')}</span>
                        <span className="rec-type warning">{readingStatus.issues.length}</span>
                    </div>
                    <div className="recommendations-list">
                        {readingStatus.issues.map((issue, index) => (
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
                    <span className="rec-category">التحليلات المتقدمة</span>
                    <span className="rec-type tip">AI</span>
                </div>
                <p className="stat-label">تحليل عميق للعلاقات الصحية المتقدمة</p>
                {renderAdvancedInsights()}
            </div>

            {/* الرؤى المتقاطعة */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">🔗</span>
                    <span className="rec-category">الرؤى المتقاطعة</span>
                </div>
                <p className="stat-label">تحليل العلاقات بين عاداتك الصحية</p>
                {loadingInsights && (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>جاري تحليل بياناتك...</p>
                    </div>
                )}
                {insightsError && (
                    <div className="analytics-error">
                        <span>⚠️</span>
                        <p>{insightsError}</p>
                        <button onClick={fetchCrossInsights} className="type-btn">🔄 إعادة المحاولة</button>
                    </div>
                )}
                {crossInsights && !loadingInsights && (
                    <div className="analytics-empty" style={{ padding: 'var(--spacing-lg)' }}>
                        <span>📊</span>
                        <p>تم تحليل {crossInsights.correlations_count || 0} علاقة صحية</p>
                    </div>
                )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="type-filters" style={{ justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
                <button onClick={fetchLatestReading} className="type-btn active">
                    🔄 {t('health.dashboard.refresh')}
                </button>
                {readingStatus.status === 'warning' && (
                    <button className="type-btn" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                        ⚠️ {t('health.dashboard.viewDetails')}
                    </button>
                )}
            </div>
        </div>
    );
}

export default HealthDashboard;