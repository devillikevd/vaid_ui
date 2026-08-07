const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAppointments() {
  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('id, status, type')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching appointments:', error);
    return;
  }

  console.log('Recent appointments:', appointments);
}

checkAppointments();
