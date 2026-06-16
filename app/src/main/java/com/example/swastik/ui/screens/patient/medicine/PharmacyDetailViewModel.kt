package com.example.swastik.ui.screens.patient.medicine

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.repository.HospitalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.example.swastik.data.model.Review

data class PharmacyDetailUiState(
    val facility: MedicalFacility? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val reviews: List<Review> = emptyList(),
    val reviewsLoading: Boolean = false,
    val reviewSubmitting: Boolean = false,
    val reviewSuccess: Boolean = false,
    val reviewError: String? = null
)

@HiltViewModel
class PharmacyDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PharmacyDetailUiState())
    val uiState: StateFlow<PharmacyDetailUiState> = _uiState

    fun loadPharmacyDetails(pharmacyId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, facility = null)
            try {
                val facility = hospitalRepository.getPharmacyDetails(pharmacyId)
                if (facility != null) {
                    _uiState.value = _uiState.value.copy(facility = facility, isLoading = false)
                    loadReviews(pharmacyId)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Pharmacy not found.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Failed to load pharmacy details.")
            }
        }
    }

    fun loadReviews(pharmacyId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reviewsLoading = true)
            val reviews = hospitalRepository.getPharmacyReviews(pharmacyId)
            _uiState.value = _uiState.value.copy(
                reviews = reviews,
                reviewsLoading = false
            )
        }
    }

    fun submitPharmacyReview(pharmacyId: String, rating: Int, comment: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = true,
                reviewError = null,
                reviewSuccess = false
            )
            val success = hospitalRepository.submitPharmacyReview(pharmacyId, rating, comment)
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = false,
                reviewSuccess = success,
                reviewError = if (!success) "Failed to submit review." else null
            )
            if (success) {
                loadPharmacyDetails(pharmacyId)
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
