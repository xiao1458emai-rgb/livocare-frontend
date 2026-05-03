// src/components/SmartFeatures/SmartDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../services/api';
import WeatherWidget from './WeatherWidget';
import SmartAnalysis from '../Analytics/smartanalysis';
import '../../index.css';

const SmartDashboard = () => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [comprehensiveData, setComprehensiveData] = useState(null);
    const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [healthScore, setHealthScore] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');
    const [serverRecommendations, setServerRecommendations] = useState([]);
    const [correlations, setCorrelations] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [trends, setTrends] = useState(null);
    const [anomalies, setAnomalies] = useState(null);
    const [clusters, setClusters] = useState(null);
    const [showAdvancedInsights, setShowAdvancedInsights] = useState(true);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                fetchAllData();
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ===========================================
    // 🎯 جلب جميع البيانات من الـ APIs الجديدة
    // ===========================================
    
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const currentLang = isArabic ? 'ar' : 'en';
            
            // ✅ استخدام الـ endpoints الجديدة
            const [comprehensiveRes, advancedRes, predictionsRes] = await Promise.all([
                axiosInstance.get('/analytics/comprehensive/api/', {
                    params: { lang: currentLang }
                }),
                axiosInstance.get('/analytics/advanced/', {
                    params: { lang: currentLang }
                }),
                axiosInstance.get('/analytics/predictions/', {
                    params: { lang: currentLang }
                })
            ]);
            
            // 1. معالجة البيانات الشاملة
            if (comprehensiveRes.data?.success && comprehensiveRes.data.data) {
                const data = comprehensiveRes.data.data;
                setComprehensiveData(data);
                
                // حساب درجة الصحة من البيانات
                const score = calculateHealthScoreFromData(data);
                setHealthScore(score);
                
                // استخراج التوصيات من السيرفر
                if (data.personalized_recommendations && data.personalized_recommendations.length > 0) {
                    setServerRecommendations(data.personalized_recommendations);
                }
                
                // استخراج الارتباطات (إذا وجدت)
                if (data.correlations && data.correlations.length > 0) {
                    setCorrelations(data.correlations);
                } else if (data.patterns_correlations?.correlations) {
                    const corrs = [];
                    const corrValues = data.patterns_correlations.correlations;
                    
                    if (corrValues.sleep_mood && Math.abs(corrValues.sleep_mood) > 0.2) {
                        corrs.push({
                            type: 'sleep_mood',
                            icon: '😊 ↔️ 😴',
                            title: isArabic ? 'النوم والمزاج' : 'Sleep & Mood',
                            strength: Math.abs(corrValues.sleep_mood),
                            strengthText: getStrengthText(Math.abs(corrValues.sleep_mood), isArabic),
                            insight: corrValues.sleep_mood > 0 ? 
                                (isArabic ? 'النوم الجيد يحسن المزاج' : 'Good sleep improves mood') :
                                (isArabic ? 'قلة النوم تؤثر سلباً على المزاج' : 'Lack of sleep negatively affects mood')
                        });
                    }
                    
                    if (corrValues.activity_mood && Math.abs(corrValues.activity_mood) > 0.2) {
                        corrs.push({
                            type: 'activity_mood',
                            icon: '🏃 ↔️ 😊',
                            title: isArabic ? 'النشاط والمزاج' : 'Activity & Mood',
                            strength: Math.abs(corrValues.activity_mood),
                            strengthText: getStrengthText(Math.abs(corrValues.activity_mood), isArabic),
                            insight: corrValues.activity_mood > 0 ?
                                (isArabic ? 'التمارين الرياضية تحسن المزاج' : 'Exercise improves mood') :
                                (isArabic ? 'قلة النشاط تؤثر على المزاج' : 'Low activity affects mood')
                        });
                    }
                    
                    setCorrelations(corrs);
                }
            }
            
            // 2. معالجة التحليلات المتقدمة (ML)
            if (advancedRes.data?.success && advancedRes.data.data) {
                const advanced = advancedRes.data.data;
                setAdvancedAnalytics(advanced);
                
                // استخراج الاتجاهات
                if (advanced.trends) {
                    setTrends(advanced.trends);
                }
                
                // استخراج الأنماط الشاذة
                if (advanced.anomalies) {
                    setAnomalies(advanced.anomalies);
                }
                
                // استخراج مجموعات الأيام
                if (advanced.clusters) {
                    setClusters(advanced.clusters);
                }
            }
            
            // 3. معالجة التوقعات
            if (predictionsRes.data?.success && predictionsRes.data.predictions) {
                setPredictions(predictionsRes.data.predictions);
            } else if (advancedRes.data?.data?.weight_prediction) {
                // Fallback: استخدام توقعات الوزن من التحليل المتقدم
                const weightPred = advancedRes.data.data.weight_prediction;
                if (weightPred) {
                    setPredictions([{
                        icon: '⚖️',
                        label: isArabic ? 'الوزن المتوقع بعد أسبوعين' : 'Expected weight in 2 weeks',
                        value: `${weightPred.predicted} kg`,
                        trend: weightPred.trend === 'up' ? 'up' : weightPred.trend === 'down' ? 'down' : 'stable',
                        confidence: weightPred.confidence,
                        note: isArabic ? `التغيير المتوقع: ${Math.abs(weightPred.change)} كجم` : `Expected change: ${Math.abs(weightPred.change)} kg`
                    }]);
                }
            }
            
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            
            // بيانات تجريبية كـ Fallback
            const mockData = {
                sleep: { average_hours: 6.2 },
                mood_mental: { average_mood_score: 3.5 },
                activity: { average_daily_minutes: 25 },
                nutrition: { average_daily_calories: 2100 },
                habits: { completion_rate: 75 }
            };
            const mockScore = calculateHealthScoreFromData(mockData);
            setHealthScore(mockScore);
            
        } finally {
            setLoading(false);
        }
    }, [isArabic]);

    // ===========================================
    // 🎯 حساب درجة الصحة
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

    const calculateHealthScoreFromData = useCallback((data) => {
        let totalScore = 0;
        const factors = [];

        const sleepData = data?.sleep;
        const moodData = data?.mood_mental;
        const activityData = data?.activity;
        const nutritionData = data?.nutrition;
        const habitsData = data?.habits;

        if (sleepData && sleepData.average_hours) {
            const sleepResult = calculateSleepScore(sleepData.average_hours);
            totalScore += sleepResult.score;
            factors.push({
                name: isArabic ? 'النوم' : 'Sleep',
                icon: '🌙',
                score: sleepResult.score,
                max: 30,
                value: `${sleepData.average_hours.toFixed(1)} ${isArabic ? 'ساعات' : 'hours'}`,
                status: sleepResult.status,
                isGood: sleepResult.isGood
            });
        }

        if (moodData && moodData.average_score) {
            const moodResult = calculateMoodScore(moodData.average_score);
            totalScore += moodResult.score;
            factors.push({
                name: isArabic ? 'المزاج' : 'Mood',
                icon: '😊',
                score: moodResult.score,
                max: 20,
                value: `${moodData.average_score.toFixed(1)}/5`,
                status: moodResult.status,
                isGood: moodResult.isGood
            });
        }

        if (activityData && activityData.average_daily_minutes) {
            const weeklyMinutes = activityData.average_daily_minutes * 7;
            const activityResult = calculateActivityScore(weeklyMinutes);
            totalScore += activityResult.score;
            factors.push({
                name: isArabic ? 'النشاط' : 'Activity',
                icon: '🏃',
                score: activityResult.score,
                max: 20,
                value: `${Math.round(weeklyMinutes)} ${isArabic ? 'دقيقة/أسبوع' : 'min/week'}`,
                status: activityResult.status,
                isGood: activityResult.isGood
            });
        }

        if (nutritionData && nutritionData.average_daily_calories) {
            const nutritionResult = calculateNutritionScore(nutritionData.average_daily_calories);
            totalScore += nutritionResult.score;
            factors.push({
                name: isArabic ? 'التغذية' : 'Nutrition',
                icon: '🥗',
                score: nutritionResult.score,
                max: 15,
                value: `${Math.round(nutritionData.average_daily_calories)} ${isArabic ? 'سعرة/يوم' : 'cal/day'}`,
                status: nutritionResult.status,
                isGood: nutritionResult.isGood
            });
        }

        if (habitsData && habitsData.completion_rate) {
            const habitsResult = calculateHabitsScore(habitsData.completion_rate / 100);
            totalScore += habitsResult.score;
            factors.push({
                name: isArabic ? 'العادات' : 'Habits',
                icon: '✅',
                score: habitsResult.score,
                max: 15,
                value: `${habitsData.completion_rate}%`,
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

    const getStrengthText = (value, isArabic) => {
        if (value > 0.7) return isArabic ? 'قوية جداً' : 'Very strong';
        if (value > 0.5) return isArabic ? 'قوية' : 'Strong';
        if (value > 0.3) return isArabic ? 'متوسطة' : 'Moderate';
        return isArabic ? 'ضعيفة' : 'Weak';
    };

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // ===========================================
    // 🧩 المكونات الفرعية
    // ===========================================
    
    // ✅ دمج التوصيات (السيرفر أولاً ثم الواجهة)
    const MergedRecommendationsSection = () => {
        // دمج التوصيات من السيرفر والتوصيات من الواجهة
        const hasServerRecs = serverRecommendations.length > 0;
        
        return (
            <section className="recommendations-section">
                <h3>{isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                <div className="recommendations-timeline">
                    {/* ✅ توصيات السيرفر أولاً */}
                    {serverRecommendations.map((rec, idx) => (
                        <div key={`server-${idx}`} className={`rec-item ${rec.priority === 'high' ? 'important' : 'suggestion'}`}>
                            <div className="rec-header">
                                <span className={`rec-badge ${rec.priority === 'high' ? 'important' : 'suggestion'}`}>
                                    {rec.icon || (rec.priority === 'high' ? '⚠️' : '💡')} {rec.category || (isArabic ? 'توصية' : 'Recommendation')}
                                </span>
                            </div>
                            <h4>{rec.title}</h4>
                            <p>{rec.description || rec.message}</p>
                            {rec.advice && (
                                <div className="rec-meta">
                                    <span>💡 {rec.advice}</span>
                                </div>
                            )}
                            <div className="rec-basedon">
                                <small>{isArabic ? 'بناءً على' : 'Based on'}: {isArabic ? 'تحليل بياناتك الصحية المتقدم' : 'Advanced health data analysis'}</small>
                            </div>
                        </div>
                    ))}
                    
                    {/* ✅ توصيات الواجهة (SmartAnalysis) - تظهر كأنها استمرار للتوصيات */}
                    {showAdvancedInsights && (
                        <div className="smart-analysis-wrapper">
                            <div className="smart-analysis-header">
                                <span className="smart-badge">🧠 {isArabic ? 'تحليل أعمق' : 'Deeper Analysis'}</span>
                            </div>
                            <SmartAnalysis />
                        </div>
                    )}
                    
                    {!hasServerRecs && !showAdvancedInsights && (
                        <p className="no-data">{isArabic ? 'لا توجد توصيات متاحة حالياً' : 'No recommendations available'}</p>
                    )}
                </div>
            </section>
        );
    };
    
    // ✅ اتجاهات البيانات
    const TrendsSection = () => {
        if (!trends || (!trends.weight_trend && !trends.activity_trend)) return null;
        
        return (
            <section className="trends-section">
                <h3>{isArabic ? 'اتجاهات بياناتك' : 'Your Data Trends'}</h3>
                <div className="trends-list">
                    {trends.weight_trend && (
                        <div className="trend-item">
                            <span className="trend-icon">⚖️</span>
                            <div className="trend-content">
                                <div className="trend-title">{isArabic ? 'اتجاه الوزن' : 'Weight Trend'}</div>
                                <div className="trend-message">{trends.weight_trend.message}</div>
                                <div className={`trend-direction trend-${trends.weight_trend.trend}`}>
                                    {trends.weight_trend.trend === 'increasing' ? '📈 زيادة' : 
                                     trends.weight_trend.trend === 'decreasing' ? '📉 نقصان' : '➡️ مستقر'}
                                </div>
                            </div>
                        </div>
                    )}
                    {trends.activity_trend && (
                        <div className="trend-item">
                            <span className="trend-icon">🏃</span>
                            <div className="trend-content">
                                <div className="trend-title">{isArabic ? 'اتجاه النشاط' : 'Activity Trend'}</div>
                                <div className="trend-message">{trends.activity_trend.message}</div>
                                <div className={`trend-direction trend-${trends.activity_trend.trend}`}>
                                    {trends.activity_trend.trend === 'increasing' ? '📈 زيادة' : 
                                     trends.activity_trend.trend === 'decreasing' ? '📉 نقصان' : '➡️ مستقر'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    };


    // ✅ العلاقات
    const CorrelationsSection = () => (
        <section className="correlations-section">
            <h3>{isArabic ? 'علاقات ملحوظة في بياناتك' : 'Notable correlations in your data'}</h3>
            <div className="correlations-list">
                {correlations.length > 0 ? correlations.map((corr, idx) => (
                    <div key={idx} className="correlation-item">
                        <div className="correlation-header">
                            <span className="corr-icon">{corr.icon}</span>
                            <h4>{corr.title}</h4>
                            <span className={`strength-badge ${corr.strength > 0.5 ? 'strong' : 'medium'}`}>
                                {corr.strengthText}
                            </span>
                        </div>
                        <p className="correlation-insight">{corr.insight}</p>
                    </div>
                )) : (
                    <p className="no-data">{isArabic ? 'لا توجد علاقات كافية للتحليل' : 'Insufficient data for correlations'}</p>
                )}
            </div>
            {trends && <TrendsSection />}
            <p className="correlation-note">
                ⚠️ {isArabic 
                    ? '* هذه ملاحظات إحصائية من بياناتك الشخصية وليست تشخيصاً طبياً'
                    : '* These are statistical observations from your personal data, not medical diagnoses'}
            </p>
        </section>
    );

    // ✅ توقعات
    const PredictionsSection = () => (
        <section className="predictions-section">
            <h3>{isArabic ? 'توقعات الأداء' : 'Performance Predictions'}</h3>
            <div className="predictions-grid">
                {predictions.length > 0 ? predictions.map((pred, idx) => (
                    <div key={idx} className="pred-card">
                        <span className="pred-icon">{pred.icon}</span>
                        <div className="pred-info">
                            <span className="pred-label">{pred.label}</span>
                            <span className="pred-value">{pred.value}</span>
                            {pred.note && <span className="pred-note">{pred.note}</span>}
                        </div>
                        <span className={`pred-trend ${pred.trend}`}>
                            {pred.trend === 'up' ? '⬆️' : pred.trend === 'down' ? '⬇️' : '➡️'}
                        </span>
                        {pred.confidence && (
                            <div className="pred-confidence">
                                {isArabic ? 'دقة' : 'Confidence'}: {pred.confidence}%
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="no-data">{isArabic ? 'لا توجد توقعات متاحة' : 'No predictions available'}</p>
                )}
            </div>
            <p className="prediction-note">
                ⚠️ {isArabic 
                    ? '* هذه توقعات تقديرية تعتمد على خوارزميات الذكاء الاصطناعي (Random Forest, Linear Regression)'
                    : '* These are AI-powered estimates based on multiple ML algorithms (Random Forest, Linear Regression)'}
            </p>
        </section>
    );

    // ===========================================
    // 🎨 عرض التحميل والخطأ
    // ===========================================
    if (loading && !healthScore) {
        return (
            <div className="smart-loading">
                <div className="spinner"></div>
                <p>🧠 {isArabic ? 'جاري تحليل بياناتك باستخدام الذكاء الاصطناعي...' : 'Analyzing your data with AI...'}</p>
            </div>
        );
    }

    if (error && !healthScore) {
        return (
            <div className="smart-error">
                <p>❌ {error}</p>
                <button onClick={fetchAllData} className="retry-btn">
                    🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
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
                <button onClick={fetchAllData} className="refresh-dashboard-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
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
                </div>

                {/* العمود الأيمن - المحتوى حسب التبويب */}
                <div className="smart-column main">
                    {activeTab === 'analysis' && <CorrelationsSection />}
                    {activeTab === 'recommendations' && <MergedRecommendationsSection />}
                    {activeTab === 'predictions' && <PredictionsSection />}
                </div>
            </div>
               
            {/* ============================================
                الأنماط المصححة - متوافقة مع الثيمين
            ============================================ */}
            <style jsx>{`
                /* الحاوية الرئيسية */
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

                /* الرأس */
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
                    background: linear-gradient(135deg, #10b981, #f59e0b);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .refresh-dashboard-btn {
                    background: var(--secondary-bg, #f8fafc);
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
                    background: #0f172a;
                    border-color: #334155;
                    color: #94a3b8;
                }
                .refresh-dashboard-btn:hover {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    transform: rotate(180deg);
                    border-color: transparent;
                }

                /* التبويبات */
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
                    padding: 0.6rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: 600;
                    color: var(--text-secondary, #64748b);
                    transition: all 0.2s;
                }
                .dark-mode .analytics-tabs button {
                    color: #94a3b8;
                }
                .analytics-tabs button.active {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }
                .analytics-tabs button:hover:not(.active) {
                    background: var(--hover-bg, #f1f5f9);
                }
                .dark-mode .analytics-tabs button:hover:not(.active) {
                    background: #334155;
                }

                /* الشبكة */
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

                /* بطاقة درجة الصحة */
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
                    margin: 0 0 0.75rem 0;
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
                }
                .score-circle {
                    width: 100px;
                    height: 100px;
                }
                .circle-value {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #10b981, #f59e0b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: 800;
                    color: white;
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
                    font-weight: 500;
                    color: var(--text-secondary, #64748b);
                }
                .score-method summary {
                    cursor: pointer;
                    color: #10b981;
                    font-size: 0.8rem;
                }
                .score-factors {
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
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
                .factor-item.good { border-left-color: #10b981; }
                .factor-item.bad { border-left-color: #ef4444; }
                .factor-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.25rem;
                }
                .factor-name {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-primary, #0f172a);
                }
                .dark-mode .factor-name {
                    color: #f1f5f9;
                }
                .factor-status {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                .factor-bar {
                    height: 4px;
                    background: var(--border-light, #e2e8f0);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 0.25rem;
                }
                .dark-mode .factor-bar {
                    background: #334155;
                }
                .factor-fill {
                    height: 100%;
                    transition: width 0.3s ease;
                }
                .factor-item.good .factor-fill { background: #10b981; }
                .factor-item.bad .factor-fill { background: #ef4444; }
                .factor-footer {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                }

                /* الأقسام المشتركة */
                .correlations-section, .recommendations-section, .predictions-section {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 20px;
                    padding: 1.25rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                .dark-mode .correlations-section,
                .dark-mode .recommendations-section,
                .dark-mode .predictions-section {
                    background: #0f172a;
                    border-color: #334155;
                }
                .correlations-section h3,
                .recommendations-section h3,
                .predictions-section h3 {
                    margin: 0 0 1rem 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                .dark-mode .correlations-section h3,
                .dark-mode .recommendations-section h3,
                .dark-mode .predictions-section h3 {
                    color: #f1f5f9;
                }

                /* العلاقات */
                .correlation-item {
                    background: var(--card-bg, #ffffff);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    transition: all 0.2s;
                }
                .dark-mode .correlation-item {
                    background: #1e293b;
                }
                .correlation-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                .correlation-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                }
                .corr-icon {
                    font-size: 1.5rem;
                }
                .correlation-header h4 {
                    margin: 0;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                .dark-mode .correlation-header h4 {
                    color: #f1f5f9;
                }
                .strength-badge {
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 0.2rem 0.6rem;
                    border-radius: 12px;
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
                    font-size: 0.75rem;
                    color: var(--text-secondary, #64748b);
                    margin: 0;
                    line-height: 1.4;
                }
                .correlation-note {
                    margin-top: 0.75rem;
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #94a3b8);
                }

                /* اتجاهات البيانات */
                .trends-section {
                    margin-top: 0.75rem;
                }
                .trend-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem;
                    background: var(--card-bg, #ffffff);
                    border-radius: 14px;
                    margin-bottom: 0.75rem;
                }
                .dark-mode .trend-item {
                    background: #1e293b;
                }
                .trend-icon {
                    font-size: 1.5rem;
                }
                .trend-content {
                    flex: 1;
                }
                .trend-title {
                    font-weight: 700;
                    font-size: 0.75rem;
                    color: var(--text-primary, #0f172a);
                }
                .dark-mode .trend-title {
                    color: #f1f5f9;
                }
                .trend-message {
                    font-size: 0.7rem;
                    color: var(--text-secondary, #64748b);
                }
                .trend-direction {
                    font-size: 0.65rem;
                    font-weight: 600;
                    margin-top: 0.25rem;
                }
                .trend-direction.trend-increasing { color: #10b981; }
                .trend-direction.trend-decreasing { color: #ef4444; }
                .trend-direction.trend-stable { color: #f59e0b; }

                /* التوصيات */
                .rec-item {
                    background: var(--card-bg, #ffffff);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    transition: all 0.2s;
                    border-left: 3px solid;
                }
                .dark-mode .rec-item {
                    background: #1e293b;
                }
                .rec-item.important { border-left-color: #ef4444; }
                .rec-item.suggestion { border-left-color: #10b981; }
                .rec-item:hover {
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                [dir="rtl"] .rec-item:hover {
                    transform: translateX(-4px);
                }
                .rec-header {
                    margin-bottom: 0.5rem;
                }
                .rec-badge {
                    display: inline-block;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
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
                }
                .rec-meta {
                    font-size: 0.7rem;
                    color: #10b981;
                    margin-bottom: 0.5rem;
                }
                .rec-basedon {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light, #e2e8f0);
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                .dark-mode .rec-basedon {
                    border-top-color: #334155;
                }

                /* توقعات */
                .pred-card {
                    background: var(--card-bg, #ffffff);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .dark-mode .pred-card {
                    background: #1e293b;
                }
                .pred-icon {
                    font-size: 1.5rem;
                }
                .pred-info {
                    flex: 1;
                }
                .pred-label {
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: var(--text-tertiary, #94a3b8);
                    text-transform: uppercase;
                }
                .pred-value {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary, #0f172a);
                }
                .dark-mode .pred-value {
                    color: #f1f5f9;
                }
                .pred-note {
                    display: block;
                    font-size: 0.6rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                .pred-trend {
                    font-size: 1.2rem;
                }
                .pred-trend.up { color: #10b981; }
                .pred-trend.down { color: #ef4444; }
                .pred-trend.stable { color: #f59e0b; }
                .pred-confidence {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--text-secondary, #64748b);
                }
                .prediction-note {
                    margin-top: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(245, 158, 11, 0.08);
                    border-radius: 12px;
                    text-align: center;
                    font-size: 0.65rem;
                    color: #f59e0b;
                }

                /* دمج SmartAnalysis */
                .smart-analysis-wrapper {
                    margin-top: 1rem;
                    border-radius: 20px;
                    overflow: hidden;
                }
                .smart-analysis-header {
                    margin-bottom: 0.75rem;
                    padding: 0 0.5rem;
                }
                .smart-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: white;
                }

                /* حالات خاصة */
                .no-data {
                    text-align: center;
                    color: var(--text-tertiary, #94a3b8);
                    padding: 1rem;
                }
                .smart-loading, .smart-error {
                    text-align: center;
                    padding: 3rem;
                    background: var(--card-bg, #ffffff);
                    border-radius: 28px;
                }
                .dark-mode .smart-loading,
                .dark-mode .smart-error {
                    background: #1e293b;
                }
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid var(--border-light, #e2e8f0);
                    border-top-color: #10b981;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }
                .dark-mode .spinner {
                    border-color: #334155;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .retry-btn {
                    margin-top: 1rem;
                    padding: 0.5rem 1.25rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                /* دعم الشاشات الصغيرة */
                @media (max-width: 768px) {
                    .smart-grid {
                        grid-template-columns: 1fr;
                    }
                    .analytics-tabs button {
                        font-size: 0.7rem;
                        padding: 0.4rem 0.5rem;
                    }
                    .score-main {
                        flex-direction: column;
                        text-align: center;
                    }
                    .pred-card {
                        flex-direction: column;
                        text-align: center;
                    }
                    .trend-item {
                        flex-direction: column;
                        text-align: center;
                    }
                }

                /* دعم RTL */
                [dir="rtl"] .rec-item {
                    border-left: none;
                    border-right: 3px solid;
                }
                [dir="rtl"] .rec-item.important { border-right-color: #ef4444; }
                [dir="rtl"] .rec-item.suggestion { border-right-color: #10b981; }
                [dir="rtl"] .rec-item:hover {
                    transform: translateX(-4px);
                }
                [dir="rtl"] .factor-header {
                    flex-direction: row-reverse;
                }
                [dir="rtl"] .score-main {
                    flex-direction: row-reverse;
                }

                /* تقليل الحركة */
                @media (prefers-reduced-motion: reduce) {
                    .spinner {
                        animation: none;
                    }
                    .refresh-dashboard-btn:hover,
                    .correlation-item:hover,
                    .rec-item:hover {
                        transform: none;
                    }
                    .factor-fill {
                        transition: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default SmartDashboard;