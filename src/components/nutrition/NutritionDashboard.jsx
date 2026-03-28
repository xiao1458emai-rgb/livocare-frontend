'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import '../../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لدمج العناصر المكررة
const mergeDuplicateItems = (items) => {
    const merged = {};
    items.forEach(item => {
        const key = `${item.name}_${item.unit}`;
        if (merged[key]) {
            merged[key].quantity += item.quantity;
            merged[key].calories += item.calories;
            merged[key].protein += item.protein;
            merged[key].carbs += item.carbs;
            merged[key].fat += item.fat;
        } else {
            merged[key] = { ...item };
        }
    });
    return Object.values(merged);
};

function NutritionDashboard({ meals, loading, onRefresh }) {
    const { t, i18n } = useTranslation();
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [nutritionInsights, setNutritionInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [nutritionGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 50,
        dailyCarbs: 250,
        dailyFat: 70
    });

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // جلب التحليلات المتقدمة
    useEffect(() => {
        if (activeTab !== 'basic') {
            fetchNutritionInsights();
        }
    }, [activeTab, refreshCounter]);

    const fetchNutritionInsights = async () => {
        setLoadingInsights(true);
        try {
            const response = await axiosInstance.get('/analytics/nutrition-insights/');
            setNutritionInsights(response.data);
        } catch (error) {
            console.error('Error fetching nutrition insights:', error);
        } finally {
            setLoadingInsights(false);
        }
    };

    // تحديث تلقائي
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            onRefresh();
            if (activeTab !== 'basic') {
                setRefreshCounter(prev => prev + 1);
            }
            setLastUpdate(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, onRefresh, activeTab]);

    // الإحصائيات الأساسية
    const nutritionStats = useMemo(() => {
        if (!meals || meals.length === 0) {
            return {
                totalCalories: 0,
                avgProtein: 0,
                avgCarbs: 0,
                avgFat: 0,
                todayCalories: 0,
                totalProtein: 0,
                totalCarbs: 0,
                totalFat: 0,
                totalMeals: 0
            };
        }

        const stats = meals.reduce((acc, meal) => {
            const mealDate = new Date(meal.meal_time);
            const today = new Date();
            const isToday = mealDate.toDateString() === today.toDateString();
            
            const ingredients = meal.ingredients || [];
            const mealProtein = ingredients.reduce((sum, item) => sum + (item.protein || 0), 0);
            const mealCarbs = ingredients.reduce((sum, item) => sum + (item.carbs || 0), 0);
            const mealFat = ingredients.reduce((sum, item) => sum + (item.fat || 0), 0);
            
            return {
                totalCalories: acc.totalCalories + (meal.total_calories || 0),
                totalProtein: acc.totalProtein + mealProtein,
                totalCarbs: acc.totalCarbs + mealCarbs,
                totalFat: acc.totalFat + mealFat,
                todayCalories: acc.todayCalories + (isToday ? (meal.total_calories || 0) : 0),
                count: acc.count + 1
            };
        }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, todayCalories: 0, count: 0 });

        return {
            totalCalories: stats.totalCalories,
            avgProtein: stats.count > 0 ? roundNumber(stats.totalProtein / stats.count, 1) : 0,
            avgCarbs: stats.count > 0 ? roundNumber(stats.totalCarbs / stats.count, 1) : 0,
            avgFat: stats.count > 0 ? roundNumber(stats.totalFat / stats.count, 1) : 0,
            todayCalories: stats.todayCalories,
            totalProtein: roundNumber(stats.totalProtein, 1),
            totalCarbs: roundNumber(stats.totalCarbs, 1),
            totalFat: roundNumber(stats.totalFat, 1),
            totalMeals: stats.count
        };
    }, [meals]);

    // التقدم نحو الأهداف
    const goalProgress = useMemo(() => {
        const todayMeals = meals?.filter(meal => 
            new Date(meal.meal_time).toDateString() === new Date().toDateString()
        ) || [];

        const todayNutrition = todayMeals.reduce((acc, meal) => {
            const ingredients = meal.ingredients || [];
            return {
                calories: acc.calories + (meal.total_calories || 0),
                protein: acc.protein + ingredients.reduce((sum, item) => sum + (item.protein || 0), 0),
                carbs: acc.carbs + ingredients.reduce((sum, item) => sum + (item.carbs || 0), 0),
                fat: acc.fat + ingredients.reduce((sum, item) => sum + (item.fat || 0), 0)
            };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return {
            calories: Math.min(Math.round((todayNutrition.calories / nutritionGoals.dailyCalories) * 100), 100),
            protein: Math.min(Math.round((todayNutrition.protein / nutritionGoals.dailyProtein) * 100), 100),
            carbs: Math.min(Math.round((todayNutrition.carbs / nutritionGoals.dailyCarbs) * 100), 100),
            fat: Math.min(Math.round((todayNutrition.fat / nutritionGoals.dailyFat) * 100), 100)
        };
    }, [meals, nutritionGoals]);

    const getMealTypeIcon = (type) => {
        const icons = { 'Breakfast': '🍳', 'Lunch': '🍲', 'Dinner': '🍽️', 'Snack': '🍎', 'Other': '📝' };
        return icons[type] || '🍽️';
    };

    const getMealTypeLabel = (type) => {
        const labels = {
            'Breakfast': t('nutrition.breakfast'),
            'Lunch': t('nutrition.lunch'),
            'Dinner': t('nutrition.dinner'),
            'Snack': t('nutrition.snack'),
            'Other': t('nutrition.other')
        };
        return labels[type] || type;
    };

    const formatDate = (dateString) => {
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return new Date(dateString).toLocaleDateString(locale, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // التوصيات الذكية
    const getRecommendations = () => {
        if (nutritionInsights?.recommendations) {
            return nutritionInsights.recommendations.map(r => r.message);
        }

        const recommendations = [];
        const todayMeals = meals?.filter(meal => 
            new Date(meal.meal_time).toDateString() === new Date().toDateString()
        ) || [];

        if (goalProgress.calories >= 80) {
            recommendations.push(t('nutrition.recommendations.caloriesGoal'));
        }
        if (nutritionStats.avgProtein < 50) {
            recommendations.push(t('nutrition.recommendations.moreProtein'));
        }
        if (nutritionStats.avgCarbs > 300) {
            recommendations.push(t('nutrition.recommendations.lessCarbs'));
        }
        if (todayMeals.filter(meal => meal.meal_type === 'Breakfast').length === 0) {
            recommendations.push(t('nutrition.recommendations.eatBreakfast'));
        }

        return recommendations.length > 0 ? recommendations : [t('nutrition.recommendations.balancedDiet')];
    };

    // التنبؤات الواقعية
    const getRealisticPrediction = () => {
        const avgCalories = nutritionInsights?.avg_calories || nutritionStats.avgProtein * 20 || 0;
        const totalMeals = nutritionInsights?.total_meals || nutritionStats.totalMeals;
        
        if (totalMeals < 5) return null;
        
        const dailyDeficit = avgCalories - nutritionGoals.dailyCalories;
        const weeklyWeightChange = (dailyDeficit * 7) / 7700;
        const maxChange = Math.min(Math.abs(weeklyWeightChange), 1);
        const direction = weeklyWeightChange > 0 ? 'gain' : 'loss';
        
        return {
            weightChange: roundNumber(maxChange, 1),
            direction,
            confidence: totalMeals > 20 ? 85 : totalMeals > 10 ? 70 : 50,
            basedOn: totalMeals
        };
    };

    const prediction = getRealisticPrediction();

    if (loading) {
        return (
            <div className="dashboard-loading-container">
                <div className="dashboard-loading-spinner"></div>
                <p>{t('nutrition.loading')}</p>
            </div>
        );
    }

    return (
        <div className={`nutrition-dashboard-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* شريط التحكم */}
            <div className="dashboard-control-bar">
                <div className="dashboard-control-left">
                    <button onClick={onRefresh} className="dashboard-refresh-button">
                        🔄 {t('nutrition.refresh')}
                    </button>
                    {lastUpdate && (
                        <span className="dashboard-last-update">
                            {t('nutrition.lastUpdate')}: {lastUpdate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                    )}
                </div>
                <div className="dashboard-control-right">
                    <label className="dashboard-auto-refresh">
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        <span>{t('nutrition.autoRefresh')}</span>
                    </label>
                </div>
            </div>

            {/* تبويبات */}
            <div className="dashboard-tabs">
                <button className={activeTab === 'basic' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('basic')}>
                    📊 {t('nutrition.tabs.basic')}
                </button>
                <button className={activeTab === 'insights' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('insights')}>
                    📈 {t('nutrition.tabs.insights')}
                </button>
                <button className={activeTab === 'recommendations' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('recommendations')}>
                    💡 {t('nutrition.tabs.recommendations')}
                </button>
                <button className={activeTab === 'prediction' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('prediction')}>
                    🔮 {t('nutrition.tabs.prediction')}
                </button>
            </div>

            {/* المحتوى حسب التبويب */}
            <div className="dashboard-tab-content">
                {/* التبويب الأساسي */}
                {activeTab === 'basic' && (
                    <>
                        {/* بطاقات الإحصائيات */}
                        <div className="dashboard-stats-grid">
                            <div className="dashboard-stat-card">
                                <div className="dashboard-stat-icon">🍽️</div>
                                <div className="dashboard-stat-info">
                                    <div className="dashboard-stat-value">{nutritionStats.totalMeals}</div>
                                    <div className="dashboard-stat-label">{t('nutrition.totalMeals')}</div>
                                </div>
                            </div>
                            <div className="dashboard-stat-card">
                                <div className="dashboard-stat-icon">🔥</div>
                                <div className="dashboard-stat-info">
                                    <div className="dashboard-stat-value">{nutritionStats.totalCalories}</div>
                                    <div className="dashboard-stat-label">{t('nutrition.totalCalories')}</div>
                                </div>
                            </div>
                            <div className="dashboard-stat-card">
                                <div className="dashboard-stat-icon">💪</div>
                                <div className="dashboard-stat-info">
                                    <div className="dashboard-stat-value">{nutritionStats.avgProtein}g</div>
                                    <div className="dashboard-stat-label">{t('nutrition.avgProtein')}</div>
                                </div>
                            </div>
                            <div className="dashboard-stat-card">
                                <div className="dashboard-stat-icon">📅</div>
                                <div className="dashboard-stat-info">
                                    <div className="dashboard-stat-value">{nutritionStats.todayCalories}</div>
                                    <div className="dashboard-stat-label">{t('nutrition.todayCalories')}</div>
                                </div>
                            </div>
                        </div>

                        {/* تقدم الأهداف */}
                        <div className="dashboard-goals-section">
                            <h3>🎯 {t('nutrition.dailyGoals')}</h3>
                            <div className="dashboard-goals-list">
                                {[
                                    { key: 'calories', label: t('nutrition.calories'), icon: '🔥', goal: nutritionGoals.dailyCalories, unit: t('nutrition.caloriesUnit'), current: nutritionStats.todayCalories },
                                    { key: 'protein', label: t('nutrition.protein'), icon: '💪', goal: nutritionGoals.dailyProtein, unit: 'g', current: nutritionStats.totalProtein },
                                    { key: 'carbs', label: t('nutrition.carbs'), icon: '🌾', goal: nutritionGoals.dailyCarbs, unit: 'g', current: nutritionStats.totalCarbs },
                                    { key: 'fat', label: t('nutrition.fat'), icon: '🫒', goal: nutritionGoals.dailyFat, unit: 'g', current: nutritionStats.totalFat }
                                ].map(({ key, label, icon, goal, unit, current }) => (
                                    <div key={key} className="dashboard-goal-item">
                                        <div className="dashboard-goal-header">
                                            <span>{icon} {label}</span>
                                            <span>{goalProgress[key]}%</span>
                                        </div>
                                        <div className="dashboard-progress-bar">
                                            <div className="dashboard-progress-fill" style={{ width: `${goalProgress[key]}%` }}></div>
                                        </div>
                                        <div className="dashboard-goal-values">
                                            <span>{roundNumber(current, 0)}{unit}</span>
                                            <span>/</span>
                                            <span>{goal}{unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* توزيع الوجبات */}
                        <div className="dashboard-distribution-section">
                            <h4>📊 {t('nutrition.mealDistribution')}</h4>
                            <div className="dashboard-distribution-list">
                                {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'].map(type => {
                                    const count = meals?.filter(meal => meal.meal_type === type).length || 0;
                                    const percentage = meals?.length ? Math.round((count / meals.length) * 100) : 0;
                                    return (
                                        <div key={type} className="dashboard-distribution-item">
                                            <span>{getMealTypeIcon(type)} {getMealTypeLabel(type)}</span>
                                            <div className="dashboard-distribution-bar">
                                                <div className="dashboard-distribution-fill" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span>{percentage}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* آخر الوجبات */}
                        <div className="dashboard-recent-meals">
                            <h3>📝 {t('nutrition.recentMeals')}</h3>
                            {meals?.length === 0 ? (
                                <div className="dashboard-empty-state">
                                    <p>{t('nutrition.noMeals')}</p>
                                </div>
                            ) : (
                                <div className="dashboard-meals-list">
                                    {meals.slice(0, 5).map(meal => (
                                        <div key={meal.id} className="dashboard-meal-item">
                                            <div className="dashboard-meal-header">
                                                <span className="dashboard-meal-type">
                                                    {getMealTypeIcon(meal.meal_type)} {getMealTypeLabel(meal.meal_type)}
                                                </span>
                                                <span className="dashboard-meal-calories">🔥 {meal.total_calories}</span>
                                            </div>
                                            <div className="dashboard-meal-time">{formatDate(meal.meal_time)}</div>
                                            {meal.ingredients && (
                                                <div className="dashboard-meal-ingredients">
                                                    {mergeDuplicateItems(meal.ingredients).slice(0, 3).map((ing, i) => (
                                                        <span key={i} className="dashboard-ingredient-badge">
                                                            {ing.name} {roundNumber(ing.quantity, 0)}{ing.unit}
                                                        </span>
                                                    ))}
                                                    {meal.ingredients.length > 3 && (
                                                        <span className="dashboard-more-badge">+{meal.ingredients.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* تبويب التحليلات */}
                {activeTab === 'insights' && (
                    <div className="dashboard-insights-section">
                        {loadingInsights ? (
                            <div className="dashboard-loading-state"><div className="dashboard-spinner"></div><p>{t('nutrition.loading')}</p></div>
                        ) : nutritionInsights ? (
                            <>
                                <div className="dashboard-insights-stats">
                                    <div className="dashboard-insight-card">
                                        <div className="dashboard-insight-icon">🍽️</div>
                                        <div className="dashboard-insight-info">
                                            <div className="dashboard-insight-value">{nutritionInsights.total_meals || 0}</div>
                                            <div className="dashboard-insight-label">{t('nutrition.totalMeals')}</div>
                                        </div>
                                    </div>
                                    <div className="dashboard-insight-card">
                                        <div className="dashboard-insight-icon">🔥</div>
                                        <div className="dashboard-insight-info">
                                            <div className="dashboard-insight-value">{roundNumber(nutritionInsights.avg_calories || 0, 0)}</div>
                                            <div className="dashboard-insight-label">{t('nutrition.avgCalories')}</div>
                                        </div>
                                    </div>
                                    <div className="dashboard-insight-card">
                                        <div className="dashboard-insight-icon">💪</div>
                                        <div className="dashboard-insight-info">
                                            <div className="dashboard-insight-value">{roundNumber(nutritionInsights.avg_protein || 0, 1)}g</div>
                                            <div className="dashboard-insight-label">{t('nutrition.avgProtein')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="dashboard-analysis-box">
                                    <h4>📊 {t('nutrition.nutritionAnalysis')}</h4>
                                    <div className="dashboard-analysis-items">
                                        <div className="dashboard-analysis-item">
                                            <span>{t('nutrition.calorieBalance')}</span>
                                            <span className={nutritionInsights.avg_calories < 1500 ? 'dashboard-warning' : nutritionInsights.avg_calories > 3000 ? 'dashboard-warning' : 'dashboard-good'}>
                                                {nutritionInsights.avg_calories < 1500 ? t('nutrition.tooLow') :
                                                 nutritionInsights.avg_calories > 3000 ? t('nutrition.tooHigh') :
                                                 t('nutrition.good')}
                                            </span>
                                        </div>
                                        <div className="dashboard-analysis-item">
                                            <span>{t('nutrition.proteinIntake')}</span>
                                            <span className={nutritionInsights.avg_protein < 50 ? 'dashboard-warning' : 'dashboard-good'}>
                                                {nutritionInsights.avg_protein < 50 ? t('nutrition.low') : t('nutrition.good')}
                                            </span>
                                        </div>
                                        <div className="dashboard-analysis-item">
                                            <span>{t('nutrition.mealVariety')}</span>
                                            <span>{Object.keys(nutritionInsights.meal_distribution || {}).length} {t('nutrition.types')}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="dashboard-empty-state"><p>{t('nutrition.insufficientData')}</p></div>
                        )}
                    </div>
                )}

                {/* تبويب التوصيات */}
                {activeTab === 'recommendations' && (
                    <div className="dashboard-recommendations-section">
                        <div className="dashboard-recommendations-list">
                            {getRecommendations().map((rec, idx) => (
                                <div key={idx} className="dashboard-recommendation-item">
                                    <span className="dashboard-rec-icon">💡</span>
                                    <span className="dashboard-rec-text">{rec}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* تبويب التنبؤات */}
                {activeTab === 'prediction' && (
                    <div className="dashboard-prediction-section">
                        {prediction ? (
                            <>
                                <div className="dashboard-prediction-header">
                                    <span className="dashboard-prediction-icon">🔮</span>
                                    <h3>{t('nutrition.weightPrediction')}</h3>
                                </div>
                                <div className="dashboard-prediction-card">
                                    <div className="dashboard-prediction-value">
                                        {prediction.direction === 'gain' ? '📈 +' : '📉 -'}{prediction.weightChange} kg
                                    </div>
                                    <div className="dashboard-prediction-period">{t('nutrition.weeklyEstimate')}</div>
                                    <div className="dashboard-prediction-confidence">
                                        {t('nutrition.confidence')}: {prediction.confidence}%
                                    </div>
                                    <div className="dashboard-prediction-note">
                                        {t('nutrition.predictionNote', 'بناءً على')} {prediction.basedOn} {t('nutrition.meals')}
                                    </div>
                                </div>
                                <div className="dashboard-prediction-disclaimer">
                                    ⚠️ {t('nutrition.predictionDisclaimer', 'هذه تقديرات تقريبية، استشر أخصائي تغذية')}
                                </div>
                            </>
                        ) : (
                            <div className="dashboard-empty-state">
                                <p>📊 {t('nutrition.needMoreDataPrediction', 'سجل 5 وجبات على الأقل للحصول على تنبؤات دقيقة')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .nutrition-dashboard-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                /* شريط التحكم */
                .dashboard-control-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .dashboard-control-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .dashboard-refresh-button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    background: var(--primary-color);
                    color: white;
                    cursor: pointer;
                }

                .dashboard-last-update {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .dashboard-auto-refresh {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                /* التبويبات */
                .dashboard-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                    background: var(--bg-secondary);
                    padding: 6px;
                    border-radius: 40px;
                }

                .dashboard-tab,
                .dashboard-tab-active {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    background: transparent;
                    border-radius: 32px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.85rem;
                }

                .dashboard-tab-active {
                    background: var(--primary-color);
                    color: white;
                }

                /* بطاقات الإحصائيات */
                .dashboard-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .dashboard-stat-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .dashboard-stat-icon {
                    font-size: 2rem;
                }

                .dashboard-stat-info {
                    flex: 1;
                }

                .dashboard-stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .dashboard-stat-label {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                /* الأهداف */
                .dashboard-goals-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .dashboard-goals-section h3 {
                    margin: 0 0 16px 0;
                    font-size: 1rem;
                }

                .dashboard-goals-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .dashboard-goal-item {
                    width: 100%;
                }

                .dashboard-goal-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 0.85rem;
                }

                .dashboard-progress-bar {
                    height: 8px;
                    background: var(--bg-primary);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .dashboard-progress-fill {
                    height: 100%;
                    background: var(--primary-color);
                    border-radius: 4px;
                    transition: width 0.3s;
                }

                .dashboard-goal-values {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                /* توزيع الوجبات */
                .dashboard-distribution-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .dashboard-distribution-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .dashboard-distribution-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.85rem;
                }

                .dashboard-distribution-bar {
                    flex: 1;
                    height: 6px;
                    background: var(--bg-primary);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .dashboard-distribution-fill {
                    height: 100%;
                    background: var(--primary-color);
                    border-radius: 3px;
                }

                /* الوجبات الأخيرة */
                .dashboard-recent-meals {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                }

                .dashboard-recent-meals h3 {
                    margin: 0 0 16px 0;
                    font-size: 1rem;
                }

                .dashboard-meals-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .dashboard-meal-item {
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 12px;
                }

                .dashboard-meal-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .dashboard-meal-type {
                    font-size: 0.85rem;
                }

                .dashboard-meal-calories {
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .dashboard-meal-time {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }

                .dashboard-meal-ingredients {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .dashboard-ingredient-badge {
                    background: var(--bg-secondary);
                    padding: 4px 8px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                }

                .dashboard-more-badge {
                    background: var(--bg-secondary);
                    padding: 4px 8px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                /* التحليلات */
                .dashboard-insights-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                }

                .dashboard-insights-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .dashboard-insight-card {
                    background: var(--bg-primary);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .dashboard-insight-icon {
                    font-size: 1.8rem;
                }

                .dashboard-insight-value {
                    font-size: 1.3rem;
                    font-weight: 700;
                }

                .dashboard-insight-label {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .dashboard-analysis-box {
                    background: var(--bg-primary);
                    border-radius: 16px;
                    padding: 16px;
                }

                .dashboard-analysis-box h4 {
                    margin: 0 0 12px 0;
                }

                .dashboard-analysis-items {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .dashboard-analysis-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                }

                .dashboard-good {
                    color: #10b981;
                }

                .dashboard-warning {
                    color: #f59e0b;
                }

                /* التوصيات */
                .dashboard-recommendations-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                }

                .dashboard-recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .dashboard-recommendation-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 12px;
                }

                .dashboard-rec-icon {
                    font-size: 1.2rem;
                }

                /* التنبؤات */
                .dashboard-prediction-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                }

                .dashboard-prediction-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .dashboard-prediction-header h3 {
                    margin: 0;
                }

                .dashboard-prediction-card {
                    background: var(--bg-primary);
                    border-radius: 16px;
                    padding: 24px;
                    text-align: center;
                }

                .dashboard-prediction-value {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                }

                .dashboard-prediction-period {
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .dashboard-prediction-confidence {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .dashboard-prediction-note {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .dashboard-prediction-disclaimer {
                    margin-top: 16px;
                    padding: 12px;
                    background: rgba(245, 158, 11, 0.1);
                    border-radius: 12px;
                    font-size: 0.7rem;
                    text-align: center;
                }

                /* حالات فارغة */
                .dashboard-empty-state {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary);
                }

                .dashboard-loading-state {
                    text-align: center;
                    padding: 40px;
                }

                .dashboard-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* استجابة */
                @media (max-width: 768px) {
                    .nutrition-dashboard-container {
                        padding: 12px;
                    }
                    
                    .dashboard-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .dashboard-insights-stats {
                        grid-template-columns: 1fr;
                    }
                    
                    .dashboard-tabs {
                        flex-wrap: wrap;
                    }
                    
                    .dashboard-tab,
                    .dashboard-tab-active {
                        flex: none;
                        width: calc(50% - 4px);
                    }
                }

                @media (max-width: 480px) {
                    .dashboard-stats-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .dashboard-control-bar {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .dashboard-control-left {
                        justify-content: center;
                    }
                }

                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #667eea;
                }
            `}</style>
        </div>
    );
}

export default NutritionDashboard;