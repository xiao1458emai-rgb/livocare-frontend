import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import '../../index.css';

const ActivityAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [activityInsights, setActivityInsights] = useState(null);
    const [backendInsights, setBackendInsights] = useState(null);
    const [healthData, setHealthData] = useState({
        bloodPressure: null,
        heartRate: null,
        bloodGlucose: null,
        oxygenLevel: null,
        sleepData: null,
        moodData: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
    const [useBackendData, setUseBackendData] = useState(false);
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ الاستماع لتغيير الثيم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // حساب المتوسط بأمان
    const safeMean = (arr) => {
        if (!arr || arr.length === 0) return 0;
        try {
            return math.mean(arr);
        } catch (error) {
            return 0;
        }
    };

    // حساب التقدم الأسبوعي
    const calculateWeekProgress = (activities) => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentActivities = activities.filter(a => 
            a.start_time && new Date(a.start_time) >= oneWeekAgo
        );
        
        const recentMinutes = recentActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        return Math.min(100, Math.round((recentMinutes / 150) * 100));
    };

    // إيجاد أفضل نشاط
    const findBestActivity = (activities) => {
        if (activities.length === 0) return null;
        
        const activityCounts = {};
        activities.forEach(a => {
            if (a.activity_type) {
                activityCounts[a.activity_type] = (activityCounts[a.activity_type] || 0) + 1;
            }
        });
        
        const best = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
        if (best) {
            const activityNames = {
                walking: isArabic ? '🚶 المشي' : '🚶 Walking',
                running: isArabic ? '🏃 الجري' : '🏃 Running',
                yoga: isArabic ? '🧘 يوجا' : '🧘 Yoga', 
                cardio: isArabic ? '❤️ تمارين قلب' : '❤️ Cardio',
                weightlifting: isArabic ? '🏋️ رفع أثقال' : '🏋️ Weightlifting',
                cycling: isArabic ? '🚴 ركوب دراجة' : '🚴 Cycling',
                swimming: isArabic ? '🏊 سباحة' : '🏊 Swimming'
            };
            return activityNames[best[0]] || best[0];
        }
        return null;
    };

    // ✅ تحويل بيانات Backend إلى تنسيق Frontend
    const transformBackendInsights = (backendData, localActivitySummary, currentHealthData) => {
        if (!backendData || backendData.error) return null;
        
        const vitalSigns = backendData.vital_signs_analysis || {};
        const bmiAnalysis = backendData.bmi_deep_analysis || {};
        const bodyComposition = backendData.body_composition_analysis || {};
        const metabolic = backendData.metabolic_analysis || {};
        const lifestyleScore = backendData.lifestyle_score || {};
        const personalizedRecs = backendData.personalized_recommendations || [];
        const ageRisks = backendData.age_related_risks || {};
        const userProfile = backendData.user_profile_analysis || {};
        
        // حساب درجة الصحة من Backend
        let score = lifestyleScore.score || 70;
        let status = 'good';
        if (score < 40) status = 'critical';
        else if (score < 60) status = 'poor';
        else if (score < 75) status = 'fair';
        else if (score < 90) status = 'good';
        else status = 'excellent';
        
        // تحويل التحذيرات من Backend
        const warnings = [];
        const positives = [];
        
        // إضافة تحذيرات من العلامات الحيوية
        if (vitalSigns.alerts) {
            vitalSigns.alerts.forEach(alert => {
                warnings.push({
                    type: alert.type,
                    severity: alert.severity === 'high' ? 'danger' : 'warning',
                    message: alert.message,
                    value: alert.details
                });
            });
        }
        
        if (vitalSigns.insights) {
            vitalSigns.insights.forEach(insight => {
                if (insight.severity === 'good') {
                    positives.push({
                        type: insight.type,
                        message: insight.message,
                        value: insight.details
                    });
                } else {
                    warnings.push({
                        type: insight.type,
                        severity: insight.severity === 'high' ? 'danger' : 'warning',
                        message: insight.message,
                        value: insight.details
                    });
                }
            });
        }
        
        // إضافة تحذيرات BMI
        if (bmiAnalysis.category && bmiAnalysis.severity !== 'good') {
            warnings.push({
                type: 'bmi',
                severity: bmiAnalysis.severity === 'critical' ? 'danger' : 'warning',
                message: isArabic ? `مؤشر كتلة الجسم: ${bmiAnalysis.category}` : `BMI: ${bmiAnalysis.category}`,
                value: `${bmiAnalysis.bmi} - ${bmiAnalysis.recommendation}`
            });
        } else if (bmiAnalysis.category) {
            positives.push({
                type: 'bmi',
                message: isArabic ? `✅ مؤشر كتلة جسم طبيعي: ${bmiAnalysis.bmi}` : `✅ Normal BMI: ${bmiAnalysis.bmi}`,
                value: bmiAnalysis.recommendation
            });
        }
        
        // إضافة تحذيرات تكوين الجسم
        if (bodyComposition.body_fat_category && bodyComposition.body_fat_category === 'خطير') {
            warnings.push({
                type: 'body_fat',
                severity: 'danger',
                message: isArabic ? `⚠️ نسبة دهون خطيرة: ${bodyComposition.body_fat_percentage}%` : `⚠️ Critical body fat: ${bodyComposition.body_fat_percentage}%`,
                value: bodyComposition.recommendation
            });
        }
        
        // تحويل الاتجاهات
        const trends = [];
        if (backendData.weight_trend_analysis && backendData.weight_trend_analysis.trend !== 'insufficient_data') {
            const weightTrend = backendData.weight_trend_analysis;
            trends.push({
                type: 'weight',
                direction: weightTrend.change > 0 ? 'up' : weightTrend.change < 0 ? 'down' : 'stable',
                message: isArabic ? `📊 اتجاه الوزن: ${weightTrend.trend}` : `📊 Weight trend: ${weightTrend.trend}`,
                change: `${Math.abs(weightTrend.change)} kg`
            });
        }
        
        // تحويل الارتباطات
        const correlations = [];
        if (backendData.sleep_mood_correlation && backendData.sleep_mood_correlation.status === 'ok') {
            correlations.push({
                type: 'sleep_mood',
                severity: 'info',
                message: isArabic ? '😴 تأثير النوم على المزاج' : '😴 Sleep impact on mood',
                advice: isArabic ? 'النوم الجيد يحسن المزاج والطاقة' : 'Good sleep improves mood and energy'
            });
        }
        
        // تحويل المخاطر
        const risks = [];
        if (backendData.glucose_risk_assessment && backendData.glucose_risk_assessment.status === 'critical') {
            risks.push({
                type: 'glucose',
                severity: 'high',
                message: isArabic ? '🚨 خطر ارتفاع السكر' : '🚨 High glucose risk',
                details: isArabic ? `متوسط السكر: ${backendData.glucose_risk_assessment.average}` : `Average glucose: ${backendData.glucose_risk_assessment.average}`,
                action: isArabic ? 'استشر طبيباً واتبع نظاماً غذائياً' : 'Consult a doctor and follow a diet plan'
            });
        }
        
        if (backendData.pre_exercise_recommendation && backendData.pre_exercise_recommendation.recommendations && 
            backendData.pre_exercise_recommendation.recommendations.length > 0) {
            backendData.pre_exercise_recommendation.recommendations.forEach(rec => {
                risks.push({
                    type: rec.type,
                    severity: rec.type === 'critical' ? 'high' : 'medium',
                    message: rec.title,
                    details: rec.message,
                    action: rec.advice
                });
            });
        }
        
        return {
            summary: localActivitySummary,
            globalHealth: { score, status, warnings, positives },
            trends: trends,
            correlations: correlations,
            risks: risks,
            healthData: currentHealthData,
            lastUpdated: new Date().toISOString(),
            backendData: {
                bmi: bmiAnalysis,
                bodyComposition: bodyComposition,
                metabolic: metabolic,
                lifestyleScore: lifestyleScore,
                personalizedRecommendations: personalizedRecs,
                ageRisks: ageRisks,
                userProfile: userProfile
            }
        };
    };

    // 🧠 تحليل الحالة الشاملة (محلي - Fallback)
    const calculateGlobalHealthScore = (activityData, healthData) => {
        let score = 100;
        const warnings = [];
        const positives = [];

        // تحليل السكر
        if (healthData.bloodGlucose) {
            const glucose = healthData.bloodGlucose;
            if (glucose < 70) {
                score -= 30;
                warnings.push({ 
                    type: 'glucose', 
                    severity: 'danger', 
                    message: isArabic ? '⚠️ سكر منخفض' : '⚠️ Low blood sugar', 
                    value: `${glucose} mg/dL` 
                });
            } else if (glucose > 180) {
                score -= 20;
                warnings.push({ 
                    type: 'glucose', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ سكر مرتفع' : '⚠️ High blood sugar', 
                    value: `${glucose} mg/dL` 
                });
            } else {
                positives.push({ 
                    type: 'glucose', 
                    message: isArabic ? '✅ سكر طبيعي' : '✅ Normal blood sugar', 
                    value: `${glucose} mg/dL` 
                });
            }
        }

        // تحليل النبض
        if (healthData.heartRate) {
            const hr = healthData.heartRate;
            if (hr > 140) {
                score -= 35;
                warnings.push({ 
                    type: 'heartRate', 
                    severity: 'danger', 
                    message: isArabic ? '🚨 نبض خطير جداً' : '🚨 Very dangerous heart rate', 
                    value: `${hr} BPM` 
                });
            } else if (hr > 100) {
                score -= 20;
                warnings.push({ 
                    type: 'heartRate', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ نبض مرتفع' : '⚠️ High heart rate', 
                    value: `${hr} BPM` 
                });
            } else if (hr < 60) {
                score -= 10;
                warnings.push({ 
                    type: 'heartRate', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ نبض منخفض' : '⚠️ Low heart rate', 
                    value: `${hr} BPM` 
                });
            } else {
                positives.push({ 
                    type: 'heartRate', 
                    message: isArabic ? '✅ نبض طبيعي' : '✅ Normal heart rate', 
                    value: `${hr} BPM` 
                });
            }
        }

        // تحليل الأكسجين
        if (healthData.oxygenLevel) {
            const o2 = healthData.oxygenLevel;
            if (o2 < 90) {
                score -= 30;
                warnings.push({ 
                    type: 'oxygen', 
                    severity: 'danger', 
                    message: isArabic ? '⚠️ نقص أكسجين خطير' : '⚠️ Critical low oxygen', 
                    value: `${o2}%` 
                });
            } else if (o2 < 95) {
                score -= 15;
                warnings.push({ 
                    type: 'oxygen', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ أكسجين منخفض' : '⚠️ Low oxygen', 
                    value: `${o2}%` 
                });
            } else {
                positives.push({ 
                    type: 'oxygen', 
                    message: isArabic ? '✅ أكسجين ممتاز' : '✅ Excellent oxygen', 
                    value: `${o2}%` 
                });
            }
        }

        // تحليل ضغط الدم
        if (healthData.bloodPressure) {
            const { systolic, diastolic } = healthData.bloodPressure;
            if (systolic > 140 || diastolic > 90) {
                score -= 20;
                warnings.push({ 
                    type: 'bp', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ ضغط مرتفع' : '⚠️ High blood pressure', 
                    value: `${systolic} / ${diastolic} mmHg` 
                });
            } else if (systolic < 90 || diastolic < 60) {
                score -= 15;
                warnings.push({ 
                    type: 'bp', 
                    severity: 'warning', 
                    message: isArabic ? '⚠️ ضغط منخفض' : '⚠️ Low blood pressure', 
                    value: `${systolic} / ${diastolic} mmHg` 
                });
            } else {
                positives.push({ 
                    type: 'bp', 
                    message: isArabic ? '✅ ضغط طبيعي' : '✅ Normal blood pressure', 
                    value: `${systolic} / ${diastolic} mmHg` 
                });
            }
        }

        // تحليل النشاط
        const totalMinutes = activityData.totalMinutes || 0;
        if (totalMinutes === 0) {
            score -= 25;
            warnings.push({ 
                type: 'activity', 
                severity: 'info', 
                message: isArabic ? 'ℹ️ لا يوجد نشاط بعد' : 'ℹ️ No activity yet', 
                value: isArabic ? '0 دقيقة' : '0 minutes' 
            });
        } else if (totalMinutes < 150) {
            score -= 15;
            warnings.push({ 
                type: 'activity', 
                severity: 'info', 
                message: isArabic ? '⚠️ نشاط أقل من الموصى به' : '⚠️ Activity below recommendation', 
                value: `${totalMinutes} / 150 ${isArabic ? 'دقيقة' : 'minutes'}` 
            });
        } else {
            positives.push({ 
                type: 'activity', 
                message: isArabic ? '✅ نشاط ممتاز' : '✅ Excellent activity', 
                value: `${totalMinutes} ${isArabic ? 'دقيقة' : 'minutes'}` 
            });
        }

        score = Math.max(0, Math.min(100, score));
        
        let status = 'good';
        if (score < 40) status = 'critical';
        else if (score < 60) status = 'poor';
        else if (score < 75) status = 'fair';
        else if (score < 90) status = 'good';
        else status = 'excellent';

        return { score, status, warnings, positives };
    };

    // 📉 تحليل الاتجاه (محلي)
    const calculateTrends = (activities) => {
        const trends = [];
        
        if (activities.length >= 3) {
            const lastWeek = activities.filter(a => 
                new Date(a.start_time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length;
            const previousWeek = activities.filter(a => {
                const date = new Date(a.start_time);
                const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
                const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                return date >= twoWeeksAgo && date < oneWeekAgo;
            }).length;
            
            if (lastWeek > previousWeek && previousWeek > 0) {
                trends.push({ 
                    type: 'activity', 
                    direction: 'up', 
                    message: isArabic ? '📈 النشاط في ارتفاع' : '📈 Activity increasing', 
                    change: `${Math.round((lastWeek - previousWeek) / previousWeek * 100)}% ${isArabic ? 'زيادة' : 'increase'}` 
                });
            } else if (lastWeek < previousWeek) {
                trends.push({ 
                    type: 'activity', 
                    direction: 'down', 
                    message: isArabic ? '📉 النشاط في انخفاض' : '📉 Activity decreasing', 
                    change: `${Math.round((previousWeek - lastWeek) / previousWeek * 100)}% ${isArabic ? 'نقصان' : 'decrease'}` 
                });
            }
        }

        return trends;
    };

    // 🧠 تحليل العلاقات (محلي)
    const analyzeCorrelations = (healthData) => {
        const correlations = [];
        
        if (healthData.bloodGlucose && healthData.heartRate) {
            if (healthData.bloodGlucose < 70 && healthData.heartRate > 100) {
                correlations.push({
                    type: 'glucose_heart_rate',
                    severity: 'danger',
                    message: isArabic ? '🚨 ارتباط خطير: انخفاض السكر مع ارتفاع النبض' : '🚨 Serious correlation: Low sugar with high heart rate',
                    advice: isArabic ? 'علامات إجهاد حاد، يحتاج تدخل فوري' : 'Signs of acute stress, needs immediate attention'
                });
            } else if (healthData.bloodGlucose < 70 && healthData.heartRate > 90) {
                correlations.push({
                    type: 'glucose_heart_rate',
                    severity: 'warning',
                    message: isArabic ? '⚠️ ارتباط: انخفاض السكر مصحوب بارتفاع النبض' : '⚠️ Correlation: Low sugar with high heart rate',
                    advice: isArabic ? 'يُنصح بأخذ قسط من الراحة وتناول سكر سريع' : 'Rest and eat fast-acting sugar'
                });
            }
        }
        
        return correlations;
    };

    // 🚨 تحليل المخاطر (محلي)
    const analyzeRisks = (healthData) => {
        const risks = [];
        
        if (healthData.heartRate && healthData.heartRate > 140) {
            risks.push({
                type: 'heart',
                severity: 'high',
                message: isArabic ? '🚨 خطر محتمل على القلب' : '🚨 Potential cardiac risk',
                details: isArabic ? 'ارتفاع شديد في النبض قد يشير إلى إجهاد قلبي' : 'Very high heart rate may indicate cardiac stress',
                action: isArabic ? 'يُنصح باستشارة طبيب فوراً' : 'Consult a doctor immediately'
            });
        }
        
        return risks;
    };

    // كشف الوقت المفضل للنشاط
    const detectPreferredActivityTime = (activities) => {
        if (!activities || activities.length === 0) return null;
        
        let morning = 0, afternoon = 0, evening = 0, night = 0;
        
        activities.forEach(activity => {
            if (!activity.start_time) return;
            const hour = new Date(activity.start_time).getHours();
            if (hour >= 5 && hour < 12) morning++;
            else if (hour >= 12 && hour < 17) afternoon++;
            else if (hour >= 17 && hour < 21) evening++;
            else night++;
        });
        
        const max = Math.max(morning, afternoon, evening, night);
        if (max === morning) return isArabic ? 'في الصباح (5-12 صباحاً)' : 'in the morning (5-12 AM)';
        if (max === afternoon) return isArabic ? 'في الظهيرة (12-5 مساءً)' : 'in the afternoon (12-5 PM)';
        if (max === evening) return isArabic ? 'في المساء (5-9 مساءً)' : 'in the evening (5-9 PM)';
        if (max === night) return isArabic ? 'في الليل (9-5 صباحاً)' : 'at night (9-5 AM)';
        return null;
    };
    
    const getBestActivityIcon = (activity) => {
        if (!activity) return '🏃';
        if (activity.includes('مشي') || activity.includes('Walk')) return '🚶';
        if (activity.includes('جري') || activity.includes('Run')) return '🏃';
        if (activity.includes('يوجا') || activity.includes('Yoga')) return '🧘';
        return '🏅';
    };

    // ✅ جلب جميع البيانات (مع Backend Insights)
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 10000 && hasAttemptedFetch) {
            console.log('⏸️ ActivityAnalytics: تم تجاهل الطلب المتكرر');
            return;
        }
        lastFetchTimeRef.current = now;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            // ✅ جلب البيانات من 4 مصادر
            const [activitiesRes, healthRes, glucoseRes, insightsRes] = await Promise.all([
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/blood-sugar/').catch(() => ({ data: [] })),
                axiosInstance.get('/advanced-insights/').catch(() => ({ data: null }))
            ]);
            
            if (!isMountedRef.current) return;
            
            // معالجة الأنشطة
            let activitiesData = [];
            if (activitiesRes.data?.results) {
                activitiesData = activitiesRes.data.results;
            } else if (Array.isArray(activitiesRes.data)) {
                activitiesData = activitiesRes.data;
            }
            
            // معالجة السجلات الصحية
            let healthRecords = [];
            if (healthRes.data?.results) {
                healthRecords = healthRes.data.results;
            } else if (Array.isArray(healthRes.data)) {
                healthRecords = healthRes.data;
            }
            
            // معالجة سكر الدم
            let glucoseRecords = [];
            if (glucoseRes.data?.results) {
                glucoseRecords = glucoseRes.data.results;
            } else if (Array.isArray(glucoseRes.data)) {
                glucoseRecords = glucoseRes.data;
            }
            
            // ✅ معالجة التحليلات من Backend
            let backendData = null;
            if (insightsRes.data && !insightsRes.data.error) {
                backendData = insightsRes.data;
                console.log('✅ Backend insights loaded:', backendData);
                setUseBackendData(true);
            } else {
                console.log('⚠️ Backend insights not available, using local calculations');
                setUseBackendData(false);
            }
            
            const latestHealth = healthRecords[0] || {};
            const latestGlucose = glucoseRecords[0] || {};
            
            const currentHealthData = {
                bloodPressure: latestHealth.systolic_pressure && latestHealth.diastolic_pressure ? 
                    { systolic: latestHealth.systolic_pressure, diastolic: latestHealth.diastolic_pressure } : null,
                heartRate: latestHealth.heart_rate || null,
                oxygenLevel: latestHealth.spo2 || null,
                bloodGlucose: latestGlucose.value || latestHealth.blood_glucose || null,
                sleepData: null,
                moodData: null
            };
            
            const activityMinutes = activitiesData
                .map(a => a.duration_minutes || 0)
                .filter(m => m > 0 && m <= 180);
            
            const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);
            const activitiesCount = activitiesData.length;
            const totalCalories = activitiesData.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
            const weekProgress = calculateWeekProgress(activitiesData);
            const bestActivity = findBestActivity(activitiesData);
            const preferredTime = detectPreferredActivityTime(activitiesData);
            
            const activitySummary = {
                totalMinutes: totalActivity,
                totalCalories: totalCalories,
                activitiesCount: activitiesCount,
                weekProgress: weekProgress,
                bestActivity: bestActivity,
                preferredTime: preferredTime,
                activities: activitiesData
            };
            
            let finalInsights;
            
            // ✅ استخدام بيانات Backend إذا كانت متوفرة
            if (backendData) {
                finalInsights = transformBackendInsights(backendData, activitySummary, currentHealthData);
                if (finalInsights) {
                    setBackendInsights(backendData);
                } else {
                    // Fallback للحسابات المحلية
                    finalInsights = {
                        summary: activitySummary,
                        globalHealth: calculateGlobalHealthScore(activitySummary, currentHealthData),
                        trends: calculateTrends(activitiesData),
                        correlations: analyzeCorrelations(currentHealthData),
                        risks: analyzeRisks(currentHealthData),
                        healthData: currentHealthData,
                        lastUpdated: new Date().toISOString()
                    };
                    setUseBackendData(false);
                }
            } else {
                // حسابات محلية
                finalInsights = {
                    summary: activitySummary,
                    globalHealth: calculateGlobalHealthScore(activitySummary, currentHealthData),
                    trends: calculateTrends(activitiesData),
                    correlations: analyzeCorrelations(currentHealthData),
                    risks: analyzeRisks(currentHealthData),
                    healthData: currentHealthData,
                    lastUpdated: new Date().toISOString()
                };
            }
            
            if (isMountedRef.current) {
                setActivityInsights(finalInsights);
                setHasAttemptedFetch(true);
                setError(null);
            }
            
        } catch (err) {
            console.error('❌ Error fetching analytics:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل التحليلات' : 'Error loading analytics');
                setActivityInsights(null);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isArabic, hasAttemptedFetch]);

    // ✅ التحميل الأولي
    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();
        
        return () => {
            isMountedRef.current = false;
            isFetchingRef.current = false;
        };
    }, [fetchAllData]);

    // ✅ تأثير التحديث الخارجي
    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current && !isFetchingRef.current) {
            const now = Date.now();
            if (now - lastFetchTimeRef.current < 10000) {
                console.log('⏸️ ActivityAnalytics: تم تجاهل التحديث المتكرر من refreshTrigger');
                return;
            }
            fetchAllData();
        }
    }, [refreshTrigger, fetchAllData]);

    const getHealthStatusColor = (status) => {
        switch(status) {
            case 'excellent': return '#10b981';
            case 'good': return '#3b82f6';
            case 'fair': return '#f59e0b';
            case 'poor': return '#ef4444';
            case 'critical': return '#dc2626';
            default: return '#6b7280';
        }
    };
    
    const getHealthStatusText = (status) => {
        switch(status) {
            case 'excellent': return isArabic ? 'ممتازة' : 'Excellent';
            case 'good': return isArabic ? 'جيدة' : 'Good';
            case 'fair': return isArabic ? 'متوسطة' : 'Fair';
            case 'poor': return isArabic ? 'سيئة' : 'Poor';
            case 'critical': return isArabic ? 'حرجة' : 'Critical';
            default: return isArabic ? 'غير معروفة' : 'Unknown';
        }
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{isArabic ? '🧠 جاري التحليل العميق...' : '🧠 Deep analysis in progress...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={() => {
                    lastFetchTimeRef.current = 0;
                    fetchAllData();
                }} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    if (!activityInsights || !activityInsights.summary || activityInsights.summary.activitiesCount === 0) {
        return (
            <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>{isArabic ? '🧠 تحليلات النشاط الذكية' : '🧠 Smart Activity Analytics'}</h2>
                    <button onClick={() => {
                        lastFetchTimeRef.current = 0;
                        fetchAllData();
                    }} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                </div>
                <div className="no-data">
                    <div className="no-data-icon">📊</div>
                    <p>{isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis'}</p>
                    <p className="hint">
                        {isArabic ? 'ابدأ بإضافة الأنشطة والقياسات الصحية' : 'Start by adding activities and health measurements'}
                    </p>
                    <button 
                        onClick={() => {
                            const activityForm = document.querySelector('.activity-form-card');
                            if (activityForm) activityForm.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="add-data-btn"
                    >
                        ➕ {isArabic ? 'أضف نشاطاً جديداً' : 'Add New Activity'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? '🧠 تحليلات النشاط الذكية' : '🧠 Smart Activity Analytics'}</h2>
                {useBackendData && (
                    <span className="ai-badge">
                        🤖 AI {isArabic ? 'متقدم' : 'Advanced'}
                    </span>
                )}
                <button onClick={() => {
                    lastFetchTimeRef.current = 0;
                    fetchAllData();
                }} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* ✅ إضافة معلومات BMI المتقدم إذا كان متوفراً */}
            {activityInsights.backendData && activityInsights.backendData.bmi && activityInsights.backendData.bmi.status !== 'insufficient_data' && (
                <div className="bmi-card">
                    <div className="bmi-header">
                        <span className="bmi-icon">⚖️</span>
                        <h3>{isArabic ? 'تحليل مؤشر كتلة الجسم المتقدم' : 'Advanced BMI Analysis'}</h3>
                    </div>
                    <div className="bmi-content">
                        <div className="bmi-value">
                            <span className="bmi-number">{activityInsights.backendData.bmi.bmi}</span>
                            <span className="bmi-category" style={{ 
                                background: activityInsights.backendData.bmi.severity === 'good' ? '#10b981' : 
                                           activityInsights.backendData.bmi.severity === 'warning' ? '#f59e0b' : '#ef4444'
                            }}>
                                {activityInsights.backendData.bmi.category}
                            </span>
                        </div>
                        <p className="bmi-recommendation">{activityInsights.backendData.bmi.recommendation}</p>
                        
                        {activityInsights.backendData.bmi.weight_to_lose > 0 && (
                            <div className="weight-goal">
                                <span>🎯 {isArabic ? 'الوزن المستهدف لخسارته' : 'Target weight to lose'}:</span>
                                <strong>{activityInsights.backendData.bmi.weight_to_lose} kg</strong>
                                <small>{activityInsights.backendData.bmi.time_to_goal?.message_ar || 
                                        activityInsights.backendData.bmi.time_to_goal?.message_en}</small>
                            </div>
                        )}
                        
                        {activityInsights.backendData.bmi.weight_to_gain > 0 && (
                            <div className="weight-goal">
                                <span>💪 {isArabic ? 'الوزن المستهدف لاكتسابه' : 'Target weight to gain'}:</span>
                                <strong>{activityInsights.backendData.bmi.weight_to_gain} kg</strong>
                                <small>{activityInsights.backendData.bmi.time_to_goal?.message_ar || 
                                        activityInsights.backendData.bmi.time_to_goal?.message_en}</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ✅ إضافة معلومات تكوين الجسم إذا كان متوفراً */}
            {activityInsights.backendData && activityInsights.backendData.bodyComposition && 
             activityInsights.backendData.bodyComposition.body_fat_percentage && (
                <div className="body-composition-card">
                    <div className="composition-header">
                        <span className="composition-icon">💪</span>
                        <h3>{isArabic ? 'تحليل تكوين الجسم' : 'Body Composition Analysis'}</h3>
                    </div>
                    <div className="composition-stats">
                        <div className="stat-item">
                            <span className="stat-label">{isArabic ? 'نسبة الدهون' : 'Body Fat'}:</span>
                            <span className="stat-value">{activityInsights.backendData.bodyComposition.body_fat_percentage}%</span>
                            <span className="stat-category">{activityInsights.backendData.bodyComposition.body_fat_category}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">{isArabic ? 'الكتلة العضلية' : 'Muscle Mass'}:</span>
                            <span className="stat-value">{activityInsights.backendData.bodyComposition.estimated_muscle_mass_kg} kg</span>
                        </div>
                    </div>
                    <p className="composition-recommendation">{activityInsights.backendData.bodyComposition.recommendation}</p>
                </div>
            )}

            {/* 🧠 الحالة الصحية الشاملة */}
            <div className="global-health-card">
                <h3>{isArabic ? '🧠 الحالة الصحية اليوم' : '🧠 Daily Health Status'}</h3>
                <div className="health-score-container">
                    <div className="health-score-circle">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                            <circle 
                                cx="60" cy="60" r="54" 
                                fill="none" 
                                stroke={getHealthStatusColor(activityInsights.globalHealth.status)} 
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 54}`}
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - activityInsights.globalHealth.score / 100)}`}
                                transform="rotate(-90 60 60)"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">
                                {activityInsights.globalHealth.score}%
                            </text>
                        </svg>
                    </div>
                    <div className="health-status">
                        <span className="status-badge" style={{ background: getHealthStatusColor(activityInsights.globalHealth.status) }}>
                            {getHealthStatusText(activityInsights.globalHealth.status)}
                        </span>
                    </div>
                </div>
                
                <div className="health-analysis">
                    {activityInsights.globalHealth.positives && activityInsights.globalHealth.positives.length > 0 && (
                        <div className="positives-list">
                            <strong>{isArabic ? '✅ الإيجابيات' : '✅ Positives'}</strong>
                            {activityInsights.globalHealth.positives.slice(0, 3).map((p, i) => (
                                <div key={i} className="positive-item">
                                    {p.message}: <span>{p.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {activityInsights.globalHealth.warnings && activityInsights.globalHealth.warnings.length > 0 && (
                        <div className="warnings-list">
                            <strong>{isArabic ? '⚠️ يحتاج انتباه' : '⚠️ Needs attention'}</strong>
                            {activityInsights.globalHealth.warnings.slice(0, 3).map((w, i) => (
                                <div key={i} className={`warning-item severity-${w.severity}`}>
                                    {w.message}: <span>{w.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ توصيات شخصية من Backend */}
            {activityInsights.backendData && activityInsights.backendData.personalizedRecommendations && 
             activityInsights.backendData.personalizedRecommendations.length > 0 && (
                <div className="recommendations-card">
                    <h3>{isArabic ? '💡 توصيات مخصصة لك' : '💡 Personalized Recommendations'}</h3>
                    <div className="recommendations-list">
                        {activityInsights.backendData.personalizedRecommendations.slice(0, 4).map((rec, i) => (
                            <div key={i} className={`recommendation-item priority-${rec.priority}`}>
                                <div className="recommendation-header">
                                    <span className="recommendation-icon">{rec.icon}</span>
                                    <span className="recommendation-title">{rec.title}</span>
                                </div>
                                <p className="recommendation-description">{rec.description}</p>
                                {rec.actions && rec.actions.length > 0 && (
                                    <ul className="recommendation-actions">
                                        {rec.actions.slice(0, 2).map((action, j) => (
                                            <li key={j}>✓ {action}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 📉 تحليل الاتجاهات */}
            {activityInsights.trends && activityInsights.trends.length > 0 && (
                <div className="trends-card">
                    <h3>{isArabic ? '📉 تحليل الاتجاه' : '📉 Trend Analysis'}</h3>
                    <div className="trends-list">
                        {activityInsights.trends.map((trend, i) => (
                            <div key={i} className={`trend-item direction-${trend.direction}`}>
                                <span className="trend-message">{trend.message}</span>
                                <span className="trend-change">{trend.change}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🧠 ملاحظات ذكية */}
            {activityInsights.correlations && activityInsights.correlations.length > 0 && (
                <div className="correlations-card">
                    <h3>{isArabic ? '🧠 ملاحظات ذكية' : '🧠 Smart Insights'}</h3>
                    <div className="correlations-list">
                        {activityInsights.correlations.map((corr, i) => (
                            <div key={i} className={`correlation-item severity-${corr.severity}`}>
                                <p className="correlation-message">{corr.message}</p>
                                <p className="correlation-advice">💡 {corr.advice}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🚨 تحليل المخاطر */}
            {activityInsights.risks && activityInsights.risks.length > 0 && (
                <div className="risks-card">
                    <h3>{isArabic ? '🚨 تحليل المخاطر' : '🚨 Risk Analysis'}</h3>
                    <div className="risks-list">
                        {activityInsights.risks.map((risk, i) => (
                            <div key={i} className={`risk-item severity-${risk.severity}`}>
                                <div className="risk-header">
                                    <span className="risk-message">{risk.message}</span>
                                    <span className={`risk-badge severity-${risk.severity}`}>
                                        {risk.severity === 'high' ? (isArabic ? 'خطر مرتفع' : 'High Risk') : 
                                         risk.severity === 'medium' ? (isArabic ? 'خطر متوسط' : 'Medium Risk') : 
                                         (isArabic ? 'تنبيه' : 'Alert')}
                                    </span>
                                </div>
                                <p className="risk-details">{risk.details}</p>
                                <p className="risk-action">🚨 {risk.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* بطاقة الملخص الأساسي */}
            <div className="summary-card">
                <h3>{isArabic ? '📊 ملخص النشاط' : '📊 Activity Summary'}</h3>
                <div className="summary-stats">
                    <div className="stat">
                        <span className="stat-value">{activityInsights.summary.totalMinutes}</span>
                        <span className="stat-label">{isArabic ? 'إجمالي الدقائق' : 'Total Minutes'}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{activityInsights.summary.totalCalories}</span>
                        <span className="stat-label">{isArabic ? 'إجمالي السعرات' : 'Total Calories'}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{activityInsights.summary.activitiesCount}</span>
                        <span className="stat-label">{isArabic ? 'عدد الأنشطة' : 'Activities Count'}</span>
                    </div>
                </div>
                
                <div className="progress-container">
                    <div className="progress-bar-bg">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${activityInsights.summary.weekProgress}%` }}
                        >
                            <span className="progress-text">
                                {activityInsights.summary.weekProgress}% {isArabic ? 'من هدف الأسبوع' : 'of weekly goal'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {activityInsights.summary.bestActivity && (
                    <div className="best-activity">
                        <span className="best-icon">{getBestActivityIcon(activityInsights.summary.bestActivity)}</span>
                        <span className="best-text">
                            {isArabic ? 'نشاطك المفضل' : 'Your favorite activity'}: {activityInsights.summary.bestActivity}
                        </span>
                    </div>
                )}
                
                {activityInsights.summary.preferredTime && (
                    <div className="preferred-time">
                        <span className="time-icon">⏰</span>
                        <span className="time-text">
                            {isArabic ? 'وقتك المفضل للنشاط' : 'Your preferred activity time'}: {activityInsights.summary.preferredTime}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="analytics-footer">
                <small>
                    {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(activityInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    {useBackendData && <span className="ai-badge-footer"> 🤖 {isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'AI Powered'}</span>}
                </small>
            </div>

            <style jsx>{`
                /* الأنماط الموجودة محفوظة كما هي... */
                
                /* أنماط إضافية للبطاقات الجديدة */
                .ai-badge {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: white;
                    margin-left: 0.5rem;
                }
                
                .bmi-card, .body-composition-card, .recommendations-card {
                    background: var(--secondary-bg, #f9fafb);
                    border-radius: 18px;
                    padding: 1.25rem;
                    border: 1px solid var(--border-light, #eef2f6);
                }
                
                .dark-mode .bmi-card,
                .dark-mode .body-composition-card,
                .dark-mode .recommendations-card {
                    background: #0f172a;
                    border-color: #334155;
                }
                
                .bmi-header, .composition-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .bmi-icon, .composition-icon {
                    font-size: 1.5rem;
                }
                
                .bmi-header h3, .composition-header h3 {
                    margin: 0;
                    font-size: 0.9rem;
                }
                
                .bmi-value {
                    display: flex;
                    align-items: baseline;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }
                
                .bmi-number {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--primary, #6366f1);
                }
                
                .bmi-category {
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: white;
                }
                
                .bmi-recommendation {
                    font-size: 0.8rem;
                    margin-bottom: 0.75rem;
                    color: var(--text-secondary, #95a9c6);
                }
                
                .weight-goal {
                    background: var(--card-bg, #ffffff);
                    padding: 0.75rem;
                    border-radius: 12px;
                    margin-top: 0.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .dark-mode .weight-goal {
                    background: #597eba;
                }
                
                .weight-goal span {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #9ca3af);
                }
                
                .weight-goal strong {
                    font-size: 1.1rem;
                    color: var(--primary, #6366f1);
                }
                
                .weight-goal small {
                    font-size: 0.65rem;
                }
                
                .composition-stats {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }
                
                .composition-stats .stat-item {
                    flex: 1;
                    background: var(--card-bg, #ffffff);
                    padding: 0.75rem;
                    border-radius: 12px;
                    text-align: center;
                }
                
                .dark-mode .composition-stats .stat-item {
                    background: #1e293b;
                }
                
                .composition-stats .stat-label {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #b9c2d2);
                    display: block;
                }
                
                .composition-stats .stat-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    display: block;
                }
                
                .composition-stats .stat-category {
                    font-size: 0.6rem;
                    display: block;
                    margin-top: 0.25rem;
                }
                
                .composition-recommendation {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #90a4c0);
                    margin: 0;
                }
                
                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .recommendation-item {
                    padding: 0.75rem;
                    border-radius: 14px;
                    background: var(--card-bg, #ffffff);
                }
                
                .dark-mode .recommendation-item {
                    background: #1e293b;
                }
                
                .recommendation-item.priority-high {
                    border-left: 3px solid #ef4444;
                }
                
                .recommendation-item.priority-medium {
                    border-left: 3px solid #f59e0b;
                }
                
                .recommendation-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .recommendation-icon {
                    font-size: 1.2rem;
                }
                
                .recommendation-title {
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                
                .recommendation-description {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                    margin: 0 0 0.5rem 0;
                }
                
                .recommendation-actions {
                    margin: 0;
                    padding-left: 1.5rem;
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #bcc4d3);
                }
                
                .recommendation-actions li {
                    margin-bottom: 0.25rem;
                }
                
                .ai-badge-footer {
                    margin-left: 0.5rem;
                    font-size: 0.6rem;
                    opacity: 0.7;
                }
                
                @media (max-width: 768px) {
                    .composition-stats {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityAnalytics;