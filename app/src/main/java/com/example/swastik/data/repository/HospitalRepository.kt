package com.example.swastik.data.repository

import android.util.Log
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.Hospital
import com.example.swastik.data.model.HospitalDoctor
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.local.db.HospitalDao
import com.example.swastik.data.local.db.CachedHospital
import com.example.swastik.data.remote.dto.ClinicDto
import com.example.swastik.data.remote.dto.ClinicDoctorDto
import com.example.swastik.data.remote.dto.DiagnosticCenterDto
import com.example.swastik.data.remote.dto.PharmacyDto
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.utils.NavigationHelper
import okhttp3.ResponseBody
import org.json.JSONObject
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for hospital/facility discovery and medicine search.
 * Uses Room DB caching for hospitals — network-first with cache fallback.
 */
@Singleton
class HospitalRepository @Inject constructor(
    private val apiService: ApiService,
    private val hospitalDao: HospitalDao
) {

    companion object {
        private const val TAG = "HospitalRepository"
        private const val INVENTORY_PAGE_SIZE = 100
    }

    private fun parseApiErrorMessage(errorBody: ResponseBody?): String? {
        return try {
            val raw = errorBody?.string()?.trim().orEmpty()
            if (raw.isBlank()) return null
            val json = JSONObject(raw)
            json.optString("message").ifBlank { null }
                ?: json.optString("error").ifBlank { null }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Fetch nearby hospitals — network-first, cache on success, fallback to cache on failure.
     */
    suspend fun getNearbyHospitals(
        latitude: Double,
        longitude: Double,
        radius: Int
    ): List<MedicalFacility> {
        // Try network
        try {
            val response = apiService.getNearbyHospitals(latitude, longitude, radius)
            if (response.isSuccessful && response.body()?.success == true) {
                val facilities = response.body()?.data?.map { hospital ->
                    hospital.toMedicalFacility(latitude, longitude)
                } ?: emptyList()
                // Cache hospitals (upsert — don't wipe other results)
                try {
                    val cached = facilities.map { it.toCachedHospital() }
                    hospitalDao.insertHospitals(cached)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to cache hospitals: ${e.message}")
                }
                return facilities
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network error for hospitals, using cache: ${e.message}")
        }

        // Fallback to cache
        return try {
            hospitalDao.getAllHospitalsSync().map { it.toMedicalFacility() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Fetch nearby pharmacies and map to domain MedicalFacility.
     */
    suspend fun getNearbyPharmacies(
        latitude: Double,
        longitude: Double,
        radius: Int = 5
    ): List<MedicalFacility> {
        try {
            val response = apiService.getPharmaciesFromHospitals(latitude, longitude, radius)
            if (response.isSuccessful && response.body()?.success == true) {
                return response.body()?.data?.map { pharmacy ->
                    val distKm = pharmacy.distance?.toDouble() ?: 0.0
                    MedicalFacility(
                        id = pharmacy.id,
                        name = pharmacy.name,
                        type = FacilityType.MEDICAL_STORE,
                        address = pharmacy.address ?: "",
                        distance = if (distKm > 0) String.format(Locale.US, "%.1f km", distKm) else "N/A",
                        distanceKm = distKm,
                        rating = pharmacy.rating ?: 0f,
                        reviewCount = pharmacy.totalReviews ?: 0,
                        latitude = pharmacy.latitude ?: 0.0,
                        longitude = pharmacy.longitude ?: 0.0,
                        phone = pharmacy.phone ?: "",
                        isOpen = pharmacy.isOpen ?: true
                    )
                } ?: emptyList()
            }
            throw Exception(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Failed to load nearby pharmacies")
        } catch (e: Exception) {
            Log.w(TAG, "Network error for pharmacies: ${e.message}")
            throw e
        }
    }

    /**
     * Fetch nearby clinics and map to domain MedicalFacility.
     */
    suspend fun getNearbyClinics(
        latitude: Double,
        longitude: Double,
        radius: Int = 5
    ): List<MedicalFacility> {
        try {
            val response = apiService.getClinicsFromHospitals(latitude, longitude, radius)
            if (response.isSuccessful && response.body()?.success == true) {
                return response.body()?.data?.map { clinic ->
                    val distKm = clinic.distance?.toDouble() ?: 0.0
                    MedicalFacility(
                        id = clinic.id,
                        name = clinic.name,
                        type = FacilityType.CLINIC,
                        address = clinic.address ?: "",
                        distance = if (distKm > 0) String.format(Locale.US, "%.1f km", distKm) else "N/A",
                        distanceKm = distKm,
                        rating = clinic.rating ?: 0f,
                        reviewCount = clinic.totalReviews ?: 0,
                        latitude = clinic.latitude ?: 0.0,
                        longitude = clinic.longitude ?: 0.0,
                        phone = clinic.phone ?: "",
                        isOpen = clinic.is24Hours ?: true,
                        specializations = clinic.specializations ?: emptyList()
                    )
                } ?: emptyList()
            }
            throw Exception(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Failed to load nearby clinics")
        } catch (e: Exception) {
            Log.w(TAG, "Network error for clinics: ${e.message}")
            throw e
        }
    }

    /**
     * Fetch nearby diagnostic centers and map to domain MedicalFacility.
     */
    suspend fun getNearbyDiagnosticCenters(
        latitude: Double,
        longitude: Double,
        radius: Int = 10
    ): List<MedicalFacility> {
        try {
            val response = apiService.getDiagnosticCenters(latitude, longitude, radius)
            if (response.isSuccessful && response.body()?.success == true) {
                return response.body()?.data?.map { center ->
                    val distKm = center.distance?.toDouble() ?: 0.0
                    MedicalFacility(
                        id = center.id,
                        name = center.name,
                        type = FacilityType.DIAGNOSTIC_CENTER,
                        address = center.address ?: "",
                        distance = if (distKm > 0) String.format(Locale.US, "%.1f km", distKm) else "N/A",
                        distanceKm = distKm,
                        rating = center.rating ?: 0f,
                        reviewCount = center.totalReviews ?: 0,
                        latitude = center.latitude ?: 0.0,
                        longitude = center.longitude ?: 0.0,
                        phone = center.phone ?: "",
                        isOpen = center.is24Hours ?: true,
                        isEmergencyAvailable = center.emergencyServices ?: false,
                        specializations = center.specialties ?: emptyList()
                    )
                } ?: emptyList()
            }
            throw Exception(parseApiErrorMessage(response.errorBody()) ?: response.body()?.message ?: "Failed to load nearby diagnostic centers")
        } catch (e: Exception) {
            Log.w(TAG, "Network error for diagnostic centers: ${e.message}")
            throw e
        }
    }

    /**
     * Fetch emergency hospitals from the dedicated server endpoint (50km radius).
     */
    suspend fun getEmergencyHospitals(
        latitude: Double,
        longitude: Double
    ): List<MedicalFacility> {
        try {
            val response = apiService.getEmergencyHospitals(latitude, longitude)
            if (response.isSuccessful && response.body()?.success == true) {
                return response.body()?.data?.map { hospital ->
                    hospital.toMedicalFacility(latitude, longitude).copy(
                        isEmergencyAvailable = true,
                        isOpen = hospital.is24Hours ?: true
                    )
                } ?: emptyList()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch emergency hospitals: ${e.message}")
        }
        // Fallback: filter cached hospitals by emergency flag
        return try {
            hospitalDao.getAllHospitalsSync()
                .filter { it.emergencyServices == true }
                .map { it.toMedicalFacility() }
        } catch (e: Exception) { emptyList() }
    }

    /**
     * Submit a review for a hospital.
     */
    suspend fun submitHospitalReview(
        hospitalId: String,
        rating: Int,
        comment: String?
    ): Boolean {
        return try {
            val request = com.example.swastik.data.remote.dto.ReviewRequest(
                doctorId = null,
                hospitalId = hospitalId,
                rating = rating,
                comment = comment
            )
            val response = apiService.submitHospitalReview(hospitalId, request)
            response.isSuccessful && response.body()?.success == true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to submit hospital review: ${e.message}")
            false
        }
    }

    /**
     * Fetch reviews for a hospital.
     */
    suspend fun getHospitalReviews(
        hospitalId: String,
        page: Int = 1,
        limit: Int = 20
    ): List<com.example.swastik.data.remote.dto.HospitalReviewDto> {
        return try {
            val response = apiService.getHospitalReviews(hospitalId, page, limit)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data ?: emptyList()
            } else emptyList()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch hospital reviews: ${e.message}")
            emptyList()
        }
    }

    /**
     * Fetch full hospital details by ID from the server.
     */
    suspend fun getHospitalDetails(hospitalId: String): MedicalFacility? {
        try {
            val response = apiService.getHospitalDetails(hospitalId)
            if (response.isSuccessful && response.body()?.success == true) {
                val hospital = response.body()?.data ?: return null
                return hospital.toMedicalFacility()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch hospital details: ${e.message}")
        }
        // Fallback to cache
        return try {
            hospitalDao.getHospitalById(hospitalId)?.toMedicalFacility()
        } catch (e: Exception) { null }
    }

    /**
     * Fetch full clinic details by ID and merge the live doctor roster.
     */
    suspend fun getClinicDetails(clinicId: String): MedicalFacility? {
        return try {
            val detailResponse = apiService.getClinicDetails(clinicId)
            if (detailResponse.isSuccessful && detailResponse.body()?.success == true) {
                val clinic = detailResponse.body()?.data ?: return null
                val clinicDoctors = getClinicDoctors(clinicId)
                clinic.toMedicalFacility().copy(
                    doctors = clinicDoctors.map { it.toHospitalDoctor() }
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch clinic details: ${e.message}")
            null
        }
    }

    /**
     * Search hospitals by query — network-first with cache fallback.
     */
    suspend fun searchHospitals(
        query: String,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<MedicalFacility> {
        // Try network
        try {
            val response = apiService.searchHospitals(query, latitude, longitude)
            if (response.isSuccessful && response.body()?.success == true) {
                val facilities = response.body()?.data?.map { hospital ->
                    hospital.toMedicalFacility(latitude, longitude)
                } ?: emptyList()
                // Cache search results
                try {
                    if (facilities.isNotEmpty()) {
                        hospitalDao.insertHospitals(facilities.map { it.toCachedHospital() })
                    }
                } catch (_: Exception) {}
                return facilities
            }
        } catch (e: Exception) {
            Log.w(TAG, "Hospital search network failed, using cache: ${e.message}")
        }

        // Fallback to cache
        return try {
            hospitalDao.getAllHospitalsSync()
                .filter { it.name.contains(query, ignoreCase = true) }
                .map { it.toMedicalFacility() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun searchClinics(
        query: String,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<MedicalFacility> {
        return try {
            val response = apiService.searchClinics(search = query)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { clinic ->
                    clinic.toMedicalFacility(latitude, longitude)
                } ?: emptyList()
            } else {
                throw Exception(parseApiErrorMessage(response.errorBody()) ?: "Failed to search clinics")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Clinic search failed: ${e.message}")
            throw e
        }
    }

    suspend fun searchPharmacies(
        query: String,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<MedicalFacility> {
        return try {
            val response = apiService.searchPharmacies(search = query)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { pharmacy ->
                    pharmacy.toMedicalFacility(latitude, longitude)
                } ?: emptyList()
            } else {
                throw Exception(parseApiErrorMessage(response.errorBody()) ?: "Failed to search pharmacies")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Pharmacy search failed: ${e.message}")
            throw e
        }
    }

    suspend fun searchDiagnosticCenters(
        query: String,
        latitude: Double? = null,
        longitude: Double? = null
    ): List<MedicalFacility> {
        return try {
            val response = apiService.searchDiagnosticCenters(search = query, limit = 50)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { center ->
                    center.toMedicalFacility(latitude, longitude)
                } ?: emptyList()
            } else {
                throw Exception(parseApiErrorMessage(response.errorBody()) ?: "Failed to search diagnostic centers")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Diagnostic center search failed: ${e.message}")
            throw e
        }
    }

    /**
     * Search medicines by query.
     */
    suspend fun searchMedicines(query: String): List<Medicine> {
        val response = apiService.searchMedicines(query)
        if (response.isSuccessful) {
            return response.body()?.data ?: emptyList()
        }
        return emptyList()
    }

    /**
     * Get doctors affiliated with a clinic (public endpoint).
     */
    suspend fun getClinicDoctors(clinicId: String): List<ClinicDoctorDto> {
        return try {
            val response = apiService.getClinicDoctors(clinicId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data ?: emptyList()
            } else emptyList()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch clinic doctors: ${e.message}")
            emptyList()
        }
    }

    /**
     * Get pharmacy inventory items (public endpoint for patient browsing).
     */
    suspend fun getPharmacyInventory(
        pharmacyId: String,
        search: String? = null,
        category: String? = null
    ): List<PharmacyInventoryItemDto> {
        return try {
            val items = mutableListOf<PharmacyInventoryItemDto>()
            var page = 1

            while (true) {
                val response = apiService.getPharmacyInventory(pharmacyId, search, category, page, INVENTORY_PAGE_SIZE)
                if (!response.isSuccessful) {
                    throw Exception(parseApiErrorMessage(response.errorBody()) ?: "Failed to fetch pharmacy inventory")
                }

                val body = response.body()
                val pageItems = body?.allItems.orEmpty()
                items += pageItems

                val totalPages = body?.pagination?.totalPages ?: page
                if (page >= totalPages || pageItems.isEmpty()) break
                page += 1
            }

            items
        } catch (e: Exception) {
            Log.w(TAG, "Failed to fetch pharmacy inventory: ${e.message}")
            throw e
        }
    }

    // ==================== Cache Mapping Extensions ====================

    private fun MedicalFacility.toCachedHospital() = CachedHospital(
        id = id,
        name = name,
        address = address,
        phone = phone,
        imageUrl = null,
        latitude = latitude,
        longitude = longitude,
        emergencyServices = isEmergencyAvailable,
        ambulanceService = false,
        rating = rating,
        reviewCount = reviewCount,
        specializations = if (specializations.isNotEmpty()) specializations.joinToString(",") else null,
        hospitalType = hospitalSubType
    )

    private fun CachedHospital.toMedicalFacility() = MedicalFacility(
        id = id,
        name = name,
        type = FacilityType.HOSPITAL,
        address = address,
        distance = "N/A",
        distanceKm = 0.0,
        rating = rating,
        reviewCount = reviewCount,
        latitude = latitude ?: 0.0,
        longitude = longitude ?: 0.0,
        phone = phone ?: "",
        isEmergencyAvailable = emergencyServices ?: false,
        specializations = specializations?.split(",")?.filter { it.isNotBlank() } ?: emptyList(),
        hospitalSubType = hospitalType
    )

    private fun Hospital.toMedicalFacility(
        userLatitude: Double? = null,
        userLongitude: Double? = null
    ): MedicalFacility {
        val distKm = resolvedDistanceKm(latitude, longitude, distance, userLatitude, userLongitude)
        val departmentNames = departments.orEmpty()
            .filter { it.isActive != false }
            .mapNotNull { it.name?.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

        val resolvedSpecializations = (specializations.orEmpty() + departmentNames)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

        val resolvedDoctors = doctors.orEmpty()
            .filter { it.isActive != false }
            .mapNotNull { assignment ->
                val doctor = assignment.doctor ?: return@mapNotNull null
                HospitalDoctor(
                    id = doctor.id,
                    name = doctor.name,
                    specialization = doctor.specialization?.takeIf { it.isNotBlank() } ?: "General Physician",
                    experience = assignment.department?.takeIf { it.isNotBlank() } ?: "Hospital specialist",
                    rating = 0f,
                    consultationFee = doctor.consultationFee ?: 0
                )
            }
            .distinctBy { it.id }

        return MedicalFacility(
            id = id,
            name = name,
            type = FacilityType.HOSPITAL,
            address = address,
            distance = formatDistanceLabel(distKm),
            distanceKm = distKm,
            rating = rating ?: 0f,
            reviewCount = reviewCount ?: 0,
            latitude = latitude ?: 0.0,
            longitude = longitude ?: 0.0,
            phone = phone ?: "",
            isOpen = is24Hours ?: false,
            isEmergencyAvailable = isEmergencyAvailable ?: false,
            specializations = resolvedSpecializations,
            doctors = resolvedDoctors,
            hospitalSubType = type,
            departments = departmentNames
        )
    }

    private fun ClinicDto.toMedicalFacility(
        userLatitude: Double? = null,
        userLongitude: Double? = null
    ): MedicalFacility {
        val distKm = resolvedDistanceKm(latitude, longitude, distance, userLatitude, userLongitude)
        return MedicalFacility(
            id = id,
            name = name,
            type = FacilityType.CLINIC,
            address = address ?: "",
            distance = formatDistanceLabel(distKm),
            distanceKm = distKm,
            rating = rating ?: 0f,
            reviewCount = totalReviews ?: 0,
            latitude = latitude ?: 0.0,
            longitude = longitude ?: 0.0,
            phone = phone ?: "",
            isOpen = is24Hours ?: true,
            specializations = specializations ?: emptyList()
        )
    }

    private fun ClinicDoctorDto.toHospitalDoctor(): HospitalDoctor {
        return HospitalDoctor(
            id = id,
            name = name,
            specialization = specialization ?: "General Physician",
            experience = experienceYears?.takeIf { it > 0 }?.let { "$it yrs" } ?: "Clinic specialist",
            rating = resolvedRating,
            consultationFee = consultationFee ?: 0
        )
    }

    private fun PharmacyDto.toMedicalFacility(
        userLatitude: Double? = null,
        userLongitude: Double? = null
    ): MedicalFacility {
        val distKm = resolvedDistanceKm(latitude, longitude, distance, userLatitude, userLongitude)
        return MedicalFacility(
            id = id,
            name = name,
            type = FacilityType.MEDICAL_STORE,
            address = address ?: "",
            distance = formatDistanceLabel(distKm),
            distanceKm = distKm,
            rating = rating ?: 0f,
            reviewCount = totalReviews ?: 0,
            latitude = latitude ?: 0.0,
            longitude = longitude ?: 0.0,
            phone = phone ?: "",
            isOpen = isOpen ?: true
        )
    }

    private fun DiagnosticCenterDto.toMedicalFacility(
        userLatitude: Double? = null,
        userLongitude: Double? = null
    ): MedicalFacility {
        val distKm = resolvedDistanceKm(latitude, longitude, distance, userLatitude, userLongitude)
        return MedicalFacility(
            id = id,
            name = name,
            type = FacilityType.DIAGNOSTIC_CENTER,
            address = address ?: "",
            distance = formatDistanceLabel(distKm),
            distanceKm = distKm,
            rating = rating ?: 0f,
            reviewCount = totalReviews ?: 0,
            latitude = latitude ?: 0.0,
            longitude = longitude ?: 0.0,
            phone = phone ?: "",
            isOpen = is24Hours ?: true,
            isEmergencyAvailable = emergencyServices ?: false,
            specializations = specialties ?: emptyList()
        )
    }

    private fun resolvedDistanceKm(
        facilityLatitude: Double?,
        facilityLongitude: Double?,
        apiDistance: Float?,
        userLatitude: Double?,
        userLongitude: Double?
    ): Double {
        if (apiDistance != null && apiDistance > 0f) {
            return apiDistance.toDouble()
        }

        if (
            facilityLatitude == null || facilityLongitude == null ||
            userLatitude == null || userLongitude == null
        ) {
            return 0.0
        }

        if (facilityLatitude == 0.0 || facilityLongitude == 0.0) {
            return 0.0
        }

        return NavigationHelper.calculateDistanceKm(
            userLatitude,
            userLongitude,
            facilityLatitude,
            facilityLongitude
        )
    }

    private fun formatDistanceLabel(distanceKm: Double): String {
        return if (distanceKm > 0.0) {
            NavigationHelper.formatDistance(distanceKm)
        } else {
            "N/A"
        }
    }
}
