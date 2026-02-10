'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';

export function PushNotificationPrompt() {
    const { user } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Verificar si el navegador soporta notifications
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            return;
        }

        // Verificar si ya dismissió el prompt
        const wasDismissed = localStorage.getItem('push-prompt-dismissed') === 'true';
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        // Actualizar estado de permiso
        setPermission(Notification.permission);

        // Mostrar prompt solo si:
        // 1. El usuario está logueado
        // 2. El permiso no fue dado/negado aún
        // 3. No fue dismissado previamente
        if (user && Notification.permission === 'default') {
            // Esperar 3  segundos antes de mostrar
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [user]);

    const requestPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission === 'granted' && user) {
                // Registrar service worker y subscription
                await registerPushNotification();
                setShowPrompt(false);
            } else if (permission === 'denied') {
                setShowPrompt(false);
            }
        } catch (error) {
            console.error('Error solicitando permiso:', error);
        }
    };

    const registerPushNotification = async () => {
        try {
            // Obtener VAPID public key
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

            // Registrar service worker
            const registration = await navigator.serviceWorker.ready;

            // Subscribirse a push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Guardar subscription en el servidor
            const response = await fetch('/api/subscribe-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userId: user!.id
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar subscription');
            }

            console.log('✅ Push notification registrada exitosamente');
        } catch (error) {
            console.error('Error registrando push notification:', error);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('push-prompt-dismissed', 'true');
        setDismissed(true);
    };

    // No mostrar si el browser no soporta o si ya fue dismissado
    if (!showPrompt || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">
                            🔔 Recibí notificaciones
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Te avisaremos cuando confirmes una reserva y 3 horas antes de tu juego
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={requestPermission}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
                            >
                                Activar
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function para convertir VAPID key
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
