import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isValidSubscription } from '@/lib/webpush';

/**
 * API Route para subscribir a push notifications
 * POST /api/subscribe-push
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subscription, userId } = body;

        // Validación
        if (!userId) {
            return NextResponse.json(
                { error: 'userId es requerido' },
                { status: 400 }
            );
        }

        if (!isValidSubscription(subscription)) {
            return NextResponse.json(
                { error: 'Subscription inválido' },
                { status: 400 }
            );
        }

        // Obtener user agent para debugging
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Guardar subscription en la base de datos
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                user_agent: userAgent,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,endpoint'
            })
            .select()
            .single();

        if (error) {
            console.error('Error guardando subscription:', error);
            return NextResponse.json(
                { error: 'Error al guardar subscription' },
                { status: 500 }
            );
        }

        console.log(`✅ Subscription guardada para user ${userId}`);

        return NextResponse.json({
            success: true,
            subscriptionId: data.id
        });

    } catch (error: any) {
        console.error('Error en /api/subscribe-push:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/subscribe-push
 * Eliminar subscription
 */
export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { endpoint, userId } = body;

        if (!userId || !endpoint) {
            return NextResponse.json(
                { error: 'userId y endpoint son requeridos' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', endpoint);

        if (error) {
            console.error('Error eliminando subscription:', error);
            return NextResponse.json(
                { error: 'Error al eliminar subscription' },
                { status: 500 }
            );
        }

        console.log(`❌ Subscription eliminada para user ${userId}`);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error en DELETE /api/subscribe-push:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
