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
            
            const checkSubscription = async () => {
                try {
                    // Check if controller is active (fast check)
                    if (navigator.serviceWorker.controller) {
                        const registration = await navigator.serviceWorker.ready;
                        const subscription = await registration.pushManager.getSubscription();
                        if (subscription) setIsSubscribed(true);
                    } else {
                        // Wait for SW ready with timeout (1s - reduced for faster UI)
                        const registration = await Promise.race([
                            navigator.serviceWorker.ready,
                            new Promise<never>((_, reject) => 
                                setTimeout(() => reject(new Error('Service Worker ready timeout')), 1000)
                            )
                        ]) as ServiceWorkerRegistration;

                        const subscription = await registration.pushManager.getSubscription();
                        if (subscription) setIsSubscribed(true);
                    }
                } catch (error) {
                    // console.warn('⚠️ Push notification check timed out or failed:', error);
                    // Non-blocking error: just stop loading so button is enabled
                } finally {
                    setIsLoading(false);
                }
            };

            checkSubscription();
        } else {
            setIsSupported(false);
            setIsLoading(false);
        }
    }, []);

    const subscribe = async () => {
        if (!userId) return;
        setIsLoading(true);

        try {
            // Ensure SW is ready (or try to register if missing - handled by next-pwa usually)
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
                // If saving failed but subscription succeeded locally, maybe we should unsubscribe?
                // For now, keep it simple.
                toast.error('Error al guardar en servidor');
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
            toast.error('Error al desactivar');
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
