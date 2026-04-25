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
import ProfileManager from './usermangment';  // ✅ تصحيح المسار - اسم الملف الصحيح
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

// ✅ دالة عامة لتطبيق اللغة (مطابقة مع ProfileManager)
const applyLanguage = (lang) => {
    const isArabic = lang === 'ar';
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    
    const languageChangeEvent = new CustomEvent('languageChange', { 
        detail: { lang, isArabic } 
    });
    window.dispatchEvent(languageChangeEvent);
};

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
            return saved === 'true' || (saved === null && prefersDark);
        }
        return false;
    });

    // ✅ تطبيق اللغة عند التحميل
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLang = localStorage.getItem('app_lang') || 'ar';
            applyLanguage(savedLang);
        }
    }, []);

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

    // ✅ الاستماع لتغييرات الثيم
    useEffect(() => {
        const handleThemeChange = (event) => {
            if (event.detail && event.detail.darkMode !== undefined) {
                setDarkMode(event.detail.darkMode);
            }
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        
        return () => {
            window.removeEventListener('themeChange', handleThemeChange);
        };
    }, []);

    // تطبيق الوضع المظلم
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const html = document.documentElement;
            if (darkMode) {
                html.classList.add('dark-mode');
                html.setAttribute('data-theme', 'dark');
            } else {
                html.classList.remove('dark-mode');
                html.setAttribute('data-theme', 'light');
            }
            localStorage.setItem('livocare_darkMode', darkMode.toString());
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
                    recorded_at: latest.recorded_at || latest.created_at
                });
            } else {
                setLatestHealthData(null);
            }
            
            setError(null);
        } catch (err) {
            console.error('❌ Error fetching health data:', err);
            if (isMountedRef.current) {
                setError(err.response?.data?.message || (isArabic ? 'حدث خطأ في جلب البيانات' : 'Error fetching data'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic, refreshKey]);

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
        }, 60000); // كل 60 ثانية
        
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefresh, isAuthReady]);
    
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
        // ✅ إرسال حدث تغيير الثيم لجميع المكونات
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
            'health': isArabic ? '🏠 لوحة التحكم' : '🏠 Dashboard',
            'nutrition': isArabic ? '🍽️ التغذية' : '🍽️ Nutrition',
            'sleep': isArabic ? '😴 النوم' : '😴 Sleep',
            'habits': isArabic ? '✅ العادات' : '✅ Habits',
            'activity': isArabic ? '🏃 النشاط' : '🏃 Activity',
            'mood': isArabic ? '😊 المزاج' : '😊 Mood',
            'chat': isArabic ? '🤖 المساعد الذكي' : '🤖 AI Assistant',
            'profile': isArabic ? '👤 الملف الشخصي' : '👤 Profile',
            'smart': isArabic ? '✨ الميزات الذكية' : '✨ Smart Features',
            'notifications': isArabic ? '🔔 الإشعارات' : '🔔 Notifications',
            'reports': isArabic ? '📊 التقارير' : '📊 Reports'
        };
        return titles[sectionKey] || (isArabic ? '🏠 لوحة التحكم' : '🏠 Dashboard');
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'health':
                return (
                    <div className="health-section">
                        {/* بطاقات الملخص */}
                        <div className="summary-section">
                            <div className="summary-header">
                                <h3 className="summary-title">📊 {isArabic ? 'ملخص اليوم' : 'Daily Summary'}</h3>
                                <span className="summary-date">{getTodayDate()}</span>
                            </div>
                            
                            <div className="metrics-badge">
                                <span className="metrics-count">
                                    📋 {getMeasuredCount()}/4 {isArabic ? 'قياسات مسجلة' : 'Measurements Recorded'}
                                </span>
                                {getMeasuredCount() < 4 && getMeasuredCount() > 0 && (
                                    <span className="metrics-hint">
                                        💡 {isArabic ? 'يمكنك إضافة القياسات المتبقية من النموذج أدناه' : 'Add remaining measurements from the form below'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="summary-grid">
                                {/* بطاقة الوزن */}
                                <div className={`summary-card ${!latestHealthData?.weight ? 'empty' : ''}`}>
                                    <div className="card-icon">⚖️</div>
                                    <div className="card-content">
                                        <div className="card-label">{isArabic ? 'آخر وزن' : 'Last Weight'}</div>
                                        <div className="card-value">
                                            {displayValue(latestHealthData?.weight, isArabic ? 'كجم' : 'kg')}
                                        </div>
                                        {!latestHealthData?.weight && (
                                            <div className="card-warning">⚠️ {isArabic ? 'غير مسجل' : 'Not recorded'}</div>
                                        )}
                                        {latestHealthData?.recorded_at && latestHealthData?.weight && (
                                            <div className="card-time">
                                                🕐 {new Date(latestHealthData.recorded_at).toLocaleTimeString(
                                                    isArabic ? 'ar-EG' : 'en-US',
                                                    { hour: '2-digit', minute: '2-digit' }
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* بطاقة ضغط الدم */}
                                <div className={`summary-card ${(!latestHealthData?.systolic || !latestHealthData?.diastolic) ? 'empty' : ''}`}>
                                    <div className="card-icon">❤️</div>
                                    <div className="card-content">
                                        <div className="card-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                                        <div className="card-value">
                                            {displayBloodPressure(latestHealthData?.systolic, latestHealthData?.diastolic)}
                                        </div>
                                        {(!latestHealthData?.systolic || !latestHealthData?.diastolic) && (
                                            <div className="card-warning">⚠️ {isArabic ? 'غير مسجل' : 'Not recorded'}</div>
                                        )}
                                        <div className="card-sub">{isArabic ? 'انقباضي / انبساطي' : 'Systolic / Diastolic'}</div>
                                    </div>
                                </div>
                                
                                {/* بطاقة السكر */}
                                <div className={`summary-card ${!latestHealthData?.glucose ? 'empty' : ''}`}>
                                    <div className="card-icon">🩸</div>
                                    <div className="card-content">
                                        <div className="card-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</div>
                                        <div className="card-value">
                                            {displayValue(latestHealthData?.glucose, 'mg/dL')}
                                        </div>
                                        {!latestHealthData?.glucose && (
                                            <div className="card-warning">⚠️ {isArabic ? 'غير مسجل' : 'Not recorded'}</div>
                                        )}
                                        <div className="card-sub">{isArabic ? 'مستوى السكر' : 'Glucose Level'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* حالة عدم وجود بيانات */}
                            {getMeasuredCount() === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">📊</div>
                                    <h4>{isArabic ? 'لا توجد بيانات صحية' : 'No Health Data'}</h4>
                                    <p>{isArabic ? 'أضف قراءاتك الصحية الأولى للبدء' : 'Add your first health readings to get started'}</p>
                                    <button 
                                        onClick={() => {
                                            const healthForm = document.querySelector('.health-form-section');
                                            if (healthForm) healthForm.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="add-btn"
                                    >
                                        ➕ {isArabic ? 'أضف قراءة' : 'Add Reading'}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* المكونات */}
                        <div className="health-components">
                            <div className="health-form-section">
                                <HealthForm 
                                    onDataSubmitted={handleDataSubmitted} 
                                    allowPartialEntries={true} 
                                    isArabic={isArabic}
                                />
                            </div>
                            
                            <div className="activity-form-section">
                                <ActivityForm 
                                    onDataSubmitted={handleDataSubmitted} 
                                    onActivityChange={handleDataSubmitted} 
                                    isArabic={isArabic}
                                />
                            </div>
                            
                            <div className="analytics-section">
                                <ActivityAnalytics refreshTrigger={refreshKey} isArabic={isArabic} />
                                <AdvancedHealthInsights refreshTrigger={refreshKey} isArabic={isArabic} />
                            </div>
                            
                            <div className="history-section">
                                <HealthHistory 
                                    refreshKey={refreshKey} 
                                    onDataSubmitted={handleDataSubmitted} 
                                    allowIncompleteEntries={true} 
                                    isArabic={isArabic}
                                />
                                <HealthCharts refreshKey={refreshKey} isArabic={isArabic} />
                            </div>
                        </div>
                    </div>
                );
                
            case 'nutrition':
                return <NutritionMain onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'sleep':
                return <SleepTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'habits':
                return <HabitTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'activity':
                return <ActivityForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic}/>;
            case 'mood':
                return <MoodTracker isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'chat':
                return <ChatInterface isAuthReady={isAuthReady} isArabic={isArabic}/>;
            case 'profile':
                // ✅ ProfileManager يدير اللغة والثيم بنفسه
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
            <div className="dashboard-loading">
                <div className="loading-spinner">
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
            <div className="dashboard-error">
                <div className="error-content">
                    <div className="error-icon">⚠️</div>
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
                    <button className="menu-toggle" onClick={toggleSidebar}>
                    </button>
                    <div className="app-name">
                        <span className="logo">🫀</span>
                        <span>LivoCare</span>
                    </div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">📅 {getTodayDate()}</div>
                </div>
                
                <div className="control-right">
                    {/* ✅ زر تبديل الوضع المظلم */}
                    <button 
                        className="theme-toggle" 
                        onClick={toggleDarkMode} 
                        title={darkMode ? (isArabic ? '☀️ الوضع الفاتح' : '☀️ Light Mode') : (isArabic ? '🌙 الوضع المظلم' : '🌙 Dark Mode')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    
                    {/* ✅ زر تسجيل الخروج */}
                    <button className="logout-btn" onClick={onLogout} title={isArabic ? 'تسجيل خروج' : 'Logout'}>
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">{isArabic ? 'تسجيل خروج' : 'Logout'}</span>
                    </button>
                </div>
            </div>

            {/* السايدبار */}
            <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <Sidebar 
                    activeSection={activeSection} 
                    onSectionChange={(section) => {
                        setActiveSection(section);
                        if (window.innerWidth <= 768) {
                            setSidebarOpen(false);
                        }
                    }}
                    isArabic={isArabic}
                />
            </div>
            
            {/* Overlay للجوال */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={toggleSidebar}
                    role="button"
                    aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
                />
            )}

            {/* المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <div className="header-main">
                        <h1 className="section-title">{getSectionTitle(activeSection)}</h1>
                        <div className="refresh-controls">
                            <button 
                                onClick={handleManualRefresh} 
                                disabled={loading} 
                                className={`refresh-btn ${loading ? 'loading' : ''}`}
                            >
                                {loading ? '⏳' : '🔄'} {isArabic ? 'تحديث' : 'Refresh'}
                            </button>
                            
                            <label className="auto-refresh-toggle">
                                <input 
                                    type="checkbox" 
                                    checked={autoRefresh} 
                                    onChange={(e) => setAutoRefresh(e.target.checked)} 
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">
                                    {isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="header-info">
                        {autoRefresh && (
                            <span className="auto-refresh-status">
                                🔄 {isArabic ? 'التحديث التلقائي نشط' : 'Auto refresh active'}
                            </span>
                        )}
                        {latestHealthData?.recorded_at && (
                            <div className="last-updated">
                                🕐 {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(latestHealthData.recorded_at).toLocaleDateString(
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

            {/* ✅ أنماط CSS المضمنة المحسنة */}
            <style jsx>{`
                /* ===========================================
                   التخطيط الرئيسي
                =========================================== */
                .dashboard-layout {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: all var(--transition-slow);
                    position: relative;
                }

                /* ===========================================
                   شريط التحكم العلوي
                =========================================== */
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
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    border: 1px solid var(--border-light);
                }

                .menu-toggle:active {
                    transform: scale(0.95);
                }

                .app-name {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    font-size: 1.4rem;
                    font-weight: 700;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .app-name .logo {
                    font-size: 1.6rem;
                    -webkit-text-fill-color: initial;
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
                    font-size: 0.85rem;
                    border: 1px solid var(--border-light);
                }

                .control-right {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .theme-toggle {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    border: 1px solid var(--border-light);
                }

                .theme-toggle:hover {
                    background: var(--hover-bg);
                    transform: rotate(15deg);
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

                /* ===========================================
                   السايدبار
                =========================================== */
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
                    cursor: pointer;
                }

                @keyframes fadeIn {
                    from { opacity: 0; visibility: hidden; }
                    to { opacity: 1; visibility: visible; }
                }

                /* ===========================================
                   المحتوى الرئيسي
                =========================================== */
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

                /* ===========================================
                   رأس القسم
                =========================================== */
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

                .section-title {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: clamp(1.3rem, 4vw, 1.8rem);
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
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
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
                    width: 44px;
                    height: 22px;
                    background: var(--border-light);
                    border-radius: 22px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 18px;
                    height: 18px;
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
                    transform: translateX(22px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-22px);
                }

                .toggle-label {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }

                .header-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    align-items: flex-end;
                }

                .auto-refresh-status {
                    font-size: 0.75rem;
                    color: var(--success);
                    background: rgba(16, 185, 129, 0.1);
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border-radius: var(--radius-full);
                    animation: pulse 2s infinite;
                }

                .last-updated {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    background: var(--secondary-bg);
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-light);
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }

                /* ===========================================
                   بطاقات الملخص
                =========================================== */
                .summary-section {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-light);
                }

                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                    padding-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-light);
                }

                .summary-title {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.2rem;
                }

                .summary-date {
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg);
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .metrics-badge {
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: var(--spacing-lg);
                }

                .metrics-count {
                    padding: 0.25rem 0.75rem;
                    background: var(--primary-bg);
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .metrics-hint {
                    padding: 0.25rem 0.75rem;
                    background: rgba(245, 158, 11, 0.1);
                    border-radius: var(--radius-full);
                    font-size: 0.7rem;
                    color: var(--warning);
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: var(--spacing-md);
                }

                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }

                .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .summary-card.empty {
                    opacity: 0.8;
                    background: rgba(245, 158, 11, 0.05);
                }

                .card-icon {
                    font-size: 1.8rem;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg);
                    border-radius: var(--radius-md);
                }

                .card-content {
                    flex: 1;
                }

                .card-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .card-value {
                    font-size: 1.4rem;
                    font-weight: bold;
                    color: var(--text-primary);
                    line-height: 1.2;
                }

                .card-warning {
                    font-size: 0.65rem;
                    color: var(--warning);
                    margin-top: 4px;
                }

                .card-time {
                    font-size: 0.65rem;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                }

                .card-sub {
                    font-size: 0.65rem;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                }

                /* ===========================================
                   المكونات
                =========================================== */
                .health-components {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl);
                }

                .analytics-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-lg);
                }

                .history-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-lg);
                }

                /* ===========================================
                   حالات خاصة
                =========================================== */
                .empty-state {
                    text-align: center;
                    padding: var(--spacing-2xl);
                    margin-top: var(--spacing-lg);
                }

                .empty-state .empty-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                    opacity: 0.5;
                }

                .empty-state h4 {
                    margin: 0 0 var(--spacing-sm);
                    color: var(--text-primary);
                }

                .empty-state p {
                    color: var(--text-secondary);
                    margin-bottom: var(--spacing-lg);
                }

                .add-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-medium);
                }

                .add-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .dashboard-loading,
                .dashboard-error {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--primary-bg);
                }

                .loading-spinner,
                .error-content {
                    text-align: center;
                    padding: var(--spacing-2xl);
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-lg);
                    max-width: 400px;
                    margin: var(--spacing-lg);
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto var(--spacing-lg);
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .error-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                }

                .retry-btn {
                    margin-top: var(--spacing-lg);
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }

                /* ===========================================
                   استجابة الشاشات الكبيرة
                =========================================== */
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

                    .section-title {
                        font-size: 2rem;
                    }
                }

                /* ===========================================
                   استجابة التابلت
                =========================================== */
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

                    .analytics-section,
                    .history-section {
                        grid-template-columns: 1fr;
                    }
                }

                /* ===========================================
                   استجابة الجوال
                =========================================== */
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

                    .app-name span:not(.logo) {
                        display: none;
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

                    .section-title {
                        font-size: 1.3rem;
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

                    .summary-grid {
                        grid-template-columns: 1fr;
                    }

                    .analytics-section,
                    .history-section {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 480px) {
                    .dashboard-content {
                        padding: var(--spacing-sm);
                    }

                    .section-title {
                        font-size: 1.2rem;
                    }

                    .summary-section {
                        padding: var(--spacing-md);
                    }
                }

                /* ===========================================
                   دعم RTL
                =========================================== */
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

                /* ===========================================
                   دعم الحركة المخفضة
                =========================================== */
                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                    
                    .sidebar-overlay {
                        animation: none !important;
                    }
                    
                    .auto-refresh-status {
                        animation: none !important;
                    }
                    
                    .summary-card:hover {
                        transform: none !important;
                    }
                }

                /* ===========================================
                   دعم التباين العالي
                =========================================== */
                @media (prefers-contrast: high) {
                    .summary-card {
                        border-width: 2px;
                    }
                    
                    .logout-btn {
                        border-width: 2px;
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;