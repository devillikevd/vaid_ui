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

enum class DosePeriod(val label: String) {
    WAKEUP("Early Morning (Empty Stomach)"),
    MORNING("Morning Routine"),
    AFTERNOON("Afternoon Routine"),
    EVENING("Evening Routine"),
    NIGHT("Night Routine"),
    BEDTIME("Bedtime")
}

enum class MealInstruction(val label: String, val badge: String) {
    EMPTY_STOMACH("Empty Stomach", "⚠️ Empty Stomach (Morning)"),
    BEFORE_MEAL("Before Food (AC)", "🍽️ 30m Before Food"),
    AFTER_MEAL("After Food (PC)", "🍽️ After Food"),
    BEDTIME("At Bedtime (HS)", "🛌 At Bedtime"),
    WITH_MEAL("With Food", "🍲 With Food"),
    STANDARD("Standard", "⏰ As Prescribed")
}

data class DoseSlot(
    val id: String = java.util.UUID.randomUUID().toString(),
    val time: String,
    val period: DosePeriod,
    val mealInstruction: MealInstruction,
    val mealInstructionLabel: String,
    val medicineName: String,
    val dosage: String,
    val durationDays: Int,
    val startDate: String,
    val endDate: String
)

data class MedicationSchedulePreview(
    val prescriptionId: String,
    val doctorName: String?,
    val slots: List<DoseSlot>,
    val totalAlarmsCount: Int,
    val maxDurationDays: Int,
    val endDateFormatted: String,
    val breakfastTime: String = "08:30 AM",
    val lunchTime: String = "01:30 PM",
    val dinnerTime: String = "08:30 PM"
)

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
    val schedulingReminders: Boolean = false,
    val remindersScheduledCount: Int? = null,
    val schedulePreview: MedicationSchedulePreview? = null,
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
    private val vitalsRepository: com.example.swastik.data.repository.VitalsRepository,
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
        if (healthConnectManager.hasPermissions()) {
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

    fun openSchedulePreview(
        prescription: Prescription,
        breakfast: String = "08:30 AM",
        lunch: String = "01:30 PM",
        dinner: String = "08:30 PM"
    ) {
        val preview = buildSchedulePreview(prescription, breakfast, lunch, dinner)
        _uiState.update { it.copy(schedulePreview = preview) }
    }

    fun updateScheduleTimes(
        prescription: Prescription,
        breakfast: String,
        lunch: String,
        dinner: String
    ) {
        val preview = buildSchedulePreview(prescription, breakfast, lunch, dinner)
        _uiState.update { it.copy(schedulePreview = preview) }
    }

    fun closeSchedulePreview() {
        _uiState.update { it.copy(schedulePreview = null) }
    }

    fun confirmSchedulePreview(
        onSuccess: (count: Int) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        val preview = _uiState.value.schedulePreview
        if (preview == null || preview.slots.isEmpty()) {
            onError("No medication doses to schedule")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(schedulingReminders = true) }
            var scheduledCount = 0
            val allDays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

            preview.slots.forEach { slot ->
                val request = com.example.swastik.data.remote.dto.CreateReminderRequest(
                    title = "${slot.medicineName} (${slot.dosage})",
                    type = "medicine",
                    time = slot.time,
                    days = allDays,
                    notes = "${slot.mealInstruction.badge} • Dr. ${preview.doctorName ?: "Doctor"} • Course: ${slot.durationDays} days (until ${slot.endDate})"
                )
                val result = vitalsRepository.createReminder(request)
                if (result is com.example.swastik.data.repository.Result.Success) {
                    scheduledCount++
                }
            }

            _uiState.update {
                it.copy(
                    schedulingReminders = false,
                    remindersScheduledCount = scheduledCount,
                    schedulePreview = null
                )
            }

            if (scheduledCount > 0) {
                onSuccess(scheduledCount)
            } else {
                onError("Failed to schedule reminders")
            }
        }
    }

    fun autoSchedulePrescriptionReminders(
        prescription: Prescription,
        onSuccess: (count: Int) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        openSchedulePreview(prescription)
    }

    fun scheduleSingleMedicineReminder(
        medicine: PrescriptionItem,
        doctorName: String?,
        onSuccess: (count: Int) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(schedulingReminders = true) }
            var scheduledCount = 0
            val allDays = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
            val instruction = detectMealInstruction(medicine.medicineName, medicine.frequency, medicine.duration)
            val doseTimes = resolveClinicalDoseTimes(medicine.frequency, instruction, "08:30 AM", "01:30 PM", "08:30 PM")
            val durationDays = parseDurationDays(medicine.duration)
            val endDate = java.time.LocalDate.now().plusDays(durationDays.toLong()).format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy"))

            doseTimes.forEach { slot ->
                val request = com.example.swastik.data.remote.dto.CreateReminderRequest(
                    title = "${medicine.medicineName} (${medicine.dosage})",
                    type = "medicine",
                    time = slot.time,
                    days = allDays,
                    notes = "${slot.mealInstruction.badge} • Dr. ${doctorName ?: "Doctor"} • Course: $durationDays days (until $endDate)"
                )
                val result = vitalsRepository.createReminder(request)
                if (result is com.example.swastik.data.repository.Result.Success) {
                    scheduledCount++
                }
            }

            _uiState.update { it.copy(schedulingReminders = false) }

            if (scheduledCount > 0) {
                onSuccess(scheduledCount)
            } else {
                onError("Failed to schedule reminder")
            }
        }
    }

    fun clearRemindersScheduledState() {
        _uiState.update { it.copy(remindersScheduledCount = null) }
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

private fun buildSchedulePreview(
    prescription: Prescription,
    breakfast: String,
    lunch: String,
    dinner: String
): MedicationSchedulePreview {
    val medicines = prescription.medicines.orEmpty()
    val allSlots = mutableListOf<DoseSlot>()
    var maxDays = 5

    medicines.forEach { med ->
        val instruction = detectMealInstruction(med.medicineName, med.frequency, med.duration)
        val durationDays = parseDurationDays(med.duration)
        if (durationDays > maxDays) maxDays = durationDays
        val startDate = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy"))
        val endDate = java.time.LocalDate.now().plusDays(durationDays.toLong()).format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy"))

        val times = resolveClinicalDoseTimes(med.frequency, instruction, breakfast, lunch, dinner)
        times.forEach { calculatedSlot ->
            allSlots.add(
                DoseSlot(
                    time = calculatedSlot.time,
                    period = calculatedSlot.period,
                    mealInstruction = calculatedSlot.mealInstruction,
                    mealInstructionLabel = calculatedSlot.mealInstruction.badge,
                    medicineName = med.medicineName,
                    dosage = med.dosage.ifBlank { "1 dose" },
                    durationDays = durationDays,
                    startDate = startDate,
                    endDate = endDate
                )
            )
        }
    }

    val finalEndDate = java.time.LocalDate.now().plusDays(maxDays.toLong()).format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy"))

    return MedicationSchedulePreview(
        prescriptionId = prescription.id,
        doctorName = prescription.doctor?.name,
        slots = allSlots,
        totalAlarmsCount = allSlots.size,
        maxDurationDays = maxDays,
        endDateFormatted = finalEndDate,
        breakfastTime = breakfast,
        lunchTime = lunch,
        dinnerTime = dinner
    )
}

private data class CalculatedSlot(
    val time: String,
    val period: DosePeriod,
    val mealInstruction: MealInstruction
)

private fun detectMealInstruction(medName: String, frequency: String, duration: String): MealInstruction {
    val combined = "$medName $frequency $duration".lowercase()
    return when {
        combined.contains("empty stomach") ||
        combined.contains("khali pet") ||
        combined.contains("pantop") ||
        combined.contains("pan-d") ||
        combined.contains("pan d") ||
        combined.contains("omeprazole") ||
        combined.contains("rabeprazole") ||
        combined.contains("esomeprazole") ||
        combined.contains("razo") ||
        combined.contains("omez") -> MealInstruction.EMPTY_STOMACH

        combined.contains("before food") ||
        combined.contains("before meal") ||
        combined.contains(" ac") ||
        combined.contains("ante cibum") -> MealInstruction.BEFORE_MEAL

        combined.contains("bedtime") ||
        combined.contains("night only") ||
        combined.contains(" hs") ||
        combined.contains("hora somni") -> MealInstruction.BEDTIME

        combined.contains("with food") ||
        combined.contains("with meal") -> MealInstruction.WITH_MEAL

        else -> MealInstruction.AFTER_MEAL
    }
}

private fun parseDurationDays(raw: String): Int {
    val r = raw.lowercase().trim()
    val digits = r.filter { it.isDigit() }.toIntOrNull()
    return when {
        digits != null && digits > 0 -> {
            if (r.contains("month")) digits * 30
            else if (r.contains("week")) digits * 7
            else digits
        }
        r.contains("week") -> 7
        r.contains("month") -> 30
        else -> 5 // standard 5 days fallback
    }
}

private fun resolveClinicalDoseTimes(
    freq: String,
    instruction: MealInstruction,
    breakfast: String,
    lunch: String,
    dinner: String
): List<CalculatedSlot> {
    val f = freq.lowercase().trim()

    // Base default offsets
    val morningTime = when (instruction) {
        MealInstruction.EMPTY_STOMACH -> "06:30 AM"
        MealInstruction.BEFORE_MEAL -> "08:00 AM"
        MealInstruction.AFTER_MEAL -> "08:45 AM"
        else -> breakfast
    }

    val afternoonTime = when (instruction) {
        MealInstruction.BEFORE_MEAL -> "01:00 PM"
        MealInstruction.AFTER_MEAL -> "01:45 PM"
        else -> lunch
    }

    val nightTime = when (instruction) {
        MealInstruction.BEFORE_MEAL -> "08:00 PM"
        MealInstruction.AFTER_MEAL -> "08:45 PM"
        MealInstruction.BEDTIME -> "10:00 PM"
        else -> dinner
    }

    return when {
        // Specific 1-0-1 pattern
        f.contains("1-0-1") || f.contains("twice") || f.contains("2 times") || f.contains("bid") -> {
            listOf(
                CalculatedSlot(morningTime, if (instruction == MealInstruction.EMPTY_STOMACH) DosePeriod.WAKEUP else DosePeriod.MORNING, instruction),
                CalculatedSlot(nightTime, if (instruction == MealInstruction.BEDTIME) DosePeriod.BEDTIME else DosePeriod.NIGHT, instruction)
            )
        }
        // Specific 1-1-1 pattern
        f.contains("1-1-1") || f.contains("thrice") || f.contains("3 times") || f.contains("tid") -> {
            listOf(
                CalculatedSlot(morningTime, if (instruction == MealInstruction.EMPTY_STOMACH) DosePeriod.WAKEUP else DosePeriod.MORNING, instruction),
                CalculatedSlot(afternoonTime, DosePeriod.AFTERNOON, if (instruction == MealInstruction.EMPTY_STOMACH) MealInstruction.BEFORE_MEAL else instruction),
                CalculatedSlot(nightTime, if (instruction == MealInstruction.BEDTIME) DosePeriod.BEDTIME else DosePeriod.NIGHT, instruction)
            )
        }
        // Specific 1-0-0 (Morning only)
        f.contains("1-0-0") || f.contains("morning") || f.contains("breakfast") -> {
            listOf(CalculatedSlot(morningTime, if (instruction == MealInstruction.EMPTY_STOMACH) DosePeriod.WAKEUP else DosePeriod.MORNING, instruction))
        }
        // Specific 0-1-0 (Afternoon only)
        f.contains("0-1-0") || f.contains("afternoon") || f.contains("lunch") -> {
            listOf(CalculatedSlot(afternoonTime, DosePeriod.AFTERNOON, instruction))
        }
        // Specific 0-0-1 (Night only)
        f.contains("0-0-1") || f.contains("night") || f.contains("dinner") || f.contains("bedtime") || f.contains("hs") -> {
            listOf(CalculatedSlot(nightTime, if (instruction == MealInstruction.BEDTIME) DosePeriod.BEDTIME else DosePeriod.NIGHT, instruction))
        }
        // Specific 1-1-1-1 (4 times daily)
        f.contains("1-1-1-1") || f.contains("4 times") || f.contains("qid") -> {
            listOf(
                CalculatedSlot("08:00 AM", DosePeriod.MORNING, instruction),
                CalculatedSlot("01:00 PM", DosePeriod.AFTERNOON, instruction),
                CalculatedSlot("06:00 PM", DosePeriod.EVENING, instruction),
                CalculatedSlot("10:00 PM", DosePeriod.BEDTIME, instruction)
            )
        }
        // Generic once daily
        f.contains("once") || f.contains("1 time") || f.contains("od") -> {
            listOf(CalculatedSlot(morningTime, if (instruction == MealInstruction.EMPTY_STOMACH) DosePeriod.WAKEUP else DosePeriod.MORNING, instruction))
        }
        // Default standard dose
        else -> listOf(
            CalculatedSlot(morningTime, if (instruction == MealInstruction.EMPTY_STOMACH) DosePeriod.WAKEUP else DosePeriod.MORNING, instruction),
            CalculatedSlot(nightTime, if (instruction == MealInstruction.BEDTIME) DosePeriod.BEDTIME else DosePeriod.NIGHT, instruction)
        )
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
