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
    const [activeTab, setActiveTab] = useState('summary');
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    
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

    // ✅ كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
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

    // دالة جلب جميع الوجبات
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

    // جلب البيانات عند التحميل
    const handleRefresh = useCallback(async () => {
        await fetchAllMeals();
        setRefreshAnalytics(prev => prev + 1);
        if (onRefresh) onRefresh();
    }, [fetchAllMeals, onRefresh]);

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

    // تنظيف
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
                todayProtein: 0,
                totalProtein: 0, 
                totalCarbs: 0, 
                totalFat: 0, 
                totalMeals: 0,
                proteinProgress: 0,
                todayMealsCount: 0
            };
        }

        const today = new Date().toDateString();
        let todayCalories = 0;
        let todayProtein = 0;
        let todayMealsCount = 0;
        
        const stats = meals.reduce((acc, meal) => {
            const isToday = new Date(meal.meal_time).toDateString() === today;
            const ingredients = meal.ingredients || [];
            const mealProtein = ingredients.reduce((sum, item) => sum + (item.protein_g || item.protein || 0), 0);
            const mealCarbs = ingredients.reduce((sum, item) => sum + (item.carbs_g || item.carbs || 0), 0);
            const mealFat = ingredients.reduce((sum, item) => sum + (item.fat_g || item.fat || 0), 0);
            
            if (isToday) {
                todayCalories += meal.total_calories || 0;
                todayProtein += mealProtein;
                todayMealsCount++;
            }
            
            return {
                totalCalories: acc.totalCalories + (meal.total_calories || 0),
                totalProtein: acc.totalProtein + mealProtein,
                totalCarbs: acc.totalCarbs + mealCarbs,
                totalFat: acc.totalFat + mealFat,
                count: acc.count + 1
            };
        }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, count: 0 });

        const proteinProgress = nutritionGoals.dailyProtein > 0 
            ? Math.min(100, Math.round((todayProtein / nutritionGoals.dailyProtein) * 100)) 
            : 0;
        
        const calorieProgress = nutritionGoals.dailyCalories > 0 
            ? Math.min(100, Math.round((todayCalories / nutritionGoals.dailyCalories) * 100)) 
            : 0;

        return {
            totalCalories: stats.totalCalories,
            avgProtein: stats.count > 0 ? roundNumber(stats.totalProtein / stats.count, 1) : 0,
            avgCarbs: stats.count > 0 ? roundNumber(stats.totalCarbs / stats.count, 1) : 0,
            avgFat: stats.count > 0 ? roundNumber(stats.totalFat / stats.count, 1) : 0,
            todayCalories,
            todayProtein: roundNumber(todayProtein, 1),
            todayMealsCount,
            totalProtein: roundNumber(stats.totalProtein, 1),
            totalCarbs: roundNumber(stats.totalCarbs, 1),
            totalFat: roundNumber(stats.totalFat, 1),
            totalMeals: stats.count,
            proteinProgress,
            calorieProgress
        };
    }, [meals, nutritionGoals]);

    // توزيع الوجبات
    const mealDistribution = useMemo(() => {
        const distribution = {
            Breakfast: 0,
            Lunch: 0,
            Dinner: 0,
            Snack: 0
        };
        
        meals.forEach(meal => {
            if (distribution[meal.meal_type] !== undefined) {
                distribution[meal.meal_type]++;
            }
        });
        
        const total = meals.length || 1;
        
        return {
            Breakfast: { count: distribution.Breakfast, percent: Math.round((distribution.Breakfast / total) * 100) },
            Lunch: { count: distribution.Lunch, percent: Math.round((distribution.Lunch / total) * 100) },
            Dinner: { count: distribution.Dinner, percent: Math.round((distribution.Dinner / total) * 100) },
            Snack: { count: distribution.Snack, percent: Math.round((distribution.Snack / total) * 100) }
        };
    }, [meals]);

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
            fat: nutritionGoals.dailyFat > 0 ? Math.min(100, Math.round((todayNutrition.fat / nutritionGoals.dailyFat) * 100)) : 0,
            values: {
                calories: Math.round(todayNutrition.calories),
                protein: roundNumber(todayNutrition.protein, 1),
                carbs: roundNumber(todayNutrition.carbs, 1),
                fat: roundNumber(todayNutrition.fat, 1)
            }
        };
    }, [meals, nutritionGoals]);

    // ✅ الحصول على أيقونة نوع الوجبة
    const getMealTypeIcon = (type) => {
        const icons = { 
            'Breakfast': '🍳', 
            'Lunch': '🍲', 
            'Dinner': '🍽️', 
            'Snack': '🍎', 
            'Other': '📝' 
        };
        return icons[type] || '🍽️';
    };
    
    // ✅ الحصول على نص نوع الوجبة
    const getMealTypeLabel = (type) => {
        const labels = {
            'Breakfast': isArabic ? 'فطور' : 'Breakfast',
            'Lunch': isArabic ? 'غداء' : 'Lunch',
            'Dinner': isArabic ? 'عشاء' : 'Dinner',
            'Snack': isArabic ? 'وجبة خفيفة' : 'Snack',
            'Other': isArabic ? 'أخرى' : 'Other'
        };
        return labels[type] || type;
    };
    
    // ✅ تنسيق التاريخ
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleString(
                isArabic ? 'ar-EG' : 'en-US', 
                { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            );
        } catch {
            return dateString;
        }
    };

    // ✅ توصيات ذكية
    const getRecommendations = useCallback(() => {
        const recs = [];
        const todayMeals = meals?.filter(meal => new Date(meal.meal_time).toDateString() === new Date().toDateString()) || [];
        const calorieDiff = nutritionStats.todayCalories - nutritionGoals.dailyCalories;
        
        if (nutritionStats.totalMeals === 0) {
            recs.push({
                icon: '🍽️',
                title: isArabic ? 'ابدأ رحلتك الغذائية' : 'Start Your Nutrition Journey',
                text: isArabic ? 'مرحباً! ابدأ بتسجيل أول وجبة للحصول على تحليل غذائي مخصص' : 'Welcome! Start by logging your first meal for personalized nutrition analysis',
                priority: 'high'
            });
        } else if (calorieDiff > 300) {
            recs.push({
                icon: '🔥',
                title: isArabic ? 'تجاوز السعرات' : 'Calorie Surplus',
                text: isArabic ? `تجاوزت هدف السعرات بـ ${calorieDiff} سعرة، حاول تعديل وجباتك القادمة` : `You exceeded your calorie goal by ${calorieDiff} calories, try adjusting your next meals`,
                priority: 'high'
            });
        } else if (calorieDiff < -300 && nutritionStats.todayCalories > 0) {
            recs.push({
                icon: '⚠️',
                title: isArabic ? 'نقص السعرات' : 'Calorie Deficit',
                text: isArabic ? `سعراتك أقل من الهدف بـ ${Math.abs(calorieDiff)}، أضف وجبة خفيفة صحية` : `Your calories are ${Math.abs(calorieDiff)} below target, add a healthy snack`,
                priority: 'medium'
            });
        } else if (goalProgress.calories >= 80 && goalProgress.calories <= 110 && nutritionStats.todayCalories > 0) {
            recs.push({
                icon: '✅',
                title: isArabic ? 'أداء ممتاز' : 'Excellent Performance',
                text: isArabic ? 'سعراتك قريبة من الهدف الموصى به، استمر بهذا المستوى' : 'Your calories are close to the recommended target, keep up this level',
                priority: 'low'
            });
        }
        
        const proteinDeficit = nutritionGoals.dailyProtein - nutritionStats.todayProtein;
        if (proteinDeficit > 20 && nutritionStats.todayProtein > 0) {
            recs.push({
                icon: '💪',
                title: isArabic ? 'احتياج بروتين' : 'Protein Needed',
                text: isArabic ? `تحتاج ${Math.round(proteinDeficit)}g بروتين إضافية، أضف مصادر بروتين مثل البيض أو الدجاج` : `You need ${Math.round(proteinDeficit)}g additional protein, add protein sources like eggs or chicken`,
                priority: 'medium'
            });
        }
        
        const hasBreakfast = todayMeals.some(m => m.meal_type === 'Breakfast');
        if (!hasBreakfast && todayMeals.length > 0) {
            recs.push({
                icon: '🌅',
                title: isArabic ? 'فطور صحي' : 'Healthy Breakfast',
                text: isArabic ? 'لم تسجل وجبة فطور اليوم، الفطور يمنحك الطاقة لبدء يومك بنشاط' : 'No breakfast logged today, breakfast gives you energy to start your day actively',
                priority: 'medium'
            });
        }
        
        if (recs.length === 0 && nutritionStats.totalMeals > 0) {
            recs.push({
                icon: '🌟',
                title: isArabic ? 'أحسنت!' : 'Great Job!',
                text: isArabic ? 'نظامك الغذائي متوازن، استمر بهذا المستوى الممتاز' : 'Your diet is balanced, keep up this excellent level',
                priority: 'low'
            });
        }
        
        return recs.slice(0, 3);
    }, [meals, nutritionStats, nutritionGoals, goalProgress, isArabic]);

    // ✅ توقع الوزن
    const getPrediction = useCallback(() => {
        const totalMeals = nutritionStats.totalMeals;
        if (totalMeals < 5) return null;
        
        const avgCalories = nutritionStats.totalCalories / totalMeals;
        const calorieDiff = avgCalories - nutritionGoals.dailyCalories;
        const weeklyChange = (calorieDiff * 7) / 7700; // 7700 calories ≈ 1kg
        
        let status = 'info';
        let icon = '➡️';
        let text = '';
        let color = '#6b7280';
        
        if (weeklyChange > 0.5) {
            status = 'high';
            icon = '📈⬆️';
            text = isArabic ? `⚠️ زيادة متوقعة ${weeklyChange.toFixed(1)} كجم أسبوعياً` : `⚠️ Expected gain of ${weeklyChange.toFixed(1)} kg weekly`;
            color = '#ef4444';
        } else if (weeklyChange > 0.2) {
            status = 'warning';
            icon = '📈';
            text = isArabic ? `📈 زيادة طفيفة متوقعة ${weeklyChange.toFixed(1)} كجم أسبوعياً` : `📈 Slight gain of ${weeklyChange.toFixed(1)} kg expected weekly`;
            color = '#f59e0b';
        } else if (weeklyChange < -0.5) {
            status = 'success';
            icon = '📉⬇️';
            text = isArabic ? `✅ خسارة متوقعة ${Math.abs(weeklyChange).toFixed(1)} كجم أسبوعياً` : `✅ Expected loss of ${Math.abs(weeklyChange).toFixed(1)} kg weekly`;
            color = '#10b981';
        } else if (weeklyChange < -0.2) {
            status = 'info';
            icon = '📉';
            text = isArabic ? `📉 خسارة طفيفة متوقعة ${Math.abs(weeklyChange).toFixed(1)} كجم أسبوعياً` : `📉 Slight loss of ${Math.abs(weeklyChange).toFixed(1)} kg expected weekly`;
            color = '#3b82f6';
        } else if (Math.abs(weeklyChange) <= 0.2) {
            text = isArabic ? '⚖️ الوزن مستقر متوقع بناءً على استهلاكك الحالي' : '⚖️ Weight expected to remain stable based on current intake';
            color = '#6b7280';
        }
        
        return { icon, text, status, color };
    }, [nutritionStats, nutritionGoals, isArabic]);

    const recommendations = getRecommendations();
    const prediction = getPrediction();

    // حالة التحميل
    if (loading && meals.length === 0) {
        return (
            <div className="nutrition-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? '📊 جاري تحميل بيانات التغذية...' : '📊 Loading nutrition data...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="nutrition-dashboard">
            {/* ✅ رأس الصفحة */}
            <div className="dashboard-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">🥗</span>
                        {isArabic ? 'لوحة التغذية' : 'Nutrition Dashboard'}
                    </h2>
                    <div className="header-stats">
                        <div className="stat-badge">
                            📊 {nutritionStats.totalMeals} {isArabic ? 'وجبة' : 'meals'}
                        </div>
                        <div className="stat-badge">
                            🔥 {nutritionStats.totalCalories} {isArabic ? 'سعرة' : 'cal'}
                        </div>
                    </div>
                </div>
                
                <div className="header-controls">
                    {lastUpdate && (
                        <div className="last-update">
                            🕐 {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                        </div>
                    )}
                    
                    <button onClick={handleRefresh} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                    
                    <label className="auto-refresh-label">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">🔄 {isArabic ? 'تلقائي' : 'Auto'}</span>
                    </label>
                </div>
            </div>

            {/* ✅ التوصيات الذكية */}
            {recommendations.length > 0 && (
                <div className="recommendations-section">
                    <div className="section-header">
                        <span className="section-icon">💡</span>
                        <h3>{isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                    </div>
                    <div className="recommendations-list">
                        {recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation-item priority-${rec.priority}`}>
                                <div className="rec-icon">{rec.icon}</div>
                                <div className="rec-content">
                                    <div className="rec-title">{rec.title}</div>
                                    <div className="rec-text">{rec.text}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ توقع الوزن */}
            {prediction && (
                <div className="prediction-card" style={{ borderLeftColor: prediction.color }}>
                    <div className="prediction-icon">{prediction.icon}</div>
                    <div className="prediction-content">
                        <div className="prediction-title">{isArabic ? '🔮 توقع الوزن' : '🔮 Weight Prediction'}</div>
                        <div className="prediction-text">{prediction.text}</div>
                    </div>
                </div>
            )}

            {/* ✅ بطاقات الإحصائيات السريعة */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🍽️</div>
                    <div className="stat-info">
                        <div className="stat-value">{nutritionStats.totalMeals}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي الوجبات' : 'Total Meals'}</div>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-info">
                        <div className="stat-value">{nutritionStats.totalCalories}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي السعرات' : 'Total Calories'}</div>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">💪</div>
                    <div className="stat-info">
                        <div className="stat-value">{nutritionStats.avgProtein}g</div>
                        <div className="stat-label">{isArabic ? 'متوسط البروتين' : 'Avg Protein'}</div>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">{nutritionStats.todayCalories}</div>
                        <div className="stat-label">{isArabic ? 'سعرات اليوم' : "Today's Calories"}</div>
                    </div>
                </div>
            </div>

            {/* ✅ تبويبات */}
            <div className="dashboard-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    📊 {isArabic ? 'ملخص' : 'Summary'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('progress')}
                >
                    🎯 {isArabic ? 'الأهداف' : 'Goals'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'meals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('meals')}
                >
                    📋 {isArabic ? 'الوجبات' : 'Meals'}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    📈 {isArabic ? 'تحليلات' : 'Analytics'}
                </button>
            </div>

            {/* ✅ محتوى التبويبات */}
            <div className="tab-content">
                {/* تبويب الملخص */}
                {activeTab === 'summary' && (
                    <div className="summary-tab">
                        {/* توزيع الوجبات */}
                        <div className="distribution-section">
                            <h4>📊 {isArabic ? 'توزيع الوجبات' : 'Meal Distribution'}</h4>
                            <div className="distribution-list">
                                {Object.entries(mealDistribution).map(([type, data]) => (
                                    <div key={type} className="distribution-item">
                                        <div className="distribution-label">
                                            <span className="meal-icon">{getMealTypeIcon(type)}</span>
                                            <span className="meal-name">{getMealTypeLabel(type)}</span>
                                            <span className="meal-count">({data.count})</span>
                                        </div>
                                        <div className="progress-bar-wrapper">
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ width: `${data.percent}%`, background: 'var(--secondary)' }}
                                                ></div>
                                            </div>
                                            <span className="distribution-percent">{data.percent}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* آخر الوجبات */}
                        <div className="recent-meals-section">
                            <h4>📝 {isArabic ? 'آخر الوجبات' : 'Recent Meals'}</h4>
                            {meals.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🍽️</div>
                                    <p>{isArabic ? 'لا توجد وجبات مسجلة' : 'No meals recorded'}</p>
                                    <p className="empty-hint">{isArabic ? 'أضف وجبتك الأولى من نموذج إضافة الوجبة' : 'Add your first meal from the meal form'}</p>
                                </div>
                            ) : (
                                <div className="meals-list">
                                    {meals.slice(0, isMobile ? 3 : 5).map(meal => (
                                        <div key={meal.id} className="meal-item">
                                            <div className="meal-header">
                                                <div className="meal-type">
                                                    <span className="meal-icon">{getMealTypeIcon(meal.meal_type)}</span>
                                                    <span className="meal-name">{getMealTypeLabel(meal.meal_type)}</span>
                                                </div>
                                                <div className="meal-calories">🔥 {meal.total_calories} {isArabic ? 'سعرة' : 'cal'}</div>
                                            </div>
                                            <div className="meal-date">{formatDate(meal.meal_time)}</div>
                                            {meal.ingredients?.length > 0 && (
                                                <div className="meal-ingredients">
                                                    {meal.ingredients.slice(0, 3).map((ing, i) => (
                                                        <span key={i} className="ingredient-tag">
                                                            {ing.name} {Math.round(ing.quantity)}{ing.unit}
                                                        </span>
                                                    ))}
                                                    {meal.ingredients.length > 3 && (
                                                        <span className="ingredient-more">+{meal.ingredients.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* تبويب الأهداف */}
                {activeTab === 'progress' && (
                    <div className="progress-tab">
                        <div className="goals-section">
                            <h4>🎯 {isArabic ? 'تقدم الأهداف اليومية' : 'Daily Goals Progress'}</h4>
                            
                            {/* سعرات */}
                            <div className="goal-item">
                                <div className="goal-header">
                                    <div className="goal-info">
                                        <span className="goal-icon">🔥</span>
                                        <span className="goal-name">{isArabic ? 'السعرات' : 'Calories'}</span>
                                    </div>
                                    <div className="goal-values">
                                        <span className="goal-current">{goalProgress.values.calories}</span>
                                        <span className="goal-separator">/</span>
                                        <span className="goal-target">{nutritionGoals.dailyCalories}</span>
                                        <span className="goal-unit">{isArabic ? 'سعرة' : 'cal'}</span>
                                    </div>
                                    <div className="goal-percent">{goalProgress.calories}%</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div 
                                            className={`progress-fill ${goalProgress.calories > 100 ? 'over' : goalProgress.calories >= 80 ? 'good' : goalProgress.calories >= 50 ? 'medium' : 'low'}`}
                                            style={{ width: `${Math.min(100, goalProgress.calories)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* بروتين */}
                            <div className="goal-item">
                                <div className="goal-header">
                                    <div className="goal-info">
                                        <span className="goal-icon">💪</span>
                                        <span className="goal-name">{isArabic ? 'البروتين' : 'Protein'}</span>
                                    </div>
                                    <div className="goal-values">
                                        <span className="goal-current">{goalProgress.values.protein}</span>
                                        <span className="goal-separator">/</span>
                                        <span className="goal-target">{nutritionGoals.dailyProtein}</span>
                                        <span className="goal-unit">g</span>
                                    </div>
                                    <div className="goal-percent">{goalProgress.protein}%</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${Math.min(100, goalProgress.protein)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* كاربوهيدرات */}
                            <div className="goal-item">
                                <div className="goal-header">
                                    <div className="goal-info">
                                        <span className="goal-icon">🍚</span>
                                        <span className="goal-name">{isArabic ? 'الكربوهيدرات' : 'Carbs'}</span>
                                    </div>
                                    <div className="goal-values">
                                        <span className="goal-current">{goalProgress.values.carbs}</span>
                                        <span className="goal-separator">/</span>
                                        <span className="goal-target">{nutritionGoals.dailyCarbs}</span>
                                        <span className="goal-unit">g</span>
                                    </div>
                                    <div className="goal-percent">{goalProgress.carbs}%</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${Math.min(100, goalProgress.carbs)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* دهون */}
                            <div className="goal-item">
                                <div className="goal-header">
                                    <div className="goal-info">
                                        <span className="goal-icon">🥑</span>
                                        <span className="goal-name">{isArabic ? 'الدهون' : 'Fats'}</span>
                                    </div>
                                    <div className="goal-values">
                                        <span className="goal-current">{goalProgress.values.fat}</span>
                                        <span className="goal-separator">/</span>
                                        <span className="goal-target">{nutritionGoals.dailyFat}</span>
                                        <span className="goal-unit">g</span>
                                    </div>
                                    <div className="goal-percent">{goalProgress.fat}%</div>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ width: `${Math.min(100, goalProgress.fat)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="goals-note">
                            💡 {isArabic 
                                ? 'الأهداف مبنية على نظام غذائي متوسط (2000 سعرة). يمكنك تعديلها حسب احتياجاتك.'
                                : 'Goals are based on an average diet (2000 calories). You can adjust them according to your needs.'}
                        </div>
                    </div>
                )}

                {/* تبويب الوجبات */}
                {activeTab === 'meals' && (
                    <div className="meals-tab">
                        <div className="all-meals-section">
                            <h4>📋 {isArabic ? 'جميع الوجبات' : 'All Meals'}</h4>
                            {meals.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🍽️</div>
                                    <p>{isArabic ? 'لا توجد وجبات مسجلة' : 'No meals recorded'}</p>
                                </div>
                            ) : (
                                <div className="all-meals-list">
                                    {meals.map(meal => (
                                        <div key={meal.id} className="meal-card">
                                            <div className="meal-card-header">
                                                <div className="meal-type-badge" style={{ background: meal.meal_type === 'Breakfast' ? '#f59e0b' : meal.meal_type === 'Lunch' ? '#10b981' : meal.meal_type === 'Dinner' ? '#8b5cf6' : '#6b7280' }}>
                                                    {getMealTypeIcon(meal.meal_type)} {getMealTypeLabel(meal.meal_type)}
                                                </div>
                                                <div className="meal-card-calories">🔥 {meal.total_calories} {isArabic ? 'سعرة' : 'cal'}</div>
                                            </div>
                                            <div className="meal-card-date">{formatDate(meal.meal_time)}</div>
                                            {meal.ingredients?.length > 0 && (
                                                <div className="meal-card-ingredients">
                                                    <div className="ingredients-title">{isArabic ? 'المكونات' : 'Ingredients'}:</div>
                                                    <div className="ingredients-list">
                                                        {meal.ingredients.map((ing, i) => (
                                                            <span key={i} className="ingredient-badge">
                                                                {ing.name} ({Math.round(ing.quantity)}{ing.unit})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* تبويب التحليلات */}
                {activeTab === 'analytics' && (
                    <div className="analytics-tab">
                        <NutritionAnalytics refreshTrigger={refreshAnalytics} isArabic={isArabic} />
                    </div>
                )}
            </div>

            {/* ✅ تذييل */}
            <div className="dashboard-footer">
                <small>
                    📊 {isArabic ? 'إجمالي الوجبات' : 'Total meals'}: {nutritionStats.totalMeals} | 
                    🔥 {isArabic ? 'إجمالي السعرات' : 'Total calories'}: {nutritionStats.totalCalories}
                </small>
            </div>

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                .nutrition-dashboard {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                /* ===== رأس الصفحة ===== */
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .header-title h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .title-icon {
                    font-size: 1.5rem;
                }

                .header-stats {
                    display: flex;
                    gap: 0.5rem;
                }

                .stat-badge {
                    padding: 0.35rem 0.85rem;
                    background: var(--tertiary-bg);
                    border-radius: 50px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .last-update {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem 0.5rem;
                    background: var(--tertiary-bg);
                    border-radius: 12px;
                }

                .refresh-btn {
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    padding: 0.5rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .refresh-btn:hover {
                    background: var(--hover-bg);
                    transform: rotate(180deg);
                }

                .auto-refresh-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                }

                .auto-refresh-label input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    width: 36px;
                    height: 18px;
                    background: var(--border-light);
                    border-radius: 18px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all var(--transition-fast);
                }

                input:checked + .toggle-slider {
                    background: var(--primary);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(18px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-18px);
                }

                .toggle-text {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                /* ===== التوصيات ===== */
                .recommendations-section {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .section-icon {
                    font-size: 1.2rem;
                }

                .section-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .recommendation-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    border-radius: 12px;
                }

                .recommendation-item.priority-high {
                    background: rgba(239, 68, 68, 0.1);
                    border-left: 3px solid #ef4444;
                }

                .recommendation-item.priority-medium {
                    background: rgba(245, 158, 11, 0.1);
                    border-left: 3px solid #f59e0b;
                }

                .recommendation-item.priority-low {
                    background: rgba(16, 185, 129, 0.1);
                    border-left: 3px solid #10b981;
                }

                [dir="rtl"] .recommendation-item.priority-high { border-left: none; border-right: 3px solid #ef4444; }
                [dir="rtl"] .recommendation-item.priority-medium { border-left: none; border-right: 3px solid #f59e0b; }
                [dir="rtl"] .recommendation-item.priority-low { border-left: none; border-right: 3px solid #10b981; }

                .rec-icon {
                    font-size: 1.5rem;
                }

                .rec-content {
                    flex: 1;
                }

                .rec-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    margin-bottom: 0.25rem;
                }

                .rec-text {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                /* ===== توقع الوزن ===== */
                .prediction-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    margin-bottom: 1.5rem;
                    border-left: 4px solid;
                }

                [dir="rtl"] .prediction-card {
                    border-left: none;
                    border-right: 4px solid;
                }

                .prediction-icon {
                    font-size: 2rem;
                }

                .prediction-content {
                    flex: 1;
                }

                .prediction-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    margin-bottom: 0.25rem;
                }

                .prediction-text {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                /* ===== بطاقات الإحصائيات ===== */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .stat-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: 1px solid var(--border-light);
                }

                .stat-icon {
                    font-size: 1.8rem;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg);
                    border-radius: 12px;
                }

                .stat-info {
                    flex: 1;
                }

                .stat-value {
                    font-size: 1.3rem;
                    font-weight: bold;
                    color: var(--text-primary);
                    line-height: 1.2;
                }

                .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                /* ===== تبويبات ===== */
                .dashboard-tabs {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-light);
                    padding-bottom: 0.5rem;
                }

                .tab-btn {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.85rem;
                }

                .tab-btn:hover {
                    background: var(--hover-bg);
                    transform: translateY(-2px);
                }

                .tab-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                /* ===== محتوى التبويبات ===== */
                .summary-tab,
                .progress-tab,
                .meals-tab,
                .analytics-tab {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .distribution-section h4,
                .recent-meals-section h4,
                .goals-section h4,
                .all-meals-section h4 {
                    margin: 0 0 1rem;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .distribution-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .distribution-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .distribution-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    min-width: 100px;
                }

                .meal-icon {
                    font-size: 1rem;
                }

                .meal-name {
                    font-weight: 500;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .meal-count {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .progress-bar-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: var(--border-light);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width var(--transition-medium);
                }

                .progress-fill.good { background: #10b981; }
                .progress-fill.medium { background: #f59e0b; }
                .progress-fill.low { background: #ef4444; }
                .progress-fill.over { background: #ef4444; }

                .distribution-percent {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    min-width: 45px;
                }

                /* ===== الوجبات ===== */
                .meals-list,
                .all-meals-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .meal-item,
                .meal-card {
                    background: var(--card-bg);
                    border-radius: 14px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                }

                .meal-header,
                .meal-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .meal-type,
                .meal-type-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .meal-type-badge {
                    background: rgba(0,0,0,0.1);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                }

                .meal-calories,
                .meal-card-calories {
                    font-weight: 600;
                    color: #f59e0b;
                }

                .meal-date,
                .meal-card-date {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }

                .meal-ingredients,
                .meal-card-ingredients {
                    margin-top: 0.5rem;
                }

                .ingredients-title {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }

                .ingredients-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .ingredient-tag,
                .ingredient-badge {
                    background: var(--tertiary-bg);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .ingredient-more {
                    background: var(--tertiary-bg);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                /* ===== الأهداف ===== */
                .goal-item {
                    margin-bottom: 1rem;
                }

                .goal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .goal-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .goal-icon {
                    font-size: 1rem;
                }

                .goal-name {
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .goal-values {
                    display: flex;
                    align-items: baseline;
                    gap: 0.25rem;
                }

                .goal-current {
                    font-weight: bold;
                    color: var(--text-primary);
                }

                .goal-separator {
                    color: var(--text-tertiary);
                }

                .goal-target {
                    color: var(--text-secondary);
                }

                .goal-unit {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .goal-percent {
                    font-weight: bold;
                    color: var(--primary);
                    font-size: 0.85rem;
                }

                .goals-note {
                    margin-top: 1rem;
                    padding: 0.75rem;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: #3b82f6;
                }

                /* ===== حالات خاصة ===== */
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                    opacity: 0.5;
                }

                .empty-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-top: 0.5rem;
                }

                .dashboard-footer {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-light);
                    text-align: center;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .nutrition-loading {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 3rem;
                    text-align: center;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 1024px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .nutrition-dashboard {
                        padding: 1rem;
                    }

                    .dashboard-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-controls {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }

                    .stat-card {
                        padding: 0.75rem;
                    }

                    .stat-icon {
                        width: 35px;
                        height: 35px;
                        font-size: 1.3rem;
                    }

                    .stat-value {
                        font-size: 1.1rem;
                    }

                    .dashboard-tabs {
                        justify-content: center;
                    }

                    .tab-btn {
                        font-size: 0.75rem;
                        padding: 0.4rem 0.8rem;
                    }

                    .distribution-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .progress-bar-wrapper {
                        width: 100%;
                    }

                    .goal-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .meal-header,
                    .meal-card-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .header-stats {
                        width: 100%;
                        justify-content: space-between;
                    }
                }

                /* ===== RTL دعم ===== */
                [dir="rtl"] .stat-card {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .distribution-label {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .goal-info {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .meal-header,
                [dir="rtl"] .meal-card-header {
                    flex-direction: row-reverse;
                }

                @media (max-width: 768px) {
                    [dir="rtl"] .meal-header,
                    [dir="rtl"] .meal-card-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `}</style>
        </div>
    );
}

export default NutritionDashboard;