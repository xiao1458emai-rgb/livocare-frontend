'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../services/api';
import '../index.css';

function Sidebar({ activeSection, onSectionChange, isArabic: propIsArabic }) {
    // ✅ إعدادات اللغة
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
            
            // ✅ على الجوال، السايدبار يكون مغلقاً تلقائياً
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

    // ✅ أقسام القائمة
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

    const getToggleIcon = () => {
        if (isCollapsed) {
            return isRTL ? '←' : '→';
        }
        return isRTL ? '→' : '←';
    };

    return (
        <>
            {/* ✅ طبقة التغطية على الجوال */}
            {isMobile && !isCollapsed && (
                <div className="sidebar-overlay-mobile" onClick={() => setIsCollapsed(true)} />
            )}
            
            <aside 
                className={`sidebar ${isRTL ? 'rtl' : 'ltr'} ${isCollapsed ? 'collapsed' : ''}`}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
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
                        >
                            <span className="toggle-icon" aria-hidden="true">{getToggleIcon()}</span>
                        </button>
                    )}
                    
                    {/* ✅ زر إغلاق للجوال */}
                    {isMobile && !isCollapsed && (
                        <button 
                            className="mobile-close-btn" 
                            onClick={() => setIsCollapsed(true)}
                            aria-label={isArabic ? 'إغلاق' : 'Close'}
                        >
                            ✕
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
                                        onClick={() => {
                                            onSectionChange(section.id);
                                            // ✅ على الجوال، أغلق السايدبار بعد الضغط
                                            if (isMobile) {
                                                setIsCollapsed(true);
                                            }
                                        }}
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

                    {/* قسم الإشعارات */}
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
                                onClick={() => {
                                    onSectionChange('notifications');
                                    if (isMobile) setIsCollapsed(true);
                                }}
                                aria-label={isArabic ? 'الإشعارات' : 'Notifications'}
                            >
                                <div className="nav-item-content">
                                    <div className="nav-icon-wrapper">
                                        <span className="nav-icon" aria-hidden="true">🔔</span>
                                    </div>
                                    {(!isCollapsed || isMobile) && (
                                        <div className="nav-text">
                                            <span className="nav-name">{isArabic ? 'الإشعارات' : 'Notifications'}</span>
                                            {!isMobile && (
                                                <span className="nav-description">
                                                    {isArabic ? 'آخر التحديثات والتنبيهات' : 'Latest updates and alerts'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {notificationCount > 0 && (
                                    <span className="nav-badge">
                                        {notificationCount > 99 ? '99+' : notificationCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* تذييل السايدبار */}
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

            <style jsx>{`
                /* ===== السايدبار الرئيسي ===== */
                .sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    width: 280px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    transition: transform 0.3s ease, width 0.3s ease;
                    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
                }
                
                [dir="rtl"] .sidebar {
                    left: auto;
                    right: 0;
                }
                
                /* ✅ وضع مصغر */
                .sidebar.collapsed {
                    width: 80px;
                }
                
                /* ✅ وضع الجوال - مخفي افتراضياً */
                @media (max-width: 767px) {
                    .sidebar {
                        transform: translateX(-100%);
                    }
                    
                    [dir="rtl"] .sidebar {
                        transform: translateX(100%);
                    }
                    
                    .sidebar:not(.collapsed) {
                        transform: translateX(0) !important;
                    }
                }
                
                /* ===== طبقة التغطية للجوال ===== */
                .sidebar-overlay-mobile {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 999;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                /* ===== زر إغلاق الجوال ===== */
                .mobile-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    transition: all 0.2s ease;
                }
                
                .mobile-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.05);
                }
                
                /* ✅ رأس السايدبار */
                .sidebar-header {
                    padding: 2rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .sidebar.collapsed .sidebar-header {
                    padding: 1.5rem 0.75rem;
                }
                
                .app-logo {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .logo-wrapper {
                    position: relative;
                    width: 50px;
                    height: 50px;
                    flex-shrink: 0;
                }
                
                .logo-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    border-radius: 12px;
                    filter: blur(10px);
                    opacity: 0.6;
                    animation: glowPulse 2s infinite;
                }
                
                @keyframes glowPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
                
                .logo-icon {
                    position: relative;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                }
                
                .logo-text {
                    display: flex;
                    flex-direction: column;
                }
                
                .app-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #fff, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .app-tagline {
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                .collapse-toggle {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .collapse-toggle:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.05);
                }
                
                /* ✅ قائمة التنقل */
                .sidebar-nav {
                    flex: 1;
                    padding: 1.5rem 0;
                    overflow-y: auto;
                }
                
                .nav-items {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .nav-item {
                    background: none;
                    border: none;
                    color: white;
                    padding: 0;
                    margin: 0 0.75rem;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    width: calc(100% - 1.5rem);
                }
                
                .nav-item-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    transition: all 0.2s ease;
                }
                
                .nav-item:hover .nav-item-content {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(5px);
                }
                
                [dir="rtl"] .nav-item:hover .nav-item-content {
                    transform: translateX(-5px);
                }
                
                .nav-item.active .nav-item-content {
                    background: rgba(255, 255, 255, 0.15);
                }
                
                .nav-icon-wrapper {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                
                .nav-icon {
                    font-size: 1.3rem;
                    transition: transform 0.2s ease;
                }
                
                .nav-item:hover .nav-icon {
                    transform: scale(1.1);
                }
                
                .nav-text {
                    flex: 1;
                    min-width: 0;
                }
                
                .nav-name {
                    font-weight: 600;
                    font-size: 0.95rem;
                    margin-bottom: 0.2rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .nav-description {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.7);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .nav-badge {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    right: 1rem;
                    background: #ef4444;
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.2rem 0.5rem;
                    border-radius: 20px;
                    min-width: 20px;
                    text-align: center;
                }
                
                [dir="rtl"] .nav-badge {
                    right: auto;
                    left: 1rem;
                }
                
                .active-indicator {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    left: 0;
                    width: 4px;
                    height: 60%;
                    background: var(--active-color);
                    border-radius: 0 4px 4px 0;
                }
                
                [dir="rtl"] .active-indicator {
                    left: auto;
                    right: 0;
                    border-radius: 4px 0 0 4px;
                }
                
                .active-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--active-gradient);
                    border-radius: 12px;
                    opacity: 0.2;
                    filter: blur(8px);
                }
                
                /* ✅ تذييل السايدبار */
                .sidebar-footer {
                    padding: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .user-stats {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                }
                
                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .stat-value {
                    font-size: 1.3rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .stat-label {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                .stat-divider {
                    width: 1px;
                    height: 30px;
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                }
                
                .user-avatar {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .avatar-icon {
                    font-size: 1.5rem;
                }
                
                .avatar-status {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #10b981;
                    border: 2px solid #1e293b;
                }
                
                [dir="rtl"] .avatar-status {
                    right: auto;
                    left: -2px;
                }
                
                .user-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .user-name {
                    display: block;
                    font-weight: 600;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .user-role {
                    display: block;
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.7);
                }
                
              /* ✅ وضع مصغر - فقط تقليص العرض، لا إخفاء */
.sidebar.collapsed {
    width: 80px;
    min-width: 80px;
}

/* اخفي النصوص فقط */
.sidebar.collapsed .nav-text,
.sidebar.collapsed .logo-text,
.sidebar.collapsed .user-info,
.sidebar.collapsed .user-stats {
    display: none;
}

/* أبقِ الأيقونات ظاهرة وكبيرة */
.sidebar.collapsed .nav-icon-wrapper {
    width: 44px;
    height: 44px;
    margin: 0;
}

.sidebar.collapsed .nav-icon {
    font-size: 1.5rem;
}

.sidebar.collapsed .nav-item-content {
    justify-content: center;
    padding: 0.75rem;
}

.sidebar.collapsed .nav-item {
    margin: 0 0.5rem;
}

/* التذييل المصغر */
.sidebar.collapsed .sidebar-footer {
    padding: 1rem 0.5rem;
}

.sidebar.collapsed .user-profile {
    justify-content: center;
    padding: 0.5rem;
}

.sidebar.collapsed .user-avatar {
    width: 36px;
    height: 36px;
}

.sidebar.collapsed .avatar-icon {
    font-size: 1.2rem;
}

/* الشعار المصغر */
.sidebar.collapsed .logo-wrapper {
    width: 40px;
    height: 40px;
}

.sidebar.collapsed .logo-icon {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
}

.sidebar.collapsed .sidebar-header {
    justify-content: center;
    padding: 1rem 0.5rem;
}

.sidebar.collapsed .collapse-toggle {
    display: none;
}
            `}</style>
        </>
    );
}

export default Sidebar;