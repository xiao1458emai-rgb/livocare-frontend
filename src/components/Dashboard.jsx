'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api'; 
import '../index.css';

// المكونات الأساسية
import HealthForm from './HealthForm';
import HealthHistory from './HealthHistory';
import HealthCharts from './HealthCharts';
import ActivityAnalytics from './Analytics/ActivityAnalytics';
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

function Dashboard({ onLogout }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRTL = i18n.language === 'ar';
    
    // useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const refreshIntervalRef = useRef(null);
    const isFetchingRef = useRef(false);
    
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

    // تطبيق الوضع المظلم
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const html = document.documentElement;
            if (darkMode) {
                html.classList.add('dark-mode');
            } else {
                html.classList.remove('dark-mode');
            }
        }
    }, [darkMode]);

    // التحقق من المصادقة
    useEffect(() => {
        let isActive = true;
        
        const checkAuth = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('access_token');
                if (isActive) {
                    setIsAuthReady(!!token);
                    if (!token) {
                        navigate('/');
                    }
                }
            }
        };
        
        checkAuth();
        
        return () => { isActive = false; };
    }, [navigate]);

    // جلب البيانات
    const fetchHealthData = useCallback(async () => {
        console.log('🔄 fetchHealthData called, refreshKey:', refreshKey);
        
        if (!isAuthReady || !isMountedRef.current || isFetchingRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/health_status/');
            console.log('📊 API Response:', response.data);
            
            if (!isMountedRef.current) return;
            
            let records = [];
            if (response.data?.results) {
                records = response.data.results;
            } else if (Array.isArray(response.data)) {
                records = response.data;
            }
            
            console.log('📊 Processed records:', records.length);
            setHealthRecords(records);
            
            if (records.length > 0) {
                const sortedRecords = [...records].sort((a, b) => 
                    new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || a.created_at)
                );
                const latest = sortedRecords[0];
                
                setLatestHealthData({
                    weight: latest.weight_kg || null,
                    systolic: latest.systolic_pressure || null,
                    diastolic: latest.diastolic_pressure || null,
                    glucose: latest.glucose_mgdl || latest.blood_glucose || null,
                    recorded_at: latest.recorded_at || latest.created_at,
                    date: latest.recorded_at ? new Date(latest.recorded_at).toLocaleDateString('ar-EG') : null
                });
            } else {
                setLatestHealthData(null);
            }
            
            setError(null);
        } catch (err) {
            console.error('❌ Error fetching health data:', err);
            if (isMountedRef.current) {
                setError(err.response?.data?.message || t('dashboard.fetchError'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, t, refreshKey]);

    // جلب البيانات عند التغيير
    useEffect(() => {
        if (isAuthReady) {
            fetchHealthData();
        }
    }, [refreshKey, isAuthReady, fetchHealthData]);

    // إعدادات اللغة
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
    
    // تنظيف
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);
    
    const handleDataSubmitted = useCallback(() => {
        console.log('🔄 Data submitted, refreshing dashboard...');
        setRefreshKey(prev => prev + 1);
    }, []);

    const displayValue = (value, unit = '') => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        return `${numValue} ${unit}`.trim();
    };

    const displayBloodPressure = (systolic, diastolic) => {
        if (!systolic && systolic !== 0) return '—';
        if (!diastolic && diastolic !== 0) return '—';
        return `${systolic} / ${diastolic}`;
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: newDarkMode } }));
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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const renderSectionContent = () => {
        const healthSectionContent = (
            <div className="health-section">
                {/* بطاقات الملخص */}
                <div className="recommendations-section" style={{ marginTop: 0 }}>
                    <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                        <h3>📊 {t('dashboard.dailySummary')}</h3>
                        <span className="stat-label">{getTodayDate()}</span>
                    </div>
                    
                    <div className="analytics-stats-grid">
                        {/* الوزن */}
                        <div className="analytics-stat-card">
                            <div className="stat-icon">⚖️</div>
                            <div className="stat-content">
                                <div className="stat-label">{t('dashboard.lastWeight')}</div>
                                <div className="stat-value">
                                    {latestHealthData?.weight ? `${latestHealthData.weight} ${t('dashboard.kg')}` : '—'}
                                </div>
                                {latestHealthData?.recorded_at && (
                                    <div className="stat-label">
                                        {new Date(latestHealthData.recorded_at).toLocaleTimeString(
                                            i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                                            { hour: '2-digit', minute: '2-digit' }
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* ضغط الدم */}
                        <div className="analytics-stat-card">
                            <div className="stat-icon">❤️</div>
                            <div className="stat-content">
                                <div className="stat-label">{t('dashboard.bloodPressure')}</div>
                                <div className="stat-value">
                                    {displayBloodPressure(latestHealthData?.systolic, latestHealthData?.diastolic)}
                                </div>
                                <div className="stat-label">{t('dashboard.sysDia')}</div>
                            </div>
                        </div>
                        
                        {/* الجلوكوز */}
                        <div className="analytics-stat-card">
                            <div className="stat-icon">🩸</div>
                            <div className="stat-content">
                                <div className="stat-label">{t('dashboard.bloodGlucose')}</div>
                                <div className="stat-value">
                                    {displayValue(latestHealthData?.glucose, 'mg/dL')}
                                </div>
                                <div className="stat-label">{t('dashboard.glucoseLevel')}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* رسالة عدم وجود بيانات */}
                    {!latestHealthData && healthRecords.length === 0 && (
                        <div className="analytics-empty">
                            <div className="empty-icon">📊</div>
                            <h4>{t('dashboard.noDataTitle')}</h4>
                            <p>{t('dashboard.noDataMessage')}</p>
                            <button 
                                onClick={() => document.querySelector('.health-form')?.scrollIntoView({ behavior: 'smooth' })}
                                className="type-btn active"
                                style={{ marginTop: 'var(--spacing-md)' }}
                            >
                                ➕ {t('dashboard.addFirstReading')}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* المكونات */}
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
                return <ProfileManager isAuthReady={isAuthReady} />;
            case 'smart':
                return <SmartDashboard />;
            case 'notifications':
                return <Notifications isAuthReady={isAuthReady} />;
            case 'reports':
                return <Reports isAuthReady={isAuthReady} />;
            default:
                return healthSectionContent;
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
            'notifications': `🔔 ${t('notifications.title')}`,
            'reports': `📊 ${t('reports.title')}`
        };
        return titles[sectionKey] || t('dashboard.dashboard');
    };
    
    // حالة التحميل
    if (loading && healthRecords.length === 0) {
        return (
            <div className="analytics-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <h2>{t('dashboard.loadingSummary')}</h2>
                    <p>{t('dashboard.pleaseWait')}</p>
                </div>
            </div>
        );
    }

    // حالة الخطأ
    if (error && healthRecords.length === 0) {
        return (
            <div className="analytics-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="analytics-error">
                    <div className="empty-icon">⚠️</div>
                    <h2>{error}</h2>
                    <button onClick={fetchHealthData} className="retry-btn">
                        🔄 {t('dashboard.retry')}
                    </button>
                </div>
            </div>
        );
    }

    // العرض الرئيسي
    return (
        <div className="dashboard-layout">
            {/* شريط التحكم العلوي */}
            <div className="control-bar">
                <div className="control-left">
                    <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
                        {sidebarOpen ? '✕' : '☰'}
                    </button>
                    <div className="app-name">LivoCare</div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">{getTodayDate()}</div>
                </div>
                
                <div className="control-right">
                    <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? '☀️' : '🌙'}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    <button className="logout-btn" onClick={onLogout} title={t('dashboard.logout')}>
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">{t('dashboard.logout')}</span>
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
            {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

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
        </div>
    );
}

export default Dashboard;