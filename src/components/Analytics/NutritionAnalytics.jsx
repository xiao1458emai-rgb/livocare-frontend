// src/components/Analytics/NutritionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as stats from 'simple-statistics';
import { mean } from 'mathjs';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import axiosInstance from '../../services/api';
import './Analytics.css';

// تسجيل العناصر الضرورية لـ Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const NutritionAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [smartInsights, setSmartInsights] = useState(null);
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // معرفة إذا كانت اللغة العربية
    const isArabic = i18n.language.startsWith('ar');

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [refreshTrigger]);

    // دالة مساعدة لحساب المتوسط بأمان
    const safeMean = (arr) => {
        if (!arr || arr.length === 0) return 0;
        try {
            return mean(arr);
        } catch (error) {
            console.warn('Error calculating mean:', error);
            return 0;
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            
            const [
                mealsRes,
                sleepRes,
                moodRes,
                activitiesRes,
                habitsRes,
                healthRes
            ] = await Promise.all([
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/habit-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] }))
            ]);

            // ✅ التأكد من أن البيانات مصفوفات
            const allData = {
                meals: Array.isArray(mealsRes.data) ? mealsRes.data : [],
                sleep: Array.isArray(sleepRes.data) ? sleepRes.data : [],
                mood: Array.isArray(moodRes.data) ? moodRes.data : [],
                activities: Array.isArray(activitiesRes.data) ? activitiesRes.data : [],
                habits: Array.isArray(habitsRes.data) ? habitsRes.data : [],
                health: Array.isArray(healthRes.data) ? healthRes.data : []
            };
            
            console.log('🍽️ تحليل تغذوي ذكي...', {
                meals: allData.meals.length,
                sleep: allData.sleep.length,
                mood: allData.mood.length,
                activities: allData.activities.length,
                health: allData.health.length
            });
            
            // تجهيز البيانات الأسبوعية للرسوم البيانية
            const weekly = processWeeklyData(allData.meals);
            setWeeklyData(weekly);
            
            const analysis = analyzeNutritionIntelligently(allData);
            setSmartInsights(analysis);

        } catch (err) {
            console.error('❌ Error:', err);
            setError(t('analytics.common.error'));
        } finally {
            setLoading(false);
        }
    };

    // تجهيز البيانات الأسبوعية
    const processWeeklyData = (meals) => {
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric' });
            
            const dayMeals = meals.filter(meal => {
                if (!meal.meal_time) return false;
                const mealDate = new Date(meal.meal_time).toDateString();
                return mealDate === date.toDateString();
            });
            
            const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
            const totalProtein = dayMeals.reduce((sum, meal) => sum + (meal.total_protein || 0), 0);
            const totalCarbs = dayMeals.reduce((sum, meal) => sum + (meal.total_carbs || 0), 0);
            const totalFat = dayMeals.reduce((sum, meal) => sum + (meal.total_fat || 0), 0);
            
            last7Days.push({
                name: dateStr,
                calories: Math.round(totalCalories * 10) / 10,
                protein: Math.round(totalProtein * 10) / 10,
                carbs: Math.round(totalCarbs * 10) / 10,
                fat: Math.round(totalFat * 10) / 10,
                meals: dayMeals.length
            });
        }
        
        return last7Days;
    };

    // ==================== دوال الرسم البياني ====================

    const getCaloriesChartData = () => {
        return {
            labels: weeklyData.map(d => d.name),
            datasets: [{
                label: t('analytics.nutrition.charts.caloriesLabel'),
                data: weeklyData.map(d => d.calories),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: true,
                pointHoverRadius: 8
            }]
        };
    };

    const getProteinChartData = () => {
        return {
            labels: weeklyData.map(d => d.name),
            datasets: [{
                label: t('analytics.nutrition.charts.proteinLabel'),
                data: weeklyData.map(d => d.protein),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: true
            }]
        };
    };

    const getCarbsChartData = () => {
        return {
            labels: weeklyData.map(d => d.name),
            datasets: [{
                label: t('analytics.nutrition.charts.carbsLabel'),
                data: weeklyData.map(d => d.carbs),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: true
            }]
        };
    };

    const getFatChartData = () => {
        return {
            labels: weeklyData.map(d => d.name),
            datasets: [{
                label: t('analytics.nutrition.charts.fatLabel'),
                data: weeklyData.map(d => d.fat),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: true
            }]
        };
    };

    const getMealDistributionData = () => {
        if (!smartInsights?.summary?.mealDistribution) return null;
        
        const distribution = smartInsights.summary.mealDistribution;
        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];
        
        return {
            labels: Object.keys(distribution).map(key => t(`nutrition.${key.toLowerCase()}`, key)),
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: colors.slice(0, Object.keys(distribution).length),
                borderColor: darkMode ? '#1e293b' : '#ffffff',
                borderWidth: 2,
                hoverOffset: 15
            }]
        };
    };

    // خيارات الرسم البياني
    const getChartOptions = (title, yAxisLabel) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                rtl: isArabic,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    color: darkMode ? '#f8fafc' : '#2c3e50'
                }
            },
            tooltip: {
                rtl: isArabic,
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                titleColor: darkMode ? '#f8fafc' : '#ffffff',
                bodyColor: darkMode ? '#cbd5e1' : '#ffffff',
                padding: 10
            }
        },
        scales: {
            x: {
                grid: {
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    color: darkMode ? '#cbd5e1' : '#64748b'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: darkMode ? '#cbd5e1' : '#64748b'
                },
                title: {
                    display: !!yAxisLabel,
                    text: yAxisLabel,
                    color: darkMode ? '#f8fafc' : '#2c3e50'
                }
            }
        }
    });

    const getPieOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                rtl: isArabic,
                labels: {
                    color: darkMode ? '#f8fafc' : '#2c3e50',
                    padding: 15
                }
            },
            tooltip: {
                rtl: isArabic,
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    });

    // ==================== دوال التحليل ====================

    const analyzeNutritionIntelligently = (allData) => {
        const { meals, sleep, mood, activities, habits, health } = allData;

        // ✅ تحليل بيانات الوجبات مع تصفية القيم غير المنطقية
        const mealData = meals
            .filter(meal => meal.meal_time)
            .map(meal => ({
                calories: Math.max(0, meal.total_calories || 0),
                protein: Math.max(0, meal.total_protein || 0),
                carbs: Math.max(0, meal.total_carbs || 0),
                fat: Math.max(0, meal.total_fat || 0),
                type: meal.meal_type || 'Other',
                time: new Date(meal.meal_time).getHours(),
                date: new Date(meal.meal_time).toDateString()
            }));

        const totalCalories = mealData.reduce((sum, m) => sum + m.calories, 0);
        const totalProtein = mealData.reduce((sum, m) => sum + m.protein, 0);
        const totalCarbs = mealData.reduce((sum, m) => sum + m.carbs, 0);
        const totalFat = mealData.reduce((sum, m) => sum + m.fat, 0);
        const mealsCount = mealData.length;

        const avgCalories = mealsCount > 0 ? totalCalories / mealsCount : 0;
        const avgProtein = mealsCount > 0 ? totalProtein / mealsCount : 0;
        const avgCarbs = mealsCount > 0 ? totalCarbs / mealsCount : 0;
        const avgFat = mealsCount > 0 ? totalFat / mealsCount : 0;

        // ✅ تحليل النوم
        const sleepHours = sleep
            .map(s => parseFloat(s.duration_hours) || 0)
            .filter(h => h > 0 && h < 24);
        const avgSleep = safeMean(sleepHours);

        // ✅ تحليل المزاج
        const getMoodScore = (moodStr) => {
            const map = { 
                'Excellent': 5, 'ممتاز': 5,
                'Good': 4, 'جيد': 4,
                'Neutral': 3, 'محايد': 3,
                'Stressed': 2, 'مرهق': 2,
                'Anxious': 2, 'قلق': 2,
                'Sad': 1, 'حزين': 1
            };
            return map[moodStr] || 3;
        };
        
        const moodScores = mood.map(m => getMoodScore(m.mood));
        const avgMood = safeMean(moodScores);

        // ✅ تحليل النشاط
        const activityMinutes = activities
            .map(a => a.duration_minutes || 0)
            .filter(m => m > 0 && m <= 180);
        const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);

        // ✅ تحليل الوزن
        const weights = health
            .map(h => parseFloat(h.weight_kg))
            .filter(w => w && w >= 30 && w <= 200);
        const currentWeight = weights.length > 0 ? weights[weights.length - 1] : 0;
        const weightChange = weights.length >= 2 ? 
            weights[weights.length - 1] - weights[0] : 0;

        // ✅ توزيع الوجبات
        const mealDistribution = {};
        mealData.forEach(m => {
            mealDistribution[m.type] = (mealDistribution[m.type] || 0) + 1;
        });

        // ✅ تحليل أوقات الوجبات
        const mealTimes = mealData.map(m => m.time);
        const earlyMeals = mealTimes.filter(t => t >= 5 && t <= 9).length;
        const lateMeals = mealTimes.filter(t => t >= 22 || t <= 4).length;

        // ✅ أنماط الحياة
        const lifePatterns = analyzeLifePatterns(mealData, mealTimes, earlyMeals, lateMeals, avgProtein, mealsCount);
        
        // ✅ التنبؤات
        const predictions = generatePredictions(avgCalories, avgProtein, weightChange);
        
        // ✅ تحليل المزاج مقابل الطعام
        const moodVsFood = analyzeMoodVsFood(mealData, mood);
        
        // ✅ الإنذارات الصحية
        const healthAlerts = generateHealthAlerts(mealData, avgProtein, avgCalories, lateMeals, earlyMeals, mealsCount, avgSleep);

        // ✅ المشكلات
        const issues = [];

        if (avgCalories < 1500) {
            issues.push({
                type: 'low_calories',
                severity: 'high',
                message: t('analytics.nutrition.issues.lowCalories.message'),
                details: t('analytics.nutrition.issues.lowCalories.details', { calories: Math.round(avgCalories) }),
                color: '#ef4444'
            });
        } else if (avgCalories > 3000) {
            issues.push({
                type: 'high_calories',
                severity: 'high',
                message: t('analytics.nutrition.issues.highCalories.message'),
                details: t('analytics.nutrition.issues.highCalories.details', { calories: Math.round(avgCalories) }),
                color: '#f59e0b'
            });
        } else {
            issues.push({
                type: 'good_calories',
                severity: 'good',
                message: '✅ ' + t('analytics.nutrition.score.good'),
                details: t('analytics.nutrition.summary.avgCalories') + ': ' + Math.round(avgCalories),
                color: '#10b981'
            });
        }

        if (avgProtein < 50 && avgProtein > 0) {
            issues.push({
                type: 'low_protein',
                severity: 'medium',
                message: t('analytics.nutrition.issues.lowProtein.message'),
                details: t('analytics.nutrition.issues.lowProtein.details', { protein: avgProtein.toFixed(1) }),
                color: '#f59e0b'
            });
        } else if (avgProtein >= 50) {
            issues.push({
                type: 'good_protein',
                severity: 'good',
                message: '✅ ' + t('analytics.nutrition.issues.goodProtein'),
                details: t('analytics.nutrition.summary.avgProtein') + ': ' + avgProtein.toFixed(1) + 'g',
                color: '#10b981'
            });
        }

        if (lateMeals > 2) {
            issues.push({
                type: 'late_meals',
                severity: 'medium',
                message: t('analytics.nutrition.issues.lateMeals.message'),
                details: t('analytics.nutrition.issues.lateMeals.details', { count: lateMeals }),
                color: '#f59e0b'
            });
        }

        if (earlyMeals === 0 && mealsCount > 0) {
            issues.push({
                type: 'no_breakfast',
                severity: 'medium',
                message: t('analytics.nutrition.issues.noBreakfast.message'),
                details: t('analytics.nutrition.issues.noBreakfast.details'),
                color: '#f59e0b'
            });
        }

        // ✅ العلاقات المترابطة
        const correlations = [];

        if (avgSleep < 6 && avgSleep > 0 && avgCalories < 1500) {
            correlations.push({
                type: 'sleep_calories',
                insight: t('analytics.nutrition.correlations.sleepCalories.insight'),
                recommendation: t('analytics.nutrition.correlations.sleepCalories.recommendation')
            });
        }

        if (totalActivity > 200 && avgCalories < 2000 && avgCalories > 0) {
            correlations.push({
                type: 'activity_calories',
                insight: t('analytics.nutrition.correlations.activityCalories.insight'),
                recommendation: t('analytics.nutrition.correlations.activityCalories.recommendation')
            });
        }

        if (avgMood < 3 && avgMood > 0 && avgCalories < 1500) {
            correlations.push({
                type: 'mood_calories',
                insight: t('analytics.nutrition.correlations.moodCalories.insight'),
                recommendation: t('analytics.nutrition.correlations.moodCalories.recommendation')
            });
        }

        if (currentWeight > 90 && avgCalories > 2500) {
            correlations.push({
                type: 'weight_calories',
                insight: t('analytics.nutrition.correlations.weightCalories.insight'),
                recommendation: t('analytics.nutrition.correlations.weightCalories.recommendation')
            });
        }

        // ✅ التوصيات
        const recommendations = [];

        if (avgCalories < 1500 && avgCalories > 0) {
            const needed = Math.round(2000 - avgCalories);
            recommendations.push({
                icon: '🔥',
                title: t('analytics.nutrition.recommendations.increaseCalories.title'),
                mainAdvice: t('analytics.nutrition.recommendations.increaseCalories.advice', { calories: needed }),
                reasons: [t('analytics.nutrition.recommendations.defaultReason')],
                tips: t('analytics.nutrition.recommendations.increaseCalories.tips', { returnObjects: true }),
                priority: avgCalories < 1200 ? 'urgent' : 'high',
                color: '#ef4444'
            });
        } else if (avgCalories > 2500) {
            const needed = Math.round(avgCalories - 2200);
            recommendations.push({
                icon: '⚖️',
                title: t('analytics.nutrition.recommendations.decreaseCalories.title'),
                mainAdvice: t('analytics.nutrition.recommendations.decreaseCalories.advice', { calories: needed }),
                reasons: [t('analytics.nutrition.recommendations.defaultReason')],
                tips: t('analytics.nutrition.recommendations.decreaseCalories.tips', { returnObjects: true }),
                priority: 'high',
                color: '#f59e0b'
            });
        } else if (avgCalories >= 1500 && avgCalories <= 2500 && avgCalories > 0) {
            recommendations.push({
                icon: '✅',
                title: t('analytics.nutrition.recommendations.good.title'),
                mainAdvice: t('analytics.nutrition.recommendations.good.advice'),
                reasons: t('analytics.nutrition.recommendations.good.reasons', { returnObjects: true }),
                tips: t('analytics.nutrition.recommendations.good.tips', { returnObjects: true }),
                priority: 'low',
                color: '#10b981'
            });
        }

        if (avgProtein < 50 && avgProtein > 0) {
            const needed = Math.round(50 - avgProtein);
            recommendations.push({
                icon: '💪',
                title: t('analytics.nutrition.recommendations.increaseProtein.title'),
                mainAdvice: t('analytics.nutrition.recommendations.increaseProtein.advice', { protein: needed }),
                reasons: t('analytics.nutrition.recommendations.increaseProtein.reasons', { returnObjects: true }),
                tips: t('analytics.nutrition.recommendations.increaseProtein.tips', { returnObjects: true }),
                priority: 'high',
                color: '#f59e0b'
            });
        }

        if (lateMeals > 2) {
            recommendations.push({
                icon: '🌙',
                title: t('analytics.nutrition.recommendations.avoidLateMeals.title'),
                mainAdvice: t('analytics.nutrition.recommendations.avoidLateMeals.advice'),
                reasons: t('analytics.nutrition.recommendations.avoidLateMeals.reasons', { returnObjects: true }),
                tips: t('analytics.nutrition.recommendations.avoidLateMeals.tips', { returnObjects: true }),
                priority: 'medium',
                color: '#f59e0b'
            });
        }

        if (earlyMeals === 0 && mealsCount > 0) {
            recommendations.push({
                icon: '🌅',
                title: t('analytics.nutrition.recommendations.eatBreakfast.title'),
                mainAdvice: t('analytics.nutrition.recommendations.eatBreakfast.advice'),
                reasons: t('analytics.nutrition.recommendations.eatBreakfast.reasons', { returnObjects: true }),
                tips: t('analytics.nutrition.recommendations.eatBreakfast.tips', { returnObjects: true }),
                priority: 'medium',
                color: '#f59e0b'
            });
        }

        // ✅ درجة التغذية
        const nutritionScore = calculateNutritionScore({
            avgCalories, avgProtein, avgCarbs, avgFat,
            earlyMeals, lateMeals, mealsCount,
            mealDistribution
        });

        // ✅ درجة الصحة الإجمالية
        const healthScore = calculateHealthScore(avgCalories, avgProtein, avgSleep, avgMood, totalActivity);

        const summary = {
            totalMeals: mealsCount,
            totalCalories: Math.round(totalCalories),
            avgCalories: Math.round(avgCalories),
            avgProtein: avgProtein.toFixed(1),
            avgCarbs: avgCarbs.toFixed(1),
            avgFat: avgFat.toFixed(1),
            mealDistribution,
            breakfastRate: earlyMeals > 0 ? Math.round((earlyMeals / mealsCount) * 100) : 0,
            lateMealCount: lateMeals,
            nutritionScore: nutritionScore.total,
            healthScore: healthScore
        };

        return {
            summary,
            issues,
            correlations,
            lifePatterns,
            predictions,
            moodVsFood,
            healthAlerts,
            recommendations: recommendations.sort((a, b) => {
                const priorityWeight = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
            }),
            lastUpdated: new Date().toISOString()
        };
    };

    // ✅ تحليل أنماط الحياة - تم إصلاح المسار
    const analyzeLifePatterns = (mealData, mealTimes, earlyMeals, lateMeals, avgProtein, mealsCount) => {
        const patterns = [];
        
        const uniqueDays = new Set(mealData.map(m => m.date)).size;
        const mealsPerDay = uniqueDays > 0 ? mealData.length / uniqueDays : 0;
        
        if (mealsPerDay < 2.5 && mealsPerDay > 0) {
            patterns.push({
                icon: '⚠️',
                title: t('analytics.nutrition.lifePatterns.irregular.title'),
                description: t('analytics.nutrition.lifePatterns.irregular.description'),
                advice: t('analytics.nutrition.lifePatterns.irregular.advice')
            });
        } else if (mealsPerDay > 5) {
            patterns.push({
                icon: '⚠️',
                title: t('analytics.nutrition.lifePatterns.tooMany.title'),
                description: t('analytics.nutrition.lifePatterns.tooMany.description'),
                advice: t('analytics.nutrition.lifePatterns.tooMany.advice')
            });
        } else if (mealsPerDay >= 2.5 && mealsPerDay <= 5 && mealsPerDay > 0) {
            patterns.push({
                icon: '✅',
                title: t('analytics.nutrition.lifePatterns.regular.title'),
                description: t('analytics.nutrition.lifePatterns.regular.description'),
                advice: t('analytics.nutrition.lifePatterns.regular.advice')
            });
        }
        
        if (lateMeals > earlyMeals && lateMeals > 0) {
            patterns.push({
                icon: '🌙',
                title: t('analytics.nutrition.lifePatterns.lateEater.title'),
                description: t('analytics.nutrition.lifePatterns.lateEater.description', { count: lateMeals }),
                advice: t('analytics.nutrition.lifePatterns.lateEater.advice')
            });
        }
        
        if (avgProtein < 50 && avgProtein > 0) {
            patterns.push({
                icon: '💪',
                title: t('analytics.nutrition.lifePatterns.lowProtein.title'),
                description: t('analytics.nutrition.lifePatterns.lowProtein.description', { protein: avgProtein.toFixed(1) }),
                advice: t('analytics.nutrition.lifePatterns.lowProtein.advice')
            });
        }
        
        return patterns;
    };

    const generatePredictions = (avgCalories, avgProtein, weightChange) => {
        const predictions = [];
        
        if (avgCalories > 2500 && weightChange > 0) {
            const monthlyGain = Math.min(weightChange * 30, 5);
            predictions.push({
                icon: '⚠️',
                title: t('analytics.nutrition.predictions.weightGain.title'),
                prediction: t('analytics.nutrition.predictions.weightGain.prediction', { weight: monthlyGain.toFixed(1) }),
                probability: '80%',
                color: '#ef4444'
            });
        }
        
        if (avgCalories < 1500 && weightChange < 0 && avgCalories > 0) {
            const monthlyLoss = Math.min(Math.abs(weightChange) * 30, 4);
            predictions.push({
                icon: '⚡',
                title: t('analytics.nutrition.predictions.weightLoss.title'),
                prediction: t('analytics.nutrition.predictions.weightLoss.prediction', { weight: monthlyLoss.toFixed(1) }),
                probability: '75%',
                color: '#10b981'
            });
        }
        
        if (avgProtein < 40 && avgCalories < 1800 && avgProtein > 0) {
            predictions.push({
                icon: '😴',
                title: t('analytics.nutrition.predictions.fatigue.title'),
                prediction: t('analytics.nutrition.predictions.fatigue.prediction'),
                probability: '85%',
                color: '#f59e0b'
            });
        }
        
        return predictions;
    };

    const analyzeMoodVsFood = (mealData, moodData) => {
        if (mealData.length === 0 || moodData.length === 0) return null;
        
        const highSugarDays = mealData.filter(m => m.carbs > 50).map(m => m.date);
        const moodAfterHighSugar = moodData.filter(m => {
            const moodDate = new Date(m.entry_time).toDateString();
            return highSugarDays.includes(moodDate);
        });
        
        const badMoodAfterSugar = moodAfterHighSugar.filter(m => 
            ['Stressed', 'Anxious', 'Sad', 'مرهق', 'قلق', 'حزين'].includes(m.mood)
        ).length;
        
        if (badMoodAfterSugar > 2 && moodAfterHighSugar.length > 0) {
            return {
                insight: t('analytics.nutrition.moodFood.insight'),
                details: t('analytics.nutrition.moodFood.details', { count: badMoodAfterSugar, total: moodAfterHighSugar.length }),
                advice: t('analytics.nutrition.moodFood.advice')
            };
        }
        
        return null;
    };

    const generateHealthAlerts = (mealData, avgProtein, avgCalories, lateMeals, earlyMeals, mealsCount, avgSleep) => {
        const alerts = [];
        const today = new Date().toDateString();
        const todayMeals = mealData.filter(m => m.date === today).length;
        
        if (todayMeals === 0) {
            alerts.push({
                icon: '🔔',
                message: t('analytics.nutrition.alerts.noMealsToday.message'),
                type: 'warning',
                action: t('analytics.nutrition.alerts.noMealsToday.action')
            });
        }
        
        if (avgSleep < 6 && avgSleep > 0) {
            alerts.push({
                icon: '😴',
                message: t('analytics.nutrition.alerts.poorSleep.message'),
                type: 'warning',
                action: t('analytics.nutrition.alerts.poorSleep.action')
            });
        }
        
        if (avgProtein < 50 && avgProtein > 0) {
            alerts.push({
                icon: '💪',
                message: t('analytics.nutrition.alerts.lowProtein.message'),
                type: 'danger',
                action: t('analytics.nutrition.alerts.lowProtein.action')
            });
        }
        
        if (lateMeals > 2) {
            alerts.push({
                icon: '🌙',
                message: t('analytics.nutrition.alerts.lateMeals.message'),
                type: 'warning',
                action: t('analytics.nutrition.alerts.lateMeals.action')
            });
        }
        
        return alerts;
    };

    const calculateNutritionScore = (data) => {
        const {
            avgCalories, avgProtein, avgCarbs, avgFat,
            earlyMeals, lateMeals, mealsCount,
            mealDistribution
        } = data;

        let score = 0;

        if (avgCalories >= 1800 && avgCalories <= 2500) score += 30;
        else if (avgCalories >= 1500 && avgCalories < 1800) score += 20;
        else if (avgCalories > 2500 && avgCalories <= 3000) score += 15;
        else if (avgCalories > 0) score += 10;

        if (avgProtein >= 60) score += 20;
        else if (avgProtein >= 40) score += 15;
        else if (avgProtein >= 20) score += 10;
        else if (avgProtein > 0) score += 5;

        if (avgCarbs >= 200 && avgCarbs <= 300) score += 15;
        else if (avgCarbs >= 150 && avgCarbs < 200) score += 10;
        else if (avgCarbs > 0) score += 5;

        if (avgFat >= 50 && avgFat <= 70) score += 15;
        else if (avgFat >= 30 && avgFat < 50) score += 10;
        else if (avgFat > 0) score += 5;

        if (earlyMeals > 0) score += 5;
        if (lateMeals === 0) score += 5;
        else if (lateMeals <= 2) score += 3;

        const mealTypeCount = Object.keys(mealDistribution || {}).length;
        if (mealTypeCount >= 3) score += 10;
        else if (mealTypeCount >= 2) score += 7;
        else if (mealTypeCount > 0) score += 3;

        return {
            total: Math.min(100, Math.max(0, score)),
            grade: score >= 90 ? 'A+' :
                   score >= 80 ? 'A' :
                   score >= 70 ? 'B' :
                   score >= 60 ? 'C' :
                   score >= 50 ? 'D' : 'F'
        };
    };

    const calculateHealthScore = (calories, protein, sleep, mood, activity) => {
        let score = 0;
        
        if (calories >= 1800 && calories <= 2500) score += 25;
        else if (calories >= 1500 && calories < 1800) score += 15;
        else if (calories > 0) score += 10;
        
        if (protein >= 60) score += 25;
        else if (protein >= 40) score += 20;
        else if (protein >= 20) score += 15;
        else if (protein > 0) score += 10;
        
        if (sleep >= 7) score += 25;
        else if (sleep >= 6) score += 20;
        else if (sleep > 0) score += 15;
        
        if (mood >= 4) score += 25;
        else if (mood >= 3) score += 20;
        else if (mood > 0) score += 15;
        
        return Math.min(100, Math.max(0, score));
    };

    const getScoreStatus = (score) => {
        if (score >= 80) return t('analytics.common.excellent', 'Excellent');
        if (score >= 60) return t('analytics.common.good', 'Good');
        if (score >= 40) return t('analytics.common.fair', 'Fair');
        return t('analytics.common.needsImprovement', 'Needs Improvement');
    };

    const COLORS = {
        healthy: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        purple: '#8b5cf6'
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.nutrition.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('analytics.common.retry')}
                </button>
            </div>
        );
    }

    if (!smartInsights || smartInsights.summary.totalMeals === 0) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>📝 {t('analytics.common.noData')}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {t('analytics.common.refresh')}
                </button>
            </div>
        );
    }

    return (
        <div className={`analytics-container nutrition-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{t('analytics.nutrition.title')}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={t('analytics.common.refresh')}>
                    🔄
                </button>
            </div>

            {smartInsights && (
                <div className="insights-container">
                    
                    {/* Health Score Card */}
                    <div className="health-score-card">
                        <h3>{t('analytics.nutrition.healthScore.title')}</h3>
                        <div className="score-grid">
                            <div className="score-item" style={{ background: COLORS.healthy + '20' }}>
                                <span className="score-icon">❤️</span>
                                <span className="score-label">{t('analytics.nutrition.healthScore.heartRate')}</span>
                                <span className="score-value">{t('analytics.nutrition.healthScore.normal')}</span>
                            </div>
                            <div className="score-item" style={{ background: COLORS.info + '20' }}>
                                <span className="score-icon">🌙</span>
                                <span className="score-label">{t('analytics.nutrition.healthScore.sleep')}</span>
                                <span className="score-value">{smartInsights.summary.healthScore > 70 ? t('analytics.common.good') : t('analytics.common.fair')}</span>
                            </div>
                            <div className="score-item" style={{ background: COLORS.warning + '20' }}>
                                <span className="score-icon">🥗</span>
                                <span className="score-label">{t('analytics.nutrition.healthScore.nutrition')}</span>
                                <span className="score-value">{getScoreStatus(smartInsights.summary.nutritionScore)}</span>
                            </div>
                            <div className="score-item" style={{ background: COLORS.purple + '20' }}>
                                <span className="score-icon">😊</span>
                                <span className="score-label">{t('analytics.nutrition.healthScore.mood')}</span>
                                <span className="score-value">{t('analytics.nutrition.healthScore.stable')}</span>
                            </div>
                            <div className="score-item" style={{ background: COLORS.healthy + '20' }}>
                                <span className="score-icon">🏃</span>
                                <span className="score-label">{t('analytics.nutrition.healthScore.activity')}</span>
                                <span className="score-value">{t('analytics.nutrition.healthScore.active')}</span>
                            </div>
                        </div>
                    </div>

                    {/* الرسوم البيانية */}
                    <div className="charts-grid">
                        {weeklyData.length > 0 && (
                            <>
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h4>{t('analytics.nutrition.charts.caloriesTitle')}</h4>
                                    </div>
                                    <div className="chart-container" style={{ height: '250px' }}>
                                        <Line 
                                            data={getCaloriesChartData()} 
                                            options={getChartOptions('', t('analytics.nutrition.charts.caloriesLabel'))}
                                        />
                                    </div>
                                    <div className="chart-footer">
                                        <span className="chart-stat">
                                            {t('analytics.nutrition.charts.average')}: {(weeklyData.reduce((sum, d) => sum + d.calories, 0) / weeklyData.length).toFixed(0)} {t('nutrition.caloriesUnit')}
                                        </span>
                                    </div>
                                </div>

                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h4>{t('analytics.nutrition.charts.proteinTitle')}</h4>
                                    </div>
                                    <div className="chart-container" style={{ height: '250px' }}>
                                        <Line 
                                            data={getProteinChartData()} 
                                            options={getChartOptions('', t('analytics.nutrition.charts.proteinLabel'))}
                                        />
                                    </div>
                                    <div className="chart-footer">
                                        <span className="chart-stat">
                                            {t('analytics.nutrition.charts.average')}: {(weeklyData.reduce((sum, d) => sum + d.protein, 0) / weeklyData.length).toFixed(1)} {t('nutrition.gramUnit')}
                                        </span>
                                    </div>
                                </div>

                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h4>{t('analytics.nutrition.charts.carbsTitle')}</h4>
                                    </div>
                                    <div className="chart-container" style={{ height: '250px' }}>
                                        <Line 
                                            data={getCarbsChartData()} 
                                            options={getChartOptions('', t('analytics.nutrition.charts.carbsLabel'))}
                                        />
                                    </div>
                                    <div className="chart-footer">
                                        <span className="chart-stat">
                                            {t('analytics.nutrition.charts.average')}: {(weeklyData.reduce((sum, d) => sum + d.carbs, 0) / weeklyData.length).toFixed(1)} {t('nutrition.gramUnit')}
                                        </span>
                                    </div>
                                </div>

                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h4>{t('analytics.nutrition.charts.fatTitle')}</h4>
                                    </div>
                                    <div className="chart-container" style={{ height: '250px' }}>
                                        <Line 
                                            data={getFatChartData()} 
                                            options={getChartOptions('', t('analytics.nutrition.charts.fatLabel'))}
                                        />
                                    </div>
                                    <div className="chart-footer">
                                        <span className="chart-stat">
                                            {t('analytics.nutrition.charts.average')}: {(weeklyData.reduce((sum, d) => sum + d.fat, 0) / weeklyData.length).toFixed(1)} {t('nutrition.gramUnit')}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {getMealDistributionData() && (
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h4>{t('analytics.nutrition.charts.distributionTitle')}</h4>
                                </div>
                                <div className="chart-container" style={{ height: '250px' }}>
                                    <Pie 
                                        data={getMealDistributionData()} 
                                        options={getPieOptions('')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* أنماط الحياة */}
                    {smartInsights.lifePatterns && smartInsights.lifePatterns.length > 0 && (
                        <div className="life-patterns-card">
                            <h3>{t('analytics.nutrition.lifePatterns.title')}</h3>
                            <div className="patterns-grid">
                                {smartInsights.lifePatterns.map((pattern, idx) => (
                                    <div key={idx} className="pattern-item">
                                        <span className="pattern-icon">{pattern.icon}</span>
                                        <div className="pattern-content">
                                            <h4>{pattern.title}</h4>
                                            <p>{pattern.description}</p>
                                            <p className="pattern-advice">{pattern.advice}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* التنبؤات */}
                    {smartInsights.predictions && smartInsights.predictions.length > 0 && (
                        <div className="predictions-card">
                            <h3>{t('analytics.nutrition.predictions.title')}</h3>
                            <div className="predictions-grid">
                                {smartInsights.predictions.map((pred, idx) => (
                                    <div key={idx} className="prediction-item" style={{ borderRightColor: pred.color }}>
                                        <span className="prediction-icon">{pred.icon}</span>
                                        <div className="prediction-content">
                                            <h4>{pred.title}</h4>
                                            <p className="prediction-text">{pred.prediction}</p>
                                            <p className="prediction-probability">{t('analytics.nutrition.predictions.probability')} {pred.probability}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* تحليل المزاج مقابل الطعام */}
                    {smartInsights.moodVsFood && (
                        <div className="mood-food-card">
                            <h3>{t('analytics.nutrition.moodFood.title')}</h3>
                            <div className="mood-insight">
                                <p className="insight-main">{smartInsights.moodVsFood.insight}</p>
                                <p className="insight-details">{smartInsights.moodVsFood.details}</p>
                                <p className="insight-advice">{smartInsights.moodVsFood.advice}</p>
                            </div>
                        </div>
                    )}

                    {/* الإنذارات الصحية */}
                    {smartInsights.healthAlerts && smartInsights.healthAlerts.length > 0 && (
                        <div className="alerts-card">
                            <h3>{t('analytics.nutrition.alerts.title')}</h3>
                            <div className="alerts-list">
                                {smartInsights.healthAlerts.map((alert, idx) => (
                                    <div key={idx} className={`alert-item ${alert.type}`}>
                                        <span className="alert-icon">{alert.icon}</span>
                                        <span className="alert-message">{alert.message}</span>
                                        <span className="alert-action">{alert.action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* بطاقات الملخص */}
                    <div className="summary-cards">
                        <div className="summary-card" style={{ background: COLORS.healthy + '20', borderColor: COLORS.healthy }}>
                            <span className="summary-icon">🍽️</span>
                            <span className="summary-label">{t('analytics.nutrition.summary.totalMeals')}</span>
                            <span className="summary-value">{smartInsights.summary.totalMeals}</span>
                        </div>
                        <div className="summary-card" style={{ background: COLORS.danger + '20', borderColor: COLORS.danger }}>
                            <span className="summary-icon">🔥</span>
                            <span className="summary-label">{t('analytics.nutrition.summary.totalCalories')}</span>
                            <span className="summary-value">{smartInsights.summary.totalCalories}</span>
                        </div>
                        <div className="summary-card" style={{ background: COLORS.info + '20', borderColor: COLORS.info }}>
                            <span className="summary-icon">📊</span>
                            <span className="summary-label">{t('analytics.nutrition.summary.avgCalories')}</span>
                            <span className="summary-value">{smartInsights.summary.avgCalories}</span>
                        </div>
                        <div className="summary-card" style={{ background: COLORS.warning + '20', borderColor: COLORS.warning }}>
                            <span className="summary-icon">🥩</span>
                            <span className="summary-label">{t('analytics.nutrition.summary.avgProtein')}</span>
                            <span className="summary-value">{smartInsights.summary.avgProtein}g</span>
                        </div>
                    </div>

                    {/* درجة التغذية */}
                    <div className="score-card">
                        <h3>{t('analytics.nutrition.score.title')}</h3>
                        <div className="score-circle" style={{
                            background: `conic-gradient(${smartInsights.summary.nutritionScore >= 80 ? COLORS.healthy : 
                                smartInsights.summary.nutritionScore >= 60 ? COLORS.warning : COLORS.danger} 0% ${smartInsights.summary.nutritionScore}%, #ddd ${smartInsights.summary.nutritionScore}% 100%)`
                        }}>
                            <span>{smartInsights.summary.nutritionScore}</span>
                        </div>
                        <p className="score-status" style={{
                            color: smartInsights.summary.nutritionScore >= 80 ? COLORS.healthy : 
                                   smartInsights.summary.nutritionScore >= 60 ? COLORS.warning : COLORS.danger
                        }}>
                            {smartInsights.summary.nutritionScore >= 80 ? t('analytics.nutrition.score.excellent') :
                             smartInsights.summary.nutritionScore >= 60 ? t('analytics.nutrition.score.good') :
                             smartInsights.summary.nutritionScore >= 40 ? t('analytics.nutrition.score.fair') :
                             t('analytics.nutrition.score.needsImprovement')}
                        </p>
                    </div>

                    {/* المشكلات */}
                    {smartInsights.issues.length > 0 && (
                        <div className="issues-card">
                            <h3>{t('analytics.nutrition.issues.title')}</h3>
                            <div className="issues-list">
                                {smartInsights.issues.map((issue, idx) => (
                                    <div key={idx} className={`issue-item severity-${issue.severity}`} style={{ borderLeftColor: issue.color }}>
                                        <p className="issue-message" style={{ color: issue.color }}>{issue.message}</p>
                                        <p className="issue-details">{issue.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* التوصيات */}
                    {smartInsights.recommendations.length > 0 && (
                        <div className="recommendations-card">
                            <h3>{t('analytics.nutrition.recommendations.title')}</h3>
                            <div className="recommendations-list">
                                {smartInsights.recommendations.map((rec, idx) => (
                                    <div key={idx} className={`recommendation priority-${rec.priority}`} style={{ borderColor: rec.color }}>
                                        <div className="rec-header">
                                            <span className="rec-icon">{rec.icon}</span>
                                            <span className="rec-title">{rec.title}</span>
                                        </div>
                                        <p className="rec-main">{rec.mainAdvice}</p>
                                        {rec.reasons && rec.reasons.length > 0 && (
                                            <div className="rec-reasons">
                                                <strong>{t('analytics.nutrition.recommendations.why')}</strong>
                                                <ul>
                                                    {rec.reasons.map((reason, i) => (
                                                        <li key={i}>{reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {rec.tips && rec.tips.length > 0 && (
                                            <div className="rec-tips">
                                                <strong>{t('analytics.nutrition.recommendations.tips')}</strong>
                                                <ul>
                                                    {rec.tips.map((tip, i) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* توزيع الوجبات */}
                    {Object.keys(smartInsights.summary.mealDistribution || {}).length > 0 && (
                        <div className="distribution-card">
                            <h3>{t('analytics.nutrition.distribution.title')}</h3>
                            <div className="distribution-list">
                                {Object.entries(smartInsights.summary.mealDistribution).map(([type, count]) => (
                                    <div key={type} className="distribution-item">
                                        <span className="meal-type">{t(`nutrition.${type.toLowerCase()}`, type)}</span>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{
                                                width: `${(count / smartInsights.summary.totalMeals) * 100}%`,
                                                backgroundColor: type === 'Breakfast' ? COLORS.healthy :
                                                               type === 'Lunch' ? COLORS.warning :
                                                               type === 'Dinner' ? COLORS.info :
                                                               type === 'Snack' ? COLORS.purple : COLORS.danger
                                            }}></div>
                                        </div>
                                        <span className="meal-count">{count} {t('analytics.nutrition.distribution.meal')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="analytics-footer">
                        <small>{t('analytics.common.lastUpdate')}: {new Date(smartInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionAnalytics;