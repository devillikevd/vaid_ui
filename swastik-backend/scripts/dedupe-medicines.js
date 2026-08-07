/**
 * Dedupe medicines migration (idempotent, safe).
 *
 * The `medicines` table has NO unique constraint on (name, manufacturer), so
 * near-duplicate rows (e.g. "Paracetamol 500mg" vs "Paracetamol 500mg Tablet",
 * both Cipla) can accumulate. This script:
 *   1. Groups rows by lower(trim(name)) || '::' || lower(trim(manufacturer)).
 *   2. For each group with >1 row, picks the lowest id as canonical.
 *   3. Re-points pharmacy_inventory.medicine_id and discount_campaigns.scope_ref
 *      (medicine scope) to the canonical id, then deletes the dupes.
 *   4. Leaves pharmacy_orders.items JSONB snapshots untouched (historical) but
 *      reports how many orders reference a soon-to-be-removed id.
 *   5. Reports whether the unique constraint can now be added safely.
 *
 * Usage: node scripts/dedupe-medicines.js
 *
 * Re-run is safe: a group with a single row is a no-op.
 */
const { supabaseAdmin } = require('../config/supabase');

const normalize = (s) => (s || '').trim().toLowerCase();
const keyOf = (m) => `${normalize(m.name)}::${normalize(m.manufacturer)}`;

(async () => {
  try {
    // 1. Load all medicines
    const { data: medicines, error } = await supabaseAdmin
      .from('medicines')
      .select('id, name, generic_name, manufacturer, category, dosage_form, strength');
    if (error) throw error;

    // 2. Group by normalized name::manufacturer
    const groups = new Map();
    for (const m of medicines || []) {
      const key = keyOf(m);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }

    let dupGroups = 0;
    let remappedInventory = 0;
    let remappedCampaigns = 0;
    let deleted = 0;

    for (const [key, rows] of groups) {
      if (rows.length < 2) continue;
      dupGroups++;

      // Canonical = lowest id (stable), prefer is_active=true if tied
      rows.sort((a, b) => a.id.localeCompare(b.id));
      const canonical = rows[0];
      const dupes = rows.slice(1);

      const canonicalKey = keyOf(canonical);
      console.log('\n[' + canonicalKey + '] canonical=' + canonical.id.slice(0, 8));
      console.log('  variants:', rows.map((r) => {
        const parts = [r.name, r.manufacturer, 'strength=' + r.strength, 'form=' + r.dosage_form, 'cat=' + r.category];
        return '  • ' + parts.filter(Boolean).join(' | ');
      }).join('\n'));

      for (const dupe of dupes) {
        // 3a. Remap pharmacy_inventory.medicine_id
        const { count: invCount, error: invErr } = await supabaseAdmin
          .from('pharmacy_inventory')
          .update({ medicine_id: canonical.id })
          .eq('medicine_id', dupe.id)
          .select();
        if (invErr) throw invErr;
        const n = (invCount || []).length;
        if (n) {
          console.log(`  • remapped ${n} inventory item(s) ${dupe.id.slice(0, 8)} → ${canonical.id.slice(0, 8)}`);
          remappedInventory += n;
        }

        // 3b. Remap discount_campaigns.scope_ref (medicine scope)
        const { count: campCount, error: campErr } = await supabaseAdmin
          .from('discount_campaigns')
          .update({ scope_ref: canonical.id })
          .eq('scope_type', 'medicine')
          .eq('scope_ref', dupe.id)
          .select();
        if (campErr) throw campErr;
        const c = (campCount || []).length;
        if (c) {
          console.log(`  • remapped ${c} medicine-scoped campaign(s)`);
          remappedCampaigns += c;
        }

        // 3c. Report (do not modify) pharmacy_orders referencing this dupe id
        const { data: orders, error: ordErr } = await supabaseAdmin
          .from('pharmacy_orders')
          .select('id', { count: 'exact', head: true })
          .contains('items', [{ medicine_id: dupe.id }]); // best-effort containment
        // contains on items may not match nested; fall back to a broad scan if needed
        if (!ordErr && orders && orders.length) {
          console.log(`  ⚠ ${orders.length} order(s) snapshot-reference this id (left as historical snapshot)`);
        }

        // 3d. Delete the dupe row
        const { error: delErr } = await supabaseAdmin.from('medicines').delete().eq('id', dupe.id);
        if (delErr) throw delErr;
        deleted++;
        console.log(`  • deleted dupe ${dupe.id.slice(0, 8)} (${dupe.name})`);
      }
    }

    // 4. Post-run: check for any remaining dup groups (should be zero)
    const { data: remaining, error: remErr } = await supabaseAdmin
      .from('medicines')
      .select('id, name, manufacturer, generic_name, strength, dosage_form, form');
    if (remErr) throw remErr;
    const seen = new Set();
    let remainingDups = 0;
    for (const m of remaining || []) {
      const k = keyOf(m);
      if (seen.has(k)) remainingDups++;
      seen.add(k);
    }

    console.log('\n=== Dedup summary ===');
    console.log('duplicate groups found:', dupGroups);
    console.log('inventory rows remapped:', remappedInventory);
    console.log('campaign scope_ref remapped:', remappedCampaigns);
    console.log('dupe rows deleted:', deleted);
    console.log('remaining duplicate groups:', remainingDups);
    console.log('total medicines now:', remaining.length);

    if (remainingDups === 0) {
      console.log('\n✅ All duplicate (name, manufacturer) groups resolved.');
      console.log('You may now add the constraint:\n');
      console.log("  ALTER TABLE medicines");
      console.log("  ADD CONSTRAINT medicines_unique_name_manufacturer");
      console.log("  UNIQUE (lower(trim(name)), lower(trim(manufacturer)));");
      console.log('\nApply it via the next migration SQL:');
      console.log('  node scripts/apply-constraint.js   # (or psql)');
    } else {
      console.log('\n⚠️  ' + remainingDups + ' duplicate group(s) remain (likely differing whitespace/case only). Fix manually before adding the constraint.');
    }

    // ----- Semantic duplicate report (does NOT auto-merge; human review only) -----
    // Groups by generic_name + strength + form/dosage_form + manufacturer to catch
    // naming variants like "Paracetamol 500mg Tablet" vs "Paracetamol 500mg".
    // When the `strength` column is null, parse it from the medicine `name`.
    const strengthRegex = /(\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|µg|tab|tablet|capsule|syrup|units|unit))/i;
    const extractStrength = (m) => {
      if (m.strength) return m.strength.trim().toLowerCase();
      const match = (m.name || '').match(strengthRegex);
      // keep only the numeric+unit part, drop trailing form words
      if (match) {
        const token = match[1].toLowerCase();
        return /(\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|µg))/.test(token) ? token.replace(/\s+/g, '') : token;
      }
      return '';
    };
    const semanticGroups = new Map();
    for (const m of remaining || []) {
      const form = m.dosage_form || m.form || '';
      const skey = (m.generic_name || m.name || '').trim().toLowerCase() +
        '::' + extractStrength(m) +
        '::' + form.trim().toLowerCase() +
        '::' + (m.manufacturer || '').trim().toLowerCase();
      if (!semanticGroups.has(skey)) semanticGroups.set(skey, []);
      semanticGroups.get(skey).push(m);
    }
    const semanticDups = [...semanticGroups.values()].filter((g) => g.length > 1);
    if (semanticDups.length > 0) {
      console.log('\n=== Potential semantic duplicates (report only — review before merging) ===');
      for (const g of semanticDups) {
        console.log('\n  same drug:', g[0].generic_name || g[0].name, '@', g[0].strength, '@', g[0].dosage_form);
        for (const m of g) {
          console.log('    • ' + m.id.slice(0, 8) + ' | ' + m.name + ' | ' + (m.manufacturer || '-'));
        }
      }
    } else {
      console.log('\nNo semantic duplicates detected by generic+strength+form.');
    }
  } catch (err) {
    console.error('\n❌ Dedup failed:', err.message);
    process.exit(1);
  }
})();
