require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function testStaff() {
  const { data, error } = await supabaseAdmin
    .from('diagnostic_members')
    .select(`
      id,
      member_role,
      status,
      invited_by,
      created_at,
      updated_at,
      user:users!diagnostic_members_user_id_fkey(id, name, email, phone, profile_image_url)
    `)
    .eq('diagnostic_center_id', 'f4e8fe5d-43cc-41d7-a1a6-56dde6ec841c')
    .neq('status', 'removed');
  
  console.log(JSON.stringify(data, null, 2), error);
}

testStaff();
