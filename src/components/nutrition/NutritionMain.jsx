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
    
    const isMountedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
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

    // تحديث autoRefreshRef عند تغيير autoRefresh
    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    // جلب الوجبات - مع منع الطلبات المتزامنة
    const fetchMeals = useCallback(async () => {
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/meals/');
            
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
                setError(isArabic ? 'حدث خطأ في تحميل الوجبات' : 'Error loading meals');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, isArabic]);

    // نظام التحديث التلقائي
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
        }, 45000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, fetchMeals]);

    // تحديث عند العودة للتطبيق
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

    // جلب الوجبات عند تحميل المكون
    useEffect(() => {
        if (isAuthReady) {
            fetchMeals();
        }
    }, [isAuthReady, fetchMeals]);

    // تنظيف عند إلغاء تحميل المكون
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
        <div className="analytics-container">
            {/* شريط تحميل */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(39, 174, 96, 0.2)',
                    zIndex: 9999,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: '0%',
                        height: '100%',
                        background: 'var(--primary-gradient)',
                        animation: 'loading 1.5s ease-in-out infinite'
                    }}></div>
                </div>
            )}

            {/* رأس الصفحة */}
            <div className="analytics-header" style={{ borderBottom: 'none', marginBottom: 0 }}>
                <h2>{isArabic ? 'التغذية' : 'Nutrition'}</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* آخر تحديث */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.8rem',
                        padding: '4px 12px',
                        background: 'var(--secondary-bg)',
                        borderRadius: 'var(--radius-full)'
                    }}>
                        <span>🕒</span>
                        <span>{formatLastUpdate(lastUpdate)}</span>
                    </div>
                    
                    {/* ✅ تم إزالة زر اللغة من هنا - يوجد الآن فقط في ProfileManager */}
                    
                    {/* تبديل التحديث التلقائي */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        cursor: 'pointer',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--secondary-bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                    }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <span style={{
                            width: '36px',
                            height: '18px',
                            background: autoRefresh ? 'var(--primary)' : 'var(--border-medium)',
                            borderRadius: '18px',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}>
                            <span style={{
                                position: 'absolute',
                                width: '14px',
                                height: '14px',
                                background: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: autoRefresh ? '20px' : '2px',
                                transition: 'all var(--transition-fast)'
                            }}></span>
                        </span>
                        <span>{isArabic ? 'تحديث تلقائي' : 'Auto Refresh'}</span>
                    </label>
                    
                    {/* عدد الوجبات */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        background: 'var(--primary-gradient)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-full)'
                    }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{meals.length}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{isArabic ? 'وجبة' : 'meals'}</span>
                    </div>
                </div>
            </div>

            {/* رسالة الخطأ */}
            {error && (
                <div className="analytics-error" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} className="refresh-btn" style={{ background: 'transparent', color: 'inherit' }}>✕</button>
                </div>
            )}

            {/* أزرار التبويب */}
            <div className="analytics-tabs">
                <button 
                    className={activeTab === 'form' ? 'active' : ''}
                    onClick={() => setActiveTab('form')}
                >
                    {isArabic ? 'وجبة جديدة' : 'New Meal'}
                </button>
                <button 
                    className={activeTab === 'dashboard' ? 'active' : ''}
                    onClick={() => setActiveTab('dashboard')}
                >
                    {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                </button>
            </div>

            {/* محتوى التبويب */}
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

            <style>{`
                @keyframes loading {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .tab-content {
                    animation: fadeInUp 0.3s ease;
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .tab-content {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default NutritionMain;