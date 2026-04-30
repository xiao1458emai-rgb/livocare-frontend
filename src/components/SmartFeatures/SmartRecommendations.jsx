// src/components/SmartFeatures/SmartRecommendations.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
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
    // ✅ إعدادات اللغة مباشرة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [recommendations, setRecommendations] = useState([]);
    const [healthScore, setHealthScore] = useState(null);
    const [correlations, setCorrelations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [weather, setWeather] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis'); // analysis, recommendations, predictions

    // ✅ إزالة useTranslation - استخدام اللغة المحلية مباشرة

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
        fetchAllData();
        const interval = setInterval(fetchAllData, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);


const fetchAllData = async () => {
    setLoading(true);
    try {
        const [
            healthRes,
            mealsRes,
            sleepRes,
            moodRes,
            habitsRes,
            activitiesRes,
            habitDefRes,
            weatherRes,
            advancedInsightsRes  // ✅ جديد: جلب التحليلات المتقدمة
        ] = await Promise.all([
            axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
            axiosInstance.get('/meals/').catch(() => ({ data: [] })),
            axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
            axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
            axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
            axiosInstance.get('/activities/').catch(() => ({ data: [] })),
            axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
            axiosInstance.get('/weather/').catch(() => ({ data: null })),
            axiosInstance.get('/advanced-insights/').catch(() => ({ data: null }))  // ✅ API جديد
        ]);

        const allData = {
            health: healthRes.data || [],
            meals: mealsRes.data || [],
            sleep: sleepRes.data || [],
            mood: moodRes.data || [],
            habits: habitsRes.data || [],
            activities: activitiesRes.data || [],
            habitDefinitions: habitDefRes.data || [],
            weather: weatherRes.data?.success ? weatherRes.data.data : null,
            advancedInsights: advancedInsightsRes.data,  // ✅ إضافة التحليلات المتقدمة
            language: isArabic ? 'ar' : 'en'
        };

        // ✅ استخدام التحليلات من Backend إذا كانت متوفرة
        if (allData.advancedInsights && !allData.advancedInsights.error) {
            // استخدام البيانات من Backend
            const backendData = allData.advancedInsights;
            
            // تحويل بيانات Backend إلى تنسيق الواجهة
            const healthScoreFromBackend = {
                score: backendData.health_score?.total_score || 70,
                status: backendData.health_score?.category_text || (isArabic ? 'جيدة' : 'Good'),
                statusIcon: backendData.health_score?.category === 'excellent' ? '🌟' : 
                           backendData.health_score?.category === 'good' ? '👍' : 
                           backendData.health_score?.category === 'fair' ? '📈' : '⚠️',
                factors: backendData.strengths_weaknesses?.strengths?.slice(0, 3).map(s => ({ 
                    message: s, 
                    points: 10 
                })) || [],
                maxScore: 100
            };
            
            setHealthScore(healthScoreFromBackend);
            
            // تحويل الارتباطات من Backend
            const correlationsFromBackend = [];
            if (backendData.correlations?.values) {
                const corrValues = backendData.correlations.values;
                if (corrValues.sleep_mood && Math.abs(corrValues.sleep_mood) > 0.2) {
                    correlationsFromBackend.push({
                        type: 'sleep_mood',
                        icon: '😴 ↔️ 😊',
                        title: isArabic ? 'النوم والمزاج' : 'Sleep & Mood',
                        insight: backendData.correlations.interpretations?.[0] || 
                            (corrValues.sleep_mood > 0 ? 
                                (isArabic ? 'النوم الجيد يحسن المزاج' : 'Good sleep improves mood') :
                                (isArabic ? 'قلة النوم تؤثر سلباً على المزاج' : 'Lack of sleep negatively affects mood')),
                        strengthValue: corrValues.sleep_mood,
                        strengthText: Math.abs(corrValues.sleep_mood) > 0.7 ? (isArabic ? 'قوية جداً' : 'Very strong') :
                                     Math.abs(corrValues.sleep_mood) > 0.5 ? (isArabic ? 'قوية' : 'Strong') :
                                     Math.abs(corrValues.sleep_mood) > 0.3 ? (isArabic ? 'متوسطة' : 'Moderate') : (isArabic ? 'ضعيفة' : 'Weak'),
                        strengthPercent: Math.min(95, Math.max(5, Math.abs(corrValues.sleep_mood) * 100)),
                        sampleSize: 30
                    });
                }
            }
            setCorrelations(correlationsFromBackend);
            
            // تحويل التوصيات من Backend
            const recommendationsFromBackend = [];
            if (backendData.recommendations && backendData.recommendations.length > 0) {
                backendData.recommendations.forEach((rec, idx) => {
                    recommendationsFromBackend.push({
                        id: `backend-rec-${idx}`,
                        icon: rec.icon || '💡',
                        category: rec.category,
                        priority: rec.priority === 'high' ? 'high' : 
                                 rec.priority === 'medium' ? 'medium' : 'low',
                        title: rec.title,
                        message: rec.action || rec.message,
                        advice: rec.daily_tip || rec.advice,
                        actions: [rec.action].filter(Boolean),
                        basedOn: isArabic ? 'تحليل ذكي متقدم' : 'Advanced smart analysis'
                    });
                });
            }
            setRecommendations(recommendationsFromBackend);
            
            // تحويل التوقعات من Backend
            const predictionsFromBackend = [];
            if (backendData.trends_predictions?.weight_predictions_7d) {
                predictionsFromBackend.push({
                    icon: '⚖️',
                    label: isArabic ? 'الوزن المتوقع بعد أسبوع' : 'Estimated weight in 1 week',
                    value: `${backendData.trends_predictions.weight_predictions_7d[6]?.toFixed(1) || '--'} kg`,
                    trend: 'stable',
                    note: isArabic ? 'تقدير يعتمد على تحليل اتجاهات وزنك' : 'Estimate based on your weight trends'
                });
            }
            setPredictions(predictionsFromBackend);
            
        } else {
            // ✅ Fallback: استخدام الحسابات المحلية (الموجودة بالفعل)
            const analyzedData = analyzeAllData(allData);
            const score = calculateHealthScore(analyzedData);
            setHealthScore(score);
            
            const correlationsData = calculateCorrelations(allData);
            setCorrelations(correlationsData);
            
            const smartRecs = generateRecommendations(analyzedData, allData);
            setRecommendations(smartRecs);
            
            const preds = generatePredictions(analyzedData);
            setPredictions(preds);
        }
        
        if (allData.weather) {
            setWeather(allData.weather);
        }
        
        setLastUpdate(new Date());
        setError(null);

    } catch (err) {
        console.error('Error fetching data:', err);
        setError(isArabic ? 'حدث خطأ في جلب البيانات' : 'Error fetching data');
    } finally {
        setLoading(false);
    }
};


    const analyzeAllData = (rawData) => {
        const sleep = analyzeSleepData(rawData.sleep);
        const mood = analyzeMoodData(rawData.mood);
        const activity = analyzeActivityData(rawData.activities);
        const nutrition = analyzeNutritionData(rawData.meals);
        const habits = analyzeHabitsData(rawData.habits, rawData.habitDefinitions);
        const health = analyzeHealthData(rawData.health);
        return { sleep, mood, activity, nutrition, habits, health };
    };

    const analyzeSleepData = (sleep) => {
        if (!sleep || sleep.length === 0) return null;
        
        const validSleep = [];
        sleep.forEach(s => {
            const start = s.sleep_start || s.start_time;
            const end = s.sleep_end || s.end_time;
            if (start && end) {
                const hours = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
                if (hours > 0 && hours <= 24) {
                    validSleep.push({
                        hours,
                        quality: s.quality_rating || 3,
                        date: new Date(start).toDateString()
                    });
                }
            }
        });
        
        if (validSleep.length === 0) return null;
        
        const avgHours = validSleep.reduce((sum, s) => sum + s.hours, 0) / validSleep.length;
        const avgQuality = validSleep.reduce((sum, s) => sum + s.quality, 0) / validSleep.length;
        
        return {
            avgHours: roundNumber(avgHours, 1),
            avgQuality: roundNumber(avgQuality, 1),
            totalDays: validSleep.length,
            records: validSleep
        };
    };

    const analyzeMoodData = (mood) => {
        if (!mood || mood.length === 0) return null;
        
        const getScore = (m) => {
            const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            return map[m.mood] || 3;
        };
        
        const validMood = mood.filter(m => m.mood);
        if (validMood.length === 0) return null;
        
        const scores = validMood.map(m => getScore(m));
        
        return {
            avg: roundNumber(scores.reduce((a, b) => a + b, 0) / scores.length, 1),
            last: validMood[0]?.mood || 'Neutral',
            totalDays: validMood.length,
            records: validMood
        };
    };

    const analyzeActivityData = (activities) => {
        if (!activities || activities.length === 0) return null;
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyActivities = activities.filter(a => {
            const actDate = new Date(a.start_time || a.created_at);
            return actDate >= oneWeekAgo;
        });
        
        const totalMinutes = weeklyActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        
        return {
            weeklyMinutes: totalMinutes,
            dailyAverage: roundNumber(totalMinutes / 7, 0),
            count: weeklyActivities.length,
            totalActivities: activities.length
        };
    };

    const analyzeNutritionData = (meals) => {
        if (!meals || meals.length === 0) return null;
        
        const today = new Date().toDateString();
        const todayMeals = meals.filter(m => {
            const mealDate = new Date(m.meal_time || m.date).toDateString();
            return mealDate === today;
        });
        
        const totalCalories = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
        const avgCalories = meals.length > 0 ? totalCalories / meals.length : 0;
        
        return {
            totalMeals: meals.length,
            todayMeals: todayMeals.length,
            avgCalories: Math.round(avgCalories),
            totalCalories: Math.round(totalCalories)
        };
    };

    const analyzeHabitsData = (habits, definitions) => {
        if (!habits || habits.length === 0) return null;
        
        const today = new Date().toDateString();
        const todayHabits = habits.filter(h => {
            const habitDate = new Date(h.log_date || h.date).toDateString();
            return habitDate === today;
        });
        
        const completed = todayHabits.filter(h => h.is_completed).length;
        const total = todayHabits.length;
        
        const medHabits = definitions.filter(d => 
            d.name?.toLowerCase().includes('دواء') || 
            d.name?.toLowerCase().includes('medication')
        );
        
        const medHabitIds = medHabits.map(h => h.id);
        const medLogs = habits.filter(h => medHabitIds.includes(h.habit));
        const medCompleted = medLogs.filter(h => h.is_completed).length;
        const medTotal = medLogs.length;
        
        return {
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            completed,
            total,
            medicationAdherence: medTotal > 0 ? Math.round((medCompleted / medTotal) * 100) : 0,
            medCompleted,
            medTotal
        };
    };

    const analyzeHealthData = (health) => {
        if (!health || health.length === 0) return null;
        
        const latest = health[0];
        const weight = latest.weight_kg ? parseFloat(latest.weight_kg) : null;
        
        let bmi = null;
        if (weight && latest.height_cm) {
            const height = parseFloat(latest.height_cm) / 100;
            bmi = roundNumber(weight / (height * height), 1);
        }
        
        return {
            weight,
            bmi,
            systolic: latest.systolic_pressure || null,
            diastolic: latest.diastolic_pressure || null,
            glucose: latest.blood_glucose ? parseFloat(latest.blood_glucose) : null,
            recorded_at: latest.recorded_at
        };
    };

    // ✅ حساب درجة الصحة مع تفسير واضح
    const calculateHealthScore = (data) => {
        let score = 50;
        const factors = [];
        
        // النوم (25 نقطة)
        if (data.sleep) {
            if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) {
                score += 25;
                factors.push({ name: 'sleep', points: 25, message: isArabic ? 'نومك في المعدل المثالي' : 'Sleep in ideal range' });
            } else if (data.sleep.avgHours >= 6) {
                score += 15;
                factors.push({ name: 'sleep', points: 15, message: isArabic ? 'نومك جيد لكن يمكن تحسينه' : 'Sleep is good but can improve' });
            } else if (data.sleep.avgHours >= 5) {
                score += 5;
                factors.push({ name: 'sleep', points: 5, message: isArabic ? 'نومك قليل نسبياً' : 'Sleep is somewhat low' });
            } else if (data.sleep.avgHours > 0) {
                score -= 10;
                factors.push({ name: 'sleep', points: -10, message: isArabic ? 'نومك أقل من الموصى به' : 'Sleep is below recommended' });
            }
        }
        
        // المزاج (20 نقطة)
        if (data.mood) {
            if (data.mood.avg >= 4) {
                score += 20;
                factors.push({ name: 'mood', points: 20, message: isArabic ? 'مزاجك إيجابي جداً' : 'Very positive mood' });
            } else if (data.mood.avg >= 3) {
                score += 10;
                factors.push({ name: 'mood', points: 10, message: isArabic ? 'مزاجك مستقر' : 'Stable mood' });
            } else if (data.mood.avg >= 2) {
                score += 0;
                factors.push({ name: 'mood', points: 0, message: isArabic ? 'مزاجك يحتاج دعماً' : 'Mood needs support' });
            }
        }
        
        // النشاط (20 نقطة)
        if (data.activity) {
            if (data.activity.weeklyMinutes >= 150) {
                score += 20;
                factors.push({ name: 'activity', points: 20, message: isArabic ? 'نشاطك ممتاز' : 'Excellent activity level' });
            } else if (data.activity.weeklyMinutes >= 100) {
                score += 12;
                factors.push({ name: 'activity', points: 12, message: isArabic ? 'نشاطك جيد' : 'Good activity level' });
            } else if (data.activity.weeklyMinutes >= 50) {
                score += 5;
                factors.push({ name: 'activity', points: 5, message: isArabic ? 'نشاطك مقبول' : 'Fair activity level' });
            } else if (data.activity.weeklyMinutes > 0) {
                score -= 5;
                factors.push({ name: 'activity', points: -5, message: isArabic ? 'نشاطك قليل' : 'Low activity level' });
            }
        }
        
        // التغذية (15 نقطة)
        if (data.nutrition && data.nutrition.avgCalories > 0) {
            if (data.nutrition.avgCalories >= 1800 && data.nutrition.avgCalories <= 2200) {
                score += 15;
                factors.push({ name: 'nutrition', points: 15, message: isArabic ? 'تغذيتك متوازنة' : 'Balanced nutrition' });
            } else if (data.nutrition.avgCalories >= 1500) {
                score += 8;
                factors.push({ name: 'nutrition', points: 8, message: isArabic ? 'تغذيتك جيدة' : 'Good nutrition' });
            }
        }
        
        // العادات (20 نقطة)
        if (data.habits) {
            if (data.habits.completionRate >= 80) {
                score += 20;
                factors.push({ name: 'habits', points: 20, message: isArabic ? 'التزام ممتاز بعاداتك' : 'Excellent habit adherence' });
            } else if (data.habits.completionRate >= 60) {
                score += 12;
                factors.push({ name: 'habits', points: 12, message: isArabic ? 'التزام جيد بعاداتك' : 'Good habit adherence' });
            }
        }
        
        const finalScore = Math.min(100, Math.max(0, Math.round(score)));
        
        let statusText = '';
        let statusIcon = '';
        if (finalScore >= 80) {
            statusText = isArabic ? 'ممتازة' : 'Excellent';
            statusIcon = '🌟';
        } else if (finalScore >= 60) {
            statusText = isArabic ? 'جيدة' : 'Good';
            statusIcon = '👍';
        } else if (finalScore >= 40) {
            statusText = isArabic ? 'متوسطة' : 'Fair';
            statusIcon = '📈';
        } else {
            statusText = isArabic ? 'تحتاج تحسيناً' : 'Needs improvement';
            statusIcon = '⚠️';
        }
        
        return {
            score: finalScore,
            status: statusText,
            statusIcon,
            factors: factors.slice(0, 4),
            maxScore: 100
        };
    };

    // ✅ حساب العلاقات مع تفسير واضح
    const calculateCorrelations = (rawData) => {
        const correlations = [];
        
        // ربط النوم بالمزاج
        if (rawData.sleep.length >= 3 && rawData.mood.length >= 3) {
            const sleepData = [];
            const moodData = [];
            
            rawData.sleep.forEach(sleep => {
                const sleepDate = new Date(sleep.sleep_start || sleep.start_time).toDateString();
                const moodOnSameDay = rawData.mood.find(m => 
                    new Date(m.entry_time).toDateString() === sleepDate
                );
                
                if (moodOnSameDay) {
                    const hours = (new Date(sleep.sleep_end || sleep.end_time) - new Date(sleep.sleep_start || sleep.start_time)) / (1000 * 60 * 60);
                    if (hours > 0 && hours <= 24) {
                        sleepData.push(hours);
                        const moodMap = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
                        moodData.push(moodMap[moodOnSameDay.mood] || 3);
                    }
                }
            });
            
            if (sleepData.length >= 3) {
                const correlation = calculateCorrelation(sleepData, moodData);
                const absCorr = Math.abs(correlation);
                
                if (absCorr > 0.2) {
                    let strengthText = '';
                    if (absCorr > 0.7) strengthText = isArabic ? 'قوية جداً' : 'Very strong';
                    else if (absCorr > 0.5) strengthText = isArabic ? 'قوية' : 'Strong';
                    else if (absCorr > 0.3) strengthText = isArabic ? 'متوسطة' : 'Moderate';
                    else strengthText = isArabic ? 'ضعيفة' : 'Weak';
                    
                    correlations.push({
                        type: 'sleep_mood',
                        icon: '😴 ↔️ 😊',
                        title: isArabic ? 'النوم والمزاج' : 'Sleep & Mood',
                        insight: correlation > 0 ? 
                            (isArabic ? 'عندما تنام بشكل أفضل، يميل مزاجك إلى التحسن' : 'When you sleep better, your mood tends to improve') :
                            (isArabic ? 'قلة النوم قد تؤثر سلباً على مزاجك' : 'Lack of sleep may negatively affect your mood'),
                        strengthValue: roundNumber(correlation, 2),
                        strengthText,
                        strengthPercent: Math.min(95, Math.max(5, Math.round(absCorr * 100))),
                        sampleSize: sleepData.length
                    });
                }
            }
        }
        
        return correlations;
    };

    // ✅ توليد توصيات بسيطة ومحتملة
    const generateRecommendations = (data, rawData) => {
        const recommendations = [];
        
        // توصيات النوم
        if (data.sleep && data.sleep.avgHours < 7 && data.sleep.avgHours > 0) {
            recommendations.push({
                id: 'sleep-more',
                icon: '😴',
                category: isArabic ? 'النوم' : 'Sleep',
                priority: data.sleep.avgHours < 6 ? 'high' : 'medium',
                title: isArabic ? 'تحسين جودة النوم' : 'Improve sleep quality',
                message: isArabic 
                    ? `متوسط نومك ${data.sleep.avgHours} ساعات في الليلة`
                    : `You average ${data.sleep.avgHours} hours of sleep per night`,
                advice: isArabic 
                    ? `الحصول على 7-8 ساعات نوم قد يساعد في تحسين طاقتك وتركيزك`
                    : `Getting 7-8 hours of sleep may help improve your energy and focus`,
                actions: [
                    isArabic ? 'محاولة النوم قبل الساعة 11 مساءً' : 'Try to sleep before 11 PM',
                    isArabic ? 'تقليل استخدام الشاشات قبل النوم بساعة' : 'Reduce screen time one hour before bed',
                    isArabic ? 'الحفاظ على غرفة نوم مظلمة وهادئة' : 'Keep your bedroom dark and quiet'
                ],
                basedOn: isArabic ? `بناءً على تحليل ${data.sleep.totalDays} ليلة` : `Based on analysis of ${data.sleep.totalDays} nights`
            });
        }
        
        // توصيات النشاط
        if (data.activity && data.activity.weeklyMinutes < 150 && data.activity.weeklyMinutes > 0) {
            recommendations.push({
                id: 'activity-more',
                icon: '🏃',
                category: isArabic ? 'النشاط البدني' : 'Physical Activity',
                priority: 'medium',
                title: isArabic ? 'زيادة النشاط البدني تدريجياً' : 'Gradually increase physical activity',
                message: isArabic 
                    ? `سجلت ${data.activity.weeklyMinutes} دقيقة نشاط هذا الأسبوع`
                    : `You recorded ${data.activity.weeklyMinutes} minutes of activity this week`,
                advice: isArabic 
                    ? `ممارسة 150 دقيقة من النشاط المعتدل أسبوعياً قد يحسن لياقتك وصحتك العامة`
                    : `Getting 150 minutes of moderate activity weekly may improve your fitness and overall health`,
                actions: [
                    isArabic ? 'المشي 20 دقيقة يومياً' : 'Walk 20 minutes daily',
                    isArabic ? 'استخدام الدرج بدلاً من المصعد' : 'Use stairs instead of elevator',
                    isArabic ? 'الوقوف والتحرك كل ساعة' : 'Stand and move every hour'
                ],
                basedOn: isArabic ? 'الموصى به: 150 دقيقة أسبوعياً' : 'Recommended: 150 minutes weekly'
            });
        }
        
        // توصيات الأدوية
        if (data.habits && data.habits.medTotal > 0 && data.habits.medicationAdherence < 80) {
            recommendations.push({
                id: 'medication-adherence',
                icon: '💊',
                category: isArabic ? 'الأدوية' : 'Medications',
                priority: data.habits.medicationAdherence < 60 ? 'high' : 'medium',
                title: isArabic ? 'تنظيم مواعيد الأدوية' : 'Organize medication schedule',
                message: isArabic 
                    ? `التزامك الحالي ${data.habits.medicationAdherence}%`
                    : `Your current adherence is ${data.habits.medicationAdherence}%`,
                advice: isArabic 
                    ? `الالتزام بمواعيد الأدوية قد يساعد في تحسين فعالية العلاج`
                    : `Following medication schedules may help improve treatment effectiveness`,
                actions: [
                    isArabic ? 'استخدام تطبيق تذكير للأدوية' : 'Use a medication reminder app',
                    isArabic ? 'وضع الأدوية في مكان واضح' : 'Place medications in a visible spot',
                    isArabic ? 'تسجيل الجرعات فور تناولها' : 'Log doses immediately after taking'
                ],
                basedOn: isArabic ? `بناءً على آخر ${data.habits.medTotal} جرعة` : `Based on last ${data.habits.medTotal} doses`
            });
        }
        
        return recommendations;
    };

    // ✅ توليد توقعات تقريبية (غير قطعية)
    const generatePredictions = (data) => {
        const predictions = [];
        
        // تنبؤ الوزن (تقديري)
        if (data.health && data.health.weight) {
            predictions.push({
                icon: '⚖️',
                label: isArabic ? 'الوزن المتوقع' : 'Estimated weight',
                value: `${data.health.weight} kg`,
                trend: 'stable',
                note: isArabic ? 'تقدير يعتمد على قراءاتك الحالية' : 'Estimate based on your current readings'
            });
        }
        
        // تنبؤ النوم (تقديري)
        if (data.sleep && data.sleep.avgHours > 0 && data.sleep.avgHours < 7) {
            predictions.push({
                icon: '🌙',
                label: isArabic ? 'تحسن النوم المتوقع' : 'Expected sleep improvement',
                value: `${Math.min(8, Math.round(data.sleep.avgHours + 0.5))} ${isArabic ? 'ساعات' : 'hours'}`,
                trend: 'up',
                note: isArabic ? 'مع تطبيق نصائح تحسين النوم' : 'With sleep improvement tips'
            });
        }
        
        return predictions;
    };

    if (loading) {
        return (
            <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}</p>
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
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
            <div className="recommendations-header">
                <h2>{isArabic ? 'تحليل صحتك' : 'Health Analysis'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* تبويبات منظمة */}
            <div className="analytics-tabs">
                <button 
                    className={activeTab === 'analysis' ? 'active' : ''}
                    onClick={() => setActiveTab('analysis')}
                >
                    📊 {isArabic ? 'التحليل' : 'Analysis'}
                </button>
                <button 
                    className={activeTab === 'recommendations' ? 'active' : ''}
                    onClick={() => setActiveTab('recommendations')}
                >
                    💡 {isArabic ? 'توصيات' : 'Recommendations'}
                </button>
                <button 
                    className={activeTab === 'predictions' ? 'active' : ''}
                    onClick={() => setActiveTab('predictions')}
                >
                    🔮 {isArabic ? 'توقعات' : 'Predictions'}
                </button>
            </div>

            {/* تبويب التحليل */}
            {activeTab === 'analysis' && (
                <div className="tab-content">
                    {/* درجة الصحة مع تفسير */}
                    {healthScore && (
                        <div className="health-score-card">
                            <div className="score-header">
                                <span className="score-icon">📊</span>
                                <span className="score-title">{isArabic ? 'درجة صحتك' : 'Your Health Score'}</span>
                                <span className="score-value">
                                    {healthScore.score}/{healthScore.maxScore}
                                </span>
                                <span className={`score-badge score-${healthScore.score >= 70 ? 'good' : healthScore.score >= 40 ? 'fair' : 'poor'}`}>
                                    {healthScore.statusIcon} {healthScore.status}
                                </span>
                            </div>
                            <div className="score-progress">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${healthScore.score}%` }} />
                                </div>
                            </div>
                            
                            {/* ✅ شرح طريقة الحساب */}
                            <div className="score-explanation">
                                <details>
                                    <summary>{isArabic ? '📖 كيف تم حساب هذه الدرجة؟' : '📖 How is this score calculated?'}</summary>
                                    <div className="explanation-content">
                                        <p>{isArabic 
                                            ? 'تعتمد الدرجة على عدة عوامل وزنها كالتالي:' 
                                            : 'The score is based on several weighted factors:'}
                                        </p>
                                        <ul>
                                            <li>{isArabic ? '😴 جودة النوم: 25 نقطة' : '😴 Sleep quality: 25 points'}</li>
                                            <li>{isArabic ? '😊 الحالة المزاجية: 20 نقطة' : '😊 Mood: 20 points'}</li>
                                            <li>{isArabic ? '🏃 النشاط البدني: 20 نقطة' : '🏃 Physical activity: 20 points'}</li>
                                            <li>{isArabic ? '🥗 التغذية: 15 نقطة' : '🥗 Nutrition: 15 points'}</li>
                                            <li>{isArabic ? '📋 الالتزام بالعادات: 20 نقطة' : '📋 Habit adherence: 20 points'}</li>
                                        </ul>
                                        {healthScore.factors.length > 0 && (
                                            <div className="score-factors">
                                                <strong>{isArabic ? 'مساهماتك الحالية:' : 'Your current contributions:'}</strong>
                                                {healthScore.factors.map((f, i) => (
                                                    <div key={i} className="factor-item">
                                                        <span>{f.message}</span>
                                                        <span className={`factor-points ${f.points > 0 ? 'positive' : f.points < 0 ? 'negative' : ''}`}>
                                                            {f.points > 0 ? `+${f.points}` : f.points}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {/* العلاقات مع تفسير */}
                    {correlations.length > 0 && (
                        <div className="correlations-section">
                            <h3>{isArabic ? 'علاقات ملحوظة في بياناتك' : 'Notable correlations in your data'}</h3>
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
                                                <span className="strength-value">
                                                    {isArabic ? 'قوة العلاقة' : 'Correlation strength'}: {corr.strengthText} ({corr.strengthValue})
                                                </span>
                                            </div>
                                            <div className="correlation-meta">
                                                📊 {isArabic ? `بناءً على ${corr.sampleSize} يوم` : `Based on ${corr.sampleSize} days`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* الطقس */}
                    {weather && (
                        <div className="weather-card">
                            <div className="weather-header">
                                <span className="weather-icon">🌤️</span>
                                <span className="weather-location">📍 {weather.city || (isArabic ? 'موقعك' : 'Your location')}</span>
                            </div>
                            <div className="weather-info">
                                <div className="weather-temp">{Math.round(weather.temperature)}°C</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* تبويب التوصيات */}
            {activeTab === 'recommendations' && (
                <div className="tab-content">
                    {recommendations.length > 0 ? (
                        <div className="recommendations-grid">
                            {recommendations.map((rec) => (
                                <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                                    <div className="card-header">
                                        <span className="card-icon">{rec.icon}</span>
                                        <span className="card-category">{rec.category}</span>
                                    </div>
                                    <h3 className="card-title">{rec.title}</h3>
                                    <p className="card-message">{rec.message}</p>
                                    <div className="card-advice">
                                        <strong>💡 {isArabic ? 'اقتراح' : 'Suggestion'}:</strong> {rec.advice}
                                    </div>
                                    {rec.actions && rec.actions.length > 0 && (
                                        <div className="card-actions">
                                            <strong>📋 {isArabic ? 'خطوات بسيطة' : 'Simple steps'}:</strong>
                                            <ul>
                                                {rec.actions.map((action, i) => (
                                                    <li key={i}>{action}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="card-basedon">
                                        <small>{rec.basedOn}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-recommendations">
                            <p>{isArabic ? 'لا توجد توصيات محددة حالياً' : 'No specific recommendations at this time'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توصيات مخصصة' : 'Log more data to get personalized recommendations'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* تبويب التوقعات */}
            {activeTab === 'predictions' && (
                <div className="tab-content">
                    {predictions && predictions.length > 0 ? (
                        <>
                            <div className="predictions-grid">
                                {predictions.map((pred, idx) => (
                                    <div key={idx} className="prediction-card">
                                        <div className="prediction-icon">{pred.icon}</div>
                                        <div className="prediction-content">
                                            <div className="prediction-label">{pred.label}</div>
                                            <div className="prediction-value">{pred.value}</div>
                                            <div className={`prediction-trend ${pred.trend}`}>
                                                {pred.trend === 'up' ? '🔼' : pred.trend === 'down' ? '🔽' : '➡️'}
                                            </div>
                                        </div>
                                        {pred.note && <div className="prediction-note">ℹ️ {pred.note}</div>}
                                    </div>
                                ))}
                            </div>
                            <div className="predictions-disclaimer">
                                <small>
                                    ⚠️ {isArabic 
                                        ? '* هذه توقعات تقديرية وليست تشخيصاً طبياً. تعتمد على بياناتك المسجلة وقد تختلف النتائج الفعلية.'
                                        : '* These are estimates, not medical diagnoses. Based on your logged data; actual results may vary.'}
                                </small>
                            </div>
                        </>
                    ) : (
                        <div className="no-predictions">
                            <p>{isArabic ? 'لا توجد توقعات متاحة حالياً' : 'No predictions available'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توقعات' : 'Log more data to get predictions'}</p>
                        </div>
                    )}
                </div>
            )}

            {lastUpdate && (
                <div className="recommendations-footer">
                    <small>🕒 {isArabic ? 'آخر تحديث' : 'Last update'}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</small>
                </div>
            )}
                        <style jsx>{`
/* ===========================================
   SmartRecommendations.css - الأنماط الداخلية فقط
   ✅ توصيات وتحليلات ذكية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.smart-recommendations {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
}

.smart-recommendations.dark-mode {
    background: #1e293b;
    border-color: #334155;
}

/* ===== الرأس ===== */
.recommendations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .recommendations-header {
    border-bottom-color: #334155;
}

.recommendations-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #10b981, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .recommendations-header h2 {
    background: linear-gradient(135deg, #34d399, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.refresh-btn:hover {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    transform: rotate(180deg);
    border-color: transparent;
}

/* ===== التبويبات ===== */
.analytics-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 50px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-tabs {
    background: #0f172a;
    border-color: #334155;
}

.analytics-tabs button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .analytics-tabs button {
    color: #94a3b8;
}

.analytics-tabs button:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-1px);
}

.dark-mode .analytics-tabs button:hover {
    background: #334155;
}

.analytics-tabs button.active {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.analytics-tabs button.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ===== محتوى التبويبات ===== */
.tab-content {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== بطاقة درجة الصحة ===== */
.health-score-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .health-score-card {
    background: linear-gradient(135deg, #0f172a, #1e1b4b);
}

.score-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.score-icon {
    font-size: 1.5rem;
}

.score-title {
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
}

.score-value {
    font-size: 1.5rem;
    font-weight: 800;
    margin-left: auto;
}

.score-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.score-badge.score-good {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.score-badge.score-fair {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
}

.score-badge.score-poor {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.score-progress {
    margin-bottom: 1rem;
}

.score-progress .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
}

.score-progress .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    border-radius: 4px;
    transition: width 0.5s ease;
}

/* ===== شرح طريقة الحساب ===== */
.score-explanation {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.score-explanation details {
    cursor: pointer;
}

.score-explanation summary {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
}

.score-explanation summary:hover {
    color: white;
}

.explanation-content {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
}

.explanation-content p {
    font-size: 0.75rem;
    margin: 0 0 0.5rem 0;
}

.explanation-content ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
}

[dir="rtl"] .explanation-content ul {
    padding-left: 0;
    padding-right: 1.25rem;
}

.explanation-content li {
    font-size: 0.7rem;
    margin-bottom: 0.25rem;
}

.score-factors {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.score-factors strong {
    font-size: 0.75rem;
    display: block;
    margin-bottom: 0.5rem;
}

.factor-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    padding: 0.25rem 0;
}

.factor-points {
    font-weight: 600;
}

.factor-points.positive {
    color: #10b981;
}

.factor-points.negative {
    color: #ef4444;
}

/* ===== قسم العلاقات ===== */
.correlations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlations-section {
    background: #0f172a;
    border-color: #334155;
}

.correlations-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlations-section h3 {
    color: #f1f5f9;
}

.correlations-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.correlation-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlation-card {
    background: #1e293b;
    border-color: #475569;
}

.correlation-icon {
    font-size: 2rem;
}

.correlation-content {
    flex: 1;
}

.correlation-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlation-content h4 {
    color: #f1f5f9;
}

.correlation-insight {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.75rem;
    line-height: 1.4;
}

.correlation-strength {
    margin-bottom: 0.5rem;
}

.strength-bar {
    height: 4px;
    background: var(--border-light, #e2e8f0);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
}

.dark-mode .strength-bar {
    background: #334155;
}

.strength-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    border-radius: 2px;
}

.strength-value {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.correlation-meta {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== بطاقة الطقس ===== */
.weather-card {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 20px;
    padding: 1rem;
    color: white;
}

.weather-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.weather-icon {
    font-size: 1.5rem;
}

.weather-location {
    font-size: 0.8rem;
    opacity: 0.9;
}

.weather-info {
    display: flex;
    align-items: center;
    justify-content: center;
}

.weather-temp {
    font-size: 2rem;
    font-weight: 700;
}

/* ===== توصيات ===== */
.recommendations-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.recommendation-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
    border-left: 4px solid;
}

.dark-mode .recommendation-card {
    background: #0f172a;
    border-color: #334155;
}

.recommendation-card.priority-high {
    border-left-color: #ef4444;
}

.recommendation-card.priority-medium {
    border-left-color: #f59e0b;
}

.recommendation-card.priority-low {
    border-left-color: #10b981;
}

[dir="rtl"] .recommendation-card {
    border-left: 1px solid;
    border-right: 4px solid;
}

[dir="rtl"] .recommendation-card.priority-high {
    border-right-color: #ef4444;
}

[dir="rtl"] .recommendation-card.priority-medium {
    border-right-color: #f59e0b;
}

[dir="rtl"] .recommendation-card.priority-low {
    border-right-color: #10b981;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.card-icon {
    font-size: 1.3rem;
}

.card-category {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 20px;
    color: var(--text-secondary, #64748b);
}

.dark-mode .card-category {
    background: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

.card-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .card-title {
    color: #f1f5f9;
}

.card-message {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.75rem;
}

.card-advice {
    background: var(--card-bg, #ffffff);
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    color: var(--text-primary, #0f172a);
    margin-bottom: 0.75rem;
}

.dark-mode .card-advice {
    background: #1e293b;
    color: #f1f5f9;
}

.card-advice strong {
    color: #10b981;
}

.card-actions {
    margin-bottom: 0.75rem;
}

.card-actions strong {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.card-actions ul {
    margin: 0.5rem 0 0 1.25rem;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .card-actions ul {
    margin: 0.5rem 1.25rem 0 0;
}

.card-actions li {
    margin-bottom: 0.25rem;
}

.card-basedon {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .card-basedon {
    border-top-color: #334155;
}

/* ===== حالات عدم وجود بيانات ===== */
.no-recommendations,
.no-predictions {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .no-recommendations,
.dark-mode .no-predictions {
    background: #0f172a;
    border-color: #334155;
}

.hint {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin-top: 0.5rem;
}

/* ===== توقعات ===== */
.predictions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.prediction-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 16px;
    border: 1px solid var(--border-light, #e2e8f0);
    position: relative;
    flex-wrap: wrap;
}

.dark-mode .prediction-card {
    background: #0f172a;
    border-color: #334155;
}

.prediction-icon {
    font-size: 1.8rem;
}

.prediction-content {
    flex: 1;
}

.prediction-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.prediction-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .prediction-value {
    color: #f1f5f9;
}

.prediction-trend {
    font-size: 1rem;
}

.prediction-trend.up {
    color: #10b981;
}

.prediction-trend.down {
    color: #ef4444;
}

.prediction-trend.stable {
    color: #f59e0b;
}

.prediction-note {
    width: 100%;
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .prediction-note {
    border-top-color: #334155;
}

.predictions-disclaimer {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(245, 158, 11, 0.08);
    border-radius: 12px;
    text-align: center;
    border-left: 3px solid #f59e0b;
}

[dir="rtl"] .predictions-disclaimer {
    border-left: none;
    border-right: 3px solid #f59e0b;
}

.predictions-disclaimer small {
    font-size: 0.65rem;
    color: #f59e0b;
}

/* ===== تذييل ===== */
.recommendations-footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    text-align: center;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-footer {
    border-top-color: #334155;
}

.recommendations-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== حالات التحميل والخطأ ===== */
.loading-container,
.error-container {
    text-align: center;
    padding: 3rem;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #10b981;
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
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ===== دعم RTL ===== */
[dir="rtl"] .score-header .score-value {
    margin-left: 0;
    margin-right: auto;
}

[dir="rtl"] .correlation-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .prediction-card {
    flex-direction: row-reverse;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .tab-content {
        animation: none;
    }
    
    .score-progress .progress-fill {
        transition: none;
    }
    
    .refresh-btn:hover,
    .analytics-tabs button:hover,
    .retry-btn:hover {
        transform: none;
    }
}
            `}</style>


        </div>
    );
};

export default SmartRecommendations;