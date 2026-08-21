const { supabaseAdmin } = require('./config/supabase.js');

async function run() {
    try {
        const { data, error } = await supabaseAdmin.from('delivery_assignments').select('*').limit(1);
        console.log(data, error);
    } catch(e) {
        console.log(e);
    }
}
run();
