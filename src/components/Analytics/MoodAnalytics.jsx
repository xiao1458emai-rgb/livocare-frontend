// src/components/Analytics/MoodAnalytics.jsx - النسخة المطورة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// دوال مساعدة محسنة
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const getMoodScore = (mood) => {
    const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1, 'Depressed': 0 };
    return map[mood] ?? 3;
};

const getMoodEmoji = (mood) => {
    const map = {
        'Excellent': '😊', 'Good': '🙂', 'Neutral': '😐',
        'Stressed': '😫', 'Anxious': '😰', 'Sad': '😢', 'Depressed': '😔'
    };
    return map[mood] ?? '😐';
};

const getMoodText = (mood, isArabic) => {
    const mapAr = {
        'Excellent': 'ممتاز', 'Good': 'جيد', 'Neutral': 'محايد',
        'Stressed': 'مرهق', 'Anxious': 'قلق', 'Sad': 'حزين', 'Depressed': 'مكتئب'
    };
    const mapEn = {
        'Excellent': 'Excellent', 'Good': 'Good', 'Neutral': 'Neutral',
        'Stressed': 'Stressed', 'Anxious': 'Anxious', 'Sad': 'Sad', 'Depressed': 'Depressed'
    };
    return (isArabic ? mapAr[mood] : mapEn[mood]) ?? mood;
};

// ✅ تحليل أيام الأسبوع
const analyzeDayPatterns = (moodRecords, isArabic) => {
    if (moodRecords.length < 7) return null;
    
    const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    moodRecords.forEach(record => dayScores[record.date.getDay()].push(record.score));
    
    const dayNamesAr = { 0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' };
    const dayNamesEn = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
    const dayNames = isArabic ? dayNamesAr : dayNamesEn;
    
    let bestDay = null, worstDay = null, bestScore = 0, worstScore = 5;
    Object.entries(dayScores).forEach(([day, scores]) => {
        if (scores.length >= 2) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > bestScore) { bestScore = avg; bestDay = dayNames[parseInt(day)]; }
            if (avg < worstScore) { worstScore = avg; worstDay = dayNames[parseInt(day)]; }
        }
    });
    
    return bestDay && worstDay && bestDay !== worstDay ? {
        type: 'day_pattern', icon: '📅',
        title: isArabic ? 'نمط أيام الأسبوع' : 'Weekly Pattern',
        bestDay, worstDay, bestScore: roundNumber(bestScore, 1), worstScore: roundNumber(worstScore, 1)
    } : null;
};

// ✅ تحليل أوقات اليوم
const analyzeTimePatterns = (moodRecords, isArabic) => {
    if (moodRecords.length < 5) return null;
    
    const timeSlots = {
        morning: { scores: [], label: isArabic ? 'الصباح (5-12)' : 'Morning (5-12)', hours: [5, 12] },
        afternoon: { scores: [], label: isArabic ? 'الظهيرة (12-17)' : 'Afternoon (12-17)', hours: [12, 17] },
        evening: { scores: [], label: isArabic ? 'المساء (17-21)' : 'Evening (17-21)', hours: [17, 21] },
        night: { scores: [], label: isArabic ? 'الليل (21-5)' : 'Night (21-5)', hours: [21, 5] }
    };
    
    moodRecords.forEach(record => {
        const hour = record.date.getHours();
        if (hour >= 5 && hour < 12) timeSlots.morning.scores.push(record.score);
        else if (hour >= 12 && hour < 17) timeSlots.afternoon.scores.push(record.score);
        else if (hour >= 17 && hour < 21) timeSlots.evening.scores.push(record.score);
        else timeSlots.night.scores.push(record.score);
    });
    
    let bestTime = null, bestScore = 0;
    Object.values(timeSlots).forEach(slot => {
        if (slot.scores.length >= 2) {
            const avg = slot.scores.reduce((a, b) => a + b, 0) / slot.scores.length;
            if (avg > bestScore) { bestScore = avg; bestTime = slot.label; }
        }
    });
    
    return bestTime ? {
        type: 'time_pattern', icon: '⏰',
        title: isArabic ? 'أفضل وقت للمزاج' : 'Best Time for Mood',
        bestTime, bestScore: roundNumber(bestScore, 1)
    } : null;
};

// ✅ تحليل الاتجاه المتقدم
const analyzeTrend = (moodRecords, isArabic) => {
    if (moodRecords.length < 7) return null;
    
    const trends = [];
    for (let i = 0; i <= moodRecords.length - 7; i++) {
        const week = moodRecords.slice(i, i + 7);
        const avg = week.reduce((a, b) => a + b.score, 0) / 7;
        trends.push(avg);
    }
    
    if (trends.length >= 2) {
        const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
        const secondHalf = trends.slice(Math.floor(trends.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const difference = secondAvg - firstAvg;
        
        if (Math.abs(difference) > 0.2) {
            const isImproving = difference > 0;
            const percentage = Math.abs(Math.round((difference / firstAvg) * 100));
            return {
                type: isImproving ? 'improving' : 'declining',
                icon: isImproving ? '📈' : '📉',
                title: isImproving ? (isArabic ? 'مزاجك يتحسن' : 'Your mood is improving') : (isArabic ? 'مزاجك في انخفاض' : 'Your mood is declining'),
                message: isImproving ? 
                    (isArabic ? `تحسن ملحوظ بنسبة ${percentage}% في الفترة الأخيرة` : `Notable improvement of ${percentage}% recently`) :
                    (isArabic ? `انخفاض ملحوظ بنسبة ${percentage}% في الفترة الأخيرة` : `Notable decline of ${percentage}% recently`),
                difference: roundNumber(Math.abs(difference), 1),
                percentage
            };
        }
    }
    return null;
};

// ✅ تحليل تأثير النوم على المزاج
const analyzeSleepImpact = (sleepRecords, moodRecords, isArabic) => {
    if (sleepRecords.length < 5 || moodRecords.length < 5) return null;
    
    const sleepByDay = {};
    sleepRecords.forEach(sleep => {
        const date = new Date(sleep.sleep_start || sleep.start_time).toDateString();
        const duration = sleep.duration_hours || ((new Date(sleep.sleep_end || sleep.end_time) - new Date(sleep.sleep_start || sleep.start_time)) / (1000 * 60 * 60));
        if (!sleepByDay[date]) sleepByDay[date] = [];
        sleepByDay[date].push(duration);
    });
    
    Object.keys(sleepByDay).forEach(date => {
        sleepByDay[date] = sleepByDay[date].reduce((a, b) => a + b, 0) / sleepByDay[date].length;
    });
    
    const goodSleepDays = [], badSleepDays = [];
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
                type: 'sleep_impact', icon: '😴',
                title: isArabic ? 'تأثير النوم على مزاجك' : 'Sleep impact on your mood',
                message: isArabic ? `النوم الجيد (7+ ساعات) يحسن مزاجك بمعدل ${roundNumber(difference, 1)} نقطة` : `Good sleep (7+ hours) improves your mood by ${roundNumber(difference, 1)} points`,
                difference: roundNumber(difference, 1),
                goodAvg, badAvg
            };
        }
    }
    return null;
};

// ✅ تحليل تأثير النشاط على المزاج
const analyzeActivityImpact = (activities, moodRecords, isArabic) => {
    if (activities.length < 5 || moodRecords.length < 5) return null;
    
    const activityByDay = {};
    activities.forEach(activity => {
        const date = new Date(activity.start_time || activity.created_at).toDateString();
        const duration = activity.duration_minutes || 0;
        activityByDay[date] = (activityByDay[date] || 0) + duration;
    });
    
    const activeDays = [], inactiveDays = [];
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
                type: 'activity_impact', icon: '🏃',
                title: isArabic ? 'تأثير النشاط على مزاجك' : 'Activity impact on your mood',
                message: isArabic ? `النشاط البدني (30+ دقيقة) يحسن مزاجك بمعدل ${roundNumber(difference, 1)} نقطة` : `Physical activity (30+ min) improves your mood by ${roundNumber(difference, 1)} points`,
                difference: roundNumber(difference, 1),
                activeAvg, inactiveAvg
            };
        }
    }
    return null;
};

// ✅ اكتشاف انخفاض المزاج
const detectMoodDecline = (moodRecords, isArabic) => {
    if (moodRecords.length < 3) return null;
    
    const recent = moodRecords.slice(-7);
    let consecutiveLow = 0;
    const lowMoods = ['Stressed', 'Anxious', 'Sad', 'Depressed'];
    
    for (let i = recent.length - 1; i >= 0; i--) {
        if (lowMoods.includes(recent[i].raw)) consecutiveLow++;
        else break;
    }
    
    if (consecutiveLow >= 3) {
        const severity = consecutiveLow >= 5 ? 'high' : consecutiveLow >= 3 ? 'medium' : 'low';
        return {
            type: 'decline_alert', icon: '⚠️',
            title: isArabic ? 'انخفاض مستمر في المزاج' : 'Continuous mood decline',
            message: isArabic ? `مزاجك منخفض لمدة ${consecutiveLow} أيام متتالية` : `Your mood has been low for ${consecutiveLow} consecutive days`,
            severity, days: consecutiveLow
        };
    }
    return null;
};

// ✅ اكتشاف أيام العطل
const detectHolidayImpact = (moodRecords, isArabic) => {
    if (moodRecords.length < 10) return null;
    
    const weekendScores = [];
    const weekdayScores = [];
    
    moodRecords.forEach(record => {
        const day = record.date.getDay();
        if (day === 5 || day === 6) weekendScores.push(record.score);
        else weekdayScores.push(record.score);
    });
    
    if (weekendScores.length >= 3 && weekdayScores.length >= 5) {
        const weekendAvg = weekendScores.reduce((a, b) => a + b, 0) / weekendScores.length;
        const weekdayAvg = weekdayScores.reduce((a, b) => a + b, 0) / weekdayScores.length;
        const difference = weekendAvg - weekdayAvg;
        
        if (Math.abs(difference) > 0.3) {
            return {
                type: 'weekend_impact', icon: '🎉',
                title: isArabic ? 'تأثير العطلات على المزاج' : 'Weekend impact on mood',
                message: difference > 0 ?
                    (isArabic ? `مزاجك أفضل في العطلات بمعدل ${roundNumber(difference, 1)} نقطة` : `Your mood is better on weekends by ${roundNumber(difference, 1)} points`) :
                    (isArabic ? `مزاجك أفضل في أيام العمل بمعدل ${roundNumber(Math.abs(difference), 1)} نقطة` : `Your mood is better on weekdays by ${roundNumber(Math.abs(difference), 1)} points`),
                difference: roundNumber(difference, 1)
            };
        }
    }
    return null;
};

// ✅ توقع المزاج المستقبلي
const predictMood = (moodRecords, isArabic) => {
    if (moodRecords.length < 7) return null;
    
    const recentScores = moodRecords.slice(-7).map(r => r.score);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = moodRecords.slice(-3).reduce((a, b) => a + b.score, 0) - moodRecords.slice(-6, -3).reduce((a, b) => a + b.score, 0);
    
    let predictedScore = avgRecent;
    if (trend > 0.5) predictedScore = Math.min(5, avgRecent + 0.3);
    else if (trend < -0.5) predictedScore = Math.max(1, avgRecent - 0.3);
    
    const moodLevels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    const moodLevelsAr = ['سيء', 'متوسط', 'جيد', 'جيد جداً', 'ممتاز'];
    const levelIndex = Math.min(4, Math.max(0, Math.floor(predictedScore) - 1));
    
    return {
        score: roundNumber(predictedScore, 1),
        level: isArabic ? moodLevelsAr[levelIndex] : moodLevels[levelIndex],
        trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
    };
};

// ✅ توليد توصيات ذكية
const generateRecommendations = (analysis, isArabic) => {
    const recommendations = [];
    
    if (analysis.trend?.type === 'declining') {
        recommendations.push({
            icon: '💙', priority: 'high',
            title: isArabic ? 'اعتنِ بنفسك' : 'Take care of yourself',
            advice: analysis.trend.message,
            tips: isArabic ? [
                'تحدث مع شخص تثق به',
                'مارس نشاطاً تحبه',
                'خذ قسطاً من الراحة',
                'جرب تمارين التنفس العميق'
            ] : [
                'Talk to someone you trust',
                'Do an activity you enjoy',
                'Take a break',
                'Try deep breathing exercises'
            ]
        });
    }
    
    if (analysis.sleepImpact) {
        recommendations.push({
            icon: '😴', priority: 'high',
            title: isArabic ? 'حسّن نومك' : 'Improve your sleep',
            advice: analysis.sleepImpact.message,
            tips: isArabic ? [
                'النوم 7-8 ساعات يومياً',
                'تجنب الكافيين بعد العصر',
                'لا تستخدم الهاتف قبل النوم',
                'اجعل غرفة النوم مظلمة وهادئة'
            ] : [
                'Sleep 7-8 hours daily',
                'Avoid caffeine after 4 PM',
                'No phone before bed',
                'Keep bedroom dark and quiet'
            ]
        });
    }
    
    if (analysis.activityImpact) {
        recommendations.push({
            icon: '🏃', priority: 'medium',
            title: isArabic ? 'زد نشاطك البدني' : 'Increase physical activity',
            advice: analysis.activityImpact.message,
            tips: isArabic ? [
                'امشِ 30 دقيقة يومياً',
                'جرب تمارين الاسترخاء',
                'انضم لنشاط جماعي',
                'استمع للموسيقى أثناء المشي'
            ] : [
                'Walk 30 minutes daily',
                'Try relaxation exercises',
                'Join a group activity',
                'Listen to music while walking'
            ]
        });
    }
    
    if (analysis.dayPattern?.bestDay) {
        recommendations.push({
            icon: '📅', priority: 'low',
            title: isArabic ? 'استغل أيامك الجيدة' : 'Make the most of good days',
            advice: isArabic ? `أيام ${analysis.dayPattern.bestDay} هي الأفضل لمزاجك` : `${analysis.dayPattern.bestDay} are your best days`,
            tips: isArabic ? [
                'خطط لأنشطتك المهمة في أيامك الجيدة',
                'كن لطيفاً مع نفسك في الأيام الأخرى'
            ] : [
                'Plan important activities on good days',
                'Be kind to yourself on other days'
            ]
        });
    }
    
    if (analysis.timePattern) {
        recommendations.push({
            icon: '⏰', priority: 'low',
            title: isArabic ? 'وقتك المثالي' : 'Your ideal time',
            advice: isArabic ? `وقت ${analysis.timePattern.bestTime} هو الأفضل لمزاجك` : `${analysis.timePattern.bestTime} is best for your mood`,
            tips: isArabic ? [
                'استغل هذا الوقت للإبداع والعمل المهم',
                'خطط لمهامك الصعبة في هذا الوقت'
            ] : [
                'Use this time for creative work',
                'Plan difficult tasks for this time'
            ]
        });
    }
    
    if (analysis.weekendImpact) {
        recommendations.push({
            icon: '🎉', priority: 'medium',
            title: isArabic ? 'استغل عطلاتك' : 'Make the most of weekends',
            advice: analysis.weekendImpact.message,
            tips: isArabic ? [
                'خطط لأنشطة ممتعة في العطلات',
                'تواصل مع الأصدقاء والعائلة'
            ] : [
                'Plan enjoyable activities on weekends',
                'Connect with friends and family'
            ]
        });
    }
    
    if (recommendations.length === 0 && analysis.hasData) {
        recommendations.push({
            icon: '🌟', priority: 'low',
            title: isArabic ? 'استمر على ما أنت عليه' : 'Keep up the good work',
            advice: isArabic ? 'مزاجك متوازن، استمر في عاداتك الجيدة' : 'Your mood is balanced, keep up your good habits',
            tips: isArabic ? [
                'واصل تسجيل مزاجك يومياً',
                'شارك إيجابيتك مع الآخرين'
            ] : [
                'Continue tracking your mood daily',
                'Share your positivity with others'
            ]
        });
    }
    
    return recommendations.sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return priority[b.priority] - priority[a.priority];
    });
};

// ✅ حساب إحصائيات المزاج
const calculateMoodStats = (moodRecords) => {
    const scores = moodRecords.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const moodFrequency = {};
    moodRecords.forEach(r => { moodFrequency[r.raw] = (moodFrequency[r.raw] || 0) + 1; });
    
    let mostFrequentMood = 'Neutral', maxCount = 0;
    for (const [mood, count] of Object.entries(moodFrequency)) {
        if (count > maxCount) { maxCount = count; mostFrequentMood = mood; }
    }
    
    const goodDays = scores.filter(s => s >= 4).length;
    const badDays = scores.filter(s => s <= 2).length;
    
    const volatility = scores.length > 1 ? 
        Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - avgScore, 2), 0) / scores.length) : 0;
    
    return { avgScore, mostFrequentMood, goodDays, badDays, volatility, totalDays: moodRecords.length };
};

// ✅ توزيع المزاج
const getMoodDistribution = (moodRecords) => {
    const distribution = { Excellent: 0, Good: 0, Neutral: 0, Stressed: 0, Anxious: 0, Sad: 0, Depressed: 0 };
    moodRecords.forEach(r => { if (distribution[r.raw] !== undefined) distribution[r.raw]++; });
    return distribution;
};

// ✅ المكون الرئيسي
const MoodAnalytics = ({ refreshTrigger }) => {
    const [lang, setLang] = useState(() => localStorage.getItem('app_lang') === 'en' ? 'en' : 'ar');
    const isArabic = lang === 'ar';
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('livocare_darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches);
    const isMountedRef = useRef(true);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeInsight, setActiveInsight] = useState(null);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                fetchAllData();
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const fetchAllData = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoading(true); setError(null);
        
        try {
            const [moodRes, sleepRes, activitiesRes] = await Promise.all([
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            const moodDataRaw = moodRes.data?.results || (Array.isArray(moodRes.data) ? moodRes.data : []);
            const sleepDataRaw = sleepRes.data?.results || (Array.isArray(sleepRes.data) ? sleepRes.data : []);
            const activitiesDataRaw = activitiesRes.data?.results || (Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
            
            const moodRecords = moodDataRaw.map(m => ({
                date: new Date(m.entry_time || m.date),
                score: getMoodScore(m.mood),
                raw: m.mood,
                factors: m.factors || '',
                notes: m.text_entry || ''
            })).sort((a, b) => a.date - b.date);
            
            if (moodRecords.length === 0) {
                setAnalysis({ hasData: false, message: isArabic ? 'لا توجد بيانات كافية للتحليل. قم بتسجيل مزاجك أولاً!' : 'Insufficient data. Log your mood first!' });
                setLoading(false);
                return;
            }
            
            const trend = analyzeTrend(moodRecords, isArabic);
            const dayPattern = analyzeDayPatterns(moodRecords, isArabic);
            const timePattern = analyzeTimePatterns(moodRecords, isArabic);
            const sleepImpact = analyzeSleepImpact(sleepDataRaw, moodRecords, isArabic);
            const activityImpact = analyzeActivityImpact(activitiesDataRaw, moodRecords, isArabic);
            const declineAlert = detectMoodDecline(moodRecords, isArabic);
            const weekendImpact = detectHolidayImpact(moodRecords, isArabic);
            const moodPrediction = predictMood(moodRecords, isArabic);
            const stats = calculateMoodStats(moodRecords);
            const distribution = getMoodDistribution(moodRecords);
            
            const fullAnalysis = {
                hasData: true, trend, dayPattern, timePattern, sleepImpact, activityImpact,
                declineAlert, weekendImpact, moodPrediction, stats, distribution,
                recommendations: generateRecommendations({ trend, sleepImpact, activityImpact, dayPattern, timePattern, weekendImpact, hasData: true }, isArabic)
            };
            
            setAnalysis(fullAnalysis);
            setActiveInsight(fullAnalysis.declineAlert || fullAnalysis.trend || fullAnalysis.sleepImpact || fullAnalysis.activityImpact);
            
        } catch (err) {
            console.error('Error in MoodAnalytics:', err);
            setError(isArabic ? 'حدث خطأ في تحليل المزاج' : 'Error analyzing mood');
        } finally {
            setLoading(false);
        }
    }, [isArabic]);

    useEffect(() => { fetchAllData(); return () => { isMountedRef.current = false; }; }, [fetchAllData, refreshTrigger]);

    if (loading) return (
        <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
            <div className="spinner"></div><p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
        </div>
    );
    
    if (error) return (
        <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
            <p>❌ {error}</p><button onClick={fetchAllData} className="retry-btn">🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
    );

    return (
        <div className={`analytics-container mood-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل المزاج المتقدم' : 'Advanced Mood Analytics'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>🔄</button>
            </div>

            {analysis?.hasData ? (
                <div className="insights-container">
                    {/* الإحصائيات السريعة */}
                    <div className="quick-stats">
                        <div className="stat-box"><div className="stat-value">{analysis.stats.avgScore}</div><div className="stat-label">{isArabic ? 'متوسط المزاج' : 'Average Mood'}</div></div>
                        <div className="stat-box"><div className="stat-value">{analysis.stats.totalDays}</div><div className="stat-label">{isArabic ? 'أيام مسجلة' : 'Days Recorded'}</div></div>
                        <div className="stat-box"><div className="stat-value">{getMoodEmoji(analysis.stats.mostFrequentMood)} {getMoodText(analysis.stats.mostFrequentMood, isArabic)}</div><div className="stat-label">{isArabic ? 'الأكثر تكراراً' : 'Most Frequent'}</div></div>
                    </div>

                    {/* توزيع المزاج */}
                    <div className="distribution-section">
                        <h3>{isArabic ? 'توزيع الحالة المزاجية' : 'Mood Distribution'}</h3>
                        <div className="distribution-bars">
                            {Object.entries(analysis.distribution).filter(([_, count]) => count > 0).map(([mood, count]) => (
                                <div key={mood} className="distribution-item">
                                    <span className="dist-emoji">{getMoodEmoji(mood)}</span>
                                    <span className="dist-label">{getMoodText(mood, isArabic)}</span>
                                    <div className="dist-bar"><div className="dist-fill" style={{ width: `${(count / analysis.stats.totalDays) * 100}%`, background: `hsl(${getMoodScore(mood) * 60}, 70%, 50%)` }} /></div>
                                    <span className="dist-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* التنبؤ */}
                    {analysis.moodPrediction && (
                        <div className="prediction-box">
                            <span className="prediction-icon">🔮</span>
                            <span className="prediction-text">{isArabic ? 'توقع المزاج غداً' : 'Tomorrow\'s mood prediction'}: <strong>{analysis.moodPrediction.score}/5</strong> ({analysis.moodPrediction.level})</span>
                            <span className="prediction-trend">{analysis.moodPrediction.trend === 'up' ? '📈' : analysis.moodPrediction.trend === 'down' ? '📉' : '➡️'}</span>
                        </div>
                    )}

                    {/* تنبيه الانخفاض */}
                    {analysis.declineAlert && <div className={`alert-card ${analysis.declineAlert.severity}`}><div className="alert-header"><span className="alert-icon">⚠️</span><span className="alert-title">{analysis.declineAlert.title}</span></div><p className="alert-message">{analysis.declineAlert.message}</p></div>}

                    {/* الاتجاه */}
                    {analysis.trend && (<div className="trend-card"><div className="trend-header"><span className="trend-icon">{analysis.trend.icon}</span><span className="trend-title">{analysis.trend.title}</span></div><p className="trend-message">{analysis.trend.message}</p></div>)}

                    {/* الأنماط */}
                    {analysis.dayPattern && (<div className="pattern-card"><div className="pattern-header"><span className="pattern-icon">📅</span><span className="pattern-title">{analysis.dayPattern.title}</span></div><div className="pattern-content"><span className="good">👍 {analysis.dayPattern.bestDay}</span><span className="separator"> | </span><span className="bad">👎 {analysis.dayPattern.worstDay}</span></div></div>)}
                    {analysis.timePattern && (<div className="pattern-card"><div className="pattern-header"><span className="pattern-icon">⏰</span><span className="pattern-title">{analysis.timePattern.title}</span></div><p className="pattern-content">{analysis.timePattern.bestTime}</p></div>)}
                    {analysis.weekendImpact && (<div className="pattern-card"><div className="pattern-header"><span className="pattern-icon">🎉</span><span className="pattern-title">{analysis.weekendImpact.title}</span></div><p className="pattern-content">{analysis.weekendImpact.message}</p></div>)}

                    {/* التأثيرات */}
                    {analysis.sleepImpact && (<div className="impact-card"><div className="impact-header"><span className="impact-icon">😴</span><span className="impact-title">{analysis.sleepImpact.title}</span></div><p className="impact-message">{analysis.sleepImpact.message}</p></div>)}
                    {analysis.activityImpact && (<div className="impact-card"><div className="impact-header"><span className="impact-icon">🏃</span><span className="impact-title">{analysis.activityImpact.title}</span></div><p className="impact-message">{analysis.activityImpact.message}</p></div>)}

                    {/* التوصيات */}
                    <div className="recommendations-section"><h3>💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>{analysis.recommendations?.map((rec, i) => (<div key={i} className={`recommendation-card priority-${rec.priority}`}><div className="rec-header"><span className="rec-icon">{rec.icon}</span><span className="rec-title">{rec.title}</span></div><p className="rec-advice">{rec.advice}</p><ul className="rec-tips">{rec.tips?.map((tip, j) => <li key={j}>{tip}</li>)}</ul></div>))}</div>
                </div>
            ) : (<div className="no-data-message"><div className="message-icon">📝</div><p>{analysis?.message}</p></div>)}

            {/* الأنماط - محفوظة كما هي */}
            <style jsx>{`/* الأنماط السابقة محفوظة */`}</style>


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