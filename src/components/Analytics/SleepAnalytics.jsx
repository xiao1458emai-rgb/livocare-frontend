import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import './Analytics.css';

const SleepAnalytics = ({ refreshTrigger }) => {
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
    
    const [smartInsights, setSmartInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);

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

    // ✅ الاستماع لتغيير الثيم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ===========================================
    // حساب Sleep Score
    // ===========================================
    const calculateSleepScore = (avgHours, avgQuality, consistency, avgBedTime) => {
        let score = 0;
        
        if (avgHours >= 7 && avgHours <= 8) score += 40;
        else if (avgHours >= 6 && avgHours < 7) score += 30;
        else if (avgHours >= 5 && avgHours < 6) score += 20;
        else if (avgHours > 0) score += 10;
        
        score += Math.min(30, avgQuality * 6);
        
        if (consistency >= 80) score += 15;
        else if (consistency >= 60) score += 10;
        else if (consistency >= 40) score += 5;
        
        if (avgBedTime >= 22 && avgBedTime <= 23) score += 15;
        else if (avgBedTime >= 23 && avgBedTime <= 24) score += 10;
        else if (avgBedTime > 0 && avgBedTime < 4) score += 5;
        
        return Math.min(100, Math.max(0, Math.round(score)));
    };
    
    const getScoreStatus = (score) => {
        if (score >= 80) return { text: isArabic ? 'ممتاز' : 'Excellent', color: '#10b981' };
        if (score >= 60) return { text: isArabic ? 'جيد' : 'Good', color: '#3b82f6' };
        if (score >= 40) return { text: isArabic ? 'متوسط' : 'Fair', color: '#f59e0b' };
        return { text: isArabic ? 'ضعيف' : 'Poor', color: '#ef4444' };
    };
    
    const getDurationStatus = (hours) => {
        if (hours >= 7 && hours <= 9) return { text: isArabic ? 'مثالي' : 'Ideal', color: '#10b981', icon: '✅' };
        if (hours >= 6 && hours < 7) return { text: isArabic ? 'مقبول' : 'Acceptable', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'غير كافٍ' : 'Insufficient', color: '#ef4444', icon: '❌' };
    };
    
    const getQualityStatus = (quality) => {
        if (quality >= 4) return { text: isArabic ? 'ممتازة' : 'Excellent', color: '#10b981', icon: '✅' };
        if (quality >= 3) return { text: isArabic ? 'متوسطة' : 'Average', color: '#f59e0b', icon: '⚠️' };
        return { text: isArabic ? 'سيئة' : 'Poor', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // تحليل انتظام النوم
    // ===========================================
    const calculateConsistency = (sleepRecords) => {
        if (sleepRecords.length < 3) return 0;
        
        const bedTimes = sleepRecords.map(s => {
            const hour = s.start?.getHours() || 0;
            return hour + (s.start?.getMinutes() || 0) / 60;
        }).filter(h => h > 0);
        
        if (bedTimes.length < 2) return 0;
        
        const variance = stats.sampleVariance(bedTimes);
        const maxVariance = 16;
        const consistency = Math.max(0, 100 - (variance / maxVariance) * 100);
        
        return Math.round(consistency);
    };
    
    const getConsistencyStatus = (consistency) => {
        if (consistency >= 80) return { text: isArabic ? 'منتظم جداً' : 'Very Regular', color: '#10b981', icon: '✅' };
        if (consistency >= 60) return { text: isArabic ? 'منتظم' : 'Regular', color: '#3b82f6', icon: '📊' };
        return { text: isArabic ? 'غير منتظم' : 'Irregular', color: '#ef4444', icon: '❌' };
    };

    // ===========================================
    // حساب دين النوم
    // ===========================================
    const calculateSleepDebt = (sleepRecords) => {
        const OPTIMAL_HOURS = 8;
        let totalDebt = 0;
        
        sleepRecords.forEach(record => {
            if (record.hours > 0 && record.hours < OPTIMAL_HOURS) {
                totalDebt += OPTIMAL_HOURS - record.hours;
            }
        });
        
        return {
            total: Math.round(totalDebt * 10) / 10,
            severity: totalDebt > 10 ? 'high' : totalDebt > 5 ? 'medium' : totalDebt > 2 ? 'low' : 'none'
        };
    };

    // ===========================================
    // تحليل نمط النوم
    // ===========================================
    const analyzeSleepPattern = (sleepRecords) => {
        if (sleepRecords.length < 4) return null;
        
        const bedTimes = sleepRecords.map(s => s.start?.getHours() || 0).filter(h => h > 0);
        
        const avgBedTime = bedTimes.length > 0 ? math.mean(bedTimes) : 0;
        
        let patternText = '';
        if (avgBedTime >= 0 && avgBedTime <= 4) patternText = isArabic ? 'بومة ليلية' : 'Night Owl';
        else if (avgBedTime >= 21 && avgBedTime <= 23) patternText = isArabic ? 'نمط طبيعي' : 'Normal';
        else patternText = isArabic ? 'غير منتظم' : 'Irregular';
        
        const bedtimeVariance = stats.sampleVariance(bedTimes);
        const patternType = bedtimeVariance > 4 ? 'irregular' : 'regular';
        
        return {
            type: patternType,
            text: patternText,
            avgBedTime: Math.round(avgBedTime)
        };
    };

    // ===========================================
    // تحليل تأثير النوم على المزاج
    // ===========================================
    const analyzeSleepImpact = (sleepRecords, moodData, activityData) => {
        const insights = [];
        
        if (sleepRecords.length >= 3 && moodData.length >= 3) {
            const lowSleepDays = sleepRecords
                .filter(s => s.hours < 6 && s.hours > 0)
                .map(s => s.start?.toDateString());
            
            const moodAfterLowSleep = moodData.filter(m => {
                const moodDate = new Date(m.entry_time).toDateString();
                return lowSleepDays.includes(moodDate);
            });
            
            if (moodAfterLowSleep.length > 0) {
                const badMoodCount = moodAfterLowSleep.filter(m => 
                    ['Stressed', 'Anxious', 'Sad'].includes(m.mood)
                ).length;
                
                const percentage = (badMoodCount / moodAfterLowSleep.length) * 100;
                
                if (percentage > 30) {
                    insights.push({
                        type: 'mood_impact',
                        severity: percentage > 50 ? 'high' : 'medium',
                        message: isArabic 
                            ? `عندما تنام أقل من 6 ساعات، تنخفض حالتك المزاجية`
                            : `When you sleep less than 6 hours, your mood tends to be lower`,
                        recommendation: isArabic ? 'حاول النوم 7-8 ساعات لتحسين مزاجك' : 'Try to sleep 7-8 hours to improve your mood'
                    });
                }
            }
        }
        
        return insights;
    };

    // ===========================================
    // توليد توصيات ذكية
    // ===========================================
    const generateSmartRecommendations = (summary, sleepRecords, sleepDebt, pattern) => {
        const recommendations = [];
        
        if (summary.avgHours < 6 && summary.avgHours > 0) {
            recommendations.push({
                icon: '⏰',
                timing: 'tonight',
                priority: 'high',
                title: isArabic ? 'نوم غير كافٍ' : 'Insufficient Sleep',
                advice: isArabic 
                    ? `متوسط نومك ${summary.avgHours} ساعات`
                    : `Your average sleep is ${summary.avgHours} hours`,
                action: isArabic 
                    ? `حاول النوم مبكراً للحصول على 7-8 ساعات`
                    : `Try to sleep earlier to reach 7-8 hours`,
                details: [isArabic ? 'قلة النوم قد تسبب الإرهاق' : 'Lack of sleep may cause fatigue']
            });
        }
        
        if (summary.avgQuality < 3 && summary.avgQuality > 0) {
            recommendations.push({
                icon: '⭐',
                timing: 'tonight',
                priority: 'high',
                title: isArabic ? 'جودة نوم منخفضة' : 'Low Sleep Quality',
                advice: isArabic 
                    ? `جودة نومك ${summary.avgQuality}/5`
                    : `Your sleep quality is ${summary.avgQuality}/5`,
                action: isArabic 
                    ? 'جرب تجنب الشاشات والكافيين قبل النوم'
                    : 'Try avoiding screens and caffeine before bed',
                details: [isArabic ? 'النوم العميق يساعد على استعادة الطاقة' : 'Deep sleep helps restore energy']
            });
        }
        
        if (pattern && pattern.avgBedTime >= 0 && pattern.avgBedTime <= 4) {
            recommendations.push({
                icon: '🌙',
                timing: 'tonight',
                priority: 'medium',
                title: isArabic ? 'موعد نوم متأخر' : 'Late Bedtime',
                advice: isArabic 
                    ? `عادةً تنام بعد منتصف الليل`
                    : `You usually sleep after midnight`,
                action: isArabic 
                    ? 'تقديم موعد النوم تدريجياً قد يحسن جودة نومك'
                    : 'Gradually moving your bedtime earlier may improve sleep quality',
                details: [isArabic ? 'النوم المبكر يرتبط بجودة نوم أفضل' : 'Earlier sleep is linked to better sleep quality']
            });
        }
        
        if (sleepDebt.severity === 'high') {
            recommendations.push({
                icon: '💤',
                timing: 'today',
                priority: 'medium',
                title: isArabic ? 'دين نوم متراكم' : 'Sleep Debt',
                advice: isArabic 
                    ? `لديك نقص ${sleepDebt.total} ساعة نوم هذا الأسبوع`
                    : `You have a ${sleepDebt.total} hour sleep debt this week`,
                action: isArabic 
                    ? 'خذ قيلولة قصيرة لتعويض النقص'
                    : 'Take a short nap to compensate',
                details: [isArabic ? 'دين النوم قد يسبب الشعور بالتعب' : 'Sleep debt may cause fatigue']
            });
        }
        
        if (summary.recordsCount < 3) {
            recommendations.push({
                icon: '📝',
                timing: 'general',
                priority: 'low',
                title: isArabic ? 'سجل نومك' : 'Track Your Sleep',
                advice: isArabic 
                    ? 'سجل نومك يومياً للحصول على تحليلات مخصصة'
                    : 'Log your sleep daily for personalized insights',
                action: isArabic 
                    ? 'أضف سجل نوم جديد من الصفحة الرئيسية'
                    : 'Add a new sleep record from the main page',
                details: [isArabic ? 'البيانات الأكثر دقة تعطي تحليلات أفضل' : 'More data = better insights']
            });
        }
        
        return recommendations;
    };

    // ===========================================
    // الدالة الرئيسية للتحليل - معدلة مع useCallback
    // ===========================================
    const fetchAllData = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            console.log('🌙 Fetching sleep data for analytics...');
            
            const sleepRes = await axiosInstance.get('/sleep/').catch(() => ({ data: [] }));
            let sleepData = [];
            if (sleepRes.data?.results) sleepData = sleepRes.data.results;
            else if (Array.isArray(sleepRes.data)) sleepData = sleepRes.data;
            
            console.log('🌙 Sleep records found:', sleepData.length);
            
            const moodRes = await axiosInstance.get('/mood-logs/').catch(() => ({ data: [] }));
            let moodData = [];
            if (moodRes.data?.results) moodData = moodRes.data.results;
            else if (Array.isArray(moodRes.data)) moodData = moodRes.data;
            
            const activityRes = await axiosInstance.get('/activities/').catch(() => ({ data: [] }));
            let activityData = [];
            if (activityRes.data?.results) activityData = activityRes.data.results;
            else if (Array.isArray(activityRes.data)) activityData = activityRes.data;
            
            if (!isMountedRef.current) return;
            
            const sleepRecords = sleepData.map(s => {
                const startTime = s.sleep_start || s.start_time;
                const endTime = s.sleep_end || s.end_time;
                
                let hours = 0;
                if (startTime && endTime) {
                    const start = new Date(startTime);
                    const end = new Date(endTime);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                        hours = (end - start) / (1000 * 60 * 60);
                    }
                }
                
                return {
                    hours: Math.round(hours * 10) / 10,
                    quality: s.quality_rating || 3,
                    start: startTime ? new Date(startTime) : null,
                    end: endTime ? new Date(endTime) : null,
                };
            }).filter(s => s.hours > 0 && s.hours <= 24);
            
            const hasData = sleepRecords.length > 0;
            
            let avgHours = 0, avgQuality = 0, totalHours = 0;
            if (hasData) {
                avgHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0) / sleepRecords.length;
                avgQuality = sleepRecords.reduce((sum, s) => sum + s.quality, 0) / sleepRecords.length;
                totalHours = sleepRecords.reduce((sum, s) => sum + s.hours, 0);
            }
            
            const consistency = hasData ? calculateConsistency(sleepRecords) : 0;
            const pattern = hasData ? analyzeSleepPattern(sleepRecords) : null;
            const sleepDebt = hasData ? calculateSleepDebt(sleepRecords) : { total: 0, severity: 'none' };
            const sleepScore = hasData ? calculateSleepScore(avgHours, avgQuality, consistency, pattern?.avgBedTime || 0) : 0;
            const durationStatus = hasData ? getDurationStatus(avgHours) : null;
            const qualityStatus = hasData ? getQualityStatus(avgQuality) : null;
            const consistencyStatus = hasData ? getConsistencyStatus(consistency) : null;
            const scoreStatus = getScoreStatus(sleepScore);
            
            const impacts = hasData ? analyzeSleepImpact(sleepRecords, moodData, activityData) : [];
            
            const recommendations = generateSmartRecommendations(
                { avgHours, avgQuality, avgBedTime: pattern?.avgBedTime || 0, recordsCount: sleepRecords.length },
                sleepRecords,
                sleepDebt,
                pattern
            );
            
            let noDataRecommendations = [];
            if (!hasData) {
                noDataRecommendations = [{
                    icon: '🌙',
                    timing: 'general',
                    priority: 'low',
                    title: isArabic ? 'سجل نومك' : 'Record Your Sleep',
                    advice: isArabic ? 'ابدأ بتسجيل نومك للحصول على تحليلات مخصصة' : 'Start recording your sleep for personalized insights',
                    action: isArabic ? 'أضف سجل نوم جديد' : 'Add a new sleep record',
                    details: [isArabic ? 'تحليل النوم يساعدك على تحسين جودة حياتك' : 'Sleep analysis helps improve your quality of life']
                }];
            }
            
            if (isMountedRef.current) {
                setSmartInsights({
                    summary: {
                        avgHours: avgHours > 0 ? avgHours.toFixed(1) : '—',
                        avgQuality: avgQuality > 0 ? avgQuality.toFixed(1) : '—',
                        totalHours: totalHours.toFixed(1),
                        avgBedTime: pattern?.avgBedTime ? `${pattern.avgBedTime}:00` : '—',
                        recordsCount: sleepRecords.length,
                        consistency,
                        sleepScore,
                        hasData
                    },
                    analysis: {
                        durationStatus,
                        qualityStatus,
                        consistencyStatus,
                        pattern,
                        sleepDebt,
                        scoreStatus
                    },
                    impacts,
                    recommendations: hasData ? recommendations : noDataRecommendations,
                    lastUpdated: new Date().toISOString()
                });
                setError(null);
            }
            
        } catch (err) {
            console.error('❌ Error fetching sleep data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    // ✅ useEffects مصححة
    useEffect(() => {
        isMountedRef.current = true;
        fetchAllData();
        
        return () => {
            isMountedRef.current = false;
            isFetchingRef.current = false;
        };
    }, [fetchAllData]);

    // ✅ تأثير التحديث الخارجي
    useEffect(() => {
        if (refreshTrigger !== undefined && isMountedRef.current) {
            fetchAllData();
        }
    }, [refreshTrigger, fetchAllData]);

    // حالة التحميل
    if (loading) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحليل نومك...' : 'Analyzing your sleep...'}</p>
                </div>
            </div>
        );
    }

    // حالة الخطأ
    if (error) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-error">
                    <p>⚠️ {error}</p>
                    <button onClick={fetchAllData} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    // بدون بيانات
    if (!smartInsights) {
        return (
            <div className={`analytics-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="analytics-empty">
                    <div className="empty-icon">🌙</div>
                    <p>{isArabic ? 'جاري تحضير التحليلات...' : 'Preparing insights...'}</p>
                </div>
            </div>
        );
    }

    // العرض الرئيسي
    return (
        <div className={`analytics-container sleep-analytics ${darkMode ? 'dark-mode' : ''}`}>
            <div className="analytics-header">
                <h2>📊 {isArabic ? 'تحليل النوم' : 'Sleep Analytics'}</h2>
                <button onClick={fetchAllData} className="refresh-btn" title={isArabic ? 'تحديث' : 'Refresh'}>
                    🔄
                </button>
            </div>

            <div className="insights-container">
                {/* بطاقة التحليل الرئيسية */}
                <div className="global-health-card">
                    <h3>{isArabic ? 'تحليل نومك' : 'Your Sleep Analysis'}</h3>
                    
                    <div className="health-score-container">
                        <div className="health-score-circle">
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8"/>
                                <circle 
                                    cx="60" cy="60" r="54" 
                                    fill="none" 
                                    stroke="#ffffff" 
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - (smartInsights.summary.sleepScore || 0) / 100)}`}
                                    transform="rotate(-90 60 60)"
                                />
                                <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">
                                    {smartInsights.summary.sleepScore || 0}%
                                </text>
                            </svg>
                        </div>
                        <div className="health-status">
                            <span className="status-badge" style={{ background: smartInsights.analysis.scoreStatus?.color || '#6366f1' }}>
                                {smartInsights.analysis.scoreStatus?.text || (isArabic ? 'متوسط' : 'Average')}
                            </span>
                        </div>
                    </div>
                    
                    <div className="health-analysis">
                        <div className="analysis-summary">
                            <strong>{isArabic ? 'التحليل:' : 'Analysis:'}</strong>
                            <p>
                                {smartInsights.summary.hasData 
                                    ? (isArabic 
                                        ? `متوسط نومك ${smartInsights.summary.avgHours} ساعات بجودة ${smartInsights.summary.avgQuality}/5`
                                        : `Average sleep: ${smartInsights.summary.avgHours} hours with quality ${smartInsights.summary.avgQuality}/5`)
                                    : (isArabic ? 'لا توجد بيانات كافية للتحليل' : 'Insufficient data for analysis')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* توصيات */}
                {smartInsights.recommendations && smartInsights.recommendations.length > 0 && (
                    <div className="recommendations-card">
                        <h3>💡 {isArabic ? 'توصيات ذكية' : 'Smart Recommendations'}</h3>
                        <div className="recommendations-list">
                            {smartInsights.recommendations.slice(0, 3).map((rec, idx) => (
                                <div key={idx} className={`recommendation timing-${rec.timing} priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{rec.icon}</span>
                                        <span className="rec-title">{rec.title}</span>
                                    </div>
                                    <p className="rec-advice">{rec.advice}</p>
                                    <p className="rec-action">🎯 {rec.action}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* إحصائيات سريعة */}
                <div className="analytics-stats-grid">
                    <div className="analytics-stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.avgHours}</div>
                            <div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div>
                        </div>
                    </div>
                    <div className="analytics-stat-card">
                        <div className="stat-icon">⭐</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.avgQuality}/5</div>
                            <div className="stat-label">{isArabic ? 'الجودة' : 'Quality'}</div>
                        </div>
                    </div>
                    <div className="analytics-stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <div className="stat-value">{smartInsights.summary.recordsCount}</div>
                            <div className="stat-label">{isArabic ? 'ليلة مسجلة' : 'Nights'}</div>
                        </div>
                    </div>
                </div>

                <div className="analytics-footer">
                    <small>
                        {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(smartInsights.lastUpdated).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default SleepAnalytics;