require('dotenv').config();
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

async function run() {
  const page = 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
      const result = await supabaseAdmin
        .from('medicines')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      console.log(result);
  } catch (err) {
      console.log("Exception:", err);
  }
}
run();
