require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function resolveDuplicateAndUnmapped() {
    console.log("=== 1. RESOLVING DUPLICATE ===");
    const rowA_id = 'b9853ded-d9a7-4cec-b3ea-b27f46f07da4'; // Cipla, qty 96, price 12.5 (has batch)
    const rowB_id = '61b627bc-5c9a-4cdf-887f-72cd0606b432'; // TEST-001, qty 100, price 35 (no manufacturer)
    
    // Check cart_items for references
    const { data: cartItems } = await supabase.from('cart_items').select('id, inventory_id').in('inventory_id', [rowA_id, rowB_id]);
    console.log("Cart Items referencing duplicates:", cartItems);

    if (cartItems && cartItems.length > 0) {
        // If there are cart items, we'll update them to point to rowA.
        const { error: cartUpdateErr } = await supabase.from('cart_items').update({ inventory_id: rowA_id }).eq('inventory_id', rowB_id);
        if (cartUpdateErr) console.error("Error updating cart items:", cartUpdateErr);
    }
    
    // Check active prescriptions or bookings? We use JSONB in pharmacy_orders so there's no FK.
    // The only hard FK is cart_items.
    
    // We will merge stock. Row A (96) + Row B (100) = 196
    console.log("Merging Row B into Row A (Qty 196)");
    const { error: updateErr } = await supabase.from('pharmacy_inventory').update({ quantity: 196 }).eq('id', rowA_id);
    if (updateErr) console.error("Error merging:", updateErr);
    
    // Now delete Row B
    console.log("Deleting Row B");
    const { error: deleteErr } = await supabase.from('pharmacy_inventory').delete().eq('id', rowB_id);
    if (deleteErr) console.error("Error deleting Row B:", deleteErr);

    console.log("\n=== 2. CREATING MASTERS AND MAPPING ===");
    // Create Sumo 500mg if not exists
    const { data: sumoExisting } = await supabase.from('medicines').select('id').eq('name', 'Sumo 500mg');
    let sumoId;
    if (sumoExisting && sumoExisting.length > 0) {
        sumoId = sumoExisting[0].id;
    } else {
        const { data: sumoRes, error: errSumo } = await supabase.from('medicines').insert({
            name: 'Sumo 500mg',
            generic_name: 'Nimesulide + Paracetamol',
            manufacturer: 'Alkem Laboratories',
            requires_prescription: true,
            is_active: true,
            dosage_form: 'Tablet',
            strength: '500mg'
        }).select('id').single();
        if (errSumo) console.error("Error inserting Sumo:", errSumo);
        sumoId = sumoRes.id;
    }

    // Create Etoford MR if not exists
    const { data: etoExisting } = await supabase.from('medicines').select('id').eq('name', 'Etoford MR');
    let etoId;
    if (etoExisting && etoExisting.length > 0) {
        etoId = etoExisting[0].id;
    } else {
        const { data: etoRes, error: errEto } = await supabase.from('medicines').insert({
            name: 'Etoford MR',
            generic_name: 'Etodolac + Thiocolchicoside',
            manufacturer: 'Macleods',
            requires_prescription: true,
            is_active: true,
            dosage_form: 'Tablet',
            strength: '400mg + 4mg'
        }).select('id').single();
        if (errEto) console.error("Error inserting Etoford:", errEto);
        etoId = etoRes.id;
    }

    // Paracetamol master is 'd20895f9-3106-4b0e-ab69-c9a9ebf80d5d'
    const paraId = 'd20895f9-3106-4b0e-ab69-c9a9ebf80d5d';

    console.log("Mapping Sumo 500mg...");
    await supabase.from('pharmacy_inventory').update({ medicine_id: sumoId }).eq('id', '399170cc-d000-4ab3-b20c-ddbed4b22f17');
    console.log("Mapping Etoford MR...");
    await supabase.from('pharmacy_inventory').update({ medicine_id: etoId }).eq('id', '99ad3270-55c0-45b8-97e9-435972ed2449');
    console.log("Mapping Paracetamol...");
    await supabase.from('pharmacy_inventory').update({ medicine_id: paraId }).eq('id', '7224cbdb-1003-422c-8e52-2249128f9a06');

    console.log("Done.");
}

resolveDuplicateAndUnmapped().catch(console.error);
