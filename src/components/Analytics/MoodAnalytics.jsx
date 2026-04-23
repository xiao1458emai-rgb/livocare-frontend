// src/components/Analytics/MoodAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Analytics.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة للحصول على درجة المزاج
const getMoodScore = (mood) => {
    const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
    return map[mood] || 3;
};

// دالة للحصول على أيقونة المزاج
const getMoodEmoji = (mood) => {
    const map = {
        'Excellent': '😊', 'Good': '🙂', 'Neutral': '😐',
        'Stressed': '😫', 'Anxious': '😰', 'Sad': '😢'
    };
    return map[mood] || '😐';
};

// دالة للحصول على نص المزاج المترجم
const getMoodText = (mood, t) => {
    const map = {
        'Excellent': t('mood.excellent'),
        'Good': t('mood.good'),
        'Neutral': t('mood.neutral'),
        'Stressed': t('mood.stressed'),
        'Anxious': t('mood.anxious'),
        'Sad': t('mood.sad')
    };
    return map[mood] || mood;
};

// دالة لتحليل أيام الأسبوع - ✅ تم إصلاح i18n
const analyzeDayPatterns = (moodRecords, t, isArabic) => {
    if (moodRecords.length < 7) return null;

    const dayScores = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    
    moodRecords.forEach(record => {
        const day = record.date.getDay();
        dayScores[day].push(record.score);
    });
    
    let bestDay = null, worstDay = null;
    let bestScore = 0, worstScore = 5;
    let bestCount = 0, worstCount = 0;
    
    // ✅ أيام الأسبوع بالعربية والإنجليزية
    const dayNamesAr = {
        0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء',
        3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت'
    };
    
    const dayNamesEn = {
        0: 'Sunday', 1: 'Monday', 2: 'Tuesday',
        3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    };
    
    const dayNames = isArabic ? dayNamesAr : dayNamesEn;
    
    Object.entries(dayScores).forEach(([day, scores]) => {
        if (scores.length >= 2) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > bestScore) {
                bestScore = avg;
                bestDay = dayNames[parseInt(day)];
                bestCount = scores.length;
            }
            if (avg < worstScore) {
                worstScore = avg;
                worstDay = dayNames[parseInt(day)];
                worstCount = scores.length;
            }
        }
    });
    
    if (bestDay && worstDay && bestDay !== worstDay) {
        return {
            type: 'day_pattern',
            icon: '📅',
            title: t('analytics.mood.patterns.dayTitle', 'نمط أيام الأسبوع'),
            bestDay,
            worstDay,
            bestScore: roundNumber(bestScore, 1),
            worstScore: roundNumber(worstScore, 1),
            bestCount,
            worstCount
        };
    }
    
    return null;
};

// دالة لتحليل أوقات اليوم
const analyzeTimePatterns = (moodRecords, t, isArabic) => {
    if (moodRecords.length < 5) return null;
    
    const timeSlots = {
        morning: { scores: [], label: isArabic ? 'الصباح' : 'Morning', hours: [5, 12] },
        afternoon: { scores: [], label: isArabic ? 'الظهيرة' : 'Afternoon', hours: [12, 17] },
        evening: { scores: [], label: isArabic ? 'المساء' : 'Evening', hours: [17, 21] },
        night: { scores: [], label: isArabic ? 'الليل' : 'Night', hours: [21, 5] }
    };
    
    moodRecords.forEach(record => {
        const hour = record.date.getHours();
        
        if (hour >= 5 && hour < 12) timeSlots.morning.scores.push(record.score);
        else if (hour >= 12 && hour < 17) timeSlots.afternoon.scores.push(record.score);
        else if (hour >= 17 && hour < 21) timeSlots.evening.scores.push(record.score);
        else timeSlots.night.scores.push(record.score);
    });
    
    let bestTime = null;
    let bestScore = 0;
    
    Object.entries(timeSlots).forEach(([key, slot]) => {
        if (slot.scores.length >= 2) {
            const avg = slot.scores.reduce((a, b) => a + b, 0) / slot.scores.length;
            if (avg > bestScore) {
                bestScore = avg;
                bestTime = slot.label;
            }
        }
    });
    
    if (bestTime) {
        return {
            type: 'time_pattern',
            icon: '⏰',
            title: t('analytics.mood.patterns.timeTitle', 'أفضل وقت للمزاج'),
            bestTime,
            bestScore: roundNumber(bestScore, 1)
        };
    }
    
    return null;
};

// دالة لتحليل الاتجاه
const analyzeTrend = (moodRecords, t) => {
    if (moodRecords.length < 5) return null;
    
    const recent = moodRecords.slice(-5);
    const previous = moodRecords.slice(-10, -5);
    
    if (previous.length < 3) return null;
    
    const recentAvg = recent.reduce((a, b) => a + b.score, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b.score, 0) / previous.length;
    const difference = recentAvg - previousAvg;
    
    if (Math.abs(difference) < 0.2) return null;
    
    if (difference > 0.2) {
        return {
            type: 'improving',
            icon: '📈',
            title: t('analytics.mood.trend.improving', 'مزاجك يتحسن'),
            message: t('analytics.mood.trend.improvingMessage', 'نلاحظ تحسناً في مزاجك خلال الأيام الأخيرة'),
            difference: roundNumber(difference, 1)
        };
    } else if (difference < -0.2) {
        return {
            type: 'declining',
            icon: '📉',
            title: t('analytics.mood.trend.declining', 'مزاجك في انخفاض'),
            message: t('analytics.mood.trend.decliningMessage', 'نلاحظ انخفاضاً في مزاجك خلال الأيام الأخيرة'),
            difference: roundNumber(Math.abs(difference), 1)
        };
    }
    
    return null;
};

// دالة لتحليل تأثير النوم على المزاج
const analyzeSleepImpact = (sleepRecords, moodRecords, t) => {
    if (sleepRecords.length < 5 || moodRecords.length < 5) return null;
    
    const sleepByDay = {};
    sleepRecords.forEach(sleep => {
        const date = new Date(sleep.sleep_start || sleep.start_time).toDateString();
        const duration = sleep.duration_hours || 
            ((new Date(sleep.sleep_end || sleep.end_time) - new Date(sleep.sleep_start || sleep.start_time)) / (1000 * 60 * 60));
        sleepByDay[date] = duration;
    });
    
    const goodSleepDays = [];
    const badSleepDays = [];
    
    moodRecords.forEach(mood => {
        const date = mood.date.toDateString();
        const sleepHours = sleepByDay[date];
        
        if (sleepHours) {
            if (sleepHours >= 7) {
                goodSleepDays.push(mood.score);
            } else if (sleepHours < 6) {
                badSleepDays.push(mood.score);
            }
        }
    });
    
    if (goodSleepDays.length >= 3 && badSleepDays.length >= 3) {
        const goodAvg = goodSleepDays.reduce((a, b) => a + b, 0) / goodSleepDays.length;
        const badAvg = badSleepDays.reduce((a, b) => a + b, 0) / badSleepDays.length;
        const difference = goodAvg - badAvg;
        
        if (difference > 0.5) {
            return {
                type: 'sleep_impact',
                icon: '😴',
                title: t('analytics.mood.impacts.sleep', 'تأثير النوم على مزاجك'),
                message: t('analytics.mood.impacts.sleepMessage', 'عندما تنام جيداً، يتحسن مزاجك'),
                difference: roundNumber(difference, 1)
            };
        }
    }
    
    return null;
};

// دالة لتحليل تأثير النشاط على المزاج
const analyzeActivityImpact = (activities, moodRecords, t) => {
    if (activities.length < 5 || moodRecords.length < 5) return null;
    
    const activityByDay = {};
    activities.forEach(activity => {
        const date = new Date(activity.date || activity.created_at || activity.start_time).toDateString();
        const duration = activity.duration_minutes || 0;
        if (!activityByDay[date]) activityByDay[date] = 0;
        activityByDay[date] += duration;
    });
    
    const activeDays = [];
    const inactiveDays = [];
    
    moodRecords.forEach(mood => {
        const date = mood.date.toDateString();
        const activityMinutes = activityByDay[date] || 0;
        
        if (activityMinutes >= 30) {
            activeDays.push(mood.score);
        } else if (activityMinutes < 10) {
            inactiveDays.push(mood.score);
        }
    });
    
    if (activeDays.length >= 3 && inactiveDays.length >= 3) {
        const activeAvg = activeDays.reduce((a, b) => a + b, 0) / activeDays.length;
        const inactiveAvg = inactiveDays.reduce((a, b) => a + b, 0) / inactiveDays.length;
        const difference = activeAvg - inactiveAvg;
        
        if (difference > 0.3) {
            return {
                type: 'activity_impact',
                icon: '🏃',
                title: t('analytics.mood.impacts.activity', 'تأثير النشاط على مزاجك'),
                message: t('analytics.mood.impacts.activityMessage', 'النشاط البدني يحسن مزاجك'),
                difference: roundNumber(difference, 1)
            };
        }
    }
    
    return null;
};

// دالة لاكتشاف انخفاض المزاج
const detectMoodDecline = (moodRecords, t) => {
    if (moodRecords.length < 3) return null;
    
    const recent = moodRecords.slice(-5);
    let consecutiveLow = 0;
    const lowMoods = ['Stressed', 'Anxious', 'Sad'];
    
    for (let i = recent.length - 1; i >= 0; i--) {
        if (lowMoods.includes(recent[i].raw)) {
            consecutiveLow++;
        } else {
            break;
        }
    }
    
    if (consecutiveLow >= 3) {
        return {
            type: 'decline_alert',
            icon: '⚠️',
            title: t('analytics.mood.alerts.decline', 'انخفاض مستمر في المزاج'),
            message: t('analytics.mood.alerts.declineMessage', `انخفض مزاجك لمدة ${consecutiveLow} أيام متتالية`),
            severity: consecutiveLow >= 5 ? 'high' : 'medium',
            days: consecutiveLow
        };
    }
    
    return null;
};

// دالة لتوليد التوصيات
const generateRecommendations = (analysis, t) => {
    const recommendations = [];
    
    if (analysis.trend?.type === 'declining') {
        recommendations.push({
            icon: '💙',
            title: t('analytics.mood.recommendations.declining.title', 'اهتم بنفسك'),
            advice: t('analytics.mood.recommendations.declining.advice', 'لاحظنا انخفاضاً في مزاجك، خذ وقتاً للراحة'),
            tips: [
                t('analytics.mood.recommendations.declining.tip1', 'تحدث مع شخص تثق به'),
                t('analytics.mood.recommendations.declining.tip2', 'قم بنشاط تحبه'),
                t('analytics.mood.recommendations.declining.tip3', 'اكتب مشاعرك')
            ]
        });
    }
    
    if (analysis.sleepImpact) {
        recommendations.push({
            icon: '😴',
            title: t('analytics.mood.recommendations.sleep.title', 'حسّن نومك'),
            advice: t('analytics.mood.recommendations.sleep.advice', 'النوم الجيد يحسن مزاجك'),
            tips: [
                t('analytics.mood.recommendations.sleep.tip1', 'نم 7-8 ساعات يومياً'),
                t('analytics.mood.recommendations.sleep.tip2', 'تجنب الشاشات قبل النوم'),
                t('analytics.mood.recommendations.sleep.tip3', 'احرص على وقت نوم منتظم')
            ]
        });
    }
    
    if (analysis.activityImpact) {
        recommendations.push({
            icon: '🏃',
            title: t('analytics.mood.recommendations.activity.title', 'زد نشاطك'),
            advice: t('analytics.mood.recommendations.activity.advice', 'النشاط البدني يحسن المزاج'),
            tips: [
                t('analytics.mood.recommendations.activity.tip1', 'امشِ 30 دقيقة يومياً'),
                t('analytics.mood.recommendations.activity.tip2', 'جرب تمارين الاسترخاء'),
                t('analytics.mood.recommendations.activity.tip3', 'استمع للموسيقى أثناء المشي')
            ]
        });
    }
    
    if (analysis.dayPattern && analysis.dayPattern.bestDay) {
        recommendations.push({
            icon: '📅',
            title: t('analytics.mood.recommendations.dayPattern.title', 'استغل أيامك الجيدة'),
            advice: `أيام ${analysis.dayPattern.bestDay} هي الأفضل لك`,
            tips: [
                t('analytics.mood.recommendations.dayPattern.tip1', 'خطط لأنشطتك المهمة في أيامك الجيدة'),
                t('analytics.mood.recommendations.dayPattern.tip2', 'كن لطيفاً مع نفسك في الأيام الأخرى')
            ]
        });
    }
    
    if (analysis.timePattern) {
        recommendations.push({
            icon: '⏰',
            title: t('analytics.mood.recommendations.timePattern.title', 'أفضل وقت لمزاجك'),
            advice: `وقت ${analysis.timePattern.bestTime} هو الأفضل لمزاجك`,
            tips: [
                t('analytics.mood.recommendations.timePattern.tip1', 'استغل هذا الوقت للإبداع'),
                t('analytics.mood.recommendations.timePattern.tip2', 'خطط لمهامك المهمة في هذا الوقت')
            ]
        });
    }
    
    if (recommendations.length === 0 && analysis.hasData) {
        recommendations.push({
            icon: '🌟',
            title: t('analytics.mood.recommendations.default.title', 'استمر على ما أنت عليه'),
            advice: t('analytics.mood.recommendations.default.advice', 'مزاجك متوازن، استمر في عاداتك الجيدة'),
            tips: [
                t('analytics.mood.recommendations.default.tip1', 'واصل تسجيل مزاجك'),
                t('analytics.mood.recommendations.default.tip2', 'شارك إيجابيتك مع الآخرين')
            ]
        });
    }
    
    return recommendations;
};

// ======================== المكون الرئيسي ========================
const MoodAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const isMountedRef = useRef(true);
    const isArabic = i18n.language === 'ar';
    const [darkMode, setDarkMode] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    const fetchAllData = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const [moodRes, sleepRes, activitiesRes] = await Promise.all([
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            let moodDataRaw = moodRes.data?.results || (Array.isArray(moodRes.data) ? moodRes.data : []);
            let sleepDataRaw = sleepRes.data?.results || (Array.isArray(sleepRes.data) ? sleepRes.data : []);
            let activitiesDataRaw = activitiesRes.data?.results || (Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
            
            const moodRecords = moodDataRaw.map(m => ({
                date: new Date(m.entry_time || m.date),
                score: getMoodScore(m.mood),
                raw: m.mood,
                factors: m.factors || '',
                notes: m.text_entry || ''
            })).sort((a, b) => a.date - b.date);
            
            const sleepRecords = sleepDataRaw;
            const activities = activitiesDataRaw;
            
            console.log('📊 MoodAnalytics - Starting analysis...');
            console.log(`Mood records: ${moodRecords.length}, Sleep: ${sleepRecords.length}, Activities: ${activities.length}`);
            
            let analysisResult = null;
            
            if (moodRecords.length === 0) {
                analysisResult = {
                    hasData: false,
                    message: t('analytics.mood.noData', 'لا توجد بيانات كافية للتحليل. قم بتسجيل مزاجك أولاً!'),
                    recommendations: generateRecommendations({ hasData: false }, t)
                };
            } else {
                const trend = analyzeTrend(moodRecords, t);
                const dayPattern = analyzeDayPatterns(moodRecords, t, isArabic);
                const timePattern = analyzeTimePatterns(moodRecords, t, isArabic);
                const sleepImpact = analyzeSleepImpact(sleepRecords, moodRecords, t);
                const activityImpact = analyzeActivityImpact(activities, moodRecords, t);
                const declineAlert = detectMoodDecline(moodRecords, t);
                
                const scores = moodRecords.map(r => r.score);
                const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                
                const moodFrequency = {};
                moodRecords.forEach(r => { moodFrequency[r.raw] = (moodFrequency[r.raw] || 0) + 1; });
                let mostFrequentMood = 'Neutral';
                let maxCount = 0;
                for (const [mood, count] of Object.entries(moodFrequency)) {
                    if (count > maxCount) { maxCount = count; mostFrequentMood = mood; }
                }
                
                let predictionValue = null;
                let predictionTrend = '➡️';
                if (moodRecords.length >= 3) {
                    predictionValue = roundNumber(moodRecords.slice(-3).reduce((a, b) => a + b.score, 0) / 3, 1);
                    predictionTrend = trend ? (trend.type === 'improving' ? '📈' : '📉') : '➡️';
                }
                
                const fullAnalysis = {
                    hasData: true,
                    trend, dayPattern, timePattern, sleepImpact, activityImpact, declineAlert,
                    summary: {
                        avgMood: roundNumber(avgScore, 1),
                        totalDays: moodRecords.length,
                        mostFrequent: mostFrequentMood,
                        mostFrequentEmoji: getMoodEmoji(mostFrequentMood),
                        mostFrequentText: getMoodText(mostFrequentMood, t)
                    },
                    prediction: predictionValue ? {
                        value: predictionValue,
                        trend: predictionTrend
                    } : null,
                    recommendations: generateRecommendations({ trend, sleepImpact, activityImpact, dayPattern, timePattern, hasData: true }, t)
                };
                
                analysisResult = fullAnalysis;
            }
            
            if (isMountedRef.current) {
                setAnalysis(analysisResult);
            }
            
        } catch (err) {
            console.error('Error in MoodAnalytics fetchAllData:', err);
            if (isMountedRef.current) {
                setError(t('analytics.mood.error', 'حدث خطأ في تحليل المزاج'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [t, isArabic]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, refreshTrigger]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={`analytics-container mood-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{t('analytics.mood.title', 'تحليل المزاج')}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('common.refresh')}>
                    🔄
                </button>
            </div>

            {analysis && (
                <div className="insights-container">
                    {!analysis.hasData ? (
                        <div className="no-data-message">
                            <div className="message-icon">📝</div>
                            <p>{analysis.message}</p>
                            {analysis.recommendations?.map((rec, i) => (
                                <div key={i} className="start-tip">
                                    <span>{rec.icon}</span>
                                    <div>
                                        <strong>{rec.title}</strong>
                                        <p>{rec.advice}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* ✅ الإحصائيات السريعة - تم إصلاح i18n */}
                            <div className="quick-stats">
                                <div className="stat-box">
                                    <div className="stat-value">{analysis.summary.avgMood}</div>
                                    <div className="stat-label">{t('analytics.mood.avgMood', 'متوسط المزاج')}</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">{analysis.summary.totalDays}</div>
                                    <div className="stat-label">{t('analytics.mood.daysCount', 'أيام مسجلة')}</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">
                                        {analysis.summary.mostFrequentEmoji} {analysis.summary.mostFrequentText}
                                    </div>
                                    <div className="stat-label">{t('analytics.mood.mostFrequent', 'الأكثر تكراراً')}</div>
                                </div>
                            </div>

                            {/* ✅ التنبؤ - تم إصلاح placeholders */}
                            {analysis.prediction && (
                                <div className="prediction-box">
                                    <span className="prediction-icon">🔮</span>
                                    <span className="prediction-text">
                                        {t('analytics.mood.prediction.tomorrow', 'غداً')}: 
                                        <strong> {analysis.prediction.value}/5</strong> 
                                        <span className="prediction-trend"> {analysis.prediction.trend}</span>
                                    </span>
                                </div>
                            )}

                            {analysis.declineAlert && (
                                <div className={`alert-card ${analysis.declineAlert.severity}`}>
                                    <div className="alert-header">
                                        <span className="alert-icon">⚠️</span>
                                        <span className="alert-title">{analysis.declineAlert.title}</span>
                                    </div>
                                    <p className="alert-message">{analysis.declineAlert.message}</p>
                                </div>
                            )}

                            {analysis.trend && (
                                <div className="trend-card">
                                    <div className="trend-header">
                                        <span className="trend-icon">{analysis.trend.icon}</span>
                                        <span className="trend-title">{analysis.trend.title}</span>
                                    </div>
                                    <p className="trend-message">{analysis.trend.message}</p>
                                </div>
                            )}

                            {/* ✅ أنماط الأيام - تم إصلاح i18n */}
                            {analysis.dayPattern && (
                                <div className="pattern-card">
                                    <div className="pattern-header">
                                        <span className="pattern-icon">📅</span>
                                        <span className="pattern-title">{analysis.dayPattern.title}</span>
                                    </div>
                                    <div className="pattern-content">
                                        <p>
                                            <span className="good">👍 {analysis.dayPattern.bestDay}</span>
                                            <span className="separator"> | </span>
                                            <span className="bad">👎 {analysis.dayPattern.worstDay}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {analysis.timePattern && (
                                <div className="pattern-card">
                                    <div className="pattern-header">
                                        <span className="pattern-icon">⏰</span>
                                        <span className="pattern-title">{analysis.timePattern.title}</span>
                                    </div>
                                    <p className="pattern-content">
                                        {analysis.timePattern.bestTime}
                                    </p>
                                </div>
                            )}

                            {analysis.sleepImpact && (
                                <div className="impact-card">
                                    <div className="impact-header">
                                        <span className="impact-icon">😴</span>
                                        <span className="impact-title">{analysis.sleepImpact.title}</span>
                                    </div>
                                    <p className="impact-message">{analysis.sleepImpact.message}</p>
                                </div>
                            )}

                            {analysis.activityImpact && (
                                <div className="impact-card">
                                    <div className="impact-header">
                                        <span className="impact-icon">🏃</span>
                                        <span className="impact-title">{analysis.activityImpact.title}</span>
                                    </div>
                                    <p className="impact-message">{analysis.activityImpact.message}</p>
                                </div>
                            )}

                            {/* التوصيات */}
                            <div className="recommendations-section">
                                <h3>💡 {t('analytics.mood.recommendations.title', 'توصيات مخصصة')}</h3>
                                {analysis.recommendations?.map((rec, i) => (
                                    <div key={i} className="recommendation-card">
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-title">{rec.title}</span>
                                        </div>
                                        <p className="rec-advice">{rec.advice}</p>
                                        <ul className="rec-tips">
                                            {rec.tips?.map((tip, j) => (
                                                <li key={j}>{tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MoodAnalytics;