// @ts-ignore - web-push no tiene tipos oficiales de TypeScript
const webpush = require('web-push');

// ============================================
// CONFIGURACIÓN VAPID
// ============================================

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contacto@tucancha.com';

// Variable para trackear si ya se configuró
let isVapidConfigured = false;

// Función para configurar VAPID solo cuando se necesite (lazy initialization)
function ensureVapidConfigured() {
    if (isVapidConfigured) return;

    if (vapidPublicKey && vapidPrivateKey) {
        try {
            webpush.setVapidDetails(
                vapidSubject,
                vapidPublicKey,
                vapidPrivateKey
            );
            isVapidConfigured = true;
        } catch (error) {
            console.error('Error configurando VAPID keys:', error);
        }
    }
}

// ============================================
// TIPOS
// ============================================

// Renombrado a WebPushSubscription para evitar conflicto con el tipo global PushSubscription
export interface WebPushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: {
        url?: string;
        [key: string]: any;
    };
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Envía una notificación push a un subscription específico
 */
export async function sendPushNotification(
    subscription: WebPushSubscription,
    payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        // Configurar VAPID si aún no está configurado
        ensureVapidConfigured();

        // Validar que las VAPID keys están configuradas
        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys no están configuradas');
        }

        // Preparar el payload
        const notificationPayload = JSON.stringify(payload);

        // Enviar la notificación
        await webpush.sendNotification(subscription as any, notificationPayload);

        return { success: true };
    } catch (error: any) {
        console.error('Error enviando push notification:', error);

        // Manejar errores específicos
        if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expirado o inválido
            return {
                success: false,
                error: 'SUBSCRIPTION_EXPIRED'
            };
        }

        return {
            success: false,
            error: error.message || 'Error desconocido'
        };
    }
}

/**
 * Envía notificaciones push a múltiples subscriptions
 */
export async function sendBatchPushNotifications(
    subscriptions: WebPushSubscription[],
    payload: PushNotificationPayload
): Promise<{
    total: number;
    sent: number;
    failed: number;
    expired: string[]; // endpoints expirados para limpiar
}> {
    const results = await Promise.allSettled(
        subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
            sent++;
        } else {
            failed++;
            if (result.status === 'fulfilled' && result.value.error === 'SUBSCRIPTION_EXPIRED') {
                expired.push(subscriptions[index].endpoint);
            }
        }
    });

    return {
        total: subscriptions.length,
        sent,
        failed,
        expired
    };
}

/**
 * Valida que un subscription tenga el formato correcto
 */
export function isValidSubscription(subscription: any): subscription is WebPushSubscription {
    return (
        subscription &&
        typeof subscription === 'object' &&
        typeof subscription.endpoint === 'string' &&
        subscription.keys &&
        typeof subscription.keys === 'object' &&
        typeof subscription.keys.p256dh === 'string' &&
        typeof subscription.keys.auth === 'string'
    );
}

/**
 * Obtiene la clave pública VAPID para el cliente
 */
export function getVapidPublicKey(): string {
    if (!vapidPublicKey) {
        throw new Error('VAPID public key no está configurada');
    }
    return vapidPublicKey;
}
