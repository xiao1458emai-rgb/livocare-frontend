// public/sw.js - النسخة النهائية المصححة
let cachedToken = null;

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
    // أولاً: التحقق من التوكين المخزن في المتغير العام
    if (cachedToken) {
        console.log('✅ Using cached token from variable');
        return cachedToken;
    }
    
    // ثانياً: محاولة الحصول من IndexedDB أو localStorage عبر clients
    try {
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });
        
        console.log(`Found ${clients.length} clients`);
        
        for (const client of clients) {
            const token = await new Promise((resolve) => {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    if (event.data && event.data.token) {
                        cachedToken = event.data.token;
                        resolve(cachedToken);
                    } else {
                        resolve(null);
                    }
                };
                client.postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
                setTimeout(() => resolve(null), 3000);
            });
            
            if (token) {
                console.log('✅ Token obtained from client');
                return token;
            }
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
        console.log('🔍 Getting token for saving notification...');
        const token = await getAccessToken();
        
        if (!token) {
            console.log('❌ No token available, skipping save to Django');
            return;
        }
        
        console.log('📤 Saving notification to Django with token...');
        
            // في sw.js - استخدم هذا المسار
            const response = await fetch('https://livocare.onrender.com/api/sw-notification/', {
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
            const result = await response.json();
            console.log('✅ Notification saved to Django:', result);
        } else {
            const errorText = await response.text();
            console.log('❌ Failed to save notification:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ Failed to save notification to Django:', error);
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
            self.clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(windowClients => {
                    for (let client of windowClients) {
                        if (client.url.includes(urlToOpen) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (self.clients.openWindow) {
                        return self.clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// ✅ الاستماع لرسائل من الصفحة الرئيسية
self.addEventListener('message', function(event) {
    console.log('📨 Message received in SW:', event.data);
    
    if (event.data && event.data.type === 'TOKEN') {
        cachedToken = event.data.token;
        console.log('✅ Token cached in Service Worker');
    }
    
    // الرد على طلبات GET_TOKEN
    if (event.data && event.data.type === 'GET_TOKEN' && event.ports && event.ports[0]) {
        const token = cachedToken || null;
        event.ports[0].postMessage({ token: token });
        console.log('✅ Token sent via message channel');
    }
});