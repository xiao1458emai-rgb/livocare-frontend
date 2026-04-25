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
                    <button className="menu-toggle" onClick={toggleSidebar} aria-label={isArabic ? 'القائمة' : 'Menu'}>
                        {sidebarOpen ? '✕' : '☰'}
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

        </div>
    );
}

export default Dashboard;