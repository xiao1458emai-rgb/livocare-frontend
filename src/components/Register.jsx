import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api'; // ✅ تغيير: استخدم axiosInstance بدلاً من axios
import '../index.css';

function Register({ onRegisterSuccess }) {
    const { t, i18n } = useTranslation();
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
    const [darkMode, setDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [touched, setTouched] = useState({});

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
        }
    }, []);

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
        
        // الطول
        if (password.length >= 8) strength += 25;
        else if (password.length >= 6) strength += 15;
        
        // أحرف كبيرة وصغيرة
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
        else if (/[a-zA-Z]/.test(password)) strength += 15;
        
        // أرقام
        if (/\d/.test(password)) strength += 25;
        
        // رموز خاصة
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
        
        setPasswordStrength(strength);
    }, [formData.password]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setMessageType('');

        const validationError = validateForm();
        if (validationError) {
            setMessage(validationError);
            setMessageType('error');
            setLoading(false);
            return;
        }

        try {
            // ✅ تغيير: استخدم axiosInstance بدلاً من axios مع عنوان محلي
            const response = await axiosInstance.post('/auth/register/', formData);
            
            console.log('✅ Registration successful:', response.data);
            setMessage(t('register.success'));
            setMessageType('success');
            
            // تسجيل الدخول تلقائياً بعد التسجيل
            setTimeout(async () => {
                try {
                    // ✅ تغيير: استخدم axiosInstance
                    const loginResponse = await axiosInstance.post('/auth/token/', {
                        username: formData.username,
                        password: formData.password
                    });
                    
                    const { access, refresh } = loginResponse.data;
                    localStorage.setItem('access_token', access);
                    localStorage.setItem('refresh_token', refresh);
                    localStorage.setItem('username', formData.username);
                    
                    if (onRegisterSuccess) {
                        onRegisterSuccess();
                    }
                } catch (loginErr) {
                    console.error('Auto-login error:', loginErr);
                    // إذا فشل تسجيل الدخول التلقائي، وجه المستخدم إلى صفحة login
                    window.location.href = '/';
                }
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error.response?.data);
            
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
            setLoading(false);
        }
    };

    return (
        <div className={`register-container ${darkMode ? 'dark-mode' : ''}`}>
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
                        <div className="logo-wrapper">
                            <span className="logo-icon">✨</span>
                        </div>
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
                            title={darkMode ? t('register.switchToLight') : t('register.switchToDark')}
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="register-content">
                <div className="register-form-card">
                    <div className="register-header">
                        <div className="register-icon-wrapper">
                            <div className="register-icon">✨</div>
                        </div>
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
                                    className={touched.first_name && !formData.first_name ? 'error' : ''}
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
                                    className={touched.last_name && !formData.last_name ? 'error' : ''}
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
                                    className={touched.username && (!formData.username || formData.username.length < 3) ? 'error' : ''}
                                />
                            </div>
                            {touched.username && formData.username && formData.username.length < 3 && (
                                <p className="field-error">{t('register.usernameTooShort')}</p>
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
                                    className={touched.email && (!formData.email || !formData.email.includes('@')) ? 'error' : ''}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                <span className="label-icon">🔒</span>
                                {t('register.password')} <span className="required">*</span>
                            </label>
                            <div className="input-wrapper password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password')}
                                    required
                                    placeholder={t('register.passwordPlaceholder')}
                                    className={touched.password && (!formData.password || formData.password.length < 6) ? 'error' : ''}
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
                            
                            {/* مؤشر قوة كلمة المرور */}
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div 
                                            className="strength-fill"
                                            style={{ 
                                                width: `${passwordStrength}%`,
                                                backgroundColor: getPasswordStrengthColor()
                                            }}
                                        ></div>
                                    </div>
                                    <span className="strength-text" style={{ color: getPasswordStrengthColor() }}>
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
                            <div className="input-wrapper password-wrapper">
                                <input
                                    id="password2"
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password2')}
                                    required
                                    placeholder={t('register.confirmPasswordPlaceholder')}
                                    className={touched.password2 && formData.password2 && formData.password !== formData.password2 ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {touched.password2 && formData.password2 && formData.password !== formData.password2 && (
                                <p className="field-error">{t('register.passwordsDoNotMatch')}</p>
                            )}
                        </div>

                        <div className="register-actions">
                            <button 
                                type="submit" 
                                className="register-button"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        {t('register.registering')}
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">✨</span>
                                        {t('register.registerButton')}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* شروط التسجيل */}
                        <div className="terms-info">
                            <p>
                                {t('register.termsPrefix')}
                                <button type="button" className="terms-link">
                                    {t('register.termsOfService')}
                                </button>
                                {t('register.and')}
                                <button type="button" className="terms-link">
                                    {t('register.privacyPolicy')}
                                </button>
                            </p>
                        </div>

                        {/* رابط تسجيل الدخول */}
                        <div className="login-link">
                            <p>
                                {t('register.haveAccount')} 
                                <button 
                                    type="button"
                                    onClick={() => window.location.href = '/'}
                                    className="login-button-link"
                                >
                                    {t('register.login')}
                                    <span className="btn-arrow">→</span>
                                </button>
                            </p>
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
                                aria-label={t('register.dismiss')}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* معلومات إضافية */}
                <div className="register-info">
                    <div className="info-card">
                        <h3>🌟 {t('register.benefitsTitle')}</h3>
                        <ul className="benefits-list">
                            <li>
                                <span className="benefit-icon">📊</span>
                                <span className="benefit-text">{t('register.benefit1')}</span>
                            </li>
                            <li>
                                <span className="benefit-icon">🥗</span>
                                <span className="benefit-text">{t('register.benefit2')}</span>
                            </li>
                            <li>
                                <span className="benefit-icon">🌙</span>
                                <span className="benefit-text">{t('register.benefit3')}</span>
                            </li>
                            <li>
                                <span className="benefit-icon">😊</span>
                                <span className="benefit-text">{t('register.benefit4')}</span>
                            </li>
                            <li>
                                <span className="benefit-icon">💊</span>
                                <span className="benefit-text">{t('register.benefit5')}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="testimonial-card">
                        <p className="testimonial-text">
                            "{t('register.testimonial')}"
                        </p>
                        <div className="testimonial-author">
                            <span className="author-avatar">👤</span>
                            <span className="author-name">{t('register.testimonialAuthor')}</span>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                /* ===========================================
                   Register.css - النسخة المحسنة والمطورة
                   تم التحسين لجميع أحجام الشاشات والوضع الليلي
                   =========================================== */

                /* ===== المتغيرات والثيمات ===== */
                :root {
                    --primary-bg: #f8fafc;
                    --secondary-bg: #ffffff;
                    --tertiary-bg: #f1f5f9;
                    --card-bg: #ffffff;
                    --hover-bg: rgba(0, 0, 0, 0.05);
                    --text-primary: #0f172a;
                    --text-secondary: #475569;
                    --text-tertiary: #64748b;
                    --border-light: #e2e8f0;
                    --border-medium: #cbd5e1;
                    --primary-color: #8b5cf6;
                    --primary-dark: #7c3aed;
                    --primary-light: #a78bfa;
                    --success-color: #10b981;
                    --success-bg: #d1fae5;
                    --warning-color: #f59e0b;
                    --warning-bg: #fef3c7;
                    --error-color: #ef4444;
                    --error-bg: #fee2e2;
                    --info-color: #3b82f6;
                    --info-bg: #dbeafe;
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
                    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
                    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
                    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
                    --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.25);
                    --gradient-primary: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-medium: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    --radius-sm: 8px;
                    --radius-md: 12px;
                    --radius-lg: 15px;
                    --radius-xl: 20px;
                    --radius-2xl: 24px;
                    --radius-3xl: 30px;
                    --radius-full: 50px;
                    --spacing-xs: 0.25rem;
                    --spacing-sm: 0.5rem;
                    --spacing-md: 1rem;
                    --spacing-lg: 1.5rem;
                    --spacing-xl: 2rem;
                    --spacing-2xl: 2.5rem;
                }

                /* الثيم المظلم المحسن */
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
                    --primary-color: #a78bfa;
                    --primary-dark: #8b5cf6;
                    --primary-light: #c4b5fd;
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

                /* ===== الحاوية الرئيسية ===== */
                .register-container {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: background var(--transition-slow);
                    position: relative;
                    overflow-x: hidden;
                }

                /* ===== خلفية متحركة مع دعم الحركة المخفضة ===== */
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

                /* دعم الحركة المخفضة */
                .reduce-motion .bg-shape,
                .reduce-motion .logo-wrapper,
                .reduce-motion .register-icon-wrapper {
                    animation: none !important;
                }

                /* ===== شريط التحكم ===== */
                .register-control-bar {
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

                /* ===== بطاقة التسجيل ===== */
                .register-form-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-3xl);
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
                    background: var(--gradient-primary);
                }

                .register-form-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-2xl);
                }

                .register-header {
                    text-align: center;
                    margin-bottom: var(--spacing-2xl);
                }

                .register-icon-wrapper {
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

                .register-icon-wrapper:active {
                    transform: scale(0.95);
                }

                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .register-icon {
                    font-size: 3rem;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
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
                    line-height: 1.5;
                }

                /* ===== حقول النموذج ===== */
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
                    font-size: 0.95rem;
                }

                .label-icon {
                    font-size: 1.1rem;
                }

                .required {
                    color: var(--error-color);
                    margin-left: var(--spacing-xs);
                }

                .input-wrapper {
                    position: relative;
                }

                .form-group input {
                    width: 100%;
                    padding: 0.875rem var(--spacing-md);
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
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
                }

                .form-group input.error {
                    border-color: var(--error-color);
                }

                .form-group input.error:focus {
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
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

                .field-error {
                    margin-top: var(--spacing-xs);
                    color: var(--error-color);
                    font-size: 0.85rem;
                    animation: slideIn var(--transition-fast) ease;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* ===== مؤشر قوة كلمة المرور ===== */
                .password-strength {
                    margin-top: var(--spacing-sm);
                }

                .strength-bar {
                    height: 4px;
                    background: var(--border-light);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: var(--spacing-xs);
                }

                .strength-fill {
                    height: 100%;
                    transition: width var(--transition-medium) ease, background-color var(--transition-fast) ease;
                }

                .strength-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                /* ===== أزرار الإجراء ===== */
                .register-actions {
                    margin-top: var(--spacing-2xl);
                }

                .register-button {
                    width: 100%;
                    padding: var(--spacing-md);
                    background: var(--gradient-primary);
                    color: white;
                    border: none;
                    border-radius: var(--radius-lg);
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                    transition: all var(--transition-medium);
                }

                .register-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .register-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* ===== شروط التسجيل ===== */
                .terms-info {
                    margin-top: var(--spacing-md);
                    text-align: center;
                    font-size: 0.85rem;
                    color: var(--text-tertiary);
                }

                .terms-link {
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    cursor: pointer;
                    padding: 0 var(--spacing-xs);
                    font-size: 0.85rem;
                    transition: all var(--transition-fast);
                }

                .terms-link:hover {
                    text-decoration: underline;
                    transform: translateY(-1px);
                }

                /* ===== رابط تسجيل الدخول ===== */
                .login-link {
                    margin-top: var(--spacing-lg);
                    text-align: center;
                    border-top: 1px solid var(--border-light);
                    padding-top: var(--spacing-lg);
                }

                .login-link p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }

                .login-button-link {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: 600;
                    cursor: pointer;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-radius: var(--radius-md);
                    transition: all var(--transition-fast);
                }

                .login-button-link:hover {
                    background: var(--hover-bg);
                    transform: translateX(2px);
                }

                .login-button-link:active {
                    transform: translateX(0);
                }

                .btn-arrow {
                    transition: transform var(--transition-fast);
                }

                .login-button-link:hover .btn-arrow {
                    transform: translateX(3px);
                }

                /* ===== الرسائل ===== */
                .message {
                    margin-top: var(--spacing-lg);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    animation: slideInMessage var(--transition-medium) ease;
                }

                @keyframes slideInMessage {
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

                .message.info {
                    background: var(--info-bg);
                    color: var(--info-color);
                    border: 1px solid var(--info-color);
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

                /* ===== معلومات إضافية ===== */
                .register-info {
                    width: 100%;
                    max-width: 400px;
                }

                .info-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-3xl);
                    padding: var(--spacing-2xl);
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border-light);
                    margin-bottom: var(--spacing-lg);
                    transition: all var(--transition-medium);
                }

                .info-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-xl);
                }

                .info-card h3 {
                    margin: 0 0 var(--spacing-lg) 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .benefits-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .benefits-list li {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md) 0;
                    border-bottom: 1px solid var(--border-light);
                    transition: all var(--transition-fast);
                }

                .benefits-list li:hover {
                    transform: translateX(5px);
                    color: var(--primary-color);
                }

                .benefits-list li:last-child {
                    border-bottom: none;
                }

                .benefit-icon {
                    font-size: 1.3rem;
                }

                .benefit-text {
                    color: var(--text-secondary);
                }

                .testimonial-card {
                    background: var(--gradient-primary);
                    border-radius: var(--radius-3xl);
                    padding: var(--spacing-2xl);
                    color: white;
                    transition: all var(--transition-medium);
                }

                .testimonial-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg);
                }

                .testimonial-text {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    margin-bottom: var(--spacing-lg);
                    font-style: italic;
                }

                .testimonial-author {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }

                .author-avatar {
                    font-size: 2rem;
                }

                .author-name {
                    font-weight: 600;
                }

                .stats-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    background: var(--card-bg);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-lg);
                    margin-top: var(--spacing-lg);
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }

                .stats-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg);
                }

                .stat-item {
                    text-align: center;
                }

                .stat-number {
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
                    height: 40px;
                    background: var(--border-light);
                }

                /* ===== RTL دعم كامل ===== */
                [dir="rtl"] .password-toggle {
                    right: auto;
                    left: var(--spacing-md);
                }

                [dir="rtl"] .btn-arrow {
                    transform: rotate(180deg);
                }

                [dir="rtl"] .login-button-link:hover .btn-arrow {
                    transform: rotate(180deg) translateX(3px);
                }

                [dir="rtl"] .benefits-list li:hover {
                    transform: translateX(-5px);
                }

                [dir="rtl"] .required {
                    margin-left: 0;
                    margin-right: var(--spacing-xs);
                }

                [dir="rtl"] .form-row {
                    direction: rtl;
                }

                /* ===== تصميم متجاوب ===== */
                
                /* شاشات كبيرة (≥1024px) */
                @media (min-width: 1024px) {
                    .register-content {
                        gap: var(--spacing-2xl);
                    }
                }

                /* شاشات متوسطة (768px - 1023px) */
                @media (max-width: 1023px) and (min-width: 768px) {
                    .register-content {
                        flex-direction: column;
                        align-items: center;
                        gap: var(--spacing-xl);
                        padding: var(--spacing-xl);
                    }
                    
                    .register-form-card,
                    .register-info {
                        max-width: 550px;
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

                /* شاشات صغيرة (480px - 767px) */
                @media (max-width: 767px) and (min-width: 480px) {
                    .register-control-bar {
                        padding: var(--spacing-md) var(--spacing-lg);
                    }
                    
                    .control-bar-content {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .app-title h1 {
                        font-size: 1.5rem;
                    }
                    
                    .register-content {
                        padding: var(--spacing-lg);
                        gap: var(--spacing-lg);
                    }
                    
                    .register-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .register-header h2 {
                        font-size: 1.75rem;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                    
                    .form-group.half {
                        margin-bottom: var(--spacing-lg);
                    }
                    
                    .language-switcher {
                        justify-content: center;
                    }
                    
                    .lang-text {
                        display: none;
                    }
                    
                    .lang-btn {
                        padding: var(--spacing-sm);
                    }
                    
                    .info-card,
                    .testimonial-card {
                        padding: var(--spacing-lg);
                    }
                }

                /* شاشات صغيرة جداً (<480px) */
                @media (max-width: 479px) {
                    .register-control-bar {
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
                    
                    .register-controls {
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    
                    .register-content {
                        padding: var(--spacing-md);
                        gap: var(--spacing-md);
                    }
                    
                    .register-form-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .register-header h2 {
                        font-size: 1.5rem;
                    }
                    
                    .register-icon-wrapper {
                        width: 60px;
                        height: 60px;
                    }
                    
                    .register-icon {
                        font-size: 2rem;
                    }
                    
                    .register-description {
                        font-size: 0.85rem;
                    }
                    
                    .form-group input {
                        padding: 0.75rem;
                        font-size: 0.9rem;
                    }
                    
                    .register-button {
                        padding: 0.75rem;
                        font-size: 0.9rem;
                    }
                    
                    .info-card,
                    .testimonial-card {
                        padding: var(--spacing-lg);
                    }
                    
                    .info-card h3 {
                        font-size: 1.1rem;
                    }
                    
                    .benefits-list li {
                        padding: var(--spacing-sm) 0;
                        font-size: 0.9rem;
                    }
                    
                    .testimonial-text {
                        font-size: 0.95rem;
                    }
                    
                    .stats-card {
                        flex-direction: column;
                        gap: var(--spacing-md);
                    }
                    
                    .stat-divider {
                        width: 100%;
                        height: 1px;
                    }
                }

                /* وضع أفقي للشاشات العريضة */
                @media (max-width: 768px) and (orientation: landscape) {
                    .register-content {
                        min-height: auto;
                        padding: var(--spacing-lg);
                    }
                    
                    .register-form-card {
                        max-height: 85vh;
                        overflow-y: auto;
                    }
                    
                    .register-info {
                        max-height: 85vh;
                        overflow-y: auto;
                    }
                    
                    .register-control-bar {
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

                /* ===== تحسينات التباين العالي ===== */
                @media (prefers-contrast: high) {
                    .register-form-card,
                    .info-card,
                    .testimonial-card,
                    .stats-card {
                        border-width: 2px;
                    }
                    
                    .register-button {
                        border: 2px solid currentColor;
                    }
                    
                    .lang-btn.active {
                        border: 2px solid currentColor;
                    }
                }

                /* ===== تحسينات للأجهزة اللمسية ===== */
                @media (hover: none) and (pointer: coarse) {
                    .register-button:active,
                    .lang-btn:active,
                    .theme-toggle:active,
                    .login-button-link:active,
                    .terms-link:active {
                        transform: scale(0.98);
                    }
                    
                    .benefits-list li:active {
                        transform: translateX(5px);
                    }
                    
                    [dir="rtl"] .benefits-list li:active {
                        transform: translateX(-5px);
                    }
                }

                /* ===== شريط التمرير المخصص ===== */
                .register-form-card::-webkit-scrollbar,
                .register-info::-webkit-scrollbar {
                    width: 8px;
                }

                .register-form-card::-webkit-scrollbar-track,
                .register-info::-webkit-scrollbar-track {
                    background: var(--tertiary-bg);
                    border-radius: var(--radius-full);
                }

                .register-form-card::-webkit-scrollbar-thumb,
                .register-info::-webkit-scrollbar-thumb {
                    background: var(--primary-color);
                    border-radius: var(--radius-full);
                }

                .register-form-card::-webkit-scrollbar-thumb:hover,
                .register-info::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-dark);
                }
            `}</style>
        </div>
    );
}

export default Register;