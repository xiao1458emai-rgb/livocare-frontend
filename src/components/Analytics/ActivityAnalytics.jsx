// ActivityAnalytics.jsx - النسخة المعدلة

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

    // ✅ تحويل بيانات Backend من API الجديد إلى تنسيق Frontend
    const transformBackendInsights = (backendData, localActivitySummary, currentHealthData) => {
        if (!backendData || backendData.error) return null;
        
        // استخراج البيانات من الـ API الجديد
        const profile = backendData.profile || {};
        const weightBmi = backendData.weight_bmi || {};
        const vitalSigns = backendData.vital_signs || {};
        const sleep = backendData.sleep || {};
        const moodMental = backendData.mood_mental || {};
        const nutrition = backendData.nutrition || {};
        const activity = backendData.activity || {};
        const habits = backendData.habits || {};
        const healthRisks = backendData.health_risks || {};
        const recommendations = backendData.personalized_recommendations || [];
        const healthScore = backendData.health_score || {};
        const predictions = backendData.predictions || {};
        
        // حساب درجة الصحة
        let score = healthScore.total_score || 70;
        let status = 'good';
        if (score < 40) status = 'critical';
        else if (score < 60) status = 'poor';
        else if (score < 75) status = 'fair';
        else if (score < 90) status = 'good';
        else status = 'excellent';
        
        // تحويل التحذيرات
        const warnings = [];
        const positives = [];
        
        // إضافة تحذيرات من العلامات الحيوية
        if (vitalSigns.alerts) {
            vitalSigns.alerts.forEach(alert => {
                warnings.push({
                    type: alert.type,
                    severity: alert.severity === 'high' ? 'danger' : 'warning',
                    message: alert.message,
                    value: alert.advice
                });
            });
        }
        
        // إضافة تحذيرات من المخاطر الصحية
        if (healthRisks.risks) {
            healthRisks.risks.forEach(risk => {
                if (risk.severity === 'high') {
                    warnings.push({
                        type: risk.type,
                        severity: 'danger',
                        message: risk.condition,
                        value: risk.message
                    });
                }
            });
        }
        
        // تحويل الاتجاهات
        const trends = [];
        if (weightBmi.trend === 'increasing') {
            trends.push({
                type: 'weight',
                direction: 'up',
                message: isArabic ? '📈 الوزن في ازدياد' : '📈 Weight increasing',
                change: `${Math.abs(weightBmi.weight_change_90d || 0)} kg`
            });
        } else if (weightBmi.trend === 'decreasing') {
            trends.push({
                type: 'weight',
                direction: 'down',
                message: isArabic ? '📉 الوزن في انخفاض' : '📉 Weight decreasing',
                change: `${Math.abs(weightBmi.weight_change_90d || 0)} kg`
            });
        }
        
        // تحويل الارتباطات
        const correlations = [];
        if (sleep.average_hours && moodMental.average_mood_score) {
            correlations.push({
                type: 'sleep_mood',
                severity: 'info',
                message: isArabic ? '😴 تأثير النوم على المزاج' : '😴 Sleep impact on mood',
                advice: isArabic ? `نومك ${sleep.average_hours} ساعات يؤثر على مزاجك` : `Your ${sleep.average_hours} hours of sleep affects your mood`
            });
        }
        
        // تحويل المخاطر
        const risks = [];
        if (healthRisks.risks) {
            healthRisks.risks.forEach(risk => {
                if (risk.severity === 'high') {
                    risks.push({
                        type: risk.type,
                        severity: 'high',
                        message: risk.condition,
                        details: risk.message,
                        action: isArabic ? 'يُنصح باستشارة طبيب' : 'Consult a doctor'
                    });
                }
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
                profile: profile,
                weightBmi: weightBmi,
                vitalSigns: vitalSigns,
                sleep: sleep,
                moodMental: moodMental,
                nutrition: nutrition,
                activity: activity,
                habits: habits,
                healthRisks: healthRisks,
                recommendations: recommendations,
                healthScore: healthScore,
                predictions: predictions
            }
        };
    };

    // 🧠 تحليل الحالة الشاملة (محلي - Fallback)
    const calculateGlobalHealthScore = (activityData, healthData) => {
        let score = 100;
        const warnings = [];
        const positives = [];

        if (healthData.bloodGlucose) {
            const glucose = healthData.bloodGlucose;
            if (glucose < 70) {
                score -= 30;
                warnings.push({ type: 'glucose', severity: 'danger', message: isArabic ? '⚠️ سكر منخفض' : '⚠️ Low blood sugar', value: `${glucose} mg/dL` });
            } else if (glucose > 180) {
                score -= 20;
                warnings.push({ type: 'glucose', severity: 'warning', message: isArabic ? '⚠️ سكر مرتفع' : '⚠️ High blood sugar', value: `${glucose} mg/dL` });
            } else if (glucose) {
                positives.push({ type: 'glucose', message: isArabic ? '✅ سكر طبيعي' : '✅ Normal blood sugar', value: `${glucose} mg/dL` });
            }
        }

        if (healthData.heartRate) {
            const hr = healthData.heartRate;
            if (hr > 140) {
                score -= 35;
                warnings.push({ type: 'heartRate', severity: 'danger', message: isArabic ? '🚨 نبض خطير جداً' : '🚨 Very dangerous heart rate', value: `${hr} BPM` });
            } else if (hr > 100) {
                score -= 20;
                warnings.push({ type: 'heartRate', severity: 'warning', message: isArabic ? '⚠️ نبض مرتفع' : '⚠️ High heart rate', value: `${hr} BPM` });
            } else if (hr < 60) {
                score -= 10;
                warnings.push({ type: 'heartRate', severity: 'warning', message: isArabic ? '⚠️ نبض منخفض' : '⚠️ Low heart rate', value: `${hr} BPM` });
            } else if (hr) {
                positives.push({ type: 'heartRate', message: isArabic ? '✅ نبض طبيعي' : '✅ Normal heart rate', value: `${hr} BPM` });
            }
        }

        if (healthData.oxygenLevel) {
            const o2 = healthData.oxygenLevel;
            if (o2 < 90) {
                score -= 30;
                warnings.push({ type: 'oxygen', severity: 'danger', message: isArabic ? '⚠️ نقص أكسجين خطير' : '⚠️ Critical low oxygen', value: `${o2}%` });
            } else if (o2 < 95) {
                score -= 15;
                warnings.push({ type: 'oxygen', severity: 'warning', message: isArabic ? '⚠️ أكسجين منخفض' : '⚠️ Low oxygen', value: `${o2}%` });
            } else if (o2) {
                positives.push({ type: 'oxygen', message: isArabic ? '✅ أكسجين ممتاز' : '✅ Excellent oxygen', value: `${o2}%` });
            }
        }

        if (healthData.bloodPressure) {
            const { systolic, diastolic } = healthData.bloodPressure;
            if (systolic > 140 || diastolic > 90) {
                score -= 20;
                warnings.push({ type: 'bp', severity: 'warning', message: isArabic ? '⚠️ ضغط مرتفع' : '⚠️ High blood pressure', value: `${systolic}/${diastolic} mmHg` });
            } else if (systolic < 90 || diastolic < 60) {
                score -= 15;
                warnings.push({ type: 'bp', severity: 'warning', message: isArabic ? '⚠️ ضغط منخفض' : '⚠️ Low blood pressure', value: `${systolic}/${diastolic} mmHg` });
            } else if (systolic && diastolic) {
                positives.push({ type: 'bp', message: isArabic ? '✅ ضغط طبيعي' : '✅ Normal blood pressure', value: `${systolic}/${diastolic} mmHg` });
            }
        }

        const totalMinutes = activityData.totalMinutes || 0;
        if (totalMinutes === 0) {
            score -= 25;
            warnings.push({ type: 'activity', severity: 'info', message: isArabic ? 'ℹ️ لا يوجد نشاط بعد' : 'ℹ️ No activity yet', value: isArabic ? '0 دقيقة' : '0 minutes' });
        } else if (totalMinutes < 150) {
            score -= 15;
            warnings.push({ type: 'activity', severity: 'info', message: isArabic ? '⚠️ نشاط أقل من الموصى به' : '⚠️ Activity below recommendation', value: `${totalMinutes} / 150 ${isArabic ? 'دقيقة' : 'minutes'}` });
        } else {
            positives.push({ type: 'activity', message: isArabic ? '✅ نشاط ممتاز' : '✅ Excellent activity', value: `${totalMinutes} ${isArabic ? 'دقيقة' : 'minutes'}` });
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

    // ✅ جلب جميع البيانات (مع Backend Insights الجديد)
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
            // ✅ استخدام الـ endpoints الجديدة فقط
            const [activitiesRes, healthRes, comprehensiveRes] = await Promise.all([
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/analytics/comprehensive/api/?lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null }))
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
            
            // ✅ معالجة التحليلات من Backend (API الجديد)
            let backendData = null;
            if (comprehensiveRes.data?.success && comprehensiveRes.data?.data) {
                backendData = comprehensiveRes.data.data;
                console.log('✅ Backend insights loaded from comprehensive API:', backendData);
                setUseBackendData(true);
                setBackendInsights(backendData);
            } else {
                console.log('⚠️ Backend insights not available, using local calculations');
                setUseBackendData(false);
            }
            
            const latestHealth = healthRecords[0] || {};
            
            const currentHealthData = {
                bloodPressure: latestHealth.systolic_pressure && latestHealth.diastolic_pressure ? 
                    { systolic: latestHealth.systolic_pressure, diastolic: latestHealth.diastolic_pressure } : null,
                heartRate: latestHealth.heart_rate || latestHealth.heartRate || null,
                oxygenLevel: latestHealth.spo2 || null,
                bloodGlucose: latestHealth.blood_glucose || null,
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

            {/* ✅ بطاقة درجة الصحة من Backend */}
            {activityInsights.backendData && activityInsights.backendData.healthScore && (
                <div className="health-score-card">
                    <div className="score-header">
                        <span className="score-icon">🎯</span>
                        <h3>{isArabic ? 'درجة صحتك الشاملة' : 'Your Overall Health Score'}</h3>
                    </div>
                    <div className="score-value-large">
                        <span className="score-number">{activityInsights.backendData.healthScore.total_score}</span>
                        <span className="score-max">/100</span>
                        <span className={`score-badge score-${activityInsights.backendData.healthScore.category}`}>
                            {activityInsights.backendData.healthScore.category_text}
                        </span>
                    </div>
                    <div className="score-components">
                        {Object.entries(activityInsights.backendData.healthScore.components || {}).map(([key, value]) => (
                            <div key={key} className="component-item">
                                <span className="component-name">
                                    {key === 'sleep' ? (isArabic ? 'نوم' : 'Sleep') :
                                     key === 'mood' ? (isArabic ? 'مزاج' : 'Mood') :
                                     key === 'nutrition' ? (isArabic ? 'تغذية' : 'Nutrition') :
                                     key === 'activity' ? (isArabic ? 'نشاط' : 'Activity') :
                                     key === 'habits' ? (isArabic ? 'عادات' : 'Habits') : key}
                                </span>
                                <div className="component-bar">
                                    <div className="component-fill" style={{ width: `${(value / 20) * 100}%` }}></div>
                                </div>
                                <span className="component-score">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ بطاقة الوزن و BMI من Backend */}
            {activityInsights.backendData && activityInsights.backendData.weightBmi && 
             activityInsights.backendData.weightBmi.bmi && (
                <div className="bmi-card">
                    <div className="bmi-header">
                        <span className="bmi-icon">⚖️</span>
                        <h3>{isArabic ? 'تحليل الوزن و BMI' : 'Weight & BMI Analysis'}</h3>
                    </div>
                    <div className="bmi-content">
                        <div className="bmi-value">
                            <span className="bmi-number">{activityInsights.backendData.weightBmi.bmi}</span>
                            <span className="bmi-category" style={{ 
                                background: activityInsights.backendData.weightBmi.bmi_category?.includes('طبيعي') || 
                                          activityInsights.backendData.weightBmi.bmi_category?.includes('Normal') ? '#10b981' : 
                                          activityInsights.backendData.weightBmi.bmi_category?.includes('زيادة') || 
                                          activityInsights.backendData.weightBmi.bmi_category?.includes('Over') ? '#f59e0b' : '#ef4444'
                            }}>
                                {activityInsights.backendData.weightBmi.bmi_category}
                            </span>
                        </div>
                        <div className="bmi-stats">
                            <div className="stat">
                                <span className="stat-label">{isArabic ? 'الوزن الحالي' : 'Current Weight'}</span>
                                <span className="stat-value">{activityInsights.backendData.weightBmi.current_weight} kg</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">{isArabic ? 'الوزن المثالي' : 'Ideal Weight'}</span>
                                <span className="stat-value">
                                    {activityInsights.backendData.weightBmi.ideal_weight_range?.min} - {activityInsights.backendData.weightBmi.ideal_weight_range?.max} kg
                                </span>
                            </div>
                        </div>
                        {activityInsights.backendData.weightBmi.weight_to_lose > 0 && (
                            <div className="weight-goal">
                                <span>🎯 {isArabic ? 'الوزن المراد خسارته' : 'Target weight to lose'}:</span>
                                <strong>{activityInsights.backendData.weightBmi.weight_to_lose} kg</strong>
                            </div>
                        )}
                        {activityInsights.backendData.weightBmi.weight_to_gain > 0 && (
                            <div className="weight-goal">
                                <span>💪 {isArabic ? 'الوزن المراد اكتسابه' : 'Target weight to gain'}:</span>
                                <strong>{activityInsights.backendData.weightBmi.weight_to_gain} kg</strong>
                            </div>
                        )}
                    </div>
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
            {activityInsights.backendData && activityInsights.backendData.recommendations && 
             activityInsights.backendData.recommendations.length > 0 && (
                <div className="recommendations-card">
                    <h3>{isArabic ? '💡 توصيات مخصصة لك' : '💡 Personalized Recommendations'}</h3>
                    <div className="recommendations-list">
                        {activityInsights.backendData.recommendations.slice(0, 4).map((rec, i) => (
                            <div key={i} className={`recommendation-item priority-${rec.priority || 'medium'}`}>
                                <div className="recommendation-header">
                                    <span className="recommendation-icon">{rec.icon || '💡'}</span>
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
                                {rec.quick_tip && (
                                    <div className="quick-tip">💡 {rec.quick_tip}</div>
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
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .analytics-container { background: #1e293b; border-color: #334155; }
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-light, #eef2f6); }
                
                .ai-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; color: white; margin-left: 0.5rem; }
                
                .health-score-card, .bmi-card, .recommendations-card { background: var(--secondary-bg, #f9fafb); border-radius: 18px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .health-score-card, .dark-mode .bmi-card, .dark-mode .recommendations-card { background: #0f172a; border-color: #334155; }
                
                .score-value-large { display: flex; align-items: baseline; gap: 0.5rem; margin: 1rem 0; }
                .score-number { font-size: 2.5rem; font-weight: 800; color: var(--primary, #6366f1); }
                .score-max { font-size: 1rem; color: var(--text-tertiary, #94a3b8); }
                .score-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; color: white; }
                .score-badge.score-excellent { background: #10b981; }
                .score-badge.score-good { background: #3b82f6; }
                .score-badge.score-fair { background: #f59e0b; }
                .score-badge.score-poor { background: #ef4444; }
                .score-badge.score-critical { background: #dc2626; }
                
                .score-components { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
                .component-item { display: flex; align-items: center; gap: 0.5rem; }
                .component-name { width: 70px; font-size: 0.7rem; font-weight: 600; }
                .component-bar { flex: 1; height: 6px; background: var(--border-light, #e2e8f0); border-radius: 3px; overflow: hidden; }
                .component-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 3px; }
                .component-score { width: 30px; font-size: 0.7rem; font-weight: 600; text-align: right; }
                
                .bmi-stats { display: flex; gap: 1rem; margin: 0.75rem 0; }
                .bmi-stats .stat { flex: 1; text-align: center; }
                .bmi-stats .stat-label { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); display: block; }
                .bmi-stats .stat-value { font-size: 0.9rem; font-weight: 700; }
                
                .weight-goal { background: var(--card-bg, #ffffff); padding: 0.5rem 0.75rem; border-radius: 10px; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
                .dark-mode .weight-goal { background: #1e293b; }
                .weight-goal span { font-size: 0.7rem; }
                .weight-goal strong { font-size: 0.9rem; color: var(--primary, #6366f1); }
                
                .recommendations-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .recommendation-item { padding: 0.75rem; border-radius: 14px; background: var(--card-bg, #ffffff); }
                .dark-mode .recommendation-item { background: #1e293b; }
                .recommendation-item.priority-high { border-left: 3px solid #ef4444; }
                .recommendation-item.priority-medium { border-left: 3px solid #f59e0b; }
                .recommendation-item.priority-low { border-left: 3px solid #10b981; }
                .recommendation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .recommendation-icon { font-size: 1.2rem; }
                .recommendation-title { font-weight: 600; font-size: 0.85rem; }
                .recommendation-description { font-size: 0.75rem; color: var(--text-secondary, #64748b); margin: 0 0 0.5rem 0; }
                .recommendation-actions { margin: 0; padding-left: 1.5rem; font-size: 0.7rem; }
                .quick-tip { font-size: 0.7rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-light, #e2e8f0); color: #f59e0b; }
                
                .global-health-card { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; padding: 1.25rem; margin-bottom: 1rem; color: white; }
                .health-score-container { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
                .health-score-circle { width: 120px; height: 120px; }
                .health-analysis { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); }
                
                .trends-card, .risks-card, .summary-card { background: var(--secondary-bg, #f8fafc); border-radius: 18px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .trends-card, .dark-mode .risks-card, .dark-mode .summary-card { background: #0f172a; border-color: #334155; }
                
                .trend-item, .risk-item { padding: 0.5rem 0; display: flex; justify-content: space-between; align-items: center; }
                .trend-item.direction-up { color: #10b981; }
                .trend-item.direction-down { color: #ef4444; }
                
                .summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center; margin-bottom: 1rem; }
                .stat-value { font-size: 1.5rem; font-weight: 800; display: block; }
                .stat-label { font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); }
                
                .progress-container { margin: 1rem 0; }
                .progress-bar-bg { background: var(--border-light, #e2e8f0); border-radius: 10px; height: 30px; overflow: hidden; }
                .progress-bar-fill { background: linear-gradient(90deg, #10b981, #f59e0b); height: 100%; border-radius: 10px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-size: 0.7rem; font-weight: bold; }
                
                .best-activity, .preferred-time { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.8rem; }
                
                .analytics-footer { margin-top: 1rem; padding-top: 1rem; text-align: center; border-top: 1px solid var(--border-light, #e2e8f0); font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                @media (max-width: 768px) {
                    .analytics-container { padding: 1rem; }
                    .summary-stats { gap: 0.5rem; }
                    .bmi-stats { flex-direction: column; gap: 0.5rem; }
                }
            `}</style>
        </div>
    );
};

export default ActivityAnalytics;