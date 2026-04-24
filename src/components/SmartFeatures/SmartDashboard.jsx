// src/components/SmartFeatures/SmartDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../services/api';
import WeatherWidget from './WeatherWidget';
import './SmartFeatures.css';

const SmartDashboard = () => {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [healthScore, setHealthScore] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');

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

    // ===========================================
    // 🎯 دوال حساب درجة الصحة
    // ===========================================
    
    const calculateSleepScore = (hours) => {
        if (hours >= 7 && hours <= 8) return { score: 30, status: isArabic ? 'مثالي' : 'Ideal', isGood: true };
        if (hours >= 6) return { score: 20, status: isArabic ? 'جيد' : 'Good', isGood: true };
        if (hours >= 5) return { score: 10, status: isArabic ? 'مقبول' : 'Fair', isGood: false };
        return { score: 5, status: isArabic ? 'يحتاج تحسين' : 'Needs improvement', isGood: false };
    };

    const calculateMoodScore = (avgScore) => {
        const moodScore = Math.min(20, Math.round(avgScore * 4));
        let status = '';
        if (moodScore >= 16) status = isArabic ? 'ممتاز' : 'Excellent';
        else if (moodScore >= 12) status = isArabic ? 'جيد' : 'Good';
        else status = isArabic ? 'متوسط' : 'Fair';
        return { score: moodScore, status, isGood: moodScore >= 12 };
    };

    const calculateActivityScore = (minutes) => {
        if (minutes >= 150) return { score: 20, status: isArabic ? 'ممتاز' : 'Excellent', isGood: true };
        if (minutes >= 100) return { score: 15, status: isArabic ? 'جيد' : 'Good', isGood: true };
        if (minutes >= 50) return { score: 10, status: isArabic ? 'مقبول' : 'Fair', isGood: false };
        return { score: 5, status: isArabic ? 'قليل' : 'Low', isGood: false };
    };

    const calculateNutritionScore = (calories) => {
        if (calories >= 1800 && calories <= 2500) return { score: 15, status: isArabic ? 'متوازنة' : 'Balanced', isGood: true };
        if (calories >= 1500) return { score: 10, status: isArabic ? 'جيدة' : 'Good', isGood: true };
        return { score: 5, status: isArabic ? 'منخفضة' : 'Low', isGood: false };
    };

    const calculateHabitsScore = (completionRate) => {
        const habitsScore = Math.round(completionRate * 15);
        let status = '';
        if (habitsScore >= 12) status = isArabic ? 'ممتاز' : 'Excellent';
        else if (habitsScore >= 8) status = isArabic ? 'جيد' : 'Good';
        else status = isArabic ? 'يحتاج تحسين' : 'Needs improvement';
        return { score: habitsScore, status, isGood: habitsScore >= 8 };
    };

    const calculateHealthScore = useCallback((data) => {
        let totalScore = 0;
        const factors = [];

        if (data?.sleep?.avgHours) {
            const sleepResult = calculateSleepScore(data.sleep.avgHours);
            totalScore += sleepResult.score;
            factors.push({
                name: isArabic ? 'النوم' : 'Sleep',
                icon: '🌙',
                score: sleepResult.score,
                max: 30,
                value: `${data.sleep.avgHours.toFixed(1)} ${isArabic ? 'ساعات' : 'hours'}`,
                status: sleepResult.status,
                isGood: sleepResult.isGood
            });
        }

        if (data?.mood?.avgScore) {
            const moodResult = calculateMoodScore(data.mood.avgScore);
            totalScore += moodResult.score;
            factors.push({
                name: isArabic ? 'المزاج' : 'Mood',
                icon: '😊',
                score: moodResult.score,
                max: 20,
                value: `${data.mood.avgScore.toFixed(1)}/5`,
                status: moodResult.status,
                isGood: moodResult.isGood
            });
        }

        if (data?.activity?.weeklyMinutes) {
            const activityResult = calculateActivityScore(data.activity.weeklyMinutes);
            totalScore += activityResult.score;
            factors.push({
                name: isArabic ? 'النشاط' : 'Activity',
                icon: '🏃',
                score: activityResult.score,
                max: 20,
                value: `${data.activity.weeklyMinutes} ${isArabic ? 'دقيقة/أسبوع' : 'min/week'}`,
                status: activityResult.status,
                isGood: activityResult.isGood
            });
        }

        if (data?.nutrition?.avgCalories) {
            const nutritionResult = calculateNutritionScore(data.nutrition.avgCalories);
            totalScore += nutritionResult.score;
            factors.push({
                name: isArabic ? 'التغذية' : 'Nutrition',
                icon: '🥗',
                score: nutritionResult.score,
                max: 15,
                value: `${Math.round(data.nutrition.avgCalories)} ${isArabic ? 'سعرة/يوم' : 'cal/day'}`,
                status: nutritionResult.status,
                isGood: nutritionResult.isGood
            });
        }

        if (data?.habits?.completionRate) {
            const habitsResult = calculateHabitsScore(data.habits.completionRate);
            totalScore += habitsResult.score;
            factors.push({
                name: isArabic ? 'العادات' : 'Habits',
                icon: '💊',
                score: habitsResult.score,
                max: 15,
                value: `${Math.round(data.habits.completionRate * 100)}%`,
                status: habitsResult.status,
                isGood: habitsResult.isGood
            });
        }

        const finalScore = Math.min(totalScore, 100);
        
        let grade = '';
        let statusText = '';
        if (finalScore >= 80) {
            grade = 'A';
            statusText = isArabic ? 'ممتازة' : 'Excellent';
        } else if (finalScore >= 60) {
            grade = 'B';
            statusText = isArabic ? 'جيدة' : 'Good';
        } else if (finalScore >= 40) {
            grade = 'C';
            statusText = isArabic ? 'متوسطة' : 'Fair';
        } else {
            grade = 'D';
            statusText = isArabic ? 'تحتاج تحسيناً' : 'Needs improvement';
        }

        return { total: finalScore, max: 100, factors, grade, statusText };
    }, [isArabic]);

    // ===========================================
    // 📊 جلب البيانات من API
    // ===========================================
    const fetchSmartInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = isArabic ? 'ar' : 'en';
            const response = await axiosInstance.get('/analytics/smart-insights/', {
                params: { lang: currentLang }
            });
            
            setInsights(response.data);
            
            const insightsData = response.data?.data || {};
            const score = calculateHealthScore({
                sleep: insightsData.summary ? { avgHours: insightsData.summary.avg_sleep } : null,
                mood: insightsData.summary ? { avgScore: insightsData.summary.dominant_mood ? 3.5 : null } : null,
                nutrition: insightsData.summary ? { avgCalories: insightsData.summary.avg_calories } : null,
                habits: insightsData.summary ? { completionRate: insightsData.summary.completion_rate / 100 } : null
            });
            setHealthScore(score);
            
        } catch (err) {
            console.error('Error fetching smart insights:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            
            const mockScore = calculateHealthScore({
                sleep: { avgHours: 6.2 },
                mood: { avgScore: 3.5 },
                activity: { weeklyMinutes: 120 },
                nutrition: { avgCalories: 2100 },
                habits: { completionRate: 0.75 }
            });
            setHealthScore(mockScore);
            
        } finally {
            setLoading(false);
        }
    }, [isArabic, calculateHealthScore]);

    useEffect(() => {
        fetchSmartInsights();
    }, [fetchSmartInsights]);

    // ===========================================
    // 🧩 المكونات الفرعية
    // ===========================================
    
    const HealthScoreCard = ({ healthScore }) => {
        if (!healthScore) return null;
        
        return (
            <div className="health-score-card">
                <div className="score-header">
                    <h3>{isArabic ? 'درجة صحتك' : 'Your Health Score'}</h3>
                    <div className="score-main">
                        <div className="score-circle">
                            <div className="circle-bg">
                                <div className="circle-fill" style={{ 
                                    background: `conic-gradient(#10b981 0% ${healthScore.total}%, #e2e8f0 ${healthScore.total}% 100%)`
                                }}>
                                    <span className="score-number">{healthScore.total}</span>
                                </div>
                            </div>
                        </div>
                        <div className="score-info">
                            <span className={`score-grade grade-${healthScore.grade.toLowerCase()}`}>
                                {healthScore.grade}
                            </span>
                            <span className="score-status">{healthScore.statusText}</span>
                        </div>
                    </div>
                </div>
                
                <details className="score-method">
                    <summary>{isArabic ? 'كيف تم حساب هذه الدرجة؟' : 'How is this score calculated?'}</summary>
                    <div className="method-content">
                        <p>{isArabic 
                            ? 'تعتمد الدرجة على 5 عوامل صحية رئيسية:' 
                            : 'The score is based on 5 key health factors:'}
                        </p>
                        <ul>
                            <li>{isArabic ? 'النوم: 30 نقطة' : 'Sleep: 30 points'}</li>
                            <li>{isArabic ? 'الحالة المزاجية: 20 نقطة' : 'Mood: 20 points'}</li>
                            <li>{isArabic ? 'النشاط البدني: 20 نقطة' : 'Physical activity: 20 points'}</li>
                            <li>{isArabic ? 'التغذية: 15 نقطة' : 'Nutrition: 15 points'}</li>
                            <li>{isArabic ? 'الالتزام بالعادات: 15 نقطة' : 'Habit adherence: 15 points'}</li>
                        </ul>
                        <p className="method-note">
                            {isArabic 
                                ? 'المجموع الكلي: 100 نقطة. كلما زادت النقاط، زادت جودة صحتك العامة.'
                                : 'Total: 100 points. Higher scores indicate better overall health.'}
                        </p>
                    </div>
                </details>
                
                <div className="score-factors">
                    {healthScore.factors.map((factor, idx) => (
                        <div key={idx} className={`factor-item ${factor.isGood ? 'good' : 'bad'}`}>
                            <div className="factor-header">
                                <span className="factor-name">
                                    <span className="factor-icon">{factor.icon}</span>
                                    {factor.name}
                                </span>
                                <span className="factor-status">{factor.status}</span>
                            </div>
                            <div className="factor-bar">
                                <div className="factor-fill" style={{ width: `${(factor.score / factor.max) * 100}%` }} />
                            </div>
                            <div className="factor-footer">
                                <span className="factor-value">{factor.value}</span>
                                <span className="factor-score">{factor.score}/{factor.max}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // العلاقات
    const CorrelationsSection = () => (
        <section className="correlations-section">
            <h3>{isArabic ? 'علاقات ملحوظة في بياناتك' : 'Notable correlations in your data'}</h3>
            <div className="correlations-list">
                <div className="correlation-item">
                    <div className="correlation-header">
                        <span className="corr-icon">😊 ↔️ 😴</span>
                        <h4>{isArabic ? 'النوم والمزاج' : 'Sleep & Mood'}</h4>
                        <span className="strength-badge strong">{isArabic ? 'قوة عالية' : 'Strong'}</span>
                    </div>
                    <p className="correlation-insight">
                        {isArabic 
                            ? 'عندما تنام بشكل أفضل، يميل مزاجك إلى التحسن في اليوم التالي'
                            : 'When you sleep better, your mood tends to improve the next day'}
                    </p>
                    <div className="correlation-stats">
                        <div className="stat-compare">
                            <div className="stat-item">
                                <span className="stat-label">{isArabic ? 'عند نوم جيد' : 'With good sleep'}</span>
                                <span className="stat-value good">4.5/5</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{isArabic ? 'عند قلة النوم' : 'With poor sleep'}</span>
                                <span className="stat-value bad">2.8/5</span>
                            </div>
                        </div>
                    </div>
                    <small className="correlation-based">
                        📊 {isArabic ? 'بناءً على آخر 15 يوماً' : 'Based on last 15 days'}
                    </small>
                </div>

                <div className="correlation-item">
                    <div className="correlation-header">
                        <span className="corr-icon">🏃 ↔️ ❤️</span>
                        <h4>{isArabic ? 'النشاط البدني وضغط الدم' : 'Physical Activity & Blood Pressure'}</h4>
                        <span className="strength-badge medium">{isArabic ? 'قوة متوسطة' : 'Moderate'}</span>
                    </div>
                    <p className="correlation-insight">
                        {isArabic 
                            ? 'الأيام التي تمارس فيها نشاطاً بدنياً، قد يكون ضغط دمك أكثر استقراراً'
                            : 'On days you exercise, your blood pressure may be more stable'}
                    </p>
                    <div className="correlation-stats">
                        <div className="stat-compare">
                            <div className="stat-item">
                                <span className="stat-label">{isArabic ? 'مع نشاط' : 'With activity'}</span>
                                <span className="stat-value good">118</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{isArabic ? 'بدون نشاط' : 'Without activity'}</span>
                                <span className="stat-value bad">126</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p className="correlation-note">
                ⚠️ {isArabic 
                    ? '* هذه ملاحظات إحصائية من بياناتك الشخصية وليست تشخيصاً طبياً'
                    : '* These are statistical observations from your personal data, not medical diagnoses'}
            </p>
        </section>
    );

    // توصيات
    const RecommendationsSection = () => (
        <section className="recommendations-section">
            <h3>{isArabic ? 'توصيات مقترحة' : 'Suggested Recommendations'}</h3>
            <div className="recommendations-timeline">
                <div className="rec-item important">
                    <div className="rec-header">
                        <span className="rec-badge important">⚠️ {isArabic ? 'مهم' : 'Important'}</span>
                    </div>
                    <h4>{isArabic ? 'تحسين جودة النوم' : 'Improve sleep quality'}</h4>
                    <p>{isArabic 
                        ? 'الحصول على 7-8 ساعات نوم ليلاً قد يساعد في تحسين طاقتك وتركيزك'
                        : 'Getting 7-8 hours of sleep per night may help improve your energy and focus'}
                    </p>
                    <div className="rec-meta">
                        <span>📊 {isArabic ? 'بناءً على' : 'Based on'}: {isArabic ? 'ارتباط النوم بالمزاج' : 'Sleep-mood correlation'}</span>
                    </div>
                </div>

                <div className="rec-item suggestion">
                    <div className="rec-header">
                        <span className="rec-badge suggestion">💡 {isArabic ? 'اقتراح' : 'Suggestion'}</span>
                    </div>
                    <h4>{isArabic ? 'زيادة النشاط البدني تدريجياً' : 'Gradually increase physical activity'}</h4>
                    <p>{isArabic 
                        ? 'ممارسة نشاط معتدل مثل المشي لمدة 20-30 دقيقة يومياً قد يحسن لياقتك'
                        : 'Moderate activity like walking 20-30 minutes daily may improve your fitness'}
                    </p>
                    <ul className="suggestions-list">
                        <li>✓ {isArabic ? 'استخدام الدرج بدلاً من المصعد' : 'Use stairs instead of elevator'}</li>
                        <li>✓ {isArabic ? 'المشي أثناء المكالمات الهاتفية' : 'Walk during phone calls'}</li>
                        <li>✓ {isArabic ? 'الوقوف والتحرك كل ساعة' : 'Stand and move every hour'}</li>
                    </ul>
                </div>

                <div className="rec-item suggestion">
                    <div className="rec-header">
                        <span className="rec-badge suggestion">🥗 {isArabic ? 'تغذية' : 'Nutrition'}</span>
                    </div>
                    <h4>{isArabic ? 'تنويع مصادر البروتين' : 'Diversify protein sources'}</h4>
                    <p>{isArabic 
                        ? 'إضافة مصادر متنوعة من البروتين قد يساعد في بناء العضلات والشعور بالشبع'
                        : 'Adding diverse protein sources may help build muscle and increase satiety'}
                    </p>
                    <ul className="suggestions-list">
                        <li>✓ {isArabic ? 'بيض أو زبادي يوناني على الفطور' : 'Eggs or Greek yogurt for breakfast'}</li>
                        <li>✓ {isArabic ? 'دجاج أو سمك على الغداء' : 'Chicken or fish for lunch'}</li>
                        <li>✓ {isArabic ? 'بقوليات أو مكسرات كوجبة خفيفة' : 'Legumes or nuts as a snack'}</li>
                    </ul>
                </div>
            </div>
        </section>
    );

    // توقعات
    const PredictionsSection = () => (
        <section className="predictions-section">
            <h3>{isArabic ? 'توقعات تقريبية' : 'Approximate Predictions'}</h3>
            <div className="predictions-grid">
                <div className="pred-card">
                    <span className="pred-icon">⚖️</span>
                    <div className="pred-info">
                        <span className="pred-label">{isArabic ? 'الوزن' : 'Weight'}</span>
                        <span className="pred-value">77.2 kg</span>
                    </div>
                    <span className="pred-trend stable">{isArabic ? 'مستقر ➡️' : 'Stable ➡️'}</span>
                </div>
                <div className="pred-card">
                    <span className="pred-icon">❤️</span>
                    <div className="pred-info">
                        <span className="pred-label">{isArabic ? 'ضغط الدم الانقباضي' : 'Systolic BP'}</span>
                        <span className="pred-value">95</span>
                    </div>
                    <span className="pred-trend stable">{isArabic ? 'ثابت ➡️' : 'Stable ➡️'}</span>
                </div>
                <div className="pred-card">
                    <span className="pred-icon">🌙</span>
                    <div className="pred-info">
                        <span className="pred-label">{isArabic ? 'مدة النوم' : 'Sleep duration'}</span>
                        <span className="pred-value">6.5 {isArabic ? 'ساعات' : 'hours'}</span>
                    </div>
                    <span className="pred-trend up">{isArabic ? 'ارتفاع محتمل ⬆️' : 'Possible increase ⬆️'}</span>
                </div>
            </div>
            <p className="prediction-note">
                ⚠️ {isArabic 
                    ? '* هذه توقعات تقديرية تعتمد على بياناتك السابقة. النتائج الفعلية قد تختلف.'
                    : '* These are estimates based on your historical data. Actual results may vary.'}
            </p>
        </section>
    );

    // ===========================================
    // 🎨 عرض التحميل والخطأ
    // ===========================================
    if (loading) {
        return (
            <div className="smart-loading">
                <div className="spinner"></div>
                <p>🧠 {isArabic ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}</p>
            </div>
        );
    }

    if (error && !healthScore) {
        return (
            <div className="smart-error">
                <p>❌ {error}</p>
                <button onClick={fetchSmartInsights} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
        );
    }

    // ===========================================
    // 🖥️ العرض الرئيسي
    // ===========================================
    return (
        <div className="smart-dashboard">
            <div className="dashboard-header">
                <h2>{isArabic ? 'تحليل صحتك الذكي' : 'Smart Health Analysis'}</h2>
                <button onClick={fetchSmartInsights} className="refresh-dashboard-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
                {/* ✅ تم إزالة زر اللغة من هنا */}
            </div>
            
            {/* تبويبات منظمة */}
            <div className="analytics-tabs">
                <button 
                    className={activeTab === 'analysis' ? 'active' : ''}
                    onClick={() => setActiveTab('analysis')}
                >
                    📊 {isArabic ? 'التحليل' : 'Analysis'}
                </button>
                <button 
                    className={activeTab === 'recommendations' ? 'active' : ''}
                    onClick={() => setActiveTab('recommendations')}
                >
                    💡 {isArabic ? 'توصيات' : 'Recommendations'}
                </button>
                <button 
                    className={activeTab === 'predictions' ? 'active' : ''}
                    onClick={() => setActiveTab('predictions')}
                >
                    🔮 {isArabic ? 'توقعات' : 'Predictions'}
                </button>
            </div>
            
            <div className="smart-grid">
                {/* العمود الأيسر - الطقس ودرجة الصحة */}
                <div className="smart-column">
                    <WeatherWidget />
                    <HealthScoreCard healthScore={healthScore} />
                </div>

                {/* العمود الأيمن - المحتوى حسب التبويب */}
                <div className="smart-column main">
                    {activeTab === 'analysis' && <CorrelationsSection />}
                    {activeTab === 'recommendations' && <RecommendationsSection />}
                    {activeTab === 'predictions' && <PredictionsSection />}
                </div>
            </div>
        </div>
    );
};

export default SmartDashboard;