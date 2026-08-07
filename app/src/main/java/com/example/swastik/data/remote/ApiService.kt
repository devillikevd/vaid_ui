package com.example.swastik.data.remote

import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.EmergencyRequest
import com.example.swastik.data.remote.dto.ReviewRequest
import com.example.swastik.data.remote.dto.*
import com.google.gson.JsonObject
import retrofit2.Response
import retrofit2.http.*
import okhttp3.MultipartBody
import okhttp3.RequestBody

/**
 * Retrofit API Service for VAIDIDEA Healthcare Platform
 */
interface ApiService {

    // ==================== AUTH ====================
    
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>
    
    @POST("auth/resend-verification")
    suspend fun resendVerification(@Body request: ResendVerificationRequest): Response<ApiResponse<Unit>>

    @POST("auth/verify-email-otp")
    suspend fun verifyEmailOtp(@Body request: VerifyEmailOtpRequest): Response<AuthResponse>

    @POST("auth/refresh-token")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<TokenResponse>
    
    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<ApiResponse<Unit>>
    
    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<ApiResponse<Unit>>

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ApiResponse<Unit>>

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<ApiResponse<Unit>>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<ApiResponse<UserDto>>

    // ==================== PATIENT ====================
    
    @GET("patients/dashboard")
    suspend fun getPatientDashboard(): Response<ApiResponse<PatientDashboardResponse>>
    // Medical Records & Vitals
    @GET("patients/records")
    suspend fun getMedicalRecords(): Response<ApiResponse<List<MedicalDocument>>>
    
    @GET("patients/records/vitals")
    suspend fun getVitalsHistory(): Response<ApiResponse<List<Vital>>>

    // Reviews
    @POST("patients/reviews")
    suspend fun submitReview(@Body request: com.example.swastik.data.model.ReviewRequest): Response<ApiResponse<com.example.swastik.data.model.Review>>
    
    @GET("patients/reviews/consultation/{consultationId}")
    suspend fun getReviewForConsultation(
        @Path("consultationId") consultationId: String
    ): Response<ApiResponse<com.example.swastik.data.model.Review>>

    @GET("patients/reviews/{type}/{id}")
    suspend fun getEntityReviews(
        @Path("type") type: String,
        @Path("id") id: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<com.example.swastik.data.model.Review>>
    
    @GET("patients/profile")
    suspend fun getPatientProfile(): Response<ApiResponse<PatientDto>>
    
    @GET("patients/search-suggestions")
    suspend fun getSearchSuggestions(): Response<ApiResponse<List<String>>>
    
    // Feedback
    @Multipart
    @POST("patients/feedback")
    suspend fun submitFeedback(
        @Part("overallRating") rating: RequestBody,
        @Part("category") category: RequestBody,
        @Part("feedbackText") feedbackText: RequestBody,
        @Part("allowContact") allowContact: RequestBody,
        @Part screenshot: MultipartBody.Part?
    ): Response<ApiResponse<Unit>>
    
    @PUT("patients/profile")
    suspend fun updatePatientProfile(@Body profile: UpdateProfileRequest): Response<ApiResponse<PatientDto>>

    @POST("patients/emergency-contacts")
    suspend fun addEmergencyContact(@Body request: AddEmergencyContactRequest): Response<ApiResponse<EmergencyContactDto>>

    @HTTP(method = "DELETE", path = "patients/emergency-contacts/{id}", hasBody = false)
    suspend fun deleteEmergencyContact(@Path("id") contactId: String): Response<ApiResponse<Unit>>

    @POST("patients/family-members")
    suspend fun addFamilyMember(@Body request: AddFamilyMemberRequest): Response<ApiResponse<FamilyMemberDto>>

    @HTTP(method = "DELETE", path = "patients/family-members/{id}", hasBody = false)
    suspend fun deleteFamilyMember(@Path("id") memberId: String): Response<ApiResponse<Unit>>

    @GET("patients/appointments")
    suspend fun getPatientAppointments(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<Appointment>>
    
    @POST("patients/appointments")
    suspend fun bookAppointment(@Body request: CreateAppointmentRequest): Response<ApiResponse<Appointment>>
    
    @PUT("patients/appointments/{id}/cancel")
    suspend fun cancelAppointment(
        @Path("id") id: String,
        @Body request: CancelRequest
    ): Response<ApiResponse<Appointment>>

    @POST("appointments/{id}/reschedule")
    suspend fun rescheduleAppointment(
        @Path("id") id: String,
        @Body request: RescheduleRequest
    ): Response<ApiResponse<Appointment>>

    @GET("appointments/{id}")
    suspend fun getAppointmentDetails(
        @Path("id") id: String
    ): Response<ApiResponse<Appointment>>

    @GET("consultations/{id}/ice-servers")
    suspend fun getConsultationIceServers(
        @Path("id") id: String
    ): Response<ApiResponse<IceServersResponse>>

    @GET("patients/appointments/{id}/record-access")
    suspend fun getMedicalRecordAccess(
        @Path("id") id: String
    ): Response<ApiResponse<MedicalRecordAccessDto>>

    @POST("patients/appointments/{id}/record-access")
    suspend fun grantMedicalRecordAccess(
        @Path("id") id: String,
        @Body request: Map<String, String>
    ): Response<ApiResponse<MedicalRecordAccessDto>>

    @HTTP(method = "DELETE", path = "patients/appointments/{id}/record-access", hasBody = false)
    suspend fun revokeMedicalRecordAccess(
        @Path("id") id: String
    ): Response<ApiResponse<MedicalRecordAccessDto>>
    
    @GET("patients/prescriptions")
    suspend fun getPatientPrescriptions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<Prescription>>
    
    @GET("patients/prescriptions/{id}")
    suspend fun getPrescriptionDetails(@Path("id") id: String): Response<ApiResponse<Prescription>>

    @POST("patients/prescriptions/{id}/forward-to-pharmacy")
    suspend fun forwardPrescriptionToPharmacy(
        @Path("id") id: String,
        @Body request: ForwardPrescriptionRequest
    ): Response<ApiResponse<MedicineOrderDto>>

    @GET("patients/reports")
    suspend fun getPatientReports(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<ReportDto>>

    @POST("doctors/{id}/reviews")
    suspend fun submitDoctorReview(
        @Path("id") doctorId: String,
        @Body request: ReviewRequest
    ): Response<ApiResponse<Any>>

    @Multipart
    @POST("uploads/report")
    suspend fun uploadReport(
        @Part file: MultipartBody.Part,
        @Part("type") type: RequestBody
    ): Response<com.example.swastik.data.remote.dto.ApiResponse<com.example.swastik.data.remote.dto.ReportDto>>

    @Multipart
    @POST("uploads/ai-proof")
    suspend fun uploadAiProof(
        @Part file: MultipartBody.Part
    ): Response<com.example.swastik.data.remote.dto.ApiResponse<com.example.swastik.data.remote.dto.UploadResponse>>

    @GET("uploads/presigned-download")
    suspend fun getPresignedDownloadUrl(
        @Query("fileName") fileName: String
    ): Response<com.example.swastik.data.remote.dto.ApiResponse<com.example.swastik.data.remote.dto.UploadResponse>>

    @Multipart
    @POST("reports")
    suspend fun createPatientReport(
        @Part file: MultipartBody.Part? = null,
        @Part("name") name: RequestBody,
        @Part("type") type: RequestBody,
        @Part("date") date: RequestBody? = null,
        @Part("externalUrl") externalUrl: RequestBody? = null,
        @Part("notes") notes: RequestBody? = null,
        @Part("labName") labName: RequestBody? = null
    ): Response<ApiResponse<ReportDto>>
    
    @DELETE("reports/{id}")
    suspend fun deleteReport(@Path("id") id: String): Response<ApiResponse<Unit>>
    
    // ==================== EMERGENCY ====================
    
    @GET("maps/route")
    suspend fun getRoute(
        @Query("originLat") originLat: Double,
        @Query("originLng") originLng: Double,
        @Query("destLat") destLat: Double,
        @Query("destLng") destLng: Double
    ): Response<ApiResponse<RouteDto>>

    @POST("patients/emergency")
    suspend fun requestEmergency(@Body request: com.example.swastik.data.remote.dto.EmergencyRequest): Response<ApiResponse<EmergencyResponse>>

    @POST("patients/emergency/hospital")
    suspend fun requestHospitalEmergency(@Body request: DirectSosRequest): Response<ApiResponse<EmergencyResponse>>

    @POST("patients/emergency-contact-alert")
    suspend fun notifyEmergencyContacts(
        @Body request: EmergencyContactAlertRequest
    ): Response<ApiResponse<EmergencyContactAlertResponse>>
    
    @GET("patients/emergency/active")
    suspend fun getActiveEmergency(): Response<ApiResponse<EmergencyResponse>>
    
    @PUT("patients/emergency/{id}/cancel")
    suspend fun cancelEmergency(
        @Path("id") id: String,
        @Body request: CancelRequest
    ): Response<ApiResponse<EmergencyResponse>>
    

    // ==================== DOCTORS ====================

    @GET("patients/doctors/recommended")
    suspend fun getRecommendedDoctors(
        @Query("limit") limit: Int = 8
    ): Response<ApiResponse<List<com.example.swastik.data.remote.dto.RecommendedDoctorDto>>>
    
    @GET("patients/doctors")
    suspend fun searchDoctors(
        @Query("specialization") specialization: String? = null,
        @Query("search") search: String? = null,
        @Query("hospitalId") hospitalId: String? = null,
        @Query("clinicId") clinicId: String? = null,
        @Query("city") city: String? = null,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("global") global: Boolean? = null,
        @Query("sortBy") sortBy: String? = null,
        @Query("consultationType") consultationType: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<Doctor>>
    
    @GET("patients/doctors/{id}")
    suspend fun getDoctorDetails(@Path("id") id: String): Response<ApiResponse<DoctorDetails>>

    @GET("doctors/{id}/queue-stats")
    suspend fun getDoctorQueueStats(@Path("id") id: String): Response<DoctorQueueStatsResponse>
    
    @GET("patients/doctors/{id}/slots")
    suspend fun getDoctorSlots(
        @Path("id") id: String,
        @Query("date") date: String
    ): Response<ApiResponse<SlotsResponse>>

    // ==================== HOSPITALS ====================
    
    @GET("hospitals/nearby")
    suspend fun getNearbyHospitals(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 10
    ): Response<ApiResponse<List<Hospital>>>
    
    @GET("hospitals/{id}")
    suspend fun getHospitalDetails(@Path("id") id: String): Response<ApiResponse<Hospital>>

    @GET("hospitals/pharmacies")
    suspend fun getPharmaciesFromHospitals(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 5
    ): Response<ApiResponse<List<PharmacyDto>>>

    @GET("hospitals/clinics")
    suspend fun getClinicsFromHospitals(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 5
    ): Response<ApiResponse<List<ClinicDto>>>

    @GET("clinics/{id}")
    suspend fun getClinicDetails(@Path("id") id: String): Response<ApiResponse<ClinicDto>>

    @GET("hospitals/diagnostic-centers")
    suspend fun getDiagnosticCenters(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 10
    ): Response<ApiResponse<List<DiagnosticCenterDto>>>

    @GET("hospitals/emergency")
    suspend fun getEmergencyHospitals(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<ApiResponse<List<Hospital>>>

    @GET("hospitals/search")
    suspend fun searchHospitals(
        @Query("q") query: String,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null
    ): Response<ApiResponse<List<Hospital>>>

    @GET("clinics/search")
    suspend fun searchClinics(
        @Query("city") city: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<ClinicDto>>

    @GET("pharmacy/search")
    suspend fun searchPharmacies(
        @Query("city") city: String? = null,
        @Query("search") search: String? = null,
        @Query("deliveryAvailable") deliveryAvailable: Boolean? = null,
        @Query("isOpen") isOpen: Boolean? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<PharmacyDto>>

    @GET("pharmacy/{id}")
    suspend fun getPharmacyById(
        @Path("id") id: String
    ): Response<ApiResponse<PharmacyDto>>

    // Get clinic doctors (public — for patient discovery in hospital finder)
    @GET("hospitals/clinics/{clinicId}/doctors")
    suspend fun getClinicDoctors(
        @Path("clinicId") clinicId: String
    ): Response<ApiResponse<List<ClinicDoctorDto>>>

    // Get pharmacy inventory (public — for patient to browse medicines at a specific pharmacy)
    @GET("hospitals/pharmacies/{pharmacyId}/inventory")
    suspend fun getPharmacyInventory(
        @Path("pharmacyId") pharmacyId: String,
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PharmacyInventoryResponse>

    // ==================== AMBULANCE ====================
    
    @GET("ambulances/nearby")
    suspend fun getNearbyAmbulances(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 10
    ): Response<ApiResponse<List<AmbulanceDto>>>
    
    @GET("ambulances/track/{requestId}")
    suspend fun trackAmbulance(@Path("requestId") id: String): Response<ApiResponse<AmbulanceTrack>>

    // ==================== MEDICINES ====================
    
    @GET("medicines/search")
    suspend fun searchMedicines(
        @Query("q") query: String,
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<Medicine>>

    @GET("medicines/categories")
    suspend fun getMedicineCategories(): Response<ApiResponse<List<MedicineCategoryDto>>>

    @GET("medicines/popular")
    suspend fun getPopularMedicines(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<Medicine>>

    @POST("medicines/catalog-requests")
    suspend fun createCatalogRequest(@Body request: com.example.swastik.data.remote.dto.CreateCatalogRequestDto): Response<ApiResponse<com.example.swastik.data.remote.dto.CatalogRequestDto>>

    @GET("medicines/catalog-requests/patient")
    suspend fun getPatientCatalogRequests(): Response<ApiResponse<List<com.example.swastik.data.remote.dto.CatalogRequestDto>>>

    @POST("medicines/catalog-requests/{id}/cancel")
    suspend fun cancelCatalogRequest(@Path("id") requestId: String): Response<ApiResponse<com.example.swastik.data.remote.dto.CatalogRequestDto>>

    @GET("medicines/nearby")
    suspend fun getNearbyMedicines(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 25,
        @Query("limit") limit: Int = 100
    ): Response<ApiResponse<List<NearbyMedicineDto>>>

    @GET("medicines/{id}")
    suspend fun getMedicineDetails(@Path("id") id: String): Response<ApiResponse<Medicine>>

    @GET("medicines/{id}/availability")
    suspend fun getMedicineAvailability(
        @Path("id") id: String,
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<ApiResponse<List<MedicineAvailabilityDto>>>

    @GET("medicines/{id}/alternatives")
    suspend fun getMedicineAlternatives(@Path("id") id: String): Response<PaginatedResponse<Medicine>>

    // ==================== Discount Campaigns ====================

    @POST("discounts/campaigns/best-price")
    suspend fun getBestCampaignPrices(
        @Body request: CampaignPriceRequestDto
    ): Response<ApiResponse<List<CampaignPriceDto>>>
    
    @GET("pharmacy/nearby")
    suspend fun getNearbyPharmacies(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("medicineId") medicineId: String,
        @Query("radius") radius: Int = 10
    ): Response<ApiResponse<List<Pharmacy>>>

    // ==================== MEDICINE ORDERS ====================

    @POST("medicines/orders")
    suspend fun createMedicineOrder(@Body request: MedicineOrderRequest): Response<ApiResponse<MedicineOrderDto>>

    @Multipart
    @POST("medicines/upload-prescription")
    suspend fun uploadPrescription(
        @Part prescription: okhttp3.MultipartBody.Part,
        @Part("orderId") orderId: okhttp3.RequestBody
    ): Response<ApiResponse<UploadResponse>>

    @GET("patients/orders")
    suspend fun getMyOrders(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<MedicineOrderDto>>

    @GET("patients/orders/{id}")
    suspend fun getOrderById(@Path("id") id: String): Response<ApiResponse<MedicineOrderDto>>

    @PATCH("patients/orders/{id}/cancel")
    suspend fun cancelOrder(@Path("id") id: String): Response<ApiResponse<MedicineOrderDto>>

    // ==================== DIAGNOSTIC CENTERS ====================

    @GET("diagnostic-centers/search")
    suspend fun searchDiagnosticCenters(
        @Query("city") city: String? = null,
        @Query("search") search: String? = null,
        @Query("testType") testType: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<DiagnosticCenterDto>>

    @GET("diagnostic-centers/nearby")
    suspend fun getNearbyDiagnosticCenters(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("radius") radius: Int = 10
    ): Response<ApiResponse<List<DiagnosticCenterDto>>>

    @GET("diagnostic-centers/{id}")
    suspend fun getDiagnosticCenterById(
        @Path("id") id: String
    ): Response<ApiResponse<DiagnosticCenterDto>>

    @GET("diagnostic-centers/{id}/tests")
    suspend fun getDiagnosticTests(
        @Path("id") centerId: String,
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<DiagnosticTestDto>>

    @POST("diagnostic-centers/book")
    suspend fun bookDiagnosticTest(@Body request: DiagnosticBookingRequest): Response<ApiResponse<DiagnosticBookingDto>>

    @GET("patients/diagnostic-bookings")
    suspend fun getMyDiagnosticBookings(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<DiagnosticBookingDto>>

    @GET("patients/diagnostic-bookings/{id}")
    suspend fun getDiagnosticBookingById(@Path("id") id: String): Response<ApiResponse<DiagnosticBookingDto>>

    @PATCH("patients/diagnostic-bookings/{id}/cancel")
    suspend fun cancelDiagnosticBooking(@Path("id") id: String): Response<ApiResponse<DiagnosticBookingDto>>

    // ==================== VITALS ====================

    @GET("patients/vitals")
    suspend fun getPatientVitals(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<VitalDto>>

    @POST("patients/vitals")
    suspend fun recordVital(@Body request: CreateVitalRequest): Response<ApiResponse<VitalDto>>

    @POST("patients/vitals/sync")
    suspend fun syncHealthConnectData(@Body request: SyncVitalsRequest): Response<ApiResponse<Unit>>

    @GET("wellness/wearables/summaries")
    suspend fun getWearableSummaries(
        @Query("days") days: Int = 30
    ): Response<ApiResponse<List<WearableDailySummaryDto>>>

    @POST("wellness/wearables/summaries")
    suspend fun syncWearableSummary(
        @Body request: WearableSummaryRequest
    ): Response<ApiResponse<WearableDailySummaryDto>>

    @GET("wellness/plans")
    suspend fun getWellnessWorkoutPlans(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("goal") goal: String? = null,
        @Query("level") level: String? = null
    ): Response<PaginatedResponse<WellnessWorkoutPlanDto>>

    @GET("wellness/exercises")
    suspend fun getExerciseLibrary(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
        @Query("q") query: String? = null,
        @Query("type") type: String? = null,
        @Query("level") level: String? = null,
        @Query("muscle") muscle: String? = null,
        @Query("body_part") bodyPart: String? = null,
        @Query("category") category: String? = null,
        @Query("equipment") equipment: String? = null,
        @Query("target") target: String? = null,
        @Query("hasAnimation") hasAnimation: String? = "true"
    ): Response<PaginatedResponse<ExerciseLibraryDto>>

    @GET("wellness/coaches")
    suspend fun getWellnessCoaches(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("q") query: String? = null,
        @Query("tag") tag: String? = null,
        @Query("city") city: String? = null
    ): Response<PaginatedResponse<WellnessCoachDto>>

    @GET("wellness/facilities")
    suspend fun getFitnessCenters(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("q") query: String? = null,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Int? = null,
        @Query("type") type: String? = null
    ): Response<PaginatedResponse<FitnessCenterDto>>

    @GET("wellness/facilities/{id}")
    suspend fun getFitnessCenterDetails(
        @Path("id") id: String
    ): Response<ApiResponse<FitnessCenterDto>>

    @POST("wellness/facilities/bookings")
    suspend fun bookFitnessCenter(
        @Body request: FitnessBookingRequest
    ): Response<ApiResponse<JsonObject>>

    @GET("wellness/workouts/calendar")
    suspend fun getWellnessWorkoutCalendar(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<ApiResponse<JsonObject>>

    @GET("wellness/workouts/progress")
    suspend fun getWellnessWorkoutProgress(): Response<ApiResponse<JsonObject>>

    @GET("wellness/badges")
    suspend fun getWellnessBadges(): Response<ApiResponse<List<JsonObject>>>

    @GET("wellness/ai/insights")
    suspend fun getWellnessAiInsights(): Response<ApiResponse<List<JsonObject>>>

    @GET("wellness/reports")
    suspend fun getWellnessReports(): Response<ApiResponse<JsonObject>>

    @GET("wellness/groups")
    suspend fun getWellnessGroups(
        @Query("goal") goal: String? = null,
        @Query("city") city: String? = null
    ): Response<ApiResponse<List<WellnessGroupDto>>>

    @GET("wellness/challenges")
    suspend fun getWellnessChallenges(
        @Query("type") type: String? = null
    ): Response<ApiResponse<List<WellnessChallengeDto>>>

    @GET("wellness/supplements")
    suspend fun getTrustedSupplements(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("q") query: String? = null,
        @Query("category") category: String? = null
    ): Response<PaginatedResponse<TrustedSupplementDto>>

    // ==================== WELLNESS ASSESSMENT ====================

    @GET("wellness/assessment")
    suspend fun getWellnessAssessment(): Response<ApiResponse<WellnessAssessmentDto>>

    @POST("wellness/assessment/goals")
    suspend fun submitAssessmentGoals(
        @Body request: CreateAssessmentGoalsRequest
    ): Response<ApiResponse<WellnessAssessmentDto>>

    @POST("wellness/assessment/bio")
    suspend fun submitAssessmentBio(
        @Body request: CreateAssessmentBioRequest
    ): Response<ApiResponse<WellnessAssessmentDto>>

    @POST("wellness/assessment/health-screening")
    suspend fun submitHealthScreening(
        @Body request: CreateHealthScreeningRequest
    ): Response<ApiResponse<WellnessAssessmentDto>>

    // ==================== WELLNESS COACH DETAIL ====================

    @GET("wellness/coaches/{id}")
    suspend fun getWellnessCoachDetail(
        @Path("id") coachId: String
    ): Response<ApiResponse<WellnessCoachDetailDto>>

    // ==================== WELLNESS SESSIONS ====================

    @GET("wellness/sessions")
    suspend fun getWellnessSessions(
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<WellnessSessionDto>>>

    @POST("wellness/sessions")
    suspend fun bookWellnessSession(
        @Body request: BookWellnessSessionRequest
    ): Response<ApiResponse<WellnessSessionDto>>

    // ==================== WORKOUT PLAN DETAIL & ASSIGNMENT ====================

    @GET("wellness/plans/{id}")
    suspend fun getWorkoutPlanDetail(
        @Path("id") planId: String
    ): Response<ApiResponse<WellnessWorkoutPlanDto>>

    @POST("wellness/plans/{id}/assign")
    suspend fun assignWorkoutPlan(
        @Path("id") planId: String,
        @Body request: AssignWorkoutPlanRequest
    ): Response<ApiResponse<PatientWorkoutPlanDto>>

    @POST("wellness/workouts/log")
    suspend fun logWorkout(
        @Body request: LogWorkoutRequest
    ): Response<ApiResponse<JsonObject>>

    // ==================== GYM CLASS SCHEDULE & BOOKING ====================

    @GET("wellness/facilities/{id}/classes")
    suspend fun getGymClassSchedule(
        @Path("id") centerId: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<ApiResponse<List<FitnessClassDto>>>

    @POST("wellness/facilities/{centerId}/classes/{classId}/book")
    suspend fun bookGymClass(
        @Path("centerId") centerId: String,
        @Path("classId") classId: String
    ): Response<ApiResponse<JsonObject>>

    @DELETE("wellness/facilities/{centerId}/classes/{classId}/cancel")
    suspend fun cancelGymClassBooking(
        @Path("centerId") centerId: String,
        @Path("classId") classId: String
    ): Response<ApiResponse<Unit>>

    // ==================== CHALLENGE LEADERBOARD ====================

    @GET("wellness/challenges/{id}/leaderboard")
    suspend fun getChallengeLeaderboard(
        @Path("id") challengeId: String
    ): Response<ApiResponse<ChallengeLeaderboardResponse>>

    @POST("wellness/challenges/{id}/join")
    suspend fun joinChallenge(
        @Path("id") challengeId: String
    ): Response<ApiResponse<JsonObject>>

    @POST("wellness/challenges/{id}/progress")
    suspend fun updateChallengeProgress(
        @Path("id") challengeId: String,
        @Body request: UpdateChallengeProgressRequest
    ): Response<ApiResponse<JsonObject>>

    // ==================== WELLNESS STREAKS & CHAT & REELS ====================

    @GET("wellness/hub")
    suspend fun getWellnessHub(): Response<ApiResponse<WellnessHubDto>>

    @GET("wellness/streaks")
    suspend fun getWellnessStreaks(): Response<ApiResponse<WellnessStreakDto>>

    @GET("wellness/sessions/{id}/messages")
    suspend fun getWellnessSessionMessages(
        @Path("id") sessionId: String
    ): Response<ApiResponse<List<WellnessChatMessageDto>>>

    @GET("wellness/reels")
    suspend fun getWellnessReels(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") category: String? = null
    ): Response<ApiResponse<List<WellnessReelDto>>>

    @POST("wellness/reels/{id}/like")
    suspend fun likeWellnessReel(
        @Path("id") reelId: String
    ): Response<ApiResponse<JsonObject>>

    @POST("wellness/reels/{id}/view")
    suspend fun viewWellnessReel(
        @Path("id") reelId: String
    ): Response<ApiResponse<JsonObject>>

    // ==================== COACH DASHBOARD ====================

    @GET("wellness/coaches/me")
    suspend fun getMyCoachProfile(): Response<ApiResponse<WellnessCoachDto>>

    @GET("wellness/coaches/me/patients")
    suspend fun getCoachPatients(): Response<ApiResponse<List<CoachPatientDto>>>

    @GET("wellness/coaches/me/patients/{id}/analytics")
    suspend fun getCoachPatientAnalytics(
        @Path("id") patientId: String
    ): Response<ApiResponse<JsonObject>>

    @PUT("wellness/coaches/me/availability")
    suspend fun updateCoachAvailability(
        @Body request: UpdateCoachAvailabilityRequest
    ): Response<ApiResponse<JsonObject>>

    // ==================== QR GYM CHECK-IN ====================

    @POST("wellness/facilities/checkins")
    suspend fun qrGymCheckIn(
        @Body request: QrCheckInRequest
    ): Response<ApiResponse<JsonObject>>

    // ==================== REMINDERS ====================


    @GET("patients/reminders")
    suspend fun getReminders(
        @Query("type") type: String? = null,
        @Query("isActive") isActive: Boolean? = null
    ): Response<ApiResponse<List<ReminderDto>>>

    @POST("patients/reminders")
    suspend fun createReminder(@Body request: CreateReminderRequest): Response<ApiResponse<ReminderDto>>

    @POST("patients/reminders/{id}/action")
    suspend fun actOnReminder(
        @Path("id") id: String,
        @Body request: ReminderActionRequest
    ): Response<ApiResponse<ReminderActionResultDto>>

    @PUT("patients/reminders/{id}")
    suspend fun updateReminder(
        @Path("id") id: String,
        @Body request: UpdateReminderRequest
    ): Response<ApiResponse<ReminderDto>>

    @DELETE("patients/reminders/{id}")
    suspend fun deleteReminder(@Path("id") id: String): Response<ApiResponse<Unit>>



    @POST("patients/addresses")
    suspend fun addSavedAddress(@Body request: AddSavedAddressRequest): Response<ApiResponse<SavedAddressDto>>

    @DELETE("patients/addresses/{id}")
    suspend fun deleteSavedAddress(@Path("id") id: String): Response<ApiResponse<Any>>

    // ==================== CHATBOT ====================

    @GET("consultations")
    suspend fun getConsultations(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<ConsultationDto>>

    @POST("consultations/{appointmentId}/join")
    suspend fun joinConsultation(
        @Path("appointmentId") appointmentId: String
    ): Response<ApiResponse<ConsultationDto>>

    @GET("consultations/{id}")
    suspend fun getConsultationDetails(
        @Path("id") id: String
    ): Response<ApiResponse<ConsultationDto>>

    @PUT("consultations/{id}/end")
    suspend fun endConsultation(
        @Path("id") id: String,
        @Body body: EndConsultationRequest
    ): Response<ApiResponse<ConsultationDto>>

    @POST("consultations/{id}/leave")
    suspend fun leaveConsultation(
        @Path("id") id: String
    ): Response<ApiResponse<Any>>
    
    @POST("chatbot/session/start")
    suspend fun startChatSession(): Response<ApiResponse<ChatSession>>
    
    @POST("chatbot/message")
    suspend fun sendChatMessage(@Body request: ChatMessageRequest): Response<ApiResponse<ChatbotMessageResult>>

    @Multipart
    @POST("chatbot/analyze-image")
    suspend fun analyzeImage(
        @Part image: MultipartBody.Part,
        @Part("sessionId") sessionId: RequestBody?,
        @Part("description") description: RequestBody?
    ): Response<ApiResponse<ChatbotMessageResult>>
    
    @POST("chatbot/analyze-symptoms")
    suspend fun analyzeSymptoms(@Body request: SymptomAnalysisRequest): Response<ApiResponse<SymptomAnalysis>>
    
    @GET("chatbot/health-tips")
    suspend fun getHealthTips(@Query("category") category: String?): Response<ApiResponse<List<HealthTip>>>

    @GET("chatbot/session/{sessionId}")
    suspend fun getChatHistory(
        @Path("sessionId") sessionId: String
    ): Response<ApiResponse<List<ChatMessage>>>

    @GET("chatbot/sessions")
    suspend fun getChatSessions(): Response<ApiResponse<List<ChatSession>>>

    @POST("chatbot/session/{sessionId}/end")
    suspend fun endChatSession(
        @Path("sessionId") sessionId: String
    ): Response<ApiResponse<Unit>>

    @GET("chatbot/provider-status")
    suspend fun getAiProviderStatus(): Response<ApiResponse<List<AiProviderStatus>>>

    // ==================== NOTIFICATIONS ====================
    
    @GET("notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<NotificationsListData>>
    
    @PUT("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<ApiResponse<Unit>>
    
    @PUT("notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<ApiResponse<Unit>>

    @DELETE("notifications")
    suspend fun deleteAllNotifications(): Response<ApiResponse<Unit>>

    @GET("notifications/unread-count")
    suspend fun getUnreadNotificationCount(): Response<ApiResponse<UnreadCountDto>>

    @POST("notifications/register-device")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest): Response<ApiResponse<Unit>>

    @HTTP(method = "DELETE", path = "notifications/unregister-device", hasBody = true)
    suspend fun unregisterDevice(@Body request: RegisterDeviceRequest): Response<ApiResponse<Unit>>

    // ==================== HEALTH CARD ====================

    @POST("health-card/generate")
    suspend fun generateHealthCard(@Body request: GenerateHealthCardRequest? = null): Response<ApiResponse<HealthCardTokenResponse>>

    @GET("health-card/status")
    suspend fun getHealthCardStatus(): Response<ApiResponse<HealthCardStatusResponse>>

    @POST("health-card/revoke")
    suspend fun revokeHealthCard(): Response<ApiResponse<Unit>>

    // ==================== UPLOADS ====================
    
    @Multipart
    @POST("patients/profile/image")
    suspend fun uploadProfileImage(
        @Part image: okhttp3.MultipartBody.Part
    ): Response<ApiResponse<UploadResponse>>

    @DELETE("patients/profile/image")
    suspend fun deleteProfileImage(): Response<ApiResponse<Unit>>
    
    @Multipart
    @POST("uploads/report")
    suspend fun uploadMedicalReport(
        @Part file: okhttp3.MultipartBody.Part
    ): Response<ApiResponse<UploadResponse>>

    // ==================== COMMUNITY Q&A ====================

    @GET("community/questions")
    suspend fun getCommunityQuestions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("filter") filter: String? = null,
        @Query("topic") topic: String? = null,
        @Query("search") search: String? = null,
        @Query("sortBy") sortBy: String? = null
    ): Response<CommunityQuestionResponse>

    @GET("community/questions/{id}")
    suspend fun getQuestionDetails(
        @Path("id") id: String
    ): Response<CommunityQuestion>

    @POST("community/questions")
    suspend fun createQuestion(
        @Body request: PostQuestionRequest
    ): Response<CommunityQuestion>

    @POST("community/questions/{id}/answers")
    suspend fun addAnswer(
        @Path("id") id: String,
        @Body request: PostAnswerRequest
    ): Response<CommunityAnswer>

    @PUT("community/answers/{id}")
    suspend fun updateAnswer(
        @Path("id") id: String,
        @Body request: PostAnswerRequest
    ): Response<CommunityAnswer>

    @POST("community/questions/{id}/upvote")
    suspend fun upvoteQuestion(
        @Path("id") questionId: String,
        @Query("action") action: String
    ): Response<ApiResponse<Unit>>

    @POST("community/answers/{id}/upvote")
    suspend fun upvoteAnswer(
        @Path("id") answerId: String,
        @Query("action") action: String
    ): Response<ApiResponse<Unit>>

    @DELETE("community/questions/{id}")
    suspend fun deleteQuestion(
        @Path("id") questionId: String
    ): Response<ApiResponse<Unit>>

    @DELETE("community/answers/{id}")
    suspend fun deleteAnswer(
        @Path("id") answerId: String
    ): Response<ApiResponse<Unit>>

    @POST("community/questions/{id}/bookmark")
    suspend fun toggleBookmark(
        @Path("id") questionId: String
    ): Response<JsonObject>

    @GET("community/trending")
    suspend fun getTrendingTopics(): Response<List<JsonObject>>

    // ==================== DIET & NUTRITION ====================

    @GET("diet/quota")
    suspend fun getDietQuota(): Response<ApiResponse<DietQuotaResponse>>

    @Multipart
    @POST("diet/analyze")
    suspend fun analyzeFood(
        @Part image: MultipartBody.Part
    ): Response<ApiResponse<DietAnalysisResponse>>

    @POST("diet/calculate")
    suspend fun calculateNutrition(
        @Body request: DietCalculateRequest
    ): Response<ApiResponse<DietCalculationResponse>>

    @GET("diet/history")
    suspend fun getDietHistory(
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<List<MealLogDto>>>
}
