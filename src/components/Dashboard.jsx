// src/components/Dashboard.jsx
'use client';

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
import ProfileManager from './ProfileManager';  // ✅ تأكد من استيراد الملف الصحيح
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

// ✅ دالة عامة لتطبيق اللغة (مطابقة لما في ProfileManager)
const applyLanguage = (lang) => {
    const isArabic = lang === 'ar';
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
};

function Dashboard({ onLogout }) {
    // ✅ إعدادات اللغة من localStorage والاستماع للتغييرات
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

    // إعدادات اللغة - تطبيق اللغة من localStorage عند التحميل
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

    // تنسيق ضغط الدم مع مسافات
    const displayBloodPressure = (systolic, diastolic) => {
        if (!systolic && systolic !== 0) return '—';
        if (!diastolic && diastolic !== 0) return '—';
        return `${systolic} / ${diastolic} mmHg`;
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: newDarkMode } }));
    };

    const getTodayDate = () => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // عناوين الأقسام
    const getSectionTitle = (sectionKey) => {
        const titles = {
            'health': isArabic ? 'لوحة التحكم' : 'Dashboard',
            'nutrition': isArabic ? 'التغذية' : 'Nutrition',
            'sleep': isArabic ? 'النوم' : 'Sleep',
            'habits': isArabic ? 'العادات' : 'Habits',
            'mood': isArabic ? 'المزاج' : 'Mood',
            'chat': isArabic ? 'المساعد الذكي' : 'AI Assistant',
            'smart': isArabic ? 'الميزات الذكية' : 'Smart Features',
            'profile': isArabic ? 'الملف الشخصي' : 'Profile',
            'notifications': isArabic ? 'الإشعارات' : 'Notifications',
            'reports': isArabic ? 'التقارير' : 'Reports'
        };
        return titles[sectionKey] || (isArabic ? 'لوحة التحكم' : 'Dashboard');
    };

    const renderSectionContent = () => {
        const healthSectionContent = (
            <div className="health-section">
                {/* بطاقات الملخص */}
                <div className="recommendations-section" style={{ marginTop: 0 }}>
                    <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                        <h3>{isArabic ? 'ملخص اليوم' : 'Daily Summary'}</h3>
                        <span className="stat-label">{getTodayDate()}</span>
                    </div>
                    
                    <div className="analytics-stats-grid">
                        <div className="analytics-stat-card">
                            <div className="stat-icon">⚖️</div>
                            <div className="stat-content">
                                <div className="stat-label">{isArabic ? 'آخر وزن' : 'Last Weight'}</div>
                                <div className="stat-value">
                                    {latestHealthData?.weight ? `${latestHealthData.weight} ${isArabic ? 'كجم' : 'kg'}` : '—'}
                                </div>
                                {latestHealthData?.recorded_at && (
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
                                <div className="stat-label">{isArabic ? 'مستوى السكر' : 'Glucose Level'}</div>
                            </div>
                        </div>
                    </div>
                    
                    {!latestHealthData && healthRecords.length === 0 && (
                        <div className="analytics-empty">
                            <div className="empty-icon">📊</div>
                            <h4>{isArabic ? 'لا توجد بيانات صحية' : 'No Health Data'}</h4>
                            <p>{isArabic ? 'أضف قراءاتك الصحية الأولى' : 'Add your first health readings'}</p>
                            <button 
                                onClick={() => document.querySelector('.health-form')?.scrollIntoView({ behavior: 'smooth' })}
                                className="type-btn active"
                                style={{ marginTop: 'var(--spacing-md)' }}
                            >
                                ➕ {isArabic ? 'أضف قراءة' : 'Add Reading'}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="health-components">
                    <div className="health-form">
                        <HealthForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    </div>
                    
                    <ActivityForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    
                    <div className="activity-analytics-wrapper">
                        <ActivityAnalytics refreshTrigger={refreshKey} isArabic={isArabic} />
                        <AdvancedHealthInsights refreshTrigger={refreshKey} isArabic={isArabic} />
                    </div>
                    
                    <HealthHistory refreshKey={refreshKey} onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    <HealthCharts refreshKey={refreshKey} isArabic={isArabic} />
                </div>
            </div>
        );

        switch (activeSection) {
            case 'health':
                return healthSectionContent;
            case 'nutrition':
                return (
                    <NutritionMain 
                        onDataSubmitted={handleDataSubmitted} 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'sleep':
                return (
                    <SleepTracker 
                        onDataSubmitted={handleDataSubmitted} 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'habits':
                return (
                    <HabitTracker 
                        onDataSubmitted={handleDataSubmitted} 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'mood':
                return (
                    <MoodTracker 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'chat':
                return (
                    <ChatInterface 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'profile':
                return (
                    <ProfileManager 
                        isAuthReady={isAuthReady}
                    />
                );
            case 'smart':
                return (
                    <SmartDashboard 
                        isArabic={isArabic}
                    />
                );
            case 'notifications':
                return (
                    <Notifications 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            case 'reports':
                return (
                    <Reports 
                        isAuthReady={isAuthReady}
                        isArabic={isArabic}
                    />
                );
            default:
                return healthSectionContent;
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

    // العرض الرئيسي
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
                    {/* ✅ تم إزالة زر اللغة من هنا - يوجد الآن فقط في ProfileManager */}
                    <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? (isArabic ? 'وضع فاتح' : 'Light Mode') : (isArabic ? 'وضع مظلم' : 'Dark Mode')}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
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
                    <h1>{getSectionTitle(activeSection)}</h1>
                    {latestHealthData?.recorded_at && (
                        <div className="last-updated">
                            {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(latestHealthData.recorded_at).toLocaleDateString(
                                isArabic ? 'ar-EG' : 'en-US'
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