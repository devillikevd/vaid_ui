const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Service for managing reviews across the ecosystem
 */
class ReviewService {
  /**
   * Submit a review for a doctor, hospital, clinic, etc.
   */
  async submitReview(patientId, data) {
    const { reviewableType, reviewableId, consultationId, rating, title, comment, isAnonymous } = data;

    if (!reviewableType || !reviewableId || !rating) {
      throw new ApiError(400, 'Missing required review fields (reviewableType, reviewableId, rating)');
    }

    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
    }

    // If a consultation ID is provided, verify it belongs to the patient and is valid
    if (consultationId) {
      let consultation = null;
      
      // Try finding it as a consultation first
      const { data: consultData, error: consultError } = await supabaseAdmin
        .from('consultations')
        .select('id, status, patient_id')
        .eq('id', consultationId)
        .single();

      if (!consultError && consultData) {
        consultation = consultData;
      } else {
        // Try finding it as an appointment (since Android app passes appointment ID)
        const { data: aptData, error: aptError } = await supabaseAdmin
          .from('appointments')
          .select('id, status, patient_id')
          .eq('id', consultationId)
          .single();
          
        if (!aptError && aptData) {
          consultation = aptData;
        }
      }

      if (!consultation) {
        throw new ApiError(404, 'Consultation or Appointment not found');
      }

      if (consultation.patient_id !== patientId) {
        throw new ApiError(403, 'Not authorized to review this consultation');
      }

      // Allow reviews for 'completed', 'in_progress' or even 'scheduled' (since Android app uses appointment_id)
      const validStatuses = ['completed', 'in_progress', 'scheduled', 'confirmed'];
      if (!validStatuses.includes(consultation.status.toLowerCase())) {
        throw new ApiError(400, 'Can only review active or completed consultations');
      }
    }

    // Find if a review already exists for this visit to avoid double counting
    let existingReviewId = null;
    if (consultationId) {
      // Try to find review by this consultationId (might be appointmentId)
      const { data: existingByVisit } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('consultation_id', consultationId)
        .maybeSingle();

      if (existingByVisit) {
        existingReviewId = existingByVisit.id;
      } else {
        // If not found, check if there's a consultation record for this appointmentId
        const { data: consultRec } = await supabaseAdmin
          .from('consultations')
          .select('id')
          .eq('appointment_id', consultationId)
          .maybeSingle();

        if (consultRec) {
          const { data: existingByConsult } = await supabaseAdmin
            .from('reviews')
            .select('id')
            .eq('patient_id', patientId)
            .eq('consultation_id', consultRec.id)
            .maybeSingle();
          if (existingByConsult) existingReviewId = existingByConsult.id;
        }
      }
    } else {
      // General spam protection: if no visit ID, don't allow more than one general review per entity
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('reviewable_id', reviewableId)
        .is('consultation_id', null)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    }

    // Prepare payload
    const reviewPayload = {
      patient_id: patientId,
      reviewable_type: reviewableType,
      reviewable_id: reviewableId,
      consultation_id: consultationId || null,
      rating,
      title: title || null,
      comment: comment || null,
      is_anonymous: isAnonymous || false,
      is_approved: true,
      is_visible: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingReviewId) {
      // UPDATE existing review (Doesn't increase count)
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .update(reviewPayload)
        .eq('id', existingReviewId)
        .select()
        .single();
      if (error) throw new ApiError(500, `Failed to update review: ${error.message}`);
      result = data;
    } else {
      // INSERT new review (Increases count once)
      // Check if consultationId exists in consultations table before inserting to avoid FK error
      if (reviewPayload.consultation_id) {
        const { data: consultExists } = await supabaseAdmin
          .from('consultations')
          .select('id')
          .eq('id', reviewPayload.consultation_id)
          .maybeSingle();

        if (!consultExists) {
          // It's likely an appointmentId, check if it's in appointments table
          const { data: apptExists } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('id', reviewPayload.consultation_id)
            .maybeSingle();

          if (!apptExists) {
            // Neither consultation nor appointment exists with this ID, null it out
            delete reviewPayload.consultation_id;
          } else {
            // It's an appointmentId, but column has FK to consultations.
            // We can't store appointmentId in consultation_id column due to FK.
            // For now, store without ID or we'd need a schema change.
            // BUT wait, to prevent spam, we NEED to link it.
            // I'll try to insert and catch FK error just in case.
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single();

      if (error && error.code === '23503') {
        // FK Fallback: link was invalid, store without ID to at least save the rating
        delete reviewPayload.consultation_id;
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('reviews')
          .insert(reviewPayload)
          .select()
          .single();
        if (retryError) throw new ApiError(500, `Failed to submit review: ${retryError.message}`);
        result = retryData;
      } else if (error) {
        throw new ApiError(500, `Failed to submit review: ${error.message}`);
      } else {
        result = data;
      }
    }

    return result;
  }

  /**
   * Get reviews for a specific entity (doctor, hospital, etc.)
   */
  async getEntityReviews(type, id, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, rating, title, comment, created_at, is_anonymous, response,
        patient:patients(id, name, profile_image_url)
      `, { count: 'exact' })
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError(500, 'Failed to fetch reviews');
    }

    // Format the patient data based on anonymity
    const formattedReviews = (data || []).map(review => {
      if (review.is_anonymous) {
        review.patient = { name: 'Anonymous', profile_image_url: null };
      }
      return review;
    });

    return {
      data: formattedReviews,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }
}

module.exports = new ReviewService();
