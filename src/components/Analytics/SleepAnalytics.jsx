// src/components/Analytics/SleepAnalytics.jsx - النسخة المطورة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { mean } from 'mathjs';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import * as stats from 'simple-statistics';
import axiosInstance from '../../services/api';
import '../../index.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const SleepAnalytics = ({ refreshTrigger }) => {
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
    
    const [smartInsights, setSmartInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // ✅ الاستماع لتغييرات اللغة
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

    // ✅ الاستماع لتغيير الثيم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ===========================================
    // حساب Sleep Score المتقدم
    // ===========================================
    const calculateSleepScore = (avgHours, avgQuality, consistency, avgBedTime, deepSleepPercent, wakeupsCount) => {
        let score = 0;
        
        // المدة (30 نقطة)
        if (avgHours >= 7 && avgHours <= 8) score += 30;
        else if (avgHours >= 6.5 && avgHours < 7) score += 25;
        else if (avgHours >= 6 && avgHours < 6.5) score += 20;
        else if (avgHours >= 5 && avgHours < 6) score += 15;
        else if (avgHours > 0) score += 10;
        
        // الجودة (25 نقطة)
        score += Math.min(25, avgQuality * 5);
        
        // الانتظام (15 نقطة)
        if (consistency >= 80) score += 15;
        else if (consistency >= 60) score += 10;
        else if (consistency >= 40) score += 5;
        
        // وقت النوم (15 نقطة)
        if (avgBedTime >= 22 && avgBedTime <= 23) score += 15;
        else if (avgBedTime >= 23 && avgBedTime <= 24) score += 10;
        else if (avgBedTime > 0 && avgBedTime <= 1) score += 5;
        
        // النوم العميق (10 نقاط)
        if (deepSleepPercent >= 20) score += 10;
        else if (deepSleepPercent >= 15) score += 7;
        else if (deepSleepPercent >= 10) score += 4;
        
        // الاستيقاظ ليلاً (5 نقاط - عكسياً)
        if (wakeupsCount === 0) score += 5;
        else if (wakeupsCount === 1) score += 3;
        else if (wakeupsCount === 2) score += 1;
        
        return Math.min(100, Math.max(0, Math.round(score)));
    };
    
    const getScoreStatus = (score) => {
        if (score >= 80) return { text: isArabic ? 'ممتاز' : 'Excellent', color: '#10b981', icon: '🌟' };
        if (score >= 65) return { text: isArabic ? 'جيد جداً' : 'Very Good', color: '#3b82f6', icon: '👍' };
        if (score >= 50) return { text: isArabic ? 'جيد' : 'Good', color: '#8b5cf6', icon: '📊' };
        if (score >= 35) return { text: isArabic ? 'متوسط' : 'Fair', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'ضعيف' : 'Poor', color: '#ef4444', icon: '❌' };
    };
    
    const getDurationStatus = (hours) => {
        if (hours >= 7 && hours <= 9) return { text: isArabic ? 'مثالي' : 'Ideal', color: '#10b981', icon: '✅' };
        if (hours >= 6.5 && hours < 7) return { text: isArabic ? 'جيد جداً' : 'Very Good', color: '#3b82f6', icon: '👍' };
        if (hours >= 6 && hours < 6.5) return { text: isArabic ? 'مقبول' : 'Acceptable', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'غير كافٍ' : 'Insufficient', color: '#ef4444', icon: '❌' };
    };
    
    const getQualityStatus = (quality) => {
        if (quality >= 4.5) return { text: isArabic ? 'ممتازة' : 'Excellent', color: '#10b981', icon: '✅' };
        if (quality >= 3.5) return { text: isArabic ? 'جيدة' : 'Good', color: '#3b82f6', icon: '👍' };
        if (quality >= 2.5) return { text: isArabic ? 'متوسطة' : 'Average', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'سيئة' : 'Poor', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // تحليل انتظام النوم المتقدم
    // ===========================================
    const calculateConsistency = (sleepRecords) => {
        if (sleepRecords.length < 3) return 0;
        
        const bedTimes = sleepRecords.map(s => {
            const hour = s.start?.getHours() || 0;
            const minute = s.start?.getMinutes() || 0;
            return hour + minute / 60;
        }).filter(h => h > 0);
        
        const wakeTimes = sleepRecords.map(s => {
            const hour = s.end?.getHours() || 0;
            const minute = s.end?.getMinutes() || 0;
            return hour + minute / 60;
        }).filter(h => h > 0);
        
        if (bedTimes.length < 2) return 0;
        
        const bedtimeVariance = stats.sampleVariance(bedTimes);
        const waketimeVariance = wakeTimes.length >= 2 ? stats.sampleVariance(wakeTimes) : bedtimeVariance;
        
        const avgVariance = (bedtimeVariance + waketimeVariance) / 2;
        const maxVariance = 16;
        const consistency = Math.max(0, 100 - (avgVariance / maxVariance) * 100);
        
        return Math.round(consistency);
    };
    
    const getConsistencyStatus = (consistency) => {
        if (consistency >= 80) return { text: isArabic ? 'منتظم جداً' : 'Very Regular', color: '#10b981', icon: '✅' };
        if (consistency >= 60) return { text: isArabic ? 'منتظم' : 'Regular', color: '#3b82f6', icon: '📊' };
        if (consistency >= 40) return { text: isArabic ? 'متوسط الانتظام' : 'Moderately Regular', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'غير منتظم' : 'Irregular', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // حساب دين النوم المتقدم
    // ===========================================
    const calculateSleepDebt = (sleepRecords) => {
        const OPTIMAL_HOURS = 8;
        let totalDebt = 0;
        let debtDays = 0;
        
        sleepRecords.forEach(record => {
            if (record.hours > 0 && record.hours < OPTIMAL_HOURS) {
                totalDebt += OPTIMAL_HOURS - record.hours;
                debtDays++;
            }
        });
        
        const avgDebtPerDay = debtDays > 0 ? totalDebt / debtDays : 0;
        
        let severity = 'none';
        let severityText = '';
        if (totalDebt > 15) {
            severity = 'critical';
            severityText = isArabic ? 'حرج - يوصى باستشارة طبيب' : 'Critical - medical consultation recommended';
        } else if (totalDebt > 10) {
            severity = 'high';
            severityText = isArabic ? 'مرتفع - يؤثر على صحتك' : 'High - affects your health';
        } else if (totalDebt > 5) {
            severity = 'medium';
            severityText = isArabic ? 'متوسط - يسبب التعب' : 'Medium - causes fatigue';
        } else if (totalDebt > 2) {
            severity = 'low';
            severityText = isArabic ? 'خفيف - قابل للتعويض' : 'Low - can be compensated';
        }
        
        return {
            total: Math.round(totalDebt * 10) / 10,
            avgPerDay: Math.round(avgDebtPerDay * 10) / 10,
            debtDays,
            severity,
            severityText
        };
    };

    // ===========================================
    // تحليل نمط النوم المتقدم
    // ===========================================
    const analyzeSleepPattern = (sleepRecords) => {
        if (sleepRecords.length < 4) return null;
        
        const bedTimes = sleepRecords.map(s => {
            const hour = s.start?.getHours() || 0;
            const minute = s.start?.getMinutes() || 0;
            return hour + minute / 60;
        }).filter(h => h > 0 && h < 24);
        
        const wakeTimes = sleepRecords.map(s => {
            const hour = s.end?.getHours() || 0;
            const minute = s.end?.getMinutes() || 0;
            return hour + minute / 60;
        }).filter(h => h > 0 && h < 24);
        
        const avgBedTime = bedTimes.length > 0 ? math.mean(bedTimes) : 0;
        const avgWakeTime = wakeTimes.length > 0 ? math.mean(wakeTimes) : 0;
        const avgDuration = avgWakeTime > avgBedTime ? avgWakeTime - avgBedTime : (24 - avgBedTime) + avgWakeTime;
        
        let chronotype = '';
        let chronotypeDesc = '';
        if (avgBedTime >= 0 && avgBedTime <= 2) {
            chronotype = isArabic ? 'بومة ليلية متطرفة' : 'Extreme Night Owl';
            chronotypeDesc = isArabic ? 'تنام متأخراً جداً، قد يؤثر على صحتك' : 'You sleep very late, may affect your health';
        } else if (avgBedTime >= 2 && avgBedTime <= 4) {
            chronotype = isArabic ? 'بومة ليلية' : 'Night Owl';
            chronotypeDesc = isArabic ? 'تفضل السهر، حاول التبكير تدريجياً' : 'You prefer staying up late, try to gradually shift earlier';
        } else if (avgBedTime >= 22 && avgBedTime <= 23) {
            chronotype = isArabic ? 'نمط طبيعي' : 'Normal';
            chronotypeDesc = isArabic ? 'مواعيد نومك صحية' : 'Your sleep schedule is healthy';
        } else if (avgBedTime >= 21 && avgBedTime < 22) {
            chronotype = isArabic ? 'طفرة صباحية' : 'Early Bird';
            chronotypeDesc = isArabic ? 'تنام مبكراً، هذا ممتاز' : 'You sleep early, this is excellent';
        } else {
            chronotype = isArabic ? 'نمط غير منتظم' : 'Irregular';
            chronotypeDesc = isArabic ? 'مواعيد نومك غير ثابتة' : 'Your sleep times are inconsistent';
        }
        
        const bedtimeVariance = bedTimes.length > 1 ? stats.sampleVariance(bedTimes) : 0;
        const patternType = bedtimeVariance > 4 ? 'irregular' : 'regular';
        
        return {
            type: patternType,
            chronotype,
            chronotypeDesc,
            avgBedTime: Math.round(avgBedTime),
            avgWakeTime: Math.round(avgWakeTime),
            avgDuration: Math.round(avgDuration * 10) / 10,
            bedtimeVariance: Math.round(bedtimeVariance * 10) / 10
        };
    };

    // ===========================================
    // تحليل مراحل النوم
    // ===========================================
    const analyzeSleepStages = (sleepRecords) => {
        let totalDeepSleep = 0;
        let totalLightSleep = 0;
        let totalRemSleep = 0;
        let totalWakeups = 0;
        let recordsWithStages = 0;
        
        sleepRecords.forEach(record => {
            const deepSleep = record.deep_sleep_minutes || 0;
            const lightSleep = record.light_sleep_minutes || 0;
            const remSleep = record.rem_sleep_minutes || 0;
            const wakeups = record.wakeups_count || 0;
            
            if (deepSleep > 0 || lightSleep > 0 || remSleep > 0) {
                totalDeepSleep += deepSleep;
                totalLightSleep += lightSleep;
                totalRemSleep += remSleep;
                totalWakeups += wakeups;
                recordsWithStages++;
            }
        });
        
        if (recordsWithStages === 0) return null;
        
        const avgDeepSleep = totalDeepSleep / recordsWithStages;
        const avgLightSleep = totalLightSleep / recordsWithStages;
        const avgRemSleep = totalRemSleep / recordsWithStages;
        const avgWakeups = totalWakeups / recordsWithStages;
        const totalMinutes = avgDeepSleep + avgLightSleep + avgRemSleep;
        
        const deepSleepPercent = totalMinutes > 0 ? (avgDeepSleep / totalMinutes) * 100 : 0;
        const lightSleepPercent = totalMinutes > 0 ? (avgLightSleep / totalMinutes) * 100 : 0;
        const remSleepPercent = totalMinutes > 0 ? (avgRemSleep / totalMinutes) * 100 : 0;
        
        let deepSleepStatus = '';
        if (deepSleepPercent >= 20) deepSleepStatus = isArabic ? 'ممتاز' : 'Excellent';
        else if (deepSleepPercent >= 15) deepSleepStatus = isArabic ? 'جيد' : 'Good';
        else if (deepSleepPercent >= 10) deepSleepStatus = isArabic ? 'مقبول' : 'Fair';
        else deepSleepStatus = isArabic ? 'منخفض' : 'Low';
        
        return {
            avgDeepSleepMinutes: Math.round(avgDeepSleep),
            avgLightSleepMinutes: Math.round(avgLightSleep),
            avgRemSleepMinutes: Math.round(avgRemSleep),
            avgWakeups: Math.round(avgWakeups * 10) / 10,
            deepSleepPercent: Math.round(deepSleepPercent),
            lightSleepPercent: Math.round(lightSleepPercent),
            remSleepPercent: Math.round(remSleepPercent),
            deepSleepStatus,
            recordsCount: recordsWithStages
        };
    };

    // ===========================================
    // تحليل تأثير النوم على المزاج والطاقة
    // ===========================================
    const analyzeSleepImpact = (sleepRecords, moodData, activityData) => {
        const insights = [];
        
        if (sleepRecords.length >= 3 && moodData.length >= 3) {
            const lowSleepDays = sleepRecords
                .filter(s => s.hours < 6 && s.hours > 0)
                .map(s => s.start?.toDateString());
            
            const goodSleepDays = sleepRecords
                .filter(s => s.hours >= 7 && s.hours <= 9)
                .map(s => s.start?.toDateString());
            
            const moodAfterLowSleep = moodData.filter(m => {
                const moodDate = new Date(m.entry_time).toDateString();
                return lowSleepDays.includes(moodDate);
            });
            
            const moodAfterGoodSleep = moodData.filter(m => {
                const moodDate = new Date(m.entry_time).toDateString();
                return goodSleepDays.includes(moodDate);
            });
            
            if (moodAfterLowSleep.length > 0 && moodAfterGoodSleep.length > 0) {
                const badMoodCountLow = moodAfterLowSleep.filter(m => 
                    ['Stressed', 'Anxious', 'Sad', 'Depressed'].includes(m.mood)
                ).length;
                const badMoodCountGood = moodAfterGoodSleep.filter(m => 
                    ['Stressed', 'Anxious', 'Sad', 'Depressed'].includes(m.mood)
                ).length;
                
                const lowSleepBadPercent = (badMoodCountLow / moodAfterLowSleep.length) * 100;
                const goodSleepBadPercent = (badMoodCountGood / moodAfterGoodSleep.length) * 100;
                const improvement = goodSleepBadPercent - lowSleepBadPercent;
                
                if (improvement < -20) {
                    insights.push({
                        type: 'mood_impact',
                        severity: 'high',
                        icon: '😊',
                        title: isArabic ? 'النوم الجيد يحسن مزاجك' : 'Good sleep improves your mood',
                        message: isArabic 
                            ? `عندما تنام 7+ ساعات، يتحسن مزاجك بنسبة ${Math.abs(Math.round(improvement))}%`
                            : `When you sleep 7+ hours, your mood improves by ${Math.abs(Math.round(improvement))}%`,
                        recommendation: isArabic ? 'حافظ على 7-8 ساعات نوم لصحة نفسية أفضل' : 'Maintain 7-8 hours of sleep for better mental health'
                    });
                }
            }
        }
        
        // تحليل الطاقة والإنتاجية
        if (sleepRecords.length >= 3 && activityData.length >= 3) {
            const goodSleepDays = sleepRecords
                .filter(s => s.hours >= 7)
                .map(s => s.start?.toDateString());
            
            const activityAfterGoodSleep = activityData.filter(a => {
                const activityDate = new Date(a.start_time).toDateString();
                return goodSleepDays.includes(activityDate);
            });
            
            const avgActivityAfterGoodSleep = activityAfterGoodSleep.length > 0 
                ? activityAfterGoodSleep.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / activityAfterGoodSleep.length
                : 0;
            
            if (avgActivityAfterGoodSleep > 30) {
                insights.push({
                    type: 'energy_impact',
                    severity: 'medium',
                    icon: '⚡',
                    title: isArabic ? 'النوم الجيد يزيد طاقتك' : 'Good sleep boosts your energy',
                    message: isArabic 
                        ? `بعد النوم الجيد، تمارس نشاطاً بدنياً أكثر`
                        : `After good sleep, you engage in more physical activity`,
                    recommendation: isArabic ? 'النوم المنتظم يزيد إنتاجيتك' : 'Regular sleep increases your productivity'
                });
            }
        }
        
        return insights;
    };

    // ===========================================
    // توقع جودة النوم
    // ===========================================
    const predictSleepQuality = (sleepRecords) => {
        if (sleepRecords.length < 7) return null;
        
        const recentWeek = sleepRecords.slice(-7);
        const avgRecentHours = recentWeek.reduce((sum, s) => sum + s.hours, 0) / recentWeek.length;
        const avgRecentQuality = recentWeek.reduce((sum, s) => sum + s.quality, 0) / recentWeek.length;
        
        const previousWeek = sleepRecords.slice(-14, -7);
        const avgPreviousHours = previousWeek.length > 0 ? previousWeek.reduce((sum, s) => sum + s.hours, 0) / previousWeek.length : avgRecentHours;
        const avgPreviousQuality = previousWeek.length > 0 ? previousWeek.reduce((sum, s) => sum + s.quality, 0) / previousWeek.length : avgRecentQuality;
        
        const hoursTrend = avgRecentHours - avgPreviousHours;
        const qualityTrend = avgRecentQuality - avgPreviousQuality;
        
        let predictedHours = avgRecentHours;
        let predictedQuality = avgRecentQuality;
        
        if (hoursTrend > 0.3) predictedHours = Math.min(8.5, avgRecentHours + 0.2);
        else if (hoursTrend < -0.3) predictedHours = Math.max(5, avgRecentHours - 0.2);
        
        if (qualityTrend > 0.5) predictedQuality = Math.min(5, avgRecentQuality + 0.2);
        else if (qualityTrend < -0.5) predictedQuality = Math.max(1, avgRecentQuality - 0.2);
        
        return {
            predictedHours: Math.round(predictedHours * 10) / 10,
            predictedQuality: Math.round(predictedQuality * 10) / 10,
            trend: hoursTrend > 0 ? 'improving' : hoursTrend < 0 ? 'declining' : 'stable'
        };
    };

    // ===========================================
    // توليد توصيات ذكية متقدمة
    // ===========================================
    const generateSmartRecommendations = (summary, sleepRecords, sleepDebt, pattern, stages) => {
        const recommendations = [];
        
        // توصية المدة
        if (summary.avgHours < 6 && summary.avgHours > 0) {
            recommendations.push({
                icon: '⏰',
                timing: 'tonight',
                priority: 'high',
                category: 'duration',
                title: isArabic ? 'نوم غير كافٍ' : 'Insufficient Sleep',
                advice: isArabic 
                    ? `متوسط نومك ${summary.avgHours} ساعات`
                    : `Your average sleep is ${summary.avgHours} hours`,
                action: isArabic 
                    ? `اذهب إلى الفراش مبكراً بـ 30-60 دقيقة`
                    : `Go to bed 30-60 minutes earlier`,
                details: [isArabic ? '7-8 ساعات نوم تحسن الصحة والتركيز' : '7-8 hours of sleep improves health and focus']
            });
        } else if (summary.avgHours > 9 && summary.avgHours > 0) {
            recommendations.push({
                icon: '💤',
                timing: 'tonight',
                priority: 'medium',
                category: 'duration',
                title: isArabic ? 'نوم طويل' : 'Long Sleep',
                advice: isArabic 
                    ? `متوسط نومك ${summary.avgHours} ساعات`
                    : `Your average sleep is ${summary.avgHours} hours`,
                action: isArabic 
                    ? 'قد يشير النوم الطويل إلى مشكلة صحية، استشر طبيباً'
                    : 'Long sleep may indicate a health issue, consult a doctor',
                details: [isArabic ? 'النوم أكثر من 9 ساعات قد يسبب الخمول' : 'Sleeping more than 9 hours may cause lethargy']
            });
        }
        
        // توصية الجودة
        if (summary.avgQuality < 3 && summary.avgQuality > 0) {
            recommendations.push({
                icon: '⭐',
                timing: 'tonight',
                priority: 'high',
                category: 'quality',
                title: isArabic ? 'جودة نوم منخفضة' : 'Low Sleep Quality',
                advice: isArabic 
                    ? `جودة نومك ${summary.avgQuality}/5`
                    : `Your sleep quality is ${summary.avgQuality}/5`,
                action: isArabic 
                    ? 'تجنب الكافيين بعد العصر، وأطفئ الشاشات قبل النوم بساعة'
                    : 'Avoid caffeine after 4 PM, turn off screens one hour before bed',
                details: [isArabic ? 'النوم العميق يساعد على استعادة الطاقة' : 'Deep sleep helps restore energy']
            });
        }
        
        // توصية الانتظام
        if (summary.consistency < 50 && summary.consistency > 0) {
            recommendations.push({
                icon: '📅',
                timing: 'tonight',
                priority: 'medium',
                category: 'consistency',
                title: isArabic ? 'مواعيد نوم غير منتظمة' : 'Irregular Sleep Schedule',
                advice: isArabic 
                    ? `انتظام نومك ${summary.consistency}%`
                    : `Your sleep consistency is ${summary.consistency}%`,
                action: isArabic 
                    ? 'ثبّت موعد نومك واستيقاظك يومياً حتى في العطلات'
                    : 'Fix your sleep and wake times daily, even on weekends',
                details: [isArabic ? 'الانتظام يحسن الساعة البيولوجية' : 'Regularity improves your circadian rhythm']
            });
        }
        
        // توصية النوم العميق
        if (stages && stages.deepSleepPercent < 15 && stages.deepSleepPercent > 0) {
            recommendations.push({
                icon: '💤',
                timing: 'tonight',
                priority: 'medium',
                category: 'deep_sleep',
                title: isArabic ? 'نوم عميق منخفض' : 'Low Deep Sleep',
                advice: isArabic 
                    ? `نومك العميق ${stages.deepSleepPercent}% من إجمالي النوم`
                    : `Your deep sleep is ${stages.deepSleepPercent}% of total sleep`,
                action: isArabic 
                    ? 'مارس الرياضة نهاراً، وتجنب الوجبات الثقيلة قبل النوم'
                    : 'Exercise during the day, avoid heavy meals before bed',
                details: [isArabic ? 'النوم العميق مهم لتجديد الخلايا' : 'Deep sleep is important for cell regeneration']
            });
        }
        
        // توصية دين النوم
        if (sleepDebt.severity === 'high' || sleepDebt.severity === 'critical') {
            recommendations.push({
                icon: '💤',
                timing: 'weekend',
                priority: 'medium',
                category: 'debt',
                title: isArabic ? 'دين نوم متراكم' : 'Sleep Debt Accumulated',
                advice: isArabic 
                    ? `لديك نقص ${sleepDebt.total} ساعة نوم`
                    : `You have a ${sleepDebt.total} hour sleep debt`,
                action: isArabic 
                    ? 'خذ قيلولة قصيرة (20-30 دقيقة) أو نم مبكراً في العطلة'
                    : 'Take a short nap (20-30 minutes) or sleep early on vacation',
                details: [isArabic ? 'دين النوم يسبب التعب وضعف التركيز' : 'Sleep debt causes fatigue and poor concentration']
            });
        }
        
        // توصية النمط الزمني
        if (pattern && pattern.chronotype === 'Night Owl' && pattern.avgBedTime > 0) {
            recommendations.push({
                icon: '🌙',
                timing: 'general',
                priority: 'low',
                category: 'chronotype',
                title: isArabic ? 'نمط بومة ليلية' : 'Night Owl Pattern',
                advice: isArabic 
                    ? `عادةً تنام بعد الساعة ${pattern.avgBedTime}:00`
                    : `You usually sleep after ${pattern.avgBedTime}:00`,
                action: isArabic 
                    ? 'قدم موعد نومك تدريجياً بـ 15 دقيقة كل أسبوع'
                    : 'Gradually move your bedtime 15 minutes earlier each week',
                details: [isArabic ? 'النوم المبكر يحسن صحة القلب' : 'Earlier sleep improves heart health']
            });
        }
        
        if (summary.recordsCount < 3) {
            recommendations.push({
                icon: '📝',
                timing: 'general',
                priority: 'low',
                category: 'tracking',
                title: isArabic ? 'سجل نومك بانتظام' : 'Track Your Sleep Regularly',
                advice: isArabic 
                    ? 'سجل نومك يومياً للحصول على تحليلات مخصصة'
                    : 'Log your sleep daily for personalized insights',
                action: isArabic 
                    ? 'أضف سجل نوم جديد من الصفحة الرئيسية'
                    : 'Add a new sleep record from the main page',
                details: [isArabic ? 'البيانات الأكثر دقة تعطي تحليلات أفضل' : 'More data = better insights']
            });
        }
        
        return recommendations;
    };

    // ===========================================
    // الدالة الرئيسية للتحليل
    // ===========================================
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            console.log('🌙 Fetching sleep data for advanced analytics...');
            
            const [sleepRes, moodRes, activityRes] = await Promise.all([
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] }))
            ]);
            
            let sleepData = [];
            if (sleepRes.data?.results) sleepData = sleepRes.data.results;
            else if (Array.isArray(sleepRes.data)) sleepData = sleepRes.data;
            
            let moodData = [];
            if (moodRes.data?.results) moodData = moodRes.data.results;
            else if (Array.isArray(moodRes.data)) moodData = moodRes.data;
            
            let activityData = [];
            if (activityRes.data?.results) activityData = activityRes.data.results;
            else if (Array.isArray(activityRes.data)) activityData = activityRes.data;
            
            if (!isMountedRef.current) return;
            
            console.log('🌙 Sleep records found:', sleepData.length);
            
            const sleepRecords = sleepData.map(s => {
                const startTime = s.sleep_start || s.start_time;
                const endTime = s.sleep_end || s.end_time;
                
                let hours = 0;
                let start = null, end = null;
                if (startTime && endTime) {
                    start = new Date(startTime);
                    end = new Date(endTime);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                        hours = (end - start) / (1000 * 60 * 60);
                    }
                }
                
                return {
                    hours: Math.round(hours * 10) / 10,
                    quality: s.quality_rating || 3,
                    start,
                    end,
                    deep_sleep_minutes: s.deep_sleep_minutes || 0,
                    light_sleep_minutes: s.light_sleep_minutes || 0,
                    rem_sleep_minutes: s.rem_sleep_minutes || 0,
                    wakeups_count: s.wakeups_count || 0,
                };
            }).filter(s => s.hours > 0 && s.hours <= 24);
            
            const hasData = sleepRecords.length > 0;
            
            // البيانات الإحصائية الأساسية
            let avgHours = 0, avgQuality = 0, totalHours = 0;
            if (hasData) {
                avgHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0) / sleepRecords.length;
                avgQuality = sleepRecords.reduce((sum, s) => sum + s.quality, 0) / sleepRecords.length;
                totalHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0);
            }
            
            // التحليلات المتقدمة
            const consistency = hasData ? calculateConsistency(sleepRecords) : 0;
            const pattern = hasData ? analyzeSleepPattern(sleepRecords) : null;
            const sleepDebt = hasData ? calculateSleepDebt(sleepRecords) : { total: 0, severity: 'none', severityText: '', avgPerDay: 0, debtDays: 0 };
            const stages = hasData ? analyzeSleepStages(sleepRecords) : null;
            const impacts = hasData ? analyzeSleepImpact(sleepRecords, moodData, activityData) : [];
            const prediction = hasData ? predictSleepQuality(sleepRecords) : null;
            
            const sleepScore = hasData ? calculateSleepScore(
                avgHours, avgQuality, consistency, pattern?.avgBedTime || 0,
                stages?.deepSleepPercent || 0, stages?.avgWakeups || 0
            ) : 0;
            
            const durationStatus = hasData ? getDurationStatus(avgHours) : null;
            const qualityStatus = hasData ? getQualityStatus(avgQuality) : null;
            const consistencyStatus = hasData ? getConsistencyStatus(consistency) : null;
            const scoreStatus = getScoreStatus(sleepScore);
            
            const recommendations = generateSmartRecommendations(
                { avgHours, avgQuality, consistency, recordsCount: sleepRecords.length },
                sleepRecords, sleepDebt, pattern, stages
            );
            
            // بيانات الرسم البياني الأسبوعي
            const weeklyData = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dayRecords = sleepRecords.filter(s => {
                    if (!s.start) return false;
                    return s.start.toDateString() === date.toDateString();
                });
                const dayAvgHours = dayRecords.length > 0 ? dayRecords.reduce((sum, s) => sum + s.hours, 0) / dayRecords.length : 0;
                const dayAvgQuality = dayRecords.length > 0 ? dayRecords.reduce((sum, s) => sum + s.quality, 0) / dayRecords.length : 0;
                weeklyData.push({
                    day: date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' }),
                    hours: Math.round(dayAvgHours * 10) / 10,
                    quality: Math.round(dayAvgQuality * 10) / 10,
                });
            }
            
            const chartData = {
                labels: weeklyData.map(w => w.day),
                datasets: [{
                    label: isArabic ? 'ساعات النوم' : 'Sleep Hours',
                    data: weeklyData.map(w => w.hours),
                    borderColor: '#6366f1',
                    backgroundColor: darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                }]
            };
            
            const qualityChartData = {
                labels: weeklyData.map(w => w.day),
                datasets: [{
                    label: isArabic ? 'جودة النوم (1-5)' : 'Sleep Quality (1-5)',
                    data: weeklyData.map(w => w.quality),
                    borderColor: '#f59e0b',
                    backgroundColor: darkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#f59e0b',
                }]
            };
            
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: darkMode ? '#f8fafc' : '#0f172a', font: { size: 11 } } },
                    tooltip: { rtl: isArabic }
                },
                scales: {
                    y: { beginAtZero: true, max: 12, grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } },
                    x: { grid: { display: false }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } }
                }
            };
            
            const qualityChartOptions = {
                ...chartOptions,
                scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, max: 5 } }
            };
            
            if (isMountedRef.current) {
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
                        stages,
                        scoreStatus
                    },
                    impacts,
                    prediction,
                    recommendations: recommendations.slice(0, 4),
                    chartData,
                    qualityChartData,
                    chartOptions,
                    qualityChartOptions,
                    weeklyData,
                    lastUpdated: new Date().toISOString()
                });
                setError(null);
            }
            
        } catch (err) {
            console.error('❌ Error fetching sleep data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic, darkMode]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();
        return () => { isMountedRef.current = false; isFetchingRef.current = false; };
    }, [fetchAllData]);

    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current) fetchAllData();
    }, [refreshTrigger, fetchAllData]);

    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading"><div className="spinner"></div><p>{isArabic ? 'جاري تحليل نومك...' : 'Analyzing your sleep...'}</p></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error"><p>⚠️ {error}</p><button onClick={fetchAllData} className="retry-btn">🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}</button></div>
            </div>
        );
    }

    if (!smartInsights) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-empty"><div className="empty-icon">🌙</div><p>{isArabic ? 'جاري تحضير التحليلات...' : 'Preparing insights...'}</p></div>
            </div>
        );
    }

    const { summary, analysis, impacts, prediction, recommendations, chartData, qualityChartData, chartOptions, qualityChartOptions, weeklyData } = smartInsights;

    return (
        <div className={`analytics-container sleep-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>📊 {isArabic ? 'تحليل النوم المتقدم' : 'Advanced Sleep Analytics'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>🔄</button>
            </div>

            {/* التبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'analysis' ? 'active' : ''} onClick={() => setActiveTab('analysis')}>📊 {isArabic ? 'التحليل' : 'Analysis'}</button>
                <button className={activeTab === 'trends' ? 'active' : ''} onClick={() => setActiveTab('trends')}>📈 {isArabic ? 'الاتجاهات' : 'Trends'}</button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>🧠 {isArabic ? 'رؤى ذكية' : 'Smart Insights'}</button>
            </div>

            {activeTab === 'analysis' && (
                <div className="tab-content">
                    {/* بطاقة التحليل الرئيسية */}
                    <div className="global-health-card">
                        <h3>{isArabic ? 'تحليل نومك' : 'Your Sleep Analysis'}</h3>
                        <div className="health-score-container">
                            <div className="health-score-circle">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8"/>
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#ffffff" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 54}`} strokeDashoffset={`${2 * Math.PI * 54 * (1 - (summary.sleepScore || 0) / 100)}`} transform="rotate(-90 60 60)"/>
                                    <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">{summary.sleepScore || 0}%</text>
                                </svg>
                            </div>
                            <div className="health-status">
                                <span className="status-badge" style={{ background: analysis.scoreStatus?.color || '#6366f1' }}>
                                    {analysis.scoreStatus?.icon} {analysis.scoreStatus?.text || (isArabic ? 'متوسط' : 'Average')}
                                </span>
                            </div>
                        </div>
                        <div className="health-analysis">
                            <div className="analysis-summary">
                                <strong>{isArabic ? 'التحليل:' : 'Analysis:'}</strong>
                                <p>{summary.hasData ? (isArabic ? `متوسط نومك ${summary.avgHours} ساعات بجودة ${summary.avgQuality}/5` : `Average sleep: ${summary.avgHours} hours with quality ${summary.avgQuality}/5`) : (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                            </div>
                        </div>
                    </div>

                    {/* الإحصائيات السريعة */}
                    <div className="analytics-stats-grid">
                        <div className="analytics-stat-card"><div className="stat-icon">⏱️</div><div className="stat-content"><div className="stat-value">{summary.avgHours}</div><div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div></div></div>
                        <div className="analytics-stat-card"><div className="stat-icon">⭐</div><div className="stat-content"><div className="stat-value">{summary.avgQuality}/5</div><div className="stat-label">{isArabic ? 'الجودة' : 'Quality'}</div></div></div>
                        <div className="analytics-stat-card"><div className="stat-icon">📊</div><div className="stat-content"><div className="stat-value">{summary.consistency}%</div><div className="stat-label">{isArabic ? 'الانتظام' : 'Consistency'}</div></div></div>
                        <div className="analytics-stat-card"><div className="stat-icon">🌙</div><div className="stat-content"><div className="stat-value">{summary.avgBedTime !== '—' ? summary.avgBedTime : '—'}</div><div className="stat-label">{isArabic ? 'موعد النوم' : 'Bedtime'}</div></div></div>
                        <div className="analytics-stat-card"><div className="stat-icon">☀️</div><div className="stat-content"><div className="stat-value">{summary.avgWakeTime !== '—' ? summary.avgWakeTime : '—'}</div><div className="stat-label">{isArabic ? 'موعد الاستيقاظ' : 'Wake Time'}</div></div></div>
                        <div className="analytics-stat-card"><div className="stat-icon">📅</div><div className="stat-content"><div className="stat-value">{summary.recordsCount}</div><div className="stat-label">{isArabic ? 'ليلة مسجلة' : 'Nights'}</div></div></div>
                    </div>

                    {/* التفاصيل المتقدمة */}
                    <div className="details-grid">
                        {analysis.durationStatus && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">⏱️</span><span>{isArabic ? 'مدة النوم' : 'Sleep Duration'}</span></div>
                                <div className="detail-value" style={{ color: analysis.durationStatus.color }}>{analysis.durationStatus.text}</div>
                                <div className="detail-desc">{analysis.durationStatus.icon} {isArabic ? `${summary.avgHours} ساعات` : `${summary.avgHours} hours`}</div>
                            </div>
                        )}
                        {analysis.qualityStatus && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">⭐</span><span>{isArabic ? 'جودة النوم' : 'Sleep Quality'}</span></div>
                                <div className="detail-value" style={{ color: analysis.qualityStatus.color }}>{analysis.qualityStatus.text}</div>
                                <div className="detail-desc">{analysis.qualityStatus.icon} {isArabic ? `${summary.avgQuality}/5` : `${summary.avgQuality}/5`}</div>
                            </div>
                        )}
                        {analysis.consistencyStatus && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">📅</span><span>{isArabic ? 'الانتظام' : 'Consistency'}</span></div>
                                <div className="detail-value" style={{ color: analysis.consistencyStatus.color }}>{analysis.consistencyStatus.text}</div>
                                <div className="detail-desc">{analysis.consistencyStatus.icon} {summary.consistency}%</div>
                            </div>
                        )}
                        {analysis.pattern && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">🦉</span><span>{isArabic ? 'النمط الزمني' : 'Chronotype'}</span></div>
                                <div className="detail-value">{analysis.pattern.chronotype}</div>
                                <div className="detail-desc">{analysis.pattern.chronotypeDesc}</div>
                            </div>
                        )}
                        {analysis.stages && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">💤</span><span>{isArabic ? 'مراحل النوم' : 'Sleep Stages'}</span></div>
                                <div className="detail-value">{isArabic ? `${analysis.stages.deepSleepPercent}% عميق` : `${analysis.stages.deepSleepPercent}% Deep`}</div>
                                <div className="detail-desc">{isArabic ? `استيقاظ: ${analysis.stages.avgWakeups} مرة` : `Wake-ups: ${analysis.stages.avgWakeups} times`}</div>
                            </div>
                        )}
                        {analysis.sleepDebt.severity !== 'none' && (
                            <div className="detail-card">
                                <div className="detail-header"><span className="detail-icon">💤</span><span>{isArabic ? 'دين النوم' : 'Sleep Debt'}</span></div>
                                <div className="detail-value">{analysis.sleepDebt.total} {isArabic ? 'ساعات' : 'hours'}</div>
                                <div className="detail-desc">{analysis.sleepDebt.severityText}</div>
                            </div>
                        )}
                        {prediction && (
                            <div className="detail-card prediction-card">
                                <div className="detail-header"><span className="detail-icon">🔮</span><span>{isArabic ? 'توقع الليلة القادمة' : 'Tonight\'s Prediction'}</span></div>
                                <div className="detail-value">{prediction.predictedHours} {isArabic ? 'ساعات' : 'hours'}</div>
                                <div className="detail-desc">{isArabic ? `جودة متوقعة: ${prediction.predictedQuality}/5` : `Expected quality: ${prediction.predictedQuality}/5`}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'trends' && (
                <div className="tab-content">
                    <div className="chart-card"><h4>📈 {isArabic ? 'اتجاه ساعات النوم أسبوعياً' : 'Weekly Sleep Hours Trend'}</h4><div style={{ height: '280px' }}><Line data={chartData} options={chartOptions} /></div></div>
                    <div className="chart-card"><h4>⭐ {isArabic ? 'اتجاه جودة النوم أسبوعياً' : 'Weekly Sleep Quality Trend'}</h4><div style={{ height: '280px' }}><Line data={qualityChartData} options={qualityChartOptions} /></div></div>
                    <div className="weekly-stats">
                        <h4>📊 {isArabic ? 'تفاصيل الأسبوع' : 'Weekly Details'}</h4>
                        <div className="weekly-grid">{weeklyData.map((day, idx) => (<div key={idx} className="weekly-item"><span className="day-name">{day.day}</span><span className="hours-value">{day.hours}h</span><div className="quality-stars">{'⭐'.repeat(Math.floor(day.quality))}{day.quality % 1 >= 0.5 ? '½' : ''}</div></div>))}</div>
                    </div>
                </div>
            )}

            {activeTab === 'insights' && (
                <div className="tab-content">
                    {impacts.length > 0 && (<div className="impacts-section"><h3>{isArabic ? 'تأثير النوم على صحتك' : 'Sleep Impact on Your Health'}</h3><div className="impacts-grid">{impacts.map((impact, idx) => (<div key={idx} className={`impact-card severity-${impact.severity}`}><div className="impact-icon">{impact.icon}</div><div className="impact-content"><h4>{impact.title}</h4><p>{impact.message}</p><small>💡 {impact.recommendation}</small></div></div>))}</div></div>)}
                    
                    {recommendations.length > 0 && (<div className="recommendations-section"><h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3><div className="recommendations-list">{recommendations.map((rec, idx) => (<div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}><div className="rec-header"><span className="rec-icon">{rec.icon}</span><span className="rec-title">{rec.title}</span></div><p className="rec-advice">{rec.advice}</p><p className="rec-action">🎯 {rec.action}</p></div>))}</div></div>)}
                </div>
            )}

            <div className="analytics-footer"><small>{isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(smartInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small></div>

            <style jsx>{`
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; }
                .analytics-container.dark-mode { background: #1e293b; }
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                .analytics-header h2 { font-size: 1.35rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .dark-mode .analytics-header h2 { background: linear-gradient(135deg, #818cf8, #a78bfa); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: none; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: var(--text-secondary, #64748b); }
                .dark-mode .refresh-btn { background: #334155; color: #94a3b8; }
                .refresh-btn:hover { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; transform: rotate(180deg); }
                .analytics-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .analytics-tabs { background: #0f172a; border-color: #334155; }
                .analytics-tabs button { flex: 1; padding: 0.5rem 1rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary, #64748b); transition: all 0.2s; }
                .dark-mode .analytics-tabs button { color: #94a3b8; }
                .analytics-tabs button.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
                .tab-content { animation: fadeInUp 0.3s ease; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .global-health-card { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); border-radius: 24px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; }
                .health-score-container { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
                .health-score-circle { position: relative; width: 100px; height: 100px; }
                .health-score-circle svg { width: 100%; height: 100%; }
                .health-score-circle text { fill: white; font-size: 20px; font-weight: bold; }
                .status-badge { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
                .health-analysis { background: rgba(255,255,255,0.1); border-radius: 16px; padding: 0.75rem; }
                .analysis-summary p { font-size: 0.8rem; margin: 0; }
                .analytics-stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .analytics-stat-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border-light, #e2e8f0); transition: all 0.2s; }
                .dark-mode .analytics-stat-card { background: #0f172a; border-color: #334155; }
                .analytics-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
                .stat-icon { font-size: 1.8rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; color: white; }
                .stat-value { font-size: 1.4rem; font-weight: 800; color: var(--text-primary, #0f172a); }
                .dark-mode .stat-value { color: #f1f5f9; }
                .stat-label { font-size: 0.65rem; color: var(--text-secondary, #64748b); text-transform: uppercase; }
                .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .detail-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .detail-card { background: #0f172a; border-color: #334155; }
                .detail-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.7rem; color: var(--text-secondary, #64748b); }
                .detail-value { font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; }
                .detail-desc { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                .prediction-card { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1)); }
                .chart-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .chart-card { background: #0f172a; border-color: #334155; }
                .chart-card h4 { margin: 0 0 1rem 0; font-size: 0.85rem; font-weight: 600; color: var(--text-primary, #0f172a); }
                .weekly-stats { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .weekly-stats h4 { margin: 0 0 1rem 0; font-size: 0.85rem; }
                .weekly-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; }
                .weekly-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
                .day-name { font-size: 0.7rem; font-weight: 600; color: var(--text-secondary, #64748b); }
                .hours-value { font-size: 0.9rem; font-weight: 700; color: #6366f1; }
                .quality-stars { font-size: 0.65rem; color: #f59e0b; }
                .impacts-section { margin-bottom: 1.5rem; }
                .impacts-section h3 { font-size: 0.9rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary, #0f172a); }
                .impacts-grid { display: flex; flex-direction: column; gap: 0.75rem; }
                .impact-card { display: flex; gap: 1rem; padding: 1rem; background: var(--secondary-bg, #f8fafc); border-radius: 16px; border: 1px solid var(--border-light, #e2e8f0); }
                .impact-card.severity-high { border-left: 3px solid #10b981; }
                .impact-icon { font-size: 2rem; }
                .impact-content h4 { margin: 0 0 0.25rem 0; font-size: 0.85rem; }
                .impact-content p { font-size: 0.75rem; margin: 0 0 0.5rem 0; color: var(--text-secondary, #64748b); }
                .impact-content small { font-size: 0.65rem; color: #6366f1; }
                .recommendations-section { margin-bottom: 1.5rem; }
                .recommendations-section h3 { font-size: 0.9rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary, #0f172a); }
                .recommendations-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .recommendation { background: var(--card-bg, #ffffff); border-radius: 16px; padding: 1rem; transition: all 0.2s; border-left: 3px solid; }
                .recommendation.timing-tonight { border-left-color: #6366f1; }
                .recommendation.timing-general { border-left-color: #10b981; }
                .recommendation.priority-high { border-left-color: #ef4444; }
                [dir="rtl"] .recommendation { border-left: none; border-right: 3px solid; }
                .rec-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .rec-icon { font-size: 1.2rem; }
                .rec-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary, #0f172a); }
                .rec-advice { font-size: 0.8rem; margin: 0.5rem 0; color: var(--text-primary, #0f172a); font-weight: 500; }
                .rec-action { font-size: 0.75rem; margin: 0.25rem 0; color: var(--text-secondary, #64748b); }
                .analytics-footer { text-align: center; padding-top: 1rem; border-top: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .analytics-footer { border-top-color: #334155; }
                .analytics-footer small { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                .analytics-loading, .analytics-error, .analytics-empty { text-align: center; padding: 2rem; background: var(--card-bg, #ffffff); border-radius: 20px; }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .retry-btn { margin-top: 1rem; padding: 0.5rem 1.25rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; cursor: pointer; }
                @media (max-width: 768px) { .analytics-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; } .stat-icon { width: 40px; height: 40px; font-size: 1.3rem; } .stat-value { font-size: 1.1rem; } .weekly-grid { font-size: 0.7rem; } }
                @media (prefers-reduced-motion: reduce) { .refresh-btn:hover, .analytics-stat-card:hover { transform: none; } .spinner { animation: none; } }
            `}</style>
        </div>
    );
};

export default SleepAnalytics;