'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import NutritionForm from './NutritionForm';
import NutritionDashboard from './NutritionDashboard';
import axiosInstance from "../../services/api";
import '../../index.css';

function NutritionMain({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('form');
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [error, setError] = useState(null);
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const intervalRef = useRef(null);
    const isFetchingRef = useRef(false);  // ✅ منع الطلبات المتزامنة

    // تحميل إعدادات الوضع المظلم وتفضيلات الحركة
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب الوجبات - مع منع الطلبات المتزامنة
    const fetchMeals = useCallback(async () => {
        // ✅ منع الطلبات المتزامنة
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/meals/');
            if (isMountedRef.current) {
                setMeals(response.data);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching meals:', error);
            if (isMountedRef.current) {
                setError(t('nutrition.errorLoadingMeals', 'حدث خطأ في تحميل الوجبات'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, t]);

    // تحديث autoRefreshRef عند تغيير autoRefresh
    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    // ✅ نظام التحديث التلقائي - مع تنظيف صحيح
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

    // ✅ تنظيف عند إلغاء تحميل المكون
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
        return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
    }, [i18n.language]);

    return (
        <div className={`nutrition-main ${darkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* ✅ شريط تحميل بسيط */}
            {loading && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                    <span className="loading-text">{t('common.loading')}</span>
                </div>
            )}

            {/* رأس الصفحة */}
            <div className="page-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="header-icon-wrapper">
                            <span className="header-icon" aria-hidden="true">🥗</span>
                        </div>
                        <div className="header-text">
                            <h1>{t('nutrition.title')}</h1>
                            <div className="header-subtitle">
                                <span className="subtitle-icon" aria-hidden="true">📊</span>
                                <span>{t('nutrition.subtitle')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-stats">
                            <div className="stats-controls">
                                <div className="last-update-wrapper">
                                    <span className="last-update-icon" aria-hidden="true">🕒</span>
                                    <span className="last-update">
                                        {formatLastUpdate(lastUpdate)}
                                    </span>
                                </div>
                                <label className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                        aria-label={t('nutrition.autoRefresh')}
                                    />
                                    <span className="toggle-slider" aria-hidden="true"></span>
                                    <span className="toggle-label">{t('nutrition.autoRefresh')}</span>
                                </label>
                            </div>
                            <div className="meal-count">
                                <span className="count-number">{meals.length}</span>
                                <span className="count-label">{t('nutrition.mealsLogged')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* رسالة الخطأ */}
            {error && (
                <div className="error-message" role="alert">
                    <span className="error-icon" aria-hidden="true">⚠️</span>
                    <span className="error-text">{error}</span>
                    <button onClick={() => setError(null)} className="error-dismiss" aria-label={t('common.dismiss')}>
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>
            )}

            {/* أزرار التبويب */}
            <div className="tabs-navigation" role="tablist">
                <button 
                    className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                    onClick={() => setActiveTab('form')}
                    role="tab"
                    aria-selected={activeTab === 'form'}
                    aria-label={t('nutrition.newMeal')}
                >
                    <span className="tab-icon" aria-hidden="true">🥗</span>
                    <span className="tab-text">{t('nutrition.newMeal')}</span>
                    {activeTab === 'form' && <span className="tab-active-indicator" aria-hidden="true"></span>}
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                    role="tab"
                    aria-selected={activeTab === 'dashboard'}
                    aria-label={t('nutrition.dashboard')}
                >
                    <span className="tab-icon" aria-hidden="true">📊</span>
                    <span className="tab-text">{t('nutrition.dashboard')}</span>
                    {activeTab === 'dashboard' && <span className="tab-active-indicator" aria-hidden="true"></span>}
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
    

            <style jsx>{`
                .nutrition-main {
                    padding: 24px;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
                    position: relative;
                }

                .nutrition-main.dark-mode {
                    background: linear-gradient(135deg, #0a0f1f 0%, #1a1f2f 100%);
                }

                /* ✅ شريط تحميل لا يمنع التفاعل */
                .loading-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: rgba(39, 174, 96, 0.2);
                    z-index: 9999;
                    overflow: hidden;
                }

                .loading-progress {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #27ae60, #2ecc71);
                    animation: loading 1.5s ease-in-out infinite;
                }

                @keyframes loading {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }

                .loading-text {
                    position: fixed;
                    top: 10px;
                    right: 20px;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    z-index: 9999;
                }

                /* رأس الصفحة */
                .page-header {
                    background: white;
                    border-radius: 30px;
                    padding: 32px 48px;
                    margin-bottom: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    border: 1px solid #e9ecef;
                }

                .dark-mode .page-header {
                    background: #1e293b;
                    border-color: #404040;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 24px;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }

                .header-icon-wrapper {
                    width: 70px;
                    height: 70px;
                    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 20px rgba(39,174,96,0.3);
                }

                .header-icon {
                    font-size: 2.5rem;
                }

                .header-text h1 {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #2c3e50, #34495e);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .dark-mode .header-text h1 {
                    background: linear-gradient(135deg, #f0f0f0, #ffffff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .header-subtitle {
                    color: #6c757d;
                    font-size: 0.9rem;
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .dark-mode .header-subtitle {
                    color: #b0b0b0;
                }

                .header-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .stats-controls {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                    background: #f8f9fa;
                    padding: 8px 24px;
                    border-radius: 50px;
                    border: 1px solid #e9ecef;
                }

                .dark-mode .stats-controls {
                    background: #2d2d2d;
                    border-color: #404040;
                }

                .last-update-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #6c757d;
                    font-size: 0.85rem;
                    padding: 4px 16px;
                    background: white;
                    border-radius: 50px;
                }

                .dark-mode .last-update-wrapper {
                    background: #1e293b;
                    color: #b0b0b0;
                }

                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    padding: 4px 16px;
                    border-radius: 50px;
                    background: white;
                }

                .dark-mode .auto-refresh-toggle {
                    background: #1e293b;
                }

                .auto-refresh-toggle input {
                    display: none;
                }

                .toggle-slider {
                    width: 40px;
                    height: 20px;
                    background: #dee2e6;
                    border-radius: 20px;
                    position: relative;
                    transition: all 0.2s;
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all 0.2s;
                }

                .auto-refresh-toggle.active .toggle-slider {
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                }

                .auto-refresh-toggle.active .toggle-slider::before {
                    transform: translateX(20px);
                }

                .toggle-label {
                    color: #6c757d;
                    font-size: 0.85rem;
                }

                .dark-mode .toggle-label {
                    color: #b0b0b0;
                }

                .meal-count {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    padding: 16px 32px;
                    border-radius: 50px;
                    font-weight: 600;
                }

                .count-number {
                    font-size: 1.8rem;
                    font-weight: 800;
                }

                .count-label {
                    font-size: 0.85rem;
                    opacity: 0.9;
                }

                /* رسالة الخطأ */
                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px 24px;
                    background: #fee2e2;
                    color: #ef4444;
                    border-radius: 16px;
                    margin-bottom: 24px;
                    border: 1px solid #fecaca;
                }

                .error-dismiss {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 1.1rem;
                    padding: 4px;
                    border-radius: 50%;
                }

                /* أزرار التبويب */
                .tabs-navigation {
                    display: flex;
                    background: white;
                    border-radius: 20px;
                    padding: 8px;
                    margin-bottom: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    border: 1px solid #e9ecef;
                    gap: 8px;
                }

                .dark-mode .tabs-navigation {
                    background: #1e293b;
                    border-color: #404040;
                }

                .tab-btn {
                    flex: 1;
                    padding: 16px 24px;
                    border: none;
                    background: transparent;
                    border-radius: 16px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #6c757d;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    position: relative;
                }

                .dark-mode .tab-btn {
                    color: #b0b0b0;
                }

                .tab-btn.active {
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    transform: translateY(-2px);
                }

                .tab-icon {
                    font-size: 1.2rem;
                }

                .tab-active-indicator {
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 30px;
                    height: 3px;
                    background: white;
                    border-radius: 3px;
                }

                /* محتوى التبويب */
                .tab-content {
                    animation: fadeInUp 0.3s ease;
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

                /* استجابة للشاشات الصغيرة */
                @media (max-width: 768px) {
                    .nutrition-main {
                        padding: 12px;
                    }

                    .page-header {
                        padding: 20px;
                    }

                    .header-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .header-left {
                        flex-direction: column;
                    }

                    .stats-controls {
                        flex-direction: column;
                        width: 100%;
                    }

                    .tabs-navigation {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}

export default NutritionMain;