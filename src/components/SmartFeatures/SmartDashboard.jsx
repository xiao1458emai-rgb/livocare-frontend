// src/components/SmartFeatures/SmartRecommendations.jsx - النسخة المعدلة
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';
import WeatherWidget from './WeatherWidget'; // ✅ استيراد مكون الطقس

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب الارتباط بين متغيرين (للحسابات المحلية فقط)
const calculateCorrelation = (x, y) => {
    if (x.length < 3 || y.length < 3) return 0;
    
    const n = Math.min(x.length, y.length);
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
};

const SmartRecommendations = () => {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [recommendations, setRecommendations] = useState([]);
    const [healthScore, setHealthScore] = useState(null);
    const [correlations, setCorrelations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [predictions, setPredictions] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');
    const [profile, setProfile] = useState(null);
    const [vitalSigns, setVitalSigns] = useState(null);
    const [sleepData, setSleepData] = useState(null);
    const [moodData, setMoodData] = useState(null);
    const [activityData, setActivityData] = useState(null);
    const [nutritionData, setNutritionData] = useState(null);
    const [habitsData, setHabitsData] = useState(null);
    const [executiveSummary, setExecutiveSummary] = useState(null);

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

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // ✅ الدالة الرئيسية لجلب البيانات من الـ API الجديد
    const fetchAllData = async () => {
        setLoading(true);
        try {
            // ✅ استخدام الـ endpoints الجديدة فقط (تم إزالة weatherRes)
            const [
                comprehensiveRes,
                recommendationsRes,
                summaryRes,
                healthRes,
                sleepRes,
                moodRes,
                activitiesRes
            ] = await Promise.all([
                axiosInstance.get('/analytics/comprehensive/api/?lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null })),
                axiosInstance.get('/analytics/recommendations/?limit=10&lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null })),
                axiosInstance.get('/analytics/summary/?lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null })),
                axiosInstance.get('/health_status/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] }))
            ]);

            // ✅ استخدام التحليلات الشاملة من Backend (الأولوية القصوى)
            if (comprehensiveRes.data?.success && comprehensiveRes.data.data) {
                const analytics = comprehensiveRes.data.data;
                
                // استخراج البيانات من التحليلات الشاملة
                setProfile(analytics.profile);
                setVitalSigns(analytics.vital_signs);
                setSleepData(analytics.sleep);
                setMoodData(analytics.mood_mental);
                setActivityData(analytics.activity);
                setNutritionData(analytics.nutrition);
                setHabitsData(analytics.habits);
                setExecutiveSummary(analytics.executive_summary);
                
                // ✅ درجة الصحة
                if (analytics.health_score) {
                    const healthScoreData = {
                        score: analytics.health_score.total_score || 70,
                        status: analytics.health_score.category_text || (isArabic ? 'جيدة' : 'Good'),
                        statusIcon: analytics.health_score.category === 'excellent' ? '🌟' : 
                                   analytics.health_score.category === 'good' ? '👍' : 
                                   analytics.health_score.category === 'fair' ? '📈' : '⚠️',
                        factors: Object.entries(analytics.health_score.components || {}).map(([key, value]) => ({
                            name: key,
                            points: value,
                            message: getComponentMessage(key, value, isArabic)
                        })),
                        maxScore: 100
                    };
                    setHealthScore(healthScoreData);
                }
                
                // ✅ الارتباطات
                if (analytics.patterns_correlations?.correlations) {
                    const correlationsData = [];
                    const corrValues = analytics.patterns_correlations.correlations;
                    
                    if (corrValues.sleep_mood && Math.abs(corrValues.sleep_mood) > 0.2) {
                        correlationsData.push({
                            type: 'sleep_mood',
                            icon: '😴 ↔️ 😊',
                            title: isArabic ? 'النوم والمزاج' : 'Sleep & Mood',
                            insight: analytics.patterns_correlations.insights?.[0] || 
                                (corrValues.sleep_mood > 0 ? 
                                    (isArabic ? 'النوم الجيد يحسن المزاج' : 'Good sleep improves mood') :
                                    (isArabic ? 'قلة النوم تؤثر سلباً على المزاج' : 'Lack of sleep negatively affects mood')),
                            strengthValue: corrValues.sleep_mood,
                            strengthText: getStrengthText(Math.abs(corrValues.sleep_mood), isArabic),
                            strengthPercent: Math.min(95, Math.max(5, Math.abs(corrValues.sleep_mood) * 100)),
                            sampleSize: 30
                        });
                    }
                    
                    if (corrValues.activity_mood && Math.abs(corrValues.activity_mood) > 0.2) {
                        correlationsData.push({
                            type: 'activity_mood',
                            icon: '🏃 ↔️ 😊',
                            title: isArabic ? 'النشاط والمزاج' : 'Activity & Mood',
                            insight: corrValues.activity_mood > 0 ? 
                                (isArabic ? 'التمارين الرياضية تحسن مزاجك' : 'Exercise improves your mood') :
                                (isArabic ? 'قلة النشاط قد تؤثر على مزاجك' : 'Low activity may affect your mood'),
                            strengthValue: corrValues.activity_mood,
                            strengthText: getStrengthText(Math.abs(corrValues.activity_mood), isArabic),
                            strengthPercent: Math.min(95, Math.max(5, Math.abs(corrValues.activity_mood) * 100)),
                            sampleSize: 30
                        });
                    }
                    
                    setCorrelations(correlationsData);
                }
                
                // ✅ التوصيات
                if (recommendationsRes.data?.success && recommendationsRes.data.recommendations?.length > 0) {
                    const formattedRecs = recommendationsRes.data.recommendations.map((rec, idx) => ({
                        id: `rec-${idx}`,
                        icon: rec.icon || '💡',
                        category: getCategoryName(rec.category, isArabic),
                        priority: rec.priority === 'urgent' ? 'high' : (rec.priority || 'medium'),
                        title: rec.title,
                        message: rec.description || rec.message,
                        advice: rec.quick_tip || rec.advice || rec.description,
                        actions: rec.actions || [],
                        basedOn: isArabic ? 'تحليل ذكي متقدم' : 'Advanced smart analysis'
                    }));
                    setRecommendations(formattedRecs);
                } else if (analytics.personalized_recommendations?.length > 0) {
                    // Fallback: استخدام التوصيات من التحليلات الشاملة
                    const formattedRecs = analytics.personalized_recommendations.map((rec, idx) => ({
                        id: `rec-${idx}`,
                        icon: rec.icon || '💡',
                        category: getCategoryName(rec.category, isArabic),
                        priority: rec.priority === 'urgent' ? 'high' : (rec.priority || 'medium'),
                        title: rec.title,
                        message: rec.description || rec.message,
                        advice: rec.quick_tip || rec.advice,
                        actions: rec.actions || [],
                        basedOn: isArabic ? 'تحليل ذكي متقدم' : 'Advanced smart analysis'
                    }));
                    setRecommendations(formattedRecs);
                }
                
                // ✅ التوقعات
                if (analytics.predictions?.weight) {
                    const preds = [];
                    preds.push({
                        icon: '⚖️',
                        label: isArabic ? 'الوزن المتوقع بعد أسبوع' : 'Estimated weight in 1 week',
                        value: `${analytics.predictions.weight.predictions?.[6] || analytics.predictions.weight.current} kg`,
                        trend: analytics.predictions.weight.trend === 'زيادة' ? 'up' : 
                               analytics.predictions.weight.trend === 'نقصان' ? 'down' : 'stable',
                        note: isArabic ? 'تقدير يعتمد على تحليل اتجاهات وزنك' : 'Estimate based on your weight trends',
                        confidence: analytics.predictions.weight.confidence
                    });
                    setPredictions(preds);
                }
                
            } else if (summaryRes.data?.success) {
                // ✅ استخدام الملخص السريع إذا لم تكن التحليلات الشاملة متوفرة
                const summary = summaryRes.data.summary;
                if (summary.health_score) {
                    setHealthScore({
                        score: summary.health_score.total_score || 70,
                        status: summary.health_score.category_text || (isArabic ? 'جيدة' : 'Good'),
                        statusIcon: summary.health_score.category === 'excellent' ? '🌟' : 
                                   summary.health_score.category === 'good' ? '👍' : 
                                   summary.health_score.category === 'fair' ? '📈' : '⚠️',
                        factors: [],
                        maxScore: 100
                    });
                }
                
                if (summary.top_recommendation) {
                    setRecommendations([{
                        id: 'top-rec',
                        icon: '💡',
                        category: isArabic ? 'توصية' : 'Recommendation',
                        priority: 'medium',
                        title: summary.top_recommendation.title,
                        message: summary.top_recommendation.message,
                        advice: summary.top_recommendation.advice,
                        basedOn: isArabic ? 'تحليل سريع' : 'Quick analysis'
                    }]);
                }
            }
            
            // ✅ حساب البيانات المحلية كـ Fallback أخير
            if (!comprehensiveRes.data?.success && !summaryRes.data?.success) {
                const localData = calculateLocalAnalytics({
                    health: healthRes.data || [],
                    sleep: sleepRes.data || [],
                    mood: moodRes.data || [],
                    activities: activitiesRes.data || []
                });
                
                if (localData.healthScore) setHealthScore(localData.healthScore);
                if (localData.recommendations) setRecommendations(localData.recommendations);
                if (localData.correlations) setCorrelations(localData.correlations);
            }
            
            setLastUpdate(new Date());
            setError(null);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(isArabic ? 'حدث خطأ في جلب البيانات' : 'Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    // دوال مساعدة للترجمة والتنسيق
    const getComponentMessage = (component, value, isArabic) => {
        const messages = {
            sleep: isArabic ? `جودة النوم: ${value} نقطة` : `Sleep quality: ${value} points`,
            mood: isArabic ? `الحالة المزاجية: ${value} نقطة` : `Mood: ${value} points`,
            nutrition: isArabic ? `التغذية: ${value} نقطة` : `Nutrition: ${value} points`,
            activity: isArabic ? `النشاط البدني: ${value} نقطة` : `Activity: ${value} points`,
            habits: isArabic ? `العادات: ${value} نقطة` : `Habits: ${value} points`
        };
        return messages[component] || `${component}: ${value}`;
    };

    const getStrengthText = (value, isArabic) => {
        if (value > 0.7) return isArabic ? 'قوية جداً' : 'Very strong';
        if (value > 0.5) return isArabic ? 'قوية' : 'Strong';
        if (value > 0.3) return isArabic ? 'متوسطة' : 'Moderate';
        return isArabic ? 'ضعيفة' : 'Weak';
    };

    const getCategoryName = (category, isArabic) => {
        const names = {
            weight: isArabic ? 'الوزن' : 'Weight',
            sleep: isArabic ? 'النوم' : 'Sleep',
            mood: isArabic ? 'المزاج' : 'Mood',
            nutrition: isArabic ? 'التغذية' : 'Nutrition',
            activity: isArabic ? 'النشاط' : 'Activity',
            habits: isArabic ? 'العادات' : 'Habits',
            risk: isArabic ? 'تنبيه صحي' : 'Health Alert',
            age_specific: isArabic ? 'نصائح حسب العمر' : 'Age-specific tips',
            chronic_condition: isArabic ? 'إدارة المرض' : 'Condition Management'
        };
        return names[category] || (isArabic ? 'توصية' : 'Recommendation');
    };

    // حساب التحليلات محلياً (Fallback)
    const calculateLocalAnalytics = (rawData) => {
        // تحليل النوم
        let sleepAnalysis = null;
        if (rawData.sleep && rawData.sleep.length > 0) {
            let totalHours = 0;
            let totalQuality = 0;
            let count = 0;
            rawData.sleep.forEach(sleep => {
                if (sleep.sleep_start && sleep.sleep_end) {
                    const hours = (new Date(sleep.sleep_end) - new Date(sleep.sleep_start)) / (1000 * 60 * 60);
                    if (hours > 0 && hours <= 24) {
                        totalHours += hours;
                        totalQuality += sleep.quality_rating || 3;
                        count++;
                    }
                }
            });
            if (count > 0) {
                sleepAnalysis = {
                    avgHours: roundNumber(totalHours / count, 1),
                    avgQuality: roundNumber(totalQuality / count, 1)
                };
            }
        }
        
        // تحليل المزاج
        let moodAnalysis = null;
        if (rawData.mood && rawData.mood.length > 0) {
            const moodMap = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            let totalScore = 0;
            rawData.mood.forEach(m => {
                totalScore += moodMap[m.mood] || 3;
            });
            moodAnalysis = {
                avg: roundNumber(totalScore / rawData.mood.length, 1)
            };
        }
        
        // حساب درجة الصحة
        let score = 50;
        if (sleepAnalysis) {
            if (sleepAnalysis.avgHours >= 7 && sleepAnalysis.avgHours <= 8) score += 25;
            else if (sleepAnalysis.avgHours >= 6) score += 15;
            else if (sleepAnalysis.avgHours >= 5) score += 5;
            else if (sleepAnalysis.avgHours > 0) score -= 10;
        }
        
        if (moodAnalysis) {
            if (moodAnalysis.avg >= 4) score += 20;
            else if (moodAnalysis.avg >= 3) score += 10;
        }
        
        const finalScore = Math.min(100, Math.max(0, Math.round(score)));
        let statusText = '', statusIcon = '';
        if (finalScore >= 80) { statusText = isArabic ? 'ممتازة' : 'Excellent'; statusIcon = '🌟'; }
        else if (finalScore >= 60) { statusText = isArabic ? 'جيدة' : 'Good'; statusIcon = '👍'; }
        else if (finalScore >= 40) { statusText = isArabic ? 'متوسطة' : 'Fair'; statusIcon = '📈'; }
        else { statusText = isArabic ? 'تحتاج تحسيناً' : 'Needs improvement'; statusIcon = '⚠️'; }
        
        return {
            healthScore: { score: finalScore, status: statusText, statusIcon, maxScore: 100 },
            recommendations: [],
            correlations: []
        };
    };

    // دالة لتحديث البيانات يدوياً
    const refreshData = () => {
        fetchAllData();
    };

    if (loading && !healthScore) {
        return (
            <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-container">
                    <p>❌ {error}</p>
                    <button onClick={refreshData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`smart-recommendations ${darkMode ? 'dark-mode' : ''}`}>
            <div className="recommendations-header">
                <h2>{isArabic ? 'تحليل صحتك الذكي' : 'Smart Health Analysis'}</h2>
                <button onClick={refreshData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
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

            {/* تبويب التحليل */}
            {activeTab === 'analysis' && (
                <div className="tab-content">
                    {/* درجة الصحة */}
                    {healthScore && (
                        <div className="health-score-card">
                            <div className="score-header">
                                <span className="score-icon">📊</span>
                                <span className="score-title">{isArabic ? 'درجة صحتك' : 'Your Health Score'}</span>
                                <span className="score-value">{healthScore.score}/{healthScore.maxScore}</span>
                                <span className={`score-badge score-${healthScore.score >= 70 ? 'good' : healthScore.score >= 40 ? 'fair' : 'poor'}`}>
                                    {healthScore.statusIcon} {healthScore.status}
                                </span>
                            </div>
                            <div className="score-progress">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${healthScore.score}%` }} />
                                </div>
                            </div>
                            
                            {/* الملخص التنفيذي */}
                            {executiveSummary && (
                                <div className="executive-summary">
                                    <details>
                                        <summary>{isArabic ? '📋 عرض الملخص التنفيذي' : '📋 View Executive Summary'}</summary>
                                        <div className="summary-content">
                                            <pre className="summary-text">{executiveSummary}</pre>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    )}

                    {/* العلاقات */}
                    {correlations.length > 0 && (
                        <div className="correlations-section">
                            <h3>{isArabic ? 'علاقات ملحوظة في بياناتك' : 'Notable correlations in your data'}</h3>
                            <div className="correlations-grid">
                                {correlations.map((corr, idx) => (
                                    <div key={idx} className="correlation-card">
                                        <div className="correlation-icon">{corr.icon}</div>
                                        <div className="correlation-content">
                                            <h4>{corr.title}</h4>
                                            <p className="correlation-insight">{corr.insight}</p>
                                            <div className="correlation-strength">
                                                <div className="strength-bar">
                                                    <div className="strength-fill" style={{ width: `${corr.strengthPercent}%` }} />
                                                </div>
                                                <span className="strength-value">
                                                    {isArabic ? 'قوة العلاقة' : 'Correlation strength'}: {corr.strengthText} ({corr.strengthValue})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ملخص سريع للبيانات */}
                    <div className="quick-stats-grid">
                        {sleepData && sleepData.status !== 'no_data' && (
                            <div className="stat-card">
                                <div className="stat-icon">🌙</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div>
                                    <div className="stat-value">{sleepData.average_hours || 0} {isArabic ? 'ساعات' : 'hrs'}</div>
                                    {sleepData.average_quality && (
                                        <div className="stat-sub">{isArabic ? 'الجودة' : 'Quality'}: {sleepData.average_quality}/5</div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {moodData && moodData.status !== 'no_data' && (
                            <div className="stat-card">
                                <div className="stat-icon">😊</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'متوسط المزاج' : 'Avg Mood'}</div>
                                    <div className="stat-value">{moodData.average_mood_score || 0}/5</div>
                                    <div className="stat-sub">{moodData.mood_level || ''}</div>
                                </div>
                            </div>
                        )}
                        
                        {activityData && activityData.status !== 'no_data' && (
                            <div className="stat-card">
                                <div className="stat-icon">🏃</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'النشاط اليومي' : 'Daily Activity'}</div>
                                    <div className="stat-value">{activityData.average_daily_minutes || 0} {isArabic ? 'دقيقة' : 'min'}</div>
                                    <div className="stat-sub">{activityData.activity_level || ''}</div>
                                </div>
                            </div>
                        )}
                        
                        {nutritionData && nutritionData.status !== 'no_data' && (
                            <div className="stat-card">
                                <div className="stat-icon">🍽️</div>
                                <div className="stat-info">
                                    <div className="stat-label">{isArabic ? 'السعرات اليومية' : 'Daily Calories'}</div>
                                    <div className="stat-value">{nutritionData.average_daily_calories || 0}</div>
                                    <div className="stat-sub">{isArabic ? 'سعرة' : 'cal'}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ✅ استخدام مكون WeatherWidget بدلاً من جلب البيانات مباشرة */}
                    <WeatherWidget />
                </div>
            )}

            {/* تبويب التوصيات */}
            {activeTab === 'recommendations' && (
                <div className="tab-content">
                    {recommendations.length > 0 ? (
                        <div className="recommendations-grid">
                            {recommendations.map((rec) => (
                                <div key={rec.id} className={`recommendation-card priority-${rec.priority}`}>
                                    <div className="card-header">
                                        <span className="card-icon">{rec.icon}</span>
                                        <span className="card-category">{rec.category}</span>
                                    </div>
                                    <h3 className="card-title">{rec.title}</h3>
                                    <p className="card-message">{rec.message}</p>
                                    <div className="card-advice">
                                        <strong>💡 {isArabic ? 'اقتراح' : 'Suggestion'}:</strong> {rec.advice}
                                    </div>
                                    {rec.actions && rec.actions.length > 0 && (
                                        <div className="card-actions">
                                            <strong>📋 {isArabic ? 'خطوات بسيطة' : 'Simple steps'}:</strong>
                                            <ul>
                                                {rec.actions.map((action, i) => (
                                                    <li key={i}>{action}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="card-basedon">
                                        <small>{rec.basedOn}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-recommendations">
                            <p>{isArabic ? 'لا توجد توصيات محددة حالياً' : 'No specific recommendations at this time'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توصيات مخصصة' : 'Log more data to get personalized recommendations'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* تبويب التوقعات */}
            {activeTab === 'predictions' && (
                <div className="tab-content">
                    {predictions && predictions.length > 0 ? (
                        <>
                            <div className="predictions-grid">
                                {predictions.map((pred, idx) => (
                                    <div key={idx} className="prediction-card">
                                        <div className="prediction-icon">{pred.icon}</div>
                                        <div className="prediction-content">
                                            <div className="prediction-label">{pred.label}</div>
                                            <div className="prediction-value">{pred.value}</div>
                                            <div className={`prediction-trend ${pred.trend}`}>
                                                {pred.trend === 'up' ? '🔼' : pred.trend === 'down' ? '🔽' : '➡️'}
                                            </div>
                                        </div>
                                        {pred.note && <div className="prediction-note">ℹ️ {pred.note}</div>}
                                        {pred.confidence && (
                                            <div className="prediction-confidence">
                                                {isArabic ? 'دقة التنبؤ' : 'Confidence'}: {pred.confidence}%
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="predictions-disclaimer">
                                <small>
                                    ⚠️ {isArabic 
                                        ? '* هذه توقعات تقديرية وليست تشخيصاً طبياً. تعتمد على بياناتك المسجلة وقد تختلف النتائج الفعلية.'
                                        : '* These are estimates, not medical diagnoses. Based on your logged data; actual results may vary.'}
                                </small>
                            </div>
                        </>
                    ) : (
                        <div className="no-predictions">
                            <p>{isArabic ? 'لا توجد توقعات متاحة حالياً' : 'No predictions available'}</p>
                            <p className="hint">{isArabic ? 'سجل المزيد من البيانات للحصول على توقعات' : 'Log more data to get predictions'}</p>
                        </div>
                    )}
                </div>
            )}

            {lastUpdate && (
                <div className="recommendations-footer">
                    <small>🕒 {isArabic ? 'آخر تحديث' : 'Last update'}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</small>
                </div>
            )}

            {/* الأنماط - تضاف في نهاية الملف */}
            <style jsx>{`
                /* جميع الأنماط السابقة تبقى كما هي */
                .smart-recommendations { background: var(--card-bg, #ffffff); border-radius: 28px; padding: 1.5rem; border: 1px solid var(--border-light, #eef2f6); }
                .smart-recommendations.dark-mode { background: #1e293b; border-color: #334155; }
                .recommendations-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-light, #eef2f6); }
                .recommendations-header h2 { font-size: 1.35rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #10b981, #f59e0b); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .refresh-btn { background: var(--secondary-bg, #f1f5f9); border: 1px solid var(--border-light, #e2e8f0); border-radius: 12px; padding: 0.5rem; cursor: pointer; transition: all 0.2s; color: var(--text-secondary, #64748b); }
                .refresh-btn:hover { background: linear-gradient(135deg, #10b981, #059669); color: white; transform: rotate(180deg); }
                .analytics-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.25rem; background: var(--secondary-bg, #f8fafc); border-radius: 50px; border: 1px solid var(--border-light, #e2e8f0); }
                .analytics-tabs button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1rem; background: transparent; border: none; border-radius: 40px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary, #64748b); }
                .analytics-tabs button.active { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); }
                .tab-content { animation: fadeInUp 0.3s ease; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .health-score-card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 24px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; }
                .score-header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
                .score-value { font-size: 1.5rem; font-weight: 800; margin-left: auto; }
                .score-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
                .score-badge.score-good { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .score-badge.score-fair { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                .score-badge.score-poor { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .score-progress .progress-bar { height: 8px; background: rgba(255, 255, 255, 0.2); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
                .score-progress .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 4px; transition: width 0.5s ease; }
                .executive-summary { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); }
                .executive-summary summary { cursor: pointer; font-size: 0.8rem; color: rgba(255,255,255,0.8); }
                .summary-text { white-space: pre-wrap; font-family: inherit; font-size: 0.75rem; margin: 0.75rem 0 0; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.5; }
                .correlations-section { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border-light, #e2e8f0); }
                .correlation-card { display: flex; gap: 1rem; padding: 1rem; background: var(--card-bg, #ffffff); border-radius: 16px; margin-bottom: 0.75rem; }
                .correlation-icon { font-size: 2rem; }
                .correlation-content { flex: 1; }
                .correlation-insight { font-size: 0.8rem; color: var(--text-secondary, #64748b); margin-bottom: 0.75rem; }
                .strength-bar { height: 4px; background: var(--border-light, #e2e8f0); border-radius: 2px; margin-bottom: 0.25rem; }
                .strength-fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 2px; }
                .quick-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .stat-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--secondary-bg, #f8fafc); border-radius: 16px; border: 1px solid var(--border-light, #e2e8f0); }
                .stat-icon { font-size: 2rem; }
                .stat-label { font-size: 0.7rem; color: var(--text-tertiary, #94a3b8); }
                .stat-value { font-size: 1.2rem; font-weight: 700; color: var(--text-primary, #0f172a); }
                .recommendations-grid { display: flex; flex-direction: column; gap: 1rem; }
                .recommendation-card { background: var(--secondary-bg, #f8fafc); border-radius: 20px; padding: 1.25rem; border-left: 4px solid; margin-bottom: 1rem; }
                .recommendation-card.priority-high { border-left-color: #ef4444; }
                .recommendation-card.priority-medium { border-left-color: #f59e0b; }
                .recommendation-card.priority-low { border-left-color: #10b981; }
                .card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
                .card-icon { font-size: 1.3rem; }
                .card-category { font-size: 0.7rem; padding: 0.2rem 0.6rem; background: rgba(0,0,0,0.05); border-radius: 20px; }
                .card-title { margin: 0 0 0.5rem; font-size: 0.9rem; font-weight: 700; }
                .card-message { font-size: 0.8rem; color: var(--text-secondary, #64748b); margin-bottom: 0.75rem; }
                .card-advice { background: var(--card-bg, #ffffff); padding: 0.75rem; border-radius: 12px; font-size: 0.75rem; margin-bottom: 0.75rem; }
                .card-actions ul { margin: 0.5rem 0 0 1.25rem; font-size: 0.7rem; }
                .card-basedon { font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); padding-top: 0.5rem; border-top: 1px solid var(--border-light, #e2e8f0); }
                .predictions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
                .prediction-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--secondary-bg, #f8fafc); border-radius: 16px; flex-wrap: wrap; }
                .prediction-icon { font-size: 1.8rem; }
                .prediction-content { flex: 1; }
                .prediction-label { font-size: 0.65rem; font-weight: 600; color: var(--text-tertiary, #94a3b8); text-transform: uppercase; }
                .prediction-value { font-size: 1rem; font-weight: 700; }
                .prediction-trend.up { color: #10b981; }
                .prediction-trend.down { color: #ef4444; }
                .prediction-trend.stable { color: #f59e0b; }
                .prediction-note, .prediction-confidence { width: 100%; font-size: 0.6rem; color: var(--text-tertiary, #94a3b8); padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--border-light, #e2e8f0); }
                .predictions-disclaimer { margin-top: 1rem; padding: 0.75rem; background: rgba(245, 158, 11, 0.08); border-radius: 12px; text-align: center; }
                .recommendations-footer { margin-top: 1.5rem; padding-top: 1rem; text-align: center; border-top: 1px solid var(--border-light, #e2e8f0); }
                .loading-container, .error-container { text-align: center; padding: 3rem; }
                .spinner { width: 48px; height: 48px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .retry-btn { margin-top: 1rem; padding: 0.5rem 1.25rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; cursor: pointer; }
                [dir="rtl"] .recommendation-card { border-left: 1px solid; border-right: 4px solid; }
                [dir="rtl"] .recommendation-card.priority-high { border-right-color: #ef4444; }
                [dir="rtl"] .score-header .score-value { margin-left: 0; margin-right: auto; }

/* ===========================================
   SmartRecommendations.css - الأنماط الداخلية فقط
   ✅ توصيات وتحليلات ذكية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.smart-recommendations {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
}

.smart-recommendations.dark-mode {
    background: #1e293b;
    border-color: #334155;
}

/* ===== الرأس ===== */
.recommendations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .recommendations-header {
    border-bottom-color: #334155;
}

.recommendations-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #10b981, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .recommendations-header h2 {
    background: linear-gradient(135deg, #34d399, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.refresh-btn {
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

.dark-mode .refresh-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.refresh-btn:hover {
    background: linear-gradient(135deg, #10b981, #059669);
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
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.analytics-tabs button.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ===== محتوى التبويبات ===== */
.tab-content {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== بطاقة درجة الصحة ===== */
.health-score-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .health-score-card {
    background: linear-gradient(135deg, #0f172a, #1e1b4b);
}

.score-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.score-icon {
    font-size: 1.5rem;
}

.score-title {
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
}

.score-value {
    font-size: 1.5rem;
    font-weight: 800;
    margin-left: auto;
}

.score-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.score-badge.score-good {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.score-badge.score-fair {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
}

.score-badge.score-poor {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.score-progress {
    margin-bottom: 1rem;
}

.score-progress .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
}

.score-progress .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    border-radius: 4px;
    transition: width 0.5s ease;
}

/* ===== شرح طريقة الحساب ===== */
.score-explanation {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.score-explanation details {
    cursor: pointer;
}

.score-explanation summary {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
}

.score-explanation summary:hover {
    color: white;
}

.explanation-content {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
}

.explanation-content p {
    font-size: 0.75rem;
    margin: 0 0 0.5rem 0;
}

.explanation-content ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
}

[dir="rtl"] .explanation-content ul {
    padding-left: 0;
    padding-right: 1.25rem;
}

.explanation-content li {
    font-size: 0.7rem;
    margin-bottom: 0.25rem;
}

.score-factors {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.score-factors strong {
    font-size: 0.75rem;
    display: block;
    margin-bottom: 0.5rem;
}

.factor-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    padding: 0.25rem 0;
}

.factor-points {
    font-weight: 600;
}

.factor-points.positive {
    color: #10b981;
}

.factor-points.negative {
    color: #ef4444;
}

/* ===== قسم العلاقات ===== */
.correlations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
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

.correlations-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.correlation-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .correlation-card {
    background: #1e293b;
    border-color: #475569;
}

.correlation-icon {
    font-size: 2rem;
}

.correlation-content {
    flex: 1;
}

.correlation-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .correlation-content h4 {
    color: #f1f5f9;
}

.correlation-insight {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.75rem;
    line-height: 1.4;
}

.correlation-strength {
    margin-bottom: 0.5rem;
}

.strength-bar {
    height: 4px;
    background: var(--border-light, #e2e8f0);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
}

.dark-mode .strength-bar {
    background: #334155;
}

.strength-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    border-radius: 2px;
}

.strength-value {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.correlation-meta {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== توصيات ===== */
.recommendations-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.recommendation-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    border-left: 4px solid;
    margin-bottom: 1rem;
}

.dark-mode .recommendation-card {
    background: #0f172a;
    border-color: #334155;
}

.recommendation-card.priority-high {
    border-left-color: #ef4444;
}

.recommendation-card.priority-medium {
    border-left-color: #f59e0b;
}

.recommendation-card.priority-low {
    border-left-color: #10b981;
}

[dir="rtl"] .recommendation-card {
    border-left: 1px solid;
    border-right: 4px solid;
}

[dir="rtl"] .recommendation-card.priority-high {
    border-right-color: #ef4444;
}

[dir="rtl"] .recommendation-card.priority-medium {
    border-right-color: #f59e0b;
}

[dir="rtl"] .recommendation-card.priority-low {
    border-right-color: #10b981;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.card-icon {
    font-size: 1.3rem;
}

.card-category {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 20px;
    color: var(--text-secondary, #64748b);
}

.dark-mode .card-category {
    background: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

.card-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .card-title {
    color: #f1f5f9;
}

.card-message {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.75rem;
}

.card-advice {
    background: var(--card-bg, #ffffff);
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    color: var(--text-primary, #0f172a);
    margin-bottom: 0.75rem;
}

.dark-mode .card-advice {
    background: #1e293b;
    color: #f1f5f9;
}

.card-advice strong {
    color: #10b981;
}

.card-actions {
    margin-bottom: 0.75rem;
}

.card-actions strong {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.card-actions ul {
    margin: 0.5rem 0 0 1.25rem;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .card-actions ul {
    margin: 0.5rem 1.25rem 0 0;
}

.card-actions li {
    margin-bottom: 0.25rem;
}

.card-basedon {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .card-basedon {
    border-top-color: #334155;
}

/* ===== حالات عدم وجود بيانات ===== */
.no-recommendations,
.no-predictions {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .no-recommendations,
.dark-mode .no-predictions {
    background: #0f172a;
    border-color: #334155;
}

.hint {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    margin-top: 0.5rem;
}

/* ===== توقعات ===== */
.predictions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.prediction-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 16px;
    border: 1px solid var(--border-light, #e2e8f0);
    position: relative;
    flex-wrap: wrap;
}

.dark-mode .prediction-card {
    background: #0f172a;
    border-color: #334155;
}

.prediction-icon {
    font-size: 1.8rem;
}

.prediction-content {
    flex: 1;
}

.prediction-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.prediction-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .prediction-value {
    color: #f1f5f9;
}

.prediction-trend {
    font-size: 1rem;
}

.prediction-trend.up {
    color: #10b981;
}

.prediction-trend.down {
    color: #ef4444;
}

.prediction-trend.stable {
    color: #f59e0b;
}

.prediction-note {
    width: 100%;
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .prediction-note {
    border-top-color: #334155;
}

.predictions-disclaimer {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(245, 158, 11, 0.08);
    border-radius: 12px;
    text-align: center;
    border-left: 3px solid #f59e0b;
}

[dir="rtl"] .predictions-disclaimer {
    border-left: none;
    border-right: 3px solid #f59e0b;
}

.predictions-disclaimer small {
    font-size: 0.65rem;
    color: #f59e0b;
}

/* ===== تذييل ===== */
.recommendations-footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    text-align: center;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-footer {
    border-top-color: #334155;
}

.recommendations-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== حالات التحميل والخطأ ===== */
.loading-container,
.error-container {
    text-align: center;
    padding: 3rem;
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
    font-weight: 500;
    transition: all 0.2s;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ===== دعم RTL ===== */
[dir="rtl"] .score-header .score-value {
    margin-left: 0;
    margin-right: auto;
}

[dir="rtl"] .correlation-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .prediction-card {
    flex-direction: row-reverse;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .tab-content {
        animation: none;
    }
    
    .score-progress .progress-fill {
        transition: none;
    }
    
    .refresh-btn:hover,
    .analytics-tabs button:hover,
    .retry-btn:hover {
        transform: none;
    }
}
            `}</style>
        </div>
    );
};

export default SmartRecommendations;