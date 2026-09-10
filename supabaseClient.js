const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.VITE_SUPABASE_URL || window.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || window.VITE_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

window.supabaseConfigMissing = !hasSupabaseConfig;

window.supabaseReady = (async () => {
    if (!window.supabase || !hasSupabaseConfig) {
        window.supabaseClient = null;
        return null;
    }

    try {
        const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        window.supabaseClient = client;
        return client;
    } catch (_) {
        window.supabaseClient = null;
        return null;
    }
})();
