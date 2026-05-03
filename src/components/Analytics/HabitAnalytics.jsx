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

    const fetchAnalytics = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        console.log('🔄 Fetching analytics...');
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            console.log('📊 Response status:', response.status);
            console.log('📊 Response data:', response.data);
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                console.log('✅ Setting analytics data');
                setAnalyticsData(response.data.data);
                setError(null);
            } else {
                console.warn('⚠️ No data in response');
                setError('No data received');
            }
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err.message);
        } finally {
            if (isMountedRef.current) {
                console.log('🔄 Setting loading to false');
                setLoading(false);
            }
        }
    }, [isArabic]);

    useEffect(() => {
        console.log('🟢 Component mounted');
        fetchAnalytics();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchAnalytics]);

    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            console.log('🔄 Refresh triggered:', refreshTrigger);
            fetchAnalytics();
        }
    }, [refreshTrigger, fetchAnalytics]);

    // ✅ حالة التحميل
    if (loading) {
        console.log('🟡 Rendering loading state');
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '3px solid #e2e8f0', 
                    borderTopColor: '#6366f1', 
                    borderRadius: '50%', 
                    animation: 'spin 0.8s linear infinite', 
                    margin: '0 auto 1rem' 
                }}></div>
                <p>{isArabic ? 'جاري تحليل البيانات...' : 'Analyzing data...'}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error) {
        console.log('🔴 Rendering error state:', error);
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444' }}>❌ {isArabic ? 'حدث خطأ' : 'Error'}: {error}</p>
                <button onClick={fetchAnalytics} style={{ 
                    marginTop: '1rem', 
                    padding: '0.5rem 1rem', 
                    cursor: 'pointer',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px'
                }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ✅ حالة عدم وجود بيانات
    if (!analyticsData) {
        console.log('🟡 Rendering no data state');
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>⚠️ {isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis'}</p>
                <button onClick={fetchAnalytics} style={{ 
                    marginTop: '1rem', 
                    padding: '0.5rem 1rem', 
                    cursor: 'pointer',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px'
                }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    // ✅ عرض البيانات - نصل إلى هنا إذا نجح كل شيء
    console.log('🟢 Rendering data!', analyticsData);
    
    const { summary, recommendations, predictions } = analyticsData;

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`} style={{ padding: '1.5rem' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🤖 {isArabic ? 'تحليلات ذكية متقدمة' : 'Advanced AI Analytics'}</h2>
                <button onClick={fetchAnalytics} style={{ 
                    background: 'var(--secondary-bg, #f1f5f9)', 
                    border: 'none', 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer' 
                }}>
                    🔄
                </button>
            </div>

            {/* ✅ رسالة نجاح */}
            <div style={{ background: '#10b98120', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', color: '#10b981' }}>
                ✅ {isArabic ? 'تم تحميل التحليلات بنجاح!' : 'Analytics loaded successfully!'}
            </div>

            {/* ===== الملخص ===== */}
            {summary && (
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
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الإنجاز اليومي' : 'Daily Completion'}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.completion_rate || 0}%</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{isArabic ? 'الالتزام بالأدوية' : 'Medication Adherence'}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.medication_adherence || 0}%</div>
                        </div>
                        <div style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
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
            )}

            {/* ===== التوصيات ===== */}
            {recommendations && recommendations.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                    {recommendations.slice(0, 2).map((rec, idx) => (
                        <div key={idx} style={{ 
                            background: 'var(--secondary-bg, #f8fafc)', 
                            padding: '0.75rem', 
                            borderRadius: '12px', 
                            marginBottom: '0.5rem',
                            borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : '#f59e0b'}`
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
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>🔮 {isArabic ? 'توقعات الأداء' : 'Performance Predictions'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '0.75rem' }}>
                        {predictions.map((pred, idx) => (
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