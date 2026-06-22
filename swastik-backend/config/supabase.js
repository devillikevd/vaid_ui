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

// The Proxy that acts as supabaseAdmin but injects the user's context
const contextProxy = new Proxy(rawSupabaseAdmin, {
  get(target, prop) {
    if (prop === 'auth' || prop === 'realtime') {
      return target[prop];
    }
    const context = asyncLocalStorage.getStore();
    if (context && context.token) {
      if (!userClientCache.has(context.token)) {
        const scopedClient = createClient(config.supabase.url, config.supabase.anonKey, {
          global: { headers: { Authorization: `Bearer ${context.token}` } },
          auth: { autoRefreshToken: false, persistSession: false },
          realtime: { transport: wsConstructor }
        });
        userClientCache.set(context.token, scopedClient);
        setTimeout(() => userClientCache.delete(context.token), 1000 * 60 * 5);
      }
      const client = userClientCache.get(context.token);
      const value = client[prop];
      if (typeof value === 'function') return value.bind(client);
      return value;
    }
    const value = target[prop];
    if (typeof value === 'function') return value.bind(target);
    return value;
  }
});

// Combine the context proxy (RLS) with the PHI encryption proxy
const supabaseAdminProxy = createSupabasePHIProxy(contextProxy);

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
