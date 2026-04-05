// src/components/SmartFeatures/SmartRecommendations.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './SmartFeatures.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب درجة الصحة (0-100)
const calculateHealthScore = (data) => {
    let score = 65; // نقطة انطلاق متوسطة
    const factors = [];

    // تأثير النوم (30 نقطة)
    if (data.sleep && data.sleep.avgHours) {
        if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) {
            score += 25;
            factors.push({ name: 'sleep', impact: '+25', message: 'نوم ممتاز' });
        } else if (data.sleep.avgHours >= 6 && data.sleep.avgHours < 7) {
            score += 15;
            factors.push({ name: 'sleep', impact: '+15', message: 'نوم جيد' });
        } else if (data.sleep.avgHours >= 5 && data.sleep.avgHours < 6) {
            score += 5;
            factors.push({ name: 'sleep', impact: '+5', message: 'نوم مقبول' });
        } else if (data.sleep.avgHours < 5) {
            score -= 10;
            factors.push({ name: 'sleep', impact: '-10', message: 'قلة نوم شديدة' });
        }
    }

    // تأثير المزاج (20 نقطة)
    if (data.mood && data.mood.avg) {
        if (data.mood.avg >= 4) {
            score += 20;
            factors.push({ name: 'mood', impact: '+20', message: 'مزاج ممتاز' });
        } else if (data.mood.avg >= 3) {
            score += 10;
            factors.push({ name: 'mood', impact: '+10', message: 'مزاج جيد' });
        } else if (data.mood.avg >= 2) {
            score += 0;
            factors.push({ name: 'mood', impact: '0', message: 'مزاج متوسط' });
        } else {
            score -= 10;
            factors.push({ name: 'mood', impact: '-10', message: 'مزاج منخفض' });
        }
    }

    // تأثير النشاط (20 نقطة)
    if (data.activity && data.activity.weeklyMinutes) {
        if (data.activity.weeklyMinutes >= 150) {
            score += 20;
            factors.push({ name: 'activity', impact: '+20', message: 'نشاط ممتاز' });
        } else if (data.activity.weeklyMinutes >= 100) {
            score += 12;
            factors.push({ name: 'activity', impact: '+12', message: 'نشاط جيد' });
        } else if (data.activity.weeklyMinutes >= 50) {
            score += 5;
            factors.push({ name: 'activity', impact: '+5', message: 'نشاط مقبول' });
        } else {
            score -= 5;
            factors.push({ name: 'activity', impact: '-5', message: 'نشاط منخفض' });
        }
    }

    // تأثير التغذية (15 نقطة)
    if (data.nutrition && data.nutrition.avgCalories) {
        if (data.nutrition.avgCalories >= 1800 && data.nutrition.avgCalories <= 2200) {
            score += 15;
            factors.push({ name: 'nutrition', impact: '+15', message: 'تغذية متوازنة' });
        } else if (data.nutrition.avgCalories >= 1500 && data.nutrition.avgCalories < 1800) {
            score += 8;
            factors.push({ name: 'nutrition', impact: '+8', message: 'تغذية جيدة' });
        } else if (data.nutrition.avgCalories > 2500) {
            score -= 5;
            factors.push({ name: 'nutrition', impact: '-5', message: 'سعرات زائدة' });
        } else if (data.nutrition.avgCalories < 1200) {
            score -= 10;
            factors.push({ name: 'nutrition', impact: '-10', message: 'سعرات منخفضة جداً' });
        }
    }

    // تأثير العادات (15 نقطة)
    if (data.habits && data.habits.completionRate) {
        if (data.habits.completionRate >= 80) {
            score += 15;
            factors.push({ name: 'habits', impact: '+15', message: 'التزام ممتاز' });
        } else if (data.habits.completionRate >= 60) {
            score += 8;
            factors.push({ name: 'habits', impact: '+8', message: 'التزام جيد' });
        } else if (data.habits.completionRate >= 40) {
            score += 3;
            factors.push({ name: 'habits', impact: '+3', message: 'التزام مقبول' });
        } else {
            score -= 5;
            factors.push({ name: 'habits', impact: '-5', message: 'تحتاج تنظيم عاداتك' });
        }
    }

    return {
        score: Math.min(100, Math.max(0, Math.round(score))),
        grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'E',
        factors
    };
};

// دالة لحساب الارتباط بين متغيرين
const calculateCorrelation = (x, y) => {
    if (x.length < 3 || y.length < 3) return 0;
    
    const n = Math.min(x.length, y.length);
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
};

const SmartRecommendations = () => {
    const { t, i18n } = useTranslation();
    const [recommendations, setRecommendations] = useState([]);
    const [healthScore, setHealthScore] = useState(null);
    const [correlations, setCorrelations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [expandedCard, setExpandedCard] = useState(null);

    const isArabic = i18n.language.startsWith('ar');

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            const [
                healthRes,
                mealsRes,
                sleepRes,
                moodRes,
                habitsRes,
                activitiesRes,
                weatherRes
            ] = await Promise.all([
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/weather/').catch(() => ({ data: null }))
            ]);

            const allData = {
                health: healthRes.data || [],
                meals: mealsRes.data || [],
                sleep: sleepRes.data || [],
                mood: moodRes.data || [],
                habits: habitsRes.data || [],
                activities: activitiesRes.data || [],
                weather: weatherRes.data || null,
                language: currentLang
            };

            // تحليل البيانات
            const analyzedData = analyzeAllData(allData);
            
            // حساب درجة الصحة
            const score = calculateHealthScore(analyzedData);
            setHealthScore(score);
            
            // حساب العلاقات
            const correlationsData = calculateCorrelationsData(allData);
            setCorrelations(correlationsData);
            
            // توليد التوصيات
            const smartRecs = generateSmartRecommendations(analyzedData, allData);
            setRecommendations(smartRecs);
            
            setLastUpdate(new Date());
            setError(null);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(t('smartRecommendations.error'));
        } finally {
            setLoading(false);
        }
    };

    const analyzeAllData = (rawData) => {
        // تحليل النوم
        const sleep = analyzeSleepData(rawData.sleep);
        
        // تحليل المزاج
        const mood = analyzeMoodData(rawData.mood);
        
        // تحليل النشاط
        const activity = analyzeActivityData(rawData.activities);
        
        // تحليل التغذية
        const nutrition = analyzeNutritionData(rawData.meals);
        
        // تحليل العادات
        const habits = analyzeHabitsData(rawData.habits);
        
        // تحليل الصحة
        const health = analyzeHealthData(rawData.health);
        
        return { sleep, mood, activity, nutrition, habits, health, weather: rawData.weather };
    };

    const analyzeSleepData = (sleep) => {
        if (!sleep || sleep.length === 0) return null;
        
        const hours = sleep.map(s => {
            const start = new Date(s.sleep_start || s.start_time);
            const end = new Date(s.sleep_end || s.end_time);
            return (end - start) / (1000 * 60 * 60);
        }).filter(h => h > 0 && h < 24);
        
        return {
            avgHours: hours.length > 0 ? roundNumber(hours.reduce((a, b) => a + b, 0) / hours.length, 1) : 0,
            quality: sleep.length > 0 ? roundNumber(sleep.reduce((a, b) => a + (b.quality_rating || 3), 0) / sleep.length, 1) : 0,
            lastHours: hours[0] || 0,
            lastQuality: sleep[0]?.quality_rating || 3,
            totalDays: sleep.length
        };
    };

    const analyzeMoodData = (mood) => {
        if (!mood || mood.length === 0) return null;
        
        const getScore = (m) => {
            const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            return map[m.mood] || 3;
        };
        
        const scores = mood.map(m => getScore(m));
        
        return {
            avg: roundNumber(scores.reduce((a, b) => a + b, 0) / scores.length, 1),
            last: mood[0]?.mood || 'Neutral',
            lastScore: getScore(mood[0]),
            totalDays: mood.length,
            recentTrend: scores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, scores.length)
        };
    };

    const analyzeActivityData = (activities) => {
        if (!activities || activities.length === 0) return null;
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyActivities = activities.filter(a => {
            const actDate = new Date(a.date || a.created_at);
            return actDate >= oneWeekAgo;
        });
        
        const totalMinutes = weeklyActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        
        return {
            weeklyMinutes: totalMinutes,
            dailyAverage: roundNumber(totalMinutes / 7, 0),
            count: weeklyActivities.length
        };
    };

    const analyzeNutritionData = (meals) => {
        if (!meals || meals.length === 0) return null;
        
        const today = new Date().toDateString();
        const todayMeals = meals.filter(m => {
            const mealDate = new Date(m.meal_time || m.date).toDateString();
            return mealDate === today;
        });
        
        const avgCalories = meals.length > 0 ? 
            meals.reduce((sum, m) => sum + (m.total_calories || 0), 0) / meals.length : 0;
        
        return {
            totalMeals: meals.length,
            todayMeals: todayMeals.length,
            avgCalories: Math.round(avgCalories)
        };
    };

    const analyzeHabitsData = (habits) => {
        if (!habits || habits.length === 0) return null;
        
        const today = new Date().toDateString();
        const todayHabits = habits.filter(h => {
            const habitDate = new Date(h.date || h.created_at).toDateString();
            return habitDate === today;
        });
        
        const completed = todayHabits.filter(h => h.is_completed).length;
        const total = todayHabits.length;
        
        return {
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            completed,
            total
        };
    };

    const analyzeHealthData = (health) => {
        if (!health || health.length === 0) return null;
        
        const latest = health[0];
        const weight = parseFloat(latest.weight_kg);
        const height = parseFloat(latest.height_cm) / 100;
        
        return {
            weight,
            height,
            bmi: weight && height ? roundNumber(weight / (height * height), 1) : null,
            systolic: latest.systolic_pressure,
            diastolic: latest.diastolic_pressure,
            glucose: latest.blood_glucose ? parseFloat(latest.blood_glucose) : null
        };
    };

    const calculateCorrelationsData = (rawData) => {
        const correlations = [];
        
        // ربط النوم بالمزاج
        if (rawData.sleep.length > 3 && rawData.mood.length > 3) {
            const sleepHours = rawData.sleep.slice(0, 10).map(s => {
                const start = new Date(s.sleep_start || s.start_time);
                const end = new Date(s.sleep_end || s.end_time);
                return (end - start) / (1000 * 60 * 60);
            }).filter(h => h > 0);
            
            const getMoodScore = (m) => {
                const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
                return map[m.mood] || 3;
            };
            const moodScores = rawData.mood.slice(0, 10).map(m => getMoodScore(m));
            
            const correlation = calculateCorrelation(sleepHours, moodScores);
            const absCorr = Math.abs(correlation);
            
            if (absCorr > 0.3) {
                correlations.push({
                    type: 'sleep_mood',
                    icon: '😴 ↔️ 😊',
                    title: t('correlations.sleepMood.title', 'النوم والمزاج'),
                    description: t('correlations.sleepMood.desc', 'العلاقة بين عدد ساعات النوم وجودة المزاج'),
                    strength: correlation,
                    strengthPercent: Math.round(absCorr * 100),
                    sampleSize: Math.min(sleepHours.length, moodScores.length),
                    insight: correlation > 0 ? 
                        t('correlations.sleepMood.positive', 'عندما تنام أكثر، يتحسن مزاجك') :
                        t('correlations.sleepMood.negative', 'قلة النوم تؤثر سلباً على مزاجك')
                });
            }
        }
        
        // ربط النشاط بالمزاج
        if (rawData.activities.length > 3 && rawData.mood.length > 3) {
            const activityMinutes = rawData.activities.slice(0, 10).map(a => a.duration_minutes || 0);
            const getMoodScore = (m) => {
                const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
                return map[m.mood] || 3;
            };
            const moodScores = rawData.mood.slice(0, 10).map(m => getMoodScore(m));
            
            const correlation = calculateCorrelation(activityMinutes, moodScores);
            const absCorr = Math.abs(correlation);
            
            if (absCorr > 0.3) {
                correlations.push({
                    type: 'activity_mood',
                    icon: '🏃 ↔️ 😊',
                    title: t('correlations.activityMood.title', 'النشاط والمزاج'),
                    description: t('correlations.activityMood.desc', 'العلاقة بين مدة النشاط البدني وجودة المزاج'),
                    strength: correlation,
                    strengthPercent: Math.round(absCorr * 100),
                    sampleSize: Math.min(activityMinutes.length, moodScores.length),
                    insight: correlation > 0 ? 
                        t('correlations.activityMood.positive', 'النشاط البدني يحسن مزاجك') :
                        t('correlations.activityMood.negative', 'قلة النشاط مرتبطة بمزاج أقل')
                });
            }
        }
        
        return correlations;
    };

    const generateSmartRecommendations = (data, rawData) => {
        const recommendations = [];
        const now = new Date();
        const currentHour = now.getHours();
        
        // 1. توصيات الصحة - مع درجات واقعية
        if (data.health && data.health.bmi) {
            if (data.health.bmi > 30) {
                recommendations.push({
                    id: 'weight-high',
                    icon: '⚖️',
                    category: t('categories.health'),
                    priority: 'high',
                    title: t('recommendations.weightHigh.title', 'تحسين الوزن'),
                    message: t('recommendations.weightHigh.message', `مؤشر كتلة الجسم ${data.health.bmi}`),
                    advice: t('recommendations.weightHigh.advice', 'فقدان 0.5-1 كجم أسبوعياً'),
                    actions: [
                        t('recommendations.weightHigh.action1', '🚶 مشي 30 دقيقة يومياً'),
                        t('recommendations.weightHigh.action2', '🥗 تقليل السكريات والنشويات'),
                        t('recommendations.weightHigh.action3', '💧 شرب 2-3 لتر ماء يومياً'),
                        t('recommendations.weightHigh.action4', '🍎 تناول وجبات صغيرة متعددة')
                    ],
                    basedOn: t('recommendations.weightHigh.basedOn', 'بناءً على آخر 7 أيام')
                });
            } else if (data.health.bmi < 18.5) {
                recommendations.push({
                    id: 'weight-low',
                    icon: '⚖️',
                    category: t('categories.health'),
                    priority: 'high',
                    title: t('recommendations.weightLow.title', 'زيادة الوزن'),
                    message: t('recommendations.weightLow.message', `مؤشر كتلة الجسم ${data.health.bmi}`),
                    advice: t('recommendations.weightLow.advice', 'زيادة 0.5-1 كجم شهرياً'),
                    actions: [
                        t('recommendations.weightLow.action1', '🥜 إضافة مكسرات وزبدة الفول السوداني'),
                        t('recommendations.weightLow.action2', '🥑 أطعمة غنية بالدهون الصحية'),
                        t('recommendations.weightLow.action3', '🍚 زيادة كمية الكربوهيدرات الصحية'),
                        t('recommendations.weightLow.action4', '💪 تمارين تقوية العضلات')
                    ],
                    basedOn: t('recommendations.weightLow.basedOn', 'بناءً على آخر 7 أيام')
                });
            }
        }
        
        // 2. توصيات النوم - مع بيانات حقيقية
        if (data.sleep) {
            if (data.sleep.avgHours < 6) {
                recommendations.push({
                    id: 'sleep-more',
                    icon: '😴',
                    category: t('categories.sleep'),
                    priority: 'high',
                    title: t('recommendations.sleepMore.title', 'تحسين النوم'),
                    message: t('recommendations.sleepMore.message', `متوسط نومك ${data.sleep.avgHours} ساعات`),
                    advice: t('recommendations.sleepMore.advice', `حاول النوم ${8 - data.sleep.avgHours} ساعات إضافية`),
                    actions: [
                        t('recommendations.sleepMore.action1', '🌙 النوم قبل 11 مساءً'),
                        t('recommendations.sleepMore.action2', '📱 تجنب الشاشات قبل النوم بساعة'),
                        t('recommendations.sleepMore.action3', '🕯️ اجعل الغرفة مظلمة وهادئة'),
                        t('recommendations.sleepMore.action4', '🧘 تمارين الاسترخاء قبل النوم')
                    ],
                    basedOn: t('recommendations.sleepMore.basedOn', `بناءً على آخر ${data.sleep.totalDays} يوم`),
                    prediction: t('recommendations.sleepMore.prediction', 'تحسن المزاج والطاقة')
                });
            }
            
            if (data.sleep.quality < 3) {
                recommendations.push({
                    id: 'sleep-quality',
                    icon: '⭐',
                    category: t('categories.sleep'),
                    priority: 'medium',
                    title: t('recommendations.sleepQuality.title', 'جودة النوم'),
                    message: t('recommendations.sleepQuality.message', `جودة نومك ${data.sleep.quality}/5`),
                    advice: t('recommendations.sleepQuality.advice', 'تحسين بيئة النوم'),
                    actions: [
                        t('recommendations.sleepQuality.action1', '🌡️ درجة حرارة الغرفة 18-22°C'),
                        t('recommendations.sleepQuality.action2', '🚫 تجنب الكافيين بعد العصر'),
                        t('recommendations.sleepQuality.action3', '🛏️ فراش مريح'),
                        t('recommendations.sleepQuality.action4', '🎵 موسيقى هادئة قبل النوم')
                    ],
                    basedOn: t('recommendations.sleepQuality.basedOn', `بناءً على آخر ${data.sleep.totalDays} يوم`)
                });
            }
        }
        
        // 3. توصيات النشاط
        if (data.activity && data.activity.weeklyMinutes < 150) {
            const remaining = 150 - data.activity.weeklyMinutes;
            recommendations.push({
                id: 'activity-more',
                icon: '🏃',
                category: t('categories.activity'),
                priority: 'high',
                title: t('recommendations.activityMore.title', 'زيادة النشاط'),
                message: t('recommendations.activityMore.message', `${data.activity.weeklyMinutes} دقيقة هذا الأسبوع`),
                advice: t('recommendations.activityMore.advice', `نقص ${remaining} دقيقة عن الهدف الأسبوعي`),
                actions: [
                    t('recommendations.activityMore.action1', '🚶 مشي 20 دقيقة يومياً'),
                    t('recommendations.activityMore.action2', '🧘 تمارين منزلية 10 دقائق'),
                    t('recommendations.activityMore.action3', '🚴 ركوب الدراجة'),
                    t('recommendations.activityMore.action4', '🏊 السباحة مرتين أسبوعياً')
                ],
                basedOn: t('recommendations.activityMore.basedOn', 'الهدف: 150 دقيقة أسبوعياً')
            });
        }
        
        // 4. توصيات التغذية حسب الوقت
        if (currentHour >= 5 && currentHour <= 9) {
            recommendations.push({
                id: 'breakfast-time',
                icon: '🍳',
                category: t('categories.nutrition'),
                priority: 'high',
                title: t('recommendations.breakfast.title', 'وقت الإفطار'),
                message: t('recommendations.breakfast.message', 'وجبة الفطور تمنحك الطاقة لليوم'),
                advice: t('recommendations.breakfast.advice', 'اختر وجبة متوازنة'),
                actions: [
                    t('recommendations.breakfast.action1', '🥚 بيض + خبز أسمر'),
                    t('recommendations.breakfast.action2', '🥣 شوفان مع فواكه'),
                    t('recommendations.breakfast.action3', '🥑 توست أفوكادو'),
                    t('recommendations.breakfast.action4', '🍌 زبادي مع مكسرات')
                ],
                basedOn: t('recommendations.breakfast.basedOn', 'أفضل وقت للإفطار')
            });
        }
        
        // 5. توصيات المزاج
        if (data.mood && data.mood.avg < 3) {
            recommendations.push({
                id: 'mood-low',
                icon: '😊',
                category: t('categories.mood'),
                priority: 'high',
                title: t('recommendations.moodLow.title', 'تحسين المزاج'),
                message: t('recommendations.moodLow.message', `متوسط مزاجك ${data.mood.avg}/5`),
                advice: t('recommendations.moodLow.advice', 'أنشطة تساعد على تحسين المزاج'),
                actions: [
                    t('recommendations.moodLow.action1', '🚶 مشي 20 دقيقة في الهواء الطلق'),
                    t('recommendations.moodLow.action2', '💬 تحدث مع شخص تثق به'),
                    t('recommendations.moodLow.action3', '📝 اكتب 3 أشياء إيجابية اليوم'),
                    t('recommendations.moodLow.action4', '🎵 استمع لموسيقى تحبها')
                ],
                basedOn: t('recommendations.moodLow.basedOn', `بناءً على آخر ${data.mood.totalDays} يوم`)
            });
        }
        
        // 6. تنبيهات خطر حقيقية
        if (data.sleep && data.sleep.lastHours < 4) {
            recommendations.push({
                id: 'danger-sleep',
                icon: '🚨',
                category: t('categories.alert'),
                priority: 'urgent',
                title: t('recommendations.dangerSleep.title', '⚠️ خطر قلة النوم'),
                message: t('recommendations.dangerSleep.message', `نمت ${data.sleep.lastHours} ساعات فقط`),
                advice: t('recommendations.dangerSleep.advice', 'قلة النوم المستمرة تؤثر على صحتك'),
                actions: [
                    t('recommendations.dangerSleep.action1', '😴 نام مبكراً الليلة'),
                    t('recommendations.dangerSleep.action2', '☕ قلل الكافيين اليوم'),
                    t('recommendations.dangerSleep.action3', '📱 تجنب الشاشات قبل النوم')
                ],
                basedOn: t('recommendations.dangerSleep.basedOn', 'تسجيل نوم الليلة الماضية')
            });
        }
        
        // 7. توصيات الطقس (مع موقع دقيق)
        if (rawData.weather) {
            const weather = rawData.weather;
            if (weather.temperature > 35) {
                recommendations.push({
                    id: 'weather-hot',
                    icon: '☀️',
                    category: t('categories.weather'),
                    priority: 'medium',
                    title: t('recommendations.weatherHot.title', 'طقس حار'),
                    message: t('recommendations.weatherHot.message', `${weather.temperature}°C - ${weather.city || ''}`),
                    advice: t('recommendations.weatherHot.advice', 'اشرب ماء بانتظام'),
                    actions: [
                        t('recommendations.weatherHot.action1', '💧 اشرب 3-4 لتر ماء'),
                        t('recommendations.weatherHot.action2', '🌳 تجنب الخروج في الظهيرة'),
                        t('recommendations.weatherHot.action3', '🧢 ارتدِ قبعة ونظارات شمسية'),
                        t('recommendations.weatherHot.action4', '🍉 تناول فواكه غنية بالماء')
                    ],
                    basedOn: t('recommendations.weatherHot.basedOn', `طقس ${weather.city || 'موقعك'}`)
                });
            }
        }
        
        return recommendations;
    };

    if (loading) {
        return (
            <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>{t('smartRecommendations.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-container">
                    <p>❌ {error}</p>
                    <button onClick={fetchAllData} className="retry-btn">
                        🔄 {t('smartRecommendations.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
            <div className="recommendations-header">
                <h2>🧠 {t('smartRecommendations.title')}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('smartRecommendations.refresh')}>
                    🔄
                </button>
            </div>

            {/* درجة الصحة المحسنة */}
            {healthScore && (
                <div className="health-score-card">
                    <div className="score-header">
                        <span className="score-icon">📊</span>
                        <span className="score-title">{t('smartRecommendations.healthScore')}</span>
                        <span className={`score-value score-${healthScore.grade}`}>
                            {healthScore.score}/100
                        </span>
                        <span className="score-grade">{healthScore.grade}</span>
                    </div>
                    <div className="score-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${healthScore.score}%` }} />
                        </div>
                    </div>
                    <div className="score-factors">
                        {healthScore.factors.slice(0, 3).map((f, i) => (
                            <div key={i} className="factor-item">
                                <span className="factor-impact">{f.impact}</span>
                                <span className="factor-message">{f.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* العلاقات مع بيانات حقيقية */}
            {correlations.length > 0 && (
                <div className="correlations-section">
                    <h3>🔗 {t('smartRecommendations.correlations')}</h3>
                    <div className="correlations-grid">
                        {correlations.map((corr, idx) => (
                            <div key={idx} className="correlation-card">
                                <div className="correlation-icon">{corr.icon}</div>
                                <div className="correlation-content">
                                    <h4>{corr.title}</h4>
                                    <p className="correlation-insight">{corr.insight}</p>
                                    <div className="correlation-strength">
                                        <div className="strength-bar">
                                            <div className="strength-fill" style={{ width: `${corr.strengthPercent}%` }} />
                                        </div>
                                        <span className="strength-value">{corr.strengthPercent}%</span>
                                    </div>
                                    <div className="correlation-meta">
                                        📊 {t('smartRecommendations.basedOn')} {corr.sampleSize} {t('smartRecommendations.days')}
                                    </div>
                                    <button 
                                        className="explain-btn"
                                        onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                                    >
                                        {expandedCard === idx ? '📖 إخفاء التفاصيل' : '📖 كيف تم الحساب؟'}
                                    </button>
                                    {expandedCard === idx && (
                                        <div className="explanation">
                                            <p>{t('correlations.explanation')}</p>
                                            <small>{t('correlations.formula')}: r = {corr.strength.toFixed(3)}</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* التوصيات الذكية */}
            {recommendations.length === 0 ? (
                <div className="no-recommendations">
                    <p>✨ {t('smartRecommendations.noRecommendations')}</p>
                </div>
            ) : (
                <div className="recommendations-grid">
                    {recommendations.map((rec) => (
                        <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                            <div className="card-header">
                                <span className="card-icon">{rec.icon}</span>
                                <span className="card-category">{rec.category}</span>
                                <span className={`card-priority priority-${rec.priority}`}>
                                    {rec.priority === 'urgent' ? t('priority.urgent') : 
                                     rec.priority === 'high' ? t('priority.high') : 
                                     rec.priority === 'medium' ? t('priority.medium') : t('priority.low')}
                                </span>
                            </div>
                            
                            <h3 className="card-title">{rec.title}</h3>
                            <p className="card-message">{rec.message}</p>
                            
                            <div className="card-advice">
                                <strong>💡 {t('smartRecommendations.tip')}:</strong> {rec.advice}
                            </div>
                            
                            {rec.actions && rec.actions.length > 0 && (
                                <div className="card-actions">
                                    <strong>📋 {t('smartRecommendations.suggestions')}:</strong>
                                    <ul>
                                        {rec.actions.slice(0, 3).map((action, i) => (
                                            <li key={i}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {rec.prediction && (
                                <div className="card-prediction">
                                    <span className="prediction-icon">🔮</span>
                                    <span>{rec.prediction}</span>
                                </div>
                            )}
                            
                            <div className="card-basedon">
                                <small>📊 {rec.basedOn}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {lastUpdate && (
                <div className="recommendations-footer">
                    <small>🕒 {t('smartRecommendations.lastUpdate')}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</small>
                </div>
            )}

            <style jsx>{`
/* SmartRecommendations.css - متوافق مع ThemeManager */

.smart-recommendations {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
    transition: background var(--transition-medium);
}

/* ===== رأس الصفحة ===== */
.recommendations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.recommendations-header h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    font-size: 1.5rem;
}

.refresh-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-medium);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.refresh-btn:hover {
    background: var(--primary);
    color: white;
    transform: rotate(180deg);
}

/* ===== درجة الصحة ===== */
.health-score-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
    transition: all var(--transition-medium);
}

.score-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
}

.score-icon {
    font-size: 1.5rem;
}

.score-title {
    font-weight: 600;
    color: var(--text-primary);
}

.score-value {
    font-size: 1.8rem;
    font-weight: 700;
    margin-left: auto;
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

[dir="rtl"] .score-value {
    margin-left: 0;
    margin-right: auto;
}

.score-progress {
    margin-bottom: var(--spacing-md);
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

.score-factors {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
}

.factor-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
    padding: 4px 12px;
    background: var(--secondary-bg);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
}

.factor-impact {
    font-weight: 700;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background: var(--primary-bg);
}

.factor-impact[data-positive="true"] {
    color: var(--success);
}

.factor-impact[data-negative="true"] {
    color: var(--error);
}

/* ===== قسم العلاقات ===== */
.correlations-section {
    margin-bottom: var(--spacing-lg);
}

.correlations-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: 1.2rem;
}

.correlations-grid {
    display: grid;
    gap: var(--spacing-md);
}

.correlation-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    display: flex;
    gap: var(--spacing-md);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.correlation-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.correlation-icon {
    font-size: 2.5rem;
}

.correlation-content {
    flex: 1;
}

.correlation-content h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
}

.correlation-insight {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.correlation-strength {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.strength-bar {
    flex: 1;
    height: 6px;
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.strength-fill {
    height: 100%;
    background: var(--primary-gradient);
    border-radius: var(--radius-full);
}

.strength-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--primary);
}

.correlation-meta {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-sm);
}

.explain-btn {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    font-size: 0.8rem;
    padding: var(--spacing-xs) 0;
    transition: all var(--transition-fast);
}

.explain-btn:hover {
    text-decoration: underline;
}

.explanation {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--secondary-bg);
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    color: var(--text-secondary);
    border-right: 3px solid var(--primary);
}

[dir="rtl"] .explanation {
    border-right: none;
    border-left: 3px solid var(--primary);
}

/* ===== التوصيات ===== */
.recommendations-grid {
    display: grid;
    gap: var(--spacing-lg);
}

.recommendation-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
}

.recommendation-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--primary-gradient);
    transform: scaleX(0);
    transition: transform var(--transition-medium);
    transform-origin: left;
}

.recommendation-card:hover::before {
    transform: scaleX(1);
}

.recommendation-card.priority-urgent {
    border-right: 4px solid var(--error);
}

.recommendation-card.priority-high {
    border-right: 4px solid var(--warning);
}

.recommendation-card.priority-medium {
    border-right: 4px solid var(--info);
}

[dir="rtl"] .recommendation-card.priority-urgent {
    border-right: none;
    border-left: 4px solid var(--error);
}

[dir="rtl"] .recommendation-card.priority-high {
    border-right: none;
    border-left: 4px solid var(--warning);
}

[dir="rtl"] .recommendation-card.priority-medium {
    border-right: none;
    border-left: 4px solid var(--info);
}

.card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    flex-wrap: wrap;
}

.card-icon {
    font-size: 1.8rem;
}

.card-category {
    padding: 4px 12px;
    background: var(--secondary-bg);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.card-priority {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 600;
}

.card-priority.priority-urgent {
    background: var(--error-bg);
    color: var(--error);
}

.card-priority.priority-high {
    background: var(--warning-bg);
    color: var(--warning);
}

.card-priority.priority-medium {
    background: var(--info-bg);
    color: var(--info);
}

.card-title {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
}

.card-message {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.card-advice {
    background: var(--secondary-bg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-sm);
    border-right: 3px solid var(--primary);
}

[dir="rtl"] .card-advice {
    border-right: none;
    border-left: 3px solid var(--primary);
}

.card-advice strong {
    color: var(--primary);
}

.card-actions {
    margin-bottom: var(--spacing-sm);
}

.card-actions strong {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.card-actions ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    list-style: none;
}

.card-actions li {
    margin-bottom: var(--spacing-xs);
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.card-actions li::before {
    content: '✓';
    color: var(--success);
    font-weight: bold;
}

[dir="rtl"] .card-actions ul {
    padding-left: 0;
    padding-right: var(--spacing-lg);
}

.card-prediction {
    background: var(--primary-bg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    margin: var(--spacing-sm) 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}

.prediction-icon {
    font-size: 1.1rem;
}

.card-basedon {
    margin-top: var(--spacing-sm);
    text-align: right;
    color: var(--text-tertiary);
    font-size: 0.7rem;
}

[dir="rtl"] .card-basedon {
    text-align: left;
}

/* ===== حالات فارغة ===== */
.no-recommendations {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    color: var(--text-tertiary);
    border: 1px solid var(--border-light);
}

/* ===== تذييل ===== */
.recommendations-footer {
    margin-top: var(--spacing-lg);
    text-align: center;
    padding: var(--spacing-md);
    color: var(--text-tertiary);
    font-size: 0.75rem;
}

/* ===== حالات التحميل والخطأ ===== */
.loading-container,
.error-container {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--card-bg);
    border-radius: var(--radius-xl);
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
}

.retry-btn {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-gradient);
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

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .smart-recommendations {
        padding: var(--spacing-md);
    }

    .correlation-card {
        flex-direction: column;
    }

    .score-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .score-value {
        margin-left: 0;
    }

    [dir="rtl"] .score-value {
        margin-right: 0;
    }

    .score-factors {
        flex-direction: column;
        width: 100%;
    }

    .factor-item {
        justify-content: space-between;
    }

    .recommendation-card {
        padding: var(--spacing-md);
    }

    .card-header {
        flex-wrap: wrap;
    }
}

@media (max-width: 480px) {
    .recommendations-header {
        flex-direction: column;
    }

    .correlation-icon {
        font-size: 2rem;
    }

    .card-title {
        font-size: 1rem;
    }

    .card-actions li {
        font-size: 0.8rem;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .recommendation-card::before {
    left: auto;
    right: 0;
    transform-origin: right;
}

[dir="rtl"] .card-actions li::before {
    margin-left: var(--spacing-sm);
    margin-right: 0;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .recommendation-card::before,
    .progress-fill,
    .refresh-btn:hover,
    .correlation-card:hover {
        transition: none !important;
        transform: none !important;
    }

    .spinner {
        animation: none !important;
    }
}
            `}</style>
        </div>
    );
};

export default SmartRecommendations;