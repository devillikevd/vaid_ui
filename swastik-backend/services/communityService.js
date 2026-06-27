const { supabaseAdmin, rawSupabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const { cacheSetIfNotExists } = require('../config/redis');

class CommunityService {
  async getQuestions(limit = 20, offset = 0) {
    const { data: questions, count, error } = await rawSupabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, user_id, name, profile_image_url),
        answers:community_answers(
          *,
          doctor:doctors(id, user_id, name, specialization, profile_image_url),
          patient:patients(id, name, profile_image_url)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, 'Failed to fetch questions');

    return {
      questions: questions.map(q => ({
        ...q,
        answer_count: q.answers?.length || 0
      })),
      total: count
    };
  }

  async getQuestionDetails(questionId) {
    const { data: question, error } = await rawSupabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, user_id, name, profile_image_url),
        answers:community_answers(
          *,
          doctor:doctors(id, user_id, name, specialization, profile_image_url),
          patient:patients(id, name, profile_image_url)
        )
      `)
      .eq('id', questionId)
      .single();

    if (error || !question) throw new ApiError(404, 'Question not found');

    // Sort answers: verified doctor answers first, then by upvotes
    question.answers.sort((a, b) => {
      if (a.is_doctor_verified !== b.is_doctor_verified) {
        return a.is_doctor_verified ? -1 : 1;
      }
      return b.upvotes - a.upvotes;
    });

    return question;
  }

  async createQuestion(userId, title, content) {
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
        content
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
        doctor:doctors(id, user_id, name, specialization, profile_image_url),
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
        doctor:doctors(id, user_id, name, specialization, profile_image_url),
        patient:patients(id, name, profile_image_url)
      `)
      .single();

    if (error) throw new ApiError(400, 'Failed to update answer');
    return answer;
  }


  async upvoteQuestion(questionId, userId) {
    if (userId) {
      const lockKey = `upvote:q:${questionId}:u:${userId}`;
      const canUpvote = await cacheSetIfNotExists(lockKey, '1', 60 * 60 * 24 * 365); // 1 year lock
      if (!canUpvote) throw new ApiError(400, 'You have already upvoted this question');
    }

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
    return { success: true };
  }

  async upvoteAnswer(answerId, userId) {
    if (userId) {
      const lockKey = `upvote:a:${answerId}:u:${userId}`;
      const canUpvote = await cacheSetIfNotExists(lockKey, '1', 60 * 60 * 24 * 365); // 1 year lock
      if (!canUpvote) throw new ApiError(400, 'You have already upvoted this answer');
    }

    const { data: answer, error } = await rawSupabaseAdmin
      .rpc('increment_answer_upvotes', { a_id: answerId });
      
    if (error) {
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
    return { success: true };
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
}

module.exports = new CommunityService();
