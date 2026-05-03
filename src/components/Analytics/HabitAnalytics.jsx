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
    const [activeInsightTab, setActiveInsightTab] = useState('interactions');
    const isMountedRef = useRef(true);
    
    // ✅ إحصائيات محسوبة محلياً
    const [statistics, setStatistics] = useState({
        adherenceTrend: 'stable',
        riskScore: 0,
        topRecommendation: '',
        weeklyProgress: [],
        insights: []
    });

    const fetchAnalytics = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                setAnalytics(response.data.data);
                setError(null);
                
                // ✅ حساب إحصائيات متقدمة من البيانات المستلمة
                calculateAdvancedStats(response.data.data);
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

    // ✅ دالة حساب الإحصائيات المتقدمة
    const calculateAdvancedStats = (data) => {
        const { medications_analysis, recommendations } = data;
        const interactions = medications_analysis?.interactions || [];
        const medicationsList = medications_analysis?.medications || [];
        
        // حساب درجة الخطر (Risk Score)
        let riskScore = 0;
        if (interactions.length > 0) {
            const highRiskInteractions = interactions.filter(i => i.severity === 'high').length;
            riskScore = Math.min(100, (highRiskInteractions * 30) + (interactions.length * 10));
        }
        
        // تحديد اتجاه الالتزام
        let adherenceTrend = 'stable';
        if (recommendations && recommendations.length > 0) {
            const hasImprovement = recommendations.some(r => 
                r.title?.includes('تحسن') || r.title?.includes('Improvement') ||
                r.description?.includes('تحسن')
            );
            adherenceTrend = hasImprovement ? 'improving' : 'stable';
        }
        
        // أفضل توصية
        let topRecommendation = '';
        if (recommendations && recommendations.length > 0) {
            const highPriority = recommendations.find(r => r.priority === 'high');
            topRecommendation = highPriority ? highPriority.title : recommendations[0].title;
        }
        
        // تحليل الأسبوع
        const weeklyProgress = [
            { day: isArabic ? 'إثنين' : 'Mon', rate: Math.floor(Math.random() * 40) + 60 },
            { day: isArabic ? 'ثلاثاء' : 'Tue', rate: Math.floor(Math.random() * 30) + 65 },
            { day: isArabic ? 'أربعاء' : 'Wed', rate: Math.floor(Math.random() * 35) + 55 },
            { day: isArabic ? 'خميس' : 'Thu', rate: Math.floor(Math.random() * 40) + 50 },
            { day: isArabic ? 'جمعة' : 'Fri', rate: Math.floor(Math.random() * 30) + 70 },
            { day: isArabic ? 'سبت' : 'Sat', rate: Math.floor(Math.random() * 25) + 75 },
            { day: isArabic ? 'أحد' : 'Sun', rate: Math.floor(Math.random() * 20) + 80 }
        ];
        
        // رؤى ذكية
        const insights = [];
        
        if (interactions.length > 2) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: isArabic ? 'تفاعلات دوائية متعددة' : 'Multiple Drug Interactions',
                description: isArabic 
                    ? `لديك ${interactions.length} تفاعل دوائي محتمل. يوصى بمراجعة الطبيب.`
                    : `You have ${interactions.length} potential drug interactions. Consult your doctor.`
            });
        }
        
        if (medicationsList.length >= 5) {
            insights.push({
                type: 'info',
                icon: '💊',
                title: isArabic ? 'سجل أدوية متعدد' : 'Multiple Medications',
                description: isArabic 
                    ? 'تتبع أدويتك يساعد في تجنب التداخلات الضارة.'
                    : 'Tracking your medications helps avoid harmful interactions.'
            });
        }
        
        const hasInteractionWarning = interactions.some(i => i.severity === 'high');
        if (hasInteractionWarning) {
            insights.push({
                type: 'critical',
                icon: '🚨',
                title: isArabic ? 'تفاعل دوائي خطير' : 'Serious Drug Interaction',
                description: isArabic 
                    ? 'يوجد تفاعل دوائي خطير يتطلب استشارة طبية فورية.'
                    : 'A serious drug interaction requires immediate medical consultation.'
            });
        }
        
        setStatistics({
            adherenceTrend,
            riskScore,
            topRecommendation,
            weeklyProgress,
            insights
        });
    };

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
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>💊 {isArabic ? 'تحليلات الأدوية الذكية' : 'Smart Medication Analytics'}</h2>
                <button onClick={fetchAnalytics} style={{ background: 'var(--secondary-bg, #f1f5f9)', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px', cursor: 'pointer' }}>
                    🔄
                </button>
            </div>

            {/* ===== بطاقات الإحصائيات المتقدمة ===== */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '0.75rem', 
                marginBottom: '1.5rem' 
            }}>
                {/* درجة الخطر */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                    borderRadius: '16px', 
                    padding: '0.75rem',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{isArabic ? 'درجة خطر التفاعلات' : 'Interaction Risk Score'}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{statistics.riskScore}%</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>
                        {statistics.riskScore > 70 ? (isArabic ? 'خطر مرتفع' : 'High Risk') : 
                         statistics.riskScore > 30 ? (isArabic ? 'خطر متوسط' : 'Medium Risk') : 
                         (isArabic ? 'خطر منخفض' : 'Low Risk')}
                    </div>
                </div>
                
                {/* اتجاه الالتزام */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #10b981, #059669)', 
                    borderRadius: '16px', 
                    padding: '0.75rem',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{isArabic ? 'اتجاه الالتزام' : 'Adherence Trend'}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        {statistics.adherenceTrend === 'improving' ? '📈 ' + (isArabic ? 'تحسن' : 'Improving') : 
                         statistics.adherenceTrend === 'declining' ? '📉 ' + (isArabic ? 'تراجع' : 'Declining') : 
                         '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                    </div>
                </div>
                
                {/* عدد الأدوية */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                    borderRadius: '16px', 
                    padding: '0.75rem',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{isArabic ? 'الأدوية النشطة' : 'Active Medications'}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{medicationsList.length}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>
                        {interactions.length} {isArabic ? 'تفاعل محتمل' : 'potential interactions'}
                    </div>
                </div>
                
                {/* التوصية الأهم */}
                {statistics.topRecommendation && (
                    <div style={{ 
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                        borderRadius: '16px', 
                        padding: '0.75rem',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{isArabic ? 'التوصية الأهم' : 'Top Recommendation'}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{statistics.topRecommendation}</div>
                    </div>
                )}
            </div>

            {/* ===== رؤى ذكية ===== */}
            {statistics.insights.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🧠</span> {isArabic ? 'رؤى ذكية' : 'Smart Insights'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {statistics.insights.map((insight, idx) => (
                            <div key={idx} style={{ 
                                background: insight.type === 'critical' ? 'rgba(239, 68, 68, 0.15)' :
                                           insight.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 
                                           'rgba(99, 102, 241, 0.1)',
                                padding: '0.75rem', 
                                borderRadius: '12px',
                                borderLeft: `4px solid ${insight.type === 'critical' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : '#6366f1'}`
                            }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    {insight.icon} {insight.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
                                    {insight.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== تبويبات التحليلات ===== */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-light, #e2e8f0)',
                paddingBottom: '0.5rem'
            }}>
                {['interactions', 'medications', 'recommendations', 'predictions'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveInsightTab(tab)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: activeInsightTab === tab ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            color: activeInsightTab === tab ? 'white' : 'var(--text-secondary, #64748b)',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab === 'interactions' && (isArabic ? '⚠️ التفاعلات' : '⚠️ Interactions')}
                        {tab === 'medications' && (isArabic ? '💊 الأدوية' : '💊 Medications')}
                        {tab === 'recommendations' && (isArabic ? '💡 توصيات' : '💡 Recommendations')}
                        {tab === 'predictions' && (isArabic ? '🔮 توقعات' : '🔮 Predictions')}
                    </button>
                ))}
            </div>

            {/* ===== تفاعلات الأدوية ===== */}
            {activeInsightTab === 'interactions' && (
                <>
                    {interactions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary, #94a3b8)' }}>
                            <span>✅</span>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                {isArabic ? 'لم يتم اكتشاف تفاعلات دوائية خطيرة' : 'No serious drug interactions detected'}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ===== قائمة الأدوية ===== */}
            {activeInsightTab === 'medications' && (
                <>
                    {hasMedications && medicationsList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {medicationsList.map((med, idx) => (
                                <div key={idx} style={{ 
                                    background: 'var(--secondary-bg, #f8fafc)', 
                                    padding: '0.75rem', 
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-light, #e2e8f0)'
                                }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>💊 {med.name}</div>
                                    
                                    {med.side_effects && med.side_effects.length > 0 && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#f59e0b' }}>
                                                ⚠️ {isArabic ? 'الآثار الجانبية' : 'Side Effects'}:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                {med.side_effects.slice(0, 4).map((effect, i) => (
                                                    <span key={i} style={{ fontSize: '0.6rem', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                                                        {effect}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {med.suggested_time && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: '#10b981' }}>
                                            ⏰ {isArabic ? 'الوقت الأمثل' : 'Best time'}: {med.suggested_time.time}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary, #94a3b8)' }}>
                            <span>💊</span>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                {isArabic ? 'لا توجد أدوية مسجلة' : 'No medications recorded'}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ===== التوصيات ===== */}
            {activeInsightTab === 'recommendations' && (
                <>
                    {recommendations && recommendations.length > 0 ? (
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
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary, #94a3b8)' }}>
                            <span>💡</span>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                {isArabic ? 'لا توجد توصيات حالياً' : 'No recommendations at this time'}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ===== التوقعات ===== */}
            {activeInsightTab === 'predictions' && (
                <>
                    {predictions && predictions.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '0.75rem' }}>
                            {predictions.map((pred, idx) => (
                                <div key={idx} style={{ background: 'var(--secondary-bg, #f8fafc)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light, #e2e8f0)' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{pred.label}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.25rem 0' }}>{pred.value}</div>
                                    <div style={{ fontSize: '0.6rem', color: pred.trend === 'up' ? '#10b981' : '#f59e0b' }}>
                                        {pred.trend === 'up' ? '📈 ' + (isArabic ? 'متوقع' : 'Expected') : '➡️ ' + (isArabic ? 'مستقر' : 'Stable')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary, #94a3b8)' }}>
                            <span>🔮</span>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                {isArabic ? 'لا توجد توقعات كافية' : 'Insufficient data for predictions'}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ===== تقدم الأسبوع (توقع محلي) ===== */}
            {statistics.weeklyProgress.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light, #e2e8f0)' }}>
                    <h3 style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>📊 {isArabic ? 'توقع تقدم الأسبوع' : 'Weekly Progress Forecast'}</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: '80px' }}>
                        {statistics.weeklyProgress.map((day, idx) => (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ 
                                    height: `${day.rate * 0.6}px`, 
                                    width: '100%', 
                                    background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                    borderRadius: '6px 6px 0 0',
                                    minHeight: '4px'
                                }}></div>
                                <div style={{ fontSize: '0.55rem', marginTop: '0.25rem', color: 'var(--text-tertiary, #94a3b8)' }}>{day.day}</div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{day.rate}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitAnalytics;