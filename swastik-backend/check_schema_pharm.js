const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data, error } = await supabase.from('pharmacy_orders').select('*').limit(1);
  if (error) console.error("Error:", error);
  else if (data.length > 0) console.log("Columns pharmacy_orders:", Object.keys(data[0]));
  else console.log("Table pharmacy_orders is empty");
  
  const { data: d2, error: e2 } = await supabase.from('pharmacy_order_items').select('*').limit(1);
  if (e2) console.error("Error:", e2);
  else if (d2.length > 0) console.log("Columns pharmacy_order_items:", Object.keys(d2[0]));
  else console.log("Table pharmacy_order_items is empty");
}
check();
