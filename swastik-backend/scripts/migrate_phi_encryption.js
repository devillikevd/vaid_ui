// migrate_phi_encryption.js
// This script iterates through existing database records and encrypts PHI fields
// run via: node scripts/migrate_phi_encryption.js

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const cryptoUtils = require('../utils/crypto');

const BATCH_SIZE = 100;

async function migratePatients() {
  console.log('Migrating patients table...');
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const { data: patients, error } = await supabaseAdmin
      .from('patients')
      .select('id, medical_conditions, chronic_conditions, allergies, current_medications, medical_history, medical_conditions_idx, chronic_conditions_idx')
      .range(offset, offset + BATCH_SIZE - 1);
      
    if (error) {
      console.error('Error fetching patients:', error);
      break;
    }
    
    if (!patients || patients.length === 0) break;
    
    for (const patient of patients) {
      const updates = {};
      let needsUpdate = false;
      
      // We only encrypt if the field isn't already encrypted
      const isEncrypted = (val) => typeof val === 'string' && val.startsWith(cryptoUtils.PREFIX);
      const isArrayEncrypted = (arr) => Array.isArray(arr) && arr.length > 0 && isEncrypted(arr[0]);
      
      if (patient.medical_conditions && !isArrayEncrypted(patient.medical_conditions)) {
        updates.medical_conditions = cryptoUtils.encryptPHIArray(patient.medical_conditions);
        updates.medical_conditions_idx = patient.medical_conditions.map(cryptoUtils.generateBlindIndex).filter(Boolean);
        needsUpdate = true;
      }
      
      if (patient.chronic_conditions && !isArrayEncrypted(patient.chronic_conditions)) {
        updates.chronic_conditions = cryptoUtils.encryptPHIArray(patient.chronic_conditions);
        updates.chronic_conditions_idx = patient.chronic_conditions.map(cryptoUtils.generateBlindIndex).filter(Boolean);
        needsUpdate = true;
      }
      
      if (patient.allergies && !isArrayEncrypted(patient.allergies)) {
        updates.allergies = cryptoUtils.encryptPHIArray(patient.allergies);
        needsUpdate = true;
      }
      
      if (patient.current_medications && !isEncrypted(patient.current_medications)) {
        updates.current_medications = cryptoUtils.encryptPHI(patient.current_medications);
        needsUpdate = true;
      }
      
      if (patient.medical_history && !isEncrypted(patient.medical_history)) {
        updates.medical_history = cryptoUtils.encryptPHI(patient.medical_history);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await supabaseAdmin.from('patients').update(updates).eq('id', patient.id);
        processed++;
      }
    }
    
    offset += BATCH_SIZE;
    console.log(`Processed ${offset} patients...`);
  }
  
  console.log(`Done migrating patients. Updated ${processed} records.`);
}

async function migrateConsultations() {
  console.log('Migrating consultations table...');
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const { data: consultations, error } = await supabaseAdmin
      .from('consultations')
      .select('id, diagnosis, notes, patient_notes, doctor_notes')
      .range(offset, offset + BATCH_SIZE - 1);
      
    if (error) {
      console.error('Error fetching consultations:', error);
      break;
    }
    
    if (!consultations || consultations.length === 0) break;
    
    for (const c of consultations) {
      const updates = {};
      let needsUpdate = false;
      const isEncrypted = (val) => typeof val === 'string' && val.startsWith(cryptoUtils.PREFIX);
      
      if (c.diagnosis && !isEncrypted(c.diagnosis)) {
        updates.diagnosis = cryptoUtils.encryptPHI(c.diagnosis);
        needsUpdate = true;
      }
      if (c.notes && !isEncrypted(c.notes)) {
        updates.notes = cryptoUtils.encryptPHI(c.notes);
        needsUpdate = true;
      }
      if (c.patient_notes && !isEncrypted(c.patient_notes)) {
        updates.patient_notes = cryptoUtils.encryptPHI(c.patient_notes);
        needsUpdate = true;
      }
      if (c.doctor_notes && !isEncrypted(c.doctor_notes)) {
        updates.doctor_notes = cryptoUtils.encryptPHI(c.doctor_notes);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await supabaseAdmin.from('consultations').update(updates).eq('id', c.id);
        processed++;
      }
    }
    
    offset += BATCH_SIZE;
  }
  console.log(`Done migrating consultations. Updated ${processed} records.`);
}

async function migratePrescriptions() {
  console.log('Migrating prescriptions table...');
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const { data: records, error } = await supabaseAdmin
      .from('prescriptions')
      .select('id, diagnosis, notes, medicines')
      .range(offset, offset + BATCH_SIZE - 1);
      
    if (error) break;
    if (!records || records.length === 0) break;
    
    for (const r of records) {
      const updates = {};
      let needsUpdate = false;
      const isEncrypted = (val) => typeof val === 'string' && val.startsWith(cryptoUtils.PREFIX);
      
      if (r.diagnosis && !isEncrypted(r.diagnosis)) {
        updates.diagnosis = cryptoUtils.encryptPHI(r.diagnosis);
        needsUpdate = true;
      }
      if (r.notes && !isEncrypted(r.notes)) {
        updates.notes = cryptoUtils.encryptPHI(r.notes);
        needsUpdate = true;
      }
      if (r.medicines && !isEncrypted(r.medicines)) {
        updates.medicines = cryptoUtils.encryptPHI(r.medicines);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await supabaseAdmin.from('prescriptions').update(updates).eq('id', r.id);
        processed++;
      }
    }
    offset += BATCH_SIZE;
  }
  console.log(`Done migrating prescriptions. Updated ${processed} records.`);
}

async function migratePrescriptionMedicines() {
  console.log('Migrating prescription_medicines table...');
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const { data: records, error } = await supabaseAdmin
      .from('prescription_medicines')
      .select('id, medicine_name, generic_name, instructions')
      .range(offset, offset + BATCH_SIZE - 1);
      
    if (error) break;
    if (!records || records.length === 0) break;
    
    for (const r of records) {
      const updates = {};
      let needsUpdate = false;
      const isEncrypted = (val) => typeof val === 'string' && val.startsWith(cryptoUtils.PREFIX);
      
      if (r.medicine_name && !isEncrypted(r.medicine_name)) {
        updates.medicine_name = cryptoUtils.encryptPHI(r.medicine_name);
        needsUpdate = true;
      }
      if (r.generic_name && !isEncrypted(r.generic_name)) {
        updates.generic_name = cryptoUtils.encryptPHI(r.generic_name);
        needsUpdate = true;
      }
      if (r.instructions && !isEncrypted(r.instructions)) {
        updates.instructions = cryptoUtils.encryptPHI(r.instructions);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await supabaseAdmin.from('prescription_medicines').update(updates).eq('id', r.id);
        processed++;
      }
    }
    offset += BATCH_SIZE;
  }
  console.log(`Done migrating prescription_medicines. Updated ${processed} records.`);
}

async function migrateReports() {
  console.log('Migrating reports table...');
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const { data: records, error } = await supabaseAdmin
      .from('reports')
      .select('id, doctor_notes, parameters')
      .range(offset, offset + BATCH_SIZE - 1);
      
    if (error) break;
    if (!records || records.length === 0) break;
    
    for (const r of records) {
      const updates = {};
      let needsUpdate = false;
      const isEncrypted = (val) => typeof val === 'string' && val.startsWith(cryptoUtils.PREFIX);
      
      if (r.doctor_notes && !isEncrypted(r.doctor_notes)) {
        updates.doctor_notes = cryptoUtils.encryptPHI(r.doctor_notes);
        needsUpdate = true;
      }
      if (r.parameters && !isEncrypted(r.parameters)) {
        updates.parameters = cryptoUtils.encryptPHI(r.parameters);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await supabaseAdmin.from('reports').update(updates).eq('id', r.id);
        processed++;
      }
    }
    offset += BATCH_SIZE;
  }
  console.log(`Done migrating reports. Updated ${processed} records.`);
}

async function run() {
  console.log('Starting PHI encryption migration...');
  
  if (!process.env.PHI_ENCRYPTION_KEY || !process.env.PHI_BLIND_INDEX_KEY) {
    console.warn('WARNING: Running without explicitly set PHI_ENCRYPTION_KEY or PHI_BLIND_INDEX_KEY. Fallbacks will be used if not in production.');
  }

  await migratePatients();
  await migrateConsultations();
  await migratePrescriptions();
  await migratePrescriptionMedicines();
  await migrateReports();
  
  console.log('Migration complete.');
  process.exit(0);
}

run().catch(console.error);
