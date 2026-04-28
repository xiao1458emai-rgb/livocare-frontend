// src/components/HealthForm.jsx
'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

function HealthForm({ onDataSubmitted }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    
    const [formData, setFormData] = useState({
        weight: '',
        systolic: '',
        diastolic: '',
        glucose: '',
        heartRate: '',
        spo2: '',
        temperature: ''  // ✅ حقل درجة الحرارة الجديد
    });
    
    // ✅ بيانات النشاط البدني
    const [activityData, setActivityData] = useState({
        activityType: 'walking',
        duration: '',
        calories: '',
        manualCalories: false
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    
    // ✅ معاملات حساب السعرات الحرارية لكل نشاط
    const activityFactors = {
        walking: { nameAr: '🚶 مشي', nameEn: '🚶 Walking', met: 3.5, descAr: 'مشي معتدل', descEn: 'Moderate walking' },
        running: { nameAr: '🏃 جري', nameEn: '🏃 Running', met: 8.0, descAr: 'جري سريع', descEn: 'Fast running' },
        cycling: { nameAr: '🚲 ركوب دراجة', nameEn: '🚲 Cycling', met: 6.0, descAr: 'ركوب دراجة معتدل', descEn: 'Moderate cycling' },
        swimming: { nameAr: '🏊 سباحة', nameEn: '🏊 Swimming', met: 7.0, descAr: 'سباحة معتدلة', descEn: 'Moderate swimming' },
        gym: { nameAr: '💪 تمارين قوة', nameEn: '💪 Strength Training', met: 5.0, descAr: 'تمارين مقاومة', descEn: 'Resistance training' },
        yoga: { nameAr: '🧘 يوغا', nameEn: '🧘 Yoga', met: 2.5, descAr: 'تمارين مرونة واسترخاء', descEn: 'Flexibility and relaxation' },
        dancing: { nameAr: '💃 رقص', nameEn: '💃 Dancing', met: 5.5, descAr: 'رقص حيوي', descEn: 'Energetic dancing' },
        football: { nameAr: '⚽ كرة قدم', nameEn: '⚽ Football', met: 7.5, descAr: 'رياضة جماعية', descEn: 'Team sport' }
    };

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

    // ✅ حساب السعرات الحرارية تلقائياً
    useEffect(() => {
        if (!activityData.manualCalories && activityData.duration && formData.weight) {
            const weight = parseFloat(formData.weight);
            const duration = parseFloat(activityData.duration);
            const activity = activityFactors[activityData.activityType];
            
            if (weight && duration && activity && !isNaN(weight) && !isNaN(duration) && weight > 0 && duration > 0) {
                // المعادلة: MET × الوزن بالكجم × (المدة بالساعات)
                const hours = duration / 60;
                const calculatedCalories = Math.round(activity.met * weight * hours);
                setActivityData(prev => ({ ...prev, calories: calculatedCalories.toString() }));
            }
        }
    }, [activityData.activityType, activityData.duration, formData.weight, activityData.manualCalories]);

    // ✅ الحفظ التلقائي
    useEffect(() => {
        if (!autoSave) return;

        const autoSaveForm = () => {
            const hasData = Object.values(formData).some(value => value && value.toString().trim() !== '');
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(formData));
                localStorage.setItem('activityData_autoSave', JSON.stringify(activityData));
                setLastAutoSave(new Date());
            }
        };

        const timeoutId = setTimeout(autoSaveForm, 2000);
        return () => clearTimeout(timeoutId);
    }, [formData, activityData, autoSave]);

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
        
        const savedActivity = localStorage.getItem('activityData_autoSave');
        if (savedActivity && isMountedRef.current) {
            try {
                const parsedActivity = JSON.parse(savedActivity);
                setActivityData(parsedActivity);
            } catch (error) {
                console.error('Error loading activity data:', error);
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

        // التحقق من الوزن
        if (formData.weight && formData.weight.toString().trim() !== '') {
            hasAnyData = true;
            const weight = parseFloat(formData.weight);
            if (isNaN(weight)) {
                errors.weight = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.weight.min} - ${VALIDATION_LIMITS.weight.max} ${VALIDATION_LIMITS.weight.unit}`;
            }
        }

        // التحقق من الضغط الانقباضي
        if (formData.systolic && formData.systolic.toString().trim() !== '') {
            hasAnyData = true;
            const systolic = parseInt(formData.systolic);
            if (isNaN(systolic)) {
                errors.systolic = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (systolic < VALIDATION_LIMITS.systolic.min || systolic > VALIDATION_LIMITS.systolic.max) {
                errors.systolic = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.systolic.min} - ${VALIDATION_LIMITS.systolic.max} ${VALIDATION_LIMITS.systolic.unit}`;
            }
        }

        // التحقق من الضغط الانبساطي
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

        // التحقق من الجلوكوز
        if (formData.glucose && formData.glucose.toString().trim() !== '') {
            hasAnyData = true;
            const glucose = parseFloat(formData.glucose);
            if (isNaN(glucose)) {
                errors.glucose = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (glucose < VALIDATION_LIMITS.glucose.min || glucose > VALIDATION_LIMITS.glucose.max) {
                errors.glucose = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.glucose.min} - ${VALIDATION_LIMITS.glucose.max} ${VALIDATION_LIMITS.glucose.unit}`;
            }
        }

        // التحقق من نبضات القلب
        if (formData.heartRate && formData.heartRate.toString().trim() !== '') {
            hasAnyData = true;
            const heartRate = parseInt(formData.heartRate);
            if (isNaN(heartRate)) {
                errors.heartRate = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (heartRate < VALIDATION_LIMITS.heartRate.min || heartRate > VALIDATION_LIMITS.heartRate.max) {
                errors.heartRate = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.heartRate.min} - ${VALIDATION_LIMITS.heartRate.max} ${VALIDATION_LIMITS.heartRate.unit}`;
            }
        }

        // التحقق من الأكسجين
        if (formData.spo2 && formData.spo2.toString().trim() !== '') {
            hasAnyData = true;
            const spo2 = parseInt(formData.spo2);
            if (isNaN(spo2)) {
                errors.spo2 = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (spo2 < VALIDATION_LIMITS.spo2.min || spo2 > VALIDATION_LIMITS.spo2.max) {
                errors.spo2 = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.spo2.min} - ${VALIDATION_LIMITS.spo2.max} ${VALIDATION_LIMITS.spo2.unit}`;
            }
        }
        
        // ✅ التحقق من درجة الحرارة
        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            hasAnyData = true;
            const temperature = parseFloat(formData.temperature);
            if (isNaN(temperature)) {
                errors.temperature = isArabic ? '❌ رقم غير صالح' : '❌ Invalid number';
            } else if (temperature < VALIDATION_LIMITS.temperature.min || temperature > VALIDATION_LIMITS.temperature.max) {
                errors.temperature = `${isArabic ? 'النطاق المسموح' : 'Allowed range'}: ${VALIDATION_LIMITS.temperature.min} - ${VALIDATION_LIMITS.temperature.max} ${VALIDATION_LIMITS.temperature.unit}`;
            }
        }

        if (!hasAnyData && !activityData.duration) {
            showMessage(isArabic ? '⚠️ الرجاء إدخال قيمة واحدة على الأقل' : '⚠️ Please enter at least one value', 'error');
            return false;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, activityData.duration, isArabic, showMessage, VALIDATION_LIMITS]);

    // ✅ معالجة تغيير الحقول
    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [validationErrors]);

    // ✅ معالجة تغيير بيانات النشاط
    const handleActivityChange = useCallback((field, value) => {
        setActivityData(prev => ({ ...prev, [field]: value }));
        if (field === 'manualCalories' && value === true) {
            // عند تفعيل الوضع اليدوي، نحتفظ بالقيمة الحالية
        } else if (field === 'calories' && activityData.manualCalories) {
            setActivityData(prev => ({ ...prev, calories: value }));
        }
    }, [activityData.manualCalories]);

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
        setActivityData({
            activityType: 'walking',
            duration: '',
            calories: '',
            manualCalories: false
        });
        setValidationErrors({});
        localStorage.removeItem('healthForm_autoSave');
        localStorage.removeItem('activityData_autoSave');
        showMessage(isArabic ? '🗑️ تم مسح النموذج' : '🗑️ Form cleared', 'info');
    }, [isArabic, showMessage]);

    // ✅ إرسال النموذج
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
        
        // ✅ إضافة درجة الحرارة
        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            data.body_temperature = parseFloat(formData.temperature);
        }
        
        // ✅ إضافة بيانات النشاط
        if (activityData.duration && activityData.duration.toString().trim() !== '') {
            data.activity_type = activityData.activityType;
            data.activity_duration_minutes = parseInt(activityData.duration);
            if (activityData.calories && activityData.calories.toString().trim() !== '') {
                data.calories_burned = parseInt(activityData.calories);
            }
        }

        try {
            const response = await axiosInstance.post('/health_status/', data);
            
            if (isMountedRef.current) {
                showMessage(isArabic ? '✅ تم حفظ البيانات بنجاح' : '✅ Data saved successfully', 'success');
                resetForm();
                localStorage.removeItem('healthForm_autoSave');
                localStorage.removeItem('activityData_autoSave');
                
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
    }, [formData, activityData, onDataSubmitted, isArabic, validateForm, resetForm, showMessage]);

    // ✅ حساب المؤشرات الصحية
    const calculateHealthIndicators = useCallback(() => {
        const indicators = [];
        
        // تحليل الوزن
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
        
        // تحليل ضغط الدم
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
        
        // تحليل الجلوكوز
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
        
        // تحليل نبضات القلب
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
        
        // تحليل الأكسجين
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
        
        // ✅ تحليل درجة الحرارة
        if (formData.temperature && formData.temperature.toString().trim() !== '') {
            const temp = parseFloat(formData.temperature);
            if (temp > VALIDATION_LIMITS.temperature.normalMax) {
                indicators.push({
                    type: 'warning',
                    severity: temp > 38.5 ? 'critical' : 'high',
                    icon: temp > 38.5 ? '🔥' : '⚠️',
                    field: 'temperature',
                    message: isArabic ? 'درجة حرارة مرتفعة' : 'High temperature',
                    advice: temp > 38.5 
                        ? (isArabic ? '🩺 استشر طبيبك، قد تكون مصاباً بحمى شديدة' : '🩺 Consult your doctor, you may have a high fever')
                        : (isArabic ? '💊 خذ قسطاً من الراحة، اشرب سوائل دافئة' : '💊 Rest and drink warm fluids'),
                    value: `${temp}°C`
                });
            } else if (temp < VALIDATION_LIMITS.temperature.normalMin) {
                indicators.push({
                    type: 'warning',
                    severity: 'medium',
                    icon: '❄️',
                    field: 'temperature',
                    message: isArabic ? 'درجة حرارة منخفضة' : 'Low temperature',
                    advice: isArabic ? '🧣 ارتدِ ملابس دافئة وتناول مشروبات ساخنة' : '🧣 Wear warm clothes and drink hot beverages',
                    value: `${temp}°C`
                });
            } else {
                indicators.push({
                    type: 'success',
                    severity: 'good',
                    icon: '✅',
                    field: 'temperature',
                    message: isArabic ? 'درجة حرارة طبيعية' : 'Normal temperature',
                    advice: isArabic ? '✨ حافظ على صحتك وعافيتك' : '✨ Maintain your health and wellness',
                    value: `${temp}°C`
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

    return (
        <div className="health-form-container">
            {/* ✅ رأس النموذج */}
            <div className="form-header">
                <div className="header-title">
                    <h2>
                        <span className="title-icon">📝</span>
                        {isArabic ? 'إضافة قياس صحي ونشاط بدني' : 'Add Health Reading & Physical Activity'}
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

            {/* ✅ نموذج الإدخال */}
            <form onSubmit={handleSubmit} className="health-form">
                <div className="section-title">
                    <span className="section-title-icon">🩺</span>
                    <h3>{isArabic ? 'القياسات الحيوية' : 'Vital Signs'}</h3>
                </div>
                
                <div className="form-grid">
                    {/* الوزن */}
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
                        {validationErrors.weight && (
                            <div className="field-error">{validationErrors.weight}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 50-100 kg</span>
                        </div>
                    </div>

                    {/* الضغط الانقباضي */}
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
                        {validationErrors.systolic && (
                            <div className="field-error">{validationErrors.systolic}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 90-140 mmHg</span>
                        </div>
                    </div>

                    {/* الضغط الانبساطي */}
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
                        {validationErrors.diastolic && (
                            <div className="field-error">{validationErrors.diastolic}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-90 mmHg</span>
                        </div>
                    </div>

                    {/* سكر الدم */}
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
                        {validationErrors.glucose && (
                            <div className="field-error">{validationErrors.glucose}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 70-140 mg/dL</span>
                        </div>
                    </div>

                    {/* نبضات القلب */}
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">💓</span>
                            {isArabic ? 'نبضات القلب' : 'Heart Rate'}
                            <span className="field-unit">(BPM)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.heartRate}
                                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                                placeholder={isArabic ? 'مثال: 75' : 'Example: 75'}
                                className={`form-input ${validationErrors.heartRate ? 'error' : ''}`}
                            />
                            <span className="input-suffix">BPM</span>
                        </div>
                        {validationErrors.heartRate && (
                            <div className="field-error">{validationErrors.heartRate}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 60-100 BPM</span>
                        </div>
                    </div>

                    {/* نسبة الأكسجين */}
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">💨</span>
                            {isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}
                            <span className="field-unit">(%)</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="number"
                                value={formData.spo2}
                                onChange={(e) => handleInputChange('spo2', e.target.value)}
                                placeholder={isArabic ? 'مثال: 98' : 'Example: 98'}
                                className={`form-input ${validationErrors.spo2 ? 'error' : ''}`}
                            />
                            <span className="input-suffix">%</span>
                        </div>
                        {validationErrors.spo2 && (
                            <div className="field-error">{validationErrors.spo2}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 95-100%</span>
                        </div>
                    </div>

                    {/* ✅ درجة حرارة الجسم (جديد) */}
                    <div className="form-field">
                        <label className="field-label">
                            <span className="field-icon">🌡️</span>
                            {isArabic ? 'درجة حرارة الجسم' : 'Body Temperature'}
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
                        {validationErrors.temperature && (
                            <div className="field-error">{validationErrors.temperature}</div>
                        )}
                        <div className="field-hint">
                            <span className="hint-normal">✅ {isArabic ? 'الطبيعي' : 'Normal'}: 36.5-37.5 °C</span>
                            <span className="hint-warning">⚠️ {isArabic ? 'فوق 38°C يعني حمى' : 'Above 38°C means fever'}</span>
                        </div>
                    </div>
                </div>

                {/* ✅ قسم النشاط البدني (جديد محسن) */}
                <div className="activity-section">
                    <div className="section-title">
                        <span className="section-title-icon">🏃‍♂️</span>
                        <h3>{isArabic ? 'النشاط البدني' : 'Physical Activity'}</h3>
                        <span className="section-badge">
                            {isArabic ? 'احسب السعرات المحروقة' : 'Calculate calories burned'}
                        </span>
                    </div>
                    
                    <div className="activity-grid">
                        {/* اختيار نوع النشاط */}
                        <div className="form-field">
                            <label className="field-label">
                                <span className="field-icon">🎯</span>
                                {isArabic ? 'نوع النشاط' : 'Activity Type'}
                            </label>
                            <div className="activity-selector">
                                <select
                                    value={activityData.activityType}
                                    onChange={(e) => handleActivityChange('activityType', e.target.value)}
                                    className="activity-select"
                                >
                                    {Object.entries(activityFactors).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {isArabic ? value.nameAr : value.nameEn}
                                        </option>
                                    ))}
                                </select>
                                <div className="activity-desc">
                                    {isArabic ? activityFactors[activityData.activityType].descAr : activityFactors[activityData.activityType].descEn}
                                </div>
                            </div>
                        </div>

                        {/* المدة */}
                        <div className="form-field">
                            <label className="field-label">
                                <span className="field-icon">⏱️</span>
                                {isArabic ? 'المدة' : 'Duration'}
                                <span className="field-unit">({isArabic ? 'دقائق' : 'minutes'})</span>
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="720"
                                    value={activityData.duration}
                                    onChange={(e) => handleActivityChange('duration', e.target.value)}
                                    placeholder={isArabic ? 'مثال: 30' : 'Example: 30'}
                                    className="form-input"
                                />
                                <span className="input-suffix">{isArabic ? 'دقيقة' : 'min'}</span>
                            </div>
                            {activityData.duration && formData.weight && (
                                <div className="field-hint success">
                                    💡 {isArabic 
                                        ? `بحسب وزنك ${formData.weight} كجم، كل دقيقة تحرق تقريباً ${Math.round(activityFactors[activityData.activityType].met * parseFloat(formData.weight) / 60)} سعرة`
                                        : `Based on your weight ${formData.weight} kg, each minute burns approximately ${Math.round(activityFactors[activityData.activityType].met * parseFloat(formData.weight) / 60)} calories`
                                    }
                                </div>
                            )}
                        </div>

                        {/* السعرات المحروقة */}
                        <div className="form-field">
                            <label className="field-label">
                                <span className="field-icon">🔥</span>
                                {isArabic ? 'السعرات المحروقة' : 'Calories Burned'}
                                <span className="field-unit">(kcal)</span>
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="number"
                                    step="5"
                                    value={activityData.calories}
                                    onChange={(e) => handleActivityChange('calories', e.target.value)}
                                    placeholder={isArabic ? 'تلقائي أو يدوي' : 'Auto or manual'}
                                    className="form-input"
                                    readOnly={!activityData.manualCalories}
                                    style={!activityData.manualCalories ? { backgroundColor: 'var(--tertiary-bg)', opacity: 0.8 } : {}}
                                />
                                <button
                                    type="button"
                                    className={`manual-toggle ${activityData.manualCalories ? 'active' : ''}`}
                                    onClick={() => handleActivityChange('manualCalories', !activityData.manualCalories)}
                                    title={isArabic ? 'تعديل يدوي' : 'Manual edit'}
                                >
                                    ✏️
                                </button>
                            </div>
                            {!activityData.manualCalories && activityData.duration && formData.weight && (
                                <div className="field-hint info">
                                    🤖 {isArabic ? 'محسوبة تلقائياً بناءً على الوزن والمدة' : 'Auto-calculated based on weight and duration'}
                                </div>
                            )}
                            {activityData.manualCalories && (
                                <div className="field-hint warning">
                                    ✏️ {isArabic ? 'وضع التعديل اليدوي مفعل' : 'Manual edit mode enabled'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ملخص النشاط */}
                    {activityData.duration && (activityData.calories || (!activityData.manualCalories && formData.weight)) && (
                        <div className="activity-summary">
                            <div className="summary-icon">🏆</div>
                            <div className="summary-text">
                                {isArabic 
                                    ? `قمتَ بـ ${activityData.duration} دقيقة من ${activityFactors[activityData.activityType].nameAr}`
                                    : `You did ${activityData.duration} minutes of ${activityFactors[activityData.activityType].nameEn}`
                                }
                                {activityData.calories && (
                                    <strong> — {isArabic ? `حرقت ${activityData.calories} سعرة حرارية` : `burned ${activityData.calories} calories`}</strong>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ✅ المؤشرات الصحية */}
                {healthIndicators.length > 0 && (
                    <div className="indicators-section">
                        <div className="section-header">
                            <span className="section-icon">💡</span>
                            <h3>{isArabic ? 'المؤشرات الصحية والتوصيات' : 'Health Indicators & Recommendations'}</h3>
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
                        🗑️ {isArabic ? 'مسح الكل' : 'Clear All'}
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
                            <>💾 {isArabic ? 'حفظ البيانات' : 'Save Data'}</>
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

            {/* ✅ أنماط CSS المضمنة */}
            <style jsx>{`
                .health-form-container {
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-light);
                    transition: all var(--transition-medium);
                }

                /* ===== عناوين الأقسام ===== */
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 1.5rem 0 1rem 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--border-light);
                }

                .section-title:first-of-type {
                    margin-top: 0;
                }

                .section-title-icon {
                    font-size: 1.3rem;
                }

                .section-title h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .section-badge {
                    background: var(--primary-gradient);
                    padding: 0.25rem 0.75rem;
                    border-radius: 50px;
                    font-size: 0.7rem;
                    color: white;
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

                .field-hint.success {
                    color: var(--success);
                }

                .field-hint.info {
                    color: var(--info);
                }

                .field-hint.warning {
                    color: var(--warning);
                }

                .hint-normal {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    margin-right: 0.5rem;
                }

                .hint-warning {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    color: var(--warning);
                }

                /* ===== قسم النشاط البدني ===== */
                .activity-section {
                    background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--tertiary-bg) 100%);
                    border-radius: 20px;
                    padding: 1.25rem;
                    margin: 1.5rem 0;
                    border: 1px solid var(--border-light);
                }

                .activity-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 1rem;
                }

                .activity-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .activity-select {
                    padding: 0.75rem;
                    border: 1px solid var(--border-light);
                    border-radius: 12px;
                    background: var(--card-bg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    cursor: pointer;
                }

                .activity-select:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .activity-desc {
                    font-size: 0.7rem;
                    color: var(--text-tertiary);
                    padding: 0.25rem 0.5rem;
                }

                .manual-toggle {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 0.25rem;
                    border-radius: 8px;
                    transition: all var(--transition-fast);
                    opacity: 0.6;
                }

                [dir="rtl"] .manual-toggle {
                    right: auto;
                    left: 1rem;
                }

                .manual-toggle:hover {
                    opacity: 1;
                    background: var(--border-light);
                }

                .manual-toggle.active {
                    opacity: 1;
                    background: var(--primary);
                    color: white;
                }

                .activity-summary {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 12px;
                    margin-top: 0.75rem;
                }

                .summary-icon {
                    font-size: 1.5rem;
                }

                .summary-text {
                    font-size: 0.85rem;
                    color: var(--text-primary);
                }

                .summary-text strong {
                    color: var(--success);
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
                    
                    .activity-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 480px) {
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