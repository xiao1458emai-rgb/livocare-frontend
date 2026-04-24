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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
                // تطبيق اتجاه الصفحة
                document.documentElement.dir = event.detail.isArabic ? 'rtl' : 'ltr';
                document.documentElement.lang = event.detail.isArabic ? 'ar' : 'en';
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // حدود التحقق من الصحة
    const VALIDATION_LIMITS = {
        weight: { min: 20, max: 300, normalMin: 50, normalMax: 100 },
        systolic: { min: 50, max: 250, normalMin: 90, normalMax: 140 },
        diastolic: { min: 30, max: 180, normalMin: 60, normalMax: 90 },
        glucose: { min: 30, max: 600, normalMin: 70, normalMax: 140 },
        heartRate: { min: 30, max: 220, normalMin: 60, normalMax: 100 },
        spo2: { min: 50, max: 100, normalMin: 95, normalMax: 100 }
    };

    // الحفظ التلقائي
    useEffect(() => {
        if (!autoSave) return;

        const autoSaveForm = () => {
            const hasData = Object.values(formData).some(value => value && value.trim !== undefined ? value.trim() !== '' : value !== '');
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(formData));
                setLastAutoSave(new Date());
            }
        };

        const timeoutId = setTimeout(autoSaveForm, 2000);
        return () => clearTimeout(timeoutId);
    }, [formData, autoSave]);

    // استعادة البيانات المحفوظة
    useEffect(() => {
        const savedData = localStorage.getItem('healthForm_autoSave');
        if (savedData && isMountedRef.current) {
            try {
                const parsedData = JSON.parse(savedData);
                setFormData(parsedData);
                setMessage(isArabic ? 'تم استعادة البيانات المحفوظة' : 'Auto-saved data restored');
                setMessageType('info');
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setMessage('');
                        setMessageType('');
                    }
                }, 3000);
            } catch (error) {
                console.error('Error loading auto-saved data:', error);
            }
        }
    }, [isArabic]);

    // دالة التحقق
    const validateForm = () => {
        let errors = {};
        let hasAnyData = false;

        if (formData.weight && formData.weight.trim() !== '') {
            hasAnyData = true;
            const weight = parseFloat(formData.weight);
            if (isNaN(weight)) {
                errors.weight = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = `${VALIDATION_LIMITS.weight.min} - ${VALIDATION_LIMITS.weight.max} ${isArabic ? 'كجم' : 'kg'}`;
            }
        }

        if (formData.systolic && formData.systolic.trim() !== '') {
            hasAnyData = true;
            const systolic = parseInt(formData.systolic);
            if (isNaN(systolic)) {
                errors.systolic = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (systolic < VALIDATION_LIMITS.systolic.min || systolic > VALIDATION_LIMITS.systolic.max) {
                errors.systolic = `${VALIDATION_LIMITS.systolic.min} - ${VALIDATION_LIMITS.systolic.max} mmHg`;
            }
        }

        if (formData.diastolic && formData.diastolic.trim() !== '') {
            hasAnyData = true;
            const diastolic = parseInt(formData.diastolic);
            if (isNaN(diastolic)) {
                errors.diastolic = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (diastolic < VALIDATION_LIMITS.diastolic.min || diastolic > VALIDATION_LIMITS.diastolic.max) {
                errors.diastolic = `${VALIDATION_LIMITS.diastolic.min} - ${VALIDATION_LIMITS.diastolic.max} mmHg`;
            }
            if (formData.systolic && formData.systolic.trim() !== '') {
                const systolic = parseInt(formData.systolic);
                if (!isNaN(systolic) && !isNaN(diastolic) && systolic <= diastolic) {
                    errors.diastolic = isArabic ? 'الضغط الانقباضي يجب أن يكون أكبر من الانبساطي' : 'Systolic must be greater than diastolic';
                }
            }
        }

        if (formData.glucose && formData.glucose.trim() !== '') {
            hasAnyData = true;
            const glucose = parseFloat(formData.glucose);
            if (isNaN(glucose)) {
                errors.glucose = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (glucose < VALIDATION_LIMITS.glucose.min || glucose > VALIDATION_LIMITS.glucose.max) {
                errors.glucose = `${VALIDATION_LIMITS.glucose.min} - ${VALIDATION_LIMITS.glucose.max} mg/dL`;
            }
        }

        if (formData.heartRate && formData.heartRate.trim() !== '') {
            hasAnyData = true;
            const heartRate = parseInt(formData.heartRate);
            if (isNaN(heartRate)) {
                errors.heartRate = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (heartRate < VALIDATION_LIMITS.heartRate.min || heartRate > VALIDATION_LIMITS.heartRate.max) {
                errors.heartRate = `${VALIDATION_LIMITS.heartRate.min} - ${VALIDATION_LIMITS.heartRate.max} BPM`;
            }
        }

        if (formData.spo2 && formData.spo2.trim() !== '') {
            hasAnyData = true;
            const spo2 = parseInt(formData.spo2);
            if (isNaN(spo2)) {
                errors.spo2 = isArabic ? 'رقم غير صالح' : 'Invalid number';
            } else if (spo2 < VALIDATION_LIMITS.spo2.min || spo2 > VALIDATION_LIMITS.spo2.max) {
                errors.spo2 = `${VALIDATION_LIMITS.spo2.min} - ${VALIDATION_LIMITS.spo2.max}%`;
            }
        }

        if (!hasAnyData) {
            errors._general = isArabic ? 'الرجاء إدخال قيمة واحدة على الأقل' : 'Please enter at least one value';
            return false;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // مسح الرسالة تلقائياً
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                if (isMountedRef.current) {
                    setMessage('');
                    setMessageType('');
                }
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const resetForm = () => {
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
        setMessage(isArabic ? 'تم مسح النموذج' : 'Form cleared');
        setMessageType('info');
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        if (!validateForm()) {
            setMessage(isArabic ? 'يرجى تصحيح الأخطاء في النموذج' : 'Please correct errors in the form');
            setMessageType('error');
            return;
        }

        isSubmittingRef.current = true;
        setLoading(true);
        setMessage('');
        setMessageType('');

        const data = {};
        
        if (formData.weight && formData.weight.trim() !== '') {
            data.weight_kg = parseFloat(formData.weight);
        }
        
        if (formData.systolic && formData.systolic.trim() !== '') {
            data.systolic_pressure = parseInt(formData.systolic);
        }
        
        if (formData.diastolic && formData.diastolic.trim() !== '') {
            data.diastolic_pressure = parseInt(formData.diastolic);
        }
        
        if (formData.glucose && formData.glucose.trim() !== '') {
            data.blood_glucose = parseFloat(formData.glucose);
        }
        
        if (formData.heartRate && formData.heartRate.trim() !== '') {
            data.heart_rate = parseInt(formData.heartRate);
        }
        
        if (formData.spo2 && formData.spo2.trim() !== '') {
            data.spo2 = parseInt(formData.spo2);
        }

        try {
            const response = await axiosInstance.post('/health_status/', data);
            
            if (isMountedRef.current) {
                setMessage(isArabic ? 'تم حفظ البيانات بنجاح' : 'Data saved successfully');
                setMessageType('success');
                
                resetForm();
                localStorage.removeItem('healthForm_autoSave');
                
                if (onDataSubmitted) {
                    onDataSubmitted();
                }
            }

        } catch (err) {
            console.error('❌ Submission failed:', err);
            
            if (!isMountedRef.current) return;
            
            let errorMessage = isArabic ? 'فشل حفظ البيانات' : 'Failed to save data';
            
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
                errorMessage = isArabic ? 'انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى' : 'Session expired, please login again';
            } else if (err.response?.status === 500) {
                errorMessage = isArabic ? 'خطأ في الخادم' : 'Server error';
            } else if (err.code === 'ERR_NETWORK') {
                errorMessage = isArabic ? 'خطأ في الاتصال بالخادم' : 'Network error';
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, onDataSubmitted, isArabic]);

    const calculateHealthIndicators = () => {
        const indicators = [];
        
        if (formData.weight && formData.weight.trim() !== '') {
            const weight = parseFloat(formData.weight);
            if (weight > VALIDATION_LIMITS.weight.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'الوزن مرتفع' : 'High weight',
                    advice: isArabic ? 'حاول تقليل السعرات الحرارية وزيادة النشاط البدني' : 'Try to reduce calories and increase physical activity'
                });
            } else if (weight < VALIDATION_LIMITS.weight.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'الوزن منخفض' : 'Low weight',
                    advice: isArabic ? 'حاول زيادة السعرات الحرارية بطريقة صحية' : 'Try to increase calories in a healthy way'
                });
            } else if (weight >= VALIDATION_LIMITS.weight.normalMin && weight <= VALIDATION_LIMITS.weight.normalMax) {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: isArabic ? 'وزن طبيعي' : 'Normal weight',
                    advice: isArabic ? 'حافظ على وزنك الصحي' : 'Maintain your healthy weight'
                });
            }
        }
        
        if (formData.systolic && formData.diastolic && formData.systolic.trim() !== '' && formData.diastolic.trim() !== '') {
            const systolic = parseInt(formData.systolic);
            const diastolic = parseInt(formData.diastolic);
            
            if (systolic > VALIDATION_LIMITS.systolic.normalMax || diastolic > VALIDATION_LIMITS.diastolic.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'ضغط الدم مرتفع' : 'High blood pressure',
                    advice: isArabic ? 'قلل الملح، مارس الرياضة، واستشر طبيبك' : 'Reduce salt, exercise, and consult your doctor'
                });
            } else if (systolic < VALIDATION_LIMITS.systolic.normalMin || diastolic < VALIDATION_LIMITS.diastolic.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'ضغط الدم منخفض' : 'Low blood pressure',
                    advice: isArabic ? 'اشرب كمية كافية من الماء، واستشر طبيبك' : 'Drink enough water and consult your doctor'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: isArabic ? 'ضغط دم طبيعي' : 'Normal blood pressure',
                    advice: isArabic ? 'حافظ على نمط حياة صحي' : 'Maintain a healthy lifestyle'
                });
            }
        }
        
        if (formData.glucose && formData.glucose.trim() !== '') {
            const glucose = parseFloat(formData.glucose);
            if (glucose > VALIDATION_LIMITS.glucose.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'سكر الدم مرتفع' : 'High blood sugar',
                    advice: isArabic ? 'قلل السكريات، زد الألياف، واستشر طبيبك' : 'Reduce sugar, increase fiber, and consult your doctor'
                });
            } else if (glucose < VALIDATION_LIMITS.glucose.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'سكر الدم منخفض' : 'Low blood sugar',
                    advice: isArabic ? 'تناول وجبة خفيفة تحتوي على سكر سريع' : 'Eat a quick sugar snack'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: isArabic ? 'سكر دم طبيعي' : 'Normal blood sugar',
                    advice: isArabic ? 'حافظ على نظام غذائي متوازن' : 'Maintain a balanced diet'
                });
            }
        }
        
        if (formData.heartRate && formData.heartRate.trim() !== '') {
            const heartRate = parseInt(formData.heartRate);
            if (heartRate > VALIDATION_LIMITS.heartRate.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'نبضات قلب مرتفعة' : 'High heart rate',
                    advice: isArabic ? 'استشر طبيبك إذا كان النبض مرتفعاً باستمرار' : 'Consult your doctor if heart rate remains high'
                });
            } else if (heartRate < VALIDATION_LIMITS.heartRate.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'نبضات قلب منخفضة' : 'Low heart rate',
                    advice: isArabic ? 'استشر طبيبك إذا كان النبض منخفضاً باستمرار' : 'Consult your doctor if heart rate remains low'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: isArabic ? 'نبضات قلب طبيعية' : 'Normal heart rate',
                    advice: isArabic ? 'حافظ على نشاطك البدني المنتظم' : 'Maintain regular physical activity'
                });
            }
        }
        
        if (formData.spo2 && formData.spo2.trim() !== '') {
            const spo2 = parseInt(formData.spo2);
            if (spo2 < VALIDATION_LIMITS.spo2.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: isArabic ? 'نسبة أكسجين منخفضة' : 'Low oxygen level',
                    advice: isArabic ? 'استشر طبيبك فوراً إذا كانت النسبة أقل من 90%' : 'Consult your doctor immediately if below 90%'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: isArabic ? 'نسبة أكسجين طبيعية' : 'Normal oxygen level',
                    advice: isArabic ? 'حافظ على تهوية جيدة ومارس تمارين التنفس' : 'Maintain good ventilation and practice breathing exercises'
                });
            }
        }
        
        return indicators;
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const healthIndicators = calculateHealthIndicators();

    return (
        <div className="analytics-container">
            {/* رأس النموذج */}
            <div className="analytics-header">
                <h2>{isArabic ? 'إضافة قياس صحي' : 'Add Health Reading'}</h2>
                <div className="header-controls" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <label className="auto-save-toggle" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <span className="toggle-slider" style={{
                            width: '40px',
                            height: '20px',
                            background: autoSave ? 'var(--success)' : 'var(--border-light)',
                            borderRadius: '20px',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}>
                            <span style={{
                                position: 'absolute',
                                width: '16px',
                                height: '16px',
                                background: 'white',
                                borderRadius: '50%',
                                top: '2px',
                                left: autoSave ? '22px' : '2px',
                                transition: 'all var(--transition-fast)'
                            }}></span>
                        </span>
                        <span className="stat-label">{isArabic ? 'حفظ تلقائي' : 'Auto Save'}</span>
                    </label>
                    {lastAutoSave && (
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <span>💾</span>
                            <span>{lastAutoSave.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US')}</span>
                        </div>
                    )}
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* شبكة حقول الإدخال */}
                <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    
                    {/* الوزن */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'الوزن' : 'Weight'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                placeholder={isArabic ? 'مثال: 70.5' : 'Example: 70.5'}
                                className={`search-input ${validationErrors.weight ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                {isArabic ? 'كجم' : 'kg'}
                            </span>
                        </div>
                        {validationErrors.weight && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.weight}
                            </div>
                        )}
                    </div>

                    {/* الضغط الانقباضي */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'الضغط الانقباضي' : 'Systolic'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.systolic}
                                onChange={(e) => handleInputChange('systolic', e.target.value)}
                                placeholder={isArabic ? 'مثال: 120' : 'Example: 120'}
                                className={`search-input ${validationErrors.systolic ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mmHg
                            </span>
                        </div>
                        {validationErrors.systolic && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.systolic}
                            </div>
                        )}
                    </div>

                    {/* الضغط الانبساطي */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'الضغط الانبساطي' : 'Diastolic'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.diastolic}
                                onChange={(e) => handleInputChange('diastolic', e.target.value)}
                                placeholder={isArabic ? 'مثال: 80' : 'Example: 80'}
                                className={`search-input ${validationErrors.diastolic ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mmHg
                            </span>
                        </div>
                        {validationErrors.diastolic && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.diastolic}
                            </div>
                        )}
                    </div>

                    {/* الجلوكوز */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'سكر الدم' : 'Blood Glucose'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.glucose}
                                onChange={(e) => handleInputChange('glucose', e.target.value)}
                                placeholder={isArabic ? 'مثال: 95' : 'Example: 95'}
                                className={`search-input ${validationErrors.glucose ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mg/dL
                            </span>
                        </div>
                        {validationErrors.glucose && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.glucose}
                            </div>
                        )}
                    </div>

                    {/* نبضات القلب */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'نبضات القلب' : 'Heart Rate'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.heartRate}
                                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                                placeholder={isArabic ? 'مثال: 75' : 'Example: 75'}
                                className={`search-input ${validationErrors.heartRate ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                BPM
                            </span>
                        </div>
                        {validationErrors.heartRate && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.heartRate}
                            </div>
                        )}
                        <small className="field-hint" style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                            {isArabic ? 'المعدل الطبيعي: 60-100 نبضة في الدقيقة' : 'Normal range: 60-100 BPM'}
                        </small>
                    </div>

                    {/* نسبة الأكسجين */}
                    <div className="field-group">
                        <label className="stat-label">{isArabic ? 'نسبة الأكسجين' : 'Oxygen Level'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.spo2}
                                onChange={(e) => handleInputChange('spo2', e.target.value)}
                                placeholder={isArabic ? 'مثال: 98' : 'Example: 98'}
                                className={`search-input ${validationErrors.spo2 ? 'error' : ''}`}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                %
                            </span>
                        </div>
                        {validationErrors.spo2 && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ⚠️ {validationErrors.spo2}
                            </div>
                        )}
                        <small className="field-hint" style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                            {isArabic ? 'المعدل الطبيعي: 95% - 100%' : 'Normal range: 95% - 100%'}
                        </small>
                    </div>
                </div>

                {/* مؤشرات الصحة */}
                {healthIndicators.length > 0 && (
                    <div className="recommendations-section">
                        <div className="rec-header">
                            <span className="rec-icon">💡</span>
                            <span className="rec-category">{isArabic ? 'مؤشرات صحية' : 'Health Indicators'}</span>
                        </div>
                        <div className="recommendations-list">
                            {healthIndicators.map((indicator, index) => (
                                <div key={index} className={`recommendation-card priority-${indicator.type === 'warning' ? 'high' : 'low'}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">{indicator.icon}</span>
                                        <span className="rec-category">{indicator.message}</span>
                                    </div>
                                    <div className="rec-advice">{indicator.advice}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* أزرار الإجراء */}
                <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="type-btn"
                        disabled={loading}
                        style={{ flex: 1 }}
                    >
                        {isArabic ? 'مسح النموذج' : 'Clear Form'}
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="type-btn active"
                        style={{ flex: 1 }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                {isArabic ? 'جاري الحفظ...' : 'Saving...'}
                            </>
                        ) : (
                            <>{isArabic ? 'حفظ' : 'Save'}</>
                        )}
                    </button>
                </div>
            </form>

            {/* رسائل التغذية الراجعة */}
            {message && (
                <div className={`notification-message ${messageType}`} style={{
                    position: 'fixed',
                    bottom: 'var(--spacing-lg)',
                    right: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderRadius: 'var(--radius-lg)',
                    background: messageType === 'success' ? 'var(--success)' : messageType === 'error' ? 'var(--error)' : 'var(--info)',
                    color: 'white',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)'
                }}>
                    <span>
                        {messageType === 'success' && '✅'}
                        {messageType === 'error' && '❌'}
                        {messageType === 'info' && 'ℹ️'}
                    </span>
                    <span>{message}</span>
                    <button onClick={() => { setMessage(''); setMessageType(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <style>{`
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    display: inline-block;
                    animation: spin 0.8s linear infinite;
                    margin-right: var(--spacing-sm);
                }

                /* ✅ تم إزالة .lang-btn styles */

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                [dir="rtl"] .input-unit {
                    right: auto;
                    left: 1rem;
                }

                @media (max-width: 768px) {
                    .notification-message {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
                        bottom: var(--spacing-md);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .spinner {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default HealthForm;