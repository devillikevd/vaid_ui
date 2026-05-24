package com.example.swastik.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.ConsultationRecord
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.MedicalDocument
import com.example.swastik.data.model.DocumentType
import com.example.swastik.data.model.Prescription
import com.example.swastik.data.model.PrescriptionItem
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.repository.HospitalRepository
import com.example.swastik.data.repository.RecordsRepository
import com.example.swastik.data.remote.dto.ConsultationDto
import com.example.swastik.data.remote.dto.ReportDto
import com.example.swastik.utils.LocationHelper
import com.example.swastik.data.health.HealthConnectManager
import com.example.swastik.data.health.VitalsData
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RecordsUiState(
    val consultations: List<ConsultationRecord> = emptyList(),
    val prescriptions: List<Prescription> = emptyList(),
    val documents: List<MedicalDocument> = emptyList(),
    val prescriptionPharmacies: List<MedicalFacility> = emptyList(),
    val patientDefaultDeliveryAddress: String? = null,
    val loadingPrescriptionPharmacies: Boolean = false,
    val prescriptionPharmacySourceLabel: String? = null,
    val prescriptionPharmacyError: String? = null,
    val forwardingPrescription: Boolean = false,
    val prescriptionForwardError: String? = null,
    val prescriptionForwardSuccess: PrescriptionForwardSuccess? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val uploadState: UploadState = UploadState.Idle,
    val vitalsData: VitalsData? = null,
    val consultationsPage: Int = 1,
    val hasMoreConsultations: Boolean = true,
    val prescriptionsPage: Int = 1,
    val hasMorePrescriptions: Boolean = true,
    val documentsPage: Int = 1,
    val hasMoreDocuments: Boolean = true,
    val isLoadingMore: Boolean = false
)

data class PrescriptionForwardSuccess(
    val message: String,
    val orderId: String? = null
)

sealed class UploadState {
    data object Idle : UploadState()
    data object Uploading : UploadState()
    data class Success(val message: String) : UploadState()
    data class Error(val message: String) : UploadState()
}

@HiltViewModel
class RecordsViewModel @Inject constructor(
    private val recordsRepository: RecordsRepository,
    private val hospitalRepository: HospitalRepository,
    private val locationHelper: LocationHelper,
    private val socketManager: SocketManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val healthConnectManager = HealthConnectManager(context)

    private val _uiState = MutableStateFlow(RecordsUiState())
    val uiState: StateFlow<RecordsUiState> = _uiState.asStateFlow()

    init {
        loadRecords()
        observeDiagnosticUpdates()
    }

    fun loadRecords() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            // supervisorScope: one child failure doesn't cancel the other
            supervisorScope {
                launch {
                    try { loadConsultations(isLoadMore = false) }
                    catch (e: Exception) {
                        _uiState.update { it.copy(error = e.message ?: "Failed to load consultations") }
                    }
                }
                launch {
                    try { loadPrescriptions(isLoadMore = false) }
                    catch (e: Exception) {
                        _uiState.update { it.copy(error = e.message ?: "Failed to load prescriptions") }
                    }
                }
                launch {
                    try { loadReports(isLoadMore = false) }
                    catch (e: Exception) {
                        _uiState.update { it.copy(error = e.message ?: "Failed to load reports") }
                    }
                }
                launch {
                    try { loadVitals() }
                    catch (e: Exception) {
                        // ignore vitals fetch error
                    }
                }
            }
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    private suspend fun loadVitals() {
        if (healthConnectManager.hasAllPermissions()) {
            val vitals = healthConnectManager.fetchVitalsData()
            _uiState.update { it.copy(vitalsData = vitals) }
        }
    }


    private suspend fun loadConsultations(isLoadMore: Boolean = false) {
        val currentState = _uiState.value
        val page = if (isLoadMore) currentState.consultationsPage + 1 else 1

        val (dtos, totalPages) = recordsRepository.getConsultations(page = page)
        val consultations = dtos.map { it.toConsultationRecord() }
        
        _uiState.update { 
            it.copy(
                consultations = if (isLoadMore) it.consultations + consultations else consultations,
                consultationsPage = page,
                hasMoreConsultations = page < totalPages
            ) 
        }
    }

    private suspend fun loadPrescriptions(isLoadMore: Boolean = false) {
        val currentState = _uiState.value
        val page = if (isLoadMore) currentState.prescriptionsPage + 1 else 1

        val (fetched, totalPages) = recordsRepository.getPatientPrescriptions(page = page)
        
        _uiState.update { 
            it.copy(
                prescriptions = if (isLoadMore) it.prescriptions + fetched else fetched,
                prescriptionsPage = page,
                hasMorePrescriptions = page < totalPages
            ) 
        }
    }

    private suspend fun loadReports(isLoadMore: Boolean = false) {
        val currentState = _uiState.value
        val page = if (isLoadMore) currentState.documentsPage + 1 else 1

        val (dtos, totalPages) = recordsRepository.getPatientReports(page = page)
        val documents = dtos.map { it.toMedicalDocument() }
        
        _uiState.update { 
            it.copy(
                documents = if (isLoadMore) it.documents + documents else documents,
                documentsPage = page,
                hasMoreDocuments = page < totalPages
            ) 
        }
    }

    fun loadMoreConsultations() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMoreConsultations) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            try { loadConsultations(isLoadMore = true) }
            catch (e: Exception) { _uiState.update { it.copy(error = e.message ?: "Failed to load more consultations") } }
            finally { _uiState.update { it.copy(isLoadingMore = false) } }
        }
    }

    fun loadMorePrescriptions() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMorePrescriptions) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            try { loadPrescriptions(isLoadMore = true) }
            catch (e: Exception) { _uiState.update { it.copy(error = e.message ?: "Failed to load more prescriptions") } }
            finally { _uiState.update { it.copy(isLoadingMore = false) } }
        }
    }

    fun loadMoreReports() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMoreDocuments) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            try { loadReports(isLoadMore = true) }
            catch (e: Exception) { _uiState.update { it.copy(error = e.message ?: "Failed to load more reports") } }
            finally { _uiState.update { it.copy(isLoadingMore = false) } }
        }
    }

    private fun observeDiagnosticUpdates() {
        viewModelScope.launch {
            socketManager.diagnosticUpdates.collect { update ->
                if (update.status == "result_ready" || !update.resultUrl.isNullOrBlank()) {
                    runCatching { loadReports() }
                }
            }
        }
    }

    fun uploadReport(uri: Uri?, name: String, type: String, externalUrl: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(uploadState = UploadState.Uploading) }
            try {
                recordsRepository.uploadReport(uri, name, type, externalUrl)
                _uiState.update { it.copy(uploadState = UploadState.Success("Report uploaded successfully")) }
                // Reload records to show new report
                loadRecords()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(uploadState = UploadState.Error(e.message ?: "Upload failed"))
                }
            }
        }
    }

    fun deleteReport(reportId: String) {
        viewModelScope.launch {
            try {
                recordsRepository.deleteReport(reportId)
                // Remove from local state immediately
                _uiState.update { state ->
                    state.copy(documents = state.documents.filter { it.id != reportId })
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = e.message ?: "Failed to delete report")
                }
            }
        }
    }

    fun clearUploadState() {
        _uiState.update { it.copy(uploadState = UploadState.Idle) }
    }

    fun loadPrescriptionPharmacies(search: String = "") {
        val normalizedSearch = search.trim()

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    loadingPrescriptionPharmacies = true,
                    prescriptionPharmacyError = null
                )
            }

            try {
                val defaultAddress = _uiState.value.patientDefaultDeliveryAddress
                    ?: runCatching { recordsRepository.getDefaultDeliveryAddress() }.getOrNull()

                val pharmacies = if (normalizedSearch.isNotEmpty()) {
                    recordsRepository.searchPharmacies(search = normalizedSearch)
                } else {
                    val location = try { locationHelper.getLastLocation() } catch (_: Exception) { null }
                    val nearbyPharmacies = runCatching {
                        if (location != null) {
                            hospitalRepository.getNearbyPharmacies(
                                latitude = location.latitude,
                                longitude = location.longitude,
                                radius = 15
                            )
                        } else {
                            emptyList()
                        }
                    }.getOrElse { emptyList() }
                    val approvedPharmacies = recordsRepository.searchPharmacies(limit = 20)
                    mergePharmacies(nearbyPharmacies, approvedPharmacies)
                }

                _uiState.update {
                    it.copy(
                        prescriptionPharmacies = pharmacies,
                        patientDefaultDeliveryAddress = defaultAddress ?: it.patientDefaultDeliveryAddress,
                        loadingPrescriptionPharmacies = false,
                        prescriptionPharmacySourceLabel = when {
                            normalizedSearch.isNotEmpty() -> "Search results"
                            pharmacies.any { pharmacy -> pharmacy.distanceKm > 0.0 } -> "Nearby and approved pharmacies"
                            else -> "Approved pharmacies"
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        loadingPrescriptionPharmacies = false,
                        prescriptionPharmacyError = e.message ?: "Failed to load pharmacies"
                    )
                }
            }
        }
    }

    fun forwardPrescriptionToPharmacy(
        prescriptionId: String,
        pharmacyId: String,
        pharmacyName: String,
        deliveryAddress: String
    ) {
        if (pharmacyId.isBlank()) {
            _uiState.update { it.copy(prescriptionForwardError = "Please choose a pharmacy first.") }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    forwardingPrescription = true,
                    prescriptionForwardError = null,
                    prescriptionForwardSuccess = null
                )
            }

            try {
                val order = recordsRepository.forwardPrescriptionToPharmacy(
                    prescriptionId = prescriptionId,
                    pharmacyId = pharmacyId,
                    deliveryAddress = deliveryAddress
                )
                _uiState.update {
                    it.copy(
                        forwardingPrescription = false,
                        prescriptionForwardSuccess = PrescriptionForwardSuccess(
                            message = "Prescription sent to $pharmacyName.",
                            orderId = order.id
                        )
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        forwardingPrescription = false,
                        prescriptionForwardError = e.message ?: "Failed to send prescription"
                    )
                }
            }
        }
    }

    fun clearPrescriptionForwardSuccess() {
        _uiState.update { it.copy(prescriptionForwardSuccess = null) }
    }

    fun clearPrescriptionForwardError() {
        _uiState.update { it.copy(prescriptionForwardError = null) }
    }

    fun clearPrescriptionPharmacies() {
        _uiState.update {
            it.copy(
                prescriptionPharmacies = emptyList(),
                prescriptionPharmacySourceLabel = null,
                prescriptionPharmacyError = null,
                loadingPrescriptionPharmacies = false
            )
        }
    }
}

private fun mergePharmacies(
    primary: List<MedicalFacility>,
    fallback: List<MedicalFacility>
): List<MedicalFacility> {
    val merged = LinkedHashMap<String, MedicalFacility>()
    (primary + fallback).forEach { pharmacy ->
        if (pharmacy.id.isNotBlank()) {
            merged.putIfAbsent(pharmacy.id, pharmacy)
        }
    }
    return merged.values.toList()
}

private fun ConsultationDto.toConsultationRecord(): ConsultationRecord {
    return ConsultationRecord(
        id = id,
        doctorName = doctorName,
        doctorSpecialty = doctorSpecialty,
        date = date,
        diagnosis = diagnosis ?: "No diagnosis recorded",
        prescriptions = prescriptions?.flatMap { p ->
            // Each PrescriptionDto has a list of medicines (PrescriptionItemDto)
            // which contain the actual medicine details
            p.allMedicines.map { item ->
                PrescriptionItem(
                    medicineName = item.medicineName,
                    dosage = item.dosage,
                    frequency = item.frequency,
                    duration = item.duration
                )
            }
        } ?: emptyList(),
        notes = notes ?: "",
        followUpDate = followUpDate
    )
}

/**
 * Maps DB report type values to Android DocumentType enum.
 * DB CHECK: 'blood_test', 'urine_test', 'x_ray', 'mri', 'ct_scan', 'ecg', 'ultrasound', 'other'
 */
private fun ReportDto.toMedicalDocument(): MedicalDocument {
    val docType = when (type.lowercase()) {
        "blood_test", "urine_test", "ecg", "diagnostic_result" -> DocumentType.LAB_REPORT
        "x_ray", "mri", "ct_scan", "ultrasound" -> DocumentType.SCAN
        "prescription", "rx" -> DocumentType.PRESCRIPTION
        "discharge", "discharge_summary" -> DocumentType.DISCHARGE_SUMMARY
        "vaccination", "vaccine" -> DocumentType.VACCINATION
        else -> DocumentType.REPORT
    }
    return MedicalDocument(
        id = id,
        name = name,
        type = docType,
        date = displayDate,
        doctorName = labName,
        fileUrl = fileUrl ?: "",
        size = fileSize
    )
}
