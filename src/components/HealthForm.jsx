// ============================================================
// الشكل المجرد للمكون - فقط الهيكل والبصمات (fingerprints)
// ============================================================

// 🧩 البصمة 1: الواردات (Imports signature)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import esp32Service from '../services/esp32Service';
// ❌ تم إزالة '../index.css' للتحليل

// 🧩 البصمة 2: التوقيع العام للمكون (Component signature)
function HealthForm({ onDataSubmitted }) {
    // 🧩 البصمة 3: حالة اللغة (Language state)
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // 🧩 البصمة 4: المراجع (References)
    const isMountedRef = useRef(true);
    const isSubmittingRef = useRef(false);
    const unsubscribeESP32Ref = useRef(null);
    
    // 🧩 البصمة 5: حالة النموذج (Form state - 7 حقول)
    const [formData, setFormData] = useState({
        weight: '',        // الوزن
        systolic: '',      // الضغط الانقباضي
        diastolic: '',     // الضغط الانبساطي
        glucose: '',       // السكر
        heartRate: '',     // النبض
        spo2: '',          // الأكسجين
        temperature: ''    // درجة الحرارة
    });
    
    // 🧩 البصمة 6: حالات ESP32 (ESP32 states)
    const [sensorActive, setSensorActive] = useState(false);
    const [sensorHeartRate, setSensorHeartRate] = useState(null);
    const [sensorSpO2, setSensorSpO2] = useState(null);
    const [sensorConnecting, setSensorConnecting] = useState(false);
    const [lastSensorReading, setLastSensorReading] = useState(null);
    
    // 🧩 البصمة 7: حالات عامة (General states)
    const [loading, setLoading] = useState(false);
    const [savingSensorData, setSavingSensorData] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [autoSave, setAutoSave] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    
    // 🧩 البصمة 8: حدود التحقق (Validation limits)
    const VALIDATION_LIMITS = {
        weight: { min: 20, max: 300, normalMin: 50, normalMax: 100, unit: 'kg', icon: '⚖️' },
        systolic: { min: 50, max: 250, normalMin: 90, normalMax: 140, unit: 'mmHg', icon: '❤️' },
        diastolic: { min: 30, max: 180, normalMin: 60, normalMax: 90, unit: 'mmHg', icon: '💙' },
        glucose: { min: 30, max: 600, normalMin: 70, normalMax: 140, unit: 'mg/dL', icon: '🩸' },
        heartRate: { min: 30, max: 220, normalMin: 60, normalMax: 100, unit: 'BPM', icon: '💓' },
        spo2: { min: 50, max: 100, normalMin: 95, normalMax: 100, unit: '%', icon: '💨' },
        temperature: { min: 35, max: 42, normalMin: 36.5, normalMax: 37.5, unit: '°C', icon: '🌡️' }
    };
    
    // 🧩 البصمة 9: الدوال الرئيسية (Main functions)
    // 9.1 connectSensor - الاتصال بـ ESP32
    // 9.2 disconnectSensor - قطع الاتصال
    // 9.3 fillFormWithSensorData - تعبئة النموذج من المستشعر
    // 9.4 saveSensorReadingAsHealthRecord - حفظ كقياس صحي
    // 9.5 validateForm - التحقق من صحة النموذج
    // 9.6 handleInputChange - معالجة تغيير الحقول
    // 9.7 resetForm - مسح النموذج
    // 9.8 handleSubmit - إرسال النموذج
    // 9.9 calculateHealthIndicators - حساب المؤشرات الصحية
    // 9.10 showMessage - عرض الرسائل
    
    // 🧩 البصمة 10: تأثيرات جانبية (Effects)
    // Effect 1: مراقبة تغييرات اللغة (language change listener)
    // Effect 2: تسجيل مستمع ESP32 (ESP32 listener registration)
    // Effect 3: الحفظ التلقائي (auto-save)
    // Effect 4: استعادة البيانات المحفوظة (restore auto-saved data)
    // Effect 5: تنظيف عند فك التركيب (cleanup)
    
    // 🧩 البصمة 11: حساب طول الحقول المملوءة (filled fields count)
    const filledFieldsCount = Object.values(formData).filter(v => v && v.toString().trim() !== '').length;
    
    // 🧩 البصمة 12: الحصول على وقت آخر قراءة (last reading time)
    const getLastReadingTime = () => {
        if (!lastSensorReading?.timestamp) return '';
        return lastSensorReading.timestamp.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    
    // 🧩 البصمة 13: المؤشرات الصحية (health indicators)
    const healthIndicators = calculateHealthIndicators();
    
    // 🧩 البصمة 14: التصيير (Render)
    // يحتوي على 5 أقسام رئيسية:
    // 1. رأس النموذج (form-header) - مع زر الحفظ التلقائي
    // 2. قسم ESP32 (esp32-section) - مع زرين: تعبئة النموذج + حفظ كقياس صحي
    // 3. شبكة الحقول (form-grid) - 7 حقول إدخال + عرض مؤشرات ESP32
    // 4. المؤشرات الصحية (indicators-section) - عرض نصائح صحية
    // 5. أزرار الإجراء (form-actions) - مسح النموذج + حفظ الكل
    // 6. إشعار (notification-toast) - رسائل مؤقتة
}

export default HealthForm;