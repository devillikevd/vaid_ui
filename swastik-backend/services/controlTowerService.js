/**
 * Control Tower Service
 * NeoSoft-style aggregated KPI calculations (40+ metrics)
 */
const { supabaseAdmin } = require('../config/supabase');

const getControlTowerData = async (hospitalId, period = 'today') => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayStart = `${todayStr}T00:00:00.000Z`;
  const todayEnd = `${todayStr}T23:59:59.999Z`;

  // Month boundaries
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // ── Parallel queries ──
  const [
    bedsRes, wardsRes, admissionsRes, admittedRes, dischargedTodayRes,
    queueTodayRes, encountersTodayRes, labTodayRes, radTodayRes,
    otTodayRes, incidentsTodayRes, depositsRes, preauthRes,
    appointmentsTodayRes,
  ] = await Promise.all([
    // Beds
    supabaseAdmin.from('hospital_beds').select('id, status, ward_id', { count: 'exact' })
      .eq('hospital_id', hospitalId).eq('is_active', true),
    // Wards
    supabaseAdmin.from('hospital_wards').select('id, ward_type, total_beds, occupied_beds')
      .eq('hospital_id', hospitalId).eq('is_active', true),
    // All admitted patients (census)
    supabaseAdmin.from('patient_admissions').select('id, admitted_at, ward_id', { count: 'exact' })
      .eq('hospital_id', hospitalId).eq('status', 'admitted'),
    // Today admissions
    supabaseAdmin.from('patient_admissions').select('id', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('admitted_at', todayStart).lte('admitted_at', todayEnd),
    // Today discharges
    supabaseAdmin.from('patient_admissions').select('id', { count: 'exact' })
      .eq('hospital_id', hospitalId).eq('status', 'discharged')
      .gte('discharged_at', todayStart).lte('discharged_at', todayEnd),
    // Queue today
    supabaseAdmin.from('opd_queue').select('id, status, estimated_wait_minutes', { count: 'exact' })
      .eq('hospital_id', hospitalId).eq('queue_date', todayStr),
    // Encounters today
    supabaseAdmin.from('patient_encounters').select('id, encounter_type, status, net_amount', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('created_at', todayStart).lte('created_at', todayEnd),
    // Lab orders today
    supabaseAdmin.from('lab_orders').select('id, status, priority', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('created_at', todayStart).lte('created_at', todayEnd),
    // Radiology orders today
    supabaseAdmin.from('radiology_orders').select('id, status', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('created_at', todayStart).lte('created_at', todayEnd),
    // OT today
    supabaseAdmin.from('ot_schedules').select('id, status', { count: 'exact' })
      .eq('hospital_id', hospitalId)
      .gte('scheduled_start', todayStart).lte('scheduled_start', todayEnd),
    // Incidents (this month)
    supabaseAdmin.from('hospital_incidents').select('id, severity, status', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('created_at', monthStart),
    // Deposits today
    supabaseAdmin.from('patient_deposits').select('amount, type, status')
      .eq('hospital_id', hospitalId).eq('status', 'collected')
      .gte('created_at', todayStart).lte('created_at', todayEnd),
    // Pre-auth pending
    supabaseAdmin.from('insurance_preauth').select('id, status, requested_amount, approved_amount', { count: 'exact' })
      .eq('hospital_id', hospitalId).in('status', ['pending', 'query_raised']),
    // Appointments today
    supabaseAdmin.from('appointments').select('id, status', { count: 'exact' })
      .eq('hospital_id', hospitalId).gte('appointment_date', todayStart).lte('appointment_date', todayEnd),
  ]);

  // ── Compute KPIs ──
  const beds = bedsRes.data || [];
  const wards = wardsRes.data || [];
  const queueToday = queueTodayRes.data || [];
  const encountersToday = encountersTodayRes.data || [];
  const labToday = labTodayRes.data || [];
  const radToday = radTodayRes.data || [];
  const otToday = otTodayRes.data || [];
  const depositsToday = depositsRes.data || [];

  // Bed metrics
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const availableBeds = beds.filter(b => b.status === 'available').length;

  // Queue metrics
  const queueWaiting = queueToday.filter(q => q.status === 'waiting').length;
  const queueCompleted = queueToday.filter(q => q.status === 'completed').length;
  const avgWait = queueToday.length > 0
    ? Math.round(queueToday.reduce((s, q) => s + (q.estimated_wait_minutes || 0), 0) / queueToday.length) : 0;

  // Revenue metrics
  const todayRevenue = encountersToday
    .filter(e => e.status === 'completed')
    .reduce((s, e) => s + parseFloat(e.net_amount || 0), 0);
  const todayCollections = depositsToday
    .filter(d => d.type === 'advance')
    .reduce((s, d) => s + parseFloat(d.amount || 0), 0);

  // Lab metrics
  const labPending = labToday.filter(l => !['completed', 'report_ready', 'report_approved', 'dispatched', 'cancelled'].includes(l.status)).length;
  const labCompleted = labToday.filter(l => ['completed', 'report_ready', 'report_approved', 'dispatched'].includes(l.status)).length;
  const labStat = labToday.filter(l => l.priority === 'stat' || l.priority === 'urgent').length;

  // OT metrics
  const otCompleted = otToday.filter(o => o.status === 'completed').length;
  const otInProgress = otToday.filter(o => o.status === 'in_progress').length;
  const otScheduled = otToday.filter(o => o.status === 'scheduled' || o.status === 'pre_op').length;

  return {
    timestamp: now.toISOString(),
    period,

    // ── BED OCCUPANCY ──
    beds: {
      total: totalBeds,
      occupied: occupiedBeds,
      available: availableBeds,
      maintenance: beds.filter(b => b.status === 'maintenance').length,
      housekeeping: beds.filter(b => b.status === 'housekeeping').length,
      occupancy_percent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    },

    // ── IPD ──
    ipd: {
      current_census: admissionsRes.count || 0,
      admissions_today: admittedRes.count || 0,
      discharges_today: dischargedTodayRes.count || 0,
    },

    // ── OPD / QUEUE ──
    opd: {
      total_tokens_today: queueToday.length,
      waiting: queueWaiting,
      in_consultation: queueToday.filter(q => q.status === 'in_consultation').length,
      completed: queueCompleted,
      avg_wait_minutes: avgWait,
      appointments_today: appointmentsTodayRes.count || 0,
    },

    // ── ENCOUNTERS ──
    encounters: {
      total_today: encountersToday.length,
      opd: encountersToday.filter(e => e.encounter_type === 'opd').length,
      ipd: encountersToday.filter(e => e.encounter_type === 'ipd').length,
      emergency: encountersToday.filter(e => e.encounter_type === 'emergency').length,
    },

    // ── LAB ──
    lab: {
      ordered_today: labToday.length,
      pending: labPending,
      completed: labCompleted,
      stat_urgent: labStat,
    },

    // ── RADIOLOGY ──
    radiology: {
      ordered_today: radToday.length,
      pending: radToday.filter(r => !['completed', 'report_ready', 'report_approved', 'cancelled'].includes(r.status)).length,
      completed: radToday.filter(r => ['completed', 'report_ready', 'report_approved'].includes(r.status)).length,
    },

    // ── OT ──
    ot: {
      scheduled_today: otToday.length,
      completed: otCompleted,
      in_progress: otInProgress,
      upcoming: otScheduled,
    },

    // ── FINANCIAL ──
    financial: {
      today_revenue: Math.round(todayRevenue * 100) / 100,
      today_collections: Math.round(todayCollections * 100) / 100,
      pending_preauth: preauthRes.count || 0,
    },

    // ── QUALITY ──
    quality: {
      incidents_this_month: incidentsTodayRes.count || 0,
      open_incidents: (incidentsTodayRes.data || []).filter(i => !['closed', 'action_taken'].includes(i.status)).length,
      sentinel_events: (incidentsTodayRes.data || []).filter(i => i.severity === 'sentinel').length,
    },
  };
};

// Drill-down: Revenue breakdown
const getRevenueBreakdown = async (hospitalId, fromDate, toDate) => {
  const { data, error } = await supabaseAdmin
    .from('encounter_services')
    .select(`
      category, service_name, rate, quantity, net_amount,
      encounter:patient_encounters!inner(hospital_id, encounter_type, created_at)
    `)
    .eq('encounter.hospital_id', hospitalId)
    .gte('encounter.created_at', fromDate)
    .lte('encounter.created_at', toDate)
    .eq('is_cancelled', false);

  if (error) throw error;

  const byCategory = {};
  for (const item of (data || [])) {
    const cat = item.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, total: 0, count: 0 };
    byCategory[cat].total += parseFloat(item.net_amount || 0);
    byCategory[cat].count += 1;
  }

  return {
    from: fromDate,
    to: toDate,
    total: Object.values(byCategory).reduce((s, c) => s + c.total, 0),
    by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
  };
};

// Drill-down: Occupancy history
const getOccupancyDrilldown = async (hospitalId) => {
  const { data: wards, error } = await supabaseAdmin
    .from('hospital_wards')
    .select('id, name, ward_type, floor, wing, total_beds, occupied_beds, charge_per_day')
    .eq('hospital_id', hospitalId)
    .eq('is_active', true)
    .order('floor').order('name');

  if (error) throw error;

  return (wards || []).map(w => ({
    ...w,
    available_beds: w.total_beds - w.occupied_beds,
    occupancy_percent: w.total_beds > 0 ? Math.round((w.occupied_beds / w.total_beds) * 100) : 0,
  }));
};

module.exports = { getControlTowerData, getRevenueBreakdown, getOccupancyDrilldown };
