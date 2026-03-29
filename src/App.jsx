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
        console.log('📱 App mounted');
        
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(savedDarkMode);
        
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
        
        const savedLanguage = localStorage.getItem('livocare_language') || 'ar';
        if (i18n.language !== savedLanguage) {
            i18n.changeLanguage(savedLanguage);
        }
        document.documentElement.lang = savedLanguage;
        document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
        
        const token = localStorage.getItem('access_token');
        setIsAuthenticated(!!token);
        
        // التحقق من الرابط
        if (window.location.hash === '#/register') {
            setShowRegister(true);
        }
        
        setTimeout(() => setIsLoading(false), 500);
    }, [i18n]);

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