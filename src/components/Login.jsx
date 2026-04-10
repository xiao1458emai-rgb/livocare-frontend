// src/components/Login.jsx
'use client';

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api';
import '../index.css';

function Login({ onLoginSuccess }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // تحميل إعدادات الوضع المظلم واللغة المحفوظة
// في Login.jsx، قم بتعديل useEffect الأول:

useEffect(() => {
    const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedDarkMode);
    
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername) {
        setUsername(savedUsername);
        setRememberMe(true);
    }
    
    if (savedDarkMode) {
        document.documentElement.classList.add('dark-mode');
    }
    
    // ✅ إزالة التحقق التلقائي من التوكن هنا لأنه يتم في App.js
    // فقط إذا كان المستخدم في صفحة login ولديه توكن صالح، نوجهه للداشبورد
    const token = localStorage.getItem('access_token');
    if (token && onLoginSuccess) {
        // اختبر التوكن بسرعة
        axiosInstance.get('/health_status/')
            .then(() => {
                console.log('✅ Token is valid, redirecting to dashboard');
                onLoginSuccess();
            })
            .catch(() => {
                console.log('❌ Token invalid, staying on login');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            });
    }
}, [onLoginSuccess]);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            const newDarkMode = e.detail?.darkMode ?? false;
            setDarkMode(newDarkMode);
            
            if (newDarkMode) {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        
        return () => {
            window.removeEventListener('themeChange', handleThemeChange);
        };
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        
        if (newDarkMode) {
            document.documentElement.classList.add('dark-mode');
            localStorage.setItem('livocare_darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark-mode');
            localStorage.setItem('livocare_darkMode', 'false');
        }
        
        window.dispatchEvent(new CustomEvent('themeChange', { 
            detail: { darkMode: newDarkMode }
        }));
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        if (!username.trim() || !password.trim()) {
            setMessage(t('login.emptyFields'));
            setMessageType('error');
            setLoading(false);
            return;
        }

        try {
            console.log('📤 Sending login request for:', username);
            
            const response = await axiosInstance.post('/auth/token/', {
                username: username.trim(),
                password: password
            });

            console.log('🔑 Login response:', response.data);

            // ✅ تأكد من وجود access token
            if (!response.data || !response.data.access) {
                throw new Error('No access token in response');
            }

            const { access, refresh } = response.data;
            
            // ✅ حفظ التوكن
            localStorage.setItem('access_token', access);
            if (refresh) localStorage.setItem('refresh_token', refresh);
            
            // ✅ التحقق من الحفظ
            const savedToken = localStorage.getItem('access_token');
            console.log('💾 Token saved:', !!savedToken);
            console.log('💾 Token preview:', savedToken ? savedToken.substring(0, 50) + '...' : 'missing');
            
            if (rememberMe) {
                localStorage.setItem('saved_username', username);
            } else {
                localStorage.removeItem('saved_username');
            }
            
            localStorage.setItem('username', username);
            
            setMessage(t('login.success'));
            setMessageType('success');
            
            // ✅ تأخير الانتقال لضمان حفظ التوكن
            setTimeout(() => {
                console.log('🚀 Calling onLoginSuccess');
                if (onLoginSuccess) {
                    onLoginSuccess();
                } else {
                    navigate('/dashboard');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('❌ Response data:', error.response?.data);
            
            let errorMessage = t('login.failed');
            
            if (error.response?.status === 400) {
                errorMessage = t('login.invalidCredentials');
            } else if (error.response?.status === 401) {
                errorMessage = t('login.unauthorized');
            } else if (error.response?.status === 404) {
                errorMessage = t('login.serverNotFound');
            } else if (error.response?.status === 500) {
                errorMessage = t('login.serverError');
            } else if (!navigator.onLine) {
                errorMessage = t('login.networkError');
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setMessage('');
        setMessageType('');
        setRememberMe(false);
    };

    return (
        <div className={`login-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* خلفية متحركة */}
            <div className="login-background">
                <div className="bg-shape bg-shape-1"></div>
                <div className="bg-shape bg-shape-2"></div>
                <div className="bg-shape bg-shape-3"></div>
            </div>

            {/* شريط التحكم العلوي */}
            <div className="login-control-bar">
                <div className="control-bar-content">
                    <div className="app-title">
                        <div className="logo-wrapper">
                            <span className="logo-icon">💚</span>
                        </div>
                        <div className="title-text">
                            <h1>LivoCare</h1>
                            <span className="app-subtitle">{t('login.appSubtitle')}</span>
                        </div>
                    </div>
                    
                    <div className="login-controls">
                        <div className="language-switcher">
                            <button 
                                className={`lang-btn ${i18n.language === 'ar' ? 'active' : ''}`}
                                onClick={() => changeLanguage('ar')}
                                title="العربية"
                            >
                                <span className="lang-flag">🇸🇦</span>
                                <span className="lang-text">عربي</span>
                            </button>
                            <button 
                                className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                                onClick={() => changeLanguage('en')}
                                title="English"
                            >
                                <span className="lang-flag">🇺🇸</span>
                                <span className="lang-text">EN</span>
                            </button>
                        </div>
                        
                        <button 
                            className="theme-toggle"
                            onClick={toggleDarkMode}
                            title={darkMode ? t('login.switchToLight') : t('login.switchToDark')}
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="login-content">
                <div className="login-form-card">
                    <div className="login-header">
                        <div className="login-icon-wrapper">
                            <div className="login-icon">🔐</div>
                        </div>
                        <h2>{t('login.title')}</h2>
                        <p className="login-description">{t('login.description')}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">
                                <span className="label-icon">👤</span>
                                {t('login.username')}
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder={t('login.usernamePlaceholder')}
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">
                                <span className="label-icon">🔑</span>
                                {t('login.password')}
                            </label>
                            <div className="input-wrapper password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder={t('login.passwordPlaceholder')}
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                />
                                <span className="checkbox-text">{t('login.rememberMe')}</span>
                            </label>
                        </div>
                        
                        <div className="login-actions">
                            <button 
                                type="submit" 
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        {t('login.loggingIn')}
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">🔑</span>
                                        {t('login.loginButton')}
                                    </>
                                )}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="reset-button"
                                disabled={loading}
                            >
                                <span className="btn-icon">🔄</span>
                                {t('login.resetButton')}
                            </button>
                        </div>
                        
                        {/* معلومات إضافية */}
                        <div className="login-info">
                            <div className="info-item">
                                <span className="info-icon">💡</span>
                                <p>{t('login.tip')}</p>
                            </div>
                            <div className="info-item">
                                <span className="info-icon">👤</span>
                                <p>{t('login.demoInfo')}</p>
                            </div>
                        </div>
                    </form>
                    
                    {/* رسائل التغذية الراجعة */}
                    {message && (
                        <div className={`message ${messageType}`}>
                            <div className="message-content">
                                <span className="message-icon">
                                    {messageType === 'success' && '✅'}
                                    {messageType === 'error' && '❌'}
                                    {messageType === 'info' && 'ℹ️'}
                                </span>
                                <span className="message-text">{message}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    setMessage('');
                                    setMessageType('');
                                }}
                                className="dismiss-message"
                                aria-label={t('login.dismiss')}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    
                    <div className="register-link">
                        <p>
                            {t('login.noAccount')} 
                            <Link 
                                to="/register" 
                                className="register-link-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                {t('login.register')}
                            </Link>
                        </p>
                    </div>
                    
                    {/* معلومات التطبيق */}
                    <div className="app-info">
                        <div className="app-info-header">
                            <h3>🌟 {t('login.featuresTitle')}</h3>
                            <div className="header-decoration"></div>
                        </div>
                        
                        <ul className="features-list">
                            <li>
                                <span className="feature-icon">📊</span>
                                <span className="feature-text">{t('login.feature1')}</span>
                            </li>
                            <li>
                                <span className="feature-icon">🥗</span>
                                <span className="feature-text">{t('login.feature2')}</span>
                            </li>
                            <li>
                                <span className="feature-icon">🌙</span>
                                <span className="feature-text">{t('login.feature3')}</span>
                            </li>
                            <li>
                                <span className="feature-icon">😊</span>
                                <span className="feature-text">{t('login.feature4')}</span>
                            </li>
                            <li>
                                <span className="feature-icon">💊</span>
                                <span className="feature-text">{t('login.feature5')}</span>
                            </li>
                        </ul>
                        
                        
                    </div>
                </div>
            </div>

        <style jsx>{`

                /* ===========================================
                   Login.css - النسخة المحسنة والمطورة
                   تم التحسين لجميع أحجام الشاشات والوضع الليلي
                   =========================================== */

                /* ===== المتغيرات والثيمات ===== */
                :root {
                    /* الألوان الأساسية */
                    --primary-bg: #f8fafc;
                    --secondary-bg: #ffffff;
                    --tertiary-bg: #f1f5f9;
                    --card-bg: #ffffff;
                    --hover-bg: rgba(0, 0, 0, 0.05);
                    
                    /* النصوص */
                    --text-primary: #0f172a;
                    --text-secondary: #475569;
                    --text-tertiary: #64748b;
                    
                    /* الحدود */
                    --border-light: #e2e8f0;
                    --border-medium: #cbd5e1;
                    
                    /* الألوان الأساسية */
                    --primary-color: #3b82f6;
                    --primary-dark: #2563eb;
                    --primary-light: #60a5fa;
                    
                    /* ألوان الحالات */
                    --success-color: #10b981;
                    --success-bg: #d1fae5;
                    --warning-color: #f59e0b;
                    --warning-bg: #fef3c7;
                    --error-color: #ef4444;
                    --error-bg: #fee2e2;
                    --info-color: #3b82f6;
                    --info-bg: #dbeafe;
                    
                    /* الظلال */
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
                    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
                    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
                    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
                    --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.25);
                    
                    /* التدرجات */
                    --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    
                    /* الانتقالات */
                    --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-medium: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    
                    /* المسافات */
                    --spacing-xs: 0.25rem;
                    --spacing-sm: 0.5rem;
                    --spacing-md: 1rem;
                    --spacing-lg: 1.5rem;
                    --spacing-xl: 2rem;
                    --spacing-2xl: 3rem;
                    
                    /* الحواف */
                    --radius-sm: 8px;
                    --radius-md: 12px;
                    --radius-lg: 16px;
                    --radius-xl: 24px;
                    --radius-2xl: 30px;
                    --radius-full: 9999px;
                }

                /* الثيم المظلم - تحسين الألوان */
                .dark-mode {
                    --primary-bg: #0f172a;
                    --secondary-bg: #1e293b;
                    --tertiary-bg: #334155;
                    --card-bg: #1e293b;
                    --hover-bg: rgba(255, 255, 255, 0.1);
                    --text-primary: #f8fafc;
                    --text-secondary: #cbd5e1;
                    --text-tertiary: #94a3b8;
                    --border-light: #334155;
                    --border-medium: #475569;
                    --primary-color: #60a5fa;
                    --primary-dark: #3b82f6;
                    --primary-light: #93c5fd;
                    --success-color: #4ade80;
                    --success-bg: rgba(16, 185, 129, 0.2);
                    --warning-color: #fbbf24;
                    --warning-bg: rgba(245, 158, 11, 0.2);
                    --error-color: #f87171;
                    --error-bg: rgba(239, 68, 68, 0.2);
                    --info-color: #60a5fa;
                    --info-bg: rgba(59, 130, 246, 0.2);
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
                    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
                    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
                    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
                    --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.5);
                }

                /* ===== الأنماط الأساسية ===== */
                .login-container {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: background var(--transition-slow);
                    position: relative;
                    overflow-x: hidden;
                }

                /* ===== خلفية متحركة مع دعم الحركة المخفضة ===== */
                .login-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow: hidden;
                    z-index: 0;
                }

                .bg-shape {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(60px);
                    animation: float 20s infinite;
                }

                .bg-shape-1 {
                    top: -100px;
                    left: -100px;
                    width: 400px;
                    height: 400px;
                    background: rgba(59, 130, 246, 0.1);
                    animation-delay: 0s;
                }

                .bg-shape-2 {
                    bottom: -100px;
                    right: -100px;
                    width: 500px;
                    height: 500px;
                    background: rgba(16, 185, 129, 0.1);
                    animation-delay: -5s;
                }

                .bg-shape-3 {
                    top: 50%;
                    left: 50%;
                    width: 600px;
                    height: 600px;
                    background: rgba(239, 68, 68, 0.05);
                    transform: translate(-50%, -50%);
                    animation-delay: -10s;
                }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(50px, 50px) rotate(5deg); }
                    50% { transform: translate(0, 100px) rotate(0deg); }
                    75% { transform: translate(-50px, 50px) rotate(-5deg); }
                }

                /* دعم الحركة المخفضة */
                .reduce-motion .bg-shape,
                .reduce-motion .logo-wrapper,
                .reduce-motion .login-icon-wrapper,
                .reduce-motion .status-dot {
                    animation: none !important;
                }

                .reduce-motion .login-form-card:hover {
                    transform: none !important;
                }

                /* ===== شريط التحكم ===== */
                .login-control-bar {
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-light);
                    padding: var(--spacing-md) var(--spacing-xl);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                    transition: all var(--transition-medium);
                }

                .control-bar-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    max-width: 1400px;
                    margin: 0 auto;
                    gap: var(--spacing-md);
                }

                .app-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .logo-wrapper {
                    width: 50px;
                    height: 50px;
                    background: var(--gradient-primary);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s infinite;
                    transition: transform var(--transition-fast);
                }

                .logo-wrapper:active {
                    transform: scale(0.95);
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                .logo-icon {
                    font-size: 2rem;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                }

                .title-text h1 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.8rem;
                    font-weight: 700;
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .app-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .login-controls {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .language-switcher {
                    display: flex;
                    gap: var(--spacing-xs);
                    background: var(--secondary-bg);
                    padding: var(--spacing-xs);
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-light);
                }

                .lang-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm) var(--spacing-md);
                    background: transparent;
                    color: var(--text-secondary);
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.9rem;
                }

                .lang-btn:hover {
                    background: var(--hover-bg);
                    transform: translateY(-1px);
                }

                .lang-btn:active {
                    transform: translateY(0);
                }

                .lang-btn.active {
                    background: var(--primary-color);
                    color: white;
                }

                .lang-flag {
                    font-size: 1.1rem;
                }

                .lang-text {
                    font-size: 0.9rem;
                }

                .theme-toggle {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .theme-toggle:hover {
                    transform: rotate(15deg);
                    background: var(--primary-color);
                    color: white;
                }

                .theme-toggle:active {
                    transform: rotate(0deg) scale(0.95);
                }

                /* ===== المحتوى الرئيسي ===== */
                .login-content {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: calc(100vh - 80px);
                    padding: var(--spacing-2xl);
                    gap: var(--spacing-2xl);
                    max-width: 1400px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 1;
                }

                /* ===== بطاقة تسجيل الدخول ===== */
                .login-form-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-2xl);
                    box-shadow: var(--shadow-xl);
                    border: 1px solid var(--border-light);
                    width: 100%;
                    max-width: 450px;
                    transition: all var(--transition-medium);
                    position: relative;
                    overflow: hidden;
                }

                .login-form-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--gradient-primary);
                }

                .login-form-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-2xl);
                }

                .login-header {
                    text-align: center;
                    margin-bottom: var(--spacing-2xl);
                }

                .login-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: var(--gradient-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto var(--spacing-lg);
                    animation: bounce 2s infinite;
                    transition: transform var(--transition-fast);
                }

                .login-icon-wrapper:active {
                    transform: scale(0.95);
                }

                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .login-icon {
                    font-size: 3rem;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
                }

                .login-header h2 {
                    margin: 0 0 var(--spacing-sm) 0;
                    color: var(--text-primary);
                    font-size: 2rem;
                    font-weight: 700;
                }

                .login-description {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    line-height: 1.5;
                }

                /* ===== حقول النموذج ===== */
                .form-group {
                    margin-bottom: var(--spacing-lg);
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing-sm);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .label-icon {
                    font-size: 1.1rem;
                }

                .input-wrapper {
                    position: relative;
                }

                .form-group input {
                    width: 100%;
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    border: 2px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    font-size: 1rem;
                    transition: all var(--transition-fast);
                }

                .form-group input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
                }

                .form-group input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .form-group input[aria-invalid="true"] {
                    border-color: var(--error-color);
                }

                .password-wrapper {
                    position: relative;
                }

                .password-toggle {
                    position: absolute;
                    right: var(--spacing-md);
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: var(--spacing-sm);
                    color: var(--text-tertiary);
                    transition: all var(--transition-fast);
                    border-radius: var(--radius-full);
                }

                .password-toggle:hover {
                    color: var(--primary-color);
                    background: var(--hover-bg);
                }

                .password-toggle:active {
                    transform: translateY(-50%) scale(0.95);
                }

                /* ===== خيارات النموذج ===== */
                .form-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-lg);
                }

                .remember-me {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    cursor: pointer;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .remember-me input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                .checkbox-text {
                    user-select: none;
                }

                .forgot-password {
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all var(--transition-fast);
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border-radius: var(--radius-sm);
                }

                .forgot-password:hover {
                    text-decoration: underline;
                    background: var(--hover-bg);
                }

                /* ===== أزرار الإجراء ===== */
                .login-actions {
                    display: flex;
                    gap: var(--spacing-md);
                    margin-top: var(--spacing-2xl);
                }

                .login-button,
                .reset-button {
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                    transition: all var(--transition-medium);
                    border: none;
                }

                .login-button {
                    flex: 2;
                    background: var(--gradient-primary);
                    color: white;
                }

                .login-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .login-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .reset-button {
                    flex: 1;
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    border: 1px solid var(--border-light);
                }

                .reset-button:hover:not(:disabled) {
                    background: var(--error-bg);
                    color: var(--error-color);
                    border-color: var(--error-color);
                    transform: translateY(-2px);
                }

                .reset-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* ===== معلومات إضافية ===== */
                .login-info {
                    margin-top: var(--spacing-lg);
                }

                .info-item {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md);
                    background: var(--info-bg);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--spacing-sm);
                }

                .info-icon {
                    font-size: 1.2rem;
                }

                .info-item p {
                    margin: 0;
                    color: var(--info-color);
                    font-size: 0.9rem;
                }

                /* ===== الرسائل ===== */
                .message {
                    margin-top: var(--spacing-lg);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .message.success {
                    background: var(--success-bg);
                    color: var(--success-color);
                    border: 1px solid var(--success-color);
                }

                .message.error {
                    background: var(--error-bg);
                    color: var(--error-color);
                    border: 1px solid var(--error-color);
                }

                .message-content {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    flex: 1;
                }

                .message-icon {
                    font-size: 1.1rem;
                }

                .dismiss-message {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 1.1rem;
                    padding: var(--spacing-xs);
                    border-radius: var(--radius-full);
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-fast);
                }

                .dismiss-message:hover {
                    background: rgba(0, 0, 0, 0.1);
                    transform: scale(1.1);
                }

                .dismiss-message:active {
                    transform: scale(0.95);
                }

                /* ===== رابط التسجيل ===== */
                .register-link {
                    margin-top: var(--spacing-lg);
                    padding-top: var(--spacing-lg);
                    border-top: 1px solid var(--border-light);
                    text-align: center;
                }

                .register-link p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }

                .register-button {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: 600;
                    cursor: pointer;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-radius: var(--radius-md);
                    font-size: 0.95rem;
                    transition: all var(--transition-fast);
                    border: 1px solid var(--primary-color);
                }

                .register-button:hover {
                    background: var(--primary-color);
                    color: white;
                    transform: translateX(2px);
                }

                .register-button:active {
                    transform: translateX(0);
                }

                .btn-arrow {
                    transition: transform var(--transition-fast);
                }

                .register-button:hover .btn-arrow {
                    transform: translateX(3px);
                }

                /* ===== معلومات التطبيق ===== */
                .app-info {
                    background: var(--card-bg);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-2xl);
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border-light);
                    width: 100%;
                    max-width: 400px;
                    transition: all var(--transition-medium);
                }

                .app-info:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-xl);
                }

                .app-info-header {
                    position: relative;
                    margin-bottom: var(--spacing-2xl);
                }

                .app-info-header h3 {
                    margin: 0 0 var(--spacing-sm) 0;
                    color: var(--text-primary);
                    font-size: 1.5rem;
                }

                .header-decoration {
                    width: 50px;
                    height: 4px;
                    background: var(--gradient-primary);
                    border-radius: 2px;
                }

                .features-list {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 var(--spacing-2xl) 0;
                }

                .features-list li {
                    padding: var(--spacing-md) 0;
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    transition: all var(--transition-fast);
                }

                .features-list li:hover {
                    transform: translateX(5px);
                    color: var(--primary-color);
                }

                .features-list li:last-child {
                    border-bottom: none;
                }

                .feature-icon {
                    font-size: 1.3rem;
                }

                .feature-text {
                    color: var(--text-secondary);
                }

                .app-stats {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--spacing-lg);
                }

                .stat-item {
                    text-align: center;
                }

                .stat-value {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--primary-color);
                }

                .stat-label {
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                }

                .stat-divider {
                    width: 1px;
                    height: 30px;
                    background: var(--border-light);
                }

                .app-version {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: var(--spacing-md);
                    border-top: 1px solid var(--border-light);
                }

                .version-info {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    color: var(--text-tertiary);
                    font-size: 0.9rem;
                }

                .version-icon {
                    font-size: 1rem;
                }

                .app-status {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    color: var(--success-color);
                    font-weight: 600;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: var(--success-color);
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }

                /* ===== RTL دعم كامل ===== */
                [dir="rtl"] .password-toggle {
                    right: auto;
                    left: var(--spacing-md);
                }

                [dir="rtl"] .btn-arrow {
                    transform: rotate(180deg);
                }

                [dir="rtl"] .register-button:hover .btn-arrow {
                    transform: rotate(180deg) translateX(3px);
                }

                [dir="rtl"] .features-list li:hover {
                    transform: translateX(-5px);
                }

                [dir="rtl"] .features-list li {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .header-decoration {
                    margin-right: 0;
                    margin-left: auto;
                }

                [dir="rtl"] .info-item {
                    flex-direction: row-reverse;
                }

                /* ===== تصميم متجاوب - شاشات كبيرة (≥1024px) ===== */
                @media (min-width: 1024px) {
                    .login-content {
                        gap: var(--spacing-2xl);
                    }
                    
                    .login-form-card,
                    .app-info {
                        transition: all var(--transition-medium);
                    }
                }

                /* ===== تصميم متجاوب - شاشات متوسطة (768px - 1023px) ===== */
                @media (max-width: 1023px) and (min-width: 768px) {
                    .login-content {
                        flex-direction: column;
                        gap: var(--spacing-xl);
                        padding: var(--spacing-xl);
                    }
                    
                    .login-form-card,
                    .app-info {
                        max-width: 550px;
                        width: 100%;
                    }
                    
                    .login-actions {
                        flex-direction: column;
                    }
                    
                    .login-button,
                    .reset-button {
                        width: 100%;
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .app-title {
                        justify-content: center;
                    }
                }

                /* ===== تصميم متجاوب - شاشات صغيرة (480px - 767px) ===== */
                @media (max-width: 767px) and (min-width: 480px) {
                    .login-control-bar {
                        padding: var(--spacing-md) var(--spacing-lg);
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .app-title h1 {
                        font-size: 1.5rem;
                    }
                    
                    .login-content {
                        padding: var(--spacing-lg);
                        gap: var(--spacing-lg);
                    }
                    
                    .login-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .login-header h2 {
                        font-size: 1.75rem;
                    }
                    
                    .login-actions {
                        flex-direction: column;
                        gap: var(--spacing-sm);
                    }
                    
                    .app-info {
                        padding: var(--spacing-lg);
                    }
                    
                    .app-info-header h3 {
                        font-size: 1.3rem;
                    }
                    
                    .language-switcher {
                        justify-content: center;
                    }
                    
                    .form-options {
                        flex-direction: column;
                        gap: var(--spacing-sm);
                        align-items: flex-start;
                    }
                    
                    .features-list li:hover {
                        transform: none;
                    }
                }

                /* ===== تصميم متجاوب - شاشات صغيرة جداً (<480px) ===== */
                @media (max-width: 479px) {
                    .login-control-bar {
                        padding: var(--spacing-sm) var(--spacing-md);
                    }
                    
                    .app-title {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .logo-wrapper {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .logo-icon {
                        font-size: 1.5rem;
                    }
                    
                    .title-text h1 {
                        font-size: 1.3rem;
                    }
                    
                    .app-subtitle {
                        font-size: 0.8rem;
                    }
                    
                    .login-controls {
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    
                    .lang-text {
                        display: none;
                    }
                    
                    .lang-btn {
                        padding: var(--spacing-sm);
                    }
                    
                    .login-content {
                        padding: var(--spacing-md);
                        gap: var(--spacing-md);
                    }
                    
                    .login-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .login-header h2 {
                        font-size: 1.5rem;
                    }
                    
                    .login-description {
                        font-size: 0.85rem;
                    }
                    
                    .login-icon-wrapper {
                        width: 60px;
                        height: 60px;
                    }
                    
                    .login-icon {
                        font-size: 2rem;
                    }
                    
                    .form-group input {
                        padding: var(--spacing-sm);
                        font-size: 0.9rem;
                    }
                    
                    .login-actions {
                        flex-direction: column;
                        gap: var(--spacing-sm);
                    }
                    
                    .login-button,
                    .reset-button {
                        padding: var(--spacing-sm);
                        font-size: 0.9rem;
                    }
                    
                    .app-info {
                        padding: var(--spacing-lg);
                    }
                    
                    .app-info-header h3 {
                        font-size: 1.2rem;
                    }
                    
                    .features-list li {
                        padding: var(--spacing-sm) 0;
                        font-size: 0.9rem;
                    }
                    
                    .feature-icon {
                        font-size: 1.1rem;
                    }
                    
                    .app-stats {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .stat-divider {
                        width: 100%;
                        height: 1px;
                    }
                    
                    .app-version {
                        flex-direction: column;
                        gap: var(--spacing-sm);
                        text-align: center;
                    }
                    
                    .info-item {
                        padding: var(--spacing-sm);
                    }
                    
                    .info-item p {
                        font-size: 0.85rem;
                    }
                    
                    .message {
                        padding: var(--spacing-sm);
                        font-size: 0.9rem;
                    }
                    
                    .register-link p {
                        flex-direction: column;
                    }
                }

                /* ===== وضع أفقي للشاشات العريضة ===== */
                @media (max-width: 768px) and (orientation: landscape) {
                    .login-content {
                        min-height: auto;
                        padding: var(--spacing-lg);
                    }
                    
                    .login-form-card {
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    
                    .app-info {
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    
                    .login-control-bar {
                        position: relative;
                    }
                }

                /* ===== تحسينات الوصولية ===== */
                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }

                /* ===== تحسينات للمستخدمين الذين يفضلون التباين العالي ===== */
                @media (prefers-contrast: high) {
                    .login-form-card,
                    .app-info {
                        border-width: 2px;
                    }
                    
                    .login-button,
                    .reset-button,
                    .lang-btn.active {
                        border: 2px solid currentColor;
                    }
                }

                /* ===== تحسينات للمستخدمين الذين يفضلون وضع السكون ===== */
                @media (prefers-color-scheme: dark) {
                    .login-container:not(.dark-mode) {
                        --primary-bg: #0f172a;
                        --secondary-bg: #1e293b;
                    }
                }

                /* ===== تأثيرات لمسية للأجهزة المحمولة ===== */
                @media (hover: none) and (pointer: coarse) {
                    .login-button:active,
                    .reset-button:active,
                    .lang-btn:active,
                    .theme-toggle:active,
                    .register-button:active,
                    .forgot-password:active {
                        transform: scale(0.98);
                    }
                    
                    .features-list li:active {
                        transform: translateX(5px);
                    }
                    
                    [dir="rtl"] .features-list li:active {
                        transform: translateX(-5px);
                    }
                }

                /* ===== شريط التمرير المخصص ===== */
                .login-form-card::-webkit-scrollbar,
                .app-info::-webkit-scrollbar {
                    width: 8px;
                }

                .login-form-card::-webkit-scrollbar-track,
                .app-info::-webkit-scrollbar-track {
                    background: var(--tertiary-bg);
                    border-radius: var(--radius-full);
                }

                .login-form-card::-webkit-scrollbar-thumb,
                .app-info::-webkit-scrollbar-thumb {
                    background: var(--primary-color);
                    border-radius: var(--radius-full);
                }

                .login-form-card::-webkit-scrollbar-thumb:hover,
                .app-info::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-dark);
                }
            `}</style>
        </div>
    );
}

export default Login;