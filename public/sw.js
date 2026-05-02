// // public/sw.js - النسخة النهائية المصححة
// let cachedToken = null;

// self.addEventListener('install', function(event) {
//     console.log('✅ Service Worker installed');
//     self.skipWaiting();
// });

// self.addEventListener('activate', function(event) {
//     console.log('✅ Service Worker activated');
//     event.waitUntil(clients.claim());
// });

// // ✅ دالة للحصول على التوكين
// async function getAccessToken() {
//     // أولاً: التحقق من التوكين المخزن في المتغير العام
//     if (cachedToken) {
//         console.log('✅ Using cached token from variable');
//         return cachedToken;
//     }
    
//     // ثانياً: محاولة الحصول من IndexedDB أو localStorage عبر clients
//     try {
//         const clients = await self.clients.matchAll({
//             type: 'window',
//             includeUncontrolled: true
//         });
        
//         console.log(`Found ${clients.length} clients`);
        
//         for (const client of clients) {
//             const token = await new Promise((resolve) => {
//                 const channel = new MessageChannel();
//                 channel.port1.onmessage = (event) => {
//                     if (event.data && event.data.token) {
//                         cachedToken = event.data.token;
//                         resolve(cachedToken);
//                     } else {
//                         resolve(null);
//                     }
//                 };
//                 client.postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
//                 setTimeout(() => resolve(null), 3000);
//             });
            
//             if (token) {
//                 console.log('✅ Token obtained from client');
//                 return token;
//             }
//         }
//         return null;
//     } catch (e) {
//         console.error('Failed to get token:', e);
//         return null;
//     }
// }

// // ✅ دالة لحفظ الإشعار في Django
// async function saveNotificationToDjango(notification) {
//     try {
//         console.log('🔍 Getting token for saving notification...');
//         const token = await getAccessToken();
        
//         if (!token) {
//             console.log('❌ No token available, skipping save to Django');
//             return;
//         }
        
//         console.log('📤 Saving notification to Django with token...');
        
//             // في sw.js - استخدم هذا المسار
//             const response = await fetch('https://livocare-backend.onrender.com/api/sw-notification/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title: notification.title || 'LivoCare',
//                     message: notification.body || 'لديك إشعار جديد',
//                     type: notification.type || 'info',
//                     priority: notification.priority || 'medium',
//                     is_read: false,
//                     action_url: notification.url || '/notifications'
//                 })
//             });
        
//         if (response.ok) {
//             const result = await response.json();
//             console.log('✅ Notification saved to Django:', result);
//         } else {
//             const errorText = await response.text();
//             console.log('❌ Failed to save notification:', response.status, errorText);
//         }
//     } catch (error) {
//         console.error('❌ Failed to save notification to Django:', error);
//     }
// }

// self.addEventListener('push', function(event) {
//     console.log('📱 Push received:', event);
    
//     let data = {};
//     try {
//         data = event.data.json();
//         console.log('Push data:', data);
//     } catch (e) {
//         data = { 
//             title: 'إشعار جديد', 
//             body: 'لديك إشعار جديد',
//             type: 'info',
//             priority: 'medium'
//         };
//     }
    
//     const options = {
//         body: data.body || 'اضغط للمزيد من التفاصيل',
//         icon: data.icon || '/logo192.png',
//         badge: '/badge-icon.png',
//         vibrate: [200, 100, 200],
//         data: {
//             url: data.url || '/notifications',
//             notificationId: data.id || Date.now()
//         },
//         actions: [
//             { action: 'open', title: '📖 عرض' },
//             { action: 'dismiss', title: '❌ إغلاق' }
//         ],
//         requireInteraction: true
//     };
    
//     event.waitUntil(
//         Promise.all([
//             self.registration.showNotification(data.title || 'LivoCare', options),
//             saveNotificationToDjango(data)
//         ])
//     );
// });

// self.addEventListener('notificationclick', function(event) {
//     console.log('🔔 Notification clicked:', event);
//     event.notification.close();
    
//     if (event.action === 'open') {
//         const urlToOpen = event.notification.data.url || '/';
//         event.waitUntil(
//             self.clients.matchAll({ type: 'window', includeUncontrolled: true })
//                 .then(windowClients => {
//                     for (let client of windowClients) {
//                         if (client.url.includes(urlToOpen) && 'focus' in client) {
//                             return client.focus();
//                         }
//                     }
//                     if (self.clients.openWindow) {
//                         return self.clients.openWindow(urlToOpen);
//                     }
//                 })
//         );
//     }
// });

// // ✅ الاستماع لرسائل من الصفحة الرئيسية
// self.addEventListener('message', function(event) {
//     console.log('📨 Message received in SW:', event.data);
    
//     if (event.data && event.data.type === 'TOKEN') {
//         cachedToken = event.data.token;
//         console.log('✅ Token cached in Service Worker');
//     }
    
//     // الرد على طلبات GET_TOKEN
//     if (event.data && event.data.type === 'GET_TOKEN' && event.ports && event.ports[0]) {
//         const token = cachedToken || null;
//         event.ports[0].postMessage({ token: token });
//         console.log('✅ Token sent via message channel');
//     }
// });
// // public/sw.js - أضف هذه الوظائف الجديدة

// // ✅ تخزين التوكينات في Cache API (لتبقى متاحة حتى بعد إغلاق المتصفح)
// const TOKEN_CACHE_KEY = 'auth-tokens';

// async function saveTokensToCache(accessToken, refreshToken) {
//     try {
//         const cache = await caches.open(TOKEN_CACHE_KEY);
//         const response = new Response(JSON.stringify({
//             accessToken,
//             refreshToken,
//             updatedAt: Date.now()
//         }));
//         await cache.put('/tokens', response);
//         console.log('✅ Tokens saved to cache');
//     } catch (e) {
//         console.error('Failed to save tokens to cache:', e);
//     }
// }

// async function getTokensFromCache() {
//     try {
//         const cache = await caches.open(TOKEN_CACHE_KEY);
//         const response = await cache.match('/tokens');
//         if (response) {
//             const data = await response.json();
//             console.log('✅ Tokens retrieved from cache');
//             return data;
//         }
//     } catch (e) {
//         console.error('Failed to get tokens from cache:', e);
//     }
//     return null;
// }

// // ✅ التحقق من صلاحية التوكين
// function isTokenExpired(token) {
//     if (!token) return true;
//     try {
//         const payload = JSON.parse(atob(token.split('.')[1]));
//         const expiryTime = payload.exp * 1000;
//         return Date.now() >= expiryTime - 60000; // تنبيه قبل دقيقة من الانتهاء
//     } catch (e) {
//         return true;
//     }
// }

// // ✅ تجديد التوكين باستخدام refresh_token
// async function refreshAccessToken() {
//     const tokens = await getTokensFromCache();
//     if (!tokens || !tokens.refreshToken) {
//         console.log('❌ No refresh token available');
//         return null;
//     }
    
//     try {
//         const response = await fetch('https://livocare-backend.onrender.com/api/auth/token/refresh/', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ refresh: tokens.refreshToken })
//         });
        
//         if (response.ok) {
//             const data = await response.json();
//             if (data.access) {
//                 // تحديث التوكين في الذاكرة والـ cache
//                 cachedToken = data.access;
//                 await saveTokensToCache(data.access, tokens.refreshToken);
//                 console.log('✅ Token refreshed successfully');
//                 return data.access;
//             }
//         } else {
//             console.log('❌ Token refresh failed:', response.status);
//             // إذا فشل التجديد، قد نحتاج إلى إعلام المستخدم
//             await notifyUserToReLogin();
//         }
//     } catch (e) {
//         console.error('❌ Error refreshing token:', e);
//     }
//     return null;
// }

// // ✅ إعلام المستخدم بأنه يحتاج إلى إعادة تسجيل الدخول
// async function notifyUserToReLogin() {
//     const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
//     for (const client of clients) {
//         client.postMessage({ 
//             type: 'SESSION_EXPIRED', 
//             message: 'جلسة الدخول انتهت، يرجى تسجيل الدخول مرة أخرى' 
//         });
//     }
// }

// // ✅ تحديث دالة getAccessToken لتشمل التحقق من الصلاحية والتجديد
// async function getAccessToken() {
//     // أولاً: التحقق من التوكين المخزن في المتغير العام
//     if (cachedToken && !isTokenExpired(cachedToken)) {
//         console.log('✅ Using valid cached token');
//         return cachedToken;
//     }
    
//     // ثانياً: محاولة الحصول من الـ cache
//     const tokens = await getTokensFromCache();
//     if (tokens && tokens.accessToken && !isTokenExpired(tokens.accessToken)) {
//         console.log('✅ Using valid token from cache');
//         cachedToken = tokens.accessToken;
//         return cachedToken;
//     }
    
//     // ثالثاً: محاولة تجديد التوكين
//     console.log('🔄 Token expired or missing, attempting refresh...');
//     const newToken = await refreshAccessToken();
//     if (newToken) {
//         return newToken;
//     }
    
//     // رابعاً: محاولة الحصول من clients (الصفحة المفتوحة)
//     try {
//         const clients = await self.clients.matchAll({
//             type: 'window',
//             includeUncontrolled: true
//         });
        
//         console.log(`Found ${clients.length} clients for token request`);
        
//         for (const client of clients) {
//             const token = await new Promise((resolve) => {
//                 const channel = new MessageChannel();
//                 channel.port1.onmessage = (event) => {
//                     if (event.data && event.data.token) {
//                         cachedToken = event.data.token;
//                         // حفظ في cache أيضاً
//                         if (event.data.refreshToken) {
//                             saveTokensToCache(event.data.token, event.data.refreshToken);
//                         }
//                         resolve(cachedToken);
//                     } else {
//                         resolve(null);
//                     }
//                 };
//                 client.postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
//                 setTimeout(() => resolve(null), 3000);
//             });
            
//             if (token) {
//                 console.log('✅ Token obtained from client');
//                 return token;
//             }
//         }
//         return null;
//     } catch (e) {
//         console.error('Failed to get token:', e);
//         return null;
//     }
// }

// // ✅ تحديث دالة saveNotificationToDjango لتجربة التجديد إذا فشل الحفظ
// async function saveNotificationToDjango(notification) {
//     try {
//         console.log('🔍 Getting token for saving notification...');
//         let token = await getAccessToken();
        
//         if (!token) {
//             console.log('❌ No token available, skipping save to Django');
//             return;
//         }
        
//         console.log('📤 Saving notification to Django with token...');
        
//         const response = await fetch('https://livocare-backend.onrender.com/api/sw-notification/', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token}`
//             },
//             body: JSON.stringify({
//                 title: notification.title || 'LivoCare',
//                 message: notification.body || 'لديك إشعار جديد',
//                 type: notification.type || 'info',
//                 priority: notification.priority || 'medium',
//                 is_read: false,
//                 action_url: notification.url || '/notifications'
//             })
//         });
        
//         if (response.ok) {
//             const result = await response.json();
//             console.log('✅ Notification saved to Django:', result);
//         } else if (response.status === 401) {
//             // ✅ التوكين منتهي - حاول التجديد مرة أخرى
//             console.log('⚠️ Token expired, trying to refresh...');
//             cachedToken = null; // مسح التوكين المخزن
//             const newToken = await refreshAccessToken();
            
//             if (newToken) {
//                 // أعد المحاولة مرة واحدة
//                 const retryResponse = await fetch('https://livocare-backend.onrender.com/api/sw-notification/', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${newToken}`
//                     },
//                     body: JSON.stringify({
//                         title: notification.title || 'LivoCare',
//                         message: notification.body || 'لديك إشعار جديد',
//                         type: notification.type || 'info',
//                         priority: notification.priority || 'medium',
//                         is_read: false,
//                         action_url: notification.url || '/notifications'
//                     })
//                 });
                
//                 if (retryResponse.ok) {
//                     console.log('✅ Notification saved after token refresh');
//                 } else {
//                     console.log('❌ Failed to save even after token refresh');
//                 }
//             }
//         } else {
//             const errorText = await response.text();
//             console.log('❌ Failed to save notification:', response.status, errorText);
//         }
//     } catch (error) {
//         console.error('❌ Failed to save notification to Django:', error);
//     }
// }

// // ✅ الاستماع لرسائل تحتوي على التوكينات (من صفحة تسجيل الدخول)
// self.addEventListener('message', function(event) {
//     console.log('📨 Message received in SW:', event.data);
    
//     if (event.data && event.data.type === 'TOKEN') {
//         cachedToken = event.data.token;
//         // حفظ التوكين والـ refresh_token في الـ cache
//         if (event.data.refreshToken) {
//             saveTokensToCache(event.data.token, event.data.refreshToken);
//         }
//         console.log('✅ Token cached in Service Worker');
//     }
    
//     // تخزين كلا التوكينين
//     if (event.data && event.data.type === 'AUTH_TOKENS') {
//         cachedToken = event.data.accessToken;
//         saveTokensToCache(event.data.accessToken, event.data.refreshToken);
//         console.log('✅ Both tokens cached');
//     }
    
//     // الرد على طلبات GET_TOKEN مع إرسال كلا التوكينين
//     if (event.data && event.data.type === 'GET_TOKEN' && event.ports && event.ports[0]) {
//         const token = cachedToken || null;
//         event.ports[0].postMessage({ token: token });
//         console.log('✅ Token sent via message channel');
//     }
// });