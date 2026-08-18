const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfillPrescriptions() {
    console.log('Starting prescription backfill...');
    let matched = 0;
    let ambiguous = 0;
    let unmatched = 0;
    const sampleAmbiguous = [];

    // Fetch all active medicines
    const { data: medicines, error: medError } = await supabaseAdmin
        .from('medicines')
        .select('id, name, generic_name, strength, form, dosage_form')
        .eq('is_active', true);
    
    if (medError) throw medError;

    // Create normalized maps
    const nameMap = new Map();
    for (const m of medicines) {
        const normName = m.name.toLowerCase().trim();
        if (!nameMap.has(normName)) nameMap.set(normName, []);
        nameMap.get(normName).push(m);
    }

    // Fetch prescriptions missing medicine_id
    let hasMore = true;
    let lastId = '00000000-0000-0000-0000-000000000000';
    const batchSize = 1000;

    while (hasMore) {
        const { data: rxMeds, error: rxError } = await supabaseAdmin
            .from('prescription_medicines')
            .select('id, medicine_name, generic_name, dosage')
            .is('medicine_id', null)
            .order('id')
            .gt('id', lastId)
            .limit(batchSize);

        if (rxError) throw rxError;
        
        if (rxMeds.length === 0) {
            hasMore = false;
            break;
        }

        lastId = rxMeds[rxMeds.length - 1].id;

        const updates = [];

        for (const rx of rxMeds) {
            if (!rx.medicine_name) {
                unmatched++;
                continue;
            }

            const normName = rx.medicine_name.toLowerCase().trim();
            const candidates = nameMap.get(normName);

            if (!candidates || candidates.length === 0) {
                unmatched++;
            } else if (candidates.length === 1) {
                matched++;
                updates.push({ id: rx.id, medicine_id: candidates[0].id });
            } else {
                // Try to resolve ambiguity using dosage/generic
                // This is a naive resolution, if it's still > 1, we leave it NULL.
                const refined = candidates.filter(c => {
                    const cGeneric = (c.generic_name || '').toLowerCase();
                    const rGeneric = (rx.generic_name || '').toLowerCase();
                    if (rGeneric && cGeneric && cGeneric.includes(rGeneric)) return true;
                    return false;
                });
                
                if (refined.length === 1) {
                    matched++;
                    updates.push({ id: rx.id, medicine_id: refined[0].id });
                } else {
                    ambiguous++;
                    if (sampleAmbiguous.length < 5) {
                        sampleAmbiguous.push({
                            prescription_medicine_name: rx.medicine_name,
                            candidates: candidates.map(c => `${c.name} (${c.strength || ''} ${c.dosage_form || ''})`)
                        });
                    }
                }
            }
        }

        // Apply batch updates
        if (updates.length > 0) {
            for (const chunk of chunkArray(updates, 100)) {
                // Upsert requires all fields or an RPC. We'll update individually for safety,
                // or if Supabase is on newer version, use a bulk update RPC.
                // Doing individual for safety in node script:
                await Promise.all(chunk.map(u => 
                    supabaseAdmin.from('prescription_medicines').update({ medicine_id: u.medicine_id }).eq('id', u.id)
                ));
            }
        }
    }

    console.log(`\nBackfill Results:`);
    console.log(`Matched: ${matched}`);
    console.log(`Unmatched: ${unmatched}`);
    console.log(`Ambiguous: ${ambiguous}`);
    
    if (sampleAmbiguous.length > 0) {
        console.log(`\nSample Ambiguous Records (left NULL):`);
        console.dir(sampleAmbiguous, { depth: null });
    }
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

backfillPrescriptions().catch(console.error);
