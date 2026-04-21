'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../services/api';
import '../index.css';

function Sidebar({ activeSection, onSectionChange }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [notificationCount, setNotificationCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);
    
    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(motionMediaQuery.matches);
        
        const handleMotionChange = (e) => setReducedMotion(e.matches);
        motionMediaQuery.addEventListener('change', handleMotionChange);
        
        return () => motionMediaQuery.removeEventListener('change', handleMotionChange);
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const getSections = () => [
        { id: 'health', icon: '❤️', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', tooltip: t('sidebar.tooltips.health') },
        { id: 'nutrition', icon: '🥗', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', tooltip: t('sidebar.tooltips.nutrition') },
        { id: 'sleep', icon: '🌙', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', tooltip: t('sidebar.tooltips.sleep') },
        { id: 'mood', icon: '😊', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', tooltip: t('sidebar.tooltips.mood') },
        { id: 'habits', icon: '💊', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', tooltip: t('sidebar.tooltips.habits') },
        { id: 'smart', icon: '🧠', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', tooltip: t('sidebar.tooltips.smart') },
        { id: 'chat', icon: '💬', color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)', tooltip: t('sidebar.tooltips.chat') },
        { id: 'reports', icon: '📊', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', tooltip: t('sidebar.tooltips.reports') },
        { id: 'profile', icon: '👤', color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', tooltip: t('sidebar.tooltips.profile') },
    ];

    const sections = getSections();

    const getSectionInfo = (sectionId) => {
        const sectionNames = {
            health: t('sidebar.sections.health.name', 'Vital Health'),
            nutrition: t('sidebar.sections.nutrition.name', 'Nutrition'),
            sleep: t('sidebar.sections.sleep.name', 'Sleep'),
            mood: t('sidebar.sections.mood.name', 'Mood'),
            habits: t('sidebar.sections.habits.name', 'Habits & Medications'),
            smart: t('sidebar.sections.smart.name', 'Smart Features'),
            chat: t('sidebar.sections.chat.name', 'Smart Chat'),
            reports: t('sidebar.sections.reports.name', 'Reports'),
            profile: t('sidebar.sections.profile.name', 'User Management')
        };
        
        const sectionDescriptions = {
            health: t('sidebar.sections.health.description', 'Track biometric measurements'),
            nutrition: t('sidebar.sections.nutrition.description', 'Manage meals and calories'),
            sleep: t('sidebar.sections.sleep.description', 'Sleep quality and hours'),
            mood: t('sidebar.sections.mood.description', 'Track emotions and feelings'),
            habits: t('sidebar.sections.habits.description', 'Supplements and daily routine'),
            smart: t('sidebar.sections.smart.description', 'Advanced recommendations & analytics'),
            chat: t('sidebar.sections.chat.description', 'Intelligent health assistant'),
            reports: t('sidebar.sections.reports.description', 'Health reports and analytics'),
            profile: t('sidebar.sections.profile.description', 'Settings and goals')
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
            console.error(t('sidebar.errorFetchingCount'), error);
        } finally {
            isFetchingRef.current = false;
        }
    }, [t]);

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
        setIsCollapsed(!isCollapsed);
    };

    return (
        <aside 
            className={`sidebar ${isRTL ? 'rtl' : 'ltr'} ${darkMode ? 'dark-mode' : ''} ${reducedMotion ? 'reduce-motion' : ''} ${isCollapsed ? 'collapsed' : ''}`} 
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="sidebar-bg">
                <div className="bg-particles"></div>
                <div className="bg-gradient"></div>
            </div>

            <div className="sidebar-header">
                <div className="app-logo">
                    <div className="logo-wrapper">
                        <div className="logo-glow"></div>
                        <div className="logo-icon" aria-hidden="true">🏥</div>
                    </div>
                    {!isCollapsed && (
                        <div className="logo-text">
                            <span className="app-name">{t('sidebar.appName', 'LivoCare')}</span>
                            <span className="app-tagline">{t('sidebar.tagline', 'Your Health Care')}</span>
                        </div>
                    )}
                </div>
                <button 
                    className="collapse-toggle" 
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? t('sidebar.expand', 'Expand') : t('sidebar.collapse', 'Collapse')}
                    title={isCollapsed ? t('sidebar.expand', 'Expand') : t('sidebar.collapse', 'Collapse')}
                >
                    <span className="toggle-icon" aria-hidden="true">{isCollapsed ? '→' : '←'}</span>
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    {!isCollapsed && (
                        <h3 className="nav-title">
                            <span className="title-icon" aria-hidden="true">📊</span>
                            {t('sidebar.dashboard', 'Dashboard')}
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
                                    title={isCollapsed ? sectionInfo.name : undefined}
                                >
                                    <div className="nav-item-content">
                                        <div className="nav-icon-wrapper" style={{ 
                                            background: isActive ? section.gradient : 'rgba(255,255,255,0.1)'
                                        }}>
                                            <span className="nav-icon" aria-hidden="true">{section.icon}</span>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="nav-text">
                                                <span className="nav-name">{sectionInfo.name}</span>
                                                <span className="nav-description">
                                                    {sectionInfo.description}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isActive && (
                                        <>
                                            <div className="active-indicator"></div>
                                            <div className="active-glow"></div>
                                        </>
                                    )}
                                    
                                    {isCollapsed && isHovered && (
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

                <div className="nav-section extras">
                    {!isCollapsed && (
                        <h3 className="nav-title">
                            <span className="title-icon" aria-hidden="true">⚡</span>
                            {t('sidebar.extras', 'Extras')}
                        </h3>
                    )}
                    <div className="nav-items">
                        <button 
                            className={`nav-item extra-item ${activeSection === 'notifications' ? 'active' : ''}`}
                            onClick={() => onSectionChange('notifications')}
                            aria-label={t('sidebar.notifications', 'Notifications')}
                            title={isCollapsed ? t('sidebar.notifications', 'Notifications') : undefined}
                        >
                            <div className="nav-item-content">
                                <div className="nav-icon-wrapper">
                                    <span className="nav-icon" aria-hidden="true">🔔</span>
                                </div>
                                {!isCollapsed && (
                                    <div className="nav-text">
                                        <span className="nav-name">{t('sidebar.notifications', 'Notifications')}</span>
                                        <span className="nav-description">{t('sidebar.notificationsDesc', 'Latest updates and alerts')}</span>
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

            {!isCollapsed && (
                <div className="sidebar-footer">
                    <div className="user-stats">
                        <div className="stat-item">
                            <span className="stat-value">{t('sidebar.activeSectionsCount', '7')}</span>
                            <span className="stat-label">{t('sidebar.activeSections', 'Active Sections')}</span>
                        </div>
                        <div className="stat-divider" aria-hidden="true"></div>
                        <div className="stat-item">
                            <span className="stat-value">{t('sidebar.healthCoveragePercent', '100%')}</span>
                            <span className="stat-label">{t('sidebar.healthCoverage', 'Health Coverage')}</span>
                        </div>
                    </div>

                    <div className="user-profile">
                        <div className="user-avatar">
                            <span className="avatar-icon" aria-hidden="true">👤</span>
                            <div className="avatar-status online"></div>
                        </div>
                        <div className="user-info">
                            <span className="user-name">{t('sidebar.userName', 'Livocare User')}</span>
                            <span className="user-role">{t('sidebar.userRole', 'Premium User')}</span>
                        </div>
                        <button className="user-menu-btn" aria-label={t('sidebar.userMenu', 'User menu')}>
                            <span className="menu-dots" aria-hidden="true">⋮</span>
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                /* ===========================================
                   Sidebar.css - النسخة المحسنة والمطورة
                   تم التحسين لجميع أحجام الشاشات والوضع الليلي
                   =========================================== */

                /* ===== المتغيرات والثيمات ===== */
                :root {
                    --sidebar-gradient-start: #1e293b;
                    --sidebar-gradient-end: #0f172a;
                    --sidebar-text: #ffffff;
                    --sidebar-text-secondary: rgba(255,255,255,0.7);
                    --sidebar-text-tertiary: rgba(255,255,255,0.5);
                    --sidebar-bg-particles: rgba(255,255,255,0.05);
                    --sidebar-hover: rgba(255,255,255,0.1);
                    --sidebar-active: rgba(255,255,255,0.15);
                    --sidebar-border: rgba(255,255,255,0.1);
                    --sidebar-scroll: rgba(255,255,255,0.3);
                    --sidebar-scroll-hover: rgba(255,255,255,0.5);
                    --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-medium: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    --radius-sm: 8px;
                    --radius-md: 10px;
                    --radius-lg: 12px;
                    --radius-xl: 15px;
                    --radius-full: 50px;
                }

                /* الثيم المظلم المحسن */
                .dark-mode {
                    --sidebar-gradient-start: #0b1120;
                    --sidebar-gradient-end: #030712;
                    --sidebar-text: #f8fafc;
                    --sidebar-text-secondary: rgba(248,250,252,0.7);
                    --sidebar-text-tertiary: rgba(248,250,252,0.5);
                    --sidebar-bg-particles: rgba(255,255,255,0.03);
                    --sidebar-hover: rgba(255,255,255,0.15);
                    --sidebar-active: rgba(255,255,255,0.2);
                    --sidebar-border: rgba(255,255,255,0.15);
                    --sidebar-scroll: rgba(255,255,255,0.4);
                    --sidebar-scroll-hover: rgba(255,255,255,0.6);
                }

                /* ===== الحاوية الرئيسية ===== */
                .sidebar {
                    width: 280px;
                    height: 100vh;
                    background: linear-gradient(135deg, var(--sidebar-gradient-start) 0%, var(--sidebar-gradient-end) 100%);
                    color: var(--sidebar-text);
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    top: 0;
                    left: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    z-index: 1000;
                    transition: width var(--transition-medium), all var(--transition-medium);
                    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
                }

                /* وضع مصغر */
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

                /* ===== خلفية متحركة محسنة ===== */
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
                    background-image: radial-gradient(circle at 30% 40%, var(--sidebar-bg-particles) 0%, transparent 30%),
                                      radial-gradient(circle at 70% 60%, var(--sidebar-bg-particles) 0%, transparent 30%),
                                      radial-gradient(circle at 40% 80%, var(--sidebar-bg-particles) 0%, transparent 30%);
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

                /* دعم الحركة المخفضة */
                .reduce-motion .bg-particles,
                .reduce-motion .logo-glow,
                .reduce-motion .avatar-status {
                    animation: none !important;
                }

                /* ===== رأس السايدبار المحسن ===== */
                .sidebar-header {
                    padding: 2rem 1.5rem;
                    border-bottom: 1px solid var(--sidebar-border);
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
                    border-radius: var(--radius-xl);
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
                    border-radius: var(--radius-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: transform var(--transition-fast);
                }

                .logo-icon:active {
                    transform: scale(0.95);
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
                    color: var(--sidebar-text-secondary);
                    margin-top: 0.25rem;
                }

                .collapse-toggle {
                    background: var(--sidebar-hover);
                    border: none;
                    color: var(--sidebar-text);
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-fast);
                }

                .collapse-toggle:hover {
                    background: var(--sidebar-active);
                    transform: scale(1.05);
                }

                .collapse-toggle:active {
                    transform: scale(0.95);
                }

                .toggle-icon {
                    font-size: 1.2rem;
                    transition: transform var(--transition-fast);
                }

                .sidebar.collapsed .toggle-icon {
                    transform: rotate(180deg);
                }

                /* ===== قائمة التنقل المحسنة ===== */
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
                    color: var(--sidebar-text-secondary);
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
                    color: var(--sidebar-text);
                    padding: 0;
                    margin: 0 0.75rem;
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    position: relative;
                    width: calc(100% - 1.5rem);
                }

                .nav-item-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-lg);
                    transition: all var(--transition-fast);
                }

                .nav-item:hover .nav-item-content {
                    background: var(--sidebar-hover);
                    transform: translateX(5px);
                }

                .nav-item.active .nav-item-content {
                    background: var(--sidebar-active);
                }

                .nav-icon-wrapper {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-fast);
                    flex-shrink: 0;
                }

                .nav-icon {
                    font-size: 1.3rem;
                    transition: transform var(--transition-fast);
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
                    color: var(--sidebar-text-secondary);
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
                    background: var(--active-color, #ef4444);
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
                    border-radius: var(--radius-lg);
                    opacity: 0.2;
                    filter: blur(8px);
                }

                @keyframes indicatorPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                /* Tooltip للوضع المصغر */
                .nav-tooltip {
                    position: fixed;
                    left: 90px;
                    background: var(--sidebar-gradient-end);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.3));
                    z-index: 2000;
                    white-space: nowrap;
                    pointer-events: none;
                    animation: tooltipFadeIn var(--transition-fast) ease;
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
                    color: var(--sidebar-text-secondary);
                }

                /* ===== تذييل السايدبار المحسن ===== */
                .sidebar-footer {
                    padding: 1.5rem;
                    border-top: 1px solid var(--sidebar-border);
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
                    border-radius: var(--radius-lg);
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
                    color: var(--sidebar-text-secondary);
                }

                .stat-divider {
                    width: 1px;
                    height: 30px;
                    background: var(--sidebar-border);
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: var(--radius-lg);
                }

                .user-avatar {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    border-radius: var(--radius-md);
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
                    border: 2px solid var(--sidebar-gradient-end);
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
                    color: var(--sidebar-text-secondary);
                }

                .user-menu-btn {
                    background: none;
                    border: none;
                    color: var(--sidebar-text-secondary);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }

                .user-menu-btn:hover {
                    background: var(--sidebar-hover);
                    color: white;
                    transform: scale(1.1);
                }

                .user-menu-btn:active {
                    transform: scale(0.95);
                }

                .menu-dots {
                    font-size: 1.2rem;
                }

                /* ===== RTL دعم كامل ===== */
                .sidebar.rtl {
                    left: auto;
                    right: 0;
                }

                .sidebar.rtl .nav-item-content {
                    flex-direction: row-reverse;
                }

                .sidebar.rtl .active-indicator {
                    left: 0;
                    right: auto;
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

                /* ===== شريط التمرير المخصص ===== */
                .sidebar::-webkit-scrollbar {
                    width: 4px;
                }

                .sidebar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }

                .sidebar::-webkit-scrollbar-thumb {
                    background: var(--sidebar-scroll);
                    border-radius: 2px;
                }

                .sidebar::-webkit-scrollbar-thumb:hover {
                    background: var(--sidebar-scroll-hover);
                }

                /* ===== تصميم متجاوب ===== */
                
                /* شاشات متوسطة (768px - 1023px) */
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

                /* شاشات صغيرة (<768px) */
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
                        scrollbar-width: thin;
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

                /* شاشات صغيرة جداً (<480px) */
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

                /* ===== تحسينات التباين العالي ===== */
                @media (prefers-contrast: high) {
                    .nav-item.active .nav-item-content {
                        border: 2px solid var(--active-color);
                    }
                    
                    .sidebar {
                        border-right: 1px solid var(--sidebar-border);
                    }
                }

                /* ===== تحسينات للأجهزة اللمسية ===== */
                @media (hover: none) and (pointer: coarse) {
                    .nav-item:active .nav-item-content {
                        transform: scale(0.98);
                    }
                    
                    .logo-icon:active {
                        transform: scale(0.95);
                    }
                }
            `}</style>
        </aside>
    );
}

export default Sidebar;