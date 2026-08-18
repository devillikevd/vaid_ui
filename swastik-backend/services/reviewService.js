const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Service for managing Universal Reviews across the Vaididea ecosystem
 */
class ReviewService {
  /**
   * Verify patient interaction eligibility with target entity
   * Returns { isEligible: boolean, isVerified: boolean, resolvedConsultationId: string|null, sourceIdentifier: string }
   */
  async verifyEligibility(patientId, reviewableType, reviewableId, sourceType, sourceId, consultationId) {
    let isEligible = false;
    let isVerified = false;
    let resolvedConsultationId = null;
    let effectiveSourceType = sourceType;
    let effectiveSourceId = sourceId || consultationId;

    // 1. If explicit consultationId or sourceType === 'consultation'
    if (consultationId || effectiveSourceType === 'consultation') {
      const cId = consultationId || effectiveSourceId;
      const { data: consult } = await supabaseAdmin
        .from('consultations')
        .select('id, patient_id, doctor_id, status, appointment_id')
        .eq('id', cId)
        .maybeSingle();

      if (consult && consult.patient_id === patientId) {
        if (reviewableType === 'doctor' && consult.doctor_id === reviewableId) {
          resolvedConsultationId = consult.id;
          effectiveSourceType = 'consultation';
          effectiveSourceId = consult.id;
          if (consult.status === 'completed') {
            isEligible = true;
            isVerified = true;
          }
        }
      }
    }

    // 2. Doctor: Check completed appointments / consultations
    if (!isEligible && reviewableType === 'doctor') {
      if (effectiveSourceType === 'appointment' || effectiveSourceId) {
        const aptId = effectiveSourceId;
        const { data: apt } = await supabaseAdmin
          .from('appointments')
          .select('id, patient_id, doctor_id, status')
          .eq('id', aptId)
          .maybeSingle();

        if (apt && apt.patient_id === patientId && apt.doctor_id === reviewableId && apt.status === 'completed') {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'appointment';
          effectiveSourceId = apt.id;

          // Check if consultation exists for this appointment
          const { data: linked } = await supabaseAdmin
            .from('consultations')
            .select('id')
            .eq('appointment_id', apt.id)
            .maybeSingle();
          if (linked) resolvedConsultationId = linked.id;
        }
      }

      // If no explicit source provided, check any recent completed consultation/appointment
      if (!isEligible && !effectiveSourceId) {
        const { data: recentConsult } = await supabaseAdmin
          .from('consultations')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('doctor_id', reviewableId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentConsult) {
          isEligible = true;
          isVerified = true;
          resolvedConsultationId = recentConsult.id;
          effectiveSourceType = 'consultation';
          effectiveSourceId = recentConsult.id;
        } else {
          const { data: recentApt } = await supabaseAdmin
            .from('appointments')
            .select('id, status')
            .eq('patient_id', patientId)
            .eq('doctor_id', reviewableId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentApt) {
            isEligible = true;
            isVerified = true;
            effectiveSourceType = 'appointment';
            effectiveSourceId = recentApt.id;
          }
        }
      }
    }

    // 3. Clinic: Check completed appointments / consultations at this clinic
    if (!isEligible && reviewableType === 'clinic') {
      if (effectiveSourceId) {
        const { data: apt } = await supabaseAdmin
          .from('appointments')
          .select('id, patient_id, clinic_id, status')
          .eq('id', effectiveSourceId)
          .maybeSingle();

        if (apt && apt.patient_id === patientId && apt.clinic_id === reviewableId && apt.status === 'completed') {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'appointment';
          effectiveSourceId = apt.id;
        }
      }

      if (!isEligible) {
        const { data: recentApt } = await supabaseAdmin
          .from('appointments')
          .select('id')
          .eq('patient_id', patientId)
          .eq('clinic_id', reviewableId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentApt) {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'appointment';
          effectiveSourceId = recentApt.id;
        }
      }
    }

    // 4. Hospital: Check discharged referrals or completed hospital appointments
    if (!isEligible && reviewableType === 'hospital') {
      if (effectiveSourceType === 'hospital_referral' || effectiveSourceId) {
        const { data: ref } = await supabaseAdmin
          .from('patient_referrals')
          .select('id, patient_id, target_hospital_id, status')
          .eq('id', effectiveSourceId)
          .maybeSingle();

        if (ref && ref.patient_id === patientId && ref.target_hospital_id === reviewableId) {
          if (ref.status === 'discharged' || ref.status === 'accepted') {
            isEligible = true;
            isVerified = true;
            effectiveSourceType = 'hospital_referral';
            effectiveSourceId = ref.id;
          }
        }
      }

      if (!isEligible) {
        const { data: recentRef } = await supabaseAdmin
          .from('patient_referrals')
          .select('id')
          .eq('patient_id', patientId)
          .eq('target_hospital_id', reviewableId)
          .in('status', ['discharged', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentRef) {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'hospital_referral';
          effectiveSourceId = recentRef.id;
        } else {
          // Check completed hospital appointment
          const { data: recentApt } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('patient_id', patientId)
            .eq('hospital_id', reviewableId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentApt) {
            isEligible = true;
            isVerified = true;
            effectiveSourceType = 'appointment';
            effectiveSourceId = recentApt.id;
          }
        }
      }
    }

    // 5. Pharmacy: Check delivered/completed pharmacy orders
    if (!isEligible && reviewableType === 'pharmacy') {
      if (effectiveSourceId) {
        const { data: order } = await supabaseAdmin
          .from('pharmacy_orders')
          .select('id, patient_id, pharmacy_id, status')
          .eq('id', effectiveSourceId)
          .maybeSingle();

        if (order && order.patient_id === patientId && order.pharmacy_id === reviewableId) {
          const s = (order.status || '').toLowerCase();
          if (s === 'delivered' || s === 'completed' || s === 'ready') {
            isEligible = true;
            isVerified = true;
            effectiveSourceType = 'pharmacy_order';
            effectiveSourceId = order.id;
          }
        }
      }

      if (!isEligible) {
        const { data: recentOrder } = await supabaseAdmin
          .from('pharmacy_orders')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('pharmacy_id', reviewableId)
          .order('created_at', { ascending: false })
          .limit(5);

        const match = (recentOrder || []).find(o => {
          const s = (o.status || '').toLowerCase();
          return s === 'delivered' || s === 'completed' || s === 'ready';
        });

        if (match) {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'pharmacy_order';
          effectiveSourceId = match.id;
        }
      }
    }

    // 6. Diagnostic Center: Check completed diagnostic bookings
    if (!isEligible && reviewableType === 'diagnostic_center') {
      if (effectiveSourceId) {
        const { data: booking } = await supabaseAdmin
          .from('diagnostic_bookings')
          .select('id, patient_id, center_id, status')
          .eq('id', effectiveSourceId)
          .maybeSingle();

        if (booking && booking.patient_id === patientId && booking.center_id === reviewableId) {
          const s = (booking.status || '').toLowerCase();
          if (s === 'completed' || s === 'delivered' || s === 'sample_collected') {
            isEligible = true;
            isVerified = true;
            effectiveSourceType = 'diagnostic_booking';
            effectiveSourceId = booking.id;
          }
        }
      }

      if (!isEligible) {
        const { data: recentBooking } = await supabaseAdmin
          .from('diagnostic_bookings')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('center_id', reviewableId)
          .order('created_at', { ascending: false })
          .limit(5);

        const match = (recentBooking || []).find(b => {
          const s = (b.status || '').toLowerCase();
          return s === 'completed' || s === 'delivered' || s === 'sample_collected';
        });

        if (match) {
          isEligible = true;
          isVerified = true;
          effectiveSourceType = 'diagnostic_booking';
          effectiveSourceId = match.id;
        }
      }
    }

    // 7. Wellness / Fitness
    if (!isEligible && (reviewableType === 'wellness_coach' || reviewableType === 'fitness_center')) {
      isEligible = true;
      isVerified = true;
    }

    const sourceIdentifier = effectiveSourceType && effectiveSourceId ? `SRC:${effectiveSourceType}:${effectiveSourceId}` : null;

    return {
      isEligible,
      isVerified,
      resolvedConsultationId,
      sourceType: effectiveSourceType,
      sourceId: effectiveSourceId,
      sourceIdentifier
    };
  }

  /**
   * Submit a review for a doctor, hospital, clinic, pharmacy, or diagnostic center
   */
  async submitReview(patientId, data) {
    const {
      reviewableType,
      reviewableId,
      sourceType,
      sourceId,
      consultationId,
      rating,
      title,
      comment,
      isAnonymous
    } = data;

    if (!reviewableType || !reviewableId || !rating) {
      throw new ApiError(400, 'Missing required review fields (reviewableType, reviewableId, rating)');
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new ApiError(400, 'Rating must be an integer between 1 and 5');
    }

    // Perform transaction-based eligibility verification
    const eligibility = await this.verifyEligibility(
      patientId,
      reviewableType,
      reviewableId,
      sourceType,
      sourceId,
      consultationId
    );

    if (!eligibility.isEligible) {
      throw new ApiError(403, 'You can only review services that have been successfully completed.');
    }

    // Find existing review to update (Duplicate review protection / Edit mode)
    let existingReviewId = null;

    if (eligibility.resolvedConsultationId) {
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('consultation_id', eligibility.resolvedConsultationId)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    }

    if (!existingReviewId && eligibility.sourceIdentifier) {
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('reviewable_type', reviewableType)
        .eq('reviewable_id', reviewableId)
        .eq('title', eligibility.sourceIdentifier)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    }

    if (!existingReviewId && !eligibility.sourceId) {
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('patient_id', patientId)
        .eq('reviewable_type', reviewableType)
        .eq('reviewable_id', reviewableId)
        .is('consultation_id', null)
        .maybeSingle();
      if (existing) existingReviewId = existing.id;
    }

    // Format title to embed source marker if no custom title provided
    let storedTitle = title ? title.trim() : null;
    if (!storedTitle && eligibility.sourceIdentifier) {
      storedTitle = eligibility.sourceIdentifier;
    }

    const reviewPayload = {
      patient_id: patientId,
      reviewable_type: reviewableType,
      reviewable_id: reviewableId,
      consultation_id: eligibility.resolvedConsultationId,
      rating: numericRating,
      title: storedTitle,
      comment: comment ? comment.trim() : null,
      is_anonymous: Boolean(isAnonymous),
      is_verified: eligibility.isVerified,
      is_approved: true,
      is_visible: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingReviewId) {
      const { data: updated, error } = await supabaseAdmin
        .from('reviews')
        .update(reviewPayload)
        .eq('id', existingReviewId)
        .select()
        .single();

      if (error) throw new ApiError(500, `Failed to update review: ${error.message}`);
      result = updated;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single();

      if (error && error.code === '23503') {
        // FK Fallback if consultation_id foreign key check fails
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
        result = inserted;
      }
    }

    // Recalculate target rating aggregate
    this.updateAggregateRating(reviewableType, reviewableId).catch(err =>
      console.error('Aggregate rating update failed:', err.message)
    );

    return result;
  }

  /**
   * Get reviews for a specific entity with accurate rating breakdowns
   */
  async getEntityReviews(type, id, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Fetch total reviews and rating counts
    const { data: allRatings, error: countErr } = await supabaseAdmin
      .from('reviews')
      .select('rating, is_verified')
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .eq('is_visible', true)
      .eq('is_approved', true);

    if (countErr) throw new ApiError(500, 'Failed to fetch review metrics');

    const total = allRatings?.length || 0;
    let sum = 0;
    let verifiedCount = 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    (allRatings || []).forEach(r => {
      sum += r.rating || 0;
      if (r.rating >= 1 && r.rating <= 5) {
        ratingCounts[r.rating]++;
      }
      if (r.is_verified) verifiedCount++;
    });

    const averageRating = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    // Fetch paginated reviews with patient info
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, patient:patients(id, name, profile_image_url)', { count: 'exact' })
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .eq('is_visible', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(500, 'Failed to fetch reviews');

    const reviews = (data || []).map(r => {
      const review = { ...r };
      if (review.is_anonymous) {
        review.patient = { name: 'Anonymous', profile_image_url: null };
      }
      // Clean internal markers from title
      if (review.title && (review.title.startsWith('SRC:') || review.title.startsWith('AID:'))) {
        review.title = null;
      }
      // Map doctor_response helper if response exists
      if (review.response) {
        review.doctor_response = {
          content: review.response,
          created_at: review.responded_at || review.updated_at
        };
      }
      return review;
    });

    return {
      data: reviews,
      metrics: {
        totalReviews: total,
        averageRating,
        verifiedReviews: verifiedCount,
        distribution: ratingCounts
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Provider responds to a patient review
   */
  async respondToReview(reviewId, responderUserId, responseText) {
    if (!responseText || !responseText.trim()) {
      throw new ApiError(400, 'Response text is required');
    }

    const { data: review, error: findErr } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (findErr || !review) {
      throw new ApiError(404, 'Review not found');
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('reviews')
      .update({
        response: responseText.trim(),
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateErr) throw new ApiError(500, `Failed to post response: ${updateErr.message}`);

    return updated;
  }

  /**
   * Report an inappropriate review for moderation
   */
  async reportReview(reviewId, reporterUserId, reason, details) {
    const { data: review, error: findErr } = await supabaseAdmin
      .from('reviews')
      .select('id, admin_response')
      .eq('id', reviewId)
      .maybeSingle();

    if (findErr || !review) {
      throw new ApiError(404, 'Review not found');
    }

    const reportData = {
      isReported: true,
      reason: reason || 'Other',
      details: details || null,
      reportedBy: reporterUserId,
      reportedAt: new Date().toISOString()
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('reviews')
      .update({
        admin_response: JSON.stringify(reportData),
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateErr) throw new ApiError(500, `Failed to report review: ${updateErr.message}`);

    return { success: true, message: 'Review reported for moderation.' };
  }

  /**
   * Discover unreviewed completed services for a patient
   */
  async getPendingReviews(patientId) {
    const pending = [];

    // 1. Check completed appointments
    const { data: completedApts } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_number, appointment_date, time_slot, type, doctor:doctors(id, name, specialization, profile_image_url), clinic:clinics(id, name, city)')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .limit(20);

    // 2. Check delivered pharmacy orders
    const { data: completedOrders } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('id, order_number, total_amount, created_at, pharmacy:pharmacies(id, name, city, address)')
      .eq('patient_id', patientId)
      .in('status', ['delivered', 'completed', 'Delivered', 'Completed'])
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Check completed diagnostic bookings
    const { data: completedBookings } = await supabaseAdmin
      .from('diagnostic_bookings')
      .select('id, booking_number, booking_date, center:diagnostic_centers(id, name, city), test:diagnostic_tests(name)')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false })
      .limit(10);

    // 4. Check discharged hospital referrals
    const { data: dischargedReferrals } = await supabaseAdmin
      .from('patient_referrals')
      .select('id, reason, urgency, discharged_at, created_at, hospital:hospitals(id, name, city)')
      .eq('patient_id', patientId)
      .in('status', ['discharged', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch all existing reviews by this patient to filter out reviewed services
    const { data: patientReviews } = await supabaseAdmin
      .from('reviews')
      .select('reviewable_type, reviewable_id, consultation_id, title')
      .eq('patient_id', patientId);

    const reviewedKeys = new Set(
      (patientReviews || []).map(r => {
        if (r.consultation_id) return `consultation:${r.consultation_id}`;
        if (r.title && r.title.startsWith('SRC:')) return r.title.replace('SRC:', '');
        return `${r.reviewable_type}:${r.reviewable_id}`;
      })
    );

    // Map appointments (Doctor & Clinic review opportunities)
    (completedApts || []).forEach(apt => {
      if (apt.doctor && !reviewedKeys.has(`appointment:${apt.id}`) && !reviewedKeys.has(`doctor:${apt.doctor.id}`)) {
        pending.push({
          sourceType: 'appointment',
          sourceId: apt.id,
          targetType: 'doctor',
          targetId: apt.doctor.id,
          targetName: apt.doctor.name,
          targetSubtitle: apt.doctor.specialization || 'Doctor',
          targetImageUrl: apt.doctor.profile_image_url || null,
          date: apt.appointment_date,
          serviceLabel: `Consultation (${apt.type || 'Video'})`
        });
      }

      if (apt.clinic && !reviewedKeys.has(`appointment:${apt.id}`) && !reviewedKeys.has(`clinic:${apt.clinic.id}`)) {
        pending.push({
          sourceType: 'appointment',
          sourceId: apt.id,
          targetType: 'clinic',
          targetId: apt.clinic.id,
          targetName: apt.clinic.name,
          targetSubtitle: apt.clinic.city ? `Clinic in ${apt.clinic.city}` : 'Clinic',
          date: apt.appointment_date,
          serviceLabel: 'Clinic Visit'
        });
      }
    });

    // Map pharmacy orders
    (completedOrders || []).forEach(order => {
      if (order.pharmacy && !reviewedKeys.has(`pharmacy_order:${order.id}`)) {
        pending.push({
          sourceType: 'pharmacy_order',
          sourceId: order.id,
          targetType: 'pharmacy',
          targetId: order.pharmacy.id,
          targetName: order.pharmacy.name,
          targetSubtitle: order.pharmacy.city ? `Pharmacy in ${order.pharmacy.city}` : 'Pharmacy',
          date: new Date(order.created_at).toISOString().split('T')[0],
          serviceLabel: `Medicine Order #${order.order_number || order.id.slice(0, 8)}`
        });
      }
    });

    // Map diagnostic bookings
    (completedBookings || []).forEach(booking => {
      if (booking.center && !reviewedKeys.has(`diagnostic_booking:${booking.id}`)) {
        pending.push({
          sourceType: 'diagnostic_booking',
          sourceId: booking.id,
          targetType: 'diagnostic_center',
          targetId: booking.center.id,
          targetName: booking.center.name,
          targetSubtitle: booking.test?.name ? `Test: ${booking.test.name}` : 'Diagnostic Center',
          date: booking.booking_date,
          serviceLabel: `Diagnostic Test #${booking.booking_number || booking.id.slice(0, 8)}`
        });
      }
    });

    // Map hospital referrals
    (dischargedReferrals || []).forEach(ref => {
      if (ref.hospital && !reviewedKeys.has(`hospital_referral:${ref.id}`)) {
        pending.push({
          sourceType: 'hospital_referral',
          sourceId: ref.id,
          targetType: 'hospital',
          targetId: ref.hospital.id,
          targetName: ref.hospital.name,
          targetSubtitle: ref.hospital.city ? `Hospital in ${ref.hospital.city}` : 'Hospital',
          date: (ref.discharged_at || ref.created_at || '').split('T')[0],
          serviceLabel: `Hospital Care (${ref.urgency || 'Care'})`
        });
      }
    });

    return pending;
  }

  /**
   * Recalculate and update the aggregate rating and total_reviews on the entity table
   */
  async updateAggregateRating(reviewableType, reviewableId) {
    let tableName;
    switch (reviewableType) {
      case 'doctor': tableName = 'doctors'; break;
      case 'hospital': tableName = 'hospitals'; break;
      case 'clinic': tableName = 'clinics'; break;
      case 'pharmacy': tableName = 'pharmacies'; break;
      case 'diagnostic_center': tableName = 'diagnostic_centers'; break;
      case 'wellness_coach': tableName = 'wellness_coaches'; break;
      case 'fitness_center': tableName = 'fitness_centers'; break;
      default: return;
    }

    const { data: allReviews, error } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('reviewable_type', reviewableType)
      .eq('reviewable_id', reviewableId)
      .eq('is_visible', true)
      .eq('is_approved', true);

    if (error) return;

    const totalReviews = allReviews ? allReviews.length : 0;
    const avgRating = totalReviews > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews) * 10) / 10
      : 0;

    await supabaseAdmin
      .from(tableName)
      .update({
        rating: avgRating,
        total_reviews: totalReviews,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewableId);
  }
}

module.exports = new ReviewService();
