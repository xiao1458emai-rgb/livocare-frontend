// ============================================================
// الشكل المجرد للمكون - فقط الهيكل والبصمات (fingerprints)
// ============================================================

// 🧩 البصمة 1: الواردات (Imports signature)
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
// ❌ تم إزالة '../index.css' للتحليل
import EditHealthForm from './EditHealthForm';

// 🧩 البصمة 2: التوقيع العام للمكون (Component signature)
function HealthHistory({ refreshKey, onDataSubmitted }) {
    // 🧩 البصمة 3: حالة اللغة (Language state)
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // 🧩 البصمة 4: حالات البيانات الأساسية (Core data states)
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    
    // 🧩 البصمة 5: حالات التحكم (Control states)
    const [sortConfig, setSortConfig] = useState({ key: 'recorded_at', direction: 'desc' });
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterType, setFilterType] = useState('all'); // all, weight, bp, glucose, heartRate, spo2, temperature
    
    // 🧩 البصمة 6: المراجع (References)
    const isMountedRef = useRef(true);
    const isFetchingRef = useRef(false);
    const isDeletingRef = useRef(false);
    
    // 🧩 البصمة 7: الدوال الرئيسية (Main functions)
    // 7.1 fetchHistory - جلب السجل الصحي من API
    // 7.2 handleSort - معالجة الفرز
    // 7.3 handleDelete - حذف سجل واحد
    // 7.4 handleBulkDelete - حذف جماعي
    // 7.5 toggleSelectAll - تحديد/إلغاء الكل
    // 7.6 toggleSelect - تحديد/إلغاء سجل واحد
    // 7.7 getSortIcon - أيقونة الفرز
    // 7.8 getHealthStatus - تحليل الحالة الصحية (تشمل درجة الحرارة)
    // 7.9 displayValue - عرض القيمة مع الوحدة
    // 7.10 displayBloodPressure - عرض ضغط الدم
    // 7.11 formatDate - تنسيق التاريخ
    
    // 🧩 البصمة 8: البيانات المحسوبة (Computed data - useMemo)
    // 8.1 filteredHistory - تصفية حسب البحث ونوع الفلتر (مع دعم درجة الحرارة)
    // 8.2 sortedHistory - فرز البيانات
    // 8.3 paginatedHistory - تقسيم الصفحات
    
    // 🧩 البصمة 9: الإحصائيات (Statistics)
    const stats = {
        total: safeHistory.length,
        weight: safeHistory.filter(r => r.weight_kg && r.weight_kg !== null).length,
        bp: safeHistory.filter(r => r.systolic_pressure && r.diastolic_pressure).length,
        glucose: safeHistory.filter(r => r.blood_glucose && r.blood_glucose !== null).length,
        heartRate: safeHistory.filter(r => r.heart_rate && r.heart_rate !== null).length,
        spo2: safeHistory.filter(r => r.spo2 && r.spo2 !== null).length,
        temperature: safeHistory.filter(r => r.body_temperature && r.body_temperature !== null).length, // ✅ درجة الحرارة
    };
    
    // 🧩 البصمة 10: تأثيرات جانبية (Effects)
    // Effect 1: مراقبة تغييرات اللغة
    // Effect 2: جلب البيانات عند تغيير refreshKey أو fetchHistory
    // Effect 3: تنظيف عند فك التركيب
    
    // 🧩 البصمة 11: حالات التحميل والخطأ (Loading & Error states)
    if (loading && safeHistory.length === 0) return <div>Loading...</div>;
    if (error && safeHistory.length === 0) return <div>Error: {error}</div>;
    
    // 🧩 البصمة 12: التصيير (Render)
    // يحتوي على 7 أقسام رئيسية:
    // 1. رأس القسم (history-header) - عنوان + بحث + حذف جماعي
    // 2. فلاتر سريعة (filter-tabs) - 7 أزرار فلتر (مع فلتر درجة الحرارة)
    // 3. حالة عدم وجود بيانات (empty-state)
    // 4. جدول البيانات (history-table) - 10 أعمدة (مع عمود درجة الحرارة)
    // 5. Pagination (أزرار التنقل بين الصفحات)
    // 6. نافذة تأكيد الحذف (modal-overlay)
    // 7. نموذج التعديل (EditHealthForm)
}

export default HealthHistory;