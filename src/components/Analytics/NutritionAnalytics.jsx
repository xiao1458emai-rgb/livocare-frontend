// src/components/Analytics/NutritionAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import axiosInstance from '../../services/api';
import '../../index.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const NutritionAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode') === 'true';
        return saved || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // إعادة جلب البيانات عند تغيير اللغة
                fetchData();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // أهداف المستخدم
    const USER_GOALS = {
        dailyCalories: 2000,
        dailyProtein: 80,
        dailyCarbs: 250,
        dailyFat: 55
    };

    useEffect(() => {
        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark-mode');
            setDarkMode(isDark);
        };
        
        checkDarkMode();
        
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [refreshTrigger]);

    // تحليل جودة الطعام
    const analyzeFoodQuality = (meals) => {
        let highQualityCount = 0;
        let processedFoodCount = 0;
        let vegetableCount = 0;
        let proteinSources = new Set();
        
        meals.forEach(meal => {
            const ingredients = meal.ingredients || [];
            
            ingredients.forEach(ing => {
                const name = (ing.name || '').toLowerCase();
                if (isArabic ? 
                    ['دجاج', 'سمك', 'لحم', 'بيض', 'تونة', 'جبن'].some(p => name.includes(p)) :
                    ['chicken', 'fish', 'meat', 'egg', 'tuna', 'cheese'].some(p => name.includes(p))
                ) {
                    proteinSources.add(name);
                    highQualityCount++;
                }
                if (isArabic ?
                    ['خضار', 'خس', 'طماطم', 'خيار', 'بروكلي', 'سبانخ'].some(v => name.includes(v)) :
                    ['vegetable', 'lettuce', 'tomato', 'cucumber', 'broccoli', 'spinach'].some(v => name.includes(v))
                ) {
                    vegetableCount++;
                    highQualityCount++;
                }
                if (isArabic ?
                    ['pizza', 'burger', 'fries', 'chips', 'candy', 'soda'].some(p => name.includes(p)) :
                    ['pizza', 'burger', 'fries', 'chips', 'candy', 'soda'].some(p => name.includes(p))
                ) {
                    processedFoodCount++;
                }
            });
        });
        
        return {
            hasVegetables: vegetableCount > 0,
            hasQualityProtein: proteinSources.size > 0,
            processedFoodRisk: processedFoodCount > meals.length * 0.5,
            proteinVariety: proteinSources.size,
            vegetableIntake: vegetableCount
        };
    };

    // تحليل نمط الأكل
    const analyzeEatingPattern = (meals) => {
        const mealHours = meals.map(m => m.meal_time ? new Date(m.meal_time).getHours() : 0);
        const lateMeals = mealHours.filter(h => h >= 22 || h <= 4).length;
        const morningMeals = mealHours.filter(h => h >= 6 && h <= 10).length;
        
        const mealTypes = meals.map(m => m.meal_type);
        
        let pattern = '';
        if (lateMeals > meals.length * 0.3) pattern = 'night_eater';
        else if (morningMeals === 0 && meals.length > 0) pattern = 'skip_breakfast';
        else pattern = 'regular';
        
        return {
            pattern,
            lateMealsCount: lateMeals,
            skipBreakfast: morningMeals === 0 && meals.length > 0,
            mealFrequency: meals.length
        };
    };

    // تحليل التوازن الغذائي
    const analyzeMacroBalance = (avgProtein, avgCarbs, avgFat) => {
        const total = avgProtein + avgCarbs + avgFat;
        if (total === 0) return null;
        
        const proteinPercent = (avgProtein / total) * 100;
        const carbsPercent = (avgCarbs / total) * 100;
        const fatPercent = (avgFat / total) * 100;
        
        const issues = [];
        if (proteinPercent < 15) issues.push('protein_low');
        if (carbsPercent > 60) issues.push('carbs_high');
        if (fatPercent > 35) issues.push('fat_high');
        
        return {
            proteinPercent: proteinPercent.toFixed(1),
            carbsPercent: carbsPercent.toFixed(1),
            fatPercent: fatPercent.toFixed(1),
            issues
        };
    };

    const analyzeMeals = (meals) => {
        if (!meals || meals.length === 0) return null;

        const totalMeals = meals.length;
        let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
        
        meals.forEach(meal => {
            totalCalories += meal.total_calories || 0;
            totalProtein += meal.total_protein || 0;
            totalCarbs += meal.total_carbs || 0;
            totalFat += meal.total_fat || 0;
        });
        
        const avgCalories = totalCalories / totalMeals;
        const avgProtein = totalProtein / totalMeals;
        const avgCarbs = totalCarbs / totalMeals;
        const avgFat = totalFat / totalMeals;
        
        const calorieProgress = Math.min(100, Math.round((totalCalories / USER_GOALS.dailyCalories) * 100));
        const proteinProgress = Math.min(100, Math.round((totalProtein / USER_GOALS.dailyProtein) * 100));
        
        const calorieDiff = totalCalories - USER_GOALS.dailyCalories;
        const proteinNeeded = Math.max(0, USER_GOALS.dailyProtein - totalProtein);
        
        const distribution = {};
        meals.forEach(m => {
            const type = m.meal_type || 'Other';
            distribution[type] = (distribution[type] || 0) + 1;
        });

        const weekly = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayMeals = meals.filter(m => {
                if (!m.meal_time) return false;
                return new Date(m.meal_time).toDateString() === date.toDateString();
            });
            weekly.push({
                day: date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' }),
                calories: dayMeals.reduce((s, m) => s + (m.total_calories || 0), 0),
                protein: dayMeals.reduce((s, m) => s + (m.total_protein || 0), 0),
            });
        }
        
        const foodQuality = analyzeFoodQuality(meals);
        const eatingPattern = analyzeEatingPattern(meals);
        const macroBalance = analyzeMacroBalance(avgProtein, avgCarbs, avgFat);
        
        let nutritionScore = 0;
        
        if (totalCalories >= USER_GOALS.dailyCalories * 0.9 && totalCalories <= USER_GOALS.dailyCalories * 1.1) nutritionScore += 30;
        else if (totalCalories > 0) nutritionScore += 15;
        
        if (totalProtein >= USER_GOALS.dailyProtein) nutritionScore += 30;
        else if (totalProtein >= USER_GOALS.dailyProtein * 0.7) nutritionScore += 20;
        else if (totalProtein > 0) nutritionScore += 10;
        
        const mealTypesCount = Object.keys(distribution).length;
        if (mealTypesCount >= 3) nutritionScore += 20;
        else if (mealTypesCount >= 1) nutritionScore += 10;
        
        if (foodQuality.hasVegetables) nutritionScore += 10;
        if (foodQuality.hasQualityProtein) nutritionScore += 10;
        if (foodQuality.processedFoodRisk) nutritionScore -= 15;
        
        nutritionScore = Math.min(100, Math.max(0, nutritionScore));
        
        const recommendations = [];
        
        if (calorieDiff > 300) {
            recommendations.push({
                icon: '🔥',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'سعرات مرتفعة' : 'High Calories',
                advice: isArabic 
                    ? `تناولت ${totalCalories} سعرة (+${calorieDiff} عن هدفك)`
                    : `You consumed ${totalCalories} calories (+${calorieDiff} above target)`,
                action: isArabic 
                    ? 'قلل الكربوهيدرات في الوجبة القادمة، وزد الخضروات'
                    : 'Reduce carbs in your next meal, increase vegetables',
                details: [isArabic ? 'اشرب ماء قبل الوجبات' : 'Drink water before meals']
            });
        } else if (calorieDiff < -300 && totalCalories > 0) {
            recommendations.push({
                icon: '⚠️',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'سعرات منخفضة' : 'Low Calories',
                advice: isArabic 
                    ? `تناولت ${totalCalories} سعرة فقط (نقص ${Math.abs(calorieDiff)} سعرة)`
                    : `You only consumed ${totalCalories} calories (deficit ${Math.abs(calorieDiff)})`,
                action: isArabic 
                    ? 'أضف وجبة خفيفة صحية: زبادي مع فواكه أو مكسرات'
                    : 'Add a healthy snack: yogurt with fruit or nuts',
                details: [isArabic ? 'لا تهمل وجبة الفطور' : 'Don\'t skip breakfast']
            });
        }
        
        if (proteinNeeded > 20 && totalProtein > 0) {
            recommendations.push({
                icon: '💪',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'نقص في البروتين' : 'Protein Deficiency',
                advice: isArabic 
                    ? `تحتاج ${Math.round(proteinNeeded)}g إضافية من البروتين اليوم`
                    : `You need ${Math.round(proteinNeeded)}g additional protein today`,
                action: isArabic 
                    ? 'أضف: بيضتين (12g) أو صدر دجاج (30g) أو علبة تونة (25g)'
                    : 'Add: 2 eggs (12g) or chicken breast (30g) or tuna can (25g)',
                details: [isArabic ? 'البروتين يمنحك الشبع ويدعم العضلات' : 'Protein provides satiety and supports muscles']
            });
        }
        
        if (eatingPattern.skipBreakfast && totalMeals > 0) {
            recommendations.push({
                icon: '🌅',
                timing: 'tomorrow',
                priority: 'medium',
                title: isArabic ? 'تناول الفطور' : 'Eat Breakfast',
                advice: isArabic ? 'الفطور يمنحك الطاقة لبدء يومك بنشاط' : 'Breakfast gives you energy to start your day',
                action: isArabic 
                    ? 'جرب: زبادي يوناني مع عسل وجوز، أو بيض مع خبز أسمر'
                    : 'Try: Greek yogurt with honey and walnuts, or eggs with whole wheat bread',
                details: [isArabic ? 'البروتين في الفطور يقلل الجوع خلال اليوم' : 'Protein at breakfast reduces hunger throughout the day']
            });
        }
        
        if (!foodQuality.hasVegetables && totalMeals > 0) {
            recommendations.push({
                icon: '🥬',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'نقص في الخضروات' : 'Low Vegetable Intake',
                advice: isArabic ? 'لم تسجل أي خضروات اليوم' : 'No vegetables recorded today',
                action: isArabic 
                    ? 'أضف سلطة خضراء أو خضاراً مشوياً إلى وجبتك القادمة'
                    : 'Add a green salad or grilled vegetables to your next meal',
                details: [isArabic ? 'الخضروات غنية بالفيتامينات والألياف' : 'Vegetables are rich in vitamins and fiber']
            });
        }
        
        let healthStatus = 'good';
        if (nutritionScore < 40) healthStatus = 'poor';
        else if (nutritionScore < 60) healthStatus = 'fair';
        else if (nutritionScore < 80) healthStatus = 'good';
        else healthStatus = 'excellent';
        
        const statusText = {
            poor: isArabic ? 'سيئة' : 'Poor',
            fair: isArabic ? 'متوسطة' : 'Fair',
            good: isArabic ? 'جيدة' : 'Good',
            excellent: isArabic ? 'ممتازة' : 'Excellent'
        };
        
        const statusColor = {
            poor: '#ef4444',
            fair: '#f59e0b',
            good: '#3b82f6',
            excellent: '#10b981'
        };
        
        const chartData = {
            labels: weekly.map(w => w.day),
            datasets: [{
                label: isArabic ? 'السعرات الحرارية' : 'Calories',
                data: weekly.map(w => w.calories),
                borderColor: '#ef4444',
                backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#ef4444',
            }]
        };
        
        const proteinTrendData = {
            labels: weekly.map(w => w.day),
            datasets: [{
                label: isArabic ? 'البروتين (g)' : 'Protein (g)',
                data: weekly.map(w => w.protein || 0),
                borderColor: '#10b981',
                backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#10b981',
            }]
        };
        
        const distributionData = {
            labels: Object.keys(distribution).map(k => {
                const typeMap = {
                    'Breakfast': isArabic ? 'فطور' : 'Breakfast',
                    'Lunch': isArabic ? 'غداء' : 'Lunch',
                    'Dinner': isArabic ? 'عشاء' : 'Dinner',
                    'Snack': isArabic ? 'وجبة خفيفة' : 'Snack',
                    'Other': isArabic ? 'أخرى' : 'Other'
                };
                return typeMap[k] || k;
            }),
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'],
                borderWidth: 0,
            }]
        };
        
        const macroData = {
            labels: [isArabic ? 'بروتين' : 'Protein', isArabic ? 'كربوهيدرات' : 'Carbs', isArabic ? 'دهون' : 'Fats'],
            datasets: [{
                data: macroBalance ? [macroBalance.proteinPercent, macroBalance.carbsPercent, macroBalance.fatPercent] : [0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0,
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top', 
                    labels: { 
                        color: darkMode ? '#f8fafc' : '#0f172a',
                        font: { size: 11 }
                    } 
                },
                tooltip: { rtl: isArabic }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ticks: { color: darkMode ? '#94a3b8' : '#475569' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: darkMode ? '#94a3b8' : '#475569' }
                }
            }
        };
        
        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: darkMode ? '#f8fafc' : '#0f172a',
                        font: { size: 10 }
                    } 
                },
                tooltip: { rtl: isArabic }
            }
        };

        return {
            summary: {
                totalMeals,
                totalCalories: Math.round(totalCalories),
                totalProtein: totalProtein.toFixed(1),
                avgCalories: Math.round(avgCalories),
                avgProtein: avgProtein.toFixed(1),
                calorieProgress,
                proteinProgress,
                calorieDiff: calorieDiff > 0 ? `+${calorieDiff}` : calorieDiff,
                proteinNeeded: Math.round(proteinNeeded),
                nutritionScore,
                healthStatus,
                healthStatusText: statusText[healthStatus],
                healthStatusColor: statusColor[healthStatus],
            },
            analysis: { foodQuality, eatingPattern, macroBalance },
            recommendations,
            chartData,
            proteinTrendData,
            distributionData,
            macroData,
            chartOptions,
            pieOptions,
        };
    };

    const fetchData = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        
        try {
            const mealsRes = await axiosInstance.get('/meals/').catch(() => ({ data: [] }));
            const meals = Array.isArray(mealsRes.data) ? mealsRes.data : 
                         (mealsRes.data?.results ? mealsRes.data.results : []);
            
            if (isMountedRef.current) {
                const analysis = analyzeMeals(meals);
                setData(analysis);
                if (!analysis && meals.length === 0) {
                    setError(isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis');
                }
            }
        } catch (err) {
            console.error('Error fetching nutrition data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [isArabic]);

    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error">
                    <p>📊 {error || (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                    <button onClick={fetchData} className="retry-btn">
                        🔄 {isArabic ? 'تحديث' : 'Refresh'}
                    </button>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل التغذية' : 'Nutrition Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>

            {/* تقييم التغذية الشامل */}
            <div className="global-health-card">
                <h3>{isArabic ? 'تقييم التغذية' : 'Nutrition Assessment'}</h3>
                <div className="health-score-container">
                    <div className="health-score-circle">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                            <circle 
                                cx="60" cy="60" r="54" 
                                fill="none" 
                                stroke={data.summary.healthStatusColor} 
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 54}`}
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - data.summary.nutritionScore / 100)}`}
                                transform="rotate(-90 60 60)"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">
                                {data.summary.nutritionScore}%
                            </text>
                        </svg>
                    </div>
                    <div className="health-status">
                        <span className="status-badge" style={{ background: data.summary.healthStatusColor }}>
                            {data.summary.healthStatusText}
                        </span>
                    </div>
                </div>
                
                <div className="health-analysis">
                    <div className="positives-list">
                        <strong>{isArabic ? 'التحليل' : 'Analysis'}:</strong>
                        {data.summary.calorieDiff !== 0 && (
                            <div className={`positive-item ${data.summary.calorieDiff > 0 ? 'warning' : 'info'}`}>
                                {isArabic 
                                    ? `🔥 السعرات: ${data.summary.calorieDiff > 0 ? 'أعلى' : 'أقل'} من هدفك بـ ${Math.abs(data.summary.calorieDiff)} سعرة`
                                    : `🔥 Calories: ${data.summary.calorieDiff > 0 ? 'above' : 'below'} target by ${Math.abs(data.summary.calorieDiff)}`}
                            </div>
                        )}
                        {data.summary.totalProtein > 0 && (
                            <div className="positive-item">
                                {isArabic 
                                    ? `💪 البروتين: ${data.summary.proteinProgress}% من الهدف (${data.summary.totalProtein}g / ${USER_GOALS.dailyProtein}g)`
                                    : `💪 Protein: ${data.summary.proteinProgress}% of target (${data.summary.totalProtein}g / ${USER_GOALS.dailyProtein}g)`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ملاحظات ذكية عن نمط الأكل */}
            {(data.analysis.eatingPattern.skipBreakfast || data.analysis.eatingPattern.pattern === 'night_eater') && (
                <div className="correlations-card">
                    <h3>{isArabic ? 'ملاحظات ذكية' : 'Smart Insights'}</h3>
                    <div className="correlations-list">
                        {data.analysis.eatingPattern.skipBreakfast && (
                            <div className="correlation-item severity-medium">
                                <p className="correlation-message">
                                    {isArabic ? '🌅 لا تتناول وجبة الفطور' : '🌅 You skip breakfast'}
                                </p>
                                <p className="correlation-advice">
                                    💡 {isArabic ? 'الفطور يزيد التركيز ويقلل الجوع خلال اليوم' : 'Breakfast increases focus and reduces hunger'}
                                </p>
                            </div>
                        )}
                        {data.analysis.eatingPattern.pattern === 'night_eater' && (
                            <div className="correlation-item severity-warning">
                                <p className="correlation-message">
                                    {isArabic ? `🌙 تميل لتناول الطعام في وقت متأخر` : `🌙 You tend to eat late`}
                                </p>
                                <p className="correlation-advice">
                                    💡 {isArabic ? 'الأكل المتأخر يؤثر على جودة النوم' : 'Late eating affects sleep quality'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* بطاقات الإحصائيات */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon">🍽️</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.summary.totalMeals}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي الوجبات' : 'Total Meals'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.summary.totalCalories}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي السعرات' : 'Total Calories'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">💪</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.summary.totalProtein}g</div>
                        <div className="stat-label">{isArabic ? 'إجمالي البروتين' : 'Total Protein'}</div>
                    </div>
                </div>
            </div>

            {/* شريط التقدم */}
            <div className="progress-container" style={{ marginBottom: '1.5rem' }}>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${data.summary.proteinProgress}%`, background: '#10b981' }}>
                        <span className="progress-text">{isArabic ? 'البروتين' : 'Protein'}: {data.summary.proteinProgress}%</span>
                    </div>
                </div>
                <div className="progress-bar-bg" style={{ marginTop: '0.5rem' }}>
                    <div className="progress-bar-fill" style={{ width: `${data.summary.calorieProgress}%`, background: '#ef4444' }}>
                        <span className="progress-text">{isArabic ? 'السعرات' : 'Calories'}: {data.summary.calorieProgress}%</span>
                    </div>
                </div>
            </div>

            {/* الرسوم البيانية */}
            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
                <div className="strengths">
                    <h4>📈 {isArabic ? 'اتجاه السعرات الأسبوعي' : 'Weekly Calories Trend'}</h4>
                    <div style={{ height: '220px' }}>
                        <Line data={data.chartData} options={data.chartOptions} />
                    </div>
                </div>
                <div className="weaknesses">
                    <h4>💪 {isArabic ? 'اتجاه البروتين الأسبوعي' : 'Weekly Protein Trend'}</h4>
                    <div style={{ height: '220px' }}>
                        <Line data={data.proteinTrendData} options={data.chartOptions} />
                    </div>
                </div>
            </div>

            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
                <div className="strengths">
                    <h4>🥗 {isArabic ? 'توزيع الوجبات' : 'Meal Distribution'}</h4>
                    <div style={{ height: '200px' }}>
                        <Pie data={data.distributionData} options={data.pieOptions} />
                    </div>
                </div>
                <div className="weaknesses">
                    <h4>⚖️ {isArabic ? 'توازن الماكروز' : 'Macro Balance'}</h4>
                    <div style={{ height: '200px' }}>
                        <Pie data={data.macroData} options={data.pieOptions} />
                    </div>
                </div>
            </div>

            {/* التوصيات الذكية */}
            {data.recommendations.length > 0 && (
                <div className="recommendations-card">
                    <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                    <div className="recommendations-list">
                        {data.recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-title">{rec.title}</span>
                                    <span className={`rec-timing timing-${rec.timing}`}>
                                        {rec.timing === 'immediate' ? (isArabic ? '⚠️ فوراً' : '⚠️ Immediate') :
                                         rec.timing === 'today' ? (isArabic ? '📅 اليوم' : '📅 Today') :
                                         rec.timing === 'next_meal' ? (isArabic ? '🍽️ الوجبة القادمة' : '🍽️ Next meal') :
                                         rec.timing === 'tomorrow' ? (isArabic ? '📅 غداً' : '📅 Tomorrow') :
                                         (isArabic ? '💡 عام' : '💡 General')}
                                    </span>
                                </div>
                                <p className="rec-advice">{rec.advice}</p>
                                <p className="rec-action">🎯 {rec.action}</p>
                                {rec.details && rec.details.length > 0 && (
                                    <ul className="rec-details">
                                        {rec.details.map((detail, i) => <li key={i}>✓ {detail}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="analytics-footer">
                <small>
                    {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
                                         <style jsx>{`
/* ===========================================
   NutritionAnalytics.css - الأنماط الداخلية فقط
   ✅ تحليل التغذية - ألوان طعام مميزة
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.analytics-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.analytics-container.dark-mode {
    background: #1e293b;
}

/* ===== الرأس ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.analytics-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .analytics-header h2 {
    background: linear-gradient(135deg, #f87171, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #334155;
    color: #94a3b8;
}

.refresh-btn:hover {
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    transform: rotate(180deg);
}

/* ===== بطاقة التقييم الصحي ===== */
.global-health-card {
    background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .global-health-card {
    background: linear-gradient(135deg, #dc2626, #d97706);
}

.global-health-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 500;
    opacity: 0.9;
}

.health-score-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
}

.health-score-circle {
    position: relative;
    width: 100px;
    height: 100px;
}

.health-score-circle svg {
    width: 100%;
    height: 100%;
}

.health-score-circle text {
    fill: white;
    font-size: 20px;
    font-weight: bold;
}

.status-badge {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
}

.health-analysis {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0.75rem;
}

.positives-list {
    margin-bottom: 0.75rem;
}

.positives-list strong {
    font-size: 0.7rem;
    display: block;
    margin-bottom: 0.5rem;
    opacity: 0.8;
}

.positive-item {
    font-size: 0.75rem;
    padding: 0.35rem 0.5rem;
    border-radius: 10px;
    margin-bottom: 0.35rem;
    background: rgba(255, 255, 255, 0.1);
}

.positive-item.warning {
    background: rgba(245, 158, 11, 0.3);
}

.positive-item.info {
    background: rgba(59, 130, 246, 0.3);
}

/* ===== بطاقة الملاحظات الذكية ===== */
.correlations-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlations-card {
    background: #0f172a;
    border-color: #334155;
}

.correlations-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlations-card h3 {
    color: #f1f5f9;
}

.correlations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.correlation-item {
    padding: 0.75rem;
    border-radius: 14px;
    background: var(--card-bg, #ffffff);
    border-left: 3px solid;
}

.dark-mode .correlation-item {
    background: #1e293b;
}

.correlation-item.severity-danger {
    border-left-color: #ef4444;
}

.correlation-item.severity-warning {
    border-left-color: #f59e0b;
}

.correlation-item.severity-medium {
    border-left-color: #3b82f6;
}

[dir="rtl"] .correlation-item {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .correlation-item.severity-danger {
    border-right-color: #ef4444;
}

[dir="rtl"] .correlation-item.severity-warning {
    border-right-color: #f59e0b;
}

[dir="rtl"] .correlation-item.severity-medium {
    border-right-color: #3b82f6;
}

.correlation-message {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0 0 0.35rem 0;
    color: var(--text-primary, #0f172a);
}

.correlation-advice {
    font-size: 0.75rem;
    margin: 0;
    color: var(--text-secondary, #64748b);
}

/* ===== شبكة الإحصائيات ===== */
.analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.analytics-stat-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-stat-card {
    background: #0f172a;
    border-color: #334155;
}

.analytics-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode .analytics-stat-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-icon {
    font-size: 1.8rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    border-radius: 16px;
    color: white;
}

.stat-content {
    flex: 1;
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    line-height: 1.2;
}

.dark-mode .stat-value {
    color: #f1f5f9;
}

.stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

/* ===== شريط التقدم ===== */
.progress-container {
    margin-bottom: 1.5rem;
}

.progress-bar-bg {
    background: var(--border-light, #e2e8f0);
    border-radius: 10px;
    height: 32px;
    overflow: hidden;
    position: relative;
}

.dark-mode .progress-bar-bg {
    background: #334155;
}

.progress-bar-fill {
    background: linear-gradient(90deg, #ef4444, #f59e0b);
    height: 100%;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.75rem;
    transition: width 0.5s ease;
}

.progress-bar-fill[style*="background: #10b981"] {
    background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
}

[dir="rtl"] .progress-bar-fill {
    justify-content: flex-start;
    padding-right: 0;
    padding-left: 0.75rem;
}

/* ===== أقسام الرسوم البيانية ===== */
.strengths-weaknesses {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.strengths, .weaknesses {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .strengths,
.dark-mode .weaknesses {
    background: #0f172a;
    border-color: #334155;
}

.strengths:hover, .weaknesses:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark-mode .strengths:hover,
.dark-mode .weaknesses:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.strengths h4, .weaknesses h4 {
    margin: 0 0 1rem 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .strengths h4,
.dark-mode .weaknesses h4 {
    color: #f1f5f9;
}

/* ===== بطاقة التوصيات ===== */
.recommendations-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-card {
    background: #0f172a;
    border-color: #334155;
}

.recommendations-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .recommendations-card h3 {
    color: #f1f5f9;
}

.recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.recommendation {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    transition: all 0.2s;
    border-left: 3px solid;
}

.dark-mode .recommendation {
    background: #1e293b;
}

.recommendation:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .recommendation:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[dir="rtl"] .recommendation {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .recommendation:hover {
    transform: translateX(-4px);
}

.recommendation.timing-now {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.03);
}

.recommendation.timing-today {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.03);
}

.recommendation.timing-tomorrow {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.03);
}

.recommendation.priority-high {
    border-left-color: #ef4444;
}

[dir="rtl"] .recommendation.timing-now {
    border-right-color: #ef4444;
}

[dir="rtl"] .recommendation.timing-today {
    border-right-color: #f59e0b;
}

[dir="rtl"] .recommendation.timing-tomorrow {
    border-right-color: #3b82f6;
}

.rec-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
}

.rec-icon {
    font-size: 1.2rem;
}

.rec-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .rec-title {
    color: #f1f5f9;
}

.rec-timing {
    font-size: 0.6rem;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-weight: 600;
}

.rec-timing.timing-now {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.rec-timing.timing-today {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.rec-timing.timing-tomorrow {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.rec-advice {
    font-size: 0.8rem;
    margin: 0.5rem 0;
    color: var(--text-primary, #0f172a);
    font-weight: 500;
}

.rec-action {
    font-size: 0.75rem;
    margin: 0.25rem 0;
    color: var(--text-secondary, #64748b);
}

.rec-details {
    margin: 0.5rem 0 0 0;
    padding-left: 1rem;
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
}

[dir="rtl"] .rec-details {
    padding-left: 0;
    padding-right: 1rem;
}

.rec-details li {
    margin-bottom: 0.2rem;
}

/* ===== التذييل ===== */
.analytics-footer {
    text-align: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-footer {
    border-top-color: #334155;
}

.analytics-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== حالات التحميل والخطأ ===== */
.analytics-loading,
.analytics-error {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
}

.dark-mode .analytics-loading,
.dark-mode .analytics-error {
    background: #1e293b;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #ef4444;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.25rem;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* ===== دعم RTL ===== */
[dir="rtl"] .rec-details {
    padding-right: 1rem;
}

[dir="rtl"] .progress-text {
    padding-left: 0.75rem;
    padding-right: 0;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .analytics-stat-card:hover,
    .recommendation:hover,
    .strengths:hover,
    .weaknesses:hover {
        transform: none;
    }
    
    .spinner {
        animation: none;
    }
    
    .progress-bar-fill {
        transition: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .analytics-stat-card,
    .correlations-card,
    .recommendations-card,
    .strengths,
    .weaknesses {
        border-width: 2px;
    }
    
    .recommendation {
        border-left-width: 4px;
    }
    
    [dir="rtl"] .recommendation {
        border-right-width: 4px;
    }
}
            `}</style>

        </div>
    );
};

export default NutritionAnalytics;