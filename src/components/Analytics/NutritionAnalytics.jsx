// src/components/Analytics/NutritionAnalytics.jsx - النسخة المطورة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    BarElement,
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
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const NutritionAnalytics = ({ refreshTrigger }) => {
    // ✅ إعدادات اللغة
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
    const [userProfile, setUserProfile] = useState(null);
    const [userWeight, setUserWeight] = useState(null);
    const [userGoal, setUserGoal] = useState(null);
    const isMountedRef = useRef(true);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                fetchData();
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ حساب السعرات الموصى بها بناءً على بيانات المستخدم
    const calculateRecommendedCalories = (weight, height, age, gender, activityLevel) => {
        if (!weight || !height || !age) return 2000;
        
        let bmr;
        if (gender === 'female') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        }
        
        const activityMultipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        
        const multiplier = activityMultipliers[activityLevel] || 1.375;
        return Math.round(bmr * multiplier);
    };

    // ✅ تقدير جودة الطعام (AI بسيط)
    const analyzeFoodQuality = (meals) => {
        let highQualityCount = 0;
        let processedFoodCount = 0;
        let vegetableCount = 0;
        let fruitCount = 0;
        let proteinSources = new Set();
        let wholeGrainsCount = 0;
        let sugarCount = 0;
        
        const qualityKeywords = {
            vegetables: isArabic ? ['خضار', 'خس', 'طماطم', 'خيار', 'بروكلي', 'سبانخ', 'جزر', 'كوسا'] : 
                                ['vegetable', 'lettuce', 'tomato', 'cucumber', 'broccoli', 'spinach', 'carrot', 'zucchini'],
            fruits: isArabic ? ['فاكهة', 'تفاح', 'موز', 'برتقال', 'فراولة', 'عنب'] : 
                            ['fruit', 'apple', 'banana', 'orange', 'strawberry', 'grape'],
            qualityProtein: isArabic ? ['دجاج', 'سمك', 'لحم', 'بيض', 'تونة', 'جبن', 'زبادي', 'عدس', 'حمص'] :
                                    ['chicken', 'fish', 'meat', 'egg', 'tuna', 'cheese', 'yogurt', 'lentil', 'chickpea'],
            wholeGrains: isArabic ? ['شوفان', 'خبز أسمر', 'أرز بني', 'كينوا'] :
                                    ['oats', 'whole wheat', 'brown rice', 'quinoa'],
            processed: isArabic ? ['بيتزا', 'برجر', 'بطاطس مقلية', 'شيبس', 'حلويات', 'سoda', 'عصير محلى'] :
                                ['pizza', 'burger', 'fries', 'chips', 'candy', 'soda', 'sugary drink'],
            sugar: isArabic ? ['سكر', 'حلويات', 'شوكولاتة', 'كيك', 'بسكويت'] :
                            ['sugar', 'candy', 'chocolate', 'cake', 'cookie']
        };
        
        meals.forEach(meal => {
            const ingredients = meal.ingredients || [];
            const mealName = (meal.name || '').toLowerCase();
            const mealNotes = (meal.notes || '').toLowerCase();
            const searchText = ingredients.map(i => (i.name || '').toLowerCase()).join(' ') + ' ' + mealName + ' ' + mealNotes;
            
            qualityKeywords.vegetables.forEach(v => {
                if (searchText.includes(v)) { vegetableCount++; highQualityCount++; }
            });
            
            qualityKeywords.fruits.forEach(f => {
                if (searchText.includes(f)) { fruitCount++; highQualityCount++; }
            });
            
            qualityKeywords.qualityProtein.forEach(p => {
                if (searchText.includes(p)) { proteinSources.add(p); highQualityCount++; }
            });
            
            qualityKeywords.wholeGrains.forEach(g => {
                if (searchText.includes(g)) { wholeGrainsCount++; highQualityCount++; }
            });
            
            qualityKeywords.processed.forEach(p => {
                if (searchText.includes(p)) processedFoodCount++;
            });
            
            qualityKeywords.sugar.forEach(s => {
                if (searchText.includes(s)) sugarCount++;
            });
        });
        
        let qualityScore = 0;
        if (vegetableCount > 0) qualityScore += 20;
        if (fruitCount > 0) qualityScore += 15;
        if (proteinSources.size >= 2) qualityScore += 25;
        if (wholeGrainsCount > 0) qualityScore += 15;
        if (processedFoodCount > meals.length * 0.5) qualityScore -= 30;
        if (sugarCount > meals.length) qualityScore -= 20;
        
        qualityScore = Math.min(100, Math.max(0, qualityScore));
        
        return {
            qualityScore,
            hasVegetables: vegetableCount > 0,
            hasFruits: fruitCount > 0,
            hasQualityProtein: proteinSources.size > 0,
            proteinVariety: proteinSources.size,
            hasWholeGrains: wholeGrainsCount > 0,
            processedFoodRisk: processedFoodCount > meals.length * 0.3,
            highSugarRisk: sugarCount > meals.length * 0.5,
            vegetableIntake: vegetableCount,
            fruitIntake: fruitCount
        };
    };

    // ✅ تحليل نمط الأكل المتقدم
    const analyzeEatingPattern = (meals) => {
        const mealHours = meals.map(m => m.meal_time ? new Date(m.meal_time).getHours() : 0);
        const lateMeals = mealHours.filter(h => h >= 22 || h <= 4).length;
        const morningMeals = mealHours.filter(h => h >= 6 && h <= 10).length;
        
        const mealGaps = [];
        for (let i = 1; i < mealHours.length; i++) {
            mealGaps.push(Math.abs(mealHours[i] - mealHours[i-1]));
        }
        const avgGap = mealGaps.length > 0 ? mealGaps.reduce((a, b) => a + b, 0) / mealGaps.length : 0;
        const irregularEating = mealGaps.some(gap => gap > 6);
        
        const mealTypes = meals.map(m => m.meal_type);
        const mealDistribution = {
            Breakfast: mealTypes.filter(t => t === 'Breakfast').length,
            Lunch: mealTypes.filter(t => t === 'Lunch').length,
            Dinner: mealTypes.filter(t => t === 'Dinner').length,
            Snack: mealTypes.filter(t => t === 'Snack').length
        };
        
        let pattern = 'regular';
        let patternMessage = '';
        
        if (lateMeals > meals.length * 0.3) {
            pattern = 'night_eater';
            patternMessage = isArabic ? 'تتناول الطعام في وقت متأخر' : 'You eat late at night';
        } else if (morningMeals === 0 && meals.length > 0) {
            pattern = 'skip_breakfast';
            patternMessage = isArabic ? 'لا تتناول وجبة الفطور' : 'You skip breakfast';
        } else if (irregularEating && meals.length >= 3) {
            pattern = 'irregular';
            patternMessage = isArabic ? 'مواعيد وجباتك غير منتظمة' : 'Your meal times are irregular';
        } else if (mealDistribution.Snack > mealDistribution.Breakfast && meals.length > 3) {
            pattern = 'snacking';
            patternMessage = isArabic ? 'تتناول وجبات خفيفة كثيرة' : 'You have many snacks';
        }
        
        return {
            pattern,
            patternMessage,
            lateMealsCount: lateMeals,
            skipBreakfast: morningMeals === 0 && meals.length > 0,
            mealFrequency: meals.length,
            avgMealGap: Math.round(avgGap),
            mealDistribution
        };
    };

    // ✅ تحليل التوازن الغذائي المتقدم
    const analyzeMacroBalance = (avgProtein, avgCarbs, avgFat, totalCalories) => {
        if (totalCalories === 0) return null;
        
        const proteinCalories = avgProtein * 4;
        const carbsCalories = avgCarbs * 4;
        const fatCalories = avgFat * 9;
        
        const proteinPercent = (proteinCalories / totalCalories) * 100;
        const carbsPercent = (carbsCalories / totalCalories) * 100;
        const fatPercent = (fatCalories / totalCalories) * 100;
        
        const issues = [];
        const strengths = [];
        
        if (proteinPercent < 15) issues.push('protein_low');
        else if (proteinPercent > 30) issues.push('protein_high');
        else strengths.push('protein_balanced');
        
        if (carbsPercent > 60) issues.push('carbs_high');
        else if (carbsPercent < 40) issues.push('carbs_low');
        else strengths.push('carbs_balanced');
        
        if (fatPercent > 35) issues.push('fat_high');
        else if (fatPercent < 20) issues.push('fat_low');
        else strengths.push('fat_balanced');
        
        const idealRatios = {
            protein: { min: 15, max: 25, ideal: 20 },
            carbs: { min: 45, max: 65, ideal: 55 },
            fat: { min: 20, max: 35, ideal: 27.5 }
        };
        
        const distanceFromIdeal = Math.sqrt(
            Math.pow(proteinPercent - idealRatios.protein.ideal, 2) +
            Math.pow(carbsPercent - idealRatios.carbs.ideal, 2) +
            Math.pow(fatPercent - idealRatios.fat.ideal, 2)
        );
        
        const balanceScore = Math.max(0, 100 - Math.min(100, distanceFromIdeal * 5));
        
        return {
            proteinPercent: proteinPercent.toFixed(1),
            carbsPercent: carbsPercent.toFixed(1),
            fatPercent: fatPercent.toFixed(1),
            proteinGrams: avgProtein,
            carbsGrams: avgCarbs,
            fatGrams: avgFat,
            issues,
            strengths,
            balanceScore: Math.round(balanceScore),
            recommended: {
                protein: `${idealRatios.protein.min}-${idealRatios.protein.max}%`,
                carbs: `${idealRatios.carbs.min}-${idealRatios.carbs.max}%`,
                fat: `${idealRatios.fat.min}-${idealRatios.fat.max}%`
            }
        };
    };

    // ✅ حساب درجة التغذية الشاملة
    const calculateNutritionScore = (summary, quality, pattern, macroBalance) => {
        let score = 0;
        
        // السعرات (30 نقطة)
        if (summary.calorieProgress >= 90 && summary.calorieProgress <= 110) score += 30;
        else if (summary.calorieProgress >= 70) score += 20;
        else if (summary.calorieProgress > 0) score += 10;
        
        // البروتين (25 نقطة)
        if (summary.proteinProgress >= 90) score += 25;
        else if (summary.proteinProgress >= 70) score += 15;
        else if (summary.proteinProgress > 0) score += 5;
        
        // جودة الطعام (25 نقطة)
        score += Math.round(quality.qualityScore * 0.25);
        
        // توازن الماكروز (20 نقطة)
        if (macroBalance) score += Math.round(macroBalance.balanceScore * 0.2);
        
        // خصم للأنماط السيئة
        if (pattern.pattern === 'night_eater') score -= 10;
        if (pattern.skipBreakfast) score -= 5;
        if (quality.processedFoodRisk) score -= 15;
        if (quality.highSugarRisk) score -= 20;
        
        return Math.min(100, Math.max(0, Math.round(score)));
    };

    // ✅ توليد توصيات ذكية متقدمة
    const generateSmartRecommendations = (analysis, userProfile) => {
        const recommendations = [];
        const { summary, quality, pattern, macroBalance, userStats } = analysis;
        
        // توصيات السعرات
        if (summary.calorieDiff > 500) {
            recommendations.push({
                icon: '🔥', timing: 'today', priority: 'high',
                category: 'calories',
                title: isArabic ? 'سعرات مرتفعة جداً' : 'Very High Calories',
                advice: isArabic ? `تناولت ${summary.totalCalories} سعرة (+${summary.calorieDiff} عن احتياجك)` : `You consumed ${summary.totalCalories} calories (+${summary.calorieDiff} above need)`,
                action: isArabic ? 'قلل السعرات في الوجبة القادمة، ركز على الخضروات والبروتين' : 'Reduce calories in next meal, focus on vegetables and protein',
                details: [isArabic ? 'اشرب كوب ماء قبل الوجبات' : 'Drink water before meals', isArabic ? 'تجنب المشروبات السكرية' : 'Avoid sugary drinks']
            });
        } else if (summary.calorieDiff < -300 && summary.totalCalories > 0) {
            recommendations.push({
                icon: '⚠️', timing: 'today', priority: 'high',
                category: 'calories',
                title: isArabic ? 'سعرات منخفضة' : 'Low Calories',
                advice: isArabic ? `تناولت ${summary.totalCalories} سعرة فقط (نقص ${Math.abs(summary.calorieDiff)} سعرة)` : `You only consumed ${summary.totalCalories} calories (deficit ${Math.abs(summary.calorieDiff)})`,
                action: isArabic ? 'أضف وجبة خفيفة صحية: زبادي مع فواكه أو مكسرات' : 'Add a healthy snack: yogurt with fruit or nuts',
                details: [isArabic ? 'لا تهمل وجبة الفطور' : 'Don\'t skip breakfast', isArabic ? 'البروتين يمنحك الشبع' : 'Protein provides satiety']
            });
        }
        
        // توصيات البروتين
        if (summary.proteinNeeded > 30 && summary.totalProtein > 0) {
            recommendations.push({
                icon: '💪', timing: 'today', priority: 'high',
                category: 'protein',
                title: isArabic ? 'نقص حاد في البروتين' : 'Severe Protein Deficiency',
                advice: isArabic ? `تحتاج ${Math.round(summary.proteinNeeded)}g إضافية من البروتين اليوم` : `You need ${Math.round(summary.proteinNeeded)}g additional protein today`,
                action: isArabic ? 'أضف: 3 بيضات (18g) أو صدر دجاج (30g) أو علبتي تونة (50g)' : 'Add: 3 eggs (18g) or chicken breast (30g) or 2 tuna cans (50g)',
                details: [isArabic ? 'البروتين يبني العضلات ويساعد على الشبع' : 'Protein builds muscle and promotes satiety']
            });
        } else if (summary.proteinNeeded > 15 && summary.totalProtein > 0) {
            recommendations.push({
                icon: '💪', timing: 'today', priority: 'medium',
                category: 'protein',
                title: isArabic ? 'نقص في البروتين' : 'Protein Deficiency',
                advice: isArabic ? `تحتاج ${Math.round(summary.proteinNeeded)}g إضافية من البروتين` : `You need ${Math.round(summary.proteinNeeded)}g additional protein`,
                action: isArabic ? 'أضف: بيضتين (12g) أو زبادي يوناني (15g)' : 'Add: 2 eggs (12g) or Greek yogurt (15g)',
                details: []
            });
        }
        
        // توصيات جودة الطعام
        if (quality.processedFoodRisk) {
            recommendations.push({
                icon: '🍔', timing: 'today', priority: 'high',
                category: 'quality',
                title: isArabic ? 'أطعمة مصنعة كثيرة' : 'Too Much Processed Food',
                advice: isArabic ? `نسبة كبيرة من وجباتك تحتوي على أطعمة مصنعة` : `A large portion of your meals contain processed foods`,
                action: isArabic ? 'استبدل الوجبات السريعة بأطباق منزلية صحية' : 'Replace fast food with healthy home-cooked meals',
                details: [isArabic ? 'الأطعمة المصنعة تزيد الالتهابات' : 'Processed foods increase inflammation']
            });
        }
        
        if (quality.highSugarRisk) {
            recommendations.push({
                icon: '🍰', timing: 'today', priority: 'high',
                category: 'sugar',
                title: isArabic ? 'سكريات عالية' : 'High Sugar Intake',
                advice: isArabic ? `سجلت استهلاك عالي للسكريات` : `High sugar consumption detected`,
                action: isArabic ? 'قلل الحلويات والمشروبات السكرية تدريجياً' : 'Gradually reduce sweets and sugary drinks',
                details: [isArabic ? 'استبدل السكريات بالفواكه الطبيعية' : 'Replace sugars with natural fruits']
            });
        }
        
        if (!quality.hasVegetables && summary.totalMeals > 0) {
            recommendations.push({
                icon: '🥬', timing: 'today', priority: 'high',
                category: 'vegetables',
                title: isArabic ? 'نقص حاد في الخضروات' : 'Severe Vegetable Deficiency',
                advice: isArabic ? 'لم تسجل أي خضروات اليوم' : 'No vegetables recorded today',
                action: isArabic ? 'أضف سلطة خضراء أو خضاراً مشوياً إلى وجبتك القادمة' : 'Add a green salad or grilled vegetables to your next meal',
                details: [isArabic ? 'الخضروات غنية بالألياف والفيتامينات' : 'Vegetables are rich in fiber and vitamins']
            });
        } else if (!quality.hasVegetables && summary.totalMeals === 0) {
            recommendations.push({
                icon: '🥬', timing: 'tomorrow', priority: 'medium',
                category: 'vegetables',
                title: isArabic ? 'أضف الخضروات لوجباتك' : 'Add vegetables to your meals',
                advice: isArabic ? 'الخضروات تحسن الهضم وتقلل الالتهابات' : 'Vegetables improve digestion and reduce inflammation',
                action: isArabic ? 'ابدأ بإضافة نصف طبق خضروات لكل وجبة' : 'Start by adding half a plate of vegetables to each meal',
                details: []
            });
        }
        
        if (!quality.hasQualityProtein && summary.totalMeals > 0) {
            recommendations.push({
                icon: '🥩', timing: 'today', priority: 'medium',
                category: 'protein_quality',
                title: isArabic ? 'نقص في مصادر البروتين الجيد' : 'Lack of Quality Protein Sources',
                advice: isArabic ? 'البروتين مهم للعضلات والشبع' : 'Protein is important for muscles and satiety',
                action: isArabic ? 'أضف: دجاج، سمك، بيض، عدس، أو حمص' : 'Add: chicken, fish, eggs, lentils, or chickpeas',
                details: []
            });
        }
        
        // توصيات نمط الأكل
        if (pattern.pattern === 'skip_breakfast') {
            recommendations.push({
                icon: '🌅', timing: 'tomorrow', priority: 'medium',
                category: 'pattern',
                title: isArabic ? 'تناول وجبة الفطور' : 'Eat Breakfast',
                advice: isArabic ? 'الفطور يمنحك الطاقة لبدء يومك بنشاط' : 'Breakfast gives you energy to start your day',
                action: isArabic ? 'جرب: زبادي يوناني مع عسل وجوز، أو بيض مع خبز أسمر' : 'Try: Greek yogurt with honey and walnuts, or eggs with whole wheat bread',
                details: [isArabic ? 'البروتين في الفطور يقلل الجوع' : 'Protein at breakfast reduces hunger']
            });
        }
        
        if (pattern.pattern === 'night_eater') {
            recommendations.push({
                icon: '🌙', timing: 'tomorrow', priority: 'medium',
                category: 'pattern',
                title: isArabic ? 'تجنب الأكل المتأخر' : 'Avoid Late Night Eating',
                advice: isArabic ? `تتناول ${pattern.lateMealsCount} وجبة متأخرة` : `You have ${pattern.lateMealsCount} late meals`,
                action: isArabic ? 'تناول العشاء قبل الساعة 8 مساءً' : 'Have dinner before 8 PM',
                details: [isArabic ? 'الأكل المتأخر يؤثر على جودة النوم' : 'Late eating affects sleep quality']
            });
        }
        
        if (pattern.pattern === 'irregular') {
            recommendations.push({
                icon: '⏰', timing: 'tomorrow', priority: 'medium',
                category: 'pattern',
                title: isArabic ? 'نظم مواعيد وجباتك' : 'Regularize Your Meal Times',
                advice: isArabic ? `فجوة بين الوجبات: ${pattern.avgMealGap} ساعات` : `Meal gap: ${pattern.avgMealGap} hours`,
                action: isArabic ? 'حاول تناول الوجبات في نفس الوقت يومياً' : 'Try to eat meals at the same time daily',
                details: [isArabic ? 'الانتظام يحسن الهضم والأيض' : 'Regularity improves digestion and metabolism']
            });
        }
        
        // توصيات توازن الماكروز
        if (macroBalance && macroBalance.issues.includes('carbs_high')) {
            recommendations.push({
                icon: '🍚', timing: 'general', priority: 'low',
                category: 'macros',
                title: isArabic ? 'كربوهيدرات عالية' : 'High Carbohydrates',
                advice: isArabic ? `الكربوهيدرات: ${macroBalance.carbsPercent}% من سعراتك` : `Carbs: ${macroBalance.carbsPercent}% of your calories`,
                action: isArabic ? 'قلل الخبز الأبيض والأرز، وزد الخضروات' : 'Reduce white bread and rice, increase vegetables',
                details: []
            });
        }
        
        if (macroBalance && macroBalance.issues.includes('fat_high')) {
            recommendations.push({
                icon: '🧈', timing: 'general', priority: 'low',
                category: 'macros',
                title: isArabic ? 'دهون عالية' : 'High Fats',
                advice: isArabic ? `الدهون: ${macroBalance.fatPercent}% من سعراتك` : `Fats: ${macroBalance.fatPercent}% of your calories`,
                action: isArabic ? 'قلل الأطعمة المقلية واختر الدهون الصحية' : 'Reduce fried foods and choose healthy fats',
                details: [isArabic ? 'زيت الزيتون والأفوكادو مصادر صحية' : 'Olive oil and avocado are healthy sources']
            });
        }
        
        return recommendations;
    };

    const analyzeMeals = (meals, userData) => {
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
        
        // حساب السعرات الموصى بها
        const recommendedCalories = userData?.recommendedCalories || 2000;
        const recommendedProtein = userData?.recommendedProtein || 80;
        
        const calorieProgress = Math.min(100, Math.round((totalCalories / recommendedCalories) * 100));
        const proteinProgress = Math.min(100, Math.round((totalProtein / recommendedProtein) * 100));
        const calorieDiff = totalCalories - recommendedCalories;
        const proteinNeeded = Math.max(0, recommendedProtein - totalProtein);
        
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
                meals: dayMeals.length,
            });
        }
        
        const foodQuality = analyzeFoodQuality(meals);
        const eatingPattern = analyzeEatingPattern(meals);
        const macroBalance = analyzeMacroBalance(avgProtein, avgCarbs, avgFat, totalCalories);
        const nutritionScore = calculateNutritionScore(
            { calorieProgress, proteinProgress, totalCalories, calorieDiff, totalProtein, proteinNeeded, totalMeals },
            foodQuality, eatingPattern, macroBalance
        );
        
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
        
        // تحليل إضافي
        const bestDay = weekly.reduce((best, current) => 
            current.calories > best.calories ? current : best, weekly[0] || {});
        const worstDay = weekly.reduce((worst, current) => 
            current.calories < worst.calories && current.calories > 0 ? current : worst, weekly[0] || {});
        
        const analysis = {
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
            quality: foodQuality,
            pattern: eatingPattern,
            macroBalance,
            userStats: {
                recommendedCalories,
                recommendedProtein,
                bmi: userData?.bmi,
                weight: userData?.weight
            },
            bestDay: bestDay.day,
            worstDay: worstDay.day,
            weekly,
            distribution,
            recommendations: [],
            chartData: {
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
            },
            proteinTrendData: {
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
            },
            distributionData: {
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
            },
            macroData: macroBalance ? {
                labels: [isArabic ? 'بروتين' : 'Protein', isArabic ? 'كربوهيدرات' : 'Carbs', isArabic ? 'دهون' : 'Fats'],
                datasets: [{
                    data: [macroBalance.proteinPercent, macroBalance.carbsPercent, macroBalance.fatPercent],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                }]
            } : null,
            mealFrequencyData: {
                labels: weekly.map(w => w.day),
                datasets: [{
                    label: isArabic ? 'عدد الوجبات' : 'Number of Meals',
                    data: weekly.map(w => w.meals),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 8,
                }]
            }
        };
        
        analysis.recommendations = generateSmartRecommendations(analysis, userData);
        
        return analysis;
    };

    // ✅ جلب بيانات المستخدم والتغذية
    const fetchUserProfile = useCallback(async () => {
        try {
            const [profileRes, healthRes] = await Promise.all([
                axiosInstance.get('/profile/').catch(() => ({ data: null })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] }))
            ]);
            
            let height = null, age = null, gender = null, activityLevel = 'moderate';
            if (profileRes.data) {
                height = profileRes.data.height_cm;
                if (profileRes.data.birth_date) {
                    age = new Date().getFullYear() - new Date(profileRes.data.birth_date).getFullYear();
                }
                gender = profileRes.data.gender;
                activityLevel = profileRes.data.activity_level || 'moderate';
            }
            
            let weight = null;
            let healthRecords = [];
            if (healthRes.data?.results) healthRecords = healthRes.data.results;
            else if (Array.isArray(healthRes.data)) healthRecords = healthRes.data;
            
            if (healthRecords.length > 0) {
                const sorted = [...healthRecords].sort((a, b) => 
                    new Date(b.recorded_at) - new Date(a.recorded_at)
                );
                weight = sorted[0]?.weight_kg;
            }
            
            let bmi = null;
            if (weight && height) {
                const heightM = height / 100;
                bmi = Math.round(weight / (heightM * heightM) * 10) / 10;
            }
            
            const recommendedCalories = calculateRecommendedCalories(weight || 70, height || 170, age || 30, gender || 'male', activityLevel);
            const recommendedProtein = Math.round((recommendedCalories * 0.2) / 4); // 20% من السعرات من البروتين
            
            return { weight, height, age, gender, bmi, recommendedCalories, recommendedProtein, activityLevel };
        } catch (err) {
            console.error('Error fetching profile:', err);
            return { recommendedCalories: 2000, recommendedProtein: 80 };
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        
        try {
            const [mealsRes, userProfile] = await Promise.all([
                axiosInstance.get('/meals/').catch(() => ({ data: [] })),
                fetchUserProfile()
            ]);
            
            const meals = Array.isArray(mealsRes.data) ? mealsRes.data : 
                         (mealsRes.data?.results ? mealsRes.data.results : []);
            
            if (isMountedRef.current) {
                const analysis = analyzeMeals(meals, userProfile);
                setData(analysis);
                setUserProfile(userProfile);
                setUserWeight(userProfile.weight);
                setUserGoal({
                    calories: userProfile.recommendedCalories,
                    protein: userProfile.recommendedProtein
                });
                
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
    }, [isArabic, fetchUserProfile]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        return () => { isMountedRef.current = false; };
    }, [fetchData, refreshTrigger]);

    // تأثير الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: darkMode ? '#f8fafc' : '#0f172a', font: { size: 11 } } },
            tooltip: { rtl: isArabic }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } },
            x: { grid: { display: false }, ticks: { color: darkMode ? '#94a3b8' : '#475569' } }
        }
    };
    
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: darkMode ? '#f8fafc' : '#0f172a', font: { size: 10 } } },
            tooltip: { rtl: isArabic }
        }
    };

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
                </div>
            </div>
        );
    }

    return (
        <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>{isArabic ? 'تحليل التغذية المتقدم' : 'Advanced Nutrition Analytics'}</h2>
                <button onClick={fetchData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            {/* معلومات المستخدم */}
            {userProfile && (
                <div className="user-info-bar">
                    <span>⚖️ {isArabic ? 'وزنك' : 'Your weight'}: {userWeight || '?'} kg</span>
                    <span>🎯 {isArabic ? 'السعرات الموصى بها' : 'Recommended calories'}: {userGoal?.calories || 2000} kcal</span>
                    <span>💪 {isArabic ? 'البروتين الموصى به' : 'Recommended protein'}: {userGoal?.protein || 80}g</span>
                </div>
            )}

            {/* تقييم التغذية الشامل */}
            <div className="global-health-card">
                <h3>{isArabic ? 'تقييم التغذية' : 'Nutrition Assessment'}</h3>
                <div className="health-score-container">
                    <div className="health-score-circle">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke={data.summary.healthStatusColor} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 54}`} strokeDashoffset={`${2 * Math.PI * 54 * (1 - data.summary.nutritionScore / 100)}`} transform="rotate(-90 60 60)"/>
                            <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">{data.summary.nutritionScore}%</text>
                        </svg>
                    </div>
                    <div className="health-status">
                        <span className="status-badge" style={{ background: data.summary.healthStatusColor }}>{data.summary.healthStatusText}</span>
                    </div>
                </div>
                
                <div className="health-analysis">
                    <div className="positives-list">
                        <strong>{isArabic ? 'التحليل' : 'Analysis'}:</strong>
                        <div className={`positive-item ${data.summary.calorieDiff > 0 ? 'warning' : 'info'}`}>
                            🔥 {isArabic ? `السعرات: ${data.summary.calorieDiff > 0 ? 'أعلى' : 'أقل'} من هدفك بـ ${Math.abs(data.summary.calorieDiff)} سعرة` : `Calories: ${data.summary.calorieDiff > 0 ? 'above' : 'below'} target by ${Math.abs(data.summary.calorieDiff)}`}
                        </div>
                        {data.summary.totalProtein > 0 && (
                            <div className="positive-item">
                                💪 {isArabic ? `البروتين: ${data.summary.proteinProgress}% من الهدف (${data.summary.totalProtein}g / ${userGoal?.protein || 80}g)` : `Protein: ${data.summary.proteinProgress}% of target (${data.summary.totalProtein}g / ${userGoal?.protein || 80}g)`}
                            </div>
                        )}
                        {data.quality.qualityScore > 0 && (
                            <div className="positive-item">
                                🥗 {isArabic ? `جودة الطعام: ${data.quality.qualityScore}%` : `Food quality: ${data.quality.qualityScore}%`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ملاحظات ذكية عن نمط الأكل */}
            {data.pattern.pattern !== 'regular' && (
                <div className="correlations-card">
                    <h3>{isArabic ? 'ملاحظات ذكية' : 'Smart Insights'}</h3>
                    <div className="correlations-list">
                        <div className="correlation-item severity-medium">
                            <p className="correlation-message">{data.pattern.patternMessage}</p>
                            <p className="correlation-advice">
                                💡 {data.pattern.pattern === 'skip_breakfast' ? (isArabic ? 'تناول فطوراً غنياً بالبروتين لبدء يومك بنشاط' : 'Eat a protein-rich breakfast to start your day actively') :
                                    data.pattern.pattern === 'night_eater' ? (isArabic ? 'تناول العشاء قبل الساعة 8 مساءً' : 'Have dinner before 8 PM') :
                                    data.pattern.pattern === 'irregular' ? (isArabic ? 'حدد مواعيد ثابتة لوجباتك' : 'Set fixed meal times') :
                                    (isArabic ? 'وزع وجباتك بشكل أفضل' : 'Distribute your meals better')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* بطاقات الإحصائيات */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card"><div className="stat-icon">🍽️</div><div className="stat-content"><div className="stat-value">{data.summary.totalMeals}</div><div className="stat-label">{isArabic ? 'إجمالي الوجبات' : 'Total Meals'}</div></div></div>
                <div className="analytics-stat-card"><div className="stat-icon">🔥</div><div className="stat-content"><div className="stat-value">{data.summary.totalCalories}</div><div className="stat-label">{isArabic ? 'إجمالي السعرات' : 'Total Calories'}</div></div></div>
                <div className="analytics-stat-card"><div className="stat-icon">💪</div><div className="stat-content"><div className="stat-value">{data.summary.totalProtein}g</div><div className="stat-label">{isArabic ? 'إجمالي البروتين' : 'Total Protein'}</div></div></div>
            </div>

            {/* شريط التقدم */}
            <div className="progress-container">
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${data.summary.proteinProgress}%`, background: '#10b981' }}><span className="progress-text">{isArabic ? 'البروتين' : 'Protein'}: {data.summary.proteinProgress}%</span></div></div>
                <div className="progress-bar-bg" style={{ marginTop: '0.5rem' }}><div className="progress-bar-fill" style={{ width: `${data.summary.calorieProgress}%`, background: '#ef4444' }}><span className="progress-text">{isArabic ? 'السعرات' : 'Calories'}: {data.summary.calorieProgress}%</span></div></div>
                {data.quality.qualityScore > 0 && (
                    <div className="progress-bar-bg" style={{ marginTop: '0.5rem' }}><div className="progress-bar-fill" style={{ width: `${data.quality.qualityScore}%`, background: '#8b5cf6' }}><span className="progress-text">{isArabic ? 'جودة الطعام' : 'Food Quality'}: {data.quality.qualityScore}%</span></div></div>
                )}
            </div>

            {/* أفضل وأسوأ يوم */}
            {data.bestDay && data.worstDay && (
                <div className="best-worst-days">
                    <div className="best-day">🌟 {isArabic ? 'أفضل يوم' : 'Best day'}: <strong>{data.bestDay}</strong></div>
                    <div className="worst-day">⚠️ {isArabic ? 'يوم يحتاج تحسين' : 'Day needing improvement'}: <strong>{data.worstDay}</strong></div>
                </div>
            )}

            {/* الرسوم البيانية */}
            <div className="charts-grid">
                <div className="chart-card"><h4>📈 {isArabic ? 'اتجاه السعرات الأسبوعي' : 'Weekly Calories Trend'}</h4><div style={{ height: '220px' }}><Line data={data.chartData} options={chartOptions} /></div></div>
                <div className="chart-card"><h4>💪 {isArabic ? 'اتجاه البروتين الأسبوعي' : 'Weekly Protein Trend'}</h4><div style={{ height: '220px' }}><Line data={data.proteinTrendData} options={chartOptions} /></div></div>
                <div className="chart-card"><h4>🥗 {isArabic ? 'توزيع الوجبات' : 'Meal Distribution'}</h4><div style={{ height: '200px' }}><Pie data={data.distributionData} options={pieOptions} /></div></div>
                {data.macroData && (<div className="chart-card"><h4>⚖️ {isArabic ? 'توازن الماكروز' : 'Macro Balance'}</h4><div style={{ height: '200px' }}><Pie data={data.macroData} options={pieOptions} /></div></div>)}
                <div className="chart-card"><h4>📊 {isArabic ? 'تكرار الوجبات' : 'Meal Frequency'}</h4><div style={{ height: '200px' }}><Bar data={data.mealFrequencyData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} /></div></div>
            </div>

            {/* توصيات جودة الطعام */}
            {(!data.quality.hasVegetables || !data.quality.hasFruits || !data.quality.hasWholeGrains) && (
                <div className="quality-tips">
                    <h4>🥗 {isArabic ? 'نصائح لتحسين جودة طعامك' : 'Tips to improve your food quality'}</h4>
                    <div className="quality-tips-grid">
                        {!data.quality.hasVegetables && <div className="tip-card"><span>🥬</span><p>{isArabic ? 'أضف الخضروات لكل وجبة' : 'Add vegetables to every meal'}</p></div>}
                        {!data.quality.hasFruits && <div className="tip-card"><span>🍎</span><p>{isArabic ? 'تناول فاكهة يومياً' : 'Eat fruit daily'}</p></div>}
                        {!data.quality.hasWholeGrains && <div className="tip-card"><span>🌾</span><p>{isArabic ? 'اختر الحبوب الكاملة' : 'Choose whole grains'}</p></div>}
                        {data.quality.processedFoodRisk && <div className="tip-card"><span>🍔</span><p>{isArabic ? 'قلل الأطعمة المصنعة' : 'Reduce processed foods'}</p></div>}
                        {data.quality.highSugarRisk && <div className="tip-card"><span>🍰</span><p>{isArabic ? 'قلل السكريات المضافة' : 'Reduce added sugars'}</p></div>}
                    </div>
                </div>
            )}

            {/* التوصيات الذكية */}
            {data.recommendations.length > 0 && (
                <div className="recommendations-card">
                    <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                    <div className="recommendations-list">
                        {data.recommendations.map((rec, idx) => (
                            <div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}>
                                <div className="rec-header"><span className="rec-icon">{rec.icon}</span><span className="rec-title">{rec.title}</span><span className={`rec-timing timing-${rec.timing}`}>{rec.timing === 'today' ? (isArabic ? '📅 اليوم' : '📅 Today') : rec.timing === 'tomorrow' ? (isArabic ? '📅 غداً' : '📅 Tomorrow') : (isArabic ? '💡 عام' : '💡 General')}</span></div>
                                <p className="rec-advice">{rec.advice}</p>
                                <p className="rec-action">🎯 {rec.action}</p>
                                {rec.details && rec.details.length > 0 && (<ul className="rec-details">{rec.details.map((detail, i) => <li key={i}>✓ {detail}</li>)}</ul>)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="analytics-footer">
                <small>{isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</small>
            </div>

            <style jsx>{`
                .analytics-container { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; }
                .analytics-container.dark-mode { background: #1e293b; }
                .analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                .analytics-header h2 { font-size: 1.35rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #ef4444, #f59e0b); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .dark-mode .analytics-header h2 { background: linear-gradient(135deg, #f87171, #fbbf24); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: none; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: var(--text-secondary, #64748b); }
                .dark-mode .refresh-btn { background: #334155; color: #94a3b8; }
                .refresh-btn:hover { background: linear-gradient(135deg, #ef4444, #f59e0b); color: white; transform: rotate(180deg); }
                .user-info-bar { display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.75rem 1rem; background: var(--secondary-bg, #f8fafc); border-radius: 16px; margin-bottom: 1.5rem; font-size: 0.8rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .user-info-bar { background: #0f172a; border-color: #334155; }
                .global-health-card { background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%); border-radius: 24px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; }
                .health-score-container { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
                .health-score-circle { position: relative; width: 100px; height: 100px; }
                .health-score-circle svg { width: 100%; height: 100%; }
                .health-score-circle text { fill: white; font-size: 20px; font-weight: bold; }
                .status-badge { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
                .health-analysis { background: rgba(255,255,255,0.1); border-radius: 16px; padding: 0.75rem; }
                .positive-item { font-size: 0.75rem; padding: 0.35rem 0.5rem; border-radius: 10px; margin-bottom: 0.35rem; background: rgba(255,255,255,0.1); }
                .positive-item.warning { background: rgba(245,158,11,0.3); }
                .positive-item.info { background: rgba(59,130,246,0.3); }
                .correlations-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .correlations-card { background: #0f172a; border-color: #334155; }
                .correlation-item { padding: 0.75rem; border-radius: 14px; background: var(--card-bg, #ffffff); border-left: 3px solid #3b82f6; }
                .dark-mode .correlation-item { background: #1e293b; }
                .analytics-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .analytics-stat-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border-light, #e2e8f0); transition: all 0.2s; }
                .dark-mode .analytics-stat-card { background: #0f172a; border-color: #334155; }
                .analytics-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
                .stat-icon { font-size: 1.8rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ef4444, #f59e0b); border-radius: 16px; color: white; }
                .stat-value { font-size: 1.6rem; font-weight: 800; color: var(--text-primary, #0f172a); }
                .dark-mode .stat-value { color: #f1f5f9; }
                .stat-label { font-size: 0.7rem; color: var(--text-secondary, #64748b); text-transform: uppercase; }
                .progress-container { margin-bottom: 1.5rem; }
                .progress-bar-bg { background: var(--border-light, #e2e8f0); border-radius: 10px; height: 32px; overflow: hidden; }
                .dark-mode .progress-bar-bg { background: #334155; }
                .progress-bar-fill { height: 100%; border-radius: 10px; display: flex; align-items: center; justify-content: flex-end; padding-right: 0.75rem; transition: width 0.5s ease; }
                .progress-text { font-size: 0.7rem; font-weight: 600; color: white; }
                [dir="rtl"] .progress-bar-fill { justify-content: flex-start; padding-right: 0; padding-left: 0.75rem; }
                .best-worst-days { display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: var(--secondary-bg, #f8fafc); border-radius: 16px; margin-bottom: 1.5rem; font-size: 0.8rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .best-worst-days { background: #0f172a; border-color: #334155; }
                .best-day { color: #10b981; }
                .worst-day { color: #f59e0b; }
                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .chart-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .chart-card { background: #0f172a; border-color: #334155; }
                .chart-card h4 { margin: 0 0 1rem 0; font-size: 0.85rem; font-weight: 600; color: var(--text-primary, #0f172a); }
                .dark-mode .chart-card h4 { color: #f1f5f9; }
                .quality-tips { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .quality-tips { background: #0f172a; border-color: #334155; }
                .quality-tips h4 { margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary, #0f172a); }
                .quality-tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
                .tip-card { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--card-bg, #ffffff); border-radius: 14px; font-size: 0.75rem; }
                .dark-mode .tip-card { background: #1e293b; }
                .tip-card span { font-size: 1.2rem; }
                .recommendations-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .recommendations-card { background: #0f172a; border-color: #334155; }
                .recommendations-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .recommendation { background: var(--card-bg, #ffffff); border-radius: 16px; padding: 1rem; transition: all 0.2s; border-left: 3px solid; }
                .dark-mode .recommendation { background: #1e293b; }
                .recommendation:hover { transform: translateX(4px); }
                .recommendation.timing-today { border-left-color: #f59e0b; }
                .recommendation.timing-tomorrow { border-left-color: #3b82f6; }
                .recommendation.priority-high { border-left-color: #ef4444; }
                [dir="rtl"] .recommendation:hover { transform: translateX(-4px); }
                .rec-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
                .rec-icon { font-size: 1.2rem; }
                .rec-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary, #0f172a); }
                .rec-timing { font-size: 0.6rem; padding: 0.15rem 0.5rem; border-radius: 20px; font-weight: 600; }
                .rec-timing.timing-today { background: rgba(245,158,11,0.15); color: #f59e0b; }
                .rec-timing.timing-tomorrow { background: rgba(59,130,246,0.15); color: #3b82f6; }
                .rec-advice { font-size: 0.8rem; margin: 0.5rem 0; color: var(--text-primary, #0f172a); font-weight: 500; }
                .rec-action { font-size: 0.75rem; margin: 0.25rem 0; color: var(--text-secondary, #64748b); }
                .rec-details { margin: 0.5rem 0 0 0; padding-left: 1rem; font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); }
                [dir="rtl"] .rec-details { padding-left: 0; padding-right: 1rem; }
                .analytics-footer { text-align: center; padding-top: 1rem; border-top: 1px solid var(--border-light, #e2e8f0); }
                .dark-mode .analytics-footer { border-top-color: #334155; }
                .analytics-footer small { font-size: 0.65rem; color: var(--text-tertiary, #94a3b8); }
                .analytics-loading, .analytics-error { text-align: center; padding: 2rem; }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #ef4444; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .retry-btn { margin-top: 1rem; padding: 0.5rem 1.25rem; background: linear-gradient(135deg, #ef4444, #f59e0b); color: white; border: none; border-radius: 12px; cursor: pointer; }
                @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } .analytics-stats-grid { gap: 0.5rem; } .stat-icon { width: 40px; height: 40px; font-size: 1.4rem; } .stat-value { font-size: 1.2rem; } }
                @media (prefers-reduced-motion: reduce) { .refresh-btn:hover, .analytics-stat-card:hover, .recommendation:hover { transform: none; } .progress-bar-fill { transition: none; } .spinner { animation: none; } }
            `}</style>
        </div>
    );
};

export default NutritionAnalytics;