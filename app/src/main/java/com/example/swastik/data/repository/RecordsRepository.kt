package com.example.swastik.data.repository

import android.content.Context
import android.net.Uri
import com.example.swastik.data.model.Prescription
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.ConsultationDto
import com.example.swastik.data.remote.dto.ReportDto
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.example.swastik.utils.ImageCompressor
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

    /**
     * Fetch consultations from the API.
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getConsultations(page: Int = 1): List<ConsultationDto> {
        val response = apiService.getConsultations(page = page)
        if (response.isSuccessful && response.body()?.success == true) {
            return response.body()?.data ?: emptyList()
        }
        val errorMsg = response.errorBody()?.string() ?: "Failed to load consultations"
        throw Exception(errorMsg)
    }

    /**
     * Fetch patient reports from the API.
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getPatientReports(page: Int = 1): List<ReportDto> {
        val response = apiService.getPatientReports(page = page)
        if (response.isSuccessful && response.body()?.success == true) {
            return response.body()?.data ?: emptyList()
        }
        val errorMsg = response.errorBody()?.string() ?: "Failed to load reports"
        throw Exception(errorMsg)
    }

    /**
     * Fetch patient prescriptions from the API.
     * @throws Exception on network/API failure with descriptive message
     */
    suspend fun getPatientPrescriptions(page: Int = 1): List<Prescription> {
        val response = apiService.getPatientPrescriptions(page = page)
        if (response.isSuccessful && response.body()?.success == true) {
            return response.body()?.data ?: emptyList()
        }
        val errorMsg = response.errorBody()?.string() ?: "Failed to load prescriptions"
        throw Exception(errorMsg)
    }

    /**
     * Upload a medical report file from a content URI.
     * Creates a real patient report record after file upload.
     */
    suspend fun uploadReport(uri: Uri, name: String, type: String) {
        val contentResolver = context.contentResolver
        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        val inputStream = contentResolver.openInputStream(uri)
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
        val part = MultipartBody.Part.createFormData("file", fileName, requestBody)
        val plainText = "text/plain".toMediaTypeOrNull()
        val today = java.time.LocalDate.now().toString().toRequestBody(plainText)
        val response = apiService.createPatientReport(
            file = part,
            name = name.toRequestBody(plainText),
            type = type.toRequestBody(plainText),
            date = today
        )
        if (!response.isSuccessful) {
            val errorMsg = response.errorBody()?.string() ?: "Upload failed"
            throw Exception(errorMsg)
        }
    }

    /**
     * Delete a patient report by ID.
     * Uses DELETE /api/reports/:id
     */
    suspend fun deleteReport(reportId: String) {
        val response = apiService.deleteReport(reportId)
        if (!response.isSuccessful) {
            val errorMsg = response.errorBody()?.string() ?: "Failed to delete report"
            throw Exception(errorMsg)
        }
    }
}
