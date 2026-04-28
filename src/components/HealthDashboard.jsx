// ============================================================
// الشكل المجرد للمكون - فقط الهيكل والبصمات (fingerprints)
// ============================================================

// 🧩 البصمة 1: الواردات (Imports signature)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
// ❌ تم إزالة '../index.css' للتحليل

// 🧩 البصمة 2: التوقيع العام للمكون (Component signature)
function HealthDashboard({ refreshKey }) {
    // 🧩 البصمة 3: حالة اللغة (Language state)
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // 🧩 البصمة 4: حالات العرض (Display states)
    const [latestReading, setLatestReading] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState(null);
    
    // 🧩 البصمة 5: حالات الرؤى المتقاطعة (Cross insights states)
    const [crossInsights, setCrossInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState('');
    
    // 🧩 البصمة 6: حالات التحليلات المتقدمة (Advanced insights states)
    const [advancedInsights, setAdvancedInsights] = useState(null);
    const [loadingAdvanced, setLoadingAdvanced] = useState(false);
    const [advancedError, setAdvancedError] = useState('');
    
    // 🧩 البصمة 7: المراجع References
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const insightsAbortControllerRef = useRef(null);
    const advancedAbortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);
    const isFetchingInsightsRef = useRef(false);
    const isFetchingAdvancedRef = useRef(false);
    
    // 🧩 البصمة 8: الدوال الرئيسية (Main functions)
    // 8.1 fetchLatestReading - جلب أحدث قراءة
    // 8.2 fetchCrossInsights - جلب الرؤى المتقاطعة
    // 8.3 fetchAdvancedInsights - جلب التحليلات المتقدمة
    // 8.4 refreshAllData - تحديث جميع البيانات
    // 8.5 formatDateTime - تنسيق التاريخ والوقت
    // 8.6 getReadingStatus - تحليل الحالة الصحية
    // 8.7 toSafeString - تحويل آمن للقيم
    // 8.8 renderAdvancedInsights - عرض التحليلات المتقدمة
    
    // 🧩 البصمة 9: دالة تحليل الحالة الصحية (returns object)
    const getReadingStatus = () => {
        // تحليل الوزن، ضغط الدم، السكر، النبض، الأكسجين
        // يحسب score (0-100)
        // يحدد status: critical/warning/good/excellent
        // يُرجع: { status, color, bgColor, icon, message, issues, score, recommendations }
    }
    
    // 🧩 البصمة 10: تأثيرات جانبية (Effects)
    // Effect 1: مراقبة تغييرات اللغة
    // Effect 2: refetch عندما يتغير refreshKey (useEffect مع refreshKey, refreshAllData)
    // Effect 3: تنظيف عند فك التركيب (cleanup)
    
    // 🧩 البصمة 11: حالة التحميل الأولى (loading)
    if (loading && !latestReading) {
        return <div>Loading...</div>
    }
    
    // 🧩 البصمة 12: حالة الخطأ (error)
    if (error && !latestReading) {
        return <div>Error: {error}</div>
    }
    
    // 🧩 البصمة 13: التصيير (Render)
    // يحتوي على 9 أقسام رئيسية:
    // 1. رأس اللوحة (dashboard-header) - عنوان + تاريخ
    // 2. درجة الصحة (health-score-section) - دائرة النسبة المئوية
    // 3. بطاقات القراءات (readings-grid) - 5 بطاقات (وزن، ضغط، سكر، نبض، أكسجين)
    // 4. التنبيهات الصحية (alerts-section) - مشاكل high/medium
    // 5. التوصيات (recommendations-section) - نصائح مخصصة
    // 6. التحليلات المتقدمة (advanced-insights-section)
    //    - استهلاك الطاقة
    //    - ضغط النبض
    //    - توصيات شاملة
    // 7. الرؤى المتقاطعة (cross-insights-section)
    // 8. أزرار الإجراءات (dashboard-actions) - تحديث الكل
    // 9. أنماط CSS المضمنة (style jsx)
}

export default HealthDashboard;