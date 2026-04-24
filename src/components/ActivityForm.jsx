'use client'
// src/components/ActivityForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
import '../index.css';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic: propIsArabic }) => {
    // ✅ استخدام isArabic من props مع إمكانية التحديث عبر الحدث
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    
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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

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
        return () => { esp32Service.stopPolling(); };
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
                    setSensorAlerts(prev => [isArabic ? `⚠️ نبض مرتفع: ${data} BPM` : `⚠️ High heart rate: ${data} BPM`, ...prev].slice(0, 3));
                    setTimeout(() => { if (isMountedRef.current) setSensorAlerts(prev => prev.slice(1)); }, 5000);
                } else if (data < 60 && data > 0) {
                    setSensorAlerts(prev => [isArabic ? `⚠️ نبض منخفض: ${data} BPM` : `⚠️ Low heart rate: ${data} BPM`, ...prev].slice(0, 3));
                    setTimeout(() => { if (isMountedRef.current) setSensorAlerts(prev => prev.slice(1)); }, 5000);
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
                setMessage(isArabic ? 'تم الاتصال بـ ESP32' : 'Connected to ESP32');
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
            }
            
            if (type === 'disconnected') {
                setSensorConnected(false);
                setSensorActive(false);
                setSensorStatus('disconnected');
                setMessage(isArabic ? 'تم قطع الاتصال بـ ESP32' : 'Disconnected from ESP32');
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
            }
            
            if (type === 'error') {
                setSensorStatus('error');
                setError(isArabic ? 'خطأ في الاتصال بـ ESP32' : 'ESP32 connection error');
                setTimeout(() => { if (isMountedRef.current) setError(null); }, 5000);
            }
        };
        
        esp32Service.onData(handleESP32Data);
        
        return () => {
            const index = esp32Service.listeners.indexOf(handleESP32Data);
            if (index > -1) esp32Service.listeners.splice(index, 1);
        };
    }, [isArabic]);

    // دالة fetchActivities
    const fetchActivities = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        isFetchingRef.current = true;
        setFetching(true);
        
        try {
            const response = await axiosInstance.get('/activities/');
            
            let activitiesData = [];
            if (response.data?.results) activitiesData = response.data.results;
            else if (Array.isArray(response.data)) activitiesData = response.data;
            
            console.log('🏃 Activities fetched:', activitiesData.length);
            
            if (isMountedRef.current) {
                setActivities(activitiesData);
                if (onActivityChange) onActivityChange();
                setRefreshAnalytics(prev => prev + 1);
                setError(null);
            }
        } catch (err) {
            console.error('Error fetching activities:', err);
            if (isMountedRef.current) {
                setError(isArabic ? 'خطأ في تحميل الأنشطة' : 'Error loading activities');
                setActivities([]);
            }
        } finally {
            if (isMountedRef.current) setFetching(false);
            isFetchingRef.current = false;
        }
    }, [onActivityChange, isArabic]);

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
        if (!dateString) return isArabic ? 'لا يوجد تاريخ' : 'No date';
        try {
            const date = new Date(dateString);
            const locale = isArabic ? 'ar-EG' : 'en-US';
            return date.toLocaleDateString(locale, {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateString; }
    };

    const deleteActivity = useCallback(async (id) => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا النشاط؟' : 'Are you sure you want to delete this activity?')) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/activities/${id}/`);
            if (isMountedRef.current) {
                setActivities(prev => prev.filter(activity => activity.id !== id));
                setMessage(isArabic ? 'تم حذف النشاط بنجاح' : 'Activity deleted successfully');
                setRefreshAnalytics(prev => prev + 1);
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
                if (onActivityChange) onActivityChange();
                if (id === editingId) { resetForm(); setIsEditing(false); setEditingId(null); }
            }
        } catch (err) {
            console.error('Error deleting activity:', err);
            if (isMountedRef.current) setError(isArabic ? 'خطأ في حذف النشاط' : 'Error deleting activity');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [onActivityChange, editingId, isArabic]);

    const getActivityOptions = () => [
        { value: 'walking', label: isArabic ? '🚶 المشي' : '🚶 Walking', icon: '🚶‍♂️', color: '#3498db' },
        { value: 'running', label: isArabic ? '🏃 الجري' : '🏃 Running', icon: '🏃‍♀️', color: '#e74c3c' },
        { value: 'weightlifting', label: isArabic ? '🏋️ رفع أثقال' : '🏋️ Weightlifting', icon: '🏋️‍♂️', color: '#9b59b6' },
        { value: 'swimming', label: isArabic ? '🏊 سباحة' : '🏊 Swimming', icon: '🏊‍♀️', color: '#00cec9' },
        { value: 'yoga', label: isArabic ? '🧘 يوجا' : '🧘 Yoga', icon: '🧘‍♀️', color: '#00b894' },
        { value: 'cardio', label: isArabic ? '❤️ تمارين قلب' : '❤️ Cardio', icon: '❤️', color: '#e17055' },
        { value: 'cycling', label: isArabic ? '🚴 ركوب دراجة' : '🚴 Cycling', icon: '🚴‍♀️', color: '#0984e3' },
        { value: 'other', label: isArabic ? '🏅 أخرى' : '🏅 Other', icon: '🏅', color: '#7f8c8d' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateFormData = () => {
        if (!formData.activity_type) return isArabic ? 'الرجاء اختيار نوع النشاط' : 'Please select activity type';
        const duration = parseInt(formData.duration_minutes);
        if (!formData.duration_minutes || duration < 1) return isArabic ? 'الرجاء إدخال مدة صحيحة' : 'Please enter a valid duration';
        if (duration > 180) return isArabic ? 'المدة لا يجب أن تتجاوز 180 دقيقة' : 'Duration cannot exceed 180 minutes';
        if (!formData.start_time) return isArabic ? 'الرجاء تحديد وقت البداية' : 'Please select start time';
        const startTime = new Date(formData.start_time);
        if (startTime > new Date()) return isArabic ? 'لا يمكن تحديد وقت في المستقبل' : 'Cannot set future time';
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
                    setMessage(isArabic ? 'تم تحديث النشاط بنجاح' : 'Activity updated successfully');
                    setActivities(prev => prev.map(a => a.id === editingId ? { ...response.data, activity_type: formData.activity_type } : a));
                }
            } else {
                response = await axiosInstance.post('/activities/', dataToSend);
                if (isMountedRef.current) {
                    setMessage(isArabic ? 'تم إضافة النشاط بنجاح' : 'Activity added successfully');
                    setActivities(prev => [{ ...response.data, activity_type: formData.activity_type }, ...prev]);
                }
            }
            
            if ((response.status === 200 || response.status === 201) && isMountedRef.current) {
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
                setRefreshAnalytics(prev => prev + 1);
                resetForm();
                if (isEditing) { setIsEditing(false); setEditingId(null); }
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
            }
        } catch (err) {
            console.error('Submission error:', err);
            if (isMountedRef.current) setError(isArabic ? 'فشل حفظ النشاط' : 'Failed to save activity');
        } finally {
            if (isMountedRef.current) setLoading(false);
            isSubmittingRef.current = false;
        }
    }, [formData, isEditing, editingId, onActivityChange, onDataSubmitted, isArabic]);

    const cancelEdit = () => {
        resetForm();
        setIsEditing(false);
        setEditingId(null);
        setMessage(isArabic ? 'تم إلغاء التعديل' : 'Edit cancelled');
        setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
    };

    const resetForm = () => {
        setFormData({ activity_type: '', duration_minutes: '', start_time: '', notes: '' });
    };

    const getActivityIcon = (type) => getActivityOptions().find(o => o.value === type)?.icon || '🏃‍♀️';
    const safeValue = (v, d = '—') => v !== null && v !== undefined ? v : d;

    const connectSensor = async () => {
        setSensorConnecting(true);
        setSensorStatus('connecting');
        
        try {
            esp32Service.startPolling();
            setSensorConnected(true);
            setSensorActive(true);
            setSensorStatus('connected');
            setMessage(isArabic ? 'تم الاتصال بـ ESP32' : 'Connected to ESP32');
            setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
        } catch (error) {
            console.error('ESP32 connection error:', error);
            if (isMountedRef.current) {
                setSensorStatus('error');
                setError(isArabic ? 'فشل الاتصال بـ ESP32' : 'Failed to connect to ESP32');
                setTimeout(() => { if (isMountedRef.current) setError(null); }, 8000);
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
        setMessage(isArabic ? 'تم قطع الاتصال بـ ESP32' : 'Disconnected from ESP32');
        setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
    };

    const addSensorDataAsHealthRecord = async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(isArabic ? 'لا توجد بيانات من المستشعر' : 'No sensor data available');
            setTimeout(() => { if (isMountedRef.current) setError(null); }, 3000);
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
            await axiosInstance.post('/health_status/', healthData);
            
            if (isMountedRef.current) {
                setMessage(isArabic ? 'تم حفظ القراءة الصحية' : 'Health record saved');
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error('Error saving health data:', err);
            if (isMountedRef.current) setError(isArabic ? 'فشل حفظ القراءة الصحية' : 'Failed to save health record');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const addSensorDataAsActivity = async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(isArabic ? 'لا توجد بيانات من المستشعر' : 'No sensor data available');
            setTimeout(() => { if (isMountedRef.current) setError(null); }, 3000);
            return;
        }

        setLoading(true);
        
        const notes = [];
        if (sensorHeartRate) notes.push(isArabic ? `النبض: ${sensorHeartRate} BPM` : `Heart rate: ${sensorHeartRate} BPM`);
        if (sensorSpO2) notes.push(isArabic ? `الأكسجين: ${sensorSpO2}%` : `Oxygen: ${sensorSpO2}%`);
        
        const sensorActivity = {
            activity_type: 'walking',
            duration_minutes: 30,
            start_time: sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            notes: notes.join(' - ')
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
                setMessage(isArabic ? 'تم إضافة النشاط من المستشعر' : 'Activity added from sensor');
                setRefreshAnalytics(prev => prev + 1);
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 3000);
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error('Error adding sensor activity:', err);
            if (isMountedRef.current) setError(isArabic ? 'فشل إضافة النشاط' : 'Failed to add activity');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const requestMeasurement = async () => {
        setLoading(true);
        try {
            await esp32Service.requestMeasurement();
            if (isMountedRef.current) {
                setMessage(isArabic ? 'جاري طلب القياس...' : 'Requesting measurement...');
                setTimeout(() => { if (isMountedRef.current) setMessage(''); }, 5000);
            }
        } catch (error) {
            console.error('Measurement request failed:', error);
            if (isMountedRef.current) setError(isArabic ? 'فشل طلب القياس' : 'Measurement request failed');
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
            {/* قسم ESP32 Monitor - بدون زر اللغة */}
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
                            <h3 style={{ margin: 0 }}>{isArabic ? 'مراقب الصحة ESP32' : 'ESP32 Health Monitor'}</h3>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>{isArabic ? 'قراءات النبض والأكسجين لحظياً' : 'Real-time BPM & SpO₂ readings'}</p>
                        </div>
                    </div>
                    
                    {!sensorActive ? (
                        <button onClick={connectSensor} disabled={sensorConnecting} className="type-btn active" style={{ background: 'var(--success)', color: 'white' }}>
                            {sensorConnecting ? '⏳ ' + (isArabic ? 'جاري الاتصال...' : 'Connecting...') : '🔌 ' + (isArabic ? 'اتصال ESP32' : 'Connect ESP32')}
                        </button>
                    ) : (
                        <button onClick={disconnectSensor} className="type-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                            🔌 {isArabic ? 'قطع الاتصال' : 'Disconnect'}
                        </button>
                    )}
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>

                {sensorStatus === 'connecting' && (
                    <div className="analytics-loading" style={{ padding: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                        <span>{isArabic ? 'جاري الاتصال بـ ESP32...' : 'Connecting to ESP32...'}</span>
                    </div>
                )}

                {sensorStatus === 'error' && (
                    <div className="analytics-error" style={{ marginTop: 'var(--spacing-md)' }}>
                        <span>⚠️ {isArabic ? 'خطأ في الاتصال' : 'Connection Error'}</span>
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
                                        {sensorHeartRate > 100 && (isArabic ? 'مرتفع' : 'High')}
                                        {sensorHeartRate < 60 && sensorHeartRate > 0 && (isArabic ? 'منخفض' : 'Low')}
                                        {sensorHeartRate >= 60 && sensorHeartRate <= 100 && sensorHeartRate && (isArabic ? 'طبيعي' : 'Normal')}
                                        {!sensorHeartRate && (isArabic ? 'بانتظار البيانات...' : 'Waiting...')}
                                    </div>
                                </div>
                            </div>
                            <div className="analytics-stat-card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                                <div className="stat-icon">💨</div>
                                <div className="stat-content">
                                    <div className="stat-value">{sensorSpO2 || '---'} <span style={{ fontSize: '0.9rem' }}>SpO₂%</span></div>
                                    <div className="stat-label">
                                        {sensorSpO2 && sensorSpO2 < 90 && (isArabic ? 'منخفض' : 'Low')}
                                        {sensorSpO2 && sensorSpO2 >= 90 && (isArabic ? 'طبيعي' : 'Normal')}
                                        {!sensorSpO2 && (isArabic ? 'بانتظار البيانات...' : 'Waiting...')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {sensorData.lastUpdate && (
                            <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                                {isArabic ? 'آخر تحديث' : 'Last update'}: {new Date(sensorData.lastUpdate).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                            </div>
                        )}

                        <div className="type-filters" style={{ justifyContent: 'center' }}>
                            <button onClick={requestMeasurement} disabled={loading} className="type-btn">
                                📊 {isArabic ? 'طلب قياس' : 'Request Measurement'}
                            </button>
                            <button onClick={addSensorDataAsHealthRecord} disabled={loading || (!sensorHeartRate && !sensorSpO2)} className="type-btn" style={{ borderColor: '#10b981' }}>
                                💾 {isArabic ? 'حفظ كقراءة صحية' : 'Save as Health Record'}
                            </button>
                            <button onClick={addSensorDataAsActivity} disabled={loading || (!sensorHeartRate && !sensorSpO2)} className="type-btn">
                                ➕ {isArabic ? 'إضافة كنشاط' : 'Add as Activity'}
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
                    <h3>{isEditing ? (isArabic ? 'تعديل النشاط' : 'Edit Activity') : (isArabic ? 'إضافة نشاط' : 'Add Activity')}</h3>
                    {isEditing && (
                        <button onClick={cancelEdit} className="type-btn" style={{ borderColor: 'var(--error)' }}>
                            ✖ {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                    )}
                </div>
                
                <p className="stat-label" style={{ marginBottom: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)' }}>
                    {isEditing ? (isArabic ? 'تعديل بيانات النشاط' : 'Edit activity details') : (isArabic ? 'أضف نشاطك الرياضي' : 'Add your physical activity')}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label>{isArabic ? 'نوع النشاط' : 'Activity Type'}</label>
                        <select name="activity_type" value={formData.activity_type} onChange={handleChange} required className="search-input">
                            <option value="">{isArabic ? 'اختر نوع النشاط' : 'Select activity type'}</option>
                            {getActivityOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="strengths-weaknesses" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--spacing-md)' }}>
                        <div className="field-group">
                            <label>{isArabic ? 'المدة (دقائق)' : 'Duration (minutes)'}</label>
                            <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} required min="1" max="180" placeholder="30" className="search-input" />
                            <small className="stat-label" style={{ display: 'block', marginTop: 'var(--spacing-xs)' }}>{isArabic ? 'أدخل المدة بالدقائق (1-180)' : 'Enter duration in minutes (1-180)'}</small>
                        </div>
                        <div className="field-group">
                            <label>{isArabic ? 'وقت البداية' : 'Start Time'}</label>
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
                                <span>{isArabic ? 'سعرة حرارية مقدرة' : 'Estimated calories'}</span>
                            </div>
                        </div>
                    )}

                    <div className="field-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label>{isArabic ? 'ملاحظات' : 'Notes'}</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder={isArabic ? 'أضف أي ملاحظات إضافية...' : 'Add any additional notes...'} className="search-input" style={{ resize: 'vertical' }} />
                    </div>
                    
                    {error && <div className="analytics-error" style={{ marginBottom: 'var(--spacing-md)' }}>⚠️ {error}</div>}
                    {message && <div className="analytics-stat-card" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--success-bg)', color: 'var(--success)' }}>✅ {message}</div>}

                    <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button type="submit" disabled={loading} className="type-btn active" style={{ flex: 1 }}>
                            {loading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isEditing ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'حفظ' : 'Save'))}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={cancelEdit} className="type-btn" style={{ flex: 1 }}>
                                ✖ {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* قائمة الأنشطة */}
            <div className="recommendations-section">
                <div className="analytics-header" style={{ marginBottom: 'var(--spacing-md)', borderBottom: 'none' }}>
                    <h3>{isArabic ? 'سجل الأنشطة' : 'Activity History'}</h3>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <span className="stat-label">{activities.length} {isArabic ? 'نشاط' : 'activities'}</span>
                        <button onClick={fetchActivities} className="refresh-btn" disabled={fetching || loading}>
                            {fetching ? '⏳' : '🔄'}
                        </button>
                    </div>
                </div>

                {fetching ? (
                    <div className="analytics-loading">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                ) : error ? (
                    <div className="analytics-error">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchActivities} className="retry-btn">🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="analytics-empty">
                        <div className="empty-icon">🏃‍♀️</div>
                        <h4>{isArabic ? 'لا توجد أنشطة' : 'No activities'}</h4>
                        <p>{isArabic ? 'ابدأ بإضافة أول نشاط رياضي لك' : 'Start by adding your first physical activity'}</p>
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
                                            <button onClick={() => loadActivityForEdit(activity)} className="notification-action-btn" disabled={loading} aria-label={isArabic ? 'تعديل' : 'Edit'}>✏️</button>
                                            <button onClick={() => deleteActivity(activity.id)} className="notification-action-btn" disabled={loading} aria-label={isArabic ? 'حذف' : 'Delete'}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="notification-content">
                                    <div className="habit-stats">
                                        <span>{isArabic ? 'المدة' : 'Duration'}: {safeValue(activity.duration_minutes)} {isArabic ? 'دقيقة' : 'min'}</span>
                                        <span>{isArabic ? 'السعرات' : 'Calories'}: {safeValue(activity.calories_burned)}</span>
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