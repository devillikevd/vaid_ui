require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function checkTables() {
  const { data, error } = await supabaseAdmin.from('diagnostic_members').select('id').limit(1);
  console.log('diagnostic_members query result:', data, error);
}

checkTables();
