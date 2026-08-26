package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

// ==================== HIS — Patient-Facing Models ====================

/** Live OPD queue position for the logged-in patient. */
data class QueuePosition(
    val id: String? = null,
    @SerializedName("token_number") val tokenNumber: Int = 0,
    @SerializedName("display_token") val displayToken: String? = null,
    val status: String? = null,
    @SerializedName("queue_date") val queueDate: String? = null,
    val position: Int = 0,
    @SerializedName("estimated_wait_minutes") val estimatedWaitMinutes: Int = 0,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("department_name") val departmentName: String? = null,
    @SerializedName("current_token") val currentToken: Int? = null,
    @SerializedName("hospital_name") val hospitalName: String? = null,
    @SerializedName("hospital_id") val hospitalId: String? = null
)

/** Ward-level bed availability summary (patient-facing). */
data class WardBedAvailability(
    val id: String? = null,
    val name: String = "",
    @SerializedName("ward_type") val wardType: String = "general",
    val floor: String? = null,
    @SerializedName("total_beds") val totalBeds: Int = 0,
    @SerializedName("available_beds") val availableBeds: Int = 0,
    @SerializedName("occupied_beds") val occupiedBeds: Int = 0,
    @SerializedName("charge_per_day") val chargePerDay: Double? = null,
    @SerializedName("occupancy_percent") val occupancyPercent: Int = 0
)

/** Patient admission summary (for "My Admissions" in dashboard). */
data class PatientAdmission(
    val id: String,
    @SerializedName("admission_number") val admissionNumber: String? = null,
    @SerializedName("hospital_name") val hospitalName: String? = null,
    @SerializedName("hospital_id") val hospitalId: String? = null,
    val status: String = "admitted",
    @SerializedName("admission_type") val admissionType: String? = null,
    @SerializedName("chief_complaint") val chiefComplaint: String? = null,
    @SerializedName("provisional_diagnosis") val provisionalDiagnosis: String? = null,
    @SerializedName("final_diagnosis") val finalDiagnosis: String? = null,
    @SerializedName("attending_doctor_name") val attendingDoctorName: String? = null,
    @SerializedName("ward_name") val wardName: String? = null,
    @SerializedName("bed_number") val bedNumber: String? = null,
    @SerializedName("admitted_at") val admittedAt: String? = null,
    @SerializedName("discharged_at") val dischargedAt: String? = null,
    @SerializedName("expected_discharge_date") val expectedDischargeDate: String? = null,
    @SerializedName("discharge_summary") val dischargeSummary: String? = null,
    @SerializedName("follow_up_date") val followUpDate: String? = null,
    @SerializedName("follow_up_instructions") val followUpInstructions: String? = null,
    @SerializedName("total_bill") val totalBill: Double? = null,
    @SerializedName("deposit_amount") val depositAmount: Double? = null,
    @SerializedName("insurance_provider") val insuranceProvider: String? = null,
    @SerializedName("policy_number") val policyNumber: String? = null
)

/** Patient-facing lab/radiology report status. */
data class PatientLabReport(
    val id: String,
    @SerializedName("order_number") val orderNumber: String? = null,
    @SerializedName("test_name") val testName: String = "",
    @SerializedName("test_category") val testCategory: String? = null,
    val modality: String? = null, // null for lab, set for radiology
    val status: String = "ordered",
    val priority: String = "routine",
    @SerializedName("is_abnormal") val isAbnormal: Boolean = false,
    @SerializedName("report_url") val reportUrl: String? = null,
    @SerializedName("hospital_name") val hospitalName: String? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("ordered_at") val orderedAt: String? = null,
    @SerializedName("reported_at") val reportedAt: String? = null
)

/** Insurance pre-auth status (patient-facing). */
data class PatientPreauthStatus(
    val id: String,
    @SerializedName("preauth_number") val preauthNumber: String? = null,
    @SerializedName("insurance_provider") val insuranceProvider: String = "",
    @SerializedName("policy_number") val policyNumber: String = "",
    val status: String = "pending",
    @SerializedName("requested_amount") val requestedAmount: Double? = null,
    @SerializedName("approved_amount") val approvedAmount: Double? = null,
    val diagnosis: String? = null,
    @SerializedName("rejection_reason") val rejectionReason: String? = null,
    @SerializedName("hospital_name") val hospitalName: String? = null,
    @SerializedName("requested_at") val requestedAt: String? = null,
    @SerializedName("responded_at") val respondedAt: String? = null
)

/** Bill estimate from hospital service catalog. */
data class BillEstimate(
    val id: String? = null,
    @SerializedName("service_name") val serviceName: String = "",
    val category: String? = null,
    val rate: Double = 0.0,
    @SerializedName("gst_percent") val gstPercent: Double = 0.0,
    @SerializedName("total_with_gst") val totalWithGst: Double = 0.0,
    @SerializedName("service_type") val serviceType: String? = null
)

// ── Wrapper responses for paginated API calls ──

data class QueuePositionWrapper(
    val queue: QueuePosition? = null,
    @SerializedName("queue_active") val queueActive: Boolean = false
)

data class BedAvailabilityWrapper(
    val wards: List<WardBedAvailability> = emptyList(),
    @SerializedName("total_available") val totalAvailable: Int = 0,
    @SerializedName("total_beds") val totalBeds: Int = 0,
    @SerializedName("occupancy_percent") val occupancyPercent: Int = 0
)

data class PatientAdmissionListWrapper(
    val data: List<PatientAdmission> = emptyList(),
    val pagination: PaginationInfo? = null
)

data class PatientLabReportListWrapper(
    val data: List<PatientLabReport> = emptyList(),
    val pagination: PaginationInfo? = null
)

data class PatientPreauthListWrapper(
    val data: List<PatientPreauthStatus> = emptyList(),
    val pagination: PaginationInfo? = null
)

data class BillEstimateWrapper(
    val services: List<BillEstimate> = emptyList(),
    @SerializedName("estimated_total") val estimatedTotal: Double = 0.0
)

data class PaginationInfo(
    val page: Int = 1,
    @SerializedName("totalPages") val totalPages: Int = 1,
    val total: Int = 0
)
