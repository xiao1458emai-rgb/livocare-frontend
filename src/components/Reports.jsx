'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

// ===========================================
// دوال التحليل - المعدلة بالكامل
// ===========================================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const analyzeSleepData = (sleepData) => {
    console.log('📊 analyzeSleepData input:', sleepData?.length || 0, 'records');
    
    if (!sleepData || sleepData.length === 0) { 
        return { avgHours: 0, totalNights: 0, hasData: false }; 
    }
    
    let totalHours = 0;
    let validCount = 0;
    
    sleepData.forEach(sleep => {
        const start = sleep.sleep_start || sleep.start_time || sleep.start;
        const end = sleep.sleep_end || sleep.end_time || sleep.end;
        
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const duration = (endDate - startDate) / (1000 * 60 * 60);
            
            if (duration > 0 && duration <= 24) {
                totalHours += duration;
                validCount++;
            }
        }
    });
    
    return {
        avgHours: validCount > 0 ? roundNumber(totalHours / validCount, 1) : 0,
        totalNights: validCount,
        hasData: validCount > 0
    };
};

const analyzeNutritionData = (mealsData) => {
    console.log('📊 analyzeNutritionData input:', mealsData?.length || 0, 'records');
    
    if (!mealsData || mealsData.length === 0) { 
        return { 
            avgCaloriesPerDay: 0, 
            avgProtein: 0, 
            avgCarbs: 0, 
            avgFat: 0,
            totalMeals: 0, 
            hasData: false 
        }; 
    }
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const uniqueDays = new Set();
    
    mealsData.forEach(meal => {
        totalCalories += meal.total_calories || 0;
        
        const ingredients = meal.ingredients || [];
        ingredients.forEach(ing => {
            totalProtein += ing.protein || 0;
            totalCarbs += ing.carbs || 0;
            totalFat += ing.fat || 0;
        });
        
        if (meal.meal_time) {
            const date = new Date(meal.meal_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    const daysCount = uniqueDays.size || mealsData.length;
    const mealCount = mealsData.length;
    
    return {
        avgCaloriesPerDay: daysCount > 0 ? Math.round(totalCalories / daysCount) : 0,
        avgProtein: mealCount > 0 ? roundNumber(totalProtein / mealCount, 1) : 0,
        avgCarbs: mealCount > 0 ? roundNumber(totalCarbs / mealCount, 1) : 0,
        avgFat: mealCount > 0 ? roundNumber(totalFat / mealCount, 1) : 0,
        totalMeals: mealCount,
        hasData: mealCount > 0
    };
};

const analyzeActivityData = (activityData) => {
    console.log('📊 analyzeActivityData input:', activityData?.length || 0, 'records');
    
    if (!activityData || activityData.length === 0) { 
        return { totalMinutes: 0, avgMinutesPerDay: 0, records: 0, hasData: false }; 
    }
    
    let totalMinutes = 0;
    const uniqueDays = new Set();
    
    activityData.forEach(activity => {
        const duration = activity.duration_minutes || 0;
        totalMinutes += duration;
        
        if (activity.start_time) {
            const date = new Date(activity.start_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    const daysCount = uniqueDays.size || activityData.length;
    return {
        totalMinutes: totalMinutes,
        avgMinutesPerDay: daysCount > 0 ? Math.round(totalMinutes / daysCount) : 0,
        records: activityData.length,
        hasData: activityData.length > 0
    };
};

const analyzeHealthMetricsData = (healthData) => {
    console.log('📊 analyzeHealthMetricsData input:', healthData?.length || 0, 'records');
    
    if (!healthData || healthData.length === 0) { 
        return { 
            avgWeight: 0, 
            avgSystolic: 0, 
            avgDiastolic: 0, 
            avgGlucose: 0,
            records: 0,
            hasData: false 
        }; 
    }
    
    let totalWeight = 0;
    let totalSystolic = 0;
    let totalDiastolic = 0;
    let totalGlucose = 0;
    let weightCount = 0;
    let bpCount = 0;
    let glucoseCount = 0;
    
    healthData.forEach(record => {
        if (record.weight_kg && record.weight_kg > 0) {
            totalWeight += parseFloat(record.weight_kg);
            weightCount++;
        }
        if (record.systolic_pressure && record.systolic_pressure > 0) {
            totalSystolic += record.systolic_pressure;
            totalDiastolic += record.diastolic_pressure || 0;
            bpCount++;
        }
        if (record.glucose_mgdl && record.glucose_mgdl > 0) {
            totalGlucose += record.glucose_mgdl;
            glucoseCount++;
        }
    });
    
    return {
        avgWeight: weightCount > 0 ? roundNumber(totalWeight / weightCount, 1) : 0,
        avgSystolic: bpCount > 0 ? Math.round(totalSystolic / bpCount) : 0,
        avgDiastolic: bpCount > 0 ? Math.round(totalDiastolic / bpCount) : 0,
        avgGlucose: glucoseCount > 0 ? Math.round(totalGlucose / glucoseCount) : 0,
        records: healthData.length,
        hasData: healthData.length > 0
    };
};

const analyzeMoodData = (moodData) => {
    console.log('📊 analyzeMoodData input:', moodData?.length || 0, 'records');
    
    if (!moodData || moodData.length === 0) { 
        return { avgMood: 0, totalDays: 0, hasData: false }; 
    }
    
    const moodMap = { 
        'Excellent': 5, 
        'Good': 4, 
        'Neutral': 3, 
        'Stressed': 2, 
        'Anxious': 2, 
        'Sad': 1 
    };
    
    let totalMood = 0;
    const uniqueDays = new Set();
    
    moodData.forEach(mood => {
        const moodValue = moodMap[mood.mood] || 3;
        totalMood += moodValue;
        
        if (mood.entry_time) {
            const date = new Date(mood.entry_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    return {
        avgMood: moodData.length > 0 ? roundNumber(totalMood / moodData.length, 1) : 0,
        totalDays: uniqueDays.size,
        hasData: moodData.length > 0
    };
};

const analyzeHabitsData = (habitLogs, habitDefinitions) => {
    console.log('📊 analyzeHabitsData input:', habitLogs?.length || 0, 'logs,', habitDefinitions?.length || 0, 'definitions');
    
    if (!habitLogs || habitLogs.length === 0) { 
        return { completionRate: 0, completed: 0, total: 0, hasData: false }; 
    }
    
    const completed = habitLogs.filter(h => h.is_completed === true).length;
    const total = habitLogs.length;
    
    return {
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed: completed,
        total: total,
        hasData: habitLogs.length > 0
    };
};

const calculateHealthScore = (sleep, nutrition, activity, healthMetrics, mood, habits) => {
    let score = 0;
    
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) score += 30;
        else if (sleep.avgHours >= 6) score += 20;
        else if (sleep.avgHours >= 5) score += 15;
        else score += 10;
    } else {
        score += 15;
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) score += 25;
        else if (nutrition.avgCaloriesPerDay >= 1500) score += 18;
        else if (nutrition.avgCaloriesPerDay > 2200 && nutrition.avgCaloriesPerDay <= 2500) score += 15;
        else score += 10;
    } else {
        score += 12;
    }
    
    if (activity.hasData && activity.avgMinutesPerDay > 0) {
        if (activity.avgMinutesPerDay >= 30) score += 10;
        else if (activity.avgMinutesPerDay >= 20) score += 7;
        else if (activity.avgMinutesPerDay >= 10) score += 5;
        else score += 3;
    } else {
        score += 5;
    }
    
    if (healthMetrics.hasData) {
        let metricsScore = 0;
        if (healthMetrics.avgWeight >= 50 && healthMetrics.avgWeight <= 100) metricsScore += 3;
        if (healthMetrics.avgSystolic >= 90 && healthMetrics.avgSystolic <= 140) metricsScore += 4;
        if (healthMetrics.avgGlucose >= 70 && healthMetrics.avgGlucose <= 140) metricsScore += 3;
        score += metricsScore;
    } else {
        score += 5;
    }
    
    if (mood.hasData && mood.avgMood > 0) {
        if (mood.avgMood >= 4) score += 15;
        else if (mood.avgMood >= 3) score += 10;
        else if (mood.avgMood >= 2) score += 5;
        else score += 2;
    } else {
        score += 7;
    }
    
    if (habits.hasData && habits.completionRate > 0) {
        if (habits.completionRate >= 80) score += 10;
        else if (habits.completionRate >= 60) score += 7;
        else if (habits.completionRate >= 40) score += 4;
        else score += 2;
    } else {
        score += 5;
    }
    
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    let grade = '';
    if (finalScore >= 90) grade = 'A+';
    else if (finalScore >= 80) grade = 'A';
    else if (finalScore >= 70) grade = 'B';
    else if (finalScore >= 60) grade = 'C';
    else if (finalScore >= 50) grade = 'D';
    else grade = 'F';
    
    return { score: finalScore, grade };
};

const generateTopRecommendation = (sleep, nutrition, activity, healthMetrics, mood, habits, t) => {
    const hasAnyData = sleep.hasData || nutrition.hasData || activity.hasData || healthMetrics.hasData || mood.hasData || habits.hasData;
    
    if (!hasAnyData) {
        return {
            icon: '📝',
            title: t('reports.recommendations.start.title') || 'ابدأ بتسجيل بياناتك',
            advice: t('reports.recommendations.start.advice') || 'كلما سجلت المزيد من البيانات، حصلت على توصيات أكثر دقة',
            action: t('reports.recommendations.start.action') || 'سجل أول قراءة صحية اليوم'
        };
    }
    
    if (sleep.hasData && sleep.avgHours > 0 && sleep.avgHours < 7) {
        return {
            icon: '🌙',
            title: t('reports.recommendations.sleepMore.title') || 'حسّن نومك',
            advice: t('reports.recommendations.sleepMore.advice', { hours: sleep.avgHours }) || `تنام في المتوسط ${sleep.avgHours} ساعة فقط`,
            action: t('reports.recommendations.sleepMore.action') || 'حاول النوم 7-8 ساعات يومياً'
        };
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0 && nutrition.avgCaloriesPerDay < 1500) {
        return {
            icon: '🥗',
            title: t('reports.recommendations.increaseCalories.title') || 'زد سعراتك',
            advice: t('reports.recommendations.increaseCalories.advice', { calories: nutrition.avgCaloriesPerDay }) || `تتناول ${nutrition.avgCaloriesPerDay} سعرة فقط في اليوم`,
            action: t('reports.recommendations.increaseCalories.action') || 'أضف وجبات صحية غنية بالبروتين'
        };
    }
    
    if (healthMetrics.hasData && healthMetrics.avgSystolic > 140) {
        return {
            icon: '❤️',
            title: t('reports.recommendations.lowerBloodPressure.title') || 'حسّن ضغط دمك',
            advice: t('reports.recommendations.lowerBloodPressure.advice', { systolic: healthMetrics.avgSystolic }) || `ضغطك ${healthMetrics.avgSystolic} مرتفع`,
            action: t('reports.recommendations.lowerBloodPressure.action') || 'قلل الملح ومارس المشي'
        };
    }
    
    if (activity.hasData && activity.avgMinutesPerDay > 0 && activity.avgMinutesPerDay < 30) {
        return {
            icon: '🏃',
            title: t('reports.recommendations.increaseActivity.title') || 'زد نشاطك',
            advice: t('reports.recommendations.increaseActivity.advice', { minutes: activity.avgMinutesPerDay }) || `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة فقط يومياً`,
            action: t('reports.recommendations.increaseActivity.action') || 'المشي 30 دقيقة يومياً يحسن صحتك'
        };
    }
    
    if (mood.hasData && mood.avgMood > 0 && mood.avgMood < 3) {
        return {
            icon: '😊',
            title: t('reports.recommendations.improveMood.title') || 'حسّن مزاجك',
            advice: t('reports.recommendations.improveMood.advice', { mood: mood.avgMood }) || `مزاجك في المتوسط ${mood.avgMood}/5`,
            action: t('reports.recommendations.improveMood.action') || 'جرب التأمل أو تمارين التنفس العميق'
        };
    }
    
    return {
        icon: '🌟',
        title: t('reports.recommendations.excellent.title') || 'أحسنت!',
        advice: t('reports.recommendations.excellent.advice') || 'جميع مؤشراتك الصحية جيدة',
        action: t('reports.recommendations.excellent.action') || 'استمر في هذا النمط الصحي الرائع'
    };
};

const generateSmartStory = (sleep, nutrition, activity, healthMetrics, mood, habits, t) => {
    const events = [];
    
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) {
            events.push({ type: 'improvement', text: t('reports.story.sleepIdeal', { hours: sleep.avgHours }) || `🌙 تنام ${sleep.avgHours} ساعات في المتوسط - مثالي!` });
        } else if (sleep.avgHours >= 6) {
            events.push({ type: 'warning', text: t('reports.story.sleepLow', { hours: sleep.avgHours }) || `🌙 تنام ${sleep.avgHours} ساعات - حاول زيادة نومك قليلاً` });
        } else {
            events.push({ type: 'danger', text: t('reports.story.sleepVeryLow', { hours: sleep.avgHours }) || `🌙 تنام فقط ${sleep.avgHours} ساعات - هذا قليل جداً` });
        }
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) {
            events.push({ type: 'improvement', text: t('reports.story.nutritionIdeal', { calories: nutrition.avgCaloriesPerDay }) || `🥗 تتناول ${nutrition.avgCaloriesPerDay} سعرة يومياً - نظام غذائي متوازن` });
        } else {
            events.push({ type: 'warning', text: t('reports.story.nutritionWarning', { calories: nutrition.avgCaloriesPerDay }) || `🥗 تتناول ${nutrition.avgCaloriesPerDay} سعرة - حاول تحسين نظامك الغذائي` });
        }
    }
    
    if (healthMetrics.hasData && healthMetrics.avgSystolic > 0) {
        if (healthMetrics.avgSystolic >= 90 && healthMetrics.avgSystolic <= 140) {
            events.push({ type: 'improvement', text: `❤️ ضغط دمك طبيعي (${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic})` });
        } else {
            events.push({ type: 'warning', text: `⚠️ ضغط دمك مرتفع (${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic})` });
        }
    }
    
    if (activity.hasData && activity.avgMinutesPerDay > 0) {
        if (activity.avgMinutesPerDay >= 30) {
            events.push({ type: 'improvement', text: t('reports.story.activityIdeal', { minutes: activity.avgMinutesPerDay }) || `🏃 تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة يومياً - ممتاز!` });
        } else {
            events.push({ type: 'warning', text: t('reports.story.activityLow', { minutes: activity.avgMinutesPerDay }) || `🏃 تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة فقط - زد نشاطك` });
        }
    }
    
    if (mood.hasData && mood.avgMood > 0) {
        if (mood.avgMood >= 4) {
            events.push({ type: 'improvement', text: t('reports.story.moodExcellent', { mood: mood.avgMood }) || `😊 مزاجك ممتاز (${mood.avgMood}/5)` });
        } else if (mood.avgMood >= 3) {
            events.push({ type: 'warning', text: t('reports.story.moodGood', { mood: mood.avgMood }) || `😊 مزاجك جيد (${mood.avgMood}/5) - يمكن تحسينه` });
        } else {
            events.push({ type: 'danger', text: t('reports.story.moodLow', { mood: mood.avgMood }) || `😊 مزاجك منخفض (${mood.avgMood}/5) - اهتم بصحتك النفسية` });
        }
    }
    
    if (events.length === 0) {
        events.push({ type: 'info', text: t('reports.story.noData') || 'سجل المزيد من البيانات للحصول على تحليل أفضل' });
    }
    
    return events;
};

const generateSmartReports = (currentData, previousData, range, t) => {
    console.log('🔄 Generating reports with current data:', {
        sleep: currentData.sleep?.length,
        meals: currentData.meals?.length,
        activities: currentData.activities?.length,
        health: currentData.health?.length,
        mood: currentData.mood?.length,
        habits: currentData.habits?.length
    });
    
    const sleep = analyzeSleepData(currentData.sleep);
    const nutrition = analyzeNutritionData(currentData.meals);
    const activity = analyzeActivityData(currentData.activities);
    const healthMetrics = analyzeHealthMetricsData(currentData.health);
    const mood = analyzeMoodData(currentData.mood);
    const habits = analyzeHabitsData(currentData.habits, currentData.habitDefinitions);
    
    const healthScore = calculateHealthScore(sleep, nutrition, activity, healthMetrics, mood, habits);
    const story = generateSmartStory(sleep, nutrition, activity, healthMetrics, mood, habits, t);
    const topRecommendation = generateTopRecommendation(sleep, nutrition, activity, healthMetrics, mood, habits, t);
    
    return {
        summary: {
            healthScore: {
                score: healthScore.score,
                grade: healthScore.grade,
                change: 0
            },
            story,
            keyEvents: [],
            topRecommendation,
            period: { start: range.start, end: range.end }
        },
        sleep: { ...sleep, comparison: null },
        nutrition: { ...nutrition, comparison: null },
        activity: { ...activity, comparison: null },
        healthMetrics: { ...healthMetrics, comparison: null },
        mood: { ...mood, comparison: null },
        habits: { ...habits, comparison: null }
    };
};

const getDateRange = (type, customStart, customEnd) => {
    const end = new Date();
    let start = new Date();
    
    if (type === 'weekly') {
        start.setDate(end.getDate() - 7);
    } else if (type === 'monthly') {
        start.setMonth(end.getMonth() - 1);
    } else if (type === 'quarterly') {
        start.setMonth(end.getMonth() - 3);
    } else if (type === 'custom') {
        return { start: new Date(customStart), end: new Date(customEnd) };
    }
    
    return { start, end };
};

const extractData = (response) => {
    if (!response) return [];
    if (response.results && Array.isArray(response.results)) return response.results;
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.items && Array.isArray(response.items)) return response.items;
    if (typeof response === 'object' && response !== null && response.id !== undefined) return [response];
    console.warn('Unexpected response format in extractData:', response);
    return [];
};

const Reports = ({ isAuthReady }) => {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('weekly');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');

    const isArabic = i18n.language.startsWith('ar');
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const abortControllersRef = useRef([]);

    const fetchAllData = useCallback(async (url, key) => {
        let allData = [];
        let nextUrl = url;
        
        try {
            while (nextUrl) {
                const controller = new AbortController();
                abortControllersRef.current.push(controller);
                
                const response = await axiosInstance.get(nextUrl, { signal: controller.signal });
                const data = response.data;
                
                const items = extractData(data);
                
                if (Array.isArray(items)) {
                    allData = [...allData, ...items];
                }
                
                nextUrl = data.next || null;
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
                console.error(`Error fetching ${key}:`, err);
            }
        }
        
        console.log(`✅ ${key}: ${allData.length} records`);
        return allData;
    }, []);

    const fetchDataInRange = useCallback(async (start, end) => {
        abortControllersRef.current.forEach(controller => controller.abort());
        abortControllersRef.current = [];
        
        const startStr = start.toISOString();
        const endStr = end.toISOString();
        
        console.log('📡 Fetching data from:', startStr, 'to:', endStr);
        
        try {
            const [
                sleepData,
                mealsData,
                activitiesData,
                healthData,
                moodData,
                habitsData,
                habitDefsData
            ] = await Promise.all([
                fetchAllData(`/sleep/?start=${startStr}&end=${endStr}`, 'sleep'),
                fetchAllData(`/meals/?start=${startStr}&end=${endStr}`, 'meals'),
                fetchAllData(`/activities/?start=${startStr}&end=${endStr}`, 'activities'),
                fetchAllData(`/health_status/?start=${startStr}&end=${endStr}`, 'health'),
                fetchAllData(`/mood-logs/?start=${startStr}&end=${endStr}`, 'mood'),
                fetchAllData(`/habit-logs/?start=${startStr}&end=${endStr}`, 'habits'),
                fetchAllData('/habit-definitions/', 'habitDefinitions')
            ]);
            
            return {
                sleep: sleepData,
                meals: mealsData,
                activities: activitiesData,
                health: healthData,
                mood: moodData,
                habits: habitsData,
                habitDefinitions: habitDefsData
            };
        } catch (err) {
            console.error('Error in fetchDataInRange:', err);
            throw err;
        }
    }, [fetchAllData]);

    const fetchReports = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const { start, end } = getDateRange(reportType, dateRange.start, dateRange.end);
            
            console.log('📅 Fetching data for period:', { start, end });
            
            const currentData = await fetchDataInRange(start, end);
            
            if (!isMountedRef.current) return;
            
            const reportData = generateSmartReports(currentData, {}, { start, end }, t);
            console.log('📊 Final report generated successfully');
            setReports(reportData);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Error fetching reports:', err);
            if (isMountedRef.current) {
                setError(t('reports.error') || 'حدث خطأ في جلب التقارير');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [reportType, dateRange, t, fetchDataInRange]);

    useEffect(() => {
        if (isAuthReady) {
            fetchReports();
        }
        
        return () => {
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, [isAuthReady, reportType, dateRange.start, dateRange.end, fetchReports]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, []);

    const exportToPDF = () => alert(t('reports.export.pdfComingSoon') || 'سيتم إضافة ميزة تصدير PDF قريباً');
    const exportToCSV = () => alert(t('reports.export.csvComingSoon') || 'سيتم إضافة ميزة تصدير CSV قريباً');

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('reports.loading') || 'جاري تحميل التقارير...'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <p>❌ {error}</p>
                    <button onClick={fetchReports} className="type-btn active">
                        🔄 {t('reports.retry') || 'إعادة المحاولة'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2>📊 {t('reports.title') || 'التقارير الصحية الشاملة'}</h2>
                <div className="reports-controls" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="search-input" style={{ width: 'auto' }}>
                        <option value="weekly">{t('reports.types.weekly') || 'تقرير أسبوعي'}</option>
                        <option value="monthly">{t('reports.types.monthly') || 'تقرير شهري'}</option>
                        <option value="quarterly">{t('reports.types.quarterly') || 'تقرير ربع سنوي'}</option>
                        <option value="custom">{t('reports.types.custom') || 'تقرير مخصص'}</option>
                    </select>
                    {reportType === 'custom' && (
                        <div className="date-range" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="search-input" style={{ width: 'auto' }} />
                            <span className="stat-label">{t('reports.to') || 'إلى'}</span>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="search-input" style={{ width: 'auto' }} />
                        </div>
                    )}
                    <button onClick={exportToPDF} className="type-btn" style={{ background: '#ef4444', color: 'white' }}>📄 PDF</button>
                    <button onClick={exportToCSV} className="type-btn" style={{ background: '#10b981', color: 'white' }}>📊 CSV</button>
                </div>
            </div>

            {reports && (
                <div className="reports-content">
                    {/* Health Score Card */}
                    <div className="insight-card">
                        <div className="insight-icon">🎯</div>
                        <div className="insight-content">
                            <div className="notification-header" style={{ marginBottom: 0 }}>
                                <div className="notification-title">
                                    <span className="rec-category">{t('reports.healthScore') || 'درجة الصحة'}</span>
                                    <span className={`priority-badge priority-${reports.summary.healthScore.grade === 'A' ? 'urgent' : reports.summary.healthScore.grade === 'B' ? 'high' : 'medium'}`}>
                                        {reports.summary.healthScore.score}/100
                                    </span>
                                </div>
                            </div>
                            <div className="progress-bar" style={{ marginTop: 'var(--spacing-md)' }}>
                                <div className="progress-fill" style={{ width: `${reports.summary.healthScore.score}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Story Card */}
                    {reports.summary.story.length > 0 && (
                        <div className="recommendations-section">
                            <h3>📖 {t('reports.story.title') || 'القصة الذكية لصحبتك'}</h3>
                            <div className="recommendations-list">
                                {reports.summary.story.map((event, i) => (
                                    <div key={i} className={`recommendation-card priority-${event.type === 'improvement' ? 'low' : event.type === 'warning' ? 'medium' : 'high'}`}>
                                        <div className="rec-header">
                                            <span className="rec-icon">
                                                {event.type === 'improvement' ? '📈' : event.type === 'warning' ? '⚠️' : event.type === 'danger' ? '🔴' : 'ℹ️'}
                                            </span>
                                            <span className="rec-category">{event.text}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Recommendation Card */}
                    <div className="insight-card" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                        <div className="insight-icon">{reports.summary.topRecommendation.icon}</div>
                        <div className="insight-content">
                            <div className="rec-header">
                                <span className="rec-category" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('reports.topRecommendation') || 'التوصية الأولى'}</span>
                            </div>
                            <h4 style={{ color: 'white' }}>{reports.summary.topRecommendation.title}</h4>
                            <p className="rec-message" style={{ color: 'rgba(255,255,255,0.95)' }}>{reports.summary.topRecommendation.advice}</p>
                            <div className="rec-advice" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>💡 {reports.summary.topRecommendation.action}</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="analytics-tabs">
                        <button className={`type-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 {t('reports.tabs.summary') || 'الملخص'}</button>
                        <button className={`type-btn ${activeTab === 'sleep' ? 'active' : ''}`} onClick={() => setActiveTab('sleep')}>🌙 {t('reports.tabs.sleep') || 'النوم'}</button>
                        <button className={`type-btn ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>🥗 {t('reports.tabs.nutrition') || 'التغذية'}</button>
                        <button className={`type-btn ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>📊 {t('reports.tabs.metrics') || 'القياسات الحيوية'}</button>
                        <button className={`type-btn ${activeTab === 'mood' ? 'active' : ''}`} onClick={() => setActiveTab('mood')}>😊 {t('reports.tabs.mood') || 'المزاج'}</button>
                        <button className={`type-btn ${activeTab === 'habits' ? 'active' : ''}`} onClick={() => setActiveTab('habits')}>💊 {t('reports.tabs.habits') || 'العادات'}</button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'summary' && (
                            <div className="analytics-stats-grid">
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">🌙</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{t('reports.sleep.title') || 'النوم'}</div>
                                        <div className="stat-value">{reports.sleep.hasData ? reports.sleep.avgHours : 0} {t('reports.sleep.hours') || 'ساعات'}</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">🥗</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{t('reports.nutrition.title') || 'التغذية'}</div>
                                        <div className="stat-value">{reports.nutrition.hasData ? reports.nutrition.avgCaloriesPerDay : 0}</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">🏃</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{t('reports.activity.title') || 'النشاط'}</div>
                                        <div className="stat-value">{reports.activity.hasData ? reports.activity.avgMinutesPerDay : 0} {t('reports.minutes') || 'دقيقة'}</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">❤️</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{t('reports.healthMetrics.title') || 'القياسات الحيوية'}</div>
                                        <div className="stat-value">{reports.healthMetrics.hasData ? `${reports.healthMetrics.avgSystolic}/${reports.healthMetrics.avgDiastolic}` : '—'}</div>
                                    </div>
                                </div>
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">😊</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{t('reports.mood.title') || 'المزاج'}</div>
                                        <div className="stat-value">{reports.mood.hasData ? reports.mood.avgMood : 0}/5</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'sleep' && (
                            <div className="recommendations-section">
                                <h3>🌙 {t('reports.sleep.details') || 'تفاصيل النوم'}</h3>
                                {reports.sleep.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                <span>{t('reports.sleep.avgHours') || 'متوسط ساعات النوم'}: <strong>{reports.sleep.avgHours} {t('reports.sleep.hours') || 'ساعات'}</strong></span>
                                                <span>{t('reports.sleep.totalNights') || 'عدد الليالي'}: <strong>{reports.sleep.totalNights}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">😴 لا توجد بيانات نوم مسجلة</div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'nutrition' && (
                            <div className="recommendations-section">
                                <h3>🥗 {t('reports.nutrition.details') || 'تفاصيل التغذية'}</h3>
                                {reports.nutrition.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                <span>🥗 {t('reports.nutrition.avgCalories') || 'متوسط السعرات'}: <strong>{reports.nutrition.avgCaloriesPerDay} {t('reports.caloriesUnit') || 'سعرة'}</strong></span>
                                                <span>💪 {t('reports.nutrition.avgProtein') || 'متوسط البروتين'}: <strong>{reports.nutrition.avgProtein} جرام</strong></span>
                                                <span>🌾 {t('reports.nutrition.avgCarbs') || 'متوسط الكربوهيدرات'}: <strong>{reports.nutrition.avgCarbs} جرام</strong></span>
                                                <span>🫒 {t('reports.nutrition.avgFat') || 'متوسط الدهون'}: <strong>{reports.nutrition.avgFat} جرام</strong></span>
                                                <span>📝 {t('reports.nutrition.totalMeals') || 'إجمالي الوجبات'}: <strong>{reports.nutrition.totalMeals} وجبة</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">🥗 لا توجد بيانات تغذية مسجلة</div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'metrics' && (
                            <div className="recommendations-section">
                                <h3>📊 {t('reports.healthMetrics.title') || 'القياسات الحيوية'}</h3>
                                
                                <div className="recommendations-section">
                                    <h4>🏃 {t('reports.activity.title') || 'النشاط البدني'}</h4>
                                    {reports.activity.hasData ? (
                                        <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                            <div className="strengths">
                                                <div className="habit-stats">
                                                    <span>🏃 {t('reports.activity.totalMinutes') || 'إجمالي الدقائق'}: <strong>{reports.activity.totalMinutes} دقيقة</strong></span>
                                                    <span>📊 {t('reports.activity.avgMinutes') || 'متوسط النشاط اليومي'}: <strong>{reports.activity.avgMinutesPerDay} دقيقة/يوم</strong></span>
                                                    <span>📋 {t('reports.activity.records') || 'عدد الأنشطة'}: <strong>{reports.activity.records} نشاط</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="analytics-empty">🏃 لا توجد بيانات نشاط بدني مسجلة</div>
                                    )}
                                </div>
                                
                                <div className="recommendations-section">
                                    <h4>❤️ القياسات الحيوية</h4>
                                    {reports.healthMetrics.hasData ? (
                                        <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                            <div className="strengths">
                                                <div className="habit-stats">
                                                    <span>⚖️ الوزن: <strong>{reports.healthMetrics.avgWeight} كجم</strong></span>
                                                    <span>❤️ ضغط الدم: <strong>{reports.healthMetrics.avgSystolic}/{reports.healthMetrics.avgDiastolic} mmHg</strong></span>
                                                    <span>🩸 السكر: <strong>{reports.healthMetrics.avgGlucose} mg/dL</strong></span>
                                                    <span>📊 عدد القراءات: <strong>{reports.healthMetrics.records} قراءة</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="analytics-empty">❤️ لا توجد بيانات قياسات حيوية مسجلة</div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'mood' && (
                            <div className="recommendations-section">
                                <h3>😊 {t('reports.mood.details') || 'تفاصيل المزاج'}</h3>
                                {reports.mood.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                <span>😊 {t('reports.mood.avgScore') || 'متوسط درجة المزاج'}: <strong>{reports.mood.avgMood}/5</strong></span>
                                                <span>📅 {t('reports.mood.totalDays') || 'عدد الأيام المسجلة'}: <strong>{reports.mood.totalDays} يوم</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">😊 لا توجد بيانات مزاج مسجلة</div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'habits' && (
                            <div className="recommendations-section">
                                <h3>💊 {t('reports.habits.details') || 'تفاصيل العادات'}</h3>
                                {reports.habits.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                <span>📊 {t('reports.habits.completionRate') || 'نسبة الالتزام'}: <strong>{reports.habits.completionRate}%</strong></span>
                                                <span>✅ {t('reports.habits.completed') || 'العادات المنجزة'}: <strong>{reports.habits.completed}/{reports.habits.total}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">💊 لا توجد بيانات عادات مسجلة</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* الأنماط الإضافية */}
            <style>{`
                .reports-controls select,
                .reports-controls input {
                    min-width: 120px;
                }
                
                @media (max-width: 768px) {
                    .reports-controls {
                        width: 100%;
                        flex-direction: column;
                    }
                    
                    .reports-controls select,
                    .reports-controls input,
                    .reports-controls button {
                        width: 100%;
                    }
                    
                    .date-range {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
};

export default Reports;