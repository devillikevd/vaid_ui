const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConsultations() {
  const { data: consultations, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('status', 'in_progress')
    .limit(10);

  if (error) {
    console.error('Error fetching consultations:', error);
    return;
  }

  console.log('In-progress consultations:', consultations);

  if (consultations && consultations.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .in('id', consultations.map(c => c.id));
    
    if (updateError) {
      console.error('Error updating consultations:', updateError);
    } else {
      console.log('Successfully killed consultations');
    }
  }
}

checkConsultations();
