package com.example.swastik.data.remote.dto

import java.util.Date
import com.google.gson.annotations.SerializedName

data class CatalogRequestItemDto(
    val medicineId: String,
    val quantity: Int
)

data class CreateCatalogRequestDto(
    val items: List<CatalogRequestItemDto>,
    val latitude: Double,
    val longitude: Double,
    val deliveryAddress: String? = null,
    val patientPhone: String? = null
)

data class CatalogRequestItemResponseDto(
    @SerializedName("medicine_id") val medicineId: String?,
    val name: String?,
    @SerializedName("generic_name") val genericName: String?,
    val quantity: Int = 1,
    val mrp: Double?
)

data class CatalogRequestDto(
    val id: String,
    @SerializedName("patient_id") val patientId: String?,
    val items: List<CatalogRequestItemResponseDto>? = emptyList(),
    val status: String,
    @SerializedName("accepted_pharmacy_id") val acceptedPharmacyId: String?,
    @SerializedName("accepted_total_price") val acceptedTotalPrice: Double?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("expires_at") val expiresAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("pharmacies") val pharmacy: PharmacyDto? = null
)

data class PharmacyBasicDto(
    val id: String?,
    val name: String?,
    val address: String?,
    val phone: String?
)
