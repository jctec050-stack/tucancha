import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
// Helper function included below
// import { urlBase64ToUint8Array } from '@/utils/push'; 
// Actually, let's put the helper inside or import it. The prompt had it inside. 
// Let's create `utils/push.ts` first if it doesn't exist? Or just put it here.

// Helper
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, [user]);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
    };

    const subscribe = async () => {
        if (!user) return false;
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted') {
                const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
                const registration = await navigator.serviceWorker.ready;

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });

                // Save to DB
                const response = await fetch('/api/subscribe-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscription: subscription.toJSON(),
                        userId: user.id
                    })
                });

                if (!response.ok) throw new Error('Failed to save subscription');

                setIsSubscribed(true);
                return true;
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            // Optionally toast here
        } finally {
            setLoading(false);
        }
        return false;
    };

    return {
        permission,
        isSubscribed,
        subscribe,
        loading
    };
}
