package com.example.swastik.data.remote

import android.util.Log
import com.example.swastik.data.local.TokenManager
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

// Event Models
sealed class SignalingEvent {
    data class RoomState(val roomId: String, val participants: List<String>) : SignalingEvent()
    data class UserJoined(val userId: String, val role: String) : SignalingEvent()
    data class Offer(val sdp: String, val type: String) : SignalingEvent()
    data class Answer(val sdp: String, val type: String) : SignalingEvent()
    data class IceCandidate(val sdpMid: String, val sdpMLineIndex: Int, val sdp: String) : SignalingEvent()
    data class ModeChanged(
        val roomId: String,
        val mode: String,
        val preferredMode: String?,
        val effectiveMode: String?,
        val fromUserId: String?
    ) : SignalingEvent()
    data class UserLeft(val userId: String) : SignalingEvent()
}

data class SocketChatMessage(
    val senderId: String,
    val role: String,
    val message: String,
    val timestamp: String,
    val isMe: Boolean = false
)

data class OrderUpdate(
    val orderId: String,
    val status: String,
    val message: String,
    val timestamp: String
)

data class AppNotification(
    val id: String,
    val type: String,
    val title: String,
    val message: String,
    val data: JSONObject,
    val timestamp: String
)

data class ProviderCatalogUpdateEvent(
    val providerId: String,
    val providerType: String,
    val status: String,
    val timestamp: String
)

data class AmbulanceStatusUpdate(
    val requestId: String,
    val status: String,
    val message: String,
    val timestamp: String
)

data class AmbulanceLocationUpdate(
    val requestId: String,
    val latitude: Double,
    val longitude: Double,
    val heading: Float,
    val speed: Float,
    val timestamp: String,
    val distanceKm: Double? = null,
    val eta: String? = null
)

data class AmbulanceAssignedUpdate(
    val requestId: String,
    val ambulanceId: String?,
    val vehicleNumber: String?,
    val driverName: String?,
    val driverPhone: String?
)

// C1: Consultation started event
data class ConsultationStartedEvent(
    val consultationId: String,
    val appointmentId: String,
    val doctorName: String,
    val roomId: String,
    val type: String?,
    val timestamp: String
)

// M5: Consultation ended event
data class ConsultationEndedEvent(
    val consultationId: String,
    val appointmentId: String?,
    val duration: Int?,
    val prescriptionId: String?,
    val timestamp: String
)

// C2: Prescription new event
data class PrescriptionNewEvent(
    val id: String,
    val consultationId: String?,
    val doctorName: String?,
    val diagnosis: String?,
    val timestamp: String
)

// M1: Diagnostic update event
data class DiagnosticUpdate(
    val id: String,
    val status: String,
    val testName: String?,
    val bookingDate: String?,
    val resultUrl: String?,
    val message: String?,
    val timestamp: String
)

// M2: Chat typing event
data class ChatTypingEvent(
    val userId: String,
    val isTyping: Boolean
)

// I11: New order event
data class NewOrderEvent(
    val orderId: String,
    val orderNumber: String?,
    val status: String,
    val message: String?,
    val timestamp: String
)

// Appointment update event
data class AppointmentUpdateEvent(
    val appointmentId: String,
    val status: String,
    val doctorName: String?,
    val date: String?,
    val timeSlot: String?,
    val timestamp: String
)

/**
 * Manages Socket.IO connection for real-time features
 * Handles WebRTC signaling, Chat, Orders, Ambulance, and Notifications
 */
@Singleton
class SocketManager @Inject constructor(
    private val tokenManager: TokenManager
) {
    private var socket: Socket? = null
    // Use centrally-derived socket URL (safe URI parsing in ApiConfig)
    private val SOCKET_URL = ApiConfig.SOCKET_URL
    val isConnected: Boolean get() = socket?.connected() == true

    private var scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Flows for Events
    // replay = 0 for signaling events to prevent stale offers/answers on reconnect
    private val _signalingEvents = MutableSharedFlow<SignalingEvent>(replay = 0)
    val signalingEvents: SharedFlow<SignalingEvent> = _signalingEvents.asSharedFlow()

    private val _chatMessages = MutableSharedFlow<SocketChatMessage>(replay = 0)
    val chatMessages: SharedFlow<SocketChatMessage> = _chatMessages.asSharedFlow()

    // Wellness session chat (reuses SocketChatMessage shape: senderId/role/message/timestamp/isMe)
    private val _wellnessChatMessages = MutableSharedFlow<SocketChatMessage>(replay = 0)
    val wellnessChatMessages: SharedFlow<SocketChatMessage> = _wellnessChatMessages.asSharedFlow()

    private val _wellnessChatTyping = MutableSharedFlow<ChatTypingEvent>(replay = 0)
    val wellnessChatTyping: SharedFlow<ChatTypingEvent> = _wellnessChatTyping.asSharedFlow()

    private val _orderUpdates = MutableSharedFlow<OrderUpdate>(replay = 1)
    val orderUpdates: SharedFlow<OrderUpdate> = _orderUpdates.asSharedFlow()

    private val _notifications = MutableSharedFlow<AppNotification>(replay = 1)
    val notifications: SharedFlow<AppNotification> = _notifications.asSharedFlow()

    private val _providerCatalogUpdates = MutableSharedFlow<ProviderCatalogUpdateEvent>(replay = 0)
    val providerCatalogUpdates: SharedFlow<ProviderCatalogUpdateEvent> = _providerCatalogUpdates.asSharedFlow()

    private val _ambulanceUpdates = MutableSharedFlow<AmbulanceStatusUpdate>(replay = 1)
    val ambulanceUpdates: SharedFlow<AmbulanceStatusUpdate> = _ambulanceUpdates.asSharedFlow()

    private val _ambulanceLocationUpdates = MutableSharedFlow<AmbulanceLocationUpdate>(replay = 1)
    val ambulanceLocationUpdates: SharedFlow<AmbulanceLocationUpdate> = _ambulanceLocationUpdates.asSharedFlow()

    private val _ambulanceAssigned = MutableSharedFlow<AmbulanceAssignedUpdate>(replay = 1)
    val ambulanceAssigned: SharedFlow<AmbulanceAssignedUpdate> = _ambulanceAssigned.asSharedFlow()

    private val _connectionState = MutableSharedFlow<Boolean>(replay = 1)
    val connectionState: SharedFlow<Boolean> = _connectionState.asSharedFlow()

    // C1: Consultation started
    private val _consultationStarted = MutableSharedFlow<ConsultationStartedEvent>(replay = 1)
    val consultationStarted: SharedFlow<ConsultationStartedEvent> = _consultationStarted.asSharedFlow()

    // M5: Consultation ended
    private val _consultationEnded = MutableSharedFlow<ConsultationEndedEvent>(replay = 1)
    val consultationEnded: SharedFlow<ConsultationEndedEvent> = _consultationEnded.asSharedFlow()

    // C2: Prescription new
    private val _prescriptionNew = MutableSharedFlow<PrescriptionNewEvent>(replay = 1)
    val prescriptionNew: SharedFlow<PrescriptionNewEvent> = _prescriptionNew.asSharedFlow()

    // M1: Diagnostic updates
    private val _diagnosticUpdates = MutableSharedFlow<DiagnosticUpdate>(replay = 1)
    val diagnosticUpdates: SharedFlow<DiagnosticUpdate> = _diagnosticUpdates.asSharedFlow()

    // M2: Chat typing
    private val _chatTyping = MutableSharedFlow<ChatTypingEvent>(replay = 1)
    val chatTyping: SharedFlow<ChatTypingEvent> = _chatTyping.asSharedFlow()

    // I11: New orders
    private val _newOrders = MutableSharedFlow<NewOrderEvent>(replay = 1)
    val newOrders: SharedFlow<NewOrderEvent> = _newOrders.asSharedFlow()

    // Appointment updates
    private val _appointmentUpdates = MutableSharedFlow<AppointmentUpdateEvent>(replay = 1)
    val appointmentUpdates: SharedFlow<AppointmentUpdateEvent> = _appointmentUpdates.asSharedFlow()

    // Doctor Slots updates (for race condition fix)
    private val _doctorSlotsUpdates = MutableSharedFlow<JSONObject>(replay = 0)
    val doctorSlotsUpdates: SharedFlow<JSONObject> = _doctorSlotsUpdates.asSharedFlow()

    /** Track the active ambulance room for reconnect re-subscription */
    private val _agentLocationUpdates = MutableSharedFlow<Pair<Double, Double>>()
    val agentLocationUpdates: SharedFlow<Pair<Double, Double>> = _agentLocationUpdates

    private var activeTrackingRequestId: String? = null
    private var activeAgentTrackingToken: String? = null
    /** Track active consultation rooms for reconnect re-subscription */
    private var activeVideoRoomId: String? = null
    private var activeVideoMode: String? = null
    private var activeVideoPreferredMode: String? = null
    private var activeVideoEffectiveMode: String? = null
    private var activeChatConsultationId: String? = null
    private var activeWellnessChatSessionId: String? = null

    companion object {
        private const val TAG = "SocketManager"
    }

    private fun JSONObject.optNullableString(key: String): String? {
        if (!has(key) || isNull(key)) return null
        return optString(key)
    }

    private fun extractSocketErrorMessage(payload: Any?): String {
        return when (payload) {
            null -> ""
            is JSONObject -> payload.optString("message", payload.toString())
            is Throwable -> payload.message ?: payload.toString()
            else -> payload.toString()
        }
    }

    private fun invalidateSession(reason: String, allowRefreshRecovery: Boolean = true) {
        Log.w(TAG, reason)
        if (allowRefreshRecovery && !tokenManager.refreshToken.isNullOrBlank()) {
            // Keep the connection state updated
            scope.launch { _connectionState.emit(false) }
            // Instead of killing the socket, we just let it be. 
            // Reconnect will be triggered by AuthInterceptor calling reconnect() once token is fresh.
            return
        }
        disconnect()
        tokenManager.clearAll(emitSessionExpired = true)
    }

    private fun emitChatMessage(data: JSONObject, forceIsMe: Boolean? = null) {
        val senderId = data.optString("userId", "")
        scope.launch {
            val currentUserId = tokenManager.userId
            _chatMessages.emit(
                SocketChatMessage(
                    senderId = senderId,
                    role = data.optString("role", ""),
                    message = data.optString("message", ""),
                    timestamp = data.optString("timestamp", ""),
                    isMe = forceIsMe ?: (senderId == currentUserId)
                )
            )
        }
    }

    private fun emitWellnessChatMessage(data: JSONObject, forceIsMe: Boolean? = null) {
        val senderId = data.optString("userId", "")
        scope.launch {
            val currentUserId = tokenManager.userId
            _wellnessChatMessages.emit(
                SocketChatMessage(
                    senderId = senderId,
                    role = data.optString("role", ""),
                    message = data.optString("message", ""),
                    timestamp = data.optString("timestamp", ""),
                    isMe = forceIsMe ?: (senderId == currentUserId)
                )
            )
        }
    }

    /**
     * Connect to Socket.IO server with authentication
     */
    fun connect() {
        if (socket?.connected() == true) return

        scope.launch {
            try {
                val token = tokenManager.accessToken
                if (token != null) {
                    // If a stale socket instance exists, fully clean it before re-creating
                    // to avoid duplicate listeners and duplicate signaling events.
                    socket?.off()
                    socket?.disconnect()
                    socket = null

                    val opts = IO.Options()
                    // Safe map handling
                    val authMap = java.util.HashMap<String, String>()
                    authMap["token"] = token
                    opts.auth = authMap
                    opts.path = "/socket.io"
                    opts.transports = arrayOf("websocket", "polling")
                    opts.reconnection = true
                    opts.reconnectionDelay = 5000
                    opts.reconnectionDelayMax = 15000

                    socket = IO.socket(SOCKET_URL, opts)
                    setupListeners()
                    socket?.connect()
                } else {
                    Log.w(TAG, "Cannot connect: No token found")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Connection failed", e)
            }
        }
    }

    private fun setupListeners() {
        socket?.on(Socket.EVENT_CONNECT) {
            Log.d(TAG, "Socket connected: ${socket?.id()}")
            scope.launch { _connectionState.emit(true) }
            // Subscribe to notifications channel
            socket?.emit("subscribe:notifications")
            // Re-join ambulance tracking room on reconnect
            activeTrackingRequestId?.let { requestId ->
                socket?.emit("ambulance:track", requestId)
                Log.d(TAG, "Re-joined ambulance tracking room: $requestId")
            }

            // Re-join active consultation rooms after reconnect
            activeVideoRoomId?.let { roomId ->
                socket?.emit("video:join", roomId)
                Log.d(TAG, "Re-joined video room: $roomId")
                activeVideoMode?.let { mode ->
                    socket?.emit("video:mode", JSONObject().apply {
                        put("roomId", roomId)
                        put("mode", mode)
                        put("preferredMode", activeVideoPreferredMode ?: "video")
                        put("effectiveMode", activeVideoEffectiveMode ?: mode)
                    })
                    Log.d(TAG, "Re-published video mode for room $roomId: $mode")
                }
            }
            activeChatConsultationId?.let { consultationId ->
                socket?.emit("chat:join", consultationId)
                Log.d(TAG, "Re-joined chat room: $consultationId")
            }
            activeWellnessChatSessionId?.let { sessionId ->
                socket?.emit("wellness:chat:join", sessionId)
                Log.d(TAG, "Re-joined wellness chat room: $sessionId")
            }
        }

        socket?.on(Socket.EVENT_DISCONNECT) {
            Log.d(TAG, "Socket disconnected")
            scope.launch { _connectionState.emit(false) }
        }

        socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
            val errorMsg = extractSocketErrorMessage(args.firstOrNull())
            Log.e(TAG, "Socket connect error: $errorMsg")
            // If connect error is auth-related, treat as session expired
            if (errorMsg.contains("token", ignoreCase = true) ||
                errorMsg.contains("unauthorized", ignoreCase = true) ||
                errorMsg.contains("jwt", ignoreCase = true) ||
                errorMsg.contains("authentication", ignoreCase = true) ||
                errorMsg.contains("expired", ignoreCase = true)) {
                invalidateSession("Auth-related socket error; waiting for token refresh")
            }
        }

        // Listen for force-logout from backend (session ended / user deactivated)
        socket?.on("auth:force-logout") { _ ->
            invalidateSession("Force logout received from server — session invalidated")
        }

        // Listen for token expired error from backend
        socket?.on("error") { args ->
            try {
                val data = args.firstOrNull()
                if (data is JSONObject) {
                    val code = data.optString("code", "")
                    if (code == "TOKEN_EXPIRED") {
                        invalidateSession("Realtime token expired; waiting for token refresh")
                    } else if (code == "ACCOUNT_REMOVED" || code == "ACCOUNT_DEACTIVATED") {
                        invalidateSession("Realtime session rejected by backend ($code)", allowRefreshRecovery = false)
                    }
                } else {
                    val errorMsg = extractSocketErrorMessage(data)
                    if (errorMsg.contains("token", ignoreCase = true) ||
                        errorMsg.contains("expired", ignoreCase = true)) {
                        invalidateSession("Realtime session rejected by backend: $errorMsg")
                    }
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing socket error event", e) }
        }

        // --- Video Signaling Events ---

        socket?.on("video:room-state") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                val participantArray = data.optJSONArray("participants")
                val participants = mutableListOf<String>()
                if (participantArray != null) {
                    for (index in 0 until participantArray.length()) {
                        participantArray.optString(index).takeIf { it.isNotBlank() }?.let(participants::add)
                    }
                }
                scope.launch {
                    _signalingEvents.emit(
                        SignalingEvent.RoomState(
                            roomId = data.optString("roomId", ""),
                            participants = participants.distinct()
                        )
                    )
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:room-state", e) }
        }

        socket?.on("video:user-joined") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "User Joined: $data")
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.UserJoined(
                        userId = data.optString("userId"),
                        role = data.optString("role")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:user-joined", e) }
        }

        socket?.on("video:offer") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Received Offer")
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.Offer(
                        sdp = data.optString("sdp", ""),
                        type = data.optString("type", "offer")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:offer", e) }
        }

        socket?.on("video:answer") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Received Answer")
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.Answer(
                        sdp = data.optString("sdp", ""),
                        type = data.optString("type", "answer")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:answer", e) }
        }

        socket?.on("video:ice-candidate") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Received ICE Candidate")
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.IceCandidate(
                        sdpMid = data.optString("sdpMid", ""),
                        sdpMLineIndex = data.optInt("sdpMLineIndex", 0),
                        sdp = data.optString("candidate", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:ice-candidate", e) }
        }

        socket?.on("video:mode") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _signalingEvents.emit(
                        SignalingEvent.ModeChanged(
                            roomId = data.optString("roomId", ""),
                            mode = data.optString("mode", "video"),
                            preferredMode = data.optNullableString("preferredMode"),
                            effectiveMode = data.optNullableString("effectiveMode"),
                            fromUserId = data.optNullableString("from")
                        )
                    )
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:mode", e) }
        }
        
        socket?.on("video:user-left") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.UserLeft(data.optString("userId")))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing video:user-left", e) }
        }

        // --- Chat Events ---

        socket?.on("chat:message") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Chat Message: $data")
                emitChatMessage(data)
            } catch (e: Exception) { Log.e(TAG, "Error parsing chat:message", e) }
        }

        socket?.on("chat:message:sent") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Chat Message Ack: $data")
                emitChatMessage(data, forceIsMe = true)
            } catch (e: Exception) { Log.e(TAG, "Error parsing chat:message:sent", e) }
        }

        // --- Wellness Session Chat Events ---
        socket?.on("wellness:chat:message") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Wellness Chat Message: $data")
                emitWellnessChatMessage(data)
            } catch (e: Exception) { Log.e(TAG, "Error parsing wellness:chat:message", e) }
        }

        socket?.on("wellness:chat:message:sent") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Wellness Chat Ack: $data")
                emitWellnessChatMessage(data, forceIsMe = true)
            } catch (e: Exception) { Log.e(TAG, "Error parsing wellness:chat:message:sent", e) }
        }

        socket?.on("wellness:chat:typing") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _wellnessChatTyping.emit(ChatTypingEvent(
                        userId = data.optString("userId", ""),
                        isTyping = data.optBoolean("isTyping", false)
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing wellness:chat:typing", e) }
        }

        // --- Real-time Updates ---

        socket?.on("order:update") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Order Update: $data")
                scope.launch {
                    _orderUpdates.emit(OrderUpdate(
                        orderId = data.optString("orderId", ""),
                        status = data.optString("status", ""),
                        message = data.optString("message", ""),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing order:update", e) }
        }

        socket?.on("notification:new") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Notification: $data")
                scope.launch {
                    _notifications.emit(AppNotification(
                        id = data.optString("id", ""),
                        type = data.optString("type", "info"),
                        title = data.optString("title", ""),
                        message = data.optString("message", ""),
                        data = data.optJSONObject("data") ?: JSONObject(),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing notification:new", e) }
        }

        socket?.on("catalog:refresh") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Provider catalog refresh: $data")
                scope.launch {
                    _providerCatalogUpdates.emit(
                        ProviderCatalogUpdateEvent(
                            providerId = data.optString("providerId", ""),
                            providerType = data.optString("providerType", ""),
                            status = data.optString("status", ""),
                            timestamp = data.optString("timestamp", "")
                        )
                    )
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing catalog:refresh", e) }
        }

        socket?.on("ambulance:status-update") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _ambulanceUpdates.emit(AmbulanceStatusUpdate(
                        requestId = data.optString("requestId", ""),
                        status = data.optString("status", ""),
                        message = data.optString("message", ""),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing ambulance:status-update", e) }
        }

        socket?.on("ambulance:timeout") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _ambulanceUpdates.emit(AmbulanceStatusUpdate(
                        requestId = data.optString("requestId", ""),
                        status = "timeout",
                        message = data.optString(
                            "message",
                            "No ambulance could accept your request. Please try again or call 108."
                        ),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing ambulance:timeout", e) }
        }

        socket?.on("ambulance:location-update") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _ambulanceLocationUpdates.emit(AmbulanceLocationUpdate(
                        requestId = data.optString("requestId", ""),
                        latitude = data.optDouble("latitude", 0.0),
                        longitude = data.optDouble("longitude", 0.0),
                        heading = data.optDouble("heading", 0.0).toFloat(),
                        speed = data.optDouble("speed", 0.0).toFloat(),
                        timestamp = data.optString("timestamp", ""),
                        distanceKm = if (data.has("distanceKm")) data.optDouble("distanceKm") else null,
                        eta = if (data.has("eta")) data.optString("eta") else null
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing ambulance:location-update", e) }
        }

        socket?.on("ambulance:assigned") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _ambulanceAssigned.emit(AmbulanceAssignedUpdate(
                        requestId = data.optString("requestId", ""),
                        ambulanceId = data.optNullableString("ambulanceId"),
                        vehicleNumber = data.optNullableString("vehicleNumber"),
                        driverName = data.optNullableString("driverName"),
                        driverPhone = data.optNullableString("driverPhone")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing ambulance:assigned", e) }
        }

        // --- C1: Consultation Started ---
        socket?.on("consultation:started") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Consultation started: $data")
                scope.launch {
                    _consultationStarted.emit(ConsultationStartedEvent(
                        consultationId = data.optString("consultationId", data.optString("id", "")),
                        appointmentId = data.optString("appointmentId", data.optString("appointment_id", "")),
                        doctorName = data.optString("doctorName", data.optString("doctor_name", "Doctor")),
                        roomId = data.optString("roomId", data.optString("room_id", "")),
                        type = data.optNullableString("type"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing consultation:started", e) }
        }

        // --- M5: Consultation Ended ---
        socket?.on("consultation:ended") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Consultation ended: $data")
                scope.launch {
                    _consultationEnded.emit(ConsultationEndedEvent(
                        consultationId = data.optString("consultationId", ""),
                        appointmentId = data.optNullableString("appointmentId"),
                        duration = if (data.has("duration")) data.optInt("duration") else null,
                        prescriptionId = data.optNullableString("prescriptionId"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing consultation:ended", e) }
        }

        // --- C2: Prescription New ---
        socket?.on("prescription:new") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "New prescription: $data")
                scope.launch {
                    _prescriptionNew.emit(PrescriptionNewEvent(
                        id = data.optString("id", ""),
                        consultationId = data.optNullableString("consultationId"),
                        doctorName = data.optNullableString("doctorName"),
                        diagnosis = data.optNullableString("diagnosis"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing prescription:new", e) }
        }

        // --- M1: Diagnostic Updates ---
        socket?.on("diagnostic:booking-updated") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Diagnostic booking updated: $data")
                scope.launch {
                    _diagnosticUpdates.emit(DiagnosticUpdate(
                        id = data.optString("id", ""),
                        status = data.optString("status", ""),
                        testName = data.optNullableString("test_name"),
                        bookingDate = data.optNullableString("booking_date"),
                        resultUrl = null,
                        message = data.optNullableString("message"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing diagnostic:booking-updated", e) }
        }

        socket?.on("diagnostic:result-ready") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                Log.d(TAG, "Diagnostic result ready: $data")
                scope.launch {
                    _diagnosticUpdates.emit(DiagnosticUpdate(
                        id = data.optString("id", ""),
                        status = "result_ready",
                        testName = data.optNullableString("test_name"),
                        bookingDate = null,
                        resultUrl = data.optNullableString("result_url"),
                        message = data.optNullableString("message"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing diagnostic:result-ready", e) }
        }

        socket?.on("diagnostic:booking-confirmed") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _diagnosticUpdates.emit(DiagnosticUpdate(
                        id = data.optString("id", ""),
                        status = "confirmed",
                        testName = data.optNullableString("test_name"),
                        bookingDate = data.optNullableString("booking_date"),
                        resultUrl = null,
                        message = data.optNullableString("message"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing diagnostic:booking-confirmed", e) }
        }

        // --- M2: Chat Typing ---
        socket?.on("chat:typing") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _chatTyping.emit(ChatTypingEvent(
                        userId = data.optString("userId", ""),
                        isTyping = data.optBoolean("isTyping", false)
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing chat:typing", e) }
        }

        // --- I11: New Order ---
        socket?.on("order:new") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _newOrders.emit(NewOrderEvent(
                        orderId = data.optString("orderId", ""),
                        orderNumber = data.optNullableString("orderNumber"),
                        status = data.optString("status", "pending"),
                        message = data.optNullableString("message"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing order:new", e) }
        }

        // --- Appointment Updates ---
        socket?.on("appointment:update") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _appointmentUpdates.emit(AppointmentUpdateEvent(
                        appointmentId = data.optString("appointmentId", data.optString("id", "")),
                        status = data.optString("status", ""),
                        doctorName = data.optNullableString("doctorName"),
                        date = data.optNullableString("date") ?: data.optNullableString("appointment_date"),
                        timeSlot = data.optNullableString("timeSlot") ?: data.optNullableString("time_slot"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing appointment:update", e) }
        }

        socket?.on("appointment:confirmed") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _appointmentUpdates.emit(AppointmentUpdateEvent(
                        appointmentId = data.optString("appointmentId", data.optString("id", "")),
                        status = "confirmed",
                        doctorName = data.optNullableString("doctorName"),
                        date = data.optNullableString("date"),
                        timeSlot = data.optNullableString("timeSlot"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing appointment:confirmed", e) }
        }

        socket?.on("appointment:cancelled") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _appointmentUpdates.emit(AppointmentUpdateEvent(
                        appointmentId = data.optString("appointmentId", data.optString("id", "")),
                        status = "cancelled",
                        doctorName = data.optNullableString("doctorName"),
                        date = data.optNullableString("date") ?: data.optNullableString("appointment_date"),
                        timeSlot = data.optNullableString("timeSlot") ?: data.optNullableString("time_slot"),
                        timestamp = data.optString("timestamp", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing appointment:cancelled", e) }
        }

        // --- Doctor Slots Updates (Race Condition) ---
        socket?.on("appointment:booked") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                scope.launch {
                    _doctorSlotsUpdates.emit(data)
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing appointment:booked", e) }
        }
        // --- Agent Tracking Updates ---
        socket?.on("agent:location-update") { args ->
            try {
                val data = args[0] as? JSONObject ?: return@on
                val lat = data.optDouble("latitude")
                val lng = data.optDouble("longitude")
                if (!lat.isNaN() && !lng.isNaN()) {
                    scope.launch {
                        _agentLocationUpdates.emit(Pair(lat, lng))
                    }
                }
            } catch (e: Exception) { Log.e(TAG, "Error parsing agent:location-update", e) }
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        activeTrackingRequestId = null
        activeAgentTrackingToken = null
        activeVideoRoomId = null
        activeVideoMode = null
        activeVideoPreferredMode = null
        activeVideoEffectiveMode = null
        activeChatConsultationId = null
        activeWellnessChatSessionId = null
        scope.cancel()
        // Recreate scope so singleton can be reused after re-login
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }

    fun reconnect() {
        socket?.off()
        socket?.disconnect()
        socket = null
        connect()
    }
    
    fun getSocket(): Socket? = socket // Added back for legacy support if needed

    // --- Emitters ---

    fun joinVideoRoom(roomId: String) {
        activeVideoRoomId = roomId
        val s = socket
        if (s?.connected() == true) {
            s.emit("video:join", roomId)
            activeVideoMode?.let { mode ->
                sendVideoMode(
                    roomId,
                    mode,
                    activeVideoPreferredMode ?: "video",
                    activeVideoEffectiveMode ?: mode
                )
            }
        } else {
            Log.w(TAG, "Socket not connected yet; video room will auto-join on connect: $roomId")
            connect()
        }
    }

    fun leaveVideoRoom(roomId: String) {
        if (activeVideoRoomId == roomId) {
            activeVideoRoomId = null
            activeVideoMode = null
            activeVideoPreferredMode = null
            activeVideoEffectiveMode = null
        }
        socket?.emit("video:leave", roomId)
    }

    fun sendVideoMode(
        roomId: String,
        mode: String,
        preferredMode: String = "video",
        effectiveMode: String = mode
    ) {
        activeVideoRoomId = roomId
        activeVideoMode = mode
        activeVideoPreferredMode = preferredMode
        activeVideoEffectiveMode = effectiveMode
        val payload = JSONObject().apply {
            put("roomId", roomId)
            put("mode", mode)
            put("preferredMode", preferredMode)
            put("effectiveMode", effectiveMode)
        }

        val s = socket
        if (s?.connected() == true) {
            s.emit("video:mode", payload)
        } else {
            Log.w(TAG, "Socket not connected yet; video mode will publish on connect: $mode")
            connect()
        }
    }

    fun sendOffer(roomId: String, sdp: String, type: String) {
        val offerJson = JSONObject()
        offerJson.put("type", type)
        offerJson.put("sdp", sdp)
        
        val payload = JSONObject()
        payload.put("roomId", roomId)
        payload.put("offer", offerJson)
        
        socket?.emit("video:offer", payload)
    }

    fun sendAnswer(roomId: String, sdp: String, type: String) {
        val answerJson = JSONObject()
        answerJson.put("type", type)
        answerJson.put("sdp", sdp)
        
        val payload = JSONObject()
        payload.put("roomId", roomId)
        payload.put("answer", answerJson)
        
        socket?.emit("video:answer", payload)
    }

    fun sendIceCandidate(roomId: String, sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        val candidateJson = JSONObject()
        candidateJson.put("sdpMid", sdpMid)
        candidateJson.put("sdpMLineIndex", sdpMLineIndex)
        candidateJson.put("candidate", candidate)
        
        val payload = JSONObject()
        payload.put("roomId", roomId)
        payload.put("candidate", candidateJson)
        
        socket?.emit("video:ice-candidate", payload)
    }

    fun joinChat(consultationId: String) {
        activeChatConsultationId = consultationId
        val s = socket
        if (s?.connected() == true) {
            s.emit("chat:join", consultationId)
        } else {
            Log.w(TAG, "Socket not connected yet; chat room will auto-join on connect: $consultationId")
            connect()
        }
    }

    fun leaveChat(consultationId: String) {
        if (activeChatConsultationId == consultationId) activeChatConsultationId = null
        socket?.emit("chat:leave", consultationId)
    }

    fun sendChatMessage(consultationId: String, message: String) {
        val payload = JSONObject()
        payload.put("consultationId", consultationId)
        payload.put("message", message.take(2000))
        socket?.emit("chat:message", payload)
    }

    /** M2: Send chat typing indicator */
    fun sendChatTyping(consultationId: String, isTyping: Boolean) {
        val payload = JSONObject()
        payload.put("consultationId", consultationId)
        payload.put("isTyping", isTyping)
        socket?.emit("chat:typing", payload)
    }

    // --- Wellness Session Chat Emitters ---

    fun joinWellnessChat(sessionId: String) {
        activeWellnessChatSessionId = sessionId
        val s = socket
        if (s?.connected() == true) {
            s.emit("wellness:chat:join", sessionId)
        } else {
            Log.w(TAG, "Socket not connected yet; wellness chat will auto-join on connect: $sessionId")
            connect()
        }
    }

    fun leaveWellnessChat(sessionId: String) {
        if (activeWellnessChatSessionId == sessionId) activeWellnessChatSessionId = null
        socket?.emit("wellness:chat:leave", sessionId)
    }

    fun sendWellnessChatMessage(sessionId: String, message: String) {
        val payload = JSONObject()
        payload.put("sessionId", sessionId)
        payload.put("message", message.take(2000))
        socket?.emit("wellness:chat:message", payload)
    }

    fun sendWellnessChatTyping(sessionId: String, isTyping: Boolean) {
        val payload = JSONObject()
        payload.put("sessionId", sessionId)
        payload.put("isTyping", isTyping)
        socket?.emit("wellness:chat:typing", payload)
    }
    
    fun trackAmbulance(requestId: String) {
        activeTrackingRequestId = requestId
        socket?.emit("ambulance:track", requestId)
    }

    fun untrackAmbulance(requestId: String) {
        activeTrackingRequestId = null
        socket?.emit("ambulance:untrack", requestId)
    }

    // --- Delivery Agent Tracking ---
    fun trackAgent(trackingToken: String) {
        activeAgentTrackingToken = trackingToken
        val payload = JSONObject().apply { put("trackingToken", trackingToken) }
        socket?.emit("agent:track", payload)
    }

    fun untrackAgent(trackingToken: String) {
        if (activeAgentTrackingToken == trackingToken) {
            activeAgentTrackingToken = null
        }
        val payload = JSONObject().apply { put("trackingToken", trackingToken) }
        socket?.emit("agent:untrack", payload)
    }

    // --- Doctor Slots Race Condition Subscriptions ---
    fun subscribeToDoctorSlots(doctorId: String) {
        val payload = JSONObject().apply { put("doctorId", doctorId) }
        socket?.emit("doctor:slots:subscribe", payload)
    }

    fun unsubscribeFromDoctorSlots(doctorId: String) {
        val payload = JSONObject().apply { put("doctorId", doctorId) }
        socket?.emit("doctor:slots:unsubscribe", payload)
    }

    /**
     * Send patient's updated GPS location during an active emergency.
     * The ambulance driver receives this as a live pickup-point update.
     */
    fun sendPatientLocationUpdate(requestId: String, latitude: Double, longitude: Double) {
        try {
            val payload = JSONObject().apply {
                put("requestId", requestId)
                put("lat", latitude)
                put("lng", longitude)
            }
            socket?.emit("location:update", payload)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending location update", e)
        }
    }

    /**
     * Send AI Diagnostic Proof to the doctor during a live consultation.
     */
    fun sendAiProof(roomId: String, proofUrl: String, predictionResult: String, confidence: Float, modelType: String) {
        try {
            val payload = JSONObject().apply {
                put("roomId", roomId)
                put("proofUrl", proofUrl)
                put("predictionResult", predictionResult)
                put("confidence", confidence)
                put("modelType", modelType)
            }
            socket?.emit("video:ai_proof", payload)
            Log.d(TAG, "Sent AI proof for room $roomId")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending AI proof", e)
        }
    }
}
