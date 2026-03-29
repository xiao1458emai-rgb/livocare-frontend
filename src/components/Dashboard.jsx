'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api'; 
import '../index.css';
// المكونات الأساسية
import HealthForm from './HealthForm';
import HealthHistory from './HealthHistory';
import HealthCharts from './HealthCharts';
import ActivityAnalytics from './Analytics/ActivityAnalytics';
// المكونات المحسنة
import Sidebar from './Sidebar';   
import NutritionMain from './nutrition/NutritionMain';
import SleepTracker from './SleepTracker';
import HabitTracker from './HabitTracker';
import ActivityForm from './ActivityForm';
import MoodTracker from './MoodTracker'; 
import ProfileManager from './usermangment'; 
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

function Dashboard() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    
    // الحالات
    const [healthRecords, setHealthRecords] = useState([]);
    const [latestHealthData, setLatestHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [activeSection, setActiveSection] = useState('health');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || prefersDark;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const html = document.documentElement;
            if (darkMode) {
                html.classList.add('dark-mode');
                document.body.style.backgroundColor = '#0a0f1f';
            } else {
                html.classList.remove('dark-mode');
                document.body.style.backgroundColor = '#f8fafc';
            }
        }
    }, [darkMode]);

    useEffect(() => {
        const checkAuth = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('access_token');
                setIsAuthReady(!!token);
            }
        };
        checkAuth();
    }, []);

const fetchHealthData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.log('⏳ No token yet, waiting...');
        setLoading(false);
        return;
    }
    
    try {
        const response = await axiosInstance.get('/health_status/');
        // ... باقي الكود
    } catch (err) {
        console.error('Error fetching health data:', err);
        if (err.response?.status === 401) {
            // Token غير صالح، ننتظر قليلاً
            setTimeout(() => fetchHealthData(), 1000);
            return;
        }
        setError(t('dashboard.fetchError'));
    } finally {
        setLoading(false);
    }
};


    useEffect(() => {
        if (isAuthReady) {
            fetchHealthData();
        }
    }, [refreshKey, isAuthReady]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = i18n.language;
            
            const handleLanguageChange = (e) => {
                document.documentElement.dir = e.detail.language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = e.detail.language;
            };
            
            window.addEventListener('languageChanged', handleLanguageChange);
            return () => window.removeEventListener('languageChanged', handleLanguageChange);
        }
    }, [isRTL, i18n.language]);
    
    const handleDataSubmitted = () => {
        setRefreshKey(prevKey => prevKey + 1); 
    };

    const displayValue = (value, unit = '') => {
        if (value === null || value === undefined || value === '' || value === 'N/A') {
            return '—';
        }
        return `${value} ${unit}`.trim();
    };

    const displayBloodPressure = (systolic, diastolic) => {
        if (systolic === null || diastolic === null || systolic === undefined || diastolic === undefined) {
            return '—';
        }
        return `${systolic} / ${diastolic}`;
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
        
        window.dispatchEvent(new CustomEvent('themeChange', { 
            detail: { darkMode: newDarkMode }
        }));
    };

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('livocare_language', lng);
        localStorage.setItem('language', lng);
        
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lng, direction: lng === 'ar' ? 'rtl' : 'ltr' }
        }));
    };

    const getTodayDate = () => {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        if (i18n.language === 'ar') {
            return today.toLocaleDateString('ar-EG', options);
        } else {
            return today.toLocaleDateString('en-US', options);
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const renderSectionContent = () => {
        const healthSectionContent = (
            <div className="health-section">
                <div className="summary-section">
                    <div className="summary-header">
                        <h3>
                            {latestHealthData 
                                ? `📊 ${t('dashboard.dailySummary')}`
                                : `📊 ${t('dashboard.dailySummary')}`
                            }
                        </h3>
                        <span className="summary-date">{getTodayDate()}</span>
                    </div>
                    
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="card-icon">⚖️</div>
                            <div className="card-content">
                                <h4>{t('dashboard.lastWeight')}</h4>
                                <p className="card-value">
                                    {displayValue(latestHealthData?.weight, t('dashboard.kg'))}
                                </p>
                                {latestHealthData?.recorded_at && (
                                    <div className="card-time">
                                        {new Date(latestHealthData.recorded_at).toLocaleTimeString(
                                            i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                                            { hour: '2-digit', minute: '2-digit' }
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="card-glow"></div>
                        </div>
                        
                        <div className="summary-card">
                            <div className="card-icon">❤️</div>
                            <div className="card-content">
                                <h4>{t('dashboard.bloodPressure')}</h4>
                                <p className="card-value">
                                    {displayBloodPressure(latestHealthData?.systolic, latestHealthData?.diastolic)}
                                </p>
                                <small>{t('dashboard.sysDia')}</small>
                            </div>
                            <div className="card-glow"></div>
                        </div>
                        
                        <div className="summary-card">
                            <div className="card-icon">🩸</div>
                            <div className="card-content">
                                <h4>{t('dashboard.bloodGlucose')}</h4>
                                <p className="card-value">
                                    {displayValue(latestHealthData?.glucose, t('mg/dl'))}
                                </p>
                                <small>{t('dashboard.glucoseLevel')}</small>
                            </div>
                            <div className="card-glow"></div>
                        </div>
                    </div>
                    
                    {!latestHealthData && healthRecords.length === 0 && (
                        <div className="no-data-message">
                            <div className="no-data-icon">📊</div>
                            <h4>{t('dashboard.noDataTitle')}</h4>
                            <p>{t('dashboard.noDataMessage')}</p>
                            <button 
                                onClick={() => document.querySelector('.health-form')?.scrollIntoView({ behavior: 'smooth' })}
                                className="add-data-btn"
                            >
                                ➕ {t('dashboard.addFirstReading')}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="health-components">
                    <div className="health-form">
                        <HealthForm onDataSubmitted={handleDataSubmitted} />
                    </div>
                    
                    <ActivityForm onDataSubmitted={handleDataSubmitted} />
                    
                    <div className="activity-analytics-wrapper">
                        <ActivityAnalytics refreshTrigger={refreshKey} />
                        <AdvancedHealthInsights refreshTrigger={refreshKey} />
                    </div>
                    
                    <HealthHistory refreshKey={refreshKey} onDataSubmitted={handleDataSubmitted} />
                    <HealthCharts refreshKey={refreshKey} />
                </div>
            </div>
        );

        switch (activeSection) {
            case 'health':
                return healthSectionContent;
            case 'nutrition':
                return <NutritionMain onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'sleep':
                return <SleepTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'habits':
                return <HabitTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'mood':
                return <MoodTracker isAuthReady={isAuthReady} />;
            case 'chat':
                return <ChatInterface isAuthReady={isAuthReady} />;
            case 'profile':
                return <ProfileManager onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'smart':
                return <SmartDashboard />;
            case 'notifications':
                return <Notifications isAuthReady={isAuthReady} />;
            case 'reports':
                return <Reports isAuthReady={isAuthReady} />;
            default:
                return null;
        }
    };

    const getSectionTitle = (sectionKey) => {
        const titles = {
            'health': `📊 ${t('dashboard.dashboard')}`,
            'nutrition': `🥗 ${t('dashboard.nutritionTitle')}`,
            'sleep': `🌙 ${t('dashboard.sleepTitle')}`,
            'habits': `💊 ${t('dashboard.habitsTitle')}`,
            'mood': `😊 ${t('dashboard.moodTitle')}`,
            'chat': `💬 ${t('dashboard.chatTitle')}`,
            'smart': `🧠 الميزات الذكية`,
            'profile': `👤 ${t('dashboard.profileTitle')}`,
            'reports': `📊 التقارير`,
            'notifications': `🔔 الإشعارات`
        };
        return titles[sectionKey] || t('dashboard.dashboard');
    };
    
    if (loading) {
        return (
            <div className={`loading-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-spinner"></div>
                <h2>{t('dashboard.loadingSummary')}</h2>
                <p>{t('dashboard.pleaseWait')}</p>
            </div>
        );
    }

    if (error && healthRecords.length === 0) {
        return (
            <div className={`error-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-icon">⚠️</div>
                <h2>{error}</h2>
                <button onClick={fetchHealthData} className="retry-btn">
                    🔄 {t('dashboard.retry')}
                </button>
            </div>
        );
    }

    return (
        <div className={`dashboard-layout ${darkMode ? 'dark-mode' : ''}`}>
            {/* شريط التحكم */}
            <div className="control-bar">
                <div className="control-left">
                    <button 
                        className="menu-toggle"
                        onClick={toggleSidebar}
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? '✕' : '☰'}
                    </button>
                    <div className="app-name">LivoCare</div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">{getTodayDate()}</div>
                </div>
                
                <div className="control-right">
                    <button 
                        className="theme-toggle"
                        onClick={toggleDarkMode}
                        title={darkMode ? t('dashboard.switchToLight') : t('dashboard.switchToDark')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* السايدبار */}
            <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <Sidebar 
                    activeSection={activeSection} 
                    onSectionChange={(section) => {
                        setActiveSection(section);
                        setSidebarOpen(false);
                    }}
                />
            </div>
            
            {/* Overlay للجوال */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            )}

            {/* المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <h1>{getSectionTitle(activeSection)}</h1>
                    {latestHealthData?.recorded_at && (
                        <div className="last-updated">
                            {t('dashboard.lastUpdated')}: {new Date(latestHealthData.recorded_at).toLocaleDateString(
                                i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                            )}
                        </div>
                    )}
                </div>

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>

            <style jsx>{`
                /* ===========================================
                   Dashboard.css - محسن للشاشات الكبيرة والصغيرة
                   =========================================== */

                /* الثيم الفاتح */
                :root {
                    --primary-bg: #f8fafc;
                    --secondary-bg: #f1f5f9;
                    --card-bg: #ffffff;
                    --text-primary: #0f172a;
                    --text-secondary: #475569;
                    --text-tertiary: #64748b;
                    --border-light: #e2e8f0;
                    --border-medium: #cbd5e1;
                    --primary-color: #3b82f6;
                    --primary-dark: #2563eb;
                    --primary-light: #60a5fa;
                    --success-color: #22c55e;
                    --error-color: #ef4444;
                    --warning-color: #f59e0b;
                    --info-color: #3b82f6;
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
                    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
                    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
                    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
                    --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
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
                    --info-color: #60a5fa;
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
                    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
                    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
                    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
                }

                /* تخطيط عام */
                .dashboard-layout {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: all var(--transition-slow);
                    position: relative;
                }

                /* شريط التحكم */
                .control-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 70px;
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 2rem;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    box-shadow: var(--shadow-md);
                }

                .control-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .menu-toggle {
                    display: none;
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 10px;
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    -webkit-tap-highlight-color: transparent;
                }

                .menu-toggle:active {
                    transform: scale(0.95);
                }

                .app-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .control-center {
                    flex: 1;
                    text-align: center;
                }

                .date-display {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg);
                    border-radius: 50px;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    border: 1px solid var(--border-light);
                }

                .control-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .theme-toggle {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 10px;
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    -webkit-tap-highlight-color: transparent;
                }

                .theme-toggle:active {
                    transform: rotate(15deg) scale(0.95);
                }

                /* السايدبار - إعدادات أساسية */
                .sidebar-wrapper {
                    position: fixed;
                    top: 70px;
                    bottom: 0;
                    width: 280px;
                    z-index: 999;
                    transition: transform var(--transition-medium);
                }

                [dir="ltr"] .sidebar-wrapper {
                    left: 0;
                    transform: translateX(-100%);
                }

                [dir="rtl"] .sidebar-wrapper {
                    right: 0;
                    transform: translateX(100%);
                }

                .sidebar-wrapper.open {
                    transform: translateX(0);
                }

                /* Overlay للجوال */
                .sidebar-overlay {
                    position: fixed;
                    top: 70px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 998;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                /* المحتوى الرئيسي - إعدادات أساسية */
                .dashboard-content {
                    margin-top: 70px;
                    padding: 2rem;
                    min-height: calc(100vh - 70px);
                    background: var(--primary-bg);
                    transition: margin var(--transition-medium);
                }

                [dir="ltr"] .dashboard-content {
                    margin-left: 0;
                }

                [dir="rtl"] .dashboard-content {
                    margin-right: 0;
                }

                /* ===========================================
                   تحسينات للشاشات الكبيرة (Desktop)
                   =========================================== */
                @media (min-width: 1025px) {
                    /* إظهار السايدبار بشكل دائم */
                    .sidebar-wrapper {
                        transform: translateX(0) !important;
                    }

                    /* إخفاء زر القائمة */
                    .menu-toggle {
                        display: none !important;
                    }

                    /* المحتوى الرئيسي مع وجود السايدبار */
                    [dir="ltr"] .dashboard-content {
                        margin-left: 280px !important;
                    }

                    [dir="rtl"] .dashboard-content {
                        margin-right: 280px !important;
                    }

                    /* تحسين توزيع البطاقات */
                    .summary-cards {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1.5rem;
                    }

                    .summary-card {
                        padding: 1.5rem;
                    }

                    .card-icon {
                        width: 70px;
                        height: 70px;
                        font-size: 2rem;
                    }

                    .card-value {
                        font-size: 2rem;
                    }
                }

                /* للشاشات الكبيرة جداً (أكبر من 1400px) */
                @media (min-width: 1400px) {
                    .sidebar-wrapper {
                        width: 320px;
                    }

                    [dir="ltr"] .dashboard-content {
                        margin-left: 320px !important;
                    }

                    [dir="rtl"] .dashboard-content {
                        margin-right: 320px !important;
                    }

                    .dashboard-content {
                        padding: 2rem 3rem;
                    }

                    .summary-cards {
                        gap: 2rem;
                    }

                    .section-header h1 {
                        font-size: 2.2rem;
                    }
                }

                /* للشاشات المتوسطة (بين 768 و 1024) */
                @media (min-width: 768px) and (max-width: 1024px) {
                    .sidebar-wrapper {
                        width: 260px;
                    }

                    [dir="ltr"] .dashboard-content {
                        margin-left: 260px !important;
                    }

                    [dir="rtl"] .dashboard-content {
                        margin-right: 260px !important;
                    }

                    .dashboard-content {
                        padding: 1.5rem;
                    }

                    .summary-cards {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                    }

                    .card-icon {
                        width: 60px;
                        height: 60px;
                        font-size: 1.6rem;
                    }

                    .card-value {
                        font-size: 1.6rem;
                    }
                }

                /* ===========================================
                   تحسينات للشاشات الصغيرة (Mobile)
                   =========================================== */
                @media (max-width: 767px) {
                    .control-bar {
                        height: 60px;
                        padding: 0 1rem;
                    }

                    .menu-toggle {
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }

                    .app-name {
                        font-size: 1.2rem;
                    }

                    .date-display {
                        display: none;
                    }

                    .dashboard-content {
                        margin-top: 60px;
                        padding: 1rem;
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.75rem;
                        margin-bottom: 1.5rem;
                    }

                    .section-header h1 {
                        font-size: 1.3rem;
                    }

                    .last-updated {
                        font-size: 0.75rem;
                        padding: 0.3rem 0.8rem;
                    }

                    .summary-section {
                        padding: 1.25rem;
                        border-radius: 20px;
                    }

                    .summary-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .summary-header h3 {
                        font-size: 1.1rem;
                    }

                    .summary-cards {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .summary-card {
                        padding: 1rem;
                        gap: 1rem;
                        flex-direction: row;
                    }

                    .card-icon {
                        width: 55px;
                        height: 55px;
                        font-size: 1.6rem;
                        border-radius: 14px;
                    }

                    .card-value {
                        font-size: 1.5rem;
                    }

                    .activity-analytics-wrapper {
                        padding: 1rem;
                        border-radius: 20px;
                        margin: 1.5rem 0;
                    }

                    .no-data-message {
                        padding: 2rem 1rem;
                    }

                    .no-data-icon {
                        font-size: 3rem;
                    }

                    .add-data-btn {
                        padding: 0.6rem 1.2rem;
                        font-size: 0.9rem;
                    }
                }

                /* للشاشات الصغيرة جداً (أقل من 480px) */
                @media (max-width: 480px) {
                    .dashboard-content {
                        padding: 0.75rem;
                    }

                    .section-header h1 {
                        font-size: 1.2rem;
                    }

                    .summary-section {
                        padding: 1rem;
                        border-radius: 16px;
                    }

                    .summary-card {
                        flex-direction: column;
                        text-align: center;
                        gap: 0.75rem;
                        padding: 1rem;
                    }

                    .card-icon {
                        margin: 0 auto;
                        width: 50px;
                        height: 50px;
                        font-size: 1.5rem;
                    }

                    .card-value {
                        font-size: 1.3rem;
                    }

                    .control-right {
                        gap: 0.5rem;
                    }

                    .theme-toggle {
                        width: 36px;
                        height: 36px;
                        font-size: 1rem;
                    }

                    .loading-spinner {
                        width: 50px;
                        height: 50px;
                    }

                    .loading-dashboard h2 {
                        font-size: 1.1rem;
                    }

                    .error-icon {
                        font-size: 3rem;
                    }
                }

                /* الوضع الأفقي (Landscape) */
                @media (max-height: 600px) and (orientation: landscape) {
                    .control-bar {
                        height: 55px;
                    }

                    .dashboard-content {
                        margin-top: 55px;
                    }

                    .summary-section {
                        padding: 1rem;
                    }

                    .summary-cards {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.75rem;
                    }

                    .summary-card {
                        padding: 0.75rem;
                        flex-direction: column;
                        text-align: center;
                    }

                    .card-icon {
                        width: 45px;
                        height: 45px;
                        font-size: 1.3rem;
                    }

                    .card-value {
                        font-size: 1.2rem;
                    }
                }

                /* رأس القسم */
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .section-header h1 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.8rem;
                    font-weight: 700;
                }

                .last-updated {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg);
                    border-radius: 50px;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    border: 1px solid var(--border-light);
                }

                /* قسم الملخص */
                .summary-section {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-lg);
                }

                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .summary-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .summary-date {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    padding: 0.25rem 0.75rem;
                    background: var(--secondary-bg);
                    border-radius: 50px;
                }

                /* بطاقات الملخص */
                .summary-cards {
                    display: grid;
                    gap: 1.5rem;
                }

                .summary-card {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                }

                .summary-card:active {
                    transform: scale(0.98);
                }

                .summary-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--primary-color);
                }

                .card-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 100%;
                    background: radial-gradient(circle at 50% 0%, var(--primary-color) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity var(--transition-medium);
                    pointer-events: none;
                }

                .summary-card:hover .card-glow {
                    opacity: 0.1;
                }

                .card-icon {
                    background: var(--card-bg);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-md);
                    transition: all var(--transition-medium);
                }

                .summary-card:hover .card-icon {
                    transform: scale(1.1) rotate(5deg);
                    background: var(--primary-color);
                    color: white;
                }

                .card-content {
                    flex: 1;
                }

                .card-content h4 {
                    margin: 0 0 0.5rem 0;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .card-value {
                    margin: 0 0 0.25rem 0;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .card-time {
                    color: var(--text-tertiary);
                    font-size: 0.75rem;
                }

                .card-content small {
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                }

                /* رسالة عدم وجود بيانات */
                .no-data-message {
                    text-align: center;
                    padding: 3rem;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    border: 2px dashed var(--border-light);
                    margin-top: 2rem;
                }

                .no-data-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .no-data-message h4 {
                    margin: 0 0 0.5rem 0;
                    color: var(--text-primary);
                    font-size: 1.2rem;
                }

                .no-data-message p {
                    margin: 0 0 1.5rem 0;
                    color: var(--text-secondary);
                }

                .add-data-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--gradient-primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    -webkit-tap-highlight-color: transparent;
                }

                .add-data-btn:active {
                    transform: scale(0.96);
                }

                /* قسم التحليلات */
                .activity-analytics-wrapper {
                    margin: 2rem 0;
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 2rem;
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-lg);
                }

                /* حالات التحميل */
                .loading-dashboard {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--primary-bg);
                }

                .loading-spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid var(--border-light);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1.5rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .loading-dashboard h2 {
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                    font-size: 1.3rem;
                }

                .loading-dashboard p {
                    color: var(--text-secondary);
                }

                /* حالة الخطأ */
                .error-dashboard {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--primary-bg);
                    padding: 2rem;
                    text-align: center;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                .error-dashboard h2 {
                    color: var(--error-color);
                    margin-bottom: 1.5rem;
                    font-size: 1.2rem;
                }

                .retry-btn {
                    padding: 0.75rem 2rem;
                    background: var(--error-color);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    -webkit-tap-highlight-color: transparent;
                }

                .retry-btn:active {
                    transform: scale(0.96);
                }

                /* للمستخدمين الذين يفضلون الحركة المنخفضة */
                @media (prefers-reduced-motion: reduce) {
                    .summary-card:hover,
                    .add-data-btn:hover,
                    .retry-btn:hover {
                        transform: none;
                        animation: none;
                    }

                    .loading-spinner {
                        animation: none;
                    }

                    .error-icon {
                        animation: none;
                    }
                }

                /* تحسينات اللمس للأجهزة المحمولة */
                @media (hover: none) and (pointer: coarse) {
                    .summary-card:hover {
                        transform: none;
                    }

                    .add-data-btn:active,
                    .retry-btn:active,
                    .theme-toggle:active,
                    .menu-toggle:active {
                        transform: scale(0.96);
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;