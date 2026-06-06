const { supabaseAdmin } = require('./swastik-backend/config/supabase');
async function test() {
  try {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').limit(1).single();
    if (!patient) return console.log('no patient');
    
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').limit(1).single();
    if (!doctor) return console.log('no doctor');
    
    console.log('Inserting review for doctor:', doctor.id, 'patient:', patient.id);
    const { data, error } = await supabaseAdmin.from('reviews').insert({
      patient_id: patient.id,
      reviewable_type: 'doctor',
      reviewable_id: doctor.id,
      rating: 5,
      comment: 'test review',
      is_approved: true,
      is_visible: true
    }).select();
    
    console.log('Result:', { data, error });
    
    // clean up
    if (data) {
       await supabaseAdmin.from('reviews').delete().eq('id', data[0].id);
       console.log('Cleaned up');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
