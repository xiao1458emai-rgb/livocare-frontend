'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import NutritionAnalytics from '../Analytics/NutritionAnalytics';
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
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [nutritionGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 50,
        dailyCarbs: 250,
        dailyFat: 70
    });
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);

    // تحديث ref عند تغيير autoRefresh
    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

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

    // ✅ تحديث تلقائي
    useEffect(() => {
        if (!autoRefresh) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            if (autoRefreshRef.current && onRefresh) {
                onRefresh();
                setRefreshAnalytics(prev => prev + 1);
                setLastUpdate(new Date());
            }
        }, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, onRefresh]);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // ✅ الإحصائيات الأساسية - تعتمد فقط على meals القادمة من NutritionMain
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

    // ✅ التقدم نحو الأهداف
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

    // ✅ التوصيات الذكية - تعتمد على البيانات المحلية
    const getRecommendations = () => {
        const recommendations = [];
        const todayMeals = meals?.filter(meal => 
            new Date(meal.meal_time).toDateString() === new Date().toDateString()
        ) || [];

        if (nutritionStats.totalMeals === 0) {
            recommendations.push(t('nutrition.recommendations.startTracking'));
        }
        
        if (goalProgress.calories >= 80) {
            recommendations.push(t('nutrition.recommendations.caloriesGoal'));
        }
        if (nutritionStats.avgProtein < 50 && nutritionStats.avgProtein > 0) {
            recommendations.push(t('nutrition.recommendations.moreProtein'));
        }
        if (nutritionStats.avgCarbs > 300) {
            recommendations.push(t('nutrition.recommendations.lessCarbs'));
        }
        if (todayMeals.filter(meal => meal.meal_type === 'Breakfast').length === 0 && todayMeals.length > 0) {
            recommendations.push(t('nutrition.recommendations.eatBreakfast'));
        }

        return recommendations.length > 0 ? recommendations : [t('nutrition.recommendations.balancedDiet')];
    };

    // ✅ التنبؤات
    const getRealisticPrediction = () => {
        const totalMeals = nutritionStats.totalMeals;
        
        if (totalMeals < 5) return null;
        
        const avgCalories = nutritionStats.totalCalories / totalMeals;
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

    // ✅ تحميل مؤقت
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
                                    <button onClick={onRefresh} className="refresh-btn">
                                        🔄 {t('nutrition.refresh')}
                                    </button>
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
                                            {meal.ingredients && meal.ingredients.length > 0 && (
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

                {/* تبويب التحليلات - يعرض NutritionAnalytics */}
                {activeTab === 'insights' && (
                    <NutritionAnalytics refreshTrigger={refreshAnalytics} />
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
                                <button onClick={onRefresh} className="refresh-btn">
                                    🔄 {t('nutrition.refresh')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
/* NutritionDashboard.css - متوافق مع ThemeManager */

.nutrition-dashboard-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
}

/* شريط التحكم */
.dashboard-control-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.dashboard-control-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.dashboard-refresh-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--radius-full);
    background: var(--primary-gradient);
    color: white;
    cursor: pointer;
    transition: all var(--transition-medium);
}

.dashboard-refresh-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.dashboard-last-update {
    font-size: 0.75rem;
    color: var(--text-tertiary);
}

.dashboard-auto-refresh {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    color: var(--text-primary);
}

/* التبويبات */
.dashboard-tabs {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    background: var(--secondary-bg);
    padding: var(--spacing-xs);
    border-radius: var(--radius-full);
}

.dashboard-tab,
.dashboard-tab-active {
    flex: 1;
    padding: var(--spacing-sm);
    border: none;
    background: transparent;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-medium);
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.dashboard-tab-active {
    background: var(--primary-gradient);
    color: white;
}

.dashboard-tab:hover:not(.dashboard-tab-active) {
    background: var(--hover-bg);
    color: var(--primary);
}

/* بطاقات الإحصائيات */
.dashboard-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.dashboard-stat-card {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.dashboard-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
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
    color: var(--text-tertiary);
}

/* الأهداف */
.dashboard-goals-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-goals-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 1rem;
    color: var(--text-primary);
}

.dashboard-goals-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.dashboard-goal-item {
    width: 100%;
}

.dashboard-goal-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--text-primary);
}

.dashboard-progress-bar {
    height: 8px;
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.dashboard-progress-fill {
    height: 100%;
    background: var(--primary-gradient);
    border-radius: var(--radius-full);
    transition: width var(--transition-medium);
}

.dashboard-goal-values {
    display: flex;
    justify-content: space-between;
    margin-top: var(--spacing-sm);
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

/* توزيع الوجبات */
.dashboard-distribution-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-distribution-section h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.dashboard-distribution-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.dashboard-distribution-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--text-primary);
}

.dashboard-distribution-bar {
    flex: 1;
    height: 6px;
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.dashboard-distribution-fill {
    height: 100%;
    background: var(--primary-gradient);
    border-radius: var(--radius-full);
}

/* الوجبات الأخيرة */
.dashboard-recent-meals {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-recent-meals h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 1rem;
    color: var(--text-primary);
}

.dashboard-meals-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.dashboard-meal-item {
    padding: var(--spacing-sm);
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
    transition: all var(--transition-fast);
}

.dashboard-meal-item:hover {
    transform: translateX(5px);
    border-color: var(--primary-light);
}

[dir="rtl"] .dashboard-meal-item:hover {
    transform: translateX(-5px);
}

.dashboard-meal-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
}

.dashboard-meal-type {
    font-size: 0.85rem;
    color: var(--text-primary);
}

.dashboard-meal-calories {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary);
}

.dashboard-meal-time {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-sm);
}

.dashboard-meal-ingredients {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
}

.dashboard-ingredient-badge {
    background: var(--tertiary-bg);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    color: var(--text-secondary);
}

.dashboard-more-badge {
    background: var(--tertiary-bg);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

/* التحليلات */
.dashboard-insights-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-insights-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.dashboard-insight-card {
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    border: 1px solid var(--border-light);
}

.dashboard-insight-icon {
    font-size: 1.8rem;
}

.dashboard-insight-info {
    flex: 1;
}

.dashboard-insight-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
}

.dashboard-insight-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

.dashboard-analysis-box {
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-light);
}

.dashboard-analysis-box h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
}

.dashboard-analysis-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.dashboard-analysis-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-primary);
}

.dashboard-good {
    color: var(--success);
}

.dashboard-warning {
    color: var(--warning);
}

/* التوصيات */
.dashboard-recommendations-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-recommendations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.dashboard-recommendation-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    border-right: 4px solid var(--primary);
}

[dir="rtl"] .dashboard-recommendation-item {
    border-right: none;
    border-left: 4px solid var(--primary);
}

.dashboard-rec-icon {
    font-size: 1.2rem;
}

.dashboard-rec-text {
    color: var(--text-primary);
}

/* التنبؤات */
.dashboard-prediction-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.dashboard-prediction-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
}

.dashboard-prediction-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.dashboard-prediction-card {
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    text-align: center;
    border: 1px solid var(--border-light);
}

.dashboard-prediction-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--spacing-sm);
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.dashboard-prediction-period {
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-sm);
}

.dashboard-prediction-confidence {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-sm);
}

.dashboard-prediction-note {
    font-size: 0.7rem;
    color: var(--text-tertiary);
}

.dashboard-prediction-disclaimer {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: var(--warning-bg);
    border-radius: var(--radius-lg);
    font-size: 0.7rem;
    text-align: center;
    color: var(--warning);
}

/* حالات فارغة */
.dashboard-empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--text-tertiary);
}

.dashboard-loading-state {
    text-align: center;
    padding: var(--spacing-2xl);
}

.dashboard-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
}

.dashboard-loading-container {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--card-bg);
    border-radius: var(--radius-xl);
}

.dashboard-loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* استجابة */
@media (max-width: 768px) {
    .nutrition-dashboard-container {
        padding: var(--spacing-md);
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
    
    .dashboard-stat-card {
        padding: var(--spacing-sm);
    }
    
    .dashboard-stat-icon {
        font-size: 1.5rem;
    }
    
    .dashboard-stat-value {
        font-size: 1.2rem;
    }
}

/* دعم RTL */
[dir="rtl"] .dashboard-meal-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .dashboard-distribution-item {
    flex-direction: row-reverse;
}

[dir="rtl"] .dashboard-insight-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .dashboard-stat-card {
    flex-direction: row-reverse;
}

/* دعم الحركة المخفضة */
@media (prefers-reduced-motion: reduce) {
    .dashboard-stat-card:hover,
    .dashboard-meal-item:hover,
    .dashboard-refresh-button:hover {
        transform: none !important;
    }
    
    .dashboard-progress-fill,
    .dashboard-distribution-fill {
        transition: none !important;
    }
}
            `}</style>
        </div>
    );
}

export default NutritionDashboard;