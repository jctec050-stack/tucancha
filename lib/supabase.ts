import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Use localStorage for persistent sessions (survives browser restarts)
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Enable auto-refresh of token before expiry
        autoRefreshToken: true,
        // Persist session across browser restarts
        persistSession: true,
        // Detect if session is in another tab and sync
        detectSessionInUrl: true,
    },
});
