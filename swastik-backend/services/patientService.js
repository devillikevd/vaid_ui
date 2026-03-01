const { supabaseAdmin } = require('../config/supabase');
const { uploadProfileImage, deleteFile, getPresignedUrl } = require('../config/minio');
const { ApiError } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/helpers');

class PatientService {
  // Get patient profile
  async getProfile(userId) {
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select(`
        *,
        user:users(email, phone, is_verified, created_at)
      `)
      .eq('user_id', userId)
      .single();

    if (error || !patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    // Get additional data
    const [
      { data: emergencyContacts },
      { data: familyMembers },
      { count: appointmentCount },
      { count: reportCount }
    ] = await Promise.all([
      supabaseAdmin.from('emergency_contacts').select('*').eq('patient_id', patient.id),
      supabaseAdmin.from('family_members').select('*').eq('patient_id', patient.id),
      supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('patient_id', patient.id),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('patient_id', patient.id),
    ]);

    return {
      ...patient,
      emergencyContacts: emergencyContacts || [],
      familyMembers: familyMembers || [],
      stats: {
        appointments: appointmentCount || 0,
        reports: reportCount || 0,
      },
    };
  }

  // Update patient profile
  async updateProfile(userId, updateData) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    // Only include fields that are explicitly provided (not undefined)
    // Whitelist approach to prevent mass-assignment
    const updateFields = { updated_at: new Date().toISOString() };
    if (updateData.name !== undefined) updateFields.name = String(updateData.name).trim().slice(0, 100);
    if (updateData.dateOfBirth !== undefined || updateData.date_of_birth !== undefined) {
      updateFields.date_of_birth = updateData.dateOfBirth || updateData.date_of_birth;
    }
    if (updateData.gender !== undefined) {
      const validGenders = ['male', 'female', 'other'];
      if (validGenders.includes(updateData.gender)) updateFields.gender = updateData.gender;
    }
    if (updateData.bloodGroup !== undefined) {
      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      if (validBloodGroups.includes(updateData.bloodGroup)) updateFields.blood_group = updateData.bloodGroup;
    }
    if (updateData.weight !== undefined) {
      const weight = parseFloat(updateData.weight);
      if (!isNaN(weight) && weight > 0 && weight < 500) updateFields.weight = weight;
    }
    if (updateData.height !== undefined) {
      const height = parseFloat(updateData.height);
      if (!isNaN(height) && height > 0 && height < 300) updateFields.height = height;
    }
    if (updateData.location !== undefined) updateFields.address = String(updateData.location).trim().slice(0, 200);
    if (updateData.address !== undefined) updateFields.address = String(updateData.address).trim().slice(0, 200);
    if (updateData.city !== undefined) updateFields.city = String(updateData.city).trim().slice(0, 100);
    if (updateData.state !== undefined) updateFields.state = String(updateData.state).trim().slice(0, 100);
    if (updateData.pincode !== undefined) updateFields.pincode = String(updateData.pincode).trim().slice(0, 10);
    if (updateData.abhaNumber !== undefined) updateFields.abha_number = String(updateData.abhaNumber).trim().slice(0, 50);

    const { data: updatedPatient, error } = await supabaseAdmin
      .from('patients')
      .update(updateFields)
      .eq('id', patient.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to update profile');
    }

    return updatedPatient;
  }

  // Upload profile image
  async uploadProfileImage(userId, file) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, profile_image_url')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    // Delete old image if exists
    if (patient.profile_image_url) {
      try {
        // Extract object path after the bucket name in the URL
        const urlParts = patient.profile_image_url.split('/');
        const bucketIndex = urlParts.findIndex(p => p === 'swastik-uploads' || p === 'swastik');
        const objectPath = bucketIndex >= 0 ? urlParts.slice(bucketIndex + 1).join('/') : urlParts.slice(-2).join('/');
        await deleteFile(objectPath);
      } catch (e) {
        console.log('Failed to delete old image:', e.message);
      }
    }

    // Upload new image
    const { url } = await uploadProfileImage(file, userId);

    // Update patient profile
    await supabaseAdmin
      .from('patients')
      .update({ profile_image_url: url })
      .eq('id', patient.id);

    return { url };
  }

  // Get dashboard data
  async getDashboard(userId) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, name')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    // Get upcoming appointments
    const { data: upcomingAppointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:doctors(id, name, specialization, profile_image_url)
      `)
      .eq('patient_id', patient.id)
      .in('status', ['scheduled', 'confirmed'])
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .limit(5);

    // Get active reminders
    const { data: reminders } = await supabaseAdmin
      .from('reminders')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
      .order('time', { ascending: true })
      .limit(10);

    // Get recent consultations
    const { data: recentConsultations } = await supabaseAdmin
      .from('consultations')
      .select(`
        *,
        doctor:doctors(id, name, specialization)
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get unread notifications
    const { data: notifications, count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recommended doctors (smart recommendation engine)
    const recommendedDoctors = await this.getRecommendedDoctors(patient.id, userId);

    return {
      patient: {
        id: patient.id,
        name: patient.name,
      },
      upcomingAppointments: upcomingAppointments || [],
      reminders: reminders || [],
      recentConsultations: recentConsultations || [],
      notifications: notifications || [],
      unreadNotificationCount: unreadCount || 0,
      recommendedDoctors,
    };
  }

  // ==================== SMART RECOMMENDATION ENGINE ====================

  /**
   * Recommend doctors based on patient's health profile, consultation history,
   * chatbot interactions, and medical conditions.
   * 
   * Priority order:
   * 1. Specialists matching chatbot-detected symptoms (recent chats)
   * 2. Specialists the patient has consulted before (follow-up care)
   * 3. Specialists matching patient's chronic conditions
   * 4. Fallback: top-rated, available doctors across all specializations
   */
  async getRecommendedDoctors(patientId, userId, limit = 8) {
    // Specialist mapping: condition/symptom keywords → specialization
    const CONDITION_SPECIALIST_MAP = {
      'Cardiologist': ['heart', 'chest pain', 'palpitations', 'blood pressure', 'hypertension', 'cholesterol', 'cardiac'],
      'Dermatologist': ['skin', 'rash', 'acne', 'eczema', 'hair loss', 'itching', 'psoriasis', 'dermatitis'],
      'Orthopedic': ['bone', 'joint', 'back pain', 'fracture', 'arthritis', 'knee', 'spine', 'osteoporosis'],
      'Neurologist': ['headache', 'migraine', 'dizziness', 'numbness', 'seizure', 'epilepsy', 'neuropathy'],
      'Gastroenterologist': ['stomach', 'digestion', 'acid reflux', 'constipation', 'diarrhea', 'ibs', 'liver', 'gerd'],
      'Pulmonologist': ['breathing', 'cough', 'asthma', 'lungs', 'respiratory', 'copd', 'bronchitis'],
      'ENT Specialist': ['ear', 'nose', 'throat', 'sinus', 'hearing', 'tonsil', 'vertigo'],
      'Ophthalmologist': ['eye', 'vision', 'glasses', 'cataract', 'glaucoma', 'retina'],
      'Gynecologist': ['period', 'pregnancy', 'menstrual', 'pcod', 'pcos', 'fertility', 'uterine'],
      'Pediatrician': ['child', 'baby', 'infant', 'kids', 'vaccination'],
      'Psychiatrist': ['anxiety', 'depression', 'stress', 'insomnia', 'mental health', 'bipolar'],
      'Endocrinologist': ['diabetes', 'thyroid', 'hormone', 'insulin', 'metabolic'],
      'Nephrologist': ['kidney', 'renal', 'dialysis', 'urinary'],
      'Urologist': ['prostate', 'bladder', 'urinary tract', 'uti'],
      'Oncologist': ['cancer', 'tumor', 'chemotherapy', 'oncology'],
      'General Physician': ['fever', 'cold', 'flu', 'checkup', 'general', 'fatigue', 'weakness'],
    };

    try {
      const targetSpecializations = new Set();
      const recommendationReasons = {};

      // --- Signal 1: Recent chatbot conversations (user messages) ---
      const { data: recentChatSessions } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (recentChatSessions?.length > 0) {
        const sessionIds = recentChatSessions.map(s => s.id);
        const { data: userMessages } = await supabaseAdmin
          .from('chat_messages')
          .select('content')
          .in('session_id', sessionIds)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(20);

        if (userMessages?.length > 0) {
          const allSymptomText = userMessages.map(m => m.content).join(' ').toLowerCase();
          for (const [specialist, keywords] of Object.entries(CONDITION_SPECIALIST_MAP)) {
            if (keywords.some(k => allSymptomText.includes(k))) {
              targetSpecializations.add(specialist);
              recommendationReasons[specialist] = 'Based on your recent symptoms';
            }
          }
        }
      }

      // --- Signal 2: Patient's past consultation specializations ---
      const { data: pastAppointments } = await supabaseAdmin
        .from('appointments')
        .select('doctor:doctors(specialization)')
        .eq('patient_id', patientId)
        .in('status', ['completed', 'confirmed', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastAppointments?.length > 0) {
        pastAppointments.forEach(apt => {
          const spec = apt.doctor?.specialization;
          if (spec) {
            targetSpecializations.add(spec);
            if (!recommendationReasons[spec]) {
              recommendationReasons[spec] = 'Based on your consultation history';
            }
          }
        });
      }

      // --- Signal 3: Patient's chronic conditions / medical profile ---
      const { data: patientProfile } = await supabaseAdmin
        .from('patients')
        .select('medical_conditions, allergies, chronic_conditions')
        .eq('id', patientId)
        .single();

      if (patientProfile) {
        const conditions = [
          ...(patientProfile.medical_conditions || []),
          ...(patientProfile.chronic_conditions || []),
        ].join(' ').toLowerCase();

        if (conditions) {
          for (const [specialist, keywords] of Object.entries(CONDITION_SPECIALIST_MAP)) {
            if (keywords.some(k => conditions.includes(k))) {
              targetSpecializations.add(specialist);
              if (!recommendationReasons[specialist]) {
                recommendationReasons[specialist] = 'Based on your health profile';
              }
            }
          }
        }
      }

      // --- Fetch doctors matching target specializations ---
      let recommendedDoctors = [];

      if (targetSpecializations.size > 0) {
        const { data: matchedDoctors } = await supabaseAdmin
          .from('doctors')
          .select('id, name, specialization, rating, experience_years, profile_image_url, consultation_fee, is_available')
          .eq('is_approved', true)
          .eq('is_available', true)
          .in('specialization', [...targetSpecializations])
          .order('rating', { ascending: false })
          .limit(limit);

        recommendedDoctors = (matchedDoctors || []).map(doc => ({
          ...doc,
          recommendation_reason: recommendationReasons[doc.specialization] || 'Recommended for you',
        }));
      }

      // --- Fallback: fill remaining slots with top-rated doctors ---
      if (recommendedDoctors.length < limit) {
        const existingIds = recommendedDoctors.map(d => d.id);
        const remaining = limit - recommendedDoctors.length;

        let fallbackQuery = supabaseAdmin
          .from('doctors')
          .select('id, name, specialization, rating, experience_years, profile_image_url, consultation_fee, is_available')
          .eq('is_approved', true)
          .eq('is_available', true)
          .order('rating', { ascending: false })
          .limit(remaining);

        if (existingIds.length > 0) {
          // Exclude already-recommended doctors
          fallbackQuery = fallbackQuery.not('id', 'in', `(${existingIds.join(',')})`);
        }

        const { data: fallbackDoctors } = await fallbackQuery;

        const fallbackWithReason = (fallbackDoctors || []).map(doc => ({
          ...doc,
          recommendation_reason: 'Top rated doctor',
        }));

        recommendedDoctors = [...recommendedDoctors, ...fallbackWithReason];
      }

      return recommendedDoctors;
    } catch (error) {
      console.error('Recommendation engine error:', error);
      // Graceful fallback: return top-rated doctors
      const { data: fallback } = await supabaseAdmin
        .from('doctors')
        .select('id, name, specialization, rating, experience_years, profile_image_url, consultation_fee, is_available')
        .eq('is_approved', true)
        .eq('is_available', true)
        .order('rating', { ascending: false })
        .limit(limit);

      return (fallback || []).map(doc => ({
        ...doc,
        recommendation_reason: 'Top rated doctor',
      }));
    }
  }

  // Get reminders
  async getReminders(userId, filters = {}) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    let query = supabaseAdmin
      .from('reminders')
      .select('*')
      .eq('patient_id', patient.id);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data: reminders, error } = await query
      .order('time', { ascending: true });

    if (error) {
      throw new ApiError(400, 'Failed to fetch reminders');
    }

    return reminders;
  }

  // Create reminder
  async createReminder(userId, reminderData) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { data: reminder, error } = await supabaseAdmin
      .from('reminders')
      .insert({
        patient_id: patient.id,
        title: reminderData.title,
        type: reminderData.type,
        time: reminderData.time,
        days: reminderData.days || [],
        notes: reminderData.notes,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to create reminder');
    }

    return reminder;
  }

  // Update reminder
  async updateReminder(userId, reminderId, updateData) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { data: reminder, error } = await supabaseAdmin
      .from('reminders')
      .update({
        title: updateData.title,
        type: updateData.type,
        time: updateData.time,
        days: updateData.days,
        notes: updateData.notes,
        is_active: updateData.isActive,
        is_completed: updateData.isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .eq('patient_id', patient.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to update reminder');
    }

    return reminder;
  }

  // Delete reminder
  async deleteReminder(userId, reminderId) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { error } = await supabaseAdmin
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('patient_id', patient.id);

    if (error) {
      throw new ApiError(400, 'Failed to delete reminder');
    }

    return { message: 'Reminder deleted successfully' };
  }

  // Add emergency contact
  async addEmergencyContact(userId, contactData) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { data: contact, error } = await supabaseAdmin
      .from('emergency_contacts')
      .insert({
        patient_id: patient.id,
        name: contactData.name,
        phone: contactData.phone,
        relationship: contactData.relation || contactData.relationship,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to add emergency contact');
    }

    return contact;
  }

  // Delete emergency contact
  async deleteEmergencyContact(userId, contactId) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { error } = await supabaseAdmin
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('patient_id', patient.id);

    if (error) {
      throw new ApiError(400, 'Failed to delete emergency contact');
    }

    return { message: 'Emergency contact deleted successfully' };
  }

  // Add family member
  async addFamilyMember(userId, memberData) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { data: member, error } = await supabaseAdmin
      .from('family_members')
      .insert({
        patient_id: patient.id,
        name: memberData.name,
        relationship: memberData.relation || memberData.relationship,
        date_of_birth: memberData.dateOfBirth || memberData.date_of_birth || null,
        gender: memberData.gender,
        blood_group: memberData.bloodGroup || memberData.blood_group || null,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(400, 'Failed to add family member');
    }

    return member;
  }

  // Delete family member
  async deleteFamilyMember(userId, memberId) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      throw new ApiError(404, 'Patient profile not found');
    }

    const { error } = await supabaseAdmin
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('patient_id', patient.id);

    if (error) {
      throw new ApiError(400, 'Failed to delete family member');
    }

    return { message: 'Family member deleted successfully' };
  }
}

module.exports = new PatientService();
