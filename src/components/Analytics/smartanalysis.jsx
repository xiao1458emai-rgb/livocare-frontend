//smartanalysis.jsx
// src/components/SmartAnalysis.jsx
'use client'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// ============================================
// دوال مساعدة للتحليل والتوصيات
// ============================================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// حساب العمر من تاريخ الميلاد
const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// حساب مؤشر كتلة الجسم
const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return roundNumber(weight / (heightInMeters * heightInMeters), 1);
};

// حساب الوزن المثالي (صيغة روبنسون المعدلة)
const calculateIdealWeight = (height, age, gender) => {
    if (!height) return null;
    const heightInCm = parseFloat(height);
    let idealWeight = 0;
    
    if (gender === 'M') {
        idealWeight = 52 + 1.9 * (heightInCm - 152.4);
    } else if (gender === 'F') {
        idealWeight = 49 + 1.7 * (heightInCm - 152.4);
    } else {
        idealWeight = 50.5 + 1.8 * (heightInCm - 152.4);
    }
    
    if (age && age > 30) {
        const ageFactor = 1 + Math.min(0.15, (age - 30) / 200);
        idealWeight = idealWeight * ageFactor;
    }
    
    return roundNumber(idealWeight, 1);
};

// تصنيف BMI
const getBMICategory = (bmi, isArabic) => {
    if (bmi < 18.5) return {
        category: isArabic ? 'نقص وزن' : 'Underweight',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'تحتاج لزيادة وزن صحي' : 'Need healthy weight gain'
    };
    if (bmi < 25) return {
        category: isArabic ? 'وزن طبيعي' : 'Normal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'وزنك ممتاز، حافظ عليه' : 'Excellent weight, keep it up'
    };
    if (bmi < 30) return {
        category: isArabic ? 'زيادة وزن' : 'Overweight',
        color: '#f97316',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'تحتاج لخسارة وزن تدريجية' : 'Need gradual weight loss'
    };
    return {
        category: isArabic ? 'سمنة' : 'Obese',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'يُنصح باستشارة طبيب لوضع خطة صحية' : 'Consult a doctor for a health plan'
    };
};

// تصنيف جودة النوم
const getSleepQualityCategory = (hours, isArabic) => {
    if (hours >= 7 && hours <= 8) return {
        category: isArabic ? 'مثالي' : 'Ideal',
        color: '#10b981',
        icon: '🌟',
        advice: isArabic ? 'نومك مثالي، استمر' : 'Your sleep is ideal, keep it up'
    };
    if (hours >= 6) return {
        category: isArabic ? 'جيد' : 'Good',
        color: '#3b82f6',
        icon: '👍',
        advice: isArabic ? 'نومك جيد، حاول الوصول لـ 7-8 ساعات' : 'Your sleep is good, try to reach 7-8 hours'
    };
    if (hours >= 5) return {
        category: isArabic ? 'مقبول' : 'Fair',
        color: '#f59e0b',
        icon: '⚠️',
        advice: isArabic ? 'نومك أقل من الموصى به، حاول النوم مبكراً' : 'Your sleep is below recommended, try sleeping earlier'
    };
    return {
        category: isArabic ? 'غير كافٍ' : 'Insufficient',
        color: '#ef4444',
        icon: '❌',
        advice: isArabic ? 'نومك غير كافٍ، يوصى بتحسين جودة نومك' : 'Your sleep is insufficient, recommended to improve sleep quality'
    };
};

// تصنيف النشاط البدني
const getActivityCategory = (minutesPerWeek, isArabic) => {
    if (minutesPerWeek >= 150) return {
        category: isArabic ? 'ممتاز' : 'Excellent',
        color: '#10b981',
        icon: '🏆',
        advice: isArabic ? 'نشاطك ممتاز، استمر' : 'Your activity is excellent, keep it up'
    };
    if (minutesPerWeek >= 75) return {
        category: isArabic ? 'جيد' : 'Good',
        color: '#3b82f6',
        icon: '👍',
        advice: isArabic ? 'نشاطك جيد، حاول الوصول لـ 150 دقيقة أسبوعياً' : 'Your activity is good, try to reach 150 minutes weekly'
    };
    if (minutesPerWeek >= 30) return {
        category: isArabic ? 'مقبول' : 'Fair',
        color: '#f59e0b',
        icon: '⚠️',
        advice: isArabic ? 'نشاطك قليل، ابدأ بالمشي 10 دقائق يومياً' : 'Your activity is low, start walking 10 minutes daily'
    };
    return {
        category: isArabic ? 'قليل جداً' : 'Very Low',
        color: '#ef4444',
        icon: '❌',
        advice: isArabic ? 'نشاطك قليل جداً، يوصى بممارسة رياضة خفيفة' : 'Your activity is very low, recommended to do light exercise'
    };
};

// تصنيف التغذية
const getNutritionCategory = (avgCalories, isArabic) => {
    if (avgCalories >= 1800 && avgCalories <= 2500) return {
        category: isArabic ? 'متوازن' : 'Balanced',
        color: '#10b981',
        icon: '✅',
        advice: isArabic ? 'تغذيتك متوازنة، استمر' : 'Your nutrition is balanced, keep it up'
    };
    if (avgCalories >= 1500) return {
        category: isArabic ? 'مقبول' : 'Fair',
        color: '#f59e0b',
        icon: '⚠️',
        advice: isArabic ? 'سعراتك أقل من الموصى بها، أضف وجبات خفيفة صحية' : 'Your calories are below recommended, add healthy snacks'
    };
    return {
        category: isArabic ? 'منخفض جداً' : 'Very Low',
        color: '#ef4444',
        icon: '❌',
        advice: isArabic ? 'سعراتك منخفضة جداً، تحتاج لزيادة السعرات' : 'Your calories are very low, need to increase calorie intake'
    };
};

// تصنيف ضغط الدم
const getBloodPressureCategory = (systolic, diastolic, isArabic) => {
    if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) return {
        category: isArabic ? 'مثالي' : 'Ideal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'ضغط دمك مثالي، استمر في نمط حياتك الصحي' : 'Your blood pressure is ideal, continue your healthy lifestyle'
    };
    if (systolic >= 121 && systolic <= 140 || diastolic >= 81 && diastolic <= 90) return {
        category: isArabic ? 'مرتفع قليلاً' : 'Slightly High',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'ضغط دمك مرتفع قليلاً، قلل الملح وزد النشاط' : 'Your blood pressure is slightly high, reduce salt and increase activity'
    };
    if (systolic > 140 || diastolic > 90) return {
        category: isArabic ? 'مرتفع' : 'High',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'ضغط دمك مرتفع، يوصى باستشارة طبيب' : 'Your blood pressure is high, consult a doctor'
    };
    return {
        category: isArabic ? 'طبيعي' : 'Normal',
        color: '#3b82f6',
        icon: '👍',
        risk: 'low',
        advice: isArabic ? 'ضغط دمك ضمن المعدل الطبيعي' : 'Your blood pressure is within normal range'
    };
};

// تصنيف سكر الدم
const getGlucoseCategory = (glucose, isArabic) => {
    if (glucose >= 70 && glucose <= 140) return {
        category: isArabic ? 'طبيعي' : 'Normal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'سكر دمك طبيعي، استمر' : 'Your blood sugar is normal, keep it up'
    };
    if (glucose > 140 && glucose <= 180) return {
        category: isArabic ? 'مرتفع قليلاً' : 'Slightly High',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'سكر دمك مرتفع قليلاً، قلل السكريات البسيطة' : 'Your blood sugar is slightly high, reduce simple sugars'
    };
    if (glucose > 180) return {
        category: isArabic ? 'مرتفع' : 'High',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'سكر دمك مرتفع، يوصى باستشارة طبيب' : 'Your blood sugar is high, consult a doctor'
    };
    if (glucose < 70 && glucose > 0) return {
        category: isArabic ? 'منخفض' : 'Low',
        color: '#ef4444',
        icon: '⚠️',
        risk: 'high',
        advice: isArabic ? 'سكر دمك منخفض، تناول مصدر سكر سريع' : 'Your blood sugar is low, eat a fast-acting sugar source'
    };
    return null;
};

// تصنيف نبضات القلب
const getHeartRateCategory = (heartRate, isArabic) => {
    if (heartRate >= 60 && heartRate <= 100) return {
        category: isArabic ? 'طبيعي' : 'Normal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'نبضك طبيعي' : 'Your heart rate is normal'
    };
    if (heartRate > 100 && heartRate <= 120) return {
        category: isArabic ? 'مرتفع قليلاً' : 'Slightly High',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'نبضك مرتفع قليلاً، هل أنت متوتر أو مارست رياضة؟' : 'Your heart rate is slightly high, are you stressed or exercised?'
    };
    if (heartRate > 120) return {
        category: isArabic ? 'مرتفع' : 'High',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'نبضك مرتفع، يوصى باستشارة طبيب' : 'Your heart rate is high, consult a doctor'
    };
    if (heartRate < 60 && heartRate > 0) return {
        category: isArabic ? 'منخفض' : 'Low',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'نبضك منخفض، إذا لم تكن رياضياً، استشر طبيبك' : 'Your heart rate is low, if you are not an athlete, consult your doctor'
    };
    return null;
};

// تصنيف نسبة الأكسجين
const getSpO2Category = (spo2, isArabic) => {
    if (spo2 >= 95 && spo2 <= 100) return {
        category: isArabic ? 'طبيعي' : 'Normal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'نسبة الأكسجين طبيعية' : 'Your oxygen level is normal'
    };
    if (spo2 >= 90 && spo2 < 95) return {
        category: isArabic ? 'منخفض قليلاً' : 'Slightly Low',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'نسبة الأكسجين منخفضة قليلاً، جرب تمارين التنفس العميق' : 'Your oxygen level is slightly low, try deep breathing exercises'
    };
    if (spo2 < 90 && spo2 > 0) return {
        category: isArabic ? 'منخفض' : 'Low',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'نسبة الأكسجين منخفضة، يوصى باستشارة طبيب' : 'Your oxygen level is low, consult a doctor'
    };
    return null;
};

// تصنيف درجة الحرارة
const getTemperatureCategory = (temp, isArabic) => {
    if (temp >= 36.5 && temp <= 37.5) return {
        category: isArabic ? 'طبيعي' : 'Normal',
        color: '#10b981',
        icon: '✅',
        risk: 'low',
        advice: isArabic ? 'درجة حرارتك طبيعية' : 'Your temperature is normal'
    };
    if (temp > 37.5 && temp <= 38.5) return {
        category: isArabic ? 'مرتفعة قليلاً' : 'Slightly High',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'حرارتك مرتفعة قليلاً، اشرب سوائل دافئة واسترح' : 'Your temperature is slightly high, drink warm fluids and rest'
    };
    if (temp > 38.5) return {
        category: isArabic ? 'مرتفعة' : 'High',
        color: '#ef4444',
        icon: '🔴',
        risk: 'high',
        advice: isArabic ? 'حرارتك مرتفعة، قد تشير إلى حمى، استشر طبيباً' : 'Your temperature is high, may indicate fever, consult a doctor'
    };
    if (temp < 36.5 && temp > 0) return {
        category: isArabic ? 'منخفضة' : 'Low',
        color: '#f59e0b',
        icon: '⚠️',
        risk: 'moderate',
        advice: isArabic ? 'حرارتك منخفضة، تأكد من ارتداء ملابس دافئة' : 'Your temperature is low, make sure to wear warm clothes'
    };
    return null;
};

// ============================================
// مكون التحليل الذكي الرئيسي
// ============================================

const SmartAnalysis = () => {
    // إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // إعدادات الوضع المظلم
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    // حالات البيانات
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [healthStatus, setHealthStatus] = useState(null);
    const [sleepData, setSleepData] = useState(null);
    const [moodData, setMoodData] = useState(null);
    const [activityData, setActivityData] = useState(null);
    const [nutritionData, setNutritionData] = useState(null);
    const [habitsData, setHabitsData] = useState(null);
    const [chronicConditions, setChronicConditions] = useState([]);
    const [userMedications, setUserMedications] = useState([]);
    
    // حالات التحليل
    const [analysis, setAnalysis] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [healthScore, setHealthScore] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // الاستماع لتغييرات اللغة
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

    // الاستماع لتغييرات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // جلب جميع البيانات
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            // جلب البيانات من APIs متعددة
            const [
                profileRes,
                healthRes,
                sleepRes,
                moodRes,
                activitiesRes,
                mealsRes,
                habitsDefRes,
                habitsLogRes,
                conditionsRes,
                medicationsRes
            ] = await Promise.all([
                axiosInstance.get('/profile/').catch(() => ({ data: null })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/chronic-conditions/').catch(() => ({ data: [] })),
                axiosInstance.get('/user-medications/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            // معالجة بيانات المستخدم
            let userData = null;
            if (profileRes.data) {
                if (profileRes.data.data) userData = profileRes.data.data;
                else userData = profileRes.data;
            }
            
            // معالجة القياسات الصحية
            let healthRecords = [];
            if (healthRes.data?.results) healthRecords = healthRes.data.results;
            else if (Array.isArray(healthRes.data)) healthRecords = healthRes.data;
            
            const latestHealth = healthRecords.length > 0 ? healthRecords[0] : null;
            
            // معالجة النوم
            let sleepRecords = [];
            if (sleepRes.data?.results) sleepRecords = sleepRes.data.results;
            else if (Array.isArray(sleepRes.data)) sleepRecords = sleepRes.data;
            
            // حساب متوسط النوم
            let avgSleepHours = 0;
            if (sleepRecords.length > 0) {
                let totalHours = 0;
                let validCount = 0;
                sleepRecords.forEach(sleep => {
                    if (sleep.sleep_start && sleep.sleep_end) {
                        const start = new Date(sleep.sleep_start);
                        const end = new Date(sleep.sleep_end);
                        const hours = (end - start) / (1000 * 60 * 60);
                        if (hours > 0 && hours <= 24) {
                            totalHours += hours;
                            validCount++;
                        }
                    }
                });
                avgSleepHours = validCount > 0 ? roundNumber(totalHours / validCount, 1) : 0;
            }
            
            // معالجة المزاج
            let moodRecords = [];
            if (moodRes.data?.results) moodRecords = moodRes.data.results;
            else if (Array.isArray(moodRes.data)) moodRecords = moodRes.data;
            
            // حساب متوسط المزاج
            let avgMoodScore = 0;
            const moodMap = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            if (moodRecords.length > 0) {
                let totalMood = 0;
                moodRecords.forEach(m => {
                    totalMood += moodMap[m.mood] || 3;
                });
                avgMoodScore = roundNumber(totalMood / moodRecords.length, 1);
            }
            
            // معالجة الأنشطة
            let activityRecords = [];
            if (activitiesRes.data?.results) activityRecords = activitiesRes.data.results;
            else if (Array.isArray(activitiesRes.data)) activityRecords = activitiesRes.data;
            
            // حساب النشاط الأسبوعي
            let weeklyActivityMinutes = 0;
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            activityRecords.forEach(activity => {
                const activityDate = new Date(activity.start_time);
                if (activityDate >= oneWeekAgo) {
                    weeklyActivityMinutes += activity.duration_minutes || 0;
                }
            });
            
            // معالجة التغذية
            let mealRecords = [];
            if (mealsRes.data?.results) mealRecords = mealsRes.data.results;
            else if (Array.isArray(mealsRes.data)) mealRecords = mealsRes.data;
            
            // حساب متوسط السعرات
            let avgCalories = 0;
            if (mealRecords.length > 0) {
                let totalCalories = 0;
                mealRecords.forEach(meal => {
                    totalCalories += meal.total_calories || 0;
                });
                avgCalories = Math.round(totalCalories / mealRecords.length);
            }
            
            // معالجة الأمراض المزمنة
            let conditionsList = [];
            if (conditionsRes.data?.results) conditionsList = conditionsRes.data.results;
            else if (Array.isArray(conditionsRes.data)) conditionsList = conditionsRes.data;
            
            // معالجة الأدوية
            let medsList = [];
            if (medicationsRes.data?.results) medsList = medicationsRes.data.results;
            else if (Array.isArray(medicationsRes.data)) medsList = medicationsRes.data;
            
            // حساب العمر
            const age = calculateAge(userData?.date_of_birth);
            
            // حساب BMI
            const bmi = calculateBMI(latestHealth?.weight_kg, userData?.height);
            const bmiCategory = bmi ? getBMICategory(bmi, isArabic) : null;
            
            // الوزن المثالي
            const idealWeight = calculateIdealWeight(userData?.height, age, userData?.gender);
            
            // تخزين البيانات
            setUserProfile(userData);
            setHealthStatus(latestHealth);
            setSleepData({ avgHours: avgSleepHours, records: sleepRecords.length });
            setMoodData({ avgScore: avgMoodScore, records: moodRecords.length });
            setActivityData({ weeklyMinutes: weeklyActivityMinutes, records: activityRecords.length });
            setNutritionData({ avgCalories: avgCalories, records: mealRecords.length });
            setChronicConditions(conditionsList);
            setUserMedications(medsList);
            
            // توليد التحليل والتوصيات
            generateAnalysisAndRecommendations({
                user: userData,
                health: latestHealth,
                age,
                bmi,
                bmiCategory,
                idealWeight,
                sleep: { avgHours: avgSleepHours },
                mood: { avgScore: avgMoodScore },
                activity: { weeklyMinutes: weeklyActivityMinutes },
                nutrition: { avgCalories: avgCalories },
                conditions: conditionsList,
                medications: medsList
            });
            
        } catch (err) {
            console.error('Error fetching data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isArabic]);
    
    // توليد التحليل والتوصيات المخصصة
    const generateAnalysisAndRecommendations = useCallback((data) => {
        const recommendationsList = [];
        const analysisData = {};
        
        // ============================================
        // تحليل الوزن وBMI
        // ============================================
        if (data.bmi && data.bmiCategory) {
            analysisData.bmi = {
                value: data.bmi,
                category: data.bmiCategory.category,
                color: data.bmiCategory.color,
                icon: data.bmiCategory.icon,
                risk: data.bmiCategory.risk,
                advice: data.bmiCategory.advice
            };
            
            // توصيات الوزن المخصصة
            if (data.bmiCategory.risk === 'high' || data.bmiCategory.risk === 'moderate') {
                if (data.bmi >= 25) {
                    recommendationsList.push({
                        id: 'weight_loss',
                        icon: '⚖️',
                        category: isArabic ? 'الوزن' : 'Weight',
                        priority: 'high',
                        title: isArabic ? 'برنامج خسارة الوزن' : 'Weight Loss Program',
                        message: isArabic 
                            ? `وزنك الحالي ${data.health?.weight_kg} كجم، مؤشر كتلة الجسم ${data.bmi} (${data.bmiCategory.category})`
                            : `Your current weight is ${data.health?.weight_kg} kg, BMI ${data.bmi} (${data.bmiCategory.category})`,
                        advice: isArabic 
                            ? `الوزن المثالي لك هو ${data.idealWeight} كجم. تحتاج لخسارة ${roundNumber(data.health?.weight_kg - data.idealWeight, 1)} كجم`
                            : `Your ideal weight is ${data.idealWeight} kg. You need to lose ${roundNumber(data.health?.weight_kg - data.idealWeight, 1)} kg`,
                        actions: [
                            isArabic ? 'قلل 500 سعرة حرارية يومياً' : 'Reduce 500 calories daily',
                            isArabic ? 'مارس المشي 30 دقيقة يومياً' : 'Walk 30 minutes daily',
                            isArabic ? 'تناول البروتين في كل وجبة' : 'Eat protein with every meal',
                            isArabic ? 'اشرب كوب ماء قبل كل وجبة' : 'Drink a glass of water before each meal'
                        ],
                        basedOn: isArabic ? 'تحليل الوزن ومؤشر كتلة الجسم' : 'Weight and BMI analysis'
                    });
                } else if (data.bmi < 18.5) {
                    recommendationsList.push({
                        id: 'weight_gain',
                        icon: '💪',
                        category: isArabic ? 'الوزن' : 'Weight',
                        priority: 'high',
                        title: isArabic ? 'زيادة الوزن الصحي' : 'Healthy Weight Gain',
                        message: isArabic 
                            ? `وزنك الحالي ${data.health?.weight_kg} كجم، مؤشر كتلة الجسم ${data.bmi} (${data.bmiCategory.category})`
                            : `Your current weight is ${data.health?.weight_kg} kg, BMI ${data.bmi} (${data.bmiCategory.category})`,
                        advice: isArabic 
                            ? `الوزن المثالي لك هو ${data.idealWeight} كجم. تحتاج لزيادة ${roundNumber(data.idealWeight - data.health?.weight_kg, 1)} كجم`
                            : `Your ideal weight is ${data.idealWeight} kg. You need to gain ${roundNumber(data.idealWeight - data.health?.weight_kg, 1)} kg`,
                        actions: [
                            isArabic ? 'أضف 300-500 سعرة حرارية يومياً' : 'Add 300-500 calories daily',
                            isArabic ? 'تناول 5-6 وجبات صغيرة يومياً' : 'Eat 5-6 small meals daily',
                            isArabic ? 'ركز على البروتين والدهون الصحية' : 'Focus on protein and healthy fats',
                            isArabic ? 'أضف المكسرات والأفوكادو لوجباتك' : 'Add nuts and avocado to your meals'
                        ],
                        basedOn: isArabic ? 'تحليل الوزن ومؤشر كتلة الجسم' : 'Weight and BMI analysis'
                    });
                }
            } else if (data.bmiCategory.risk === 'low' && data.bmi >= 18.5 && data.bmi <= 25) {
                recommendationsList.push({
                    id: 'weight_maintain',
                    icon: '🎯',
                    category: isArabic ? 'الوزن' : 'Weight',
                    priority: 'medium',
                    title: isArabic ? 'حافظ على وزنك الصحي' : 'Maintain Your Healthy Weight',
                    message: isArabic 
                        ? `وزنك في المعدل المثالي! مؤشر كتلة الجسم ${data.bmi} (${data.bmiCategory.category})`
                        : `Your weight is ideal! BMI ${data.bmi} (${data.bmiCategory.category})`,
                    advice: isArabic 
                        ? `الوزن المثالي لك هو ${data.idealWeight} كجم، أنت قريب جداً`
                        : `Your ideal weight is ${data.idealWeight} kg, you are very close`,
                    actions: [
                        isArabic ? 'استمر في نظامك الغذائي المتوازن' : 'Continue your balanced diet',
                        isArabic ? 'حافظ على نشاطك البدني' : 'Maintain your physical activity',
                        isArabic ? 'راقب وزنك أسبوعياً' : 'Monitor your weight weekly'
                    ],
                    basedOn: isArabic ? 'تحليل الوزن ومؤشر كتلة الجسم' : 'Weight and BMI analysis'
                });
            }
        }
        
        // ============================================
        // تحليل النوم
        // ============================================
        if (data.sleep.avgHours > 0) {
            const sleepCategory = getSleepQualityCategory(data.sleep.avgHours, isArabic);
            analysisData.sleep = {
                avgHours: data.sleep.avgHours,
                category: sleepCategory.category,
                color: sleepCategory.color,
                icon: sleepCategory.icon,
                advice: sleepCategory.advice
            };
            
            if (data.sleep.avgHours < 7) {
                recommendationsList.push({
                    id: 'sleep_improvement',
                    icon: '🌙',
                    category: isArabic ? 'النوم' : 'Sleep',
                    priority: 'high',
                    title: isArabic ? 'تحسين جودة النوم' : 'Improve Sleep Quality',
                    message: isArabic 
                        ? `متوسط نومك ${data.sleep.avgHours} ساعات فقط، أقل من الموصى به (7-8 ساعات)`
                        : `Your average sleep is only ${data.sleep.avgHours} hours, below recommended (7-8 hours)`,
                    advice: sleepCategory.advice,
                    actions: [
                        isArabic ? 'ثبت موعد نومك واستيقاظك يومياً' : 'Set a fixed bedtime and wake time daily',
                        isArabic ? 'تجنب الكافيين بعد الساعة 4 مساءً' : 'Avoid caffeine after 4 PM',
                        isArabic ? 'لا تستخدم الهاتف قبل النوم بساعة' : 'No phone usage an hour before bed',
                        isArabic ? 'اجعل غرفة النوم مظلمة وهادئة وباردة' : 'Keep bedroom dark, quiet, and cool'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات نومك' : 'Analysis of your sleep data'
                });
            } else if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) {
                recommendationsList.push({
                    id: 'sleep_good',
                    icon: '🌟',
                    category: isArabic ? 'النوم' : 'Sleep',
                    priority: 'low',
                    title: isArabic ? 'نومك ممتاز!' : 'Your Sleep is Excellent!',
                    message: isArabic 
                        ? `متوسط نومك ${data.sleep.avgHours} ساعات، في المستوى المثالي`
                        : `Your average sleep is ${data.sleep.avgHours} hours, at the ideal level`,
                    advice: isArabic ? 'استمر في روتين نومك الصحي' : 'Continue your healthy sleep routine',
                    actions: [
                        isArabic ? 'حافظ على انتظام مواعيد نومك' : 'Maintain consistent sleep schedule',
                        isArabic ? 'استمر في العادات الصحية التي تساعدك على النوم' : 'Continue healthy sleep habits'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات نومك' : 'Analysis of your sleep data'
                });
            }
        } else {
            recommendationsList.push({
                id: 'sleep_track',
                icon: '📝',
                category: isArabic ? 'النوم' : 'Sleep',
                priority: 'medium',
                title: isArabic ? 'سجل نومك' : 'Track Your Sleep',
                message: isArabic ? 'لم تسجل أي بيانات نوم بعد' : 'You haven\'t recorded any sleep data yet',
                advice: isArabic ? 'ابدأ بتسجيل نومك للحصول على تحليلات مخصصة' : 'Start tracking your sleep to get personalized insights',
                actions: [
                    isArabic ? 'سجل وقت نومك واستيقاظك يومياً' : 'Log your sleep and wake times daily',
                    isArabic ? 'قيّم جودة نومك بعد الاستيقاظ' : 'Rate your sleep quality after waking up'
                ],
                basedOn: isArabic ? 'بيانات نوم غير كافية' : 'Insufficient sleep data'
            });
        }
        
        // ============================================
        // تحليل النشاط البدني
        // ============================================
        if (data.activity.weeklyMinutes > 0) {
            const activityCategory = getActivityCategory(data.activity.weeklyMinutes, isArabic);
            analysisData.activity = {
                weeklyMinutes: data.activity.weeklyMinutes,
                category: activityCategory.category,
                color: activityCategory.color,
                icon: activityCategory.icon,
                advice: activityCategory.advice
            };
            
            if (data.activity.weeklyMinutes < 150) {
                recommendationsList.push({
                    id: 'activity_increase',
                    icon: '🏃',
                    category: isArabic ? 'النشاط' : 'Activity',
                    priority: 'high',
                    title: isArabic ? 'زد نشاطك البدني' : 'Increase Physical Activity',
                    message: isArabic 
                        ? `نشاطك الأسبوعي ${data.activity.weeklyMinutes} دقيقة، الموصى به 150 دقيقة على الأقل`
                        : `Your weekly activity is ${data.activity.weeklyMinutes} minutes, recommended at least 150 minutes`,
                    advice: activityCategory.advice,
                    actions: [
                        isArabic ? 'امشِ 20-30 دقيقة يومياً' : 'Walk 20-30 minutes daily',
                        isArabic ? 'استخدم السلالم بدلاً من المصعد' : 'Use stairs instead of elevator',
                        isArabic ? 'انضم لنشاط جماعي تحبه' : 'Join a group activity you enjoy',
                        isArabic ? 'جرب تمارين منزلية قصيرة' : 'Try short home workouts'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات نشاطك البدني' : 'Analysis of your physical activity data'
                });
            } else if (data.activity.weeklyMinutes >= 150) {
                recommendationsList.push({
                    id: 'activity_good',
                    icon: '🏆',
                    category: isArabic ? 'النشاط' : 'Activity',
                    priority: 'low',
                    title: isArabic ? 'نشاطك ممتاز!' : 'Great Activity!',
                    message: isArabic 
                        ? `نشاطك الأسبوعي ${data.activity.weeklyMinutes} دقيقة، يتجاوز الموصى به`
                        : `Your weekly activity is ${data.activity.weeklyMinutes} minutes, exceeding recommendation`,
                    advice: isArabic ? 'استمر في مستوى نشاطك الممتاز' : 'Continue your excellent activity level',
                    actions: [
                        isArabic ? 'نوّع في تمارينك لتمرين عضلات مختلفة' : 'Vary your exercises for different muscles',
                        isArabic ? 'حافظ على هذا المستوى الرائع' : 'Maintain this great level'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات نشاطك البدني' : 'Analysis of your physical activity data'
                });
            }
        } else {
            recommendationsList.push({
                id: 'activity_start',
                icon: '🏁',
                category: isArabic ? 'النشاط' : 'Activity',
                priority: 'medium',
                title: isArabic ? 'ابدأ رحلة النشاط البدني' : 'Start Your Activity Journey',
                message: isArabic ? 'لم تسجل أي نشاط بدني بعد' : 'You haven\'t recorded any physical activity yet',
                advice: isArabic ? 'المشي 10 دقائق يومياً بداية ممتازة' : 'Walking 10 minutes daily is an excellent start',
                actions: [
                    isArabic ? 'سجل أول نشاط بدني لك' : 'Log your first physical activity',
                    isArabic ? 'ابدأ بالمشي الخفيف' : 'Start with light walking',
                    isArabic ? 'حدد هدفاً بسيطاً (30 دقيقة أسبوعياً)' : 'Set a simple goal (30 minutes weekly)'
                ],
                basedOn: isArabic ? 'بيانات نشاط غير كافية' : 'Insufficient activity data'
            });
        }
        
        // ============================================
        // تحليل التغذية
        // ============================================
        if (data.nutrition.avgCalories > 0) {
            const nutritionCategory = getNutritionCategory(data.nutrition.avgCalories, isArabic);
            analysisData.nutrition = {
                avgCalories: data.nutrition.avgCalories,
                category: nutritionCategory.category,
                color: nutritionCategory.color,
                icon: nutritionCategory.icon,
                advice: nutritionCategory.advice
            };
            
            if (data.nutrition.avgCalories < 1500 && data.nutrition.avgCalories > 0) {
                recommendationsList.push({
                    id: 'calories_increase',
                    icon: '🥗',
                    category: isArabic ? 'التغذية' : 'Nutrition',
                    priority: 'high',
                    title: isArabic ? 'زد سعراتك الحرارية' : 'Increase Calorie Intake',
                    message: isArabic 
                        ? `متوسط سعراتك اليومية ${data.nutrition.avgCalories} سعرة، أقل من الموصى بها (1800-2500)`
                        : `Your average daily calories are ${data.nutrition.avgCalories}, below recommended (1800-2500)`,
                    advice: nutritionCategory.advice,
                    actions: [
                        isArabic ? 'أضف وجبات خفيفة صحية بين الوجبات' : 'Add healthy snacks between meals',
                        isArabic ? 'تناول المكسرات والفواكه المجففة' : 'Eat nuts and dried fruits',
                        isArabic ? 'أضف زيت الزيتون أو الأفوكادو لوجباتك' : 'Add olive oil or avocado to your meals',
                        isArabic ? 'تناول 3 وجبات رئيسية يومياً' : 'Eat 3 main meals daily'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات تغذيتك' : 'Analysis of your nutrition data'
                });
            } else if (data.nutrition.avgCalories > 2500) {
                recommendationsList.push({
                    id: 'calories_reduce',
                    icon: '🔥',
                    category: isArabic ? 'التغذية' : 'Nutrition',
                    priority: 'medium',
                    title: isArabic ? 'قلل سعراتك الحرارية' : 'Reduce Calorie Intake',
                    message: isArabic 
                        ? `متوسط سعراتك اليومية ${data.nutrition.avgCalories} سعرة، أعلى من الموصى بها`
                        : `Your average daily calories are ${data.nutrition.avgCalories}, above recommended`,
                    advice: isArabic ? 'راجع حصص الوجبات وتوازن العناصر الغذائية' : 'Review portion sizes and nutrient balance',
                    actions: [
                        isArabic ? 'استخدم أطباقاً أصغر حجماً' : 'Use smaller plates',
                        isArabic ? 'قلل السكريات والمشروبات الغازية' : 'Reduce sugars and soft drinks',
                        isArabic ? 'زد الخضروات في وجباتك' : 'Increase vegetables in your meals',
                        isArabic ? 'تناول الطعام ببطء ووعي' : 'Eat slowly and mindfully'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات تغذيتك' : 'Analysis of your nutrition data'
                });
            } else if (data.nutrition.avgCalories >= 1800 && data.nutrition.avgCalories <= 2500) {
                recommendationsList.push({
                    id: 'nutrition_balanced',
                    icon: '✅',
                    category: isArabic ? 'التغذية' : 'Nutrition',
                    priority: 'low',
                    title: isArabic ? 'تغذيتك متوازنة' : 'Your Nutrition is Balanced',
                    message: isArabic 
                        ? `سعراتك اليومية ${data.nutrition.avgCalories} سعرة ضمن المعدل الموصى به`
                        : `Your daily calories ${data.nutrition.avgCalories} are within recommended range`,
                    advice: isArabic ? 'حافظ على نظامك الغذائي المتوازن' : 'Maintain your balanced diet',
                    actions: [
                        isArabic ? 'استمر في تنوع الأطعمة' : 'Continue food variety',
                        isArabic ? 'حافظ على شرب الماء الكافي' : 'Maintain adequate water intake'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات تغذيتك' : 'Analysis of your nutrition data'
                });
            }
        } else {
            recommendationsList.push({
                id: 'nutrition_track',
                icon: '📝',
                category: isArabic ? 'التغذية' : 'Nutrition',
                priority: 'medium',
                title: isArabic ? 'سجل وجباتك' : 'Track Your Meals',
                message: isArabic ? 'لم تسجل أي وجبات بعد' : 'You haven\'t recorded any meals yet',
                advice: isArabic ? 'تسجيل الوجبات يساعدك على فهم نظامك الغذائي' : 'Tracking meals helps you understand your diet',
                actions: [
                    isArabic ? 'أضف وجبتك الأولى' : 'Add your first meal',
                    isArabic ? 'سجل ما تأكله خلال اليوم' : 'Log what you eat throughout the day',
                    isArabic ? 'استخدم ماسح الباركود لتسجيل سريع' : 'Use barcode scanner for quick logging'
                ],
                basedOn: isArabic ? 'بيانات تغذية غير كافية' : 'Insufficient nutrition data'
            });
        }
        
        // ============================================
        // تحليل ضغط الدم (إذا توفرت البيانات)
        // ============================================
        if (data.health?.systolic_pressure && data.health?.diastolic_pressure) {
            const bpCategory = getBloodPressureCategory(
                data.health.systolic_pressure,
                data.health.diastolic_pressure,
                isArabic
            );
            analysisData.bloodPressure = {
                systolic: data.health.systolic_pressure,
                diastolic: data.health.diastolic_pressure,
                category: bpCategory.category,
                color: bpCategory.color,
                icon: bpCategory.icon,
                risk: bpCategory.risk,
                advice: bpCategory.advice
            };
            
            if (bpCategory.risk === 'high' || bpCategory.risk === 'moderate') {
                recommendationsList.push({
                    id: 'bp_improvement',
                    icon: '❤️',
                    category: isArabic ? 'ضغط الدم' : 'Blood Pressure',
                    priority: 'high',
                    title: isArabic ? 'تحسين ضغط الدم' : 'Improve Blood Pressure',
                    message: isArabic 
                        ? `ضغط دمك ${data.health.systolic_pressure}/${data.health.diastolic_pressure} mmHg (${bpCategory.category})`
                        : `Your blood pressure is ${data.health.systolic_pressure}/${data.health.diastolic_pressure} mmHg (${bpCategory.category})`,
                    advice: bpCategory.advice,
                    actions: [
                        isArabic ? 'قلل الملح في الطعام' : 'Reduce salt in food',
                        isArabic ? 'مارس المشي 30 دقيقة يومياً' : 'Walk 30 minutes daily',
                        isArabic ? 'تناول البوتاسيوم (موز، بطاطس)' : 'Eat potassium-rich foods (bananas, potatoes)',
                        isArabic ? 'قلل التوتر والقلق' : 'Reduce stress and anxiety'
                    ],
                    basedOn: isArabic ? 'تحليل قراءات ضغط دمك' : 'Analysis of your blood pressure readings'
                });
            }
        }
        
        // ============================================
        // تحليل المزاج
        // ============================================
        if (data.mood.avgScore > 0) {
            analysisData.mood = {
                avgScore: data.mood.avgScore,
                records: data.mood.records
            };
            
            if (data.mood.avgScore < 3) {
                recommendationsList.push({
                    id: 'mood_improvement',
                    icon: '😊',
                    category: isArabic ? 'المزاج' : 'Mood',
                    priority: 'high',
                    title: isArabic ? 'تحسين الحالة المزاجية' : 'Improve Your Mood',
                    message: isArabic 
                        ? `متوسط مزاجك ${data.mood.avgScore}/5، يمكن تحسينه بأنشطة بسيطة`
                        : `Your average mood is ${data.mood.avgScore}/5, can be improved with simple activities`,
                    advice: isArabic ? 'اهتمامك بصحتك النفسية مهم جداً' : 'Your mental health is very important',
                    actions: [
                        isArabic ? 'مارس التأمل أو تمارين التنفس' : 'Practice meditation or breathing exercises',
                        isArabic ? 'تواصل مع الأصدقاء والعائلة' : 'Connect with friends and family',
                        isArabic ? 'مارس هواية تحبها' : 'Do a hobby you enjoy',
                        isArabic ? 'تحدث مع شخص تثق به عن مشاعرك' : 'Talk to someone you trust about your feelings'
                    ],
                    basedOn: isArabic ? 'تحليل بيانات مزاجك' : 'Analysis of your mood data'
                });
            }
        }
        
        // ============================================
        // توصيات بناءً على الأمراض المزمنة
        // ============================================
        if (data.conditions && data.conditions.length > 0) {
            data.conditions.forEach(condition => {
                const conditionName = condition.name?.toLowerCase() || '';
                
                if (conditionName.includes('diabetes') || conditionName.includes('سكري')) {
                    recommendationsList.push({
                        id: 'diabetes_management',
                        icon: '🩸',
                        category: isArabic ? 'إدارة السكري' : 'Diabetes Management',
                        priority: 'high',
                        title: isArabic ? 'إدارة مرض السكري' : 'Diabetes Management',
                        message: isArabic 
                            ? `لديك ${condition.name}، من المهم مراقبة مستويات السكر`
                            : `You have ${condition.name}, it's important to monitor blood sugar levels`,
                        advice: isArabic ? 'اتباع نظام غذائي صحي ومتوازن يساعد في التحكم بالسكر' : 'A healthy balanced diet helps control blood sugar',
                        actions: [
                            isArabic ? 'راقب سكر الدم بانتظام' : 'Monitor blood sugar regularly',
                            isArabic ? 'تجنب السكريات البسيطة' : 'Avoid simple sugars',
                            isArabic ? 'تناول وجبات صغيرة متعددة' : 'Eat small frequent meals',
                            isArabic ? 'مارس الرياضة بانتظام' : 'Exercise regularly',
                            isArabic ? 'استشر طبيبك بانتظام' : 'Consult your doctor regularly'
                        ],
                        basedOn: isArabic ? `تحليل حالتك: ${condition.name}` : `Analysis of your condition: ${condition.name}`
                    });
                }
                
                if (conditionName.includes('pressure') || conditionName.includes('ضغط')) {
                    recommendationsList.push({
                        id: 'hypertension_management',
                        icon: '❤️',
                        category: isArabic ? 'إدارة ضغط الدم' : 'Blood Pressure Management',
                        priority: 'high',
                        title: isArabic ? 'إدارة ضغط الدم' : 'Blood Pressure Management',
                        message: isArabic 
                            ? `لديك ${condition.name}، من المهم مراقبة ضغط الدم بانتظام`
                            : `You have ${condition.name}, it's important to monitor blood pressure regularly`,
                        advice: isArabic ? 'نمط حياة صحي يساعد في التحكم بضغط الدم' : 'A healthy lifestyle helps control blood pressure',
                        actions: [
                            isArabic ? 'راقب ضغط دمك بانتظام' : 'Monitor blood pressure regularly',
                            isArabic ? 'قلل الملح في الطعام' : 'Reduce salt in food',
                            isArabic ? 'مارس المشي يومياً' : 'Walk daily',
                            isArabic ? 'حافظ على وزن صحي' : 'Maintain healthy weight',
                            isArabic ? 'استشر طبيبك بانتظام' : 'Consult your doctor regularly'
                        ],
                        basedOn: isArabic ? `تحليل حالتك: ${condition.name}` : `Analysis of your condition: ${condition.name}`
                    });
                }
            });
        }
        
        // ============================================
        // درجة الصحة الشاملة
        // ============================================
        let totalScore = 0;
        let maxScore = 0;
        const scoreFactors = [];
        
        // عامل النوم (25 نقطة)
        if (data.sleep.avgHours > 0) {
            maxScore += 25;
            if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) {
                totalScore += 25;
                scoreFactors.push({
                    name: isArabic ? 'النوم' : 'Sleep',
                    score: 25,
                    max: 25,
                    status: 'excellent',
                    message: isArabic ? 'مثالي' : 'Ideal'
                });
            } else if (data.sleep.avgHours >= 6) {
                totalScore += 18;
                scoreFactors.push({
                    name: isArabic ? 'النوم' : 'Sleep',
                    score: 18,
                    max: 25,
                    status: 'good',
                    message: isArabic ? 'جيد' : 'Good'
                });
            } else if (data.sleep.avgHours >= 5) {
                totalScore += 10;
                scoreFactors.push({
                    name: isArabic ? 'النوم' : 'Sleep',
                    score: 10,
                    max: 25,
                    status: 'fair',
                    message: isArabic ? 'مقبول' : 'Fair'
                });
            } else {
                totalScore += 5;
                scoreFactors.push({
                    name: isArabic ? 'النوم' : 'Sleep',
                    score: 5,
                    max: 25,
                    status: 'poor',
                    message: isArabic ? 'يحتاج تحسين' : 'Needs improvement'
                });
            }
        }
        
        // عامل النشاط (20 نقطة)
        if (data.activity.weeklyMinutes > 0) {
            maxScore += 20;
            if (data.activity.weeklyMinutes >= 150) {
                totalScore += 20;
                scoreFactors.push({
                    name: isArabic ? 'النشاط' : 'Activity',
                    score: 20,
                    max: 20,
                    status: 'excellent',
                    message: isArabic ? 'ممتاز' : 'Excellent'
                });
            } else if (data.activity.weeklyMinutes >= 75) {
                totalScore += 14;
                scoreFactors.push({
                    name: isArabic ? 'النشاط' : 'Activity',
                    score: 14,
                    max: 20,
                    status: 'good',
                    message: isArabic ? 'جيد' : 'Good'
                });
            } else if (data.activity.weeklyMinutes >= 30) {
                totalScore += 8;
                scoreFactors.push({
                    name: isArabic ? 'النشاط' : 'Activity',
                    score: 8,
                    max: 20,
                    status: 'fair',
                    message: isArabic ? 'مقبول' : 'Fair'
                });
            } else {
                totalScore += 4;
                scoreFactors.push({
                    name: isArabic ? 'النشاط' : 'Activity',
                    score: 4,
                    max: 20,
                    status: 'poor',
                    message: isArabic ? 'قليل' : 'Low'
                });
            }
        }
        
        // عامل التغذية (15 نقطة)
        if (data.nutrition.avgCalories > 0) {
            maxScore += 15;
            if (data.nutrition.avgCalories >= 1800 && data.nutrition.avgCalories <= 2500) {
                totalScore += 15;
                scoreFactors.push({
                    name: isArabic ? 'التغذية' : 'Nutrition',
                    score: 15,
                    max: 15,
                    status: 'excellent',
                    message: isArabic ? 'متوازن' : 'Balanced'
                });
            } else if (data.nutrition.avgCalories >= 1500) {
                totalScore += 10;
                scoreFactors.push({
                    name: isArabic ? 'التغذية' : 'Nutrition',
                    score: 10,
                    max: 15,
                    status: 'good',
                    message: isArabic ? 'مقبول' : 'Fair'
                });
            } else {
                totalScore += 5;
                scoreFactors.push({
                    name: isArabic ? 'التغذية' : 'Nutrition',
                    score: 5,
                    max: 15,
                    status: 'poor',
                    message: isArabic ? 'منخفض' : 'Low'
                });
            }
        }
        
        // عامل المزاج (10 نقاط)
        if (data.mood.avgScore > 0) {
            maxScore += 10;
            if (data.mood.avgScore >= 4) {
                totalScore += 10;
                scoreFactors.push({
                    name: isArabic ? 'المزاج' : 'Mood',
                    score: 10,
                    max: 10,
                    status: 'excellent',
                    message: isArabic ? 'ممتاز' : 'Excellent'
                });
            } else if (data.mood.avgScore >= 3) {
                totalScore += 6;
                scoreFactors.push({
                    name: isArabic ? 'المزاج' : 'Mood',
                    score: 6,
                    max: 10,
                    status: 'good',
                    message: isArabic ? 'جيد' : 'Good'
                });
            } else {
                totalScore += 3;
                scoreFactors.push({
                    name: isArabic ? 'المزاج' : 'Mood',
                    score: 3,
                    max: 10,
                    status: 'fair',
                    message: isArabic ? 'متوسط' : 'Fair'
                });
            }
        }
        
        // عامل ضغط الدم (10 نقاط)
        if (data.health?.systolic_pressure && data.health?.diastolic_pressure) {
            maxScore += 10;
            const bpValue = data.health.systolic_pressure;
            if (bpValue >= 90 && bpValue <= 120) {
                totalScore += 10;
                scoreFactors.push({
                    name: isArabic ? 'ضغط الدم' : 'Blood Pressure',
                    score: 10,
                    max: 10,
                    status: 'excellent',
                    message: isArabic ? 'مثالي' : 'Ideal'
                });
            } else if (bpValue >= 121 && bpValue <= 140) {
                totalScore += 6;
                scoreFactors.push({
                    name: isArabic ? 'ضغط الدم' : 'Blood Pressure',
                    score: 6,
                    max: 10,
                    status: 'good',
                    message: isArabic ? 'مقبول' : 'Acceptable'
                });
            } else if (bpValue > 140) {
                totalScore += 2;
                scoreFactors.push({
                    name: isArabic ? 'ضغط الدم' : 'Blood Pressure',
                    score: 2,
                    max: 10,
                    status: 'poor',
                    message: isArabic ? 'مرتفع' : 'High'
                });
            }
        }
        
        // عامل مؤشر كتلة الجسم (10 نقاط)
        if (data.bmi) {
            maxScore += 10;
            if (data.bmi >= 18.5 && data.bmi <= 24.9) {
                totalScore += 10;
                scoreFactors.push({
                    name: isArabic ? 'مؤشر كتلة الجسم' : 'BMI',
                    score: 10,
                    max: 10,
                    status: 'excellent',
                    message: isArabic ? 'طبيعي' : 'Normal'
                });
            } else if (data.bmi >= 25 && data.bmi <= 29.9) {
                totalScore += 5;
                scoreFactors.push({
                    name: isArabic ? 'مؤشر كتلة الجسم' : 'BMI',
                    score: 5,
                    max: 10,
                    status: 'fair',
                    message: isArabic ? 'زيادة وزن' : 'Overweight'
                });
            } else if (data.bmi >= 30) {
                totalScore += 0;
                scoreFactors.push({
                    name: isArabic ? 'مؤشر كتلة الجسم' : 'BMI',
                    score: 0,
                    max: 10,
                    status: 'poor',
                    message: isArabic ? 'سمنة' : 'Obese'
                });
            } else if (data.bmi < 18.5 && data.bmi > 0) {
                totalScore += 5;
                scoreFactors.push({
                    name: isArabic ? 'مؤشر كتلة الجسم' : 'BMI',
                    score: 5,
                    max: 10,
                    status: 'fair',
                    message: isArabic ? 'نقص وزن' : 'Underweight'
                });
            }
        }
        
        // العامل الإضافي: الالتزام بتسجيل البيانات (10 نقاط)
        const hasAnyData = data.sleep.avgHours > 0 || data.activity.weeklyMinutes > 0 || 
                          data.nutrition.avgCalories > 0 || data.mood.avgScore > 0;
        if (hasAnyData) {
            maxScore += 10;
            const dataPoints = (data.sleep.avgHours > 0 ? 1 : 0) + 
                              (data.activity.weeklyMinutes > 0 ? 1 : 0) + 
                              (data.nutrition.avgCalories > 0 ? 1 : 0) + 
                              (data.mood.avgScore > 0 ? 1 : 0);
            const consistencyScore = Math.round((dataPoints / 4) * 10);
            totalScore += consistencyScore;
            scoreFactors.push({
                name: isArabic ? 'الالتزام بالتسجيل' : 'Tracking Consistency',
                score: consistencyScore,
                max: 10,
                status: consistencyScore >= 7 ? 'good' : consistencyScore >= 4 ? 'fair' : 'poor',
                message: consistencyScore >= 7 ? isArabic ? 'جيد' : 'Good' : consistencyScore >= 4 ? isArabic ? 'متوسط' : 'Fair' : isArabic ? 'يحتاج تحسين' : 'Needs improvement'
            });
        }
        
        // حساب النسبة المئوية
        const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        
        let grade = '';
        let statusText = '';
        let statusColor = '';
        
        if (finalScore >= 85) {
            grade = 'A+';
            statusText = isArabic ? 'ممتازة جداً' : 'Excellent+';
            statusColor = '#10b981';
        } else if (finalScore >= 75) {
            grade = 'A';
            statusText = isArabic ? 'ممتازة' : 'Excellent';
            statusColor = '#34d399';
        } else if (finalScore >= 65) {
            grade = 'B+';
            statusText = isArabic ? 'جيدة جداً' : 'Very Good';
            statusColor = '#3b82f6';
        } else if (finalScore >= 55) {
            grade = 'B';
            statusText = isArabic ? 'جيدة' : 'Good';
            statusColor = '#60a5fa';
        } else if (finalScore >= 45) {
            grade = 'C+';
            statusText = isArabic ? 'متوسطة' : 'Fair';
            statusColor = '#f59e0b';
        } else if (finalScore >= 35) {
            grade = 'C';
            statusText = isArabic ? 'تحتاج تحسيناً' : 'Needs Improvement';
            statusColor = '#f97316';
        } else {
            grade = 'D';
            statusText = isArabic ? 'تحتاج اهتماماً' : 'Needs Attention';
            statusColor = '#ef4444';
        }
        
        setHealthScore({
            score: finalScore,
            grade,
            statusText,
            statusColor,
            factors: scoreFactors,
            totalScore,
            maxScore
        });
        
        // ترتيب التوصيات حسب الأولوية
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const sortedRecommendations = [...recommendationsList].sort((a, b) => {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        setRecommendations(sortedRecommendations);
        setAnalysis(analysisData);
        
    }, [isArabic]);
    
    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();
        return () => {
            isMountedRef.current = false;
            isFetchingRef.current = false;
        };
    }, [fetchAllData]);
    
    if (loading) {
        return (
            <div className={`smart-analysis-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? '🧠 جاري تحليل بياناتك...' : '🧠 Analyzing your data...'}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={`smart-analysis-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <p>{error}</p>
                    <button onClick={fetchAllData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`smart-analysis-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس الصفحة */}
            <div className="analysis-header">
                <h2>
                    <span className="header-icon">🧠</span>
                    {isArabic ? 'التحليل الذكي والصحي' : 'Smart Health Analysis'}
                </h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>
            
            {/* درجة الصحة الشاملة */}
            {healthScore && (
                <div className="health-score-card" style={{ borderBottomColor: healthScore.statusColor }}>
                    <div className="score-header">
                        <div className="score-circle" style={{ borderColor: healthScore.statusColor }}>
                            <span className="score-value">{healthScore.score}</span>
                            <span className="score-max">/100</span>
                        </div>
                        <div className="score-info">
                            <div className={`score-grade grade-${healthScore.grade?.toLowerCase()}`}>
                                {healthScore.grade}
                            </div>
                            <div className="score-status" style={{ color: healthScore.statusColor }}>
                                {healthScore.statusText}
                            </div>
                        </div>
                    </div>
                    
                    <details className="score-details">
                        <summary>{isArabic ? '📊 تفاصيل الدرجة' : '📊 Score Details'}</summary>
                        <div className="score-factors">
                            {healthScore.factors.map((factor, idx) => (
                                <div key={idx} className="score-factor">
                                    <div className="factor-name">{factor.name}</div>
                                    <div className="factor-bar">
                                        <div className={`factor-fill ${factor.status}`} style={{ width: `${(factor.score / factor.max) * 100}%` }}></div>
                                    </div>
                                    <div className="factor-score">{factor.score}/{factor.max}</div>
                                    <div className="factor-message">{factor.message}</div>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
            
            {/* ملخص سريع للبيانات الرئيسية */}
            <div className="quick-stats">
                <div className="stat-item">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-info">
                        <div className="stat-value">{analysis?.bmi?.value || '—'}</div>
                        <div className="stat-label">{isArabic ? 'BMI' : 'BMI'}</div>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">🌙</div>
                    <div className="stat-info">
                        <div className="stat-value">{sleepData?.avgHours || '—'}</div>
                        <div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">🏃</div>
                    <div className="stat-info">
                        <div className="stat-value">{activityData?.weeklyMinutes || '—'}</div>
                        <div className="stat-label">{isArabic ? 'نشاط أسبوعي' : 'Weekly Activity'}</div>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">🥗</div>
                    <div className="stat-info">
                        <div className="stat-value">{nutritionData?.avgCalories || '—'}</div>
                        <div className="stat-label">{isArabic ? 'سعرات يومية' : 'Daily Calories'}</div>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">😊</div>
                    <div className="stat-info">
                        <div className="stat-value">{moodData?.avgScore || '—'}/5</div>
                        <div className="stat-label">{isArabic ? 'متوسط المزاج' : 'Avg Mood'}</div>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">❤️</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {analysis?.bloodPressure ? `${analysis.bloodPressure.systolic}/${analysis.bloodPressure.diastolic}` : '—'}
                        </div>
                        <div className="stat-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                    </div>
                </div>
            </div>
            
            {/* التبويبات */}
            <div className="analysis-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 {isArabic ? 'نظرة عامة' : 'Overview'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recommendations')}
                >
                    💡 {isArabic ? 'توصيات' : 'Recommendations'} 
                    {recommendations.length > 0 && <span className="rec-badge">{recommendations.filter(r => r.priority === 'high').length}</span>}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
                    onClick={() => setActiveTab('insights')}
                >
                    🧠 {isArabic ? 'رؤى وتحليلات' : 'Insights'}
                </button>
            </div>
            
            {/* تبويب النظرة العامة */}
            {activeTab === 'overview' && (
                <div className="tab-content overview-tab">
                    {/* تحليل الوزن وBMI */}
                    {analysis?.bmi && (
                        <div className="analysis-card" style={{ borderLeftColor: analysis.bmi.color }}>
                            <div className="card-header">
                                <span className="card-icon">⚖️</span>
                                <div>
                                    <h3>{isArabic ? 'مؤشر كتلة الجسم' : 'Body Mass Index (BMI)'}</h3>
                                    <div className="card-value" style={{ color: analysis.bmi.color }}>
                                        {analysis.bmi.value} - {analysis.bmi.category}
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{analysis.bmi.advice}</p>
                                {userProfile?.height && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'الطول' : 'Height'}:</span>
                                        <span>{userProfile.height} cm</span>
                                    </div>
                                )}
                                {healthStatus?.weight_kg && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'الوزن الحالي' : 'Current Weight'}:</span>
                                        <span>{healthStatus.weight_kg} kg</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* تحليل النوم */}
                    {analysis?.sleep && (
                        <div className="analysis-card" style={{ borderLeftColor: analysis.sleep.color }}>
                            <div className="card-header">
                                <span className="card-icon">🌙</span>
                                <div>
                                    <h3>{isArabic ? 'تحليل النوم' : 'Sleep Analysis'}</h3>
                                    <div className="card-value" style={{ color: analysis.sleep.color }}>
                                        {analysis.sleep.avgHours} {isArabic ? 'ساعات' : 'hours'} - {analysis.sleep.category}
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{analysis.sleep.advice}</p>
                                {sleepData?.records > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'ليالي مسجلة' : 'Nights Recorded'}:</span>
                                        <span>{sleepData.records}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* تحليل النشاط */}
                    {analysis?.activity && (
                        <div className="analysis-card" style={{ borderLeftColor: analysis.activity.color }}>
                            <div className="card-header">
                                <span className="card-icon">🏃</span>
                                <div>
                                    <h3>{isArabic ? 'تحليل النشاط' : 'Activity Analysis'}</h3>
                                    <div className="card-value" style={{ color: analysis.activity.color }}>
                                        {analysis.activity.weeklyMinutes} {isArabic ? 'دقيقة/أسبوع' : 'min/week'} - {analysis.activity.category}
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{analysis.activity.advice}</p>
                                {activityData?.records > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'أنشطة مسجلة' : 'Activities Recorded'}:</span>
                                        <span>{activityData.records}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* تحليل التغذية */}
                    {analysis?.nutrition && (
                        <div className="analysis-card" style={{ borderLeftColor: analysis.nutrition.color }}>
                            <div className="card-header">
                                <span className="card-icon">🥗</span>
                                <div>
                                    <h3>{isArabic ? 'تحليل التغذية' : 'Nutrition Analysis'}</h3>
                                    <div className="card-value" style={{ color: analysis.nutrition.color }}>
                                        {analysis.nutrition.avgCalories} {isArabic ? 'سعرة/يوم' : 'cal/day'} - {analysis.nutrition.category}
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{analysis.nutrition.advice}</p>
                                {nutritionData?.records > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'وجبات مسجلة' : 'Meals Recorded'}:</span>
                                        <span>{nutritionData.records}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* تحليل ضغط الدم */}
                    {analysis?.bloodPressure && (
                        <div className="analysis-card" style={{ borderLeftColor: analysis.bloodPressure.color }}>
                            <div className="card-header">
                                <span className="card-icon">❤️</span>
                                <div>
                                    <h3>{isArabic ? 'تحليل ضغط الدم' : 'Blood Pressure Analysis'}</h3>
                                    <div className="card-value" style={{ color: analysis.bloodPressure.color }}>
                                        {analysis.bloodPressure.systolic}/{analysis.bloodPressure.diastolic} mmHg - {analysis.bloodPressure.category}
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{analysis.bloodPressure.advice}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* تحليل المزاج */}
                    {analysis?.mood && (
                        <div className="analysis-card">
                            <div className="card-header">
                                <span className="card-icon">😊</span>
                                <div>
                                    <h3>{isArabic ? 'تحليل المزاج' : 'Mood Analysis'}</h3>
                                    <div className="card-value">
                                        {analysis.mood.avgScore}/5
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                {analysis.mood.avgScore < 3 && (
                                    <p>{isArabic ? 'نلاحظ أن حالتك المزاجية يمكن تحسينها. الاهتمام بالنوم والنشاط والمشاعر الإيجابية يساعد في ذلك.' : 'We notice your mood can be improved. Focus on sleep, activity, and positive emotions helps.'}</p>
                                )}
                                {analysis.mood.avgScore >= 3 && analysis.mood.avgScore < 4 && (
                                    <p>{isArabic ? 'مزاجك جيد. استمر في العادات التي تجعلك سعيداً وتواصل مع من تحب.' : 'Your mood is good. Continue the habits that make you happy and connect with loved ones.'}</p>
                                )}
                                {analysis.mood.avgScore >= 4 && (
                                    <p>{isArabic ? 'مزاجك ممتاز! أنت في حالة نفسية جيدة. شارك إيجابيتك مع الآخرين.' : 'Your mood is excellent! You are in a good mental state. Share your positivity with others.'}</p>
                                )}
                                {moodData?.records > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'سجلات مزاج' : 'Mood Records'}:</span>
                                        <span>{moodData.records}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* معلومات إضافية */}
                    {userProfile && (
                        <div className="info-card">
                            <h3>{isArabic ? 'معلومات عنك' : 'About You'}</h3>
                            <div className="info-grid">
                                {userProfile.first_name && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'الاسم' : 'Name'}:</span>
                                        <span>{userProfile.first_name} {userProfile.last_name}</span>
                                    </div>
                                )}
                                {userProfile.email && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'البريد الإلكتروني' : 'Email'}:</span>
                                        <span>{userProfile.email}</span>
                                    </div>
                                )}
                                {userProfile.gender && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'الجنس' : 'Gender'}:</span>
                                        <span>{userProfile.gender === 'M' ? (isArabic ? 'ذكر' : 'Male') : userProfile.gender === 'F' ? (isArabic ? 'أنثى' : 'Female') : '—'}</span>
                                    </div>
                                )}
                                {chronicConditions.length > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'أمراض مزمنة' : 'Chronic Conditions'}:</span>
                                        <span>{chronicConditions.map(c => c.name).join(', ')}</span>
                                    </div>
                                )}
                                {userMedications.length > 0 && (
                                    <div className="info-row">
                                        <span>{isArabic ? 'أدوية' : 'Medications'}:</span>
                                        <span>{userMedications.map(m => m.medication?.brand_name || m.name).join(', ')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* تبويب التوصيات */}
            {activeTab === 'recommendations' && (
                <div className="tab-content recommendations-tab">
                    {recommendations.length > 0 ? (
                        <div className="recommendations-list">
                            {recommendations.map((rec, idx) => (
                                <div key={rec.id || idx} className={`recommendation-card priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon}</span>
                                        <div className="rec-info">
                                            <div className="rec-category">{rec.category}</div>
                                            <div className="rec-title">{rec.title}</div>
                                        </div>
                                        <span className={`rec-priority priority-${rec.priority}`}>
                                            {rec.priority === 'high' ? (isArabic ? 'عاجل' : 'Urgent') : 
                                             rec.priority === 'medium' ? (isArabic ? 'مهم' : 'Important') : 
                                             (isArabic ? 'نصيحة' : 'Tip')}
                                        </span>
                                    </div>
                                    <div className="rec-message">{rec.message}</div>
                                    <div className="rec-advice">💡 {rec.advice}</div>
                                    {rec.actions && rec.actions.length > 0 && (
                                        <div className="rec-actions">
                                            <strong>{isArabic ? '📋 خطوات مقترحة:' : '📋 Suggested steps:'}</strong>
                                            <ul>
                                                {rec.actions.map((action, i) => (
                                                    <li key={i}>{action}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="rec-basedon">
                                        📊 {rec.basedOn}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">💡</div>
                            <p>{isArabic ? 'لا توجد توصيات محددة حالياً' : 'No specific recommendations at this time'}</p>
                            <p className="empty-hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توصيات مخصصة' : 'Log more data to get personalized recommendations'}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* تبويب الرؤى والتحليلات */}
            {activeTab === 'insights' && (
                <div className="tab-content insights-tab">
                    <div className="insights-card">
                        <h3>{isArabic ? '📈 ما تخبرك به بياناتك' : '📈 What Your Data Tells You'}</h3>
                        
                        {analysis?.bmi && analysis.bmi.risk === 'high' && (
                            <div className="insight-item">
                                <div className="insight-icon">⚖️</div>
                                <div className="insight-content">
                                    <p>{isArabic ? 'مؤشر كتلة الجسم لديك يشير إلى حاجة لمراقبة الوزن. حتى فقدان 5-10% من وزنك الحالي يمكن أن يحسن صحتك بشكل كبير ويقلل من مخاطر الأمراض المرتبطة بالسمنة.' : 'Your BMI indicates a need for weight monitoring. Even losing 5-10% of your current weight can significantly improve your health and reduce risks of obesity-related diseases.'}</p>
                                </div>
                            </div>
                        )}
                        
                        {sleepData?.avgHours < 7 && sleepData?.avgHours > 0 && (
                            <div className="insight-item">
                                <div className="insight-icon">🌙</div>
                                <div className="insight-content">
                                    <p>{isArabic ? `النوم القليل المزمن (${sleepData.avgHours} ساعات) مرتبط بزيادة خطر الإصابة بأمراض القلب والسكري وضعف المناعة. تحسين جودة نومك يمكن أن يزيد تركيزك وإنتاجيتك بنسبة تصل إلى 30%.` : `Chronic sleep deprivation (${sleepData.avgHours} hours) is linked to increased risk of heart disease, diabetes, and weakened immunity. Improving your sleep quality can increase your focus and productivity by up to 30%.`}</p>
                                </div>
                            </div>
                        )}
                        
                        {activityData?.weeklyMinutes > 0 && activityData?.weeklyMinutes < 150 && (
                            <div className="insight-item">
                                <div className="insight-icon">🏃</div>
                                <div className="insight-content">
                                    <p>{isArabic ? `زيادة نشاطك البدني إلى 150 دقيقة أسبوعياً يمكن أن يقلل خطر الإصابة بأمراض القلب بنسبة 30% ويحسن مزاجك وطاقتك. ابدأ بـ 10 دقائق يومياً وزِد تدريجياً.` : `Increasing your physical activity to 150 minutes weekly can reduce heart disease risk by 30% and improve your mood and energy. Start with 10 minutes daily and increase gradually.`}</p>
                                </div>
                            </div>
                        )}
                        
                        {nutritionData?.avgCalories > 0 && nutritionData?.avgCalories < 1500 && (
                            <div className="insight-item">
                                <div className="insight-icon">🥗</div>
                                <div className="insight-content">
                                    <p>{isArabic ? `سعراتك الحرارية أقل من احتياجات جسمك الأساسية. هذا قد يؤدي إلى فقدان الكتلة العضلية، ضعف المناعة، والشعور بالتعب المزمن. أضف وجبات خفيفة صحية غنية بالبروتين والدهون الصحية.` : `Your calorie intake is below your body's basic needs. This may lead to muscle loss, weakened immunity, and chronic fatigue. Add healthy snacks rich in protein and healthy fats.`}</p>
                                </div>
                            </div>
                        )}
                        
                        {analysis?.bloodPressure && analysis.bloodPressure.risk === 'high' && (
                            <div className="insight-item">
                                <div className="insight-icon">❤️</div>
                                <div className="insight-content">
                                    <p>{isArabic ? `ارتفاع ضغط الدم يعد عامل خطر رئيسي لأمراض القلب والسكتة الدماغية. خفض استهلاك الملح إلى أقل من 5 جرام يومياً وممارسة الرياضة بانتظام يمكن أن يخفض ضغط الدم لديك بشكل ملحوظ.` : `High blood pressure is a major risk factor for heart disease and stroke. Reducing salt intake to less than 5 grams daily and regular exercise can significantly lower your blood pressure.`}</p>
                                </div>
                            </div>
                        )}
                        
                        {!analysis?.bmi && !analysis?.sleep && !analysis?.activity && !analysis?.nutrition && !analysis?.bloodPressure && (
                            <div className="insight-item">
                                <div className="insight-icon">📊</div>
                                <div className="insight-content">
                                    <p>{isArabic ? 'سجل المزيد من البيانات الصحية للحصول على رؤى وتحليلات أعمق حول صحتك. كلما زادت البيانات، أصبحت التوصيات أكثر دقة وشخصية.' : 'Log more health data to get deeper insights and analysis about your health. The more data you have, the more accurate and personalized the recommendations become.'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="insights-card">
                        <h3>{isArabic ? '🎯 توصيات لكسب عادات صحية' : '🎯 Tips for Building Healthy Habits'}</h3>
                        <ul className="tips-list">
                            <li>
                                <span className="tip-icon">1️⃣</span>
                                <span>{isArabic ? 'ابدأ بعادة صغيرة واحدة فقط كل أسبوعين' : 'Start with just one small habit every two weeks'}</span>
                            </li>
                            <li>
                                <span className="tip-icon">2️⃣</span>
                                <span>{isArabic ? 'اربط العادة الجديدة بعادة يومية موجودة (مثل: تأمل بعد تنظيف الأسنان)' : 'Attach the new habit to an existing daily habit (e.g., meditate after brushing teeth)'}</span>
                            </li>
                            <li>
                                <span className="tip-icon">3️⃣</span>
                                <span>{isArabic ? 'سجل تقدمك يومياً لترى التحسن' : 'Track your progress daily to see improvement'}</span>
                            </li>
                            <li>
                                <span className="tip-icon">4️⃣</span>
                                <span>{isArabic ? 'كافئ نفسك عند تحقيق أهدافك الأسبوعية' : 'Reward yourself when you achieve your weekly goals'}</span>
                            </li>
                            <li>
                                <span className="tip-icon">5️⃣</span>
                                <span>{isArabic ? 'كن صبوراً مع نفسك - تكوين العادات يحتاج وقتاً' : 'Be patient with yourself - building habits takes time'}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
            
            {/* تذييل */}
            <div className="analysis-footer">
                <small>
                    {isArabic ? '🤖 التحليل مدعوم بالذكاء الاصطناعي بناءً على بياناتك المسجلة' : '🤖 AI-powered analysis based on your recorded health data'}
                </small>
            </div>
            
            <style jsx>{`
                /* ============================================
                   SmartAnalysis.css - الأنماط الداخلية فقط
                   ✅ تحليل ذكي شامل مع توصيات مخصصة
                   ✅ متوافق مع الثيمين (فاتح/داكن)
                   ✅ دعم كامل للغة العربية والإنجليزية
                   ============================================ */
                
                /* الحاوية الرئيسية */
                .smart-analysis-container {
                    background: var(--card-bg, #ffffff);
                    border-radius: 28px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light, #eef2f6);
                    transition: all 0.2s ease;
                }
                
                .dark-mode .smart-analysis-container {
                    background: #1e293b;
                    border-color: #334155;
                }
                
                /* رأس الصفحة */
                .analysis-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light, #eef2f6);
                }
                
                .dark-mode .analysis-header {
                    border-bottom-color: #334155;
                }
                
                .analysis-header h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    font-size: 1.35rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .dark-mode .analysis-header h2 {
                    background: linear-gradient(135deg, #a78bfa, #f472b6);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .header-icon {
                    font-size: 1.5rem;
                }
                
                .refresh-btn {
                    width: 38px;
                    height: 38px;
                    background: var(--secondary-bg, #f8fafc);
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary, #64748b);
                }
                
                .dark-mode .refresh-btn {
                    background: #0f172a;
                    border-color: #334155;
                    color: #94a3b8;
                }
                
                .refresh-btn:hover {
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    color: white;
                    transform: rotate(180deg);
                }
                
                /* بطاقة درجة الصحة */
                .health-score-card {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
                    border-radius: 24px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    color: white;
                }
                
                .score-header {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 1rem;
                }
                
                .score-circle {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.1);
                    border: 4px solid;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }
                
                .score-value {
                    font-size: 2.5rem;
                    font-weight: 800;
                    line-height: 1;
                }
                
                .score-max {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
                
                .score-info {
                    flex: 1;
                }
                
                .score-grade {
                    font-size: 1.8rem;
                    font-weight: 800;
                }
                
                .grade-a, .grade-a-plus { color: #10b981; }
                .grade-b, .grade-b-plus { color: #3b82f6; }
                .grade-c, .grade-c-plus { color: #f59e0b; }
                .grade-d { color: #ef4444; }
                
                .score-status {
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                
                .score-details summary {
                    cursor: pointer;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 0.75rem;
                }
                
                .score-factors {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .score-factor {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 0.75rem;
                }
                
                .factor-name {
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .factor-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                    overflow: hidden;
                    margin: 0.5rem 0;
                }
                
                .factor-fill {
                    height: 100%;
                    border-radius: 3px;
                    transition: width 0.3s ease;
                }
                
                .factor-fill.excellent { background: #10b981; }
                .factor-fill.good { background: #3b82f6; }
                .factor-fill.fair { background: #f59e0b; }
                .factor-fill.poor { background: #ef4444; }
                
                .factor-score {
                    font-size: 0.7rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .factor-message {
                    font-size: 0.65rem;
                    opacity: 0.8;
                }
                
                /* الإحصائيات السريعة */
                .quick-stats {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .stat-item {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 16px;
                    padding: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .stat-item {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .stat-icon {
                    font-size: 1.5rem;
                }
                
                .stat-info {
                    flex: 1;
                }
                
                .stat-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .stat-value {
                    color: #f1f5f9;
                }
                
                .stat-label {
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                    text-transform: uppercase;
                }
                
                /* التبويبات */
                .analysis-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                    padding-bottom: 0.5rem;
                }
                
                .dark-mode .analysis-tabs {
                    border-bottom-color: #334155;
                }
                
                .tab-btn {
                    background: transparent;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    color: var(--text-secondary, #64748b);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .dark-mode .tab-btn {
                    color: #94a3b8;
                }
                
                .tab-btn.active {
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    color: white;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
                }
                
                .rec-badge {
                    background: #ef4444;
                    color: white;
                    border-radius: 20px;
                    padding: 0.1rem 0.4rem;
                    font-size: 0.6rem;
                    margin-left: 0.25rem;
                }
                
                /* محتوى التبويبات */
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
                
                /* بطاقات التحليل */
                .analysis-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-left: 4px solid;
                }
                
                .dark-mode .analysis-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .card-icon {
                    font-size: 1.5rem;
                }
                
                .card-header h3 {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .card-header h3 {
                    color: #f1f5f9;
                }
                
                .card-value {
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .card-content p {
                    font-size: 0.8rem;
                    color: var(--text-secondary, #64748b);
                    margin: 0 0 0.75rem 0;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    padding: 0.25rem 0;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .dark-mode .info-row {
                    border-top-color: #334155;
                }
                
                /* بطاقة المعلومات الإضافية */
                .info-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-top: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .info-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .info-card h3 {
                    margin: 0 0 1rem 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .info-card h3 {
                    color: #f1f5f9;
                }
                
                .info-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                /* قائمة التوصيات */
                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .recommendation-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                    transition: all 0.2s;
                }
                
                .dark-mode .recommendation-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .recommendation-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                
                .recommendation-card.priority-high {
                    border-left: 4px solid #ef4444;
                }
                
                .recommendation-card.priority-medium {
                    border-left: 4px solid #f59e0b;
                }
                
                .recommendation-card.priority-low {
                    border-left: 4px solid #10b981;
                }
                
                [dir="rtl"] .recommendation-card.priority-high { border-left: none; border-right: 4px solid #ef4444; }
                [dir="rtl"] .recommendation-card.priority-medium { border-left: none; border-right: 4px solid #f59e0b; }
                [dir="rtl"] .recommendation-card.priority-low { border-left: none; border-right: 4px solid #10b981; }
                
                .rec-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                    flex-wrap: wrap;
                }
                
                .rec-icon {
                    font-size: 1.5rem;
                }
                
                .rec-info {
                    flex: 1;
                }
                
                .rec-category {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--text-tertiary, #94a3b8);
                    text-transform: uppercase;
                }
                
                .rec-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                
                .dark-mode .rec-title {
                    color: #f1f5f9;
                }
                
                .rec-priority {
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                }
                
                .rec-priority.priority-high {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }
                
                .rec-priority.priority-medium {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }
                
                .rec-priority.priority-low {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }
                
                .rec-message {
                    font-size: 0.85rem;
                    color: var(--text-secondary, #64748b);
                    margin-bottom: 0.75rem;
                    line-height: 1.4;
                }
                
                .rec-advice {
                    background: var(--card-bg, #ffffff);
                    padding: 0.75rem;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    color: var(--text-primary, #0f172a);
                    margin-bottom: 0.75rem;
                    border-left: 3px solid #10b981;
                }
                
                .dark-mode .rec-advice {
                    background: #1e293b;
                    color: #f1f5f9;
                }
                
                [dir="rtl"] .rec-advice {
                    border-left: none;
                    border-right: 3px solid #10b981;
                }
                
                .rec-actions {
                    margin-bottom: 0.75rem;
                }
                
                .rec-actions strong {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                }
                
                .rec-actions ul {
                    margin: 0.5rem 0 0 1.25rem;
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                }
                
                [dir="rtl"] .rec-actions ul {
                    margin: 0.5rem 1.25rem 0 0;
                }
                
                .rec-actions li {
                    margin-bottom: 0.25rem;
                }
                
                .rec-basedon {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .rec-basedon {
                    border-top-color: #334155;
                }
                
                /* بطاقات الرؤى والتحليلات */
                .insights-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .insights-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .insights-card h3 {
                    margin: 0 0 1rem 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .dark-mode .insights-card h3 {
                    color: #f1f5f9;
                }
                
                .insight-item {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .insight-item {
                    border-bottom-color: #334155;
                }
                
                .insight-item:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                    padding-bottom: 0;
                }
                
                .insight-icon {
                    font-size: 1.2rem;
                }
                
                .insight-content p {
                    margin: 0;
                    font-size: 0.8rem;
                    color: var(--text-secondary, #64748b);
                    line-height: 1.4;
                }
                
                /* قائمة النصائح */
                .tips-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .tips-list li {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.6rem 0;
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                    font-size: 0.8rem;
                    color: var(--text-secondary, #64748b);
                }
                
                .dark-mode .tips-list li {
                    border-bottom-color: #334155;
                    color: #94a3b8;
                }
                
                .tips-list li:last-child {
                    border-bottom: none;
                }
                
                .tip-icon {
                    font-size: 1rem;
                    font-weight: 700;
                }
                
                /* حالة فارغة */
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .empty-state {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                    opacity: 0.5;
                }
                
                .empty-state p {
                    font-size: 0.85rem;
                    color: var(--text-secondary, #64748b);
                }
                
                .empty-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                    margin-top: 0.5rem;
                }
                
                /* تذييل الصفحة */
                .analysis-footer {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    text-align: center;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                
                .dark-mode .analysis-footer {
                    border-top-color: #334155;
                }
                
                /* حالات التحميل والخطأ */
                .loading-spinner {
                    text-align: center;
                    padding: 3rem;
                }
                
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid var(--border-light, #e2e8f0);
                    border-top-color: #8b5cf6;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .error-container {
                    text-align: center;
                    padding: 3rem;
                }
                
                .error-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .error-container p {
                    font-size: 0.85rem;
                    color: #ef4444;
                    margin-bottom: 1rem;
                }
                
                .retry-btn {
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    color: white;
                    border: none;
                    padding: 0.6rem 1.25rem;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                
                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                }
                
                /* دعم RTL */
                [dir="rtl"] .card-header {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .stat-item {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .rec-header {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .insight-item {
                    flex-direction: row-reverse;
                }
                
                /* دعم الحركة المخفضة */
                @media (prefers-reduced-motion: reduce) {
                    .spinner {
                        animation: none;
                    }
                    
                    .tab-content {
                        animation: none;
                    }
                    
                    .recommendation-card:hover {
                        transform: none;
                    }
                    
                    .retry-btn:hover {
                        transform: none;
                    }
                }
                
                /* دعم الشاشات الصغيرة */
                @media (max-width: 768px) {
                    .smart-analysis-container {
                        padding: 1rem;
                    }
                    
                    .quick-stats {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.5rem;
                    }
                    
                    .stat-icon {
                        font-size: 1.2rem;
                    }
                    
                    .stat-value {
                        font-size: 0.9rem;
                    }
                    
                    .analysis-tabs {
                        flex-wrap: wrap;
                    }
                    
                    .tab-btn {
                        padding: 0.4rem 0.75rem;
                        font-size: 0.75rem;
                    }
                    
                    .score-header {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default SmartAnalysis;
