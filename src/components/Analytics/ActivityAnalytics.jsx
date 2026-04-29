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

    // 📉 تحليل الاتجاه
    const calculateTrends = (activities, healthHistory) => {
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

    // 🧠 تحليل العلاقات
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

    // 🚨 تحليل المخاطر
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

    // ✅ جلب جميع البيانات
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        // منع الطلبات المتكررة (مرة كل 10 ثوانٍ كحد أقصى)
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
            const [activitiesRes, healthRes, glucoseRes] = await Promise.all([
                axiosInstance.get('/activities/').catch(() => ({ data: [] })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/blood-sugar/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            let activitiesData = [];
            if (activitiesRes.data?.results) {
                activitiesData = activitiesRes.data.results;
            } else if (Array.isArray(activitiesRes.data)) {
                activitiesData = activitiesRes.data;
            }
            
            let healthRecords = [];
            if (healthRes.data?.results) {
                healthRecords = healthRes.data.results;
            } else if (Array.isArray(healthRes.data)) {
                healthRecords = healthRes.data;
            }
            
            let glucoseRecords = [];
            if (glucoseRes.data?.results) {
                glucoseRecords = glucoseRes.data.results;
            } else if (Array.isArray(glucoseRes.data)) {
                glucoseRecords = glucoseRes.data;
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
            
            const globalHealth = calculateGlobalHealthScore(activitySummary, currentHealthData);
            const trends = calculateTrends(activitiesData, []);
            const correlations = analyzeCorrelations(currentHealthData);
            const risks = analyzeRisks(currentHealthData);
            
            if (isMountedRef.current) {
                setActivityInsights({
                    summary: activitySummary,
                    globalHealth,
                    trends,
                    correlations,
                    risks,
                    healthData: currentHealthData,
                    lastUpdated: new Date().toISOString()
                });
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

    // ✅ تأثير التحديث الخارجي - مع منع التكرار
    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current && !isFetchingRef.current) {
            // ✅ منع التحديث أكثر من مرة كل 10 ثوانٍ
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
                <p>{isArabic ? '🧠 جاري التحليل...' : '🧠 Analyzing...'}</p>
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
                <button onClick={() => {
                    lastFetchTimeRef.current = 0;
                    fetchAllData();
                }} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
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
                    </small>
                </div>
            </div>
                        <style jsx>{`
 /* ===========================================
   ActivityAnalytics.css - تصميم بسيط وجميل
   متوافق مع الثيمين (فاتح/داكن)
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.activity-analytics {
    background: var(--card-bg, #ffffff);
    border-radius: 24px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    border: 1px solid var(--border-light, #eef2f6);
}

.activity-analytics.dark-mode {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* ===== الرأس ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .analytics-header {
    border-bottom-color: #334155;
}

.analytics-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary, #1f2937);
}

.dark-mode .analytics-header h2 {
    color: #f1f5f9;
}

.refresh-btn {
    background: var(--secondary-bg, #f3f4f6);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #6b7280);
}

.dark-mode .refresh-btn {
    background: #334155;
    color: #cbd5e1;
}

.refresh-btn:hover {
    transform: rotate(180deg);
    background: var(--primary, #6366f1);
    color: white;
}

/* ===== حاوية التحليلات ===== */
.insights-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* ===== بطاقة الحالة الصحية ===== */
.global-health-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 1.25rem;
    color: white;
}

.dark-mode .global-health-card {
    background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
}

.global-health-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 500;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.health-score-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
}

.health-score-circle {
    position: relative;
    width: 100px;
    height: 100px;
}

.health-score-circle svg {
    width: 100%;
    height: 100%;
}

.health-score-circle text {
    fill: white;
    font-size: 20px;
    font-weight: bold;
}

.status-badge {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
}

.health-analysis {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0.75rem;
}

.positives-list,
.warnings-list {
    margin-bottom: 0.75rem;
}

.positives-list strong,
.warnings-list strong {
    font-size: 0.7rem;
    display: block;
    margin-bottom: 0.5rem;
    opacity: 0.8;
}

.positive-item,
.warning-item {
    font-size: 0.75rem;
    padding: 0.35rem 0.5rem;
    border-radius: 10px;
    margin-bottom: 0.35rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.positive-item {
    background: rgba(255, 255, 255, 0.1);
}

.warning-item span,
.positive-item span {
    font-family: monospace;
    font-size: 0.7rem;
    opacity: 0.8;
}

.warning-item.severity-danger {
    background: rgba(239, 68, 68, 0.3);
}

.warning-item.severity-warning {
    background: rgba(245, 158, 11, 0.3);
}

/* ===== بطاقة الاتجاهات ===== */
.trends-card,
.correlations-card,
.risks-card,
.summary-card {
    background: var(--secondary-bg, #f9fafb);
    border-radius: 18px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #eef2f6);
    transition: all 0.2s ease;
}

.dark-mode .trends-card,
.dark-mode .correlations-card,
.dark-mode .risks-card,
.dark-mode .summary-card {
    background: #0f172a;
    border-color: #334155;
}

.trends-card h3,
.correlations-card h3,
.risks-card h3,
.summary-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .trends-card h3,
.dark-mode .correlations-card h3,
.dark-mode .risks-card h3,
.dark-mode .summary-card h3 {
    color: #f1f5f9;
}

/* ===== قائمة الاتجاهات ===== */
.trends-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.trend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 12px;
    background: var(--card-bg, #ffffff);
}

.dark-mode .trend-item {
    background: #1e293b;
}

.trend-item.direction-up {
    border-left: 3px solid #ef4444;
}

.trend-item.direction-down {
    border-left: 3px solid #10b981;
}

[dir="rtl"] .trend-item.direction-up {
    border-left: none;
    border-right: 3px solid #ef4444;
}

[dir="rtl"] .trend-item.direction-down {
    border-left: none;
    border-right: 3px solid #10b981;
}

.trend-message {
    font-size: 0.85rem;
    color: var(--text-primary, #1f2937);
}

.trend-change {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
}

.trend-item.direction-up .trend-change {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.trend-item.direction-down .trend-change {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

/* ===== بطاقة الملاحظات الذكية ===== */
.correlations-list,
.risks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.correlation-item,
.risk-item {
    padding: 0.75rem;
    border-radius: 14px;
    background: var(--card-bg, #ffffff);
}

.dark-mode .correlation-item,
.dark-mode .risk-item {
    background: #1e293b;
}

.correlation-item.severity-danger,
.risk-item.severity-high {
    border-left: 3px solid #dc2626;
}

.correlation-item.severity-warning,
.risk-item.severity-medium {
    border-left: 3px solid #f59e0b;
}

[dir="rtl"] .correlation-item,
[dir="rtl"] .risk-item {
    border-left: none;
}

[dir="rtl"] .correlation-item.severity-danger,
[dir="rtl"] .risk-item.severity-high {
    border-right: 3px solid #dc2626;
}

[dir="rtl"] .correlation-item.severity-warning,
[dir="rtl"] .risk-item.severity-medium {
    border-right: 3px solid #f59e0b;
}

.correlation-message,
.risk-message {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0 0 0.35rem 0;
    color: var(--text-primary, #1f2937);
}

.correlation-advice,
.risk-details,
.risk-action {
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
    color: var(--text-secondary, #6b7280);
}

.risk-action {
    color: #ef4444;
    font-weight: 500;
}

.risk-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
    margin-left: 0.5rem;
}

.risk-badge.severity-high {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.risk-badge.severity-medium {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

/* ===== بطاقة الملخص ===== */
.summary-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}

.summary-stats .stat {
    text-align: center;
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
}

.dark-mode .summary-stats .stat {
    background: #1e293b;
}

.summary-stats .stat-value {
    display: block;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--primary, #6366f1);
}

.summary-stats .stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #6b7280);
}

/* ===== شريط التقدم ===== */
.progress-container {
    margin: 1rem 0;
}

.progress-bar-bg {
    background: var(--border-light, #eef2f6);
    border-radius: 10px;
    height: 32px;
    overflow: hidden;
    position: relative;
}

.dark-mode .progress-bar-bg {
    background: #334155;
}

.progress-bar-fill {
    background: linear-gradient(90deg, #667eea, #764ba2);
    height: 100%;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.75rem;
    transition: width 0.5s ease;
}

.progress-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
}

/* ===== أفضل نشاط ووقت مفضل ===== */
.best-activity,
.preferred-time {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem;
    background: var(--card-bg, #ffffff);
    border-radius: 12px;
    margin-top: 0.75rem;
}

.dark-mode .best-activity,
.dark-mode .preferred-time {
    background: #1e293b;
}

.best-icon,
.time-icon {
    font-size: 1.2rem;
}

.best-text,
.time-text {
    font-size: 0.8rem;
    color: var(--text-primary, #1f2937);
}

/* ===== التذييل ===== */
.analytics-footer {
    text-align: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-light, #eef2f6);
    margin-top: 0.5rem;
}

.dark-mode .analytics-footer {
    border-top-color: #334155;
}

.analytics-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #9ca3af);
}

/* ===== حالات التحميل والخطأ وعدم وجود بيانات ===== */
.analytics-loading,
.analytics-error,
.no-data {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .analytics-loading,
.dark-mode .analytics-error,
.dark-mode .no-data {
    background: #1e293b;
    border-color: #334155;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #eef2f6);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.no-data-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    opacity: 0.5;
}

.no-data p {
    color: var(--text-primary, #1f2937);
    margin: 0.5rem 0;
}

.hint {
    font-size: 0.75rem;
    color: var(--text-secondary, #6b7280);
}

.add-data-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
}

.add-data-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.retry-btn {
    margin-top: 0.75rem;
    padding: 0.4rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.75rem;
}

/* ===== استجابة الجوال ===== */
@media (max-width: 768px) {
    .activity-analytics {
        padding: 1rem;
    }
    
    .summary-stats {
        gap: 0.5rem;
    }
    
    .summary-stats .stat {
        padding: 0.5rem;
    }
    
    .summary-stats .stat-value {
        font-size: 1.1rem;
    }
    
    .health-score-container {
        justify-content: center;
    }
    
    .positive-item,
    .warning-item {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .trend-item {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .risk-header {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 480px) {
    .summary-stats {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .health-score-circle {
        width: 80px;
        height: 80px;
    }
    
    .analytics-header h2 {
        font-size: 1rem;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .progress-bar-fill {
    justify-content: flex-start;
    padding-left: 0.75rem;
    padding-right: 0;
}

[dir="rtl"] .risk-badge {
    margin-left: 0;
    margin-right: 0.5rem;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover {
        transform: none;
    }
    
    .progress-bar-fill {
        transition: none;
    }
    
    .spinner {
        animation: none;
    }
}
            `}</style>
        </div>
    );
};

export default ActivityAnalytics;