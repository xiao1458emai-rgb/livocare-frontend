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
        spo2: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

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
        spo2: { min: 50, max: 100, normalMin: 95, normalMax: 100, unit: '%', icon: '💨' }
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
            
            // التحقق من أن الانقباضي أكبر من الانبساطي
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
            spo2: ''
        });
        setValidationErrors({});
        localStorage.removeItem('healthForm_autoSave');
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
            } else if (weight >= VALIDATION_LIMITS.weight.normalMin && weight <= VALIDATION_LIMITS.weight.normalMax) {
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
        
        return indicators;
    }, [formData, isArabic, VALIDATION_LIMITS]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const healthIndicators = calculateHealthIndicators();

    // ✅ حساب عدد الحقول المملوءة
    const filledFieldsCount = Object.values(formData).filter(v => v && v.toString().trim() !== '').length;

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
                            📋 {filledFieldsCount}/6 {isArabic ? 'حقول مملوءة' : 'fields filled'}
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
                            <>💾 {isArabic ? 'حفظ' : 'Save'}</>
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
        </div>
    );
}

export default HealthForm;