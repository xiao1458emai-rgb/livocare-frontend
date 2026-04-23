'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

// ===========================================
// دوال التحليل - نسخة معدلة بالكامل
// ===========================================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const analyzeSleepData = (sleepData) => {
    if (!sleepData || sleepData.length === 0) { 
        return { avgHours: 0, totalNights: 0, hasData: false, status: 'no_data' }; 
    }
    
    let totalHours = 0;
    let validCount = 0;
    
    sleepData.forEach(sleep => {
        const start = sleep.sleep_start || sleep.start_time || sleep.start;
        const end = sleep.sleep_end || sleep.end_time || sleep.end;
        
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const duration = (endDate - startDate) / (1000 * 60 * 60);
            
            if (duration > 0 && duration <= 24) {
                totalHours += duration;
                validCount++;
            }
        }
    });
    
    const avgHours = validCount > 0 ? roundNumber(totalHours / validCount, 1) : 0;
    
    // ✅ تحديد الحالة (بدون أحكام قاسية)
    let status = 'unknown';
    let message = '';
    if (avgHours >= 7 && avgHours <= 8) {
        status = 'ideal';
        message = 'في النطاق الموصى به';
    } else if (avgHours >= 6) {
        status = 'acceptable';
        message = 'أقل بقليل من الموصى به';
    } else if (avgHours >= 5) {
        status = 'low';
        message = 'أقل من المستوى الموصى به';
    } else if (avgHours > 0) {
        status = 'very_low';
        message = 'منخفض جداً';
    }
    
    return {
        avgHours,
        totalNights: validCount,
        hasData: validCount > 0,
        status,
        message
    };
};

const analyzeNutritionData = (mealsData) => {
    if (!mealsData || mealsData.length === 0) { 
        return { 
            avgCaloriesPerDay: 0, 
            avgProtein: 0, 
            avgCarbs: 0, 
            avgFat: 0,
            totalMeals: 0, 
            hasData: false,
            status: 'no_data'
        }; 
    }
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const uniqueDays = new Set();
    
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
            uniqueDays.add(date);
        }
    });
    
    const daysCount = uniqueDays.size || mealsData.length;
    const mealCount = mealsData.length;
    const avgCaloriesPerDay = daysCount > 0 ? Math.round(totalCalories / daysCount) : 0;
    
    // ✅ تحديد الحالة
    let status = 'unknown';
    let message = '';
    if (avgCaloriesPerDay >= 1800 && avgCaloriesPerDay <= 2200) {
        status = 'ideal';
        message = 'متوازن';
    } else if (avgCaloriesPerDay >= 1500) {
        status = 'acceptable';
        message = 'أقل من المستوى المتوسط';
    } else if (avgCaloriesPerDay > 2200 && avgCaloriesPerDay <= 2500) {
        status = 'acceptable';
        message = 'أعلى من المستوى المتوسط';
    } else if (avgCaloriesPerDay > 0) {
        status = 'needs_attention';
        message = 'يحتاج تحسيناً';
    }
    
    return {
        avgCaloriesPerDay,
        avgProtein: mealCount > 0 ? roundNumber(totalProtein / mealCount, 1) : 0,
        avgCarbs: mealCount > 0 ? roundNumber(totalCarbs / mealCount, 1) : 0,
        avgFat: mealCount > 0 ? roundNumber(totalFat / mealCount, 1) : 0,
        totalMeals: mealCount,
        hasData: mealCount > 0,
        status,
        message
    };
};

const analyzeActivityData = (activityData) => {
    if (!activityData || activityData.length === 0) { 
        return { totalMinutes: 0, avgMinutesPerDay: 0, records: 0, hasData: false, status: 'no_data' }; 
    }
    
    let totalMinutes = 0;
    const uniqueDays = new Set();
    
    activityData.forEach(activity => {
        const duration = activity.duration_minutes || 0;
        totalMinutes += duration;
        
        if (activity.start_time) {
            const date = new Date(activity.start_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    const daysCount = uniqueDays.size || activityData.length;
    const avgMinutesPerDay = daysCount > 0 ? Math.round(totalMinutes / daysCount) : 0;
    
    // ✅ تحديد الحالة
    let status = 'unknown';
    let message = '';
    if (avgMinutesPerDay >= 30) {
        status = 'ideal';
        message = 'ممتاز';
    } else if (avgMinutesPerDay >= 20) {
        status = 'acceptable';
        message = 'جيد';
    } else if (avgMinutesPerDay >= 10) {
        status = 'low';
        message = 'أقل من الموصى به';
    } else if (avgMinutesPerDay > 0) {
        status = 'very_low';
        message = 'قليل جداً';
    }
    
    return {
        totalMinutes,
        avgMinutesPerDay,
        records: activityData.length,
        hasData: activityData.length > 0,
        status,
        message
    };
};

const analyzeHealthMetricsData = (healthData) => {
    if (!healthData || healthData.length === 0) { 
        return { 
            avgWeight: 0, 
            avgSystolic: 0, 
            avgDiastolic: 0, 
            avgGlucose: 0,
            records: 0,
            hasData: false 
        }; 
    }
    
    let totalWeight = 0;
    let totalSystolic = 0;
    let totalDiastolic = 0;
    let totalGlucose = 0;
    let weightCount = 0;
    let bpCount = 0;
    let glucoseCount = 0;
    
    healthData.forEach(record => {
        if (record.weight_kg && record.weight_kg > 0) {
            totalWeight += parseFloat(record.weight_kg);
            weightCount++;
        }
        if (record.systolic_pressure && record.systolic_pressure > 0) {
            totalSystolic += record.systolic_pressure;
            totalDiastolic += record.diastolic_pressure || 0;
            bpCount++;
        }
        if (record.glucose_mgdl && record.glucose_mgdl > 0) {
            totalGlucose += record.glucose_mgdl;
            glucoseCount++;
        }
    });
    
    const avgSystolic = bpCount > 0 ? Math.round(totalSystolic / bpCount) : 0;
    
    // ✅ تحديد حالة ضغط الدم (دون حكم قطعي)
    let bpStatus = 'unknown';
    let bpMessage = '';
    if (avgSystolic >= 90 && avgSystolic <= 120) {
        bpStatus = 'ideal';
        bpMessage = 'ضمن النطاق المقبول';
    } else if (avgSystolic >= 121 && avgSystolic <= 140) {
        bpStatus = 'borderline';
        bpMessage = 'قريب من الحد الأعلى';
    } else if (avgSystolic > 140) {
        bpStatus = 'high';
        bpMessage = 'أعلى من النطاق المقبول';
    } else if (avgSystolic < 90 && avgSystolic > 0) {
        bpStatus = 'low';
        bpMessage = 'أقل من النطاق المقبول';
    }
    
    return {
        avgWeight: weightCount > 0 ? roundNumber(totalWeight / weightCount, 1) : 0,
        avgSystolic,
        avgDiastolic: bpCount > 0 ? Math.round(totalDiastolic / bpCount) : 0,
        avgGlucose: glucoseCount > 0 ? Math.round(totalGlucose / glucoseCount) : 0,
        records: healthData.length,
        hasData: healthData.length > 0,
        bpStatus,
        bpMessage
    };
};

const analyzeMoodData = (moodData) => {
    if (!moodData || moodData.length === 0) { 
        return { avgMood: 0, totalDays: 0, hasData: false, status: 'no_data' }; 
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
    
    moodData.forEach(mood => {
        const moodValue = moodMap[mood.mood] || 3;
        totalMood += moodValue;
        
        if (mood.entry_time) {
            const date = new Date(mood.entry_time).toDateString();
            uniqueDays.add(date);
        }
    });
    
    const avgMood = moodData.length > 0 ? roundNumber(totalMood / moodData.length, 1) : 0;
    
    // ✅ تحديد الحالة
    let status = 'unknown';
    let message = '';
    if (avgMood >= 4) {
        status = 'excellent';
        message = 'إيجابي';
    } else if (avgMood >= 3) {
        status = 'good';
        message = 'جيد';
    } else if (avgMood >= 2) {
        status = 'fair';
        message = 'متوسط';
    } else if (avgMood > 0) {
        status = 'low';
        message = 'منخفض';
    }
    
    return {
        avgMood,
        totalDays: uniqueDays.size,
        hasData: moodData.length > 0,
        status,
        message
    };
};

const analyzeHabitsData = (habitLogs, habitDefinitions) => {
    if (!habitLogs || habitLogs.length === 0) { 
        return { completionRate: 0, completed: 0, total: 0, hasData: false }; 
    }
    
    const completed = habitLogs.filter(h => h.is_completed === true).length;
    const total = habitLogs.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // ✅ تحديد الحالة
    let status = 'unknown';
    let message = '';
    if (completionRate >= 80) {
        status = 'excellent';
        message = 'التزام ممتاز';
    } else if (completionRate >= 60) {
        status = 'good';
        message = 'التزام جيد';
    } else if (completionRate >= 40) {
        status = 'fair';
        message = 'التزام متوسط';
    } else if (completionRate > 0) {
        status = 'low';
        message = 'يمكن تحسين الالتزام';
    }
    
    return {
        completionRate,
        completed,
        total,
        hasData: habitLogs.length > 0,
        status,
        message
    };
};

const calculateHealthScore = (sleep, nutrition, activity, healthMetrics, mood, habits) => {
    let score = 0;
    let maxScore = 100;
    let details = [];
    
    // النوم (25 نقطة)
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) {
            score += 25;
            details.push({ category: 'sleep', points: 25, message: 'نوم مثالي' });
        } else if (sleep.avgHours >= 6) {
            score += 18;
            details.push({ category: 'sleep', points: 18, message: 'نوم جيد' });
        } else if (sleep.avgHours >= 5) {
            score += 10;
            details.push({ category: 'sleep', points: 10, message: 'نوم مقبول' });
        } else {
            score += 5;
            details.push({ category: 'sleep', points: 5, message: 'نوم يحتاج تحسين' });
        }
    } else {
        score += 12;
        details.push({ category: 'sleep', points: 12, message: 'لم يتم تسجيل بيانات كافية' });
    }
    
    // التغذية (25 نقطة)
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0) {
        if (nutrition.avgCaloriesPerDay >= 1800 && nutrition.avgCaloriesPerDay <= 2200) {
            score += 25;
            details.push({ category: 'nutrition', points: 25, message: 'تغذية متوازنة' });
        } else if (nutrition.avgCaloriesPerDay >= 1500) {
            score += 18;
            details.push({ category: 'nutrition', points: 18, message: 'تغذية جيدة' });
        } else {
            score += 10;
            details.push({ category: 'nutrition', points: 10, message: 'تغذية تحتاج تحسين' });
        }
    } else {
        score += 12;
        details.push({ category: 'nutrition', points: 12, message: 'لم يتم تسجيل بيانات كافية' });
    }
    
    // النشاط (20 نقطة)
    if (activity.hasData && activity.avgMinutesPerDay > 0) {
        if (activity.avgMinutesPerDay >= 30) {
            score += 20;
            details.push({ category: 'activity', points: 20, message: 'نشاط ممتاز' });
        } else if (activity.avgMinutesPerDay >= 20) {
            score += 14;
            details.push({ category: 'activity', points: 14, message: 'نشاط جيد' });
        } else if (activity.avgMinutesPerDay >= 10) {
            score += 8;
            details.push({ category: 'activity', points: 8, message: 'نشاط مقبول' });
        } else {
            score += 4;
            details.push({ category: 'activity', points: 4, message: 'نشاط قليل' });
        }
    } else {
        score += 10;
        details.push({ category: 'activity', points: 10, message: 'لم يتم تسجيل بيانات كافية' });
    }
    
    // القياسات الحيوية (15 نقطة)
    if (healthMetrics.hasData) {
        let metricsScore = 0;
        if (healthMetrics.avgWeight >= 50 && healthMetrics.avgWeight <= 100) metricsScore += 5;
        if (healthMetrics.avgSystolic >= 90 && healthMetrics.avgSystolic <= 140) metricsScore += 5;
        if (healthMetrics.avgGlucose >= 70 && healthMetrics.avgGlucose <= 140) metricsScore += 5;
        score += metricsScore;
        details.push({ category: 'healthMetrics', points: metricsScore, message: 'القياسات ضمن النطاق المقبول' });
    } else {
        score += 7;
        details.push({ category: 'healthMetrics', points: 7, message: 'لم يتم تسجيل بيانات كافية' });
    }
    
    // المزاج والعادات (15 نقطة)
    if (mood.hasData && mood.avgMood > 0) {
        if (mood.avgMood >= 4) score += 8;
        else if (mood.avgMood >= 3) score += 5;
        else score += 2;
    } else {
        score += 4;
    }
    
    if (habits.hasData && habits.completionRate > 0) {
        if (habits.completionRate >= 80) score += 7;
        else if (habits.completionRate >= 60) score += 4;
        else score += 2;
    } else {
        score += 3;
    }
    
    const finalScore = Math.min(maxScore, Math.max(0, Math.round(score)));
    
    // ✅ تقييم درجة الصحة (بدون أحكام قاسية)
    let grade = '';
    let statusText = '';
    if (finalScore >= 80) {
        grade = 'A';
        statusText = 'ممتازة';
    } else if (finalScore >= 65) {
        grade = 'B';
        statusText = 'جيدة';
    } else if (finalScore >= 50) {
        grade = 'C';
        statusText = 'متوسطة';
    } else {
        grade = 'D';
        statusText = 'في مستوى يحتاج تحسيناً';
    }
    
    return { score: finalScore, maxScore, grade, statusText, details };
};

// ✅ توليد القصة الذكية (أسلوب لطيف وإرشادي)
const generateSmartStory = (sleep, nutrition, activity, healthMetrics, mood, habits, isArabic) => {
    const paragraphs = [];
    
    // مقدمة
    paragraphs.push(isArabic 
        ? 'خلال الفترة التي قمت بتحليلها، نلاحظ الأنماط التالية في بياناتك الصحية:'
        : 'During the analyzed period, we observe the following patterns in your health data:');
    
    // قصة النوم
    if (sleep.hasData && sleep.avgHours > 0) {
        if (sleep.avgHours >= 7 && sleep.avgHours <= 8) {
            paragraphs.push(isArabic 
                ? `🌙 نومك كان في المستوى الموصى به (${sleep.avgHours} ساعات يومياً)، مما يساهم في تحسين طاقتك وتركيزك.`
                : `🌙 Your sleep was at the recommended level (${sleep.avgHours} hours per day), which may contribute to better energy and focus.`);
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
    
    // قصة التغذية
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
    
    // قصة النشاط والضغط
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
    
    // قصة النشاط البدني
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
    
    // قصة المزاج
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
    
    if (paragraphs.length === 1) {
        paragraphs.push(isArabic 
            ? 'سجل المزيد من البيانات الصحية للحصول على تحليل أكثر دقة وتوصيات مخصصة.'
            : 'Log more health data to get more accurate analysis and personalized recommendations.');
    }
    
    return paragraphs;
};

// ✅ توليد توصية رئيسية (أسلوب لطيف)
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
                : 'Log your first health reading today from the dashboard'
        };
    }
    
    // الأولوية للنوم
    if (sleep.hasData && sleep.avgHours > 0 && sleep.avgHours < 6) {
        return {
            icon: '🌙',
            title: isArabic ? 'تحسين جودة النوم' : 'Improve sleep quality',
            advice: isArabic 
                ? `تنام في المتوسط ${sleep.avgHours} ساعات يومياً`
                : `You sleep an average of ${sleep.avgHours} hours per day`,
            action: isArabic 
                ? 'محاولة النوم مبكراً بساعة قد يساعد في تحسين طاقتك وتركيزك'
                : 'Try going to bed an hour earlier to improve your energy and focus'
        };
    }
    
    // ثم التغذية
    if (nutrition.hasData && nutrition.avgCaloriesPerDay > 0 && nutrition.avgCaloriesPerDay < 1500) {
        return {
            icon: '🥗',
            title: isArabic ? 'توازن السعرات الحرارية' : 'Calorie balance',
            advice: isArabic 
                ? `تتناول ${nutrition.avgCaloriesPerDay} سعرة في المتوسط`
                : `You consume an average of ${nutrition.avgCaloriesPerDay} calories`,
            action: isArabic 
                ? 'إضافة وجبات خفيفة صحية قد يساعد في تلبية احتياجات جسمك'
                : 'Adding healthy snacks may help meet your body\'s needs'
        };
    }
    
// ثم النشاط
if (activity.hasData && activity.avgMinutesPerDay > 0 && activity.avgMinutesPerDay < 20) {
    return {
        icon: '🏃',
        title: isArabic ? 'زيادة النشاط البدني' : 'Increase physical activity',
        advice: isArabic 
            ? `تمارس الرياضة ${activity.avgMinutesPerDay} دقيقة يومياً`
            : `You exercise ${activity.avgMinutesPerDay} minutes per day`,
        action: isArabic 
            ? 'المشي لمدة 20 دقيقة يومياً قد يحسن لياقتك وصحتك العامة'
            : 'Walking 20 minutes daily may improve your fitness and overall health'
    };
}

return {
    icon: '🌟',
    title: isArabic ? 'أحسنتَ! استمر على هذا المنوال' : 'Great job! Keep it up',
    advice: isArabic 
        ? 'جميع مؤشراتك الصحية ضمن نطاق جيد'
        : 'All your health indicators are in a good range',
    action: isArabic 
        ? 'استمر في تسجيل بياناتك للحفاظ على هذا المستوى'
        : 'Continue logging your data to maintain this level'
};}

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
                details: healthScore.details
            },
            story,
            topRecommendation,
            period: { start: range.start, end: range.end }
        },
        sleep,
        nutrition,
        activity,
        healthMetrics,
        mood,
        habits
    };
};

const getDateRange = (type, customStart, customEnd) => {
    const end = new Date();
    let start = new Date();
    
    if (type === 'weekly') {
        start.setDate(end.getDate() - 7);
    } else if (type === 'monthly') {
        start.setMonth(end.getMonth() - 1);
    } else if (type === 'quarterly') {
        start.setMonth(end.getMonth() - 3);
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

const Reports = ({ isAuthReady }) => {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('weekly');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');

    const isArabic = i18n.language.startsWith('ar');
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const abortControllersRef = useRef([]);

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
                fetchAllData(`/sleep/?start=${startStr}&end=${endStr}`, 'sleep'),
                fetchAllData(`/meals/?start=${startStr}&end=${endStr}`, 'meals'),
                fetchAllData(`/activities/?start=${startStr}&end=${endStr}`, 'activities'),
                fetchAllData(`/health_status/?start=${startStr}&end=${endStr}`, 'health'),
                fetchAllData(`/mood-logs/?start=${startStr}&end=${endStr}`, 'mood'),
                fetchAllData(`/habit-logs/?start=${startStr}&end=${endStr}`, 'habits'),
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
                setError(isArabic ? 'حدث خطأ في جلب التقارير' : 'Error fetching reports');
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

    const exportToPDF = () => alert(isArabic ? 'سيتم إضافة ميزة تصدير PDF قريباً' : 'PDF export feature coming soon');
    const exportToCSV = () => alert(isArabic ? 'سيتم إضافة ميزة تصدير CSV قريباً' : 'CSV export feature coming soon');

    // عرض حالة التحميل
    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل تقريرك الصحي...' : 'Analyzing your health report...'}</p>
                </div>
            </div>
        );
    }

    // عرض حالة الخطأ
    if (error) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <p>⚠️ {error}</p>
                    <button onClick={fetchReports} className="type-btn active">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    if (!reports) return null;

    return (
        <div className="analytics-container">
            {/* رأس الصفحة - ✅ بدون أيقونات مكررة */}
            <div className="analytics-header">
                <h2>{isArabic ? 'التقارير الصحية' : 'Health Reports'}</h2>
                <div className="reports-controls" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="search-input" style={{ width: 'auto' }}>
                        <option value="weekly">{isArabic ? 'تقرير أسبوعي' : 'Weekly Report'}</option>
                        <option value="monthly">{isArabic ? 'تقرير شهري' : 'Monthly Report'}</option>
                        <option value="quarterly">{isArabic ? 'تقرير ربع سنوي' : 'Quarterly Report'}</option>
                        <option value="custom">{isArabic ? 'تقرير مخصص' : 'Custom Report'}</option>
                    </select>
                    {reportType === 'custom' && (
                        <div className="date-range" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <input 
                                type="date" 
                                value={dateRange.start} 
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                                className="search-input" 
                                style={{ width: 'auto' }} 
                            />
                            <span className="stat-label">{isArabic ? 'إلى' : 'to'}</span>
                            <input 
                                type="date" 
                                value={dateRange.end} 
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                                className="search-input" 
                                style={{ width: 'auto' }} 
                            />
                        </div>
                    )}
                    <button onClick={exportToPDF} className="type-btn" style={{ background: '#ef4444', color: 'white' }}>
                        📄 {isArabic ? 'PDF تحميل' : 'Export PDF'}
                    </button>
                    <button onClick={exportToCSV} className="type-btn" style={{ background: '#10b981', color: 'white' }}>
                        📊 {isArabic ? 'CSV تحميل' : 'Export CSV'}
                    </button>
                </div>
            </div>

            <div className="reports-content">
                {/* ✅ بطاقة درجة الصحة مع شرح */}
                <div className="insight-card">
                    <div className="insight-icon">🎯</div>
                    <div className="insight-content">
                        <div className="notification-header" style={{ marginBottom: 0 }}>
                            <div className="notification-title">
                                <span className="rec-category">{isArabic ? 'درجة الصحة' : 'Health Score'}</span>
                                <span className={`priority-badge ${reports.summary.healthScore.score >= 80 ? 'priority-urgent' : reports.summary.healthScore.score >= 60 ? 'priority-high' : 'priority-medium'}`}>
                                    {reports.summary.healthScore.score}/{reports.summary.healthScore.maxScore}
                                </span>
                                <span className="stat-label" style={{ marginLeft: 'var(--spacing-sm)' }}>
                                    {reports.summary.healthScore.statusText}
                                </span>
                            </div>
                        </div>
                        <div className="progress-bar" style={{ marginTop: 'var(--spacing-md)' }}>
                            <div className="progress-fill" style={{ width: `${reports.summary.healthScore.score}%` }}></div>
                        </div>
                        
                        {/* ✅ شرح طريقة حساب الدرجة */}
                        <details style={{ marginTop: 'var(--spacing-md)' }}>
                            <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                📖 {isArabic ? 'كيف تم حساب هذه الدرجة؟' : 'How is this score calculated?'}
                            </summary>
                            <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ fontSize: '0.8rem', marginBottom: 'var(--spacing-sm)' }}>
                                    {isArabic 
                                        ? 'تعتمد الدرجة على عدة عوامل مجموعها 100 نقطة:'
                                        : 'The score is based on several factors totaling 100 points:'}
                                </p>
                                <ul style={{ fontSize: '0.75rem', margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                                    <li>{isArabic ? '😴 جودة النوم: 25 نقطة' : '😴 Sleep quality: 25 points'}</li>
                                    <li>{isArabic ? '🥗 التغذية: 25 نقطة' : '🥗 Nutrition: 25 points'}</li>
                                    <li>{isArabic ? '🏃 النشاط البدني: 20 نقطة' : '🏃 Physical activity: 20 points'}</li>
                                    <li>{isArabic ? '❤️ القياسات الحيوية: 15 نقطة' : '❤️ Vital signs: 15 points'}</li>
                                    <li>{isArabic ? '😊 المزاج والعادات: 15 نقطة' : '😊 Mood & habits: 15 points'}</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </div>

                {/* ✅ القصة الذكية (أسلوب لطيف وإرشادي) */}
                {reports.summary.story.length > 0 && (
                    <div className="recommendations-section">
                        <div className="rec-header">
                            <span className="rec-icon">📖</span>
                            <span className="rec-category">{isArabic ? 'القصة الذكية لصحتك' : 'Your Health Story'}</span>
                        </div>
                        <div className="recommendations-list">
                            {reports.summary.story.map((paragraph, i) => (
                                <div key={i} className="recommendation-card">
                                    <p className="rec-message" style={{ lineHeight: 1.6 }}>{paragraph}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ✅ التوصية الأولى */}
                <div className="insight-card" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                    <div className="insight-icon">{reports.summary.topRecommendation.icon}</div>
                    <div className="insight-content">
                        <div className="rec-header">
                            <span className="rec-category" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                {isArabic ? 'التوصية المقترحة' : 'Suggested Recommendation'}
                            </span>
                        </div>
                        <h4 style={{ color: 'white', marginBottom: 'var(--spacing-sm)' }}>
                            {reports.summary.topRecommendation.title}
                        </h4>
                        <p className="rec-message" style={{ color: 'rgba(255,255,255,0.95)', marginBottom: 'var(--spacing-sm)' }}>
                            {reports.summary.topRecommendation.advice}
                        </p>
                        <div className="rec-advice" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                            💡 {reports.summary.topRecommendation.action}
                        </div>
                    </div>
                </div>

                {/* ✅ تبويبات منظمة */}
                <div className="analytics-tabs">
                    <button className={`type-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                        📊 {isArabic ? 'الملخص' : 'Summary'}
                    </button>
                    <button className={`type-btn ${activeTab === 'sleep' ? 'active' : ''}`} onClick={() => setActiveTab('sleep')}>
                        🌙 {isArabic ? 'النوم' : 'Sleep'}
                    </button>
                    <button className={`type-btn ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>
                        🥗 {isArabic ? 'التغذية' : 'Nutrition'}
                    </button>
                    <button className={`type-btn ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>
                        ❤️ {isArabic ? 'القياسات' : 'Metrics'}
                    </button>
                    <button className={`type-btn ${activeTab === 'mood' ? 'active' : ''}`} onClick={() => setActiveTab('mood')}>
                        😊 {isArabic ? 'المزاج' : 'Mood'}
                    </button>
                </div>

                {/* محتوى التبويبات */}
                <div className="tab-content">
                    {/* تبويب الملخص */}
                    {activeTab === 'summary' && (
                        <div className="analytics-stats-grid">
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🌙</div>
                                <div className="stat-content">
                                    <div className="stat-label">{isArabic ? 'النوم' : 'Sleep'}</div>
                                    <div className="stat-value">
                                        {reports.sleep.hasData ? reports.sleep.avgHours : 0} 
                                        <span className="stat-label">{isArabic ? 'ساعات' : 'hrs'}</span>
                                    </div>
                                    {reports.sleep.hasData && reports.sleep.message && (
                                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {reports.sleep.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🥗</div>
                                <div className="stat-content">
                                    <div className="stat-label">{isArabic ? 'السعرات' : 'Calories'}</div>
                                    <div className="stat-value">
                                        {reports.nutrition.hasData ? reports.nutrition.avgCaloriesPerDay : 0}
                                    </div>
                                    {reports.nutrition.hasData && reports.nutrition.message && (
                                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {reports.nutrition.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🏃</div>
                                <div className="stat-content">
                                    <div className="stat-label">{isArabic ? 'النشاط' : 'Activity'}</div>
                                    <div className="stat-value">
                                        {reports.activity.hasData ? reports.activity.avgMinutesPerDay : 0}
                                        <span className="stat-label">{isArabic ? 'دقيقة' : 'min'}</span>
                                    </div>
                                    {reports.activity.hasData && reports.activity.message && (
                                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {reports.activity.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">❤️</div>
                                <div className="stat-content">
                                    <div className="stat-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                                    <div className="stat-value">
                                        {reports.healthMetrics.hasData 
                                            ? `${reports.healthMetrics.avgSystolic}/${reports.healthMetrics.avgDiastolic}`
                                            : '—'}
                                    </div>
                                    {reports.healthMetrics.hasData && reports.healthMetrics.bpMessage && (
                                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {reports.healthMetrics.bpMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">😊</div>
                                <div className="stat-content">
                                    <div className="stat-label">{isArabic ? 'المزاج' : 'Mood'}</div>
                                    <div className="stat-value">
                                        {reports.mood.hasData ? reports.mood.avgMood : 0}/5
                                    </div>
                                    {reports.mood.hasData && reports.mood.message && (
                                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {reports.mood.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* تبويب النوم */}
                    {activeTab === 'sleep' && (
                        <div className="recommendations-section">
                            <h3>{isArabic ? 'تفاصيل النوم' : 'Sleep Details'}</h3>
                            {reports.sleep.hasData ? (
                                <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="strengths">
                                        <div className="habit-stats">
                                            <span>{isArabic ? 'متوسط ساعات النوم' : 'Average sleep'}: <strong>{reports.sleep.avgHours} {isArabic ? 'ساعات' : 'hours'}</strong></span>
                                            <span>{isArabic ? 'عدد الليالي المسجلة' : 'Nights recorded'}: <strong>{reports.sleep.totalNights}</strong></span>
                                        </div>
                                        <p className="stat-label" style={{ marginTop: 'var(--spacing-md)' }}>
                                            {isArabic 
                                                ? 'الحصول على 7-8 ساعات نوم يومياً قد يساهم في تحسين التركيز والطاقة.'
                                                : 'Getting 7-8 hours of sleep per day may contribute to better focus and energy.'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="analytics-empty">
                                    <p>{isArabic ? 'لا توجد بيانات نوم مسجلة' : 'No sleep data recorded'}</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* تبويب التغذية */}
                    {activeTab === 'nutrition' && (
                        <div className="recommendations-section">
                            <h3>{isArabic ? 'تفاصيل التغذية' : 'Nutrition Details'}</h3>
                            {reports.nutrition.hasData ? (
                                <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="strengths">
                                        <div className="habit-stats">
                                            <span>{isArabic ? 'متوسط السعرات اليومية' : 'Daily calories'}: <strong>{reports.nutrition.avgCaloriesPerDay}</strong></span>
                                            <span>{isArabic ? 'عدد الوجبات المسجلة' : 'Meals recorded'}: <strong>{reports.nutrition.totalMeals}</strong></span>
                                        </div>
                                        {reports.nutrition.avgProtein > 0 && (
                                            <div className="habit-stats" style={{ marginTop: 'var(--spacing-sm)' }}>
                                                <span>{isArabic ? 'البروتين' : 'Protein'}: <strong>{reports.nutrition.avgProtein}g</strong></span>
                                                <span>{isArabic ? 'الكربوهيدرات' : 'Carbs'}: <strong>{reports.nutrition.avgCarbs}g</strong></span>
                                                <span>{isArabic ? 'الدهون' : 'Fat'}: <strong>{reports.nutrition.avgFat}g</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="analytics-empty">
                                    <p>{isArabic ? 'لا توجد بيانات تغذية مسجلة' : 'No nutrition data recorded'}</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* تبويب القياسات */}
                    {activeTab === 'metrics' && (
                        <div className="recommendations-section">
                            <h3>{isArabic ? 'تفاصيل القياسات الحيوية' : 'Health Metrics Details'}</h3>
                            
                            {/* النشاط البدني */}
                            <div className="recommendations-section">
                                <h4>{isArabic ? 'النشاط البدني' : 'Physical Activity'}</h4>
                                {reports.activity.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                <span>{isArabic ? 'إجمالي الدقائق' : 'Total minutes'}: <strong>{reports.activity.totalMinutes} {isArabic ? 'دقيقة' : 'minutes'}</strong></span>
                                                <span>{isArabic ? 'المتوسط اليومي' : 'Daily average'}: <strong>{reports.activity.avgMinutesPerDay} {isArabic ? 'دقيقة' : 'min'}</strong></span>
                                            </div>
                                            <p className="stat-label" style={{ marginTop: 'var(--spacing-md)' }}>
                                                {isArabic 
                                                    ? 'ممارسة 30 دقيقة من النشاط المعتدل يومياً قد تساعد في تحسين اللياقة.'
                                                    : '30 minutes of moderate activity daily may help improve fitness.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">
                                        <p>{isArabic ? 'لا توجد بيانات نشاط بدني مسجلة' : 'No activity data recorded'}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* القياسات الحيوية */}
                            <div className="recommendations-section">
                                <h4>{isArabic ? 'القياسات الحيوية' : 'Vital Signs'}</h4>
                                {reports.healthMetrics.hasData ? (
                                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="strengths">
                                            <div className="habit-stats">
                                                {reports.healthMetrics.avgWeight > 0 && (
                                                    <span>{isArabic ? 'الوزن' : 'Weight'}: <strong>{reports.healthMetrics.avgWeight} {isArabic ? 'كجم' : 'kg'}</strong></span>
                                                )}
                                                <span>{isArabic ? 'ضغط الدم' : 'Blood Pressure'}: <strong>{reports.healthMetrics.avgSystolic}/{reports.healthMetrics.avgDiastolic} mmHg</strong></span>
                                                {reports.healthMetrics.avgGlucose > 0 && (
                                                    <span>{isArabic ? 'السكر' : 'Glucose'}: <strong>{reports.healthMetrics.avgGlucose} mg/dL</strong></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="analytics-empty">
                                        <p>{isArabic ? 'لا توجد بيانات قياسات حيوية مسجلة' : 'No vital signs data recorded'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* تبويب المزاج */}
                    {activeTab === 'mood' && (
                        <div className="recommendations-section">
                            <h3>{isArabic ? 'تفاصيل المزاج' : 'Mood Details'}</h3>
                            {reports.mood.hasData ? (
                                <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="strengths">
                                        <div className="habit-stats">
                                            <span>{isArabic ? 'متوسط درجة المزاج' : 'Average mood'}: <strong>{reports.mood.avgMood}/5</strong></span>
                                            <span>{isArabic ? 'عدد الأيام المسجلة' : 'Days recorded'}: <strong>{reports.mood.totalDays}</strong></span>
                                        </div>
                                        <p className="stat-label" style={{ marginTop: 'var(--spacing-md)' }}>
                                            {isArabic 
                                                ? 'الاهتمام بجودة النوم وممارسة النشاط البدني قد يساعد في تحسين الحالة المزاجية.'
                                                : 'Paying attention to sleep quality and physical activity may help improve mood.'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="analytics-empty">
                                    <p>{isArabic ? 'لا توجد بيانات مزاج مسجلة' : 'No mood data recorded'}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .reports-controls select,
                .reports-controls input {
                    min-width: 120px;
                }
                
                .reports-content details summary {
                    list-style: none;
                }
                
                .reports-content details summary::-webkit-details-marker {
                    display: none;
                }
                
                @media (max-width: 768px) {
                    .reports-controls {
                        width: 100%;
                        flex-direction: column;
                    }
                    
                    .reports-controls select,
                    .reports-controls input,
                    .reports-controls button {
                        width: 100%;
                    }
                    
                    .date-range {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
};

export default Reports;