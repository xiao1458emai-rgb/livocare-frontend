// ============================================================
// الشكل المجرد للمكون - فقط الهيكل والبصمات (fingerprints)
// ============================================================

// 🧩 البصمة 1: الواردات (Imports signature)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../services/api';
// ❌ تم إزالة '../index.css' للتحليل

// المكونات الأساسية (12 مكوناً مستورداً)
import HealthForm from './HealthForm';
import HealthHistory from './HealthHistory';
import HealthCharts from './HealthCharts';
import ActivityAnalytics from './Analytics/ActivityAnalytics';
import Sidebar from './Sidebar';
import NutritionMain from './nutrition/NutritionMain';
import SleepTracker from './SleepTracker';
import HabitTracker from './HabitTracker';
import ActivityForm from './ActivityForm';
import MoodTracker from './MoodTracker';
import ProfileManager from './usermangment';
import ChatInterface from './Chat/ChatInterface';
import SmartDashboard from './SmartFeatures/SmartDashboard';
import Notifications from './Notifications/Notifications';
import Reports from './Reports';
import AdvancedHealthInsights from './Analytics/AdvancedHealthInsights';

// 🧩 البصمة 2: دالة تطبيق اللغة (applyLanguage)
const applyLanguage = (lang) => {
    const isArabic = lang === 'ar';
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang, isArabic } }));
};

// 🧩 البصمة 3: التوقيع العام للمكون (Component signature)
function Dashboard({ onLogout }) {
    // 🧩 البصمة 4: حالة اللغة (Language state)
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
    // 🧩 البصمة 5: التنقل والمراجع (Navigation & Refs)
    const navigate = useNavigate();
    const isMountedRef = useRef(true);
    const refreshIntervalRef = useRef(null);
    const isFetchingRef = useRef(false);
    
    // 🧩 البصمة 6: حالات البيانات الأساسية (Core data states)
    const [healthRecords, setHealthRecords] = useState([]);
    const [latestHealthData, setLatestHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeSection, setActiveSection] = useState('health');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('livocare_darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return saved === 'true' || (saved === null && prefersDark);
        }
        return false;
    });
    
    // 🧩 البصمة 7: تأثيرات جانبية (Effects) - 11 Effect
    // Effect 1: حفظ autoRefresh في localStorage
    // Effect 2: كشف حجم الشاشة
    // Effect 3: الاستماع لإغلاق السايدبار
    // Effect 4: الاستماع لتغييرات اللغة
    // Effect 5: تطبيق الوضع المظلم
    // Effect 6: التحقق من المصادقة
    // Effect 7: جلب البيانات عند التحميل
    // Effect 8: التحديث عند إضافة بيانات جديدة
    // Effect 9: التحديث التلقائي (5 دقائق)
    // Effect 10: تطبيق اللغة عند التحميل
    // Effect 11: تنظيف عند فك التركيب
    
    // 🧩 البصمة 8: دوال مساعدة (Helper functions)
    // 8.1 fetchHealthData - جلب البيانات من API
    // 8.2 handleDataSubmitted - معالجة إضافة بيانات جديدة
    // 8.3 displayValue - عرض قيمة آمن
    // 8.4 displayBloodPressure - عرض ضغط الدم
    // 8.5 toggleDarkMode - تبديل الوضع المظلم
    // 8.6 toggleSidebar - تبديل السايدبار
    // 8.7 getSectionTitle - عنوان القسم
    // 8.8 getTodayDate - تاريخ اليوم
    // 8.9 getMeasuredCount - عدد القياسات المسجلة
    // 8.10 renderSectionContent - عرض محتوى القسم
    
    // 🧩 البصمة 9: حالة التحميل (Loading state)
    if (loading && healthRecords.length === 0) return <div>Loading...</div>;
    
    // 🧩 البصمة 10: حالة الخطأ (Error state)
    if (error && healthRecords.length === 0) return <div>Error: {error}</div>;
    
    // 🧩 البصمة 11: التصيير (Render)
    // يحتوي على 6 أقسام رئيسية:
    // 1. شريط التحكم العلوي (control-bar) - قائمة، عنوان، تاريخ، إعدادات
    // 2. السايدبار (Sidebar) - قائمة التنقل
    // 3. Overlay للجوال
    // 4. المحتوى الرئيسي (dashboard-content)
    // 5. رأس القسم (section-header) - عنوان + تحديث تلقائي + آخر تحديث
    // 6. محتوى القسم (section-content) - حسب activeSection
}

export default Dashboard;