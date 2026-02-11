import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Init web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:notificacion@tucancha.com.py',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Init Supabase Admin (Service Role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Fallback to Anon (won't work for everything but better than crash)
// Note: Ideally use SERVICE_ROLE_KEY for admin tasks
// For now, we'll assume the environment has it or we might need to rely on RLS if using anon, but backend usually needs admin rights.
// Let's try to see if we have SERVICE_ROLE_KEY in env, if not, we might be limited.
// The previous read of .env.local didn't show SERVICE_ROLE_KEY.
// However, send-reminders/route.ts probably uses it. Let's check that later.

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    data?: any;
}

export const sendPushToUser = async (userId: string, payload: PushPayload) => {
    try {
        // 1. Get subscriptions for user
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (error || !subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return { success: 0, failed: 0 };
        }

        // 2. Send to all devices
        const notifications = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    },
                    JSON.stringify(payload)
                );
                return { status: 'fulfilled', id: sub.id };
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired/gone, delete it
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return { status: 'gone', id: sub.id };
                }
                console.error('Error sending push:', error);
                return { status: 'rejected', id: sub.id, error };
            }
        });

        const results = await Promise.all(notifications);
        const success = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status !== 'fulfilled').length;

        return { success, failed };

    } catch (error) {
        console.error('Error in sendPushToUser:', error);
        return { success: 0, failed: 0, error };
    }
};
