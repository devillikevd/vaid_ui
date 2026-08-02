package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

data class CommunityQuestion(
    val id: String,
    @SerializedName("patient_id") val patientId: String,
    val title: String,
    val content: String,
    val topic: String?,
    val upvotes: Int,
    val views: Int,
    @SerializedName("is_bookmarked") val isBookmarked: Boolean? = null,
    @SerializedName("created_at") val createdAt: String,
    val patient: PatientInfo?,
    @SerializedName("answer_count") val answerCount: Int? = null,
    val answers: List<CommunityAnswer>? = null,
    @SerializedName("is_anonymous") val isAnonymous: Boolean = false,
    val attachments: List<String>? = null
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
    val id: String?,
    @SerializedName("user_id") val userId: String?,
    val name: String,
    @SerializedName("profile_image_url") val profileImageUrl: String?
)

data class DoctorInfo(
    val id: String,
    val name: String,
    val specialization: String,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("experience_years") val experienceYears: Int? = null,
    val qualifications: List<String>? = null,
    val rating: Double? = null,
    @SerializedName("total_reviews") val totalReviews: Int? = null
)

data class CommunityQuestionResponse(
    val questions: List<CommunityQuestion>,
    val total: Int
)

data class PostQuestionRequest(
    val title: String,
    val content: String,
    val topic: String? = null,
    @SerializedName("is_anonymous") val isAnonymous: Boolean = false,
    val attachments: List<String> = emptyList()
)

data class PostAnswerRequest(
    val content: String
)
