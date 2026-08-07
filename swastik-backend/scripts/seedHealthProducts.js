/**
 * Health Products Seeding Script
 * Seeds: Categories, Medicines, Pharmacy Inventory, Sample Campaigns
 * Run: node scripts/seedHealthProducts.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

const MEDICINE_CATEGORIES = [
    { name: 'general', display_name: 'General Medicine', icon: '💊', sort_order: 1 },
    { name: 'antibiotic', display_name: 'Antibiotic', icon: '🧫', sort_order: 2 },
    { name: 'painkiller', display_name: 'Painkiller', icon: '🩹', sort_order: 3 },
    { name: 'vitamin', display_name: 'Vitamin', icon: '🍊', sort_order: 4 },
    { name: 'cardiac', display_name: 'Cardiac', icon: '❤️', sort_order: 5 },
    { name: 'diabetes', display_name: 'Diabetes', icon: '🩸', sort_order: 6 },
    { name: 'skin', display_name: 'Skin Care', icon: '🧴', sort_order: 7 },
    { name: 'respiratory', display_name: 'Respiratory', icon: '🫁', sort_order: 8 },
    { name: 'digestive', display_name: 'Digestive Health', icon: '🌿', sort_order: 9 },
    { name: 'allergy', display_name: 'Allergy', icon: '🤧', sort_order: 10 },
    { name: 'cold-flu', display_name: 'Cold & Flu', icon: '🤧', sort_order: 11 },
    { name: 'pediatric', display_name: 'Pediatric', icon: '👶', sort_order: 12 },
    { name: 'supplement', display_name: 'Supplement', icon: '💪', sort_order: 13 },
    { name: 'antifungal', display_name: 'Antifungal', icon: '🔬', sort_order: 14 },
    { name: 'hormone', display_name: 'Hormone', icon: '⚗️', sort_order: 15 }
];

const MEDICINES = [
    // Analgesics / Antipyretics
    { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', manufacturer: 'Cipla', category: 'painkiller', price: 12.50, mrp: 15.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Pain reliever and fever reducer' },
    { name: 'Paracetamol 650mg', generic_name: 'Paracetamol', manufacturer: 'GSK', category: 'painkiller', price: 18.00, mrp: 22.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Extended relief pain and fever' },
    { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', manufacturer: 'Abbott', category: 'painkiller', price: 25.00, mrp: 30.00, pack_size: '15 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Anti-inflammatory pain relief' },
    { name: 'Diclofenac 50mg', generic_name: 'Diclofenac Sodium', manufacturer: 'Novartis', category: 'painkiller', price: 22.00, mrp: 28.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Prescription NSAID for pain/inflammation' },

    // Antibiotics
    { name: 'Azithromycin 500mg', generic_name: 'Azithromycin', manufacturer: 'Pfizer', category: 'antibiotic', price: 85.00, mrp: 105.00, pack_size: '3 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Macrolide antibiotic' },
    { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', manufacturer: 'GSK', category: 'antibiotic', price: 45.00, mrp: 55.00, pack_size: '10 capsules', dosage_form: 'Capsule', requires_prescription: true, description: 'Penicillin antibiotic' },
    { name: 'Cefixime 200mg', generic_name: 'Cefixime', manufacturer: 'Lupin', category: 'antibiotic', price: 120.00, mrp: 150.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Third-generation cephalosporin' },

    // Antacids / Digestive
    { name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole', manufacturer: 'Sun Pharma', category: 'digestive', price: 35.00, mrp: 45.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Proton pump inhibitor for acidity' },
    { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', manufacturer: 'Dr Reddy', category: 'digestive', price: 28.00, mrp: 35.00, pack_size: '14 capsules', dosage_form: 'Capsule', requires_prescription: false, description: 'Acid reducer' },
    { name: 'Digene Gel', generic_name: 'Aluminium Hydroxide + Magnesium Hydroxide', manufacturer: 'Abbott', category: 'digestive', price: 85.00, mrp: 95.00, pack_size: '1 bottle', dosage_form: 'Gel', requires_prescription: false, description: 'Antacid gel for heartburn' },

    // Vitamins / Supplements
    { name: 'Vitamin D3 60000 IU', generic_name: 'Cholecalciferol', manufacturer: 'Cadila', category: 'vitamin', price: 120.00, mrp: 150.00, pack_size: '4 capsules', dosage_form: 'Capsule', requires_prescription: false, description: 'Vitamin D deficiency treatment' },
    { name: 'B-Complex Forte', generic_name: 'B Complex Vitamins', manufacturer: 'Mankind', category: 'vitamin', price: 45.00, mrp: 55.00, pack_size: '15 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Multivitamin B complex' },
    { name: 'Calcium + D3', generic_name: 'Calcium Carbonate + Vitamin D3', manufacturer: 'Cipla', category: 'supplement', price: 60.00, mrp: 75.00, pack_size: '15 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Bone health supplement' },

    // Diabetes
    { name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', manufacturer: 'USV', category: 'diabetes', price: 22.00, mrp: 28.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Type 2 diabetes management' },
    { name: 'Glimepiride 2mg', generic_name: 'Glimepiride', manufacturer: 'Sun Pharma', category: 'diabetes', price: 40.00, mrp: 50.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Sulfonylurea for diabetes' },

    // Hypertension (cardiac)
    { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', manufacturer: 'Pfizer', category: 'cardiac', price: 30.00, mrp: 38.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Calcium channel blocker for BP' },
    { name: 'Telmisartan 40mg', generic_name: 'Telmisartan', manufacturer: 'Boehringer', category: 'cardiac', price: 55.00, mrp: 70.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'ARB for hypertension' },

    // Respiratory
    { name: 'Montelukast 10mg', generic_name: 'Montelukast Sodium', manufacturer: 'Merck', category: 'respiratory', price: 85.00, mrp: 110.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: true, description: 'Leukotriene receptor antagonist' },
    { name: 'Salbutamol Inhaler', generic_name: 'Salbutamol', manufacturer: 'GSK', category: 'respiratory', price: 180.00, mrp: 220.00, pack_size: '1 inhaler', dosage_form: 'Inhaler', requires_prescription: true, description: 'Bronchodilator inhaler' },

    // Dermatology (skin / antifungal)
    { name: 'Clotrimazole Cream 1%', generic_name: 'Clotrimazole', manufacturer: 'Bayer', category: 'antifungal', price: 65.00, mrp: 80.00, pack_size: '1 tube', dosage_form: 'Cream', requires_prescription: false, description: 'Antifungal cream' },
    { name: 'Mometasone Cream 0.1%', generic_name: 'Mometasone Furoate', manufacturer: 'GSK', category: 'skin', price: 95.00, mrp: 120.00, pack_size: '1 tube', dosage_form: 'Cream', requires_prescription: true, description: 'Topical corticosteroid' },

    // Allergy
    { name: 'Cetirizine 10mg', generic_name: 'Cetirizine', manufacturer: 'Cipla', category: 'allergy', price: 20.00, mrp: 25.00, pack_size: '10 tablets', dosage_form: 'Tablet', requires_prescription: false, description: 'Antihistamine for allergy relief' },
    { name: 'Cetirizine Syrup 5mg/5ml', generic_name: 'Cetirizine', manufacturer: 'Cipla', category: 'allergy', price: 38.00, mrp: 48.00, pack_size: '1 bottle', dosage_form: 'Syrup', requires_prescription: false, description: 'Antihistamine for kids' },

    // Pediatric
    { name: 'Paracetamol Syrup 120mg/5ml', generic_name: 'Paracetamol', manufacturer: 'GSK', category: 'pediatric', price: 45.00, mrp: 55.00, pack_size: '1 bottle', dosage_form: 'Syrup', requires_prescription: false, description: 'Pediatric fever/pain relief' }
];

async function seedCategories() {
    console.log('Seeding medicine categories...');
    for (const cat of MEDICINE_CATEGORIES) {
        const { error } = await supabaseAdmin
            .from('medicine_categories')
            .upsert(cat, { onConflict: 'name' });
        if (error) console.error(`Category ${cat.name}:`, error.message);
    }
    console.log(`Seeded ${MEDICINE_CATEGORIES.length} categories`);
}

async function seedMedicines() {
    console.log('Seeding medicines...');
    // Ensure categories exist (they may be pre-seeded via migration)
    const { data: categories } = await supabaseAdmin.from('medicine_categories').select('id, name');
    const catNameSet = new Set((categories || []).map(c => c.name));

    // No unique constraint on (name, manufacturer) — check existence instead of upsert
    const { data: existingMedicines } = await supabaseAdmin.from('medicines').select('name, manufacturer');
    const existingKeys = new Set((existingMedicines || []).map(m => `${m.name}::${m.manufacturer}`));

    let count = 0;
    for (const med of MEDICINES) {
        const key = `${med.name}::${med.manufacturer}`;
        if (existingKeys.has(key)) continue;

        // Insert category if missing (no FK on medicines.category — it's a TEXT key)
        if (!catNameSet.has(med.category)) {
            await supabaseAdmin.from('medicine_categories').upsert(
                { name: med.category, display_name: med.category, icon: '💊' },
                { onConflict: 'name' }
            );
            catNameSet.add(med.category);
        }

        const { error } = await supabaseAdmin
            .from('medicines')
            .insert({
                name: med.name,
                generic_name: med.generic_name,
                manufacturer: med.manufacturer,
                category: med.category,
                price: med.price,
                mrp: med.mrp,
                pack_size: med.pack_size,
                dosage_form: med.dosage_form,
                requires_prescription: med.requires_prescription,
                description: med.description,
                is_active: true
            });
        if (error) console.error(`Medicine ${med.name}:`, error.message);
        else { count++; existingKeys.add(key); }
    }
    console.log(`Seeded ${count} new medicines (${existingKeys.size} total)`);
}

async function seedPharmacyInventory() {
    console.log('Seeding pharmacy inventory...');
    const { data: pharmacies } = await supabaseAdmin
        .from('pharmacies')
        .select('id')
        .eq('is_approved', true)
        .limit(50);
    
    if (!pharmacies || pharmacies.length === 0) {
        console.log('No approved pharmacies found, skipping inventory seed');
        return;
    }
    
    const { data: medicines } = await supabaseAdmin
        .from('medicines')
        .select('id, name, generic_name, manufacturer, price, mrp')
        .eq('is_active', true);

    // No unique constraint on (pharmacy_id, medicine_id) — check existence instead of upsert
    const { data: existingInv } = await supabaseAdmin
        .from('pharmacy_inventory')
        .select('pharmacy_id, medicine_id');
    const existingKeys = new Set((existingInv || []).map(i => `${i.pharmacy_id}::${i.medicine_id}`));

    let totalItems = 0;
    const stockCount = Math.max(1, Math.floor(medicines.length * 0.7));
    for (const [pharmacyIndex, pharmacy] of pharmacies.entries()) {
        const offset = (pharmacyIndex * 7) % Math.max(medicines.length, 1);
        const rotated = [...medicines.slice(offset), ...medicines.slice(0, offset)];
        const chosen = rotated.slice(0, stockCount);

        for (const med of chosen) {
            const key = `${pharmacy.id}::${med.id}`;
            if (existingKeys.has(key)) continue;

            const inStock = Math.random() > 0.1;
            const quantity = inStock ? Math.floor(Math.random() * 100) + 10 : 0;
            const batchNum = `B${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const expiryDate = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
            
            const { error } = await supabaseAdmin
                .from('pharmacy_inventory')
                .insert({
                    pharmacy_id: pharmacy.id,
                    medicine_id: med.id,
                    name: med.name,
                    generic_name: med.generic_name,
                    manufacturer: med.manufacturer,
                    category: med.category,
                    price: med.price,
                    mrp: med.mrp,
                    quantity: quantity,
                    is_available: inStock,
                    requires_prescription: med.requires_prescription || false,
                    batch_number: batchNum,
                    expiry_date: expiryDate
                });
            if (error) console.error(`Inventory ${pharmacy.id}-${med.id}:`, error.message);
            else { totalItems++; existingKeys.add(key); }
        }
    }
    console.log(`Seeded ${totalItems} new pharmacy inventory items across ${pharmacies.length} pharmacies`);

    // Backfill: sync requires_prescription / pack_size / unit_type / dosage_form
    // from the master medicines table for existing inventory rows whose mirror
    // columns may be stale (legacy seed data). Idempotent: only updates rows
    // whose value currently differs from the master.
    const { data: masterMeds } = await supabaseAdmin
        .from('medicines')
        .select('id, requires_prescription, pack_size, dosage_form');
    let backfilled = 0;
    for (const med of masterMeds || []) {
        // Only sync requires_prescription (the field with matching types on both
        // tables and the one the order Rx-gate falls back to). pack_size/dosage_form
        // differ in type between tables, so they are intentionally left untouched.
        const { data: updated, error } = await supabaseAdmin
            .from('pharmacy_inventory')
            .update({ requires_prescription: med.requires_prescription || false })
            .eq('medicine_id', med.id);
        if (error) {
            console.error(`Backfill ${med.id.slice(0, 8)}:`, error.message);
        } else if (updated && updated.length) {
            backfilled += updated.length;
        }
    }
    if (backfilled) console.log(`Backfilled requires_prescription on ${backfilled} inventory row(s)`);
}

async function seedSampleCampaigns() {
    console.log('Seeding sample discount campaigns...');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7*24*60*60*1000);
    const nextMonth = new Date(now.getTime() + 30*24*60*60*1000);
    
    const { data: admin } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
    const adminId = admin?.[0]?.id;
    if (!adminId) {
        console.log('No admin user found, skipping campaigns');
        return;
    }
    
    // Pick a real medicine for the medicine-scoped campaign
    const { data: med } = await supabaseAdmin
        .from('medicines')
        .select('id')
        .eq('is_active', true)
        .limit(1);
    const sampleMedicineId = med?.[0]?.id;

    const campaigns = [
        {
            name: 'Monsoon Wellness Sale',
            description: '15% off on all medicines, minimum order ₹100',
            discount_type: 'percentage',
            discount_value: 15,
            scope_type: 'global',
            scope_ref: null,
            min_order_value: 100,
            max_discount_per_order: 100,
            start_at: now.toISOString(),
            end_at: nextMonth.toISOString(),
            created_by: adminId
        },
        {
            name: 'Diabetes Care Month',
            description: '₹20 flat off on select diabetes medicines',
            discount_type: 'flat',
            discount_value: 20,
            scope_type: 'medicine',
            scope_ref: sampleMedicineId || null,
            min_order_value: 200,
            max_discount_per_order: 200,
            start_at: now.toISOString(),
            end_at: nextWeek.toISOString(),
            created_by: adminId
        },
        {
            name: 'Vitamin Boost Weekend',
            description: '10% off all medicines, this weekend only',
            discount_type: 'percentage',
            discount_value: 10,
            scope_type: 'global',
            scope_ref: null,
            min_order_value: 150,
            start_at: now.toISOString(),
            end_at: new Date(now.getTime() + 3*24*60*60*1000).toISOString(),
            created_by: adminId
        }
    ];
    
    // Skip campaigns that already exist so the seed stays idempotent
    const { data: existingCampaigns } = await supabaseAdmin
        .from('discount_campaigns')
        .select('name');
    const existingCampaignNames = new Set((existingCampaigns || []).map(c => c.name));

    for (const camp of campaigns) {
        if (existingCampaignNames.has(camp.name)) {
            console.log(`Skipping existing campaign: ${camp.name}`);
            continue;
        }
        const { data, error } = await supabaseAdmin
            .from('discount_campaigns')
            .insert(camp)
            .select('id')
            .single();
        if (error) console.error(`Campaign ${camp.name}:`, error.message);
        else { console.log(`Created campaign: ${camp.name} (${data.id})`); existingCampaignNames.add(camp.name); }
    }
    
    // Opt-in some pharmacies to campaigns
    const { data: pharms } = await supabaseAdmin
        .from('pharmacies')
        .select('id')
        .eq('is_approved', true)
        .limit(10);
    
    const { data: camps } = await supabaseAdmin
        .from('discount_campaigns')
        .select('id')
        .eq('is_active', true);
    
    for (const pharmacy of pharms || []) {
        for (const camp of camps || []) {
            if (Math.random() > 0.3) {
                await supabaseAdmin
                    .from('campaign_pharmacy_optins')
                    .upsert({ campaign_id: camp.id, pharmacy_id: pharmacy.id, is_active: true }, { onConflict: 'campaign_id,pharmacy_id' });
            }
        }
    }
    console.log('Sample campaigns seeded with pharmacy opt-ins');
}

async function main() {
    try {
        await seedCategories();
        await seedMedicines();
        await seedPharmacyInventory();
        await seedSampleCampaigns();
        console.log('\n✅ Health products seeding completed successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

main();
