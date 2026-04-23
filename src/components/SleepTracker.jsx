import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';
import SleepAnalytics from './Analytics/SleepAnalytics';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب مدة النوم بالساعات
const calculateSleepDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        if (end <= start) return null;
        
        const durationMs = end - start;
        const durationHours = durationMs / (1000 * 60 * 60);
        
        if (durationHours < 1 || durationHours > 24) return null;
        
        return roundNumber(durationHours, 1);
    } catch (error) {
        console.error('Error calculating duration:', error);
        return null;
    }
};

// دالة لتنسيق التاريخ للعرض
const formatDateTime = (dateString, language) => {
    if (!dateString) return '—';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';
        
        return date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '—';
    }
};

// دالة للحصول على لون الجودة
const getQualityColor = (rating) => {
    const colors = {
        1: '#e74c3c',
        2: '#e67e22',
        3: '#f39c12',
        4: '#2ecc71',
        5: '#27ae60'
    };
    return colors[rating] || '#95a5a6';
};

function SleepTracker({ onDataSubmitted }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    const [sleepData, setSleepData] = useState({
        start_time: '',
        end_time: '',
        quality_rating: 3,
        notes: ''
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [sleepHistory, setSleepHistory] = useState([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const intervalRef = useRef(null);
    const isFetchingHistoryRef = useRef(false);

    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    const fetchSleepHistory = useCallback(async () => {
        if (isFetchingHistoryRef.current || !isMountedRef.current) return;
        
        isFetchingHistoryRef.current = true;
        setFetchingHistory(true);
        
        try {
            const response = await axiosInstance.get('/sleep/?limit=100');
            
            if (!isMountedRef.current) return;
            
            let historyData = [];
            if (response.data?.results) {
                historyData = response.data.results;
            } else if (Array.isArray(response.data)) {
                historyData = response.data;
            }
            
            console.log('🌙 Sleep history loaded:', historyData.length);
            setSleepHistory(historyData);
            
        } catch (err) {
            console.error('Failed to fetch sleep history:', err);
            if (isMountedRef.current) {
                setSleepHistory([]);
            }
        } finally {
            if (isMountedRef.current) {
                setFetchingHistory(false);
            }
            isFetchingHistoryRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchSleepHistory();
    }, [fetchSleepHistory]);

    useEffect(() => {
        if (sleepHistory.length > 0 && isMountedRef.current) {
            setRefreshAnalytics(prev => prev + 1);
        }
    }, [sleepHistory]);

    useEffect(() => {
        if (!autoRefresh) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                fetchSleepHistory();
                setLastUpdate(new Date());
            }
        }, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, fetchSleepHistory]);

    const currentDuration = useMemo(() => {
        return calculateSleepDuration(sleepData.start_time, sleepData.end_time);
    }, [sleepData.start_time, sleepData.end_time]);

    const validateSleepData = useCallback(() => {
        if (!sleepData.start_time || !sleepData.end_time) {
            return t('sleep.validation.requiredFields');
        }

        const start = new Date(sleepData.start_time);
        const end = new Date(sleepData.end_time);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return t('sleep.validation.invalidDates');
        }
        
        if (end <= start) {
            return t('sleep.validation.endBeforeStart');
        }

        const now = new Date();
        if (start > now) {
            return t('sleep.validation.futureTime');
        }

        const durationHours = (end - start) / (1000 * 60 * 60);
        
        if (durationHours > 24) {
            return t('sleep.validation.tooLong');
        }
        
        if (durationHours < 1) {
            return t('sleep.validation.tooShort');
        }

        return null;
    }, [sleepData.start_time, sleepData.end_time, t]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        setMessage('');
        setIsError(false);
        setLoading(true);

        const validationError = validateSleepData();
        if (validationError) {
            if (isMountedRef.current) {
                setMessage(validationError);
                setIsError(true);
                setLoading(false);
            }
            return;
        }

        isSubmittingRef.current = true;

        const formattedData = {
            start_time: new Date(sleepData.start_time).toISOString(),
            end_time: new Date(sleepData.end_time).toISOString(),
            quality_rating: parseInt(sleepData.quality_rating, 10),
            notes: sleepData.notes || ''
        };

        try {
            await axiosInstance.post('/sleep/', formattedData);
            
            if (isMountedRef.current) {
                setMessage(t('sleep.success.message'));
                setIsError(false);
                
                setSleepData({
                    start_time: '',
                    end_time: '',
                    quality_rating: 3,
                    notes: ''
                });
                
                await fetchSleepHistory();
                setRefreshAnalytics(prev => prev + 1);
                setLastUpdate(new Date());

                if (onDataSubmitted) onDataSubmitted();

                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 5000);
            }
        } catch (error) {
            console.error('Failed to log sleep:', error);
            
            if (isMountedRef.current) {
                let errorMessage = t('sleep.error.general');
                
                if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response?.status === 401) {
                    errorMessage = t('sleep.error.unauthorized');
                } else if (error.response?.status === 500) {
                    errorMessage = t('sleep.error.server');
                }
                
                setMessage(errorMessage);
                setIsError(true);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [sleepData, validateSleepData, fetchSleepHistory, onDataSubmitted, t]);

    const handleDeleteSleep = useCallback(async (sleepId) => {
        if (!window.confirm(t('sleep.deleteConfirm'))) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/sleep/${sleepId}/`);
            
            if (isMountedRef.current) {
                await fetchSleepHistory();
                setRefreshAnalytics(prev => prev + 1);
                setMessage(t('sleep.deleteSuccess'));
                setIsError(false);
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
        } catch (error) {
            console.error('Error deleting sleep:', error);
            if (isMountedRef.current) {
                setMessage(t('sleep.deleteError'));
                setIsError(true);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [fetchSleepHistory, t]);

    const resetForm = useCallback(() => {
        setSleepData({
            start_time: '',
            end_time: '',
            quality_rating: 3,
            notes: ''
        });
        setMessage('');
        setIsError(false);
    }, []);

    const stats = useMemo(() => {
        if (sleepHistory.length === 0) {
            return {
                avgHours: 0,
                avgQuality: 0,
                totalHours: 0,
                totalNights: 0
            };
        }

        let totalHours = 0;
        let totalQuality = 0;
        let validCount = 0;

        sleepHistory.forEach(sleep => {
            const duration = sleep.duration_hours || calculateSleepDuration(
                sleep.sleep_start || sleep.start_time,
                sleep.sleep_end || sleep.end_time
            );
            
            if (duration && duration > 0) {
                totalHours += duration;
                totalQuality += sleep.quality_rating || 3;
                validCount++;
            }
        });

        return {
            avgHours: validCount > 0 ? roundNumber(totalHours / validCount, 1) : 0,
            avgQuality: validCount > 0 ? roundNumber(totalQuality / validCount, 1) : 0,
            totalHours: roundNumber(totalHours, 1),
            totalNights: validCount
        };
    }, [sleepHistory]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <div className={`analytics-container ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* شريط التحكم - بدون أيقونة مكررة */}
            <div className="analytics-header">
                <h2>{t('sleep.title')}</h2>
                <div className="sleep-controls" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <label className="auto-refresh-toggle" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <span className="toggle-slider" style={{
                            width: '40px',
                            height: '20px',
                            background: autoRefresh ? 'var(--primary)' : 'var(--border-light)',
                            borderRadius: '20px',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}>
                            <span style={{
                                position: 'absolute',
                                width: '16px',
                                height: '16px',
                                background: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: autoRefresh ? '22px' : '2px',
                                transition: 'all var(--transition-fast)'
                            }}></span>
                        </span>
                        <span className="stat-label">{t('sleep.autoRefresh')}</span>
                    </label>
                    {lastUpdate && (
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            🕒 {t('sleep.lastUpdate')}: {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                        </div>
                    )}
                </div>
            </div>

            {/* نموذج إضافة النوم - بدون أيقونات مكررة */}
            <form onSubmit={handleSubmit} className="recommendations-section">
                <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--spacing-md)' }}>
                    <div className="field-group">
                        <label className="stat-label">{t('sleep.startTime')}</label>
                        <input
                            type="datetime-local"
                            name="start_time"
                            value={sleepData.start_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, start_time: e.target.value }))}
                            required
                            className="search-input"
                        />
                    </div>

                    <div className="field-group">
                        <label className="stat-label">{t('sleep.endTime')}</label>
                        <input
                            type="datetime-local"
                            name="end_time"
                            value={sleepData.end_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, end_time: e.target.value }))}
                            required
                            className="search-input"
                        />
                    </div>
                </div>

                {currentDuration && (
                    <div className="insight-card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                        <div className="insight-icon">⏱️</div>
                        <div className="insight-content">
                            <div className="rec-category">{t('sleep.calculatedDuration')}: <strong>{currentDuration}</strong> {t('sleep.hours')}</div>
                        </div>
                    </div>
                )}

                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label className="stat-label">{t('sleep.quality')}</label>
                    <div className="rating-selector">
                        <select
                            value={sleepData.quality_rating}
                            onChange={(e) => setSleepData(prev => ({ ...prev, quality_rating: parseInt(e.target.value, 10) }))}
                            className="search-input"
                            style={{ borderLeft: `4px solid ${getQualityColor(sleepData.quality_rating)}` }}
                        >
                            <option value={5}>5 - {t('sleep.quality.excellent')}</option>
                            <option value={4}>4 - {t('sleep.quality.good')}</option>
                            <option value={3}>3 - {t('sleep.quality.average')}</option>
                            <option value={2}>2 - {t('sleep.quality.poor')}</option>
                            <option value={1}>1 - {t('sleep.quality.bad')}</option>
                        </select>
                    </div>
                </div>

                <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label className="stat-label">{t('sleep.notes')} ({t('sleep.optional')})</label>
                    <textarea
                        rows="2"
                        value={sleepData.notes}
                        onChange={(e) => setSleepData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('sleep.notesPlaceholder')}
                        className="search-input"
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button type="submit" className="type-btn active" disabled={loading} style={{ flex: 1 }}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                {t('sleep.submitting')}
                            </>
                        ) : (
                            <>{t('sleep.submit')}</>
                        )}
                    </button>
                    
                    <button type="button" onClick={resetForm} className="type-btn" disabled={loading} style={{ flex: 1 }}>
                        {t('sleep.reset')}
                    </button>
                </div>

                {message && (
                    <div className={`notification-message ${isError ? 'error' : 'success'}`} style={{ marginTop: 'var(--spacing-md)' }}>
                        <span>{isError ? '❌' : '✅'}</span>
                        <span>{message}</span>
                        <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                )}
            </form>

            {/* بطاقات الإحصائيات */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <div className="stat-icon">🌙</div>
                    <div className="stat-content">
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('sleep.stats.avgHours')}</div>
                        <div className="stat-value" style={{ color: 'white' }}>{stats.avgHours}</div>
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('sleep.hours')}</div>
                    </div>
                </div>

                <div className="analytics-stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    <div className="stat-icon">⭐</div>
                    <div className="stat-content">
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('sleep.stats.avgQuality')}</div>
                        <div className="stat-value" style={{ color: 'white' }}>{stats.avgQuality}</div>
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>/ 5</div>
                    </div>
                </div>

                <div className="analytics-stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('sleep.stats.totalHours')}</div>
                        <div className="stat-value" style={{ color: 'white' }}>{stats.totalHours}</div>
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('sleep.hours')}</div>
                    </div>
                </div>

                <div className="analytics-stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('sleep.stats.nights')}</div>
                        <div className="stat-value" style={{ color: 'white' }}>{stats.totalNights}</div>
                        <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('sleep.stats.recorded')}</div>
                    </div>
                </div>
            </div>

            {/* سجل النوم - بدون أيقونات مكررة */}
            <div className="recommendations-section">
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <h3>{t('sleep.history')}</h3>
                    <button onClick={fetchSleepHistory} className="refresh-btn" disabled={fetchingHistory}>
                        {fetchingHistory ? '⏳' : '🔄'}
                    </button>
                </div>

                {fetchingHistory ? (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : sleepHistory.length === 0 ? (
                    <div className="analytics-empty">
                        <div className="empty-icon">🌙</div>
                        <h4>{t('sleep.noRecords')}</h4>
                        <p>{t('sleep.startRecording')}</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {sleepHistory.map((sleep) => {
                            const startTime = sleep.sleep_start || sleep.start_time;
                            const endTime = sleep.sleep_end || sleep.end_time;
                            const duration = sleep.duration_hours || calculateSleepDuration(startTime, endTime);
                            const quality = sleep.quality_rating || 3;
                            
                            return (
                                <div key={sleep.id} className="notification-card" style={{ borderTop: `3px solid ${getQualityColor(quality)}` }}>
                                    <div className="notification-header">
                                        <div className="notification-title">
                                            <span className="notification-time">{formatDateTime(startTime, isArabic ? 'ar' : 'en')}</span>
                                        </div>
                                        <div className="notification-actions">
                                            <button 
                                                onClick={() => {
                                                    setSleepData({
                                                        start_time: startTime?.slice(0, 16) || '',
                                                        end_time: endTime?.slice(0, 16) || '',
                                                        quality_rating: quality,
                                                        notes: sleep.notes || ''
                                                    });
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="notification-action-btn"
                                                title={t('common.edit')}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSleep(sleep.id)}
                                                className="notification-action-btn"
                                                title={t('common.delete')}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="notification-content">
                                        <div className="habit-stats" style={{ justifyContent: 'space-around' }}>
                                            <div className="stat-label">{t('sleep.duration')}</div>
                                            <div className="stat-value">{duration || '—'}</div>
                                            <div className="stat-label">{t('sleep.hours')}</div>
                                            <div className="stat-divider" style={{ width: '1px', height: '30px', background: 'var(--border-light)' }}></div>
                                            <div className="stat-label">{t('sleep.quality')}</div>
                                            <div className="stat-value" style={{ color: getQualityColor(quality) }}>{quality}</div>
                                            <div className="stat-label">/ 5</div>
                                        </div>
                                    </div>
                                    
                                    {sleep.notes && (
                                        <div className="rec-advice" style={{ marginTop: 'var(--spacing-sm)' }}>
                                            {sleep.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* التحليلات */}
            <div className="analytics-wrapper" style={{ marginTop: 'var(--spacing-lg)' }}>
                <SleepAnalytics refreshTrigger={refreshAnalytics} />
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .reduce-motion *,
                .reduce-motion *::before,
                .reduce-motion *::after {
                    animation-duration: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                }
                
                .reduce-motion .spinner {
                    animation: none !important;
                }
                
                .notification-message.success {
                    background: var(--success-bg);
                    color: var(--success);
                    border: 1px solid var(--success);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    justify-content: space-between;
                }
                
                .notification-message.error {
                    background: var(--error-bg);
                    color: var(--error);
                    border: 1px solid var(--error);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    justify-content: space-between;
                }
                
                .habit-stats {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .habit-stats .stat-value {
                    font-size: 1.2rem;
                    font-weight: bold;
                }
                
                @media (max-width: 768px) {
                    .habit-stats {
                        flex-direction: column;
                        gap: var(--spacing-xs);
                    }
                    
                    .stat-divider {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default SleepTracker;