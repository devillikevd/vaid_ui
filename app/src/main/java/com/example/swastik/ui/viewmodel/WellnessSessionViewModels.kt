package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.BookWellnessSessionRequest
import com.example.swastik.data.remote.dto.WellnessCoachDetailDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessSessionDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.WellnessRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ==================== Coach Detail ViewModel ====================

data class CoachDetailUiState(
    val isLoading: Boolean = true,
    val coach: WellnessCoachDetailDto? = null,
    val error: String? = null
)

@HiltViewModel
class WellnessCoachDetailViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CoachDetailUiState())
    val uiState: StateFlow<CoachDetailUiState> = _uiState.asStateFlow()

    fun loadCoachDetail(coachId: String) {
        viewModelScope.launch {
            _uiState.value = CoachDetailUiState(isLoading = true)
            when (val result = wellnessRepository.getCoachDetail(coachId)) {
                is Result.Success -> _uiState.value = CoachDetailUiState(isLoading = false, coach = result.data)
                is Result.Error -> _uiState.value = CoachDetailUiState(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }
}

// ==================== Session Booking ViewModel ====================

data class SessionBookingUiState(
    val isBooking: Boolean = false,
    val bookedSession: WellnessSessionDto? = null,
    val error: String? = null
)

@HiltViewModel
class WellnessSessionBookingViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _coachState = MutableStateFlow(CoachDetailUiState())
    val coachState: StateFlow<CoachDetailUiState> = _coachState.asStateFlow()

    private val _bookingState = MutableStateFlow(SessionBookingUiState())
    val bookingState: StateFlow<SessionBookingUiState> = _bookingState.asStateFlow()

    fun loadCoach(coachId: String) {
        viewModelScope.launch {
            _coachState.value = CoachDetailUiState(isLoading = true)
            when (val result = wellnessRepository.getCoachDetail(coachId)) {
                is Result.Success -> _coachState.value = CoachDetailUiState(isLoading = false, coach = result.data)
                is Result.Error -> _coachState.value = CoachDetailUiState(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun bookSession(request: BookWellnessSessionRequest) {
        viewModelScope.launch {
            _bookingState.value = SessionBookingUiState(isBooking = true)
            when (val result = wellnessRepository.bookWellnessSession(request)) {
                is Result.Success -> _bookingState.value = SessionBookingUiState(isBooking = false, bookedSession = result.data)
                is Result.Error -> _bookingState.value = SessionBookingUiState(isBooking = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearBookingState() {
        _bookingState.value = SessionBookingUiState()
    }
}

// ==================== My Sessions ViewModel ====================

data class WellnessSessionsUiState(
    val isLoading: Boolean = true,
    val sessions: List<WellnessSessionDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class WellnessSessionsViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WellnessSessionsUiState())
    val uiState: StateFlow<WellnessSessionsUiState> = _uiState.asStateFlow()

    fun loadSessions(status: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getWellnessSessions(status)) {
                is Result.Success -> {
                    _uiState.value = WellnessSessionsUiState(
                        isLoading = false,
                        sessions = result.data,
                        error = null
                    )
                }
                is Result.Error -> {
                    _uiState.value = WellnessSessionsUiState(
                        isLoading = false,
                        sessions = emptyList(),
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
}
