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

    // If a consultation ID is provided, verify it belongs to the patient and is completed
    if (consultationId) {
      const { data: consultation, error: consultationError } = await supabaseAdmin
        .from('consultations')
        .select('id, status, patient_id')
        .eq('id', consultationId)
        .single();

      if (consultationError || !consultation) {
        throw new ApiError(404, 'Consultation not found');
      }

      if (consultation.patient_id !== patientId) {
        throw new ApiError(403, 'Not authorized to review this consultation');
      }

      if (consultation.status !== 'completed') {
        throw new ApiError(400, 'Can only review completed consultations');
      }

      // Check for duplicate review for this specific consultation and entity
      const { data: existingReview } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('reviewable_type', reviewableType)
        .eq('reviewable_id', reviewableId)
        .eq('consultation_id', consultationId)
        .single();

      if (existingReview) {
        throw new ApiError(400, 'You have already reviewed this for this consultation');
      }
    }

    // Insert the review
    // (This will trigger `update_entity_rating_from_review()` in the DB)
    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        patient_id: patientId,
        reviewable_type: reviewableType,
        reviewable_id: reviewableId,
        consultation_id: consultationId || null,
        rating,
        title: title || null,
        comment: comment || null,
        is_anonymous: isAnonymous || false,
        is_approved: true, // Auto-approve for now
        is_visible: true
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to submit review');
    }

    return review;
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
        patient:patients(id, full_name, profile_image_url)
      `, { count: 'exact' })
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .eq('is_approved', true)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError(500, 'Failed to fetch reviews');
    }

    // Format the patient data based on anonymity
    const formattedReviews = (data || []).map(review => {
      if (review.is_anonymous) {
        review.patient = null;
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
