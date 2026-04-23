// src/components/Analytics/NutritionAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const isMountedRef = useRef(true);
    const isArabic = i18n.language?.startsWith('ar');

    // أهداف المستخدم (مثال - يمكن جلبها من API)
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
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [refreshTrigger]);

    // تحليل جودة الطعام بناءً على المكونات
    const analyzeFoodQuality = (meals) => {
        let highQualityCount = 0;
        let processedFoodCount = 0;
        let vegetableCount = 0;
        let proteinSources = new Set();
        
        meals.forEach(meal => {
            const ingredients = meal.ingredients || [];
            
            // تحليل جودة المكونات
            ingredients.forEach(ing => {
                const name = (ing.name || '').toLowerCase();
                if (['دجاج', 'سمك', 'لحم', 'بيض', 'تونة', 'جبن'].some(p => name.includes(p))) {
                    proteinSources.add(name);
                    highQualityCount++;
                }
                if (['خضار', 'خس', 'طماطم', 'خيار', 'بروكلي', 'سبانخ'].some(v => name.includes(v))) {
                    vegetableCount++;
                    highQualityCount++;
                }
                if (['pizza', 'burger', 'fries', 'chips', 'candy', 'soda'].some(p => name.includes(p))) {
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
        const hasHeavyDinner = mealTypes.filter(t => t === 'Dinner').length > 0;
        
        let pattern = '';
        if (lateMeals > meals.length * 0.3) pattern = 'night_eater';
        else if (morningMeals === 0 && meals.length > 0) pattern = 'skip_breakfast';
        else if (mealTypes.filter(t => t === 'Snack').length > meals.length * 0.5) pattern = 'frequent_snacking';
        else pattern = 'regular';
        
        return {
            pattern,
            lateMealsCount: lateMeals,
            skipBreakfast: morningMeals === 0 && meals.length > 0,
            hasHeavyDinner,
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
        else if (proteinPercent > 30) issues.push('protein_high');
        
        if (carbsPercent > 60) issues.push('carbs_high');
        else if (carbsPercent < 40) issues.push('carbs_low');
        
        if (fatPercent > 35) issues.push('fat_high');
        else if (fatPercent < 20) issues.push('fat_low');
        
        return {
            proteinPercent: proteinPercent.toFixed(1),
            carbsPercent: carbsPercent.toFixed(1),
            fatPercent: fatPercent.toFixed(1),
            issues
        };
    };

    const analyzeMeals = (meals) => {
        if (!meals || meals.length === 0) return null;

        // إحصائيات أساسية
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
        
        // ✅ حساب التقدم بشكل صحيح
        const calorieProgress = Math.min(100, Math.round((totalCalories / USER_GOALS.dailyCalories) * 100));
        const proteinProgress = Math.min(100, Math.round((totalProtein / USER_GOALS.dailyProtein) * 100));
        const carbsProgress = Math.min(100, Math.round((totalCarbs / USER_GOALS.dailyCarbs) * 100));
        const fatProgress = Math.min(100, Math.round((totalFat / USER_GOALS.dailyFat) * 100));
        
        // تحليل الفرق عن الهدف
        const calorieDiff = totalCalories - USER_GOALS.dailyCalories;
        const proteinDiff = totalProtein - USER_GOALS.dailyProtein;
        const proteinNeeded = Math.max(0, USER_GOALS.dailyProtein - totalProtein);
        
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
                protein: dayMeals.reduce((s, m) => s + (m.total_protein || 0), 0),
            });
        }
        
        // ✅ تحليلات متقدمة
        const foodQuality = analyzeFoodQuality(meals);
        const eatingPattern = analyzeEatingPattern(meals);
        const macroBalance = analyzeMacroBalance(avgProtein, avgCarbs, avgFat);
        
        // ✅ درجة التغذية المحسنة
        let nutritionScore = 0;
        
        // السعرات (30 نقطة)
        if (totalCalories >= USER_GOALS.dailyCalories * 0.9 && totalCalories <= USER_GOALS.dailyCalories * 1.1) nutritionScore += 30;
        else if (totalCalories >= USER_GOALS.dailyCalories * 0.7 && totalCalories <= USER_GOALS.dailyCalories * 1.3) nutritionScore += 20;
        else if (totalCalories > 0) nutritionScore += 10;
        
        // البروتين (30 نقطة)
        if (totalProtein >= USER_GOALS.dailyProtein) nutritionScore += 30;
        else if (totalProtein >= USER_GOALS.dailyProtein * 0.7) nutritionScore += 20;
        else if (totalProtein >= USER_GOALS.dailyProtein * 0.5) nutritionScore += 10;
        else if (totalProtein > 0) nutritionScore += 5;
        
        // التنوع (20 نقطة)
        const mealTypesCount = Object.keys(distribution).length;
        if (mealTypesCount >= 3) nutritionScore += 20;
        else if (mealTypesCount >= 2) nutritionScore += 12;
        else if (mealTypesCount >= 1) nutritionScore += 5;
        
        // جودة الطعام (20 نقطة)
        if (foodQuality.hasVegetables) nutritionScore += 10;
        if (foodQuality.hasQualityProtein) nutritionScore += 10;
        if (foodQuality.processedFoodRisk) nutritionScore -= 15;
        
        nutritionScore = Math.min(100, Math.max(0, nutritionScore));
        
        // ✅ توصيات ذكية متقدمة
        const recommendations = [];
        
        // 1. توصية مبنية على السعرات
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
        
        // 2. توصية مبنية على البروتين
        if (proteinDiff < -20 && totalProtein > 0) {
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
        } else if (proteinProgress >= 90) {
            recommendations.push({
                icon: '✅',
                timing: 'general',
                priority: 'low',
                title: isArabic ? 'بروتين ممتاز' : 'Excellent Protein',
                advice: isArabic 
                    ? `حققت ${Math.round(proteinProgress)}% من هدف البروتين`
                    : `You achieved ${Math.round(proteinProgress)}% of protein goal`,
                action: isArabic 
                    ? 'وازن بين البروتين والكربوهيدرات والدهون'
                    : 'Balance protein with carbs and fats',
                details: []
            });
        }
        
        // 3. توصية مبنية على نمط الأكل
        if (eatingPattern.skipBreakfast && totalMeals > 0) {
            recommendations.push({
                icon: '🌅',
                timing: 'tomorrow',
                priority: 'medium',
                title: isArabic ? 'تناول الفطور' : 'Eat Breakfast',
                advice: isArabic 
                    ? 'الفطور يمنحك الطاقة لبدء يومك بنشاط'
                    : 'Breakfast gives you energy to start your day',
                action: isArabic 
                    ? 'جرب: زبادي يوناني مع عسل وجوز، أو بيض مع خبز أسمر'
                    : 'Try: Greek yogurt with honey and walnuts, or eggs with whole wheat bread',
                details: [isArabic ? 'البروتين في الفطور يقلل الجوع خلال اليوم' : 'Protein at breakfast reduces hunger throughout the day']
            });
        }
        
        if (eatingPattern.pattern === 'night_eater') {
            recommendations.push({
                icon: '🌙',
                timing: 'evening',
                priority: 'medium',
                title: isArabic ? 'وجبات متأخرة' : 'Late Meals',
                advice: isArabic 
                    ? `${eatingPattern.lateMealsCount} وجبة بعد الساعة 10 مساءً`
                    : `${eatingPattern.lateMealsCount} meals after 10 PM`,
                action: isArabic 
                    ? 'أنهِ آخر وجبة قبل الساعة 8 مساءً لتحسين جودة النوم'
                    : 'Finish your last meal before 8 PM for better sleep quality',
                details: [isArabic ? 'الأكل المتأخر يؤثر على حرق الدهون وجودة النوم' : 'Late eating affects fat burning and sleep quality']
            });
        }
        
        // 4. توصية مبنية على جودة الطعام
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
        
        if (foodQuality.processedFoodRisk) {
            recommendations.push({
                icon: '⚠️',
                timing: 'general',
                priority: 'high',
                title: isArabic ? 'أطعمة مصنعة' : 'Processed Foods',
                advice: isArabic 
                    ? 'نسبة عالية من الأطعمة المصنعة في وجباتك'
                    : 'High proportion of processed foods in your meals',
                action: isArabic 
                    ? 'استبدل الوجبات السريعة بأطعمة طبيعية: فواكه، خضروات، بروتينات كاملة'
                    : 'Replace fast food with natural foods: fruits, vegetables, whole proteins',
                details: [isArabic ? 'الأطعمة المصنعة تزيد الالتهابات والشعور بالتعب' : 'Processed foods increase inflammation and fatigue']
            });
        }
        
        // 5. توصية مبنية على تحليل الماكروز
        if (macroBalance && macroBalance.issues.includes('carbs_high')) {
            recommendations.push({
                icon: '🌾',
                timing: 'next_meal',
                priority: 'medium',
                title: isArabic ? 'كربوهيدرات مرتفعة' : 'High Carbs',
                advice: isArabic 
                    ? `${macroBalance.carbsPercent}% من إجمالي سعراتك من الكربوهيدرات`
                    : `${macroBalance.carbsPercent}% of your calories from carbs`,
                action: isArabic 
                    ? 'قلل الأرز والخبز إلى النصف، واستبدلها بخضروات'
                    : 'Reduce rice and bread by half, replace with vegetables',
                details: [isArabic ? 'الكربوهيدرات الزائدة تتحول إلى دهون' : 'Excess carbs turn into fat']
            });
        }
        
        if (macroBalance && macroBalance.issues.includes('protein_low')) {
            recommendations.push({
                icon: '🥩',
                timing: 'today',
                priority: 'high',
                title: isArabic ? 'بروتين منخفض' : 'Low Protein Ratio',
                advice: isArabic 
                    ? `البروتين يشكل ${macroBalance.proteinPercent}% فقط من سعراتك`
                    : `Protein makes only ${macroBalance.proteinPercent}% of your calories`,
                action: isArabic 
                    ? `أضف ${Math.round(proteinNeeded)}g بروتين في وجبتك القادمة`
                    : `Add ${Math.round(proteinNeeded)}g protein to your next meal`,
                details: [isArabic ? 'البروتين ضروري لبناء العضلات والشبع' : 'Protein is essential for muscle building and satiety']
            });
        }
        
        // تقييم الحالة
        let healthStatus = 'good';
        if (nutritionScore < 40) healthStatus = 'critical';
        else if (nutritionScore < 60) healthStatus = 'poor';
        else if (nutritionScore < 75) healthStatus = 'fair';
        else if (nutritionScore < 90) healthStatus = 'good';
        else healthStatus = 'excellent';
        
        const statusText = {
            critical: isArabic ? 'حرجة' : 'Critical',
            poor: isArabic ? 'سيئة' : 'Poor',
            fair: isArabic ? 'متوسطة' : 'Fair',
            good: isArabic ? 'جيدة' : 'Good',
            excellent: isArabic ? 'ممتازة' : 'Excellent'
        };
        
        const statusColor = {
            critical: '#dc2626',
            poor: '#ef4444',
            fair: '#f59e0b',
            good: '#3b82f6',
            excellent: '#10b981'
        };
        
        // الرسوم البيانية
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

        return {
            summary: {
                totalMeals,
                totalCalories: Math.round(totalCalories),
                totalProtein: totalProtein.toFixed(1),
                totalCarbs: totalCarbs.toFixed(1),
                totalFat: totalFat.toFixed(1),
                avgCalories: Math.round(avgCalories),
                avgProtein: avgProtein.toFixed(1),
                avgCarbs: avgCarbs.toFixed(1),
                avgFat: avgFat.toFixed(1),
                calorieProgress,
                proteinProgress,
                carbsProgress,
                fatProgress,
                calorieDiff: calorieDiff > 0 ? `+${calorieDiff}` : calorieDiff,
                proteinNeeded: Math.round(proteinNeeded),
                nutritionScore,
                healthStatus,
                healthStatusText: statusText[healthStatus],
                healthStatusColor: statusColor[healthStatus],
                distribution,
            },
            analysis: {
                foodQuality,
                eatingPattern,
                macroBalance,
            },
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
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [isArabic]);

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <p>📊 {error || (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}</p>
                    <button onClick={fetchData} className="retry-btn">
                        🔄 {isArabic ? 'تحديث' : 'Refresh'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* رأس التحليلات */}
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل التغذية' : 'Nutrition Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* 🧠 تقييم التغذية الشامل */}
            <div className="global-health-card">
                <h3>🧠 {isArabic ? 'تقييم التغذية' : 'Nutrition Assessment'}</h3>
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
                
                {/* تحليل الحالة */}
                <div className="health-analysis">
                    <div className="positives-list">
                        <strong>🔍 {isArabic ? 'التحليل' : 'Analysis'}:</strong>
                        {data.summary.calorieDiff !== 0 && (
                            <div className={`positive-item ${data.summary.calorieDiff > 0 ? 'warning' : 'info'}`}>
                                {isArabic 
                                    ? `🔥 السعرات: ${data.summary.calorieDiff > 0 ? 'أعلى' : 'أقل'} من هدفك بـ ${Math.abs(data.summary.calorieDiff)} سعرة`
                                    : `🔥 Calories: ${data.summary.calorieDiff > 0 ? 'above' : 'below'} target by ${Math.abs(data.summary.calorieDiff)}`}
                            </div>
                        )}
                        {data.summary.totalProtein > 0 && (
                            <div className={`positive-item ${data.summary.proteinProgress < 70 ? 'warning' : ''}`}>
                                {isArabic 
                                    ? `💪 البروتين: ${data.summary.proteinProgress}% من الهدف (${data.summary.totalProtein}g / ${USER_GOALS.dailyProtein}g)`
                                    : `💪 Protein: ${data.summary.proteinProgress}% of target (${data.summary.totalProtein}g / ${USER_GOALS.dailyProtein}g)`}
                            </div>
                        )}
                    </div>
                    
                    {data.analysis.macroBalance && (
                        <div className="warnings-list">
                            <strong>⚖️ {isArabic ? 'توازن الماكروز' : 'Macro Balance'}:</strong>
                            <div className="warning-item">
                                {isArabic 
                                    ? `🥩 بروتين: ${data.analysis.macroBalance.proteinPercent}%  |  🌾 كارب: ${data.analysis.macroBalance.carbsPercent}%  |  🫒 دهون: ${data.analysis.macroBalance.fatPercent}%`
                                    : `🥩 Protein: ${data.analysis.macroBalance.proteinPercent}%  |  🌾 Carbs: ${data.analysis.macroBalance.carbsPercent}%  |  🫒 Fat: ${data.analysis.macroBalance.fatPercent}%`}
                            </div>
                            {data.analysis.macroBalance.issues.includes('carbs_high') && (
                                <div className="warning-item severity-warning">
                                    ⚠️ {isArabic ? 'الكربوهيدرات مرتفعة' : 'Carbs are high'}
                                </div>
                            )}
                            {data.analysis.macroBalance.issues.includes('protein_low') && (
                                <div className="warning-item severity-warning">
                                    ⚠️ {isArabic ? 'البروتين منخفض' : 'Protein is low'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 🧠 ملاحظات ذكية عن نمط الأكل */}
            {(data.analysis.eatingPattern.skipBreakfast || data.analysis.eatingPattern.pattern === 'night_eater') && (
                <div className="correlations-card">
                    <h3>🧠 {isArabic ? 'ملاحظات ذكية' : 'Smart Insights'}</h3>
                    <div className="correlations-list">
                        {data.analysis.eatingPattern.skipBreakfast && (
                            <div className="correlation-item severity-medium">
                                <p className="correlation-message">
                                    {isArabic ? '🌅 لا تتناول وجبة الفطور' : '🌅 You skip breakfast'}
                                </p>
                                <p className="correlation-advice">
                                    💡 {isArabic ? 'الفطور يزيد التركيز ويقلل الجوع خلال اليوم' : 'Breakfast increases focus and reduces hunger throughout the day'}
                                </p>
                            </div>
                        )}
                        {data.analysis.eatingPattern.pattern === 'night_eater' && (
                            <div className="correlation-item severity-warning">
                                <p className="correlation-message">
                                    {isArabic ? `🌙 تميل لتناول الطعام في وقت متأخر (${data.analysis.eatingPattern.lateMealsCount} وجبة)` : `🌙 You tend to eat late (${data.analysis.eatingPattern.lateMealsCount} meals)`}
                                </p>
                                <p className="correlation-advice">
                                    💡 {isArabic ? 'الأكل المتأخر يؤثر على جودة النوم وحرق الدهون' : 'Late eating affects sleep quality and fat burning'}
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

            {/* 💡 التوصيات الذكية */}
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
                                         rec.timing === 'evening' ? (isArabic ? '🌙 المساء' : '🌙 Evening') :
                                         rec.timing === 'tomorrow' ? (isArabic ? '📅 غداً' : '📅 Tomorrow') :
                                         (isArabic ? '💡 عام' : '💡 General')}
                                    </span>
                                </div>
                                <p className="rec-advice">{rec.advice}</p>
                                <p className="rec-action">🎯 {rec.action}</p>
                                {rec.details && rec.details.length > 0 && (
                                    <ul className="rec-details">
                                        {rec.details.map((detail, i) => (
                                            <li key={i}>✓ {detail}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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