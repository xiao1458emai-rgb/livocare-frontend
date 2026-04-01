// src/components/Analytics/AdvancedHealthInsights.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Analytics.css';

const AdvancedHealthInsights = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const isArabic = i18n.language.startsWith('ar');
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);

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

    // ✅ دالة ترجمة مبسطة
    const translateText = useCallback((text) => {
        if (!text) return text;
        if (typeof text === 'string' && text.includes('.')) {
            const translated = t(text, '');
            if (translated && translated !== text) return translated;
        }
        return text;
    }, [t]);

    // ✅ جلب التحليلات من الـ Backend
    const fetchInsights = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        isFetchingRef.current = true;
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            console.log('📢 Fetching real advanced insights from backend...');
            
            const response = await axiosInstance.get('/advanced-insights/', {
                params: { lang: currentLang },
                signal: abortControllerRef.current.signal,
                timeout: 10000
            });
            
            if (!isMountedRef.current) return;
            
            if (response.data && response.data.success && response.data.data) {
                setInsights(response.data.data);
                setError(null);
                console.log('✅ Real advanced insights loaded successfully');
                console.log('📊 Data structure:', response.data.data);
            } else if (response.data && !response.data.success) {
                setError(response.data.message || t('analytics.common.error'));
                setInsights(null);
            } else {
                setError(t('analytics.common.noData'));
                setInsights(null);
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }
            
            console.error('❌ Error fetching advanced insights:', err);
            
            if (err.response?.status === 404) {
                setError(isArabic ? '⚠️ ميزة التحليلات المتقدمة غير متوفرة حالياً' : '⚠️ Advanced insights feature is currently unavailable');
            } else if (err.response?.status === 401) {
                setError(isArabic ? '🔒 الرجاء تسجيل الدخول مرة أخرى' : '🔒 Please login again');
            } else if (err.code === 'ECONNABORTED') {
                setError(isArabic ? '⏰ انتهت مهلة الاتصال بالخادم' : '⏰ Connection timeout');
            } else {
                setError(t('analytics.common.error'));
            }
            setInsights(null);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [i18n.language, t, isArabic]);

    useEffect(() => {
        fetchInsights();
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshTrigger, i18n.language, fetchInsights]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // ✅ حالة التحميل
    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.common.loading')}</p>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-icon">⚠️</div>
                <p className="error-message">{error}</p>
                <button onClick={fetchInsights} className="retry-btn">
                    🔄 {t('analytics.common.retry')}
                </button>
            </div>
        );
    }

    // ✅ لا توجد بيانات
    if (!insights) {
        return (
            <div className={`analytics-no-data ${darkMode ? 'dark-mode' : ''}`}>
                <div className="no-data-icon">📊</div>
                <p>{isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis'}</p>
                <p className="no-data-hint">
                    {isArabic ? 'سجل المزيد من البيانات الصحية للحصول على تحليلات متقدمة' : 'Log more health data to get advanced insights'}
                </p>
            </div>
        );
    }

    // ✅ عرض جميع التحليلات
    return (
        <div className={`analytics-container advanced-insights ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? '🧠 التحليلات المتقدمة' : '🧠 Advanced Health Insights'}</h2>
                <button onClick={fetchInsights} className="refresh-btn" title={t('common.refresh')}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                
                {/* 1. تحليل استهلاك الطاقة */}
                {insights.energy_consumption && (
                    <div className="insight-card energy-card">
                        <div className="insight-icon">⚡</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '🔋 تحليل استهلاك الطاقة' : '🔋 Energy Consumption Analysis'}</h3>
                            
                            <div className="energy-stats-grid">
                                <div className="stat-item">
                                    <span className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</span>
                                    <span className="stat-value">{insights.energy_consumption.weight || '-'} {isArabic ? 'كجم' : 'kg'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{isArabic ? 'معدل الأيض الأساسي' : 'BMR'}</span>
                                    <span className="stat-value">{insights.energy_consumption.bmr || '-'} {isArabic ? 'سعرة' : 'kcal'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{isArabic ? 'الحرق اليومي' : 'Daily Burn'}</span>
                                    <span className="stat-value">{insights.energy_consumption.total_daily_burn || '-'} {isArabic ? 'سعرة' : 'kcal'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{isArabic ? 'المتوسط اليومي' : 'Avg Daily Intake'}</span>
                                    <span className="stat-value">{insights.energy_consumption.avg_daily_intake || '-'} {isArabic ? 'سعرة' : 'kcal'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{isArabic ? 'العجز اليومي' : 'Daily Deficit'}</span>
                                    <span className={`stat-value ${insights.energy_consumption.deficit > 0 ? 'deficit' : 'surplus'}`}>
                                        {insights.energy_consumption.deficit || 0} {isArabic ? 'سعرة' : 'kcal'}
                                    </span>
                                </div>
                            </div>

                            {insights.energy_consumption.analysis && (
                                <div className="energy-analysis">
                                    <p>{translateText(insights.energy_consumption.analysis)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. تحليل ضغط النبض */}
                {insights.pulse_pressure && (
                    <div className={`insight-card pulse-card ${insights.pulse_pressure.severity === 'critical' ? 'critical' : insights.pulse_pressure.severity === 'high' ? 'high' : 'normal'}`}>
                        <div className="insight-icon">
                            {insights.pulse_pressure.severity === 'critical' ? '🚨' : insights.pulse_pressure.severity === 'high' ? '⚠️' : '❤️'}
                        </div>
                        <div className="insight-content">
                            <h3>{isArabic ? '❤️ تحليل ضغط النبض' : '❤️ Pulse Pressure Analysis'}</h3>
                            
                            <div className="bp-stats">
                                <div className="bp-reading">
                                    <span className="bp-systolic">{insights.pulse_pressure.systolic}</span>
                                    <span className="bp-separator">/</span>
                                    <span className="bp-diastolic">{insights.pulse_pressure.diastolic}</span>
                                    <span className="bp-unit">mmHg</span>
                                </div>
                                <div className="pulse-pressure">
                                    <strong>{isArabic ? 'ضغط النبض:' : 'Pulse Pressure:'}</strong>
                                    <span className={`pp-value ${insights.pulse_pressure.severity}`}>
                                        {insights.pulse_pressure.pulse_pressure} mmHg
                                    </span>
                                </div>
                            </div>

                            {insights.pulse_pressure.alert && (
                                <div className="pulse-alert">
                                    <p className={`alert-message ${insights.pulse_pressure.severity}`}>
                                        {translateText(insights.pulse_pressure.alert)}
                                    </p>
                                </div>
                            )}

                            {insights.pulse_pressure.recommendations && (
                                <div className="recommendations">
                                    <strong>{isArabic ? '💡 توصيات:' : '💡 Recommendations:'}</strong>
                                    <ul>
                                        {insights.pulse_pressure.recommendations.map((rec, i) => (
                                            <li key={i}>{translateText(rec)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. مخاطر ما قبل التمرين */}
                {insights.pre_exercise && (
                    <div className="insight-card pre-exercise-card">
                        <div className="insight-icon">🏃‍♂️</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '⚠️ مخاطر ما قبل التمرين' : '⚠️ Pre-Exercise Risk Analysis'}</h3>
                            
                            <div className="risk-stats">
                                <div className="risk-item">
                                    <span className="risk-label">{isArabic ? 'مستوى السكر:' : 'Glucose:'}</span>
                                    <span className={`risk-value ${insights.pre_exercise.glucose > 140 ? 'high' : insights.pre_exercise.glucose < 70 ? 'low' : 'normal'}`}>
                                        {insights.pre_exercise.glucose} mg/dL
                                    </span>
                                </div>
                                <div className="risk-item">
                                    <span className="risk-label">{isArabic ? 'ضغط الدم:' : 'Blood Pressure:'}</span>
                                    <span className={`risk-value ${insights.pre_exercise.blood_pressure_risk ? 'high' : 'normal'}`}>
                                        {insights.pre_exercise.blood_pressure}
                                    </span>
                                </div>
                                <div className="risk-item">
                                    <span className="risk-label">{isArabic ? 'نشاط اليوم:' : 'Today\'s Activity:'}</span>
                                    <span className="risk-value">
                                        {insights.pre_exercise.has_activity_today 
                                            ? (isArabic ? '✅ تم ممارسة الرياضة' : '✅ Exercised today')
                                            : (isArabic ? '⚠️ لم تمارس الرياضة بعد' : '⚠️ No exercise yet')}
                                    </span>
                                </div>
                            </div>

                            {insights.pre_exercise.recommendations && insights.pre_exercise.recommendations.length > 0 && (
                                <div className="recommendations">
                                    <strong>{isArabic ? '📋 توصيات:' : '📋 Recommendations:'}</strong>
                                    <ul>
                                        {insights.pre_exercise.recommendations.map((rec, i) => (
                                            <li key={i}>
                                                {rec.icon && <span className="rec-icon">{rec.icon}</span>}
                                                {translateText(rec.message)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. العلامات الحيوية */}
                {insights.vital_signs && insights.vital_signs.vital_signs && (
                    <div className="insight-card vital-signs-card">
                        <div className="insight-icon">📊</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '📊 العلامات الحيوية' : '📊 Vital Signs'}</h3>
                            
                            <div className="vital-signs-grid">
                                {insights.vital_signs.vital_signs.heart_rate && (
                                    <div className="vital-item">
                                        <span className="vital-icon">❤️</span>
                                        <div>
                                            <div className="vital-label">{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</div>
                                            <div className="vital-value">{insights.vital_signs.vital_signs.heart_rate.value} <span className="vital-unit">BPM</span></div>
                                            <div className={`vital-status ${insights.vital_signs.vital_signs.heart_rate.status}`}>
                                                {insights.vital_signs.vital_signs.heart_rate.status === 'normal' ? (isArabic ? 'طبيعي' : 'Normal') : (isArabic ? 'غير طبيعي' : 'Abnormal')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {insights.vital_signs.vital_signs.blood_pressure && (
                                    <div className="vital-item">
                                        <span className="vital-icon">🩸</span>
                                        <div>
                                            <div className="vital-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                                            <div className="vital-value">{insights.vital_signs.vital_signs.blood_pressure.value} <span className="vital-unit">mmHg</span></div>
                                            <div className={`vital-status ${insights.vital_signs.vital_signs.blood_pressure.status}`}>
                                                {insights.vital_signs.vital_signs.blood_pressure.status === 'normal' ? (isArabic ? 'طبيعي' : 'Normal') : (isArabic ? 'مرتفع' : 'High')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {insights.vital_signs.insights && insights.vital_signs.insights.length > 0 && (
                                <div className="vital-insights">
                                    <strong>{isArabic ? '🔍 تحليلات:' : '🔍 Insights:'}</strong>
                                    <ul>
                                        {insights.vital_signs.insights.map((insight, i) => (
                                            <li key={i}>{translateText(insight)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. توصيات شاملة */}
                {insights.holistic && insights.holistic.length > 0 && (
                    <div className="insight-card holistic-card">
                        <div className="insight-icon">💡</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '💡 توصيات شاملة' : '💡 Holistic Recommendations'}</h3>
                            <div className="holistic-list">
                                {insights.holistic.map((rec, i) => (
                                    <div key={i} className="holistic-item">
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon || '✨'}</span>
                                            <strong>{translateText(rec.area)}</strong>
                                        </div>
                                        <p>{translateText(rec.recommendation)}</p>
                                        {rec.priority && (
                                            <span className={`priority-badge priority-${rec.priority}`}>
                                                {rec.priority === 'high' ? (isArabic ? 'عاجل' : 'Urgent') : 
                                                 rec.priority === 'medium' ? (isArabic ? 'مهم' : 'Important') : 
                                                 (isArabic ? 'عادي' : 'Normal')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. تنبيهات تنبؤية */}
                {insights.predictive && insights.predictive.length > 0 && (
                    <div className="insight-card predictive-card">
                        <div className="insight-icon">🔮</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '🔮 تنبيهات تنبؤية' : '🔮 Predictive Alerts'}</h3>
                            <div className="predictive-list">
                                {insights.predictive.map((alert, i) => (
                                    <div key={i} className={`predictive-item severity-${alert.severity || 'info'}`}>
                                        <div className="alert-header">
                                            <span className="alert-icon">
                                                {alert.type === 'weight' ? '⚖️' : alert.type === 'glucose' ? '🩸' : alert.type === 'sleep' ? '😴' : '⚠️'}
                                            </span>
                                            <strong>{translateText(alert.title)}</strong>
                                        </div>
                                        <p className="alert-message">{translateText(alert.message)}</p>
                                        {alert.probability && (
                                            <div className="probability-bar">
                                                <div className="probability-label">{isArabic ? 'احتمال:' : 'Probability:'}</div>
                                                <div className="bar-container">
                                                    <div className="bar-fill" style={{ width: `${alert.probability}%` }}></div>
                                                    <span className="probability-value">{alert.probability}%</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="alert-action">
                                            <span className="action-icon">💡</span>
                                            <span>{translateText(alert.action)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. العلاقات المكتشفة (اختياري) */}
                {insights.correlations && insights.correlations.length > 0 && (
                    <div className="insight-card correlations-card">
                        <div className="insight-icon">🔗</div>
                        <div className="insight-content">
                            <h3>{isArabic ? '🔗 العلاقات المكتشفة' : '🔗 Discovered Correlations'}</h3>
                            <div className="correlations-list">
                                {insights.correlations.map((corr, i) => (
                                    <div key={i} className="correlation-item">
                                        <div className="corr-header">
                                            <span className="corr-icon">{corr.icon}</span>
                                            <strong>{translateText(corr.title)}</strong>
                                        </div>
                                        <p className="corr-description">{translateText(corr.description)}</p>
                                        <div className="corr-strength">
                                            <span>{isArabic ? 'قوة العلاقة:' : 'Strength:'}</span>
                                            <div className="strength-bar">
                                                <div className="strength-fill" style={{ width: `${corr.strength * 100}%` }}></div>
                                            </div>
                                            <span className="strength-value">{Math.round(corr.strength * 100)}%</span>
                                        </div>
                                        <div className="corr-sample">
                                            <small>{isArabic ? `بناءً على ${corr.sample_size} سجل` : `Based on ${corr.sample_size} records`}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdvancedHealthInsights;