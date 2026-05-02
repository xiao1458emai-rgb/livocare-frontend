import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';
import SleepAnalytics from './Analytics/SleepAnalytics';
import math from 'mathjs';

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
/* ===========================================
   SleepTracker.css - الأنماط الداخلية فقط
   ✅ تتبع النوم - تصميم مريح ومهدئ
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.sleep-tracker-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
    transition: all 0.2s ease;
}

.dark-mode .sleep-tracker-container {
    background: #1e293b;
    border-color: #334155;
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
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .sleep-header {
    border-bottom-color: #334155;
}

.sleep-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .sleep-header h2 {
    background: linear-gradient(135deg, #a78bfa, #f472b6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.header-icon {
    font-size: 1.5rem;
}

/* ===== أدوات التحكم ===== */
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
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .auto-refresh-label {
    background: #0f172a;
    border-color: #334155;
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
    background: var(--border-light, #e2e8f0);
    border-radius: 18px;
    position: relative;
    transition: all 0.2s;
}

.dark-mode .toggle-slider {
    background: #334155;
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
    transition: all 0.2s;
}

input:checked + .toggle-slider {
    background: #8b5cf6;
}

input:checked + .toggle-slider::before {
    transform: translateX(18px);
}

[dir="rtl"] input:checked + .toggle-slider::before {
    transform: translateX(-18px);
}

.toggle-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.last-update {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--text-tertiary, #94a3b8);
    padding: 0.25rem 0.5rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 12px;
}

/* ===== نموذج النوم ===== */
.sleep-form {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .sleep-form {
    background: #0f172a;
    border-color: #334155;
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
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .form-field label {
    color: #f1f5f9;
}

.field-icon {
    font-size: 1rem;
}

.optional {
    font-weight: 500;
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.7rem;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
    transition: all 0.2s;
}

.dark-mode .form-input {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.form-input:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.form-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
    resize: vertical;
    font-family: inherit;
}

.dark-mode .form-textarea {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

.form-textarea:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

/* بطاقة المدة المحسوبة */
.duration-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 14px;
    margin-bottom: 1rem;
    border-left: 3px solid #8b5cf6;
}

[dir="rtl"] .duration-card {
    border-left: none;
    border-right: 3px solid #8b5cf6;
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
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
}

.duration-value {
    font-weight: 800;
    font-size: 1.1rem;
    color: #8b5cf6;
}

.duration-unit {
    font-size: 0.7rem;
    font-weight: 500;
}

/* منتقي جودة النوم */
.quality-selector {
    position: relative;
}

.quality-select {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 2px solid;
    border-radius: 14px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary, #0f172a);
    cursor: pointer;
}

.dark-mode .quality-select {
    background: #1e293b;
    color: #f1f5f9;
}

/* أزرار الإجراء */
.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.submit-btn {
    flex: 2;
    padding: 0.75rem;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    color: white;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.reset-btn {
    flex: 1;
    padding: 0.75rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.2s;
}

.dark-mode .reset-btn {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
}

.reset-btn:hover:not(:disabled) {
    background: var(--hover-bg, #f1f5f9);
}

.submit-btn:disabled,
.reset-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
}

/* ===== رسائل الإشعارات ===== */
.message-toast {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    animation: slideIn 0.3s ease;
}

.message-toast.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
}

.message-toast.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.message-text {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 500;
}

.message-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

.message-close:hover {
    opacity: 1;
}

/* ===== بطاقات الإحصائيات ===== */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: all 0.2s;
}

.dark-mode .stat-card {
    background: #0f172a;
    border-color: #334155;
}

.stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.dark-mode .stat-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-icon {
    font-size: 1.8rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    border-radius: 16px;
    color: white;
}

.stat-info {
    flex: 1;
}

.stat-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-primary, #0f172a);
    line-height: 1.2;
}

.dark-mode .stat-value {
    color: #f1f5f9;
}

.stat-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary, #94a3b8);
}

.stat-unit {
    font-size: 0.6rem;
    font-weight: 500;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== سجل النوم ===== */
.sleep-history {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 22px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .sleep-history {
    background: #0f172a;
    border-color: #334155;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .history-header {
    border-bottom-color: #334155;
}

.history-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.refresh-history-btn {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 8px;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.refresh-history-btn:hover:not(:disabled) {
    background: var(--hover-bg, #f1f5f9);
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
    background: var(--card-bg, #ffffff);
    border-radius: 18px;
    padding: 1rem;
    border: 1px solid var(--border-light, #e2e8f0);
    border-top: 3px solid;
    transition: all 0.2s;
}

.dark-mode .history-item {
    background: #1e293b;
    border-color: #475569;
}

.history-item:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-tertiary, #94a3b8);
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
    transition: all 0.2s;
    opacity: 0.6;
}

.edit-btn:hover {
    opacity: 1;
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.05);
}

.delete-btn:hover {
    opacity: 1;
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
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary, #94a3b8);
}

.detail-value {
    font-weight: 800;
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .detail-value {
    color: #f1f5f9;
}

.detail-unit {
    font-size: 0.6rem;
    font-weight: 500;
    color: var(--text-tertiary, #94a3b8);
}

.item-notes {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
}

/* ===== حالات التحميل والبيانات الفارغة ===== */
.loading-state,
.empty-state {
    text-align: center;
    padding: 2rem;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state h4 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.empty-state p {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
}

.analytics-wrapper {
    margin-top: 1rem;
}

/* ===== أنيميشن ===== */
@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .stat-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .duration-card {
    flex-direction: row-reverse;
}

[dir="rtl"] .message-toast {
    flex-direction: row-reverse;
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .spinner,
    .btn-spinner {
        animation: none;
    }
    
    .message-toast {
        animation: none;
    }
    
    .stat-card:hover,
    .history-item:hover,
    .submit-btn:hover:not(:disabled),
    .edit-btn:hover,
    .delete-btn:hover {
        transform: none;
    }
    
    .refresh-history-btn:hover:not(:disabled) {
        transform: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .history-item {
        border-top-width: 4px;
    }
    
    .duration-card {
        border-left-width: 4px;
    }
    
    [dir="rtl"] .duration-card {
        border-right-width: 4px;
    }
    
    .message-toast {
        border-width: 2px;
    }
}
            `}</style>
        </div>
    );
}

export default SleepTracker;