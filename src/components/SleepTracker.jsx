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

// دالة للحصول على نص جودة النوم
const getQualityText = (rating, t) => {
    const texts = {
        1: t('sleep.quality.bad'),
        2: t('sleep.quality.poor'),
        3: t('sleep.quality.average'),
        4: t('sleep.quality.good'),
        5: t('sleep.quality.excellent')
    };
    return texts[rating] || t('sleep.quality.unknown');
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
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('livocare_darkMode');
        return saved === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [reducedMotion, setReducedMotion] = useState(false);
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const intervalRef = useRef(null);
    const isFetchingHistoryRef = useRef(false);

    // التحقق من تفضيلات الحركة المخفضة
    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    // ✅ جلب سجل النوم - مع useCallback ومنع الطلبات المتزامنة
    const fetchSleepHistory = useCallback(async () => {
        if (isFetchingHistoryRef.current || !isMountedRef.current) return;
        
        isFetchingHistoryRef.current = true;
        setFetchingHistory(true);
        
        try {
            const response = await axiosInstance.get('/sleep/?limit=20');
            if (isMountedRef.current) {
                const historyData = Array.isArray(response.data) ? response.data : [];
                setSleepHistory(historyData);
            }
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

    // ✅ جلب سجل النوم عند التحميل
    useEffect(() => {
        fetchSleepHistory();
    }, [fetchSleepHistory]);

    // تحديث التحليلات
    useEffect(() => {
        if (sleepHistory.length > 0 && isMountedRef.current) {
            setRefreshAnalytics(prev => prev + 1);
        }
    }, [sleepHistory]);

    // تطبيق الوضع المظلم
    useEffect(() => {
        const html = document.documentElement;
        if (darkMode) {
            html.classList.add('dark-mode');
        } else {
            html.classList.remove('dark-mode');
        }
    }, [darkMode]);

    // ✅ التحديث التلقائي - مع تنظيف صحيح
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

    // حساب مدة النوم الحالية
    const currentDuration = useMemo(() => {
        return calculateSleepDuration(sleepData.start_time, sleepData.end_time);
    }, [sleepData.start_time, sleepData.end_time]);

    // التحقق من صحة البيانات
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

    // ✅ إرسال البيانات - مع منع الطلبات المتزامنة
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

    // ✅ حذف سجل
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

    // إعادة تعيين النموذج
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

    // تبديل الوضع المظلم
    const toggleDarkMode = useCallback(() => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('livocare_darkMode', newDarkMode.toString());
    }, [darkMode]);

    // الإحصائيات المحسوبة
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

    // ✅ تنظيف عند إلغاء تحميل المكون
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
        <div className={`sleep-tracker-container ${darkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* شريط التحكم */}
            <div className="control-bar">
                <div className="control-bar-left">
                    <span className="tracker-icon" aria-hidden="true">🌙</span>
                    <h2 className="tracker-title">{t('sleep.title')}</h2>
                </div>
                
                <div className="control-bar-right">
                    <button 
                        className="theme-toggle"
                        onClick={toggleDarkMode}
                        aria-label={darkMode ? t('sleep.lightMode') : t('sleep.darkMode')}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* خيارات التحديث */}
            <div className="sleep-controls">
                <label className="auto-refresh-toggle">
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{t('sleep.autoRefresh')}</span>
                </label>
                {lastUpdate && (
                    <div className="last-update">
                        <span>🕒</span>
                        <span>{t('sleep.lastUpdate')}: {lastUpdate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                )}
            </div>

            {/* نموذج الإضافة */}
            <form onSubmit={handleSubmit} className="sleep-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>
                            <span>⏰</span> {t('sleep.startTime')}
                        </label>
                        <input
                            type="datetime-local"
                            name="start_time"
                            value={sleepData.start_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, start_time: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            <span>⏰</span> {t('sleep.endTime')}
                        </label>
                        <input
                            type="datetime-local"
                            name="end_time"
                            value={sleepData.end_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, end_time: e.target.value }))}
                            required
                        />
                    </div>
                </div>

                {currentDuration && (
                    <div className="sleep-duration-info">
                        <span>⏱️</span>
                        <span>{t('sleep.calculatedDuration')}: <strong>{currentDuration}</strong> {t('sleep.hours')}</span>
                    </div>
                )}

                <div className="form-group">
                    <label>
                        <span>⭐</span> {t('sleep.quality')}
                    </label>
                    <div className="rating-selector">
                        <select
                            value={sleepData.quality_rating}
                            onChange={(e) => setSleepData(prev => ({ ...prev, quality_rating: parseInt(e.target.value, 10) }))}
                            style={{ borderLeft: `4px solid ${getQualityColor(sleepData.quality_rating)}` }}
                        >
                            <option value={5}>5 - {t('sleep.quality.excellent')} 😊</option>
                            <option value={4}>4 - {t('sleep.quality.good')} 🙂</option>
                            <option value={3}>3 - {t('sleep.quality.average')} 😐</option>
                            <option value={2}>2 - {t('sleep.quality.poor')} 😞</option>
                            <option value={1}>1 - {t('sleep.quality.bad')} 😢</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>
                        <span>📝</span> {t('sleep.notes')} ({t('sleep.optional')})
                    </label>
                    <textarea
                        rows="2"
                        value={sleepData.notes}
                        onChange={(e) => setSleepData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('sleep.notesPlaceholder')}
                    />
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                {t('sleep.submitting')}
                            </>
                        ) : (
                            <>
                                <span>💾</span>
                                {t('sleep.submit')}
                            </>
                        )}
                    </button>
                    
                    <button type="button" onClick={resetForm} className="reset-btn" disabled={loading}>
                        <span>🔄</span>
                        {t('sleep.reset')}
                    </button>
                </div>

                {message && (
                    <div className={`message ${isError ? 'error' : 'success'}`}>
                        <span>{isError ? '❌' : '✅'}</span>
                        <span>{message}</span>
                        <button onClick={() => setMessage('')} className="dismiss-btn">✕</button>
                    </div>
                )}
            </form>

            {/* بطاقات الإحصائيات */}
            <div className="stats-cards">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="stat-icon">🌙</div>
                    <div className="stat-title">{t('sleep.stats.avgHours')}</div>
                    <div className="stat-value">{stats.avgHours}</div>
                    <div className="stat-unit">{t('sleep.hours')}</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <div className="stat-icon">⭐</div>
                    <div className="stat-title">{t('sleep.stats.avgQuality')}</div>
                    <div className="stat-value">{stats.avgQuality}</div>
                    <div className="stat-unit">/ 5</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <div className="stat-icon">📊</div>
                    <div className="stat-title">{t('sleep.stats.totalHours')}</div>
                    <div className="stat-value">{stats.totalHours}</div>
                    <div className="stat-unit">{t('sleep.hours')}</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <div className="stat-icon">📅</div>
                    <div className="stat-title">{t('sleep.stats.nights')}</div>
                    <div className="stat-value">{stats.totalNights}</div>
                    <div className="stat-unit">{t('sleep.stats.recorded')}</div>
                </div>
            </div>

            {/* سجل النوم */}
            <div className="sleep-history-section">
                <div className="history-header">
                    <h3>
                        <span>📋</span> {t('sleep.history')}
                    </h3>
                    <button onClick={fetchSleepHistory} className="refresh-btn" disabled={fetchingHistory}>
                        {fetchingHistory ? '⏳' : '🔄'}
                    </button>
                </div>

                {fetchingHistory ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : sleepHistory.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌙</div>
                        <h4>{t('sleep.noRecords')}</h4>
                        <p>{t('sleep.startRecording')}</p>
                    </div>
                ) : (
                    <div className="history-grid">
                        {sleepHistory.map((sleep) => {
                            const startTime = sleep.sleep_start || sleep.start_time;
                            const endTime = sleep.sleep_end || sleep.end_time;
                            const duration = sleep.duration_hours || calculateSleepDuration(startTime, endTime);
                            const quality = sleep.quality_rating || 3;
                            
                            return (
                                <div key={sleep.id} className="history-card" style={{ borderTopColor: getQualityColor(quality) }}>
                                    <div className="card-date">
                                        <span>📅</span>
                                        <span>{formatDateTime(startTime, i18n.language)}</span>
                                    </div>
                                    
                                    <div className="card-stats">
                                        <div className="card-stat">
                                            <div className="stat-label">{t('sleep.duration')}</div>
                                            <div className="stat-value">{duration || '—'}</div>
                                            <div className="stat-unit">{t('sleep.hours')}</div>
                                        </div>
                                        <div className="stat-divider"></div>
                                        <div className="card-stat">
                                            <div className="stat-label">{t('sleep.quality')}</div>
                                            <div className="stat-value" style={{ color: getQualityColor(quality) }}>{quality}</div>
                                            <div className="stat-unit">/ 5</div>
                                        </div>
                                    </div>
                                    
                                    {sleep.notes && (
                                        <div className="card-notes">
                                            <span>📝</span>
                                            <span>{sleep.notes}</span>
                                        </div>
                                    )}
                                    
                                    <div className="card-actions">
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
                                            className="edit-btn"
                                            title={t('common.edit')}
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSleep(sleep.id)}
                                            className="delete-btn"
                                            title={t('common.delete')}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* التحليلات */}
            <div className="analytics-wrapper">
                <SleepAnalytics refreshTrigger={refreshAnalytics} />
            </div>

            <style jsx>{`
                .sleep-tracker-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 24px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                /* شريط التحكم */
                .control-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .control-bar-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .tracker-icon {
                    font-size: 2rem;
                }

                .tracker-title {
                    margin: 0;
                    font-size: 1.5rem;
                    color: var(--text-primary);
                }

                .control-bar-right {
                    display: flex;
                    gap: 12px;
                }

                .theme-toggle {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 20px;
                    background: var(--bg-secondary);
                    cursor: pointer;
                    font-size: 1.2rem;
                }

                /* خيارات التحديث */
                .sleep-controls {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .auto-refresh-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .auto-refresh-toggle input {
                    position: absolute;
                    opacity: 0;
                }

                .toggle-slider {
                    width: 40px;
                    height: 20px;
                    background: var(--border-color);
                    border-radius: 20px;
                    position: relative;
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: 0.2s;
                }

                input:checked + .toggle-slider {
                    background: var(--primary-color);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(20px);
                }

                .last-update {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                /* النموذج */
                .sleep-form {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .form-group {
                    margin-bottom: 16px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .form-group input,
                .form-group select,
                .form-group textarea {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }

                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary-color);
                }

                .sleep-duration-info {
                    background: var(--bg-primary);
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .form-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .submit-btn,
                .reset-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .submit-btn {
                    background: var(--primary-color);
                    color: white;
                }

                .reset-btn {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* الرسائل */
                .message {
                    margin-top: 16px;
                    padding: 12px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    justify-content: space-between;
                }

                .message.success {
                    background: var(--success-bg);
                    color: var(--success-color);
                }

                .message.error {
                    background: var(--error-bg);
                    color: var(--error-color);
                }

                .dismiss-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.1rem;
                }

                /* بطاقات الإحصائيات */
                .stats-cards {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    padding: 20px;
                    border-radius: 20px;
                    color: white;
                    text-align: center;
                }

                .stat-icon {
                    font-size: 2rem;
                    margin-bottom: 8px;
                }

                .stat-title {
                    font-size: 0.85rem;
                    opacity: 0.9;
                    margin-bottom: 8px;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: bold;
                }

                .stat-unit {
                    font-size: 0.8rem;
                    opacity: 0.8;
                }

                /* سجل النوم */
                .sleep-history-section {
                    background: var(--bg-secondary);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .history-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .history-header h3 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .refresh-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 18px;
                    background: var(--bg-primary);
                    cursor: pointer;
                }

                .history-grid {
                    display: grid;
                    gap: 12px;
                }

                .history-card {
                    background: var(--bg-primary);
                    border-radius: 16px;
                    padding: 16px;
                    border-top: 3px solid;
                }

                .card-date {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                }

                .card-stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .card-stat {
                    text-align: center;
                    flex: 1;
                }

                .card-stat .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .card-stat .stat-value {
                    font-size: 1.2rem;
                    font-weight: bold;
                }

                .stat-divider {
                    width: 1px;
                    height: 40px;
                    background: var(--border-color);
                }

                .card-notes {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    font-size: 0.85rem;
                    margin-bottom: 12px;
                }

                .card-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .edit-btn,
                .delete-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    background: var(--bg-secondary);
                }

                .edit-btn:hover {
                    background: var(--primary-color);
                    color: white;
                }

                .delete-btn:hover {
                    background: var(--error-color);
                    color: white;
                }

                /* حالات فارغة */
                .loading-state,
                .empty-state {
                    text-align: center;
                    padding: 40px;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }

                .analytics-wrapper {
                    margin-top: 24px;
                }

                /* استجابة */
                @media (max-width: 768px) {
                    .sleep-tracker-container {
                        padding: 12px;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                    
                    .stats-cards {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .card-stats {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .stat-divider {
                        width: 100%;
                        height: 1px;
                    }
                }

                @media (max-width: 480px) {
                    .stats-cards {
                        grid-template-columns: 1fr;
                    }
                    
                    .form-actions {
                        flex-direction: column;
                    }
                }

                /* الثيم المظلم */
                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #667eea;
                    --success-bg: rgba(46, 204, 113, 0.2);
                    --error-bg: rgba(231, 76, 60, 0.2);
                }

                .reduce-motion * {
                    animation-duration: 0.01ms !important;
                }
            `}</style>
        </div>
    );
}

export default SleepTracker;