require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function researchP69() {
    console.log("=== 1. FIND UNMAPPED AND POSSIBLE MASTERS ===");
    const { data: unmapped } = await supabase.from('pharmacy_inventory').select('id, name').is('medicine_id', null);
    console.log("Unmapped:", unmapped);

    for (const r of unmapped || []) {
        let q = r.name.toLowerCase().replace('500 mg', '500mg').replace(' mr', '');
        if (q === 'sumo 500mg') q = 'sumo';
        const { data: masters } = await supabase.from('medicines').select('id, name, generic_name, is_active').ilike('name', `%${q}%`).limit(3);
        console.log(`Masters for ${r.name}:`, masters);
    }

    console.log("\n=== 2. FIND EXACT DUPLICATE ===");
    const { data: allMapped } = await supabase.from('pharmacy_inventory').select('id, pharmacy_id, medicine_id, name, quantity, price').not('medicine_id', 'is', null);
    
    const counts = {};
    const dupKeys = new Set();
    (allMapped || []).forEach(row => {
        const key = `${row.pharmacy_id}_${row.medicine_id}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > 1) dupKeys.add(key);
    });

    for (const key of dupKeys) {
        const [pharmacy_id, medicine_id] = key.split('_');
        console.log(`Duplicate mapping: Pharmacy ${pharmacy_id}, Medicine ${medicine_id}`);
        const { data: rows } = await supabase.from('pharmacy_inventory').select('*').eq('pharmacy_id', pharmacy_id).eq('medicine_id', medicine_id);
        console.log("Duplicate rows:", rows);
    }
}

researchP69().catch(console.error);
