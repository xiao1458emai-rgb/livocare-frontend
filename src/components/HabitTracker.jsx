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

// src/components/HabitTracker.jsx

// ✅ تعديل دالة fetchHabitDefinitions
const fetchHabitDefinitions = useCallback(async () => {
    if (!isAuthReady || isFetchingRef.current || !isMountedRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
        const [defResponse, logsResponse, todayResponse] = await Promise.all([
            axiosInstance.get('/habit-definitions/'),
            axiosInstance.get('/habit-logs/'),
            axiosInstance.get('/habit-logs/today/')
        ]);
        
        if (!isMountedRef.current) return;
        
        // ✅ معالجة تعريفات العادات
        let definitionsData = [];
        if (defResponse.data?.results) {
            definitionsData = defResponse.data.results;
        } else if (Array.isArray(defResponse.data)) {
            definitionsData = defResponse.data;
        } else {
            definitionsData = [];
        }
        
        // ✅ معالجة سجلات العادات
        let logsData = [];
        if (logsResponse.data?.results) {
            logsData = logsResponse.data.results;
        } else if (Array.isArray(logsResponse.data)) {
            logsData = logsResponse.data;
        } else {
            logsData = [];
        }
        
        // ✅ معالجة سجلات اليوم
        let todayData = [];
        if (todayResponse.data?.results) {
            todayData = todayResponse.data.results;
        } else if (Array.isArray(todayResponse.data)) {
            todayData = todayResponse.data;
        } else {
            todayData = [];
        }
        
        console.log('💊 Habit definitions loaded:', definitionsData.length);
        console.log('📝 Habit logs loaded:', logsData.length);
        console.log('📅 Today logs loaded:', todayData.length);
        
        setDefinitions(definitionsData);
        setLogs(logsData);
        setTodayLogs(todayData);
        
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

// src/components/HabitTracker.jsx - استبدل دالة searchDrugInFDA بهذه

const searchDrugInFDA = async (query, searchType = 'name') => {
    if (!query || query.trim() === '') {
        setMessage('⚠️ الرجاء إدخال اسم الدواء أو رمز NDC');
        setIsError(true);
        setTimeout(() => setMessage(''), 3000);
        return;
    }
    
    setSearchingDrug(true);
    setDrugSearchResults([]);
    
    try {
        let endpoint = '';
        let searchParam = '';
        
        if (searchType === 'name') {
            // ✅ استخدام drugsfda.json للبحث بالاسم التجاري أو العلمي
            endpoint = 'drug/drugsfda.json';
            // البحث بالاسم التجاري أو العلمي
            searchParam = `search=openfda.brand_name:"${encodeURIComponent(query)}"+or+openfda.generic_name:"${encodeURIComponent(query)}"&limit=10`;
        } else if (searchType === 'ndc') {
            endpoint = 'drug/ndc.json';
            let cleanNDC = query.replace(/-/g, '');
            if (cleanNDC.length === 10 && !cleanNDC.includes('-')) {
                searchParam = `search=product_ndc:"${cleanNDC.slice(0,2)}-${cleanNDC.slice(2,5)}-${cleanNDC.slice(5)}"&limit=5`;
            } else {
                searchParam = `search=product_ndc:"${cleanNDC}"&limit=5`;
            }
        }
        
        console.log(`🔍 Searching FDA: ${endpoint}?${searchParam}`);
        
        const response = await axios.get(
            `https://api.fda.gov/${endpoint}?${searchParam}`,
            { timeout: 15000 }
        );
        
        console.log('📡 FDA Response:', response.data);
        
        if (response.data && response.data.results && response.data.results.length > 0) {
            const results = response.data.results.map(drug => {
                const openfda = drug.openfda || {};
                const products = drug.products || [];
                return {
                    brand_name: openfda.brand_name?.[0] || '',
                    generic_name: openfda.generic_name?.[0] || '',
                    manufacturer: openfda.manufacturer_name?.[0] || products[0]?.manufacturer_name || '',
                    route: products[0]?.route || '',
                    dosage_form: products[0]?.dosage_form || '',
                    product_ndc: openfda.product_ndc?.[0] || '',
                    id: drug.id,
                    substance_name: openfda.substance_name?.[0] || ''
                };
            }).filter(d => d.brand_name || d.generic_name);
            
            // إزالة التكرارات
            const uniqueResults = [];
            const seen = new Set();
            for (const drug of results) {
                const key = drug.brand_name || drug.generic_name;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    uniqueResults.push(drug);
                }
            }
            
            setDrugSearchResults(uniqueResults.slice(0, 10));
            setMessage(`✅ تم العثور على ${uniqueResults.length} دواء`);
            setIsError(false);
        } else {
            setDrugSearchResults([]);
            setMessage(`⚠️ لم يتم العثور على دواء: ${query}`);
            setIsError(true);
        }
    } catch (error) {
        console.error('Error searching FDA:', error);
        setMessage(`❌ خطأ في الاتصال بـ FDA: ${error.message}`);
        setIsError(true);
    } finally {
        setSearchingDrug(false);
        setTimeout(() => setMessage(''), 3000);
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
        if (drug.indications) descriptionParts.push(`📋 الاستخدامات: ${drug.indications.substring(0, 100)}`);
        
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
                let cleanBarcode = barcode.replace(/-/g, '');
                
                if (cleanBarcode.length === 13) {
                    cleanBarcode = cleanBarcode.slice(0, 10);
                }
                
                if (cleanBarcode.length === 10 || cleanBarcode.length === 11) {
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
                        placeholder="أدخل اسم الدواء (مثل: Acetaminophen, Tylenol) أو رمز NDC"
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
                                    {drug.product_ndc && <span>🔢 {drug.product_ndc}</span>}
                                </div>
                                {drug.warnings && (
                                    <div className="drug-warnings">
                                        ⚠️ {drug.warnings.substring(0, 100)}...
                                    </div>
                                )}
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
/* HabitTracker.css - متوافق مع ThemeManager */

.habit-tracker-container {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
    transition: background var(--transition-medium);
}

/* ===== رأس الصفحة ===== */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.page-header h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.6rem;
    color: var(--text-primary);
}

.header-icon {
    font-size: 2rem;
}

.header-date {
    color: var(--text-secondary);
    font-size: 0.9rem;
    background: var(--secondary-bg);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
}

/* ===== قسم البحث عن الأدوية ===== */
.drug-search-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
}

.drug-search-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.drug-search-icon {
    font-size: 1.5rem;
}

.drug-search-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
}

.drug-search-row {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.drug-search-input {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    transition: all var(--transition-fast);
}

.drug-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.drug-search-buttons {
    display: flex;
    gap: var(--spacing-sm);
}

.drug-search-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.drug-search-btn.name-search {
    background: var(--primary);
    color: white;
}

.drug-search-btn.ndc-search {
    background: var(--secondary-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}

.drug-search-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.drug-search-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ===== نتائج البحث ===== */
.drug-search-results {
    margin-top: var(--spacing-md);
    border-top: 1px solid var(--border-light);
    padding-top: var(--spacing-md);
}

.results-header {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
}

.drug-result-item {
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    border: 1px solid var(--border-light);
}

.drug-result-item:hover {
    background: var(--hover-bg);
    transform: translateX(5px);
    border-color: var(--primary);
}

[dir="rtl"] .drug-result-item:hover {
    transform: translateX(-5px);
}

.drug-result-name {
    margin-bottom: var(--spacing-xs);
}

.drug-result-name strong {
    color: var(--text-primary);
}

.drug-generic {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin-right: var(--spacing-sm);
}

.drug-result-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.drug-warnings {
    margin-top: var(--spacing-xs);
    font-size: 0.7rem;
    color: var(--warning);
}

/* ===== بطاقة النقاط ===== */
.points-card {
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
}

.points-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.points-icon {
    font-size: 1.5rem;
}

.points-title {
    font-weight: 700;
    font-size: 1rem;
}

.points-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    text-align: center;
}

.points-stat {
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm);
    backdrop-filter: blur(5px);
}

.points-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.points-label {
    font-size: 0.7rem;
    opacity: 0.9;
}

/* ===== الرسائل ===== */
.message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
    animation: slideIn 0.3s ease;
}

.message.success {
    background: var(--success-bg);
    color: var(--success);
    border: 1px solid var(--success-border);
}

.message.error {
    background: var(--error-bg);
    color: var(--error);
    border: 1px solid var(--error-border);
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
    opacity: 0.7;
    transition: opacity var(--transition-fast);
}

.message-close:hover {
    opacity: 1;
}

/* ===== بطاقة الإحصائيات ===== */
.stats-card {
    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
}

.stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
}

.stats-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.stats-icon {
    font-size: 1.2rem;
}

.stats-header h4 {
    margin: 0;
}

.stats-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
}

.completion-rate {
    font-weight: 700;
}

.stats-text {
    margin-bottom: var(--spacing-sm);
}

.stats-highlight {
    font-size: 1.2rem;
    font-weight: 700;
}

.progress-container {
    width: 100%;
}

.progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: white;
    border-radius: var(--radius-full);
    transition: width var(--transition-medium);
}

/* ===== بطاقات العادات ===== */
.habit-form-card,
.habits-list-card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.card-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.1rem;
    color: var(--text-primary);
}

.card-icon {
    font-size: 1.2rem;
}

.scan-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.85rem;
    transition: all var(--transition-medium);
}

.scan-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.habits-count {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--secondary-bg);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
}

.count-number {
    font-weight: 700;
    color: var(--primary);
}

.count-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
}

/* ===== النموذج ===== */
.habit-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.form-group label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 500;
    color: var(--text-primary);
}

.label-icon {
    font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
    padding: var(--spacing-sm);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    transition: all var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.submit-btn {
    padding: var(--spacing-sm);
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-weight: 600;
    transition: all var(--transition-medium);
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ===== قائمة العادات ===== */
.habit-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.habit-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--border-light);
    gap: var(--spacing-sm);
    transition: all var(--transition-fast);
}

.habit-item:last-child {
    border-bottom: none;
}

.habit-item.completed {
    background: var(--success-bg);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-xs);
}

.habit-info {
    flex: 1;
}

.habit-main {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.habit-name {
    font-weight: 600;
    color: var(--text-primary);
}

.completed-badge {
    font-size: 0.7rem;
    background: var(--success);
    color: white;
    padding: 2px 8px;
    border-radius: var(--radius-full);
}

.habit-description {
    margin: var(--spacing-xs) 0 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.habit-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.85rem;
    white-space: nowrap;
    transition: all var(--transition-fast);
}

.habit-btn:hover:not(:disabled) {
    transform: scale(1.05);
}

.habit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-complete {
    background: var(--success);
    color: white;
}

.btn-undo {
    background: var(--warning);
    color: white;
}

/* ===== ماسح الباركود ===== */
.scanner-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
}

.scanner-modal-content {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    padding: var(--spacing-lg);
}

.scanner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-light);
}

.scanner-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
}

.close-btn:hover {
    color: var(--error);
}

.scanner-footer {
    margin-top: var(--spacing-md);
    text-align: center;
}

.scanner-footer p {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-bottom: var(--spacing-sm);
}

.cancel-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--secondary-bg);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-full);
    cursor: pointer;
    color: var(--text-primary);
    transition: all var(--transition-fast);
}

.cancel-btn:hover {
    background: var(--error-bg);
    color: var(--error);
    border-color: var(--error);
}

/* ===== حالات فارغة ===== */
.empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
}

.empty-state h4 {
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
}

.empty-state p {
    margin: 0 0 var(--spacing-md);
    color: var(--text-secondary);
}

.empty-scan-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-medium);
}

.empty-scan-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.loading-state {
    text-align: center;
    padding: var(--spacing-2xl);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-sm);
}

.spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
}

/* ===== تحليلات ===== */
.analytics-wrapper {
    margin-top: var(--spacing-lg);
}

/* ===== أنيميشن ===== */
@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

[dir="rtl"] @keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .habit-tracker-container {
        padding: var(--spacing-md);
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
        gap: var(--spacing-sm);
    }
    
    .drug-search-row {
        flex-direction: column;
    }
    
    .drug-search-buttons {
        width: 100%;
    }
    
    .drug-search-btn {
        flex: 1;
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .card-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .scan-btn {
        width: 100%;
        justify-content: center;
    }
    
    .habit-main {
        flex-direction: column;
        align-items: flex-start;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .drug-result-item:hover {
    transform: translateX(-5px);
}

[dir="rtl"] .message {
    flex-direction: row-reverse;
}

[dir="rtl"] .card-header {
    flex-direction: row-reverse;
}

@media (max-width: 480px) {
    [dir="rtl"] .card-header {
        flex-direction: column;
        align-items: flex-end;
    }
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .habit-item,
    .habit-btn,
    .submit-btn,
    .scan-btn {
        transition: none !important;
    }
    
    .spinner,
    .spinner-small {
        animation: none !important;
    }
    
    .message,
    .scanner-modal {
        animation: none !important;
    }
}
            `}</style>
        </div>
    );
}

export default HabitTracker;