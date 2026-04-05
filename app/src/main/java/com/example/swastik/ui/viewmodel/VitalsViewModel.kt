package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.VitalType
import com.example.swastik.data.remote.dto.*
import com.example.swastik.data.repository.PatientRepository
import com.example.swastik.data.repository.VitalsRepository
import com.example.swastik.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import javax.inject.Inject

data class VitalsUiState(
    val isLoading: Boolean = false,
    val vitals: List<VitalDto> = emptyList(),
    val reminders: List<ReminderDto> = emptyList(),
    val error: String? = null,
    val vitalRecordSuccess: Boolean = false,
    val reminderCreated: Boolean = false,
    val reminderDeleted: Boolean = false,
    val activeReminderActionId: String? = null,
    val reminderActionMessage: String? = null,
    val reminderActionError: String? = null
)

@HiltViewModel
class VitalsViewModel @Inject constructor(
    private val repository: VitalsRepository,
    private val patientRepository: PatientRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VitalsUiState())
    val uiState: StateFlow<VitalsUiState> = _uiState.asStateFlow()

    init {
        loadVitals()
        loadReminders()
    }

    fun loadVitals(page: Int = 1) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = repository.getVitals(page)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        vitals = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> { }
            }
        }
    }

    fun recordVital(type: VitalType, value: String, notes: String? = null) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null, vitalRecordSuccess = false)
        viewModelScope.launch {
            val request = CreateVitalRequest(
                type = type.apiValue,
                value = value,
                unit = type.defaultUnit,
                notes = notes
            )
            when (val result = repository.recordVital(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        vitalRecordSuccess = true
                    )
                    loadVitals() // Refresh the list
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> { }
            }
        }
    }

    fun loadReminders(type: String? = null) {
        viewModelScope.launch {
            when (val result = repository.getReminders(type, isActive = true)) {
                is Result.Success -> {
                    patientRepository.updateReminderSnapshot(result.data)
                    _uiState.value = _uiState.value.copy(reminders = result.data)
                }
                is Result.Error -> {
                    // Silent fail for reminders sub-load
                }
                is Result.Loading -> { }
            }
        }
    }

    fun createReminder(title: String, type: String, time: String) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null, reminderCreated = false)
        viewModelScope.launch {
            val request = CreateReminderRequest(title = title, type = type, time = time)
            when (val result = repository.createReminder(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        reminderCreated = true
                    )
                    loadReminders()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> { }
            }
        }
    }

    fun deleteReminder(id: String) {
        viewModelScope.launch {
            when (repository.deleteReminder(id)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(reminderDeleted = true)
                    loadReminders()
                }
                is Result.Error -> {
                    // Silent fail
                }
                is Result.Loading -> { }
            }
        }
    }

    fun takeReminder(reminder: ReminderDto) {
        actOnReminder(reminder, action = "taken")
    }

    fun skipReminder(reminder: ReminderDto) {
        actOnReminder(reminder, action = "skip")
    }

    fun snoozeReminder(reminder: ReminderDto, snoozeMinutes: Int) {
        actOnReminder(reminder, action = "snooze", snoozeMinutes = snoozeMinutes)
    }

    private fun actOnReminder(
        reminder: ReminderDto,
        action: String,
        snoozeMinutes: Int? = null
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                activeReminderActionId = reminder.id,
                reminderActionError = null,
                reminderActionMessage = null
            )

            when (
                val result = repository.actOnReminder(
                    id = reminder.id,
                    action = action,
                    scheduledAt = scheduledIsoFor(reminder.time),
                    snoozeMinutes = snoozeMinutes
                )
            ) {
                is Result.Success -> {
                    val actionMessage = when (action) {
                        "taken" -> "${reminder.title} marked as taken."
                        "skip" -> "${reminder.title} marked as skipped."
                        "snooze" -> "${reminder.title} snoozed for ${snoozeMinutes ?: 0} minutes."
                        else -> "Reminder updated."
                    }

                    val updatedReminders = when (action) {
                        "taken", "skip" -> _uiState.value.reminders.map { existing ->
                            if (existing.id == reminder.id) existing.copy(isCompleted = true) else existing
                        }
                        else -> _uiState.value.reminders
                    }

                    _uiState.value = _uiState.value.copy(
                        reminders = updatedReminders,
                        activeReminderActionId = null,
                        reminderActionMessage = actionMessage
                    )

                    if (action == "snooze") {
                        loadReminders()
                    }
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        activeReminderActionId = null,
                        reminderActionError = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearReminderFeedback() {
        _uiState.value = _uiState.value.copy(
            reminderActionMessage = null,
            reminderActionError = null
        )
    }

    fun resetFlags() {
        _uiState.value = _uiState.value.copy(
            vitalRecordSuccess = false,
            reminderCreated = false,
            reminderDeleted = false
        )
    }

    private fun scheduledIsoFor(time: String): String {
        val parsedTime = runCatching { LocalTime.parse(time) }.getOrNull()
            ?: return LocalDateTime.now().atZone(ZoneId.systemDefault()).toOffsetDateTime().toString()

        return LocalDate.now()
            .atTime(parsedTime)
            .atZone(ZoneId.systemDefault())
            .toOffsetDateTime()
            .toString()
    }
}
