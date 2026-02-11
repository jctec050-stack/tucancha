import { useState, useEffect } from 'react';
import { savePushSubscription } from '@/services/dataService';
import { toast } from 'react-hot-toast';

const urlBase64ToUint8Array = (base64String: string) => {
    try {
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
    } catch (e) {
        console.error('Error converting VAPID key:', e);
        throw new Error('Invalid VAPID key format');
    }
};

export const usePushNotifications = (userId?: string) => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial check logic
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            
            const checkSubscription = async () => {
                try {
                    // Try to get existing registration
                    const registration = await navigator.serviceWorker.getRegistration();
                    
                    if (registration) {
                        const subscription = await registration.pushManager.getSubscription();
                        if (subscription) setIsSubscribed(true);
                    }
                } catch (error) {
                    console.warn('⚠️ Push check warning:', error);
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
            console.log('🔔 Iniciando suscripción push...');
            
            // 1. Get Registration (Manual or Ready)
            let registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                console.log('⚠️ No SW found, trying to register manually...');
                try {
                    // Force registration if missing (fixes Next.js PWA issues in some browsers)
                    registration = await navigator.serviceWorker.register('/custom-sw.js');
                    console.log('✅ Manual registration success:', registration);
                } catch (regError) {
                    console.error('❌ Manual registration failed:', regError);
                    
                    // Fallback to waiting for ready
                    console.log('⏳ Waiting for ready state...');
                    try {
                         registration = await Promise.race([
                            navigator.serviceWorker.ready,
                            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for SW')), 4000))
                        ]) as ServiceWorkerRegistration;
                    } catch (e) {
                        console.error('❌ Service Worker not ready:', e);
                        toast.error('Error: Service Worker no disponible. Recarga la página.');
                        return;
                    }
                }
            }

            if (!registration) {
                toast.error('No se pudo registrar el Service Worker');
                return;
            }

            console.log('✅ Service Worker activo:', registration);

            // 2. Request Permission
            const permission = await Notification.requestPermission();
            console.log('🔒 Permiso de notificación:', permission);
            
            if (permission !== 'granted') {
                toast.error('Debes permitir las notificaciones en tu navegador');
                return;
            }

            // 3. VAPID Key Check
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                console.error('❌ Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');
                toast.error('Error de configuración (Falta VAPID Key)');
                return;
            }

            // 4. Subscribe
            console.log('📡 Suscribiendo a Push Manager...');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            console.log('✅ Suscripción exitosa (local):', subscription);

            // 5. Save to DB
            const saved = await savePushSubscription(userId, subscription);
            
            if (saved) {
                setIsSubscribed(true);
                toast.success('¡Notificaciones activadas correctamente!');
            } else {
                console.error('❌ Error saving to DB');
                toast.error('Error al guardar suscripción en servidor');
                // Optional: unsubscribe locally if server fails to keep consistency
                // await subscription.unsubscribe();
            }

        } catch (error: any) {
            console.error('❌ Error fatal en subscribe:', error);
            toast.error(`Error: ${error.message || 'Desconocido'}`);
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
