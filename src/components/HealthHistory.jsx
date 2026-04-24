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
    
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isDeletingRef = useRef(false);

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // تطبيق اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    const getSafeHistory = useCallback(() => {
        return Array.isArray(history) ? history : [];
    }, [history]);

    // جلب البيانات
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
                setError(isArabic ? 'خطأ في تحميل السجل الصحي' : 'Error loading health history');
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

    // تصفية البيانات حسب البحث
    const filteredHistory = useMemo(() => {
        const safeHistory = getSafeHistory();
        if (!searchTerm.trim()) return safeHistory;
        
        return safeHistory.filter(record => {
            const searchLower = searchTerm.toLowerCase();
            const date = new Date(record.recorded_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
            return date.includes(searchLower) || 
                   record.weight_kg?.toString().includes(searchLower) ||
                   record.systolic_pressure?.toString().includes(searchLower) ||
                   record.diastolic_pressure?.toString().includes(searchLower) ||
                   record.blood_glucose?.toString().includes(searchLower) ||
                   record.heart_rate?.toString().includes(searchLower) ||
                   record.spo2?.toString().includes(searchLower);
        });
    }, [history, searchTerm, isArabic, getSafeHistory]);

    // فرز البيانات
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

    // Pagination
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedHistory.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedHistory, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

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
                setError(isArabic ? 'خطأ في حذف السجل' : 'Error deleting record');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [onDataSubmitted, fetchHistory, isArabic]);

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
                setError(isArabic ? 'خطأ في الحذف الجماعي' : 'Error in bulk delete');
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [selectedRecords, onDataSubmitted, fetchHistory, isArabic]);

    const toggleSelectAll = () => {
        if (selectedRecords.length === paginatedHistory.length) {
            setSelectedRecords([]);
        } else {
            setSelectedRecords(paginatedHistory.map(r => r.id));
        }
    };

    const toggleSelect = (id) => {
        if (selectedRecords.includes(id)) {
            setSelectedRecords(selectedRecords.filter(recId => recId !== id));
        } else {
            setSelectedRecords([...selectedRecords, id]);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'desc' ? '⬇️' : '⬆️';
    };

    const getHealthStatus = (record) => {
        const issues = [];
        
        if (record.heart_rate) {
            if (record.heart_rate > 100) {
                issues.push('⚠️ ' + (isArabic ? 'نبض مرتفع' : 'High heart rate'));
            } else if (record.heart_rate < 60) {
                issues.push('⚠️ ' + (isArabic ? 'نبض منخفض' : 'Low heart rate'));
            } else {
                issues.push('✅ ' + (isArabic ? 'نبض طبيعي' : 'Normal heart rate'));
            }
        } else {
            issues.push('❓ ' + (isArabic ? 'لم يتم قياس النبض' : 'Heart rate not measured'));
        }
        
        if (record.spo2) {
            if (record.spo2 < 95) {
                issues.push('⚠️ ' + (isArabic ? 'أكسجين منخفض' : 'Low oxygen'));
            } else {
                issues.push('✅ ' + (isArabic ? 'أكسجين طبيعي' : 'Normal oxygen'));
            }
        } else {
            issues.push('❓ ' + (isArabic ? 'لم يتم قياس الأكسجين' : 'Oxygen not measured'));
        }
        
        if (record.systolic_pressure && record.diastolic_pressure) {
            if (record.systolic_pressure > 140 || record.diastolic_pressure > 90) {
                issues.push('⚠️ ' + (isArabic ? 'ضغط مرتفع' : 'High blood pressure'));
            } else if (record.systolic_pressure < 90 || record.diastolic_pressure < 60) {
                issues.push('⚠️ ' + (isArabic ? 'ضغط منخفض' : 'Low blood pressure'));
            } else {
                issues.push('✅ ' + (isArabic ? 'ضغط طبيعي' : 'Normal blood pressure'));
            }
        } else {
            issues.push('❓ ' + (isArabic ? 'لم يتم قياس الضغط' : 'Blood pressure not measured'));
        }
        
        if (record.blood_glucose) {
            if (record.blood_glucose > 140) {
                issues.push('⚠️ ' + (isArabic ? 'سكر مرتفع' : 'High blood sugar'));
            } else if (record.blood_glucose < 70) {
                issues.push('⚠️ ' + (isArabic ? 'سكر منخفض' : 'Low blood sugar'));
            } else {
                issues.push('✅ ' + (isArabic ? 'سكر طبيعي' : 'Normal blood sugar'));
            }
        } else {
            issues.push('❓ ' + (isArabic ? 'لم يتم قياس السكر' : 'Blood sugar not measured'));
        }
        
        if (record.weight_kg) {
            if (record.weight_kg > 100) {
                issues.push('⚠️ ' + (isArabic ? 'وزن مرتفع' : 'High weight'));
            } else if (record.weight_kg < 50) {
                issues.push('⚠️ ' + (isArabic ? 'وزن منخفض' : 'Low weight'));
            } else {
                issues.push('✅ ' + (isArabic ? 'وزن طبيعي' : 'Normal weight'));
            }
        } else {
            issues.push('❓ ' + (isArabic ? 'لم يتم قياس الوزن' : 'Weight not measured'));
        }
        
        return issues;
    };

    const getStatusColor = (status) => {
        if (status.includes('✅')) return '#10b981';
        if (status.includes('⚠️')) return '#ef4444';
        if (status.includes('❓')) return '#94a3b8';
        return '#64748b';
    };

    const displayValue = (value, unit, precision = 1) => {
        if (value === null || value === undefined || value === '') {
            return <span className="stat-label" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>;
        }
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numValue)) {
            return <span className="stat-label" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>;
        }
        const formattedValue = precision === 0 ? Math.round(numValue) : numValue.toFixed(precision);
        return (
            <span className="stat-value">
                {formattedValue}
                <span className="stat-label" style={{ fontSize: '0.7rem', marginLeft: '2px' }}>{unit}</span>
            </span>
        );
    };

    const displayBloodPressure = (systolic, diastolic) => {
        if ((!systolic && systolic !== 0) || (!diastolic && diastolic !== 0)) {
            return <span className="stat-label" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>;
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ color: 'var(--error)' }}>{systolic}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                <span style={{ color: 'var(--warning)' }}>{diastolic}</span>
            </div>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return { date: isArabic ? 'تاريخ غير معروف' : 'Unknown date', time: '', full: '' };
        const date = new Date(dateString);
        const locale = isArabic ? 'ar-EG' : 'en-US';
        return {
            date: date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleString(locale)
        };
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <div className="empty-icon">⚠️</div>
                    <p>{error}</p>
                    <button onClick={fetchHistory} className="type-btn active">
                        🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>
            </div>
        );
    }

    const safeHistory = getSafeHistory();
    const weightCount = safeHistory.filter(r => r.weight_kg && r.weight_kg !== null && r.weight_kg !== '').length;
    const pressureCount = safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure && 
        r.systolic_pressure !== null && r.diastolic_pressure !== null).length;
    const glucoseCount = safeHistory.filter(r => r.blood_glucose && r.blood_glucose !== null && r.blood_glucose !== '').length;
    const heartRateCount = safeHistory.filter(r => r.heart_rate && r.heart_rate !== null && r.heart_rate !== '').length;
    const spo2Count = safeHistory.filter(r => r.spo2 && r.spo2 !== null && r.spo2 !== '').length;

    return (
        <div className="analytics-container">
            {/* رأس القسم */}
            <div className="analytics-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <h2>{isArabic ? 'السجل الصحي' : 'Health History'}</h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        {/* ✅ تم إزالة زر اللغة من هنا */}
                        <div className="search-box" style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>🔍</span>
                            <input
                                type="text"
                                placeholder={isArabic ? 'بحث...' : 'Search...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                style={{ paddingLeft: '2rem' }}
                            />
                        </div>
                        {selectedRecords.length > 0 && (
                            <button onClick={handleBulkDelete} className="delete-read-btn">
                                🗑️ {isArabic ? `حذف ${selectedRecords.length} سجل` : `Delete ${selectedRecords.length} records`}
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="type-filters" style={{ justifyContent: 'flex-start', marginTop: 'var(--spacing-md)' }}>
                    <span className="type-btn">📝 {isArabic ? 'سجل' : 'Record'} {safeHistory.length}</span>
                    <span className="type-btn">⚖️ {isArabic ? 'وزن' : 'Weight'} {weightCount}</span>
                    <span className="type-btn">❤️ {isArabic ? 'ضغط' : 'Pressure'} {pressureCount}</span>
                    <span className="type-btn">🩸 {isArabic ? 'سكر' : 'Glucose'} {glucoseCount}</span>
                    <span className="type-btn">❤️ {isArabic ? 'النبض' : 'Heart Rate'} {heartRateCount}</span>
                    <span className="type-btn">💨 {isArabic ? 'الأكسجين' : 'SpO₂'} {spo2Count}</span>
                </div>
            </div>

            {/* حالة عدم وجود بيانات */}
            {safeHistory.length === 0 && !editingRecord && (
                <div className="analytics-empty">
                    <div className="empty-icon">📝</div>
                    <h3>{isArabic ? 'لا توجد سجلات صحية' : 'No Health Records'}</h3>
                    <p>{isArabic ? 'ابدأ بإضافة قراءاتك الصحية الأولى' : 'Start adding your health readings'}</p>
                    <div className="type-filters" style={{ justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
                        <span className="type-btn">💡 {isArabic ? 'أضف قراءة جديدة من النموذج أعلاه' : 'Add new reading from the form above'}</span>
                        <span className="type-btn">💡 {isArabic ? 'يمكنك تسجيل القياسات التي تريدها فقط' : 'You can record only the measurements you want'}</span>
                    </div>
                </div>
            )}

            {/* جدول البيانات */}
            {safeHistory.length > 0 && (
                <>
                    <div className="table-container" style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', marginBottom: 'var(--spacing-lg)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--tertiary-bg)' }}>
                                    <th style={{ padding: '0.75rem', width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRecords.length === paginatedHistory.length && paginatedHistory.length > 0}
                                            onChange={toggleSelectAll}
                                            style={{ accentColor: 'var(--primary)' }}
                                        />
                                    </th>
                                    <th onClick={() => handleSort('recorded_at')} style={{ cursor: 'pointer', padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>📅</span> {isArabic ? 'التاريخ' : 'Date'} <span>{getSortIcon('recorded_at')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('weight_kg')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>⚖️</span> {isArabic ? 'الوزن' : 'Weight'} <span>{getSortIcon('weight_kg')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('systolic_pressure')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>❤️</span> {isArabic ? 'ضغط الدم' : 'Blood Pressure'} <span>{getSortIcon('systolic_pressure')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('blood_glucose')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>🩸</span> {isArabic ? 'السكر' : 'Glucose'} <span>{getSortIcon('blood_glucose')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('heart_rate')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>❤️</span> {isArabic ? 'النبض' : 'Heart Rate'} <span>{getSortIcon('heart_rate')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('spo2')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>💨</span> {isArabic ? 'الأكسجين' : 'SpO₂'} <span>{getSortIcon('spo2')}</span>
                                        </div>
                                    </th>
                                    <th style={{ padding: '0.75rem' }}>📈 {isArabic ? 'الحالة' : 'Status'}</th>
                                    <th style={{ padding: '0.75rem' }}>⚙️ {isArabic ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.map((record) => {
                                    const { date, time } = formatDate(record.recorded_at);
                                    const statuses = getHealthStatus(record);
                                    
                                    return (
                                        <tr key={record.id} className={`table-row ${selectedRecords.includes(record.id) ? 'selected' : ''}`} style={{
                                            transition: 'background var(--transition-fast)',
                                            background: selectedRecords.includes(record.id) ? 'var(--info-bg)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRecords.includes(record.id)}
                                                    onChange={() => toggleSelect(record.id)}
                                                    style={{ accentColor: 'var(--primary)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{date}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{time}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{displayValue(record.weight_kg, 'kg', 1)}</td>
                                            <td style={{ padding: '0.75rem' }}>{displayBloodPressure(record.systolic_pressure, record.diastolic_pressure)}</td>
                                            <td style={{ padding: '0.75rem' }}>{displayValue(record.blood_glucose, 'mg/dL', 0)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{displayValue(record.heart_rate, 'BPM', 0)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{displayValue(record.spo2, '%', 0)}</td>
                                            <td style={{ padding: '0.75rem', minWidth: '180px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {statuses.map((status, index) => (
                                                        <span key={index} className="priority-badge" style={{
                                                            background: getStatusColor(status),
                                                            color: 'white',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            width: 'fit-content'
                                                        }}>
                                                            {status.substring(0, 2)} {status.substring(3)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => setEditingRecord(record)} className="notification-action-btn" title={isArabic ? 'تعديل' : 'Edit'}>
                                                        ✏️
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(record.id)} className="notification-action-btn" title={isArabic ? 'حذف' : 'Delete'}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="type-filters" style={{ justifyContent: 'center' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="type-btn"
                            >
                                {isArabic ? '←' : '←'}
                            </button>
                            <span className="stat-label">
                                {isArabic ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="type-btn"
                            >
                                {isArabic ? '→' : '→'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* نافذة تأكيد الحذف */}
            {deleteConfirm && (
                <div className="modal-backdrop" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="confirm-modal" style={{
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-lg)',
                        maxWidth: '380px',
                        width: '90%',
                        border: '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-xl)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--spacing-md)' }}>
                            <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}</p>
                            <p style={{ color: 'var(--error)', fontSize: '0.8rem' }}>{isArabic ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setDeleteConfirm(null)} className="type-btn" style={{ flex: 1 }}>
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="type-btn active" style={{ flex: 1, background: 'var(--error)', color: 'white' }}>
                                🗑️ {isArabic ? 'حذف' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* نموذج التعديل */}
            {editingRecord && (
                <EditHealthForm
                    currentRecord={editingRecord}
                    onClose={() => setEditingRecord(null)}
                    onUpdate={() => {
                        setEditingRecord(null);
                        onDataSubmitted();
                    }}
                />
            )}

            <style>{`
                /* ✅ تم إزالة .lang-btn styles */

                .table-row:hover {
                    background: var(--hover-bg) !important;
                }
                
                .search-box input {
                    min-width: 220px;
                }
                
                @media (max-width: 768px) {
                    .search-box input {
                        min-width: auto;
                        width: 100%;
                    }
                    
                    .search-box {
                        width: 100%;
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .modal-backdrop {
                    animation: fadeIn 0.2s ease;
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .modal-backdrop {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default HealthHistory;