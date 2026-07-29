-- ============================================================
-- 049: WELLNESS / FITNESS ECOSYSTEM
-- Smart Health Hub, coaches, workouts, gyms, communities,
-- supplements, wearable summaries, and scoped consent.
-- ============================================================

-- Roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
    'patient', 'doctor', 'doctor_pending', 'hospital_owner', 'hospital_manager',
    'clinic_owner', 'pharmacy_owner', 'ambulance_operator',
    'ambulance_driver', 'diagnostic_center_owner', 'wellness_coach', 'fitness_center_owner',
    'admin', 'super_admin'
));

-- Consent scopes for trainer/gym/data-type sharing
ALTER TABLE patient_consents
ADD COLUMN IF NOT EXISTS data_scopes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE patient_consents DROP CONSTRAINT IF EXISTS patient_consents_entity_type_check;
ALTER TABLE patient_consents
ADD CONSTRAINT patient_consents_entity_type_check CHECK (entity_type IN (
    'hospital', 'pharmacy', 'diagnostic_center', 'doctor', 'research',
    'family', 'wellness_coach', 'fitness_center', 'health_card_public', 'other'
));

ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_type_check;
ALTER TABLE reminders
ADD CONSTRAINT reminders_type_check CHECK (type IN (
    'medicine', 'appointment', 'test', 'workout', 'hydration',
    'meal', 'sleep', 'wellness_session'
));

CREATE TABLE IF NOT EXISTS wellness_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    headline TEXT,
    coach_types TEXT[] DEFAULT '{}',
    specialties TEXT[] DEFAULT '{}',
    expertise_tags TEXT[] DEFAULT '{}',
    qualifications TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    registration_number TEXT,
    license_number TEXT,
    certification_document_url TEXT,
    experience_years INTEGER DEFAULT 0,
    session_modes TEXT[] DEFAULT '{video,chat,in_person}',
    languages TEXT[] DEFAULT '{}',
    bio TEXT,
    session_fee DECIMAL(10, 2) DEFAULT 0,
    video_session_fee DECIMAL(10, 2) DEFAULT 0,
    monthly_plan_fee DECIMAL(10, 2) DEFAULT 0,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    profile_image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    available_days TEXT[] DEFAULT '{}',
    available_hours JSONB DEFAULT '{}',
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rejection_reason TEXT,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_clients INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_coaches_user ON wellness_coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_wellness_coaches_approval ON wellness_coaches(approval_status, is_active);
CREATE INDEX IF NOT EXISTS idx_wellness_coaches_city ON wellness_coaches(city);
CREATE INDEX IF NOT EXISTS idx_wellness_coaches_tags ON wellness_coaches USING GIN(expertise_tags);

CREATE TABLE IF NOT EXISTS fitness_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    primary_goal TEXT,
    goals TEXT[] DEFAULT '{}',
    activity_level TEXT,
    fitness_experience TEXT,
    available_equipment TEXT[] DEFAULT '{}',
    available_minutes_per_day INTEGER,
    preferred_workout_days TEXT[] DEFAULT '{}',
    workout_location TEXT DEFAULT 'home',
    food_preferences TEXT[] DEFAULT '{}',
    diet_type TEXT,
    language_preferences TEXT[] DEFAULT '{}',
    injury_flags TEXT[] DEFAULT '{}',
    pain_areas TEXT[] DEFAULT '{}',
    pregnancy_status TEXT,
    chronic_conditions TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    risk_answers JSONB DEFAULT '{}',
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high')),
    recommended_path TEXT DEFAULT 'self_guided',
    recommendation_reason TEXT,
    data_sharing_preferences JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wearable_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    source TEXT DEFAULT 'health_connect',
    steps INTEGER DEFAULT 0 CHECK (steps >= 0 AND steps <= 100000),
    distance_meters DECIMAL(10, 2) DEFAULT 0,
    active_calories DECIMAL(10, 2) DEFAULT 0,
    total_calories DECIMAL(10, 2) DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    exercise_minutes INTEGER DEFAULT 0,
    workouts_count INTEGER DEFAULT 0,
    heart_rate_avg DECIMAL(5, 2),
    heart_rate_min INTEGER,
    heart_rate_max INTEGER,
    sleep_minutes INTEGER,
    sleep_score INTEGER,
    body_weight_kg DECIMAL(5, 2),
    body_fat_percent DECIMAL(5, 2),
    metadata JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, summary_date, source)
);

CREATE INDEX IF NOT EXISTS idx_wearable_summaries_patient_date
ON wearable_daily_summaries(patient_id, summary_date DESC);

CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    created_by_coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    plan_type TEXT DEFAULT 'strength',
    goal TEXT,
    level TEXT DEFAULT 'beginner',
    location_type TEXT DEFAULT 'home',
    duration_weeks INTEGER DEFAULT 4,
    days_per_week INTEGER DEFAULT 3,
    minutes_per_session INTEGER DEFAULT 30,
    intensity TEXT DEFAULT 'moderate',
    equipment TEXT[] DEFAULT '{}',
    body_parts TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'en',
    safety_notes TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_index INTEGER DEFAULT 1,
    week_index INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'workout',
    duration_minutes INTEGER DEFAULT 30,
    intensity TEXT DEFAULT 'moderate',
    body_parts TEXT[] DEFAULT '{}',
    warmup JSONB DEFAULT '[]',
    exercises JSONB DEFAULT '[]',
    cooldown JSONB DEFAULT '[]',
    instructions TEXT,
    media_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    workout_type TEXT,
    primary_muscle_group TEXT,
    secondary_muscle_groups TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    level TEXT,
    instructions TEXT[] DEFAULT '{}',
    safety_notes TEXT[] DEFAULT '{}',
    animation_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    asset_source_url TEXT,
    asset_license TEXT,
    asset_credit TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_type ON exercise_library(workout_type, level);
CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle ON exercise_library(primary_muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment ON exercise_library USING GIN(equipment);

CREATE TABLE IF NOT EXISTS patient_workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    next_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
    adherence_percent DECIMAL(5, 2) DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    adaptive_state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_workout_one_active_plan
ON patient_workout_plans(patient_id, plan_id)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    calories_burned DECIMAL(10, 2),
    perceived_intensity TEXT,
    feedback TEXT,
    pain_reported BOOLEAN DEFAULT FALSE,
    exercises JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_patient_date
ON workout_logs(patient_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS fitness_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    center_type TEXT DEFAULT 'gym',
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    photos TEXT[] DEFAULT '{}',
    facilities TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    is_women_only BOOLEAN DEFAULT FALSE,
    is_beginner_friendly BOOLEAN DEFAULT TRUE,
    is_24_hours BOOLEAN DEFAULT FALSE,
    parking_available BOOLEAN DEFAULT FALSE,
    accessibility_features TEXT[] DEFAULT '{}',
    trainer_available BOOLEAN DEFAULT TRUE,
    membership_plans JSONB DEFAULT '[]',
    day_pass_price DECIMAL(10, 2) DEFAULT 0,
    trial_class_price DECIMAL(10, 2) DEFAULT 0,
    safety_information JSONB DEFAULT '{}',
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    is_approved BOOLEAN DEFAULT FALSE,
    approval_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_centers_location ON fitness_centers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fitness_centers_city ON fitness_centers(city);
CREATE INDEX IF NOT EXISTS idx_fitness_centers_approval ON fitness_centers(approval_status, is_active);

CREATE TABLE IF NOT EXISTS fitness_center_trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES fitness_centers(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'trainer',
    schedule JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, coach_id)
);

CREATE TABLE IF NOT EXISTS fitness_center_trainer_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES fitness_centers(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_token TEXT NOT NULL UNIQUE,
    invited_email TEXT,
    invited_phone TEXT,
    invited_name TEXT,
    role TEXT DEFAULT 'trainer',
    coach_types TEXT[] DEFAULT '{}',
    specialties TEXT[] DEFAULT '{}',
    schedule JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'expired', 'cancelled'
    )),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    responded_at TIMESTAMPTZ,
    accepted_by_coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_center_trainer_invites_center_status
ON fitness_center_trainer_invites(center_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_center_trainer_invites_coach_status
ON fitness_center_trainer_invites(coach_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_center_trainer_invites_email_status
ON fitness_center_trainer_invites(invited_email, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fitness_center_pending_coach_invite
ON fitness_center_trainer_invites(center_id, coach_id)
WHERE status = 'pending' AND coach_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS fitness_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID REFERENCES fitness_centers(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    class_type TEXT DEFAULT 'strength',
    level TEXT DEFAULT 'beginner',
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    capacity INTEGER DEFAULT 10,
    booked_count INTEGER DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0,
    waitlist_enabled BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitness_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    center_id UUID REFERENCES fitness_centers(id) ON DELETE SET NULL,
    class_id UUID REFERENCES fitness_classes(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    booking_type TEXT DEFAULT 'class' CHECK (booking_type IN (
        'class', 'day_pass', 'trial_class', 'membership', 'personal_training'
    )),
    status TEXT DEFAULT 'booked' CHECK (status IN (
        'booked', 'waitlisted', 'cancelled', 'completed', 'no_show'
    )),
    amount DECIMAL(10, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded'
    )),
    booking_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitness_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    center_id UUID REFERENCES fitness_centers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES fitness_bookings(id) ON DELETE SET NULL,
    qr_token TEXT,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS wellness_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_number TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    center_id UUID REFERENCES fitness_centers(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    session_type TEXT DEFAULT 'video' CHECK (session_type IN (
        'video', 'audio', 'chat', 'in_person', 'gym_personal_training'
    )),
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'no_show', 'rescheduled'
    )),
    fee DECIMAL(10, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'refunded', 'failed'
    )),
    room_id TEXT,
    patient_notes TEXT,
    coach_notes TEXT,
    safety_flags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_sessions_patient ON wellness_sessions(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_sessions_coach ON wellness_sessions(coach_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS wellness_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    goal_tag TEXT,
    city TEXT,
    language TEXT DEFAULT 'en',
    is_public BOOLEAN DEFAULT TRUE,
    moderation_status TEXT DEFAULT 'active' CHECK (moderation_status IN ('active', 'paused', 'closed')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES wellness_groups(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked', 'left')),
    UNIQUE(group_id, patient_id)
);

CREATE TABLE IF NOT EXISTS wellness_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES wellness_groups(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    challenge_type TEXT DEFAULT 'steps',
    metric TEXT DEFAULT 'steps',
    target_value DECIMAL(12, 2),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by_coach_id UUID REFERENCES wellness_coaches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_challenge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES wellness_challenges(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    progress_value DECIMAL(12, 2) DEFAULT 0,
    rank INTEGER,
    completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, patient_id)
);

CREATE TABLE IF NOT EXISTS wellness_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_wellness_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES wellness_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(patient_id, badge_id)
);

CREATE TABLE IF NOT EXISTS trusted_supplement_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'supplement',
    description TEXT,
    ingredients TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    nutrition_facts JSONB DEFAULT '{}',
    usage_instructions TEXT,
    fssai_license TEXT,
    batch_number TEXT,
    manufacturing_date DATE,
    expiry_date DATE,
    authenticity_qr_url TEXT,
    suitability_rules JSONB DEFAULT '{}',
    unsupported_claims TEXT[] DEFAULT '{}',
    seller_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    image_url TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    mrp DECIMAL(10, 2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_suitability_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES trusted_supplement_products(id) ON DELETE CASCADE,
    verdict TEXT DEFAULT 'review' CHECK (verdict IN ('suitable', 'caution', 'avoid', 'review')),
    reasons TEXT[] DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ai_wellness_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source_metrics JSONB DEFAULT '{}',
    recommended_action TEXT,
    escalated_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'wellness_coaches', 'fitness_profiles', 'wearable_daily_summaries',
      'workout_plans', 'workout_sessions', 'exercise_library', 'patient_workout_plans', 'fitness_centers',
      'fitness_center_trainer_invites', 'fitness_classes', 'fitness_bookings', 'wellness_sessions',
      'wellness_groups', 'wellness_challenges', 'trusted_supplement_products'
    ]
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', table_name, table_name);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        table_name,
        table_name
      );
    END LOOP;
  END IF;
END $$;

INSERT INTO workout_plans (
    slug, title, description, plan_type, goal, level, location_type,
    duration_weeks, days_per_week, minutes_per_session, intensity,
    equipment, body_parts, safety_notes
) VALUES
(
    'beginner-home-strength-4w',
    'Beginner Home Strength',
    'A simple four-week strength plan for users starting from home.',
    'strength', 'general_fitness', 'beginner', 'home',
    4, 3, 30, 'moderate',
    ARRAY['bodyweight', 'mat'],
    ARRAY['full_body'],
    ARRAY['Stop if sharp pain, dizziness, chest pain, or unusual breathlessness occurs.']
),
(
    'mobility-yoga-stress-reset',
    'Mobility & Yoga Reset',
    'Gentle mobility, breathwork, and yoga sessions for stress reduction and recovery.',
    'yoga', 'stress_reduction', 'beginner', 'home',
    4, 4, 25, 'low',
    ARRAY['mat'],
    ARRAY['hips', 'back', 'shoulders'],
    ARRAY['Avoid deep holds during injury, pregnancy, or acute pain unless cleared by a professional.']
),
(
    'walking-fat-loss-foundation',
    'Walking Fat Loss Foundation',
    'Progressive walking and low-impact conditioning for sustainable activity habits.',
    'walking', 'weight_loss', 'beginner', 'outdoor',
    6, 5, 35, 'moderate',
    ARRAY['walking_shoes'],
    ARRAY['cardio', 'legs'],
    ARRAY['Choose safe routes and pause for chest pain, faintness, or severe shortness of breath.']
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO wellness_groups (slug, name, description, goal_tag, language, is_public) VALUES
('weight-loss-warriors', 'Weight Loss Warriors', 'Goal-based support for sustainable fat loss habits.', 'weight_loss', 'en', true),
('beginner-fitness-india', 'Beginner Fitness India', 'A beginner-friendly community for daily movement, nutrition, and consistency.', 'beginner', 'en', true),
('yoga-mobility-circle', 'Yoga & Mobility Circle', 'Gentle yoga, mobility, breathwork, and recovery support.', 'yoga', 'en', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO wellness_badges (code, name, description, icon, criteria) VALUES
('first_workout', 'First Workout', 'Completed the first logged workout.', 'dumbbell', '{"workouts_completed":1}'),
('seven_day_streak', '7 Day Streak', 'Stayed active for seven days.', 'flame', '{"streak_days":7}'),
('hydration_champ', 'Hydration Champ', 'Hit hydration target for a week.', 'droplet', '{"hydration_days":7}')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    criteria = EXCLUDED.criteria;
