// src/components/ProfileManager.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

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
        darkMode: false,
        language: i18n.language,
        updateInterval: 30
    });

    const [achievements, setAchievements] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    // ============================================
    // حساب smartProfile أولاً (قبل استخدامه)
    // ============================================
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

    // ============================================
    // توليد توصيات ذكية (بعد تعريف smartProfile)
    // ============================================
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

    // ============================================
    // Effects
    // ============================================
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        setSettings(prev => ({ ...prev, darkMode: savedDarkMode }));
        
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

    // ============================================
    // API Functions
    // ============================================
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
            
            let avgSleep = 0;
            if (sleepRes.data.length > 0) {
                const hours = sleepRes.data.map(s => {
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
            const weeklyActivity = activitiesRes.data.filter(a => {
                const date = new Date(a.start_time || a.created_at);
                return date >= weekAgo;
            }).reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
            
            let avgCalories = 0;
            if (mealsRes.data.length > 0) {
                avgCalories = Math.round(mealsRes.data.reduce((sum, m) => sum + (m.total_calories || 0), 0) / mealsRes.data.length);
            }
            
            let avgMood = 0;
            if (moodRes.data.length > 0) {
                const getScore = (m) => {
                    const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
                    return map[m.mood] || 3;
                };
                avgMood = roundNumber(moodRes.data.reduce((sum, m) => sum + getScore(m), 0) / moodRes.data.length, 1);
            }
            
            let habitCompletion = 0;
            if (habitsRes.data.length > 0) {
                const completed = habitsRes.data.filter(h => h.is_completed).length;
                habitCompletion = Math.round((completed / habitsRes.data.length) * 100);
            }
            
            let latestWeight = null;
            if (healthRes.data.length > 0) {
                const sortedHealth = [...healthRes.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                latestWeight = sortedHealth[0]?.weight_kg || null;
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
            const response = await axiosInstance.get('/users/me/');
            
            setUserData({
                username: response.data.username || '',
                email: response.data.email || '',
                date_of_birth: response.data.date_of_birth || '',
                gender: response.data.gender || '',
                phone_number: response.data.phone_number || '',
                initial_weight: response.data.initial_weight?.toString() || '',
                height: response.data.height?.toString() || '',
                occupation_status: response.data.occupation_status || ''
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
                email: userData.email || null,
                date_of_birth: userData.date_of_birth || null,
                gender: userData.gender || null,
                phone_number: userData.phone_number || null,
                initial_weight: userData.initial_weight ? parseFloat(userData.initial_weight) : null,
                height: userData.height ? parseFloat(userData.height) : null,
                occupation_status: userData.occupation_status || null
            };
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '' || updateData[key] === null) {
                    delete updateData[key];
                }
            });
            
            await axiosInstance.patch('/users/me/', updateData);
            setMessage(t('profile.profile.updated'));
            setMessageType('success');
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
            await axiosInstance.post('/users/change-password/', {
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
            await axiosInstance.delete('/users/me/');
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
            const [
                profileRes,
                healthRes,
                mealsRes,
                sleepRes,
                moodRes,
                activitiesRes,
                goalsRes
            ] = await Promise.all([
                axiosInstance.get('/users/me/').catch(() => ({ data: null })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/goals/').catch(() => ({ data: [] }))
            ]);

            const backupData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                user: {
                    profile: profileRes.data,
                    settings
                },
                data: {
                    health: healthRes.data || [],
                    meals: mealsRes.data || [],
                    sleep: sleepRes.data || [],
                    mood: moodRes.data || [],
                    activities: activitiesRes.data || [],
                    goals: goalsRes.data || []
                }
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
            <div className={`loading-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className={`profile-manager ${darkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* باقي JSX يبقى كما هو - لم يتغير */}
            <div className="profile-header">
                <div className="header-icon-wrapper">
                    <div className="header-icon">👤</div>
                </div>
                <div className="header-text">
                    <h1>{t('profile.title')}</h1>
                    <p>{t('profile.description')}</p>
                </div>
            </div>

            {smartProfile && (
                <div className="smart-profile-card">
                    <div className="smart-profile-header">
                        <span className="smart-icon">🧠</span>
                        <span className="smart-title">{t('profile.smartProfile.title')}</span>
                    </div>
                    
                    <div className="smart-profile-content">
                        <div className="profile-stats">
                            <div className="stat">
                                <span className="stat-label">{t('profile.smartProfile.bmi')}</span>
                                <span className="stat-value" style={{ color: smartProfile.bmiCategory?.color }}>
                                    {smartProfile.bmi}
                                </span>
                                <span className="stat-category">{smartProfile.bmiCategory?.category}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">{t('profile.smartProfile.age')}</span>
                                <span className="stat-value">{smartProfile.age || '—'}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">{t('profile.smartProfile.healthScore')}</span>
                                <div className="score-container">
                                    <div className="score-circle">
                                        <span className="score-value">{smartProfile.healthScore}</span>
                                    </div>
                                    <div className="score-bar">
                                        <div className="score-fill" style={{ width: `${smartProfile.healthScore}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="user-occupation-badge">
                            <span className="occupation-icon">
                                {userData.occupation_status === 'Student' && '📚'}
                                {userData.occupation_status === 'Full-Time' && '💼'}
                                {userData.occupation_status === 'Freelancer' && '🖥️'}
                                {userData.occupation_status === 'Other' && '👤'}
                                {!userData.occupation_status && '❓'}
                            </span>
                            <span className="occupation-text">
                                {userData.occupation_status ? t(`profile.profile.${userData.occupation_status.toLowerCase()}`) : t('profile.profile.selectOccupation')}
                            </span>
                        </div>
                        
                        {getPersonalizedRecommendations.length > 0 && (
                            <div className="smart-recommendations">
                                <strong>💡 {t('profile.smartProfile.recommendations')}:</strong>
                                <ul>
                                    {getPersonalizedRecommendations.map((rec, i) => (
                                        <li key={i} className={`priority-${rec.priority}`}>
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span>{rec.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="tabs-navigation">
                <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    <span>📝</span><span>{t('profile.tabs.profile')}</span>
                </button>
                <button className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
                    <span>🎯</span><span>{t('profile.tabs.goals')}</span>
                </button>
                <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    <span>⚙️</span><span>{t('profile.tabs.settings')}</span>
                </button>
            </div>

            {message && (
                <div className={`message ${messageType}`}>
                    <span>{messageType === 'success' ? '✅' : messageType === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* محتوى التبويبات */}
            <div className="tab-content">
                
                {/* تبويب الملف الشخصي */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleUserUpdate} className="profile-form">
                        <div className="form-section">
                            <h3>📋 {t('profile.profile.basicInfo')}</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>{t('profile.profile.username')}</label>
                                    <input type="text" value={userData.username} disabled />
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.email')}</label>
                                    <input type="email" value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.birthDate')}</label>
                                    <input type="date" value={userData.date_of_birth} onChange={(e) => setUserData({...userData, date_of_birth: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.gender')}</label>
                                    <select value={userData.gender} onChange={(e) => setUserData({...userData, gender: e.target.value})}>
                                        <option value="">{t('profile.profile.selectGender')}</option>
                                        <option value="M">{t('profile.profile.male')}</option>
                                        <option value="F">{t('profile.profile.female')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.occupation')}</label>
                                    <select value={userData.occupation_status} onChange={(e) => setUserData({...userData, occupation_status: e.target.value})}>
                                        <option value="">{t('profile.profile.selectOccupation')}</option>
                                        <option value="Student">{t('profile.profile.student')}</option>
                                        <option value="Full-Time">{t('profile.profile.fullTime')}</option>
                                        <option value="Freelancer">{t('profile.profile.freelancer')}</option>
                                        <option value="Other">{t('profile.profile.other')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>❤️ {t('profile.profile.healthInfo')}</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>{t('profile.profile.initialWeight')}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.initial_weight} onChange={(e) => setUserData({...userData, initial_weight: e.target.value})} />
                                        <span className="unit">{t('profile.units.kg')}</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.height')}</label>
                                    <div className="input-with-unit">
                                        <input type="number" step="0.1" value={userData.height} onChange={(e) => setUserData({...userData, height: e.target.value})} />
                                        <span className="unit">{t('profile.units.cm')}</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.profile.phone')}</label>
                                    <input type="tel" value={userData.phone_number} onChange={(e) => setUserData({...userData, phone_number: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="save-btn">
                            {saving ? t('common.saving') : t('profile.profile.saveChanges')}
                        </button>
                    </form>
                )}

                {/* تبويب الأهداف الذكية */}
                {activeTab === 'goals' && (
                    <div className="goals-container">
                        {/* إضافة هدف جديد */}
                        <div className="add-goal-card">
                            <h3>🎯 {t('profile.goals.addNew')}</h3>
                            <form onSubmit={handleAddGoal} className="goal-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('profile.goals.title')}</label>
                                        <input type="text" value={newGoal.title} onChange={(e) => setNewGoal({...newGoal, title: e.target.value})} placeholder={t('profile.goals.titlePlaceholder')} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.goals.type')}</label>
                                        <select value={newGoal.type} onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}>
                                            <option value="general">{t('profile.goals.types.general')}</option>
                                            <option value="weight_loss">{t('profile.goals.types.weightLoss')}</option>
                                            <option value="weight_gain">{t('profile.goals.types.weightGain')}</option>
                                            <option value="sleep">{t('profile.goals.types.sleep')}</option>
                                            <option value="activity">{t('profile.goals.types.activity')}</option>
                                            <option value="calories">{t('profile.goals.types.calories')}</option>
                                            <option value="habit">{t('profile.goals.types.habit')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.goals.targetValue')}</label>
                                        <div className="input-with-unit">
                                            <input type="number" step="0.1" value={newGoal.target_value} onChange={(e) => setNewGoal({...newGoal, target_value: e.target.value})} required />
                                            <select value={newGoal.unit} onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})} className="unit-select">
                                                <option value="kg">kg</option>
                                                <option value="cm">cm</option>
                                                <option value="hours">{t('profile.units.hours')}</option>
                                                <option value="minutes">{t('profile.units.minutes')}</option>
                                                <option value="calories">{t('profile.units.calories')}</option>
                                                <option value="percent">%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('profile.goals.targetDate')}</label>
                                        <input type="date" value={newGoal.target_date} onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})} required />
                                    </div>
                                </div>
                                <button type="submit" disabled={saving} className="add-goal-btn">
                                    {saving ? t('common.saving') : t('profile.goals.addGoal')}
                                </button>
                            </form>
                        </div>

                        {/* إحصائيات الأهداف */}
                        <div className="goals-stats">
                            <div className="stat-card">
                                <span className="stat-value">{goalsStats.total}</span>
                                <span className="stat-label">{t('profile.goals.totalGoals')}</span>
                            </div>
                            <div className="stat-card completed">
                                <span className="stat-value">{goalsStats.completed}</span>
                                <span className="stat-label">{t('profile.goals.completed')}</span>
                            </div>
                            <div className="stat-card in-progress">
                                <span className="stat-value">{goalsStats.inProgress}</span>
                                <span className="stat-label">{t('profile.goals.inProgress')}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{goalsStats.avgProgress}%</span>
                                <span className="stat-label">{t('profile.goals.avgProgress')}</span>
                            </div>
                        </div>

                        {/* قائمة الأهداف الذكية */}
                        <div className="goals-list">
                            <h3>📋 {t('profile.goals.myGoals')}</h3>
                            {healthGoals.length > 0 ? (
                                <div className="goals-grid">
                                    {healthGoals.map((goal) => {
                                        const progressData = calculateGoalProgress(goal, healthData);
                                        const isCompleted = goal.is_achieved || progressData.isAchieved;
                                        
                                        return (
                                            <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''} ${progressData.status === 'on_track' ? 'on-track' : ''}`}>
                                                <div className="goal-header">
                                                    <div>
                                                        <h4>{goal.title}</h4>
                                                        <span className="goal-type">{t(`profile.goals.types.${goal.type}`)}</span>
                                                        {goal.type === 'weight_loss' && <span className="goal-badge">⬇️ {t('profile.goals.lose')}</span>}
                                                        {goal.type === 'weight_gain' && <span className="goal-badge">⬆️ {t('profile.goals.gain')}</span>}
                                                    </div>
                                                    <button onClick={() => deleteGoal(goal.id)} className="delete-btn" title={t('common.delete')}>🗑️</button>
                                                </div>
                                                
                                                <div className="goal-progress">
                                                    <div className="progress-info">
                                                        <span className="current">{progressData.currentValue || 0}</span>
                                                        <span className="separator">/</span>
                                                        <span className="target">{goal.target_value} {goal.unit}</span>
                                                    </div>
                                                    <div className="progress-bar-container">
                                                        <div className="progress-bar">
                                                            <div className="progress-fill" style={{ width: `${progressData.progress}%` }} />
                                                        </div>
                                                        <span className="progress-percent">{progressData.progress}%</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="goal-dates">
                                                    <div>📅 {t('profile.goals.start')}: {new Date(goal.start_date).toLocaleDateString()}</div>
                                                    <div>🎯 {t('profile.goals.target')}: {new Date(goal.target_date).toLocaleDateString()}</div>
                                                    {progressData.daysLeft > 0 && !isCompleted && (
                                                        <div>⏰ {t('profile.goals.daysLeft')}: {progressData.daysLeft} {t('profile.goals.days')}</div>
                                                    )}
                                                </div>
                                                
                                                {progressData.dailyRate > 0 && !isCompleted && (
                                                    <div className="goal-daily-rate">
                                                        💡 {t('profile.goals.dailyRate')}: {progressData.dailyRate} {goal.unit}/{t('profile.goals.perDay')}
                                                    </div>
                                                )}
                                                
                                                {progressData.status === 'on_track' && !isCompleted && (
                                                    <div className="goal-status on-track">✅ {t('profile.goals.onTrack')}</div>
                                                )}
                                                {progressData.status === 'off_track' && !isCompleted && (
                                                    <div className="goal-status off-track">⚠️ {t('profile.goals.offTrack')}</div>
                                                )}
                                                {isCompleted && (
                                                    <div className="goal-status achieved">🏆 {t('profile.goals.achieved')}</div>
                                                )}
                                                
                                                {!isCompleted && goal.type !== 'habit' && (
                                                    <div className="goal-update">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder={t('profile.goals.updateProgress')}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateGoalProgress(goal.id, parseFloat(e.target.value));
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                        <small>{t('profile.goals.pressEnter')}</small>
                                                    </div>
                                                )}
                                                {!isCompleted && goal.type === 'habit' && (
                                                    <div className="goal-habit-note">
                                                        💡 {t('profile.goals.habitAutoTrack')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-goals">
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
                        <div className="settings-card">
                            <h3>⚙️ {t('profile.settings.title')}</h3>
                            
                            <div className="setting-item">
                                <div>
                                    <label>{t('profile.settings.darkMode')}</label>
                                    <p>{t('profile.settings.darkModeDesc')}</p>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.darkMode} onChange={(e) => setSettings({...settings, darkMode: e.target.checked})} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div>
                                    <label>{t('profile.settings.notifications')}</label>
                                    <p>{t('profile.settings.notificationsDesc')}</p>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({...settings, notifications: e.target.checked})} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div>
                                    <label>{t('profile.settings.language')}</label>
                                    <p>{t('profile.settings.languageDesc')}</p>
                                </div>
                                <select value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})}>
                                    <option value="ar">🇸🇦 العربية</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>

                            <button onClick={handleSaveSettings} disabled={saving} className="save-settings-btn">
                                {saving ? t('common.saving') : t('profile.settings.save')}
                            </button>
                        </div>

                        {/* قسم تغيير كلمة المرور */}
                        <div className="password-card">
                            <h3>🔐 {t('profile.password.title')}</h3>
                            <form onSubmit={handleChangePassword} className="password-form">
                                <div className="form-group">
                                    <label>{t('profile.password.currentPassword')}</label>
                                    <input 
                                        type="password" 
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.password.newPassword')}</label>
                                    <input 
                                        type="password" 
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                        required
                                    />
                                    <small>{t('profile.password.passwordHint')}</small>
                                </div>
                                <div className="form-group">
                                    <label>{t('profile.password.confirmPassword')}</label>
                                    <input 
                                        type="password" 
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={changingPassword} className="change-password-btn">
                                    {changingPassword ? t('common.saving') : t('profile.password.change')}
                                </button>
                            </form>
                        </div>

                        {/* النسخ الاحتياطي */}
                        <div className="backup-section">
                            <h3>💾 {t('profile.backup.title')}</h3>
                            <div className="backup-cards">
                                <div className="backup-card full">
                                    <div className="backup-icon">📦</div>
                                    <h4>{t('profile.backup.fullBackup')}</h4>
                                    <p>{t('profile.backup.fullBackupDesc')}</p>
                                    <button onClick={handleFullBackup} disabled={exporting} className="backup-btn">
                                        {exporting ? t('common.exporting') : t('profile.backup.download')}
                                    </button>
                                </div>
                                <div className="backup-card restore">
                                    <div className="backup-icon">🔄</div>
                                    <h4>{t('profile.restore.title')}</h4>
                                    <p>{t('profile.restore.desc')}</p>
                                    <input type="file" accept=".json" onChange={handleRestoreBackup} id="restore-file" style={{ display: 'none' }} />
                                    <label htmlFor="restore-file" className="restore-btn">{t('profile.restore.select')}</label>
                                </div>
                            </div>
                        </div>

                        {/* منطقة الخطر */}
                        <div className="danger-zone">
                            <h4>⚠️ {t('profile.danger.zone')}</h4>
                            <p>{t('profile.danger.warning')}</p>
                            <div className="danger-actions">
                                <button onClick={handleExportData} disabled={exporting} className="danger-btn export">
                                    📥 {t('profile.danger.exportData')}
                                </button>
                                <button onClick={handleDeleteAccount} disabled={deleting} className="danger-btn delete">
                                    🗑️ {t('profile.danger.deleteAccount')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
/* ProfileManager.css - متوافق مع ThemeManager */

.profile-manager {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
    transition: background var(--transition-medium);
}

/* ===== رأس الصفحة ===== */
.profile-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    flex-wrap: wrap;
}

.header-icon-wrapper {
    width: 80px;
    height: 80px;
    background: var(--primary-gradient);
    border-radius: var(--radius-2xl);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
}

.header-icon {
    font-size: 2.5rem;
}

.header-text h1 {
    margin: 0;
    font-size: 1.8rem;
    color: var(--text-primary);
}

.header-text p {
    margin: var(--spacing-xs) 0 0;
    color: var(--text-secondary);
}

/* ===== Smart Profile Card ===== */
.smart-profile-card {
    background: var(--primary-gradient);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
    box-shadow: var(--shadow-lg);
}

.smart-profile-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.smart-icon {
    font-size: 1.5rem;
}

.smart-title {
    font-weight: 700;
}

.profile-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
}

.stat {
    text-align: center;
}

.stat-label {
    display: block;
    font-size: 0.8rem;
    opacity: 0.8;
}

.stat-value {
    display: block;
    font-size: 1.8rem;
    font-weight: 700;
}

.stat-category {
    font-size: 0.7rem;
}

.score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
}

.score-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.score-value {
    font-size: 1.2rem;
    font-weight: 700;
}

.score-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-full);
}

.score-fill {
    height: 100%;
    background: white;
    border-radius: var(--radius-full);
    transition: width var(--transition-medium);
}

.smart-recommendations {
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm);
}

.smart-recommendations strong {
    display: block;
    margin-bottom: var(--spacing-xs);
}

.smart-recommendations ul {
    margin: 0;
    padding-left: var(--spacing-lg);
}

.smart-recommendations li {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
}

.rec-icon {
    font-size: 1rem;
}

/* ===== التبويبات ===== */
.tabs-navigation {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    background: var(--secondary-bg);
    padding: var(--spacing-xs);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
}

.tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    background: transparent;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-medium);
    color: var(--text-secondary);
}

.tab-btn:hover:not(.active) {
    background: var(--hover-bg);
    color: var(--primary);
}

.tab-btn.active {
    background: var(--primary-gradient);
    color: white;
}

/* ===== الرسائل ===== */
.message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
    animation: slideIn 0.3s ease;
}

.message.success {
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success);
}

.message.error {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error);
}

.message.info {
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    color: var(--info);
}

.message button {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity var(--transition-fast);
}

.message button:hover {
    opacity: 1;
}

/* ===== النماذج ===== */
.form-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.form-section h3 {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-primary);
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.form-group label {
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input,
.form-group select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.input-with-unit {
    display: flex;
    gap: var(--spacing-sm);
}

.input-with-unit input {
    flex: 1;
}

.unit,
.unit-select {
    padding: var(--spacing-sm);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--secondary-bg);
    color: var(--text-primary);
}

.save-btn {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.save-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ===== الأهداف ===== */
.add-goal-card {
    background: var(--primary-gradient);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
}

.add-goal-card h3 {
    margin: 0 0 var(--spacing-lg) 0;
}

.goal-form .form-group label {
    color: white;
}

.goal-form input,
.goal-form select {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.goal-form input::placeholder {
    color: rgba(255, 255, 255, 0.7);
}

.goal-form option {
    color: var(--text-primary);
}

.add-goal-btn {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: white;
    color: var(--primary);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.add-goal-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.goals-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.stat-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    text-align: center;
    border: 1px solid var(--border-light);
}

.stat-card .stat-value {
    display: block;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--primary);
}

.stat-card .stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

/* ===== قائمة الأهداف ===== */
.goals-list h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.goals-grid {
    display: grid;
    gap: var(--spacing-md);
}

.goal-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.goal-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.goal-card.completed {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
}

.goal-card.completed .goal-header h4,
.goal-card.completed .goal-dates {
    color: white;
}

.goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
}

.goal-header h4 {
    margin: 0;
}

.goal-type {
    font-size: 0.7rem;
    opacity: 0.7;
}

.delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.6;
    transition: opacity var(--transition-fast);
}

.delete-btn:hover {
    opacity: 1;
}

.goal-progress {
    margin-bottom: var(--spacing-sm);
}

.progress-info {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
}

.current {
    font-size: 1.2rem;
    font-weight: 700;
}

.target {
    color: var(--text-tertiary);
}

.goal-card.completed .target {
    color: rgba(255, 255, 255, 0.7);
}

.progress-bar-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.progress-bar {
    flex: 1;
    height: 6px;
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: var(--radius-full);
    transition: width var(--transition-medium);
}

.goal-card.completed .progress-fill {
    background: white;
}

.progress-percent {
    font-size: 0.8rem;
}

.goal-dates {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-sm);
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.goal-daily-rate {
    background: var(--secondary-bg);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
}

.goal-status {
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    text-align: center;
    margin-bottom: var(--spacing-sm);
}

.goal-status.on-track {
    background: rgba(16, 185, 129, 0.15);
    color: var(--success);
}

.goal-status.off-track {
    background: rgba(239, 68, 68, 0.15);
    color: var(--error);
}

.goal-status.achieved {
    background: rgba(16, 185, 129, 0.15);
    color: var(--success);
}

.goal-update input {
    width: 100%;
    padding: var(--spacing-sm);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-md);
    background: var(--secondary-bg);
    color: var(--text-primary);
    text-align: center;
}

.goal-update input:focus {
    outline: none;
    border-color: var(--primary);
}

.goal-update small {
    display: block;
    text-align: center;
    font-size: 0.7rem;
    margin-top: var(--spacing-xs);
    color: var(--text-tertiary);
}

.empty-goals {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
}

/* ===== الإعدادات ===== */
.settings-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
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

.setting-item label {
    font-weight: 500;
    color: var(--text-primary);
}

.setting-item p {
    margin: var(--spacing-xs) 0 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
}

.setting-item select {
    padding: var(--spacing-sm);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--card-bg);
    color: var(--text-primary);
}

.toggle {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.toggle input {
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
    background-color: var(--border-medium);
    border-radius: 24px;
    transition: all var(--transition-fast);
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: all var(--transition-fast);
}

input:checked + .toggle-slider {
    background-color: var(--primary);
}

input:checked + .toggle-slider:before {
    transform: translateX(26px);
}

[dir="rtl"] input:checked + .toggle-slider:before {
    transform: translateX(-26px);
}

.save-settings-btn {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.save-settings-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* ===== النسخ الاحتياطي ===== */
.backup-section {
    margin-bottom: var(--spacing-lg);
}

.backup-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.backup-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
}

.backup-card {
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    color: white;
    transition: all var(--transition-medium);
}

.backup-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
}

.backup-card.full {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.backup-card.restore {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.backup-icon {
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
}

.backup-card h4 {
    margin: 0 0 var(--spacing-sm);
}

.backup-card p {
    margin: 0 0 var(--spacing-md);
    font-size: 0.85rem;
    opacity: 0.9;
}

.backup-btn,
.restore-btn {
    width: 100%;
    padding: var(--spacing-sm);
    background: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    text-align: center;
    display: block;
    transition: all var(--transition-fast);
}

.backup-btn:hover,
.restore-btn:hover {
    transform: translateY(-2px);
}

.backup-btn {
    color: #667eea;
}

.restore-btn {
    color: #f5576c;
}

/* ===== منطقة الخطر ===== */
.danger-zone {
    border: 2px solid var(--error);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    background: rgba(239, 68, 68, 0.05);
}

.danger-zone h4 {
    margin: 0 0 var(--spacing-sm);
    color: var(--error);
}

.danger-zone p {
    margin: 0 0 var(--spacing-md);
    color: var(--text-secondary);
}

.danger-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.danger-btn {
    flex: 1;
    padding: var(--spacing-sm);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.danger-btn.export {
    background: var(--warning);
    color: white;
}

.danger-btn.delete {
    background: var(--error);
    color: white;
}

.danger-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* ===== حالة التحميل ===== */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
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
    margin-bottom: var(--spacing-md);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .profile-manager {
        padding: var(--spacing-md);
    }

    .profile-header {
        flex-direction: column;
        text-align: center;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .profile-stats {
        grid-template-columns: 1fr;
        gap: var(--spacing-md);
    }

    .goals-stats {
        grid-template-columns: 1fr;
    }

    .backup-cards {
        grid-template-columns: 1fr;
    }

    .danger-actions {
        flex-direction: column;
    }

    .tabs-navigation {
        flex-wrap: wrap;
    }

    .tab-btn {
        flex: none;
        width: calc(50% - 4px);
    }
}

@media (max-width: 480px) {
    .tab-btn {
        width: 100%;
    }

    .goal-dates {
        flex-direction: column;
        gap: var(--spacing-xs);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .smart-recommendations ul {
    padding-left: 0;
    padding-right: var(--spacing-lg);
}

[dir="rtl"] .message button {
    margin-left: 0;
    margin-right: auto;
}

[dir="rtl"] .setting-item {
    flex-direction: row-reverse;
    text-align: right;
}

/* ===== دعم الحركة المخفضة ===== */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
}

.reduce-motion .goal-card:hover,
.reduce-motion .backup-card:hover,
.reduce-motion .save-btn:hover {
    transform: none !important;
}

.reduce-motion .spinner {
    animation: none !important;
}
            `}</style>
        </div>
    );
}

export default ProfileManager;