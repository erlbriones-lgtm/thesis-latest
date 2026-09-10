const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  window.SUPABASE_URL ||
  '';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  '';

window.supabaseReady = (async () => {
  const supabaseFactory = window.supabase?.createClient;
  if (!supabaseFactory || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    window.supabaseClient = null;
    return null;
  }

  const client = supabaseFactory(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = client;
  return client;
})();
