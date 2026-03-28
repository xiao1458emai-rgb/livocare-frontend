// src/App.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import Login from './components/Login';
import Register from './components/Register'; // ✅ أضف هذا السطر
import Dashboard from './components/Dashboard';

function App() {
    const { t, i18n } = useTranslation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // 🔹 التأكد من تطبيق الإعدادات عند تحميل التطبيق
    useEffect(() => {
        console.log('📱 App mounted');
        
        // تحميل إعدادات الوضع المظلم
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(savedDarkMode);
        
        // تطبيق الوضع المظلم
        const applyDarkMode = (isDark) => {
            const html = document.documentElement;
            if (isDark) {
                html.classList.add('dark-mode');
                html.style.setProperty('--primary-bg', '#1a1a1a');
                html.style.setProperty('--secondary-bg', '#2d2d2d');
            } else {
                html.classList.remove('dark-mode');
                html.style.setProperty('--primary-bg', '#ffffff');
                html.style.setProperty('--secondary-bg', '#f8f9fa');
            }
        };
        
        applyDarkMode(savedDarkMode);
        console.log('🌙 Dark mode:', savedDarkMode);
        
        // تحميل إعدادات اللغة
        const savedLanguage = localStorage.getItem('livocare_language') || 
                             localStorage.getItem('language') || 
                             'ar';
        
        // تطبيق اللغة
        if (i18n.language !== savedLanguage) {
            i18n.changeLanguage(savedLanguage);
        }
        document.documentElement.lang = savedLanguage;
        document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
        console.log('🌍 Language:', savedLanguage);
        
        // 🔹 التحقق من المصادقة
        const token = localStorage.getItem('access_token');
        console.log('🔍 Token exists:', !!token);
        setIsAuthenticated(!!token);
        
        // محاكاة تحميل أولي
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);
        
        return () => clearTimeout(timer);
    }, [i18n]);

    // 🔹 استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            console.log('🎨 Theme changed:', e.detail?.darkMode);
            const newDarkMode = e.detail?.darkMode ?? false;
            setDarkMode(newDarkMode);
            
            const html = document.documentElement;
            if (newDarkMode) {
                html.classList.add('dark-mode');
                html.style.setProperty('--primary-bg', '#1a1a1a');
                html.style.setProperty('--secondary-bg', '#2d2d2d');
                localStorage.setItem('livocare_darkMode', 'true');
            } else {
                html.classList.remove('dark-mode');
                html.style.setProperty('--primary-bg', '#ffffff');
                html.style.setProperty('--secondary-bg', '#f8f9fa');
                localStorage.setItem('livocare_darkMode', 'false');
            }
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        
        return () => {
            window.removeEventListener('themeChange', handleThemeChange);
        };
    }, []);

    // 🔹 استمع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (e) => {
            console.log('🗣️ Language changed:', e.detail?.language);
            const newLang = e.detail?.language || 'ar';
            i18n.changeLanguage(newLang);
            document.documentElement.lang = newLang;
            document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        window.addEventListener('languageChanged', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
            window.removeEventListener('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    // 🔹 معالجة تسجيل الدخول
    const handleLoginSuccess = () => {
        console.log('🔍 Login successful');
        setIsAuthenticated(true);
    };

    // 🔹 معالجة تسجيل الخروج
    const handleLogout = () => {
        console.log('🔍 Logging out');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
    };

    // 🔹 تبديل الوضع المظلم
    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        
        window.dispatchEvent(new CustomEvent('themeChange', { 
            detail: { darkMode: newDarkMode }
        }));
    };

    // 🔹 تغيير اللغة
    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('livocare_language', lng);
        localStorage.setItem('language', lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
        
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lng, direction: lng === 'ar' ? 'rtl' : 'ltr' }
        }));
    };

    // 🔹 شاشة التحميل
    if (isLoading) {
        return (
            <div className="loading-app">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
            {/* شريط التحكم العلوي */}
            <header className="app-header">
                <div className="header-left">
                    <h1>{t('app.title')}</h1>
                    <div className="app-version">v1.0.0</div>
                </div>
                
                <div className="header-controls">
                    {/* تبديل اللغة */}
                    <div className="language-switcher">
<select
  value={i18n.language}
  onChange={(e) => changeLanguage(e.target.value)}
  className="language-select"
>
  <option value="ar">🇸🇦 العربية</option>
  <option value="en">🇺🇸 English</option>
</select>
                    </div>
                    
                    {/* تبديل الوضع المظلم */}
                    <button 
                        className="theme-toggle"
                        onClick={toggleDarkMode}
                        title={darkMode ? t('app.switchToLight') : t('app.switchToDark')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    
                    {/* زر تسجيل الخروج */}
                    {isAuthenticated && (
                        <button onClick={handleLogout} className="logout-btn">
                            {t('app.logout')}
                        </button>
                    )}
                </div>
            </header>
            
            {/* المحتوى الرئيسي */}
            <main className="app-main">
                {isAuthenticated ? (
                    <Dashboard />
                ) : (
                    <>
                        {/* ✅ التحقق من المسار لعرض صفحة التسجيل أو تسجيل الدخول */}
                        {window.location.pathname === '/register' ? (
                            <Register onRegisterSuccess={handleLoginSuccess} />
                        ) : (
                            <Login onLoginSuccess={handleLoginSuccess} />
                        )}
                    </>
                )}
            </main>
            
            {/* التذييل */}
            <footer className="app-footer">
                <p>{t('app.footer')} © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
}

export default App;