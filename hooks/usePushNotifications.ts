import { useState, useEffect } from 'react';
import { savePushSubscription } from '@/services/dataService';
import { toast } from 'react-hot-toast';

const urlBase64ToUint8Array = (base64String: string) => {
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
};

export const usePushNotifications = (userId?: string) => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            
            // Check current subscription
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    if (subscription) {
                        setIsSubscribed(true);
                    }
                    setIsLoading(false);
                });
            });
        } else {
            setIsSupported(false);
            setIsLoading(false);
        }
    }, []);

    const subscribe = async () => {
        if (!userId) return;
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Necesitamos permiso para enviarte notificaciones');
                setIsLoading(false);
                return;
            }

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                console.error('Missing VAPID key');
                toast.error('Error de configuración de notificaciones');
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            const saved = await savePushSubscription(userId, subscription);
            
            if (saved) {
                setIsSubscribed(true);
                toast.success('¡Notificaciones activadas!');
            } else {
                toast.error('Error al guardar la suscripción');
            }

        } catch (error) {
            console.error('Error subscribing to push:', error);
            toast.error('Error al activar notificaciones');
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                // TODO: Optionally remove from DB, but not strictly necessary as invalid ones will be cleaned up
                setIsSubscribed(false);
                toast.success('Notificaciones desactivadas');
            }
        } catch (error) {
            console.error('Error unsubscribing:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe
    };
};
