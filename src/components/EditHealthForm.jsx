'use client'
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api'; 
import '../index.css';

// المكونات الأساسية
import HealthForm from './HealthForm';
import HealthHistory from './HealthHistory';
import HealthCharts from './HealthCharts';
import Sidebar from './Sidebar';   
import NutritionMain from './nutrition/NutritionMain';
import SleepTracker from './SleepTracker';
import HabitTracker from './HabitTracker';
import ActivityForm from './ActivityForm';
import MoodTracker from './MoodTracker';

function Dashboard() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    
    // -----------------------------------------------------
    // I. الحالات (STATE)
    // -----------------------------------------------------
    const [healthData, setHealthData] = useState(null);
    const [healthRecords, setHealthRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [activeSection, setActiveSection] = useState('health');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || prefersDark;
        }
        return false;
    });

    // -----------------------------------------------------
    // II. التأثيرات (EFFECTS)
    // -----------------------------------------------------
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const html = document.documentElement;
            if (darkMode) {
                html.classList.add('dark-mode');
                document.body.style.backgroundColor = '#0a0f1f';
            } else {
                html.classList.remove('dark-mode');
                document.body.style.backgroundColor = '#f8fafc';
            }
        }
    }, [darkMode]);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = i18n.language;
            
            const handleLanguageChange = (e) => {
                document.documentElement.dir = e.detail.language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = e.detail.language;
            };
            
            window.addEventListener('languageChanged', handleLanguageChange);
            return () => window.removeEventListener('languageChanged', handleLanguageChange);
        }
    }, [isRTL, i18n.language]);

    useEffect(() => {
        const checkAuth = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('access_token');
                setIsAuthReady(!!token);
            }
        };
        checkAuth();
    }, []);

    // ✅ جلب بيانات الصحة - المسار الصحيح
    const fetchHealthData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // ✅ المسار الصحيح للـ API
            const response = await axiosInstance.get('/health_status/');
            console.log('📊 API Response:', response.data);
            
            let records = [];
            
            // ✅ معالجة البيانات القادمة من API
            if (response.data?.results) {
                records = response.data.results;
            } else if (Array.isArray(response.data)) {
                records = response.data;
            } else {
                records = [];
            }
            
            console.log('📊 Records found:', records.length);
            setHealthRecords(records);
            
            // ✅ استخراج أحدث قراءة
            if (records.length > 0) {
                const sortedRecords = [...records].sort((a, b) => 
                    new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || a.created_at)
                );
                const latest = sortedRecords[0];
                
                console.log('📊 Latest record:', latest);
                
                // ✅ التحقق من صحة البيانات
                const weight = latest.weight_kg ? parseFloat(latest.weight_kg) : null;
                const systolic = latest.systolic_pressure ? parseInt(latest.systolic_pressure) : null;
                const diastolic = latest.diastolic_pressure ? parseInt(latest.diastolic_pressure) : null;
                const glucose = latest.glucose_mgdl || latest.blood_glucose ? parseFloat(latest.glucose_mgdl || latest.blood_glucose) : null;
                
                setHealthData({
                    weight: weight,
                    systolic: systolic,
                    diastolic: diastolic,
                    glucose: glucose,
                    recorded_at: latest.recorded_at || latest.created_at,
                    source: 'api'
                });
                
                // حفظ في localStorage كنسخة احتياطية
                localStorage.setItem('lastHealthReading', JSON.stringify({
                    weight: weight,
                    systolic: systolic,
                    diastolic: diastolic,
                    glucose: glucose,
                    recorded_at: latest.recorded_at
                }));
            } else {
                // ✅ محاولة جلب من localStorage كنسخة احتياطية
                const storedData = localStorage.getItem('lastHealthReading');
                if (storedData) {
                    try {
                        const parsed = JSON.parse(storedData);
                        setHealthData({ ...parsed, source: 'localStorage' });
                        console.log('📊 Using cached data from localStorage');
                    } catch (err) {
                        setHealthData(null);
                    }
                } else {
                    setHealthData(null);
                }
            }
            
        } catch (err) {
            console.error('❌ Error fetching health data:', err);
            setError(t('dashboard.fetchError'));
            
            // ✅ محاولة جلب من localStorage عند فشل API
            const storedData = localStorage.getItem('lastHealthReading');
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    setHealthData({ ...parsed, source: 'localStorage' });
                    console.log('📊 Using cached data from localStorage after API error');
                } catch (err) {
                    setHealthData(null);
                }
            } else {
                setHealthData(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthReady) {
            fetchHealthData();
        }
    }, [refreshKey, isAuthReady]);

    useEffect(() => {
        if (!autoRefresh || !isAuthReady) return;
        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
            console.log('🔄 Auto-refreshing dashboard...');
        }, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, isAuthReady]);

    // -----------------------------------------------------
    // III. الدوال (FUNCTIONS)
    // -----------------------------------------------------
    
    const handleDataSubmitted = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    const displayValue = (value, unit = '') => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        return `${value} ${unit}`.trim();
    };

    const displayBloodPressure = (systolic, diastolic) => {
        if (!systolic && systolic !== 0) return '—';
        if (!diastolic && diastolic !== 0) return '—';
        return `${systolic} / ${diastolic}`;
    };

    const getTodayDate = () => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return today.toLocaleDateString(locale, options);
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: newDarkMode } }));
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleManualRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'health':
                return (
                    <div className="health-section">
                        <div className="summary-section">
                            <div className="summary-header">
                                <h3>📊 {t('dashboard.dailySummary')}</h3>
                                <span className="summary-date">{getTodayDate()}</span>
                                {healthData?.source === 'localStorage' && (
                                    <span className="data-source">📱 {t('dashboard.localData')}</span>
                                )}
                            </div>
                            
                            <div className="summary-cards">
                                <div className="summary-card">
                                    <div className="card-icon">⚖️</div>
                                    <div className="card-content">
                                        <h4>{t('dashboard.lastWeight')}</h4>
                                        <p className="card-value">
                                            {displayValue(healthData?.weight, t('dashboard.kg'))}
                                        </p>
                                        {healthData?.recorded_at && (
                                            <div className="card-time">
                                                {new Date(healthData.recorded_at).toLocaleTimeString(
                                                    i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                                                    { hour: '2-digit', minute: '2-digit' }
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-glow"></div>
                                </div>
                                
                                <div className="summary-card">
                                    <div className="card-icon">❤️</div>
                                    <div className="card-content">
                                        <h4>{t('dashboard.bloodPressure')}</h4>
                                        <p className="card-value">
                                            {displayBloodPressure(healthData?.systolic, healthData?.diastolic)}
                                        </p>
                                        <small>{t('dashboard.sysDia')}</small>
                                    </div>
                                    <div className="card-glow"></div>
                                </div>
                                
                                <div className="summary-card">
                                    <div className="card-icon">🩸</div>
                                    <div className="card-content">
                                        <h4>{t('dashboard.bloodGlucose')}</h4>
                                        <p className="card-value">
                                            {displayValue(healthData?.glucose, 'mg/dL')}
                                        </p>
                                        <small>{t('dashboard.glucoseLevel')}</small>
                                    </div>
                                    <div className="card-glow"></div>
                                </div>
                            </div>
                            
                            {!healthData?.weight && !healthData?.systolic && !healthData?.glucose && (
                                <div className="no-data-message">
                                    <div className="no-data-icon">📊</div>
                                    <h4>{t('dashboard.noDataTitle', 'لا توجد بيانات صحية')}</h4>
                                    <p>{t('dashboard.noDataMessage', 'أضف قراءاتك الصحية الأولى')}</p>
                                    <button 
                                        onClick={() => document.querySelector('.health-form')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="add-data-btn"
                                    >
                                        ➕ {t('dashboard.addFirstReading', 'أضف قراءة')}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="health-components">
                            <div className="health-form">
                                <HealthForm onDataSubmitted={handleDataSubmitted} />
                            </div>
                            <ActivityForm onDataSubmitted={handleDataSubmitted} />
                            <HealthHistory refreshKey={refreshKey} onDataSubmitted={handleDataSubmitted} />
                            <HealthCharts refreshKey={refreshKey} />
                        </div>
                    </div>
                );
                
            case 'nutrition':
                return <NutritionMain onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'sleep':
                return <SleepTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'habits':
                return <HabitTracker onDataSubmitted={handleDataSubmitted} isAuthReady={isAuthReady} />;
            case 'mood':
                return <MoodTracker isAuthReady={isAuthReady} />;
            case 'chat':
                return (
                    <div className="coming-soon">
                        <div className="coming-soon-icon">💬</div>
                        <h3>{t('dashboard.chatComingSoon')}</h3>
                        <p>{t('dashboard.chatDescription')}</p>
                    </div>
                );
            case 'profile':
                return (
                    <div className="coming-soon">
                        <div className="coming-soon-icon">👤</div>
                        <h3>{t('dashboard.profileComingSoon')}</h3>
                        <p>{t('dashboard.profileDescription')}</p>
                    </div>
                );
            default:
                return null;
        }
    };

    const getSectionTitle = (sectionKey) => {
        const titles = {
            'health': `📊 ${t('dashboard.dashboard')}`,
            'nutrition': `🥗 ${t('dashboard.nutritionTitle')}`,
            'sleep': `🌙 ${t('dashboard.sleepTitle')}`,
            'habits': `💊 ${t('dashboard.habitsTitle')}`,
            'mood': `😊 ${t('dashboard.moodTitle')}`,
            'chat': `💬 ${t('dashboard.chatTitle')}`,
            'profile': `👤 ${t('dashboard.profileTitle')}`
        };
        return titles[sectionKey] || t('dashboard.dashboard');
    };

    // -----------------------------------------------------
    // IV. العرض المشروط
    // -----------------------------------------------------
    
    if (loading && !healthData) {
        return (
            <div className={`loading-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-spinner"></div>
                <h2>{t('dashboard.loadingSummary', 'جاري التحميل...')}</h2>
                <p>{t('dashboard.pleaseWait', 'يرجى الانتظار قليلاً')}</p>
            </div>
        );
    }

    if (error && !healthData) {
        return (
            <div className={`error-dashboard ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-icon">⚠️</div>
                <h2>{error}</h2>
                <button onClick={fetchHealthData} className="retry-btn">
                    🔄 {t('dashboard.retry', 'إعادة المحاولة')}
                </button>
            </div>
        );
    }

    return (
        <div className={`dashboard-layout ${darkMode ? 'dark-mode' : ''}`}>
            {/* شريط التحكم العلوي */}
            <div className="control-bar">
                <div className="control-left">
                    <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
                        {sidebarOpen ? '✕' : '☰'}
                    </button>
                    <div className="app-name">LivoCare</div>
                </div>
                
                <div className="control-center">
                    <div className="date-display">{getTodayDate()}</div>
                </div>
                
                <div className="control-right">
                    <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? '☀️' : '🌙'}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* القائمة الجانبية */}
            <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <Sidebar 
                    activeSection={activeSection} 
                    onSectionChange={(section) => {
                        setActiveSection(section);
                        setSidebarOpen(false);
                    }}
                />
            </div>
            
            {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            {/* المحتوى الرئيسي */}
            <main className="dashboard-content">
                <div className="section-header">
                    <div className="header-main">
                        <h1>{getSectionTitle(activeSection)}</h1>
                        <div className="refresh-controls">
                            <button onClick={handleManualRefresh} disabled={loading} className={`refresh-btn ${loading ? 'loading' : ''}`}>
                                {loading ? '⏳' : '🔄'} {t('dashboard.refresh', 'تحديث')}
                            </button>
                            
                            <label className="auto-refresh-toggle">
                                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">{t('dashboard.autoRefresh', 'تحديث تلقائي')}</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="header-info">
                        {autoRefresh && <span className="auto-refresh-status">🔄 {t('dashboard.autoRefreshActive', 'التحديث التلقائي نشط')}</span>}
                        {healthData?.recorded_at && (
                            <div className="last-updated">
                                {t('dashboard.lastUpdated', 'آخر تحديث')}: {new Date(healthData.recorded_at).toLocaleDateString(
                                    i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="section-content">
                    {renderSectionContent()}
                </div>
            </main>
  
            <style jsx>{`
 /* Dashboard.css - متوافق مع ThemeManager */

/* ===== تخطيط عام ===== */
.dashboard-layout {
    min-height: 100vh;
    background: var(--primary-bg);
    transition: all var(--transition-slow);
    position: relative;
}

/* ===== شريط التحكم ===== */
.control-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--spacing-xl);
    z-index: 1000;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-md);
}

.control-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.menu-toggle {
    display: none;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 1.2rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
}

.menu-toggle:active {
    transform: scale(0.95);
}

.menu-toggle:hover {
    background: var(--primary);
    color: white;
}

.app-name {
    font-size: 1.5rem;
    font-weight: 700;
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.control-center {
    flex: 1;
    text-align: center;
}

.date-display {
    display: inline-block;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--secondary-bg);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 0.9rem;
    border: 1px solid var(--border-light);
}

.control-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
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
    -webkit-tap-highlight-color: transparent;
}

.theme-toggle:active {
    transform: rotate(15deg) scale(0.95);
}

.theme-toggle:hover {
    transform: rotate(15deg);
    background: var(--primary);
    color: white;
}

/* ===== السايدبار ===== */
.sidebar-wrapper {
    position: fixed;
    top: 70px;
    bottom: 0;
    width: 280px;
    z-index: 999;
    transition: transform var(--transition-medium);
}

[dir="ltr"] .sidebar-wrapper {
    left: 0;
    transform: translateX(-100%);
}

[dir="rtl"] .sidebar-wrapper {
    right: 0;
    transform: translateX(100%);
}

.sidebar-wrapper.open {
    transform: translateX(0);
}

/* Overlay للجوال */
.sidebar-overlay {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== المحتوى الرئيسي ===== */
.dashboard-content {
    margin-top: 70px;
    padding: var(--spacing-xl);
    min-height: calc(100vh - 70px);
    background: var(--primary-bg);
    transition: margin var(--transition-medium);
}

[dir="ltr"] .dashboard-content {
    margin-left: 0;
}

[dir="rtl"] .dashboard-content {
    margin-right: 0;
}

/* ===== رأس القسم ===== */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-md);
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.header-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    flex: 1;
}

.section-header h1 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.8rem;
    font-weight: 700;
}

.refresh-controls {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
    flex-wrap: wrap;
}

.refresh-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all var(--transition-medium);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.refresh-btn:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.refresh-btn.loading {
    background: var(--text-tertiary);
}

/* ===== تبديل التحديث التلقائي ===== */
.auto-refresh-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    background: var(--secondary-bg);
    border: 1px solid var(--border-light);
}

.auto-refresh-toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    width: 40px;
    height: 20px;
    background: var(--border-light);
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
    box-shadow: var(--shadow-sm);
}

input:checked + .toggle-slider {
    background: var(--primary);
}

input:checked + .toggle-slider::before {
    transform: translateX(20px);
}

[dir="rtl"] input:checked + .toggle-slider::before {
    transform: translateX(-20px);
}

.toggle-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: flex-end;
}

.auto-refresh-status {
    font-size: 0.8rem;
    color: var(--success);
    background: rgba(34, 197, 94, 0.1);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    animation: pulse 2s infinite;
}

.last-updated {
    color: var(--text-secondary);
    font-size: 0.9rem;
    background: var(--secondary-bg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
}

/* ===== قسم الملخص ===== */
.summary-section {
    background: var(--card-bg);
    border-radius: var(--radius-2xl);
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-xl);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-lg);
}

.summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.summary-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.summary-date {
    color: var(--text-secondary);
    font-size: 0.85rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--secondary-bg);
    border-radius: var(--radius-full);
}

.data-source {
    font-size: 0.8rem;
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

/* ===== بطاقات الملخص ===== */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-lg);
}

.summary-card {
    background: var(--secondary-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.summary-card:active {
    transform: scale(0.98);
}

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--primary);
}

.card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: radial-gradient(circle at 50% 0%, var(--primary) 0%, transparent 70%);
    opacity: 0;
    transition: opacity var(--transition-medium);
    pointer-events: none;
}

.summary-card:hover .card-glow {
    opacity: 0.1;
}

.card-icon {
    width: 70px;
    height: 70px;
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    box-shadow: var(--shadow-md);
    transition: all var(--transition-medium);
}

.summary-card:hover .card-icon {
    transform: scale(1.1) rotate(5deg);
    background: var(--primary);
    color: white;
}

.card-content {
    flex: 1;
}

.card-content h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
}

.card-value {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
}

.card-time {
    color: var(--text-tertiary);
    font-size: 0.75rem;
}

.card-content small {
    color: var(--text-secondary);
    font-size: 0.75rem;
}

/* ===== رسالة عدم وجود بيانات ===== */
.no-data-message {
    text-align: center;
    padding: var(--spacing-2xl);
    background: var(--secondary-bg);
    border-radius: var(--radius-xl);
    border: 2px dashed var(--border-light);
    margin-top: var(--spacing-xl);
}

.no-data-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
}

.no-data-message h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
    font-size: 1.2rem;
}

.no-data-message p {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-secondary);
}

.add-data-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-medium);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    -webkit-tap-highlight-color: transparent;
}

.add-data-btn:active {
    transform: scale(0.96);
}

.add-data-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* ===== قسم "قريباً" ===== */
.coming-soon {
    text-align: center;
    padding: 5rem 2rem;
    background: var(--card-bg);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-lg);
}

.coming-soon-icon {
    font-size: 5rem;
    margin-bottom: var(--spacing-lg);
    opacity: 0.5;
    animation: float 3s infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.coming-soon h3 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
    font-size: 1.8rem;
}

.coming-soon p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
}

/* ===== حالات التحميل والخطأ ===== */
.loading-dashboard,
.error-dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--primary-bg);
    text-align: center;
    padding: var(--spacing-xl);
}

.loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-lg);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.loading-dashboard h2 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    font-size: 1.3rem;
}

.loading-dashboard p {
    color: var(--text-secondary);
}

.error-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    animation: pulse 2s infinite;
}

.error-dashboard h2 {
    color: var(--error);
    margin-bottom: var(--spacing-lg);
    font-size: 1.2rem;
}

.retry-btn {
    padding: var(--spacing-sm) var(--spacing-xl);
    background: var(--error);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-medium);
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.retry-btn:active {
    transform: scale(0.96);
}

/* ===== تحسينات للشاشات الكبيرة ===== */
@media (min-width: 1025px) {
    .sidebar-wrapper {
        transform: translateX(0) !important;
    }

    .menu-toggle {
        display: none !important;
    }

    [dir="ltr"] .dashboard-content {
        margin-left: 280px !important;
    }

    [dir="rtl"] .dashboard-content {
        margin-right: 280px !important;
    }
}

/* ===== للشاشات الكبيرة جداً ===== */
@media (min-width: 1400px) {
    .sidebar-wrapper {
        width: 320px;
    }

    [dir="ltr"] .dashboard-content {
        margin-left: 320px !important;
    }

    [dir="rtl"] .dashboard-content {
        margin-right: 320px !important;
    }

    .dashboard-content {
        padding: var(--spacing-xl) var(--spacing-2xl);
    }

    .section-header h1 {
        font-size: 2.2rem;
    }
}

/* ===== للشاشات المتوسطة ===== */
@media (min-width: 768px) and (max-width: 1024px) {
    .sidebar-wrapper {
        width: 260px;
    }

    [dir="ltr"] .dashboard-content {
        margin-left: 260px !important;
    }

    [dir="rtl"] .dashboard-content {
        margin-right: 260px !important;
    }

    .dashboard-content {
        padding: var(--spacing-lg);
    }

    .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-md);
    }

    .card-icon {
        width: 60px;
        height: 60px;
        font-size: 1.6rem;
    }

    .card-value {
        font-size: 1.6rem;
    }
}

/* ===== للشاشات الصغيرة ===== */
@media (max-width: 767px) {
    .control-bar {
        height: 60px;
        padding: 0 var(--spacing-md);
    }

    .menu-toggle {
        display: flex !important;
        align-items: center;
        justify-content: center;
    }

    .app-name {
        font-size: 1.2rem;
    }

    .date-display {
        display: none;
    }

    .dashboard-content {
        margin-top: 60px;
        padding: var(--spacing-md);
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
    }

    .section-header h1 {
        font-size: 1.3rem;
    }

    .summary-section {
        padding: var(--spacing-lg);
        border-radius: var(--radius-xl);
    }

    .summary-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }

    .summary-header h3 {
        font-size: 1.1rem;
    }

    .summary-cards {
        grid-template-columns: 1fr;
        gap: var(--spacing-md);
    }

    .summary-card {
        padding: var(--spacing-md);
        gap: var(--spacing-md);
        flex-direction: row;
    }

    .card-icon {
        width: 55px;
        height: 55px;
        font-size: 1.6rem;
        border-radius: var(--radius-md);
    }

    .card-value {
        font-size: 1.5rem;
    }

    .no-data-message {
        padding: var(--spacing-xl);
    }

    .no-data-icon {
        font-size: 3rem;
    }

    .coming-soon {
        padding: 3rem var(--spacing-md);
    }

    .coming-soon h3 {
        font-size: 1.5rem;
    }

    .coming-soon p {
        font-size: 1rem;
    }
}

/* ===== للشاشات الصغيرة جداً ===== */
@media (max-width: 480px) {
    .dashboard-content {
        padding: var(--spacing-sm);
    }

    .section-header h1 {
        font-size: 1.2rem;
    }

    .summary-section {
        padding: var(--spacing-md);
        border-radius: var(--radius-lg);
    }

    .summary-card {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md);
    }

    .card-icon {
        margin: 0 auto;
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
    }

    .card-value {
        font-size: 1.3rem;
    }

    .control-right {
        gap: var(--spacing-sm);
    }

    .theme-toggle {
        width: 36px;
        height: 36px;
        font-size: 1rem;
    }

    .refresh-controls {
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
    }

    .refresh-btn {
        width: 100%;
        justify-content: center;
    }

    .auto-refresh-toggle {
        width: 100%;
        justify-content: space-between;
    }
}

/* ===== الوضع الأفقي ===== */
@media (max-height: 600px) and (orientation: landscape) {
    .control-bar {
        height: 55px;
    }

    .dashboard-content {
        margin-top: 55px;
    }

    .summary-section {
        padding: var(--spacing-md);
    }

    .summary-cards {
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-sm);
    }

    .summary-card {
        padding: var(--spacing-sm);
        flex-direction: column;
        text-align: center;
    }

    .card-icon {
        width: 45px;
        height: 45px;
        font-size: 1.3rem;
    }

    .card-value {
        font-size: 1.2rem;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .card-icon {
    margin-left: 0;
    margin-right: var(--spacing-md);
}

[dir="rtl"] .refresh-controls {
    flex-direction: row-reverse;
}

[dir="rtl"] .header-info {
    align-items: flex-start;
}

@media (max-width: 767px) {
    [dir="rtl"] .summary-card {
        flex-direction: row;
    }
    
    [dir="rtl"] .card-icon {
        margin: 0;
    }
}

@media (max-width: 480px) {
    [dir="rtl"] .summary-card {
        flex-direction: column;
    }
    
    [dir="rtl"] .card-icon {
        margin: 0 auto;
    }
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .summary-card:hover,
    .add-data-btn:hover,
    .retry-btn:hover {
        transform: none !important;
        animation: none !important;
    }

    .loading-spinner {
        animation: none !important;
    }

    .error-icon,
    .coming-soon-icon {
        animation: none !important;
    }

    .sidebar-overlay {
        animation: none !important;
    }
}

/* ===== تحسينات اللمس للأجهزة المحمولة ===== */
@media (hover: none) and (pointer: coarse) {
    .summary-card:hover {
        transform: none;
    }

    .add-data-btn:active,
    .retry-btn:active,
    .theme-toggle:active,
    .menu-toggle:active {
        transform: scale(0.96);
    }
}
            `}</style>
        </div>
    );
}

export default Dashboard;