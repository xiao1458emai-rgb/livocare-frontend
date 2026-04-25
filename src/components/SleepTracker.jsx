import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const formatDateTime = (dateString, isArabic) => {
    if (!dateString) return '—';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';
        
        return date.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
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
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
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
    const [isMobile, setIsMobile] = useState(false);
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const intervalRef = useRef(null);
    const isFetchingHistoryRef = useRef(false);

    // ✅ كشف حجم الشاشة للهواتف
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

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

    useEffect(() => {
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    // جلب سجل النوم
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
            return isArabic ? 'الرجاء إدخال وقت البدء والانتهاء' : 'Please enter start and end time';
        }

        const start = new Date(sleepData.start_time);
        const end = new Date(sleepData.end_time);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return isArabic ? 'تواريخ غير صالحة' : 'Invalid dates';
        }
        
        if (end <= start) {
            return isArabic ? 'وقت الانتهاء يجب أن يكون بعد وقت البدء' : 'End time must be after start time';
        }

        const now = new Date();
        if (start > now) {
            return isArabic ? 'لا يمكن تحديد وقت في المستقبل' : 'Cannot set future time';
        }

        const durationHours = (end - start) / (1000 * 60 * 60);
        
        if (durationHours > 24) {
            return isArabic ? 'مدة النوم طويلة جداً (أكثر من 24 ساعة)' : 'Sleep duration too long (more than 24 hours)';
        }
        
        if (durationHours < 1) {
            return isArabic ? 'مدة النوم قصيرة جداً (أقل من ساعة)' : 'Sleep duration too short (less than 1 hour)';
        }

        return null;
    }, [sleepData.start_time, sleepData.end_time, isArabic]);

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
                setMessage(isArabic ? '✅ تم تسجيل النوم بنجاح' : '✅ Sleep recorded successfully');
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
                let errorMessage = isArabic ? '❌ فشل تسجيل النوم' : '❌ Failed to record sleep';
                
                if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response?.status === 401) {
                    errorMessage = isArabic ? '❌ الرجاء تسجيل الدخول مرة أخرى' : '❌ Please login again';
                } else if (error.response?.status === 500) {
                    errorMessage = isArabic ? '⚠️ خطأ في الخادم' : '⚠️ Server error';
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
    }, [sleepData, validateSleepData, fetchSleepHistory, onDataSubmitted, isArabic]);

    const handleDeleteSleep = useCallback(async (sleepId) => {
        if (!window.confirm(isArabic ? '⚠️ هل أنت متأكد من حذف هذا السجل؟' : '⚠️ Are you sure you want to delete this record?')) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/sleep/${sleepId}/`);
            
            if (isMountedRef.current) {
                await fetchSleepHistory();
                setRefreshAnalytics(prev => prev + 1);
                setMessage(isArabic ? '✅ تم حذف السجل بنجاح' : '✅ Record deleted successfully');
                setIsError(false);
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
        } catch (error) {
            console.error('Error deleting sleep:', error);
            if (isMountedRef.current) {
                setMessage(isArabic ? '❌ خطأ في حذف السجل' : '❌ Error deleting record');
                setIsError(true);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [fetchSleepHistory, isArabic]);

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
        <div className={`sleep-tracker-container ${reducedMotion ? 'reduce-motion' : ''}`}>
            {/* ✅ رأس الصفحة */}
            <div className="sleep-header">
                <h2>
                    <span className="header-icon">🌙</span>
                    {isArabic ? 'تتبع النوم' : 'Sleep Tracker'}
                </h2>
                <div className="header-controls">
                    <label className="auto-refresh-label">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">🔄 {isArabic ? 'تلقائي' : 'Auto'}</span>
                    </label>
                    {lastUpdate && (
                        <div className="last-update">
                            🕐 {lastUpdate.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ نموذج إضافة النوم - محسن للهواتف */}
            <form onSubmit={handleSubmit} className="sleep-form">
                <div className="form-row">
                    <div className="form-field">
                        <label>
                            <span className="field-icon">😴</span>
                            {isArabic ? 'وقت النوم' : 'Sleep Start'}
                        </label>
                        <input
                            type="datetime-local"
                            name="start_time"
                            value={sleepData.start_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, start_time: e.target.value }))}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-field">
                        <label>
                            <span className="field-icon">🌅</span>
                            {isArabic ? 'وقت الاستيقاظ' : 'Wake Up'}
                        </label>
                        <input
                            type="datetime-local"
                            name="end_time"
                            value={sleepData.end_time}
                            onChange={(e) => setSleepData(prev => ({ ...prev, end_time: e.target.value }))}
                            required
                            className="form-input"
                        />
                    </div>
                </div>

                {currentDuration && (
                    <div className="duration-card">
                        <span className="duration-icon">⏱️</span>
                        <div className="duration-content">
                            <span className="duration-label">{isArabic ? 'المدة المحسوبة' : 'Calculated Duration'}</span>
                            <span className="duration-value">{currentDuration} <span className="duration-unit">{isArabic ? 'ساعات' : 'hours'}</span></span>
                        </div>
                    </div>
                )}

                <div className="form-field">
                    <label>
                        <span className="field-icon">⭐</span>
                        {isArabic ? 'جودة النوم' : 'Sleep Quality'}
                    </label>
                    <div className="quality-selector">
                        <select
                            value={sleepData.quality_rating}
                            onChange={(e) => setSleepData(prev => ({ ...prev, quality_rating: parseInt(e.target.value, 10) }))}
                            className="quality-select"
                            style={{ borderColor: getQualityColor(sleepData.quality_rating) }}
                        >
                            <option value="5">⭐️⭐️⭐️⭐️⭐️ - {isArabic ? 'ممتازة' : 'Excellent'}</option>
                            <option value="4">⭐️⭐️⭐️⭐️ - {isArabic ? 'جيدة' : 'Good'}</option>
                            <option value="3">⭐️⭐️⭐️ - {isArabic ? 'متوسطة' : 'Average'}</option>
                            <option value="2">⭐️⭐️ - {isArabic ? 'سيئة' : 'Poor'}</option>
                            <option value="1">⭐️ - {isArabic ? 'سيئة جداً' : 'Very Poor'}</option>
                        </select>
                    </div>
                </div>

                <div className="form-field">
                    <label>
                        <span className="field-icon">📝</span>
                        {isArabic ? 'ملاحظات' : 'Notes'}
                        <span className="optional">({isArabic ? 'اختياري' : 'Optional'})</span>
                    </label>
                    <textarea
                        rows={isMobile ? 2 : 3}
                        value={sleepData.notes}
                        onChange={(e) => setSleepData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={isArabic ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                        className="form-textarea"
                    />
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? (
                            <><span className="btn-spinner"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>
                        ) : (
                            <>{isArabic ? '💾 حفظ' : '💾 Save'}</>
                        )}
                    </button>
                    
                    <button type="button" onClick={resetForm} className="reset-btn" disabled={loading}>
                        🔄 {isArabic ? 'إعادة تعيين' : 'Reset'}
                    </button>
                </div>

                {message && (
                    <div className={`message-toast ${isError ? 'error' : 'success'}`}>
                        <span className="message-icon">{isError ? '❌' : '✅'}</span>
                        <span className="message-text">{message}</span>
                        <button className="message-close" onClick={() => setMessage('')}>✕</button>
                    </div>
                )}
            </form>

            {/* ✅ بطاقات الإحصائيات - محسنة للهواتف */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🌙</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.avgHours}</div>
                        <div className="stat-label">{isArabic ? 'متوسط النوم' : 'Avg Sleep'}</div>
                        <div className="stat-unit">{isArabic ? 'ساعات' : 'hours'}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.avgQuality}</div>
                        <div className="stat-label">{isArabic ? 'جودة النوم' : 'Sleep Quality'}</div>
                        <div className="stat-unit">/5</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalHours}</div>
                        <div className="stat-label">{isArabic ? 'إجمالي النوم' : 'Total Sleep'}</div>
                        <div className="stat-unit">{isArabic ? 'ساعات' : 'hours'}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalNights}</div>
                        <div className="stat-label">{isArabic ? 'ليالي مسجلة' : 'Nights'}</div>
                        <div className="stat-unit">{isArabic ? 'ليلة' : 'nights'}</div>
                    </div>
                </div>
            </div>

            {/* ✅ سجل النوم - محسن للهواتف */}
            <div className="sleep-history">
                <div className="history-header">
                    <h3>
                        <span className="header-icon">📋</span>
                        {isArabic ? 'سجل النوم' : 'Sleep History'}
                    </h3>
                    <button onClick={fetchSleepHistory} className="refresh-history-btn" disabled={fetchingHistory}>
                        {fetchingHistory ? '⏳' : '🔄'}
                    </button>
                </div>

                {fetchingHistory ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                ) : sleepHistory.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌙</div>
                        <h4>{isArabic ? 'لا توجد سجلات نوم' : 'No Sleep Records'}</h4>
                        <p>{isArabic ? 'ابدأ بتسجيل نومك' : 'Start recording your sleep'}</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {sleepHistory.map((sleep) => {
                            const startTime = sleep.sleep_start || sleep.start_time;
                            const endTime = sleep.sleep_end || sleep.end_time;
                            const duration = sleep.duration_hours || calculateSleepDuration(startTime, endTime);
                            const quality = sleep.quality_rating || 3;
                            
                            return (
                                <div key={sleep.id} className="history-item" style={{ borderTopColor: getQualityColor(quality) }}>
                                    <div className="item-header">
                                        <div className="item-date">
                                            {formatDateTime(startTime, isArabic)}
                                        </div>
                                        <div className="item-actions">
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
                                                title={isArabic ? 'تعديل' : 'Edit'}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSleep(sleep.id)}
                                                className="delete-btn"
                                                title={isArabic ? 'حذف' : 'Delete'}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="item-stats">
                                        <div className="stat-detail">
                                            <span className="detail-label">{isArabic ? 'المدة' : 'Duration'}</span>
                                            <span className="detail-value">{duration || '—'} <span className="detail-unit">{isArabic ? 'ساعة' : 'hr'}</span></span>
                                        </div>
                                        <div className="stat-detail">
                                            <span className="detail-label">{isArabic ? 'الجودة' : 'Quality'}</span>
                                            <span className="detail-value" style={{ color: getQualityColor(quality) }}>{quality}/5</span>
                                        </div>
                                    </div>
                                    
                                    {sleep.notes && (
                                        <div className="item-notes">
                                            💬 {sleep.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ✅ التحليلات */}
            <div className="analytics-wrapper">
                <SleepAnalytics refreshTrigger={refreshAnalytics} isArabic={isArabic} />
            </div>

            {/* ✅ أنماط CSS المحسنة */}
            <style jsx>{`
                .sleep-tracker-container {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                /* ===== رأس الصفحة ===== */
                .sleep-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .sleep-header h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .header-icon {
                    font-size: 1.5rem;
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .auto-refresh-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    border: 1px solid var(--border-light);
                }

                .auto-refresh-label input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    width: 36px;
                    height: 18px;
                    background: var(--border-light);
                    border-radius: 18px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all var(--transition-fast);
                }

                input:checked + .toggle-slider {
                    background: var(--primary);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(18px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-18px);
                }

                .toggle-text {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .last-update {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem 0.5rem;
                    background: var(--tertiary-bg);
                    border-radius: 12px;
                }

                /* ===== نموذج النوم ===== */
                .sleep-form {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                .form-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-field label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .field-icon {
                    font-size: 1rem;
                }

                .optional {
                    font-weight: normal;
                    color: var(--text-tertiary);
                    font-size: 0.7rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .form-textarea {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    resize: vertical;
                    font-family: inherit;
                }

                .form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .duration-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 12px;
                    margin-bottom: 1rem;
                }

                .duration-icon {
                    font-size: 1.3rem;
                }

                .duration-content {
                    flex: 1;
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .duration-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .duration-value {
                    font-weight: bold;
                    font-size: 1.1rem;
                    color: var(--success);
                }

                .duration-unit {
                    font-size: 0.7rem;
                    font-weight: normal;
                }

                .quality-selector {
                    position: relative;
                }

                .quality-select {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 2px solid;
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    cursor: pointer;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .submit-btn {
                    flex: 2;
                    padding: 0.75rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 12px;
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

                .reset-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    color: var(--text-secondary);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                }

                .reset-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                }

                .submit-btn:disabled,
                .reset-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                /* ===== رسائل ===== */
                .message-toast {
                    margin-top: 1rem;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .message-toast.success {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid #10b981;
                    color: #10b981;
                }

                .message-toast.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                }

                .message-text {
                    flex: 1;
                    font-size: 0.85rem;
                }

                .message-close {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 1rem;
                }

                /* ===== بطاقات الإحصائيات ===== */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .stat-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-fast);
                }

                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .stat-icon {
                    font-size: 1.8rem;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--hover-bg);
                    border-radius: 12px;
                }

                .stat-info {
                    flex: 1;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--text-primary);
                    line-height: 1.2;
                }

                .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .stat-unit {
                    font-size: 0.6rem;
                    color: var(--text-tertiary);
                }

                /* ===== سجل النوم ===== */
                .sleep-history {
                    background: var(--secondary-bg);
                    border-radius: 20px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                .history-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-light);
                }

                .history-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1rem;
                }

                .refresh-history-btn {
                    background: none;
                    border: none;
                    font-size: 1.1rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 8px;
                    transition: all var(--transition-fast);
                }

                .refresh-history-btn:hover:not(:disabled) {
                    background: var(--hover-bg);
                    transform: rotate(180deg);
                }

                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .history-item {
                    background: var(--card-bg);
                    border-radius: 14px;
                    padding: 1rem;
                    border: 1px solid var(--border-light);
                    border-top: 3px solid;
                    transition: all var(--transition-fast);
                }

                .history-item:hover {
                    transform: translateX(4px);
                    box-shadow: var(--shadow-sm);
                }

                [dir="rtl"] .history-item:hover {
                    transform: translateX(-4px);
                }

                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .item-date {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }

                .item-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .edit-btn,
                .delete-btn {
                    background: none;
                    border: none;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 6px;
                    transition: all var(--transition-fast);
                }

                .edit-btn:hover {
                    background: rgba(59, 130, 246, 0.1);
                    transform: scale(1.05);
                }

                .delete-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    transform: scale(1.05);
                }

                .item-stats {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                }

                .stat-detail {
                    display: flex;
                    align-items: baseline;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .detail-label {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                }

                .detail-value {
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: var(--text-primary);
                }

                .detail-unit {
                    font-size: 0.65rem;
                    font-weight: normal;
                    color: var(--text-tertiary);
                }

                .item-notes {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-light);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .loading-state,
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 1rem;
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .analytics-wrapper {
                    margin-top: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* ===== استجابة الهواتف ===== */
                @media (max-width: 768px) {
                    .sleep-tracker-container {
                        padding: 1rem;
                    }

                    .sleep-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-controls {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .sleep-form {
                        padding: 1rem;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 0.75rem;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .submit-btn,
                    .reset-btn {
                        width: 100%;
                    }

                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }

                    .stat-card {
                        padding: 0.75rem;
                    }

                    .stat-icon {
                        width: 35px;
                        height: 35px;
                        font-size: 1.3rem;
                    }

                    .stat-value {
                        font-size: 1.2rem;
                    }

                    .history-item {
                        padding: 0.75rem;
                    }

                    .item-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .item-stats {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .duration-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }

                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .stat-card {
                        flex-direction: row;
                        justify-content: space-between;
                    }

                    .stat-info {
                        text-align: right;
                    }

                    [dir="rtl"] .stat-info {
                        text-align: left;
                    }
                }

                /* ===== RTL دعم ===== */
                [dir="rtl"] .auto-refresh-label {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .stat-card {
                    flex-direction: row-reverse;
                }

                [dir="rtl"] .item-header {
                    flex-direction: row-reverse;
                }

                @media (max-width: 768px) {
                    [dir="rtl"] .item-header {
                        flex-direction: column;
                        align-items: flex-end;
                    }
                }

                /* ===== دعم الحركة المخفضة ===== */
                @media (prefers-reduced-motion: reduce) {
                    .spinner,
                    .btn-spinner {
                        animation: none;
                    }

                    .stat-card:hover,
                    .history-item:hover {
                        transform: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default SleepTracker;