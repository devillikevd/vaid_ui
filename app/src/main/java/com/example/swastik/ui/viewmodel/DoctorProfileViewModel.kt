package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.DoctorDetails
import com.example.swastik.data.repository.DoctorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import javax.inject.Inject

@HiltViewModel
class DoctorProfileViewModel @Inject constructor(
    private val repository: DoctorRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState

    fun fetchDoctorDetails(doctorId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            val result = repository.getDoctorDetails(doctorId)
            if (result.isSuccess) {
                val details = result.getOrNull()
                if (details != null) {
                    _uiState.value = UiState.Success(details, null)
                    startQueueStatsPolling(doctorId)
                } else {
                    _uiState.value = UiState.Error("Failed to load doctor details")
                }
            } else {
                _uiState.value = UiState.Error(result.exceptionOrNull()?.message ?: "Failed to load doctor details")
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
