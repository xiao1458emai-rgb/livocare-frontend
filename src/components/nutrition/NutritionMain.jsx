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
                .nutrition-main-container {
                    background: var(--primary-bg);
                    border-radius: 0;
                    min-height: 100vh;
                }

                /* ===== شريط التحميل ===== */
                .loading-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: rgba(16, 185, 129, 0.2);
                    z-index: 9999;
                    overflow: hidden;
                }

                .loading-progress {
                    width: 0%;
                    height: 100%;
                    background: var(--primary-gradient);
                    animation: loading 1.5s ease-in-out infinite;
                }

                @keyframes loading {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }

                /* ===== رأس الصفحة ===== */
                .nutrition-header {
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-light);
                    padding: 1rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
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
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .title-icon {
                    font-size: 1.8rem;
                }

                .header-badge {
                    padding: 0.35rem 0.85rem;
                    background: var(--tertiary-bg);
                    border-radius: 50px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .last-update {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg);
                    border-radius: 20px;
                }

                .auto-refresh-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    padding: 0.25rem 0.75rem;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                    font-size: 0.75rem;
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
                    background: var(--border-light);
                    border-radius: 18px;
                    position: relative;
                    transition: all var(--transition-fast);
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
                    transition: all var(--transition-fast);
                }

                input:checked + .toggle-slider {
                    background: var(--primary);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(18px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-18px);
                }

                .toggle-text {
                    color: var(--text-secondary);
                }

                .refresh-btn {
                    width: 32px;
                    height: 32px;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                }

                .refresh-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                    transform: rotate(180deg);
                }

                .refresh-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* ===== رسالة الخطأ ===== */
                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    margin: 0 1rem 1.5rem 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .error-icon {
                    font-size: 1rem;
                }

                .error-text {
                    flex: 1;
                    font-size: 0.85rem;
                    color: #ef4444;
                }

                .error-close {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 1rem;
                }

                /* ===== التبويبات ===== */
                .nutrition-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin: 0 1rem 1.5rem 1rem;
                    padding: 0.25rem;
                    background: var(--secondary-bg);
                    border-radius: 50px;
                    border: 1px solid var(--border-light);
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
                    transition: all var(--transition-fast);
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                }

                .tab-icon {
                    font-size: 1rem;
                }

                .tab-btn:hover {
                    background: var(--hover-bg);
                }

                .tab-btn.active {
                    background: var(--primary-gradient);
                    color: white;
                    box-shadow: var(--shadow-sm);
                }

                /* ===== محتوى التبويب ===== */
                .tab-content {
                    animation: fadeInUp 0.3s ease;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 1024px) {
                    .nutrition-header {
                        padding: 1rem;
                    }
                    
                    .header-title h1 {
                        font-size: 1.3rem;
                    }
                    
                    .title-icon {
                        font-size: 1.5rem;
                    }
                }

                @media (max-width: 768px) {
                    .nutrition-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .header-controls {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .auto-refresh-label {
                        flex: 1;
                        justify-content: center;
                    }
                    
                    .refresh-btn {
                        width: 36px;
                        height: 36px;
                    }
                    
                    .nutrition-tabs {
                        margin: 0 1rem 1rem 1rem;
                    }
                    
                    .tab-btn {
                        padding: 0.5rem 0.75rem;
                        font-size: 0.8rem;
                    }
                    
                    .error-message {
                        margin: 0 1rem 1rem 1rem;
                    }
                }

                @media (max-width: 480px) {
                    .header-title {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .header-badge {
                        font-size: 0.65rem;
                    }
                    
                    .last-update {
                        font-size: 0.65rem;
                    }
                    
                    .toggle-text {
                        font-size: 0.7rem;
                    }
                    
                    .tab-btn {
                        font-size: 0.75rem;
                    }
                }

                /* ===== RTL دعم ===== */
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

                /* ===== دعم الحركة المخفضة ===== */
                @media (prefers-reduced-motion: reduce) {
                    .loading-progress {
                        animation: none;
                    }
                    
                    .tab-content {
                        animation: none;
                    }
                    
                    .refresh-btn:hover:not(:disabled) {
                        transform: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default NutritionMain;