const firstResponderService = require('../services/firstResponderService');
const { supabaseAdmin } = require('../config/supabase');

(async () => {
  console.log('🧪 RUNNING SWASTIK FIRST-RESPONDER NETWORK END-TO-END TEST...\n');

  try {
    // 1. Get or pick an existing test user from DB
    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .limit(2);

    if (uErr || !users || users.length === 0) {
      console.log('⚠️ No users found in database for testing, skipping DB insert test');
      return;
    }

    const testUserId = users[0].id;
    console.log(`👤 Using Test User: ${users[0].name} (${testUserId})`);

    // 2. Register as a First Responder
    console.log('\n[Test 1] Registering First Responder...');
    const responder = await firstResponderService.registerResponder(testUserId, {
      tier: 'DOCTOR',
      skills: ['CPR', 'AED', 'BLEEDING_CONTROL', 'AIRWAY_MANAGEMENT'],
      registrationNo: 'MCI-DEL-2024-8841',
      councilName: 'Delhi Medical Council',
      isOnDuty: true,
      latitude: 28.6139,
      longitude: 77.2090
    });
    console.log(`✅ Responder Registered: ID=${responder.id}, Tier=${responder.tier}, is_on_duty=${responder.is_on_duty}`);

    // 3. Get Responder Profile
    console.log('\n[Test 2] Fetching Responder Profile...');
    const profile = await firstResponderService.getResponderProfile(testUserId);
    console.log(`✅ Profile retrieved: ${profile.user?.name}, Skills: [${profile.skills.join(', ')}]`);

    // 4. Update Duty Status & Location Ping
    console.log('\n[Test 3] Updating Location Ping...');
    const pinged = await firstResponderService.updateLocation(testUserId, 28.6142, 77.2093);
    console.log(`✅ Location Pinged: Lat=${pinged.latitude}, Lng=${pinged.longitude}`);

    // 5. Broadcast an Emergency (Simulate Vehicle Crash 400m away)
    console.log('\n[Test 4] Broadcasting Emergency (Crash Detected at 28.6160, 77.2110)...');
    const broadcastResult = await firstResponderService.broadcastEmergency({
      incidentType: 'CRASH_DETECTED',
      latitude: 28.6160,
      longitude: 77.2110,
      addressText: 'Ring Road near Moolchand Flyover',
      triageLevel: 'RED',
      radiusMeters: 2000,
      vitalsSnapshot: { heartRate: 110, condition: 'Critical / Unconscious' }
    }, testUserId);

    console.log(`✅ Broadcast Created: ID=${broadcastResult.broadcast.id}, Incident=${broadcastResult.broadcast.incident_type}`);
    console.log(`📡 Notified Responders Count: ${broadcastResult.notifiedCount}`);
    if (broadcastResult.nearbyResponders.length > 0) {
      console.log(`📍 Nearest Hero: ${broadcastResult.nearbyResponders[0].name} (${broadcastResult.nearbyResponders[0].distanceMeters}m away, ETA: ${broadcastResult.nearbyResponders[0].etaSeconds}s)`);
    }

    // 6. Accept Emergency
    console.log('\n[Test 5] Responder Accepts Emergency Broadcast...');
    const accepted = await firstResponderService.acceptEmergency(broadcastResult.broadcast.id, testUserId);
    console.log(`✅ Emergency Accepted! Broadcast Status: ${accepted.broadcast.status}`);

    // 7. On-Scene Arrival
    console.log('\n[Test 6] Responder Marks Arrived On-Scene...');
    const arrived = await firstResponderService.updateAssignmentStatus(
      broadcastResult.broadcast.id,
      testUserId,
      'ARRIVED',
      'Arrived at scene. Administering CPR and tourniquet to left leg.'
    );
    console.log(`✅ Status Updated: ${arrived.status}, Notes: "${arrived.notes}"`);

    // 8. Dispatch Verified Ambulance & Pre-Alert ER Hospital
    console.log('\n[Test 7] On-Scene Responder Dispatches Verified Ambulance with RED Triage...');
    const ambResult = await firstResponderService.dispatchAmbulance(
      broadcastResult.broadcast.id,
      testUserId,
      'RED',
      'Severe trauma, uncontrolled femoral bleed controlled via tourniquet. Immediate ALS ambulance required.'
    );
    console.log(`✅ Verified Ambulance Dispatched: Request ID=${ambResult.emergencyRequest.id}, Condition=${ambResult.emergencyRequest.patient_condition}`);

    console.log('\n🌟 ALL 7 FIRST-RESPONDER EMERGENCY NETWORK TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message, err);
  }
})();
