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
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [nutritionGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 50,
        dailyCarbs: 250,
        dailyFat: 70
    });
    
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);

    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        if (!autoRefresh) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            if (autoRefreshRef.current && onRefresh) {
                onRefresh();
                setRefreshAnalytics(prev => prev + 1);
                setLastUpdate(new Date());
            }
        }, 60000);
        return () => clearInterval(intervalRef.current);
    }, [autoRefresh, onRefresh]);

    // الإحصائيات الأساسية
    const nutritionStats = useMemo(() => {
        if (!meals?.length) {
            return { totalCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, todayCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalMeals: 0 };
        }

        const stats = meals.reduce((acc, meal) => {
            const isToday = new Date(meal.meal_time).toDateString() === new Date().toDateString();
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
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
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

    const getMealTypeIcon = (type) => ({ 'Breakfast': '🍳', 'Lunch': '🍲', 'Dinner': '🍽️', 'Snack': '🍎', 'Other': '📝' }[type] || '🍽️');
    const getMealTypeLabel = (type) => ({ 'Breakfast': t('nutrition.breakfast'), 'Lunch': t('nutrition.lunch'), 'Dinner': t('nutrition.dinner'), 'Snack': t('nutrition.snack'), 'Other': t('nutrition.other') }[type] || type);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getRecommendations = () => {
        const recs = [];
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
        
        if (nutritionStats.totalMeals === 0) recs.push('📝 ابدأ بتسجيل أول وجبة لك');
        if (goalProgress.calories >= 80) recs.push('🎯 ممتاز! أنت قريب من هدف السعرات اليومي');
        if (nutritionStats.avgProtein < 50 && nutritionStats.avgProtein > 0) recs.push('💪 زد من تناول البروتين (دجاج، بيض، بقوليات)');
        if (nutritionStats.avgCarbs > 300) recs.push('🌾 قلل من الكربوهيدرات (خبز، أرز، مكرونة)');
        if (todayMeals.filter(m => m.meal_type === 'Breakfast').length === 0 && todayMeals.length > 0) recs.push('🌅 لا تنسَ وجبة الفطور لبدء يومك بنشاط');
        
        return recs.length ? recs : ['✅ نظامك الغذائي متوازن، استمر!'];
    };

    const getPrediction = () => {
        const totalMeals = nutritionStats.totalMeals;
        if (totalMeals < 5) return null;
        
        const avgCalories = nutritionStats.totalCalories / totalMeals;
        const weeklyChange = ((avgCalories - nutritionGoals.dailyCalories) * 7) / 7700;
        const maxChange = Math.min(Math.abs(weeklyChange), 1);
        
        if (weeklyChange > 0.2) return { icon: '📈', text: `زيادة متوقعة ${maxChange.toFixed(1)} كجم أسبوعياً`, color: '#f59e0b' };
        if (weeklyChange < -0.2) return { icon: '📉', text: `خسارة متوقعة ${maxChange.toFixed(1)} كجم أسبوعياً`, color: '#10b981' };
        return { icon: '➡️', text: 'وزن مستقر متوقع', color: '#3b82f6' };
    };

    const prediction = getPrediction();

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
                    <button onClick={onRefresh} className="dashboard-refresh-button">🔄 {t('nutrition.refresh')}</button>
                    {lastUpdate && <span className="dashboard-last-update">🕒 {lastUpdate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>}
                </div>
                <div className="dashboard-control-right">
                    <label className="dashboard-auto-refresh">
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        <span>{t('nutrition.autoRefresh')}</span>
                    </label>
                </div>
            </div>

            {/* تبويبات مبسطة */}
            <div className="dashboard-tabs">
                <button className={activeTab === 'basic' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('basic')}>📊 ملخص</button>
                <button className={activeTab === 'insights' ? 'dashboard-tab-active' : 'dashboard-tab'} onClick={() => setActiveTab('insights')}>📈 تحليلات</button>
            </div>

            <div className="dashboard-tab-content">
                {activeTab === 'basic' && (
                    <>
                        {/* بطاقات سريعة */}
                        <div className="stats-grid">
                            <div className="stat-card"><div className="stat-icon">🍽️</div><div className="stat-value">{nutritionStats.totalMeals}</div><div className="stat-label">وجبة</div></div>
                            <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value">{nutritionStats.totalCalories}</div><div className="stat-label">سعرة</div></div>
                            <div className="stat-card"><div className="stat-icon">💪</div><div className="stat-value">{nutritionStats.avgProtein}g</div><div className="stat-label">بروتين</div></div>
                            <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-value">{nutritionStats.todayCalories}</div><div className="stat-label">اليوم</div></div>
                        </div>

                        {/* التنبؤ السريع */}
                        {prediction && (
                            <div className="prediction-card" style={{ borderColor: prediction.color }}>
                                <span className="prediction-icon">{prediction.icon}</span>
                                <span>{prediction.text}</span>
                            </div>
                        )}

                        {/* تقدم الأهداف */}
                        <div className="goals-section">
                            <h3>🎯 أهداف اليوم</h3>
                            {[
                                { key: 'calories', label: 'سعرات', icon: '🔥', current: nutritionStats.todayCalories, goal: nutritionGoals.dailyCalories, unit: 'سعرة' },
                                { key: 'protein', label: 'بروتين', icon: '💪', current: nutritionStats.totalProtein, goal: nutritionGoals.dailyProtein, unit: 'g' }
                            ].map(({ key, label, icon, current, goal, unit }) => (
                                <div key={key} className="goal-item">
                                    <div className="goal-header"><span>{icon} {label}</span><span>{goalProgress[key]}%</span></div>
                                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${goalProgress[key]}%` }}></div></div>
                                    <div className="goal-values">{Math.round(current)}{unit} / {goal}{unit}</div>
                                </div>
                            ))}
                        </div>

                        {/* توزيع الوجبات */}
                        <div className="distribution-section">
                            <h4>📊 توزيع الوجبات</h4>
                            <div className="distribution-list">
                                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
                                    const count = meals?.filter(m => m.meal_type === type).length || 0;
                                    const percent = meals?.length ? Math.round((count / meals.length) * 100) : 0;
                                    return (
                                        <div key={type} className="distribution-item">
                                            <span>{getMealTypeIcon(type)} {getMealTypeLabel(type)}</span>
                                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${percent}%`, background: '#667eea' }}></div></div>
                                            <span>{percent}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* آخر الوجبات */}
                        <div className="recent-meals">
                            <h3>📝 آخر الوجبات</h3>
                            {meals?.length === 0 ? (
                                <div className="empty-state"><p>لا توجد وجبات مسجلة</p><button onClick={onRefresh} className="refresh-btn">🔄 تحديث</button></div>
                            ) : (
                                meals.slice(0, 5).map(meal => (
                                    <div key={meal.id} className="meal-item">
                                        <div className="meal-header"><span>{getMealTypeIcon(meal.meal_type)} {getMealTypeLabel(meal.meal_type)}</span><span>🔥 {meal.total_calories}</span></div>
                                        <div className="meal-time">{formatDate(meal.meal_time)}</div>
                                        {meal.ingredients?.length > 0 && (
                                            <div className="meal-ingredients">
                                                {meal.ingredients.slice(0, 3).map((ing, i) => <span key={i} className="ingredient-badge">{ing.name} {Math.round(ing.quantity)}{ing.unit}</span>)}
                                                {meal.ingredients.length > 3 && <span className="more-badge">+{meal.ingredients.length - 3}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'insights' && (
                    <NutritionAnalytics refreshTrigger={refreshAnalytics} />
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