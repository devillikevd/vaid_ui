#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { io } = require('socket.io-client');
const { randomUUID } = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const API_BASE = process.env.SMOKE_API_BASE || 'http://127.0.0.1:5001/api';
const SOCKET_URL = process.env.SMOKE_SOCKET_URL || 'http://127.0.0.1:5001';
const PASSWORD = 'SmokePass123';

const MUMBAI = {
  latitude: 19.1158835,
  longitude: 72.854202,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Non-JSON response for ${path}: ${text}`);
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${json.message || response.status}`);
  }
  return json;
};

const authHeaders = (token) => ({
  authorization: `Bearer ${token}`,
});

const createUser = async ({ email, role, name, phone }) => {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      phone,
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
      is_verified: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const createPatient = async ({ userId, name }) => {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert({
      user_id: userId,
      name,
      address: 'Smoke Patient Address',
      city: 'Mumbai',
      state: 'Maharashtra',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const createHospital = async ({ userId, name }) => {
  const { data, error } = await supabaseAdmin
    .from('hospitals')
    .insert({
      owner_id: userId,
      name,
      address: 'Smoke Hospital Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      phone: '+919999999901',
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@smoke.local`,
      latitude: MUMBAI.latitude,
      longitude: MUMBAI.longitude,
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      is_emergency_available: true,
      ambulance_available: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const createOperator = async ({ userId, name }) => {
  const { data, error } = await supabaseAdmin
    .from('ambulance_operators')
    .insert({
      user_id: userId,
      name,
      company_name: name,
      registration_number: `SMOKE-OP-${Date.now()}`,
      address: 'Smoke Operator Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      phone: '+919999999902',
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@smoke.local`,
      is_active: true,
      is_approved: true,
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      available_vehicles: 1,
      total_vehicles: 1,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const createAmbulance = async ({ operatorId }) => {
  const { data, error } = await supabaseAdmin
    .from('ambulances')
    .insert({
      operator_id: operatorId,
      vehicle_number: `SMOKE-${Date.now().toString().slice(-6)}`,
      vehicle_type: 'advanced',
      status: 'available',
      is_active: true,
      is_available: true,
      current_latitude: MUMBAI.latitude + 0.002,
      current_longitude: MUMBAI.longitude + 0.002,
      last_location_update: new Date().toISOString(),
      driver_name: 'Smoke Driver',
      driver_phone: '+919999999903',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const login = async ({ email, role }) => {
  const json = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: PASSWORD,
      role,
    }),
  });
  return json.data;
};

const connectOperatorSocket = async (token, userId) => {
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: false,
    timeout: 10000,
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  socket.emit('subscribe:notifications');
  socket.emit('ambulance:join-dispatch');

  return socket;
};

const waitForEvent = (socket, eventName, predicate, timeoutMs = 12000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for socket event ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      let parsed = payload;
      if (typeof payload === 'string') {
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = payload;
        }
      }

      if (!predicate || predicate(parsed)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(parsed);
      }
    };

    socket.on(eventName, handler);
  });

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cleanupState = {
  emergencyRequestIds: [],
  ambulanceIds: [],
  operatorIds: [],
  hospitalIds: [],
  patientIds: [],
  userIds: [],
};

const cleanup = async () => {
  const requestIds = cleanupState.emergencyRequestIds.filter(Boolean);
  if (requestIds.length) {
    await supabaseAdmin.from('ambulance_location_pings').delete().in('request_id', requestIds);
    await supabaseAdmin.from('emergency_requests').delete().in('id', requestIds);
  }

  if (cleanupState.ambulanceIds.length) {
    await supabaseAdmin.from('ambulances').delete().in('id', cleanupState.ambulanceIds);
  }
  if (cleanupState.operatorIds.length) {
    await supabaseAdmin.from('ambulance_operators').delete().in('id', cleanupState.operatorIds);
  }
  if (cleanupState.hospitalIds.length) {
    await supabaseAdmin.from('hospitals').delete().in('id', cleanupState.hospitalIds);
  }
  if (cleanupState.patientIds.length) {
    await supabaseAdmin.from('patients').delete().in('id', cleanupState.patientIds);
  }
  if (cleanupState.userIds.length) {
    await supabaseAdmin.from('refresh_tokens').delete().in('user_id', cleanupState.userIds);
    await supabaseAdmin.from('users').delete().in('id', cleanupState.userIds);
  }
};

const main = async () => {
  const runId = `smoke-${Date.now().toString(36)}`;
  let operatorSocket = null;

  try {
    console.log(`Starting dispatch live smoke: ${runId}`);

    const patientUser = await createUser({
      email: `${runId}-patient@swastik.health`,
      role: 'patient',
      name: 'Smoke Patient',
      phone: '+919999999904',
    });
    cleanupState.userIds.push(patientUser.id);
    const patient = await createPatient({ userId: patientUser.id, name: 'Smoke Patient' });
    cleanupState.patientIds.push(patient.id);

    const hospitalUser = await createUser({
      email: `${runId}-hospital@swastik.health`,
      role: 'hospital_owner',
      name: 'Smoke Hospital Owner',
      phone: '+919999999905',
    });
    cleanupState.userIds.push(hospitalUser.id);
    const hospital = await createHospital({ userId: hospitalUser.id, name: 'Smoke Hospital' });
    cleanupState.hospitalIds.push(hospital.id);

    const operatorUser = await createUser({
      email: `${runId}-ambulance@swastik.health`,
      role: 'ambulance_operator',
      name: 'Smoke Ambulance Operator',
      phone: '+919999999906',
    });
    cleanupState.userIds.push(operatorUser.id);
    const operator = await createOperator({ userId: operatorUser.id, name: 'Smoke Ambulance Fleet' });
    cleanupState.operatorIds.push(operator.id);
    const ambulance = await createAmbulance({ operatorId: operator.id });
    cleanupState.ambulanceIds.push(ambulance.id);

    const patientAuth = await login({ email: patientUser.email, role: 'patient' });
    const hospitalAuth = await login({ email: hospitalUser.email, role: 'hospital_owner' });
    const operatorAuth = await login({ email: operatorUser.email, role: 'ambulance_operator' });

    console.log('Logged in smoke users successfully');

    operatorSocket = await connectOperatorSocket(operatorAuth.accessToken, operatorAuth.user.id);
    console.log('Connected operator socket for live SOS verification');

    const sosBroadcastPromise = waitForEvent(
      operatorSocket,
      'ambulance:broadcast',
      (payload) => typeof payload === 'object' && payload.requestId,
    );

    const sosResponse = await fetchJson('/patients/emergency', {
      method: 'POST',
      headers: authHeaders(patientAuth.accessToken),
      body: JSON.stringify({
        latitude: MUMBAI.latitude,
        longitude: MUMBAI.longitude,
        emergencyType: 'cardiac',
        notes: 'Smoke SOS test',
      }),
    });
    const sosRequestId = sosResponse.data?.requestId || sosResponse.data?.id;
    ensure(sosRequestId, 'SOS request id missing');
    cleanupState.emergencyRequestIds.push(sosRequestId);

    const sosBroadcast = await sosBroadcastPromise;
    ensure(sosBroadcast.requestId === sosRequestId, 'Operator socket broadcast request id mismatch');
    console.log(`SOS broadcast received on socket for request ${sosRequestId}`);

    const operatorDashboardBeforeAccept = await fetchJson('/ambulances/dashboard', {
      headers: authHeaders(operatorAuth.accessToken),
    });
    ensure(
      Array.isArray(operatorDashboardBeforeAccept.activeEmergencies) &&
        operatorDashboardBeforeAccept.activeEmergencies.some((request) => request.id === sosRequestId),
      'SOS request missing from operator dashboard before accept'
    );

    const sosAccept = await fetchJson(`/ambulances/${sosRequestId}/accept`, {
      method: 'POST',
      headers: authHeaders(operatorAuth.accessToken),
    });
    ensure(sosAccept.success, 'SOS accept failed');

    const sosAcceptAgain = await fetchJson(`/ambulances/${sosRequestId}/accept`, {
      method: 'POST',
      headers: authHeaders(operatorAuth.accessToken),
    });
    ensure(sosAcceptAgain.success, 'Duplicate SOS accept should be idempotent');

    const patientActiveAfterAccept = await fetchJson('/patients/emergency/active', {
      headers: authHeaders(patientAuth.accessToken),
    });
    ensure(patientActiveAfterAccept.data?.id === sosRequestId, 'Patient active emergency did not sync after accept');
    ensure(patientActiveAfterAccept.data?.vehicle?.vehicle_number, 'Patient active emergency missing vehicle info');

    for (const status of ['en_route', 'arrived', 'picked_up', 'en_route_hospital', 'arrived_hospital', 'completed']) {
      const updateResult = await fetchJson(`/ambulances/request/${sosRequestId}/status`, {
        method: 'PUT',
        headers: authHeaders(operatorAuth.accessToken),
        body: JSON.stringify({ status }),
      });
      ensure(updateResult.success, `Failed to update SOS request to ${status}`);
    }

    const patientActiveAfterComplete = await fetchJson('/patients/emergency/active', {
      headers: authHeaders(patientAuth.accessToken),
    });
    ensure(patientActiveAfterComplete.data === null, 'Completed SOS request still appears active to patient');

    operatorSocket.disconnect();
    operatorSocket = null;
    console.log('Disconnected operator socket to simulate late-open driver for hospital assignment');

    const hospitalRequestResponse = await fetchJson('/ambulances/request/hospital', {
      method: 'POST',
      headers: authHeaders(hospitalAuth.accessToken),
      body: JSON.stringify({
        latitude: MUMBAI.latitude + 0.004,
        longitude: MUMBAI.longitude + 0.004,
        patientName: 'Hospital Smoke Patient',
        patientPhone: '+919999999907',
        emergencyType: 'trauma',
        notes: 'Smoke hospital assignment test',
      }),
    });
    const hospitalRequestId = hospitalRequestResponse.data?.requestId || hospitalRequestResponse.data?.id;
    ensure(hospitalRequestId, 'Hospital request id missing');
    cleanupState.emergencyRequestIds.push(hospitalRequestId);

    const availableAmbulances = await fetchJson(
      `/ambulances/available?latitude=${MUMBAI.latitude}&longitude=${MUMBAI.longitude}&radius=25`,
      { headers: authHeaders(hospitalAuth.accessToken) }
    );
    ensure(
      Array.isArray(availableAmbulances.data) && availableAmbulances.data.some((item) => item.id === ambulance.id),
      'Smoke ambulance not returned in hospital available ambulances'
    );

    const hospitalAssign = await fetchJson(`/ambulances/${hospitalRequestId}/assign`, {
      method: 'POST',
      headers: authHeaders(hospitalAuth.accessToken),
      body: JSON.stringify({ ambulanceId: ambulance.id }),
    });
    ensure(hospitalAssign.success, 'Hospital assignment failed');
    console.log(`Hospital assigned ambulance ${ambulance.id} to request ${hospitalRequestId}`);

    await sleep(500);

    const operatorDashboardLateOpen = await fetchJson('/ambulances/dashboard', {
      headers: authHeaders(operatorAuth.accessToken),
    });
    const lateOpenRequest = operatorDashboardLateOpen.activeEmergencies?.find?.((request) => request.id === hospitalRequestId);
    ensure(lateOpenRequest, 'Late-open dashboard did not recover hospital-assigned request');
    ensure(['assigned', 'accepted', 'dispatched'].includes(lateOpenRequest.status), `Unexpected late-open status: ${lateOpenRequest.status}`);

    const acceptAssigned = await fetchJson(`/ambulances/${hospitalRequestId}/accept`, {
      method: 'POST',
      headers: authHeaders(operatorAuth.accessToken),
    });
    ensure(acceptAssigned.success, 'Assigned-request accept/acknowledge failed');

    const statusEnRoute = await fetchJson(`/ambulances/request/${hospitalRequestId}/status`, {
      method: 'PUT',
      headers: authHeaders(operatorAuth.accessToken),
      body: JSON.stringify({ status: 'en_route' }),
    });
    ensure(statusEnRoute.success, 'Hospital request en_route update failed');

    const statusEnRouteAgain = await fetchJson(`/ambulances/request/${hospitalRequestId}/status`, {
      method: 'PUT',
      headers: authHeaders(operatorAuth.accessToken),
      body: JSON.stringify({ status: 'en_route' }),
    });
    ensure(statusEnRouteAgain.success, 'Duplicate en_route should be idempotent');

    const hospitalEmergencies = await fetchJson('/ambulances/hospital/emergencies', {
      headers: authHeaders(hospitalAuth.accessToken),
    });
    ensure(
      Array.isArray(hospitalEmergencies.data) &&
      hospitalEmergencies.data.some((item) => item.id === hospitalRequestId && item.status === 'en_route'),
      'Hospital emergency board did not sync en_route state'
    );

    console.log('Dispatch live smoke passed');
    console.log(JSON.stringify({
      success: true,
      runId,
      sosRequestId,
      hospitalRequestId,
      ambulanceId: ambulance.id,
      checks: [
        'SOS broadcast socket delivery',
        'SOS accept idempotency',
        'Patient active emergency sync',
        'SOS full lifecycle completion',
        'Hospital assignment late-open dashboard recovery',
        'Assigned request accept/acknowledge',
        'Duplicate en_route idempotency',
        'Hospital emergency board sync',
      ],
    }, null, 2));
  } finally {
    if (operatorSocket) {
      operatorSocket.disconnect();
    }
    await cleanup();
  }
};

main().catch(async (error) => {
  console.error('Dispatch live smoke failed:', error.message);
  console.error(error.stack);
  await cleanup().catch((cleanupError) => {
    console.error('Cleanup failed:', cleanupError.message);
  });
  process.exitCode = 1;
});
