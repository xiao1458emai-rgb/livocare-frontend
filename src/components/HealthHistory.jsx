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
    const [darkMode, setDarkMode] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isDeletingRef = useRef(false);

    // دالة مساعدة للتأكد من أن history مصفوفة
    const getSafeHistory = useCallback(() => {
        return Array.isArray(history) ? history : [];
    }, [history]);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ جلب البيانات - مع useCallback ومنع الطلبات المتزامنة
// ✅ تعديل دالة fetchHistory
const fetchHistory = useCallback(async () => {
    if (isFetchingRef.current || !isMountedRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
        const response = await axiosInstance.get('/health_status/');
        
        if (!isMountedRef.current) return;
        
        // ✅ معالجة البيانات - دعم results والمصفوفة
        let historyData = [];
        if (response.data?.results) {
            historyData = response.data.results;
        } else if (Array.isArray(response.data)) {
            historyData = response.data;
        } else {
            historyData = [];
        }
        
        console.log('📜 Health history loaded:', historyData.length, 'records');
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

    // ✅ جلب البيانات عند التغيير
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
                   record.blood_glucose?.toString().includes(searchLower);
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

    // طلب الفرز
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // ✅ الحذف مع تأكيد - مع منع الطلبات المتزامنة
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

    // ✅ حذف متعدد
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

    // تحديد/إلغاء تحديد كل السجلات
    const toggleSelectAll = () => {
        if (selectedRecords.length === paginatedHistory.length) {
            setSelectedRecords([]);
        } else {
            setSelectedRecords(paginatedHistory.map(r => r.id));
        }
    };

    // تحديد/إلغاء تحديد سجل
    const toggleSelect = (id) => {
        if (selectedRecords.includes(id)) {
            setSelectedRecords(selectedRecords.filter(recId => recId !== id));
        } else {
            setSelectedRecords([...selectedRecords, id]);
        }
    };

    // ✅ تنظيف عند إلغاء تحميل المكون
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
        
        if (record.systolic_pressure > 140 || record.diastolic_pressure > 90) {
            issues.push(t('history.highBP'));
        }
        if (record.systolic_pressure < 90 || record.diastolic_pressure < 60) {
            issues.push(t('history.lowBP'));
        }
        if (record.blood_glucose > 140) {
            issues.push(t('history.highGlucose'));
        }
        if (record.blood_glucose < 70) {
            issues.push(t('history.lowGlucose'));
        }
        if (record.weight_kg > 100) {
            issues.push(t('history.highWeight'));
        }
        if (record.weight_kg < 50) {
            issues.push(t('history.lowWeight'));
        }
        
        return issues.length > 0 ? issues : [t('history.normal')];
    };

    const getStatusColor = (status) => {
        if (status.includes(t('history.normal'))) return '#10b981';
        if (status.includes(t('history.high')) || status.includes(t('history.low'))) return '#f59e0b';
        return '#ef4444';
    };

    const getStatusIcon = (status) => {
        if (status.includes(t('history.normal'))) return '✅';
        if (status.includes(t('history.high'))) return '⚠️';
        if (status.includes(t('history.low'))) return '⚡';
        return '❌';
    };

    // ✅ استخدام history الآمن في الإحصائيات
    const safeHistory = getSafeHistory();
    const weightCount = safeHistory.filter(r => r.weight_kg).length;
    const pressureCount = safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure).length;
    const glucoseCount = safeHistory.filter(r => r.blood_glucose).length;

    if (loading) {
        return (
            <div className={`health-history-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">{t('history.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`health-history-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="error-container">
                    <div className="error-icon">⚠️</div>
                    <p className="error-message">{error}</p>
                    <button onClick={fetchHistory} className="retry-btn">
                        <span className="btn-icon">🔄</span>
                        <span className="btn-text">{t('history.retry')}</span>
                    </button>
                </div>
            </div>
        );
    }

    // دالة تنسيق التاريخ بناءً على اللغة
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
        return {
            date: date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            time: date.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit'
            }),
            full: date.toLocaleString(locale)
        };
    };

    return (
        <div className={`health-history-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس القسم */}
            <div className="section-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">📊</span>
                        {t('history.title')}
                    </h2>
                    <div className="header-controls">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder={t('history.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        {selectedRecords.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bulk-delete-btn"
                            >
                                <span className="btn-icon">🗑️</span>
                                <span className="btn-text">
                                    {t('history.deleteSelected', { count: selectedRecords.length })}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="stats-summary">
                    <div className="stat-item">
                        <span className="stat-icon">📝</span>
                        <span className="stat-label">{t('history.record')}</span>
                        <span className="stat-value">{safeHistory.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">⚖️</span>
                        <span className="stat-label">{t('history.weight')}</span>
                        <span className="stat-value">{weightCount}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">❤️</span>
                        <span className="stat-label">{t('history.pressure')}</span>
                        <span className="stat-value">{pressureCount}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">🩸</span>
                        <span className="stat-label">{t('history.glucose')}</span>
                        <span className="stat-value">{glucoseCount}</span>
                    </div>
                </div>
            </div>

            {/* حالة عدم وجود بيانات */}
            {safeHistory.length === 0 && !editingRecord && (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3 className="empty-title">{t('history.noRecords')}</h3>
                    <p className="empty-message">{t('history.startAdding')}</p>
                    <div className="empty-tips">
                        <div className="tip-item">
                            <span className="tip-icon">💡</span>
                            <span className="tip-text">{t('history.tip1')}</span>
                        </div>
                        <div className="tip-item">
                            <span className="tip-icon">💡</span>
                            <span className="tip-text">{t('history.tip2')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* جدول البيانات */}
            {safeHistory.length > 0 && (
                <>
                    <div className="table-container">
                        <table className="health-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={selectedRecords.length === paginatedHistory.length && paginatedHistory.length > 0}
                                            onChange={toggleSelectAll}
                                            className="select-checkbox"
                                        />
                                    </th>
                                    <th onClick={() => handleSort('recorded_at')} className="sortable">
                                        <span className="th-content">
                                            <span className="th-icon">📅</span>
                                            <span className="th-text">{t('history.date')}</span>
                                            <span className="sort-icon">{getSortIcon('recorded_at')}</span>
                                        </span>
                                    </th>
                                    <th onClick={() => handleSort('weight_kg')} className="sortable">
                                        <span className="th-content">
                                            <span className="th-icon">⚖️</span>
                                            <span className="th-text">{t('history.weight')}</span>
                                            <span className="sort-icon">{getSortIcon('weight_kg')}</span>
                                        </span>
                                    </th>
                                    <th onClick={() => handleSort('systolic_pressure')} className="sortable">
                                        <span className="th-content">
                                            <span className="th-icon">❤️</span>
                                            <span className="th-text">{t('history.bloodPressure')}</span>
                                            <span className="sort-icon">{getSortIcon('systolic_pressure')}</span>
                                        </span>
                                    </th>
                                    <th onClick={() => handleSort('blood_glucose')} className="sortable">
                                        <span className="th-content">
                                            <span className="th-icon">🩸</span>
                                            <span className="th-text">{t('history.glucose')}</span>
                                            <span className="sort-icon">{getSortIcon('blood_glucose')}</span>
                                        </span>
                                    </th>
                                    <th>📈 {t('history.status')}</th>
                                    <th>⚙️ {t('history.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.map((record) => {
                                    const { date, time } = formatDate(record.recorded_at);
                                    const statuses = getHealthStatus(record);
                                    
                                    return (
                                        <tr key={record.id} className={`table-row ${selectedRecords.includes(record.id) ? 'selected' : ''}`}>
                                            <td className="checkbox-cell">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRecords.includes(record.id)}
                                                    onChange={() => toggleSelect(record.id)}
                                                    className="select-checkbox"
                                                />
                                            </td>
                                            <td className="date-cell">
                                                <div className="date-display">{date}</div>
                                                <div className="time-display">{time}</div>
                                            </td>
                                            <td className="weight-cell">
                                                {record.weight_kg ? (
                                                    <span className="value">
                                                        {record.weight_kg}
                                                        <span className="unit">kg</span>
                                                    </span>
                                                ) : (
                                                    <span className="missing-data">—</span>
                                                )}
                                            </td>
                                            <td className="pressure-cell">
                                                {record.systolic_pressure && record.diastolic_pressure ? (
                                                    <div className="pressure-display">
                                                        <span className="systolic">{record.systolic_pressure}</span>
                                                        <span className="separator">/</span>
                                                        <span className="diastolic">{record.diastolic_pressure}</span>
                                                    </div>
                                                ) : (
                                                    <span className="missing-data">—</span>
                                                )}
                                            </td>
                                            <td className="glucose-cell">
                                                {record.blood_glucose ? (
                                                    <span className="value">
                                                        {record.blood_glucose}
                                                        <span className="unit">mg/dL</span>
                                                    </span>
                                                ) : (
                                                    <span className="missing-data">—</span>
                                                )}
                                            </td>
                                            <td className="status-cell">
                                                <div className="status-badges">
                                                    {statuses.map((status, index) => (
                                                        <span 
                                                            key={index}
                                                            className="status-badge"
                                                            style={{ 
                                                                backgroundColor: getStatusColor(status),
                                                                color: 'white'
                                                            }}
                                                            title={status}
                                                        >
                                                            <span className="status-icon">{getStatusIcon(status)}</span>
                                                            <span className="status-text">{status}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button 
                                                        onClick={() => setEditingRecord(record)}
                                                        className="btn-edit"
                                                        title={t('history.editTooltip')}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteConfirm(record.id)}
                                                        className="btn-delete"
                                                        title={t('history.deleteTooltip')}
                                                    >
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
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="pagination-btn"
                            >
                                {i18n.language === 'ar' ? '→' : '←'}
                            </button>
                            <span className="pagination-info">
                                {t('history.page')} {currentPage} {t('history.of')} {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="pagination-btn"
                            >
                                {i18n.language === 'ar' ? '←' : '→'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* نافذة تأكيد الحذف */}
            {deleteConfirm && (
                <div className="modal-backdrop">
                    <div className="confirm-modal">
                        <div className="modal-header">
                            <span className="modal-icon">⚠️</span>
                            <h3 className="modal-title">{t('history.deleteConfirmTitle')}</h3>
                        </div>
                        <div className="modal-body">
                            <p className="modal-message">{t('history.deleteConfirmMessage')}</p>
                            <p className="modal-warning">{t('history.irreversibleAction')}</p>
                        </div>
                        <div className="modal-actions">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
                                className="btn-cancel"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={() => handleDelete(deleteConfirm)}
                                className="btn-confirm-delete"
                            >
                                <span className="btn-icon">🗑️</span>
                                <span className="btn-text">{t('history.confirmDelete')}</span>
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


            <style jsx>{`
/* ===========================================
   HealthHistory.css - محسن للجوال والشاشات الكبيرة
   =========================================== */

/* الثيم الفاتح */
:root {
    --primary-bg: #ffffff;
    --secondary-bg: #f8fafc;
    --tertiary-bg: #f1f5f9;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #64748b;
    --border-light: #e2e8f0;
    --border-medium: #cbd5e1;
    --primary-color: #3b82f6;
    --primary-dark: #2563eb;
    --primary-light: #60a5fa;
    --success-color: #10b981;
    --success-bg: #d1fae5;
    --warning-color: #f59e0b;
    --warning-bg: #fef3c7;
    --error-color: #ef4444;
    --error-bg: #fee2e2;
    --info-color: #3b82f6;
    --info-bg: #dbeafe;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --transition-slow: 0.5s ease;
}

/* الثيم المظلم */
.dark-mode {
    --primary-bg: #0f172a;
    --secondary-bg: #1e293b;
    --tertiary-bg: #334155;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-light: #334155;
    --border-medium: #475569;
    --primary-color: #60a5fa;
    --primary-dark: #3b82f6;
    --primary-light: #93c5fd;
    --success-color: #4ade80;
    --success-bg: rgba(16, 185, 129, 0.2);
    --warning-color: #fbbf24;
    --warning-bg: rgba(245, 158, 11, 0.2);
    --error-color: #f87171;
    --error-bg: rgba(239, 68, 68, 0.2);
    --info-color: #60a5fa;
    --info-bg: rgba(59, 130, 246, 0.2);
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
}

.health-history-container {
    background: var(--card-bg);
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-xl);
    margin-top: 2rem;
    transition: all var(--transition-medium);
}

/* ===========================================
   رأس القسم
   =========================================== */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
    gap: 1rem;
}

.header-title {
    flex: 1;
}

.header-title h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: 700;
}

.title-icon {
    font-size: 1.8rem;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.search-box {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-tertiary);
    font-size: 0.9rem;
}

.search-input {
    padding: 0.6rem 1rem 0.6rem 2.3rem;
    border: 2px solid var(--border-light);
    border-radius: 12px;
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    min-width: 220px;
    transition: all var(--transition-fast);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.bulk-delete-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: var(--error-bg);
    color: var(--error-color);
    border: 1px solid var(--error-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.85rem;
    font-weight: 500;
}

.bulk-delete-btn:active {
    transform: scale(0.96);
}

.bulk-delete-btn:hover {
    background: var(--error-color);
    color: white;
    transform: translateY(-2px);
}

.stats-summary {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--secondary-bg);
    padding: 0.4rem 0.8rem;
    border-radius: 50px;
    border: 1px solid var(--border-light);
    transition: all var(--transition-fast);
}

.stat-item:active {
    transform: scale(0.96);
}

.stat-item:hover {
    transform: translateY(-2px);
}

.stat-icon {
    font-size: 1rem;
}

.stat-label {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.stat-value {
    color: var(--primary-color);
    font-weight: 700;
    font-size: 1rem;
}

/* ===========================================
   حالات التحميل
   =========================================== */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
}

.loading-spinner {
    width: 45px;
    height: 45px;
    border: 4px solid var(--border-light);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

/* حالة الخطأ */
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    padding: 2rem;
}

.error-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    animation: shake 0.5s ease;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.error-message {
    color: var(--error-color);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
}

.retry-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    background: var(--error-color);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--transition-medium);
    font-size: 0.85rem;
    font-weight: 500;
}

.retry-btn:active {
    transform: scale(0.96);
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* حالة عدم وجود بيانات */
.empty-state {
    text-align: center;
    padding: 3rem 2rem;
}

.empty-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    animation: float 3s infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}

.empty-title {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
}

.empty-message {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
}

.empty-tips {
    max-width: 380px;
    margin: 0 auto;
}

.tip-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem;
    background: var(--secondary-bg);
    border-radius: 10px;
    margin-bottom: 0.5rem;
}

.tip-item:last-child {
    margin-bottom: 0;
}

.tip-icon {
    font-size: 1rem;
}

.tip-text {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

/* ===========================================
   جدول البيانات
   =========================================== */
.table-container {
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid var(--border-light);
    background: var(--secondary-bg);
    margin-bottom: 1.5rem;
}

.health-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.health-table th {
    background: var(--tertiary-bg);
    padding: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-light);
    white-space: nowrap;
}

.th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.th-icon {
    font-size: 1rem;
}

.sortable {
    cursor: pointer;
    transition: background-color var(--transition-fast);
}

.sortable:hover {
    background: var(--primary-bg);
}

.sort-icon {
    color: var(--text-tertiary);
    font-size: 0.9rem;
}

.checkbox-cell {
    width: 40px;
    text-align: center;
}

.select-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--primary-color);
}

.table-row {
    transition: background-color var(--transition-fast);
}

.table-row:hover {
    background: var(--primary-bg);
}

.table-row.selected {
    background: var(--info-bg);
}

.health-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-secondary);
}

.date-cell {
    white-space: nowrap;
}

.date-display {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.85rem;
}

.time-display {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 0.1rem;
}

.value {
    font-weight: 600;
    color: var(--text-primary);
}

.unit {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-left: 0.2rem;
}

.missing-data {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: 0.8rem;
}

.pressure-display {
    display: flex;
    align-items: center;
    gap: 0.2rem;
}

.systolic {
    color: var(--error-color);
    font-weight: 600;
}

.diastolic {
    color: var(--warning-color);
    font-weight: 600;
}

.separator {
    color: var(--text-tertiary);
}

.status-cell {
    min-width: 130px;
}

.status-badges {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 500;
    white-space: nowrap;
}

.status-icon {
    font-size: 0.75rem;
}

.actions-cell {
    white-space: nowrap;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

.btn-edit, .btn-delete {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
}

.btn-edit:active, .btn-delete:active {
    transform: scale(0.9);
}

.btn-edit {
    background: var(--info-bg);
    color: var(--info-color);
}

.btn-edit:hover {
    background: var(--info-color);
    color: white;
    transform: scale(1.05);
}

.btn-delete {
    background: var(--error-bg);
    color: var(--error-color);
}

.btn-delete:hover {
    background: var(--error-color);
    color: white;
    transform: scale(1.05);
}

/* ===========================================
   Pagination
   =========================================== */
.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
}

.pagination-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: var(--secondary-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 1.1rem;
}

.pagination-btn:active {
    transform: scale(0.95);
}

.pagination-btn:hover:not(:disabled) {
    background: var(--primary-color);
    color: white;
    transform: scale(1.05);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-info {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

/* ===========================================
   Modal
   =========================================== */
.modal-backdrop {
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

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.confirm-modal {
    background: var(--card-bg);
    border-radius: 24px;
    padding: 1.5rem;
    max-width: 380px;
    width: 90%;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-xl);
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.modal-icon {
    font-size: 1.6rem;
}

.modal-title {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
}

.modal-body {
    margin-bottom: 1.5rem;
}

.modal-message {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.modal-warning {
    color: var(--error-color);
    font-size: 0.8rem;
}

.modal-actions {
    display: flex;
    gap: 0.75rem;
}

.btn-cancel {
    flex: 1;
    padding: 0.6rem;
    background: var(--secondary-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-weight: 500;
    font-size: 0.85rem;
}

.btn-cancel:active {
    transform: scale(0.96);
}

.btn-cancel:hover {
    background: var(--hover-bg);
}

.btn-confirm-delete {
    flex: 1;
    padding: 0.6rem;
    background: var(--error-color);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all var(--transition-fast);
    font-weight: 500;
    font-size: 0.85rem;
}

.btn-confirm-delete:active {
    transform: scale(0.96);
}

.btn-confirm-delete:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* ===========================================
   RTL دعم
   =========================================== */
[dir="rtl"] .search-icon {
    left: auto;
    right: 1rem;
}

[dir="rtl"] .search-input {
    padding: 0.6rem 2.3rem 0.6rem 1rem;
}

[dir="rtl"] .th-content {
    flex-direction: row-reverse;
}

[dir="rtl"] .unit {
    margin-left: 0;
    margin-right: 0.2rem;
}

[dir="rtl"] .status-badge {
    flex-direction: row-reverse;
}

[dir="rtl"] .pagination-btn {
    transform: scaleX(-1);
}

/* ===========================================
   تصميم متجاوب
   =========================================== */
@media (max-width: 1024px) {
    .stats-summary {
        width: 100%;
        justify-content: space-between;
    }
}

@media (max-width: 768px) {
    .health-history-container {
        padding: 1.25rem;
        border-radius: 20px;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .header-title h2 {
        font-size: 1.2rem;
    }

    .title-icon {
        font-size: 1.5rem;
    }

    .header-controls {
        width: 100%;
        flex-direction: column;
    }

    .search-box {
        width: 100%;
    }

    .search-input {
        width: 100%;
        min-width: auto;
    }

    .bulk-delete-btn {
        width: 100%;
        justify-content: center;
    }

    .stats-summary {
        flex-wrap: wrap;
    }

    .stat-item {
        flex: 1;
        min-width: 100px;
        justify-content: center;
    }

    .status-badges {
        flex-direction: row;
        flex-wrap: wrap;
    }

    .status-badge {
        width: auto;
    }

    .action-buttons {
        flex-direction: row;
    }

    .btn-edit, .btn-delete {
        width: 32px;
        height: 32px;
    }

    .pagination {
        gap: 0.75rem;
    }

    .pagination-btn {
        width: 32px;
        height: 32px;
        font-size: 1rem;
    }
}

@media (max-width: 480px) {
    .health-history-container {
        padding: 1rem;
        border-radius: 16px;
        margin-top: 1rem;
    }

    .section-header {
        margin-bottom: 1rem;
        padding-bottom: 1rem;
    }

    .header-title h2 {
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
    }

    .stats-summary {
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-item {
        width: 100%;
        justify-content: space-between;
    }

    .stat-label {
        font-size: 0.75rem;
    }

    .stat-value {
        font-size: 0.9rem;
    }

    .health-table th,
    .health-table td {
        padding: 0.5rem;
    }

    .date-display {
        font-size: 0.75rem;
    }

    .time-display {
        font-size: 0.6rem;
    }

    .value {
        font-size: 0.8rem;
    }

    .status-badge {
        font-size: 0.65rem;
        padding: 0.15rem 0.4rem;
    }

    .btn-edit, .btn-delete {
        width: 28px;
        height: 28px;
        font-size: 0.85rem;
    }

    .pagination-info {
        font-size: 0.75rem;
    }

    .pagination-btn {
        width: 28px;
        height: 28px;
        font-size: 0.9rem;
    }

    .confirm-modal {
        padding: 1.25rem;
        max-width: 320px;
    }

    .modal-title {
        font-size: 1rem;
    }

    .modal-message {
        font-size: 0.85rem;
    }

    .btn-cancel,
    .btn-confirm-delete {
        padding: 0.5rem;
        font-size: 0.8rem;
    }
}

/* الوضع الأفقي (Landscape) */
@media (max-height: 600px) and (orientation: landscape) {
    .health-history-container {
        padding: 1rem;
    }

    .loading-container,
    .error-container {
        min-height: 250px;
    }

    .empty-state {
        padding: 1.5rem;
    }

    .table-container {
        max-height: 300px;
        overflow-y: auto;
    }
}

/* للمستخدمين الذين يفضلون الحركة المنخفضة */
@media (prefers-reduced-motion: reduce) {
    .health-history-container,
    .stat-item,
    .bulk-delete-btn,
    .retry-btn,
    .btn-edit,
    .btn-delete,
    .pagination-btn,
    .btn-cancel,
    .btn-confirm-delete {
        transition: none;
    }
    
    .loading-spinner {
        animation: none;
    }
    
    .title-icon,
    .empty-icon {
        animation: none;
    }
    
    .stat-item:hover,
    .btn-edit:hover,
    .btn-delete:hover {
        transform: none;
    }
}

/* تحسينات اللمس للأجهزة المحمولة */
@media (hover: none) and (pointer: coarse) {
    .bulk-delete-btn:active,
    .retry-btn:active,
    .btn-edit:active,
    .btn-delete:active,
    .pagination-btn:active,
    .btn-cancel:active,
    .btn-confirm-delete:active {
        transform: scale(0.96);
    }
    
    .stat-item:active {
        transform: scale(0.96);
    }
}
            `}</style>
        </div>
    );
}

export default HealthHistory;