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

// دالة مساعدة لاستخراج البيانات من response
const extractData = (response) => {
    if (response?.results) return response.results;
    if (Array.isArray(response)) return response;
    return [];
};

function NutritionDashboard({ meals: propMeals, loading: propLoading, onRefresh }) {
    const { t, i18n } = useTranslation();
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    
    const [nutritionGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 50,
        dailyCarbs: 250,
        dailyFat: 70
    });
    
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // تحديث autoRefreshRef
    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    // دالة جلب جميع الوجبات مع دعم pagination
    const fetchAllMeals = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        let allMeals = [];
        let nextUrl = '/meals/?limit=50';
        
        try {
            while (nextUrl) {
                const response = await axiosInstance.get(nextUrl);
                const data = response.data;
                
                const mealsData = extractData(data);
                allMeals = [...allMeals, ...mealsData];
                
                nextUrl = data.next || null;
            }
            
            if (isMountedRef.current) {
                console.log('🍽️ Meals loaded:', allMeals.length, 'records');
                setMeals(allMeals);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                setMeals([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, []);

    // جلب البيانات عند التحميل أو عند طلب التحديث
    const handleRefresh = useCallback(async () => {
        await fetchAllMeals();
        setRefreshAnalytics(prev => prev + 1);
        if (onRefresh) onRefresh();
    }, [fetchAllMeals, onRefresh]);

    // تحميل البيانات الأولية
    useEffect(() => {
        fetchAllMeals();
    }, [fetchAllMeals]);

    // التحديث التلقائي
    useEffect(() => {
        if (!autoRefresh) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        
        intervalRef.current = setInterval(() => {
            if (autoRefreshRef.current && isMountedRef.current) {
                fetchAllMeals();
                setRefreshAnalytics(prev => prev + 1);
                setLastUpdate(new Date());
            }
        }, 60000);
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, fetchAllMeals]);

    // تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // الإحصائيات الأساسية
    const nutritionStats = useMemo(() => {
        if (!meals?.length) {
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

    const getMealTypeIcon = (type) => ({ 
        'Breakfast': '🍳', 
        'Lunch': '🍲', 
        'Dinner': '🍽️', 
        'Snack': '🍎', 
        'Other': '📝' 
    }[type] || '🍽️');
    
    const getMealTypeLabel = (type) => ({ 
        'Breakfast': t('nutrition.breakfast', 'فطور'), 
        'Lunch': t('nutrition.lunch', 'غداء'), 
        'Dinner': t('nutrition.dinner', 'عشاء'), 
        'Snack': t('nutrition.snack', 'وجبة خفيفة'), 
        'Other': t('nutrition.other', 'أخرى') 
    }[type] || type);
    
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString(
                i18n.language === 'ar' ? 'ar-EG' : 'en-US', 
                { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            );
        } catch {
            return dateString;
        }
    };

    const getRecommendations = () => {
        const recs = [];
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
        
        if (nutritionStats.totalMeals === 0) recs.push('📝 ' + (t('nutrition.startFirstMeal', 'ابدأ بتسجيل أول وجبة لك')));
        if (goalProgress.calories >= 80) recs.push('🎯 ' + (t('nutrition.closeToGoal', 'ممتاز! أنت قريب من هدف السعرات اليومي')));
        if (nutritionStats.avgProtein < 50 && nutritionStats.avgProtein > 0) recs.push('💪 ' + (t('nutrition.increaseProtein', 'زد من تناول البروتين (دجاج، بيض، بقوليات)')));
        if (nutritionStats.avgCarbs > 300) recs.push('🌾 ' + (t('nutrition.reduceCarbs', 'قلل من الكربوهيدرات (خبز، أرز، مكرونة)')));
        if (todayMeals.filter(m => m.meal_type === 'Breakfast').length === 0 && todayMeals.length > 0) recs.push('🌅 ' + (t('nutrition.dontSkipBreakfast', 'لا تنسَ وجبة الفطور لبدء يومك بنشاط')));
        
        return recs.length ? recs : ['✅ ' + (t('nutrition.balancedDiet', 'نظامك الغذائي متوازن، استمر!'))];
    };

    const getPrediction = () => {
        const totalMeals = nutritionStats.totalMeals;
        if (totalMeals < 5) return null;
        
        const avgCalories = nutritionStats.totalCalories / totalMeals;
        const weeklyChange = ((avgCalories - nutritionGoals.dailyCalories) * 7) / 7700;
        const maxChange = Math.min(Math.abs(weeklyChange), 1);
        
        if (weeklyChange > 0.2) return { icon: '📈', text: (t('nutrition.weightGainExpected', 'زيادة متوقعة')) + ` ${maxChange.toFixed(1)} ` + (t('nutrition.kgPerWeek', 'كجم أسبوعياً')), color: '#f59e0b', severity: 'warning' };
        if (weeklyChange < -0.2) return { icon: '📉', text: (t('nutrition.weightLossExpected', 'خسارة متوقعة')) + ` ${maxChange.toFixed(1)} ` + (t('nutrition.kgPerWeek', 'كجم أسبوعياً')), color: '#10b981', severity: 'success' };
        return { icon: '➡️', text: t('nutrition.weightStable', 'وزن مستقر متوقع'), color: '#3b82f6', severity: 'info' };
    };

    const prediction = getPrediction();
    const recommendations = getRecommendations();

    if (loading && meals.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('nutrition.loading', 'جاري تحميل البيانات...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* شريط التحكم */}
            <div className="analytics-header">
                <h2>
                    <span>🍽️</span>
                    {t('nutrition.dashboard', 'لوحة التغذية')}
                </h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {lastUpdate && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            🕒 {lastUpdate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                    )}
                    <button onClick={handleRefresh} className="refresh-btn" title={t('nutrition.refresh', 'تحديث')}>
                        🔄
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        <span>{t('nutrition.autoRefresh', 'تحديث تلقائي')}</span>
                    </label>
                </div>
            </div>

            {/* التوصيات السريعة */}
            {recommendations.length > 0 && (
                <div className="recommendations-section">
                    <h3>💡 {t('nutrition.smartRecommendations', 'توصيات ذكية')}</h3>
                    <ul className="tips-grid" style={{ listStyle: 'none', padding: 0 }}>
                        {recommendations.map((rec, idx) => (
                            <li key={idx} className="tip-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* التنبؤ السريع */}
            {prediction && (
                <div className={`insight-card ${prediction.severity === 'warning' ? 'energy-critical' : ''}`}>
                    <div className="insight-icon">{prediction.icon}</div>
                    <div className="insight-content">
                        <h3>{t('nutrition.prediction', 'توقع الوزن')}</h3>
                        <p style={{ color: prediction.color, fontWeight: 'bold' }}>{prediction.text}</p>
                    </div>
                </div>
            )}

            {/* تبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>
                    📊 {t('nutrition.summary', 'ملخص')}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    📈 {t('nutrition.advanced.title', 'تحليلات متقدمة')}
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'basic' && (
                    <>
                        {/* بطاقات الإحصائيات السريعة */}
                        <div className="analytics-stats-grid">
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🍽️</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.totalMeals}</div>
                                    <div className="stat-label">{t('nutrition.meals', 'وجبة')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🔥</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.totalCalories}</div>
                                    <div className="stat-label">{t('nutrition.calories', 'سعرة')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">💪</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.avgProtein}g</div>
                                    <div className="stat-label">{t('nutrition.protein', 'بروتين')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">📅</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.todayCalories}</div>
                                    <div className="stat-label">{t('nutrition.today', 'اليوم')}</div>
                                </div>
                            </div>
                        </div>

                        {/* تقدم الأهداف */}
                        <div className="recommendations-section">
                            <h3>🎯 {t('nutrition.dailyGoalsProgress', 'أهداف اليوم')}</h3>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: 'var(--spacing-md)' }}>
                                {/* Calories */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                        <span>🔥 {t('nutrition.calories', 'سعرات')}</span>
                                        <span>{goalProgress.calories}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${goalProgress.calories}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-sm)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                        <span>{Math.round(nutritionStats.todayCalories)} {t('nutrition.caloriesUnit', 'سعرة')}</span>
                                        <span>/ {nutritionGoals.dailyCalories} {t('nutrition.caloriesUnit', 'سعرة')}</span>
                                    </div>
                                </div>
                                
                                {/* Protein */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                        <span>💪 {t('nutrition.protein', 'بروتين')}</span>
                                        <span>{goalProgress.protein}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${goalProgress.protein}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-sm)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                        <span>{nutritionStats.totalProtein}g</span>
                                        <span>/ {nutritionGoals.dailyProtein}g</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* توزيع الوجبات */}
                        <div className="recommendations-section">
                            <h4>📊 {t('nutrition.mealDistribution', 'توزيع الوجبات')}</h4>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: 'var(--spacing-sm)' }}>
                                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
                                    const count = meals?.filter(m => m.meal_type === type).length || 0;
                                    const percent = meals?.length ? Math.round((count / meals.length) * 100) : 0;
                                    return (
                                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <span style={{ minWidth: '80px' }}>{getMealTypeIcon(type)} {getMealTypeLabel(type)}</span>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div className="progress-fill" style={{ width: `${percent}%`, background: 'var(--secondary)' }}></div>
                                            </div>
                                            <span style={{ minWidth: '45px', fontSize: '0.8rem' }}>{percent}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* آخر الوجبات */}
                        <div className="recommendations-section">
                            <h3>📝 {t('nutrition.loggedMeals', 'آخر الوجبات')}</h3>
                            {meals?.length === 0 ? (
                                <div className="analytics-empty">
                                    <div className="empty-icon">🍽️</div>
                                    <p>{t('nutrition.noMeals', 'لا توجد وجبات مسجلة')}</p>
                                </div>
                            ) : (
                                <div className="habits-list">
                                    {meals.slice(0, 5).map(meal => (
                                        <div key={meal.id} className="habit-card">
                                            <div className="habit-header">
                                                <span className="habit-name">{getMealTypeIcon(meal.meal_type)} {getMealTypeLabel(meal.meal_type)}</span>
                                                <span className="habit-rate">🔥 {meal.total_calories}</span>
                                            </div>
                                            <div className="habit-desc">{formatDate(meal.meal_time)}</div>
                                            {meal.ingredients?.length > 0 && (
                                                <div className="meal-ingredients" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                                                    {meal.ingredients.slice(0, 3).map((ing, i) => (
                                                        <span key={i} style={{ background: 'var(--tertiary-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem' }}>
                                                            {ing.name} {Math.round(ing.quantity)}{ing.unit}
                                                        </span>
                                                    ))}
                                                    {meal.ingredients.length > 3 && (
                                                        <span style={{ background: 'var(--tertiary-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                            +{meal.ingredients.length - 3}
                                                        </span>
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

                {activeTab === 'insights' && (
                    <NutritionAnalytics refreshTrigger={refreshAnalytics} />
                )}
            </div>

            {/* تذييل */}
            <div className="analytics-footer">
                <small>
                    {t('nutrition.totalMeals', 'إجمالي الوجبات')}: {nutritionStats.totalMeals} | 
                    {t('nutrition.totalCalories', 'إجمالي السعرات')}: {nutritionStats.totalCalories}
                </small>
            </div>
        </div>
    );
}

export default NutritionDashboard;