#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const { deleteFile, extractObjectNameFromUrl } = require('../config/minio');

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5001';
const API_BASE = `${BASE_URL}/api`;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5WbN8AAAAASUVORK5CYII=',
  'base64'
);

const TINY_PDF = Buffer.from(
  `%PDF-1.3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 120 Td (Swastik S3 Smoke) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000208 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
303
%%EOF`,
  'utf8'
);

const cleanupTasks = [];
const ADMIN_PENDING_KEYS = {
  doctor: 'doctors',
  hospital: 'hospitals',
  clinic: 'clinics',
  pharmacy: 'pharmacies',
  diagnostic_center: 'diagnostic_centers',
  ambulance: 'ambulances',
};

const createAccessToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: '1h' }
  );

const toJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const apiFetch = async (path, { method = 'GET', token, json, formData } = {}) => {
  const headers = {};
  let body;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (formData) {
    body = formData;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
  });

  return {
    status: response.status,
    ok: response.ok,
    body: await toJson(response),
  };
};

const fetchUrlStatus = async (url) => {
  const response = await fetch(url, { redirect: 'manual' });
  return response.status;
};

const assertSignedUrl = (url, label) => {
  assert.ok(url, `${label} should be present`);
  assert.match(url, /X-Amz-Algorithm=/, `${label} should be a signed S3 URL`);
};

const assertRawStorageUrl = (url, label) => {
  assert.ok(url, `${label} should be present`);
  assert.doesNotMatch(url, /X-Amz-Algorithm=/, `${label} should stay as a stable storage URL`);
  assert.match(url, /^https:\/\/.+amazonaws\.com\//, `${label} should look like an S3 object URL`);
};

const assertStatus = (response, expectedStatus, label) => {
  if (response.status !== expectedStatus) {
    throw new assert.AssertionError({
      message: `${label} should succeed`,
      actual: `${response.status} ${JSON.stringify(response.body)}`,
      expected: `${expectedStatus}`,
      operator: 'strictEqual',
    });
  }
};

const queueFileCleanupFromUrl = (url) => {
  const objectName = extractObjectNameFromUrl(url);
  if (!objectName) return;
  cleanupTasks.push(async () => {
    try {
      await deleteFile(objectName);
    } catch (_) {
      // best effort
    }
  });
};

const buildPhone = (prefix) => `+91${prefix}${Math.floor(Math.random() * 1e7).toString().padStart(7, '0')}`;

const insertUser = async ({ role, name, email, phone }) => {
  const passwordHash = await bcrypt.hash('TempPass123', 10);
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      name,
      email,
      phone,
      password_hash: passwordHash,
      role,
      is_active: true,
      is_verified: true,
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('users').delete().eq('id', user.id);
  });

  return user;
};

const createPatient = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'patient',
    name: `S3 Patient ${slug}`,
    email: `s3.patient.${slug}@example.com`,
    phone: `+9199${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
  });

  const { data: patient, error } = await supabaseAdmin
    .from('patients')
    .insert({
      user_id: user.id,
      name: user.name,
      gender: 'male',
      address: 'Sonipat',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('patients').delete().eq('id', patient.id);
  });

  return { user, patient, token: createAccessToken(user) };
};

const createDoctor = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'doctor',
    name: `S3 Doctor ${slug}`,
    email: `s3.doctor.${slug}@example.com`,
    phone: buildPhone('66'),
  });

  const { data: doctor, error } = await supabaseAdmin
    .from('doctors')
    .insert({
      user_id: user.id,
      name: user.name,
      specialization: 'General Medicine',
      registration_number: `DOC-REG-${slug.toUpperCase()}`,
      license_number: `DOC-LIC-${slug.toUpperCase()}`,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('doctors').delete().eq('id', doctor.id);
  });

  return { user, doctor, slug, token: createAccessToken(user) };
};

const createHospitalOwner = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'hospital_owner',
    name: `S3 Hospital Owner ${slug}`,
    email: `s3.hospital.${slug}@example.com`,
    phone: `+9188${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
  });

  const { data: hospital, error } = await supabaseAdmin
    .from('hospitals')
    .insert({
      owner_id: user.id,
      name: `S3 Hospital ${slug}`,
      address: 'Sonipat',
      city: 'Sonipat',
      phone: user.phone,
      email: user.email,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('hospitals').delete().eq('id', hospital.id);
  });

  return { user, hospital, token: createAccessToken(user) };
};

const createClinicOwner = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'clinic_owner',
    name: `S3 Clinic Owner ${slug}`,
    email: `s3.clinic.${slug}@example.com`,
    phone: buildPhone('55'),
  });

  const { data: clinic, error } = await supabaseAdmin
    .from('clinics')
    .insert({
      owner_id: user.id,
      name: `S3 Clinic ${slug}`,
      registration_number: `CLI-REG-${slug.toUpperCase()}`,
      license_number: `CLI-LIC-${slug.toUpperCase()}`,
      address: 'Sonipat',
      city: 'Sonipat',
      state: 'Haryana',
      phone: user.phone,
      email: user.email,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('clinics').delete().eq('id', clinic.id);
  });

  return { user, clinic, slug, token: createAccessToken(user) };
};

const createPharmacyOwner = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'pharmacy_owner',
    name: `S3 Pharmacy Owner ${slug}`,
    email: `s3.pharmacy.${slug}@example.com`,
    phone: buildPhone('44'),
  });

  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacies')
    .insert({
      owner_id: user.id,
      name: `S3 Pharmacy ${slug}`,
      license_number: `PHA-LIC-${slug.toUpperCase()}`,
      drug_license_number: `PHA-DRUG-${slug.toUpperCase()}`,
      address: 'Sonipat',
      city: 'Sonipat',
      state: 'Haryana',
      phone: user.phone,
      email: user.email,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('pharmacies').delete().eq('id', pharmacy.id);
  });

  return { user, pharmacy, slug, token: createAccessToken(user) };
};

const createDiagnosticCenterOwner = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'diagnostic_center_owner',
    name: `S3 Diagnostic Owner ${slug}`,
    email: `s3.diagnostic.${slug}@example.com`,
    phone: buildPhone('33'),
  });

  const { data: center, error } = await supabaseAdmin
    .from('diagnostic_centers')
    .insert({
      owner_id: user.id,
      name: `S3 Diagnostic ${slug}`,
      registration_number: `DIA-REG-${slug.toUpperCase()}`,
      license_number: `DIA-LIC-${slug.toUpperCase()}`,
      address: 'Sonipat',
      city: 'Sonipat',
      state: 'Haryana',
      phone: user.phone,
      email: user.email,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('diagnostic_centers').delete().eq('id', center.id);
  });

  return { user, center, slug, token: createAccessToken(user) };
};

const createAmbulanceOperator = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'ambulance_operator',
    name: `S3 Ambulance ${slug}`,
    email: `s3.ambulance.${slug}@example.com`,
    phone: `+9177${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
  });

  const { data: operator, error } = await supabaseAdmin
    .from('ambulance_operators')
    .insert({
      user_id: user.id,
      name: user.name,
      company_name: `S3 Ambulance Co ${slug}`,
      registration_number: `AMB-${slug.toUpperCase()}`,
      address: 'Sonipat',
      city: 'Sonipat',
      state: 'Haryana',
      phone: user.phone,
      email: user.email,
      is_active: true,
      is_approved: false,
      approval_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('ambulance_operators').delete().eq('id', operator.id);
  });

  return { user, operator, token: createAccessToken(user) };
};

const createAdmin = async () => {
  const slug = crypto.randomUUID().slice(0, 8);
  const user = await insertUser({
    role: 'admin',
    name: `S3 Admin ${slug}`,
    email: `s3.admin.${slug}@example.com`,
    phone: buildPhone('22'),
  });

  const { data: admin, error } = await supabaseAdmin
    .from('admins')
    .insert({
      user_id: user.id,
      name: user.name,
      admin_role: 'admin',
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;

  cleanupTasks.push(async () => {
    await supabaseAdmin.from('admins').delete().eq('id', admin.id);
  });

  return { user, admin, token: createAccessToken(user) };
};

const uploadFile = async ({ token, path, fieldName, fileName, mimeType, bytes, extraFields = {} }) => {
  const formData = new FormData();
  formData.append(fieldName, new Blob([bytes], { type: mimeType }), fileName);
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }

  const response = await apiFetch(path, { method: 'POST', token, formData });
  assert.equal(response.status, 200, `${path} upload should succeed`);
  assert.equal(response.body.success, true, `${path} upload should return success`);
  return response.body.data;
};

const assertReadUrlStatuses = async (label, urls = []) => {
  const statuses = await Promise.all(urls.map((url) => fetchUrlStatus(url)));
  statuses.forEach((status, index) => {
    assert.equal(status, 200, `${label} signed URL #${index + 1} should return 200`);
  });
};

const assertRawUrlStatuses = async (label, urls = []) => {
  const statuses = await Promise.all(urls.map((url) => fetchUrlStatus(url)));
  statuses.forEach((status, index) => {
    assert.equal(status, 403, `${label} raw URL #${index + 1} should return 403`);
  });
};

const findProviderInPendingApprovals = (responseBody, type, providerId) => {
  const key = ADMIN_PENDING_KEYS[type];
  const rows = responseBody?.data?.[key]?.data || [];
  return rows.find((row) => row.id === providerId);
};

const findDocumentWithUrl = (documents = []) => (
  documents.find((document) => document?.document_url) || null
);

const main = async () => {
  const healthResponse = await fetch(`${BASE_URL}/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200, 'health should return 200');
  assert.equal(health.checks?.storageProvider, 's3', 'health should report S3');
  assert.equal(health.checks?.storage, 'ok', 'storage should be healthy');

  const patientCtx = await createPatient();
  const doctorCtx = await createDoctor();
  const hospitalCtx = await createHospitalOwner();
  const clinicCtx = await createClinicOwner();
  const pharmacyCtx = await createPharmacyOwner();
  const diagnosticCtx = await createDiagnosticCenterOwner();
  const ambulanceCtx = await createAmbulanceOperator();
  const adminCtx = await createAdmin();

  const patientProfileUpload = await uploadFile({
    token: patientCtx.token,
    path: '/patients/profile/image',
    fieldName: 'image',
    fileName: 'patient-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });

  assertSignedUrl(patientProfileUpload.url, 'Patient profile upload URL');

  const patientProfileRaw = await supabaseAdmin
    .from('patients')
    .select('profile_image_url')
    .eq('id', patientCtx.patient.id)
    .single();
  assertRawStorageUrl(patientProfileRaw.data.profile_image_url, 'Stored patient profile image URL');
  queueFileCleanupFromUrl(patientProfileRaw.data.profile_image_url);

  const patientProfileGet = await apiFetch('/patients/profile', { token: patientCtx.token });
  assertStatus(patientProfileGet, 200, 'Patient profile fetch');
  assertSignedUrl(patientProfileGet.body.data.profile_image_url, 'Patient profile read URL');

  const patientReportForm = new FormData();
  patientReportForm.append('file', new Blob([TINY_PDF], { type: 'application/pdf' }), 'patient-report.pdf');
  patientReportForm.append('name', 'S3 Smoke Report');
  patientReportForm.append('type', 'blood_test');
  patientReportForm.append('date', '2026-04-06');
  const patientReportCreate = await apiFetch('/reports', {
    method: 'POST',
    token: patientCtx.token,
    formData: patientReportForm,
  });
  assertStatus(patientReportCreate, 201, 'Patient report create');
  assert.equal(patientReportCreate.body.success, true, 'Patient report create should return success');
  assertSignedUrl(patientReportCreate.body.data.file_url, 'Patient report create file URL');
  const patientReportId = patientReportCreate.body.data.id;
  const patientReportRawUrl = patientReportCreate.body.data.file_url;

  const patientReportRow = await supabaseAdmin
    .from('reports')
    .select('file_url')
    .eq('id', patientReportId)
    .single();
  assertRawStorageUrl(patientReportRow.data.file_url, 'Stored patient report URL');
  queueFileCleanupFromUrl(patientReportRow.data.file_url);

  const patientReportsGet = await apiFetch('/patients/reports', { token: patientCtx.token });
  assertStatus(patientReportsGet, 200, 'Patient reports list');
  const listedReport = (patientReportsGet.body.data || []).find((report) => report.id === patientReportId);
  assert.ok(listedReport, 'Patient reports list should include the uploaded report');
  assertSignedUrl(listedReport.file_url, 'Patient report list file URL');

  const doctorProfileImageUpload = await uploadFile({
    token: doctorCtx.token,
    path: '/uploads/profile',
    fieldName: 'file',
    fileName: 'doctor-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });
  const doctorLicenseUpload = await uploadFile({
    token: doctorCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'doctor-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'doctor' },
  });
  assertRawStorageUrl(doctorProfileImageUpload.storageUrl, 'Doctor uploaded profile storage URL');
  assertSignedUrl(doctorProfileImageUpload.url, 'Doctor uploaded profile resolved URL');
  assertRawStorageUrl(doctorLicenseUpload.storageUrl, 'Doctor uploaded license storage URL');
  assertSignedUrl(doctorLicenseUpload.url, 'Doctor uploaded license resolved URL');

  const doctorProfileUpdate = await apiFetch('/doctors/me/profile', {
    method: 'PUT',
    token: doctorCtx.token,
    json: {
      profile_image_url: doctorProfileImageUpload.storageUrl,
      license_document_url: doctorLicenseUpload.storageUrl,
    },
  });
  assertStatus(doctorProfileUpdate, 200, 'Doctor profile update');

  const doctorProfileRow = await supabaseAdmin
    .from('doctors')
    .select('profile_image_url, license_document_url')
    .eq('id', doctorCtx.doctor.id)
    .single();
  assertRawStorageUrl(doctorProfileRow.data.profile_image_url, 'Stored doctor profile image URL');
  assertRawStorageUrl(doctorProfileRow.data.license_document_url, 'Stored doctor license URL');
  queueFileCleanupFromUrl(doctorProfileRow.data.profile_image_url);
  queueFileCleanupFromUrl(doctorProfileRow.data.license_document_url);

  const doctorProfileGet = await apiFetch('/doctors/me/profile', { token: doctorCtx.token });
  assertStatus(doctorProfileGet, 200, 'Doctor profile fetch');
  assertSignedUrl(doctorProfileGet.body.data.profile_image_url, 'Doctor profile read image URL');
  assertSignedUrl(doctorProfileGet.body.data.license_document_url, 'Doctor profile read license URL');

  const hospitalProfileImageUpload = await uploadFile({
    token: hospitalCtx.token,
    path: '/uploads/profile',
    fieldName: 'file',
    fileName: 'hospital-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });
  const hospitalLicenseUpload = await uploadFile({
    token: hospitalCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'hospital-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'hospital' },
  });

  assertRawStorageUrl(hospitalProfileImageUpload.storageUrl, 'Hospital uploaded profile storage URL');
  assertSignedUrl(hospitalProfileImageUpload.url, 'Hospital uploaded profile resolved URL');
  assertRawStorageUrl(hospitalLicenseUpload.storageUrl, 'Hospital uploaded license storage URL');
  assertSignedUrl(hospitalLicenseUpload.url, 'Hospital uploaded license resolved URL');

  const hospitalProfileUpdate = await apiFetch('/hospital-manager/profile', {
    method: 'PUT',
    token: hospitalCtx.token,
    json: {
      profile_image_url: hospitalProfileImageUpload.storageUrl,
      license_document_url: hospitalLicenseUpload.storageUrl,
      total_beds: 42,
    },
  });
  assertStatus(hospitalProfileUpdate, 200, 'Hospital profile update');

  const hospitalProfileGet = await apiFetch('/hospital-manager/profile', { token: hospitalCtx.token });
  assertStatus(hospitalProfileGet, 200, 'Hospital profile fetch');
  const hospitalReadImageUrl =
    hospitalProfileGet.body.hospital.profile_image_url ||
    hospitalProfileGet.body.hospital.image_url;
  assertSignedUrl(hospitalReadImageUrl, 'Hospital profile read image URL');
  assertSignedUrl(hospitalProfileGet.body.hospital.license_document_url, 'Hospital profile read license URL');
  cleanupTasks.push(async () => {
    if (hospitalProfileImageUpload.objectName) await deleteFile(hospitalProfileImageUpload.objectName);
    if (hospitalLicenseUpload.objectName) await deleteFile(hospitalLicenseUpload.objectName);
  });

  const clinicProfileImageUpload = await uploadFile({
    token: clinicCtx.token,
    path: '/uploads/profile',
    fieldName: 'file',
    fileName: 'clinic-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });
  const clinicLicenseUpload = await uploadFile({
    token: clinicCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'clinic-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'clinic' },
  });
  assertRawStorageUrl(clinicProfileImageUpload.storageUrl, 'Clinic uploaded profile storage URL');
  assertSignedUrl(clinicProfileImageUpload.url, 'Clinic uploaded profile resolved URL');
  assertRawStorageUrl(clinicLicenseUpload.storageUrl, 'Clinic uploaded license storage URL');
  assertSignedUrl(clinicLicenseUpload.url, 'Clinic uploaded license resolved URL');

  const clinicProfileUpdate = await apiFetch('/clinics/owner/profile', {
    method: 'PUT',
    token: clinicCtx.token,
    json: {
      profile_image_url: clinicProfileImageUpload.storageUrl,
      license_document_url: clinicLicenseUpload.storageUrl,
    },
  });
  assertStatus(clinicProfileUpdate, 200, 'Clinic profile update');

  const clinicProfileRow = await supabaseAdmin
    .from('clinics')
    .select('image_url, license_document_url')
    .eq('id', clinicCtx.clinic.id)
    .single();
  assertRawStorageUrl(clinicProfileRow.data.image_url, 'Stored clinic profile image URL');
  assertRawStorageUrl(clinicProfileRow.data.license_document_url, 'Stored clinic license URL');
  queueFileCleanupFromUrl(clinicProfileRow.data.image_url);
  queueFileCleanupFromUrl(clinicProfileRow.data.license_document_url);

  const clinicProfileGet = await apiFetch('/clinics/owner/profile', { token: clinicCtx.token });
  assertStatus(clinicProfileGet, 200, 'Clinic profile fetch');
  assertSignedUrl(clinicProfileGet.body.data.profile_image_url, 'Clinic profile read image URL');
  assertSignedUrl(clinicProfileGet.body.data.license_document_url, 'Clinic profile read license URL');

  const pharmacyProfileImageUpload = await uploadFile({
    token: pharmacyCtx.token,
    path: '/uploads/profile',
    fieldName: 'file',
    fileName: 'pharmacy-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });
  const pharmacyLicenseUpload = await uploadFile({
    token: pharmacyCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'pharmacy-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'pharmacy' },
  });
  assertRawStorageUrl(pharmacyProfileImageUpload.storageUrl, 'Pharmacy uploaded profile storage URL');
  assertSignedUrl(pharmacyProfileImageUpload.url, 'Pharmacy uploaded profile resolved URL');
  assertRawStorageUrl(pharmacyLicenseUpload.storageUrl, 'Pharmacy uploaded license storage URL');
  assertSignedUrl(pharmacyLicenseUpload.url, 'Pharmacy uploaded license resolved URL');

  const pharmacyProfileUpdate = await apiFetch('/pharmacy/profile', {
    method: 'PUT',
    token: pharmacyCtx.token,
    json: {
      profile_image_url: pharmacyProfileImageUpload.storageUrl,
      license_document_url: pharmacyLicenseUpload.storageUrl,
    },
  });
  assertStatus(pharmacyProfileUpdate, 200, 'Pharmacy profile update');

  const pharmacyProfileRow = await supabaseAdmin
    .from('pharmacies')
    .select('image_url, license_document_url')
    .eq('id', pharmacyCtx.pharmacy.id)
    .single();
  assertRawStorageUrl(pharmacyProfileRow.data.image_url, 'Stored pharmacy profile image URL');
  assertRawStorageUrl(pharmacyProfileRow.data.license_document_url, 'Stored pharmacy license URL');
  queueFileCleanupFromUrl(pharmacyProfileRow.data.image_url);
  queueFileCleanupFromUrl(pharmacyProfileRow.data.license_document_url);

  const pharmacyProfileGet = await apiFetch('/pharmacy/profile', { token: pharmacyCtx.token });
  assertStatus(pharmacyProfileGet, 200, 'Pharmacy profile fetch');
  assertSignedUrl(pharmacyProfileGet.body.data.profile_image_url, 'Pharmacy profile read image URL');
  assertSignedUrl(pharmacyProfileGet.body.data.license_document_url, 'Pharmacy profile read license URL');

  const diagnosticProfileImageUpload = await uploadFile({
    token: diagnosticCtx.token,
    path: '/uploads/profile',
    fieldName: 'file',
    fileName: 'diagnostic-avatar.png',
    mimeType: 'image/png',
    bytes: TINY_PNG,
  });
  const diagnosticLicenseUpload = await uploadFile({
    token: diagnosticCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'diagnostic-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'diagnostic_center' },
  });
  assertRawStorageUrl(diagnosticProfileImageUpload.storageUrl, 'Diagnostic uploaded profile storage URL');
  assertSignedUrl(diagnosticProfileImageUpload.url, 'Diagnostic uploaded profile resolved URL');
  assertRawStorageUrl(diagnosticLicenseUpload.storageUrl, 'Diagnostic uploaded license storage URL');
  assertSignedUrl(diagnosticLicenseUpload.url, 'Diagnostic uploaded license resolved URL');

  const diagnosticProfileUpdate = await apiFetch('/diagnostic-centers/owner/profile', {
    method: 'PUT',
    token: diagnosticCtx.token,
    json: {
      profile_image_url: diagnosticProfileImageUpload.storageUrl,
      license_document_url: diagnosticLicenseUpload.storageUrl,
    },
  });
  assertStatus(diagnosticProfileUpdate, 200, 'Diagnostic profile update');

  const diagnosticProfileRow = await supabaseAdmin
    .from('diagnostic_centers')
    .select('image_url, license_document_url')
    .eq('id', diagnosticCtx.center.id)
    .single();
  assertRawStorageUrl(diagnosticProfileRow.data.image_url, 'Stored diagnostic profile image URL');
  assertRawStorageUrl(diagnosticProfileRow.data.license_document_url, 'Stored diagnostic license URL');
  queueFileCleanupFromUrl(diagnosticProfileRow.data.image_url);
  queueFileCleanupFromUrl(diagnosticProfileRow.data.license_document_url);

  const diagnosticProfileGet = await apiFetch('/diagnostic-centers/owner/profile', { token: diagnosticCtx.token });
  assertStatus(diagnosticProfileGet, 200, 'Diagnostic profile fetch');
  assertSignedUrl(diagnosticProfileGet.body.data.profile_image_url, 'Diagnostic profile read image URL');
  assertSignedUrl(diagnosticProfileGet.body.data.license_document_url, 'Diagnostic profile read license URL');

  const ambulanceLicenseUpload = await uploadFile({
    token: ambulanceCtx.token,
    path: '/uploads/license',
    fieldName: 'file',
    fileName: 'ambulance-license.pdf',
    mimeType: 'application/pdf',
    bytes: TINY_PDF,
    extraFields: { providerType: 'ambulance' },
  });
  assertRawStorageUrl(ambulanceLicenseUpload.storageUrl, 'Ambulance uploaded license storage URL');
  assertSignedUrl(ambulanceLicenseUpload.url, 'Ambulance uploaded license resolved URL');

  const ambulanceProfileUpdate = await apiFetch('/auth/me', {
    method: 'PUT',
    token: ambulanceCtx.token,
    json: {
      license_document_url: ambulanceLicenseUpload.storageUrl,
    },
  });
  assertStatus(ambulanceProfileUpdate, 200, 'Ambulance auth profile update');

  const ambulanceProfileGet = await apiFetch('/auth/me', { token: ambulanceCtx.token });
  assertStatus(ambulanceProfileGet, 200, 'Ambulance auth profile fetch');
  assertSignedUrl(ambulanceProfileGet.body.data.license_document_url, 'Ambulance profile read license URL');
  queueFileCleanupFromUrl(ambulanceLicenseUpload.storageUrl);
  const adminPendingChecks = [
    { type: 'doctor', providerId: doctorCtx.doctor.id },
    { type: 'hospital', providerId: hospitalCtx.hospital.id },
    { type: 'clinic', providerId: clinicCtx.clinic.id },
    { type: 'pharmacy', providerId: pharmacyCtx.pharmacy.id },
    { type: 'diagnostic_center', providerId: diagnosticCtx.center.id },
    { type: 'ambulance', providerId: ambulanceCtx.operator.id },
  ];

  for (const check of adminPendingChecks) {
    const pending = await apiFetch(`/admin/approvals/pending?type=${check.type}&page=1&limit=10`, {
      token: adminCtx.token,
    });
    assertStatus(pending, 200, `Admin pending approvals ${check.type}`);
    const provider = findProviderInPendingApprovals(pending.body, check.type, check.providerId);
    assert.ok(provider, `Admin pending approvals should include ${check.type} provider`);
    const approvalDocument = findDocumentWithUrl(provider.compliance_documents || []);
    assert.ok(approvalDocument, `Admin pending approvals should expose a signed compliance document for ${check.type}`);
    assertSignedUrl(approvalDocument.document_url, `Admin pending approval ${check.type} document URL`);
  }

  const adminComplianceChecks = [
    { type: 'doctor', providerId: doctorCtx.doctor.id, search: doctorCtx.slug },
    { type: 'hospital', providerId: hospitalCtx.hospital.id, search: hospitalCtx.hospital.name },
    { type: 'clinic', providerId: clinicCtx.clinic.id, search: clinicCtx.slug },
    { type: 'pharmacy', providerId: pharmacyCtx.pharmacy.id, search: pharmacyCtx.slug },
    { type: 'diagnostic_center', providerId: diagnosticCtx.center.id, search: diagnosticCtx.slug },
    { type: 'ambulance', providerId: ambulanceCtx.operator.id, search: ambulanceCtx.user.name },
  ];

  for (const check of adminComplianceChecks) {
    const compliance = await apiFetch(
      `/admin/compliance/documents?type=${check.type}&status=all&search=${encodeURIComponent(check.search)}&page=1&limit=20`,
      { token: adminCtx.token }
    );
    assertStatus(compliance, 200, `Admin compliance documents ${check.type}`);
    const document = (compliance.body.data || []).find((row) => row.provider_id === check.providerId && row.document_url);
    assert.ok(document, `Admin compliance documents should include ${check.type} provider`);
    assertSignedUrl(document.document_url, `Admin compliance ${check.type} document URL`);
  }

  await assertRawUrlStatuses('Raw storage', [
    patientProfileRaw.data.profile_image_url,
    patientReportRow.data.file_url,
    doctorProfileRow.data.profile_image_url,
    doctorProfileRow.data.license_document_url,
    hospitalProfileImageUpload.storageUrl,
    hospitalLicenseUpload.storageUrl,
    clinicProfileRow.data.image_url,
    clinicProfileRow.data.license_document_url,
    pharmacyProfileRow.data.image_url,
    pharmacyProfileRow.data.license_document_url,
    diagnosticProfileRow.data.image_url,
    diagnosticProfileRow.data.license_document_url,
    ambulanceLicenseUpload.storageUrl,
  ]);

  await assertReadUrlStatuses('Signed storage', [
    patientProfileGet.body.data.profile_image_url,
    listedReport.file_url,
    doctorProfileGet.body.data.profile_image_url,
    doctorProfileGet.body.data.license_document_url,
    hospitalReadImageUrl,
    hospitalProfileGet.body.hospital.license_document_url,
    clinicProfileGet.body.data.profile_image_url,
    clinicProfileGet.body.data.license_document_url,
    pharmacyProfileGet.body.data.profile_image_url,
    pharmacyProfileGet.body.data.license_document_url,
    diagnosticProfileGet.body.data.profile_image_url,
    diagnosticProfileGet.body.data.license_document_url,
    ambulanceProfileGet.body.data.license_document_url,
  ]);

  console.log(JSON.stringify({
    ok: true,
    health: {
      storageProvider: health.checks?.storageProvider,
      storage: health.checks?.storage,
    },
    patient: {
      profileReadSigned: patientProfileGet.body.data.profile_image_url,
      reportReadSigned: listedReport.file_url,
    },
    doctor: {
      profileReadSigned: doctorProfileGet.body.data.profile_image_url,
      licenseReadSigned: doctorProfileGet.body.data.license_document_url,
    },
    hospital: {
      profileReadSigned: hospitalReadImageUrl,
      licenseReadSigned: hospitalProfileGet.body.hospital.license_document_url,
    },
    clinic: {
      profileReadSigned: clinicProfileGet.body.data.profile_image_url,
      licenseReadSigned: clinicProfileGet.body.data.license_document_url,
    },
    pharmacy: {
      profileReadSigned: pharmacyProfileGet.body.data.profile_image_url,
      licenseReadSigned: pharmacyProfileGet.body.data.license_document_url,
    },
    diagnostic: {
      profileReadSigned: diagnosticProfileGet.body.data.profile_image_url,
      licenseReadSigned: diagnosticProfileGet.body.data.license_document_url,
    },
    ambulance: {
      licenseReadSigned: ambulanceProfileGet.body.data.license_document_url,
    },
    admin: {
      checkedTypes: adminPendingChecks.map((check) => check.type),
    },
  }, null, 2));
};

const cleanup = async () => {
  while (cleanupTasks.length > 0) {
    const task = cleanupTasks.pop();
    try {
      await task();
    } catch (_) {
      // best effort
    }
  }
};

main()
  .catch(async (error) => {
    console.error('[private-s3-e2e] failed:', error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
