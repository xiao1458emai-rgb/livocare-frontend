// src/components/Dashboard.jsx - النسخة النهائية المبسطة
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api'; 
import '../index.css';

// ✅ المكونات المتبقية فقط (أزلنا HealthHistory, HealthCharts, HealthForm)
import Sidebar from './Sidebar';   
import NutritionMain from './nutrition/NutritionMain';
import SleepTracker from './SleepTracker';
import HabitTracker from './HabitTracker';
import MoodTracker from './MoodTracker'; 
import ProfileManager from './usermangment';
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import ActivityForm from './ActivityForm'; // ✅ هذا المكون يحتوي على كل شيء

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
    
    const [activeSection, setActiveSection] = useState('activity'); // ✅ القسم الافتراضي إلى الأنشطة
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
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
    
    // ✅ تبديل الوضع المظلم
    const toggleDarkMode = useCallback(() => {
        setDarkMode(prev => !prev);
    }, []);
    
    // ✅ تبديل السايدبار
    const toggleSidebar = useCallback(() => {
        setIsSidebarVisible(prev => !prev);
    }, []);
    
    // ✅ تحديث البيانات
    const refreshData = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    // ✅ عناوين الأقسام
    const getSectionTitle = useCallback((sectionKey) => {
        const titles = {
            'activity': isArabic ? '🏃 النشاط البدني' : '🏃 Physical Activity',
            'nutrition': isArabic ? '🍽️ التغذية' : '🍽️ Nutrition',
            'sleep': isArabic ? '😴 النوم' : '😴 Sleep',
            'habits': isArabic ? '✅ العادات' : '✅ Habits',
            'mood': isArabic ? '😊 المزاج' : '😊 Mood',
            'chat': isArabic ? '🤖 المساعد الذكي' : '🤖 AI Assistant',
            'smart': isArabic ? '✨ الميزات الذكية' : '✨ Smart Features',
            'profile': isArabic ? '👤 الملف الشخصي' : '👤 Profile',
            'notifications': isArabic ? '🔔 الإشعارات' : '🔔 Notifications',
            'reports': isArabic ? '📊 التقارير' : '📊 Reports'
        };
        return titles[sectionKey] || (isArabic ? '🏃 النشاط البدني' : '🏃 Physical Activity');
    }, [isArabic]);
    
    // ✅ الحصول على تاريخ اليوم
    const getTodayDate = useCallback(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    }, [isArabic]);
    
    // ✅ دالة معالجة إضافة البيانات
    const handleDataSubmitted = useCallback(() => {
        console.log('Data submitted - refreshing');
        refreshData();
    }, [refreshData]);
    
    // ✅ عرض محتوى القسم المحدد
    const renderSectionContent = useCallback(() => {
        switch (activeSection) {
            case 'activity': 
                return <ActivityForm 
                    onDataSubmitted={handleDataSubmitted} 
                    onActivityChange={handleDataSubmitted} 
                    isArabic={isArabic} 
                />;
            case 'nutrition': 
                return <NutritionMain onDataSubmitted={() => {}} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'sleep': 
                return <SleepTracker onDataSubmitted={() => {}} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'habits': 
                return <HabitTracker onDataSubmitted={() => {}} isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'mood': 
                return <MoodTracker isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'chat': 
                return <ChatInterface isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'profile': 
                return <ProfileManager isAuthReady={isAuthReady} />;
            case 'smart': 
                return <SmartDashboard isArabic={isArabic} />;
            case 'notifications': 
                return <Notifications isAuthReady={isAuthReady} isArabic={isArabic} />;
            case 'reports': 
                return <Reports isAuthReady={isAuthReady} isArabic={isArabic} />;
            default: 
                return <ActivityForm 
                    onDataSubmitted={handleDataSubmitted} 
                    onActivityChange={handleDataSubmitted} 
                    isArabic={isArabic} 
                />;
        }
    }, [activeSection, isAuthReady, isArabic, handleDataSubmitted]);
    
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

            {/* السايدبار */}
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
            
            {/* Overlay للجوال */}
            {isSidebarVisible && isMobile && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setIsSidebarVisible(false)}
                    role="button"
                    aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
                />
            )}

            {/* المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <h1 className="section-title">{getSectionTitle(activeSection)}</h1>
                </div>

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>
            
            <style jsx>{`
  /* ===========================================
   Dashboard.css - الأنماط الداخلية فقط
   ✅ لوحة التحكم الرئيسية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== تخطيط لوحة التحكم ===== */
.dashboard-layout {
    min-height: 100vh;
    background: var(--primary-bg, #f8fafc);
    transition: background 0.3s ease;
}

.dark-mode .dashboard-layout {
    background: #0f172a;
}

/* ===== شريط التحكم العلوي ===== */
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
    padding: 0 2rem;
    z-index: 100;
    backdrop-filter: blur(10px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dark-mode .control-bar {
    background: #1e293b;
    border-bottom-color: #334155;
}

/* ===== الجزء الأيسر من شريط التحكم ===== */
.control-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

/* زر القائمة */
.menu-toggle {
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 12px;
    background: var(--secondary-bg, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .menu-toggle {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

.menu-toggle:hover {
    background: rgba(99, 102, 241, 0.1);
    transform: scale(1.02);
}

/* اسم التطبيق */
.app-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.3rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.app-name .logo {
    font-size: 1.5rem;
    -webkit-text-fill-color: initial;
}

/* ===== الجزء الأوسط من شريط التحكم ===== */
.control-center {
    flex: 1;
    text-align: center;
}

.date-display {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 40px;
    color: var(--text-secondary, #475569);
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .date-display {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

/* ===== الجزء الأيمن من شريط التحكم ===== */
.control-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

/* زر تبديل الوضع المظلم */
.theme-toggle {
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 12px;
    background: var(--secondary-bg, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .theme-toggle {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

.theme-toggle:hover {
    background: rgba(99, 102, 241, 0.1);
    transform: rotate(15deg);
}

/* زر تسجيل الخروج */
.logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.25s ease;
    color: #ef4444;
    font-weight: 600;
    font-size: 0.85rem;
}

.logout-btn:hover {
    background: #ef4444;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.logout-icon {
    font-size: 1rem;
}

/* ===== خلفية السايدبار ===== */
.sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    animation: fadeIn 0.25s ease;
    cursor: pointer;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== المحتوى الرئيسي ===== */
.dashboard-content {
    margin-top: 70px;
    padding: 2rem;
    min-height: calc(100vh - 70px);
    background: var(--primary-bg, #f8fafc);
}

.dark-mode .dashboard-content {
    background: #0f172a;
}

/* ===== رأس القسم ===== */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #e2e8f0);
}

.dark-mode .section-header {
    border-bottom-color: #334155;
}

.section-title {
    margin: 0;
    font-size: clamp(1.3rem, 4vw, 1.8rem);
    font-weight: 800;
    color: var(--text-primary, #0f172a);
}

.dark-mode .section-title {
    color: #f1f5f9;
}

/* ===== محتوى القسم ===== */
.section-content {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .control-left {
    flex-direction: row-reverse;
}

[dir="rtl"] .control-right {
    flex-direction: row-reverse;
}

[dir="rtl"] .section-header {
    flex-direction: row-reverse;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
    
    .logout-btn:hover,
    .theme-toggle:hover,
    .menu-toggle:hover {
        transform: none !important;
    }
    
    .sidebar-overlay {
        animation: none !important;
    }
    
    .section-content {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .control-bar {
        border-bottom-width: 2px;
    }
    
    .logout-btn {
        border-width: 2px;
    }
    
    .menu-toggle,
    .theme-toggle {
        border-width: 2px;
    }
    
    .section-header {
        border-bottom-width: 3px;
    }
}
            `}</style>
        </div>
    );
}

export default Dashboard;