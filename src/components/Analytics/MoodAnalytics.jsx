// src/components/Analytics/MoodAnalytics.jsx - النسخة المتكاملة مع الـ API
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// ==================== دوال مساعدة محسنة ====================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const getMoodScore = (mood) => {
    const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1, 'Depressed': 0 };
    return map[mood] ?? 3;
};

const getMoodEmoji = (mood) => {
    const map = {
        'Excellent': '😊', 'Good': '🙂', 'Neutral': '😐',
        'Stressed': '😫', 'Anxious': '😰', 'Sad': '😢', 'Depressed': '😔'
    };
    return map[mood] ?? '😐';
};

const getMoodText = (mood, isArabic) => {
    const mapAr = {
        'Excellent': 'ممتاز', 'Good': 'جيد', 'Neutral': 'محايد',
        'Stressed': 'مرهق', 'Anxious': 'قلق', 'Sad': 'حزين', 'Depressed': 'مكتئب'
    };
    const mapEn = {
        'Excellent': 'Excellent', 'Good': 'Good', 'Neutral': 'Neutral',
        'Stressed': 'Stressed', 'Anxious': 'Anxious', 'Sad': 'Sad', 'Depressed': 'Depressed'
    };
    return (isArabic ? mapAr[mood] : mapEn[mood]) ?? mood;
};

// ==================== المكون الرئيسي ====================

const MoodAnalytics = ({ refreshTrigger }) => {
    const [lang, setLang] = useState(() => localStorage.getItem('app_lang') === 'en' ? 'en' : 'ar');
    const isArabic = lang === 'ar';
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('livocare_darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches);
    const isMountedRef = useRef(true);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeInsight, setActiveInsight] = useState(null);
    const [useBackendData, setUseBackendData] = useState(false);
    const [backendInsights, setBackendInsights] = useState(null);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                fetchAllData();
            }
        };
        window.addEventListener('languageChange', handleLanguageChange);
        return () => window.removeEventListener('languageChange', handleLanguageChange);
    }, [lang]);

    // ✅ الاستماع لتغييرات الثيم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true';
        setDarkMode(savedDarkMode);
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ==================== دوال تحليلية متقدمة (Fallback محلي) ====================
    
    const analyzeDayPatterns = (moodRecords) => {
        if (moodRecords.length < 7) return null;
        const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        moodRecords.forEach(record => dayScores[record.date.getDay()].push(record.score));
        const dayNames = isArabic ? {0:'الأحد',1:'الإثنين',2:'الثلاثاء',3:'الأربعاء',4:'الخميس',5:'الجمعة',6:'السبت'} : {0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
        let bestDay = null, worstDay = null, bestScore = 0, worstScore = 5;
        Object.entries(dayScores).forEach(([day, scores]) => {
            if (scores.length >= 2) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                if (avg > bestScore) { bestScore = avg; bestDay = dayNames[parseInt(day)]; }
                if (avg < worstScore) { worstScore = avg; worstDay = dayNames[parseInt(day)]; }
            }
        });
        return bestDay && worstDay ? { bestDay, worstDay, bestScore: roundNumber(bestScore,1), worstScore: roundNumber(worstScore,1) } : null;
    };

    const analyzeTrend = (moodRecords) => {
        if (moodRecords.length < 7) return null;
        const recent = moodRecords.slice(-7).map(r => r.score);
        const older = moodRecords.slice(-14, -7).map(r => r.score);
        if (older.length === 0) return null;
        const recentAvg = recent.reduce((a,b) => a+b,0) / recent.length;
        const olderAvg = older.reduce((a,b) => a+b,0) / older.length;
        const diff = recentAvg - olderAvg;
        if (Math.abs(diff) > 0.2) {
            return { isImproving: diff > 0, change: roundNumber(diff,1), percentage: Math.abs(Math.round((diff/olderAvg)*100)) };
        }
        return null;
    };

    const detectMoodDecline = (moodRecords) => {
        if (moodRecords.length < 3) return null;
        const lowMoods = ['Stressed', 'Anxious', 'Sad', 'Depressed'];
        let consecutiveLow = 0;
        for (let i = moodRecords.length - 1; i >= 0; i--) {
            if (lowMoods.includes(moodRecords[i].raw)) consecutiveLow++;
            else break;
        }
        if (consecutiveLow >= 3) {
            return { days: consecutiveLow, severity: consecutiveLow >= 5 ? 'high' : consecutiveLow >= 3 ? 'medium' : 'low' };
        }
        return null;
    };

    const predictMood = (moodRecords) => {
        if (moodRecords.length < 7) return null;
        const recentScores = moodRecords.slice(-7).map(r => r.score);
        const avgRecent = recentScores.reduce((a,b) => a+b,0) / recentScores.length;
        const trend = moodRecords.slice(-3).reduce((a,b) => a + b.score, 0) - moodRecords.slice(-6,-3).reduce((a,b) => a + b.score, 0);
        let predictedScore = avgRecent;
        if (trend > 0.5) predictedScore = Math.min(5, avgRecent + 0.3);
        else if (trend < -0.5) predictedScore = Math.max(1, avgRecent - 0.3);
        const moodLevels = isArabic ? ['سيء', 'متوسط', 'جيد', 'جيد جداً', 'ممتاز'] : ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        const levelIndex = Math.min(4, Math.max(0, Math.floor(predictedScore) - 1));
        return { score: roundNumber(predictedScore,1), level: moodLevels[levelIndex], trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable' };
    };

    const calculateMoodStats = (moodRecords) => {
        const scores = moodRecords.map(r => r.score);
        const avgScore = scores.reduce((a,b) => a+b,0) / scores.length;
        const moodFrequency = {};
        moodRecords.forEach(r => { moodFrequency[r.raw] = (moodFrequency[r.raw] || 0) + 1; });
        let mostFrequentMood = 'Neutral', maxCount = 0;
        for (const [mood, count] of Object.entries(moodFrequency)) {
            if (count > maxCount) { maxCount = count; mostFrequentMood = mood; }
        }
        return { avgScore: roundNumber(avgScore,1), mostFrequentMood, totalDays: moodRecords.length };
    };

    const getMoodDistribution = (moodRecords) => {
        const dist = { Excellent:0, Good:0, Neutral:0, Stressed:0, Anxious:0, Sad:0, Depressed:0 };
        moodRecords.forEach(r => { if (dist[r.raw] !== undefined) dist[r.raw]++; });
        return dist;
    };

    // ==================== جلب البيانات من API ====================
    
    const fetchAllData = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        
        try {
            // ✅ جلب التحليلات من Backend (رؤى المشاعر)
            const sentimentResponse = await axiosInstance.get('/sentiment/mood-insights/?lang=' + (isArabic ? 'ar' : 'en')).catch(() => ({ data: null }));
            
            // جلب البيانات الخام للـ Fallback
            const [moodRes, sleepRes, activitiesRes] = await Promise.all([
                axiosInstance.get('/mood-logs/').catch(() => ({ data: [] })),
                axiosInstance.get('/sleep/').catch(() => ({ data: [] })),
                axiosInstance.get('/activities/').catch(() => ({ data: [] }))
            ]);
            
            if (!isMountedRef.current) return;
            
            // معالجة البيانات الخام
            const moodDataRaw = moodRes.data?.results || (Array.isArray(moodRes.data) ? moodRes.data : []);
            const sleepDataRaw = sleepRes.data?.results || (Array.isArray(sleepRes.data) ? sleepRes.data : []);
            const activitiesDataRaw = activitiesRes.data?.results || (Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
            
            const moodRecords = moodDataRaw.map(m => ({
                date: new Date(m.entry_time || m.date),
                score: getMoodScore(m.mood),
                raw: m.mood,
                factors: m.factors || '',
                notes: m.text_entry || ''
            })).sort((a, b) => a.date - b.date);
            
            if (moodRecords.length === 0) {
                setAnalysis({ hasData: false, message: isArabic ? 'لا توجد بيانات كافية للتحليل. قم بتسجيل مزاجك أولاً!' : 'Insufficient data. Log your mood first!' });
                setLoading(false);
                return;
            }
            
            // ✅ استخدام بيانات Backend إذا كانت متوفرة
            let backendData = null;
            if (sentimentResponse.data?.success && sentimentResponse.data?.data?.has_data) {
                backendData = sentimentResponse.data.data;
                setUseBackendData(true);
                setBackendInsights(backendData);
                console.log('✅ Using backend sentiment insights:', backendData);
            } else {
                setUseBackendData(false);
                console.log('⚠️ Backend insights not available, using local calculations');
            }
            
            // الحسابات المحلية (Fallback)
            const localTrend = analyzeTrend(moodRecords);
            const localDayPattern = analyzeDayPatterns(moodRecords);
            const localDecline = detectMoodDecline(moodRecords);
            const localPrediction = predictMood(moodRecords);
            const stats = calculateMoodStats(moodRecords);
            const distribution = getMoodDistribution(moodRecords);
            
            // ✅ دمج بيانات Backend مع الحسابات المحلية
            const trend = backendData?.trend_analysis ? {
                isImproving: backendData.trend_analysis.trend === 'improving',
                change: backendData.trend_analysis.change || 0,
                percentage: Math.abs(backendData.trend_analysis.change || 0),
                message: backendData.trend_analysis.message
            } : localTrend;
            
            const declineAlert = backendData?.overall_sentiment?.negative > backendData?.overall_sentiment?.positive * 2 ? 
                { days: 5, severity: 'high', message: backendData.trend_analysis?.message } : localDecline;
            
            const moodPrediction = backendData?.trend_analysis?.trend === 'improving' ? 
                { score: Math.min(5, stats.avgScore + 0.3), level: stats.avgScore >= 4 ? 'ممتاز' : 'جيد', trend: 'up' } : localPrediction;
            
            // ✅ توليد توصيات من Backend إذا كانت متوفرة
            let recommendations = [];
            if (backendData?.overall_sentiment) {
                const overall = backendData.overall_sentiment;
                if (overall.negative > overall.positive && overall.negative > overall.neutral) {
                    recommendations.push({
                        icon: '💙', priority: 'high',
                        title: isArabic ? 'دعم الصحة النفسية' : 'Mental Health Support',
                        advice: isArabic ? 'هناك تركيز للمشاعر السلبية في سجلاتك. تواصل مع شخص تثق به أو جرب التأمل.' : 'There is a focus on negative emotions in your records. Reach out to someone you trust or try meditation.',
                        tips: isArabic ? ['تحدث مع مختص نفسي', 'مارس التأمل يومياً', 'اكتب مشاعرك'] : ['Talk to a mental health professional', 'Practice daily meditation', 'Journal your feelings']
                    });
                } else if (overall.positive > overall.negative && overall.positive > overall.neutral) {
                    recommendations.push({
                        icon: '🌟', priority: 'low',
                        title: isArabic ? 'مزاج إيجابي' : 'Positive Mood',
                        advice: isArabic ? 'مزاجك إيجابي بشكل عام! استمر في العادات التي تجعلك سعيداً.' : 'Your mood is generally positive! Keep up the habits that make you happy.',
                        tips: isArabic ? ['شارك إيجابيتك مع الآخرين', 'استمر في تسجيل مشاعرك'] : ['Share your positivity with others', 'Continue tracking your feelings']
                    });
                }
            }
            
            if (trend && !trend.isImproving && recommendations.length === 0) {
                recommendations.push({
                    icon: '📉', priority: 'high',
                    title: isArabic ? 'انخفاض في المزاج' : 'Mood Decline',
                    advice: isArabic ? `لاحظنا انخفاضاً في مزاجك بنسبة ${trend.percentage}%. اهتم بصحتك النفسية.` : `We noticed a ${trend.percentage}% decline in your mood. Take care of your mental health.`,
                    tips: isArabic ? ['تحدث مع شخص تثق به', 'مارس نشاطاً تحبه', 'خذ قسطاً من الراحة'] : ['Talk to someone you trust', 'Do an activity you enjoy', 'Take a break']
                });
            }
            
            if (declineAlert && recommendations.length === 0) {
                recommendations.push({
                    icon: '⚠️', priority: 'high',
                    title: isArabic ? 'تنبيه: انخفاض مستمر' : 'Alert: Continuous Decline',
                    advice: isArabic ? `مزاجك منخفض لمدة ${declineAlert.days} أيام متتالية. نوصي بالتواصل مع مختص.` : `Your mood has been low for ${declineAlert.days} consecutive days. We recommend consulting a specialist.`,
                    tips: isArabic ? ['استشر طبيباً نفسياً', 'لا تبق وحيداً', 'مارس تمارين التنفس'] : ['Consult a psychologist', 'Don\'t stay alone', 'Practice breathing exercises']
                });
            }
            
            if (recommendations.length === 0 && stats.avgScore >= 3.5) {
                recommendations.push({
                    icon: '😊', priority: 'low',
                    title: isArabic ? 'مزاجك جيد' : 'Your mood is good',
                    advice: isArabic ? 'مزاجك مستقر وإيجابي. استمر في عاداتك الصحية!' : 'Your mood is stable and positive. Keep up your healthy habits!',
                    tips: isArabic ? ['واصل تسجيل مزاجك', 'حافظ على روتينك'] : ['Continue tracking your mood', 'Maintain your routine']
                });
            }
            
            const fullAnalysis = {
                hasData: true,
                useBackendData,
                stats,
                distribution,
                trend,
                dayPattern: localDayPattern,
                declineAlert,
                moodPrediction,
                recommendations,
                backendData
            };
            
            setAnalysis(fullAnalysis);
            setActiveInsight(declineAlert || (trend && !trend.isImproving ? trend : null));
            
        } catch (err) {
            console.error('Error in MoodAnalytics:', err);
            setError(isArabic ? 'حدث خطأ في تحليل المزاج' : 'Error analyzing mood');
        } finally {
            setLoading(false);
        }
    }, [isArabic]);

    useEffect(() => {
        fetchAllData();
        return () => { isMountedRef.current = false; };
    }, [fetchAllData, refreshTrigger]);

    if (loading) return (
        <div className={`analytics-loading ${darkMode ? 'dark-mode' : ''}`}>
            <div className="spinner"></div>
            <p>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</p>
        </div>
    );
    
    if (error) return (
        <div className={`analytics-error ${darkMode ? 'dark-mode' : ''}`}>
            <p>❌ {error}</p>
            <button onClick={fetchAllData} className="retry-btn">🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
    );

    if (!analysis?.hasData) return (
        <div className={`no-data-message ${darkMode ? 'dark-mode' : ''}`}>
            <div className="message-icon">📝</div>
            <p>{analysis?.message || (isArabic ? 'لا توجد بيانات' : 'No data')}</p>
        </div>
    );

    return (
        <div className={`analytics-container mood-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>
                    <span className="header-icon">😊</span>
                    {isArabic ? 'تحليل المزاج المتقدم' : 'Advanced Mood Analytics'}
                    {analysis.useBackendData && <span className="ai-badge">🤖 AI {isArabic ? 'متقدم' : 'Advanced'}</span>}
                </h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>🔄</button>
            </div>

            <div className="insights-container">
                {/* الإحصائيات السريعة */}
                <div className="quick-stats">
                    <div className="stat-box"><div className="stat-value">{analysis.stats.avgScore}</div><div className="stat-label">{isArabic ? 'متوسط المزاج' : 'Average Mood'}</div></div>
                    <div className="stat-box"><div className="stat-value">{analysis.stats.totalDays}</div><div className="stat-label">{isArabic ? 'أيام مسجلة' : 'Days Recorded'}</div></div>
                    <div className="stat-box"><div className="stat-value">{getMoodEmoji(analysis.stats.mostFrequentMood)} {getMoodText(analysis.stats.mostFrequentMood, isArabic)}</div><div className="stat-label">{isArabic ? 'الأكثر تكراراً' : 'Most Frequent'}</div></div>
                </div>

                {/* توزيع المزاج */}
                {Object.values(analysis.distribution).some(v => v > 0) && (
                    <div className="distribution-section">
                        <h3>{isArabic ? 'توزيع الحالة المزاجية' : 'Mood Distribution'}</h3>
                        <div className="distribution-bars">
                            {Object.entries(analysis.distribution).filter(([_, count]) => count > 0).map(([mood, count]) => (
                                <div key={mood} className="distribution-item">
                                    <span className="dist-emoji">{getMoodEmoji(mood)}</span>
                                    <span className="dist-label">{getMoodText(mood, isArabic)}</span>
                                    <div className="dist-bar"><div className="dist-fill" style={{ width: `${(count / analysis.stats.totalDays) * 100}%`, background: `hsl(${getMoodScore(mood) * 60}, 70%, 50%)` }} /></div>
                                    <span className="dist-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* تنبيه الانخفاض */}
                {analysis.declineAlert && (
                    <div className={`alert-card severity-${analysis.declineAlert.severity}`}>
                        <div className="alert-header"><span className="alert-icon">⚠️</span><span className="alert-title">{isArabic ? 'انخفاض مستمر في المزاج' : 'Continuous mood decline'}</span></div>
                        <p className="alert-message">{isArabic ? `مزاجك منخفض لمدة ${analysis.declineAlert.days} أيام متتالية` : `Your mood has been low for ${analysis.declineAlert.days} consecutive days`}</p>
                        {analysis.declineAlert.message && <p className="alert-detail">{analysis.declineAlert.message}</p>}
                    </div>
                )}

                {/* الاتجاه */}
                {analysis.trend && (
                    <div className={`trend-card ${analysis.trend.isImproving ? 'improving' : 'declining'}`}>
                        <div className="trend-header">
                            <span className="trend-icon">{analysis.trend.isImproving ? '📈' : '📉'}</span>
                            <span className="trend-title">{analysis.trend.isImproving ? (isArabic ? 'مزاجك يتحسن' : 'Your mood is improving') : (isArabic ? 'مزاجك في انخفاض' : 'Your mood is declining')}</span>
                        </div>
                        <p className="trend-message">{analysis.trend.message || (analysis.trend.isImproving ? 
                            (isArabic ? `تحسن ملحوظ بنسبة ${analysis.trend.percentage}% في الفترة الأخيرة` : `Notable improvement of ${analysis.trend.percentage}% recently`) :
                            (isArabic ? `انخفاض ملحوظ بنسبة ${analysis.trend.percentage}% في الفترة الأخيرة` : `Notable decline of ${analysis.trend.percentage}% recently`))}
                        </p>
                    </div>
                )}

                {/* التنبؤ */}
                {analysis.moodPrediction && (
                    <div className="prediction-box">
                        <span className="prediction-icon">🔮</span>
                        <span className="prediction-text">{isArabic ? 'توقع المزاج' : 'Mood prediction'}: <strong>{analysis.moodPrediction.score}/5</strong> ({analysis.moodPrediction.level})</span>
                        <span className="prediction-trend">{analysis.moodPrediction.trend === 'up' ? '📈' : analysis.moodPrediction.trend === 'down' ? '📉' : '➡️'}</span>
                    </div>
                )}

                {/* الأنماط */}
                {analysis.dayPattern && (
                    <div className="pattern-card">
                        <div className="pattern-header"><span className="pattern-icon">📅</span><span className="pattern-title">{isArabic ? 'نمط أيام الأسبوع' : 'Weekly Pattern'}</span></div>
                        <div className="pattern-content">
                            <span className="good">👍 {analysis.dayPattern.bestDay}</span>
                            <span className="separator"> | </span>
                            <span className="bad">👎 {analysis.dayPattern.worstDay}</span>
                        </div>
                    </div>
                )}

                {/* التوصيات */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="recommendations-section">
                        <h3>💡 {isArabic ? 'توصيات مخصصة' : 'Personalized Recommendations'}</h3>
                        {analysis.recommendations.map((rec, i) => (
                            <div key={i} className={`recommendation-card priority-${rec.priority}`}>
                                <div className="rec-header">
                                    <span className="rec-icon">{rec.icon}</span>
                                    <span className="rec-title">{rec.title}</span>
                                </div>
                                <p className="rec-advice">{rec.advice}</p>
                                {rec.tips && rec.tips.length > 0 && (
                                    <ul className="rec-tips">
                                        {rec.tips.map((tip, j) => <li key={j}>{tip}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .analytics-container {
                    background: var(--card-bg, #ffffff);
                    border-radius: 28px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light, #eef2f6);
                }
                .dark-mode .analytics-container {
                    background: #1e293b;
                    border-color: #334155;
                }
                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light, #eef2f6);
                }
                .analytics-header h2 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .ai-badge {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    padding: 0.2rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    color: white;
                }
                .refresh-btn {
                    background: var(--secondary-bg, #f1f5f9);
                    border: none;
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 1.2rem;
                }
                .refresh-btn:hover {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    transform: rotate(180deg);
                }
                .quick-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .stat-box {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 18px;
                    padding: 1rem;
                    text-align: center;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                .dark-mode .stat-box {
                    background: #0f172a;
                    border-color: #334155;
                }
                .stat-value {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: var(--text-primary, #0f172a);
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #94a3b8);
                }
                .distribution-section {
                    margin-bottom: 1.5rem;
                }
                .distribution-section h3 {
                    font-size: 0.9rem;
                    margin-bottom: 0.75rem;
                }
                .distribution-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .distribution-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                }
                .dist-emoji { width: 32px; }
                .dist-label { width: 70px; }
                .dist-bar { flex: 1; height: 8px; background: var(--border-light, #e2e8f0); border-radius: 4px; overflow: hidden; }
                .dist-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
                .dist-count { width: 30px; text-align: right; font-weight: 600; }
                .backend-insights {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    border-radius: 18px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    color: white;
                }
                .insight-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                .insight-item {
                    margin-bottom: 0.5rem;
                    font-size: 0.8rem;
                }
                .insight-label { opacity: 0.8; margin-right: 0.5rem; }
                .insight-value.positive { color: #10b981; }
                .insight-value.negative { color: #ef4444; }
                .insight-value.neutral { color: #f59e0b; }
                .alert-card {
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border-left: 4px solid;
                }
                .alert-card.severity-high { background: rgba(239,68,68,0.1); border-left-color: #ef4444; }
                .alert-card.severity-medium { background: rgba(245,158,11,0.1); border-left-color: #f59e0b; }
                .alert-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-weight: 700; }
                .alert-message { font-size: 0.8rem; margin: 0; }
                .alert-detail { font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.8; }
                .trend-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                .trend-card.improving { border-left: 4px solid #10b981; }
                .trend-card.declining { border-left: 4px solid #ef4444; }
                .trend-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-weight: 700; }
                .trend-message { font-size: 0.8rem; margin: 0; }
                .prediction-box {
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .pattern-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 14px;
                    padding: 0.75rem;
                    margin-bottom: 1rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                .pattern-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-weight: 700; font-size: 0.8rem; }
                .pattern-content { font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; }
                .recommendations-section { margin-top: 1rem; }
                .recommendations-section h3 { font-size: 0.9rem; margin-bottom: 0.75rem; }
                .recommendation-card {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    border-left: 4px solid;
                }
                .recommendation-card.priority-high { border-left-color: #ef4444; }
                .recommendation-card.priority-medium { border-left-color: #f59e0b; }
                .recommendation-card.priority-low { border-left-color: #10b981; }
                .rec-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
                .rec-icon { font-size: 1.2rem; }
                .rec-title { font-weight: 700; font-size: 0.85rem; }
                .rec-advice { font-size: 0.75rem; margin-bottom: 0.5rem; color: var(--text-secondary, #64748b); }
                .rec-tips { margin: 0; padding-left: 1.5rem; font-size: 0.7rem; }
                .no-data-message { text-align: center; padding: 2rem; background: var(--secondary-bg, #f8fafc); border-radius: 20px; }
                .message-icon { font-size: 3rem; opacity: 0.5; margin-bottom: 0.5rem; }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light, #e2e8f0); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 768px) {
                    .analytics-container { padding: 1rem; }
                    .quick-stats { gap: 0.5rem; }
                    .stat-value { font-size: 1.2rem; }
                    .distribution-item { font-size: 0.7rem; gap: 0.25rem; }
                    .dist-label { width: 60px; }
                }
       
/* ===========================================
   MoodAnalytics.css - الأنماط الداخلية فقط
   ✅ تحليل المزاج - ألوان وأشكال مميزة
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.mood-analytics {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.mood-analytics.dark-mode {
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
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .analytics-header h2 {
    background: linear-gradient(135deg, #fbbf24, #f87171);
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
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
    transform: rotate(180deg);
}

/* ===== الإحصائيات السريعة ===== */
.quick-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-box {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
    border-radius: 20px;
    padding: 1rem;
    text-align: center;
    border: 1px solid rgba(245, 158, 11, 0.2);
    transition: all 0.2s;
}

.dark-mode .stat-box {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05));
    border-color: rgba(245, 158, 11, 0.15);
}

.stat-box:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15);
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
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
    margin-top: 0.25rem;
}

/* ===== التنبؤ ===== */
.prediction-box {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 20px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: white;
}

.dark-mode .prediction-box {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
}

.prediction-icon {
    font-size: 1.5rem;
}

.prediction-text {
    font-size: 0.95rem;
    font-weight: 500;
}

.prediction-text strong {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0 0.25rem;
}

.prediction-trend {
    font-size: 1.2rem;
    margin-left: 0.5rem;
}

/* ===== بطاقة التنبيه ===== */
.alert-card {
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid;
}

.alert-card.high {
    background: rgba(239, 68, 68, 0.1);
    border-left-color: #ef4444;
}

.alert-card.medium {
    background: rgba(245, 158, 11, 0.1);
    border-left-color: #f59e0b;
}

.dark-mode .alert-card.high {
    background: rgba(239, 68, 68, 0.15);
}

.dark-mode .alert-card.medium {
    background: rgba(245, 158, 11, 0.15);
}

[dir="rtl"] .alert-card {
    border-left: none;
    border-right: 4px solid;
}

.alert-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.alert-icon {
    font-size: 1.3rem;
}

.alert-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .alert-title {
    color: #f1f5f9;
}

.alert-message {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

/* ===== بطاقة الاتجاه ===== */
.trend-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .trend-card {
    background: #0f172a;
    border-color: #334155;
}

.trend-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.trend-icon {
    font-size: 1.3rem;
}

.trend-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .trend-title {
    color: #f1f5f9;
}

.trend-message {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

/* ===== بطاقات الأنماط ===== */
.pattern-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .pattern-card {
    background: #0f172a;
    border-color: #334155;
}

.pattern-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.pattern-icon {
    font-size: 1.3rem;
}

.pattern-title {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .pattern-title {
    color: #f1f5f9;
}

.pattern-content {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

.pattern-content .good {
    color: #10b981;
    font-weight: 600;
}

.pattern-content .bad {
    color: #ef4444;
    font-weight: 600;
}

.pattern-content .separator {
    color: var(--text-tertiary, #94a3b8);
    margin: 0 0.5rem;
}

/* ===== بطاقات التأثير ===== */
.impact-card {
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .impact-card {
    background: linear-gradient(135deg, #059669, #0d9488);
}

.impact-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.impact-icon {
    font-size: 1.3rem;
}

.impact-title {
    font-weight: 700;
    opacity: 0.9;
}

.impact-message {
    font-size: 0.85rem;
    margin: 0;
    opacity: 0.85;
}

/* ===== التوصيات ===== */
.recommendations-section {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-top: 0.5rem;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .recommendations-section h3 {
    color: #f1f5f9;
}

.recommendation-card {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    transition: all 0.2s;
    border-left: 3px solid #f59e0b;
}

.dark-mode .recommendation-card {
    background: #1e293b;
}

.recommendation-card:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .recommendation-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[dir="rtl"] .recommendation-card {
    border-left: none;
    border-right: 3px solid #f59e0b;
}

[dir="rtl"] .recommendation-card:hover {
    transform: translateX(-4px);
}

.rec-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
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

.rec-advice {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin: 0 0 0.5rem 0;
}

.rec-tips {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .rec-tips {
    padding-left: 0;
    padding-right: 1.25rem;
}

.rec-tips li {
    margin-bottom: 0.25rem;
}

/* ===== حالة عدم وجود بيانات ===== */
.no-data-message {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .no-data-message {
    background: #0f172a;
    border-color: #334155;
}

.message-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.no-data-message p {
    color: var(--text-primary, #0f172a);
    margin-bottom: 1.5rem;
}

.start-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--card-bg, #ffffff);
    border-radius: 14px;
    margin-top: 0.75rem;
    text-align: left;
}

.dark-mode .start-tip {
    background: #1e293b;
}

.start-tip span:first-child {
    font-size: 1.2rem;
}

.start-tip strong {
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
    display: block;
    margin-bottom: 0.25rem;
}

.start-tip p {
    font-size: 0.75rem;
    margin: 0;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .start-tip {
    text-align: right;
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
    border-top-color: #f59e0b;
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
    background: linear-gradient(135deg, #f59e0b, #ef4444);
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
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* ===== حاوية التحليلات ===== */
.insights-container {
    display: flex;
    flex-direction: column;
}

/* ===== دعم RTL ===== */
[dir="rtl"] .rec-tips {
    padding-right: 1.25rem;
}

[dir="rtl"] .prediction-trend {
    margin-left: 0;
    margin-right: 0.5rem;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .stat-box:hover,
    .recommendation-card:hover {
        transform: none;
    }
    
    .spinner {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .stat-box,
    .trend-card,
    .pattern-card,
    .recommendation-card {
        border-width: 2px;
    }
    
    .alert-card {
        border-left-width: 6px;
    }
    
    [dir="rtl"] .alert-card {
        border-right-width: 6px;
    }
}
            `}</style>

        </div>
    );
};

export default MoodAnalytics;