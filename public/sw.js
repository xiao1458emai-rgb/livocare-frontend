// public/sw.js
self.addEventListener('install', function(event) {
    console.log('✅ Service Worker installed');
    self.skipWaiting(); // تنشيط Service Worker فوراً
});

self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker activated');
    event.waitUntil(clients.claim()); // السيطرة على الصفحات فوراً
});

self.addEventListener('push', function(event) {
    console.log('📱 Push received:', event);
    
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'إشعار جديد', body: 'لديك إشعار جديد' };
    }
    
    const options = {
        body: data.body || 'اضغط للمزيد من التفاصيل',
        icon: data.icon || '/logo192.png',
        badge: '/badge-icon.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: '📖 عرض' },
            { action: 'dismiss', title: '❌ إغلاق' }
        ],
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'LivoCare', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});