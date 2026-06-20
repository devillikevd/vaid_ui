const { encryptPHI, deepDecrypt } = require('./crypto');

const PHI_REGISTRY = {
  patients: ['medical_conditions', 'allergies', 'chronic_conditions', 'current_medications', 'medical_history', 'blood_group'],
  appointments: ['reason', 'reason_for_visit', 'symptoms', 'patient_notes', 'doctor_notes', 'notes'],
  consultations: ['chief_complaint', 'symptoms', 'diagnosis', 'notes', 'advice', 'follow_up_notes'],
  prescriptions: ['diagnosis', 'instructions', 'dietary_advice', 'lifestyle_advice', 'notes', 'medicines'],
  prescription_medicines: ['medicine_name', 'instructions'],
  reports: ['doctor_notes'],
  reminders: ['notes'],
};

function wrapQueryBuilder(qb, phiFields) {
  return new Proxy(qb, {
    get(target, prop) {
      if (prop === 'then') {
        return async (resolve, reject) => {
          try {
            const res = await target;
            if (res && res.data) {
              res.data = deepDecrypt(res.data);
            }
            resolve(res);
          } catch (err) {
            reject(err);
          }
        };
      }

      if (prop === 'insert' || prop === 'update' || prop === 'upsert') {
        return (data, options) => {
          let encryptedData;
          
          if (Array.isArray(data)) {
            encryptedData = data.map(item => encryptPayload(item, phiFields));
          } else if (typeof data === 'object' && data !== null) {
            encryptedData = encryptPayload(data, phiFields);
          } else {
            encryptedData = data;
          }
          
          return wrapQueryBuilder(target[prop](encryptedData, options), phiFields);
        };
      }

      // Chainable methods like .select, .eq, etc.
      const originalMethod = target[prop];
      if (typeof originalMethod === 'function') {
        return (...args) => {
          const result = originalMethod.apply(target, args);
          if (result && typeof result.then === 'function') {
            return wrapQueryBuilder(result, phiFields);
          }
          return result;
        };
      }

      return originalMethod;
    }
  });
}

function encryptPayload(data, phiFields) {
  const newPayload = { ...data };
  for (const field of phiFields) {
    if (newPayload[field] !== undefined && newPayload[field] !== null) {
      // If it's an array of strings (e.g. text[] in Supabase), encrypt each element
      if (Array.isArray(newPayload[field]) && newPayload[field].every(item => typeof item === 'string')) {
        newPayload[field] = newPayload[field].map(item => encryptPHI(item));
      } else {
        newPayload[field] = encryptPHI(newPayload[field]);
      }
    }
  }
  return newPayload;
}

function createSupabasePHIProxy(supabaseClient) {
  return new Proxy(supabaseClient, {
    get(target, prop) {
      if (prop === 'from') {
        return (tableName) => {
          const queryBuilder = target.from(tableName);
          if (!PHI_REGISTRY[tableName]) {
            // For tables without PHI, we still wrap it so we can deepDecrypt any nested joined data
            // (e.g., `doctors` joining `patients`)
            return wrapQueryBuilder(queryBuilder, []);
          }
          return wrapQueryBuilder(queryBuilder, PHI_REGISTRY[tableName]);
        };
      }
      return target[prop];
    }
  });
}

module.exports = {
  createSupabasePHIProxy,
  PHI_REGISTRY
};
