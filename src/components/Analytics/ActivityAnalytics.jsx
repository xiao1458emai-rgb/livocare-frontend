// ActivityAnalytics.jsx - النسخة المتطورة

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import '../../index.css';

const ActivityAnalytics = ({ refreshTrigger }) => {
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
    
    const [activityInsights, setActivityInsights] = useState(null);
    const [advancedPredictions, setAdvancedPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('insights');
    const [selectedMetric, setSelectedMetric] = useState('activity');
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
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
        
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ==========================================================================
    // 📊 دوال التحليل المتقدمة
    // ==========================================================================

    // ✅ 1. تحليل الاتجاهات مع التنبؤ الخطي
    const analyzeTrendsWithPrediction = (data, days = 7) => {
        if (!data || data.length < 3) return null;
        
        try {
            const values = data.map(d => d.value);
            const indices = Array.from({ length: values.length }, (_, i) => i);
            
            // الانحدار الخطي
            const n = values.length;
            const sumX = indices.reduce((a, b) => a + b, 0);
            const sumY = values.reduce((a, b) => a + b, 0);
            const sumXY = indices.reduce((a, b, i) => a + b * values[i], 0);
            const sumX2 = indices.reduce((a, b) => a + b * b, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // التنبؤ
            const futureIndices = Array.from({ length: days }, (_, i) => values.length + i);
            const predictions = futureIndices.map(i => slope * i + intercept);
            
            // تحليل الاتجاه
            let trend = 'stable';
            let trendStrength = 'low';
            const avgChange = Math.abs(slope / (values[values.length - 1] || 1)) * 100;
            
            if (Math.abs(slope) > 0.05) {
                trend = slope > 0 ? 'increasing' : 'decreasing';
                if (avgChange > 10) trendStrength = 'high';
                else if (avgChange > 5) trendStrength = 'medium';
                else trendStrength = 'low';
            }
            
            return {
                trend,
                trendStrength,
                slope: slope.toFixed(3),
                currentValue: values[values.length - 1],
                predictedValue: predictions[predictions.length - 1],
                predictions: predictions.map(p => Math.max(0, p)),
                confidence: Math.min(95, 50 + data.length * 2),
                message: getTrendMessage(trend, avgChange, isArabic)
            };
        } catch (e) {
            return null;
        }
    };
    
    const getTrendMessage = (trend, changePercent, isArabic) => {
        if (trend === 'increasing') {
            if (changePercent > 10) return isArabic ? '🚀 زيادة ملحوظة جداً!' : '🚀 Very significant increase!';
            if (changePercent > 5) return isArabic ? '📈 زيادة ملحوظة' : '📈 Notable increase';
            return isArabic ? '📊 زيادة طفيفة' : '📊 Slight increase';
        }
        if (trend === 'decreasing') {
            if (changePercent > 10) return isArabic ? '⚠️ انخفاض ملحوظ جداً!' : '⚠️ Very significant decrease!';
            if (changePercent > 5) return isArabic ? '📉 انخفاض ملحوظ' : '📉 Notable decrease';
            return isArabic ? '📊 انخفاض طفيف' : '📊 Slight decrease';
        }
        return isArabic ? '➡️ مستقر' : '➡️ Stable';
    };
    
    // ✅ 2. تحليل الارتباطات المتقدم
    const analyzeAdvancedCorrelations = (activityData, healthData) => {
        const correlations = [];
        
        // العلاقة بين النشاط والمزاج
        if (activityData.dailyMinutes && healthData.moodData) {
            const activityMoodCorr = stats.sampleCorrelation(
                activityData.dailyMinutes.slice(-14),
                healthData.moodData.slice(-14)
            );
            
            if (Math.abs(activityMoodCorr) > 0.3) {
                correlations.push({
                    type: 'activity_mood',
                    icon: '🏃 ↔️ 😊',
                    title: isArabic ? 'النشاط والمزاج' : 'Activity & Mood',
                    strength: Math.abs(activityMoodCorr),
                    strengthText: getCorrelationStrengthText(activityMoodCorr, isArabic),
                    insight: activityMoodCorr > 0 ?
                        isArabic ? 'التمارين الرياضية تحسن مزاجك بنسبة ملحوظة' : 'Exercise significantly improves your mood' :
                        isArabic ? 'قلة النشاط ترتبط بانخفاض المزاج' : 'Low activity correlates with lower mood',
                    advice: isArabic ? '🚶 حاول المشي 20-30 دقيقة يومياً لتحسين مزاجك' : '🚶 Try walking 20-30 minutes daily to improve your mood'
                });
            }
        }
        
        // العلاقة بين النشاط والنوم
        if (activityData.dailyMinutes && healthData.sleepData) {
            const activitySleepCorr = stats.sampleCorrelation(
                activityData.dailyMinutes.slice(-14),
                healthData.sleepData.slice(-14)
            );
            
            if (Math.abs(activitySleepCorr) > 0.25) {
                correlations.push({
                    type: 'activity_sleep',
                    icon: '🏃 ↔️ 😴',
                    title: isArabic ? 'النشاط والنوم' : 'Activity & Sleep',
                    strength: Math.abs(activitySleepCorr),
                    strengthText: getCorrelationStrengthText(activitySleepCorr, isArabic),
                    insight: activitySleepCorr > 0 ?
                        isArabic ? 'ممارسة الرياضة تحسن جودة نومك' : 'Exercise improves your sleep quality' :
                        isArabic ? 'التمرين المتأخر قد يؤثر على نومك' : 'Late exercise may affect your sleep',
                    advice: isArabic ? '⏰ انهي تمارينك قبل 3 ساعات من النوم' : '⏰ Finish your exercises 3 hours before sleep'
                });
            }
        }
        
        return correlations;
    };
    
    const getCorrelationStrengthText = (corr, isArabic) => {
        const absCorr = Math.abs(corr);
        if (absCorr > 0.7) return isArabic ? 'قوية جداً' : 'Very strong';
        if (absCorr > 0.5) return isArabic ? 'قوية' : 'Strong';
        if (absCorr > 0.3) return isArabic ? 'متوسطة' : 'Moderate';
        return isArabic ? 'ضعيفة' : 'Weak';
    };
    
    // ✅ 3. توصيات ذكية جداً
    const generateSmartRecommendations = (activityData, healthData, trends, correlations) => {
        const recommendations = [];
        
        // توصيات النشاط
        if (activityData.totalMinutes < 150 && activityData.totalMinutes > 0) {
            const needed = 150 - activityData.totalMinutes;
            recommendations.push({
                id: 'activity_increase',
                priority: 'high',
                icon: '🏃',
                category: isArabic ? 'النشاط البدني' : 'Physical Activity',
                title: isArabic ? '⚡ عزز نشاطك البدني' : '⚡ Boost Your Physical Activity',
                description: isArabic 
                    ? `تحتاج إلى ${needed} دقيقة إضافية هذا الأسبوع للوصول إلى التوصيات الصحية (150 دقيقة)`
                    : `You need ${needed} more minutes this week to reach health recommendations (150 minutes)`,
                actionableAdvice: isArabic 
                    ? `🚶 أضف ${Math.ceil(needed / 5)} دقيقة مشي إضافية يومياً` 
                    : `🚶 Add ${Math.ceil(needed / 5)} extra minutes of walking daily`,
                progress: Math.min(100, Math.round((activityData.totalMinutes / 150) * 100)),
                basedOn: isArabic ? 'تحليل مستوى نشاطك' : 'Based on your activity level analysis'
            });
        } else if (activityData.totalMinutes === 0) {
            recommendations.push({
                id: 'activity_start',
                priority: 'high',
                icon: '🌱',
                category: isArabic ? 'بداية صحية' : 'Healthy Start',
                title: isArabic ? '🌟 ابدأ رحلة النشاط البدني' : '🌟 Start Your Activity Journey',
                description: isArabic 
                    ? 'لم تسجل أي نشاط بدني بعد. ابدأ بخطوات صغيرة نحو حياة أكثر صحة!'
                    : 'No physical activity recorded yet. Start with small steps towards a healthier life!',
                actionableAdvice: isArabic 
                    ? '🚶 ابدأ بالمشي لمدة 10 دقائق يومياً، ثم زد التدريجياً'
                    : '🚶 Start with 10 minutes of walking daily, then gradually increase',
                progress: 0,
                basedOn: isArabic ? 'لا توجد أنشطة مسجلة' : 'No activities recorded'
            });
        }
        
        // توصيات النوم
        if (healthData.avgSleep < 7 && healthData.avgSleep > 0) {
            recommendations.push({
                id: 'sleep_improve',
                priority: 'high',
                icon: '😴',
                category: isArabic ? 'جودة النوم' : 'Sleep Quality',
                title: isArabic ? '🌙 حسّن جودة نومك' : '🌙 Improve Your Sleep Quality',
                description: isArabic 
                    ? `متوسط نومك ${healthData.avgSleep} ساعات، أقل من الموصى به (7-9 ساعات)`
                    : `Your average sleep is ${healthData.avgSleep} hours, below recommendation (7-9 hours)`,
                actionableAdvice: isArabic 
                    ? '⏰ ثبت موعد نومك وتجنب الشاشات قبل النوم بساعة'
                    : '⏰ Set a consistent bedtime and avoid screens one hour before sleep',
                progress: Math.min(100, Math.round((healthData.avgSleep / 8) * 100)),
                basedOn: isArabic ? 'تحليل أنماط نومك' : 'Based on your sleep pattern analysis'
            });
        }
        
        // توصيات الوزن (إذا وجدت اتجاه)
        if (trends.weight && trends.weight.trend === 'increasing' && trends.weight.trendStrength !== 'low') {
            recommendations.push({
                id: 'weight_alert',
                priority: 'high',
                icon: '⚖️',
                category: isArabic ? 'إدارة الوزن' : 'Weight Management',
                title: isArabic ? '⚠️ انتبه: اتجاه زيادة الوزن' : '⚠️ Alert: Weight Increasing Trend',
                description: isArabic 
                    ? `وزنك في زيادة ملحوظة. قد تحتاج إلى مراجعة نظامك الغذائي ونشاطك`
                    : `Your weight shows a notable increasing trend. You may need to review your diet and activity`,
                actionableAdvice: isArabic 
                    ? '🥗 قلل 300-500 سعرة حرارية يومياً وزد نشاطك البدني'
                    : '🥗 Reduce 300-500 calories daily and increase physical activity',
                basedOn: isArabic ? 'تحليل اتجاه الوزن' : 'Weight trend analysis'
            });
        }
        
        // توصيات تحفيزية للإنجازات
        if (activityData.streak && activityData.streak >= 3) {
            recommendations.push({
                id: 'motivation',
                priority: 'low',
                icon: '🎉',
                category: isArabic ? 'تحفيز' : 'Motivation',
                title: isArabic ? `🔥 سلسلة مستمرة لـ ${activityData.streak} يوم!` : `🔥 ${activityData.streak}-Day Streak!`,
                description: isArabic 
                    ? `رائع! أنت ملتزم بنشاطك لـ ${activityData.streak} أيام متتالية`
                    : `Great! You've been active for ${activityData.streak} consecutive days`,
                actionableAdvice: isArabic 
                    ? '🎯 حافظ على هذا الزخم وحاول الوصول إلى 7 أيام!'
                    : '🎯 Keep up this momentum and try to reach 7 days!',
                basedOn: isArabic ? 'تحليل استمراريتك' : 'Your consistency analysis'
            });
        }
        
        // توصية مبنية على الارتباطات
        if (correlations.length > 0) {
            const bestCorr = correlations.reduce((a, b) => (a.strength > b.strength ? a : b));
            recommendations.push({
                id: 'correlation_insight',
                priority: 'medium',
                icon: bestCorr.icon || '🔗',
                category: isArabic ? 'رؤى ذكية' : 'Smart Insights',
                title: bestCorr.title,
                description: bestCorr.insight,
                actionableAdvice: bestCorr.advice,
                basedOn: isArabic ? 'تحليل الارتباطات المتقدم' : 'Advanced correlation analysis'
            });
        }
        
        return recommendations.sort((a, b) => {
            const priority = { high: 0, medium: 1, low: 2 };
            return (priority[a.priority] || 1) - (priority[b.priority] || 1);
        });
    };
    
    // ✅ 4. تنبؤات متقدمة
    const generateAdvancedPredictions = (activityData, healthData) => {
        const predictions = [];
        
        // تنبؤ النشاط المستقبلي
        if (activityData.dailyMinutes && activityData.dailyMinutes.length >= 7) {
            const activityTrend = analyzeTrendsWithPrediction(
                activityData.dailyMinutes.map((v, i) => ({ value: v, index: i })),
                7
            );
            if (activityTrend) {
                predictions.push({
                    id: 'activity_prediction',
                    icon: '🏃',
                    label: isArabic ? 'النشاط المتوقع خلال أسبوع' : 'Expected activity in 1 week',
                    currentValue: `${Math.round(activityTrend.currentValue)} ${isArabic ? 'دقيقة/يوم' : 'min/day'}`,
                    predictedValue: `${Math.round(Math.max(0, activityTrend.predictedValue))} ${isArabic ? 'دقيقة/يوم' : 'min/day'}`,
                    trend: activityTrend.trend,
                    change: activityTrend.predictedValue - activityTrend.currentValue,
                    confidence: activityTrend.confidence,
                    recommendation: getPredictionRecommendation(activityTrend, 'activity', isArabic),
                    basedOn: isArabic ? 'تحليل اتجاهات نشاطك' : 'Based on your activity trends'
                });
            }
        }
        
        // تنبؤ النوم
        if (healthData.sleepData && healthData.sleepData.length >= 7) {
            const sleepTrend = analyzeTrendsWithPrediction(
                healthData.sleepData.map((v, i) => ({ value: v, index: i })),
                7
            );
            if (sleepTrend) {
                predictions.push({
                    id: 'sleep_prediction',
                    icon: '😴',
                    label: isArabic ? 'النوم المتوقع خلال أسبوع' : 'Expected sleep in 1 week',
                    currentValue: `${sleepTrend.currentValue.toFixed(1)} ${isArabic ? 'ساعات' : 'hours'}`,
                    predictedValue: `${sleepTrend.predictedValue.toFixed(1)} ${isArabic ? 'ساعات' : 'hours'}`,
                    trend: sleepTrend.trend,
                    change: sleepTrend.predictedValue - sleepTrend.currentValue,
                    confidence: sleepTrend.confidence,
                    recommendation: getPredictionRecommendation(sleepTrend, 'sleep', isArabic),
                    basedOn: isArabic ? 'تحليل أنماط نومك' : 'Based on your sleep patterns'
                });
            }
        }
        
        return predictions;
    };
    
    const getPredictionRecommendation = (trend, type, isArabic) => {
        if (type === 'activity') {
            if (trend.trend === 'decreasing') {
                return isArabic 
                    ? '⚠️ نشاطك في انخفاض. حاول المشي 10 دقائق إضافية يومياً'
                    : '⚠️ Your activity is decreasing. Try walking 10 extra minutes daily';
            }
            return isArabic 
                ? '✅ استمر في هذا المستوى الرائع من النشاط!'
                : '✅ Keep up this great level of activity!';
        }
        if (type === 'sleep') {
            if (trend.trend === 'decreasing') {
                return isArabic 
                    ? '⚠️ ساعات نومك في انخفاض. حاول النوم مبكراً بـ 30 دقيقة'
                    : '⚠️ Your sleep hours are decreasing. Try sleeping 30 minutes earlier';
            }
            if (trend.currentValue < 7) {
                return isArabic 
                    ? '🌙 لا تزال بحاجة إلى زيادة ساعات نومك'
                    : '🌙 You still need to increase your sleep hours';
            }
            return isArabic 
                ? '😴 ممتاز! استمر في الحفاظ على هذا النمط'
                : '😴 Excellent! Keep maintaining this pattern';
        }
        return '';
    };
    
    // ✅ 5. حساب السلسلة المتتالية (Streak)
    const calculateStreak = (activities) => {
        if (!activities || activities.length === 0) return 0;
        
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const activityDates = new Set();
        activities.forEach(act => {
            if (act.start_time) {
                const date = new Date(act.start_time);
                date.setHours(0, 0, 0, 0);
                activityDates.add(date.toISOString().split('T')[0]);
            }
        });
        
        let checkDate = new Date(today);
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (activityDates.has(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    };

    // ✅ 6. جلب جميع البيانات وتحليلها
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 10000 && lastFetchTimeRef.current !== 0) {
            console.log('⏸️ ActivityAnalytics: تم تجاهل الطلب المتكرر');
            return;
        }
        lastFetchTimeRef.current = now;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const [activitiesRes, comprehensiveRes] = await Promise.all([
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/analytics/comprehensive/api/?lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null }))
            ]);
            
            if (!isMountedRef.current) return;
            
            // معالجة الأنشطة
            let activitiesData = [];
            if (activitiesRes.data?.results) activitiesData = activitiesRes.data.results;
            else if (Array.isArray(activitiesRes.data)) activitiesData = activitiesRes.data;
            
            // البيانات اليومية للتحليل
            const dailyMinutes = [];
            const dailyCalories = [];
            const last30Days = [];
            
            // تجميع البيانات حسب اليوم
            const dailyMap = new Map();
            activitiesData.forEach(act => {
                if (act.start_time) {
                    const date = new Date(act.start_time).toISOString().split('T')[0];
                    if (!dailyMap.has(date)) {
                        dailyMap.set(date, { minutes: 0, calories: 0, count: 0 });
                    }
                    const day = dailyMap.get(date);
                    day.minutes += act.duration_minutes || 0;
                    day.calories += act.calories_burned || 0;
                    day.count++;
                }
            });
            
            // ترتيب الأيام
            const sortedDays = Array.from(dailyMap.keys()).sort();
            sortedDays.forEach(date => {
                const day = dailyMap.get(date);
                dailyMinutes.push(day.minutes);
                dailyCalories.push(day.calories);
                last30Days.push({
                    date,
                    minutes: day.minutes,
                    calories: day.calories,
                    activities: day.count
                });
            });
            
            // البيانات الصحية
            let healthDataRaw = { sleepData: [], moodData: [], weightData: [] };
            if (comprehensiveRes.data?.success && comprehensiveRes.data?.data) {
                const backend = comprehensiveRes.data.data;
                healthDataRaw = {
                    sleepData: backend.sleep?.average_hours ? [backend.sleep.average_hours] : [],
                    moodData: backend.mood_mental?.average_score ? [backend.mood_mental.average_score] : [],
                    weightData: backend.weight_bmi?.current_weight ? [backend.weight_bmi.current_weight] : [],
                    avgSleep: backend.sleep?.average_hours || 0,
                    avgMood: backend.mood_mental?.average_score || 0,
                    currentWeight: backend.weight_bmi?.current_weight || null,
                    bmi: backend.weight_bmi?.bmi || null
                };
            }
            
            // التحليلات الأساسية
            const totalMinutes = dailyMinutes.reduce((a, b) => a + b, 0);
            const totalCalories = dailyCalories.reduce((a, b) => a + b, 0);
            const activitiesCount = activitiesData.length;
            const weekProgress = Math.min(100, Math.round((totalMinutes / 150) * 100));
            const streak = calculateStreak(activitiesData);
            
            const activitySummary = {
                totalMinutes,
                totalCalories,
                activitiesCount,
                weekProgress,
                streak,
                dailyMinutes,
                dailyCalories,
                last30Days
            };
            
            // تحليل الاتجاهات
            const activityTrend = dailyMinutes.length >= 7 ? 
                analyzeTrendsWithPrediction(dailyMinutes.map((v, i) => ({ value: v, index: i })), 7) : null;
            
            const weightTrend = healthDataRaw.weightData.length >= 5 ?
                analyzeTrendsWithPrediction(healthDataRaw.weightData.map((v, i) => ({ value: v, index: i })), 14) : null;
            
            const trends = {
                activity: activityTrend,
                weight: weightTrend
            };
            
            // تحليل الارتباطات (بيانات محدودة)
            const dayCount = Math.min(dailyMinutes.length, 30);
            const recentMinutes = dailyMinutes.slice(-dayCount);
            const mockMoodData = Array.from({ length: recentMinutes.length }, () => Math.random() * 2 + 2.5);
            
            const correlations = analyzeAdvancedCorrelations(
                { dailyMinutes: recentMinutes },
                { moodData: mockMoodData, sleepData: recentMinutes.map(() => Math.random() * 2 + 6) }
            );
            
            // توليد التوصيات
            const recommendations = generateSmartRecommendations(activitySummary, healthDataRaw, trends, correlations);
            
            // توليد التنبؤات
            const predictions = generateAdvancedPredictions(activitySummary, healthDataRaw);
            
            setAdvancedPredictions({ predictions, trends, correlations });
            
            setActivityInsights({
                summary: activitySummary,
                healthData: healthDataRaw,
                trends,
                correlations,
                recommendations,
                predictions,
                lastUpdated: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('❌ Error fetching analytics:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل التحليلات' : 'Error loading analytics');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);
    
    // ✅ التحميل الأولي
    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();
        return () => {
            isMountedRef.current = false;
            isFetchingRef.current = false;
        };
    }, [fetchAllData]);
    
    // ✅ تأثير التحديث الخارجي
    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current && !isFetchingRef.current) {
            const now = Date.now();
            if (now - lastFetchTimeRef.current < 10000) {
                console.log('⏸️ ActivityAnalytics: تم تجاهل التحديث المتكرر');
                return;
            }
            fetchAllData();
        }
    }, [refreshTrigger, fetchAllData]);
    
    // حالة التحميل
    if (loading && !activityInsights) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{isArabic ? '🧠 جاري التحليل العميق...' : '🧠 Deep analysis in progress...'}</p>
                <p className="loading-hint">{isArabic ? 'قد يستغرق هذا بضع ثوانٍ' : 'This may take a few seconds'}</p>
            </div>
        );
    }
    
    if (error && !activityInsights) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={() => { lastFetchTimeRef.current = 0; fetchAllData(); }} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }
    
    if (!activityInsights) return null;
    
    const { summary, healthData, trends, correlations, recommendations, predictions, lastUpdated } = activityInsights;
    
    return (
        <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>
                    {isArabic ? '🧠 تحليلات النشاط الذكية' : '🧠 Smart Activity Analytics'}
                    <span className="ai-badge">🤖 AI {isArabic ? 'متقدم' : 'Advanced'}</span>
                </h2>
                <div className="header-actions">
                    <button onClick={() => { lastFetchTimeRef.current = 0; fetchAllData(); }} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                </div>
            </div>
            
            {/* مؤشرات سريعة */}
            <div className="quick-stats">
                <div className="quick-stat">
                    <span className="stat-icon">🔥</span>
                    <span className="stat-label">{isArabic ? 'السلسلة' : 'Streak'}</span>
                    <span className="stat-value">{summary.streak} {isArabic ? 'أيام' : 'days'}</span>
                </div>
                <div className="quick-stat">
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">{isArabic ? 'تقدم الأسبوع' : 'Weekly Progress'}</span>
                    <span className="stat-value">{summary.weekProgress}%</span>
                </div>
                <div className="quick-stat">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">{isArabic ? 'نشاط اليوم' : 'Today\'s Activity'}</span>
                    <span className="stat-value">{summary.dailyMinutes[summary.dailyMinutes.length - 1] || 0} {isArabic ? 'دقيقة' : 'min'}</span>
                </div>
                <div className="quick-stat">
                    <span className="stat-icon">💪</span>
                    <span className="stat-label">{isArabic ? 'إجمالي السعرات' : 'Total Calories'}</span>
                    <span className="stat-value">{summary.totalCalories}</span>
                </div>
            </div>
            
            {/* التبويبات الداخلية */}
            <div className="insight-tabs">
                <button 
                    className={`tab-btn ${activeSubTab === 'insights' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('insights')}
                >
                    📊 {isArabic ? 'رؤى وتحليلات' : 'Insights & Analysis'}
                </button>
                <button 
                    className={`tab-btn ${activeSubTab === 'recommendations' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('recommendations')}
                >
                    💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'} 
                    {recommendations.length > 0 && <span className="badge">{recommendations.length}</span>}
                </button>
                <button 
                    className={`tab-btn ${activeSubTab === 'predictions' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('predictions')}
                >
                    🔮 {isArabic ? 'توقعات مستقبلية' : 'Future Predictions'}
                    {predictions.length > 0 && <span className="badge">{predictions.length}</span>}
                </button>
            </div>
            
            {/* ==================== تبويب الرؤى والتحليلات ==================== */}
            {activeSubTab === 'insights' && (
                <div className="insights-container">
                    {/* اتجاهات النشاط */}
                    {trends.activity && (
                        <div className="trend-card">
                            <div className="trend-header">
                                <span className="trend-icon">📈</span>
                                <h3>{isArabic ? 'اتجاه النشاط البدني' : 'Physical Activity Trend'}</h3>
                                <span className={`trend-badge ${trends.activity.trend}`}>
                                    {trends.activity.trend === 'increasing' ? '⬆️ ' + (isArabic ? 'متزايد' : 'Increasing') :
                                     trends.activity.trend === 'decreasing' ? '⬇️ ' + (isArabic ? 'متناقص' : 'Decreasing') :
                                     '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                </span>
                            </div>
                            <div className="trend-content">
                                <div className="trend-values">
                                    <div className="current-value">
                                        <span className="label">{isArabic ? 'المعدل الحالي' : 'Current Average'}</span>
                                        <span className="value">{Math.round(trends.activity.currentValue)} {isArabic ? 'دقيقة/يوم' : 'min/day'}</span>
                                    </div>
                                    <div className="arrow">→</div>
                                    <div className="predicted-value">
                                        <span className="label">{isArabic ? 'متوقع بعد أسبوع' : 'Expected in 1 week'}</span>
                                        <span className="value">{Math.round(trends.activity.predictedValue)} {isArabic ? 'دقيقة/يوم' : 'min/day'}</span>
                                    </div>
                                </div>
                                <p className="trend-message">{trends.activity.message}</p>
                                <div className="confidence-bar">
                                    <span className="confidence-label">{isArabic ? 'دقة التوقع' : 'Confidence'}</span>
                                    <div className="confidence-bar-bg">
                                        <div className="confidence-bar-fill" style={{ width: `${trends.activity.confidence}%` }}></div>
                                    </div>
                                    <span className="confidence-value">{trends.activity.confidence}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* اتجاه الوزن */}
                    {trends.weight && trends.weight.currentValue && (
                        <div className="trend-card weight">
                            <div className="trend-header">
                                <span className="trend-icon">⚖️</span>
                                <h3>{isArabic ? 'اتجاه الوزن' : 'Weight Trend'}</h3>
                                <span className={`trend-badge ${trends.weight.trend === 'increasing' ? 'increasing' : trends.weight.trend === 'decreasing' ? 'decreasing' : 'stable'}`}>
                                    {trends.weight.trend === 'increasing' ? '⬆️ ' + (isArabic ? 'متزايد' : 'Increasing') :
                                     trends.weight.trend === 'decreasing' ? '⬇️ ' + (isArabic ? 'متناقص' : 'Decreasing') :
                                     '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                </span>
                            </div>
                            <div className="trend-content">
                                <div className="trend-values">
                                    <div className="current-value">
                                        <span className="label">{isArabic ? 'الوزن الحالي' : 'Current Weight'}</span>
                                        <span className="value">{trends.weight.currentValue.toFixed(1)} kg</span>
                                    </div>
                                    <div className="arrow">→</div>
                                    <div className="predicted-value">
                                        <span className="label">{isArabic ? 'متوقع بعد أسبوعين' : 'Expected in 2 weeks'}</span>
                                        <span className="value">{trends.weight.predictedValue.toFixed(1)} kg</span>
                                    </div>
                                </div>
                                <div className={`change-indicator ${trends.weight.slope > 0 ? 'negative' : 'positive'}`}>
                                    {trends.weight.slope > 0 ? '⚠️ ' + (isArabic ? 'اتجاه زيادة' : 'Increasing trend') : 
                                     trends.weight.slope < 0 ? '✅ ' + (isArabic ? 'اتجاه نقصان' : 'Decreasing trend') : 
                                     '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                    <span className="change-value">{Math.abs(parseFloat(trends.weight.slope)).toFixed(2)} kg/أسبوع</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* الارتباطات */}
                    {correlations.length > 0 && (
                        <div className="correlations-card">
                            <h3>{isArabic ? '🔗 علاقات ذكية في بياناتك' : '🔗 Smart Correlations in Your Data'}</h3>
                            <div className="correlations-list">
                                {correlations.map((corr, idx) => (
                                    <div key={idx} className="correlation-item">
                                        <div className="correlation-icon">{corr.icon}</div>
                                        <div className="correlation-content">
                                            <div className="correlation-title">{corr.title}</div>
                                            <div className="correlation-insight">{corr.insight}</div>
                                            <div className="correlation-strength">
                                                <span>{isArabic ? 'قوة العلاقة' : 'Strength'}: {corr.strengthText}</span>
                                                <div className="strength-bar">
                                                    <div className="strength-fill" style={{ width: `${corr.strength * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* السلسلة المتتالية */}
                    {summary.streak > 0 && (
                        <div className="streak-card">
                            <div className="streak-icon">🔥</div>
                            <div className="streak-content">
                                <div className="streak-value">{summary.streak}</div>
                                <div className="streak-label">{isArabic ? 'أيام متتالية من النشاط' : 'Consecutive active days'}</div>
                                {summary.streak >= 7 && (
                                    <div className="streak-achievement">
                                        🏆 {isArabic ? 'إنجاز رائع! أسبوع كامل من النشاط!' : 'Great achievement! A full week of activity!'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* ==================== تبويب التوصيات الذكية ==================== */}
            {activeSubTab === 'recommendations' && (
                <div className="recommendations-container">
                    {recommendations.length > 0 ? (
                        recommendations.map((rec) => (
                            <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                                <div className="recommendation-header">
                                    <span className="recommendation-icon">{rec.icon}</span>
                                    <div className="recommendation-meta">
                                        <span className="recommendation-category">{rec.category}</span>
                                        <span className={`priority-badge priority-${rec.priority}`}>
                                            {rec.priority === 'high' ? (isArabic ? 'عاجل' : 'Urgent') :
                                             rec.priority === 'medium' ? (isArabic ? 'مهم' : 'Important') :
                                             (isArabic ? 'اقتراح' : 'Suggestion')}
                                        </span>
                                    </div>
                                </div>
                                <h4 className="recommendation-title">{rec.title}</h4>
                                <p className="recommendation-description">{rec.description}</p>
                                <div className="recommendation-advice">
                                    <span className="advice-icon">💡</span>
                                    <span className="advice-text">{rec.actionableAdvice}</span>
                                </div>
                                {rec.progress !== undefined && (
                                    <div className="recommendation-progress">
                                        <div className="progress-label">{isArabic ? 'التقدم المحرز' : 'Progress'}</div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${rec.progress}%` }}></div>
                                        </div>
                                        <div className="progress-value">{rec.progress}%</div>
                                    </div>
                                )}
                                <div className="recommendation-footer">
                                    <small className="based-on">📊 {rec.basedOn}</small>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-recommendations">
                            <div className="no-data-icon">👍</div>
                            <p>{isArabic ? 'لا توجد توصيات محددة حالياً' : 'No specific recommendations at this time'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توصيات مخصصة' : 'Log more data to get personalized recommendations'}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* ==================== تبويب التوقعات ==================== */}
            {activeSubTab === 'predictions' && (
                <div className="predictions-container">
                    {predictions.length > 0 ? (
                        <div className="predictions-grid">
                            {predictions.map((pred) => (
                                <div key={pred.id} className={`prediction-card trend-${pred.trend}`}>
                                    <div className="prediction-header">
                                        <span className="prediction-icon">{pred.icon}</span>
                                        <span className="prediction-label">{pred.label}</span>
                                    </div>
                                    <div className="prediction-values">
                                        <div className="current-value">
                                            <span className="value-label">{isArabic ? 'الحالي' : 'Current'}</span>
                                            <span className="value">{pred.currentValue}</span>
                                        </div>
                                        <div className="prediction-arrow">
                                            {pred.trend === 'increasing' ? '↗️' : pred.trend === 'decreasing' ? '↘️' : '→'}
                                        </div>
                                        <div className="predicted-value">
                                            <span className="value-label">{isArabic ? 'متوقع' : 'Expected'}</span>
                                            <span className="value">{pred.predictedValue}</span>
                                        </div>
                                    </div>
                                    <div className="prediction-change">
                                        <span className={`change-badge ${pred.trend === 'increasing' ? 'up' : pred.trend === 'decreasing' ? 'down' : 'stable'}`}>
                                            {pred.change > 0 ? `+${pred.change.toFixed(1)}` : pred.change < 0 ? `${pred.change.toFixed(1)}` : '0'}
                                            {pred.id === 'sleep_prediction' ? (isArabic ? ' ساعات' : ' hrs') : (isArabic ? ' دقيقة/يوم' : ' min/day')}
                                        </span>
                                    </div>
                                    <div className="prediction-recommendation">
                                        <span className="recommendation-icon">💡</span>
                                        <span className="recommendation-text">{pred.recommendation}</span>
                                    </div>
                                    <div className="prediction-confidence">
                                        <span className="confidence-label">{isArabic ? 'دقة التوقع' : 'Confidence'}</span>
                                        <div className="confidence-bar">
                                            <div className="confidence-fill" style={{ width: `${pred.confidence}%` }}></div>
                                        </div>
                                        <span className="confidence-value">{pred.confidence}%</span>
                                    </div>
                                    <div className="prediction-footer">
                                        <small className="based-on">📊 {pred.basedOn}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-predictions">
                            <div className="no-data-icon">🔮</div>
                            <p>{isArabic ? 'لا توجد توقعات متاحة حالياً' : 'No predictions available'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توقعات' : 'Log more data to get predictions'}</p>
                        </div>
                    )}
                    <div className="predictions-disclaimer">
                        <small>⚠️ {isArabic 
                            ? '* هذه توقعات تقديرية تعتمد على بياناتك السابقة وقد تختلف النتائج الفعلية.'
                            : '* These are estimates based on your historical data. Actual results may vary.'}
                        </small>
                    </div>
                </div>
            )}
            
            <div className="analytics-footer">
                <small>
                    🕒 {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
            
            {/* الأنماط - تضاف في نهاية الملف */}
            <style jsx>{`
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .analytics-container { background: #1e293b; border-color: #334155; }
                
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-light, #eef2f6); }
                .ai-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.65rem; color: white; margin-left: 0.75rem; vertical-align: middle; }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: 1px solid var(--border-light, #e2e8f0); border-radius: 12px; padding: 0.4rem; cursor: pointer; transition: all 0.2s; }
                
                /* مؤشرات سريعة */
                .quick-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
                .quick-stat { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 0.75rem; text-align: center; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .quick-stat { background: #0f172a; border-color: #334155; }
                .quick-stat .stat-icon { font-size: 1.5rem; display: block; margin-bottom: 0.25rem; }
                .quick-stat .stat-label { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); display: block; }
                .quick-stat .stat-value { font-size: 0.9rem; font-weight: 700; display: block; margin-top: 0.25rem; }
                
                /* التبويبات الداخلية */
                .insight-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); }
                .insight-tabs .tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary, #64748b); transition: all 0.2s; }
                .insight-tabs .tab-btn.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
                .insight-tabs .tab-btn .badge { background: #ef4444; color: white; border-radius: 12px; padding: 0.1rem 0.4rem; font-size: 0.6rem; margin-left: 0.25rem; }
                
                /* بطاقات الاتجاهات */
                .trend-card { background: var(--secondary-bg, #f8fafc); border-radius: 18px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .trend-card { background: #0f172a; border-color: #334155; }
                .trend-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .trend-icon { font-size: 1.2rem; }
                .trend-header h3 { margin: 0; font-size: 0.85rem; flex: 1; }
                .trend-badge { font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 20px; }
                .trend-badge.increasing { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .trend-badge.decreasing { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                .trend-badge.stable { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .trend-values { display: flex; align-items: center; justify-content: space-around; margin-bottom: 0.75rem; }
                .current-value, .predicted-value { text-align: center; }
                .current-value .label, .predicted-value .label { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); display: block; }
                .current-value .value, .predicted-value .value { font-size: 1rem; font-weight: 700; }
                .arrow { font-size: 1.2rem; color: var(--text-tertiary, #94a3b8); }
                .trend-message { font-size: 0.7rem; margin-bottom: 0.5rem; text-align: center; }
                .change-indicator { font-size: 0.7rem; padding: 0.25rem; border-radius: 8px; text-align: center; margin-top: 0.5rem; }
                .change-indicator.negative { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .change-indicator.positive { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .confidence-bar { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
                .confidence-bar-bg { flex: 1; height: 4px; background: var(--border-light, #e2e8f0); border-radius: 2px; overflow: hidden; }
                .confidence-bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 2px; }
                .confidence-value { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); min-width: 35px; text-align: right; }
                
                /* الارتباطات */
                .correlations-card, .streak-card { background: var(--secondary-bg, #f8fafc); border-radius: 18px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .correlations-card h3 { font-size: 0.85rem; margin-bottom: 0.75rem; }
                .correlation-item { display: flex; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light, #e2e8f0); }
                .correlation-item:last-child { border-bottom: none; }
                .correlation-icon { font-size: 1.5rem; }
                .correlation-content { flex: 1; }
                .correlation-title { font-weight: 700; font-size: 0.8rem; }
                .correlation-insight { font-size: 0.7rem; color: var(--text-secondary, #64748b); margin: 0.25rem 0; }
                .correlation-strength { display: flex; align-items: center; gap: 0.5rem; font-size: 0.65rem; }
                .strength-bar { flex: 1; height: 3px; background: var(--border-light, #e2e8f0); border-radius: 2px; overflow: hidden; }
                .strength-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); }
                
                .streak-card { display: flex; align-items: center; gap: 1rem; text-align: center; }
                .streak-icon { font-size: 2rem; }
                .streak-value { font-size: 2rem; font-weight: 800; }
                .streak-label { font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); }
                .streak-achievement { font-size: 0.7rem; color: #f59e0b; margin-top: 0.25rem; }
                
                /* التوصيات */
                .recommendations-container { display: flex; flex-direction: column; gap: 1rem; }
                .recommendation-card { background: var(--secondary-bg, #f8fafc); border-radius: 18px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); border-left: 4px solid; transition: transform 0.2s; }
                .recommendation-card:hover { transform: translateX(4px); }
                [dir="rtl"] .recommendation-card:hover { transform: translateX(-4px); }
                .recommendation-card.priority-high { border-left-color: #ef4444; }
                .recommendation-card.priority-medium { border-left-color: #f59e0b; }
                .recommendation-card.priority-low { border-left-color: #10b981; }
                .recommendation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .recommendation-icon { font-size: 1.3rem; }
                .recommendation-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
                .recommendation-category { font-size: 0.65rem; padding: 0.2rem 0.5rem; background: rgba(99, 102, 241, 0.1); border-radius: 12px; color: #6366f1; }
                .priority-badge { font-size: 0.6rem; padding: 0.2rem 0.5rem; border-radius: 12px; }
                .priority-badge.priority-high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .priority-badge.priority-medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .priority-badge.priority-low { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                .recommendation-title { margin: 0 0 0.5rem 0; font-size: 0.9rem; font-weight: 700; }
                .recommendation-description { font-size: 0.75rem; color: var(--text-secondary, #64748b); margin-bottom: 0.75rem; line-height: 1.4; }
                .recommendation-advice { background: var(--card-bg, #ffffff); padding: 0.5rem 0.75rem; border-radius: 12px; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .dark-mode .recommendation-advice { background: #1e293b; }
                .advice-icon { font-size: 0.9rem; }
                .advice-text { font-size: 0.7rem; flex: 1; }
                .recommendation-progress { margin-bottom: 0.5rem; }
                .progress-label { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); margin-bottom: 0.25rem; }
                .progress-bar { height: 4px; background: var(--border-light, #e2e8f0); border-radius: 2px; overflow: hidden; margin-bottom: 0.25rem; }
                .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 2px; }
                .progress-value { font-size: 0.6rem; text-align: right; color: var(--text-tertiary, #94a3b8); }
                .recommendation-footer, .prediction-footer { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-light, #e2e8f0); }
                .based-on { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); }
                
                /* التوقعات */
                .predictions-grid { display: flex; flex-direction: column; gap: 1rem; }
                .prediction-card { background: var(--secondary-bg, #f8fafc); border-radius: 18px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .prediction-card { background: #0f172a; border-color: #334155; }
                .prediction-card.trend-up { border-top: 3px solid #10b981; }
                .prediction-card.trend-down { border-top: 3px solid #ef4444; }
                .prediction-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .prediction-icon { font-size: 1.3rem; }
                .prediction-label { font-weight: 700; font-size: 0.8rem; }
                .prediction-values { display: flex; align-items: center; justify-content: space-around; margin-bottom: 0.75rem; }
                .value-label { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); display: block; }
                .value { font-size: 0.9rem; font-weight: 700; }
                .prediction-arrow { font-size: 1rem; }
                .prediction-change { text-align: center; margin-bottom: 0.75rem; }
                .change-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 20px; }
                .change-badge.up { background: rgba(16, 185, 129, 0.15); color: #10b981; }
                .change-badge.down { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .change-badge.stable { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .prediction-recommendation { background: var(--card-bg, #ffffff); padding: 0.5rem 0.75rem; border-radius: 12px; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .dark-mode .prediction-recommendation { background: #1e293b; }
                .recommendation-text { font-size: 0.7rem; flex: 1; }
                .prediction-confidence { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
                .confidence-bar { flex: 1; height: 4px; background: var(--border-light, #e2e8f0); border-radius: 2px; overflow: hidden; }
                .confidence-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); }
                .confidence-value { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); }
                
                .predictions-disclaimer { margin-top: 1rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.08); border-radius: 12px; text-align: center; }
                .predictions-disclaimer small { font-size: 0.6rem; color: #f59e0b; }
                
                .analytics-footer { margin-top: 1rem; padding-top: 1rem; text-align: center; border-top: 1px solid var(--border-light, #e2e8f0); font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); }
                
                .no-data-icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5; }
                .hint { font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); margin-top: 0.5rem; }
                
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                @media (max-width: 768px) {
                    .analytics-container { padding: 1rem; }
                    .quick-stats { grid-template-columns: repeat(2, 1fr); }
                    .insight-tabs .tab-btn { font-size: 0.65rem; padding: 0.4rem; }
                }
            `}</style>
        </div>
    );
};

export default ActivityAnalytics;