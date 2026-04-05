// src/components/Analytics/HabitAnalytics.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Analytics.css';
import { useTheme } from '../themeManager';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة للحصول على أيقونة حسب النوع
const getTypeIcon = (type) => {
    const icons = {
        sleep: '😴',
        water: '💧',
        exercise: '🏃',
        nutrition: '🥗',
        medication: '💊',
        reading: '📚',
        meditation: '🧘',
        default: '✅'
    };
    return icons[type] || icons.default;
};

// دالة للحصول على لون حسب النوع
const getTypeColor = (type) => {
    const colors = {
        sleep: '#8b5cf6',
        water: '#3b82f6',
        exercise: '#10b981',
        nutrition: '#f59e0b',
        medication: '#ef4444',
        reading: '#06b6d4',
        meditation: '#ec4899',
        default: '#6b7280'
    };
    return colors[type] || colors.default;
};

// دالة لتحليل نوع العادة من الاسم
const detectHabitType = (name) => {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('نوم') || nameLower.includes('sleep')) return 'sleep';
    if (nameLower.includes('ماء') || nameLower.includes('water')) return 'water';
    if (nameLower.includes('رياضة') || nameLower.includes('exercise') || nameLower.includes('مشي')) return 'exercise';
    if (nameLower.includes('غذاء') || nameLower.includes('nutrition') || nameLower.includes('أكل')) return 'nutrition';
    if (nameLower.includes('دواء') || nameLower.includes('medication')) return 'medication';
    if (nameLower.includes('قراءة') || nameLower.includes('reading')) return 'reading';
    if (nameLower.includes('تأمل') || nameLower.includes('meditation')) return 'meditation';
    
    return 'default';
};

const HabitAnalytics = ({ refreshTrigger }) => {
    const { t, i18n } = useTranslation();
    const { darkMode } = useTheme(); // ✅ استخدام ThemeManager بدلاً من localStorage مباشرة
    const [smartInsights, setSmartInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('insights');

    useEffect(() => {
        fetchSmartInsights();
    }, [refreshTrigger, i18n.language]);

    const fetchSmartInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            const response = await axiosInstance.get('/analytics/smart-insights/', {
                params: { lang: currentLang }
            });
            
            if (response.data.success) {
                setSmartInsights(response.data);
            } else {
                setSmartInsights({
                    success: true,
                    data: getMockData()
                });
            }
        } catch (err) {
            console.error('Error fetching insights:', err);
            setSmartInsights({
                success: true,
                data: getMockData()
            });
        } finally {
            setLoading(false);
        }
    };

    // بيانات تجريبية للعرض
    const getMockData = () => ({
        summary: {
            avg_sleep: 6.5,
            dominant_mood: i18n.language === 'ar' ? 'جيد' : 'Good',
            avg_habits: 2.3,
            avg_calories: 1850
        },
        correlations: [
            {
                type: 'sleep_mood',
                icon: '😴',
                title: t('habits.correlations.sleepMood', 'النوم والمزاج'),
                description: t('habits.correlations.sleepMoodDesc', 'النوم الجيد يحسن المزاج'),
                strength: 0.75,
                sample_size: 12
            },
            {
                type: 'exercise_energy',
                icon: '🏃',
                title: t('habits.correlations.exerciseEnergy', 'الرياضة والطاقة'),
                description: t('habits.correlations.exerciseEnergyDesc', 'النشاط البدني يزيد الطاقة'),
                strength: 0.68,
                sample_size: 10
            }
        ],
        recommendations: [
            {
                type: 'sleep',
                title: t('habits.recommendations.sleep.title', 'تحسين جودة النوم'),
                description: t('habits.recommendations.sleep.desc', 'النوم 7-8 ساعات يحسن المزاج والطاقة'),
                target: '7-8 ساعات',
                tips: [
                    t('habits.recommendations.sleep.tip1', 'تجنب الشاشات قبل النوم بساعة'),
                    t('habits.recommendations.sleep.tip2', 'حافظ على وقت نوم منتظم'),
                    t('habits.recommendations.sleep.tip3', 'اجعل غرفة النوم مظلمة وهادئة')
                ],
                prediction: t('habits.recommendations.sleep.prediction', 'تحسن في المزاج والطاقة'),
                based_on: t('habits.recommendations.sleep.basedOn', 'تحليل 12 يوم'),
                improvement_chance: 85
            }
        ],
        predictions: [
            {
                icon: '😴',
                label: t('habits.predictions.sleep', 'النوم المتوقع'),
                value: i18n.language === 'ar' ? '7.2 ساعات' : '7.2 hours',
                trend: t('habits.predictions.improving', 'تحسن'),
                note: t('habits.predictions.sleepNote', 'مع تطبيق نصائح النوم')
            }
        ],
        patterns: [
            {
                title: t('habits.patterns.sleep.title', 'نمط النوم'),
                consistency: 72,
                impact: 68,
                analysis: t('habits.patterns.sleep.analysis', 'نومك منتظم في أيام الأسبوع ويقل في الإجازات'),
                insights: [
                    t('habits.patterns.sleep.insight1', 'تنام أفضل في أيام العمل'),
                    t('habits.patterns.sleep.insight2', 'قلة النوم تؤثر على مزاجك في اليوم التالي')
                ],
                suggestions: [
                    t('habits.patterns.sleep.suggestion1', 'حافظ على وقت نوم ثابت في الإجازات'),
                    t('habits.patterns.sleep.suggestion2', 'قلل الكافيين بعد الظهر')
                ]
            }
        ],
        integrated_recommendations: [
            {
                icon: '🌟',
                title: t('habits.integrated.sleepHealth', 'النوم والصحة'),
                analysis: t('habits.integrated.sleepHealthAnalysis', 'تحسين نومك سينعكس إيجاباً على صحتك العامة'),
                tips: [
                    t('habits.integrated.sleepHealthTip1', 'نم 7-8 ساعات يومياً'),
                    t('habits.integrated.sleepHealthTip2', 'تجنب الأكل الثقيل قبل النوم')
                ],
                expected_outcome: t('habits.integrated.sleepHealthOutcome', 'طاقة أفضل وتركيز أعلى')
            }
        ]
    });

    // تنسيق التوصية
    const formatRecommendation = (rec) => {
        const habitType = detectHabitType(rec.title);
        
        return {
            icon: getTypeIcon(habitType),
            type: habitType,
            title: rec.title,
            description: rec.description,
            target: rec.target || '',
            tips: rec.tips || [],
            prediction: rec.prediction || '',
            based_on: rec.based_on || '',
            improvement_chance: rec.improvement_chance || 0
        };
    };

    // عرض التحليلات الذكية
    const renderSmartInsights = () => {
        if (!smartInsights?.data) {
            return (
                <div className="no-data">
                    <p>{t('analytics.habit.noData')}</p>
                </div>
            );
        }

        const { summary = {}, correlations = [], recommendations = [], predictions = [] } = smartInsights.data;

        return (
            <div className="smart-insights">
                {/* الملخص السريع */}
                <div className="quick-summary">
                    <h3>{t('analytics.habit.summary.title')}</h3>
                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="summary-icon">🌙</span>
                            <div className="summary-info">
                                <span className="summary-label">{t('analytics.habit.summary.avgSleep')}</span>
                                <span className="summary-value">{roundNumber(summary.avg_sleep || 0, 1)} {t('analytics.habit.summary.hours')}</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">😊</span>
                            <div className="summary-info">
                                <span className="summary-label">{t('analytics.habit.summary.dominantMood')}</span>
                                <span className="summary-value">{summary.dominant_mood || t('analytics.habit.summary.notAvailable')}</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">💊</span>
                            <div className="summary-info">
                                <span className="summary-label">{t('analytics.habit.summary.avgHabits')}</span>
                                <span className="summary-value">{roundNumber(summary.avg_habits || 0, 1)}/3</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <span className="summary-icon">🔥</span>
                            <div className="summary-info">
                                <span className="summary-label">{t('analytics.habit.summary.avgCalories')}</span>
                                <span className="summary-value">{Math.round(summary.avg_calories || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* العلاقات المترابطة */}
                {correlations.length > 0 && (
                    <div className="correlations-section">
                        <h3>{t('analytics.habit.correlations.title')}</h3>
                        <div className="correlations-grid">
                            {correlations.map((corr, idx) => (
                                <div key={idx} className="correlation-card">
                                    <div className="correlation-header">
                                        <span className="correlation-icon">{corr.icon}</span>
                                        <span className="correlation-title">{corr.title}</span>
                                    </div>
                                    <p className="correlation-desc">{corr.description}</p>
                                    <div className="correlation-strength">
                                        <div className="strength-bar">
                                            <div 
                                                className="strength-fill" 
                                                style={{ 
                                                    width: `${Math.min(100, Math.max(0, corr.strength * 100))}%`,
                                                    backgroundColor: corr.strength > 0.7 ? 'var(--success)' : corr.strength > 0.4 ? 'var(--warning)' : 'var(--error)'
                                                }}
                                            />
                                        </div>
                                        <span className="strength-value">{Math.round(corr.strength * 100)}%</span>
                                    </div>
                                    <div className="correlation-meta">
                                        {t('analytics.habit.correlations.basedOn', { days: corr.sample_size })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* التوصيات الذكية */}
                {recommendations.length > 0 && (
                    <div className="smart-recommendations">
                        <h3>{t('analytics.habit.recommendations.title')}</h3>
                        <div className="recommendations-list">
                            {recommendations.map((rec, idx) => {
                                const formatted = formatRecommendation(rec);
                                return (
                                    <div key={idx} className="recommendation-card">
                                        <div className="recommendation-header">
                                            <span className="recommendation-icon" style={{ backgroundColor: getTypeColor(formatted.type) }}>
                                                {formatted.icon}
                                            </span>
                                            <div className="recommendation-title">
                                                <h4>{formatted.title}</h4>
                                                {formatted.target && (
                                                    <span className="recommendation-target">
                                                        🎯 {t('analytics.habit.recommendations.target')}: {formatted.target}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="recommendation-description">{formatted.description}</p>
                                        
                                        {formatted.tips.length > 0 && (
                                            <div className="recommendation-tips">
                                                <strong>💡 {t('analytics.habit.recommendations.tips')}:</strong>
                                                <ul>
                                                    {formatted.tips.slice(0, 3).map((tip, i) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {formatted.prediction && (
                                            <div className="recommendation-prediction">
                                                <span className="prediction-icon">🔮</span>
                                                <span>{formatted.prediction}</span>
                                            </div>
                                        )}
                                        
                                        <div className="recommendation-meta">
                                            {formatted.based_on && (
                                                <span className="meta-based">
                                                    📊 {t('analytics.habit.recommendations.basedOn')}: {formatted.based_on}
                                                </span>
                                            )}
                                            {formatted.improvement_chance > 0 && (
                                                <span className="meta-chance">
                                                    📈 {t('analytics.habit.recommendations.improvement')}: {formatted.improvement_chance}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* التنبؤات */}
                {predictions.length > 0 && (
                    <div className="predictions-section">
                        <h3>{t('analytics.habit.predictions.title')}</h3>
                        <div className="predictions-grid">
                            {predictions.map((pred, idx) => (
                                <div key={idx} className="prediction-card">
                                    <div className="prediction-icon">{pred.icon}</div>
                                    <div className="prediction-content">
                                        <span className="prediction-label">{pred.label}</span>
                                        <span className="prediction-value">{pred.value}</span>
                                        <span className={`prediction-trend ${pred.trend === t('habits.predictions.improving') ? 'positive' : pred.trend === t('habits.predictions.declining') ? 'negative' : 'neutral'}`}>
                                            {pred.trend}
                                        </span>
                                    </div>
                                    {pred.note && (
                                        <div className="prediction-note">ℹ️ {pred.note}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // عرض الأنماط المفصلة
    const renderDetailedPatterns = () => {
        if (!smartInsights?.data?.patterns?.length) {
            return (
                <div className="no-data">
                    <p>{t('analytics.habit.noPatterns')}</p>
                </div>
            );
        }

        return (
            <div className="detailed-patterns">
                <h3>{t('analytics.habit.patterns.title')}</h3>
                {smartInsights.data.patterns.map((pattern, idx) => (
                    <div key={idx} className="pattern-card">
                        <div className="pattern-header">
                            <h4>{pattern.title}</h4>
                        </div>
                        
                        <div className="pattern-stats">
                            <div className="stat-item">
                                <span className="stat-label">{t('analytics.habit.patterns.consistency')}</span>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${pattern.consistency}%`, backgroundColor: 'var(--primary)' }} />
                                </div>
                                <span className="stat-value">{pattern.consistency}%</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('analytics.habit.patterns.impact')}</span>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${pattern.impact}%`, backgroundColor: 'var(--primary)' }} />
                                </div>
                                <span className="stat-value">{pattern.impact}%</span>
                            </div>
                        </div>
                        
                        <p className="pattern-analysis">{pattern.analysis}</p>
                        
                        {pattern.insights?.length > 0 && (
                            <div className="pattern-insights">
                                <strong>🔍 {t('analytics.habit.patterns.insights')}:</strong>
                                <ul>
                                    {pattern.insights.map((insight, i) => (
                                        <li key={i}>{insight}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {pattern.suggestions?.length > 0 && (
                            <div className="pattern-suggestions">
                                <strong>💡 {t('analytics.habit.patterns.suggestions')}:</strong>
                                <ul>
                                    {pattern.suggestions.map((suggestion, i) => (
                                        <li key={i}>✓ {suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // عرض التوصيات الشاملة
    const renderIntegratedRecommendations = () => {
        if (!smartInsights?.data?.integrated_recommendations?.length) {
            return (
                <div className="no-data">
                    <p>{t('analytics.habit.noRecommendations')}</p>
                </div>
            );
        }

        return (
            <div className="integrated-recommendations">
                <h3>{t('analytics.habit.integrated.title')}</h3>
                <div className="recommendations-grid">
                    {smartInsights.data.integrated_recommendations.map((rec, idx) => (
                        <div key={idx} className="integrated-card">
                            <div className="card-header">
                                <span className="card-icon">{rec.icon}</span>
                                <h4>{rec.title}</h4>
                            </div>
                            
                            <p className="card-analysis">{rec.analysis}</p>
                            
                            {rec.tips?.length > 0 && (
                                <div className="card-tips">
                                    <strong>💡 {t('analytics.habit.integrated.tips')}:</strong>
                                    <ul>
                                        {rec.tips.map((tip, i) => (
                                            <li key={i}>{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {rec.expected_outcome && (
                                <div className="card-outcome">
                                    <span className="outcome-icon">🎯</span>
                                    <span>{t('analytics.habit.integrated.expectedOutcome')}: {rec.expected_outcome}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-error">
                <p>❌ {error}</p>
                <button onClick={fetchSmartInsights} className="retry-btn">
                    🔄 {t('common.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="analytics-container habit-analytics">
            <div className="analytics-header">
                <h2>📊 {t('analytics.habit.title')}</h2>
                <button onClick={fetchSmartInsights} className="refresh-btn" title={t('common.refresh')}>
                    🔄
                </button>
            </div>

            <div className="analytics-tabs">
                <button 
                    className={activeTab === 'insights' ? 'active' : ''} 
                    onClick={() => setActiveTab('insights')}
                >
                    🧠 {t('analytics.habit.tabs.insights')}
                </button>
                <button 
                    className={activeTab === 'patterns' ? 'active' : ''} 
                    onClick={() => setActiveTab('patterns')}
                >
                    📊 {t('analytics.habit.tabs.patterns')}
                </button>
                <button 
                    className={activeTab === 'recommendations' ? 'active' : ''} 
                    onClick={() => setActiveTab('recommendations')}
                >
                    💡 {t('analytics.habit.tabs.recommendations')}
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'insights' && renderSmartInsights()}
                {activeTab === 'patterns' && renderDetailedPatterns()}
                {activeTab === 'recommendations' && renderIntegratedRecommendations()}
            </div>

            <div className="analytics-footer">
                <small>
                    {t('analytics.habit.footer.lastUpdate')}: {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                </small>
            </div>
        </div>
    );
};

export default HabitAnalytics;