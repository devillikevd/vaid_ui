package com.example.swastik.ui.screens.patient.diagnostic

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

data class DiagnosticDetailUiState(
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
class DiagnosticDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DiagnosticDetailUiState())
    val uiState: StateFlow<DiagnosticDetailUiState> = _uiState

    fun loadDiagnosticDetails(centerId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, facility = null)
            try {
                val facility = hospitalRepository.getDiagnosticCenterDetails(centerId)
                if (facility != null) {
                    _uiState.value = _uiState.value.copy(facility = facility, isLoading = false)
                    loadReviews(centerId)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "Diagnostic Center not found.")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Failed to load diagnostic center details.")
            }
        }
    }

    fun loadReviews(centerId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(reviewsLoading = true)
            val reviews = hospitalRepository.getDiagnosticCenterReviews(centerId)
            _uiState.value = _uiState.value.copy(
                reviews = reviews,
                reviewsLoading = false
            )
        }
    }

    fun submitDiagnosticCenterReview(centerId: String, rating: Int, comment: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = true,
                reviewError = null,
                reviewSuccess = false
            )
            val success = hospitalRepository.submitDiagnosticCenterReview(centerId, rating, comment)
            _uiState.value = _uiState.value.copy(
                reviewSubmitting = false,
                reviewSuccess = success,
                reviewError = if (!success) "Failed to submit review." else null
            )
            if (success) {
                loadDiagnosticDetails(centerId)
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
