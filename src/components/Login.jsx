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
                                    style={{
                                        position: 'absolute',
                                        right: 'var(--spacing-md)',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
                                    }}
                                    tabIndex="-1"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

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
                        
                        <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
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
                                    <>🔑 {t('login.loginButton')}</>
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
                        
                        {/* معلومات إضافية */}
                        <div className="login-info" style={{ marginTop: 'var(--spacing-lg)' }}>
                            <div className="info-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-sm)' }}>
                                <span className="info-icon">💡</span>
                                <p style={{ margin: 0, color: 'var(--info)', fontSize: '0.9rem' }}>{t('login.tip')}</p>
                            </div>
                            <div className="info-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)' }}>
                                <span className="info-icon">👤</span>
                                <p style={{ margin: 0, color: 'var(--info)', fontSize: '0.9rem' }}>{t('login.demoInfo')}</p>
                            </div>
                        </div>
                    </form>
                    
                    {/* رسائل التغذية الراجعة */}
                    {message && (
                        <div className={`notification-message ${messageType}`} style={{
                            marginTop: 'var(--spacing-lg)',
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
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    
                    <div className="register-link" style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                            {t('login.noAccount')} 
                            <Link 
                                to="/register" 
                                className="register-link-btn"
                                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: 'var(--spacing-sm)' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                {t('login.register')}
                            </Link>
                        </p>
                    </div>
                    
                    {/* معلومات التطبيق */}
                    <div className="app-info" style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border-light)' }}>
                        <div className="app-info-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ margin: '0 0 var(--spacing-sm) 0', color: 'var(--text-primary)' }}>🌟 {t('login.featuresTitle')}</h3>
                            <div className="header-decoration" style={{ width: '50px', height: '4px', background: 'var(--primary-gradient)', borderRadius: '2px' }}></div>
                        </div>
                        
                        <ul className="features-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span className="feature-icon">📊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature1')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span className="feature-icon">🥗</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature2')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span className="feature-icon">🌙</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature3')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span className="feature-icon">😊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature4')}</span>
                            </li>
                            <li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span className="feature-icon">💊</span>
                                <span className="feature-text" style={{ color: 'var(--text-secondary)' }}>{t('login.feature5')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* الأنماط الإضافية */}
            <style>{`
                /* أنماط صفحة تسجيل الدخول */
                .login-container {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: background var(--transition-slow);
                    position: relative;
                    overflow-x: hidden;
                }

                /* خلفية متحركة */
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

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* شريط التحكم */
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
                    background: var(--primary-gradient);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform var(--transition-fast);
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
                    background: var(--primary-gradient);
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

                .lang-btn.active {
                    background: var(--primary);
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
                    background: var(--primary);
                    color: white;
                }

                /* المحتوى الرئيسي */
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

                /* بطاقة تسجيل الدخول */
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
                    background: var(--primary-gradient);
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
                    background: var(--primary-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto var(--spacing-lg);
                    transition: transform var(--transition-fast);
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

                /* حقول النموذج */
                .field-group {
                    margin-bottom: var(--spacing-lg);
                }

                .field-group label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing-sm);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .field-icon {
                    font-size: 1.1rem;
                }

                .password-toggle:hover {
                    color: var(--primary);
                    background: var(--hover-bg);
                    border-radius: var(--radius-full);
                }

                [dir="rtl"] .password-toggle {
                    right: auto;
                    left: var(--spacing-md);
                }

                @media (max-width: 768px) {
                    .login-control-bar {
                        padding: var(--spacing-md);
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .app-title {
                        justify-content: center;
                    }
                    
                    .login-content {
                        padding: var(--spacing-lg);
                        flex-direction: column;
                    }
                    
                    .login-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .login-header h2 {
                        font-size: 1.5rem;
                    }
                    
                    .login-icon-wrapper {
                        width: 60px;
                        height: 60px;
                    }
                    
                    .login-icon {
                        font-size: 2rem;
                    }
                    
                    .lang-text {
                        display: none;
                    }
                    
                    .lang-btn {
                        padding: var(--spacing-sm);
                    }
                }

                @media (max-width: 480px) {
                    .login-form-card {
                        padding: var(--spacing-md);
                    }
                    
                    .form-actions {
                        flex-direction: column;
                    }
                    
                    .type-btn {
                        width: 100%;
                    }
                    
                    .features-list li {
                        font-size: 0.9rem;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .bg-shape,
                    .login-form-card:hover {
                        animation: none !important;
                        transform: none !important;
                    }
                    
                    .spinner {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;