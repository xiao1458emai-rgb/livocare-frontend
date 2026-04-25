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

        </div>
    );
}

export default SleepTracker;