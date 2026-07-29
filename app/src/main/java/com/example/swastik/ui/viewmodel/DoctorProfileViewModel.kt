package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.DoctorDetails
import com.example.swastik.data.repository.DoctorRepository
import com.example.swastik.data.repository.FavoriteDoctorsStore
import com.example.swastik.data.model.Doctor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import javax.inject.Inject

@HiltViewModel
class DoctorProfileViewModel @Inject constructor(
    private val repository: DoctorRepository,
    private val favoriteStore: FavoriteDoctorsStore
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState

    val favoriteDoctors: StateFlow<Set<Doctor>> = favoriteStore.favorites

    fun toggleFavorite(doctor: Doctor) {
        favoriteStore.toggleFavorite(doctor)
    }

    fun fetchDoctorDetails(doctorId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            // Fetch doctor details and reviews in parallel
            val detailsDeferred = async { repository.getDoctorDetails(doctorId) }
            val reviewsDeferred = async { repository.getDoctorReviews(doctorId) }

            val detailsResult = detailsDeferred.await()
            val reviewsResult = reviewsDeferred.await()

            if (detailsResult.isSuccess) {
                val details = detailsResult.getOrNull()
                if (details != null) {
                    val freshReviews = if (reviewsResult.isSuccess) reviewsResult.getOrNull() else details.reviews
                    
                    val updatedDetails = if (freshReviews != null && freshReviews.isNotEmpty()) {
                        val total = freshReviews.size
                        val avg = freshReviews.sumOf { it.rating }.toFloat() / total
                        val dist = freshReviews.groupingBy { it.rating.toString() }.eachCount()
                        
                        // We use max for totalReviews in case backend fetched a paginated subset, 
                        // but if we are calculating avg from them, we just use the fresh data for both.
                        details.copy(
                            reviews = freshReviews,
                            reviewDistribution = dist,
                            doctor = details.doctor.copy(
                                totalReviews = Math.max(details.doctor.totalReviews ?: 0, total),
                                averageRating = avg
                            )
                        )
                    } else {
                        details.copy(reviews = freshReviews)
                    }
                    
                    _uiState.value = UiState.Success(updatedDetails, null)
                    startQueueStatsPolling(doctorId)
                } else {
                    _uiState.value = UiState.Error("Failed to load doctor details")
                }
            } else {
                val errorMsg = (detailsResult as? com.example.swastik.data.repository.Result.Error)?.message
                    ?: "Failed to load doctor details"
                _uiState.value = UiState.Error(errorMsg)
            }
        }
    }

    private fun startQueueStatsPolling(doctorId: String) {
        viewModelScope.launch {
            while (isActive) {
                val statsResult = repository.getDoctorQueueStats(doctorId)
                if (statsResult.isSuccess) {
                    val stats = statsResult.getOrNull()
                    val currentState = _uiState.value
                    if (currentState is UiState.Success && stats != null) {
                        _uiState.value = currentState.copy(queueStats = stats)
                    }
                }
                delay(30000) // Poll every 30 seconds
            }
        }
    }

    sealed class UiState {
        object Loading : UiState()
        data class Success(
            val details: DoctorDetails,
            val queueStats: com.example.swastik.data.remote.dto.DoctorQueueStatsDto? = null
        ) : UiState()
        data class Error(val message: String) : UiState()
    }
}
