// src/components/SmartFeatures/SmartDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
    const [healthScore, setHealthScore] = useState(null);

    const isArabic = i18n.language.startsWith('ar');

    // ===========================================
    // دالة حساب درجة الصحة الشخصية (Health Score)
    // ===========================================
    const calculateHealthScore = useCallback((data) => {
        let score = 0;
        let maxScore = 100;
        const factors = [];

        // 1. النوم (30 نقطة)
        if (data?.sleep?.avgHours) {
            const hours = data.sleep.avgHours;
            let sleepScore = 0;
            let sleepMessage = '';
            
            if (hours >= 7 && hours <= 8) {
                sleepScore = 30;
                sleepMessage = isArabic ? 'مثالي' : 'Ideal';
            } else if (hours >= 6) {
                sleepScore = 20;
                sleepMessage = isArabic ? 'جيد' : 'Good';
            } else if (hours >= 5) {
                sleepScore = 10;
                sleepMessage = isArabic ? 'مقبول' : 'Fair';
            } else {
                sleepScore = 5;
                sleepMessage = isArabic ? 'قليل' : 'Low';
            }
            
            score += sleepScore;
            factors.push({
                name: t('smartDashboard.factors.sleep'),
                score: sleepScore,
                max: 30,
                value: `${hours.toFixed(1)} ${t('smartDashboard.factors.hours')}`,
                status: sleepMessage,
                isGood: sleepScore >= 20
            });
        }

        // 2. المزاج (20 نقطة)
        if (data?.mood?.avgScore) {
            const moodScore = Math.min(20, Math.round(data.mood.avgScore * 4));
            score += moodScore;
            factors.push({
                name: t('smartDashboard.factors.mood'),
                score: moodScore,
                max: 20,
                value: `${data.mood.avgScore.toFixed(1)}/5`,
                status: moodScore >= 16 ? (isArabic ? 'ممتاز' : 'Excellent') : 
                        moodScore >= 12 ? (isArabic ? 'جيد' : 'Good') : 
                        (isArabic ? 'متوسط' : 'Fair'),
                isGood: moodScore >= 12
            });
        }

        // 3. النشاط البدني (20 نقطة)
        if (data?.activity?.weeklyMinutes) {
            const minutes = data.activity.weeklyMinutes;
            let activityScore = 0;
            let activityMessage = '';
            
            if (minutes >= 150) {
                activityScore = 20;
                activityMessage = isArabic ? 'ممتاز' : 'Excellent';
            } else if (minutes >= 100) {
                activityScore = 15;
                activityMessage = isArabic ? 'جيد' : 'Good';
            } else if (minutes >= 50) {
                activityScore = 10;
                activityMessage = isArabic ? 'مقبول' : 'Fair';
            } else {
                activityScore = 5;
                activityMessage = isArabic ? 'قليل' : 'Low';
            }
            
            score += activityScore;
            factors.push({
                name: t('smartDashboard.factors.activity'),
                score: activityScore,
                max: 20,
                value: `${minutes} ${t('smartDashboard.factors.minutesPerWeek')}`,
                status: activityMessage,
                isGood: activityScore >= 15
            });
        }

        // 4. التغذية (15 نقطة)
        if (data?.nutrition?.avgCalories) {
            const calories = data.nutrition.avgCalories;
            let nutritionScore = 0;
            let nutritionMessage = '';
            
            if (calories >= 1800 && calories <= 2500) {
                nutritionScore = 15;
                nutritionMessage = isArabic ? 'متوازنة' : 'Balanced';
            } else if (calories >= 1500) {
                nutritionScore = 10;
                nutritionMessage = isArabic ? 'جيدة' : 'Good';
            } else {
                nutritionScore = 5;
                nutritionMessage = isArabic ? 'منخفضة' : 'Low';
            }
            
            score += nutritionScore;
            factors.push({
                name: t('smartDashboard.factors.nutrition'),
                score: nutritionScore,
                max: 15,
                value: `${Math.round(calories)} ${t('smartDashboard.factors.caloriesPerDay')}`,
                status: nutritionMessage,
                isGood: nutritionScore >= 10
            });
        }

        // 5. العادات (15 نقطة)
        if (data?.habits?.completionRate) {
            const habitsScore = Math.round(data.habits.completionRate * 15);
            score += habitsScore;
            factors.push({
                name: t('smartDashboard.factors.habits'),
                score: habitsScore,
                max: 15,
                value: `${Math.round(data.habits.completionRate * 100)}%`,
                status: habitsScore >= 12 ? (isArabic ? 'ممتاز' : 'Excellent') : 
                        habitsScore >= 8 ? (isArabic ? 'جيد' : 'Good') : 
                        (isArabic ? 'ضعيف' : 'Poor'),
                isGood: habitsScore >= 8
            });
        }

        // درجة الحروف
        const totalScore = Math.min(score, maxScore);
        let grade = '';
        if (totalScore >= 90) grade = 'A+';
        else if (totalScore >= 80) grade = 'A';
        else if (totalScore >= 70) grade = 'B';
        else if (totalScore >= 60) grade = 'C';
        else if (totalScore >= 50) grade = 'D';
        else grade = 'F';

        return {
            total: totalScore,
            max: maxScore,
            factors,
            grade
        };
    }, [t, isArabic]);

    // ===========================================
    // جلب البيانات
    // ===========================================
    const fetchSmartInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = i18n.language.startsWith('en') ? 'en' : 'ar';
            const response = await axiosInstance.get('/analytics/smart-insights/', {
                params: { lang: currentLang }
            });
            
            setInsights(response.data);
            
            // حساب درجة الصحة من البيانات المستلمة
            const insightsData = response.data?.data || {};
            const score = calculateHealthScore({
                sleep: insightsData.summary ? { avgHours: insightsData.summary.avg_sleep } : null,
                mood: insightsData.summary ? { avgScore: insightsData.summary.dominant_mood ? 3.5 : null } : null,
                activity: null,
                nutrition: insightsData.summary ? { avgCalories: insightsData.summary.avg_calories } : null,
                habits: insightsData.summary ? { completionRate: insightsData.summary.completion_rate / 100 } : null
            });
            setHealthScore(score);
            
        } catch (err) {
            console.error('Error fetching smart insights:', err);
            setError(t('smartDashboard.error'));
            
            // بيانات تجريبية للعرض
            const mockScore = calculateHealthScore({
                sleep: { avgHours: 6.2 },
                mood: { avgScore: 3.5 },
                activity: { weeklyMinutes: 120 },
                nutrition: { avgCalories: 2100 },
                habits: { completionRate: 0.75 }
            });
            setHealthScore(mockScore);
            
        } finally {
            setLoading(false);
        }
    }, [i18n.language, t, calculateHealthScore]);

    useEffect(() => {
        fetchSmartInsights();
    }, [fetchSmartInsights]);

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

    if (error && !healthScore) {
        return (
            <div className="smart-error">
                <p>❌ {error}</p>
                <button onClick={fetchSmartInsights} className="retry-btn">
                    🔄 {t('smartDashboard.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="smart-dashboard">
            <div className="dashboard-header">
                <h2>🧠 {t('smartDashboard.title')}</h2>
                <button onClick={fetchSmartInsights} className="refresh-dashboard-btn" title={t('common.refresh')}>
                    🔄
                </button>
            </div>
            
            <div className="smart-grid">
                {/* العمود الأيمن - الطقس والبحث ودرجة الصحة */}
                <div className="smart-column">
                    <WeatherWidget />
                    
                    {/* 🏆 درجة الصحة الشخصية */}
                    {healthScore && (
                        <div className="health-score-card">
                            <div className="score-header">
                                <h3>🏆 {t('smartDashboard.healthScore.title')}</h3>
                                <div className="score-main">
                                    <div className="score-circle" style={{
                                        background: `conic-gradient(#10b981 0% ${healthScore.total}%, #e2e8f0 ${healthScore.total}% 100%)`
                                    }}>
                                        <span>{healthScore.total}</span>
                                    </div>
                                    <span className={`score-grade grade-${healthScore.grade.toLowerCase()}`}>
                                        {healthScore.grade}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="score-factors">
                                {healthScore.factors.map((factor, idx) => (
                                    <div key={idx} className={`factor-item ${factor.isGood ? 'good' : 'bad'}`}>
                                        <div className="factor-header">
                                            <span className="factor-name">{factor.name}</span>
                                            <span className="factor-status">{factor.status}</span>
                                        </div>
                                        <div className="factor-bar">
                                            <div 
                                                className="factor-fill" 
                                                style={{ width: `${(factor.score / factor.max) * 100}%` }}
                                            />
                                        </div>
                                        <div className="factor-footer">
                                            <span className="factor-value">{factor.value}</span>
                                            <span className="factor-score">{factor.score}/{factor.max}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="score-footer">
                                <small>✨ {t('smartDashboard.healthScore.footer')}</small>
                            </div>
                        </div>
                    )}
                    
                    {/* تفسير درجة الصحة إذا كانت منخفضة */}
                    {healthScore && healthScore.total <= 50 && (
                        <div className="score-explanation-card">
                            <div className="explanation-header">
                                <span className="explanation-icon">❓</span>
                                <h4>{isArabic ? 'لماذا هذه الدرجة؟' : 'Why this score?'}</h4>
                            </div>
                            <div className="explanation-content">
                                <p>{isArabic 
                                    ? 'درجة صحتك الحالية تحتاج إلى تحسين. إليك العوامل المؤثرة:' 
                                    : 'Your current health score needs improvement. Here are the affecting factors:'}
                                </p>
                                <ul className="improvement-list">
                                    {healthScore.factors.filter(f => !f.isGood).map((factor, idx) => (
                                        <li key={idx}>
                                            <span className="factor-icon">
                                                {factor.name === t('smartDashboard.factors.sleep') && '😴'}
                                                {factor.name === t('smartDashboard.factors.mood') && '😊'}
                                                {factor.name === t('smartDashboard.factors.activity') && '🏃'}
                                                {factor.name === t('smartDashboard.factors.nutrition') && '🥗'}
                                                {factor.name === t('smartDashboard.factors.habits') && '💊'}
                                            </span>
                                            <span className="factor-text">{factor.name}</span>
                                            <span className="factor-impact">{factor.value}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="improvement-tip">
                                    💡 {isArabic 
                                        ? 'ابدأ بتحسين عامل واحد فقط هذا الأسبوع للحصول على نتائج ملحوظة'
                                        : 'Start by improving just one factor this week for noticeable results'}
                                </div>
                            </div>
                        </div>
                    )}
                    
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
                                    <div className="comparison-bars">
                                        <div className="comparison-item">
                                            <span className="comparison-label">{t('smartDashboard.correlations.goodSleep')}</span>
                                            <div className="comparison-bar">
                                                <div className="comparison-fill" style={{width: '80%'}}>4.5/5</div>
                                            </div>
                                        </div>
                                        <div className="comparison-item">
                                            <span className="comparison-label">{t('smartDashboard.correlations.poorSleep')}</span>
                                            <div className="comparison-bar">
                                                <div className="comparison-fill low" style={{width: '50%'}}>2.8/5</div>
                                            </div>
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
                                    <div className="stat-compare">
                                        <div className="stat-item">
                                            <span className="stat-label">{t('smartDashboard.correlations.withWalking')}</span>
                                            <span className="stat-value good">118</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">{t('smartDashboard.correlations.withoutWalking')}</span>
                                            <span className="stat-value bad">126</span>
                                        </div>
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
                                <div className="rec-header">
                                    <span className="rec-badge urgent">🔴 {t('smartDashboard.recommendations.urgent')}</span>
                                </div>
                                <h4>{t('smartDashboard.recommendations.sleepMore')}</h4>
                                <p>{t('smartDashboard.recommendations.sleepMoreDesc')}</p>
                                <div className="rec-meta">
                                    <span>📊 {t('smartDashboard.recommendations.basedOn')}: {t('smartDashboard.recommendations.sleepCorrelation')}</span>
                                </div>
                            </div>
                            <div className="rec-item important">
                                <div className="rec-header">
                                    <span className="rec-badge important">🟠 {t('smartDashboard.recommendations.important')}</span>
                                </div>
                                <h4>{t('smartDashboard.recommendations.regularActivity')}</h4>
                                <p>{t('smartDashboard.recommendations.regularActivityDesc')}</p>
                                <div className="rec-meta">
                                    <span>🎯 {t('smartDashboard.recommendations.expected')}: -2 {t('smartDashboard.recommendations.kgInTwoWeeks')}</span>
                                </div>
                            </div>
                            <div className="rec-item suggestion">
                                <div className="rec-header">
                                    <span className="rec-badge suggestion">🟢 {t('smartDashboard.recommendations.suggestion')}</span>
                                </div>
                                <h4>{t('smartDashboard.recommendations.balancedNutrition')}</h4>
                                <p>{t('smartDashboard.recommendations.balancedNutritionDesc')}</p>
                                <ul className="suggestions-list">
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
                                <div className="pred-info">
                                    <span className="pred-label">{t('smartDashboard.predictions.weight')}</span>
                                    <span className="pred-value">77.2 {t('smartDashboard.predictions.kg')}</span>
                                </div>
                                <span className="pred-trend down">⬇️ -0.8 {t('smartDashboard.predictions.kg')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">❤️</span>
                                <div className="pred-info">
                                    <span className="pred-label">{t('smartDashboard.predictions.systolic')}</span>
                                    <span className="pred-value">95</span>
                                </div>
                                <span className="pred-trend stable">➡️ {t('smartDashboard.predictions.stable')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">🌙</span>
                                <div className="pred-info">
                                    <span className="pred-label">{t('smartDashboard.predictions.sleep')}</span>
                                    <span className="pred-value">6.5 {t('smartDashboard.predictions.hours')}</span>
                                </div>
                                <span className="pred-trend up">⬆️ +1 {t('smartDashboard.predictions.hour')}</span>
                            </div>
                            <div className="pred-card">
                                <span className="pred-icon">😊</span>
                                <div className="pred-info">
                                    <span className="pred-label">{t('smartDashboard.predictions.mood')}</span>
                                    <span className="pred-value">{t('smartDashboard.predictions.good')}</span>
                                </div>
                                <span className="pred-trend up">⬆️ {t('smartDashboard.predictions.improvement')}</span>
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