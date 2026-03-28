// src/components/SmartFeatures/SmartDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import WeatherWidget from './WeatherWidget';
import FoodSearch from './FoodSearch';
import './SmartFeatures.css';

const SmartDashboard = () => {
    const { t, i18n } = useTranslation();
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ معرفة إذا كانت اللغة العربية
    const isArabic = i18n.language.startsWith('ar');

    // ===========================================
    // دالة حساب درجة الصحة الشخصية (Health Score)
    // ===========================================
    const calculateHealthScore = (insights) => {
        let score = 0;
        let maxScore = 100;
        const factors = [];

        // 1. النوم (30 نقطة)
        if (insights?.sleep?.avgHours) {
            const sleepScore = insights.sleep.avgHours >= 7 && insights.sleep.avgHours <= 8 ? 30 :
                              insights.sleep.avgHours >= 6 ? 20 :
                              insights.sleep.avgHours >= 5 ? 10 : 5;
            score += sleepScore;
            factors.push({
                name: t('smartDashboard.factors.sleep'),
                score: sleepScore,
                max: 30,
                value: insights.sleep.avgHours.toFixed(1) + ' ' + t('smartDashboard.factors.hours')
            });
        }

        // 2. المزاج (20 نقطة)
        if (insights?.mood?.avgScore) {
            const moodScore = Math.round(insights.mood.avgScore * 4);
            score += moodScore;
            factors.push({
                name: t('smartDashboard.factors.mood'),
                score: moodScore,
                max: 20,
                value: insights.mood.avgScore.toFixed(1) + '/5'
            });
        }

        // 3. النشاط البدني (20 نقطة)
        if (insights?.activity?.weeklyMinutes) {
            const activityScore = insights.activity.weeklyMinutes >= 150 ? 20 :
                                 insights.activity.weeklyMinutes >= 100 ? 15 :
                                 insights.activity.weeklyMinutes >= 50 ? 10 : 5;
            score += activityScore;
            factors.push({
                name: t('smartDashboard.factors.activity'),
                score: activityScore,
                max: 20,
                value: insights.activity.weeklyMinutes + ' ' + t('smartDashboard.factors.minutesPerWeek')
            });
        }

        // 4. التغذية (15 نقطة)
        if (insights?.nutrition?.avgCalories) {
            const caloriesScore = insights.nutrition.avgCalories >= 1800 && insights.nutrition.avgCalories <= 2500 ? 15 :
                                 insights.nutrition.avgCalories >= 1500 ? 10 : 5;
            score += caloriesScore;
            factors.push({
                name: t('smartDashboard.factors.nutrition'),
                score: caloriesScore,
                max: 15,
                value: insights.nutrition.avgCalories + ' ' + t('smartDashboard.factors.caloriesPerDay')
            });
        }

        // 5. العادات (15 نقطة)
        if (insights?.habits?.completionRate) {
            const habitsScore = Math.round(insights.habits.completionRate * 15);
            score += habitsScore;
            factors.push({
                name: t('smartDashboard.factors.habits'),
                score: habitsScore,
                max: 15,
                value: Math.round(insights.habits.completionRate * 100) + '%'
            });
        }

        // درجة الحروف
        let grade = '';
        if (score >= 90) grade = 'A+';
        else if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 50) grade = 'D';
        else grade = 'F';

        return {
            total: Math.min(score, maxScore),
            max: maxScore,
            factors,
            grade
        };
    };

    useEffect(() => {
        fetchSmartInsights();
    }, []);

    const fetchSmartInsights = async () => {
        setLoading(true);
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            const response = await axiosInstance.get('/api/analytics/smart-insights/', {
                params: { lang: currentLang }
            });
            setInsights(response.data);
        } catch (err) {
            console.error('Error fetching smart insights:', err);
            setError(t('smartDashboard.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFoodSelect = (food) => {
        console.log('Selected food:', food);
        alert(`${t('smartDashboard.foodSelected')}: ${food.name}\n${t('smartDashboard.calories')}: ${food.calories} ${t('smartDashboard.caloriesUnit')}`);
    };

    if (loading) {
        return (
            <div className="smart-loading">
                <div className="spinner"></div>
                <p>🧠 {t('smartDashboard.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="smart-error">
                <p>❌ {error}</p>
                <button onClick={fetchSmartInsights} className="retry-btn">
                    🔄 {t('smartDashboard.retry')}
                </button>
            </div>
        );
    }

    // بيانات تجريبية للعرض (سيتم استبدالها بالبيانات الحقيقية من API)
    const mockInsights = {
        sleep: { avgHours: 6.2 },
        mood: { avgScore: 3.5 },
        activity: { weeklyMinutes: 120 },
        nutrition: { avgCalories: 2100 },
        habits: { completionRate: 0.75 }
    };

    const healthScore = calculateHealthScore(insights?.data || mockInsights);

    return (
        <div className="smart-dashboard">
            <h2>🧠 {t('smartDashboard.title')}</h2>
            
            <div className="smart-grid">
                {/* العمود الأيمن - الطقس والبحث */}
                <div className="smart-column">
                    <div className="smart-card">
                        <WeatherWidget />
                    </div>
                    
                    {/* 🏆 درجة الصحة الشخصية */}
                    <div className="health-score-card">
                        <div className="score-header">
                            <h3>🏆 {t('smartDashboard.healthScore.title')}</h3>
                            <div className="score-main">
                                <div className="score-circle" style={{
                                    background: `conic-gradient(#4caf50 0% ${healthScore.total}%, #ddd ${healthScore.total}% 100%)`
                                }}>
                                    <span>{healthScore.total}</span>
                                </div>
                                <span className="score-grade">{healthScore.grade}</span>
                            </div>
                        </div>
                        <div className="score-factors">
                            {healthScore.factors.map((factor, idx) => (
                                <div key={idx} className="factor">
                                    <div className="factor-header">
                                        <span className="factor-name">{factor.name}</span>
                                        <span className="factor-value">{factor.value}</span>
                                    </div>
                                    <div className="factor-bar">
                                        <div className="factor-fill" style={{
                                            width: `${(factor.score / factor.max) * 100}%`,
                                            background: factor.score / factor.max > 0.7 ? '#4caf50' :
                                                    factor.score / factor.max > 0.4 ? '#ff9800' : '#f44336'
                                        }}></div>
                                    </div>
                                    <span className="factor-score">{factor.score}/{factor.max}</span>
                                </div>
                            ))}
                        </div>
                        <div className="score-footer">
                            <small>✨ {t('smartDashboard.healthScore.footer')}</small>
                        </div>
                    </div>
                    
                    <div className="smart-card">
                        <h3>🥗 {t('smartDashboard.foodSearch.title')}</h3>
                        <FoodSearch onSelectFood={handleFoodSelect} />
                    </div>
                </div>

                {/* العمود الأيسر - التحليلات الذكية */}
                <div className="smart-column main">
                    
                    {/* 🔗 العلاقات المكتشفة */}
                    <section className="correlations-section">
                        <h3>🔗 {t('smartDashboard.correlations.title')}</h3>
                        <div className="correlations-list">
                            <div className="correlation-item strength-high">
                                <div className="correlation-header">
                                    <span className="corr-icon">😊</span>
                                    <h4>{t('smartDashboard.correlations.sleepMood')}</h4>
                                    <span className="strength-badge">{t('smartDashboard.correlations.strength')} 82%</span>
                                </div>
                                <p className="correlation-insight">
                                    <span className="insight-highlight">{t('smartDashboard.correlations.sleepLow')}</span>
                                    {isArabic ? '، مزاجك في اليوم التالي يكون أقل بنسبة 40%' : ', your mood the next day is 40% lower'}
                                </p>
                                <div className="correlation-visual">
                                    <div className="bar-chart">
                                        <div className="bar">
                                            <span className="bar-label">{t('smartDashboard.correlations.goodSleep')}</span>
                                            <div className="bar-fill" style={{width: '80%'}}>4.5/5</div>
                                        </div>
                                        <div className="bar">
                                            <span className="bar-label">{t('smartDashboard.correlations.poorSleep')}</span>
                                            <div className="bar-fill low" style={{width: '50%'}}>2.8/5</div>
                                        </div>
                                    </div>
                                </div>
                                <small className="correlation-based">{t('smartDashboard.correlations.basedOn')} 15 {t('smartDashboard.correlations.days')}</small>
                            </div>

                            <div className="correlation-item strength-medium">
                                <div className="correlation-header">
                                    <span className="corr-icon">❤️</span>
                                    <h4>{t('smartDashboard.correlations.activityPressure')}</h4>
                                    <span className="strength-badge">{t('smartDashboard.correlations.strength')} 75%</span>
                                </div>
                                <p className="correlation-insight">
                                    <span className="insight-highlight">{t('smartDashboard.correlations.walkingDays')}</span>
                                    {isArabic ? '، ضغطك الانقباضي أقل بـ 8 نقاط' : ', your systolic pressure is 8 points lower'}
                                </p>
                                <div className="correlation-stats">
                                    <div className="stat">
                                        <span className="stat-label">{t('smartDashboard.correlations.withWalking')}</span>
                                        <span className="stat-value good">118</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">{t('smartDashboard.correlations.withoutWalking')}</span>
                                        <span className="stat-value bad">126</span>
                                    </div>
                                </div>
                            </div>

                            <div className="correlation-item strength-low">
                                <div className="correlation-header">
                                    <span className="corr-icon">🥗</span>
                                    <h4>{t('smartDashboard.correlations.caffeineSleep')}</h4>
                                    <span className="strength-badge">{t('smartDashboard.correlations.strength')} 65%</span>
                                </div>
                                <p className="correlation-insight">
                                    <span className="insight-highlight">{t('smartDashboard.correlations.caffeineAfter')}</span>
                                    {isArabic ? ' يقلل نومك بمعدل ساعتين' : ' reduces your sleep by 2 hours'}
                                </p>
                                <div className="correlation-note">
                                    {t('smartDashboard.correlations.discoveredIn')} 5 {t('smartDashboard.correlations.outOf')} 7 {t('smartDashboard.correlations.days')}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 🎯 توصيات مخصصة متكاملة */}
                    <section className="recommendations-section">
                        <h3>🎯 {t('smartDashboard.recommendations.title')}</h3>
                        <div className="recommendations-timeline">
                            <div className="rec-item urgent">
                                <span className="rec-badge">🔴 {t('smartDashboard.recommendations.urgent')}</span>
                                <h4>{t('smartDashboard.recommendations.sleepMore')}</h4>
                                <p>{t('smartDashboard.recommendations.sleepMoreDesc')}</p>
                                <div className="rec-meta">
                                    <span>{t('smartDashboard.recommendations.basedOn')}: {t('smartDashboard.recommendations.sleepCorrelation')}</span>
                                </div>
                            </div>
                            <div className="rec-item important">
                                <span className="rec-badge">🟠 {t('smartDashboard.recommendations.important')}</span>
                                <h4>{t('smartDashboard.recommendations.regularActivity')}</h4>
                                <p>{t('smartDashboard.recommendations.regularActivityDesc')}</p>
                                <div className="rec-meta">
                                    <span>{t('smartDashboard.recommendations.expected')}: -2 {t('smartDashboard.recommendations.kgInTwoWeeks')}</span>
                                </div>
                            </div>
                            <div className="rec-item suggestion">
                                <span className="rec-badge">🟢 {t('smartDashboard.recommendations.suggestion')}</span>
                                <h4>{t('smartDashboard.recommendations.balancedNutrition')}</h4>
                                <p>{t('smartDashboard.recommendations.balancedNutritionDesc')}</p>
                                <ul>
                                    <li>✓ {t('smartDashboard.recommendations.addEgg')}</li>
                                    <li>✓ {t('smartDashboard.recommendations.greekYogurt')}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 🔮 توقعات للأسبوع القادم */}
                    <section className="predictions-section">
                        <h3>🔮 {t('smartDashboard.predictions.title')}</h3>
                        <div className="predictions-grid">
                            <div className="pred-card">
                                <span className="pred-icon">⚖️</span>
                                <span className="pred-label">{t('smartDashboard.predictions.weight')}</span>
                                <span className="pred-value">77.2 {t('smartDashboard.predictions.kg')}</span>
                                <span className="pred-trend">⬇️ -0.8 {t('smartDashboard.predictions.kg')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">❤️</span>
                                <span className="pred-label">{t('smartDashboard.predictions.systolic')}</span>
                                <span className="pred-value">95</span>
                                <span className="pred-trend">➡️ {t('smartDashboard.predictions.stable')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">🌙</span>
                                <span className="pred-label">{t('smartDashboard.predictions.sleep')}</span>
                                <span className="pred-value">6.5 {t('smartDashboard.predictions.hours')}</span>
                                <span className="pred-trend">⬆️ +1 {t('smartDashboard.predictions.hour')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">😊</span>
                                <span className="pred-label">{t('smartDashboard.predictions.mood')}</span>
                                <span className="pred-value">{t('smartDashboard.predictions.good')}</span>
                                <span className="pred-trend">⬆️ {t('smartDashboard.predictions.improvement')}</span>
                            </div>
                        </div>
                        <p className="prediction-note">
                            * {t('smartDashboard.predictions.note')}
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SmartDashboard;