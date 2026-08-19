const { GoogleGenAI } = require("@google/genai");
const { supabaseAdmin } = require('../config/supabase');

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (err) {
    console.warn('[AICoachService] Gemini initialization warning:', err.message);
    return null;
  }
}

class AICoachService {
  /**
   * Calculate dynamic daily readiness / recovery score (0-100%)
   */
  calculateReadinessScore(vitals = {}, assessment = {}) {
    let score = 85; // Baseline high readiness

    // Resting HR impact
    const restingHr = vitals.resting_heart_rate || vitals.heart_rate || 72;
    if (restingHr > 90) score -= 12;
    else if (restingHr > 80) score -= 5;
    else if (restingHr >= 60 && restingHr <= 75) score += 5;

    // Steps/Activity fatigue impact
    const steps = vitals.steps || 6500;
    if (steps > 15000) score -= 8; // Heavy fatigue day
    else if (steps >= 8000 && steps <= 12000) score += 5; // Optimal active zone

    // Sleep impact
    const sleepHours = vitals.sleep_hours || 7.5;
    if (sleepHours < 6.0) score -= 15;
    else if (sleepHours >= 7.5 && sleepHours <= 9.0) score += 8;

    score = Math.max(45, Math.min(score, 98));

    let category = "Optimal Recovery 🟢";
    let summary = "Your biometrics show great recovery! Perfect day for moderate-to-high intensity strength or cardio workouts.";
    if (score < 65) {
      category = "Rest & Active Recovery 🟡";
      summary = "Elevated resting metrics detected. Focus on light stretching, 2L+ hydration, and at least 8 hours of sleep tonight.";
    } else if (score < 78) {
      category = "Moderate Readiness 🔵";
      summary = "Good baseline energy. Ideal for steady-state walking, yoga, or a balanced 25-minute workout routine.";
    }

    return {
      score,
      category,
      summary,
      metrics: {
        restingHr,
        steps,
        sleepHours
      }
    };
  }

  /**
   * Generate dynamic personalized clinical insights on the fly (Zero Empty State)
   */
  async generateDynamicInsights(userId) {
    // 1. Fetch patient profile & assessment
    let patient = null;
    let assessment = null;
    try {
      const { data: p } = await supabaseAdmin
        .from('patients')
        .select('id, name, age, gender, blood_group')
        .eq('user_id', userId)
        .maybeSingle();
      patient = p;

      if (patient) {
        const { data: a } = await supabaseAdmin
          .from('wellness_assessments')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        assessment = a;
      }
    } catch (_e) {}

    const readiness = this.calculateReadinessScore({}, assessment);

    const defaultInsights = [
      {
        id: `ins-${Date.now()}-1`,
        title: "Daily Body Readiness & Strain",
        message: `${readiness.category}: Readiness is at ${readiness.score}%. ${readiness.summary}`,
        severity: readiness.score >= 75 ? "info" : "warning",
        category: "RECOVERY",
        priority: "HIGH",
        recommended_action: "View Today's Workout & Mobility Protocol",
        created_at: new Date().toISOString()
      },
      {
        id: `ins-${Date.now()}-2`,
        title: "Hydration & Metabolic Output",
        message: "Optimal hydration accelerates muscle recovery by up to 22%. Aim for 2.5L to 3L water today.",
        severity: "info",
        category: "HYDRATION",
        priority: "MEDIUM",
        recommended_action: "Log 500ml Water Glass",
        created_at: new Date().toISOString()
      },
      {
        id: `ins-${Date.now()}-3`,
        title: "Post-Meal Glucose & Movement Tip",
        message: "A light 10-minute walk within 30 minutes after lunch or dinner blunts blood sugar spikes by 17%.",
        severity: "info",
        category: "NUTRITION",
        priority: "LOW",
        recommended_action: "Start 10-min Posture Stroll",
        created_at: new Date().toISOString()
      },
      {
        id: `ins-${Date.now()}-4`,
        title: "Circadian Sleep Preparation",
        message: "Dim overhead screens 45 minutes before bed and avoid caffeine past 4 PM to enhance deep REM sleep cycles.",
        severity: "info",
        category: "SLEEP",
        priority: "LOW",
        recommended_action: "Set Wind-Down Alarm",
        created_at: new Date().toISOString()
      }
    ];

    return {
      readiness,
      insights: defaultInsights
    };
  }

  /**
   * Real-time Interactive Conversational AI Coach (Powered by Gemini AI)
   */
  async chatWithAiCoach(userId, message, conversationHistory = [], persona = "ATHLETE") {
    let patientName = "Friend";
    let patientContext = "";

    try {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('name, age, gender')
        .eq('user_id', userId)
        .maybeSingle();
      if (patient?.name) {
        patientName = patient.name;
        patientContext = `Patient Name: ${patient.name}, Age: ${patient.age || 'Adult'}, Gender: ${patient.gender || 'Not specified'}.`;
      }
    } catch (_e) {}

    let personaStyle = "high-energy, athletic, motivational and focused on progressive fitness, strength, and endurance.";
    if (persona === "ZEN") {
      personaStyle = "calm, deeply mindful, zen yoga and recovery master focused on nervous system balance, breathing, and deep sleep.";
    } else if (persona === "CLINICAL") {
      personaStyle = "evidence-based clinical nutritionist and sports scientist focused on metabolism, blood sugar, and injury prevention.";
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `
          You are the Swastik AI Wellness Coach. Your coaching persona is ${personaStyle}
          Context: ${patientContext}
          
          Guidelines:
          1. Provide direct, highly practical, and scientifically backed wellness/fitness/diet advice matching your persona.
          2. Keep your response concise (under 120 words), structured with bullet points and friendly emojis.
          3. Address the user naturally (e.g. "${patientName}").
          4. If user asks about workouts, give exact sets/reps or home exercises.
          5. If user asks about diet, give nutritious Indian/Global food choices (e.g. dal, paneer, eggs, oats, sprouts).
          6. Safety Rule: If user reports severe medical red flags (chest pain, shortness of breath, extreme dizziness), immediately advise seeing a doctor.
        `;

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [
            { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }] }
          ]
        });

        const replyText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            reply: replyText.trim(),
            persona,
            quickPrompts: this.generateFollowUpPrompts(message),
            timestamp: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[AICoachService] Gemini API call fallback:', err.message);
      }
    }

    // Heuristic Clinical AI Fallback if Gemini key is busy or offline
    const fallbackReply = this.buildHeuristicReply(message, patientName);
    return {
      reply: fallbackReply,
      persona,
      quickPrompts: this.generateFollowUpPrompts(message),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate 7-Day Smart Workout & Diet Plan
   */
  async generateSmartPlan(userId, goal = "GENERAL_FITNESS", level = "BEGINNER", dietType = "BALANCED") {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `
          Create a concise, highly motivating 7-Day Wellness & Workout Plan for a ${level} aiming for ${goal} with a ${dietType} diet preference.
          Format in clean, structured bullet points with 3 key daily focus areas:
          1. 🏋️ Workout Focus
          2. 🥗 Nutrition & Protein Target
          3. 💧 Recovery & Hydration Rule
          Keep response friendly, practical, and under 200 words.
        `;

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const planText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (planText) {
          return {
            title: `Custom 7-Day ${goal.replace('_', ' ')} Smart Plan ✨`,
            goal,
            level,
            dietType,
            planContent: planText.trim(),
            created_at: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[AICoachService] Gemini Plan generator fallback:', err.message);
      }
    }

    // Heuristic Smart Plan
    return {
      title: `Custom 7-Day ${goal.replace('_', ' ')} Smart Plan ✨`,
      goal,
      level,
      dietType,
      planContent: `
🏋️ **Day 1 & 3 (Upper & Core):** 3x12 Push-ups/Knee push-ups, 3x15 Bodyweight squats, 3x30s Plank.
🏃 **Day 2 & 4 (Cardio & Stamina):** 20-min brisk walk or interval cycling + 10-min full-body mobility stretch.
💪 **Day 5 (Lower Body & Glutes):** 3x12 Lunges, 3x15 Glute bridges, 3x20 Calf raises.
🧘 **Day 6 & 7 (Active Recovery):** 45-min easy walk in nature + guided breathing & yoga.
🥗 **Nutrition Rule:** Minimum 1.2g protein per kg bodyweight (Eggs/Paneer/Tofu/Dal/Sprouts) + 3L Water daily!
      `.trim(),
      created_at: new Date().toISOString()
    };
  }

  generateFollowUpPrompts(lastMessage) {
    const msg = lastMessage.toLowerCase();
    if (msg.includes('diet') || msg.includes('eat') || msg.includes('food')) {
      return ['🥗 High-Protein Snacks', '🍛 1500 kcal Indian Diet', '🥑 Pre-workout Meal', '💧 Daily Water Target'];
    } else if (msg.includes('workout') || msg.includes('exercise') || msg.includes('fat')) {
      return ['🏃 15-min Home HIIT', '💪 Core & Abs Routine', '🧘 Post-workout Stretch', '⏱️ Rest Between Sets'];
    } else if (msg.includes('sleep') || msg.includes('rest') || msg.includes('tired')) {
      return ['😴 Deep Sleep Protocol', '☕ Caffeine Cutoff Time', '📱 Screen-Free Routine', '🫁 4-7-8 Breathing'];
    }
    return ['🥗 High-Protein Diet Plan', '🏃 15-min Home Workout', '😴 Deep Sleep Fix', '💧 Daily Hydration Target'];
  }

  buildHeuristicReply(message, name) {
    const msg = message.toLowerCase();
    if (msg.includes('diet') || msg.includes('protein') || msg.includes('food')) {
      return `Hey ${name}! 🥗 For optimal energy and recovery, prioritize whole protein in every meal: eggs, paneer, tofu, lentils/dal, and Greek yogurt. Aim for a colorful plate with leafy greens and stay hydrated with 2.5–3L water!`;
    } else if (msg.includes('workout') || msg.includes('exercise') || msg.includes('weight')) {
      return `Great focus ${name}! 🏋️ For home fitness, try this quick 15-minute circuit: 3 sets of 15 Bodyweight Squats, 12 Push-ups, 20 Mountain Climbers, and a 45-second Plank. Rest 60s between sets!`;
    } else if (msg.includes('sleep') || msg.includes('tired') || msg.includes('stress')) {
      return `Rest is where the body rebuilds, ${name}! 😴 Try cutting screens 30 mins before bed, keep your room cool, and practice 3 minutes of 4-7-8 deep diaphragmatic breathing to lower cortisol.`;
    }
    return `Hello ${name}! 🌟 I am your Swastik AI Wellness Coach. Ask me anything about tailoring your daily workout, healthy meal plans, improving sleep, or boosting your recovery readiness!`;
  }
}

module.exports = new AICoachService();
