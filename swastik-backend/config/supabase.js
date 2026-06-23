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

const { asyncLocalStorage } = require('../utils/asyncContext');

// Admin client (service role - bypasses RLS) - ONLY used when ALS context is empty
const rawSupabaseAdmin = createClient(
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

// Map to cache dynamically created user-scoped clients
const userClientCache = new Map();

const { createSupabasePHIProxy } = require('../utils/supabaseProxy');

// Combine the raw admin client with the PHI encryption proxy
const supabaseAdminProxy = createSupabasePHIProxy(rawSupabaseAdmin);

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

// Apply PHI proxy to the public client as well to ensure patients reading their own data also get it decrypted
const supabaseProxy = createSupabasePHIProxy(supabase);

module.exports = { supabase: supabaseProxy, supabaseAdmin: supabaseAdminProxy, rawSupabaseAdmin };
