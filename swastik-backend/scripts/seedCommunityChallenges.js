require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabaseAdmin } = require('../config/supabase');

async function seedCommunityAndChallenges() {
  console.log('🚀 Seeding Swastik Community, Challenges & Badges Ecosystem...');

  // 1. Seed Badges Catalog
  const BADGES = [
    { code: 'first_workout', name: 'First Workout Champ', description: 'Completed your very first logged workout session.', icon: 'dumbbell', criteria: { workouts_completed: 1 } },
    { code: 'seven_day_streak', name: '7-Day Flame Streak', description: 'Maintained uninterrupted daily physical activity for 7 consecutive days.', icon: 'flame', criteria: { streak_days: 7 } },
    { code: 'ten_k_steps_7d', name: '10K Steps Master', description: 'Walked over 10,000 steps daily for 7 days in a row.', icon: 'shoe', criteria: { daily_steps: 10000, days: 7 } },
    { code: 'hydration_champ', name: 'Hydration Hero', description: 'Achieved optimal 3-litre water intake for 7 days.', icon: 'droplet', criteria: { hydration_days: 7 } },
    { code: 'yoga_master', name: 'Zen Yoga Master', description: 'Completed 20 guided morning yoga and flexibility sessions.', icon: 'lotus', criteria: { yoga_sessions: 20 } },
    { code: 'century_walker_50k', name: '50K Steps Club', description: 'Logged over 50,000 cumulative steps in fitness challenges.', icon: 'medal', criteria: { total_steps: 50000 } },
    { code: 'weekend_warrior', name: 'Weekend Warrior', description: 'Crushed high-intensity workouts on Saturday and Sunday.', icon: 'shield', criteria: { weekend_workouts: 2 } },
    { code: 'iron_consistency', name: 'Iron Discipline 30D', description: 'Stayed active and logged wellness metrics for 30 days straight.', icon: 'crown', criteria: { streak_days: 30 } }
  ];

  for (const badge of BADGES) {
    const { error } = await supabaseAdmin
      .from('wellness_badges')
      .upsert(badge, { onConflict: 'code' });
    if (error) console.error(`Badge ${badge.code}:`, error.message);
  }
  console.log(`✅ Seeded ${BADGES.length} wellness badges`);

  // 2. Seed Community Groups
  const GROUPS = [
    {
      slug: 'weight-loss-warriors',
      name: 'Weight Loss Warriors',
      description: 'Goal-based support, daily nutrition accountability, and sustainable fat loss habits.',
      goal_tag: 'weight_loss',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    },
    {
      slug: 'beginner-fitness-india',
      name: 'Beginner Fitness India',
      description: 'A beginner-friendly community for zero-intimidation home workouts, daily movement, and consistency.',
      goal_tag: 'beginner',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    },
    {
      slug: 'yoga-mobility-circle',
      name: 'Yoga & Mobility Circle',
      description: 'Gentle morning yoga, spinal mobility, breathwork (Pranayama), and recovery support.',
      goal_tag: 'yoga',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    },
    {
      slug: 'pcos-hormone-balance',
      name: 'PCOS & Hormonal Balance',
      description: 'Doctor-guided nutrition, low-cortisol workouts, and lifestyle support for women with PCOS/PCOD.',
      goal_tag: 'pcos',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    },
    {
      slug: 'strength-muscle-lab',
      name: 'Strength & Muscle Lab',
      description: 'Progressive overload, hypertrophy science, protein targets, and gym form correction.',
      goal_tag: 'strength',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    },
    {
      slug: 'senior-health-longevity',
      name: 'Senior Health & Longevity',
      description: 'Joint-friendly chair yoga, balance training, cardiac walking, and longevity nutrition.',
      goal_tag: 'senior',
      city: 'All India',
      language: 'en',
      is_public: true,
      moderation_status: 'active'
    }
  ];

  const groupMap = new Map();
  for (const group of GROUPS) {
    const { data, error } = await supabaseAdmin
      .from('wellness_groups')
      .upsert(group, { onConflict: 'slug' })
      .select('id, slug')
      .single();
    if (error) console.error(`Group ${group.slug}:`, error.message);
    else if (data) groupMap.set(data.slug, data.id);
  }
  console.log(`✅ Seeded ${GROUPS.length} community groups`);

  // 3. Seed Live Challenges
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const nextMonth = new Date(now.getTime() + 21 * 86400000);
  const weekendEnd = new Date(now.getTime() + 3 * 86400000);

  const CHALLENGES = [
    {
      title: 'Monsoon 10,000 Daily Steps Sprint',
      challenge_type: 'steps',
      metric: 'steps',
      target_value: 70000,
      starts_at: now.toISOString(),
      ends_at: nextWeek.toISOString(),
      is_active: true,
      group_id: groupMap.get('beginner-fitness-india') || null
    },
    {
      title: '21-Day Morning Yoga & Mobility Challenge',
      challenge_type: 'yoga',
      metric: 'workouts',
      target_value: 21,
      starts_at: now.toISOString(),
      ends_at: nextMonth.toISOString(),
      is_active: true,
      group_id: groupMap.get('yoga-mobility-circle') || null
    },
    {
      title: 'Weekend High-Intensity Cardio Blitz',
      challenge_type: 'cardio',
      metric: 'active_minutes',
      target_value: 180,
      starts_at: now.toISOString(),
      ends_at: weekendEnd.toISOString(),
      is_active: true,
      group_id: groupMap.get('strength-muscle-lab') || null
    },
    {
      title: '7-Day Hydration & Cellular Detox',
      challenge_type: 'hydration',
      metric: 'steps',
      target_value: 50000,
      starts_at: now.toISOString(),
      ends_at: nextWeek.toISOString(),
      is_active: true,
      group_id: groupMap.get('weight-loss-warriors') || null
    }
  ];

  const challengeIds = [];
  for (const ch of CHALLENGES) {
    const { data: existing } = await supabaseAdmin
      .from('wellness_challenges')
      .select('id')
      .eq('title', ch.title)
      .maybeSingle();

    if (existing) {
      challengeIds.push(existing.id);
      await supabaseAdmin.from('wellness_challenges').update(ch).eq('id', existing.id);
    } else {
      const { data, error } = await supabaseAdmin
        .from('wellness_challenges')
        .insert(ch)
        .select('id')
        .single();
      if (error) console.error(`Challenge ${ch.title}:`, error.message);
      else if (data) challengeIds.push(data.id);
    }
  }
  console.log(`✅ Seeded ${CHALLENGES.length} active wellness challenges`);

  // 4. Seed Sample Leaderboard Entries for the Steps Challenge
  if (challengeIds.length > 0) {
    const stepChallengeId = challengeIds[0];
    const { data: samplePatients } = await supabaseAdmin
      .from('patients')
      .select('id, name')
      .limit(10);

    if (samplePatients && samplePatients.length > 0) {
      const scores = [64500, 58200, 51000, 47800, 42300, 39100, 34500, 29000, 22400, 18000];
      for (let i = 0; i < samplePatients.length; i++) {
        const patient = samplePatients[i];
        const score = scores[i] || 15000;
        await supabaseAdmin
          .from('wellness_challenge_entries')
          .upsert({
            challenge_id: stepChallengeId,
            patient_id: patient.id,
            progress_value: score,
            rank: i + 1,
            completed_at: score >= 70000 ? now.toISOString() : null,
            last_updated_at: now.toISOString()
          }, { onConflict: 'challenge_id,patient_id' });
      }
      console.log(`✅ Seeded ${samplePatients.length} leaderboard participants for Steps Challenge`);
    }
  }

  console.log('🎉 Community, Challenges and Gamification seeding completed successfully!');
}

seedCommunityAndChallenges()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
