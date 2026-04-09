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
    const isArabic = i18n.language.startsWith('ar');

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
            setError('حدث خطأ في تحميل البيانات');
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
        
        if (avgCalories < 1500) {
            recommendations.push({
                icon: '🔥',
                title: 'سعرات حرارية منخفضة',
                advice: `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، حاول زيادة ${Math.round(2000 - avgCalories)} سعرة يومياً`,
                action: 'أضف وجبة خفيفة صحية بين الوجبات الرئيسية'
            });
        } else if (avgCalories > 2500) {
            recommendations.push({
                icon: '⚖️',
                title: 'سعرات حرارية مرتفعة',
                advice: `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، حاول تقليل ${Math.round(avgCalories - 2200)} سعرة يومياً`,
                action: 'قلل من الوجبات السريعة والحلويات'
            });
        } else {
            recommendations.push({
                icon: '✅',
                title: 'سعرات متوازنة',
                advice: `تتناول ${Math.round(avgCalories)} سعرة في المتوسط، استمر بهذا المعدل الممتاز`,
                action: 'حافظ على تنوع وجباتك'
            });
        }

        if (avgProtein < 50) {
            recommendations.push({
                icon: '💪',
                title: 'البروتين منخفض',
                advice: `تتناول ${avgProtein.toFixed(1)}g بروتين في المتوسط، حاول زيادة ${Math.round(50 - avgProtein)}g`,
                action: 'أضف الدجاج، البيض، البقوليات أو الزبادي اليوناني'
            });
        } else if (avgProtein > 80) {
            recommendations.push({
                icon: '💪',
                title: 'بروتين ممتاز',
                advice: `تتناول ${avgProtein.toFixed(1)}g بروتين في المتوسط، استمر بهذا المستوى`,
                action: 'وازن بين البروتين والكربوهيدرات والدهون'
            });
        }

        // أوقات الوجبات
        const mealTimes = meals.map(m => m.meal_time ? new Date(m.meal_time).getHours() : 0);
        const lateMeals = mealTimes.filter(h => h >= 22 || h <= 4).length;
        
        if (lateMeals > totalMeals * 0.3) {
            recommendations.push({
                icon: '🌙',
                title: 'وجبات متأخرة',
                advice: `${lateMeals} وجبة بعد الساعة 10 مساءً تؤثر على جودة النوم`,
                action: 'حاول إنهاء آخر وجبة قبل الساعة 8 مساءً'
            });
        }

        const breakfastCount = meals.filter(m => m.meal_type === 'Breakfast').length;
        if (breakfastCount === 0 && totalMeals > 0) {
            recommendations.push({
                icon: '🌅',
                title: 'تناول الفطور',
                advice: 'لم تسجل أي وجبة فطور، الفطور يمنحك الطاقة لبدء يومك',
                action: 'جرب تناول فطور خفيف مثل زبادي مع فواكه أو بيض مع خبز'
            });
        }

        // ==================== التنبؤات ====================
        const predictions = [];
        
        if (avgCalories > 2200) {
            const weeklyGain = ((avgCalories - 2000) * 7) / 7700;
            if (weeklyGain > 0.2) {
                predictions.push({
                    icon: '📈',
                    title: 'توقع زيادة الوزن',
                    text: `قد تزيد ${weeklyGain.toFixed(1)} كجم أسبوعياً إذا استمر هذا النمط`,
                    probability: 'عالية',
                    color: '#f59e0b'
                });
            }
        } else if (avgCalories < 1800 && avgCalories > 0) {
            const weeklyLoss = ((2000 - avgCalories) * 7) / 7700;
            if (weeklyLoss > 0.2) {
                predictions.push({
                    icon: '📉',
                    title: 'توقع خسارة الوزن',
                    text: `قد تخسر ${weeklyLoss.toFixed(1)} كجم أسبوعياً مع هذا العجز الحراري`,
                    probability: 'متوسطة',
                    color: '#10b981'
                });
            }
        }

        if (avgProtein < 45 && avgCalories < 1800) {
            predictions.push({
                icon: '😴',
                title: 'نقص الطاقة محتمل',
                text: 'قلة البروتين والسعرات قد تسبب الشعور بالتعب والإرهاق',
                probability: 'عالية',
                color: '#ef4444'
            });
        }

        // ==================== رسوم بيانية ====================
        const chartData = {
            labels: weekly.map(w => w.day),
            datasets: [{
                label: 'السعرات الحرارية',
                data: weekly.map(w => w.calories),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#ef4444',
            }]
        };

        const distributionData = {
            labels: Object.keys(distribution).map(k => t(`nutrition.${k.toLowerCase()}`, k)),
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
                legend: { position: 'top', labels: { color: darkMode ? '#f8fafc' : '#2c3e50' } },
                tooltip: { rtl: isArabic }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
                x: { grid: { display: false } }
            }
        };

        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: darkMode ? '#f8fafc' : '#2c3e50' } },
                tooltip: { rtl: isArabic }
            }
        };

        // ==================== درجة التغذية ====================
        let nutritionScore = 0;
        if (avgCalories >= 1800 && avgCalories <= 2500) nutritionScore += 35;
        else if (avgCalories >= 1500) nutritionScore += 20;
        else nutritionScore += 10;
        
        if (avgProtein >= 60) nutritionScore += 35;
        else if (avgProtein >= 40) nutritionScore += 25;
        else if (avgProtein >= 20) nutritionScore += 15;
        else nutritionScore += 5;
        
        if (Object.keys(distribution).length >= 3) nutritionScore += 30;
        else if (Object.keys(distribution).length >= 2) nutritionScore += 20;
        else nutritionScore += 10;
        
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
            <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('analytics.nutrition.loading')}</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>📝 {error || 'لا توجد بيانات كافية للتحليل'}</p>
                <button onClick={fetchData} className="retry-btn">🔄 تحديث</button>
            </div>
        );
    }

    const getScoreStatus = (score) => {
        if (score >= 80) return { text: 'ممتاز', color: '#10b981' };
        if (score >= 60) return { text: 'جيد', color: '#3b82f6' };
        if (score >= 40) return { text: 'متوسط', color: '#f59e0b' };
        return { text: 'يحتاج تحسين', color: '#ef4444' };
    };

    const scoreStatus = getScoreStatus(data.summary.nutritionScore);

    return (
        <div className={`analytics-container nutrition-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>🍽️ تحليل التغذية</h2>
                <button onClick={fetchData} className="refresh-btn" title="تحديث">🔄</button>
            </div>

            {/* بطاقة الملخص السريع */}
            <div className="quick-summary">
                <div className="summary-item">
                    <span className="summary-icon">🍽️</span>
                    <span className="summary-value">{data.summary.totalMeals}</span>
                    <span className="summary-label">وجبة</span>
                </div>
                <div className="summary-item">
                    <span className="summary-icon">🔥</span>
                    <span className="summary-value">{data.summary.avgCalories}</span>
                    <span className="summary-label">سعرة/متوسط</span>
                </div>
                <div className="summary-item">
                    <span className="summary-icon">💪</span>
                    <span className="summary-value">{data.summary.avgProtein}g</span>
                    <span className="summary-label">بروتين</span>
                </div>
                <div className="summary-item">
                    <span className="summary-icon">⭐</span>
                    <span className="summary-value">{data.summary.nutritionScore}%</span>
                    <span className="summary-label">درجة التغذية</span>
                </div>
            </div>

            {/* درجة التغذية */}
            <div className="nutrition-score-card">
                <div className="score-circle" style={{ background: `conic-gradient(${scoreStatus.color} 0% ${data.summary.nutritionScore}%, #e5e7eb ${data.summary.nutritionScore}% 100%)` }}>
                    <span>{data.summary.nutritionScore}</span>
                </div>
                <div className="score-info">
                    <h3>درجة التغذية</h3>
                    <p style={{ color: scoreStatus.color }}>{scoreStatus.text}</p>
                </div>
            </div>

            {/* الرسوم البيانية */}
            <div className="charts-section">
                <div className="chart-card">
                    <h4>📈 اتجاه السعرات الأسبوعي</h4>
                    <div className="chart-container" style={{ height: '220px' }}>
                        <Line data={data.chartData} options={data.chartOptions} />
                    </div>
                </div>
                <div className="chart-card">
                    <h4>🥗 توزيع الوجبات</h4>
                    <div className="chart-container" style={{ height: '200px' }}>
                        <Pie data={data.distributionData} options={data.pieOptions} />
                    </div>
                </div>
            </div>

            {/* التوصيات والتنبؤات معاً */}
            <div className="insights-combined">
                <div className="recommendations-section">
                    <h3>💡 توصيات ذكية</h3>
                    <div className="recommendations-list">
                        {data.recommendations.map((rec, idx) => (
                            <div key={idx} className="rec-card">
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-title">{rec.title}</span>
                                </div>
                                <p className="rec-advice">{rec.advice}</p>
                                <div className="rec-action">
                                    <span>🎯</span>
                                    <span>{rec.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="predictions-section">
                    <h3>🔮 تنبؤات</h3>
                    <div className="predictions-list">
                        {data.predictions.length > 0 ? data.predictions.map((pred, idx) => (
                            <div key={idx} className="pred-card" style={{ borderLeftColor: pred.color }}>
                                <div className="pred-header">
                                    <span className="pred-icon">{pred.icon}</span>
                                    <span className="pred-title">{pred.title}</span>
                                    <span className="pred-prob" style={{ color: pred.color }}>{pred.probability}</span>
                                </div>
                                <p className="pred-text">{pred.text}</p>
                            </div>
                        )) : (
                            <div className="no-predictions">
                                <span>📊</span>
                                <p>سجل المزيد من الوجبات للحصول على تنبؤات دقيقة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="analytics-footer">
                <small>آخر تحديث: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
            </div>

            <style jsx>{`
                .quick-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .summary-item {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 12px;
                    text-align: center;
                }
                .summary-icon {
                    font-size: 1.5rem;
                    display: block;
                    margin-bottom: 4px;
                }
                .summary-value {
                    font-size: 1.3rem;
                    font-weight: bold;
                    display: block;
                    color: var(--text-primary);
                }
                .summary-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                .nutrition-score-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 16px;
                    margin-bottom: 20px;
                }
                .score-circle {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--text-primary);
                }
                .charts-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .chart-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 12px;
                }
                .chart-card h4 {
                    margin: 0 0 10px 0;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .chart-container {
                    width: 100%;
                }
                .insights-combined {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .recommendations-section, .predictions-section {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 16px;
                }
                .recommendations-section h3, .predictions-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 1rem;
                }
                .rec-card, .pred-card {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 10px;
                }
                .rec-header, .pred-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .rec-icon, .pred-icon {
                    font-size: 1.2rem;
                }
                .rec-title, .pred-title {
                    font-weight: 600;
                    flex: 1;
                }
                .rec-advice {
                    font-size: 0.85rem;
                    margin: 0 0 8px 0;
                    color: var(--text-secondary);
                }
                .rec-action, .pred-text {
                    font-size: 0.8rem;
                    color: var(--primary-color);
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }
                .pred-card {
                    border-left: 3px solid;
                }
                .pred-prob {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 12px;
                    background: rgba(0,0,0,0.05);
                }
                .no-predictions {
                    text-align: center;
                    padding: 20px;
                    color: var(--text-tertiary);
                }
                .analytics-footer {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                @media (max-width: 768px) {
                    .quick-summary { grid-template-columns: repeat(2, 1fr); }
                    .charts-section { grid-template-columns: 1fr; }
                    .insights-combined { grid-template-columns: 1fr; }
                }
                .dark-mode .rec-card, .dark-mode .pred-card {
                    background: #1e293b;
                }
            `}</style>
        </div>
    );
};

export default NutritionAnalytics;