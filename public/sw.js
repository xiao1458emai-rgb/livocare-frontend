// public/sw.js
self.addEventListener('install', function(event) {
    console.log('✅ Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker activated');
    event.waitUntil(clients.claim());
});

// ✅ دالة للحصول على التوكين
async function getAccessToken() {
    try {
        // محاولة الحصول من IndexedDB أو من fetch
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
            return new Promise((resolve) => {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    resolve(event.data.token);
                };
                clients[0].postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
                setTimeout(() => resolve(null), 1000);
            });
        }
        return null;
    } catch (e) {
        console.error('Failed to get token:', e);
        return null;
    }
}

// ✅ دالة لحفظ الإشعار في Django
async function saveNotificationToDjango(notification) {
    try {
        const token = await getAccessToken();
        if (!token) {
            console.log('No token, skipping save to Django');
            return;
        }
        
        const response = await fetch('https://livocare.onrender.com/api/notifications/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: notification.title || 'LivoCare',
                message: notification.body || 'لديك إشعار جديد',
                type: notification.type || 'info',
                priority: notification.priority || 'medium',
                is_read: false,
                action_url: notification.url || '/notifications'
            })
        });
        
        if (response.ok) {
            console.log('✅ Notification saved to Django');
        } else {
            console.log('Failed to save notification:', response.status);
        }
    } catch (error) {
        console.error('Failed to save notification to Django:', error);
    }
}

self.addEventListener('push', function(event) {
    console.log('📱 Push received:', event);
    
    let data = {};
    try {
        data = event.data.json();
        console.log('Push data:', data);
    } catch (e) {
        data = { 
            title: 'إشعار جديد', 
            body: 'لديك إشعار جديد',
            type: 'info',
            priority: 'medium'
        };
    }
    
    const options = {
        body: data.body || 'اضغط للمزيد من التفاصيل',
        icon: data.icon || '/logo192.png',
        badge: '/badge-icon.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/notifications',
            notificationId: data.id || Date.now()
        },
        actions: [
            { action: 'open', title: '📖 عرض' },
            { action: 'dismiss', title: '❌ إغلاق' }
        ],
        requireInteraction: true
    };
    
    // ✅ عرض الإشعار وحفظه في Django
    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title || 'LivoCare', options),
            saveNotificationToDjango(data)
        ])
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'open') {
        const urlToOpen = event.notification.data.url || '/';
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(windowClients => {
                    // إذا كانت هناك نافذة مفتوحة، انتقل إليها
                    for (let client of windowClients) {
                        if (client.url.includes(urlToOpen) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // وإلا افتح نافذة جديدة
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// ✅ الاستماع لرسائل من الصفحة الرئيسية للحصول على التوكين
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOKEN_RESPONSE') {
        // تخزين التوكين مؤقتاً
        self.token = event.data.token;
    }
});