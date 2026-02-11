import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendBatchPushNotifications, type PushNotificationPayload, type WebPushSubscription } from '@/lib/webpush';

/**
 * API Route para enviar ANUNCIOS GENERALES (Broadcast)
 * POST /api/send-announcement
 * 
 * Body: {
 *   title: string,
 *   body: string,
 *   url?: string,
 *   segment?: 'ALL' | 'OWNERS' | 'PLAYERS' // Futuro: segmentación
 * }
 */
export async function POST(request: Request) {
    try {
        // Verificar autenticación (solo admin o cron secret por ahora, o endpoint protegido)
        // Por simplicidad en este paso, asumimos que quien llama tiene permiso o es el mismo frontend admin.
        // TODO: Agregar middleware de auth o check de rol.

        const body = await request.json();
        const { title, message, url, segment = 'ALL' } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        console.log(`📢 Enviando anuncio: "${title}" a segmento ${segment}`);

        // 1. Obtener subscriptions según segmento
        let query = supabase.from('push_subscriptions').select('endpoint, keys, user_id');

        // Si tuviéramos tabla de relación o user_metadata podríamos filtrar por rol.
        // Como 'push_subscriptions' tiene 'user_id', podríamos hacer un join con 'profiles' si fuera necesario filtrar por rol.
        // Por ahora, 'ALL' envía a todos.

        if (segment === 'OWNERS') {
            // TODO: Implementar filtro por rol haciendo join o subquery si es crítico
            // Por performance, mejor traer todos y filtrar en memoria si son pocos, o hacer query compleja.
            // Para MVP, enviamos a todos los suscritos.
        }

        const { data: subscriptions, error } = await query;

        if (error) throw error;

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No active subscriptions', sent: 0 });
        }

        // 2. Preparar payload
        const payload: PushNotificationPayload = {
            title,
            body: message,
            icon: '/icons/icon-192x192.png',
            data: {
                url: url || '/',
                type: 'ANNOUNCEMENT'
            }
        };

        // 3. Enviar batch
        const result = await sendBatchPushNotifications(
            subscriptions as WebPushSubscription[],
            payload
        );

        // 4. Limpiar expirados
        if (result.expired.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('endpoint', result.expired);
        }

        return NextResponse.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
            total: result.total
        });

    } catch (error: any) {
        console.error('Error sending announcement:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
