/**
 * Disease Outbreak Detection Service
 *
 * Collects anonymized health signals from across the VAIDIDEA ecosystem
 * (appointments, prescriptions, emergency requests, chatbot interactions)
 * and runs periodic anomaly detection to identify potential disease outbreaks.
 *
 * Architecture:
 *   1. recordHealthEvent()  — called by existing backend hooks (after-save)
 *   2. runOutbreakAnalysis() — called by internal cron every 6 hours
 *   3. getOutbreakDashboard() — admin-facing API for heat-map and alert list
 */

const { supabaseAdmin } = require('../config/supabase');

// ─── Symptom/Disease taxonomy (maps raw text → normalized categories) ───

const DISEASE_KEYWORDS = {
  dengue:       ['dengue', 'dengue fever', 'platelet', 'aedes', 'hemorrhagic'],
  malaria:      ['malaria', 'plasmodium', 'mosquito bite fever', 'chills fever'],
  typhoid:      ['typhoid', 'enteric fever', 'widal', 'salmonella'],
  cholera:      ['cholera', 'acute watery diarrhea', 'rice water stool'],
  covid:        ['covid', 'corona', 'sars-cov', 'rt-pcr positive', 'covid-19'],
  influenza:    ['influenza', 'flu', 'h1n1', 'swine flu', 'seasonal flu'],
  tuberculosis: ['tuberculosis', 'tb', 'mycobacterium', 'pulmonary tb'],
  chikungunya:  ['chikungunya', 'joint pain fever', 'chik'],
  gastroenteritis: ['gastroenteritis', 'food poisoning', 'stomach infection', 'vomiting diarrhea'],
  respiratory:  ['pneumonia', 'bronchitis', 'respiratory infection', 'breathing difficulty', 'cough cold'],
  jaundice:     ['jaundice', 'hepatitis', 'liver infection', 'yellow eyes'],
  measles:      ['measles', 'rubella', 'rash fever'],
  leptospirosis:['leptospirosis', 'rat fever', 'weil disease'],
};

const SYMPTOM_CLUSTERS = {
  fever_cluster:       ['fever', 'high temperature', 'body temperature', 'pyrexia'],
  respiratory_cluster: ['cough', 'cold', 'sore throat', 'breathlessness', 'wheezing', 'runny nose'],
  gi_cluster:          ['diarrhea', 'vomiting', 'nausea', 'abdominal pain', 'loose motion', 'stomach ache'],
  skin_cluster:        ['rash', 'itching', 'skin redness', 'blisters', 'boils'],
  pain_cluster:        ['headache', 'body pain', 'joint pain', 'muscle pain', 'backache'],
};

// ─── Age group classification helper ───

function classifyAgeGroup(dateOfBirth) {
  if (!dateOfBirth) return 'unknown';
  const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 5) return '0-4';
  if (age < 18) return '5-17';
  if (age < 35) return '18-34';
  if (age < 50) return '35-49';
  if (age < 65) return '50-64';
  return '65+';
}

// ─── Normalize health text → detected diseases/symptoms ───

function extractHealthSignals(text) {
  if (!text) return { diseases: [], symptoms: [] };
  const lower = text.toLowerCase();

  const diseases = [];
  for (const [disease, keywords] of Object.entries(DISEASE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) diseases.push(disease);
  }

  const symptoms = [];
  for (const [cluster, keywords] of Object.entries(SYMPTOM_CLUSTERS)) {
    if (keywords.some(kw => lower.includes(kw))) symptoms.push(cluster);
  }

  return { diseases, symptoms };
}

// ═══════════════════════════════════════════════════════════════════
//  1. DATA COLLECTION — called by existing route handlers
// ═══════════════════════════════════════════════════════════════════

/**
 * Record a health event from any source.
 * This is a fire-and-forget call — it never blocks the main request.
 */
async function recordHealthEvent({ source, sourceId, rawText, diagnosisText, symptoms: rawSymptoms, patientId, city, state, pincode, latitude, longitude }) {
  try {
    // Combine all text for signal extraction
    const combinedText = [rawText, diagnosisText, ...(rawSymptoms || [])].filter(Boolean).join(' ');
    const signals = extractHealthSignals(combinedText);

    // Skip if no meaningful health signal detected
    if (signals.diseases.length === 0 && signals.symptoms.length === 0) return;

    // Determine event type (prefer specific disease over symptom cluster)
    const eventType = signals.diseases[0] || signals.symptoms[0] || 'unknown';
    const allSymptoms = [...new Set([...signals.diseases, ...signals.symptoms.map(s => s.replace('_cluster', ''))])];

    // Get anonymized patient demographics (age group + gender only)
    let ageGroup = 'unknown';
    let gender = 'unknown';
    if (patientId) {
      const { data: patient } = await supabaseAdmin.from('patients')
        .select('date_of_birth, gender')
        .eq('id', patientId)
        .single();
      if (patient) {
        ageGroup = classifyAgeGroup(patient.date_of_birth);
        gender = patient.gender || 'unknown';
      }
    }

    // Determine severity based on disease type
    let severity = 'low';
    const highSeverity = ['cholera', 'dengue', 'covid', 'tuberculosis', 'leptospirosis'];
    const medSeverity = ['malaria', 'typhoid', 'chikungunya', 'measles', 'jaundice'];
    if (highSeverity.some(d => signals.diseases.includes(d))) severity = 'high';
    else if (medSeverity.some(d => signals.diseases.includes(d))) severity = 'medium';

    await supabaseAdmin.from('health_events').insert({
      source,
      source_id: sourceId || null,
      event_type: eventType,
      symptoms: allSymptoms,
      diagnosis: diagnosisText || null,
      severity,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      patient_age_group: ageGroup,
      patient_gender: gender,
      event_date: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    // Never throw — this is a background side-effect
    console.error('[OutbreakService] recordHealthEvent failed:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  2. ANOMALY DETECTION — runs on a timer
// ═══════════════════════════════════════════════════════════════════

/**
 * Aggregate events by city+event_type over the last N days,
 * compare against the 30-day baseline, and flag anomalies.
 *
 * Algorithm: Modified Z-Score
 *   z = (current_count - baseline_mean) / baseline_stddev
 *   If z > 2.0 → watch
 *   If z > 3.0 → warning
 *   If z > 4.0 → critical
 */
async function runOutbreakAnalysis() {
  const now = new Date();
  const windowDays = 3;      // Look at the last 3 days
  const baselineDays = 30;   // Compare against 30-day baseline

  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const baselineStart = new Date(now);
  baselineStart.setDate(baselineStart.getDate() - baselineDays);

  console.log(`[OutbreakService] Running analysis — window: ${windowStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}, baseline: ${baselineStart.toISOString().slice(0, 10)}`);

  try {
    // 1. Get current window events grouped by city + event_type
    const { data: recentEvents, error: recentErr } = await supabaseAdmin
      .from('health_events')
      .select('city, state, event_type, patient_age_group, patient_gender, latitude, longitude')
      .gte('event_date', windowStart.toISOString().slice(0, 10))
      .not('city', 'is', null);

    if (recentErr) throw recentErr;
    if (!recentEvents || recentEvents.length === 0) {
      console.log('[OutbreakService] No recent events to analyze');
      return { alertsCreated: 0 };
    }

    // Group by city + event_type
    const currentGroups = {};
    for (const e of recentEvents) {
      const key = `${(e.city || '').toLowerCase()}|${e.event_type}`;
      if (!currentGroups[key]) {
        currentGroups[key] = {
          city: e.city, state: e.state, eventType: e.event_type,
          count: 0, ageGroups: {}, genderDist: {},
          latSum: 0, lonSum: 0, coordCount: 0, coords: [],
        };
      }
      const g = currentGroups[key];
      g.count++;
      g.ageGroups[e.patient_age_group || 'unknown'] = (g.ageGroups[e.patient_age_group || 'unknown'] || 0) + 1;
      g.genderDist[e.patient_gender || 'unknown'] = (g.genderDist[e.patient_gender || 'unknown'] || 0) + 1;
      if (e.latitude && e.longitude) { 
        g.latSum += e.latitude; g.lonSum += e.longitude; g.coordCount++; 
        g.coords.push({ lat: e.latitude, lon: e.longitude });
      }
    }

    // 2. Get baseline events for same groupings
    const { data: baselineEvents, error: baseErr } = await supabaseAdmin
      .from('health_events')
      .select('city, event_type, event_date')
      .gte('event_date', baselineStart.toISOString().slice(0, 10))
      .lt('event_date', windowStart.toISOString().slice(0, 10))
      .not('city', 'is', null);

    if (baseErr) throw baseErr;

    // Group baseline by city + event_type per day
    const baselineByDay = {};
    for (const e of (baselineEvents || [])) {
      const key = `${(e.city || '').toLowerCase()}|${e.event_type}`;
      if (!baselineByDay[key]) baselineByDay[key] = {};
      const day = e.event_date;
      baselineByDay[key][day] = (baselineByDay[key][day] || 0) + 1;
    }

    // 3. Calculate z-scores and generate alerts
    let alertsCreated = 0;
    const baselineWindowDays = baselineDays - windowDays; // Days in baseline period

    for (const [key, group] of Object.entries(currentGroups)) {
      const dailyCurrent = group.count / windowDays; // avg events per day in current window

      // Calculate baseline mean and stddev
      const dayData = baselineByDay[key] || {};
      const dayCounts = Object.values(dayData);
      // Fill in zeroes for days with no events
      const totalBaseDays = baselineWindowDays;
      while (dayCounts.length < totalBaseDays) dayCounts.push(0);

      const mean = dayCounts.reduce((a, b) => a + b, 0) / totalBaseDays;
      const variance = dayCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totalBaseDays;
      const stddev = Math.sqrt(variance);

      // Skip if baseline is too low (not enough data yet)
      if (mean < 0.1 && group.count < 5) continue;

      // Z-score (prevent division by zero — use 1 if stddev is 0)
      const z = stddev > 0 ? (dailyCurrent - mean) / stddev : (dailyCurrent > mean ? dailyCurrent - mean : 0);

      // Check for Geographic Clustering (Hotspots)
      // If all cases are tightly clustered within a small radius, it's a stronger outbreak signal
      let spatialMultiplier = 1.0;
      let clusterRadiusKm = null;
      
      const avgLat = group.coordCount > 0 ? group.latSum / group.coordCount : null;
      const avgLon = group.coordCount > 0 ? group.lonSum / group.coordCount : null;

      if (group.coordCount > 2) {
        let maxDist = 0;
        for (const coord of group.coords) {
          const dLat = (coord.lat - avgLat) * 111; // 1 degree latitude = ~111km
          const dLon = (coord.lon - avgLon) * 111 * Math.cos(avgLat * (Math.PI / 180));
          const dist = Math.sqrt(dLat * dLat + dLon * dLon);
          if (dist > maxDist) maxDist = dist;
        }
        clusterRadiusKm = maxDist;
        
        // If tightly clustered within a 5km radius, boost the z-score by 50%
        if (clusterRadiusKm < 5.0) spatialMultiplier = 1.5;
        // If within 10km radius, boost by 20%
        else if (clusterRadiusKm < 10.0) spatialMultiplier = 1.2;
      }

      const finalZScore = z * spatialMultiplier;

      let severity = null;
      if (finalZScore >= 4.0 || group.count >= 30) severity = 'critical';
      else if (finalZScore >= 3.0 || group.count >= 15) severity = 'warning';
      else if (finalZScore >= 2.0 || group.count >= 8) severity = 'watch';

      if (!severity) continue;

      // Check if active alert already exists for this city + disease
      const { data: existingAlert } = await supabaseAdmin
        .from('outbreak_alerts')
        .select('id, event_count, severity')
        .eq('city', group.city)
        .eq('disease_or_symptom', group.eventType)
        .in('status', ['active', 'monitoring'])
        .single();

      // Generate recommendation
      const recommendations = generateRecommendation(group.eventType, severity, group.city, group.count);

      if (existingAlert) {
        // Update existing alert if severity escalated or count increased
        const updates = {
          event_count: group.count,
          baseline_count: Math.round(mean * windowDays),
          deviation_score: Math.round(finalZScore * 100) / 100,
          age_groups: group.ageGroups,
          gender_distribution: group.genderDist,
          recommendations,
          updated_at: new Date().toISOString(),
        };
        // Escalate severity if needed
        const severityRank = { watch: 1, warning: 2, critical: 3 };
        if (severityRank[severity] > severityRank[existingAlert.severity]) {
          updates.severity = severity;
          // Severity escalated — notify patients
          notifyPatientsInArea(group.eventType, severity, group.city, group.count).catch(() => {});
        }
        await supabaseAdmin.from('outbreak_alerts').update(updates).eq('id', existingAlert.id);
      } else {
        // Create new alert
        await supabaseAdmin.from('outbreak_alerts').insert({
          alert_type: 'anomaly_detection',
          disease_or_symptom: group.eventType,
          severity,
          city: group.city,
          state: group.state,
          latitude: avgLat,
          longitude: avgLon,
          event_count: group.count,
          baseline_count: Math.round(mean * windowDays),
          deviation_score: Math.round(z * 100) / 100,
          age_groups: group.ageGroups,
          gender_distribution: group.genderDist,
          recommendations,
        });
        alertsCreated++;

        // New warning/critical alert — push notifications to patients in affected area
        if (severity === 'warning' || severity === 'critical') {
          notifyPatientsInArea(group.eventType, severity, group.city, group.count).catch(() => {});
        }
      }
    }

    // 4. Auto-resolve alerts that are no longer active
    const { data: activeAlerts } = await supabaseAdmin
      .from('outbreak_alerts')
      .select('id, city, disease_or_symptom')
      .in('status', ['active', 'monitoring']);

    for (const alert of (activeAlerts || [])) {
      const key = `${(alert.city || '').toLowerCase()}|${alert.disease_or_symptom}`;
      if (!currentGroups[key] || currentGroups[key].count < 3) {
        await supabaseAdmin.from('outbreak_alerts')
          .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', alert.id);
      }
    }

    console.log(`[OutbreakService] Analysis complete — ${alertsCreated} new alert(s), ${Object.keys(currentGroups).length} area(s) analyzed`);
    return { alertsCreated, areasAnalyzed: Object.keys(currentGroups).length };
  } catch (err) {
    console.error('[OutbreakService] Analysis failed:', err.message);
    return { alertsCreated: 0, error: err.message };
  }
}

// ─── Recommendation generator ───

function generateRecommendation(disease, severity, city, count) {
  const recs = {
    dengue:        'Use mosquito repellent. Eliminate stagnant water. Seek medical attention if experiencing high fever with body pain.',
    malaria:       'Use insecticide-treated mosquito nets. Take antimalarial prophylaxis if in endemic zone.',
    typhoid:       'Drink only boiled/purified water. Avoid street food. Get Widal test if experiencing prolonged fever.',
    cholera:       'Use ORS for hydration. Drink only treated water. Report symptoms immediately to nearest health facility.',
    covid:         'Wear masks in crowded areas. Maintain hand hygiene. Get tested if symptomatic.',
    influenza:     'Cover mouth when coughing. Stay home if symptomatic. Consider flu vaccination.',
    tuberculosis:  'Get sputum test done. Complete full course of medication. Maintain ventilation in living spaces.',
    chikungunya:   'Use mosquito repellent. Rest and hydrate. Joint pain may persist — consult a doctor.',
    gastroenteritis:'Maintain food hygiene. Drink ORS. Avoid outside food during outbreak period.',
    respiratory:   'Avoid crowded and poorly ventilated spaces. Wear masks. Consult doctor if cough persists beyond 3 days.',
    jaundice:      'Drink clean water. Avoid alcohol. Get liver function tests done.',
    measles:       'Ensure MMR vaccination is up to date. Isolate infected individuals.',
    leptospirosis: 'Avoid wading in flood water. Wear protective footwear. Seek treatment if experiencing fever after exposure.',
  };

  const base = recs[disease] || 'Consult a healthcare professional if experiencing symptoms. Follow basic hygiene practices.';
  const prefix = severity === 'critical'
    ? `⚠️ CRITICAL ALERT: High concentration of ${disease} cases detected in ${city} (${count} cases).`
    : severity === 'warning'
    ? `🟡 WARNING: Elevated ${disease} cases in ${city} (${count} cases).`
    : `🔵 WATCH: Mild uptick in ${disease} cases in ${city} (${count} cases).`;

  return `${prefix} ${base}`;
}

// ═══════════════════════════════════════════════════════════════════
//  3. ADMIN API — Dashboard data
// ═══════════════════════════════════════════════════════════════════

/**
 * Get outbreak dashboard data for the admin panel.
 */
async function getOutbreakDashboard({ status, severity, city, page = 1, limit = 20 } = {}) {
  let query = supabaseAdmin.from('outbreak_alerts')
    .select('*', { count: 'exact' })
    .order('detected_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);
  if (city) query = query.ilike('city', `%${city}%`);

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data: alerts, error, count } = await query;
  if (error) throw error;

  // Summary stats
  const { data: stats } = await supabaseAdmin.from('outbreak_alerts')
    .select('severity, status')
    .in('status', ['active', 'monitoring']);

  const summary = {
    totalActive: (stats || []).filter(s => s.status === 'active').length,
    totalMonitoring: (stats || []).filter(s => s.status === 'monitoring').length,
    critical: (stats || []).filter(s => s.severity === 'critical' && s.status === 'active').length,
    warning: (stats || []).filter(s => s.severity === 'warning' && s.status === 'active').length,
    watch: (stats || []).filter(s => s.severity === 'watch' && s.status === 'active').length,
  };

  return {
    alerts,
    summary,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  };
}

/**
 * Get heat-map data for the admin dashboard map.
 * Returns active/monitoring alerts with coordinates for plotting.
 */
async function getHeatmapData() {
  const { data: alerts, error } = await supabaseAdmin
    .from('outbreak_alerts')
    .select('id, disease_or_symptom, severity, city, state, latitude, longitude, event_count, baseline_count, deviation_score, recommendations, detected_at')
    .in('status', ['active', 'monitoring'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw error;

  return (alerts || []).map(a => ({
    id: a.id,
    disease: a.disease_or_symptom,
    severity: a.severity,
    city: a.city,
    state: a.state,
    lat: a.latitude,
    lng: a.longitude,
    cases: a.event_count,
    baseline: a.baseline_count,
    zScore: a.deviation_score,
    recommendations: a.recommendations,
    detectedAt: a.detected_at,
  }));
}

/**
 * Get a single alert with full details.
 */
async function getAlertDetails(alertId) {
  const { data: alert, error } = await supabaseAdmin
    .from('outbreak_alerts')
    .select('*')
    .eq('id', alertId)
    .single();

  if (error) throw error;
  if (!alert) throw new Error('Alert not found');

  // Get recent health events that contributed to this alert
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);

  const { data: events } = await supabaseAdmin
    .from('health_events')
    .select('source, event_type, symptoms, severity, patient_age_group, patient_gender, event_date')
    .eq('city', alert.city)
    .eq('event_type', alert.disease_or_symptom)
    .gte('event_date', windowStart.toISOString().slice(0, 10))
    .order('event_date', { ascending: false })
    .limit(50);

  // Build timeline
  const timeline = {};
  for (const e of (events || [])) {
    timeline[e.event_date] = (timeline[e.event_date] || 0) + 1;
  }

  return {
    ...alert,
    recentEvents: events || [],
    timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Update alert status (dismiss/resolve/monitor).
 */
async function updateAlertStatus(alertId, status, adminId, notes) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved' || status === 'dismissed') {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = adminId;
  }
  if (notes) updates.admin_notes = notes;

  const { data, error } = await supabaseAdmin
    .from('outbreak_alerts')
    .update(updates)
    .eq('id', alertId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recent health event statistics for the dashboard.
 */
async function getHealthEventStats(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: events, error } = await supabaseAdmin
    .from('health_events')
    .select('source, event_type, city, event_date, severity')
    .gte('event_date', since.toISOString().slice(0, 10));

  if (error) throw error;

  // Aggregate
  const bySource = {};
  const byDisease = {};
  const byCity = {};
  const byDay = {};

  for (const e of (events || [])) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    byDisease[e.event_type] = (byDisease[e.event_type] || 0) + 1;
    byCity[e.city || 'unknown'] = (byCity[e.city || 'unknown'] || 0) + 1;
    byDay[e.event_date] = (byDay[e.event_date] || 0) + 1;
  }

  return {
    totalEvents: (events || []).length,
    bySource,
    topDiseases: Object.entries(byDisease).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    topCities: Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    dailyTrend: Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  4. PATIENT-FACING ALERTS — banners for the mobile app
// ═══════════════════════════════════════════════════════════════════

/**
 * Get active health alerts relevant to a patient's location.
 * Called by the patient app on launch to show warning banners.
 *
 * @param {string} patientId  - Patient user ID (to look up their city)
 * @param {string} [city]     - Override city from GPS
 * @param {number} [lat]      - GPS latitude
 * @param {number} [lon]      - GPS longitude
 */
async function getPatientHealthAlerts(patientId, city, lat, lon) {
  try {
    // If city not provided, look it up from the patient's profile
    let patientCity = city;
    if (!patientCity && patientId) {
      const { data: patient } = await supabaseAdmin.from('patients')
        .select('city, address')
        .eq('user_id', patientId)
        .single();
      patientCity = patient?.city;
    }

    if (!patientCity) {
      // No location available — return all warning+ alerts
      const { data: alerts } = await supabaseAdmin.from('outbreak_alerts')
        .select('id, disease_or_symptom, severity, city, state, event_count, recommendations, detected_at')
        .in('status', ['active'])
        .in('severity', ['warning', 'critical'])
        .order('severity', { ascending: true })
        .limit(5);
      return formatPatientAlerts(alerts || []);
    }

    // Get alerts for this city
    const { data: alerts } = await supabaseAdmin.from('outbreak_alerts')
      .select('id, disease_or_symptom, severity, city, state, event_count, recommendations, detected_at')
      .in('status', ['active'])
      .ilike('city', `%${patientCity}%`)
      .order('severity', { ascending: true })
      .limit(10);

    return formatPatientAlerts(alerts || []);
  } catch (err) {
    console.error('[OutbreakService] getPatientHealthAlerts failed:', err.message);
    return [];
  }
}

/**
 * Format alerts into patient-friendly banner messages.
 */
function formatPatientAlerts(alerts) {
  return alerts.map(a => {
    const disease = (a.disease_or_symptom || '').replace(/_/g, ' ');
    const Disease = disease.charAt(0).toUpperCase() + disease.slice(1);

    const bannerMessages = {
      dengue:        `Use mosquito repellent and consult a doctor if you feel feverish.`,
      malaria:       `Use mosquito nets while sleeping and seek medical attention for fever with chills.`,
      covid:         `Wear masks in crowded areas. Get tested if you have cough, fever, or breathlessness.`,
      typhoid:       `Drink only boiled/purified water and avoid street food.`,
      cholera:       `Drink only treated water. Use ORS if you experience watery diarrhea.`,
      influenza:     `Wash hands frequently. Stay home if you have flu-like symptoms.`,
      gastroenteritis:`Practice food hygiene. Avoid outside food and drink clean water.`,
      respiratory:   `Avoid crowded spaces. Wear masks and consult a doctor if cough persists.`,
      chikungunya:   `Use mosquito repellent. Rest and hydrate if you have joint pain with fever.`,
    };

    const advice = bannerMessages[a.disease_or_symptom] || `Consult a doctor if you experience any related symptoms.`;

    return {
      id: a.id,
      type: 'outbreak_warning',
      severity: a.severity,
      disease: a.disease_or_symptom,
      city: a.city,
      state: a.state,
      cases: a.event_count,
      title: a.severity === 'critical'
        ? `⚠️ Health Alert: High ${Disease} cases in your area`
        : `⚠️ ${Disease} cases reported in ${a.city}`,
      message: advice,
      detectedAt: a.detected_at,
      // For the app to show the right color
      color: a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'orange' : 'blue',
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
//  5. PUSH NOTIFICATIONS — alert patients in affected areas
// ═══════════════════════════════════════════════════════════════════

/**
 * Send push notifications to patients in a city when a new
 * warning/critical outbreak alert is created or escalated.
 */
async function notifyPatientsInArea(disease, severity, city, count) {
  try {
    if (!city || (severity !== 'warning' && severity !== 'critical')) return;

    const { sendNotification } = require('./notificationService');

    const Disease = (disease || '').replace(/_/g, ' ');
    const DiseaseCap = Disease.charAt(0).toUpperCase() + Disease.slice(1);

    // Find patients who have registered in this city
    const { data: patients } = await supabaseAdmin.from('patients')
      .select('user_id')
      .ilike('city', `%${city}%`)
      .limit(500);

    if (!patients || patients.length === 0) return;

    const title = severity === 'critical'
      ? `🚨 Health Alert: ${DiseaseCap} outbreak in ${city}`
      : `⚠️ Health Advisory: ${DiseaseCap} cases rising in ${city}`;

    const body = severity === 'critical'
      ? `${count} cases of ${Disease} reported. Take precautions immediately and consult a doctor if symptomatic.`
      : `Elevated ${Disease} cases in your area. Stay alert and follow preventive measures.`;

    console.log(`[OutbreakService] Sending push notifications to ${patients.length} patients in ${city} for ${disease}`);

    // Send in batches to avoid overwhelming the notification service
    const batchSize = 50;
    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(p => sendNotification(p.user_id, {
          title,
          body,
          type: 'health_alert',
          data: { alertType: 'outbreak', disease, severity, city },
        }))
      );
    }
  } catch (err) {
    console.error('[OutbreakService] Push notification failed:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  6. CRON SCHEDULER
// ═══════════════════════════════════════════════════════════════════

let cronInterval = null;

async function runOutbreakAnalysisWithLock(intervalHours) {
  try {
    const { cacheSetIfNotExists } = require('../config/redis');
    const lockTtlSec = Math.max(60, Math.floor(intervalHours * 60 * 60) - 60);
    const lockAcquired = await cacheSetIfNotExists('cron:outbreak-analysis:lock', process.pid, lockTtlSec);
    if (!lockAcquired) return;
  } catch (err) {
    console.warn('[OutbreakService] Cron lock unavailable; running analysis without lock:', err.message);
  }

  await runOutbreakAnalysis();
}

function startOutbreakCron(intervalHours = 6) {
  if (cronInterval) clearInterval(cronInterval);

  const ms = intervalHours * 60 * 60 * 1000;
  console.log(`[OutbreakService] Cron started — running analysis every ${intervalHours}h`);

  // Run immediately on startup
  setTimeout(() => runOutbreakAnalysisWithLock(intervalHours), 5000);

  // Then on schedule
  cronInterval = setInterval(() => runOutbreakAnalysisWithLock(intervalHours), ms);
}

function stopOutbreakCron() {
  if (cronInterval) { clearInterval(cronInterval); cronInterval = null; }
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  // Data collection
  recordHealthEvent,
  extractHealthSignals,

  // Analysis
  runOutbreakAnalysis,

  // Admin API
  getOutbreakDashboard,
  getHeatmapData,
  getAlertDetails,
  updateAlertStatus,
  getHealthEventStats,

  // Patient-facing
  getPatientHealthAlerts,

  // Push notifications
  notifyPatientsInArea,

  // Scheduler
  startOutbreakCron,
  stopOutbreakCron,
};
