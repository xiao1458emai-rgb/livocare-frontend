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

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                /* ===========================================
                   الرأس
                =========================================== */
                .habits-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                    padding-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-light);
                }
                
                .habits-title {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }
                
                .habits-date {
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg);
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                
                /* ===========================================
                   رأس الأقسام
                =========================================== */
                .section-header-inline {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                }
                
                .section-title-icon {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                }
                
                .section-title-icon .icon {
                    font-size: 1.3rem;
                }
                
                .section-title-icon h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                }
                
                .section-desc {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                /* ===========================================
                   البحث عن الأدوية
                =========================================== */
                .drug-search-section {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    border: 1px solid var(--border-light);
                    box-shadow: var(--shadow-sm);
                }
                
                .dark-mode .drug-search-section {
                    background: var(--card-bg);
                    border-color: var(--border-light);
                }
                
                .search-bar {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                
                .search-bar .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                }
                
                .search-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .search-btn {
                    padding: 0.5rem 1rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 0.85rem;
                }
                
                .search-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
                
                .search-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                    transform: translateY(-2px);
                }
                
                .scan-btn {
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                
                .scan-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .drug-results {
                    margin-top: var(--spacing-lg);
                }
                
                .results-header {
                    font-weight: 600;
                    margin-bottom: var(--spacing-sm);
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                
                .results-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .drug-result-item {
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    border: 1px solid var(--border-light);
                }
                
                .drug-result-item:hover {
                    background: var(--hover-bg);
                    transform: translateX(4px);
                }
                
                [dir="rtl"] .drug-result-item:hover {
                    transform: translateX(-4px);
                }
                
                .drug-name {
                    font-weight: 600;
                    margin-bottom: var(--spacing-xs);
                    color: var(--text-primary);
                }
                
                .drug-generic {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-left: var(--spacing-sm);
                }
                
                .drug-details {
                    display: flex;
                    gap: var(--spacing-md);
                    flex-wrap: wrap;
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }
                
                /* ===========================================
                   نقاط المستخدم
                =========================================== */
                .points-section {
                    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
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
                
                .points-header h3 {
                    margin: 0;
                    color: white;
                }
                
                .points-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: var(--spacing-md);
                }
                
                .point-card {
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(5px);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-md);
                    text-align: center;
                }
                
                .point-value {
                    font-size: 2rem;
                    font-weight: bold;
                    color: white;
                }
                
                .point-label {
                    font-size: 0.7rem;
                    opacity: 0.9;
                }
                
                /* ===========================================
                   تقدم العادات
                =========================================== */
                .progress-section {
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    color: white;
                }
                
                .progress-header {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing-md);
                }
                
                .progress-icon {
                    font-size: 1.5rem;
                }
                
                .progress-header h3 {
                    margin: 0;
                    color: white;
                }
                
                .progress-stats {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }
                
                .progress-count {
                    font-size: 1rem;
                }
                
                .progress-bar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                }
                
                .progress-bar-wrapper .progress-bar {
                    flex: 1;
                    background: rgba(255,255,255,0.3);
                }
                
                .progress-bar-wrapper .progress-fill {
                    background: white;
                }
                
                .progress-percentage {
                    font-size: 1rem;
                    font-weight: bold;
                }
                
                /* ===========================================
                   إضافة عادة
                =========================================== */
                .add-habit-section {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    border: 1px solid var(--border-light);
                }
                
                .add-habit-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xs);
                }
                
                .form-group label {
                    font-weight: 500;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                
                .form-group input,
                .form-group textarea {
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-md);
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }
                
                .form-group input:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
                }
                
                .submit-btn {
                    padding: 0.875rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                /* ===========================================
                   قائمة العادات
                =========================================== */
                .habits-list-section {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    border: 1px solid var(--border-light);
                }
                
                .habits-count,
                .medications-count {
                    padding: 0.25rem 0.75rem;
                    background: var(--tertiary-bg);
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                
                .habits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--spacing-md);
                }
                
                .habit-card {
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-md);
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }
                
                .habit-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .habit-card.completed {
                    background: rgba(16, 185, 129, 0.05);
                    border-color: rgba(16, 185, 129, 0.3);
                }
                
                .habit-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--spacing-md);
                }
                
                .habit-info {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex: 1;
                }
                
                .habit-icon {
                    font-size: 1.5rem;
                }
                
                .habit-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-xs);
                }
                
                .habit-description {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .habit-actions {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                }
                
                .points-badge {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-full);
                    font-size: 0.7rem;
                    font-weight: bold;
                }
                
                .complete-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    padding: 0.5rem 1rem;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    color: #10b981;
                    font-size: 0.8rem;
                }
                
                .complete-btn:hover:not(:disabled) {
                    background: #10b981;
                    color: white;
                }
                
                .complete-btn.undo {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                }
                
                .complete-btn.undo:hover:not(:disabled) {
                    background: #ef4444;
                    color: white;
                }
                
                .complete-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* ===========================================
                   قائمة الأدوية
                =========================================== */
                .medications-section {
                    background: var(--card-bg);
                    border-radius: var(--radius-xl);
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                    border: 1px solid var(--border-light);
                }
                
                .medications-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--spacing-md);
                }
                
                .medication-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-md);
                    background: var(--secondary-bg);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }
                
                .medication-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .medication-card.completed {
                    background: rgba(16, 185, 129, 0.05);
                    border-color: rgba(16, 185, 129, 0.3);
                }
                
                .medication-info {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex: 1;
                }
                
                .medication-icon {
                    font-size: 1.5rem;
                }
                
                .medication-name {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .medication-description {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    margin-top: var(--spacing-xs);
                }
                
                .take-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    padding: 0.5rem 1rem;
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    color: #3b82f6;
                    font-size: 0.8rem;
                }
                
                .take-btn:hover:not(:disabled) {
                    background: #3b82f6;
                    color: white;
                }
                
                .take-btn.undo {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                }
                
                .take-btn.undo:hover:not(:disabled) {
                    background: #ef4444;
                    color: white;
                }
                
                /* ===========================================
                   ماسح الباركود
                =========================================== */
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
                
                /* ===========================================
                   إشعارات
                =========================================== */
                .notification-toast {
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
                
                [dir="rtl"] .notification-toast {
                    right: auto;
                    left: var(--spacing-lg);
                }
                
                .notification-toast.success {
                    background: var(--success);
                    color: white;
                }
                
                .notification-toast.error {
                    background: var(--error);
                    color: white;
                }
                
                .notification-toast.info {
                    background: var(--info);
                    color: white;
                }
                
                .notification-toast button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                }
                
                /* ===========================================
                   حالات فارغة
                =========================================== */
                .loading-state,
                .empty-state {
                    text-align: center;
                    padding: var(--spacing-2xl);
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto var(--spacing-md);
                }
                
                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    display: inline-block;
                }
                
                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                    opacity: 0.5;
                }
                
                /* ===========================================
                   أنيميشن
                =========================================== */
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
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .analytics-wrapper {
                    margin-top: var(--spacing-xl);
                }
                
                /* ===========================================
                   استجابة الشاشات
                =========================================== */
                @media (max-width: 768px) {
                    .habits-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .points-grid {
                        grid-template-columns: 1fr;
                        gap: var(--spacing-sm);
                    }
                    
                    .habits-grid,
                    .medications-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .habit-card-header {
                        flex-direction: column;
                    }
                    
                    .medication-card {
                        flex-direction: column;
                        gap: var(--spacing-md);
                        text-align: center;
                    }
                    
                    .medication-info {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    
                    .notification-toast {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
                        bottom: var(--spacing-md);
                    }
                    
                    [dir="rtl"] .notification-toast {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
                    }
                }
                
                @media (max-width: 480px) {
                    .search-actions {
                        flex-direction: column;
                    }
                    
                    .search-btn,
                    .scan-btn {
                        width: 100%;
                        text-align: center;
                    }
                }
                
                /* ===========================================
                   دعم RTL
                =========================================== */
                [dir="rtl"] .habit-card-header {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .habit-info {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .medication-info {
                    flex-direction: row-reverse;
                }
                
                @media (max-width: 768px) {
                    [dir="rtl"] .habit-card-header {
                        flex-direction: column;
                    }
                    
                    [dir="rtl"] .habit-info {
                        flex-direction: column;
                    }
                    
                    [dir="rtl"] .medication-info {
                        flex-direction: column;
                    }
                }
                
                /* ===========================================
                   دعم الحركة المخفضة
                =========================================== */
                @media (prefers-reduced-motion: reduce) {
                    .scanner-modal,
                    .notification-toast {
                        animation: none !important;
                    }
                    
                    .habit-card:hover,
                    .medication-card:hover,
                    .drug-result-item:hover {
                        transform: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default HabitTracker;