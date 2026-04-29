// src/components/HealthHistory.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';
import EditHealthForm from './EditHealthForm';
function HealthHistory({ refreshKey, onDataSubmitted }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'recorded_at', direction: 'desc' });
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterType, setFilterType] = useState('all'); // all, weight, bp, glucose, heartRate, spo2, temperature
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isDeletingRef = useRef(false);

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

    // ✅ جلب البيانات
    const fetchHistory = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        try {
            const response = await axiosInstance.get('/health_status/');
            
            if (!isMountedRef.current) return;
            
            let historyData = [];
            if (response.data?.results) {
                historyData = response.data.results;
            } else if (Array.isArray(response.data)) {
                historyData = response.data;
            }
            
            console.log('📜 Health history loaded:', historyData.length);
            setHistory(historyData);
            setSelectedRecords([]);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching health history:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في تحميل السجل الصحي' : '❌ Error loading health history');
                setHistory([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [isArabic]);

    useEffect(() => {
        fetchHistory();
    }, [refreshKey, fetchHistory]);

    // ✅ تصفية البيانات حسب البحث ونوع الفلتر
    const filteredHistory = useMemo(() => {
        const safeHistory = Array.isArray(history) ? history : [];
        
        let filtered = safeHistory;
        
        // فلتر حسب النوع
        if (filterType !== 'all') {
            filtered = filtered.filter(record => {
                switch (filterType) {
                    case 'weight':
                        return record.weight_kg && record.weight_kg !== null;
                    case 'bp':
                        return record.systolic_pressure && record.diastolic_pressure && 
                               record.systolic_pressure !== null && record.diastolic_pressure !== null;
                    case 'glucose':
                        return record.blood_glucose && record.blood_glucose !== null;
                    case 'heartRate':
                        return record.heart_rate && record.heart_rate !== null;
                    case 'spo2':
                        return record.spo2 && record.spo2 !== null;
                    case 'temperature': // ✅ فلتر درجة الحرارة
                        return record.body_temperature && record.body_temperature !== null;
                    default:
                        return true;
                }
            });
        }
        
        // بحث
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(record => {
                const date = new Date(record.recorded_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
                return date.includes(searchLower) || 
                       record.weight_kg?.toString().includes(searchLower) ||
                       record.systolic_pressure?.toString().includes(searchLower) ||
                       record.diastolic_pressure?.toString().includes(searchLower) ||
                       record.blood_glucose?.toString().includes(searchLower) ||
                       record.heart_rate?.toString().includes(searchLower) ||
                       record.spo2?.toString().includes(searchLower) ||
                       record.body_temperature?.toString().includes(searchLower);
            });
        }
        
        return filtered;
    }, [history, searchTerm, filterType, isArabic]);

    // ✅ فرز البيانات
    const sortedHistory = useMemo(() => {
        if (!filteredHistory.length) return [];
        
        const sorted = [...filteredHistory].sort((a, b) => {
            if (sortConfig.key === 'recorded_at') {
                return sortConfig.direction === 'desc' 
                    ? new Date(b.recorded_at) - new Date(a.recorded_at)
                    : new Date(a.recorded_at) - new Date(b.recorded_at);
            }
            
            let aVal = a[sortConfig.key] || 0;
            let bVal = b[sortConfig.key] || 0;
            
            // معالجة خاصة لدرجة الحرارة (body_temperature)
            if (sortConfig.key === 'body_temperature') {
                aVal = a.body_temperature || 0;
                bVal = b.body_temperature || 0;
            }
            
            return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
        });
        
        return sorted;
    }, [filteredHistory, sortConfig]);

    // ✅ Pagination
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedHistory.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedHistory, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);

    // ✅ معالجة الفرز
    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    // ✅ حذف سجل
    const handleDelete = useCallback(async (id) => {
        if (isDeletingRef.current || !isMountedRef.current) return;
        
        isDeletingRef.current = true;
        
        try {
            await axiosInstance.delete(`/health_status/${id}/`);
            
            if (isMountedRef.current) {
                setDeleteConfirm(null);
                setSelectedRecords([]);
                if (onDataSubmitted) onDataSubmitted();
                await fetchHistory();
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في حذف السجل' : '❌ Error deleting record');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [onDataSubmitted, fetchHistory, isArabic]);

    // ✅ حذف جماعي
    const handleBulkDelete = useCallback(async () => {
        if (selectedRecords.length === 0 || isDeletingRef.current || !isMountedRef.current) return;
        
        isDeletingRef.current = true;
        
        try {
            await Promise.all(selectedRecords.map(id => 
                axiosInstance.delete(`/health_status/${id}/`)
            ));
            
            if (isMountedRef.current) {
                setSelectedRecords([]);
                if (onDataSubmitted) onDataSubmitted();
                await fetchHistory();
            }
        } catch (err) {
            console.error('Error bulk deleting:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في الحذف الجماعي' : '❌ Error in bulk delete');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [selectedRecords, onDataSubmitted, fetchHistory, isArabic]);

    // ✅ تحديد/إلغاء تحديد الكل
    const toggleSelectAll = useCallback(() => {
        if (selectedRecords.length === paginatedHistory.length) {
            setSelectedRecords([]);
        } else {
            setSelectedRecords(paginatedHistory.map(r => r.id));
        }
    }, [selectedRecords, paginatedHistory]);

    // ✅ تحديد/إلغاء تحديد سجل
    const toggleSelect = useCallback((id) => {
        setSelectedRecords(prev => 
            prev.includes(id) ? prev.filter(recId => recId !== id) : [...prev, id]
        );
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ✅ أيقونة الفرز
    const getSortIcon = useCallback((key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'desc' ? '⬇️' : '⬆️';
    }, [sortConfig]);

    // ✅ الحصول على الحالة الصحية (تمت إضافة درجة الحرارة)
    const getHealthStatus = useCallback((record) => {
        const issues = [];
        
        // نبضات القلب
        if (record.heart_rate) {
            if (record.heart_rate > 100) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'نبض مرتفع' : 'High HR', value: `${record.heart_rate} BPM` });
            } else if (record.heart_rate < 60) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'نبض منخفض' : 'Low HR', value: `${record.heart_rate} BPM` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'نبض طبيعي' : 'Normal HR', value: `${record.heart_rate} BPM` });
            }
        }
        
        // نسبة الأكسجين
        if (record.spo2) {
            if (record.spo2 < 95) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'أكسجين منخفض' : 'Low SpO₂', value: `${record.spo2}%` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'أكسجين طبيعي' : 'Normal SpO₂', value: `${record.spo2}%` });
            }
        }
        
        // ضغط الدم
        if (record.systolic_pressure && record.diastolic_pressure) {
            if (record.systolic_pressure > 140 || record.diastolic_pressure > 90) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'ضغط مرتفع' : 'High BP', value: `${record.systolic_pressure}/${record.diastolic_pressure}` });
            } else if (record.systolic_pressure < 90 || record.diastolic_pressure < 60) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'ضغط منخفض' : 'Low BP', value: `${record.systolic_pressure}/${record.diastolic_pressure}` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'ضغط طبيعي' : 'Normal BP', value: `${record.systolic_pressure}/${record.diastolic_pressure}` });
            }
        }
        
        // سكر الدم
        if (record.blood_glucose) {
            if (record.blood_glucose > 140) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'سكر مرتفع' : 'High Glucose', value: `${record.blood_glucose} mg/dL` });
            } else if (record.blood_glucose < 70) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'سكر منخفض' : 'Low Glucose', value: `${record.blood_glucose} mg/dL` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'سكر طبيعي' : 'Normal Glucose', value: `${record.blood_glucose} mg/dL` });
            }
        }
        
        // الوزن
        if (record.weight_kg) {
            if (record.weight_kg > 100) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'وزن مرتفع' : 'High Weight', value: `${record.weight_kg} kg` });
            } else if (record.weight_kg < 50) {
                issues.push({ status: 'warning', icon: '⚠️', text: isArabic ? 'وزن منخفض' : 'Low Weight', value: `${record.weight_kg} kg` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'وزن طبيعي' : 'Normal Weight', value: `${record.weight_kg} kg` });
            }
        }
        
        // ✅ درجة حرارة الجسم
        if (record.body_temperature) {
            const temp = record.body_temperature;
            if (temp > 37.5) {
                issues.push({ status: 'warning', icon: '🌡️', text: isArabic ? 'حرارة مرتفعة' : 'High Temp', value: `${temp}°C` });
            } else if (temp < 36.5) {
                issues.push({ status: 'warning', icon: '🌡️', text: isArabic ? 'حرارة منخفضة' : 'Low Temp', value: `${temp}°C` });
            } else {
                issues.push({ status: 'success', icon: '✅', text: isArabic ? 'حرارة طبيعية' : 'Normal Temp', value: `${temp}°C` });
            }
        }
        
        return issues;
    }, [isArabic]);

    // ✅ عرض القيمة
    const displayValue = useCallback((value, unit, precision = 1) => {
        if (value === null || value === undefined || value === '') {
            return <span className="missing-value">—</span>;
        }
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) {
            return <span className="missing-value">—</span>;
        }
        const formattedValue = precision === 0 ? Math.round(numValue) : numValue.toFixed(precision);
        return (
            <span className="value-display">
                {formattedValue}
                <span className="value-unit">{unit}</span>
            </span>
        );
    }, []);

    // ✅ عرض ضغط الدم
    const displayBloodPressure = useCallback((systolic, diastolic) => {
        if ((!systolic && systolic !== 0) || (!diastolic && diastolic !== 0)) {
            return <span className="missing-value">—</span>;
        }
        return (
            <div className="bp-display">
                <span className="systolic">{systolic}</span>
                <span className="separator">/</span>
                <span className="diastolic">{diastolic}</span>
            </div>
        );
    }, []);

    // ✅ تنسيق التاريخ
    const formatDate = useCallback((dateString) => {
        if (!dateString) return { date: isArabic ? 'تاريخ غير معروف' : 'Unknown date', time: '', full: '' };
        const date = new Date(dateString);
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return {
            date: date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleString(locale)
        };
    }, [isArabic]);

    // ✅ حساب الإحصائيات (تمت إضافة درجة الحرارة)
    const safeHistory = Array.isArray(history) ? history : [];
    const stats = {
        total: safeHistory.length,
        weight: safeHistory.filter(r => r.weight_kg && r.weight_kg !== null).length,
        bp: safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure && 
            r.systolic_pressure !== null && r.diastolic_pressure !== null).length,
        glucose: safeHistory.filter(r => r.blood_glucose && r.blood_glucose !== null).length,
        heartRate: safeHistory.filter(r => r.heart_rate && r.heart_rate !== null).length,
        spo2: safeHistory.filter(r => r.spo2 && r.spo2 !== null).length,
        temperature: safeHistory.filter(r => r.body_temperature && r.body_temperature !== null).length, // ✅ إحصائية درجة الحرارة
    };

    // ✅ حالة التحميل
    if (loading && safeHistory.length === 0) {
        return (
            <div className="history-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري تحميل السجل الصحي...' : 'Loading health history...'}</p>
                </div>
            </div>
        );
    }

    // ✅ حالة الخطأ
    if (error && safeHistory.length === 0) {
        return (
            <div className="history-error">
                <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <p>{error}</p>
                    <button onClick={fetchHistory} className="retry-btn">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="health-history-container">
            {/* ✅ رأس القسم */}
            <div className="history-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">📋</span>
                        {isArabic ? 'السجل الصحي' : 'Health History'}
                    </h2>
                    <div className="stats-badge">
                        📊 {stats.total} {isArabic ? 'تسجيل' : 'records'}
                    </div>
                </div>
                
                <div className="header-controls">
                    <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder={isArabic ? 'بحث في السجل...' : 'Search records...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    
                    {selectedRecords.length > 0 && (
                        <button onClick={handleBulkDelete} className="bulk-delete-btn">
                            🗑️ {isArabic ? `حذف ${selectedRecords.length} سجل` : `Delete ${selectedRecords.length}`}
                        </button>
                    )}
                </div>
            </div>

            {/* ✅ فلاتر سريعة (تمت إضافة فلتر درجة الحرارة) */}
            <div className="filter-tabs">
                <button 
                    className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    📋 {isArabic ? 'الكل' : 'All'} ({stats.total})
                </button>
                <button 
                    className={`filter-tab ${filterType === 'weight' ? 'active' : ''}`}
                    onClick={() => setFilterType('weight')}
                >
                    ⚖️ {isArabic ? 'الوزن' : 'Weight'} ({stats.weight})
                </button>
                <button 
                    className={`filter-tab ${filterType === 'bp' ? 'active' : ''}`}
                    onClick={() => setFilterType('bp')}
                >
                    ❤️ {isArabic ? 'الضغط' : 'BP'} ({stats.bp})
                </button>
                <button 
                    className={`filter-tab ${filterType === 'glucose' ? 'active' : ''}`}
                    onClick={() => setFilterType('glucose')}
                >
                    🩸 {isArabic ? 'السكر' : 'Glucose'} ({stats.glucose})
                </button>
                <button 
                    className={`filter-tab ${filterType === 'heartRate' ? 'active' : ''}`}
                    onClick={() => setFilterType('heartRate')}
                >
                    💓 {isArabic ? 'النبض' : 'HR'} ({stats.heartRate})
                </button>
                <button 
                    className={`filter-tab ${filterType === 'spo2' ? 'active' : ''}`}
                    onClick={() => setFilterType('spo2')}
                >
                    💨 SpO₂ ({stats.spo2})
                </button>
                {/* ✅ فلتر درجة الحرارة */}
                <button 
                    className={`filter-tab ${filterType === 'temperature' ? 'active' : ''}`}
                    onClick={() => setFilterType('temperature')}
                >
                    🌡️ {isArabic ? 'الحرارة' : 'Temp'} ({stats.temperature})
                </button>
            </div>

            {/* ✅ حالة عدم وجود بيانات */}
            {safeHistory.length === 0 && !editingRecord && (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>{isArabic ? 'لا توجد سجلات صحية' : 'No Health Records'}</h3>
                    <p>{isArabic ? 'ابدأ بإضافة قراءاتك الصحية الأولى' : 'Start adding your health readings'}</p>
                    <div className="empty-tips">
                        <span className="tip">💡 {isArabic ? 'أضف قراءة جديدة من النموذج أعلاه' : 'Add new reading from the form above'}</span>
                        <span className="tip">💡 {isArabic ? 'يمكنك تسجيل القياسات التي تريدها فقط' : 'You can record only the measurements you want'}</span>
                    </div>
                </div>
            )}

            {/* ✅ جدول البيانات (تمت إضافة عمود درجة الحرارة) */}
            {safeHistory.length > 0 && (
                <>
                    <div className="table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-col">
                                        <input
                                            type="checkbox"
                                            checked={selectedRecords.length === paginatedHistory.length && paginatedHistory.length > 0}
                                            onChange={toggleSelectAll}
                                            className="checkbox"
                                        />
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('recorded_at')}>
                                        📅 {isArabic ? 'التاريخ' : 'Date'}
                                        <span className="sort-icon">{getSortIcon('recorded_at')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('weight_kg')}>
                                        ⚖️ {isArabic ? 'الوزن' : 'Weight'}
                                        <span className="sort-icon">{getSortIcon('weight_kg')}</span>
                                    </th>
                                    <th>
                                        ❤️ {isArabic ? 'ضغط الدم' : 'BP'}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('blood_glucose')}>
                                        🩸 {isArabic ? 'السكر' : 'Glucose'}
                                        <span className="sort-icon">{getSortIcon('blood_glucose')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('heart_rate')}>
                                        💓 {isArabic ? 'النبض' : 'HR'}
                                        <span className="sort-icon">{getSortIcon('heart_rate')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('spo2')}>
                                        💨 SpO₂
                                        <span className="sort-icon">{getSortIcon('spo2')}</span>
                                    </th>
                                    {/* ✅ عمود درجة الحرارة */}
                                    <th className="sortable" onClick={() => handleSort('body_temperature')}>
                                        🌡️ {isArabic ? 'الحرارة' : 'Temp'}
                                        <span className="sort-icon">{getSortIcon('body_temperature')}</span>
                                    </th>
                                    <th>{isArabic ? 'الحالة' : 'Status'}</th>
                                    <th>{isArabic ? 'الإجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.map((record) => {
                                    const { date, time } = formatDate(record.recorded_at);
                                    const statuses = getHealthStatus(record);
                                    const isSelected = selectedRecords.includes(record.id);
                                    
                                    return (
                                        <tr key={record.id} className={`table-row ${isSelected ? 'selected' : ''}`}>
                                            <td className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(record.id)}
                                                    className="checkbox"
                                                />
                                            </td>
                                            <td className="date-cell">
                                                <div className="date-main">{date}</div>
                                                <div className="date-time">{time}</div>
                                            </td>
                                            <td>{displayValue(record.weight_kg, 'kg', 1)}</td>
                                            <td>{displayBloodPressure(record.systolic_pressure, record.diastolic_pressure)}</td>
                                            <td>{displayValue(record.blood_glucose, 'mg/dL', 0)}</td>
                                            <td className="center">{displayValue(record.heart_rate, 'BPM', 0)}</td>
                                            <td className="center">{displayValue(record.spo2, '%', 0)}</td>
                                            {/* ✅ عرض درجة الحرارة */}
                                            <td className="center">{displayValue(record.body_temperature, '°C', 1)}</td>
                                            <td className="status-cell">
                                                <div className="status-list">
                                                    {statuses.map((status, index) => (
                                                        <span key={index} className={`status-badge ${status.status}`}>
                                                            {status.icon} {status.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                <button 
                                                    onClick={() => setEditingRecord(record)} 
                                                    className="action-btn edit"
                                                    title={isArabic ? 'تعديل' : 'Edit'}
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirm(record.id)} 
                                                    className="action-btn delete"
                                                    title={isArabic ? 'حذف' : 'Delete'}
                                                >
                                                    🗑️
                                                </button>
                                             </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ✅ Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="page-btn"
                            >
                                ←
                            </button>
                            <div className="page-info">
                                {isArabic ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="page-btn"
                            >
                                →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ✅ نافذة تأكيد الحذف */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-icon">⚠️</span>
                            <h3>{isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
                        </div>
                        <div className="modal-body">
                            <p>{isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}</p>
                            <p className="warning-text">{isArabic ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}</p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setDeleteConfirm(null)} className="cancel-btn">
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="confirm-btn">
                                🗑️ {isArabic ? 'حذف' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* ✅ نموذج التعديل */}
{editingRecord && (
    <EditHealthForm
        currentRecord={editingRecord}
        onClose={() => setEditingRecord(null)}
        onUpdate={() => {
            setEditingRecord(null);
            if (onDataSubmitted) onDataSubmitted();
            fetchHistory();
        }}
        isArabic={isArabic}
    />
)}

            {/* ... CSS styles تبقى كما هي مع إضافة تحسينات للعرض على الشاشات الصغيرة ... */}
            <style jsx>{`
    
/* ===========================================
   HealthHistory.css - الأنماط الداخلية فقط
   ✅ السجل الصحي - تصميم نظيف
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.health-history-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
    transition: all 0.2s ease;
}

.dark-mode .health-history-container {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس القسم ===== */
.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .history-header {
    border-bottom-color: #334155;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.header-title h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .header-title h2 {
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.title-icon {
    font-size: 1.5rem;
}

.stats-badge {
    padding: 0.35rem 0.85rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .stats-badge {
    background: #0f172a;
    color: #94a3b8;
}

/* ===== أدوات التحكم ===== */
.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.search-wrapper {
    position: relative;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.9rem;
}

[dir="rtl"] .search-icon {
    left: auto;
    right: 0.75rem;
}

.search-wrapper .search-input {
    padding-left: 2.25rem;
    min-width: 220px;
}

[dir="rtl"] .search-wrapper .search-input {
    padding-left: 1rem;
    padding-right: 2.25rem;
}

.search-input {
    width: 100%;
    padding: 0.6rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
    transition: all 0.2s;
}

.dark-mode .search-input {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.search-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.bulk-delete-btn {
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 12px;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: 600;
}

.bulk-delete-btn:hover {
    background: #ef4444;
    color: white;
    transform: translateY(-1px);
}

/* ===== فلاتر ===== */
.filter-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.filter-tab {
    padding: 0.4rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 40px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .filter-tab {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.filter-tab:hover {
    background: var(--hover-bg, #f1f5f9);
    transform: translateY(-1px);
}

.dark-mode .filter-tab:hover {
    background: #334155;
}

.filter-tab.active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border-color: transparent;
}

/* ===== الجدول ===== */
.table-wrapper {
    overflow-x: auto;
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
    margin-bottom: 1rem;
}

.dark-mode .table-wrapper {
    border-color: #334155;
}

.history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    min-width: 900px;
}

.history-table th {
    background: var(--tertiary-bg, #f1f5f9);
    padding: 0.85rem 0.75rem;
    text-align: left;
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--text-primary, #0f172a);
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .history-table th {
    background: #0f172a;
    border-bottom-color: #334155;
    color: #f1f5f9;
}

.history-table td {
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
    color: var(--text-secondary, #64748b);
}

.dark-mode .history-table td {
    border-bottom-color: #334155;
    color: #94a3b8;
}

[dir="rtl"] .history-table th,
[dir="rtl"] .history-table td {
    text-align: right;
}

/* أعمدة الجدول */
.checkbox-col {
    width: 40px;
    text-align: center;
}

.checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #6366f1;
}

.sortable {
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
}

.sortable:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .sortable:hover {
    background: #334155;
}

.sort-icon {
    margin-left: 0.35rem;
    font-size: 0.7rem;
}

[dir="rtl"] .sort-icon {
    margin-left: 0;
    margin-right: 0.35rem;
}

/* خلايا التاريخ */
.date-cell {
    white-space: nowrap;
}

.date-main {
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .date-main {
    color: #f1f5f9;
}

.date-time {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.center {
    text-align: center;
}

.missing-value {
    color: var(--text-tertiary, #94a3b8);
    font-style: italic;
}

.value-display {
    font-weight: 600;
    color: var(--text-primary, #0f172a);
}

.dark-mode .value-display {
    color: #f1f5f9;
}

.value-unit {
    font-size: 0.65rem;
    font-weight: 500;
    margin-left: 2px;
    color: var(--text-tertiary, #94a3b8);
}

/* عرض ضغط الدم */
.bp-display {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}

.bp-display .systolic {
    color: #ef4444;
    font-weight: 600;
}

.bp-display .diastolic {
    color: #8b5cf6;
    font-weight: 600;
}

/* حالة السجل */
.status-cell {
    min-width: 180px;
}

.status-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 600;
    width: fit-content;
}

.status-badge.success {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
}

.status-badge.warning {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
}

/* أزرار الإجراءات */
.actions-cell {
    white-space: nowrap;
}

.action-btn {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    transition: all 0.2s;
}

.action-btn.edit:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.05);
}

.action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    transform: scale(1.05);
}

/* الصف المحدد */
.table-row.selected {
    background: rgba(59, 130, 246, 0.05);
}

.dark-mode .table-row.selected {
    background: rgba(59, 130, 246, 0.1);
}

.table-row:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .table-row:hover {
    background: #334155;
}

/* ===== Pagination ===== */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
}

.page-btn {
    padding: 0.4rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .page-btn {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.page-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border-color: transparent;
}

.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

/* ===== حالات خاصة ===== */
.history-loading,
.history-error {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 3rem;
    text-align: center;
    border: 1px solid var(--border-light, #eef2f6);
}

.dark-mode .history-loading,
.dark-mode .history-error {
    background: #1e293b;
    border-color: #334155;
}

.loading-spinner .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

/* حالة عدم وجود بيانات */
.empty-state {
    text-align: center;
    padding: 3rem;
}

.empty-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .empty-state h3 {
    color: #f1f5f9;
}

.empty-state p {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 1rem;
}

.empty-tips {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
}

.tip {
    font-size: 0.75rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== نافذة تأكيد ===== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
}

.confirm-modal {
    background: var(--card-bg, #ffffff);
    border-radius: 24px;
    width: 90%;
    max-width: 380px;
    overflow: hidden;
    box-shadow: 0 20px 35px rgba(0, 0, 0, 0.3);
}

.dark-mode .confirm-modal {
    background: #1e293b;
}

.modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: rgba(239, 68, 68, 0.08);
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .modal-header {
    border-bottom-color: #334155;
}

.modal-icon {
    font-size: 1.5rem;
}

.modal-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #ef4444;
}

.modal-body {
    padding: 1.25rem;
}

.modal-body p {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .modal-body p {
    color: #f1f5f9;
}

.warning-text {
    font-size: 0.75rem;
    color: #ef4444;
}

.modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .modal-footer {
    border-top-color: #334155;
}

.cancel-btn {
    flex: 1;
    padding: 0.6rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.dark-mode .cancel-btn {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.cancel-btn:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .cancel-btn:hover {
    background: #334155;
}

.confirm-btn {
    flex: 1;
    padding: 0.6rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    font-weight: 700;
}

.confirm-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
}

/* ===== أنيميشن ===== */
@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .filter-tab,
[dir="rtl"] .status-badge,
[dir="rtl"] .bp-display {
    flex-direction: row-reverse;
}

[dir="rtl"] .status-list {
    align-items: flex-end;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner {
        animation: none;
    }
    
    .modal-overlay {
        animation: none;
    }
    
    .page-btn:hover:not(:disabled),
    .confirm-btn:hover,
    .bulk-delete-btn:hover {
        transform: none;
    }
    
    .filter-tab:hover {
        transform: none;
    }
}
            `}</style>
        </div>
    );
}

export default HealthHistory; 