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
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // تحميل إعدادات الوضع المظلم واللغة المحفوظة
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
            
            setMessage(t('login.success'));
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
                            title={document.documentElement.classList.contains('dark-mode') ? t('login.switchToLight') : t('login.switchToDark')}
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
                        <h2>{t('login.title')}</h2>
                        <p className="login-description">{t('login.description')}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="field-group">
                            <label>
                                <span className="field-icon">👤</span>
                                {t('login.username')}
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder={t('login.usernamePlaceholder')}
                                    disabled={loading}
                                    autoComplete="username"
                                    className="search-input"
                                />
                            </div>
                        </div>
                        
                        <div className="field-group">
                            <label>
                                <span className="field-icon">🔑</span>
                                {t('login.password')}
                            </label>
                            <div className="input-wrapper password-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder={t('login.passwordPlaceholder')}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="search-input"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                                <span>{t('login.rememberMe')}</span>
                            </label>
                            
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
                                        {t('login.loggingIn')}
                                    </>
                                ) : (
                                    <>🔐 {t('login.loginButton')}</>
                                )}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="type-btn"
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                🔄 {t('login.resetButton')}
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
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('login.demoCredentials')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div><span style={{ fontWeight: 500 }}>{t('login.username')}:</span> test</div>
                                <div><span style={{ fontWeight: 500 }}>{t('login.password')}:</span> test</div>
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
                                    {t('login.fillCredentials')}
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
                            {t('login.noAccount')}{' '}
                            <Link 
                                to="/register" 
                                className="register-link-btn"
                                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                            >
                                {t('login.register')}
                            </Link>
                        </p>
                    </div>
                    
                    {/* ميزات LivoCare (بدون إيموجي زائد) */}
                    <div className="app-info" style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border-light)' }}>
                        <div className="app-info-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t('login.featuresTitle')}</h3>
                            <div className="header-decoration" style={{ width: '50px', height: '3px', background: 'var(--primary-gradient)', borderRadius: '2px', marginTop: 'var(--spacing-sm)' }}></div>
                        </div>
                        
                        <ul className="features-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>📊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature1')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>🥗</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature2')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>😴</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature3')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>😊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature4')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', background: 'var(--secondary-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="feature-icon" style={{ fontSize: '1.2rem' }}>💊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature5')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
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