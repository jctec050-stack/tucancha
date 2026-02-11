self.addEventListener('push', function (event) {
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const payload = event.data.json();
        console.log('Push received:', payload);

        const title = payload.title || 'Nueva Notificación';
        const options = {
            body: payload.body || '',
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-72x72.png',
            image: payload.image,
            data: payload.data || {},
            actions: payload.actions || [],
            vibrate: [100, 50, 100],
            requireInteraction: true
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (err) {
        console.error('Error handling push event:', err);
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('Notification clicked', event.notification.tag);
    event.notification.close();

    // URL a abrir
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (windowClients) {
            // Si ya hay una ventana abierta con esa URL, enfocarla
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
