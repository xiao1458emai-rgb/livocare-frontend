// src/components/Reports.jsx
'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

// ===========================================
// دوال التحليل المحسنة
// ===========================================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// ✅ تحليل بيانات النوم
const analyzeSleepData = (sleepData) => {
    if (!sleepData || sleepData.length === 0) { 
        return { 
            avgHours: 0, 
            totalNights: 0, 
            hasData: false, 
            status: 'no_data',
            message: '',
            trend: 'neutral',
            consistency: 0
        }; 
    }
    
    let totalHours = 0;
    let validCount = 0;
    let hoursList = [];
    
    sleepData.forEach(sleep => {
        const start = sleep.sleep_start || sleep.start_time || sleep.start;
        const end = sleep.sleep_end || sleep.end_time || sleep.end;
        
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const duration = (endDate - startDate) / (1000 * 60 * 60);
            
            if (duration > 0 && duration <= 24) {
                totalHours += duration;
                hoursList.push(duration);
                validCount++;
            }
        }
    });
    
    const avgHours = validCount > 0 ? roundNumber(totalHours / validCount, 1) : 0;
    
    // حساب الاتساق
    let consistency = 0;
    if (hoursList.length > 1) {
        const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length;
        const variance = hoursList.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hoursList.length;
        const stdDev = Math.sqrt(variance);
        consistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / avg) * 100)));
    } else if (hoursList.length === 1) {
        consistency = 100;
    }
    
    let status = 'unknown';
    let message = '';
    let trend = 'neutral';
    
    if (avgHours >= 7 && avgHours <= 8) {
        status = 'ideal';
        message = '✅ في النطاق الموصى به';
    } else if (avgHours >= 6) {
        status = 'acceptable';
        message = '⚠️ أقل بقليل من الموصى به';
    } else if (avgHours >= 5) {
        status = 'low';
        message = '⚠️ أقل من المستوى الموصى به';
    } else if (avgHours > 0) {
        status = 'very_low';
        message = '🔴 منخفض جداً';
    }
    
    // حساب الاتجاه
    if (hoursList.length >= 3) {
        const recent = hoursList.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = hoursList.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 0.5) trend = 'up';
        else if (recent < previous - 0.5) trend = 'down';
    }
    
    return {
        avgHours,
        totalNights: validCount,
        hasData: validCount > 0,
        status,
        message,
        trend,
        consistency,
        hoursList
    };
};

// ✅ تحليل بيانات التغذية
const analyzeNutritionData = (mealsData) => {
    if (!mealsData || mealsData.length === 0) { 
        return { 
            avgCaloriesPerDay: 0, 
            avgProtein: 0, 
            avgCarbs: 0, 
            avgFat: 0,
            totalMeals: 0, 
            hasData: false,
            status: 'no_data',
            message: '',
            trend: 'neutral'
        }; 
    }
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const uniqueDays = new Set();
    const dailyCalories = [];
    
    mealsData.forEach(meal => {
        totalCalories += meal.total_calories || 0;
        
        const ingredients = meal.ingredients || [];
        ingredients.forEach(ing => {
            totalProtein += ing.protein || 0;
            totalCarbs += ing.carbs || 0;
            totalFat += ing.fat || 0;
        });
        
        if (meal.meal_time) {
            const date = new Date(meal.meal_time).toDateString();
            if (!uniqueDays.has(date)) {
                uniqueDays.add(date);
                dailyCalories.push(meal.total_calories || 0);
            }
        }
    });
    
    const daysCount = uniqueDays.size || mealsData.length;
    const mealCount = mealsData.length;
    const avgCaloriesPerDay = daysCount > 0 ? Math.round(totalCalories / daysCount) : 0;
    
    let status = 'unknown';
    let message = '';
    let trend = 'neutral';
    
    if (avgCaloriesPerDay >= 1800 && avgCaloriesPerDay <= 2200) {
        status = 'ideal';
        message = '✅ متوازن';
    } else if (avgCaloriesPerDay >= 1500) {
        status = 'acceptable';
        message = '⚠️ أقل من المستوى المتوسط';
    } else if (avgCaloriesPerDay > 2200 && avgCaloriesPerDay <= 2500) {
        status = 'acceptable';
        message = '⚠️ أعلى من المستوى المتوسط';
    } else if (avgCaloriesPerDay > 2500) {
        status = 'high';
        message = '🔴 أعلى من الموصى به';
    } else if (avgCaloriesPerDay > 0 && avgCaloriesPerDay < 1500) {
        status = 'low';
        message = '🔴 أقل من الموصى به';
    }
    
    // حساب الاتجاه
    if (dailyCalories.length >= 3) {
        const recent = dailyCalories.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = dailyCalories.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 100) trend = 'up';
        else if (recent < previous - 100) trend = 'down';
    }
    
    return {
        avgCaloriesPerDay,
        avgProtein: mealCount > 0 ? roundNumber(totalProtein / mealCount, 1) : 0,
        avgCarbs: mealCount > 0 ? roundNumber(totalCarbs / mealCount, 1) : 0,
        avgFat: mealCount > 0 ? roundNumber(totalFat / mealCount, 1) : 0,
        totalMeals: mealCount,
        hasData: mealCount > 0,
        status,
        message,
        trend
    };
};

// ✅ تحليل بيانات النشاط
const analyzeActivityData = (activityData) => {
    if (!activityData || activityData.length === 0) { 
        return { 
            totalMinutes: 0, 
            avgMinutesPerDay: 0, 
            records: 0, 
            hasData: false, 
            status: 'no_data',
            message: '',
            trend: 'neutral',
            activityTypes: {}
        }; 
    }
    
    let totalMinutes = 0;
    const uniqueDays = new Set();
    const dailyMinutes = [];
    const activityTypes = {};
    
    activityData.forEach(activity => {
        const duration = activity.duration_minutes || 0;
        totalMinutes += duration;
        
        // تحليل أنواع الأنشطة
        const type = activity.activity_type || 'other';
        activityTypes[type] = (activityTypes[type] || 0) + duration;
        
        if (activity.start_time) {
            const date = new Date(activity.start_time).toDateString();
            if (!uniqueDays.has(date)) {
                uniqueDays.add(date);
                dailyMinutes.push(duration);
            }
        }
    });
    
    const daysCount = uniqueDays.size || activityData.length;
    const avgMinutesPerDay = daysCount > 0 ? Math.round(totalMinutes / daysCount) : 0;
    
    let status = 'unknown';
    let message = '';
    let trend = 'neutral';
    
    if (avgMinutesPerDay >= 30) {
        status = 'ideal';
        message = '✅ ممتاز';
    } else if (avgMinutesPerDay >= 20) {
        status = 'acceptable';
        message = '✅ جيد';
    } else if (avgMinutesPerDay >= 10) {
        status = 'low';
        message = '⚠️ أقل من الموصى به';
    } else if (avgMinutesPerDay > 0) {
        status = 'very_low';
        message = '🔴 قليل جداً';
    }
    
    // حساب الاتجاه
    if (dailyMinutes.length >= 3) {
        const recent = dailyMinutes.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = dailyMinutes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 10) trend = 'up';
        else if (recent < previous - 10) trend = 'down';
    }
    
    return {
        totalMinutes,
        avgMinutesPerDay,
        records: activityData.length,
        hasData: activityData.length > 0,
        status,
        message,
        trend,
        activityTypes
    };
};

// ✅ تحليل البيانات الحيوية
const analyzeHealthMetricsData = (healthData) => {
    if (!healthData || healthData.length === 0) { 
        return { 
            avgWeight: 0, 
            avgSystolic: 0, 
            avgDiastolic: 0, 
            avgGlucose: 0,
            avgHeartRate: 0,
            avgSpO2: 0,
            records: 0,
            hasData: false,
            bpStatus: 'unknown',
            bpMessage: '',
            weightTrend: 'neutral',
            glucoseTrend: 'neutral'
        }; 
    }
    
    let totalWeight = 0;
    let totalSystolic = 0;
    let totalDiastolic = 0;
    let totalGlucose = 0;
    let totalHeartRate = 0;
    let totalSpO2 = 0;
    let weightCount = 0;
    let bpCount = 0;
    let glucoseCount = 0;
    let heartRateCount = 0;
    let spo2Count = 0;
    
    const weightList = [];
    const glucoseList = [];
    
    healthData.forEach(record => {
        if (record.weight_kg && record.weight_kg > 0) {
            totalWeight += parseFloat(record.weight_kg);
            weightList.push(parseFloat(record.weight_kg));
            weightCount++;
        }
        if (record.systolic_pressure && record.systolic_pressure > 0) {
            totalSystolic += record.systolic_pressure;
            totalDiastolic += record.diastolic_pressure || 0;
            bpCount++;
        }
        if (record.glucose_mgdl && record.glucose_mgdl > 0) {
            totalGlucose += record.glucose_mgdl;
            glucoseList.push(record.glucose_mgdl);
            glucoseCount++;
        }
        if (record.heart_rate && record.heart_rate > 0) {
            totalHeartRate += record.heart_rate;
            heartRateCount++;
        }
        if (record.spo2 && record.spo2 > 0) {
            totalSpO2 += record.spo2;
            spo2Count++;
        }
    });
    
    const avgSystolic = bpCount > 0 ? Math.round(totalSystolic / bpCount) : 0;
    const avgWeight = weightCount > 0 ? roundNumber(totalWeight / weightCount, 1) : 0;
    const avgGlucose = glucoseCount > 0 ? Math.round(totalGlucose / glucoseCount) : 0;
    const avgHeartRate = heartRateCount > 0 ? Math.round(totalHeartRate / heartRateCount) : 0;
    const avgSpO2 = spo2Count > 0 ? Math.round(totalSpO2 / spo2Count) : 0;
    
    // تحليل ضغط الدم
    let bpStatus = 'unknown';
    let bpMessage = '';
    if (avgSystolic >= 90 && avgSystolic <= 120) {
        bpStatus = 'ideal';
        bpMessage = '✅ ضمن النطاق المقبول';
    } else if (avgSystolic >= 121 && avgSystolic <= 140) {
        bpStatus = 'borderline';
        bpMessage = '⚠️ قريب من الحد الأعلى';
    } else if (avgSystolic > 140) {
        bpStatus = 'high';
        bpMessage = '🔴 أعلى من النطاق المقبول';
    } else if (avgSystolic < 90 && avgSystolic > 0) {
        bpStatus = 'low';
        bpMessage = '⚠️ أقل من النطاق المقبول';
    }
    
    // حساب اتجاه الوزن
    let weightTrend = 'neutral';
    if (weightList.length >= 3) {
        const recent = weightList.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = weightList.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 0.5) weightTrend = 'up';
        else if (recent < previous - 0.5) weightTrend = 'down';
    }
    
    // حساب اتجاه السكر
    let glucoseTrend = 'neutral';
    if (glucoseList.length >= 3) {
        const recent = glucoseList.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = glucoseList.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 10) glucoseTrend = 'up';
        else if (recent < previous - 10) glucoseTrend = 'down';
    }
    
    return {
        avgWeight,
        avgSystolic,
        avgDiastolic: bpCount > 0 ? Math.round(totalDiastolic / bpCount) : 0,
        avgGlucose,
        avgHeartRate,
        avgSpO2,
        records: healthData.length,
        hasData: healthData.length > 0,
        bpStatus,
        bpMessage,
        weightTrend,
        glucoseTrend
    };
};

// ✅ تحليل بيانات المزاج
const analyzeMoodData = (moodData) => {
    if (!moodData || moodData.length === 0) { 
        return { 
            avgMood: 0, 
            totalDays: 0, 
            hasData: false, 
            status: 'no_data',
            message: '',
            trend: 'neutral',
            moodDistribution: {}
        }; 
    }
    
    const moodMap = { 
        'Excellent': 5, 
        'Good': 4, 
        'Neutral': 3, 
        'Stressed': 2, 
        'Anxious': 2, 
        'Sad': 1 
    };
    
    let totalMood = 0;
    const uniqueDays = new Set();
    const moodValues = [];
    const moodDistribution = {};
    
    moodData.forEach(mood => {
        const moodValue = moodMap[mood.mood] || 3;
        totalMood += moodValue;
        moodValues.push(moodValue);
        
        moodDistribution[mood.mood] = (moodDistribution[mood.mood] || 0) + 1;
        
        if (mood.entry_time) {
            const date = new Date(mood.entry_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    const avgMood = moodData.length > 0 ? roundNumber(totalMood / moodData.length, 1) : 0;
    
    let status = 'unknown';
    let message = '';
    let trend = 'neutral';
    
    if (avgMood >= 4.5) {
        status = 'excellent';
        message = '✅ ممتاز';
    } else if (avgMood >= 3.5) {
        status = 'good';
        message = '✅ جيد';
    } else if (avgMood >= 2.5) {
        status = 'fair';
        message = '⚠️ متوسط';
    } else if (avgMood >= 1.5) {
        status = 'low';
        message = '⚠️ منخفض';
    } else if (avgMood > 0) {
        status = 'very_low';
        message = '🔴 منخفض جداً';
    }
    
    // حساب الاتجاه
    if (moodValues.length >= 5) {
        const recent = moodValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = moodValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recent > previous + 0.5) trend = 'up';
        else if (recent < previous - 0.5) trend = 'down';
    }
    
    return {
        avgMood,
        totalDays: uniqueDays.size,
        hasData: moodData.length > 0,
        status,
        message,
        trend,
        moodDistribution
    };
};

// ✅ تحليل بيانات العادات
const analyzeHabitsData = (habitLogs, habitDefinitions) => {
    if (!habitLogs || habitLogs.length === 0) { 
        return { 
            completionRate: 0, 
            completed: 0, 
            total: 0, 
            hasData: false,
            status: 'no_data',
            message: '',
            byHabit: {}
        }; 
    }
    
    const completed = habitLogs.filter(h => h.is_completed === true).length;
    const total = habitLogs.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // تحليل كل عادة على حدة
    const byHabit = {};
    habitLogs.forEach(log => {
        const habitId = log.habit?.id || log.habit;
        if (!byHabit[habitId]) {
            byHabit[habitId] = { total: 0, completed: 0, name: log.habit?.name || 'Habit' };
        }
        byHabit[habitId].total++;
        if (log.is_completed) byHabit[habitId].completed++;
    });
    
    Object.keys(byHabit).forEach(habitId => {
        byHabit[habitId].rate = Math.round((byHabit[habitId].completed / byHabit[habitId].total) * 100);
    });
    
    let status = 'unknown';
    let message = '';
    if (completionRate >= 80) {
        status = 'excellent';
        message = '✅ التزام ممتاز';
    } else if (completionRate >= 60) {
        status = 'good';
        message = '✅ التزام جيد';
    } else if (completionRate >= 40) {
        status = 'fair';
        message = '⚠️ التزام متوسط';
    } else if (completionRate > 0) {
        status = 'low';
        message = '⚠️ يمكن تحسين الالتزام';
    }
    
    return {
        completionRate,
        completed,
        total,
        hasData: habitLogs.length > 0,
        status,
        message,
        byHabit
    };
};

// ✅ حساب درجة الصحة
const calculateHealthScore = (sleep, nutrition, activity, healthMetrics, mood, habits) => {
    let score = 0;
    let maxScore = 100;
    let details = [];
    
    // النوم (25 نقطة)
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) {
            score += 25;
            details.push({ category: 'sleep', points: 25, message: 'نوم مثالي', icon: '🌙' });
        } else if (sleep.avgHours >= 6) {
            score += 18;
            details.push({ category: 'sleep', points: 18, message: 'نوم جيد', icon: '🌙' });
        } else if (sleep.avgHours >= 5) {
            score += 10;
            details.push({ category: 'sleep', points: 10, message: 'نوم مقبول', icon: '🌙' });
        } else {
            score += 5;
            details.push({ category: 'sleep', points: 5, message: 'نوم يحتاج تحسين', icon: '🌙' });
        }
    } else {
        score += 12;
        details.push({ category: 'sleep', points: 12, message: 'لم يتم تسجيل بيانات كافية', icon: '🌙' });
    }
    
    // التغذية (25 نقطة)
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) {
            score += 25;
            details.push({ category: 'nutrition', points: 25, message: 'تغذية متوازنة', icon: '🥗' });
        } else if (nutrition.avgCaloriesPerDay >= 1500) {
            score += 18;
            details.push({ category: 'nutrition', points: 18, message: 'تغذية جيدة', icon: '🥗' });
        } else {
            score += 10;
            details.push({ category: 'nutrition', points: 10, message: 'تغذية تحتاج تحسين', icon: '🥗' });
        }
    } else {
        score += 12;
        details.push({ category: 'nutrition', points: 12, message: 'لم يتم تسجيل بيانات كافية', icon: '🥗' });
    }
    
    // النشاط (20 نقطة)
    if (activity.hasData && activity.avgMinutesPerDay > 0) {
        if (activity.avgMinutesPerDay >= 30) {
            score += 20;
            details.push({ category: 'activity', points: 20, message: 'نشاط ممتاز', icon: '🏃' });
        } else if (activity.avgMinutesPerDay >= 20) {
            score += 14;
            details.push({ category: 'activity', points: 14, message: 'نشاط جيد', icon: '🏃' });
        } else if (activity.avgMinutesPerDay >= 10) {
            score += 8;
            details.push({ category: 'activity', points: 8, message: 'نشاط مقبول', icon: '🏃' });
        } else {
            score += 4;
            details.push({ category: 'activity', points: 4, message: 'نشاط قليل', icon: '🏃' });
        }
    } else {
        score += 10;
        details.push({ category: 'activity', points: 10, message: 'لم يتم تسجيل بيانات كافية', icon: '🏃' });
    }
    
    // القياسات الحيوية (15 نقطة)
    if (healthMetrics.hasData) {
        let metricsScore = 0;
        if (healthMetrics.avgWeight >= 50 && healthMetrics.avgWeight <= 100) metricsScore += 5;
        if (healthMetrics.avgSystolic >= 90 && healthMetrics.avgSystolic <= 140) metricsScore += 5;
        if (healthMetrics.avgGlucose >= 70 && healthMetrics.avgGlucose <= 140) metricsScore += 5;
        score += metricsScore;
        details.push({ category: 'healthMetrics', points: metricsScore, message: 'القياسات ضمن النطاق المقبول', icon: '❤️' });
    } else {
        score += 7;
        details.push({ category: 'healthMetrics', points: 7, message: 'لم يتم تسجيل بيانات كافية', icon: '❤️' });
    }
    
    // المزاج (8 نقاط)
    if (mood.hasData && mood.avgMood > 0) {
        if (mood.avgMood >= 4) score += 8;
        else if (mood.avgMood >= 3) score += 5;
        else score += 2;
        details.push({ category: 'mood', points: mood.avgMood >= 4 ? 8 : mood.avgMood >= 3 ? 5 : 2, message: mood.message, icon: '😊' });
    } else {
        score += 4;
        details.push({ category: 'mood', points: 4, message: 'لم يتم تسجيل بيانات كافية', icon: '😊' });
    }
    
    // العادات (7 نقاط)
    if (habits.hasData && habits.completionRate > 0) {
        if (habits.completionRate >= 80) score += 7;
        else if (habits.completionRate >= 60) score += 4;
        else score += 2;
        details.push({ category: 'habits', points: habits.completionRate >= 80 ? 7 : habits.completionRate >= 60 ? 4 : 2, message: habits.message, icon: '✅' });
    } else {
        score += 3;
        details.push({ category: 'habits', points: 3, message: 'لم يتم تسجيل بيانات كافية', icon: '✅' });
    }
    
    const finalScore = Math.min(maxScore, Math.max(0, Math.round(score)));
    
    let grade = '';
    let statusText = '';
    let statusColor = '';
    if (finalScore >= 85) {
        grade = 'A+';
        statusText = 'ممتازة جداً';
        statusColor = '#10b981';
    } else if (finalScore >= 75) {
        grade = 'A';
        statusText = 'ممتازة';
        statusColor = '#34d399';
    } else if (finalScore >= 65) {
        grade = 'B+';
        statusText = 'جيدة جداً';
        statusColor = '#3b82f6';
    } else if (finalScore >= 55) {
        grade = 'B';
        statusText = 'جيدة';
        statusColor = '#60a5fa';
    } else if (finalScore >= 45) {
        grade = 'C+';
        statusText = 'متوسطة';
        statusColor = '#f59e0b';
    } else if (finalScore >= 35) {
        grade = 'C';
        statusText = 'تحتاج تحسيناً';
        statusColor = '#f97316';
    } else {
        grade = 'D';
        statusText = 'تحتاج اهتماماً';
        statusColor = '#ef4444';
    }
    
    return { score: finalScore, maxScore, grade, statusText, statusColor, details };
};

// ✅ توليد القصة الذكية
const generateSmartStory = (sleep, nutrition, activity, healthMetrics, mood, habits, isArabic) => {
    const paragraphs = [];
    
    paragraphs.push(isArabic 
        ? '📊 خلال الفترة التي قمت بتحليلها، نلاحظ الأنماط التالية في بياناتك الصحية:'
        : '📊 During the analyzed period, we observe the following patterns in your health data:');
    
    // النوم
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) {
            paragraphs.push(isArabic 
                ? `🌙 نومك كان في المستوى الموصى به (${sleep.avgHours} ساعات يومياً)، مما يساهم في تحسين طاقتك وتركيزك. ${sleep.consistency > 70 ? 'كما أن انتظام ساعات نومك ممتاز!' : 'حاول المحافظة على انتظام ساعات نومك.'}`
                : `🌙 Your sleep was at the recommended level (${sleep.avgHours} hours per day), which contributes to better energy and focus. ${sleep.consistency > 70 ? 'Your sleep consistency is also excellent!' : 'Try to maintain regular sleep hours.'}`);
        } else if (sleep.avgHours >= 6) {
            paragraphs.push(isArabic 
                ? `🌙 نومك كان ${sleep.avgHours} ساعات في المتوسط - جيد، لكن الحصول على 7-8 ساعات قد يحسن شعورك بالنشاط.`
                : `🌙 Your average sleep was ${sleep.avgHours} hours - good, but getting 7-8 hours might improve your energy levels.`);
        } else {
            paragraphs.push(isArabic 
                ? `🌙 نومك كان ${sleep.avgHours} ساعات - أقل من المستوى الموصى به. تحسين نومك قد ينعكس إيجاباً على صحتك العامة.`
                : `🌙 Your sleep averaged ${sleep.avgHours} hours - below the recommended level. Improving your sleep may positively affect your overall health.`);
        }
    }
    
    // التغذية
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) {
            paragraphs.push(isArabic 
                ? `🥗 نظامك الغذائي كان متوازناً (${nutrition.avgCaloriesPerDay} سعرة يومياً)، مما يدعم احتياجات جسمك.`
                : `🥗 Your diet was balanced (${nutrition.avgCaloriesPerDay} calories per day), which supports your body's needs.`);
        } else if (nutrition.avgCaloriesPerDay < 1500) {
            paragraphs.push(isArabic 
                ? `🥗 تناولت ${nutrition.avgCaloriesPerDay} سعرة في المتوسط - قد يكون أقل من احتياجات جسمك. إضافة وجبات صحية قد يساعد في تحسين طاقتك.`
                : `🥗 You consumed an average of ${nutrition.avgCaloriesPerDay} calories - this may be below your body's needs. Adding healthy meals might help improve your energy.`);
        } else {
            paragraphs.push(isArabic 
                ? `🥗 استهلاكك اليومي من السعرات كان ${nutrition.avgCaloriesPerDay} - ضمن نطاق مقبول، ويمكنك تحسينه بتوزيع أفضل للوجبات.`
                : `🥗 Your daily calorie intake was ${nutrition.avgCaloriesPerDay} - within an acceptable range, and you can improve it with better meal distribution.`);
        }
    }
    
    // الضغط
    if (healthMetrics.hasData && healthMetrics.avgSystolic > 0) {
        if (healthMetrics.bpStatus === 'ideal') {
            paragraphs.push(isArabic 
                ? `❤️ ضغط دمك كان ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} mmHg - ضمن النطاق المقبول، مما يعكس حالة جيدة.`
                : `❤️ Your blood pressure was ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} mmHg - within the acceptable range, reflecting good health.`);
        } else {
            paragraphs.push(isArabic 
                ? `❤️ ضغط دمك سجل ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} mmHg - ${healthMetrics.bpMessage}. متابعة نمط حياة صحي قد تساهم في تحسينه.`
                : `❤️ Your blood pressure was ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} mmHg - ${healthMetrics.bpMessage}. Maintaining a healthy lifestyle may help improve it.`);
        }
    }
    
    // النشاط
    if (activity.hasData && activity.avgMinutesPerDay > 0) {
        if (activity.avgMinutesPerDay >= 30) {
            paragraphs.push(isArabic 
                ? `🏃 نشاطك البدني كان ممتازاً (${activity.avgMinutesPerDay} دقيقة يومياً) - استمر في هذا المستوى للحفاظ على لياقتك.`
                : `🏃 Your physical activity was excellent (${activity.avgMinutesPerDay} minutes daily) - maintain this level to stay fit.`);
        } else {
            paragraphs.push(isArabic 
                ? `🏃 نشاطك البدني كان ${activity.avgMinutesPerDay} دقيقة يومياً - ${activity.message}. زيادة تدريجية قد تساعد في تحسين صحتك.`
                : `🏃 Your physical activity was ${activity.avgMinutesPerDay} minutes daily - ${activity.message}. Gradual increases may help improve your health.`);
        }
    }
    
    // المزاج
    if (mood.hasData && mood.avgMood > 0) {
        if (mood.avgMood >= 4) {
            paragraphs.push(isArabic 
                ? `😊 حالتك المزاجية كانت إيجابية (${mood.avgMood}/5) - استمر في العادات التي تساعدك على الشعور بهذا الاستقرار.`
                : `😊 Your mood was positive (${mood.avgMood}/5) - continue the habits that help you maintain this stability.`);
        } else if (mood.avgMood >= 3) {
            paragraphs.push(isArabic 
                ? `😊 مزاجك كان ${mood.avgMood}/5 - طبيعي، ويمكن تحسينه بأنشطة تساعد على الاسترخاء مثل المشي أو التأمل.`
                : `😊 Your mood was ${mood.avgMood}/5 - normal, and can be improved with relaxing activities like walking or meditation.`);
        } else {
            paragraphs.push(isArabic 
                ? `😊 نلاحظ أن حالتك المزاجية كانت منخفضة نسبياً (${mood.avgMood}/5). الاهتمام بجودة النوم والنشاط قد يساعد في تحسينها.`
                : `😊 We notice your mood was relatively low (${mood.avgMood}/5). Paying attention to sleep quality and activity may help improve it.`);
        }
    }
    
    // العادات
    if (habits.hasData && habits.completionRate > 0) {
        paragraphs.push(isArabic 
            ? `✅ إنجاز العادات اليومية كان بنسبة ${habits.completionRate}% - ${habits.message}.`
            : `✅ Daily habit completion was ${habits.completionRate}% - ${habits.message}.`);
    }
    
    if (paragraphs.length === 1) {
        paragraphs.push(isArabic 
            ? '📝 سجل المزيد من البيانات الصحية للحصول على تحليل أكثر دقة وتوصيات مخصصة.'
            : '📝 Log more health data to get more accurate analysis and personalized recommendations.');
    }
    
    return paragraphs;
};

// ✅ توليد توصية رئيسية
const generateTopRecommendation = (sleep, nutrition, activity, healthMetrics, mood, habits, isArabic) => {
    const hasAnyData = sleep.hasData || nutrition.hasData || activity.hasData || healthMetrics.hasData || mood.hasData || habits.hasData;
    
    if (!hasAnyData) {
        return {
            icon: '📝',
            title: isArabic ? 'ابدأ بتسجيل بياناتك' : 'Start logging your data',
            advice: isArabic 
                ? 'كلما سجلت المزيد من البيانات، حصلت على توصيات أكثر دقة تناسب حالتك'
                : 'The more data you log, the more accurate recommendations you\'ll get',
            action: isArabic 
                ? 'سجل أول قراءة صحية اليوم من لوحة التحكم'
                : 'Log your first health reading today from the dashboard',
            priority: 'high'
        };
    }
    
    // ترتيب الأولويات
    if (sleep.hasData && sleep.avgHours > 0 && sleep.avgHours < 6) {
        return {
            icon: '🌙',
            title: isArabic ? 'تحسين جودة النوم' : 'Improve sleep quality',
            advice: isArabic 
                ? `تنام في المتوسط ${sleep.avgHours} ساعات يومياً - هذا أقل من المستوى الموصى به`
                : `You sleep an average of ${sleep.avgHours} hours per day - below recommended level`,
            action: isArabic 
                ? 'حاول النوم مبكراً بساعة وتجنب الشاشات قبل النوم لتحسين جودة نومك'
                : 'Try going to bed an hour earlier and avoid screens before sleep to improve sleep quality',
            priority: 'high'
        };
    }
    
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0 && nutrition.avgCaloriesPerDay < 1500) {
        return {
            icon: '🥗',
            title: isArabic ? 'توازن السعرات الحرارية' : 'Calorie balance',
            advice: isArabic 
                ? `تتناول ${nutrition.avgCaloriesPerDay} سعرة في المتوسط - قد يكون أقل من احتياجات جسمك`
                : `You consume an average of ${nutrition.avgCaloriesPerDay} calories - may be below your body's needs`,
            action: isArabic 
                ? 'أضف وجبات خفيفة صحية بين الوجبات الرئيسية مثل المكسرات والفواكه'
                : 'Add healthy snacks between main meals like nuts and fruits',
            priority: 'high'
        };
    }
    
    if (activity.hasData && activity.avgMinutesPerDay > 0 && activity.avgMinutesPerDay < 20) {
        return {
            icon: '🏃',
            title: isArabic ? 'زيادة النشاط البدني' : 'Increase physical activity',
            advice: isArabic 
                ? `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة يومياً - يمكن تحسين هذا المعدل`
                : `You exercise ${activity.avgMinutesPerDay} minutes daily - this can be improved`,
            action: isArabic 
                ? 'ابدأ بالمشي لمدة 20 دقيقة يومياً، ثم زد المدة تدريجياً'
                : 'Start with 20 minutes of walking daily, then gradually increase',
            priority: 'medium'
        };
    }
    
    if (healthMetrics.hasData && healthMetrics.bpStatus === 'high') {
        return {
            icon: '❤️',
            title: isArabic ? 'مراقبة ضغط الدم' : 'Monitor blood pressure',
            advice: isArabic 
                ? `متوسط ضغط دمك ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} - أعلى من النطاق المقبول`
                : `Your average blood pressure is ${healthMetrics.avgSystolic}/${healthMetrics.avgDiastolic} - above acceptable range`,
            action: isArabic 
                ? 'قلل الملح في الطعام، مارس الرياضة بانتظام، واستشر طبيبك'
                : 'Reduce salt intake, exercise regularly, and consult your doctor',
            priority: 'high'
        };
    }
    
    if (mood.hasData && mood.avgMood < 3) {
        return {
            icon: '😊',
            title: isArabic ? 'تحسين الحالة المزاجية' : 'Improve your mood',
            advice: isArabic 
                ? `مزاجك كان ${mood.avgMood}/5 - يمكن تحسينه بأنشطة بسيطة`
                : `Your mood was ${mood.avgMood}/5 - can be improved with simple activities`,
            action: isArabic 
                ? 'مارس التأمل، تواصل مع الأصدقاء، ومارس هواية تحبها'
                : 'Practice meditation, connect with friends, and do a hobby you enjoy',
            priority: 'medium'
        };
    }
    
    return {
        icon: '🌟',
        title: isArabic ? 'أحسنتَ! استمر على هذا المنوال' : 'Great job! Keep it up',
        advice: isArabic 
            ? 'جميع مؤشراتك الصحية ضمن نطاق جيد، أنت على الطريق الصحيح'
            : 'All your health indicators are in a good range, you are on the right track',
        action: isArabic 
            ? 'استمر في تسجيل بياناتك للحفاظ على هذا المستوى وتحسينه'
            : 'Continue logging your data to maintain and improve this level',
        priority: 'low'
    };
};

// ✅ توليد التقارير الذكية
const generateSmartReports = (currentData, range, isArabic) => {
    const sleep = analyzeSleepData(currentData.sleep);
    const nutrition = analyzeNutritionData(currentData.meals);
    const activity = analyzeActivityData(currentData.activities);
    const healthMetrics = analyzeHealthMetricsData(currentData.health);
    const mood = analyzeMoodData(currentData.mood);
    const habits = analyzeHabitsData(currentData.habits, currentData.habitDefinitions);
    
    const healthScore = calculateHealthScore(sleep, nutrition, activity, healthMetrics, mood, habits);
    const story = generateSmartStory(sleep, nutrition, activity, healthMetrics, mood, habits, isArabic);
    const topRecommendation = generateTopRecommendation(sleep, nutrition, activity, healthMetrics, mood, habits, isArabic);
    
    return {
        summary: {
            healthScore: {
                score: healthScore.score,
                maxScore: healthScore.maxScore,
                grade: healthScore.grade,
                statusText: healthScore.statusText,
                statusColor: healthScore.statusColor,
                details: healthScore.details
            },
            story,
            topRecommendation,
            period: { 
                start: range.start.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US'),
                end: range.end.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')
            }
        },
        sleep,
        nutrition,
        activity,
        healthMetrics,
        mood,
        habits
    };
};

// ✅ دوال مساعدة لجلب البيانات
const getDateRange = (type, customStart, customEnd) => {
    const end = new Date();
    let start = new Date();
    
    if (type === 'weekly') {
        start.setDate(end.getDate() - 7);
    } else if (type === 'monthly') {
        start.setMonth(end.getMonth() - 1);
    } else if (type === 'quarterly') {
        start.setMonth(end.getMonth() - 3);
    } else if (type === 'yearly') {
        start.setFullYear(end.getFullYear() - 1);
    } else if (type === 'custom') {
        return { start: new Date(customStart), end: new Date(customEnd) };
    }
    
    return { start, end };
};

const extractData = (response) => {
    if (!response) return [];
    if (response.results && Array.isArray(response.results)) return response.results;
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.items && Array.isArray(response.items)) return response.items;
    if (typeof response === 'object' && response !== null && response.id !== undefined) return [response];
    return [];
};

// ===========================================
// المكون الرئيسي
// ===========================================

const Reports = ({ isAuthReady }) => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('weekly');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');
    const [isExporting, setIsExporting] = useState(false);
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const abortControllersRef = useRef([]);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ جلب جميع البيانات
    const fetchAllData = useCallback(async (url, key) => {
        let allData = [];
        let nextUrl = url;
        
        try {
            while (nextUrl) {
                const controller = new AbortController();
                abortControllersRef.current.push(controller);
                
                const response = await axiosInstance.get(nextUrl, { signal: controller.signal });
                const data = response.data;
                
                const items = extractData(data);
                
                if (Array.isArray(items)) {
                    allData = [...allData, ...items];
                }
                
                nextUrl = data.next || null;
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
                console.error(`Error fetching ${key}:`, err);
            }
        }
        
        return allData;
    }, []);

    // ✅ جلب البيانات في نطاق زمني
    const fetchDataInRange = useCallback(async (start, end) => {
        abortControllersRef.current.forEach(controller => controller.abort());
        abortControllersRef.current = [];
        
        const startStr = start.toISOString();
        const endStr = end.toISOString();
        
        try {
            const [
                sleepData,
                mealsData,
                activitiesData,
                healthData,
                moodData,
                habitsData,
                habitDefsData
            ] = await Promise.all([
                fetchAllData(`/sleep/?recorded_at_after=${startStr}&recorded_at_before=${endStr}`, 'sleep'),
                fetchAllData(`/meals/?meal_time_after=${startStr}&meal_time_before=${endStr}`, 'meals'),
                fetchAllData(`/activities/?start_time_after=${startStr}&start_time_before=${endStr}`, 'activities'),
                fetchAllData(`/health_status/?recorded_at_after=${startStr}&recorded_at_before=${endStr}`, 'health'),
                fetchAllData(`/mood-logs/?entry_time_after=${startStr}&entry_time_before=${endStr}`, 'mood'),
                fetchAllData(`/habit-logs/?log_date_after=${startStr}&log_date_before=${endStr}`, 'habits'),
                fetchAllData('/habit-definitions/', 'habitDefinitions')
            ]);
            
            return {
                sleep: sleepData,
                meals: mealsData,
                activities: activitiesData,
                health: healthData,
                mood: moodData,
                habits: habitsData,
                habitDefinitions: habitDefsData
            };
        } catch (err) {
            console.error('Error in fetchDataInRange:', err);
            throw err;
        }
    }, [fetchAllData]);

    // ✅ جلب التقارير
    const fetchReports = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const { start, end } = getDateRange(reportType, dateRange.start, dateRange.end);
            
            const currentData = await fetchDataInRange(start, end);
            
            if (!isMountedRef.current) return;
            
            const reportData = generateSmartReports(currentData, { start, end }, isArabic);
            setReports(reportData);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Error fetching reports:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ حدث خطأ في جلب التقارير' : '❌ Error fetching reports');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [reportType, dateRange, isArabic, fetchDataInRange]);

    useEffect(() => {
        if (isAuthReady) {
            fetchReports();
        }
        
        return () => {
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, [isAuthReady, reportType, dateRange.start, dateRange.end, fetchReports]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, []);

    // ✅ تصدير البيانات
    const exportReport = useCallback((format) => {
        if (!reports) return;
        
        setIsExporting(true);
        
        try {
            const exportData = {
                generatedAt: new Date().toISOString(),
                period: reports.summary.period,
                healthScore: reports.summary.healthScore,
                topRecommendation: reports.summary.topRecommendation,
                story: reports.summary.story,
                sleep: reports.sleep,
                nutrition: reports.nutrition,
                activity: reports.activity,
                healthMetrics: reports.healthMetrics,
                mood: reports.mood,
                habits: reports.habits
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            
            if (format === 'json') {
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                // تبسيط لتصدير CSV
                const csvRows = [
                    ['Metric', 'Value'],
                    ['Health Score', `${reports.summary.healthScore.score}/${reports.summary.healthScore.maxScore}`],
                    ['Grade', reports.summary.healthScore.grade],
                    ['Status', reports.summary.healthScore.statusText],
                    [''],
                    ['Sleep', `${reports.sleep.avgHours} hours`],
                    ['Nutrition', `${reports.nutrition.avgCaloriesPerDay} calories`],
                    ['Activity', `${reports.activity.avgMinutesPerDay} minutes/day`],
                    ['Blood Pressure', `${reports.healthMetrics.avgSystolic}/${reports.healthMetrics.avgDiastolic} mmHg`],
                    ['Mood', `${reports.mood.avgMood}/5`],
                    ['Habits', `${reports.habits.completionRate}%`]
                ];
                
                const csvContent = csvRows.map(row => row.join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `health-report-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                URL.revokeObjectURL(url);
            }
            
            alert(isArabic ? '✅ تم تصدير التقرير بنجاح' : '✅ Report exported successfully');
        } catch (err) {
            console.error('Export error:', err);
            alert(isArabic ? '❌ حدث خطأ في تصدير التقرير' : '❌ Error exporting report');
        } finally {
            setIsExporting(false);
        }
    }, [reports, isArabic]);

    // ✅ حالة التحميل
    if (loading) {
        return (
            <div className="reports-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? '📊 جاري تحليل تقريرك الصحي...' : '📊 Analyzing your health report...'}</p>
                </div>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error) {
        return (
            <div className="reports-error">
                <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <p>{error}</p>
                    <button onClick={fetchReports} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    if (!reports) return null;

    return (
        <div className="reports-container">
            {/* ✅ رأس الصفحة */}
            <div className="reports-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">📊</span>
                        {isArabic ? 'التقارير الصحية' : 'Health Reports'}
                    </h2>
                    <div className="period-badge">
                        📅 {reports.summary.period.start} - {reports.summary.period.end}
                    </div>
                </div>
                
                <div className="header-controls">
                    <select 
                        value={reportType} 
                        onChange={(e) => setReportType(e.target.value)} 
                        className="report-select"
                    >
                        <option value="weekly">📅 {isArabic ? 'أسبوعي' : 'Weekly'}</option>
                        <option value="monthly">📅 {isArabic ? 'شهري' : 'Monthly'}</option>
                        <option value="quarterly">📅 {isArabic ? 'ربع سنوي' : 'Quarterly'}</option>
                        <option value="yearly">📅 {isArabic ? 'سنوي' : 'Yearly'}</option>
                        <option value="custom">📅 {isArabic ? 'مخصص' : 'Custom'}</option>
                    </select>
                    
                    {reportType === 'custom' && (
                        <div className="date-range">
                            <input 
                                type="date" 
                                value={dateRange.start} 
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                                className="date-input"
                            />
                            <span>→</span>
                            <input 
                                type="date" 
                                value={dateRange.end} 
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                                className="date-input"
                            />
                        </div>
                    )}
                    
                    <div className="export-buttons">
                        <button 
                            onClick={() => exportReport('json')} 
                            className="export-btn json"
                            disabled={isExporting}
                        >
                            📄 JSON
                        </button>
                        <button 
                            onClick={() => exportReport('csv')} 
                            className="export-btn csv"
                            disabled={isExporting}
                        >
                            📊 CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ درجة الصحة */}
            <div className="health-score-card" style={{ borderBottomColor: reports.summary.healthScore.statusColor }}>
                <div className="score-main">
                    <div className="score-circle" style={{ borderColor: reports.summary.healthScore.statusColor }}>
                        <span className="score-value">{reports.summary.healthScore.score}</span>
                        <span className="score-max">/{reports.summary.healthScore.maxScore}</span>
                    </div>
                    <div className="score-info">
                        <div className="score-grade" style={{ color: reports.summary.healthScore.statusColor }}>
                            {reports.summary.healthScore.grade}
                        </div>
                        <div className="score-status">{reports.summary.healthScore.statusText}</div>
                    </div>
                </div>
                <div className="score-details">
                    {reports.summary.healthScore.details.map((detail, i) => (
                        <div key={i} className="score-detail">
                            <span className="detail-icon">{detail.icon}</span>
                            <span className="detail-name">{detail.message}</span>
                            <span className="detail-points">{detail.points}/{detail.category === 'sleep' ? 25 : detail.category === 'nutrition' ? 25 : detail.category === 'activity' ? 20 : detail.category === 'healthMetrics' ? 15 : detail.category === 'mood' ? 8 : 7}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ✅ القصة الذكية */}
            {reports.summary.story.length > 0 && (
                <div className="story-section">
                    <div className="section-header">
                        <span className="section-icon">📖</span>
                        <h3>{isArabic ? 'القصة الذكية لصحتك' : 'Your Health Story'}</h3>
                    </div>
                    <div className="story-content">
                        {reports.summary.story.map((paragraph, i) => (
                            <p key={i} className="story-paragraph">{paragraph}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ التوصية المقترحة */}
            <div className={`recommendation-card priority-${reports.summary.topRecommendation.priority}`}>
                <div className="recommendation-header">
                    <span className="rec-icon">{reports.summary.topRecommendation.icon}</span>
                    <div>
                        <div className="rec-title">{reports.summary.topRecommendation.title}</div>
                        <div className="rec-advice">{reports.summary.topRecommendation.advice}</div>
                    </div>
                </div>
                <div className="rec-action">
                    💡 {reports.summary.topRecommendation.action}
                </div>
            </div>

            {/* ✅ التبويبات */}
            <div className="reports-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    📊 {isArabic ? 'الملخص' : 'Summary'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'sleep' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sleep')}
                >
                    🌙 {isArabic ? 'النوم' : 'Sleep'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
                    onClick={() => setActiveTab('nutrition')}
                >
                    🥗 {isArabic ? 'التغذية' : 'Nutrition'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    🏃 {isArabic ? 'النشاط' : 'Activity'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('metrics')}
                >
                    ❤️ {isArabic ? 'القياسات' : 'Metrics'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'mood' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mood')}
                >
                    😊 {isArabic ? 'المزاج' : 'Mood'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('habits')}
                >
                    ✅ {isArabic ? 'العادات' : 'Habits'}
                </button>
            </div>

            {/* ✅ محتوى التبويبات */}
            <div className="tab-content">
                {/* ملخص */}
                {activeTab === 'summary' && (
                    <div className="summary-tab">
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-icon">🌙</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'النوم' : 'Sleep'}</div>
                                    <div className="stat-value">
                                        {reports.sleep.hasData ? reports.sleep.avgHours : 0}
                                        <span className="stat-unit">{isArabic ? 'ساعات' : 'hrs'}</span>
                                    </div>
                                    {reports.sleep.hasData && (
                                        <div className={`stat-status ${reports.sleep.status}`}>
                                            {reports.sleep.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-icon">🥗</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'السعرات' : 'Calories'}</div>
                                    <div className="stat-value">
                                        {reports.nutrition.hasData ? reports.nutrition.avgCaloriesPerDay : 0}
                                        <span className="stat-unit">{isArabic ? 'سعرة/يوم' : 'cal/day'}</span>
                                    </div>
                                    {reports.nutrition.hasData && (
                                        <div className={`stat-status ${reports.nutrition.status}`}>
                                            {reports.nutrition.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-icon">🏃</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'النشاط' : 'Activity'}</div>
                                    <div className="stat-value">
                                        {reports.activity.hasData ? reports.activity.avgMinutesPerDay : 0}
                                        <span className="stat-unit">{isArabic ? 'دقيقة/يوم' : 'min/day'}</span>
                                    </div>
                                    {reports.activity.hasData && (
                                        <div className={`stat-status ${reports.activity.status}`}>
                                            {reports.activity.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-icon">❤️</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'ضغط الدم' : 'BP'}</div>
                                    <div className="stat-value">
                                        {reports.healthMetrics.hasData 
                                            ? `${reports.healthMetrics.avgSystolic}/${reports.healthMetrics.avgDiastolic}`
                                            : '—'}
                                    </div>
                                    {reports.healthMetrics.hasData && (
                                        <div className={`stat-status ${reports.healthMetrics.bpStatus}`}>
                                            {reports.healthMetrics.bpMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-icon">😊</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'المزاج' : 'Mood'}</div>
                                    <div className="stat-value">
                                        {reports.mood.hasData ? reports.mood.avgMood : 0}/5
                                    </div>
                                    {reports.mood.hasData && (
                                        <div className={`stat-status ${reports.mood.status}`}>
                                            {reports.mood.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="stat-item">
                                <div className="stat-icon">✅</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'العادات' : 'Habits'}</div>
                                    <div className="stat-value">
                                        {reports.habits.hasData ? reports.habits.completionRate : 0}%
                                    </div>
                                    {reports.habits.hasData && (
                                        <div className={`stat-status ${reports.habits.status}`}>
                                            {reports.habits.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* النوم */}
                {activeTab === 'sleep' && (
                    <div className="sleep-tab">
                        {reports.sleep.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">🌙</span>
                                    <h3>{isArabic ? 'تحليل النوم' : 'Sleep Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط اليومي' : 'Daily average'}</span>
                                        <span className="stat-value">{reports.sleep.avgHours} {isArabic ? 'ساعات' : 'hours'}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الليالي المسجلة' : 'Nights recorded'}</span>
                                        <span className="stat-value">{reports.sleep.totalNights}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الاتساق' : 'Consistency'}</span>
                                        <span className="stat-value">{reports.sleep.consistency}%</span>
                                    </div>
                                    {reports.sleep.trend !== 'neutral' && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'الاتجاه' : 'Trend'}</span>
                                            <span className={`stat-value trend-${reports.sleep.trend}`}>
                                                {reports.sleep.trend === 'up' ? '📈' : '📉'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="detail-message">{reports.sleep.message}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'النوم 7-8 ساعات يومياً يساعد على تحسين التركيز والذاكرة وتقوية المناعة'
                                        : 'Sleeping 7-8 hours daily helps improve focus, memory, and immunity'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">🌙</div>
                                <p>{isArabic ? 'لا توجد بيانات نوم مسجلة' : 'No sleep data recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل بيانات نومك للحصول على تحليل دقيق' : 'Log your sleep data for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* التغذية */}
                {activeTab === 'nutrition' && (
                    <div className="nutrition-tab">
                        {reports.nutrition.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">🥗</span>
                                    <h3>{isArabic ? 'تحليل التغذية' : 'Nutrition Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'السعرات اليومية' : 'Daily calories'}</span>
                                        <span className="stat-value">{reports.nutrition.avgCaloriesPerDay}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'البروتين' : 'Protein'}</span>
                                        <span className="stat-value">{reports.nutrition.avgProtein}g</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الكربوهيدرات' : 'Carbs'}</span>
                                        <span className="stat-value">{reports.nutrition.avgCarbs}g</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الدهون' : 'Fat'}</span>
                                        <span className="stat-value">{reports.nutrition.avgFat}g</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الوجبات المسجلة' : 'Meals recorded'}</span>
                                        <span className="stat-value">{reports.nutrition.totalMeals}</span>
                                    </div>
                                    {reports.nutrition.trend !== 'neutral' && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'الاتجاه' : 'Trend'}</span>
                                            <span className={`stat-value trend-${reports.nutrition.trend}`}>
                                                {reports.nutrition.trend === 'up' ? '📈' : '📉'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="detail-message">{reports.nutrition.message}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'تناول 1800-2200 سعرة يومياً يساعد في الحفاظ على وزن صحي'
                                        : 'Consuming 1800-2200 calories daily helps maintain a healthy weight'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">🥗</div>
                                <p>{isArabic ? 'لا توجد بيانات تغذية مسجلة' : 'No nutrition data recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل وجباتك للحصول على تحليل دقيق' : 'Log your meals for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* النشاط */}
                {activeTab === 'activity' && (
                    <div className="activity-tab">
                        {reports.activity.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">🏃</span>
                                    <h3>{isArabic ? 'تحليل النشاط' : 'Activity Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'المتوسط اليومي' : 'Daily average'}</span>
                                        <span className="stat-value">{reports.activity.avgMinutesPerDay} {isArabic ? 'دقيقة' : 'min'}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الإجمالي' : 'Total'}</span>
                                        <span className="stat-value">{reports.activity.totalMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الأنشطة المسجلة' : 'Activities'}</span>
                                        <span className="stat-value">{reports.activity.records}</span>
                                    </div>
                                    {reports.activity.trend !== 'neutral' && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'الاتجاه' : 'Trend'}</span>
                                            <span className={`stat-value trend-${reports.activity.trend}`}>
                                                {reports.activity.trend === 'up' ? '📈' : '📉'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {Object.keys(reports.activity.activityTypes).length > 0 && (
                                    <div className="activity-types">
                                        <div className="subtitle">{isArabic ? 'توزيع الأنشطة' : 'Activity Distribution'}</div>
                                        <div className="types-list">
                                            {Object.entries(reports.activity.activityTypes).slice(0, 3).map(([type, minutes]) => (
                                                <div key={type} className="type-item">
                                                    <span className="type-name">{type}</span>
                                                    <span className="type-minutes">{minutes} {isArabic ? 'دقيقة' : 'min'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="detail-message">{reports.activity.message}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'ممارسة 30 دقيقة من النشاط المعتدل يومياً تحسن اللياقة والصحة العامة'
                                        : '30 minutes of moderate activity daily improves fitness and overall health'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">🏃</div>
                                <p>{isArabic ? 'لا توجد بيانات نشاط مسجلة' : 'No activity data recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل أنشطتك الرياضية للحصول على تحليل دقيق' : 'Log your physical activities for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* القياسات */}
                {activeTab === 'metrics' && (
                    <div className="metrics-tab">
                        {reports.healthMetrics.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">❤️</span>
                                    <h3>{isArabic ? 'تحليل القياسات الحيوية' : 'Health Metrics Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    {reports.healthMetrics.avgWeight > 0 && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</span>
                                            <span className="stat-value">{reports.healthMetrics.avgWeight} kg</span>
                                            {reports.healthMetrics.weightTrend !== 'neutral' && (
                                                <span className={`trend-${reports.healthMetrics.weightTrend}`}>
                                                    {reports.healthMetrics.weightTrend === 'up' ? '📈' : '📉'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</span>
                                        <span className="stat-value">{reports.healthMetrics.avgSystolic}/{reports.healthMetrics.avgDiastolic} mmHg</span>
                                    </div>
                                    {reports.healthMetrics.avgGlucose > 0 && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'السكر' : 'Glucose'}</span>
                                            <span className="stat-value">{reports.healthMetrics.avgGlucose} mg/dL</span>
                                            {reports.healthMetrics.glucoseTrend !== 'neutral' && (
                                                <span className={`trend-${reports.healthMetrics.glucoseTrend}`}>
                                                    {reports.healthMetrics.glucoseTrend === 'up' ? '📈' : '📉'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {reports.healthMetrics.avgHeartRate > 0 && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'معدل النبض' : 'Heart Rate'}</span>
                                            <span className="stat-value">{reports.healthMetrics.avgHeartRate} BPM</span>
                                        </div>
                                    )}
                                    {reports.healthMetrics.avgSpO2 > 0 && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'نسبة الأكسجين' : 'Oxygen'}</span>
                                            <span className="stat-value">{reports.healthMetrics.avgSpO2}%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="detail-message">{reports.healthMetrics.bpMessage}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'الحفاظ على ضغط دم طبيعي (120/80) وسكر طبيعي (70-140) يعزز صحتك'
                                        : 'Maintaining normal blood pressure (120/80) and glucose (70-140) promotes your health'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">❤️</div>
                                <p>{isArabic ? 'لا توجد بيانات قياسات حيوية مسجلة' : 'No health metrics recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل قياساتك الصحية للحصول على تحليل دقيق' : 'Log your health measurements for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* المزاج */}
                {activeTab === 'mood' && (
                    <div className="mood-tab">
                        {reports.mood.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">😊</span>
                                    <h3>{isArabic ? 'تحليل المزاج' : 'Mood Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'متوسط المزاج' : 'Average mood'}</span>
                                        <span className="stat-value">{reports.mood.avgMood}/5</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'الأيام المسجلة' : 'Days recorded'}</span>
                                        <span className="stat-value">{reports.mood.totalDays}</span>
                                    </div>
                                    {reports.mood.trend !== 'neutral' && (
                                        <div className="detail-stat">
                                            <span className="stat-label">{isArabic ? 'الاتجاه' : 'Trend'}</span>
                                            <span className={`stat-value trend-${reports.mood.trend}`}>
                                                {reports.mood.trend === 'up' ? '📈' : '📉'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {Object.keys(reports.mood.moodDistribution).length > 0 && (
                                    <div className="mood-distribution">
                                        <div className="subtitle">{isArabic ? 'توزيع المزاج' : 'Mood Distribution'}</div>
                                        <div className="moods-list">
                                            {Object.entries(reports.mood.moodDistribution).map(([mood, count]) => (
                                                <div key={mood} className="mood-item">
                                                    <span className="mood-name">{mood}</span>
                                                    <span className="mood-count">{count} {isArabic ? 'مرة' : 'times'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="detail-message">{reports.mood.message}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'الاهتمام بالنوم وممارسة الرياضة والتواصل الاجتماعي يحسن المزاج'
                                        : 'Sleep, exercise, and social connection improve mood'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">😊</div>
                                <p>{isArabic ? 'لا توجد بيانات مزاج مسجلة' : 'No mood data recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل حالتك المزاجية للحصول على تحليل دقيق' : 'Log your mood for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* العادات */}
                {activeTab === 'habits' && (
                    <div className="habits-tab">
                        {reports.habits.hasData ? (
                            <div className="detail-card">
                                <div className="detail-header">
                                    <span className="detail-icon">✅</span>
                                    <h3>{isArabic ? 'تحليل العادات' : 'Habits Analysis'}</h3>
                                </div>
                                <div className="detail-stats">
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'معدل الإنجاز' : 'Completion rate'}</span>
                                        <span className="stat-value">{reports.habits.completionRate}%</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'مكتملة' : 'Completed'}</span>
                                        <span className="stat-value">{reports.habits.completed}</span>
                                    </div>
                                    <div className="detail-stat">
                                        <span className="stat-label">{isArabic ? 'إجمالي' : 'Total'}</span>
                                        <span className="stat-value">{reports.habits.total}</span>
                                    </div>
                                </div>
                                {Object.keys(reports.habits.byHabit).length > 0 && (
                                    <div className="habits-breakdown">
                                        <div className="subtitle">{isArabic ? 'تفاصيل العادات' : 'Habits Breakdown'}</div>
                                        <div className="habits-list">
                                            {Object.values(reports.habits.byHabit).slice(0, 5).map((habit, i) => (
                                                <div key={i} className="habit-item">
                                                    <span className="habit-name">{habit.name}</span>
                                                    <div className="habit-progress">
                                                        <div className="progress-bar">
                                                            <div className="progress-fill" style={{ width: `${habit.rate}%` }}></div>
                                                        </div>
                                                        <span className="habit-rate">{habit.rate}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="detail-message">{reports.habits.message}</div>
                                <div className="detail-tip">
                                    💡 {isArabic 
                                        ? 'تطوير عادات يومية صغيرة يؤدي إلى تحسين كبير في صحتك على المدى الطويل'
                                        : 'Developing small daily habits leads to significant long-term health improvements'}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-data">
                                <div className="empty-icon">✅</div>
                                <p>{isArabic ? 'لا توجد بيانات عادات مسجلة' : 'No habit data recorded'}</p>
                                <p className="empty-hint">{isArabic ? 'سجل عاداتك اليومية للحصول على تحليل دقيق' : 'Log your daily habits for accurate analysis'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Reports;