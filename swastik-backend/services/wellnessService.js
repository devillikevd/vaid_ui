const crypto = require('crypto');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { calculateDistance, getBoundingBox } = require('../utils/geo');
const { sanitizeSearch } = require('../utils/sanitize');

const ACTIVE_APPROVED = { approval_status: 'approved', is_active: true };
const HIGH_RISK_TERMS = ['chest_pain', 'pregnancy', 'post_surgery', 'heart_disease', 'severe_pain', 'dizziness'];
const MODERATE_RISK_TERMS = ['injury', 'pain', 'diabetes', 'hypertension', 'asthma', 'pcos'];

const asArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const asNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const normalizeEmailValue = (value) => String(value || '').trim().toLowerCase();
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// ── Redis list-cache (generation-bumped) ──────────────────────────────
// Public/marketplace lists are cached by generation counter so a single
// INCR invalidates every page/filter variant. Best-effort: when Redis is
// unavailable the loader runs as before.
const listCacheVersionKey = (prefix) => `wellness:gen:${prefix}`;

const listCacheKey = (prefix, filters, page, limit, version) => {
  const serialized = JSON.stringify(filters || {});
  const raw = `wellness:list:${prefix}:v${version}:${page}:${limit}:${serialized}`;
  if (raw.length <= 240) return raw;
  return `wellness:list:${prefix}:v${version}:${page}:${limit}:${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}`;
};

const currentListVersion = async (prefix) => {
  const { cacheGet, cacheSetIfNotExists } = require('../config/redis');
  let version = await cacheGet(listCacheVersionKey(prefix));
  if (version === null) {
    await cacheSetIfNotExists(listCacheVersionKey(prefix), '1', 30 * 86400);
    version = await cacheGet(listCacheVersionKey(prefix)) || '1';
  }
  return version;
};

const cachedList = async (prefix, filters, page, limit, ttlSeconds, loader) => {
  const { cacheGet, cacheSet } = require('../config/redis');
  const version = await currentListVersion(prefix);
  const key = listCacheKey(prefix, filters, page, limit, version);
  const cached = await cacheGet(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // fall through to loader on corrupt payload
    }
  }
  const result = await loader();
  await cacheSet(key, JSON.stringify(result), ttlSeconds);
  return result;
};

const bumpListVersion = async (prefix) => {
  const { cacheIncr } = require('../config/redis');
  try {
    await cacheIncr(listCacheVersionKey(prefix));
  } catch (err) {
    // best-effort; short TTLs still bound staleness
  }
};

const buildTrainerInviteLinks = (token) => {
  const encoded = encodeURIComponent(token);
  return {
    invite_url: `${config.frontendWebUrl}/register/wellness?invite=${encoded}`,
    accept_url: `${config.frontendWebUrl}/wellness?invite=${encoded}`,
  };
};

const withTrainerInviteLinks = (invite) => {
  if (!invite) return invite;
  return {
    ...invite,
    ...buildTrainerInviteLinks(invite.invite_token),
  };
};

const resolvePatient = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .select('id, user_id, name, medical_conditions, chronic_conditions, current_medications, city, weight, height')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Patient profile not found');
  return data;
};

const resolveCoach = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('wellness_coaches')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Wellness coach profile not found');
  return data;
};

const resolveFitnessCenterOwner = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('fitness_centers')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Fitness center profile not found');
  return data;
};

const expireStaleTrainerInvites = async (filters = {}) => {
  let query = supabaseAdmin
    .from('fitness_center_trainer_invites')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (filters.centerId) query = query.eq('center_id', filters.centerId);
  if (filters.coachId) query = query.eq('coach_id', filters.coachId);
  if (filters.email) query = query.eq('invited_email', normalizeEmailValue(filters.email));

  const { error } = await query;
  if (error) throw error;
};

const buildRecommendation = (payload = {}, patient = {}) => {
  const risks = [
    ...asArray(payload.injuryFlags || payload.injury_flags),
    ...asArray(payload.painAreas || payload.pain_areas),
    ...asArray(payload.chronicConditions || payload.chronic_conditions),
    ...asArray(patient.medical_conditions),
    ...asArray(patient.chronic_conditions),
  ].map((item) => item.toLowerCase().replace(/\s+/g, '_'));

  const pregnancy = String(payload.pregnancyStatus || payload.pregnancy_status || '').toLowerCase();
  if (pregnancy && pregnancy !== 'none') risks.push('pregnancy');

  const hasHighRisk = risks.some((risk) => HIGH_RISK_TERMS.some((term) => risk.includes(term)));
  const hasModerateRisk = risks.some((risk) => MODERATE_RISK_TERMS.some((term) => risk.includes(term)));
  const goals = asArray(payload.goals || payload.goal || payload.primaryGoal || payload.primary_goal).map((goal) => goal.toLowerCase());
  const wantsNutrition = goals.some((goal) => ['weight_loss', 'muscle_gain', 'nutrition', 'diabetes'].some((term) => goal.includes(term)));

  if (hasHighRisk) {
    return {
      risk_level: 'high',
      recommended_path: 'doctor',
      recommendation_reason: 'Your answers include safety flags that should be reviewed by a qualified doctor or physiotherapist before intense training.',
    };
  }

  if (hasModerateRisk) {
    return {
      risk_level: 'moderate',
      recommended_path: 'physiotherapist',
      recommendation_reason: 'Your profile suggests a guided plan with injury-aware coaching before progressing intensity.',
    };
  }

  if (wantsNutrition) {
    return {
      risk_level: 'low',
      recommended_path: 'trainer_or_dietitian',
      recommendation_reason: 'Your goal can benefit from a workout plan plus nutrition guidance.',
    };
  }

  return {
    risk_level: 'low',
    recommended_path: 'self_guided',
    recommendation_reason: 'A self-guided beginner plan is a good starting point. You can add a coach anytime.',
  };
};

const getFitnessProfile = async (userId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('fitness_profiles')
    .select('*')
    .eq('patient_id', patient.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const upsertFitnessProfile = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const recommendation = buildRecommendation(payload, patient);
  const profile = {
    patient_id: patient.id,
    primary_goal: payload.primaryGoal || payload.primary_goal || asArray(payload.goals)[0] || null,
    goals: asArray(payload.goals || payload.goal),
    activity_level: payload.activityLevel || payload.activity_level || null,
    fitness_experience: payload.fitnessExperience || payload.fitness_experience || null,
    available_equipment: asArray(payload.availableEquipment || payload.available_equipment),
    available_minutes_per_day: asNumber(payload.availableMinutesPerDay || payload.available_minutes_per_day),
    preferred_workout_days: asArray(payload.preferredWorkoutDays || payload.preferred_workout_days),
    workout_location: payload.workoutLocation || payload.workout_location || 'home',
    food_preferences: asArray(payload.foodPreferences || payload.food_preferences),
    diet_type: payload.dietType || payload.diet_type || null,
    language_preferences: asArray(payload.languagePreferences || payload.language_preferences || payload.languages),
    injury_flags: asArray(payload.injuryFlags || payload.injury_flags),
    pain_areas: asArray(payload.painAreas || payload.pain_areas),
    pregnancy_status: payload.pregnancyStatus || payload.pregnancy_status || null,
    chronic_conditions: asArray(payload.chronicConditions || payload.chronic_conditions),
    medications: asArray(payload.medications),
    risk_answers: payload.riskAnswers || payload.risk_answers || {},
    data_sharing_preferences: payload.dataSharingPreferences || payload.data_sharing_preferences || {},
    completed_at: payload.completed === false ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...recommendation,
  };

  const { data, error } = await supabaseAdmin
    .from('fitness_profiles')
    .upsert(profile, { onConflict: 'patient_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

// ── Wellness assessment (Goals / Bio / Health Screening) ────────────
// Backed by the single-row-per-patient `fitness_profiles` table. Each
// step is a partial upsert so previously submitted sections survive.

const computeAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const assessmentStatusOf = (profile) => {
  if (!profile) return 'pending';
  const hasGoals = !!(profile.primary_goal || profile.activity_level || (profile.goals || []).length);
  const hasBio = !!(profile.fitness_experience
    || profile.height != null || profile.weight != null || profile.age != null || profile.gender
    || (profile.available_equipment || []).length);
  const hasHealth = !!(profile.has_medical_conditions || profile.has_injuries || profile.is_pregnant
    || profile.takes_medication || profile.doctor_clearance || profile.risk_level
    || (profile.chronic_conditions || []).length || (profile.injury_flags || []).length
    || (profile.medications || []).length);
  if (hasGoals && hasBio && hasHealth) return 'completed';
  if (hasGoals || hasBio || hasHealth) return 'in_progress';
  return 'pending';
};

const finalizeAssessment = async (patientId) => {
  const { data: profile, error } = await supabaseAdmin
    .from('fitness_profiles')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  const status = assessmentStatusOf(profile);
  const completedAt = status === 'completed' ? profile.completed_at || new Date().toISOString() : null;
  if (profile && profile.assessment_status === status && (profile.completed_at || null) === completedAt) {
    return profile;
  }
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('fitness_profiles')
    .update({
      assessment_status: status,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('patient_id', patientId)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return updated;
};

const mapAssessment = (patient, profile) => {
  if (!profile) return null;
  const goals = profile.goals || [];
  const primary = profile.primary_goal || goals[0] || null;
  const secondary = goals.filter((goal) => goal !== primary);
  const age = profile.age != null ? profile.age : computeAge(patient.date_of_birth);
  const conditions = profile.chronic_conditions || [];
  const injuries = profile.injury_flags || [];
  const medications = profile.medications || [];

  return {
    id: profile.id,
    patient_id: profile.patient_id,
    status: profile.assessment_status || 'pending',
    goals: primary || profile.activity_level || profile.target_weight != null
      ? {
          primary_goal: primary,
          secondary_goals: secondary,
          target_weight: profile.target_weight,
          activity_level: profile.activity_level,
          workout_frequency: profile.workout_frequency,
          preferred_workout_time: profile.preferred_workout_time,
          preferred_workout_types: profile.preferred_workout_types || [],
        }
      : null,
    bio: profile.fitness_experience || profile.height != null || profile.weight != null || profile.age != null || profile.gender
      ? {
          height: profile.height ?? patient.height ?? null,
          weight: profile.weight ?? patient.weight ?? null,
          age,
          gender: profile.gender ?? patient.gender ?? null,
          body_fat_percentage: profile.body_fat_percentage,
          fitness_level: profile.fitness_experience || null,
          available_equipment: profile.available_equipment || [],
          workout_location: profile.workout_location || null,
          dietary_preferences: profile.food_preferences || [],
          allergies: profile.allergies || patient.allergies || [],
        }
      : null,
    health_screening: profile.has_medical_conditions || profile.has_injuries || profile.is_pregnant
      || profile.takes_medication || profile.doctor_clearance || profile.risk_level
      || conditions.length || injuries.length || medications.length
      ? {
          has_medical_conditions: Boolean(profile.has_medical_conditions || conditions.length),
          medical_conditions: conditions,
          has_injuries: Boolean(profile.has_injuries || injuries.length),
          injuries,
          is_pregnant: Boolean(profile.is_pregnant || (profile.pregnancy_status && profile.pregnancy_status !== 'none')),
          takes_medication: Boolean(profile.takes_medication || medications.length),
          medications,
          doctor_clearance: profile.doctor_clearance,
          par_q_passed: profile.risk_answers?.par_q_passed ?? null,
          risk_level: profile.risk_level || null,
        }
      : null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    completed_at: profile.completed_at,
  };
};

const getWellnessAssessment = async (userId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('fitness_profiles')
    .select('*')
    .eq('patient_id', patient.id)
    .maybeSingle();
  if (error) throw error;
  return mapAssessment(patient, data);
};

const submitAssessmentGoals = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const primary = payload.primaryGoal || payload.primary_goal;
  if (!primary) throw new ApiError(400, 'primary_goal is required');
  const secondary = asArray(payload.secondaryGoals || payload.secondary_goals).filter((goal) => goal !== primary);

  const { error } = await supabaseAdmin
    .from('fitness_profiles')
    .upsert({
      patient_id: patient.id,
      primary_goal: primary,
      goals: [primary, ...secondary],
      activity_level: payload.activityLevel || payload.activity_level || null,
      target_weight: asNumber(payload.targetWeight ?? payload.target_weight),
      workout_frequency: asNumber(payload.workoutFrequency ?? payload.workout_frequency),
      preferred_workout_time: payload.preferredWorkoutTime || payload.preferred_workout_time || null,
      preferred_workout_types: asArray(payload.preferredWorkoutTypes || payload.preferred_workout_types),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' });
  if (error) throw error;

  const finalProfile = await finalizeAssessment(patient.id);
  return mapAssessment(patient, finalProfile);
};

const submitAssessmentBio = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const height = asNumber(payload.height);
  const weight = asNumber(payload.weight);
  if (height == null || weight == null) throw new ApiError(400, 'height and weight are required');

  const { error } = await supabaseAdmin
    .from('fitness_profiles')
    .upsert({
      patient_id: patient.id,
      height,
      weight,
      age: payload.age != null ? asNumber(payload.age) : null,
      gender: payload.gender || null,
      body_fat_percentage: asNumber(payload.bodyFatPercentage ?? payload.body_fat_percentage),
      fitness_experience: payload.fitnessLevel || payload.fitness_level || null,
      available_equipment: asArray(payload.availableEquipment || payload.available_equipment),
      workout_location: payload.workoutLocation || payload.workout_location || 'home',
      food_preferences: asArray(payload.dietaryPreferences || payload.dietary_preferences),
      allergies: asArray(payload.allergies),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' });
  if (error) throw error;

  const finalProfile = await finalizeAssessment(patient.id);
  return mapAssessment(patient, finalProfile);
};

const submitHealthScreening = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const conditions = asArray(payload.medicalConditions || payload.medical_conditions);
  const injuries = asArray(payload.injuries);
  const medications = asArray(payload.medications);
  const isPregnant = payload.isPregnant ?? payload.is_pregnant ?? false;
  const recommendation = buildRecommendation({
    ...payload,
    injuryFlags: injuries,
    chronicConditions: conditions,
    medications,
    pregnancyStatus: isPregnant ? 'pregnant' : 'none',
  }, patient);

  const { error } = await supabaseAdmin
    .from('fitness_profiles')
    .upsert({
      patient_id: patient.id,
      has_medical_conditions: payload.hasMedicalConditions ?? payload.has_medical_conditions ?? Boolean(conditions.length),
      has_injuries: payload.hasInjuries ?? payload.has_injuries ?? Boolean(injuries.length),
      is_pregnant: isPregnant,
      takes_medication: payload.takesMedication ?? payload.takes_medication ?? Boolean(medications.length),
      doctor_clearance: payload.doctorClearance ?? payload.doctor_clearance ?? false,
      chronic_conditions: conditions,
      injury_flags: injuries,
      medications,
      pregnancy_status: isPregnant ? 'pregnant' : 'none',
      risk_answers: {
        ...(payload.riskAnswers || payload.risk_answers || {}),
        par_q_passed: payload.parQPassed ?? payload.par_q_passed,
      },
      ...recommendation,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' });
  if (error) throw error;

  const finalProfile = await finalizeAssessment(patient.id);
  return mapAssessment(patient, finalProfile);
};

const countHead = (result) => (result && result.status === 'fulfilled' ? result.value?.count || 0 : 0);

const getHubSummary = async (userId) => {
  const patient = await resolvePatient(userId);
  const today = todayIsoDate();
  const [
    profileResult,
    wearableResult,
    activePlanResult,
    workoutCountResult,
    sessionResult,
    badgeResult,
    plansCountResult,
    exercisesCountResult,
    coachesCountResult,
    facilitiesCountResult,
    groupsCountResult,
    challengesCountResult,
    supplementsCountResult,
  ] = await Promise.allSettled([
    supabaseAdmin.from('fitness_profiles').select('*').eq('patient_id', patient.id).maybeSingle(),
    supabaseAdmin.from('wearable_daily_summaries').select('*').eq('patient_id', patient.id).order('summary_date', { ascending: false }).limit(7),
    supabaseAdmin.from('patient_workout_plans').select('*, plan:workout_plans(*)').eq('patient_id', patient.id).eq('status', 'active').limit(1).maybeSingle(),
    supabaseAdmin.from('workout_logs').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id).gte('completed_at', `${today}T00:00:00.000Z`),
    supabaseAdmin.from('wellness_sessions').select('*, coach:wellness_coaches(id, name, profile_image_url)').eq('patient_id', patient.id).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3),
    supabaseAdmin.from('patient_wellness_badges').select('*, badge:wellness_badges(*)').eq('patient_id', patient.id).order('earned_at', { ascending: false }).limit(5),
    supabaseAdmin.from('workout_plans').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('exercise_library').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('wellness_coaches').select('id', { count: 'exact', head: true }).match(ACTIVE_APPROVED),
    supabaseAdmin.from('fitness_centers').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
    supabaseAdmin.from('wellness_groups').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('moderation_status', 'active'),
    supabaseAdmin.from('wellness_challenges').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('trusted_supplement_products').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const wearables = wearableResult.status === 'fulfilled' ? wearableResult.value.data || [] : [];
  const latest = wearables[0] || null;

  let reels = [];
  try {
    const reelsResult = await listReels({}, 1, 6);
    reels = reelsResult.data || [];
  } catch {
    // Reels are optional for the hub; fail silently.
  }

  return {
    patient: { id: patient.id, name: patient.name, city: patient.city },
    counts: {
      workoutPlans: countHead(plansCountResult),
      exercises: countHead(exercisesCountResult),
      coaches: countHead(coachesCountResult),
      fitnessCenters: countHead(facilitiesCountResult),
      groups: countHead(groupsCountResult),
      challenges: countHead(challengesCountResult),
      supplements: countHead(supplementsCountResult),
    },
    fitnessProfile: profileResult.status === 'fulfilled' ? profileResult.value.data || null : null,
    wearableToday: latest?.summary_date === today ? latest : null,
    wearableTrend: wearables,
    todayStats: latest?.summary_date === today
      ? {
          steps: latest.steps || 0,
          activeCalories: latest.active_calories || 0,
          activeMinutes: latest.active_minutes || 0,
        }
      : null,
    activeWorkoutPlan: activePlanResult.status === 'fulfilled' ? activePlanResult.value.data || null : null,
    workoutsCompletedToday: workoutCountResult.status === 'fulfilled' ? workoutCountResult.value.count || 0 : 0,
    upcomingSessions: sessionResult.status === 'fulfilled' ? sessionResult.value.data || [] : [],
    badges: badgeResult.status === 'fulfilled' ? badgeResult.value.data || [] : [],
    reels,
  };
};

const getWearableSummaries = async (userId, days = 30) => {
  const patient = await resolvePatient(userId);
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(Number(days) || 30, 180)));
  const { data, error } = await supabaseAdmin
    .from('wearable_daily_summaries')
    .select('*')
    .eq('patient_id', patient.id)
    .gte('summary_date', since.toISOString().slice(0, 10))
    .order('summary_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

const upsertWearableSummary = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const summary = {
    patient_id: patient.id,
    summary_date: payload.summaryDate || payload.summary_date || todayIsoDate(),
    source: payload.source || 'health_connect',
    steps: Math.max(0, Math.min(asNumber(payload.steps, 0), 100000)),
    distance_meters: asNumber(payload.distanceMeters || payload.distance_meters, 0),
    active_calories: asNumber(payload.activeCalories || payload.active_calories, 0),
    total_calories: asNumber(payload.totalCalories || payload.total_calories, 0),
    active_minutes: asNumber(payload.activeMinutes || payload.active_minutes, 0),
    exercise_minutes: asNumber(payload.exerciseMinutes || payload.exercise_minutes, 0),
    workouts_count: asNumber(payload.workoutsCount || payload.workouts_count, 0),
    heart_rate_avg: asNumber(payload.heartRateAvg || payload.heart_rate_avg),
    heart_rate_min: asNumber(payload.heartRateMin || payload.heart_rate_min),
    heart_rate_max: asNumber(payload.heartRateMax || payload.heart_rate_max),
    sleep_minutes: asNumber(payload.sleepMinutes || payload.sleep_minutes),
    sleep_score: asNumber(payload.sleepScore || payload.sleep_score),
    body_weight_kg: asNumber(payload.bodyWeightKg || payload.body_weight_kg),
    body_fat_percent: asNumber(payload.bodyFatPercent || payload.body_fat_percent),
    metadata: payload.metadata || {},
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('wearable_daily_summaries')
    .upsert(summary, { onConflict: 'patient_id,summary_date,source' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const listWorkoutPlans = async (filters = {}, page = 1, limit = 20) => {
  return cachedList('plans', filters, page, limit, 600, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('workout_plans')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (filters.goal) query = query.eq('goal', filters.goal);
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.planType || filters.plan_type) query = query.eq('plan_type', filters.planType || filters.plan_type);
    if (filters.locationType || filters.location_type) query = query.eq('location_type', filters.locationType || filters.location_type);
    if (filters.maxMinutes) query = query.lte('minutes_per_session', Number(filters.maxMinutes));

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
  });
};

const getWorkoutPlan = async (idOrSlug) => {
  const column = /^[0-9a-f-]{30,}$/i.test(String(idOrSlug)) ? 'id' : 'slug';
  const { data, error } = await supabaseAdmin
    .from('workout_plans')
    .select('*, sessions:workout_sessions(*)')
    .eq(column, idOrSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Workout plan not found');
  data.sessions = (data.sessions || []).sort((a, b) => (a.week_index - b.week_index) || (a.day_index - b.day_index) || (a.sort_order - b.sort_order));
  return data;
};

const listExercises = async (filters = {}, page = 1, limit = 30) => {
  return cachedList('exercises', filters, page, limit, 600, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('exercise_library')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    const q = sanitizeSearch(filters.q || filters.search || '');
    if (q) query = query.or(`name.ilike.%${q}%,primary_muscle_group.ilike.%${q}%,workout_type.ilike.%${q}%,target_muscle.ilike.%${q}%,body_part.ilike.%${q}%`);
    if (filters.type || filters.workoutType || filters.workout_type) query = query.eq('workout_type', filters.type || filters.workoutType || filters.workout_type);
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.muscle || filters.muscleGroup || filters.primary_muscle_group) query = query.eq('primary_muscle_group', filters.muscle || filters.muscleGroup || filters.primary_muscle_group);
    if (filters.body_part || filters.bodyPart) query = query.eq('body_part', filters.body_part || filters.bodyPart);
    if (filters.target || filters.target_muscle || filters.targetMuscle) query = query.eq('target_muscle', filters.target || filters.target_muscle || filters.targetMuscle);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.equipment) query = query.contains('equipment', [filters.equipment]);
    if (filters.hasAnimation === 'true' || filters.hasAnimation === true) query = query.not('animation_url', 'is', null);

    const { data, count, error } = await query.order('name').range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
  });
};

const getExercise = async (idOrSlug) => {
  const column = /^[0-9a-f-]{30,}$/i.test(String(idOrSlug)) ? 'id' : 'slug';
  const { data, error } = await supabaseAdmin
    .from('exercise_library')
    .select('*')
    .eq(column, idOrSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Exercise not found');
  return data;
};

const getExerciseStats = async () => {
  const { data, error } = await supabaseAdmin
    .from('exercise_library')
    .select('category, body_part, target_muscle, workout_type, level, equipment, animation_url, thumbnail_url')
    .eq('is_active', true);
  if (error) throw error;

  const exercises = data || [];
  const countBy = (arr, key) => {
    const counts = {};
    for (const item of arr) {
      const val = item[key] || 'unknown';
      counts[val] = (counts[val] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  };

  const equipmentCounts = {};
  for (const item of exercises) {
    for (const eq of (item.equipment || [])) {
      equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
    }
  }

  return {
    total: exercises.length,
    withAnimation: exercises.filter((e) => e.animation_url).length,
    withThumbnail: exercises.filter((e) => e.thumbnail_url).length,
    byCategory: countBy(exercises, 'category'),
    byBodyPart: countBy(exercises, 'body_part'),
    byTarget: countBy(exercises, 'target_muscle'),
    byLevel: countBy(exercises, 'level'),
    byWorkoutType: countBy(exercises, 'workout_type'),
    byEquipment: Object.entries(equipmentCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  };
};

const assignWorkoutPlan = async (userId, planId, coachId = null) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('patient_workout_plans')
    .insert({ patient_id: patient.id, plan_id: planId, coach_id: coachId, status: 'active' })
    .select('*, plan:workout_plans(*)')
    .single();
  if (error && error.code === '23505') throw new ApiError(409, 'This workout plan is already active for you');
  if (error) throw error;
  return data;
};

const logWorkout = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('workout_logs')
    .insert({
      patient_id: patient.id,
      plan_id: payload.planId || payload.plan_id || null,
      session_id: payload.sessionId || payload.session_id || null,
      coach_id: payload.coachId || payload.coach_id || null,
      duration_minutes: asNumber(payload.durationMinutes || payload.duration_minutes),
      calories_burned: asNumber(payload.caloriesBurned || payload.calories_burned),
      perceived_intensity: payload.perceivedIntensity || payload.perceived_intensity || null,
      feedback: payload.feedback || null,
      pain_reported: Boolean(payload.painReported || payload.pain_reported),
      exercises: payload.exercises || [],
      metadata: payload.metadata || {},
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const getWorkoutCalendar = async (userId, filters = {}) => {
  const patient = await resolvePatient(userId);
  const from = filters.from || filters.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = filters.to || filters.end || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();

  const [plansResult, logsResult, sessionsResult] = await Promise.allSettled([
    supabaseAdmin
      .from('patient_workout_plans')
      .select('*, plan:workout_plans(*, sessions:workout_sessions(*))')
      .eq('patient_id', patient.id)
      .in('status', ['active', 'paused'])
      .order('started_at', { ascending: false }),
    supabaseAdmin
      .from('workout_logs')
      .select('*, plan:workout_plans(id, title), session:workout_sessions(id, title, week_index, day_index)')
      .eq('patient_id', patient.id)
      .gte('completed_at', from)
      .lte('completed_at', to)
      .order('completed_at', { ascending: false }),
    supabaseAdmin
      .from('wellness_sessions')
      .select('*, coach:wellness_coaches(id, name, profile_image_url), center:fitness_centers(id, name)')
      .eq('patient_id', patient.id)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .order('scheduled_at'),
  ]);

  return {
    range: { from, to },
    activePlans: plansResult.status === 'fulfilled' ? plansResult.value.data || [] : [],
    workoutLogs: logsResult.status === 'fulfilled' ? logsResult.value.data || [] : [],
    coachingSessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value.data || [] : [],
  };
};

const getWorkoutProgress = async (userId, filters = {}) => {
  const patient = await resolvePatient(userId);
  const days = Math.max(1, Math.min(Number(filters.days) || 30, 365));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [logsResult, badgesResult, activePlanResult] = await Promise.allSettled([
    supabaseAdmin
      .from('workout_logs')
      .select('*, plan:workout_plans(id, title), coach:wellness_coaches(id, name)')
      .eq('patient_id', patient.id)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })
      .limit(500),
    supabaseAdmin
      .from('patient_wellness_badges')
      .select('*, badge:wellness_badges(*)')
      .eq('patient_id', patient.id)
      .order('earned_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('patient_workout_plans')
      .select('*, plan:workout_plans(*)')
      .eq('patient_id', patient.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);

  const logs = logsResult.status === 'fulfilled' ? logsResult.value.data || [] : [];
  const totalMinutes = logs.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const totalCalories = logs.reduce((sum, item) => sum + Number(item.calories_burned || 0), 0);
  const painReports = logs.filter((item) => item.pain_reported).length;
  const completedDays = new Set(logs.map((item) => String(item.completed_at || '').slice(0, 10)).filter(Boolean)).size;

  return {
    periodDays: days,
    metrics: {
      workoutsCompleted: logs.length,
      completedDays,
      totalMinutes,
      totalCalories,
      painReports,
    },
    activePlan: activePlanResult.status === 'fulfilled' ? activePlanResult.value.data || null : null,
    recentLogs: logs.slice(0, 20),
    badges: badgesResult.status === 'fulfilled' ? badgesResult.value.data || [] : [],
  };
};

const listMyBadges = async (userId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('patient_wellness_badges')
    .select('*, badge:wellness_badges(*)')
    .eq('patient_id', patient.id)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const listCoaches = async (filters = {}, page = 1, limit = 20) => {
  return cachedList('coaches', filters, page, limit, 300, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('wellness_coaches')
      .select('*', { count: 'exact' })
      .match(ACTIVE_APPROVED);

    const q = sanitizeSearch(filters.q || filters.search || '');
    if (q) query = query.or(`name.ilike.%${q}%,headline.ilike.%${q}%,bio.ilike.%${q}%`);
    if (filters.city) query = query.ilike('city', filters.city);
    if (filters.maxFee) query = query.lte('session_fee', Number(filters.maxFee));

    const { data, count, error } = await query.order('rating', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    let coaches = data || [];
    const tagFilter = asArray(filters.tag || filters.tags || filters.specialty);
    if (tagFilter.length > 0) {
      const lowered = tagFilter.map((tag) => tag.toLowerCase());
      coaches = coaches.filter((coach) => [
        ...(coach.coach_types || []),
        ...(coach.specialties || []),
        ...(coach.expertise_tags || []),
      ].some((tag) => lowered.includes(String(tag).toLowerCase())));
    }

    return { data: coaches, pagination: { page, limit, total: count || coaches.length, totalPages: Math.ceil((count || coaches.length) / limit) } };
  });
};

const getCoach = async (coachId) => {
  const { data, error } = await supabaseAdmin
    .from('wellness_coaches')
    .select('*')
    .eq('id', coachId)
    .match(ACTIVE_APPROVED)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Wellness coach not found');
  return data;
};

const getMyCoachProfile = async (userId) => resolveCoach(userId);

const updateMyCoachProfile = async (userId, payload = {}) => {
  const coach = await resolveCoach(userId);
  const updates = {
    headline: payload.headline,
    sub_role: payload.subRole || payload.sub_role,
    coach_types: payload.coachTypes || payload.coach_types,
    specialties: payload.specialties,
    expertise_tags: payload.expertiseTags || payload.expertise_tags,
    qualifications: payload.qualifications,
    certifications: payload.certifications,
    session_modes: payload.sessionModes || payload.session_modes,
    languages: payload.languages,
    bio: payload.bio,
    session_fee: payload.sessionFee ?? payload.session_fee,
    video_session_fee: payload.videoSessionFee ?? payload.video_session_fee,
    monthly_plan_fee: payload.monthlyPlanFee ?? payload.monthly_plan_fee,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    latitude: payload.latitude,
    longitude: payload.longitude,
    available_days: payload.availableDays || payload.available_days,
    available_hours: payload.availableHours || payload.available_hours,
    is_available: payload.isAvailable ?? payload.is_available,
    updated_at: new Date().toISOString(),
  };

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) delete updates[key];
  });

  ['coach_types', 'specialties', 'expertise_tags', 'qualifications', 'certifications', 'session_modes', 'languages', 'available_days'].forEach((key) => {
    if (updates[key] !== undefined) updates[key] = asArray(updates[key]);
  });

  if (updates.sub_role !== undefined) {
    const allowedSubRoles = ['fitness_trainer', 'yoga_coach', 'nutritionist'];
    if (!allowedSubRoles.includes(updates.sub_role)) {
      throw new ApiError(400, 'Invalid wellness coach sub-role. Use fitness_trainer, yoga_coach, or nutritionist.');
    }
  }

  ['session_fee', 'video_session_fee', 'monthly_plan_fee', 'latitude', 'longitude'].forEach((key) => {
    if (updates[key] !== undefined) updates[key] = asNumber(updates[key], null);
  });

  const { data, error } = await supabaseAdmin
    .from('wellness_coaches')
    .update(updates)
    .eq('id', coach.id)
    .select('*')
    .single();
  if (error) throw error;
  await bumpListVersion('coaches');
  return data;
};

const bookCoachSession = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const coach = await getCoach(payload.coachId || payload.coach_id);
  const sessionType = payload.sessionType || payload.session_type || 'video';
  if (!asArray(coach.session_modes).includes(sessionType) && !['audio', 'gym_personal_training'].includes(sessionType)) {
    throw new ApiError(400, 'Coach does not offer this session mode');
  }

  const scheduledAt = payload.scheduledAt || payload.scheduled_at;
  if (!scheduledAt) throw new ApiError(400, 'Scheduled time is required');

  const durationMinutes = asNumber(payload.durationMinutes || payload.duration_minutes, 45);

  // ── Double-booking prevention ────────────────────────────────────
  const requestedStart = new Date(scheduledAt);
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60 * 1000);

  const { data: conflicts } = await supabaseAdmin
    .from('wellness_sessions')
    .select('id, scheduled_at, duration_minutes')
    .eq('coach_id', coach.id)
    .not('status', 'in', '("cancelled","rejected","no_show")')
    .gte('scheduled_at', new Date(requestedStart.getTime() - 120 * 60 * 1000).toISOString())
    .lte('scheduled_at', requestedEnd.toISOString());

  if (conflicts && conflicts.length > 0) {
    const hasOverlap = conflicts.some((existing) => {
      const existStart = new Date(existing.scheduled_at);
      const existEnd = new Date(existStart.getTime() + (existing.duration_minutes || 45) * 60 * 1000);
      return requestedStart < existEnd && requestedEnd > existStart;
    });
    if (hasOverlap) {
      throw new ApiError(409, 'This time slot is already booked. Please choose a different time.');
    }
  }

  // ── Create session ───────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('wellness_sessions')
    .insert({
      session_number: `WEL-${Date.now().toString(36).toUpperCase()}`,
      patient_id: patient.id,
      coach_id: coach.id,
      center_id: payload.centerId || payload.center_id || null,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      session_type: sessionType,
      fee: asNumber(payload.fee, coach.session_fee || 0),
      patient_notes: payload.notes || payload.patientNotes || null,
      safety_flags: asArray(payload.safetyFlags || payload.safety_flags),
      room_id: crypto.randomUUID(),
    })
    .select('*, coach:wellness_coaches(id, name, profile_image_url, session_fee)')
    .single();
  if (error) throw error;

  // ── Push notification to coach ───────────────────────────────────
  try {
    const { sendNotification } = require('./notificationService');
    const formattedTime = requestedStart.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    });
    await sendNotification(coach.user_id, {
      title: 'New Session Booked',
      body: `${patient.name || 'A patient'} booked a ${sessionType} session on ${formattedTime}`,
      data: { type: 'wellness_session_booked', sessionId: data.id },
    });
  } catch (notifErr) {
    // Non-blocking — log but don't fail the booking
    console.warn('[wellness] Coach notification failed:', notifErr.message);
  }

  return data;
};

const listMySessions = async (userId, role, status) => {
  let query = supabaseAdmin.from('wellness_sessions').select('*, patient:patients(id, name), coach:wellness_coaches(id, name, profile_image_url)');
  if (role === 'wellness_coach') {
    const coach = await resolveCoach(userId);
    query = query.eq('coach_id', coach.id);
  } else {
    const patient = await resolvePatient(userId);
    query = query.eq('patient_id', patient.id);
  }
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('scheduled_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
};

const listFacilities = async (filters = {}, page = 1, limit = 20) => {
  return cachedList('facilities', filters, page, limit, 60, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('fitness_centers')
      .select('*', { count: 'exact' })
      .eq('approval_status', 'approved')
      .eq('is_active', true);

    const lat = asNumber(filters.latitude);
    const lng = asNumber(filters.longitude);
    const radius = Math.min(asNumber(filters.radius, 25), 100);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const bounds = getBoundingBox({ latitude: lat, longitude: lng }, radius);
      query = query.gte('latitude', bounds.minLat).lte('latitude', bounds.maxLat).gte('longitude', bounds.minLng).lte('longitude', bounds.maxLng);
    }
    if (filters.city) query = query.ilike('city', filters.city);
    if (filters.type || filters.centerType) query = query.eq('center_type', filters.type || filters.centerType);
    const searchTerm = sanitizeSearch(filters.q || filters.search || filters.query || '');
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,center_type.ilike.%${searchTerm}%`);
    }
    if (filters.womenOnly === 'true' || filters.womenOnly === true) query = query.eq('is_women_only', true);
    if (filters.beginnerFriendly === 'true' || filters.beginnerFriendly === true) query = query.eq('is_beginner_friendly', true);

    const { data, count, error } = await query.order('rating', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    let centers = data || [];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      centers = centers
        .map((center) => ({
          ...center,
          distance: center.latitude && center.longitude
            ? calculateDistance({ latitude: lat, longitude: lng }, { latitude: center.latitude, longitude: center.longitude })
            : null,
        }))
        .filter((center) => center.distance === null || center.distance <= radius)
        .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    }

    return { data: centers, pagination: { page, limit, total: count || centers.length, totalPages: Math.ceil((count || centers.length) / limit) } };
  });
};

const getFacility = async (centerId) => {
  const { data, error } = await supabaseAdmin
    .from('fitness_centers')
    .select('*, classes:fitness_classes(*), trainers:fitness_center_trainers(*, coach:wellness_coaches(id, name, profile_image_url, specialties, coach_types, rating)), reels:fitness_center_reels(*)')
    .eq('id', centerId)
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Fitness center not found');
  data.classes = (data.classes || []).filter((item) => item.status === 'scheduled');
  return data;
};

const addFitnessReel = async (userId, data = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  const { video_url, thumbnail_url, title } = data;
  const { data: reel, error } = await supabaseAdmin
    .from('fitness_center_reels')
    .insert({ fitness_center_id: center.id, video_url, thumbnail_url, title })
    .select('*')
    .single();
  if (error) throw error;
  return reel;
};

const deleteFitnessReel = async (userId, reelId) => {
  const center = await resolveFitnessCenterOwner(userId);
  const { error } = await supabaseAdmin
    .from('fitness_center_reels')
    .delete()
    .eq('id', reelId)
    .eq('fitness_center_id', center.id);
  if (error) throw error;
  return true;
};

const bookFacility = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const centerId = payload.centerId || payload.center_id;
  if (!centerId) throw new ApiError(400, 'centerId is required');

  const bookingType = payload.bookingType || payload.booking_type || 'day_pass';
  const { data, error } = await supabaseAdmin
    .from('fitness_bookings')
    .insert({
      patient_id: patient.id,
      center_id: centerId,
      class_id: payload.classId || payload.class_id || null,
      coach_id: payload.coachId || payload.coach_id || null,
      booking_type: bookingType,
      amount: asNumber(payload.amount, 0),
      notes: payload.notes || null,
    })
    .select('*, center:fitness_centers(id, name, address, city), class:fitness_classes(id, title, starts_at)')
    .single();
  if (error) throw error;
  await bumpListVersion('facilities');
  return data;
};

const checkInFacility = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const centerId = payload.centerId || payload.center_id;
  if (!centerId) throw new ApiError(400, 'centerId is required');

  const qrToken = payload.qrToken || payload.qr_token || crypto.randomUUID();
  const { data, error } = await supabaseAdmin
    .from('fitness_checkins')
    .insert({
      patient_id: patient.id,
      center_id: centerId,
      booking_id: payload.bookingId || payload.booking_id || null,
      qr_token: qrToken,
      metadata: payload.metadata || {},
    })
    .select('*')
    .single();
  if (error) throw error;
  await bumpListVersion('facilities');
  return data;
};

// Patient-facing gym class schedule & booking
const listFacilityClasses = async (centerId, filters = {}) => {
  let query = supabaseAdmin
    .from('fitness_classes')
    .select('*, coach:wellness_coaches(id, name, profile_image_url, coach_types, specialties)')
    .eq('center_id', centerId)
    .eq('status', 'scheduled');
  if (filters.from) query = query.gte('starts_at', filters.from);
  if (filters.to) query = query.lte('starts_at', filters.to);
  const { data, error } = await query.order('starts_at', { ascending: true }).limit(200);
  if (error) throw error;
  return data || [];
};

const bookFacilityClass = async (userId, centerId, classId) => {
  const patient = await resolvePatient(userId);
  const { data: gymClass, error } = await supabaseAdmin
    .from('fitness_classes')
    .select('*')
    .eq('id', classId)
    .eq('center_id', centerId)
    .maybeSingle();
  if (error) throw error;
  if (!gymClass) throw new ApiError(404, 'Class not found');
  if (gymClass.status !== 'scheduled') throw new ApiError(400, 'Class is not open for booking');

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('fitness_bookings')
    .select('*')
    .eq('patient_id', patient.id)
    .eq('class_id', classId)
    .in('status', ['booked', 'waitlisted'])
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new ApiError(409, 'You have already booked this class');

  const bookedCount = gymClass.booked_count || 0;
  const capacity = gymClass.capacity || 0;
  const willWaitlist = bookedCount >= capacity;
  if (willWaitlist && !gymClass.waitlist_enabled) throw new ApiError(400, 'Class is full');

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('fitness_bookings')
    .insert({
      patient_id: patient.id,
      center_id: centerId,
      class_id: classId,
      coach_id: gymClass.coach_id,
      booking_type: 'class',
      status: willWaitlist ? 'waitlisted' : 'booked',
      amount: gymClass.price || 0,
    })
    .select('*, class:fitness_classes(id, title, starts_at, capacity), center:fitness_centers(id, name)')
    .single();
  if (bookingError) throw bookingError;

  if (!willWaitlist) {
    const { error: incError } = await supabaseAdmin
      .from('fitness_classes')
      .update({ booked_count: bookedCount + 1, updated_at: new Date().toISOString() })
      .eq('id', classId);
    if (incError) throw incError;
  }

  await bumpListVersion('facilities');
  return booking;
};

const cancelFacilityClassBooking = async (userId, centerId, classId) => {
  const patient = await resolvePatient(userId);
  const { data: booking, error } = await supabaseAdmin
    .from('fitness_bookings')
    .select('*')
    .eq('patient_id', patient.id)
    .eq('center_id', centerId)
    .eq('class_id', classId)
    .in('status', ['booked', 'waitlisted'])
    .maybeSingle();
  if (error) throw error;
  if (!booking) throw new ApiError(404, 'Active booking not found for this class');

  const wasBooked = booking.status === 'booked';
  const { error: updateError } = await supabaseAdmin
    .from('fitness_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', booking.id);
  if (updateError) throw updateError;

  if (wasBooked) {
    const { data: gymClass } = await supabaseAdmin
      .from('fitness_classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();
    if (gymClass) {
      const newCount = Math.max(0, (gymClass.booked_count || 0) - 1);
      const { data: nextWaitlisted } = await supabaseAdmin
        .from('fitness_bookings')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      await supabaseAdmin
        .from('fitness_classes')
        .update({ booked_count: nextWaitlisted ? newCount + 1 : newCount, updated_at: new Date().toISOString() })
        .eq('id', classId);
      if (nextWaitlisted) {
        await supabaseAdmin
          .from('fitness_bookings')
          .update({ status: 'booked', updated_at: new Date().toISOString() })
          .eq('id', nextWaitlisted.id);
      }
    }
  }

  await bumpListVersion('facilities');
  return { id: booking.id, status: 'cancelled' };
};

const getOwnedFitnessCenterDashboard = async (userId) => {
  const center = await resolveFitnessCenterOwner(userId);
  await expireStaleTrainerInvites({ centerId: center.id });

  const [
    trainersResult,
    invitesResult,
    classesResult,
    bookingsResult,
    checkinsResult,
    reelsResult,
  ] = await Promise.allSettled([
    supabaseAdmin
      .from('fitness_center_trainers')
      .select('*, coach:wellness_coaches(id, name, profile_image_url, coach_types, specialties, rating, total_reviews, approval_status)')
      .eq('center_id', center.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false }),
    supabaseAdmin
      .from('fitness_center_trainer_invites')
      .select('*, coach:wellness_coaches(id, name, email, profile_image_url, coach_types, specialties), invitedBy:users!fitness_center_trainer_invites_invited_by_fkey(id, name, email)')
      .eq('center_id', center.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('fitness_classes')
      .select('*')
      .eq('center_id', center.id)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(10),
    supabaseAdmin
      .from('fitness_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', center.id),
    supabaseAdmin
      .from('fitness_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', center.id)
      .gte('checked_in_at', `${todayIsoDate()}T00:00:00.000Z`),
    supabaseAdmin
      .from('fitness_center_reels')
      .select('*')
      .eq('fitness_center_id', center.id)
      .order('created_at', { ascending: false }),
  ]);

  const invites = invitesResult.status === 'fulfilled'
    ? (invitesResult.value.data || []).map(withTrainerInviteLinks)
    : [];

  return {
    center,
    reels: reelsResult.status === 'fulfilled' ? reelsResult.value.data || [] : [],
    trainers: trainersResult.status === 'fulfilled' ? trainersResult.value.data || [] : [],
    trainerInvites: invites,
    upcomingClasses: classesResult.status === 'fulfilled' ? classesResult.value.data || [] : [],
    metrics: {
      trainers: trainersResult.status === 'fulfilled' ? (trainersResult.value.data || []).length : 0,
      pendingInvites: invites.filter((invite) => invite.status === 'pending').length,
      totalBookings: bookingsResult.status === 'fulfilled' ? bookingsResult.value.count || 0 : 0,
      checkinsToday: checkinsResult.status === 'fulfilled' ? checkinsResult.value.count || 0 : 0,
    },
  };
};

const listOwnerTrainers = async (userId) => {
  const center = await resolveFitnessCenterOwner(userId);
  const { data, error } = await supabaseAdmin
    .from('fitness_center_trainers')
    .select('*, coach:wellness_coaches(id, name, email, profile_image_url, coach_types, specialties, rating, total_reviews, approval_status)')
    .eq('center_id', center.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const listOwnerTrainerInvites = async (userId, status) => {
  const center = await resolveFitnessCenterOwner(userId);
  await expireStaleTrainerInvites({ centerId: center.id });

  let query = supabaseAdmin
    .from('fitness_center_trainer_invites')
    .select('*, coach:wellness_coaches(id, name, email, profile_image_url, coach_types, specialties), invitedBy:users!fitness_center_trainer_invites_invited_by_fkey(id, name, email)')
    .eq('center_id', center.id);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(withTrainerInviteLinks);
};

const createTrainerInvite = async (userId, payload = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  const coachId = payload.coachId || payload.coach_id || null;
  const invitedEmail = normalizeEmailValue(payload.email || payload.invitedEmail || payload.invited_email);
  const invitedPhone = payload.phone || payload.invitedPhone || payload.invited_phone || null;
  const invitedName = payload.name || payload.invitedName || payload.invited_name || null;

  if (!coachId && !invitedEmail) {
    throw new ApiError(400, 'coachId or invited email is required');
  }

  let coach = null;
  if (coachId) {
    const { data, error } = await supabaseAdmin
      .from('wellness_coaches')
      .select('id, user_id, name, email, approval_status')
      .eq('id', coachId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, 'Wellness coach not found');
    coach = data;
  } else if (invitedEmail) {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', invitedEmail)
      .maybeSingle();
    if (userError) throw userError;
    if (user?.id) {
      const { data, error } = await supabaseAdmin
        .from('wellness_coaches')
        .select('id, user_id, name, email, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      coach = data || null;
    }
  }

  const resolvedCoachId = coach?.id || null;
  if (resolvedCoachId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('fitness_center_trainers')
      .select('id, is_active')
      .eq('center_id', center.id)
      .eq('coach_id', resolvedCoachId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.is_active !== false) {
      throw new ApiError(409, 'This trainer is already attached to your center');
    }
  }

  await expireStaleTrainerInvites({ centerId: center.id });

  let duplicateQuery = supabaseAdmin
    .from('fitness_center_trainer_invites')
    .select('id')
    .eq('center_id', center.id)
    .eq('status', 'pending')
    .limit(1);
  duplicateQuery = resolvedCoachId
    ? duplicateQuery.eq('coach_id', resolvedCoachId)
    : duplicateQuery.eq('invited_email', invitedEmail);

  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) throw new ApiError(409, 'A trainer invite is already pending');

  const inviteToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('fitness_center_trainer_invites')
    .insert({
      center_id: center.id,
      coach_id: resolvedCoachId,
      invited_by: userId,
      invite_token: inviteToken,
      invited_email: invitedEmail || coach?.email || null,
      invited_phone: invitedPhone,
      invited_name: invitedName || coach?.name || null,
      role: payload.role || 'trainer',
      coach_types: asArray(payload.coachTypes || payload.coach_types),
      specialties: asArray(payload.specialties),
      schedule: payload.schedule || {},
      permissions: payload.permissions || {},
      status: 'pending',
      expires_at: expiresAt,
      metadata: payload.metadata || {},
    })
    .select('*, center:fitness_centers(id, name, city, address), coach:wellness_coaches(id, name, email, coach_types, specialties)')
    .single();
  if (error) throw error;
  return withTrainerInviteLinks(data);
};

const cancelTrainerInvite = async (userId, inviteId) => {
  const center = await resolveFitnessCenterOwner(userId);
  const { data, error } = await supabaseAdmin
    .from('fitness_center_trainer_invites')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('center_id', center.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Pending trainer invite not found');
  return withTrainerInviteLinks(data);
};

const getTrainerInviteByToken = async (token) => {
  const { data, error } = await supabaseAdmin
    .from('fitness_center_trainer_invites')
    .select('id, center_id, coach_id, invited_email, invited_name, role, coach_types, specialties, status, expires_at, created_at, center:fitness_centers(id, name, city, address, center_type), coach:wellness_coaches(id, name, profile_image_url)')
    .eq('invite_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Trainer invite not found');

  if (data.status === 'pending' && data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    const { data: expired, error: expireError } = await supabaseAdmin
      .from('fitness_center_trainer_invites')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', data.id)
      .select('id, center_id, coach_id, invited_email, invited_name, role, coach_types, specialties, status, expires_at, created_at, center:fitness_centers(id, name, city, address, center_type), coach:wellness_coaches(id, name, profile_image_url)')
      .single();
    if (expireError) throw expireError;
    return expired;
  }

  return data;
};

const listCoachCenterInvites = async (userId, status) => {
  const coach = await resolveCoach(userId);
  await expireStaleTrainerInvites({ coachId: coach.id });
  if (coach.email) await expireStaleTrainerInvites({ email: coach.email });

  const orParts = [`coach_id.eq.${coach.id}`];
  if (coach.email) orParts.push(`invited_email.eq.${normalizeEmailValue(coach.email)}`);

  let query = supabaseAdmin
    .from('fitness_center_trainer_invites')
    .select('*, center:fitness_centers(id, name, city, address, center_type), invitedBy:users!fitness_center_trainer_invites_invited_by_fkey(id, name, email)')
    .or(orParts.join(','));
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(withTrainerInviteLinks);
};

const respondTrainerInvite = async (userId, inviteIdOrToken, decision = 'accept') => {
  const action = String(decision || '').toLowerCase();
  if (!['accept', 'reject'].includes(action)) {
    throw new ApiError(400, 'Decision must be accept or reject');
  }

  const coach = await resolveCoach(userId);
  const idColumn = isUuid(inviteIdOrToken) ? 'id' : 'invite_token';
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('fitness_center_trainer_invites')
    .select('*')
    .eq(idColumn, inviteIdOrToken)
    .maybeSingle();
  if (inviteError) throw inviteError;
  if (!invite) throw new ApiError(404, 'Trainer invite not found');

  const invitedEmail = normalizeEmailValue(invite.invited_email);
  const coachEmail = normalizeEmailValue(coach.email);
  if (invite.coach_id && invite.coach_id !== coach.id) {
    throw new ApiError(403, 'This invite belongs to another trainer');
  }
  if (!invite.coach_id && invitedEmail && coachEmail && invitedEmail !== coachEmail) {
    throw new ApiError(403, 'This invite was sent to another email address');
  }
  if (invite.status !== 'pending') {
    throw new ApiError(409, `Invite already ${invite.status}`);
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from('fitness_center_trainer_invites')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', invite.id);
    throw new ApiError(400, 'Trainer invite has expired');
  }

  const now = new Date().toISOString();
  if (action === 'reject') {
    const { data, error } = await supabaseAdmin
      .from('fitness_center_trainer_invites')
      .update({ status: 'rejected', responded_at: now, accepted_by_coach_id: coach.id })
      .eq('id', invite.id)
      .select('*')
      .single();
    if (error) throw error;
    return { invite: withTrainerInviteLinks(data), association: null };
  }

  const { data: association, error: associationError } = await supabaseAdmin
    .from('fitness_center_trainers')
    .upsert({
      center_id: invite.center_id,
      coach_id: coach.id,
      role: invite.role || 'trainer',
      schedule: invite.schedule || {},
      is_active: true,
      joined_at: now,
    }, { onConflict: 'center_id,coach_id' })
    .select('*, center:fitness_centers(id, name, city, address), coach:wellness_coaches(id, name, profile_image_url, coach_types, specialties)')
    .single();
  if (associationError) throw associationError;

  const { data: updatedInvite, error: updateError } = await supabaseAdmin
    .from('fitness_center_trainer_invites')
    .update({ status: 'accepted', responded_at: now, accepted_by_coach_id: coach.id, coach_id: coach.id })
    .eq('id', invite.id)
    .select('*')
    .single();
  if (updateError) throw updateError;

  return { invite: withTrainerInviteLinks(updatedInvite), association };
};

const listGroups = async (filters = {}) => {
  let query = supabaseAdmin.from('wellness_groups').select('*').eq('is_public', true).eq('moderation_status', 'active');
  if (filters.goal) query = query.eq('goal_tag', filters.goal);
  if (filters.city) query = query.ilike('city', filters.city);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
};

const joinGroup = async (userId, groupId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_group_members')
    .upsert({ patient_id: patient.id, group_id: groupId, status: 'active' }, { onConflict: 'group_id,patient_id' })
    .select('*, group:wellness_groups(*)')
    .single();
  if (error) throw error;
  return data;
};

const listChallenges = async (filters = {}) => {
  let query = supabaseAdmin.from('wellness_challenges').select('*, group:wellness_groups(id, name, goal_tag)').eq('is_active', true);
  if (filters.groupId) query = query.eq('group_id', filters.groupId);
  if (filters.type) query = query.eq('challenge_type', filters.type);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
};

const joinChallenge = async (userId, challengeId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_challenge_entries')
    .upsert({ patient_id: patient.id, challenge_id: challengeId }, { onConflict: 'challenge_id,patient_id' })
    .select('*, challenge:wellness_challenges(*)')
    .single();
  if (error) throw error;
  return data;
};

const listSupplements = async (filters = {}, page = 1, limit = 20) => {
  return cachedList('supplements', filters, page, limit, 600, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('trusted_supplement_products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    const q = sanitizeSearch(filters.q || filters.search || '');
    if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`);
    if (filters.category) query = query.eq('category', filters.category);
    const { data, count, error } = await query.order('is_verified', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    if (data && data.length > 0) {
      return { data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
    }

    let fallback = supabaseAdmin
      .from('medicines')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .in('category', ['vitamin', 'supplement']);
    if (q) fallback = fallback.or(`name.ilike.%${q}%,generic_name.ilike.%${q}%,manufacturer.ilike.%${q}%`);
    const { data: medicines, count: medicineCount, error: medicineError } = await fallback.order('name').range(offset, offset + limit - 1);
    if (medicineError) throw medicineError;
    return {
      data: (medicines || []).map((medicine) => ({ ...medicine, source: 'medicines', is_verified: false })),
      pagination: { page, limit, total: medicineCount || 0, totalPages: Math.ceil((medicineCount || 0) / limit) },
    };
  });
};

const checkSupplementSuitability = async (userId, productId) => {
  const patient = await resolvePatient(userId);
  const { data: product, error } = await supabaseAdmin
    .from('trusted_supplement_products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!product) throw new ApiError(404, 'Supplement product not found');

  const conditions = [
    ...asArray(patient.medical_conditions),
    ...asArray(patient.chronic_conditions),
  ].map((item) => item.toLowerCase());
  const rules = product.suitability_rules || {};
  const avoidFor = asArray(rules.avoid_for);
  const cautionFor = asArray(rules.caution_for);
  const reasons = [];
  let verdict = 'suitable';

  avoidFor.forEach((term) => {
    if (conditions.some((condition) => condition.includes(String(term).toLowerCase()))) {
      verdict = 'avoid';
      reasons.push(`Avoid or ask a doctor because your profile includes ${term}.`);
    }
  });
  if (verdict !== 'avoid') {
    cautionFor.forEach((term) => {
      if (conditions.some((condition) => condition.includes(String(term).toLowerCase()))) {
        verdict = 'caution';
        reasons.push(`Use caution because your profile includes ${term}.`);
      }
    });
  }
  if (!product.is_verified) {
    verdict = verdict === 'suitable' ? 'review' : verdict;
    reasons.push('This product is not verified by VAIDIDEA yet.');
  }

  const { data, error: insertError } = await supabaseAdmin
    .from('supplement_suitability_checks')
    .insert({ patient_id: patient.id, product_id: product.id, verdict, reasons, metadata: { conditions } })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return { ...data, product };
};

const listAiInsights = async (userId, filters = {}) => {
  const patient = await resolvePatient(userId);
  let query = supabaseAdmin
    .from('ai_wellness_insights')
    .select('*')
    .eq('patient_id', patient.id);
  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.unacknowledged === 'true' || filters.unacknowledged === true) query = query.is('acknowledged_at', null);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
};

const acknowledgeAiInsight = async (userId, insightId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('ai_wellness_insights')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', insightId)
    .eq('patient_id', patient.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'AI insight not found');
  return data;
};

const getWellnessReports = async (userId, filters = {}) => {
  const patient = await resolvePatient(userId);
  const days = Math.max(1, Math.min(Number(filters.days) || 30, 365));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const [
    workoutResult,
    wearableResult,
    badgeResult,
    sessionResult,
    supplementResult,
    insightResult,
  ] = await Promise.allSettled([
    supabaseAdmin
      .from('workout_logs')
      .select('id, completed_at, duration_minutes, calories_burned, perceived_intensity, pain_reported, plan:workout_plans(id, title)')
      .eq('patient_id', patient.id)
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false }),
    supabaseAdmin
      .from('wearable_daily_summaries')
      .select('*')
      .eq('patient_id', patient.id)
      .gte('summary_date', sinceDate)
      .order('summary_date', { ascending: false }),
    supabaseAdmin
      .from('patient_wellness_badges')
      .select('*, badge:wellness_badges(*)')
      .eq('patient_id', patient.id)
      .gte('earned_at', sinceIso)
      .order('earned_at', { ascending: false }),
    supabaseAdmin
      .from('wellness_sessions')
      .select('id, scheduled_at, status, session_type, coach:wellness_coaches(id, name), center:fitness_centers(id, name)')
      .eq('patient_id', patient.id)
      .gte('scheduled_at', sinceIso)
      .order('scheduled_at', { ascending: false }),
    supabaseAdmin
      .from('supplement_suitability_checks')
      .select('*, product:trusted_supplement_products(id, name, brand, category)')
      .eq('patient_id', patient.id)
      .gte('checked_at', sinceIso)
      .order('checked_at', { ascending: false }),
    supabaseAdmin
      .from('ai_wellness_insights')
      .select('*')
      .eq('patient_id', patient.id)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false }),
  ]);

  const workouts = workoutResult.status === 'fulfilled' ? workoutResult.value.data || [] : [];
  const wearables = wearableResult.status === 'fulfilled' ? wearableResult.value.data || [] : [];
  const totalSteps = wearables.reduce((sum, item) => sum + Number(item.steps || 0), 0);
  const totalActiveCalories = wearables.reduce((sum, item) => sum + Number(item.active_calories || 0), 0);
  const totalSleepMinutes = wearables.reduce((sum, item) => sum + Number(item.sleep_minutes || 0), 0);
  const sleepDays = wearables.filter((item) => item.sleep_minutes != null).length;

  return {
    patient: { id: patient.id, name: patient.name },
    period: { days, from: sinceDate, to: todayIsoDate() },
    generatedAt: new Date().toISOString(),
    workoutSummary: {
      completed: workouts.length,
      totalMinutes: workouts.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0),
      totalCalories: workouts.reduce((sum, item) => sum + Number(item.calories_burned || 0), 0),
      painReports: workouts.filter((item) => item.pain_reported).length,
      recent: workouts.slice(0, 10),
    },
    wearableSummary: {
      daysSynced: wearables.length,
      totalSteps,
      totalActiveCalories,
      averageSleepMinutes: sleepDays > 0 ? Math.round(totalSleepMinutes / sleepDays) : null,
      latest: wearables[0] || null,
      trend: wearables,
    },
    badges: badgeResult.status === 'fulfilled' ? badgeResult.value.data || [] : [],
    coachingSessions: sessionResult.status === 'fulfilled' ? sessionResult.value.data || [] : [],
    supplementChecks: supplementResult.status === 'fulfilled' ? supplementResult.value.data || [] : [],
    aiInsights: insightResult.status === 'fulfilled' ? insightResult.value.data || [] : [],
  };
};

const notify = async (userId, title, message, type = 'wellness', data = {}) => {
  try {
    const { sendNotification } = require('./notificationService');
    await sendNotification(userId, { title, message, type, data });
  } catch (err) {
    console.warn(`[wellness] notification failed for user ${userId}: ${err.message}`);
  }
};

const toDateOnly = (isoValue) => String(isoValue || '').slice(0, 10);

const getWorkoutStreaks = async (userId) => {
  const patient = await resolvePatient(userId);
  const since = new Date();
  since.setDate(since.getDate() - 180);
  const { data, error } = await supabaseAdmin
    .from('workout_logs')
    .select('completed_at')
    .eq('patient_id', patient.id)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: false });
  if (error) throw error;

  const activeDays = new Set((data || []).map((item) => toDateOnly(item.completed_at)).filter(Boolean));
  const today = todayIsoDate();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  let cursor = activeDays.has(today) ? new Date() : yesterdayDate;
  let currentStreak = 0;
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  if (!activeDays.has(today) && !activeDays.has(yesterday)) currentStreak = 0;

  const sortedDays = Array.from(activeDays).sort();
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const day of sortedDays) {
    const current = new Date(day);
    if (prev) {
      const diff = Math.round((current.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = current;
  }

  const last7Days = [];
  const last30Days = [];
  for (let i = 0; i < 30; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = activeDays.has(key);
    if (i < 7) last7Days.push({ date: key, active: hit });
    last30Days.push({ date: key, active: hit });
  }

  const lastWorkout = (data || [])[0] || null;
  return {
    currentStreak,
    longestStreak,
    activeDaysTotal: activeDays.size,
    activeDaysLast7: last7Days.filter((day) => day.active).length,
    activeDaysLast30: last30Days.filter((day) => day.active).length,
    lastWorkoutAt: lastWorkout?.completed_at || null,
  };
};

const listOwnerClasses = async (userId, filters = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  let query = supabaseAdmin
    .from('fitness_classes')
    .select('*, coach:wellness_coaches(id, name, profile_image_url, coach_types, specialties)')
    .eq('center_id', center.id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('starts_at', filters.from);
  if (filters.to) query = query.lte('starts_at', filters.to);
  const { data, error } = await query.order('starts_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
};

const createOwnerClass = async (userId, payload = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  if (!payload.title || !String(payload.title).trim()) throw new ApiError(400, 'Class title is required');
  if (!payload.startsAt && !payload.starts_at) throw new ApiError(400, 'Class start time is required');

  const classData = {
    center_id: center.id,
    coach_id: payload.coachId || payload.coach_id || null,
    title: String(payload.title).trim(),
    class_type: payload.classType || payload.class_type || 'strength',
    level: payload.level || 'beginner',
    description: payload.description || null,
    starts_at: payload.startsAt || payload.starts_at,
    ends_at: payload.endsAt || payload.ends_at || null,
    capacity: Math.max(1, Math.min(asNumber(payload.capacity, 10) || 10, 500)),
    price: Math.max(0, asNumber(payload.price, 0) || 0),
    waitlist_enabled: payload.waitlistEnabled ?? payload.waitlist_enabled ?? true,
    recurring: payload.recurring || payload.recurrence || {},
  };

  const { data, error } = await supabaseAdmin
    .from('fitness_classes')
    .insert(classData)
    .select('*, coach:wellness_coaches(id, name, profile_image_url)')
    .single();
  if (error) throw error;
  await bumpListVersion('facilities');
  return data;
};

const updateOwnerClass = async (userId, classId, payload = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  const updates = {
    title: payload.title,
    class_type: payload.classType || payload.class_type,
    level: payload.level,
    description: payload.description,
    starts_at: payload.startsAt || payload.starts_at,
    ends_at: payload.endsAt || payload.ends_at,
    capacity: payload.capacity != null ? Math.max(1, Math.min(asNumber(payload.capacity, 10) || 10, 500)) : undefined,
    price: payload.price != null ? Math.max(0, asNumber(payload.price, 0) || 0) : undefined,
    coach_id: payload.coachId || payload.coach_id,
    waitlist_enabled: payload.waitlistEnabled ?? payload.waitlist_enabled,
  };
  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) delete updates[key];
  });
  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No update fields provided');

  const { data, error } = await supabaseAdmin
    .from('fitness_classes')
    .update(updates)
    .eq('id', classId)
    .eq('center_id', center.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Class not found');
  await bumpListVersion('facilities');
  return data;
};

const cancelOwnerClass = async (userId, classId) => {
  const center = await resolveFitnessCenterOwner(userId);
  const { data, error } = await supabaseAdmin
    .from('fitness_classes')
    .update({ status: 'cancelled' })
    .eq('id', classId)
    .eq('center_id', center.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Class not found');

  const { data: bookings } = await supabaseAdmin
    .from('fitness_bookings')
    .select('patient_id')
    .eq('class_id', classId)
    .in('status', ['booked', 'waitlisted']);
  await supabaseAdmin
    .from('fitness_bookings')
    .update({ status: 'cancelled' })
    .eq('class_id', classId)
    .in('status', ['booked', 'waitlisted']);

  const { data: canceledPatients } = await supabaseAdmin
    .from('fitness_bookings')
    .select('patient:patients(user_id)')
    .eq('class_id', classId)
    .eq('status', 'cancelled');
  const notified = new Set();
  for (const booking of canceledPatients || []) {
    const patientUserId = booking.patient?.user_id;
    if (patientUserId && !notified.has(patientUserId)) {
      notified.add(patientUserId);
      await notify(patientUserId, 'Class cancelled', `"${data.title}" on ${toDateOnly(data.starts_at)} has been cancelled. Your booking was refunded to status cancelled.`, 'gym', { classId, centerId: center.id });
    }
  }
  await bumpListVersion('facilities');
  return data;
};

const listOwnerBookings = async (userId, filters = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  let query = supabaseAdmin
    .from('fitness_bookings')
    .select('*, patient:patients(id, name, phone, profile_image_url, city), class:fitness_classes(id, title, starts_at, capacity), coach:wellness_coaches(id, name)')
    .eq('center_id', center.id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('booking_date', filters.from);
  if (filters.classId) query = query.eq('class_id', filters.classId);
  const { data, error } = await query.order('booking_date', { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
};

const listOwnerCheckins = async (userId, filters = {}) => {
  const center = await resolveFitnessCenterOwner(userId);
  let query = supabaseAdmin
    .from('fitness_checkins')
    .select('*, patient:patients(id, name, profile_image_url, phone), booking:fitness_bookings(id, booking_type, class:fitness_classes(title))')
    .eq('center_id', center.id);
  if (filters.from) query = query.gte('checked_in_at', filters.from);
  const { data, error } = await query.order('checked_in_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
};

const refreshChallengeProgress = async (challenge) => {
  const { data: entries } = await supabaseAdmin
    .from('wellness_challenge_entries')
    .select('id, patient_id')
    .eq('challenge_id', challenge.id);
  if (!entries || entries.length === 0) return;

  const metric = challenge.metric || 'steps';
  const startDate = challenge.starts_at ? toDateOnly(challenge.starts_at) : null;
  const endDate = toDateOnly(challenge.ends_at || new Date().toISOString());
  const nowIso = new Date().toISOString();

  for (const entry of entries) {
    let progressValue = 0;
    if (metric === 'steps') {
      const { data: rows } = await supabaseAdmin
        .from('wearable_daily_summaries')
        .select('steps')
        .eq('patient_id', entry.patient_id)
        .gte('summary_date', startDate || '2000-01-01')
        .lte('summary_date', endDate);
      progressValue = (rows || []).reduce((sum, row) => sum + Number(row.steps || 0), 0);
    } else if (metric === 'workouts' || metric === 'workout') {
      let query = supabaseAdmin
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', entry.patient_id)
        .lte('completed_at', `${endDate}T23:59:59.999Z`);
      if (startDate) query = query.gte('completed_at', `${startDate}T00:00:00.000Z`);
      const { count } = await query;
      progressValue = count || 0;
    } else if (metric === 'active_minutes') {
      const { data: rows } = await supabaseAdmin
        .from('wearable_daily_summaries')
        .select('active_minutes')
        .eq('patient_id', entry.patient_id)
        .gte('summary_date', startDate || '2000-01-01')
        .lte('summary_date', endDate);
      progressValue = (rows || []).reduce((sum, row) => sum + Number(row.active_minutes || 0), 0);
    } else {
      continue;
    }

    const completedAt = challenge.target_value != null && progressValue >= Number(challenge.target_value) ? nowIso : null;
    await supabaseAdmin
      .from('wellness_challenge_entries')
      .update({ progress_value: progressValue, completed_at: completedAt, last_updated_at: nowIso })
      .eq('id', entry.id);
  }
};

const getChallengeLeaderboard = async (userId, challengeId) => {
  const { data: challenge, error } = await supabaseAdmin
    .from('wellness_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw error;
  if (!challenge) throw new ApiError(404, 'Challenge not found');

  await refreshChallengeProgress(challenge);

  const { data, error: entriesError } = await supabaseAdmin
    .from('wellness_challenge_entries')
    .select('*, patient:patients(id, name, profile_image_url, city)')
    .eq('challenge_id', challengeId)
    .order('progress_value', { ascending: false })
    .order('last_updated_at', { ascending: true })
    .limit(100);
  if (entriesError) throw entriesError;

  const entries = (data || []).map((entry, index) => ({ ...entry, rank: index + 1 }));
  let viewerPatientId = null;
  if (userId) {
    try {
      const viewer = await resolvePatient(userId);
      viewerPatientId = viewer.id;
    } catch { /* optional viewer */ }
  }
  return {
    challenge,
    entries: entries.map((entry) => ({ ...entry, is_self: Boolean(viewerPatientId && entry.patient_id === viewerPatientId) })),
    totalEntries: entries.length,
  };
};

const updateChallengeProgress = async (userId, challengeId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const { data: challenge, error } = await supabaseAdmin
    .from('wellness_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw error;
  if (!challenge) throw new ApiError(404, 'Challenge not found');

  const { data, error: joinError } = await supabaseAdmin
    .from('wellness_challenge_entries')
    .upsert({ challenge_id: challengeId, patient_id: patient.id }, { onConflict: 'challenge_id,patient_id' })
    .select('*')
    .single();
  if (joinError) throw joinError;

  await refreshChallengeProgress(challenge);
  const { data: refreshed } = await supabaseAdmin
    .from('wellness_challenge_entries')
    .select('*, challenge:wellness_challenges(*)')
    .eq('challenge_id', challengeId)
    .eq('patient_id', patient.id)
    .single();
  return refreshed;
};

const listCoachPatients = async (userId) => {
  const coach = await resolveCoach(userId);
  const [relResult, sessionResult, planResult] = await Promise.allSettled([
    supabaseAdmin
      .from('coach_patient_relationships')
      .select('*, patient:patients(id, user_id, name, email, phone, profile_image_url, city)')
      .eq('coach_id', coach.id)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false }),
    supabaseAdmin
      .from('wellness_sessions')
      .select('patient_id, scheduled_at, status')
      .eq('coach_id', coach.id)
      .neq('status', 'cancelled')
      .limit(500),
    supabaseAdmin
      .from('patient_workout_plans')
      .select('patient_id, status, started_at')
      .eq('coach_id', coach.id)
      .in('status', ['active', 'paused', 'completed'])
      .limit(500),
  ]);

  const relationships = relResult.status === 'fulfilled' ? relResult.value.data || [] : [];
  const sessions = sessionResult.status === 'fulfilled' ? sessionResult.value.data || [] : [];
  const plans = planResult.status === 'fulfilled' ? planResult.value.data || [] : [];

  const explicit = new Map();
  relationships.forEach((rel) => {
    if (rel.patient) explicit.set(rel.patient.id, rel.patient);
  });

  const sessionPatientIds = new Set(sessions.map((session) => session.patient_id).filter(Boolean));
  const planPatientIds = new Set(plans.map((plan) => plan.patient_id).filter(Boolean));
  const implicitIds = Array.from(new Set([...sessionPatientIds, ...planPatientIds]))
    .filter((id) => !explicit.has(id));

  let implicitPatients = [];
  if (implicitIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, user_id, name, email, phone, profile_image_url, city')
      .in('id', implicitIds);
    if (error) throw error;
    implicitPatients = data || [];
  }

  const merged = new Map();
  explicit.forEach((patient, id) => merged.set(id, { ...patient, source: 'assigned' }));
  implicitPatients.forEach((patient) => merged.set(patient.id, { ...patient, source: 'session_or_plan' }));

  const sessionCounts = new Map();
  sessions.forEach((session) => {
    sessionCounts.set(session.patient_id, (sessionCounts.get(session.patient_id) || 0) + 1);
  });
  const lastSessionByPatient = new Map();
  sessions.forEach((session) => {
    const existing = lastSessionByPatient.get(session.patient_id);
    if (!existing || new Date(session.scheduled_at) > new Date(existing)) {
      lastSessionByPatient.set(session.patient_id, session.scheduled_at);
    }
  });
  const planCounts = new Map();
  plans.forEach((plan) => {
    if (plan.status === 'active') planCounts.set(plan.patient_id, (planCounts.get(plan.patient_id) || 0) + 1);
  });

  const patients = Array.from(merged.values()).map((patient) => ({
    ...patient,
    totalSessions: sessionCounts.get(patient.id) || 0,
    lastSessionAt: lastSessionByPatient.get(patient.id) || null,
    activePlans: planCounts.get(patient.id) || 0,
  }));

  const sorted = relationships.length > 0
    ? patients
    : patients.sort((a, b) => (b.totalSessions - a.totalSessions) || String(b.lastSessionAt || '').localeCompare(String(a.lastSessionAt || '')));
  return sorted;
};

const getPatientAnalytics = async (coachUserId, patientId) => {
  const coach = await resolveCoach(coachUserId);
  const { data: rel, error: relError } = await supabaseAdmin
    .from('coach_patient_relationships')
    .select('id')
    .eq('coach_id', coach.id)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (relError) throw relError;

  const { data: sessionCheck } = await supabaseAdmin
    .from('wellness_sessions')
    .select('id')
    .eq('coach_id', coach.id)
    .eq('patient_id', patientId)
    .limit(1);
  if (!rel && (!sessionCheck || sessionCheck.length === 0)) {
    throw new ApiError(403, 'This patient is not assigned to your coaching roster');
  }

  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id, name, email, phone, profile_image_url, city, medical_conditions, chronic_conditions')
    .eq('id', patientId)
    .maybeSingle();
  if (patientError) throw patientError;
  if (!patient) throw new ApiError(404, 'Patient not found');

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const [workoutResult, wearableResult, badgeResult, sessionResult, planResult, dietResult] = await Promise.allSettled([
    supabaseAdmin.from('workout_logs').select('id, completed_at, duration_minutes, calories_burned, perceived_intensity, pain_reported').eq('patient_id', patientId).gte('completed_at', sinceIso).order('completed_at', { ascending: false }),
    supabaseAdmin.from('wearable_daily_summaries').select('*').eq('patient_id', patientId).gte('summary_date', sinceDate).order('summary_date', { ascending: false }),
    supabaseAdmin.from('patient_wellness_badges').select('*, badge:wellness_badges(*)').eq('patient_id', patientId).order('earned_at', { ascending: false }).limit(20),
    supabaseAdmin.from('wellness_sessions').select('id, scheduled_at, status, session_type').eq('patient_id', patientId).eq('coach_id', coach.id).gte('scheduled_at', sinceIso).order('scheduled_at', { ascending: false }),
    supabaseAdmin.from('patient_workout_plans').select('*, plan:workout_plans(id, title, plan_type)').eq('patient_id', patientId).in('status', ['active', 'paused']).order('started_at', { ascending: false }).limit(5),
    supabaseAdmin.from('wellness_diet_plans').select('*').eq('patient_id', patientId).eq('status', 'active').order('assigned_at', { ascending: false }).limit(3),
  ]);

  const workouts = workoutResult.status === 'fulfilled' ? workoutResult.value.data || [] : [];
  const wearables = wearableResult.status === 'fulfilled' ? wearableResult.value.data || [] : [];
  const activeDays = new Set(workouts.map((item) => toDateOnly(item.completed_at))).size;
  const totalMinutes = workouts.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const totalCalories = workouts.reduce((sum, item) => sum + Number(item.calories_burned || 0), 0);
  const avgSteps = wearables.length > 0
    ? Math.round(wearables.reduce((sum, item) => sum + Number(item.steps || 0), 0) / wearables.length)
    : 0;
  const avgSleep = (() => {
    const sleepDays = wearables.filter((item) => item.sleep_minutes != null);
    return sleepDays.length > 0
      ? Math.round(sleepDays.reduce((sum, item) => sum + Number(item.sleep_minutes || 0), 0) / sleepDays.length)
      : null;
  })();
  const streaks = await getWorkoutStreaks(patient.user_id);

  return {
    patient,
    period: { days: 30, from: sinceDate, to: todayIsoDate() },
    metrics: {
      workoutsCompleted: workouts.length,
      activeDays,
      totalMinutes,
      totalCalories,
      painReports: workouts.filter((item) => item.pain_reported).length,
      avgDailySteps: avgSteps,
      avgSleepMinutes: avgSleep,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    },
    trend: wearables.map((item) => ({ date: toDateOnly(item.summary_date), steps: item.steps, activeCalories: item.active_calories, sleepMinutes: item.sleep_minutes })),
    recentWorkouts: workouts.slice(0, 10),
    badges: badgeResult.status === 'fulfilled' ? badgeResult.value.data || [] : [],
    sessions: sessionResult.status === 'fulfilled' ? sessionResult.value.data || [] : [],
    activePlans: planResult.status === 'fulfilled' ? planResult.value.data || [] : [],
    dietPlans: dietResult.status === 'fulfilled' ? dietResult.value.data || [] : [],
  };
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const createCoachWorkoutPlan = async (userId, payload = {}) => {
  const coach = await resolveCoach(userId);
  if (!payload.title || !String(payload.title).trim()) throw new ApiError(400, 'Plan title is required');

  const baseSlug = slugify(payload.title) || `plan-${Date.now().toString(36)}`;
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data: existing } = await supabaseAdmin.from('workout_plans').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const planData = {
    slug,
    created_by_coach_id: coach.id,
    title: String(payload.title).trim(),
    description: payload.description || null,
    plan_type: payload.planType || payload.plan_type || 'strength',
    goal: payload.goal || 'general_fitness',
    level: payload.level || 'beginner',
    location_type: payload.locationType || payload.location_type || 'home',
    duration_weeks: Math.max(1, Math.min(asNumber(payload.durationWeeks || payload.duration_weeks, 4) || 4, 52)),
    days_per_week: Math.max(1, Math.min(asNumber(payload.daysPerWeek || payload.days_per_week, 3) || 3, 7)),
    minutes_per_session: Math.max(5, Math.min(asNumber(payload.minutesPerSession || payload.minutes_per_session, 30) || 30, 240)),
    intensity: payload.intensity || 'moderate',
    equipment: asArray(payload.equipment),
    body_parts: asArray(payload.bodyParts || payload.body_parts),
    language: payload.language || 'en',
    safety_notes: asArray(payload.safetyNotes || payload.safety_notes),
    is_public: payload.isPublic ?? payload.is_public ?? false,
    is_active: true,
  };

  const { data, error } = await supabaseAdmin.from('workout_plans').insert(planData).select('*').single();
  if (error) throw error;

  const sessionsPayload = Array.isArray(payload.sessions) ? payload.sessions : [];
  const sessions = [];
  for (const session of sessionsPayload) {
    if (!session.title || !String(session.title).trim()) continue;
    const { data: inserted, error: sessionError } = await supabaseAdmin
      .from('workout_sessions')
      .insert({
        plan_id: data.id,
        day_index: asNumber(session.dayIndex || session.day_index, 1),
        week_index: asNumber(session.weekIndex || session.week_index, 1),
        title: String(session.title).trim(),
        category: session.category || 'workout',
        duration_minutes: asNumber(session.durationMinutes || session.duration_minutes, 30),
        intensity: session.intensity || 'moderate',
        body_parts: asArray(session.bodyParts || session.body_parts),
        warmup: session.warmup || [],
        exercises: session.exercises || [],
        cooldown: session.cooldown || [],
        instructions: session.instructions || null,
        media_url: session.mediaUrl || session.media_url || null,
        sort_order: asNumber(session.sortOrder || session.sort_order, 0),
      })
      .select('*')
      .single();
    if (sessionError) throw sessionError;
    sessions.push(inserted);
  }

  const patientId = payload.patientId || payload.patient_id;
  if (patientId) {
    await supabaseAdmin
      .from('coach_patient_relationships')
      .upsert(
        { coach_id: coach.id, patient_id: patientId, source: 'workout_plan', status: 'active' },
        { onConflict: 'coach_id,patient_id' }
      );
    if (payload.assign === true || payload.assign) {
      await supabaseAdmin
        .from('patient_workout_plans')
        .insert({ patient_id: patientId, plan_id: data.id, coach_id: coach.id, status: 'active' })
        .select('*')
        .single();
    }
  }

  return { ...data, sessions };
};

const listCoachWorkoutPlans = async (userId) => {
  const coach = await resolveCoach(userId);
  const { data, error } = await supabaseAdmin
    .from('workout_plans')
    .select('*, sessions:workout_sessions(*)')
    .eq('created_by_coach_id', coach.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map((plan) => ({
    ...plan,
    sessions: (plan.sessions || []).sort((a, b) => (a.week_index - b.week_index) || (a.day_index - b.day_index) || (a.sort_order - b.sort_order)),
  }));
};

const createDietPlan = async (userId, payload = {}) => {
  const coach = await resolveCoach(userId);
  if (!payload.title || !String(payload.title).trim()) throw new ApiError(400, 'Diet plan title is required');

  const patientId = payload.patientId || payload.patient_id;
  if (patientId) {
    await supabaseAdmin
      .from('coach_patient_relationships')
      .upsert(
        { coach_id: coach.id, patient_id: patientId, source: 'diet_plan', status: 'active' },
        { onConflict: 'coach_id,patient_id' }
      );
  }

  const { data, error } = await supabaseAdmin
    .from('wellness_diet_plans')
    .insert({
      coach_id: coach.id,
      patient_id: patientId || null,
      title: String(payload.title).trim(),
      description: payload.description || null,
      diet_type: payload.dietType || payload.diet_type || 'balanced',
      daily_calories: asNumber(payload.dailyCalories || payload.daily_calories),
      macro_goals: payload.macroGoals || payload.macro_goals || {},
      restricted_foods: asArray(payload.restrictedFoods || payload.restricted_foods),
      meal_plan: Array.isArray(payload.mealPlan) ? payload.mealPlan : (payload.meals || []),
      status: 'active',
    })
    .select('*, coach:wellness_coaches(id, name, profile_image_url)')
    .single();
  if (error) throw error;
  return data;
};

const listMyDietPlans = async (userId) => {
  const patient = await resolvePatient(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_diet_plans')
    .select('*, coach:wellness_coaches(id, name, profile_image_url, headline)')
    .eq('patient_id', patient.id)
    .in('status', ['active', 'completed'])
    .order('assigned_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
};

const listCoachDietPlans = async (userId) => {
  const coach = await resolveCoach(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_diet_plans')
    .select('*, patient:patients(id, name, profile_image_url)')
    .eq('coach_id', coach.id)
    .order('assigned_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

const archiveDietPlan = async (userId, planId) => {
  const coach = await resolveCoach(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_diet_plans')
    .update({ status: 'archived' })
    .eq('id', planId)
    .eq('coach_id', coach.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Diet plan not found');
  return data;
};

const createReel = async (userId, payload = {}) => {
  const coach = await resolveCoach(userId);
  if (!payload.videoUrl && !payload.video_url) throw new ApiError(400, 'videoUrl is required');

  const { data, error } = await supabaseAdmin
    .from('wellness_reels')
    .insert({
      coach_id: coach.id,
      title: String(payload.title || 'Fitness tip').trim(),
      description: payload.description || null,
      video_url: payload.videoUrl || payload.video_url,
      thumbnail_url: payload.thumbnailUrl || payload.thumbnail_url || null,
      category: payload.category || 'fitness',
      tags: asArray(payload.tags),
      duration_seconds: Math.max(0, asNumber(payload.durationSeconds || payload.duration_seconds, 0) || 0),
      status: payload.status || 'published',
      is_active: payload.isActive ?? payload.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  await bumpListVersion('reels');
  return data;
};

const listReels = async (filters = {}, page = 1, limit = 20) => {
  return cachedList('reels', filters, page, limit, 60, async () => {
    const offset = (page - 1) * limit;
    let query = supabaseAdmin
      .from('wellness_reels')
      .select('*, coach:wellness_coaches(id, name, profile_image_url, headline, coach_types, sub_role)', { count: 'exact' })
      .eq('status', 'published')
      .eq('is_active', true);
    const q = sanitizeSearch(filters.q || filters.search || '');
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (filters.category) query = query.eq('category', filters.category);
    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
  });
};

const listCoachReels = async (userId) => {
  const coach = await resolveCoach(userId);
  const { data, error } = await supabaseAdmin
    .from('wellness_reels')
    .select('*')
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

const likeReel = async (reelId) => {
  const { data: reel } = await supabaseAdmin.from('wellness_reels').select('likes_count').eq('id', reelId).maybeSingle();
  if (!reel) throw new ApiError(404, 'Reel not found');
  const next = (Number(reel.likes_count) || 0) + 1;
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('wellness_reels')
    .update({ likes_count: next })
    .eq('id', reelId)
    .select('id, likes_count')
    .single();
  if (updateError) throw updateError;
  return updated;
};

const incrementReelViews = async (reelId) => {
  const { data: reel } = await supabaseAdmin.from('wellness_reels').select('views_count').eq('id', reelId).maybeSingle();
  if (!reel) return null;
  const { data: updated } = await supabaseAdmin
    .from('wellness_reels')
    .update({ views_count: (Number(reel.views_count) || 0) + 1 })
    .eq('id', reelId)
    .select('id, views_count')
    .single();
  return updated;
};

const getSessionMessages = async (userId, role, sessionId, options = {}) => {
  const isCoach = role === 'wellness_coach';
  if (!isCoach && role !== 'patient') throw new ApiError(403, 'Wellness chat access denied');

  const { data: session, error } = await supabaseAdmin
    .from('wellness_sessions')
    .select('id, coach_id, patient_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw new ApiError(404, 'Wellness session not found');

  const table = isCoach ? 'wellness_coaches' : 'patients';
  const { data: record, error: recordError } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (recordError) throw recordError;

  const participantId = record?.id;
  const isParticipant = isCoach
    ? participantId === session.coach_id
    : participantId === session.patient_id;
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this wellness session');
  }

  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 100);
  const before = options.before && !Number.isNaN(Date.parse(options.before)) ? new Date(options.before) : null;

  const { ChatMessage } = require('../database/models');
  if (!ChatMessage) return { data: [], pagination: { hasMore: false, nextBefore: null } };

  let query = ChatMessage.find({ sessionId })
    .where('metadata.wellnessSessionId').equals(sessionId)
    .sort({ createdAt: -1 });
  if (before) query = query.where('createdAt').lt(before);

  const raw = await query.limit(limit + 1);
  const hasMore = raw.length > limit;
  const pageMessages = raw.slice(0, limit);

  const messages = pageMessages.reverse().map((message) => ({
    id: String(message._id),
    userId: message.userId,
    role: message.role,
    message: message.content,
    timestamp: message.createdAt ? message.createdAt.toISOString() : null,
  }));

  const oldest = pageMessages.length > 0 ? pageMessages[pageMessages.length - 1].createdAt : null;
  return {
    data: messages,
    pagination: {
      hasMore,
      nextBefore: oldest ? oldest.toISOString() : null,
    },
  };
};

const updateCoachAvailability = async (userId, payload = {}) => {
  const coach = await resolveCoach(userId);
  const updates = {
    is_available: payload.isAvailable ?? payload.is_available,
    is_accepting_clients: payload.isAcceptingClients ?? payload.is_accepting_clients,
    available_days: payload.availableDays || payload.available_days,
    available_hours: payload.availableHours || payload.available_hours,
    updated_at: new Date().toISOString(),
  };
  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) delete updates[key];
  });
  if (updates.available_days !== undefined) updates.available_days = asArray(updates.available_days);
  const { data, error } = await supabaseAdmin
    .from('wellness_coaches')
    .update(updates)
    .eq('id', coach.id)
    .select('*')
    .single();
  if (error) throw error;
  await bumpListVersion('coaches');
  return data;
};

const runWellnessBadgeEvaluation = async () => {
  const { cacheSetIfNotExists } = require('../config/redis');
  const lockAcquired = await cacheSetIfNotExists('cron:wellness-badges:lock', process.pid, 60);
  if (!lockAcquired) {
    return { status: 'busy', message: 'A badge evaluation is already running' };
  }
  const started = Date.now();
  const evaluateWellnessBadges = require('../cron/badges');
  const result = await evaluateWellnessBadges();
  return { status: 'ok', ...result, durationMs: Date.now() - started };
};

module.exports = {
  getHubSummary,
  getFitnessProfile,
  upsertFitnessProfile,
  getWellnessAssessment,
  submitAssessmentGoals,
  submitAssessmentBio,
  submitHealthScreening,
  getWearableSummaries,
  upsertWearableSummary,
  listWorkoutPlans,
  getWorkoutPlan,
  listExercises,
  getExercise,
  getExerciseStats,
  assignWorkoutPlan,
  logWorkout,
  getWorkoutCalendar,
  getWorkoutProgress,
  listMyBadges,
  listCoaches,
  getCoach,
  getMyCoachProfile,
  updateMyCoachProfile,
  bookCoachSession,
  listMySessions,
  listFacilities,
  getFacility,
  listFacilityClasses,
  bookFacilityClass,
  cancelFacilityClassBooking,
  addFitnessReel,
  deleteFitnessReel,
  bookFacility,
  checkInFacility,
  getOwnedFitnessCenterDashboard,
  listOwnerTrainers,
  listOwnerTrainerInvites,
  createTrainerInvite,
  cancelTrainerInvite,
  getTrainerInviteByToken,
  listCoachCenterInvites,
  respondTrainerInvite,
  listGroups,
  joinGroup,
  listChallenges,
  joinChallenge,
  listSupplements,
  checkSupplementSuitability,
  listAiInsights,
  acknowledgeAiInsight,
  getWellnessReports,
  getWorkoutStreaks,
  listOwnerClasses,
  createOwnerClass,
  updateOwnerClass,
  cancelOwnerClass,
  listOwnerBookings,
  listOwnerCheckins,
  refreshChallengeProgress,
  getChallengeLeaderboard,
  updateChallengeProgress,
  listCoachPatients,
  getPatientAnalytics,
  createCoachWorkoutPlan,
  listCoachWorkoutPlans,
  createDietPlan,
  listMyDietPlans,
  listCoachDietPlans,
  archiveDietPlan,
  createReel,
  listReels,
  listCoachReels,
  likeReel,
  incrementReelViews,
  updateCoachAvailability,
  getSessionMessages,
  runWellnessBadgeEvaluation,
};
