package com.example.swastik.data.repository

import android.content.Context
import android.net.Uri
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.Prescription
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.ConsultationDto
import com.example.swastik.data.remote.dto.ForwardPrescriptionRequest
import com.example.swastik.data.remote.dto.MedicineOrderDto
import com.example.swastik.data.remote.dto.PharmacyDto
import com.example.swastik.data.remote.dto.ReportDto
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.example.swastik.utils.ImageCompressor
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for patient medical records (consultations and reports).
 * Throws on API failures so ViewModel can display meaningful errors.
 */
@Singleton
class RecordsRepository @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) {
    private companion object {
        const val PAGE_SIZE = 50
    }

    private fun parseApiErrorMessage(errorBody: okhttp3.ResponseBody?, defaultMessage: String): String {
        return try {
            val raw = errorBody?.string()?.trim().orEmpty()
            if (raw.isBlank()) return defaultMessage
            val json = org.json.JSONObject(raw)
            json.optString("message").ifBlank { null }
                ?: json.optString("error").ifBlank { null }
                ?: defaultMessage
        } catch (_: Exception) {
            defaultMessage
        }
    }

    /**
     * Fetch a page of consultations from the API.
     * @return Pair of (list of items, total pages)
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getConsultations(page: Int = 1, limit: Int = PAGE_SIZE): Pair<List<ConsultationDto>, Int> {
        val response = apiService.getConsultations(page = page, limit = limit)
        if (response.isSuccessful && response.body()?.success == true) {
            val body = response.body()
            return Pair(body?.data.orEmpty(), body?.pagination?.totalPages ?: 1)
        }
        val errorMsg = parseApiErrorMessage(response.errorBody(), "Failed to load consultations")
        throw Exception(errorMsg)
    }

    /**
     * Fetch a page of patient reports from the API.
     * @return Pair of (list of items, total pages)
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getPatientReports(page: Int = 1, limit: Int = PAGE_SIZE): Pair<List<ReportDto>, Int> {
        val response = apiService.getPatientReports(page = page, limit = limit)
        if (response.isSuccessful && response.body()?.success == true) {
            val body = response.body()
            return Pair(body?.data.orEmpty(), body?.pagination?.totalPages ?: 1)
        }
        val errorMsg = parseApiErrorMessage(response.errorBody(), "Failed to load reports")
        throw Exception(errorMsg)
    }

    /**
     * Fetch a page of patient prescriptions from the API.
     * @return Pair of (list of items, total pages)
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getPatientPrescriptions(page: Int = 1, limit: Int = PAGE_SIZE): Pair<List<Prescription>, Int> {
        val response = apiService.getPatientPrescriptions(page = page, limit = limit)
        if (response.isSuccessful && response.body()?.success == true) {
            val body = response.body()
            return Pair(body?.data.orEmpty(), body?.pagination?.totalPages ?: 1)
        }
        val errorMsg = parseApiErrorMessage(response.errorBody(), "Failed to load prescriptions")
        throw Exception(errorMsg)
    }

    suspend fun getDefaultDeliveryAddress(): String? {
        val response = apiService.getPatientProfile()
        if (response.isSuccessful && response.body()?.success == true) {
            val patient = response.body()?.data ?: return null
            return patient.savedAddresses
                ?.sortedByDescending { it.isDefault }
                ?.firstOrNull { it.address.isNotBlank() }
                ?.address
                ?: patient.location?.takeIf { it.isNotBlank() }
        }
        return null
    }

    suspend fun searchPharmacies(search: String? = null, limit: Int = 20): List<MedicalFacility> {
        val response = apiService.searchPharmacies(
            search = search?.takeIf { it.isNotBlank() },
            limit = limit
        )

        if (response.isSuccessful && response.body()?.success == true) {
            return response.body()?.data.orEmpty().map { it.toMedicalStore() }
        }

        val errorMsg = parseApiErrorMessage(response.errorBody(), "Failed to load pharmacies")
        throw Exception(errorMsg)
    }

    suspend fun forwardPrescriptionToPharmacy(
        prescriptionId: String,
        pharmacyId: String,
        deliveryAddress: String?
    ): MedicineOrderDto {
        val response = apiService.forwardPrescriptionToPharmacy(
            prescriptionId,
            ForwardPrescriptionRequest(
                pharmacyId = pharmacyId,
                deliveryAddress = deliveryAddress?.takeIf { it.isNotBlank() }
            )
        )

        if (response.isSuccessful && response.body()?.success == true) {
            return response.body()?.data
                ?: throw Exception(response.body()?.message ?: "Failed to send prescription")
        }

        val errorMsg = response.body()?.message ?: parseApiErrorMessage(response.errorBody(), "Failed to send prescription")
        throw Exception(errorMsg)
    }

    /**
     * Upload a medical report file from a content URI.
     * Creates a real patient report record after file upload.
     */
    suspend fun uploadReport(
        uri: Uri?,
        name: String,
        type: String,
        externalUrl: String? = null
    ) {
        val normalizedExternalUrl = externalUrl?.trim().orEmpty()
        if (uri == null && normalizedExternalUrl.isBlank()) {
            throw Exception("Select a file or paste a report link")
        }

        val part = uri?.let { selectedUri ->
            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(selectedUri) ?: "application/octet-stream"
            val inputStream = contentResolver.openInputStream(selectedUri)
                ?: throw Exception("Cannot read the selected file")
            val originalBytes = inputStream.use { it.readBytes() }

            // Compress images before upload to save bandwidth (60-80% savings)
            val (bytes, finalMimeType) = if (mimeType.startsWith("image/")) {
                val compressed = ImageCompressor.compress(originalBytes)
                if (compressed != null) Pair(compressed.bytes, compressed.mimeType)
                else Pair(originalBytes, mimeType)
            } else {
                Pair(originalBytes, mimeType)
            }

            val requestBody = bytes.toRequestBody(finalMimeType.toMediaTypeOrNull())
            val fileName = name.replace(" ", "_").lowercase() + when {
                finalMimeType.contains("pdf") -> ".pdf"
                finalMimeType.contains("image") -> ".jpg"
                else -> ""
            }
            MultipartBody.Part.createFormData("file", fileName, requestBody)
        }

        val plainText = "text/plain".toMediaTypeOrNull()
        val today = java.time.LocalDate.now().toString().toRequestBody(plainText)
        val response = apiService.createPatientReport(
            file = part,
            name = name.toRequestBody(plainText),
            type = type.toRequestBody(plainText),
            date = today,
            externalUrl = normalizedExternalUrl
                .takeIf { it.isNotBlank() }
                ?.toRequestBody(plainText)
        )
        if (!response.isSuccessful || response.body()?.success != true) {
            val errorMsg = response.body()?.message ?: parseApiErrorMessage(response.errorBody(), "Upload failed")
            throw Exception(errorMsg)
        }

        val createdReport = response.body()?.data ?: throw Exception("Upload failed")
        if (createdReport.fileUrl.isNullOrBlank()) {
            throw Exception("The report was saved without an accessible file link.")
        }
    }

    /**
     * Delete a patient report by ID.
     * Uses DELETE /api/reports/:id
     */
    suspend fun deleteReport(reportId: String) {
        val response = apiService.deleteReport(reportId)
        if (!response.isSuccessful) {
            val errorMsg = parseApiErrorMessage(response.errorBody(), "Failed to delete report")
            throw Exception(errorMsg)
        }
    }
}

private fun PharmacyDto.toMedicalStore(): MedicalFacility {
    val distanceKm = distance?.toDouble() ?: 0.0
    val distanceLabel = if (distanceKm > 0) {
        String.format(Locale.US, "%.1f km", distanceKm)
    } else {
        "Approved pharmacy"
    }

    return MedicalFacility(
        id = id,
        name = name,
        type = FacilityType.MEDICAL_STORE,
        address = address.orEmpty(),
        distance = distanceLabel,
        distanceKm = distanceKm,
        rating = rating ?: 0f,
        reviewCount = totalReviews ?: 0,
        latitude = latitude ?: 0.0,
        longitude = longitude ?: 0.0,
        phone = phone.orEmpty(),
        isOpen = isOpen ?: true
    )
}
