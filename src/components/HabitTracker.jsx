// src/components/HabitTracker.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import HabitAnalytics from './Analytics/HabitAnalytics';
import BarcodeScanner from '../components/Camera/BarcodeScanner';
import '../index.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب النقاط
const calculatePoints = (habitName, isCompleted) => {
    if (!isCompleted) return 0;
    
    const pointsMap = {
        'sleep': 15,
        'water': 10,
        'exercise': 20,
        'medication': 10,
        'reading': 10,
        'meditation': 15,
        'walk': 15,
        'healthy_meal': 10
    };
    
    for (const [key, points] of Object.entries(pointsMap)) {
        if (habitName.toLowerCase().includes(key)) {
            return points;
        }
    }
    return 5;
};

function HabitTracker({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    
    const [definitions, setDefinitions] = useState([]);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDescription, setNewHabitDescription] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [userPoints, setUserPoints] = useState(0);
    const [weeklyPoints, setWeeklyPoints] = useState(0);
    const [streakDays, setStreakDays] = useState(0);
    const [todayLogs, setTodayLogs] = useState([]);
    
    // ✅ State للبحث عن الأدوية
    const [drugSearchQuery, setDrugSearchQuery] = useState('');
    const [drugSearchResults, setDrugSearchResults] = useState([]);
    const [searchingDrug, setSearchingDrug] = useState(false);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب تعريفات العادات
    const fetchHabitDefinitions = useCallback(async () => {
        if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        
        try {
            const response = await axiosInstance.get('/habit-definitions/');
            const definitionsData = Array.isArray(response.data) ? response.data : 
                                   (response.data?.results ? response.data.results : []);
            
            const logResponse = await axiosInstance.get('/habit-logs/');
            const logsData = Array.isArray(logResponse.data) ? logResponse.data : 
                            (logResponse.data?.results ? logResponse.data.results : []);
            
            const todayResponse = await axiosInstance.get('/habit-logs/today/');
            const todayData = Array.isArray(todayResponse.data) ? todayResponse.data : [];
            
            if (isMountedRef.current) {
                setDefinitions(definitionsData);
                setLogs(logsData);
                setTodayLogs(todayData);
            }
        } catch (error) {
            console.error('Failed to fetch habits:', error);
            if (isMountedRef.current) {
                setMessage(t('habits.fetchError'));
                setIsError(true);
                setDefinitions([]);
                setLogs([]);
                setTodayLogs([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isAuthReady, t]);

    useEffect(() => {
        if (isAuthReady) {
            fetchHabitDefinitions();
        } else {
            setDefinitions([]);
            setLogs([]);
            setTodayLogs([]);
        }
    }, [isAuthReady, fetchHabitDefinitions]);

    // ✅ حساب النقاط والسلسلة المتتالية
    useEffect(() => {
        if (logs.length === 0) return;
        
        const todayPoints = todayLogs.reduce((sum, log) => {
            if (log.is_completed) {
                const habit = definitions.find(d => d.id === log.habit?.id || d.id === log.habit);
                if (habit) {
                    return sum + calculatePoints(habit.name, true);
                }
            }
            return sum;
        }, 0);
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weekPoints = logs.reduce((sum, log) => {
            const logDate = new Date(log.log_date);
            if (logDate >= weekAgo && log.is_completed) {
                const habit = definitions.find(d => d.id === log.habit?.id || d.id === log.habit);
                if (habit) {
                    return sum + calculatePoints(habit.name, true);
                }
            }
            return sum;
        }, 0);
        
        setUserPoints(todayPoints);
        setWeeklyPoints(weekPoints);
        
        let streak = 0;
        const checkDate = new Date();
        
        while (true) {
            const dateStr = checkDate.toDateString();
            const hasLogOnDate = logs.some(log => {
                const logDate = new Date(log.log_date).toDateString();
                return logDate === dateStr && log.is_completed;
            });
            
            if (hasLogOnDate) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        setStreakDays(streak);
    }, [logs, definitions, todayLogs]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ✅ البحث عن دواء في openFDA بالاسم أو الرمز
    const searchDrugInFDA = async (query, searchType = 'name') => {
        setSearchingDrug(true);
        setDrugSearchResults([]);
        
        try {
            let searchParam = '';
            if (searchType === 'name') {
                searchParam = `openfda.brand_name:"${query}"+or+openfda.generic_name:"${query}"`;
            } else if (searchType === 'ndc') {
                // تنسيق NDC
                let cleanNDC = query.replace(/-/g, '');
                if (cleanNDC.length === 10 && !cleanNDC.includes('-')) {
                    searchParam = `product_ndc:"${cleanNDC.slice(0,2)}-${cleanNDC.slice(2,5)}-${cleanNDC.slice(5)}"`;
                } else {
                    searchParam = `product_ndc:"${query}"`;
                }
            }
            
            const response = await axios.get(
                `https://api.fda.gov/drug/ndc.json?search=${searchParam}&limit=10`,
                { timeout: 10000 }
            );
            
            if (response.data && response.data.results) {
                const results = response.data.results.map(drug => {
                    const openfda = drug.openfda || {};
                    return {
                        brand_name: openfda.brand_name?.[0] || '',
                        generic_name: openfda.generic_name?.[0] || '',
                        manufacturer: openfda.manufacturer_name?.[0] || '',
                        route: drug.route?.[0] || '',
                        dosage_form: drug.dosage_form?.[0] || '',
                        product_ndc: drug.product_ndc || '',
                        id: drug.id
                    };
                }).filter(d => d.brand_name || d.generic_name);
                
                setDrugSearchResults(results);
                if (results.length === 0) {
                    setMessage(`⚠️ لم يتم العثور على دواء匹配: ${query}`);
                    setIsError(true);
                    setTimeout(() => setMessage(''), 3000);
                }
            }
        } catch (error) {
            console.error('Error searching FDA:', error);
            setMessage('❌ حدث خطأ في البحث عن الدواء');
            setIsError(true);
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setSearchingDrug(false);
        }
    };

    // ✅ اختيار دواء من نتائج البحث
    const selectDrug = (drug) => {
        setNewHabitName(drug.brand_name || drug.generic_name);
        
        const descriptionParts = [];
        if (drug.generic_name) descriptionParts.push(`💊 الاسم العلمي: ${drug.generic_name}`);
        if (drug.manufacturer) descriptionParts.push(`🏭 الشركة: ${drug.manufacturer}`);
        if (drug.route) descriptionParts.push(`💉 طريقة الاستخدام: ${drug.route}`);
        if (drug.dosage_form) descriptionParts.push(`📦 الشكل الصيدلاني: ${drug.dosage_form}`);
        if (drug.product_ndc) descriptionParts.push(`🔢 الرمز: ${drug.product_ndc}`);
        
        setNewHabitDescription(descriptionParts.join(' | '));
        setMessage(`✅ تم اختيار الدواء: ${drug.brand_name || drug.generic_name}`);
        setIsError(false);
        setDrugSearchResults([]);
        setDrugSearchQuery('');
        
        setTimeout(() => setMessage(''), 3000);
    };

    // ✅ معالجة الباركود (محاولة البحث كـ NDC)
    const handleProductFound = async (result) => {
        console.log('📦 Barcode result:', result);
        
        if (typeof result === 'string' && result.length > 0) {
            const barcode = result;
            console.log('🔍 Searching for NDC in openFDA:', barcode);
            
            setLoading(true);
            
            try {
                // تنظيف الباركود
                let cleanBarcode = barcode.replace(/-/g, '');
                
                // إذا كان الباركود 13 رقم، حاول استخراج 10 أرقام كـ NDC
                if (cleanBarcode.length === 13) {
                    cleanBarcode = cleanBarcode.slice(0, 10);
                }
                
                if (cleanBarcode.length === 10 || cleanBarcode.length === 11) {
                    // تنسيق NDC
                    const formattedNDC = `${cleanBarcode.slice(0, 2)}-${cleanBarcode.slice(2, 5)}-${cleanBarcode.slice(5, 9)}`;
                    
                    const response = await axios.get(
                        `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${formattedNDC}"`,
                        { timeout: 10000 }
                    );
                    
                    if (response.data && response.data.results && response.data.results.length > 0) {
                        const drug = response.data.results[0];
                        const openfda = drug.openfda || {};
                        
                        setNewHabitName(openfda.brand_name?.[0] || openfda.generic_name?.[0] || `دواء (${barcode.slice(-8)})`);
                        setNewHabitDescription(`🔢 الرمز: ${formattedNDC}\n💊 ${openfda.generic_name?.[0] || ''}\n🏭 ${openfda.manufacturer_name?.[0] || ''}`);
                        setMessage(`✅ تم العثور على الدواء: ${openfda.brand_name?.[0] || 'دواء'}`);
                        setIsError(false);
                    } else {
                        setNewHabitName(`دواء جديد (${barcode.slice(-8)})`);
                        setNewHabitDescription(`🔢 الرمز: ${barcode}\n⚠️ لم يتم العثور على هذا الرمز في قاعدة بيانات FDA.\nيمكنك البحث بالاسم باستخدام المربع أعلاه.`);
                        setMessage(`⚠️ الرمز ${barcode} غير موجود، يمكنك البحث بالاسم`);
                        setIsError(true);
                    }
                } else {
                    setNewHabitName(`دواء جديد (${barcode.slice(-8)})`);
                    setNewHabitDescription(`🔢 الرمز: ${barcode}\n⚠️ هذا الرمز ليس بتنسيق NDC صالح.\nيمكنك البحث بالاسم باستخدام المربع أعلاه.`);
                    setMessage(`⚠️ الرمز ${barcode} ليس بتنسيق NDC صالح`);
                    setIsError(true);
                }
            } catch (error) {
                console.error('Error searching FDA:', error);
                setNewHabitName(`دواء جديد (${barcode.slice(-8)})`);
                setNewHabitDescription(`🔢 الرمز: ${barcode}\n❌ خطأ في الاتصال بقاعدة البيانات.\nيمكنك البحث بالاسم باستخدام المربع أعلاه.`);
                setMessage('⚠️ حدث خطأ في البحث، يمكنك البحث بالاسم');
                setIsError(true);
            } finally {
                setLoading(false);
                setTimeout(() => setShowScanner(false), 3000);
            }
            return;
        }
        
        if (result && typeof result === 'object') {
            const medicineName = result.name || `دواء جديد`;
            setNewHabitName(medicineName);
            setNewHabitDescription(result.description || '');
            setMessage(`✅ تم إضافة: ${medicineName}`);
            setIsError(false);
            setTimeout(() => setShowScanner(false), 2000);
        }
    };

    const handleAddDefinition = async (e) => {
        e.preventDefault();
        
        if (!isAuthReady) {
            setMessage(t('habits.loginRequired'));
            setIsError(true);
            return;
        }

        const existingHabit = definitions.find(d => 
            d.name.toLowerCase() === newHabitName.trim().toLowerCase()
        );
        
        if (existingHabit) {
            setMessage(t('habits.duplicateHabit', { name: newHabitName }));
            setIsError(true);
            return;
        }

        if (!newHabitName.trim() || !newHabitDescription.trim()) {
            setMessage(t('habits.emptyFields'));
            setIsError(true);
            return;
        }

        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            await axiosInstance.post('/habit-definitions/', { 
                name: newHabitName.trim(), 
                description: newHabitDescription.trim(),
                frequency: 'Daily'
            });
            
            setMessage(t('habits.addSuccess', { name: newHabitName }));
            setNewHabitName('');
            setNewHabitDescription('');
            await fetchHabitDefinitions();
            setRefreshAnalytics(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to add habit:', error.response?.data);
            setMessage(t('habits.addError'));
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };
    
    const handleToggleLog = async (habitId) => {
        if (!isAuthReady) {
            setMessage(t('habits.loginRequired'));
            setIsError(true);
            return;
        }
        
        const existingLog = todayLogs.find(log => (log.habit?.id || log.habit) === habitId);
        const habit = definitions.find(d => d.id === habitId);
        
        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            if (existingLog && existingLog.id) {
                await axiosInstance.delete(`/habit-logs/${existingLog.id}/`);
                setMessage(t('habits.logRemoved', { name: habit?.name || '' }));
            } else {
                await axiosInstance.post('/habit-logs/complete/', {
                    habit_id: habitId,
                    notes: ''
                });
                
                const points = calculatePoints(habit?.name || '', true);
                setMessage(t('habits.logAdded', { name: habit?.name || '', points }));
            }
            await fetchHabitDefinitions();
            setRefreshAnalytics(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to update habit log:', error.response?.data);
            setMessage(t('habits.updateError'));
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const safeDefinitions = Array.isArray(definitions) ? definitions : [];
    const completedToday = todayLogs.filter(log => log.is_completed).length;
    const completionPercentage = safeDefinitions.length > 0 
        ? Math.round((completedToday / safeDefinitions.length) * 100) 
        : 0;

    return (
        <div className={`habit-tracker-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="page-header">
                <h2>
                    <span className="header-icon">💊</span>
                    {t('habits.title')}
                </h2>
                <div className="header-date">
                    {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* 🩺 قسم البحث عن الأدوية في FDA */}
            <div className="drug-search-section">
                <div className="drug-search-header">
                    <span className="drug-search-icon">💊</span>
                    <h4>البحث عن دواء في قاعدة بيانات FDA</h4>
                </div>
                <div className="drug-search-row">
                    <input
                        type="text"
                        value={drugSearchQuery}
                        onChange={(e) => setDrugSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchDrugInFDA(drugSearchQuery, 'name')}
                        placeholder="أدخل اسم الدواء (مثل: Aspirin, Tylenol) أو رمز NDC"
                        className="drug-search-input"
                    />
                    <div className="drug-search-buttons">
                        <button 
                            onClick={() => searchDrugInFDA(drugSearchQuery, 'name')}
                            disabled={searchingDrug || !drugSearchQuery}
                            className="drug-search-btn name-search"
                        >
                            {searchingDrug ? '⏳' : '🔍'} اسم
                        </button>
                        <button 
                            onClick={() => searchDrugInFDA(drugSearchQuery, 'ndc')}
                            disabled={searchingDrug || !drugSearchQuery}
                            className="drug-search-btn ndc-search"
                        >
                            {searchingDrug ? '⏳' : '#️⃣'} رمز NDC
                        </button>
                    </div>
                </div>
                
                {/* نتائج البحث عن الأدوية */}
                {drugSearchResults.length > 0 && (
                    <div className="drug-search-results">
                        <div className="results-header">
                            <span>📋 نتائج البحث ({drugSearchResults.length})</span>
                        </div>
                        {drugSearchResults.map((drug, idx) => (
                            <div key={idx} className="drug-result-item" onClick={() => selectDrug(drug)}>
                                <div className="drug-result-name">
                                    <strong>{drug.brand_name || drug.generic_name}</strong>
                                    {drug.generic_name && drug.brand_name && (
                                        <span className="drug-generic">({drug.generic_name})</span>
                                    )}
                                </div>
                                <div className="drug-result-details">
                                    {drug.manufacturer && <span>🏭 {drug.manufacturer}</span>}
                                    {drug.route && <span>💉 {drug.route}</span>}
                                    {drug.dosage_form && <span>📦 {drug.dosage_form}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* نقاط المستخدم */}
            {(userPoints > 0 || weeklyPoints > 0 || streakDays > 0) && (
                <div className="points-card">
                    <div className="points-header">
                        <span className="points-icon">🏆</span>
                        <span className="points-title">{t('habits.points.title', 'نقاطك')}</span>
                    </div>
                    <div className="points-stats">
                        <div className="points-stat">
                            <div className="points-value">{userPoints}</div>
                            <div className="points-label">{t('habits.points.today', 'نقاط اليوم')}</div>
                        </div>
                        <div className="points-stat">
                            <div className="points-value">{weeklyPoints}</div>
                            <div className="points-label">{t('habits.points.week', 'نقاط الأسبوع')}</div>
                        </div>
                        <div className="points-stat">
                            <div className="points-value">{streakDays}</div>
                            <div className="points-label">{t('habits.points.streak', 'أيام متتالية')}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* رسائل الإشعارات */}
            {message && (
                <div className={`message ${isError ? 'error' : 'success'}`}>
                    <span className="message-icon">{isError ? '⚠️' : '✅'}</span>
                    <span className="message-text">{message}</span>
                    <button className="message-close" onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* بطاقة الإحصائيات */}
            {isAuthReady && safeDefinitions.length > 0 && (
                <div className="stats-card">
                    <div className="stats-header">
                        <div className="stats-title">
                            <span className="stats-icon">📊</span>
                            <h4>{t('habits.todayStats')}</h4>
                        </div>
                        <div className="stats-badge">
                            <span className="completion-rate">{completionPercentage}%</span>
                        </div>
                    </div>
                    <div className="stats-content">
                        <p className="stats-text">
                            <span className="stats-highlight">{completedToday}</span> {t('habits.of')} 
                            <span className="stats-highlight">{safeDefinitions.length}</span> {t('habits.completed')}
                        </p>
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* إضافة عادة جديدة */}
            <div className="habit-form-card">
                <div className="card-header">
                    <h3>
                        <span className="card-icon">➕</span>
                        {t('habits.newHabit')}
                    </h3>
                    <button 
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="scan-btn"
                        title={t('habits.scanBarcode')}
                    >
                        📷 {t('habits.scanBarcode')}
                    </button>
                </div>
                
                <form onSubmit={handleAddDefinition} className="habit-form">
                    <div className="form-group">
                        <label htmlFor="newHabitName">
                            <span className="label-icon">📝</span>
                            {t('habits.habitName')}:
                        </label>
                        <input
                            type="text"
                            id="newHabitName"
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder={t('habits.namePlaceholder')}
                            required
                            disabled={!isAuthReady || loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="newHabitDescription">
                            <span className="label-icon">📋</span>
                            {t('habits.habitDescription')}:
                        </label>
                        <textarea
                            id="newHabitDescription"
                            value={newHabitDescription}
                            onChange={(e) => setNewHabitDescription(e.target.value)}
                            placeholder={t('habits.descriptionPlaceholder')}
                            required
                            rows="3"
                            disabled={!isAuthReady || loading}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !isAuthReady}
                        className="submit-btn"
                    >
                        {loading ? (
                            <>
                                <span className="spinner-small"></span>
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <span>➕</span>
                                {t('habits.addHabit')}
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal">
                    <div className="scanner-modal-content">
                        <div className="scanner-header">
                            <h3>📷 {t('habits.scanBarcode')}</h3>
                            <button onClick={() => setShowScanner(false)} className="close-btn">✕</button>
                        </div>
                        <BarcodeScanner onScan={handleProductFound} />
                        <div className="scanner-footer">
                            <p>{t('habits.scanInstructions')}</p>
                            <button onClick={() => setShowScanner(false)} className="cancel-btn">
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* قائمة العادات */}
            <div className="habits-list-card">
                <div className="card-header">
                    <h3>
                        <span className="card-icon">📝</span>
                        {t('habits.todayTracking')}
                    </h3>
                    {safeDefinitions.length > 0 && (
                        <div className="habits-count">
                            <span className="count-number">{safeDefinitions.length}</span>
                            <span className="count-label">{t('habits.habits')}</span>
                        </div>
                    )}
                </div>
                
                {loading && isAuthReady && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                )}
                
                {isAuthReady && safeDefinitions.length === 0 && !loading ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h4>{t('habits.noHabits')}</h4>
                        <p>{t('habits.addFirstHabit')}</p>
                        <button onClick={() => setShowScanner(true)} className="empty-scan-btn">
                            📷 {t('habits.scanBarcode')}
                        </button>
                    </div>
                ) : (
                    <ul className="habit-list">
                        {safeDefinitions.map((habit) => {
                            const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === habit.id);
                            const isCompleted = todayLog?.is_completed || false;
                            const points = calculatePoints(habit.name, isCompleted);
                            
                            return (
                                <li key={habit.id} className={`habit-item ${isCompleted ? 'completed' : ''}`}>
                                    <div className="habit-info">
                                        <div className="habit-main">
                                            <span className="habit-name">{habit.name}</span>
                                            {isCompleted && <span className="completed-badge">✅ +{points}</span>}
                                        </div>
                                        {habit.description && <p className="habit-description">{habit.description}</p>}
                                    </div>
                                    <button 
                                        onClick={() => handleToggleLog(habit.id)}
                                        disabled={loading || !isAuthReady}
                                        className={`habit-btn ${isCompleted ? 'btn-undo' : 'btn-complete'}`}
                                    >
                                        {isCompleted ? (
                                            <><span>↩️</span>{t('habits.undo')}</>
                                        ) : (
                                            <><span>✅</span>{t('habits.complete')}</>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* تحليلات العادات */}
            <div className="analytics-wrapper">
                <HabitAnalytics refreshTrigger={refreshAnalytics} />
            </div>

            <style jsx>{`
                .habit-tracker-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 24px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                /* رأس الصفحة */
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .page-header h2 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.6rem;
                    color: var(--text-primary);
                }

                .header-icon {
                    font-size: 2rem;
                }

                .header-date {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    background: var(--bg-secondary);
                    padding: 6px 12px;
                    border-radius: 40px;
                }

                /* بطاقة النقاط */
                .points-card {
                    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                    color: white;
                }

                .points-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .points-icon {
                    font-size: 1.5rem;
                }

                .points-title {
                    font-weight: bold;
                    font-size: 1rem;
                }

                .points-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    text-align: center;
                }

                .points-stat {
                    background: rgba(255,255,255,0.2);
                    border-radius: 16px;
                    padding: 12px;
                }

                .points-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }

                .points-label {
                    font-size: 0.7rem;
                    opacity: 0.9;
                }

                /* الرسائل */
                .message {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }

                .message.success {
                    background: var(--success-bg);
                    color: var(--success-color);
                    border: 1px solid var(--success-color);
                }

                .message.error {
                    background: var(--error-bg);
                    color: var(--error-color);
                    border: 1px solid var(--error-color);
                }

                .message-icon {
                    font-size: 1.1rem;
                }

                .message-text {
                    flex: 1;
                }

                .message-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    color: inherit;
                }

                /* بطاقة الإحصائيات */
                .stats-card {
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                    color: white;
                }

                .stats-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .stats-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .stats-icon {
                    font-size: 1.2rem;
                }

                .stats-header h4 {
                    margin: 0;
                }

                .stats-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 4px 12px;
                    border-radius: 40px;
                }

                .completion-rate {
                    font-weight: bold;
                }

                .stats-text {
                    margin-bottom: 12px;
                }

                .stats-highlight {
                    font-size: 1.2rem;
                    font-weight: bold;
                }

                .progress-container {
                    width: 100%;
                }

                .progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: white;
                    border-radius: 4px;
                    transition: width 0.3s;
                }

                /* بطاقات العادات */
                .habit-form-card,
                .habits-list-card {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .card-header h3 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }

                .card-icon {
                    font-size: 1.2rem;
                }

                .scan-btn {
                    padding: 8px 16px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                }

                .habits-count {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: var(--bg-primary);
                    padding: 4px 12px;
                    border-radius: 40px;
                }

                .count-number {
                    font-weight: bold;
                    color: var(--primary-color);
                }

                /* النموذج */
                .habit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .form-group input,
                .form-group textarea {
                    padding: 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }

                .submit-btn {
                    padding: 12px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-weight: 600;
                }

                /* قائمة العادات */
                .habit-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .habit-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid var(--border-color);
                    gap: 12px;
                }

                .habit-item.completed {
                    background: var(--success-bg);
                    border-radius: 12px;
                }

                .habit-info {
                    flex: 1;
                }

                .habit-main {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .habit-name {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .completed-badge {
                    font-size: 0.7rem;
                    background: var(--success-color);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 20px;
                }

                .habit-description {
                    margin: 4px 0 0;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .habit-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    white-space: nowrap;
                }

                .btn-complete {
                    background: var(--success-color);
                    color: white;
                }

                .btn-undo {
                    background: var(--warning-color);
                    color: white;
                }

                /* ماسح الباركود */
                .scanner-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .scanner-modal-content {
                    background: var(--bg-primary);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 20px;
                }

                .scanner-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                }

                .scanner-footer {
                    margin-top: 16px;
                    text-align: center;
                }

                .cancel-btn {
                    margin-top: 12px;
                    padding: 8px 20px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 40px;
                    cursor: pointer;
                }

                /* حالات فارغة */
                .empty-state {
                    text-align: center;
                    padding: 40px;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }

                .empty-state h4 {
                    margin: 0 0 8px;
                    color: var(--text-primary);
                }

                .empty-state p {
                    margin: 0 0 16px;
                    color: var(--text-secondary);
                }

                .empty-scan-btn {
                    padding: 8px 20px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                }

                .loading-state {
                    text-align: center;
                    padding: 40px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 12px;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .analytics-wrapper {
                    margin-top: 20px;
                }

                /* الثيم المظلم */
                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #8b5cf6;
                    --success-color: #10b981;
                    --success-bg: rgba(16, 185, 129, 0.2);
                    --error-color: #ef4444;
                    --error-bg: rgba(239, 68, 68, 0.2);
                    --warning-color: #f59e0b;
                }

                /* استجابة */
                @media (max-width: 768px) {
                    .habit-tracker-container {
                        padding: 16px;
                    }
                    
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .habit-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .habit-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .points-stats {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                }
            `}</style>
        </div>
    );
}

export default HabitTracker;