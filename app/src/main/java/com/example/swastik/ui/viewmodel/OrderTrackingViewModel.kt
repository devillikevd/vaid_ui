package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint

data class OrderTrackingState(
    val isLoading: Boolean = false,
    val agentLocation: GeoPoint? = null,
    val destinationLocation: GeoPoint? = null,
    val trackingToken: String = "",
    val error: String? = null
)

@HiltViewModel
class OrderTrackingViewModel @Inject constructor(
    private val socketManager: SocketManager
) : ViewModel() {

    private val _state = MutableStateFlow(OrderTrackingState())
    val state: StateFlow<OrderTrackingState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            socketManager.agentLocationUpdates.collect { (lat, lng) ->
                _state.update { it.copy(agentLocation = GeoPoint(lat, lng)) }
            }
        }
    }

    fun startTracking(token: String, destLat: Double, destLng: Double) {
        _state.update { it.copy(
            trackingToken = token,
            destinationLocation = GeoPoint(destLat, destLng)
        )}
        socketManager.trackAgent(token)
    }

    override fun onCleared() {
        super.onCleared()
        val token = _state.value.trackingToken
        if (token.isNotEmpty()) {
            socketManager.untrackAgent(token)
        }
    }
}
