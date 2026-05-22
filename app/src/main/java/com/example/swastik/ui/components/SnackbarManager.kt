package com.example.swastik.ui.components

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Global Snackbar Manager for handling app-wide error, success, and info messages.
 * This ensures that Snackbars are queued and displayed sequentially without overlapping.
 */
object SnackbarManager {

    val snackbarHostState = SnackbarHostState()

    private val _messages = MutableSharedFlow<SnackbarMessage>(extraBufferCapacity = 10)
    val messages = _messages.asSharedFlow()

    fun showMessage(message: String, actionLabel: String? = null, duration: SnackbarDuration = SnackbarDuration.Short) {
        _messages.tryEmit(SnackbarMessage(message, actionLabel, duration))
    }
    
    fun showError(error: String) {
        showMessage(message = error, duration = SnackbarDuration.Long)
    }

    suspend fun collectMessages() {
        messages.collect { message ->
            snackbarHostState.showSnackbar(
                message = message.message,
                actionLabel = message.actionLabel,
                duration = message.duration
            )
        }
    }
}

data class SnackbarMessage(
    val message: String,
    val actionLabel: String? = null,
    val duration: SnackbarDuration = SnackbarDuration.Short
)
