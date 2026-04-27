import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

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
        </div>
    );
};

export default ActivityAnalytics;