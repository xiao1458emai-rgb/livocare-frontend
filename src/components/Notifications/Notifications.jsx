// src/components/Notifications/Notifications.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// دالة للحصول على نص الأولوية
const getPriorityText = (priority, isArabic) => {
    const priorities = {
        'urgent': isArabic ? 'عاجل' : 'Urgent',
        'high': isArabic ? 'مرتفعة' : 'High',
        'medium': isArabic ? 'متوسطة' : 'Medium',
        'low': isArabic ? 'منخفضة' : 'Low'
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
    // ✅ إعدادات اللغة - تستمع للتغييرات من ProfileManager
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang');
        return saved === 'en' ? 'en' : 'ar';
    });
    const isArabic = lang === 'ar';
    
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

    // ✅ إزالة دالة toggleLanguage - زر اللغة موجود فقط في ProfileManager

    // ✅ الاستماع لتغييرات اللغة من ProfileManager
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
            showTemporaryMessage(isArabic ? 'تمت قراءة الإشعار' : 'Notification marked as read', 'success');
        } catch (error) {
            console.error('Error marking notification as read:', error);
            showTemporaryMessage(isArabic ? 'حدث خطأ' : 'Error occurred', 'error');
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.post('/notifications/mark_all_read/');
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            showTemporaryMessage(isArabic ? 'تمت قراءة جميع الإشعارات' : 'All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error marking all as read:', error);
            showTemporaryMessage(isArabic ? 'حدث خطأ' : 'Error occurred', 'error');
        }
    };

    const deleteNotification = async (id) => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا الإشعار؟' : 'Are you sure you want to delete this notification?')) return;
        
        try {
            await axiosInstance.delete(`/notifications/${id}/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showTemporaryMessage(isArabic ? 'تم حذف الإشعار' : 'Notification deleted', 'success');
        } catch (error) {
            console.error('Error deleting notification:', error);
            showTemporaryMessage(isArabic ? 'حدث خطأ' : 'Error occurred', 'error');
        }
    };

    const deleteAllRead = async () => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف جميع الإشعارات المقروءة؟' : 'Are you sure you want to delete all read notifications?')) return;
        
        try {
            await axiosInstance.delete('/notifications/delete_all_read/');
            setNotifications(prev => prev.filter(n => !n.is_read));
            showTemporaryMessage(isArabic ? 'تم حذف الإشعارات المقروءة' : 'Read notifications deleted', 'success');
        } catch (error) {
            console.error('Error deleting all read notifications:', error);
            showTemporaryMessage(isArabic ? 'حدث خطأ' : 'Error occurred', 'error');
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
            
            // ✅ التحقق من وجود التاريخ
            const dateStr = notification.sent_at || notification.created_at;
            if (!dateStr) {
                return isArabic ? 'الآن' : 'Just now';
            }
            
            const date = new Date(dateStr);
            
            // ✅ التحقق من صحة التاريخ
            if (isNaN(date.getTime())) {
                return isArabic ? 'الآن' : 'Just now';
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return isArabic ? 'الآن' : 'Just now';
            if (diffMins < 60) return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins} minutes ago`;
            if (diffHours < 24) return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
            if (diffDays < 7) return isArabic ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
            
            return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
        };

    if (loading && notifications.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
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
                    {isArabic ? 'الإشعارات' : 'Notifications'}
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
                    <button className="refresh-btn" onClick={fetchNotifications} title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
                    {/* ✅ تم إزالة زر اللغة من هنا */}
                    <button className="stats-toggle-btn" onClick={() => setShowStats(!showStats)} title={isArabic ? 'إحصائيات' : 'Stats'}>
                        📊
                    </button>
                    <button className="stats-toggle-btn" onClick={() => setShowPreferences(!showPreferences)} title={isArabic ? 'إعدادات' : 'Settings'}>
                        ⚙️
                    </button>
                    {stats.unread > 0 && (
                        <button className="mark-all-read-btn" onClick={markAllAsRead}>
                            {isArabic ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                        </button>
                    )}
                </div>
            </div>

            {/* إحصائيات سريعة */}
            {showStats && (
                <div className="notifications-stats">
                    <div className="stat-card">
                        <span className="stat-label">{isArabic ? 'الإجمالي' : 'Total'}</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{isArabic ? 'غير مقروء' : 'Unread'}</span>
                        <span className="stat-value">{stats.unread}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{isArabic ? 'مقروء' : 'Read'}</span>
                        <span className="stat-value">{stats.read}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">{isArabic ? 'آخر 7 أيام' : 'Last 7 days'}</span>
                        <span className="stat-value">{stats.last7Days}</span>
                    </div>
                </div>
            )}

            {/* تفضيلات الإشعارات */}
            {showPreferences && (
                <div className="notification-settings">
                    <div className="settings-title">
                        <span>⚙️</span>
                        <span>{isArabic ? 'إعدادات الإشعارات' : 'Notification Settings'}</span>
                    </div>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'النوم' : 'Sleep'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.sleep} onChange={() => togglePreference('sleep')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'التغذية' : 'Nutrition'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.nutrition} onChange={() => togglePreference('nutrition')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'النشاط' : 'Activity'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.activity} onChange={() => togglePreference('activity')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'المزاج' : 'Mood'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.mood} onChange={() => togglePreference('mood')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'الصحة' : 'Health'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.health} onChange={() => togglePreference('health')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'العادات' : 'Habits'}</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={preferences.habits} onChange={() => togglePreference('habits')} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{isArabic ? 'تنبيهات' : 'Alerts'}</span>
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
                    {isArabic ? 'الكل' : 'All'} ({stats.total})
                </button>
                <button 
                    className={`type-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    {isArabic ? 'غير مقروء' : 'Unread'} ({stats.unread})
                </button>
                <button 
                    className={`type-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    {isArabic ? 'مقروء' : 'Read'} ({stats.read})
                </button>
            </div>

            <div className="type-filters">
                <button className="type-btn" onClick={() => filterByType('health')}>❤️ {isArabic ? 'الصحة' : 'Health'}</button>
                <button className="type-btn" onClick={() => filterByType('sleep')}>🌙 {isArabic ? 'النوم' : 'Sleep'}</button>
                <button className="type-btn" onClick={() => filterByType('habit')}>💊 {isArabic ? 'العادات' : 'Habits'}</button>
                <button className="type-btn" onClick={() => filterByType('achievement')}>🏆 {isArabic ? 'إنجازات' : 'Achievements'}</button>
                <button className="type-btn" onClick={() => filterByType('alert')}>⚠️ {isArabic ? 'تنبيهات' : 'Alerts'}</button>
                <button className="type-btn" onClick={() => filterByType('nutrition')}>🥗 {isArabic ? 'التغذية' : 'Nutrition'}</button>
                <button className="type-btn" onClick={() => filterByType('mood')}>😊 {isArabic ? 'المزاج' : 'Mood'}</button>
                <button className="type-btn" onClick={() => filterByType('reminder')}>⏰ {isArabic ? 'تذكيرات' : 'Reminders'}</button>
                <button className="type-btn" onClick={() => filterByType('tip')}>💡 {isArabic ? 'نصائح' : 'Tips'}</button>
            </div>

            {/* قائمة الإشعارات */}
            {filteredNotifications.length === 0 ? (
                <div className="empty-notifications">
                    <div className="empty-icon">🔔</div>
                    <h3 className="empty-title">{isArabic ? 'لا توجد إشعارات' : 'No notifications'}</h3>
                    <p className="empty-message">{isArabic ? 'ستظهر الإشعارات هنا عند توفرها' : 'Notifications will appear here when available'}</p>
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
                                                {getPriorityText(notification.priority, isArabic)}
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
                                        {notification.action_text || (isArabic ? 'عرض' : 'View')} →
                                    </a>
                                )}
                                
                                {notification.suggestions && notification.suggestions.length > 0 && (
                                    <div className="notification-suggestions" style={{ marginTop: '8px', padding: '8px', background: 'var(--tertiary-bg)', borderRadius: '8px' }}>
                                        <strong>💡 {isArabic ? 'اقتراحات' : 'Suggestions'}:</strong>
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
                                            title={isArabic ? 'تحديد كمقروء' : 'Mark as read'}
                                        >
                                            ✓ {isArabic ? 'تحديد كمقروء' : 'Mark read'}
                                        </button>
                                    )}
                                    <button 
                                        className="notification-action-btn"
                                        onClick={() => deleteNotification(notification.id)}
                                        title={isArabic ? 'حذف' : 'Delete'}
                                    >
                                        🗑️ {isArabic ? 'حذف' : 'Delete'}
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
                        <span>📊 {isArabic ? 'الإجمالي' : 'Total'}: {stats.total}</span>
                        <span>🔵 {isArabic ? 'غير مقروء' : 'Unread'}: {stats.unread}</span>
                        <span>✅ {isArabic ? 'مقروء' : 'Read'}: {stats.read}</span>
                    </div>
                    
                    {stats.read > 0 && (
                        <button className="delete-read-btn" onClick={deleteAllRead}>
                            🗑️ {isArabic ? 'حذف المقروء' : 'Delete read'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Notifications;