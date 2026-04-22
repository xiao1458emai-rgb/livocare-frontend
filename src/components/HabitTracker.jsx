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
    const [showScanner, setShowScanner] = useState(false);
    const [userPoints, setUserPoints] = useState(0);
    const [weeklyPoints, setWeeklyPoints] = useState(0);
    const [streakDays, setStreakDays] = useState(0);
    const [todayLogs, setTodayLogs] = useState([]);
    
    // State للبحث عن الأدوية
    const [drugSearchQuery, setDrugSearchQuery] = useState('');
    const [drugSearchResults, setDrugSearchResults] = useState([]);
    const [searchingDrug, setSearchingDrug] = useState(false);

    // جلب تعريفات العادات
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
            
            let definitionsData = [];
            if (defResponse.data?.results) {
                definitionsData = defResponse.data.results;
            } else if (Array.isArray(defResponse.data)) {
                definitionsData = defResponse.data;
            }
            
            let logsData = [];
            if (logsResponse.data?.results) {
                logsData = logsResponse.data.results;
            } else if (Array.isArray(logsResponse.data)) {
                logsData = logsResponse.data;
            }
            
            let todayData = [];
            if (todayResponse.data?.results) {
                todayData = todayResponse.data.results;
            } else if (Array.isArray(todayResponse.data)) {
                todayData = todayResponse.data;
            }
            
            console.log('💊 Habit definitions loaded:', definitionsData.length);
            
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
        }
    }, [isAuthReady, fetchHabitDefinitions]);

    // حساب النقاط والسلسلة المتتالية
    useEffect(() => {
        if (logs.length === 0) return;
        
        const todayPoints = todayLogs.reduce((sum, log) => {
            if (log.is_completed) {
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
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
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
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

    // البحث في FDA
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
                endpoint = 'drug/drugsfda.json';
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

    // اختيار دواء من نتائج البحث
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

    // معالجة الباركود
    const handleProductFound = async (result) => {
        console.log('📦 Barcode result:', result);
        
        if (typeof result === 'string' && result.length > 0) {
            const barcode = result;
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
                        setNewHabitDescription(`🔢 الرمز: ${barcode}\n⚠️ لم يتم العثور على هذا الرمز في قاعدة بيانات FDA.`);
                        setMessage(`⚠️ الرمز ${barcode} غير موجود`);
                        setIsError(true);
                    }
                } else {
                    setNewHabitName(`دواء جديد (${barcode.slice(-8)})`);
                    setNewHabitDescription(`🔢 الرمز: ${barcode}\n⚠️ هذا الرمز ليس بتنسيق NDC صالح.`);
                    setMessage(`⚠️ الرمز ${barcode} ليس بتنسيق NDC صالح`);
                    setIsError(true);
                }
            } catch (error) {
                console.error('Error searching FDA:', error);
                setNewHabitName(`دواء جديد (${barcode.slice(-8)})`);
                setNewHabitDescription(`🔢 الرمز: ${barcode}\n❌ خطأ في الاتصال بقاعدة البيانات.`);
                setMessage('⚠️ حدث خطأ في البحث');
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
            console.error('Failed to add habit:', error);
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
            console.error('Failed to update habit log:', error);
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
        <div className="analytics-container">
            {/* ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal" onClick={() => setShowScanner(false)}>
                    <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="scanner-header">
                            <h3>{t('habits.scanBarcode')}</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}>✕</button>
                        </div>
                        <BarcodeScanner onScan={handleProductFound} onClose={() => setShowScanner(false)} />
                        <div className="scanner-footer">
                            <p>{t('habits.scanInstructions')}</p>
                            <button className="cancel-btn" onClick={() => setShowScanner(false)}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* رأس الصفحة */}
            <div className="analytics-header">
                <h2>
                    <span>💊</span>
                    {t('habits.title')}
                </h2>
                <div className="stat-label">
                    {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* قسم البحث عن الأدوية في FDA */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">💊</span>
                    <span className="rec-category">البحث عن دواء في قاعدة بيانات FDA</span>
                </div>
                <div className="filter-row" style={{ marginBottom: 0 }}>
                    <input
                        type="text"
                        value={drugSearchQuery}
                        onChange={(e) => setDrugSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchDrugInFDA(drugSearchQuery, 'name')}
                        placeholder="أدخل اسم الدواء (مثل: Acetaminophen, Tylenol) أو رمز NDC"
                        className="search-input"
                    />
                    <div className="type-filters" style={{ marginBottom: 0 }}>
                        <button 
                            onClick={() => searchDrugInFDA(drugSearchQuery, 'name')}
                            disabled={searchingDrug || !drugSearchQuery}
                            className="type-btn"
                        >
                            {searchingDrug ? '⏳' : '🔍'} اسم
                        </button>
                        <button 
                            onClick={() => searchDrugInFDA(drugSearchQuery, 'ndc')}
                            disabled={searchingDrug || !drugSearchQuery}
                            className="type-btn"
                        >
                            {searchingDrug ? '⏳' : '#️⃣'} رمز NDC
                        </button>
                    </div>
                </div>
                
                {/* نتائج البحث عن الأدوية */}
                {drugSearchResults.length > 0 && (
                    <div className="notifications-list" style={{ marginTop: 'var(--spacing-md)' }}>
                        <div className="stat-label" style={{ marginBottom: 'var(--spacing-sm)' }}>
                            📋 نتائج البحث ({drugSearchResults.length})
                        </div>
                        {drugSearchResults.map((drug, idx) => (
                            <div key={idx} className="notification-card" onClick={() => selectDrug(drug)} style={{ cursor: 'pointer' }}>
                                <div className="notification-title">
                                    <strong>{drug.brand_name || drug.generic_name}</strong>
                                    {drug.generic_name && drug.brand_name && (
                                        <span className="rec-type tip">({drug.generic_name})</span>
                                    )}
                                </div>
                                <div className="notification-meta">
                                    {drug.manufacturer && <span>🏭 {drug.manufacturer}</span>}
                                    {drug.route && <span>💉 {drug.route}</span>}
                                    {drug.dosage_form && <span>📦 {drug.dosage_form}</span>}
                                    {drug.product_ndc && <span>🔢 {drug.product_ndc}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* نقاط المستخدم */}
            {(userPoints > 0 || weeklyPoints > 0 || streakDays > 0) && (
                <div className="insight-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', color: 'white' }}>
                    <div className="insight-icon">🏆</div>
                    <div className="insight-content">
                        <h3 style={{ color: 'white' }}>{t('habits.points.title', 'نقاطك')}</h3>
                        <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ color: 'white' }}>{userPoints}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('habits.points.today', 'نقاط اليوم')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ color: 'white' }}>{weeklyPoints}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('habits.points.week', 'نقاط الأسبوع')}</div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>
                                <div className="stat-content">
                                    <div className="stat-value" style={{ color: 'white' }}>{streakDays}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('habits.points.streak', 'أيام متتالية')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* رسائل الإشعارات */}
            {message && (
                <div className={`notification-message ${isError ? 'error' : 'success'}`}>
                    <span>{isError ? '⚠️' : '✅'}</span>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* بطاقة الإحصائيات */}
            {isAuthReady && safeDefinitions.length > 0 && (
                <div className="insight-card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', color: 'white' }}>
                    <div className="insight-icon">📊</div>
                    <div className="insight-content">
                        <h3 style={{ color: 'white' }}>{t('habits.todayStats')}</h3>
                        <div className="stat-value" style={{ fontSize: '1.5rem', color: 'white' }}>
                            {completedToday}/{safeDefinitions.length} {t('habits.completed')}
                        </div>
                        <div className="progress-bar" style={{ marginTop: 'var(--spacing-sm)' }}>
                            <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* إضافة عادة جديدة */}
            <div className="recommendations-section">
                <div className="rec-header">
                    <span className="rec-icon">➕</span>
                    <span className="rec-category">{t('habits.newHabit')}</span>
                </div>
                
                <form onSubmit={handleAddDefinition}>
                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label className="stat-label">{t('habits.habitName')}:</label>
                        <input
                            type="text"
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder={t('habits.namePlaceholder')}
                            required
                            disabled={!isAuthReady || loading}
                            className="search-input"
                        />
                    </div>
                    
                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label className="stat-label">{t('habits.habitDescription')}:</label>
                        <textarea
                            value={newHabitDescription}
                            onChange={(e) => setNewHabitDescription(e.target.value)}
                            placeholder={t('habits.descriptionPlaceholder')}
                            required
                            rows="3"
                            disabled={!isAuthReady || loading}
                            className="search-input"
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || !isAuthReady}
                        className="type-btn active"
                        style={{ width: '100%' }}
                    >
                        {loading ? '⏳ ' + t('common.saving') : '➕ ' + t('habits.addHabit')}
                    </button>
                </form>
            </div>

            {/* قائمة العادات */}
            <div className="recommendations-section">
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <div className="rec-header">
                        <span className="rec-icon">📝</span>
                        <span className="rec-category">{t('habits.todayTracking')}</span>
                    </div>
                    {safeDefinitions.length > 0 && (
                        <div className="stat-label">
                            <span className="stat-value" style={{ fontSize: '1rem' }}>{safeDefinitions.length}</span> {t('habits.habits')}
                        </div>
                    )}
                </div>
                
                {loading && isAuthReady && (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                )}
                
                {isAuthReady && safeDefinitions.length === 0 && !loading ? (
                    <div className="analytics-empty">
                        <div className="empty-icon">📋</div>
                        <h4>{t('habits.noHabits')}</h4>
                        <p>{t('habits.addFirstHabit')}</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {safeDefinitions.map((habit) => {
                            const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === habit.id);
                            const isCompleted = todayLog?.is_completed || false;
                            const points = calculatePoints(habit.name, isCompleted);
                            
                            return (
                                <div key={habit.id} className={`notification-card ${isCompleted ? 'unread' : ''}`}>
                                    <div className="notification-header">
                                        <div className="notification-title">
                                            <span>{habit.name}</span>
                                            {isCompleted && <span className="priority-badge priority-urgent">✅ +{points}</span>}
                                        </div>
                                        <div className="notification-actions">
                                            <button 
                                                onClick={() => handleToggleLog(habit.id)}
                                                disabled={loading || !isAuthReady}
                                                className={`notification-action-btn ${isCompleted ? '' : 'active'}`}
                                            >
                                                {isCompleted ? '↩️ ' + t('habits.undo') : '✅ ' + t('habits.complete')}
                                            </button>
                                        </div>
                                    </div>
                                    {habit.description && (
                                        <div className="notification-content">
                                            {habit.description}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* تحليلات العادات */}
            <div className="analytics-wrapper" style={{ marginTop: 'var(--spacing-lg)' }}>
                <HabitAnalytics refreshTrigger={refreshAnalytics} />
            </div>

            {/* الأنماط الإضافية */}
            <style>{`
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

                .notification-message {
                    position: fixed;
                    bottom: var(--spacing-lg);
                    right: var(--spacing-lg);
                    padding: var(--spacing-md) var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    animation: slideIn 0.3s ease;
                    z-index: 1000;
                    box-shadow: var(--shadow-lg);
                }

                .notification-message.success {
                    background: var(--success);
                    color: white;
                }

                .notification-message.error {
                    background: var(--error);
                    color: white;
                }

                .notification-message button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1.2rem;
                }

                [dir="rtl"] .notification-message {
                    right: auto;
                    left: var(--spacing-lg);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                [dir="rtl"] @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @media (max-width: 768px) {
                    .notification-message {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
                        bottom: var(--spacing-md);
                    }
                    
                    [dir="rtl"] .notification-message {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .scanner-modal,
                    .notification-message {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default HabitTracker;