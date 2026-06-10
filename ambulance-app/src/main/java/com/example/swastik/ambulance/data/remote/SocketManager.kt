package com.example.swastik.ambulance.data.remote

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.OkHttpClient
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton
import javax.inject.Named
import com.example.swastik.ambulance.utils.CrashReporter

/**
 * Socket.IO manager for ambulance real-time events.
 * Sends continuous GPS location updates to the backend
 * so the patient app can track the ambulance in real-time.
 *
 * Exposes [SharedFlow]s so ViewModels can observe events reactively.
 */
@Singleton
class SocketManager @Inject constructor(
    @Named("socket") private val okHttpClient: OkHttpClient
) {

    private var socket: Socket? = null
    private var userId: String? = null
    /** Active request ID for location routing — set when driver accepts a request */
    // Fix #28: @Volatile ensures thread-safe visibility across threads
    @Volatile
    var activeRequestId: String? = null
        private set

    val isConnected: Boolean get() = socket?.connected() == true

    // ── Reactive event streams (observed by DashboardViewModel) ─────
    private val _newRequestFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val newRequestFlow: SharedFlow<String?> = _newRequestFlow.asSharedFlow()

    private val _requestUpdatedFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val requestUpdatedFlow: SharedFlow<String?> = _requestUpdatedFlow.asSharedFlow()

    private val _requestCancelledFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val requestCancelledFlow: SharedFlow<String?> = _requestCancelledFlow.asSharedFlow()

    /** SOS broadcast — a nearby patient needs help, driver can accept/reject */
    private val _broadcastRequestFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val broadcastRequestFlow: SharedFlow<String?> = _broadcastRequestFlow.asSharedFlow()

    /** Another driver accepted the broadcast request — stop showing it */
    private val _requestTakenFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val requestTakenFlow: SharedFlow<String?> = _requestTakenFlow.asSharedFlow()

    /** Whether the session has been invalidated (token refresh failed) */
    private val _sessionExpiredFlow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpiredFlow: SharedFlow<Unit> = _sessionExpiredFlow.asSharedFlow()

    /** Patient GPS location update — patient moved during active emergency */
    private val _patientLocationFlow = MutableSharedFlow<String?>(extraBufferCapacity = 10)
    val patientLocationFlow: SharedFlow<String?> = _patientLocationFlow.asSharedFlow()

    /** Emits on successful socket connection to trigger forced sync. */
    private val _connectedFlow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val connectedFlow: SharedFlow<Unit> = _connectedFlow.asSharedFlow()

    /** Callback invoked on (re)connect — allows replaying queued actions */
    var onConnectCallback: (() -> Unit)? = null

    fun notifySessionExpired() {
        _sessionExpiredFlow.tryEmit(Unit)
    }

    fun connect(token: String, id: String) {
        if (isConnected) return
        userId = id

        try {
            val options = IO.Options().apply {
                forceNew = true
                reconnection = true
                reconnectionAttempts = 50 // Fix #30: Limit reconnection attempts instead of infinite
                reconnectionDelay = 1000
                reconnectionDelayMax = 30000 // Exponential backoff up to 30s
                timeout = 10000
                auth = mapOf("token" to token)
                callFactory = okHttpClient
                webSocketFactory = okHttpClient
            }

            socket = IO.socket(ApiConfig.SOCKET_URL, options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Socket connected")
                CrashReporter.log("Socket connected")
                socket?.emit("subscribe:notifications", JSONObject().put("userId", userId))
                // Re-join dispatch room on reconnect so driver keeps getting broadcasts
                socket?.emit("ambulance:join-dispatch", JSONObject())
                // Re-join active request tracking room on reconnect
                activeRequestId?.let { reqId -> joinTrackingRoom(reqId) }
                // Replay any queued offline actions
                onConnectCallback?.invoke()
                _connectedFlow.tryEmit(Unit)
            }

            socket?.on(Socket.EVENT_DISCONNECT) { args ->
                Log.d(TAG, "Socket disconnected: ${args.firstOrNull()}")
                CrashReporter.log("Socket disconnected: ${args.firstOrNull()}")
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Socket connection error: ${args.firstOrNull()}")
                CrashReporter.log("Socket connect error: ${args.firstOrNull()}")
                // If connect error is auth-related, emit session expired
                val errorMsg = args.firstOrNull()?.toString() ?: ""
                if (errorMsg.contains("unauthorized", ignoreCase = true)
                    || errorMsg.contains("jwt", ignoreCase = true)
                    || errorMsg.contains("token", ignoreCase = true)
                    || errorMsg.contains("401")) {
                    Log.w(TAG, "Socket auth failed; keeping session for HTTP token refresh")
                }
            }

            // Listen for new emergency assignments
            socket?.on("ambulance:assigned") { args ->
                Log.d(TAG, "New emergency assignment received: ${summarizePayload(args.firstOrNull())}")
                _newRequestFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // Listen for SOS broadcast — nearby patient needs help
            socket?.on("ambulance:broadcast") { args ->
                Log.d(TAG, "SOS broadcast received: ${summarizePayload(args.firstOrNull())}")
                _broadcastRequestFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // Listen for general SOS broadcast on the dispatch room
            socket?.on("emergency:new") { args ->
                Log.d(TAG, "General emergency:new received: ${summarizePayload(args.firstOrNull())}")
                _broadcastRequestFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // Listen for request-taken — another driver accepted the broadcast
            socket?.on("ambulance:request-taken") { args ->
                Log.d(TAG, "Broadcast request taken: ${summarizePayload(args.firstOrNull())}")
                _requestTakenFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // Listen for request status changes
            socket?.on("ambulance:status-update") { args ->
                Log.d(TAG, "Request status update received: ${summarizePayload(args.firstOrNull())}")
                _requestUpdatedFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // BUG-04 Fix: Parse notification type before routing — only cancellation/timeout
            // notifications should go to requestCancelledFlow; others are just general notifications
            socket?.on("notification:new") { args ->
                Log.d(TAG, "Notification received")
                val payload = args.firstOrNull()?.toString()
                try {
                    val json = payload?.let { JSONObject(it) }
                    val type = json?.optString("type", "") ?: ""
                    if (type in listOf("emergency_cancelled", "emergency_timeout", "request_cancelled")) {
                        _requestCancelledFlow.tryEmit(payload)
                    } else {
                        Log.d(TAG, "Non-cancellation notification (type=$type), ignoring for dispatch flow")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse notification payload", e)
                }
            }

            // Listen for force-logout from backend (session ended)
            socket?.on("auth:force-logout") { _ ->
                Log.w(TAG, "Force logout received from server")
                _sessionExpiredFlow.tryEmit(Unit)
            }

            // Listen for ambulance location updates from other ambulances (for dispatch view)
            socket?.on("ambulance:location-update") { args ->
                Log.d(TAG, "Ambulance location update received")
                _requestUpdatedFlow.tryEmit(args.firstOrNull()?.toString())
            }

            // Listen for patient location updates — patient moved during active emergency
            socket?.on("patient:location-update") { args ->
                Log.d(TAG, "Patient location update received — pickup location may have changed")
                _patientLocationFlow.tryEmit(args.firstOrNull()?.toString())
            }

            socket?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Socket connection failed", e)
            CrashReporter.recordException(e, "Socket connection failed")
        }
    }

    /** Reconnect with a fresh token (e.g. after token refresh). */
    fun reconnect(newToken: String) {
        val id = userId ?: return
        disconnect()
        connect(newToken, id)
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        userId = null
        activeRequestId = null
    }

    /**
     * Send GPS location update via Socket.IO for real-time tracking.
     * Called continuously by the LocationTrackingService.
     */
    fun sendLocationUpdate(
        latitude: Double,
        longitude: Double,
        heading: Float = 0f,
        speed: Float = 0f,
        requestId: String? = null
    ) {
        if (!isConnected) return
        try {
            // Use provided requestId, or fall back to activeRequestId
            val effectiveRequestId = requestId ?: activeRequestId
            val data = JSONObject().apply {
                put("userId", userId)
                put("latitude", latitude)
                put("longitude", longitude)
                put("heading", heading.toDouble())
                put("speed", speed.toDouble())
                put("timestamp", System.currentTimeMillis())
                if (effectiveRequestId != null) put("requestId", effectiveRequestId)
            }
            socket?.emit("ambulance:location", data)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send location update", e)
            CrashReporter.recordException(e, "Socket send location failed")
        }
    }

    /**
     * Notify that driver has updated request status.
     */
    fun emitStatusUpdate(requestId: String, status: String) {
        if (!isConnected) return
        try {
            val data = JSONObject().apply {
                put("requestId", requestId)
                put("status", status)
                put("userId", userId)
            }
            socket?.emit("ambulance:status-update", data)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit status update", e)
            CrashReporter.recordException(e, "Socket emit status failed")
        }
    }

    /**
     * Set the active request ID so all location updates include it.
     * Called when driver accepts/starts an emergency.
     * Also joins the request-specific tracking room so the patient can see live updates.
     */
    fun setActiveRequest(requestId: String) {
        activeRequestId = requestId
        Log.d(TAG, "Active request set: $requestId")
        joinTrackingRoom(requestId)
    }

    /**
     * Join the request-specific ambulance tracking room.
     * The patient app listens on this room for live location updates.
     * Backend expects event 'ambulance:track' with a plain string requestId.
     */
    fun joinTrackingRoom(requestId: String) {
        if (!isConnected) return
        try {
            socket?.emit("ambulance:track", requestId)
            Log.d(TAG, "Joined tracking room for request: $requestId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to join tracking room", e)
            CrashReporter.recordException(e, "Socket join tracking failed")
        }
    }

    /**
     * Clear the active request ID when emergency is completed/cancelled.
     */
    fun clearActiveRequest() {
        // BUG-16 Fix: Emit untrack before clearing so the server stops sending
        // location broadcasts to this socket
        val requestId = activeRequestId
        if (requestId != null) {
            try {
                socket?.emit("ambulance:untrack", requestId)
                Log.d(TAG, "Untracked request before clearing: $requestId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to emit untrack", e)
            }
        }
        Log.d(TAG, "Active request cleared: $requestId")
        activeRequestId = null
    }

    private fun summarizePayload(payload: Any?): String {
        if (payload == null) return "null"
        val raw = payload.toString().replace('\n', ' ').trim()
        return if (raw.length <= 180) raw else raw.take(177) + "..."
    }

    companion object {
        private const val TAG = "AmbulanceSocket"
    }
}
