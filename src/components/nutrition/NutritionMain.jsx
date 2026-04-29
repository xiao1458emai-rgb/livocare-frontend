// src/components/nutrition/NutritionMain.jsx
'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import NutritionForm from './NutritionForm';
import NutritionDashboard from './NutritionDashboard';
import axiosInstance from "../../services/api";
import '../../index.css';

function NutritionMain({ isAuthReady }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [activeTab, setActiveTab] = useState('form');
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    
    const isMountedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ✅ كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

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

    // تحديث autoRefreshRef عند تغيير autoRefresh
    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    // ✅ جلب الوجبات
    const fetchMeals = useCallback(async () => {
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/meals/?limit=100');
            
            if (!isMountedRef.current) return;
            
            let mealsData = [];
            if (response.data?.results) {
                mealsData = response.data.results;
            } else if (Array.isArray(response.data)) {
                mealsData = response.data;
            }
            
            console.log('🍽️ NutritionMain - Meals loaded:', mealsData.length);
            setMeals(mealsData);
            setLastUpdate(new Date());
            
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ حدث خطأ في تحميل الوجبات' : '❌ Error loading meals');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic]);

    // ✅ نظام التحديث التلقائي
    useEffect(() => {
        if (!autoRefresh) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            if (autoRefreshRef.current && isMountedRef.current) {
                fetchMeals();
            }
        }, 60000); // كل 60 ثانية

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, fetchMeals]);

    // ✅ تحديث عند العودة للتطبيق
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && autoRefreshRef.current && isMountedRef.current) {
                fetchMeals();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchMeals]);

    // ✅ جلب الوجبات عند تحميل المكون
    useEffect(() => {
        if (isAuthReady) {
            fetchMeals();
        }
    }, [isAuthReady, fetchMeals]);

    // ✅ تنظيف
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    const handleDataSubmitted = useCallback(() => {
        fetchMeals();
        setActiveTab('dashboard');
    }, [fetchMeals]);

    const handleRefresh = useCallback(() => {
        fetchMeals();
    }, [fetchMeals]);

    const formatLastUpdate = useCallback((date) => {
        if (!date) return '';
        return date.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US');
    }, [isArabic]);

    return (
        <div className="nutrition-main-container">
            {/* ✅ شريط تحميل */}
            {loading && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            )}

            {/* ✅ رأس الصفحة */}
            <div className="nutrition-header">
                <div className="header-title">
                    <h1>
                        <span className="title-icon">🥗</span>
                        {isArabic ? 'التغذية' : 'Nutrition'}
                    </h1>
                    <div className="header-badge">
                        📊 {meals.length} {isArabic ? 'وجبة مسجلة' : 'meals recorded'}
                    </div>
                </div>
                
                <div className="header-controls">
                    {/* آخر تحديث */}
                    {lastUpdate && (
                        <div className="last-update">
                            🕐 {formatLastUpdate(lastUpdate)}
                        </div>
                    )}
                    
                    {/* زر التحديث التلقائي */}
                    <label className="auto-refresh-label">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">🔄 {isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                    </label>
                    
                    {/* زر تحديث يدوي */}
                    <button 
                        onClick={handleRefresh} 
                        className="refresh-btn"
                        disabled={loading}
                        title={isArabic ? 'تحديث' : 'Refresh'}
                    >
                        {loading ? '⏳' : '🔄'}
                    </button>
                </div>
            </div>

            {/* ✅ رسالة الخطأ */}
            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                    <button className="error-close" onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* ✅ أزرار التبويبات */}
            <div className="nutrition-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                    onClick={() => setActiveTab('form')}
                >
                    <span className="tab-icon">➕</span>
                    {!isMobile && (isArabic ? 'وجبة جديدة' : 'New Meal')}
                    {isMobile && (isArabic ? 'إضافة' : 'Add')}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <span className="tab-icon">📊</span>
                    {!isMobile && (isArabic ? 'لوحة التحكم' : 'Dashboard')}
                    {isMobile && (isArabic ? 'لوحة' : 'Board')}
                </button>
            </div>

            {/* ✅ محتوى التبويب */}
            <div className="tab-content">
                {activeTab === 'form' ? (
                    <NutritionForm 
                        onDataSubmitted={handleDataSubmitted}
                        isAuthReady={isAuthReady}
                    />
                ) : (
                    <NutritionDashboard 
                        meals={meals}
                        loading={loading}
                        onRefresh={handleRefresh}
                    />
                )}
            </div>

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
  /* ===========================================
   NutritionMain.css - الأنماط الداخلية فقط
   ✅ الصفحة الرئيسية للتغذية - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.nutrition-main-container {
    background: var(--primary-bg, #f5f5f5);
    min-height: 100vh;
}

.dark-mode .nutrition-main-container {
    background: #0f172a;
}

/* ===== شريط التحميل ===== */
.loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(16, 185, 129, 0.15);
    z-index: 9999;
    overflow: hidden;
}

.loading-progress {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #10b981, #f59e0b);
    animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}

/* ===== رأس الصفحة ===== */
.nutrition-header {
    background: var(--card-bg, #ffffff);
    border-bottom: 1px solid var(--border-light, #eef2f6);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.dark-mode .nutrition-header {
    background: #1e293b;
    border-bottom-color: #334155;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.header-title h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .header-title h1 {
    background: linear-gradient(135deg, #f87171, #fbbf24);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.title-icon {
    font-size: 1.8rem;
}

.header-badge {
    padding: 0.35rem 0.85rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .header-badge {
    background: #0f172a;
    color: #94a3b8;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.last-update {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    padding: 0.25rem 0.75rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 20px;
}

.dark-mode .last-update {
    background: #0f172a;
    color: #64748b;
}

/* ===== مفتاح التحديث التلقائي ===== */
.auto-refresh-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
    font-size: 0.75rem;
    transition: all 0.2s;
}

.dark-mode .auto-refresh-label {
    background: #0f172a;
    border-color: #334155;
}

.auto-refresh-label:hover {
    border-color: #10b981;
}

.auto-refresh-label input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    width: 36px;
    height: 18px;
    background: var(--border-light, #e2e8f0);
    border-radius: 18px;
    position: relative;
    transition: all 0.2s;
}

.dark-mode .toggle-slider {
    background: #475569;
}

.toggle-slider::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: all 0.2s;
}

input:checked + .toggle-slider {
    background: #10b981;
}

input:checked + .toggle-slider::before {
    transform: translateX(18px);
}

[dir="rtl"] input:checked + .toggle-slider::before {
    transform: translateX(-18px);
}

.toggle-text {
    color: var(--text-secondary, #64748b);
    font-weight: 500;
}

.dark-mode .toggle-text {
    color: #94a3b8;
}

/* ===== زر التحديث ===== */
.refresh-btn {
    width: 32px;
    height: 32px;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.refresh-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    transform: rotate(180deg);
    border-color: transparent;
}

.refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== رسالة الخطأ ===== */
.error-message {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 14px;
    padding: 0.75rem 1rem;
    margin: 0 1rem 1.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: shake 0.3s ease;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.error-icon {
    font-size: 1rem;
}

.error-text {
    flex: 1;
    font-size: 0.85rem;
    color: #ef4444;
    font-weight: 500;
}

.error-close {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 6px;
    transition: all 0.2s;
}

.error-close:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* ===== التبويبات ===== */
.nutrition-tabs {
    display: flex;
    gap: 0.5rem;
    margin: 0 1rem 1.5rem 1rem;
    padding: 0.25rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 50px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .nutrition-tabs {
    background: #0f172a;
    border-color: #334155;
}

.tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .tab-btn {
    color: #94a3b8;
}

.tab-icon {
    font-size: 1rem;
}

.tab-btn:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-1px);
}

.dark-mode .tab-btn:hover {
    background: #334155;
}

.tab-btn.active {
    background: linear-gradient(135deg, #ef4444, #f59e0b);
    color: white;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.tab-btn.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* ===== محتوى التبويب ===== */
.tab-content {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .header-title {
    flex-direction: row-reverse;
}

[dir="rtl"] .header-controls {
    flex-direction: row-reverse;
}

[dir="rtl"] .auto-refresh-label {
    flex-direction: row-reverse;
}

[dir="rtl"] .error-message {
    flex-direction: row-reverse;
}

[dir="rtl"] .tab-btn {
    flex-direction: row-reverse;
}

[dir="rtl"] .error-message {
    animation: shakeRTL 0.3s ease;
}

@keyframes shakeRTL {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .loading-progress {
        animation: none;
    }
    
    .tab-content {
        animation: none;
    }
    
    .error-message {
        animation: none;
    }
    
    .refresh-btn:hover:not(:disabled) {
        transform: none;
    }
    
    .tab-btn:hover {
        transform: none;
    }
    
    .tab-btn.active:hover {
        transform: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .nutrition-header {
        border-bottom-width: 2px;
    }
    
    .tab-btn.active {
        border: 2px solid currentColor;
    }
    
    .error-message {
        border-width: 2px;
    }
    
    .auto-refresh-label {
        border-width: 2px;
    }
}
            `}</style>
        </div>
    );
}

export default NutritionMain;