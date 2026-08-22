const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
let connectionString = process.env.DATABASE_URL;

if (!connectionString && supabaseUrl && process.env.SUPABASE_DB_PASSWORD) {
  try {
    const urlObj = new URL(supabaseUrl);
    const host = 'db.' + urlObj.hostname.split('.')[0] + '.supabase.co';
    connectionString = `postgres://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@${host}:5432/postgres`;
  } catch (e) {
    console.error('Error constructing connection string:', e);
  }
}

async function fixAuditTrigger() {
  if (!connectionString) {
    console.error('No connection string available (DATABASE_URL or SUPABASE_DB_PASSWORD).');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connected to Postgres. Updating public.audit_sensitive_dml()...');
    const sql = `
      CREATE OR REPLACE FUNCTION public.audit_sensitive_dml()
      RETURNS TRIGGER AS $$
      DECLARE
          row_id_val TEXT;
          rec_json JSONB;
      BEGIN
          IF TG_OP IN ('INSERT', 'UPDATE') THEN
              rec_json := to_jsonb(NEW);
          ELSIF TG_OP = 'DELETE' THEN
              rec_json := to_jsonb(OLD);
          ELSE
              rec_json := NULL;
          END IF;

          IF rec_json IS NOT NULL THEN
              row_id_val := COALESCE(rec_json->>'id', rec_json->>'user_id');
          ELSE
              row_id_val := NULL;
          END IF;

          INSERT INTO public.access_audit_log (
              table_name, operation, row_id, actor_user, actor_role, actor_ip
          ) VALUES (
              TG_TABLE_NAME,
              TG_OP,
              row_id_val,
              current_setting('request.jwt.claim.sub', true),
              current_setting('request.jwt.claim.role', true),
              current_setting('request.jwt.claim.ip', true)
          );
          RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await pool.query(sql);
    console.log('Successfully updated public.audit_sensitive_dml() function!');
  } catch (err) {
    console.error('Error fixing audit trigger:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAuditTrigger();
