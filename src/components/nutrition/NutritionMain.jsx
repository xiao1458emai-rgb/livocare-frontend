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
// ✅ تعديل دالة fetchMeals
const fetchMeals = useCallback(async () => {
    // ✅ منع الطلبات المتزامنة
    if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
        const response = await axiosInstance.get('/meals/');
        
        if (!isMountedRef.current) return;
        
        // ✅ معالجة البيانات - دعم results والمصفوفة
        let mealsData = [];
        if (response.data?.results) {
            mealsData = response.data.results;
        } else if (Array.isArray(response.data)) {
            mealsData = response.data;
        } else {
            mealsData = [];
        }
        
        console.log('🍽️ NutritionMain - Meals loaded:', mealsData.length, 'records');
        setMeals(mealsData);
        setLastUpdate(new Date());
        
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
/* NutritionMain.css - متوافق مع ThemeManager */

.nutrition-main {
    padding: var(--spacing-lg);
    min-height: 100vh;
    background: var(--primary-bg);
    position: relative;
    transition: background var(--transition-medium);
}

/* ===== شريط تحميل ===== */
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
    background: var(--primary-gradient);
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
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 12px;
    z-index: 9999;
}

[dir="rtl"] .loading-text {
    right: auto;
    left: 20px;
}

/* ===== رأس الصفحة ===== */
.page-header {
    background: var(--card-bg);
    border-radius: var(--radius-2xl);
    padding: var(--spacing-xl) var(--spacing-2xl);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-lg);
}

.header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
}

.header-icon-wrapper {
    width: 70px;
    height: 70px;
    background: var(--primary-gradient);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
}

.header-icon {
    font-size: 2.5rem;
}

.header-text h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.header-subtitle {
    color: var(--text-tertiary);
    font-size: 0.9rem;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.subtitle-icon {
    font-size: 0.9rem;
}

/* ===== الإحصائيات ===== */
.header-stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.stats-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex-wrap: wrap;
    background: var(--secondary-bg);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
}

.last-update-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-tertiary);
    font-size: 0.85rem;
    padding: 4px 16px;
    background: var(--card-bg);
    border-radius: var(--radius-full);
}

.last-update-icon {
    font-size: 0.9rem;
}

/* ===== تبديل التحديث التلقائي ===== */
.auto-refresh-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    padding: 4px 16px;
    border-radius: var(--radius-full);
    background: var(--card-bg);
    transition: all var(--transition-fast);
}

.auto-refresh-toggle input {
    display: none;
}

.toggle-slider {
    width: 40px;
    height: 20px;
    background: var(--border-medium);
    border-radius: 20px;
    position: relative;
    transition: all var(--transition-fast);
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
    transition: all var(--transition-fast);
}

.auto-refresh-toggle.active .toggle-slider {
    background: var(--primary-gradient);
}

.auto-refresh-toggle.active .toggle-slider::before {
    transform: translateX(20px);
}

[dir="rtl"] .auto-refresh-toggle.active .toggle-slider::before {
    transform: translateX(-20px);
}

.toggle-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

/* ===== عدد الوجبات ===== */
.meal-count {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: var(--primary-gradient);
    color: white;
    padding: var(--spacing-md) var(--spacing-xl);
    border-radius: var(--radius-full);
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

/* ===== رسالة الخطأ ===== */
.error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--error-bg);
    color: var(--error);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--error-border);
}

.error-icon {
    font-size: 1.2rem;
}

.error-text {
    flex: 1;
}

.error-dismiss {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.1rem;
    padding: var(--spacing-xs);
    border-radius: 50%;
    transition: all var(--transition-fast);
}

.error-dismiss:hover {
    background: rgba(0, 0, 0, 0.1);
}

/* ===== أزرار التبويب ===== */
.tabs-navigation {
    display: flex;
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    gap: var(--spacing-sm);
}

.tab-btn {
    flex: 1;
    padding: var(--spacing-md) var(--spacing-lg);
    border: none;
    background: transparent;
    border-radius: var(--radius-lg);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-medium);
    color: var(--text-tertiary);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    position: relative;
}

.tab-btn:hover:not(.active) {
    background: var(--hover-bg);
    color: var(--primary);
}

.tab-btn.active {
    background: var(--primary-gradient);
    color: white;
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.tab-icon {
    font-size: 1.2rem;
}

.tab-text {
    font-size: 0.95rem;
}

.tab-active-indicator {
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background: white;
    border-radius: var(--radius-full);
}

/* ===== محتوى التبويب ===== */
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

/* ===== دعم الحركة المخفضة ===== */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
}

.reduce-motion .tab-content {
    animation: none !important;
}

.reduce-motion .loading-progress {
    animation: none !important;
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .nutrition-main {
        padding: var(--spacing-sm);
    }

    .page-header {
        padding: var(--spacing-lg);
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

    .tab-btn {
        justify-content: center;
    }

    .meal-count {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .header-icon-wrapper {
        width: 55px;
        height: 55px;
    }

    .header-icon {
        font-size: 2rem;
    }

    .header-text h1 {
        font-size: 1.5rem;
    }

    .count-number {
        font-size: 1.3rem;
    }

    .tab-btn {
        padding: var(--spacing-sm) var(--spacing-md);
    }

    .tab-text {
        font-size: 0.85rem;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .loading-text {
    right: auto;
    left: 20px;
}

[dir="rtl"] .auto-refresh-toggle.active .toggle-slider::before {
    transform: translateX(-20px);
}

[dir="rtl"] .tab-active-indicator {
    left: 50%;
    transform: translateX(-50%);
}

[dir="rtl"] .header-left {
    flex-direction: row-reverse;
}

[dir="rtl"] .stats-controls {
    flex-direction: row-reverse;
}

@media (max-width: 768px) {
    [dir="rtl"] .stats-controls {
        flex-direction: column;
    }
    
    [dir="rtl"] .header-left {
        flex-direction: column-reverse;
    }
}
            `}</style>
        </div>
    );
}

export default NutritionMain;