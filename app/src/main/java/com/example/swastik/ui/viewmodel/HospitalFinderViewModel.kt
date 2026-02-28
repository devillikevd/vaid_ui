package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.HospitalDoctor
import com.example.swastik.data.remote.dto.ClinicDoctorDto
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.data.repository.HospitalRepository
import com.example.swastik.utils.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HospitalFinderUiState(
    val facilities: List<MedicalFacility> = emptyList(),
    val emergencyFacilities: List<MedicalFacility> = emptyList(),
    val isLoading: Boolean = false,
    val isEmergencyLoading: Boolean = false,
    val error: String? = null,
    val locationAvailable: Boolean = false,
    val userLatitude: Double = 0.0,
    val userLongitude: Double = 0.0,
    val pharmacyMedicines: List<Medicine> = emptyList(),
    val isMedicineSearching: Boolean = false,
    val reviewSubmitting: Boolean = false,
    val reviewSuccess: Boolean = false,
    val reviewError: String? = null,
    // Clinic detail
    val clinicDoctors: List<ClinicDoctorDto> = emptyList(),
    val isClinicDoctorsLoading: Boolean = false,
    // Pharmacy inventory
    val pharmacyInventory: List<PharmacyInventoryItemDto> = emptyList(),
    val isPharmacyInventoryLoading: Boolean = false,
)

@HiltViewModel
class HospitalFinderViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository,
    private val locationHelper: LocationHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalFinderUiState())
    val uiState: StateFlow<HospitalFinderUiState> = _uiState.asStateFlow()

    private var currentLatitude: Double = 0.0
    private var currentLongitude: Double = 0.0

    // Cache of all loaded facilities for client-side search filtering
    private var allFacilities: List<MedicalFacility> = emptyList()

    init {
        // Auto-fetch location if permission already granted
        fetchLocationAndLoad()
    }

    /**
     * Called from init and from the UI after permission is granted.
     * Gets GPS coordinates and loads nearby facilities.
     */
    fun fetchLocationAndLoad() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            if (!locationHelper.hasLocationPermission()) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Location permission required. Please allow location access."
                )
                return@launch
            }

            val location = locationHelper.getLastLocation()
            if (location != null) {
                updateLocationAndLoad(location.latitude, location.longitude)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Could not determine your location. Please enable GPS."
                )
            }
        }
    }

    /**
     * Update user's current GPS location and reload facilities.
     * Should be called from the UI layer with real coordinates from FusedLocationProvider.
     */
    fun updateLocationAndLoad(latitude: Double, longitude: Double, radius: Int = 10) {
        currentLatitude = latitude
        currentLongitude = longitude
        _uiState.value = _uiState.value.copy(
            locationAvailable = true,
            userLatitude = latitude,
            userLongitude = longitude
        )
        loadNearbyFacilities(latitude, longitude, radius)
    }

    fun loadNearbyFacilities(
        latitude: Double = currentLatitude,
        longitude: Double = currentLongitude,
        radius: Int = 10
    ) {
        if (latitude == 0.0 && longitude == 0.0) {
            _uiState.value = _uiState.value.copy(
                error = "Location not available. Please enable GPS.",
                isLoading = false
            )
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                // Fire all 4 repository calls in parallel
                val hospitalsDeferred = async {
                    try { hospitalRepository.getNearbyHospitals(latitude, longitude, radius) }
                    catch (_: Exception) { emptyList() }
                }

                val pharmaciesDeferred = async {
                    try { hospitalRepository.getNearbyPharmacies(latitude, longitude, radius) }
                    catch (_: Exception) { emptyList() }
                }

                val clinicsDeferred = async {
                    try { hospitalRepository.getNearbyClinics(latitude, longitude, radius) }
                    catch (_: Exception) { emptyList() }
                }

                val diagnosticDeferred = async {
                    try { hospitalRepository.getNearbyDiagnosticCenters(latitude, longitude, radius) }
                    catch (_: Exception) { emptyList() }
                }

                // Await all in parallel and merge
                val results = awaitAll(hospitalsDeferred, pharmaciesDeferred, clinicsDeferred, diagnosticDeferred)
                val loadedFacilities = results.flatten()

                // Cache for search filtering
                allFacilities = loadedFacilities

                _uiState.value = _uiState.value.copy(
                    facilities = loadedFacilities,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load nearby facilities"
                )
            }
        }
    }

    fun searchFacilities(query: String) {
        if (query.isBlank()) {
            // Restore full list when search is cleared
            _uiState.value = _uiState.value.copy(facilities = allFacilities, isLoading = false)
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val results = mutableListOf<MedicalFacility>()

                // 1) Server-side search for hospitals (returns results beyond nearby radius)
                try {
                    val lat = if (currentLatitude != 0.0) currentLatitude else null
                    val lng = if (currentLongitude != 0.0) currentLongitude else null
                    results.addAll(hospitalRepository.searchHospitals(query, lat, lng))
                } catch (_: Exception) { /* Non-critical */ }

                // 2) Client-side filter for clinics, pharmacies, diagnostic centers
                val lowerQuery = query.lowercase()
                val hospitalIds = results.map { it.id }.toSet()
                val localMatches = allFacilities.filter { facility ->
                    facility.id !in hospitalIds && (
                        facility.name.lowercase().contains(lowerQuery) ||
                        facility.address.lowercase().contains(lowerQuery) ||
                        facility.type.getDisplayName().lowercase().contains(lowerQuery) ||
                        facility.specializations.any { it.lowercase().contains(lowerQuery) }
                    )
                }
                results.addAll(localMatches)

                _uiState.value = _uiState.value.copy(
                    facilities = results,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Search failed"
                )
            }
        }
    }

    /**
     * Search medicines at a specific pharmacy/store.
     * Uses the general medicine search API and filters results.
     */
    fun searchPharmacyMedicines(query: String) {
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(pharmacyMedicines = emptyList(), isMedicineSearching = false)
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isMedicineSearching = true)
            try {
                val medicines = hospitalRepository.searchMedicines(query)
                _uiState.value = _uiState.value.copy(
                    pharmacyMedicines = medicines,
                    isMedicineSearching = false
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isMedicineSearching = false)
            }
        }
    }

    fun clearPharmacyMedicines() {
        _uiState.value = _uiState.value.copy(pharmacyMedicines = emptyList(), isMedicineSearching = false)
    }

    /**
     * Load emergency hospitals from the dedicated server endpoint (50km radius).
     */
    fun loadEmergencyHospitals() {
        if (currentLatitude == 0.0 && currentLongitude == 0.0) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isEmergencyLoading = true)
            try {
                val emergencyList = hospitalRepository.getEmergencyHospitals(currentLatitude, currentLongitude)
                _uiState.value = _uiState.value.copy(
                    emergencyFacilities = emergencyList,
                    isEmergencyLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isEmergencyLoading = false,
                    error = e.message ?: "Failed to load emergency hospitals"
                )
            }
        }
    }

    /**
     * Submit a review for a hospital.
     */
    fun submitHospitalReview(hospitalId: String, rating: Int, comment: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reviewSubmitting = true, reviewError = null, reviewSuccess = false)
            val success = hospitalRepository.submitHospitalReview(hospitalId, rating, comment)
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = false,
                reviewSuccess = success,
                reviewError = if (!success) "Failed to submit review. You may have already reviewed this hospital." else null
            )
        }
    }

    fun clearReviewState() {
        _uiState.value = _uiState.value.copy(reviewSubmitting = false, reviewSuccess = false, reviewError = null)
    }

    // ==================== Clinic Detail ====================

    /**
     * Load doctors affiliated with a clinic for the detail sheet.
     */
    fun loadClinicDoctors(clinicId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isClinicDoctorsLoading = true, clinicDoctors = emptyList())
            try {
                val doctors = hospitalRepository.getClinicDoctors(clinicId)
                _uiState.value = _uiState.value.copy(
                    clinicDoctors = doctors,
                    isClinicDoctorsLoading = false
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isClinicDoctorsLoading = false)
            }
        }
    }

    fun clearClinicDoctors() {
        _uiState.value = _uiState.value.copy(clinicDoctors = emptyList(), isClinicDoctorsLoading = false)
    }

    // ==================== Pharmacy Inventory ====================

    /**
     * Load pharmacy inventory for the detail sheet.
     */
    fun loadPharmacyInventory(pharmacyId: String, search: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPharmacyInventoryLoading = true)
            try {
                val items = hospitalRepository.getPharmacyInventory(pharmacyId, search)
                _uiState.value = _uiState.value.copy(
                    pharmacyInventory = items,
                    isPharmacyInventoryLoading = false
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isPharmacyInventoryLoading = false)
            }
        }
    }

    fun clearPharmacyInventory() {
        _uiState.value = _uiState.value.copy(pharmacyInventory = emptyList(), isPharmacyInventoryLoading = false)
    }
}
