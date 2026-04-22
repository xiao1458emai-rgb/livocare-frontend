// src/components/HealthHistory.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import EditHealthForm from './EditHealthForm';
import '../index.css';

function HealthHistory({ refreshKey, onDataSubmitted }) {
    const { t, i18n } = useTranslation();
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
    
    // useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isDeletingRef = useRef(false);

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
                setError(t('history.fetchError'));
                setHistory([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, [t]);

    useEffect(() => {
        fetchHistory();
    }, [refreshKey, fetchHistory]);

    // تصفية البيانات حسب البحث
    const filteredHistory = useMemo(() => {
        const safeHistory = getSafeHistory();
        if (!searchTerm.trim()) return safeHistory;
        
        return safeHistory.filter(record => {
            const searchLower = searchTerm.toLowerCase();
            const date = new Date(record.recorded_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
            return date.includes(searchLower) || 
                   record.weight_kg?.toString().includes(searchLower) ||
                   record.systolic_pressure?.toString().includes(searchLower) ||
                   record.diastolic_pressure?.toString().includes(searchLower) ||
                   record.blood_glucose?.toString().includes(searchLower) ||
                   record.heart_rate?.toString().includes(searchLower) ||
                   record.spo2?.toString().includes(searchLower);
        });
    }, [history, searchTerm, i18n.language, getSafeHistory]);

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
                setError(t('history.deleteError'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [t, onDataSubmitted, fetchHistory]);

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
                setError(t('history.bulkDeleteError'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 3000);
            }
        } finally {
            isDeletingRef.current = false;
        }
    }, [selectedRecords, onDataSubmitted, fetchHistory, t]);

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
                issues.push('⚠️ ' + (t('history.highHeartRate') || 'نبض مرتفع'));
            } else if (record.heart_rate < 60) {
                issues.push('⚠️ ' + (t('history.lowHeartRate') || 'نبض منخفض'));
            } else {
                issues.push('✅ ' + (t('history.normalHeartRate') || 'نبض طبيعي'));
            }
        } else {
            issues.push('❓ ' + (t('history.heartRateNotMeasured') || 'لم يتم قياس النبض'));
        }
        
        if (record.spo2) {
            if (record.spo2 < 95) {
                issues.push('⚠️ ' + (t('history.lowSpO2') || 'أكسجين منخفض'));
            } else {
                issues.push('✅ ' + (t('history.normalSpO2') || 'أكسجين طبيعي'));
            }
        } else {
            issues.push('❓ ' + (t('history.spo2NotMeasured') || 'لم يتم قياس الأكسجين'));
        }
        
        if (record.systolic_pressure && record.diastolic_pressure) {
            if (record.systolic_pressure > 140 || record.diastolic_pressure > 90) {
                issues.push('⚠️ ' + (t('history.highBP') || 'ضغط مرتفع'));
            } else if (record.systolic_pressure < 90 || record.diastolic_pressure < 60) {
                issues.push('⚠️ ' + (t('history.lowBP') || 'ضغط منخفض'));
            } else {
                issues.push('✅ ' + (t('history.normalBP') || 'ضغط طبيعي'));
            }
        } else {
            issues.push('❓ ' + (t('history.bpNotMeasured') || 'لم يتم قياس الضغط'));
        }
        
        if (record.blood_glucose) {
            if (record.blood_glucose > 140) {
                issues.push('⚠️ ' + (t('history.highGlucose') || 'سكر مرتفع'));
            } else if (record.blood_glucose < 70) {
                issues.push('⚠️ ' + (t('history.lowGlucose') || 'سكر منخفض'));
            } else {
                issues.push('✅ ' + (t('history.normalGlucose') || 'سكر طبيعي'));
            }
        } else {
            issues.push('❓ ' + (t('history.glucoseNotMeasured') || 'لم يتم قياس السكر'));
        }
        
        if (record.weight_kg) {
            if (record.weight_kg > 100) {
                issues.push('⚠️ ' + (t('history.highWeight') || 'وزن مرتفع'));
            } else if (record.weight_kg < 50) {
                issues.push('⚠️ ' + (t('history.lowWeight') || 'وزن منخفض'));
            } else {
                issues.push('✅ ' + (t('history.normalWeight') || 'وزن طبيعي'));
            }
        } else {
            issues.push('❓ ' + (t('history.weightNotMeasured') || 'لم يتم قياس الوزن'));
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

    const safeHistory = getSafeHistory();
    const weightCount = safeHistory.filter(r => r.weight_kg && r.weight_kg !== null && r.weight_kg !== '').length;
    const pressureCount = safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure && 
        r.systolic_pressure !== null && r.diastolic_pressure !== null).length;
    const glucoseCount = safeHistory.filter(r => r.blood_glucose && r.blood_glucose !== null && r.blood_glucose !== '').length;
    const heartRateCount = safeHistory.filter(r => r.heart_rate && r.heart_rate !== null && r.heart_rate !== '').length;
    const spo2Count = safeHistory.filter(r => r.spo2 && r.spo2 !== null && r.spo2 !== '').length;

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('history.loading')}</p>
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
                        🔄 {t('history.retry')}
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return { date: t('history.unknownDate'), time: '', full: '' };
        const date = new Date(dateString);
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return {
            date: date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleString(locale)
        };
    };

    return (
        <div className="analytics-container">
            {/* رأس القسم */}
            <div className="analytics-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <h2>
                        <span>📊</span>
                        {t('history.title')}
                    </h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <div className="search-box" style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>🔍</span>
                            <input
                                type="text"
                                placeholder={t('history.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                style={{ paddingLeft: '2rem' }}
                            />
                        </div>
                        {selectedRecords.length > 0 && (
                            <button onClick={handleBulkDelete} className="delete-read-btn">
                                🗑️ {t('history.deleteSelected', { count: selectedRecords.length })}
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="type-filters" style={{ justifyContent: 'flex-start', marginTop: 'var(--spacing-md)' }}>
                    <span className="type-btn">📝 {t('history.record')} {safeHistory.length}</span>
                    <span className="type-btn">⚖️ {t('history.weight')} {weightCount}</span>
                    <span className="type-btn">❤️ {t('history.pressure')} {pressureCount}</span>
                    <span className="type-btn">🩸 {t('history.glucose')} {glucoseCount}</span>
                    <span className="type-btn">❤️ {t('history.heartRate') || 'النبض'} {heartRateCount}</span>
                    <span className="type-btn">💨 {t('history.spo2') || 'الأكسجين'} {spo2Count}</span>
                </div>
            </div>

            {/* حالة عدم وجود بيانات */}
            {safeHistory.length === 0 && !editingRecord && (
                <div className="analytics-empty">
                    <div className="empty-icon">📝</div>
                    <h3>{t('history.noRecords')}</h3>
                    <p>{t('history.startAdding')}</p>
                    <div className="type-filters" style={{ justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
                        <span className="type-btn">💡 {t('history.tip1')}</span>
                        <span className="type-btn">💡 {t('history.tip2')}</span>
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
                                            <span>📅</span> {t('history.date')} <span>{getSortIcon('recorded_at')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('weight_kg')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>⚖️</span> {t('history.weight')} <span>{getSortIcon('weight_kg')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('systolic_pressure')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>❤️</span> {t('history.bloodPressure')} <span>{getSortIcon('systolic_pressure')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('blood_glucose')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>🩸</span> {t('history.glucose')} <span>{getSortIcon('blood_glucose')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('heart_rate')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>❤️</span> {t('history.heartRate') || 'النبض'} <span>{getSortIcon('heart_rate')}</span>
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('spo2')} style={{ cursor: 'pointer', padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>💨</span> {t('history.spo2') || 'الأكسجين'} <span>{getSortIcon('spo2')}</span>
                                        </div>
                                    </th>
                                    <th style={{ padding: '0.75rem' }}>📈 {t('history.status')}</th>
                                    <th style={{ padding: '0.75rem' }}>⚙️ {t('history.actions')}</th>
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
                                                    <button onClick={() => setEditingRecord(record)} className="notification-action-btn" title={t('history.editTooltip')}>
                                                        ✏️
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(record.id)} className="notification-action-btn" title={t('history.deleteTooltip')}>
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
                                {i18n.language === 'ar' ? '→' : '←'}
                            </button>
                            <span className="stat-label">
                                {t('history.page')} {currentPage} {t('history.of')} {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="type-btn"
                            >
                                {i18n.language === 'ar' ? '←' : '→'}
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
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t('history.deleteConfirmTitle')}</h3>
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('history.deleteConfirmMessage')}</p>
                            <p style={{ color: 'var(--error)', fontSize: '0.8rem' }}>{t('history.irreversibleAction')}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setDeleteConfirm(null)} className="type-btn" style={{ flex: 1 }}>
                                {t('common.cancel')}
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="type-btn active" style={{ flex: 1, background: 'var(--error)', color: 'white' }}>
                                🗑️ {t('history.confirmDelete')}
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

            {/* الأنماط الإضافية */}
            <style>{`
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