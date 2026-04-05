'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';
// ===========================================
// دوال التحليل
// ===========================================

const analyzeHealthData = (healthData) => {
    if (!healthData || healthData.length === 0) return { avgWeight: 0, avgSystolic: 0, avgDiastolic: 0, records: 0 };
    
    const weights = healthData.map(h => parseFloat(h.weight_kg)).filter(w => w > 0);
    const systolic = healthData.map(h => h.systolic_pressure).filter(s => s > 0);
    const diastolic = healthData.map(h => h.diastolic_pressure).filter(d => d > 0);
    
    return {
        avgWeight: weights.length > 0 ? roundNumber(weights.reduce((a, b) => a + b, 0) / weights.length, 1) : 0,
        avgSystolic: systolic.length > 0 ? roundNumber(systolic.reduce((a, b) => a + b, 0) / systolic.length, 0) : 0,
        avgDiastolic: diastolic.length > 0 ? roundNumber(diastolic.reduce((a, b) => a + b, 0) / diastolic.length, 0) : 0,
        records: healthData.length
    };
};

const analyzeNutritionData = (mealsData) => {
    if (!mealsData || mealsData.length === 0) return { avgCaloriesPerDay: 0, avgProtein: 0, totalMeals: 0, hasData: false };
    
    const uniqueDays = [...new Set(mealsData.map(m => new Date(m.meal_time).toDateString()))];
    const totalCalories = mealsData.reduce((sum, m) => sum + (m.total_calories || 0), 0);
    const totalProtein = mealsData.reduce((sum, m) => {
        const ingredients = m.ingredients || [];
        return sum + ingredients.reduce((s, i) => s + (i.protein || 0), 0);
    }, 0);
    
    return {
        avgCaloriesPerDay: uniqueDays.length > 0 ? Math.round(totalCalories / uniqueDays.length) : 0,
        avgProtein: mealsData.length > 0 ? roundNumber(totalProtein / mealsData.length, 1) : 0,
        totalMeals: mealsData.length,
        hasData: true
    };
};

const analyzeSleepData = (sleepData) => {
    if (!sleepData || sleepData.length === 0) return { avgHours: 0, totalNights: 0, hasData: false };
    
    let totalHours = 0;
    let validCount = 0;
    
    sleepData.forEach(sleep => {
        const start = sleep.sleep_start || sleep.start_time;
        const end = sleep.sleep_end || sleep.end_time;
        if (start && end) {
            const duration = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
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

const analyzeMoodData = (moodData) => {
    if (!moodData || moodData.length === 0) return { avgMood: 0, totalDays: 0, hasData: false };
    
    const moodMap = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
    const uniqueDays = [...new Set(moodData.map(m => new Date(m.entry_time).toDateString()))];
    const avgMood = moodData.reduce((sum, m) => sum + (moodMap[m.mood] || 3), 0) / moodData.length;
    
    return {
        avgMood: roundNumber(avgMood, 1),
        totalDays: uniqueDays.length,
        hasData: true
    };
};

const analyzeActivityData = (activityData) => {
    if (!activityData || activityData.length === 0) return { totalMinutes: 0, avgMinutesPerDay: 0, records: 0, hasData: false };
    
    const uniqueDays = [...new Set(activityData.map(a => new Date(a.start_time).toDateString()))];
    const totalMinutes = activityData.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    
    return {
        totalMinutes: totalMinutes,
        avgMinutesPerDay: uniqueDays.length > 0 ? Math.round(totalMinutes / uniqueDays.length) : 0,
        records: activityData.length,
        hasData: true
    };
};

const analyzeHabitsData = (habitLogs, habitDefinitions) => {
    if (!habitLogs || habitLogs.length === 0) return { completionRate: 0, completed: 0, total: 0, hasData: false };
    
    const completed = habitLogs.filter(h => h.is_completed).length;
    const total = habitLogs.length;
    
    return {
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed: completed,
        total: total,
        hasData: true
    };
};

const calculateHealthScore = (sleep, nutrition, activity, mood, habits) => {
    let score = 0;
    
    // نوم (30 نقطة)
    if (sleep.hasData) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) score += 30;
        else if (sleep.avgHours >= 6 && sleep.avgHours < 7) score += 20;
        else if (sleep.avgHours > 8 && sleep.avgHours <= 9) score += 15;
        else score += 10;
    } else {
        score += 15;
    }
    
    // تغذية (25 نقطة)
    if (nutrition.hasData) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) score += 25;
        else if (nutrition.avgCaloriesPerDay >= 1500 && nutrition.avgCaloriesPerDay < 1800) score += 18;
        else if (nutrition.avgCaloriesPerDay > 2200 && nutrition.avgCaloriesPerDay <= 2500) score += 15;
        else score += 10;
    } else {
        score += 12;
    }
    
    // نشاط (20 نقطة)
    if (activity.hasData) {
        if (activity.avgMinutesPerDay >= 30) score += 20;
        else if (activity.avgMinutesPerDay >= 20) score += 15;
        else if (activity.avgMinutesPerDay >= 10) score += 10;
        else score += 5;
    } else {
        score += 10;
    }
    
    // مزاج (15 نقطة)
    if (mood.hasData) {
        if (mood.avgMood >= 4) score += 15;
        else if (mood.avgMood >= 3) score += 10;
        else if (mood.avgMood >= 2) score += 5;
        else score += 2;
    } else {
        score += 7;
    }
    
    // عادات (10 نقاط)
    if (habits.hasData) {
        if (habits.completionRate >= 80) score += 10;
        else if (habits.completionRate >= 60) score += 7;
        else if (habits.completionRate >= 40) score += 4;
        else score += 2;
    } else {
        score += 5;
    }
    
    return {
        score: Math.min(100, Math.max(0, Math.round(score))),
        grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F'
    };
};

const generateKeyEvents = (sleep, nutrition, activity, mood, habits, previous) => {
    const events = [];
    
    if (sleep.hasData && previous.sleep.hasData) {
        const change = sleep.avgHours - previous.sleep.avgHours;
        if (change > 0.5) events.push({ icon: '🌙', text: `زاد متوسط نومك بمقدار ${change.toFixed(1)} ساعة` });
        else if (change < -0.5) events.push({ icon: '🌙', text: `انخفض متوسط نومك بمقدار ${Math.abs(change).toFixed(1)} ساعة` });
    }
    
    if (nutrition.hasData && previous.nutrition.hasData) {
        const change = nutrition.avgCaloriesPerDay - previous.nutrition.avgCaloriesPerDay;
        if (Math.abs(change) > 100) {
            events.push({ icon: '🥗', text: change > 0 ? `زيادة في السعرات اليومية بمقدار ${change}` : `نقص في السعرات اليومية بمقدار ${Math.abs(change)}` });
        }
    }
    
    if (activity.hasData && previous.activity.hasData) {
        const change = activity.avgMinutesPerDay - previous.activity.avgMinutesPerDay;
        if (Math.abs(change) > 10) {
            events.push({ icon: '🏃', text: change > 0 ? `زيادة في النشاط اليومي بمقدار ${change} دقيقة` : `نقص في النشاط اليومي بمقدار ${Math.abs(change)} دقيقة` });
        }
    }
    
    if (mood.hasData && previous.mood.hasData) {
        const change = mood.avgMood - previous.mood.avgMood;
        if (Math.abs(change) > 0.5) {
            events.push({ icon: '😊', text: change > 0 ? `تحسن في المزاج بمقدار ${change.toFixed(1)} نقطة` : `انخفاض في المزاج بمقدار ${Math.abs(change).toFixed(1)} نقطة` });
        }
    }
    
    if (habits.hasData && previous.habits.hasData) {
        const change = habits.completionRate - previous.habits.completionRate;
        if (Math.abs(change) > 10) {
            events.push({ icon: '💊', text: change > 0 ? `زيادة في الالتزام بالعادات بنسبة ${change}%` : `نقص في الالتزام بالعادات بنسبة ${Math.abs(change)}%` });
        }
    }
    
    return events;
};

const generateTopRecommendation = (sleep, nutrition, activity, mood, habits) => {
    if (!sleep.hasData && !nutrition.hasData && !activity.hasData && !mood.hasData && !habits.hasData) {
        return {
            icon: '📝',
            title: 'ابدأ بتسجيل بياناتك',
            advice: 'كلما سجلت المزيد من البيانات، حصلت على توصيات أكثر دقة',
            action: 'سجل أول قراءة صحية اليوم'
        };
    }
    
    if (sleep.hasData && sleep.avgHours < 7) {
        return {
            icon: '🌙',
            title: 'حسّن نومك',
            advice: `تنام في المتوسط ${sleep.avgHours} ساعة فقط`,
            action: 'حاول النوم 7-8 ساعات يومياً لتحسين صحتك'
        };
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay < 1500) {
        return {
            icon: '🥗',
            title: 'زد سعراتك',
            advice: `تتناول ${nutrition.avgCaloriesPerDay} سعرة فقط في اليوم`,
            action: 'أضف وجبات صحية غنية بالبروتين'
        };
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 2500) {
        return {
            icon: '🥗',
            title: 'قلل سعراتك',
            advice: `تتناول ${nutrition.avgCaloriesPerDay} سعرة في اليوم`,
            action: 'ركز على الخضروات والبروتين وقلل الكربوهيدرات'
        };
    }
    
    if (activity.hasData && activity.avgMinutesPerDay < 30) {
        return {
            icon: '🏃',
            title: 'زد نشاطك',
            advice: `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة فقط يومياً`,
            action: 'المشي 30 دقيقة يومياً يحسن صحتك بشكل كبير'
        };
    }
    
    if (mood.hasData && mood.avgMood < 3) {
        return {
            icon: '😊',
            title: 'حسّن مزاجك',
            advice: `مزاجك في المتوسط ${mood.avgMood}/5`,
            action: 'جرب التأمل أو تمارين التنفس العميق'
        };
    }
    
    if (habits.hasData && habits.completionRate < 70) {
        return {
            icon: '💊',
            title: 'التزم بعاداتك',
            advice: `تلتزم بعاداتك بنسبة ${habits.completionRate}% فقط`,
            action: 'ابدأ بعادة صغيرة وسهلة التطبيق'
        };
    }
    
    return {
        icon: '🌟',
        title: 'أحسنت!',
        advice: 'جميع مؤشراتك الصحية جيدة',
        action: 'استمر في هذا النمط الصحي الرائع'
    };
};

const generateSmartStory = (sleep, nutrition, activity, mood, habits) => {
    const events = [];
    
    if (sleep.hasData) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) events.push({ type: 'improvement', text: `نمت ${sleep.avgHours} ساعات في المتوسط - مثالي!` });
        else if (sleep.avgHours >= 6) events.push({ type: 'warning', text: `نمت ${sleep.avgHours} ساعات - حاول زيادة نومك قليلاً` });
        else if (sleep.avgHours > 0) events.push({ type: 'danger', text: `تنام فقط ${sleep.avgHours} ساعات - هذا قليل جداً` });
    }
    
    if (nutrition.hasData) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) events.push({ type: 'improvement', text: `تتناول ${nutrition.avgCaloriesPerDay} سعرة يومياً - نظام غذائي متوازن` });
        else if (nutrition.avgCaloriesPerDay > 0) events.push({ type: 'warning', text: `تتناول ${nutrition.avgCaloriesPerDay} سعرة - حاول تحسين نظامك الغذائي` });
    }
    
    if (activity.hasData) {
        if (activity.avgMinutesPerDay >= 30) events.push({ type: 'improvement', text: `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة يومياً - ممتاز!` });
        else if (activity.avgMinutesPerDay > 0) events.push({ type: 'warning', text: `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة فقط - زد نشاطك` });
    }
    
    if (mood.hasData) {
        if (mood.avgMood >= 4) events.push({ type: 'improvement', text: `مزاجك ممتاز (${mood.avgMood}/5)` });
        else if (mood.avgMood >= 3) events.push({ type: 'warning', text: `مزاجك جيد (${mood.avgMood}/5) - يمكن تحسينه` });
        else if (mood.avgMood > 0) events.push({ type: 'danger', text: `مزاجك منخفض (${mood.avgMood}/5) - اهتم بصحتك النفسية` });
    }
    
    if (events.length === 0) {
        events.push({ type: 'info', text: 'سجل المزيد من البيانات للحصول على تحليل أفضل' });
    }
    
    return events;
};

const generateSmartReports = (currentData, previousData, range) => {
    const sleep = analyzeSleepData(currentData.sleep);
    const previousSleep = analyzeSleepData(previousData.sleep);
    const nutrition = analyzeNutritionData(currentData.meals);
    const previousNutrition = analyzeNutritionData(previousData.meals);
    const activity = analyzeActivityData(currentData.activities);
    const previousActivity = analyzeActivityData(previousData.activities);
    const mood = analyzeMoodData(currentData.mood);
    const previousMood = analyzeMoodData(previousData.mood);
    const habits = analyzeHabitsData(currentData.habits, currentData.habitDefinitions);
    const previousHabits = analyzeHabitsData(previousData.habits, previousData.habitDefinitions);
    const healthScore = calculateHealthScore(sleep, nutrition, activity, mood, habits);
    const previousHealthScore = calculateHealthScore(previousSleep, previousNutrition, previousActivity, previousMood, previousHabits);
    
    const healthScoreChange = calculateChange(healthScore.score, previousHealthScore.score);
    
    const story = generateSmartStory(sleep, nutrition, activity, mood, habits);
    const keyEvents = generateKeyEvents(sleep, nutrition, activity, mood, habits, {
        sleep: previousSleep,
        nutrition: previousNutrition,
        activity: previousActivity,
        mood: previousMood,
        habits: previousHabits
    });
    const topRecommendation = generateTopRecommendation(sleep, nutrition, activity, mood, habits);
    
    return {
        summary: {
            healthScore: {
                score: healthScore.score,
                grade: healthScore.grade,
                change: healthScoreChange
            },
            story,
            keyEvents,
            topRecommendation,
            period: {
                start: range.start,
                end: range.end
            }
        },
        sleep: {
            ...sleep,
            comparison: previousSleep.hasData ? {
                change: calculateChange(sleep.avgHours, previousSleep.avgHours),
                previous: previousSleep.avgHours
            } : null
        },
        nutrition: {
            ...nutrition,
            comparison: previousNutrition.hasData ? {
                change: calculateChange(nutrition.avgCaloriesPerDay, previousNutrition.avgCaloriesPerDay),
                previous: previousNutrition.avgCaloriesPerDay
            } : null
        },
        activity: {
            ...activity,
            comparison: previousActivity.hasData ? {
                change: calculateChange(activity.avgMinutesPerDay, previousActivity.avgMinutesPerDay),
                previous: previousActivity.avgMinutesPerDay
            } : null
        },
        mood: {
            ...mood,
            comparison: previousMood.hasData ? {
                change: calculateChange(mood.avgMood, previousMood.avgMood),
                previous: previousMood.avgMood
            } : null
        },
        habits: {
            ...habits,
            comparison: previousHabits.hasData ? {
                change: calculateChange(habits.completionRate, previousHabits.completionRate),
                previous: previousHabits.completionRate
            } : null
        }
    };
};
// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب النسبة المئوية للتغير
const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return roundNumber(((current - previous) / previous) * 100, 0);
};

// دالة للحصول على اتجاه التغير
const getTrend = (change) => {
    if (change > 5) return { icon: '📈', text: 'تحسن', color: '#10b981' };
    if (change < -5) return { icon: '📉', text: 'انخفاض', color: '#ef4444' };
    return { icon: '➡️', text: 'مستقر', color: '#f59e0b' };
};

// دالة لتحليل الفترة الزمنية
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

// دالة للحصول على الفترة السابقة للمقارنة
const getPreviousRange = (start, end) => {
    const duration = end - start;
    return {
        start: new Date(start - duration),
        end: start
    };
};

const Reports = ({ isAuthReady }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
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
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const abortControllersRef = useRef([]);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب البيانات - مع useCallback ومنع الطلبات المتزامنة
    const fetchDataInRange = useCallback(async (start, end) => {
        // إلغاء الطلبات السابقة
        abortControllersRef.current.forEach(controller => controller.abort());
        abortControllersRef.current = [];
        
        const endpoints = [
            `/health_status/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/meals/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/sleep/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/mood-logs/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/activities/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/habit-logs/?start=${start.toISOString()}&end=${end.toISOString()}`,
            '/habit-definitions/'
        ];
        
        const promises = endpoints.map(async (url, index) => {
            const controller = new AbortController();
            abortControllersRef.current.push(controller);
            
            try {
                const response = await axiosInstance.get(url, {
                    signal: controller.signal
                });
                return { data: response.data, index };
            } catch (err) {
                if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                    return { data: [], index };
                }
                console.error(`Error fetching ${url}:`, err);
                return { data: [], index };
            }
        });
        
        const results = await Promise.all(promises);
        
        return {
            health: results.find(r => r.index === 0)?.data || [],
            meals: results.find(r => r.index === 1)?.data || [],
            sleep: results.find(r => r.index === 2)?.data || [],
            mood: results.find(r => r.index === 3)?.data || [],
            activities: results.find(r => r.index === 4)?.data || [],
            habits: results.find(r => r.index === 5)?.data || [],
            habitDefinitions: results.find(r => r.index === 6)?.data || []
        };
    }, []);

    // ✅ جلب التقارير - مع useCallback ومنع الطلبات المتزامنة
    const fetchReports = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const { start, end } = getDateRange(reportType, dateRange.start, dateRange.end);
            const previousRange = getPreviousRange(start, end);
            
            const [currentData, previousData] = await Promise.all([
                fetchDataInRange(start, end),
                fetchDataInRange(previousRange.start, previousRange.end)
            ]);
            
            if (!isMountedRef.current) return;
            
            const reportData = generateSmartReports(currentData, previousData, { start, end });
            setReports(reportData);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Error fetching reports:', err);
            if (isMountedRef.current) {
                setError(t('reports.error'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [reportType, dateRange, t, fetchDataInRange]);

    // ✅ جلب البيانات عند التغيير
    useEffect(() => {
        if (isAuthReady) {
            fetchReports();
        }
        
        return () => {
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, [isAuthReady, reportType, dateRange.start, dateRange.end, fetchReports]);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, []);

    // ... باقي دوال التحليل (analyzeHealthData, analyzeNutritionData, etc.) تبقى كما هي ...

    // ✅ ملاحظة: الدوال التحليلية (analyzeHealthData, analyzeNutritionData, analyzeSleepData, 
    // analyzeMoodData, analyzeActivityData, analyzeHabitsData, calculateHealthScore, 
    // generateSmartStory, generateKeyEvents, generateTopRecommendation) تبقى كما هي دون تغيير

    // أضف هنا جميع دوال التحليل كما هي في الكود الأصلي
    // (analyzeHealthData, analyzeNutritionData, analyzeSleepData, analyzeMoodData, 
    // analyzeActivityData, analyzeHabitsData, calculateHealthScore, generateSmartStory, 
    // generateKeyEvents, generateTopRecommendation, generateSmartReports)

    const exportToPDF = () => {
        alert(t('reports.export.pdfComingSoon'));
    };

    const exportToCSV = () => {
        alert(t('reports.export.csvComingSoon'));
    };

    if (loading) {
        return (
            <div className={`reports-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('reports.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`reports-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchReports} className="retry-btn">
                    {t('reports.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={`reports-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس الصفحة */}
            <div className="reports-header">
                <h2>
                    <span className="header-icon">📊</span>
                    {t('reports.title')}
                </h2>
                
                <div className="reports-controls">
                    <select 
                        value={reportType} 
                        onChange={(e) => setReportType(e.target.value)}
                        className="report-type-select"
                    >
                        <option value="weekly">{t('reports.types.weekly')}</option>
                        <option value="monthly">{t('reports.types.monthly')}</option>
                        <option value="quarterly">{t('reports.types.quarterly')}</option>
                        <option value="custom">{t('reports.types.custom')}</option>
                    </select>

                    {reportType === 'custom' && (
                        <div className="date-range">
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="date-input"
                            />
                            <span>{t('reports.to')}</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="date-input"
                            />
                        </div>
                    )}

                    <button onClick={exportToPDF} className="export-btn pdf">
                        📄 PDF
                    </button>
                    <button onClick={exportToCSV} className="export-btn csv">
                        📊 CSV
                    </button>
                </div>
            </div>

            {reports && (
                <div className="reports-content">
                    {/* درجة الصحة */}
                    <div className="health-score-card">
                        <div className="score-header">
                            <span className="score-icon">🎯</span>
                            <span className="score-title">{t('reports.healthScore')}</span>
                            <span className={`score-value score-${reports.summary.healthScore.grade}`}>
                                {reports.summary.healthScore.score}/100
                            </span>
                            <span className="score-grade">{reports.summary.healthScore.grade}</span>
                            {reports.summary.healthScore.change !== 0 && (
                                <span className={`score-change ${reports.summary.healthScore.change > 0 ? 'positive' : 'negative'}`}>
                                    {reports.summary.healthScore.change > 0 ? '↑' : '↓'} {Math.abs(reports.summary.healthScore.change)}%
                                </span>
                            )}
                        </div>
                        <div className="score-progress">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${reports.summary.healthScore.score}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* القصة الذكية */}
                    {reports.summary.story.length > 0 && (
                        <div className="story-card">
                            <h3>📖 {t('reports.story.title')}</h3>
                            <div className="story-events">
                                {reports.summary.story.map((event, i) => (
                                    <div key={i} className={`story-event ${event.type}`}>
                                        <span className="event-icon">{event.type === 'improvement' ? '📈' : '📉'}</span>
                                        <span className="event-text">{event.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* أهم الأحداث */}
                    {reports.summary.keyEvents.length > 0 && (
                        <div className="key-events-card">
                            <h3>⚡ {t('reports.keyEvents')}</h3>
                            <div className="events-list">
                                {reports.summary.keyEvents.map((event, i) => (
                                    <div key={i} className="event-item">
                                        <span className="event-icon">{event.icon}</span>
                                        <span className="event-text">{event.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* التوصية الذكية */}
                    <div className="top-recommendation-card">
                        <div className="rec-header">
                            <span className="rec-icon">{reports.summary.topRecommendation.icon}</span>
                            <span className="rec-title">{t('reports.topRecommendation')}</span>
                        </div>
                        <h4>{reports.summary.topRecommendation.title}</h4>
                        <p className="rec-advice">{reports.summary.topRecommendation.advice}</p>
                        <div className="rec-action">💡 {reports.summary.topRecommendation.action}</div>
                    </div>

                    {/* تبويبات التفاصيل */}
                    <div className="reports-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                            onClick={() => setActiveTab('summary')}
                        >
                            📊 {t('reports.tabs.summary')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'sleep' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sleep')}
                        >
                            🌙 {t('reports.tabs.sleep')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
                            onClick={() => setActiveTab('nutrition')}
                        >
                            🥗 {t('reports.tabs.nutrition')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            🏃 {t('reports.tabs.activity')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'mood' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mood')}
                        >
                            😊 {t('reports.tabs.mood')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
                            onClick={() => setActiveTab('habits')}
                        >
                            💊 {t('reports.tabs.habits')}
                        </button>
                    </div>

                    {/* محتوى التبويبات */}
                    <div className="tab-content">
                        {activeTab === 'summary' && (
                            <div className="summary-grid">
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🌙</span>
                                        <span>{t('reports.sleep.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.sleep.avgHours || 0} {t('reports.sleep.hours')}</div>
                                    {reports.sleep.comparison && (
                                        <div className={`stat-change ${reports.sleep.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.sleep.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.sleep.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🥗</span>
                                        <span>{t('reports.nutrition.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.nutrition.avgCaloriesPerDay || 0}</div>
                                    {reports.nutrition.comparison && (
                                        <div className={`stat-change ${reports.nutrition.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.nutrition.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.nutrition.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🏃</span>
                                        <span>{t('reports.activity.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.activity.avgMinutesPerDay || 0} {t('reports.activity.minutes')}</div>
                                    {reports.activity.comparison && (
                                        <div className={`stat-change ${reports.activity.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.activity.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.activity.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>😊</span>
                                        <span>{t('reports.mood.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.mood.avgMood || 0}/5</div>
                                    {reports.mood.comparison && (
                                        <div className={`stat-change ${reports.mood.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.mood.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.mood.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'sleep' && reports.sleep.hasData && (
                            <div className="detail-card">
                                <h3>🌙 {t('reports.sleep.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.sleep.avgHours')}</span>
                                        <span className="detail-value">{reports.sleep.avgHours} {t('reports.sleep.hours')}</span>
                                        {reports.sleep.comparison && (
                                            <span className={`detail-change ${reports.sleep.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.sleep.comparison.change > 0 ? '+' : ''}{reports.sleep.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.sleep.totalNights')}</span>
                                        <span className="detail-value">{reports.sleep.totalNights}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'nutrition' && reports.nutrition.hasData && (
                            <div className="detail-card">
                                <h3>🥗 {t('reports.nutrition.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.avgCalories')}</span>
                                        <span className="detail-value">{reports.nutrition.avgCaloriesPerDay}</span>
                                        {reports.nutrition.comparison && (
                                            <span className={`detail-change ${reports.nutrition.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.nutrition.comparison.change > 0 ? '+' : ''}{reports.nutrition.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.avgProtein')}</span>
                                        <span className="detail-value">{reports.nutrition.avgProtein}g</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.totalMeals')}</span>
                                        <span className="detail-value">{reports.nutrition.totalMeals}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'activity' && reports.activity.hasData && (
                            <div className="detail-card">
                                <h3>🏃 {t('reports.activity.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.totalMinutes')}</span>
                                        <span className="detail-value">{reports.activity.totalMinutes}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.avgMinutes')}</span>
                                        <span className="detail-value">{reports.activity.avgMinutesPerDay} {t('reports.activity.perDay')}</span>
                                        {reports.activity.comparison && (
                                            <span className={`detail-change ${reports.activity.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.activity.comparison.change > 0 ? '+' : ''}{reports.activity.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.records')}</span>
                                        <span className="detail-value">{reports.activity.records}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'mood' && reports.mood.hasData && (
                            <div className="detail-card">
                                <h3>😊 {t('reports.mood.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.mood.avgScore')}</span>
                                        <span className="detail-value">{reports.mood.avgMood}/5</span>
                                        {reports.mood.comparison && (
                                            <span className={`detail-change ${reports.mood.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.mood.comparison.change > 0 ? '+' : ''}{reports.mood.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.mood.totalDays')}</span>
                                        <span className="detail-value">{reports.mood.totalDays}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'habits' && reports.habits.hasData && (
                            <div className="detail-card">
                                <h3>💊 {t('reports.habits.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.habits.completionRate')}</span>
                                        <span className="detail-value">{reports.habits.completionRate}%</span>
                                        {reports.habits.comparison && (
                                            <span className={`detail-change ${reports.habits.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.habits.comparison.change > 0 ? '+' : ''}{reports.habits.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.habits.completed')}</span>
                                        <span className="detail-value">{reports.habits.completed}/{reports.habits.total}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            <style jsx>{`
/* Reports.css - متوافق مع ThemeManager */

.reports-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
    transition: background var(--transition-medium);
}

/* ===== رأس الصفحة ===== */
.reports-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.reports-header h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    font-size: 1.5rem;
}

.header-icon {
    font-size: 1.8rem;
}

.reports-controls {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    flex-wrap: wrap;
}

.report-type-select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-full);
    background: var(--secondary-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.report-type-select:focus {
    outline: none;
    border-color: var(--primary);
}

.date-range {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
}

.date-input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 0.85rem;
}

.date-input:focus {
    outline: none;
    border-color: var(--primary);
}

.export-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.export-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.export-btn.pdf {
    background: #ef4444;
    color: white;
}

.export-btn.csv {
    background: #10b981;
    color: white;
}

/* ===== درجة الصحة ===== */
.health-score-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
}

.score-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
}

.score-icon {
    font-size: 1.5rem;
}

.score-title {
    font-weight: 700;
    color: var(--text-primary);
}

.score-value {
    font-size: 1.8rem;
    font-weight: 700;
    margin-left: auto;
}

[dir="rtl"] .score-value {
    margin-left: 0;
    margin-right: auto;
}

.score-value.score-A { color: var(--success); }
.score-value.score-B { color: var(--info); }
.score-value.score-C { color: var(--warning); }
.score-value.score-D { color: #f97316; }
.score-value.score-E { color: var(--error); }

.score-grade {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-weight: 700;
    background: var(--secondary-bg);
    color: var(--text-primary);
}

.score-change {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 600;
}

.score-change.positive {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
}

.score-change.negative {
    background: rgba(239, 68, 68, 0.2);
    color: var(--error);
}

.score-progress {
    width: 100%;
}

.progress-bar {
    height: 10px;
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--primary-gradient);
    border-radius: var(--radius-full);
    transition: width var(--transition-medium);
}

/* ===== القصة الذكية ===== */
.story-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.story-card h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.story-events {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.story-event {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-lg);
}

.story-event.improvement {
    background: rgba(16, 185, 129, 0.1);
    border-right: 3px solid var(--success);
}

.story-event.warning {
    background: rgba(245, 158, 11, 0.1);
    border-right: 3px solid var(--warning);
}

.story-event.danger {
    background: rgba(239, 68, 68, 0.1);
    border-right: 3px solid var(--error);
}

[dir="rtl"] .story-event.improvement,
[dir="rtl"] .story-event.warning,
[dir="rtl"] .story-event.danger {
    border-right: none;
    border-left: 3px solid;
}

.event-icon {
    font-size: 1.2rem;
}

.event-text {
    color: var(--text-primary);
    font-size: 0.9rem;
}

/* ===== أهم الأحداث ===== */
.key-events-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.key-events-card h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.events-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.event-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
    transition: all var(--transition-fast);
}

.event-item:hover {
    transform: translateX(5px);
    border-color: var(--primary);
}

[dir="rtl"] .event-item:hover {
    transform: translateX(-5px);
}

/* ===== التوصية الذكية ===== */
.top-recommendation-card {
    background: var(--primary-gradient);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
    box-shadow: var(--shadow-lg);
}

.rec-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.rec-icon {
    font-size: 1.8rem;
}

.rec-title {
    font-weight: 700;
    font-size: 1rem;
    opacity: 0.9;
}

.top-recommendation-card h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: 1.2rem;
}

.rec-advice {
    margin: 0 0 var(--spacing-md) 0;
    opacity: 0.95;
    font-size: 0.95rem;
}

.rec-action {
    background: rgba(255, 255, 255, 0.2);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    display: inline-block;
    font-size: 0.9rem;
}

/* ===== التبويبات ===== */
.reports-tabs {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
}

.tab-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-full);
    background: var(--secondary-bg);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-medium);
    font-size: 0.9rem;
}

.tab-btn:hover:not(.active) {
    background: var(--hover-bg);
    color: var(--primary);
}

.tab-btn.active {
    background: var(--primary-gradient);
    color: white;
}

/* ===== الإحصائيات ===== */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.stat-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.stat-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}

.stat-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.stat-change {
    font-size: 0.8rem;
    margin-top: var(--spacing-xs);
    font-weight: 600;
}

.stat-change.positive {
    color: var(--success);
}

.stat-change.negative {
    color: var(--error);
}

/* ===== بطاقات التفاصيل ===== */
.detail-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.detail-card h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: 1.1rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.detail-label {
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

.detail-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
}

.detail-change {
    font-size: 0.75rem;
    font-weight: 600;
}

.detail-change.positive {
    color: var(--success);
}

.detail-change.negative {
    color: var(--error);
}

/* ===== حالات التحميل والخطأ ===== */
.reports-loading,
.reports-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    text-align: center;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.retry-btn {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-medium);
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .reports-container {
        padding: var(--spacing-md);
    }

    .reports-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .reports-controls {
        width: 100%;
        flex-wrap: wrap;
    }

    .summary-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm);
    }

    .date-range {
        flex-wrap: wrap;
    }

    .reports-tabs {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .summary-grid {
        grid-template-columns: 1fr;
    }

    .score-header {
        flex-wrap: wrap;
    }

    .score-value {
        margin-left: 0;
    }

    [dir="rtl"] .score-value {
        margin-right: 0;
    }

    .detail-grid {
        grid-template-columns: 1fr;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .reports-header h2 {
    flex-direction: row-reverse;
}

[dir="rtl"] .stat-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .detail-item {
    text-align: right;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .stat-card:hover,
    .event-item:hover,
    .export-btn:hover,
    .retry-btn:hover {
        transform: none !important;
    }

    .spinner {
        animation: none !important;
    }

    .progress-fill {
        transition: none !important;
    }
}
            `}</style>
        </div>
    );
};

export default Reports;