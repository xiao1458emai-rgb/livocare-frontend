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

// ✅ حساب الوزن المثالي (صيغة ديفاين المعدلة)
const calculateIdealWeight = (height, age, gender) => {
    if (!height) return null;
    const heightInCm = parseFloat(height);
    let idealWeight = gender === 'M' ? 50 : 45.5;
    if (heightInCm > 152.4) {
        idealWeight += (heightInCm - 152.4) * 0.9;
    }
    
    if (age && age > 30) {
        const ageReduction = Math.floor((age - 30) / 10) * 0.05;
        idealWeight = idealWeight * (1 - Math.min(ageReduction, 0.2));
    }
    
    return roundNumber(idealWeight, 1);
};

const getBMICategory = (bmi, isArabic) => {
    if (bmi < 18.5) return { category: isArabic ? 'نقص وزن' : 'Underweight', color: '#f59e0b', icon: '⚠️', advice: isArabic ? 'تحتاج لزيادة وزن صحي' : 'Need healthy weight gain' };
    if (bmi < 25) return { category: isArabic ? 'وزن طبيعي' : 'Normal', color: '#10b981', icon: '✅', advice: isArabic ? 'وزنك ممتاز، حافظ عليه' : 'Excellent weight, keep it up' };
    if (bmi < 30) return { category: isArabic ? 'زيادة وزن' : 'Overweight', color: '#f97316', icon: '⚠️', advice: isArabic ? 'تحتاج لخسارة وزن تدريجية' : 'Need gradual weight loss' };
    return { category: isArabic ? 'سمنة' : 'Obese', color: '#ef4444', icon: '🔴', advice: isArabic ? 'يُنصح باستشارة طبيب لوضع خطة صحية' : 'Consult a doctor for a health plan' };
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
    
    // --- حالات المستخدم ---
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
        health_goal: '',
        activity_level: '',
        chronic_conditions: '',
        current_medications: ''
    });
    
    // ✅ حالة تغيير اسم المستخدم
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    
    // ✅ حالة تغيير كلمة المرور مع إظهار/إخفاء
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
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
    
    // --- الإعدادات ---
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
    const [refreshKey, setRefreshKey] = useState(0);
    
    // --- حساب العمر ---
    const calculateAge = useCallback((birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }, []);
    
    const userAge = useMemo(() => calculateAge(userData.date_of_birth), [userData.date_of_birth, calculateAge]);
    
    // --- حساب الوزن المثالي ---
    const idealWeight = useMemo(() => {
        if (!userData.height) return null;
        return calculateIdealWeight(userData.height, userAge, userData.gender);
    }, [userData.height, userAge, userData.gender]);
    
    // --- حساب BMI المحسن ---
    const bmiData = useMemo(() => {
        const weight = parseFloat(userData.initial_weight) || healthData.weight;
        const height = parseFloat(userData.height);
        if (!weight || !height) return null;
        const bmi = calculateBMI(weight, height);
        const category = bmi ? getBMICategory(bmi, isArabic) : null;
        return { bmi, category, weight, height };
    }, [userData.initial_weight, userData.height, healthData.weight, isArabic]);
    
    // --- Smart Profile المحسن ---
    const smartProfile = useMemo(() => {
        if (!bmiData) return null;
        
        let healthScore = 65;
        let healthScoreDetails = [];
        
        if (bmiData.bmi) {
            if (bmiData.bmi >= 18.5 && bmiData.bmi <= 24.9) {
                healthScore += 15;
                healthScoreDetails.push(isArabic ? '✅ BMI مثالي' : '✅ Ideal BMI');
            } else if (bmiData.bmi >= 25 && bmiData.bmi <= 29.9) {
                healthScore -= 5;
                healthScoreDetails.push(isArabic ? '⚠️ BMI مرتفع قليلاً' : '⚠️ Slightly high BMI');
            } else if (bmiData.bmi >= 30) {
                healthScore -= 15;
                healthScoreDetails.push(isArabic ? '🔴 BMI مرتفع' : '🔴 High BMI');
            } else if (bmiData.bmi < 18.5) {
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
        
        return {
            bmi: bmiData.bmi,
            bmiCategory: bmiData.category,
            age: userAge,
            healthScore,
            healthScoreDetails,
            weight: bmiData.weight,
            height: bmiData.height,
            idealWeight
        };
    }, [bmiData, healthData, userAge, idealWeight, isArabic]);
    
    // --- التوصيات الذكية ---
    const getPersonalizedRecommendations = useMemo(() => {
        const recommendations = [];
        const occupation = userData.occupation_status;
        const bmi = smartProfile?.bmi;
        const age = smartProfile?.age;
        const idealWt = smartProfile?.idealWeight;
        const currentWeight = smartProfile?.weight;
        const activityLevel = userData.activity_level;
        const healthGoal = userData.health_goal;
        
        if (occupation === 'Student') {
            recommendations.push({ icon: '📚', text: isArabic ? 'حاول النوم 7-8 ساعات لتحسين التركيز' : 'Try to sleep 7-8 hours to improve focus', priority: 'high' });
        } else if (occupation === 'Full-Time') {
            recommendations.push({ icon: '💼', text: isArabic ? 'مارس المشي 10 دقائق خلال استراحة الغداء' : 'Walk 10 minutes during lunch break', priority: 'high' });
        } else if (occupation === 'Freelancer') {
            recommendations.push({ icon: '⏰', text: isArabic ? 'حدد روتيناً ثابتاً للنوم والاستيقاظ' : 'Set a consistent sleep/wake routine', priority: 'high' });
        }
        
        if (idealWt && currentWeight) {
            const weightDiff = currentWeight - idealWt;
            if (Math.abs(weightDiff) > 5) {
                recommendations.push({ 
                    icon: '⚖️', 
                    text: isArabic 
                        ? `وزنك الحالي ${currentWeight} كجم، الوزن المثالي ${idealWt} كجم. يمكنك ${weightDiff > 0 ? 'خسارة' : 'زيادة'} ${Math.abs(weightDiff)} كجم`
                        : `Current weight: ${currentWeight}kg, ideal: ${idealWt}kg. ${weightDiff > 0 ? 'Lose' : 'Gain'} ${Math.abs(weightDiff)}kg`, 
                    priority: 'high' 
                });
            }
        }
        
        if (bmi) {
            if (bmi < 18.5) {
                recommendations.push({ icon: '🥑', text: isArabic ? 'أضف مصادر صحية للدهون لزيادة الوزن' : 'Add healthy fats for weight gain', priority: 'high' });
            } else if (bmi > 25) {
                recommendations.push({ icon: '🏃', text: isArabic ? 'زد نشاطك إلى 30 دقيقة يومياً' : 'Increase activity to 30 minutes daily', priority: 'high' });
            }
        }
        
        if (activityLevel === 'low') {
            recommendations.push({ icon: '🚶', text: isArabic ? 'ابدأ بالمشي 10 دقائق يومياً' : 'Start with 10 minutes of walking daily', priority: 'high' });
        }
        
        if (healthData.sleep && healthData.sleep < 7) {
            recommendations.push({ icon: '😴', text: isArabic ? `متوسط نومك ${healthData.sleep} ساعات، حاول النوم مبكراً` : `Average sleep ${healthData.sleep} hours, try sleeping earlier`, priority: 'high' });
        }
        
        return recommendations.slice(0, 5);
    }, [userData.occupation_status, userData.activity_level, userData.health_goal, smartProfile, healthData, isArabic]);
    
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
    }, [isAuthReady, refreshKey]);
    
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
            
            let avgSleep = 0;
            if (sleepData.length > 0) {
                const hours = sleepData.map(s => {
                    const start = new Date(s.sleep_start || s.start_time);
                    const end = new Date(s.sleep_end || s.end_time);
                    return (end - start) / (1000 * 60 * 60);
                }).filter(h => h > 0 && h < 24);
                if (hours.length > 0) avgSleep = roundNumber(hours.reduce((a, b) => a + b, 0) / hours.length, 1);
            }
            
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyActivity = activitiesData.filter(a => {
                const date = new Date(a.start_time || a.created_at);
                return date >= weekAgo;
            }).reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
            
            let avgCalories = 0;
            if (mealsData.length > 0) {
                const validCalories = mealsData.map(m => m.total_calories || 0).filter(c => c > 0);
                if (validCalories.length > 0) avgCalories = Math.round(validCalories.reduce((a, b) => a + b, 0) / validCalories.length);
            }
            
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
            
            let habitCompletion = 0;
            if (habitsData.length > 0) {
                const completed = habitsData.filter(h => h.is_completed === true).length;
                habitCompletion = Math.round((completed / habitsData.length) * 100);
            }
            
            let latestWeight = null;
            if (healthDataRes.length > 0) {
                const sortedHealth = [...healthDataRes].sort((a, b) => {
                    const dateA = new Date(a.recorded_at || a.created_at);
                    const dateB = new Date(b.recorded_at || b.created_at);
                    return dateB - dateA;
                });
                latestWeight = sortedHealth[0]?.weight_kg || sortedHealth[0]?.weight || null;
                
                // ✅ تحديث userData.initial_weight بأحدث وزن تلقائياً
                if (latestWeight && latestWeight !== parseFloat(userData.initial_weight)) {
                    setUserData(prev => ({ ...prev, initial_weight: latestWeight.toString() }));
                }
            }
            
            setHealthData({ 
                weight: latestWeight, 
                sleep: avgSleep, 
                activity: weeklyActivity, 
                calories: avgCalories, 
                mood: avgMood, 
                habit_completion: habitCompletion 
            });
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
    
    // ✅ تحديث اسم المستخدم
    const handleUpdateUsername = async () => {
        if (!newUsername.trim() || newUsername === userData.username) {
            setIsEditingUsername(false);
            return;
        }
        
        setSaving(true);
        try {
            await axiosInstance.put('/profile/', { username: newUsername.trim() });
            setUserData(prev => ({ ...prev, username: newUsername.trim() }));
            setMessage(isArabic ? '✅ تم تحديث اسم المستخدم بنجاح' : '✅ Username updated successfully');
            setMessageType('success');
            setIsEditingUsername(false);
        } catch (error) {
            console.error('Error updating username:', error);
            setMessage(error.response?.data?.username?.[0] || (isArabic ? '❌ اسم المستخدم غير متوفر' : '❌ Username not available'), 'error');
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // ✅ تغيير كلمة المرور مع إظهار/إخفاء
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
            if (error.response?.status === 400 || error.response?.data?.current_password) {
                setMessage(isArabic ? '❌ كلمة المرور الحالية غير صحيحة' : '❌ Current password is incorrect');
            } else {
                setMessage(isArabic ? '❌ خطأ في تغيير كلمة المرور' : '❌ Error changing password');
            }
            setMessageType('error');
        } finally {
            setChangingPassword(false);
            setTimeout(() => setMessage(''), 3000);
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
    
    // ✅ تحديث الملف الشخصي
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
            setRefreshKey(prev => prev + 1); // تحديث الأهداف
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage(isArabic ? '❌ خطأ في تحديث الملف الشخصي' : '❌ Error updating profile');
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    // --- إضافة هدف جديد ---
    const [newGoal, setNewGoal] = useState({
        title: '',
        type: 'general',
        target_value: '',
        unit: 'kg',
        target_date: '',
        start_value: ''
    });
    
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
    
    // ✅ حساب تقدم الأهداف بناءً على أحدث البيانات
    const calculateGoalProgress = useCallback((goal, currentData) => {
        let currentValue = 0;
        let targetValue = parseFloat(goal.target_value) || 0;
        
        // استخدام أحدث البيانات المتاحة
        switch (goal.type) {
            case 'weight_loss':
            case 'weight_gain':
                currentValue = currentData.weight || parseFloat(userData.initial_weight) || 0;
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
        
        if (targetValue === 0) {
            return { progress: 0, isAchieved: false, currentValue: 0, targetValue };
        }
        
        let progress = 0;
        let isAchieved = false;
        
        if (goal.type === 'weight_loss') {
            if (currentValue <= targetValue) {
                progress = 100;
                isAchieved = true;
            } else {
                const startValue = goal.start_value || currentValue + 5;
                const totalToLose = startValue - targetValue;
                if (totalToLose > 0 && currentValue < startValue) {
                    const lostSoFar = startValue - currentValue;
                    progress = Math.min(99, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));
                } else if (currentValue >= startValue) {
                    progress = 0;
                } else {
                    progress = Math.min(99, Math.max(0, Math.round(((startValue - currentValue) / Math.abs(targetValue - startValue)) * 100)));
                }
            }
        } else if (goal.type === 'weight_gain') {
            if (currentValue >= targetValue) {
                progress = 100;
                isAchieved = true;
            } else {
                const startValue = goal.start_value || currentValue - 5;
                const totalToGain = targetValue - startValue;
                if (totalToGain > 0 && currentValue > startValue) {
                    const gainedSoFar = currentValue - startValue;
                    progress = Math.min(99, Math.max(0, Math.round((gainedSoFar / totalToGain) * 100)));
                } else {
                    progress = 0;
                }
            }
        } else {
            if (currentValue >= targetValue) {
                progress = 100;
                isAchieved = true;
            } else {
                progress = Math.min(99, Math.max(0, Math.round((currentValue / targetValue) * 100)));
            }
        }
        
        return { 
            progress, 
            isAchieved, 
            currentValue: roundNumber(currentValue, 1), 
            targetValue: roundNumber(targetValue, 1) 
        };
    }, [userData.initial_weight]);
    
    const goalsStats = useMemo(() => {
        const total = healthGoals.length;
        const completed = healthGoals.filter(g => {
            const progress = calculateGoalProgress(g, healthData);
            return progress.isAchieved || g.is_achieved;
        }).length;
        const inProgress = total - completed;
        const avgProgress = total > 0 ? Math.round(healthGoals.reduce((sum, g) => {
            const progress = calculateGoalProgress(g, healthData);
            return sum + progress.progress;
        }, 0) / total) : 0;
        
        return { total, completed, inProgress, avgProgress };
    }, [healthGoals, healthData, calculateGoalProgress]);
    
    // ✅ النسخ الاحتياطي
    const handleFullBackup = async () => {
        if (!confirm(isArabic ? 'هل تريد إنشاء نسخة احتياطية كاملة؟' : 'Do you want to create a full backup?')) return;
        setExporting(true);
        try {
            const backupResponse = await axiosInstance.get('/export-data/');
            const backupData = { 
                version: '1.0.0', 
                timestamp: new Date().toISOString(), 
                user: { profile: userData, settings }, 
                data: backupResponse.data 
            };
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
            setRefreshKey(prev => prev + 1);
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
    
    // --- عرض ---
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
    
    // ✅ دالة عرض حقل كلمة المرور مع زر إظهار/إخفاء
    const PasswordField = ({ label, value, onChange, show, setShow, placeholder }) => (
        <div className="field-group">
            <label>{label}</label>
            <div className="password-input-wrapper">
                <input 
                    type={show ? "text" : "password"} 
                    value={value} 
                    onChange={onChange}
                    placeholder={placeholder}
                />
                <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShow(!show)}
                >
                    {show ? '🙈' : '👁️'}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className={`analytics-container ${reducedMotion ? 'reduce-motion' : ''} ${darkMode ? 'dark-theme' : ''}`}>
            {/* Header */}
            <div className="analytics-header">
                <div className="header-left">
                    <div className="avatar-placeholder">
                        {userData.first_name ? userData.first_name[0] : (userData.username ? userData.username[0] : '👤')}
                    </div>
                    <div>
                        {isEditingUsername ? (
                            <div className="username-edit">
                                <input 
                                    type="text" 
                                    value={newUsername} 
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder={isArabic ? 'اسم المستخدم الجديد' : 'New username'}
                                    autoFocus
                                />
                                <button onClick={handleUpdateUsername} disabled={saving}>✅</button>
                                <button onClick={() => setIsEditingUsername(false)}>✖️</button>
                            </div>
                        ) : (
                            <h2 onClick={() => {
                                setNewUsername(userData.username);
                                setIsEditingUsername(true);
                            }} className="editable-username">
                                @{userData.username || (isArabic ? 'اسم المستخدم' : 'Username')} ✏️
                            </h2>
                        )}
                        <p className="user-email">{userData.email}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={() => setDarkMode(!darkMode)} className="lang-btn">
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    <button onClick={toggleLanguage} className="lang-btn">
                        {isArabic ? 'English' : 'العربية'}
                    </button>
                </div>
            </div>
            
            {/* Smart Profile Card */}
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
                            </div>
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'العمر' : 'Age'}</div>
                                <div className="stat-value">{smartProfile.age || '—'}</div>
                                <div className="stat-sub">{isArabic ? 'سنة' : 'years'}</div>
                            </div>
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'الوزن المثالي' : 'Ideal Weight'}</div>
                                <div className="stat-value">{smartProfile.idealWeight || '—'}</div>
                                <div className="stat-sub">{isArabic ? 'كجم' : 'kg'}</div>
                            </div>
                            <div className="health-stat">
                                <div className="stat-label">{isArabic ? 'درجة الصحة' : 'Health Score'}</div>
                                <div className="stat-value">{smartProfile.healthScore}</div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${smartProfile.healthScore}%` }}></div>
                                </div>
                            </div>
                        </div>
                        
                        {getPersonalizedRecommendations.length > 0 && (
                            <div className="recommendations-box">
                                <div className="rec-header">💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</div>
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
            
            {/* Tabs */}
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
            
            {/* Messages */}
            {message && (
                <div className={`notification-message ${messageType}`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}
            
            <div className="tab-content">
                {/* ==================== Profile Tab ==================== */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleUserUpdate}>
                        {/* Basic Information */}
                        <div className="form-section">
                            <h3>📋 {isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</h3>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                                    <input type="email" value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الاسم الأول' : 'First Name'}</label>
                                    <input type="text" value={userData.first_name} onChange={(e) => setUserData({...userData, first_name: e.target.value})} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'اسم العائلة' : 'Last Name'}</label>
                                    <input type="text" value={userData.last_name} onChange={(e) => setUserData({...userData, last_name: e.target.value})} />
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
                                    <input type="tel" value={userData.phone_number} onChange={(e) => setUserData({...userData, phone_number: e.target.value})} />
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الوظيفة' : 'Occupation'}</label>
                                    <select value={userData.occupation_status} onChange={(e) => setUserData({...userData, occupation_status: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر الوظيفة' : 'Select occupation'}</option>
                                        <option value="Student">{isArabic ? 'طالب' : 'Student'}</option>
                                        <option value="Full-Time">{isArabic ? 'موظف' : 'Full-Time'}</option>
                                        <option value="Freelancer">{isArabic ? 'عمل حر' : 'Freelancer'}</option>
                                        <option value="Other">{isArabic ? 'أخرى' : 'Other'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Health Information */}
                        <div className="form-section">
                            <h3>❤️ {isArabic ? 'المعلومات الصحية' : 'Health Information'}</h3>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>{isArabic ? 'الوزن الحالي' : 'Current Weight'}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.initial_weight} onChange={(e) => setUserData({...userData, initial_weight: e.target.value})} />
                                        <span className="unit">kg</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'الطول' : 'Height'}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.height} onChange={(e) => setUserData({...userData, height: e.target.value})} />
                                        <span className="unit">cm</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>🎯 {isArabic ? 'الهدف الصحي' : 'Health Goal'}</label>
                                    <select value={userData.health_goal} onChange={(e) => setUserData({...userData, health_goal: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر هدفك' : 'Select goal'}</option>
                                        <option value="loss">{isArabic ? 'خسارة وزن' : 'Weight Loss'}</option>
                                        <option value="gain">{isArabic ? 'زيادة وزن' : 'Weight Gain'}</option>
                                        <option value="maintain">{isArabic ? 'تثبيت الوزن' : 'Maintain'}</option>
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label>🏃 {isArabic ? 'مستوى النشاط' : 'Activity Level'}</label>
                                    <select value={userData.activity_level} onChange={(e) => setUserData({...userData, activity_level: e.target.value})}>
                                        <option value="">{isArabic ? 'اختر المستوى' : 'Select level'}</option>
                                        <option value="low">{isArabic ? 'منخفض' : 'Low'}</option>
                                        <option value="medium">{isArabic ? 'متوسط' : 'Medium'}</option>
                                        <option value="high">{isArabic ? 'عالي' : 'High'}</option>
                                    </select>
                                </div>
                                <div className="field-group full-width">
                                    <label>🩺 {isArabic ? 'أمراض مزمنة' : 'Chronic Conditions'}</label>
                                    <textarea value={userData.chronic_conditions} onChange={(e) => setUserData({...userData, chronic_conditions: e.target.value})} rows="2" />
                                </div>
                                <div className="field-group full-width">
                                    <label>💊 {isArabic ? 'أدوية حالية' : 'Current Medications'}</label>
                                    <textarea value={userData.current_medications} onChange={(e) => setUserData({...userData, current_medications: e.target.value})} rows="2" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Password Change with Show/Hide */}
                        <div className="form-section">
                            <h3>🔐 {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
                            <div className="form-grid">
                                <div className="field-group">
                                    <label>{isArabic ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                                    <div className="password-input-wrapper">
                                        <input 
                                            type={showCurrentPassword ? "text" : "password"} 
                                            value={passwordData.current_password} 
                                            onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                            placeholder={isArabic ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                                        />
                                        <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                            {showCurrentPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                    <div className="password-input-wrapper">
                                        <input 
                                            type={showNewPassword ? "text" : "password"} 
                                            value={passwordData.new_password} 
                                            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                            placeholder={isArabic ? '8 أحرف على الأقل' : 'Minimum 8 characters'}
                                        />
                                        <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                                            {showNewPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>{isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                    <div className="password-input-wrapper">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={passwordData.confirm_password} 
                                            onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                            placeholder={isArabic ? 'أعد كتابة كلمة المرور الجديدة' : 'Retype new password'}
                                        />
                                        <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            {showConfirmPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={handleChangePassword} disabled={changingPassword} className="submit-btn secondary" style={{ marginTop: '1rem' }}>
                                {changingPassword ? (isArabic ? '🔄 جاري...' : '🔄 Changing...') : (isArabic ? '🔑 تغيير' : '🔑 Change')}
                            </button>
                        </div>
                        
                        <button type="submit" disabled={saving} className="submit-btn">
                            {saving ? (isArabic ? '💾 جاري الحفظ...' : '💾 Saving...') : (isArabic ? '💾 حفظ التغييرات' : '💾 Save Changes')}
                        </button>
                    </form>
                )}
                
                {/* ==================== Goals Tab ==================== */}
                {activeTab === 'goals' && (
                    <div className="goals-container">
                        <div className="add-goal-card">
                            <h3>🎯 {isArabic ? 'أضف هدفاً جديداً' : 'Add New Goal'}</h3>
                            <form onSubmit={handleAddGoal} className="add-goal-form">
                                <div className="form-grid">
                                    <div className="field-group">
                                        <label>{isArabic ? 'عنوان الهدف' : 'Goal Title'}</label>
                                        <input type="text" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} />
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'نوع الهدف' : 'Goal Type'}</label>
                                        <select value={newGoal.type} onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}>
                                            <option value="general">{isArabic ? 'عام' : 'General'}</option>
                                            <option value="weight_loss">{isArabic ? 'خسارة وزن' : 'Weight Loss'}</option>
                                            <option value="weight_gain">{isArabic ? 'زيادة وزن' : 'Weight Gain'}</option>
                                            <option value="sleep">{isArabic ? 'نوم' : 'Sleep'}</option>
                                            <option value="activity">{isArabic ? 'نشاط' : 'Activity'}</option>
                                            <option value="habit">{isArabic ? 'عادة' : 'Habit'}</option>
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label>{isArabic ? 'القيمة المستهدفة' : 'Target Value'}</label>
                                        <div className="input-with-unit">
                                            <input type="number" step="0.1" value={newGoal.target_value} onChange={(e) => setNewGoal({...newGoal, target_value: e.target.value})} />
                                            <select value={newGoal.unit} onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})} className="unit-select">
                                                <option value="kg">kg</option>
                                                <option value="hours">{isArabic ? 'ساعات' : 'hours'}</option>
                                                <option value="minutes">{isArabic ? 'دقائق' : 'min'}</option>
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
                                    {saving ? (isArabic ? '➕ جاري...' : '➕ Adding...') : (isArabic ? '➕ أضف' : '➕ Add')}
                                </button>
                            </form>
                        </div>
                        
                        <div className="stats-grid">
                            <div className="stat-card"><div className="stat-value">{goalsStats.total}</div><div className="stat-label">{isArabic ? 'إجمالي الأهداف' : 'Total'}</div></div>
                            <div className="stat-card success"><div className="stat-value">{goalsStats.completed}</div><div className="stat-label">{isArabic ? 'مكتملة' : 'Completed'}</div></div>
                            <div className="stat-card warning"><div className="stat-value">{goalsStats.inProgress}</div><div className="stat-label">{isArabic ? 'قيد التقدم' : 'In Progress'}</div></div>
                            <div className="stat-card info"><div className="stat-value">{goalsStats.avgProgress}%</div><div className="stat-label">{isArabic ? 'متوسط التقدم' : 'Progress'}</div></div>
                        </div>
                        
                        <div className="goals-list">
                            <h3>📋 {isArabic ? 'أهدافي' : 'My Goals'}</h3>
                            {healthGoals.length > 0 ? (
                                <div className="goals-grid">
                                    {healthGoals.map((goal) => {
                                        const progressData = calculateGoalProgress(goal, healthData);
                                        const isCompleted = goal.is_achieved || progressData.isAchieved;
                                        
                                        return (
                                            <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                                                <div className="goal-header">
                                                    <div className="goal-title">
                                                        <h4>{goal.title}</h4>
                                                        <span className="goal-type">{progressData.currentValue} / {progressData.targetValue} {goal.unit}</span>
                                                    </div>
                                                    <button onClick={() => deleteGoal(goal.id)} className="delete-goal-btn">🗑️</button>
                                                </div>
                                                <div className="goal-progress">
                                                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressData.progress}%` }}></div></div>
                                                    <div className="progress-percent">{progressData.progress}%</div>
                                                </div>
                                                {isCompleted && <div className="goal-status achieved">🏆 {isArabic ? 'تم' : 'Achieved'}</div>}
                                                {!isCompleted && progressData.progress > 0 && progressData.progress < 100 && (
                                                    <div className="goal-status on-track">📈 {isArabic ? 'قيد التقدم' : 'In Progress'}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state"><div className="empty-icon">🎯</div><h4>{isArabic ? 'لا توجد أهداف' : 'No Goals'}</h4></div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* ==================== Settings Tab ==================== */}
                {activeTab === 'settings' && (
                    <div className="settings-container">
                        <div className="settings-section">
                            <h3>⚙️ {isArabic ? 'الإعدادات العامة' : 'General Settings'}</h3>
                            <div className="setting-item">
                                <div><label>{isArabic ? '🔔 الإشعارات' : 'Notifications'}</label></div>
                                <label className="toggle-switch"><input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({...settings, notifications: e.target.checked})} /><span className="toggle-slider"></span></label>
                            </div>
                            <div className="setting-item">
                                <div><label>{isArabic ? '🌙 الوضع الليلي' : 'Dark Mode'}</label></div>
                                <label className="toggle-switch"><input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} /><span className="toggle-slider"></span></label>
                            </div>
                            <button onClick={handleSaveSettings} disabled={saving} className="submit-btn secondary">{saving ? (isArabic ? '💾 جاري...' : '💾 Saving...') : (isArabic ? '💾 حفظ' : '💾 Save')}</button>
                        </div>
                        
                        <div className="settings-section">
                            <h3>💾 {isArabic ? 'النسخ الاحتياطي' : 'Backup'}</h3>
                            <div className="backup-grid">
                                <div className="backup-card primary">
                                    <div className="backup-icon">📦</div>
                                    <div className="backup-content">
                                        <h4>{isArabic ? 'نسخة احتياطية' : 'Full Backup'}</h4>
                                        <button onClick={handleFullBackup} disabled={exporting} className="backup-btn">{exporting ? (isArabic ? '⏳...' : '⏳...') : (isArabic ? '📥 تحميل' : '📥 Download')}</button>
                                    </div>
                                </div>
                                <div className="backup-card secondary">
                                    <div className="backup-icon">🔄</div>
                                    <div className="backup-content">
                                        <h4>{isArabic ? 'استعادة' : 'Restore'}</h4>
                                        <input type="file" accept=".json" onChange={handleRestoreBackup} id="restore-file" style={{ display: 'none' }} />
                                        <label htmlFor="restore-file" className="backup-btn restore">📂 {isArabic ? 'اختيار' : 'Select'}</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section danger-zone">
                            <h4>⚠️ {isArabic ? 'منطقة الخطر' : 'Danger Zone'}</h4>
                            <button onClick={handleDeleteAccount} disabled={deleting} className="danger-btn error">🗑️ {isArabic ? 'حذف الحساب' : 'Delete Account'}</button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Styles */}
            <style jsx>{`
            /* ===========================================
   ProfileManager.css - الأنماط الداخلية فقط
   ✅ إدارة الملف الشخصي - تصميم احترافي
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.analytics-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .analytics-container {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس الصفحة ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .analytics-header {
    border-bottom-color: #334155;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.avatar-placeholder {
    width: 55px;
    height: 55px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: bold;
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.editable-username {
    cursor: pointer;
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    transition: opacity 0.2s;
}

.dark-mode .editable-username {
    color: #f1f5f9;
}

.editable-username:hover {
    opacity: 0.7;
}

.username-edit {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.username-edit input {
    padding: 0.5rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .username-edit input {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.username-edit button {
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.25rem;
}

.user-email {
    font-size: 0.8rem;
    color: var(--text-tertiary, #94a3b8);
    margin-top: 0.25rem;
}

.header-actions {
    display: flex;
    gap: 0.5rem;
}

.lang-btn {
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .lang-btn {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.lang-btn:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    transform: translateY(-2px);
}

/* ===== بطاقة الملف الشخصي الذكي ===== */
.profile-card {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.insight-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.insight-content h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 700;
}

.health-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-top: 1rem;
}

.health-stat {
    background: rgba(255, 255, 255, 0.12);
    padding: 1rem;
    border-radius: 16px;
    text-align: center;
    backdrop-filter: blur(4px);
}

.health-stat .stat-label {
    font-size: 0.7rem;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.health-stat .stat-value {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0.5rem 0;
}

.health-stat .stat-sub {
    font-size: 0.7rem;
    opacity: 0.9;
}

.progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    overflow: hidden;
    margin: 0.5rem 0;
}

.progress-fill {
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
    background: #10b981;
}

/* ===== التوصيات ===== */
.recommendations-box {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
}

.rec-header {
    font-weight: 700;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
}

.recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.rec-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

.rec-item.priority-high {
    border-right: 3px solid #ef4444;
}

.rec-item.priority-medium {
    border-right: 3px solid #f59e0b;
}

.rec-item.priority-low {
    border-right: 3px solid #10b981;
}

[dir="rtl"] .rec-item {
    border-right: none;
    border-left: 3px solid;
}

[dir="rtl"] .rec-item.priority-high { border-left-color: #ef4444; }
[dir="rtl"] .rec-item.priority-medium { border-left-color: #f59e0b; }
[dir="rtl"] .rec-item.priority-low { border-left-color: #10b981; }

.rec-icon {
    font-size: 1rem;
}

.rec-text {
    flex: 1;
}

/* ===== التبويبات ===== */
.analytics-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
    padding-bottom: 0.5rem;
}

.dark-mode .analytics-tabs {
    border-bottom-color: #334155;
}

.type-btn {
    background: transparent;
    border: none;
    padding: 0.6rem 1.25rem;
    border-radius: 40px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .type-btn {
    color: #94a3b8;
}

.type-btn.active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.type-btn:hover:not(.active) {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .type-btn:hover:not(.active) {
    background: #334155;
}

/* ===== رسائل الإشعارات ===== */
.notification-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 0.75rem 1.25rem;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

[dir="rtl"] .notification-message {
    right: auto;
    left: 20px;
}

.notification-message.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}

.notification-message.error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
}

.notification-message.info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
}

.notification-message button {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

.notification-message button:hover {
    opacity: 1;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* ===== أقسام النموذج ===== */
.form-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .form-section {
    background: #0f172a;
    border-color: #334155;
}

.form-section h3 {
    margin-bottom: 1.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .form-section h3 {
    color: #f1f5f9;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field-group.full-width {
    grid-column: span 2;
}

.field-group label {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

.field-group input,
.field-group select,
.field-group textarea {
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
    transition: all 0.2s;
}

.dark-mode .field-group input,
.dark-mode .field-group select,
.dark-mode .field-group textarea {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.field-group input:focus,
.field-group select:focus,
.field-group textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ===== حقل كلمة المرور مع زر الإظهار ===== */
.password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.password-input-wrapper input {
    flex: 1;
    padding-right: 45px;
}

[dir="rtl"] .password-input-wrapper input {
    padding-right: 12px;
    padding-left: 45px;
}

.password-toggle {
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem;
    color: var(--text-tertiary, #94a3b8);
}

[dir="rtl"] .password-toggle {
    right: auto;
    left: 12px;
}

.password-toggle:hover {
    color: var(--primary, #6366f1);
}

/* ===== حقل مع وحدة ===== */
.input-with-unit {
    position: relative;
    display: flex;
    align-items: center;
}

.input-with-unit input {
    flex: 1;
    padding-right: 70px;
}

[dir="rtl"] .input-with-unit input {
    padding-right: 12px;
    padding-left: 70px;
}

.input-with-unit .unit {
    position: absolute;
    right: 12px;
    font-size: 0.8rem;
    color: var(--text-tertiary, #94a3b8);
}

[dir="rtl"] .input-with-unit .unit {
    right: auto;
    left: 12px;
}

.unit-select {
    position: absolute;
    right: 12px;
    width: auto;
    background: transparent;
    border: none;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
}

[dir="rtl"] .unit-select {
    right: auto;
    left: 12px;
}

/* ===== أزرار الإجراء ===== */
.submit-btn {
    width: 100%;
    padding: 0.875rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 16px;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.submit-btn.secondary {
    background: var(--secondary-bg, #f8fafc);
    color: var(--text-primary, #0f172a);
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .submit-btn.secondary {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

/* ===== قسم الأهداف ===== */
.add-goal-card {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.add-goal-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: white;
}

.add-goal-form .field-group label {
    color: rgba(255, 255, 255, 0.85);
}

.add-goal-form input,
.add-goal-form select {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    color: white;
}

.add-goal-form input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.add-goal-form .unit-select {
    color: rgba(255, 255, 255, 0.85);
}

/* إحصائيات الأهداف */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    background: var(--secondary-bg, #f8fafc);
    padding: 1rem;
    border-radius: 18px;
    text-align: center;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .stat-card {
    background: #0f172a;
    border-color: #334155;
}

.stat-card .stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
}

.stat-card.success .stat-value { color: #10b981; }
.stat-card.warning .stat-value { color: #f59e0b; }
.stat-card.info .stat-value { color: #6366f1; }

.stat-card .stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary, #94a3b8);
}

/* قائمة الأهداف */
.goals-list h3 {
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.goals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
}

.goal-card {
    background: var(--card-bg, #ffffff);
    border-radius: 18px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .goal-card {
    background: #1e293b;
    border-color: #475569;
}

.goal-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .goal-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.goal-card.completed {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
}

.goal-title h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.goal-type {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-tertiary, #94a3b8);
}

.delete-goal-btn {
    background: transparent;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
}

.delete-goal-btn:hover {
    opacity: 1;
}

.goal-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.goal-progress .progress-bar {
    flex: 1;
    background: var(--border-light, #e2e8f0);
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
}

.goal-progress .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

.goal-progress .progress-percent {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary, #64748b);
}

.goal-status {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 700;
}

.goal-status.achieved {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
}

.goal-status.on-track {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
}

/* ===== قسم الإعدادات ===== */
.settings-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .settings-section {
    background: #0f172a;
    border-color: #334155;
}

.settings-section h3 {
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-item label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

/* مفتاح التبديل */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 24px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: #6366f1;
}

input:checked + .toggle-slider:before {
    transform: translateX(26px);
}

/* ===== النسخ الاحتياطي ===== */
.backup-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.backup-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 18px;
}

.backup-card.primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
}

.backup-card.secondary {
    background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
    color: white;
}

.backup-icon {
    font-size: 1.8rem;
}

.backup-content h4 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
}

.backup-btn {
    background: white;
    border: none;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.backup-card.primary .backup-btn { color: #6366f1; }
.backup-card.secondary .backup-btn { color: #ec4899; }

.backup-btn:hover {
    transform: translateY(-1px);
    filter: brightness(0.95);
}

/* ===== منطقة الخطر ===== */
.danger-zone {
    border: 2px solid #ef4444;
    background: rgba(239, 68, 68, 0.05);
    border-radius: 24px;
    padding: 1.5rem;
    margin-top: 1rem;
}

.danger-zone h4 {
    color: #ef4444;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
}

.danger-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-weight: 700;
    transition: all 0.2s;
}

.danger-btn.error {
    background: #ef4444;
    color: white;
}

.danger-btn.error:hover {
    background: #dc2626;
    transform: translateY(-2px);
}

/* ===== حالات التحميل والبيانات الفارغة ===== */
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

.empty-state h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.analytics-loading {
    text-align: center;
    padding: 2rem;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
}

.dark-mode .spinner {
    border-color: #334155;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .header-left {
    flex-direction: row-reverse;
}

[dir="rtl"] .avatar-placeholder {
    margin-left: 0.5rem;
}

[dir="rtl"] .rec-item {
    flex-direction: row-reverse;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .notification-message {
        animation: none;
    }
    
    .submit-btn:hover:not(:disabled),
    .lang-btn:hover,
    .goal-card:hover,
    .backup-btn:hover {
        transform: none;
    }
    
    .progress-fill {
        transition: none;
    }
}
            `}</style>
        </div>
    );
}

export default ProfileManager;