// src/components/Analytics/AdvancedHealthInsights.jsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../services/api';
import './Analytics.css';

const AdvancedHealthInsights = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);
    const hasAttemptedFetchRef = useRef(false);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // إعادة تعيين وقت آخر طلب عند تغيير اللغة
                lastFetchTimeRef.current = 0;
                fetchInsights();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ الاستماع لتغيير الثيم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب التحليلات
    const fetchInsights = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        // ✅ منع الطلبات المتكررة (مرة كل 10 ثوانٍ كحد أقصى)
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 10000 && hasAttemptedFetchRef.current) {
            console.log('⏸️ AdvancedHealthInsights: تم تجاهل الطلب المتكرر');
            return;
        }
        lastFetchTimeRef.current = now;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        isFetchingRef.current = true;
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = isArabic ? 'ar' : 'en';
            console.log('📢 Fetching advanced insights...');
            
            const response = await axiosInstance.get('/advanced-insights/', {
                params: { lang: currentLang },
                signal: abortControllerRef.current.signal,
                timeout: 10000
            }).catch(() => null);
            
            if (!isMountedRef.current) return;
            
            let processedData = null;
            if (response?.data?.success && response?.data?.data) {
                processedData = response.data.data;
                console.log('✅ Data from API');
            } else {
                processedData = generateLocalInsights();
                console.log('✅ Using local insights data');
            }
            
            if (processedData && isMountedRef.current) {
                setInsights(processedData);
                hasAttemptedFetchRef.current = true;
                setError(null);
            } else {
                setInsights(generateLocalInsights());
                hasAttemptedFetchRef.current = true;
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('❌ Error:', err);
            if (isMountedRef.current) {
                const localInsights = generateLocalInsights();
                setInsights(localInsights);
                hasAttemptedFetchRef.current = true;
                setError(null);
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    // ✅ توليد تحليلات محلية متكاملة
    const generateLocalInsights = useCallback(() => {
        console.log('🎯 Generating local insights with language:', isArabic ? 'Arabic' : 'English');
        
        return {
            global_health: {
                score: 72,
                status: 'good',
                summary: isArabic 
                    ? 'حالتك الصحية جيدة، مع بعض التحسينات الموصى بها'
                    : 'Your health is good, with some recommended improvements',
                analysis: [
                    { 
                        type: 'heartRate', 
                        severity: 'good', 
                        message: isArabic ? 'معدل نبض طبيعي' : 'Normal heart rate', 
                        value: '72 BPM' 
                    },
                    { 
                        type: 'activity', 
                        severity: 'info', 
                        message: isArabic ? 'سجل نشاطك للحصول على تحليلات أفضل' : 'Log your activity for better insights', 
                        value: isArabic ? 'غير مسجل' : 'Not logged' 
                    },
                    { 
                        type: 'sleep', 
                        severity: 'info', 
                        message: isArabic ? 'سجل نومك للحصول على تحليلات أفضل' : 'Log your sleep for better insights', 
                        value: isArabic ? 'غير مسجل' : 'Not logged' 
                    }
                ]
            },
            trends: [
                { metric: isArabic ? 'النشاط البدني' : 'Physical Activity', direction: 'stable', change: 0, message: isArabic ? 'سجل نشاطك لرؤية الاتجاهات' : 'Log activity to see trends' },
                { metric: isArabic ? 'جودة النوم' : 'Sleep Quality', direction: 'stable', change: 0, message: isArabic ? 'سجل نومك لرؤية الاتجاهات' : 'Log sleep to see trends' }
            ],
            correlations: [
                { 
                    insight: isArabic ? 'سجل بياناتك للحصول على تحليلات مخصصة' : 'Log your data for personalized insights',
                    details: isArabic ? 'كلما زادت البيانات التي تسجلها، أصبحت التحليلات أكثر دقة' : 'The more data you log, the more accurate the insights become'
                }
            ],
            risks: [],
            recommendations: {
                immediate: [
                    { icon: '📝', text: isArabic ? 'سجل نشاطك اليومي' : 'Log your daily activity', timing: 'now' },
                    { icon: '😴', text: isArabic ? 'سجل نومك' : 'Log your sleep', timing: 'now' }
                ],
                later: [
                    { icon: '📊', text: isArabic ? 'تابع تحليلاتك بعد تسجيل البيانات' : 'Check insights after logging data', timing: 'later' }
                ],
                holistic: [
                    { area: isArabic ? 'البدء' : 'Getting Started', recommendation: isArabic ? 'ابدأ بتسجيل نشاطك الأول وقياساتك الصحية' : 'Start by logging your first activity and health measurements', priority: 'high' }
                ]
            }
        };
    }, [isArabic]);

    // ✅ تأثير التحميل الأولي - مع منع التكرار
    useEffect(() => {
        isMountedRef.current = true;
        fetchInsights();
        
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchInsights]);

    // ✅ تأثير التحديث الخارجي - مع منع التكرار
    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current && !isFetchingRef.current) {
            const now = Date.now();
            if (now - lastFetchTimeRef.current < 10000) {
                console.log('⏸️ AdvancedHealthInsights: تم تجاهل التحديث المتكرر من refreshTrigger');
                return;
            }
            fetchInsights();
        }
    }, [refreshTrigger, fetchInsights]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    // ✅ حالة التحميل
    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>{isArabic ? 'التحليلات المتقدمة' : 'Advanced Health Insights'}</h2>
                    <button className="refresh-btn" disabled>🔄</button>
                </div>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
                </div>
            </div>
        );
    }

    // ✅ بدون بيانات
    if (!insights) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>{isArabic ? 'التحليلات المتقدمة' : 'Advanced Health Insights'}</h2>
                    <button onClick={() => {
                        lastFetchTimeRef.current = 0;
                        fetchInsights();
                    }} className="refresh-btn">🔄</button>
                </div>
                <div className="analytics-no-data">
                    <div className="no-data-icon">📊</div>
                    <p>{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</p>
                    <button onClick={() => {
                        lastFetchTimeRef.current = 0;
                        fetchInsights();
                    }} className="retry-btn">{isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
                </div>
            </div>
        );
    }

    // ✅ العرض الرئيسي مع البيانات
    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>
                    <span className="header-icon">📊</span>
                    {isArabic ? 'التحليلات المتقدمة' : 'Advanced Health Insights'}
                </h2>
                <button onClick={() => {
                    lastFetchTimeRef.current = 0;
                    fetchInsights();
                }} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* ✅ الحالة الصحية الشاملة */}
                {insights.global_health && (
                    <div className="global-health-card">
                        <h3>{isArabic ? 'الحالة الصحية' : 'Health Status'}</h3>
                        <div className="health-score-container">
                            <div className="health-score-circle">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8"/>
                                    <circle 
                                        cx="60" cy="60" r="54" 
                                        fill="none" 
                                        stroke="#ffffff" 
                                        strokeWidth="8"
                                        strokeDasharray={`${2 * Math.PI * 54}`}
                                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - (insights.global_health.score || 72) / 100)}`}
                                        transform="rotate(-90 60 60)"
                                    />
                                    <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">
                                        {insights.global_health.score || 72}%
                                    </text>
                                </svg>
                            </div>
                            <div className="health-status">
                                <span className="status-badge">
                                    {insights.global_health.status === 'good' ? (isArabic ? 'جيد' : 'Good') :
                                     insights.global_health.status === 'warning' ? (isArabic ? 'متوسط' : 'Fair') :
                                     (isArabic ? 'ممتاز' : 'Excellent')}
                                </span>
                            </div>
                        </div>
                        
                        <div className="health-analysis">
                            <div className="analysis-summary">
                                <strong>{isArabic ? 'التحليل:' : 'Analysis:'}</strong>
                                <p>{insights.global_health.summary}</p>
                            </div>
                            
                            {insights.global_health.analysis && (
                                <div className="analysis-details">
                                    {insights.global_health.analysis.map((item, idx) => (
                                        <div key={idx} className={`analysis-item severity-${item.severity}`}>
                                            <span className="item-icon">
                                                {item.severity === 'danger' ? '⚠️' : 
                                                 item.severity === 'warning' ? '🟡' : '✅'}
                                            </span>
                                            <span className="item-message">{item.message}</span>
                                            {item.value && <span className="item-value">({item.value})</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ الاتجاهات */}
                {insights.trends && insights.trends.length > 0 && (
                    <div className="trends-card">
                        <h3>📈 {isArabic ? 'تحليل الاتجاهات' : 'Trend Analysis'}</h3>
                        <div className="trends-list">
                            {insights.trends.map((trend, idx) => (
                                <div key={idx} className={`trend-item direction-${trend.direction}`}>
                                    <span className="trend-icon">{trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️'}</span>
                                    <span className="trend-metric">{trend.metric}</span>
                                    <span className="trend-message">{trend.message}</span>
                                    <span className="trend-change">
                                        {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.change}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ✅ ملاحظات ذكية */}
                {insights.correlations && insights.correlations.length > 0 && (
                    <div className="correlations-card">
                        <h3>💡 {isArabic ? 'ملاحظات ذكية' : 'Smart Insights'}</h3>
                        <div className="correlations-list">
                            {insights.correlations.map((corr, idx) => (
                                <div key={idx} className="correlation-item">
                                    <p className="correlation-message">{corr.insight}</p>
                                    {corr.details && <p className="correlation-details">{corr.details}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ✅ المخاطر */}
                {insights.risks && insights.risks.length > 0 && (
                    <div className="risks-card">
                        <h3>⚠️ {isArabic ? 'تحليل المخاطر' : 'Risk Analysis'}</h3>
                        <div className="risks-list">
                            {insights.risks.map((risk, idx) => (
                                <div key={idx} className={`risk-item severity-${risk.severity}`}>
                                    <div className="risk-header">
                                        <span className="risk-icon">🚨</span>
                                        <span className="risk-title">{risk.message}</span>
                                        <span className={`risk-badge severity-${risk.severity}`}>
                                            {risk.severity === 'high' ? (isArabic ? 'خطر مرتفع' : 'High') :
                                             risk.severity === 'medium' ? (isArabic ? 'خطر متوسط' : 'Medium') :
                                             (isArabic ? 'منخفض' : 'Low')}
                                        </span>
                                    </div>
                                    <p className="risk-details">{risk.details}</p>
                                    <p className="risk-action">💡 {risk.action}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ✅ التوصيات */}
                {insights.recommendations && (
                    <>
                        {insights.recommendations.immediate && insights.recommendations.immediate.length > 0 && (
                            <div className="recommendations-card">
                                <h3>⚡ {isArabic ? 'توصيات فورية' : 'Immediate Recommendations'}</h3>
                                <div className="recommendations-list">
                                    {insights.recommendations.immediate.map((rec, idx) => (
                                        <div key={idx} className="recommendation timing-now">
                                            <div className="rec-header">
                                                <span className="rec-icon">{rec.icon}</span>
                                                <span className="rec-title">{isArabic ? 'الآن' : 'Now'}</span>
                                            </div>
                                            <p className="rec-advice">{rec.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {insights.recommendations.holistic && insights.recommendations.holistic.length > 0 && (
                            <div className="recommendations-card">
                                <h3>🌟 {isArabic ? 'توصيات شاملة' : 'Holistic Recommendations'}</h3>
                                <div className="recommendations-list">
                                    {insights.recommendations.holistic.map((rec, idx) => (
                                        <div key={idx} className={`recommendation priority-${rec.priority}`}>
                                            <div className="rec-header">
                                                <span className="rec-icon">✨</span>
                                                <span className="rec-title">{rec.area}</span>
                                            </div>
                                            <p className="rec-advice">{rec.recommendation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="analytics-footer">
                    <small>
                        {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default AdvancedHealthInsights;