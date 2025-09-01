import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    db: {
        schema: 'public',
    },
    global: {
        fetch: (url, options = {}) => {
            // Add timeout to all fetch requests
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), 10000); // 10 second timeout
            
            return fetch(url, {
                ...options,
                signal: timeoutController.signal,
            }).finally(() => {
                clearTimeout(timeoutId);
            });
        },
    },
});