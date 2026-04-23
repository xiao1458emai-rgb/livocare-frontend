'use client'
// src/components/ActivityForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
import ActivityAnalytics from './Analytics/ActivityAnalytics';
import '../index.css';

const ActivityForm = ({ onDataSubmitted, onActivityChange }) => {
    const { t, i18n } = useTranslation();
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const isFetchingRef = useRef(false);
    
    const [editingId, setEditingId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);
    
    // حالة المستشعر (ESP32)
    const [sensorConnected, setSensorConnected] = useState(false);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorData, setSensorData] = useState({
        heartRate: null,
        spo2: null,
        lastUpdate: null
    });
    const [sensorAlerts, setSensorAlerts] = useState([]);
    const [sensorSupported, setSensorSupported] = useState(true);
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorStatus, setSensorStatus] = useState('disconnected');
    
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
        setSensorSupported(esp32Service.isSupported());
    }, []);

    // تفعيل ESP32 Service
    useEffect(() => {
        const enableESP32 = () => {
            console.log('ESP32 Service: Starting');
            esp32Service.startPolling();
            setSensorActive(true);
        };
        
        enableESP32();
        
        return () => {
            esp32Service.stopPolling();
        };
    }, []);

    // استماع لبيانات ESP32
    useEffect(() => {
        const handleESP32Data = (type, data) => {
            if (!isMountedRef.current) return;
            
            console.log('ESP32 Data received:', type, data);
            
            if (type === 'heartRate') {
                setSensorHeartRate(data);
                setSensorData(prev => ({ ...prev, heartRate: data, lastUpdate: new Date() }));
                setSensorConnected(true);
                setSensorActive(true);
                setSensorStatus('connected');
                
                if (data > 100) {
                    setSensorAlerts(prev => [t('watch.highHeartRate', { value: data }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setSensorAlerts(prev => prev.slice(1));
                    }, 5000);
                } else if (data < 60) {
                    setSensorAlerts(prev => [t('watch.lowHeartRate', { value: data }), ...prev].slice(0, 3));
                    setTimeout(() => {
                        if (isMountedRef.current) setSensorAlerts(prev => prev.slice(1));
                    }, 5000);
                }
            }
            
            if (type === 'spo2') {
                setSensorSpO2(data);
                setSensorData(prev => ({ ...prev, spo2: data, lastUpdate: new Date() }));
            }
            
            if (type === 'data') {
                if (data.heartRate) setSensorHeartRate(data.heartRate);
                if (data.spo2) setSensorSpO2(data.spo2);
                setSensorData(prev => ({ ...prev, heartRate: data.heartRate, spo2: data.spo2, lastUpdate: new Date() }));
                setSensorConnected(true);
                setSensorActive(true);
                setSensorStatus('connected');
            }
            
            if (type === 'connected') {
                setSensorConnected(true);
                setSensorActive(true);
                setSensorStatus('connected');
                setMessage(t('watch.adbConnected'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
            
            if (type === 'disconnected') {
                setSensorConnected(false);
                setSensorActive(false);
                setSensorStatus('disconnected');
                setMessage(t('watch.adbDisconnected'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
            }
            
            if (type === 'error') {
                setSensorStatus('error');
                setError(t('watch.adbConnectionError'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 5000);
            }
        };
        
        esp32Service.onData(handleESP32Data);
        
        return () => {
            const index = esp32Service.listeners.indexOf(handleESP32Data);
            if (index > -1) esp32Service.listeners.splice(index, 1);
        };
    }, [t]);

    // دالة fetchActivities
    const fetchActivities = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setFetching(true);
        
        try {
            const response = await axiosInstance.get('/activities/');
            
            let activitiesData = [];
            if (response.data?.results) {
                activitiesData = response.data.results;
            } else if (Array.isArray(response.data)) {
                activitiesData = response.data;
            }
            
            console.log('🏃 Activities fetched:', activitiesData.length);
            
            if (isMountedRef.current) {
                setActivities(activitiesData);
                if (onActivityChange) onActivityChange();
                setRefreshAnalytics(prev => prev + 1);
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
        return Math.round(duration * caloriesPerMinute);
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

    const deleteActivity = useCallback(async (id) => {
        if (!window.confirm(t('activities.deleteConfirm'))) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/activities/${id}/`);
            if (isMountedRef.current) {
                setActivities(prev => prev.filter(activity => activity.id !== id));
                setMessage(t('activities.deleted'));
                setRefreshAnalytics(prev => prev + 1);
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
            
            if ((response.status === 200 || response.status === 201) && isMountedRef.current) {
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
                setRefreshAnalytics(prev => prev + 1);
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
    }, [formData, isEditing, editingId, t, onActivityChange, onDataSubmitted]);

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

    const connectSensor = async () => {
        setSensorConnecting(true);
        setSensorStatus('connecting');
        
        try {
            esp32Service.startPolling();
            setSensorConnected(true);
            setSensorActive(true);
            setSensorStatus('connected');
            setMessage(t('watch.adbConnectSuccess'));
            setTimeout(() => {
                if (isMountedRef.current) setMessage('');
            }, 3000);
        } catch (error) {
            console.error('ESP32 connection error:', error);
            if (isMountedRef.current) {
                setSensorStatus('error');
                setError(t('watch.adbConnectionInstructions'));
                setTimeout(() => {
                    if (isMountedRef.current) setError(null);
                }, 8000);
            }
        } finally {
            if (isMountedRef.current) setSensorConnecting(false);
        }
    };

    const disconnectSensor = () => {
        esp32Service.stopPolling();
        setSensorConnected(false);
        setSensorActive(false);
        setSensorStatus('disconnected');
        setSensorHeartRate(null);
        setSensorSpO2(null);
        setSensorData({ heartRate: null, spo2: null, lastUpdate: null });
        setMessage(t('watch.adbDisconnectedManual'));
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 3000);
    };

    const addSensorDataAsHealthRecord = async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(t('watch.noWatchData') || 'لا توجد بيانات من المستشعر');
            setTimeout(() => {
                if (isMountedRef.current) setError(null);
            }, 3000);
            return;
        }

        setLoading(true);
        
        try {
            const healthData = {
                heart_rate: sensorHeartRate || null,
                spo2: sensorSpO2 || null,
                recorded_at: sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toISOString() : new Date().toISOString()
            };
            
            console.log('Saving health record:', healthData);
            const response = await axiosInstance.post('/health_status/', healthData);
            
            if (isMountedRef.current) {
                setMessage(t('watch.healthDataAdded') || 'تم حفظ القراءة الصحية');
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 3000);
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error('Error saving health data:', err);
            if (isMountedRef.current) {
                setError(t('watch.healthDataAddError') || 'فشل حفظ القراءة الصحية');
                setTimeout(() => setError(null), 3000);
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const addSensorDataAsActivity = async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(t('watch.noWatchData'));
            setTimeout(() => {
                if (isMountedRef.current) setError(null);
            }, 3000);
            return;
        }

        setLoading(true);
        
        const notes = [];
        if (sensorHeartRate) notes.push(t('watch.heartRateNote', { value: sensorHeartRate }));
        if (sensorSpO2) notes.push(t('watch.spo2Note', { value: sensorSpO2 }));
        
        const sensorActivity = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            notes: t('watch.activityNote', { notes: notes.join(' - ') })
        };
        
        const calculatedCalories = calculateCalories('walking', 30);
        const dataToSend = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: sensorActivity.start_time,
            calories_burned: calculatedCalories,
            notes: sensorActivity.notes
        };

        try {
            const response = await axiosInstance.post('/activities/', dataToSend);
            if (isMountedRef.current) {
                setActivities(prev => [{ ...response.data, activity_type: 'walking' }, ...prev]);
                setMessage(t('watch.watchDataAdded'));
                setRefreshAnalytics(prev => prev + 1);
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

    const requestMeasurement = async () => {
        setLoading(true);
        try {
            await esp32Service.requestMeasurement();
            if (isMountedRef.current) {
                setMessage(t('watch.measurementRequested'));
                setTimeout(() => {
                    if (isMountedRef.current) setMessage('');
                }, 5000);
            }
        } catch (error) {
            console.error('Measurement request failed:', error);
            if (isMountedRef.current) {
                setError(t('watch.measurementRequestFailed'));
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            esp32Service.stopPolling();
        };
    }, []);

    return (
        <div className="analytics-container">
            {/* قسم ESP32 Monitor - بدون أيقونات مكررة */}
            <div className={`recommendations-section ${sensorStatus === 'connected' ? 'priority-high' : ''}`} style={{ 
                background: sensorActive ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2b3a 100%)' : 'var(--card-bg)',
                color: sensorActive ? 'white' : 'inherit'
            }}>
                <div className="analytics-header" style={{ borderBottom: 'none', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ fontSize: '2rem' }}>🫀</span>
                            {sensorActive && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: '12px',
                                    height: '12px',
                                    background: 'var(--success)',
                                    borderRadius: '50%',
                                    animation: 'pulse 1.5s infinite',
                                    border: '2px solid white'
                                }}></span>
                            )}
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>{t('watch.adbTitle') || 'ESP32 Health Monitor'}</h3>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>{t('watch.adbSubtitle') || 'Real-time BPM & SpO2 readings'}</p>
                        </div>
                    </div>
                    
                    {!sensorActive ? (
                        <button onClick={connectSensor} disabled={sensorConnecting} className="type-btn active" style={{ background: 'var(--success)', color: 'white' }}>
                            {sensorConnecting ? '⏳ ' + (t('watch.connecting') || 'Connecting...') : '🔌 ' + (t('watch.connectAdb') || 'Connect ESP32')}
                        </button>
                    ) : (
                        <button onClick={disconnectSensor} className="type-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                            🔌 {t('watch.disconnect') || 'Disconnect'}
                        </button>
                    )}
                </div>

                {sensorStatus === 'connecting' && (
                    <div className="analytics-loading" style={{ padding: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                        <span>{t('watch.connectingToAdb') || 'Connecting to ESP32 API...'}</span>
                    </div>
                )}

                {sensorStatus === 'error' && (
                    <div className="analytics-error" style={{ marginTop: 'var(--spacing-md)' }}>
                        <span>⚠️ {t('watch.adbErrorTitle') || 'Connection Error'}</span>
                    </div>
                )}

                {sensorActive && (
                    <div>
                        <div className="analytics-stats-grid" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                                <div className="stat-icon">❤️</div>
                                <div className="stat-content">
                                    <div className="stat-value">{sensorHeartRate || '---'} <span style={{ fontSize: '0.9rem' }}>BPM</span></div>
                                    <div className="stat-label">
                                        {sensorHeartRate > 100 && (t('watch.highStatus') || 'High')}
                                        {sensorHeartRate < 60 && (t('watch.lowStatus') || 'Low')}
                                        {sensorHeartRate >= 60 && sensorHeartRate <= 100 && sensorHeartRate && (t('watch.normalStatus') || 'Normal')}
                                        {!sensorHeartRate && (t('watch.waitingData') || 'Waiting...')}
                                    </div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                                <div className="stat-icon">💨</div>
                                <div className="stat-content">
                                    <div className="stat-value">{sensorSpO2 || '---'} <span style={{ fontSize: '0.9rem' }}>SpO₂%</span></div>
                                    <div className="stat-label">
                                        {sensorSpO2 && sensorSpO2 < 90 && (t('watch.lowStatus') || 'Low')}
                                        {sensorSpO2 && sensorSpO2 >= 90 && (t('watch.normalStatus') || 'Normal')}
                                        {!sensorSpO2 && (t('watch.waitingData') || 'Waiting...')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {sensorData.lastUpdate && (
                            <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                                {t('watch.lastUpdate') || 'Last update'}: {new Date(sensorData.lastUpdate).toLocaleTimeString()}
                            </div>
                        )}

                        <div className="type-filters" style={{ justifyContent: 'center' }}>
                            <button onClick={requestMeasurement} disabled={loading} className="type-btn">
                                📊 {t('watch.requestMeasurement') || 'Request Measurement'}
                            </button>
                            <button onClick={addSensorDataAsHealthRecord} disabled={loading || (!sensorHeartRate && !sensorSpO2)} className="type-btn" style={{ borderColor: '#10b981' }}>
                                💾 {t('watch.saveAsHealthRecord') || 'حفظ كقراءة صحية'}
                            </button>
                            <button onClick={addSensorDataAsActivity} disabled={loading || (!sensorHeartRate && !sensorSpO2)} className="type-btn">
                                ➕ {t('watch.addAsActivity') || 'إضافة كنشاط'}
                            </button>
                        </div>
                    </div>
                )}

                {sensorAlerts.length > 0 && (
                    <div className="notifications-list" style={{ marginTop: 'var(--spacing-md)' }}>
                        {sensorAlerts.map((alert, i) => (
                            <div key={i} className="notification-card" style={{ background: 'rgba(239, 68, 68, 0.2)', marginBottom: 'var(--spacing-xs)' }}>
                                ⚠️ {alert}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* نموذج إضافة/تعديل النشاط */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <h3>{isEditing ? t('activities.editActivityTitle') : t('activities.addActivityTitle')}</h3>
                    {isEditing && (
                        <button onClick={cancelEdit} className="type-btn" style={{ borderColor: 'var(--error)' }}>
                            ✖ {t('common.cancel')}
                        </button>
                    )}
                </div>
                
                <p className="stat-label" style={{ marginBottom: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)' }}>
                    {isEditing ? t('activities.editDescription') : t('activities.addDescription')}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label>{t('activities.activityType')}</label>
                        <select name="activity_type" value={formData.activity_type} onChange={handleChange} required className="search-input">
                            <option value="">{t('activities.selectActivity')}</option>
                            {getActivityOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--spacing-md)' }}>
                        <div className="field-group">
                            <label>{t('activities.duration')}</label>
                            <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required min="1" max="180" placeholder={t('activities.durationPlaceholder')} className="search-input" />
                            <small className="stat-label" style={{ display: 'block', marginTop: 'var(--spacing-xs)' }}>{t('activities.durationHint')}</small>
                        </div>
                        <div className="field-group">
                            <label>{t('activities.startTime')}</label>
                            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required className="search-input" />
                        </div>
                    </div>

                    {formData.activity_type && formData.duration_minutes && (
                        <div className="calculated-calories" style={{
                            background: 'var(--warning-bg)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            marginBottom: 'var(--spacing-md)',
                            textAlign: 'center'
                        }}>
                            <div className="calories-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                                <span>🔥</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{calculateCalories(formData.activity_type, formData.duration_minutes)}</span>
                                <span>{t('activities.estimatedCalories')}</span>
                            </div>
                        </div>
                    )}

                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label>{t('activities.notes')}</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder={t('activities.notesPlaceholder')} className="search-input" style={{ resize: 'vertical' }} />
                    </div>
                    
                    {error && <div className="analytics-error" style={{ marginBottom: 'var(--spacing-md)' }}>⚠️ {error}</div>}
                    {message && <div className="analytics-stat-card" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--success-bg)', color: 'var(--success)' }}>✅ {message}</div>}

                    <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button type="submit" disabled={loading} className="type-btn active" style={{ flex: 1 }}>
                            {loading ? t('common.saving') : (isEditing ? t('common.update') : t('common.save'))}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={cancelEdit} className="type-btn" style={{ flex: 1 }}>
                                ✖ {t('common.cancel')}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* قائمة الأنشطة - بدون أيقونات مكررة */}
            <div className="recommendations-section">
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <h3>{t('activities.history')}</h3>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <span className="stat-label">{activities.length} {t('activities.count')}</span>
                        <button onClick={fetchActivities} className="refresh-btn" disabled={fetching || loading}>
                            {fetching ? '⏳' : '🔄'}
                        </button>
                    </div>
                </div>

                {fetching ? (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="analytics-error">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchActivities} className="retry-btn">🔄 {t('common.retry')}</button>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="analytics-empty">
                        <div className="empty-icon">🏃‍♀️</div>
                        <h4>{t('activities.noActivities')}</h4>
                        <p>{t('activities.startAdding')}</p>
                    </div>
                ) : (
                    <div className="notifications-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {activities.map((activity) => (
                            <div key={activity.id} className={`notification-card ${editingId === activity.id ? 'unread' : ''}`}>
                                <div className="notification-header">
                                    <div className="notification-title">
                                        <span className="notification-icon">{getActivityIcon(activity.activity_type)}</span>
                                        <span>{getActivityOptions().find(o => o.value === activity.activity_type)?.label || activity.activity_type}</span>
                                    </div>
                                    <div className="notification-meta">
                                        <span className="notification-time">{formatDate(activity.start_time)}</span>
                                        <div className="notification-actions">
                                            <button onClick={() => loadActivityForEdit(activity)} className="notification-action-btn" disabled={loading} aria-label={t('common.edit')}>✏️</button>
                                            <button onClick={() => deleteActivity(activity.id)} className="notification-action-btn" disabled={loading} aria-label={t('common.delete')}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="notification-content">
                                    <div className="habit-stats">
                                        <span>{t('activities.duration')}: {safeValue(activity.duration_minutes)} {t('common.minutes')}</span>
                                        <span>{t('activities.calories')}: {safeValue(activity.calories_burned)} {t('common.calories')}</span>
                                    </div>
                                    {activity.notes && <div className="rec-advice" style={{ marginTop: 'var(--spacing-sm)' }}>{activity.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .pulse-dot { animation: none !important; }
                    .spinner { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

export default ActivityForm;