// src/components/MoodTracker.jsx
'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import MoodAnalytics from './Analytics/MoodAnalytics';
import '../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة للحصول على أيقونة المزاج
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

// دالة للحصول على لون المزاج
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

// دالة للحصول على تدرج المزاج
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

// دالة للحصول على نص المزاج
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

// دالة للحصول على اقتراح نشاط حسب المزاج
const getActivitySuggestion = (mood, isArabic) => {
    const suggestionsAr = {
        'Excellent': { icon: '🚀', text: 'وقت مناسب للإنتاجية والإنجاز' },
        'Good': { icon: '💪', text: 'استغل طاقتك في ممارسة هواية تحبها' },
        'Neutral': { icon: '🎧', text: 'استمع لموسيقى تحبها لتحسين مزاجك' },
        'Stressed': { icon: '🧘', text: 'جرب تمارين التنفس العميق أو المشي' },
        'Anxious': { icon: '🌿', text: 'خذ استراحة قصيرة وتأمل لمدة 5 دقائق' },
        'Sad': { icon: '💬', text: 'تحدث مع شخص تثق به أو اكتب مشاعرك' }
    };
    const suggestionsEn = {
        'Excellent': { icon: '🚀', text: 'Great time for productivity and achievement' },
        'Good': { icon: '💪', text: 'Use your energy to do an activity you love' },
        'Neutral': { icon: '🎧', text: 'Listen to music you like to improve your mood' },
        'Stressed': { icon: '🧘', text: 'Try deep breathing exercises or walking' },
        'Anxious': { icon: '🌿', text: 'Take a short break and meditate for 5 minutes' },
        'Sad': { icon: '💬', text: 'Talk to someone you trust or write your feelings' }
    };
    return isArabic ? (suggestionsAr[mood] || { icon: '💡', text: 'اهتم بنفسك اليوم' }) : (suggestionsEn[mood] || { icon: '💡', text: 'Take care of yourself today' });
};

// دالة للكشف عن الاكتئاب
const detectDepressionRisk = (moodData, isArabic) => {
    if (moodData.length < 5) return null;
    
    const badMoods = ['Stressed', 'Anxious', 'Sad'];
    let consecutiveBadDays = 0;
    let lastBadMood = null;
    
    const sortedData = [...moodData].sort((a, b) => 
        new Date(a.entry_time) - new Date(b.entry_time)
    );
    
    for (let i = sortedData.length - 1; i >= 0; i--) {
        if (badMoods.includes(sortedData[i].mood)) {
            consecutiveBadDays++;
            lastBadMood = sortedData[i].mood;
        } else {
            break;
        }
    }
    
    if (consecutiveBadDays >= 5) {
        return {
            risk: 'high',
            days: consecutiveBadDays,
            message: isArabic ? '⚠️ نلاحظ انخفاضاً مستمراً في مزاجك' : '⚠️ We notice a continuous decline in your mood',
            suggestion: isArabic ? 'يفضل التحدث مع شخص تثق به أو استشارة مختص' : 'Talk to someone you trust or consult a specialist',
            mood: lastBadMood
        };
    } else if (consecutiveBadDays >= 3) {
        return {
            risk: 'moderate',
            days: consecutiveBadDays,
            message: isArabic ? '📉 مزاجك منخفض لعدة أيام متتالية' : '📉 Your mood has been low for several consecutive days',
            suggestion: isArabic ? 'حاول القيام بنشاطات تحبها للخروج من هذه الحالة' : 'Try doing activities you enjoy to lift your mood',
            mood: lastBadMood
        };
    }
    
    return null;
};

function MoodTracker({ isAuthReady }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // تطبيق اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

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
                setError(isArabic ? 'خطأ في جلب بيانات المزاج' : 'Error fetching mood data');
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

    const sleepMoodCorrelation = useMemo(() => {
        if (moodData.length < 5 || sleepData.length < 5) return null;
        
        const lowSleepDays = sleepData
            .filter(sleep => sleep.duration_hours < 6 || (sleep.sleep_end && sleep.sleep_start && 
                (new Date(sleep.sleep_end) - new Date(sleep.sleep_start)) / (1000 * 60 * 60) < 6))
            .map(sleep => new Date(sleep.sleep_start || sleep.start_time).toDateString());
        
        const badMoodDays = moodData
            .filter(mood => ['Stressed', 'Anxious', 'Sad'].includes(mood.mood))
            .map(mood => new Date(mood.entry_time).toDateString());
        
        const overlap = lowSleepDays.filter(day => badMoodDays.includes(day));
        
        if (overlap.length >= 3) {
            const percentage = (overlap.length / lowSleepDays.length) * 100;
            return {
                hasCorrelation: true,
                message: isArabic ? 'نلاحظ أن مزاجك أسوأ عندما تنام أقل من 6 ساعات' : 'We notice your mood is worse when you sleep less than 6 hours',
                details: isArabic ? `في ${overlap.length} من ${lowSleepDays.length} يوم` : `in ${overlap.length} of ${lowSleepDays.length} days`,
                suggestion: isArabic ? 'حاول النوم 7-8 ساعات لتحسين مزاجك' : 'Try to sleep 7-8 hours to improve your mood'
            };
        }
        
        return null;
    }, [moodData, sleepData, isArabic]);

    const moodStats = useMemo(() => {
        const stats = {};
        moodData.forEach(entry => {
            stats[entry.mood] = (stats[entry.mood] || 0) + 1;
        });
        return stats;
    }, [moodData]);

    const depressionRisk = useMemo(() => {
        return detectDepressionRisk(moodData, isArabic);
    }, [moodData, isArabic]);

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
                setError(isArabic ? 'خطأ في إضافة المزاج' : 'Error adding mood');
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

    const handleDeleteMood = useCallback(async (id) => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?')) return;
        
        try {
            await axiosInstance.delete(`/mood-logs/${id}/`);
            
            if (isMountedRef.current) {
                setMoodData(prev => prev.filter(entry => entry.id !== id));
                
                if (todayMood && todayMood.id === id) {
                    setTodayMood(null);
                }
                
                setRefreshAnalytics(prev => prev + 1);
                setError(null);
            }
        } catch (error) {
            console.error('Error deleting mood:', error);
            if (isMountedRef.current) {
                setError(isArabic ? 'خطأ في حذف السجل' : 'Error deleting record');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        }
    }, [isArabic, todayMood]);

    if (loading && moodData.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* رأس الصفحة */}
            <div className="analytics-header">
                <div className="title-wrapper" style={{ flex: 1 }}>
                    <h2>{isArabic ? 'تتبع المزاج' : 'Mood Tracker'}</h2>
                    <div className="type-filters" style={{ marginBottom: 0 }}>
                        <span className="type-btn">📊 {moodData.length} {isArabic ? 'سجل' : 'entries'}</span>
                        {Object.entries(moodStats).slice(0, 3).map(([mood, count]) => (
                            <span key={mood} className="type-btn" style={{ color: getMoodColor(mood) }}>
                                {getMoodIcon(mood)} {count}
                            </span>
                        ))}
                        {Object.keys(moodStats).length > 3 && (
                            <span className="type-btn">+{Object.keys(moodStats).length - 3}</span>
                        )}
                    </div>
                </div>
                
                <div className="controls" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className={`type-btn ${todayMood ? 'active' : ''}`}
                        style={{ background: todayMood ? 'var(--success)' : 'var(--primary)' }}
                    >
                        <span>{todayMood ? '✏️' : '➕'}</span>
                        <span>{todayMood ? (isArabic ? 'تحديث اليوم' : 'Update Today') : (isArabic ? 'أضف اليوم' : 'Add Today')}</span>
                    </button>
                    
                    <label className="auto-refresh-toggle" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <span className="toggle-slider" style={{
                            width: '40px',
                            height: '20px',
                            background: autoRefresh ? 'var(--primary)' : 'var(--border-light)',
                            borderRadius: '20px',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}>
                            <span style={{
                                position: 'absolute',
                                width: '16px',
                                height: '16px',
                                background: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: autoRefresh ? '22px' : '2px',
                                transition: 'all var(--transition-fast)'
                            }}></span>
                        </span>
                        <span className="stat-label">{isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                    </label>
                </div>
            </div>

            {lastUpdate && (
                <div className="stat-label" style={{ marginBottom: 'var(--spacing-md)', textAlign: 'right' }}>
                    🕒 {isArabic ? 'آخر تحديث' : 'Last Update'}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                </div>
            )}

            {depressionRisk && (
                <div className={`recommendations-section priority-${depressionRisk.risk === 'high' ? 'high' : 'medium'}`} style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="rec-header">
                        <span className="rec-icon">⚠️</span>
                        <span className="rec-category">{depressionRisk.message}</span>
                    </div>
                    <p className="rec-message">
                        {isArabic ? `لاحظنا انخفاضاً في مزاجك لـ ${depressionRisk.days} أيام متتالية` : `We noticed a decline in your mood for ${depressionRisk.days} consecutive days`}
                    </p>
                    <div className="rec-advice">{depressionRisk.suggestion}</div>
                </div>
            )}

            {todayMood && (
                <div className="insight-card" style={{ borderLeft: `5px solid ${getMoodColor(todayMood.mood)}` }}>
                    <div className="insight-icon" style={{ background: getMoodGradient(todayMood.mood) }}>
                        {getMoodIcon(todayMood.mood)}
                    </div>
                    <div className="insight-content">
                        <div className="notification-header" style={{ marginBottom: 0 }}>
                            <div className="notification-title">
                                <h3>{isArabic ? 'مزاجك اليوم' : 'Your Mood Today'}</h3>
                                <span className="priority-badge" style={{ background: getMoodColor(todayMood.mood), color: 'white' }}>
                                    {getMoodText(todayMood.mood, isArabic)}
                                </span>
                            </div>
                            <button onClick={() => handleDeleteMood(todayMood.id)} className="notification-action-btn" title={isArabic ? 'حذف' : 'Delete'}>
                                🗑️
                            </button>
                        </div>
                        
                        {todayMood.factors && (
                            <div className="notification-content" style={{ marginTop: 'var(--spacing-sm)' }}>
                                <strong>{isArabic ? 'العوامل المؤثرة' : 'Factors'}:</strong> {todayMood.factors}
                            </div>
                        )}
                        {todayMood.text_entry && (
                            <div className="notification-content">
                                <strong>{isArabic ? 'ملاحظات' : 'Notes'}:</strong> {todayMood.text_entry}
                            </div>
                        )}
                        
                        <div className="notification-meta" style={{ marginTop: 'var(--spacing-sm)' }}>
                            <span className="notification-time">{isArabic ? 'وقت التسجيل' : 'Recorded At'}: {new Date(todayMood.entry_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</span>
                        </div>
                        
                        <div className="recommendation-card priority-low" style={{ marginTop: 'var(--spacing-md)' }}>
                            <div className="rec-header">
                                <span className="rec-icon">{getActivitySuggestion(todayMood.mood, isArabic).icon}</span>
                                <span className="rec-category">{getActivitySuggestion(todayMood.mood, isArabic).text}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="recommendations-section">
                    <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                        <h3>{todayMood ? (isArabic ? 'تحديث المزاج' : 'Update Mood') : (isArabic ? 'إضافة مزاج جديد' : 'Add New Mood')}</h3>
                        <button onClick={() => setShowForm(false)} className="refresh-btn">✕</button>
                    </div>
                    
                    <form onSubmit={handleAddMood}>
                        <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="stat-label">{isArabic ? 'اختر حالتك المزاجية' : 'Choose Your Mood'}</label>
                            <div className="type-filters" style={{ marginTop: 'var(--spacing-sm)' }}>
                                {['Excellent', 'Good', 'Neutral', 'Stressed', 'Anxious', 'Sad'].map(mood => (
                                    <label key={mood} className="type-btn" style={{
                                        background: newMood.mood === mood ? getMoodGradient(mood) : 'var(--secondary-bg)',
                                        color: newMood.mood === mood ? 'white' : getMoodColor(mood),
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="radio"
                                            name="mood"
                                            value={mood}
                                            checked={newMood.mood === mood}
                                            onChange={(e) => setNewMood({...newMood, mood: e.target.value})}
                                            style={{ display: 'none' }}
                                        />
                                        <span>{getMoodIcon(mood)}</span>
                                        <span>{getMoodText(mood, isArabic)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="stat-label">{isArabic ? 'العوامل المؤثرة' : 'Factors'} ({isArabic ? 'اختياري' : 'Optional'})</label>
                            <input 
                                type="text"
                                value={newMood.factors}
                                onChange={(e) => setNewMood({...newMood, factors: e.target.value})}
                                placeholder={isArabic ? 'مثال: قلة نوم، ضغوط عمل...' : 'Example: lack of sleep, work stress...'}
                                className="search-input"
                            />
                        </div>

                        <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="stat-label">{isArabic ? 'ملاحظات إضافية' : 'Additional Notes'} ({isArabic ? 'اختياري' : 'Optional'})</label>
                            <textarea 
                                value={newMood.text_entry}
                                onChange={(e) => setNewMood({...newMood, text_entry: e.target.value})}
                                placeholder={isArabic ? 'أضف أي تفاصيل إضافية...' : 'Add any additional details...'}
                                className="search-input"
                                rows="2"
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button type="submit" disabled={loading} className="type-btn active" style={{ flex: 1 }}>
                                {loading ? (
                                    <>
                                        <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                        {isArabic ? 'جاري الحفظ...' : 'Saving...'}
                                    </>
                                ) : (
                                    <>{isArabic ? 'حفظ' : 'Save'}</>
                                )}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="type-btn" style={{ flex: 1 }}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && (
                <div className="notification-message error" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="dismiss-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {sleepMoodCorrelation && (
                <div className="insight-card">
                    <div className="insight-icon">🧠</div>
                    <div className="insight-content">
                        <h3>{isArabic ? 'تحليل ذكي' : 'Smart Analysis'}</h3>
                        <p className="rec-message">{sleepMoodCorrelation.message}</p>
                        <p className="stat-label">{sleepMoodCorrelation.details}</p>
                        <div className="rec-advice" style={{ marginTop: 'var(--spacing-sm)' }}>💡 {sleepMoodCorrelation.suggestion}</div>
                    </div>
                </div>
            )}

            {/* السجل التاريخي */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">📋</span>
                    <span className="rec-category">{isArabic ? 'سجل المزاج' : 'Mood History'}</span>
                    {moodData.length > 0 && <span className="rec-type tip">({moodData.length})</span>}
                </div>
                
                {moodData.length > 0 ? (
                    <div className="notifications-list">
                        {moodData.map((entry) => (
                            <div key={entry.id} className="notification-card" style={{ borderLeft: `4px solid ${getMoodColor(entry.mood)}` }}>
                                <div className="notification-header">
                                    <div className="notification-title">
                                        <div className="notification-icon" style={{ background: getMoodGradient(entry.mood), width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {getMoodIcon(entry.mood)}
                                        </div>
                                        <span style={{ color: getMoodColor(entry.mood), fontWeight: 'bold' }}>
                                            {getMoodText(entry.mood, isArabic)}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDeleteMood(entry.id)} className="notification-action-btn" title={isArabic ? 'حذف' : 'Delete'}>
                                        🗑️
                                    </button>
                                </div>
                                
                                <div className="notification-content">
                                    <div className="notification-meta">
                                        <span className="notification-time">
                                            {new Date(entry.entry_time).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="notification-time">
                                            {new Date(entry.entry_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                                        </span>
                                    </div>
                                    
                                    {entry.factors && (
                                        <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                            <strong>{isArabic ? 'العوامل المؤثرة' : 'Factors'}:</strong> {entry.factors}
                                        </div>
                                    )}
                                    {entry.text_entry && (
                                        <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                            <strong>{isArabic ? 'ملاحظات' : 'Notes'}:</strong> {entry.text_entry}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="analytics-empty">
                        <div className="empty-icon">📝</div>
                        <h4>{isArabic ? 'لا توجد سجلات مزاج' : 'No Mood Records'}</h4>
                        <p>{isArabic ? 'ابدأ بتسجيل حالتك المزاجية' : 'Start recording your mood'}</p>
                        <button onClick={() => setShowForm(true)} className="type-btn active" style={{ marginTop: 'var(--spacing-md)' }}>
                            ➕ {isArabic ? 'أضف أول سجل' : 'Add First Record'}
                        </button>
                    </div>
                )}
            </div>

            {moodData.length >= 7 && (
                <div className="analytics-wrapper" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <MoodAnalytics refreshTrigger={refreshAnalytics} />
                </div>
            )}

            {moodData.length > 0 && moodData.length < 7 && (
                <div className="recommendation-card priority-medium" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <div className="rec-header">
                        <span className="rec-icon">ℹ️</span>
                        <span className="rec-category">
                            {isArabic ? `سجل ${7 - moodData.length} يوم إضافي للحصول على تحليلات دقيقة` : `Log ${7 - moodData.length} more days for accurate insights`}
                        </span>
                    </div>
                </div>
            )}

            <style>{`
                /* ✅ تم إزالة .lang-btn styles */

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .reduce-motion * {
                    animation-duration: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                }
                
                .notification-message.error {
                    background: var(--error-bg);
                    color: var(--error);
                    border: 1px solid var(--error);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    justify-content: space-between;
                }
                
                @media (max-width: 768px) {
                    .title-wrapper {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .type-filters {
                        flex-wrap: wrap;
                    }
                    
                    .controls {
                        flex-wrap: wrap;
                    }
                }
                
                @media (max-width: 480px) {
                    .form-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}

export default MoodTracker;