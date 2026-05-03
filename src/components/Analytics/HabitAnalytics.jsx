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
    const [activeTab, setActiveTab] = useState('summary');
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // ✅ دالة جلب التحليلات المتقدمة من API (scikit-learn)
    const fetchAdvancedAnalytics = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/habits/analytics/?lang=' + (isArabic ? 'ar' : 'en'));
            
            if (!isMountedRef.current) return;
            
            if (response.data?.success && response.data?.data) {
                console.log('📊 Advanced ML Analytics:', response.data.data);
                setAnalyticsData(response.data.data);
            } else {
                throw new Error(response.data?.message || 'Failed to load analytics');
            }
        } catch (err) {
            console.error('Error fetching advanced analytics:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل التحليلات المتقدمة' : 'Error loading advanced analytics');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    useEffect(() => {
        fetchAdvancedAnalytics();
        return () => { isMountedRef.current = false; };
    }, [fetchAdvancedAnalytics, refreshTrigger]);

    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل البيانات...' : 'Analyzing data...'}</p>
                </div>
            </div>
        );
    }

    if (error || !analyticsData) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error">
                    <p>⚠️ {error || (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                    <button onClick={fetchAdvancedAnalytics} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    const { summary, correlations, recommendations, predictions, anomalies, distribution, streak_analysis } = analyticsData;

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>🤖 {isArabic ? 'تحليلات ذكية متقدمة' : 'Advanced AI Analytics'}</h2>
                <button onClick={fetchAdvancedAnalytics} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* ===== بطاقة الملخص الرئيسي ===== */}
            <div className="summary-card">
                <div className="summary-header">
                    <span className="summary-icon">📊</span>
                    <h3>{isArabic ? 'ملخص التحليلات' : 'Analytics Summary'}</h3>
                </div>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'العادات النشطة' : 'Active Habits'}</span>
                        <span className="summary-value">{summary.total_habits || 0}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'الأدوية النشطة' : 'Active Medications'}</span>
                        <span className="summary-value">{summary.active_medications || 0}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'الإنجاز اليومي' : 'Today\'s Completion'}</span>
                        <span className="summary-value">{summary.completion_rate || 0}%</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'الالتزام بالأدوية' : 'Medication Adherence'}</span>
                        <span className="summary-value">{summary.medication_adherence || 0}%</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'السلسلة الحالية' : 'Current Streak'}</span>
                        <span className="summary-value">{summary.streak || 0} {isArabic ? 'يوم' : 'days'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{isArabic ? 'أفضل عادة' : 'Best Habit'}</span>
                        <span className="summary-value">{summary.best_habit || '-'}</span>
                    </div>
                </div>
                <div className="analysis-period">
                    🕒 {isArabic ? 'تحليل آخر' : 'Analysis based on last'} {summary.analysis_days || 10} {isArabic ? 'أيام' : 'days'}
                </div>
            </div>

            {/* التبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'correlations' ? 'active' : ''} onClick={() => setActiveTab('correlations')}>
                    🔗 {isArabic ? 'الارتباطات' : 'Correlations'}
                </button>
                <button className={activeTab === 'recommendations' ? 'active' : ''} onClick={() => setActiveTab('recommendations')}>
                    💡 {isArabic ? 'توصيات ذكية' : 'Recommendations'}
                </button>
                <button className={activeTab === 'predictions' ? 'active' : ''} onClick={() => setActiveTab('predictions')}>
                    🔮 {isArabic ? 'توقعات' : 'Predictions'}
                </button>
                <button className={activeTab === 'anomalies' ? 'active' : ''} onClick={() => setActiveTab('anomalies')}>
                    ⚠️ {isArabic ? 'أنماط شاذة' : 'Anomalies'}
                </button>
                <button className={activeTab === 'distribution' ? 'active' : ''} onClick={() => setActiveTab('distribution')}>
                    📅 {isArabic ? 'توزيع العادات' : 'Distribution'}
                </button>
            </div>

            {/* ===== 1. الارتباطات (Correlations) ===== */}
            {activeTab === 'correlations' && (
                <div className="correlations-section">
                    {correlations && correlations.length > 0 ? (
                        correlations.map((corr, idx) => (
                            <div key={idx} className="correlation-card">
                                <div className="correlation-header">
                                    <span className="correlation-icon">{corr.icon}</span>
                                    <span className="correlation-title">{corr.title}</span>
                                </div>
                                <p className="correlation-description">{corr.description}</p>
                                <div className="correlation-strength">
                                    <span>{isArabic ? 'قوة العلاقة' : 'Strength'}:</span>
                                    <div className="strength-bar">
                                        <div className="strength-fill" style={{ width: `${(corr.strength || 0.5) * 100}%` }}></div>
                                    </div>
                                    <span>{Math.round((corr.strength || 0.5) * 100)}%</span>
                                </div>
                                <div className="correlation-sample">
                                    📊 {corr.sample_size} {isArabic ? 'عينة' : 'samples'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <span>🔍</span>
                            <p>{isArabic ? 'لا توجد ارتباطات كافية للتحليل' : 'Insufficient data for correlation analysis'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 2. التوصيات (Recommendations) ===== */}
            {activeTab === 'recommendations' && (
                <div className="recommendations-section">
                    {recommendations && recommendations.length > 0 ? (
                        recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation-card priority-${rec.priority || 'medium'}`}>
                                <div className="recommendation-header">
                                    <span className="recommendation-icon">{rec.icon}</span>
                                    <span className="recommendation-category">{rec.title}</span>
                                </div>
                                <p className="recommendation-description">{rec.description}</p>
                                {rec.actions && rec.actions.length > 0 && (
                                    <div className="recommendation-actions">
                                        <strong>🎯 {isArabic ? 'إجراءات مقترحة' : 'Suggested Actions'}:</strong>
                                        <ul>
                                            {rec.actions.slice(0, 3).map((action, i) => (
                                                <li key={i}>{action}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {rec.quick_tip && (
                                    <div className="recommendation-quick-tip">
                                        💡 {rec.quick_tip}
                                    </div>
                                )}
                                {rec.based_on && (
                                    <div className="recommendation-based-on">
                                        📊 {rec.based_on}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <span>💡</span>
                            <p>{isArabic ? 'لا توجد توصيات حالياً' : 'No recommendations at this time'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 3. التوقعات (Predictions) ===== */}
            {activeTab === 'predictions' && (
                <div className="predictions-section">
                    {predictions && predictions.length > 0 ? (
                        <div className="predictions-grid">
                            {predictions.map((pred, idx) => (
                                <div key={idx} className="prediction-card">
                                    <div className="prediction-header">
                                        <span className="prediction-icon">{pred.icon}</span>
                                        <span className="prediction-category">{pred.label}</span>
                                    </div>
                                    <div className="prediction-value">{pred.value}</div>
                                    <div className={`prediction-trend trend-${pred.trend}`}>
                                        {pred.trend === 'up' ? '📈' : pred.trend === 'down' ? '📉' : '➡️'} {pred.trend_text}
                                    </div>
                                    <div className="prediction-note">{pred.note}</div>
                                    {pred.confidence && (
                                        <div className="prediction-confidence">
                                            {isArabic ? 'دقة التوقع' : 'Confidence'}: {pred.confidence}%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <span>🔮</span>
                            <p>{isArabic ? 'لا توجد بيانات كافية للتوقعات' : 'Insufficient data for predictions'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 4. الأنماط الشاذة (Anomalies) ===== */}
            {activeTab === 'anomalies' && (
                <div className="anomalies-section">
                    {anomalies && anomalies.anomalies_count > 0 ? (
                        <>
                            {anomalies.recommendation && (
                                <div className="anomaly-recommendation">
                                    💡 {anomalies.recommendation}
                                </div>
                            )}
                            <div className="anomalies-list">
                                {anomalies.anomalies.map((anomaly, idx) => (
                                    <div key={idx} className="anomaly-card">
                                        <span className="anomaly-date">📅 {anomaly.date}</span>
                                        <span className="anomaly-rate">📊 {anomaly.completion_rate}%</span>
                                        <span className="anomaly-type">
                                            {anomaly.anomaly_type === 'low_adherence' 
                                                ? (isArabic ? '⚠️ التزام منخفض غير معتاد' : '⚠️ Unusually low adherence')
                                                : (isArabic ? '🔄 نمط غير معتاد' : '🔄 Unusual pattern')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <span>✅</span>
                            <p>{isArabic ? 'لا توجد أنماط شاذة ملحوظة' : 'No notable anomalous patterns'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 5. توزيع العادات (Distribution) ===== */}
            {activeTab === 'distribution' && (
                <div className="distribution-section">
                    {distribution && distribution.daily_adherence ? (
                        <>
                            <div className="weekly-heatmap">
                                {Object.entries(distribution.daily_adherence).map(([day, rate]) => (
                                    <div key={day} className="day-bar">
                                        <span className="day-name">{isArabic ? {
                                            'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
                                            'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت', 'Sunday': 'الأحد'
                                        }[day] || day : day}</span>
                                        <div className="bar-container">
                                            <div className="bar-fill" style={{ width: `${rate}%`, backgroundColor: rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444' }}></div>
                                        </div>
                                        <span className="day-rate">{rate}%</span>
                                    </div>
                                ))}
                            </div>
                            {distribution.best_day && (
                                <div className="distribution-tip">
                                    🌟 {isArabic 
                                        ? `أفضل أيامك هي ${distribution.best_day}، حاول استغلالها للعادات الأكثر تحدياً`
                                        : `Your best days are ${distribution.best_day}, try to use them for challenging habits`}
                                </div>
                            )}
                            {distribution.worst_day && (
                                <div className="distribution-tip warning">
                                    ⚠️ {isArabic 
                                        ? `أيام ${distribution.worst_day} تحتاج إلى تحسين`
                                        : `${distribution.worst_day} need improvement`}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <span>📊</span>
                            <p>{isArabic ? 'لا توجد بيانات كافية لتوزيع العادات' : 'Insufficient data for distribution analysis'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== تحليل السلسلة (Streak Analysis) ===== */}
            {streak_analysis && streak_analysis.current_streak > 0 && (
                <div className="streak-analysis-card">
                    <div className="streak-header">
                        <span className="streak-icon">🔥</span>
                        <h4>{isArabic ? 'تحليل السلسلة' : 'Streak Analysis'}</h4>
                    </div>
                    <div className="streak-content">
                        <div className="streak-value">{streak_analysis.current_streak} {isArabic ? 'يوم' : 'days'}</div>
                        <div className="streak-level">{streak_analysis.streak_level}</div>
                        {streak_analysis.best_streak > 0 && (
                            <div className="streak-best">
                                🏆 {isArabic ? 'أفضل سلسلة' : 'Best streak'}: {streak_analysis.best_streak} {isArabic ? 'يوم' : 'days'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; border: 1px solid var(--border-light, #eef2f6); }
                .dark-mode .analytics-container { background: #1e293b; border-color: #334155; }
                
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-light, #eef2f6); }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: none; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .refresh-btn:hover { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; transform: rotate(180deg); }
                
                /* بطاقة الملخص */
                .summary-card { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; color: white; }
                .summary-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
                .summary-icon { font-size: 1.5rem; }
                .summary-header h3 { margin: 0; font-size: 1rem; color: white; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
                .summary-item { display: flex; flex-direction: column; background: rgba(255,255,255,0.15); padding: 0.75rem; border-radius: 12px; backdrop-filter: blur(4px); }
                .summary-label { font-size: 0.7rem; opacity: 0.9; }
                .summary-value { font-size: 1.4rem; font-weight: 800; }
                .analysis-period { margin-top: 1rem; font-size: 0.7rem; opacity: 0.8; text-align: center; }
                
                /* التبويبات */
                .analytics-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); flex-wrap: wrap; }
                .analytics-tabs button { padding: 0.5rem 1rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-weight: 600; color: var(--text-secondary, #64748b); transition: all 0.2s; }
                .analytics-tabs button.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
                
                /* الارتباطات */
                .correlation-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .correlation-card { background: #0f172a; border-color: #334155; }
                .correlation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .correlation-icon { font-size: 1.2rem; }
                .correlation-title { font-weight: 700; }
                .correlation-description { font-size: 0.8rem; margin-bottom: 0.5rem; }
                .correlation-strength { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; }
                .strength-bar { flex: 1; height: 4px; background: var(--border-light, #e2e8f0); border-radius: 4px; overflow: hidden; }
                .strength-fill { height: 100%; background: linear-gradient(90deg, #10b981, #6366f1); }
                .correlation-sample { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); margin-top: 0.25rem; }
                
                /* التوصيات */
                .recommendation-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid; }
                .recommendation-card.priority-high { border-left-color: #ef4444; }
                .recommendation-card.priority-medium { border-left-color: #f59e0b; }
                .recommendation-card.priority-low { border-left-color: #10b981; }
                .dark-mode .recommendation-card { background: #0f172a; }
                .recommendation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .recommendation-icon { font-size: 1.2rem; }
                .recommendation-category { font-weight: 700; }
                .recommendation-description { font-size: 0.8rem; margin-bottom: 0.5rem; }
                .recommendation-actions { font-size: 0.75rem; margin-top: 0.5rem; }
                .recommendation-actions ul { margin: 0.25rem 0 0 1rem; }
                .recommendation-quick-tip { font-size: 0.7rem; color: #f59e0b; margin-top: 0.5rem; }
                .recommendation-based-on { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); margin-top: 0.5rem; }
                
                /* التوقعات */
                .predictions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
                .prediction-card { background: var(--secondary-bg, #f8fafc); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); text-align: center; }
                .dark-mode .prediction-card { background: #0f172a; border-color: #334155; }
                .prediction-header { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .prediction-icon { font-size: 1.2rem; }
                .prediction-category { font-weight: 700; font-size: 0.7rem; }
                .prediction-value { font-size: 1.5rem; font-weight: 800; margin: 0.5rem 0; }
                .prediction-trend { font-size: 0.7rem; margin-bottom: 0.5rem; }
                .prediction-trend.trend-up { color: #10b981; }
                .prediction-trend.trend-down { color: #ef4444; }
                .prediction-note { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                .prediction-confidence { font-size: 0.6rem; margin-top: 0.5rem; color: #6366f1; }
                
                /* الأنماط الشاذة */
                .anomaly-recommendation { background: rgba(239,68,68,0.1); padding: 0.75rem; border-radius: 12px; margin-bottom: 1rem; font-size: 0.8rem; }
                .anomaly-card { display: flex; gap: 1rem; align-items: center; background: var(--secondary-bg, #f8fafc); padding: 0.75rem; border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .anomaly-date { font-size: 0.75rem; font-weight: 600; }
                .anomaly-rate { font-size: 0.7rem; }
                .anomaly-type { font-size: 0.7rem; color: #ef4444; }
                
                /* توزيع العادات */
                .weekly-heatmap { display: flex; flex-direction: column; gap: 0.5rem; }
                .day-bar { display: flex; align-items: center; gap: 0.5rem; }
                .day-name { width: 80px; font-size: 0.7rem; font-weight: 600; }
                .bar-container { flex: 1; height: 8px; background: var(--border-light, #e2e8f0); border-radius: 4px; overflow: hidden; }
                .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
                .day-rate { width: 40px; font-size: 0.7rem; text-align: right; }
                .distribution-tip { margin-top: 1rem; padding: 0.5rem; background: rgba(16,185,129,0.1); border-radius: 12px; font-size: 0.7rem; }
                .distribution-tip.warning { background: rgba(239,68,68,0.1); color: #ef4444; }
                
                /* تحليل السلسلة */
                .streak-analysis-card { margin-top: 1.5rem; background: linear-gradient(135deg, #f59e0b20, #ef444420); border-radius: 16px; padding: 1rem; border: 1px solid #f59e0b40; }
                .streak-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .streak-icon { font-size: 1.3rem; }
                .streak-header h4 { margin: 0; font-size: 0.9rem; }
                .streak-content { text-align: center; }
                .streak-value { font-size: 2rem; font-weight: 800; }
                .streak-level { font-size: 0.7rem; color: var(--text-secondary, #64748b); }
                .streak-best { font-size: 0.7rem; margin-top: 0.5rem; }
                
                .empty-state { text-align: center; padding: 2rem; color: var(--text-tertiary, #94a3b8); }
                .empty-state span { font-size: 3rem; opacity: 0.5; }
                
                @media (max-width: 768px) { 
                    .summary-grid { grid-template-columns: repeat(2, 1fr); }
                    .predictions-grid { grid-template-columns: 1fr; }
                    .analytics-tabs button { font-size: 0.7rem; padding: 0.3rem 0.8rem; }
                }
            `}</style>
        </div>
    );
};

export default HabitAnalytics;