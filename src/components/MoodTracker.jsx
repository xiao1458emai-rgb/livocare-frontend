'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

// دالة للحصول على نص المزاج المترجم
const getTranslatedMood = (mood, t) => {
    const translations = {
        'Excellent': t('mood.excellent'),
        'Good': t('mood.good'),
        'Neutral': t('mood.neutral'),
        'Stressed': t('mood.stressed'),
        'Anxious': t('mood.anxious'),
        'Sad': t('mood.sad')
    };
    return translations[mood] || mood;
};

// دالة للحصول على اقتراح نشاط حسب المزاج
const getActivitySuggestion = (mood, t) => {
    const suggestions = {
        'Excellent': {
            icon: '🚀',
            text: t('mood.suggestions.excellent', 'وقت مناسب للإنتاجية والإنجاز')
        },
        'Good': {
            icon: '💪',
            text: t('mood.suggestions.good', 'استغل طاقتك في ممارسة هواية تحبها')
        },
        'Neutral': {
            icon: '🎧',
            text: t('mood.suggestions.neutral', 'استمع لموسيقى تحبها لتحسين مزاجك')
        },
        'Stressed': {
            icon: '🧘',
            text: t('mood.suggestions.stressed', 'جرب تمارين التنفس العميق أو المشي')
        },
        'Anxious': {
            icon: '🌿',
            text: t('mood.suggestions.anxious', 'خذ استراحة قصيرة وتأمل لمدة 5 دقائق')
        },
        'Sad': {
            icon: '💬',
            text: t('mood.suggestions.sad', 'تحدث مع شخص تثق به أو اكتب مشاعرك')
        }
    };
    return suggestions[mood] || { icon: '💡', text: t('mood.suggestions.default', 'اهتم بنفسك اليوم') };
};

// دالة للكشف عن الاكتئاب (5 أيام متتالية من المزاج السيء)
const detectDepressionRisk = (moodData, t) => {
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
            message: t('mood.depressionRisk.warning', '⚠️ نلاحظ انخفاضاً مستمراً في مزاجك'),
            suggestion: t('mood.depressionRisk.suggestion', 'يفضل التحدث مع شخص تثق به أو استشارة مختص'),
            mood: lastBadMood
        };
    } else if (consecutiveBadDays >= 3) {
        return {
            risk: 'moderate',
            days: consecutiveBadDays,
            message: t('mood.depressionRisk.moderate', '📉 مزاجك منخفض لعدة أيام متتالية'),
            suggestion: t('mood.depressionRisk.moderateSuggestion', 'حاول القيام بنشاطات تحبها للخروج من هذه الحالة'),
            mood: lastBadMood
        };
    }
    
    return null;
};

function MoodTracker({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    
    // ✅ useRef لمنع التحديثات المتكررة
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
    const [darkMode, setDarkMode] = useState(false);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [newMood, setNewMood] = useState({
        mood: 'Good',
        factors: '',
        text_entry: ''
    });
    const [reducedMotion, setReducedMotion] = useState(false);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

// ✅ تعديل دالة fetchMoodData
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
        
        // ✅ معالجة بيانات المزاج - دعم results والمصفوفة
        let moodDataArray = [];
        if (moodResponse.data?.results) {
            moodDataArray = moodResponse.data.results;
        } else if (Array.isArray(moodResponse.data)) {
            moodDataArray = moodResponse.data;
        } else {
            moodDataArray = [];
        }
        
        // ✅ معالجة بيانات النوم
        let sleepDataArray = [];
        if (sleepResponse.data?.results) {
            sleepDataArray = sleepResponse.data.results;
        } else if (Array.isArray(sleepResponse.data)) {
            sleepDataArray = sleepResponse.data;
        } else {
            sleepDataArray = [];
        }
        
        console.log('😊 Mood data loaded:', moodDataArray.length, 'records');
        console.log('🌙 Sleep data loaded:', sleepDataArray.length, 'records');
        
        setMoodData(moodDataArray);
        setSleepData(sleepDataArray);
        setLastUpdate(new Date());
        
        // تحديث مزاج اليوم
        const today = new Date().toDateString();
        const todayEntry = moodDataArray.find(entry => 
            new Date(entry.entry_time).toDateString() === today
        );
        setTodayMood(todayEntry || null);
        
    } catch (error) {
        console.error('Error fetching mood data:', error);
        if (isMountedRef.current) {
            setError(t('mood.fetchError'));
        }
    } finally {
        if (isMountedRef.current) {
            setLoading(false);
        }
        isFetchingRef.current = false;
    }
}, [isAuthReady, t]);

    // ✅ جلب البيانات عند تحميل المكون
    useEffect(() => {
        fetchMoodData();
    }, [fetchMoodData]);

    // ✅ التحديث التلقائي - مع تنظيف صحيح
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

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // ربط المزاج بالنوم
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
                message: t('mood.correlations.sleepImpact', 'نلاحظ أن مزاجك أسوأ عندما تنام أقل من 6 ساعات'),
                details: t('mood.correlations.sleepImpactDetails', { days: overlap.length, percentage: Math.round(percentage) }),
                suggestion: t('mood.correlations.sleepSuggestion', 'حاول النوم 7-8 ساعات لتحسين مزاجك')
            };
        }
        
        return null;
    }, [moodData, sleepData, t]);

    // إحصائيات المزاج
    const moodStats = useMemo(() => {
        const stats = {};
        moodData.forEach(entry => {
            stats[entry.mood] = (stats[entry.mood] || 0) + 1;
        });
        return stats;
    }, [moodData]);

    // كشف الاكتئاب
    const depressionRisk = useMemo(() => {
        return detectDepressionRisk(moodData, t);
    }, [moodData, t]);

    // ✅ إضافة مزاج جديد - مع منع الطلبات المتزامنة
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
                setError(t('mood.addError'));
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
    }, [newMood, t, fetchMoodData]);

    // ✅ حذف مزاج
    const handleDeleteMood = useCallback(async (id) => {
        if (!window.confirm(t('mood.deleteConfirm'))) return;
        
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
                setError(t('mood.deleteError'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        }
    }, [t, todayMood]);

    if (loading && moodData.length === 0) {
        return (
            <div className={`loading-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className={`mood-tracker-container ${darkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* رأس الصفحة */}
            <div className="mood-header">
                <div className="header-main">
                    <div className="title-wrapper">
                        <h2>
                            <span className="title-icon">😊</span>
                            {t('mood.title')}
                        </h2>
                        <div className="header-stats">
                            <div className="stat-badge">
                                <span>📊</span>
                                <span>{moodData.length} {t('mood.entries')}</span>
                            </div>
                            <div className="mood-distribution">
                                {Object.entries(moodStats).slice(0, 3).map(([mood, count]) => (
                                    <div key={mood} className="dist-item" style={{ color: getMoodColor(mood) }}>
                                        <span>{getMoodIcon(mood)}</span>
                                        <span>{count}</span>
                                    </div>
                                ))}
                                {Object.keys(moodStats).length > 3 && (
                                    <div className="dist-item more">+{Object.keys(moodStats).length - 3}</div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="controls">
                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className={`add-btn ${todayMood ? 'has-entry' : ''}`}
                        >
                            <span>{todayMood ? '✏️' : '➕'}</span>
                            <span>{todayMood ? t('mood.updateToday') : t('mood.addToday')}</span>
                        </button>
                        
                        <label className="auto-refresh-toggle">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">{t('mood.autoRefresh')}</span>
                        </label>
                    </div>
                </div>
                
                {lastUpdate && (
                    <div className="last-update">
                        <span>🕒</span>
                        <span>{t('mood.lastUpdate')}: {lastUpdate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                )}
            </div>

            {/* تحذير الاكتئاب */}
            {depressionRisk && (
                <div className={`depression-warning ${depressionRisk.risk}`}>
                    <div className="warning-header">
                        <span className="warning-icon">⚠️</span>
                        <span className="warning-title">{depressionRisk.message}</span>
                    </div>
                    <p className="warning-details">
                        {t('mood.depressionRisk.details', 'لاحظنا انخفاضاً في مزاجك لـ {days} أيام متتالية', { days: depressionRisk.days })}
                    </p>
                    <p className="warning-suggestion">{depressionRisk.suggestion}</p>
                </div>
            )}

            {/* بطاقة مزاج اليوم */}
            {todayMood && (
                <div className="today-mood-card" style={{ borderLeft: `5px solid ${getMoodColor(todayMood.mood)}` }}>
                    <div className="today-header">
                        <div className="mood-display">
                            <div className="mood-icon-wrapper" style={{ background: getMoodGradient(todayMood.mood) }}>
                                <span>{getMoodIcon(todayMood.mood)}</span>
                            </div>
                            <div className="mood-info">
                                <h3>{t('mood.yourMoodToday')}</h3>
                                <span className="mood-text" style={{ color: getMoodColor(todayMood.mood) }}>
                                    {getTranslatedMood(todayMood.mood, t)}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteMood(todayMood.id)} className="delete-btn" title={t('common.delete')}>
                            🗑️
                        </button>
                    </div>
                    
                    {todayMood.factors && (
                        <div className="mood-factors">
                            <span>💭</span>
                            <span><strong>{t('mood.factors')}:</strong> {todayMood.factors}</span>
                        </div>
                    )}
                    {todayMood.text_entry && (
                        <div className="mood-notes">
                            <span>📝</span>
                            <span><strong>{t('mood.notes')}:</strong> {todayMood.text_entry}</span>
                        </div>
                    )}
                    
                    <div className="mood-time">
                        <span>⏰</span>
                        <span>{t('mood.recordedAt')}: {new Date(todayMood.entry_time).toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                    
                    {/* اقتراح نشاط حسب المزاج */}
                    <div className="activity-suggestion" style={{ background: `${getMoodColor(todayMood.mood)}10`, borderColor: getMoodColor(todayMood.mood) }}>
                        <span>{getActivitySuggestion(todayMood.mood, t).icon}</span>
                        <span>{getActivitySuggestion(todayMood.mood, t).text}</span>
                    </div>
                </div>
            )}

            {/* نموذج إضافة مزاج */}
            {showForm && (
                <div className="mood-form-container">
                    <form onSubmit={handleAddMood} className="mood-form">
                        <div className="form-header">
                            <h3>{todayMood ? t('mood.updateToday') : t('mood.addNew')}</h3>
                            <button type="button" onClick={() => setShowForm(false)} className="close-btn">✕</button>
                        </div>
                        
                        <div className="form-group">
                            <label>{t('mood.chooseMood')}:</label>
                            <div className="mood-options">
                                {['Excellent', 'Good', 'Neutral', 'Stressed', 'Anxious', 'Sad'].map(mood => (
                                    <label key={mood} className={`mood-option ${newMood.mood === mood ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="mood"
                                            value={mood}
                                            checked={newMood.mood === mood}
                                            onChange={(e) => setNewMood({...newMood, mood: e.target.value})}
                                        />
                                        <span className="mood-option-content" style={{ 
                                            background: newMood.mood === mood ? getMoodGradient(mood) : 'none',
                                            color: newMood.mood === mood ? 'white' : getMoodColor(mood)
                                        }}>
                                            <span>{getMoodIcon(mood)}</span>
                                            <span>{getTranslatedMood(mood, t)}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>💭 {t('mood.factors')} ({t('common.optional')}):</label>
                            <input 
                                type="text"
                                value={newMood.factors}
                                onChange={(e) => setNewMood({...newMood, factors: e.target.value})}
                                placeholder={t('mood.factorsPlaceholder')}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>📝 {t('mood.notes')} ({t('common.optional')}):</label>
                            <textarea 
                                value={newMood.text_entry}
                                onChange={(e) => setNewMood({...newMood, text_entry: e.target.value})}
                                placeholder={t('mood.notesPlaceholder')}
                                className="form-textarea"
                                rows="2"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={loading} className="submit-btn">
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <span>💾</span>
                                        {t('mood.saveMood')}
                                    </>
                                )}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                                {t('common.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* رسائل الخطأ */}
            {error && (
                <div className="error-message">
                    <span>⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="dismiss-btn">✕</button>
                </div>
            )}

            {/* ربط المزاج بالنوم */}
            {sleepMoodCorrelation && (
                <div className="correlation-card">
                    <div className="correlation-header">
                        <span>🧠</span>
                        <span>{t('mood.correlations.title', 'تحليل ذكي')}</span>
                    </div>
                    <p className="correlation-message">{sleepMoodCorrelation.message}</p>
                    <p className="correlation-details">{sleepMoodCorrelation.details}</p>
                    <p className="correlation-suggestion">💡 {sleepMoodCorrelation.suggestion}</p>
                </div>
            )}

            {/* السجل التاريخي */}
            <div className="mood-history">
                <h3>
                    <span>📋</span>
                    {t('mood.history')}
                    {moodData.length > 0 && <span className="history-count">({moodData.length})</span>}
                </h3>
                
                {moodData.length > 0 ? (
                    <div className="mood-cards">
                        {moodData.map((entry) => (
                            <div key={entry.id} className="mood-card" style={{ borderLeft: `4px solid ${getMoodColor(entry.mood)}` }}>
                                <div className="mood-card-header">
                                    <div className="mood-info">
                                        <div className="mood-icon-small" style={{ background: getMoodGradient(entry.mood) }}>
                                            <span>{getMoodIcon(entry.mood)}</span>
                                        </div>
                                        <span className="mood-text" style={{ color: getMoodColor(entry.mood) }}>
                                            {getTranslatedMood(entry.mood, t)}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDeleteMood(entry.id)} className="delete-btn small" title={t('common.delete')}>
                                        🗑️
                                    </button>
                                </div>
                                
                                <div className="mood-details">
                                    <div className="mood-date">
                                        <span>📅</span>
                                        <time dateTime={entry.entry_time}>
                                            {new Date(entry.entry_time).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </time>
                                    </div>
                                    <div className="mood-time">
                                        <span>⏰</span>
                                        <time dateTime={entry.entry_time}>
                                            {new Date(entry.entry_time).toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                                        </time>
                                    </div>
                                    
                                    {entry.factors && (
                                        <div className="mood-factors">
                                            <span>💭</span>
                                            <span><strong>{t('mood.factors')}:</strong> {entry.factors}</span>
                                        </div>
                                    )}
                                    {entry.text_entry && (
                                        <div className="mood-notes">
                                            <span>📝</span>
                                            <span><strong>{t('mood.notes')}:</strong> {entry.text_entry}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h4>{t('mood.noRecords')}</h4>
                        <p>{t('mood.startRecording')}</p>
                        <button onClick={() => setShowForm(true)} className="empty-btn">
                            ➕ {t('mood.addFirst')}
                        </button>
                    </div>
                )}
            </div>

            {/* التحليلات (فقط إذا كان هناك بيانات كافية) */}
            {moodData.length >= 7 && (
                <div className="analytics-wrapper">
                    <MoodAnalytics refreshTrigger={refreshAnalytics} />
                </div>
            )}

            {moodData.length > 0 && moodData.length < 7 && (
                <div className="info-message">
                    <span>ℹ️</span>
                    <span>{t('mood.needMoreData', 'سجل {remaining} يوم إضافي للحصول على تحليلات دقيقة', { remaining: 7 - moodData.length })}</span>
                </div>
            )}

            <style jsx>{`
                .mood-tracker-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 24px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                /* رأس الصفحة */
                .mood-header {
                    margin-bottom: 24px;
                }

                .title-wrapper {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .title-wrapper h2 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1.5rem;
                }

                .header-stats {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .stat-badge {
                    padding: 6px 12px;
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .mood-distribution {
                    display: flex;
                    gap: 12px;
                    padding: 6px 12px;
                    background: var(--bg-secondary);
                    border-radius: 20px;
                }

                .dist-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.85rem;
                }

                .controls {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .add-btn {
                    padding: 8px 20px;
                    border: none;
                    border-radius: 40px;
                    background: var(--primary-color);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .add-btn.has-entry {
                    background: var(--success-color);
                }

                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .auto-refresh-toggle input {
                    position: absolute;
                    opacity: 0;
                }

                .toggle-slider {
                    width: 40px;
                    height: 20px;
                    background: var(--border-color);
                    border-radius: 20px;
                    position: relative;
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: 0.2s;
                }

                input:checked + .toggle-slider {
                    background: var(--primary-color);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(20px);
                }

                .last-update {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                /* تحذير الاكتئاب */
                .depression-warning {
                    padding: 16px;
                    border-radius: 16px;
                    margin-bottom: 24px;
                }

                .depression-warning.high {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid #ef4444;
                }

                .depression-warning.moderate {
                    background: rgba(245, 158, 11, 0.15);
                    border: 1px solid #f59e0b;
                }

                .warning-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .warning-title {
                    font-weight: bold;
                }

                /* بطاقة مزاج اليوم */
                .today-mood-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .today-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .mood-display {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .mood-icon-wrapper {
                    width: 60px;
                    height: 60px;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                }

                .mood-info h3 {
                    margin: 0 0 4px 0;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .mood-text {
                    font-size: 1.2rem;
                    font-weight: bold;
                }

                .mood-factors, .mood-notes {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                    background: var(--bg-primary);
                    border-radius: 12px;
                    margin-bottom: 8px;
                    font-size: 0.85rem;
                }

                .mood-time {
                    display: flex;
                    gap: 8px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-top: 12px;
                }

                .activity-suggestion {
                    margin-top: 16px;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                /* نموذج الإضافة */
                .mood-form-container {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .close-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 16px;
                    background: var(--bg-primary);
                    cursor: pointer;
                }

                .mood-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-top: 8px;
                }

                .mood-option {
                    cursor: pointer;
                }

                .mood-option input {
                    position: absolute;
                    opacity: 0;
                }

                .mood-option-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px;
                    border-radius: 12px;
                    transition: 0.2s;
                }

                .form-group {
                    margin-bottom: 16px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    font-weight: 500;
                }

                .form-input, .form-textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }

                .form-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .submit-btn, .cancel-btn {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .submit-btn {
                    background: var(--success-color);
                    color: white;
                }

                .cancel-btn {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                /* ربط المزاج بالنوم */
                .correlation-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 24px;
                }

                .correlation-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    font-weight: bold;
                }

                .correlation-message {
                    margin: 0 0 8px 0;
                }

                .correlation-details {
                    margin: 0 0 8px 0;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                .correlation-suggestion {
                    margin: 0;
                    font-size: 0.85rem;
                }

                /* السجل التاريخي */
                .mood-history {
                    margin-top: 24px;
                }

                .mood-history h3 {
                    margin: 0 0 16px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .history-count {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: normal;
                }

                .mood-cards {
                    display: grid;
                    gap: 12px;
                }

                .mood-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                }

                .mood-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .mood-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .mood-icon-small {
                    width: 36px;
                    height: 36px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                }

                .delete-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 6px;
                    border-radius: 8px;
                }

                .delete-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                }

                .mood-details {
                    padding-left: 46px;
                }

                .mood-date, .mood-time {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }

                /* حالات فارغة */
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    background: var(--bg-secondary);
                    border-radius: 16px;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }

                .empty-btn {
                    margin-top: 16px;
                    padding: 8px 20px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                }

                /* رسائل */
                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(239, 68, 68, 0.15);
                    border-radius: 12px;
                    margin-bottom: 20px;
                }

                .info-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    margin-top: 16px;
                    font-size: 0.85rem;
                }

                .analytics-wrapper {
                    margin-top: 24px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .mood-tracker-container {
                        padding: 16px;
                    }
                    
                    .title-wrapper {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .mood-options {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .mood-details {
                        padding-left: 0;
                    }
                }

                @media (max-width: 480px) {
                    .mood-options {
                        grid-template-columns: 1fr;
                    }
                    
                    .controls {
                        flex-direction: column;
                    }
                    
                    .add-btn {
                        justify-content: center;
                    }
                    
                    .form-actions {
                        flex-direction: column;
                    }
                    
                    .mood-display {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .today-header {
                        flex-direction: column;
                        gap: 12px;
                    }
                }

                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #667eea;
                    --success-color: #10b981;
                }

                .reduce-motion * {
                    animation-duration: 0.01ms !important;
                }
            `}</style>
        </div>
    );
}

export default MoodTracker;