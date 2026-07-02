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

    // Resolve real IDs for database constraints
    let realConsultationId = null;
    let appointmentIdMarker = null;

    if (consultationId) {
      // 1. Is it a real Consultation ID?
      const { data: consult } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('id', consultationId)
        .maybeSingle();

      if (consult) {
        realConsultationId = consult.id;
      } else {
        // 2. Is it an Appointment ID?
        const { data: apt } = await supabaseAdmin
          .from('appointments')
          .select('id')
          .eq('id', consultationId)
          .maybeSingle();

        if (apt) {
          appointmentIdMarker = apt.id;
          // Check for linked consultation
          const { data: linked } = await supabaseAdmin
            .from('consultations')
            .select('id')
            .eq('appointment_id', apt.id)
            .maybeSingle();
          if (linked) realConsultationId = linked.id;
        }
      }
    }

    // Find existing review to update (Spam protection + Edit feature)
    let existingReviewId = null;
    if (realConsultationId) {
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('consultation_id', realConsultationId)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    } else if (appointmentIdMarker) {
      // Use AID: marker in title to find previous review for this appointment
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('reviewable_id', reviewableId)
        .eq('title', `AID:${appointmentIdMarker}`)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    } else {
      // General review (one per doctor)
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
      consultation_id: realConsultationId,
      rating,
      title: realConsultationId ? (title || null) : `AID:${appointmentIdMarker || consultationId || 'GENERAL'}`,
      comment: comment || null,
      is_anonymous: isAnonymous || false,
      is_approved: true,
      is_visible: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingReviewId) {
      // UPDATE (Edit Mode)
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .update(reviewPayload)
        .eq('id', existingReviewId)
        .select()
        .single();
      if (error) throw new ApiError(500, `Failed to update review: ${error.message}`);
      result = data;
    } else {
      // INSERT (New Review)
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single();

      if (error && error.code === '23503') {
        // FK Fallback: Save without consultation_id but keep AID in title
        delete reviewPayload.consultation_id;
        const { data: retry, error: retryErr } = await supabaseAdmin
          .from('reviews')
          .insert(reviewPayload)
          .select()
          .single();
        if (retryErr) throw new ApiError(500, `Failed to submit review: ${retryErr.message}`);
        result = retry;
      } else if (error) {
        throw new ApiError(500, `Failed to submit review: ${error.message}`);
      } else {
        result = data;
      }
    }

    // Trigger aggregate update
    this.updateAggregateRating(reviewableType, reviewableId).catch(err =>
      console.error('Aggregate update failed:', err.message)
    );

    return result;
  }

  /**
   * Get reviews for a specific entity
   */
  async getEntityReviews(type, id, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { data, count, error } = await supabaseAdmin
      .from('reviews')
      .select('*, patient:patients(id, name, profile_image_url)', { count: 'exact' })
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(500, 'Failed to fetch reviews');

    return {
      data: (data || []).map(r => {
        const review = { ...r };
        if (review.is_anonymous) {
            review.patient = { name: 'Anonymous', profile_image_url: null };
        }
        // Clean AID marker from title for UI
        if (review.title && review.title.startsWith('AID:')) {
            review.title = null;
        }
        return review;
      }),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Recalculate and update the aggregate rating and total_reviews
   */
  async updateAggregateRating(reviewableType, reviewableId) {
    const { data: allReviews, error } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('reviewable_type', reviewableType)
      .eq('reviewable_id', reviewableId)
      .eq('is_visible', true);

    if (error || !allReviews || allReviews.length === 0) return;

    const totalReviews = allReviews.length;
    const avgRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews;
    const roundedRating = Math.round(avgRating * 10) / 10;

    let tableName;
    switch (reviewableType) {
      case 'doctor': tableName = 'doctors'; break;
      case 'hospital': tableName = 'hospitals'; break;
      case 'clinic': tableName = 'clinics'; break;
      case 'pharmacy': tableName = 'pharmacies'; break;
      case 'diagnostic_center': tableName = 'diagnostic_centers'; break;
      default: return;
    }

    await supabaseAdmin
      .from(tableName)
      .update({
        rating: roundedRating,
        total_reviews: totalReviews,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewableId);
  }
}

module.exports = new ReviewService();
