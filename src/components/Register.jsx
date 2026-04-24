import { useState, useEffect, useCallback, useRef } from "react";
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

function Register({ onRegisterSuccess }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
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

    // ✅ تبديل اللغة (يتم الاحتفاظ به في صفحة التسجيل)
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
                // تطبيق اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
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
            return isArabic ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters';
        }
        if (!formData.username.match(/^[a-zA-Z0-9_]+$/)) {
            return isArabic ? 'اسم المستخدم يحتوي على أحرف غير مسموحة' : 'Username contains invalid characters';
        }
        if (!formData.email || !formData.email.includes('@') || !formData.email.includes('.')) {
            return isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address';
        }
        if (!formData.password || formData.password.length < 8) {
            return isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
        }
        if (passwordStrength < 50) {
            return isArabic ? 'كلمة المرور ضعيفة' : 'Password is weak';
        }
        if (formData.password !== formData.password2) {
            return isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match';
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
        if (passwordStrength < 30) return isArabic ? 'ضعيفة' : 'Weak';
        if (passwordStrength < 60) return isArabic ? 'متوسطة' : 'Fair';
        if (passwordStrength < 80) return isArabic ? 'جيدة' : 'Good';
        return isArabic ? 'قوية جداً' : 'Very Strong';
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
                setMessage(isArabic ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
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
            
            let errorMessage = isArabic ? 'فشل إنشاء الحساب' : 'Registration failed';
            
            if (error.response?.data?.username) {
                errorMessage = isArabic ? 'اسم المستخدم موجود مسبقاً' : 'Username already exists';
            } else if (error.response?.data?.email) {
                errorMessage = isArabic ? 'البريد الإلكتروني موجود مسبقاً' : 'Email already exists';
            } else if (error.response?.status === 400) {
                errorMessage = isArabic ? 'بيانات غير صالحة' : 'Invalid data';
            } else if (!navigator.onLine) {
                errorMessage = isArabic ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection';
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, onRegisterSuccess, navigate, isArabic]);

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
                            <span className="app-subtitle">{isArabic ? 'انضم إلى LivoCare وابدأ رحلتك الصحية' : 'Join LivoCare and start your health journey'}</span>
                        </div>
                    </div>
                    
                    <div className="register-controls">
                        {/* ✅ زر اللغة موجود في صفحة التسجيل لأنها صفحة عامة قبل تسجيل الدخول */}
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

            <div className="register-content">
                <div className="register-form-card">
                    <div className="register-header">
                        <h2>{isArabic ? 'إنشاء حساب جديد' : 'Create New Account'}</h2>
                        <p className="register-description">{isArabic ? 'أدخل بياناتك لإنشاء حساب' : 'Enter your details to create an account'}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-row">
                            <div className="form-group half">
                                <label htmlFor="first_name">
                                    {isArabic ? 'الاسم الأول' : 'First Name'}
                                </label>
                                <input
                                    id="first_name"
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('first_name')}
                                    placeholder={isArabic ? 'أدخل اسمك الأول' : 'Enter your first name'}
                                    className={`search-input ${touched.first_name && !formData.first_name ? 'error' : ''}`}
                                />
                            </div>
                            
                            <div className="form-group half">
                                <label htmlFor="last_name">
                                    {isArabic ? 'اسم العائلة' : 'Last Name'}
                                </label>
                                <input
                                    id="last_name"
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('last_name')}
                                    placeholder={isArabic ? 'أدخل اسم العائلة' : 'Enter your last name'}
                                    className={`search-input ${touched.last_name && !formData.last_name ? 'error' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">
                                {isArabic ? 'اسم المستخدم' : 'Username'} <span className="required">*</span>
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
                                    placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter username'}
                                    className={`search-input ${touched.username && (!formData.username || formData.username.length < 3) ? 'error' : ''}`}
                                />
                            </div>
                            {touched.username && formData.username && formData.username.length < 3 && (
                                <p className="field-error">
                                    {isArabic ? 'اسم المستخدم قصير جداً (3 أحرف على الأقل)' : 'Username is too short (minimum 3 characters)'}
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                {isArabic ? 'البريد الإلكتروني' : 'Email'} <span className="required">*</span>
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
                                    placeholder={isArabic ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                                    className={`search-input ${touched.email && (!formData.email || !formData.email.includes('@')) ? 'error' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                {isArabic ? 'كلمة المرور' : 'Password'} <span className="required">*</span>
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
                                    placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter password'}
                                    className={`search-input ${touched.password && (!formData.password || formData.password.length < 8) ? 'error' : ''}`}
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
                                    <span className="strength-text" style={{ fontSize: '0.7rem', color: getPasswordStrengthColor() }}>
                                        {getPasswordStrengthText()}
                                    </span>
                                </div>
                            )}
                            <p className="password-hint" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
                                {isArabic ? '8 أحرف على الأقل، حرف كبير، رقم، رمز' : 'At least 8 characters, uppercase, number, symbol'}
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password2">
                                {isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="required">*</span>
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
                                    placeholder={isArabic ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                                    className={`search-input ${touched.password2 && formData.password2 && formData.password !== formData.password2 ? 'error' : ''}`}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? (isArabic ? 'إخفاء تأكيد كلمة المرور' : 'Hide confirm password') : (isArabic ? 'إظهار تأكيد كلمة المرور' : 'Show confirm password')}
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
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {touched.password2 && formData.password2 && formData.password !== formData.password2 && (
                                <p className="field-error">
                                    {isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}
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
                                        {isArabic ? 'جاري التسجيل...' : 'Registering...'}
                                    </>
                                ) : (
                                    <>{isArabic ? 'إنشاء حساب' : 'Sign Up'}</>
                                )}
                            </button>
                        </div>

                        {/* الفاصل البصري */}
                        <div className="divider" style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 'var(--spacing-md)', 
                            margin: 'var(--spacing-xl) 0 var(--spacing-lg)' 
                        }}>
                            <span className="divider-line" style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></span>
                            <span className="divider-text" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{isArabic ? 'أو' : 'OR'}</span>
                            <span className="divider-line" style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></span>
                        </div>

                        {/* زر Google محسّن */}
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
                                gap: 'var(--spacing-md)',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                background: 'white',
                                border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.95rem',
                                color: '#3c4043',
                                transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#f8f9fa';
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'white';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="" className="google-icon" style={{ width: '20px', height: '20px' }} />
                            <span>{isArabic ? 'التسجيل باستخدام Google' : 'Sign up with Google'}</span>
                        </button>

                        <div className="login-link" style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                                <Link 
                                    to="/login"
                                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                                >
                                    {isArabic ? 'تسجيل الدخول' : 'Login'}
                                    <span className="btn-arrow"> →</span>
                                </Link>
                            </p>
                        </div>

                        {/* الشروط والأحكام */}
                        <div className="terms-info" style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            <p>
                                {isArabic ? 'بالتسجيل، أنت توافق على' : 'By signing up, you agree to our'}{' '}
                                <button type="button" className="terms-link" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                                    {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
                                </button>
                                {isArabic ? ' و ' : ' and '}
                                <button type="button" className="terms-link" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                                    {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                                </button>
                            </p>
                        </div>
                    </form>

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
                                aria-label="إغلاق"
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
                        <h3 style={{ margin: '0 0 var(--spacing-lg) 0', color: 'var(--text-primary)' }}>{isArabic ? 'لماذا تنضم إلى LivoCare؟' : 'Why join LivoCare?'}</h3>
                        <ul className="benefits-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon" style={{ fontSize: '1.1rem' }}>📊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تتبع شامل للعلامات الحيوية' : 'Comprehensive vital signs tracking'}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon" style={{ fontSize: '1.1rem' }}>🥗</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'خطط تغذية ذكية' : 'Smart nutrition plans'}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon" style={{ fontSize: '1.1rem' }}>🌙</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تحليل النوم' : 'Sleep analysis'}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon" style={{ fontSize: '1.1rem' }}>😊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'تتبع الحالة المزاجية' : 'Mood tracking'}</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="benefit-icon" style={{ fontSize: '1.1rem' }}>💊</span>
                                <span className="benefit-text" style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'متابعة الأدوية' : 'Medication tracking'}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                .register-container {
                    min-height: 100vh;
                    background: var(--primary-bg);
                    transition: background var(--transition-slow);
                    position: relative;
                    overflow-x: hidden;
                }

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

                .app-title .title-text h1 {
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

                .lang-btn {
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    border: 1px solid var(--border-light);
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                }

                .lang-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
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
                    font-size: 1.8rem;
                    font-weight: 700;
                }

                .register-description {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }

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
                    display: block;
                    margin-bottom: var(--spacing-sm);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }

                .required {
                    color: var(--error);
                    margin-left: var(--spacing-xs);
                }

                .search-input {
                    width: 100%;
                    padding: var(--spacing-md);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-md);
                    background: var(--input-bg);
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .search-input.error {
                    border-color: var(--error);
                }

                .field-error {
                    margin-top: var(--spacing-xs);
                    color: var(--error);
                    font-size: 0.7rem;
                }

                .password-hint {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-top: var(--spacing-xs);
                }

                .password-toggle:hover {
                    background: var(--hover-bg);
                }

                .type-btn.active {
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .type-btn.active:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .type-btn.active:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                [dir="rtl"] .password-toggle {
                    right: auto;
                    left: var(--spacing-md);
                }

                [dir="rtl"] .btn-arrow {
                    display: inline-block;
                    transform: rotate(180deg);
                }

                .register-info {
                    width: 100%;
                    max-width: 350px;
                }

                .dark-mode .google-register-btn {
                    background: #2d2d2d;
                    color: #e8eaed;
                    border-color: #404040;
                }

                .dark-mode .google-register-btn:hover:not(:disabled) {
                    background: #3c4043;
                }

                @media (max-width: 1023px) {
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
                        text-align: center;
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
                }

                @media (max-width: 480px) {
                    .register-form-card {
                        padding: var(--spacing-md);
                    }
                    
                    .register-header h2 {
                        font-size: 1.3rem;
                    }
                    
                    .info-card {
                        padding: var(--spacing-lg);
                    }
                }
            `}</style>
        </div>
    );
}

export default Register;