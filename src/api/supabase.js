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
            // Add timeout to all fetch requests - reduced for faster fallback
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), 5000); // Reduced from 10s to 5s
            
            return fetch(url, {
                ...options,
                signal: timeoutController.signal,
            }).finally(() => {
                clearTimeout(timeoutId);
            });
        },
    },
});