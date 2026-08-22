package com.example.swastik.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.google.gson.JsonElement
import com.google.gson.JsonObject

// ==================== AUTH DTOs ====================

data class ApiResponse<T>(
    val success: Boolean,
    val message: String?,
    val data: T?
)

// ==================== COMMON & MISSING DTOs ====================

data class LoginRequest(
    val email: String,
    val password: String,
    val role: String? = null
)

data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T>,
    val pagination: PaginationDto?
)

data class EmergencyRequest(
    val latitude: Double,
    val longitude: Double,
    val address: String?,
    val emergencyType: String,
    val notes: String?
)

data class DirectSosRequest(
    val hospitalId: String,
    val latitude: Double,
    val longitude: Double,
    val emergencyType: String? = null,
    val notes: String? = null
)

data class EmergencyContactAlertRequest(
    val alertType: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val notes: String? = null,
    val sourceId: String? = null
)

data class EmergencyContactAlertResponse(
    val alertType: String? = null,
    val contactCount: Int = 0,
    val matchedUserCount: Int = 0,
    val notifiedUserCount: Int = 0,
    val skippedContactCount: Int = 0,
    val message: String? = null
)

data class ReviewRequest(
    val doctorId: String? = null,
    val hospitalId: String? = null,
    val consultationId: String? = null,
    val rating: Int,
    val comment: String? = null
)

data class SymptomAnalysisRequest(
    val sessionId: String,
    val symptoms: List<String>,
    val duration: String?,
    val severity: String?
)

data class SymptomAnalysis(
    @SerializedName("possible_conditions") val possibleConditions: List<Condition>,
    val severity: String,
    @SerializedName("recommended_specialties") val recommendedSpecialties: List<String>,
    val suggestions: List<String>,
    @SerializedName("seek_immediate_care") val seekImmediateCare: Boolean
)

data class Condition(
    val name: String,
    val probability: String,
    val description: String?
)

data class HealthTip(
    val id: String,
    val title: String,
    val content: String,
    val category: String
)

data class UploadResponse(
    val url: String? = null,
    @SerializedName("file_name") val fileName: String? = null,
    @SerializedName("fileUrl") val fileUrl: String? = null,
    @SerializedName("objectName") val objectName: String? = null,
    @SerializedName("storageUrl") val storageUrl: String? = null,
    @SerializedName("storage_url") val storageUrlSnake: String? = null,
    @SerializedName("resolvedUrl") val resolvedUrl: String? = null,
    @SerializedName("resolved_url") val resolvedUrlSnake: String? = null
) {
    fun resolvedUrl(): String? = resolvedUrl ?: resolvedUrlSnake ?: url ?: fileUrl
    fun storageUrl(): String? = storageUrl ?: storageUrlSnake ?: url ?: fileUrl
}

// ==================== WEBRTC DTOs ====================

data class IceServerDto(
    val urls: List<String>,
    val username: String? = null,
    val credential: String? = null
)

data class IceServersResponse(
    val iceServers: List<IceServerDto>
)

// ==================== HEALTH CARD DTOs ====================

data class HealthCardTokenResponse(
    val token: String,
    val url: String,
    @SerializedName("expires_at") val expiresAt: String,
    @SerializedName("expires_in_hours") val expiresInHours: Int
)

data class HealthCardStatusResponse(
    @SerializedName("has_active_card") val hasActiveCard: Boolean,
    val url: String?,
    @SerializedName("generated_at") val generatedAt: String?,
    @SerializedName("expires_at") val expiresAt: String?
)

data class ChatSession(
    val id: String? = null,
    val sessionId: String,
    val message: String? = null,
    @SerializedName("lastMessage") val lastMessage: String? = null,
    val updatedAt: String? = null,
    val messageCount: Int? = null
)

data class ChatMessage(
    val id: String?,
    val role: String, // user, assistant
    val content: String,
    val timestamp: String?,
    @SerializedName("audio_url") val audioUrl: String?
)


data class RegisterRequest(
    val email: String,
    val phone: String? = null,
    val password: String,
    val name: String,
    val role: String = "patient"
)

data class SendRegistrationOtpRequest(
    val email: String,
    val name: String? = null,
    val role: String = "patient"
)

data class VerifyRegistrationOtpRequest(
    val email: String,
    val otp: String
)

data class ResendVerificationRequest(
    val email: String
)

data class VerifyEmailOtpRequest(
    val email: String,
    val otp: String
)

data class RefreshTokenRequest(
    val refreshToken: String
)

data class LogoutRequest(
    val refreshToken: String
)

data class AuthData(
    @SerializedName(value = "accessToken", alternate = ["access_token"])
    val accessToken: String?,
    @SerializedName(value = "refreshToken", alternate = ["refresh_token"])
    val refreshToken: String?,
    val user: UserDto?,
    @SerializedName(value = "expiresIn", alternate = ["expires_in"])
    val expiresIn: Long? = null
)

data class AuthResponse(
    val success: Boolean,
    // Top-level fields (for direct responses)
    @SerializedName(value = "accessToken", alternate = ["access_token"])
    val accessToken: String?,
    @SerializedName(value = "refreshToken", alternate = ["refresh_token"])
    val refreshToken: String?,
    val user: UserDto?,
    @SerializedName(value = "expiresIn", alternate = ["expires_in"])
    val expiresIn: Long? = null,
    // Nested data field (for login, register which wrap in data: {})
    val data: AuthData?,
    val message: String?
) {
    /** Resolve tokens/user regardless of backend response shape */
    fun resolvedAccessToken(): String? = accessToken ?: data?.accessToken
    fun resolvedRefreshToken(): String? = refreshToken ?: data?.refreshToken
    fun resolvedUser(): UserDto? = user ?: data?.user
    fun resolvedExpiresIn(): Long = expiresIn ?: data?.expiresIn ?: 604800L // default 7 days
}

data class UserDto(
    val id: String,
    val email: String? = null,
    val phone: String? = null,
    val role: String = "patient",
    val name: String? = null,
    @SerializedName("is_verified")
    val isVerified: Boolean = false
)

// ==================== PATIENT DTOs ====================

data class PatientDto(
    val id: String,
    val name: String,
    val email: String?,
    val phone: String?,
    val age: Int?,
    @SerializedName("date_of_birth")
    val dateOfBirth: String? = null,
    val gender: String?,
    @SerializedName("blood_group")
    val bloodGroup: String?,
    val weight: Float?,
    val height: Float?,
    val location: String?,
    val city: String? = null,
    @SerializedName("abha_number")
    val abhaNumber: String?,
    @SerializedName("profile_image_url")
    val profileImageUrl: String?,
    @SerializedName("is_verified")
    val isVerified: Boolean = false,
    val emergencyContacts: List<EmergencyContactDto>? = null,
    val familyMembers: List<FamilyMemberDto>? = null,
    @SerializedName("saved_addresses")
    val savedAddresses: List<SavedAddressDto>? = null,
    @SerializedName("linked_hospitals")
    val linkedHospitals: Int? = null
)

data class EmergencyProvider(
    val id: String,
    val name: String,
    val distanceText: String,
    val estimatedArrival: String
)

data class NearbyMedicineDto(
    val id: String, // Inventory ID
    val medicineId: String?,
    val name: String,
    @SerializedName("generic_name") val genericName: String? = null,
    val category: String?,
    @SerializedName("therapeuticCategory") val therapeuticCategory: String? = null,
    val price: Float,
    val mrp: Float? = null,
    @SerializedName("pack_size") val packSize: Int? = 1,
    @SerializedName("unit_type") val unitType: String? = "unit",
    @SerializedName("requires_prescription") val requiresPrescription: Boolean = false,
    val pharmacyName: String?,
    val pharmacyId: String?,
    val inStock: Boolean,
    val quantity: Int,
    @SerializedName("image_url") val imageUrl: String? = null,
    val distance: Float? = null,
    @SerializedName("distance_text") val distanceText: String? = null,
    @SerializedName("pharmacy_image_url") val pharmacyImageUrl: String? = null,
    @SerializedName("pharmacy_rating") val pharmacyRating: Float? = null,
    @SerializedName("pharmacy_is_open") val pharmacyIsOpen: Boolean? = null,
    @SerializedName("pharmacy_is_24_hours") val pharmacyIs24Hours: Boolean? = null,
    @SerializedName("pharmacy_delivery_available") val pharmacyDeliveryAvailable: Boolean? = null,
    @SerializedName("pharmacy_delivery_radius_km") val pharmacyDeliveryRadiusKm: Int? = null
)

data class EmergencyContactDto(
    val id: String,
    val name: String,
    val phone: String,
    val relationship: String
)

data class FamilyMemberDto(
    val id: String,
    val name: String,
    val relationship: String,
    val phone: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class SavedAddressDto(
    val id: String,
    val label: String,
    val address: String,
    val city: String? = null,
    val pincode: String? = null,
    @SerializedName("is_default")
    val isDefault: Boolean = false,
    @SerializedName("created_at") val createdAt: String? = null
)

data class AddEmergencyContactRequest(
    val name: String,
    val phone: String,
    val relation: String
)

data class AddSavedAddressRequest(
    val label: String,
    val address: String
)

data class AddFamilyMemberRequest(
    val name: String,
    val relation: String,
    val phone: String? = null
)

data class UpdateProfileRequest(
    val name: String? = null,
    val age: Int? = null,
    val gender: String? = null,
    val bloodGroup: String? = null,
    val weight: Float? = null,
    val height: Float? = null,
    val location: String? = null,
    val city: String? = null,
    val dateOfBirth: String? = null
)

data class MedicalRecordAccessDto(
    @SerializedName("appointmentId")
    val appointmentId: String,
    @SerializedName("doctorId")
    val doctorId: String,
    @SerializedName("doctorName")
    val doctorName: String,
    @SerializedName("hasAccess")
    val hasAccess: Boolean,
    @SerializedName("grantedAt")
    val grantedAt: String? = null,
    @SerializedName("expiresAt")
    val expiresAt: String? = null
)

data class AdherenceStatsDto(
    @SerializedName("adherence_rate") val adherenceRate: Int? = 100,
    @SerializedName("streak_days") val streakDays: Int? = 1,
    @SerializedName("taken_today") val takenToday: Int? = 0,
    @SerializedName("total_today") val totalToday: Int? = 0
)

data class PatientDashboardResponse(
    val success: Boolean,
    val reminders: List<ReminderDto>?,
    val adherence: AdherenceStatsDto? = null,
    val upcomingAppointments: List<AppointmentDto>?,
    val recentConsultations: List<ConsultationDto>?,
    val stats: PatientStatsDto?,
    val recommendedDoctors: List<RecommendedDoctorDto>?,
    val message: String?
)

/**
 * DTO for recommended doctors returned from the dashboard endpoint.
 * Backend returns 'rating' (not 'average_rating'), so we map here.
 */
data class RecommendedDoctorDto(
    val id: String,
    val name: String,
    val specialization: String,
    val rating: Float?,
    @SerializedName("total_reviews") val totalReviews: Int? = null,
    @SerializedName("experience_years") val experienceYears: Int?,
    val qualifications: List<String>? = null,
    val languages: List<String>? = null,
    val bio: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("consultation_fee") val consultationFee: Int?,
    @SerializedName("video_consultation_fee") val videoConsultationFee: Int? = null,
    @SerializedName("is_available") val isAvailable: Boolean?,
    @SerializedName("recommendation_reason") val recommendationReason: String?,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null
) {
    fun toDoctor() = com.example.swastik.data.model.Doctor(
        id = id,
        name = name,
        specialization = specialization,
        profileImageUrl = profileImageUrl,
        experienceYears = experienceYears,
        qualification = null,
        qualifications = qualifications,
        consultationFee = consultationFee,
        videoConsultationFee = videoConsultationFee,
        averageRating = rating,
        totalReviews = totalReviews,
        isAvailable = isAvailable ?: true,
        hospitalValues = emptyList(),
        recommendationReason = recommendationReason,
        languages = languages,
        bio = bio,
        hospitalId = hospitalId,
        clinicId = clinicId
    )
}

data class PatientStatsDto(
    @SerializedName("total_consultations")
    val totalConsultations: Int,
    @SerializedName("total_prescriptions")
    val totalPrescriptions: Int,
    @SerializedName("total_reports")
    val totalReports: Int
)

data class ReminderDto(
    val id: String,
    val title: String,
    val time: String,
    val type: String,
    val days: List<String>? = null,
    val notes: String? = null,
    @SerializedName("snooze_until")
    val snoozeUntil: String? = null,
    @SerializedName("is_completed")
    val isCompleted: Boolean = false
)

// ==================== DOCTOR DTOs ====================

data class DoctorDto(
    val id: String,
    val name: String,
    val specialization: String,
    @SerializedName("experience_years") val experience: Int = 0,
    val rating: Float? = null,
    @SerializedName("consultation_fee")
    val consultationFee: Int = 0,
    @SerializedName("profile_image_url")
    val profileImageUrl: String?,
    val hospital: HospitalDto?,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    @SerializedName("is_available")
    val isAvailable: Boolean = true
)

data class DoctorQueueStatsDto(
    val currentQueue: Int,
    val inProgress: Int,
    val completed: Int = 0,
    val estimatedWaitTime: Int,
    val nextAvailableSlot: String? = null
)

data class DoctorQueueStatsResponse(
    val success: Boolean,
    val data: DoctorQueueStatsDto
)

data class TimeSlotDto(
    val time: String,
    val isAvailable: Boolean
)

// ==================== APPOINTMENT DTOs ====================

data class CreateAppointmentRequest(
    val doctorId: String,
    val date: String,
    val timeSlot: String,
    val type: String,
    val notes: String? = null,
    val hospitalId: String? = null,
    val clinicId: String? = null,
    val reason: String? = null,
    val symptoms: List<String>? = null,
    val patientNotes: String? = null,
    val severity: String? = null,
    val onsetType: String? = null,
    val symptomDuration: String? = null,
    val symptomPattern: String? = null,
    val severityCurrent: Int? = null,
    val severityWorst: Int? = null,
    val knownAllergies: List<String>? = null,
    val currentMedications: String? = null,
    val medicalHistory: String? = null,
    val voiceNoteUrl: String? = null,
    val supportingDocuments: List<String>? = null,
    val reasonForVisit: String? = null
)

data class AppointmentFacilityDto(
    val id: String,
    val name: String,
    val address: String? = null,
    val city: String? = null,
    val type: String? = null
)

data class AppointmentDto(
    val id: String,
    @SerializedName("patient_id")
    val patientId: String,
    @SerializedName("doctor_id")
    val doctorId: String,
    @SerializedName("hospital_id")
    val hospitalId: String? = null,
    @SerializedName("clinic_id")
    val clinicId: String? = null,
    val doctor: DoctorDto?,
    val hospital: AppointmentFacilityDto? = null,
    val clinic: AppointmentFacilityDto? = null,
    @SerializedName("appointment_date")
    val date: String,
    @SerializedName("time_slot")
    val timeSlot: String,
    val type: String,
    val status: String,
    val notes: String?,
    @SerializedName("is_reviewed")
    val isReviewed: Boolean = false,
    @SerializedName("cancellation_reason")
    val cancellationReason: String? = null,
    @SerializedName("cancelled_by")
    val cancelledBy: String? = null,
    @SerializedName("completion_otp")
    val completionOtp: String? = null
)

data class CancelAppointmentRequest(
    val reason: String?
)

// ==================== CONSULTATION DTOs ====================

/**
 * Matches backend response shape:
 * { id, status, diagnosis, notes, follow_up_date, created_at, started_at,
 *   doctor: { id, name, specialization, profile_image_url },
 *   patient: { id, name, phone },
 *   appointment: { id, appointment_date, time_slot, type },
 *   prescriptions: [...] }
 */
data class ConsultationDto(
    val id: String,
    val status: String? = null,
    val diagnosis: String? = null,
    val notes: String? = null,
    @SerializedName("follow_up_date")
    val followUpDate: String? = null,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("started_at")
    val startedAt: String? = null,
    @SerializedName("ended_at")
    val endedAt: String? = null,
    @SerializedName("doctor_id")
    val doctorId: String? = null,
    @SerializedName("patient_id")
    val patientId: String? = null,
    @SerializedName("appointment_id")
    val appointmentId: String? = null,
    // Nested objects from Supabase joins
    val doctor: ConsultationDoctorDto? = null,
    val patient: ConsultationPatientDto? = null,
    val appointment: ConsultationAppointmentDto? = null,
    val prescriptions: List<PrescriptionDto>? = null
) {
    /** Helper: resolve doctor name from nested object */
    val doctorName: String get() = doctor?.name ?: "Doctor"
    /** Helper: resolve doctor specialty from nested object */
    val doctorSpecialty: String get() = doctor?.specialization ?: "General"
    /** Helper: resolve date from appointment or creation timestamp */
    val date: String get() = appointment?.appointmentDate ?: createdAt ?: ""
}

data class ConsultationDoctorDto(
    val id: String?,
    val name: String?,
    val specialization: String?,
    @SerializedName("profile_image_url")
    val profileImageUrl: String? = null
)

data class ConsultationPatientDto(
    val id: String?,
    val name: String?,
    val phone: String? = null
)

data class ConsultationAppointmentDto(
    val id: String?,
    @SerializedName("appointment_date")
    val appointmentDate: String?,
    @SerializedName("time_slot")
    val timeSlot: String?,
    val type: String? = null
)

data class PrescriptionDto(
    val id: String? = null,
    @SerializedName("consultation_id")
    val consultationId: String? = null,
    val diagnosis: String? = null,
    val notes: String? = null,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("file_url")
    val fileUrl: String? = null,
    @SerializedName("pdf_url")
    val pdfUrl: String? = null,
    // Backend returns as "medicines" from patient route and "prescription_medicines" from consultation detail
    val medicines: List<PrescriptionItemDto>? = null,
    @SerializedName("prescription_medicines")
    val prescriptionMedicines: List<PrescriptionItemDto>? = null
) {
    /** Unified accessor — prefers explicit medicines, falls back to nested join result */
    val allMedicines: List<PrescriptionItemDto>
        get() = medicines?.takeIf { it.isNotEmpty() } ?: prescriptionMedicines ?: emptyList()
}

data class PrescriptionItemDto(
    @SerializedName("medicine_name")
    val medicineName: String,
    val dosage: String,
    val frequency: String,
    val duration: String,
    val instructions: String? = null,
    val quantity: Int? = null
)

data class ForwardPrescriptionRequest(
    val pharmacyId: String,
    val deliveryAddress: String? = null
)

data class EndConsultationRequest(
    val diagnosis: String? = null,
    val notes: String? = null,
    @SerializedName("follow_up_date")
    val followUpDate: String? = null
)

// ==================== HOSPITAL DTOs ====================

data class HospitalDto(
    val id: String,
    val name: String,
    val type: String,
    val address: String,
    val city: String?,
    val phone: String?,
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double,
    val rating: Float?,
    @SerializedName("is_emergency_available")
    val isEmergencyAvailable: Boolean?,
    val distance: Float?,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    @SerializedName("is_24_hours") val is24Hours: Boolean? = null,
    @SerializedName("image_url") val imageUrl: String? = null
)

// ==================== CAMPAIGN DTOs ====================

data class DiscountCampaignDto(
    val id: String,
    val name: String,
    @SerializedName("discount_type") val discountType: String,
    @SerializedName("discount_value") val discountValue: Float,
    @SerializedName("scope_type") val scopeType: String? = null,
    @SerializedName("scope_ref") val scopeRef: String? = null,
    @SerializedName("min_order_value") val minOrderValue: Float? = null,
    @SerializedName("max_discount_per_order") val maxDiscountPerOrder: Float? = null,
    @SerializedName("start_at") val startAt: String? = null,
    @SerializedName("end_at") val endAt: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

data class CampaignPriceDto(
    @SerializedName("medicine_id") val medicineId: String,
    @SerializedName("base_price") val basePrice: Float,
    val mrp: Float,
    @SerializedName("final_price") val finalPrice: Float,
    @SerializedName("discount_amount") val discountAmount: Float,
    @SerializedName("discount_percentage") val discountPercentage: Float,
    val campaign: DiscountCampaignDto?
)

data class CampaignPriceRequestDto(
    @SerializedName("medicine_ids") val medicineIds: List<String>,
    @SerializedName("pharmacy_id") val pharmacyId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

// ==================== MEDICINE DTOs ====================

data class MedicineDto(
    val id: String,
    val name: String,
    @SerializedName("generic_name")
    val genericName: String?,
    val manufacturer: String,
    val category: String,
    val price: Float,
    val mrp: Float? = null,
    @SerializedName("pack_size") val packSize: Int? = 1,
    @SerializedName("unit_type") val unitType: String? = "unit",
    val description: String?,
    @SerializedName("requires_prescription")
    val requiresPrescription: Boolean,
    @SerializedName("image_url")
    val imageUrl: String?,
    // Campaign pricing fields
    @SerializedName("campaign_price") val campaignPrice: Float? = null,
    @SerializedName("campaign_discount_pct") val campaignDiscountPct: Float? = null,
    @SerializedName("campaign_id") val campaignId: String? = null,
    @SerializedName("campaign_name") val campaignName: String? = null
)

data class MedicineCategoryDto(
    val id: String,
    val name: String,
    @SerializedName("display_name") val displayName: String? = null,
    val icon: String,
    val count: Int = 0
)

// ==================== REPORT DTOs ====================

data class ReportDto(
    val id: String,
    val name: String,
    val type: String,
    @SerializedName("test_date")
    val testDate: String?,
    @SerializedName("result_date")
    val resultDate: String?,
    @SerializedName("lab_name")
    val labName: String?,
    val status: String,
    @SerializedName("file_url")
    val fileUrl: String?,
    @SerializedName("file_size")
    val fileSize: String?,
    @SerializedName("doctor_notes")
    val doctorNotes: String?,
    @SerializedName("consultation_id")
    val consultationId: String?,
    val parameters: List<ReportParameterDto>?,
    @SerializedName("booking_id")
    val bookingId: String? = null,
    @SerializedName("created_at")
    val createdAt: String?
) {
    /** Fallback date: test_date → created_at → today */
    val displayDate: String
        get() = testDate ?: createdAt?.take(10) ?: ""
}

data class ReportParameterDto(
    val name: String,
    val value: String,
    val unit: String?,
    @SerializedName("normal_range")
    val normalRange: String?,
    val status: String
)

// ==================== NOTIFICATION DTOs ====================

data class UnreadCountDto(
    val count: Int
)

data class NotificationsListData(
    val notifications: List<NotificationDto>,
    val pagination: PaginationDto?
)

data class NotificationDto(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val data: JsonObject? = null,
    @SerializedName("is_read")
    val isRead: Boolean,
    @SerializedName("created_at")
    val createdAt: String
)

data class TokenResponse(
    val success: Boolean,
    @SerializedName(value = "accessToken", alternate = ["access_token"])
    val accessToken: String?,
    @SerializedName(value = "refreshToken", alternate = ["refresh_token"])
    val refreshToken: String?,
    @SerializedName(value = "expiresIn", alternate = ["expires_in"])
    val expiresIn: Long? = null,
    val data: AuthData? = null
) {
    fun resolvedAccessToken(): String? = accessToken ?: data?.accessToken
    fun resolvedRefreshToken(): String? = refreshToken ?: data?.refreshToken
    fun resolvedExpiresIn(): Long = expiresIn ?: data?.expiresIn ?: 604800L
}

data class ForgotPasswordRequest(
    val email: String,
    val role: String? = null
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

data class ResetPasswordRequest(
    val token: String? = null,
    val email: String? = null,
    val otp: String? = null,
    @SerializedName("password") val newPassword: String,
    val role: String? = null
)

data class UpdateStatusRequest(
    val status: String,
    val notes: String? = null
)

data class RescheduleRequest(
    val date: String,
    val timeSlot: String,
    val reason: String? = null
)

data class AddPrescriptionRequest(
    val diagnosis: String,
    val notes: String? = null,
    @SerializedName("follow_up_date") val followUpDate: String? = null,
    val items: List<PrescriptionItemDto>
)

data class UploadReportRequest(
    val name: String,
    val type: String,
    @SerializedName("file_url") val fileUrl: String,
    @SerializedName("lab_name") val labName: String? = null
)

data class ShareReportRequest(
    @SerializedName("doctor_id") val doctorId: String
)

data class MedicineAvailabilityDto(
    @SerializedName("inventory_item_id") val inventoryItemId: String? = null,
    @SerializedName("pharmacy_id") val pharmacyId: String,
    @SerializedName("pharmacy_name") val pharmacyName: String,
    val address: String?,
    val price: Float?,
    val mrp: Float? = null,
    @SerializedName("in_stock") val inStock: Boolean,
    val distance: Float? = null,
    @SerializedName("distance_text") val distanceText: String? = null,
    @SerializedName("pharmacy_image_url") val pharmacyImageUrl: String? = null,
    @SerializedName("pharmacy_rating") val pharmacyRating: Float? = null,
    @SerializedName("pharmacy_is_open") val pharmacyIsOpen: Boolean? = null,
    @SerializedName("pharmacy_is_24_hours") val pharmacyIs24Hours: Boolean? = null,
    @SerializedName("delivery_available") val deliveryAvailable: Boolean? = null,
    @SerializedName("delivery_radius_km") val deliveryRadiusKm: Int? = null
)

data class TtsRequest(
    val text: String,
    val language: String = "en"
)

data class TtsResponse(
    @SerializedName("audio_url") val audioUrl: String
)

data class RegisterDeviceRequest(
    val fcmToken: String,
    val deviceType: String = "android"
)

data class ChatMessageRequest(
    val sessionId: String,
    val message: String,
    val messageType: String = "text", // "text" or "voice"
    val language: String = "en" // "en" or "hi"
)

data class ChatMessageResponse(
    val success: Boolean,
    val response: String?,
    val message: String?
)

// ==================== STRUCTURED AI RESPONSE DTOs ====================

/**
 * Structured response from AI chatbot.
 * The backend enforces JSON output from the AI provider.
 */
data class StructuredAiResponse(
    val summary: String,
    @SerializedName("possible_conditions") val possibleConditions: List<String>?,
    val severity: String, // low, medium, high, critical
    @SerializedName("recommended_specialist") val recommendedSpecialist: String?,
    @SerializedName("requires_emergency") val requiresEmergency: Boolean,
    @SerializedName("confidence_score") val confidenceScore: Float?,
    @SerializedName("follow_up_question") val followUpQuestion: String?
)

/**
 * Full chatbot message response including provider metadata.
 */
data class ChatbotMessageResult(
    val response: StructuredAiResponse,
    val provider: String?, // "huggingface", "groq", "emergency_engine", "fallback"
    val model: String?,
    val latencyMs: Long?,
    val isEmergency: Boolean?,
    val emergencyNumbers: EmergencyNumbers?,
    val rateLimited: Boolean?,
    val usage: AiUsage?
)

data class EmergencyNumbers(
    val ambulance: String?,
    val national: String?,
    @SerializedName("poison_control") val poisonControl: String?
)

data class AiUsage(
    val promptTokens: Int?,
    val completionTokens: Int?,
    val totalTokens: Int?
)

/**
 * AI provider status for monitoring.
 */
data class AiProviderStatus(
    val name: String,
    val available: Boolean,
    @SerializedName("circuit_open") val circuitOpen: Boolean?,
    @SerializedName("failure_count") val failureCount: Int?
)

// ==================== AMBULANCE DTOs ====================

data class AmbulanceRequest(
    val latitude: Double,
    val longitude: Double,
    val emergencyType: String? = null,
    val notes: String? = null
)

data class AmbulanceDto(
    val id: String,
    @SerializedName("vehicle_number")
    val vehicleNumber: String,
    @SerializedName("driver_name")
    val driverName: String,
    @SerializedName("driver_phone")
    val driverPhone: String,
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double?
)

/**
 * Backend getAmbulanceLocation returns:
 * { requestId, status, ambulance: { id, vehicleNumber, driverName, driverPhone, type },
 *   currentLocation: { latitude, longitude, heading, speed },
 *   pickupLocation: { latitude, longitude },
 *   distance: "3.5 km", estimatedArrival: "12 min" }
 */
data class AmbulanceTrack(
    val requestId: String? = null,
    val status: String? = null,
    val ambulance: AmbulanceTrackInfo? = null,
    val currentLocation: AmbulanceTrackLocation? = null,
    val pickupLocation: AmbulanceTrackLocation? = null,
    val distance: String? = null,
    val estimatedArrival: String? = null
)

data class AmbulanceTrackInfo(
    val id: String?,
    val vehicleNumber: String?,
    val driverName: String?,
    val driverPhone: String?,
    val type: String?
)

data class AmbulanceTrackLocation(
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double?,
    val heading: Float? = null,
    val speed: Float? = null
)

data class CancelRequest(
    val reason: String?,
    val legalNoticeAccepted: Boolean = false
)

// ==================== PHARMACY / CLINIC / DIAGNOSTIC DTOs ====================

data class PharmacyDto(
    val id: String,
    val name: String,
    val address: String?,
    val phone: String?,
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double?,
    val distance: Float?,
    @SerializedName("is_open")
    val isOpen: Boolean?,
    val rating: Float?,
    @SerializedName("total_reviews")
    val totalReviews: Int?,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    @SerializedName("is_24_hours") val is24Hours: Boolean? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("delivery_available") val deliveryAvailable: Boolean? = null,
    @SerializedName("offers_delivery") val offersDelivery: Boolean? = null,
    @SerializedName("delivery_radius_km") val deliveryRadiusKm: Int? = null,
    @SerializedName("min_order_delivery") val minOrderDelivery: Double? = null,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null,
    val reels: List<PharmacyReelDto>? = null
)

data class ClinicDto(
    val id: String,
    val name: String,
    val address: String?,
    val phone: String?,
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double?,
    val distance: Float?,
    val rating: Float?,
    val specializations: List<String>?,
    @SerializedName("total_reviews")
    val totalReviews: Int?,
    @SerializedName("is_24_hours")
    val is24Hours: Boolean?,
    val city: String? = null,
    val state: String? = null,
    val email: String? = null,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    val facilities: List<String>? = null,
    val description: String? = null,
    @SerializedName("opening_hours") val openingHours: String? = null,
    @SerializedName("website_url") val websiteUrl: String? = null,
    @SerializedName("established_year") val establishedYear: Int? = null,
    @SerializedName("insurance_accepted") val insuranceAccepted: List<String>? = null,
    @SerializedName("virtual_tour_url") val virtualTourUrl: String? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null,
    val accreditations: List<String>? = null,
    val images: List<String>? = null,
    @SerializedName("is_emergency_available") val isEmergencyAvailable: Boolean? = null,
    val departments: List<ClinicDepartmentDto>? = null,
    val reels: List<ClinicReelDto>? = null
)

data class ClinicDepartmentDto(
    val id: String? = null,
    val name: String? = null,
    val description: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

data class ClinicReelDto(
    val id: String? = null,
    @SerializedName("video_url") val videoUrl: String? = null,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    val title: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class PharmacyReelDto(
    val id: String?,
    @SerializedName("video_url") val videoUrl: String?,
    @SerializedName("thumbnail_url") val thumbnailUrl: String?,
    val title: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class DiagnosticReelDto(
    val id: String,
    @SerializedName("video_url") val videoUrl: String,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    val title: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class DiagnosticCenterDto(
    val id: String,
    val name: String,
    val address: String?,
    val phone: String?,
    @SerializedName(value = "latitude", alternate = ["lat", "location_lat"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["lng", "location_lng"])
    val longitude: Double?,
    val distance: Float?,
    val rating: Float?,
    @SerializedName("emergency_services")
    val emergencyServices: Boolean?,
    @SerializedName("test_categories")
    val specialties: List<String>?,
    @SerializedName("total_reviews")
    val totalReviews: Int?,
    @SerializedName("is_24_hours")
    val is24Hours: Boolean?,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("home_collection_available") val homeCollectionAvailable: Boolean? = null,
    @SerializedName("home_collection_fee") val homeCollectionFee: Double? = null,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    val accreditations: List<String>? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null,
    val reels: List<DiagnosticReelDto>? = null,
    val tests: List<DiagnosticTestDto>? = null
)

// ==================== COMMON DTOs ====================

data class PaginationDto(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

data class ApiError(
    val success: Boolean = false,
    val message: String,
    val error: String?
)

// ==================== MEDICINE ORDER DTOs ====================

data class MedicineOrderRequest(
    val pharmacyId: String,
    val items: List<OrderItemRequest>,
    val deliveryAddress: String,
    val patientPhone: String? = null,
    val isPrescriptionOrder: Boolean = false,
    val isCatalogOrder: Boolean = false,
    @SerializedName("medcoinsRedeemed") val medcoinsRedeemed: Int? = null
)

data class OrderItemRequest(
    val medicineId: String? = null,
    @SerializedName("inventoryItemId") val inventoryItemId: String? = null,
    val name: String? = null,
    val genericName: String? = null,
    val quantity: Int,
    val price: Float? = null,
    @SerializedName("mrp") val mrp: Float? = null,
    @SerializedName("campaign_id") val campaignId: String? = null,
    @SerializedName("campaign_name") val campaignName: String? = null,
    @SerializedName("discount_amount") val discountAmount: Float? = null
)

data class MedicineOrderDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String,
    @SerializedName("pharmacy_id") val pharmacyId: String,
    val items: List<OrderItemDto>?,
    @SerializedName("delivery_address") val deliveryAddress: String?,
    @SerializedName("total_amount") val totalAmount: Float?,
    val status: String,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("tracking_token") val trackingToken: String?,
    @SerializedName("prescription_url") val prescriptionUrl: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    val pharmacy: OrderPharmacyDto?,
    @SerializedName("delivery_agents") val deliveryAgent: DeliveryAgentDto? = null
)

data class OrderPharmacyDto(
    val id: String,
    val name: String?,
    val phone: String?,
    val address: String?,
    val city: String?,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class OrderItemDto(
    val medicineId: String?,
    @SerializedName("medicine_id") val medicineIdAlt: String?,
    val quantity: Int,
    val name: String?,
    val price: Float?,
    val subtotal: Float?
)

// ==================== DIAGNOSTIC CENTER DTOs ====================

data class DiagnosticTestDto(
    val id: String,
    val name: String,
    val description: String?,
    val category: String?,
    val price: Float?,
    @SerializedName("preparation_instructions") val preparationInstructions: String?,
    @SerializedName("report_time") val reportTime: String?,
    @SerializedName("turnaround_hours") val turnaroundHours: Int?,
    @SerializedName("sample_type") val sampleType: String?,
    @SerializedName("is_active") val isActive: Boolean?,
    @SerializedName("image_url") val imageUrl: String? = null
)

data class DiagnosticBookingRequest(
    val centerId: String,
    val testId: String? = null,
    val bookingDate: String,
    val bookingTime: String?,
    val collectionType: String?,
    val collectionAddress: String?,
    val patientPhone: String? = null,
    val notes: String?,
    val prescriptionId: String? = null
)

data class DiagnosticBookingDto(
    val id: String,
    @SerializedName("booking_number") val bookingNumber: String?,
    @SerializedName("patient_id") val patientId: String?,
    @SerializedName("center_id") val centerId: String?,
    @SerializedName("test_id") val testId: String?,
    @SerializedName("booking_date") val bookingDate: String?,
    @SerializedName("booking_time") val bookingTime: String?,
    @SerializedName("collection_type") val collectionType: String?,
    @SerializedName("collection_address") val collectionAddress: String?,
    val status: String?,
    @SerializedName("result_status") val resultStatus: String?,
    @SerializedName("result_url") val resultUrl: String?,
    @SerializedName("result_notes") val resultNotes: String?,
    @SerializedName("result_uploaded_at") val resultUploadedAt: String?,
    @SerializedName("tracking_token") val trackingToken: String?,
    val notes: String?,
    @SerializedName("prescription_id") val prescriptionId: String?,
    @SerializedName("created_at") val createdAt: String?,
    val test: DiagnosticTestDto?,
    val center: DiagnosticCenterDto?,
    @SerializedName("delivery_agents") val deliveryAgent: DeliveryAgentDto? = null
)

data class DeliveryAgentDto(
    val id: String,
    val name: String,
    val phone: String,
    @SerializedName("vehicle_details") val vehicleDetails: String?,
    val status: String?,
    val latitude: Double? = null,
    val longitude: Double? = null
)

// ==================== VITALS DTOs ====================

data class VitalDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String?,
    val type: String? = null,
    val value: String? = null,
    val unit: String? = null,
    val notes: String? = null,
    @SerializedName("recorded_at") val recordedAt: String? = null,
    // Columnar vitals from DB — backend may return these instead of type/value
    @SerializedName("heart_rate") val heartRate: Float? = null,
    @SerializedName("blood_pressure_systolic") val bloodPressureSystolic: Float? = null,
    @SerializedName("blood_pressure_diastolic") val bloodPressureDiastolic: Float? = null,
    val temperature: Float? = null,
    @SerializedName("oxygen_saturation") val oxygenSaturation: Float? = null,
    @SerializedName("oxygen_level") val oxygenLevel: Float? = null,
    @SerializedName("blood_sugar") val bloodSugar: Float? = null,
    val weight: Float? = null,
    val height: Float? = null,
    val steps: Long? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class CreateVitalRequest(
    val type: String,
    val value: String,
    val unit: String? = null,
    val notes: String? = null
)

data class SyncVitalsRequest(
    val vitals: List<Map<String, String>>
)

data class WearableSummaryRequest(
    @SerializedName("summary_date") val summaryDate: String,
    val source: String = "google_health_connect",
    val steps: Long = 0,
    @SerializedName("distance_meters") val distanceMeters: Double = 0.0,
    @SerializedName("active_calories") val activeCalories: Double = 0.0,
    @SerializedName("total_calories") val totalCalories: Double = 0.0,
    @SerializedName("active_minutes") val activeMinutes: Long = 0,
    @SerializedName("exercise_minutes") val exerciseMinutes: Long = 0,
    @SerializedName("workouts_count") val workoutsCount: Int = 0,
    @SerializedName("heart_rate_avg") val heartRateAvg: Double? = null,
    @SerializedName("heart_rate_min") val heartRateMin: Long? = null,
    @SerializedName("heart_rate_max") val heartRateMax: Long? = null,
    @SerializedName("sleep_minutes") val sleepMinutes: Long? = null,
    val metadata: Map<String, String> = emptyMap()
)

data class WearableDailySummaryDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String?,
    @SerializedName("summary_date") val summaryDate: String?,
    val source: String?,
    val steps: Long? = null,
    @SerializedName("distance_meters") val distanceMeters: Double? = null,
    @SerializedName("active_calories") val activeCalories: Double? = null,
    @SerializedName("total_calories") val totalCalories: Double? = null,
    @SerializedName("active_minutes") val activeMinutes: Long? = null,
    @SerializedName("exercise_minutes") val exerciseMinutes: Long? = null,
    @SerializedName("workouts_count") val workoutsCount: Int? = null,
    @SerializedName("heart_rate_avg") val heartRateAvg: Double? = null,
    @SerializedName("heart_rate_min") val heartRateMin: Long? = null,
    @SerializedName("heart_rate_max") val heartRateMax: Long? = null,
    @SerializedName("sleep_minutes") val sleepMinutes: Long? = null,
    @SerializedName("synced_at") val syncedAt: String? = null
)

data class WellnessWorkoutPlanDto(
    val id: String,
    val slug: String? = null,
    val title: String,
    val description: String? = null,
    val goal: String? = null,
    val level: String? = null,
    @SerializedName("plan_type") val planType: String? = null,
    @SerializedName("location_type") val locationType: String? = null,
    @SerializedName("minutes_per_session") val minutesPerSession: Int? = null,
    @SerializedName("duration_weeks") val durationWeeks: Int? = null,
    @SerializedName("days_per_week") val daysPerWeek: Int? = null,
    val equipment: List<String>? = null,
    @SerializedName("cover_image_url") val coverImageUrl: String? = null
)

data class ExerciseLibraryDto(
    val id: String,
    val slug: String? = null,
    val name: String,
    @SerializedName("workout_type") val workoutType: String? = null,
    @SerializedName("primary_muscle_group") val primaryMuscleGroup: String? = null,
    @SerializedName("secondary_muscle_groups") val secondaryMuscleGroups: List<String>? = null,
    val equipment: List<String>? = null,
    val level: String? = null,
    val instructions: List<String>? = null,
    @SerializedName("safety_notes") val safetyNotes: List<String>? = null,
    @SerializedName("body_part") val bodyPart: String? = null,
    @SerializedName("target_muscle") val targetMuscle: String? = null,
    val category: String? = null,
    @SerializedName("animation_url") val animationUrl: String? = null,
    @SerializedName("video_url") val videoUrl: String? = null,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerializedName("asset_source_url") val assetSourceUrl: String? = null,
    @SerializedName("asset_license") val assetLicense: String? = null,
    @SerializedName("asset_credit") val assetCredit: String? = null
)

data class WellnessCoachDto(
    val id: String,
    val name: String,
    val headline: String? = null,
    @SerializedName("coach_types") val coachTypes: List<String>? = null,
    val specialties: List<String>? = null,
    @SerializedName("expertise_tags") val expertiseTags: List<String>? = null,
    val languages: List<String>? = null,
    @SerializedName("session_fee") val sessionFee: Double? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val rating: Double? = null,
    @SerializedName("total_reviews") val totalReviews: Int? = null,
    val city: String? = null,
    @SerializedName("session_modes") val sessionModes: List<String>? = null
)

data class FitnessCenterReelDto(
    val id: String? = null,
    @SerializedName("video_url") val videoUrl: String? = null,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    val title: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class FitnessCenterDto(
    val id: String,
    val name: String,
    @SerializedName("center_type") val centerType: String? = null,
    val description: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val phone: String? = null,
    val email: String? = null,
    val rating: Double? = null,
    @SerializedName("total_reviews") val totalReviews: Int? = null,
    @SerializedName("membership_price") val membershipPrice: Double? = null,
    @SerializedName("day_pass_price") val dayPassPrice: Double? = null,
    @SerializedName("trial_class_price") val trialClassPrice: Double? = null,
    @SerializedName("cover_image_url") val coverImageUrl: String? = null,
    val photos: List<String>? = null,
    val facilities: List<String>? = null,
    val equipment: List<String>? = null,
    val amenities: List<String>? = null,
    @SerializedName("opening_hours") val openingHours: JsonElement? = null,
    @SerializedName("is_women_only") val isWomenOnly: Boolean? = null,
    @SerializedName("is_beginner_friendly") val isBeginnerFriendly: Boolean? = null,
    @SerializedName("is_24_hours") val is24Hours: Boolean? = null,
    @SerializedName("parking_available") val parkingAvailable: Boolean? = null,
    @SerializedName("accessibility_features") val accessibilityFeatures: List<String>? = null,
    @SerializedName("trainer_available") val trainerAvailable: Boolean? = null,
    @SerializedName("safety_information") val safetyInformation: JsonElement? = null,
    @SerializedName("is_verified") val isVerified: Boolean? = null,
    @SerializedName("is_active") val isActive: Boolean? = null,
    val classes: List<FitnessClassDto>? = null,
    val trainers: List<FitnessCenterTrainerDto>? = null,
    val reels: List<FitnessCenterReelDto>? = null,
    val distance: Double? = null
)

data class FitnessClassDto(
    val id: String? = null,
    val title: String? = null,
    @SerializedName("class_type") val classType: String? = null,
    val level: String? = null,
    val description: String? = null,
    @SerializedName("starts_at") val startsAt: String? = null,
    @SerializedName("ends_at") val endsAt: String? = null,
    val capacity: Int? = null,
    @SerializedName("booked_count") val bookedCount: Int? = null,
    val price: Double? = null,
    val status: String? = null
)

data class FitnessCenterTrainerDto(
    val id: String? = null,
    val role: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null,
    @SerializedName("joined_at") val joinedAt: String? = null,
    val coach: WellnessCoachDto? = null
)

data class FitnessBookingRequest(
    @SerializedName("centerId") val centerId: String,
    @SerializedName("bookingType") val bookingType: String = "day_pass",
    val amount: Double? = null,
    val notes: String? = null
)

data class WellnessGroupDto(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerializedName("goal_tag") val goalTag: String? = null,
    val city: String? = null,
    @SerializedName("member_count") val memberCount: Int? = null,
    @SerializedName("host_coach_name") val hostCoachName: String? = null,
    @SerializedName("host_coach_image") val hostCoachImage: String? = null,
    @SerializedName("recent_tip") val recentTip: String? = null,
    @SerializedName("is_joined") val isJoined: Boolean? = null
)

data class WellnessChallengeDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerializedName("challenge_type") val challengeType: String? = null,
    @SerializedName("target_value") val targetValue: Double? = null,
    @SerializedName("target_unit") val targetUnit: String? = null,
    val metric: String? = null,
    @SerializedName("participant_count") val participantCount: Int? = null,
    @SerializedName("progress_value") val progressValue: Double? = null,
    @SerializedName("progress_percent") val progressPercent: Int? = null,
    @SerializedName("is_joined") val isJoined: Boolean? = null,
    @SerializedName("reward_xp") val rewardXp: Int? = null,
    @SerializedName("reward_medcoins") val rewardMedCoins: Int? = null,
    @SerializedName("coach_name") val coachName: String? = null,
    @SerializedName("ends_at") val endsAt: String? = null
)

data class WellnessLeaderboardEntryDto(
    val id: String? = null,
    @SerializedName("patient_id") val patientId: String? = null,
    val rank: Int? = null,
    @SerializedName("progress_value") val progressValue: Double? = null,
    @SerializedName("is_self") val isSelf: Boolean? = null,
    val patient: PatientLeaderboardProfileDto? = null
)

data class PatientLeaderboardProfileDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val city: String? = null
)

data class TrustedSupplementDto(
    val id: String,
    val name: String,
    val brand: String? = null,
    val category: String? = null,
    val description: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    val price: Double? = null,
    val mrp: Double? = null,
    @SerializedName("fssai_license") val fssaiLicense: String? = null,
    @SerializedName("batch_number") val batchNumber: String? = null,
    @SerializedName("authenticity_qr_url") val authenticityQrUrl: String? = null,
    val ingredients: List<String>? = null,
    val allergens: List<String>? = null,
    @SerializedName("usage_instructions") val usageInstructions: String? = null,
    val rating: Double? = null,
    @SerializedName("seller_name") val sellerName: String? = null,
    @SerializedName("delivery_mins") val deliveryMins: Int? = null,
    @SerializedName("is_verified") val isVerified: Boolean? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

// ==================== WELLNESS ASSESSMENT DTOs ====================

data class WellnessAssessmentDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String? = null,
    val status: String? = null, // "pending", "in_progress", "completed"
    val goals: WellnessGoalsDto? = null,
    val bio: WellnessBioDto? = null,
    @SerializedName("health_screening") val healthScreening: WellnessHealthScreeningDto? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null
)

data class WellnessGoalsDto(
    @SerializedName("primary_goal") val primaryGoal: String? = null,
    @SerializedName("secondary_goals") val secondaryGoals: List<String>? = null,
    @SerializedName("target_weight") val targetWeight: Double? = null,
    @SerializedName("activity_level") val activityLevel: String? = null,
    @SerializedName("workout_frequency") val workoutFrequency: Int? = null,
    @SerializedName("preferred_workout_time") val preferredWorkoutTime: String? = null,
    @SerializedName("preferred_workout_types") val preferredWorkoutTypes: List<String>? = null
)

data class WellnessBioDto(
    val height: Double? = null,
    val weight: Double? = null,
    val age: Int? = null,
    val gender: String? = null,
    @SerializedName("body_fat_percentage") val bodyFatPercentage: Double? = null,
    @SerializedName("fitness_level") val fitnessLevel: String? = null,
    @SerializedName("available_equipment") val availableEquipment: List<String>? = null,
    @SerializedName("workout_location") val workoutLocation: String? = null,
    @SerializedName("dietary_preferences") val dietaryPreferences: List<String>? = null,
    val allergies: List<String>? = null
)

data class WellnessHealthScreeningDto(
    @SerializedName("has_medical_conditions") val hasMedicalConditions: Boolean? = null,
    @SerializedName("medical_conditions") val medicalConditions: List<String>? = null,
    @SerializedName("has_injuries") val hasInjuries: Boolean? = null,
    val injuries: List<String>? = null,
    @SerializedName("is_pregnant") val isPregnant: Boolean? = null,
    @SerializedName("takes_medication") val takesMedication: Boolean? = null,
    val medications: List<String>? = null,
    @SerializedName("doctor_clearance") val doctorClearance: Boolean? = null,
    @SerializedName("par_q_passed") val parQPassed: Boolean? = null,
    @SerializedName("risk_level") val riskLevel: String? = null
)

// ==================== CLINICAL SAFETY & PHYSICAL READINESS DTOs ====================

data class WellnessSafetyDto(
    @SerializedName("clearance_status") val clearanceStatus: String? = "cleared",
    @SerializedName("status_badge") val statusBadge: String? = "🟢 100% Cleared for Active Training",
    @SerializedName("badge_color") val badgeColor: String? = "#16A34A",
    @SerializedName("clearance_notes") val clearanceNotes: String? = null,
    @SerializedName("par_q_completed") val parQCompleted: Boolean? = false,
    @SerializedName("par_q_passed") val parQPassed: Boolean? = true,
    @SerializedName("safety_flags") val safetyFlags: List<String>? = emptyList(),
    val injuries: List<String>? = emptyList(),
    @SerializedName("excluded_exercises") val excludedExercises: List<ExcludedExerciseDto>? = emptyList(),
    @SerializedName("safe_alternatives") val safeAlternatives: List<SafeAlternativeDto>? = emptyList(),
    @SerializedName("vitals_guardrails") val vitalsGuardrails: VitalsGuardrailDto? = null,
    @SerializedName("unwell_protocols") val unwellProtocols: List<UnwellProtocolDto>? = emptyList(),
    @SerializedName("doctor_referral_recommended") val doctorReferralRecommended: Boolean? = false,
    @SerializedName("drug_nutrient_interlocks") val drugNutrientInterlocks: List<DrugNutrientInterlockDto>? = emptyList(),
    @SerializedName("clearance_certificate") val clearanceCertificate: MedicalClearanceCertificateDto? = null
)

data class DrugNutrientInterlockDto(
    val id: String,
    @SerializedName("medication_class") val medicationClass: String,
    val indication: String,
    @SerializedName("contraindicated_nutrient") val contraindicatedNutrient: String,
    val severity: String,
    @SerializedName("risk_mechanism") val riskMechanism: String,
    @SerializedName("safe_substitute") val safeSubstitute: String,
    @SerializedName("action_required") val actionRequired: String
)

data class MedicalClearanceCertificateDto(
    @SerializedName("certificate_id") val certificateId: String,
    @SerializedName("patient_name") val patientName: String,
    @SerializedName("patient_id") val patientId: String,
    val age: Int,
    val gender: String,
    @SerializedName("clearance_status") val clearanceStatus: String,
    @SerializedName("clearance_title") val clearanceTitle: String,
    @SerializedName("issue_date") val issueDate: String,
    @SerializedName("expiry_date") val expiryDate: String,
    @SerializedName("par_q_status") val parQStatus: String,
    @SerializedName("safe_vitals_envelope") val safeVitalsEnvelope: SafeVitalsEnvelopeDto,
    @SerializedName("authorized_medical_officer") val authorizedMedicalOfficer: AuthorizedMedicalOfficerDto,
    @SerializedName("verification_qr_url") val verificationQrUrl: String,
    @SerializedName("allowed_facilities") val allowedFacilities: List<String> = emptyList()
)

data class SafeVitalsEnvelopeDto(
    @SerializedName("max_heart_rate_cap") val maxHeartRateCap: String,
    @SerializedName("target_cardio_zone") val targetCardioZone: String,
    @SerializedName("blood_pressure_envelope") val bloodPressureEnvelope: String
)

data class AuthorizedMedicalOfficerDto(
    val name: String,
    @SerializedName("registration_no") val registrationNo: String,
    val department: String,
    val seal: String
)

data class SafetyIncidentRequest(
    val symptom: String,
    @SerializedName("muscle_group") val muscleGroup: String? = null,
    val severity: String = "moderate",
    val notes: String? = null,
    @SerializedName("workout_name") val workoutName: String? = null,
    @SerializedName("current_heart_rate") val currentHeartRate: Int? = null
)

data class SafetyIncidentResponseDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String,
    @SerializedName("patient_name") val patientName: String,
    val symptom: String,
    @SerializedName("muscle_group") val muscleGroup: String?,
    val severity: String,
    @SerializedName("current_heart_rate") val currentHeartRate: Int?,
    val notes: String?,
    @SerializedName("workout_name") val workoutName: String?,
    @SerializedName("logged_at") val loggedAt: String,
    val status: String,
    @SerializedName("suggested_adaptation") val suggestedAdaptation: String?
)

data class ExcludedExerciseDto(
    val name: String,
    val reason: String
)

data class SafeAlternativeDto(
    val name: String,
    val benefit: String
)

data class VitalsGuardrailDto(
    @SerializedName("max_heart_rate") val maxHeartRate: Int? = 165,
    @SerializedName("aerobic_zone") val aerobicZone: String? = "115 - 145 BPM",
    @SerializedName("fat_burn_zone") val fatBurnZone: String? = "95 - 115 BPM",
    @SerializedName("max_systolic_bp") val maxSystolicBp: Int? = 140,
    @SerializedName("max_diastolic_bp") val maxDiastolicBp: Int? = 90,
    @SerializedName("hydration_target") val hydrationTarget: String? = "3.0 Liters / day"
)

data class UnwellProtocolDto(
    val id: String,
    val symptom: String,
    val severity: String,
    val action: String,
    @SerializedName("is_emergency") val isEmergency: Boolean? = false
)

data class CreateAssessmentGoalsRequest(
    @SerializedName("primary_goal") val primaryGoal: String,
    @SerializedName("secondary_goals") val secondaryGoals: List<String> = emptyList(),
    @SerializedName("target_weight") val targetWeight: Double? = null,
    @SerializedName("activity_level") val activityLevel: String,
    @SerializedName("workout_frequency") val workoutFrequency: Int,
    @SerializedName("preferred_workout_time") val preferredWorkoutTime: String? = null,
    @SerializedName("preferred_workout_types") val preferredWorkoutTypes: List<String> = emptyList()
)

data class CreateAssessmentBioRequest(
    val height: Double,
    val weight: Double,
    val age: Int? = null,
    val gender: String? = null,
    @SerializedName("body_fat_percentage") val bodyFatPercentage: Double? = null,
    @SerializedName("fitness_level") val fitnessLevel: String,
    @SerializedName("available_equipment") val availableEquipment: List<String> = emptyList(),
    @SerializedName("workout_location") val workoutLocation: String? = null,
    @SerializedName("dietary_preferences") val dietaryPreferences: List<String> = emptyList(),
    val allergies: List<String> = emptyList()
)

data class CreateHealthScreeningRequest(
    @SerializedName("has_medical_conditions") val hasMedicalConditions: Boolean,
    @SerializedName("medical_conditions") val medicalConditions: List<String> = emptyList(),
    @SerializedName("has_injuries") val hasInjuries: Boolean,
    val injuries: List<String> = emptyList(),
    @SerializedName("is_pregnant") val isPregnant: Boolean = false,
    @SerializedName("takes_medication") val takesMedication: Boolean = false,
    val medications: List<String> = emptyList(),
    @SerializedName("doctor_clearance") val doctorClearance: Boolean = false
)

// ==================== REMINDER DTOs (CRUD) ====================


data class CreateReminderRequest(
    val title: String,
    val type: String,
    val time: String,
    val days: List<String> = emptyList(),
    val notes: String? = null
)

data class UpdateReminderRequest(
    val title: String? = null,
    val type: String? = null,
    val time: String? = null,
    val days: List<String>? = null,
    val notes: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

data class ReminderActionRequest(
    val action: String,
    @SerializedName("snoozeMinutes") val snoozeMinutes: Int? = null,
    @SerializedName("scheduledAt") val scheduledAt: String? = null
)

data class ReminderActionResultDto(
    @SerializedName("reminderId") val reminderId: String,
    val action: String,
    @SerializedName("scheduledAt") val scheduledAt: String,
    @SerializedName("actedAt") val actedAt: String,
    @SerializedName("snoozeUntil") val snoozeUntil: String? = null
)

// ==================== CLINIC DOCTOR DTOs (public discovery) ====================

data class ClinicDoctorDto(
    val id: String,
    val name: String,
    val specialization: String?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("consultation_fee") val consultationFee: Int?,
    @SerializedName("experience_years") val experienceYears: Int?,
    val rating: Float? = null,
    @SerializedName("average_rating") val averageRating: Float? = null,
    @SerializedName("intro_video_url") val introVideoUrl: String? = null
) {
    /** Unified accessor: prefer explicit rating, then average_rating, default 0 */
    val resolvedRating: Float get() = rating ?: averageRating ?: 0f
}

// ==================== PHARMACY INVENTORY DTOs (public browse) ====================

data class PharmacyInventoryResponse(
    val success: Boolean,
    val data: List<PharmacyInventoryItemDto>?,
    val items: List<PharmacyInventoryItemDto>?,
    val pagination: PaginationDto?
) {
    /** Backend returns both 'data' and 'items' aliases — use whichever is populated */
    val allItems: List<PharmacyInventoryItemDto> get() = data ?: items ?: emptyList()
}

data class PharmacyInventoryItemDto(
    val id: String,
    @SerializedName("medicine_id") val medicineId: String?,
    val name: String?,
    @SerializedName("medicine_name") val medicineName: String?,
    val category: String?,
    val quantity: Int?,
    val price: Float?,
    val mrp: Float?,
    @SerializedName("pack_size") val packSize: Int? = 1,
    @SerializedName("unit_type") val unitType: String? = "unit",
    val manufacturer: String?,
    @SerializedName("requires_prescription") val requiresPrescription: Boolean?,
    @SerializedName("expiry_date") val expiryDate: String?,
    val unit: String?,
    @SerializedName("image_url") val imageUrl: String? = null,
    // Campaign pricing
    @SerializedName("campaign_price") val campaignPrice: Float? = null,
    @SerializedName("campaign_discount_pct") val campaignDiscountPct: Float? = null,
    @SerializedName("campaign_id") val campaignId: String? = null,
    @SerializedName("campaign_name") val campaignName: String? = null
) {
    /** Unified display name */
    val displayName: String get() = name ?: medicineName ?: "Unknown"
    /** In stock if quantity > 0 */
    val inStock: Boolean get() = (quantity ?: 0) > 0
    /** Effective price after campaign discount */
    val effectivePrice: Float get() = campaignPrice ?: price ?: 0f
    val hasActiveCampaign: Boolean
        get() = campaignPrice != null && price != null && campaignPrice!! < price!!
    val discountPercentage: Float
        get() = if (hasActiveCampaign) ((price!! - campaignPrice!!) * 100 / price!!) else 0f
}

// ==================== HOSPITAL REVIEW DTO ====================

data class HospitalReviewDto(
    val id: String,
    val rating: Int,
    val comment: String?,
    val patientName: String?,
    val patientImage: String?,
    val createdAt: String?
)

// ==================== WELLNESS COACH DETAIL DTO (Full profile from /coaches/:id) ====================

data class WellnessCoachDetailDto(
    val id: String,
    val name: String,
    val headline: String? = null,
    val bio: String? = null,
    @SerializedName("coach_types") val coachTypes: List<String>? = null,
    val specialties: List<String>? = null,
    @SerializedName("expertise_tags") val expertiseTags: List<String>? = null,
    val qualifications: List<String>? = null,
    val certifications: List<String>? = null,
    @SerializedName("registration_number") val registrationNumber: String? = null,
    @SerializedName("experience_years") val experienceYears: Int? = null,
    @SerializedName("session_modes") val sessionModes: List<String>? = null,
    val languages: List<String>? = null,
    @SerializedName("session_fee") val sessionFee: Double? = null,
    @SerializedName("video_session_fee") val videoSessionFee: Double? = null,
    @SerializedName("monthly_plan_fee") val monthlyPlanFee: Double? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val phone: String? = null,
    val email: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    @SerializedName("gallery_images") val galleryImages: List<String>? = null,
    @SerializedName("available_days") val availableDays: List<String>? = null,
    @SerializedName("available_hours") val availableHours: JsonElement? = null,
    @SerializedName("is_available") val isAvailable: Boolean? = null,
    val rating: Double? = null,
    @SerializedName("total_reviews") val totalReviews: Int? = null,
    @SerializedName("total_clients") val totalClients: Int? = null,
    @SerializedName("total_sessions") val totalSessions: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

// ==================== WELLNESS SESSION DTOs ====================

data class WellnessSessionDto(
    val id: String,
    @SerializedName("session_number") val sessionNumber: String? = null,
    @SerializedName("patient_id") val patientId: String? = null,
    @SerializedName("coach_id") val coachId: String? = null,
    @SerializedName("center_id") val centerId: String? = null,
    @SerializedName("scheduled_at") val scheduledAt: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    @SerializedName("session_type") val sessionType: String? = null,
    val status: String? = null,
    val fee: Double? = null,
    @SerializedName("payment_status") val paymentStatus: String? = null,
    @SerializedName("room_id") val roomId: String? = null,
    @SerializedName("patient_notes") val patientNotes: String? = null,
    @SerializedName("coach_notes") val coachNotes: String? = null,
    @SerializedName("safety_flags") val safetyFlags: List<String>? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
    val coach: WellnessCoachDto? = null,
    val patient: WellnessSessionPatientDto? = null
)

data class WellnessSessionPatientDto(
    val id: String,
    val name: String? = null
)

data class BookWellnessSessionRequest(
    @SerializedName("coach_id") val coachId: String,
    @SerializedName("scheduled_at") val scheduledAt: String,
    @SerializedName("session_type") val sessionType: String = "video",
    @SerializedName("duration_minutes") val durationMinutes: Int = 45,
    @SerializedName("center_id") val centerId: String? = null,
    val notes: String? = null,
    @SerializedName("safety_flags") val safetyFlags: List<String> = emptyList()
)

// ==================== WORKOUT LOG DTOs ====================

data class LogWorkoutRequest(
    @SerializedName("plan_id") val planId: String? = null,
    @SerializedName("session_id") val sessionId: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int,
    @SerializedName("calories_burned") val caloriesBurned: Double? = null,
    @SerializedName("perceived_intensity") val perceivedIntensity: String? = null,
    val feedback: String? = null,
    @SerializedName("pain_reported") val painReported: Boolean = false,
    val exercises: List<WorkoutExerciseLogDto>? = null
)

data class WorkoutExerciseLogDto(
    @SerializedName("exercise_id") val exerciseId: String? = null,
    val name: String? = null,
    val sets: Int? = null,
    val reps: Int? = null,
    @SerializedName("weight_kg") val weightKg: Double? = null,
    @SerializedName("duration_seconds") val durationSeconds: Int? = null,
    val completed: Boolean = true
)

data class AssignWorkoutPlanRequest(
    @SerializedName("coach_id") val coachId: String? = null
)

data class WorkoutSessionDto(
    val id: String,
    @SerializedName("plan_id") val planId: String? = null,
    @SerializedName("day_index") val dayIndex: Int? = null,
    @SerializedName("week_index") val weekIndex: Int? = null,
    val title: String? = null,
    val category: String? = null,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null,
    val intensity: String? = null,
    @SerializedName("body_parts") val bodyParts: List<String>? = null,
    val warmup: JsonElement? = null,
    val exercises: JsonElement? = null,
    val cooldown: JsonElement? = null,
    val instructions: String? = null,
    @SerializedName("media_url") val mediaUrl: String? = null,
    @SerializedName("sort_order") val sortOrder: Int? = null
)

data class PatientWorkoutPlanDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String? = null,
    @SerializedName("plan_id") val planId: String? = null,
    @SerializedName("coach_id") val coachId: String? = null,
    val status: String? = null,
    @SerializedName("started_at") val startedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("adherence_percent") val adherencePercent: Double? = null,
    @SerializedName("streak_days") val streakDays: Int? = null,
    val plan: WellnessWorkoutPlanDto? = null
)

// ==================== SMART HEALTH HUB AGGREGATE ====================

data class WellnessHubDto(
    val patient: WellnessHubPatientDto? = null,
    val counts: WellnessHubCountsDto? = null,
    @SerializedName("today_stats") val todayStats: WellnessHubTodayStatsDto? = null,
    @SerializedName("active_workout_plan") val activeWorkoutPlan: PatientWorkoutPlanDto? = null,
    @SerializedName("workouts_completed_today") val workoutsCompletedToday: Int = 0,
    val reels: List<WellnessReelDto> = emptyList(),
    val badges: List<JsonObject> = emptyList()
)

data class WellnessHubPatientDto(
    val id: String? = null,
    val name: String? = null,
    val city: String? = null
)

data class WellnessHubCountsDto(
    @SerializedName("workoutPlans") val workoutPlans: Int = 0,
    @SerializedName("exercises") val exercises: Int = 0,
    @SerializedName("coaches") val coaches: Int = 0,
    @SerializedName("fitnessCenters") val fitnessCenters: Int = 0,
    @SerializedName("groups") val groups: Int = 0,
    @SerializedName("challenges") val challenges: Int = 0,
    @SerializedName("supplements") val supplements: Int = 0
)

data class WellnessHubTodayStatsDto(
    val steps: Int = 0,
    @SerializedName("active_calories") val activeCalories: Int = 0,
    @SerializedName("active_minutes") val activeMinutes: Int = 0
)

// ==================== LEADERBOARD ====================

data class LeaderboardEntryDto(
    val id: String? = null,
    val rank: Int = 0,
    @SerializedName("patient_id") val patientId: String? = null,
    @SerializedName("patient_name") val patientName: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    @SerializedName("progress_value") val score: Double = 0.0,
    @SerializedName("source_metric") val unit: String? = null,
    @SerializedName("is_self") val isSelf: Boolean = false,
    val patient: LeaderboardPatientDto? = null
) {
    val displayName: String get() = patient?.name ?: patientName ?: "Athlete"
    val displayImageUrl: String? get() = patient?.profileImageUrl ?: profileImageUrl
    val displayUnit: String get() = unit ?: "points"
}

data class LeaderboardPatientDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val city: String? = null
)

data class ChallengeLeaderboardResponse(
    val challenge: JsonObject? = null,
    val entries: List<LeaderboardEntryDto> = emptyList(),
    @SerializedName("totalEntries") val totalEntries: Int = 0
)

// ==================== WELLNESS STREAKS ====================

data class WellnessStreakDto(
    @SerializedName("current_streak") val currentStreak: Int = 0,
    @SerializedName("longest_streak") val longestStreak: Int = 0,
    @SerializedName("active_days_total") val activeDaysTotal: Int = 0,
    @SerializedName("active_days_last7") val activeDaysLast7: Int = 0,
    @SerializedName("active_days_last30") val activeDaysLast30: Int = 0,
    @SerializedName("last_workout_at") val lastWorkoutAt: String? = null
)

// ==================== WELLNESS REELS ====================

data class WellnessReelDto(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    @SerializedName("video_url") val videoUrl: String? = null,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    val category: String? = null,
    val tags: List<String>? = null,
    @SerializedName("duration_seconds") val durationSeconds: Int? = null,
    @SerializedName("likes_count") val likesCount: Int? = null,
    @SerializedName("views_count") val viewsCount: Int? = null,
    val status: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null,
    val coach: WellnessReelCoachDto? = null
)

data class WellnessReelCoachDto(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val headline: String? = null,
    @SerializedName("coach_types") val coachTypes: List<String>? = null,
    @SerializedName("sub_role") val subRole: String? = null
)

// ==================== WELLNESS CHAT ====================

data class WellnessChatMessageDto(
    val id: String? = null,
    @SerializedName("userId") val userId: String? = null,
    val role: String? = null,
    val message: String? = null,
    val timestamp: String? = null
)

// ==================== COACH DASHBOARD ====================

data class CoachPatientDto(
    val id: String? = null,
    @SerializedName("user_id") val userId: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val city: String? = null,
    @SerializedName("total_sessions") val totalSessions: Int = 0,
    @SerializedName("last_session_at") val lastSessionAt: String? = null,
    @SerializedName("active_plans") val activePlans: Int = 0,
    val source: String? = null
)

data class UpdateCoachAvailabilityRequest(
    @SerializedName("is_available") val isAvailable: Boolean? = null,
    @SerializedName("is_accepting_clients") val isAcceptingClients: Boolean? = null
)

// ==================== QR CHECK-IN ====================

data class QrCheckInRequest(
    @SerializedName("center_id") val centerId: String,
    @SerializedName("qr_token") val qrToken: String? = null,
    @SerializedName("booking_id") val bookingId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class UpdateChallengeProgressRequest(
    @SerializedName("progress_value") val progressValue: Double? = null,
    @SerializedName("source_metric") val sourceMetric: String? = null,
    val note: String? = null
)

// ==================== WORKOUT CALENDAR ====================

data class WorkoutCalendarDayDto(
    val date: String,
    @SerializedName("workouts_completed") val workoutsCompleted: Int = 0,
    @SerializedName("duration_minutes") val durationMinutes: Int = 0,
    @SerializedName("calories_burned") val caloriesBurned: Double = 0.0,
    @SerializedName("is_rest_day") val isRestDay: Boolean = false
)

// ==================== WELLNESS TYPED REPORTS ====================

data class WellnessReportSectionDto(
    val title: String,
    val type: String? = null,   // "workout", "nutrition", "sleep", "recovery"
    val value: Double = 0.0,
    val unit: String? = null,
    @SerializedName("trend_percent") val trendPercent: Double? = null,
    @SerializedName("trend_direction") val trendDirection: String? = null,
    @SerializedName("chart_data") val chartData: List<ChartPointDto>? = null
)

data class ChartPointDto(
    val label: String,
    val value: Double
)

// ==================== COMMUNITY SOCIAL FEED & CHECK-INS ====================

data class GroupPostDto(
    val id: String,
    @SerializedName("group_id") val groupId: String? = null,
    @SerializedName("author_id") val authorId: String? = null,
    @SerializedName("author_name") val authorName: String? = "Swastik Athlete",
    @SerializedName("author_role") val authorRole: String? = "Member",
    @SerializedName("author_avatar") val authorAvatar: String? = null,
    @SerializedName("workout_tag") val workoutTag: String? = "🏃 Daily Check-in",
    @SerializedName("metric_display") val metricDisplay: String? = "Milestone logged",
    val content: String = "",
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("cheers_count") val cheersCount: Int = 0,
    @SerializedName("is_cheered") val isCheered: Boolean = false,
    @SerializedName("created_at") val createdAt: String? = null
)

data class CreateGroupPostRequest(
    val content: String,
    @SerializedName("workoutTag") val workoutTag: String? = "🏃 Daily Check-in",
    @SerializedName("metricDisplay") val metricDisplay: String? = "Milestone logged",
    @SerializedName("imageUrl") val imageUrl: String? = null
)

data class CheerPostResponse(
    val postId: String? = null,
    @SerializedName("cheers_count") val cheersCount: Int = 0,
    @SerializedName("is_cheered") val isCheered: Boolean = false
)
