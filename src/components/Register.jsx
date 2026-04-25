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
    
    const languageChangeEvent = new CustomEvent('languageChange', { 
        detail: { lang, isArabic } 
    });
    window.dispatchEvent(languageChangeEvent);
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
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);

    // رابط خدمة Google Auth المنفصلة
    const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL || 'https://google-auth-fwz4.onrender.com';

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
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ تحميل الإعدادات المحفوظة
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(savedDarkMode);
        
        if (savedDarkMode) {
            document.documentElement.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        const savedLang = localStorage.getItem('app_lang');
        if (savedLang) {
            const isSavedArabic = savedLang === 'ar';
            document.documentElement.dir = isSavedArabic ? 'rtl' : 'ltr';
            document.documentElement.lang = savedLang;
        }
    }, []);

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
        return () => window.removeEventListener('themeChange', handleThemeChange);
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

    // ✅ حساب قوة كلمة المرور
    useEffect(() => {
        if (!formData.password) {
            setPasswordStrength(0);
            return;
        }
        
        let strength = 0;
        const password = formData.password;
        
        // الطول
        if (password.length >= 12) strength += 30;
        else if (password.length >= 8) strength += 20;
        else if (password.length >= 6) strength += 10;
        
        // الأحرف الكبيرة والصغيرة
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
        else if (/[a-zA-Z]/.test(password)) strength += 15;
        
        // الأرقام
        if (/\d/.test(password)) strength += 25;
        
        // الرموز الخاصة
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20;
        
        setPasswordStrength(Math.min(100, strength));
    }, [formData.password]);

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

    // ✅ التحقق من صحة البريد الإلكتروني
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // ✅ التحقق من صحة اسم المستخدم
    const isValidUsername = (username) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    };

    // ✅ الحصول على لون قوة كلمة المرور
    const getPasswordStrengthColor = () => {
        if (passwordStrength < 30) return '#ef4444';
        if (passwordStrength < 60) return '#f59e0b';
        if (passwordStrength < 80) return '#3b82f6';
        return '#10b981';
    };

    // ✅ الحصول على نص قوة كلمة المرور
    const getPasswordStrengthText = () => {
        if (passwordStrength < 30) return isArabic ? 'ضعيفة جداً' : 'Very Weak';
        if (passwordStrength < 60) return isArabic ? 'متوسطة' : 'Fair';
        if (passwordStrength < 80) return isArabic ? 'جيدة' : 'Good';
        return isArabic ? 'قوية جداً' : 'Very Strong';
    };

    // ✅ التحقق من صحة النموذج بالكامل
    const validateForm = () => {
        // التحقق من الاسم الأول (اختياري)
        if (formData.first_name && (formData.first_name.length < 2 || formData.first_name.length > 50)) {
            return isArabic ? 'الاسم الأول يجب أن يكون بين 2 و 50 حرفاً' : 'First name must be between 2 and 50 characters';
        }
        
        // التحقق من اسم العائلة (اختياري)
        if (formData.last_name && (formData.last_name.length < 2 || formData.last_name.length > 50)) {
            return isArabic ? 'اسم العائلة يجب أن يكون بين 2 و 50 حرفاً' : 'Last name must be between 2 and 50 characters';
        }
        
        // التحقق من اسم المستخدم
        if (!formData.username) {
            return isArabic ? 'اسم المستخدم مطلوب' : 'Username is required';
        }
        if (!isValidUsername(formData.username)) {
            return isArabic ? 'اسم المستخدم يجب أن يحتوي على 3-20 حرف (أحرف، أرقام، شرطة سفلية فقط)' : 'Username must be 3-20 characters (letters, numbers, underscore only)';
        }
        
        // التحقق من البريد الإلكتروني
        if (!formData.email) {
            return isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required';
        }
        if (!isValidEmail(formData.email)) {
            return isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address';
        }
        
        // التحقق من كلمة المرور
        if (!formData.password) {
            return isArabic ? 'كلمة المرور مطلوبة' : 'Password is required';
        }
        if (formData.password.length < 8) {
            return isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
        }
        if (passwordStrength < 50) {
            return isArabic ? 'كلمة المرور ضعيفة. استخدم أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً' : 'Password is weak. Use uppercase, lowercase, numbers, and symbols';
        }
        
        // التحقق من تأكيد كلمة المرور
        if (formData.password !== formData.password2) {
            return isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match';
        }
        
        // التحقق من الموافقة على الشروط
        if (!agreedToTerms) {
            return isArabic ? 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية' : 'You must agree to the Terms of Service and Privacy Policy';
        }
        
        return null;
    };

    // ✅ إرسال النموذج
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
                setMessage(isArabic ? '🎉 تم إنشاء الحساب بنجاح! جاري تحويلك...' : '🎉 Account created successfully! Redirecting...');
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
            
            let errorMessage = isArabic ? '❌ فشل إنشاء الحساب' : '❌ Registration failed';
            
            if (error.response?.data?.username) {
                errorMessage = isArabic ? '❌ اسم المستخدم موجود مسبقاً' : '❌ Username already exists';
            } else if (error.response?.data?.email) {
                errorMessage = isArabic ? '❌ البريد الإلكتروني موجود مسبقاً' : '❌ Email already exists';
            } else if (error.response?.status === 400) {
                errorMessage = isArabic ? '❌ بيانات غير صالحة، يرجى التحقق من المدخلات' : '❌ Invalid data, please check your inputs';
            } else if (!navigator.onLine) {
                errorMessage = isArabic ? '📡 لا يوجد اتصال بالإنترنت' : '📡 No internet connection';
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, onRegisterSuccess, navigate, isArabic, passwordStrength, agreedToTerms]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ✅ تسجيل Google
    const handleGoogleRegister = () => {
        localStorage.setItem('redirectAfterAuth', '/dashboard');
        window.location.href = `${GOOGLE_AUTH_URL}/auth/google`;
    };

    // ✅ نافذة الشروط والأحكام
    const TermsModal = () => (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isArabic ? '📜 شروط الخدمة' : '📜 Terms of Service'}</h3>
                    <button className="modal-close" onClick={() => setShowTermsModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                    <p>{isArabic ? 'باستخدام تطبيق LivoCare، فإنك توافق على:' : 'By using LivoCare, you agree to:'}</p>
                    <ul>
                        <li>{isArabic ? 'تقديم معلومات دقيقة وكاملة عن صحتك' : 'Provide accurate and complete health information'}</li>
                        <li>{isArabic ? 'الاحتفاظ بسرية بيانات حسابك' : 'Keep your account credentials confidential'}</li>
                        <li>{isArabic ? 'استخدام التطبيق للأغراض الصحية فقط' : 'Use the app only for health purposes'}</li>
                        <li>{isArabic ? 'عدم مشاركة حساباتك مع آخرين' : 'Not share your account with others'}</li>
                        <li>{isArabic ? 'الالتزام بقوانين الخصوصية المحلية والدولية' : 'Comply with local and international privacy laws'}</li>
                    </ul>
                    <p className="modal-note">{isArabic ? 'تحتفظ LivoCare بالحق في تعديل هذه الشروط في أي وقت.' : 'LivoCare reserves the right to modify these terms at any time.'}</p>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setShowTermsModal(false)} className="modal-btn">{isArabic ? 'فهمت' : 'I Understand'}</button>
                </div>
            </div>
        </div>
    );

    // ✅ نافذة سياسة الخصوصية
    const PrivacyModal = () => (
        <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isArabic ? '🔒 سياسة الخصوصية' : '🔒 Privacy Policy'}</h3>
                    <button className="modal-close" onClick={() => setShowPrivacyModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                    <p>{isArabic ? 'نحن في LivoCare نحمي خصوصية بياناتك:' : 'At LivoCare, we protect your privacy:'}</p>
                    <ul>
                        <li>{isArabic ? 'نستخدم تشفيراً متقدماً لحماية بياناتك' : 'We use advanced encryption to protect your data'}</li>
                        <li>{isArabic ? 'لا نشارك بياناتك الصحية مع أطراف ثالثة' : 'We do not share your health data with third parties'}</li>
                        <li>{isArabic ? 'يمكنك طلب حذف بياناتك في أي وقت' : 'You can request deletion of your data at any time'}</li>
                        <li>{isArabic ? 'نستخدم بياناتك فقط لتحسين تجربتك الصحية' : 'We use your data only to improve your health experience'}</li>
                        <li>{isArabic ? 'نلتزم بجميع معايير الخصوصية العالمية' : 'We comply with all global privacy standards'}</li>
                    </ul>
                    <p className="modal-note">{isArabic ? 'لأي استفسار، تواصل معنا على support@livocare.com' : 'For any inquiries, contact us at support@livocare.com'}</p>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setShowPrivacyModal(false)} className="modal-btn">{isArabic ? 'فهمت' : 'I Understand'}</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="register-wrapper">
            {/* ✅ خلفية متحركة */}
            <div className="register-background">
                <div className="bg-blob bg-blob-1"></div>
                <div className="bg-blob bg-blob-2"></div>
                <div className="bg-blob bg-blob-3"></div>
            </div>

            {/* ✅ شريط التحكم العلوي */}
            <div className="register-navbar">
                <div className="navbar-content">
                    <Link to="/" className="logo-area">
                        <div className="logo-circle">
                            <span className="logo-emoji">🫀</span>
                        </div>
                        <div className="logo-text">
                            <h1 className="logo-name">LivoCare</h1>
                            <span className="logo-tagline">{isArabic ? 'صحتك أولاً' : 'Your Health First'}</span>
                        </div>
                    </Link>
                    
                    <div className="navbar-actions">
                        <button 
                            className="action-btn"
                            onClick={toggleLanguage}
                            title={isArabic ? 'English' : 'العربية'}
                        >
                            🌐 <span>{isArabic ? 'English' : 'العربية'}</span>
                        </button>
                        
                        <button 
                            className="action-btn"
                            onClick={toggleDarkMode}
                            title={isDarkMode ? (isArabic ? '☀️ الوضع الفاتح' : '☀️ Light Mode') : (isArabic ? '🌙 الوضع المظلم' : '🌙 Dark Mode')}
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ المحتوى الرئيسي */}
            <div className="register-main">
                <div className="register-card">
                    <div className="card-header">
                        <div className="header-icon">
                            <span className="icon-user">👤</span>
                        </div>
                        <h2 className="header-title">{isArabic ? 'إنشاء حساب جديد' : 'Create Account'}</h2>
                        <p className="header-subtitle">{isArabic ? 'انضم إلى LivoCare وابدأ رحلتك الصحية' : 'Join LivoCare and start your health journey'}</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="register-form">
                        {/* ✅ الاسم الأول واسم العائلة */}
                        <div className="form-row">
                            <div className="form-field">
                                <label className="field-label">
                                    <span className="label-icon">👤</span>
                                    {isArabic ? 'الاسم الأول' : 'First Name'}
                                    <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span>
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('first_name')}
                                    placeholder={isArabic ? 'أدخل اسمك الأول' : 'Enter your first name'}
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-field">
                                <label className="field-label">
                                    <span className="label-icon">👨‍👩‍👧</span>
                                    {isArabic ? 'اسم العائلة' : 'Last Name'}
                                    <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span>
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('last_name')}
                                    placeholder={isArabic ? 'أدخل اسم العائلة' : 'Enter your last name'}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* ✅ اسم المستخدم */}
                        <div className="form-field">
                            <label className="field-label required">
                                <span className="label-icon">🔖</span>
                                {isArabic ? 'اسم المستخدم' : 'Username'}
                            </label>
                            <div className="input-container">
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('username')}
                                    required
                                    placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter username'}
                                    className={`form-input ${touched.username && formData.username && !isValidUsername(formData.username) ? 'error' : ''}`}
                                />
                            </div>
                            {touched.username && formData.username && !isValidUsername(formData.username) && (
                                <div className="field-error">
                                    ⚠️ {isArabic ? '3-20 حرف (أحرف، أرقام، شرطة سفلية فقط)' : '3-20 characters (letters, numbers, underscore only)'}
                                </div>
                            )}
                        </div>

                        {/* ✅ البريد الإلكتروني */}
                        <div className="form-field">
                            <label className="field-label required">
                                <span className="label-icon">📧</span>
                                {isArabic ? 'البريد الإلكتروني' : 'Email'}
                            </label>
                            <div className="input-container">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('email')}
                                    required
                                    placeholder={isArabic ? 'example@email.com' : 'example@email.com'}
                                    className={`form-input ${touched.email && formData.email && !isValidEmail(formData.email) ? 'error' : ''}`}
                                />
                            </div>
                            {touched.email && formData.email && !isValidEmail(formData.email) && (
                                <div className="field-error">
                                    ⚠️ {isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address'}
                                </div>
                            )}
                        </div>

                        {/* ✅ كلمة المرور */}
                        <div className="form-field">
                            <label className="field-label required">
                                <span className="label-icon">🔒</span>
                                {isArabic ? 'كلمة المرور' : 'Password'}
                            </label>
                            <div className="input-container password-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password')}
                                    required
                                    placeholder={isArabic ? 'أدخل كلمة مرور قوية' : 'Enter a strong password'}
                                    className={`form-input ${touched.password && formData.password && formData.password.length < 8 ? 'error' : ''}`}
                                />
                                <button
                                    type="button"
                                    className="password-eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            
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
                            <div className="field-hint">
                                💡 {isArabic ? '8 أحرف على الأقل، حرف كبير، رقم، رمز' : 'At least 8 characters, uppercase, number, symbol'}
                            </div>
                        </div>

                        {/* ✅ تأكيد كلمة المرور */}
                        <div className="form-field">
                            <label className="field-label required">
                                <span className="label-icon">✓</span>
                                {isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                            </label>
                            <div className="input-container password-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password2')}
                                    required
                                    placeholder={isArabic ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                                    className={`form-input ${touched.password2 && formData.password2 && formData.password !== formData.password2 ? 'error' : ''}`}
                                />
                                <button
                                    type="button"
                                    className="password-eye"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')}
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {touched.password2 && formData.password2 && formData.password !== formData.password2 && (
                                <div className="field-error">
                                    ⚠️ {isArabic ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>

                        {/* ✅ الموافقة على الشروط */}
                        <div className="terms-checkbox">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span className="checkbox-text">
                                    {isArabic ? 'أوافق على' : 'I agree to the'}{' '}
                                    <button type="button" onClick={() => setShowTermsModal(true)} className="terms-link">
                                        {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
                                    </button>
                                    {isArabic ? ' و ' : ' and '}
                                    <button type="button" onClick={() => setShowPrivacyModal(true)} className="terms-link">
                                        {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                                    </button>
                                </span>
                            </label>
                        </div>

                        {/* ✅ أزرار الإجراء */}
                        <div className="form-buttons">
                            <button 
                                type="submit" 
                                className="register-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        {isArabic ? 'جاري إنشاء الحساب...' : 'Creating account...'}
                                    </>
                                ) : (
                                    <>
                                        ✨ {isArabic ? 'إنشاء حساب' : 'Sign Up'}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* ✅ الفاصل */}
                        <div className="divider">
                            <span className="divider-line"></span>
                            <span className="divider-text">{isArabic ? 'أو' : 'OR'}</span>
                            <span className="divider-line"></span>
                        </div>

                        {/* ✅ زر Google */}
                        <button 
                            type="button"
                            onClick={handleGoogleRegister}
                            className="google-btn"
                            disabled={loading}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" />
                            <span>{isArabic ? 'التسجيل باستخدام Google' : 'Sign up with Google'}</span>
                        </button>

                        {/* ✅ رابط تسجيل الدخول */}
                        <div className="login-link">
                            <p>
                                {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                                <Link to="/login" className="login-link-btn">
                                    {isArabic ? 'تسجيل الدخول' : 'Login'} →
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* ✅ رسالة الإشعار */}
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
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* ✅ معلومات إضافية */}
                <div className="register-info">
                    <div className="info-card">
                        <h3>{isArabic ? '✨ لماذا تنضم إلى LivoCare؟' : '✨ Why join LivoCare?'}</h3>
                        <ul className="benefits-list">
                            <li><span className="benefit-icon">📊</span><span>{isArabic ? 'تتبع شامل للعلامات الحيوية' : 'Comprehensive vital signs tracking'}</span></li>
                            <li><span className="benefit-icon">🥗</span><span>{isArabic ? 'خطط تغذية ذكية' : 'Smart nutrition plans'}</span></li>
                            <li><span className="benefit-icon">😴</span><span>{isArabic ? 'تحليل النوم المتقدم' : 'Advanced sleep analysis'}</span></li>
                            <li><span className="benefit-icon">😊</span><span>{isArabic ? 'تتبع الحالة المزاجية' : 'Mood tracking'}</span></li>
                            <li><span className="benefit-icon">💊</span><span>{isArabic ? 'متابعة الأدوية' : 'Medication tracking'}</span></li>
                            <li><span className="benefit-icon">🏃</span><span>{isArabic ? 'تتبع النشاط البدني' : 'Physical activity tracking'}</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ✅ النوافذ المنبثقة */}
            {showTermsModal && <TermsModal />}
            {showPrivacyModal && <PrivacyModal />}

        </div>
    );
}

export default Register;