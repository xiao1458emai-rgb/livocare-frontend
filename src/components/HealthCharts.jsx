'use client'
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import '../index.css';
// تسجيل العناصر الضرورية لـ Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function HealthCharts({ refreshKey }) {
    const { t, i18n } = useTranslation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // دالة محسنة لجلب البيانات
    const fetchData = async () => {
        if (history.length > 0) {
            setLoading(true);
        } else {
            setLoading(true);
        }
        
        setError(null);
        try {
            const response = await axiosInstance.get('/health_status/');
            
            if (Array.isArray(response.data)) {
                const validData = response.data.filter(record => 
                    record && record.recorded_at && 
                    (record.weight_kg || record.systolic_pressure || record.blood_glucose)
                );
                
                setHistory(validData);
            } else {
                throw new Error(t('charts.invalidDataFormat'));
            }
        } catch (err) {
            console.error('Error fetching chart data:', err);
            
            let errorMessage = t('charts.fetchError');
            
            if (err.response?.status === 401) {
                errorMessage = t('charts.sessionExpired');
            } else if (err.response?.status === 404) {
                errorMessage = t('charts.dataNotFound');
            } else if (err.response?.status === 500) {
                errorMessage = t('charts.serverError');
            } else if (err.code === 'NETWORK_ERROR' || !err.response) {
                errorMessage = t('charts.networkError');
                if (history.length > 0) {
                    errorMessage += ' ' + t('charts.showingStoredData');
                }
            }
            
            setError(errorMessage);
            
            if (history.length === 0) {
                setHistory([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    // معالجة البيانات للرسم البياني
    const processChartData = () => {
        if (history.length === 0) {
            return { dates: [], weights: [], systolic: [], diastolic: [], glucose: [] };
        }

        const sortedHistory = [...history].sort((a, b) => 
            new Date(a.recorded_at) - new Date(b.recorded_at)
        );

        const dates = sortedHistory.map(record => 
            new Date(record.recorded_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                month: 'short',
                day: 'numeric'
            })
        );
        
        const weights = sortedHistory.map(record => 
            record.weight_kg && !isNaN(parseFloat(record.weight_kg)) ? parseFloat(record.weight_kg) : null
        );
        
        const systolic = sortedHistory.map(record => 
            record.systolic_pressure && !isNaN(parseInt(record.systolic_pressure)) ? parseInt(record.systolic_pressure) : null
        );
        
        const diastolic = sortedHistory.map(record => 
            record.diastolic_pressure && !isNaN(parseInt(record.diastolic_pressure)) ? parseInt(record.diastolic_pressure) : null
        );

        const glucose = sortedHistory.map(record => 
            record.blood_glucose && !isNaN(parseFloat(record.blood_glucose)) ? parseFloat(record.blood_glucose) : null
        );

        return { dates, weights, systolic, diastolic, glucose };
    };

    // خيارات الرسم البياني مع دعم الوضع المظلم
    const getChartOptions = (min, max) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: history.length > 10 ? 0 : 1000,
        },
        plugins: {
            legend: {
                position: 'top',
                rtl: i18n.language === 'ar',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    color: darkMode ? '#f8fafc' : '#2c3e50',
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        size: 12,
                        weight: '500'
                    }
                }
            },
            tooltip: {
                rtl: i18n.language === 'ar',
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                titleColor: darkMode ? '#f8fafc' : '#ffffff',
                bodyColor: darkMode ? '#cbd5e1' : '#ffffff',
                borderColor: darkMode ? '#475569' : 'transparent',
                borderWidth: darkMode ? 1 : 0,
                padding: 10,
                titleFont: {
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    size: 13,
                    weight: '600'
                },
                bodyFont: {
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    size: 12
                },
                intersect: false,
                mode: 'index',
                displayColors: true,
                boxPadding: 5
            }
        },
        scales: {
            x: {
                grid: {
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    maxTicksLimit: history.length > 10 ? 8 : 12,
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        size: 11
                    }
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    precision: 0,
                    color: darkMode ? '#cbd5e1' : '#64748b',
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        size: 11
                    },
                    callback: function(value) {
                        return value;
                    }
                },
                min: min,
                max: max
            }
        },
        elements: {
            point: {
                radius: history.length > 20 ? 3 : 6,
                hoverRadius: history.length > 20 ? 5 : 8,
                borderWidth: 2,
                hoverBorderWidth: 3
            },
            line: {
                borderWidth: 3,
                tension: 0.4
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        }
    });

    if (loading) {
        return (
            <div className={`loading-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('charts.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`error-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button onClick={fetchData} className="retry-btn">
                    🔄 {t('charts.retry')}
                </button>
            </div>
        );
    }

    // تحتاج إلى قراءتين على الأقل لرسم خط بياني ذو معنى
    if (history.length < 2) {
        return (
            <div className={`insufficient-data ${darkMode ? 'dark-mode' : ''}`}>
                <div className="data-icon">📊</div>
                <h3>{t('charts.insufficientData')}</h3>
                <p>{t('charts.minReadingsRequired')}</p>
                <p className="hint">{t('charts.addMoreReadings')}</p>
            </div>
        );
    }

    const { dates, weights, systolic, diastolic, glucose } = processChartData();

    // حساب النطاقات الديناميكية للمحاور
    const getDynamicRange = (data, padding = 0.1) => {
        const validData = data.filter(val => val !== null);
        if (validData.length === 0) return { min: 0, max: 100 };
        
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const range = max - min;
        
        return {
            min: Math.max(0, min - range * padding),
            max: max + range * padding
        };
    };

    // إعداد بيانات الرسم البياني للوزن
    const weightData = {
        labels: dates,
        datasets: [{
            label: t('charts.weightLabel'),
            data: weights,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
            pointBorderWidth: 2,
            fill: true,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#3b82f6',
            pointHoverBorderColor: darkMode ? '#f8fafc' : '#ffffff',
            pointHoverBorderWidth: 3
        }],
    };

    // إعداد بيانات الرسم البياني لضغط الدم
    const bloodPressureData = {
        labels: dates,
        datasets: [
            {
                label: t('charts.systolicLabel'),
                data: systolic,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: false,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#ef4444',
                pointHoverBorderColor: darkMode ? '#f8fafc' : '#ffffff',
                pointHoverBorderWidth: 3
            },
            {
                label: t('charts.diastolicLabel'),
                data: diastolic,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
                pointBorderWidth: 2,
                fill: false,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#8b5cf6',
                pointHoverBorderColor: darkMode ? '#f8fafc' : '#ffffff',
                pointHoverBorderWidth: 3
            }
        ],
    };

    // إعداد بيانات الرسم البياني للجلوكوز
    const glucoseData = {
        labels: dates,
        datasets: [{
            label: t('charts.glucoseLabel'),
            data: glucose,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#10b981',
            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
            pointBorderWidth: 2,
            fill: true,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: darkMode ? '#f8fafc' : '#ffffff',
            pointHoverBorderWidth: 3
        }],
    };

    const weightRange = getDynamicRange(weights);
    const pressureRange = getDynamicRange([...systolic, ...diastolic].filter(val => val !== null));
    const glucoseRange = getDynamicRange(glucose);

    return (
        <div className={`health-charts-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس القسم مع ترجمة */}
            <div className="charts-header">
                <div className="header-main">
                    <h2>
                        <span className="header-icon">📊</span>
                        {t('charts.title')}
                    </h2>
                    <div className="charts-controls">
                        <div className="controls-group">
                            <button 
                                onClick={fetchData} 
                                disabled={loading}
                                className={`refresh-btn ${loading ? 'loading' : ''}`}
                            >
                                {loading ? '⏳' : '🔄'} {t('charts.refresh')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="charts-stats">
                    <div className="stat">
                        <span className="stat-icon">📝</span>
                        <span className="stat-label">{t('charts.reading')}</span>
                        <span className="stat-value">{history.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-icon">📅</span>
                        <span className="stat-label">{t('charts.day')}</span>
                        <span className="stat-value">{new Set(dates).size}</span>
                    </div>
                </div>
            </div>

            {/* شبكة الرسوم البيانية */}
            <div className="charts-grid">
                {/* الرسم البياني للوزن */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>
                            <span className="chart-icon">⚖️</span>
                            {t('charts.weightChartTitle')}
                        </h3>
                        <div className="chart-legend">
                            <span className="legend-item">
                                <span className="legend-color" style={{backgroundColor: '#3b82f6'}}></span>
                                {t('charts.weightLegend')}
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <Line 
                            data={weightData} 
                            options={getChartOptions(weightRange.min, weightRange.max)}
                        />
                    </div>
                    {weights.filter(w => w !== null).length > 0 && (
                        <div className="chart-footer">
                            <span className="chart-stat">
                                {t('charts.min')}: {Math.min(...weights.filter(w => w !== null)).toFixed(1)} kg
                            </span>
                            <span className="chart-stat">
                                {t('charts.max')}: {Math.max(...weights.filter(w => w !== null)).toFixed(1)} kg
                            </span>
                        </div>
                    )}
                </div>

                {/* الرسم البياني لضغط الدم */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>
                            <span className="chart-icon">❤️</span>
                            {t('charts.bloodPressureTitle')}
                        </h3>
                        <div className="chart-legend">
                            <span className="legend-item">
                                <span className="legend-color" style={{backgroundColor: '#ef4444'}}></span>
                                {t('charts.systolicLegend')}
                            </span>
                            <span className="legend-item">
                                <span className="legend-color" style={{backgroundColor: '#8b5cf6'}}></span>
                                {t('charts.diastolicLegend')}
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <Line 
                            data={bloodPressureData} 
                            options={getChartOptions(pressureRange.min, pressureRange.max)}
                        />
                    </div>
                    {systolic.filter(s => s !== null).length > 0 && (
                        <div className="chart-footer">
                            <span className="chart-stat">
                                {t('charts.systolic')}: {Math.min(...systolic.filter(s => s !== null))} - {Math.max(...systolic.filter(s => s !== null))}
                            </span>
                            <span className="chart-stat">
                                {t('charts.diastolic')}: {Math.min(...diastolic.filter(d => d !== null))} - {Math.max(...diastolic.filter(d => d !== null))}
                            </span>
                        </div>
                    )}
                </div>

                {/* الرسم البياني للجلوكوز */}
                {glucose.some(val => val !== null) && (
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>
                                <span className="chart-icon">🩸</span>
                                {t('charts.glucoseTitle')}
                            </h3>
                            <div className="chart-legend">
                                <span className="legend-item">
                                    <span className="legend-color" style={{backgroundColor: '#10b981'}}></span>
                                    {t('charts.glucoseLegend')}
                                </span>
                            </div>
                        </div>
                        <div className="chart-container">
                            <Line 
                                data={glucoseData} 
                                options={getChartOptions(glucoseRange.min, glucoseRange.max)}
                            />
                        </div>
                        {glucose.filter(g => g !== null).length > 0 && (
                            <div className="chart-footer">
                                <span className="chart-stat">
                                    {t('charts.min')}: {Math.min(...glucose.filter(g => g !== null)).toFixed(1)} mg/dL
                                </span>
                                <span className="chart-stat">
                                    {t('charts.max')}: {Math.max(...glucose.filter(g => g !== null)).toFixed(1)} mg/dL
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
 /* ===========================================
   HealthCharts.css - محسن للجوال والشاشات الكبيرة
   =========================================== */

/* الثيم الفاتح */
:root {
    --primary-bg: #ffffff;
    --secondary-bg: #f8fafc;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #64748b;
    --border-light: #e2e8f0;
    --border-medium: #cbd5e1;
    --primary-color: #3b82f6;
    --primary-dark: #2563eb;
    --primary-light: #60a5fa;
    --success-color: #10b981;
    --error-color: #ef4444;
    --warning-color: #f59e0b;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --transition-slow: 0.5s ease;
}

/* الثيم المظلم */
.dark-mode {
    --primary-bg: #0f172a;
    --secondary-bg: #1e293b;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-light: #334155;
    --border-medium: #475569;
    --primary-color: #60a5fa;
    --primary-dark: #3b82f6;
    --primary-light: #93c5fd;
    --success-color: #4ade80;
    --error-color: #f87171;
    --warning-color: #fbbf24;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
}

.health-charts-container {
    background: var(--card-bg);
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-xl);
    margin-top: 2rem;
    transition: all var(--transition-medium);
}

/* ===========================================
   رأس الرسوم البيانية
   =========================================== */
.charts-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
    gap: 1rem;
}

.header-main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
}

.charts-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--text-primary);
    font-size: 1.6rem;
    font-weight: 700;
}

.header-icon {
    font-size: 2rem;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.charts-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.controls-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.refresh-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-medium);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
}

.refresh-btn:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.refresh-btn:active {
    transform: translateY(0);
}

.refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.refresh-btn.loading {
    background: var(--text-tertiary);
}

.charts-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--secondary-bg);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    border: 1px solid var(--border-light);
    transition: all var(--transition-fast);
}

.stat:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
}

.stat-icon {
    font-size: 1.1rem;
}

.stat-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.stat-value {
    color: var(--primary-color);
    font-weight: 700;
    font-size: 1rem;
}

/* ===========================================
   شبكة الرسوم البيانية
   =========================================== */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 2rem;
}

/* ===========================================
   بطاقة الرسم البياني
   =========================================== */
.chart-card {
    background: var(--secondary-bg);
    border-radius: 20px;
    padding: 1.5rem;
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
}

.chart-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-color), var(--success-color));
    transform: translateX(-100%);
    transition: transform var(--transition-medium);
}

.chart-card:hover::before {
    transform: translateX(0);
}

.chart-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--primary-color);
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.chart-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
}

.chart-icon {
    font-size: 1.4rem;
}

.chart-legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    padding: 0.25rem 0.5rem;
    background: var(--card-bg);
    border-radius: 20px;
    transition: all var(--transition-fast);
}

.legend-item:hover {
    transform: translateY(-1px);
}

.legend-color {
    width: 10px;
    height: 10px;
    border-radius: 2px;
}

.chart-container {
    height: 280px;
    margin: 1rem 0;
    position: relative;
}

.chart-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light);
    flex-wrap: wrap;
    gap: 0.5rem;
}

.chart-stat {
    color: var(--text-tertiary);
    font-size: 0.8rem;
    background: var(--card-bg);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    transition: all var(--transition-fast);
}

.chart-stat:hover {
    color: var(--text-primary);
    background: var(--primary-light);
}

/* ===========================================
   حالات التحميل والخطأ
   =========================================== */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: var(--card-bg);
    border-radius: 28px;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-lg);
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-container p {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

/* حالات الخطأ */
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: var(--card-bg);
    border-radius: 28px;
    border: 1px solid var(--border-light);
    text-align: center;
    padding: 2rem;
}

.error-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.error-container p {
    color: var(--error-color);
    margin-bottom: 1.5rem;
    max-width: 300px;
}

.retry-btn {
    padding: 0.6rem 1.5rem;
    background: var(--error-color);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--transition-medium);
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.retry-btn:active {
    transform: translateY(0);
}

/* حالة عدم وجود بيانات كافية */
.insufficient-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: var(--card-bg);
    border-radius: 28px;
    border: 1px solid var(--border-light);
    text-align: center;
    padding: 2rem;
}

.data-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    animation: float 3s infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}

.insufficient-data h3 {
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    font-size: 1.3rem;
}

.insufficient-data p {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.insufficient-data .hint {
    color: var(--text-tertiary);
    font-size: 0.85rem;
    margin-top: 0.5rem;
}

/* ===========================================
   RTL دعم
   =========================================== */
[dir="rtl"] .charts-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .stat {
    flex-direction: row-reverse;
}

[dir="rtl"] .chart-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .legend-item {
    flex-direction: row-reverse;
}

[dir="rtl"] .chart-footer {
    flex-direction: row-reverse;
}

/* ===========================================
   تصميم متجاوب
   =========================================== */
@media (max-width: 1024px) {
    .charts-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    
    .chart-container {
        height: 260px;
    }
}

@media (max-width: 768px) {
    .health-charts-container {
        padding: 1.25rem;
        border-radius: 20px;
    }

    .charts-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }

    .header-main {
        gap: 0.75rem;
    }

    .charts-header h2 {
        font-size: 1.3rem;
    }

    .charts-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .controls-group {
        width: 100%;
        justify-content: space-between;
    }

    .refresh-btn {
        width: 100%;
        justify-content: center;
    }

    .charts-stats {
        justify-content: flex-start;
        flex-wrap: wrap;
    }

    .stat {
        padding: 0.4rem 0.8rem;
    }

    .stat-icon {
        font-size: 1rem;
    }

    .stat-label {
        font-size: 0.8rem;
    }

    .stat-value {
        font-size: 0.9rem;
    }

    .chart-card {
        padding: 1.25rem;
        border-radius: 16px;
    }

    .chart-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .chart-header h3 {
        font-size: 1rem;
    }

    .chart-icon {
        font-size: 1.2rem;
    }

    .chart-legend {
        gap: 0.75rem;
    }

    .legend-item {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
    }

    .chart-container {
        height: 220px;
        margin: 0.75rem 0;
    }

    .chart-footer {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
    }

    .chart-stat {
        font-size: 0.7rem;
        padding: 0.2rem 0.6rem;
    }
}

@media (max-width: 480px) {
    .health-charts-container {
        padding: 1rem;
        border-radius: 16px;
        margin-top: 1rem;
    }

    .charts-header h2 {
        font-size: 1.2rem;
    }

    .header-icon {
        font-size: 1.6rem;
    }

    .stat {
        padding: 0.3rem 0.6rem;
    }

    .stat-icon {
        font-size: 0.9rem;
    }

    .stat-label {
        font-size: 0.7rem;
    }

    .stat-value {
        font-size: 0.85rem;
    }

    .chart-card {
        padding: 1rem;
    }

    .chart-header h3 {
        font-size: 0.95rem;
    }

    .chart-icon {
        font-size: 1.1rem;
    }

    .legend-item {
        font-size: 0.65rem;
    }

    .chart-container {
        height: 180px;
    }

    .loading-container,
    .error-container,
    .insufficient-data {
        min-height: 300px;
        padding: 1.5rem;
    }

    .data-icon {
        font-size: 3rem;
    }

    .insufficient-data h3 {
        font-size: 1.1rem;
    }

    .insufficient-data p {
        font-size: 0.8rem;
    }
}

/* الوضع الأفقي (Landscape) */
@media (max-height: 600px) and (orientation: landscape) {
    .health-charts-container {
        padding: 1rem;
    }

    .chart-container {
        height: 160px;
    }

    .charts-grid {
        gap: 1rem;
    }

    .chart-card {
        padding: 0.75rem;
    }

    .chart-header {
        margin-bottom: 0.5rem;
    }

    .loading-container,
    .error-container,
    .insufficient-data {
        min-height: 250px;
    }
}

/* للمستخدمين الذين يفضلون الحركة المنخفضة */
@media (prefers-reduced-motion: reduce) {
    .health-charts-container,
    .chart-card,
    .stat,
    .refresh-btn,
    .retry-btn {
        transition: none;
    }
    
    .chart-card::before {
        transition: none;
    }
    
    .spinner {
        animation: none;
    }
    
    .header-icon,
    .error-icon,
    .data-icon {
        animation: none;
    }
    
    .stat:hover,
    .chart-card:hover,
    .legend-item:hover {
        transform: none;
    }
}

/* تحسينات اللمس للأجهزة المحمولة */
@media (hover: none) and (pointer: coarse) {
    .refresh-btn:active,
    .retry-btn:active {
        transform: scale(0.96);
    }
    
    .chart-card:active {
        transform: scale(0.98);
    }
    
    .stat:active {
        transform: scale(0.97);
    }
}
            `}</style>
        </div>
    );
}

export default HealthCharts;