// src/components/Dashboard.jsx
'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import ProfileManager from './usermangment';  // ✅ تصحيح المسار
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

function Dashboard({ onLogout }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const navigate = useNavigate();
    const isRTL = isArabic;
    
    const isMountedRef = useRef(true);
    const refreshIntervalRef = useRef(null);
    const isFetchingRef = useRef(false);
    
    const [healthRecords, setHealthRecords] = useState([]);
    const [latestHealthData, setLatestHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [activeSection, setActiveSection] = useState('health');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || prefersDark;
        }
        return false;
    });

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // تحديث اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

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
        if (!isAuthReady || !isMountedRef.current || isFetchingRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/health_status/');
            
            if (!isMountedRef.current) return;
            
            let records = [];
            if (response.data?.results) {
                records = response.data.results;
            } else if (Array.isArray(response.data)) {
                records = response.data;
            }
            
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
                    recorded_at: latest.recorded_at || latest.created_at
                });
            } else {
                setLatestHealthData(null);
            }
            
            setError(null);
        } catch (err) {
            console.error('Error fetching health data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'حدث خطأ في جلب البيانات' : 'Error fetching data');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic]);

    // جلب البيانات عند التغيير
    useEffect(() => {
        if (isAuthReady) {
            fetchHealthData();
        }
    }, [refreshKey, isAuthReady, fetchHealthData]);

    // التحديث التلقائي
    useEffect(() => {
        if (!autoRefresh || !isAuthReady) return;
        
        refreshIntervalRef.current = setInterval(() => {
            setRefreshKey(prev => prev + 1);
        }, 60000);
        
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefresh, isAuthReady]);

    // ✅ إعدادات اللغة الأولية - تطبيق اللغة من localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLang = localStorage.getItem('app_lang');
            const currentLang = savedLang === 'en' ? 'en' : 'ar';
            const isCurrentArabic = currentLang === 'ar';
            document.documentElement.dir = isCurrentArabic ? 'rtl' : 'ltr';
            document.documentElement.lang = isCurrentArabic ? 'ar' : 'en';
        }
    }, []);
    
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
        setRefreshKey(prev => prev + 1);
    }, []);

    const displayValue = (value, unit = '') => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        return `${value} ${unit}`.trim();
    };

    const displayBloodPressure = (systolic, diastolic) => {
        if ((!systolic && systolic !== 0) || systolic === null) return '—';
        if ((!diastolic && diastolic !== 0) || diastolic === null) return '—';
        return `${systolic} / ${diastolic} mmHg`;
    };

    const getTodayDate = () => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: newDarkMode } }));
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleManualRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const getMeasuredCount = () => {
        let count = 0;
        if (latestHealthData?.weight !== null && latestHealthData?.weight !== undefined) count++;
        if (latestHealthData?.systolic !== null && latestHealthData?.systolic !== undefined) count++;
        if (latestHealthData?.diastolic !== null && latestHealthData?.diastolic !== undefined) count++;
        if (latestHealthData?.glucose !== null && latestHealthData?.glucose !== undefined) count++;
        return count;
    };

    const getSectionTitle = (sectionKey) => {
        const titles = {
            'health': isArabic ? 'لوحة التحكم' : 'Dashboard',
            'nutrition': isArabic ? 'التغذية' : 'Nutrition',
            'sleep': isArabic ? 'النوم' : 'Sleep',
            'habits': isArabic ? 'العادات' : 'Habits',
            'mood': isArabic ? 'المزاج' : 'Mood',
            'chat': isArabic ? 'المساعد الذكي' : 'AI Assistant',
            'profile': isArabic ? 'الملف الشخصي' : 'Profile',
            'smart': isArabic ? 'الميزات الذكية' : 'Smart Features',
            'notifications': isArabic ? 'الإشعارات' : 'Notifications',
            'reports': isArabic ? 'التقارير' : 'Reports'
        };
        return titles[sectionKey] || (isArabic ? 'لوحة التحكم' : 'Dashboard');
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'health':
                return (
                    <div className="health-section">
                        <div className="recommendations-section" style={{ marginTop: 0 }}>
                            <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                                <h3>{isArabic ? 'ملخص اليوم' : 'Daily Summary'}</h3>
                                <span className="stat-label">{getTodayDate()}</span>
                            </div>
                            
                            <div className="type-filters" style={{ marginBottom: 'var(--spacing-md)', justifyContent: 'flex-start' }}>
                                <span className="type-btn" style={{ background: 'var(--secondary-bg)', cursor: 'default' }}>
                                    📋 {getMeasuredCount()}/4 {isArabic ? 'قياسات مسجلة' : 'Measurements Recorded'}
                                </span>
                                {getMeasuredCount() < 4 && (
                                    <span className="type-btn" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', cursor: 'default' }}>
                                        💡 {isArabic ? 'يمكنك ترك الحقول الفارغة للقياسات التي لم تجريها' : 'You can leave empty fields for measurements you haven\'t taken'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="analytics-stats-grid">
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">⚖️</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'آخر وزن' : 'Last Weight'}</div>
                                        <div className="stat-value">
                                            {displayValue(latestHealthData?.weight, isArabic ? 'كجم' : 'kg')}
                                        </div>
                                        {latestHealthData?.weight === null && (
                                            <div className="stat-label" style={{ color: 'var(--warning)' }}>⚠️ {isArabic ? 'لم يتم القياس' : 'Not measured'}</div>
                                        )}
                                        {latestHealthData?.recorded_at && latestHealthData?.weight !== null && (
                                            <div className="stat-label">
                                                {new Date(latestHealthData.recorded_at).toLocaleTimeString(
                                                    isArabic ? 'ar-EG' : 'en-US',
                                                    { hour: '2-digit', minute: '2-digit' }
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">❤️</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                                        <div className="stat-value">
                                            {displayBloodPressure(latestHealthData?.systolic, latestHealthData?.diastolic)}
                                        </div>
                                        {(!latestHealthData?.systolic || !latestHealthData?.diastolic) && (
                                            <div className="stat-label" style={{ color: 'var(--warning)' }}>⚠️ {isArabic ? 'لم يتم القياس' : 'Not measured'}</div>
                                        )}
                                        <div className="stat-label">{isArabic ? 'انقباضي / انبساطي' : 'Systolic / Diastolic'}</div>
                                    </div>
                                </div>
                                
                                <div className="analytics-stat-card">
                                    <div className="stat-icon">🩸</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</div>
                                        <div className="stat-value">
                                            {displayValue(latestHealthData?.glucose, 'mg/dL')}
                                        </div>
                                        {latestHealthData?.glucose === null && (
                                            <div className="stat-label" style={{ color: 'var(--warning)' }}>⚠️ {isArabic ? 'لم يتم القياس' : 'Not measured'}</div>
                                        )}
                                        <div className="stat-label">{isArabic ? 'مستوى السكر' : 'Glucose Level'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {getMeasuredCount() === 0 && (
                                <div className="analytics-empty" style={{ marginTop: 'var(--spacing-lg)' }}>
                                    <div className="empty-icon">📊</div>
                                    <h4>{isArabic ? 'لا توجد بيانات صحية' : 'No Health Data'}</h4>
                                    <p>{isArabic ? 'أضف قراءاتك الصحية الأولى' : 'Add your first health readings'}</p>
                                    <button 
                                        onClick={() => document.querySelector('.health-form')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="type-btn active"
                                    >
                                        ➕ {isArabic ? 'أضف قراءة' : 'Add Reading'}
                                    </button>
                                </div>
                            )}
                            
                            {getMeasuredCount() > 0 && getMeasuredCount() < 4 && (
                                <div className="recommendation-card priority-medium" style={{ marginTop: 'var(--spacing-lg)' }}>
                                    <div className="rec-header">
                                        <span className="rec-icon">💡</span>
                                        <span className="rec-category">{isArabic ? 'يمكنك تسجيل القياسات المتبقية من النموذج أدناه' : 'You can record the remaining measurements from the form below'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="health-components">
                            <div className="health-form">
                                <HealthForm onDataSubmitted={handleDataSubmitted} allowPartialEntries={true} isArabic={isArabic}/>
                            </div>
                            
                            <ActivityForm onDataSubmitted={handleDataSubmitted} onActivityChange={handleDataSubmitted} isArabic={isArabic} />
                            
                            <div className="activity-analytics-wrapper">
                                <ActivityAnalytics refreshTrigger={refreshKey} isArabic={isArabic} />
                                <AdvancedHealthInsights refreshTrigger={refreshKey} isArabic={isArabic} />
                            </div>
                            
                            <HealthHistory refreshKey={refreshKey} onDataSubmitted={handleDataSubmitted} allowIncompleteEntries={true} isArabic={isArabic} />
                            <HealthCharts refreshKey={refreshKey} isArabic={isArabic} />
                        </div>
                    </div>
                );
                
            case 'nutrition':
                return <NutritionMain onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'sleep':
                return <SleepTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'habits':
                return <HabitTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'mood':
                return <MoodTracker isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'chat':
                return <ChatInterface isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'profile':
                // ✅ لا نمرر isArabic هنا لأن ProfileManager يدير اللغة بنفسه
                return <ProfileManager isAuthReady={isAuthReady} />;
            case 'smart':
                return <SmartDashboard isArabic={isArabic} />;
            case 'notifications':
                return <Notifications isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'reports':
                return <Reports isAuthReady={isAuthReady} isArabic={isArabic}/>;
            default:
                return null;
        }
    };
    
    // حالة التحميل
    if (loading && healthRecords.length === 0) {
        return (
            <div className="analytics-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <h2>{isArabic ? 'جاري التحميل...' : 'Loading...'}</h2>
                    <p>{isArabic ? 'يرجى الانتظار قليلاً' : 'Please wait a moment'}</p>
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
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            {/* شريط التحكم العلوي */}
            <div className="control-bar">
                <div className="control-left">
                    <button className="menu-toggle" onClick={toggleSidebar} aria-label={isArabic ? 'القائمة' : 'Menu'}>
                        {sidebarOpen ? '✕' : '☰'}
                    </button>
                    <div className="app-name">LivoCare</div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">{getTodayDate()}</div>
                </div>
                
                <div className="control-right">
                    {/* ✅ تم إزالة زر اللغة - يوجد الآن فقط في ProfileManager */}
                    <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? (isArabic ? 'وضع فاتح' : 'Light Mode') : (isArabic ? 'وضع مظلم' : 'Dark Mode')}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    {onLogout && (
                        <button className="logout-btn" onClick={onLogout} title={isArabic ? 'تسجيل خروج' : 'Logout'}>
                            <span className="logout-icon">🚪</span>
                            <span className="logout-text">{isArabic ? 'تسجيل خروج' : 'Logout'}</span>
                        </button>
                    )}
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
                    isArabic={isArabic}
                />
            </div>
            
            {/* Overlay للجوال */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            {/* المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <div className="header-main">
                        <h1>{getSectionTitle(activeSection)}</h1>
                        <div className="refresh-controls">
                            <button onClick={handleManualRefresh} disabled={loading} className={`refresh-btn ${loading ? 'loading' : ''}`}>
                                {loading ? '⏳' : '🔄'} {isArabic ? 'تحديث' : 'Refresh'}
                            </button>
                            
                            <label className="auto-refresh-toggle">
                                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">{isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="header-info">
                        {autoRefresh && <span className="auto-refresh-status">🔄 {isArabic ? 'التحديث التلقائي نشط' : 'Auto refresh active'}</span>}
                        {latestHealthData?.recorded_at && (
                            <div className="last-updated">
                                {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(latestHealthData.recorded_at).toLocaleDateString(
                                    isArabic ? 'ar-EG' : 'en-US'
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>

            <style>{`
                .dashboard-layout {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: all var(--transition-slow);
                    position: relative;
                }

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
                    padding: 0 var(--spacing-xl);
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    box-shadow: var(--shadow-md);
                }

                .control-left {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .menu-toggle {
                    display: none;
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .menu-toggle:active {
                    transform: scale(0.95);
                }

                .app-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .control-center {
                    flex: 1;
                    text-align: center;
                }

                .date-display {
                    display: inline-block;
                    padding: var(--spacing-sm) var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-full);
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    border: 1px solid var(--border-light);
                }

                .control-right {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .theme-toggle {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .theme-toggle:active {
                    transform: rotate(15deg) scale(0.95);
                }

                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm) var(--spacing-md);
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid var(--error);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    color: var(--error);
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .logout-btn:hover {
                    background: var(--error);
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

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

                .dashboard-content {
                    margin-top: 70px;
                    padding: var(--spacing-xl);
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

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--spacing-xl);
                    padding-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-light);
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                }

                .header-main {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                    flex: 1;
                }

                .section-header h1 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.8rem;
                    font-weight: 700;
                }

                .refresh-controls {
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: center;
                    flex-wrap: wrap;
                }

                .refresh-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-radius: var(--radius-md);
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                }

                .refresh-btn:hover:not(:disabled) {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .refresh-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    cursor: pointer;
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border-radius: var(--radius-full);
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                }

                .auto-refresh-toggle input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    width: 40px;
                    height: 20px;
                    background: var(--border-light);
                    border-radius: 20px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all var(--transition-fast);
                    box-shadow: var(--shadow-sm);
                }

                input:checked + .toggle-slider {
                    background: var(--primary);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(20px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-20px);
                }

                .toggle-label {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .header-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    align-items: flex-end;
                }

                .auto-refresh-status {
                    font-size: 0.8rem;
                    color: var(--success);
                    background: rgba(34, 197, 94, 0.1);
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border-radius: var(--radius-full);
                    animation: pulse 2s infinite;
                }

                .last-updated {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    background: var(--secondary-bg);
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-light);
                }

                .activity-analytics-wrapper {
                    margin: var(--spacing-xl) 0;
                    background: var(--card-bg);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-xl);
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-lg);
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                @media (min-width: 1025px) {
                    .sidebar-wrapper {
                        transform: translateX(0) !important;
                    }

                    .menu-toggle {
                        display: none !important;
                    }

                    [dir="ltr"] .dashboard-content {
                        margin-left: 280px !important;
                    }

                    [dir="rtl"] .dashboard-content {
                        margin-right: 280px !important;
                    }
                }

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
                        padding: var(--spacing-xl) var(--spacing-2xl);
                    }

                    .section-header h1 {
                        font-size: 2.2rem;
                    }
                }

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
                        padding: var(--spacing-lg);
                    }
                }

                @media (max-width: 767px) {
                    .control-bar {
                        height: 60px;
                        padding: 0 var(--spacing-md);
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
                        padding: var(--spacing-md);
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .section-header h1 {
                        font-size: 1.3rem;
                    }

                    .activity-analytics-wrapper {
                        padding: var(--spacing-md);
                        border-radius: var(--radius-xl);
                    }

                    .logout-text {
                        display: none;
                    }
                    
                    .logout-btn {
                        padding: var(--spacing-sm);
                    }

                    .refresh-controls {
                        flex-direction: column;
                        align-items: flex-start;
                        width: 100%;
                    }

                    .refresh-btn {
                        width: 100%;
                        justify-content: center;
                    }

                    .auto-refresh-toggle {
                        width: 100%;
                        justify-content: space-between;
                    }
                }

                @media (max-width: 480px) {
                    .dashboard-content {
                        padding: var(--spacing-sm);
                    }

                    .section-header h1 {
                        font-size: 1.2rem;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .sidebar-overlay {
                        animation: none !important;
                    }
                    
                    .auto-refresh-status {
                        animation: none !important;
                    }
                }

                [dir="rtl"] .control-left {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .control-right {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .refresh-controls {
                    flex-direction: row-reverse;
                }

                @media (max-width: 767px) {
                    [dir="rtl"] .refresh-controls {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;