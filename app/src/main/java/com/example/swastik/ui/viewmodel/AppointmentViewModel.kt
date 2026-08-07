package com.example.swastik.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.example.swastik.data.model.Appointment
import com.example.swastik.data.model.TimeSlot
import com.example.swastik.data.repository.AppointmentRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.paging.AppointmentPagingSource
import com.example.swastik.data.remote.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest
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
    private val repository: AppointmentRepository,
    private val socketManager: SocketManager
) : ViewModel() {
    
    var uiState by mutableStateOf(AppointmentUiState())
        private set

    private var slotLookupJob: Job? = null
    
    init {
        loadAppointments()
        listenForSlotUpdates()
    }
    
    fun getPagedAppointments(status: String? = null): Flow<PagingData<Appointment>> {
        return Pager(
            config = PagingConfig(pageSize = 20, enablePlaceholders = false),
            pagingSourceFactory = { AppointmentPagingSource(repository, status) }
        ).flow.cachedIn(viewModelScope)
    }
    
    private fun listenForSlotUpdates() {
        viewModelScope.launch {
            socketManager.doctorSlotsUpdates.collectLatest { update ->
                // When someone books a slot, it triggers this update
                val date = update.optString("appointment_date") ?: update.optString("date")
                val timeSlotStr = update.optString("time_slot") ?: update.optString("timeSlot")
                
                // If we are currently viewing slots for this date, mark it as unavailable
                val currentSlots = uiState.timeSlots
                if (currentSlots.isNotEmpty()) {
                    val updatedSlots = currentSlots.map { 
                        if (it.time == timeSlotStr) it.copy(isAvailable = false) else it 
                    }
                    uiState = uiState.copy(timeSlots = updatedSlots)
                }
            }
        }
    }
    
    /**
     * Load all appointments
     */
    fun loadAppointments(status: String? = null) {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true)
            
            when (val result = repository.getAppointments(status = status)) {
                is Result.Success -> {
                    // Sort appointments: scheduled/confirmed first (soonest first), then others (most recent first)
                    val sortedAppointments = result.data.sortedWith { a, b ->
                        val aStatus = a.status.lowercase()
                        val bStatus = b.status.lowercase()
                        val aIsUpcoming = aStatus == "scheduled" || aStatus == "confirmed" || aStatus == "in_progress"
                        val bIsUpcoming = bStatus == "scheduled" || bStatus == "confirmed" || bStatus == "in_progress"
                        
                        when {
                            aIsUpcoming && bIsUpcoming -> {
                                // Soonest first for upcoming
                                val dateCompare = a.date.compareTo(b.date)
                                if (dateCompare != 0) dateCompare else a.timeSlot.compareTo(b.timeSlot)
                            }
                            aIsUpcoming -> -1
                            bIsUpcoming -> 1
                            else -> {
                                // Latest first for history (Completed/Cancelled)
                                val dateCompare = b.date.compareTo(a.date)
                                if (dateCompare != 0) dateCompare else b.timeSlot.compareTo(a.timeSlot)
                            }
                        }
                    }
                    uiState = uiState.copy(
                        isLoading = false,
                        appointments = sortedAppointments,
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
                    // Sort by date ascending (soonest first) for upcoming list
                    val sortedAppointments = result.data.sortedBy { it.date }
                    uiState = uiState.copy(
                        isLoading = false,
                        appointments = sortedAppointments,
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
    
    private var currentSubscribedDoctorId: String? = null

    /**
     * Get time slots for a doctor on a specific date
     */
    fun loadTimeSlots(
        doctorId: String,
        date: String,
        fallbackDates: List<String> = emptyList(),
        type: String? = null
    ) {
        if (currentSubscribedDoctorId != doctorId) {
            currentSubscribedDoctorId?.let { socketManager.unsubscribeFromDoctorSlots(it) }
            socketManager.subscribeToDoctorSlots(doctorId)
            currentSubscribedDoctorId = doctorId
        }
        
        slotLookupJob?.cancel()
        slotLookupJob = viewModelScope.launch {
            uiState = uiState.copy(
                isLoadingSlots = true,
                timeSlots = emptyList(),
                error = null,
                nextAvailableSuggestion = null,
                isSearchingNextAvailable = false
            )

            when (val result = repository.getDoctorTimeSlots(doctorId, date, type)) {
                is Result.Success -> {
                    val slots = result.data
                    val hasAvailableSlots = slots.any { it.isAvailable }
                    uiState = uiState.copy(
                        isLoadingSlots = false,
                        timeSlots = slots
                    )
                    if (!hasAvailableSlots && fallbackDates.isNotEmpty()) {
                        scanNextAvailableDate(doctorId, fallbackDates, type)
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
        fallbackDates: List<String>,
        type: String? = null
    ) {
        uiState = uiState.copy(
            isSearchingNextAvailable = true,
            nextAvailableSuggestion = null
        )

        var suggestion: NextAvailableSlotSuggestion? = null
        for (candidateDate in fallbackDates) {
            when (val result = repository.getDoctorTimeSlots(doctorId, candidateDate, type)) {
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
        clinicId: String? = null,
        reason: String? = null,
        symptoms: List<String>? = null,
        patientNotes: String? = null
    ) {
        viewModelScope.launch {
            uiState = uiState.copy(isBooking = true)
            
             when (val result = repository.createAppointment(doctorId, date, timeSlot, type, notes, hospitalId, clinicId, reason, symptoms, patientNotes)) {
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

    override fun onCleared() {
        super.onCleared()
        currentSubscribedDoctorId?.let { socketManager.unsubscribeFromDoctorSlots(it) }
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

    fun submitReview(doctorId: String, appointmentId: String?, rating: Int, comment: String?, onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            // Using isBooking as a proxy for a loading state to avoid adding more fields to UI state
            uiState = uiState.copy(isBooking = true) 
            val result = repository.submitDoctorReview(doctorId, appointmentId, rating, comment)
            when (result) {
                is Result.Success -> {
                    uiState = uiState.copy(isBooking = false)
                    onComplete()
                }
                is Result.Error -> {
                    uiState = uiState.copy(isBooking = false, error = result.message)
                }
                else -> {}
            }
        }
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
