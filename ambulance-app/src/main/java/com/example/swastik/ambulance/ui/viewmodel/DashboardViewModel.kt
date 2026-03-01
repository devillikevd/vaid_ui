package com.example.swastik.ambulance.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.ambulance.data.remote.SocketManager
import com.example.swastik.ambulance.data.remote.dto.DashboardStats
import com.example.swastik.ambulance.data.remote.dto.EmergencyDto
import com.example.swastik.ambulance.data.remote.dto.VehicleDto
import com.example.swastik.ambulance.data.repository.AmbulanceRepository
import com.example.swastik.ambulance.service.EmergencyAlertManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = false,
    val stats: DashboardStats? = null,
    val activeEmergencies: List<EmergencyDto> = emptyList(),
    val vehicles: List<VehicleDto> = emptyList(),
    val error: String? = null
)

data class EmergencyListState(
    val isLoading: Boolean = false,
    val emergencies: List<EmergencyDto> = emptyList(),
    val error: String? = null
)

data class EmergencyDetailState(
    val isLoading: Boolean = false,
    val emergency: EmergencyDto? = null,
    val error: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val ambulanceRepository: AmbulanceRepository,
    private val socketManager: SocketManager,
    private val emergencyAlertManager: EmergencyAlertManager
) : ViewModel() {

    private val _dashboardState = MutableStateFlow(DashboardUiState())
    val dashboardState: StateFlow<DashboardUiState> = _dashboardState.asStateFlow()

    private val _emergencyListState = MutableStateFlow(EmergencyListState())
    val emergencyListState: StateFlow<EmergencyListState> = _emergencyListState.asStateFlow()

    private val _emergencyDetailState = MutableStateFlow(EmergencyDetailState())
    val emergencyDetailState: StateFlow<EmergencyDetailState> = _emergencyDetailState.asStateFlow()

    /** One-shot user-visible messages (Snackbar / Toast) */
    private val _userMessage = MutableSharedFlow<String>(extraBufferCapacity = 5)
    val userMessage: SharedFlow<String> = _userMessage.asSharedFlow()

    /** Emitted when socket auth fails — triggers logout in NavGraph */
    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired: SharedFlow<Unit> = _sessionExpired.asSharedFlow()

    /** Emitted when patient sends updated GPS location during active emergency */
    private val _patientLocationUpdate = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val patientLocationUpdate: SharedFlow<String?> = _patientLocationUpdate.asSharedFlow()

    init {
        loadDashboard()
        observeSocketEvents()
    }

    // ── Socket event observation ─────────────────────────────
    private fun observeSocketEvents() {
        // New emergency assignment → alert + auto-refresh dashboard
        viewModelScope.launch {
            socketManager.newRequestFlow.collect {
                emergencyAlertManager.triggerEmergencyAlert()
                _userMessage.tryEmit("🚨 New emergency request!")
                loadDashboard()
            }
        }
        // SOS broadcast — a nearby patient needs help
        viewModelScope.launch {
            socketManager.broadcastRequestFlow.collect {
                emergencyAlertManager.triggerEmergencyAlert()
                _userMessage.tryEmit("📡 SOS Broadcast — nearby patient needs help!")
                loadDashboard()
            }
        }
        // Another driver accepted the request — refresh to remove it
        viewModelScope.launch {
            socketManager.requestTakenFlow.collect {
                _userMessage.tryEmit("Request was accepted by another driver")
                loadDashboard()
            }
        }
        // Status update from elsewhere → refresh
        viewModelScope.launch {
            socketManager.requestUpdatedFlow.collect {
                loadDashboard()
            }
        }
        // Cancellation → refresh
        viewModelScope.launch {
            socketManager.requestCancelledFlow.collect {
                _userMessage.tryEmit("Emergency request was cancelled")
                loadDashboard()
            }
        }
        // Session expired from socket auth error → trigger logout
        viewModelScope.launch {
            socketManager.sessionExpiredFlow.collect {
                _sessionExpired.tryEmit(Unit)
            }
        }
        // Patient location update — patient moved during active emergency, update pickup
        viewModelScope.launch {
            socketManager.patientLocationFlow.collect { data ->
                _patientLocationUpdate.tryEmit(data)
                _userMessage.tryEmit("📍 Patient location updated")
            }
        }
    }

    // ── Dashboard ────────────────────────────────────────────

    fun loadDashboard() {
        viewModelScope.launch {
            _dashboardState.value = _dashboardState.value.copy(isLoading = true, error = null)
            val result = ambulanceRepository.getDashboard()
            result.fold(
                onSuccess = { dashboard ->
                    _dashboardState.value = DashboardUiState(
                        stats = dashboard.stats,
                        activeEmergencies = dashboard.activeEmergencies ?: emptyList(),
                        vehicles = dashboard.vehicles ?: emptyList()
                    )
                },
                onFailure = { e ->
                    _dashboardState.value = _dashboardState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
            )
        }
    }

    // ── Emergency History ────────────────────────────────────

    fun loadEmergencyHistory(status: String? = null) {
        viewModelScope.launch {
            _emergencyListState.value = _emergencyListState.value.copy(isLoading = true)
            val result = ambulanceRepository.getEmergencyHistory(status = status)
            result.fold(
                onSuccess = { list ->
                    // Client-side filtering as safety net (in case backend ignores status param)
                    val filtered = if (status == null || status == "all") {
                        list
                    } else {
                        list.filter { e ->
                            when (status) {
                                "active" -> e.status in listOf("pending", "requested", "broadcasting", "assigned", "accepted", "dispatched", "en_route", "arrived", "picked_up", "en_route_hospital", "arrived_hospital")
                                "completed" -> e.status in listOf("completed", "cancelled", "timeout", "no_ambulance")
                                else -> true
                            }
                        }
                    }
                    _emergencyListState.value = EmergencyListState(emergencies = filtered)
                },
                onFailure = { e ->
                    _emergencyListState.value = EmergencyListState(error = e.message)
                }
            )
        }
    }

    // ── Actions ──────────────────────────────────────────────

    fun acceptEmergency(requestId: String, vehicleId: String? = null) {
        emergencyAlertManager.stopAlert()
        viewModelScope.launch {
            val result = ambulanceRepository.acceptRequest(requestId, vehicleId)
            result.fold(
                onSuccess = {
                    _userMessage.tryEmit("✅ Emergency accepted — en route!")
                    loadDashboard()
                },
                onFailure = { e ->
                    _userMessage.tryEmit("❌ Failed to accept: ${e.message}")
                }
            )
        }
    }

    fun rejectEmergency(requestId: String) {
        emergencyAlertManager.stopAlert()
        viewModelScope.launch {
            val result = ambulanceRepository.rejectRequest(requestId)
            result.fold(
                onSuccess = {
                    _userMessage.tryEmit("Request declined")
                    loadDashboard()
                },
                onFailure = { e ->
                    _userMessage.tryEmit("❌ Failed to decline: ${e.message}")
                }
            )
        }
    }

    fun updateEmergencyStatus(requestId: String, status: String) {
        // Route "accept" to the dedicated accept endpoint (POST /:requestId/accept)
        if (status == "accept" || status == "accepted") {
            acceptEmergency(requestId)
            return
        }
        viewModelScope.launch {
            val result = ambulanceRepository.updateRequestStatus(requestId, status)
            result.fold(
                onSuccess = {
                    _userMessage.tryEmit("Status updated to ${status.replace("_", " ")}")
                    loadDashboard()
                    // Also refresh detail if loaded
                    if (_emergencyDetailState.value.emergency?.id == requestId) {
                        loadEmergencyDetail(requestId)
                    }
                },
                onFailure = { e ->
                    _userMessage.tryEmit("❌ Failed to update status: ${e.message}")
                }
            )
        }
    }

    // ── Emergency Detail ─────────────────────────────────────

    fun loadEmergencyDetail(requestId: String) {
        viewModelScope.launch {
            _emergencyDetailState.value = EmergencyDetailState(isLoading = true)
            val result = ambulanceRepository.getEmergencyById(requestId)
            result.fold(
                onSuccess = { emergency ->
                    _emergencyDetailState.value = EmergencyDetailState(emergency = emergency)
                },
                onFailure = { e ->
                    _emergencyDetailState.value = EmergencyDetailState(error = e.message)
                }
            )
        }
    }
}
