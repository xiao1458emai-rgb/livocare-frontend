'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import axiosInstance from '../services/api';
import HabitAnalytics from './Analytics/HabitAnalytics';
import BarcodeScanner from '../components/Camera/BarcodeScanner';
import '../index.css';

// ==================== دوال مساعدة ====================

const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// ✅ حساب النقاط للعادات فقط (بدون أدوية)
const calculatePoints = (habitName, isCompleted, habitType) => {
    if (!isCompleted) return 0;
    if (habitType === 'medication') return 0;
    
    const pointsMap = {
        'sleep': 15,
        'water': 10,
        'exercise': 20,
        'reading': 10,
        'meditation': 15,
        'walk': 15,
        'healthy_meal': 10,
        'study': 10,
        'work': 10
    };
    
    for (const [key, points] of Object.entries(pointsMap)) {
        if (habitName.toLowerCase().includes(key)) {
            return points;
        }
    }
    return 5;
};

// ✅ تحديد نوع العادة
const detectHabitType = (habitName, habitDescription = '') => {
    const text = (habitName + ' ' + habitDescription).toLowerCase();
    
    const medicationKeywords = ['دواء', 'medication', 'حبة', 'pill', 'علاج', 'treatment', 'antibiotic', 'مضاد حيوي'];
    const waterKeywords = ['ماء', 'water', 'ترطيب', 'hydration', 'شرب'];
    const exerciseKeywords = ['رياضة', 'exercise', 'مشي', 'walk', 'جري', 'run', 'تمرين', 'workout'];
    const sleepKeywords = ['نوم', 'sleep', 'استرخاء', 'relax', 'استيقاظ'];
    const healthyKeywords = ['أكل صحي', 'healthy meal', 'خضروات', 'vegetables', 'فواكه', 'fruits'];
    
    if (medicationKeywords.some(k => text.includes(k))) return 'medication';
    if (waterKeywords.some(k => text.includes(k))) return 'water';
    if (exerciseKeywords.some(k => text.includes(k))) return 'exercise';
    if (sleepKeywords.some(k => text.includes(k))) return 'sleep';
    if (healthyKeywords.some(k => text.includes(k))) return 'healthy';
    return 'habit';
};

// ✅ الحصول على أيقونة ونوع العادة
const getHabitIcon = (habitType) => {
    switch (habitType) {
        case 'medication': return '💊';
        case 'water': return '💧';
        case 'exercise': return '🏃';
        case 'sleep': return '😴';
        case 'healthy': return '🥗';
        default: return '✅';
    }
};

function HabitTracker({ isAuthReady, isArabic: propIsArabic }) {
    // ✅ استخدام isArabic من props مع إمكانية التحديث عبر الحدث
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    
    // حالات البيانات
    const [definitions, setDefinitions] = useState([]);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDescription, setNewHabitDescription] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [showScanner, setShowScanner] = useState(false);
    const [userPoints, setUserPoints] = useState(0);
    const [weeklyPoints, setWeeklyPoints] = useState(0);
    const [streakDays, setStreakDays] = useState(0);
    const [todayLogs, setTodayLogs] = useState([]);
    
    // ✅ حالة البحث عن الأدوية (منفصل)
    const [drugSearchQuery, setDrugSearchQuery] = useState('');
    const [drugSearchResults, setDrugSearchResults] = useState([]);
    const [searchingDrug, setSearchingDrug] = useState(false);
    const [searchType, setSearchType] = useState('name');

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

    // ✅ عرض رسالة مؤقتة
    const showMessage = useCallback((msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) {
                setMessage('');
            }
        }, 3000);
    }, []);

    // ✅ جلب تعريفات العادات
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
            if (defResponse.data?.results) definitionsData = defResponse.data.results;
            else if (Array.isArray(defResponse.data)) definitionsData = defResponse.data;
            
            let logsData = [];
            if (logsResponse.data?.results) logsData = logsResponse.data.results;
            else if (Array.isArray(logsResponse.data)) logsData = logsResponse.data;
            
            let todayData = [];
            if (todayResponse.data?.results) todayData = todayResponse.data.results;
            else if (Array.isArray(todayResponse.data)) todayData = todayResponse.data;
            
            console.log('📋 Habits loaded:', definitionsData.length);
            
            setDefinitions(definitionsData);
            setLogs(logsData);
            setTodayLogs(todayData);
            
        } catch (error) {
            console.error('Failed to fetch habits:', error);
            if (isMountedRef.current) {
                showMessage(isArabic ? '❌ فشل في تحميل العادات' : '❌ Failed to load habits', 'error');
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
    }, [isAuthReady, isArabic, showMessage]);

    useEffect(() => {
        if (isAuthReady) {
            fetchHabitDefinitions();
        }
    }, [isAuthReady, fetchHabitDefinitions]);

    // ✅ حساب النقاط (للعادات فقط)
    useEffect(() => {
        if (logs.length === 0) return;
        
        const todayPoints = todayLogs.reduce((sum, log) => {
            if (log.is_completed) {
                const habit = definitions.find(d => d.id === (log.habit?.id || log.habit));
                if (habit) {
                    const habitType = detectHabitType(habit.name, habit.description);
                    return sum + calculatePoints(habit.name, true, habitType);
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
                    const habitType = detectHabitType(habit.name, habit.description);
                    return sum + calculatePoints(habit.name, true, habitType);
                }
            }
            return sum;
        }, 0);
        
        setUserPoints(todayPoints);
        setWeeklyPoints(weekPoints);
        
        // حساب الأيام المتتالية
        let streak = 0;
        const checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        while (true) {
            const dateStr = checkDate.toDateString();
            const hasLogOnDate = logs.some(log => {
                const logDate = new Date(log.log_date);
                logDate.setHours(0, 0, 0, 0);
                return logDate.toDateString() === dateStr && log.is_completed;
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

    // ✅ البحث في FDA للأدوية فقط
    const searchDrugInFDA = useCallback(async (query, type = 'name') => {
        if (!query || query.trim() === '') {
            showMessage(isArabic ? '⚠️ الرجاء إدخال اسم الدواء أو رمز NDC' : '⚠️ Please enter drug name or NDC code', 'error');
            return;
        }
        
        setSearchingDrug(true);
        setDrugSearchResults([]);
        
        try {
            let endpoint = '';
            let searchParam = '';
            
            if (type === 'name') {
                endpoint = 'drug/drugsfda.json';
                searchParam = `search=openfda.brand_name:"${encodeURIComponent(query)}"+or+openfda.generic_name:"${encodeURIComponent(query)}"&limit=10`;
            } else {
                endpoint = 'drug/ndc.json';
                let cleanNDC = query.replace(/-/g, '');
                if (cleanNDC.length === 10 && !cleanNDC.includes('-')) {
                    searchParam = `search=product_ndc:"${cleanNDC.slice(0,2)}-${cleanNDC.slice(2,5)}-${cleanNDC.slice(5)}"&limit=5`;
                } else {
                    searchParam = `search=product_ndc:"${cleanNDC}"&limit=5`;
                }
            }
            
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
                showMessage(isArabic ? `✅ تم العثور على ${uniqueResults.length} دواء` : `✅ Found ${uniqueResults.length} medications`, 'success');
            } else {
                setDrugSearchResults([]);
                showMessage(isArabic ? `⚠️ لم يتم العثور على دواء: ${query}` : `⚠️ No medication found: ${query}`, 'error');
            }
        } catch (error) {
            console.error('Error searching FDA:', error);
            showMessage(isArabic ? '❌ خطأ في الاتصال بقاعدة البيانات' : '❌ Error connecting to database', 'error');
        } finally {
            setSearchingDrug(false);
        }
    }, [isArabic, showMessage]);

    // ✅ اختيار دواء من نتائج البحث
    const selectDrug = useCallback((drug) => {
        setNewHabitName(drug.brand_name || drug.generic_name);
        
        const descriptionParts = [];
        if (drug.generic_name) descriptionParts.push(`💊 ${drug.generic_name}`);
        if (drug.manufacturer) descriptionParts.push(`🏭 ${drug.manufacturer}`);
        if (drug.route) descriptionParts.push(`💉 ${drug.route}`);
        if (drug.dosage_form) descriptionParts.push(`📦 ${drug.dosage_form}`);
        if (drug.product_ndc) descriptionParts.push(`🔢 ${drug.product_ndc}`);
        
        setNewHabitDescription(descriptionParts.join(' | '));
        showMessage(isArabic ? `✅ تم اختيار الدواء: ${drug.brand_name || drug.generic_name}` : `✅ Selected: ${drug.brand_name || drug.generic_name}`, 'success');
        setDrugSearchResults([]);
        setDrugSearchQuery('');
    }, [isArabic, showMessage]);

    // ✅ إضافة عادة جديدة
    const handleAddDefinition = useCallback(async (e) => {
        e.preventDefault();
        
        if (!isAuthReady) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return;
        }

        const existingHabit = definitions.find(d => 
            d.name.toLowerCase() === newHabitName.trim().toLowerCase()
        );
        
        if (existingHabit) {
            showMessage(isArabic ? `⚠️ العادة "${newHabitName}" موجودة مسبقاً` : `⚠️ Habit "${newHabitName}" already exists`, 'error');
            return;
        }

        if (!newHabitName.trim() || !newHabitDescription.trim()) {
            showMessage(isArabic ? '⚠️ الرجاء إدخال اسم ووصف العادة' : '⚠️ Please enter habit name and description', 'error');
            return;
        }

        setLoading(true);

        try {
            await axiosInstance.post('/habit-definitions/', { 
                name: newHabitName.trim(), 
                description: newHabitDescription.trim(),
                frequency: 'Daily'
            });
            
            showMessage(isArabic ? `✅ تم إضافة "${newHabitName}" بنجاح` : `✅ Successfully added "${newHabitName}"`, 'success');
            setNewHabitName('');
            setNewHabitDescription('');
            await fetchHabitDefinitions();
            setRefreshAnalytics(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to add habit:', error);
            showMessage(isArabic ? '❌ فشل في إضافة العادة' : '❌ Failed to add habit', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthReady, definitions, newHabitName, newHabitDescription, isArabic, showMessage, fetchHabitDefinitions]);

    // ✅ تبديل حالة العادة
    const handleToggleLog = useCallback(async (habitId) => {
        if (!isAuthReady) {
            showMessage(isArabic ? '⚠️ الرجاء تسجيل الدخول' : '⚠️ Please login', 'error');
            return;
        }
        
        const existingLog = todayLogs.find(log => (log.habit?.id || log.habit) === habitId);
        const habit = definitions.find(d => d.id === habitId);
        
        setLoading(true);

        try {
            if (existingLog && existingLog.id) {
                await axiosInstance.delete(`/habit-logs/${existingLog.id}/`);
                showMessage(isArabic ? `↩️ تم إلغاء إنجاز "${habit?.name}"` : `↩️ Undid "${habit?.name}"`, 'info');
            } else {
                await axiosInstance.post('/habit-logs/complete/', {
                    habit_id: habitId,
                    notes: ''
                });
                
                const habitType = detectHabitType(habit?.name || '', habit?.description || '');
                const points = calculatePoints(habit?.name || '', true, habitType);
                if (points > 0) {
                    showMessage(isArabic ? `✅ تم إنجاز "${habit?.name}" (+${points} نقطة)` : `✅ Completed "${habit?.name}" (+${points} points)`, 'success');
                } else {
                    showMessage(isArabic ? `✅ تم إنجاز "${habit?.name}"` : `✅ Completed "${habit?.name}"`, 'success');
                }
            }
            await fetchHabitDefinitions();
            setRefreshAnalytics(prev => prev + 1);
            
        } catch (error) {
            console.error('Failed to update habit log:', error);
            showMessage(isArabic ? '❌ فشل في تحديث العادة' : '❌ Failed to update habit', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthReady, todayLogs, definitions, isArabic, showMessage, fetchHabitDefinitions]);

    // ✅ مسح الباركود
    const handleScanComplete = useCallback((result) => {
        if (result) {
            searchDrugInFDA(result, 'ndc');
            setShowScanner(false);
        }
    }, [searchDrugInFDA]);

    // ✅ تصفية البيانات
    const safeDefinitions = Array.isArray(definitions) ? definitions : [];
    const medications = safeDefinitions.filter(h => detectHabitType(h.name, h.description) === 'medication');
    const regularHabits = safeDefinitions.filter(h => detectHabitType(h.name, h.description) !== 'medication');
    
    const completedTodayCount = todayLogs.filter(log => {
        const habit = safeDefinitions.find(d => d.id === (log.habit?.id || log.habit));
        return log.is_completed && habit && detectHabitType(habit.name, habit.description) !== 'medication';
    }).length;
    
    const completionPercentage = regularHabits.length > 0 
        ? Math.round((completedTodayCount / regularHabits.length) * 100) 
        : 0;

    return (
        <div className="analytics-container">
            {/* ✅ ماسح الباركود */}
            {showScanner && (
                <div className="scanner-modal" onClick={() => setShowScanner(false)}>
                    <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="scanner-header">
                            <h3>📷 {isArabic ? 'مسح الباركود' : 'Scan Barcode'}</h3>
                            <button className="close-btn" onClick={() => setShowScanner(false)}>✕</button>
                        </div>
                        <BarcodeScanner 
                            onScan={handleScanComplete} 
                            onClose={() => setShowScanner(false)} 
                        />
                        <div className="scanner-footer">
                            <p>📱 {isArabic ? 'ضع رمز المنتج داخل الإطار للمسح' : 'Place the barcode inside the frame to scan'}</p>
                            <button className="cancel-btn" onClick={() => setShowScanner(false)}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ رأس الصفحة */}
            <div className="habits-header">
                <h2 className="habits-title">
                    {isArabic ? '📋 العادات والأدوية' : '📋 Habits & Medications'}
                </h2>
                <div className="habits-date">
                    📅 {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* ✅ قسم البحث عن الأدوية */}
            <div className="drug-search-section">
                <div className="section-header-inline">
                    <div className="section-title-icon">
                        <span className="icon">💊</span>
                        <h3>{isArabic ? 'البحث عن دواء' : 'Search Medications'}</h3>
                    </div>
                    <p className="section-desc">
                        {isArabic ? 'ابحث عن الأدوية في قاعدة بيانات FDA العالمية' : 'Search for medications in the FDA database'}
                    </p>
                </div>
                
                <div className="search-bar">
                    <input
                        type="text"
                        value={drugSearchQuery}
                        onChange={(e) => setDrugSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchDrugInFDA(drugSearchQuery, searchType)}
                        placeholder={isArabic ? '🔍 أدخل اسم الدواء أو رمز NDC...' : '🔍 Enter drug name or NDC code...'}
                        className="search-input"
                    />
                    <div className="search-actions">
                        <button 
                            onClick={() => {
                                setSearchType('name');
                                searchDrugInFDA(drugSearchQuery, 'name');
                            }}
                            disabled={searchingDrug || !drugSearchQuery}
                            className={`search-btn ${searchType === 'name' ? 'active' : ''}`}
                        >
                            {searchingDrug && searchType === 'name' ? '⏳' : '🔍'} {isArabic ? 'اسم' : 'Name'}
                        </button>
                        <button 
                            onClick={() => {
                                setSearchType('ndc');
                                searchDrugInFDA(drugSearchQuery, 'ndc');
                            }}
                            disabled={searchingDrug || !drugSearchQuery}
                            className={`search-btn ${searchType === 'ndc' ? 'active' : ''}`}
                        >
                            {searchingDrug && searchType === 'ndc' ? '⏳' : '#️⃣'} NDC
                        </button>
                        <button 
                            onClick={() => setShowScanner(true)}
                            className="scan-btn"
                        >
                            📷 {isArabic ? 'مسح باركود' : 'Scan Barcode'}
                        </button>
                    </div>
                </div>
                
                {drugSearchResults.length > 0 && (
                    <div className="drug-results">
                        <div className="results-header">
                            📋 {isArabic ? `نتائج البحث (${drugSearchResults.length})` : `Search Results (${drugSearchResults.length})`}
                        </div>
                        <div className="results-list">
                            {drugSearchResults.map((drug, idx) => (
                                <div key={idx} className="drug-result-item" onClick={() => selectDrug(drug)}>
                                    <div className="drug-name">
                                        <strong>{drug.brand_name || drug.generic_name}</strong>
                                        {drug.generic_name && drug.brand_name && (
                                            <span className="drug-generic">({drug.generic_name})</span>
                                        )}
                                    </div>
                                    <div className="drug-details">
                                        {drug.manufacturer && <span>🏭 {drug.manufacturer}</span>}
                                        {drug.route && <span>💉 {drug.route}</span>}
                                        {drug.dosage_form && <span>📦 {drug.dosage_form}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ نقاط المستخدم */}
            {(userPoints > 0 || weeklyPoints > 0 || streakDays > 0) && (
                <div className="points-section">
                    <div className="points-header">
                        <span className="points-icon">🏆</span>
                        <h3>{isArabic ? 'نقاطك' : 'Your Points'}</h3>
                    </div>
                    <div className="points-grid">
                        <div className="point-card">
                            <div className="point-value">{userPoints}</div>
                            <div className="point-label">{isArabic ? 'نقاط اليوم' : 'Today\'s Points'}</div>
                        </div>
                        <div className="point-card">
                            <div className="point-value">{weeklyPoints}</div>
                            <div className="point-label">{isArabic ? 'نقاط الأسبوع' : 'Week\'s Points'}</div>
                        </div>
                        <div className="point-card">
                            <div className="point-value">{streakDays}</div>
                            <div className="point-label">{isArabic ? 'أيام متتالية' : 'Day Streak'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ رسائل الإشعارات */}
            {message && (
                <div className={`notification-toast ${messageType}`}>
                    <span>{messageType === 'success' ? '✅' : messageType === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>✕</button>
                </div>
            )}

            {/* ✅ تقدم العادات اليومية */}
            {isAuthReady && regularHabits.length > 0 && (
                <div className="progress-section">
                    <div className="progress-header">
                        <span className="progress-icon">📊</span>
                        <h3>{isArabic ? 'تقدم العادات اليومية' : 'Daily Habits Progress'}</h3>
                    </div>
                    <div className="progress-stats">
                        <div className="progress-count">
                            {completedTodayCount}/{regularHabits.length} {isArabic ? 'تم' : 'completed'}
                        </div>
                        <div className="progress-bar-wrapper">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
                            </div>
                            <div className="progress-percentage">{completionPercentage}%</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ إضافة عادة جديدة */}
            <div className="add-habit-section">
                <div className="section-header-inline">
                    <div className="section-title-icon">
                        <span className="icon">➕</span>
                        <h3>{isArabic ? 'إضافة عادة جديدة' : 'Add New Habit'}</h3>
                    </div>
                </div>
                
                <form onSubmit={handleAddDefinition} className="add-habit-form">
                    <div className="form-group">
                        <label>{isArabic ? 'اسم العادة' : 'Habit Name'}</label>
                        <input
                            type="text"
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder={isArabic ? 'مثال: شرب ماء، رياضة، نوم...' : 'Example: Drink water, exercise, sleep...'}
                            required
                            disabled={!isAuthReady || loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>{isArabic ? 'وصف العادة' : 'Habit Description'}</label>
                        <textarea
                            value={newHabitDescription}
                            onChange={(e) => setNewHabitDescription(e.target.value)}
                            placeholder={isArabic ? 'وصف تفصيلي للعادة...' : 'Detailed description of the habit...'}
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
                            <><span className="spinner-small"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>
                        ) : (
                            <>{isArabic ? '➕ إضافة عادة' : '➕ Add Habit'}</>
                        )}
                    </button>
                </form>
            </div>

            {/* ✅ قائمة العادات اليومية */}
            <div className="habits-list-section">
                <div className="section-header-inline">
                    <div className="section-title-icon">
                        <span className="icon">✅</span>
                        <h3>{isArabic ? 'عادات اليوم' : 'Today\'s Habits'}</h3>
                    </div>
                    {regularHabits.length > 0 && (
                        <div className="habits-count">
                            📋 {regularHabits.length} {isArabic ? 'عادة' : 'habits'}
                        </div>
                    )}
                </div>
                
                {loading && isAuthReady && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                )}
                
                {isAuthReady && regularHabits.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <h4>{isArabic ? 'لا توجد عادات' : 'No habits'}</h4>
                        <p>{isArabic ? 'أضف عاداتك اليومية أعلاه' : 'Add your daily habits above'}</p>
                    </div>
                )}
                
                {regularHabits.length > 0 && (
                    <div className="habits-grid">
                        {regularHabits.map((habit) => {
                            const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === habit.id);
                            const isCompleted = todayLog?.is_completed || false;
                            const habitType = detectHabitType(habit.name, habit.description);
                            const habitIcon = getHabitIcon(habitType);
                            const points = calculatePoints(habit.name, isCompleted, habitType);
                            
                            return (
                                <div key={habit.id} className={`habit-card ${isCompleted ? 'completed' : ''}`}>
                                    <div className="habit-card-header">
                                        <div className="habit-info">
                                            <span className="habit-icon">{habitIcon}</span>
                                            <div>
                                                <div className="habit-name">{habit.name}</div>
                                                {habit.description && (
                                                    <div className="habit-description">{habit.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="habit-actions">
                                            {isCompleted && points > 0 && (
                                                <span className="points-badge">+{points}</span>
                                            )}
                                            <button 
                                                onClick={() => handleToggleLog(habit.id)}
                                                disabled={loading || !isAuthReady}
                                                className={`complete-btn ${isCompleted ? 'undo' : ''}`}
                                            >
                                                {isCompleted ? '↩️' : '✅'}
                                                <span>{isCompleted ? (isArabic ? 'تراجع' : 'Undo') : (isArabic ? 'تم' : 'Complete')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ✅ قائمة الأدوية */}
            {medications.length > 0 && (
                <div className="medications-section">
                    <div className="section-header-inline">
                        <div className="section-title-icon">
                            <span className="icon">💊</span>
                            <h3>{isArabic ? 'الأدوية' : 'Medications'}</h3>
                        </div>
                        <div className="medications-count">
                            💊 {medications.length} {isArabic ? 'دواء' : 'medications'}
                        </div>
                    </div>
                    
                    <div className="medications-grid">
                        {medications.map((med) => {
                            const todayLog = todayLogs.find(log => (log.habit?.id || log.habit) === med.id);
                            const isCompleted = todayLog?.is_completed || false;
                            
                            return (
                                <div key={med.id} className={`medication-card ${isCompleted ? 'completed' : ''}`}>
                                    <div className="medication-info">
                                        <span className="medication-icon">💊</span>
                                        <div>
                                            <div className="medication-name">{med.name}</div>
                                            {med.description && (
                                                <div className="medication-description">{med.description}</div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleToggleLog(med.id)}
                                        disabled={loading || !isAuthReady}
                                        className={`take-btn ${isCompleted ? 'undo' : ''}`}
                                    >
                                        {isCompleted ? '↩️' : '✅'}
                                        <span>{isCompleted ? (isArabic ? 'تراجع' : 'Undo') : (isArabic ? 'تم' : 'Taken')}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ✅ تحليلات العادات */}
            <div className="analytics-wrapper">
                <HabitAnalytics refreshTrigger={refreshAnalytics} isArabic={isArabic} />
            </div>
        </div>
    );
}

export default HabitTracker;