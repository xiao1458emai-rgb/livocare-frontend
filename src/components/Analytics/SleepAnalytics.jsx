import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as stats from 'simple-statistics';
import * as math from 'mathjs';
import axiosInstance from '../../services/api';
import '../../index.css';

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
                                                    <style jsx>{`
/*===========================================
   SleepAnalytics.css - الأنماط الداخلية فقط
   ✅ تحليل النوم - ألوان مهدئة وليلة
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.sleep-analytics {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.sleep-analytics.dark-mode {
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
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .analytics-header h2 {
    background: linear-gradient(135deg, #818cf8, #a78bfa);
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
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    transform: rotate(180deg);
}

/* ===== بطاقة التحليل الرئيسية - نوم ===== */
.global-health-card {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: white;
}

.dark-mode .global-health-card {
    background: linear-gradient(135deg, #0f172a, #1e1b4b, #2e1065);
}

.global-health-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
    font-weight: 500;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.health-score-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
}

.health-score-circle {
    position: relative;
    width: 100px;
    height: 100px;
}

.health-score-circle svg {
    width: 100%;
    height: 100%;
}

.health-score-circle text {
    fill: white;
    font-size: 20px;
    font-weight: bold;
}

.status-badge {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
}

.health-analysis {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0.75rem;
}

.analysis-summary {
    margin-bottom: 0.5rem;
}

.analysis-summary strong {
    font-size: 0.7rem;
    display: block;
    margin-bottom: 0.25rem;
    opacity: 0.8;
}

.analysis-summary p {
    font-size: 0.8rem;
    margin: 0;
    line-height: 1.4;
}

/* ===== بطاقة التوصيات ===== */
.recommendations-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .recommendations-card {
    background: #0f172a;
    border-color: #334155;
}

.recommendations-card h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .recommendations-card h3 {
    color: #f1f5f9;
}

.recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.recommendation {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    padding: 1rem;
    transition: all 0.2s;
    border-left: 3px solid;
}

.dark-mode .recommendation {
    background: #1e293b;
}

.recommendation:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-mode .recommendation:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[dir="rtl"] .recommendation {
    border-left: none;
    border-right: 3px solid;
}

[dir="rtl"] .recommendation:hover {
    transform: translateX(-4px);
}

.recommendation.timing-tonight {
    border-left-color: #6366f1;
    background: rgba(99, 102, 241, 0.03);
}

.recommendation.timing-today {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.03);
}

.recommendation.timing-general {
    border-left-color: #10b981;
    background: rgba(16, 185, 129, 0.03);
}

.recommendation.priority-high {
    border-left-color: #ef4444;
}

[dir="rtl"] .recommendation.timing-tonight {
    border-right-color: #6366f1;
}

[dir="rtl"] .recommendation.timing-today {
    border-right-color: #f59e0b;
}

[dir="rtl"] .recommendation.timing-general {
    border-right-color: #10b981;
}

.rec-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
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
    margin: 0.5rem 0;
    color: var(--text-primary, #0f172a);
    font-weight: 500;
}

.rec-action {
    font-size: 0.75rem;
    margin: 0.25rem 0;
    color: var(--text-secondary, #64748b);
}

/* ===== شبكة الإحصائيات ===== */
.analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.analytics-stat-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-stat-card {
    background: #0f172a;
    border-color: #334155;
}

.analytics-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode .analytics-stat-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-icon {
    font-size: 1.8rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 16px;
    color: white;
}

.stat-content {
    flex: 1;
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    line-height: 1.2;
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
}

/* ===== التذييل ===== */
.analytics-footer {
    text-align: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .analytics-footer {
    border-top-color: #334155;
}

.analytics-footer small {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== حالات التحميل والخطأ والبيانات الفارغة ===== */
.analytics-loading,
.analytics-error,
.analytics-empty {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
}

.dark-mode .analytics-loading,
.dark-mode .analytics-error,
.dark-mode .analytics-empty {
    background: #1e293b;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 0.75rem;
    opacity: 0.5;
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
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* ===== حاوية التحليلات ===== */
.insights-container {
    display: flex;
    flex-direction: column;
}

/* ===== دعم RTL ===== */
[dir="rtl"] .recommendation {
    border-right-width: 3px;
}

[dir="rtl"] .stat-icon {
    margin-left: 0.75rem;
    margin-right: 0;
}

/* ===== أيقونات إضافية للنوم ===== */
.stat-icon[class*="stat-icon"]:has(+ .stat-content .stat-label:contains("نوم")) {
    background: linear-gradient(135deg, #4c1d95, #7c3aed);
}

/* ===== نجوم الجودة ===== */
.quality-stars {
    display: flex;
    gap: 0.2rem;
    margin-top: 0.25rem;
}

.quality-star {
    font-size: 0.7rem;
    color: #f59e0b;
}

.quality-star.empty {
    color: var(--border-light, #e2e8f0);
}

.dark-mode .quality-star.empty {
    color: #334155;
}

/* ===== شريط تقدم النوم ===== */
.sleep-progress {
    margin-top: 1rem;
}

.sleep-progress-bar {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    height: 6px;
    overflow: hidden;
    margin-top: 0.5rem;
}

.sleep-progress-fill {
    height: 100%;
    background: white;
    border-radius: 10px;
    transition: width 0.5s ease;
}

/* ===== تنبيهات النوم ===== */
.sleep-alert {
    background: rgba(239, 68, 68, 0.1);
    border-radius: 16px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-left: 3px solid #ef4444;
}

[dir="rtl"] .sleep-alert {
    border-left: none;
    border-right: 3px solid #ef4444;
}

.sleep-alert p {
    font-size: 0.75rem;
    margin: 0;
    color: #ef4444;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .analytics-stat-card:hover,
    .recommendation:hover {
        transform: none;
    }
    
    .spinner {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .analytics-stat-card,
    .recommendations-card {
        border-width: 2px;
    }
    
    .recommendation {
        border-left-width: 4px;
    }
    
    [dir="rtl"] .recommendation {
        border-right-width: 4px;
    }
    
    .global-health-card {
        border: 2px solid white;
    }
}
            `}</style>

        </div>
    );
};

export default SleepAnalytics;