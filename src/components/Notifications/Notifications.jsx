// src/components/Notifications/Notifications.jsx
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '../../services/api';
import '../../index.css';

// ============================================================
// دوال مساعدة
// ============================================================

// دالة مساعدة لاستخراج البيانات من API response
const extractData = (response) => {
    if (response?.results) return response.results;
    if (Array.isArray(response)) return response;
    return [];
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

function Notifications({ isAuthReady }) {
    // ✅ إعدادات اللغة
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('app_lang') || localStorage.getItem('i18nextLng') || 'ar';
        return saved.startsWith('ar') ? 'ar' : 'en';
    });
    const isArabic = lang === 'ar';
    
    // ✅ الحالات (States)
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

    // ============================================================
    // التأثيرات (Effects)
    // ============================================================

    // ✅ الاستماع لتغييرات اللغة
    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLang = event.detail?.lang || event.detail?.language;
            if (newLang) {
                setLang(newLang.startsWith('ar') ? 'ar' : 'en');
            }
        };
        
        window.addEventListener('languageChanged', handleLanguageChange);
        window.addEventListener('languageChange', handleLanguageChange);
        
        return () => {
            window.removeEventListener('languageChanged', handleLanguageChange);
            window.removeEventListener('languageChange', handleLanguageChange);
        };
    }, []);

    // ✅ تحميل التفضيلات
    useEffect(() => {
        loadPreferences();
    }, []);

    // ✅ جلب الإشعارات عند التحميل
    useEffect(() => {
        if (isAuthReady) {
            fetchNotifications();
            
            const interval = setInterval(() => {
                fetchNotifications();
            }, 60000);
            
            return () => clearInterval(interval);
        }
    }, [isAuthReady, preferences]);

    // ============================================================
    // الدوال (Functions)
    // ============================================================

    // تحميل التفضيلات
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

    // حفظ التفضيلات
    const savePreferences = (newPrefs) => {
        setPreferences(newPrefs);
        localStorage.setItem('notificationPreferences', JSON.stringify(newPrefs));
    };

    // جلب الإشعارات من API
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/notifications/');
            
            let notificationsData = extractData(response.data);
            
            console.log('🔔 Notifications fetched:', notificationsData.length);
            
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

    // تحديد إشعار كمقروء
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

    // تحديد جميع الإشعارات كمقروءة
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

    // حذف إشعار واحد
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

    // حذف جميع الإشعارات المقروءة
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

    // تصفية حسب النوع
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

    // إعادة تعيين الفلاتر
    const resetFilters = () => {
        setFilter('all');
        fetchNotifications();
    };

    // إظهار رسالة مؤقتة
    const showTemporaryMessage = (msg, type = 'success') => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(null), 3000);
    };

    // تبديل تفضيل
    const togglePreference = (key) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        savePreferences(newPrefs);
        fetchNotifications();
    };

    // ============================================================
    // الإحصائيات المحسوبة
    // ============================================================

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
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const last7Days = notifications.filter(n => {
            const date = new Date(n.sent_at || n.created_at);
            return !isNaN(date.getTime()) && date >= weekAgo;
        }).length;
        
        return { total, unread, read, byType, last7Days };
    }, [notifications]);

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

    // ============================================================
    // تنسيق الوقت
    // ============================================================

    const formatTime = (notification) => {
        if (notification.time_ago) {
            return notification.time_ago;
        }
        
        const dateStr = notification.sent_at || notification.created_at;
        
        if (!dateStr) {
            return isArabic ? 'تاريخ غير معروف' : 'Unknown date';
        }
        
        try {
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
                return isArabic ? 'تاريخ غير صالح' : 'Invalid date';
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffDays > 7) {
                return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            if (diffDays >= 1) {
                return isArabic ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
            }
            if (diffHours >= 1) {
                return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
            }
            if (diffMins >= 1) {
                return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins} minutes ago`;
            }
            
            return isArabic ? 'الآن' : 'Just now';
        } catch (error) {
            console.error('Error formatting date:', error);
            return isArabic ? 'تاريخ غير معروف' : 'Unknown date';
        }
    };

    // ============================================================
    // حالة التحميل
    // ============================================================
    
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

    // ============================================================
    // العرض الرئيسي
    // ============================================================
    
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
                        <span className="unread-badge">{stats.unread}</span>
                    )}
                </h2>
                <div className="header-actions">
                    <button className="refresh-btn" onClick={fetchNotifications} title={isArabic ? 'تحديث' : 'Refresh'}>
                        🔄
                    </button>
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

            {/* فلاتر الحالة */}
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

            {/* فلاتر النوع */}
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
                                style={{ borderRight: `4px solid ${color}` }}
                            >
                                <div className="notification-header">
                                    <div className="notification-title">
                                        <span className="notification-icon">{icon}</span>
                                        <span className="notification-title-text">{notification.title}</span>
                                        {notification.priority && (
                                            <span className={`priority-badge priority-${notification.priority}`}>
                                                {getPriorityText(notification.priority, isArabic)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="notification-meta">
                                        <span className="notification-time">{formatTime(notification)}</span>
                                    </div>
                                </div>
                                
                                <div className="notification-message">
                                    {notification.message}
                                </div>
                                
                                {notification.suggestions && notification.suggestions.length > 0 && (
                                    <div className="notification-suggestions">
                                        <strong>💡 {isArabic ? 'اقتراحات' : 'Suggestions'}</strong>
                                        <ul>
                                            {notification.suggestions.slice(0, 3).map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="notification-actions">
                                    {!notification.is_read && (
                                        <button 
                                            className="action-btn mark-read-btn"
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            ✓ {isArabic ? 'تحديد كمقروء' : 'Mark read'}
                                        </button>
                                    )}
                                    <button 
                                        className="action-btn delete-btn"
                                        onClick={() => deleteNotification(notification.id)}
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
              <style jsx>{`
/* ===========================================
   Notifications.css - الأنماط الداخلية فقط
   ✅ نظام الإشعارات - تصميم نظيف وواضح
   ✅ متوافق مع الثيمين (فاتح/داكن)
   ✅ بدون أي تأثير على التخطيط العام
   =========================================== */

/* ===== الحاوية الرئيسية ===== */
.analytics-container {
    background: var(--card-bg, #ffffff);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.analytics-container.dark-mode {
    background: #1e293b;
}

/* ===== رأس الصفحة ===== */
.analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.analytics-header h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .analytics-header h2 {
    color: #f1f5f9;
}

.unread-badge {
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.refresh-btn,
.stats-toggle-btn,
.mark-all-read-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #64748b);
}

.dark-mode .refresh-btn,
.dark-mode .stats-toggle-btn,
.dark-mode .mark-all-read-btn {
    background: #334155;
    color: #94a3b8;
}

.refresh-btn:hover,
.stats-toggle-btn:hover {
    background: #6366f1;
    color: white;
    transform: rotate(180deg);
}

.mark-all-read-btn {
    width: auto;
    padding: 0 1rem;
    font-size: 0.75rem;
    gap: 0.25rem;
}

.mark-all-read-btn:hover {
    background: #10b981;
    color: white;
    transform: none;
}

/* ===== رسالة التأكيد ===== */
.notification-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    margin-bottom: 1rem;
    animation: slideDown 0.3s ease;
}

.notification-message.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid #10b981;
    color: #10b981;
}

.notification-message.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    color: #ef4444;
}

.notification-message button {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== إحصائيات سريعة ===== */
.notifications-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 16px;
    padding: 0.75rem;
    text-align: center;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .stat-card {
    background: #0f172a;
    border-color: #334155;
}

.stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .stat-value {
    color: #f1f5f9;
}

/* ===== إعدادات الإشعارات ===== */
.notification-settings {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .notification-settings {
    background: #0f172a;
    border-color: #334155;
}

.settings-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark-mode .settings-title {
    color: #f1f5f9;
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--card-bg, #ffffff);
    border-radius: 12px;
}

.dark-mode .setting-item {
    background: #1e293b;
}

.setting-label {
    font-size: 0.8rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .setting-label {
    color: #f1f5f9;
}

/* ===== مفتاح التبديل (Toggle Switch) ===== */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 34px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: #6366f1;
}

input:checked + .toggle-slider:before {
    transform: translateX(20px);
}

.dark-mode .toggle-slider {
    background-color: #475569;
}

/* ===== فلاتر ===== */
.filter-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.type-filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.type-btn {
    background: var(--secondary-bg, #f1f5f9);
    border: 1px solid var(--border-light, #e2e8f0);
    padding: 0.4rem 1rem;
    border-radius: 40px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .type-btn {
    background: #334155;
    border-color: #475569;
    color: #94a3b8;
}

.type-btn:hover {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
}

.type-btn.active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
}

/* ===== قائمة الإشعارات ===== */
.notifications-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1.5rem 0;
}

.notification-card {
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    padding: 1rem;
    transition: all 0.2s;
    border: 1px solid var(--border-light, #e2e8f0);
    position: relative;
}

[dir="rtl"] .notification-card {
    border-right: 4px solid;
    border-left: none;
}

[dir="ltr"] .notification-card {
    border-left: 4px solid;
    border-right: none;
}

.notification-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode .notification-card {
    background: #0f172a;
    border-color: #334155;
}

.dark-mode .notification-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.notification-card.unread {
    background: var(--card-bg, #ffffff);
}

.dark-mode .notification-card.unread {
    background: #1e293b;
}

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.notification-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.notification-icon {
    font-size: 1.2rem;
}

.notification-title-text {
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

.dark-mode .notification-title-text {
    color: #f1f5f9;
}

.notification-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.notification-time {
    font-size: 0.65rem;
    color: var(--text-tertiary, #94a3b8);
}

.priority-badge {
    font-size: 0.6rem;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-weight: 600;
}

.priority-badge.priority-urgent {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.priority-badge.priority-high {
    background: rgba(249, 115, 22, 0.15);
    color: #f97316;
}

.priority-badge.priority-medium {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.priority-badge.priority-low {
    background: rgba(100, 116, 139, 0.15);
    color: #64748b;
}

.notification-message {
    font-size: 0.85rem;
    color: var(--text-secondary, #64748b);
    margin: 0.5rem 0;
    line-height: 1.4;
}

.notification-suggestions {
    background: var(--tertiary-bg, #f1f5f9);
    border-radius: 12px;
    padding: 0.5rem 0.75rem;
    margin: 0.5rem 0;
}

.dark-mode .notification-suggestions {
    background: #0f172a;
}

.notification-suggestions strong {
    font-size: 0.7rem;
    color: var(--text-primary, #0f172a);
}

.dark-mode .notification-suggestions strong {
    color: #f1f5f9;
}

.notification-suggestions ul {
    margin: 0.25rem 0 0 1rem;
    font-size: 0.7rem;
    color: var(--text-secondary, #64748b);
}

[dir="rtl"] .notification-suggestions ul {
    margin: 0.25rem 1rem 0 0;
}

.notification-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.action-btn {
    background: transparent;
    border: 1px solid var(--border-light, #e2e8f0);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.65rem;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .action-btn {
    border-color: #475569;
    color: #94a3b8;
}

.action-btn:hover {
    transform: translateY(-1px);
}

.mark-read-btn:hover {
    background: #10b981;
    border-color: #10b981;
    color: white;
}

.delete-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
}

/* ===== حالة عدم وجود إشعارات ===== */
.empty-notifications {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--secondary-bg, #f8fafc);
    border-radius: 20px;
    border: 1px solid var(--border-light, #e2e8f0);
}

.dark-mode .empty-notifications {
    background: #0f172a;
    border-color: #334155;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    margin: 0 0 0.5rem 0;
}

.dark-mode .empty-title {
    color: #f1f5f9;
}

.empty-message {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    margin: 0;
}

/* ===== تذييل الإشعارات ===== */
.notifications-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #e2e8f0);
    margin-top: 1rem;
}

.dark-mode .notifications-footer {
    border-top-color: #334155;
}

.footer-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.7rem;
    color: var(--text-tertiary, #94a3b8);
}

.delete-read-btn {
    background: transparent;
    border: 1px solid var(--border-light, #e2e8f0);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.2s;
    color: var(--text-secondary, #64748b);
}

.dark-mode .delete-read-btn {
    border-color: #475569;
    color: #94a3b8;
}

.delete-read-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
}

/* ===== حالات التحميل ===== */
.analytics-loading {
    text-align: center;
    padding: 2rem;
    background: var(--card-bg, #ffffff);
    border-radius: 20px;
}

.dark-mode .analytics-loading {
    background: #1e293b;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light, #e2e8f0);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== دعم RTL ===== */
[dir="rtl"] .notification-message button {
    margin-left: 0;
    margin-right: auto;
}

[dir="rtl"] .header-actions {
    flex-direction: row-reverse;
}

[dir="rtl"] .settings-grid {
    direction: rtl;
}

/* ===== استجابة الشاشات الصغيرة ===== */
@media (max-width: 768px) {
    .analytics-container {
        padding: 1rem;
    }
    
    .notifications-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
    }
    
    .settings-grid {
        grid-template-columns: 1fr;
    }
    
    .notification-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .notification-title {
        flex-wrap: wrap;
    }
    
    .notifications-footer {
        flex-direction: column;
        align-items: center;
    }
    
    .footer-stats {
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .type-filters {
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 0.5rem;
    }
    
    .type-btn {
        flex-shrink: 0;
    }
}

@media (max-width: 480px) {
    .analytics-header {
        flex-direction: column;
        align-items: stretch;
    }
    
    .header-actions {
        justify-content: flex-start;
    }
    
    .notifications-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .notification-actions {
        flex-direction: column;
    }
    
    .action-btn {
        text-align: center;
    }
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
    .refresh-btn:hover,
    .stats-toggle-btn:hover,
    .notification-card:hover,
    .action-btn:hover {
        transform: none;
    }
    
    .spinner {
        animation: none;
    }
    
    .notification-message {
        animation: none;
    }
}

/* ===== دعم التباين العالي ===== */
@media (prefers-contrast: high) {
    .notification-card {
        border-width: 2px;
    }
    
    .type-btn.active {
        border: 2px solid currentColor;
    }
    
    .priority-badge {
        border: 1px solid currentColor;
    }
}
            `}</style>

        </div>
    );
}

export default Notifications;