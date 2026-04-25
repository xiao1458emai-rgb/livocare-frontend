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

            <style>{`
                .sidebar {
                    width: 280px;
                    height: 100vh;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    top: 0;
                    left: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    z-index: 1000;
                    transition: width 0.3s ease, all 0.3s ease;
                    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
                }

                .dark-mode .sidebar {
                    background: linear-gradient(135deg, #0b1120 0%, #030712 100%);
                }

                .sidebar.collapsed {
                    width: 80px;
                }

                .sidebar.collapsed .sidebar-header {
                    padding: 1.5rem 0.75rem;
                }

                .sidebar.collapsed .nav-item-content {
                    justify-content: center;
                }

                .sidebar.collapsed .nav-icon-wrapper {
                    margin: 0;
                }

                .sidebar-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .bg-particles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.05) 0%, transparent 30%),
                                      radial-gradient(circle at 70% 60%, rgba(255,255,255,0.05) 0%, transparent 30%),
                                      radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0%, transparent 30%);
                    animation: particleFloat 20s infinite;
                }

                .bg-gradient {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: radial-gradient(circle at 20% 50%, rgba(96, 165, 250, 0.1) 0%, transparent 50%);
                }

                @keyframes particleFloat {
                    0%, 100% { transform: scale(1) translate(0, 0); }
                    50% { transform: scale(1.1) translate(10px, -10px); }
                }

                .sidebar-header {
                    padding: 2rem 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
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
                    50% { opacity: 0.8; transform: scale(1.1); }
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
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: transform 0.2s ease;
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
                    color: rgba(255,255,255,0.7);
                    margin-top: 0.25rem;
                }

                .collapse-toggle {
                    background: rgba(255,255,255,0.1);
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
                    background: rgba(255,255,255,0.15);
                    transform: scale(1.05);
                }

                .sidebar.collapsed .toggle-icon {
                    transform: rotate(180deg);
                    display: inline-block;
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 1.5rem 0;
                    position: relative;
                    z-index: 1;
                }

                .nav-section {
                    margin-bottom: 1.5rem;
                }

                .nav-section.extras {
                    margin-top: auto;
                }

                .nav-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.7);
                    margin: 0 1.5rem 1rem 1.5rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                }

                .title-icon {
                    font-size: 1rem;
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
                    background: rgba(255,255,255,0.1);
                    transform: translateX(5px);
                }

                .nav-item.active .nav-item-content {
                    background: rgba(255,255,255,0.15);
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
                    transform: scale(1.2) rotate(5deg);
                }

                .nav-text {
                    display: flex;
                    flex-direction: column;
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
                    color: rgba(255,255,255,0.7);
                    line-height: 1.3;
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
                    animation: badgePulse 2s infinite;
                }

                .nav-badge.large {
                    font-size: 0.65rem;
                    padding: 0.2rem 0.35rem;
                }

                @keyframes badgePulse {
                    0%, 100% { transform: translateY(-50%) scale(1); }
                    50% { transform: translateY(-50%) scale(1.05); }
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
                    box-shadow: 0 0 15px var(--active-color);
                    animation: indicatorPulse 2s infinite;
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

                @keyframes indicatorPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .nav-tooltip {
                    position: fixed;
                    left: 90px;
                    background: #1e293b;
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
                    z-index: 2000;
                    white-space: nowrap;
                    pointer-events: none;
                    animation: tooltipFadeIn 0.2s ease;
                }

                .dark-mode .nav-tooltip {
                    background: #0b1120;
                }

                [dir="rtl"] .nav-tooltip {
                    left: auto;
                    right: 90px;
                }

                @keyframes tooltipFadeIn {
                    from {
                        opacity: 0;
                        transform: translateX(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .tooltip-name {
                    display: block;
                    font-weight: 600;
                    font-size: 0.85rem;
                }

                .tooltip-desc {
                    display: block;
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.7);
                }

                .sidebar-footer {
                    padding: 1.5rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                    z-index: 1;
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
                    color: rgba(255,255,255,0.7);
                }

                .stat-divider {
                    width: 1px;
                    height: 30px;
                    background: rgba(255,255,255,0.1);
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
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid #1e293b;
                }

                .dark-mode .avatar-status {
                    border-color: #0b1120;
                }

                .avatar-status.online {
                    background: #10b981;
                    animation: statusPulse 2s infinite;
                }

                @keyframes statusPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
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
                    color: rgba(255,255,255,0.7);
                }

                .user-menu-btn {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.7);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .user-menu-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    transform: scale(1.1);
                }

                .menu-dots {
                    font-size: 1.2rem;
                }

                .sidebar.rtl {
                    left: auto;
                    right: 0;
                }

                .sidebar.rtl .nav-item-content {
                    flex-direction: row-reverse;
                }

                .sidebar.rtl .active-indicator {
                    left: auto;
                    right: 0;
                    border-radius: 4px 0 0 4px;
                }

                .sidebar.rtl .nav-badge {
                    right: auto;
                    left: 1rem;
                }

                .sidebar.rtl .user-profile {
                    flex-direction: row-reverse;
                }

                .sidebar.rtl .avatar-status {
                    right: auto;
                    left: -2px;
                }

                .sidebar::-webkit-scrollbar {
                    width: 4px;
                }

                .sidebar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }

                .sidebar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                }

                .sidebar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }

                @media (max-width: 1023px) and (min-width: 768px) {
                    .sidebar {
                        width: 250px;
                    }
                    
                    .sidebar.collapsed {
                        width: 70px;
                    }
                    
                    .nav-tooltip {
                        left: 80px;
                    }
                    
                    [dir="rtl"] .nav-tooltip {
                        right: 80px;
                    }
                }

                @media (max-width: 767px) {
                    .sidebar {
                        width: 100%;
                        height: auto;
                        position: relative;
                        border-radius: 0 0 20px 20px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    }
                    
                    .sidebar.collapsed {
                        width: 100%;
                    }
                    
                    .sidebar-header {
                        padding: 1rem;
                    }
                    
                    .app-logo {
                        justify-content: center;
                    }
                    
                    .collapse-toggle {
                        display: none;
                    }
                    
                    .sidebar-nav {
                        padding: 1rem 0;
                    }
                    
                    .nav-items {
                        flex-direction: row;
                        overflow-x: auto;
                        padding: 0 0.5rem;
                        gap: 0.5rem;
                    }
                    
                    .nav-items::-webkit-scrollbar {
                        height: 3px;
                    }
                    
                    .nav-section {
                        margin-bottom: 0.5rem;
                    }
                    
                    .nav-title {
                        display: none;
                    }
                    
                    .nav-item {
                        min-width: 120px;
                        margin: 0;
                        width: auto;
                    }
                    
                    .nav-item-content {
                        flex-direction: column;
                        text-align: center;
                        padding: 0.5rem;
                    }
                    
                    .nav-text {
                        align-items: center;
                    }
                    
                    .nav-description {
                        display: none;
                    }
                    
                    .nav-badge {
                        top: 0.5rem;
                        right: 0.5rem;
                        transform: none;
                    }
                    
                    .active-indicator {
                        top: -3px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 60%;
                        height: 3px;
                        border-radius: 4px 4px 0 0;
                    }
                    
                    .sidebar.rtl .active-indicator {
                        left: 50%;
                        right: auto;
                    }
                    
                    .sidebar-footer {
                        display: none;
                    }
                    
                    .bg-particles {
                        opacity: 0.3;
                    }
                }

                @media (max-width: 479px) {
                    .sidebar-header {
                        padding: 0.75rem;
                    }
                    
                    .app-logo {
                        gap: 0.5rem;
                    }
                    
                    .logo-wrapper {
                        width: 40px;
                        height: 40px;
                    }
                    
                    .logo-icon {
                        width: 40px;
                        height: 40px;
                        font-size: 1.5rem;
                    }
                    
                    .app-name {
                        font-size: 1.2rem;
                    }
                    
                    .app-tagline {
                        font-size: 0.7rem;
                    }
                    
                    .nav-item {
                        min-width: 90px;
                    }
                    
                    .nav-icon-wrapper {
                        width: 30px;
                        height: 30px;
                    }
                    
                    .nav-icon {
                        font-size: 1.1rem;
                    }
                    
                    .nav-name {
                        font-size: 0.75rem;
                    }
                    
                    .nav-badge {
                        font-size: 0.6rem;
                        padding: 0.15rem 0.35rem;
                        min-width: 16px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .bg-particles,
                    .logo-glow,
                    .avatar-status,
                    .nav-badge,
                    .active-indicator {
                        animation: none !important;
                    }
                    
                    .nav-item:hover .nav-icon {
                        transform: none !important;
                    }
                }
            `}</style>
        </aside>
    );
}

export default Sidebar;