// src/components/Notifications/Notifications.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../services/api';
import './Notifications.css';

// دالة لتقريب الأرقام
const roundNumber = (num, decimals = 1) => {
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// دالة لحساب درجة الخطورة
const calculateSeverity = (type, value) => {
    if (type === 'sleep' && value < 4) return 'danger';
    if (type === 'sleep' && value < 6) return 'warning';
    if (type === 'weight' && value > 30) return 'danger';
    if (type === 'weight' && value > 25) return 'warning';
    if (type === 'activity' && value < 30) return 'danger';
    if (type === 'activity' && value < 60) return 'warning';
    if (type === 'calories' && value < 1200) return 'danger';
    if (type === 'calories' && value < 1500) return 'warning';
    if (type === 'mood' && value < 2) return 'danger';
    if (type === 'mood' && value < 3) return 'warning';
    return 'info';
};

// دالة للحصول على أيقونة حسب النوع
const getNotificationIcon = (type) => {
    const icons = {
        'health': '❤️',
        'nutrition': '🥗',
        'sleep': '🌙',
        'mood': '😊',
        'habit': '💊',
        'alert': '⚠️',
        'reminder': '⏰',
        'achievement': '🏆',
        'tip': '💡',
        'danger': '🚨',
        'warning': '⚠️',
        'success': '✅'
    };
    return icons[type] || '🔔';
};

// دالة للحصول على لون حسب النوع
const getNotificationColor = (type, severity) => {
    if (severity === 'danger') return '#ef4444';
    if (severity === 'warning') return '#f59e0b';
    if (severity === 'success') return '#10b981';
    
    const colors = {
        'health': '#ef4444',
        'nutrition': '#10b981',
        'sleep': '#8b5cf6',
        'mood': '#f59e0b',
        'habit': '#f97316',
        'alert': '#ef4444',
        'reminder': '#3b82f6',
        'achievement': '#fbbf24',
        'tip': '#8b5cf6'
    };
    return colors[type] || '#6b7280';
};

// دالة لترجمة الأولوية
const getPriorityText = (priority, t) => {
    const priorities = {
        'urgent': t('notifications.priority.urgent'),
        'high': t('notifications.priority.high'),
        'medium': t('notifications.priority.medium'),
        'low': t('notifications.priority.low')
    };
    return priorities[priority] || priority;
};

function Notifications({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [filter, setFilter] = useState('all');
    const [showStats, setShowStats] = useState(false);
    const [preferences, setPreferences] = useState({
        sleep: true,
        nutrition: true,
        activity: true,
        mood: true,
        health: true,
        habits: true,
        alerts: true
    });

    // ✅ حساب الإحصائيات من البيانات الفعلية (بدون API منفصل)
    const stats = useMemo(() => {
        const total = notifications.length;
        const unread = notifications.filter(n => !n.is_read).length;
        const read = total - unread;
        
        // إحصائيات حسب النوع
        const byType = {};
        notifications.forEach(n => {
            const type = n.type || 'general';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        // إحصائيات حسب الأولوية
        const byPriority = {};
        notifications.forEach(n => {
            const priority = n.priority || 'medium';
            byPriority[priority] = (byPriority[priority] || 0) + 1;
        });
        
        // الإشعارات خلال آخر 7 أيام
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const last7Days = notifications.filter(n => {
            const date = new Date(n.sent_at || n.created_at);
            return date >= weekAgo;
        }).length;
        
        return { total, unread, read, byType, byPriority, last7Days };
    }, [notifications]);

    // تحميل إعدادات الوضع المظلم
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('livocare_darkMode') === 'true' || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedDarkMode);
        loadPreferences();
    }, []);

    useEffect(() => {
        const handleThemeChange = (e) => {
            setDarkMode(e.detail?.darkMode ?? false);
        };
        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    useEffect(() => {
        if (isAuthReady) {
            fetchNotifications();
            
            // تحديث كل 60 ثانية
            const interval = setInterval(() => {
                fetchNotifications();
            }, 60000);
            
            return () => clearInterval(interval);
        }
    }, [isAuthReady, preferences]);

    const loadPreferences = () => {
        try {
            const saved = localStorage.getItem('notificationPreferences');
            if (saved) {
                setPreferences(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    const savePreferences = (newPrefs) => {
        setPreferences(newPrefs);
        localStorage.setItem('notificationPreferences', JSON.stringify(newPrefs));
    };

 // src/components/Notifications/Notifications.jsx

// ✅ أضف دالة مساعدة لاستخراج البيانات
const extractData = (response) => {
    if (response?.results) return response.results;
    if (Array.isArray(response)) return response;
    return [];
};

const fetchNotifications = async () => {
    setLoading(true);
    try {
        // ✅ استخدام المسار الجديد الذي يتجاوز ViewSet
        const response = await axiosInstance.get('/notifications-simple/');
        
        console.log('🔔 API Response:', response.data);
        
        let notificationsData = [];
        if (response.data?.results) {
            notificationsData = response.data.results;
        }
        
        console.log('🔔 Notifications loaded:', notificationsData.length);
        
        // تصفية حسب التفضيلات
        const filtered = notificationsData.filter(n => {
            const typeMap = {
                'sleep': preferences.sleep,
                'nutrition': preferences.nutrition,
                'activity': preferences.activity,
                'mood': preferences.mood,
                'health': preferences.health,
                'habit': preferences.habits,
                'alert': preferences.alerts
            };
            return typeMap[n.type] !== false;
        });
        
        setNotifications(filtered);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
    } finally {
        setLoading(false);
    }
};

    const markAsRead = async (id) => {
        try {
            await axiosInstance.post(`/notifications/${id}/mark_read/`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.post('/notifications/mark_all_read/');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id) => {
        if (!window.confirm(t('notifications.deleteConfirm'))) return;
        
        try {
            await axiosInstance.delete(`/notifications/${id}/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const deleteAllRead = async () => {
        if (!window.confirm(t('notifications.deleteAllReadConfirm'))) return;
        
        try {
            await axiosInstance.delete('/notifications/delete_all_read/');
            setNotifications(prev => prev.filter(n => !n.is_read));
        } catch (error) {
            console.error('Error deleting all read notifications:', error);
        }
    };

    const filterByType = async (type) => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/notifications/by_type/?type=${type}`);
            let filtered = response.data.results || response.data || [];
            
            // تصفية حسب التفضيلات
            const typeMap = {
                'sleep': preferences.sleep,
                'nutrition': preferences.nutrition,
                'activity': preferences.activity,
                'mood': preferences.mood,
                'health': preferences.health,
                'habit': preferences.habits,
                'alert': preferences.alerts
            };
            filtered = filtered.filter(n => typeMap[n.type] !== false);
            
            setNotifications(filtered);
            setFilter('all');
        } catch (error) {
            console.error('Error filtering by type:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilter('all');
        fetchNotifications();
    };

    // ✅ تصفية الإشعارات المعروضة
    const filteredNotifications = useMemo(() => {
        let filtered = notifications;
        
        if (filter === 'unread') {
            filtered = filtered.filter(n => !n.is_read);
        } else if (filter === 'read') {
            filtered = filtered.filter(n => n.is_read);
        }
        
        return filtered;
    }, [notifications, filter]);

    const formatTime = (notification) => {
        if (notification.time_ago) {
            return notification.time_ago;
        }
        
        const date = new Date(notification.sent_at || notification.created_at);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('notifications.justNow');
        if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
        if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
        
        return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
    };

    const togglePreference = (key) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        savePreferences(newPrefs);
        fetchNotifications();
    };

    if (loading && notifications.length === 0) {
        return (
            <div className={`notifications-loading ${darkMode ? 'dark-mode' : ''}`}>
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className={`notifications-container ${darkMode ? 'dark-mode' : ''}`}>
            {/* رأس الصفحة */}
            <div className="notifications-header">
                <div className="header-title">
                    <h2>
                        <span className="header-icon">🔔</span>
                        {t('notifications.title')}
                    </h2>
                    {stats.unread > 0 && (
                        <span className="unread-badge">{stats.unread}</span>
                    )}
                </div>
                
                <div className="header-actions">
                    <button 
                        className="refresh-btn"
                        onClick={() => {
                            fetchNotifications();
                        }}
                        title={t('common.refresh')}
                    >
                        🔄
                    </button>
                    
                    <button 
                        className="stats-toggle-btn"
                        onClick={() => setShowStats(!showStats)}
                        title={t('notifications.stats')}
                    >
                        📊
                    </button>
                    
                    {stats.unread > 0 && (
                        <button 
                            className="mark-all-btn"
                            onClick={markAllAsRead}
                        >
                            {t('notifications.markAllRead')}
                        </button>
                    )}
                </div>
            </div>

            {/* إحصائيات سريعة - مع بيانات صحيحة */}
            {showStats && (
                <div className="notifications-stats">
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.total')}</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.unread')}</span>
                        <span className="stat-value">{stats.unread}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.read')}</span>
                        <span className="stat-value">{stats.read}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.last7Days')}</span>
                        <span className="stat-value">{stats.last7Days}</span>
                    </div>
                </div>
            )}

            {/* تفضيلات الإشعارات */}
            <div className="preferences-section">
                <details className="preferences-details">
                    <summary>
                        <span>⚙️</span> {t('notifications.preferences')}
                    </summary>
                    <div className="preferences-grid">
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.sleep} onChange={() => togglePreference('sleep')} />
                            <span>🌙 {t('notifications.types.sleep')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.nutrition} onChange={() => togglePreference('nutrition')} />
                            <span>🥗 {t('notifications.types.nutrition')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.activity} onChange={() => togglePreference('activity')} />
                            <span>🏃 {t('notifications.types.activity')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.mood} onChange={() => togglePreference('mood')} />
                            <span>😊 {t('notifications.types.mood')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.health} onChange={() => togglePreference('health')} />
                            <span>❤️ {t('notifications.types.health')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.habits} onChange={() => togglePreference('habits')} />
                            <span>💊 {t('notifications.types.habit')}</span>
                        </label>
                        <label className="pref-item">
                            <input type="checkbox" checked={preferences.alerts} onChange={() => togglePreference('alerts')} />
                            <span>⚠️ {t('notifications.types.alert')}</span>
                        </label>
                    </div>
                </details>
            </div>

            {/* فلاتر - مع إحصائيات صحيحة */}
            <div className="notifications-filters">
                <div className="filter-row">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={resetFilters}
                    >
                        {t('notifications.all')} ({stats.total})
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        {t('notifications.unread')} ({stats.unread})
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                        onClick={() => setFilter('read')}
                    >
                        {t('notifications.read')} ({stats.read})
                    </button>
                </div>
                
                <div className="type-filters">
                    <button className="type-btn" onClick={() => filterByType('health')}>❤️ {t('notifications.types.health')}</button>
                    <button className="type-btn" onClick={() => filterByType('sleep')}>🌙 {t('notifications.types.sleep')}</button>
                    <button className="type-btn" onClick={() => filterByType('habit')}>💊 {t('notifications.types.habit')}</button>
                    <button className="type-btn" onClick={() => filterByType('achievement')}>🏆 {t('notifications.types.achievement')}</button>
                    <button className="type-btn" onClick={() => filterByType('alert')}>⚠️ {t('notifications.types.alert')}</button>
                    <button className="type-btn" onClick={() => filterByType('nutrition')}>🥗 {t('notifications.types.nutrition')}</button>
                    <button className="type-btn" onClick={() => filterByType('mood')}>😊 {t('notifications.types.mood')}</button>
                    <button className="type-btn" onClick={() => filterByType('reminder')}>⏰ {t('notifications.types.reminder')}</button>
                    <button className="type-btn" onClick={() => filterByType('tip')}>💡 {t('notifications.types.tip')}</button>
                </div>
            </div>

            {/* قائمة الإشعارات */}
            {filteredNotifications.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🔔</div>
                    <h3>{t('notifications.noNotifications')}</h3>
                    <p>{t('notifications.noNotificationsDesc')}</p>
                </div>
            ) : (
                <div className="notifications-list">
                    {filteredNotifications.map((notification) => {
                        const severity = notification.severity || calculateSeverity(notification.type, notification.value);
                        const icon = notification.icon || getNotificationIcon(notification.type);
                        const color = getNotificationColor(notification.type, severity);
                        
                        return (
                            <div 
                                key={notification.id} 
                                className={`notification-item ${!notification.is_read ? 'unread' : ''} severity-${severity}`}
                                style={{ borderRightColor: color }}
                            >
                                <div className="notification-icon" style={{ background: color + '20' }}>
                                    <span>{icon}</span>
                                </div>
                                
                                <div className="notification-content">
                                    <div className="notification-header">
                                        <h4>{notification.title}</h4>
                                        <div className="notification-meta">
                                            {notification.priority && (
                                                <span className={`priority-badge priority-${notification.priority}`}>
                                                    {getPriorityText(notification.priority, t)}
                                                </span>
                                            )}
                                            <span className="notification-time">{formatTime(notification)}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="notification-message">{notification.message}</p>
                                    
                                    {notification.action_url && (
                                        <a href={notification.action_url} className="notification-action">
                                            {notification.action_text || t('notifications.view')} →
                                        </a>
                                    )}
                                    
                                    {notification.suggestions && notification.suggestions.length > 0 && (
                                        <div className="notification-suggestions">
                                            <strong>💡 {t('notifications.suggestions')}:</strong>
                                            <ul>
                                                {notification.suggestions.map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {notification.details && (
                                        <div className="notification-details">
                                            <small>📊 {notification.details}</small>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="notification-actions">
                                    {!notification.is_read && (
                                        <button 
                                            className="mark-read-btn"
                                            onClick={() => markAsRead(notification.id)}
                                            title={t('notifications.markRead')}
                                        >
                                            ✓
                                        </button>
                                    )}
                                    <button 
                                        className="delete-btn"
                                        onClick={() => deleteNotification(notification.id)}
                                        title={t('common.delete')}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* تذييل */}
            {notifications.length > 0 && (
                <div className="notifications-footer">
                    <div className="footer-stats">
                        <small>
                            {t('notifications.total')}: {stats.total} | 
                            {t('notifications.unread')}: {stats.unread} | 
                            {t('notifications.read')}: {stats.read}
                        </small>
                    </div>
                    
                    {stats.read > 0 && (
                        <button 
                            className="delete-read-btn"
                            onClick={deleteAllRead}
                            title={t('notifications.deleteAllRead')}
                        >
                            🗑️ {t('notifications.deleteAllRead')}
                        </button>
                    )}
                </div>
            )}

            <style jsx>{`
            /* زر التوليد التلقائي */
.generate-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: white;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.generate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* زر التوليد في الحالة الفارغة */
.generate-empty-btn {
    margin-top: 16px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: white;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.generate-empty-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* رسالة التأكيد */
.notification-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    animation: slideIn 0.3s ease;
}

.notification-message.success {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid #10b981;
    color: #10b981;
}

.notification-message.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid #ef4444;
    color: #ef4444;
}

.notification-message button {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: inherit;
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
                .notifications-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 24px;
                    background: var(--bg-primary);
                    min-height: 100vh;
                }

                /* رأس الصفحة */
                .notifications-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .header-title h2 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .unread-badge {
                    background: #ef4444;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                .refresh-btn, .stats-toggle-btn, .mark-all-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    background: var(--bg-secondary);
                    cursor: pointer;
                }

                .mark-all-btn {
                    background: var(--primary-color);
                    color: white;
                }

                /* إحصائيات */
                .notifications-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                    text-align: center;
                }

                .stat-label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .stat-value {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--primary-color);
                }

                /* تفضيلات */
                .preferences-section {
                    margin-bottom: 24px;
                }

                .preferences-details {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    padding: 16px;
                }

                .preferences-details summary {
                    cursor: pointer;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .preferences-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }

                .pref-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                /* فلاتر */
                .notifications-filters {
                    margin-bottom: 24px;
                }

                .filter-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .filter-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    background: var(--bg-secondary);
                    cursor: pointer;
                }

                .filter-btn.active {
                    background: var(--primary-color);
                    color: white;
                }

                .type-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .type-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 20px;
                    background: var(--bg-secondary);
                    cursor: pointer;
                    font-size: 0.85rem;
                }

                /* قائمة الإشعارات */
                .notifications-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .notification-item {
                    display: flex;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    border-right: 3px solid;
                    transition: all 0.2s;
                }

                .notification-item.unread {
                    background: rgba(59, 130, 246, 0.1);
                }

                .notification-item.severity-danger {
                    background: rgba(239, 68, 68, 0.1);
                }

                .notification-item.severity-warning {
                    background: rgba(245, 158, 11, 0.1);
                }

                .notification-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }

                .notification-content {
                    flex: 1;
                }

                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .notification-header h4 {
                    margin: 0;
                    font-size: 1rem;
                }

                .notification-meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .priority-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                }

                .priority-badge.priority-urgent {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .priority-badge.priority-high {
                    background: rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                }

                .notification-time {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }

                .notification-message {
                    margin: 0 0 8px;
                    font-size: 0.9rem;
                }

                .notification-action {
                    display: inline-block;
                    margin-top: 8px;
                    color: var(--primary-color);
                    text-decoration: none;
                    font-size: 0.85rem;
                }

                .notification-suggestions {
                    margin-top: 12px;
                    padding: 8px;
                    background: var(--bg-primary);
                    border-radius: 8px;
                    font-size: 0.85rem;
                }

                .notification-suggestions ul {
                    margin: 4px 0 0;
                    padding-left: 20px;
                }

                .notification-details {
                    margin-top: 8px;
                    color: var(--text-secondary);
                }

                .notification-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .mark-read-btn, .delete-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .mark-read-btn {
                    background: var(--success-color);
                    color: white;
                }

                .delete-btn {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                /* حالة فارغة */
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    margin: 0 0 8px;
                }

                .empty-state p {
                    margin: 0;
                    color: var(--text-secondary);
                }

                /* تذييل */
                .notifications-footer {
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .footer-stats {
                    color: var(--text-secondary);
                }

                .delete-read-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 40px;
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    cursor: pointer;
                }

                /* حالة التحميل */
                .notifications-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* استجابة */
                @media (max-width: 768px) {
                    .notifications-container {
                        padding: 16px;
                    }
                    
                    .notifications-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .notification-item {
                        flex-direction: column;
                    }
                    
                    .notification-actions {
                        flex-direction: row;
                        justify-content: flex-end;
                    }
                    
                    .filter-row {
                        flex-wrap: wrap;
                    }
                    
                    .type-filters {
                        overflow-x: auto;
                        padding-bottom: 8px;
                    }
                }

                @media (max-width: 480px) {
                    .notifications-stats {
                        grid-template-columns: 1fr;
                    }
                    
                    .header-actions {
                        width: 100%;
                        justify-content: space-between;
                    }
                }

                /* الثيم المظلم */
                .dark-mode {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --text-primary: #eee;
                    --text-secondary: #aaa;
                    --border-color: #2a2a3e;
                    --primary-color: #667eea;
                    --success-color: #10b981;
                }
            `}</style>
        </div>
    );
}

export default Notifications;