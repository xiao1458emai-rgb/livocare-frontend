// src/components/Analytics/ActivityAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

const ActivityAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [activityInsights, setActivityInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // معرفة إذا كانت اللغة العربية
    const isArabic = i18n.language.startsWith('ar');

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

    useEffect(() => {
        fetchAllData();
    }, [refreshTrigger]);

    // ✅ دالة مساعدة لحساب المتوسط بأمان
    const safeMean = (arr) => {
        if (!arr || arr.length === 0) return 0;
        try {
            return math.mean(arr);
        } catch (error) {
            console.warn('Error calculating mean:', error);
            return 0;
        }
    };

    // ✅ دالة لحساب التقدم الأسبوعي
    const calculateWeekProgress = (activities) => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentActivities = activities.filter(a => 
            a.start_time && new Date(a.start_time) >= oneWeekAgo
        );
        
        const recentMinutes = recentActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        return Math.min(100, Math.round((recentMinutes / 150) * 100));
    };

    // ✅ دالة لإيجاد أفضل نشاط
    const findBestActivity = (activities) => {
        if (activities.length === 0) return null;
        
        const activityCounts = {};
        activities.forEach(a => {
            if (a.activity_type) {
                activityCounts[a.activity_type] = (activityCounts[a.activity_type] || 0) + 1;
            }
        });
        
        const best = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
        if (best) {
            const activityNames = {
                walking: '🚶 المشي', running: '🏃 الجري', yoga: '🧘 يوجا', 
                cardio: '❤️ تمارين قلب', weightlifting: '🏋️ رفع أثقال',
                cycling: '🚴 ركوب دراجة', swimming: '🏊 سباحة'
            };
            return activityNames[best[0]] || best[0];
        }
        return null;
    };

    const fetchAllData = async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            // ✅ جلب الأنشطة فقط للتحليلات
            const activitiesRes = await axiosInstance.get('/activities/').catch(() => ({ data: [] }));
            
            let activitiesData = [];
            if (activitiesRes.data?.results) {
                activitiesData = activitiesRes.data.results;
            } else if (Array.isArray(activitiesRes.data)) {
                activitiesData = activitiesRes.data;
            }
            
            console.log('🏃 Activities for analytics:', activitiesData.length);
            
            if (!isMountedRef.current) return;
            
            // ✅ حساب إحصائيات النشاط
            const activityMinutes = activitiesData
                .map(a => a.duration_minutes || 0)
                .filter(m => m > 0 && m <= 180);
            
            const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);
            const activitiesCount = activitiesData.length;
            const totalCalories = activitiesData.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
            const avgPerDay = activitiesCount > 0 ? Math.round(totalActivity / activitiesCount) : 0;
            const weekProgress = calculateWeekProgress(activitiesData);
            const bestActivity = findBestActivity(activitiesData);
            
            // ✅ حساب التوصيات بناءً على البيانات المتاحة
            const recommendations = [];
            const insights = [];
            
            if (activitiesCount === 0) {
                recommendations.push({
                    icon: '🏃',
                    title: t('analytics.activity.recommendations.startActivity.title') || 'ابدأ نشاطك اليوم',
                    mainAdvice: t('analytics.activity.recommendations.startActivity.advice') || 'سجل أول نشاط رياضي لك اليوم',
                    basedOn: t('analytics.activity.recommendations.startActivity.basedOn') || 'لا توجد أنشطة مسجلة بعد',
                    tips: [
                        t('analytics.activity.recommendations.startActivity.tip1') || 'جرب المشي لمدة 10 دقائق',
                        t('analytics.activity.recommendations.startActivity.tip2') || 'اختر نشاطاً تحبه',
                        t('analytics.activity.recommendations.startActivity.tip3') || 'حدد وقتاً ثابتاً يومياً'
                    ],
                    priority: 'high'
                });
            } else if (totalActivity < 150) {
                const needed = 150 - totalActivity;
                recommendations.push({
                    icon: '🏃',
                    title: t('analytics.activity.recommendations.increaseActivity.title') || 'زد نشاطك',
                    mainAdvice: t('analytics.activity.recommendations.increaseActivity.advice', { minutes: needed }) || `أنت بحاجة إلى ${needed} دقيقة إضافية هذا الأسبوع`,
                    basedOn: t('analytics.activity.recommendations.increaseActivity.basedOn') || `لديك ${totalActivity} دقيقة نشاط من أصل 150 دقيقة موصى بها`,
                    tips: [
                        t('analytics.activity.recommendations.increaseActivity.tip1') || 'امشِ 15 دقيقة إضافية يومياً',
                        t('analytics.activity.recommendations.increaseActivity.tip2') || 'استخدم الدرج بدلاً من المصعد',
                        t('analytics.activity.recommendations.increaseActivity.tip3') || 'جرب تطبيقات تتبع النشاط'
                    ],
                    priority: 'high'
                });
            } else {
                recommendations.push({
                    icon: '🏆',
                    title: t('analytics.activity.recommendations.maintainActivity.title') || 'أداء ممتاز',
                    mainAdvice: t('analytics.activity.recommendations.maintainActivity.advice') || 'أنت تحقق المستوى الموصى به من النشاط',
                    basedOn: t('analytics.activity.recommendations.maintainActivity.basedOn') || `${totalActivity} دقيقة نشاط هذا الأسبوع`,
                    tips: [
                        t('analytics.activity.recommendations.maintainActivity.tip1') || 'نوّع في أنواع التمارين',
                        t('analytics.activity.recommendations.maintainActivity.tip2') || 'أضف تمارين القوة مرتين أسبوعياً',
                        t('analytics.activity.recommendations.maintainActivity.tip3') || 'شارك أصدقاءك في النشاط'
                    ],
                    priority: 'low'
                });
            }
            
            // ✅ إضافة توصيات إضافية بناءً على البيانات
            if (activitiesCount > 0 && avgPerDay < 20) {
                insights.push({
                    type: 'duration_impact',
                    severity: 'medium',
                    message: t('analytics.activity.insights.shortDuration') || '⏱️ أنشطتك قصيرة المدة',
                    details: t('analytics.activity.insights.shortDurationDetails') || `متوسط مدة نشاطك ${avgPerDay} دقيقة فقط`
                });
            }
            
            if (bestActivity && activitiesCount > 0) {
                insights.push({
                    type: 'favorite_activity',
                    severity: 'low',
                    message: t('analytics.activity.insights.favoriteActivity') || '🎯 نشاطك المفضل',
                    details: t('analytics.activity.insights.favoriteActivityDetails') || `أكثر نشاط تمارسه هو ${bestActivity}`
                });
            }
            
            if (weekProgress === 100) {
                insights.push({
                    type: 'achievement',
                    severity: 'success',
                    message: t('analytics.activity.insights.achievement') || '🏆 إنجاز رائع',
                    details: t('analytics.activity.insights.achievementDetails') || 'لقد حققت الهدف الأسبوعي للنشاط!'
                });
            }
            
            const summary = {
                totalMinutes: totalActivity,
                totalCalories: totalCalories,
                activitiesCount: activitiesCount,
                avgPerDay: avgPerDay,
                bestActivity: bestActivity,
                weekProgress: weekProgress
            };
            
            setActivityInsights({
                summary,
                insights,
                recommendations,
                lastUpdated: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('❌ Error fetching analytics:', err);
            if (isMountedRef.current) {
                setError(t('analytics.common.error'));
                setActivityInsights(null);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    };

    // ✅ دالة مساعدة للحصول على أيقونة النشاط المفضل
    const getBestActivityIcon = (activity) => {
        if (!activity) return '🏃';
        if (activity.includes('المشي')) return '🚶';
        if (activity.includes('الجري')) return '🏃';
        if (activity.includes('يوجا')) return '🧘';
        if (activity.includes('قلب')) return '❤️';
        if (activity.includes('أثقال')) return '🏋️';
        return '🏅';
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.activity.loading') || 'جاري تحليل نشاطك...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('analytics.common.retry') || 'إعادة المحاولة'}
                </button>
            </div>
        );
    }

    if (!activityInsights) {
        return (
            <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>🧠 {t('analytics.activity.title') || 'تحليلات النشاط الذكية'}</h2>
                    <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh') || 'تحديث'}>
                        🔄
                    </button>
                </div>
                <div className="no-data">
                    <p>📊 {t('analytics.common.noData') || 'لا توجد بيانات كافية'}</p>
                    <p className="hint">{t('analytics.activity.startTracking') || 'قم بتسجيل أنشطتك الرياضية للحصول على تحليلات مخصصة'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>🧠 {t('analytics.activity.title') || 'تحليلات النشاط الذكية'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh') || 'تحديث'}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* بطاقة الملخص */}
                <div className="summary-card">
                    <h3>{t('analytics.activity.currentActivity') || 'نشاطك الحالي'}</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalMinutes}</span>
                            <span className="stat-label">{t('analytics.activity.totalMinutes') || 'إجمالي الدقائق'}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalCalories}</span>
                            <span className="stat-label">{t('analytics.activity.totalCalories') || 'إجمالي السعرات'}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.activitiesCount}</span>
                            <span className="stat-label">{t('analytics.activity.activitiesCount') || 'عدد الأنشطة'}</span>
                        </div>
                    </div>
                    
                    {/* شريط التقدم الأسبوعي */}
                    <div className="progress-container">
                        <div className="progress-bar-bg">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${activityInsights.summary.weekProgress}%` }}
                            >
                                <span className="progress-text">
                                    {t('analytics.activity.weekProgress', { progress: activityInsights.summary.weekProgress }) || `${activityInsights.summary.weekProgress}% من هدف الأسبوع`}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* النشاط المفضل */}
                    {activityInsights.summary.bestActivity && (
                        <div className="best-activity">
                            <span className="best-icon">{getBestActivityIcon(activityInsights.summary.bestActivity)}</span>
                            <span className="best-text">
                                {t('analytics.activity.bestActivity') || 'نشاطك المفضل'}: {activityInsights.summary.bestActivity}
                            </span>
                        </div>
                    )}
                </div>

                {/* عوامل التأثير */}
                {activityInsights.insights && activityInsights.insights.length > 0 && (
                    <div className="factors-card">
                        <h3>{t('analytics.activity.factors.title') || 'رؤى وتحليلات'}</h3>
                        <div className="factors-list">
                            {activityInsights.insights.map((insight, idx) => (
                                <div key={idx} className={`factor-item severity-${insight.severity}`}>
                                    <div className="factor-icon">
                                        {insight.type === 'sleep_impact' && '😴'}
                                        {insight.type === 'mood_impact' && '😊'}
                                        {insight.type === 'nutrition_impact' && '🥗'}
                                        {insight.type === 'weight_impact' && '⚖️'}
                                        {insight.type === 'bp_impact' && '❤️'}
                                        {insight.type === 'glucose_impact' && '🩸'}
                                        {insight.type === 'duration_impact' && '⏱️'}
                                        {insight.type === 'favorite_activity' && '🎯'}
                                        {insight.type === 'achievement' && '🏆'}
                                    </div>
                                    <div className="factor-content">
                                        <p className="factor-message">{insight.message}</p>
                                        {insight.details && <p className="factor-details">{insight.details}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* التوصيات */}
                {activityInsights.recommendations && activityInsights.recommendations.length > 0 && (
                    <div className="recommendations-card">
                        <h3>{t('analytics.activity.recommendations.title') || 'توصيات ذكية'}</h3>
                        <div className="recommendations-list">
                            {activityInsights.recommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon}</span>
                                        <span className="rec-title">{rec.title}</span>
                                    </div>
                                    <p className="rec-main">{rec.mainAdvice}</p>
                                    <p className="rec-based">📌 {rec.basedOn}</p>
                                    {rec.tips && rec.tips.length > 0 && (
                                        <ul className="rec-tips">
                                            {rec.tips.map((tip, i) => (
                                                <li key={i}>💡 {tip}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="analytics-footer">
                    <small>
                        {t('analytics.common.lastUpdate') || 'آخر تحديث'}: {new Date(activityInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ActivityAnalytics;