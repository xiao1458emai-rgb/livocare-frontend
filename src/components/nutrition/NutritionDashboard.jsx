// src/components/nutrition/NutritionDashboard.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import NutritionAnalytics from '../Analytics/NutritionAnalytics';
import '../../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة مساعدة لاستخراج البيانات من response
const extractData = (response) => {
    if (response?.results) return response.results;
    if (Array.isArray(response)) return response;
    return [];
};

function NutritionDashboard({ meals: propMeals, loading: propLoading, onRefresh }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    
    const [nutritionGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 80,
        dailyCarbs: 250,
        dailyFat: 55
    });
    
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

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
            const mealProtein = ingredients.reduce((sum, item) => sum + (item.protein_g || item.protein || 0), 0);
            const mealCarbs = ingredients.reduce((sum, item) => sum + (item.carbs_g || item.carbs || 0), 0);
            const mealFat = ingredients.reduce((sum, item) => sum + (item.fat_g || item.fat || 0), 0);
            
            return {
                totalCalories: acc.totalCalories + (meal.total_calories || 0),
                totalProtein: acc.totalProtein + mealProtein,
                totalCarbs: acc.totalCarbs + mealCarbs,
                totalFat: acc.totalFat + mealFat,
                todayCalories: acc.todayCalories + (isToday ? (meal.total_calories || 0) : 0),
                todayProtein: acc.todayProtein + (isToday ? mealProtein : 0),
                count: acc.count + 1
            };
        }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, todayCalories: 0, todayProtein: 0, count: 0 });

        const proteinProgress = stats.todayProtein > 0 ? Math.min(100, Math.round((stats.todayProtein / nutritionGoals.dailyProtein) * 100)) : 0;

        return {
            totalCalories: stats.totalCalories,
            avgProtein: stats.count > 0 ? roundNumber(stats.totalProtein / stats.count, 1) : 0,
            avgCarbs: stats.count > 0 ? roundNumber(stats.totalCarbs / stats.count, 1) : 0,
            avgFat: stats.count > 0 ? roundNumber(stats.totalFat / stats.count, 1) : 0,
            todayCalories: stats.todayCalories,
            todayProtein: roundNumber(stats.todayProtein, 1),
            totalProtein: roundNumber(stats.totalProtein, 1),
            totalCarbs: roundNumber(stats.totalCarbs, 1),
            totalFat: roundNumber(stats.totalFat, 1),
            totalMeals: stats.count,
            proteinProgress
        };
    }, [meals, nutritionGoals]);

    // التقدم نحو الأهداف
    const goalProgress = useMemo(() => {
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
        const todayNutrition = todayMeals.reduce((acc, meal) => {
            const ingredients = meal.ingredients || [];
            return {
                calories: acc.calories + (meal.total_calories || 0),
                protein: acc.protein + ingredients.reduce((sum, item) => sum + (item.protein_g || item.protein || 0), 0),
                carbs: acc.carbs + ingredients.reduce((sum, item) => sum + (item.carbs_g || item.carbs || 0), 0),
                fat: acc.fat + ingredients.reduce((sum, item) => sum + (item.fat_g || item.fat || 0), 0)
            };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        return {
            calories: nutritionGoals.dailyCalories > 0 ? Math.min(100, Math.round((todayNutrition.calories / nutritionGoals.dailyCalories) * 100)) : 0,
            protein: nutritionGoals.dailyProtein > 0 ? Math.min(100, Math.round((todayNutrition.protein / nutritionGoals.dailyProtein) * 100)) : 0,
            carbs: nutritionGoals.dailyCarbs > 0 ? Math.min(100, Math.round((todayNutrition.carbs / nutritionGoals.dailyCarbs) * 100)) : 0,
            fat: nutritionGoals.dailyFat > 0 ? Math.min(100, Math.round((todayNutrition.fat / nutritionGoals.dailyFat) * 100)) : 0
        };
    }, [meals, nutritionGoals]);

    const getMealTypeIcon = (type) => ({ 
        'Breakfast': '🍳', 
        'Lunch': '🍲', 
        'Dinner': '🍽️', 
        'Snack': '🍎', 
        'Other': '📝' 
    }[type] || '🍽️');
    
    const getMealTypeLabel = (type, isArabic) => {
        const labels = {
            'Breakfast': isArabic ? 'فطور' : 'Breakfast',
            'Lunch': isArabic ? 'غداء' : 'Lunch',
            'Dinner': isArabic ? 'عشاء' : 'Dinner',
            'Snack': isArabic ? 'وجبة خفيفة' : 'Snack',
            'Other': isArabic ? 'أخرى' : 'Other'
        };
        return labels[type] || type;
    };
    
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString(
                isArabic ? 'ar-EG' : 'en-US', 
                { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            );
        } catch {
            return dateString;
        }
    };

    // توصيات ذكية محسنة
    const getRecommendations = () => {
        const recs = [];
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
        const calorieDiff = nutritionStats.todayCalories - nutritionGoals.dailyCalories;
        
        if (nutritionStats.todayCalories === 0 && nutritionStats.totalMeals > 0) {
            recs.push({
                icon: '📝',
                text: isArabic ? 'لم تسجل وجبات اليوم، سجل وجباتك للحصول على تحليل دقيق' : 'No meals logged today, log your meals for accurate analysis',
                priority: 'high'
            });
        } else if (calorieDiff > 300) {
            recs.push({
                icon: '🔥',
                text: isArabic ? `تجاوزت هدف السعرات بـ ${calorieDiff} سعرة` : `You exceeded your calorie goal by ${calorieDiff} calories`,
                priority: 'high'
            });
        } else if (calorieDiff < -300 && nutritionStats.todayCalories > 0) {
            recs.push({
                icon: '⚠️',
                text: isArabic ? `سعراتك أقل من الهدف بـ ${Math.abs(calorieDiff)}، أضف وجبة خفيفة صحية` : `Your calories are ${Math.abs(calorieDiff)} below target, add a healthy snack`,
                priority: 'medium'
            });
        } else if (goalProgress.calories >= 80 && goalProgress.calories <= 110) {
            recs.push({
                icon: '✅',
                text: isArabic ? 'ممتاز! سعراتك قريبة من الهدف الموصى به' : 'Excellent! Your calories are close to the recommended target',
                priority: 'low'
            });
        }
        
        const proteinDeficit = nutritionGoals.dailyProtein - nutritionStats.todayProtein;
        if (proteinDeficit > 20 && nutritionStats.todayProtein > 0) {
            recs.push({
                icon: '💪',
                text: isArabic ? `تحتاج ${Math.round(proteinDeficit)}g بروتين إضافية` : `You need ${Math.round(proteinDeficit)}g additional protein`,
                priority: 'high'
            });
        } else if (nutritionStats.avgProtein < 40 && nutritionStats.avgProtein > 0 && nutritionStats.totalMeals > 3) {
            recs.push({
                icon: '🥩',
                text: isArabic ? 'متوسط البروتين منخفض، أضف مصادر بروتين في وجباتك الرئيسية' : 'Average protein is low, add protein sources to your main meals',
                priority: 'medium'
            });
        }
        
        const hasBreakfast = todayMeals.some(m => m.meal_type === 'Breakfast');
        if (!hasBreakfast && todayMeals.length > 0) {
            recs.push({
                icon: '🌅',
                text: isArabic ? 'لم تسجل وجبة فطور اليوم، الفطور يمنحك الطاقة لبدء يومك' : 'No breakfast logged today, breakfast gives you energy to start your day',
                priority: 'medium'
            });
        }
        
        if (nutritionStats.totalMeals === 0) {
            recs.push({
                icon: '🍽️',
                text: isArabic ? 'مرحباً! ابدأ بتسجيل أول وجبة للحصول على تحليل غذائي مخصص' : 'Welcome! Start by logging your first meal for personalized nutrition analysis',
                priority: 'high'
            });
        }
        
        if (recs.length === 0 && nutritionStats.totalMeals > 0) {
            recs.push({
                icon: '✅',
                text: isArabic ? 'نظامك الغذائي متوازن، استمر بهذا المستوى الممتاز' : 'Your diet is balanced, keep up this excellent level',
                priority: 'low'
            });
        }
        
        return recs;
    };

    // توقع الوزن
    const getPrediction = () => {
        const totalMeals = nutritionStats.totalMeals;
        if (totalMeals < 5) return null;
        
        const avgCalories = nutritionStats.totalCalories / totalMeals;
        const calorieDiff = avgCalories - nutritionGoals.dailyCalories;
        const weeklyChange = (calorieDiff * 7) / 7700;
        
        let status = 'info';
        let icon = '➡️';
        let text = '';
        
        if (weeklyChange > 0.3) {
            status = 'high';
            icon = '📈';
            text = isArabic ? `زيادة متوقعة ${weeklyChange.toFixed(1)} كجم أسبوعياً` : `Expected gain of ${weeklyChange.toFixed(1)} kg weekly`;
        } else if (weeklyChange > 0.1) {
            status = 'warning';
            icon = '📈';
            text = isArabic ? `زيادة طفيفة متوقعة ${weeklyChange.toFixed(1)} كجم أسبوعياً` : `Slight gain of ${weeklyChange.toFixed(1)} kg expected weekly`;
        } else if (weeklyChange < -0.3) {
            status = 'success';
            icon = '📉';
            text = isArabic ? `خسارة متوقعة ${Math.abs(weeklyChange).toFixed(1)} كجم أسبوعياً` : `Expected loss of ${Math.abs(weeklyChange).toFixed(1)} kg weekly`;
        } else if (weeklyChange < -0.1) {
            status = 'info';
            icon = '📉';
            text = isArabic ? `خسارة طفيفة متوقعة ${Math.abs(weeklyChange).toFixed(1)} كجم أسبوعياً` : `Slight loss of ${Math.abs(weeklyChange).toFixed(1)} kg expected weekly`;
        } else {
            text = isArabic ? 'الوزن مستقر متوقع بناءً على استهلاكك الحالي' : 'Weight expected to remain stable based on current intake';
        }
        
        return { icon, text, status };
    };

    const prediction = getPrediction();
    const recommendations = getRecommendations();

    if (loading && meals.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحميل البيانات...' : 'Loading data...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* شريط التحكم */}
            <div className="analytics-header">
                <h2>{isArabic ? 'لوحة التغذية' : 'Nutrition Dashboard'}</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {lastUpdate && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            🕒 {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                        </span>
                    )}
                    <button onClick={handleRefresh} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        <span>{isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                    </label>
                </div>
            </div>

            {/* التوصيات الذكية */}
            {recommendations.length > 0 && (
                <div className="recommendations-section">
                    <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                    <div className="recommendations-list">
                        {recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation priority-${rec.priority}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-title">{isArabic ? 'توصية' : 'Recommendation'}</span>
                                </div>
                                <p className="rec-advice">{rec.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* توقع الوزن */}
            {prediction && (
                <div className={`insight-card ${prediction.status === 'high' ? 'energy-critical' : prediction.status === 'warning' ? 'energy-warning' : ''}`}>
                    <div className="insight-icon">{prediction.icon}</div>
                    <div className="insight-content">
                        <h3>{isArabic ? 'توقع الوزن' : 'Weight Prediction'}</h3>
                        <p style={{ fontWeight: 'bold' }}>{prediction.text}</p>
                    </div>
                </div>
            )}

            {/* تبويبات */}
            <div className="analytics-tabs">
                <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>
                    📊 {isArabic ? 'ملخص' : 'Summary'}
                </button>
                <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
                    🧠 {isArabic ? 'تحليلات متقدمة' : 'Advanced Insights'}
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
                                    <div className="stat-label">{isArabic ? 'وجبة' : 'Meals'}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">🔥</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.totalCalories}</div>
                                    <div className="stat-label">{isArabic ? 'سعرة' : 'Calories'}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">💪</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.avgProtein}g</div>
                                    <div className="stat-label">{isArabic ? 'بروتين' : 'Protein'}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card">
                                <div className="stat-icon">📅</div>
                                <div className="stat-content">
                                    <div className="stat-value">{nutritionStats.todayCalories}</div>
                                    <div className="stat-label">{isArabic ? 'اليوم' : 'Today'}</div>
                                </div>
                            </div>
                        </div>

                        {/* تقدم الأهداف */}
                        <div className="recommendations-section">
                            <h3>🎯 {isArabic ? 'أهداف اليوم' : 'Daily Goals'}</h3>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                        <span>🔥 {isArabic ? 'سعرات' : 'Calories'}</span>
                                        <span>{goalProgress.calories}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${goalProgress.calories}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-sm)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                        <span>{Math.round(nutritionStats.todayCalories)} {isArabic ? 'سعرة' : 'cal'}</span>
                                        <span>/ {nutritionGoals.dailyCalories} {isArabic ? 'سعرة' : 'cal'}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                        <span>💪 {isArabic ? 'بروتين' : 'Protein'}</span>
                                        <span>{goalProgress.protein}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${goalProgress.protein}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-sm)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                        <span>{nutritionStats.todayProtein}g</span>
                                        <span>/ {nutritionGoals.dailyProtein}g</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* توزيع الوجبات */}
                        <div className="recommendations-section">
                            <h4>📊 {isArabic ? 'توزيع الوجبات' : 'Meal Distribution'}</h4>
                            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr', gap: 'var(--spacing-sm)' }}>
                                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
                                    const count = meals?.filter(m => m.meal_type === type).length || 0;
                                    const percent = meals?.length ? Math.round((count / meals.length) * 100) : 0;
                                    return (
                                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <span style={{ minWidth: '80px' }}>{getMealTypeIcon(type)} {getMealTypeLabel(type, isArabic)}</span>
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
                            <h3>📝 {isArabic ? 'آخر الوجبات' : 'Recent Meals'}</h3>
                            {meals?.length === 0 ? (
                                <div className="analytics-empty">
                                    <div className="empty-icon">🍽️</div>
                                    <p>{isArabic ? 'لا توجد وجبات مسجلة' : 'No meals recorded'}</p>
                                </div>
                            ) : (
                                <div className="habits-list">
                                    {meals.slice(0, 5).map(meal => (
                                        <div key={meal.id} className="habit-card">
                                            <div className="habit-header">
                                                <span className="habit-name">{getMealTypeIcon(meal.meal_type)} {getMealTypeLabel(meal.meal_type, isArabic)}</span>
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
                    {isArabic ? 'إجمالي الوجبات' : 'Total meals'}: {nutritionStats.totalMeals} | {isArabic ? 'إجمالي السعرات' : 'Total calories'}: {nutritionStats.totalCalories}
                </small>
            </div>
        </div>
    );
}

export default NutritionDashboard;