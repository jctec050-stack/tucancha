import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendBatchPushNotifications, type PushNotificationPayload, type WebPushSubscription } from '@/lib/webpush';

/**
 * API Route para enviar push notifications
 * POST /api/send-push
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, title, body: notificationBody, icon, url, data } = body;

        // Validación
        if (!userId) {
            return NextResponse.json(
                { error: 'userId es requerido' },
                { status: 400 }
            );
        }

        if (!title || !notificationBody) {
            return NextResponse.json(
                { error: 'title y body son requeridos' },
                { status: 400 }
            );
        }

        // Obtener todas las subscriptions del usuario
        const { data: subscriptions, error: fetchError } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys')
            .eq('user_id', userId);

        if (fetchError) {
            console.error('Error fetching subscriptions:', fetchError);
            return NextResponse.json(
                { error: 'Error al obtener subscriptions' },
                { status: 500 }
            );
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`⚠️ No hay subscriptions para user ${userId}`);
            return NextResponse.json({
                success: true,
                message: 'No subscriptions found',
                sent: 0
            });
        }

        // Preparar payload
        const payload: PushNotificationPayload = {
            title,
            body: notificationBody,
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
                url: url || '/',
                dateOfArrival: Date.now(),
                ...data
            }
        };

        // Enviar notificaciones
        const result = await sendBatchPushNotifications(
            subscriptions as WebPushSubscription[],
            payload
        );

        // Limpiar subscriptions expirados
        if (result.expired.length > 0) {
            const { error: deleteError } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .in('endpoint', result.expired);

            if (deleteError) {
                console.error('Error eliminando subscriptions expirados:', deleteError);
            } else {
                console.log(`🗑️ Eliminados ${result.expired.length} subscriptions expirados`);
            }
        }

        console.log(`📱 Push enviado a user ${userId}: ${result.sent}/${result.total} exitosos`);

        return NextResponse.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
            total: result.total,
            expired: result.expired.length
        });

    } catch (error: any) {
        console.error('Error en /api/send-push:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
