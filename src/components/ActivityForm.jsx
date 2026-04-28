// src/components/ActivityForm.jsx - نسخة متكاملة مع القياسات الصحية والأنشطة والمخططات والسجل الصحي
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
import HealthHistory from './HealthHistory';   // ✅ استدعاء السجل الصحي
import HealthCharts from './HealthCharts';     // ✅ استدعاء المخططات الصحية

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    // ==================== القياسات الصحية (HealthForm) ====================
    const [healthFormData, setHealthFormData] = useState({
        weight: '',
        systolic: '',
        diastolic: '',
        glucose: '',
        heartRate: '',
        spo2: '',
        temperature: ''
    });
    
    const [healthLoading, setHealthLoading] = useState(false);
    const [savingSensorData, setSavingSensorData] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    
    // ✅ حالة ESP32
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    const [lastSensorReading, setLastSensorReading] = useState(null);
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const unsubscribeESP32Ref = useRef(null);
    
    // ==================== الأنشطة ====================
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showCharts, setShowCharts] = useState(true);
    const [activityFormData, setActivityFormData] = useState({
        activity_type: '',
        duration_minutes: '',
        start_time: '',
        calories_burned: ''
    });
    
    // ✅ حالة التحليلات
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    
    // ✅ وزن المستخدم
    const [userWeight, setUserWeight] = useState(null);
    const [showCaloriesEdit, setShowCaloriesEdit] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // ✅ لإعادة تحميل History و Charts
    
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);
    
    // ✅ معاملات حرق السعرات
    const MET_VALUES = {
        walking: 3.5, running: 9.8, cycling: 7.5, swimming: 7.0,
        yoga: 2.5, weightlifting: 5.0, cardio: 6.5, other: 4.0
    };
    
    // ✅ حدود التحقق من الصحة
    const VALIDATION_LIMITS = {
        weight: { min: 20, max: 300, normalMin: 50, normalMax: 100, unit: 'kg', icon: '⚖️' },
        systolic: { min: 50, max: 250, normalMin: 90, normalMax: 140, unit: 'mmHg', icon: '❤️' },
        diastolic: { min: 30, max: 180, normalMin: 60, normalMax: 90, unit: 'mmHg', icon: '💙' },
        glucose: { min: 30, max: 600, normalMin: 70, normalMax: 140, unit: 'mg/dL', icon: '🩸' },
        heartRate: { min: 30, max: 220, normalMin: 60, normalMax: 100, unit: 'BPM', icon: '💓' },
        spo2: { min: 50, max: 100, normalMin: 95, normalMax: 100, unit: '%', icon: '💨' },
        temperature: { min: 35, max: 42, normalMin: 36.5, normalMax: 37.5, unit: '°C', icon: '🌡️' }
    };
    
    // ==================== دوال مساعدة عامة ====================
    const showMessage = useCallback((msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            if (isMountedRef.current) {
                setMessage('');
                setMessageType('');
            }
        }, 4000);
    }, []);
    
    // ✅ تحديث البيانات (لـ History و Charts)
    const refreshData = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    // ✅ جلب وزن المستخدم
    useEffect(() => {
        fetchUserWeight();
        fetchActivities();
        fetchAnalytics();
    }, []);
    
    const fetchUserWeight = async () => {
        try {
            const response = await axiosInstance.get('/health_status/latest/');
            if (response.data && response.data.weight_kg) {
                setUserWeight(response.data.weight_kg);
            } else {
                setUserWeight(70);
            }
        } catch (err) {
            console.error('Error fetching user weight:', err);
            setUserWeight(70);
        }
    };
    
    // ✅ تسجيل مستمع ESP32
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener...');
        
        const handleESP32Event = (type, data) => {
            console.log(`📡 ESP32 Event received: ${type} =`, data);
            if (!isMountedRef.current) return;
            
            if (type === 'heartRate') {
                setSensorHeartRate(data);
                setLastSensorReading(prev => ({ ...prev, heartRate: data, timestamp: new Date() }));
            } else if (type === 'spo2') {
                setSensorSpO2(data);
                setLastSensorReading(prev => ({ ...prev, spo2: data, timestamp: new Date() }));
            } else if (type === 'data') {
                if (data && data.heartRate) {
                    setSensorHeartRate(data.heartRate);
                    setLastSensorReading(prev => ({ ...prev, heartRate: data.heartRate, timestamp: new Date() }));
                }
                if (data && data.spo2) {
                    setSensorSpO2(data.spo2);
                    setLastSensorReading(prev => ({ ...prev, spo2: data.spo2, timestamp: new Date() }));
                }
            } else if (type === 'error') {
                console.error('ESP32 Error:', data);
                showMessage(isArabic ? '⚠️ خطأ في جهاز ESP32' : '⚠️ ESP32 Error', 'error');
            }
        };
        
        if (esp32Service && typeof esp32Service.on === 'function') {
            unsubscribeESP32Ref.current = esp32Service.on(handleESP32Event);
            console.log('✅ ESP32 listener registered');
        }
        
        return () => {
            if (unsubscribeESP32Ref.current) unsubscribeESP32Ref.current();
            if (esp32Service && typeof esp32Service.stopPolling === 'function') {
                esp32Service.stopPolling();
            }
        };
    }, [isArabic, showMessage]);
    
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        try {
            if (esp32Service && typeof esp32Service.startPolling === 'function') {
                esp32Service.startPolling();
                setSensorActive(true);
                if (typeof esp32Service.fetchLatestReading === 'function') {
                    await esp32Service.fetchLatestReading();
                }
                showMessage(isArabic ? '✅ تم الاتصال بجهاز ESP32' : '✅ ESP32 connected', 'success');
            } else {
                showMessage(isArabic ? '❌ خدمة ESP32 غير متاحة' : '❌ ESP32 service not available', 'error');
            }
        } catch (error) {
            console.error('ESP32 connection error:', error);
            showMessage(isArabic ? '❌ فشل الاتصال بـ ESP32' : '❌ Failed to connect to ESP32', 'error');
        } finally {
            setSensorConnecting(false);
        }
    }, [isArabic, showMessage]);
    
    const disconnectSensor = useCallback(() => {
        if (esp32Service && typeof esp32Service.stopPolling === 'function') {
            esp32Service.stopPolling();
        }
        setSensorActive(false);
        setSensorHeartRate(null);
        setSensorSpO2(null);
        showMessage(isArabic ? '🔌 تم قطع الاتصال بـ ESP32' : '🔌 ESP32 disconnected', 'info');
    }, [isArabic, showMessage]);
    
    const fillFormWithSensorData = useCallback(() => {
        if (sensorHeartRate !== null) {
            setHealthFormData(prev => ({ ...prev, heartRate: sensorHeartRate.toString() }));
        }
        if (sensorSpO2 !== null) {
            setHealthFormData(prev => ({ ...prev, spo2: sensorSpO2.toString() }));
        }
        showMessage(isArabic ? '📥 تم تعبئة النموذج بقراءات المستشعر' : '📥 Form filled with sensor readings', 'success');
    }, [sensorHeartRate, sensorSpO2, isArabic, showMessage]);
    
    const saveSensorReadingAsHealthRecord = useCallback(async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            showMessage(isArabic ? '⚠️ لا توجد قراءات من المستشعر للحفظ' : '⚠️ No sensor readings to save', 'error');
            return;
        }
        
        setSavingSensorData(true);
        const data = {};
        if (sensorHeartRate !== null) data.heart_rate = sensorHeartRate;
        if (sensorSpO2 !== null) data.spo2 = sensorSpO2;
        
        try {
            await axiosInstance.post('/health_status/', data);
            if (isMountedRef.current) {
                showMessage(isArabic ? '✅ تم حفظ قراءة المستشعر كقياس صحي' : '✅ Sensor reading saved as health record', 'success');
                if (onDataSubmitted) onDataSubmitted();
                refreshData(); // ✅ تحديث السجل الصحي والمخططات
            }
        } catch (err) {
            console.error('❌ Failed to save sensor reading:', err);
            showMessage(isArabic ? '❌ فشل حفظ قراءة المستشعر' : '❌ Failed to save sensor reading', 'error');
        } finally {
            setSavingSensorData(false);
        }
    }, [sensorHeartRate, sensorSpO2, isArabic, showMessage, onDataSubmitted, refreshData]);
    
    // ✅ الحفظ التلقائي للقياسات الصحية
    useEffect(() => {
        if (!autoSave) return;
        const autoSaveForm = () => {
            const hasData = Object.values(healthFormData).some(value => value && value.toString().trim() !== '');
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(healthFormData));
                setLastAutoSave(new Date());
            }
        };
        const timeoutId = setTimeout(autoSaveForm, 2000);
        return () => clearTimeout(timeoutId);
    }, [healthFormData, autoSave]);
    
    useEffect(() => {
        const savedData = localStorage.getItem('healthForm_autoSave');
        if (savedData && isMountedRef.current) {
            try {
                const parsedData = JSON.parse(savedData);
                setHealthFormData(parsedData);
                showMessage(isArabic ? '📂 تم استعادة البيانات المحفوظة تلقائياً' : '📂 Auto-saved data restored', 'info');
            } catch (error) {
                console.error('Error loading auto-saved data:', error);
            }
        }
    }, [isArabic, showMessage]);
    
    const validateHealthForm = useCallback(() => {
        let errors = {};
        let hasAnyData = false;
        
        if (healthFormData.weight && healthFormData.weight.toString().trim() !== '') {
            hasAnyData = true;
            const weight = parseFloat(healthFormData.weight);
            if (isNaN(weight)) {
                errors.weight = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.weight.min} - ${VALIDATION_LIMITS.weight.max} ${VALIDATION_LIMITS.weight.unit}`;
            }
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [healthFormData, isArabic, VALIDATION_LIMITS]);
    
    const handleHealthInputChange = useCallback((field, value) => {
        setHealthFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [validationErrors]);
    
    const resetHealthForm = useCallback(() => {
        setHealthFormData({
            weight: '', systolic: '', diastolic: '', glucose: '',
            heartRate: '', spo2: '', temperature: ''
        });
        setValidationErrors({});
        localStorage.removeItem('healthForm_autoSave');
        showMessage(isArabic ? '🗑️ تم مسح النموذج' : '🗑️ Form cleared', 'info');
    }, [isArabic, showMessage]);
    
    const handleHealthSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        if (!validateHealthForm()) {
            showMessage(isArabic ? '⚠️ يرجى تصحيح الأخطاء في النموذج' : '⚠️ Please correct errors in the form', 'error');
            return;
        }
        
        isSubmittingRef.current = true;
        setHealthLoading(true);
        
        const data = {};
        if (healthFormData.weight && healthFormData.weight.toString().trim() !== '') data.weight_kg = parseFloat(healthFormData.weight);
        if (healthFormData.systolic && healthFormData.systolic.toString().trim() !== '') data.systolic_pressure = parseInt(healthFormData.systolic);
        if (healthFormData.diastolic && healthFormData.diastolic.toString().trim() !== '') data.diastolic_pressure = parseInt(healthFormData.diastolic);
        if (healthFormData.glucose && healthFormData.glucose.toString().trim() !== '') data.blood_glucose = parseFloat(healthFormData.glucose);
        if (healthFormData.heartRate && healthFormData.heartRate.toString().trim() !== '') data.heart_rate = parseInt(healthFormData.heartRate);
        if (healthFormData.spo2 && healthFormData.spo2.toString().trim() !== '') data.spo2 = parseInt(healthFormData.spo2);
        if (healthFormData.temperature && healthFormData.temperature.toString().trim() !== '') data.body_temperature = parseFloat(healthFormData.temperature);
        
        try {
            await axiosInstance.post('/health_status/', data);
            if (isMountedRef.current) {
                showMessage(isArabic ? '✅ تم حفظ البيانات بنجاح' : '✅ Data saved successfully', 'success');
                resetHealthForm();
                if (onDataSubmitted) onDataSubmitted();
                refreshData(); // ✅ تحديث السجل الصحي والمخططات
            }
        } catch (err) {
            console.error('❌ Submission failed:', err);
            showMessage(isArabic ? '❌ فشل حفظ البيانات' : '❌ Failed to save data', 'error');
        } finally {
            if (isMountedRef.current) setHealthLoading(false);
            isSubmittingRef.current = false;
        }
    }, [healthFormData, onDataSubmitted, isArabic, validateHealthForm, resetHealthForm, showMessage, refreshData]);
    
    const calculateHealthIndicators = useCallback(() => {
        const indicators = [];
        // .. حساب المؤشرات الصحية
        return indicators;
    }, [healthFormData, isArabic, VALIDATION_LIMITS]);
    
    const healthIndicators = calculateHealthIndicators();
    const filledFieldsCount = Object.values(healthFormData).filter(v => v && v.toString().trim() !== '').length;
    
    const getLastReadingTime = () => {
        if (!lastSensorReading?.timestamp) return '';
        return lastSensorReading.timestamp.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };
    
    // ==================== دوال الأنشطة ====================
    const calculateCalories = (activityType, durationMinutes, weight) => {
        if (!activityType || !durationMinutes || !weight) return 0;
        const met = MET_VALUES[activityType] || 4.0;
        return Math.round(met * weight * (durationMinutes / 60));
    };
    
    const updateCalories = useCallback((activityType, durationMinutes) => {
        if (activityType && durationMinutes && userWeight) {
            const calories = calculateCalories(activityType, parseInt(durationMinutes), userWeight);
            setActivityFormData(prev => ({ ...prev, calories_burned: calories.toString() }));
            setShowCaloriesEdit(false);
        }
    }, [userWeight]);
    
    const handleActivityChange = (e) => {
        const { name, value } = e.target;
        setActivityFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'activity_type' || name === 'duration_minutes') {
            const activityType = name === 'activity_type' ? value : activityFormData.activity_type;
            const duration = name === 'duration_minutes' ? value : activityFormData.duration_minutes;
            if (activityType && duration) {
                updateCalories(activityType, duration);
            }
        }
    };
    
    const handleCaloriesChange = (e) => {
        setActivityFormData(prev => ({ ...prev, calories_burned: e.target.value }));
        setShowCaloriesEdit(true);
    };
    
    const fetchAnalytics = async () => {
        if (analyticsFetchedRef.current) return;
        analyticsFetchedRef.current = true;
        setAnalyticsLoading(true);
        try {
            const response = await axiosInstance.get('/analytics/activity-insights/').catch(() => null);
            if (response?.data && isMountedRef.current) {
                setAnalytics(response.data);
            } else if (isMountedRef.current) {
                const totalCalories = activities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
                setAnalytics({
                    total_activities: activities.length,
                    total_calories: totalCalories,
                    total_duration: activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                    avg_duration: activities.length > 0 ? Math.round(activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / activities.length) : 0,
                    avg_calories_per_activity: activities.length > 0 ? Math.round(totalCalories / activities.length) : 0
                });
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            if (isMountedRef.current) setAnalyticsLoading(false);
        }
    };
    
    const fetchActivities = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setFetching(true);
        try {
            const response = await axiosInstance.get('/activities/');
            let data = response.data?.results || response.data || [];
            const sortedData = [...data].sort((a, b) => new Date(b.start_time || b.created_at) - new Date(a.start_time || a.created_at));
            setActivities(sortedData);
            
            const totalCalories = sortedData.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
            setAnalytics(prev => ({
                ...prev,
                total_activities: sortedData.length,
                total_calories: totalCalories,
                total_duration: sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
                avg_duration: sortedData.length > 0 ? Math.round(sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / sortedData.length) : 0,
                avg_calories_per_activity: sortedData.length > 0 ? Math.round(totalCalories / sortedData.length) : 0
            }));
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setFetching(false);
            isFetchingRef.current = false;
        }
    };
    
    const handleActivitySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosInstance.post('/activities/', {
                activity_type: activityFormData.activity_type,
                duration_minutes: parseInt(activityFormData.duration_minutes),
                start_time: activityFormData.start_time || new Date().toISOString().slice(0, 16),
                calories_burned: parseInt(activityFormData.calories_burned) || 0
            });
            await fetchActivities();
            await fetchAnalytics();
            if (onDataSubmitted) onDataSubmitted();
            if (onActivityChange) onActivityChange();
            refreshData(); // ✅ تحديث السجل الصحي والمخططات
            setActivityFormData({ activity_type: '', duration_minutes: '', start_time: '', calories_burned: '' });
            setShowCaloriesEdit(false);
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // ==================== دوال التنسيق والعرض ====================
    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateString; }
    };
    
    const getActivityIcon = (type) => {
        const icons = { walking: '🚶', running: '🏃', cycling: '🚴', swimming: '🏊', yoga: '🧘', weightlifting: '🏋️', cardio: '❤️', other: '🏅' };
        return icons[type] || '🏃‍♂️';
    };
    
    const getActivityName = (type) => {
        const names = { walking: 'مشي', running: 'جري', cycling: 'دراجة', swimming: 'سباحة', yoga: 'يوجا', weightlifting: 'رفع أثقال', cardio: 'تمارين قلب', other: 'أخرى' };
        return names[type] || type;
    };
    
    const getMetIcon = (type) => {
        const met = MET_VALUES[type] || 4.0;
        if (met >= 8) return '🔥🔥';
        if (met >= 6) return '🔥';
        if (met >= 4) return '⚡';
        return '💨';
    };
    
    const getChartData = () => {
        const typeStats = {};
        activities.forEach(act => {
            const type = act.activity_type;
            if (!typeStats[type]) typeStats[type] = { count: 0, duration: 0, calories: 0 };
            typeStats[type].count++;
            typeStats[type].duration += act.duration_minutes || 0;
            typeStats[type].calories += act.calories_burned || 0;
        });
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' });
            const dayStr = date.toISOString().split('T')[0];
            const dayActivities = activities.filter(act => {
                const actDate = new Date(act.start_time || act.created_at).toISOString().split('T')[0];
                return actDate === dayStr;
            });
            last7Days.push({
                name: dayName,
                duration: dayActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0),
                calories: dayActivities.reduce((sum, a) => sum + (a.calories_burned || 0), 0),
                count: dayActivities.length
            });
        }
        return { typeStats, last7Days };
    };
    
    const chartData = getChartData();
    const maxDuration = Math.max(...Object.values(chartData.typeStats).map(s => s.duration), 0);
    const maxCalories = Math.max(...Object.values(chartData.typeStats).map(s => s.calories), 0);
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    // ==================== التصيير (Render) ====================
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* ==================== القسم 1: القياسات الصحية ==================== */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '1.5rem', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
                <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}><span style={{ fontSize: '1.5rem' }}>📝</span> {isArabic ? 'إضافة قياس صحي' : 'Add Health Reading'}</h2>
                        {filledFieldsCount > 0 && <span style={{ padding: '0.35rem 0.85rem', background: 'var(--tertiary-bg)', borderRadius: '50px', fontSize: '0.75rem' }}>📋 {filledFieldsCount}/7 {isArabic ? 'حقول مملوءة' : 'fields filled'}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} style={{ position: 'absolute', opacity: 0 }} />
                            <span style={{ width: '44px', height: '22px', background: 'var(--border-light)', borderRadius: '22px', position: 'relative', transition: 'all 0.15s' }}>
                                <span style={{ position: 'absolute', width: '18px', height: '18px', background: 'white', borderRadius: '50%', top: '2px', left: autoSave ? '24px' : '2px', transition: 'all 0.15s' }}></span>
                            </span>
                            <span style={{ fontSize: '0.8rem' }}>💾 {isArabic ? 'حفظ تلقائي' : 'Auto Save'}</span>
                        </label>
                        {lastAutoSave && <div style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'var(--tertiary-bg)', borderRadius: '8px' }}>🕐 {lastAutoSave.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</div>}
                    </div>
                </div>
                
                {/* قسم ESP32 */}
                <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🫀</span>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{isArabic ? 'جهاز مراقبة الصحي ESP32' : 'ESP32 Health Monitor'}</h3>
                        {sensorActive && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(16,185,129,0.2)', borderRadius: '20px', color: '#10b981' }}>🟢 {isArabic ? 'متصل' : 'Online'}</span>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {!sensorActive ? (
                            <button onClick={connectSensor} disabled={sensorConnecting} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                {sensorConnecting ? '⏳ جاري الاتصال...' : '🔌 اتصال ESP32'}
                            </button>
                        ) : (
                            <>
                                <button onClick={disconnectSensor} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>🔌 قطع الاتصال</button>
                                <button onClick={fillFormWithSensorData} disabled={sensorHeartRate === null && sensorSpO2 === null} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>📋 {isArabic ? 'تعبئة النموذج' : 'Fill Form'}</button>
                                <button onClick={saveSensorReadingAsHealthRecord} disabled={savingSensorData || (sensorHeartRate === null && sensorSpO2 === null)} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    {savingSensorData ? '⏳ جاري الحفظ...' : `💾 ${isArabic ? 'حفظ كقياس صحي' : 'Save as Record'}`}
                                </button>
                            </>
                        )}
                    </div>
                    
                    {sensorActive && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>❤️</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{sensorHeartRate !== null ? sensorHeartRate : '---'} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>BPM</span></span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>💨</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{sensorSpO2 !== null ? sensorSpO2 : '---'} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>SpO₂%</span></span>
                                    </div>
                                </div>
                            </div>
                            {lastSensorReading?.timestamp && <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem' }}>🕐 {isArabic ? 'آخر تحديث:' : 'Last update:'} {getLastReadingTime()}</div>}
                        </>
                    )}
                </div>
                
                {/* نموذج القياسات الصحية */}
                <form onSubmit={handleHealthSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>⚖️</span> {isArabic ? 'الوزن' : 'Weight'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(kg)</span></label>
                            <input type="number" step="0.1" value={healthFormData.weight} onChange={(e) => handleHealthInputChange('weight', e.target.value)} placeholder={isArabic ? 'مثال: 70.5' : 'Example: 70.5'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 50-100 kg</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>❤️</span> {isArabic ? 'الضغط الانقباضي' : 'Systolic'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(mmHg)</span></label>
                            <input type="number" value={healthFormData.systolic} onChange={(e) => handleHealthInputChange('systolic', e.target.value)} placeholder={isArabic ? 'مثال: 120' : 'Example: 120'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 90-140 mmHg</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>💙</span> {isArabic ? 'الضغط الانبساطي' : 'Diastolic'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(mmHg)</span></label>
                            <input type="number" value={healthFormData.diastolic} onChange={(e) => handleHealthInputChange('diastolic', e.target.value)} placeholder={isArabic ? 'مثال: 80' : 'Example: 80'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-90 mmHg</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>🩸</span> {isArabic ? 'سكر الدم' : 'Blood Glucose'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(mg/dL)</span></label>
                            <input type="number" step="0.1" value={healthFormData.glucose} onChange={(e) => handleHealthInputChange('glucose', e.target.value)} placeholder={isArabic ? 'مثال: 95' : 'Example: 95'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 70-140 mg/dL</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>💓</span> {isArabic ? 'نبضات القلب' : 'Heart Rate'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(BPM)</span></label>
                            <input type="number" value={healthFormData.heartRate} onChange={(e) => handleHealthInputChange('heartRate', e.target.value)} placeholder={isArabic ? 'مثال: 75' : 'Example: 75'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-100 BPM</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>💨</span> {isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(%)</span></label>
                            <input type="number" value={healthFormData.spo2} onChange={(e) => handleHealthInputChange('spo2', e.target.value)} placeholder={isArabic ? 'مثال: 98' : 'Example: 98'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 95-100%</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}><span>🌡️</span> {isArabic ? 'درجة الحرارة' : 'Temperature'} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>(°C)</span></label>
                            <input type="number" step="0.1" value={healthFormData.temperature} onChange={(e) => handleHealthInputChange('temperature', e.target.value)} placeholder={isArabic ? 'مثال: 37.0' : 'Example: 37.0'} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'var(--secondary-bg)' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}><span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: 36.5-37.5 °C</span></div>
                        </div>
                    </div>
                    
                    {healthIndicators.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            {healthIndicators.map((indicator, index) => (
                                <div key={index} style={{ padding: '0.5rem', marginBottom: '0.5rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>{indicator.icon}</span>
                                        <span style={{ fontWeight: 600 }}>{indicator.message}</span>
                                        {indicator.value && <span style={{ fontSize: '0.75rem', background: 'var(--card-bg)', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>{indicator.value}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem' }}>{indicator.advice}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={resetHealthForm} disabled={healthLoading} style={{ flex: 1, padding: '0.75rem', background: 'var(--secondary-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', cursor: 'pointer' }}>🗑️ {isArabic ? 'مسح النموذج' : 'Clear Form'}</button>
                        <button type="submit" disabled={healthLoading} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>{healthLoading ? '⏳ جاري الحفظ...' : `💾 ${isArabic ? 'حفظ الكل' : 'Save All'}`}</button>
                    </div>
                </form>
            </div>
            
            {/* ==================== القسم 2: الأنشطة ==================== */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>🏃 {isArabic ? 'إضافة نشاط جديد' : 'Add New Activity'}</h3>
                
                {userWeight && (
                    <div style={{ background: '#e0e7ff', padding: '8px 12px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚖️</span>
                        <span>{isArabic ? `وزنك: ${userWeight} كجم` : `Your weight: ${userWeight} kg`}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>{isArabic ? '(يستخدم لحساب السعرات)' : '(used for calorie calculation)'}</span>
                    </div>
                )}
                
                <form onSubmit={handleActivitySubmit}>
                    <select name="activity_type" value={activityFormData.activity_type} onChange={handleActivityChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <option value="">اختر نوع النشاط</option>
                        <option value="walking">🚶 مشي (3.5 MET)</option>
                        <option value="running">🏃 جري (9.8 MET)</option>
                        <option value="cycling">🚴 دراجة (7.5 MET)</option>
                        <option value="swimming">🏊 سباحة (7.0 MET)</option>
                        <option value="yoga">🧘 يوجا (2.5 MET)</option>
                        <option value="weightlifting">🏋️ رفع أثقال (5.0 MET)</option>
                        <option value="cardio">❤️ تمارين قلب (6.5 MET)</option>
                        <option value="other">🏅 أخرى (4.0 MET)</option>
                    </select>
                    
                    <input type="number" name="duration_minutes" placeholder={isArabic ? "المدة (دقائق)" : "Duration (minutes)"} value={activityFormData.duration_minutes} onChange={handleActivityChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                        <input type="number" name="calories_burned" placeholder={isArabic ? "السعرات المحروقة (تلقائي)" : "Calories burned (auto)"} value={activityFormData.calories_burned} onChange={handleCaloriesChange} style={{ width: '100%', padding: '12px', paddingRight: '90px', borderRadius: '8px', border: showCaloriesEdit ? '2px solid #f59e0b' : '1px solid #ddd', backgroundColor: showCaloriesEdit ? '#fffbeb' : 'white' }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#666', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{isArabic ? 'سعرة' : 'cal'}</span>
                    </div>
                    
                    {!showCaloriesEdit && activityFormData.activity_type && activityFormData.duration_minutes && (
                        <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>🤖</span>
                            <span>{isArabic ? 'تم حساب السعرات تلقائياً' : 'Calories calculated automatically'}</span>
                            <button type="button" onClick={() => setShowCaloriesEdit(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}>{isArabic ? 'تعديل يدوي' : 'Edit manually'}</button>
                        </div>
                    )}
                    
                    {showCaloriesEdit && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>✏️</span>
                            <span>{isArabic ? 'تم التعديل اليدوي - حساب تلقائي متوقف' : 'Manual edit - auto calculation paused'}</span>
                            <button type="button" onClick={() => { updateCalories(activityFormData.activity_type, activityFormData.duration_minutes); setShowCaloriesEdit(false); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}>{isArabic ? 'إعادة الحساب التلقائي' : 'Recalculate'}</button>
                        </div>
                    )}
                    
                    <input type="datetime-local" name="start_time" value={activityFormData.start_time} onChange={handleActivityChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'جاري الحفظ...' : '💾 حفظ النشاط'}</button>
                </form>
            </div>
            
            {/* ==================== القسم 3: السجل الصحي والمخططات ==================== */}
            <div style={{ marginBottom: '20px' }}>
                <HealthHistory 
                    refreshKey={refreshKey} 
                    onDataSubmitted={refreshData} 
                    isArabic={isArabic} 
                />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <HealthCharts 
                    refreshKey={refreshKey} 
                    isArabic={isArabic} 
                />
            </div>
            
            {/* ==================== القسم 4: تحليل الأنشطة والمخططات ==================== */}
            {activities.length > 0 && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>📈 {isArabic ? 'تحليل الأنشطة' : 'Activity Analytics'}</h3>
                        <button onClick={() => setShowCharts(!showCharts)} style={{ padding: '5px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{showCharts ? '📋 إخفاء' : '📊 إظهار'}</button>
                    </div>
                    
                    {showCharts && (
                        <>
                            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 15px 0' }}>📊 {isArabic ? 'تحليل الأنشطة' : 'Activity Analytics'}</h4>
                                {analyticsLoading ? (
                                    <p>{isArabic ? 'جاري التحليل...' : 'Loading...'}</p>
                                ) : analytics ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', textAlign: 'center' }}>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_activities || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>{isArabic ? 'عدد الأنشطة' : 'Activities'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_calories || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>{isArabic ? 'سعرات حرارية' : 'Calories'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_duration || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>{isArabic ? 'دقائق' : 'Minutes'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_duration || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>{isArabic ? 'متوسط المدة' : 'Avg Duration'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_calories_per_activity || 0}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>{isArabic ? 'سعرات/نشاط' : 'Cal/Activity'}</div></div>
                                    </div>
                                ) : <p>{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</p>}
                            </div>
                            
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 {isArabic ? 'توزيع الأنشطة حسب النوع' : 'Activities by Type'}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                        <div key={type}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                                                <span>{getActivityIcon(type)} {getActivityName(type)} <span style={{ fontSize: '11px', marginLeft: '8px', color: '#f59e0b' }}>{getMetIcon(type)} {MET_VALUES[type]} MET</span></span>
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <span>⏱️ {stats.duration} {isArabic ? 'دقيقة' : 'min'}</span>
                                                    <span style={{ color: '#f59e0b' }}>🔥 {stats.calories} {isArabic ? 'سعرة' : 'cal'}</span>
                                                    <span>({stats.count} {isArabic ? 'نشاط' : 'act'})</span>
                                                </div>
                                            </div>
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', marginBottom: '5px' }}>
                                                <div style={{ width: `${maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', padding: '6px 10px', borderRadius: '10px', color: 'white', fontSize: '11px', textAlign: 'right' }}>{stats.duration} {isArabic ? 'دقيقة' : 'min'}</div>
                                            </div>
                                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${maxCalories > 0 ? (stats.calories / maxCalories) * 100 : 0}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)', padding: '6px 10px', borderRadius: '10px', color: 'white', fontSize: '11px', textAlign: 'right' }}>🔥 {stats.calories} {isArabic ? 'سعرة' : 'cal'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 {isArabic ? 'آخر 7 أيام' : 'Last 7 Days'}</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'center', minHeight: '220px', overflowX: 'auto' }}>
                                    {chartData.last7Days.map((day, idx) => {
                                        const maxDayCalories = Math.max(...chartData.last7Days.map(d => d.calories), 1);
                                        const heightCalories = (day.calories / maxDayCalories) * 150;
                                        return (
                                            <div key={idx} style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
                                                <div style={{ height: `${heightCalories}px`, background: 'linear-gradient(180deg, #f59e0b, #ef4444)', borderRadius: '8px 8px 0 0', transition: 'height 0.5s ease', position: 'relative', marginBottom: '5px' }}>
                                                    <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', whiteSpace: 'nowrap', color: '#f59e0b' }}>🔥{day.calories}</div>
                                                </div>
                                                <div style={{ fontSize: '10px' }}>{day.name}<br /><strong>{day.duration}{isArabic ? 'د' : 'm'}</strong><br /><span style={{ fontSize: '9px', color: '#666' }}>({day.count})</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* ==================== القسم 5: السجل الزمني للأنشطة ==================== */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>📋 {isArabic ? 'السجل الزمني للأنشطة' : 'Activity Timeline'}</h3>
                
                {fetching ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
                ) : activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏃‍♂️</div>
                        <p>{isArabic ? 'لا توجد أنشطة مسجلة' : 'No activities recorded'}</p>
                        <p style={{ fontSize: '12px' }}>{isArabic ? 'أضف نشاطك الأول باستخدام النموذج أعلاه' : 'Add your first activity using the form above'}</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '30px' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, #6366f1, #8b5cf6, #a855f7)' }}></div>
                        {activities.map((act, index) => (
                            <div key={act.id} style={{ position: 'relative', marginBottom: '20px', paddingLeft: '20px' }}>
                                <div style={{ position: 'absolute', left: '-26px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', background: index === 0 ? '#f59e0b' : '#6366f1', border: '2px solid white', boxShadow: '0 0 0 2px #6366f1' }}></div>
                                <div style={{ background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8f9fa', padding: '15px', borderRadius: '10px', border: index === 0 ? '1px solid #f59e0b' : '1px solid #e0e0e0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>{act.duration_minutes} {isArabic ? 'دقيقة' : 'minutes'}{act.calories_burned > 0 && <span style={{ marginLeft: '10px', color: '#f59e0b' }}>🔥 {act.calories_burned} {isArabic ? 'سعرة' : 'cal'}</span>}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', direction: isArabic ? 'ltr' : 'ltr' }}>📅 {formatDateTime(act.start_time || act.created_at)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666', flexWrap: 'wrap' }}>
                        <span>📊 {isArabic ? 'آخر نشاط' : 'Latest'}: {getActivityName(activities[0]?.activity_type)}</span>
                        <span>⏱️ {isArabic ? 'إجمالي' : 'Total'}: {activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)} {isArabic ? 'دقيقة' : 'min'}</span>
                        <span style={{ color: '#f59e0b' }}>🔥 {isArabic ? 'إجمالي السعرات' : 'Total calories'}: {activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0)}</span>
                    </div>
                )}
            </div>
            
            {/* رسالة الإشعار */}
            {message && (
                <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', padding: '0.75rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1000, background: messageType === 'success' ? '#10b981' : messageType === 'error' ? '#ef4444' : '#3b82f6', color: 'white' }}>
                    <span>{messageType === 'success' && '✅'}{messageType === 'error' && '❌'}{messageType === 'info' && 'ℹ️'}</span>
                    <span>{message}</span>
                    <button onClick={() => { setMessage(''); setMessageType(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
                </div>
            )}
        </div>
    );
};

export default ActivityForm;