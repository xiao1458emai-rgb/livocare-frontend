// src/components/HealthForm.jsx - نسخة مع زرين منفصلين لـ ESP32
'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
import '../index.css';

function HealthForm({ onDataSubmitted }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const unsubscribeESP32Ref = useRef(null);
    
    const [formData, setFormData] = useState({
        weight: '',
        systolic: '',
        diastolic: '',
        glucose: '',
        heartRate: '',
        spo2: '',
        temperature: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [savingSensorData, setSavingSensorData] = useState(false); // ✅ حفظ قراءة المستشعر
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    
    // ✅ حالة ESP32
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    const [lastSensorReading, setLastSensorReading] = useState(null); // ✅ تخزين آخر قراءة

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

    // ✅ تسجيل مستمع ESP32
    useEffect(() => {
        console.log('🎯 Setting up ESP32 listener in HealthForm...');
        
        const handleESP32Event = (type, data) => {
            console.log(`📡 ESP32 Event received: ${type} =`, data);
            
            if (!isMountedRef.current) return;
            
            if (type === 'heartRate') {
                setSensorHeartRate(data);
                // ✅ تخزين آخر قراءة كاملة
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
            console.log('✅ ESP32 listener registered in HealthForm');
        } else {
            console.error('❌ esp32Service.on is not a function');
        }
        
        return () => {
            if (unsubscribeESP32Ref.current) {
                unsubscribeESP32Ref.current();
                console.log('❌ ESP32 listener removed from HealthForm');
            }
            if (esp32Service && typeof esp32Service.stopPolling === 'function') {
                esp32Service.stopPolling();
            }
        };
    }, [isArabic]);

    // ✅ دالة الاتصال بـ ESP32
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
                console.error('❌ esp32Service not available');
                showMessage(isArabic ? '❌ خدمة ESP32 غير متاحة' : '❌ ESP32 service not available', 'error');
            }
        } catch (error) {
            console.error('ESP32 connection error:', error);
            showMessage(isArabic ? '❌ فشل الاتصال بـ ESP32' : '❌ Failed to connect to ESP32', 'error');
        } finally {
            setSensorConnecting(false);
        }
    }, [isArabic, showMessage]);

    // ✅ قطع الاتصال بـ ESP32
    const disconnectSensor = useCallback(() => {
        if (esp32Service && typeof esp32Service.stopPolling === 'function') {
            esp32Service.stopPolling();
        }
        setSensorActive(false);
        setSensorHeartRate(null);
        setSensorSpO2(null);
        showMessage(isArabic ? '🔌 تم قطع الاتصال بـ ESP32' : '🔌 ESP32 disconnected', 'info');
    }, [isArabic, showMessage]);

    // ✅ ✅ ✅ الزر الأول: تعبئة النموذج بالقراءات (بدون حفظ)
    const fillFormWithSensorData = useCallback(() => {
        if (sensorHeartRate !== null) {
            setFormData(prev => ({ ...prev, heartRate: sensorHeartRate.toString() }));
        }
        if (sensorSpO2 !== null) {
            setFormData(prev => ({ ...prev, spo2: sensorSpO2.toString() }));
        }
        showMessage(isArabic ? '📥 تم تعبئة النموذج بقراءات المستشعر' : '📥 Form filled with sensor readings', 'success');
    }, [sensorHeartRate, sensorSpO2, isArabic, showMessage]);

    // ✅ ✅ ✅ الزر الثاني: حفظ قراءة المستشعر مباشرة كقراءة صحية
    const saveSensorReadingAsHealthRecord = useCallback(async () => {
        if (!sensorHeartRate && !sensorSpO2) {
            showMessage(isArabic ? '⚠️ لا توجد قراءات من المستشعر للحفظ' : '⚠️ No sensor readings to save', 'error');
            return;
        }

        setSavingSensorData(true);
        
        const data = {};
        if (sensorHeartRate !== null) {
            data.heart_rate = sensorHeartRate;
        }
        if (sensorSpO2 !== null) {
            data.spo2 = sensorSpO2;
        }

        try {
            const response = await axiosInstance.post('/health_status/', data);
            
            if (isMountedRef.current) {
                showMessage(isArabic ? '✅ تم حفظ قراءة المستشعر كقياس صحي' : '✅ Sensor reading saved as health record', 'success');
                
                // ✅ تحديث البيانات في المكون الأب
                if (onDataSubmitted) {
                    onDataSubmitted();
                }
            }
        } catch (err) {
            console.error('❌ Failed to save sensor reading:', err);
            let errorMessage = isArabic ? '❌ فشل حفظ قراءة المستشعر' : '❌ Failed to save sensor reading';
            
            if (err.response?.status === 400) {
                const errorData = err.response.data;
                if (errorData?.heart_rate) {
                    errorMessage = Array.isArray(errorData.heart_rate) ? errorData.heart_rate[0] : errorData.heart_rate;
                } else if (errorData?.spo2) {
                    errorMessage = Array.isArray(errorData.spo2) ? errorData.spo2[0] : errorData.spo2;
                }
            }
            showMessage(errorMessage, 'error');
        } finally {
            setSavingSensorData(false);
        }
    }, [sensorHeartRate, sensorSpO2, isArabic, showMessage, onDataSubmitted]);

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

    // ✅ الحفظ التلقائي
    useEffect(() => {
        if (!autoSave) return;

        const autoSaveForm = () => {
            const hasData = Object.values(formData).some(value => value && value.toString().trim() !== '');
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(formData));
                setLastAutoSave(new Date());
            }
        };

        const timeoutId = setTimeout(autoSaveForm, 2000);
        return () => clearTimeout(timeoutId);
    }, [formData, autoSave]);

    // ✅ استعادة البيانات المحفوظة
    useEffect(() => {
        const savedData = localStorage.getItem('healthForm_autoSave');
        if (savedData && isMountedRef.current) {
            try {
                const parsedData = JSON.parse(savedData);
                setFormData(parsedData);
                showMessage(isArabic ? '📂 تم استعادة البيانات المحفوظة تلقائياً' : '📂 Auto-saved data restored', 'info');
            } catch (error) {
                console.error('Error loading auto-saved data:', error);
            }
        }
    }, [isArabic]);

    // ✅ عرض رسالة مؤقتة
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

    // ✅ التحقق من صحة النموذج
    const validateForm = useCallback(() => {
        let errors = {};
        let hasAnyData = false;

        if (formData.weight && formData.weight.toString().trim() !== '') {
            hasAnyData = true;
            const weight = parseFloat(formData.weight);
            if (isNaN(weight)) {
                errors.weight = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.weight.min} - ${VALIDATION_LIMITS.weight.max} ${VALIDATION_LIMITS.weight.unit}`;
            }
        }

        if (formData.systolic && formData.systolic.toString().trim() !== '') {
            hasAnyData = true;
            const systolic = parseInt(formData.systolic);
            if (isNaN(systolic)) {
                errors.systolic = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (systolic < VALIDATION_LIMITS.systolic.min || systolic > VALIDATION_LIMITS.systolic.max) {
                errors.systolic = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.systolic.min} - ${VALIDATION_LIMITS.systolic.max} ${VALIDATION_LIMITS.systolic.unit}`;
            }
        }

        if (formData.diastolic && formData.diastolic.toString().trim() !== '') {
            hasAnyData = true;
            const diastolic = parseInt(formData.diastolic);
            if (isNaN(diastolic)) {
                errors.diastolic = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (diastolic < VALIDATION_LIMITS.diastolic.min || diastolic > VALIDATION_LIMITS.diastolic.max) {
                errors.diastolic = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.diastolic.min} - ${VALIDATION_LIMITS.diastolic.max} ${VALIDATION_LIMITS.diastolic.unit}`;
            }
            
            if (formData.systolic && formData.systolic.toString().trim() !== '') {
                const systolic = parseInt(formData.systolic);
                if (!isNaN(systolic) && !isNaN(diastolic) && systolic <= diastolic) {
                    errors.diastolic = isArabic ? '❌ الضغط الانقباضي يجب أن يكون أكبر من الانبساطي' : '❌ Systolic must be greater than diastolic';
                }
            }
        }

        if (formData.glucose && formData.glucose.toString().trim() !== '') {
            hasAnyData = true;
            const glucose = parseFloat(formData.glucose);
            if (isNaN(glucose)) {
                errors.glucose = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (glucose < VALIDATION_LIMITS.glucose.min || glucose > VALIDATION_LIMITS.glucose.max) {
                errors.glucose = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.glucose.min} - ${VALIDATION_LIMITS.glucose.max} ${VALIDATION_LIMITS.glucose.unit}`;
            }
        }

        if (formData.heartRate && formData.heartRate.toString().trim() !== '') {
            hasAnyData = true;
            const heartRate = parseInt(formData.heartRate);
            if (isNaN(heartRate)) {
                errors.heartRate = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (heartRate < VALIDATION_LIMITS.heartRate.min || heartRate > VALIDATION_LIMITS.heartRate.max) {
                errors.heartRate = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.heartRate.min} - ${VALIDATION_LIMITS.heartRate.max} ${VALIDATION_LIMITS.heartRate.unit}`;
            }
        }

        if (formData.spo2 && formData.spo2.toString().trim() !== '') {
            hasAnyData = true;
            const spo2 = parseInt(formData.spo2);
            if (isNaN(spo2)) {
                errors.spo2 = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (spo2 < VALIDATION_LIMITS.spo2.min || spo2 > VALIDATION_LIMITS.spo2.max) {
                errors.spo2 = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.spo2.min} - ${VALIDATION_LIMITS.spo2.max} ${VALIDATION_LIMITS.spo2.unit}`;
            }
        }

        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            hasAnyData = true;
            const temperature = parseFloat(formData.temperature);
            if (isNaN(temperature)) {
                errors.temperature = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (temperature < VALIDATION_LIMITS.temperature.min || temperature > VALIDATION_LIMITS.temperature.max) {
                errors.temperature = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.temperature.min} - ${VALIDATION_LIMITS.temperature.max} ${VALIDATION_LIMITS.temperature.unit}`;
            }
        }

        if (!hasAnyData) {
            showMessage(isArabic ? '⚠️ الرجاء إدخال قيمة واحدة على الأقل' : '⚠️ Please enter at least one value', 'error');
            return false;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, isArabic, showMessage, VALIDATION_LIMITS]);

    // ✅ معالجة تغيير الحقول
    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [validationErrors]);

    // ✅ مسح النموذج
    const resetForm = useCallback(() => {
        setFormData({
            weight: '',
            systolic: '',
            diastolic: '',
            glucose: '',
            heartRate: '',
            spo2: '',
            temperature: ''
        });
        setValidationErrors({});
        localStorage.removeItem('healthForm_autoSave');
        showMessage(isArabic ? '🗑️ تم مسح النموذج' : '🗑️ Form cleared', 'info');
    }, [isArabic, showMessage]);

    // ✅ إرسال النموذج الكامل
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        if (!validateForm()) {
            showMessage(isArabic ? '⚠️ يرجى تصحيح الأخطاء في النموذج' : '⚠️ Please correct errors in the form', 'error');
            return;
        }

        isSubmittingRef.current = true;
        setLoading(true);

        const data = {};
        
        if (formData.weight && formData.weight.toString().trim() !== '') {
            data.weight_kg = parseFloat(formData.weight);
        }
        
        if (formData.systolic && formData.systolic.toString().trim() !== '') {
            data.systolic_pressure = parseInt(formData.systolic);
        }
        
        if (formData.diastolic && formData.diastolic.toString().trim() !== '') {
            data.diastolic_pressure = parseInt(formData.diastolic);
        }
        
        if (formData.glucose && formData.glucose.toString().trim() !== '') {
            data.blood_glucose = parseFloat(formData.glucose);
        }
        
        if (formData.heartRate && formData.heartRate.toString().trim() !== '') {
            data.heart_rate = parseInt(formData.heartRate);
        }
        
        if (formData.spo2 && formData.spo2.toString().trim() !== '') {
            data.spo2 = parseInt(formData.spo2);
        }
        
        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            data.body_temperature = parseFloat(formData.temperature);
        }

        try {
            const response = await axiosInstance.post('/health_status/', data);
            
            if (isMountedRef.current) {
                showMessage(isArabic ? '✅ تم حفظ البيانات بنجاح' : '✅ Data saved successfully', 'success');
                resetForm();
                localStorage.removeItem('healthForm_autoSave');
                
                if (onDataSubmitted) {
                    onDataSubmitted();
                }
            }
        } catch (err) {
            console.error('❌ Submission failed:', err);
            
            if (!isMountedRef.current) return;
            
            let errorMessage = isArabic ? '❌ فشل حفظ البيانات' : '❌ Failed to save data';
            
            if (err.response?.status === 400) {
                const errorData = err.response.data;
                if (errorData?.weight_kg) {
                    errorMessage = Array.isArray(errorData.weight_kg) ? errorData.weight_kg[0] : errorData.weight_kg;
                } else if (errorData?.systolic_pressure) {
                    errorMessage = Array.isArray(errorData.systolic_pressure) ? errorData.systolic_pressure[0] : errorData.systolic_pressure;
                } else if (errorData?.diastolic_pressure) {
                    errorMessage = Array.isArray(errorData.diastolic_pressure) ? errorData.diastolic_pressure[0] : errorData.diastolic_pressure;
                } else if (errorData?.blood_glucose) {
                    errorMessage = Array.isArray(errorData.blood_glucose) ? errorData.blood_glucose[0] : errorData.blood_glucose;
                } else if (errorData?.heart_rate) {
                    errorMessage = Array.isArray(errorData.heart_rate) ? errorData.heart_rate[0] : errorData.heart_rate;
                } else if (errorData?.spo2) {
                    errorMessage = Array.isArray(errorData.spo2) ? errorData.spo2[0] : errorData.spo2;
                } else if (errorData?.body_temperature) {
                    errorMessage = Array.isArray(errorData.body_temperature) ? errorData.body_temperature[0] : errorData.body_temperature;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
            } else if (err.response?.status === 401) {
                errorMessage = isArabic ? '🔐 انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى' : '🔐 Session expired, please login again';
            } else if (err.response?.status === 500) {
                errorMessage = isArabic ? '⚠️ خطأ في الخادم، يرجى المحاولة لاحقاً' : '⚠️ Server error, please try again later';
            } else if (err.code === 'ERR_NETWORK') {
                errorMessage = isArabic ? '🌐 خطأ في الاتصال بالخادم' : '🌐 Network error';
            }
            
            showMessage(errorMessage, 'error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, onDataSubmitted, isArabic, validateForm, resetForm, showMessage]);

    // ✅ حساب المؤشرات الصحية
    const calculateHealthIndicators = useCallback(() => {
        const indicators = [];
        
        if (formData.weight && formData.weight.toString().trim() !== '') {
            const weight = parseFloat(formData.weight);
            if (weight > VALIDATION_LIMITS.weight.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: 'high',
                    icon: '⚠️',
                    field: 'weight',
                    message: isArabic ? 'الوزن مرتفع' : 'High weight',
                    advice: isArabic ? '🏃 حاول تقليل السعرات الحرارية وزيادة النشاط البدني' : '🏃 Try to reduce calories and increase physical activity',
                    value: `${weight} kg`
                });
            } else if (weight < VALIDATION_LIMITS.weight.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '⚠️',
                    field: 'weight',
                    message: isArabic ? 'الوزن منخفض' : 'Low weight',
                    advice: isArabic ? '🥑 حاول زيادة السعرات الحرارية بطريقة صحية' : '🥑 Try to increase calories in a healthy way',
                    value: `${weight} kg`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'weight',
                    message: isArabic ? 'وزن طبيعي' : 'Normal weight',
                    advice: isArabic ? '✨ حافظ على وزنك الصحي' : '✨ Maintain your healthy weight',
                    value: `${weight} kg`
                });
            }
        }
        
        if (formData.systolic && formData.diastolic && 
            formData.systolic.toString().trim() !== '' && 
            formData.diastolic.toString().trim() !== '') {
            const systolic = parseInt(formData.systolic);
            const diastolic = parseInt(formData.diastolic);
            
            if (systolic > VALIDATION_LIMITS.systolic.normalMax || diastolic > VALIDATION_LIMITS.diastolic.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: 'high',
                    icon: '⚠️',
                    field: 'blood_pressure',
                    message: isArabic ? 'ضغط الدم مرتفع' : 'High blood pressure',
                    advice: isArabic ? '🧂 قلل الملح، مارس الرياضة، واستشر طبيبك' : '🧂 Reduce salt, exercise, and consult your doctor',
                    value: `${systolic}/${diastolic} mmHg`
                });
            } else if (systolic < VALIDATION_LIMITS.systolic.normalMin || diastolic < VALIDATION_LIMITS.diastolic.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '⚠️',
                    field: 'blood_pressure',
                    message: isArabic ? 'ضغط الدم منخفض' : 'Low blood pressure',
                    advice: isArabic ? '💧 اشرب كمية كافية من الماء، واستشر طبيبك' : '💧 Drink enough water and consult your doctor',
                    value: `${systolic}/${diastolic} mmHg`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'blood_pressure',
                    message: isArabic ? 'ضغط دم طبيعي' : 'Normal blood pressure',
                    advice: isArabic ? '❤️ حافظ على نمط حياة صحي' : '❤️ Maintain a healthy lifestyle',
                    value: `${systolic}/${diastolic} mmHg`
                });
            }
        }
        
        if (formData.glucose && formData.glucose.toString().trim() !== '') {
            const glucose = parseFloat(formData.glucose);
            if (glucose > VALIDATION_LIMITS.glucose.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: 'high',
                    icon: '⚠️',
                    field: 'glucose',
                    message: isArabic ? 'سكر الدم مرتفع' : 'High blood sugar',
                    advice: isArabic ? '🍚 قلل السكريات، زد الألياف، واستشر طبيبك' : '🍚 Reduce sugar, increase fiber, and consult your doctor',
                    value: `${glucose} mg/dL`
                });
            } else if (glucose < VALIDATION_LIMITS.glucose.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'high',
                    icon: '⚠️',
                    field: 'glucose',
                    message: isArabic ? 'سكر الدم منخفض' : 'Low blood sugar',
                    advice: isArabic ? '🍯 تناول وجبة خفيفة تحتوي على سكر سريع' : '🍯 Eat a quick sugar snack',
                    value: `${glucose} mg/dL`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'glucose',
                    message: isArabic ? 'سكر دم طبيعي' : 'Normal blood sugar',
                    advice: isArabic ? '🥗 حافظ على نظام غذائي متوازن' : '🥗 Maintain a balanced diet',
                    value: `${glucose} mg/dL`
                });
            }
        }
        
        if (formData.heartRate && formData.heartRate.toString().trim() !== '') {
            const heartRate = parseInt(formData.heartRate);
            if (heartRate > VALIDATION_LIMITS.heartRate.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '⚠️',
                    field: 'heartRate',
                    message: isArabic ? 'نبضات قلب مرتفعة' : 'High heart rate',
                    advice: isArabic ? '🧘 استشر طبيبك إذا كان النبض مرتفعاً باستمرار' : '🧘 Consult your doctor if heart rate remains high',
                    value: `${heartRate} BPM`
                });
            } else if (heartRate < VALIDATION_LIMITS.heartRate.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '⚠️',
                    field: 'heartRate',
                    message: isArabic ? 'نبضات قلب منخفضة' : 'Low heart rate',
                    advice: isArabic ? '🏥 استشر طبيبك إذا كان النبض منخفضاً باستمرار' : '🏥 Consult your doctor if heart rate remains low',
                    value: `${heartRate} BPM`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'heartRate',
                    message: isArabic ? 'نبضات قلب طبيعية' : 'Normal heart rate',
                    advice: isArabic ? '🏃 حافظ على نشاطك البدني المنتظم' : '🏃 Maintain regular physical activity',
                    value: `${heartRate} BPM`
                });
            }
        }
        
        if (formData.spo2 && formData.spo2.toString().trim() !== '') {
            const spo2 = parseInt(formData.spo2);
            if (spo2 < VALIDATION_LIMITS.spo2.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: spo2 < 90 ? 'critical' : 'high',
                    icon: '🚨',
                    field: 'spo2',
                    message: isArabic ? 'نسبة أكسجين منخفضة' : 'Low oxygen level',
                    advice: spo2 < 90 
                        ? (isArabic ? '🏥 استشر طبيبك فوراً - هذا مؤشر خطر' : '🏥 Consult your doctor immediately - critical')
                        : (isArabic ? '🌬️ مارس تمارين التنفس العميق وحسّن التهوية' : '🌬️ Practice deep breathing exercises'),
                    value: `${spo2}%`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'spo2',
                    message: isArabic ? 'نسبة أكسجين طبيعية' : 'Normal oxygen level',
                    advice: isArabic ? '✨ حافظ على تهوية جيدة ومارس تمارين التنفس' : '✨ Maintain good ventilation and practice breathing exercises',
                    value: `${spo2}%`
                });
            }
        }

        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            const temperature = parseFloat(formData.temperature);
            if (temperature > VALIDATION_LIMITS.temperature.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: temperature > 38.5 ? 'high' : 'medium',
                    icon: '🌡️',
                    field: 'temperature',
                    message: isArabic ? 'ارتفاع درجة الحرارة' : 'High temperature',
                    advice: temperature > 39 
                        ? (isArabic ? '🚨 حرارة مرتفعة جداً! استشر طبيبك فوراً' : '🚨 Very high fever! Consult your doctor immediately')
                        : (isArabic ? '💊 خذ قسطاً من الراحة، اشرب سوائل، واستشر طبيبك إذا استمرت' : '💊 Rest, drink fluids, and consult your doctor if persistent'),
                    value: `${temperature} ${VALIDATION_LIMITS.temperature.unit}`
                });
            } else if (temperature < VALIDATION_LIMITS.temperature.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '🌡️',
                    field: 'temperature',
                    message: isArabic ? 'انخفاض درجة الحرارة' : 'Low temperature',
                    advice: isArabic ? '🧣 تدفئة الجسم وارتداء ملابس دافئة، استشر طبيبك' : '🧣 Keep warm and consult your doctor',
                    value: `${temperature} ${VALIDATION_LIMITS.temperature.unit}`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'temperature',
                    message: isArabic ? 'درجة حرارة طبيعية' : 'Normal temperature',
                    advice: isArabic ? '✨ حافظ على صحتك واستمر في المراقبة' : '✨ Stay healthy and keep monitoring',
                    value: `${temperature} ${VALIDATION_LIMITS.temperature.unit}`
                });
            }
        }
        
        return indicators;
    }, [formData, isArabic, VALIDATION_LIMITS]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const healthIndicators = calculateHealthIndicators();
    const filledFieldsCount = Object.values(formData).filter(v => v && v.toString().trim() !== '').length;

    // ✅ تنسيق وقت آخر قراءة
    const getLastReadingTime = () => {
        if (!lastSensorReading?.timestamp) return '';
        return lastSensorReading.timestamp.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="health-form-container">
            {/* ✅ رأس النموذج */}
            <div className="form-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">📝</span>
                        {isArabic ? 'إضافة قياس صحي' : 'Add Health Reading'}
                    </h2>
                    {filledFieldsCount > 0 && (
                        <div className="fields-badge">
                            📋 {filledFieldsCount}/7 {isArabic ? 'حقول مملوءة' : 'fields filled'}
                        </div>
                    )}
                </div>
                <div className="header-controls">
                    <label className="auto-save-toggle">
                        <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">
                            💾 {isArabic ? 'حفظ تلقائي' : 'Auto Save'}
                        </span>
                    </label>
                    {lastAutoSave && (
                        <div className="auto-save-time">
                            🕐 {lastAutoSave.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ قسم ESP32 - مع زرين منفصلين */}
            <div className="esp32-section">
                <div className="esp32-header">
                    <span className="esp32-icon">🫀</span>
                    <h3>{isArabic ? 'جهاز مراقبة الصحي ESP32' : 'ESP32 Health Monitor'}</h3>
                    {sensorActive && <span className="online-badge">🟢 {isArabic ? 'متصل' : 'Online'}</span>}
                </div>
                
                <div className="esp32-controls">
                    {!sensorActive ? (
                        <button 
                            onClick={connectSensor} 
                            disabled={sensorConnecting}
                            className="esp32-connect-btn"
                        >
                            {sensorConnecting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    {isArabic ? 'جاري الاتصال...' : 'Connecting...'}
                                </>
                            ) : (
                                <>🔌 {isArabic ? 'اتصال ESP32' : 'Connect ESP32'}</>
                            )}
                        </button>
                    ) : (
                        <>
                            <button onClick={disconnectSensor} className="esp32-disconnect-btn">
                                🔌 {isArabic ? 'قطع الاتصال' : 'Disconnect'}
                            </button>
                            
                            {/* ✅ الزر الأول: تعبئة النموذج */}
                            <button 
                                onClick={fillFormWithSensorData} 
                                className="esp32-fill-btn"
                                disabled={sensorHeartRate === null && sensorSpO2 === null}
                            >
                                📋 {isArabic ? 'تعبئة النموذج' : 'Fill Form'}
                            </button>
                            
                            {/* ✅ الزر الثاني: حفظ كقراءة صحية */}
                            <button 
                                onClick={saveSensorReadingAsHealthRecord} 
                                className="esp32-save-btn"
                                disabled={savingSensorData || (sensorHeartRate === null && sensorSpO2 === null)}
                            >
                                {savingSensorData ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        {isArabic ? 'جاري الحفظ...' : 'Saving...'}
                                    </>
                                ) : (
                                    <>💾 {isArabic ? 'حفظ كقياس صحي' : 'Save as Record'}</>
                                )}
                            </button>
                        </>
                    )}
                </div>

                {sensorActive && (
                    <>
                        <div className="esp32-readings">
                            <div className="sensor-card heart-rate">
                                <span className="sensor-icon">❤️</span>
                                <div className="sensor-info">
                                    <span className="sensor-label">{isArabic ? 'معدل ضربات القلب' : 'Heart Rate'}</span>
                                    <span className="sensor-value">
                                        {sensorHeartRate !== null ? sensorHeartRate : '---'}
                                        <span className="sensor-unit">BPM</span>
                                    </span>
                                </div>
                                {sensorHeartRate !== null && (
                                    <div className={`sensor-status ${sensorHeartRate >= 60 && sensorHeartRate <= 100 ? 'normal' : 'warning'}`}>
                                        {sensorHeartRate >= 60 && sensorHeartRate <= 100 ? '✓' : '⚠️'}
                                    </div>
                                )}
                            </div>
                            <div className="sensor-card spo2">
                                <span className="sensor-icon">💨</span>
                                <div className="sensor-info">
                                    <span className="sensor-label">{isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}</span>
                                    <span className="sensor-value">
                                        {sensorSpO2 !== null ? sensorSpO2 : '---'}
                                        <span className="sensor-unit">SpO₂%</span>
                                    </span>
                                </div>
                                {sensorSpO2 !== null && (
                                    <div className={`sensor-status ${sensorSpO2 >= 95 ? 'normal' : 'warning'}`}>
                                        {sensorSpO2 >= 95 ? '✓' : '⚠️'}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* ✅ عرض وقت آخر قراءة */}
                        {lastSensorReading?.timestamp && (
                            <div className="esp32-timestamp">
                                <span className="timestamp-icon">🕐</span>
                                <span>
                                    {isArabic ? 'آخر تحديث:' : 'Last update:'}
                                    {getLastReadingTime()}
                                </span>
                            </div>
                        )}
                        
                        {/* ✅ شرح الأزرار */}
                        <div className="esp32-help">
                            <div className="help-item">
                                <span className="help-icon">📋</span>
                                <span>{isArabic ? 'تعبئة النموذج: تعبئة حقول النبض والأكسجين في النموذج أدناه' : 'Fill Form: Fill heart rate and oxygen fields in the form below'}</span>
                            </div>
                            <div className="help-item">
                                <span className="help-icon">💾</span>
                                <span>{isArabic ? 'حفظ كقياس صحي: حفظ القراءات مباشرة كسجل صحي منفصل' : 'Save as Record: Save readings directly as a separate health record'}</span>
                            </div>
                        </div>
                    </>
                )}
                
                {!sensorActive && !sensorConnecting && (
                    <div className="esp32-hint">
                        <span className="hint-icon">💡</span>
                        <span>{isArabic ? 'اتصل بجهاز ESP32 لجلب قراءات النبض والأكسجين' : 'Connect to ESP32 device to fetch heart rate and oxygen readings'}</span>
                    </div>
                )}
            </div>

            {/* ✅ نموذج الإدخال */}
            <form onSubmit={handleSubmit} className="health-form">
                <div className="form-grid">
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">⚖️</span>
                            {isArabic ? 'الوزن' : 'Weight'}
                            <span className="field-unit">(kg)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                placeholder={isArabic ? 'مثال: 70.5' : 'Example: 70.5'}
                                className={`form-input ${validationErrors.weight ? 'error' : ''}`}
                            />
                            <span className="input-suffix">kg</span>
                        </div>
                        {validationErrors.weight && <div className="field-error">{validationErrors.weight}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 50-100 kg</span>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">❤️</span>
                            {isArabic ? 'الضغط الانقباضي' : 'Systolic'}
                            <span className="field-unit">(mmHg)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.systolic}
                                onChange={(e) => handleInputChange('systolic', e.target.value)}
                                placeholder={isArabic ? 'مثال: 120' : 'Example: 120'}
                                className={`form-input ${validationErrors.systolic ? 'error' : ''}`}
                            />
                            <span className="input-suffix">mmHg</span>
                        </div>
                        {validationErrors.systolic && <div className="field-error">{validationErrors.systolic}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 90-140 mmHg</span>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">💙</span>
                            {isArabic ? 'الضغط الانبساطي' : 'Diastolic'}
                            <span className="field-unit">(mmHg)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.diastolic}
                                onChange={(e) => handleInputChange('diastolic', e.target.value)}
                                placeholder={isArabic ? 'مثال: 80' : 'Example: 80'}
                                className={`form-input ${validationErrors.diastolic ? 'error' : ''}`}
                            />
                            <span className="input-suffix">mmHg</span>
                        </div>
                        {validationErrors.diastolic && <div className="field-error">{validationErrors.diastolic}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-90 mmHg</span>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">🩸</span>
                            {isArabic ? 'سكر الدم' : 'Blood Glucose'}
                            <span className="field-unit">(mg/dL)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.glucose}
                                onChange={(e) => handleInputChange('glucose', e.target.value)}
                                placeholder={isArabic ? 'مثال: 95' : 'Example: 95'}
                                className={`form-input ${validationErrors.glucose ? 'error' : ''}`}
                            />
                            <span className="input-suffix">mg/dL</span>
                        </div>
                        {validationErrors.glucose && <div className="field-error">{validationErrors.glucose}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 70-140 mg/dL</span>
                        </div>
                    </div>

                    {/* حقل نبضات القلب مع إشارة من ESP32 */}
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">💓</span>
                            {isArabic ? 'نبضات القلب' : 'Heart Rate'}
                            <span className="field-unit">(BPM)</span>
                            {sensorHeartRate !== null && sensorActive && (
                                <span className="esp32-indicator" title={isArabic ? 'قادم من المستشعر' : 'From sensor'}>
                                    📡
                                </span>
                            )}
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.heartRate}
                                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                                placeholder={isArabic ? 'مثال: 75' : 'Example: 75'}
                                className={`form-input ${validationErrors.heartRate ? 'error' : ''} ${sensorHeartRate !== null && sensorActive ? 'sensor-filled' : ''}`}
                            />
                            <span className="input-suffix">BPM</span>
                        </div>
                        {validationErrors.heartRate && <div className="field-error">{validationErrors.heartRate}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-100 BPM</span>
                        </div>
                    </div>

                    {/* حقل نسبة الأكسجين مع إشارة من ESP32 */}
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">💨</span>
                            {isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}
                            <span className="field-unit">(%)</span>
                            {sensorSpO2 !== null && sensorActive && (
                                <span className="esp32-indicator" title={isArabic ? 'قادم من المستشعر' : 'From sensor'}>
                                    📡
                                </span>
                            )}
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.spo2}
                                onChange={(e) => handleInputChange('spo2', e.target.value)}
                                placeholder={isArabic ? 'مثال: 98' : 'Example: 98'}
                                className={`form-input ${validationErrors.spo2 ? 'error' : ''} ${sensorSpO2 !== null && sensorActive ? 'sensor-filled' : ''}`}
                            />
                            <span className="input-suffix">%</span>
                        </div>
                        {validationErrors.spo2 && <div className="field-error">{validationErrors.spo2}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 95-100%</span>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">🌡️</span>
                            {isArabic ? 'درجة الحرارة' : 'Temperature'}
                            <span className="field-unit">(°C)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.temperature}
                                onChange={(e) => handleInputChange('temperature', e.target.value)}
                                placeholder={isArabic ? 'مثال: 37.0' : 'Example: 37.0'}
                                className={`form-input ${validationErrors.temperature ? 'error' : ''}`}
                            />
                            <span className="input-suffix">°C</span>
                        </div>
                        {validationErrors.temperature && <div className="field-error">{validationErrors.temperature}</div>}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 36.5-37.5 °C</span>
                        </div>
                    </div>
                </div>

                {/* ✅ المؤشرات الصحية */}
                {healthIndicators.length > 0 && (
                    <div className="indicators-section">
                        <div className="section-header">
                            <span className="section-icon">💡</span>
                            <h3>{isArabic ? 'المؤشرات الصحية' : 'Health Indicators'}</h3>
                        </div>
                        <div className="indicators-list">
                            {healthIndicators.map((indicator, index) => (
                                <div key={index} className={`indicator-card severity-${indicator.severity}`}>
                                    <div className="indicator-header">
                                        <span className="indicator-icon">{indicator.icon}</span>
                                        <span className="indicator-message">{indicator.message}</span>
                                        {indicator.value && (
                                            <span className="indicator-value">{indicator.value}</span>
                                        )}
                                    </div>
                                    <div className="indicator-advice">{indicator.advice}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ✅ أزرار الإجراء */}
                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="action-btn clear-btn"
                        disabled={loading}
                    >
                        🗑️ {isArabic ? 'مسح النموذج' : 'Clear Form'}
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="action-btn submit-btn"
                    >
                        {loading ? (
                            <>
                                <span className="spinner-small"></span>
                                {isArabic ? 'جاري الحفظ...' : 'Saving...'}
                            </>
                        ) : (
                            <>💾 {isArabic ? 'حفظ الكل' : 'Save All'}</>
                        )}
                    </button>
                </div>
            </form>

            {/* ✅ رسالة الإشعار */}
            {message && (
                <div className={`notification-toast ${messageType}`}>
                    <span className="toast-icon">
                        {messageType === 'success' && '✅'}
                        {messageType === 'error' && '❌'}
                        {messageType === 'info' && 'ℹ️'}
                    </span>
                    <span className="toast-message">{message}</span>
                    <button 
                        className="toast-close" 
                        onClick={() => { setMessage(''); setMessageType(''); }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* ✅ أنماط CSS - إضافة أنماط جديدة للأزرار */}
            <style jsx>{`
                .health-form-container {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }

                /* ===== رأس النموذج ===== */
                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .header-title h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.3rem;
                }

                .title-icon {
                    font-size: 1.5rem;
                }

                .fields-badge {
                    padding: 0.35rem 0.85rem;
                    background: var(--tertiary-bg);
                    border-radius: 50px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                /* ===== زر الحفظ التلقائي ===== */
                .auto-save-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }

                .auto-save-toggle input {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    width: 44px;
                    height: 22px;
                    background: var(--border-light);
                    border-radius: 22px;
                    position: relative;
                    transition: all var(--transition-fast);
                }

                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: all var(--transition-fast);
                    box-shadow: var(--shadow-sm);
                }

                input:checked + .toggle-slider {
                    background: var(--success);
                }

                input:checked + .toggle-slider::before {
                    transform: translateX(22px);
                }

                [dir="rtl"] input:checked + .toggle-slider::before {
                    transform: translateX(-22px);
                }

                .toggle-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .auto-save-time {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem 0.5rem;
                    background: var(--tertiary-bg);
                    border-radius: 8px;
                }

                /* ===== قسم ESP32 ===== */
                .esp32-section {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
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

                .esp32-icon {
                    font-size: 1.5rem;
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

                .esp32-controls {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }

                .esp32-connect-btn,
                .esp32-disconnect-btn,
                .esp32-fill-btn,
                .esp32-save-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 10px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .esp32-connect-btn {
                    background: #10b981;
                    color: white;
                }

                .esp32-connect-btn:hover:not(:disabled) {
                    background: #059669;
                    transform: translateY(-2px);
                }

                .esp32-connect-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .esp32-disconnect-btn {
                    background: #ef4444;
                    color: white;
                }

                .esp32-disconnect-btn:hover {
                    background: #dc2626;
                    transform: translateY(-2px);
                }

                .esp32-fill-btn {
                    background: #f59e0b;
                    color: white;
                }

                .esp32-fill-btn:hover:not(:disabled) {
                    background: #d97706;
                    transform: translateY(-2px);
                }

                .esp32-fill-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .esp32-save-btn {
                    background: #8b5cf6;
                    color: white;
                }

                .esp32-save-btn:hover:not(:disabled) {
                    background: #7c3aed;
                    transform: translateY(-2px);
                }

                .esp32-save-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .esp32-readings {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.75rem;
                }

                .sensor-card {
                    flex: 1;
                    min-width: 150px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    backdrop-filter: blur(10px);
                }

                .sensor-icon {
                    font-size: 2rem;
                }

                .sensor-info {
                    flex: 1;
                }

                .sensor-label {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    display: block;
                }

                .sensor-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: white;
                }

                .sensor-unit {
                    font-size: 0.7rem;
                    font-weight: normal;
                    margin-left: 4px;
                    color: #94a3b8;
                }

                .sensor-status {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                    font-weight: bold;
                }

                .sensor-status.normal {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .sensor-status.warning {
                    background: rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                }

                .esp32-timestamp {
                    padding: 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.7rem;
                    color: #94a3b8;
                    margin-bottom: 0.75rem;
                }

                .esp32-help {
                    padding: 0.5rem;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .help-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.65rem;
                    color: #94a3b8;
                }

                .help-icon {
                    font-size: 0.8rem;
                }

                .esp32-hint {
                    margin-top: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.7rem;
                    color: #94a3b8;
                }

                .hint-icon {
                    font-size: 0.9rem;
                }

                .esp32-indicator {
                    font-size: 0.7rem;
                    margin-left: 0.5rem;
                    cursor: help;
                    opacity: 0.7;
                }

                .form-input.sensor-filled {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.05);
                }

                /* ===== شبكة الحقول ===== */
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

                .field-label {
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

                .field-unit {
                    color: var(--text-tertiary);
                    font-weight: normal;
                    font-size: 0.75rem;
                }

                .input-wrapper {
                    position: relative;
                }

                .form-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    padding-right: 60px;
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    background: var(--secondary-bg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    transition: all var(--transition-fast);
                }

                [dir="rtl"] .form-input {
                    padding-right: 1rem;
                    padding-left: 60px;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }

                .form-input.error {
                    border-color: var(--error);
                }

                .input-suffix {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    font-size: 0.8rem;
                }

                [dir="rtl"] .input-suffix {
                    right: auto;
                    left: 1rem;
                }

                .field-error {
                    font-size: 0.7rem;
                    color: var(--error);
                }

                .field-hint {
                    font-size: 0.65rem;
                    color: var(--text-tertiary);
                }

                .hint-normal {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                /* ===== المؤشرات الصحية ===== */
                .indicators-section {
                    background: var(--secondary-bg);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-light);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .section-icon {
                    font-size: 1.2rem;
                }

                .section-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1rem;
                }

                .indicators-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .indicator-card {
                    padding: 0.75rem;
                    border-radius: 12px;
                    transition: all var(--transition-fast);
                }

                .indicator-card.severity-critical {
                    background: rgba(220, 38, 38, 0.1);
                    border-left: 3px solid #dc2626;
                }

                .indicator-card.severity-high {
                    background: rgba(245, 158, 11, 0.1);
                    border-left: 3px solid #f59e0b;
                }

                .indicator-card.severity-medium {
                    background: rgba(59, 130, 246, 0.1);
                    border-left: 3px solid #3b82f6;
                }

                .indicator-card.severity-good {
                    background: rgba(16, 185, 129, 0.1);
                    border-left: 3px solid #10b981;
                }

                [dir="rtl"] .indicator-card {
                    border-left: none;
                    border-right: 3px solid;
                }

                [dir="rtl"] .indicator-card.severity-critical { border-right-color: #dc2626; }
                [dir="rtl"] .indicator-card.severity-high { border-right-color: #f59e0b; }
                [dir="rtl"] .indicator-card.severity-medium { border-right-color: #3b82f6; }
                [dir="rtl"] .indicator-card.severity-good { border-right-color: #10b981; }

                .indicator-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.5rem;
                }

                .indicator-icon {
                    font-size: 1.1rem;
                }

                .indicator-message {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                }

                .indicator-value {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    background: var(--card-bg);
                    padding: 0.15rem 0.5rem;
                    border-radius: 12px;
                }

                .indicator-advice {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                /* ===== أزرار الإجراء ===== */
                .form-actions {
                    display: flex;
                    gap: 1rem;
                }

                .action-btn {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-medium);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .action-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .clear-btn {
                    background: var(--secondary-bg);
                    border: 1px solid var(--border-light);
                    color: var(--text-secondary);
                }

                .clear-btn:hover:not(:disabled) {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: var(--error);
                    color: var(--error);
                }

                .submit-btn {
                    background: var(--primary-gradient);
                    color: white;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .spinner-small {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                /* ===== إشعار ===== */
                .notification-toast {
                    position: fixed;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                    box-shadow: var(--shadow-lg);
                }

                [dir="rtl"] .notification-toast {
                    right: auto;
                    left: 1.5rem;
                }

                .notification-toast.success {
                    background: var(--success);
                    color: white;
                }

                .notification-toast.error {
                    background: var(--error);
                    color: white;
                }

                .notification-toast.info {
                    background: var(--info);
                    color: white;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                    opacity: 0.8;
                    transition: opacity var(--transition-fast);
                }

                .toast-close:hover {
                    opacity: 1;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

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

                /* ===== استجابة الشاشات ===== */
                @media (max-width: 768px) {
                    .health-form-container {
                        padding: 1rem;
                    }

                    .form-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .notification-toast {
                        left: 1rem;
                        right: 1rem;
                        bottom: 1rem;
                    }

                    [dir="rtl"] .notification-toast {
                        left: 1rem;
                        right: 1rem;
                    }

                    .esp32-readings {
                        flex-direction: column;
                    }

                    .sensor-card {
                        min-width: auto;
                    }

                    .esp32-controls {
                        flex-direction: column;
                    }
                    
                    .esp32-connect-btn,
                    .esp32-disconnect-btn,
                    .esp32-fill-btn,
                    .esp32-save-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }

                @media (max-width: 640px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .spinner-small {
                        animation: none;
                    }
                    
                    .notification-toast {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default HealthForm;