// src/components/ActivityForm.jsx - النسخة المحسنة
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
import HealthHistory from './HealthHistory';
import HealthCharts from './HealthCharts';
import ActivityAnalytics from './Analytics/ActivityAnalytics';
import '../index.css';

const ActivityForm = ({ onDataSubmitted, onActivityChange, isArabic }) => {
    // ==================== القياسات الصحية ====================
    const [healthFormData, setHealthFormData] = useState({
        weight: '', systolic: '', diastolic: '', glucose: '',
        heartRate: '', spo2: '', temperature: ''
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
        activity_type: '', duration_minutes: '', start_time: '', calories_burned: ''
    });
    
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [userWeight, setUserWeight] = useState(null);
    const [userHeight, setUserHeight] = useState(null);
    const [userAge, setUserAge] = useState(null);
    const [userGender, setUserGender] = useState(null);
    const [recommendedCalories, setRecommendedCalories] = useState(null);
    const [showCaloriesEdit, setShowCaloriesEdit] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const isFetchingRef = useRef(false);
    const analyticsFetchedRef = useRef(false);
    
    // ✅ معاملات حرق السعرات
    const MET_VALUES = {
        walking: 3.5, running: 9.8, cycling: 7.5, swimming: 7.0,
        yoga: 2.5, weightlifting: 5.0, cardio: 6.5, other: 4.0
    };
    
    const VALIDATION_LIMITS = {
        weight: { min: 20, max: 300, normalMin: 50, normalMax: 100, unit: 'kg', icon: '⚖️' },
        systolic: { min: 50, max: 250, normalMin: 90, normalMax: 140, unit: 'mmHg', icon: '❤️' },
        diastolic: { min: 30, max: 180, normalMin: 60, normalMax: 90, unit: 'mmHg', icon: '💙' },
        glucose: { min: 30, max: 600, normalMin: 70, normalMax: 140, unit: 'mg/dL', icon: '🩸' },
        heartRate: { min: 30, max: 220, normalMin: 60, normalMax: 100, unit: 'BPM', icon: '💓' },
        spo2: { min: 50, max: 100, normalMin: 95, normalMax: 100, unit: '%', icon: '💨' },
        temperature: { min: 35, max: 42, normalMin: 36.5, normalMax: 37.5, unit: '°C', icon: '🌡️' }
    };
    
    // ==================== دوال مساعدة ====================
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
    
    const refreshData = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    // ✅ تحسين دالة fetchUserWeight (إضافة تخزين محلي وجلب بيانات إضافية)
    const fetchUserWeight = useCallback(async () => {
        // محاولة读取 من localStorage أولاً
        const cachedWeight = localStorage.getItem('user_weight');
        const cachedHeight = localStorage.getItem('user_height');
        const cachedAge = localStorage.getItem('user_age');
        const cachedGender = localStorage.getItem('user_gender');
        const cachedTime = localStorage.getItem('user_data_timestamp');
        
        // إذا كانت البيانات مخزنة منذ أقل من ساعة، استخدمها
        if (cachedWeight && cachedTime && (Date.now() - parseInt(cachedTime)) < 3600000) {
            setUserWeight(parseFloat(cachedWeight));
            if (cachedHeight) setUserHeight(parseFloat(cachedHeight));
            if (cachedAge) setUserAge(parseInt(cachedAge));
            if (cachedGender) setUserGender(cachedGender);
            calculateRecommendedCalories(parseFloat(cachedWeight), parseFloat(cachedHeight), parseInt(cachedAge), cachedGender);
            return;
        }
        
        try {
            // جلب البيانات الصحية
            const healthResponse = await axiosInstance.get('/health_status/');
            let records = [];
            if (healthResponse.data?.results) {
                records = healthResponse.data.results;
            } else if (Array.isArray(healthResponse.data)) {
                records = healthResponse.data;
            }
            
            if (records.length > 0) {
                const sortedRecords = [...records].sort((a, b) => 
                    new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || a.created_at)
                );
                const latest = sortedRecords[0];
                if (latest && latest.weight_kg) {
                    const weight = parseFloat(latest.weight_kg);
                    setUserWeight(weight);
                    localStorage.setItem('user_weight', weight);
                    
                    // تخزين وقت التخزين المؤقت
                    localStorage.setItem('user_data_timestamp', Date.now().toString());
                } else {
                    setUserWeight(70);
                    localStorage.setItem('user_weight', '70');
                }
            } else {
                setUserWeight(70);
                localStorage.setItem('user_weight', '70');
            }
            
            // جلب بيانات الملف الشخصي (الطول، العمر، الجنس)
            try {
                const profileResponse = await axiosInstance.get('/profile/');
                if (profileResponse.data) {
                    if (profileResponse.data.height_cm) {
                        const height = parseFloat(profileResponse.data.height_cm);
                        setUserHeight(height);
                        localStorage.setItem('user_height', height);
                    }
                    if (profileResponse.data.birth_date) {
                        const age = new Date().getFullYear() - new Date(profileResponse.data.birth_date).getFullYear();
                        setUserAge(age);
                        localStorage.setItem('user_age', age);
                    }
                    if (profileResponse.data.gender) {
                        setUserGender(profileResponse.data.gender);
                        localStorage.setItem('user_gender', profileResponse.data.gender);
                    }
                }
            } catch (profileErr) {
                console.log('Profile data not available:', profileErr);
            }
            
            // حساب السعرات الموصى بها
            calculateRecommendedCalories(
                userWeight || 70, 
                userHeight || 170, 
                userAge || 30, 
                userGender || 'male'
            );
            
        } catch (err) {
            console.error('Error fetching user weight:', err);
            const fallbackWeight = 70;
            setUserWeight(fallbackWeight);
            localStorage.setItem('user_weight', fallbackWeight);
        }
    }, [userWeight, userHeight, userAge, userGender]);
    
    // ✅ دالة حساب السعرات اليومية الموصى بها (Mifflin-St Jeor Formula)
    const calculateRecommendedCalories = useCallback((weight, height, age, gender) => {
        if (!weight || !height || !age) {
            setRecommendedCalories(2000);
            return;
        }
        
        let bmr;
        if (gender === 'female') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        }
        
        // معامل النشاط (افتراضي: نشاط خفيف)
        const activityFactor = 1.375;
        const tdee = Math.round(bmr * activityFactor);
        
        // سعرات للحفاظ على الوزن
        const maintenance = tdee;
        // سعرات لخسارة الوزن (نقص 500 سعرة)
        const weightLoss = Math.max(1200, maintenance - 500);
        // سعرات لزيادة الوزن (زيادة 300 سعرة)
        const weightGain = maintenance + 300;
        
        setRecommendedCalories({
            maintenance,
            weightLoss,
            weightGain,
            bmr: Math.round(bmr)
        });
        
        return { maintenance, weightLoss, weightGain, bmr: Math.round(bmr) };
    }, []);
    
    // ✅ دالة التحقق من صحة البيانات
    const validateHealthData = useCallback((data) => {
        const errors = {};
        
        if (data.weight && data.weight.trim()) {
            const weight = parseFloat(data.weight);
            if (isNaN(weight)) {
                errors.weight = isArabic ? 'الوزن يجب أن يكون رقماً' : 'Weight must be a number';
            } else if (weight < VALIDATION_LIMITS.weight.min) {
                errors.weight = isArabic ? `الوزن لا يمكن أن يكون أقل من ${VALIDATION_LIMITS.weight.min} كجم` : `Weight cannot be less than ${VALIDATION_LIMITS.weight.min} kg`;
            } else if (weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = isArabic ? `الوزن لا يمكن أن يكون أكبر من ${VALIDATION_LIMITS.weight.max} كجم` : `Weight cannot be greater than ${VALIDATION_LIMITS.weight.max} kg`;
            }
        }
        
        if (data.systolic && data.systolic.trim()) {
            const systolic = parseInt(data.systolic);
            if (isNaN(systolic)) {
                errors.systolic = isArabic ? 'الضغط الانقباضي يجب أن يكون رقماً' : 'Systolic pressure must be a number';
            } else if (systolic < VALIDATION_LIMITS.systolic.min) {
                errors.systolic = isArabic ? `الضغط منخفض جداً (أقل من ${VALIDATION_LIMITS.systolic.min})` : `Pressure too low (below ${VALIDATION_LIMITS.systolic.min})`;
            } else if (systolic > VALIDATION_LIMITS.systolic.max) {
                errors.systolic = isArabic ? `الضغط مرتفع جداً (أكبر من ${VALIDATION_LIMITS.systolic.max})` : `Pressure too high (above ${VALIDATION_LIMITS.systolic.max})`;
            }
        }
        
        if (data.diastolic && data.diastolic.trim()) {
            const diastolic = parseInt(data.diastolic);
            if (isNaN(diastolic)) {
                errors.diastolic = isArabic ? 'الضغط الانبساطي يجب أن يكون رقماً' : 'Diastolic pressure must be a number';
            } else if (diastolic < VALIDATION_LIMITS.diastolic.min) {
                errors.diastolic = isArabic ? `الضغط منخفض جداً (أقل من ${VALIDATION_LIMITS.diastolic.min})` : `Pressure too low (below ${VALIDATION_LIMITS.diastolic.min})`;
            } else if (diastolic > VALIDATION_LIMITS.diastolic.max) {
                errors.diastolic = isArabic ? `الضغط مرتفع جداً (أكبر من ${VALIDATION_LIMITS.diastolic.max})` : `Pressure too high (above ${VALIDATION_LIMITS.diastolic.max})`;
            }
        }
        
        if (data.glucose && data.glucose.trim()) {
            const glucose = parseFloat(data.glucose);
            if (isNaN(glucose)) {
                errors.glucose = isArabic ? 'سكر الدم يجب أن يكون رقماً' : 'Blood glucose must be a number';
            } else if (glucose < VALIDATION_LIMITS.glucose.min) {
                errors.glucose = isArabic ? `⚠️ تحذير: سكر الدم منخفض جداً (أقل من ${VALIDATION_LIMITS.glucose.min} mg/dL)` : `⚠️ Warning: Blood glucose too low (below ${VALIDATION_LIMITS.glucose.min} mg/dL)`;
            } else if (glucose > VALIDATION_LIMITS.glucose.max) {
                errors.glucose = isArabic ? `⚠️ تحذير: سكر الدم مرتفع جداً (أكبر من ${VALIDATION_LIMITS.glucose.max} mg/dL)` : `⚠️ Warning: Blood glucose too high (above ${VALIDATION_LIMITS.glucose.max} mg/dL)`;
            } else if (glucose > 140) {
                errors.glucose = isArabic ? `⚠️ تنبيه: سكر الدم مرتفع (${glucose} mg/dL). استشر طبيبك` : `⚠️ Alert: High blood glucose (${glucose} mg/dL). Consult your doctor`;
            } else if (glucose < 70) {
                errors.glucose = isArabic ? `⚠️ تنبيه: سكر الدم منخفض (${glucose} mg/dL). تناول مصدر سكر سريع` : `⚠️ Alert: Low blood glucose (${glucose} mg/dL). Eat fast-acting sugar`;
            }
        }
        
        if (data.heartRate && data.heartRate.trim()) {
            const hr = parseInt(data.heartRate);
            if (isNaN(hr)) {
                errors.heartRate = isArabic ? 'معدل ضربات القلب يجب أن يكون رقماً' : 'Heart rate must be a number';
            } else if (hr < VALIDATION_LIMITS.heartRate.min) {
                errors.heartRate = isArabic ? `نبض منخفض جداً (أقل من ${VALIDATION_LIMITS.heartRate.min} BPM)` : `Heart rate too low (below ${VALIDATION_LIMITS.heartRate.min} BPM)`;
            } else if (hr > VALIDATION_LIMITS.heartRate.max) {
                errors.heartRate = isArabic ? `⚠️ خطير: نبض مرتفع جداً (أكبر من ${VALIDATION_LIMITS.heartRate.max} BPM). استشر طبيباً فوراً` : `⚠️ Dangerous: Heart rate too high (above ${VALIDATION_LIMITS.heartRate.max} BPM). Consult a doctor immediately`;
            } else if (hr > 100) {
                errors.heartRate = isArabic ? `⚠️ تنبيه: نبض مرتفع (${hr} BPM). هل أنت متوتر أو مارست رياضة مؤخراً؟` : `⚠️ Alert: High heart rate (${hr} BPM). Are you stressed or did you exercise recently?`;
            } else if (hr < 60 && hr >= 50) {
                errors.heartRate = isArabic ? `ℹ️ نبض منخفض (${hr} BPM). إذا كنت رياضياً فهذا طبيعي، وإلا استشر طبيبك` : `ℹ️ Low heart rate (${hr} BPM). If you're an athlete this is normal, otherwise consult your doctor`;
            }
        }
        
        if (data.spo2 && data.spo2.trim()) {
            const spo2 = parseInt(data.spo2);
            if (isNaN(spo2)) {
                errors.spo2 = isArabic ? 'نسبة الأكسجين يجب أن تكون رقماً' : 'Oxygen level must be a number';
            } else if (spo2 < VALIDATION_LIMITS.spo2.min) {
                errors.spo2 = isArabic ? `⚠️ خطير: نقص أكسجين شديد (أقل من ${VALIDATION_LIMITS.spo2.min}%). استشر طبيباً فوراً` : `⚠️ Critical: Severe hypoxia (below ${VALIDATION_LIMITS.spo2.min}%). Seek medical attention immediately`;
            } else if (spo2 < 95) {
                errors.spo2 = isArabic ? `⚠️ تنبيه: نسبة الأكسجين منخفضة (${spo2}%). حاول التنفس بعمق` : `⚠️ Alert: Low oxygen level (${spo2}%). Try deep breathing`;
            }
        }
        
        if (data.temperature && data.temperature.trim()) {
            const temp = parseFloat(data.temperature);
            if (isNaN(temp)) {
                errors.temperature = isArabic ? 'درجة الحرارة يجب أن تكون رقماً' : 'Temperature must be a number';
            } else if (temp < VALIDATION_LIMITS.temperature.min) {
                errors.temperature = isArabic ? `⚠️ تحذير: حرارة منخفضة جداً (أقل من ${VALIDATION_LIMITS.temperature.min}°C)` : `⚠️ Warning: Temperature too low (below ${VALIDATION_LIMITS.temperature.min}°C)`;
            } else if (temp > VALIDATION_LIMITS.temperature.max) {
                errors.temperature = isArabic ? `⚠️ تحذير: حرارة مرتفعة جداً (أكبر من ${VALIDATION_LIMITS.temperature.max}°C) - قد تشير إلى حمى` : `⚠️ Warning: Temperature too high (above ${VALIDATION_LIMITS.temperature.max}°C) - may indicate fever`;
            } else if (temp > 37.5) {
                errors.temperature = isArabic ? `⚠️ تنبيه: حرارة مرتفعة (${temp}°C). اشرب سوائل دافئة وراقب الأعراض` : `⚠️ Alert: Elevated temperature (${temp}°C). Drink warm fluids and monitor symptoms`;
            } else if (temp < 36.0) {
                errors.temperature = isArabic ? `ℹ️ حرارة منخفضة (${temp}°C). تأكد من ارتداء ملابس دافئة` : `ℹ️ Low temperature (${temp}°C). Make sure to wear warm clothes`;
            }
        }
        
        return errors;
    }, [isArabic]);
    
    // ✅ تسجيل مستمع ESP32
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener...');
        
        const handleESP32Event = (type, data) => {
            if (!isMountedRef.current) return;
            
            if (type === 'heartRate') {
                setSensorHeartRate(data);
                setLastSensorReading(prev => ({ ...prev, heartRate: data, timestamp: new Date() }));
                
                // تحقق من وجود تحذير للنبض
                const hr = data;
                if (hr > 120) {
                    showMessage(isArabic ? `⚠️ تنبيه: نبض مرتفع (${hr} BPM) من جهاز ESP32` : `⚠️ Alert: High heart rate (${hr} BPM) from ESP32`, 'warning');
                } else if (hr < 55 && hr > 0) {
                    showMessage(isArabic ? `ℹ️ نبض منخفض (${hr} BPM) من جهاز ESP32. إذا كنت مرتاحاً فهذا طبيعي` : `ℹ️ Low heart rate (${hr} BPM) from ESP32. If you're resting this is normal`, 'info');
                }
            } else if (type === 'spo2') {
                setSensorSpO2(data);
                setLastSensorReading(prev => ({ ...prev, spo2: data, timestamp: new Date() }));
                
                if (data < 94) {
                    showMessage(isArabic ? `⚠️ تنبيه: نسبة الأكسجين منخفضة (${data}%) من جهاز ESP32` : `⚠️ Alert: Low oxygen level (${data}%) from ESP32`, 'warning');
                }
            } else if (type === 'data') {
                if (data?.heartRate) setSensorHeartRate(data.heartRate);
                if (data?.spo2) setSensorSpO2(data.spo2);
            } else if (type === 'error') {
                console.error('ESP32 Error:', data);
                showMessage(isArabic ? '⚠️ خطأ في جهاز ESP32' : '⚠️ ESP32 Error', 'error');
            }
        };
        
        if (esp32Service?.on) {
            unsubscribeESP32Ref.current = esp32Service.on(handleESP32Event);
            console.log('✅ ESP32 listener registered');
        }
        
        return () => {
            unsubscribeESP32Ref.current?.();
            esp32Service?.stopPolling?.();
        };
    }, [isArabic, showMessage]);
    
    // ==================== دوال ESP32 ====================
    const connectSensor = useCallback(async () => {
        setSensorConnecting(true);
        try {
            if (esp32Service?.startPolling) {
                esp32Service.startPolling();
                setSensorActive(true);
                await esp32Service.fetchLatestReading?.();
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
        esp32Service?.stopPolling?.();
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
            showMessage(isArabic ? '✅ تم حفظ قراءة المستشعر كقياس صحي' : '✅ Sensor reading saved as health record', 'success');
            onDataSubmitted?.();
            refreshData();
        } catch (err) {
            console.error('Failed to save sensor reading:', err);
            showMessage(isArabic ? '❌ فشل حفظ قراءة المستشعر' : '❌ Failed to save sensor reading', 'error');
        } finally {
            setSavingSensorData(false);
        }
    }, [sensorHeartRate, sensorSpO2, isArabic, showMessage, onDataSubmitted, refreshData]);
    
    // ==================== الحفظ التلقائي ====================
    useEffect(() => {
        if (!autoSave) return;
        const timeoutId = setTimeout(() => {
            const hasData = Object.values(healthFormData).some(v => v?.trim?.());
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(healthFormData));
                setLastAutoSave(new Date());
            }
        }, 2000);
        return () => clearTimeout(timeoutId);
    }, [healthFormData, autoSave]);
    
    useEffect(() => {
        const savedData = localStorage.getItem('healthForm_autoSave');
        if (savedData && isMountedRef.current) {
            try {
                setHealthFormData(JSON.parse(savedData));
                showMessage(isArabic ? '📂 تم استعادة البيانات المحفوظة تلقائياً' : '📂 Auto-saved data restored', 'info');
            } catch (error) { console.error(error); }
        }
    }, [isArabic, showMessage]);
    
    // ==================== دوال القياسات الصحية ====================
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
    
    // ✅ تحسين دالة handleHealthSubmit بإضافة تحقق أفضل
    const handleHealthSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        // التحقق من صحة البيانات قبل الإرسال
        const errors = validateHealthData(healthFormData);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            // عرض أول خطأ كرسالة منبثقة
            const firstError = Object.values(errors)[0];
            showMessage(firstError, 'error');
            return;
        }
        
        isSubmittingRef.current = true;
        setHealthLoading(true);
        
        const data = {};
        const warnings = [];
        
        if (healthFormData.weight?.trim()) {
            const weight = parseFloat(healthFormData.weight);
            data.weight_kg = weight;
            
            // تحذير للوزن خارج النطاق الطبيعي
            if (weight < 50) {
                warnings.push(isArabic ? '⚠️ وزنك منخفض قد يؤثر على صحتك' : '⚠️ Your weight is low and may affect your health');
            } else if (weight > 100) {
                warnings.push(isArabic ? '⚠️ وزنك مرتفع قد يسبب مشاكل صحية' : '⚠️ Your weight is high and may cause health issues');
            }
        }
        
        if (healthFormData.systolic?.trim()) {
            data.systolic_pressure = parseInt(healthFormData.systolic);
        }
        if (healthFormData.diastolic?.trim()) {
            data.diastolic_pressure = parseInt(healthFormData.diastolic);
        }
        
        // تحذير لضغط الدم
        if (data.systolic_pressure && data.diastolic_pressure) {
            if (data.systolic_pressure > 140 || data.diastolic_pressure > 90) {
                warnings.push(isArabic ? '⚠️ ضغط دم مرتفع. يوصى بمتابعة الطبيب' : '⚠️ High blood pressure. Medical follow-up recommended');
            } else if (data.systolic_pressure < 90 || data.diastolic_pressure < 60) {
                warnings.push(isArabic ? '⚠️ ضغط دم منخفض. تأكد من شرب كمية كافية من السوائل' : '⚠️ Low blood pressure. Ensure adequate fluid intake');
            }
        }
        
        if (healthFormData.glucose?.trim()) {
            const glucose = parseFloat(healthFormData.glucose);
            data.blood_glucose = glucose;
            
            if (glucose > 140) {
                warnings.push(isArabic ? `⚠️ سكر الدم مرتفع (${glucose} mg/dL). تجنب السكريات البسيطة` : `⚠️ High blood sugar (${glucose} mg/dL). Avoid simple sugars`);
            } else if (glucose < 70) {
                warnings.push(isArabic ? `🚨 سكر الدم منخفض (${glucose} mg/dL). تناول مصدر سكر فوراً!` : `🚨 Low blood sugar (${glucose} mg/dL). Eat sugar immediately!`);
            }
        }
        
        if (healthFormData.heartRate?.trim()) {
            const hr = parseInt(healthFormData.heartRate);
            data.heart_rate = hr;
            
            if (hr > 100) {
                warnings.push(isArabic ? `⚠️ نبض مرتفع (${hr} BPM). هل أنت متوتر أو مارست رياضة؟` : `⚠️ High heart rate (${hr} BPM). Are you stressed or exercised?`);
            } else if (hr < 60 && hr >= 50) {
                warnings.push(isArabic ? `ℹ️ نبض منخفض (${hr} BPM). إذا لم تكن رياضياً، استشر طبيبك` : `ℹ️ Low heart rate (${hr} BPM). If you're not an athlete, consult your doctor`);
            } else if (hr < 50 && hr > 0) {
                warnings.push(isArabic ? `⚠️ نبض منخفض جداً (${hr} BPM). يوصى باستشارة طبيب` : `⚠️ Very low heart rate (${hr} BPM). Medical consultation recommended`);
            }
        }
        
        if (healthFormData.spo2?.trim()) {
            const spo2 = parseInt(healthFormData.spo2);
            data.spo2 = spo2;
            
            if (spo2 < 95) {
                warnings.push(isArabic ? `⚠️ نسبة الأكسجين منخفضة (${spo2}%). تمارين التنفس قد تساعد` : `⚠️ Low oxygen level (${spo2}%). Breathing exercises may help`);
            }
        }
        
        if (healthFormData.temperature?.trim()) {
            const temp = parseFloat(healthFormData.temperature);
            data.body_temperature = temp;
            
            if (temp > 37.5) {
                warnings.push(isArabic ? `⚠️ حرارة مرتفعة (${temp}°C). قد تشير إلى التهاب أو عدوى` : `⚠️ Elevated temperature (${temp}°C). May indicate infection or inflammation`);
            }
        }
        
        try {
            await axiosInstance.post('/health_status/', data);
            
            // عرض التحذيرات إذا وجدت
            if (warnings.length > 0) {
                warnings.forEach(warning => showMessage(warning, 'warning'));
            } else {
                showMessage(isArabic ? '✅ تم حفظ البيانات بنجاح' : '✅ Data saved successfully', 'success');
            }
            
            resetHealthForm();
            onDataSubmitted?.();
            refreshData();
            
            // تحديث الوزن المخبأ إذا تم تحديثه
            if (data.weight_kg) {
                localStorage.setItem('user_weight', data.weight_kg.toString());
                localStorage.setItem('user_data_timestamp', Date.now().toString());
                fetchUserWeight(); // إعادة جلب البيانات المحدثة
            }
            
        } catch (err) {
            console.error('Submission failed:', err);
            const errorMsg = err.response?.data?.error || (isArabic ? '❌ فشل حفظ البيانات' : '❌ Failed to save data');
            showMessage(errorMsg, 'error');
        } finally {
            setHealthLoading(false);
            isSubmittingRef.current = false;
        }
    }, [healthFormData, onDataSubmitted, isArabic, resetHealthForm, showMessage, refreshData, validateHealthData, fetchUserWeight]);
    
    const getLastReadingTime = () => {
        if (!lastSensorReading?.timestamp) return '';
        return lastSensorReading.timestamp.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };
    
    // ==================== دوال الأنشطة ====================
    useEffect(() => {
        fetchUserWeight();
        fetchActivities();
        fetchAnalytics();
    }, [fetchUserWeight]);
    
    const calculateCalories = useCallback((activityType, durationMinutes, weight) => {
        if (!activityType || !durationMinutes || !weight) return 0;
        const met = MET_VALUES[activityType] || 4.0;
        return Math.round(met * weight * (durationMinutes / 60));
    }, []);
    
    const updateCalories = useCallback((activityType, durationMinutes) => {
        if (activityType && durationMinutes && userWeight) {
            const calories = calculateCalories(activityType, parseInt(durationMinutes), userWeight);
            setActivityFormData(prev => ({ ...prev, calories_burned: calories.toString() }));
            setShowCaloriesEdit(false);
        }
    }, [userWeight, calculateCalories]);
    
    const handleActivityChange = (e) => {
        const { name, value } = e.target;
        setActivityFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'activity_type' || name === 'duration_minutes') {
            const activityType = name === 'activity_type' ? value : activityFormData.activity_type;
            const duration = name === 'duration_minutes' ? value : activityFormData.duration_minutes;
            if (activityType && duration) updateCalories(activityType, duration);
        }
    };
    
    const handleCaloriesChange = (e) => {
        setActivityFormData(prev => ({ ...prev, calories_burned: e.target.value }));
        setShowCaloriesEdit(true);
    };
    
    const fetchAnalytics = useCallback(async () => {
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
                    avg_duration: activities.length ? Math.round(activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / activities.length) : 0,
                    avg_calories_per_activity: activities.length ? Math.round(totalCalories / activities.length) : 0                });
            }
        } catch (err) { console.error(err); }
        finally { if (isMountedRef.current) setAnalyticsLoading(false); }
    }, [activities]);
    
    const fetchActivities = useCallback(async () => {
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
                avg_duration: sortedData.length ? Math.round(sortedData.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / sortedData.length) : 0,
                avg_calories_per_activity: sortedData.length ? Math.round(totalCalories / sortedData.length) : 0
            }));
        } catch (err) { console.error(err); }
        finally { setFetching(false); isFetchingRef.current = false; }
    }, []);
    
    const handleActivitySubmit = useCallback(async (e) => {
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
            onDataSubmitted?.();
            onActivityChange?.();
            refreshData();
            setActivityFormData({ activity_type: '', duration_minutes: '', start_time: '', calories_burned: '' });
            setShowCaloriesEdit(false);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [activityFormData, onDataSubmitted, onActivityChange, fetchActivities, fetchAnalytics, refreshData]);
    
    // ==================== دوال التنسيق ====================
    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateString; }
    }, [isArabic]);
    
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
    const filledFieldsCount = Object.values(healthFormData).filter(v => v?.trim?.()).length;
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);
    
    // ==================== التصيير ====================
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* ==================== القسم 1: القياسات الصحية ==================== */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '1.5rem', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}><span style={{ fontSize: '1.5rem' }}>📝</span> {isArabic ? 'إضافة قياس صحي' : 'Add Health Reading'}</h2>
                        {filledFieldsCount > 0 && <span style={{ padding: '0.35rem 0.85rem', background: 'var(--tertiary-bg)', borderRadius: '50px', fontSize: '0.75rem' }}>📋 {filledFieldsCount}/7 {isArabic ? 'حقول مملوءة' : 'fields filled'}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} style={{ position: 'absolute', opacity: 0 }} />
                            <span style={{ width: '44px', height: '22px', background: 'var(--border-light)', borderRadius: '22px', position: 'relative' }}>
                                <span style={{ position: 'absolute', width: '18px', height: '18px', background: 'white', borderRadius: '50%', top: '2px', left: autoSave ? '24px' : '2px', transition: 'all 0.15s' }}></span>
                            </span>
                            <span style={{ fontSize: '0.8rem' }}>💾 {isArabic ? 'حفظ تلقائي' : 'Auto Save'}</span>
                        </label>
                        {lastAutoSave && <div style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'var(--tertiary-bg)', borderRadius: '8px' }}>🕐 {lastAutoSave.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</div>}
                    </div>
                </div>
                
                {/* عرض السعرات الموصى بها */}
                {recommendedCalories && (
                    <div style={{ background: 'linear-gradient(135deg, #10b98120, #05966920)', borderRadius: '16px', padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #10b98140' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>🔥</span>
                            <strong>{isArabic ? 'السعرات اليومية الموصى بها' : 'Recommended Daily Calories'}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                            <span>⚖️ {isArabic ? 'للمحافظة' : 'Maintain'}: <strong>{recommendedCalories.maintenance}</strong> kcal</span>
                            <span>📉 {isArabic ? 'لخسارة الوزن' : 'Weight Loss'}: <strong>{recommendedCalories.weightLoss}</strong> kcal</span>
                            <span>📈 {isArabic ? 'لزيادة الوزن' : 'Weight Gain'}: <strong>{recommendedCalories.weightGain}</strong> kcal</span>
                            <span>💤 BMR: <strong>{recommendedCalories.bmr}</strong> kcal</span>
                        </div>
                    </div>
                )}
                  
                {/* قسم ESP32 */}
                <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🫀</span>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{isArabic ? 'جهاز مراقبة الصحي ESP32' : 'ESP32 Health Monitor'}</h3>
                        {sensorActive && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(16,185,129,0.2)', borderRadius: '20px', color: '#10b981' }}>🟢 {isArabic ? 'متصل' : 'Online'}</span>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {!sensorActive ? (
                            <button onClick={connectSensor} disabled={sensorConnecting} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                {sensorConnecting ? '⏳ جاري الاتصال...' : '🔌 اتصال ESP32'}
                            </button>
                        ) : (
                            <>
                                <button onClick={disconnectSensor} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>🔌 قطع الاتصال</button>
                                <button onClick={fillFormWithSensorData} disabled={sensorHeartRate === null && sensorSpO2 === null} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>📋 {isArabic ? 'تعبئة النموذج' : 'Fill Form'}</button>
                                <button onClick={saveSensorReadingAsHealthRecord} disabled={savingSensorData || (sensorHeartRate === null && sensorSpO2 === null)} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>
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
                                    <div><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</span>
                                    <div><span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{sensorHeartRate !== null ? sensorHeartRate : '---'} <span style={{ fontSize: '0.7rem' }}>BPM</span></span></div></div>
                                </div>
                                <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>💨</span>
                                    <div><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}</span>
                                    <div><span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{sensorSpO2 !== null ? sensorSpO2 : '---'} <span style={{ fontSize: '0.7rem' }}>SpO₂%</span></span></div></div>
                                </div>
                            </div>
                            {lastSensorReading?.timestamp && <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>🕐 {isArabic ? 'آخر تحديث:' : 'Last update:'} {getLastReadingTime()}</div>}
                        </>
                    )}
                </div>
                
                <form onSubmit={handleHealthSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {[
                            { field: 'weight', icon: '⚖️', label: isArabic ? 'الوزن' : 'Weight', unit: 'kg', placeholder: '70.5', normal: '50-100 kg' },
                            { field: 'systolic', icon: '❤️', label: isArabic ? 'الضغط الانقباضي' : 'Systolic', unit: 'mmHg', placeholder: '120', normal: '90-140 mmHg' },
                            { field: 'diastolic', icon: '💙', label: isArabic ? 'الضغط الانبساطي' : 'Diastolic', unit: 'mmHg', placeholder: '80', normal: '60-90 mmHg' },
                            { field: 'glucose', icon: '🩸', label: isArabic ? 'سكر الدم' : 'Blood Glucose', unit: 'mg/dL', placeholder: '95', normal: '70-140 mg/dL' },
                            { field: 'heartRate', icon: '💓', label: isArabic ? 'نبضات القلب' : 'Heart Rate', unit: 'BPM', placeholder: '75', normal: '60-100 BPM' },
                            { field: 'spo2', icon: '💨', label: isArabic ? 'نسبة الأكسجين' : 'Oxygen Level', unit: '%', placeholder: '98', normal: '95-100%' },
                            { field: 'temperature', icon: '🌡️', label: isArabic ? 'درجة الحرارة' : 'Temperature', unit: '°C', placeholder: '37.0', normal: '36.5-37.5 °C' }
                        ].map(({ field, icon, label, unit, placeholder, normal }) => (
                            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                    <span>{icon}</span> {label} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({unit})</span>
                                </label>
                                <input 
                                    type="number" 
                                    step={field === 'weight' || field === 'glucose' || field === 'temperature' ? '0.1' : '1'} 
                                    value={healthFormData[field]} 
                                    onChange={(e) => handleHealthInputChange(field, e.target.value)} 
                                    placeholder={isArabic ? `مثال: ${placeholder}` : `Example: ${placeholder}`} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem 1rem', 
                                        border: validationErrors[field] ? '2px solid #ef4444' : '1px solid var(--border-light)', 
                                        borderRadius: '12px', 
                                        background: 'var(--secondary-bg)' 
                                    }} 
                                />
                                {validationErrors[field] && (
                                    <div style={{ fontSize: '0.65rem', color: '#ef4444' }}>
                                        ⚠️ {validationErrors[field]}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                    <span>✅ {isArabic ? 'الطبيعي' : 'Normal'}: {normal}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={resetHealthForm} disabled={healthLoading} style={{ flex: 1, padding: '0.75rem', background: 'var(--secondary-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', cursor: 'pointer' }}>🗑️ {isArabic ? 'مسح النموذج' : 'Clear Form'}</button>
                        <button type="submit" disabled={healthLoading} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>{healthLoading ? '⏳ جاري الحفظ...' : `💾 ${isArabic ? 'حفظ الكل' : 'Save All'}`}</button>
                    </div>
                </form>
            </div>
            
            {/* ==================== القسم 2: الأنشطة ==================== */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>🏃 {isArabic ? 'إضافة نشاط جديد' : 'Add New Activity'}</h3>
                
                {userWeight && <div style={{ background: '#e0e7ff', padding: '8px 12px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚖️</span> <span>{isArabic ? `وزنك: ${userWeight} كجم` : `Your weight: ${userWeight} kg`}</span>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{isArabic ? '(يستخدم لحساب السعرات)' : '(used for calorie calculation)'}</span>
                </div>}
                
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
                            <span>🤖</span> <span>{isArabic ? 'تم حساب السعرات تلقائياً' : 'Calories calculated automatically'}</span>
                            <button type="button" onClick={() => setShowCaloriesEdit(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}>{isArabic ? 'تعديل يدوي' : 'Edit manually'}</button>
                        </div>
                    )}
                    
                    {showCaloriesEdit && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>✏️</span> <span>{isArabic ? 'تم التعديل اليدوي - حساب تلقائي متوقف' : 'Manual edit - auto calculation paused'}</span>
                            <button type="button" onClick={() => { updateCalories(activityFormData.activity_type, activityFormData.duration_minutes); setShowCaloriesEdit(false); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '11px' }}>{isArabic ? 'إعادة الحساب التلقائي' : 'Recalculate'}</button>
                        </div>
                    )}
                    
                    <input type="datetime-local" name="start_time" value={activityFormData.start_time} onChange={handleActivityChange} required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? 'جاري الحفظ...' : '💾 حفظ النشاط'}</button>
                </form>
            </div>
            
            {/* ==================== القسم 3: السجل الصحي والمخططات ==================== */}
            <div style={{ marginBottom: '20px' }}><HealthHistory refreshKey={refreshKey} onDataSubmitted={refreshData} isArabic={isArabic} /></div>
            <div style={{ marginBottom: '20px' }}><HealthCharts refreshKey={refreshKey} isArabic={isArabic} /></div>
            <div style={{ marginBottom: '20px' }}><ActivityAnalytics refreshTrigger={refreshKey} /></div>
            
            {/* ==================== تحليل الأنشطة ==================== */}
            {activities.length > 0 && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>📈 {isArabic ? 'تحليل الأنشطة' : 'Activity Analytics'}</h3>
                        <button onClick={() => setShowCharts(!showCharts)} style={{ padding: '5px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{showCharts ? '📋 إخفاء' : '📊 إظهار'}</button>
                    </div>
                    
                    {showCharts && (
                        <>
                            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                <h4>📊 {isArabic ? 'تحليل الأنشطة' : 'Activity Analytics'}</h4>
                                {analyticsLoading ? <p>{isArabic ? 'جاري التحليل...' : 'Loading...'}</p> : analytics ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', textAlign: 'center' }}>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_activities || 0}</div><div>{isArabic ? 'عدد الأنشطة' : 'Activities'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_calories || 0}</div><div>{isArabic ? 'سعرات حرارية' : 'Calories'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.total_duration || 0}</div><div>{isArabic ? 'دقائق' : 'Minutes'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_duration || 0}</div><div>{isArabic ? 'متوسط المدة' : 'Avg Duration'}</div></div>
                                        <div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{analytics.avg_calories_per_activity || 0}</div><div>{isArabic ? 'سعرات/نشاط' : 'Cal/Activity'}</div></div>
                                    </div>
                                ) : <p>{isArabic ? 'لا توجد بيانات كافية' : 'Insufficient data'}</p>}
                            </div>
                            
                            <div style={{ marginBottom: '30px' }}>
                                <h4>📊 {isArabic ? 'توزيع الأنشطة حسب النوع' : 'Activities by Type'}</h4>
                                {Object.entries(chartData.typeStats).map(([type, stats]) => (
                                    <div key={type} style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                                            <span>{getActivityIcon(type)} {getActivityName(type)} <span style={{ fontSize: '11px', color: '#f59e0b' }}>{getMetIcon(type)} {MET_VALUES[type]} MET</span></span>
                                            <span>⏱️ {stats.duration} {isArabic ? 'دقيقة' : 'min'} 🔥 {stats.calories} {isArabic ? 'سعرة' : 'cal'} ({stats.count} {isArabic ? 'نشاط' : 'act'})</span>
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
                            
                            <div>
                                <h4>📅 {isArabic ? 'آخر 7 أيام' : 'Last 7 Days'}</h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'center', minHeight: '220px', overflowX: 'auto' }}>
                                    {chartData.last7Days.map((day, idx) => {
                                        const maxCal = Math.max(...chartData.last7Days.map(d => d.calories), 1);
                                        const height = (day.calories / maxCal) * 150;
                                        return (
                                            <div key={idx} style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
                                                <div style={{ height: `${height}px`, background: 'linear-gradient(180deg, #f59e0b, #ef4444)', borderRadius: '8px 8px 0 0', position: 'relative' }}>
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
            
            {/* ==================== السجل الزمني للأنشطة ==================== */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <h3>📋 {isArabic ? 'السجل الزمني للأنشطة' : 'Activity Timeline'}</h3>
                {fetching ? <p style={{ textAlign: 'center', padding: '40px' }}>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p> :
                 activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏃‍♂️</div>
                        <p>{isArabic ? 'لا توجد أنشطة مسجلة' : 'No activities recorded'}</p>
                        <p style={{ fontSize: '12px' }}>{isArabic ? 'أضف نشاطك الأول باستخدام النموذج أعلاه' : 'Add your first activity using the form above'}</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '30px' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(180deg, #6366f1, #8b5cf6, #a855f7)' }}></div>
                        {activities.map((act, idx) => (
                            <div key={act.id} style={{ position: 'relative', marginBottom: '20px', paddingLeft: '20px' }}>
                                <div style={{ position: 'absolute', left: '-26px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? '#f59e0b' : '#6366f1', border: '2px solid white', boxShadow: '0 0 0 2px #6366f1' }}></div>
                                <div style={{ background: idx === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f8f9fa', padding: '15px', borderRadius: '10px', border: idx === 0 ? '1px solid #f59e0b' : '1px solid #e0e0e0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{getActivityIcon(act.activity_type)}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{getActivityName(act.activity_type)}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>{act.duration_minutes} {isArabic ? 'دقيقة' : 'minutes'}{act.calories_burned > 0 && <span style={{ marginLeft: '10px', color: '#f59e0b' }}>🔥 {act.calories_burned} {isArabic ? 'سعرة' : 'cal'}</span>}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>📅 {formatDateTime(act.start_time || act.created_at)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {activities.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#666' }}>
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
             <style jsx>{`
/* ===========================================
   ActivityForm.css - الأنماط الداخلية فقط
   ✅ نموذج الأنشطة والقياسات الصحية
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام أو الاستجابة
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.activity-form-container {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
}

/* ===== البطاقات العامة ===== */
.card {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #eef2f6);
    margin-bottom: 1.5rem;
}

.dark-mode .card {
    background: #1e293b;
    border-color: #334155;
}

/* ===== رأس البطاقة ===== */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-light, #eef2f6);
}

.dark-mode .card-header {
    border-bottom-color: #334155;
}

.card-header h2, .card-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.card-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.dark-mode .card-header h2 {
    background: linear-gradient(135deg, #818cf8, #a78bfa);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.card-header h3 {
    font-size: 1rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .card-header h3 {
    color: #f1f5f9;
}

.header-badge {
    padding: 0.35rem 0.85rem;
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 50px;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .header-badge {
    background: #0f172a;
    color: #94a3b8;
}

/* ===== أزرار التبديل ===== */
.toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.toggle-switch input {
    position: absolute;
    opacity: 0;
}

.toggle-track {
    width: 44px;
    height: 22px;
    background: var(--border-light, #e2e8f0);
    border-radius: 22px;
    position: relative;
    transition: all 0.2s;
}

.toggle-thumb {
    position: absolute;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: all 0.2s;
}

input:checked + .toggle-track {
    background: #6366f1;
}

input:checked + .toggle-track .toggle-thumb {
    transform: translateX(22px);
}

[dir="rtl"] input:checked + .toggle-track .toggle-thumb {
    transform: translateX(-22px);
}

/* ===== قسم ESP32 ===== */
.esp32-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 24px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(99, 102, 241, 0.3);
}

.esp32-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.esp32-header h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
}

.online-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
    background: rgba(16, 185, 129, 0.2);
    border-radius: 20px;
    color: #10b981;
}

.esp32-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.btn-connect {
    background: #10b981;
    color: white;
    border: none;
}

.btn-disconnect {
    background: #ef4444;
    color: white;
    border: none;
}

.btn-fill {
    background: #f59e0b;
    color: white;
    border: none;
}

.btn-save {
    background: #8b5cf6;
    color: white;
    border: none;
}

.btn-sensor {
    padding: 0.5rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-sensor:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.05);
}

.btn-sensor:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.sensor-readings {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}

.sensor-reading-card {
    flex: 1;
    min-width: 150px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    padding: 0.85rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.sensor-icon {
    font-size: 2rem;
}

.sensor-label {
    font-size: 0.7rem;
    color: #94a3b8;
}

.sensor-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
}

.sensor-unit {
    font-size: 0.7rem;
}

.sensor-timestamp {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    font-size: 0.7rem;
    color: #94a3b8;
}

/* ===== شبكة النموذج ===== */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
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
    font-size: 0.85rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .form-field label {
    color: #f1f5f9;
}

.label-unit {
    color: var(--text-tertiary, #94a3b8);
    font-weight: normal;
    font-size: 0.75rem;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
    transition: all 0.2s;
}

.dark-mode .form-input {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.form-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.field-hint {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.field-hint .normal-range {
    color: #10b981;
}

/* ===== أزرار الإجراء ===== */
.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.btn-clear {
    flex: 1;
    padding: 0.75rem;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .btn-clear {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.btn-clear:hover {
    background: var(--hover-bg, #f1f5f9);
}

.dark-mode .btn-clear:hover {
    background: #334155;
}

.btn-submit {
    flex: 1;
    padding: 0.75rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ===== قسم الوزن ===== */
.weight-info {
    background: rgba(99, 102, 241, 0.1);
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #6366f1;
}

.weight-info span:first-child {
    font-size: 1rem;
}

.weight-hint {
    font-size: 0.65rem;
    opacity: 0.7;
}

/* ===== حقل السعرات ===== */
.calories-input-wrapper {
    position: relative;
    margin-bottom: 0.5rem;
}

.calories-input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 90px;
    background: var(--secondary-bg, #f8fafc);
    border: 1px solid var(--border-light, #e2e8f0);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-primary, #0f172a);
}

.calories-input.manual {
    border: 2px solid #f59e0b;
    background: rgba(245, 158, 11, 0.05);
}

.calories-unit {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
    background: var(--tertiary-bg, #f1f5f9);
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
}

[dir="rtl"] .calories-unit {
    right: auto;
    left: 12px;
}

.auto-calc-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: #10b981;
    margin-bottom: 0.5rem;
}

.manual-edit-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: #f59e0b;
    margin-bottom: 0.5rem;
}

.recalc-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    font-size: 0.7rem;
}

[dir="rtl"] .recalc-btn {
    margin-left: 0;
    margin-right: auto;
}

/* ===== تحليل الأنشطة ===== */
.analytics-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 1.5rem;
    color: white;
    margin-bottom: 1.5rem;
}

.analytics-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    text-align: center;
}

.analytics-value {
    font-size: 1.8rem;
    font-weight: 800;
}

.analytics-label {
    font-size: 0.7rem;
    opacity: 0.8;
}

/* ===== توزيع الأنشطة ===== */
.activity-distribution {
    margin-bottom: 2rem;
}

.distribution-item {
    margin-bottom: 1rem;
}

.distribution-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.8rem;
}

.distribution-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.met-badge {
    font-size: 0.7rem;
    color: #f59e0b;
}

.duration-bar {
    background: var(--border-light, #e2e8f0);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.25rem;
}

.duration-fill {
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    padding: 0.35rem 0.75rem;
    border-radius: 10px;
    color: white;
    font-size: 0.7rem;
    text-align: right;
}

.calories-bar {
    background: var(--border-light, #e2e8f0);
    border-radius: 10px;
    overflow: hidden;
}

.calories-fill {
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    padding: 0.35rem 0.75rem;
    border-radius: 10px;
    color: white;
    font-size: 0.7rem;
    text-align: right;
}

/* ===== الرسم البياني للأيام ===== */
.chart-container {
    margin-bottom: 1rem;
}

.chart-bars {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    justify-content: center;
    min-height: 220px;
}

.chart-bar-wrapper {
    flex: 1;
    text-align: center;
    min-width: 60px;
}

.chart-bar {
    background: linear-gradient(180deg, #f59e0b, #ef4444);
    border-radius: 8px 8px 0 0;
    position: relative;
    transition: height 0.3s ease;
}

.chart-value {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    white-space: nowrap;
    color: #f59e0b;
}

.chart-label {
    font-size: 0.7rem;
    margin-top: 0.5rem;
}

.chart-label strong {
    font-weight: 600;
}

.chart-count {
    font-size: 0.6rem;
    color: var(--text-tertiary, #94a3b8);
}

/* ===== السجل الزمني ===== */
.timeline {
    position: relative;
    padding-left: 2rem;
}

.timeline-line {
    position: absolute;
    left: 0.75rem;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 2px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6, #a855f7);
}

.timeline-item {
    position: relative;
    margin-bottom: 1.25rem;
    padding-left: 1.25rem;
}

.timeline-dot {
    position: absolute;
    left: -1.25rem;
    top: 0.25rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #6366f1;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #6366f1;
}

.timeline-dot.latest {
    background: #f59e0b;
}

.timeline-card {
    background: var(--secondary-bg, #f8fafc);
    padding: 0.75rem 1rem;
    border-radius: 14px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.timeline-card.latest {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-color: #f59e0b;
}

.dark-mode .timeline-card {
    background: #0f172a;
    border-color: #334155;
}

.timeline-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.timeline-icon {
    font-size: 1.5rem;
}

.timeline-info {
    flex: 1;
}

.timeline-title {
    font-weight: bold;
    color: var(--text-primary, #0f172a);
}

.timeline-detail {
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.timeline-calories {
    font-size: 0.7rem;
    color: #f59e0b;
}

.timeline-date {
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
}

[dir="rtl"] .timeline {
    padding-left: 0;
    padding-right: 2rem;
}

[dir="rtl"] .timeline-line {
    left: auto;
    right: 0.75rem;
}

[dir="rtl"] .timeline-item {
    padding-left: 0;
    padding-right: 1.25rem;
}

[dir="rtl"] .timeline-dot {
    left: auto;
    right: -1.25rem;
}

/* ===== ملخص أسفل الصفحة ===== */
.summary-footer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
    display: flex;
    gap: 1rem;
    justify-content: center;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

.dark-mode .summary-footer {
    border-top-color: #334155;
}

/* ===== إشعار منبثق ===== */
.notification-toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

[dir="rtl"] .notification-toast {
    right: auto;
    left: 1.5rem;
}

.notification-toast.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}

.notification-toast.error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
}

.notification-toast.info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
}

.toast-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

.toast-close:hover {
    opacity: 1;
}

/* ===== أنيميشن ===== */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

[dir="rtl"] @keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .distribution-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .timeline-content {
    flex-direction: row-reverse;
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .btn-submit:hover,
    .btn-sensor:hover,
    .chart-bar {
        transform: none;
    }
    
    .notification-toast {
        animation: none;
    }
}
            `}</style>

        </div>
        
    );
};

export default ActivityForm;