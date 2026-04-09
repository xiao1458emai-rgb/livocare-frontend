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
    const [weather, setWeather] = useState(null);
    const [predictions, setPredictions] = useState(null);

    const isArabic = i18n.language.startsWith('ar');

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30 * 60 * 1000); // كل 30 دقيقة
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
                weatherRes
            ] = await Promise.all([
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/weather/').catch(() => ({ data: null }))
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
                language: i18n.language
            };

            // تحليل البيانات الحقيقية فقط
            const analyzedData = analyzeAllData(allData);
            
            // حساب درجة الصحة من البيانات الحقيقية
            const score = calculateRealHealthScore(analyzedData);
            setHealthScore(score);
            
            // حساب العلاقات الحقيقية
            const correlationsData = calculateRealCorrelations(allData);
            setCorrelations(correlationsData);
            
            // توليد التوصيات من البيانات الحقيقية
            const smartRecs = generateRealRecommendations(analyzedData, allData);
            setRecommendations(smartRecs);
            
            // توليد التنبؤات
            const preds = generateRealPredictions(analyzedData);
            setPredictions(preds);
            
            // الطقس
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
        // تحليل النوم - بيانات حقيقية فقط
        const sleep = analyzeRealSleepData(rawData.sleep);
        
        // تحليل المزاج
        const mood = analyzeRealMoodData(rawData.mood);
        
        // تحليل النشاط
        const activity = analyzeRealActivityData(rawData.activities);
        
        // تحليل التغذية
        const nutrition = analyzeRealNutritionData(rawData.meals);
        
        // تحليل العادات
        const habits = analyzeRealHabitsData(rawData.habits, rawData.habitDefinitions);
        
        // تحليل الصحة
        const health = analyzeRealHealthData(rawData.health);
        
        return { sleep, mood, activity, nutrition, habits, health };
    };

    const analyzeRealSleepData = (sleep) => {
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
            lastHours: validSleep[0]?.hours || 0,
            lastQuality: validSleep[0]?.quality || 3,
            totalDays: validSleep.length,
            records: validSleep
        };
    };

    const analyzeRealMoodData = (mood) => {
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
            lastScore: getScore(validMood[0]),
            totalDays: validMood.length,
            records: validMood
        };
    };

    const analyzeRealActivityData = (activities) => {
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

    const analyzeRealNutritionData = (meals) => {
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

    const analyzeRealHabitsData = (habits, definitions) => {
        if (!habits || habits.length === 0) return null;
        
        const today = new Date().toDateString();
        const todayHabits = habits.filter(h => {
            const habitDate = new Date(h.log_date || h.date).toDateString();
            return habitDate === today;
        });
        
        const completed = todayHabits.filter(h => h.is_completed).length;
        const total = todayHabits.length;
        
        // حساب نسبة الالتزام للأدوية
        const medHabits = definitions.filter(d => 
            d.name?.toLowerCase().includes('دواء') || 
            d.name?.toLowerCase().includes('medication') ||
            d.description?.toLowerCase().includes('دواء')
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

    const analyzeRealHealthData = (health) => {
        if (!health || health.length === 0) return null;
        
        const latest = health[0];
        const weight = latest.weight_kg ? parseFloat(latest.weight_kg) : null;
        
        // حساب مؤشر كتلة الجسم إذا كان الطول متوفراً
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

    const calculateRealHealthScore = (data) => {
        let score = 50;
        const factors = [];
        
        // النوم (25 نقطة)
        if (data.sleep) {
            if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) {
                score += 25;
                factors.push({ name: 'sleep', impact: '+25', message: isArabic ? 'نوم مثالي' : 'Ideal sleep' });
            } else if (data.sleep.avgHours >= 6) {
                score += 15;
                factors.push({ name: 'sleep', impact: '+15', message: isArabic ? 'نوم جيد' : 'Good sleep' });
            } else if (data.sleep.avgHours >= 5) {
                score += 5;
                factors.push({ name: 'sleep', impact: '+5', message: isArabic ? 'نوم مقبول' : 'Fair sleep' });
            } else if (data.sleep.avgHours > 0) {
                score -= 10;
                factors.push({ name: 'sleep', impact: '-10', message: isArabic ? 'قلة نوم' : 'Poor sleep' });
            }
        }
        
        // المزاج (20 نقطة)
        if (data.mood) {
            if (data.mood.avg >= 4) {
                score += 20;
                factors.push({ name: 'mood', impact: '+20', message: isArabic ? 'مزاج ممتاز' : 'Excellent mood' });
            } else if (data.mood.avg >= 3) {
                score += 10;
                factors.push({ name: 'mood', impact: '+10', message: isArabic ? 'مزاج جيد' : 'Good mood' });
            } else if (data.mood.avg >= 2) {
                score += 0;
                factors.push({ name: 'mood', impact: '0', message: isArabic ? 'مزاج متوسط' : 'Fair mood' });
            } else if (data.mood.avg > 0) {
                score -= 10;
                factors.push({ name: 'mood', impact: '-10', message: isArabic ? 'مزاج منخفض' : 'Low mood' });
            }
        }
        
        // النشاط (20 نقطة)
        if (data.activity) {
            if (data.activity.weeklyMinutes >= 150) {
                score += 20;
                factors.push({ name: 'activity', impact: '+20', message: isArabic ? 'نشاط ممتاز' : 'Excellent activity' });
            } else if (data.activity.weeklyMinutes >= 100) {
                score += 12;
                factors.push({ name: 'activity', impact: '+12', message: isArabic ? 'نشاط جيد' : 'Good activity' });
            } else if (data.activity.weeklyMinutes >= 50) {
                score += 5;
                factors.push({ name: 'activity', impact: '+5', message: isArabic ? 'نشاط مقبول' : 'Fair activity' });
            } else if (data.activity.weeklyMinutes > 0) {
                score -= 5;
                factors.push({ name: 'activity', impact: '-5', message: isArabic ? 'قلة نشاط' : 'Low activity' });
            }
        }
        
        // التغذية (15 نقطة)
        if (data.nutrition && data.nutrition.avgCalories > 0) {
            if (data.nutrition.avgCalories >= 1800 && data.nutrition.avgCalories <= 2200) {
                score += 15;
                factors.push({ name: 'nutrition', impact: '+15', message: isArabic ? 'تغذية متوازنة' : 'Balanced diet' });
            } else if (data.nutrition.avgCalories >= 1500) {
                score += 8;
                factors.push({ name: 'nutrition', impact: '+8', message: isArabic ? 'تغذية جيدة' : 'Good diet' });
            } else if (data.nutrition.avgCalories > 0) {
                score += 0;
                factors.push({ name: 'nutrition', impact: '0', message: isArabic ? 'تغذية تحتاج تحسين' : 'Diet needs improvement' });
            }
        }
        
        // العادات (20 نقطة)
        if (data.habits) {
            if (data.habits.completionRate >= 80) {
                score += 20;
                factors.push({ name: 'habits', impact: '+20', message: isArabic ? 'التزام ممتاز' : 'Excellent commitment' });
            } else if (data.habits.completionRate >= 60) {
                score += 12;
                factors.push({ name: 'habits', impact: '+12', message: isArabic ? 'التزام جيد' : 'Good commitment' });
            } else if (data.habits.completionRate >= 40) {
                score += 5;
                factors.push({ name: 'habits', impact: '+5', message: isArabic ? 'التزام مقبول' : 'Fair commitment' });
            } else if (data.habits.total > 0) {
                score -= 5;
                factors.push({ name: 'habits', impact: '-5', message: isArabic ? 'تحتاج تنظيم عاداتك' : 'Need to organize habits' });
            }
        }
        
        return {
            score: Math.min(100, Math.max(0, Math.round(score))),
            grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'E',
            factors: factors.slice(0, 4)
        };
    };

    const calculateRealCorrelations = (rawData) => {
        const correlations = [];
        
        // ربط النوم بالمزاج
        if (rawData.sleep.length >= 3 && rawData.mood.length >= 3) {
            const sleepData = [];
            const moodData = [];
            
            // محاذاة البيانات حسب التاريخ
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
                    correlations.push({
                        type: 'sleep_mood',
                        icon: '😴 ↔️ 😊',
                        title: isArabic ? 'النوم والمزاج' : 'Sleep & Mood',
                        insight: correlation > 0 ? 
                            (isArabic ? 'عندما تنام أكثر، يتحسن مزاجك' : 'Better sleep leads to better mood') :
                            (isArabic ? 'قلة النوم تؤثر سلباً على مزاجك' : 'Poor sleep affects your mood negatively'),
                        strength: correlation,
                        strengthPercent: Math.min(95, Math.max(5, Math.round(absCorr * 100))),
                        sampleSize: sleepData.length
                    });
                }
            }
        }
        
        // ربط العادات بالصحة
        if (rawData.habits.length >= 3 && rawData.health.length >= 3) {
            const habitCompletion = [];
            const healthScores = [];
            
            rawData.habits.forEach(habit => {
                const habitDate = new Date(habit.log_date || habit.date).toDateString();
                const healthOnSameDay = rawData.health.find(h => 
                    new Date(h.recorded_at).toDateString() === habitDate
                );
                
                if (healthOnSameDay && healthOnSameDay.weight_kg) {
                    habitCompletion.push(habit.is_completed ? 1 : 0);
                    healthScores.push(parseFloat(healthOnSameDay.weight_kg));
                }
            });
            
            if (habitCompletion.length >= 3) {
                const correlation = calculateCorrelation(habitCompletion, healthScores);
                const absCorr = Math.abs(correlation);
                
                if (absCorr > 0.2) {
                    correlations.push({
                        type: 'habits_health',
                        icon: '💊 ↔️ ⚖️',
                        title: isArabic ? 'العادات والوزن' : 'Habits & Weight',
                        insight: correlation < 0 ?
                            (isArabic ? 'الالتزام بالعادات يساعد في التحكم بالوزن' : 'Following habits helps with weight management') :
                            (isArabic ? 'عاداتك تؤثر على صحتك' : 'Your habits affect your health'),
                        strength: -Math.abs(correlation),
                        strengthPercent: Math.min(95, Math.max(5, Math.round(absCorr * 100))),
                        sampleSize: habitCompletion.length
                    });
                }
            }
        }
        
        return correlations;
    };

    const generateRealRecommendations = (data, rawData) => {
        const recommendations = [];
        
        // توصيات النوم
        if (data.sleep && data.sleep.avgHours < 7 && data.sleep.avgHours > 0) {
            recommendations.push({
                id: 'sleep-more',
                icon: '😴',
                category: isArabic ? 'النوم' : 'Sleep',
                priority: data.sleep.avgHours < 6 ? 'high' : 'medium',
                title: isArabic ? 'حسّن نومك' : 'Improve your sleep',
                message: isArabic 
                    ? `متوسط نومك ${data.sleep.avgHours} ساعات يومياً`
                    : `Your average sleep is ${data.sleep.avgHours} hours per day`,
                advice: isArabic 
                    ? `حاول النوم ${Math.round(8 - data.sleep.avgHours)} ساعات إضافية`
                    : `Try to sleep ${Math.round(8 - data.sleep.avgHours)} more hours`,
                actions: [
                    isArabic ? '🌙 نام قبل الساعة 11 مساءً' : '🌙 Sleep before 11 PM',
                    isArabic ? '📱 تجنب الشاشات قبل النوم بساعة' : '📱 Avoid screens 1 hour before bed',
                    isArabic ? '🕯️ اجعل غرفة النوم مظلمة وهادئة' : '🕯️ Keep bedroom dark and quiet',
                    isArabic ? '🧘 مارس تمارين الاسترخاء' : '🧘 Practice relaxation exercises'
                ],
                basedOn: isArabic ? `بناءً على آخر ${data.sleep.totalDays} يوم` : `Based on last ${data.sleep.totalDays} days`
            });
        }
        
        // توصيات النشاط
        if (data.activity && data.activity.weeklyMinutes < 150 && data.activity.weeklyMinutes > 0) {
            const remaining = 150 - data.activity.weeklyMinutes;
            recommendations.push({
                id: 'activity-more',
                icon: '🏃',
                category: isArabic ? 'النشاط' : 'Activity',
                priority: 'high',
                title: isArabic ? 'زد نشاطك البدني' : 'Increase physical activity',
                message: isArabic 
                    ? `${data.activity.weeklyMinutes} دقيقة هذا الأسبوع`
                    : `${data.activity.weeklyMinutes} minutes this week`,
                advice: isArabic 
                    ? `تحتاج ${remaining} دقيقة إضافية لتحقيق الهدف الأسبوعي`
                    : `Need ${remaining} more minutes to reach weekly goal`,
                actions: [
                    isArabic ? '🚶 مشي 20 دقيقة يومياً' : '🚶 Walk 20 minutes daily',
                    isArabic ? '🧘 تمارين منزلية 10 دقائق' : '🧘 10 minutes home exercise',
                    isArabic ? '🚴 ركوب الدراجة' : '🚴 Cycling',
                    isArabic ? '🏊 السباحة مرتين أسبوعياً' : '🏊 Swim twice a week'
                ],
                basedOn: isArabic ? 'الهدف: 150 دقيقة أسبوعياً' : 'Goal: 150 minutes weekly'
            });
        }
        
        // توصيات الالتزام بالأدوية
        if (data.habits && data.habits.medicationAdherence < 80 && data.habits.medTotal > 0) {
            recommendations.push({
                id: 'medication-adherence',
                icon: '💊',
                category: isArabic ? 'الأدوية' : 'Medications',
                priority: data.habits.medicationAdherence < 60 ? 'urgent' : 'high',
                title: isArabic ? 'التزم بأدويتك' : 'Medication adherence',
                message: isArabic 
                    ? `التزامك بالأدوية ${data.habits.medicationAdherence}%`
                    : `Your medication adherence is ${data.habits.medicationAdherence}%`,
                advice: isArabic 
                    ? 'حافظ على انتظام جرعات الدواء'
                    : 'Maintain regular medication doses',
                actions: [
                    isArabic ? '🔔 اضبط تذكيراً يومياً' : '🔔 Set a daily reminder',
                    isArabic ? '📅 استخدم علبة أدوية أسبوعية' : '📅 Use a weekly pill organizer',
                    isArabic ? '📝 سجل جرعاتك فور تناولها' : '📝 Log doses immediately after taking',
                    isArabic ? '👨‍⚕️ استشر طبيبك عن أي صعوبات' : '👨‍⚕️ Consult your doctor about difficulties'
                ],
                basedOn: isArabic ? `بناءً على آخر ${data.habits.medTotal} جرعة` : `Based on last ${data.habits.medTotal} doses`
            });
        }
        
        // توصيات الوزن
        if (data.health && data.health.bmi) {
            if (data.health.bmi > 30) {
                recommendations.push({
                    id: 'weight-high',
                    icon: '⚖️',
                    category: isArabic ? 'الصحة' : 'Health',
                    priority: 'high',
                    title: isArabic ? 'تحسين الوزن' : 'Improve weight',
                    message: isArabic 
                        ? `مؤشر كتلة الجسم ${data.health.bmi}`
                        : `BMI is ${data.health.bmi}`,
                    advice: isArabic 
                        ? 'فقدان 0.5-1 كجم أسبوعياً'
                        : 'Lose 0.5-1 kg weekly',
                    actions: [
                        isArabic ? '🥗 قلل السعرات 500 سعرة يومياً' : '🥗 Reduce calories by 500 daily',
                        isArabic ? '🚶 مشي 30 دقيقة يومياً' : '🚶 Walk 30 minutes daily',
                        isArabic ? '💧 اشرب 3 لتر ماء يومياً' : '💧 Drink 3 liters water daily',
                        isArabic ? '🍎 تناول خضروات مع كل وجبة' : '🍎 Eat vegetables with every meal'
                    ],
                    basedOn: isArabic ? 'توصية صحية عامة' : 'General health recommendation'
                });
            } else if (data.health.bmi < 18.5 && data.health.bmi > 0) {
                recommendations.push({
                    id: 'weight-low',
                    icon: '⚖️',
                    category: isArabic ? 'الصحة' : 'Health',
                    priority: 'medium',
                    title: isArabic ? 'زيادة الوزن' : 'Gain weight',
                    message: isArabic 
                        ? `مؤشر كتلة الجسم ${data.health.bmi}`
                        : `BMI is ${data.health.bmi}`,
                    advice: isArabic 
                        ? 'زيادة 0.5-1 كجم شهرياً'
                        : 'Gain 0.5-1 kg monthly',
                    actions: [
                        isArabic ? '🥑 أضف دهون صحية' : '🥑 Add healthy fats',
                        isArabic ? '💪 تمارين تقوية العضلات' : '💪 Strength training',
                        isArabic ? '🍚 زد الكربوهيدرات الصحية' : '🍚 Increase healthy carbs',
                        isArabic ? '🥜 تناول مكسرات يومياً' : '🥜 Eat nuts daily'
                    ],
                    basedOn: isArabic ? 'توصية صحية عامة' : 'General health recommendation'
                });
            }
        }
        
        return recommendations;
    };

    const generateRealPredictions = (data) => {
        const predictions = [];
        
        // تنبؤ الوزن
        if (data.health && data.health.weight) {
            predictions.push({
                icon: '⚖️',
                label: isArabic ? 'الوزن المتوقع' : 'Expected Weight',
                value: `${data.health.weight} kg`,
                trend: 'stable',
                note: isArabic ? 'بناءً على قراءاتك الحالية' : 'Based on your current readings'
            });
        }
        
        // تنبؤ النوم
        if (data.sleep && data.sleep.avgHours > 0) {
            const predictedSleep = Math.min(8, data.sleep.avgHours + 0.5);
            predictions.push({
                icon: '🌙',
                label: isArabic ? 'النوم المتوقع' : 'Expected Sleep',
                value: `${predictedSleep} ${isArabic ? 'ساعات' : 'hours'}`,
                trend: data.sleep.avgHours < 7 ? 'up' : 'stable',
                note: isArabic ? 'مع تطبيق نصائح النوم' : 'With sleep tips applied'
            });
        }
        
        // تنبؤ المزاج
        if (data.mood && data.mood.avg > 0) {
            const predictedMood = Math.min(5, data.mood.avg + 0.3);
            predictions.push({
                icon: '😊',
                label: isArabic ? 'المزاج المتوقع' : 'Expected Mood',
                value: predictedMood >= 4 ? (isArabic ? 'ممتاز' : 'Excellent') : 
                       predictedMood >= 3 ? (isArabic ? 'جيد' : 'Good') : 
                       (isArabic ? 'متوسط' : 'Fair'),
                trend: data.mood.avg < 3.5 ? 'up' : 'stable',
                note: isArabic ? 'مع تحسين النوم والعادات' : 'With improved sleep and habits'
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
                <h2>🧠 {isArabic ? 'تحليلات وتوصيات ذكية' : 'Smart Analytics & Recommendations'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* الطقس */}
            {weather && (
                <div className="weather-card">
                    <div className="weather-header">
                        <span className="weather-icon">🌤️</span>
                        <span className="weather-location">📍 {weather.city || isArabic ? 'موقعك' : 'Your location'}</span>
                        <button onClick={fetchAllData} className="weather-refresh">🔄</button>
                    </div>
                    <div className="weather-info">
                        <div className="weather-temp">{Math.round(weather.temperature)}°C</div>
                        <div className="weather-details">
                            <span>💧 {weather.humidity || '—'}%</span>
                            <span>🌬️ {weather.wind_speed || '—'} km/h</span>
                        </div>
                    </div>
                    {weather.recommendation && (
                        <div className="weather-recommendation">💡 {weather.recommendation}</div>
                    )}
                </div>
            )}

            {/* درجة الصحة */}
            {healthScore && (
                <div className="health-score-card">
                    <div className="score-header">
                        <span className="score-icon">📊</span>
                        <span className="score-title">{isArabic ? 'درجة صحتك الشخصية' : 'Your Health Score'}</span>
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
                    <div className="score-message">
                        {healthScore.score >= 80 ? '🌟 ' : 
                         healthScore.score >= 60 ? '👍 ' : 
                         healthScore.score >= 40 ? '📈 ' : '⚠️ '}
                        {healthScore.score >= 80 ? (isArabic ? 'أحسنت! صحتك ممتازة' : 'Excellent! Your health is great') :
                         healthScore.score >= 60 ? (isArabic ? 'صحتك جيدة، يمكنك التحسن' : 'Good health, you can improve') :
                         healthScore.score >= 40 ? (isArabic ? 'صحتك متوسطة، اتبع التوصيات' : 'Fair health, follow recommendations') :
                         (isArabic ? 'صحتك تحتاج اهتمام، ابدأ بخطوات صغيرة' : 'Your health needs attention, start with small steps')}
                    </div>
                </div>
            )}

            {/* العلاقات المهمة */}
            {correlations.length > 0 && (
                <div className="correlations-section">
                    <h3>🔗 {isArabic ? 'علاقات مهمة في بياناتك' : 'Important correlations in your data'}</h3>
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
                                        📊 {isArabic ? `بناءً على ${corr.sampleSize} يوم` : `Based on ${corr.sampleSize} days`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* خطة متكاملة */}
            <div className="integrated-plan">
                <h3>🎯 {isArabic ? 'خطة متكاملة لتحسين صحتك' : 'Integrated plan to improve your health'}</h3>
                <div className="recommendations-grid">
                    {recommendations.map((rec) => (
                        <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                            <div className="card-header">
                                <span className="card-icon">{rec.icon}</span>
                                <span className="card-category">{rec.category}</span>
                                <span className={`card-priority priority-${rec.priority}`}>
                                    {rec.priority === 'urgent' ? (isArabic ? 'عاجل' : 'Urgent') : 
                                     rec.priority === 'high' ? (isArabic ? 'مهم' : 'Important') : 
                                     rec.priority === 'medium' ? (isArabic ? 'متوسط' : 'Medium') : (isArabic ? 'منخفض' : 'Low')}
                                </span>
                            </div>
                            
                            <h3 className="card-title">{rec.title}</h3>
                            <p className="card-message">{rec.message}</p>
                            
                            <div className="card-advice">
                                <strong>💡 {isArabic ? 'نصيحة' : 'Tip'}:</strong> {rec.advice}
                            </div>
                            
                            {rec.actions && rec.actions.length > 0 && (
                                <div className="card-actions">
                                    <strong>📋 {isArabic ? 'اقتراحات' : 'Suggestions'}:</strong>
                                    <ul>
                                        {rec.actions.map((action, i) => (
                                            <li key={i}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <div className="card-basedon">
                                <small>📊 {rec.basedOn}</small>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* توقعات الأسبوع القادم */}
            {predictions && predictions.length > 0 && (
                <div className="predictions-section">
                    <h3>🔮 {isArabic ? 'توقعات للأسبوع القادم' : 'Predictions for next week'}</h3>
                    <div className="predictions-grid">
                        {predictions.map((pred, idx) => (
                            <div key={idx} className="prediction-card">
                                <div className="prediction-icon">{pred.icon}</div>
                                <div className="prediction-content">
                                    <div className="prediction-label">{pred.label}</div>
                                    <div className="prediction-value">{pred.value}</div>
                                    <div className={`prediction-trend ${pred.trend}`}>
                                        {pred.trend === 'up' ? '⬆️' : pred.trend === 'down' ? '⬇️' : '➡️'}
                                    </div>
                                </div>
                                {pred.note && <div className="prediction-note">ℹ️ {pred.note}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="predictions-note">
                        ⚠️ {isArabic 
                            ? '* هذه التوقعات تقديرية وتعتمد على التزامك بالتوصيات المقترحة'
                            : '* These predictions are estimates based on following the recommended tips'}
                    </div>
                </div>
            )}

            {lastUpdate && (
                <div className="recommendations-footer">
                    <small>🕒 {isArabic ? 'آخر تحديث' : 'Last update'}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</small>
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