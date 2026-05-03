import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

const HabitAnalytics = ({ refreshTrigger }) => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        console.log('🔄 fetchData called, setting loading=true');
        setLoading(true);
        setError(null);
        
        try {
            console.log('📡 Fetching from /habits/analytics/...');
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            console.log('📊 Response received:', response.data);
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                console.log('✅ Setting analytics data:', response.data.data);
                setAnalyticsData(response.data.data);
                setLoading(false);
            } else {
                console.warn('⚠️ No data in response');
                setError('No data received from server');
                setLoading(false);
            }
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err.message || 'Failed to load');
            setLoading(false);
        }
    }, [isArabic]);

    useEffect(() => {
        console.log('🔄 useEffect triggered, calling fetchData');
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [fetchData, refreshTrigger]);

    // ✅ حالة التحميل - مع console.log للتأكد
    if (loading) {
        console.log('🟡 Loading state: true');
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>{isArabic ? 'جاري تحليل البيانات...' : 'Analyzing data...'}</p>
                <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
                    {isArabic ? 'جاري الاتصال بخادم التحليلات...' : 'Connecting to analytics server...'}
                </p>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error) {
        console.log('🔴 Error state:', error);
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444' }}>❌ {isArabic ? 'حدث خطأ' : 'Error'}: {error}</p>
                <button onClick={fetchData} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ✅ حالة عدم وجود بيانات
    if (!analyticsData) {
        console.log('🟡 No data state');
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>⚠️ {isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis'}</p>
                <button onClick={fetchData} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ✅ عرض البيانات - نصل إلى هنا إذا نجح كل شيء
    console.log('🟢 Rendering data!', analyticsData);
    const { summary, correlations, recommendations, predictions, anomalies, distribution, streak_analysis } = analyticsData;

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`} style={{ padding: '1.5rem' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>🤖 {isArabic ? 'تحليلات ذكية' : 'AI Analytics'}</h2>
                <button onClick={fetchData} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '8px', padding: '0.3rem 0.8rem', cursor: 'pointer' }}>
                    🔄
                </button>
            </div>

            {/* ✅ تم جلب البيانات بنجاح */}
            <div style={{ background: '#10b98120', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', color: '#10b981' }}>
                ✅ {isArabic ? 'تم تحميل التحليلات بنجاح!' : 'Analytics loaded successfully!'}
            </div>

            {/* ===== الملخص ===== */}
            {summary && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>📊 {isArabic ? 'ملخص' : 'Summary'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: '0.5rem' }}>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'العادات' : 'Habits'}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{summary.total_habits || 0}</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الأدوية' : 'Medications'}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{summary.active_medications || 0}</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الإنجاز' : 'Completion'}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{summary.completion_rate || 0}%</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الالتزام' : 'Adherence'}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{summary.medication_adherence || 0}%</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'السلسلة' : 'Streak'}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{summary.streak || 0}</div>
                        </div>
                        {summary.best_habit && (
                            <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'أفضل عادة' : 'Best Habit'}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{summary.best_habit}</div>
                            </div>
                        )}
                    </div>
                    {summary.analysis_days && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary, #94a3b8)', marginTop: '0.5rem', textAlign: 'center' }}>
                            🕒 {isArabic ? 'تحليل آخر' : 'Based on last'} {summary.analysis_days} {isArabic ? 'أيام' : 'days'}
                        </div>
                    )}
                </div>
            )}

            {/* ===== التوصيات ===== */}
            {recommendations && recommendations.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3>💡 {isArabic ? 'توصيات ذكية' : 'Recommendations'}</h3>
                    {recommendations.slice(0, 3).map((rec, idx) => (
                        <div key={idx} style={{ 
                            background: 'var(--secondary-bg, #f8fafc)', 
                            padding: '0.75rem', 
                            borderRadius: '12px', 
                            marginBottom: '0.5rem',
                            borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'}`
                        }}>
                            <strong>{rec.title}</strong>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>{rec.description}</p>
                            {rec.quick_tip && <small style={{ color: '#f59e0b' }}>💡 {rec.quick_tip}</small>}
                            {rec.actions && rec.actions.length > 0 && (
                                <ul style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.7rem' }}>
                                    {rec.actions.slice(0, 2).map((action, i) => <li key={i}>{action}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== التوقعات ===== */}
            {predictions && predictions.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3>🔮 {isArabic ? 'توقعات' : 'Predictions'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '0.5rem' }}>
                        {predictions.slice(0, 3).map((pred, idx) => (
                            <div key={idx} style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{pred.label}</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{pred.value}</div>
                                <div style={{ fontSize: '0.65rem', color: '#10b981' }}>{pred.trend_text}</div>
                                <small style={{ fontSize: '0.6rem' }}>{pred.note}</small>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .analytics-container { background: #1e293b; border-color: #334155; }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;