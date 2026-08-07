const { supabaseAdmin } = require('../config/supabase');

(async () => {
  const TEST_USER = '42481153-c784-4dcd-ac2e-3ce07d9bf37a'; // test.patient
  let restored = 0;

  try {
    // 1. Resolve patient id(s) for the test user
    const { data: patients, error: pErr } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', TEST_USER);
    if (pErr) throw pErr;
    const patientIds = (patients || []).map((p) => p.id);

    // 2. Fetch test orders (with items so we can restore inventory)
    const { data: orders, error: oErr } = patientIds.length
      ? await supabaseAdmin.from('pharmacy_orders').select('id, items').in('patient_id', patientIds)
      : { data: [], error: null };
    if (oErr) throw oErr;

    for (const order of orders || []) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const it of items) {
        if (it.inventory_id && it.quantity > 0) {
          // Restore decremented stock
          const { data: cur } = await supabaseAdmin
            .from('pharmacy_inventory')
            .select('quantity')
            .eq('id', it.inventory_id)
            .single();
          const { error: upErr } = await supabaseAdmin
            .from('pharmacy_inventory')
            .update({ quantity: (cur?.quantity || 0) + it.quantity })
            .eq('id', it.inventory_id);
          if (upErr) console.error('restore qty err:', it.inventory_id, upErr.message);
          else restored++;
        }
      }
      await supabaseAdmin.from('pharmacy_orders').delete().eq('id', order.id);
    }
    console.log('restored inventory increments:', restored);
    console.log('deleted test orders:', (orders || []).length);

    // 3. Remove redemptions, patient, user
    if (patientIds.length) {
      const { error: rErr } = await supabaseAdmin.from('campaign_redemptions').delete().in('patient_id', patientIds);
      if (rErr) console.error('redemptions delete:', rErr.message);
      const { error: dErr } = await supabaseAdmin.from('patients').delete().in('user_id', patientIds);
      if (dErr) console.error('patients delete:', dErr.message);
    }
    const { error: uErr } = await supabaseAdmin.from('users').delete().eq('id', TEST_USER);
    if (uErr) console.error('user delete:', uErr.message);

    // 4. Snapshot final DB state
    const tables = ['medicines', 'pharmacy_inventory', 'pharmacy_orders', 'discount_campaigns', 'campaign_redemptions', 'campaign_pharmacy_optins', 'pharmacies', 'patients', 'users'];
    console.log('\n=== Final DB snapshot ===');
    for (const t of tables) {
      const { count } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
      console.log(t.padEnd(24), count);
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
})();
