// src/components/ProfileManager.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

// ==================== دوال مساعدة ====================

const extractDataSafely = (response) => {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results && Array.isArray(response.data.results)) return response.data.results;
    if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    if (response.data.items && Array.isArray(response.data.items)) return response.data.items;
    return [];
};

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return roundNumber(weight / (heightInMeters * heightInMeters), 1);
};

const getBMICategory = (bmi, isArabic) => {
    if (bmi < 18.5) return { category: isArabic ? 'نقص وزن' : 'Underweight', color: '#f59e0b', icon: '⚠️', advice: isArabic ? 'تحتاج لزيادة وزن صحي' : 'Need healthy weight gain' };
    if (bmi < 25) return { category: isArabic ? 'وزن طبيعي' : 'Normal', color: '#10b981', icon: '✅', advice: isArabic ? 'وزنك ممتاز، حافظ عليه' : 'Excellent weight, keep it up' };
    if (bmi < 30) return { category: isArabic ? 'زيادة وزن' : 'Overweight', color: '#f97316', icon: '⚠️', advice: isArabic ? 'تحتاج لخسارة وزن تدريجية' : 'Need gradual weight loss' };
    return { category: isArabic ? 'سمنة' : 'Obese', color: '#ef4444', icon: '🔴', advice: isArabic ? 'يُنصح باستشارة طبيب لوضع خطة صحية' : 'Consult a doctor for a health plan' };
};

// ✅ دالة محسنة لحساب التقدم نحو الهدف مع حماية من الأخطاء
const calculateGoalProgress = (goal, currentData, isArabic) => {
    if (!goal || !currentData) return { progress: 0, remaining: 0, status: 'unknown', daysLeft: 0, isAchieved: false, currentValue: 0, targetValue: 0, message: '' };
    
    let currentValue = 0;
    let targetValue = parseFloat(goal.target_value) || 0;
    let startValue = parseFloat(goal.start_value) || 0;
    
    // جلب القيمة الحالية حسب نوع الهدف
    switch (goal.type) {
        case 'weight_loss':
        case 'weight_gain':
            currentValue = currentData.weight || 0;
            // إذا لم يكن هناك start_value، نستخدم target_value + 10% كتقدير معقول
            if (startValue === 0 && currentValue > 0) {
                startValue = goal.type === 'weight_loss' ? currentValue : targetValue;
            }
            break;
        case 'sleep':
            currentValue = currentData.sleep || 0;
            break;
        case 'activity':
            currentValue = currentData.activity || 0;
            break;
        case 'calories':
            currentValue = currentData.calories || 0;
            break;
        case 'habit':
            currentValue = currentData.habit_completion || 0;
            break;
        default:
            currentValue = goal.current_value || 0;
    }
    
    // التحقق من صحة البيانات
    if (targetValue === 0) {
        return { progress: 0, remaining: 0, status: 'error', daysLeft: 0, isAchieved: false, currentValue, targetValue, message: isArabic ? 'قيمة الهدف غير صحيحة' : 'Invalid target value' };
    }
    
    if (currentValue === 0) {
        return { progress: 0, remaining: targetValue, status: 'no_data', daysLeft: 0, isAchieved: false, currentValue, targetValue, message: isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data' };
    }
    
    let progress = 0;
    let isAchieved = false;
    let status = '';
    let message = '';
    
    // حساب التقدم حسب نوع الهدف
    if (goal.type === 'weight_loss') {
        if (currentValue <= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
            message = isArabic ? '🎉 تهانينا! لقد حققت هدف وزنك!' : '🎉 Congratulations! You achieved your weight goal!';
        } else {
            const totalToLose = startValue - targetValue;
            if (totalToLose <= 0) {
                progress = 0;
                status = 'error';
                message = isArabic ? 'بيانات الهدف غير صحيحة' : 'Invalid goal data';
            } else {
                const lostSoFar = startValue - currentValue;
                progress = Math.min(99, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));
                status = progress > 0 ? 'on_track' : 'off_track';
                if (currentValue > startValue) {
                    message = isArabic ? '⚠️ لاحظنا زيادة في وزنك، حاول الالتزام بالخطة' : '⚠️ We noticed weight gain, try to stick to the plan';
                }
            }
        }
    } 
    else if (goal.type === 'weight_gain') {
        if (currentValue >= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
            message = isArabic ? '🎉 تهانينا! لقد حققت هدف وزنك!' : '🎉 Congratulations! You achieved your weight goal!';
        } else {
            const totalToGain = targetValue - startValue;
            if (totalToGain <= 0) {
                progress = 0;
                status = 'error';
                message = isArabic ? 'بيانات الهدف غير صحيحة' : 'Invalid goal data';
            } else {
                const gainedSoFar = currentValue - startValue;
                progress = Math.min(99, Math.max(0, Math.round((gainedSoFar / totalToGain) * 100)));
                status = progress > 0 ? 'on_track' : 'off_track';
            }
        }
    } 
    else {
        // للأهداف العامة (نوم، نشاط، سعرات، عادات)
        if (currentValue >= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
            message = isArabic ? '🎉 تهانينا! لقد حققت هدفك!' : '🎉 Congratulations! You achieved your goal!';
        } else {
            progress = Math.min(99, Math.max(0, Math.round((currentValue / targetValue) * 100)));
            status = progress > 0 ? 'on_track' : 'off_track';
        }
    }
    
    // حساب الأيام المتبقية
    let daysLeft = 0;
    let dailyRate = 0;
    try {
        const targetDate = new Date(goal.target_date);
        const today = new Date();
        if (!isNaN(targetDate.getTime())) {
            daysLeft = Math.max(0, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)));
        }
        
        if (daysLeft > 0 && progress < 100 && !isAchieved && targetValue !== currentValue) {
            const remaining = Math.abs(targetValue - currentValue);
            dailyRate = roundNumber(remaining / daysLeft, 1);
        }
    } catch (e) {
        console.error('Error calculating days:', e);
    }
    
    return {
        progress: Math.min(100, Math.max(0, progress)),
        remaining: Math.abs(targetValue - currentValue),
        status,
        daysLeft,
        dailyRate,
        currentValue: roundNumber(currentValue, 1),
        targetValue,
        isAchieved,
        message,
        startValue: roundNumber(startValue, 1)
    };
};

// دالة تغيير اللغة العامة
const setAppLanguage = (lang, isArabic) => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    const languageChangeEvent = new CustomEvent('languageChange', { detail: { lang, isArabic } });
    window.dispatchEvent(languageChangeEvent);
};

// ==================== المكون الرئيسي ====================

function ProfileManager({ isAuthReady }) {
    // --- حالات اللغة ---
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // --- حالات المستخدم (محسنة) ---
    const [userData, setUserData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        phone_number: '',
        initial_weight: '',
        height: '',
        occupation_status: '',
        // ✅ حقول جديدة
        health_goal: '', // loss / gain / maintain
        activity_level: '', // low / medium / high
        chronic_conditions: '',
        current_medications: ''
    });
    
    // --- حالات أخرى ---
    const [healthGoals, setHealthGoals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });
    
    // --- بيانات صحية حالية ---
    const [healthData, setHealthData] = useState({
        weight: null,
        sleep: null,
        activity: null,
        calories: null,
        mood: null,
        habit_completion: null
    });
    
    // --- كلمة المرور ---
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    
    // --- الأهداف الجديدة ---
    const [newGoal, setNewGoal] = useState({
        title: '',
        type: 'general',
        target_value: '',
        unit: 'kg',
        target_date: '',
        start_value: ''
    });
    
    // --- الإعدادات (محسنة) ---
    const [settings, setSettings] = useState({
        notifications: true,
        language: isArabic ? 'ar' : 'en',
        darkMode: false,
        notificationTypes: {
            sleep: true,
            activity: true,
            medication: true,
            water: true
        },
        privacy: {
            shareData: true,
            showOnlineStatus: true
        }
    });
    
    const [achievements, setAchievements] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    
    // --- تأثير الوضع الليلي ---
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);
    
    // --- تبديل اللغة ---
    const toggleLanguage = useCallback(() => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        const newIsArabic = newLang === 'ar';
        setLang(newLang);
        setSettings(prev => ({ ...prev, language: newLang }));
        setAppLanguage(newLang, newIsArabic);
        setMessage(newIsArabic ? '✅ تم تغيير اللغة إلى العربية' : '✅ Language changed to English');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
    }, [lang]);
    
    // --- الاستماع لتغييرات اللغة ---
    useEffect(() => {
        const handleExternalLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        window.addEventListener('languageChange', handleExternalLanguageChange);
        return () => window.removeEventListener('languageChange', handleExternalLanguageChange);
    }, [lang]);
    
    // --- حساب الـ Smart Profile المحسن ---
    const smartProfile = useMemo(() => {
        const weight = parseFloat(userData.initial_weight) || healthData.weight;
        const height = parseFloat(userData.height);
        
        if (!weight || !height) return null;
        
        const bmi = calculateBMI(weight, height);
        const bmiCategory = bmi ? getBMICategory(bmi, isArabic) : null;
        
        let age = null;
        if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        }
        
        // حساب درجة الصحة المحسنة
        let healthScore = 65;
        let healthScoreDetails = [];
        
        if (bmi) {
            if (bmi >= 18.5 && bmi <= 24.9) {
                healthScore += 15;
                healthScoreDetails.push(isArabic ? '✅ BMI مثالي' : '✅ Ideal BMI');
            } else if (bmi >= 25 && bmi <= 29.9) {
                healthScore -= 5;
                healthScoreDetails.push(isArabic ? '⚠️ BMI مرتفع قليلاً' : '⚠️ Slightly high BMI');
            } else if (bmi >= 30) {
                healthScore -= 15;
                healthScoreDetails.push(isArabic ? '🔴 BMI مرتفع' : '🔴 High BMI');
            } else if (bmi < 18.5) {
                healthScore -= 10;
                healthScoreDetails.push(isArabic ? '⚠️ BMI منخفض' : '⚠️ Low BMI');
            }
        }
        
        if (healthData.sleep) {
            if (healthData.sleep >= 7 && healthData.sleep <= 8) {
                healthScore += 15;
                healthScoreDetails.push(isArabic ? '✅ نوم كافٍ' : '✅ Adequate sleep');
            } else if (healthData.sleep >= 6) {
                healthScore += 5;
                healthScoreDetails.push(isArabic ? '⚠️ نوم أقل من الموصى به' : '⚠️ Less than recommended sleep');
            } else {
                healthScore -= 10;
                healthScoreDetails.push(isArabic ? '🔴 نقص حاد في النوم' : '🔴 Severe sleep deficiency');
            }
        }
        
        if (healthData.activity) {
            if (healthData.activity >= 150) {
                healthScore += 15;
                healthScoreDetails.push(isArabic ? '✅ نشاط ممتاز' : '✅ Excellent activity');
            } else if (healthData.activity >= 75) {
                healthScore += 5;
                healthScoreDetails.push(isArabic ? '⚠️ نشاط متوسط' : '⚠️ Moderate activity');
            } else {
                healthScore -= 5;
                healthScoreDetails.push(isArabic ? '⚠️ نشاط قليل' : '⚠️ Low activity');
            }
        }
        
        healthScore = Math.min(100, Math.max(0, healthScore));
        
        return { bmi, bmiCategory, age, healthScore, healthScoreDetails, weight, height };
    }, [userData.initial_weight, userData.height, userData.date_of_birth, healthData, isArabic]);
    
    // --- التوصيات الذكية المحسنة ---
    const getPersonalizedRecommendations = useMemo(() => {
        const recommendations = [];
        const occupation = userData.occupation_status;
        const bmi = smartProfile?.bmi;
        const activityLevel = userData.activity_level;
        const healthGoal = userData.health_goal;
        
        // توصيات حسب المهنة
        if (occupation === 'Student') {
            recommendations.push({ icon: '📚', text: isArabic ? 'حاول النوم 7-8 ساعات لتحسين التركيز والتحصيل الدراسي' : 'Try to sleep 7-8 hours to improve focus and academic performance', priority: 'high' });
            recommendations.push({ icon: '🍎', text: isArabic ? 'تناول وجبات متوازنة تحتوي على بروتين وخضروات أثناء فترة الامتحانات' : 'Eat balanced meals with protein and vegetables during exams', priority: 'medium' });
            recommendations.push({ icon: '🏃', text: isArabic ? 'خذ استراحة قصيرة كل ساعة لممارسة تمارين الإطالة' : 'Take a short break every hour for stretching exercises', priority: 'low' });
        } else if (occupation === 'Full-Time') {
            recommendations.push({ icon: '💼', text: isArabic ? 'مارس المشي لمدة 10 دقائق خلال فترة الغداء لتحسين النشاط' : 'Walk for 10 minutes during lunch break to improve activity', priority: 'high' });
            recommendations.push({ icon: '🧘', text: isArabic ? 'جرب تمارين التنفس العميق لتخفيف ضغط العمل وتحسين المزاج' : 'Try deep breathing exercises to relieve work stress and improve mood', priority: 'medium' });
            recommendations.push({ icon: '💧', text: isArabic ? 'احتفظ بقربة ماء على مكتبك لتذكيرك بشرب الماء بانتظام' : 'Keep a water bottle on your desk to remind you to drink water regularly', priority: 'medium' });
        } else if (occupation === 'Freelancer') {
            recommendations.push({ icon: '⏰', text: isArabic ? 'حدد روتيناً يومياً ثابتاً للنوم والاستيقاظ لتنظيم ساعتك البيولوجية' : 'Set a consistent daily routine for sleep and wake-up to regulate your biological clock', priority: 'high' });
            recommendations.push({ icon: '🏋️', text: isArabic ? 'خصص وقتاً ثابتاً يومياً لممارسة الرياضة مهما كان قصيراً' : 'Set a fixed daily time for exercise, no matter how short', priority: 'medium' });
        }
        
        // توصيات حسب BMI
        if (bmi) {
            if (bmi < 18.5) {
                recommendations.push({ icon: '🥑', text: isArabic ? 'أضف مصادر صحية للدهون مثل الأفوكادو والمكسرات لزيادة الوزن بشكل صحي' : 'Add healthy fat sources like avocado and nuts for healthy weight gain', priority: 'high' });
                recommendations.push({ icon: '🥩', text: isArabic ? 'ركز على البروتينات والكربوهيدرات المعقدة لبناء الكتلة العضلية' : 'Focus on proteins and complex carbohydrates to build muscle mass', priority: 'medium' });
            } else if (bmi > 25) {
                recommendations.push({ icon: '🏃', text: isArabic ? 'زد نشاطك البدني تدريجياً إلى 30 دقيقة يومياً 5 أيام في الأسبوع' : 'Gradually increase physical activity to 30 minutes daily, 5 days a week', priority: 'high' });
                recommendations.push({ icon: '🥗', text: isArabic ? 'قلل من السكريات والمأكولات المصنعة، وزع من الخضروات والبروتين' : 'Reduce sugars and processed foods, increase vegetables and protein', priority: 'high' });
            }
        }
        
        // توصيات حسب مستوى النشاط
        if (activityLevel === 'low') {
            recommendations.push({ icon: '🚶', text: isArabic ? 'ابدأ بالمشي 10 دقائق يومياً، ثم زد التدريجياً' : 'Start with 10 minutes of walking daily, then gradually increase', priority: 'high' });
        } else if (activityLevel === 'medium' && healthData.activity < 150) {
            recommendations.push({ icon: '📈', text: isArabic ? 'أنت في مستوى جيد، حاول زيادة نشاطك الأسبوعي إلى 150 دقيقة' : 'You are at a good level, try to increase your weekly activity to 150 minutes', priority: 'medium' });
        }
        
        // توصيات حسب الهدف الصحي
        if (healthGoal === 'loss' && bmi && bmi < 25) {
            recommendations.push({ icon: '⚖️', text: isArabic ? 'وزنك ضمن المعدل الطبيعي، ركز على التثبيت بدلاً من الخسارة' : 'Your weight is normal, focus on maintenance rather than loss', priority: 'info' });
        } else if (healthGoal === 'gain' && bmi && bmi > 25) {
            recommendations.push({ icon: '⚖️', text: isArabic ? 'وزنك مرتفع، ركز على الخسارة بدلاً من الزيادة' : 'Your weight is high, focus on loss rather than gain', priority: 'info' });
        }
        
        // توصيات حسب بيانات النوم
        if (healthData.sleep && healthData.sleep < 7) {
            recommendations.push({ icon: '😴', text: isArabic ? `متوسط نومك ${healthData.sleep} ساعات. حاول النوم قبل منتصف الليل ب 30 دقيقة يومياً` : `Your average sleep is ${healthData.sleep} hours. Try to sleep 30 minutes earlier each day`, priority: 'high' });
        } else if (healthData.sleep && healthData.sleep > 9) {
            recommendations.push({ icon: '😴', text: isArabic ? 'نومك أكثر من المعدل الطبيعي، حاول تحديد عدد ساعات نوم منتظمة' : 'You sleep more than average, try to set a regular sleep schedule', priority: 'low' });
        }
        
        return recommendations.slice(0, 5);
    }, [userData.occupation_status, userData.activity_level, userData.health_goal, smartProfile?.bmi, healthData, isArabic]);
    
    // --- إحصائيات الأهداف المحسنة ---
    const goalsStats = useMemo(() => {
        const total = healthGoals.length;
        const completed = healthGoals.filter(g => {
            const progress = calculateGoalProgress(g, healthData, isArabic);
            return progress.isAchieved || g.is_achieved;
        }).length;
        const inProgress = total - completed;
        const avgProgress = total > 0 ? Math.round(healthGoals.reduce((sum, g) => {
            const progress = calculateGoalProgress(g, healthData, isArabic);
            return sum + progress.progress;
        }, 0) / total) : 0;
        
        let totalDaysLeft = 0;
        healthGoals.forEach(g => {
            if (!g.is_achieved) {
                const progress = calculateGoalProgress(g, healthData, isArabic);
                totalDaysLeft += progress.daysLeft;
            }
        });
        
        return { total, completed, inProgress, avgProgress, totalDaysLeft };
    }, [healthGoals, healthData, isArabic]);
    
    // --- تأثيرات التحميل الأولي ---
    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);
    
    useEffect(() => {
        if (isAuthReady) {
            fetchUserData();
            fetchHealthGoals();
            fetchCurrentHealthData();
            loadAchievements();
            loadSavedSettings();
        }
    }, [isAuthReady]);
    
    useEffect(() => {
        if (healthData.weight || healthData.sleep || healthData.activity || healthData.calories) {
            checkAndUpdateGoalsAutomatically();
        }
    }, [healthData]);
    
    // --- دوال API ---
    const loadSavedSettings = () => {
        try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings(prev => ({ ...prev, ...parsedSettings }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };
    
    const fetchCurrentHealthData = async () => {
        try {
            const [sleepRes, activitiesRes, mealsRes, moodRes, healthRes, habitsRes] = await Promise.all([
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] }))
            ]);
            
            const sleepData = extractDataSafely(sleepRes);
            const activitiesData = extractDataSafely(activitiesRes);
            const mealsData = extractDataSafely(mealsRes);
            const moodData = extractDataSafely(moodRes);
            const healthDataRes = extractDataSafely(healthRes);
            const habitsData = extractDataSafely(habitsRes);
            
            // حساب متوسط النوم
            let avgSleep = 0;
            if (sleepData.length > 0) {
                const hours = sleepData.map(s => {
                    const start = new Date(s.sleep_start || s.start_time);
                    const end = new Date(s.sleep_end || s.end_time);
                    return (end - start) / (1000 * 60 * 60);
                }).filter(h => h > 0 && h < 24);
                if (hours.length > 0) avgSleep = roundNumber(hours.reduce((a, b) => a + b, 0) / hours.length, 1);
            }
            
            // حساب النشاط الأسبوعي
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyActivity = activitiesData.filter(a => {
                const date = new Date(a.start_time || a.created_at);
                return date >= weekAgo;
            }).reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
            
            // حساب متوسط السعرات
            let avgCalories = 0;
            if (mealsData.length > 0) {
                const validCalories = mealsData.map(m => m.total_calories || 0).filter(c => c > 0);
                if (validCalories.length > 0) avgCalories = Math.round(validCalories.reduce((a, b) => a + b, 0) / validCalories.length);
            }
            
            // حساب متوسط المزاج
            let avgMood = 0;
            if (moodData.length > 0) {
                const getScore = (m) => {
                    const moodMap = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1, 'Happy': 4, 'Normal': 3, 'Bad': 2 };
                    const moodValue = m.mood || m.mood_state || 'Neutral';
                    return moodMap[moodValue] || 3;
                };
                const scores = moodData.map(m => getScore(m)).filter(s => s > 0);
                if (scores.length > 0) avgMood = roundNumber(scores.reduce((a, b) => a + b, 0) / scores.length, 1);
            }
            
            // حساب إنجاز العادات
            let habitCompletion = 0;
            if (habitsData.length > 0) {
                const completed = habitsData.filter(h => h.is_completed === true).length;
                habitCompletion = Math.round((completed / habitsData.length) * 100);
            }
            
            // أحدث وزن
            let latestWeight = null;
            if (healthDataRes.length > 0) {
                const sortedHealth = [...healthDataRes].sort((a, b) => {
                    const dateA = new Date(a.recorded_at || a.created_at);
                    const dateB = new Date(b.recorded_at || b.created_at);
                    return dateB - dateA;
                });
                latestWeight = sortedHealth[0]?.weight_kg || sortedHealth[0]?.weight || null;
            }
            
            setHealthData({ weight: latestWeight, sleep: avgSleep, activity: weeklyActivity, calories: avgCalories, mood: avgMood, habit_completion: habitCompletion });
        } catch (error) {
            console.error('Error fetching health data:', error);
        }
    };
    
    const fetchUserData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/profile/');
            let userDataFromApi = {};
            if (response.data?.data) userDataFromApi = response.data.data;
            else if (response.data && typeof response.data === 'object') userDataFromApi = response.data;
            
            setUserData({
                username: userDataFromApi.username || '',
                email: userDataFromApi.email || '',
                first_name: userDataFromApi.first_name || '',
                last_name: userDataFromApi.last_name || '',
                date_of_birth: userDataFromApi.date_of_birth || '',
                gender: userDataFromApi.gender || '',
                phone_number: userDataFromApi.phone_number || '',
                initial_weight: userDataFromApi.initial_weight?.toString() || '',
                height: userDataFromApi.height?.toString() || '',
                occupation_status: userDataFromApi.occupation || userDataFromApi.occupation_status || '',
                health_goal: userDataFromApi.health_goal || '',
                activity_level: userDataFromApi.activity_level || '',
                chronic_conditions: userDataFromApi.chronic_conditions || '',
                current_medications: userDataFromApi.current_medications || ''
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            setMessage(isArabic ? 'خطأ في تحميل بيانات المستخدم' : 'Error loading user data');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchHealthGoals = async () => {
        try {
            const response = await axiosInstance.get('/goals/');
            let goalsData = [];
            if (Array.isArray(response.data)) goalsData = response.data;
            else if (response.data && Array.isArray(response.data.results)) goalsData = response.data.results;
            setHealthGoals(goalsData);
        } catch (error) {
            console.error('Error fetching health goals:', error);
            setHealthGoals([]);
        }
    };
    
    const loadAchievements = async () => {
        try {
            const response = await axiosInstance.get('/achievements/').catch(() => ({ data: [] }));
            setAchievements(response.data || []);
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    };
    
    const checkAndUpdateGoalsAutomatically = async () => {
        for (const goal of healthGoals) {
            const progress = calculateGoalProgress(goal, healthData, isArabic);
            if (progress.isAchieved && !goal.is_achieved) await markGoalAsAchieved(goal.id);
            else if (progress.currentValue !== goal.current_value && !goal.is_achieved) await updateGoalProgress(goal.id, progress.currentValue);
        }
    };
    
    const markGoalAsAchieved = async (goalId) => {
        try {
            await axiosInstance.patch(`/goals/${goalId}/`, { is_achieved: true, achieved_date: new Date().toISOString() });
            setMessage(isArabic ? '🎉 تم تحقيق الهدف تلقائياً! مبروك!' : '🎉 Goal automatically achieved! Congratulations!');
            setMessageType('success');
            fetchHealthGoals();
            const achievedGoal = healthGoals.find(g => g.id === goalId);
            if (achievedGoal) await addAchievement({ title: achievedGoal.title, type: 'goal_completed', date: new Date().toISOString() });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error marking goal as achieved:', error);
        }
    };
    
    const addAchievement = async (achievement) => {
        try {
            await axiosInstance.post('/achievements/', achievement);
            loadAchievements();
        } catch (error) {
            console.error('Error adding achievement:', error);
        }
    };
    
    const updateGoalProgress = async (goalId, currentValue) => {
        try {
            await axiosInstance.patch(`/goals/${goalId}/`, { current_value: currentValue });
            fetchHealthGoals();
        } catch (error) {
            console.error('Error updating goal:', error);
        }
    };
    
    // --- تحديث الملف الشخصي (محسن) ---
    const handleUserUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        
        try {
            const updateData = {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email || null,
                date_of_birth: userData.date_of_birth || null,
                gender: userData.gender || null,
                phone_number: userData.phone_number || null,
                initial_weight: userData.initial_weight ? parseFloat(userData.initial_weight) : null,
                height: userData.height ? parseFloat(userData.height) : null,
                occupation: userData.occupation_status || null,
                health_goal: userData.health_goal || null,
                activity_level: userData.activity_level || null,
                chronic_conditions: userData.chronic_conditions || null,
                current_medications: userData.current_medications || null
            };
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '' || updateData[key] === null) delete updateData[key];
            });
            
            await axiosInstance.put('/profile/', updateData);
            setMessage(isArabic ? '✅ تم تحديث الملف الشخصي بنجاح' : '✅ Profile updated successfully');
            setMessageType('success');
            await fetchUserData();
            await fetchCurrentHealthData();
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage(isArabic ? '❌ خطأ في تحديث الملف الشخصي' : '❌ Error updating profile');
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // --- تغيير كلمة المرور ---
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangingPassword(true);
        setMessage('');
        
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage(isArabic ? '❌ كلمة المرور الجديدة غير متطابقة' : '❌ New passwords do not match');
            setMessageType('error');
            setChangingPassword(false);
            return;
        }
        
        if (passwordData.new_password.length < 8) {
            setMessage(isArabic ? '❌ كلمة المرور قصيرة جداً (8 أحرف على الأقل)' : '❌ Password too short (minimum 8 characters)');
            setMessageType('error');
            setChangingPassword(false);
            return;
        }
        
        try {
            await axiosInstance.post('/change-password/', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            setMessage(isArabic ? '✅ تم تغيير كلمة المرور بنجاح' : '✅ Password changed successfully');
            setMessageType('success');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage(error.response?.status === 400 
                ? (isArabic ? '❌ كلمة المرور الحالية غير صحيحة' : '❌ Current password is incorrect')
                : (isArabic ? '❌ خطأ في تغيير كلمة المرور' : '❌ Error changing password'));
            setMessageType('error');
        } finally {
            setChangingPassword(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // --- إضافة هدف جديد (محسن) ---
    const handleAddGoal = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            if (!newGoal.title || !newGoal.target_value || !newGoal.target_date) {
                setMessage(isArabic ? '❌ الرجاء ملء جميع الحقول المطلوبة' : '❌ Please fill all required fields');
                setMessageType('error');
                setSaving(false);
                return;
            }
            
            const targetValue = parseFloat(newGoal.target_value);
            if (isNaN(targetValue) || targetValue <= 0) {
                setMessage(isArabic ? '❌ القيمة المستهدفة غير صحيحة' : '❌ Invalid target value');
                setMessageType('error');
                setSaving(false);
                return;
            }
            
            let startValue = 0;
            switch (newGoal.type) {
                case 'weight_loss':
                case 'weight_gain':
                    startValue = parseFloat(userData.initial_weight) || healthData.weight || targetValue + (newGoal.type === 'weight_loss' ? 5 : -5);
                    break;
                case 'sleep': startValue = healthData.sleep || 0; break;
                case 'activity': startValue = healthData.activity || 0; break;
                case 'calories': startValue = healthData.calories || 0; break;
                case 'habit': startValue = healthData.habit_completion || 0; break;
                default: startValue = newGoal.start_value ? parseFloat(newGoal.start_value) : 0;
            }
            
            const goalData = {
                title: newGoal.title.trim(),
                type: newGoal.type,
                target_value: targetValue,
                unit: newGoal.unit,
                target_date: newGoal.target_date,
                start_value: startValue,
                current_value: startValue,
                is_achieved: false,
                start_date: new Date().toISOString().split('T')[0]
            };
            
            const response = await axiosInstance.post('/goals/', goalData);
            setHealthGoals(prev => [...prev, response.data]);
            setNewGoal({ title: '', type: 'general', target_value: '', unit: 'kg', target_date: '', start_value: '' });
            setMessage(isArabic ? '✅ تم إضافة الهدف بنجاح' : '✅ Goal added successfully');
            setMessageType('success');
        } catch (error) {
            console.error('Error adding goal:', error);
            setMessage(isArabic ? '❌ خطأ في إضافة الهدف' : '❌ Error adding goal');
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const deleteGoal = async (goalId) => {
        if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا الهدف؟' : 'Are you sure you want to delete this goal?')) return;
        try {
            await axiosInstance.delete(`/goals/${goalId}/`);
            setHealthGoals(prev => prev.filter(goal => goal.id !== goalId));
            setMessage(isArabic ? '✅ تم حذف الهدف بنجاح' : '✅ Goal deleted successfully');
            setMessageType('success');
        } catch (error) {
            console.error('Error deleting goal:', error);
            setMessage(isArabic ? '❌ خطأ في حذف الهدف' : '❌ Error deleting goal');
            setMessageType('error');
        } finally {
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            localStorage.setItem('appSettings', JSON.stringify(settings));
            setMessage(isArabic ? '✅ تم حفظ الإعدادات' : '✅ Settings saved');
            setMessageType('success');
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage(isArabic ? '❌ خطأ في حفظ الإعدادات' : '❌ Error saving settings');
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const handleDeleteAccount = async () => {
        if (!confirm(isArabic ? '⚠️ هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه!' : '⚠️ Are you sure? This action cannot be undone!')) return;
        const confirmation = prompt(isArabic ? 'اكتب "حذف" لتأكيد حذف حسابك' : 'Type "delete" to confirm account deletion');
        if (confirmation !== 'حذف' && confirmation !== 'delete') {
            setMessage(isArabic ? 'ℹ️ تم إلغاء العملية' : 'ℹ️ Operation cancelled');
            setMessageType('info');
            return;
        }
        
        setDeleting(true);
        try {
            await axiosInstance.delete('/delete-account/');
            localStorage.clear();
            setMessage(isArabic ? '✅ تم حذف الحساب بنجاح' : '✅ Account deleted successfully');
            setMessageType('success');
            setTimeout(() => { window.location.href = '/register'; }, 3000);
        } catch (error) {
            console.error('Error deleting account:', error);
            setMessage(isArabic ? '❌ خطأ في حذف الحساب' : '❌ Error deleting account');
            setMessageType('error');
        } finally {
            setDeleting(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };
    
    const handleExportData = async () => {
        setExporting(true);
        try {
            const response = await axiosInstance.get('/export-data/');
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const fileName = `livocare-data-${new Date().toISOString().split('T')[0]}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            setMessage(isArabic ? '✅ تم تصدير البيانات بنجاح' : '✅ Data exported successfully');
            setMessageType('success');
        } catch (error) {
            console.error('Error exporting data:', error);
            setMessage(isArabic ? '❌ خطأ في تصدير البيانات' : '❌ Error exporting data');
            setMessageType('error');
        } finally {
            setExporting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const handleFullBackup = async () => {
        if (!confirm(isArabic ? 'هل تريد إنشاء نسخة احتياطية كاملة؟' : 'Do you want to create a full backup?')) return;
        setExporting(true);
        try {
            const backupResponse = await axiosInstance.get('/export-data/');
            const backupData = { version: '1.0.0', timestamp: new Date().toISOString(), user: { profile: userData, settings }, data: backupResponse.data };
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const fileName = `livocare-backup-${new Date().toISOString().split('T')[0]}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            setMessage(isArabic ? '✅ تم إنشاء النسخة الاحتياطية بنجاح' : '✅ Backup created successfully');
            setMessageType('success');
        } catch (error) {
            console.error('Error creating backup:', error);
            setMessage(isArabic ? '❌ خطأ في إنشاء النسخة الاحتياطية' : '❌ Error creating backup');
            setMessageType('error');
        } finally {
            setExporting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const handleRestoreBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!confirm(isArabic ? '⚠️ تحذير: استعادة النسخة الاحتياطية ستستبدل بياناتك الحالية. هل تريد المتابعة؟' : '⚠️ Warning: Restoring backup will replace your current data. Continue?')) {
            event.target.value = '';
            return;
        }
        
        setLoading(true);
        try {
            const fileContent = await file.text();
            const backupData = JSON.parse(fileContent);
            if (!backupData.version || !backupData.data) throw new Error('Invalid backup file');
            setMessage(isArabic ? '✅ تم استعادة النسخة الاحتياطية بنجاح' : '✅ Backup restored successfully');
            setMessageType('success');
            fetchUserData();
            fetchHealthGoals();
            fetchCurrentHealthData();
        } catch (error) {
            console.error('Error restoring backup:', error);
            setMessage(isArabic ? '❌ خطأ في استعادة النسخة الاحتياطية' : '❌ Error restoring backup');
            setMessageType('error');
        } finally {
            setLoading(false);
            event.target.value = '';
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // --- عرض التحميل ---
    if (loading && !userData.username) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }
    
    // --- العرض الرئيسي ---
    return (
        <div className={`analytics-container ${reducedMotion ? 'reduce-motion' : ''} ${darkMode ? 'dark-theme' : ''}`}>
            {/* رأس الصفحة */}
            <div className="analytics-header">
                <div className="header-left">
                    <div className="avatar-placeholder">
                        {userData.first_name ? userData.first_name[0] : (userData.username ? userData.username[0] : '👤')}
                    </div>
                    <div>
                        <h2>{userData.first_name || userData.username || (isArabic ? 'الملف الشخصي' : 'Profile')}</h2>
                        <p className="user-email">{userData.email}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={() => setDarkMode(!darkMode)} className="lang-btn" title={isArabic ? (darkMode ? 'الوضع النهاري' : 'الوضع الليلي') : (darkMode ? 'Light mode' : 'Dark mode')}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="lang-btn">
                        {isArabic ? 'English' : 'العربية'}
                    </button>
                </div>
            </div>
            
            {/* Smart Profile Card محسن */}
            {smartProfile && (
                <div className="insight-card profile-card">
                    <div className="insight-icon">🧠</div>
                    <div className="insight-content">
                        <h3>{isArabic ? 'لمحة صحية ذكية' : 'Smart Health Profile'}</h3>
                        <div className="health-stats-grid">
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'مؤشر كتلة الجسم' : 'BMI'}</div>
                                <div className="stat-value" style={{ color: smartProfile.bmiCategory?.color }}>{smartProfile.bmi}</div>
                                <div className="stat-sub">{smartProfile.bmiCategory?.category}</div>
                                <div className="stat-advice">{smartProfile.bmiCategory?.advice}</div>
                            </div>
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'العمر' : 'Age'}</div>
                                <div className="stat-value">{smartProfile.age || '—'}</div>
                                <div className="stat-sub">{isArabic ? 'سنة' : 'years'}</div>
                            </div>
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'درجة الصحة' : 'Health Score'}</div>
                                <div className="stat-value">{smartProfile.healthScore}</div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${smartProfile.healthScore}%`, background: smartProfile.healthScore >= 70 ? '#10b981' : smartProfile.healthScore >= 50 ? '#f59e0b' : '#ef4444' }}></div>
                                </div>
                                <div className="stat-details">
                                    {smartProfile.healthScoreDetails?.slice(0, 2).map((detail, i) => (
                                        <span key={i} className="detail-badge">{detail}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* التوصيات */}
                        {getPersonalizedRecommendations.length > 0 && (
                            <div className="recommendations-box">
                                <div className="rec-header">
                                    <span>💡 {isArabic ? 'توصيات مخصصة لك' : 'Personalized Recommendations'}</span>
                                </div>
                                <div className="recommendations-list">
                                    {getPersonalizedRecommendations.map((rec, i) => (
                                        <div key={i} className={`rec-item priority-${rec.priority}`}>
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-text">{rec.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* التبويبات */}
            <div className="analytics-tabs">
                <button className={`type-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    📝 {isArabic ? 'الملف الشخصي' : 'Profile'}
                </button>
                <button className={`type-btn ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
                    🎯 {isArabic ? 'الأهداف' : 'Goals'}
                </button>
                <button className={`type-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    ⚙️ {isArabic ? 'الإعدادات' : 'Settings'}
                </button>
            </div>
            
            {/* الرسائل */}
            {message && (
                <div className={`notification-message ${messageType}`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}
            
            <div className="tab-content">
                {/* ==================== تبويب الملف الشخصي المحسن ==================== */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleUserUpdate}>
                        {/* المعلومات الأساسية */}
                        <div className="form-section">
                            <h3>📋 {isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</h3>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>{isArabic ? 'اسم المستخدم' : 'Username'}</label>
                                    <input type="text" value={userData.username} disabled className="disabled-input" />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                                    <input type="email" value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} placeholder={isArabic ? 'example@email.com' : 'example@email.com'} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الاسم الأول' : 'First Name'}</label>
                                    <input type="text" value={userData.first_name} onChange={(e) => setUserData({...userData, first_name: e.target.value})} placeholder={isArabic ? 'أدخل اسمك الأول' : 'Enter your first name'} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'اسم العائلة' : 'Last Name'}</label>
                                    <input type="text" value={userData.last_name} onChange={(e) => setUserData({...userData, last_name: e.target.value})} placeholder={isArabic ? 'أدخل اسم العائلة' : 'Enter your last name'} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
                                    <input type="date" value={userData.date_of_birth} onChange={(e) => setUserData({...userData, date_of_birth: e.target.value})} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'النوع' : 'Gender'}</label>
                                    <select value={userData.gender} onChange={(e) => setUserData({...userData, gender: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر النوع' : 'Select gender'}</option>
                                        <option value="M">{isArabic ? 'ذكر' : 'Male'}</option>
                                        <option value="F">{isArabic ? 'أنثى' : 'Female'}</option>
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</label>
                                    <input type="tel" value={userData.phone_number} onChange={(e) => setUserData({...userData, phone_number: e.target.value})} placeholder="+967XXXXXXXX" />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الوظيفة' : 'Occupation'}</label>
                                    <select value={userData.occupation_status} onChange={(e) => setUserData({...userData, occupation_status: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر الوظيفة' : 'Select occupation'}</option>
                                        <option value="Student">{isArabic ? 'طالب' : 'Student'}</option>
                                        <option value="Full-Time">{isArabic ? 'موظف بدوام كامل' : 'Full-Time Employee'}</option>
                                        <option value="Freelancer">{isArabic ? 'عمل حر' : 'Freelancer'}</option>
                                        <option value="Other">{isArabic ? 'أخرى' : 'Other'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* المعلومات الصحية المحسنة */}
                        <div className="form-section">
                            <h3>❤️ {isArabic ? 'المعلومات الصحية' : 'Health Information'}</h3>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>{isArabic ? 'الوزن الحالي' : 'Current Weight'}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.initial_weight} onChange={(e) => setUserData({...userData, initial_weight: e.target.value})} placeholder={isArabic ? 'مثال: 75' : 'e.g., 75'} />
                                        <span className="unit">kg</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الطول' : 'Height'}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.height} onChange={(e) => setUserData({...userData, height: e.target.value})} placeholder={isArabic ? 'مثال: 175' : 'e.g., 175'} />
                                        <span className="unit">cm</span>
                                    </div>
                                </div>
                                
                                {/* ✅ حقل الهدف الصحي الجديد */}
                                <div className="field-group">
                                    <label>🎯 {isArabic ? 'الهدف الصحي' : 'Health Goal'}</label>
                                    <select value={userData.health_goal} onChange={(e) => setUserData({...userData, health_goal: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر هدفك الصحي' : 'Select your health goal'}</option>
                                        <option value="loss">{isArabic ? '🔻 خسارة وزن' : '🔻 Weight Loss'}</option>
                                        <option value="gain">{isArabic ? '🔺 زيادة وزن' : '🔺 Weight Gain'}</option>
                                        <option value="maintain">{isArabic ? '⚖️ تثبيت الوزن' : '⚖️ Weight Maintenance'}</option>
                                    </select>
                                </div>
                                
                                {/* ✅ حقل مستوى النشاط الجديد */}
                                <div className="field-group">
                                    <label>🏃 {isArabic ? 'مستوى النشاط' : 'Activity Level'}</label>
                                    <select value={userData.activity_level} onChange={(e) => setUserData({...userData, activity_level: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر مستوى نشاطك' : 'Select your activity level'}</option>
                                        <option value="low">{isArabic ? '🪑 منخفض (قليل الحركة)' : '🪑 Low (Sedentary)'}</option>
                                        <option value="medium">{isArabic ? '🚶 متوسط (حركة معتدلة)' : '🚶 Medium (Moderate)'}</option>
                                        <option value="high">{isArabic ? '🏃 عالي (نشيط جداً)' : '🏃 High (Very active)'}</option>
                                    </select>
                                </div>
                                
                                {/* ✅ حقل الأمراض المزمنة */}
                                <div className="field-group full-width">
                                    <label>🩺 {isArabic ? 'أمراض مزمنة (اختياري)' : 'Chronic Conditions (Optional)'}</label>
                                    <textarea 
                                        value={userData.chronic_conditions} 
                                        onChange={(e) => setUserData({...userData, chronic_conditions: e.target.value})}
                                        placeholder={isArabic ? 'مثال: ضغط الدم، السكري، الربو...' : 'e.g., Diabetes, High blood pressure, Asthma...'}
                                        rows="2"
                                    />
                                </div>
                                
                                {/* ✅ حقل الأدوية الحالية */}
                                <div className="field-group full-width">
                                    <label>💊 {isArabic ? 'أدوية حالية (اختياري)' : 'Current Medications (Optional)'}</label>
                                    <textarea 
                                        value={userData.current_medications} 
                                        onChange={(e) => setUserData({...userData, current_medications: e.target.value})}
                                        placeholder={isArabic ? 'مثال: لانتوس، ميتفورمين...' : 'e.g., Metformin, Insulin...'}
                                        rows="2"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <button type="submit" disabled={saving} className="submit-btn">
                            {saving ? (isArabic ? '💾 جاري الحفظ...' : '💾 Saving...') : (isArabic ? '💾 حفظ التغييرات' : '💾 Save Changes')}
                        </button>
                    </form>
                )}
                
                {/* ==================== تبويب الأهداف المحسن ==================== */}
                {activeTab === 'goals' && (
                    <div className="goals-container">
                        {/* إضافة هدف جديد */}
                        <div className="add-goal-card">
                            <h3>🎯 {isArabic ? 'أضف هدفاً جديداً' : 'Add New Goal'}</h3>
                            <form onSubmit={handleAddGoal} className="add-goal-form">
                                <div className="form-grid">
                                    <div className="field-group">
                                        <label>{isArabic ? 'عنوان الهدف' : 'Goal Title'}</label>
                                        <input type="text" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} placeholder={isArabic ? 'مثال: خسارة 5 كجم' : 'e.g., Lose 5 kg'} />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'نوع الهدف' : 'Goal Type'}</label>
                                        <select value={newGoal.type} onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}>
                                            <option value="general">{isArabic ? '📋 عام' : '📋 General'}</option>
                                            <option value="weight_loss">{isArabic ? '⚖️ خسارة وزن' : '⚖️ Weight Loss'}</option>
                                            <option value="weight_gain">{isArabic ? '⚖️ زيادة وزن' : '⚖️ Weight Gain'}</option>
                                            <option value="sleep">{isArabic ? '😴 نوم' : '😴 Sleep'}</option>
                                            <option value="activity">{isArabic ? '🏃 نشاط' : '🏃 Activity'}</option>
                                            <option value="calories">{isArabic ? '🍎 سعرات' : '🍎 Calories'}</option>
                                            <option value="habit">{isArabic ? '✅ عادة' : '✅ Habit'}</option>
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'القيمة المستهدفة' : 'Target Value'}</label>
                                        <div className="input-with-unit">
                                            <input type="number" step="0.1" value={newGoal.target_value} onChange={(e) => setNewGoal({...newGoal, target_value: e.target.value})} placeholder={isArabic ? 'مثال: 70' : 'e.g., 70'} />
                                            <select value={newGoal.unit} onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})} className="unit-select">
                                                <option value="kg">kg</option>
                                                <option value="hours">{isArabic ? 'ساعات' : 'hours'}</option>
                                                <option value="minutes">{isArabic ? 'دقائق' : 'minutes'}</option>
                                                <option value="calories">{isArabic ? 'سعرة' : 'cal'}</option>
                                                <option value="percent">%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'تاريخ الانتهاء' : 'Target Date'}</label>
                                        <input type="date" value={newGoal.target_date} onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})} />
                                    </div>
                                </div>
                                <button type="submit" disabled={saving} className="submit-btn">
                                    {saving ? (isArabic ? '➕ جاري الإضافة...' : '➕ Adding...') : (isArabic ? '➕ أضف الهدف' : '➕ Add Goal')}
                                </button>
                            </form>
                        </div>
                        
                        {/* إحصائيات الأهداف */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{goalsStats.total}</div>
                                <div className="stat-label">{isArabic ? 'إجمالي الأهداف' : 'Total Goals'}</div>
                            </div>
                            <div className="stat-card success">
                                <div className="stat-value">{goalsStats.completed}</div>
                                <div className="stat-label">{isArabic ? 'مكتملة' : 'Completed'}</div>
                            </div>
                            <div className="stat-card warning">
                                <div className="stat-value">{goalsStats.inProgress}</div>
                                <div className="stat-label">{isArabic ? 'قيد التقدم' : 'In Progress'}</div>
                            </div>
                            <div className="stat-card info">
                                <div className="stat-value">{goalsStats.avgProgress}%</div>
                                <div className="stat-label">{isArabic ? 'متوسط التقدم' : 'Avg Progress'}</div>
                            </div>
                        </div>
                        
                        {/* قائمة الأهداف */}
                        <div className="goals-list">
                            <h3>📋 {isArabic ? 'أهدافي' : 'My Goals'}</h3>
                            {healthGoals.length > 0 ? (
                                <div className="goals-grid">
                                    {healthGoals.map((goal) => {
                                        const progressData = calculateGoalProgress(goal, healthData, isArabic);
                                        const isCompleted = goal.is_achieved || progressData.isAchieved;
                                        
                                        return (
                                            <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                                                <div className="goal-header">
                                                    <div className="goal-title">
                                                        <h4>{goal.title}</h4>
                                                        <span className="goal-type">{progressData.currentValue} / {goal.target_value} {goal.unit}</span>
                                                    </div>
                                                    <button onClick={() => deleteGoal(goal.id)} className="delete-goal-btn" title={isArabic ? 'حذف' : 'Delete'}>🗑️</button>
                                                </div>
                                                
                                                <div className="goal-progress">
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${progressData.progress}%`, background: isCompleted ? '#10b981' : '#667eea' }}></div>
                                                    </div>
                                                    <div className="progress-percent">{progressData.progress}%</div>
                                                </div>
                                                
                                                <div className="goal-details">
                                                    {progressData.startValue > 0 && (
                                                        <span className="detail">📊 {isArabic ? 'البداية' : 'Start'}: {progressData.startValue} {goal.unit}</span>
                                                    )}
                                                    {progressData.daysLeft > 0 && !isCompleted && (
                                                        <span className="detail">⏰ {isArabic ? 'متبقي' : 'Left'}: {progressData.daysLeft} {isArabic ? 'يوم' : 'days'}</span>
                                                    )}
                                                    {progressData.dailyRate > 0 && !isCompleted && (
                                                        <span className="detail">📈 {isArabic ? 'معدل يومي' : 'Daily'}: {progressData.dailyRate} {goal.unit}</span>
                                                    )}
                                                </div>
                                                
                                                {progressData.message && (
                                                    <div className={`goal-message ${progressData.status}`}>
                                                        {progressData.message}
                                                    </div>
                                                )}
                                                
                                                {progressData.status === 'on_track' && !isCompleted && (
                                                    <div className="goal-status on-track">✅ {isArabic ? 'على المسار الصحيح' : 'On Track'}</div>
                                                )}
                                                {progressData.status === 'off_track' && !isCompleted && (
                                                    <div className="goal-status off-track">⚠️ {isArabic ? 'تحتاج زيادة الالتزام' : 'Off Track'}</div>
                                                )}
                                                {isCompleted && (
                                                    <div className="goal-status achieved">🏆 {isArabic ? 'تم تحقيق الهدف' : 'Achieved'}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">🎯</div>
                                    <h4>{isArabic ? 'لا توجد أهداف' : 'No Goals'}</h4>
                                    <p>{isArabic ? 'أضف هدفك الأول أعلاه لتبدأ رحلتك الصحية' : 'Add your first goal above to start your health journey'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* ==================== تبويب الإعدادات المحسن ==================== */}
                {activeTab === 'settings' && (
                    <div className="settings-container">
                        {/* الإعدادات العامة */}
                        <div className="settings-section">
                            <h3>⚙️ {isArabic ? 'الإعدادات العامة' : 'General Settings'}</h3>
                            
                            <div className="setting-item">
                                <div>
                                    <label>{isArabic ? '🔔 الإشعارات' : '🔔 Notifications'}</label>
                                    <p>{isArabic ? 'تلقي إشعارات وتذكيرات صحية' : 'Receive health notifications and reminders'}</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({...settings, notifications: e.target.checked})} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div className="setting-item">
                                <div>
                                    <label>{isArabic ? '🌙 الوضع الليلي' : '🌙 Dark Mode'}</label>
                                    <p>{isArabic ? 'تغيير مظهر التطبيق إلى الوضع المظلم' : 'Change app appearance to dark mode'}</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div className="setting-item">
                                <div>
                                    <label>{isArabic ? '🔐 الخصوصية' : '🔐 Privacy'}</label>
                                    <p>{isArabic ? 'مشاركة البيانات مع التطبيق لتحسين التوصيات' : 'Share data with the app to improve recommendations'}</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={settings.privacy?.shareData} onChange={(e) => setSettings({...settings, privacy: {...settings.privacy, shareData: e.target.checked}})} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div className="setting-item">
                                <div>
                                    <label>{isArabic ? '🌐 اللغة' : '🌐 Language'}</label>
                                    <p>{isArabic ? 'اللغة الحالية: العربية - يمكنك تغييرها من الزر أعلى الصفحة' : 'Current language: English - Change from the button at the top'}</p>
                                </div>
                                <div className="lang-indicator">
                                    {isArabic ? 'العربية' : 'English'}
                                </div>
                            </div>
                            
                            <button onClick={handleSaveSettings} disabled={saving} className="submit-btn secondary">
                                {saving ? (isArabic ? '💾 جاري الحفظ...' : '💾 Saving...') : (isArabic ? '💾 حفظ الإعدادات' : '💾 Save Settings')}
                            </button>
                        </div>
                        
                        {/* تغيير كلمة المرور */}
                        <div className="settings-section">
                            <h3>🔐 {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
                            <form onSubmit={handleChangePassword}>
                                <div className="field-group">
                                    <label>{isArabic ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                                    <input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} required />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                    <input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required />
                                    <small>{isArabic ? '8 أحرف على الأقل' : 'Minimum 8 characters'}</small>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
                                    <input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} required />
                                </div>
                                <button type="submit" disabled={changingPassword} className="submit-btn secondary">
                                    {changingPassword ? (isArabic ? '🔄 جاري التغيير...' : '🔄 Changing...') : (isArabic ? '🔑 تغيير كلمة المرور' : '🔑 Change Password')}
                                </button>
                            </form>
                        </div>
                        
                        {/* النسخ الاحتياطي */}
                        <div className="settings-section">
                            <h3>💾 {isArabic ? 'النسخ الاحتياطي' : 'Backup'}</h3>
                            <div className="backup-grid">
                                <div className="backup-card primary">
                                    <div className="backup-icon">📦</div>
                                    <div className="backup-content">
                                        <h4>{isArabic ? 'نسخة احتياطية كاملة' : 'Full Backup'}</h4>
                                        <p>{isArabic ? 'إنشاء نسخة احتياطية لجميع بياناتك' : 'Create backup of all your data'}</p>
                                        <button onClick={handleFullBackup} disabled={exporting} className="backup-btn">
                                            {exporting ? (isArabic ? '⏳ جاري...' : '⏳ Loading...') : (isArabic ? '📥 تحميل النسخة' : '📥 Download Backup')}
                                        </button>
                                    </div>
                                </div>
                                <div className="backup-card secondary">
                                    <div className="backup-icon">🔄</div>
                                    <div className="backup-content">
                                        <h4>{isArabic ? 'استعادة نسخة احتياطية' : 'Restore Backup'}</h4>
                                        <p>{isArabic ? 'استعادة بيانات من نسخة احتياطية سابقة' : 'Restore data from previous backup'}</p>
                                        <input type="file" accept=".json" onChange={handleRestoreBackup} id="restore-file" style={{ display: 'none' }} />
                                        <label htmlFor="restore-file" className="backup-btn restore">
                                            📂 {isArabic ? 'اختيار ملف' : 'Select File'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* منطقة الخطر */}
                        <div className="settings-section danger-zone">
                            <h4>⚠️ {isArabic ? 'منطقة الخطر' : 'Danger Zone'}</h4>
                            <p>{isArabic ? 'هذه الإجراءات لا يمكن التراجع عنها' : 'These actions cannot be undone'}</p>
                            <div className="danger-actions">
                                <button onClick={handleExportData} disabled={exporting} className="danger-btn warning">
                                    📥 {isArabic ? 'تصدير البيانات' : 'Export Data'}
                                </button>
                                <button onClick={handleDeleteAccount} disabled={deleting} className="danger-btn error">
                                    🗑️ {isArabic ? 'حذف الحساب' : 'Delete Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
}

export default ProfileManager;