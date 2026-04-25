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
import ProfileManager from './usermangment';
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
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // ✅ الوضع المظلم
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || (saved === null && prefersDark);
        }
        return false;
    });

    // ✅ كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // ✅ الاستماع لإغلاق السايدبار من المكون نفسه
    useEffect(() => {
        const handleCloseSidebar = () => {
            setIsSidebarVisible(false);
        };
        
        window.addEventListener('closeSidebar', handleCloseSidebar);
        
        return () => {
            window.removeEventListener('closeSidebar', handleCloseSidebar);
        };
    }, []);

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
                    recorded_at: latest.recorded_at || latest.created_at,
                });
            } else {
                setLatestHealthData(null);
            }
            
            setError(null);
        } catch (err) {
            console.error('Error fetching health data:', err);
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
    
    // ✅ التحديث التلقائي
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
    
    // ✅ تبديل السايدبار
    const toggleSidebar = useCallback(() => {
        setIsSidebarVisible(prev => !prev);
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
    
    // ✅ الحصول على تاريخ اليوم
    const getTodayDate = useCallback(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    }, [isArabic]);
    
    // ✅ عدد القياسات المسجلة
    const getMeasuredCount = useCallback(() => {
        let count = 0;
        if (latestHealthData?.weight !== null && latestHealthData?.weight !== undefined) count++;
        if (latestHealthData?.systolic !== null && latestHealthData?.systolic !== undefined) count++;
        if (latestHealthData?.diastolic !== null && latestHealthData?.diastolic !== undefined) count++;
        if (latestHealthData?.glucose !== null && latestHealthData?.glucose !== undefined) count++;
        return count;
    }, [latestHealthData]);
    
    // ✅ عرض محتوى القسم المحدد
    const renderSectionContent = useCallback(() => {
        const healthSectionContent = (
            <div className="health-section">
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
                
                <div className="health-components">
                    <div className="health-form-section">
                        <HealthForm onDataSubmitted={handleDataSubmitted} isArabic={isArabic} />
                    </div>
                    
                    <div className="activity-form-section">
                        <ActivityForm onDataSubmitted={handleDataSubmitted} onActivityChange={handleDataSubmitted} isArabic={isArabic} />
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
        
        switch (activeSection) {
            case 'health': return healthSectionContent;
            case 'nutrition': return <NutritionMain onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'sleep': return <SleepTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'habits': return <HabitTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'activity': return <ActivityForm onDataSubmitted={handleDataSubmitted} onActivityChange={handleDataSubmitted} isArabic={isArabic} />;
            case 'mood': return <MoodTracker isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'chat': return <ChatInterface isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'profile': return <ProfileManager isAuthReady={isAuthReady} />;
            case 'smart': return <SmartDashboard isArabic={isArabic} />;
            case 'notifications': return <Notifications isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'reports': return <Reports isAuthReady={isAuthReady} isArabic={isArabic} />;
            default: return healthSectionContent;
        }
    }, [activeSection, isAuthReady, isArabic, refreshKey, handleDataSubmitted, getTodayDate, getMeasuredCount, latestHealthData, displayValue, displayBloodPressure]);
    
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
                    {/* ✅ زر القائمة لفتح السايدبار */}
                    <button 
                        className="menu-toggle" 
                        onClick={toggleSidebar} 
                        aria-label={isArabic ? 'القائمة' : 'Menu'}
                    >
                        ☰
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
                    <div className="refresh-controls">
                        <button 
                            onClick={() => setRefreshKey(prev => prev + 1)} 
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
                    
                    <button 
                        className="theme-toggle" 
                        onClick={toggleDarkMode} 
                        title={darkMode ? (isArabic ? '☀️ الوضع الفاتح' : '☀️ Light Mode') : (isArabic ? '🌙 الوضع المظلم' : '🌙 Dark Mode')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    
                    <button className="logout-btn" onClick={onLogout} title={isArabic ? 'تسجيل خروج' : 'Logout'}>
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">{isArabic ? 'تسجيل خروج' : 'Logout'}</span>
                    </button>
                </div>
            </div>

            {/* ✅ السايدبار - يظهر فقط عند الضغط على الزر (بدون حاوية إضافية) */}
            {isSidebarVisible && (
                <Sidebar 
                    activeSection={activeSection} 
                    onSectionChange={(section) => {
                        setActiveSection(section);
                        setIsSidebarVisible(false);
                    }}
                    isArabic={isArabic}
                    isVisible={isSidebarVisible}
                />
            )}
            
            {/* ✅ Overlay للجوال */}
            {isSidebarVisible && isMobile && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setIsSidebarVisible(false)}
                    role="button"
                    aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
                />
            )}

            {/* ✅ المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <h1 className="section-title">{getSectionTitle(activeSection)}</h1>
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

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>
            
            <style jsx>{`
                /* ===========================================
                   التخطيط الرئيسي (نفس الأنماط السابقة)
                =========================================== */
                .dashboard-layout {
                    min-height: 100vh;
                    background: var(--primary-bg, #f8fafc);
                    transition: all 0.3s ease;
                }
                
                .dark-mode .dashboard-layout {
                    background: var(--primary-bg, #0f172a);
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
                    background: var(--card-bg, #ffffff);
                    border-bottom: 1px solid var(--border-light, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 32px;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .dark-mode .control-bar {
                    background: var(--card-bg, #1e293b);
                    border-color: var(--border-light, #334155);
                }
                
                .control-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                .menu-toggle {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: 8px;
                    background: var(--secondary-bg, #ffffff);
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.15s ease;
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
                    background: rgba(99,102,241,0.08);
                    transform: scale(1.05);
                }
                
                .app-name {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1.3rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .app-name .logo {
                    font-size: 1.5rem;
                    -webkit-text-fill-color: initial;
                }
                
                .control-center {
                    flex: 1;
                    text-align: center;
                }
                
                .date-display {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg, #ffffff);
                    border-radius: 9999px;
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
                    gap: 16px;
                    flex-wrap: wrap;
                }
                
                .refresh-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .refresh-btn {
                    padding: 0.5rem 1rem;
                    background: var(--primary, #6366f1);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.15s;
                }
                
                .refresh-btn:hover:not(:disabled) {
                    background: var(--primary-dark, #4f46e5);
                    transform: translateY(-2px);
                }
                
                .refresh-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    border-radius: 9999px;
                    background: var(--secondary-bg, #f1f5f9);
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .auto-refresh-toggle {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
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
                    background: var(--border-light, #cbd5e1);
                    border-radius: 20px;
                    position: relative;
                    transition: all 0.15s;
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
                    transition: all 0.15s;
                }
                
                input:checked + .toggle-slider {
                    background: #6366f1;
                }
                
                input:checked + .toggle-slider::before {
                    transform: translateX(20px);
                }
                
                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-20px);
                }
                
                .toggle-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                }
                
                .theme-toggle {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: 8px;
                    background: var(--secondary-bg, #ffffff);
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.15s ease;
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
                    background: rgba(99,102,241,0.08);
                    transform: rotate(15deg);
                }
                
                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0.5rem 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 9999px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    color: #ef4444;
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                
                .logout-btn:hover {
                    background: #ef4444;
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                
                /* ===========================================
                   Overlay للجوال
                =========================================== */
                .sidebar-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 998;
                    animation: fadeIn 0.3s ease;
                    cursor: pointer;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                /* ===========================================
                   المحتوى الرئيسي
                =========================================== */
                .dashboard-content {
                    margin-top: 70px;
                    padding: 32px;
                    min-height: calc(100vh - 70px);
                    background: var(--primary-bg, #f8fafc);
                }
                
                .dark-mode .dashboard-content {
                    background: var(--primary-bg, #0f172a);
                }
                
                /* ===========================================
                   رأس القسم
                =========================================== */
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 32px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .section-header {
                    border-color: var(--border-light, #334155);
                }
                
                .section-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: clamp(1.3rem, 4vw, 1.8rem);
                    font-weight: 700;
                }
                
                .dark-mode .section-title {
                    color: var(--text-primary, #f1f5f9);
                }
                
                .auto-refresh-status {
                    font-size: 0.75rem;
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    animation: pulse 2s infinite;
                }
                
                .last-updated {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg, #ffffff);
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .last-updated {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                    color: var(--text-secondary, #94a3b8);
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                
                /* ===========================================
                   بطاقات الملخص
                =========================================== */
                .summary-section {
                    background: var(--card-bg, #ffffff);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 32px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .summary-section {
                    background: var(--card-bg, #1e293b);
                    border-color: var(--border-light, #334155);
                }
                
                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 16px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .metrics-badge {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                }
                
                .metrics-count {
                    padding: 0.25rem 0.75rem;
                    background: var(--primary-bg, #f1f5f9);
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                }
                
                .metrics-hint {
                    padding: 0.25rem 0.75rem;
                    background: rgba(245, 158, 11, 0.1);
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    color: #f59e0b;
                }
                
                .summary-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: 1.2rem;
                }
                
                .summary-date {
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg, #f1f5f9);
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    color: var(--text-secondary, #475569);
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                
                .summary-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--secondary-bg, #ffffff);
                    border-radius: 12px;
                    border: 1px solid var(--border-light, #e2e8f0);
                    transition: all 0.25s ease;
                }
                
                .dark-mode .summary-card {
                    background: var(--secondary-bg, #0f1420);
                    border-color: var(--border-light, #334155);
                }
                
                .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                
                .summary-card.empty {
                    opacity: 0.8;
                    background: rgba(245, 158, 11, 0.05);
                }
                
                .card-icon {
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(99,102,241,0.08);
                    border-radius: 8px;
                }
                
                .summary-card.weight .card-icon { background: rgba(16, 185, 129, 0.1); }
                .summary-card.blood-pressure .card-icon { background: rgba(239, 68, 68, 0.1); }
                .summary-card.glucose .card-icon { background: rgba(245, 158, 11, 0.1); }
                
                .card-content {
                    flex: 1;
                }
                
                .card-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary, #64748b);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .card-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--text-primary, #0f172a);
                    line-height: 1.2;
                }
                
                .card-warning {
                    font-size: 0.65rem;
                    color: #f59e0b;
                    margin-top: 4px;
                }
                
                .card-time {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #64748b);
                    margin-top: 4px;
                }
                
                .card-sub {
                    font-size: 0.65rem;
                    color: var(--text-tertiary, #64748b);
                    margin-top: 4px;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 48px;
                    margin-top: 24px;
                }
                
                .empty-state .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
                
                .empty-state h4 {
                    margin: 0 0 8px;
                    color: var(--text-primary, #0f172a);
                }
                
                .empty-state p {
                    color: var(--text-secondary, #475569);
                    margin-bottom: 24px;
                }
                
                .add-btn {
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: 9999px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }
                
                .add-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                
                /* ===========================================
                   مكونات الصحة
                =========================================== */
                .health-components {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }
                
                .analytics-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }
                
                .history-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }
                
                /* ===========================================
                   حالة التحميل والخطأ
                =========================================== */
                .dashboard-loading,
                .dashboard-error {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--primary-bg, #f8fafc);
                }
                
                .loading-spinner,
                .error-content {
                    text-align: center;
                    padding: 48px;
                    background: var(--card-bg, #ffffff);
                    border-radius: 20px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    max-width: 400px;
                    margin: 24px;
                }
                
                .spinner {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 24px;
                    border: 3px solid var(--border-light, #e2e8f0);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .error-icon {
                    font-size: 3rem;
                    margin-bottom: 16px;
                }
                
                .error-content h2 {
                    margin: 0 0 24px;
                    color: #ef4444;
                }
                
                .retry-btn {
                    margin-top: 24px;
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
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
                        padding: 0 16px;
                        height: 60px;
                    }
                    
                    .dashboard-content {
                        margin-top: 60px;
                        padding: 16px;
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
                        padding: 8px;
                    }
                    
                    .refresh-controls {
                        gap: 8px;
                    }
                    
                    .refresh-btn {
                        padding: 0.25rem 0.75rem;
                        font-size: 0.75rem;
                    }
                    
                    .toggle-label {
                        display: none;
                    }
                    
                    .summary-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .analytics-section,
                    .history-section {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media (max-width: 480px) {
                    .control-left {
                        gap: 8px;
                    }
                    
                    .menu-toggle,
                    .theme-toggle {
                        width: 38px;
                        height: 38px;
                    }
                    
                    .summary-card {
                        padding: 12px;
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
                
                [dir="rtl"] .refresh-controls {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .summary-card {
                    flex-direction: row-reverse;
                }
                
                @media (max-width: 768px) {
                    [dir="rtl"] .refresh-controls {
                        flex-direction: row-reverse;
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
                    
                    .summary-card:hover,
                    .logout-btn:hover,
                    .theme-toggle:hover,
                    .refresh-btn:hover {
                        transform: none !important;
                    }
                    
                    .sidebar-overlay,
                    .auto-refresh-status {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;