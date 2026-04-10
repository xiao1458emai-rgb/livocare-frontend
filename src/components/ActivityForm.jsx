'use client'
// src/components/ActivityForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import watchService from '../services/watchService';
import '../index.css';

const ActivityForm = ({ onDataSubmitted, onActivityChange }) => {
    const { t, i18n } = useTranslation();
    
    // ✅ useRef لمنع التحديثات المتكررة
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const isFetchingRef = useRef(false);
    
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

    // ✅ تفعيل ADB Mode
    useEffect(() => {
        const enableADB = () => {
            const isTouchDevice = 'ontouchstart' in window;
            const isMobileScreen = window.innerWidth <= 768;
            const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            
            if (isTouchDevice || isMobileScreen || isMobileUA) {
                console.log(t('watch.mobileDetected'));
                watchService.setMobileMode(true, '192.168.8.187');
                watchService.connectADBMonitor();
            }
        };
        
        enableADB();
    }, [t]);

    // ✅ استماع لبيانات الساعة عبر watchService
    useEffect(() => {
        const handleWatchData = (type, data) => {
            if (!isMountedRef.current) return;
            
            console.log(t('watch.dataReceived'), type, data);
            
            if (type === 'heartRate') {
                setWatchHeartRate(data);
                setWatchData(prev => ({ ...prev, heartRate: data, lastUpdate: new Date() }));
                
                if (data > 100) {
                    setWatchAlerts(prev => [t('watch.highHeartRate', { value: data }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setWatchAlerts(prev => prev.slice(1));
                    }, 5000);
                } else if (data < 60) {
                    setWatchAlerts(prev => [t('watch.lowHeartRate', { value: data }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setWatchAlerts(prev => prev.slice(1));
                    }, 5000);
                }
            }
            
            if (type === 'bloodPressure') {
                setWatchBloodPressure(data);
                setWatchData(prev => ({ ...prev, bloodPressure: data, lastUpdate: new Date() }));
                
                if (data.systolic > 140 || data.diastolic > 90) {
                    setWatchAlerts(prev => [t('watch.highBloodPressure', { systolic: data.systolic, diastolic: data.diastolic }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setWatchAlerts(prev => prev.slice(1));
                    }, 5000);
                } else if (data.systolic < 90 || data.diastolic < 60) {
                    setWatchAlerts(prev => [t('watch.lowBloodPressure', { systolic: data.systolic, diastolic: data.diastolic }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setWatchAlerts(prev => prev.slice(1));
                    }, 5000);
                }
            }
            
            if (type === 'connected') {
                setWatchConnected(true);
                setAdbModeActive(true);
                setAdbServerStatus('connected');
                setMessage(t('watch.adbConnected'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
            
            if (type === 'disconnected') {
                setWatchConnected(false);
                setAdbModeActive(false);
                setAdbServerStatus('disconnected');
                setMessage(t('watch.adbDisconnected'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
            
            if (type === 'error') {
                setAdbServerStatus('error');
                setError(t('watch.adbConnectionError'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 5000);
            }
        };
        
        watchService.onData(handleWatchData);
        
        return () => {
            const index = watchService.onDataCallbacks.indexOf(handleWatchData);
            if (index > -1) watchService.onDataCallbacks.splice(index, 1);
        };
    }, [t]);

// في ActivityForm.jsx - دالة fetchActivities
const fetchActivities = useCallback(async () => {
    if (isFetchingRef.current || !isMountedRef.current) return;
    
    isFetchingRef.current = true;
    setFetching(true);
    
    try {
        const response = await axiosInstance.get('/activities/');
        
        // ✅ معالجة البيانات (نتائج أو مصفوفة)
        let activitiesData = [];
        if (response.data?.results) {
            activitiesData = response.data.results;
        } else if (Array.isArray(response.data)) {
            activitiesData = response.data;
        } else {
            activitiesData = [];
        }
        
        console.log('🏃 Activities fetched:', activitiesData.length);
        
        if (isMountedRef.current) {
            setActivities(activitiesData);
            if (onActivityChange) onActivityChange();
            setError(null);
        }
    } catch (err) {
        console.error(t('activities.fetchErrorLog'), err);
        if (isMountedRef.current) {
            setError(t('activities.fetchError'));
            setActivities([]);
        }
    } finally {
        if (isMountedRef.current) {
            setFetching(false);
        }
        isFetchingRef.current = false;
    }
}, [t, onActivityChange]);

    // ✅ جلب الأنشطة عند التحميل
    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const CALORIES_PER_MINUTE = {
        'walking': 3.5, 'running': 10.0, 'weightlifting': 4.0, 'swimming': 7.0,
        'yoga': 2.5, 'pilates': 3.0, 'cardio': 8.0, 'cycling': 6.0,
        'football': 7.5, 'basketball': 8.0, 'tennis': 6.5, 'other': 4.0
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

    // ✅ حذف نشاط
    const deleteActivity = useCallback(async (id) => {
        if (!window.confirm(t('activities.deleteConfirm'))) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/activities/${id}/`);
            if (isMountedRef.current) {
                setActivities(prev => prev.filter(activity => activity.id !== id));
                setMessage(t('activities.deleted'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
                if (onActivityChange) onActivityChange();
                if (id === editingId) { resetForm(); setIsEditing(false); setEditingId(null); }
            }
        } catch (err) {
            console.error(t('activities.deleteErrorLog'), err);
            if (isMountedRef.current) {
                setError(t('activities.deleteError'));
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [t, onActivityChange, editingId]);

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

    // ✅ إرسال النشاط - مع منع الطلبات المتزامنة
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        setMessage('');

        const validationError = validateFormData();
        if (validationError) {
            if (isMountedRef.current) setError(validationError);
            setLoading(false);
            return;
        }

        isSubmittingRef.current = true;

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
                if (isMountedRef.current) {
                    setMessage(t('activities.updated'));
                    setActivities(prev => prev.map(a => a.id === editingId ? { ...response.data, activity_type: formData.activity_type } : a));
                }
            } else {
                response = await axiosInstance.post('/activities/', dataToSend);
                if (isMountedRef.current) {
                    setMessage(t('activities.successMessage'));
                    setActivities(prev => [{ ...response.data, activity_type: formData.activity_type }, ...prev]);
                }
            }
            
            if (response.status === 200 || response.status === 201 && isMountedRef.current) {
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
                resetForm();
                if (isEditing) { setIsEditing(false); setEditingId(null); }
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
        } catch (err) {
            console.error(t('activities.submissionErrorLog'), err);
            if (isMountedRef.current) {
                setError(t('activities.submissionError'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, isEditing, editingId, t, onActivityChange, onDataSubmitted, validateFormData]);

    const cancelEdit = () => {
        resetForm();
        setIsEditing(false);
        setEditingId(null);
        setMessage(t('activities.editCancelled'));
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 3000);
    };

    const resetForm = () => {
        setFormData({ activity_type: '', duration_minutes: '', start_time: '', notes: '' });
    };

    const getActivityIcon = (type) => getActivityOptions().find(o => o.value === type)?.icon || '🏃‍♀️';
    const getActivityColor = (type) => getActivityOptions().find(o => o.value === type)?.color || '#7f8c8d';
    const safeValue = (v, d = '—') => v !== null && v !== undefined ? v : d;

    // ✅ دالة الاتصال عبر ADB
    const connectADB = async () => {
        setWatchConnecting(true);
        setAdbServerStatus('connecting');
        
        try {
            watchService.enableADBMode();
            const success = await watchService.connectToWatch();
            
            if (success && isMountedRef.current) {
                setWatchConnected(true);
                setAdbModeActive(true);
                setAdbServerStatus('connected');
                setMessage(t('watch.adbConnectSuccess'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            } else {
                throw new Error(t('watch.adbConnectFailed'));
            }
        } catch (error) {
            console.error(t('watch.adbConnectionFailedLog'), error);
            if (isMountedRef.current) {
                setAdbServerStatus('error');
                setError(t('watch.adbConnectionInstructions'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 8000);
            }
        } finally {
            if (isMountedRef.current) setWatchConnecting(false);
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
        setMessage(t('watch.adbDisconnectedManual'));
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 3000);
    };

    // ✅ إضافة بيانات الساعة كنشاط
    const addWatchDataAsActivity = async () => {
        if (!watchHeartRate && !watchBloodPressure) {
            setError(t('watch.noWatchData'));
            setTimeout(() => {
                if (isMountedRef.current) setError(null);
            }, 3000);
            return;
        }

        setLoading(true);
        
        const notes = [];
        if (watchHeartRate) notes.push(t('watch.heartRateNote', { value: watchHeartRate }));
        if (watchBloodPressure) notes.push(t('watch.bloodPressureNote', { systolic: watchBloodPressure.systolic, diastolic: watchBloodPressure.diastolic }));
        
        const watchActivity = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: watchData.lastUpdate ? new Date(watchData.lastUpdate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            notes: t('watch.activityNote', { notes: notes.join(' - ') })
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
            if (isMountedRef.current) {
                setActivities(prev => [{ ...response.data, activity_type: 'walking' }, ...prev]);
                setMessage(t('watch.watchDataAdded'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error(t('watch.watchDataAddErrorLog'), err);
            if (isMountedRef.current) {
                setError(t('watch.watchDataAddError'));
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    // ✅ طلب قياس جديد
    const requestMeasurement = async () => {
        setLoading(true);
        try {
            await watchService.requestMeasurement();
            if (isMountedRef.current) {
                setMessage(t('watch.measurementRequested'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 5000);
            }
        } catch (error) {
            console.error(t('watch.measurementRequestFailedLog'), error);
            if (isMountedRef.current) {
                setError(t('watch.measurementRequestFailed'));
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    // ✅ تنظيف عند إلغاء تحميل المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

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
                            <h3>{t('watch.adbTitle')}</h3>
                            <p className="watch-subtitle">{t('watch.adbSubtitle')}</p>
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
                                    <span>{t('watch.connecting')}</span>
                                </>
                            ) : (
                                <>
                                    <span>📱</span>
                                    <span>{t('watch.connectAdb')}</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button onClick={disconnectADB} className="watch-disconnect-btn">
                            🔌 {t('watch.disconnect')}
                        </button>
                    )}
                </div>

                {adbServerStatus === 'connecting' && (
                    <div className="adb-status connecting">
                        <span className="status-spinner"></span>
                        <span>{t('watch.connectingToAdb')}</span>
                    </div>
                )}

                {adbServerStatus === 'error' && (
                    <div className="adb-status error">
                        <span>⚠️</span>
                        <span>{t('watch.adbErrorTitle')}</span>
                        <ul>
                            <li>{t('watch.adbErrorTip1')}</li>
                            <li>{t('watch.adbErrorTip2')}</li>
                            <li>{t('watch.adbErrorTip3')}</li>
                        </ul>
                    </div>
                )}

                {adbModeActive && (
                    <div className="watch-data-container">
                        <div className="health-stats-grid">
                            <div className="health-card heart-rate">
                                <div className="health-icon">❤️</div>
                                <div className="health-value">
                                    <span className="value-number">{watchHeartRate || '---'}</span>
                                    <span className="value-unit">BPM</span>
                                </div>
                                <div className={`health-status ${watchHeartRate > 100 ? 'high' : watchHeartRate < 60 ? 'low' : watchHeartRate ? 'normal' : ''}`}>
                                    {watchHeartRate > 100 && t('watch.highStatus')}
                                    {watchHeartRate < 60 && t('watch.lowStatus')}
                                    {watchHeartRate >= 60 && watchHeartRate <= 100 && watchHeartRate && t('watch.normalStatus')}
                                    {!watchHeartRate && t('watch.waitingData')}
                                </div>
                            </div>

                            <div className="health-card blood-pressure">
                                <div className="health-icon">🩸</div>
                                <div className="health-value">
                                    <span className="value-number">
                                        {watchBloodPressure ? `${watchBloodPressure.systolic}/${watchBloodPressure.diastolic}` : '---'}
                                    </span>
                                    <span className="value-unit">mmHg</span>
                                </div>
                                <div className={`health-status ${watchBloodPressure?.systolic > 140 ? 'high' : watchBloodPressure?.systolic < 90 ? 'low' : watchBloodPressure ? 'normal' : ''}`}>
                                    {watchBloodPressure?.systolic > 140 && t('watch.highStatus')}
                                    {watchBloodPressure?.systolic < 90 && t('watch.lowStatus')}
                                    {watchBloodPressure?.systolic >= 90 && watchBloodPressure?.systolic <= 140 && watchBloodPressure && t('watch.normalStatus')}
                                    {!watchBloodPressure && t('watch.waitingData')}
                                </div>
                            </div>
                        </div>

                        {watchData.lastUpdate && (
                            <div className="watch-last-update">
                                {t('watch.lastUpdate')}: {new Date(watchData.lastUpdate).toLocaleTimeString()}
                            </div>
                        )}

                        <div className="watch-actions">
                            <button onClick={requestMeasurement} disabled={loading} className="measure-btn">
                                📊 {t('watch.requestMeasurement')}
                            </button>
                            <button 
                                onClick={addWatchDataAsActivity} 
                                disabled={loading || (!watchHeartRate && !watchBloodPressure)} 
                                className="add-activity-btn"
                            >
                                ➕ {t('watch.addAsActivity')}
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

            {/* نموذج إضافة/تعديل النشاط */}
            <div className="card data-form">
                <div className="form-header">
                    <h3>{isEditing ? t('activities.editActivityTitle') : t('activities.addActivityTitle')}</h3>
                    {isEditing && <button onClick={cancelEdit} className="cancel-edit-btn">❌ {t('common.cancel')}</button>}
                </div>
                
                <p className="description">{isEditing ? t('activities.editDescription') : t('activities.addDescription')}</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>🏃 {t('activities.activityType')}</label>
                        <select name="activity_type" value={formData.activity_type} onChange={handleChange} required className="activity-select">
                            <option value="">{t('activities.selectActivity')}</option>
                            {getActivityOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label>⏱️ {t('activities.duration')}</label>
                            <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required min="1" max="180" placeholder={t('activities.durationPlaceholder')} className="duration-input" />
                            <small className="field-hint">{t('activities.durationHint')}</small>
                        </div>
                        <div className="form-group half-width">
                            <label>📅 {t('activities.startTime')}</label>
                            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required className="datetime-input" />
                        </div>
                    </div>

                    {formData.activity_type && formData.duration_minutes && (
                        <div className="calculated-calories">
                            <div className="calories-badge">
                                <span className="calories-icon">🔥</span>
                                <span className="calories-value">{calculateCalories(formData.activity_type, formData.duration_minutes)}</span>
                                <span className="calories-label">{t('activities.estimatedCalories')}</span>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>📝 {t('activities.notes')}</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder={t('activities.notesPlaceholder')} className="notes-textarea" />
                    </div>
                    
                    {error && <div className="error-message">⚠️ {error}</div>}
                    {message && <div className="success-message">✅ {message}</div>}

                    <div className="form-actions">
                        <button type="submit" disabled={loading} className="submit-btn">
                            {loading ? t('common.saving') : (isEditing ? t('common.update') : t('common.save'))}
                        </button>
                        {isEditing && <button type="button" onClick={cancelEdit} className="cancel-btn">❌ {t('common.cancel')}</button>}
                    </div>
                </form>
            </div>

            {/* قائمة الأنشطة */}
            <div className="activities-list-section">
                <div className="activities-header">
                    <h3>{t('activities.history')}</h3>
                    <div className="activities-actions">
                        <span className="activities-count">{activities.length} {t('activities.count')}</span>
                        <button onClick={fetchActivities} className="refresh-btn" disabled={fetching || loading}>{fetching ? '⏳' : '🔄'}</button>
                    </div>
                </div>

                {fetching ? (
                    <div className="loading-activities"><div className="spinner"></div><p>{t('common.loading')}</p></div>
                ) : error ? (
                    <div className="error-state"><p>⚠️ {error}</p><button onClick={fetchActivities} className="retry-btn">🔄 {t('common.retry')}</button></div>
                ) : activities.length === 0 ? (
                    <div className="no-activities"><div className="empty-icon">🏃‍♀️</div><h4>{t('activities.noActivities')}</h4><p>{t('activities.startAdding')}</p></div>
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
                                    <div className="detail-item"><span>⏱️ {t('activities.duration')}:</span><span>{safeValue(activity.duration_minutes)} {t('common.minutes')}</span></div>
                                    <div className="detail-item"><span>🔥 {t('activities.calories')}:</span><span>{safeValue(activity.calories_burned)} {t('common.calories')}</span></div>
                                </div>
                                {activity.notes && <div className="activity-notes"><p>📝 {activity.notes}</p></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
/* ActivityForm.css - متوافق مع ThemeManager */

.activity-form-container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background: var(--primary-bg);
    min-height: 100vh;
    transition: background var(--transition-medium);
}

/* ===== قسم الساعة الذكية / ADB Monitor ===== */
.watch-section {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: var(--radius-2xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    color: white;
    transition: all var(--transition-medium);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.watch-section.connected {
    background: linear-gradient(135deg, #1e3a5f 0%, #0f2b3a 100%);
    border: 1px solid var(--success);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

.watch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.watch-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
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
    background: var(--success);
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

.watch-connect-btn,
.watch-disconnect-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.watch-connect-btn.adb-connect {
    background: var(--success);
    color: white;
}

.watch-connect-btn.adb-connect:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
}

.watch-disconnect-btn {
    background: rgba(239, 68, 68, 0.9);
    color: white;
}

.watch-disconnect-btn:hover {
    background: var(--error);
    transform: translateY(-2px);
}

.spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
}

/* ===== حالة ADB ===== */
.adb-status {
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    font-size: 0.85rem;
}

.adb-status.connecting {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid var(--success);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.adb-status.error {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid var(--error);
}

.adb-status.error ul {
    margin: var(--spacing-sm) 0 0 var(--spacing-lg);
    font-size: 0.75rem;
    color: #fca5a5;
}

.status-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

/* ===== إحصائيات الصحة ===== */
.health-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.health-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    text-align: center;
    transition: all var(--transition-medium);
}

.health-card:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.15);
}

.health-icon {
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
}

.health-value {
    font-size: 1.8rem;
    font-weight: 800;
    margin: var(--spacing-sm) 0;
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
    border-radius: var(--radius-full);
    display: inline-block;
}

.health-status.normal {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.health-status.high {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
}

.health-status.low {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.watch-last-update {
    font-size: 0.7rem;
    opacity: 0.7;
    text-align: center;
    margin-bottom: var(--spacing-md);
}

/* ===== أزرار الساعة ===== */
.watch-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.measure-btn,
.add-activity-btn {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.15);
    color: white;
    cursor: pointer;
    font-weight: 600;
    transition: all var(--transition-medium);
}

.measure-btn:hover,
.add-activity-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.add-activity-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== تنبيهات الساعة ===== */
.watch-alerts {
    margin-top: var(--spacing-md);
}

.alert-item {
    background: rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-top: var(--spacing-sm);
    font-size: 0.8rem;
    border-right: 3px solid var(--error);
}

[dir="rtl"] .alert-item {
    border-right: none;
    border-left: 3px solid var(--error);
}

/* ===== البطاقة الرئيسية ===== */
.card {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-md);
    transition: all var(--transition-medium);
}

.card:hover {
    box-shadow: var(--shadow-lg);
}

.form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.form-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.3rem;
}

.cancel-edit-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--secondary-bg);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.cancel-edit-btn:hover {
    background: var(--error-bg);
    color: var(--error);
    border-color: var(--error);
}

.description {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-light);
}

/* ===== حقول النموذج ===== */
.form-group {
    margin-bottom: var(--spacing-lg);
}

.form-group label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
    color: var(--text-primary);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
}

.activity-select,
.duration-input,
.datetime-input,
.notes-textarea {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: var(--secondary-bg);
    color: var(--text-primary);
    font-size: 1rem;
    transition: all var(--transition-fast);
}

.activity-select:focus,
.duration-input:focus,
.datetime-input:focus,
.notes-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.field-hint {
    display: block;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: var(--spacing-xs);
}

/* ===== السعرات المحسوبة ===== */
.calculated-calories {
    background: var(--warning-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    text-align: center;
    border: 1px solid var(--warning-border);
}

.dark-mode .calculated-calories {
    background: rgba(245, 158, 11, 0.15);
}

.calories-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--warning);
}

.calories-icon {
    font-size: 1.5rem;
}

.calories-value {
    font-size: 1.8rem;
    font-weight: 800;
}

/* ===== الرسائل ===== */
.error-message,
.success-message {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.error-message {
    background: var(--error-bg);
    color: var(--error);
    border: 1px solid var(--error-border);
}

.success-message {
    background: var(--success-bg);
    color: var(--success);
    border: 1px solid var(--success-border);
}

/* ===== أزرار الإجراء ===== */
.form-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
}

.submit-btn,
.cancel-btn {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-full);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-medium);
}

.submit-btn {
    background: var(--primary-gradient);
    color: white;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cancel-btn {
    background: var(--secondary-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}

.cancel-btn:hover {
    background: var(--error-bg);
    color: var(--error);
    border-color: var(--error);
}

/* ===== قائمة الأنشطة ===== */
.activities-list-section {
    background: var(--card-bg);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-light);
}

.activities-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.activities-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.activities-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.activities-count {
    background: var(--secondary-bg);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.refresh-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--secondary-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-medium);
}

.refresh-btn:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    transform: rotate(180deg);
}

.refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ===== شبكة الأنشطة ===== */
.activities-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: 500px;
    overflow-y: auto;
    padding-right: var(--spacing-sm);
}

.activities-grid::-webkit-scrollbar {
    width: 6px;
}

.activities-grid::-webkit-scrollbar-track {
    background: var(--tertiary-bg);
    border-radius: var(--radius-full);
}

.activities-grid::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: var(--radius-full);
}

.activity-card {
    background: var(--secondary-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
}

.activity-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-light);
}

.activity-card.editing {
    border: 2px solid var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.activity-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.activity-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    transition: all var(--transition-fast);
}

.activity-card:hover .activity-icon {
    transform: scale(1.05);
}

.activity-info {
    flex: 1;
}

.activity-info h4 {
    margin: 0 0 4px 0;
    color: var(--text-primary);
}

.activity-date {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 4px;
}

.activity-buttons {
    display: flex;
    gap: var(--spacing-sm);
}

.edit-btn,
.delete-btn {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.edit-btn {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.edit-btn:hover {
    background: #3b82f6;
    color: white;
    transform: scale(1.05);
}

.delete-btn {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.delete-btn:hover {
    background: #ef4444;
    color: white;
    transform: scale(1.05);
}

.activity-details {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
}

.detail-item {
    display: flex;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.detail-item span:first-child {
    font-weight: 500;
}

.detail-item span:last-child {
    font-weight: 600;
    color: var(--text-primary);
}

.activity-notes {
    background: var(--card-bg);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    margin-top: var(--spacing-sm);
    font-size: 0.8rem;
    color: var(--text-secondary);
    border-right: 3px solid var(--primary);
}

[dir="rtl"] .activity-notes {
    border-right: none;
    border-left: 3px solid var(--primary);
}

/* ===== حالات فارغة ===== */
.no-activities {
    text-align: center;
    padding: var(--spacing-2xl);
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.6;
}

.no-activities h4 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.no-activities p {
    color: var(--text-tertiary);
}

.loading-activities {
    text-align: center;
    padding: var(--spacing-2xl);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
}

.error-state {
    text-align: center;
    padding: var(--spacing-xl);
}

.retry-btn {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-medium);
}

.retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== استجابة ===== */
@media (max-width: 768px) {
    .activity-form-container {
        padding: var(--spacing-md);
    }

    .form-row,
    .watch-actions,
    .health-stats-grid {
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

    .activity-details {
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .activities-grid {
        max-height: 400px;
    }
}

@media (max-width: 480px) {
    .form-header {
        flex-direction: column;
    }

    .activity-header {
        flex-wrap: wrap;
    }

    .activity-info {
        order: 2;
    }

    .activity-buttons {
        order: 3;
    }

    .activity-icon {
        order: 1;
    }

    .calories-value {
        font-size: 1.3rem;
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .activities-grid {
    padding-right: 0;
    padding-left: var(--spacing-sm);
}

[dir="rtl"] .activity-notes {
    border-right: none;
    border-left: 3px solid var(--primary);
}

[dir="rtl"] .detail-item {
    flex-direction: row-reverse;
}

[dir="rtl"] .alert-item {
    border-right: none;
    border-left: 3px solid var(--error);
}

/* ===== دعم الحركة المخفضة ===== */
@media (prefers-reduced-motion: reduce) {
    .watch-section,
    .card,
    .activity-card,
    .submit-btn,
    .edit-btn,
    .delete-btn {
        transition: none !important;
    }

    .activity-card:hover {
        transform: none !important;
    }

    .pulse-dot {
        animation: none !important;
    }

    .spinner,
    .spinner-small {
        animation: none !important;
    }
}
            `}</style>
        </div>
    );
};

export default ActivityForm;