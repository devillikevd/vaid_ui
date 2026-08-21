require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function run() {
    console.log("Fetching pharmacy_inventory stats...");

    const { count: total } = await supabaseAdmin.from('pharmacy_inventory').select('*', { count: 'exact', head: true });
    const { count: mapped } = await supabaseAdmin.from('pharmacy_inventory').select('*', { count: 'exact', head: true }).not('medicine_id', 'is', null);
    const { count: unmapped } = await supabaseAdmin.from('pharmacy_inventory').select('*', { count: 'exact', head: true }).is('medicine_id', null);
    
    const { data: unmappedData } = await supabaseAdmin.from('pharmacy_inventory').select('pharmacy_id, name').is('medicine_id', null);
    
    const uniquePharmacies = new Set(unmappedData?.map(d => d.pharmacy_id)).size;
    const { count: totalOrders } = await supabaseAdmin.from('pharmacy_orders').select('*', { count: 'exact', head: true });

    const junkCount = unmappedData ? unmappedData.filter(d => !d.name || d.name.length < 3 || d.name.includes('test') || /^\d+$/.test(d.name)).length : 0;

    const nameCounts = {};
    if (unmappedData) {
        for (const item of unmappedData) {
            const normalized = item.name.toLowerCase().trim();
            nameCounts[normalized] = (nameCounts[normalized] || 0) + 1;
        }
    }
    const duplicateNames = Object.values(nameCounts).filter(c => c > 1).length;

    console.log(JSON.stringify({
        total,
        mapped,
        unmapped,
        uniquePharmacies,
        totalOrders,
        junkCount,
        duplicateNames
    }, null, 2));
}

run().catch(console.error);
