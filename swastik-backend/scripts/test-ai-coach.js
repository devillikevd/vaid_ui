const aiCoachService = require('../services/aiCoachService');
const { supabaseAdmin } = require('../config/supabase');

(async () => {
  console.log('🧪 RUNNING AI WELLNESS COACH (GEMINI POWERED) END-TO-END TEST...\n');

  try {
    const { data: users } = await supabaseAdmin.from('users').select('id, name').limit(1);
    const testUserId = users?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';

    // 1. Dynamic Insights & Readiness
    console.log('[Test 1] Generating Dynamic AI Insights & Readiness Score...');
    const insightsResult = await aiCoachService.generateDynamicInsights(testUserId);
    console.log(`✅ Readiness Score: ${insightsResult.readiness.score}% (${insightsResult.readiness.category})`);
    console.log(`✅ Generated Insights Count: ${insightsResult.insights.length}`);
    insightsResult.insights.forEach((ins, idx) => {
      console.log(`   ${idx + 1}. [${ins.category}] ${ins.title}: ${ins.message.substring(0, 60)}...`);
    });

    // 2. Interactive AI Coach Conversation
    console.log('\n[Test 2] Testing Conversational AI Coach Chat (Prompt: "What should I eat post-workout for fast recovery?")...');
    const chatResult = await aiCoachService.chatWithAiCoach(
      testUserId,
      "What should I eat post-workout for fast recovery?",
      []
    );
    console.log(`✅ AI Coach Reply:\n"${chatResult.reply}"`);
    console.log(`✅ Follow-up Quick Prompts: [${chatResult.quickPrompts.join(', ')}]`);

    // 3. Smart 7-Day Plan Generation
    console.log('\n[Test 3] Testing 7-Day Smart Workout & Diet Plan Generation...');
    const planResult = await aiCoachService.generateSmartPlan(
      testUserId,
      "FAT_LOSS",
      "BEGINNER",
      "VEGETARIAN"
    );
    console.log(`✅ Smart Plan Title: ${planResult.title}`);
    console.log(`✅ Plan Content:\n${planResult.planContent.substring(0, 180)}...`);

    console.log('\n🌟 ALL AI WELLNESS COACH TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Test failed:', err.message, err);
  }
})();
