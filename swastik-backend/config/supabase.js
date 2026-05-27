/**
 * Supabase Client Configuration
 * Primary database for the healthcare platform
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env — cannot start without database.');
}

// Provide WebSocket implementation for environments lacking native WebSocket (e.g. Node < 21 / Jest)
const wsConstructor = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');

// Admin client (service role - bypasses RLS)
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: wsConstructor
    }
  }
);

// Public client (anon key - respects RLS)
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    realtime: {
      transport: wsConstructor
    }
  }
);

module.exports = { supabase, supabaseAdmin };
