package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.HospitalDoctor
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.ClinicDoctorDto
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.data.repository.HospitalRepository
import com.example.swastik.data.repository.MedicineRepository
import com.example.swastik.utils.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private data class FacilityLoadResult(
    val facilities: List<MedicalFacility> = emptyList(),
    val errorMessage: String? = null
)

data class HospitalFinderUiState(
    val facilities: List<MedicalFacility> = emptyList(),
    val emergencyFacilities: List<MedicalFacility> = emptyList(),
    val isLoading: Boolean = false,
    val isEmergencyLoading: Boolean = false,
    val error: String? = null,
    val locationAvailable: Boolean = false,
    val userLatitude: Double = 0.0,
    val userLongitude: Double = 0.0,
    val activeRadiusKm: Int = DEFAULT_DISCOVERY_RADIUS_KM,
    val pharmacyMedicines: List<Medicine> = emptyList(),
    val isMedicineSearching: Boolean = false,
    val reviewSubmitting: Boolean = false,
    val reviewSuccess: Boolean = false,
    val reviewError: String? = null,
    // Clinic detail
    val clinicDoctors: List<ClinicDoctorDto> = emptyList(),
    val isClinicDoctorsLoading: Boolean = false,
    // Hospital detail
    val selectedHospitalDetails: MedicalFacility? = null,
    val isHospitalDetailsLoading: Boolean = false,
    val hospitalDetailsError: String? = null,
    // Pharmacy inventory
    val pharmacyInventory: List<PharmacyInventoryItemDto> = emptyList(),
    val isPharmacyInventoryLoading: Boolean = false,
    // Bottom Sheet UI State (to survive rotation)
    val selectedFacilityForSheet: MedicalFacility? = null,
    val activeSheetType: String? = null
)

@HiltViewModel
class HospitalFinderViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository,
    private val medicineRepository: MedicineRepository,
    private val locationHelper: LocationHelper,
    private val socketManager: SocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalFinderUiState())
    val uiState: StateFlow<HospitalFinderUiState> = _uiState.asStateFlow()

    private var currentLatitude: Double = 0.0
    private var currentLongitude: Double = 0.0
    private var currentRadius: Int = DEFAULT_DISCOVERY_RADIUS_KM
    private var currentFacilityType: FacilityType? = null
    private var hasObservedSocketConnection = false
    private var fetchJob: kotlinx.coroutines.Job? = null
    private var lastFetchTime = 0L
    private val MIN_FETCH_INTERVAL = 2000L // 2 seconds

    // Cache of all loaded facilities for client-side search filtering
    private var allFacilities: List<MedicalFacility> = emptyList()

    init {
        // UI layer will trigger fetchLocationAndLoad via LaunchedEffect once ready
        observeProviderCatalogUpdates()
        observeSocketReconnects()
    }

    private fun observeProviderCatalogUpdates() {
        // Disabled automatic refresh on catalog updates to prevent "Too many requests" loop.
    }

    private fun observeSocketReconnects() {
        // Removed automatic reload on socket reconnect to prevent "Too many requests" loop
        // during unstable network conditions.
    }

    /**
     * Called from init and from the UI after permission is granted.
     * Gets GPS coordinates and loads nearby facilities.
     */
    fun fetchLocationAndLoad(facilityType: FacilityType? = currentFacilityType) {
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
                updateLocationAndLoad(location.latitude, location.longitude, facilityType = facilityType)
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
    fun updateLocationAndLoad(
        latitude: Double,
        longitude: Double,
        radius: Int = DEFAULT_DISCOVERY_RADIUS_KM,
        facilityType: FacilityType? = currentFacilityType
    ) {
        currentLatitude = latitude
        currentLongitude = longitude
        currentRadius = radius
        currentFacilityType = facilityType
        _uiState.value = _uiState.value.copy(
            locationAvailable = true,
            userLatitude = latitude,
            userLongitude = longitude,
            activeRadiusKm = radius
        )
        loadNearbyFacilities(latitude, longitude, radius, facilityType)
    }

    fun loadNearbyFacilities(
        latitude: Double = currentLatitude,
        longitude: Double = currentLongitude,
        radius: Int = currentRadius,
        facilityType: FacilityType? = currentFacilityType
    ) {
        if (latitude == 0.0 && longitude == 0.0) {
            _uiState.value = _uiState.value.copy(
                error = "Location not available. Please enable GPS.",
                isLoading = false
            )
            return
        }

        val currentTime = System.currentTimeMillis()
        if (currentTime - lastFetchTime < MIN_FETCH_INTERVAL) {
            return
        }
        lastFetchTime = currentTime

        fetchJob?.cancel()
        fetchJob = viewModelScope.launch {
            currentRadius = radius
            currentFacilityType = facilityType
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                activeRadiusKm = radius
            )
            try {
                var activeRadius = radius
                var loadedFacilities = fetchFacilities(latitude, longitude, activeRadius, facilityType)

                // Retry once with a wider radius if nothing found
                if (loadedFacilities.isEmpty() && activeRadius < EXPANDED_DISCOVERY_RADIUS_KM) {
                    activeRadius = EXPANDED_DISCOVERY_RADIUS_KM
                    currentRadius = activeRadius
                    loadedFacilities = fetchFacilities(latitude, longitude, activeRadius, facilityType)
                }

                allFacilities = loadedFacilities

                _uiState.value = _uiState.value.copy(
                    facilities = loadedFacilities,
                    isLoading = false,
                    activeRadiusKm = activeRadius
                )
            } catch (e: Exception) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load nearby facilities"
                    )
                }
            }
        }
    }

    private suspend fun fetchFacilities(
        latitude: Double,
        longitude: Double,
        radius: Int,
        facilityType: FacilityType?
    ): List<MedicalFacility> = coroutineScope {
        val requests = buildList {
            if (facilityType == null || facilityType == FacilityType.HOSPITAL) {
                add(async {
                    runCatching { hospitalRepository.getNearbyHospitals(latitude, longitude, radius) }
                        .fold(
                            onSuccess = { FacilityLoadResult(facilities = it) },
                            onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Failed to load nearby hospitals") }
                        )
                })
            }
            if (facilityType == null || facilityType == FacilityType.MEDICAL_STORE) {
                add(async {
                    runCatching { hospitalRepository.getNearbyPharmacies(latitude, longitude, radius) }
                        .fold(
                            onSuccess = { FacilityLoadResult(facilities = it) },
                            onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Failed to load nearby pharmacies") }
                        )
                })
            }
            if (facilityType == null || facilityType == FacilityType.CLINIC) {
                add(async {
                    runCatching { hospitalRepository.getNearbyClinics(latitude, longitude, radius) }
                        .fold(
                            onSuccess = { FacilityLoadResult(facilities = it) },
                            onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Failed to load nearby clinics") }
                        )
                })
            }
            if (facilityType == null || facilityType == FacilityType.DIAGNOSTIC_CENTER) {
                add(async {
                    runCatching { hospitalRepository.getNearbyDiagnosticCenters(latitude, longitude, radius) }
                        .fold(
                            onSuccess = { FacilityLoadResult(facilities = it) },
                            onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Failed to load nearby diagnostic centers") }
                        )
                })
            }
            if (facilityType == null || facilityType == FacilityType.FITNESS_CENTER) {
                add(async {
                    runCatching { hospitalRepository.getNearbyFitnessCenters(latitude, longitude, radius) }
                        .fold(
                            onSuccess = { FacilityLoadResult(facilities = it) },
                            onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Failed to load nearby gyms and studios") }
                        )
                })
            }
        }

        val results = requests.awaitAll()
        val facilities = results.flatMap { it.facilities }
        if (facilities.isNotEmpty()) {
            facilities
        } else {
            val firstError = results.firstNotNullOfOrNull { it.errorMessage }
            if (firstError != null) throw IllegalStateException(firstError)
            emptyList()
        }
    }

    fun searchFacilities(query: String, facilityType: FacilityType? = null) {
        if (query.isBlank()) {
            // Restore full list when search is cleared
            _uiState.value = _uiState.value.copy(facilities = allFacilities, isLoading = false)
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val lat = if (currentLatitude != 0.0) currentLatitude else null
                val lng = if (currentLongitude != 0.0) currentLongitude else null

                val searches = buildList {
                    if (facilityType == null || facilityType == FacilityType.HOSPITAL) {
                        add(async {
                            runCatching { hospitalRepository.searchHospitals(query, lat, lng) }
                                .fold(
                                    onSuccess = { FacilityLoadResult(facilities = it) },
                                    onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Hospital search failed") }
                                )
                        })
                    }
                    if (facilityType == null || facilityType == FacilityType.CLINIC) {
                        add(async {
                            runCatching { hospitalRepository.searchClinics(query, lat, lng) }
                                .fold(
                                    onSuccess = { FacilityLoadResult(facilities = it) },
                                    onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Clinic search failed") }
                                )
                        })
                    }
                    if (facilityType == null || facilityType == FacilityType.MEDICAL_STORE) {
                        add(async {
                            runCatching { hospitalRepository.searchPharmacies(query, lat, lng) }
                                .fold(
                                    onSuccess = { FacilityLoadResult(facilities = it) },
                                    onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Pharmacy search failed") }
                                )
                        })
                    }
                    if (facilityType == null || facilityType == FacilityType.DIAGNOSTIC_CENTER) {
                        add(async {
                            runCatching { hospitalRepository.searchDiagnosticCenters(query, lat, lng) }
                                .fold(
                                    onSuccess = { FacilityLoadResult(facilities = it) },
                                    onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Diagnostic center search failed") }
                                )
                        })
                    }
                    if (facilityType == null || facilityType == FacilityType.FITNESS_CENTER) {
                        add(async {
                            runCatching { hospitalRepository.searchFitnessCenters(query, lat, lng) }
                                .fold(
                                    onSuccess = { FacilityLoadResult(facilities = it) },
                                    onFailure = { FacilityLoadResult(errorMessage = it.message ?: "Gym/studio search failed") }
                                )
                        })
                    }
                }

                val searchResults = searches.awaitAll()
                val remoteResults = searchResults.flatMap { it.facilities }
                val seen = mutableSetOf<String>()
                val dedupedResults = remoteResults.filter { facility ->
                    seen.add("${facility.type}:${facility.id}")
                }

                if (dedupedResults.isEmpty()) {
                    val firstError = searchResults.firstNotNullOfOrNull { it.errorMessage }
                    if (firstError != null) {
                        throw IllegalStateException(firstError)
                    }
                }

                _uiState.value = _uiState.value.copy(
                    facilities = dedupedResults,
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
            val success = hospitalRepository.submitFacilityReview("hospital", hospitalId, rating, comment)
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

    // ==================== Hospital Detail ====================

    fun loadHospitalDetails(hospitalId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isHospitalDetailsLoading = true,
                hospitalDetailsError = null
            )
            try {
                val facility = hospitalRepository.getHospitalDetails(hospitalId)
                _uiState.value = _uiState.value.copy(
                    selectedHospitalDetails = facility,
                    isHospitalDetailsLoading = false,
                    hospitalDetailsError = if (facility == null) "Hospital details are unavailable right now" else null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isHospitalDetailsLoading = false,
                    hospitalDetailsError = e.message ?: "Failed to load hospital details"
                )
            }
        }
    }

    fun clearSelectedHospitalDetails() {
        _uiState.value = _uiState.value.copy(
            selectedHospitalDetails = null,
            isHospitalDetailsLoading = false,
            hospitalDetailsError = null
        )
    }

    // ==================== UI State Management ====================

    fun openFacilitySheet(facility: MedicalFacility, type: String) {
        _uiState.value = _uiState.value.copy(
            selectedFacilityForSheet = facility,
            activeSheetType = type
        )
    }

    fun closeFacilitySheet() {
        _uiState.value = _uiState.value.copy(
            selectedFacilityForSheet = null,
            activeSheetType = null
        )
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
                var items = hospitalRepository.getPharmacyInventory(pharmacyId, search)
                // Enrich inventory with campaign prices for this pharmacy
                try {
                    items = medicineRepository.enrichInventoryWithCampaignPrices(items, pharmacyId)
                } catch (_: Exception) {
                    // best-effort; keep raw inventory on failure
                }
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

private const val DEFAULT_DISCOVERY_RADIUS_KM = 10
private const val EXPANDED_DISCOVERY_RADIUS_KM = 25
