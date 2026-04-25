// src/components/HealthHistory.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import EditHealthForm from './EditHealthForm';
import '../index.css';

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
    const [filterType, setFilterType] = useState('all'); // all, weight, bp, glucose, heartRate, spo2
    
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
                       record.spo2?.toString().includes(searchLower);
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
            
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;
            
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

    // ✅ الحصول على الحالة الصحية
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

    // ✅ حساب الإحصائيات
    const safeHistory = Array.isArray(history) ? history : [];
    const stats = {
        total: safeHistory.length,
        weight: safeHistory.filter(r => r.weight_kg && r.weight_kg !== null).length,
        bp: safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure && 
            r.systolic_pressure !== null && r.diastolic_pressure !== null).length,
        glucose: safeHistory.filter(r => r.blood_glucose && r.blood_glucose !== null).length,
        heartRate: safeHistory.filter(r => r.heart_rate && r.heart_rate !== null).length,
        spo2: safeHistory.filter(r => r.spo2 && r.spo2 !== null).length,
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

            {/* ✅ فلاتر سريعة */}
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

            {/* ✅ جدول البيانات */}
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
                                        ❤️ {isArabic ? 'ضغط الدم' : 'Blood Pressure'}
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
        </div>
    );
}

export default HealthHistory;