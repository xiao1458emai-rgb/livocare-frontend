// src/components/Reports/Reports.jsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب النسبة المئوية للتغير
const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return roundNumber(((current - previous) / previous) * 100, 0);
};

// دالة للحصول على اتجاه التغير
const getTrend = (change) => {
    if (change > 5) return { icon: '📈', text: 'تحسن', color: '#10b981' };
    if (change < -5) return { icon: '📉', text: 'انخفاض', color: '#ef4444' };
    return { icon: '➡️', text: 'مستقر', color: '#f59e0b' };
};

// دالة لتحليل الفترة الزمنية
const getDateRange = (type, customStart, customEnd) => {
    const end = new Date();
    let start = new Date();
    
    if (type === 'weekly') {
        start.setDate(end.getDate() - 7);
    } else if (type === 'monthly') {
        start.setMonth(end.getMonth() - 1);
    } else if (type === 'quarterly') {
        start.setMonth(end.getMonth() - 3);
    } else if (type === 'custom') {
        return { start: new Date(customStart), end: new Date(customEnd) };
    }
    
    return { start, end };
};

// دالة للحصول على الفترة السابقة للمقارنة
const getPreviousRange = (start, end) => {
    const duration = end - start;
    return {
        start: new Date(start - duration),
        end: start
    };
};

const Reports = ({ isAuthReady }) => {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('weekly');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reports, setReports] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');

    const isArabic = i18n.language.startsWith('ar');

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        if (isAuthReady) {
            fetchReports();
        }
    }, [isAuthReady, reportType, dateRange.start, dateRange.end]);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // تحديد الفترة
            const { start, end } = getDateRange(reportType, dateRange.start, dateRange.end);
            const previousRange = getPreviousRange(start, end);
            
            // جلب البيانات للفترة الحالية
            const currentData = await fetchDataInRange(start, end);
            
            // جلب البيانات للفترة السابقة للمقارنة
            const previousData = await fetchDataInRange(previousRange.start, previousRange.end);
            
            // توليد التقارير مع المقارنات
            const reportData = generateSmartReports(currentData, previousData, { start, end });
            setReports(reportData);

        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(t('reports.error'));
        } finally {
            setLoading(false);
        }
    };

    const fetchDataInRange = async (start, end) => {
        const [
            healthRes,
            mealsRes,
            sleepRes,
            moodRes,
            activitiesRes,
            habitsLogsRes,
            habitsDefRes
        ] = await Promise.all([
            axiosInstance.get(`/health_status/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get(`/meals/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get(`/sleep/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get(`/mood-logs/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get(`/activities/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get(`/habit-logs/?start=${start.toISOString()}&end=${end.toISOString()}`).catch(() => ({ data: [] })),
            axiosInstance.get('/habit-definitions/').catch(() => ({ data: [] }))
        ]);

        return {
            health: healthRes.data || [],
            meals: mealsRes.data || [],
            sleep: sleepRes.data || [],
            mood: moodRes.data || [],
            activities: activitiesRes.data || [],
            habits: habitsLogsRes.data || [],
            habitDefinitions: habitsDefRes.data || []
        };
    };

    const generateSmartReports = (current, previous, dateInfo) => {
        // تحليل كل قسم مع مقارنة
        const healthReport = analyzeHealthData(current.health, previous.health);
        const nutritionReport = analyzeNutritionData(current.meals, previous.meals);
        const sleepReport = analyzeSleepData(current.sleep, previous.sleep);
        const moodReport = analyzeMoodData(current.mood, previous.mood);
        const activityReport = analyzeActivityData(current.activities, previous.activities);
        const habitsReport = analyzeHabitsData(current.habits, previous.habits, current.habitDefinitions);
        
        // حساب درجة الصحة الإجمالية
        const healthScore = calculateHealthScore({
            health: healthReport,
            nutrition: nutritionReport,
            sleep: sleepReport,
            mood: moodReport,
            activity: activityReport,
            habits: habitsReport
        });
        
        // توليد القصة الذكية
        const story = generateSmartStory({
            health: healthReport,
            nutrition: nutritionReport,
            sleep: sleepReport,
            mood: moodReport,
            activity: activityReport,
            habits: habitsReport
        });
        
        // توليد أهم الأحداث
        const keyEvents = generateKeyEvents({
            health: healthReport,
            nutrition: nutritionReport,
            sleep: sleepReport,
            mood: moodReport,
            activity: activityReport,
            habits: habitsReport
        });
        
        // توليد توصية واحدة ذكية
        const topRecommendation = generateTopRecommendation({
            health: healthReport,
            nutrition: nutritionReport,
            sleep: sleepReport,
            mood: moodReport,
            activity: activityReport,
            habits: habitsReport
        });
        
        return {
            summary: {
                healthScore,
                story,
                keyEvents,
                topRecommendation,
                dateRange: {
                    start: dateInfo.start,
                    end: dateInfo.end,
                    days: Math.ceil((dateInfo.end - dateInfo.start) / (1000 * 60 * 60 * 24)) + 1
                }
            },
            health: healthReport,
            nutrition: nutritionReport,
            sleep: sleepReport,
            mood: moodReport,
            activity: activityReport,
            habits: habitsReport,
            comparisons: {
                health: healthReport.comparison,
                nutrition: nutritionReport.comparison,
                sleep: sleepReport.comparison,
                mood: moodReport.comparison,
                activity: activityReport.comparison,
                habits: habitsReport.comparison
            }
        };
    };

    const analyzeHealthData = (current, previous) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.health.noData') };
        }

        const weights = current.map(h => parseFloat(h.weight_kg)).filter(w => w && w > 20 && w < 200);
        const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
        const lastWeight = weights[weights.length - 1] || 0;
        
        const prevWeights = previous.map(h => parseFloat(h.weight_kg)).filter(w => w && w > 20 && w < 200);
        const prevAvgWeight = prevWeights.length > 0 ? prevWeights.reduce((a, b) => a + b, 0) / prevWeights.length : 0;
        
        const weightChange = calculateChange(avgWeight, prevAvgWeight);
        
        return {
            hasData: true,
            avgWeight: roundNumber(avgWeight, 1),
            lastWeight: roundNumber(lastWeight, 1),
            weightChange,
            weightTrend: getTrend(weightChange),
            records: current.length,
            comparison: {
                current: avgWeight,
                previous: prevAvgWeight,
                change: weightChange,
                trend: getTrend(weightChange)
            }
        };
    };

    const analyzeNutritionData = (current, previous) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.nutrition.noData') };
        }

        const totalCalories = current.reduce((sum, m) => sum + (m.total_calories || 0), 0);
        const avgCaloriesPerDay = totalCalories / current.length;
        
        const prevTotalCalories = previous.reduce((sum, m) => sum + (m.total_calories || 0), 0);
        const prevAvgCalories = previous.length > 0 ? prevTotalCalories / previous.length : 0;
        
        const caloriesChange = calculateChange(avgCaloriesPerDay, prevAvgCalories);
        
        // حساب متوسط البروتين
        const totalProtein = current.reduce((sum, m) => sum + (m.total_protein || 0), 0);
        const avgProtein = totalProtein / current.length;
        
        return {
            hasData: true,
            totalMeals: current.length,
            avgCaloriesPerDay: Math.round(avgCaloriesPerDay),
            avgProtein: roundNumber(avgProtein, 1),
            caloriesChange,
            caloriesTrend: getTrend(caloriesChange),
            comparison: {
                current: avgCaloriesPerDay,
                previous: prevAvgCalories,
                change: caloriesChange,
                trend: getTrend(caloriesChange)
            }
        };
    };

    const analyzeSleepData = (current, previous) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.sleep.noData') };
        }

        const getHours = (record) => {
            if (record.duration_hours && parseFloat(record.duration_hours) > 0) {
                return parseFloat(record.duration_hours);
            }
            const start = new Date(record.sleep_start || record.start_time);
            const end = new Date(record.sleep_end || record.end_time);
            if (start && end && end > start) {
                return (end - start) / (1000 * 60 * 60);
            }
            return 0;
        };
        
        const hours = current.map(getHours).filter(h => h > 0 && h < 24);
        const avgHours = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
        
        const prevHours = previous.map(getHours).filter(h => h > 0 && h < 24);
        const prevAvgHours = prevHours.length > 0 ? prevHours.reduce((a, b) => a + b, 0) / prevHours.length : 0;
        
        const sleepChange = calculateChange(avgHours, prevAvgHours);
        
        return {
            hasData: true,
            avgHours: roundNumber(avgHours, 1),
            totalNights: current.length,
            sleepChange,
            sleepTrend: getTrend(sleepChange),
            comparison: {
                current: avgHours,
                previous: prevAvgHours,
                change: sleepChange,
                trend: getTrend(sleepChange)
            }
        };
    };

    const analyzeMoodData = (current, previous) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.mood.noData') };
        }

        const getScore = (mood) => {
            const map = { 'Excellent': 5, 'Good': 4, 'Neutral': 3, 'Stressed': 2, 'Anxious': 2, 'Sad': 1 };
            return map[mood.mood] || 3;
        };
        
        const scores = current.map(getScore);
        const avgMood = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        
        const prevScores = previous.map(getScore);
        const prevAvgMood = prevScores.length > 0 ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length : 0;
        
        const moodChange = calculateChange(avgMood, prevAvgMood);
        
        return {
            hasData: true,
            avgMood: roundNumber(avgMood, 1),
            totalDays: current.length,
            moodChange,
            moodTrend: getTrend(moodChange),
            comparison: {
                current: avgMood,
                previous: prevAvgMood,
                change: moodChange,
                trend: getTrend(moodChange)
            }
        };
    };

    const analyzeActivityData = (current, previous) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.activity.noData') };
        }

        const totalMinutes = current.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        const avgMinutesPerDay = totalMinutes / current.length;
        
        const prevTotalMinutes = previous.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
        const prevAvgMinutes = previous.length > 0 ? prevTotalMinutes / previous.length : 0;
        
        const activityChange = calculateChange(avgMinutesPerDay, prevAvgMinutes);
        
        return {
            hasData: true,
            totalMinutes,
            avgMinutesPerDay: Math.round(avgMinutesPerDay),
            records: current.length,
            activityChange,
            activityTrend: getTrend(activityChange),
            comparison: {
                current: avgMinutesPerDay,
                previous: prevAvgMinutes,
                change: activityChange,
                trend: getTrend(activityChange)
            }
        };
    };

    const analyzeHabitsData = (current, previous, definitions) => {
        if (current.length === 0) {
            return { hasData: false, message: t('reports.habits.noData') };
        }

        const completed = current.filter(h => h.is_completed).length;
        const completionRate = (completed / current.length) * 100;
        
        const prevCompleted = previous.filter(h => h.is_completed).length;
        const prevCompletionRate = previous.length > 0 ? (prevCompleted / previous.length) * 100 : 0;
        
        const habitsChange = calculateChange(completionRate, prevCompletionRate);
        
        return {
            hasData: true,
            total: current.length,
            completed,
            completionRate: Math.round(completionRate),
            habitsChange,
            habitsTrend: getTrend(habitsChange),
            comparison: {
                current: completionRate,
                previous: prevCompletionRate,
                change: habitsChange,
                trend: getTrend(habitsChange)
            }
        };
    };

    const calculateHealthScore = (data) => {
        let score = 65; // نقطة انطلاق متوسطة
        
        // النوم (30 نقطة)
        if (data.sleep.hasData && data.sleep.avgHours) {
            if (data.sleep.avgHours >= 7 && data.sleep.avgHours <= 8) score += 25;
            else if (data.sleep.avgHours >= 6) score += 15;
            else if (data.sleep.avgHours >= 5) score += 5;
            else if (data.sleep.avgHours > 0) score -= 10;
        }
        
        // التغذية (20 نقطة)
        if (data.nutrition.hasData && data.nutrition.avgCaloriesPerDay) {
            if (data.nutrition.avgCaloriesPerDay >= 1800 && data.nutrition.avgCaloriesPerDay <= 2200) score += 20;
            else if (data.nutrition.avgCaloriesPerDay >= 1500) score += 10;
            else if (data.nutrition.avgCaloriesPerDay > 2500) score -= 5;
            else if (data.nutrition.avgCaloriesPerDay < 1200) score -= 10;
        }
        
        // النشاط (20 نقطة)
        if (data.activity.hasData && data.activity.avgMinutesPerDay) {
            if (data.activity.avgMinutesPerDay >= 30) score += 20;
            else if (data.activity.avgMinutesPerDay >= 20) score += 12;
            else if (data.activity.avgMinutesPerDay >= 10) score += 5;
            else score -= 5;
        }
        
        // المزاج (15 نقطة)
        if (data.mood.hasData && data.mood.avgMood) {
            if (data.mood.avgMood >= 4) score += 15;
            else if (data.mood.avgMood >= 3) score += 8;
            else if (data.mood.avgMood >= 2) score += 0;
            else score -= 10;
        }
        
        // العادات (15 نقطة)
        if (data.habits.hasData && data.habits.completionRate) {
            if (data.habits.completionRate >= 80) score += 15;
            else if (data.habits.completionRate >= 60) score += 8;
            else if (data.habits.completionRate >= 40) score += 3;
            else score -= 5;
        }
        
        return {
            score: Math.min(100, Math.max(0, Math.round(score))),
            grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'E',
            change: calculateChange(score, 65) // مقارنة مع نقطة الانطلاق
        };
    };

    const generateSmartStory = (data) => {
        const events = [];
        
        if (data.sleep.hasData) {
            if (data.sleep.sleepChange > 10) {
                events.push({
                    type: 'improvement',
                    text: t('reports.story.sleepImproved', { change: Math.abs(data.sleep.sleepChange) })
                });
            } else if (data.sleep.sleepChange < -10) {
                events.push({
                    type: 'decline',
                    text: t('reports.story.sleepDeclined', { change: Math.abs(data.sleep.sleepChange) })
                });
            }
        }
        
        if (data.activity.hasData) {
            if (data.activity.activityChange > 20) {
                events.push({
                    type: 'improvement',
                    text: t('reports.story.activityImproved', { change: Math.abs(data.activity.activityChange) })
                });
            } else if (data.activity.activityChange < -20) {
                events.push({
                    type: 'decline',
                    text: t('reports.story.activityDeclined', { change: Math.abs(data.activity.activityChange) })
                });
            }
        }
        
        if (data.nutrition.hasData) {
            if (data.nutrition.caloriesChange > 15) {
                events.push({
                    type: 'improvement',
                    text: t('reports.story.nutritionImproved', { change: Math.abs(data.nutrition.caloriesChange) })
                });
            } else if (data.nutrition.caloriesChange < -15) {
                events.push({
                    type: 'decline',
                    text: t('reports.story.nutritionDeclined', { change: Math.abs(data.nutrition.caloriesChange) })
                });
            }
        }
        
        return events;
    };

    const generateKeyEvents = (data) => {
        const events = [];
        
        if (data.sleep.hasData && data.sleep.avgHours < 6) {
            events.push({
                icon: '🌙',
                text: t('reports.events.lowSleep', { hours: data.sleep.avgHours })
            });
        }
        
        if (data.activity.hasData && data.activity.avgMinutesPerDay < 20) {
            events.push({
                icon: '🏃',
                text: t('reports.events.lowActivity', { minutes: data.activity.avgMinutesPerDay })
            });
        }
        
        if (data.mood.hasData && data.mood.avgMood < 3) {
            events.push({
                icon: '😔',
                text: t('reports.events.lowMood', { score: data.mood.avgMood })
            });
        }
        
        if (data.nutrition.hasData && data.nutrition.avgCaloriesPerDay < 1500) {
            events.push({
                icon: '🥗',
                text: t('reports.events.lowCalories', { calories: data.nutrition.avgCaloriesPerDay })
            });
        }
        
        return events;
    };

    const generateTopRecommendation = (data) => {
        // العثور على أسوأ مجال
        const worstField = Object.entries(data).find(([key, value]) => {
            if (value.hasData && value.comparison && value.comparison.change < -10) {
                return true;
            }
            return false;
        });
        
        if (worstField) {
            const [field, value] = worstField;
            if (field === 'sleep') {
                return {
                    icon: '😴',
                    title: t('reports.recommendations.sleep.title'),
                    advice: t('reports.recommendations.sleep.advice', { hours: value.avgHours }),
                    action: t('reports.recommendations.sleep.action')
                };
            } else if (field === 'activity') {
                return {
                    icon: '🏃',
                    title: t('reports.recommendations.activity.title'),
                    advice: t('reports.recommendations.activity.advice', { minutes: value.avgMinutesPerDay }),
                    action: t('reports.recommendations.activity.action')
                };
            } else if (field === 'nutrition') {
                return {
                    icon: '🥗',
                    title: t('reports.recommendations.nutrition.title'),
                    advice: t('reports.recommendations.nutrition.advice', { calories: value.avgCaloriesPerDay }),
                    action: t('reports.recommendations.nutrition.action')
                };
            }
        }
        
        return {
            icon: '🌟',
            title: t('reports.recommendations.default.title'),
            advice: t('reports.recommendations.default.advice'),
            action: t('reports.recommendations.default.action')
        };
    };

    const exportToPDF = () => {
        alert(t('reports.export.pdfComingSoon'));
    };

    const exportToCSV = () => {
        alert(t('reports.export.csvComingSoon'));
    };

    if (loading) {
        return (
            <div className={`reports-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('reports.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`reports-error ${darkMode ? 'dark-mode' : ''}`}>
                <p>❌ {error}</p>
                <button onClick={fetchReports} className="retry-btn">
                    {t('reports.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={`reports-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس الصفحة */}
            <div className="reports-header">
                <h2>
                    <span className="header-icon">📊</span>
                    {t('reports.title')}
                </h2>
                
                <div className="reports-controls">
                    <select 
                        value={reportType} 
                        onChange={(e) => setReportType(e.target.value)}
                        className="report-type-select"
                    >
                        <option value="weekly">{t('reports.types.weekly')}</option>
                        <option value="monthly">{t('reports.types.monthly')}</option>
                        <option value="quarterly">{t('reports.types.quarterly')}</option>
                        <option value="custom">{t('reports.types.custom')}</option>
                    </select>

                    {reportType === 'custom' && (
                        <div className="date-range">
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="date-input"
                            />
                            <span>{t('reports.to')}</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="date-input"
                            />
                        </div>
                    )}

                    <button onClick={exportToPDF} className="export-btn pdf">
                        📄 PDF
                    </button>
                    <button onClick={exportToCSV} className="export-btn csv">
                        📊 CSV
                    </button>
                </div>
            </div>

            {reports && (
                <div className="reports-content">
                    {/* درجة الصحة */}
                    <div className="health-score-card">
                        <div className="score-header">
                            <span className="score-icon">🎯</span>
                            <span className="score-title">{t('reports.healthScore')}</span>
                            <span className={`score-value score-${reports.summary.healthScore.grade}`}>
                                {reports.summary.healthScore.score}/100
                            </span>
                            <span className="score-grade">{reports.summary.healthScore.grade}</span>
                            {reports.summary.healthScore.change !== 0 && (
                                <span className={`score-change ${reports.summary.healthScore.change > 0 ? 'positive' : 'negative'}`}>
                                    {reports.summary.healthScore.change > 0 ? '↑' : '↓'} {Math.abs(reports.summary.healthScore.change)}%
                                </span>
                            )}
                        </div>
                        <div className="score-progress">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${reports.summary.healthScore.score}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* القصة الذكية */}
                    {reports.summary.story.length > 0 && (
                        <div className="story-card">
                            <h3>📖 {t('reports.story.title')}</h3>
                            <div className="story-events">
                                {reports.summary.story.map((event, i) => (
                                    <div key={i} className={`story-event ${event.type}`}>
                                        <span className="event-icon">{event.type === 'improvement' ? '📈' : '📉'}</span>
                                        <span className="event-text">{event.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* أهم الأحداث */}
                    {reports.summary.keyEvents.length > 0 && (
                        <div className="key-events-card">
                            <h3>⚡ {t('reports.keyEvents')}</h3>
                            <div className="events-list">
                                {reports.summary.keyEvents.map((event, i) => (
                                    <div key={i} className="event-item">
                                        <span className="event-icon">{event.icon}</span>
                                        <span className="event-text">{event.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* التوصية الذكية */}
                    <div className="top-recommendation-card">
                        <div className="rec-header">
                            <span className="rec-icon">{reports.summary.topRecommendation.icon}</span>
                            <span className="rec-title">{t('reports.topRecommendation')}</span>
                        </div>
                        <h4>{reports.summary.topRecommendation.title}</h4>
                        <p className="rec-advice">{reports.summary.topRecommendation.advice}</p>
                        <div className="rec-action">💡 {reports.summary.topRecommendation.action}</div>
                    </div>

                    {/* تبويبات التفاصيل */}
                    <div className="reports-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                            onClick={() => setActiveTab('summary')}
                        >
                            📊 {t('reports.tabs.summary')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'sleep' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sleep')}
                        >
                            🌙 {t('reports.tabs.sleep')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
                            onClick={() => setActiveTab('nutrition')}
                        >
                            🥗 {t('reports.tabs.nutrition')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            🏃 {t('reports.tabs.activity')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'mood' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mood')}
                        >
                            😊 {t('reports.tabs.mood')}
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'habits' ? 'active' : ''}`}
                            onClick={() => setActiveTab('habits')}
                        >
                            💊 {t('reports.tabs.habits')}
                        </button>
                    </div>

                    {/* محتوى التبويبات */}
                    <div className="tab-content">
                        {activeTab === 'summary' && (
                            <div className="summary-grid">
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🌙</span>
                                        <span>{t('reports.sleep.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.sleep.avgHours || 0} {t('reports.sleep.hours')}</div>
                                    {reports.sleep.comparison && (
                                        <div className={`stat-change ${reports.sleep.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.sleep.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.sleep.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🥗</span>
                                        <span>{t('reports.nutrition.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.nutrition.avgCaloriesPerDay || 0}</div>
                                    {reports.nutrition.comparison && (
                                        <div className={`stat-change ${reports.nutrition.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.nutrition.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.nutrition.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>🏃</span>
                                        <span>{t('reports.activity.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.activity.avgMinutesPerDay || 0} {t('reports.activity.minutes')}</div>
                                    {reports.activity.comparison && (
                                        <div className={`stat-change ${reports.activity.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.activity.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.activity.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-header">
                                        <span>😊</span>
                                        <span>{t('reports.mood.title')}</span>
                                    </div>
                                    <div className="stat-value">{reports.mood.avgMood || 0}/5</div>
                                    {reports.mood.comparison && (
                                        <div className={`stat-change ${reports.mood.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                            {reports.mood.comparison.change > 0 ? '↑' : '↓'} {Math.abs(reports.mood.comparison.change)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'sleep' && reports.sleep.hasData && (
                            <div className="detail-card">
                                <h3>🌙 {t('reports.sleep.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.sleep.avgHours')}</span>
                                        <span className="detail-value">{reports.sleep.avgHours} {t('reports.sleep.hours')}</span>
                                        {reports.sleep.comparison && (
                                            <span className={`detail-change ${reports.sleep.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.sleep.comparison.change > 0 ? '+' : ''}{reports.sleep.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.sleep.totalNights')}</span>
                                        <span className="detail-value">{reports.sleep.totalNights}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'nutrition' && reports.nutrition.hasData && (
                            <div className="detail-card">
                                <h3>🥗 {t('reports.nutrition.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.avgCalories')}</span>
                                        <span className="detail-value">{reports.nutrition.avgCaloriesPerDay}</span>
                                        {reports.nutrition.comparison && (
                                            <span className={`detail-change ${reports.nutrition.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.nutrition.comparison.change > 0 ? '+' : ''}{reports.nutrition.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.avgProtein')}</span>
                                        <span className="detail-value">{reports.nutrition.avgProtein}g</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.nutrition.totalMeals')}</span>
                                        <span className="detail-value">{reports.nutrition.totalMeals}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'activity' && reports.activity.hasData && (
                            <div className="detail-card">
                                <h3>🏃 {t('reports.activity.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.totalMinutes')}</span>
                                        <span className="detail-value">{reports.activity.totalMinutes}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.avgMinutes')}</span>
                                        <span className="detail-value">{reports.activity.avgMinutesPerDay} {t('reports.activity.perDay')}</span>
                                        {reports.activity.comparison && (
                                            <span className={`detail-change ${reports.activity.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.activity.comparison.change > 0 ? '+' : ''}{reports.activity.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.activity.records')}</span>
                                        <span className="detail-value">{reports.activity.records}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'mood' && reports.mood.hasData && (
                            <div className="detail-card">
                                <h3>😊 {t('reports.mood.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.mood.avgScore')}</span>
                                        <span className="detail-value">{reports.mood.avgMood}/5</span>
                                        {reports.mood.comparison && (
                                            <span className={`detail-change ${reports.mood.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.mood.comparison.change > 0 ? '+' : ''}{reports.mood.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.mood.totalDays')}</span>
                                        <span className="detail-value">{reports.mood.totalDays}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'habits' && reports.habits.hasData && (
                            <div className="detail-card">
                                <h3>💊 {t('reports.habits.details')}</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.habits.completionRate')}</span>
                                        <span className="detail-value">{reports.habits.completionRate}%</span>
                                        {reports.habits.comparison && (
                                            <span className={`detail-change ${reports.habits.comparison.change > 0 ? 'positive' : 'negative'}`}>
                                                {reports.habits.comparison.change > 0 ? '+' : ''}{reports.habits.comparison.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('reports.habits.completed')}</span>
                                        <span className="detail-value">{reports.habits.completed}/{reports.habits.total}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .reports-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 24px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                .reports-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .reports-header h2 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .reports-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .report-type-select {
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: 40px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .date-range {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .date-input {
                    padding: 8px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .export-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                }

                .export-btn.pdf {
                    background: #ef4444;
                    color: white;
                }

                .export-btn.csv {
                    background: #10b981;
                    color: white;
                }

                /* درجة الصحة */
                .health-score-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .score-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }

                .score-icon {
                    font-size: 1.5rem;
                }

                .score-title {
                    font-weight: bold;
                }

                .score-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin-left: auto;
                }

                .score-value.score-A { color: #10b981; }
                .score-value.score-B { color: #3b82f6; }
                .score-value.score-C { color: #f59e0b; }
                .score-value.score-D { color: #f97316; }
                .score-value.score-E { color: #ef4444; }

                .score-grade {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-weight: bold;
                }

                .score-change {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                }

                .score-change.positive {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .score-change.negative {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .score-progress {
                    width: 100%;
                }

                .progress-bar {
                    height: 8px;
                    background: var(--border-color);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: var(--primary-color);
                    border-radius: 4px;
                }

                /* القصة الذكية */
                .story-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .story-card h3 {
                    margin: 0 0 16px 0;
                }

                .story-events {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .story-event {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 12px;
                }

                .story-event.improvement {
                    background: rgba(16, 185, 129, 0.1);
                    border-right: 3px solid #10b981;
                }

                .story-event.decline {
                    background: rgba(239, 68, 68, 0.1);
                    border-right: 3px solid #ef4444;
                }

                /* أهم الأحداث */
                .key-events-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .key-events-card h3 {
                    margin: 0 0 16px 0;
                }

                .events-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .event-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 12px;
                }

                /* التوصية الذكية */
                .top-recommendation-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                    color: white;
                }

                .rec-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .rec-icon {
                    font-size: 1.5rem;
                }

                .rec-title {
                    font-weight: bold;
                }

                .top-recommendation-card h4 {
                    margin: 0 0 8px 0;
                }

                .rec-advice {
                    margin: 0 0 12px 0;
                }

                .rec-action {
                    background: rgba(255,255,255,0.2);
                    padding: 8px 12px;
                    border-radius: 12px;
                    display: inline-block;
                }

                /* التبويبات */
                .reports-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .tab-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    background: var(--bg-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tab-btn.active {
                    background: var(--primary-color);
                    color: white;
                }

                /* الإحصائيات */
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                }

                .stat-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    color: var(--text-secondary);
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }

                .stat-change {
                    font-size: 0.8rem;
                    margin-top: 4px;
                }

                .stat-change.positive {
                    color: #10b981;
                }

                .stat-change.negative {
                    color: #ef4444;
                }

                .detail-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 20px;
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .detail-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .detail-value {
                    font-size: 1.2rem;
                    font-weight: bold;
                }

                .detail-change {
                    font-size: 0.7rem;
                }

                .detail-change.positive {
                    color: #10b981;
                }

                .detail-change.negative {
                    color: #ef4444;
                }

                @media (max-width: 768px) {
                    .reports-container {
                        padding: 16px;
                    }
                    
                    .summary-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .reports-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .reports-controls {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                }

                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #8b5cf6;
                }
            `}</style>
        </div>
    );
};

export default Reports;