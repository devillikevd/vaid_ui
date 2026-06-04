package com.example.swastik.ambulance.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.dto.InviteDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HospitalInvitesUiState(
    val invites: List<InviteDto> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val actionLoadingId: String? = null
)

@HiltViewModel
class HospitalInvitesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(HospitalInvitesUiState())
    val uiState: StateFlow<HospitalInvitesUiState> = _uiState.asStateFlow()

    init {
        loadInvites()
    }

    fun loadInvites() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = apiService.getPendingInvites()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            invites = body.data ?: emptyList()
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = body?.message ?: "Failed to load invites"
                        )
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Server error: ${response.code()}"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Network error"
                )
            }
        }
    }

    fun acceptInvite(token: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(actionLoadingId = token, error = null)
            try {
                val response = apiService.acceptInvite(token)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadInvites() // Refresh list
                } else {
                    _uiState.value = _uiState.value.copy(
                        actionLoadingId = null,
                        error = response.body()?.message ?: "Failed to accept invite"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    actionLoadingId = null,
                    error = e.message ?: "Network error"
                )
            }
        }
    }

    fun rejectInvite(token: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(actionLoadingId = token, error = null)
            try {
                val response = apiService.rejectInvite(token)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadInvites() // Refresh list
                } else {
                    _uiState.value = _uiState.value.copy(
                        actionLoadingId = null,
                        error = response.body()?.message ?: "Failed to reject invite"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    actionLoadingId = null,
                    error = e.message ?: "Network error"
                )
            }
        }
    }
}
