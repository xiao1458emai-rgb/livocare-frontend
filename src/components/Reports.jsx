'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const abortControllersRef = useRef([]);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب البيانات - مع useCallback ومنع الطلبات المتزامنة
    const fetchDataInRange = useCallback(async (start, end) => {
        // إلغاء الطلبات السابقة
        abortControllersRef.current.forEach(controller => controller.abort());
        abortControllersRef.current = [];
        
        const endpoints = [
            `/health_status/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/meals/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/sleep/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/mood-logs/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/activities/?start=${start.toISOString()}&end=${end.toISOString()}`,
            `/habit-logs/?start=${start.toISOString()}&end=${end.toISOString()}`,
            '/habit-definitions/'
        ];
        
        const promises = endpoints.map(async (url, index) => {
            const controller = new AbortController();
            abortControllersRef.current.push(controller);
            
            try {
                const response = await axiosInstance.get(url, {
                    signal: controller.signal
                });
                return { data: response.data, index };
            } catch (err) {
                if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                    return { data: [], index };
                }
                console.error(`Error fetching ${url}:`, err);
                return { data: [], index };
            }
        });
        
        const results = await Promise.all(promises);
        
        return {
            health: results.find(r => r.index === 0)?.data || [],
            meals: results.find(r => r.index === 1)?.data || [],
            sleep: results.find(r => r.index === 2)?.data || [],
            mood: results.find(r => r.index === 3)?.data || [],
            activities: results.find(r => r.index === 4)?.data || [],
            habits: results.find(r => r.index === 5)?.data || [],
            habitDefinitions: results.find(r => r.index === 6)?.data || []
        };
    }, []);

    // ✅ جلب التقارير - مع useCallback ومنع الطلبات المتزامنة
    const fetchReports = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const { start, end } = getDateRange(reportType, dateRange.start, dateRange.end);
            const previousRange = getPreviousRange(start, end);
            
            const [currentData, previousData] = await Promise.all([
                fetchDataInRange(start, end),
                fetchDataInRange(previousRange.start, previousRange.end)
            ]);
            
            if (!isMountedRef.current) return;
            
            const reportData = generateSmartReports(currentData, previousData, { start, end });
            setReports(reportData);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('Error fetching reports:', err);
            if (isMountedRef.current) {
                setError(t('reports.error'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [reportType, dateRange, t, fetchDataInRange]);

    // ✅ جلب البيانات عند التغيير
    useEffect(() => {
        if (isAuthReady) {
            fetchReports();
        }
        
        return () => {
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, [isAuthReady, reportType, dateRange.start, dateRange.end, fetchReports]);

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllersRef.current.forEach(controller => controller.abort());
        };
    }, []);

    // ... باقي دوال التحليل (analyzeHealthData, analyzeNutritionData, etc.) تبقى كما هي ...

    // ✅ ملاحظة: الدوال التحليلية (analyzeHealthData, analyzeNutritionData, analyzeSleepData, 
    // analyzeMoodData, analyzeActivityData, analyzeHabitsData, calculateHealthScore, 
    // generateSmartStory, generateKeyEvents, generateTopRecommendation) تبقى كما هي دون تغيير

    // أضف هنا جميع دوال التحليل كما هي في الكود الأصلي
    // (analyzeHealthData, analyzeNutritionData, analyzeSleepData, analyzeMoodData, 
    // analyzeActivityData, analyzeHabitsData, calculateHealthScore, generateSmartStory, 
    // generateKeyEvents, generateTopRecommendation, generateSmartReports)

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