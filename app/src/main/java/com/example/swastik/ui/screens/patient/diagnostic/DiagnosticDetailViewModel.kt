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

@HiltViewModel
class DiagnosticDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<DiagnosticDetailUiState>(DiagnosticDetailUiState.Loading)
    val uiState: StateFlow<DiagnosticDetailUiState> = _uiState

    fun loadDiagnosticDetails(centerId: String) {
        viewModelScope.launch {
            _uiState.value = DiagnosticDetailUiState.Loading
            try {
                val facility = hospitalRepository.getDiagnosticCenterDetails(centerId)
                if (facility != null) {
                    _uiState.value = DiagnosticDetailUiState.Success(facility)
                } else {
                    _uiState.value = DiagnosticDetailUiState.Error("Diagnostic Center not found.")
                }
            } catch (e: Exception) {
                _uiState.value = DiagnosticDetailUiState.Error(e.message ?: "Failed to load diagnostic center details.")
            }
        }
    }
}

sealed class DiagnosticDetailUiState {
    object Loading : DiagnosticDetailUiState()
    data class Success(val facility: MedicalFacility) : DiagnosticDetailUiState()
    data class Error(val message: String) : DiagnosticDetailUiState()
}
