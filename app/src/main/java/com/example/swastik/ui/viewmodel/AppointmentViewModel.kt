package com.example.swastik.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.Appointment
import com.example.swastik.data.model.TimeSlot
import com.example.swastik.data.repository.AppointmentRepository
import com.example.swastik.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NextAvailableSlotSuggestion(
    val date: String,
    val availableSlotCount: Int,
    val firstAvailableSlot: String?
)

/**
 * Appointment ViewModel - handles appointment screen logic
 */
@HiltViewModel
class AppointmentViewModel @Inject constructor(
    private val repository: AppointmentRepository
) : ViewModel() {
    
    var uiState by mutableStateOf(AppointmentUiState())
        private set

    private var slotLookupJob: Job? = null
    
    init {
        loadAppointments()
    }
    
    /**
     * Load all appointments
     */
    fun loadAppointments(status: String? = null) {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true)
            
            when (val result = repository.getAppointments(status = status)) {
                is Result.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        appointments = result.data,
                        hasLoaded = true
                    )
                }
                is Result.Error -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
    
    /**
     * Load upcoming appointments only
     */
    fun loadUpcomingAppointments() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true)
            
            when (val result = repository.getAppointments(upcoming = true)) {
                is Result.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        appointments = result.data,
                        hasLoaded = true
                    )
                }
                is Result.Error -> {
                    uiState = uiState.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }
    
    /**
     * Get time slots for a doctor on a specific date
     */
    fun loadTimeSlots(
        doctorId: String,
        date: String,
        fallbackDates: List<String> = emptyList()
    ) {
        slotLookupJob?.cancel()
        slotLookupJob = viewModelScope.launch {
            uiState = uiState.copy(
                isLoadingSlots = true,
                timeSlots = emptyList(),
                error = null,
                nextAvailableSuggestion = null,
                isSearchingNextAvailable = false
            )

            when (val result = repository.getDoctorTimeSlots(doctorId, date)) {
                is Result.Success -> {
                    val slots = result.data
                    val hasAvailableSlots = slots.any { it.isAvailable }
                    uiState = uiState.copy(
                        isLoadingSlots = false,
                        timeSlots = slots
                    )
                    if (!hasAvailableSlots && fallbackDates.isNotEmpty()) {
                        scanNextAvailableDate(doctorId, fallbackDates)
                    }
                }
                is Result.Error -> {
                    uiState = uiState.copy(
                        isLoadingSlots = false,
                        timeSlots = emptyList(),
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    private suspend fun scanNextAvailableDate(
        doctorId: String,
        fallbackDates: List<String>
    ) {
        uiState = uiState.copy(
            isSearchingNextAvailable = true,
            nextAvailableSuggestion = null
        )

        var suggestion: NextAvailableSlotSuggestion? = null
        for (candidateDate in fallbackDates) {
            when (val result = repository.getDoctorTimeSlots(doctorId, candidateDate)) {
                is Result.Success -> {
                    val availableSlots = result.data.filter { it.isAvailable }
                    if (availableSlots.isNotEmpty()) {
                        suggestion = NextAvailableSlotSuggestion(
                            date = candidateDate,
                            availableSlotCount = availableSlots.size,
                            firstAvailableSlot = availableSlots.first().time
                        )
                        break
                    }
                }
                is Result.Error -> {}
                is Result.Loading -> {}
            }
        }

        uiState = uiState.copy(
            isSearchingNextAvailable = false,
            nextAvailableSuggestion = suggestion
        )
    }
    
    /**
     * Book a new appointment
     */
    fun bookAppointment(
        doctorId: String,
        date: String,
        timeSlot: String,
        type: String,
        notes: String? = null,
        hospitalId: String? = null,
        clinicId: String? = null
    ) {
        viewModelScope.launch {
            uiState = uiState.copy(isBooking = true)
            
             when (val result = repository.createAppointment(doctorId, date, timeSlot, type, notes, hospitalId, clinicId)) {
                 is Result.Success -> {
                     uiState = uiState.copy(
                         isBooking = false,
                         bookingSuccess = true,
                         newAppointment = result.data
                     )
                     // Reload appointments
                     loadAppointments()
                 }
                 is Result.Error -> {
                     uiState = uiState.copy(isBooking = false, error = result.message)
                 }
                 is Result.Loading -> {}
             }
        }
    }
    
    /**
     * Cancel an appointment
     */
    fun cancelAppointment(appointmentId: String, reason: String? = null) {
        viewModelScope.launch {
            uiState = uiState.copy(isCancelling = true)
            
             when (val result = repository.cancelAppointment(appointmentId, reason)) {
                 is Result.Success -> {
                     uiState = uiState.copy(isCancelling = false, cancelSuccess = true)
                     // Reload appointments
                     loadAppointments()
                 }
                 is Result.Error -> {
                     uiState = uiState.copy(isCancelling = false, error = result.message)
                 }
                 is Result.Loading -> {}
             }
        }
    }
    
    /**
     * Clear error message
     */
    fun clearError() {
        uiState = uiState.copy(error = null)
    }

    fun resetSlotSelectionState() {
        slotLookupJob?.cancel()
        uiState = uiState.copy(
            isLoadingSlots = false,
            timeSlots = emptyList(),
            error = null,
            nextAvailableSuggestion = null,
            isSearchingNextAvailable = false
        )
    }
    
    /**
     * Reset booking state
     */
    fun resetBookingState() {
        uiState = uiState.copy(bookingSuccess = false, newAppointment = null)
    }

    /**
     * Reset cancel state after UI has consumed the event
     */
    fun resetCancelState() {
        uiState = uiState.copy(cancelSuccess = false)
    }
}

/**
 * UI State for appointments
 */
data class AppointmentUiState(
    val isLoading: Boolean = false,
    val isLoadingSlots: Boolean = false,
    val isSearchingNextAvailable: Boolean = false,
    val isBooking: Boolean = false,
    val isCancelling: Boolean = false,
    val hasLoaded: Boolean = false,
    val appointments: List<Appointment> = emptyList(),
    val timeSlots: List<TimeSlot> = emptyList(),
    val nextAvailableSuggestion: NextAvailableSlotSuggestion? = null,
    val bookingSuccess: Boolean = false,
    val cancelSuccess: Boolean = false,
    val newAppointment: Appointment? = null,
    val error: String? = null
)
