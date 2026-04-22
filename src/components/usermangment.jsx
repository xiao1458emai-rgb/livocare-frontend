// src/components/ProfileManager.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

// دالة مساعدة لاستخراج البيانات من API بأمان
const extractDataSafely = (response) => {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results && Array.isArray(response.data.results)) return response.data.results;
    if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    if (response.data.items && Array.isArray(response.data.items)) return response.data.items;
    return [];
};

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب BMI
const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return roundNumber(weight / (heightInMeters * heightInMeters), 1);
};

// دالة للحصول على تصنيف BMI
const getBMICategory = (bmi, t) => {
    if (bmi < 18.5) return { category: t('profile.bmi.underweight'), color: '#f59e0b', icon: '⚠️' };
    if (bmi < 25) return { category: t('profile.bmi.normal'), color: '#10b981', icon: '✅' };
    if (bmi < 30) return { category: t('profile.bmi.overweight'), color: '#f97316', icon: '⚠️' };
    return { category: t('profile.bmi.obese'), color: '#ef4444', icon: '🔴' };
};

// دالة لحساب التقدم نحو الهدف
const calculateGoalProgress = (goal, currentData) => {
    if (!goal || !currentData) return { progress: 0, remaining: 0, status: 'unknown', daysLeft: 0, isAchieved: false };
    
    let currentValue = 0;
    let targetValue = parseFloat(goal.target_value);
    
    switch (goal.type) {
        case 'weight_loss':
        case 'weight_gain':
            currentValue = currentData.weight || 0;
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
    
    if (currentValue === 0 && targetValue !== 0) {
        return { progress: 0, remaining: targetValue, status: 'no_data', daysLeft: 0, isAchieved: false, currentValue: 0, targetValue };
    }
    
    let progress = 0;
    let isAchieved = false;
    let status = '';
    
    if (goal.type === 'weight_loss') {
        if (currentValue <= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
        } else {
            const startValue = goal.start_value || currentValue;
            const totalToLose = startValue - targetValue;
            const lostSoFar = startValue - currentValue;
            progress = totalToLose > 0 ? Math.min(100, Math.round((lostSoFar / totalToLose) * 100)) : 0;
            status = progress > 0 ? 'on_track' : 'off_track';
        }
    } else if (goal.type === 'weight_gain') {
        if (currentValue >= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
        } else {
            const startValue = goal.start_value || currentValue;
            const totalToGain = targetValue - startValue;
            const gainedSoFar = currentValue - startValue;
            progress = totalToGain > 0 ? Math.min(100, Math.round((gainedSoFar / totalToGain) * 100)) : 0;
            status = progress > 0 ? 'on_track' : 'off_track';
        }
    } else {
        if (currentValue >= targetValue) {
            progress = 100;
            isAchieved = true;
            status = 'achieved';
        } else {
            progress = Math.min(100, Math.round((currentValue / targetValue) * 100));
            status = progress > 0 ? 'on_track' : 'off_track';
        }
    }
    
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const daysLeft = Math.max(0, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)));
    
    let dailyRate = 0;
    if (daysLeft > 0 && progress < 100 && !isAchieved) {
        const remaining = Math.abs(targetValue - currentValue);
        dailyRate = roundNumber(remaining / daysLeft, 1);
    }
    
    return {
        progress: Math.min(100, Math.max(0, progress)),
        remaining: Math.abs(targetValue - currentValue),
        status,
        daysLeft,
        dailyRate,
        currentValue,
        targetValue,
        isAchieved
    };
};

function ProfileManager({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    
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
        occupation_status: ''
    });
    
    const [healthGoals, setHealthGoals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [healthData, setHealthData] = useState({
        weight: null,
        sleep: null,
        activity: null,
        calories: null,
        mood: null,
        habit_completion: null
    });
    
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    
    const [newGoal, setNewGoal] = useState({
        title: '',
        type: 'general',
        target_value: '',
        unit: 'kg',
        target_date: '',
        start_value: ''
    });

    const [settings, setSettings] = useState({
        autoUpdate: true,
        notifications: true,
        language: i18n.language,
        updateInterval: 30
    });

    const [achievements, setAchievements] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    // حساب smartProfile
    const smartProfile = useMemo(() => {
        const weight = parseFloat(userData.initial_weight) || healthData.weight;
        const height = parseFloat(userData.height);
        
        if (!weight || !height) return null;
        
        const bmi = calculateBMI(weight, height);
        const bmiCategory = bmi ? getBMICategory(bmi, t) : null;
        
        let age = null;
        if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }
        
        let healthScore = 65;
        
        if (bmi) {
            if (bmi >= 18.5 && bmi <= 24.9) healthScore += 15;
            else if (bmi >= 25 && bmi <= 29.9) healthScore -= 5;
            else if (bmi >= 30) healthScore -= 15;
            else if (bmi < 18.5) healthScore -= 10;
        }
        
        if (healthData.sleep) {
            if (healthData.sleep >= 7 && healthData.sleep <= 8) healthScore += 15;
            else if (healthData.sleep >= 6) healthScore += 5;
            else healthScore -= 10;
        }
        
        if (healthData.activity) {
            if (healthData.activity >= 150) healthScore += 15;
            else if (healthData.activity >= 75) healthScore += 5;
            else healthScore -= 5;
        }
        
        healthScore = Math.min(100, Math.max(0, healthScore));
        
        return {
            bmi,
            bmiCategory,
            age,
            healthScore,
            weight,
            height
        };
    }, [userData.initial_weight, userData.height, userData.date_of_birth, healthData, t]);

    // توليد توصيات ذكية
    const getPersonalizedRecommendations = useMemo(() => {
        const recommendations = [];
        const occupation = userData.occupation_status;
        const bmi = smartProfile?.bmi;
        
        if (occupation === 'Student') {
            recommendations.push({ icon: '📚', text: t('profile.recommendations.studentSleep'), priority: 'medium' });
            recommendations.push({ icon: '🍎', text: t('profile.recommendations.studentNutrition'), priority: 'medium' });
        } else if (occupation === 'Full-Time') {
            recommendations.push({ icon: '💼', text: t('profile.recommendations.employeeActivity'), priority: 'high' });
            recommendations.push({ icon: '🧘', text: t('profile.recommendations.employeeStress'), priority: 'high' });
        } else if (occupation === 'Freelancer') {
            recommendations.push({ icon: '🖥️', text: t('profile.recommendations.freelancerRoutine'), priority: 'medium' });
        }
        
        if (bmi) {
            if (bmi < 18.5) {
                recommendations.push({ icon: '🥑', text: t('profile.recommendations.weightGain'), priority: 'high' });
            } else if (bmi > 25) {
                recommendations.push({ icon: '🏃', text: t('profile.recommendations.weightLoss'), priority: 'high' });
            }
        }
        
        if (healthData.sleep && healthData.sleep < 7) {
            recommendations.push({ icon: '😴', text: t('profile.recommendations.sleepMore', { hours: 8 - healthData.sleep }), priority: 'high' });
        }
        
        if (healthData.activity && healthData.activity < 150) {
            recommendations.push({ icon: '🏃', text: t('profile.recommendations.activityMore', { minutes: 150 - healthData.activity }), priority: 'medium' });
        }
        
        return recommendations.slice(0, 5);
    }, [userData.occupation_status, smartProfile?.bmi, healthData, t]);

    // إحصائيات الأهداف
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
    }, [healthGoals, healthData]);

    // Effects
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

    // API Functions
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
                if (hours.length > 0) {
                    avgSleep = roundNumber(hours.reduce((a, b) => a + b, 0) / hours.length, 1);
                }
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
                if (validCalories.length > 0) {
                    avgCalories = Math.round(validCalories.reduce((a, b) => a + b, 0) / validCalories.length);
                }
            }
            
            let avgMood = 0;
            if (moodData.length > 0) {
                const getScore = (m) => {
                    const moodMap = { 
                        'Excellent': 5, 'Good': 4, 'Neutral': 3, 
                        'Stressed': 2, 'Anxious': 2, 'Sad': 1,
                        'Happy': 4, 'Normal': 3, 'Bad': 2
                    };
                    const moodValue = m.mood || m.mood_state || 'Neutral';
                    return moodMap[moodValue] || 3;
                };
                const scores = moodData.map(m => getScore(m)).filter(s => s > 0);
                if (scores.length > 0) {
                    avgMood = roundNumber(scores.reduce((a, b) => a + b, 0) / scores.length, 1);
                }
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
            
            if (response.data?.data) {
                userDataFromApi = response.data.data;
            } else if (response.data && typeof response.data === 'object') {
                userDataFromApi = response.data;
            }
            
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
                occupation_status: userDataFromApi.occupation || userDataFromApi.occupation_status || ''
            });
            
        } catch (error) {
            console.error('Error fetching user data:', error);
            setMessage(t('profile.error.fetchUser'));
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchHealthGoals = async () => {
        try {
            const response = await axiosInstance.get('/goals/');
            let goalsData = [];
            if (Array.isArray(response.data)) {
                goalsData = response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                goalsData = response.data.results;
            }
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
            const progress = calculateGoalProgress(goal, healthData);
            
            if (progress.isAchieved && !goal.is_achieved) {
                await markGoalAsAchieved(goal.id);
            }
            else if (progress.currentValue !== goal.current_value && !goal.is_achieved) {
                await updateGoalProgress(goal.id, progress.currentValue);
            }
        }
    };

    const markGoalAsAchieved = async (goalId) => {
        try {
            await axiosInstance.patch(`/goals/${goalId}/`, { 
                is_achieved: true,
                achieved_date: new Date().toISOString()
            });
            setMessage(t('profile.goals.achievedAuto'));
            setMessageType('success');
            fetchHealthGoals();
            
            const achievedGoal = healthGoals.find(g => g.id === goalId);
            if (achievedGoal) {
                await addAchievement({
                    title: achievedGoal.title,
                    type: 'goal_completed',
                    date: new Date().toISOString()
                });
            }
            
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
                occupation: userData.occupation_status || null
            };
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '' || updateData[key] === null) {
                    delete updateData[key];
                }
            });
            
            await axiosInstance.put('/profile/', updateData);
            setMessage(t('profile.profile.updated'));
            setMessageType('success');
            await fetchUserData();
            await fetchCurrentHealthData();
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage(t('profile.error.updateProfile'));
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangingPassword(true);
        setMessage('');
        
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage(t('profile.password.passwordsDoNotMatch'));
            setMessageType('error');
            setChangingPassword(false);
            return;
        }
        
        if (passwordData.new_password.length < 8) {
            setMessage(t('profile.password.passwordTooShort'));
            setMessageType('error');
            setChangingPassword(false);
            return;
        }
        
        try {
            await axiosInstance.post('/change-password/', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });
            
            setMessage(t('profile.password.changed'));
            setMessageType('success');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.response?.status === 400) {
                setMessage(t('profile.password.wrongCurrentPassword'));
            } else {
                setMessage(t('profile.password.changeError'));
            }
            setMessageType('error');
        } finally {
            setChangingPassword(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAddGoal = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            if (!newGoal.title || !newGoal.target_value || !newGoal.target_date) {
                setMessage(t('profile.goals.requiredFields'));
                setMessageType('error');
                setSaving(false);
                return;
            }

            let startValue = 0;
            switch (newGoal.type) {
                case 'weight_loss':
                case 'weight_gain':
                    startValue = parseFloat(userData.initial_weight) || healthData.weight || 0;
                    break;
                case 'sleep':
                    startValue = healthData.sleep || 0;
                    break;
                case 'activity':
                    startValue = healthData.activity || 0;
                    break;
                case 'calories':
                    startValue = healthData.calories || 0;
                    break;
                case 'habit':
                    startValue = healthData.habit_completion || 0;
                    break;
                default:
                    startValue = newGoal.start_value ? parseFloat(newGoal.start_value) : 0;
            }

            const goalData = {
                title: newGoal.title.trim(),
                type: newGoal.type,
                target_value: parseFloat(newGoal.target_value),
                unit: newGoal.unit,
                target_date: newGoal.target_date,
                start_value: startValue,
                current_value: startValue,
                is_achieved: false,
                start_date: new Date().toISOString().split('T')[0]
            };

            const response = await axiosInstance.post('/goals/', goalData);
            
            setHealthGoals(prev => [...prev, response.data]);
            setNewGoal({ 
                title: '', 
                type: 'general',
                target_value: '', 
                unit: 'kg',
                target_date: '',
                start_value: ''
            });
            setMessage(t('profile.goals.added'));
            setMessageType('success');
        } catch (error) {
            console.error('Error adding goal:', error);
            setMessage(t('profile.error.addGoal'));
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const deleteGoal = async (goalId) => {
        if (!confirm(t('profile.goals.deleteConfirm'))) return;
        
        try {
            await axiosInstance.delete(`/goals/${goalId}/`);
            setHealthGoals(prev => prev.filter(goal => goal.id !== goalId));
            setMessage(t('profile.goals.deleted'));
            setMessageType('success');
        } catch (error) {
            console.error('Error deleting goal:', error);
            setMessage(t('profile.error.deleteGoal'));
            setMessageType('error');
        } finally {
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            localStorage.setItem('appSettings', JSON.stringify(settings));
            setMessage(t('profile.settings.saved'));
            setMessageType('success');
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage(t('profile.settings.error'));
            setMessageType('error');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t('profile.danger.deleteAccountConfirm'))) return;
        
        const confirmation = prompt(t('profile.danger.typeDelete'));
        if (confirmation !== 'حذف' && confirmation !== 'delete') {
            setMessage(t('profile.danger.cancelled'));
            setMessageType('info');
            return;
        }
        
        setDeleting(true);
        try {
            await axiosInstance.delete('/delete-account/');
            
            localStorage.clear();
            setMessage(t('profile.danger.accountDeleted'));
            setMessageType('success');
            
            setTimeout(() => {
                window.location.href = '/register';
            }, 3000);
        } catch (error) {
            console.error('Error deleting account:', error);
            setMessage(t('profile.error.deleteAccount'));
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
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const fileName = `livocare-data-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            
            setMessage(t('profile.danger.exportSuccess'));
            setMessageType('success');
        } catch (error) {
            console.error('Error exporting data:', error);
            setMessage(t('profile.error.exportData'));
            setMessageType('error');
        } finally {
            setExporting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleFullBackup = async () => {
        if (!confirm(t('profile.backup.confirm'))) return;
        
        setExporting(true);
        try {
            const backupResponse = await axiosInstance.get('/export-data/');
            
            const backupData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                user: {
                    profile: userData,
                    settings
                },
                data: backupResponse.data
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const fileName = `livocare-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            
            setMessage(t('profile.backup.success'));
            setMessageType('success');
        } catch (error) {
            console.error('Error creating backup:', error);
            setMessage(t('profile.backup.error'));
            setMessageType('error');
        } finally {
            setExporting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleRestoreBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!confirm(t('profile.restore.confirm'))) {
            event.target.value = '';
            return;
        }
        
        setLoading(true);
        try {
            const fileContent = await file.text();
            const backupData = JSON.parse(fileContent);
            
            if (!backupData.version || !backupData.data) {
                throw new Error('Invalid backup file');
            }
            
            setMessage(t('profile.restore.success'));
            setMessageType('success');
            
            fetchUserData();
            fetchHealthGoals();
            fetchCurrentHealthData();
        } catch (error) {
            console.error('Error restoring backup:', error);
            setMessage(t('profile.restore.error'));
            setMessageType('error');
        } finally {
            setLoading(false);
            event.target.value = '';
            setTimeout(() => setMessage(''), 3000);
        }
    };

    if (loading && !userData.username) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* رأس الصفحة */}
            <div className="analytics-header">
                <h2>
                    <span>👤</span>
                    {t('profile.title')}
                </h2>
            </div>

            {/* Smart Profile Card */}
            {smartProfile && (
                <div className="insight-card" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                    <div className="insight-icon">🧠</div>
                    <div className="insight-content">
                        <h3 style={{ color: 'white' }}>{t('profile.smartProfile.title')}</h3>
                        <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.smartProfile.bmi')}</div>
                                    <div className="stat-value" style={{ color: smartProfile.bmiCategory?.color }}>{smartProfile.bmi}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{smartProfile.bmiCategory?.category}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.smartProfile.age')}</div>
                                    <div className="stat-value" style={{ color: 'white' }}>{smartProfile.age || '—'}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.smartProfile.healthScore')}</div>
                                    <div className="stat-value" style={{ color: 'white' }}>{smartProfile.healthScore}</div>
                                    <div className="progress-bar" style={{ marginTop: 'var(--spacing-xs)' }}>
                                        <div className="progress-fill" style={{ width: `${smartProfile.healthScore}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {getPersonalizedRecommendations.length > 0 && (
                            <div className="recommendations-section" style={{ background: 'rgba(255,255,255,0.1)', marginTop: 'var(--spacing-md)' }}>
                                <div className="rec-header">
                                    <span className="rec-icon">💡</span>
                                    <span className="rec-category" style={{ color: 'white' }}>{t('profile.smartProfile.recommendations')}</span>
                                </div>
                                <div className="recommendations-list">
                                    {getPersonalizedRecommendations.map((rec, i) => (
                                        <div key={i} className={`recommendation-card priority-${rec.priority === 'high' ? 'high' : 'medium'}`} style={{ background: 'rgba(255,255,255,0.15)' }}>
                                            <div className="rec-header">
                                                <span className="rec-icon">{rec.icon}</span>
                                                <span className="rec-category" style={{ color: 'white' }}>{rec.text}</span>
                                            </div>
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
                    📝 {t('profile.tabs.profile')}
                </button>
                <button className={`type-btn ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
                    🎯 {t('profile.tabs.goals')}
                </button>
                <button className={`type-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    ⚙️ {t('profile.tabs.settings')}
                </button>
            </div>

            {/* الرسائل */}
            {message && (
                <div className={`notification-message ${messageType}`} style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <span>{messageType === 'success' ? '✅' : messageType === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            <div className="tab-content">
                {/* تبويب الملف الشخصي */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleUserUpdate}>
                        <div className="recommendations-section">
                            <h3>📋 {t('profile.profile.basicInfo')}</h3>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.username')}</label>
                                    <input type="text" value={userData.username} disabled className="search-input" />
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.email')}</label>
                                    <input type="email" value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} className="search-input" />
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.firstName')}</label>
                                    <input type="text" value={userData.first_name} onChange={(e) => setUserData({...userData, first_name: e.target.value})} className="search-input" />
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.lastName')}</label>
                                    <input type="text" value={userData.last_name} onChange={(e) => setUserData({...userData, last_name: e.target.value})} className="search-input" />
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.birthDate')}</label>
                                    <input type="date" value={userData.date_of_birth} onChange={(e) => setUserData({...userData, date_of_birth: e.target.value})} className="search-input" />
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.gender')}</label>
                                    <select value={userData.gender} onChange={(e) => setUserData({...userData, gender: e.target.value})} className="search-input">
                                        <option value="">{t('profile.profile.selectGender')}</option>
                                        <option value="M">{t('profile.profile.male')}</option>
                                        <option value="F">{t('profile.profile.female')}</option>
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.occupation')}</label>
                                    <select value={userData.occupation_status} onChange={(e) => setUserData({...userData, occupation_status: e.target.value})} className="search-input">
                                        <option value="">{t('profile.profile.selectOccupation')}</option>
                                        <option value="Student">{t('profile.profile.student')}</option>
                                        <option value="Full-Time">{t('profile.profile.fullTime')}</option>
                                        <option value="Freelancer">{t('profile.profile.freelancer')}</option>
                                        <option value="Other">{t('profile.profile.other')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="recommendations-section">
                            <h3>❤️ {t('profile.profile.healthInfo')}</h3>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.initialWeight')}</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <input type="number" step="0.1" value={userData.initial_weight} onChange={(e) => setUserData({...userData, initial_weight: e.target.value})} className="search-input" />
                                        <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>{t('profile.units.kg')}</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.height')}</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <input type="number" step="0.1" value={userData.height} onChange={(e) => setUserData({...userData, height: e.target.value})} className="search-input" />
                                        <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>{t('profile.units.cm')}</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label className="stat-label">{t('profile.profile.phone')}</label>
                                    <input type="tel" value={userData.phone_number} onChange={(e) => setUserData({...userData, phone_number: e.target.value})} className="search-input" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="type-btn active" style={{ width: '100%' }}>
                            {saving ? t('common.saving') : t('profile.profile.saveChanges')}
                        </button>
                    </form>
                )}

                {/* تبويب الأهداف الذكية */}
                {activeTab === 'goals' && (
                    <div className="goals-container">
                        <div className="insight-card" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                            <div className="insight-icon">🎯</div>
                            <div className="insight-content">
                                <h3 style={{ color: 'white' }}>{t('profile.goals.addNew')}</h3>
                                <form onSubmit={handleAddGoal}>
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 'var(--spacing-md)' }}>
                                        <div className="field-group">
                                            <label className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.goals.title')}</label>
                                            <input type="text" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} className="search-input" style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} />
                                        </div>
                                        <div className="field-group">
                                            <label className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.goals.type')}</label>
                                            <select value={newGoal.type} onChange={(e) => setNewGoal({...newGoal, type: e.target.value})} className="search-input" style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                                                <option value="general">{t('profile.goals.types.general')}</option>
                                                <option value="weight_loss">{t('profile.goals.types.weightLoss')}</option>
                                                <option value="weight_gain">{t('profile.goals.types.weightGain')}</option>
                                                <option value="sleep">{t('profile.goals.types.sleep')}</option>
                                                <option value="activity">{t('profile.goals.types.activity')}</option>
                                                <option value="calories">{t('profile.goals.types.calories')}</option>
                                                <option value="habit">{t('profile.goals.types.habit')}</option>
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.goals.targetValue')}</label>
                                            <div className="input-wrapper" style={{ position: 'relative' }}>
                                                <input type="number" step="0.1" value={newGoal.target_value} onChange={(e) => setNewGoal({...newGoal, target_value: e.target.value})} className="search-input" style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} />
                                                <select value={newGoal.unit} onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})} className="unit-select" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', width: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                                                    <option value="kg">kg</option>
                                                    <option value="hours">{t('profile.units.hours')}</option>
                                                    <option value="minutes">{t('profile.units.minutes')}</option>
                                                    <option value="calories">{t('profile.units.calories')}</option>
                                                    <option value="percent">%</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('profile.goals.targetDate')}</label>
                                            <input type="date" value={newGoal.target_date} onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})} className="search-input" style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={saving} className="type-btn active" style={{ width: '100%', background: 'white', color: 'var(--primary)' }}>
                                        {saving ? t('common.saving') : t('profile.goals.addGoal')}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="analytics-stat-card">
                                <div className="stat-content">
                                    <div className="stat-value">{goalsStats.total}</div>
                                    <div className="stat-label">{t('profile.goals.totalGoals')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-content">
                                    <div className="stat-value">{goalsStats.completed}</div>
                                    <div className="stat-label">{t('profile.goals.completed')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-content">
                                    <div className="stat-value">{goalsStats.inProgress}</div>
                                    <div className="stat-label">{t('profile.goals.inProgress')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-content">
                                    <div className="stat-value">{goalsStats.avgProgress}%</div>
                                    <div className="stat-label">{t('profile.goals.avgProgress')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="recommendations-section">
                            <h3>📋 {t('profile.goals.myGoals')}</h3>
                            {healthGoals.length > 0 ? (
                                <div className="notifications-list">
                                    {healthGoals.map((goal) => {
                                        const progressData = calculateGoalProgress(goal, healthData);
                                        const isCompleted = goal.is_achieved || progressData.isAchieved;
                                        
                                        return (
                                            <div key={goal.id} className={`notification-card ${isCompleted ? 'unread' : ''}`}>
                                                <div className="notification-header">
                                                    <div className="notification-title">
                                                        <h4 style={{ margin: 0 }}>{goal.title}</h4>
                                                        <span className="rec-type tip">{t(`profile.goals.types.${goal.type}`)}</span>
                                                        {goal.type === 'weight_loss' && <span className="priority-badge priority-urgent">⬇️ {t('profile.goals.lose')}</span>}
                                                        {goal.type === 'weight_gain' && <span className="priority-badge priority-high">⬆️ {t('profile.goals.gain')}</span>}
                                                    </div>
                                                    <button onClick={() => deleteGoal(goal.id)} className="notification-action-btn" title={t('common.delete')}>🗑️</button>
                                                </div>
                                                
                                                <div className="notification-content">
                                                    <div className="habit-stats">
                                                        <span className="stat-value">{progressData.currentValue || 0}</span>
                                                        <span>/</span>
                                                        <span className="stat-label">{goal.target_value} {goal.unit}</span>
                                                    </div>
                                                    <div className="progress-bar" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                        <div className="progress-fill" style={{ width: `${progressData.progress}%` }}></div>
                                                    </div>
                                                    <div className="stat-label" style={{ marginTop: 'var(--spacing-xs)' }}>{progressData.progress}%</div>
                                                </div>
                                                
                                                <div className="notification-meta">
                                                    <span className="notification-time">📅 {t('profile.goals.start')}: {new Date(goal.start_date).toLocaleDateString()}</span>
                                                    <span className="notification-time">🎯 {t('profile.goals.target')}: {new Date(goal.target_date).toLocaleDateString()}</span>
                                                    {progressData.daysLeft > 0 && !isCompleted && (
                                                        <span className="notification-time">⏰ {t('profile.goals.daysLeft')}: {progressData.daysLeft} {t('profile.goals.days')}</span>
                                                    )}
                                                </div>
                                                
                                                {progressData.dailyRate > 0 && !isCompleted && (
                                                    <div className="rec-advice" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                        💡 {t('profile.goals.dailyRate')}: {progressData.dailyRate} {goal.unit}/{t('profile.goals.perDay')}
                                                    </div>
                                                )}
                                                
                                                {progressData.status === 'on_track' && !isCompleted && (
                                                    <div className="recommendation-card priority-low" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                        <div className="rec-header">
                                                            <span className="rec-icon">✅</span>
                                                            <span className="rec-category">{t('profile.goals.onTrack')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {progressData.status === 'off_track' && !isCompleted && (
                                                    <div className="recommendation-card priority-high" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                        <div className="rec-header">
                                                            <span className="rec-icon">⚠️</span>
                                                            <span className="rec-category">{t('profile.goals.offTrack')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {isCompleted && (
                                                    <div className="recommendation-card priority-low" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                        <div className="rec-header">
                                                            <span className="rec-icon">🏆</span>
                                                            <span className="rec-category">{t('profile.goals.achieved')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="analytics-empty">
                                    <div className="empty-icon">🎯</div>
                                    <h4>{t('profile.goals.noGoals')}</h4>
                                    <p>{t('profile.goals.startAdding')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* تبويب الإعدادات */}
                {activeTab === 'settings' && (
                    <div className="settings-container">
                        <div className="recommendations-section">
                            <h3>⚙️ {t('profile.settings.title')}</h3>
                            
                            <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-sm)' }}>
                                <div>
                                    <label className="stat-label">{t('profile.settings.notifications')}</label>
                                    <p className="stat-label" style={{ fontSize: '0.75rem' }}>{t('profile.settings.notificationsDesc')}</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({...settings, notifications: e.target.checked})} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-sm)' }}>
                                <div>
                                    <label className="stat-label">{t('profile.settings.language')}</label>
                                    <p className="stat-label" style={{ fontSize: '0.75rem' }}>{t('profile.settings.languageDesc')}</p>
                                </div>
                                <select value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})} className="search-input" style={{ width: 'auto' }}>
                                    <option value="ar">🇸🇦 العربية</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>

                            <button onClick={handleSaveSettings} disabled={saving} className="type-btn active" style={{ width: '100%' }}>
                                {saving ? t('common.saving') : t('profile.settings.save')}
                            </button>
                        </div>

                        <div className="recommendations-section">
                            <h3>🔐 {t('profile.password.title')}</h3>
                            <form onSubmit={handleChangePassword}>
                                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label className="stat-label">{t('profile.password.currentPassword')}</label>
                                    <input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} required className="search-input" />
                                </div>
                                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label className="stat-label">{t('profile.password.newPassword')}</label>
                                    <input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required className="search-input" />
                                    <small className="stat-label">{t('profile.password.passwordHint')}</small>
                                </div>
                                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label className="stat-label">{t('profile.password.confirmPassword')}</label>
                                    <input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} required className="search-input" />
                                </div>
                                <button type="submit" disabled={changingPassword} className="type-btn active" style={{ width: '100%' }}>
                                    {changingPassword ? t('common.saving') : t('profile.password.change')}
                                </button>
                            </form>
                        </div>

                        <div className="recommendations-section">
                            <h3>💾 {t('profile.backup.title')}</h3>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="insight-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                    <div className="insight-icon">📦</div>
                                    <div className="insight-content">
                                        <h4 style={{ color: 'white' }}>{t('profile.backup.fullBackup')}</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>{t('profile.backup.fullBackupDesc')}</p>
                                        <button onClick={handleFullBackup} disabled={exporting} className="type-btn" style={{ background: 'white', color: '#667eea' }}>
                                            {exporting ? t('common.exporting') : t('profile.backup.download')}
                                        </button>
                                    </div>
                                </div>
                                <div className="insight-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                                    <div className="insight-icon">🔄</div>
                                    <div className="insight-content">
                                        <h4 style={{ color: 'white' }}>{t('profile.restore.title')}</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>{t('profile.restore.desc')}</p>
                                        <input type="file" accept=".json" onChange={handleRestoreBackup} id="restore-file" style={{ display: 'none' }} />
                                        <label htmlFor="restore-file" className="type-btn" style={{ background: 'white', color: '#f5576c', cursor: 'pointer', display: 'inline-block', textAlign: 'center' }}>
                                            {t('profile.restore.select')}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="recommendations-section" style={{ border: '2px solid var(--error)', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <h4 style={{ color: 'var(--error)' }}>⚠️ {t('profile.danger.zone')}</h4>
                            <p className="stat-label">{t('profile.danger.warning')}</p>
                            <div className="type-filters" style={{ justifyContent: 'center' }}>
                                <button onClick={handleExportData} disabled={exporting} className="type-btn" style={{ background: 'var(--warning)', color: 'white' }}>
                                    📥 {t('profile.danger.exportData')}
                                </button>
                                <button onClick={handleDeleteAccount} disabled={deleting} className="type-btn" style={{ background: 'var(--error)', color: 'white' }}>
                                    🗑️ {t('profile.danger.deleteAccount')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* الأنماط الإضافية */}
            <style>{`
                .input-unit {
                    color: var(--text-tertiary);
                    font-size: 0.8rem;
                }
                
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--spacing-sm);
                    flex-wrap: wrap;
                    gap: var(--spacing-sm);
                }
                
                [dir="rtl"] .input-unit {
                    right: auto !important;
                    left: 1rem !important;
                }
                
                [dir="rtl"] .unit-select {
                    right: auto !important;
                    left: 0.5rem !important;
                }
                
                @media (max-width: 768px) {
                    .strengths-weaknesses {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .analytics-stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    
                    .setting-item {
                        flex-direction: column;
                        text-align: center;
                    }
                }
                
                @media (max-width: 480px) {
                    .analytics-stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default ProfileManager;