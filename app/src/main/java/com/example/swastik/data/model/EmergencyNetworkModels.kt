package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

data class FirstResponderProfile(
    val id: String,
    @SerializedName("user_id") val userId: String,
    val tier: String, // 'DOCTOR', 'NURSE', 'PARAMEDIC', 'CPR_VOLUNTEER', 'SAMARITAN'
    val skills: List<String> = emptyList(),
    @SerializedName("registration_no") val registrationNo: String? = null,
    @SerializedName("council_name") val councilName: String? = null,
    @SerializedName("cert_document_url") val certDocumentUrl: String? = null,
    @SerializedName("is_verified") val isVerified: Boolean = true,
    @SerializedName("is_on_duty") val isOnDuty: Boolean = true,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("total_emergencies_resolved") val totalResolved: Int = 0,
    val rating: Double = 5.0
)

data class RegisterResponderRequest(
    val tier: String,
    val skills: List<String>,
    val registrationNo: String? = null,
    val councilName: String? = null,
    val certDocumentUrl: String? = null,
    val isOnDuty: Boolean = true,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class UpdateDutyRequest(
    val isOnDuty: Boolean
)

data class LocationPingRequest(
    val latitude: Double,
    val longitude: Double
)

data class EmergencyBroadcastRequest(
    val latitude: Double,
    val longitude: Double,
    val incidentType: String = "CRASH_DETECTED",
    val addressText: String = "Near Current Location",
    val radiusMeters: Int = 2000,
    val vitalsSnapshot: Map<String, Any> = emptyMap()
)

data class EmergencyBroadcastDto(
    val id: String,
    @SerializedName("victim_user_id") val victimUserId: String? = null,
    @SerializedName("victim_name") val victimName: String = "Emergency Victim",
    @SerializedName("victim_phone") val victimPhone: String? = null,
    @SerializedName("victim_blood_group") val victimBloodGroup: String? = null,
    @SerializedName("incident_type") val incidentType: String,
    val latitude: Double,
    val longitude: Double,
    @SerializedName("address_text") val addressText: String? = null,
    val status: String = "ACTIVE",
    @SerializedName("triage_level") val triageLevel: String = "RED",
    @SerializedName("distance_meters") val distanceMeters: Double? = null,
    @SerializedName("eta_seconds") val etaSeconds: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class EmergencyBroadcastResponse(
    val broadcast: EmergencyBroadcastDto,
    val notifiedCount: Int = 0,
    val nearbyResponders: List<NearbyResponderPreview> = emptyList()
)

data class NearbyResponderPreview(
    val id: String,
    val name: String,
    val tier: String,
    val distanceMeters: Double,
    val etaSeconds: Int
)

data class DispatchAmbulanceRequest(
    val triageLevel: String = "RED",
    val notes: String = ""
)

data class UpdateAssignmentStatusRequest(
    val status: String,
    val notes: String = ""
)
