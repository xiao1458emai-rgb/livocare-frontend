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
        'urgent': t('notifications.priority.urgent', 'عاجل'),
        'high': t('notifications.priority.high', 'مرتفعة'),
        'medium': t('notifications.priority.medium', 'متوسطة'),
        'low': t('notifications.priority.low', 'منخفضة')
    };
    return priorities[priority] || priority;
};

// دالة مساعدة لاستخراج البيانات
const extractData = (response) => {
    if (response?.results) return response.results;
    if (Array.isArray(response)) return response;
    return [];
};

function Notifications({ isAuthReady }) {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showStats, setShowStats] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [message, setMessage] = useState(null);
    const [preferences, setPreferences] = useState({
        sleep: true,
        nutrition: true,
        activity: true,
        mood: true,
        health: true,
        habits: true,
        alerts: true
    });

    // حساب الإحصائيات من البيانات الفعلية
    const stats = useMemo(() => {
        const total = notifications.length;
        const unread = notifications.filter(n => !n.is_read).length;
        const read = total - unread;
        
        const byType = {};
        notifications.forEach(n => {
            const type = n.type || 'general';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        const byPriority = {};
        notifications.forEach(n => {
            const priority = n.priority || 'medium';
            byPriority[priority] = (byPriority[priority] || 0) + 1;
        });
        
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
        loadPreferences();
    }, []);

    useEffect(() => {
        if (isAuthReady) {
            fetchNotifications();
            
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

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/notifications-simple/');
            
            let notificationsData = extractData(response.data);
            
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
            showTemporaryMessage(t('notifications.markedAsRead', 'تمت قراءة الإشعار'), 'success');
        } catch (error) {
            console.error('Error marking notification as read:', error);
            showTemporaryMessage(t('common.error', 'حدث خطأ'), 'error');
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.post('/notifications/mark_all_read/');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            showTemporaryMessage(t('notifications.allMarkedAsRead', 'تمت قراءة جميع الإشعارات'), 'success');
        } catch (error) {
            console.error('Error marking all as read:', error);
            showTemporaryMessage(t('common.error', 'حدث خطأ'), 'error');
        }
    };

    const deleteNotification = async (id) => {
        if (!window.confirm(t('notifications.deleteConfirm', 'هل أنت متأكد من حذف هذا الإشعار؟'))) return;
        
        try {
            await axiosInstance.delete(`/notifications/${id}/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showTemporaryMessage(t('notifications.deleted', 'تم حذف الإشعار'), 'success');
        } catch (error) {
            console.error('Error deleting notification:', error);
            showTemporaryMessage(t('common.error', 'حدث خطأ'), 'error');
        }
    };

    const deleteAllRead = async () => {
        if (!window.confirm(t('notifications.deleteAllReadConfirm', 'هل أنت متأكد من حذف جميع الإشعارات المقروءة؟'))) return;
        
        try {
            await axiosInstance.delete('/notifications/delete_all_read/');
            setNotifications(prev => prev.filter(n => !n.is_read));
            showTemporaryMessage(t('notifications.allReadDeleted', 'تم حذف الإشعارات المقروءة'), 'success');
        } catch (error) {
            console.error('Error deleting all read notifications:', error);
            showTemporaryMessage(t('common.error', 'حدث خطأ'), 'error');
        }
    };

    const filterByType = async (type) => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/notifications/by_type/?type=${type}`);
            let filtered = extractData(response.data);
            
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

    const showTemporaryMessage = (msg, type = 'success') => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const togglePreference = (key) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        savePreferences(newPrefs);
        fetchNotifications();
    };

    // تصفية الإشعارات المعروضة
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

        if (diffMins < 1) return t('notifications.justNow', 'الآن');
        if (diffMins < 60) return t('notifications.minutesAgo', '{{count}} دقيقة', { count: diffMins });
        if (diffHours < 24) return t('notifications.hoursAgo', '{{count}} ساعة', { count: diffHours });
        if (diffDays < 7) return t('notifications.daysAgo', '{{count}} يوم', { count: diffDays });
        
        return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{t('common.loading', 'جاري التحميل...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* رسالة تأكيد */}
            {message && (
                <div className={`notification-message ${message.type}`}>
                    <span>{message.type === 'success' ? '✅' : '❌'}</span>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)}>✕</button>
                </div>
            )}

            {/* رأس الصفحة */}
            <div className="analytics-header">
                <h2>
                    <span>🔔</span>
                    {t('notifications.title', 'الإشعارات')}
                    {stats.unread > 0 && (
                        <span className="unread-badge" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '24px',
                            height: '24px',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            padding: '0 6px',
                            marginLeft: '8px'
                        }}>{stats.unread}</span>
                    )}
                </h2>
                <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button className="refresh-btn" onClick={fetchNotifications} title={t('common.refresh', 'تحديث')}>
                        🔄
                    </button>
                    <button className="stats-toggle-btn" onClick={() => setShowStats(!showStats)} title={t('notifications.stats', 'إحصائيات')}>
                        📊
                    </button>
                    <button className="stats-toggle-btn" onClick={() => setShowPreferences(!showPreferences)} title={t('notifications.preferences', 'إعدادات')}>
                        ⚙️
                    </button>
                    {stats.unread > 0 && (
                        <button className="mark-all-read-btn" onClick={markAllAsRead}>
                            {t('notifications.markAllRead', 'تحديد الكل كمقروء')}
                        </button>
                    )}
                </div>
            </div>

            {/* إحصائيات سريعة */}
            {showStats && (
                <div className="notifications-stats">
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.total', 'الإجمالي')}</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.unread', 'غير مقروء')}</span>
                        <span className="stat-value">{stats.unread}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.read', 'مقروء')}</span>
                        <span className="stat-value">{stats.read}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{t('notifications.stats.last7Days', 'آخر 7 أيام')}</span>
                        <span className="stat-value">{stats.last7Days}</span>
                    </div>
                </div>
            )}

            {/* تفضيلات الإشعارات */}
            {showPreferences && (
                <div className="notification-settings">
                    <div className="settings-title">
                        <span>⚙️</span>
                        <span>{t('notifications.preferences', 'إعدادات الإشعارات')}</span>
                    </div>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <span className="setting-label">🌙 {t('notifications.types.sleep', 'النوم')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.sleep} onChange={() => togglePreference('sleep')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">🥗 {t('notifications.types.nutrition', 'التغذية')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.nutrition} onChange={() => togglePreference('nutrition')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">🏃 {t('notifications.types.activity', 'النشاط')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.activity} onChange={() => togglePreference('activity')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">😊 {t('notifications.types.mood', 'المزاج')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.mood} onChange={() => togglePreference('mood')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">❤️ {t('notifications.types.health', 'الصحة')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.health} onChange={() => togglePreference('health')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">💊 {t('notifications.types.habit', 'العادات')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.habits} onChange={() => togglePreference('habits')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">⚠️ {t('notifications.types.alert', 'تنبيهات')}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.alerts} onChange={() => togglePreference('alerts')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* فلاتر */}
            <div className="filter-row">
                <button 
                    className={`type-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={resetFilters}
                >
                    {t('notifications.all', 'الكل')} ({stats.total})
                </button>
                <button 
                    className={`type-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    {t('notifications.unread', 'غير مقروء')} ({stats.unread})
                </button>
                <button 
                    className={`type-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    {t('notifications.read', 'مقروء')} ({stats.read})
                </button>
            </div>

            <div className="type-filters">
                <button className="type-btn" onClick={() => filterByType('health')}>❤️ {t('notifications.types.health', 'الصحة')}</button>
                <button className="type-btn" onClick={() => filterByType('sleep')}>🌙 {t('notifications.types.sleep', 'النوم')}</button>
                <button className="type-btn" onClick={() => filterByType('habit')}>💊 {t('notifications.types.habit', 'العادات')}</button>
                <button className="type-btn" onClick={() => filterByType('achievement')}>🏆 {t('notifications.types.achievement', 'إنجازات')}</button>
                <button className="type-btn" onClick={() => filterByType('alert')}>⚠️ {t('notifications.types.alert', 'تنبيهات')}</button>
                <button className="type-btn" onClick={() => filterByType('nutrition')}>🥗 {t('notifications.types.nutrition', 'التغذية')}</button>
                <button className="type-btn" onClick={() => filterByType('mood')}>😊 {t('notifications.types.mood', 'المزاج')}</button>
                <button className="type-btn" onClick={() => filterByType('reminder')}>⏰ {t('notifications.types.reminder', 'تذكيرات')}</button>
                <button className="type-btn" onClick={() => filterByType('tip')}>💡 {t('notifications.types.tip', 'نصائح')}</button>
            </div>

            {/* قائمة الإشعارات */}
            {filteredNotifications.length === 0 ? (
                <div className="empty-notifications">
                    <div className="empty-icon">🔔</div>
                    <h3 className="empty-title">{t('notifications.noNotifications', 'لا توجد إشعارات')}</h3>
                    <p className="empty-message">{t('notifications.noNotificationsDesc', 'ستظهر الإشعارات هنا عند توفرها')}</p>
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
                                className={`notification-card ${!notification.is_read ? 'unread' : 'read'}`}
                            >
                                <div className="notification-header">
                                    <div className="notification-title">
                                        <span className="notification-icon">{icon}</span>
                                        <span>{notification.title}</span>
                                        {notification.priority && (
                                            <span className={`priority-badge priority-${notification.priority}`}>
                                                {getPriorityText(notification.priority, t)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="notification-meta">
                                        <span className="notification-time">{formatTime(notification)}</span>
                                        <span className="notification-type">
                                            {notification.type}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="notification-content">
                                    {notification.message}
                                </div>
                                
                                {notification.action_url && (
                                    <a href={notification.action_url} className="notification-action" style={{ display: 'inline-block', marginTop: '8px', color: 'var(--primary)', textDecoration: 'none' }}>
                                        {notification.action_text || t('notifications.view', 'عرض')} →
                                    </a>
                                )}
                                
                                {notification.suggestions && notification.suggestions.length > 0 && (
                                    <div className="notification-suggestions" style={{ marginTop: '8px', padding: '8px', background: 'var(--tertiary-bg)', borderRadius: '8px' }}>
                                        <strong>💡 {t('notifications.suggestions', 'اقتراحات')}:</strong>
                                        <ul style={{ margin: '4px 0 0 20px' }}>
                                            {notification.suggestions.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="notification-actions">
                                    {!notification.is_read && (
                                        <button 
                                            className="notification-action-btn"
                                            onClick={() => markAsRead(notification.id)}
                                            title={t('notifications.markRead', 'تحديد كمقروء')}
                                        >
                                            ✓ {t('notifications.markRead', 'تحديد كمقروء')}
                                        </button>
                                    )}
                                    <button 
                                        className="notification-action-btn"
                                        onClick={() => deleteNotification(notification.id)}
                                        title={t('common.delete', 'حذف')}
                                    >
                                        🗑️ {t('common.delete', 'حذف')}
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
                        <span>📊 {t('notifications.total', 'الإجمالي')}: {stats.total}</span>
                        <span>🔵 {t('notifications.unread', 'غير مقروء')}: {stats.unread}</span>
                        <span>✅ {t('notifications.read', 'مقروء')}: {stats.read}</span>
                    </div>
                    
                    {stats.read > 0 && (
                        <button className="delete-read-btn" onClick={deleteAllRead}>
                            🗑️ {t('notifications.deleteAllRead', 'حذف المقروء')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Notifications;