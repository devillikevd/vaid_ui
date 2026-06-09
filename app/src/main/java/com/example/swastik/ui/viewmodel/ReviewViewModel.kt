package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.Review
import com.example.swastik.data.model.ReviewRequest
import com.example.swastik.data.repository.PatientRepository
import com.example.swastik.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReviewUiState(
    val isSubmitting: Boolean = false,
    val submitSuccess: Boolean = false,
    val error: String? = null,
    val reviews: List<Review> = emptyList(),
    val isLoadingReviews: Boolean = false,
    val existingReview: Review? = null,
    val isLoadingExistingReview: Boolean = false
)

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val patientRepository: PatientRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReviewUiState())
    val uiState: StateFlow<ReviewUiState> = _uiState.asStateFlow()

    fun submitReview(
        reviewableType: String,
        reviewableId: String,
        consultationId: String?,
        rating: Int,
        title: String? = null,
        comment: String?,
        isAnonymous: Boolean = false
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, error = null, submitSuccess = false)
            
            val request = ReviewRequest(
                reviewableType = reviewableType,
                reviewableId = reviewableId,
                consultationId = consultationId,
                rating = rating,
                title = title,
                comment = comment,
                isAnonymous = isAnonymous
            )
            
            when (val result = patientRepository.submitReview(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitSuccess = true
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        error = result.message ?: "Failed to submit review"
                    )
                }
                else -> {}
            }
        }
    }

    fun loadReviews(type: String, id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingReviews = true, error = null)
            when (val result = patientRepository.getEntityReviews(type, id, 1, 20)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingReviews = false,
                        reviews = result.data.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingReviews = false,
                        error = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun loadReviewForConsultation(consultationId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingExistingReview = true, existingReview = null)
            when (val result = patientRepository.getReviewForConsultation(consultationId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingExistingReview = false,
                        existingReview = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingExistingReview = false,
                        error = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun resetSubmitState() {
        _uiState.value = _uiState.value.copy(submitSuccess = false, error = null)
    }
}
