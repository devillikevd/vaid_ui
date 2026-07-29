package com.example.swastik.data.model

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.FitnessCenter
import com.google.gson.annotations.SerializedName

data class MedicalFacility(
    val id: String,
    val name: String,
    val type: FacilityType,
    val address: String,
    val distance: String,
    val distanceKm: Double = 0.0,
    val rating: Float,
    @SerializedName("review_count") val reviewCount: Int,
    val latitude: Double,
    val longitude: Double,
    val phone: String,
    @SerializedName("open_time") val openTime: String? = null,
    @SerializedName("close_time") val closeTime: String? = null,
    @SerializedName("is_open") val isOpen: Boolean = true,
    @SerializedName("is_emergency_available") val isEmergencyAvailable: Boolean = false,
    val imageUrl: String? = null,
    val is24Hours: Boolean = false,
    val specializations: List<String> = emptyList(),
    val doctors: List<HospitalDoctor> = emptyList(),
    val hospitalSubType: String? = null, // "Government" or "Private"
    @SerializedName("total_beds") val totalBeds: Int? = null,
    @SerializedName("beds_available") val bedsAvailable: Int? = null,
    val facilities: List<String> = emptyList(),
    val departments: List<String> = emptyList(),
    // Pharmacy fields
    @SerializedName("delivery_available") val deliveryAvailable: Boolean = false,
    @SerializedName("min_order_delivery") val minOrderDelivery: Double? = null,
    @SerializedName("delivery_radius_km") val deliveryRadiusKm: Int? = null,
    // Diagnostic Center fields
    @SerializedName("home_collection_available") val homeCollectionAvailable: Boolean = false,
    @SerializedName("home_collection_fee") val homeCollectionFee: Double? = null,
    @SerializedName("test_categories") val testCategories: List<String> = emptyList(),
    val accreditations: List<String> = emptyList(),
    val images: List<String> = emptyList(),
    // Affiliation fields
    @SerializedName("hospital_id") val hospitalId: String? = null,
    @SerializedName("clinic_id") val clinicId: String? = null,
    // Enhanced hospital detail fields
    val description: String? = null,
    @SerializedName("opening_hours") val openingHours: String? = null,
    @SerializedName("website_url") val websiteUrl: String? = null,
    @SerializedName("established_year") val establishedYear: Int? = null,
    @SerializedName("insurance_accepted") val insuranceAccepted: List<String> = emptyList(),
    @SerializedName("er_wait_time_minutes") val erWaitTimeMinutes: Int? = null,
    @SerializedName("virtual_tour_url") val virtualTourUrl: String? = null,
    @SerializedName("floor_guide_map_url") val floorGuideMapUrl: String? = null,
    val reels: List<HospitalReel> = emptyList(),
    val inventory: List<PharmacyMedicine> = emptyList(),
    val tests: List<DiagnosticTest> = emptyList(),
    val associatedPharmacies: List<Pharmacy> = emptyList(),
    val associatedDiagnosticCenters: List<DiagnosticCenter> = emptyList()
)

data class PharmacyMedicine(
    val id: String,
    val name: String,
    @SerializedName("generic_name") val genericName: String? = null,
    val price: Double,
    val quantity: Int,
    @SerializedName("pack_size") val packSize: String? = null,
    @SerializedName("unit_type") val unitType: String? = null
)

data class HospitalReel(
    val id: String,
    @SerializedName("video_url") val videoUrl: String,
    @SerializedName("thumbnail_url") val thumbnailUrl: String? = null,
    val title: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

enum class FacilityType {
    HOSPITAL,
    CLINIC,
    MEDICAL_STORE,
    DIAGNOSTIC_CENTER,
    FITNESS_CENTER,
    NURSING_HOME;

    fun getDisplayName(): String {
        return when (this) {
            HOSPITAL -> "Hospital"
            CLINIC -> "Clinic"
            MEDICAL_STORE -> "Medical Store"
            DIAGNOSTIC_CENTER -> "Diagnostic Center"
            FITNESS_CENTER -> "Gym & Studio"
            NURSING_HOME -> "Nursing Home"
        }
    }

    fun getMarkerIcon(): ImageVector {
        return when (this) {
            HOSPITAL -> Icons.Default.LocalHospital
            CLINIC -> Icons.Default.MedicalServices
            MEDICAL_STORE -> Icons.Default.LocalPharmacy
            DIAGNOSTIC_CENTER -> Icons.Default.Science
            FITNESS_CENTER -> Icons.Default.FitnessCenter
            NURSING_HOME -> Icons.Default.LocalHospital
        }
    }

    fun getMarkerColor(): Color {
        return when (this) {
            HOSPITAL -> Color(0xFFE53935)
            CLINIC -> Color(0xFFD5EDDA)
            MEDICAL_STORE -> Color(0xFFFFFDE7)
            DIAGNOSTIC_CENTER -> Color(0xFFFCE4EC)
            FITNESS_CENTER -> Color(0xFFE0F7FA)
            NURSING_HOME -> Color(0xFFE3F2FD)
        }
    }

    companion object {
        val HOSPITAL_SUB_TYPES = listOf(
            null to "All",
            "Government" to "Government",
            "Private" to "Private",
            "Multi-Specialty" to "Multi-Specialty",
            "General" to "General"
        )
    }
}

data class HospitalDoctor(
    val id: String,
    val name: String,
    val specialization: String,
    val experience: String,
    val rating: Float,
    @SerializedName("consultation_fee") val consultationFee: Int,
    @SerializedName("available_slots") val availableSlots: List<String> = emptyList(),
    @SerializedName("image_emoji") val imageEmoji: String = "👨‍⚕️",
    @SerializedName("profile_image_url") val profileImageUrl: String? = null,
    @SerializedName("intro_video_url") val introVideoUrl: String? = null
)
