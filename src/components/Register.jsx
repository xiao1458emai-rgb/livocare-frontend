import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api';
import '../index.css';

function Register({ onRegisterSuccess }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [touched, setTouched] = useState({});
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);

    // رابط خدمة Google Auth المنفصلة
    const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL || 'https://google-auth-fwz4.onrender.com';

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
    }, []);

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
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // حساب قوة كلمة المرور
    useEffect(() => {
        if (!formData.password) {
            setPasswordStrength(0);
            return;
        }
        
        let strength = 0;
        const password = formData.password;
        
        if (password.length >= 8) strength += 25;
        else if (password.length >= 6) strength += 15;
        
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
        else if (/[a-zA-Z]/.test(password)) strength += 15;
        
        if (/\d/.test(password)) strength += 25;
        
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
        
        setPasswordStrength(strength);
    }, [formData.password]);

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
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
        
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lng, direction: lng === 'ar' ? 'rtl' : 'ltr' }
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleBlur = (field) => {
        setTouched(prev => ({
            ...prev,
            [field]: true
        }));
    };

    const validateForm = () => {
        if (!formData.username || formData.username.length < 3) {
            return t('register.usernameShort');
        }
        if (!formData.username.match(/^[a-zA-Z0-9_]+$/)) {
            return t('register.usernameInvalid');
        }
        if (!formData.email || !formData.email.includes('@') || !formData.email.includes('.')) {
            return t('register.invalidEmail');
        }
        if (!formData.password || formData.password.length < 6) {
            return t('register.passwordShort');
        }
        if (passwordStrength < 50) {
            return t('register.passwordWeak');
        }
        if (formData.password !== formData.password2) {
            return t('register.passwordMismatch');
        }
        return null;
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength < 30) return '#ef4444';
        if (passwordStrength < 60) return '#f59e0b';
        if (passwordStrength < 80) return '#3b82f6';
        return '#10b981';
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength < 30) return t('register.passwordWeak');
        if (passwordStrength < 60) return t('register.passwordFair');
        if (passwordStrength < 80) return t('register.passwordGood');
        return t('register.passwordStrong');
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        setLoading(true);
        setMessage('');
        setMessageType('');

        const validationError = validateForm();
        if (validationError) {
            if (isMountedRef.current) {
                setMessage(validationError);
                setMessageType('error');
                setLoading(false);
            }
            return;
        }

        isSubmittingRef.current = true;

        try {
            const response = await axiosInstance.post('/auth/register/', formData);
            
            console.log('✅ Registration successful:', response.data);
            
            if (isMountedRef.current) {
                setMessage(t('register.success'));
                setMessageType('success');
            }
            
            setTimeout(async () => {
                try {
                    const loginResponse = await axiosInstance.post('/auth/token/', {
                        username: formData.username,
                        password: formData.password
                    });
                    
                    const { access, refresh } = loginResponse.data;
                    localStorage.setItem('access_token', access);
                    localStorage.setItem('refresh_token', refresh);
                    localStorage.setItem('username', formData.username);
                    
                    if (isMountedRef.current && onRegisterSuccess) {
                        onRegisterSuccess();
                    } else {
                        navigate('/dashboard');
                    }
                } catch (loginErr) {
                    console.error('Auto-login error:', loginErr);
                    if (isMountedRef.current) {
                        navigate('/login');
                    }
                }
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error.response?.data);
            
            if (!isMountedRef.current) return;
            
            let errorMessage = t('register.failed');
            
            if (error.response?.data?.username) {
                errorMessage = t('register.usernameExists');
            } else if (error.response?.data?.email) {
                errorMessage = t('register.emailExists');
            } else if (error.response?.status === 400) {
                errorMessage = t('register.invalidData');
            } else if (!navigator.onLine) {
                errorMessage = t('register.networkError');
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, t, onRegisterSuccess, validateForm, navigate]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // دالة تسجيل Google
    const handleGoogleRegister = () => {
        localStorage.setItem('redirectAfterAuth', '/dashboard');
        window.location.href = `${GOOGLE_AUTH_URL}/auth/google`;
    };

    return (
        <div className="register-container">
            {/* خلفية متحركة */}
            <div className="register-background">
                <div className="bg-shape bg-shape-1"></div>
                <div className="bg-shape bg-shape-2"></div>
                <div className="bg-shape bg-shape-3"></div>
            </div>

            {/* شريط التحكم العلوي */}
            <div className="register-control-bar">
                <div className="control-bar-content">
                    <div className="app-title">
                        <div className="title-text">
                            <h1>LivoCare</h1>
                            <span className="app-subtitle">{t('register.subtitle')}</span>
                        </div>
                    </div>
                    
                    <div className="register-controls">
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
                            title={document.documentElement.classList.contains('dark-mode') ? t('register.switchToLight') : t('register.switchToDark')}
                        >
                            {document.documentElement.classList.contains('dark-mode') ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="register-content">
                <div className="register-form-card">
                    <div className="register-header">
                        <h2>{t('register.title')}</h2>
                        <p className="register-description">{t('register.description')}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-row">
                            <div className="form-group half">
                                <label htmlFor="first_name">
                                    <span className="label-icon">👤</span>
                                    {t('register.firstName')}
                                </label>
                                <input
                                    id="first_name"
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('first_name')}
                                    placeholder={t('register.firstNamePlaceholder')}
                                    className={`search-input ${touched.first_name && !formData.first_name ? 'error' : ''}`}
                                />
                            </div>
                            
                            <div className="form-group half">
                                <label htmlFor="last_name">
                                    <span className="label-icon">👤</span>
                                    {t('register.lastName')}
                                </label>
                                <input
                                    id="last_name"
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('last_name')}
                                    placeholder={t('register.lastNamePlaceholder')}
                                    className={`search-input ${touched.last_name && !formData.last_name ? 'error' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">
                                <span className="label-icon">🔑</span>
                                {t('register.username')} <span className="required">*</span>
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('username')}
                                    required
                                    placeholder={t('register.usernamePlaceholder')}
                                    className={`search-input ${touched.username && (!formData.username || formData.username.length < 3) ? 'error' : ''}`}
                                />
                            </div>
                            {touched.username && formData.username && formData.username.length < 3 && (
                                <p className="field-error" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                    {t('register.usernameTooShort')}
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <span className="label-icon">📧</span>
                                {t('register.email')} <span className="required">*</span>
                            </label>
                            <div className="input-wrapper">
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('email')}
                                    required
                                    placeholder={t('register.emailPlaceholder')}
                                    className={`search-input ${touched.email && (!formData.email || !formData.email.includes('@')) ? 'error' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                <span className="label-icon">🔒</span>
                                {t('register.password')} <span className="required">*</span>
                            </label>
                            <div className="input-wrapper password-wrapper" style={{ position: 'relative' }}>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password')}
                                    required
                                    placeholder={t('register.passwordPlaceholder')}
                                    className={`search-input ${touched.password && (!formData.password || formData.password.length < 6) ? 'error' : ''}`}
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
                            
                            {formData.password && (
                                <div className="password-strength" style={{ marginTop: 'var(--spacing-sm)' }}>
                                    <div className="strength-bar" style={{ height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', marginBottom: 'var(--spacing-xs)' }}>
                                        <div 
                                            className="strength-fill"
                                            style={{ 
                                                width: `${passwordStrength}%`,
                                                height: '100%',
                                                backgroundColor: getPasswordStrengthColor(),
                                                transition: 'width var(--transition-medium)'
                                            }}
                                        ></div>
                                    </div>
                                    <span className="strength-text" style={{ fontSize: '0.75rem', color: getPasswordStrengthColor() }}>
                                        {getPasswordStrengthText()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password2">
                                <span className="label-icon">🔒</span>
                                {t('register.confirmPassword')} <span className="required">*</span>
                            </label>
                            <div className="input-wrapper password-wrapper" style={{ position: 'relative' }}>
                                <input
                                    id="password2"
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password2')}
                                    required
                                    placeholder={t('register.confirmPasswordPlaceholder')}
                                    className={`search-input ${touched.password2 && formData.password2 && formData.password !== formData.password2 ? 'error' : ''}`}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {touched.password2 && formData.password2 && formData.password !== formData.password2 && (
                                <p className="field-error" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                    {t('register.passwordsDoNotMatch')}
                                </p>
                            )}
                        </div>

                        <div className="register-actions" style={{ marginTop: 'var(--spacing-2xl)' }}>
                            <button 
                                type="submit" 
                                className="type-btn active"
                                disabled={loading}
                                style={{ width: '100%' }}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                        {t('register.registering')}
                                    </>
                                ) : (
                                    <>📝 {t('register.registerButton')}</>
                                )}
                            </button>
                        </div>

                        <div className="terms-info" style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            <p>
                                {t('register.termsPrefix')}
                                <button type="button" className="terms-link" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                                    {t('register.termsOfService')}
                                </button>
                                {t('register.and')}
                                <button type="button" className="terms-link" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                                    {t('register.privacyPolicy')}
                                </button>
                            </p>
                        </div>

                        <div className="login-link" style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--spacing-lg)' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                {t('register.haveAccount')} 
                                <Link 
                                    to="/login"
                                    className="login-button-link"
                                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', marginLeft: 'var(--spacing-sm)' }}
                                >
                                    {t('register.login')}
                                    <span className="btn-arrow">→</span>
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* قسم Google Auth */}
                    <div className="google-auth-section" style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)' }}>
                        <div className="divider" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                            <span className="divider-line" style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></span>
                            <span className="divider-text" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('register.or')}</span>
                            <span className="divider-line" style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></span>
                        </div>
                        
                        <button 
                            type="button"
                            onClick={handleGoogleRegister}
                            className="google-register-btn"
                            disabled={loading}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--spacing-sm)',
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                background: 'white',
                                border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                color: '#3c4043'
                            }}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" style={{ width: '20px', height: '20px' }} />
                            <span>{t('register.signupWithGoogle')}</span>
                        </button>
                    </div>

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
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* معلومات إضافية */}
                <div className="register-info">
                    <div className="info-card" style={{
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-2xl)',
                        padding: 'var(--spacing-xl)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border-light)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h3 style={{ margin: '0 0 var(--spacing-lg) 0', color: 'var(--text-primary)' }}>🌟 {t('register.benefitsTitle')}</h3>
                        <ul className="benefits-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon">📊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{t('register.benefit1')}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon">🥗</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{t('register.benefit2')}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon">🌙</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{t('register.benefit3')}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon">😊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{t('register.benefit4')}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon">💊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{t('register.benefit5')}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="testimonial-card" style={{
                        background: 'var(--primary-gradient)',
                        borderRadius: 'var(--radius-2xl)',
                        padding: 'var(--spacing-xl)',
                        color: 'white'
                    }}>
                        <p className="testimonial-text" style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: 'var(--spacing-lg)', fontStyle: 'italic' }}>
                            "{t('register.testimonial')}"
                        </p>
                        <div className="testimonial-author" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <span className="author-avatar" style={{ fontSize: '2rem' }}>👤</span>
                            <span className="author-name" style={{ fontWeight: 600 }}>{t('register.testimonialAuthor')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* الأنماط الإضافية */}
            <style>{`
                /* أنماط صفحة التسجيل */
                .register-container {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: background var(--transition-slow);
                    position: relative;
                    overflow-x: hidden;
                }

                /* خلفية متحركة */
                .register-background {
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
                    background: rgba(139, 92, 246, 0.1);
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
                    background: rgba(245, 158, 11, 0.05);
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
                .register-control-bar {
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-light);
                    padding: var(--spacing-md) var(--spacing-xl);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    backdrop-filter: blur(10px);
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

                .register-controls {
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
                .register-content {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    min-height: calc(100vh - 80px);
                    padding: var(--spacing-2xl);
                    gap: var(--spacing-2xl);
                    max-width: 1400px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 1;
                }

                /* بطاقة التسجيل */
                .register-form-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-2xl);
                    box-shadow: var(--shadow-xl);
                    border: 1px solid var(--border-light);
                    width: 100%;
                    max-width: 500px;
                    transition: all var(--transition-medium);
                    position: relative;
                    overflow: hidden;
                }

                .register-form-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--primary-gradient);
                }

                .register-form-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-2xl);
                }

                .register-header {
                    text-align: center;
                    margin-bottom: var(--spacing-2xl);
                }

                .register-header h2 {
                    margin: 0 0 var(--spacing-sm) 0;
                    color: var(--text-primary);
                    font-size: 2rem;
                    font-weight: 700;
                }

                .register-description {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                /* حقول النموذج */
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-md);
                }

                .form-group {
                    margin-bottom: var(--spacing-lg);
                }

                .form-group.half {
                    margin-bottom: 0;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing-sm);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

                .label-icon {
                    font-size: 1rem;
                }

                .required {
                    color: var(--error);
                    margin-left: var(--spacing-xs);
                }

                .search-input.error {
                    border-color: var(--error) !important;
                }

                .field-error {
                    margin-top: var(--spacing-xs);
                    color: var(--error);
                    font-size: 0.75rem;
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

                [dir="rtl"] .btn-arrow {
                    transform: rotate(180deg);
                    display: inline-block;
                }

                [dir="rtl"] .form-row {
                    direction: rtl;
                }

                /* معلومات إضافية */
                .register-info {
                    width: 100%;
                    max-width: 400px;
                }

                .testimonial-card {
                    background: var(--primary-gradient);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-xl);
                    color: white;
                }

                /* الثيم المظلم لزر Google */
                .dark-mode .google-register-btn {
                    background: #2d2d2d;
                    color: #e8eaed;
                    border-color: #404040;
                }

                .dark-mode .google-register-btn:hover:not(:disabled) {
                    background: #3c4043;
                }

                @media (max-width: 1023px) and (min-width: 768px) {
                    .register-content {
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .register-form-card,
                    .register-info {
                        max-width: 550px;
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .app-title {
                        justify-content: center;
                    }
                }

                @media (max-width: 767px) {
                    .register-control-bar {
                        padding: var(--spacing-md);
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .register-content {
                        padding: var(--spacing-lg);
                        flex-direction: column;
                    }
                    
                    .register-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .register-header h2 {
                        font-size: 1.5rem;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                    
                    .form-group.half {
                        margin-bottom: var(--spacing-lg);
                    }
                    
                    .lang-text {
                        display: none;
                    }
                    
                    .lang-btn {
                        padding: var(--spacing-sm);
                    }
                }

                @media (max-width: 480px) {
                    .register-form-card {
                        padding: var(--spacing-md);
                    }
                    
                    .register-header h2 {
                        font-size: 1.3rem;
                    }
                    
                    .register-description {
                        font-size: 0.85rem;
                    }
                    
                    .info-card,
                    .testimonial-card {
                        padding: var(--spacing-lg);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .bg-shape,
                    .register-form-card:hover {
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

export default Register;