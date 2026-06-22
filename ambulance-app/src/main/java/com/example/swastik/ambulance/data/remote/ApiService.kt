package com.example.swastik.ambulance.data.remote

import com.example.swastik.ambulance.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ==================== Auth ====================

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<RegistrationResult>>

    @POST("auth/resend-verification")
    suspend fun resendVerification(@Body request: ResendVerificationRequest): Response<ApiResponse<Any>>

    @POST("auth/verify-email-otp")
    suspend fun verifyEmailOtp(@Body request: VerifyEmailOtpRequest): Response<AuthResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<ApiResponse<Any>>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<ApiResponse<Any>>

    @POST("auth/refresh-token")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<ApiResponse<Any>>

    @POST("notifications/register-device")
    suspend fun registerDeviceForPush(@Body request: PushDeviceRequest): Response<ApiResponse<Any>>

    @HTTP(method = "DELETE", path = "notifications/unregister-device", hasBody = true)
    suspend fun unregisterDeviceForPush(@Body request: PushDeviceRequest): Response<ApiResponse<Any>>

    // ==================== Ambulance Dashboard ====================

    @GET("ambulances/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    // ==================== Vehicles ====================

    @GET("ambulances/vehicles")
    suspend fun getVehicles(): Response<VehiclesResponse>

    // ==================== Emergency Requests ====================

    @GET("ambulances/history")
    suspend fun getRequestHistory(
        @Query("status") status: String? = null
    ): Response<HistoryResponse>

    @GET("ambulances/request/{requestId}")
    suspend fun getRequestById(
        @Path("requestId") requestId: String
    ): Response<ApiResponse<EmergencyDto>>

    @PUT("ambulances/request/{requestId}/status")
    suspend fun updateRequestStatus(
        @Path("requestId") requestId: String,
        @Body request: StatusUpdateRequest
    ): Response<ApiResponse<Any>>

    /** Accept an SOS broadcast / hospital-assigned emergency */
    @POST("ambulances/{requestId}/accept")
    suspend fun acceptRequest(
        @Path("requestId") requestId: String
    ): Response<ApiResponse<Any>>

    /** Reject an SOS broadcast emergency */
    @POST("ambulances/{requestId}/reject")
    suspend fun rejectRequest(
        @Path("requestId") requestId: String
    ): Response<ApiResponse<Any>>

    // ==================== Location & Maps ====================

    @PUT("ambulances/location")
    suspend fun updateLocation(
        @Body request: LocationUpdateRequest
    ): Response<ApiResponse<Any>>

    @PUT("ambulances/vehicle/status")
    suspend fun updateVehicleStatus(
        @Body request: VehicleStatusUpdateRequest
    ): Response<ApiResponse<Any>>

    @GET("maps/route")
    suspend fun getRoute(
        @Query("originLat") originLat: Double,
        @Query("originLng") originLng: Double,
        @Query("destLat") destLat: Double,
        @Query("destLng") destLng: Double
    ): Response<ApiResponse<RouteDto>>

    // ==================== Profile ====================

    @GET("auth/me")
    suspend fun getProfile(): Response<ApiResponse<UserDto>>

    @PUT("auth/me")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): Response<ApiResponse<Any>>

    @POST("auth/change-password")
    suspend fun changePassword(
        @Body request: ChangePasswordRequest
    ): Response<ApiResponse<Any>>

    @Multipart
    @POST("uploads/license")
    suspend fun uploadLicenseDocument(
        @Part file: MultipartBody.Part,
        @Part("providerType") providerType: RequestBody
    ): Response<ApiResponse<UploadedFileDto>>

    // ==================== Hospital Invites ====================

    @GET("ambulances/invites/pending")
    suspend fun getPendingInvites(): Response<ApiResponse<List<InviteDto>>>

    @POST("ambulances/invites/{token}/accept")
    suspend fun acceptInvite(
        @Path("token") token: String
    ): Response<ApiResponse<Any>>

    @POST("ambulances/invites/{token}/reject")
    suspend fun rejectInvite(
        @Path("token") token: String
    ): Response<ApiResponse<Any>>
}
