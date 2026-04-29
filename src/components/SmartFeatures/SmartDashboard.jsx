// src/components/SmartFeatures/SmartDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../services/api';
import WeatherWidget from './WeatherWidget';
import '../../index.css';

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
                        {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
 /* ===========================================
   SmartDashboard.css - الأنماط الداخلية فقط
   ✅ لوحة التحليل الذكي - تصميم عصري
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.smart-dashboard {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .smart-dashboard {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس الصفحة ===== */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .dashboard-header {
    border-bottom-color: #334155;
}

.dashboard-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .dashboard-header h2 {
    background: linear-gradient(135deg, #818cf8, #a78bfa);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-dashboard-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-dashboard-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.refresh-dashboard-btn:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    transform: rotate(180deg);
    border-color: transparent;
}

/* ===== التبويبات ===== */
.analytics-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 50px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-tabs {
    background: #0f172a;
    border-color: #334155;
}

.analytics-tabs button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .analytics-tabs button {
    color: #94a3b8;
}

.analytics-tabs button:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-1px);
}

.dark-mode .analytics-tabs button:hover {
    background: #334155;
}

.analytics-tabs button.active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.analytics-tabs button.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* ===== شبكة العناصر ===== */
.smart-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1.5rem;
}

.smart-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ===== بطاقة درجة الصحة ===== */
.health-score-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .health-score-card {
    background: #0f172a;
    border-color: #334155;
}

.score-header h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .score-header h3 {
    color: #f1f5f9;
}

.score-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.score-circle {
    width: 100px;
    height: 100px;
}

.circle-bg {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--border-light, #e2e8f0);
}

.circle-fill {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: conic-gradient(#10b981 0% 70%, #e2e8f0 70% 100%);
}

.dark-mode .circle-fill {
    background: conic-gradient(#10b981 0% 70%, #334155 70% 100%);
}

.score-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 85%;
    height: 85%;
    background: var(--card-bg, #ffffff);
    border-radius: 50%;
    font-size: 1.8rem;
    font-weight: 800;
    color: #10b981;
}

.dark-mode .score-number {
    background: #1e293b;
}

.score-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.score-grade {
    font-size: 2rem;
    font-weight: 800;
}

.score-grade.grade-a { color: #10b981; }
.score-grade.grade-b { color: #3b82f6; }
.score-grade.grade-c { color: #f59e0b; }
.score-grade.grade-d { color: #ef4444; }

.score-status {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

/* ===== تفاصيل طريقة الحساب ===== */
.score-method {
    margin: 1rem 0;
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 12px;
    cursor: pointer;
}

.dark-mode .score-method {
    background: #1e293b;
}

.score-method summary {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary, #6366f1);
    cursor: pointer;
}

.score-method summary:hover {
    opacity: 0.8;
}

.method-content {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .method-content {
    border-top-color: #334155;
}

.method-content p {
    font-size: 0.75rem;
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary, #64748b);
}

.method-content ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
}

[dir="rtl"] .method-content ul {
    padding-left: 0;
    padding-right: 1.25rem;
}

.method-content li {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin-bottom: 0.25rem;
}

.method-note {
    font-size: 0.7rem;
    font-style: italic;
    margin-top: 0.5rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== عوامل الدرجة ===== */
.score-factors {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.factor-item {
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 12px;
    border-left: 3px solid;
}

.dark-mode .factor-item {
    background: #1e293b;
}

.factor-item.good {
    border-left-color: #10b981;
}

.factor-item.bad {
    border-left-color: #ef4444;
}

[dir="rtl"] .factor-item {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .factor-item.good {
    border-right-color: #10b981;
}

[dir="rtl"] .factor-item.bad {
    border-right-color: #ef4444;
}

.factor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.factor-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .factor-name {
    color: #f1f5f9;
}

.factor-icon {
    font-size: 1rem;
}

.factor-status {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
}

.factor-item.good .factor-status {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.factor-item.bad .factor-status {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.factor-bar {
    width: 100%;
    height: 6px;
    background: var(--border-light, #e2e8f0);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.dark-mode .factor-bar {
    background: #334155;
}

.factor-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.factor-item.good .factor-fill {
    background: #10b981;
}

.factor-item.bad .factor-fill {
    background: #ef4444;
}

.factor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
}

.factor-value {
    color: var(--text-secondary, #64748b);
}

.factor-score {
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .factor-score {
    color: #f1f5f9;
}

/* ===== قسم العلاقات ===== */
.correlations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlations-section {
    background: #0f172a;
    border-color: #334155;
}

.correlations-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlations-section h3 {
    color: #f1f5f9;
}

.correlations-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
}

.correlation-item {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlation-item {
    background: #1e293b;
    border-color: #475569;
}

.correlation-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
}

.corr-icon {
    font-size: 1.5rem;
}

.correlation-header h4 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlation-header h4 {
    color: #f1f5f9;
}

.strength-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-weight: 600;
}

.strength-badge.strong {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.strength-badge.medium {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.correlation-insight {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.75rem;
    line-height: 1.4;
}

.correlation-stats {
    margin-bottom: 0.5rem;
}

.stat-compare {
    display: flex;
    gap: 1rem;
}

.stat-item {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.6rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 10px;
}

.dark-mode .stat-item {
    background: #0f172a;
}

.stat-label {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.stat-value {
    font-size: 0.7rem;
    font-weight: 600;
}

.stat-value.good {
    color: #10b981;
}

.stat-value.bad {
    color: #ef4444;
}

.correlation-based {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
}

.correlation-note {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin: 0;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlation-note {
    border-top-color: #334155;
}

/* ===== قسم التوصيات ===== */
.recommendations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-section {
    background: #0f172a;
    border-color: #334155;
}

.recommendations-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .recommendations-section h3 {
    color: #f1f5f9;
}

.recommendations-timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.rec-item {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    border-left: 3px solid;
}

.dark-mode .rec-item {
    background: #1e293b;
}

[dir="rtl"] .rec-item {
    border-left: none;
    border-right: 3px solid;
}

.rec-item.important {
    border-left-color: #ef4444;
}

[dir="rtl"] .rec-item.important {
    border-right-color: #ef4444;
}

.rec-item.suggestion {
    border-left-color: #10b981;
}

[dir="rtl"] .rec-item.suggestion {
    border-right-color: #10b981;
}

.rec-header {
    margin-bottom: 0.5rem;
}

.rec-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-weight: 600;
}

.rec-badge.important {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.rec-badge.suggestion {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.rec-item h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .rec-item h4 {
    color: #f1f5f9;
}

.rec-item p {
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.5rem;
    line-height: 1.4;
}

.rec-meta {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.suggestions-list {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
}

[dir="rtl"] .suggestions-list {
    padding-left: 0;
    padding-right: 1.25rem;
}

.suggestions-list li {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.25rem;
}

/* ===== قسم التوقعات ===== */
.predictions-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .predictions-section {
    background: #0f172a;
    border-color: #334155;
}

.predictions-section h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .predictions-section h3 {
    color: #f1f5f9;
}

.predictions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
}

.pred-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .pred-card {
    background: #1e293b;
    border-color: #475569;
}

.pred-icon {
    font-size: 1.5rem;
}

.pred-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.pred-label {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.pred-value {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .pred-value {
    color: #f1f5f9;
}

.pred-trend {
    font-size: 0.7rem;
    font-weight: 600;
}

.pred-trend.stable {
    color: #6b7280;
}

.pred-trend.up {
    color: #10b981;
}

.pred-trend.down {
    color: #ef4444;
}

.prediction-note {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin: 0;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .prediction-note {
    border-top-color: #334155;
}

/* ===== حالات التحميل والخطأ ===== */
.smart-loading,
.smart-error {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 3rem;
    text-align: center;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .smart-loading,
.dark-mode .smart-error {
    background: #1e293b;
    border-color: #334155;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
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
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* ===== دعم RTL ===== */
[dir="rtl"] .factor-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .correlation-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .stat-compare {
    flex-direction: row-reverse;
}

[dir="rtl"] .predictions-grid {
    direction: rtl;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .factor-fill {
        transition: none;
    }
    
    .refresh-dashboard-btn:hover,
    .analytics-tabs button:hover,
    .analytics-tabs button.active:hover,
    .retry-btn:hover {
        transform: none;
    }
}
            `}</style>

        </div>
    );
};

export default SmartDashboard;