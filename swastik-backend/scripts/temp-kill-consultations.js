const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function killStaleConsultations() {
  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('id, status, type')
    .eq('status', 'in_progress');

  if (error) {
    console.error('Error fetching appointments:', error);
    return;
  }

  console.log('Found in_progress appointments:', appointments);

  if (appointments.length > 0) {
    const { data, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'completed' })
      .in('id', appointments.map(a => a.id))
      .select();

    if (updateError) {
      console.error('Error updating appointments:', updateError);
    } else {
      console.log('Successfully completed appointments:', data);
    }
  } else {
    console.log('No in_progress appointments found.');
  }
}

killStaleConsultations();
