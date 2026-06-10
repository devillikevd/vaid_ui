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

@HiltViewModel
class PharmacyDetailViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<PharmacyDetailUiState>(PharmacyDetailUiState.Loading)
    val uiState: StateFlow<PharmacyDetailUiState> = _uiState

    fun loadPharmacyDetails(pharmacyId: String) {
        viewModelScope.launch {
            _uiState.value = PharmacyDetailUiState.Loading
            try {
                val facility = hospitalRepository.getPharmacyDetails(pharmacyId)
                if (facility != null) {
                    _uiState.value = PharmacyDetailUiState.Success(facility)
                } else {
                    _uiState.value = PharmacyDetailUiState.Error("Pharmacy not found.")
                }
            } catch (e: Exception) {
                _uiState.value = PharmacyDetailUiState.Error(e.message ?: "Failed to load pharmacy details.")
            }
        }
    }
}

sealed class PharmacyDetailUiState {
    object Loading : PharmacyDetailUiState()
    data class Success(val facility: MedicalFacility) : PharmacyDetailUiState()
    data class Error(val message: String) : PharmacyDetailUiState()
}
