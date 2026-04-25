// src/components/MoodTracker.jsx
'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import MoodAnalytics from './Analytics/MoodAnalytics';
import '../index.css';

// ==================== دوال مساعدة ====================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// ✅ أيقونات المزاج
const getMoodIcon = (mood) => {
    const icons = {
        'Excellent': '😊',
        'Good': '🙂',
        'Neutral': '😐',
        'Stressed': '😫',
        'Anxious': '😰',
        'Sad': '😢'
    };
    return icons[mood] || '😐';
};

// ✅ ألوان المزاج
const getMoodColor = (mood) => {
    const colors = {
        'Excellent': '#10b981',
        'Good': '#3b82f6',
        'Neutral': '#f59e0b',
        'Stressed': '#f97316',
        'Anxious': '#ef4444',
        'Sad': '#8b5cf6'
    };
    return colors[mood] || '#6b7280';
};

// ✅ تدرجات المزاج
const getMoodGradient = (mood) => {
    const gradients = {
        'Excellent': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'Good': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
        'Neutral': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'Stressed': 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
        'Anxious': 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        'Sad': 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    };
    return gradients[mood] || 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
};

// ✅ نص المزاج
const getMoodText = (mood, isArabic) => {
    const mapAr = {
        'Excellent': 'ممتاز',
        'Good': 'جيد',
        'Neutral': 'محايد',
        'Stressed': 'مرهق',
        'Anxious': 'قلق',
        'Sad': 'حزين'
    };
    const mapEn = {
        'Excellent': 'Excellent',
        'Good': 'Good',
        'Neutral': 'Neutral',
        'Stressed': 'Stressed',
        'Anxious': 'Anxious',
        'Sad': 'Sad'
    };
    return isArabic ? (mapAr[mood] || mood) : (mapEn[mood] || mood);
};

// ✅ اقتراح نشاط حسب المزاج
const getActivitySuggestion = (mood, isArabic) => {
    const suggestions = {
        'Excellent': {
            icon: '🚀',
            titleAr: 'وقت مثالي للإنتاجية',
            titleEn: 'Perfect time for productivity',
            adviceAr: 'استغل طاقتك الإيجابية في إنجاز المهام المهمة',
            adviceEn: 'Use your positive energy to accomplish important tasks'
        },
        'Good': {
            icon: '💪',
            titleAr: 'طاقة إيجابية',
            titleEn: 'Positive energy',
            adviceAr: 'مارس نشاطاً تحبه أو تواصل مع الأصدقاء',
            adviceEn: 'Do an activity you love or connect with friends'
        },
        'Neutral': {
            icon: '🎧',
            titleAr: 'فرصة للتحسين',
            titleEn: 'Opportunity for improvement',
            adviceAr: 'استمع لموسيقى هادئة أو اخرج في نزهة قصيرة',
            adviceEn: 'Listen to calm music or take a short walk'
        },
        'Stressed': {
            icon: '🧘',
            titleAr: 'تحتاج إلى راحة',
            titleEn: 'Need rest',
            adviceAr: 'جرب تمارين التنفس العميق أو خذ استراحة قصيرة',
            adviceEn: 'Try deep breathing exercises or take a short break'
        },
        'Anxious': {
            icon: '🌿',
            titleAr: 'اهتمام بالصحة النفسية',
            titleEn: 'Mental health care',
            adviceAr: 'تأمل لمدة 5 دقائق أو تحدث مع شخص تثق به',
            adviceEn: 'Meditate for 5 minutes or talk to someone you trust'
        },
        'Sad': {
            icon: '💬',
            titleAr: 'دعم عاطفي',
            titleEn: 'Emotional support',
            adviceAr: 'اكتب مشاعرك أو شاهد شيئاً يسعدك',
            adviceEn: 'Write your feelings or watch something that makes you happy'
        }
    };
    const suggestion = suggestions[mood] || suggestions['Neutral'];
    return {
        icon: suggestion.icon,
        title: isArabic ? suggestion.titleAr : suggestion.titleEn,
        advice: isArabic ? suggestion.adviceAr : suggestion.adviceEn
    };
};

// ✅ كشف خطر الاكتئاب
const detectDepressionRisk = (moodData, isArabic) => {
    if (moodData.length < 5) return null;
    
    const badMoods = ['Stressed', 'Anxious', 'Sad'];
    let consecutiveBadDays = 0;
    let lastBadMood = null;
    let trends = [];
    
    const sortedData = [...moodData].sort((a, b) => 
        new Date(a.entry_time) - new Date(b.entry_time)
    );
    
    // تحليل الاتجاه العام
    for (let i = 0; i < sortedData.length; i++) {
        if (badMoods.includes(sortedData[i].mood)) {
            trends.push('bad');
        } else {
            trends.push('good');
        }
    }
    
    // حساب الأيام المتتالية السيئة
    for (let i = sortedData.length - 1; i >= 0; i--) {
        if (badMoods.includes(sortedData[i].mood)) {
            consecutiveBadDays++;
            lastBadMood = sortedData[i].mood;
        } else {
            break;
        }
    }
    
    // حساب النسبة المئوية للأيام السيئة في آخر 7 أيام
    const last7Days = sortedData.slice(-7);
    const badDaysInLast7 = last7Days.filter(day => badMoods.includes(day.mood)).length;
    const badPercentage = (badDaysInLast7 / last7Days.length) * 100;
    
    if (consecutiveBadDays >= 7 || (badPercentage >= 70 && last7Days.length >= 7)) {
        return {
            risk: 'critical',
            level: 'danger',
            days: consecutiveBadDays,
            percentage: Math.round(badPercentage),
            message: isArabic ? '⚠️ حالة حرجة - انخفاض مستمر في المزاج' : '⚠️ Critical - Continuous mood decline',
            suggestion: isArabic ? 'نوصي بالتواصل مع مختص نفسي للحصول على الدعم المناسب' : 'We recommend consulting a mental health professional',
            mood: lastBadMood,
            action: 'consult'
        };
    } else if (consecutiveBadDays >= 5) {
        return {
            risk: 'high',
            level: 'warning',
            days: consecutiveBadDays,
            percentage: Math.round(badPercentage),
            message: isArabic ? '⚠️ خطر مرتفع - مزاج متدنٍ مستمر' : '⚠️ High risk - Persistent low mood',
            suggestion: isArabic ? 'تحدث مع شخص تثق به أو مارس أنشطة تحبها' : 'Talk to someone you trust or do activities you enjoy',
            mood: lastBadMood,
            action: 'talk'
        };
    } else if (consecutiveBadDays >= 3) {
        return {
            risk: 'moderate',
            level: 'caution',
            days: consecutiveBadDays,
            percentage: Math.round(badPercentage),
            message: isArabic ? '⚠️ تنبيه - مزاج منخفض لعدة أيام' : '⚠️ Alert - Low mood for several days',
            suggestion: isArabic ? 'حاول تغيير روتينك اليومي وممارسة الرياضة' : 'Try changing your daily routine and exercising',
            mood: lastBadMood,
            action: 'self_care'
        };
    }
    
    return null;
};

// ✅ تحليل العلاقة بين المزاج والنوم
const analyzeSleepMoodCorrelation = (moodData, sleepData, isArabic) => {
    if (moodData.length < 5 || sleepData.length < 5) return null;
    
    const lowSleepDays = sleepData
        .filter(sleep => sleep.duration_hours < 6)
        .map(sleep => new Date(sleep.sleep_start || sleep.start_time).toDateString());
    
    const badMoodDays = moodData
        .filter(mood => ['Stressed', 'Anxious', 'Sad'].includes(mood.mood))
        .map(mood => new Date(mood.entry_time).toDateString());
    
    const overlap = lowSleepDays.filter(day => badMoodDays.includes(day));
    const correlationStrength = lowSleepDays.length > 0 ? (overlap.length / lowSleepDays.length) * 100 : 0;
    
    if (overlap.length >= 3 && correlationStrength > 50) {
        return {
            hasCorrelation: true,
            strength: correlationStrength,
            message: isArabic ? 'نلاحظ علاقة قوية بين قلة النوم وسوء المزاج' : 'We notice a strong correlation between lack of sleep and low mood',
            details: isArabic ? `في ${overlap.length} من ${lowSleepDays.length} يوم` : `in ${overlap.length} of ${lowSleepDays.length} days`,
            suggestion: isArabic ? '🥱 حاول النوم 7-8 ساعات لتحسين مزاجك بنسبة تصل إلى 40%' : '🥱 Try to sleep 7-8 hours to improve your mood by up to 40%'
        };
    } else if (overlap.length >= 3) {
        return {
            hasCorrelation: true,
            strength: correlationStrength,
            message: isArabic ? 'هناك ارتباط بين النوم والمزاج' : 'There is a correlation between sleep and mood',
            details: isArabic ? `في ${overlap.length} من ${lowSleepDays.length} يوم` : `in ${overlap.length} of ${lowSleepDays.length} days`,
            suggestion: isArabic ? 'حافظ على ساعات نوم منتظمة لتحسين صحتك النفسية' : 'Maintain regular sleep hours to improve your mental health'
        };
    }
    
    return null;
};

function MoodTracker({ isAuthReady }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const intervalRef = useRef(null);
    
    const [moodData, setMoodData] = useState([]);
    const [sleepData, setSleepData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [todayMood, setTodayMood] = useState(null);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [newMood, setNewMood] = useState({
        mood: 'Good',
        factors: '',
        text_entry: ''
    });
    const [reducedMotion, setReducedMotion] = useState(false);

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

    // ✅ التحقق من تفضيلات الحركة المخفضة
    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    // ✅ جلب بيانات المزاج
    const fetchMoodData = useCallback(async () => {
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const [moodResponse, sleepResponse] = await Promise.all([
                axiosInstance.get('/mood-logs/'),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            let moodDataArray = [];
            if (moodResponse.data?.results) {
                moodDataArray = moodResponse.data.results;
            } else if (Array.isArray(moodResponse.data)) {
                moodDataArray = moodResponse.data;
            }
            
            let sleepDataArray = [];
            if (sleepResponse.data?.results) {
                sleepDataArray = sleepResponse.data.results;
            } else if (Array.isArray(sleepResponse.data)) {
                sleepDataArray = sleepResponse.data;
            }
            
            console.log('😊 Mood data loaded:', moodDataArray.length);
            
            setMoodData(moodDataArray);
            setSleepData(sleepDataArray);
            setLastUpdate(new Date());
            
            const today = new Date().toDateString();
            const todayEntry = moodDataArray.find(entry => 
                new Date(entry.entry_time).toDateString() === today
            );
            setTodayMood(todayEntry || null);
            
        } catch (error) {
            console.error('Error fetching mood data:', error);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في جلب بيانات المزاج' : '❌ Error fetching mood data');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic]);

    useEffect(() => {
        fetchMoodData();
    }, [fetchMoodData]);

    // ✅ التحديث التلقائي
    useEffect(() => {
        if (!autoRefresh || !isAuthReady) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                fetchMoodData();
            }
        }, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, isAuthReady, fetchMoodData]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // ✅ تحليل العلاقة بين النوم والمزاج
    const sleepMoodCorrelation = useMemo(() => {
        return analyzeSleepMoodCorrelation(moodData, sleepData, isArabic);
    }, [moodData, sleepData, isArabic]);

    // ✅ إحصائيات المزاج
    const moodStats = useMemo(() => {
        const stats = {
            total: moodData.length,
            excellent: 0,
            good: 0,
            neutral: 0,
            stressed: 0,
            anxious: 0,
            sad: 0
        };
        
        moodData.forEach(entry => {
            const moodKey = entry.mood.toLowerCase();
            if (stats[moodKey] !== undefined) {
                stats[moodKey]++;
            }
        });
        
        const positiveMoods = stats.excellent + stats.good;
        const negativeMoods = stats.stressed + stats.anxious + stats.sad;
        const averageScore = moodData.length > 0 ? 
            Math.round(((positiveMoods * 100) / moodData.length) * 10) / 10 : 0;
        
        return {
            ...stats,
            positiveMoods,
            negativeMoods,
            averageScore
        };
    }, [moodData]);

    // ✅ كشف خطر الاكتئاب
    const depressionRisk = useMemo(() => {
        return detectDepressionRisk(moodData, isArabic);
    }, [moodData, isArabic]);

    // ✅ إضافة مزاج جديد
    const handleAddMood = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        isSubmittingRef.current = true;
        setLoading(true);
        
        try {
            const response = await axiosInstance.post('/mood-logs/', newMood);
            
            if (isMountedRef.current) {
                setMoodData(prev => [response.data, ...prev]);
                setTodayMood(response.data);
                setShowForm(false);
                setNewMood({ mood: 'Good', factors: '', text_entry: '' });
                setRefreshAnalytics(prev => prev + 1);
                setTimeout(() => fetchMoodData(), 1000);
            }
        } catch (error) {
            console.error('Error adding mood:', error);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في إضافة المزاج' : '❌ Error adding mood');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [newMood, isArabic, fetchMoodData]);

    // ✅ حذف سجل مزاج
    const handleDeleteMood = useCallback(async (id) => {
        if (!window.confirm(isArabic ? '⚠️ هل أنت متأكد من حذف هذا السجل؟' : '⚠️ Are you sure you want to delete this record?')) return;
        
        try {
            await axiosInstance.delete(`/mood-logs/${id}/`);
            
            if (isMountedRef.current) {
                setMoodData(prev => prev.filter(entry => entry.id !== id));
                
                if (todayMood && todayMood.id === id) {
                    setTodayMood(null);
                }
                
                setRefreshAnalytics(prev => prev + 1);
                fetchMoodData();
            }
        } catch (error) {
            console.error('Error deleting mood:', error);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في حذف السجل' : '❌ Error deleting record');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        }
    }, [isArabic, todayMood, fetchMoodData]);

    // ✅ حالة التحميل
    if (loading && moodData.length === 0) {
        return (
            <div className="mood-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحميل بيانات المزاج...' : 'Loading mood data...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`mood-tracker-container ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* ✅ رأس الصفحة */}
            <div className="mood-header">
                <div className="header-info">
                    <h2>
                        <span className="header-icon">😊</span>
                        {isArabic ? 'تتبع المزاج' : 'Mood Tracker'}
                    </h2>
                    <div className="header-stats">
                        <div className="stat-badge">
                            📊 {moodStats.total} {isArabic ? 'سجل' : 'entries'}
                        </div>
                        {moodStats.averageScore > 0 && (
                            <div className={`stat-badge ${moodStats.averageScore >= 70 ? 'positive' : moodStats.averageScore >= 50 ? 'neutral' : 'negative'}`}>
                                😊 {moodStats.averageScore}% {isArabic ? 'إيجابية' : 'positive'}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="header-actions">
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className={`add-mood-btn ${todayMood ? 'update' : ''}`}
                    >
                        <span>{todayMood ? '✏️' : '➕'}</span>
                        <span>{todayMood ? (isArabic ? 'تحديث اليوم' : 'Update Today') : (isArabic ? 'أضف اليوم' : 'Add Today')}</span>
                    </button>
                    
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">🔄 {isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                    </label>
                </div>
            </div>

            {/* ✅ وقت آخر تحديث */}
            {lastUpdate && (
                <div className="last-update">
                    🕐 {isArabic ? 'آخر تحديث' : 'Last Update'}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                </div>
            )}

            {/* ✅ تحذير خطر الاكتئاب */}
            {depressionRisk && (
                <div className={`risk-alert risk-${depressionRisk.risk}`}>
                    <div className="alert-header">
                        <span className="alert-icon">⚠️</span>
                        <span className="alert-title">{depressionRisk.message}</span>
                    </div>
                    <div className="alert-content">
                        <p>{depressionRisk.suggestion}</p>
                        {depressionRisk.days > 0 && (
                            <div className="alert-stats">
                                📅 {depressionRisk.days} {isArabic ? 'أيام متتالية' : 'consecutive days'}
                                {depressionRisk.percentage && (
                                    <span> • 📊 {depressionRisk.percentage}% {isArabic ? 'معدل انخفاض' : 'decline rate'}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ✅ مزاج اليوم */}
            {todayMood && (
                <div className="today-mood-card" style={{ borderLeftColor: getMoodColor(todayMood.mood) }}>
                    <div className="mood-card-header">
                        <div className="mood-icon" style={{ background: getMoodGradient(todayMood.mood) }}>
                            {getMoodIcon(todayMood.mood)}
                        </div>
                        <div className="mood-info">
                            <h3>{isArabic ? 'مزاجك اليوم' : 'Your Mood Today'}</h3>
                            <span className="mood-badge" style={{ background: getMoodColor(todayMood.mood) }}>
                                {getMoodText(todayMood.mood, isArabic)}
                            </span>
                        </div>
                        <button 
                            onClick={() => handleDeleteMood(todayMood.id)} 
                            className="delete-btn"
                            title={isArabic ? 'حذف' : 'Delete'}
                        >
                            🗑️
                        </button>
                    </div>
                    
                    {todayMood.factors && (
                        <div className="mood-factors">
                            <strong>📋 {isArabic ? 'العوامل المؤثرة' : 'Factors'}:</strong> {todayMood.factors}
                        </div>
                    )}
                    
                    {todayMood.text_entry && (
                        <div className="mood-notes">
                            <strong>💬 {isArabic ? 'ملاحظات' : 'Notes'}:</strong> {todayMood.text_entry}
                        </div>
                    )}
                    
                    <div className="mood-time">
                        🕐 {isArabic ? 'وقت التسجيل' : 'Recorded At'}: {new Date(todayMood.entry_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                    </div>
                    
                    <div className="mood-suggestion">
                        <span className="suggestion-icon">{getActivitySuggestion(todayMood.mood, isArabic).icon}</span>
                        <div className="suggestion-content">
                            <div className="suggestion-title">{getActivitySuggestion(todayMood.mood, isArabic).title}</div>
                            <div className="suggestion-text">{getActivitySuggestion(todayMood.mood, isArabic).advice}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ نموذج إضافة مزاج */}
            {showForm && (
                <div className="mood-form-card">
                    <div className="form-header">
                        <h3>{todayMood ? (isArabic ? '✏️ تحديث المزاج' : '✏️ Update Mood') : (isArabic ? '➕ إضافة مزاج جديد' : '➕ Add New Mood')}</h3>
                        <button onClick={() => setShowForm(false)} className="close-form-btn">✕</button>
                    </div>
                    
                    <form onSubmit={handleAddMood} className="mood-form">
                        <div className="form-field">
                            <label>{isArabic ? 'اختر حالتك المزاجية' : 'Choose Your Mood'}</label>
                            <div className="mood-options">
                                {['Excellent', 'Good', 'Neutral', 'Stressed', 'Anxious', 'Sad'].map(mood => (
                                    <label 
                                        key={mood} 
                                        className={`mood-option ${newMood.mood === mood ? 'selected' : ''}`}
                                        style={{
                                            background: newMood.mood === mood ? getMoodGradient(mood) : 'var(--secondary-bg)',
                                            color: newMood.mood === mood ? 'white' : getMoodColor(mood)
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="mood"
                                            value={mood}
                                            checked={newMood.mood === mood}
                                            onChange={(e) => setNewMood({...newMood, mood: e.target.value})}
                                        />
                                        <span className="mood-emoji">{getMoodIcon(mood)}</span>
                                        <span className="mood-name">{getMoodText(mood, isArabic)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-field">
                            <label>📋 {isArabic ? 'العوامل المؤثرة' : 'Factors'} <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span></label>
                            <input 
                                type="text"
                                value={newMood.factors}
                                onChange={(e) => setNewMood({...newMood, factors: e.target.value})}
                                placeholder={isArabic ? 'مثال: قلة نوم، ضغوط عمل، حدث سعيد...' : 'Example: lack of sleep, work stress, happy event...'}
                                className="form-input"
                            />
                        </div>

                        <div className="form-field">
                            <label>💬 {isArabic ? 'ملاحظات إضافية' : 'Additional Notes'} <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span></label>
                            <textarea 
                                value={newMood.text_entry}
                                onChange={(e) => setNewMood({...newMood, text_entry: e.target.value})}
                                placeholder={isArabic ? 'أضف أي تفاصيل إضافية عن حالتك المزاجية...' : 'Add any additional details about your mood...'}
                                className="form-textarea"
                                rows="3"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={loading} className="submit-btn">
                                {loading ? (
                                    <><span className="btn-spinner"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>
                                ) : (
                                    <>{isArabic ? '💾 حفظ' : '💾 Save'}</>
                                )}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ✅ رسالة الخطأ */}
            {error && (
                <div className="error-toast">
                    <span className="error-icon">❌</span>
                    <span className="error-message">{error}</span>
                    <button onClick={() => setError(null)} className="error-close">✕</button>
                </div>
            )}

            {/* ✅ تحليل العلاقة بين النوم والمزاج */}
            {sleepMoodCorrelation && sleepMoodCorrelation.hasCorrelation && (
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon">🧠</span>
                        <h3>{isArabic ? 'تحليل ذكي' : 'Smart Analysis'}</h3>
                    </div>
                    <div className="insight-body">
                        <p className="insight-message">{sleepMoodCorrelation.message}</p>
                        <div className="insight-details">{sleepMoodCorrelation.details}</div>
                        <div className="insight-suggestion">💡 {sleepMoodCorrelation.suggestion}</div>
                    </div>
                </div>
            )}

            {/* ✅ سجل المزاج */}
            <div className="mood-history-section">
                <div className="section-header">
                    <span className="section-icon">📋</span>
                    <h3>{isArabic ? 'سجل المزاج' : 'Mood History'}</h3>
                    {moodData.length > 0 && <span className="section-count">({moodData.length})</span>}
                </div>
                
                {moodData.length > 0 ? (
                    <div className="history-list">
                        {moodData.map((entry) => (
                            <div key={entry.id} className="history-item" style={{ borderLeftColor: getMoodColor(entry.mood) }}>
                                <div className="item-header">
                                    <div className="item-mood">
                                        <div className="mood-circle" style={{ background: getMoodGradient(entry.mood) }}>
                                            {getMoodIcon(entry.mood)}
                                        </div>
                                        <span className="mood-name" style={{ color: getMoodColor(entry.mood) }}>
                                            {getMoodText(entry.mood, isArabic)}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDeleteMood(entry.id)} className="delete-item-btn">
                                        🗑️
                                    </button>
                                </div>
                                
                                <div className="item-date">
                                    📅 {new Date(entry.entry_time).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })} • 🕐 {new Date(entry.entry_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                                </div>
                                
                                {entry.factors && (
                                    <div className="item-factors">
                                        <strong>📋 {isArabic ? 'العوامل' : 'Factors'}:</strong> {entry.factors}
                                    </div>
                                )}
                                
                                {entry.text_entry && (
                                    <div className="item-notes">
                                        <strong>💬 {isArabic ? 'ملاحظات' : 'Notes'}:</strong> {entry.text_entry}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h4>{isArabic ? 'لا توجد سجلات مزاج' : 'No Mood Records'}</h4>
                        <p>{isArabic ? 'ابدأ بتسجيل حالتك المزاجية لتتبع صحتك النفسية' : 'Start recording your mood to track your mental health'}</p>
                        <button onClick={() => setShowForm(true)} className="empty-add-btn">
                            ➕ {isArabic ? 'أضف أول سجل' : 'Add First Record'}
                        </button>
                    </div>
                )}
            </div>

            {/* ✅ تحليلات المزاج */}
            {moodData.length >= 7 && (
                <div className="analytics-wrapper">
                    <MoodAnalytics refreshTrigger={refreshAnalytics} isArabic={isArabic} />
                </div>
            )}

            {moodData.length > 0 && moodData.length < 7 && (
                <div className="info-banner">
                    <span className="banner-icon">ℹ️</span>
                    <span className="banner-text">
                        {isArabic 
                            ? `📊 سجل ${7 - moodData.length} يوم إضافي للحصول على تحليلات دقيقة لصحتك النفسية`
                            : `📊 Log ${7 - moodData.length} more days for accurate mental health insights`}
                    </span>
                </div>
            )}

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                .mood-tracker-container {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                /* ===== رأس الصفحة ===== */
                .mood-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .header-info h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .header-icon {
                    font-size: 1.5rem;
                }

                .header-stats {
                    display: flex;
                    gap: 0.5rem;
                }

                .stat-badge {
                    padding: 0.35rem 0.85rem;
                    background: var(--tertiary-bg);
                    border-radius: 50px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .stat-badge.positive {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }

                .stat-badge.neutral {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }

                .stat-badge.negative {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                .header-actions {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .add-mood-btn {
                    padding: 0.5rem 1.25rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                }

                .add-mood-btn.update {
                    background: var(--success-gradient, linear-gradient(135deg, #10b981, #059669));
                }

                .add-mood-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }

                .auto-refresh-toggle input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    width: 44px;
                    height: 22px;
                    background: var(--border-light);
                    border-radius: 22px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all var(--transition-fast);
                }

                input:checked + .toggle-slider {
                    background: var(--primary);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(22px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-22px);
                }

                .toggle-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .last-update {
                    text-align: right;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                }

                [dir="rtl"] .last-update {
                    text-align: left;
                }

                /* ===== تحذير المخاطر ===== */
                .risk-alert {
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                }

                .risk-alert.risk-critical {
                    background: rgba(220, 38, 38, 0.1);
                    border: 1px solid #dc2626;
                    border-left: 4px solid #dc2626;
                }

                .risk-alert.risk-high {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    border-left: 4px solid #ef4444;
                }

                .risk-alert.risk-moderate {
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid #f59e0b;
                    border-left: 4px solid #f59e0b;
                }

                [dir="rtl"] .risk-alert {
                    border-left: none;
                    border-right: 4px solid;
                }

                [dir="rtl"] .risk-alert.risk-critical { border-right-color: #dc2626; }
                [dir="rtl"] .risk-alert.risk-high { border-right-color: #ef4444; }
                [dir="rtl"] .risk-alert.risk-moderate { border-right-color: #f59e0b; }

                .alert-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .alert-icon {
                    font-size: 1.2rem;
                }

                .alert-title {
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .alert-content p {
                    margin: 0 0 0.5rem;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }

                .alert-stats {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                /* ===== بطاقة مزاج اليوم ===== */
                .today-mood-card {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                    border-left: 4px solid;
                }

                [dir="rtl"] .today-mood-card {
                    border-left: 1px solid var(--border-light);
                    border-right: 4px solid;
                }

                .mood-card-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }

                .mood-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                }

                .mood-info {
                    flex: 1;
                }

                .mood-info h3 {
                    margin: 0 0 0.25rem;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .mood-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: white;
                }

                .delete-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity var(--transition-fast);
                }

                .delete-btn:hover {
                    opacity: 1;
                }

                .mood-factors, .mood-notes {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .mood-time {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                }

                .mood-suggestion {
                    display: flex;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 12px;
                }

                .suggestion-icon {
                    font-size: 1.3rem;
                }

                .suggestion-content {
                    flex: 1;
                }

                .suggestion-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    margin-bottom: 0.25rem;
                }

                .suggestion-text {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                /* ===== نموذج إضافة مزاج ===== */
                .mood-form-card {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-light);
                }

                .form-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }

                .close-form-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: var(--text-tertiary);
                }

                .mood-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .form-field label {
                    display: block;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                    font-size: 0.85rem;
                }

                .optional {
                    font-weight: normal;
                    color: var(--text-tertiary);
                }

                .mood-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .mood-option {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.85rem;
                }

                .mood-option input {
                    position: absolute;
                    opacity: 0;
                }

                .mood-option.selected {
                    transform: scale(1.02);
                    box-shadow: var(--shadow-sm);
                }

                .form-input, .form-textarea {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .form-input:focus, .form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 0.5rem;
                }

                .submit-btn, .cancel-btn {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                }

                .submit-btn {
                    background: var(--primary-gradient);
                    color: white;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .cancel-btn {
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-secondary);
                }

                .cancel-btn:hover {
                    background: var(--hover-bg);
                }

                .btn-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    display: inline-block;
                    margin-right: 0.5rem;
                }

                /* ===== بطاقة التحليل الذكي ===== */
                .insight-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                    color: white;
                }

                .insight-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .insight-icon {
                    font-size: 1.3rem;
                }

                .insight-header h3 {
                    margin: 0;
                    color: white;
                }

                .insight-body {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .insight-message {
                    margin: 0;
                    font-weight: 500;
                }

                .insight-details {
                    font-size: 0.8rem;
                    opacity: 0.9;
                }

                .insight-suggestion {
                    font-size: 0.85rem;
                    background: rgba(255,255,255,0.15);
                    padding: 0.5rem 0.75rem;
                    border-radius: 10px;
                }

                /* ===== سجل المزاج ===== */
                .mood-history-section {
                    margin-top: 1rem;
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .section-icon {
                    font-size: 1.2rem;
                }

                .section-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }

                .section-count {
                    color: var(--text-tertiary);
                    font-size: 0.8rem;
                }

                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .history-item {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                    border-left: 4px solid;
                    transition: all var(--transition-fast);
                }

                .history-item:hover {
                    transform: translateX(4px);
                    box-shadow: var(--shadow-sm);
                }

                [dir="rtl"] .history-item:hover {
                    transform: translateX(-4px);
                }

                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .item-mood {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .mood-circle {
                    width: 36px;
                    height: 36px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                }

                .item-mood .mood-name {
                    font-weight: 600;
                    font-size: 0.9rem;
                }

                .delete-item-btn {
                    background: none;
                    border: none;
                    font-size: 1rem;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity var(--transition-fast);
                }

                .delete-item-btn:hover {
                    opacity: 1;
                }

                .item-date {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }

                .item-factors, .item-notes {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 0.5rem;
                }

                /* ===== حالة فارغة ===== */
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state h4 {
                    margin: 0 0 0.5rem;
                    color: var(--text-primary);
                }

                .empty-state p {
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }

                .empty-add-btn {
                    padding: 0.6rem 1.25rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                }

                /* ===== إشعارات ===== */
                .error-toast {
                    position: fixed;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    padding: 0.75rem 1rem;
                    background: #ef4444;
                    color: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                }

                [dir="rtl"] .error-toast {
                    right: auto;
                    left: 1.5rem;
                }

                .info-banner {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid #3b82f6;
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    margin-top: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #3b82f6;
                    font-size: 0.8rem;
                }

                .analytics-wrapper {
                    margin-top: 1.5rem;
                }

                .mood-loading {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 3rem;
                    text-align: center;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                [dir="rtl"] @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .reduce-motion *,
                .reduce-motion *::before,
                .reduce-motion *::after {
                    animation-duration: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                }

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 768px) {
                    .mood-tracker-container {
                        padding: 1rem;
                    }

                    .mood-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-actions {
                        width: 100%;
                        flex-direction: column;
                    }

                    .add-mood-btn {
                        width: 100%;
                        justify-content: center;
                    }

                    .auto-refresh-toggle {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .mood-options {
                        justify-content: center;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .error-toast {
                        left: 1rem;
                        right: 1rem;
                        bottom: 1rem;
                    }

                    [dir="rtl"] .error-toast {
                        left: 1rem;
                        right: 1rem;
                    }
                }

                @media (max-width: 480px) {
                    .mood-option {
                        flex: 1;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}

export default MoodTracker;