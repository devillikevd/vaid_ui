const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/nayanprakash/tech folder/SWASTIK/swastik/swastik-backend/.env' });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  const facility_id = '00000000-0000-0000-0000-000000000000'; // dummy UUID
  const facility_type = 'pharmacy';
  const name = 'Test Agent Undefined';
  const phone = '1234567890';
  const vehicle_details = undefined;
  
  const { data, error } = await supabaseAdmin
    .from('delivery_agents')
    .insert([{ facility_id, facility_type, name, phone, vehicle_details }])
    .select()
    .single();
    
  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
