require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function verifySchema() {
    console.log("=== 1. DATABASE SCHEMA ===");
    // Fetch schema details using RPC or querying information_schema
    // In Supabase we can try to query pharmacy_inventory with limit 1
    const { data: cols, error } = await supabase.from('pharmacy_inventory').select('*').limit(1);
    if (error) console.error("Error fetching data:", error);
    
    if (cols && cols.length > 0) {
        const row = cols[0];
        console.log("Columns remaining:");
        console.log("name:", row.hasOwnProperty('name'));
        console.log("generic_name:", row.hasOwnProperty('generic_name'));
        console.log("manufacturer:", row.hasOwnProperty('manufacturer'));
        console.log("requires_prescription:", row.hasOwnProperty('requires_prescription'));
        console.log("medicine_id exists:", row.hasOwnProperty('medicine_id'));
    }

    console.log("=== 2. DATA INTEGRITY ===");
    const { data: unmapped } = await supabase.from('pharmacy_inventory').select('id').is('medicine_id', null);
    console.log(`0 NULL medicine_id records: ${unmapped?.length === 0}`);

    const { data: allMapped } = await supabase.from('pharmacy_inventory').select('pharmacy_id, medicine_id');
    const counts = {};
    const duplicates = [];
    (allMapped || []).forEach(row => {
        const key = `${row.pharmacy_id}_${row.medicine_id}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] === 2) duplicates.push(key);
    });
    console.log(`0 duplicate pharmacy_id + medicine_id records: ${duplicates.length === 0}`);
}

verifySchema().catch(console.error);
