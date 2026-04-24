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

    // ✅ تبديل اللغة (يتم الاحتفاظ به في صفحة تسجيل الدخول لأنها الصفحة الوحيدة قبل الدخول)
    const toggleLanguage = () => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        applyLanguage(newLang);
    };

    // ✅ الاستماع لتغييرات اللغة (للتزامن مع أي تغيير يحدث أثناء البقاء في الصفحة)
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

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const savedUsername = localStorage.getItem('saved_username');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
        
        // تطبيق اللغة المحفوظة عند تحميل الصفحة
        const savedLang = localStorage.getItem('app_lang');
        if (savedLang) {
            const isSavedArabic = savedLang === 'ar';
            document.documentElement.dir = isSavedArabic ? 'rtl' : 'ltr';
            document.documentElement.lang = savedLang;
        }
        
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

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            const newDarkMode = e.detail?.darkMode ?? false;
            
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
        const newDarkMode = !document.documentElement.classList.contains('dark-mode');
        
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        if (!username.trim() || !password.trim()) {
            setMessage(isArabic ? 'الرجاء إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
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
            
            setMessage(isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
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
            
            let errorMessage = isArabic ? 'فشل تسجيل الدخول' : 'Login failed';
            
            if (error.response?.status === 400 || error.response?.status === 401) {
                errorMessage = isArabic ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password';
            } else if (error.response?.status === 404) {
                errorMessage = isArabic ? 'الخادم غير متاح' : 'Server not found';
            } else if (error.response?.status === 500) {
                errorMessage = isArabic ? 'خطأ في الخادم' : 'Server error';
            } else if (!navigator.onLine) {
                errorMessage = isArabic ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection';
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

    // تجربة بيانات دخول سريعة
    const fillDemoCredentials = () => {
        setUsername('test');
        setPassword('test');
        setMessage('');
        setMessageType('');
    };

    return (
        <div className="login-container">
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
                            <span className="app-subtitle">{isArabic ? 'العناية بصحتك' : 'Your Health Care'}</span>
                        </div>
                    </div>
                    
                    <div className="login-controls">
                        {/* ✅ زر اللغة موجود في صفحة تسجيل الدخول لأنها الصفحة الوحيدة قبل الدخول */}
                        <button 
                            className="lang-btn"
                            onClick={toggleLanguage}
                            title={isArabic ? 'English' : 'العربية'}
                        >
                            {isArabic ? 'EN' : 'AR'}
                        </button>
                        
                        <button 
                            className="theme-toggle"
                            onClick={toggleDarkMode}
                            title={document.documentElement.classList.contains('dark-mode') ? (isArabic ? 'وضع فاتح' : 'Light Mode') : (isArabic ? 'وضع مظلم' : 'Dark Mode')}
                        >
                            {document.documentElement.classList.contains('dark-mode') ? '☀️' : '🌙'}
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
                        <h2>{isArabic ? 'تسجيل الدخول' : 'Login'}</h2>
                        <p className="login-description">{isArabic ? 'أدخل بياناتك للوصول إلى حسابك' : 'Enter your credentials to access your account'}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="field-group">
                            <label>
                                <span className="field-icon">👤</span>
                                {isArabic ? 'اسم المستخدم' : 'Username'}
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter username'}
                                    disabled={loading}
                                    autoComplete="username"
                                    className="search-input"
                                />
                            </div>
                        </div>
                        
                        <div className="field-group">
                            <label>
                                <span className="field-icon">🔑</span>
                                {isArabic ? 'كلمة المرور' : 'Password'}
                            </label>
                            <div className="input-wrapper password-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter password'}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="search-input"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')}
                                    style={{
                                        position: 'absolute',
                                        right: 'var(--spacing-md)',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: 'var(--spacing-xs)',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    tabIndex="-1"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* خيار تذكرني */}
                        <div className="form-options" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <label className="remember-me" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                />
                                <span>{isArabic ? 'تذكرني' : 'Remember me'}</span>
                            </label>
                            
                            <Link 
                                to="/forgot-password" 
                                className="forgot-password-link"
                                style={{ 
                                    color: 'var(--primary)', 
                                    textDecoration: 'none', 
                                    fontSize: '0.85rem',
                                    transition: 'color var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                                {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                            </Link>
                        </div>
                        
                        {/* أزرار الإجراء */}
                        <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <button 
                                type="submit" 
                                className="type-btn active"
                                disabled={loading}
                                style={{ flex: 2 }}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                        {isArabic ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                                    </>
                                ) : (
                                    <>{isArabic ? 'دخول' : 'Login'}</>
                                )}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="type-btn"
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                🔄 {isArabic ? 'إعادة تعيين' : 'Reset'}
                            </button>
                        </div>
                        
                        {/* بيانات تجريبية منسقة */}
                        <div className="demo-credentials" style={{ 
                            marginBottom: 'var(--spacing-lg)', 
                            padding: 'var(--spacing-md)', 
                            background: 'var(--secondary-bg)', 
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-light)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                <span style={{ fontSize: '1.1rem' }}>💡</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{isArabic ? 'بيانات تجريبية' : 'Demo Credentials'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div><span style={{ fontWeight: 500 }}>{isArabic ? 'اسم المستخدم' : 'Username'}:</span> test</div>
                                <div><span style={{ fontWeight: 500 }}>{isArabic ? 'كلمة المرور' : 'Password'}:</span> test</div>
                                <button 
                                    type="button"
                                    onClick={fillDemoCredentials}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '2px var(--spacing-sm)',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'var(--primary)';
                                        e.target.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'none';
                                        e.target.style.color = 'var(--primary)';
                                    }}
                                >
                                    {isArabic ? 'تعبئة' : 'Fill'}
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    {/* رسائل التغذية الراجعة */}
                    {message && (
                        <div className={`notification-message ${messageType}`} style={{
                            marginBottom: 'var(--spacing-lg)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: messageType === 'success' ? 'var(--success-bg)' : messageType === 'error' ? 'var(--error-bg)' : 'var(--info-bg)',
                            color: messageType === 'success' ? 'var(--success)' : messageType === 'error' ? 'var(--error)' : 'var(--info)',
                            border: `1px solid ${messageType === 'success' ? 'var(--success)' : messageType === 'error' ? 'var(--error)' : 'var(--info)'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <span>
                                    {messageType === 'success' && '✅'}
                                    {messageType === 'error' && '❌'}
                                    {messageType === 'info' && 'ℹ️'}
                                </span>
                                <span>{message}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    setMessage('');
                                    setMessageType('');
                                }}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
                                aria-label="إغلاق"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    
                    {/* رابط إنشاء حساب */}
                    <div className="register-link" style={{ 
                        marginTop: 'var(--spacing-lg)', 
                        paddingTop: 'var(--spacing-lg)', 
                        borderTop: '1px solid var(--border-light)', 
                        textAlign: 'center' 
                    }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            {isArabic ? 'ليس لديك حساب؟' : 'Don\'t have an account?'}{' '}
                            <Link 
                                to="/register" 
                                className="register-link-btn"
                                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                            >
                                {isArabic ? 'إنشاء حساب جديد' : 'Create account'}
                            </Link>
                        </p>
                    </div>
                    
                    {/* ميزات LivoCare */}
                    <div className="app-info" style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border-light)' }}>
                        <div className="app-info-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{isArabic ? 'ميزات LivoCare' : 'LivoCare Features'}</h3>
                            <div className="header-decoration" style={{ width: '50px', height: '3px', background: 'var(--primary-gradient)', borderRadius: '2px', marginTop: 'var(--spacing-sm)' }}></div>
                        </div>
                        
                        <ul className="features-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>📊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تتبع الصحة (وزن، ضغط، سكر)' : 'Health tracking (weight, BP, glucose)'}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>🥗</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'إدارة التغذية' : 'Nutrition management'}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>😴</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'مراقبة النوم' : 'Sleep monitoring'}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>😊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تتبع الحالة المزاجية' : 'Mood tracking'}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>💊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'متابعة الأدوية' : 'Medication tracking'}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                .lang-btn {
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    border: 1px solid var(--border-light);
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    margin-right: var(--spacing-sm);
                }

                .lang-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .password-toggle:hover {
                    background: var(--hover-bg);
                }
                
                [dir="rtl"] .password-toggle {
                    right: auto;
                    left: var(--spacing-md);
                }
                
                @media (max-width: 768px) {
                    .features-list {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;