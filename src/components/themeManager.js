// src/utils/themeManager.js
import { useState, useEffect } from 'react';
class ThemeManager {
    constructor() {
        this.STORAGE_KEYS = {
            DARK_MODE: 'livocare_darkMode',
            LANGUAGE: 'livocare_language',
            THEME_VERSION: 'livocare_theme_v1'
        };
        
        this.listeners = [];
        this.currentDarkMode = false;
        this.currentLanguage = 'ar';
        
        this.init();
    }

    init() {
        try {
            // التحقق من دعم localStorage
            if (!this.supportsLocalStorage()) {
                console.warn('LocalStorage غير مدعوم، استخدام الإعدادات الافتراضية');
                this.applyDefaults();
                return;
            }
            
            // تحميل الإعدادات
            this.currentDarkMode = this.getDarkMode();
            this.currentLanguage = this.getLanguage();
            
            this.applyDarkMode(this.currentDarkMode);
            this.applyLanguage(this.currentLanguage);
            
            // استمع لتغييرات النظام (إذا دعمه المتصفح)
            this.setupSystemThemeListener();
            
        } catch (error) {
            console.error('خطأ في تهيئة ThemeManager:', error);
            this.applyDefaults();
        }
    }

    // 🔹 إضافة مستمع للتغييرات
    addListener(callback) {
        this.listeners.push(callback);
        // إرجاع دالة لإزالة المستمع
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // 🔹 إعلام جميع المستمعين بالتغيير
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    darkMode: this.currentDarkMode,
                    language: this.currentLanguage
                });
            } catch (error) {
                console.error('خطأ في إعلام المستمع:', error);
            }
        });
    }

    // 🔹 تأكد من دعم localStorage
    supportsLocalStorage() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    // 🔹 الحصول على الوضع الليلي مع تحديد افتراضي
    getDarkMode() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.DARK_MODE);
            if (saved !== null) {
                return saved === 'true';
            }
            
            // إذا لم يوجد حفظ، تحقق من تفضيلات النظام
            return this.prefersDarkMode();
        } catch {
            return false;
        }
    }

    // 🔹 الحصول على اللغة مع تحديد افتراضي
    getLanguage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEYS.LANGUAGE);
            if (saved) {
                return saved;
            }
            
            // تحقق من لغة المتصفح
            const browserLang = navigator.language || navigator.userLanguage;
            return browserLang.startsWith('ar') ? 'ar' : 'en';
        } catch {
            return 'ar';
        }
    }

    // 🔹 تطبيق الإعدادات الافتراضية
    applyDefaults() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentDarkMode = prefersDark;
        this.applyDarkMode(prefersDark);
        
        const browserLang = navigator.language || navigator.userLanguage;
        this.currentLanguage = browserLang.startsWith('ar') ? 'ar' : 'en';
        this.applyLanguage(this.currentLanguage);
    }

    // 🔹 تحقق من تفضيلات النظام للوضع المظلم
    prefersDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 🔹 تطبيق الوضع الليلي مع CSS custom properties
    applyDarkMode(isDark) {
        try {
            const html = document.documentElement;
            const body = document.body;
            
            this.currentDarkMode = isDark;
            
            if (isDark) {
                html.classList.add('dark-mode');
                body.classList.add('dark-mode');
                
                // تطبيق CSS custom properties
                html.style.setProperty('--primary-bg', '#0f172a');
                html.style.setProperty('--secondary-bg', '#1e293b');
                html.style.setProperty('--tertiary-bg', '#334155');
                html.style.setProperty('--card-bg', '#1e293b');
                html.style.setProperty('--text-primary', '#f8fafc');
                html.style.setProperty('--text-secondary', '#cbd5e1');
                html.style.setProperty('--text-tertiary', '#94a3b8');
                html.style.setProperty('--border-light', '#334155');
                html.style.setProperty('--border-medium', '#475569');
                
                localStorage.setItem(this.STORAGE_KEYS.DARK_MODE, 'true');
            } else {
                html.classList.remove('dark-mode');
                body.classList.remove('dark-mode');
                
                // إعادة تعيين CSS custom properties
                html.style.setProperty('--primary-bg', '#f8fafc');
                html.style.setProperty('--secondary-bg', '#f1f5f9');
                html.style.setProperty('--tertiary-bg', '#e2e8f0');
                html.style.setProperty('--card-bg', '#ffffff');
                html.style.setProperty('--text-primary', '#0f172a');
                html.style.setProperty('--text-secondary', '#475569');
                html.style.setProperty('--text-tertiary', '#64748b');
                html.style.setProperty('--border-light', '#e2e8f0');
                html.style.setProperty('--border-medium', '#cbd5e1');
                
                localStorage.setItem(this.STORAGE_KEYS.DARK_MODE, 'false');
            }
            
            // تحديث meta theme-color للمتصفحات المحمولة
            this.updateMetaThemeColor(isDark);
            
            // إرسال الحدث وإعلام المستمعين
            this.dispatchThemeChange(isDark);
            this.notifyListeners();
            
        } catch (error) {
            console.error('خطأ في تطبيق الوضع الليلي:', error);
        }
    }

    // 🔹 تحديث meta theme-color للموبايل
    updateMetaThemeColor(isDark) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        metaThemeColor.content = isDark ? '#0f172a' : '#3b82f6';
    }

    // 🔹 تطبيق اللغة مع حفظ أفضل
    applyLanguage(lang) {
        try {
            const html = document.documentElement;
            
            this.currentLanguage = lang;
            html.lang = lang;
            html.dir = lang === 'ar' ? 'rtl' : 'ltr';
            
            // إضافة class للغة
            html.classList.remove('lang-ar', 'lang-en');
            html.classList.add(`lang-${lang}`);
            
            localStorage.setItem(this.STORAGE_KEYS.LANGUAGE, lang);
            
            // إرسال الحدث وإعلام المستمعين
            this.dispatchLanguageChange(lang);
            this.notifyListeners();
            
        } catch (error) {
            console.error('خطأ في تطبيق اللغة:', error);
        }
    }

    // 🔹 تبديل الوضع الليلي
    toggleDarkMode() {
        this.applyDarkMode(!this.currentDarkMode);
        return this.currentDarkMode;
    }

    // 🔹 تغيير اللغة
    changeLanguage(lang) {
        if (['ar', 'en'].includes(lang)) {
            this.applyLanguage(lang);
        }
        return this.currentLanguage;
    }

    // 🔹 الاستماع لتغييرات نظام التشغيل (تحديث تلقائي)
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleSystemThemeChange = (e) => {
                // إذا لم يكن المستخدم قد عطل التحديث التلقائي
                const userDisabledAuto = localStorage.getItem('disable_auto_theme') === 'true';
                if (!userDisabledAuto) {
                    this.applyDarkMode(e.matches);
                }
            };
            
            // استخدام addEventListener إذا كان متاحاً، وإلا fallback لـ addListener
            if (darkModeMediaQuery.addEventListener) {
                darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
            } else {
                darkModeMediaQuery.addListener(handleSystemThemeChange);
            }
        }
    }

    // 🔹 إرسال الأحداث
    dispatchThemeChange(isDark) {
        try {
            const event = new CustomEvent('themeChange', { 
                detail: { 
                    darkMode: isDark,
                    timestamp: new Date().toISOString()
                } 
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('خطأ في إرسال حدث themeChange:', error);
        }
    }

    dispatchLanguageChange(lang) {
        try {
            const event = new CustomEvent('languageChange', { 
                detail: { 
                    language: lang,
                    direction: lang === 'ar' ? 'rtl' : 'ltr',
                    timestamp: new Date().toISOString()
                } 
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('خطأ في إرسال حدث languageChange:', error);
        }
    }

    // 🔹 الحصول على الحالة الحالية
    getCurrentTheme() {
        return this.currentDarkMode;
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // 🔹 إعادة تعيين الإعدادات
    reset() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.DARK_MODE);
            localStorage.removeItem(this.STORAGE_KEYS.LANGUAGE);
            this.applyDefaults();
        } catch (error) {
            console.error('خطأ في إعادة تعيين الإعدادات:', error);
        }
    }

    // 🔹 تصدير الإعدادات
    exportSettings() {
        return {
            darkMode: this.currentDarkMode,
            language: this.currentLanguage,
            version: this.STORAGE_KEYS.THEME_VERSION,
            exportedAt: new Date().toISOString()
        };
    }

    // 🔹 استيراد الإعدادات
    importSettings(settings) {
        if (settings.darkMode !== undefined) {
            this.applyDarkMode(settings.darkMode);
        }
        if (settings.language && ['ar', 'en'].includes(settings.language)) {
            this.applyLanguage(settings.language);
        }
    }
}

// إنشاء نسخة واحدة مع التحقق
let themeManagerInstance = null;

// 🔹 تعريف دالة getThemeManager
const getThemeManager = () => {
    if (!themeManagerInstance) {
        themeManagerInstance = new ThemeManager();
    }
    return themeManagerInstance;
};

// 🔹 إنشاء hook مخصص لاستخدام الثيم في المكونات
export const useTheme = () => {
    const [theme, setTheme] = useState({
        darkMode: themeManagerInstance?.getCurrentTheme() || false,
        language: themeManagerInstance?.getCurrentLanguage() || 'ar'
    });

    useEffect(() => {
        const manager = getThemeManager();
        
        const handleChange = (newTheme) => {
            setTheme(newTheme);
        };
        
        // إضافة مستمع للتغييرات
        const removeListener = manager.addListener(handleChange);
        
        // استماع للأحداث أيضاً
        const handleThemeEvent = (e) => {
            setTheme(prev => ({ ...prev, darkMode: e.detail.darkMode }));
        };
        
        const handleLanguageEvent = (e) => {
            setTheme(prev => ({ ...prev, language: e.detail.language }));
        };
        
        window.addEventListener('themeChange', handleThemeEvent);
        window.addEventListener('languageChange', handleLanguageEvent);
        
        return () => {
            removeListener();
            window.removeEventListener('themeChange', handleThemeEvent);
            window.removeEventListener('languageChange', handleLanguageEvent);
        };
    }, []);

    const toggleDarkMode = () => {
        if (themeManagerInstance) {
            themeManagerInstance.toggleDarkMode();
        }
    };

    const changeLanguage = (lang) => {
        if (themeManagerInstance) {
            themeManagerInstance.changeLanguage(lang);
        }
    };

    return {
        darkMode: theme.darkMode,
        language: theme.language,
        toggleDarkMode,
        changeLanguage
    };
};

export default getThemeManager;