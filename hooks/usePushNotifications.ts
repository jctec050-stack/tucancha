import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { toast } from 'react-hot-toast';

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
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    };

    const subscribe = async () => {
        if (!user) return false;
        setLoading(true);
        const toastId = toast.loading('Suscribiendo dispositivo...');

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                toast.error('Permiso de notificaciones denegado', { id: toastId });
                return false;
            }

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                console.error('❌ Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
                toast.error('Error de configuración: Falta VAPID KEY', { id: toastId });
                return false;
            }

            if (!('serviceWorker' in navigator)) {
                toast.error('Navegador no soporta Service Workers', { id: toastId });
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed in browser to avoid error
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                    });
                } catch (subError: any) {
                    console.error('PushManager Subscribe Error:', subError);
                    toast.error(`Error al solicitar push: ${subError.message}`, { id: toastId });
                    return false;
                }
            }

            console.log('✅ Browser Subscribed:', subscription.endpoint);

            // Save to DB
            const response = await fetch('/api/subscribe-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userId: user.id
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                const errMsg = errData.error || 'Fallo al guardar en servidor';
                throw new Error(errMsg);
            }

            console.log('✅ Subscription saved to DB');
            setIsSubscribed(true);
            toast.success('¡Dispositivo suscrito con éxito!', { id: toastId });
            return true;

        } catch (error: any) {
            console.error('Error subscribing:', error);
            toast.error(`Error de suscripción: ${error.message || 'Desconocido'}`, { id: toastId });
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        permission,
        isSubscribed,
        subscribe,
        loading
    };
}
