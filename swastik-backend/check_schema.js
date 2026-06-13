const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('diagnostic_bookings').select('*').limit(1);
  if (error) console.error("Error:", error);
  else if (data.length > 0) console.log("Columns:", Object.keys(data[0]));
  else console.log("Table is empty, but query succeeded");
}
check();
