/**
 * Billing Service — Phase 4
 * Encounter charge aggregation, invoicing, revenue reporting,
 * TPA claims management, and Tally XML export.
 */
const { supabaseAdmin } = require('../config/supabase');

class BillingService {
  // ═══════════════════════════════════════════════
  // ENCOUNTER CHARGES
  // ═══════════════════════════════════════════════

  /**
   * Auto-aggregate charges from lab orders, radiology orders, OT schedules,
   * nursing tasks, and manual entries for an encounter or admission.
   */
  async aggregateEncounterCharges(hospitalId, { encounterId, admissionId }) {
    const charges = [];

    // 1️⃣ Lab Orders
    const labFilter = encounterId ? { encounter_id: encounterId } : { admission_id: admissionId };
    const { data: labOrders } = await supabaseAdmin
      .from('lab_orders')
      .select('id, test_name, test_category, cost, patient_id')
      .eq('hospital_id', hospitalId)
      .match(labFilter)
      .in('status', ['approved', 'reported', 'completed']);

    for (const lab of (labOrders || [])) {
      if (lab.cost && lab.cost > 0) {
        charges.push({
          hospital_id: hospitalId,
          encounter_id: encounterId || null,
          admission_id: admissionId || null,
          patient_id: lab.patient_id,
          service_name: lab.test_name,
          category: 'lab',
          quantity: 1,
          unit_rate: parseFloat(lab.cost),
          net_amount: parseFloat(lab.cost),
          source_type: 'lab_order',
          source_id: lab.id,
          status: 'pending',
        });
      }
    }

    // 2️⃣ Radiology Orders
    const { data: radOrders } = await supabaseAdmin
      .from('radiology_orders')
      .select('id, study_description, modality, cost, patient_id')
      .eq('hospital_id', hospitalId)
      .match(labFilter)
      .in('status', ['completed', 'reported']);

    for (const rad of (radOrders || [])) {
      if (rad.cost && rad.cost > 0) {
        charges.push({
          hospital_id: hospitalId,
          encounter_id: encounterId || null,
          admission_id: admissionId || null,
          patient_id: rad.patient_id,
          service_name: rad.study_description || rad.modality,
          category: 'radiology',
          quantity: 1,
          unit_rate: parseFloat(rad.cost),
          net_amount: parseFloat(rad.cost),
          source_type: 'radiology_order',
          source_id: rad.id,
          status: 'pending',
        });
      }
    }

    // 3️⃣ OT Schedules
    const { data: otSchedules } = await supabaseAdmin
      .from('ot_schedules')
      .select('id, procedure_name, estimated_cost, patient_id')
      .eq('hospital_id', hospitalId)
      .match(labFilter)
      .in('status', ['completed']);

    for (const ot of (otSchedules || [])) {
      if (ot.estimated_cost && ot.estimated_cost > 0) {
        charges.push({
          hospital_id: hospitalId,
          encounter_id: encounterId || null,
          admission_id: admissionId || null,
          patient_id: ot.patient_id,
          service_name: ot.procedure_name || 'OT Procedure',
          category: 'ot',
          quantity: 1,
          unit_rate: parseFloat(ot.estimated_cost),
          net_amount: parseFloat(ot.estimated_cost),
          source_type: 'ot_schedule',
          source_id: ot.id,
          status: 'pending',
        });
      }
    }

    // 4️⃣ Room charges (for admissions — per-day ward charge)
    if (admissionId) {
      const { data: admission } = await supabaseAdmin
        .from('patient_admissions')
        .select('admitted_at, discharged_at, ward_id, patient_id')
        .eq('id', admissionId)
        .single();

      if (admission && admission.ward_id) {
        const { data: ward } = await supabaseAdmin
          .from('hospital_wards')
          .select('name, charge_per_day')
          .eq('id', admission.ward_id)
          .single();

        if (ward && ward.charge_per_day > 0) {
          const start = new Date(admission.admitted_at);
          const end = admission.discharged_at ? new Date(admission.discharged_at) : new Date();
          const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

          charges.push({
            hospital_id: hospitalId,
            encounter_id: encounterId || null,
            admission_id: admissionId,
            patient_id: admission.patient_id,
            service_name: `${ward.name} — Room Charges`,
            category: 'room',
            quantity: days,
            unit_rate: parseFloat(ward.charge_per_day),
            net_amount: days * parseFloat(ward.charge_per_day),
            source_type: 'admission',
            source_id: admissionId,
            status: 'pending',
          });
        }
      }
    }

    // 5️⃣ In-House Pharmacy Dispensations (Ward Indents, OT Requisitions & IPD Meds)
    const { data: pharmacyDispensations } = await supabaseAdmin
      .from('hospital_pharmacy_dispensations')
      .select('id, dispensation_number, dispense_type, total_amount, patient_id')
      .eq('hospital_id', hospitalId)
      .match(labFilter)
      .eq('status', 'dispensed');

    for (const disp of (pharmacyDispensations || [])) {
      if (disp.total_amount && parseFloat(disp.total_amount) > 0) {
        charges.push({
          hospital_id: hospitalId,
          encounter_id: encounterId || null,
          admission_id: admissionId || null,
          patient_id: disp.patient_id,
          service_name: `Pharmacy: ${disp.dispensation_number} (${disp.dispense_type || 'Dispensation'})`,
          category: 'pharmacy',
          quantity: 1,
          unit_rate: parseFloat(disp.total_amount),
          net_amount: parseFloat(disp.total_amount),
          source_type: 'pharmacy_dispensation',
          source_id: disp.id,
          status: 'pending',
        });
      }
    }

    // De-duplicate: skip charges whose source_id already exists
    if (charges.length > 0) {
      const sourceIds = charges.filter((c) => c.source_id).map((c) => c.source_id);
      const { data: existing } = await supabaseAdmin
        .from('encounter_charges')
        .select('source_id')
        .eq('hospital_id', hospitalId)
        .in('source_id', sourceIds);

      const existingSet = new Set((existing || []).map((e) => e.source_id));
      const newCharges = charges.filter((c) => !existingSet.has(c.source_id));

      if (newCharges.length > 0) {
        const { data: inserted, error } = await supabaseAdmin
          .from('encounter_charges')
          .insert(newCharges)
          .select('*');
        if (error) throw error;
        return inserted;
      }
    }

    return [];
  }

  /**
   * Get all charges for an encounter/admission.
   */
  async getCharges(hospitalId, { encounterId, admissionId, status, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let qb = supabaseAdmin
      .from('encounter_charges')
      .select('*', { count: 'exact' })
      .eq('hospital_id', hospitalId);

    if (encounterId) qb = qb.eq('encounter_id', encounterId);
    if (admissionId) qb = qb.eq('admission_id', admissionId);
    if (status) qb = qb.eq('status', status);

    const { data, count, error } = await qb
      .order('charge_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  // ═══════════════════════════════════════════════
  // INVOICING
  // ═══════════════════════════════════════════════

  /**
   * Generate invoice from pending charges.
   */
  async generateInvoice(hospitalId, { patientId, encounterId, admissionId, chargeIds, discountAmount = 0, preauthId, createdBy }) {
    // Get charges
    let qb = supabaseAdmin
      .from('encounter_charges')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending');

    if (chargeIds && chargeIds.length > 0) {
      qb = qb.in('id', chargeIds);
    } else if (encounterId) {
      qb = qb.eq('encounter_id', encounterId);
    } else if (admissionId) {
      qb = qb.eq('admission_id', admissionId);
    }

    const { data: charges, error: cErr } = await qb;
    if (cErr) throw cErr;
    if (!charges || charges.length === 0) throw new Error('No pending charges found');

    const gross = charges.reduce((s, c) => s + parseFloat(c.net_amount || 0), 0);
    const totalGst = charges.reduce((s, c) => s + parseFloat(c.gst_amount || 0), 0);
    const taxable = gross - totalGst;
    const net = gross - discountAmount;

    // Get insurance amount if pre-auth exists
    let insuranceAmount = 0;
    if (preauthId) {
      const { data: preauth } = await supabaseAdmin
        .from('insurance_preauth')
        .select('approved_amount, co_pay_percent, deductible_amount')
        .eq('id', preauthId)
        .single();
      if (preauth && preauth.approved_amount) {
        insuranceAmount = Math.min(parseFloat(preauth.approved_amount), net);
      }
    }

    const patientPayable = Math.max(0, net - insuranceAmount);

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const { count: todayCount } = await supabaseAdmin
      .from('patient_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('invoice_date', new Date().toISOString().split('T')[0]);

    const seqNum = String((todayCount || 0) + 1).padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${seqNum}`;

    // Create invoice
    const { data: invoice, error: iErr } = await supabaseAdmin
      .from('patient_invoices')
      .insert({
        hospital_id: hospitalId,
        patient_id: patientId || charges[0].patient_id,
        encounter_id: encounterId || charges[0].encounter_id,
        admission_id: admissionId || charges[0].admission_id,
        invoice_number: invoiceNumber,
        gross_amount: gross,
        discount_amount: discountAmount,
        taxable_amount: taxable,
        total_tax: totalGst,
        net_amount: net,
        balance_amount: patientPayable,
        insurance_amount: insuranceAmount,
        patient_payable: patientPayable,
        preauth_id: preauthId || null,
        status: 'draft',
        created_by: createdBy,
      })
      .select('*')
      .single();

    if (iErr) throw iErr;

    // Mark charges as billed
    const chargeIdsToUpdate = charges.map((c) => c.id);
    await supabaseAdmin
      .from('encounter_charges')
      .update({ status: 'billed', billed_in_invoice_id: invoice.id })
      .in('id', chargeIdsToUpdate);

    return { invoice, charges };
  }

  /**
   * Finalize an invoice (lock it for payment collection).
   */
  async finalizeInvoice(hospitalId, invoiceId, userId) {
    const { data, error } = await supabaseAdmin
      .from('patient_invoices')
      .update({
        status: 'finalized',
        finalized_by: userId,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('hospital_id', hospitalId)
      .eq('status', 'draft')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Record payment against an invoice.
   */
  async recordPayment(hospitalId, invoiceId, { amount, paymentMode, paymentRef }) {
    const { data: invoice, error: fErr } = await supabaseAdmin
      .from('patient_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('hospital_id', hospitalId)
      .single();

    if (fErr) throw fErr;
    if (!invoice) throw new Error('Invoice not found');

    const newPaid = parseFloat(invoice.paid_amount || 0) + parseFloat(amount);
    const newBalance = Math.max(0, parseFloat(invoice.net_amount) - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    const { data, error } = await supabaseAdmin
      .from('patient_invoices')
      .update({
        paid_amount: newPaid,
        balance_amount: newBalance,
        status: newStatus,
        payment_mode: paymentMode,
        payment_ref: paymentRef,
      })
      .eq('id', invoiceId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // ═══════════════════════════════════════════════
  // TPA CLAIMS
  // ═══════════════════════════════════════════════

  async createTpaClaim(hospitalId, claimData) {
    const { data, error } = await supabaseAdmin
      .from('tpa_claims')
      .insert({ hospital_id: hospitalId, ...claimData })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async updateTpaClaim(hospitalId, claimId, updates) {
    const allowed = ['status', 'sub_status', 'approved_amount', 'settled_amount', 'tds_amount',
      'disallowance_amount', 'claim_number', 'acknowledged_at', 'query_raised_at', 'query_response',
      'approved_at', 'settled_at', 'utr_number', 'rejection_reason', 'disallowance_reasons',
      'documents', 'communication_log', 'notes'];

    const filtered = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) filtered[k] = updates[k];
    }

    const { data, error } = await supabaseAdmin
      .from('tpa_claims')
      .update(filtered)
      .eq('id', claimId)
      .eq('hospital_id', hospitalId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async getTpaClaims(hospitalId, { status, provider, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let qb = supabaseAdmin
      .from('tpa_claims')
      .select('*, patient:patients(id, name)', { count: 'exact' })
      .eq('hospital_id', hospitalId);

    if (status) qb = qb.eq('status', status);
    if (provider) qb = qb.eq('insurance_provider', provider);

    const { data, count, error } = await qb
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  // ═══════════════════════════════════════════════
  // REVENUE REPORTING
  // ═══════════════════════════════════════════════

  /**
   * Build daily revenue summary for a specific date.
   */
  async buildDailyRevenue(hospitalId, dateStr) {
    const date = dateStr || new Date().toISOString().split('T')[0];

    // Invoices for the day
    const { data: invoices } = await supabaseAdmin
      .from('patient_invoices')
      .select('gross_amount, discount_amount, net_amount, total_tax, paid_amount, insurance_amount, payment_mode, status')
      .eq('hospital_id', hospitalId)
      .eq('invoice_date', date)
      .neq('status', 'cancelled');

    // Charges by category
    const { data: charges } = await supabaseAdmin
      .from('encounter_charges')
      .select('category, net_amount')
      .eq('hospital_id', hospitalId)
      .gte('charge_date', `${date}T00:00:00`)
      .lt('charge_date', `${date}T23:59:59`)
      .eq('status', 'billed');

    // Deposits
    const { data: deposits } = await supabaseAdmin
      .from('patient_deposits')
      .select('amount')
      .eq('hospital_id', hospitalId)
      .eq('status', 'collected')
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`);

    const inv = invoices || [];
    const chg = charges || [];
    const dep = deposits || [];

    const summary = {
      total_invoices: inv.length,
      gross_revenue: inv.reduce((s, i) => s + parseFloat(i.gross_amount || 0), 0),
      discount_given: inv.reduce((s, i) => s + parseFloat(i.discount_amount || 0), 0),
      net_revenue: inv.reduce((s, i) => s + parseFloat(i.net_amount || 0), 0),
      tax_collected: inv.reduce((s, i) => s + parseFloat(i.total_tax || 0), 0),
      total_collected: inv.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0),
      insurance_billed: inv.reduce((s, i) => s + parseFloat(i.insurance_amount || 0), 0),
      total_outstanding: inv.reduce((s, i) => {
        const bal = parseFloat(i.net_amount || 0) - parseFloat(i.paid_amount || 0);
        return s + Math.max(0, bal);
      }, 0),
      deposits_received: dep.reduce((s, d) => s + parseFloat(d.amount || 0), 0),
    };

    // Payment mode breakdown
    const byMode = { cash: 0, card: 0, upi: 0, neft: 0, other: 0 };
    for (const i of inv) {
      const mode = (i.payment_mode || 'other').toLowerCase();
      const paid = parseFloat(i.paid_amount || 0);
      if (byMode[mode] !== undefined) byMode[mode] += paid;
      else byMode.other += paid;
    }
    summary.cash_collected = byMode.cash;
    summary.card_collected = byMode.card;
    summary.upi_collected = byMode.upi;
    summary.neft_collected = byMode.neft;
    summary.other_collected = byMode.other;

    // Category revenue
    const catRevenue = {};
    for (const c of chg) {
      const cat = c.category || 'misc';
      catRevenue[cat] = (catRevenue[cat] || 0) + parseFloat(c.net_amount || 0);
    }
    summary.category_revenue = catRevenue;

    // Upsert summary
    const { data, error } = await supabaseAdmin
      .from('daily_revenue_summary')
      .upsert({
        hospital_id: hospitalId,
        summary_date: date,
        ...summary,
      }, { onConflict: 'hospital_id,summary_date' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get revenue summary for a date range.
   */
  async getRevenueSummary(hospitalId, { fromDate, toDate }) {
    const { data, error } = await supabaseAdmin
      .from('daily_revenue_summary')
      .select('*')
      .eq('hospital_id', hospitalId)
      .gte('summary_date', fromDate)
      .lte('summary_date', toDate)
      .order('summary_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ═══════════════════════════════════════════════
  // TALLY EXPORT (XML)
  // ═══════════════════════════════════════════════

  /**
   * Generate Tally XML voucher export for a date range.
   * Format: Tally ERP 9 / TallyPrime compatible XML.
   */
  async generateTallyExport(hospitalId, { fromDate, toDate, type = 'sales', exportedBy }) {
    // Get invoices for the period
    const { data: invoices, error: iErr } = await supabaseAdmin
      .from('patient_invoices')
      .select('*, patient:patients(name)')
      .eq('hospital_id', hospitalId)
      .gte('invoice_date', fromDate)
      .lte('invoice_date', toDate)
      .in('status', ['finalized', 'paid', 'partially_paid']);

    if (iErr) throw iErr;

    const inv = invoices || [];
    if (inv.length === 0) return { xml: '', voucherCount: 0 };

    // Build Tally XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ENVELOPE>\n';
    xml += '  <HEADER>\n';
    xml += '    <TALLYREQUEST>Import Data</TALLYREQUEST>\n';
    xml += '  </HEADER>\n';
    xml += '  <BODY>\n';
    xml += '    <IMPORTDATA>\n';
    xml += '      <REQUESTDESC>\n';
    xml += '        <REPORTNAME>Vouchers</REPORTNAME>\n';
    xml += '      </REQUESTDESC>\n';
    xml += '      <REQUESTDATA>\n';

    for (const invoice of inv) {
      const patientName = invoice.patient?.name || 'Patient';
      const date = invoice.invoice_date.replace(/-/g, '');

      xml += '        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n';
      xml += `          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n`;
      xml += `            <DATE>${date}</DATE>\n`;
      xml += `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
      xml += `            <VOUCHERNUMBER>${this._escapeXml(invoice.invoice_number)}</VOUCHERNUMBER>\n`;
      xml += `            <PARTYLEDGERNAME>${this._escapeXml(patientName)}</PARTYLEDGERNAME>\n`;

      // Debit: Patient account
      xml += '            <ALLLEDGERENTRIES.LIST>\n';
      xml += `              <LEDGERNAME>${this._escapeXml(patientName)}</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>-${invoice.net_amount}</AMOUNT>\n`;
      xml += '            </ALLLEDGERENTRIES.LIST>\n';

      // Credit: Sales account
      xml += '            <ALLLEDGERENTRIES.LIST>\n';
      xml += '              <LEDGERNAME>Hospital Services Revenue</LEDGERNAME>\n';
      xml += '              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n';
      xml += `              <AMOUNT>${invoice.taxable_amount || invoice.net_amount}</AMOUNT>\n`;
      xml += '            </ALLLEDGERENTRIES.LIST>\n';

      // GST entries
      if (parseFloat(invoice.total_tax || 0) > 0) {
        const halfTax = (parseFloat(invoice.total_tax) / 2).toFixed(2);
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>CGST Output</LEDGERNAME>\n';
        xml += '              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n';
        xml += `              <AMOUNT>${halfTax}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>SGST Output</LEDGERNAME>\n';
        xml += '              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n';
        xml += `              <AMOUNT>${halfTax}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
      }

      // Discount
      if (parseFloat(invoice.discount_amount || 0) > 0) {
        xml += '            <ALLLEDGERENTRIES.LIST>\n';
        xml += '              <LEDGERNAME>Discount Allowed</LEDGERNAME>\n';
        xml += '              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n';
        xml += `              <AMOUNT>-${invoice.discount_amount}</AMOUNT>\n`;
        xml += '            </ALLLEDGERENTRIES.LIST>\n';
      }

      xml += '          </VOUCHER>\n';
      xml += '        </TALLYMESSAGE>\n';
    }

    xml += '      </REQUESTDATA>\n';
    xml += '    </IMPORTDATA>\n';
    xml += '  </BODY>\n';
    xml += '</ENVELOPE>\n';

    // Save export log
    const totalAmount = inv.reduce((s, i) => s + parseFloat(i.net_amount || 0), 0);
    const { data: logEntry, error: lErr } = await supabaseAdmin
      .from('tally_export_log')
      .insert({
        hospital_id: hospitalId,
        export_type: type,
        period_from: fromDate,
        period_to: toDate,
        voucher_count: inv.length,
        total_amount: totalAmount,
        xml_content: xml,
        status: 'generated',
        exported_by: exportedBy,
      })
      .select('*')
      .single();

    if (lErr) throw lErr;

    // Mark invoices as exported
    const invoiceIds = inv.map((i) => i.id);
    await supabaseAdmin
      .from('patient_invoices')
      .update({
        tally_exported_at: new Date().toISOString(),
        tally_voucher_number: logEntry.id,
      })
      .in('id', invoiceIds);

    return {
      exportId: logEntry.id,
      xml,
      voucherCount: inv.length,
      totalAmount,
    };
  }

  _escapeXml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
}

module.exports = new BillingService();
