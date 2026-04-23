// src/components/Analytics/SleepAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

const SleepAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [smartInsights, setSmartInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const isArabic = i18n.language === 'ar';

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
        return () => { isMountedRef.current = false; };
    }, [refreshTrigger]);

    // ===========================================
    // حساب Sleep Score المتقدم
    // ===========================================
    const calculateSleepScore = (avgHours, avgQuality, consistency, avgBedTime) => {
        let score = 0;
        
        // مدة النوم (40 نقطة)
        if (avgHours >= 7 && avgHours <= 8) score += 40;
        else if (avgHours >= 6 && avgHours < 7) score += 30;
        else if (avgHours >= 5 && avgHours < 6) score += 20;
        else if (avgHours >= 4 && avgHours < 5) score += 10;
        else if (avgHours > 0) score += 5;
        
        // جودة النوم (30 نقطة)
        score += Math.min(30, avgQuality * 6);
        
        // انتظام موعد النوم (15 نقطة)
        if (consistency >= 80) score += 15;
        else if (consistency >= 60) score += 10;
        else if (consistency >= 40) score += 5;
        
        // توقيت النوم (15 نقطة)
        if (avgBedTime >= 22 && avgBedTime <= 23) score += 15;
        else if (avgBedTime >= 21 && avgBedTime < 22) score += 12;
        else if (avgBedTime >= 23 && avgBedTime <= 24) score += 8;
        else if (avgBedTime > 0 && avgBedTime < 4) score += 4;
        
        return Math.min(100, Math.max(0, Math.round(score)));
    };
    
    const getScoreStatus = (score) => {
        if (score >= 80) return { text: isArabic ? 'ممتاز' : 'Excellent', color: '#10b981' };
        if (score >= 60) return { text: isArabic ? 'جيد' : 'Good', color: '#3b82f6' };
        if (score >= 40) return { text: isArabic ? 'متوسط' : 'Fair', color: '#f59e0b' };
        return { text: isArabic ? 'ضعيف' : 'Poor', color: '#ef4444' };
    };
    
    const getDurationStatus = (hours) => {
        if (hours >= 7 && hours <= 9) return { text: isArabic ? 'مثالي' : 'Ideal', color: '#10b981', icon: '✅' };
        if (hours >= 6 && hours < 7) return { text: isArabic ? 'مقبول' : 'Acceptable', color: '#f59e0b', icon: '⚠️' };
        if (hours > 9) return { text: isArabic ? 'زائد' : 'Excessive', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'غير كافٍ' : 'Insufficient', color: '#ef4444', icon: '❌' };
    };
    
    const getQualityStatus = (quality) => {
        if (quality >= 4) return { text: isArabic ? 'ممتازة' : 'Excellent', color: '#10b981', icon: '✅' };
        if (quality >= 3) return { text: isArabic ? 'متوسطة' : 'Average', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'سيئة' : 'Poor', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // تحليل انتظام النوم (Consistency)
    // ===========================================
    const calculateConsistency = (sleepRecords) => {
        if (sleepRecords.length < 3) return 0;
        
        const bedTimes = sleepRecords.map(s => {
            const hour = s.start?.getHours() || 0;
            return hour + (s.start?.getMinutes() || 0) / 60;
        }).filter(h => h > 0);
        
        if (bedTimes.length < 2) return 0;
        
        const variance = stats.sampleVariance(bedTimes);
        const maxVariance = 16;
        const consistency = Math.max(0, 100 - (variance / maxVariance) * 100);
        
        return Math.round(consistency);
    };
    
    const getConsistencyStatus = (consistency) => {
        if (consistency >= 80) return { text: isArabic ? 'منتظم جداً' : 'Very Regular', color: '#10b981', icon: '✅' };
        if (consistency >= 60) return { text: isArabic ? 'منتظم' : 'Regular', color: '#3b82f6', icon: '📊' };
        if (consistency >= 40) return { text: isArabic ? 'متذبذب' : 'Irregular', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'غير منتظم' : 'Very Irregular', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // حساب دين النوم (Sleep Debt)
    // ===========================================
    const calculateSleepDebt = (sleepRecords) => {
        const OPTIMAL_HOURS = 8;
        let totalDebt = 0;
        
        sleepRecords.forEach(record => {
            if (record.hours > 0 && record.hours < OPTIMAL_HOURS) {
                totalDebt += OPTIMAL_HOURS - record.hours;
            }
        });
        
        return {
            total: Math.round(totalDebt * 10) / 10,
            average: sleepRecords.length > 0 ? Math.round((totalDebt / sleepRecords.length) * 10) / 10 : 0,
            severity: totalDebt > 10 ? 'high' : totalDebt > 5 ? 'medium' : totalDebt > 2 ? 'low' : 'none'
        };
    };

    // ===========================================
    // تحليل نمط النوم
    // ===========================================
    const analyzeSleepPattern = (sleepRecords) => {
        if (sleepRecords.length < 4) return null;
        
        const bedTimes = sleepRecords.map(s => s.start?.getHours() || 0).filter(h => h > 0);
        const wakeTimes = sleepRecords.map(s => s.end?.getHours() || 0).filter(h => h > 0);
        
        const avgBedTime = bedTimes.length > 0 ? math.mean(bedTimes) : 0;
        const avgWakeTime = wakeTimes.length > 0 ? math.mean(wakeTimes) : 0;
        
        let patternType = 'regular';
        let patternText = '';
        
        if (avgBedTime >= 0 && avgBedTime <= 4) patternText = isArabic ? 'بومة ليلية' : 'Night Owl';
        else if (avgBedTime >= 21 && avgBedTime <= 23) patternText = isArabic ? 'نمط طبيعي' : 'Normal';
        else if (avgBedTime >= 18 && avgBedTime < 21) patternText = isArabic ? 'نمط مبكر' : 'Early Bird';
        else patternText = isArabic ? 'غير منتظم' : 'Irregular';
        
        const bedtimeVariance = stats.sampleVariance(bedTimes);
        if (bedtimeVariance > 4) patternType = 'irregular';
        
        return {
            type: patternType,
            text: patternText,
            avgBedTime: Math.round(avgBedTime),
            avgWakeTime: Math.round(avgWakeTime),
            variance: bedtimeVariance.toFixed(1)
        };
    };

    // ===========================================
    // تحليل تأثير النوم على المزاج والنشاط
    // ===========================================
    const analyzeSleepImpact = (sleepRecords, moodData, activityData) => {
        const insights = [];
        
        // تأثير النوم على المزاج
        if (sleepRecords.length >= 3 && moodData.length >= 3) {
            const lowSleepDays = sleepRecords
                .filter(s => s.hours < 6 && s.hours > 0)
                .map(s => s.start?.toDateString());
            
            const moodAfterLowSleep = moodData.filter(m => {
                const moodDate = new Date(m.entry_time).toDateString();
                return lowSleepDays.includes(moodDate);
            });
            
            if (moodAfterLowSleep.length > 0) {
                const badMoodCount = moodAfterLowSleep.filter(m => 
                    ['Stressed', 'Anxious', 'Sad'].includes(m.mood)
                ).length;
                
                const percentage = (badMoodCount / moodAfterLowSleep.length) * 100;
                
                if (percentage > 30) {
                    insights.push({
                        type: 'mood_impact',
                        severity: percentage > 50 ? 'high' : 'medium',
                        message: isArabic 
                            ? `عندما تنام أقل من 6 ساعات، تنخفض حالتك المزاجية بنسبة ${percentage.toFixed(0)}%`
                            : `When you sleep less than 6 hours, your mood drops by ${percentage.toFixed(0)}%`,
                        recommendation: isArabic ? 'حاول النوم 7-8 ساعات لتحسين مزاجك' : 'Try to sleep 7-8 hours to improve your mood'
                    });
                }
            }
        }
        
        // تأثير النوم على النشاط
        if (sleepRecords.length >= 3 && activityData.length >= 3) {
            const goodSleepDays = sleepRecords
                .filter(s => s.quality >= 4)
                .map(s => s.start?.toDateString());
            
            const activityAfterGoodSleep = activityData.filter(a => {
                const activityDate = new Date(a.start_time || a.date).toDateString();
                return goodSleepDays.includes(activityDate);
            });
            
            if (activityAfterGoodSleep.length > 0) {
                const avgActivity = activityAfterGoodSleep.reduce((sum, a) => 
                    sum + (a.duration_minutes || 0), 0) / activityAfterGoodSleep.length;
                
                if (avgActivity > 30) {
                    insights.push({
                        type: 'activity_impact',
                        severity: 'positive',
                        message: isArabic 
                            ? `النوم الجيد يزيد نشاطك بنسبة ملحوظة`
                            : `Good sleep significantly increases your activity`,
                        recommendation: isArabic ? 'حافظ على عادات نومك الصحية لزيادة طاقتك' : 'Maintain your healthy sleep habits to boost your energy'
                    });
                }
            }
        }
        
        return insights;
    };

    // ===========================================
    // توليد توصيات ذكية
    // ===========================================
    const generateSmartRecommendations = (summary, sleepRecords, sleepDebt, pattern) => {
        const recommendations = [];
        
        // توصية مبنية على مدة النوم
        if (summary.avgHours < 6 && summary.avgHours > 0) {
            const needed = Math.round(8 - summary.avgHours);
            recommendations.push({
                icon: '⏰',
                timing: 'tonight',
                priority: 'high',
                title: isArabic ? 'نوم غير كافٍ' : 'Insufficient Sleep',
                advice: isArabic 
                    ? `متوسط نومك ${summary.avgHours} ساعات فقط (أقل من الطبيعي 7-9 ساعات)`
                    : `Your average sleep is only ${summary.avgHours} hours (below the recommended 7-9 hours)`,
                action: isArabic 
                    ? `حاول النوم ${needed} ساعة إضافية الليلة`
                    : `Try to sleep ${needed} extra hour${needed > 1 ? 's' : ''} tonight`,
                details: [isArabic ? 'قلة النوم تسبب الإرهاق وضعف التركيز' : 'Sleep deprivation causes fatigue and poor concentration']
            });
        } else if (summary.avgHours > 9) {
            recommendations.push({
                icon: '😴',
                timing: 'general',
                priority: 'medium',
                title: isArabic ? 'نوم زائد' : 'Excessive Sleep',
                advice: isArabic 
                    ? `متوسط نومك ${summary.avgHours} ساعات (أكثر من المعدل الطبيعي)`
                    : `Your average sleep is ${summary.avgHours} hours (above the normal range)`,
                action: isArabic 
                    ? 'حاول تقليل ساعات النوم تدريجياً إلى 8 ساعات'
                    : 'Try to gradually reduce sleep hours to 8 hours',
                details: [isArabic ? 'النوم الزائد قد يسبب الخمول والصداع' : 'Excessive sleep may cause lethargy and headaches']
            });
        }
        
        // توصية مبنية على جودة النوم
        if (summary.avgQuality < 3 && summary.avgQuality > 0) {
            recommendations.push({
                icon: '⭐',
                timing: 'tonight',
                priority: 'high',
                title: isArabic ? 'جودة نوم سيئة' : 'Poor Sleep Quality',
                advice: isArabic 
                    ? `جودة نومك ${summary.avgQuality}/5 (نوم غير مريح أو متقطع)`
                    : `Your sleep quality is ${summary.avgQuality}/5 (uncomfortable or interrupted sleep)`,
                action: isArabic 
                    ? 'تجنب الشاشات والكافيين قبل النوم بساعتين'
                    : 'Avoid screens and caffeine 2 hours before bed',
                details: [isArabic ? 'النوم العميق ضروري لاستعادة طاقتك' : 'Deep sleep is essential for energy recovery']
            });
        }
        
        // توصية مبنية على توقيت النوم
        if (pattern && pattern.avgBedTime >= 0 && pattern.avgBedTime <= 4) {
            recommendations.push({
                icon: '🌙',
                timing: 'tonight',
                priority: 'medium',
                title: isArabic ? 'سهر متأخر' : 'Late Bedtime',
                advice: isArabic 
                    ? `تنام عادةً بعد الساعة ${pattern.avgBedTime}:00 منتصف الليل`
                    : `You usually sleep after ${pattern.avgBedTime}:00 midnight`,
                action: isArabic 
                    ? 'قدم موعد نومك ساعة كل يوم للوصول إلى 11 مساءً'
                    : 'Gradually move your bedtime earlier by one hour each day to reach 11 PM',
                details: [isArabic ? 'النوم المبكر يحسن جودة النوم ويزيد الطاقة صباحاً' : 'Early sleep improves sleep quality and increases morning energy']
            });
        } else if (pattern && pattern.type === 'irregular') {
            recommendations.push({
                icon: '📅',
                timing: 'general',
                priority: 'medium',
                title: isArabic ? 'نوم غير منتظم' : 'Irregular Sleep',
                advice: isArabic 
                    ? 'موعد نومك يتغير بشكل كبير من يوم لآخر'
                    : 'Your bedtime varies significantly from day to day',
                action: isArabic 
                    ? 'حاول النوم في وقت ثابت يومياً حتى في عطلات نهاية الأسبوع'
                    : 'Try to sleep at a consistent time daily, even on weekends',
                details: [isArabic ? 'النوم المنتظم ينظم ساعتك البيولوجية' : 'Regular sleep regulates your biological clock']
            });
        }
        
        // توصية مبنية على دين النوم
        if (sleepDebt.severity === 'high') {
            recommendations.push({
                icon: '💤',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'دين نوم متراكم' : 'Sleep Debt Accumulated',
                advice: isArabic 
                    ? `لديك نقص ${sleepDebt.total} ساعة نوم هذا الأسبوع`
                    : `You have a ${sleepDebt.total} hour sleep debt this week`,
                action: isArabic 
                    ? 'خذ قيلولة قصيرة (20-30 دقيقة) لتعويض النقص'
                    : 'Take a short nap (20-30 minutes) to compensate for the deficit',
                details: [isArabic ? 'دين النوم المتراكم يسبب إرهاقاً مزمناً' : 'Accumulated sleep debt causes chronic fatigue']
            });
        }
        
        // توصية للمستخدم الجديد
        if (summary.recordsCount < 3) {
            recommendations.push({
                icon: '📝',
                timing: 'general',
                priority: 'low',
                title: isArabic ? 'ابدأ بتتبع نومك' : 'Start Tracking Your Sleep',
                advice: isArabic 
                    ? 'سجل نومك يومياً للحصول على تحليلات مخصصة'
                    : 'Log your sleep daily to get personalized analytics',
                action: isArabic 
                    ? 'أضف سجل نوم جديد من صفحة النوم الرئيسية'
                    : 'Add a new sleep record from the sleep page',
                details: [isArabic ? 'كلما زادت بياناتك، زادت دقة التحليلات' : 'More data means more accurate insights']
            });
        }
        
        return recommendations;
    };

    // ===========================================
    // الدالة الرئيسية للتحليل
    // ===========================================
    const fetchAllData = async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // جلب بيانات النوم
            const sleepRes = await axiosInstance.get('/sleep/').catch(() => ({ data: [] }));
            let sleepData = [];
            if (sleepRes.data?.results) sleepData = sleepRes.data.results;
            else if (Array.isArray(sleepRes.data)) sleepData = sleepRes.data;
            
            // جلب بيانات المزاج
            const moodRes = await axiosInstance.get('/mood-logs/').catch(() => ({ data: [] }));
            let moodData = [];
            if (moodRes.data?.results) moodData = moodRes.data.results;
            else if (Array.isArray(moodRes.data)) moodData = moodRes.data;
            
            // جلب بيانات النشاط
            const activityRes = await axiosInstance.get('/activities/').catch(() => ({ data: [] }));
            let activityData = [];
            if (activityRes.data?.results) activityData = activityRes.data.results;
            else if (Array.isArray(activityRes.data)) activityData = activityRes.data;
            
            if (!isMountedRef.current) return;
            
            // معالجة سجلات النوم
            const sleepRecords = sleepData.map(s => {
                const startTime = s.sleep_start || s.start_time;
                const endTime = s.sleep_end || s.end_time;
                
                let hours = 0;
                if (startTime && endTime) {
                    const start = new Date(startTime);
                    const end = new Date(endTime);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                        hours = (end - start) / (1000 * 60 * 60);
                    }
                }
                
                return {
                    hours: Math.round(hours * 10) / 10,
                    quality: s.quality_rating || 3,
                    start: startTime ? new Date(startTime) : null,
                    end: endTime ? new Date(endTime) : null,
                };
            }).filter(s => s.hours > 0 && s.hours <= 24);
            
            const hasData = sleepRecords.length > 0;
            
            // حساب الإحصائيات
            let avgHours = 0, avgQuality = 0, totalHours = 0;
            if (hasData) {
                avgHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0) / sleepRecords.length;
                avgQuality = sleepRecords.reduce((sum, s) => sum + s.quality, 0) / sleepRecords.length;
                totalHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0);
            }
            
            const consistency = hasData ? calculateConsistency(sleepRecords) : 0;
            const pattern = hasData ? analyzeSleepPattern(sleepRecords) : null;
            const sleepDebt = hasData ? calculateSleepDebt(sleepRecords) : { total: 0, average: 0, severity: 'none' };
            const sleepScore = hasData ? calculateSleepScore(avgHours, avgQuality, consistency, pattern?.avgBedTime || 0) : 0;
            const durationStatus = hasData ? getDurationStatus(avgHours) : null;
            const qualityStatus = hasData ? getQualityStatus(avgQuality) : null;
            const consistencyStatus = hasData ? getConsistencyStatus(consistency) : null;
            const scoreStatus = getScoreStatus(sleepScore);
            
            // تحليل التأثيرات
            const impacts = hasData ? analyzeSleepImpact(sleepRecords, moodData, activityData) : [];
            
            // توليد التوصيات
            const recommendations = generateSmartRecommendations(
                { avgHours, avgQuality, avgBedTime: pattern?.avgBedTime || 0, recordsCount: sleepRecords.length },
                sleepRecords,
                sleepDebt,
                pattern
            );
            
            // إنشاء التوصيات للمستخدم الجديد
            let noDataRecommendations = [];
            if (!hasData) {
                noDataRecommendations = [{
                    icon: '🌙',
                    timing: 'general',
                    priority: 'low',
                    title: isArabic ? 'سجل نومك' : 'Record Your Sleep',
                    advice: isArabic 
                        ? 'ابدأ بتسجيل نومك للحصول على تحليلات مخصصة'
                        : 'Start recording your sleep to get personalized insights',
                    action: isArabic 
                        ? 'أضف سجل نوم جديد من الصفحة الرئيسية'
                        : 'Add a new sleep record from the main page',
                    details: [isArabic ? 'تحليل النوم يساعدك على تحسين جودة حياتك' : 'Sleep analysis helps improve your quality of life']
                }];
            }
            
            setSmartInsights({
                summary: {
                    avgHours: avgHours > 0 ? avgHours.toFixed(1) : '—',
                    avgQuality: avgQuality > 0 ? avgQuality.toFixed(1) : '—',
                    totalHours: totalHours.toFixed(1),
                    avgBedTime: pattern?.avgBedTime ? `${pattern.avgBedTime}:00` : '—',
                    avgWakeTime: pattern?.avgWakeTime ? `${pattern.avgWakeTime}:00` : '—',
                    recordsCount: sleepRecords.length,
                    consistency,
                    sleepScore,
                    hasData
                },
                analysis: {
                    durationStatus,
                    qualityStatus,
                    consistencyStatus,
                    pattern,
                    sleepDebt,
                    scoreStatus
                },
                impacts,
                recommendations: hasData ? recommendations : noDataRecommendations,
                lastUpdated: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('❌ Error fetching sleep data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{isArabic ? 'جاري تحليل نومك...' : 'Analyzing your sleep...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    if (!smartInsights) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-empty">
                    <div className="empty-icon">🌙</div>
                    <p>{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container sleep-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل النوم' : 'Sleep Analytics'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* 🧠 الحالة الصحية للنوم */}
                <div className="global-health-card">
                    <h3>{isArabic ? '🧠 تحليل نومك' : '🧠 Your Sleep Analysis'}</h3>
                    
                    <div className="health-score-container">
                        <div className="health-score-circle">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                <circle 
                                    cx="60" cy="60" r="54" 
                                    fill="none" 
                                    stroke={smartInsights.analysis.scoreStatus.color} 
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - smartInsights.summary.sleepScore / 100)}`}
                                    transform="rotate(-90 60 60)"
                                />
                                <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">
                                    {smartInsights.summary.sleepScore}%
                                </text>
                            </svg>
                        </div>
                        <div className="health-status">
                            <span className="status-badge" style={{ background: smartInsights.analysis.scoreStatus.color }}>
                                {smartInsights.analysis.scoreStatus.text}
                            </span>
                        </div>
                    </div>
                    
                    {/* التحليل التفصيلي */}
                    <div className="health-analysis">
                        <div className="positives-list">
                            <strong>{isArabic ? '⏱️ تحليل المدة' : '⏱️ Duration Analysis'}</strong>
                            {smartInsights.summary.hasData ? (
                                <div className="positive-item" style={{ color: smartInsights.analysis.durationStatus?.color }}>
                                    {smartInsights.analysis.durationStatus?.icon} {isArabic ? 'متوسط النوم' : 'Average sleep'}: {smartInsights.summary.avgHours} {isArabic ? 'ساعات' : 'hours'} — {smartInsights.analysis.durationStatus?.text}
                                    {smartInsights.summary.avgHours < 7 && smartInsights.summary.avgHours > 0 && (
                                        <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                                            ⚠️ {isArabic ? 'أقل من المعدل الطبيعي (7-9 ساعات)' : 'Below recommended (7-9 hours)'}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="positive-item">{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</div>
                            )}
                        </div>
                        
                        <div className="positives-list" style={{ marginTop: 'var(--spacing-md)' }}>
                            <strong>{isArabic ? '⭐ تحليل الجودة' : '⭐ Quality Analysis'}</strong>
                            {smartInsights.summary.hasData ? (
                                <div className="positive-item" style={{ color: smartInsights.analysis.qualityStatus?.color }}>
                                    {smartInsights.analysis.qualityStatus?.icon} {isArabic ? 'جودة النوم' : 'Sleep quality'}: {smartInsights.summary.avgQuality}/5 — {smartInsights.analysis.qualityStatus?.text}
                                </div>
                            ) : (
                                <div className="positive-item">{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</div>
                            )}
                        </div>
                        
                        <div className="positives-list" style={{ marginTop: 'var(--spacing-md)' }}>
                            <strong>{isArabic ? '📅 تحليل الانتظام' : '📅 Consistency Analysis'}</strong>
                            {smartInsights.summary.hasData && smartInsights.summary.consistency > 0 ? (
                                <div className="positive-item" style={{ color: smartInsights.analysis.consistencyStatus?.color }}>
                                    {smartInsights.analysis.consistencyStatus?.icon} {isArabic ? 'انتظام موعد النوم' : 'Sleep schedule consistency'}: {smartInsights.summary.consistency}% — {smartInsights.analysis.consistencyStatus?.text}
                                </div>
                            ) : (
                                <div className="positive-item">{isArabic ? 'يحتاج 3 أيام على الأقل للتحليل' : 'Need at least 3 days for analysis'}</div>
                            )}
                        </div>
                        
                        {smartInsights.analysis.sleepDebt.total > 0 && smartInsights.summary.hasData && (
                            <div className="warnings-list" style={{ marginTop: 'var(--spacing-md)' }}>
                                <strong>{isArabic ? '📊 دين النوم' : '📊 Sleep Debt'}</strong>
                                <div className={`warning-item severity-${smartInsights.analysis.sleepDebt.severity}`}>
                                    {isArabic 
                                        ? `لديك نقص ${smartInsights.analysis.sleepDebt.total} ساعة نوم هذا الأسبوع`
                                        : `You have a ${smartInsights.analysis.sleepDebt.total} hour sleep debt this week`}
                                </div>
                            </div>
                        )}
                        
                        {smartInsights.analysis.pattern && smartInsights.summary.hasData && (
                            <div className="positives-list" style={{ marginTop: 'var(--spacing-md)' }}>
                                <strong>{isArabic ? '🦉 نمط النوم' : '🦉 Sleep Pattern'}</strong>
                                <div className="positive-item">
                                    {isArabic 
                                        ? `نمطك: ${smartInsights.analysis.pattern.text}`
                                        : `Your pattern: ${smartInsights.analysis.pattern.text}`}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🧠 تأثير النوم على الصحة */}
                {smartInsights.impacts && smartInsights.impacts.length > 0 && (
                    <div className="correlations-card">
                        <h3>{isArabic ? '🧠 تأثير النوم على صحتك' : '🧠 Sleep Impact on Your Health'}</h3>
                        <div className="correlations-list">
                            {smartInsights.impacts.map((impact, idx) => (
                                <div key={idx} className={`correlation-item severity-${impact.severity}`}>
                                    <p className="correlation-message">{impact.message}</p>
                                    <p className="correlation-advice">💡 {impact.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 💡 التوصيات الذكية */}
                {smartInsights.recommendations && smartInsights.recommendations.length > 0 && (
                    <div className="recommendations-card">
                        <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                        <div className="recommendations-list">
                            {smartInsights.recommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon}</span>
                                        <span className="rec-title">{rec.title}</span>
                                        <span className={`rec-timing timing-${rec.timing}`}>
                                            {rec.timing === 'tonight' ? (isArabic ? '🌙 الليلة' : '🌙 Tonight') :
                                             rec.timing === 'today' ? (isArabic ? '📅 اليوم' : '📅 Today') :
                                             (isArabic ? '💡 عام' : '💡 General')}
                                        </span>
                                    </div>
                                    <p className="rec-advice">{rec.advice}</p>
                                    <p className="rec-action">🎯 {rec.action}</p>
                                    {rec.details && rec.details.length > 0 && (
                                        <ul className="rec-details">
                                            {rec.details.map((detail, i) => (
                                                <li key={i}>✓ {detail}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* بطاقات الملخص الأساسي */}
                <div className="analytics-stats-grid">
                    <div className="analytics-stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.avgHours}</div>
                            <div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div>
                        </div>
                    </div>
                    <div className="analytics-stat-card">
                        <div className="stat-icon">⭐</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.avgQuality}/5</div>
                            <div className="stat-label">{isArabic ? 'الجودة' : 'Quality'}</div>
                        </div>
                    </div>
                    <div className="analytics-stat-card">
                        <div className="stat-icon">🌙</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.avgBedTime}</div>
                            <div className="stat-label">{isArabic ? 'موعد النوم' : 'Bedtime'}</div>
                        </div>
                    </div>
                    <div className="analytics-stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.recordsCount}</div>
                            <div className="stat-label">{isArabic ? 'ليلة مسجلة' : 'Nights'}</div>
                        </div>
                    </div>
                </div>

                <div className="analytics-footer">
                    <small>
                        {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(smartInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default SleepAnalytics;