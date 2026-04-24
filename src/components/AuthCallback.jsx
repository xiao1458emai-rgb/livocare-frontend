import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';

    // ✅ الاستماع لتغييرات اللغة من ProfileManager (للتأكد من التزامن بعد تسجيل الدخول)
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

    useEffect(() => {
        // استخراج token من URL
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const error = params.get('error');
        
        if (token) {
            // حفظ token في localStorage
            localStorage.setItem('access_token', token);
            
            // حفظ اللغة المفضلة إذا كانت موجودة
            const savedLang = localStorage.getItem('app_lang');
            if (!savedLang) {
                // تحديد اللغة بناءً على متصفح المستخدم أو العربية افتراضياً
                const userLang = navigator.language || 'ar';
                const defaultLang = userLang.startsWith('en') ? 'en' : 'ar';
                localStorage.setItem('app_lang', defaultLang);
                // تطبيق اللغة على الصفحة
                const isDefaultArabic = defaultLang === 'ar';
                document.documentElement.dir = isDefaultArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = defaultLang;
                setLang(defaultLang);
            } else {
                // تطبيق اللغة المحفوظة
                const isSavedArabic = savedLang === 'ar';
                document.documentElement.dir = isSavedArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = savedLang;
            }
            
            // التوجيه إلى لوحة التحكم
            navigate('/dashboard');
        } else if (error) {
            // في حالة الخطأ
            navigate('/login?error=google_auth_failed');
        } else {
            navigate('/login');
        }
    }, [location, navigate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--primary-bg)'
        }}>
            <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid var(--border-light)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
                {isArabic ? 'جاري تسجيل الدخول...' : 'Logging in...'}
            </p>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default AuthCallback;