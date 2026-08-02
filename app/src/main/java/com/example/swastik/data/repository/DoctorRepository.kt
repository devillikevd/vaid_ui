package com.example.swastik.data.repository

import android.util.Log
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.*
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.local.db.CachedDoctor
import com.example.swastik.data.local.db.DoctorDao
import javax.inject.Inject

/**
 * Doctor Repository Interface - for searching and viewing doctor details
 */
interface DoctorRepository {
    suspend fun searchDoctors(
        specialization: String?,
        search: String?,
        hospitalId: String?,
        clinicId: String?,
        latitude: Double? = null,
        longitude: Double? = null,
        city: String? = null,
        global: Boolean? = null,
        sortBy: String? = null,
        consultationType: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<PaginatedResponse<Doctor>>
    suspend fun getDoctorDetails(id: String): Result<DoctorDetails>
    suspend fun getDoctorQueueStats(id: String): Result<com.example.swastik.data.remote.dto.DoctorQueueStatsDto>
    suspend fun getDoctorSlots(doctorId: String, date: String): Result<SlotsResponse>
    suspend fun getDoctorReviews(doctorId: String, page: Int = 1, limit: Int = 20): Result<List<Review>>
}

/**
 * Doctor Repository Implementation with Room caching.
 * - searchDoctors: returns cached results instantly if available, then refreshes from API
 * - getDoctorDetails: network-first (details change often)
 * - getDoctorSlots: always network (real-time availability)
 */
class DoctorRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val doctorDao: DoctorDao
) : DoctorRepository {

    companion object {
        private const val TAG = "DoctorRepository"
        private const val CACHE_DURATION_MS = 30 * 60 * 1000L // 30 minutes
    }

    override suspend fun searchDoctors(
        specialization: String?,
        search: String?,
        hospitalId: String?,
        clinicId: String?,
        latitude: Double?,
        longitude: Double?,
        city: String?,
        global: Boolean?,
        sortBy: String?,
        consultationType: String?,
        page: Int,
        limit: Int
    ): Result<PaginatedResponse<Doctor>> {
        // Try network first
        try {
            val response = apiService.searchDoctors(
                specialization = specialization,
                search = search,
                hospitalId = hospitalId,
                clinicId = clinicId,
                city = city,
                latitude = latitude,
                longitude = longitude,
                global = global,
                sortBy = sortBy,
                consultationType = consultationType,
                page = page,
                limit = limit
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Cache doctors from the response (page 1 only to avoid stale data)
                if (page == 1) {
                    try {
                        val cached = body.data.map { it.toCachedDoctor() }
                        doctorDao.deleteStaleCache(System.currentTimeMillis() - CACHE_DURATION_MS)
                        doctorDao.insertDoctors(cached)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to cache doctors: ${e.message}")
                    }
                }
                return Result.Success(body)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network error, falling back to cache: ${e.message}")
        }

        // Fallback to cache on network failure
        return try {
            val query = search ?: specialization ?: ""
            val cachedDoctors = if (query.isNotBlank()) {
                doctorDao.searchDoctorsSync(query)
            } else {
                doctorDao.getAllDoctorsSync()
            }
            if (cachedDoctors.isNotEmpty()) {
                val doctors = cachedDoctors.map { it.toDomainDoctor() }
                Result.Success(PaginatedResponse(
                    success = true,
                    data = doctors,
                    pagination = null
                ))
            } else {
                Result.Error("No internet connection and no cached data")
            }
        } catch (e: Exception) {
            Result.Error("Network error and cache unavailable")
        }
    }

    override suspend fun getDoctorDetails(id: String): Result<DoctorDetails> {
        return try {
            val response = apiService.getDoctorDetails(id)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    // Cache the doctor from details
                    try {
                        doctorDao.insertDoctors(listOf(it.doctor.toCachedDoctor()))
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to cache doctor detail: ${e.message}")
                    }
                    Result.Success(it)
                } ?: Result.Error("No data received")
            } else {
                fallbackToCachedDoctorDetails(id) ?: Result.Error(response.message() ?: "Failed to fetch doctor details")
            }
        } catch (e: Exception) {
            fallbackToCachedDoctorDetails(id) ?: Result.Error(e.message ?: "Network error")
        }
    }

    private suspend fun fallbackToCachedDoctorDetails(id: String): Result<DoctorDetails>? {
        return try {
            val cachedDoctor = doctorDao.getDoctorById(id)
            if (cachedDoctor != null) {
                Result.Success(DoctorDetails(
                    doctor = cachedDoctor.toDomainDoctor(),
                    reviews = emptyList() // We don't cache reviews right now
                ))
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getDoctorSlots(doctorId: String, date: String): Result<SlotsResponse> {
        // Slots are always real-time, no caching
        return try {
            val response = apiService.getDoctorSlots(doctorId, date)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("No data received")
            } else {
                Result.Error(response.message() ?: "Failed to fetch slots")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Failed to get doctor details")
        }
    }

    override suspend fun getDoctorQueueStats(id: String): Result<com.example.swastik.data.remote.dto.DoctorQueueStatsDto> {
        return try {
            val response = apiService.getDoctorQueueStats(id)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data)
            } else {
                Result.Error("Failed to fetch queue stats")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    override suspend fun getDoctorReviews(doctorId: String, page: Int, limit: Int): Result<List<Review>> {
        return try {
            val response = apiService.getEntityReviews("doctor", doctorId, page, limit)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!.data)
            } else {
                Result.Error("Failed to fetch doctor reviews")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // ==================== Mapping Extensions ====================

    private fun Doctor.toCachedDoctor() = CachedDoctor(
        id = id,
        name = name,
        specialization = specialization,
        profileImageUrl = profileImageUrl,
        experienceYears = experienceYears,
        qualification = qualification,
        consultationFee = consultationFee,
        videoConsultationFee = videoConsultationFee,
        averageRating = averageRating,
        totalReviews = totalReviews,
        isAvailable = isAvailable
    )

    private fun CachedDoctor.toDomainDoctor() = Doctor(
        id = id,
        name = name,
        specialization = specialization,
        profileImageUrl = profileImageUrl,
        experienceYears = experienceYears,
        qualification = qualification,
        consultationFee = consultationFee,
        videoConsultationFee = videoConsultationFee,
        averageRating = averageRating,
        totalReviews = totalReviews,
        isAvailable = isAvailable
    )
}
