'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

function Sidebar({ activeSection, onSectionChange, isArabic: propIsArabic }) {
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = propIsArabic !== undefined ? propIsArabic : (lang === 'ar');
    const isRTL = isArabic;
    
    const [notificationCount, setNotificationCount] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    
    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ✅ كشف حجم الشاشة
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
            
            // على الجوال، السايدبار يكون مصغراً تلقائياً
            if (width < 768) {
                setIsCollapsed(true);
            }
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (event.detail && event.detail.lang !== lang) {
                setLang(event.detail.lang);
            }
        };
        
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, [lang]);

    // ✅ أقسام القائمة الرئيسية
    const getSections = () => [
        { id: 'health', icon: '❤️', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', tooltip: isArabic ? 'العلامات الحيوية' : 'Vital Signs' },
        { id: 'nutrition', icon: '🥗', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', tooltip: isArabic ? 'التغذية' : 'Nutrition' },
        { id: 'sleep', icon: '🌙', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', tooltip: isArabic ? 'النوم' : 'Sleep' },
        { id: 'mood', icon: '😊', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', tooltip: isArabic ? 'المزاج' : 'Mood' },
        { id: 'habits', icon: '💊', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', tooltip: isArabic ? 'العادات' : 'Habits' },
        { id: 'activity', icon: '🏃', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', tooltip: isArabic ? 'النشاط' : 'Activity' },
        { id: 'smart', icon: '🧠', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', tooltip: isArabic ? 'الميزات الذكية' : 'Smart Features' },
        { id: 'chat', icon: '💬', color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)', tooltip: isArabic ? 'المساعد الذكي' : 'Smart Chat' },
        { id: 'reports', icon: '📊', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', tooltip: isArabic ? 'التقارير' : 'Reports' },
        { id: 'profile', icon: '👤', color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', tooltip: isArabic ? 'الملف الشخصي' : 'Profile' },
    ];

    const sections = getSections();

    // ✅ معلومات الأقسام
    const getSectionInfo = (sectionId) => {
        const sectionNames = {
            health: isArabic ? 'العلامات الحيوية' : 'Vital Signs',
            nutrition: isArabic ? 'التغذية' : 'Nutrition',
            sleep: isArabic ? 'النوم' : 'Sleep',
            mood: isArabic ? 'المزاج' : 'Mood',
            habits: isArabic ? 'العادات' : 'Habits',
            activity: isArabic ? 'النشاط' : 'Activity',
            smart: isArabic ? 'الميزات الذكية' : 'Smart Features',
            chat: isArabic ? 'المساعد الذكي' : 'Smart Chat',
            reports: isArabic ? 'التقارير' : 'Reports',
            profile: isArabic ? 'الملف الشخصي' : 'Profile'
        };
        
        const sectionDescriptions = {
            health: isArabic ? 'تتبع القياسات الحيوية' : 'Track biometric measurements',
            nutrition: isArabic ? 'إدارة الوجبات والسعرات' : 'Manage meals and calories',
            sleep: isArabic ? 'جودة النوم والساعات' : 'Sleep quality and hours',
            mood: isArabic ? 'تتبع المشاعر والأحاسيس' : 'Track emotions and feelings',
            habits: isArabic ? 'المكملات والروتين اليومي' : 'Supplements and daily routine',
            activity: isArabic ? 'تتبع النشاط البدني' : 'Track physical activity',
            smart: isArabic ? 'توصيات وتحليلات متقدمة' : 'Advanced recommendations & analytics',
            chat: isArabic ? 'مساعد صحي ذكي' : 'Intelligent health assistant',
            reports: isArabic ? 'تقارير وتحليلات صحية' : 'Health reports and analytics',
            profile: isArabic ? 'الإعدادات والأهداف' : 'Settings and goals'
        };
        
        return {
            name: sectionNames[sectionId] || sectionId,
            description: sectionDescriptions[sectionId] || ''
        };
    };

    // ✅ جلب عدد الإشعارات
    const fetchNotificationCount = useCallback(async () => {
        if (isFetchingRef.current || !isMountedRef.current) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        isFetchingRef.current = true;
        abortControllerRef.current = new AbortController();
        
        try {
            const response = await axiosInstance.get('/notifications/unread_count/', {
                signal: abortControllerRef.current.signal
            });
            
            if (isMountedRef.current) {
                setNotificationCount(response.data.count);
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                return;
            }
            console.error('Error fetching notification count', error);
        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchNotificationCount();
        
        const handleNotificationCount = (e) => {
            if (isMountedRef.current) {
                setNotificationCount(e.detail.count);
            }
        };
        
        window.addEventListener('notificationCount', handleNotificationCount);
        
        intervalRef.current = setInterval(() => {
            fetchNotificationCount();
        }, 60000);
        
        return () => {
            window.removeEventListener('notificationCount', handleNotificationCount);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchNotificationCount]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const toggleCollapse = () => {
        if (!isMobile) {
            setIsCollapsed(!isCollapsed);
        }
    };

    // عرض الأيقونة المناسبة لزر الطي/التوسيع
    const getToggleIcon = () => {
        if (isCollapsed) {
            return isRTL ? '←' : '→';
        }
        return isRTL ? '→' : '←';
    };

    return (
        <aside 
            className={`sidebar ${isRTL ? 'rtl' : 'ltr'} ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isTablet ? 'tablet' : ''}`} 
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* خلفية متحركة */}
            <div className="sidebar-bg">
                <div className="bg-particles"></div>
                <div className="bg-gradient"></div>
            </div>

            {/* رأس السايدبار */}
            <div className="sidebar-header">
                <div className="app-logo">
                    <div className="logo-wrapper">
                        <div className="logo-glow"></div>
                        <div className="logo-icon" aria-hidden="true">🏥</div>
                    </div>
                    {!isCollapsed && (
                        <div className="logo-text">
                            <span className="app-name">LivoCare</span>
                            <span className="app-tagline">{isArabic ? 'العناية بصحتك' : 'Your Health Care'}</span>
                        </div>
                    )}
                </div>
                {!isMobile && (
                    <button 
                        className="collapse-toggle" 
                        onClick={toggleCollapse}
                        aria-label={isCollapsed ? (isArabic ? 'توسيع' : 'Expand') : (isArabic ? 'طي' : 'Collapse')}
                        title={isCollapsed ? (isArabic ? 'توسيع' : 'Expand') : (isArabic ? 'طي' : 'Collapse')}
                    >
                        <span className="toggle-icon" aria-hidden="true">{getToggleIcon()}</span>
                    </button>
                )}
            </div>

            {/* قائمة التنقل */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    {!isCollapsed && !isMobile && (
                        <h3 className="nav-title">
                            <span className="title-icon" aria-hidden="true">📊</span>
                            {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                        </h3>
                    )}
                    <div className="nav-items">
                        {sections.map(section => {
                            const isActive = activeSection === section.id;
                            const sectionInfo = getSectionInfo(section.id);
                            const isHovered = hoveredItem === section.id;
                            
                            return (
                                <button
                                    key={section.id}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => onSectionChange(section.id)}
                                    onMouseEnter={() => setHoveredItem(section.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    style={{ 
                                        '--active-color': section.color,
                                        '--active-gradient': section.gradient 
                                    }}
                                    aria-label={sectionInfo.name}
                                    title={isCollapsed && !isMobile ? sectionInfo.name : undefined}
                                >
                                    <div className="nav-item-content">
                                        <div className="nav-icon-wrapper" style={{ 
                                            background: isActive ? section.gradient : 'rgba(255,255,255,0.1)'
                                        }}>
                                            <span className="nav-icon" aria-hidden="true">{section.icon}</span>
                                        </div>
                                        {(!isCollapsed || isMobile) && (
                                            <div className="nav-text">
                                                <span className="nav-name">{sectionInfo.name}</span>
                                                {!isMobile && (
                                                    <span className="nav-description">
                                                        {sectionInfo.description}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isActive && (
                                        <>
                                            <div className="active-indicator"></div>
                                            <div className="active-glow"></div>
                                        </>
                                    )}
                                    
                                    {isCollapsed && !isMobile && isHovered && (
                                        <div className="nav-tooltip">
                                            <span className="tooltip-name">{sectionInfo.name}</span>
                                            <span className="tooltip-desc">{sectionInfo.description}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* قسم الإضافات */}
                <div className="nav-section extras">
                    {!isCollapsed && !isMobile && (
                        <h3 className="nav-title">
                            <span className="title-icon" aria-hidden="true">⚡</span>
                            {isArabic ? 'إضافات' : 'Extras'}
                        </h3>
                    )}
                    <div className="nav-items">
                        <button 
                            className={`nav-item extra-item ${activeSection === 'notifications' ? 'active' : ''}`}
                            onClick={() => onSectionChange('notifications')}
                            aria-label={isArabic ? 'الإشعارات' : 'Notifications'}
                            title={isCollapsed && !isMobile ? (isArabic ? 'الإشعارات' : 'Notifications') : undefined}
                        >
                            <div className="nav-item-content">
                                <div className="nav-icon-wrapper">
                                    <span className="nav-icon" aria-hidden="true">🔔</span>
                                </div>
                                {(!isCollapsed || isMobile) && (
                                    <div className="nav-text">
                                        <span className="nav-name">{isArabic ? 'الإشعارات' : 'Notifications'}</span>
                                        {!isMobile && (
                                            <span className="nav-description">{isArabic ? 'آخر التحديثات والتنبيهات' : 'Latest updates and alerts'}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {notificationCount > 0 && (
                                <span className={`nav-badge ${notificationCount > 99 ? 'large' : ''}`}>
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* تذييل السايدبار - يظهر فقط في الوضع الموسع وغير الجوال */}
            {!isCollapsed && !isMobile && (
                <div className="sidebar-footer">
                    <div className="user-stats">
                        <div className="stat-item">
                            <span className="stat-value">9</span>
                            <span className="stat-label">{isArabic ? 'أقسام' : 'Sections'}</span>
                        </div>
                        <div className="stat-divider" aria-hidden="true"></div>
                        <div className="stat-item">
                            <span className="stat-value">✓</span>
                            <span className="stat-label">{isArabic ? 'متابعة صحية' : 'Tracking'}</span>
                        </div>
                    </div>

                    <div className="user-profile">
                        <div className="user-avatar">
                            <span className="avatar-icon" aria-hidden="true">👤</span>
                            <div className="avatar-status online"></div>
                        </div>
                        <div className="user-info">
                            <span className="user-name">{isArabic ? 'مستخدم LivoCare' : 'LivoCare User'}</span>
                            <span className="user-role">{isArabic ? 'مستخدم نشط' : 'Active User'}</span>
                        </div>
                    </div>
                </div>
            )}

        </aside>
    );
}

export default Sidebar;