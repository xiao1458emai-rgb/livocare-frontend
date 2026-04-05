// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

    // ✅ دالة للتحقق من التوكن
    const verifyToken = async (token) => {
        if (!token) return false;
        
        try {
            console.log('🔍 Verifying token...');
            const response = await axiosInstance.get('/health_status/', {
                timeout: 5000,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                console.log('✅ Token is valid');
                return true;
            }
            return false;
        } catch (error) {
            console.log('❌ Token verification failed:', error.response?.status);
            if (error.response?.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            }
            return false;
        }
    };

    // ✅ التحقق من المصادقة عند تحميل التطبيق
    useEffect(() => {
        const initApp = async () => {
            try {
                // إعدادات اللغة
                const savedLanguage = localStorage.getItem('livocare_language') || 'ar';
                i18n.changeLanguage(savedLanguage);
                document.documentElement.lang = savedLanguage;
                document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';

                // التحقق من التوكن
                const token = localStorage.getItem('access_token');
                const isValid = await verifyToken(token);
                
                setIsAuthenticated(isValid);
                
                if (!isValid) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initApp();
    }, [i18n]);

    // ✅ دالة نجاح تسجيل الدخول
    const handleLoginSuccess = () => {
        console.log('🔍 Login successful');
        const token = localStorage.getItem('access_token');
        
        if (token) {
            setIsAuthenticated(true);
        } else {
            console.error('❌ No token found after login');
        }
    };

    // ✅ دالة نجاح التسجيل
    const handleRegisterSuccess = () => {
        console.log('🔍 Register successful');
        const token = localStorage.getItem('access_token');
        
        if (token) {
            setIsAuthenticated(true);
        } else {
            console.error('❌ No token found after registration');
        }
    };

    // ✅ دالة تسجيل الخروج
    const handleLogout = () => {
        console.log('🔍 Logging out');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return (
            <div className="loading-app">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    // ✅ Router واحد فقط هنا
    return (
        <BrowserRouter>
            <Routes>
                <Route 
                    path="/login" 
                    element={
                        isAuthenticated ? 
                        <Navigate to="/dashboard" replace /> : 
                        <Login onLoginSuccess={handleLoginSuccess} />
                    } 
                />
                <Route 
                    path="/register" 
                    element={
                        isAuthenticated ? 
                        <Navigate to="/dashboard" replace /> : 
                        <Register onRegisterSuccess={handleRegisterSuccess} />
                    } 
                />
                <Route 
                    path="/dashboard/*" 
                    element={
                        isAuthenticated ? 
                        <Dashboard onLogout={handleLogout} /> : 
                        <Navigate to="/login" replace />
                    } 
                />
                <Route 
                    path="/" 
                    element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;