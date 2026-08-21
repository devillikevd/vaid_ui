require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function runAudit() {
    console.log("=== 1. LEGACY RECORD CHECK ===");
    const { data: unmapped, error: err1 } = await supabase
        .from('pharmacy_inventory')
        .select('id, name, pharmacy_id, pharmacies(name)')
        .is('medicine_id', null);
    
    if (err1) console.error("Error 1:", err1);
    console.log(`Unmapped records: ${unmapped?.length || 0}`);
    if (unmapped?.length) {
        unmapped.forEach(r => {
            console.log(`- ${r.name} (Pharmacy: ${r.pharmacies?.name || r.pharmacy_id}, ID: ${r.id})`);
        });
    }

    console.log("\n=== 9. DUPLICATE PROTECTION CHECK ===");
    const { data: allMapped, error: err2 } = await supabase
        .from('pharmacy_inventory')
        .select('pharmacy_id, medicine_id')
        .not('medicine_id', 'is', null);
    
    if (err2) console.error("Error 2:", err2);
    const counts = {};
    const duplicates = [];
    (allMapped || []).forEach(row => {
        const key = `${row.pharmacy_id}_${row.medicine_id}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] === 2) duplicates.push(key);
    });
    console.log(`Duplicate mappings: ${duplicates.length}`);

    console.log("\n=== 10. FOREIGN KEY CHECK ===");
    const { data: invalidFk, error: err3 } = await supabase
        .from('pharmacy_inventory')
        .select('id, medicine_id')
        .not('medicine_id', 'is', null);
    
    if (err3) console.error("Error 3:", err3);
    
    const { data: masters, error: err4 } = await supabase.from('medicines').select('id');
    const masterIds = new Set(masters?.map(m => m.id) || []);
    
    const invalid = (invalidFk || []).filter(row => !masterIds.has(row.medicine_id));
    console.log(`Invalid FK references: ${invalid.length}`);
}

runAudit().catch(console.error);
