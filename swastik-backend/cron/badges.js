const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

const PAGE_SIZE = 1000;

const fetchAll = async (queryFn) => {
  const all = [];
  for (let i = 0; ; i += 1) {
    const { data, error } = await queryFn(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
};

const longestConsecutiveRun = (dates) => {
  const days = Array.from(new Set(dates.map((d) => String(d).slice(0, 10)))).sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    const current = new Date(`${day}T00:00:00.000Z`).getTime();
    if (prev !== null && current - prev === 86400000) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = current;
  }
  return longest;
};

const evaluateWellnessBadges = async () => {
  const started = Date.now();
  const { data: badges, error: badgeError } = await supabaseAdmin.from('wellness_badges').select('*');
  if (badgeError) throw badgeError;
  const badgeByCode = new Map((badges || []).map((badge) => [badge.code, badge]));

  const now = new Date();
  const yearAgoIso = new Date(now.getTime() - 365 * 86400000).toISOString();
  const stepsSinceDate = new Date(now.getTime() - 21 * 86400000).toISOString().slice(0, 10);

  const [workoutRows, wearableRows] = await Promise.all([
    fetchAll((from, to) => supabaseAdmin
      .from('workout_logs')
      .select('patient_id, completed_at')
      .gte('completed_at', yearAgoIso)
      .order('patient_id')
      .range(from, to)),
    fetchAll((from, to) => supabaseAdmin
      .from('wearable_daily_summaries')
      .select('patient_id, summary_date, steps')
      .gte('summary_date', stepsSinceDate)
      .order('patient_id')
      .range(from, to)),
  ]);

  const workoutsByPatient = new Map();
  (workoutRows || []).forEach((row) => {
    if (!row.patient_id) return;
    if (!workoutsByPatient.has(row.patient_id)) workoutsByPatient.set(row.patient_id, []);
    workoutsByPatient.get(row.patient_id).push(row);
  });

  const wearablesByPatient = new Map();
  (wearableRows || []).forEach((row) => {
    if (!row.patient_id) return;
    if (!wearablesByPatient.has(row.patient_id)) wearablesByPatient.set(row.patient_id, []);
    wearablesByPatient.get(row.patient_id).push(row);
  });

  const candidateIds = Array.from(new Set([
    ...workoutsByPatient.keys(),
    ...wearablesByPatient.keys(),
  ]));

  if (candidateIds.length === 0) {
    logger.info('[Badges] No candidate patients with activity found');
    return { evaluated: 0, awarded: 0, notified: 0, skipped: true, durationMs: Date.now() - started };
  }

  const earnedSet = new Set();
  const patientMap = new Map();
  for (let i = 0; i < candidateIds.length; i += 100) {
    const chunk = candidateIds.slice(i, i + 100);
    const [earnedResult, patientResult] = await Promise.all([
      supabaseAdmin.from('patient_wellness_badges').select('patient_id, badge_id').in('patient_id', chunk),
      supabaseAdmin.from('patients').select('id, user_id, name').in('id', chunk),
    ]);
    (earnedResult.data || []).forEach((row) => earnedSet.add(`${row.patient_id}:${row.badge_id}`));
    (patientResult.data || []).forEach((patient) => patientMap.set(patient.id, patient));
  }

  const newRows = [];
  const earners = [];

  for (const patientId of candidateIds) {
    const workouts = workoutsByPatient.get(patientId) || [];
    const wearables = wearablesByPatient.get(patientId) || [];

    const earnedCodes = [];
    if (workouts.length >= 1 && badgeByCode.has('first_workout')) earnedCodes.push('first_workout');
    if (workouts.length >= 10 && badgeByCode.has('ten_workouts')) earnedCodes.push('ten_workouts');
    if (longestConsecutiveRun(workouts.map((w) => w.completed_at)) >= 7 && badgeByCode.has('seven_day_streak')) {
      earnedCodes.push('seven_day_streak');
    }

    if (badgeByCode.has('ten_k_steps_7d')) {
      const stepsByDate = new Map(wearables.map((w) => [String(w.summary_date).slice(0, 10), Number(w.steps) || 0]));
      const overTenK = Array.from(stepsByDate.entries())
        .filter(([, steps]) => steps >= 10000)
        .map(([date]) => date);
      if (longestConsecutiveRun(overTenK) >= 7) earnedCodes.push('ten_k_steps_7d');
    }

    for (const code of earnedCodes) {
      const badge = badgeByCode.get(code);
      if (earnedSet.has(`${patientId}:${badge.id}`)) continue;
      newRows.push({ patient_id: patientId, badge_id: badge.id, metadata: { code } });
      earners.push({ patientId, badge });
    }
  }

  if (newRows.length > 0) {
    await supabaseAdmin.from('patient_wellness_badges').upsert(newRows, { onConflict: 'patient_id,badge_id', ignoreDuplicates: true });
  }

  let notified = 0;
  for (const earner of earners) {
    const patient = patientMap.get(earner.patientId);
    if (!patient?.user_id) continue;
    try {
      const { sendNotification } = require('../services/notificationService');
      await sendNotification(patient.user_id, {
        title: `Badge unlocked: ${earner.badge.name}`,
        message: `Congratulations, ${patient.name}! You earned the "${earner.badge.name}" wellness badge.`,
        type: 'wellness',
        data: { badgeId: earner.badge.id, badgeCode: earner.badge.code, category: 'badge' },
      });
      notified += 1;
    } catch (err) {
      logger.warn(`[Badges] Notification failed for patient ${earner.patientId}: ${err.message}`);
    }
  }

  logger.info(`[Badges] Evaluated ${candidateIds.length} patients; awarded ${newRows.length} new badges (${notified} notified)`);
  return { evaluated: candidateIds.length, awarded: newRows.length, notified, durationMs: Date.now() - started };
};

module.exports = evaluateWellnessBadges;
