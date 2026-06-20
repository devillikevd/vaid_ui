const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

class ConsentService {
  async getConsents(patientId, status = 'active') {
    let query = supabaseAdmin
      .from('patient_consents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
      
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async grantConsent({ patientId, entityType, entityId, entityName, purpose, durationDays = 365 }) {
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    
    // Deactivate previous active consents for this exact entity to avoid duplicates
    await supabaseAdmin
      .from('patient_consents')
      .update({ status: 'expired' })
      .eq('patient_id', patientId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'active');

    const { data, error } = await supabaseAdmin
      .from('patient_consents')
      .insert({
        patient_id: patientId,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        purpose: purpose,
        status: 'active',
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async revokeConsent(patientId, consentId, reason = 'Patient manually revoked consent') {
    const { data: consent } = await supabaseAdmin
      .from('patient_consents')
      .select('id, patient_id')
      .eq('id', consentId)
      .single();

    if (!consent || consent.patient_id !== patientId) {
      throw new ApiError(404, 'Consent record not found');
    }

    const { data, error } = await supabaseAdmin
      .from('patient_consents')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revocation_reason: reason
      })
      .eq('id', consentId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async verifyConsent(patientId, entityType, entityId) {
    const { data, error } = await supabaseAdmin
      .from('patient_consents')
      .select('id')
      .eq('patient_id', patientId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }
}

module.exports = new ConsentService();
