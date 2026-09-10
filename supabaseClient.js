// supabaseClient.js
// Supabase Client Initialization for BISU Calape Feedback System

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uqrzyowknvgwnczejqeb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnp5b3drbnZnd25jemVqcWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTcyNTIsImV4cCI6MjA4NzgzMzI1Mn0.7cXCWcHsPvAYiL9krwKIeISPmDNfhT9MKKb8DD1AQzg';

let client = null;
let isConfigMissing = false;

function initClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    isConfigMissing = true;
    return null;
  }
  try {
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      return window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
  }
  return null;
}

client = initClient();
if (!client && (!supabaseUrl || !supabaseAnonKey)) {
  isConfigMissing = true;
  console.info('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. The app will run in local storage fallback mode.');
}

window.supabaseClient = client;
window.supabaseConfigMissing = isConfigMissing;

const readyPromise = new Promise((resolve) => {
  if (client) {
    resolve(client);
  } else if (!isConfigMissing && typeof window !== 'undefined') {
    const interval = setInterval(() => {
      client = initClient();
      if (client) {
        window.supabaseClient = client;
        clearInterval(interval);
        resolve(client);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      resolve(client);
    }, 3000);
  } else {
    resolve(null);
  }
});

window.supabaseReady = readyPromise;

export { client as supabase, client as supabaseClient };
export default client;
