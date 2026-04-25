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

        </div>
    );
}

export default Login;