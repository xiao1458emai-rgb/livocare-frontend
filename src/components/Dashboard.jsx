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
import ProfileManager from './usermangment';  // ✅ اسم الملف الصحيح
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

// ✅ دالة عامة لتطبيق اللغة
const applyLanguage = (lang) => {
    const isArabic = lang === 'ar';
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    
    // ✅ إرسال حدث للتغيير
    const languageChangeEvent = new CustomEvent('languageChange', { 
        detail: { lang, isArabic } 
    });
    window.dispatchEvent(languageChangeEvent);
};

function Dashboard({ onLogout }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const navigate = useNavigate();
    
    // مراجع لمنع التكرار
    const isMountedRef = useRef(true);
    const refreshIntervalRef = useRef(null);
    const isFetchingRef = useRef(false);
    
    // حالات البيانات
    const [healthRecords, setHealthRecords] = useState([]);
    const [latestHealthData, setLatestHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [activeSection, setActiveSection] = useState('health');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // ✅ الوضع المظلم
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || (saved === null && prefersDark);
        }
        return false;
    });

    // ✅ الاستماع لتغييرات اللغة
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

    // ✅ تطبيق الوضع المظلم
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            if (darkMode) {
                root.classList.add('dark-mode');
                root.setAttribute('data-theme', 'dark');
            } else {
                root.classList.remove('dark-mode');
                root.setAttribute('data-theme', 'light');
            }
            localStorage.setItem('livocare_darkMode', darkMode.toString());
            
            // ✅ إرسال حدث تغيير الثيم
            window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode } }));
        }
    }, [darkMode]);
    
    // ✅ التحقق من المصادقة
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
    
    // ✅ جلب البيانات الصحية
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
                    date: latest.recorded_at ? new Date(latest.recorded_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : null
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
    
    // ✅ جلب البيانات عند التغيير
    useEffect(() => {
        if (isAuthReady) {
            fetchHealthData();
        }
    }, [refreshKey, isAuthReady, fetchHealthData]);
    
    // ✅ تطبيق اللغة عند التحميل
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLang = localStorage.getItem('app_lang') || 'ar';
            applyLanguage(savedLang);
        }
    }, []);
    
    // ✅ تنظيف
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);
    
    // ✅ معالج تحديث البيانات
    const handleDataSubmitted = useCallback(() => {
        console.log('🔄 Data submitted, refreshing dashboard...');
        setRefreshKey(prev => prev + 1);
    }, []);
    
    // ✅ عرض قيمة آمن
    const displayValue = useCallback((value, unit = '') => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        return `${numValue} ${unit}`.trim();
    }, []);
    
    // ✅ تنسيق ضغط الدم
    const displayBloodPressure = useCallback((systolic, diastolic) => {
        if (!systolic && systolic !== 0) return '—';
        if (!diastolic && diastolic !== 0) return '—';
        return `${systolic} / ${diastolic} mmHg`;
    }, []);
    
    // ✅ تبديل الوضع المظلم
    const toggleDarkMode = useCallback(() => {
        setDarkMode(prev => !prev);
    }, []);
    
    // ✅ الحصول على تاريخ اليوم
    const getTodayDate = useCallback(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    }, [isArabic]);
    
    // ✅ تبديل السايدبار
    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);
    
    // ✅ عناوين الأقسام
    const getSectionTitle = useCallback((sectionKey) => {
        const titles = {
            'health': isArabic ? '🏠 لوحة التحكم' : '🏠 Dashboard',
            'nutrition': isArabic ? '🍽️ التغذية' : '🍽️ Nutrition',
            'sleep': isArabic ? '😴 النوم' : '😴 Sleep',
            'habits': isArabic ? '✅ العادات' : '✅ Habits',
            'activity': isArabic ? '🏃 النشاط' : '🏃 Activity',
            'mood': isArabic ? '😊 المزاج' : '😊 Mood',
            'chat': isArabic ? '🤖 المساعد الذكي' : '🤖 AI Assistant',
            'smart': isArabic ? '✨ الميزات الذكية' : '✨ Smart Features',
            'profile': isArabic ? '👤 الملف الشخصي' : '👤 Profile',
            'notifications': isArabic ? '🔔 الإشعارات' : '🔔 Notifications',
            'reports': isArabic ? '📊 التقارير' : '📊 Reports'
        };
        return titles[sectionKey] || (isArabic ? '🏠 لوحة التحكم' : '🏠 Dashboard');
    }, [isArabic]);
    
    // ✅ عرض محتوى القسم المحدد
    const renderSectionContent = useCallback(() => {
        // محتوى قسم الصحة
        const healthSectionContent = (
            <div className="health-section">
                {/* بطاقات الملخص */}
                <div className="summary-cards">
                    <div className="summary-header">
                        <h3 className="summary-title">
                            📊 {isArabic ? 'ملخص اليوم' : 'Daily Summary'}
                        </h3>
                        <span className="summary-date">{getTodayDate()}</span>
                    </div>
                    
                    <div className="summary-grid">
                        {/* بطاقة الوزن */}
                        <div className="summary-card weight">
                            <div className="card-icon">⚖️</div>
                            <div className="card-content">
                                <div className="card-label">{isArabic ? 'آخر وزن' : 'Last Weight'}</div>
                                <div className="card-value">
                                    {latestHealthData?.weight ? (
                                        <>
                                            {latestHealthData.weight}
                                            <span className="card-unit">{isArabic ? 'كجم' : 'kg'}</span>
                                        </>
                                    ) : '—'}
                                </div>
                                {latestHealthData?.recorded_at && (
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
                        <div className="summary-card blood-pressure">
                            <div className="card-icon">❤️</div>
                            <div className="card-content">
                                <div className="card-label">{isArabic ? 'ضغط الدم' : 'Blood Pressure'}</div>
                                <div className="card-value">
                                    {displayBloodPressure(latestHealthData?.systolic, latestHealthData?.diastolic)}
                                </div>
                                <div className="card-sub">
                                    {isArabic ? 'انقباضي / انبساطي' : 'Systolic / Diastolic'}
                                </div>
                            </div>
                        </div>
                        
                        {/* بطاقة السكر */}
                        <div className="summary-card glucose">
                            <div className="card-icon">🩸</div>
                            <div className="card-content">
                                <div className="card-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</div>
                                <div className="card-value">
                                    {displayValue(latestHealthData?.glucose, 'mg/dL')}
                                </div>
                                <div className="card-sub">
                                    {isArabic ? 'مستوى السكر' : 'Glucose Level'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* حالة عدم وجود بيانات */}
                    {!latestHealthData && healthRecords.length === 0 && (
                        <div className="empty-data-state">
                            <div className="empty-icon">📊</div>
                            <h4>{isArabic ? 'لا توجد بيانات صحية' : 'No Health Data'}</h4>
                            <p>{isArabic ? 'أضف قراءاتك الصحية الأولى للبدء' : 'Add your first health readings to get started'}</p>
                            <button 
                                onClick={() => {
                                    const healthForm = document.querySelector('.health-form-section');
                                    if (healthForm) healthForm.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="add-data-btn"
                            >
                                ➕ {isArabic ? 'أضف قراءة' : 'Add Reading'}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* المكونات */}
                <div className="health-components">
                    <div className="health-form-section">
                        <HealthForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    </div>
                    
                    <div className="activity-form-section">
                        <ActivityForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    </div>
                    
                    <div className="analytics-section">
                        <ActivityAnalytics refreshTrigger={refreshKey} isArabic={isArabic} />
                        <AdvancedHealthInsights refreshTrigger={refreshKey} isArabic={isArabic} />
                    </div>
                    
                    <div className="history-section">
                        <HealthHistory refreshKey={refreshKey} onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                        <HealthCharts refreshKey={refreshKey} isArabic={isArabic} />
                    </div>
                </div>
            </div>
        );
        
        // اختيار القسم المناسب
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
            case 'activity':
                return (
                    <ActivityForm 
                        onDataSubmitted={handleDataSubmitted} 
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
    }, [activeSection, isAuthReady, isArabic, refreshKey, handleDataSubmitted, getTodayDate, latestHealthData, healthRecords, displayBloodPressure, displayValue]);
    
    // ✅ حالة التحميل
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
    
    // ✅ حالة الخطأ
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
    
    // ✅ العرض الرئيسي
    return (
        <div className="dashboard-layout">
            {/* شريط التحكم العلوي */}
            <div className="control-bar">
                <div className="control-left">
                    <button 
                        className="menu-toggle" 
                        onClick={toggleSidebar} 
                        aria-label={isArabic ? 'القائمة' : 'Menu'}
                    >
                        {sidebarOpen ? '✕' : '☰'}
                    </button>
                    <div className="app-name">
                        <span className="logo">🫀</span>
                        <span>LivoCare</span>
                    </div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">
                        📅 {getTodayDate()}
                    </div>
                </div>
                
                <div className="control-right">
                    {/* ✅ زر تبديل الثيم */}
                    <button 
                        className="theme-toggle" 
                        onClick={toggleDarkMode} 
                        title={darkMode ? (isArabic ? '☀️ الوضع الفاتح' : '☀️ Light Mode') : (isArabic ? '🌙 الوضع المظلم' : '🌙 Dark Mode')}
                        aria-label={darkMode ? (isArabic ? 'الوضع الفاتح' : 'Light Mode') : (isArabic ? 'الوضع المظلم' : 'Dark Mode')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    
                    {/* ✅ زر تسجيل الخروج */}
                    <button 
                        className="logout-btn" 
                        onClick={onLogout} 
                        title={isArabic ? 'تسجيل خروج' : 'Logout'}
                        aria-label={isArabic ? 'تسجيل خروج' : 'Logout'}
                    >
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">{isArabic ? 'تسجيل خروج' : 'Logout'}</span>
                    </button>
                </div>
            </div>

            {/* ✅ السايدبار */}
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
            
            {/* ✅ Overlay للجوال */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={toggleSidebar}
                    role="button"
                    aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
                />
            )}

            {/* ✅ المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <h1 className="section-title">{getSectionTitle(activeSection)}</h1>
                    {latestHealthData?.recorded_at && (
                        <div className="last-updated">
                            🔄 {isArabic ? 'آخر تحديث' : 'Last updated'}: {new Date(latestHealthData.recorded_at).toLocaleDateString(
                                isArabic ? 'ar-EG' : 'en-US'
                            )}
                        </div>
                    )}
                </div>

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>
            
            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                /* ===========================================
                   حالة التحميل
                =========================================== */
                .dashboard-loading {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--primary-bg, #f8fafc);
                }
                
                .loading-spinner {
                    text-align: center;
                    padding: var(--spacing-2xl, 48px);
                }
                
                .loading-spinner .spinner {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto var(--spacing-lg, 24px);
                }
                
                .loading-spinner h2 {
                    margin: 0 0 var(--spacing-sm, 8px);
                    color: var(--text-primary, #0f172a);
                }
                
                .loading-spinner p {
                    color: var(--text-secondary, #475569);
                }
                
                /* ===========================================
                   حالة الخطأ
                =========================================== */
                .dashboard-error {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--primary-bg, #f8fafc);
                }
                
                .error-content {
                    text-align: center;
                    padding: var(--spacing-2xl, 48px);
                    background: var(--card-bg, #ffffff);
                    border-radius: var(--radius-xl, 20px);
                    box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
                    max-width: 400px;
                    margin: var(--spacing-lg, 24px);
                }
                
                .error-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md, 16px);
                }
                
                .error-content h2 {
                    margin: 0 0 var(--spacing-lg, 24px);
                    color: var(--error, #ef4444);
                }
                
                .retry-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
                    color: white;
                    border: none;
                    border-radius: var(--radius-md, 8px);
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all var(--transition-medium, 0.25s);
                }
                
                .retry-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
                }
                
                /* ===========================================
                   بطاقات الملخص
                =========================================== */
                .summary-cards {
                    background: var(--card-bg, #ffffff);
                    border-radius: var(--radius-xl, 20px);
                    padding: var(--spacing-lg, 24px);
                    margin-bottom: var(--spacing-xl, 32px);
                    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .summary-cards {
                    background: var(--card-bg, #1e293b);
                    border-color: var(--border-light, #334155);
                }
                
                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md, 16px);
                    margin-bottom: var(--spacing-lg, 24px);
                    padding-bottom: var(--spacing-md, 16px);
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .summary-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                }
                
                .summary-date {
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg, #f1f5f9);
                    border-radius: var(--radius-full, 9999px);
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: var(--spacing-md, 16px);
                }
                
                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md, 16px);
                    padding: var(--spacing-md, 16px);
                    background: var(--secondary-bg, #ffffff);
                    border-radius: var(--radius-lg, 12px);
                    border: 1px solid var(--border-light, #e2e8f0);
                    transition: all var(--transition-medium, 0.25s);
                }
                
                .dark-mode .summary-card {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
                }
                
                .summary-card .card-icon {
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg, rgba(99,102,241,0.08));
                    border-radius: var(--radius-md, 8px);
                }
                
                .summary-card.weight .card-icon { background: rgba(16, 185, 129, 0.1); }
                .summary-card.blood-pressure .card-icon { background: rgba(239, 68, 68, 0.1); }
                .summary-card.glucose .card-icon { background: rgba(245, 158, 11, 0.1); }
                
                .summary-card .card-content {
                    flex: 1;
                }
                
                .summary-card .card-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #64748b);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .summary-card .card-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--text-primary, #0f172a);
                    line-height: 1.2;
                }
                
                .summary-card .card-unit {
                    font-size: 0.8rem;
                    font-weight: normal;
                    margin-left: 4px;
                }
                
                .summary-card .card-time {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #64748b);
                    margin-top: 4px;
                }
                
                .summary-card .card-sub {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #64748b);
                    margin-top: 4px;
                }
                
                /* ===========================================
                   حالة عدم وجود بيانات
                =========================================== */
                .empty-data-state {
                    text-align: center;
                    padding: var(--spacing-2xl, 48px);
                    margin-top: var(--spacing-lg, 24px);
                }
                
                .empty-data-state .empty-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md, 16px);
                    opacity: 0.5;
                }
                
                .empty-data-state h4 {
                    margin: 0 0 var(--spacing-sm, 8px);
                    color: var(--text-primary, #0f172a);
                }
                
                .empty-data-state p {
                    color: var(--text-secondary, #475569);
                    margin-bottom: var(--spacing-lg, 24px);
                }
                
                .add-data-btn {
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
                    color: white;
                    border: none;
                    border-radius: var(--radius-full, 9999px);
                    cursor: pointer;
                    transition: all var(--transition-medium, 0.25s);
                }
                
                .add-data-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
                }
                
                /* ===========================================
                   مكونات الصحة
                =========================================== */
                .health-components {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl, 32px);
                }
                
                .analytics-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-lg, 24px);
                }
                
                .history-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-lg, 24px);
                }
                
                /* ===========================================
                   رأس القسم
                =========================================== */
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md, 16px);
                    margin-bottom: var(--spacing-xl, 32px);
                    padding-bottom: var(--spacing-md, 16px);
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .section-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: clamp(1.3rem, 4vw, 1.8rem);
                    font-weight: 700;
                }
                
                .last-updated {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg, #ffffff);
                    border-radius: var(--radius-full, 9999px);
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .last-updated {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                /* ===========================================
                   شريط التحكم
                =========================================== */
                .control-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: var(--control-bar-height, 70px);
                    background: var(--card-bg, #ffffff);
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 var(--spacing-xl, 32px);
                    z-index: 100;
                    backdrop-filter: blur(10px);
                    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
                }
                
                .dark-mode .control-bar {
                    background: var(--card-bg, #1e293b);
                    border-color: var(--border-light, #334155);
                }
                
                .control-left {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md, 16px);
                }
                
                .app-name {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm, 8px);
                    font-size: 1.3rem;
                    font-weight: 700;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .app-name .logo {
                    font-size: 1.5rem;
                    -webkit-text-fill-color: initial;
                }
                
                .menu-toggle {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: var(--radius-md, 8px);
                    background: var(--secondary-bg, #ffffff);
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast, 0.15s);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .menu-toggle {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                .menu-toggle:hover {
                    background: var(--hover-bg, rgba(99,102,241,0.08));
                    transform: scale(1.05);
                }
                
                .control-center {
                    flex: 1;
                    text-align: center;
                }
                
                .date-display {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg, #ffffff);
                    border-radius: var(--radius-full, 9999px);
                    color: var(--text-secondary, #475569);
                    font-size: 0.85rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .date-display {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                .control-right {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md, 16px);
                }
                
                .theme-toggle {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: var(--radius-md, 8px);
                    background: var(--secondary-bg, #ffffff);
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast, 0.15s);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .theme-toggle {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                .theme-toggle:hover {
                    background: var(--hover-bg, rgba(99,102,241,0.08));
                    transform: rotate(15deg);
                }
                
                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm, 8px);
                    padding: 0.5rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: var(--radius-full, 9999px);
                    cursor: pointer;
                    transition: all var(--transition-medium, 0.25s);
                    color: var(--error, #ef4444);
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                
                .logout-btn:hover {
                    background: var(--error, #ef4444);
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
                }
                
                .logout-btn:active {
                    transform: scale(0.96);
                }
                
                /* ===========================================
                   استجابة الشاشات
                =========================================== */
                @media (max-width: 1024px) {
                    .analytics-section,
                    .history-section {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media (max-width: 768px) {
                    .control-bar {
                        padding: 0 var(--spacing-md, 16px);
                        height: 60px;
                    }
                    
                    .app-name span:not(.logo) {
                        display: none;
                    }
                    
                    .date-display {
                        display: none;
                    }
                    
                    .logout-text {
                        display: none;
                    }
                    
                    .logout-btn {
                        padding: var(--spacing-sm, 8px);
                    }
                    
                    .summary-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
                
                @media (max-width: 480px) {
                    .control-left {
                        gap: var(--spacing-sm, 8px);
                    }
                    
                    .menu-toggle,
                    .theme-toggle {
                        width: 38px;
                        height: 38px;
                    }
                    
                    .summary-card {
                        padding: var(--spacing-sm, 8px);
                    }
                    
                    .summary-card .card-icon {
                        width: 40px;
                        height: 40px;
                        font-size: 1.5rem;
                    }
                    
                    .summary-card .card-value {
                        font-size: 1.2rem;
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
                
                [dir="rtl"] .summary-card {
                    flex-direction: row-reverse;
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
                    
                    .summary-card:hover,
                    .logout-btn:hover,
                    .theme-toggle:hover {
                        transform: none !important;
                    }
                }
                    /* ===========================================
   تخطيط الصفحة مع السايدبار - الحل النهائي
   =========================================== */

/* الحاوية الرئيسية للتخطيط */
.dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: var(--primary-bg, #f8fafc);
    position: relative;
}

/* شريط التحكم العلوي ثابت */
.control-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: var(--card-bg, #ffffff);
    border-bottom: 1px solid var(--border-light, #e2e8f0);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--spacing-xl, 32px);
    z-index: 100;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
}

/* حاوية السايدبار - ثابتة على اليسار */
.sidebar-wrapper {
    position: fixed;
    top: 70px;
    left: 0;
    bottom: 0;
    width: 280px;
    background: var(--secondary-bg, #ffffff);
    border-right: 1px solid var(--border-light, #e2e8f0);
    transform: translateX(0);
    transition: transform 0.3s ease;
    z-index: 90;
    overflow-y: auto;
}

/* وضع مغلق للسايدبار على الجوال */
.sidebar-wrapper:not(.open) {
    transform: translateX(-100%);
}

/* المحتوى الرئيسي - يبدأ من بعد السايدبار */
.dashboard-content {
    flex: 1;
    margin-top: 70px; /* ارتفاع شريط التحكم */
    margin-left: 280px; /* عرض السايدبار */
    padding: var(--spacing-xl, 32px);
    min-height: calc(100vh - 70px);
    transition: all 0.3s ease;
    width: calc(100% - 280px);
}

/* عند إغلاق السايدبار */
.sidebar-wrapper:not(.open) ~ .dashboard-content {
    margin-left: 0;
    width: 100%;
}

/* Overlay للجوال */
.sidebar-overlay {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 85;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===========================================
   استجابة الهواتف
   =========================================== */
@media (max-width: 768px) {
    .sidebar-wrapper {
        width: 260px;
    }
    
    .dashboard-content {
        margin-left: 0;
        padding: var(--spacing-md, 16px);
        width: 100%;
    }
    
    /* عند فتح السايدبار على الجوال، المحتوى يبقى في مكانه */
    .sidebar-wrapper.open ~ .dashboard-content {
        margin-left: 0;
        opacity: 0.9;
    }
    
    .control-bar {
        padding: 0 var(--spacing-md, 16px);
        height: 60px;
    }
}

/* ===========================================
   دعم RTL (العربية)
   =========================================== */
[dir="rtl"] .sidebar-wrapper {
    left: auto;
    right: 0;
    border-right: none;
    border-left: 1px solid var(--border-light, #e2e8f0);
}

[dir="rtl"] .dashboard-content {
    margin-left: 0;
    margin-right: 280px;
}

[dir="rtl"] .sidebar-wrapper:not(.open) {
    transform: translateX(100%);
}

@media (max-width: 768px) {
    [dir="rtl"] .dashboard-content {
        margin-right: 0;
    }
}
            `}</style>
        </div>
    );
}

export default Dashboard;