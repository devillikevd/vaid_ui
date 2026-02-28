package com.example.swastik.data.sync

import android.util.Log
import com.example.swastik.data.local.db.PendingSyncAction
import com.example.swastik.data.local.db.SyncQueueDao
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.CancelRequest
import com.example.swastik.data.remote.dto.CreateAppointmentRequest
import com.example.swastik.data.remote.dto.RescheduleRequest
import com.example.swastik.utils.NetworkObserver
import com.google.gson.Gson
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * SyncManager — Replays queued write operations when network becomes available.
 *
 * Usage:
 *   1. When a write operation fails due to no connectivity, the repository
 *      calls syncQueueDao.enqueue(...) to persist the action.
 *   2. SyncManager observes NetworkObserver.observe() and automatically
 *      drains the queue when connectivity is restored.
 *   3. Each action is retried up to MAX_RETRIES times.
 */
@Singleton
class SyncManager @Inject constructor(
    private val syncQueueDao: SyncQueueDao,
    private val apiService: ApiService,
    private val networkObserver: NetworkObserver
) {
    companion object {
        private const val TAG = "SyncManager"
        private const val MAX_RETRIES = 5
    }

    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var syncJob: Job? = null

    /** Pending action count observable */
    val pendingCount: Flow<Int> = syncQueueDao.getPendingCount()

    /**
     * Start observing network changes. Call once from Application or Activity.
     */
    fun startObserving() {
        syncJob?.cancel()
        syncJob = scope.launch {
            networkObserver.observe().collect { isConnected ->
                if (isConnected) {
                    Log.d(TAG, "Network available — draining sync queue")
                    drainQueue()
                }
            }
        }
    }

    /**
     * Manually trigger a queue drain (e.g., on app foreground).
     */
    suspend fun drainQueue() {
        val pending = syncQueueDao.getPendingActions()
        if (pending.isEmpty()) return

        Log.d(TAG, "Draining ${pending.size} pending actions")

        for (action in pending) {
            if (!networkObserver.isConnected) {
                Log.d(TAG, "Network lost during drain — stopping")
                break
            }

            if (action.retryCount >= MAX_RETRIES) {
                Log.w(TAG, "Action ${action.id} exceeded max retries, skipping")
                continue
            }

            try {
                syncQueueDao.markInProgress(action.id)
                executeAction(action)
                syncQueueDao.markCompleted(action.id)
                Log.d(TAG, "Action ${action.id} (${action.actionType}) synced successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Action ${action.id} failed: ${e.message}")
                syncQueueDao.markFailed(action.id, e.message ?: "Unknown error")
            }

            // Small delay between actions to avoid hammering the server
            delay(500)
        }

        // Clean up completed actions
        syncQueueDao.clearCompleted()
    }

    /**
     * Execute a single queued action against the API.
     */
    private suspend fun executeAction(action: PendingSyncAction) {
        when (action.actionType) {
            "book_appointment" -> {
                val request = gson.fromJson(action.payload, CreateAppointmentRequest::class.java)
                val response = apiService.bookAppointment(request)
                if (!response.isSuccessful || response.body()?.success != true) {
                    throw Exception(response.body()?.message ?: "Booking failed (${response.code()})")
                }
            }

            "cancel_appointment" -> {
                val data = gson.fromJson(action.payload, CancelActionPayload::class.java)
                val request = CancelRequest(reason = data.reason)
                val response = apiService.cancelAppointment(data.appointmentId, request)
                if (!response.isSuccessful || response.body()?.success != true) {
                    throw Exception(response.body()?.message ?: "Cancellation failed (${response.code()})")
                }
            }

            "reschedule_appointment" -> {
                val data = gson.fromJson(action.payload, RescheduleActionPayload::class.java)
                val request = RescheduleRequest(
                    date = data.date,
                    timeSlot = data.timeSlot,
                    reason = data.reason
                )
                val response = apiService.rescheduleAppointment(data.appointmentId, request)
                if (!response.isSuccessful || response.body()?.success != true) {
                    throw Exception(response.body()?.message ?: "Reschedule failed (${response.code()})")
                }
            }

            else -> {
                Log.w(TAG, "Unknown action type: ${action.actionType}")
                throw Exception("Unknown action type: ${action.actionType}")
            }
        }
    }

    fun stop() {
        syncJob?.cancel()
        syncJob = null
    }
}

// ==================== Payload Models for Deserialization ====================

data class CancelActionPayload(
    val appointmentId: String,
    val reason: String
)

data class RescheduleActionPayload(
    val appointmentId: String,
    val date: String,
    val timeSlot: String,
    val reason: String? = null
)
