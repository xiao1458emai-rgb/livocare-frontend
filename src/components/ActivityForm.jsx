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
    
    // مراجع لمنع التكرار
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const isFetchingRef = useRef(false);
    const pollingIntervalRef = useRef(null);
    
    // حالات التحرير
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
    const [sensorError, setSensorError] = useState(null);
    
    // بيانات النموذج
    const [formData, setFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        notes: ''
    });
    
    // قائمة الأنشطة
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    
    // ✅ السعرات الحرارية لكل دقيقة حسب نوع النشاط
    const CALORIES_PER_MINUTE = {
        'walking': 3.5,
        'running': 10.0,
        'weightlifting': 4.0,
        'swimming': 7.0,
        'yoga': 2.5,
        'pilates': 3.0,
        'cardio': 8.0,
        'cycling': 6.0,
        'football': 7.5,
        'basketball': 8.0,
        'tennis': 6.5,
        'other': 4.0
    };
    
    // ✅ خيارات الأنشطة
    const getActivityOptions = useCallback(() => [
        { value: 'walking', label: isArabic ? '🚶 المشي' : '🚶 Walking', icon: '🚶‍♂️', color: '#3498db', description: isArabic ? 'مشي خفيف أو سريع' : 'Light or brisk walking' },
        { value: 'running', label: isArabic ? '🏃 الجري' : '🏃 Running', icon: '🏃‍♀️', color: '#e74c3c', description: isArabic ? 'جري بسرعات مختلفة' : 'Running at various speeds' },
        { value: 'weightlifting', label: isArabic ? '🏋️ رفع أثقال' : '🏋️ Weightlifting', icon: '🏋️‍♂️', color: '#9b59b6', description: isArabic ? 'تمارين المقاومة والأثقال' : 'Resistance and weight training' },
        { value: 'swimming', label: isArabic ? '🏊 سباحة' : '🏊 Swimming', icon: '🏊‍♀️', color: '#00cec9', description: isArabic ? 'سباحة حرة أو متنوعة' : 'Freestyle or various strokes' },
        { value: 'yoga', label: isArabic ? '🧘 يوجا' : '🧘 Yoga', icon: '🧘‍♀️', color: '#00b894', description: isArabic ? 'تمارين المرونة والتأمل' : 'Flexibility and meditation' },
        { value: 'cardio', label: isArabic ? '❤️ تمارين قلب' : '❤️ Cardio', icon: '❤️', color: '#e17055', description: isArabic ? 'تمارين الأيروبيك والقلب' : 'Aerobic and heart exercises' },
        { value: 'cycling', label: isArabic ? '🚴 ركوب دراجة' : '🚴 Cycling', icon: '🚴‍♀️', color: '#0984e3', description: isArabic ? 'ركوب دراجة داخل أو خارج' : 'Indoor or outdoor cycling' },
        { value: 'other', label: isArabic ? '🏅 أخرى' : '🏅 Other', icon: '🏅', color: '#7f8c8d', description: isArabic ? 'أنشطة أخرى' : 'Other activities' }
    ], [isArabic]);
    
    // ✅ حساب السعرات الحرارية
    const calculateCalories = useCallback((activityType, durationMinutes) => {
        const duration = parseInt(durationMinutes) || 0;
        const caloriesPerMinute = CALORIES_PER_MINUTE[activityType] || 4.0;
        return Math.round(duration * caloriesPerMinute);
    }, []);
    
    // ✅ تنسيق التاريخ
    const formatDate = useCallback((dateString) => {
        if (!dateString) return isArabic ? 'لا يوجد تاريخ' : 'No date';
        try {
            const date = new Date(dateString);
            const locale = isArabic ? 'ar-EG' : 'en-US';
            return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    }, [isArabic]);
    
    // ✅ الاستماع لتغييرات اللغة
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
    
    // ✅ التحقق من دعم ESP32
    useEffect(() => {
        setSensorSupported(esp32Service.isSupported());
    }, []);
    
    // ✅ تفعيل ESP32 Service
    useEffect(() => {
        const enableESP32 = () => {
            console.log('ESP32 Service: Starting');
            esp32Service.startPolling();
            setSensorActive(true);
        };
        enableESP32();
        
        return () => {
            esp32Service.stopPolling();
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);
    
    // ✅ استماع لبيانات ESP32
    useEffect(() => {
        const handleESP32Data = (type, data) => {
            if (!isMountedRef.current) return;
            console.log('ESP32 Data received:', type, data);
            
            switch (type) {
                case 'heartRate':
                    setSensorHeartRate(data);
                    setSensorData(prev => ({ ...prev, heartRate: data, lastUpdate: new Date() }));
                    setSensorConnected(true);
                    setSensorActive(true);
                    setSensorStatus('connected');
                    setSensorError(null);
                    
                    if (data > 100) {
                        addSensorAlert(isArabic ? `⚠️ نبض مرتفع: ${data} BPM` : `⚠️ High heart rate: ${data} BPM`, 'error');
                    } else if (data < 60 && data > 0) {
                        addSensorAlert(isArabic ? `⚠️ نبض منخفض: ${data} BPM` : `⚠️ Low heart rate: ${data} BPM`, 'warning');
                    }
                    break;
                    
                case 'spo2':
                    setSensorSpO2(data);
                    setSensorData(prev => ({ ...prev, spo2: data, lastUpdate: new Date() }));
                    setSensorConnected(true);
                    setSensorActive(true);
                    setSensorStatus('connected');
                    setSensorError(null);
                    
                    if (data < 90 && data > 0) {
                        addSensorAlert(isArabic ? `⚠️ أكسجين منخفض: ${data}%` : `⚠️ Low oxygen: ${data}%`, 'error');
                    }
                    break;
                    
                case 'data':
                    if (data.heartRate) setSensorHeartRate(data.heartRate);
                    if (data.spo2) setSensorSpO2(data.spo2);
                    setSensorData(prev => ({ ...prev, heartRate: data.heartRate, spo2: data.spo2, lastUpdate: new Date() }));
                    setSensorConnected(true);
                    setSensorActive(true);
                    setSensorStatus('connected');
                    setSensorError(null);
                    break;
                    
                case 'connected':
                    setSensorConnected(true);
                    setSensorActive(true);
                    setSensorStatus('connected');
                    setSensorError(null);
                    showTemporaryMessage(isArabic ? '✅ تم الاتصال بـ ESP32' : '✅ Connected to ESP32', 'success');
                    break;
                    
                case 'disconnected':
                    setSensorConnected(false);
                    setSensorActive(false);
                    setSensorStatus('disconnected');
                    showTemporaryMessage(isArabic ? '⚠️ تم قطع الاتصال بـ ESP32' : '⚠️ Disconnected from ESP32', 'warning');
                    break;
                    
                case 'error':
                    setSensorStatus('error');
                    setSensorError(isArabic ? 'خطأ في الاتصال بـ ESP32' : 'ESP32 connection error');
                    showTemporaryMessage(isArabic ? '❌ خطأ في الاتصال بـ ESP32' : '❌ ESP32 connection error', 'error');
                    break;
                    
                default:
                    break;
            }
        };
        
        esp32Service.onData(handleESP32Data);
        
        return () => {
            const index = esp32Service.listeners.indexOf(handleESP32Data);
            if (index > -1) esp32Service.listeners.splice(index, 1);
        };
    }, [isArabic]);
    
    // ✅ إضافة تنبيه المستشعر
    const addSensorAlert = (alert, type) => {
        setSensorAlerts(prev => [{ message: alert, type, timestamp: Date.now() }, ...prev].slice(0, 5));
        setTimeout(() => {
            if (isMountedRef.current) {
                setSensorAlerts(prev => prev.filter(a => a.timestamp !== Date.now()));
            }
        }, 5000);
    };
    
    // ✅ عرض رسالة مؤقتة
    const showTemporaryMessage = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) setMessage('');
        }, 3000);
    };
    
    // ✅ جلب الأنشطة
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
                setError(isArabic ? '❌ خطأ في تحميل الأنشطة' : '❌ Error loading activities');
                setActivities([]);
            }
        } finally {
            if (isMountedRef.current) setFetching(false);
            isFetchingRef.current = false;
        }
    }, [onActivityChange, isArabic]);
    
    // ✅ تحميل النشاط للتعديل
    const loadActivityForEdit = useCallback((activity) => {
        setEditingId(activity.id);
        setIsEditing(true);
        setFormData({
            activity_type: activity.activity_type || '',
            duration_minutes: activity.duration_minutes?.toString() || '',
            start_time: activity.start_time ? new Date(activity.start_time).toISOString().slice(0, 16) : '',
            notes: activity.notes || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    
    // ✅ حذف النشاط
    const deleteActivity = useCallback(async (id) => {
        if (!window.confirm(isArabic ? '⚠️ هل أنت متأكد من حذف هذا النشاط؟' : '⚠️ Are you sure you want to delete this activity?')) return;
        
        setLoading(true);
        
        try {
            await axiosInstance.delete(`/activities/${id}/`);
            if (isMountedRef.current) {
                setActivities(prev => prev.filter(activity => activity.id !== id));
                showTemporaryMessage(isArabic ? '✅ تم حذف النشاط بنجاح' : '✅ Activity deleted successfully', 'success');
                setRefreshAnalytics(prev => prev + 1);
                if (onActivityChange) onActivityChange();
                if (id === editingId) {
                    resetForm();
                    setIsEditing(false);
                    setEditingId(null);
                }
            }
        } catch (err) {
            console.error('Error deleting activity:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ خطأ في حذف النشاط' : '❌ Error deleting activity');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [onActivityChange, editingId, isArabic]);
    
    // ✅ معالجة تغيير الحقول
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);
    
    // ✅ التحقق من صحة البيانات
    const validateFormData = useCallback(() => {
        if (!formData.activity_type) {
            return isArabic ? '❌ الرجاء اختيار نوع النشاط' : '❌ Please select activity type';
        }
        
        const duration = parseInt(formData.duration_minutes);
        if (!formData.duration_minutes || isNaN(duration) || duration < 1) {
            return isArabic ? '❌ الرجاء إدخال مدة صحيحة (1-180 دقيقة)' : '❌ Please enter a valid duration (1-180 minutes)';
        }
        if (duration > 180) {
            return isArabic ? '❌ المدة لا يجب أن تتجاوز 180 دقيقة' : '❌ Duration cannot exceed 180 minutes';
        }
        
        if (!formData.start_time) {
            return isArabic ? '❌ الرجاء تحديد وقت البداية' : '❌ Please select start time';
        }
        
        const startTime = new Date(formData.start_time);
        if (startTime > new Date()) {
            return isArabic ? '❌ لا يمكن تحديد وقت في المستقبل' : '❌ Cannot set future time';
        }
        
        return null;
    }, [formData, isArabic]);
    
    // ✅ إرسال النموذج
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
    
    // Use manually entered calories if provided, otherwise auto-calculate
    const calculatedCalories = formData.calories_burned || calculateCalories(formData.activity_type, formData.duration_minutes);
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
                    showTemporaryMessage(isArabic ? '✅ تم تحديث النشاط بنجاح' : '✅ Activity updated successfully', 'success');
                    setActivities(prev => prev.map(a => a.id === editingId ? { ...response.data, activity_type: formData.activity_type } : a));
                }
            } else {
                response = await axiosInstance.post('/activities/', dataToSend);
                if (isMountedRef.current) {
                    showTemporaryMessage(isArabic ? '✅ تم إضافة النشاط بنجاح' : '✅ Activity added successfully', 'success');
                    setActivities(prev => [{ ...response.data, activity_type: formData.activity_type }, ...prev]);
                }
            }
            
            if ((response.status === 200 || response.status === 201) && isMountedRef.current) {
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
                setRefreshAnalytics(prev => prev + 1);
                resetForm();
                if (isEditing) {
                    setIsEditing(false);
                    setEditingId(null);
                }
            }
        } catch (err) {
            console.error('Submission error:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ فشل حفظ النشاط' : '❌ Failed to save activity');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
            isSubmittingRef.current = false;
        }
    }, [formData, isEditing, editingId, onActivityChange, onDataSubmitted, isArabic, calculateCalories, validateFormData]);
    
    // ✅ إلغاء التعديل
    const cancelEdit = useCallback(() => {
        resetForm();
        setIsEditing(false);
        setEditingId(null);
        showTemporaryMessage(isArabic ? 'ℹ️ تم إلغاء التعديل' : 'ℹ️ Edit cancelled', 'info');
    }, [isArabic]);
    
    // ✅ إعادة تعيين النموذج
const resetForm = useCallback(() => {
    setFormData({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        notes: '',
        calories_burned: null  // Add this field
    });
}, []);
    
    // ✅ الاتصال بالمستشعر
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        setSensorStatus('connecting');
        setSensorError(null);
        
        try {
            esp32Service.startPolling();
            setSensorConnected(true);
            setSensorActive(true);
            setSensorStatus('connected');
            showTemporaryMessage(isArabic ? '✅ تم الاتصال بـ ESP32' : '✅ Connected to ESP32', 'success');
        } catch (error) {
            console.error('ESP32 connection error:', error);
            if (isMountedRef.current) {
                setSensorStatus('error');
                setSensorError(isArabic ? '❌ فشل الاتصال بـ ESP32' : '❌ Failed to connect to ESP32');
                showTemporaryMessage(isArabic ? '❌ فشل الاتصال بـ ESP32' : '❌ Failed to connect to ESP32', 'error');
            }
        } finally {
            if (isMountedRef.current) setSensorConnecting(false);
        }
    }, [isArabic]);
    
    // ✅ قطع الاتصال بالمستشعر
    const disconnectSensor = useCallback(() => {
        esp32Service.stopPolling();
        setSensorConnected(false);
        setSensorActive(false);
        setSensorStatus('disconnected');
        setSensorHeartRate(null);
        setSensorSpO2(null);
        setSensorData({ heartRate: null, spo2: null, lastUpdate: null });
        showTemporaryMessage(isArabic ? '⚠️ تم قطع الاتصال بـ ESP32' : '⚠️ Disconnected from ESP32', 'warning');
    }, [isArabic]);
    
    // ✅ حفظ قراءة المستشعر كسجل صحي
    const addSensorDataAsHealthRecord = useCallback(async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(isArabic ? '⚠️ لا توجد بيانات من المستشعر' : '⚠️ No sensor data available');
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
            await axiosInstance.post('/health_status/', healthData);
            
            if (isMountedRef.current) {
                showTemporaryMessage(isArabic ? '✅ تم حفظ القراءة الصحية' : '✅ Health record saved', 'success');
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error('Error saving health data:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ فشل حفظ القراءة الصحية' : '❌ Failed to save health record');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [sensorHeartRate, sensorSpO2, sensorData, onActivityChange, onDataSubmitted, isArabic]);
    
    // ✅ إضافة قراءة المستشعر كنشاط
    const addSensorDataAsActivity = useCallback(async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            setError(isArabic ? '⚠️ لا توجد بيانات من المستشعر' : '⚠️ No sensor data available');
            setTimeout(() => {
                if (isMountedRef.current) setError(null);
            }, 3000);
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
                showTemporaryMessage(isArabic ? '✅ تم إضافة النشاط من المستشعر' : '✅ Activity added from sensor', 'success');
                setRefreshAnalytics(prev => prev + 1);
                if (onActivityChange) onActivityChange();
                if (onDataSubmitted) onDataSubmitted();
            }
        } catch (err) {
            console.error('Error adding sensor activity:', err);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ فشل إضافة النشاط' : '❌ Failed to add activity');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [sensorHeartRate, sensorSpO2, sensorData, onActivityChange, onDataSubmitted, isArabic, calculateCalories]);
    
    // ✅ طلب قياس من المستشعر
    const requestMeasurement = useCallback(async () => {
        setLoading(true);
        try {
            await esp32Service.requestMeasurement();
            if (isMountedRef.current) {
                showTemporaryMessage(isArabic ? '📊 جاري طلب القياس...' : '📊 Requesting measurement...', 'info');
            }
        } catch (error) {
            console.error('Measurement request failed:', error);
            if (isMountedRef.current) {
                setError(isArabic ? '❌ فشل طلب القياس' : '❌ Measurement request failed');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [isArabic]);
    
    // ✅ جلب الأنشطة عند التحميل
    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);
    
    // ✅ تنظيف عند إزالة المكون
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            esp32Service.stopPolling();
        };
    }, []);
    
    // ✅ الحصول على أيقونة النشاط
    const getActivityIcon = useCallback((type) => {
        return getActivityOptions().find(o => o.value === type)?.icon || '🏃‍♀️';
    }, [getActivityOptions]);
    
    // ✅ قيمة آمنة للعرض
    const safeValue = (v, d = '—') => v !== null && v !== undefined ? v : d;
    
    // ✅ حالة الرسالة
    const [messageType, setMessageType] = useState('success');
    
    return (
        <div className="activity-form-wrapper">
            {/* ✅ قسم ESP32 Monitor */}
            <div className={`sensor-section ${sensorStatus === 'connected' ? 'connected' : ''}`}>
                <div className="sensor-header">
                    <div className="sensor-title">
                        <div className="sensor-icon-wrapper">
                            <span className="sensor-icon">🫀</span>
                            {sensorActive && <span className="sensor-status-dot"></span>}
                        </div>
                        <div>
                            <h3 className="sensor-heading">{isArabic ? 'مراقب الصحة ESP32' : 'ESP32 Health Monitor'}</h3>
                            <p className="sensor-subtitle">{isArabic ? 'قراءات النبض والأكسجين لحظياً' : 'Real-time BPM & SpO₂ readings'}</p>
                        </div>
                    </div>
                    
                    {!sensorActive ? (
                        <button 
                            onClick={connectSensor} 
                            disabled={sensorConnecting} 
                            className="connect-sensor-btn"
                        >
                            {sensorConnecting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    {isArabic ? 'جاري الاتصال...' : 'Connecting...'}
                                </>
                            ) : (
                                <>
                                    🔌 {isArabic ? 'اتصال ESP32' : 'Connect ESP32'}
                                </>
                            )}
                        </button>
                    ) : (
                        <button onClick={disconnectSensor} className="disconnect-sensor-btn">
                            🔌 {isArabic ? 'قطع الاتصال' : 'Disconnect'}
                        </button>
                    )}
                </div>
                
                {sensorStatus === 'connecting' && (
                    <div className="sensor-loading">
                        <div className="spinner"></div>
                        <span>{isArabic ? 'جاري الاتصال بـ ESP32...' : 'Connecting to ESP32...'}</span>
                    </div>
                )}
                
                {sensorActive && (
                    <div className="sensor-data">
                        <div className="sensor-stats">
                            <div className="sensor-stat heart-rate">
                                <div className="stat-icon">❤️</div>
                                <div className="stat-details">
                                    <div className="stat-value">
                                        {safeValue(sensorHeartRate, '---')} 
                                        <span className="stat-unit">BPM</span>
                                    </div>
                                    <div className="stat-status">
                                        {sensorHeartRate > 100 && <span className="status-high">{isArabic ? 'مرتفع ⬆️' : 'High ⬆️'}</span>}
                                        {sensorHeartRate < 60 && sensorHeartRate > 0 && <span className="status-low">{isArabic ? 'منخفض ⬇️' : 'Low ⬇️'}</span>}
                                        {sensorHeartRate >= 60 && sensorHeartRate <= 100 && sensorHeartRate && <span className="status-normal">{isArabic ? 'طبيعي ✅' : 'Normal ✅'}</span>}
                                        {!sensorHeartRate && <span className="status-waiting">{isArabic ? 'بانتظار البيانات...' : 'Waiting...'}</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="sensor-stat spo2">
                                <div className="stat-icon">💨</div>
                                <div className="stat-details">
                                    <div className="stat-value">
                                        {safeValue(sensorSpO2, '---')} 
                                        <span className="stat-unit">SpO₂%</span>
                                    </div>
                                    <div className="stat-status">
                                        {sensorSpO2 && sensorSpO2 < 90 && <span className="status-low">{isArabic ? 'منخفض ⬇️' : 'Low ⬇️'}</span>}
                                        {sensorSpO2 && sensorSpO2 >= 90 && <span className="status-normal">{isArabic ? 'طبيعي ✅' : 'Normal ✅'}</span>}
                                        {!sensorSpO2 && <span className="status-waiting">{isArabic ? 'بانتظار البيانات...' : 'Waiting...'}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {sensorData.lastUpdate && (
                            <div className="sensor-timestamp">
                                {isArabic ? 'آخر تحديث' : 'Last update'}: {new Date(sensorData.lastUpdate).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                            </div>
                        )}
                        
                        <div className="sensor-actions">
                            <button onClick={addSensorDataAsHealthRecord} disabled={loading || (!sensorHeartRate && !sensorSpO2)} className="sensor-action-btn health">
                                💾 {isArabic ? 'حفظ كقراءة صحية' : 'Save as Health Record'}
                            </button>
                        </div>
                    </div>
                )}
                
                {sensorAlerts.length > 0 && (
                    <div className="sensor-alerts">
                        {sensorAlerts.map((alert, i) => (
                            <div key={i} className={`sensor-alert ${alert.type}`}>
                                ⚠️ {alert.message}
                            </div>
                        ))}
                    </div>
                )}
                
                {sensorError && (
                    <div className="sensor-error">
                        ❌ {sensorError}
                    </div>
                )}
            </div>
            
            {/* ✅ نموذج إضافة/تعديل النشاط */}
            <div className="activity-form-card">
                <div className="activity-form-header">
                    <h3 className="activity-form-title">
                        {isEditing ? (
                            <>✏️ {isArabic ? 'تعديل النشاط' : 'Edit Activity'}</>
                        ) : (
                            <>➕ {isArabic ? 'إضافة نشاط جديد' : 'Add New Activity'}</>
                        )}
                    </h3>
                    {isEditing && (
                        <button onClick={cancelEdit} className="cancel-edit-btn">
                            ✖ {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="activity-form">
                    <div className="form-group">
                        <label className="form-label">{isArabic ? 'نوع النشاط' : 'Activity Type'}</label>
                        <select 
                            name="activity_type" 
                            value={formData.activity_type} 
                            onChange={handleChange} 
                            required 
                            className="form-select"
                        >
                            <option value="">{isArabic ? 'اختر نوع النشاط' : 'Select activity type'}</option>
                            {getActivityOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.icon} {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{isArabic ? 'المدة (دقائق)' : 'Duration (minutes)'}</label>
                            <input 
                                type="number" 
                                name="duration_minutes" 
                                value={formData.duration_minutes} 
                                onChange={handleChange} 
                                required 
                                min="1" 
                                max="180" 
                                placeholder={isArabic ? 'مثال: 30' : 'e.g., 30'}
                                className="form-input"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">{isArabic ? 'وقت البداية' : 'Start Time'}</label>
                            <input 
                                type="datetime-local" 
                                name="start_time" 
                                value={formData.start_time} 
                                onChange={handleChange} 
                                required 
                                className="form-input"
                            />
                        </div>
                    </div>
                    
                        {formData.activity_type && formData.duration_minutes && (
                            <div className="calories-card">
                                <div className="calories-icon">🔥</div>
                                <div className="calories-details">
                                    <div className="calories-label">{isArabic ? 'السعرات الحرارية' : 'Calories Burned'}</div>
                                    <div className="calories-input-wrapper">
                                        <input 
                                            type="number" 
                                            name="calories_burned"
                                            value={formData.calories_burned || calculateCalories(formData.activity_type, formData.duration_minutes)}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                setFormData(prev => ({ ...prev, calories_burned: value }));
                                            }}
                                            min="0"
                                            max="5000"
                                            step="5"
                                            className="calories-input"
                                        />
                                        <span className="calories-unit">{isArabic ? 'سعرة' : 'kcal'}</span>
                                    </div>
                                    <div className="calories-auto-hint">
                                        <small>{isArabic ? '↻ محسوب تلقائياً، يمكنك تعديله' : '↻ Auto-calculated, editable'}</small>
                                    </div>
                                </div>
                            </div>
                        )}
                    
                    <div className="form-group">
                        <label className="form-label">{isArabic ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="3" 
                            placeholder={isArabic ? 'أضف أي ملاحظات إضافية عن النشاط...' : 'Add any additional notes about the activity...'} 
                            className="form-textarea"
                        />
                    </div>
                    
                    {(error || message) && (
                        <div className={`form-message ${messageType}`}>
                            {messageType === 'error' ? '❌' : messageType === 'success' ? '✅' : 'ℹ️'} {error || message}
                        </div>
                    )}
                    
                    <div className="form-actions">
                        <button type="submit" disabled={loading} className="submit-btn">
                            {loading ? (
                                <><span className="spinner-small"></span> {isArabic ? 'جاري الحفظ...' : 'Saving...'}</>
                            ) : (
                                <>{isEditing ? (isArabic ? '💾 تحديث' : '💾 Update') : (isArabic ? '💾 حفظ' : '💾 Save')}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            {/* ✅ قائمة الأنشطة */}
            <div className="activities-list-card">
                <div className="activities-header">
                    <h3 className="activities-title">
                        📋 {isArabic ? 'سجل الأنشطة' : 'Activity History'}
                    </h3>
                    <button onClick={fetchActivities} className="refresh-activities-btn" disabled={fetching || loading}>
                        {fetching ? '⏳' : '🔄'}
                    </button>
                </div>
                
                {fetching ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchActivities} className="retry-btn">
                            🔄 {isArabic ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏃‍♀️</div>
                        <h4>{isArabic ? 'لا توجد أنشطة' : 'No Activities'}</h4>
                        <p>{isArabic ? 'ابدأ بإضافة أول نشاط رياضي لك' : 'Start by adding your first physical activity'}</p>
                    </div>
                ) : (
                    <div className="activities-list">
                        {activities.map((activity) => (
                            <div key={activity.id} className={`activity-item ${editingId === activity.id ? 'editing' : ''}`}>
                                <div className="activity-item-header">
                                    <div className="activity-type">
                                        <span className="activity-icon">{getActivityIcon(activity.activity_type)}</span>
                                        <span className="activity-name">
                                            {getActivityOptions().find(o => o.value === activity.activity_type)?.label || activity.activity_type}
                                        </span>
                                    </div>
                                    <div className="activity-actions">
                                        <button 
                                            onClick={() => loadActivityForEdit(activity)} 
                                            className="edit-activity-btn" 
                                            disabled={loading}
                                            title={isArabic ? 'تعديل' : 'Edit'}
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => deleteActivity(activity.id)} 
                                            className="delete-activity-btn" 
                                            disabled={loading}
                                            title={isArabic ? 'حذف' : 'Delete'}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="activity-item-details">
                                    <div className="activity-detail">
                                        <span className="detail-icon">⏱️</span>
                                        <span>{isArabic ? 'المدة' : 'Duration'}: {safeValue(activity.duration_minutes)} {isArabic ? 'دقيقة' : 'min'}</span>
                                    </div>
                                    <div className="activity-detail">
                                        <span className="detail-icon">🔥</span>
                                        <span>{isArabic ? 'السعرات' : 'Calories'}: {safeValue(activity.calories_burned)} {isArabic ? 'سعرة' : 'kcal'}</span>
                                    </div>
                                    <div className="activity-detail">
                                        <span className="detail-icon">📅</span>
                                        <span>{formatDate(activity.start_time)}</span>
                                    </div>
                                </div>
                                
                                {activity.notes && (
                                    <div className="activity-notes">
                                        💬 {activity.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <style jsx>{`
                /* ===========================================
                   الحاوية الرئيسية - تأخذ العرض الكامل
                =========================================== */
                .activity-form-wrapper {
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                /* ===========================================
                   قسم المستشعر
                =========================================== */
                .sensor-section {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    transition: all 0.25s;
                    width: 100%;
                }
                
                .sensor-section.connected {
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
                }
                
                .sensor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .sensor-title {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                
                .sensor-icon-wrapper {
                    position: relative;
                }
                
                .sensor-icon {
                    font-size: 2rem;
                }
                
                .sensor-status-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                    border: 2px solid white;
                }
                
                .sensor-heading {
                    margin: 0;
                    color: white;
                    font-size: 1.1rem;
                }
                
                .sensor-subtitle {
                    margin: 4px 0 0;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.7rem;
                }
                
                .connect-sensor-btn,
                .disconnect-sensor-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.15s;
                    font-size: 0.85rem;
                }
                
                .connect-sensor-btn {
                    background: #10b981;
                    color: white;
                }
                
                .connect-sensor-btn:hover:not(:disabled) {
                    background: #059669;
                    transform: translateY(-2px);
                }
                
                .disconnect-sensor-btn {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }
                
                .disconnect-sensor-btn:hover {
                    background: rgba(239, 68, 68, 0.3);
                }
                
                .sensor-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .sensor-stat {
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .sensor-stat .stat-icon {
                    font-size: 1.5rem;
                }
                
                .stat-details {
                    flex: 1;
                }
                
                .stat-value {
                    font-size: 1.3rem;
                    font-weight: bold;
                    color: white;
                    line-height: 1.2;
                }
                
                .stat-unit {
                    font-size: 0.7rem;
                    font-weight: normal;
                    opacity: 0.8;
                }
                
                .stat-status {
                    font-size: 0.6rem;
                    margin-top: 2px;
                }
                
                .status-high { color: #f87171; }
                .status-low { color: #fbbf24; }
                .status-normal { color: #34d399; }
                .status-waiting { color: #94a3b8; }
                
                .sensor-timestamp {
                    text-align: center;
                    color: rgba(255,255,255,0.6);
                    font-size: 0.65rem;
                    margin-bottom: 1rem;
                }
                
                .sensor-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                .sensor-action-btn {
                    padding: 0.4rem 0.75rem;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    color: white;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                
                .sensor-action-btn:hover:not(:disabled) {
                    background: rgba(255,255,255,0.2);
                    transform: translateY(-2px);
                }
                
                .sensor-action-btn.health:hover {
                    background: #10b981;
                    border-color: #10b981;
                }
                
                .sensor-action-btn.activity:hover {
                    background: #6366f1;
                    border-color: #6366f1;
                }
                
                .sensor-alerts {
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .sensor-alert {
                    padding: 0.5rem;
                    border-radius: 8px;
                    font-size: 0.75rem;
                }
                
                .sensor-alert.error {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }
                
                .sensor-alert.warning {
                    background: rgba(245, 158, 11, 0.2);
                    color: #fbbf24;
                }
                
                .sensor-error {
                    margin-top: 1rem;
                    padding: 0.5rem;
                    background: rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    color: #f87171;
                    text-align: center;
                    font-size: 0.75rem;
                }
                
                /* ===========================================
                   نموذج النشاط
                =========================================== */
                .activity-form-card {
                    background: var(--card-bg, #ffffff);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    border: 1px solid var(--border-light, #e2e8f0);
                    width: 100%;
                }
                
                .dark-mode .activity-form-card {
                    background: var(--card-bg, #1e293b);
                    border-color: var(--border-light, #334155);
                }
                
                .activity-form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .activity-form-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: 1.1rem;
                }
                
                .cancel-edit-btn {
                    padding: 0.25rem 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                
                .form-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .form-group {
                    margin-bottom: 0.75rem;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    font-size: 0.85rem;
                    color: var(--text-primary, #0f172a);
                }
                
                .form-select,
                .form-input,
                .form-textarea {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                    border-radius: 8px;
                    background: var(--input-bg, #ffffff);
                    color: var(--text-primary, #0f172a);
                    font-size: 0.85rem;
                }
                
                .calories-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border-radius: 12px;
                    margin-bottom: 0.75rem;
                }
                
                .calories-icon {
                    font-size: 1.5rem;
                }
                
                .calories-details {
                    flex: 1;
                }
                
                .calories-label {
                    font-size: 0.7rem;
                    color: #92400e;
                }
                
                .calories-value {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: #d97706;
                }
                
                .calories-unit {
                    font-size: 0.7rem;
                    font-weight: normal;
                }
                
                .form-message {
                    padding: 0.5rem;
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                    font-size: 0.8rem;
                }
                
                .form-message.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .form-message.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .form-message.info {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }
                
                .form-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                }
                
                .submit-btn {
                    flex: 1;
                    padding: 0.6rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                
                /* ===========================================
                   قائمة الأنشطة
                =========================================== */
                .activities-list-card {
                    background: var(--card-bg, #ffffff);
                    border-radius: 20px;
                    padding: 1.25rem;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    border: 1px solid var(--border-light, #e2e8f0);
                    width: 100%;
                }
                
                .activities-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid var(--border-light, #e2e8f0);
                }
                
                .activities-title {
                    margin: 0;
                    color: var(--text-primary, #0f172a);
                    font-size: 1rem;
                }
                
                .refresh-activities-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: var(--secondary-bg, #f1f5f9);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                }
                
                .activities-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .activity-item {
                    background: var(--secondary-bg, #f8fafc);
                    border-radius: 12px;
                    padding: 0.75rem;
                    border: 1px solid var(--border-light, #e2e8f0);
                }
                
                .dark-mode .activity-item {
                    background: var(--secondary-bg, #0f172a);
                }
                
                .activity-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .activity-type {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .activity-icon {
                    font-size: 1.2rem;
                }
                
                .activity-name {
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: var(--text-primary, #0f172a);
                }
                
                .activity-actions {
                    display: flex;
                    gap: 0.25rem;
                }
                
                .edit-activity-btn,
                .delete-activity-btn {
                    background: none;
                    border: none;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 6px;
                }
                
                .edit-activity-btn:hover {
                    background: rgba(59, 130, 246, 0.1);
                }
                
                .delete-activity-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
                
                .activity-item-details {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    font-size: 0.7rem;
                    color: var(--text-secondary, #475569);
                }
                
                .activity-detail {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .activity-notes {
                    margin-top: 0.5rem;
                    padding: 0.5rem;
                    background: var(--tertiary-bg, #f1f5f9);
                    border-radius: 8px;
                    font-size: 0.7rem;
                    color: var(--text-secondary, #475569);
                }
                
                .loading-state,
                .error-state,
                .empty-state {
                    text-align: center;
                    padding: 1.5rem;
                }
                
                .empty-icon {
                    font-size: 2rem;
                    margin-bottom: 0.75rem;
                    opacity: 0.5;
                }
                
                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid var(--border-light, #e2e8f0);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 0.75rem;
                }
                
                .spinner-small {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin-right: 0.5rem;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                
                /* ===========================================
                   استجابة الجوال
                =========================================== */
                @media (max-width: 768px) {
                    .sensor-section {
                        padding: 1rem;
                        margin-bottom: 1rem;
                    }
                    
                    .sensor-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .sensor-stats {
                        grid-template-columns: 1fr;
                        gap: 0.75rem;
                    }
                    
                    .sensor-actions {
                        flex-direction: column;
                    }
                    
                    .sensor-action-btn {
                        width: 100%;
                        text-align: center;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                    
                    .activity-form-card,
                    .activities-list-card {
                        padding: 1rem;
                    }
                    
                    .activity-item-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .activity-item-details {
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .sensor-heading {
                        font-size: 0.95rem;
                    }
                    
                    .stat-value {
                        font-size: 1rem;
                    }
                    
                    .activity-form-title {
                        font-size: 0.95rem;
                    }
                    
                    .form-label {
                        font-size: 0.75rem;
                    }
                    
                    .form-select,
                    .form-input,
                    .form-textarea {
                        font-size: 0.75rem;
                        padding: 0.4rem 0.6rem;
                    }
                    
                    .calories-value {
                        font-size: 1rem;
                    }
                    
                    .submit-btn {
                        padding: 0.5rem;
                        font-size: 0.75rem;
                    }
                    
                    .activities-title {
                        font-size: 0.9rem;
                    }
                    
                    .activity-name {
                        font-size: 0.8rem;
                    }
                }
                
                /* ===========================================
                   دعم RTL
                =========================================== */
                [dir="rtl"] .sensor-title {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .activity-type {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .activity-detail {
                    flex-direction: row-reverse;
                }
                
                [dir="rtl"] .form-group {
                    text-align: right;
                }
                
                [dir="rtl"] .form-actions {
                    flex-direction: row-reverse;
                }
                    .calories-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.calories-input {
    width: 120px;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 0.9rem;
    font-weight: 600;
    text-align: center;
}

.calories-input:focus {
    outline: none;
    border-color: #6366f1;
    ring: 2px solid rgba(99, 102, 241, 0.2);
}

.calories-auto-hint {
    margin-top: 0.25rem;
}

.calories-auto-hint small {
    font-size: 0.65rem;
    opacity: 0.7;
}
            `}</style>
        </div>
    );
};

export default ActivityForm;