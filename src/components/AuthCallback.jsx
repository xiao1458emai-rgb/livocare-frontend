import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // استخراج token من URL
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (token) {
            // حفظ token في localStorage
            localStorage.setItem('access_token', token);
            
            // ✅ حفظ معلومات إضافية إذا أردت
            // يمكنك فك تشفير token لاستخراج معلومات المستخدم
            
            // التوجيه إلى لوحة التحكم
            navigate('/dashboard');
        } else {
            // في حالة الخطأ
            navigate('/login?error=google_auth_failed');
        }
    }, [location, navigate]);

    return (
        <div className="auth-callback">
            <div className="loading-spinner"></div>
            <p>جاري تسجيل الدخول...</p>
        </div>
    );
}

export default AuthCallback;