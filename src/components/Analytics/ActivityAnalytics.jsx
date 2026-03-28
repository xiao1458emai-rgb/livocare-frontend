// src/components/Analytics/ActivityAnalytics.jsx
import React, { useState, useEffect } from 'react';
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

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            
            const [
                activitiesRes,
                sleepRes,
                moodRes,
                habitsRes,
                nutritionRes,
                healthRes
            ] = await Promise.all([
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] }))
            ]);

            // ✅ التأكد من أن البيانات مصفوفات
            const allData = {
                activities: Array.isArray(activitiesRes.data) ? activitiesRes.data : [],
                sleep: Array.isArray(sleepRes.data) ? sleepRes.data : [],
                mood: Array.isArray(moodRes.data) ? moodRes.data : [],
                habits: Array.isArray(habitsRes.data) ? habitsRes.data : [],
                nutrition: Array.isArray(nutritionRes.data) ? nutritionRes.data : [],
                health: Array.isArray(healthRes.data) ? healthRes.data : []
            };
            
            const analysis = analyzeActivityRecommendations(allData);
            setActivityInsights(analysis);

        } catch (err) {
            console.error('❌ Error:', err);
            setError(t('analytics.common.error'));
            setActivityInsights(null);
        } finally {
            setLoading(false);
        }
    };

    // ✅ دالة مساعدة لحساب متوسط المزاج
    const getMoodScore = (mood) => {
        const map = { 
            'Excellent': 5, 'ممتاز': 5,
            'Good': 4, 'جيد': 4,
            'Neutral': 3, 'محايد': 3,
            'Stressed': 2, 'مرهق': 2,
            'Anxious': 2, 'قلق': 2,
            'Sad': 1, 'حزين': 1
        };
        return map[mood] || 3;
    };

    const analyzeActivityRecommendations = (allData) => {
        const { activities, sleep, mood, habits, nutrition, health } = allData;

        // ✅ حساب إحصائيات النشاط
        const activityMinutes = activities
            .map(a => a.duration_minutes || 0)
            .filter(m => m > 0 && m <= 180); // تصفية القيم غير المنطقية
        
        const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);
        const avgActivity = safeMean(activityMinutes);
        const activitiesCount = activities.length;

        // ✅ حساب عوامل التأثير بأمان
        const sleepHours = sleep
            .map(s => parseFloat(s.duration_hours) || 0)
            .filter(h => h > 0 && h < 24);
        
        const sleepQualities = sleep
            .map(s => s.quality_rating || 3)
            .filter(q => q >= 1 && q <= 5);
        
        const moodScores = mood.map(m => getMoodScore(m.mood));
        
        const habitCompletion = habits.map(h => h.is_completed ? 1 : 0);
        
        const calories = nutrition
            .map(n => n.total_calories || 0)
            .filter(c => c > 0 && c < 5000);
        
        // ✅ الحصول على آخر قراءات صحية صالحة
        const lastHealth = health.find(h => h.weight_kg && parseFloat(h.weight_kg) > 0);
        const previousHealth = health.filter(h => h.weight_kg && parseFloat(h.weight_kg) > 0)[1];

        const factors = {
            sleep: {
                avgHours: safeMean(sleepHours),
                avgQuality: safeMean(sleepQualities),
                lastSleep: sleep.length > 0 ? sleep[0] : null
            },
            mood: {
                avgScore: safeMean(moodScores),
                lastMood: mood.length > 0 ? mood[0] : null
            },
            habits: {
                completionRate: safeMean(habitCompletion),
                totalHabits: habits.length
            },
            nutrition: {
                avgCalories: safeMean(calories),
                mealsCount: nutrition.length
            },
            health: {
                currentWeight: lastHealth ? parseFloat(lastHealth.weight_kg) : 0,
                lastWeight: previousHealth ? parseFloat(previousHealth.weight_kg) : null,
                systolic: lastHealth ? lastHealth.systolic_pressure || 0 : 0,
                diastolic: lastHealth ? lastHealth.diastolic_pressure || 0 : 0,
                glucose: lastHealth ? parseFloat(lastHealth.blood_glucose) || 0 : 0
            }
        };

        const insights = [];

        // ✅ تحليل تأثير النوم
        if (factors.sleep.avgHours > 0 && factors.sleep.avgHours < 6 && totalActivity < 100) {
            insights.push({
                type: 'sleep_impact',
                severity: 'high',
                message: t('analytics.activity.insights.sleepImpact'),
                details: t('analytics.activity.insights.sleepImpactDetails', { hours: factors.sleep.avgHours.toFixed(1) })
            });
        }

        // ✅ تحليل تأثير المزاج
        if (factors.mood.avgScore > 0 && factors.mood.avgScore < 3 && totalActivity < 100) {
            insights.push({
                type: 'mood_impact',
                severity: 'medium',
                message: t('analytics.activity.insights.moodImpact'),
                details: t('analytics.activity.insights.moodImpactDetails')
            });
        }

        // ✅ تحليل تأثير التغذية
        if (factors.nutrition.avgCalories > 0 && factors.nutrition.avgCalories < 1500 && totalActivity < 100) {
            insights.push({
                type: 'nutrition_impact',
                severity: 'high',
                message: t('analytics.activity.insights.nutritionImpact'),
                details: t('analytics.activity.insights.nutritionImpactDetails', { calories: Math.round(factors.nutrition.avgCalories) })
            });
        }

        // ✅ تحليل تأثير الوزن (مع نطاقات منطقية)
        if (factors.health.currentWeight > 0) {
            if (factors.health.currentWeight > 100 && totalActivity < 100) {
                insights.push({
                    type: 'weight_impact',
                    severity: 'medium',
                    message: t('analytics.activity.insights.weightImpact'),
                    details: t('analytics.activity.insights.weightImpactDetails')
                });
            } else if (factors.health.currentWeight < 50 && totalActivity < 100) {
                insights.push({
                    type: 'weight_impact',
                    severity: 'medium',
                    message: t('analytics.activity.insights.weightLowImpact'),
                    details: t('analytics.activity.insights.weightLowImpactDetails')
                });
            }
        }

        // ✅ تحليل تأثير ضغط الدم
        if (factors.health.systolic > 140 && totalActivity < 100) {
            insights.push({
                type: 'bp_impact',
                severity: 'high',
                message: t('analytics.activity.insights.bpImpact'),
                details: t('analytics.activity.insights.bpImpactDetails')
            });
        }

        // ✅ تحليل تأثير السكر
        if (factors.health.glucose > 140 && totalActivity < 100) {
            insights.push({
                type: 'glucose_impact',
                severity: 'high',
                message: t('analytics.activity.insights.glucoseImpact'),
                details: t('analytics.activity.insights.glucoseImpactDetails')
            });
        }

        const recommendations = [];

        // ✅ توصية زيادة النشاط
        if (totalActivity < 150) {
            const needed = 150 - totalActivity;
            const weeklyNeeded = Math.ceil(needed / 5);
            
            recommendations.push({
                icon: '🏃',
                title: t('analytics.activity.recommendations.increaseActivity.title'),
                mainAdvice: t('analytics.activity.recommendations.increaseActivity.advice', { minutes: needed }),
                basedOn: analyzeWhyNeeded(factors, insights, t),
                tips: generateActivityTips(factors, weeklyNeeded, t),
                priority: 'high'
            });
        } else if (totalActivity >= 150) {
            recommendations.push({
                icon: '🏆',
                title: t('analytics.activity.recommendations.maintainActivity.title'),
                mainAdvice: t('analytics.activity.recommendations.maintainActivity.advice'),
                basedOn: t('analytics.activity.recommendations.maintainActivity.basedOn'),
                tips: [
                    t('analytics.activity.recommendations.maintainActivity.tip1'),
                    t('analytics.activity.recommendations.maintainActivity.tip2'),
                    t('analytics.activity.recommendations.maintainActivity.tip3')
                ],
                priority: 'low'
            });
        }

        // ✅ توصية تحسين الجودة
        const needsQualityImprovement = 
            (factors.sleep.avgHours > 0 && factors.sleep.avgHours < 6) ||
            (factors.mood.avgScore > 0 && factors.mood.avgScore < 3) ||
            (factors.nutrition.avgCalories > 0 && factors.nutrition.avgCalories < 1500);
        
        if (needsQualityImprovement) {
            recommendations.push({
                icon: '⚡',
                title: t('analytics.activity.recommendations.improveQuality.title'),
                mainAdvice: t('analytics.activity.recommendations.improveQuality.advice'),
                basedOn: extractMainFactor(factors, t),
                tips: getQualityTips(factors, t),
                priority: 'medium'
            });
        }

        // ✅ توصية وقت النوم
        const now = new Date();
        const hour = now.getHours();
        if (hour >= 20 || hour <= 5) {
            recommendations.push({
                icon: '🌙',
                title: t('analytics.activity.recommendations.sleepTime.title'),
                mainAdvice: t('analytics.activity.recommendations.sleepTime.advice'),
                basedOn: t('analytics.activity.recommendations.sleepTime.basedOn'),
                tips: [
                    t('analytics.activity.recommendations.sleepTime.tip1'),
                    t('analytics.activity.recommendations.sleepTime.tip2'),
                    t('analytics.activity.recommendations.sleepTime.tip3')
                ],
                priority: 'low'
            });
        }

        // ✅ الملخص
        const summary = {
            totalMinutes: totalActivity,
            totalCalories: activities.reduce((a, b) => a + (b.calories_burned || 0), 0),
            activitiesCount,
            avgPerDay: activitiesCount > 0 ? Math.round(totalActivity / activitiesCount) : 0,
            bestActivity: findBestActivity(activities),
            weekProgress: Math.min(100, Math.round((totalActivity / 150) * 100))
        };

        return {
            summary,
            insights,
            recommendations,
            lastUpdated: new Date().toISOString()
        };
    };

    const analyzeWhyNeeded = (factors, insights, t) => {
        if (insights.length === 0) return t('analytics.activity.reasons.general');
        
        const mainInsight = insights[0];
        if (mainInsight.type === 'sleep_impact') return t('analytics.activity.reasons.sleep');
        if (mainInsight.type === 'nutrition_impact') return t('analytics.activity.reasons.nutrition');
        if (mainInsight.type === 'weight_impact') return t('analytics.activity.reasons.weight');
        if (mainInsight.type === 'bp_impact') return t('analytics.activity.reasons.bp');
        if (mainInsight.type === 'glucose_impact') return t('analytics.activity.reasons.glucose');
        
        return t('analytics.activity.reasons.general');
    };

    const generateActivityTips = (factors, dailyNeeded, t) => {
        const tips = [];
        
        // ✅ نطاق معقول للنشاط
        const walkingMinutes = Math.min(dailyNeeded, 30);
        tips.push(t('analytics.activity.tips.walkDaily', { minutes: walkingMinutes }));

        if (factors.sleep.avgHours > 0 && factors.sleep.avgHours < 6) {
            tips.push(t('analytics.activity.tips.nap'));
        }
        if (factors.mood.avgScore > 0 && factors.mood.avgScore < 3) {
            tips.push(t('analytics.activity.tips.music'));
        }
        if (factors.nutrition.avgCalories > 0 && factors.nutrition.avgCalories < 1500) {
            tips.push(t('analytics.activity.tips.banana'));
        }
        if (factors.health.systolic > 140) {
            tips.push(t('analytics.activity.tips.gentleStart'));
        }

        return tips.slice(0, 4);
    };

    const extractMainFactor = (factors, t) => {
        if (factors.sleep.avgHours > 0 && factors.sleep.avgHours < 6) return t('analytics.activity.factors.sleep');
        if (factors.mood.avgScore > 0 && factors.mood.avgScore < 3) return t('analytics.activity.factors.mood');
        if (factors.nutrition.avgCalories > 0 && factors.nutrition.avgCalories < 1500) return t('analytics.activity.factors.nutrition');
        return t('analytics.activity.factors.multiple');
    };

    const getQualityTips = (factors, t) => {
        const tips = [];
        if (factors.sleep.avgHours > 0 && factors.sleep.avgHours < 6) tips.push(t('analytics.activity.qualityTips.sleep'));
        if (factors.nutrition.avgCalories > 0 && factors.nutrition.avgCalories < 1500) tips.push(t('analytics.activity.qualityTips.nutrition'));
        if (factors.mood.avgScore > 0 && factors.mood.avgScore < 3) tips.push(t('analytics.activity.qualityTips.mood'));
        tips.push(t('analytics.activity.qualityTips.focus'));
        return tips.slice(0, 3);
    };

    const findBestActivity = (activities) => {
        if (activities.length === 0) return null;
        
        const activityCounts = {};
        activities.forEach(a => {
            if (a.activity_type) {
                activityCounts[a.activity_type] = (activityCounts[a.activity_type] || 0) + 1;
            }
        });
        
        const best = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
        return best ? best[0] : null;
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.activity.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('analytics.common.retry')}
                </button>
            </div>
        );
    }

    if (!activityInsights || activityInsights.summary.totalMinutes === 0) {
        return (
            <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>{t('analytics.activity.title')}</h2>
                    <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh')}>
                        🔄
                    </button>
                </div>
                <div className="no-data">
                    <p>📊 {t('analytics.common.noData')}</p>
                    <p className="hint">{t('analytics.activity.startTracking')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{t('analytics.activity.title')}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh')}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* بطاقة الملخص */}
                <div className="summary-card">
                    <h3>{t('analytics.activity.currentActivity')}</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalMinutes}</span>
                            <span className="stat-label">{t('analytics.activity.totalMinutes')}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalCalories}</span>
                            <span className="stat-label">{t('analytics.activity.totalCalories')}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.activitiesCount}</span>
                            <span className="stat-label">{t('analytics.activity.activitiesCount')}</span>
                        </div>
                    </div>
                    
                    <div className="progress-container">
                        <div className="progress-bar-bg">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${activityInsights.summary.weekProgress}%` }}
                            >
                                <span className="progress-text">
                                    {t('analytics.activity.weekProgress', { progress: activityInsights.summary.weekProgress })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* عوامل التأثير */}
                {activityInsights.insights.length > 0 && (
                    <div className="factors-card">
                        <h3>{t('analytics.activity.factors.title')}</h3>
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
                                    </div>
                                    <div className="factor-content">
                                        <p className="factor-message">{insight.message}</p>
                                        <p className="factor-details">{insight.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* التوصيات */}
                <div className="recommendations-card">
                    <h3>{t('analytics.activity.recommendations.title')}</h3>
                    <div className="recommendations-list">
                        {activityInsights.recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation priority-${rec.priority}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-title">{rec.title}</span>
                                </div>
                                <p className="rec-main">{rec.mainAdvice}</p>
                                <p className="rec-based">📌 {rec.basedOn}</p>
                                <ul className="rec-tips">
                                    {rec.tips.map((tip, i) => (
                                        <li key={i}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="analytics-footer">
                    <small>
                        {t('analytics.common.lastUpdate')}: {new Date(activityInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ActivityAnalytics;