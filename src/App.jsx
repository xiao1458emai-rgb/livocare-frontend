import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from './services/api';
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

    // ✅ دالة للتحقق من صحة التوكن
    const verifyToken = async (token) => {
        if (!token) return false;
        
        try {
            console.log('🔍 Verifying token...');
            const response = await axiosInstance.get('/users/me/', {
                timeout: 5000,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 200 && response.data) {
                console.log('✅ Token valid for user:', response.data.username);
                return true;
            }
            return false;
        } catch (error) {
            console.log('❌ Token invalid:', error.response?.status || error.message);
            if (error.response?.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            }
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initApp = async () => {
            try {
                // إعدادات اللغة
                const savedLanguage = localStorage.getItem('livocare_language') || 'ar';
                document.documentElement.lang = savedLanguage;
                document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';

                // التحقق من التوكن
                const token = localStorage.getItem('access_token');
                const isValid = await verifyToken(token);
                
                if (isMounted) {
                    setIsAuthenticated(isValid);
                    
                    // التحقق من الرابط
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
        
        // مستمع لتغيرات الرابط
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
    }, []);

    // ✅ دالة نجاح تسجيل الدخول
    const handleLoginSuccess = () => {
        console.log('🔍 Login successful - verifying token...');
        const token = localStorage.getItem('access_token');
        
        if (token) {
            setIsAuthenticated(true);
            setShowRegister(false);
            window.location.hash = '#/dashboard';
        } else {
            console.error('❌ No token found after login');
            window.location.hash = '#/login';
        }
    };

    // ✅ دالة نجاح التسجيل
    const handleRegisterSuccess = () => {
        console.log('🔍 Register successful - checking token...');
        const token = localStorage.getItem('access_token');
        
        if (token) {
            setIsAuthenticated(true);
            setShowRegister(false);
            window.location.hash = '#/dashboard';
        } else {
            console.error('❌ No token found after registration');
            window.location.hash = '#/login';
        }
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