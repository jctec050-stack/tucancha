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
            // Add timeout to avoid hanging on check
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 2000));
            const registration = await Promise.race([navigator.serviceWorker.ready, timeout]) as ServiceWorkerRegistration;

            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            // Silent error on check
            console.warn('Error checking subscription:', error);
        }
    };

    const subscribe = async () => {
        if (!user) return false;
        setLoading(true);
        const toastId = toast.loading('Solicitando permisos...');

        try {
            // 1. Check Permissions
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                toast.error('Permiso de notificaciones denegado', { id: toastId });
                return false;
            }

            // 2. config Check
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                console.error('❌ Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
                toast.error('Error config: VAPID KEY missing', { id: toastId });
                return false;
            }

            if (!('serviceWorker' in navigator)) {
                toast.error('Navegador no soporta SW', { id: toastId });
                return false;
            }

            // 3. Service Worker Ready (with timeout)
            toast.loading('Conectando con Service Worker...', { id: toastId });

            const swTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('El Service Worker tardó demasiado en responder. Intenta recargar la página.')), 4000)
            );

            let registration: ServiceWorkerRegistration;
            try {
                registration = await Promise.race([navigator.serviceWorker.ready, swTimeout]) as ServiceWorkerRegistration;
            } catch (swError: any) {
                console.error('SW Ready Error:', swError);
                toast.error(swError.message || 'Error de Service Worker', { id: toastId });
                return false;
            }

            // 4. Check/Create Subscription
            toast.loading('Creando suscripción...', { id: toastId });

            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                    });
                } catch (subError: any) {
                    console.error('PushManager Subscribe Error:', subError);
                    toast.error(`Error al crear suscripción push: ${subError.message}`, { id: toastId });
                    return false;
                }
            }

            console.log('✅ Browser Subscribed:', subscription.endpoint);

            // 5. Save to DB
            toast.loading('Guardando en servidor...', { id: toastId });

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
                const errMsg = errData.error || 'Server rejected subscription';
                throw new Error(errMsg);
            }

            setIsSubscribed(true);
            toast.success('¡Suscripción exitosa!', { id: toastId });
            return true;

        } catch (error: any) {
            console.error('Error subscribing:', error);
            toast.error(`Error final: ${error.message || 'Desconocido'}`, { id: toastId });
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
