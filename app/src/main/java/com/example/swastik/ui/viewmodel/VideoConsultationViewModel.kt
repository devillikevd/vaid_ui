package com.example.swastik.ui.viewmodel

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.SignalingEvent
import com.example.swastik.data.remote.ApiConfig
import com.example.swastik.data.remote.ConsultationEndedEvent
import com.example.swastik.data.remote.ConsultationStartedEvent
import com.example.swastik.data.local.TokenManager
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.repository.AppointmentRepository
import com.example.swastik.data.repository.PatientRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.VideoCallSession
import com.example.swastik.data.webrtc.WebRTCManager
import com.example.swastik.util.vision.ComputerVisionAnalyzer
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.coroutines.coroutineContext
import org.webrtc.EglBase
import org.webrtc.PeerConnection
import org.webrtc.VideoTrack
import javax.inject.Inject

/**
 * Consultation connection mode — degrades gracefully based on network quality.
 */
enum class ConsultationMode { VIDEO, AUDIO, CHAT }

private fun ConsultationMode.rank(): Int = when (this) {
    ConsultationMode.CHAT -> 0
    ConsultationMode.AUDIO -> 1
    ConsultationMode.VIDEO -> 2
}

private fun mostRestrictiveMode(vararg modes: ConsultationMode): ConsultationMode =
    modes.minByOrNull { it.rank() } ?: ConsultationMode.VIDEO

private fun ConsultationMode.toWireValue(): String = name.lowercase()

private fun consultationModeFromWire(value: String?): ConsultationMode = when (value?.lowercase()) {
    "chat" -> ConsultationMode.CHAT
    "audio" -> ConsultationMode.AUDIO
    else -> ConsultationMode.VIDEO
}

/**
 * UI State for video consultation
 */
data class VideoConsultationUiState(
    val isConnecting: Boolean = false,
    val isConnected: Boolean = false,
    val isWaitingForDoctor: Boolean = false,
    val isMicEnabled: Boolean = true,
    val isCameraEnabled: Boolean = true,
    val isSpeakerOn: Boolean = true,
    val session: VideoCallSession? = null,
    val error: String? = null,
    val chatMessages: List<ChatMessageUi> = emptyList(),
    val callDuration: Long = 0L,
    val hasRemoteVideo: Boolean = false,
    val connectionMode: ConsultationMode = ConsultationMode.VIDEO,
    val networkQuality: WebRTCManager.NetworkQuality = WebRTCManager.NetworkQuality.GOOD,
    val modeBanner: String? = null,
    val consultationCompleted: Boolean = false,
    val isMedicalRecordAccessLoading: Boolean = false,
    val hasMedicalRecordAccess: Boolean = false,
    val medicalRecordAccessExpiresAt: String? = null,
    val medicalRecordAccessMessage: String? = null
)

data class ChatMessageUi(
    val id: String,
    val message: String,
    val senderName: String,
    val isMe: Boolean,
    val timestamp: String
)

/**
 * ViewModel for video consultation — integrates WebRTC with Socket.IO signaling.
 *
 * Flow:
 * 1. joinConsultation() → REST API join + Socket.IO room join
 * 2. WebRTCManager initializes local media (camera + mic)
 * 3. When remote user joins (via Socket.IO), create an SDP offer
 * 4. Exchange offer/answer/ICE candidates via Socket.IO signaling
 * 5. WebRTC connection established — local & remote video streams render
 */
@HiltViewModel
class VideoConsultationViewModel @Inject constructor(
    private val appointmentRepository: AppointmentRepository,
    private val patientRepository: PatientRepository,
    private val socketManager: SocketManager,
    private val tokenManager: TokenManager,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(VideoConsultationUiState())
    val uiState: StateFlow<VideoConsultationUiState> = _uiState.asStateFlow()
    private val audioManager by lazy {
        appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    // WebRTC Manager
    private var webRTCManager: WebRTCManager? = null
    private var isWebRTCInitialized = false
    private var networkMonitorJob: kotlinx.coroutines.Job? = null
    private var cvAnalyzer: ComputerVisionAnalyzer? = null
    private var userPreferredMode = ConsultationMode.VIDEO
    private var bannerJob: kotlinx.coroutines.Job? = null
    private var localBandwidthMode = ConsultationMode.VIDEO
    private var remoteRequestedMode = ConsultationMode.VIDEO
    private var userMicPreference = true
    private var lastPublishedModeConstraint = ConsultationMode.VIDEO
    private var pendingAppointmentId: String? = null
    private var currentAppointmentId: String? = null
    private var pendingJoinRetryJob: kotlinx.coroutines.Job? = null
    private var callDurationJob: kotlinx.coroutines.Job? = null
    private var patientOfferFallbackJob: kotlinx.coroutines.Job? = null
    private var recoveryPollerJob: kotlinx.coroutines.Job? = null
    private var hasSentLocalOffer = false
    private var hasReceivedRemoteOffer = false
    private var hasReceivedRemoteAnswer = false

    // ── Hysteresis counters for stats-based fallback/restore ──
    // Require N consecutive samples before changing mode to prevent jitter
    private var consecutiveDegradeCount = 0
    private var consecutiveRestoreCount = 0
    private var pendingQualityLevel: WebRTCManager.NetworkQuality? = null
    private var iceRestartAttempts = 0
    private companion object {
        const val DEGRADE_THRESHOLD = 3   // 3 consecutive bad samples (~9s) before downgrading
        const val RESTORE_THRESHOLD = 4   // 4 consecutive good samples (~12s) before upgrading
        const val MAX_ICE_RESTARTS = 3    // max ICE restarts before giving up
        const val STATS_POLL_INTERVAL_MS = 3000L
    }

    // Expose local and remote video tracks for the UI to render
    private val _localVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val localVideoTrack: StateFlow<VideoTrack?> = _localVideoTrack.asStateFlow()

    private val _remoteVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val remoteVideoTrack: StateFlow<VideoTrack?> = _remoteVideoTrack.asStateFlow()

    // EGL context for SurfaceViewRenderers
    val eglBaseContext: EglBase.Context?
        get() = webRTCManager?.eglBase?.eglBaseContext

    // Patient name from shared profile for display in prepare/completion screens
    val patientName: StateFlow<String> = patientRepository.patientProfile
        .map { it?.name ?: "Patient" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "Patient")

    // Expose WebRTC signaling events for the UI layer
    val signalingEvents = appointmentRepository.signalingEvents
    val chatMessages = appointmentRepository.chatMessages

    init {
        // Listen for incoming chat messages
        viewModelScope.launch {
            appointmentRepository.chatMessages.collect { msg ->
                _uiState.value = _uiState.value.copy(
                    chatMessages = _uiState.value.chatMessages + ChatMessageUi(
                        id = System.currentTimeMillis().toString(),
                        message = msg.message,
                        senderName = msg.role,
                        isMe = msg.isMe,
                        timestamp = msg.timestamp
                    )
                )
            }
        }

        // Listen for WebRTC signaling events from Socket.IO
        viewModelScope.launch {
            socketManager.signalingEvents.collect { event ->
                handleSignalingEvent(event)
            }
        }

        viewModelScope.launch {
            socketManager.consultationEnded.collect { event ->
                handleConsultationEnded(event)
            }
        }

        viewModelScope.launch {
            socketManager.consultationStarted.collect { event ->
                handleConsultationStarted(event)
            }
        }
    }

    /**
     * Initialize WebRTC engine and start local media.
     */
    private fun initializeWebRTC(iceServers: List<org.webrtc.PeerConnection.IceServer>? = null) {
        if (isWebRTCInitialized) return
        isWebRTCInitialized = true

        try {
            webRTCManager = WebRTCManager(appContext).apply {
                if (iceServers != null) {
                    this.iceServers = iceServers
                }
                cvAnalyzer = try {
                    ComputerVisionAnalyzer(appContext)
                } catch (error: Throwable) {
                    android.util.Log.e("VideoConsultationVM", "CV analyzer disabled: ${error.message}", error)
                    null
                }
                applySpeakerRoute(_uiState.value.isSpeakerOn)

                // Set up callbacks
                onLocalVideoTrack = { track ->
                    _localVideoTrack.value = track
                    cvAnalyzer?.let { analyzer ->
                        try {
                            track.addSink(analyzer) // Intercept frames for MediaPipe CV Vitals
                        } catch (error: Throwable) {
                            android.util.Log.e("VideoConsultationVM", "Failed to attach CV analyzer: ${error.message}", error)
                        }
                    }
                }
                onRemoteVideoTrack = { track ->
                    _remoteVideoTrack.value = track
                    _uiState.value = _uiState.value.copy(hasRemoteVideo = true)
                }
                onIceCandidateGenerated = { candidate ->
                    // Send ICE candidate to remote peer via Socket.IO
                    val roomId = _uiState.value.session?.sessionId
                    if (roomId != null) {
                        appointmentRepository.sendIceCandidate(
                            roomId,
                            candidate.sdpMid ?: "",
                            candidate.sdpMLineIndex,
                            candidate.sdp
                        )
                    }
                }
                onOfferCreated = { sdp ->
                    val roomId = _uiState.value.session?.sessionId
                    if (roomId != null) {
                        hasSentLocalOffer = true
                        appointmentRepository.sendOffer(roomId, sdp.description, sdp.type.canonicalForm())
                    }
                }
                onAnswerCreated = { sdp ->
                    val roomId = _uiState.value.session?.sessionId
                    if (roomId != null) {
                        appointmentRepository.sendAnswer(roomId, sdp.description, sdp.type.canonicalForm())
                    }
                }
                onConnectionStateChanged = { state ->
                    when (state) {
                        PeerConnection.IceConnectionState.CONNECTED,
                        PeerConnection.IceConnectionState.COMPLETED -> {
                            iceRestartAttempts = 0
                            consecutiveDegradeCount = 0
                            consecutiveRestoreCount = 0
                            // Restore to VIDEO if we were previously degraded due to ICE failure
                            if (localBandwidthMode != ConsultationMode.VIDEO && _uiState.value.isConnected) {
                                localBandwidthMode = ConsultationMode.VIDEO
                                publishModeConstraintIfNeeded()
                                applyEffectiveMediaState(
                                    banner = "✅ Connection restored — Video mode active",
                                    clearDelayMs = 4000
                                )
                            } else {
                                localBandwidthMode = ConsultationMode.VIDEO
                            }
                            // Reset ICE restart budget on every successful connection
                            iceRestartAttempts = 0
                            _uiState.value = _uiState.value.copy(
                                isConnected = true,
                                isConnecting = false,
                                consultationCompleted = false,
                                networkQuality = WebRTCManager.NetworkQuality.GOOD
                            )
                            startCallDurationTimer()
                            publishModeConstraintIfNeeded()
                            applyEffectiveMediaState()
                            startNetworkQualityMonitor()
                            startVitalsStreaming() // Launch parallel Edge CV MediaPipe processor
                        }
                        PeerConnection.IceConnectionState.DISCONNECTED -> {
                            _uiState.value = _uiState.value.copy(
                                modeBanner = "Connection interrupted — reconnecting..."
                            )
                            viewModelScope.launch {
                                kotlinx.coroutines.delay(8000)
                                if (_uiState.value.modeBanner?.contains("reconnecting") == true) {
                                    _uiState.value = _uiState.value.copy(modeBanner = null)
                                }
                            }
                        }
                        PeerConnection.IceConnectionState.FAILED -> {
                            // Attempt ICE restart before giving up to chat
                            if (iceRestartAttempts < MAX_ICE_RESTARTS) {
                                iceRestartAttempts++
                                android.util.Log.w("VideoConsultationVM",
                                    "ICE failed — restart attempt $iceRestartAttempts/$MAX_ICE_RESTARTS")
                                _uiState.value = _uiState.value.copy(
                                    modeBanner = "Connection lost — reconnecting (attempt $iceRestartAttempts)..."
                                )
                                viewModelScope.launch {
                                    // Exponential backoff: 4s, 6s, 8s
                                    val backoffMs = (2000L + iceRestartAttempts * 2000L)
                                    kotlinx.coroutines.delay(backoffMs)
                                    val currentIce = webRTCManager?.currentIceState
                                    if (currentIce == PeerConnection.IceConnectionState.FAILED
                                        || currentIce == PeerConnection.IceConnectionState.DISCONNECTED) {
                                        if (iceRestartAttempts >= MAX_ICE_RESTARTS) {
                                            // Exhausted restarts — fall to chat but KEEP monitor alive
                                            localBandwidthMode = ConsultationMode.CHAT
                                            _uiState.value = _uiState.value.copy(
                                                isConnected = false,
                                                hasRemoteVideo = false
                                            )
                                            publishModeConstraintIfNeeded()
                                            applyEffectiveMediaState(
                                                banner = "Connection lost — switched to Chat mode",
                                                clearDelayMs = 8000
                                            )
                                            // DO NOT cancel networkMonitorJob — we need it for recovery
                                            // Start a recovery poller that periodically tries ICE restart
                                            startRecoveryPoller()
                                        }
                                    }
                                }
                            } else {
                                // Exhausted restarts — fall to chat but KEEP monitor alive for recovery
                                localBandwidthMode = ConsultationMode.CHAT
                                _uiState.value = _uiState.value.copy(
                                    isConnected = false,
                                    hasRemoteVideo = false
                                )
                                publishModeConstraintIfNeeded()
                                applyEffectiveMediaState(
                                    banner = "Connection lost — switched to Chat mode",
                                    clearDelayMs = 8000
                                )
                                // Keep networkMonitorJob alive; start recovery poller
                                startRecoveryPoller()
                            }
                        }
                        PeerConnection.IceConnectionState.CLOSED -> {
                            // Terminal — connection is fully torn down, no recovery possible
                            _uiState.value = _uiState.value.copy(isConnected = false, hasRemoteVideo = false)
                            networkMonitorJob?.cancel()
                            recoveryPollerJob?.cancel()
                        }
                        else -> {}
                    }
                }
                onRemoteStreamRemoved = {
                    _remoteVideoTrack.value = null
                    _uiState.value = _uiState.value.copy(hasRemoteVideo = false)
                }

                // Initialize and start
                initialize()
                val localVideoTrack = try {
                    startLocalMedia()
                } catch (mediaError: Throwable) {
                    android.util.Log.w("VideoConsultationVM", "Local media fallback to audio-only: ${mediaError.message}", mediaError)
                    null
                }
                createPeerConnection()

                if (localVideoTrack == null) {
                    userPreferredMode = ConsultationMode.AUDIO
                    localBandwidthMode = ConsultationMode.AUDIO
                    applyEffectiveMediaState(
                        banner = "Camera unavailable - switched to Audio-only mode",
                        clearDelayMs = 4000
                    )
                }
            }
        } catch (error: Throwable) {
            android.util.Log.e("VideoConsultationVM", "WebRTC initialization failed: ${error.message}", error)
            releaseWebRTC()
            userPreferredMode = ConsultationMode.CHAT
            localBandwidthMode = ConsultationMode.CHAT
            _uiState.value = _uiState.value.copy(
                isConnecting = false,
                isConnected = false,
                connectionMode = ConsultationMode.CHAT,
                isMicEnabled = false,
                isCameraEnabled = false,
                modeBanner = "Video setup failed on this device - chat is still available",
                error = null
            )
        }
    }

    private fun startCallDurationTimer() {
        if (callDurationJob?.isActive == true) return

        callDurationJob = viewModelScope.launch {
            while (isActive && _uiState.value.session != null && !_uiState.value.consultationCompleted) {
                kotlinx.coroutines.delay(1000)
                if (_uiState.value.isConnected) {
                    _uiState.value = _uiState.value.copy(
                        callDuration = _uiState.value.callDuration + 1
                    )
                }
            }
        }
    }

    /**
     * Monitor network quality every 3 seconds using real WebRTC stats (RTT, loss, bitrate).
     * Uses hysteresis: requires consecutive bad/good samples before mode changes,
     * preventing aggressive fallback on transient network glitches.
     */
    private fun startNetworkQualityMonitor() {
        networkMonitorJob?.cancel()
        consecutiveDegradeCount = 0
        consecutiveRestoreCount = 0
        pendingQualityLevel = null
        networkMonitorJob = viewModelScope.launch {
            // Allow initial connection to stabilize
            kotlinx.coroutines.delay(5000)
            while (true) {
                kotlinx.coroutines.delay(STATS_POLL_INTERVAL_MS)
                val manager = webRTCManager ?: break

                // Poll real RTC stats instead of relying only on ICE state
                val snapshot = kotlinx.coroutines.suspendCancellableCoroutine { cont ->
                    manager.collectStatsSnapshot { stats ->
                        if (cont.isActive) cont.resume(stats) {}
                    }
                }

                // Combine stats quality with ICE state as a safety net
                var quality = snapshot.toNetworkQuality()
                val iceState = manager.currentIceState
                if (iceState == PeerConnection.IceConnectionState.FAILED) {
                    quality = WebRTCManager.NetworkQuality.CRITICAL
                } else if (iceState == PeerConnection.IceConnectionState.DISCONNECTED
                    && quality == WebRTCManager.NetworkQuality.GOOD) {
                    quality = WebRTCManager.NetworkQuality.POOR
                }

                applyQualityWithHysteresis(quality)
            }
        }
    }

    /**
     * When stuck in CHAT mode after ICE failure, periodically attempt ICE restart
     * to automatically recover VIDEO/AUDIO when network comes back.
     */
    private fun startRecoveryPoller() {
        recoveryPollerJob?.cancel()
        recoveryPollerJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(15_000) // Check every 15s
                if (localBandwidthMode != ConsultationMode.CHAT) {
                    // Already recovered via normal path
                    android.util.Log.d("VideoConsultationVM", "Recovery poller: mode already restored, stopping")
                    return@launch
                }
                val manager = webRTCManager ?: return@launch
                val iceState = manager.currentIceState
                android.util.Log.d("VideoConsultationVM",
                    "Recovery poller: ICE=$iceState, attempting restart")

                // Reset restart budget for recovery attempt
                iceRestartAttempts = 0
                try {
                    manager.restartIce()
                } catch (e: Exception) {
                    android.util.Log.w("VideoConsultationVM", "Recovery ICE restart failed: ${e.message}")
                }

                // Wait and check if ICE recovered
                kotlinx.coroutines.delay(8000)
                val newIceState = manager.currentIceState
                if (newIceState == PeerConnection.IceConnectionState.CONNECTED
                    || newIceState == PeerConnection.IceConnectionState.COMPLETED) {
                    android.util.Log.d("VideoConsultationVM", "Recovery poller: ICE reconnected!")
                    // The onConnectionStateChanged callback handles mode restoration
                    return@launch
                }
            }
        }
    }

    /**
     * Apply quality change only after sustained consecutive samples exceed threshold.
     * Prevents jitter: momentary dips won't trigger fallback, sustained issues will.
     */
    private fun applyQualityWithHysteresis(measured: WebRTCManager.NetworkQuality) {
        val currentMode = localBandwidthMode
        val targetMode = when (measured) {
            WebRTCManager.NetworkQuality.CRITICAL -> ConsultationMode.CHAT
            WebRTCManager.NetworkQuality.POOR -> ConsultationMode.AUDIO
            WebRTCManager.NetworkQuality.GOOD,
            WebRTCManager.NetworkQuality.EXCELLENT -> ConsultationMode.VIDEO
        }

        val isDegrading = targetMode.rank() < currentMode.rank()
        val isRestoring = targetMode.rank() > currentMode.rank()

        when {
            isDegrading -> {
                consecutiveRestoreCount = 0
                consecutiveDegradeCount++
                if (consecutiveDegradeCount >= DEGRADE_THRESHOLD) {
                    consecutiveDegradeCount = 0
                    _uiState.value = _uiState.value.copy(networkQuality = measured)
                    handleQualityChange(measured)
                }
            }
            isRestoring -> {
                consecutiveDegradeCount = 0
                consecutiveRestoreCount++
                if (consecutiveRestoreCount >= RESTORE_THRESHOLD) {
                    consecutiveRestoreCount = 0
                    _uiState.value = _uiState.value.copy(networkQuality = measured)
                    handleQualityChange(measured)
                }
            }
            else -> {
                // Stable — reset counters
                consecutiveDegradeCount = 0
                consecutiveRestoreCount = 0
                if (measured != _uiState.value.networkQuality) {
                    _uiState.value = _uiState.value.copy(networkQuality = measured)
                }
            }
        }
    }

    /**
     * Auto-degrade or restore consultation mode based on network quality.
     * VIDEO → AUDIO (poor) → CHAT (critical); restores when quality improves.
     */
    private fun handleQualityChange(quality: WebRTCManager.NetworkQuality) {
        val previousMode = localBandwidthMode
        val nextMode = when (quality) {
            WebRTCManager.NetworkQuality.CRITICAL -> ConsultationMode.CHAT
            WebRTCManager.NetworkQuality.POOR -> ConsultationMode.AUDIO
            WebRTCManager.NetworkQuality.GOOD,
            WebRTCManager.NetworkQuality.EXCELLENT -> ConsultationMode.VIDEO
        }

        if (nextMode == previousMode) return

        localBandwidthMode = nextMode
        publishModeConstraintIfNeeded()

        when {
            nextMode == ConsultationMode.CHAT -> {
                applyEffectiveMediaState(
                    banner = "⚠️ Very poor network — switched to Chat mode",
                    clearDelayMs = 8000
                )
            }
            nextMode == ConsultationMode.AUDIO && previousMode == ConsultationMode.VIDEO -> {
                applyEffectiveMediaState(
                    banner = "📶 Low bandwidth — switched to Audio-only mode",
                    clearDelayMs = 6000
                )
            }
            nextMode == ConsultationMode.AUDIO && previousMode == ConsultationMode.CHAT -> {
                applyEffectiveMediaState(
                    banner = "📶 Connection stabilizing — Audio restored",
                    clearDelayMs = 5000
                )
            }
            nextMode == ConsultationMode.VIDEO && previousMode == ConsultationMode.CHAT -> {
                applyEffectiveMediaState(
                    banner = "✅ Network recovered — Video restored!",
                    clearDelayMs = 4000
                )
            }
            nextMode == ConsultationMode.VIDEO && previousMode == ConsultationMode.AUDIO -> {
                applyEffectiveMediaState(
                    banner = "✅ Network improved — Video restored!",
                    clearDelayMs = 4000
                )
            }
            else -> applyEffectiveMediaState()
        }
    }

    private fun clearBannerAfterDelay(delayMs: Long) {
        bannerJob?.cancel()
        bannerJob = viewModelScope.launch {
            kotlinx.coroutines.delay(delayMs)
            _uiState.value = _uiState.value.copy(modeBanner = null)
        }
    }

    /**
     * Manually switch consultation mode (user override).
     */
    fun switchMode(mode: ConsultationMode) {
        if (mode == ConsultationMode.VIDEO && _localVideoTrack.value == null) {
            userPreferredMode = ConsultationMode.AUDIO
            applyEffectiveMediaState(
                banner = "Camera unavailable — staying in Audio-only mode",
                clearDelayMs = 4000
            )
            return
        }
        userPreferredMode = mode
        applyEffectiveMediaState()
    }

    /**
     * Handle incoming signaling events from Socket.IO.
     */
    private fun handleSignalingEvent(event: SignalingEvent) {
        when (event) {
            is SignalingEvent.RoomState -> {
                val sessionRoomId = _uiState.value.session?.sessionId ?: return
                if (event.roomId != sessionRoomId) return
                if (event.participants.isNotEmpty()) {
                    publishModeConstraintIfNeeded(force = true)
                    schedulePatientOfferFallback()
                }
            }
            is SignalingEvent.UserJoined -> {
                // Doctor web is the single offer initiator to avoid SDP glare.
                // If the doctor does not send an offer promptly, a delayed
                // patient fallback offer below prevents a silent stuck room.
                publishModeConstraintIfNeeded(force = true)
                schedulePatientOfferFallback()
            }
            is SignalingEvent.Offer -> {
                // Received offer — set remote description and create answer
                hasReceivedRemoteOffer = true
                patientOfferFallbackJob?.cancel()
                webRTCManager?.handleRemoteOffer(event.sdp, event.type)
            }
            is SignalingEvent.Answer -> {
                // Received answer — set remote description
                hasReceivedRemoteAnswer = true
                webRTCManager?.handleRemoteAnswer(event.sdp, event.type)
            }
            is SignalingEvent.IceCandidate -> {
                // Add remote ICE candidate
                webRTCManager?.addIceCandidate(event.sdpMid, event.sdpMLineIndex, event.sdp)
            }
            is SignalingEvent.ModeChanged -> {
                val sessionRoomId = _uiState.value.session?.sessionId ?: return
                if (event.roomId != sessionRoomId) return

                val nextRemoteMode = consultationModeFromWire(event.mode)
                if (nextRemoteMode == remoteRequestedMode) return

                val previousRemoteMode = remoteRequestedMode
                remoteRequestedMode = nextRemoteMode
                when {
                    nextRemoteMode == ConsultationMode.CHAT -> {
                        applyEffectiveMediaState(
                            banner = "Doctor switched to Chat mode due to network constraints",
                            clearDelayMs = 8000
                        )
                    }
                    nextRemoteMode == ConsultationMode.AUDIO -> {
                        applyEffectiveMediaState(
                            banner = "Doctor switched to Audio-only mode due to network constraints",
                            clearDelayMs = 6000
                        )
                    }
                    previousRemoteMode != ConsultationMode.VIDEO -> {
                        applyEffectiveMediaState(
                            banner = "Doctor's network recovered — Video restored!",
                            clearDelayMs = 4000
                        )
                    }
                    else -> applyEffectiveMediaState()
                }
            }
            is SignalingEvent.UserLeft -> {
                remoteRequestedMode = ConsultationMode.VIDEO
                // Remote user left — clean up
                _remoteVideoTrack.value = null
                _uiState.value = _uiState.value.copy(
                    isConnected = false,
                    hasRemoteVideo = false,
                    modeBanner = "Doctor left the video room"
                )
            }
        }
    }

    private fun schedulePatientOfferFallback() {
        val session = _uiState.value.session ?: return
        if (session.sessionId.isBlank() || _uiState.value.isConnected) return
        if (hasSentLocalOffer || hasReceivedRemoteOffer || hasReceivedRemoteAnswer) return

        patientOfferFallbackJob?.cancel()
        patientOfferFallbackJob = viewModelScope.launch {
            // Let the doctor web client be the normal offer initiator. A longer
            // fallback avoids SDP glare while still recovering if the doctor
            // missed the join event because of a socket reconnect/race.
            kotlinx.coroutines.delay(5000)
            if (_uiState.value.session?.sessionId != session.sessionId) return@launch
            if (_uiState.value.isConnected || hasSentLocalOffer || hasReceivedRemoteOffer || hasReceivedRemoteAnswer) return@launch
            android.util.Log.d("VideoConsultationVM", "Creating delayed patient offer fallback")
            webRTCManager?.createOffer()
        }
    }

    private fun handleConsultationEnded(event: ConsultationEndedEvent) {
        val session = _uiState.value.session
        if (session == null) {
            val pendingId = pendingAppointmentId
            if (!pendingId.isNullOrBlank() && event.appointmentId == pendingId) {
                pendingAppointmentId = null
                pendingJoinRetryJob?.cancel()
                releaseWebRTC()
                _uiState.value = _uiState.value.copy(
                    isConnecting = false,
                    isWaitingForDoctor = false,
                    consultationCompleted = false,
                    modeBanner = null,
                    error = "Doctor ended the consultation before you could join."
                )
            }
            return
        }
        val activeConsultationId = session.consultationId.ifEmpty { session.sessionId }
        if (event.consultationId != activeConsultationId) return

        pendingAppointmentId = null
        pendingJoinRetryJob?.cancel()
        socketManager.leaveVideoRoom(session.sessionId)
        socketManager.leaveChat(session.sessionId)
        releaseWebRTC()
        _uiState.value = VideoConsultationUiState(
            consultationCompleted = true,
            modeBanner = "Consultation completed"
        )
    }

    private fun handleConsultationStarted(event: ConsultationStartedEvent) {
        val appointmentId = pendingAppointmentId ?: return
        if (event.appointmentId != appointmentId) return

        pendingJoinRetryJob?.cancel()
        pendingJoinRetryJob = viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isConnecting = true,
                isWaitingForDoctor = false,
                error = null,
                modeBanner = "Doctor is ready. Opening your consultation room..."
            )

            repeat(3) { attempt ->
                when (val result = appointmentRepository.joinVideoConsultation(appointmentId)) {
                    is Result.Success -> {
                        onConsultationJoinSuccess(result.data)
                        return@launch
                    }
                    is Result.Error -> {
                        if (shouldWaitForDoctor(result.message) && attempt < 2) {
                            kotlinx.coroutines.delay(750)
                        } else if (shouldWaitForDoctor(result.message)) {
                            beginWaitingForDoctor(appointmentId)
                            return@launch
                        } else {
                            releaseWebRTC()
                            _uiState.value = _uiState.value.copy(
                                isConnecting = false,
                                isWaitingForDoctor = false,
                                error = result.message,
                                modeBanner = null
                            )
                            return@launch
                        }
                    }
                    is Result.Loading -> Unit
                }
            }
        }
    }

    fun loadMedicalRecordAccess(appointmentId: String) {
        if (appointmentId.isBlank()) return
        currentAppointmentId = appointmentId

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isMedicalRecordAccessLoading = true,
                medicalRecordAccessMessage = null
            )

            when (val result = appointmentRepository.getMedicalRecordAccess(appointmentId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        hasMedicalRecordAccess = result.data.hasAccess,
                        medicalRecordAccessExpiresAt = result.data.expiresAt,
                        medicalRecordAccessMessage = null
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        hasMedicalRecordAccess = false,
                        medicalRecordAccessExpiresAt = null,
                        medicalRecordAccessMessage = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun grantMedicalRecordAccess() {
        val appointmentId = currentAppointmentId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isMedicalRecordAccessLoading = true,
                medicalRecordAccessMessage = null
            )

            when (val result = appointmentRepository.grantMedicalRecordAccess(appointmentId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        hasMedicalRecordAccess = result.data.hasAccess,
                        medicalRecordAccessExpiresAt = result.data.expiresAt,
                        medicalRecordAccessMessage = "Only this doctor can view your older records for the next 24 hours, unless you revoke access sooner."
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        medicalRecordAccessMessage = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun revokeMedicalRecordAccess() {
        val appointmentId = currentAppointmentId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isMedicalRecordAccessLoading = true,
                medicalRecordAccessMessage = null
            )

            when (val result = appointmentRepository.revokeMedicalRecordAccess(appointmentId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        hasMedicalRecordAccess = false,
                        medicalRecordAccessExpiresAt = null,
                        medicalRecordAccessMessage = "Doctor access to older records has been revoked."
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isMedicalRecordAccessLoading = false,
                        medicalRecordAccessMessage = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    /**
     * Join a video consultation for the given appointment.
     */
    fun joinConsultation(appointmentId: String) {
        viewModelScope.launch {
            resetModeControllers()
            pendingAppointmentId = appointmentId
            currentAppointmentId = appointmentId
            _uiState.value = _uiState.value.copy(
                isConnecting = true,
                isWaitingForDoctor = false,
                error = null,
                consultationCompleted = false,
                callDuration = 0L,
                modeBanner = null
            )

            when (val result = appointmentRepository.joinVideoConsultation(appointmentId)) {
                is Result.Success -> {
                    onConsultationJoinSuccess(result.data)
                }
                is Result.Error -> {
                    if (shouldWaitForDoctor(result.message)) {
                        beginWaitingForDoctor(appointmentId)
                    } else {
                        releaseWebRTC()
                        _uiState.value = _uiState.value.copy(
                            isConnecting = false,
                            isWaitingForDoctor = false,
                            error = result.message,
                            modeBanner = null
                        )
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    private fun onConsultationJoinSuccess(session: VideoCallSession) {
        pendingAppointmentId = null
        pendingJoinRetryJob?.cancel()

        // Fetch server-side ICE config (STUN/TURN) before creating PeerConnection.
        // This unifies ICE delivery with the web client's approach.
        viewModelScope.launch {
            val consultationId = session.consultationId.ifEmpty { session.sessionId }
            when (val iceResult = appointmentRepository.getConsultationIceServers(consultationId)) {
                is Result.Success -> {
                    val servers = iceResult.data
                    if (servers.isNotEmpty()) {
                        android.util.Log.d("VideoConsultationVM",
                            "Loaded ${servers.size} ICE servers from backend")
                        // Will be applied when WebRTCManager creates peer connection
                        initializeWebRTC(iceServers = servers)
                    } else {
                        initializeWebRTC() // Use default STUN/TURN from ApiConfig
                    }
                }
                is Result.Error -> {
                    android.util.Log.w("VideoConsultationVM",
                        "ICE server fetch failed, using defaults: ${iceResult.message}")
                    initializeWebRTC()
                }
                is Result.Loading -> initializeWebRTC()
            }

            _uiState.value = _uiState.value.copy(
                isConnecting = false,
                isWaitingForDoctor = false,
                session = session,
                consultationCompleted = false,
                error = null,
                modeBanner = null,
                callDuration = 0L
            )

            // Join signaling/chat rooms only after the session is present in state.
            appointmentRepository.joinVideoRoom(session.sessionId)
            appointmentRepository.joinChat(session.sessionId)
            publishModeConstraintIfNeeded(force = true)
            applyEffectiveMediaState()
        }
    }

    private fun beginWaitingForDoctor(appointmentId: String) {
        pendingAppointmentId = appointmentId
        currentAppointmentId = appointmentId
        pendingJoinRetryJob?.cancel()
        releaseWebRTC()
        socketManager.connect()
        _uiState.value = _uiState.value.copy(
            isConnecting = false,
            isWaitingForDoctor = true,
            error = null,
            session = null,
            modeBanner = "Waiting for the doctor to start the consultation",
            callDuration = 0L
        )
    }

    private fun shouldWaitForDoctor(message: String?): Boolean {
        val normalized = message?.lowercase().orEmpty()
        return normalized.contains("hasn't started")
            || normalized.contains("has not started")
            || normalized.contains("active consultation not found")
            || normalized.contains("consultation not found")
            || normalized.contains("please wait for the doctor")
    }

    /**
     * Send a WebRTC offer SDP (legacy — now handled automatically by WebRTCManager callbacks).
     */
    fun sendOffer(sdp: String, type: String) {
        val roomId = _uiState.value.session?.sessionId ?: return
        appointmentRepository.sendOffer(roomId, sdp, type)
    }

    /**
     * Send a WebRTC answer SDP (legacy — now handled automatically by WebRTCManager callbacks).
     */
    fun sendAnswer(sdp: String, type: String) {
        val roomId = _uiState.value.session?.sessionId ?: return
        appointmentRepository.sendAnswer(roomId, sdp, type)
    }

    /**
     * Send an ICE candidate (legacy — now handled automatically by WebRTCManager callbacks).
     */
    fun sendIceCandidate(sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        val roomId = _uiState.value.session?.sessionId ?: return
        appointmentRepository.sendIceCandidate(roomId, sdpMid, sdpMLineIndex, candidate)
    }

    /**
     * Send a chat message during consultation.
     */
    fun sendChatMessage(message: String) {
        val consultationId = _uiState.value.session?.sessionId ?: return
        appointmentRepository.sendChatMessage(consultationId, message)
        // Delivery is confirmed asynchronously via the socket ack flow.
    }

    /**
     * Toggle microphone.
     */
    fun toggleMic() {
        userMicPreference = !userMicPreference
        applyEffectiveMediaState()
    }

    /**
     * Toggle camera.
     */
    fun toggleCamera() {
        if (_localVideoTrack.value == null) {
            userPreferredMode = ConsultationMode.AUDIO
            applyEffectiveMediaState(
                banner = "Camera unavailable — staying in Audio-only mode",
                clearDelayMs = 4000
            )
            return
        }
        userPreferredMode = if (userPreferredMode == ConsultationMode.VIDEO) {
            ConsultationMode.AUDIO
        } else {
            ConsultationMode.VIDEO
        }
        applyEffectiveMediaState()
    }

    fun toggleSpeaker() {
        val newState = !_uiState.value.isSpeakerOn
        applySpeakerRoute(newState)
        _uiState.value = _uiState.value.copy(isSpeakerOn = newState)
    }

    /**
     * Switch between front/back camera.
     */
    fun switchCamera() {
        webRTCManager?.switchCamera()
    }

    /**
     * End the consultation call.
     * Notifies backend, leaves socket room, releases WebRTC resources.
     */
    fun endCall() {
        val session = _uiState.value.session ?: return
        val roomId = session.sessionId
        val consultationId = session.consultationId.ifEmpty { roomId }

        pendingAppointmentId = null
        pendingJoinRetryJob?.cancel()
        // 1. Notify backend that consultation has ended
        viewModelScope.launch {
            appointmentRepository.endConsultation(consultationId)
        }

        // 2. Leave socket room and release local resources
        socketManager.leaveVideoRoom(roomId)
        socketManager.leaveChat(roomId)
        releaseWebRTC()
        _uiState.value = VideoConsultationUiState(consultationCompleted = true)
    }

    private var vitalsStreamJob: kotlinx.coroutines.Job? = null
    private var vitalsWebSocket: okhttp3.WebSocket? = null
    private val okHttpClient = okhttp3.OkHttpClient()

    private fun startVitalsStreaming() {
        vitalsStreamJob?.cancel()
        vitalsStreamJob = viewModelScope.launch {
            val sessionId = _uiState.value.session?.sessionId ?: return@launch
            // JWT from EncryptedSharedPreferences — null in dev, added as query param in prod
            val token = tokenManager.accessToken
            // In-memory payload buffer for reconnect replay (capped at 50 entries)
            val pendingPayloads = ArrayDeque<String>()
            var reconnectAttempts = 0

            while (coroutineContext.isActive) {
                // ── Build authenticated WebSocket URL ──────────────────────
                val authSuffix = if (token != null)
                    "?token=${java.net.URLEncoder.encode(token, "UTF-8")}" else ""
                val request = okhttp3.Request.Builder()
                    .url("${ApiConfig.AI_WS_URL}/ws/vitals/$sessionId/patient$authSuffix")
                    .build()

                vitalsWebSocket = okHttpClient.newWebSocket(request, object : okhttp3.WebSocketListener() {
                    override fun onOpen(webSocket: okhttp3.WebSocket, response: okhttp3.Response) {
                        android.util.Log.d("VitalsStream", "✅ Connected to FastAPI AI Service")
                        reconnectAttempts = 0
                        // Flush buffered payloads from previous disconnection
                        while (pendingPayloads.isNotEmpty()) {
                            webSocket.send(pendingPayloads.removeFirst())
                        }
                    }
                    override fun onMessage(webSocket: okhttp3.WebSocket, text: String) {
                        // Respond to server keepalive pings with pong
                        try {
                            val msg = org.json.JSONObject(text)
                            if (msg.optString("type") == "ping") {
                                webSocket.send(
                                    org.json.JSONObject()
                                        .put("type", "pong")
                                        .put("ts", msg.optDouble("ts"))
                                        .toString()
                                )
                            }
                        } catch (_: Exception) {}
                    }
                    override fun onFailure(webSocket: okhttp3.WebSocket, t: Throwable, response: okhttp3.Response?) {
                        android.util.Log.e("VitalsStream", "Vitals WS failure: ${t.message}")
                        vitalsWebSocket = null
                    }
                    override fun onClosed(webSocket: okhttp3.WebSocket, code: Int, reason: String) {
                        android.util.Log.d("VitalsStream", "Vitals WS closed: $code $reason")
                        vitalsWebSocket = null
                    }
                })

                // Allow brief time for OkHttp to open the connection before ticking
                kotlinx.coroutines.delay(600)

                // ── CV tick loop at 1.5 Hz while WebSocket is alive ────────
                while (coroutineContext.isActive) {
                    kotlinx.coroutines.delay(1500) // 1.5 Hz — 666ms per frame, low-bandwidth
                    if (!_uiState.value.isConnected) continue
                    // Stream CV vitals only while the consultation camera is actively enabled.
                    val cameraActivelyEnabled = _uiState.value.isCameraEnabled && _localVideoTrack.value != null
                    if (!cameraActivelyEnabled) continue
                    
                    val cvMetrics = cvAnalyzer?.vitalsData?.value ?: ComputerVisionAnalyzer.CVMetrics()
                    val metricsAgeMs = System.currentTimeMillis() - cvMetrics.capturedAtMs
                    val hasFreshFrame = cvMetrics.isFaceDetected && cvMetrics.capturedAtMs > 0L && metricsAgeMs <= 4_000L
                    if (!hasFreshFrame) continue

                    val payload = org.json.JSONObject().apply {
                        put("session_id", sessionId)
                        putIfNotNull("heart_rate", cvMetrics.heartRate)
                        putIfNotNull("respiration_rate", cvMetrics.respirationRate)
                        putIfNotNull("posture", cvMetrics.posture)
                        putIfNotNull("spine_angle", cvMetrics.spineAngle)
                        putIfNotNull("drowsiness_score", cvMetrics.drowsinessScore)
                        putIfNotNull("pain_score", cvMetrics.painScore)
                        putIfNotNull("facial_asymmetry_score", cvMetrics.facialAsymmetryScore)
                        putIfNotNull("tremor_detected", cvMetrics.tremorDetected)
                        putIfNotNull("tremor_severity", cvMetrics.tremorSeverity)
                        putIfNotNull("tremor_frequency", cvMetrics.tremorFrequency)
                        putIfNotNull("pallor_score", cvMetrics.pallorScore)
                        putIfNotNull("hemoglobin_estimate", cvMetrics.hemoglobinEstimate)
                        putIfNotNull("spo2", cvMetrics.spo2)
                        // MOD-2: Add missing CV signals that the AI service expects
                        putIfNotNull("stress_level", cvMetrics.stressLevel)
                        putIfNotNull("skin_condition", cvMetrics.skinCondition)
                        put("processed_at", java.time.Instant.now().toString())
                    }.toString()

                    val ws = vitalsWebSocket
                    if (ws != null) {
                        ws.send(payload)
                    } else {
                        // WebSocket dropped — buffer payload and break to reconnect
                        if (pendingPayloads.size < 50) pendingPayloads.addLast(payload)
                        break
                    }
                }

                if (!coroutineContext.isActive) break

                // ── Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s cap
                val backoffMs = minOf(1000L * (1L shl reconnectAttempts.coerceAtMost(5)), 30_000L)
                reconnectAttempts++
                android.util.Log.d("VitalsStream", "⏳ Reconnecting in ${backoffMs}ms (attempt #$reconnectAttempts)")
                kotlinx.coroutines.delay(backoffMs)
            }
        }
    }

    private fun releaseWebRTC() {
        patientOfferFallbackJob?.cancel()
        patientOfferFallbackJob = null
        hasSentLocalOffer = false
        hasReceivedRemoteOffer = false
        hasReceivedRemoteAnswer = false
        networkMonitorJob?.cancel()
        networkMonitorJob = null
        recoveryPollerJob?.cancel()
        recoveryPollerJob = null
        callDurationJob?.cancel()
        callDurationJob = null
        vitalsStreamJob?.cancel()
        vitalsStreamJob = null
        vitalsWebSocket?.close(1000, "Consultation Ended")
        vitalsWebSocket = null
        _localVideoTrack.value = null
        _remoteVideoTrack.value = null
        cvAnalyzer?.release()
        cvAnalyzer = null
        webRTCManager?.release()
        webRTCManager = null
        isWebRTCInitialized = false
        resetAudioRoute()
    }

    private fun resetModeControllers() {
        userPreferredMode = ConsultationMode.VIDEO
        localBandwidthMode = ConsultationMode.VIDEO
        remoteRequestedMode = ConsultationMode.VIDEO
        userMicPreference = true
        lastPublishedModeConstraint = ConsultationMode.VIDEO
        
        consecutiveDegradeCount = 0
        consecutiveRestoreCount = 0
        pendingQualityLevel = null
        iceRestartAttempts = 0
    }

    private fun effectiveMode(): ConsultationMode =
        mostRestrictiveMode(userPreferredMode, localBandwidthMode, remoteRequestedMode)

    private fun applyEffectiveMediaState(
        banner: String? = null,
        clearDelayMs: Long? = null
    ) {
        val effectiveMode = effectiveMode()
        val micEnabled = userMicPreference && effectiveMode != ConsultationMode.CHAT
        val cameraEnabled = effectiveMode == ConsultationMode.VIDEO

        webRTCManager?.setMicEnabled(micEnabled)
        webRTCManager?.setCameraEnabled(cameraEnabled)

        _uiState.value = _uiState.value.copy(
            connectionMode = effectiveMode,
            isMicEnabled = micEnabled,
            isCameraEnabled = cameraEnabled,
            modeBanner = banner ?: _uiState.value.modeBanner
        )

        if (banner != null && clearDelayMs != null) {
            clearBannerAfterDelay(clearDelayMs)
        }
    }

    private fun publishModeConstraintIfNeeded(force: Boolean = false) {
        val roomId = _uiState.value.session?.sessionId ?: return
        if (!force && localBandwidthMode == lastPublishedModeConstraint) return
        socketManager.sendVideoMode(roomId, localBandwidthMode.toWireValue())
        lastPublishedModeConstraint = localBandwidthMode
    }

    private fun applySpeakerRoute(isSpeakerOn: Boolean) {
        try {
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val targetType = if (isSpeakerOn) AudioDeviceInfo.TYPE_BUILTIN_SPEAKER else AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
                val communicationDevices = audioManager.availableCommunicationDevices
                val communicationDevice = communicationDevices
                    .firstOrNull { it.type == targetType }
                    ?: communicationDevices.firstOrNull()
                if (communicationDevice != null) {
                    audioManager.setCommunicationDevice(communicationDevice)
                } else {
                    audioManager.clearCommunicationDevice()
                }
            } else {
                @Suppress("DEPRECATION")
                run {
                    audioManager.isSpeakerphoneOn = isSpeakerOn
                }
            }
        } catch (error: SecurityException) {
            android.util.Log.w("VideoConsultationVM", "Audio routing permission denied: ${error.message}")
        } catch (error: RuntimeException) {
            android.util.Log.w("VideoConsultationVM", "Audio routing unavailable: ${error.message}")
        }
    }

    private fun resetAudioRoute() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice()
            } else {
                @Suppress("DEPRECATION")
                run {
                    audioManager.isSpeakerphoneOn = false
                }
            }
            audioManager.mode = AudioManager.MODE_NORMAL
        } catch (error: RuntimeException) {
            android.util.Log.w("VideoConsultationVM", "Unable to reset audio route: ${error.message}")
        }
    }

    fun dismissCompletion() {
        _uiState.value = _uiState.value.copy(
            consultationCompleted = false,
            modeBanner = null
        )
    }

    private fun org.json.JSONObject.putIfNotNull(key: String, value: Any?) {
        if (value != null) {
            put(key, value)
        }
    }

    override fun onCleared() {
        super.onCleared()
        val roomId = _uiState.value.session?.sessionId
        if (roomId != null) {
            socketManager.leaveVideoRoom(roomId)
            socketManager.leaveChat(roomId)
        }
        releaseWebRTC()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun submitReview(rating: Int, comment: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            val appointmentId = pendingAppointmentId ?: currentAppointmentId
            if (appointmentId == null) {
                onComplete()
                return@launch
            }
            
            try {
                // First get appointment to get doctorId
                val appointmentResult = appointmentRepository.getAppointmentDetails(appointmentId)
                if (appointmentResult is Result.Success) {
                    val doctorId = appointmentResult.data.doctorId
                    val consultationId = _uiState.value.session?.consultationId?.ifEmpty { _uiState.value.session?.sessionId }
                    appointmentRepository.submitDoctorReview(doctorId, consultationId, rating, comment.ifBlank { null })
                }
            } catch (e: Exception) {
                // Ignore failure for review
            } finally {
                onComplete()
            }
        }
    }
}
