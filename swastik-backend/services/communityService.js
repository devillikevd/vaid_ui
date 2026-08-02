const { supabaseAdmin, rawSupabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { cacheSetIfNotExists, cacheDel } = require('../config/redis');

class CommunityService {
  async getQuestions(limit = 20, offset = 0, filter = 'All', topic = null, search = null, userId = null, sortBy = 'recent') {
    // 'Answered', 'Unanswered' and 'Verified' depend on joined answer data. When the
    // stats view (056_community_qa_v4.sql) is applied, filter at the DB level so that
    // pagination offsets and totals stay correct. If the view is missing we fall back
    // to the legacy post-fetch filter (works, but pages can come back short).
    if (['Answered', 'Unanswered', 'Verified'].includes(filter)) {
      const dbFiltered = await this.getQuestionsFilteredAtDb(limit, offset, filter, topic, search, userId, sortBy);
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

    if (topic) {
      query = query.eq('topic', topic);
    }
    
    if (search) {
      // Remove commas from search to prevent breaking PostgREST 'or' syntax
      const safeSearch = search.replace(/,/g, ' '); 
      query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%,topic.ilike.%${safeSearch}%`);
    }

    // Filters: 'All', 'Trending', 'Answered', 'Unanswered', 'Verified', 'Saved'
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
      // Order by views + upvotes or just views
      query = query.order('views', { ascending: false }).order('upvotes', { ascending: false });
    } else {
      // Custom Sorting
      if (sortBy === 'upvotes') {
        query = query.order('upvotes', { ascending: false });
      } else if (sortBy === 'views') {
        query = query.order('views', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false }); // Default to recent
      }
    }

    const { data: questions, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, 'Failed to fetch questions');

    // Fallback for 'Answered'/'Unanswered'/'Verified': apply post-fetch filters since
    // the DB-level path (stats view) was unavailable.
    let processedQuestions = questions.map(q => {
      // Anonymize if needed
      if (q.is_anonymous && q.patient?.user_id !== userId) {
        q.patient = { name: 'Anonymous User', profile_image_url: null };
      }
      return {
        ...q,
        answer_count: q.answers?.length || 0,
        has_verified_answer: q.answers?.some(a => a.is_doctor_verified) || false
      };
    });

    if (filter === 'Answered') {
      processedQuestions = processedQuestions.filter(q => q.answer_count > 0);
    } else if (filter === 'Unanswered') {
      processedQuestions = processedQuestions.filter(q => q.answer_count === 0);
    } else if (filter === 'Verified') {
      processedQuestions = processedQuestions.filter(q => q.has_verified_answer);
    }

    // Check bookmarks if userId is provided
    let bookmarkedQuestionIds = [];
    if (userId) {
      const { data: bookmarks } = await rawSupabaseAdmin
        .from('community_bookmarks')
        .select('question_id')
        .eq('user_id', userId);
      bookmarkedQuestionIds = bookmarks?.map(b => b.question_id) || [];
    }

    return {
      questions: processedQuestions.map(q => ({
        ...q,
        is_bookmarked: bookmarkedQuestionIds.includes(q.id)
      })),
      total: count
    };
  }

  // DB-level filtering for 'Answered'/'Unanswered'/'Verified' using the stats view.
  // Returns null when the view isn't available so the caller can fall back.
  async getQuestionsFilteredAtDb(limit, offset, filter, topic, search, userId, sortBy) {
    try {
      let statsQuery = rawSupabaseAdmin
        .from('community_questions_with_stats')
        .select('id', { count: 'exact' });

      if (topic) {
        statsQuery = statsQuery.eq('topic', topic);
      }

      if (search) {
        const safeSearch = search.replace(/,/g, ' ');
        statsQuery = statsQuery.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%,topic.ilike.%${safeSearch}%`);
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
        console.warn('[CommunityService] Stats view unavailable, falling back to post-fetch filter:', error.message);
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

      if (detailError) {
        console.warn('[CommunityService] Stats view detail fetch failed, falling back:', detailError.message);
        return null;
      }

      // Restore the filtered/ordered order from the stats query (`.in` does not preserve it).
      const byId = new Map(questions.map(q => [q.id, q]));
      const ordered = ids.map(id => byId.get(id)).filter(Boolean);

      const processedQuestions = ordered.map(q => {
        if (q.is_anonymous && q.patient?.user_id !== userId) {
          q.patient = { name: 'Anonymous User', profile_image_url: null };
        }
        return {
          ...q,
          answer_count: q.answers?.length || 0,
          has_verified_answer: q.answers?.some(a => a.is_doctor_verified) || false
        };
      });

      let bookmarkedQuestionIds = [];
      if (userId) {
        const { data: bookmarks } = await rawSupabaseAdmin
          .from('community_bookmarks')
          .select('question_id')
          .eq('user_id', userId);
        bookmarkedQuestionIds = bookmarks?.map(b => b.question_id) || [];
      }

      return {
        questions: processedQuestions.map(q => ({
          ...q,
          is_bookmarked: bookmarkedQuestionIds.includes(q.id)
        })),
        total: count
      };
    } catch (e) {
      console.warn('[CommunityService] DB-filtered query failed, falling back:', e.message);
      return null;
    }
  }

  async getQuestionDetails(questionId, userId = null) {
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
      .single();

    if (error || !question) throw new ApiError(404, 'Question not found');

    if (question.is_anonymous && question.patient?.user_id !== userId) {
      question.patient = { name: 'Anonymous User', profile_image_url: null };
    }

    // Sort answers: verified doctor answers first, then by upvotes
    question.answers.sort((a, b) => {
      if (a.is_doctor_verified !== b.is_doctor_verified) {
        return a.is_doctor_verified ? -1 : 1;
      }
      return b.upvotes - a.upvotes;
    });

    // Compute fields for consistency with the list endpoint
    question.answer_count = question.answers?.length || 0;
    question.has_verified_answer = question.answers?.some(a => a.is_doctor_verified) || false;

    // Include bookmark state when the caller is authenticated
    if (userId) {
      const { data: bookmark } = await rawSupabaseAdmin
        .from('community_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .maybeSingle();
      question.is_bookmarked = !!bookmark;
    } else {
      question.is_bookmarked = false;
    }

    // Optionally increment views when details are fetched
    if (questionId) {
      this.incrementViews(questionId).catch(console.error);
      question.views = (question.views || 0) + 1;
    }

    return question;
  }

  async incrementViews(questionId) {
    const { error } = await rawSupabaseAdmin.rpc('increment_question_views', { q_id: questionId });
    if (error) {
      // Fallback if RPC doesn't exist
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

  async createQuestion(userId, title, content, topic = null, is_anonymous = false, attachments = []) {
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
        is_anonymous,
        attachments
      })
      .select()
      .single();

    if (error) {
      console.error('[CommunityService] Failed to post question:', error);
      throw new ApiError(400, `Failed to post question: ${error.message || JSON.stringify(error)}`);
    }

    return question;
  }

  async addAnswer(userId, questionId, content) {
    const { data: doctor } = await rawSupabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!doctor) throw new ApiError(403, 'Only verified doctors can reply to community questions');

    const { data: answer, error } = await rawSupabaseAdmin
      .from('community_answers')
      .insert({
        question_id: questionId,
        doctor_id: doctor.id,
        patient_id: null,
        content,
        is_doctor_verified: true
      })
      .select(`
        *,
        doctor:doctors(id, user_id, name, specialization, profile_image_url, experience_years, qualifications, rating, total_reviews),
        patient:patients(id, name, profile_image_url)
      `)
      .single();

    if (error) {
      console.error('[CommunityService] Failed to post answer:', error);
      throw new ApiError(400, `Failed to post answer: ${error.message || JSON.stringify(error)}`);
    }

    return answer;
  }

  async updateAnswer(userId, answerId, content) {
    const { data: doctor } = await rawSupabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!doctor) throw new ApiError(403, 'Unauthorized');

    const { data: currentAnswer } = await rawSupabaseAdmin
      .from('community_answers')
      .select('doctor_id')
      .eq('id', answerId)
      .single();

    if (!currentAnswer) throw new ApiError(404, 'Answer not found');
    if (currentAnswer.doctor_id !== doctor.id) throw new ApiError(403, 'You can only edit your own answers');

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
    let action = actionReq;
    if (userId) {
      const lockKey = `upvote:q:${questionId}:u:${userId}`;
      if (action === 'upvote') {
          await cacheSetIfNotExists(lockKey, '1', 60 * 60 * 24 * 365); // Just store it optionally
      } else {
          await cacheDel(lockKey);
      }
    }

    if (action === 'upvote') {
      const { data: question, error } = await rawSupabaseAdmin
        .rpc('increment_question_upvotes', { q_id: questionId });
        
      if (error) {
        // Fallback if RPC doesn't exist
        const { data: current } = await rawSupabaseAdmin
          .from('community_questions')
          .select('upvotes')
          .eq('id', questionId)
          .single();
          
        if (current) {
          await rawSupabaseAdmin
            .from('community_questions')
            .update({ upvotes: current.upvotes + 1 })
            .eq('id', questionId);
        }
      }
      return { message: 'Upvoted successfully', action: 'upvote' };
    } else {
      // Downvote / Remove Upvote
      const { data: current } = await rawSupabaseAdmin
        .from('community_questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();
        
      if (current && current.upvotes > 0) {
        await rawSupabaseAdmin
          .from('community_questions')
          .update({ upvotes: current.upvotes - 1 })
          .eq('id', questionId);
      }
      return { message: 'Upvote removed', action: 'remove' };
    }
  }

  async upvoteAnswer(answerId, userId, actionReq = 'upvote') {
    let action = actionReq;
    if (userId) {
      const lockKey = `upvote:a:${answerId}:u:${userId}`;
      if (action === 'upvote') {
          await cacheSetIfNotExists(lockKey, '1', 60 * 60 * 24 * 365);
      } else {
          await cacheDel(lockKey);
      }
    }

    if (action === 'upvote') {
      const { data: answer, error } = await rawSupabaseAdmin
        .rpc('increment_answer_upvotes', { a_id: answerId });
        
      if (error) {
        // Fallback
        const { data: current } = await rawSupabaseAdmin
          .from('community_answers')
          .select('upvotes')
          .eq('id', answerId)
          .single();
          
        if (current) {
          await rawSupabaseAdmin
            .from('community_answers')
            .update({ upvotes: current.upvotes + 1 })
            .eq('id', answerId);
        }
      }
      return { message: 'Upvoted successfully', action: 'upvote' };
    } else {
      const { data: current } = await rawSupabaseAdmin
        .from('community_answers')
        .select('upvotes')
        .eq('id', answerId)
        .single();
        
      if (current && current.upvotes > 0) {
        await rawSupabaseAdmin
          .from('community_answers')
          .update({ upvotes: current.upvotes - 1 })
          .eq('id', answerId);
      }
      return { message: 'Upvote removed', action: 'remove' };
    }
  }

  async deleteQuestion(userId, questionId) {
    const { data: patient } = await rawSupabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!patient) throw new ApiError(403, 'Unauthorized');

    const { data: question } = await rawSupabaseAdmin
      .from('community_questions')
      .select('patient_id')
      .eq('id', questionId)
      .single();

    if (!question) throw new ApiError(404, 'Question not found');
    
    // Check if user is admin
    const { data: user } = await rawSupabaseAdmin.from('users').select('role').eq('id', userId).single();
    const isAdmin = user && user.role === 'admin';
    
    if (!isAdmin && question.patient_id !== patient.id) {
        throw new ApiError(403, 'You can only delete your own questions');
    }

    const { error } = await rawSupabaseAdmin
      .from('community_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw new ApiError(400, 'Failed to delete question');
    return { success: true };
  }

  async deleteAnswer(userId, answerId) {
    const { data: user } = await rawSupabaseAdmin.from('users').select('role').eq('id', userId).single();
    const isAdmin = user && user.role === 'admin';

    const { data: answer } = await rawSupabaseAdmin
      .from('community_answers')
      .select('question_id, doctor_id, patient_id')
      .eq('id', answerId)
      .single();

    if (!answer) throw new ApiError(404, 'Answer not found');

    const { data: question } = await rawSupabaseAdmin
      .from('community_questions')
      .select('patient_id')
      .eq('id', answer.question_id)
      .single();

    if (!question) throw new ApiError(404, 'Question not found');

    // Author of the answer
    let isAnswerAuthor = false;
    if (answer.doctor_id) {
        const { data: doctor } = await rawSupabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
        if (doctor && doctor.id === answer.doctor_id) isAnswerAuthor = true;
    } else if (answer.patient_id) {
        const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
        if (patient && patient.id === answer.patient_id) isAnswerAuthor = true;
    }

    // Owner of the question
    let isQuestionOwner = false;
    const { data: patient } = await rawSupabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
    if (patient && question.patient_id === patient.id) {
        isQuestionOwner = true;
    }

    if (!isAdmin && !isAnswerAuthor && !isQuestionOwner) {
        throw new ApiError(403, 'You can only delete your own answers or answers to your questions');
    }

    const { error } = await rawSupabaseAdmin
      .from('community_answers')
      .delete()
      .eq('id', answerId);

    if (error) throw new ApiError(400, 'Failed to delete answer');
    return { success: true };
  }

  async toggleBookmark(userId, questionId) {
    const { data: existing } = await rawSupabaseAdmin
      .from('community_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      await rawSupabaseAdmin
        .from('community_bookmarks')
        .delete()
        .eq('id', existing.id);
      return { bookmarked: false };
    } else {
      // Add bookmark
      await rawSupabaseAdmin
        .from('community_bookmarks')
        .insert({ user_id: userId, question_id: questionId });
      return { bookmarked: true };
    }
  }

  async getTrendingTopics() {
    // Basic implementation to get trending topics by frequency in recent questions
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
