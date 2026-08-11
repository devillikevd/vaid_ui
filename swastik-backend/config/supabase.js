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

// Admin client (service role - bypasses RLS) - ONLY used for system/admin tasks,
// cron jobs, and as the fallback when no per-request identity is available.
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

// CVE-001: Per-request user-scoped clients. Each authenticated request runs
// through a client bound to the caller's access token, so PostgREST evaluates
// Row Level Security (auth.uid()) instead of bypassing it with the service-role
// key. Enabled via USE_PER_REQUEST_SUPABASE=true (requires the 059 RLS migration
// + Supabase JWT secret set to JWT_ACCESS_SECRET).
const USE_PER_REQUEST_SUPABASE = config.usePerRequestSupabase === true;

// Map to cache dynamically created user-scoped clients
const userClientCache = new Map();

const createUserScopedClient = (accessToken) => {
  if (!accessToken) return null;
  return createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: wsConstructor,
      },
    }
  );
};

const getUserScopedClient = (accessToken) => {
  if (!accessToken) return null;
  if (userClientCache.has(accessToken)) return userClientCache.get(accessToken);
  // Bound the cache so long-lived processes don't grow unbounded.
  if (userClientCache.size > 500) userClientCache.clear();
  const raw = createUserScopedClient(accessToken);
  if (!raw) return null;
  // Apply the PHI encryption/decryption proxy so scoped reads/writes
  // still get PHI handling identical to the admin client.
  const client = createSupabasePHIProxy(raw);
  userClientCache.set(accessToken, client);
  return client;
};

const { createSupabasePHIProxy } = require('../utils/supabaseProxy');

// Combine the raw admin client with the PHI encryption proxy
const supabaseAdminProxy = createSupabasePHIProxy(rawSupabaseAdmin);

// Roles whose data access must remain on the service-role client even when
// per-request RLS is enabled. These users are already middleware-gated by
// requireRole(SUPER_ADMIN, ADMIN) and operate across the whole platform
// (dashboards, approval workflows, cross-tenant reads), which row-scoped RLS
// cannot express. Keeping them on the admin client also ensures the RBAC
// gate in routes/enhancedAdmin.js remains the enforcement point for admins.
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

// Resolve which client a chain should run against, based on the current
// request context (AsyncLocalStorage) set by middleware/auth.js.
const resolveClientForRequest = () => {
  if (!USE_PER_REQUEST_SUPABASE) return supabaseAdminProxy;
  const store = asyncLocalStorage.getStore();
  if (!store) return supabaseAdminProxy;
  // Admin roles run on the service-role client (middleware-authorized, RLS
  // cannot scope cross-tenant admin reads). Everyone else is scoped to their
  // own access token so PostgREST evaluates RLS per row.
  if (store.user && ADMIN_ROLES.has(store.user.role)) return supabaseAdminProxy;
  const scoped = store.token ? getUserScopedClient(store.token) : null;
  return scoped || supabaseAdminProxy;
};

// ALS-aware admin: when a request context exists AND USE_PER_REQUEST_SUPABASE is
// enabled, all `supabaseAdmin.from(...)` chains delegate to the caller's
// user-scoped client (RLS enforced). Otherwise the service-role client is used.
// This keeps the 69+ call sites unchanged while restoring defense-in-depth.
// Admin-only facilities (auth, storage) always use the service-role client —
// they are explicit privileged operations, not row-scoped data access.
const supabaseAdmin = new Proxy(supabaseAdminProxy, {
  get(target, prop) {
    if (prop === 'from') {
      const client = resolveClientForRequest();
      return (tableName) => client.from(tableName);
    }
    if (prop === 'auth' || prop === 'storage') {
      const value = rawSupabaseAdmin[prop];
      return typeof value === 'function' ? value.bind(rawSupabaseAdmin) : value;
    }
    const client = resolveClientForRequest();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

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

module.exports = {
  supabase: supabaseProxy,
  supabaseAdmin,
  rawSupabaseAdmin,
  createUserScopedClient,
  getUserScopedClient,
  resolveClientForRequest,
};
