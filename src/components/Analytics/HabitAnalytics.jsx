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
    
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const fetchAnalytics = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                setAnalytics(response.data.data);
                setError(null);
            } else {
                setError('No data received');
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic]);

    useEffect(() => {
        fetchAnalytics();
        return () => { isMountedRef.current = false; };
    }, [fetchAnalytics]);

    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            fetchAnalytics();
        }
    }, [refreshTrigger, fetchAnalytics]);

    if (loading) {
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
                <p>{isArabic ? 'جاري تحليل الأدوية...' : 'Analyzing medications...'}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="analytics-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444' }}>⚠️ {error || (isArabic ? 'لا توجد بيانات' : 'No data')}</p>
                <button onClick={fetchAnalytics} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px' }}>
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    const { medications_analysis, recommendations, predictions } = analytics;
    const hasMedications = medications_analysis?.has_medications || false;
    const medicationsList = medications_analysis?.medications || [];
    const interactions = medications_analysis?.interactions || [];

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`} style={{ padding: '1.5rem' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>💊 {isArabic ? 'تحليلات الأدوية الذكية' : 'Smart Medication Analytics'}</h2>
                <button onClick={fetchAnalytics} style={{ background: 'var(--secondary-bg, #f1f5f9)', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px', cursor: 'pointer' }}>
                    🔄
                </button>
            </div>

            {/* ===== تفاعلات الأدوية ===== */}
            {interactions.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚠️</span> {isArabic ? 'تفاعلات دوائية محتملة' : 'Potential Drug Interactions'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {interactions.map((inter, idx) => (
                            <div key={idx} style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                padding: '0.75rem', 
                                borderRadius: '12px',
                                borderLeft: `4px solid ${inter.severity === 'high' ? '#ef4444' : '#f59e0b'}`
                            }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    💊 {inter.medication1} ↔️ {inter.medication2}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    {inter.description}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                                    💡 {isArabic ? 'يُنصح باستشارة الطبيب' : 'Consult your doctor'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== قائمة الأدوية مع الآثار الجانبية وأوقات التناول ===== */}
            {hasMedications && medicationsList.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💊</span> {isArabic ? 'أدويتك وتحليلاتها' : 'Your Medications & Analysis'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {medicationsList.map((med, idx) => (
                            <div key={idx} style={{ 
                                background: 'var(--secondary-bg, #f8fafc)', 
                                padding: '0.75rem', 
                                borderRadius: '12px',
                                border: '1px solid var(--border-light, #e2e8f0)'
                            }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>💊 {med.name}</div>
                                
                                {/* الآثار الجانبية */}
                                {med.side_effects && med.side_effects.length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f59e0b' }}>
                                            ⚠️ {isArabic ? 'الآثار الجانبية الشائعة' : 'Common Side Effects'}:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            {med.side_effects.slice(0, 4).map((effect, i) => (
                                                <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                                                    {effect}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* وقت التناول الموصى به */}
                                {med.suggested_time && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#10b981' }}>
                                        ⏰ {isArabic ? 'الوقت المثالي' : 'Suggested time'}: {med.suggested_time.time}
                                        {med.suggested_time.reason && (
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary, #94a3b8)', marginLeft: '0.25rem' }}>
                                                ({med.suggested_time.reason})
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== التوصيات ===== */}
            {recommendations && recommendations.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💡</span> {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recommendations.map((rec, idx) => (
                            <div key={idx} style={{ 
                                background: 'var(--secondary-bg, #f8fafc)', 
                                padding: '0.75rem', 
                                borderRadius: '12px',
                                borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'}`
                            }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    {rec.icon} {rec.title}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
                                    {rec.description}
                                </div>
                                {rec.quick_tip && (
                                    <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                        💡 {rec.quick_tip}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== التوقعات ===== */}
            {predictions && predictions.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔮</span> {isArabic ? 'توقعات الأداء' : 'Performance Predictions'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '0.5rem' }}>
                        {predictions.map((pred, idx) => (
                            <div key={idx} style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>{pred.label}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{pred.value}</div>
                                <div style={{ fontSize: '0.6rem', color: pred.trend === 'up' ? '#10b981' : '#f59e0b' }}>
                                    {pred.trend === 'up' ? '📈 ' + (isArabic ? 'متوقع' : 'Expected') : '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== رسالة إذا لم تكن هناك أدوية ===== */}
            {!hasMedications && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary, #94a3b8)' }}>
                    <span style={{ fontSize: '3rem', opacity: 0.5 }}>💊</span>
                    <p style={{ marginTop: '0.5rem' }}>
                        {isArabic 
                            ? 'لم يتم إضافة أي أدوية بعد. ابحث عن الأدوية وأضفها لتحليل التفاعلات والآثار الجانبية.'
                            : 'No medications added yet. Search and add medications to analyze interactions and side effects.'}
                    </p>
                    <button 
                        onClick={() => {
                            const habitsTab = document.querySelector('.tab-btn');
                            if (habitsTab) habitsTab.click();
                        }}
                        style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        🔍 {isArabic ? 'إضافة دواء' : 'Add Medication'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HabitAnalytics;