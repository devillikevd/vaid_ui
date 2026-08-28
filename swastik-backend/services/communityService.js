const { supabaseAdmin, rawSupabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const notificationService = require('./notificationService');
const { cacheSetIfNotExists, cacheDel } = require('../config/redis');

class CommunityService {
  async _enrichAnswersWithOrgData(questions) {
    const orgReqs = { pharmacy: new Set(), diagnostic_center: new Set(), clinic: new Set(), hospital: new Set() };
    
    questions.forEach(q => {
        if (q.answers) {
            q.answers.forEach(a => {
                if (a.responder_organization_id && orgReqs[a.responder_type]) {
                    orgReqs[a.responder_type].add(a.responder_organization_id);
                }
            });
        }
    });

    const orgCache = {};

    const fetchOrgs = async (table, ids) => {
        if (ids.length > 0) {
            const { data } = await rawSupabaseAdmin.from(table).select('id, name, is_verified').in('id', ids);
            if (data) data.forEach(org => orgCache[org.id] = { name: org.name, verified: org.is_verified });
        }
    };

    await Promise.all([
        fetchOrgs('pharmacies', Array.from(orgReqs.pharmacy)),
        fetchOrgs('diagnostic_centers', Array.from(orgReqs.diagnostic_center)),
        fetchOrgs('clinics', Array.from(orgReqs.clinic)),
        fetchOrgs('hospitals', Array.from(orgReqs.hospital))
    ]);

    questions.forEach(q => {
        if (q.answers) {
            q.answers.forEach(a => {
                if (a.responder_organization_id && orgCache[a.responder_organization_id]) {
                    a.responder_name = orgCache[a.responder_organization_id].name;
                    a.responder_verified = orgCache[a.responder_organization_id].verified;
                } else if (a.responder_type === 'doctor' && a.doctor) {
                    a.responder_name = a.doctor.name;
                    a.responder_verified = a.doctor.is_verified || false;
                } else if (a.responder_type === 'patient' && a.patient) {
                    a.responder_name = a.patient.name;
                    a.responder_verified = false;
                } else if (!a.responder_type) {
                    // Legacy fallbacks
                    if (a.doctor_id && a.doctor) {
                        a.responder_type = 'doctor';
                        a.responder_name = a.doctor.name;
                        a.responder_verified = a.doctor.is_verified || false;
                    } else if (a.patient_id && a.patient) {
                        a.responder_type = 'patient';
                        a.responder_name = a.patient.name;
                        a.responder_verified = false;
                    }
                }
            });
        }
    });
  }

  _buildSearchFilter(search) {
    if (!search || !search.trim()) return null;
    const clean = search.trim().replace(/[%_'"\\]/g, '');
    if (!clean) return null;

    const stopWords = new Set(['i', 'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'what', 'how', 'why', 'when', 'where', 'who', 'me', 'my', 'we', 'our', 'you', 'your']);
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    
    let keywords = words.filter(w => !stopWords.has(w.toLowerCase()) && w.length >= 2);
    if (keywords.length === 0) {
      keywords = words;
    }

    const conditions = [];
    conditions.push(`title.ilike.%${clean}%`);
    conditions.push(`content.ilike.%${clean}%`);
    conditions.push(`topic.ilike.%${clean}%`);
    conditions.push(`category.ilike.%${clean}%`);

    keywords.forEach(kw => {
      conditions.push(`title.ilike.%${kw}%`);
      conditions.push(`content.ilike.%${kw}%`);
      conditions.push(`topic.ilike.%${kw}%`);
      conditions.push(`category.ilike.%${kw}%`);
    });

    return conditions.join(',');
  }

  async getQuestions(limit = 20, offset = 0, filter = 'All', topic = null, search = null, userId = null, sortBy = 'recent', category = null, specialtyTarget = null, userRole = null) {
    if (userRole === 'pharmacy_owner') category = 'Medications';
    if (userRole === 'diagnostic_center_owner') category = 'Diagnostics';
    if (['Answered', 'Unanswered', 'Verified'].includes(filter)) {
      const dbFiltered = await this.getQuestionsFilteredAtDb(limit, offset, filter, topic, search, userId, sortBy, category, specialtyTarget);
      if (dbFiltered) return dbFiltered;
    }

    let query = rawSupabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, user_id, name, profile_image_url),
        answers:community_answers(
          *,
          doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
          patient:patients(id, name, profile_image_url)
        )
      `, { count: 'exact' });

    query = query.eq('status', 'active');

    if (topic) {
      query = query.eq('topic', topic);
    }
    
    if (category) {
      query = query.eq('category', category);
    }

    const searchFilter = this._buildSearchFilter(search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    if (filter === 'My Specialty') {
      if (userRole !== 'doctor' && userRole !== 'doctor_pending') {
        throw new ApiError(400, 'My Specialty filter is only available to doctors.');
      }
      if (userId) {
        const { data: doctor } = await rawSupabaseAdmin
          .from('doctors')
          .select('specialization, specializations')
          .eq('user_id', userId)
          .maybeSingle();

        if (doctor) {
          let specs = [];
          if (doctor.specializations && doctor.specializations.length > 0) {
            specs = doctor.specializations;
          } else if (doctor.specialization) {
            specs = [doctor.specialization];
          }
          
          if (specs.length > 0) {
             query = query.or(`specialty_target.in.(${specs.map(s => `"${s}"`).join(',')})`);
          }
        }
      }
    }

    if (filter === 'Relevant' && userId) {
      let orgSpecs = new Set();
      
      if (userRole === 'clinic_owner' || userRole === 'clinic_manager') {
        // Fetch clinic's ID
        const { data: clinic } = await rawSupabaseAdmin
          .from('clinics')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (clinic) {
          const { data: clinicDoctors } = await rawSupabaseAdmin
            .from('clinic_doctors')
            .select('doctor:doctors(specialization, specializations)')
            .eq('clinic_id', clinic.id)
            .eq('is_active', true);
            
          if (clinicDoctors) {
            clinicDoctors.forEach(cd => {
              if (cd.doctor) {
                if (cd.doctor.specializations && cd.doctor.specializations.length > 0) {
                  cd.doctor.specializations.forEach(s => orgSpecs.add(s));
                } else if (cd.doctor.specialization) {
                  orgSpecs.add(cd.doctor.specialization);
                }
              }
            });
          }
        }
      } else if (userRole === 'hospital_owner' || userRole === 'hospital_manager') {
        // Fetch hospital's ID
        const { data: hospital } = await rawSupabaseAdmin
          .from('hospitals')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (hospital) {
          const { data: hospitalDoctors } = await rawSupabaseAdmin
            .from('hospital_doctors')
            .select('doctor:doctors(specialization, specializations)')
            .eq('hospital_id', hospital.id);
            
          if (hospitalDoctors) {
            hospitalDoctors.forEach(hd => {
              if (hd.doctor) {
                if (hd.doctor.specializations && hd.doctor.specializations.length > 0) {
                  hd.doctor.specializations.forEach(s => orgSpecs.add(s));
                } else if (hd.doctor.specialization) {
                  orgSpecs.add(hd.doctor.specialization);
                }
              }
            });
          }
        }
      } else {
        throw new ApiError(400, 'Relevant filter is not supported for this role.');
      }
      
      const specsArr = Array.from(orgSpecs);
      if (specsArr.length > 0) {
        query = query.or(`specialty_target.in.(${specsArr.map(s => `"${s}"`).join(',')})`);
      } else {
        // No relevant specialties found, return empty set
        // Trick the query into returning zero rows efficiently
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (filter === 'Saved' && userId) {
      const { data: bookmarks } = await rawSupabaseAdmin
        .from('community_bookmarks')
        .select('question_id')
        .eq('user_id', userId);
      const bookmarkedIds = bookmarks?.map(b => b.question_id) || [];
      if (bookmarkedIds.length === 0) {
        return { questions: [], total: 0 };
      }
      query = query.in('id', bookmarkedIds);
      query = query.order('created_at', { ascending: false });
    } else if (filter === 'Trending') {
      query = query.order('views', { ascending: false }).order('upvotes', { ascending: false });
    } else {
      if (sortBy === 'upvotes') {
        query = query.order('upvotes', { ascending: false });
      } else if (sortBy === 'views') {
        query = query.order('views', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    }

    const { data: questions, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase Error fetching community_questions:", error);
      throw new ApiError(400, 'Failed to fetch questions');
    }

    let processedQuestions = questions.map(q => {
      if (q.is_anonymous && q.patient?.user_id !== userId) {
        q.patient = { name: 'Anonymous User', profile_image_url: null };
      }
      return {
        ...q,
        answers: q.answers?.filter(a => a.status === 'active') || [],
        answer_count: q.answers?.filter(a => a.status === 'active').length || 0,
        has_verified_answer: q.answers?.some(a => a.is_doctor_verified && a.status === 'active') || false
      };
    });

    if (filter === 'Answered') {
      processedQuestions = processedQuestions.filter(q => q.answer_count > 0);
    } else if (filter === 'Unanswered') {
      processedQuestions = processedQuestions.filter(q => q.answer_count === 0);
    } else if (filter === 'Verified') {
      processedQuestions = processedQuestions.filter(q => q.has_verified_answer);
    }

    let bookmarkedQuestionIds = [];
    let upvotedQuestionIds = [];
    if (userId) {
      const [bookmarksRes, upvotesRes] = await Promise.all([
        rawSupabaseAdmin
          .from('community_bookmarks')
          .select('question_id')
          .eq('user_id', userId),
        rawSupabaseAdmin
          .from('community_question_upvotes')
          .select('question_id')
          .eq('user_id', userId)
      ]);
      bookmarkedQuestionIds = bookmarksRes.data?.map(b => b.question_id) || [];
      upvotedQuestionIds = upvotesRes.data?.map(u => u.question_id) || [];
    }

    await this._enrichAnswersWithOrgData(processedQuestions);

    return {
      questions: processedQuestions.map(q => ({
        ...q,
        is_bookmarked: bookmarkedQuestionIds.includes(q.id),
        is_upvoted: upvotedQuestionIds.includes(q.id)
      })),
      total: count
    };
  }

  async getQuestionsFilteredAtDb(limit, offset, filter, topic, search, userId, sortBy, category, specialtyTarget) {
    try {
      let statsQuery = rawSupabaseAdmin
        .from('community_questions_with_stats')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      if (topic) {
        statsQuery = statsQuery.eq('topic', topic);
      }

      if (category) {
        statsQuery = statsQuery.eq('category', category);
      }

      const searchFilter = this._buildSearchFilter(search);
      if (searchFilter) {
        statsQuery = statsQuery.or(searchFilter);
      }

      if (filter === 'Answered') {
        statsQuery = statsQuery.gt('answer_count', 0);
      } else if (filter === 'Unanswered') {
        statsQuery = statsQuery.eq('answer_count', 0);
      } else if (filter === 'Verified') {
        statsQuery = statsQuery.eq('has_verified_answer', true);
      }

      if (sortBy === 'upvotes') {
        statsQuery = statsQuery.order('upvotes', { ascending: false });
      } else if (sortBy === 'views') {
        statsQuery = statsQuery.order('views', { ascending: false });
      } else {
        statsQuery = statsQuery.order('created_at', { ascending: false });
      }

      const { data: pageRows, count, error } = await statsQuery.range(offset, offset + limit - 1);
      if (error) {
        console.error("Supabase Error fetching community_questions_with_stats:", error);
        return null;
      }

      if (!pageRows || pageRows.length === 0) {
        return { questions: [], total: count || 0 };
      }

      const ids = pageRows.map(r => r.id);
      const { data: questions, error: detailError } = await rawSupabaseAdmin
        .from('community_questions')
        .select(`
          *,
          patient:patients(id, user_id, name, profile_image_url),
          answers:community_answers(
            *,
            doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
            patient:patients(id, name, profile_image_url)
          )
        `)
        .in('id', ids);

      if (detailError) return null;

      const sortedQuestions = ids.map(id => questions.find(q => q.id === id)).filter(Boolean);

      let bookmarkedQuestionIds = [];
      let upvotedQuestionIds = [];
      if (userId) {
        const [bookmarksRes, upvotesRes] = await Promise.all([
          rawSupabaseAdmin
            .from('community_bookmarks')
            .select('question_id')
            .eq('user_id', userId),
          rawSupabaseAdmin
            .from('community_question_upvotes')
            .select('question_id')
            .eq('user_id', userId)
        ]);
        bookmarkedQuestionIds = bookmarksRes.data?.map(b => b.question_id) || [];
        upvotedQuestionIds = upvotesRes.data?.map(u => u.question_id) || [];
      }

      const qResult = sortedQuestions.map(q => {
        if (q.is_anonymous && q.patient?.user_id !== userId) {
          q.patient = { name: 'Anonymous User', profile_image_url: null };
        }
        return {
          ...q,
          answers: q.answers?.filter(a => a.status === 'active') || [],
          answer_count: q.answers?.filter(a => a.status === 'active').length || 0,
          has_verified_answer: q.answers?.some(a => a.is_doctor_verified && a.status === 'active') || false,
          is_bookmarked: bookmarkedQuestionIds.includes(q.id),
          is_upvoted: upvotedQuestionIds.includes(q.id)
        };
      });

      await this._enrichAnswersWithOrgData(qResult);

      return {
        questions: qResult,
        total: count
      };
    } catch (e) {
      return null;
    }
  }

  async getQuestionDetails(questionId, userId = null, userRole = null) {
    const { data: question, error } = await rawSupabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, user_id, name, profile_image_url),
        answers:community_answers(
          *,
          doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
          patient:patients(id, name, profile_image_url)
        )
      `)
      .eq('id', questionId)
      .eq('status', 'active')
      .single();

    if (error || !question) throw new ApiError(404, 'Question not found');

    if (question.is_anonymous && question.patient?.user_id !== userId) {
      question.patient = { name: 'Anonymous User', profile_image_url: null };
    }

    question.answers = question.answers?.filter(a => a.status === 'active') || [];
    question.answers.sort((a, b) => {
      if (a.is_doctor_verified !== b.is_doctor_verified) {
        return a.is_doctor_verified ? -1 : 1;
      }
      return b.upvotes - a.upvotes;
    });

    question.answer_count = question.answers.length;
    question.has_verified_answer = question.answers.some(a => a.is_doctor_verified);

    let upvotedAnswerIds = [];
    if (userId) {
      const [bookmarkRes, qUpvoteRes, aUpvotesRes] = await Promise.all([
        rawSupabaseAdmin
          .from('community_bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('question_id', questionId)
          .maybeSingle(),
        rawSupabaseAdmin
          .from('community_question_upvotes')
          .select('id')
          .eq('user_id', userId)
          .eq('question_id', questionId)
          .maybeSingle(),
        rawSupabaseAdmin
          .from('community_answer_upvotes')
          .select('answer_id')
          .eq('user_id', userId)
      ]);
      question.is_bookmarked = !!bookmarkRes.data;
      question.is_upvoted = !!qUpvoteRes.data;
      upvotedAnswerIds = aUpvotesRes.data?.map(a => a.answer_id) || [];
    } else {
      question.is_bookmarked = false;
      question.is_upvoted = false;
    }

    if (question.answers) {
      question.answers = question.answers.map(ans => ({
        ...ans,
        is_upvoted: upvotedAnswerIds.includes(ans.id)
      }));
    }

    if (questionId) {
      this.incrementViews(questionId).catch(console.error);
      question.views = (question.views || 0) + 1;
    }

    await this._enrichAnswersWithOrgData([question]);

    return question;
  }

  async incrementViews(questionId) {
    const { error } = await rawSupabaseAdmin.rpc('increment_question_views', { q_id: questionId });
    if (error) {
      const { data: current } = await rawSupabaseAdmin
        .from('community_questions')
        .select('views')
        .eq('id', questionId)
        .single();
        
      if (current) {
        await rawSupabaseAdmin
          .from('community_questions')
          .update({ views: current.views + 1 })
          .eq('id', questionId);
      }
    }
  }

    async createQuestion(userId, title, content, topic = null, is_anonymous = false, attachments = [], category = null, specialty_target = null) {
      const ALLOWED_CATEGORIES = ['Medical', 'Medications', 'Diagnostics', 'Hospital / Referral', 'Clinic / Healthcare Services', 'General Health'];
      
      if (category && !ALLOWED_CATEGORIES.includes(category)) {
          throw new ApiError(400, 'Invalid category selected.');
      }
      
      if (specialty_target) {
          const { data: specCheck } = await rawSupabaseAdmin
            .from('doctors')
            .select('id')
            .or(`specialization.eq."${specialty_target}",specializations.cs.{"${specialty_target}"}`)
            .limit(1)
            .maybeSingle();
            
          if (!specCheck) {
              throw new ApiError(400, 'Invalid specialty target selected.');
          }
      }

      const { data: patient } = await rawSupabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) throw new ApiError(403, 'Only patients can ask questions');

    const { data: question, error } = await rawSupabaseAdmin
      .from('community_questions')
      .insert({
        patient_id: patient.id,
        title,
        content,
        topic,
        category,
        specialty_target,
        is_anonymous,
        attachments
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(400, `Failed to post question: ${error.message}`);
    }

    return question;
  }

  async addAnswer(userId, questionId, content, userRole) {
    let responder_type = 'doctor';
    let responder_organization_id = null;
    let responder_name = '';
    let responder_verified = false;
    let doctor_id = null;
    let doctor_name = '';

    const { data: qData } = await rawSupabaseAdmin
      .from('community_questions')
      .select('category, patient:patients(user_id), title')
      .eq('id', questionId)
      .single();

    if (!qData) throw new ApiError(404, 'Question not found');

    const checkOrgAuth = async (table, roleType, allowedCategories) => {
        const { data: org } = await rawSupabaseAdmin
            .from(table)
            .select('id, name, is_verified, is_approved')
            .eq('owner_id', userId)
            .maybeSingle();

        if (!org) throw new ApiError(403, `You are not authorized as a ${roleType} owner`);
        if (!org.is_approved) throw new ApiError(403, `Your ${roleType} must be approved to answer questions`);
        
        if (allowedCategories && !allowedCategories.includes(qData.category)) {
            throw new ApiError(403, `A ${roleType} is not permitted to answer questions in the '${qData.category}' category`);
        }
        
        return org;
    };

    if (userRole === 'doctor') {
      const { data: doctor } = await rawSupabaseAdmin
        .from('doctors')
        .select('id, name, is_verified')
        .eq('user_id', userId)
        .maybeSingle();
      if (!doctor) throw new ApiError(403, 'Only verified doctors can reply to community questions');
      doctor_id = doctor.id;
      doctor_name = doctor.name;
    } else if (userRole === 'pharmacy_owner') {
      const org = await checkOrgAuth('pharmacies', 'pharmacy', ['Medications']);
      responder_type = 'pharmacy';
      responder_organization_id = org.id;
      responder_name = org.name;
      responder_verified = org.is_verified || false;
    } else if (userRole === 'diagnostic_center_owner') {
      const org = await checkOrgAuth('diagnostic_centers', 'diagnostic center', ['Diagnostics']);
      responder_type = 'diagnostic_center';
      responder_organization_id = org.id;
      responder_name = org.name;
      responder_verified = org.is_verified || false;
    } else if (userRole === 'clinic_owner') {
      const org = await checkOrgAuth('clinics', 'clinic', ['Medical', 'Hospital / Referral', 'Clinic / Healthcare Services', 'General Health']);
      responder_type = 'clinic';
      responder_organization_id = org.id;
      responder_name = org.name;
      responder_verified = org.is_verified || false;
    } else if (userRole === 'hospital_owner' || userRole === 'hospital_manager') {
      let org;
      if (userRole === 'hospital_owner') {
          org = await checkOrgAuth('hospitals', 'hospital', ['Medical', 'Medications', 'Diagnostics', 'Hospital / Referral', 'Clinic / Healthcare Services', 'General Health']);
      } else {
          const { data: manager } = await rawSupabaseAdmin.from('hospital_managers').select('hospital_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
          if (!manager) throw new ApiError(403, 'Not authorized as hospital manager');
          const { data: hosp } = await rawSupabaseAdmin.from('hospitals').select('id, name, is_verified, is_approved').eq('id', manager.hospital_id).single();
          if (!hosp.is_approved) throw new ApiError(403, 'Hospital must be approved');
          
          const allowedCategories = ['Medical', 'Medications', 'Diagnostics', 'Hospital / Referral', 'Clinic / Healthcare Services', 'General Health'];
          if (!allowedCategories.includes(qData.category)) throw new ApiError(403, 'Hospital is not permitted to answer this category');
          org = hosp;
      }
      responder_type = 'hospital';
      responder_organization_id = org.id;
      responder_name = org.name;
      responder_verified = org.is_verified || false;
    } else if (userRole === 'patient') {
      const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
      if (!patient) throw new ApiError(403, 'Unauthorized');
      responder_type = 'patient';
    } else {
       throw new ApiError(403, 'Unauthorized role for answering');
    }

    const insertData = {
      question_id: questionId,
      content,
    };
    
    if (responder_type === 'doctor') {
      insertData.doctor_id = doctor_id;
      insertData.responder_type = 'doctor';
      insertData.is_doctor_verified = true;
    } else if (responder_type === 'patient') {
      const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).single();
      insertData.patient_id = patient.id;
      insertData.responder_type = 'patient';
    } else {
      insertData.responder_type = responder_type;
      insertData.responder_organization_id = responder_organization_id;
    }

    const { data: answer, error } = await rawSupabaseAdmin
      .from('community_answers')
      .insert(insertData)
      .select(`
        *,
        doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
        patient:patients(id, name, profile_image_url)
      `)
      .single();

    if (error) throw new ApiError(400, 'Failed to add answer: ' + error.message);
    
    if (['hospital', 'clinic', 'pharmacy', 'diagnostic_center'].includes(answer.responder_type)) {
       answer.responder_name = responder_name;
       answer.responder_verified = responder_verified;
    } else if (answer.responder_type === 'doctor' && answer.doctor) {
       answer.responder_name = answer.doctor.name;
       answer.responder_verified = answer.doctor.is_verified || false;
    }
        
    if (qData && qData.patient?.user_id && qData.patient.user_id !== userId) {
      const responderDisplay = responder_type === 'doctor' ? `Dr. ${doctor_name}` : (responder_type === 'patient' ? 'A patient' : responder_name);
      await notificationService.sendNotification(qData.patient.user_id, {
        title: 'New Answer',
        message: `${responderDisplay} answered your community question: "${qData.title.substring(0, 30)}..."`,
        type: 'community_answer',
        data: { questionId }
      }).catch(err => console.warn('[communityService] Notification failed:', err.message));
    }

    return answer;
  }

  async updateAnswer(userId, answerId, content, userRole) {
    const { data: currentAnswer } = await rawSupabaseAdmin
      .from('community_answers')
      .select('doctor_id, patient_id, responder_type, responder_organization_id')
      .eq('id', answerId)
      .single();

    if (!currentAnswer) throw new ApiError(404, 'Answer not found');

    const checkOrgAuth = async (table, roleType, expectedOrgId) => {
        const { data: org } = await rawSupabaseAdmin.from(table).select('id').eq('owner_id', userId).maybeSingle();
        if (!org || org.id !== expectedOrgId) throw new ApiError(403, `You are not authorized to edit this ${roleType} answer`);
    };

    if (currentAnswer.responder_type === 'doctor' || (!currentAnswer.responder_type && currentAnswer.doctor_id)) {
        const { data: doctor } = await rawSupabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
        if (!doctor || doctor.id !== currentAnswer.doctor_id) throw new ApiError(403, 'You can only edit your own answers');
    } else if (currentAnswer.responder_type === 'pharmacy') {
        await checkOrgAuth('pharmacies', 'pharmacy', currentAnswer.responder_organization_id);
    } else if (currentAnswer.responder_type === 'diagnostic_center') {
        await checkOrgAuth('diagnostic_centers', 'diagnostic center', currentAnswer.responder_organization_id);
    } else if (currentAnswer.responder_type === 'clinic') {
        await checkOrgAuth('clinics', 'clinic', currentAnswer.responder_organization_id);
    } else if (currentAnswer.responder_type === 'hospital') {
        if (userRole === 'hospital_owner') {
             await checkOrgAuth('hospitals', 'hospital', currentAnswer.responder_organization_id);
        } else if (userRole === 'hospital_manager') {
             const { data: manager } = await rawSupabaseAdmin.from('hospital_managers').select('hospital_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
             if (!manager || manager.hospital_id !== currentAnswer.responder_organization_id) throw new ApiError(403, 'You are not authorized to edit this hospital answer');
        } else {
             throw new ApiError(403, 'Unauthorized');
        }
    } else if (currentAnswer.responder_type === 'patient' || (!currentAnswer.responder_type && currentAnswer.patient_id)) {
        const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
        if (!patient || patient.id !== currentAnswer.patient_id) throw new ApiError(403, 'You can only edit your own answers');
    } else {
        throw new ApiError(403, 'Unauthorized');
    }

    const { data: answer, error } = await rawSupabaseAdmin
      .from('community_answers')
      .update({ content })
      .eq('id', answerId)
      .select(`
        *,
        doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
        patient:patients(id, name, profile_image_url)
      `)
      .single();

    if (error) throw new ApiError(400, 'Failed to update answer');
    return answer;
  }

  async upvoteQuestion(questionId, userId, actionReq = 'upvote') {
    if (!userId) {
      throw new ApiError(401, 'Please log in to upvote questions');
    }

    let action = actionReq;

    // Check if user already upvoted
    const { data: existingUpvote } = await rawSupabaseAdmin
      .from('community_question_upvotes')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (action === 'upvote') {
      if (existingUpvote) {
        // Already upvoted — do NOT increment again!
        return { message: 'Already upvoted', action: 'upvote', is_upvoted: true };
      }

      // Record upvote in database
      const { error: insertErr } = await rawSupabaseAdmin
        .from('community_question_upvotes')
        .insert({ user_id: userId, question_id: questionId });

      if (insertErr && insertErr.code !== '23505') { // 23505 = unique constraint conflict
        throw new ApiError(500, 'Failed to record upvote');
      }

      // Increment upvote count
      const { data: current } = await rawSupabaseAdmin
        .from('community_questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();
        
      if (current) {
        await rawSupabaseAdmin
          .from('community_questions')
          .update({ upvotes: (current.upvotes || 0) + 1 })
          .eq('id', questionId);
      }

      return { message: 'Upvoted successfully', action: 'upvote', is_upvoted: true };
    } else {
      // Remove upvote
      if (!existingUpvote) {
        return { message: 'Not upvoted', action: 'remove', is_upvoted: false };
      }

      await rawSupabaseAdmin
        .from('community_question_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId);

      const { data: current } = await rawSupabaseAdmin
        .from('community_questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();
        
      if (current && (current.upvotes || 0) > 0) {
        await rawSupabaseAdmin
          .from('community_questions')
          .update({ upvotes: Math.max(0, current.upvotes - 1) })
          .eq('id', questionId);
      }

      return { message: 'Upvote removed', action: 'remove', is_upvoted: false };
    }
  }

  async upvoteAnswer(answerId, userId, actionReq = 'upvote') {
    if (!userId) {
      throw new ApiError(401, 'Please log in to upvote answers');
    }

    let action = actionReq;

    // Check if user already upvoted
    const { data: existingUpvote } = await rawSupabaseAdmin
      .from('community_answer_upvotes')
      .select('id')
      .eq('user_id', userId)
      .eq('answer_id', answerId)
      .maybeSingle();

    if (action === 'upvote') {
      if (existingUpvote) {
        // Already upvoted — do NOT increment again!
        return { message: 'Already upvoted', action: 'upvote', is_upvoted: true };
      }

      const { error: insertErr } = await rawSupabaseAdmin
        .from('community_answer_upvotes')
        .insert({ user_id: userId, answer_id: answerId });

      if (insertErr && insertErr.code !== '23505') {
        throw new ApiError(500, 'Failed to record answer upvote');
      }

      const { data: current } = await rawSupabaseAdmin
        .from('community_answers')
        .select('upvotes')
        .eq('id', answerId)
        .single();
        
      if (current) {
        await rawSupabaseAdmin
          .from('community_answers')
          .update({ upvotes: (current.upvotes || 0) + 1 })
          .eq('id', answerId);
      }

      return { message: 'Upvoted successfully', action: 'upvote', is_upvoted: true };
    } else {
      if (!existingUpvote) {
        return { message: 'Not upvoted', action: 'remove', is_upvoted: false };
      }

      await rawSupabaseAdmin
        .from('community_answer_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('answer_id', answerId);

      const { data: current } = await rawSupabaseAdmin
        .from('community_answers')
        .select('upvotes')
        .eq('id', answerId)
        .single();
        
      if (current && (current.upvotes || 0) > 0) {
        await rawSupabaseAdmin
          .from('community_answers')
          .update({ upvotes: Math.max(0, current.upvotes - 1) })
          .eq('id', answerId);
      }

      return { message: 'Upvote removed', action: 'remove', is_upvoted: false };
    }
  }

  async deleteQuestion(userId, questionId) {
    const { data: patient } = await rawSupabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: question } = await rawSupabaseAdmin
      .from('community_questions')
      .select('patient_id')
      .eq('id', questionId)
      .single();

    if (!question) throw new ApiError(404, 'Question not found');
    
    const { data: user } = await rawSupabaseAdmin.from('users').select('role').eq('id', userId).single();
    const isAdmin = user && user.role === 'admin';
    
    if (!isAdmin && (!patient || question.patient_id !== patient.id)) {
        throw new ApiError(403, 'You can only delete your own questions');
    }

    const { error } = await rawSupabaseAdmin
      .from('community_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw new ApiError(400, 'Failed to delete question');
    return { success: true };
  }

  async deleteAnswer(userId, answerId, userRole) {
    const { data: user } = await rawSupabaseAdmin.from('users').select('role').eq('id', userId).single();
    const isAdmin = user && user.role === 'admin';

    const { data: answer } = await rawSupabaseAdmin
      .from('community_answers')
      .select('question_id, doctor_id, patient_id, responder_type, responder_organization_id')
      .eq('id', answerId)
      .single();

    if (!answer) throw new ApiError(404, 'Answer not found');

    const { data: question } = await rawSupabaseAdmin
      .from('community_questions')
      .select('patient_id')
      .eq('id', answer.question_id)
      .single();

    let isAnswerAuthor = false;
    
    if (answer.responder_type === 'doctor' || (!answer.responder_type && answer.doctor_id)) {
        const { data: doctor } = await rawSupabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
        if (doctor && doctor.id === answer.doctor_id) isAnswerAuthor = true;
    } else if (answer.responder_type === 'patient' || (!answer.responder_type && answer.patient_id)) {
        const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
        if (patient && patient.id === answer.patient_id) isAnswerAuthor = true;
    } else if (['pharmacy', 'diagnostic_center', 'clinic', 'hospital'].includes(answer.responder_type)) {
        const table = answer.responder_type === 'pharmacy' ? 'pharmacies' 
                    : answer.responder_type === 'clinic' ? 'clinics' 
                    : answer.responder_type === 'diagnostic_center' ? 'diagnostic_centers'
                    : 'hospitals';
        
        if (userRole === 'hospital_manager' && answer.responder_type === 'hospital') {
            const { data: manager } = await rawSupabaseAdmin.from('hospital_managers').select('hospital_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
            if (manager && manager.hospital_id === answer.responder_organization_id) isAnswerAuthor = true;
        } else {
            const { data: org } = await rawSupabaseAdmin.from(table).select('id').eq('owner_id', userId).maybeSingle();
            if (org && org.id === answer.responder_organization_id) isAnswerAuthor = true;
        }
    }

    let isQuestionOwner = false;
    const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
    if (patient && question?.patient_id === patient.id) {
        isQuestionOwner = true;
    }

    if (!isAdmin && !isAnswerAuthor && !isQuestionOwner) {
        throw new ApiError(403, 'Unauthorized');
    }

    const { error } = await rawSupabaseAdmin
      .from('community_answers')
      .delete()
      .eq('id', answerId);

    if (error) throw new ApiError(400, 'Failed to delete answer');
    return { success: true };
  }

    async toggleBookmark(userId, questionId) {
      const { data: existing, error: checkError } = await rawSupabaseAdmin
        .from('community_bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .maybeSingle();

      if (checkError) throw new ApiError(400, 'Failed to check bookmark status');

      if (existing) {
        await rawSupabaseAdmin.from('community_bookmarks').delete().eq('id', existing.id);
        return { bookmarked: false };
      } else {
        await rawSupabaseAdmin.from('community_bookmarks').insert({ user_id: userId, question_id: questionId });
        return { bookmarked: true };
      }
    }

    async submitReport(userId, targetType, targetId, reason, details) {
      if (!['question', 'answer'].includes(targetType)) {
          throw new ApiError(400, 'Invalid target type for report');
      }

      const { data: existingReport } = await rawSupabaseAdmin
          .from('community_reports')
          .select('id')
          .eq('reporter_user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .maybeSingle();

      if (existingReport) {
          throw new ApiError(409, 'You have already reported this content.');
      }

      const { data: report, error } = await rawSupabaseAdmin
          .from('community_reports')
          .insert({
              reporter_user_id: userId,
              target_type: targetType,
              target_id: targetId,
              reason,
              details
          })
          .select()
          .single();

      if (error) throw new ApiError(400, 'Failed to submit report');
      return report;
    }

    async getReports(status = 'open') {
        const { data: reports, error } = await rawSupabaseAdmin
            .from('community_reports')
            .select(`
                *,
                reporter:users!reporter_user_id(id, email)
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw new ApiError(400, 'Failed to fetch reports');

        const questionIds = reports.filter(r => r.target_type === 'question').map(r => r.target_id);
        const answerIds = reports.filter(r => r.target_type === 'answer').map(r => r.target_id);

        let contentMap = {};

        if (questionIds.length > 0) {
            const { data: qs } = await rawSupabaseAdmin.from('community_questions').select('id, title, status').in('id', questionIds);
            if (qs) qs.forEach(q => contentMap[q.id] = q);
        }

        if (answerIds.length > 0) {
            const { data: as } = await rawSupabaseAdmin.from('community_answers').select('id, content, status').in('id', answerIds);
            if (as) as.forEach(a => contentMap[a.id] = a);
        }

        return reports.map(r => ({
            ...r,
            target_content: contentMap[r.target_id] || null
        }));
    }

    async updateReportStatus(adminUserId, reportId, status) {
        const { data, error } = await rawSupabaseAdmin
            .from('community_reports')
            .update({
                status,
                reviewed_by: adminUserId,
                reviewed_at: new Date()
            })
            .eq('id', reportId)
            .select()
            .single();

        if (error) throw new ApiError(400, 'Failed to update report');
        return data;
    }

    async moderateContent(targetType, targetId, status) {
        const table = targetType === 'question' ? 'community_questions' : 'community_answers';
        
        const { error } = await rawSupabaseAdmin
            .from(table)
            .update({ status })
            .eq('id', targetId);

        if (error) throw new ApiError(400, `Failed to update content status`);
        return { success: true };
    }

  async getTrendingTopics() {
    const { data, error } = await rawSupabaseAdmin
      .from('community_questions')
      .select('topic')
      .not('topic', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];

    const topicCounts = {};
    data.forEach(q => {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    });

    const trending = Object.keys(topicCounts).map(topic => ({
      topic,
      count: topicCounts[topic]
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return trending;
  }
}

module.exports = new CommunityService();
