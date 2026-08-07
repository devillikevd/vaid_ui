/**
 * Discount Campaign Service
 * Shared pricing engine used by the discounts route and the pharmacy order flow.
 * Single source of truth for campaign pricing (admin-controlled campaigns).
 */
const { supabaseAdmin } = require('../config/supabase');

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Fetch active campaigns plus the pharmacy's opt-in set plus total redemption counts
 * in as few queries as possible.
 */
const fetchActiveCampaigns = async ({ pharmacyId } = {}) => {
  const now = new Date().toISOString();

  let query = supabaseAdmin
    .from('discount_campaigns')
    .select('*')
    .eq('is_active', true)
    .lte('start_at', now)
    .gte('end_at', now)
    .or('scope_type.eq.global,scope_type.eq.medicine');

  const { data: campaigns, error } = await query;
  if (error) throw error;

  const pharmacyOptinCampaignIds = new Set();
  if (pharmacyId && campaigns.length > 0) {
    const { data: optins, error: optErr } = await supabaseAdmin
      .from('campaign_pharmacy_optins')
      .select('campaign_id')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true);
    if (optErr) throw optErr;
    (optins || []).forEach((o) => pharmacyOptinCampaignIds.add(o.campaign_id));
  }

  const redemptionCounts = new Map();
  if (campaigns.length > 0) {
    const { data: redemptions, error: redErr } = await supabaseAdmin
      .from('campaign_redemptions')
      .select('campaign_id');
    if (redErr) throw redErr;
    const grouped = {};
    (redemptions || []).forEach((r) => { grouped[r.campaign_id] = (grouped[r.campaign_id] || 0) + 1; });
    Object.entries(grouped).forEach(([k, v]) => redemptionCounts.set(k, v));
  }

  return { campaigns: campaigns || [], pharmacyOptinCampaignIds, redemptionCounts };
};

/**
 * Compute the best campaign price for each medicine.
 * @param {string[]} medicineIds
 * @param {object} options
 * @param {string} [options.pharmacyId] - if set, prices come from pharmacy_inventory and
 *        only opted-in campaigns apply. If null, prices come from the medicines table and
 *        global campaigns apply (global catalogue).
 * @param {number} [options.quantity=1]
 * @param {string} [options.userId] - patient user id for per-user redemption caps.
 */
const computeBestPrices = async (medicineIds, { pharmacyId = null, quantity = 1, quantities = null, userId = null } = {}) => {
  const ids = [...new Set((medicineIds || []).filter(Boolean))];
  if (ids.length === 0) return [];

  // Base prices
  let basePrices = [];
  if (pharmacyId) {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('pharmacy_inventory')
      .select('medicine_id, price, mrp')
      .in('medicine_id', ids)
      .eq('pharmacy_id', pharmacyId)
      .gt('quantity', 0);
    if (invErr) throw invErr;
    basePrices = inv || [];
  } else {
    const { data: meds, error: medErr } = await supabaseAdmin
      .from('medicines')
      .select('id, price, mrp')
      .in('id', ids);
    if (medErr) throw medErr;
    basePrices = (meds || []).map((m) => ({ medicine_id: m.id, price: m.price, mrp: m.mrp }));
  }

  const { campaigns, pharmacyOptinCampaignIds, redemptionCounts } = await fetchActiveCampaigns({ pharmacyId });

  // Per-user redemption counts (one query per user, reused across campaigns).
  // campaign_redemptions.patient_id references patients(id) — resolve the patient row first.
  let userRedemptionCounts = new Map();
  if (userId) {
    const { data: patient, error: patientErr } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!patientErr && patient) {
      const { data: userReds, error: redErr } = await supabaseAdmin
        .from('campaign_redemptions')
        .select('campaign_id')
        .eq('patient_id', patient.id);
      if (!redErr) {
        const grouped = {};
        (userReds || []).forEach((r) => { grouped[r.campaign_id] = (grouped[r.campaign_id] || 0) + 1; });
        Object.entries(grouped).forEach(([k, v]) => userRedemptionCounts.set(k, v));
      }
    }
  }

  return basePrices.map(({ medicine_id, price, mrp }) => {
    const basePrice = parseFloat(price);
    const baseMrp = mrp ? parseFloat(mrp) : basePrice;
    let bestCampaign = null;
    let finalPrice = basePrice;

    for (const camp of campaigns) {
      // Scope filter
      if (camp.scope_type === 'medicine' && camp.scope_ref !== medicine_id) continue;

      // Pharmacy context: only opted-in campaigns apply
      if (pharmacyId && !pharmacyOptinCampaignIds.has(camp.id)) continue;

      // Min order check (per item, based on that medicine's actual quantity)
      const itemQty = (quantities && quantities[medicine_id]) || quantity || 1;
      const orderValue = basePrice * itemQty;
      if (orderValue < parseFloat(camp.min_order_value || 0)) continue;

      // Total redemption cap
      if (camp.max_redemptions_total &&
          (redemptionCounts.get(camp.id) || 0) >= camp.max_redemptions_total) continue;

      // Per-user redemption cap
      if (camp.max_redemptions_per_user &&
          (userRedemptionCounts.get(camp.id) || 0) >= camp.max_redemptions_per_user) continue;

      let discount = 0;
      if (camp.discount_type === 'percentage') {
        discount = (basePrice * parseFloat(camp.discount_value)) / 100;
      } else {
        discount = parseFloat(camp.discount_value);
      }
      if (camp.max_discount_per_order && discount > parseFloat(camp.max_discount_per_order)) {
        discount = parseFloat(camp.max_discount_per_order);
      }
      if (basePrice - discount < 0) discount = basePrice;

      if (discount > (basePrice - finalPrice)) {
        bestCampaign = camp;
        finalPrice = basePrice - discount;
      }
    }

    return {
      medicine_id,
      base_price: round2(basePrice),
      mrp: round2(baseMrp),
      final_price: round2(finalPrice),
      discount_amount: bestCampaign ? round2(basePrice - finalPrice) : 0,
      discount_percentage: bestCampaign ? round2(((basePrice - finalPrice) / basePrice) * 100) : 0,
      campaign: bestCampaign ? {
        id: bestCampaign.id,
        name: bestCampaign.name,
        discount_type: bestCampaign.discount_type,
        discount_value: bestCampaign.discount_value,
      } : null,
    };
  });
};

/**
 * Record redemptions for an order.
 */
const recordRedemptions = async ({ campaignIds = [], pharmacyId, patientUserId, orderId, discountAmountsByCampaign = {} }) => {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) return;

  // Resolve patient id from user id
  const { data: patient, error: patientErr } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', patientUserId)
    .maybeSingle();
  if (patientErr || !patient) return;

  const rows = campaignIds.map((campaignId) => ({
    campaign_id: campaignId,
    pharmacy_id: pharmacyId,
    patient_id: patient.id,
    order_id: orderId,
    discount_amount: discountAmountsByCampaign[campaignId] || 0,
    redeemed_at: new Date().toISOString(),
  }));

  await supabaseAdmin.from('campaign_redemptions').insert(rows);
};

/**
 * Remove all campaign redemptions for a cancelled order so that
 * max_redemptions_total and max_redemptions_per_user caps are released.
 */
const voidRedemptionsForOrder = async (orderId) => {
  if (!orderId) return;
  const { error } = await supabaseAdmin
    .from('campaign_redemptions')
    .delete()
    .eq('order_id', orderId);
  if (error) console.error('Failed to void campaign redemptions for order', orderId, error.message);
};

module.exports = { computeBestPrices, recordRedemptions, fetchActiveCampaigns, voidRedemptionsForOrder };
