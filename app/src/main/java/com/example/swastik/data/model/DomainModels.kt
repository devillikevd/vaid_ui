package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

// ==================== Dashboard & Utility Models ====================

data class PatientStats(
    @SerializedName("total_consultations") val totalConsultations: Int = 0,
    @SerializedName("total_prescriptions") val totalPrescriptions: Int = 0,
    @SerializedName("total_reports") val totalReports: Int = 0
)

data class Reminder(
    val id: String,
    val title: String,
    val time: String,
    val type: ReminderType,
    val days: List<String> = emptyList(),
    val notes: String? = null,
    @SerializedName("snooze_until") val snoozeUntil: String? = null,
    @SerializedName("is_completed") val isCompleted: Boolean
)

enum class ReminderType {
    MEDICINE,
    APPOINTMENT,
    TEST
}

data class ConsultationRecord(
    val id: String,
    @SerializedName("doctor_name") val doctorName: String,
    @SerializedName("doctor_specialty") val doctorSpecialty: String,
    val date: String,
    val diagnosis: String,
    val prescriptions: List<PrescriptionItem>,
    val notes: String,
    @SerializedName("follow_up_date") val followUpDate: String?
)

data class PrescriptionItem(
    @SerializedName("medicine_name") val medicineName: String,
    val dosage: String,
    val frequency: String,
    val duration: String
)

data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val time: String,
    val type: NotificationType,
    @SerializedName("is_read") val isRead: Boolean = false,
    @SerializedName("action_label") val actionLabel: String? = null,
    @SerializedName("action_route") val actionRoute: String? = null
)

enum class NotificationType {
    APPOINTMENT,
    MEDICINE_REMINDER,
    REPORT_READY,
    PRESCRIPTION,
    SYSTEM,
    OFFER
}

data class PatientDashboard(
    val patient: Patient,
    @SerializedName("upcoming_appointments") val upcomingAppointments: List<Appointment>,
    @SerializedName("recent_prescriptions") val recentPrescriptions: List<Prescription> = emptyList(),
    @SerializedName("unread_notifications") val unreadNotifications: Int = 0,
    @SerializedName("active_emergency") val activeEmergency: EmergencyResponse? = null,
    val stats: PatientStats = PatientStats()
)

data class MedicalDocument(
    val id: String,
    val name: String,
    val type: DocumentType,
    val date: String,
    @SerializedName("doctor_name") val doctorName: String?,
    @SerializedName("file_url") val fileUrl: String,
    val size: String? = null
)

enum class DocumentType {
    PRESCRIPTION,
    REPORT,
    INVOICE,
    CERTIFICATE,
    LAB_REPORT,
    SCAN,
    DISCHARGE_SUMMARY,
    VACCINATION
}

// ==================== DOMAIN MODELS ====================

data class Patient(
    val id: String? = null,
    @SerializedName("user_id") val userId: String? = null,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    @SerializedName("date_of_birth") val dateOfBirth: String? = null,
    val gender: String? = null,
    @SerializedName("blood_group") val bloodGroup: String? = null,
    @SerializedName("emergency_contact") val emergencyContact: String? = null,
    val address: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    val allergies: List<String>? = null,
    @SerializedName("chronic_conditions") val chronicConditions: List<String>? = null
)

data class Doctor(
    val id: String,
    val name: String,
    val specialization: String,
    @SerializedName("profile_image_url") val profileImageUrl: String?,
    @SerializedName("experience_years") val experienceYears: Int?,
    val qualification: String?,
    val qualifications: List<String>? = null,
    @SerializedName("consultation_fee") val consultationFee: Int?,
    @SerializedName("video_consultation_fee") val videoConsultationFee: Int?,
    // Backend sends "rating" from doctors table; some endpoints send "average_rating"
    // Using "rating" to match the primary DB column name returned by getAllDoctors / getDoctorById
    @SerializedName("rating") val averageRating: Float?,
    @SerializedName("total_reviews") val totalReviews: Int?,
    @SerializedName("is_available") val isAvailable: Boolean,
    @SerializedName("hospital_values") val hospitalValues: List<String>? = null,
    @SerializedName("recommendation_reason") val recommendationReason: String? = null,
    // Nearby doctor search: distance in km from patient location
    @SerializedName("distance_km") val distanceKm: Float? = null,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    // Hospital info (returned when searching via patients/doctors)
    val hospital: DoctorHospitalInfo? = null,
    val languages: List<String>? = null,
    val bio: String? = null,
    val awards: List<String>? = null,
    @SerializedName("consultation_types") val consultationTypes: List<String>? = null,
    @SerializedName("total_consultations") val totalConsultations: Int? = null,
    @SerializedName("intro_video_url") val introVideoUrl: String? = null
)

/** Lightweight hospital info embedded in doctor search results */
data class DoctorHospitalInfo(
    val id: String? = null,
    val name: String? = null,
    val city: String? = null,
    val address: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class DoctorDetails(
    val doctor: Doctor,
    val schedules: List<DoctorSchedule> = emptyList(),
    val hospitals: List<Hospital>? = null,
    val clinics: List<Clinic>? = null,
    val reviews: List<Review>? = null,
    @SerializedName("reviewDistribution") val reviewDistribution: Map<String, Int>? = null,
    @SerializedName("queueCount") val queueCount: Int? = null
)

data class DoctorSchedule(
    val id: String,
    @SerializedName("day_of_week") val dayOfWeek: Int,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("slot_duration") val slotDuration: Int,
    @SerializedName("is_available") val isAvailable: Boolean
)

data class Hospital(
    val id: String,
    val name: String,
    val address: String,
    val phone: String?,
    @SerializedName("image_url") val imageUrl: String?,
    val latitude: Double?,
    val longitude: Double?,
    val distance: Float?,
    val rating: Float?,
    @SerializedName("total_reviews") val reviewCount: Int?,
    val specializations: List<String>?,
    @SerializedName("is_emergency_available") val isEmergencyAvailable: Boolean?,
    @SerializedName("ambulance_service") val ambulanceService: Boolean?,
    @SerializedName("is_24_hours") val is24Hours: Boolean?,
    val type: String? = null,
    val city: String? = null,
    val departments: List<HospitalDepartment>? = null,
    val doctors: List<HospitalDoctorAssignment>? = null,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    @SerializedName("total_beds") val totalBeds: Int? = null,
    @SerializedName("beds_available") val bedsAvailable: Int? = null,
    val facilities: List<String>? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null,
    val description: String? = null,
    @SerializedName("opening_hours") val openingHours: String? = null,
    val accreditations: List<String>? = null,
    @SerializedName("website_url") val websiteUrl: String? = null,
    @SerializedName("established_year") val establishedYear: Int? = null,
    @SerializedName("insurance_accepted") val insuranceAccepted: List<String>? = null,
    val reels: List<HospitalReel>? = null,
    @SerializedName("er_wait_time_minutes") val erWaitTimeMinutes: Int? = null,
    @SerializedName("virtual_tour_url") val virtualTourUrl: String? = null,
    @SerializedName("floor_guide") val floorGuideMapUrl: com.google.gson.JsonElement? = null,
    @SerializedName("owner_id") val ownerId: String? = null,
    @SerializedName("license_number") val licenseNumber: String? = null,
    @SerializedName("license_document_url") val licenseDocumentUrl: String? = null,
    @SerializedName("is_approved") val isApproved: Boolean? = null,
    @SerializedName("approval_status") val approvalStatus: String? = null,
    @SerializedName("emergency_phone") val emergencyPhone: String? = null,
    @SerializedName("icu_beds") val icuBeds: Int? = null,
    @SerializedName("icu_beds_available") val icuBedsAvailable: Int? = null,
    @SerializedName("emergency_beds") val emergencyBeds: Int? = null,
    @SerializedName("associated_pharmacies") val associatedPharmacies: List<Pharmacy>? = null,
    @SerializedName("associated_diagnostic_centers") val associatedDiagnosticCenters: List<DiagnosticCenter>? = null
)

data class HospitalDepartment(
    val id: String? = null,
    val name: String? = null,
    val description: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

data class HospitalDoctorAssignment(
    val id: String? = null,
    @SerializedName("doctor_id") val doctorId: String? = null,
    val department: String? = null,
    @SerializedName("is_active") val isActive: Boolean? = null,
    val doctor: HospitalDoctorSummary? = null
)

data class HospitalDoctorSummary(
    val id: String,
    val name: String,
    val specialization: String? = null,
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    @SerializedName("consultation_fee") val consultationFee: Int? = null,
    @SerializedName("experience_years") val experienceYears: Int? = null,
    val rating: Float? = null,
    @SerializedName("total_reviews") val totalReviews: Int? = null,
    @SerializedName("intro_video_url") val introVideoUrl: String? = null
)

data class Clinic(
    val id: String,
    val name: String,
    val address: String,
    val phone: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val distance: Float? = null,
    val rating: Float? = null,
    @SerializedName("total_reviews") val reviewCount: Int? = null,
    val specializations: List<String>? = null,
    val facilities: List<String>? = null,
    @SerializedName("is_24_hours") val is24Hours: Boolean? = null,
    @SerializedName("is_emergency_available") val isEmergencyAvailable: Boolean? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null,
    @SerializedName("opening_time") val openTime: String? = null,
    @SerializedName("closing_time") val closeTime: String? = null,
    val city: String? = null,
    val departments: List<HospitalDepartment>? = null,
    val doctors: List<HospitalDoctorAssignment>? = null,
    val description: String? = null,
    @SerializedName("opening_hours") val openingHours: String? = null,
    val accreditations: List<String>? = null,
    @SerializedName("website_url") val websiteUrl: String? = null,
    @SerializedName("established_year") val establishedYear: Int? = null,
    @SerializedName("insurance_accepted") val insuranceAccepted: List<String>? = null,
    val reels: List<HospitalReel>? = null,
    @SerializedName("virtual_tour_url") val virtualTourUrl: String? = null,
    @SerializedName("floor_guide") val floorGuideMapUrl: com.google.gson.JsonElement? = null,
    @SerializedName("owner_id") val ownerId: String? = null,
    @SerializedName("license_number") val licenseNumber: String? = null,
    @SerializedName("license_document_url") val licenseDocumentUrl: String? = null,
    @SerializedName("is_approved") val isApproved: Boolean? = null,
    @SerializedName("approval_status") val approvalStatus: String? = null,
    @SerializedName("associated_pharmacies") val associatedPharmacies: List<Pharmacy>? = null,
    @SerializedName("associated_diagnostic_centers") val associatedDiagnosticCenters: List<DiagnosticCenter>? = null
)

data class Review(
    val id: String,
    val rating: Int,
    val title: String? = null,
    val comment: String?,
    @SerializedName("created_at") val createdAt: String,
    val patient: Patient?
)

data class ReviewRequest(
    val reviewableType: String,
    val reviewableId: String,
    val consultationId: String?,
    val rating: Int,
    val title: String? = null,
    val comment: String?,
    val isAnonymous: Boolean = false
)

data class AppointmentFacility(
    val id: String,
    val name: String,
    val address: String? = null,
    val city: String? = null,
    val type: String? = null
)

data class Appointment(
    val id: String,
    @SerializedName("appointment_number") val appointmentNumber: String?,
    @SerializedName("patient_id") val patientId: String,
    @SerializedName("doctor_id") val doctorId: String,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    @SerializedName("appointment_date") val date: String,
    @SerializedName("time_slot") val timeSlot: String,
    val type: String,
    val status: String,
    val reason: String?,
    val notes: String?,
    @SerializedName("consultation_fee") val consultationFee: Int?,
    @SerializedName("cancellation_reason") val cancellationReason: String?,
    @SerializedName("cancelled_by") val cancelledBy: String? = null,
    @SerializedName("is_reviewed") val isReviewed: Boolean = false,
    val doctor: Doctor?,
    val patient: Patient?,
    val hospital: AppointmentFacility? = null,
    val clinic: AppointmentFacility? = null,
    @SerializedName("completion_otp") val completionOtp: String? = null
)

data class Prescription(
    val id: String,
    val appointmentId: String? = null,
    @SerializedName("prescription_number") val prescriptionNumber: String? = null,
    val diagnosis: String,
    val notes: String?,
    @SerializedName("follow_up_date") val followUpDate: String?,
    @SerializedName("created_at") val createdAt: String,
    val status: String? = null,
    @SerializedName("valid_until") val validUntil: String? = null,
    @SerializedName("is_dispensed") val isDispensed: Boolean? = null,
    val instructions: String? = null,
    val fileUrl: String? = null,
    val pdfUrl: String? = null,
    val doctor: Doctor?,
    val medicines: List<PrescriptionItem>?
)

data class Medicine(
    val id: String,
    @SerializedName("inventory_item_id") val inventoryItemId: String? = null,
    val name: String,
    @SerializedName("generic_name") val genericName: String? = null,
    val manufacturer: String?,
    val price: Float?,
    val mrp: Float? = null,
    @SerializedName("requires_prescription") val requiresPrescription: Boolean,
    val category: MedicineCategory? = MedicineCategory.TABLET,
    @SerializedName("therapeutic_category") val therapeuticCategory: String? = null,
    @SerializedName("dosage_form") val dosageForm: String? = null,
    val description: String? = null,
    @SerializedName("in_stock") val inStock: Boolean = true,
    @SerializedName("stock_count") val stockCount: Int = 0,
    @SerializedName("nearby_pharmacy_id") val nearbyPharmacyId: String? = null,
    @SerializedName("nearby_pharmacy") val nearbyPharmacy: String? = null,
    @SerializedName("pharmacy_distance") val pharmacyDistance: String? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    // Campaign pricing
    @SerializedName("campaign_price") val campaignPrice: Float? = null,
    @SerializedName("campaign_discount_pct") val campaignDiscountPct: Float? = null,
    @SerializedName("campaign_id") val campaignId: String? = null,
    @SerializedName("campaign_name") val campaignName: String? = null
) {
    val safeCategoryName: String get() = category?.name ?: therapeuticCategory ?: dosageForm ?: "TABLET"
    val effectivePrice: Float get() = campaignPrice ?: price ?: 0f
    val hasActiveCampaign: Boolean
        get() = campaignPrice != null && price != null && campaignPrice!! < price!!
    val discountPercentage: Float
        get() = if (hasActiveCampaign) {
            ((price!! - campaignPrice!!) * 100 / price!!)
        } else 0f
}

enum class MedicineCategory {
    @SerializedName("tablet")
    TABLET,
    @SerializedName("capsule")
    CAPSULE,
    @SerializedName("syrup")
    SYRUP,
    @SerializedName("ointment")
    OINTMENT,
    @SerializedName("drops")
    DROPS,
    @SerializedName("powder")
    POWDER,
    @SerializedName("injection")
    INJECTION,
    @SerializedName("other")
    OTHER
}

data class Pharmacy(
    val id: String,
    val name: String,
    val address: String,
    val phone: String?,
    val latitude: Double?,
    val longitude: Double?,
    val distance: Float?,
    @SerializedName("is_open") val isOpen: Boolean?,
    @SerializedName("medicine_available") val medicineAvailable: Boolean?,
    val price: Float?,
    val rating: Float? = null,
    @SerializedName("total_reviews") val reviewCount: Int? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("delivery_available") val deliveryAvailable: Boolean? = null
)

data class TimeSlot(
    val time: String,
    @SerializedName("is_available") val isAvailable: Boolean
)

data class SlotsResponse(
    val date: String,
    val slots: List<TimeSlot>
)

// ReviewRequest and EmergencyRequest live in data.remote.dto.ApiDtos.kt — single source of truth

/**
 * Backend returns:
 * { requestId, ambulance: { id, vehicleNumber, driverName, driverPhone, type, currentLocation: {lat,lng} },
 *   estimatedArrival: "12 min", distance: "3.5 km", status, message }
 * For GET /active it returns raw DB row.
 * This model handles both shapes via nullable fields + helper accessors.
 */
data class EmergencyResponse(
    // -- Fields from POST /emergency (create) response --
    val requestId: String? = null,
    val ambulance: AmbulanceInfo? = null,
    @SerializedName("estimatedArrival") val estimatedArrival: String? = null,
    val distance: String? = null,
    val status: String? = null,
    val message: String? = null,

    // -- Fields from GET /active (raw DB row) --
    val id: String? = null,
    @SerializedName("patient_id") val patientId: String? = null,
    @SerializedName("pickup_latitude") val pickupLatitude: Double? = null,
    @SerializedName("pickup_longitude") val pickupLongitude: Double? = null,
    @SerializedName("pickup_address") val pickupAddress: String? = null,
    @SerializedName("emergency_type") val emergencyType: String? = null,
    @SerializedName("vehicle_id") val vehicleId: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,

    // DB row join: vehicle: { vehicle_number, driver_name, driver_phone, ... }
    val vehicle: AmbulanceVehicle? = null
) {
    /** Unified request ID from either response shape */
    fun resolvedRequestId(): String = requestId ?: id ?: ""

    /** Unified status */
    fun resolvedStatus(): String = status ?: "pending"

    /** Unified driver name from either shape */
    fun resolvedDriverName(): String? = ambulance?.driverName ?: vehicle?.driverName
    fun resolvedDriverPhone(): String? = ambulance?.driverPhone ?: vehicle?.driverPhone
    fun resolvedVehicleNumber(): String? = ambulance?.vehicleNumber ?: vehicle?.vehicleNumber
    fun resolvedLatitude(): Double? = pickupLatitude
    fun resolvedLongitude(): Double? = pickupLongitude
}

data class AmbulanceInfo(
    val id: String?,
    val vehicleNumber: String?,
    val driverName: String?,
    val driverPhone: String?,
    val type: String?,
    val currentLocation: AmbulanceLocation? = null
)

data class AmbulanceLocation(
    val latitude: Double?,
    val longitude: Double?
)

data class AmbulanceVehicle(
    @SerializedName("vehicle_number") val vehicleNumber: String?,
    @SerializedName("driver_name") val driverName: String?,
    @SerializedName("driver_phone") val driverPhone: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("current_latitude") val currentLatitude: Double?,
    @SerializedName("current_longitude") val currentLongitude: Double?
)

val ConsultationRecord.doctorEmoji: String
    get() = "🩺"

// ==================== Medicine Order Models ====================

data class CartItem(
    val medicine: Medicine,
    var quantity: Int = 1
) {
    val totalPrice: Float get() = medicine.effectivePrice * quantity
}

data class MedicineOrder(
    val id: String,
    val pharmacyId: String,
    val items: List<CartItem>,
    val deliveryAddress: String,
    val status: String,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("created_at") val createdAt: String?
)

// ==================== Diagnostic Models ====================

data class DiagnosticTest(
    val id: String,
    val name: String,
    val description: String?,
    val category: String?,
    val price: Float?,
    val preparationInstructions: String?,
    val reportTime: String?
)

data class DiagnosticCenter(
    val id: String,
    val name: String,
    val address: String,
    val phone: String?,
    val latitude: Double?,
    val longitude: Double?,
    val distance: Float?,
    val rating: Float?,
    @SerializedName("total_reviews") val reviewCount: Int? = null,
    @SerializedName("test_categories") val testCategories: List<String>? = null,
    @SerializedName("home_collection_available") val homeCollectionAvailable: Boolean? = null,
    @SerializedName("is_24_hours") val is24Hours: Boolean? = null,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("gallery_urls") val galleryUrls: List<String>? = null
)

data class DiagnosticBooking(
    val id: String,
    val centerId: String?,
    val testId: String?,
    val bookingDate: String?,
    val bookingTime: String?,
    val collectionType: String?,
    val status: String?,
    val resultStatus: String?,
    val test: DiagnosticTest?,
    val center: DiagnosticCenter?
)

// ==================== Vitals Models ====================

data class Vital(
    val id: String,
    val type: String,
    val value: String,
    val unit: String?,
    val notes: String?,
    @SerializedName("recorded_at") val recordedAt: String?
)

enum class VitalType(val displayName: String, val defaultUnit: String) {
    BLOOD_PRESSURE("Blood Pressure", "mmHg"),
    HEART_RATE("Heart Rate", "bpm"),
    TEMPERATURE("Temperature", "°F"),
    BLOOD_SUGAR("Blood Sugar", "mg/dL"),
    OXYGEN_SATURATION("Oxygen Level", "%"),
    WEIGHT("Weight", "kg"),
    HEIGHT("Height", "cm");

    val apiValue: String get() = name.lowercase()
}
