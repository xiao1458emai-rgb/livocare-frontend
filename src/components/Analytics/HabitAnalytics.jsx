import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

const HabitAnalytics = ({ refreshTrigger, localHabits = [], localLogs = [], localMedications = [] }) => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [serverData, setServerData] = useState(null);
    const [localStats, setLocalStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    // ✅ حساب الإحصائيات المحلية الصحيحة
    const calculateLocalStats = useCallback(() => {
        if (!localHabits.length && !localMedications.length) return null;
        
        const allItems = [...localHabits, ...localMedications];
        const totalItems = allItems.length;
        
        // حساب الإنجازات اليومية
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = localLogs.filter(log => log.log_date === today);
        const completedToday = todayLogs.filter(log => log.is_completed).length;
        
        // نسبة الإنجاز الصحيحة (مئوية)
        const completionRate = totalItems > 0 ? Math.round((completedToday / totalItems) * 100) : 0;
        
        // حساب الالتزام بالأدوية
        const medicationLogs = localLogs.filter(log => 
            localMedications.some(med => med.id === (log.habit?.id || log.habit))
        );
        const medTotal = medicationLogs.length;
        const medCompleted = medicationLogs.filter(log => log.is_completed).length;
        const medAdherence = medTotal > 0 ? Math.round((medCompleted / medTotal) * 100) : 0;
        
        // حساب السلسلة (Streak) للعادات
        let streak = 0;
        const habitIds = localHabits.map(h => h.id);
        const habitLogs = localLogs.filter(log => habitIds.includes(log.habit?.id || log.habit));
        
        if (habitLogs.length > 0) {
            const sortedLogs = [...habitLogs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
            const uniqueDates = [...new Set(sortedLogs.map(l => l.log_date))];
            
            let currentDate = new Date();
            let currentDateStr = currentDate.toISOString().split('T')[0];
            
            for (let i = 0; i < 30; i++) {
                const hasLogOnDate = habitLogs.some(log => log.log_date === currentDateStr && log.is_completed);
                if (hasLogOnDate) {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                    currentDateStr = currentDate.toISOString().split('T')[0];
                } else {
                    break;
                }
            }
        }
        
        // أفضل وأسوأ عادة
        const habitRates = {};
        for (const habit of [...localHabits, ...localMedications]) {
            const habitLogsFiltered = localLogs.filter(log => (log.habit?.id || log.habit) === habit.id);
            if (habitLogsFiltered.length > 0) {
                const completed = habitLogsFiltered.filter(log => log.is_completed).length;
                const rate = Math.round((completed / habitLogsFiltered.length) * 100);
                habitRates[habit.name] = rate;
            }
        }
        
        const bestHabit = Object.entries(habitRates).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const worstHabit = Object.entries(habitRates).sort((a, b) => a[1] - b[1])[0]?.[0] || null;
        
        return {
            total_habits: localHabits.length,
            total_medications: localMedications.length,
            completed_today: completedToday,
            completion_rate: completionRate,
            medication_adherence: medAdherence,
            streak: streak,
            best_habit: bestHabit,
            worst_habit: worstHabit,
            is_local: true
        };
    }, [localHabits, localMedications, localLogs]);

    // ✅ جلب بيانات السيرفر
    const loadAnalytics = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        console.log('📡 Starting to load analytics...');
        setLoading(true);
        
        try {
            // حساب الإحصائيات المحلية أولاً
            const localStatsData = calculateLocalStats();
            setLocalStats(localStatsData);
            
            // ثم جلب بيانات السيرفر
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                console.log('✅ Server data received');
                setServerData(response.data.data);
                setError(null);
            } else {
                console.warn('⚠️ No server data');
            }
        } catch (err) {
            console.error('❌ Error loading analytics:', err);
            setError(err.message);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic, calculateLocalStats]);

    useEffect(() => {
        loadAnalytics();
        return () => { isMountedRef.current = false; };
    }, [loadAnalytics]);

    useEffect(() => {
        if (refreshTrigger !== undefined) {
            loadAnalytics();
        }
    }, [refreshTrigger, loadAnalytics]);

    if (loading) {
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
                <p>{isArabic ? 'جاري تحليل البيانات...' : 'Analyzing data...'}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error && !localStats) {
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444' }}>❌ {isArabic ? 'حدث خطأ' : 'Error'}: {error}</p>
                <button onClick={loadAnalytics} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px' }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ✅ استخدام الإحصائيات المحلية إذا كانت متوفرة (لأنها أكثر دقة)
    const summary = (localStats && localStats.is_local) ? localStats : (serverData?.summary);
    
    // استخدام توصيات السيرفر أو إنشاء توصيات محلية
    const recommendations = serverData?.recommendations?.length > 0 
        ? serverData.recommendations 
        : (localStats ? [
            {
                priority: 'medium',
                icon: '📋',
                title: isArabic ? 'تابع إنجازاتك اليومية' : 'Track Your Daily Achievements',
                description: isArabic 
                    ? `لديك ${localStats.total_habits + localStats.total_medications} عنصر للمتابعة`
                    : `You have ${localStats.total_habits + localStats.total_medications} items to track`,
                quick_tip: isArabic ? 'سجل إنجازاتك يومياً لتحصل على تحليلات أفضل' : 'Log your achievements daily for better insights'
            }
        ] : []);
    
    const predictions = serverData?.predictions || [];

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`} style={{ padding: '1.5rem' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🤖 {isArabic ? 'تحليلات ذكية' : 'Smart Analytics'}</h2>
                <button onClick={loadAnalytics} style={{ background: 'var(--secondary-bg, #f1f5f9)', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px', cursor: 'pointer' }}>
                    🔄
                </button>
            </div>

            {/* ✅ إحصائيات دقيقة من البيانات المحلية */}
            {summary && (
                <>
                    <div style={{ background: '#10b98120', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', color: '#10b981' }}>
                        ✅ {isArabic ? 'تم تحميل التحليلات بنجاح!' : 'Analytics loaded successfully!'}
                        {summary.is_local && (
                            <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                                ({isArabic ? 'تحليلات دقيقة' : 'accurate analysis'})
                            </span>
                        )}
                    </div>

                    {/* ===== الملخص الأساسي بإحصائيات صحيحة ===== */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>📊 {isArabic ? 'ملخص العادات والأدوية' : 'Habits & Medications Summary'}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '0.75rem' }}>
                            <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'العادات' : 'Habits'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.total_habits || 0}</div>
                            </div>
                            <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الأدوية' : 'Medications'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.total_medications || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الإنجاز اليومي' : 'Daily Completion'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: summary.completion_rate >= 70 ? '#10b981' : summary.completion_rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                                    {summary.completion_rate || 0}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الالتزام بالأدوية' : 'Medication Adherence'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: summary.medication_adherence >= 70 ? '#10b981' : summary.medication_adherence >= 40 ? '#f59e0b' : '#ef4444' }}>
                                    {summary.medication_adherence || 0}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(245,158,11,0.1)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'السلسلة' : 'Streak'}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.streak || 0}</div>
                            </div>
                            {summary.best_habit && (
                                <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'أفضل عادة' : 'Best Habit'}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{summary.best_habit}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ===== التوصيات (من السيرفر إذا وجدت) ===== */}
            {recommendations && recommendations.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>💡 {isArabic ? 'توصيات' : 'Recommendations'}</h3>
                    {recommendations.slice(0, 3).map((rec, idx) => (
                        <div key={idx} style={{ 
                            background: 'var(--secondary-bg, #f8fafc)', 
                            padding: '0.75rem', 
                            borderRadius: '12px', 
                            marginBottom: '0.5rem',
                            borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'}`
                        }}>
                            <strong style={{ fontSize: '0.85rem' }}>{rec.title}</strong>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>{rec.description}</p>
                            {rec.quick_tip && <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.25rem' }}>💡 {rec.quick_tip}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== التوقعات ===== */}
            {predictions && predictions.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>🔮 {isArabic ? 'توقعات' : 'Predictions'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '0.75rem' }}>
                        {predictions.slice(0, 3).map((pred, idx) => (
                            <div key={idx} style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{pred.label}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{pred.value}</div>
                                <div style={{ fontSize: '0.6rem', color: pred.trend === 'up' ? '#10b981' : '#f59e0b' }}>{pred.trend_text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitAnalytics;