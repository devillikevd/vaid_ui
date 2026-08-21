require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function checkSchema() {
    console.log("=== 1. DATABASE SCHEMA ===");
    const { data: cols, error } = await supabase.from('pharmacy_inventory').select('*').limit(1);
    if (error) {
        console.error("Error fetching data:", error);
    } else {
        if (cols && cols.length > 0) {
            const row = cols[0];
            const nameAbsent = !('name' in row);
            const genericAbsent = !('generic_name' in row);
            const manufacturerAbsent = !('manufacturer' in row);
            const rxAbsent = !('requires_prescription' in row);
            const medIdPresent = 'medicine_id' in row;
            
            console.log(`name column = ABSENT: ${nameAbsent}`);
            console.log(`generic_name column = ABSENT: ${genericAbsent}`);
            console.log(`manufacturer column = ABSENT: ${manufacturerAbsent}`);
            console.log(`requires_prescription column = ABSENT: ${rxAbsent}`);
            console.log(`medicine_id exists: ${medIdPresent}`);
        } else {
            console.log("No data returned to check columns.");
        }
    }
}
checkSchema().catch(console.error);
