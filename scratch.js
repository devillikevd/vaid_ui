const { supabaseAdmin } = require('./swastik-backend/config/supabase.js');

async function run() {
    const { data, error } = await supabaseAdmin.from('delivery_agents').select('*').limit(1);
    console.log(JSON.stringify(data[0] || 'No agents', null, 2));
}

run();
