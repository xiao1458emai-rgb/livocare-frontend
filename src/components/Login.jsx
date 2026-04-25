// src/components/Login.jsx
'use client';

import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api';
import '../index.css';

// ✅ دالة عامة لتطبيق اللغة (مطابقة لما في ProfileManager)
const applyLanguage = (lang) => {
    const isArabic = lang === 'ar';
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    
    // ✅ إرسال حدث لتغيير اللغة
    const languageChangeEvent = new CustomEvent('languageChange', { 
        detail: { lang, isArabic } 
    });
    window.dispatchEvent(languageChangeEvent);
};

function Login({ onLoginSuccess }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // ✅ تبديل اللغة
    const toggleLanguage = () => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        applyLanguage(newLang);
    };

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

    // ✅ تحميل الإعدادات المحفوظة
    useEffect(() => {
        // تحميل إعدادات الوضع المظلم
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(savedDarkMode);
        
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // تحميل اسم المستخدم المحفوظ
        const savedUsername = localStorage.getItem('saved_username');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        
        // تطبيق اللغة المحفوظة
        const savedLang = localStorage.getItem('app_lang') || 'ar';
        const isSavedArabic = savedLang === 'ar';
        document.documentElement.dir = isSavedArabic ? 'rtl' : 'ltr';
        document.documentElement.lang = savedLang;
        
        // التحقق من التوكن الحالي
        const token = localStorage.getItem('access_token');
        if (token && onLoginSuccess) {
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

    // ✅ الاستماع لتغييرات الثيم
    useEffect(() => {
        const handleThemeChange = (e) => {
            const newDarkMode = e.detail?.darkMode ?? false;
            setIsDarkMode(newDarkMode);
            
            if (newDarkMode) {
                document.documentElement.classList.add('dark-mode');
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark-mode');
                document.documentElement.setAttribute('data-theme', 'light');
            }
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        
        return () => {
            window.removeEventListener('themeChange', handleThemeChange);
        };
    }, []);

    // ✅ تبديل الوضع المظلم
    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        
        if (newDarkMode) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('livocare_darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('livocare_darkMode', 'false');
        }
        
        window.dispatchEvent(new CustomEvent('themeChange', { 
            detail: { darkMode: newDarkMode }
        }));
    };

    // ✅ معالجة تسجيل الدخول
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        if (!username.trim() || !password.trim()) {
            setMessage(isArabic ? '⚠️ الرجاء إدخال اسم المستخدم وكلمة المرور' : '⚠️ Please enter username and password');
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

            if (!response.data || !response.data.access) {
                throw new Error('No access token in response');
            }

            const { access, refresh } = response.data;
            
            localStorage.setItem('access_token', access);
            if (refresh) localStorage.setItem('refresh_token', refresh);
            
            console.log('💾 Token saved:', !!localStorage.getItem('access_token'));
            
            if (rememberMe) {
                localStorage.setItem('saved_username', username);
            } else {
                localStorage.removeItem('saved_username');
            }
            
            localStorage.setItem('username', username);
            
            setMessage(isArabic ? '✅ تم تسجيل الدخول بنجاح' : '✅ Login successful');
            setMessageType('success');
            
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
            
            let errorMessage = isArabic ? '❌ فشل تسجيل الدخول' : '❌ Login failed';
            
            if (error.response?.status === 400 || error.response?.status === 401) {
                errorMessage = isArabic ? '❌ اسم المستخدم أو كلمة المرور غير صحيحة' : '❌ Invalid username or password';
            } else if (error.response?.status === 404) {
                errorMessage = isArabic ? '❌ الخادم غير متاح' : '❌ Server not found';
            } else if (error.response?.status === 500) {
                errorMessage = isArabic ? '❌ خطأ في الخادم' : '❌ Server error';
            } else if (!navigator.onLine) {
                errorMessage = isArabic ? '📡 لا يوجد اتصال بالإنترنت' : '📡 No internet connection';
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // ✅ إعادة تعيين النموذج
    const resetForm = () => {
        if (!rememberMe) {
            setUsername('');
        }
        setPassword('');
        setMessage('');
        setMessageType('');
        setShowPassword(false);
    };

    // ✅ تعبئة بيانات تجريبية
    const fillDemoCredentials = () => {
        setUsername('test');
        setPassword('test');
        setMessage('');
        setMessageType('');
    };

    return (
        <div className="login-wrapper">
            {/* ✅ خلفية متحركة */}
            <div className="login-background">
                <div className="bg-blob bg-blob-1"></div>
                <div className="bg-blob bg-blob-2"></div>
                <div className="bg-blob bg-blob-3"></div>
            </div>

            {/* ✅ شريط التحكم العلوي */}
            <div className="login-navbar">
                <div className="navbar-content">
                    <div className="logo-area">
                        <div className="logo-circle">
                            <span className="logo-emoji">🫀</span>
                        </div>
                        <div className="logo-text">
                            <h1 className="logo-name">LivoCare</h1>
                            <span className="logo-tagline">{isArabic ? 'صحتك أولاً' : 'Your Health First'}</span>
                        </div>
                    </div>
                    
                    <div className="navbar-actions">
                        <button 
                            className="action-icon-btn"
                            onClick={toggleLanguage}
                            title={isArabic ? 'English' : 'العربية'}
                            aria-label={isArabic ? 'تغيير اللغة إلى الإنجليزية' : 'Change language to Arabic'}
                        >
                            🌐 <span className="action-text">{isArabic ? 'English' : 'العربية'}</span>
                        </button>
                        
                        <button 
                            className="action-icon-btn"
                            onClick={toggleDarkMode}
                            title={isDarkMode ? (isArabic ? 'الوضع الفاتح' : 'Light Mode') : (isArabic ? 'الوضع المظلم' : 'Dark Mode')}
                            aria-label={isDarkMode ? (isArabic ? 'تفعيل الوضع الفاتح' : 'Enable light mode') : (isArabic ? 'تفعيل الوضع المظلم' : 'Enable dark mode')}
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ المحتوى الرئيسي */}
            <div className="login-main">
                <div className="login-card">
                    <div className="card-header">
                        <div className="header-icon">
                            <span className="icon-lock">🔐</span>
                        </div>
                        <h2 className="header-title">{isArabic ? 'مرحباً بعودتك' : 'Welcome Back'}</h2>
                        <p className="header-subtitle">{isArabic ? 'سجل الدخول للوصول إلى لوحة التحكم' : 'Sign in to access your dashboard'}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* ✅ حقل اسم المستخدم */}
                        <div className="form-field">
                            <label className="field-label">
                                <span className="label-icon">👤</span>
                                {isArabic ? 'اسم المستخدم' : 'Username'}
                            </label>
                            <div className="input-container">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter username'}
                                    disabled={loading}
                                    autoComplete="username"
                                    className="form-input"
                                />
                            </div>
                        </div>
                        
                        {/* ✅ حقل كلمة المرور */}
                        <div className="form-field">
                            <label className="field-label">
                                <span className="label-icon">🔑</span>
                                {isArabic ? 'كلمة المرور' : 'Password'}
                            </label>
                            <div className="input-container password-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter password'}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="password-eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* ✅ خيارات النموذج */}
                        <div className="form-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span className="checkbox-text">{isArabic ? 'تذكرني' : 'Remember me'}</span>
                            </label>
                            
                            <Link 
                                to="/forgot-password" 
                                className="forgot-link"
                            >
                                {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                            </Link>
                        </div>
                        
                        {/* ✅ أزرار الإجراء */}
                        <div className="form-buttons">
                            <button 
                                type="submit" 
                                className="login-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        {isArabic ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                                    </>
                                ) : (
                                    <>
                                        🔓 {isArabic ? 'تسجيل الدخول' : 'Login'}
                                    </>
                                )}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="reset-btn"
                                disabled={loading}
                            >
                                🔄 {isArabic ? 'إعادة تعيين' : 'Reset'}
                            </button>
                        </div>
                        
                        {/* ✅ بيانات تجريبية */}
                        <div className="demo-section">
                            <div className="demo-header">
                                <span className="demo-icon">💡</span>
                                <span className="demo-title">{isArabic ? 'بيانات تجريبية' : 'Demo Credentials'}</span>
                            </div>
                            <div className="demo-content">
                                <div className="demo-item">
                                    <span className="demo-label">{isArabic ? 'اسم المستخدم' : 'Username'}:</span>
                                    <code className="demo-value">test</code>
                                </div>
                                <div className="demo-item">
                                    <span className="demo-label">{isArabic ? 'كلمة المرور' : 'Password'}:</span>
                                    <code className="demo-value">test</code>
                                </div>
                                <button 
                                    type="button"
                                    onClick={fillDemoCredentials}
                                    className="demo-fill-btn"
                                >
                                    ✨ {isArabic ? 'تعبئة تلقائية' : 'Auto fill'}
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    {/* ✅ رسائل التغذية الراجعة */}
                    {message && (
                        <div className={`notification-toast ${messageType}`}>
                            <span className="toast-icon">
                                {messageType === 'success' && '✅'}
                                {messageType === 'error' && '❌'}
                                {messageType === 'info' && 'ℹ️'}
                            </span>
                            <span className="toast-message">{message}</span>
                            <button 
                                className="toast-close"
                                onClick={() => {
                                    setMessage('');
                                    setMessageType('');
                                }}
                                aria-label="إغلاق"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    
                    {/* ✅ رابط إنشاء حساب */}
                    <div className="register-section">
                        <p className="register-text">
                            {isArabic ? 'ليس لديك حساب؟' : 'Don\'t have an account?'}
                            <Link 
                                to="/register" 
                                className="register-link"
                            >
                                {isArabic ? 'إنشاء حساب جديد' : 'Create account'}
                            </Link>
                        </p>
                    </div>
                    
                    {/* ✅ ميزات LivoCare */}
                    <div className="features-section">
                        <div className="features-header">
                            <h3 className="features-title">{isArabic ? 'ميزات LivoCare' : 'LivoCare Features'}</h3>
                            <div className="features-divider"></div>
                        </div>
                        
                        <div className="features-grid">
                            <div className="feature-item">
                                <span className="feature-emoji">📊</span>
                                <span className="feature-name">{isArabic ? 'تتبع الصحة' : 'Health Tracking'}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-emoji">🥗</span>
                                <span className="feature-name">{isArabic ? 'إدارة التغذية' : 'Nutrition'}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-emoji">😴</span>
                                <span className="feature-name">{isArabic ? 'مراقبة النوم' : 'Sleep'}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-emoji">😊</span>
                                <span className="feature-name">{isArabic ? 'تتبع المزاج' : 'Mood'}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-emoji">💊</span>
                                <span className="feature-name">{isArabic ? 'متابعة الأدوية' : 'Medications'}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-emoji">🏃</span>
                                <span className="feature-name">{isArabic ? 'تتبع النشاط' : 'Activity'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                /* ===== الحاوية الرئيسية ===== */
                .login-wrapper {
                    min-height: 100vh;
                    position: relative;
                    overflow: hidden;
                    background: var(--primary-bg);
                }

                /* ===== الخلفية المتحركة ===== */
                .login-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow: hidden;
                    z-index: 0;
                }

                .bg-blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.15;
                    animation: float 20s infinite ease-in-out;
                }

                .bg-blob-1 {
                    width: 400px;
                    height: 400px;
                    background: var(--primary);
                    top: -100px;
                    right: -100px;
                    animation-delay: 0s;
                }

                .bg-blob-2 {
                    width: 500px;
                    height: 500px;
                    background: #8b5cf6;
                    bottom: -150px;
                    left: -150px;
                    animation-delay: -5s;
                }

                .bg-blob-3 {
                    width: 300px;
                    height: 300px;
                    background: #10b981;
                    bottom: 30%;
                    right: 20%;
                    animation-delay: -10s;
                }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }

                /* ===== شريط التحكم ===== */
                .login-navbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 70px;
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-light);
                    z-index: 100;
                    backdrop-filter: blur(10px);
                    box-shadow: var(--shadow-sm);
                }

                .navbar-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    height: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 1.5rem;
                }

                .logo-area {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .logo-circle {
                    width: 40px;
                    height: 40px;
                    background: var(--primary-gradient);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .logo-emoji {
                    font-size: 1.3rem;
                }

                .logo-name {
                    font-size: 1.3rem;
                    font-weight: 700;
                    margin: 0;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .logo-tagline {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    display: block;
                }

                .navbar-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .action-icon-btn {
                    width: 40px;
                    height: 40px;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                }

                .action-icon-btn:hover {
                    background: var(--hover-bg);
                    transform: scale(1.05);
                }

                .action-text {
                    display: none;
                }

                /* ===== المحتوى الرئيسي ===== */
                .login-main {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6rem 1.5rem 2rem;
                    position: relative;
                    z-index: 1;
                }

                .login-card {
                    max-width: 480px;
                    width: 100%;
                    background: var(--card-bg);
                    border-radius: 32px;
                    padding: 2rem;
                    box-shadow: var(--shadow-xl);
                    border: 1px solid var(--border-light);
                    backdrop-filter: blur(10px);
                    transition: all var(--transition-medium);
                }

                /* ===== رأس البطاقة ===== */
                .card-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .header-icon {
                    width: 70px;
                    height: 70px;
                    background: var(--primary-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                }

                .icon-lock {
                    font-size: 2rem;
                }

                .header-title {
                    font-size: 1.8rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem;
                    color: var(--text-primary);
                }

                .header-subtitle {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                }

                /* ===== نموذج تسجيل الدخول ===== */
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .field-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .label-icon {
                    font-size: 1rem;
                }

                .input-container {
                    position: relative;
                }

                .form-input {
                    width: 100%;
                    padding: 0.85rem 1rem;
                    border: 1px solid var(--border-light);
                    border-radius: 14px;
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    transition: all var(--transition-fast);
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }

                .form-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .password-container {
                    position: relative;
                }

                .password-eye {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.1rem;
                    padding: 0.25rem;
                    border-radius: 8px;
                    transition: all var(--transition-fast);
                }

                [dir="rtl"] .password-eye {
                    right: auto;
                    left: 1rem;
                }

                .password-eye:hover {
                    background: var(--hover-bg);
                }

                /* ===== خيارات النموذج ===== */
                .form-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 0.5rem 0;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    position: relative;
                }

                .checkbox-input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .checkbox-custom {
                    width: 18px;
                    height: 18px;
                    border: 2px solid var(--border-medium);
                    border-radius: 4px;
                    transition: all var(--transition-fast);
                }

                .checkbox-input:checked + .checkbox-custom {
                    background: var(--primary);
                    border-color: var(--primary);
                    position: relative;
                }

                .checkbox-input:checked + .checkbox-custom::after {
                    content: '✓';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 11px;
                }

                .checkbox-text {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                .forgot-link {
                    font-size: 0.85rem;
                    color: var(--primary);
                    text-decoration: none;
                    transition: color var(--transition-fast);
                }

                .forgot-link:hover {
                    text-decoration: underline;
                }

                /* ===== أزرار الإجراء ===== */
                .form-buttons {
                    display: flex;
                    gap: 1rem;
                    margin-top: 0.5rem;
                }

                .login-btn, .reset-btn {
                    flex: 1;
                    padding: 0.85rem;
                    border: none;
                    border-radius: 14px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .login-btn {
                    background: var(--primary-gradient);
                    color: white;
                }

                .login-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .reset-btn {
                    background: var(--secondary-bg);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-light);
                }

                .reset-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                    transform: translateY(-2px);
                }

                .login-btn:disabled, .reset-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                /* ===== بيانات تجريبية ===== */
                .demo-section {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-top: 0.5rem;
                    border: 1px solid var(--border-light);
                }

                .demo-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .demo-icon {
                    font-size: 1rem;
                }

                .demo-title {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .demo-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }

                .demo-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                }

                .demo-label {
                    color: var(--text-secondary);
                }

                .demo-value {
                    background: var(--card-bg);
                    padding: 0.2rem 0.5rem;
                    border-radius: 6px;
                    font-family: monospace;
                    color: var(--primary);
                }

                .demo-fill-btn {
                    background: none;
                    border: 1px solid var(--primary);
                    border-radius: 8px;
                    padding: 0.25rem 0.75rem;
                    color: var(--primary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.75rem;
                }

                .demo-fill-btn:hover {
                    background: var(--primary);
                    color: white;
                }

                /* ===== إشعار ===== */
                .notification-toast {
                    margin-top: 1rem;
                    padding: 0.85rem 1rem;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    animation: slideIn 0.3s ease;
                }

                .notification-toast.success {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid #10b981;
                    color: #10b981;
                }

                .notification-toast.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                }

                .notification-toast.info {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid #3b82f6;
                    color: #3b82f6;
                }

                .toast-icon {
                    font-size: 1rem;
                }

                .toast-message {
                    flex: 1;
                    font-size: 0.85rem;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 1rem;
                    opacity: 0.7;
                    transition: opacity var(--transition-fast);
                }

                .toast-close:hover {
                    opacity: 1;
                }

                /* ===== قسم التسجيل ===== */
                .register-section {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-light);
                    text-align: center;
                }

                .register-text {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .register-link {
                    color: var(--primary);
                    font-weight: 600;
                    text-decoration: none;
                    margin-left: 0.5rem;
                }

                [dir="rtl"] .register-link {
                    margin-left: 0;
                    margin-right: 0.5rem;
                }

                .register-link:hover {
                    text-decoration: underline;
                }

                /* ===== قسم الميزات ===== */
                .features-section {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-light);
                }

                .features-header {
                    text-align: center;
                    margin-bottom: 1rem;
                }

                .features-title {
                    font-size: 0.9rem;
                    margin: 0 0 0.5rem;
                    color: var(--text-primary);
                }

                .features-divider {
                    width: 50px;
                    height: 2px;
                    background: var(--primary-gradient);
                    margin: 0 auto;
                    border-radius: 2px;
                }

                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    padding: 0.5rem;
                    background: var(--secondary-bg);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .feature-emoji {
                    font-size: 0.9rem;
                }

                /* ===== أنيميشن ===== */
                @keyframes spin {
                    to { transform: rotate(360deg); }
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

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 768px) {
                    .login-navbar {
                        height: 60px;
                    }

                    .navbar-content {
                        padding: 0 1rem;
                    }

                    .action-text {
                        display: inline;
                    }

                    .action-icon-btn {
                        width: auto;
                        padding: 0 0.75rem;
                        gap: 0.35rem;
                    }

                    .login-card {
                        padding: 1.5rem;
                    }

                    .header-title {
                        font-size: 1.5rem;
                    }

                    .features-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .demo-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .demo-fill-btn {
                        width: 100%;
                        text-align: center;
                    }
                }

                @media (max-width: 480px) {
                    .login-main {
                        padding: 5rem 1rem 1rem;
                    }

                    .login-card {
                        padding: 1.25rem;
                    }

                    .form-buttons {
                        flex-direction: column;
                    }

                    .features-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .bg-blob {
                        animation: none;
                    }

                    .btn-spinner {
                        animation: none;
                    }

                    .notification-toast {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;