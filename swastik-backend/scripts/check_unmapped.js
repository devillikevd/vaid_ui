require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function run() {
    const { data: unmapped } = await supabaseAdmin.from('pharmacy_inventory').select('*').is('medicine_id', null);
    console.log("Unmapped records:", JSON.stringify(unmapped, null, 2));

    const { data: medicines } = await supabaseAdmin.from('medicines').select('*');
    
    const results = [];
    
    for (const record of unmapped) {
        // Try to match exactly by name (normalized)
        const nameMatch = medicines.find(m => m.name.toLowerCase().trim() === record.name.toLowerCase().trim());
        if (nameMatch) {
            results.push({ id: record.id, name: record.name, match: nameMatch.id, reason: 'exact_name' });
            continue;
        }

        // Try exact generic + strength + dosage_form (if provided)
        if (record.generic_name) {
             const genericMatch = medicines.find(m => 
                 m.generic_name && m.generic_name.toLowerCase().trim() === record.generic_name.toLowerCase().trim() &&
                 (m.strength || '') === (record.strength || '') &&
                 (m.dosage_form || '') === (record.dosage_form || '')
             );
             if (genericMatch) {
                 results.push({ id: record.id, name: record.name, match: genericMatch.id, reason: 'generic_strength_form' });
                 continue;
             }
        }
        
        results.push({ id: record.id, name: record.name, match: null, reason: 'no_confident_match' });
    }
    
    console.log("Matching results:", JSON.stringify(results, null, 2));
}

run().catch(console.error);
