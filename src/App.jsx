// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

// مكون منفصل للمحتوى (يحتاج useNavigate)
function AppContent() {
    const { t, i18n } = useTranslation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('📱 App mounted');
        
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(savedDarkMode);
        
        const applyDarkMode = (isDark) => {
            const html = document.documentElement;
            if (isDark) {
                html.classList.add('dark-mode');
            } else {
                html.classList.remove('dark-mode');
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
        
        setTimeout(() => setIsLoading(false), 500);
    }, [i18n]);

    const handleLoginSuccess = () => {
        console.log('🔍 Login successful');
        setIsAuthenticated(true);
        navigate('/dashboard');
    };

    const handleRegisterSuccess = () => {
        console.log('🔍 Register successful');
        setIsAuthenticated(true);
        navigate('/dashboard');
    };

    const handleLogout = () => {
        console.log('🔍 Logging out');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        navigate('/login');
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

    return (
        <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
            <header className="app-header">
                <div className="header-left">
                    <h1>{t('app.title')}</h1>
                    <div className="app-version">v1.0.0</div>
                </div>
                <div className="header-controls">
                    <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)} className="language-select">
                        <option value="ar">🇸🇦 العربية</option>
                        <option value="en">🇺🇸 English</option>
                    </select>
                    <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? t('app.switchToLight') : t('app.switchToDark')}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                    {isAuthenticated && (
                        <button onClick={handleLogout} className="logout-btn">{t('app.logout')}</button>
                    )}
                </div>
            </header>
            
            <main className="app-main">
                <Routes>
                    <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register onRegisterSuccess={handleRegisterSuccess} />} />
                    <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                </Routes>
            </main>
            
            <footer className="app-footer">
                <p>{t('app.footer')} © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
}

// المكون الرئيسي
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;