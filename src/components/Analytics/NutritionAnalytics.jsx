// src/components/Analytics/NutritionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import './Analytics.css';

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
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isArabic = i18n.language?.startsWith('ar');

    // متابعة الثيم من ThemeManager
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
        fetchData();
    }, [refreshTrigger]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const mealsRes = await axiosInstance.get('/meals/');
            const meals = Array.isArray(mealsRes.data) ? mealsRes.data : [];
            
            const analysis = analyzeMeals(meals);
            setData(analysis);
        } catch (err) {
            console.error('Error fetching nutrition data:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const analyzeMeals = (meals) => {
        if (!meals.length) return null;

        // إحصائيات أساسية
        const totalMeals = meals.length;
        const totalCalories = meals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.total_protein || 0), 0);
        const totalCarbs = meals.reduce((sum, m) => sum + (m.total_carbs || 0), 0);
        const totalFat = meals.reduce((sum, m) => sum + (m.total_fat || 0), 0);
        
        const avgCalories = totalCalories / totalMeals;
        const avgProtein = totalProtein / totalMeals;
        const avgCarbs = totalCarbs / totalMeals;
        const avgFat = totalFat / totalMeals;

        // توزيع الوجبات
        const distribution = {};
        meals.forEach(m => {
            const type = m.meal_type || 'Other';
            distribution[type] = (distribution[type] || 0) + 1;
        });

        // بيانات الأسبوع
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
            });
        }

        // ==================== التوصيات الذكية ====================
        const recommendations = [];
        
        if (avgCalories < 1500 && avgCalories > 0) {
            recommendations.push({
                icon: '🔥',
                title: isArabic ? 'سعرات حرارية منخفضة' : 'Low Calories',
                advice: isArabic 
                    ? `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، حاول زيادة ${Math.round(2000 - avgCalories)} سعرة يومياً`
                    : `You average ${Math.round(avgCalories)} calories, try to increase by ${Math.round(2000 - avgCalories)} daily`,
                action: isArabic ? 'أضف وجبة خفيفة صحية بين الوجبات الرئيسية' : 'Add a healthy snack between main meals'
            });
        } else if (avgCalories > 2500) {
            recommendations.push({
                icon: '⚖️',
                title: isArabic ? 'سعرات حرارية مرتفعة' : 'High Calories',
                advice: isArabic 
                    ? `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، حاول تقليل ${Math.round(avgCalories - 2200)} سعرة يومياً`
                    : `You average ${Math.round(avgCalories)} calories, try to reduce by ${Math.round(avgCalories - 2200)} daily`,
                action: isArabic ? 'قلل من الوجبات السريعة والحلويات' : 'Reduce fast food and sweets'
            });
        } else if (avgCalories > 0) {
            recommendations.push({
                icon: '✅',
                title: isArabic ? 'سعرات متوازنة' : 'Balanced Calories',
                advice: isArabic 
                    ? `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، استمر بهذا المعدل الممتاز`
                    : `You average ${Math.round(avgCalories)} calories, keep up this excellent rate`,
                action: isArabic ? 'حافظ على تنوع وجباتك' : 'Keep your meals varied'
            });
        }

        if (avgProtein < 50 && avgProtein > 0) {
            recommendations.push({
                icon: '💪',
                title: isArabic ? 'البروتين منخفض' : 'Low Protein',
                advice: isArabic 
                    ? `تتناول ${avgProtein.toFixed(1)}g بروتين في المتوسط، حاول زيادة ${Math.round(50 - avgProtein)}g`
                    : `You average ${avgProtein.toFixed(1)}g protein, try to increase by ${Math.round(50 - avgProtein)}g`,
                action: isArabic ? 'أضف الدجاج، البيض، البقوليات أو الزبادي اليوناني' : 'Add chicken, eggs, legumes, or Greek yogurt'
            });
        } else if (avgProtein > 80) {
            recommendations.push({
                icon: '💪',
                title: isArabic ? 'بروتين ممتاز' : 'Excellent Protein',
                advice: isArabic 
                    ? `تتناول ${avgProtein.toFixed(1)}g بروتين في المتوسط، استمر بهذا المستوى`
                    : `You average ${avgProtein.toFixed(1)}g protein, keep up this level`,
                action: isArabic ? 'وازن بين البروتين والكربوهيدرات والدهون' : 'Balance protein with carbs and fats'
            });
        }

        // أوقات الوجبات
        const mealTimes = meals.map(m => m.meal_time ? new Date(m.meal_time).getHours() : 0);
        const lateMeals = mealTimes.filter(h => h >= 22 || h <= 4).length;
        
        if (lateMeals > totalMeals * 0.3 && totalMeals > 0) {
            recommendations.push({
                icon: '🌙',
                title: isArabic ? 'وجبات متأخرة' : 'Late Meals',
                advice: isArabic 
                    ? `${lateMeals} وجبة بعد الساعة 10 مساءً تؤثر على جودة النوم`
                    : `${lateMeals} meals after 10 PM affect sleep quality`,
                action: isArabic ? 'حاول إنهاء آخر وجبة قبل الساعة 8 مساءً' : 'Try to finish your last meal before 8 PM'
            });
        }

        const breakfastCount = meals.filter(m => m.meal_type === 'Breakfast').length;
        if (breakfastCount === 0 && totalMeals > 0) {
            recommendations.push({
                icon: '🌅',
                title: isArabic ? 'تناول الفطور' : 'Eat Breakfast',
                advice: isArabic ? 'لم تسجل أي وجبة فطور، الفطور يمنحك الطاقة لبدء يومك' : 'No breakfast recorded, breakfast gives you energy to start your day',
                action: isArabic ? 'جرب تناول فطور خفيف مثل زبادي مع فواكه أو بيض مع خبز' : 'Try a light breakfast like yogurt with fruit or eggs with bread'
            });
        }

        // ==================== التنبؤات ====================
        const predictions = [];
        
        if (avgCalories > 2200 && avgCalories > 0) {
            const weeklyGain = ((avgCalories - 2000) * 7) / 7700;
            if (weeklyGain > 0.2) {
                predictions.push({
                    icon: '📈',
                    title: isArabic ? 'توقع زيادة الوزن' : 'Weight Gain Expected',
                    text: isArabic 
                        ? `قد تزيد ${weeklyGain.toFixed(1)} كجم أسبوعياً إذا استمر هذا النمط`
                        : `You may gain ${weeklyGain.toFixed(1)} kg weekly if this pattern continues`,
                    probability: isArabic ? 'عالية' : 'High',
                    severity: 'high'
                });
            }
        } else if (avgCalories < 1800 && avgCalories > 0) {
            const weeklyLoss = ((2000 - avgCalories) * 7) / 7700;
            if (weeklyLoss > 0.2) {
                predictions.push({
                    icon: '📉',
                    title: isArabic ? 'توقع خسارة الوزن' : 'Weight Loss Expected',
                    text: isArabic 
                        ? `قد تخسر ${weeklyLoss.toFixed(1)} كجم أسبوعياً مع هذا العجز الحراري`
                        : `You may lose ${weeklyLoss.toFixed(1)} kg weekly with this calorie deficit`,
                    probability: isArabic ? 'متوسطة' : 'Medium',
                    severity: 'medium'
                });
            }
        }

        if (avgProtein < 45 && avgCalories < 1800 && avgCalories > 0) {
            predictions.push({
                icon: '😴',
                title: isArabic ? 'نقص الطاقة محتمل' : 'Energy Deficiency Possible',
                text: isArabic ? 'قلة البروتين والسعرات قد تسبب الشعور بالتعب والإرهاق' : 'Low protein and calories may cause fatigue',
                probability: isArabic ? 'عالية' : 'High',
                severity: 'high'
            });
        }

        // ==================== رسوم بيانية ====================
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
                tooltip: { 
                    rtl: isArabic,
                    bodyColor: darkMode ? '#f8fafc' : '#0f172a',
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                }
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

        // ==================== درجة التغذية ====================
        let nutritionScore = 0;
        if (avgCalories >= 1800 && avgCalories <= 2500) nutritionScore += 35;
        else if (avgCalories >= 1500 && avgCalories > 0) nutritionScore += 20;
        else if (avgCalories > 0) nutritionScore += 10;
        
        if (avgProtein >= 60) nutritionScore += 35;
        else if (avgProtein >= 40) nutritionScore += 25;
        else if (avgProtein >= 20) nutritionScore += 15;
        else if (avgProtein > 0) nutritionScore += 5;
        
        if (Object.keys(distribution).length >= 3) nutritionScore += 30;
        else if (Object.keys(distribution).length >= 2) nutritionScore += 20;
        else if (Object.keys(distribution).length >= 1) nutritionScore += 10;
        
        nutritionScore = Math.min(100, Math.max(0, nutritionScore));

        return {
            summary: {
                totalMeals,
                totalCalories: Math.round(totalCalories),
                avgCalories: Math.round(avgCalories),
                avgProtein: avgProtein.toFixed(1),
                avgCarbs: avgCarbs.toFixed(1),
                avgFat: avgFat.toFixed(1),
                nutritionScore,
                distribution,
            },
            recommendations,
            predictions,
            chartData,
            distributionData,
            chartOptions,
            pieOptions,
        };
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('analytics.nutrition.loading') || (isArabic ? 'جاري التحميل...' : 'Loading...')}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <p>📝 {error || (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                    <button onClick={fetchData} className="retry-btn">🔄 {isArabic ? 'تحديث' : 'Refresh'}</button>
                </div>
            </div>
        );
    }

    const getScoreStatus = (score) => {
        if (score >= 80) return { text: isArabic ? 'ممتاز' : 'Excellent', color: '#10b981' };
        if (score >= 60) return { text: isArabic ? 'جيد' : 'Good', color: '#3b82f6' };
        if (score >= 40) return { text: isArabic ? 'متوسط' : 'Average', color: '#f59e0b' };
        return { text: isArabic ? 'يحتاج تحسين' : 'Needs Improvement', color: '#ef4444' };
    };

    const scoreStatus = getScoreStatus(data.summary.nutritionScore);

    return (
        <div className="analytics-container">
            {/* رأس التحليلات */}
            <div className="analytics-header">
                <h2>
                    <span>🍽️</span>
                    {isArabic ? 'تحليل التغذية' : 'Nutrition Analytics'}
                </h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>🔄</button>
            </div>

            {/* بطاقات الإحصائيات السريعة */}
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
                        <div className="stat-value">{data.summary.avgCalories}</div>
                        <div className="stat-label">{isArabic ? 'متوسط السعرات' : 'Avg Calories'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">💪</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.summary.avgProtein}g</div>
                        <div className="stat-label">{isArabic ? 'متوسط البروتين' : 'Avg Protein'}</div>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-content">
                        <div className="stat-value">{data.summary.nutritionScore}%</div>
                        <div className="stat-label">{isArabic ? 'درجة التغذية' : 'Nutrition Score'}</div>
                    </div>
                </div>
            </div>

            {/* درجة التغذية - باستخدام insight-card */}
            <div className="insight-card">
                <div className="insight-icon">⭐</div>
                <div className="insight-content">
                    <h3>{isArabic ? 'درجة التغذية' : 'Nutrition Score'}</h3>
                    <div className="stat-value" style={{ fontSize: '2rem', color: scoreStatus.color }}>
                        {data.summary.nutritionScore}%
                    </div>
                    <p className="stat-trend" style={{ color: scoreStatus.color }}>
                        {scoreStatus.text}
                    </p>
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
                    <h4>🥗 {isArabic ? 'توزيع الوجبات' : 'Meal Distribution'}</h4>
                    <div style={{ height: '200px' }}>
                        <Pie data={data.distributionData} options={data.pieOptions} />
                    </div>
                </div>
            </div>

            {/* التوصيات والتنبؤات */}
            <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* التوصيات */}
                <div className="recommendations-section" style={{ margin: 0 }}>
                    <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                    <div className="recommendations-list">
                        {data.recommendations.map((rec, idx) => (
                            <div key={idx} className="recommendation-card">
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-category">{rec.title}</span>
                                </div>
                                <p className="rec-message">{rec.advice}</p>
                                <div className="rec-advice">
                                    🎯 {rec.action}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* التنبؤات */}
                <div className="recommendations-section" style={{ margin: 0 }}>
                    <h3>🔮 {isArabic ? 'تنبؤات' : 'Predictions'}</h3>
                    <div className="recommendations-list">
                        {data.predictions.length > 0 ? data.predictions.map((pred, idx) => (
                            <div key={idx} className={`recommendation-card priority-${pred.severity === 'high' ? 'high' : 'medium'}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{pred.icon}</span>
                                    <span className="rec-category">{pred.title}</span>
                                    <span className="rec-type" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                                        {pred.probability}
                                    </span>
                                </div>
                                <p className="rec-message">{pred.text}</p>
                            </div>
                        )) : (
                            <div className="analytics-empty" style={{ padding: '2rem' }}>
                                <div className="empty-icon">📊</div>
                                <p>{isArabic ? 'سجل المزيد من الوجبات للحصول على تنبؤات دقيقة' : 'Log more meals for accurate predictions'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* تذييل */}
            <div className="analytics-footer">
                <small>
                    {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                </small>
            </div>
        </div>
    );
};

export default NutritionAnalytics;