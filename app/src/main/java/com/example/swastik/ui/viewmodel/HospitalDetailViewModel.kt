package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.remote.dto.HospitalReviewDto
import com.example.swastik.data.repository.HospitalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HospitalDetailUiState(
    val facility: MedicalFacility? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val reviewSubmitting: Boolean = false,
    val reviewSuccess: Boolean = false,
    val reviewError: String? = null,
    val reviews: List<HospitalReviewDto> = emptyList(),
    val reviewsLoading: Boolean = false
)

@HiltViewModel
class HospitalDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalDetailUiState())
    val uiState: StateFlow<HospitalDetailUiState> = _uiState.asStateFlow()

    fun loadHospitalDetails(hospitalId: String) {
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
                    else -> hospitalRepository.getHospitalDetails(facilityId)
                }
                if (facility != null) {
                    _uiState.value = _uiState.value.copy(
                        facility = facility,
                        isLoading = false
                    )
                    if (facilityType == FacilityType.HOSPITAL) {
                        loadReviews(facilityId)
                    } else {
                        _uiState.value = _uiState.value.copy(
                            reviews = emptyList(),
                            reviewsLoading = false,
                            reviewSuccess = false,
                            reviewError = null
                        )
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = when (facilityType) {
                            FacilityType.CLINIC -> "Clinic not found"
                            else -> "Hospital not found"
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: when (facilityType) {
                        FacilityType.CLINIC -> "Failed to load clinic details"
                        else -> "Failed to load hospital details"
                    }
                )
            }
        }
    }

    fun loadReviews(hospitalId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reviewsLoading = true)
            val reviews = hospitalRepository.getHospitalReviews(hospitalId)
            _uiState.value = _uiState.value.copy(
                reviews = reviews,
                reviewsLoading = false
            )
        }
    }

    fun submitHospitalReview(hospitalId: String, rating: Int, comment: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = true,
                reviewError = null,
                reviewSuccess = false
            )
            val success = hospitalRepository.submitHospitalReview(hospitalId, rating, comment)
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = false,
                reviewSuccess = success,
                reviewError = if (!success) "Failed to submit review. You may have already reviewed this hospital." else null
            )
            // Reload hospital to show updated rating + reload reviews list
            if (success) {
                loadHospitalDetails(hospitalId)
            }
        }
    }

    fun clearReviewState() {
        _uiState.value = _uiState.value.copy(
            reviewSubmitting = false,
            reviewSuccess = false,
            reviewError = null
        )
    }
}
