// src/components/Analytics/MoodAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

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

// دالة للحصول على نص المزاج
const getMoodText = (mood, isArabic) => {
    const mapAr = {
        'Excellent': 'ممتاز',
        'Good': 'جيد',
        'Neutral': 'محايد',
        'Stressed': 'مرهق',
        'Anxious': 'قلق',
        'Sad': 'حزين'
    };
    const mapEn = {
        'Excellent': 'Excellent',
        'Good': 'Good',
        'Neutral': 'Neutral',
        'Stressed': 'Stressed',
        'Anxious': 'Anxious',
        'Sad': 'Sad'
    };
    return isArabic ? (mapAr[mood] || mood) : (mapEn[mood] || mood);
};

// دالة لتحليل أيام الأسبوع
const analyzeDayPatterns = (moodRecords, isArabic) => {
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
            }
            if (avg < worstScore) {
                worstScore = avg;
                worstDay = dayNames[parseInt(day)];
            }
        }
    });
    
    if (bestDay && worstDay && bestDay !== worstDay) {
        return {
            type: 'day_pattern',
            icon: '📅',
            title: isArabic ? 'نمط أيام الأسبوع' : 'Weekly Pattern',
            bestDay,
            worstDay,
            bestScore: roundNumber(bestScore, 1),
            worstScore: roundNumber(worstScore, 1)
        };
    }
    return null;
};

// دالة لتحليل أوقات اليوم
const analyzeTimePatterns = (moodRecords, isArabic) => {
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
            title: isArabic ? 'أفضل وقت للمزاج' : 'Best Time for Mood',
            bestTime,
            bestScore: roundNumber(bestScore, 1)
        };
    }
    return null;
};

// دالة لتحليل الاتجاه
const analyzeTrend = (moodRecords, isArabic) => {
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
            title: isArabic ? 'مزاجك يتحسن' : 'Your mood is improving',
            message: isArabic ? 'نلاحظ تحسناً في مزاجك خلال الأيام الأخيرة' : 'We notice an improvement in your mood recently',
            difference: roundNumber(difference, 1)
        };
    } else if (difference < -0.2) {
        return {
            type: 'declining',
            icon: '📉',
            title: isArabic ? 'مزاجك في انخفاض' : 'Your mood is declining',
            message: isArabic ? 'نلاحظ انخفاضاً في مزاجك خلال الأيام الأخيرة' : 'We notice a decline in your mood recently',
            difference: roundNumber(Math.abs(difference), 1)
        };
    }
    return null;
};

// دالة لتحليل تأثير النوم على المزاج
const analyzeSleepImpact = (sleepRecords, moodRecords, isArabic) => {
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
            if (sleepHours >= 7) goodSleepDays.push(mood.score);
            else if (sleepHours < 6) badSleepDays.push(mood.score);
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
                title: isArabic ? 'تأثير النوم على مزاجك' : 'Sleep impact on your mood',
                message: isArabic ? 'النوم الجيد يحسن مزاجك' : 'Good sleep improves your mood',
                difference: roundNumber(difference, 1)
            };
        }
    }
    return null;
};

// دالة لتحليل تأثير النشاط على المزاج
const analyzeActivityImpact = (activities, moodRecords, isArabic) => {
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
        if (activityMinutes >= 30) activeDays.push(mood.score);
        else if (activityMinutes < 10) inactiveDays.push(mood.score);
    });
    
    if (activeDays.length >= 3 && inactiveDays.length >= 3) {
        const activeAvg = activeDays.reduce((a, b) => a + b, 0) / activeDays.length;
        const inactiveAvg = inactiveDays.reduce((a, b) => a + b, 0) / inactiveDays.length;
        const difference = activeAvg - inactiveAvg;
        
        if (difference > 0.3) {
            return {
                type: 'activity_impact',
                icon: '🏃',
                title: isArabic ? 'تأثير النشاط على مزاجك' : 'Activity impact on your mood',
                message: isArabic ? 'النشاط البدني يحسن مزاجك' : 'Physical activity improves your mood',
                difference: roundNumber(difference, 1)
            };
        }
    }
    return null;
};

// دالة لاكتشاف انخفاض المزاج
const detectMoodDecline = (moodRecords, isArabic) => {
    if (moodRecords.length < 3) return null;
    
    const recent = moodRecords.slice(-5);
    let consecutiveLow = 0;
    const lowMoods = ['Stressed', 'Anxious', 'Sad'];
    
    for (let i = recent.length - 1; i >= 0; i--) {
        if (lowMoods.includes(recent[i].raw)) consecutiveLow++;
        else break;
    }
    
    if (consecutiveLow >= 3) {
        return {
            type: 'decline_alert',
            icon: '⚠️',
            title: isArabic ? 'انخفاض مستمر في المزاج' : 'Continuous mood decline',
            message: isArabic ? `انخفض مزاجك لمدة ${consecutiveLow} أيام متتالية` : `Your mood has been low for ${consecutiveLow} consecutive days`,
            severity: consecutiveLow >= 5 ? 'high' : 'medium',
            days: consecutiveLow
        };
    }
    return null;
};

// دالة لتوليد التوصيات
const generateRecommendations = (analysis, isArabic) => {
    const recommendations = [];
    
    if (analysis.trend?.type === 'declining') {
        recommendations.push({
            icon: '💙',
            title: isArabic ? 'اهتم بنفسك' : 'Take care of yourself',
            advice: isArabic ? 'لاحظنا انخفاضاً في مزاجك، خذ وقتاً للراحة' : 'We noticed a decline in your mood, take time to rest',
            tips: isArabic ? [
                'تحدث مع شخص تثق به',
                'قم بنشاط تحبه',
                'اكتب مشاعرك'
            ] : [
                'Talk to someone you trust',
                'Do an activity you enjoy',
                'Write down your feelings'
            ]
        });
    }
    
    if (analysis.sleepImpact) {
        recommendations.push({
            icon: '😴',
            title: isArabic ? 'حسّن نومك' : 'Improve your sleep',
            advice: isArabic ? 'النوم الجيد يحسن مزاجك' : 'Good sleep improves your mood',
            tips: isArabic ? [
                'نم 7-8 ساعات يومياً',
                'تجنب الشاشات قبل النوم',
                'احرص على وقت نوم منتظم'
            ] : [
                'Sleep 7-8 hours daily',
                'Avoid screens before bed',
                'Keep a regular sleep schedule'
            ]
        });
    }
    
    if (analysis.activityImpact) {
        recommendations.push({
            icon: '🏃',
            title: isArabic ? 'زد نشاطك' : 'Increase your activity',
            advice: isArabic ? 'النشاط البدني يحسن المزاج' : 'Physical activity improves mood',
            tips: isArabic ? [
                'امشِ 30 دقيقة يومياً',
                'جرب تمارين الاسترخاء',
                'استمع للموسيقى أثناء المشي'
            ] : [
                'Walk 30 minutes daily',
                'Try relaxation exercises',
                'Listen to music while walking'
            ]
        });
    }
    
    if (analysis.dayPattern && analysis.dayPattern.bestDay) {
        recommendations.push({
            icon: '📅',
            title: isArabic ? 'استغل أيامك الجيدة' : 'Make the most of your good days',
            advice: isArabic ? `أيام ${analysis.dayPattern.bestDay} هي الأفضل لك` : `${analysis.dayPattern.bestDay} are your best days`,
            tips: isArabic ? [
                'خطط لأنشطتك المهمة في أيامك الجيدة',
                'كن لطيفاً مع نفسك في الأيام الأخرى'
            ] : [
                'Plan important activities on your good days',
                'Be kind to yourself on other days'
            ]
        });
    }
    
    if (analysis.timePattern) {
        recommendations.push({
            icon: '⏰',
            title: isArabic ? 'أفضل وقت لمزاجك' : 'Best time for your mood',
            advice: isArabic ? `وقت ${analysis.timePattern.bestTime} هو الأفضل لمزاجك` : `${analysis.timePattern.bestTime} is best for your mood`,
            tips: isArabic ? [
                'استغل هذا الوقت للإبداع',
                'خطط لمهامك المهمة في هذا الوقت'
            ] : [
                'Use this time for creative work',
                'Plan important tasks for this time'
            ]
        });
    }
    
    if (recommendations.length === 0 && analysis.hasData) {
        recommendations.push({
            icon: '🌟',
            title: isArabic ? 'استمر على ما أنت عليه' : 'Keep up the good work',
            advice: isArabic ? 'مزاجك متوازن، استمر في عاداتك الجيدة' : 'Your mood is balanced, keep up your good habits',
            tips: isArabic ? [
                'واصل تسجيل مزاجك',
                'شارك إيجابيتك مع الآخرين'
            ] : [
                'Continue tracking your mood',
                'Share your positivity with others'
            ]
        });
    }
    return recommendations;
};

// ======================== المكون الرئيسي ========================
const MoodAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const isMountedRef = useRef(true);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // إعادة جلب البيانات عند تغيير اللغة
                fetchAllData();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
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
            
            let analysisResult = null;
            
            if (moodRecords.length === 0) {
                analysisResult = {
                    hasData: false,
                    message: isArabic ? 'لا توجد بيانات كافية للتحليل. قم بتسجيل مزاجك أولاً!' : 'Insufficient data for analysis. Log your mood first!',
                    recommendations: generateRecommendations({ hasData: false }, isArabic)
                };
            } else {
                const trend = analyzeTrend(moodRecords, isArabic);
                const dayPattern = analyzeDayPatterns(moodRecords, isArabic);
                const timePattern = analyzeTimePatterns(moodRecords, isArabic);
                const sleepImpact = analyzeSleepImpact(sleepRecords, moodRecords, isArabic);
                const activityImpact = analyzeActivityImpact(activities, moodRecords, isArabic);
                const declineAlert = detectMoodDecline(moodRecords, isArabic);
                
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
                        mostFrequentText: getMoodText(mostFrequentMood, isArabic)
                    },
                    prediction: predictionValue ? {
                        value: predictionValue,
                        trend: predictionTrend
                    } : null,
                    recommendations: generateRecommendations({ trend, sleepImpact, activityImpact, dayPattern, timePattern, hasData: true }, isArabic)
                };
                
                analysisResult = fullAnalysis;
            }
            
            if (isMountedRef.current) setAnalysis(analysisResult);
            
        } catch (err) {
            console.error('Error in MoodAnalytics fetchAllData:', err);
            if (isMountedRef.current) setError(isArabic ? 'حدث خطأ في تحليل المزاج' : 'Error analyzing mood');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [isArabic]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, refreshTrigger]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    return (
        <div className={`analytics-container mood-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل المزاج' : 'Mood Analytics'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
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
                            {/* الإحصائيات السريعة */}
                            <div className="quick-stats">
                                <div className="stat-box">
                                    <div className="stat-value">{analysis.summary.avgMood}</div>
                                    <div className="stat-label">{isArabic ? 'متوسط المزاج' : 'Average Mood'}</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">{analysis.summary.totalDays}</div>
                                    <div className="stat-label">{isArabic ? 'أيام مسجلة' : 'Days Recorded'}</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">
                                        {analysis.summary.mostFrequentEmoji} {analysis.summary.mostFrequentText}
                                    </div>
                                    <div className="stat-label">{isArabic ? 'الأكثر تكراراً' : 'Most Frequent'}</div>
                                </div>
                            </div>

                            {/* التنبؤ */}
                            {analysis.prediction && (
                                <div className="prediction-box">
                                    <span className="prediction-icon">🔮</span>
                                    <span className="prediction-text">
                                        {isArabic ? 'غداً' : 'Tomorrow'}: 
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

                            {/* أنماط الأيام */}
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
                                    <p className="pattern-content">{analysis.timePattern.bestTime}</p>
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
                                <h3>💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                                {analysis.recommendations?.map((rec, i) => (
                                    <div key={i} className="recommendation-card">
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-title">{rec.title}</span>
                                        </div>
                                        <p className="rec-advice">{rec.advice}</p>
                                        <ul className="rec-tips">
                                            {rec.tips?.map((tip, j) => <li key={j}>{tip}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

                               <style jsx>{`
/* ===========================================
   MoodAnalytics.css - الأنماط الداخلية فقط
   ✅ تحليل المزاج - ألوان وأشكال مميزة
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.mood-analytics {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.mood-analytics.dark-mode {
    background: #1e293b;
}

/* ===== الرأس ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.analytics-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .analytics-header h2 {
    background: linear-gradient(135deg, #fbbf24, #f87171);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #334155;
    color: #94a3b8;
}

.refresh-btn:hover {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
    transform: rotate(180deg);
}

/* ===== الإحصائيات السريعة ===== */
.quick-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-box {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
    border-radius: 20px;
    padding: 1rem;
    text-align: center;
    border: 1px solid rgba(245, 158, 11, 0.2);
    transition: all 0.2s;
}

.dark-mode .stat-box {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05));
    border-color: rgba(245, 158, 11, 0.15);
}

.stat-box:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15);
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
}

.dark-mode .stat-value {
    color: #f1f5f9;
}

.stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    margin-top: 0.25rem;
}

/* ===== التنبؤ ===== */
.prediction-box {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 20px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: white;
}

.dark-mode .prediction-box {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
}

.prediction-icon {
    font-size: 1.5rem;
}

.prediction-text {
    font-size: 0.95rem;
    font-weight: 500;
}

.prediction-text strong {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0 0.25rem;
}

.prediction-trend {
    font-size: 1.2rem;
    margin-left: 0.5rem;
}

/* ===== بطاقة التنبيه ===== */
.alert-card {
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid;
}

.alert-card.high {
    background: rgba(239, 68, 68, 0.1);
    border-left-color: #ef4444;
}

.alert-card.medium {
    background: rgba(245, 158, 11, 0.1);
    border-left-color: #f59e0b;
}

.dark-mode .alert-card.high {
    background: rgba(239, 68, 68, 0.15);
}

.dark-mode .alert-card.medium {
    background: rgba(245, 158, 11, 0.15);
}

[dir="rtl"] .alert-card {
    border-left: none;
    border-right: 4px solid;
}

.alert-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.alert-icon {
    font-size: 1.3rem;
}

.alert-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .alert-title {
    color: #f1f5f9;
}

.alert-message {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

/* ===== بطاقة الاتجاه ===== */
.trend-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .trend-card {
    background: #0f172a;
    border-color: #334155;
}

.trend-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.trend-icon {
    font-size: 1.3rem;
}

.trend-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .trend-title {
    color: #f1f5f9;
}

.trend-message {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

/* ===== بطاقات الأنماط ===== */
.pattern-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .pattern-card {
    background: #0f172a;
    border-color: #334155;
}

.pattern-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.pattern-icon {
    font-size: 1.3rem;
}

.pattern-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .pattern-title {
    color: #f1f5f9;
}

.pattern-content {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

.pattern-content .good {
    color: #10b981;
    font-weight: 600;
}

.pattern-content .bad {
    color: #ef4444;
    font-weight: 600;
}

.pattern-content .separator {
    color: var(--text-tertiary, #94a3b8);
    margin: 0 0.5rem;
}

/* ===== بطاقات التأثير ===== */
.impact-card {
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .impact-card {
    background: linear-gradient(135deg, #059669, #0d9488);
}

.impact-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.impact-icon {
    font-size: 1.3rem;
}

.impact-title {
    font-weight: 700;
    opacity: 0.9;
}

.impact-message {
    font-size: 0.85rem;
    margin: 0;
    opacity: 0.85;
}

/* ===== التوصيات ===== */
.recommendations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-top: 0.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-section {
    background: #0f172a;
    border-color: #334155;
}

.recommendations-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .recommendations-section h3 {
    color: #f1f5f9;
}

.recommendation-card {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    transition: all 0.2s;
    border-left: 3px solid #f59e0b;
}

.dark-mode .recommendation-card {
    background: #1e293b;
}

.recommendation-card:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .recommendation-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[dir="rtl"] .recommendation-card {
    border-left: none;
    border-right: 3px solid #f59e0b;
}

[dir="rtl"] .recommendation-card:hover {
    transform: translateX(-4px);
}

.rec-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.rec-icon {
    font-size: 1.2rem;
}

.rec-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .rec-title {
    color: #f1f5f9;
}

.rec-advice {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin: 0 0 0.5rem 0;
}

.rec-tips {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .rec-tips {
    padding-left: 0;
    padding-right: 1.25rem;
}

.rec-tips li {
    margin-bottom: 0.25rem;
}

/* ===== حالة عدم وجود بيانات ===== */
.no-data-message {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .no-data-message {
    background: #0f172a;
    border-color: #334155;
}

.message-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.no-data-message p {
    color: var(--text-primary, #0f172a);
    margin-bottom: 1.5rem;
}

.start-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    margin-top: 0.75rem;
    text-align: left;
}

.dark-mode .start-tip {
    background: #1e293b;
}

.start-tip span:first-child {
    font-size: 1.2rem;
}

.start-tip strong {
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
    display: block;
    margin-bottom: 0.25rem;
}

.start-tip p {
    font-size: 0.75rem;
    margin: 0;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .start-tip {
    text-align: right;
}

/* ===== حالات التحميل والخطأ ===== */
.analytics-loading,
.analytics-error {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
}

.dark-mode .analytics-loading,
.dark-mode .analytics-error {
    background: #1e293b;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #f59e0b;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.25rem;
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* ===== حاوية التحليلات ===== */
.insights-container {
    display: flex;
    flex-direction: column;
}

/* ===== دعم RTL ===== */
[dir="rtl"] .rec-tips {
    padding-right: 1.25rem;
}

[dir="rtl"] .prediction-trend {
    margin-left: 0;
    margin-right: 0.5rem;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .stat-box:hover,
    .recommendation-card:hover {
        transform: none;
    }
    
    .spinner {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .stat-box,
    .trend-card,
    .pattern-card,
    .recommendation-card {
        border-width: 2px;
    }
    
    .alert-card {
        border-left-width: 6px;
    }
    
    [dir="rtl"] .alert-card {
        border-right-width: 6px;
    }
}
            `}</style>

        </div>
    );
};

export default MoodAnalytics;