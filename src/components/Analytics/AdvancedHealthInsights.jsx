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
    
    // ✅ معرفة إذا كانت اللغة العربية
    const isArabic = i18n.language.startsWith('ar');
    
    // ✅ useRef لمنع الطلبات المتكررة
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

    // ✅ دالة ترجمة
    const translateText = useCallback((text) => {
        if (!text) return text;
        
        if (typeof text === 'string' && (text.includes('.') || text === 'common.recommendations' || text === 'common.recommendation' || text === 'probability' || text === 'probability:')) {
            const translated = t(text, '');
            if (translated && translated !== text) {
                return translated;
            }
        }
        
        if (!isArabic) {
            const englishTranslations = {
                'تحليل استهلاك الطاقة': 'Energy Consumption Analysis',
                'تحليل ضغط النبض': 'Pulse Pressure Analysis',
                'توصيات ما قبل التمرين': 'Pre-Exercise Recommendations',
                'تنبؤات مستقبلية': 'Future Predictions',
                'النشاط والتغذية': 'Activity & Nutrition',
                'إجمالي الأنشطة': 'Total Activities',
                'تحليل': 'Analysis',
                'تحليلات متقاطعة متقدمة': 'Advanced Cross Insights',
                'الطاقة': 'Energy',
                'ضغط النبض': 'Pulse Pressure',
                'توصيات التمرين': 'Exercise Recommendations',
                'علامات حيوية': 'Vital Signs',
                'توصيات شاملة': 'Holistic Recommendations',
                'تنبيهات تنبؤية': 'Predictive Alerts',
                'العلاقات المكتشفة': 'Discovered Relationships',
                'قوة العلاقة': 'Correlation Strength',
                'بناءً على': 'Based on',
                'أيام': 'days',
                'توصيات مخصصة': 'Personalized Recommendations',
                'تحليل عميق': 'Deep Analysis',
                'اقتراحات': 'Suggestions',
                'نصائح': 'Tips',
                'لماذا؟': 'Why?',
                'كيف؟': 'How?',
                '⚠️ عجز حراري كبير مع بروتين منخفض': '⚠️ Large calorie deficit with low protein',
                'حرقت {burned} سعرة وأكلت {protein}g بروتين فقط': 'You burned {burned} calories but ate only {protein}g protein',
                'قد تخسر كتلة عضلية، زد البروتين بعد التمرين': 'You may lose muscle mass, increase protein after exercise',
                'سعرة محروقة/يوم': 'calories burned/day',
                'سعرة مستهلكة/يوم': 'calories consumed/day',
                'عجز يومي': 'daily deficit',
                '🚨 حرج: فرق الضغط منخفض جداً!': '🚨 Critical: Pulse pressure is very low!',
                'فرق الضغط منخفض جداً!': 'Pulse pressure is very low!',
                'الفرق بين الضغط الانقباضي': 'The difference between systolic',
                'والانبساطي': 'and diastolic',
                'هو فقط': 'is only',
                'مم زئبق': 'mmHg',
                'المدى الطبيعي:': 'Normal range:',
                'الأسباب المحتملة:': 'Possible causes:',
                'قد يكون بسبب ضعف عضلة القلب أو مشاكل في الصمامات': 'May be due to heart muscle weakness or valve problems',
                'استشر طبيباً فوراً': 'Consult a doctor immediately',
                'تخطيط صدى القلب': 'Echocardiogram',
                '⚖️ زيادة سريعة في الوزن': '⚖️ Rapid Weight Gain',
                'قد تزيد': 'You may gain',
                'كجم خلال شهر إذا استمر الوضع': 'kg in a month if this continues',
                'سجل طعامك وراجع السعرات الحرارية': 'Log your food and review calories',
                'قد تخسر {weight} كجم خلال شهر': 'You may lose {weight} kg in a month',
                'تأكد من الحصول على بروتين كافٍ': 'Ensure adequate protein intake',
                '📊 ارتفاع تدريجي في السكر': '📊 Gradual Rise in Glucose',
                'إذا استمر الاتجاه، قد تصل لمرحلة ما قبل السكري خلال 3 أشهر': 'If trend continues, you may reach pre-diabetes in 3 months',
                'قلل الكربوهيدرات البسيطة وامش 30 دقيقة يومياً': 'Reduce simple carbs and walk 30 minutes daily',
                '😴 نمط نوم غير منتظم': '😴 Irregular Sleep Pattern',
                'قد تعاني من الأرق أو اضطراب النوم': 'You may have insomnia or sleep disorder',
                'حاول النوم في وقت ثابت يومياً': 'Try to sleep at a fixed time daily',
                'توصية': 'Recommendation',
                'توصيات': 'Recommendations',
                'احتمال': 'Probability',
                'احتمال:': 'Probability:',
                'توصيات قبل التمرين': 'Pre-exercise recommendations',
                'تنبؤات وقائية': 'Predictive alerts',
                'اقتراحات:': 'Suggestions:',
                'العلامات الحيوية': 'Vital Signs',
                'قراءاتك الحالية': 'Your Current Readings',
                'الوزن': 'Weight',
                'ضغط الدم': 'Blood Pressure',
                'الجلوكوز': 'Glucose',
                'فرق الضغط': 'Pulse Pressure',
                'سجلت في': 'Recorded at',
                'تحليلات': 'Insights',
                'تنبيهات': 'Alerts',
                'يوم ممتاز لبناء العضلات': 'Excellent day for muscle building',
                'فائض {calories} سعرة مع {protein}g بروتين': 'Surplus {calories} calories with {protein}g protein',
                'استمر بهذا النظام': 'Continue this pattern',
                'تحتاج لتحسين التوازن بين طعامك ونشاطك': 'You need to balance your food and activity',
                'نظامك الغذائي متوازن مع نشاطك': 'Your diet is balanced with your activity',
                'بيانات كافية للتحليل، استمر بالتسجيل': 'Sufficient data for analysis, keep recording'
            };
            
            if (englishTranslations[text]) {
                return englishTranslations[text];
            }
            
            let result = text;
            for (const [arabic, english] of Object.entries(englishTranslations)) {
                if (text.includes(arabic.replace(/{[^}]+}/g, '').trim())) {
                    result = result.replace(arabic, english);
                }
            }
            return result;
        }
        
        if (isArabic) {
            const arabicTranslations = {
                'Recommendations': 'التوصيات',
                'Probability': 'احتمال',
                'probability:': 'احتمال:',
                'Pre-exercise recommendations': 'توصيات قبل التمرين',
                'Predictive alerts': 'تنبؤات وقائية',
                'Rapid Weight Gain': 'زيادة سريعة في الوزن',
                'You may gain': 'قد تزيد',
                'kg in a month if this continues': 'كجم خلال شهر إذا استمر الوضع',
                'Log your food and review calories': 'سجل طعامك وراجع السعرات الحرارية',
                'Normal range:': 'المدى الطبيعي:',
                'Possible causes:': 'الأسباب المحتملة:',
                'Consult a doctor immediately': 'استشر طبيباً فوراً',
                'Vital Signs': 'العلامات الحيوية',
                'Your Current Readings': 'قراءاتك الحالية',
                'Weight': 'الوزن',
                'Blood Pressure': 'ضغط الدم',
                'Glucose': 'الجلوكوز',
                'Pulse Pressure': 'فرق الضغط',
                'Recorded at': 'سجلت في',
                'Insights': 'تحليلات',
                'Alerts': 'تنبيهات'
            };
            if (arabicTranslations[text]) return arabicTranslations[text];
        }
        
        return text;
    }, [t, isArabic]);

    // ✅ جلب التحليلات الحقيقية فقط
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
            
            // ✅ لا نستخدم بيانات تجريبية، فقط نعرض خطأ
            if (err.response?.status === 404) {
                setError('⚠️ ميزة التحليلات المتقدمة غير متوفرة حالياً');
            } else if (err.response?.status === 401) {
                setError('🔒 الرجاء تسجيل الدخول مرة أخرى');
            } else if (err.code === 'ECONNABORTED') {
                setError('⏰ انتهت مهلة الاتصال بالخادم');
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
    }, [i18n.language, t]);

    useEffect(() => {
        fetchInsights();
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshTrigger, i18n.language, fetchInsights]);

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

    // ✅ عرض حالة التحميل
    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.common.loading')}</p>
            </div>
        );
    }

    // ✅ عرض الخطأ
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

    // ✅ إذا لم تكن هناك بيانات حقيقية
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
                {insights.energy_consumption?.alerts?.length > 0 && (
                    <div className="insight-card energy-critical">
                        <div className="insight-icon">⚡</div>
                        <div className="insight-content">
                            {insights.energy_consumption.alerts.map((alert, idx) => (
                                <div key={idx} className="alert-details">
                                    <h3>{translateText(alert.title)}</h3>
                                    <p className="alert-message">{translateText(alert.message)}</p>
                                    {alert.details && <p className="alert-details-text">{translateText(alert.details)}</p>}
                                    <div className="alert-recommendation">
                                        <strong>{translateText('common.recommendation') || (isArabic ? 'توصية' : 'Recommendation')}:</strong> {translateText(alert.recommendation)}
                                    </div>
                                    
                                    <div className="energy-stats">
                                        <div className="stat">
                                            <span className="stat-value">{insights.energy_consumption.total_daily_burn}</span>
                                            <span className="stat-label">{isArabic ? 'سعرة محروقة/يوم' : 'calories burned/day'}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">{insights.energy_consumption.avg_daily_intake}</span>
                                            <span className="stat-label">{isArabic ? 'سعرة مستهلكة/يوم' : 'calories consumed/day'}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value deficit">{insights.energy_consumption.deficit}</span>
                                            <span className="stat-label">{isArabic ? 'عجز يومي' : 'daily deficit'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. تحليل ضغط النبض */}
                {insights.pulse_pressure?.alert && (
                    <div className={`insight-card pulse-${insights.pulse_pressure.severity || 'normal'}`}>
                        <div className="insight-icon">
                            {insights.pulse_pressure.severity === 'critical' ? '🚨' : '❤️'}
                        </div>
                        <div className="insight-content">
                            <h3>{translateText(insights.pulse_pressure.alert.message)}</h3>
                            {insights.pulse_pressure.alert.details && (
                                <p className="alert-details-text">{translateText(insights.pulse_pressure.alert.details)}</p>
                            )}
                            {insights.pulse_pressure.alert.normal_range && (
                                <p className="normal-range">
                                    {translateText('Normal range:')} {insights.pulse_pressure.alert.normal_range}
                                </p>
                            )}
                            
                            {insights.pulse_pressure.alert.causes?.length > 0 && (
                                <div className="causes">
                                    <strong>{translateText('Possible causes:')}</strong>
                                    <ul>
                                        {insights.pulse_pressure.alert.causes.map((cause, i) => (
                                            <li key={i}>{translateText(cause)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {insights.pulse_pressure.alert.recommendations?.length > 0 && (
                                <div className="recommendations">
                                    <strong>{translateText('common.recommendations')}</strong>
                                    <ul>
                                        {insights.pulse_pressure.alert.recommendations.map((rec, i) => (
                                            <li key={i}>{translateText(rec)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. توصيات ما قبل التمرين */}
                {insights.pre_exercise?.recommendations?.length > 0 && (
                    <div className="insight-card pre-exercise">
                        <div className="insight-icon">🏃</div>
                        <div className="insight-content">
                            <h3>{isArabic ? 'توصيات قبل التمرين' : 'Pre-exercise recommendations'}</h3>
                            {insights.pre_exercise.recommendations.map((rec, idx) => (
                                <div key={idx} className="recommendation-item">
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon || '💡'}</span>
                                        <span className="rec-title">{translateText(rec.title)}</span>
                                    </div>
                                    <p className="rec-message">{translateText(rec.message)}</p>
                                    {rec.details && <p className="rec-details">{translateText(rec.details)}</p>}
                                    <p className="rec-advice">{translateText(rec.advice)}</p>
                                    
                                    {rec.food_suggestions && rec.food_suggestions.length > 0 && (
                                        <div className="food-suggestions">
                                            <strong>{translateText('Suggestions') || (isArabic ? 'اقتراحات:' : 'Suggestions:')}</strong>
                                            <div className="food-tags">
                                                {rec.food_suggestions.map((food, i) => (
                                                    <span key={i} className="food-tag">{translateText(food)}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. تنبؤات مستقبلية */}
                {insights.predictive?.length > 0 && (
                    <div className="predictive-insights">
                        <h3>{isArabic ? '🔮 تنبؤات مستقبلية' : '🔮 Predictive alerts'}</h3>
                        <div className="predictive-grid">
                            {insights.predictive.map((alert, idx) => (
                                <div key={idx} className={`predictive-card severity-${alert.severity || 'info'}`}>
                                    <h4>{translateText(alert.title)}</h4>
                                    <p>{translateText(alert.prediction)}</p>
                                    {alert.probability && (
                                        <p className="probability">
                                            {translateText('probability:')} {alert.probability}
                                        </p>
                                    )}
                                    <p className="action">{translateText(alert.action)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdvancedHealthInsights;