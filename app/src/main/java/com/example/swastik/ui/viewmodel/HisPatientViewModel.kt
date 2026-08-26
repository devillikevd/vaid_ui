package com.example.swastik.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.repository.HospitalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HisPatientUiState(
    // Queue
    val queuePosition: QueuePosition? = null,
    val queueActive: Boolean = false,
    val queueLoading: Boolean = false,

    // Bed Availability (for a specific hospital)
    val bedAvailability: BedAvailabilityWrapper? = null,
    val bedLoading: Boolean = false,

    // Admissions
    val admissions: List<PatientAdmission> = emptyList(),
    val admissionsLoading: Boolean = false,
    val selectedAdmission: PatientAdmission? = null,

    // Lab Reports
    val labReports: List<PatientLabReport> = emptyList(),
    val labReportsLoading: Boolean = false,

    // Pre-auth
    val preauthList: List<PatientPreauthStatus> = emptyList(),
    val preauthLoading: Boolean = false,

    // Bill Estimate
    val billEstimate: BillEstimateWrapper? = null,
    val serviceCatalog: List<BillEstimate> = emptyList(),
    val serviceCatalogLoading: Boolean = false,

    // General
    val error: String? = null
)

@HiltViewModel
class HisPatientViewModel @Inject constructor(
    private val hospitalRepository: HospitalRepository
) : ViewModel() {

    companion object {
        private const val TAG = "HisPatientViewModel"
    }

    private val _uiState = MutableStateFlow(HisPatientUiState())
    val uiState: StateFlow<HisPatientUiState> = _uiState.asStateFlow()

    // ── Queue Position ──
    fun fetchQueuePosition() {
        viewModelScope.launch {
            _uiState.update { it.copy(queueLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getMyQueuePosition()
                _uiState.update {
                    it.copy(
                        queuePosition = wrapper?.queue,
                        queueActive = wrapper?.queueActive ?: false,
                        queueLoading = false
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "fetchQueuePosition error", e)
                _uiState.update { it.copy(queueLoading = false, error = e.message) }
            }
        }
    }

    // ── Bed Availability ──
    fun fetchBedAvailability(hospitalId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(bedLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getHospitalBedAvailability(hospitalId)
                _uiState.update { it.copy(bedAvailability = wrapper, bedLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchBedAvailability error", e)
                _uiState.update { it.copy(bedLoading = false, error = e.message) }
            }
        }
    }

    // ── Admissions ──
    fun fetchMyAdmissions(status: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(admissionsLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getMyAdmissions(status = status)
                _uiState.update { it.copy(admissions = wrapper?.data ?: emptyList(), admissionsLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchMyAdmissions error", e)
                _uiState.update { it.copy(admissionsLoading = false, error = e.message) }
            }
        }
    }

    fun fetchAdmissionDetail(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(admissionsLoading = true, error = null) }
            try {
                val admission = hospitalRepository.getAdmissionDetail(id)
                _uiState.update { it.copy(selectedAdmission = admission, admissionsLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchAdmissionDetail error", e)
                _uiState.update { it.copy(admissionsLoading = false, error = e.message) }
            }
        }
    }

    // ── Lab Reports ──
    fun fetchMyLabReports(status: String? = null, type: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(labReportsLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getMyLabReports(status = status, type = type)
                _uiState.update { it.copy(labReports = wrapper?.data ?: emptyList(), labReportsLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchMyLabReports error", e)
                _uiState.update { it.copy(labReportsLoading = false, error = e.message) }
            }
        }
    }

    // ── Pre-Auth ──
    fun fetchMyPreauthStatus() {
        viewModelScope.launch {
            _uiState.update { it.copy(preauthLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getMyPreauthStatus()
                _uiState.update { it.copy(preauthList = wrapper?.data ?: emptyList(), preauthLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchMyPreauthStatus error", e)
                _uiState.update { it.copy(preauthLoading = false, error = e.message) }
            }
        }
    }

    // ── Service Catalog / Bill Estimate ──
    fun fetchServiceCatalog(hospitalId: String, category: String? = null, search: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(serviceCatalogLoading = true, error = null) }
            try {
                val wrapper = hospitalRepository.getHospitalServiceCatalog(hospitalId, category, search)
                _uiState.update { it.copy(serviceCatalog = wrapper?.services ?: emptyList(), serviceCatalogLoading = false) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchServiceCatalog error", e)
                _uiState.update { it.copy(serviceCatalogLoading = false, error = e.message) }
            }
        }
    }

    fun fetchBillEstimate(hospitalId: String, serviceIds: List<String>) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }
            try {
                val wrapper = hospitalRepository.getBillEstimate(hospitalId, serviceIds)
                _uiState.update { it.copy(billEstimate = wrapper) }
            } catch (e: Exception) {
                Log.e(TAG, "fetchBillEstimate error", e)
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
