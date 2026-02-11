import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // NOTE: This might be client-side supabase in some setups, but usually fine.Ideally use admin client.
import { sendPushToUser } from '@/lib/push-notifications';
import { createClient } from '@supabase/supabase-js';

// Init Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const adminDb = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API Route para enviar ANUNCIOS GENERALES (Broadcast)
 * POST /api/send-announcement
 * 
 * Body: {
 *   title: string,
 *   message: string,
 *   url?: string,
 *   segment?: 'ALL' | 'OWNERS' | 'PLAYERS'
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, message, url, segment = 'ALL' } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        console.log(`📢 Enviando anuncio: "${title}" a segmento ${segment}`);

        // 1. Fetch Target Users
        let query = adminDb.from('profiles').select('id');

        if (segment === 'OWNERS') {
            query = query.eq('role', 'OWNER');
        } else if (segment === 'PLAYERS') {
            query = query.eq('role', 'PLAYER');
        }

        const { data: users, error } = await query;

        if (error || !users) {
            throw new Error('Error fetching users for announcement');
        }

        console.log(`🎯 Usuarios objetivo: ${users.length}`);

        // 2. Send Notifications (Batch)
        // Send in parallel but maybe limit concurrency if too many users?
        // For now, Promise.all is fine for hundreds of users.
        const promises = users.map(user => 
            sendPushToUser(user.id, {
                title,
                body: message,
                url
            })
        );

        const results = await Promise.all(promises);
        
        const sent = results.reduce((acc, curr) => acc + curr.success, 0);
        const failed = results.reduce((acc, curr) => acc + curr.failed, 0);

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: users.length,
            message: `Enviado a ${sent} dispositivos (${failed} fallos)`
        });

    } catch (error: any) {
        console.error('Error sending announcement:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
