package com.example.swastik.ambulance.data.remote.dto

import com.google.gson.annotations.SerializedName

// ==================== Auth DTOs ====================

data class LoginRequest(
    val email: String,
    val password: String,
    val role: String? = null
)

data class RegisterRequest(
    val email: String,
    val phone: String,
    val password: String,
    val name: String,
    val role: String = "ambulance_operator",
    val companyName: String? = null,
    val registrationNumber: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val alternatePhone: String? = null,
    val licenseDocumentUrl: String? = null,
    val licenseExpiry: String? = null,
    val vehicleNumber: String? = null,
    val vehicleType: String? = null
)

data class ResendVerificationRequest(
    val email: String
)

data class VerifyEmailOtpRequest(
    val email: String,
    val otp: String
)

data class ForgotPasswordRequest(
    val email: String,
    val role: String? = null
)

data class ResetPasswordRequest(
    val token: String? = null,
    val email: String? = null,
    val otp: String? = null,
    @SerializedName("password") val password: String,
    val role: String? = null
)

data class RefreshTokenRequest(
    val refreshToken: String
)

data class LogoutRequest(
    val refreshToken: String
)

data class PushDeviceRequest(
    val fcmToken: String,
    val deviceType: String = "android",
    val deviceId: String? = null
)

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserDto?,
    val expiresIn: Long? = null
)

data class AuthResponse(
    val success: Boolean,
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserDto?,
    val expiresIn: Long? = null,
    val data: AuthData?,
    val message: String?
) {
    fun resolvedAccessToken(): String? = accessToken ?: data?.accessToken
    fun resolvedRefreshToken(): String? = refreshToken ?: data?.refreshToken
    fun resolvedUser(): UserDto? = user ?: data?.user
    fun resolvedExpiresIn(): Long = expiresIn ?: data?.expiresIn ?: 604800L
}

data class RegistrationResult(
    val user: UserDto?,
    val message: String?,
    val requiresVerification: Boolean? = null
)

data class UserDto(
    val id: String,
    val email: String,
    val phone: String?,
    val role: String,
    val name: String?,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("approval_status") val approvalStatus: String?,
    @SerializedName("approval_notes") val approvalNotes: String? = null,
    @SerializedName("company_name") val companyName: String? = null,
    @SerializedName("registration_number") val registrationNumber: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerializedName("alternate_phone") val alternatePhone: String? = null,
    @SerializedName("provider_email") val providerEmail: String? = null,
    @SerializedName("license_document_url") val licenseDocumentUrl: String? = null,
    @SerializedName("license_expiry") val licenseExpiry: String? = null,
    @SerializedName("created_at") val createdAt: String?
)

data class UpdateProfileRequest(
    val name: String? = null,
    val phone: String? = null,
    val companyName: String? = null,
    val registrationNumber: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val alternatePhone: String? = null,
    val licenseDocumentUrl: String? = null,
    val licenseExpiry: String? = null
)

data class UploadedFileDto(
    val url: String? = null,
    @SerializedName("fileUrl") val fileUrl: String? = null,
    @SerializedName("objectName") val objectName: String? = null,
    @SerializedName("storageUrl") val storageUrl: String? = null,
    @SerializedName("storage_url") val storageUrlSnake: String? = null,
    @SerializedName("resolvedUrl") val resolvedUrlValue: String? = null,
    @SerializedName("resolved_url") val resolvedUrlSnake: String? = null
) {
    fun resolvedUrl(): String? = resolvedUrlValue ?: resolvedUrlSnake ?: url ?: fileUrl
    fun persistentUrl(): String? = storageUrl ?: storageUrlSnake ?: url ?: fileUrl
}

// ==================== Ambulance DTOs ====================

data class DashboardResponse(
    val success: Boolean,
    val stats: DashboardStats?,
    val activeEmergencies: List<EmergencyDto>?,
    val vehicles: List<VehicleDto>?
)

data class DashboardStats(
    val activeEmergencies: Int = 0,
    val availableVehicles: Int = 0,
    val completedToday: Int = 0,
    val avgResponseTime: String = "N/A"
)

data class EmergencyDto(
    val id: String,
    val status: String,
    // Dashboard fields (camelCase from backend mapping)
    val priority: String?,
    val location: String?,
    val hospital: String?,
    val driver: String?,
    val time: String?,
    val patientInfo: String?,
    val contactPhone: String?,
    val requestNumber: String? = null,
    // Detail / raw DB fields (snake_case from Supabase)
    @SerializedName("emergency_type") val emergencyType: String?,
    @SerializedName("pickup_latitude") val latitude: Double?,
    @SerializedName("pickup_longitude") val longitude: Double?,
    @SerializedName("pickup_address") val address: String?,
    // Patient info — dashboard sends both camelCase and snake_case aliases;
    // detail endpoint sends requester_name/requester_phone from raw DB.
    @SerializedName(value = "patient_name", alternate = ["patientName"])
    val patientName: String?,
    @SerializedName(value = "patient_phone", alternate = ["patientPhone"])
    val patientPhone: String?,
    @SerializedName(value = "requester_name")
    val requesterName: String?,
    @SerializedName(value = "requester_phone")
    val requesterPhone: String?,
    @SerializedName("contact_phone") val contactPhoneAlt: String?,
    val notes: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("ambulance_id") val ambulanceId: String?,
    @SerializedName(value = "vehicle_id")
    val vehicleId: String?,
    // Dispatch system fields
    @SerializedName("dispatch_mode") val dispatchMode: String?,
    @SerializedName("broadcast_round") val broadcastRound: Int?,
    @SerializedName("accepted_by") val acceptedBy: String?,
    @SerializedName("assigned_by") val assignedBy: String?
) {
    /** Resolved patient name — prefers explicit patientName, falls back to requester_name */
    val resolvedPatientName: String? get() = patientName ?: requesterName
    /** Resolved patient phone */
    val resolvedPatientPhone: String? get() = patientPhone ?: requesterPhone ?: contactPhone ?: contactPhoneAlt
}

data class VehicleDto(
    val id: String,
    val vehicleNumber: String,
    val driver: String?,
    val driverPhone: String? = null,
    val status: String,
    val type: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val currentLocation: String? = null
)

data class LocationUpdateRequest(
    val latitude: Double,
    val longitude: Double,
    val vehicleId: String? = null
)

data class VehicleStatusUpdateRequest(
    val isActive: Boolean
)

data class StatusUpdateRequest(
    val status: String,
    val vehicleId: String? = null
)

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?
)

data class HistoryResponse(
    val success: Boolean,
    val data: List<EmergencyDto>?
)

data class VehiclesResponse(
    val success: Boolean,
    val vehicles: List<VehicleDto>?
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

data class InviteHospital(
    val name: String,
    val address: String,
    val city: String
)

data class InviteDto(
    val id: String,
    val hospital_id: String,
    val driver_email: String,
    val token: String,
    val status: String,
    val created_at: String,
    val hospital: InviteHospital?
)
