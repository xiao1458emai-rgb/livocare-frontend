// src/utils/pushNotifications.js
import axiosInstance from '../services/api';

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
        
        // انتظر حتى يصبح Service Worker نشطاً
        if (registration.active) {
            return registration;
        }
        
        // انتظر حتى يتم تنشيط Service Worker
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
    // ✅ أولاً: تسجيل Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
        console.log('❌ Cannot subscribe: No Service Worker');
        return false;
    }
    
    try {
        // المفتاح العام VAPID (من settings.py)
        const VAPID_PUBLIC_KEY = 'BHlznz8R_5JWZ7C-JtA-kV60tNuqOU4vdW55C9p8iIhU6hJIHiJSH3SpkvYT_0HB81yj_P2Wv0IT5mG_YNmjf4E';
        
        // الاشتراك (بعد التأكد من وجود Service Worker نشط)
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        // إرسال الاشتراك إلى الخادم
        await axiosInstance.post('/webpush/save-subscription/', subscription);
        console.log('✅ Push subscription saved to server');
        
        return true;
    } catch (error) {
        console.error('❌ Push subscription failed:', error);
        return false;
    }
}

// إرسال إشعار تجريبي (للاختبار)
export async function sendTestNotification() {
    try {
        await axiosInstance.post('/webpush/send-test-notification/');
        console.log('✅ Test notification sent');
    } catch (error) {
        console.error('❌ Failed to send test notification:', error);
    }
}