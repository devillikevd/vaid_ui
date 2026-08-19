package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.utils.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EmergencyNetworkUiState(
    val profile: FirstResponderProfile? = null,
    val isRegistered: Boolean = false,
    val isOnDuty: Boolean = true,
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val nearbyBroadcasts: List<EmergencyBroadcastDto> = emptyList(),
    val activeBroadcast: EmergencyBroadcastDto? = null,
    val isEnRoute: Boolean = false,
    val hasArrivedOnScene: Boolean = false,
    val isAmbulanceDispatched: Boolean = false,
    val cprMetronomeActive: Boolean = false,
    val cprBpm: Int = 110 // AHA standard 100-120 BPM
)

@HiltViewModel
class EmergencyNetworkViewModel @Inject constructor(
    private val emergencyRepository: EmergencyRepository,
    private val locationHelper: LocationHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow(EmergencyNetworkUiState())
    val uiState: StateFlow<EmergencyNetworkUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = emergencyRepository.getMyResponderProfile()) {
                is Result.Success -> {
                    val p = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = p,
                            isRegistered = p != null,
                            isOnDuty = p?.isOnDuty ?: true
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    fun registerResponder(
        tier: String,
        skills: List<String>,
        registrationNo: String?,
        councilName: String?,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val location = try { locationHelper.getLastLocation() } catch (_: Exception) { null }
            val request = RegisterResponderRequest(
                tier = tier,
                skills = skills,
                registrationNo = registrationNo,
                councilName = councilName,
                isOnDuty = true,
                latitude = location?.latitude ?: 28.6139,
                longitude = location?.longitude ?: 77.2090
            )

            when (val result = emergencyRepository.registerFirstResponder(request)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = result.data,
                            isRegistered = true,
                            isOnDuty = true,
                            successMessage = "Successfully registered as a Verified First Responder!"
                        )
                    }
                    onSuccess()
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    fun toggleDutyStatus(isOnDuty: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isOnDuty = isOnDuty) }
            emergencyRepository.updateDutyStatus(isOnDuty)
        }
    }

    fun loadNearbyBroadcasts() {
        viewModelScope.launch {
            val loc = try { locationHelper.getLastLocation() } catch (_: Exception) { null }
            when (val result = emergencyRepository.getNearbyEmergencyBroadcasts(loc?.latitude, loc?.longitude, 3000)) {
                is Result.Success -> {
                    _uiState.update { it.copy(nearbyBroadcasts = result.data) }
                }
                else -> {}
            }
        }
    }

    fun loadBroadcast(broadcastId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = emergencyRepository.getEmergencyBroadcast(broadcastId)) {
                is Result.Success -> {
                    _uiState.update { it.copy(isLoading = false, activeBroadcast = result.data) }
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    fun acceptBroadcast(broadcastId: String, onAccepted: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = emergencyRepository.acceptEmergencyBroadcast(broadcastId)) {
                is Result.Success -> {
                    _uiState.update { it.copy(isLoading = false, isEnRoute = true) }
                    loadBroadcast(broadcastId)
                    onAccepted()
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    fun markArrivedOnScene(broadcastId: String, notes: String = "Arrived on scene.") {
        viewModelScope.launch {
            emergencyRepository.updateAssignmentStatus(broadcastId, "ARRIVED", notes)
            _uiState.update { it.copy(hasArrivedOnScene = true) }
        }
    }

    fun dispatchAmbulance(broadcastId: String, triageLevel: String = "RED", notes: String = "", onDispatched: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = emergencyRepository.dispatchVerifiedAmbulance(broadcastId, triageLevel, notes)) {
                is Result.Success -> {
                    _uiState.update { it.copy(isLoading = false, isAmbulanceDispatched = true) }
                    onDispatched()
                }
                is Result.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                else -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
            }
        }
    }

    fun toggleCprMetronome() {
        _uiState.update { it.copy(cprMetronomeActive = !it.cprMetronomeActive) }
    }
}
