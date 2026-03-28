'use client'
// src/components/ActivityForm.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import watchService from '../services/watchService';
import '../index.css';

const ActivityForm = ({ onDataSubmitted, onActivityChange }) => {
    const { t, i18n } = useTranslation();
    
    const [editingId, setEditingId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    
    // ✅ حالة الساعة الذكية
    const [watchConnected, setWatchConnected] = useState(false);
    const [watchConnecting, setWatchConnecting] = useState(false);
    const [watchHeartRate, setWatchHeartRate] = useState(null);
    const [watchBloodPressure, setWatchBloodPressure] = useState(null);
    const [watchData, setWatchData] = useState({
        heartRate: null,
        bloodPressure: null,
        lastUpdate: null
    });
    const [watchAlerts, setWatchAlerts] = useState([]);
    const [watchSupported, setWatchSupported] = useState(true);
    const [adbModeActive, setAdbModeActive] = useState(false);
    const [adbServerStatus, setAdbServerStatus] = useState('disconnected');
// ActivityForm.jsx - استبدل الـ useEffect الحالي بهذا:
useEffect(() => {
    // ✅ تفعيل ADB Mode بالقوة على الهاتف
    const enableADB = () => {
        const isTouchDevice = 'ontouchstart' in window;
        const isMobileScreen = window.innerWidth <= 768;
        const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        
        if (isTouchDevice || isMobileScreen || isMobileUA) {
            console.log('📱 Mobile device detected - forcing ADB Mode');
            
            // ✅ استخدام الدالة الجديدة
            watchService.setMobileMode(true, '192.168.8.187');
            
            // الاتصال بـ ADB Monitor
            watchService.connectADBMonitor();
        }
    };
    
    enableADB();
}, []);
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        notes: ''
    });

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        setWatchSupported(watchService.isSupported());
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => setDarkMode(e.detail?.darkMode ?? false);
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // ✅ استماع لبيانات الساعة عبر watchService
    useEffect(() => {
        const handleWatchData = (type, data) => {
            console.log('📊 Watch data received:', type, data);
            
            if (type === 'heartRate') {
                setWatchHeartRate(data);
                setWatchData(prev => ({ ...prev, heartRate: data, lastUpdate: new Date() }));
                
                // تنبيه للقراءات غير الطبيعية
                if (data > 100) {
                    setWatchAlerts(prev => [`⚠️ ارتفاع ضربات القلب: ${data} BPM`, ...prev].slice(0, 3));
                    setTimeout(() => setWatchAlerts(prev => prev.slice(1)), 5000);
                } else if (data < 60) {
                    setWatchAlerts(prev => [`⚠️ انخفاض ضربات القلب: ${data} BPM`, ...prev].slice(0, 3));
                    setTimeout(() => setWatchAlerts(prev => prev.slice(1)), 5000);
                }
            }
            
            if (type === 'bloodPressure') {
                setWatchBloodPressure(data);
                setWatchData(prev => ({ ...prev, bloodPressure: data, lastUpdate: new Date() }));
                
                // تنبيه للضغط غير الطبيعي
                if (data.systolic > 140 || data.diastolic > 90) {
                    setWatchAlerts(prev => [`⚠️ ارتفاع الضغط: ${data.systolic}/${data.diastolic}`, ...prev].slice(0, 3));
                    setTimeout(() => setWatchAlerts(prev => prev.slice(1)), 5000);
                } else if (data.systolic < 90 || data.diastolic < 60) {
                    setWatchAlerts(prev => [`⚠️ انخفاض الضغط: ${data.systolic}/${data.diastolic}`, ...prev].slice(0, 3));
                    setTimeout(() => setWatchAlerts(prev => prev.slice(1)), 5000);
                }
            }
            
            if (type === 'connected') {
                setWatchConnected(true);
                setAdbModeActive(true);
                setAdbServerStatus('connected');
                setMessage('✅ تم الاتصال بـ ADB Monitor');
                setTimeout(() => setMessage(''), 3000);
            }
            
            if (type === 'disconnected') {
                setWatchConnected(false);
                setAdbModeActive(false);
                setAdbServerStatus('disconnected');
                setMessage('🔌 تم قطع الاتصال بـ ADB Monitor');
                setTimeout(() => setMessage(''), 3000);
            }
            
            if (type === 'error') {
                setAdbServerStatus('error');
                setError('فشل الاتصال بـ ADB Monitor. تأكد من تشغيل الخادم على الحاسوب');
                setTimeout(() => setError(null), 5000);
            }
        };
        
        watchService.onData(handleWatchData);
        
        return () => {
            // تنظيف الـ callback
            const index = watchService.onDataCallbacks.indexOf(handleWatchData);
            if (index > -1) watchService.onDataCallbacks.splice(index, 1);
        };
    }, []);

    // ✅ دالة الاتصال عبر ADB
    const connectADB = async () => {
        setWatchConnecting(true);
        setAdbServerStatus('connecting');
        
        try {
            // تفعيل وضع ADB في الخدمة
            watchService.enableADBMode();
            
            // محاولة الاتصال بـ ADB Monitor
            const success = await watchService.connectToWatch();
            
            if (success) {
                setWatchConnected(true);
                setAdbModeActive(true);
                setAdbServerStatus('connected');
                setMessage('✅ تم الاتصال بـ ADB Monitor بنجاح');
                setTimeout(() => setMessage(''), 3000);
            } else {
                throw new Error('فشل الاتصال');
            }
        } catch (error) {
            console.error('ADB connection failed:', error);
            setAdbServerStatus('error');
            setError('❌ فشل الاتصال بـ ADB Monitor. تأكد من: 1) تشغيل خادم ADB على الحاسوب 2) اتصال الهاتف عبر USB 3) تفعيل تصحيح USB');
            setTimeout(() => setError(null), 8000);
        } finally {
            setWatchConnecting(false);
        }
    };

    // ✅ دالة فصل الاتصال
    const disconnectADB = () => {
        watchService.disableADBMode();
        setWatchConnected(false);
        setAdbModeActive(false);
        setAdbServerStatus('disconnected');
        setWatchHeartRate(null);
        setWatchBloodPressure(null);
        setWatchData({ heartRate: null, bloodPressure: null, lastUpdate: null });
        setMessage('🔌 تم فصل الاتصال بـ ADB Monitor');
        setTimeout(() => setMessage(''), 3000);
    };

    // ✅ إضافة بيانات الساعة كنشاط
    const addWatchDataAsActivity = async () => {
        if (!watchHeartRate && !watchBloodPressure) {
            setError('لا توجد بيانات من الساعة');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        
        const notes = [];
        if (watchHeartRate) notes.push(`ضربات القلب: ${watchHeartRate} BPM`);
        if (watchBloodPressure) notes.push(`ضغط الدم: ${watchBloodPressure.systolic}/${watchBloodPressure.diastolic}`);
        
        const watchActivity = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: watchData.lastUpdate ? new Date(watchData.lastUpdate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            notes: `بيانات من الساعة الذكية - ${notes.join(' - ')}`
        };
        
        const calculatedCalories = calculateCalories('walking', 30);
        const dataToSend = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: watchActivity.start_time,
            calories_burned: calculatedCalories,
            notes: watchActivity.notes
        };

        try {
            const response = await axiosInstance.post('/activities/', dataToSend);
            setActivities(prev => [{ ...response.data, activity_type: 'walking' }, ...prev]);
            setMessage('✅ تم إضافة بيانات الساعة كنشاط');
            setTimeout(() => setMessage(''), 3000);
            if (onActivityChange) onActivityChange();
            if (onDataSubmitted) onDataSubmitted();
        } catch (err) {
            console.error('خطأ:', err);
            setError('فشل في إضافة بيانات الساعة');
        } finally {
            setLoading(false);
        }
    };

    // ✅ طلب قياس جديد
    const requestMeasurement = async () => {
        setLoading(true);
        try {
            await watchService.requestMeasurement();
            setMessage('📱 تم إرسال طلب القياس. افتح تطبيق FitPro وقم بالقياس');
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            console.error('Measurement request failed:', error);
            setError('فشل طلب القياس');
        } finally {
            setLoading(false);
        }
    };

    // باقي الدوال كما هي...
    const CALORIES_PER_MINUTE = {
        'walking': 3.5, 'running': 10.0, 'weightlifting': 4.0, 'swimming': 7.0,
        'yoga': 2.5, 'pilates': 3.0, 'cardio': 8.0, 'cycling': 6.0,
        'football': 7.5, 'basketball': 8.0, 'tennis': 6.5, 'other': 4.0
    };

    useEffect(() => { fetchActivities(); }, []);

    const fetchActivities = async () => {
        try {
            setFetching(true);
            const response = await axiosInstance.get('/activities/');
            setActivities(Array.isArray(response.data) ? response.data : []);
            if (onActivityChange) onActivityChange();
            setError(null);
        } catch (err) {
            console.error('خطأ في جلب الأنشطة:', err);
            setError(t('activities.fetchError'));
            setActivities([]);
        } finally {
            setFetching(false);
        }
    };

    const calculateCalories = (activityType, durationMinutes) => {
        const duration = parseInt(durationMinutes) || 0;
        const caloriesPerMinute = CALORIES_PER_MINUTE[activityType] || 4.0;
        return Math.round(duration * caloriesPerMinute * 1);
    };

    const loadActivityForEdit = (activity) => {
        setEditingId(activity.id);
        setIsEditing(true);
        setFormData({
            activity_type: activity.activity_type || '',
            duration_minutes: activity.duration_minutes?.toString() || '',
            start_time: activity.start_time ? new Date(activity.start_time).toISOString().slice(0, 16) : '',
            notes: activity.notes || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('common.noDate');
        try {
            const date = new Date(dateString);
            const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
            return date.toLocaleDateString(locale, {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateString; }
    };

    const deleteActivity = async (id) => {
        if (!window.confirm(t('activities.deleteConfirm'))) return;
        try {
            setLoading(true);
            await axiosInstance.delete(`/activities/${id}/`);
            setActivities(prev => prev.filter(activity => activity.id !== id));
            setMessage(t('activities.deleted'));
            setTimeout(() => setMessage(''), 3000);
            if (onActivityChange) onActivityChange();
            if (id === editingId) { resetForm(); setIsEditing(false); setEditingId(null); }
        } catch (err) {
            console.error('خطأ:', err);
            setError(t('activities.deleteError'));
        } finally { setLoading(false); }
    };

    const getActivityOptions = () => [
        { value: 'walking', label: t('activities.walking'), icon: '🚶‍♂️', color: '#3498db' },
        { value: 'running', label: t('activities.running'), icon: '🏃‍♀️', color: '#e74c3c' },
        { value: 'weightlifting', label: t('activities.weightlifting'), icon: '🏋️‍♂️', color: '#9b59b6' },
        { value: 'swimming', label: t('activities.swimming'), icon: '🏊‍♀️', color: '#00cec9' },
        { value: 'yoga', label: t('activities.yoga'), icon: '🧘‍♀️', color: '#00b894' },
        { value: 'cardio', label: t('activities.cardio'), icon: '❤️', color: '#e17055' },
        { value: 'cycling', label: t('activities.cycling'), icon: '🚴‍♀️', color: '#0984e3' },
        { value: 'other', label: t('activities.other'), icon: '🏅', color: '#7f8c8d' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateFormData = () => {
        if (!formData.activity_type) return t('activities.selectActivityError');
        const duration = parseInt(formData.duration_minutes);
        if (!formData.duration_minutes || duration < 1) return t('activities.durationError');
        if (duration > 180) return t('activities.durationTooLong');
        if (!formData.start_time) return t('activities.startTimeError');
        const startTime = new Date(formData.start_time);
        if (startTime > new Date()) return t('activities.futureTimeError');
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage('');

        const validationError = validateFormData();
        if (validationError) {
            setError(validationError);
            setLoading(false);
            return;
        }

        const calculatedCalories = calculateCalories(formData.activity_type, formData.duration_minutes);
        const dataToSend = {
            activity_type: formData.activity_type,
            duration_minutes: parseInt(formData.duration_minutes),
            start_time: formData.start_time || new Date().toISOString().slice(0, 16),
            calories_burned: calculatedCalories,
            notes: formData.notes
        };

        try {
            let response;
            if (isEditing && editingId) {
                response = await axiosInstance.put(`/activities/${editingId}/`, dataToSend);
                setMessage(t('activities.updated'));
                setActivities(prev => prev.map(a => a.id === editingId ? { ...response.data, activity_type: formData.activity_type } : a));
            } else {
                response = await axiosInstance.post('/activities/', dataToSend);
                setMessage(t('activities.successMessage'));
                setActivities(prev => [{ ...response.data, activity_type: formData.activity_type }, ...prev]);
            }
            if (response.status === 200 || response.status === 201) {
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
                resetForm();
                if (isEditing) { setIsEditing(false); setEditingId(null); }
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            console.error('خطأ:', err);
            setError(t('activities.submissionError'));
        } finally { setLoading(false); }
    };

    const cancelEdit = () => {
        resetForm();
        setIsEditing(false);
        setEditingId(null);
        setMessage(t('activities.editCancelled'));
        setTimeout(() => setMessage(''), 3000);
    };

    const resetForm = () => {
        setFormData({ activity_type: '', duration_minutes: '', start_time: '', notes: '' });
    };

    const getActivityIcon = (type) => getActivityOptions().find(o => o.value === type)?.icon || '🏃‍♀️';
    const getActivityColor = (type) => getActivityOptions().find(o => o.value === type)?.color || '#7f8c8d';
    const safeValue = (v, d = '—') => v !== null && v !== undefined ? v : d;

    return (
        <div className={`activity-form-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* ✅ قسم ADB Monitor */}
            <div className={`watch-section adb-section ${adbServerStatus === 'connected' ? 'connected' : ''}`}>
                <div className="watch-header">
                    <div className="watch-title">
                        <div className="watch-icon-pulse">
                            <span className="watch-icon">📱</span>
                            {adbModeActive && <span className="pulse-dot"></span>}
                        </div>
                        <div>
                            <h3>{t('watch.adbTitle', 'ADB Monitor')}</h3>
                            <p className="watch-subtitle">{t('watch.adbSubtitle', 'اتصال عبر USB')}</p>
                        </div>
                    </div>
                    
                    {!adbModeActive ? (
                        <button 
                            onClick={connectADB} 
                            disabled={watchConnecting} 
                            className="watch-connect-btn adb-connect"
                        >
                            {watchConnecting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    <span>جارٍ الاتصال...</span>
                                </>
                            ) : (
                                <>
                                    <span>📱</span>
                                    <span>اتصال ADB</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button onClick={disconnectADB} className="watch-disconnect-btn">
                            🔌 فصل
                        </button>
                    )}
                </div>

                {adbServerStatus === 'connecting' && (
                    <div className="adb-status connecting">
                        <span className="status-spinner"></span>
                        <span>جاري الاتصال بخادم ADB...</span>
                    </div>
                )}

                {adbServerStatus === 'error' && (
                    <div className="adb-status error">
                        <span>⚠️</span>
                        <span>فشل الاتصال. تأكد من:</span>
                        <ul>
                            <li>تشغيل خادم ADB على الحاسوب (node adb-monitor.js)</li>
                            <li>الهاتف متصل عبر USB مع تفعيل تصحيح USB</li>
                            <li>الهاتف والحاسوب على نفس الشبكة</li>
                        </ul>
                    </div>
                )}

                {adbModeActive && (
                    <div className="watch-data-container">
                        <div className="health-stats-grid">
                            {/* ضربات القلب */}
                            <div className="health-card heart-rate">
                                <div className="health-icon">❤️</div>
                                <div className="health-value">
                                    <span className="value-number">{watchHeartRate || '---'}</span>
                                    <span className="value-unit">BPM</span>
                                </div>
                                <div className={`health-status ${watchHeartRate > 100 ? 'high' : watchHeartRate < 60 ? 'low' : watchHeartRate ? 'normal' : ''}`}>
                                    {watchHeartRate > 100 && '⚠️ مرتفع'}
                                    {watchHeartRate < 60 && '⚠️ منخفض'}
                                    {watchHeartRate >= 60 && watchHeartRate <= 100 && watchHeartRate && '✅ طبيعي'}
                                    {!watchHeartRate && '⏳ انتظار البيانات'}
                                </div>
                            </div>

                            {/* ضغط الدم */}
                            <div className="health-card blood-pressure">
                                <div className="health-icon">🩸</div>
                                <div className="health-value">
                                    <span className="value-number">
                                        {watchBloodPressure ? `${watchBloodPressure.systolic}/${watchBloodPressure.diastolic}` : '---'}
                                    </span>
                                    <span className="value-unit">mmHg</span>
                                </div>
                                <div className={`health-status ${watchBloodPressure?.systolic > 140 ? 'high' : watchBloodPressure?.systolic < 90 ? 'low' : watchBloodPressure ? 'normal' : ''}`}>
                                    {watchBloodPressure?.systolic > 140 && '⚠️ ارتفاع'}
                                    {watchBloodPressure?.systolic < 90 && '⚠️ انخفاض'}
                                    {watchBloodPressure?.systolic >= 90 && watchBloodPressure?.systolic <= 140 && watchBloodPressure && '✅ طبيعي'}
                                    {!watchBloodPressure && '⏳ انتظار البيانات'}
                                </div>
                            </div>
                        </div>

                        {watchData.lastUpdate && (
                            <div className="watch-last-update">
                                آخر تحديث: {new Date(watchData.lastUpdate).toLocaleTimeString()}
                            </div>
                        )}

                        <div className="watch-actions">
                            <button onClick={requestMeasurement} disabled={loading} className="measure-btn">
                                📊 طلب قياس جديد
                            </button>
                            <button 
                                onClick={addWatchDataAsActivity} 
                                disabled={loading || (!watchHeartRate && !watchBloodPressure)} 
                                className="add-activity-btn"
                            >
                                ➕ إضافة كنشاط
                            </button>
                        </div>
                    </div>
                )}

                {watchAlerts.length > 0 && (
                    <div className="watch-alerts">
                        {watchAlerts.map((alert, i) => (
                            <div key={i} className="alert-item">⚠️ {alert}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* باقي الكود - نموذج الأنشطة (نفس السابق) */}
            <div className="card data-form">
                <div className="form-header">
                    <h3>{isEditing ? '✏️ تعديل النشاط' : '🏃‍♀️ إضافة نشاط جديد'}</h3>
                    {isEditing && <button onClick={cancelEdit} className="cancel-edit-btn">❌ إلغاء</button>}
                </div>
                
                <p className="description">{isEditing ? 'عدل بيانات النشاط الرياضي' : 'سجل نشاطك الرياضي اليومي'}</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>🏃 نوع النشاط</label>
                        <select name="activity_type" value={formData.activity_type} onChange={handleChange} required className="activity-select">
                            <option value="">اختر النشاط</option>
                            {getActivityOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label>⏱️ المدة (دقائق)</label>
                            <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required min="1" max="180" placeholder="30" className="duration-input" />
                            <small className="field-hint">من 1 إلى 180 دقيقة</small>
                        </div>
                        <div className="form-group half-width">
                            <label>📅 وقت البداية</label>
                            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required className="datetime-input" />
                        </div>
                    </div>

                    {formData.activity_type && formData.duration_minutes && (
                        <div className="calculated-calories">
                            <div className="calories-badge">
                                <span className="calories-icon">🔥</span>
                                <span className="calories-value">{calculateCalories(formData.activity_type, formData.duration_minutes)}</span>
                                <span className="calories-label">سعرة متوقعة</span>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>📝 ملاحظات</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="أضف ملاحظات..." className="notes-textarea" />
                    </div>
                    
                    {error && <div className="error-message">⚠️ {error}</div>}
                    {message && <div className="success-message">✅ {message}</div>}

                    <div className="form-actions">
                        <button type="submit" disabled={loading} className="submit-btn">
                            {loading ? '⏳ جاري الحفظ...' : (isEditing ? '✏️ تحديث' : '➕ حفظ النشاط')}
                        </button>
                        {isEditing && <button type="button" onClick={cancelEdit} className="cancel-btn">❌ إلغاء</button>}
                    </div>
                </form>
            </div>

            {/* قائمة الأنشطة (نفس السابق) */}
            <div className="activities-list-section">
                <div className="activities-header">
                    <h3>📋 سجل الأنشطة</h3>
                    <div className="activities-actions">
                        <span className="activities-count">{activities.length} نشاط</span>
                        <button onClick={fetchActivities} className="refresh-btn" disabled={fetching || loading}>{fetching ? '⏳' : '🔄'}</button>
                    </div>
                </div>

                {fetching ? (
                    <div className="loading-activities"><div className="spinner"></div><p>جاري التحميل...</p></div>
                ) : error ? (
                    <div className="error-state"><p>⚠️ {error}</p><button onClick={fetchActivities} className="retry-btn">🔄 إعادة المحاولة</button></div>
                ) : activities.length === 0 ? (
                    <div className="no-activities"><div className="empty-icon">🏃‍♀️</div><h4>لا توجد أنشطة</h4><p>ابدأ بإضافة أول نشاط لك</p></div>
                ) : (
                    <div className="activities-grid">
                        {activities.map((activity) => (
                            <div key={activity.id} className={`activity-card ${editingId === activity.id ? 'editing' : ''}`}>
                                <div className="activity-header">
                                    <div className="activity-icon" style={{ backgroundColor: getActivityColor(activity.activity_type) + '20' }}>
                                        {getActivityIcon(activity.activity_type)}
                                    </div>
                                    <div className="activity-info">
                                        <h4>{getActivityOptions().find(o => o.value === activity.activity_type)?.label || activity.activity_type}</h4>
                                        <span className="activity-date">📅 {formatDate(activity.start_time)}</span>
                                    </div>
                                    <div className="activity-buttons">
                                        <button onClick={() => loadActivityForEdit(activity)} className="edit-btn" disabled={loading}>✏️</button>
                                        <button onClick={() => deleteActivity(activity.id)} className="delete-btn" disabled={loading}>🗑️</button>
                                    </div>
                                </div>
                                <div className="activity-details">
                                    <div className="detail-item"><span>⏱️ المدة:</span><span>{safeValue(activity.duration_minutes)} دقيقة</span></div>
                                    <div className="detail-item"><span>🔥 السعرات:</span><span>{safeValue(activity.calories_burned)} سعرة</span></div>
                                </div>
                                {activity.notes && <div className="activity-notes"><p>📝 {activity.notes}</p></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .activity-form-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .watch-section {
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 28px;
                    padding: 24px;
                    margin-bottom: 24px;
                    color: white;
                    transition: all 0.3s;
                }

                .watch-section.connected {
                    background: linear-gradient(135deg, #1e3a5f 0%, #0f2b3a 100%);
                    border: 1px solid #10b981;
                }

                .watch-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .watch-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .watch-icon-pulse {
                    position: relative;
                }

                .watch-icon {
                    font-size: 2rem;
                }

                .pulse-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 12px;
                    height: 12px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                    border: 2px solid white;
                }

                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .watch-subtitle {
                    font-size: 0.75rem;
                    opacity: 0.8;
                    margin: 0;
                }

                .watch-connect-btn, .watch-disconnect-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 24px;
                    border: none;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .watch-connect-btn.adb-connect {
                    background: #10b981;
                    color: white;
                }

                .watch-disconnect-btn {
                    background: rgba(239,68,68,0.9);
                    color: white;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .adb-status {
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 16px;
                    font-size: 0.85rem;
                }

                .adb-status.connecting {
                    background: rgba(16,185,129,0.2);
                    border: 1px solid #10b981;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .adb-status.error {
                    background: rgba(239,68,68,0.2);
                    border: 1px solid #ef4444;
                }

                .adb-status.error ul {
                    margin: 8px 0 0 20px;
                    font-size: 0.75rem;
                }

                .status-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .health-stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .health-card {
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 20px;
                    text-align: center;
                }

                .health-icon {
                    font-size: 2rem;
                    margin-bottom: 8px;
                }

                .health-value {
                    font-size: 1.8rem;
                    font-weight: 800;
                    margin: 8px 0;
                }

                .value-number {
                    font-size: 2rem;
                }

                .value-unit {
                    font-size: 0.9rem;
                    opacity: 0.8;
                }

                .health-status {
                    font-size: 0.8rem;
                    padding: 4px 12px;
                    border-radius: 20px;
                    display: inline-block;
                }

                .health-status.normal {
                    background: rgba(16,185,129,0.2);
                    color: #10b981;
                }

                .health-status.high {
                    background: rgba(239,68,68,0.2);
                    color: #f87171;
                }

                .health-status.low {
                    background: rgba(245,158,11,0.2);
                    color: #fbbf24;
                }

                .watch-last-update {
                    font-size: 0.7rem;
                    opacity: 0.7;
                    text-align: center;
                    margin-bottom: 16px;
                }

                .watch-actions {
                    display: flex;
                    gap: 12px;
                }

                .measure-btn, .add-activity-btn {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 40px;
                    background: rgba(255,255,255,0.15);
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .measure-btn:hover, .add-activity-btn:hover:not(:disabled) {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-2px);
                }

                .add-activity-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .watch-alerts {
                    margin-top: 16px;
                }

                .alert-item {
                    background: rgba(239,68,68,0.2);
                    border-radius: 10px;
                    padding: 8px 12px;
                    margin-top: 8px;
                    font-size: 0.8rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .card {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 24px;
                    margin-bottom: 24px;
                    border: 1px solid var(--border-light);
                }

                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .form-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }

                .description {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    margin-bottom: 20px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .activity-select, .duration-input, .datetime-input, .notes-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid var(--border-light);
                    border-radius: 12px;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 1rem;
                }

                .calculated-calories {
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .dark-mode .calculated-calories {
                    background: linear-gradient(135deg, #78350f, #92400e);
                }

                .calories-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1.3rem;
                    font-weight: 700;
                }

                .form-actions {
                    display: flex;
                    gap: 12px;
                }

                .submit-btn, .cancel-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 40px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .submit-btn {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                }

                .cancel-btn {
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                }

                .error-message, .success-message {
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                }

                .error-message { background: #fee2e2; color: #ef4444; }
                .success-message { background: #d1fae5; color: #10b981; }

                .activities-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .activities-count {
                    background: var(--secondary-bg);
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                }

                .refresh-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 50%;
                    background: var(--secondary-bg);
                    cursor: pointer;
                }

                .activities-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .activity-card {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 16px;
                }

                .activity-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .activity-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }

                .activity-info {
                    flex: 1;
                }

                .activity-info h4 {
                    margin: 0 0 4px 0;
                }

                .activity-date {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .activity-buttons {
                    display: flex;
                    gap: 8px;
                }

                .edit-btn, .delete-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .edit-btn { background: #3b82f6; color: white; }
                .delete-btn { background: #ef4444; color: white; }

                .activity-details {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 8px;
                }

                .detail-item {
                    display: flex;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                .activity-notes {
                    background: var(--card-bg);
                    border-radius: 8px;
                    padding: 8px;
                    margin-top: 8px;
                    font-size: 0.8rem;
                }

                .no-activities {
                    text-align: center;
                    padding: 48px;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-light);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                @media (max-width: 768px) {
                    .form-row, .watch-actions, .health-stats-grid {
                        grid-template-columns: 1fr;
                        flex-direction: column;
                    }
                    .watch-header {
                        flex-direction: column;
                        text-align: center;
                    }
                    .watch-title {
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityForm;