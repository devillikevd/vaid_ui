require('dotenv').config({ path: './.env' });
const { supabaseAdmin: supabase } = require('./config/supabase');

async function fixDup() {
    const rowA_id = 'b9853ded-d9a7-4cec-b3ea-b27f46f07da4';
    const rowB_id = '7224cbdb-1003-422c-8e52-2249128f9a06'; // The newly mapped paracetamol that caused a dup

    const { data: cartItems } = await supabase.from('cart_items').select('id, inventory_id').in('inventory_id', [rowA_id, rowB_id]);
    if (cartItems && cartItems.length > 0) {
        await supabase.from('cart_items').update({ inventory_id: rowA_id }).eq('inventory_id', rowB_id);
    }

    await supabase.from('pharmacy_inventory').update({ quantity: 201 }).eq('id', rowA_id);
    await supabase.from('pharmacy_inventory').delete().eq('id', rowB_id);
    console.log("Fixed secondary duplicate.");
}

fixDup().catch(console.error);
