import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/push-notifications';

/**
 * API Route para cancelar reserva y notificar
 * POST /api/cancel-booking
 * Body: { bookingId: string, reason?: string }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bookingId, reason } = body;

        if (!bookingId) {
            return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        }

        // 1. Obtener detalles de la reserva + venue + owner + player
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`
                *,
                venues:venue_id (name, owner_id),
                profiles:player_id (full_name)
            `)
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 2. Actualizar estado a CANCELLED (si no lo está ya)
        if (booking.status !== 'CANCELLED') {
            const { error: updateError } = await supabase
                .from('bookings')
                .update({ status: 'CANCELLED' })
                .eq('id', bookingId);

            if (updateError) {
                throw updateError;
            }
        }

        console.log(`✅ Reserva ${bookingId} cancelada`);

        // 3. Notificaciones Síncronas (o fire-and-forget)

        const venueName = (booking.venues as any)?.name || 'Cancha';
        const ownerId = (booking.venues as any)?.owner_id;
        const playerName = (booking.profiles as any)?.full_name || 'Un usuario';
        const date = booking.date;
        const time = booking.start_time?.substring(0, 5);

        // A. Notificar al Dueño por Push (Directo, sin fetch interno)
        if (ownerId) {
            console.log(`Intentando enviar push al dueño: ${ownerId}`);
            try {
                const pushResult = await sendPushToUser(ownerId, {
                    title: '❌ Reserva Cancelada',
                    body: `${playerName} canceló su reserva en ${venueName} para el ${date} a las ${time}hs`,
                    url: '/dashboard',
                    data: { bookingId, type: 'CANCELLATION' }
                });
                console.log('Push result:', pushResult);
            } catch (pushError) {
                console.error('Error enviando push directo:', pushError);
            }
        }

        // B. Notificar al Dueño por Email (Opcional, si tiene email configurado)
        // (Lógica de email omitida por ahora para brevedad, enfocamos en Push)

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error cancelling booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
