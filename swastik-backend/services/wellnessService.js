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
  ] = await Promise.allSettled([
    supabaseAdmin.from('fitness_profiles').select('*').eq('patient_id', patient.id).maybeSingle(),
    supabaseAdmin.from('wearable_daily_summaries').select('*').eq('patient_id', patient.id).order('summary_date', { ascending: false }).limit(7),
    supabaseAdmin.from('patient_workout_plans').select('*, plan:workout_plans(*)').eq('patient_id', patient.id).eq('status', 'active').limit(1).maybeSingle(),
    supabaseAdmin.from('workout_logs').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id).gte('completed_at', `${today}T00:00:00.000Z`),
    supabaseAdmin.from('wellness_sessions').select('*, coach:wellness_coaches(id, name, profile_image_url)').eq('patient_id', patient.id).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3),
    supabaseAdmin.from('patient_wellness_badges').select('*, badge:wellness_badges(*)').eq('patient_id', patient.id).order('earned_at', { ascending: false }).limit(5),
  ]);

  const wearables = wearableResult.status === 'fulfilled' ? wearableResult.value.data || [] : [];
  const latest = wearables[0] || null;
  return {
    patient: { id: patient.id, name: patient.name, city: patient.city },
    fitnessProfile: profileResult.status === 'fulfilled' ? profileResult.value.data || null : null,
    wearableToday: latest?.summary_date === today ? latest : null,
    wearableTrend: wearables,
    activeWorkoutPlan: activePlanResult.status === 'fulfilled' ? activePlanResult.value.data || null : null,
    workoutsCompletedToday: workoutCountResult.status === 'fulfilled' ? workoutCountResult.value.count || 0 : 0,
    upcomingSessions: sessionResult.status === 'fulfilled' ? sessionResult.value.data || [] : [],
    badges: badgeResult.status === 'fulfilled' ? badgeResult.value.data || [] : [],
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
  return data;
};

const bookCoachSession = async (userId, payload = {}) => {
  const patient = await resolvePatient(userId);
  const coach = await getCoach(payload.coachId || payload.coach_id);
  const sessionType = payload.sessionType || payload.session_type || 'video';
  if (!asArray(coach.session_modes).includes(sessionType) && !['audio', 'gym_personal_training'].includes(sessionType)) {
    throw new ApiError(400, 'Coach does not offer this session mode');
  }

  const { data, error } = await supabaseAdmin
    .from('wellness_sessions')
    .insert({
      session_number: `WEL-${Date.now().toString(36).toUpperCase()}`,
      patient_id: patient.id,
      coach_id: coach.id,
      center_id: payload.centerId || payload.center_id || null,
      scheduled_at: payload.scheduledAt || payload.scheduled_at,
      duration_minutes: asNumber(payload.durationMinutes || payload.duration_minutes, 45),
      session_type: sessionType,
      fee: asNumber(payload.fee, coach.session_fee || 0),
      patient_notes: payload.notes || payload.patientNotes || null,
      safety_flags: asArray(payload.safetyFlags || payload.safety_flags),
      room_id: crypto.randomUUID(),
    })
    .select('*, coach:wellness_coaches(id, name, profile_image_url, session_fee)')
    .single();
  if (error) throw error;
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
};

const getFacility = async (centerId) => {
  const { data, error } = await supabaseAdmin
    .from('fitness_centers')
    .select('*, classes:fitness_classes(*), trainers:fitness_center_trainers(*, coach:wellness_coaches(id, name, profile_image_url, specialties, coach_types, rating))')
    .eq('id', centerId)
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'Fitness center not found');
  data.classes = (data.classes || []).filter((item) => item.status === 'scheduled');
  return data;
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
  return data;
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
  ]);

  const invites = invitesResult.status === 'fulfilled'
    ? (invitesResult.value.data || []).map(withTrainerInviteLinks)
    : [];

  return {
    center,
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

module.exports = {
  getHubSummary,
  getFitnessProfile,
  upsertFitnessProfile,
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
};
