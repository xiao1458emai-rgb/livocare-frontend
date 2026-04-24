// src/utils/pushNotifications.js
import axiosInstance from '../services/api';

const NOTIFICATION_SERVICE_URL = 'https://notification-service-6nzm.onrender.com';

// تحويل المفتاح العام من Base64 إلى Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// تسجيل Service Worker
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Worker not supported');
        return null;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        if (registration.active) {
            return registration;
        }
        
        return new Promise((resolve) => {
            if (registration.active) {
                resolve(registration);
            } else {
                registration.addEventListener('activate', () => {
                    resolve(registration);
                });
            }
        });
    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
    }
}

// الحصول على معرف المستخدم الحالي
// الحصول على معرف المستخدم الحالي
async function getCurrentUserId() {
    try {
        // ✅ الطريقة 1: استخراج userId من التوكن مباشرة
        const token = localStorage.getItem('access_token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.user_id) {
                console.log('✅ User ID from token:', payload.user_id);
                return payload.user_id;
            }
        }
        
        // ✅ الطريقة 2: استخدام /profile/ endpoint
        try {
            const response = await axiosInstance.get('/profile/');
            if (response.data?.data?.id) {
                return response.data.data.id;
            }
        } catch (e) {
            console.log('Profile endpoint failed, trying users/me...');
        }
        
        // ✅ الطريقة 3: استخدام /users/me/ (كملاذ أخير)
        const response = await axiosInstance.get('/users/me/');
        return response.data.id;
    } catch (error) {
        console.error('❌ Failed to get user ID:', error);
        return null;
    }
}

// طلب إذن الإشعارات والاشتراك
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('هذا المتصفح لا يدعم الإشعارات');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        await subscribeToPush();
        return true;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await subscribeToPush();
            return true;
        }
    }
    
    return false;
}

// الاشتراك في Push Notifications
async function subscribeToPush() {
    const registration = await registerServiceWorker();
    if (!registration) {
        console.log('❌ Cannot subscribe: No Service Worker');
        return false;
    }
    
    try {
        const VAPID_PUBLIC_KEY = 'BHlznz8R_5JWZ7C-JtA-kV60tNuqOU4vdW55C9p8iIhU6hJIHiJSH3SpkvYT_0HB81yj_P2Wv0IT5mG_YNmjf4E';
        
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        // الحصول على معرف المستخدم
        const userId = await getCurrentUserId();
        if (!userId) {
            console.error('❌ Cannot subscribe: No user ID');
            return false;
        }
        
        // ✅ إرسال الاشتراك مباشرة إلى خدمة الإشعارات
        const response = await fetch(`${NOTIFICATION_SERVICE_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                subscription: subscription
            })
        });
        
        if (response.ok) {
            console.log('✅ Push subscription saved to notification service');
        } else {
            console.error('❌ Failed to save subscription to notification service');
        }
        
        // أيضاً حفظ في Django للتوافق
        await axiosInstance.post('/push-subscribe/', subscription);
        console.log('✅ Push subscription saved to Django');
        
        return true;
    } catch (error) {
        console.error('❌ Push subscription failed:', error);
        return false;
    }
}

// إرسال إشعار تجريبي (للاختبار)
export async function sendTestNotification() {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        const response = await fetch(`${NOTIFICATION_SERVICE_URL}/notify/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '🧪 إشعار تجريبي',
                body: 'هذا إشعار تجريبي من تطبيق LivoCare!',
                icon: '/logo192.png',
                url: '/dashboard'
            })
        });
        
        const result = await response.json();
        console.log('✅ Test notification sent:', result);
    } catch (error) {
        console.error('❌ Failed to send test notification:', error);
    }
}