import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

        console.log(`📢 (Push Disabled) Intento de anuncio: "${title}" a segmento ${segment}`);

        // Push Notifications have been disabled.
        // We return success to not break existing clients, but we don't send anything.
        
        return NextResponse.json({
            success: true,
            sent: 0,
            failed: 0,
            total: 0,
            message: 'Push notifications are currently disabled.'
        });

    } catch (error: any) {
        console.error('Error sending announcement:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
