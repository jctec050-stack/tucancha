import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateBookingReminderEmail } from '@/lib/reminder-template';

/**
 * Cron job endpoint para enviar recordatorios de reservas
 * Se ejecuta cada hora automáticamente vía Vercel Cron
 * 
 * Busca reservas activas que serán en 3 horas y envía emails de recordatorio
 */
export async function GET(request: Request) {
    try {
        // ============================================
        // 1. VERIFICAR AUTORIZACIÓN (Cron Secret)
        // ============================================
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('❌ Unauthorized cron request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('🕐 [CRON] Iniciando envío de recordatorios...');

        // ============================================
        // 2. CALCULAR VENTANA DE TIEMPO (3 horas desde ahora)
        // ============================================
        const now = new Date();
        const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        // Formatear para comparación con DB
        const targetDate = threeHoursLater.toISOString().split('T')[0]; // YYYY-MM-DD
        const targetTimeMin = threeHoursLater.toTimeString().substring(0, 5); // HH:mm
        const targetTimeMax = fourHoursLater.toTimeString().substring(0, 5); // HH:mm

        console.log(`📅 Buscando reservas para ${targetDate} entre ${targetTimeMin} y ${targetTimeMax}`);

        // ============================================
        // 3. BUSCAR RESERVAS PRÓXIMAS
        // ============================================
        const { data: upcomingBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
        id,
        date,
        start_time,
        end_time,
        price,
        player_id,
        player_name,
        player_phone,
        court_id,
        venue_id,
        courts:court_id (
          id,
          name
        ),
        venues:venue_id (
          id,
          name,
          address
        ),
        profiles:player_id (
          id,
          email,
          full_name
        )
      `)
            .eq('status', 'ACTIVE')
            .eq('date', targetDate)
            .gte('start_time', targetTimeMin)
            .lt('start_time', targetTimeMax);

        if (bookingsError) {
            console.error('❌ Error fetching bookings:', bookingsError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!upcomingBookings || upcomingBookings.length === 0) {
            console.log('✅ No hay reservas próximas que requieran recordatorio');
            return NextResponse.json({ message: 'No bookings to remind', sent: 0 });
        }

        console.log(`📋 Encontradas ${upcomingBookings.length} reservas próximas`);

        // ============================================
        // 4. FILTRAR RESERVAS QUE YA TIENEN NOTIFICACIÓN
        // ============================================
        const bookingIds = upcomingBookings.map(b => b.id);

        const { data: existingNotifications, error: notifError } = await supabase
            .from('booking_notifications')
            .select('booking_id')
            .in('booking_id', bookingIds)
            .eq('notification_type', 'EMAIL');

        if (notifError) {
            console.error('❌ Error checking notifications:', notifError);
        }

        const notifiedBookingIds = new Set(existingNotifications?.map(n => n.booking_id) || []);
        const bookingsToNotify = upcomingBookings.filter(b => !notifiedBookingIds.has(b.id));

        console.log(`✉️ ${bookingsToNotify.length} reservas pendientes de notificación`);

        // ============================================
        // 5. ENVIAR RECORDATORIOS
        // ============================================
        let sentCount = 0;
        let failedCount = 0;

        for (const booking of bookingsToNotify) {
            try {
                // Extraer datos (con manejo de tipos Supabase)
                const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
                const court = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;
                const venue = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues;

                // Usar player_name si existe, sino el nombre del perfil
                const playerName = booking.player_name || profile?.full_name || 'Jugador';
                const playerEmail = profile?.email;

                // Validar email
                if (!playerEmail) {
                    console.warn(`⚠️ Booking ${booking.id} no tiene email asociado`);
                    continue;
                }

                // Generar email HTML
                const emailHtml = generateBookingReminderEmail({
                    playerName,
                    playerEmail,
                    courtName: court?.name || 'Cancha',
                    venueName: venue?.name || 'Complejo',
                    venueAddress: venue?.address || '',
                    bookingDate: booking.date,
                    startTime: booking.start_time,
                    endTime: booking.end_time,
                    price: booking.price
                });

                // Enviar email usando la API existente
                const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: playerEmail,
                        subject: `⚽ Recordatorio: Tu reserva es hoy a las ${booking.start_time.substring(0, 5)}`,
                        html: emailHtml
                    })
                });

                if (!emailResponse.ok) {
                    throw new Error(`Email API returned ${emailResponse.status}`);
                }

                // Registrar notificación
                const { error: insertError } = await supabase
                    .from('booking_notifications')
                    .insert({
                        booking_id: booking.id,
                        notification_type: 'EMAIL',
                        status: 'SENT'
                    });

                if (insertError) {
                    console.error(`❌ Error al registrar notificación para booking ${booking.id}:`, insertError);
                }

                sentCount++;
                console.log(`✅ Recordatorio enviado a ${playerEmail} para booking ${booking.id}`);

            } catch (error: any) {
                failedCount++;
                console.error(`❌ Error enviando recordatorio para booking ${booking.id}:`, error);

                // Registrar fallo
                await supabase
                    .from('booking_notifications')
                    .insert({
                        booking_id: booking.id,
                        notification_type: 'EMAIL',
                        status: 'FAILED',
                        error_message: error.message || 'Unknown error'
                    });
            }
        }

        // ============================================
        // 6. RETORNAR RESUMEN
        // ============================================
        console.log(`🎯 Recordatorios enviados: ${sentCount}, Fallos: ${failedCount}`);

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            total: bookingsToNotify.length
        });

    } catch (error: any) {
        console.error('❌ Error en cron job:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
