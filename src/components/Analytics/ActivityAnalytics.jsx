// src/components/Analytics/ActivityAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

const ActivityAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [activityInsights, setActivityInsights] = useState(null);
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
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

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
                walking: '🚶 المشي', running: '🏃 الجري', yoga: '🧘 يوجا', 
                cardio: '❤️ تمارين قلب', weightlifting: '🏋️ رفع أثقال',
                cycling: '🚴 ركوب دراجة', swimming: '🏊 سباحة'
            };
            return activityNames[best[0]] || best[0];
        }
        return null;
    };

    // 🧠 تحليل الحالة الشاملة
    const calculateGlobalHealthScore = (activityData, healthData) => {
        let score = 100;
        const warnings = [];
        const positives = [];

        // تحليل السكر
        if (healthData.bloodGlucose) {
            const glucose = healthData.bloodGlucose;
            if (glucose < 70) {
                score -= 30;
                warnings.push({ type: 'glucose', severity: 'danger', message: '⚠️ سكر منخفض', value: `${glucose} mg/dL` });
            } else if (glucose > 180) {
                score -= 20;
                warnings.push({ type: 'glucose', severity: 'warning', message: '⚠️ سكر مرتفع', value: `${glucose} mg/dL` });
            } else {
                positives.push({ type: 'glucose', message: '✅ سكر طبيعي', value: `${glucose} mg/dL` });
            }
        }

        // تحليل النبض
        if (healthData.heartRate) {
            const hr = healthData.heartRate;
            if (hr > 140) {
                score -= 35;
                warnings.push({ type: 'heartRate', severity: 'danger', message: '🚨 نبض خطير جداً', value: `${hr} BPM` });
            } else if (hr > 100) {
                score -= 20;
                warnings.push({ type: 'heartRate', severity: 'warning', message: '⚠️ نبض مرتفع', value: `${hr} BPM` });
            } else if (hr < 60) {
                score -= 10;
                warnings.push({ type: 'heartRate', severity: 'warning', message: '⚠️ نبض منخفض', value: `${hr} BPM` });
            } else {
                positives.push({ type: 'heartRate', message: '✅ نبض طبيعي', value: `${hr} BPM` });
            }
        }

        // تحليل الأكسجين
        if (healthData.oxygenLevel) {
            const o2 = healthData.oxygenLevel;
            if (o2 < 90) {
                score -= 30;
                warnings.push({ type: 'oxygen', severity: 'danger', message: '⚠️ نقص أكسجين خطير', value: `${o2}%` });
            } else if (o2 < 95) {
                score -= 15;
                warnings.push({ type: 'oxygen', severity: 'warning', message: '⚠️ أكسجين منخفض', value: `${o2}%` });
            } else {
                positives.push({ type: 'oxygen', message: '✅ أكسجين ممتاز', value: `${o2}%` });
            }
        }

        // تحليل ضغط الدم
        if (healthData.bloodPressure) {
            const { systolic, diastolic } = healthData.bloodPressure;
            if (systolic > 140 || diastolic > 90) {
                score -= 20;
                warnings.push({ type: 'bp', severity: 'warning', message: '⚠️ ضغط مرتفع', value: `${systolic} / ${diastolic} mmHg` });
            } else if (systolic < 90 || diastolic < 60) {
                score -= 15;
                warnings.push({ type: 'bp', severity: 'warning', message: '⚠️ ضغط منخفض', value: `${systolic} / ${diastolic} mmHg` });
            } else {
                positives.push({ type: 'bp', message: '✅ ضغط طبيعي', value: `${systolic} / ${diastolic} mmHg` });
            }
        }

        // تحليل النشاط
        const totalMinutes = activityData.totalMinutes || 0;
        if (totalMinutes === 0) {
            score -= 25;
            warnings.push({ type: 'activity', severity: 'warning', message: '⚠️ لا يوجد نشاط', value: '0 دقيقة' });
        } else if (totalMinutes < 150) {
            score -= 15;
            warnings.push({ type: 'activity', severity: 'info', message: '⚠️ نشاط أقل من الموصى به', value: `${totalMinutes} / 150 دقيقة` });
        } else {
            positives.push({ type: 'activity', message: '✅ نشاط ممتاز', value: `${totalMinutes} دقيقة` });
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

    // 📉 تحليل الاتجاه (Trend Analysis)
    const calculateTrends = (activities, healthHistory) => {
        const trends = [];
        
        // تحليل اتجاه النشاط
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
                trends.push({ type: 'activity', direction: 'up', message: '📈 النشاط في ارتفاع', change: `${Math.round((lastWeek - previousWeek) / previousWeek * 100)}% زيادة` });
            } else if (lastWeek < previousWeek) {
                trends.push({ type: 'activity', direction: 'down', message: '📉 النشاط في انخفاض', change: `${Math.round((previousWeek - lastWeek) / previousWeek * 100)}% نقصان` });
            }
        }

        return trends;
    };

    // 🧠 تحليل العلاقات (Correlation)
    const analyzeCorrelations = (healthData) => {
        const correlations = [];
        
        // ربط السكر مع النبض
        if (healthData.bloodGlucose && healthData.heartRate) {
            if (healthData.bloodGlucose < 70 && healthData.heartRate > 100) {
                correlations.push({
                    type: 'glucose_heart_rate',
                    severity: 'danger',
                    message: '🚨 ارتباط خطير: انخفاض السكر مع ارتفاع النبض',
                    advice: 'علامات إجهاد حاد، يحتاج تدخل فوري'
                });
            } else if (healthData.bloodGlucose < 70 && healthData.heartRate > 90) {
                correlations.push({
                    type: 'glucose_heart_rate',
                    severity: 'warning',
                    message: '⚠️ ارتباط: انخفاض السكر مصحوب بارتفاع النبض',
                    advice: 'يُنصح بأخذ قسط من الراحة وتناول سكر سريع'
                });
            }
        }
        
        // ربط النشاط مع النوم
        if (healthData.sleepData && healthData.sleepData.hours < 6 && healthData.heartRate > 90) {
            correlations.push({
                type: 'sleep_heart_rate',
                severity: 'warning',
                message: '😴 قلة النوم تؤثر على نبضات قلبك',
                advice: 'النوم أقل من 6 ساعات يزيد من إجهاد القلب'
            });
        }
        
        return correlations;
    };

    // 🚨 تحليل المخاطر (Risk Prediction)
    const analyzeRisks = (healthData) => {
        const risks = [];
        
        if (healthData.heartRate && healthData.heartRate > 140) {
            risks.push({
                type: 'heart',
                severity: 'high',
                message: '🚨 خطر محتمل على القلب',
                details: 'ارتفاع شديد في النبض قد يشير إلى إجهاد قلبي أو عدم انتظام ضربات القلب',
                action: 'يُنصح باستشارة طبيب فوراً'
            });
        } else if (healthData.heartRate && healthData.heartRate > 100 && healthData.bloodGlucose && healthData.bloodGlucose < 70) {
            risks.push({
                type: 'combined',
                severity: 'high',
                message: '🚨 خطر مركب: إجهاد حاد',
                details: 'انخفاض السكر + ارتفاع النبض',
                action: 'تناول سكر سريع واسترح فوراً'
            });
        } else if (healthData.heartRate && healthData.heartRate > 100) {
            risks.push({
                type: 'tachycardia',
                severity: 'medium',
                message: '⚠️ خطر محتمل: تسارع نبضات القلب',
                details: 'استمرار ارتفاع النبض قد يدل على إجهاد أو مشكلة قلبية',
                action: 'راقب نبضك، تجنب المنبهات، استشر طبيباً إذا استمر'
            });
        }
        
        if (healthData.oxygenLevel && healthData.oxygenLevel < 90) {
            risks.push({
                type: 'oxygen',
                severity: 'high',
                message: '🚨 نقص أكسجة خطر',
                details: 'نسبة الأكسجين أقل من 90% تحتاج تدخل طبي',
                action: 'استشر طبيباً فوراً'
            });
        }
        
        return risks;
    };

    // 💡 توصيات ذكية مخصصة
    const generateSmartRecommendations = (globalHealth, healthData, activityData) => {
        const recommendations = [];
        
        // توصيات فورية بناءً على الحالة الحرجة
        if (globalHealth.score < 50) {
            // حالة خطيرة - توصيات فورية
            if (healthData.bloodGlucose && healthData.bloodGlucose < 70) {
                recommendations.push({
                    timing: 'immediate',
                    priority: 'critical',
                    icon: '🍬',
                    title: 'توصية عاجلة - انخفاض السكر',
                    advice: 'تناول مصدر سكر سريع فوراً',
                    details: ['تمر (3-4 حبات)', 'عصير فواكه طبيعي', 'ملعقة عسل'],
                    warning: '⚠️ لا تمارس أي نشاط رياضي حتى يعود السكر إلى مستواه الطبيعي'
                });
            }
            
            if (healthData.heartRate && healthData.heartRate > 140) {
                recommendations.push({
                    timing: 'immediate',
                    priority: 'critical',
                    icon: '❤️',
                    title: 'توصية عاجلة - ارتفاع خطير بالنبض',
                    advice: 'توقف عن أي نشاط واسترح فوراً',
                    details: ['اجلس في مكان هادئ', 'اشرب ماء ببطء', 'تنفس بعمق'],
                    warning: '🚨 إذا استمر الارتفاع، استشر طبيباً فوراً'
                });
            }
        }
        
        // توصيات فورية - حالة متوسطة
        else if (globalHealth.score < 75) {
            if (healthData.bloodGlucose && healthData.bloodGlucose < 70) {
                recommendations.push({
                    timing: 'immediate',
                    priority: 'high',
                    icon: '🍎',
                    title: 'انخفاض السكر',
                    advice: 'تناول وجبة خفيفة تحتوي على سكر',
                    details: ['ثمرة فاكهة', 'قطعة تمر', 'كوب حليب'],
                    warning: 'تجنب النشاط المكثف حتى تتحسن حالتك'
                });
            }
            
            if (activityData.totalMinutes === 0) {
                recommendations.push({
                    timing: 'today',
                    priority: 'medium',
                    icon: '🚶',
                    title: 'ابدأ بحركة بسيطة',
                    advice: 'جرب المشي الخفيف لمدة 10 دقائق فقط',
                    details: ['اختر وقتاً مناسباً', 'ارتد ملابس مريحة', 'استمع لموسيقى تحبها'],
                    warning: healthData.bloodGlucose && healthData.bloodGlucose < 80 ? '⚠️ تأكد من تناول وجبة خفيفة قبل المشي' : null
                });
            }
        }
        
        // توصيات مبنية على التاريخ والنمط
        if (activityData.bestActivity) {
            recommendations.push({
                timing: 'general',
                priority: 'low',
                icon: getBestActivityIcon(activityData.bestActivity),
                title: 'استمر على نشاطك المفضل',
                advice: `${activityData.bestActivity} هو نشاطك المفضل`,
                details: [`حاول ممارسته ${activityData.activitiesCount > 5 ? '3-4 مرات' : 'مرتين'} في الأسبوع`],
                basedOn: 'بناءً على تاريخ نشاطاتك السابقة'
            });
        }
        
        // توصيات مبنية على الوقت المفضل
        const preferredTime = detectPreferredActivityTime(activityData.activities);
        if (preferredTime) {
            recommendations.push({
                timing: 'general',
                priority: 'low',
                icon: '⏰',
                title: 'أفضل وقت لممارسة النشاط',
                advice: `عادةً تمارس نشاطك ${preferredTime}`,
                details: ['هذا الوقت مناسب لطبيعة جسمك', 'حاول الالتزام به يومياً'],
                basedOn: 'تحليل أوقات نشاطك السابقة'
            });
        }
        
        return recommendations;
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
        if (max === morning) return 'في الصباح (5-12 صباحاً)';
        if (max === afternoon) return 'في الظهيرة (12-5 مساءً)';
        if (max === evening) return 'في المساء (5-9 مساءً)';
        if (max === night) return 'في الليل (9-5 صباحاً)';
        return null;
    };
    
    // الحصول على أيقونة النشاط المفضل
    const getBestActivityIcon = (activity) => {
        if (!activity) return '🏃';
        if (activity.includes('مشي')) return '🚶';
        if (activity.includes('جري')) return '🏃';
        if (activity.includes('يوجا')) return '🧘';
        if (activity.includes('قلب')) return '❤️';
        if (activity.includes('أثقال')) return '🏋️';
        return '🏅';
    };

    // جلب جميع البيانات
    const fetchAllData = async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            // جلب الأنشطة
            const activitiesRes = await axiosInstance.get('/activities/').catch(() => ({ data: [] }));
            let activitiesData = [];
            if (activitiesRes.data?.results) {
                activitiesData = activitiesRes.data.results;
            } else if (Array.isArray(activitiesRes.data)) {
                activitiesData = activitiesRes.data;
            }
            
            // جلب آخر قياسات صحية
            const healthRes = await axiosInstance.get('/health_status/').catch(() => ({ data: [] }));
            let healthRecords = [];
            if (healthRes.data?.results) {
                healthRecords = healthRes.data.results;
            } else if (Array.isArray(healthRes.data)) {
                healthRecords = healthRes.data;
            }
            
            // جلب آخر قياس سكر
            const glucoseRes = await axiosInstance.get('/blood-sugar/').catch(() => ({ data: [] }));
            let glucoseRecords = [];
            if (glucoseRes.data?.results) {
                glucoseRecords = glucoseRes.data.results;
            } else if (Array.isArray(glucoseRes.data)) {
                glucoseRecords = glucoseRes.data;
            }
            
            if (!isMountedRef.current) return;
            
            // تجميع البيانات الصحية
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
            
            // حساب إحصائيات النشاط
            const activityMinutes = activitiesData
                .map(a => a.duration_minutes || 0)
                .filter(m => m > 0 && m <= 180);
            
            const totalActivity = activityMinutes.reduce((a, b) => a + b, 0);
            const activitiesCount = activitiesData.length;
            const totalCalories = activitiesData.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
            const weekProgress = calculateWeekProgress(activitiesData);
            const bestActivity = findBestActivity(activitiesData);
            
            const activitySummary = {
                totalMinutes: totalActivity,
                totalCalories: totalCalories,
                activitiesCount: activitiesCount,
                weekProgress: weekProgress,
                bestActivity: bestActivity,
                activities: activitiesData
            };
            
            // 🧠 التحليلات الذكية
            const globalHealth = calculateGlobalHealthScore(activitySummary, currentHealthData);
            const trends = calculateTrends(activitiesData, []);
            const correlations = analyzeCorrelations(currentHealthData);
            const risks = analyzeRisks(currentHealthData);
            const smartRecommendations = generateSmartRecommendations(globalHealth, currentHealthData, activitySummary);
            
            setActivityInsights({
                summary: activitySummary,
                globalHealth,
                trends,
                correlations,
                risks,
                recommendations: smartRecommendations,
                healthData: currentHealthData,
                lastUpdated: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('❌ Error fetching analytics:', err);
            if (isMountedRef.current) {
                setError('حدث خطأ في تحميل التحليلات');
                setActivityInsights(null);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    };

    // الحصول على لون الحالة الصحية
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
            case 'excellent': return 'ممتازة';
            case 'good': return 'جيدة';
            case 'fair': return 'متوسطة';
            case 'poor': return 'سيئة';
            case 'critical': return 'حرجة';
            default: return 'غير معروفة';
        }
    };

    if (loading) {
        return (
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>🧠 جاري التحليل الذكي...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>⚠️ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 إعادة المحاولة
                </button>
            </div>
        );
    }

    if (!activityInsights) {
        return (
            <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-header">
                    <h2>🧠 تحليلات النشاط الذكية</h2>
                    <button onClick={fetchAllData} className="refresh-btn" title="تحديث">
                        🔄
                    </button>
                </div>
                <div className="no-data">
                    <p>📊 لا توجد بيانات كافية للتحليل</p>
                    <p className="hint">قم بتسجيل أنشطتك وقياساتك الصحية للحصول على تحليلات مخصصة</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container activity-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>🧠 تحليلات النشاط الذكية</h2>
                <button onClick={fetchAllData} className="refresh-btn" title="تحديث">
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* 🧠 الحالة الصحية الشاملة */}
                <div className="global-health-card">
                    <h3>🧠 الحالة الصحية اليوم</h3>
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
                    
                    {/* التحليلات الإيجابية والتحذيرات */}
                    <div className="health-analysis">
                        {activityInsights.globalHealth.positives.length > 0 && (
                            <div className="positives-list">
                                <strong>✅ الإيجابيات</strong>
                                {activityInsights.globalHealth.positives.map((p, i) => (
                                    <div key={i} className="positive-item">
                                        {p.message}: <span>{p.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {activityInsights.globalHealth.warnings.length > 0 && (
                            <div className="warnings-list">
                                <strong>⚠️ يحتاج انتباه</strong>
                                {activityInsights.globalHealth.warnings.map((w, i) => (
                                    <div key={i} className={`warning-item severity-${w.severity}`}>
                                        {w.message}: <span>{w.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 📉 تحليل الاتجاهات */}
                {activityInsights.trends && activityInsights.trends.length > 0 && (
                    <div className="trends-card">
                        <h3>📉 تحليل الاتجاه</h3>
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

                {/* 🧠 ملاحظات ذكية - تحليل العلاقات */}
                {activityInsights.correlations && activityInsights.correlations.length > 0 && (
                    <div className="correlations-card">
                        <h3>🧠 ملاحظات ذكية</h3>
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
                        <h3>🚨 تحليل المخاطر</h3>
                        <div className="risks-list">
                            {activityInsights.risks.map((risk, i) => (
                                <div key={i} className={`risk-item severity-${risk.severity}`}>
                                    <div className="risk-header">
                                        <span className="risk-message">{risk.message}</span>
                                        <span className={`risk-badge severity-${risk.severity}`}>
                                            {risk.severity === 'high' ? 'خطر مرتفع' : risk.severity === 'medium' ? 'خطر متوسط' : 'تنبيه'}
                                        </span>
                                    </div>
                                    <p className="risk-details">{risk.details}</p>
                                    <p className="risk-action">🚨 {risk.action}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 💡 التوصيات الذكية */}
                {activityInsights.recommendations && activityInsights.recommendations.length > 0 && (
                    <div className="recommendations-card">
                        <h3>💡 توصيات ذكية</h3>
                        <div className="recommendations-list">
                            {activityInsights.recommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon}</span>
                                        <span className="rec-title">{rec.title}</span>
                                        <span className={`rec-timing timing-${rec.timing}`}>
                                            {rec.timing === 'immediate' ? '⚠️ فوراً' : rec.timing === 'today' ? '📅 اليوم' : '💡 عام'}
                                        </span>
                                    </div>
                                    <p className="rec-advice">{rec.advice}</p>
                                    {rec.details && (
                                        <ul className="rec-details">
                                            {rec.details.map((detail, i) => (
                                                <li key={i}>✓ {detail}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {rec.warning && <p className="rec-warning">🚨 {rec.warning}</p>}
                                    {rec.basedOn && <p className="rec-based">📌 {rec.basedOn}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* بطاقة الملخص الأساسي */}
                <div className="summary-card">
                    <h3>📊 ملخص النشاط</h3>
                    <div className="summary-stats">
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalMinutes}</span>
                            <span className="stat-label">إجمالي الدقائق</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.totalCalories}</span>
                            <span className="stat-label">إجمالي السعرات</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{activityInsights.summary.activitiesCount}</span>
                            <span className="stat-label">عدد الأنشطة</span>
                        </div>
                    </div>
                    
                    {/* شريط التقدم الأسبوعي */}
                    <div className="progress-container">
                        <div className="progress-bar-bg">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${activityInsights.summary.weekProgress}%` }}
                            >
                                <span className="progress-text">
                                    {activityInsights.summary.weekProgress}% من هدف الأسبوع
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* النشاط المفضل */}
                    {activityInsights.summary.bestActivity && (
                        <div className="best-activity">
                            <span className="best-icon">{getBestActivityIcon(activityInsights.summary.bestActivity)}</span>
                            <span className="best-text">
                                نشاطك المفضل: {activityInsights.summary.bestActivity}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="analytics-footer">
                    <small>
                        آخر تحديث: {new Date(activityInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ActivityAnalytics;