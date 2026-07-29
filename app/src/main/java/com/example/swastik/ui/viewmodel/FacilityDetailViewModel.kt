package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.repository.HospitalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.remote.dto.DirectSosRequest
import com.example.swastik.utils.LocationHelper
import android.location.Location
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay

data class HospitalDetailUiState(
    val facility: MedicalFacility? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val reviewSubmitting: Boolean = false,
    val reviewSuccess: Boolean = false,
    val reviewError: String? = null,
    val reviews: List<com.example.swastik.data.model.Review> = emptyList(),
    val reviewsLoading: Boolean = false,
    val sosRequesting: Boolean = false,
    val sosSuccess: Boolean = false,
    val sosError: String? = null,
    val sosCooldownRemaining: Long = 0L, // Cooldown in seconds
    val pharmacyInventory: List<com.example.swastik.data.remote.dto.PharmacyInventoryItemDto> = emptyList(),
    val isPharmacyInventoryLoading: Boolean = false,
    val fitnessBookingSubmitting: Boolean = false,
    val fitnessBookingSuccess: Boolean = false,
    val fitnessBookingError: String? = null
)

@HiltViewModel
class FacilityDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository,
    private val emergencyRepository: EmergencyRepository,
    private val locationHelper: LocationHelper,
    @ApplicationContext private val context: Context,
    private val favoriteFacilitiesStore: com.example.swastik.data.repository.FavoriteFacilitiesStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalDetailUiState())
    val uiState: StateFlow<HospitalDetailUiState> = _uiState.asStateFlow()

    val isFavorite: StateFlow<Boolean> = kotlinx.coroutines.flow.combine(
        _uiState, favoriteFacilitiesStore.favorites
    ) { state, favs ->
        val facilityId = state.facility?.id ?: return@combine false
        favs.any { it.id == facilityId }
    }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.WhileSubscribed(5000), false)

    fun toggleFavorite() {
        uiState.value.facility?.let { facility ->
            favoriteFacilitiesStore.toggleFavorite(facility)
        }
    }

    fun loadHospitalDetails(hospitalId: String) {
        checkCooldown(hospitalId)
        loadFacilityDetails(hospitalId, FacilityType.HOSPITAL)
    }

    fun loadFacilityDetails(facilityId: String, facilityType: FacilityType) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                facility = null,
                isLoading = true,
                error = null,
                reviews = emptyList(),
                reviewsLoading = false,
                reviewSuccess = false,
                reviewError = null
            )
            try {
                val facility = when (facilityType) {
                    FacilityType.CLINIC -> hospitalRepository.getClinicDetails(facilityId)
                    FacilityType.MEDICAL_STORE -> hospitalRepository.getPharmacyDetails(facilityId)
                    FacilityType.DIAGNOSTIC_CENTER -> hospitalRepository.getDiagnosticCenterDetails(facilityId)
                    FacilityType.FITNESS_CENTER -> hospitalRepository.getFitnessCenterDetails(facilityId)
                    else -> hospitalRepository.getHospitalDetails(facilityId)
                }
                if (facility != null) {
                    _uiState.value = _uiState.value.copy(
                        facility = facility,
                        isLoading = false
                    )
                    val typeStr = when (facilityType) {
                        FacilityType.CLINIC -> "clinic"
                        FacilityType.MEDICAL_STORE -> "pharmacy"
                        FacilityType.DIAGNOSTIC_CENTER -> "diagnostic_center"
                        FacilityType.FITNESS_CENTER -> "fitness_center"
                        else -> "hospital"
                    }
                    loadReviews(typeStr, facilityId)
                    if (facilityType == FacilityType.MEDICAL_STORE) {
                        loadPharmacyInventory(facilityId)
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = when (facilityType) {
                            FacilityType.CLINIC -> "Clinic not found"
                            FacilityType.MEDICAL_STORE -> "Pharmacy not found"
                            FacilityType.DIAGNOSTIC_CENTER -> "Diagnostic center not found"
                            FacilityType.FITNESS_CENTER -> "Gym or studio not found"
                            else -> "Hospital not found"
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: when (facilityType) {
                        FacilityType.CLINIC -> "Failed to load clinic details"
                        FacilityType.MEDICAL_STORE -> "Failed to load pharmacy details"
                        FacilityType.DIAGNOSTIC_CENTER -> "Failed to load diagnostic center details"
                        FacilityType.FITNESS_CENTER -> "Failed to load gym or studio details"
                        else -> "Failed to load hospital details"
                    }
                )
            }
        }
    }

    fun loadPharmacyInventory(pharmacyId: String, search: String? = null, category: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPharmacyInventoryLoading = true)
            try {
                val inventory = hospitalRepository.getPharmacyInventory(pharmacyId, search, category)
                _uiState.value = _uiState.value.copy(
                    pharmacyInventory = inventory,
                    isPharmacyInventoryLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isPharmacyInventoryLoading = false
                )
            }
        }
    }


    fun loadReviews(facilityType: String, facilityId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reviewsLoading = true)
            val reviews = hospitalRepository.getFacilityReviews(facilityType, facilityId)
            _uiState.value = _uiState.value.copy(
                reviews = reviews,
                reviewsLoading = false
            )
        }
    }

    fun submitFacilityReview(facilityType: String, facilityId: String, rating: Int, comment: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = true,
                reviewError = null,
                reviewSuccess = false
            )
            val success = hospitalRepository.submitFacilityReview(facilityType, facilityId, rating, comment)
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = false,
                reviewSuccess = success,
                reviewError = if (!success) "Failed to submit review. You may have already reviewed this facility." else null
            )
            // Reload facility to show updated rating + reload reviews list
            if (success) {
                // Determine FacilityType enum from string to re-load
                val enumType = when(facilityType) {
                    "clinic" -> FacilityType.CLINIC
                    "pharmacy" -> FacilityType.MEDICAL_STORE
                    "diagnostic_center" -> FacilityType.DIAGNOSTIC_CENTER
                    "fitness_center" -> FacilityType.FITNESS_CENTER
                    else -> FacilityType.HOSPITAL
                }
                loadFacilityDetails(facilityId, enumType)
            }
        }
    }

    fun bookFitnessCenterVisit(centerId: String, amount: Double? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                fitnessBookingSubmitting = true,
                fitnessBookingSuccess = false,
                fitnessBookingError = null
            )
            val success = hospitalRepository.bookFitnessCenterVisit(centerId = centerId, amount = amount)
            _uiState.value = _uiState.value.copy(
                fitnessBookingSubmitting = false,
                fitnessBookingSuccess = success,
                fitnessBookingError = if (success) null else "Could not book this gym/studio visit right now."
            )
        }
    }

    fun clearFitnessBookingState() {
        _uiState.value = _uiState.value.copy(
            fitnessBookingSubmitting = false,
            fitnessBookingSuccess = false,
            fitnessBookingError = null
        )
    }

    fun clearReviewState() {
        _uiState.value = _uiState.value.copy(
            reviewSubmitting = false,
            reviewSuccess = false,
            reviewError = null
        )
    }

    fun triggerDirectSOS(hospitalId: String, type: String = "medical") {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                sosRequesting = true,
                sosError = null,
                sosSuccess = false
            )
            
            val prefs = context.getSharedPreferences("sos_prefs", Context.MODE_PRIVATE)
            val lastCancel = prefs.getLong("last_cancel_$hospitalId", 0L)
            val now = System.currentTimeMillis()
            if (now - lastCancel < 3 * 60 * 1000) {
                val remaining = (3 * 60 * 1000 - (now - lastCancel)) / 1000
                _uiState.value = _uiState.value.copy(
                    sosRequesting = false,
                    sosError = "You recently cancelled an SOS to this hospital. Please wait 3 minutes before trying again.",
                    sosCooldownRemaining = remaining
                )
                startCooldownTimer(hospitalId)
                return@launch
            }

            val location = locationHelper.getLastLocation()
            if (location == null) {
                _uiState.value = _uiState.value.copy(
                    sosRequesting = false, 
                    sosError = "Location permission or GPS is required for Digital SOS."
                )
                return@launch
            }
            
            val request = DirectSosRequest(
                hospitalId = hospitalId,
                latitude = location.latitude,
                longitude = location.longitude,
                emergencyType = type
            )
            val result = emergencyRepository.requestHospitalEmergency(request)
            if (result is com.example.swastik.data.repository.Result.Success) {
                _uiState.value = _uiState.value.copy(sosRequesting = false, sosSuccess = true)
            } else if (result is com.example.swastik.data.repository.Result.Error) {
                if (result.message?.contains("3 minutes", ignoreCase = true) == true) {
                    // Backend returned 429 spam protection error
                    prefs.edit().putLong("last_cancel_$hospitalId", System.currentTimeMillis()).apply()
                    startCooldownTimer(hospitalId)
                }
                _uiState.value = _uiState.value.copy(sosRequesting = false, sosError = result.message)
            }
        }
    }

    private fun checkCooldown(hospitalId: String) {
        val prefs = context.getSharedPreferences("sos_prefs", Context.MODE_PRIVATE)
        val lastCancel = prefs.getLong("last_cancel_$hospitalId", 0L)
        val now = System.currentTimeMillis()
        if (now - lastCancel < 3 * 60 * 1000) {
            val remaining = (3 * 60 * 1000 - (now - lastCancel)) / 1000
            _uiState.value = _uiState.value.copy(sosCooldownRemaining = remaining)
            startCooldownTimer(hospitalId)
        }
    }

    private fun startCooldownTimer(hospitalId: String) {
        viewModelScope.launch {
            while (_uiState.value.sosCooldownRemaining > 0) {
                delay(1000)
                val prefs = context.getSharedPreferences("sos_prefs", Context.MODE_PRIVATE)
                val lastCancel = prefs.getLong("last_cancel_$hospitalId", 0L)
                val now = System.currentTimeMillis()
                if (now - lastCancel < 3 * 60 * 1000) {
                    val remaining = (3 * 60 * 1000 - (now - lastCancel)) / 1000
                    _uiState.value = _uiState.value.copy(sosCooldownRemaining = remaining)
                } else {
                    _uiState.value = _uiState.value.copy(sosCooldownRemaining = 0)
                    break
                }
            }
        }
    }

    fun clearSosState() {
        _uiState.value = _uiState.value.copy(sosRequesting = false, sosSuccess = false, sosError = null)
    }
}
