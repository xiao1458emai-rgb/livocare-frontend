// src/components/HealthForm.jsx
'use client'
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';
function HealthForm({ onDataSubmitted }) {
    const { t, i18n } = useTranslation();
    const [darkMode, setDarkMode] = useState(false);
    
    const [formData, setFormData] = useState({
        weight: '',
        systolic: '',
        diastolic: '',
        glucose: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
    }, []);

    // استمع لتغييرات الوضع المظلم
    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    // حدود التحقق من الصحة
    const VALIDATION_LIMITS = {
        weight: { min: 20, max: 300, normalMin: 50, normalMax: 100 },
        systolic: { min: 50, max: 250, normalMin: 90, normalMax: 140 },
        diastolic: { min: 30, max: 180, normalMin: 60, normalMax: 90 },
        glucose: { min: 30, max: 600, normalMin: 70, normalMax: 140 }
    };

    // الحفظ التلقائي
    useEffect(() => {
        if (!autoSave) return;

        const autoSaveForm = () => {
            const hasData = Object.values(formData).some(value => value.trim() !== '');
            if (hasData) {
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
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setFormData(parsedData);
                setMessage(t('health.form.autoRestored'));
                setMessageType('info');
                setTimeout(() => {
                    setMessage('');
                    setMessageType('');
                }, 3000);
            } catch (error) {
                console.error('Error loading auto-saved data:', error);
            }
        }
    }, [t]);

    // دالة التحقق من القيم
    const validateForm = () => {
        let errors = {};
        let isValid = true;

        // تحقق من الوزن
        const weight = parseFloat(formData.weight);
        if (!formData.weight || isNaN(weight)) {
            errors.weight = t('health.form.errors.required');
            isValid = false;
        } else if (weight < VALIDATION_LIMITS.weight.min || weight > VALIDATION_LIMITS.weight.max) {
            errors.weight = t('health.form.errors.range', VALIDATION_LIMITS.weight);
            isValid = false;
        }

        // تحقق من الضغط الانقباضي
        const systolic = parseInt(formData.systolic);
        if (!formData.systolic || isNaN(systolic)) {
            errors.systolic = t('health.form.errors.required');
            isValid = false;
        } else if (systolic < VALIDATION_LIMITS.systolic.min || systolic > VALIDATION_LIMITS.systolic.max) {
            errors.systolic = t('health.form.errors.range', VALIDATION_LIMITS.systolic);
            isValid = false;
        }

        // تحقق من الضغط الانبساطي
        const diastolic = parseInt(formData.diastolic);
        if (!formData.diastolic || isNaN(diastolic)) {
            errors.diastolic = t('health.form.errors.required');
            isValid = false;
        } else if (diastolic < VALIDATION_LIMITS.diastolic.min || diastolic > VALIDATION_LIMITS.diastolic.max) {
            errors.diastolic = t('health.form.errors.range', VALIDATION_LIMITS.diastolic);
            isValid = false;
        } else if (systolic <= diastolic) {
            errors.diastolic = t('health.form.errors.systolicGreater');
            isValid = false;
        }

        // تحقق من الجلوكوز
        const glucose = parseFloat(formData.glucose);
        if (!formData.glucose || isNaN(glucose)) {
            errors.glucose = t('health.form.errors.required');
            isValid = false;
        } else if (glucose < VALIDATION_LIMITS.glucose.min || glucose > VALIDATION_LIMITS.glucose.max) {
            errors.glucose = t('health.form.errors.range', VALIDATION_LIMITS.glucose);
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    // مسح الرسالة تلقائياً
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // معالجة تغيير الحقول
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // مسح خطأ هذا الحقل عند البدء بالكتابة
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // إعادة تعيين النموذج
    const resetForm = () => {
        setFormData({
            weight: '',
            systolic: '',
            diastolic: '',
            glucose: ''
        });
        setValidationErrors({});
        localStorage.removeItem('healthForm_autoSave');
        setMessage(t('health.form.formCleared'));
        setMessageType('info');
    };

    // دالة الإرسال
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setMessage(t('health.form.correctErrors'));
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('');
        setMessageType('');

        const data = {
            weight_kg: parseFloat(formData.weight),
            systolic_pressure: parseInt(formData.systolic),
            diastolic_pressure: parseInt(formData.diastolic),
            blood_glucose: parseFloat(formData.glucose),
        };

        try {
            await axiosInstance.post('/health_status/', data);
            
            setMessage(t('health.form.submissionSuccess'));
            setMessageType('success');
            
            // مسح النموذج والبيانات المحفوظة
            resetForm();
            localStorage.removeItem('healthForm_autoSave');
            
            if (onDataSubmitted) {
                onDataSubmitted();
            }

        } catch (err) {
            console.error('Submission failed:', err);
            
            let errorMessage = t('health.form.submissionError');
            
            if (err.response?.status === 400) {
                if (err.response.data?.weight_kg) {
                    errorMessage = t('health.form.errors.invalidWeight');
                } else if (err.response.data?.systolic_pressure) {
                    errorMessage = t('health.form.errors.invalidSystolic');
                } else if (err.response.data?.diastolic_pressure) {
                    errorMessage = t('health.form.errors.invalidDiastolic');
                } else if (err.response.data?.blood_glucose) {
                    errorMessage = t('health.form.errors.invalidGlucose');
                }
            } else if (err.response?.status === 401) {
                errorMessage = t('health.form.sessionExpired');
            } else if (err.response?.status === 500) {
                errorMessage = t('health.form.serverError');
            }
            
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // حساب مؤشرات الصحة
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
        
        return indicators;
    };

    const healthIndicators = calculateHealthIndicators();

    return (
        <div className={`health-form-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس النموذج */}
            <div className="form-header">
                <div className="header-icon-wrapper">
                    <div className="header-icon">❤️</div>
                </div>
                <div className="header-content">
                    <h3>{t('health.form.title')}</h3>
                    <p className="header-subtitle">{t('health.form.subtitle')}</p>
                    <div className="header-controls">
                        <label className={`auto-save-toggle ${autoSave ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={autoSave}
                                onChange={(e) => setAutoSave(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">{t('health.form.autoSave')}</span>
                        </label>
                        {lastAutoSave && (
                            <div className="last-save">
                                <span className="save-icon">💾</span>
                                <span className="save-time">
                                    {lastAutoSave.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="health-form">
                {/* شبكة حقول الإدخال */}
                <div className="form-grid">
                    {/* حقل الوزن */}
                    <div className="input-group">
                        <label htmlFor="weight">
                            <span className="field-icon">⚖️</span>
                            <span className="field-label">{t('health.form.weight')}</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                id="weight"
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => handleInputChange('weight', e.target.value)}
                                required
                                placeholder={t('health.form.weightPlaceholder')}
                                className={validationErrors.weight ? 'error' : ''}
                            />
                            <span className="input-unit">{t('health.form.kg')}</span>
                        </div>
                        {validationErrors.weight && (
                            <div className="error-message">
                                <span className="error-icon">❌</span>
                                <span className="error-text">{validationErrors.weight}</span>
                            </div>
                        )}
                    </div>

                    {/* حقل الضغط الانقباضي */}
                    <div className="input-group">
                        <label htmlFor="systolic">
                            <span className="field-icon">❤️</span>
                            <span className="field-label">{t('health.form.systolic')}</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                id="systolic"
                                type="number"
                                value={formData.systolic}
                                onChange={(e) => handleInputChange('systolic', e.target.value)}
                                required
                                placeholder={t('health.form.systolicPlaceholder')}
                                className={validationErrors.systolic ? 'error' : ''}
                            />
                            <span className="input-unit">mmHg</span>
                        </div>
                        {validationErrors.systolic && (
                            <div className="error-message">
                                <span className="error-icon">❌</span>
                                <span className="error-text">{validationErrors.systolic}</span>
                            </div>
                        )}
                    </div>

                    {/* حقل الضغط الانبساطي */}
                    <div className="input-group">
                        <label htmlFor="diastolic">
                            <span className="field-icon">💓</span>
                            <span className="field-label">{t('health.form.diastolic')}</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                id="diastolic"
                                type="number"
                                value={formData.diastolic}
                                onChange={(e) => handleInputChange('diastolic', e.target.value)}
                                required
                                placeholder={t('health.form.diastolicPlaceholder')}
                                className={validationErrors.diastolic ? 'error' : ''}
                            />
                            <span className="input-unit">mmHg</span>
                        </div>
                        {validationErrors.diastolic && (
                            <div className="error-message">
                                <span className="error-icon">❌</span>
                                <span className="error-text">{validationErrors.diastolic}</span>
                            </div>
                        )}
                    </div>

                    {/* حقل الجلوكوز */}
                    <div className="input-group">
                        <label htmlFor="glucose">
                            <span className="field-icon">🩸</span>
                            <span className="field-label">{t('health.form.glucose')}</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                id="glucose"
                                type="number"
                                step="0.1"
                                value={formData.glucose}
                                onChange={(e) => handleInputChange('glucose', e.target.value)}
                                required
                                placeholder={t('health.form.glucosePlaceholder')}
                                className={validationErrors.glucose ? 'error' : ''}
                            />
                            <span className="input-unit">{t('health.form.mgdl')}</span>
                        </div>
                        {validationErrors.glucose && (
                            <div className="error-message">
                                <span className="error-icon">❌</span>
                                <span className="error-text">{validationErrors.glucose}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* مؤشرات الصحة */}
                {healthIndicators.length > 0 && (
                    <div className="health-indicators">
                        <div className="indicators-header">
                            <span className="indicators-icon">💡</span>
                            <h4>{t('health.form.healthIndicators')}</h4>
                        </div>
                        <div className="indicators-list">
                            {healthIndicators.map((indicator, index) => (
                                <div key={index} className={`indicator-item ${indicator.type}`}>
                                    <div className="indicator-header">
                                        <span className="indicator-icon">{indicator.icon}</span>
                                        <span className="indicator-message">{indicator.message}</span>
                                    </div>
                                    <p className="indicator-advice">{indicator.advice}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* أزرار الإجراء */}
                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="reset-button"
                        disabled={loading}
                    >
                        <span className="button-icon">🔄</span>
                        <span className="button-text">{t('health.form.reset')}</span>
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="submit-button"
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                <span className="button-text">{t('health.form.saving')}</span>
                            </>
                        ) : (
                            <>
                                <span className="button-icon">💾</span>
                                <span className="button-text">{t('health.form.save')}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* رسائل التغذية الراجعة */}
            {message && (
                <div className={`message ${messageType}`}>
                    <div className="message-content">
                        <span className="message-icon">
                            {messageType === 'success' && '✅'}
                            {messageType === 'error' && '❌'}
                            {messageType === 'info' && 'ℹ️'}
                        </span>
                        <span className="message-text">{message}</span>
                    </div>
                    <button 
                        onClick={() => {
                            setMessage('');
                            setMessageType('');
                        }}
                        className="dismiss-message"
                        aria-label={t('common.close')}
                    >
                        ✕
                    </button>
                </div>
            )}

            <style jsx>{`
 /* ===========================================
   HealthForm.css - محسن للجوال والشاشات الكبيرة
   =========================================== */

/* الثيم الفاتح */
:root {
    --primary-bg: #ffffff;
    --secondary-bg: #f8fafc;
    --tertiary-bg: #f1f5f9;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #64748b;
    --border-light: #e2e8f0;
    --border-medium: #cbd5e1;
    --primary-color: #3b82f6;
    --primary-dark: #2563eb;
    --primary-light: #60a5fa;
    --success-color: #10b981;
    --success-bg: #d1fae5;
    --success-border: #a7f3d0;
    --warning-color: #f59e0b;
    --warning-bg: #fef3c7;
    --warning-border: #fde68a;
    --error-color: #ef4444;
    --error-bg: #fee2e2;
    --error-border: #fecaca;
    --info-color: #3b82f6;
    --info-bg: #dbeafe;
    --info-border: #bfdbfe;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --transition-slow: 0.5s ease;
}

/* الثيم المظلم */
.dark-mode {
    --primary-bg: #0f172a;
    --secondary-bg: #1e293b;
    --tertiary-bg: #334155;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-light: #334155;
    --border-medium: #475569;
    --primary-color: #60a5fa;
    --primary-dark: #3b82f6;
    --primary-light: #93c5fd;
    --success-color: #4ade80;
    --success-bg: rgba(16, 185, 129, 0.2);
    --success-border: rgba(16, 185, 129, 0.3);
    --warning-color: #fbbf24;
    --warning-bg: rgba(245, 158, 11, 0.2);
    --warning-border: rgba(245, 158, 11, 0.3);
    --error-color: #f87171;
    --error-bg: rgba(239, 68, 68, 0.2);
    --error-border: rgba(239, 68, 68, 0.3);
    --info-color: #60a5fa;
    --info-bg: rgba(59, 130, 246, 0.2);
    --info-border: rgba(59, 130, 246, 0.3);
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5);
}

.health-form-container {
    background: var(--card-bg);
    border-radius: 28px;
    padding: 2rem;
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border-light);
    transition: all var(--transition-medium);
    margin-bottom: 1.5rem;
    position: relative;
    overflow: hidden;
}

.health-form-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient-primary);
}

/* ===========================================
   رأس النموذج
   =========================================== */
.form-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-light);
    flex-wrap: wrap;
}

.header-icon-wrapper {
    width: 70px;
    height: 70px;
    background: var(--gradient-primary);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: float 3s infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
}

.header-icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}

.header-content {
    flex: 1;
}

.header-content h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.6rem;
    font-weight: 700;
}

.header-subtitle {
    margin: 0.25rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
}

.auto-save-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem;
    transition: all var(--transition-fast);
}

.auto-save-toggle:active {
    transform: scale(0.96);
}

.auto-save-toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    width: 40px;
    height: 20px;
    background: var(--border-light);
    border-radius: 20px;
    position: relative;
    transition: all var(--transition-fast);
}

.toggle-slider::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
}

input:checked + .toggle-slider {
    background: var(--success-color);
}

input:checked + .toggle-slider::before {
    transform: translateX(20px);
}

.toggle-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.last-save {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background: var(--secondary-bg);
    border-radius: 50px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    border: 1px solid var(--border-light);
}

.save-icon {
    font-size: 0.85rem;
}

/* ===========================================
   شبكة الحقول
   =========================================== */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.9rem;
}

.field-icon {
    font-size: 1.1rem;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-wrapper input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 70px;
    background: var(--secondary-bg);
    color: var(--text-primary);
    border: 2px solid var(--border-light);
    border-radius: 12px;
    font-size: 1rem;
    transition: all var(--transition-fast);
}

.input-wrapper input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.input-wrapper input.error {
    border-color: var(--error-color);
}

.input-unit {
    position: absolute;
    right: 1rem;
    color: var(--text-tertiary);
    font-size: 0.85rem;
    font-weight: 600;
    background: var(--card-bg);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--border-light);
}

.error-message {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;
    color: var(--error-color);
    font-size: 0.8rem;
    animation: slideIn 0.2s ease;
}

.error-icon {
    font-size: 0.85rem;
}

/* ===========================================
   مؤشرات الصحة
   =========================================== */
.health-indicators {
    background: var(--secondary-bg);
    border-radius: 18px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-light);
}

.indicators-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.indicators-icon {
    font-size: 1.2rem;
}

.indicators-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
}

.indicators-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.indicator-item {
    padding: 0.75rem 1rem;
    border-radius: 12px;
    border-left: 4px solid;
    transition: all var(--transition-fast);
    background: var(--card-bg);
}

.indicator-item:active {
    transform: scale(0.98);
}

.indicator-item:hover {
    transform: translateX(5px);
}

.indicator-item.success {
    border-left-color: var(--success-color);
    background: var(--success-bg);
}

.indicator-item.warning {
    border-left-color: var(--warning-color);
    background: var(--warning-bg);
}

.indicator-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.indicator-icon {
    font-size: 1rem;
}

.indicator-message {
    font-weight: 600;
    font-size: 0.9rem;
}

.indicator-item.success .indicator-message {
    color: var(--success-color);
}

.indicator-item.warning .indicator-message {
    color: var(--warning-color);
}

.indicator-advice {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
}

/* ===========================================
   أزرار الإجراء
   =========================================== */
.form-actions {
    display: flex;
    gap: 1rem;
}

.reset-button, .submit-button {
    flex: 1;
    padding: 0.875rem;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all var(--transition-medium);
}

.reset-button:active, .submit-button:active {
    transform: scale(0.96);
}

.reset-button {
    background: var(--secondary-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}

.reset-button:hover:not(:disabled) {
    background: var(--error-bg);
    color: var(--error-color);
    transform: translateY(-2px);
}

.submit-button {
    background: var(--gradient-primary);
    color: white;
}

.submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.reset-button:disabled, .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===========================================
   الرسائل
   =========================================== */
.message {
    margin-top: 1.5rem;
    padding: 0.875rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    animation: slideIn 0.3s ease;
}

.message.success {
    background: var(--success-bg);
    color: var(--success-color);
    border: 1px solid var(--success-border);
}

.message.error {
    background: var(--error-bg);
    color: var(--error-color);
    border: 1px solid var(--error-border);
}

.message.info {
    background: var(--info-bg);
    color: var(--info-color);
    border: 1px solid var(--info-border);
}

.message-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.message-icon {
    font-size: 1rem;
}

.dismiss-message {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
}

.dismiss-message:active {
    transform: scale(0.9);
}

.dismiss-message:hover {
    background: rgba(0, 0, 0, 0.1);
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===========================================
   RTL دعم
   =========================================== */
[dir="rtl"] .input-unit {
    right: auto;
    left: 1rem;
}

[dir="rtl"] .input-wrapper input {
    padding-right: 1rem;
    padding-left: 70px;
}

[dir="rtl"] .indicator-item {
    border-left: none;
    border-right: 4px solid;
}

[dir="rtl"] .indicator-item:hover {
    transform: translateX(-5px);
}

[dir="rtl"] .header-icon-wrapper {
    margin-left: 1rem;
    margin-right: 0;
}

[dir="rtl"] .form-header {
    flex-direction: row-reverse;
}

[dir="rtl"] .header-controls {
    flex-direction: row-reverse;
}

[dir="rtl"] input:checked + .toggle-slider::before {
    transform: translateX(-20px);
}

[dir="rtl"] .message-content {
    flex-direction: row-reverse;
}

/* ===========================================
   تصميم متجاوب
   =========================================== */
@media (max-width: 768px) {
    .health-form-container {
        padding: 1.25rem;
        border-radius: 20px;
    }

    .form-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
    }

    .header-icon-wrapper {
        width: 60px;
        height: 60px;
    }

    .header-icon {
        font-size: 2rem;
    }

    .header-content h3 {
        font-size: 1.3rem;
    }

    .form-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .form-actions {
        flex-direction: column;
        gap: 0.75rem;
    }

    .reset-button, .submit-button {
        width: 100%;
    }

    .header-controls {
        justify-content: center;
    }

    .health-indicators {
        padding: 1rem;
    }

    .indicator-item {
        padding: 0.6rem 0.8rem;
    }

    .indicator-message {
        font-size: 0.85rem;
    }

    .indicator-advice {
        font-size: 0.8rem;
    }
}

@media (max-width: 480px) {
    .health-form-container {
        padding: 1rem;
        border-radius: 16px;
    }

    .header-icon-wrapper {
        width: 50px;
        height: 50px;
    }

    .header-icon {
        font-size: 1.6rem;
    }

    .header-content h3 {
        font-size: 1.2rem;
    }

    .header-subtitle {
        font-size: 0.8rem;
    }

    .toggle-label {
        font-size: 0.75rem;
    }

    .last-save {
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
    }

    .input-wrapper input {
        padding: 0.6rem 0.8rem;
        padding-right: 65px;
        font-size: 0.9rem;
    }

    .input-unit {
        font-size: 0.75rem;
        padding: 0.15rem 0.4rem;
    }

    .indicator-item {
        padding: 0.5rem 0.6rem;
    }

    .indicator-icon {
        font-size: 0.9rem;
    }

    .indicator-message {
        font-size: 0.8rem;
    }

    .indicator-advice {
        font-size: 0.75rem;
    }

    .reset-button, .submit-button {
        padding: 0.7rem;
        font-size: 0.85rem;
    }

    .message {
        padding: 0.7rem;
        font-size: 0.85rem;
    }
}

/* الوضع الأفقي (Landscape) */
@media (max-height: 600px) and (orientation: landscape) {
    .health-form-container {
        padding: 1rem;
    }

    .form-header {
        margin-bottom: 1rem;
        padding-bottom: 1rem;
    }

    .header-icon-wrapper {
        width: 50px;
        height: 50px;
    }

    .header-icon {
        font-size: 1.6rem;
    }

    .form-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .health-indicators {
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .indicators-list {
        gap: 0.5rem;
    }

    .indicator-item {
        padding: 0.5rem;
    }
}

/* للمستخدمين الذين يفضلون الحركة المنخفضة */
@media (prefers-reduced-motion: reduce) {
    .health-form-container,
    .header-icon-wrapper,
    .auto-save-toggle,
    .indicator-item,
    .reset-button,
    .submit-button,
    .dismiss-message {
        transition: none;
    }
    
    .header-icon-wrapper {
        animation: none;
    }
    
    .spinner {
        animation: none;
    }
    
    .indicator-item:hover {
        transform: none;
    }
    
    .reset-button:hover:not(:disabled),
    .submit-button:hover:not(:disabled) {
        transform: none;
    }
}

/* تحسينات اللمس للأجهزة المحمولة */
@media (hover: none) and (pointer: coarse) {
    .auto-save-toggle:active,
    .reset-button:active,
    .submit-button:active,
    .dismiss-message:active {
        transform: scale(0.96);
    }
    
    .indicator-item:active {
        transform: scale(0.98);
    }
}
            `}</style>
        </div>
    );
}

export default HealthForm;