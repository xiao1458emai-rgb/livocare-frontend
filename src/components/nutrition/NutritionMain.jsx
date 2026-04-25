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

        </div>
    );
}

export default NutritionMain;