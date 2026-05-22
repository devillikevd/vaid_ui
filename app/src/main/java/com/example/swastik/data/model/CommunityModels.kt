package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

data class CommunityQuestion(
    val id: String,
    @SerializedName("patient_id") val patientId: String,
    val title: String,
    val content: String,
    val upvotes: Int,
    @SerializedName("created_at") val createdAt: String,
    val patient: PatientInfo?,
    @SerializedName("answer_count") val answerCount: Int,
    val answers: List<CommunityAnswer>? = null
)

data class CommunityAnswer(
    val id: String,
    @SerializedName("question_id") val questionId: String,
    @SerializedName("doctor_id") val doctorId: String?,
    @SerializedName("patient_id") val patientId: String?,
    val content: String,
    @SerializedName("is_doctor_verified") val isDoctorVerified: Boolean,
    val upvotes: Int,
    @SerializedName("created_at") val createdAt: String,
    val doctor: DoctorInfo?,
    val patient: PatientInfo?
)

data class PatientInfo(
    val id: String,
    val name: String,
    @SerializedName("profile_image_url") val profileImageUrl: String?
)

data class DoctorInfo(
    val id: String,
    val name: String,
    val specialization: String,
    @SerializedName("profile_image_url") val profileImageUrl: String?
)

data class CommunityQuestionResponse(
    val questions: List<CommunityQuestion>,
    val total: Int
)

data class PostQuestionRequest(
    val title: String,
    val content: String
)

data class PostAnswerRequest(
    val content: String
)
