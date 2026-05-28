package com.example.swastik.data.webrtc

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.swastik.data.remote.ApiConfig
import org.webrtc.*
import org.webrtc.audio.AudioDeviceModule
import org.webrtc.audio.JavaAudioDeviceModule
import java.util.concurrent.CopyOnWriteArrayList

/**
 * WebRTC Manager — handles the full lifecycle of a WebRTC peer connection.
 *
 * Responsibilities:
 * - Initialize PeerConnectionFactory with hardware codecs
 * - Capture local camera and microphone
 * - Create/manage PeerConnection with ICE servers
 * - Handle offer/answer/ICE candidate exchange
 * - Provide local and remote VideoTrack for rendering
 *
 * The signaling (sending/receiving offers, answers, ICE candidates) is delegated
 * to the ViewModel layer, which uses Socket.IO via AppointmentRepository.
 */
class WebRTCManager(
    private val context: Context
) {
    companion object {
        private const val TAG = "WebRTCManager"

        /** Default ICE servers — used when backend ICE config is unavailable. */
        private fun defaultIceServers(): List<PeerConnection.IceServer> {
            val servers = mutableListOf(
                PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
                PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
            )

            if (ApiConfig.TURN_URL.isNotBlank()) {
                servers += PeerConnection.IceServer.builder(ApiConfig.TURN_URL)
                    .setUsername(ApiConfig.TURN_USERNAME)
                    .setPassword(ApiConfig.TURN_CREDENTIAL)
                    .createIceServer()
            }

            return servers
        }
    }

    /**
     * ICE servers to use for peer connection. Should be set from backend
     * response (e.g., GET /consultations/:id/ice-servers) before calling
     * [createPeerConnection]. Falls back to STUN-only if not set.
     */
    var iceServers: List<PeerConnection.IceServer> = defaultIceServers()

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var videoCapturer: CameraVideoCapturer? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    private var isReleased = false

    // ICE candidate buffer — queue candidates received before remote description is set
    // CopyOnWriteArrayList is thread-safe since WebRTC callbacks arrive on different threads
    private val pendingIceCandidates = CopyOnWriteArrayList<IceCandidate>()
    @Volatile
    private var hasRemoteDescription = false

    val eglBase: EglBase by lazy { EglBase.create() }

    // Callbacks — set by the ViewModel
    var onLocalVideoTrack: ((VideoTrack) -> Unit)? = null
    var onRemoteVideoTrack: ((VideoTrack) -> Unit)? = null
    var onIceCandidateGenerated: ((IceCandidate) -> Unit)? = null
    var onOfferCreated: ((SessionDescription) -> Unit)? = null
    var onAnswerCreated: ((SessionDescription) -> Unit)? = null
    var onConnectionStateChanged: ((PeerConnection.IceConnectionState) -> Unit)? = null
    var onRemoteStreamRemoved: (() -> Unit)? = null
    var onNetworkQualityChanged: ((NetworkQuality) -> Unit)? = null

    /** Network quality classification */
    enum class NetworkQuality { EXCELLENT, GOOD, POOR, CRITICAL }

    /**
     * Snapshot of real-time WebRTC transport metrics extracted from PeerConnection stats.
     * Used by ViewModel to make fine-grained fallback/restore decisions.
     */
    data class StatsSnapshot(
        val roundTripTimeMs: Double = -1.0,
        val packetLossPercent: Double = 0.0,
        val availableBitrateBps: Long = -1,
        val audioBitrateBps: Long = 0,
        val videoBitrateBps: Long = 0,
        val audioBytesSent: Long = 0,
        val videoBytesSent: Long = 0,
        val timestampMs: Long = System.currentTimeMillis()
    ) {
        /** Map stats thresholds to a NetworkQuality level. */
        fun toNetworkQuality(currentMode: String = "video"): NetworkQuality {
            val isVideoActive = currentMode.equals("video", ignoreCase = true)
            val modeBitrate = if (isVideoActive) videoBitrateBps else audioBitrateBps
            val estimatedCapacityBps = if (availableBitrateBps > 0) availableBitrateBps else modeBitrate

            return when {
            // CRITICAL: >15% loss OR RTT >800ms
            packetLossPercent > 15.0 || (roundTripTimeMs > 800 && roundTripTimeMs > 0) -> NetworkQuality.CRITICAL
            // POOR: sustained transport issues. Do not downgrade on bitrate alone:
            // static frames and codec adaptation can look "low bitrate" on a healthy link.
            packetLossPercent > 5.0 || (roundTripTimeMs > 400 && roundTripTimeMs > 0) -> NetworkQuality.POOR
            // EXCELLENT: low loss/latency plus enough estimated network capacity.
            packetLossPercent < 1.0 && roundTripTimeMs in 0.0..100.0 &&
                (
                    (isVideoActive && estimatedCapacityBps > 500_000) ||
                    (!isVideoActive && estimatedCapacityBps > 24_000)
                ) -> NetworkQuality.EXCELLENT
            // GOOD: everything else
            else -> NetworkQuality.GOOD
            }
        }
    }

    /** Current ICE connection state for external checks */
    val currentIceState: PeerConnection.IceConnectionState?
        get() = peerConnection?.iceConnectionState()

    /** Previous byte counters for delta-based bitrate calculation */
    @Volatile private var prevAudioBytesSent: Long = 0
    @Volatile private var prevVideoBytesSent: Long = 0
    @Volatile private var prevStatsTimestampMs: Long = 0
    /** Previous packet counters for delta-based loss calculation */
    @Volatile private var prevPacketsSent: Long = 0
    @Volatile private var prevPacketsLost: Long = 0

    /**
     * Get the underlying PeerConnection for stats polling.
     * Used by ViewModel to monitor network quality.
     */
    fun getPeerConnection(): PeerConnection? = peerConnection

    /**
     * Asynchronously collect a [StatsSnapshot] from the live PeerConnection.
     *
     * Extracts RTT, packet loss, and bitrate from the RTCStatsReport —
     * the same signals the web client uses for its quality classifier.
     *
     * @param callback Receives the snapshot on a WebRTC internal thread;
     *                 callers should post to their own dispatcher if needed.
     */
    fun collectStatsSnapshot(callback: (StatsSnapshot) -> Unit) {
        val pc = peerConnection
        if (pc == null) {
            callback(StatsSnapshot())
            return
        }

        pc.getStats { report ->
            var rtt = -1.0
            var packetsSent = 0L
            var packetsLost = 0L
            var audioBytes = 0L
            var videoBytes = 0L
            var availableBitrate = -1L

            for (stats in report.statsMap.values) {
                when (stats.type) {
                    // candidate-pair gives RTT
                    "candidate-pair" -> {
                        val nominated = stats.members["nominated"]
                        if (nominated == true || nominated == "true") {
                            val currentRtt = stats.members["currentRoundTripTime"]
                            if (currentRtt is Number) {
                                rtt = currentRtt.toDouble() * 1000.0 // seconds → ms
                            }
                            val bw = stats.members["availableOutgoingBitrate"]
                            if (bw is Number) {
                                availableBitrate = bw.toLong()
                            }
                        }
                    }
                    // outbound-rtp gives bytes sent and packet counts
                    "outbound-rtp" -> {
                        val kind = stats.members["kind"] ?: stats.members["mediaType"]
                        val bytes = (stats.members["bytesSent"] as? Number)?.toLong() ?: 0L
                        when (kind) {
                            "audio" -> audioBytes = bytes
                            "video" -> videoBytes = bytes
                        }
                    }
                    // remote-inbound-rtp gives packet loss from receiver reports
                    "remote-inbound-rtp" -> {
                        val sent = (stats.members["packetsSent"] as? Number)?.toLong()
                            ?: (stats.members["packetsReceived"] as? Number)?.toLong() ?: 0L
                        val lost = (stats.members["packetsLost"] as? Number)?.toLong() ?: 0L
                        packetsSent += sent + lost
                        packetsLost += lost
                    }
                }
            }

            // Compute DELTA-based packet loss (loss during THIS polling interval only).
            // Cumulative loss never decreases, which would cause permanent false degradation
            // even after network fully recovers. Delta-based loss correctly shows 0% once fixed.
            val deltaPacketsSent = packetsSent - prevPacketsSent
            val deltaPacketsLost = packetsLost - prevPacketsLost
            val lossPercent = if (deltaPacketsSent > 0 && prevStatsTimestampMs > 0) {
                ((deltaPacketsLost.coerceAtLeast(0)).toDouble() / deltaPacketsSent.toDouble()) * 100.0
            } else 0.0
            prevPacketsSent = packetsSent
            prevPacketsLost = packetsLost

            // Compute instantaneous send bitrate from byte deltas
            val nowMs = System.currentTimeMillis()
            val deltaMs = nowMs - prevStatsTimestampMs
            var audioBitrateBps = 0L
            var videoBitrateBps = 0L
            if (deltaMs > 0 && prevStatsTimestampMs > 0) {
                val deltaAudioBytes = audioBytes - prevAudioBytesSent
                val deltaVideoBytes = videoBytes - prevVideoBytesSent
                val deltaBytes = deltaAudioBytes + deltaVideoBytes
                if (deltaAudioBytes >= 0) {
                    audioBitrateBps = (deltaAudioBytes * 8 * 1000) / deltaMs
                }
                if (deltaVideoBytes >= 0) {
                    videoBitrateBps = (deltaVideoBytes * 8 * 1000) / deltaMs
                }
                if (deltaBytes >= 0) {
                    val instantBps = (deltaBytes * 8 * 1000) / deltaMs
                    if (availableBitrate < 0) {
                        availableBitrate = instantBps
                    }
                }
            }
            prevAudioBytesSent = audioBytes
            prevVideoBytesSent = videoBytes
            prevStatsTimestampMs = nowMs

            Log.d(TAG, "Stats: rtt=${rtt}ms loss=${String.format("%.1f", lossPercent)}% " +
                "bw=${availableBitrate}bps deltaPktSent=$deltaPacketsSent deltaPktLost=$deltaPacketsLost")

            callback(
                StatsSnapshot(
                    roundTripTimeMs = rtt,
                    packetLossPercent = lossPercent,
                    availableBitrateBps = availableBitrate,
                    audioBitrateBps = audioBitrateBps,
                    videoBitrateBps = videoBitrateBps,
                    audioBytesSent = audioBytes,
                    videoBytesSent = videoBytes,
                    timestampMs = nowMs
                )
            )
        }
    }

    /**
     * Initialize the PeerConnectionFactory. Must be called once before anything else.
     */
    fun initialize() {
        Log.d(TAG, "Initializing PeerConnectionFactory")

        val initOptions = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(false)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initOptions)

        val encoderFactory = DefaultVideoEncoderFactory(
            eglBase.eglBaseContext, true, true
        )
        val decoderFactory = DefaultVideoDecoderFactory(eglBase.eglBaseContext)

        val audioDeviceModule = try {
            JavaAudioDeviceModule.builder(context)
                .setAudioRecordErrorCallback(object : JavaAudioDeviceModule.AudioRecordErrorCallback {
                    override fun onWebRtcAudioRecordInitError(errorMessage: String?) {
                        Log.e(TAG, "AudioRecord init error: $errorMessage")
                    }
                    override fun onWebRtcAudioRecordStartError(errorCode: JavaAudioDeviceModule.AudioRecordStartErrorCode?, errorMessage: String?) {
                        Log.e(TAG, "AudioRecord start error: $errorMessage")
                    }
                    override fun onWebRtcAudioRecordError(errorMessage: String?) {
                        Log.e(TAG, "AudioRecord error: $errorMessage")
                    }
                })
                .createAudioDeviceModule()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create JavaAudioDeviceModule: ${e.message}")
            JavaAudioDeviceModule.builder(context).setUseHardwareAcousticEchoCanceler(false).setUseHardwareNoiseSuppressor(false).createAudioDeviceModule()
        }

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setAudioDeviceModule(audioDeviceModule)
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()

        Log.d(TAG, "PeerConnectionFactory initialized")
    }

    /**
     * Start local camera and microphone capture.
     * Returns the local VideoTrack so the UI can render it.
     */
    fun startLocalMedia(): VideoTrack? {
        val factory = peerConnectionFactory ?: run {
            Log.e(TAG, "PeerConnectionFactory not initialized")
            return null
        }
        val hasCameraPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        val hasMicPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        // --- Audio ---
        if (hasMicPermission) {
            val audioConstraints = MediaConstraints().apply {
                mandatory.add(MediaConstraints.KeyValuePair("echoCancellation", "true"))
                mandatory.add(MediaConstraints.KeyValuePair("noiseSuppression", "true"))
                mandatory.add(MediaConstraints.KeyValuePair("autoGainControl", "true"))
            }
            val audioSource = factory.createAudioSource(audioConstraints)
            localAudioTrack = factory.createAudioTrack("audio_local", audioSource)
            localAudioTrack?.setEnabled(true)
        } else {
            Log.w(TAG, "Microphone permission missing; joining without local audio")
        }

        // --- Video ---
        if (!hasCameraPermission) {
            Log.w(TAG, "Camera permission missing; joining without local video")
            return null
        }

        videoCapturer = createCameraCapturer()
        if (videoCapturer == null) {
            Log.e(TAG, "No camera found on device")
            return null
        }

        try {
            surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBase.eglBaseContext)
            val videoSource = factory.createVideoSource(videoCapturer!!.isScreencast)
            videoCapturer!!.initialize(surfaceTextureHelper, context, videoSource.capturerObserver)
            startCaptureWithFallback(videoCapturer!!)

            localVideoTrack = factory.createVideoTrack("video_local", videoSource)
            localVideoTrack?.setEnabled(true)
        } catch (error: Exception) {
            Log.w(TAG, "Video capture unavailable; continuing without local video: ${error.message}")
            try {
                videoCapturer?.dispose()
            } catch (_: Exception) {}
            videoCapturer = null
            surfaceTextureHelper?.dispose()
            surfaceTextureHelper = null
            return null
        }

        Log.d(TAG, "Local media started")
        localVideoTrack?.let { onLocalVideoTrack?.invoke(it) }
        return localVideoTrack
    }

    /**
     * Try higher capture quality first, then gracefully fallback.
     * WebRTC then adapts bitrate dynamically based on network conditions.
     */
    private fun startCaptureWithFallback(capturer: CameraVideoCapturer) {
        val profiles = listOf(
            Triple(1280, 720, 30),
            Triple(960, 540, 24),
            Triple(640, 480, 20),
        )

        var lastError: Throwable? = null
        for ((w, h, fps) in profiles) {
            try {
                capturer.startCapture(w, h, fps)
                Log.d(TAG, "Camera capture started at ${w}x${h}@${fps}fps")
                return
            } catch (e: Exception) {
                lastError = e
                Log.w(TAG, "Capture profile failed ${w}x${h}@${fps}: ${e.message}")
            }
        }

        throw RuntimeException("Failed to start camera capture", lastError)
    }

    /**
     * Create the PeerConnection and set up observers.
     */
    fun createPeerConnection() {
        val factory = peerConnectionFactory ?: return

        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }

        peerConnection = factory.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {
                Log.d(TAG, "ICE Candidate generated: ${candidate.sdpMid}")
                onIceCandidateGenerated?.invoke(candidate)
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {
                Log.d(TAG, "ICE Candidates removed")
            }

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                Log.d(TAG, "ICE Connection State: $state")
                onConnectionStateChanged?.invoke(state)
                if (state == PeerConnection.IceConnectionState.FAILED) {
                    Log.w(TAG, "ICE failed — ViewModel will decide whether to renegotiate")
                }
            }

            override fun onAddStream(stream: MediaStream) {
                Log.d(TAG, "Remote stream added: ${stream.videoTracks.size} video, ${stream.audioTracks.size} audio")
                if (stream.videoTracks.isNotEmpty()) {
                    onRemoteVideoTrack?.invoke(stream.videoTracks[0])
                }
            }

            override fun onRemoveStream(stream: MediaStream) {
                Log.d(TAG, "Remote stream removed")
                onRemoteStreamRemoved?.invoke()
            }

            override fun onTrack(transceiver: RtpTransceiver) {
                val track = transceiver.receiver?.track()
                if (track is VideoTrack) {
                    Log.d(TAG, "Remote VideoTrack received via onTrack")
                    onRemoteVideoTrack?.invoke(track)
                }
            }

            override fun onSignalingChange(state: PeerConnection.SignalingState) {
                Log.d(TAG, "Signaling State: $state")
            }

            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
            override fun onDataChannel(dc: DataChannel) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>) {}
            override fun onConnectionChange(state: PeerConnection.PeerConnectionState) {
                Log.d(TAG, "PeerConnection State: $state")
            }
            override fun onSelectedCandidatePairChanged(event: CandidatePairChangeEvent?) {}
            override fun onStandardizedIceConnectionChange(state: PeerConnection.IceConnectionState) {}
        }) ?: run {
            Log.e(TAG, "Failed to create PeerConnection")
            return
        }

        // Add local tracks
        localAudioTrack?.let { peerConnection?.addTrack(it, listOf("stream_local")) }
        localVideoTrack?.let { peerConnection?.addTrack(it, listOf("stream_local")) }

        Log.d(TAG, "PeerConnection created and local tracks added")
    }

    /**
     * Trigger an ICE restart on the existing PeerConnection.
     * Called by ViewModel recovery poller when attempting to restore from CHAT mode.
     */
    fun restartIce() {
        val pc = peerConnection
        if (pc == null) {
            Log.w(TAG, "restartIce: no PeerConnection")
            return
        }
        Log.d(TAG, "Triggering ICE restart")
        pc.restartIce()
    }

    fun isSignalingStable(): Boolean {
        return peerConnection?.signalingState() == PeerConnection.SignalingState.STABLE
    }

    /**
     * Create an SDP offer (caller side).
     */
    fun createOffer() {
        val pc = peerConnection ?: run {
            Log.w(TAG, "createOffer: no PeerConnection")
            return
        }
        if (pc.signalingState() != PeerConnection.SignalingState.STABLE) {
            Log.w(TAG, "createOffer skipped because signaling state is ${pc.signalingState()}")
            return
        }
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
            optional.add(MediaConstraints.KeyValuePair("IceRestart", "true"))
        }

        pc.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                Log.d(TAG, "Offer created")
                pc.setLocalDescription(SimpleSdpObserver("SetLocalOffer"), sdp)
                onOfferCreated?.invoke(sdp)
            }
            override fun onCreateFailure(error: String) { Log.e(TAG, "Offer creation failed: $error") }
            override fun onSetSuccess() {}
            override fun onSetFailure(error: String) {}
        }, constraints)
    }

    /**
     * Handle a remote offer (callee side) — set remote SDP and create answer.
     */
    fun handleRemoteOffer(sdp: String, type: String = "offer") {
        if (sdp.isBlank()) {
            Log.w(TAG, "Ignoring blank remote offer")
            return
        }
        val sdpType = runCatching {
            SessionDescription.Type.fromCanonicalForm(type)
        }.getOrElse {
            Log.w(TAG, "Ignoring remote offer with invalid type: $type")
            return
        }
        val sessionDescription = SessionDescription(
            sdpType,
            sdp
        )

        val pc = peerConnection ?: return
        fun applyRemoteOffer() {
            pc.setRemoteDescription(object : SdpObserver {
                override fun onSetSuccess() {
                    Log.d(TAG, "Remote offer set, creating answer")
                    drainPendingCandidates()
                    createAnswer()
                }
                override fun onSetFailure(error: String) { Log.e(TAG, "Failed to set remote offer: $error") }
                override fun onCreateSuccess(sdp: SessionDescription) {}
                override fun onCreateFailure(error: String) {}
            }, sessionDescription)
        }

        if (pc.signalingState() != PeerConnection.SignalingState.STABLE) {
            Log.w(TAG, "Received offer while ${pc.signalingState()}; rolling back local description")
            pc.setLocalDescription(object : SdpObserver {
                override fun onSetSuccess() {
                    hasRemoteDescription = false
                    applyRemoteOffer()
                }
                override fun onSetFailure(error: String) {
                    Log.e(TAG, "Rollback failed before remote offer: $error")
                    applyRemoteOffer()
                }
                override fun onCreateSuccess(sdp: SessionDescription) {}
                override fun onCreateFailure(error: String) {}
            }, SessionDescription(SessionDescription.Type.ROLLBACK, ""))
        } else {
            applyRemoteOffer()
        }
    }

    /**
     * Create an SDP answer (callee side).
     */
    private fun createAnswer() {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }

        peerConnection?.createAnswer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                Log.d(TAG, "Answer created")
                peerConnection?.setLocalDescription(SimpleSdpObserver("SetLocalAnswer"), sdp)
                onAnswerCreated?.invoke(sdp)
            }
            override fun onCreateFailure(error: String) { Log.e(TAG, "Answer creation failed: $error") }
            override fun onSetSuccess() {}
            override fun onSetFailure(error: String) {}
        }, constraints)
    }

    /**
     * Handle a remote answer (caller side).
     */
    fun handleRemoteAnswer(sdp: String, type: String = "answer") {
        if (sdp.isBlank()) {
            Log.w(TAG, "Ignoring blank remote answer")
            return
        }
        val sdpType = runCatching {
            SessionDescription.Type.fromCanonicalForm(type)
        }.getOrElse {
            Log.w(TAG, "Ignoring remote answer with invalid type: $type")
            return
        }
        val sessionDescription = SessionDescription(
            sdpType,
            sdp
        )
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                Log.d(TAG, "SetRemoteAnswer: success")
                drainPendingCandidates()
            }
            override fun onSetFailure(error: String) { Log.e(TAG, "SetRemoteAnswer: set failed: $error") }
            override fun onCreateSuccess(sdp: SessionDescription) {}
            override fun onCreateFailure(error: String) {}
        }, sessionDescription)
    }

    /**
     * Add a remote ICE candidate.
     * If remote description hasn't been set yet, buffer the candidate.
     */
    fun addIceCandidate(sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        if (candidate.isBlank()) {
            Log.w(TAG, "Ignoring blank ICE candidate")
            return
        }
        val iceCandidate = IceCandidate(sdpMid, sdpMLineIndex, candidate)
        if (hasRemoteDescription) {
            runCatching {
                peerConnection?.addIceCandidate(iceCandidate)
            }.onFailure {
                Log.w(TAG, "Failed to add ICE candidate: ${it.message}")
            }
        } else {
            Log.d(TAG, "Buffering ICE candidate (no remote description yet)")
            pendingIceCandidates.add(iceCandidate)
        }
    }

    /**
     * Flush buffered ICE candidates after remote description is set.
     */
    private fun drainPendingCandidates() {
        hasRemoteDescription = true
        if (pendingIceCandidates.isNotEmpty()) {
            Log.d(TAG, "Draining ${pendingIceCandidates.size} buffered ICE candidates")
            for (candidate in pendingIceCandidates) {
                runCatching {
                    peerConnection?.addIceCandidate(candidate)
                }.onFailure {
                    Log.w(TAG, "Failed to drain ICE candidate: ${it.message}")
                }
            }
            pendingIceCandidates.clear()
        }
    }

    /**
     * Toggle microphone on/off.
     */
    fun setMicEnabled(enabled: Boolean) {
        localAudioTrack?.setEnabled(enabled)
    }

    /**
     * Toggle camera on/off.
     */
    fun setCameraEnabled(enabled: Boolean) {
        localVideoTrack?.setEnabled(enabled)
    }

    /**
     * Switch between front and back camera.
     */
    fun switchCamera() {
        videoCapturer?.switchCamera(null)
    }

    /**
     * Release all resources. Must be called when the call ends.
     */
    fun release() {
        if (isReleased) return
        isReleased = true
        Log.d(TAG, "Releasing WebRTC resources")
        try {
            videoCapturer?.stopCapture()
        } catch (e: InterruptedException) {
            Log.e(TAG, "Error stopping capturer", e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error stopping capturer", e)
        }
        runCatching { localVideoTrack?.dispose() }
        localVideoTrack = null

        runCatching { localAudioTrack?.dispose() }
        localAudioTrack = null

        runCatching { videoCapturer?.dispose() }
        videoCapturer = null

        runCatching { surfaceTextureHelper?.dispose() }
        surfaceTextureHelper = null

        // dispose() internally calls close() — calling both separately can crash
        runCatching { peerConnection?.dispose() }
        peerConnection = null

        runCatching { peerConnectionFactory?.dispose() }
        peerConnectionFactory = null

        runCatching { eglBase.release() }

        Log.d(TAG, "WebRTC resources released")
    }

    /**
     * Find a camera capturer (prefer front camera).
     */
    private fun createCameraCapturer(): CameraVideoCapturer? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames

        // Prefer front camera
        for (name in deviceNames) {
            if (enumerator.isFrontFacing(name)) {
                val capturer = enumerator.createCapturer(name, null)
                if (capturer != null) return capturer
            }
        }

        // Fall back to any camera
        for (name in deviceNames) {
            val capturer = enumerator.createCapturer(name, null)
            if (capturer != null) return capturer
        }

        return null
    }

    /**
     * Simple SdpObserver that just logs errors.
     */
    private class SimpleSdpObserver(private val tag: String) : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription) {}
        override fun onSetSuccess() { Log.d(TAG, "$tag: success") }
        override fun onCreateFailure(error: String) { Log.e(TAG, "$tag: create failed: $error") }
        override fun onSetFailure(error: String) { Log.e(TAG, "$tag: set failed: $error") }
    }
}
