const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

class CommunityService {
  async getQuestions(limit = 20, offset = 0) {
    const { data: questions, count, error } = await supabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, name, profile_image_url),
        answers:community_answers(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, 'Failed to fetch questions');

    return {
      questions: questions.map(q => ({
        ...q,
        answer_count: q.answers?.[0]?.count || 0
      })),
      total: count
    };
  }

  async getQuestionDetails(questionId) {
    const { data: question, error } = await supabaseAdmin
      .from('community_questions')
      .select(`
        *,
        patient:patients(id, name, profile_image_url),
        answers:community_answers(
          *,
          doctor:doctors(id, name, specialization, profile_image_url),
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
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) throw new ApiError(403, 'Only patients can ask questions');

    const { data: question, error } = await supabaseAdmin
      .from('community_questions')
      .insert({
        patient_id: patient.id,
        title,
        content
      })
      .select()
      .single();

    if (error) throw new ApiError(400, 'Failed to post question');

    return question;
  }

  async addAnswer(userId, questionId, content) {
    // Determine if user is doctor or patient
    let author = null;
    let isDoctor = false;

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (doctor) {
      author = doctor;
      isDoctor = true;
    } else {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (patient) author = patient;
    }

    if (!author) throw new ApiError(403, 'Unauthorized to post answer');

    const { data: answer, error } = await supabaseAdmin
      .from('community_answers')
      .insert({
        question_id: questionId,
        doctor_id: isDoctor ? author.id : null,
        patient_id: !isDoctor ? author.id : null,
        content,
        is_doctor_verified: isDoctor
      })
      .select(`
        *,
        doctor:doctors(id, name, specialization, profile_image_url),
        patient:patients(id, name, profile_image_url)
      `)
      .single();

    if (error) throw new ApiError(400, 'Failed to post answer');

    return answer;
  }

  async upvoteQuestion(questionId) {
    const { data: question, error } = await supabaseAdmin
      .rpc('increment_question_upvotes', { q_id: questionId });
      
    if (error) {
      // Fallback if RPC doesn't exist
      const { data: current } = await supabaseAdmin
        .from('community_questions')
        .select('upvotes')
        .eq('id', questionId)
        .single();
        
      if (current) {
        await supabaseAdmin
          .from('community_questions')
          .update({ upvotes: current.upvotes + 1 })
          .eq('id', questionId);
      }
    }
    return { success: true };
  }
}

module.exports = new CommunityService();
