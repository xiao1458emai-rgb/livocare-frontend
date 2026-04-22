// src/components/HealthForm.jsx
'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

function HealthForm({ onDataSubmitted }) {
    const { t, i18n } = useTranslation();
    
    // useRef لمنع التحديثات المتكررة
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
            const hasData = Object.values(formData).some(value => value.trim() !== '');
            if (hasData && isMountedRef.current) {
                localStorage.setItem('healthForm_autoSave', JSON.stringify(formData));
                setLastAutoSave(new Date());
                console.log('💾 Auto-saved health form');
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
                setMessage(t('health.form.autoRestored'));
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
    }, [t]);

    // دالة التحقق
    const validateForm = () => {
        let errors = {};
        let hasAnyData = false;

        if (formData.weight && formData.weight.trim() !== '') {
            hasAnyData = true;
            const weight = parseFloat(formData.weight);
            if (isNaN(weight)) {
                errors.weight = t('health.form.errors.invalidNumber');
            } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
                errors.weight = t('health.form.errors.range', VALIDATION_LIMITS.weight);
            }
        }

        if (formData.systolic && formData.systolic.trim() !== '') {
            hasAnyData = true;
            const systolic = parseInt(formData.systolic);
            if (isNaN(systolic)) {
                errors.systolic = t('health.form.errors.invalidNumber');
            } else if (systolic < VALIDATION_LIMITS.systolic.min || systolic > VALIDATION_LIMITS.systolic.max) {
                errors.systolic = t('health.form.errors.range', VALIDATION_LIMITS.systolic);
            }
        }

        if (formData.diastolic && formData.diastolic.trim() !== '') {
            hasAnyData = true;
            const diastolic = parseInt(formData.diastolic);
            if (isNaN(diastolic)) {
                errors.diastolic = t('health.form.errors.invalidNumber');
            } else if (diastolic < VALIDATION_LIMITS.diastolic.min || diastolic > VALIDATION_LIMITS.diastolic.max) {
                errors.diastolic = t('health.form.errors.range', VALIDATION_LIMITS.diastolic);
            }
            if (formData.systolic && formData.systolic.trim() !== '') {
                const systolic = parseInt(formData.systolic);
                if (!isNaN(systolic) && !isNaN(diastolic) && systolic <= diastolic) {
                    errors.diastolic = t('health.form.errors.systolicGreater');
                }
            }
        }

        if (formData.glucose && formData.glucose.trim() !== '') {
            hasAnyData = true;
            const glucose = parseFloat(formData.glucose);
            if (isNaN(glucose)) {
                errors.glucose = t('health.form.errors.invalidNumber');
            } else if (glucose < VALIDATION_LIMITS.glucose.min || glucose > VALIDATION_LIMITS.glucose.max) {
                errors.glucose = t('health.form.errors.range', VALIDATION_LIMITS.glucose);
            }
        }

        if (formData.heartRate && formData.heartRate.trim() !== '') {
            hasAnyData = true;
            const heartRate = parseInt(formData.heartRate);
            if (isNaN(heartRate)) {
                errors.heartRate = t('health.form.errors.invalidNumber');
            } else if (heartRate < VALIDATION_LIMITS.heartRate.min || heartRate > VALIDATION_LIMITS.heartRate.max) {
                errors.heartRate = t('health.form.errors.range', VALIDATION_LIMITS.heartRate);
            }
        }

        if (formData.spo2 && formData.spo2.trim() !== '') {
            hasAnyData = true;
            const spo2 = parseInt(formData.spo2);
            if (isNaN(spo2)) {
                errors.spo2 = t('health.form.errors.invalidNumber');
            } else if (spo2 < VALIDATION_LIMITS.spo2.min || spo2 > VALIDATION_LIMITS.spo2.max) {
                errors.spo2 = t('health.form.errors.range', VALIDATION_LIMITS.spo2);
            }
        }

        if (!hasAnyData) {
            errors._general = t('health.form.errors.noData');
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
        setMessage(t('health.form.formCleared'));
        setMessageType('info');
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current || !isMountedRef.current) return;
        
        if (!validateForm()) {
            setMessage(t('health.form.correctErrors'));
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

        console.log('📤 Sending health data:', data);

        try {
            const response = await axiosInstance.post('/health_status/', data);
            
            console.log('✅ Server response:', response.data);
            
            if (isMountedRef.current) {
                setMessage(t('health.form.submissionSuccess'));
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
            
            let errorMessage = t('health.form.submissionError');
            
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
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
            } else if (err.response?.status === 401) {
                errorMessage = t('health.form.sessionExpired');
            } else if (err.response?.status === 500) {
                errorMessage = t('health.form.serverError');
            } else if (err.code === 'ERR_NETWORK') {
                errorMessage = '❌ Network error: Cannot connect to server';
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
            isSubmittingRef.current = false;
        }
    }, [formData, t, onDataSubmitted]);

    const calculateHealthIndicators = () => {
        const indicators = [];
        
        if (formData.weight) {
            const weight = parseFloat(formData.weight);
            if (weight > VALIDATION_LIMITS.weight.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: t('health.form.indicators.weightHigh'),
                    advice: t('health.form.advice.weightHigh')
                });
            } else if (weight < VALIDATION_LIMITS.weight.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚡',
                    message: t('health.form.indicators.weightLow'),
                    advice: t('health.form.advice.weightLow')
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: t('health.form.indicators.weightNormal'),
                    advice: t('health.form.advice.weightNormal')
                });
            }
        }
        
        if (formData.systolic && formData.diastolic) {
            const systolic = parseInt(formData.systolic);
            const diastolic = parseInt(formData.diastolic);
            
            if (systolic > VALIDATION_LIMITS.systolic.normalMax || diastolic > VALIDATION_LIMITS.diastolic.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '❤️',
                    message: t('health.form.indicators.bpHigh'),
                    advice: t('health.form.advice.bpHigh')
                });
            } else if (systolic < VALIDATION_LIMITS.systolic.normalMin || diastolic < VALIDATION_LIMITS.diastolic.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '💓',
                    message: t('health.form.indicators.bpLow'),
                    advice: t('health.form.advice.bpLow')
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: t('health.form.indicators.bpNormal'),
                    advice: t('health.form.advice.bpNormal')
                });
            }
        }
        
        if (formData.glucose) {
            const glucose = parseFloat(formData.glucose);
            if (glucose > VALIDATION_LIMITS.glucose.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '🩸',
                    message: t('health.form.indicators.glucoseHigh'),
                    advice: t('health.form.advice.glucoseHigh')
                });
            } else if (glucose < VALIDATION_LIMITS.glucose.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '⚡',
                    message: t('health.form.indicators.glucoseLow'),
                    advice: t('health.form.advice.glucoseLow')
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: t('health.form.indicators.glucoseNormal'),
                    advice: t('health.form.advice.glucoseNormal')
                });
            }
        }
        
        if (formData.heartRate) {
            const heartRate = parseInt(formData.heartRate);
            if (heartRate > VALIDATION_LIMITS.heartRate.normalMax) {
                indicators.push({
                    type: 'warning',
                    icon: '❤️',
                    message: t('health.form.indicators.heartRateHigh') || '⚠️ نبضات قلب مرتفعة',
                    advice: t('health.form.advice.heartRateHigh') || 'استشر طبيبك إذا كان النبض مرتفعاً باستمرار'
                });
            } else if (heartRate < VALIDATION_LIMITS.heartRate.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '💓',
                    message: t('health.form.indicators.heartRateLow') || '⚠️ نبضات قلب منخفضة',
                    advice: t('health.form.advice.heartRateLow') || 'استشر طبيبك إذا كان النبض منخفضاً باستمرار'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: t('health.form.indicators.heartRateNormal') || '✅ نبضات قلب طبيعية',
                    advice: t('health.form.advice.heartRateNormal') || 'حافظ على نشاطك البدني المنتظم'
                });
            }
        }
        
        if (formData.spo2) {
            const spo2 = parseInt(formData.spo2);
            if (spo2 < VALIDATION_LIMITS.spo2.normalMin) {
                indicators.push({
                    type: 'warning',
                    icon: '💨',
                    message: t('health.form.indicators.spo2Low') || '⚠️ نسبة أكسجين منخفضة',
                    advice: t('health.form.advice.spo2Low') || 'استشر طبيبك فوراً إذا كانت النسبة أقل من 90%'
                });
            } else {
                indicators.push({
                    type: 'success',
                    icon: '✅',
                    message: t('health.form.indicators.spo2Normal') || '✅ نسبة أكسجين طبيعية',
                    advice: t('health.form.advice.spo2Normal') || 'حافظ على تهوية جيدة ومارس تمارين التنفس'
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
                <h2>
                    <span>❤️</span>
                    {t('health.form.title')}
                </h2>
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
                        <span className="stat-label">{t('health.form.autoSave')}</span>
                    </label>
                    {lastAutoSave && (
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <span>💾</span>
                            <span>{lastAutoSave.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* شبكة حقول الإدخال */}
                <div className="analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {/* الوزن */}
                    <div className="field-group">
                        <label className="stat-label">⚖️ {t('health.form.weight')}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                placeholder={t('health.form.weightPlaceholder')}
                                className={`search-input ${validationErrors.weight ? 'error' : ''}`}
                                style={validationErrors.weight ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                {t('health.form.kg')}
                            </span>
                        </div>
                        {validationErrors.weight && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.weight}
                            </div>
                        )}
                    </div>

                    {/* الضغط الانقباضي */}
                    <div className="field-group">
                        <label className="stat-label">❤️ {t('health.form.systolic')}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.systolic}
                                onChange={(e) => handleInputChange('systolic', e.target.value)}
                                placeholder={t('health.form.systolicPlaceholder')}
                                className={`search-input ${validationErrors.systolic ? 'error' : ''}`}
                                style={validationErrors.systolic ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mmHg
                            </span>
                        </div>
                        {validationErrors.systolic && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.systolic}
                            </div>
                        )}
                    </div>

                    {/* الضغط الانبساطي */}
                    <div className="field-group">
                        <label className="stat-label">💓 {t('health.form.diastolic')}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.diastolic}
                                onChange={(e) => handleInputChange('diastolic', e.target.value)}
                                placeholder={t('health.form.diastolicPlaceholder')}
                                className={`search-input ${validationErrors.diastolic ? 'error' : ''}`}
                                style={validationErrors.diastolic ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mmHg
                            </span>
                        </div>
                        {validationErrors.diastolic && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.diastolic}
                            </div>
                        )}
                    </div>

                    {/* الجلوكوز */}
                    <div className="field-group">
                        <label className="stat-label">🩸 {t('health.form.glucose')}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.glucose}
                                onChange={(e) => handleInputChange('glucose', e.target.value)}
                                placeholder={t('health.form.glucosePlaceholder')}
                                className={`search-input ${validationErrors.glucose ? 'error' : ''}`}
                                style={validationErrors.glucose ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                mg/dL
                            </span>
                        </div>
                        {validationErrors.glucose && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.glucose}
                            </div>
                        )}
                    </div>

                    {/* نبضات القلب */}
                    <div className="field-group">
                        <label className="stat-label">❤️ {t('health.form.heartRate') || 'نبضات القلب'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.heartRate}
                                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                                placeholder={t('health.form.heartRatePlaceholder') || '60-100 BPM'}
                                className={`search-input ${validationErrors.heartRate ? 'error' : ''}`}
                                style={validationErrors.heartRate ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                BPM
                            </span>
                        </div>
                        {validationErrors.heartRate && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.heartRate}
                            </div>
                        )}
                        <small className="field-hint" style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                            {t('health.form.heartRateHint') || 'المعدل الطبيعي: 60-100 نبضة في الدقيقة'}
                        </small>
                    </div>

                    {/* نسبة الأكسجين */}
                    <div className="field-group">
                        <label className="stat-label">💨 {t('health.form.spo2') || 'نسبة الأكسجين'}</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={formData.spo2}
                                onChange={(e) => handleInputChange('spo2', e.target.value)}
                                placeholder={t('health.form.spo2Placeholder') || '95-100%'}
                                className={`search-input ${validationErrors.spo2 ? 'error' : ''}`}
                                style={validationErrors.spo2 ? { borderColor: 'var(--error)' } : {}}
                            />
                            <span className="input-unit" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                %
                            </span>
                        </div>
                        {validationErrors.spo2 && (
                            <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
                                ❌ {validationErrors.spo2}
                            </div>
                        )}
                        <small className="field-hint" style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                            {t('health.form.spo2Hint') || 'المعدل الطبيعي: 95% - 100%'}
                        </small>
                    </div>
                </div>

                {/* مؤشرات الصحة */}
                {healthIndicators.length > 0 && (
                    <div className="recommendations-section">
                        <div className="rec-header">
                            <span className="rec-icon">💡</span>
                            <span className="rec-category">{t('health.form.healthIndicators')}</span>
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
                        🔄 {t('health.form.reset')}
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="type-btn active"
                        style={{ flex: 1 }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                {t('health.form.saving')}
                            </>
                        ) : (
                            <>💾 {t('health.form.save')}</>
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

            {/* الأنماط الإضافية */}
            <style>{`
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    display: inline-block;
                    animation: spin 0.8s linear infinite;
                }

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
                    
                    [dir="rtl"] .notification-message {
                        left: var(--spacing-md);
                        right: var(--spacing-md);
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