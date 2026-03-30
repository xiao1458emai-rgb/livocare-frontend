import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function App() {
    const { t, i18n } = useTranslation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const initApp = async () => {
            try {
                const savedLanguage = localStorage.getItem('livocare_language') || 'ar';
                
                const isRTL = savedLanguage === 'ar';
                document.documentElement.lang = savedLanguage;
                document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

                const token = localStorage.getItem('access_token');
                
                if (isMounted) {
                    setIsAuthenticated(!!token);
                    
                    // ✅ التحقق من الرابط عند بدء التشغيل
                    if (window.location.hash === '#/register') {
                        setShowRegister(true);
                    }
                    
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Initialization error:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        initApp();
        
        // ✅ إضافة مستمع لتغيرات الـ hash
        const handleHashChange = () => {
            if (window.location.hash === '#/register') {
                setShowRegister(true);
            } else if (window.location.hash === '#/login' || window.location.hash === '#/dashboard') {
                setShowRegister(false);
            }
        };
        
        window.addEventListener('hashchange', handleHashChange);
        
        return () => { 
            isMounted = false;
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []); // 👈 مصفوفة فارغة لضمان التنفيذ مرة واحدة

    const handleLoginSuccess = () => {
        console.log('🔍 Login successful');
        setIsAuthenticated(true);
        setShowRegister(false);
        window.location.hash = '#/dashboard';
    };

    const handleRegisterSuccess = () => {
        console.log('🔍 Register successful');
        setIsAuthenticated(true);
        setShowRegister(false);
        window.location.hash = '#/dashboard';
    };

    const handleLogout = () => {
        console.log('🔍 Logging out');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        setShowRegister(false);
        window.location.hash = '#/login';
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: newDarkMode } }));
    };

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('livocare_language', lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lng } }));
    };

    if (isLoading) {
        return (
            <div className="loading-app">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Dashboard onLogout={handleLogout} />;
    }

    if (showRegister) {
        return <Register onRegisterSuccess={handleRegisterSuccess} />;
    }

    return <Login onLoginSuccess={handleLoginSuccess} onRegisterClick={() => {
        setShowRegister(true);
        window.location.hash = '#/register';
    }} />;
}

export default App;