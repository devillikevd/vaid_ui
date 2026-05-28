package com.example.swastik.ui.screens.consultation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import android.view.ViewGroup
import android.widget.FrameLayout
import com.example.swastik.ui.viewmodel.ConsultationMode
import com.example.swastik.ui.viewmodel.ChatMessageUi
import org.webrtc.EglBase
import org.webrtc.RendererCommon
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack

@Composable
fun VideoCallScreen(
    doctorName: String = "Doctor",
    connectionStatus: String = "Connecting...",
    isMicMuted: Boolean = false,
    isCameraOff: Boolean = false,
    isSpeakerOn: Boolean = true,
    localVideoTrack: VideoTrack? = null,
    remoteVideoTrack: VideoTrack? = null,
    eglBaseContext: EglBase.Context? = null,
    hasRemoteVideo: Boolean = false,
    connectionMode: ConsultationMode = ConsultationMode.VIDEO,
    modeBanner: String? = null,
    callDurationSeconds: Long = 0L,
    chatMessages: List<ChatMessageUi> = emptyList(),
    hasMedicalRecordAccess: Boolean = false,
    medicalRecordAccessExpiresAt: String? = null,
    isMedicalRecordAccessLoading: Boolean = false,
    medicalRecordAccessMessage: String? = null,
    guardianAnalyticsSharingAllowed: Boolean = false,
    onBackClick: () -> Unit,
    onEndCall: () -> Unit,
    onGrantMedicalRecordAccess: (Boolean) -> Unit = {},
    onRevokeMedicalRecordAccess: () -> Unit = {},
    onMicToggle: () -> Unit = {},
    onCameraToggle: () -> Unit = {},
    onCameraFlip: () -> Unit = {},
    onSpeakerToggle: () -> Unit = {},
    onSendChatMessage: (String) -> Unit = {},
    onSwitchMode: (ConsultationMode) -> Unit = {}
) {
    var chatInput by remember { mutableStateOf("") }
    val backgroundBrush = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF07101F),
            Color(0xFF0D1730),
            Color(0xFF13233F)
        )
    )
    val surfaceColor = Color(0xFF16233B)
    val accentColor = Color(0xFF4C8DFF)
    val liveColor = Color(0xFF2DD4BF)
    val warningColor = Color(0xFFF59E0B)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush)
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 84.dp, y = (-52).dp)
                .size(220.dp)
                .clip(CircleShape)
                .background(accentColor.copy(alpha = 0.14f))
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-48).dp, y = 64.dp)
                .size(180.dp)
                .clip(CircleShape)
                .background(liveColor.copy(alpha = 0.10f))
        )
        when (connectionMode) {
            ConsultationMode.CHAT -> {
                // ── Full-screen Chat Mode ──────────────────────────
                ChatModeScreen(
                    doctorName = doctorName,
                    chatMessages = chatMessages,
                    chatInput = chatInput,
                    onChatInputChange = { chatInput = it },
                    onSendMessage = {
                        if (chatInput.isNotBlank()) {
                            onSendChatMessage(chatInput.trim())
                            chatInput = ""
                        }
                    },
                    onEndCall = onEndCall,
                    onBackClick = onBackClick,
                    modeBanner = modeBanner,
                    onSwitchMode = onSwitchMode
                )
            }
            ConsultationMode.AUDIO -> {
                // ── Audio-only Mode ────────────────────────────────
                AudioModeScreen(
                    doctorName = doctorName,
                    connectionStatus = connectionStatus,
                    isMicMuted = isMicMuted,
                    modeBanner = modeBanner,
                    onBackClick = onBackClick,
                    onEndCall = onEndCall,
                    onMicToggle = onMicToggle,
                    onSpeakerToggle = onSpeakerToggle,
                    isSpeakerOn = isSpeakerOn,
                    onSwitchMode = onSwitchMode
                )
            }
            ConsultationMode.VIDEO -> {
                var showRecordPanel by remember { mutableStateOf(false) }
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    ConsultationTopBar(
                        title = doctorName,
                        connectionStatus = connectionStatus,
                        statusAccent = if (hasRemoteVideo) liveColor else warningColor,
                        currentMode = connectionMode,
                        callDurationLabel = if (callDurationSeconds > 0) formatCallDuration(callDurationSeconds) else null,
                        onBackClick = onBackClick,
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (modeBanner != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(warningColor.copy(alpha = 0.94f))
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = modeBanner,
                                color = Color.Black,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.align(Alignment.Center)
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    ) {
                        if (hasRemoteVideo && remoteVideoTrack != null && eglBaseContext != null) {
                            WebRTCVideoView(
                                videoTrack = remoteVideoTrack,
                                eglContext = eglBaseContext,
                                mirror = false,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            DoctorVideoPlaceholder(
                                doctorName = doctorName,
                                status = connectionStatus,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        if (!isCameraOff && localVideoTrack != null && eglBaseContext != null) {
                            Box(
                                modifier = Modifier
                                    .padding(end = 16.dp, bottom = 24.dp)
                                    .align(Alignment.BottomEnd)
                                    .size(width = 112.dp, height = 156.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .border(2.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(16.dp))
                            ) {
                                WebRTCVideoView(
                                    videoTrack = localVideoTrack,
                                    eglContext = eglBaseContext,
                                    mirror = true,
                                    modifier = Modifier.fillMaxSize()
                                )
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(8.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.Black.copy(alpha = 0.48f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "You",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        } else {
                            SelfVideoPlaceholder(
                                isCameraOff = isCameraOff,
                                modifier = Modifier
                                    .padding(end = 16.dp, bottom = 24.dp)
                                    .align(Alignment.BottomEnd)
                            )
                        }

                        // ── Floating Medical Record Bubble ──────────────
                        IconButton(
                            onClick = { showRecordPanel = !showRecordPanel },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = 12.dp, end = 12.dp)
                                .size(42.dp)
                                .background(
                                    if (hasMedicalRecordAccess) Color(0xFF2DD4BF).copy(alpha = 0.85f)
                                    else Color.White.copy(alpha = 0.18f),
                                    CircleShape
                                )
                        ) {
                            Icon(
                                imageVector = if (hasMedicalRecordAccess) Icons.Default.LockOpen else Icons.Default.Lock,
                                contentDescription = "Medical Records",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // ── Expandable Compact Panel ────────────────────
                        if (showRecordPanel) {
                            Surface(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 58.dp, end = 12.dp)
                                    .widthIn(max = 280.dp),
                                color = Color(0xFF0E1A2E).copy(alpha = 0.96f),
                                shape = RoundedCornerShape(16.dp),
                                shadowElevation = 8.dp
                            ) {
                                ConsultationAccessBanner(
                                    hasMedicalRecordAccess = hasMedicalRecordAccess,
                                    medicalRecordAccessExpiresAt = medicalRecordAccessExpiresAt,
                                    isMedicalRecordAccessLoading = isMedicalRecordAccessLoading,
                                    medicalRecordAccessMessage = medicalRecordAccessMessage,
                                    accentColor = accentColor,
                                    guardianAnalyticsSharingAllowed = guardianAnalyticsSharingAllowed,
                                    onGrantMedicalRecordAccess = onGrantMedicalRecordAccess,
                                    onRevokeMedicalRecordAccess = onRevokeMedicalRecordAccess
                                )
                            }
                        }
                    }

                    VideoCallControls(
                        isMicMuted = isMicMuted,
                        isCameraOff = isCameraOff,
                        isSpeakerOn = isSpeakerOn,
                        currentMode = connectionMode,
                        accentColor = accentColor,
                        surfaceColor = surfaceColor,
                        onMicToggle = onMicToggle,
                        onCameraToggle = onCameraToggle,
                        onEndCall = onEndCall,
                        onCameraFlip = onCameraFlip,
                        onSpeakerToggle = onSpeakerToggle,
                        onSwitchMode = onSwitchMode,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } // end VIDEO
        } // end when
    }
}

@Composable
private fun ConsultationAccessBanner(
    hasMedicalRecordAccess: Boolean,
    medicalRecordAccessExpiresAt: String?,
    isMedicalRecordAccessLoading: Boolean,
    medicalRecordAccessMessage: String?,
    accentColor: Color,
    guardianAnalyticsSharingAllowed: Boolean,
    onGrantMedicalRecordAccess: (Boolean) -> Unit,
    onRevokeMedicalRecordAccess: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Surface(
            color = Color.White.copy(alpha = 0.08f),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = if (hasMedicalRecordAccess) Color(0xFF2DD4BF) else Color(0xFFFFD166),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (hasMedicalRecordAccess) "Past medical records shared" else "Past medical records are private",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (hasMedicalRecordAccess) {
                                if (medicalRecordAccessExpiresAt.isNullOrBlank()) {
                                    "Only your consulting doctor can currently review your older reports, prescriptions, and consultations."
                                } else {
                                    "Only your consulting doctor can review your older reports, prescriptions, and consultations for 24 hours unless you revoke access sooner."
                                }
                            } else {
                                "Share only if you want your doctor to review older reports, prescriptions, and consultations during this consultation."
                            },
                            color = Color.White.copy(alpha = 0.68f),
                            fontSize = 12.sp,
                            lineHeight = 18.sp
                        )
                    }
                }

                medicalRecordAccessMessage?.takeIf { it.isNotBlank() }?.let { message ->
                    Text(
                        text = message,
                        color = Color.White.copy(alpha = 0.76f),
                        fontSize = 12.sp
                    )
                }

                if (!hasMedicalRecordAccess) {
                    var includeGuardianAnalytics by remember { mutableStateOf(false) }
                    LaunchedEffect(guardianAnalyticsSharingAllowed) {
                        if (!guardianAnalyticsSharingAllowed) includeGuardianAnalytics = false
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeGuardianAnalytics,
                            enabled = guardianAnalyticsSharingAllowed,
                            onCheckedChange = { includeGuardianAnalytics = it && guardianAnalyticsSharingAllowed },
                            colors = CheckboxDefaults.colors(
                                checkedColor = accentColor,
                                uncheckedColor = Color.White.copy(alpha = 0.6f),
                                checkmarkColor = Color.White
                            )
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text(
                                text = "Include Guardian Analytics",
                                color = Color.White.copy(alpha = if (guardianAnalyticsSharingAllowed) 0.8f else 0.45f),
                                fontSize = 13.sp
                            )
                            Text(
                                text = if (guardianAnalyticsSharingAllowed) {
                                    "Adds sources, reliability notes, and selected Guardian signals."
                                } else {
                                    "Disabled until patient enables Guardian doctor sharing in Health Card."
                                },
                                color = Color.White.copy(alpha = 0.58f),
                                fontSize = 11.sp,
                                lineHeight = 15.sp
                            )
                        }
                    }
                    Button(
                        onClick = { onGrantMedicalRecordAccess(includeGuardianAnalytics) },
                        enabled = !isMedicalRecordAccessLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                    ) {
                        if (isMedicalRecordAccessLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Share 24h record access")
                        }
                    }
                } else {
                    OutlinedButton(
                        onClick = onRevokeMedicalRecordAccess,
                        enabled = !isMedicalRecordAccessLoading,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                    ) {
                        if (isMedicalRecordAccessLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Revoke doctor access")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConsultationTopBar(
    title: String,
    connectionStatus: String,
    statusAccent: Color,
    currentMode: ConsultationMode,
    callDurationLabel: String?,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .background(Color(0xFF0A1426).copy(alpha = 0.86f))
            .padding(start = 12.dp, end = 16.dp, top = 38.dp, bottom = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBackClick) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = Color.White
            )
        }
        Spacer(modifier = Modifier.width(6.dp))
        Column(
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(statusAccent)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = connectionStatus,
                    color = Color.White.copy(alpha = 0.86f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.width(10.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White.copy(alpha = 0.08f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = when (currentMode) {
                            ConsultationMode.VIDEO -> "Video"
                            ConsultationMode.AUDIO -> "Voice"
                            ConsultationMode.CHAT -> "Chat"
                        },
                        color = Color.White.copy(alpha = 0.82f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
        if (callDurationLabel != null) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.08f))
                    .padding(horizontal = 12.dp, vertical = 7.dp)
            ) {
                Text(
                    text = callDurationLabel,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

/**
 * Composable wrapper around WebRTC's SurfaceViewRenderer.
 * Renders a live VideoTrack using the GPU via EGL.
 */
@Composable
fun WebRTCVideoView(
    videoTrack: VideoTrack,
    eglContext: EglBase.Context,
    modifier: Modifier = Modifier,
    mirror: Boolean = false
) {
    val context = LocalContext.current

    key(videoTrack, eglContext) {
        AndroidView(
            factory = {
                FrameLayout(context).apply {
                    val renderer = SurfaceViewRenderer(context)
                    try {
                        renderer.init(eglContext, null)
                        renderer.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL)
                        renderer.setMirror(mirror)
                        renderer.setEnableHardwareScaler(true)
                        videoTrack.addSink(renderer)
                        addView(
                            renderer,
                            FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        )
                    } catch (error: Throwable) {
                        android.util.Log.e("VideoCallScreen", "Unable to attach WebRTC renderer: ${error.message}", error)
                        try {
                            videoTrack.removeSink(renderer)
                        } catch (_: Throwable) { }
                        try {
                            renderer.release()
                        } catch (_: Throwable) { }
                    }
                }
            },
            update = { container ->
                (container.getChildAt(0) as? SurfaceViewRenderer)?.let { renderer ->
                    try {
                        renderer.setMirror(mirror)
                    } catch (error: Throwable) {
                        android.util.Log.w("VideoCallScreen", "Unable to update renderer mirror: ${error.message}")
                    }
                }
            },
            onReset = { container ->
                (container.getChildAt(0) as? SurfaceViewRenderer)?.let { renderer ->
                    try {
                        videoTrack.removeSink(renderer)
                    } catch (_: Throwable) { }
                    try {
                        renderer.release()
                    } catch (_: Throwable) { }
                }
                container.removeAllViews()
            },
            onRelease = { container ->
                (container.getChildAt(0) as? SurfaceViewRenderer)?.let { renderer ->
                    try {
                        videoTrack.removeSink(renderer)
                    } catch (_: Throwable) { }
                    try {
                        renderer.release()
                    } catch (_: Throwable) { }
                }
                container.removeAllViews()
            },
            modifier = modifier
        )
    }
}

/**
 * Audio-only mode — shows an avatar with pulsing animation + audio controls.
 */
@Composable
private fun AudioModeScreen(
    doctorName: String,
    connectionStatus: String,
    isMicMuted: Boolean,
    isSpeakerOn: Boolean,
    modeBanner: String?,
    onBackClick: () -> Unit,
    onEndCall: () -> Unit,
    onMicToggle: () -> Unit,
    onSpeakerToggle: () -> Unit,
    onSwitchMode: (ConsultationMode) -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize().background(
            Brush.verticalGradient(
                listOf(
                    Color(0xFF07101F),
                    Color(0xFF0D1730),
                    Color(0xFF13233F)
                )
            )
        ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (modeBanner != null) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFFFC107).copy(alpha = 0.9f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(text = modeBanner, color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
            Box(
                modifier = Modifier
                    .size(128.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                Color(0xFF2DD4BF),
                                Color(0xFF4C8DFF)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(60.dp), tint = Color.White)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(doctorName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Voice Consultation", fontSize = 14.sp, color = Color(0xFF2DD4BF))
            Spacer(modifier = Modifier.height(8.dp))
            Text(connectionStatus, fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
            Spacer(modifier = Modifier.height(4.dp))
            Text("Low bandwidth or manual audio mode", fontSize = 12.sp, color = Color.White.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(20.dp))
            ConsultationModeSelector(currentMode = ConsultationMode.AUDIO, onSwitchMode = onSwitchMode)
            Spacer(modifier = Modifier.height(40.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                ControlButton(icon = if (isMicMuted) Icons.Default.MicOff else Icons.Default.Mic, contentDescription = "Mic", onClick = onMicToggle, isActive = !isMicMuted)
                FloatingActionButton(onClick = onEndCall, containerColor = Color(0xFFE57373), shape = CircleShape) {
                    Icon(Icons.Default.CallEnd, contentDescription = "End Call", tint = Color.White, modifier = Modifier.size(28.dp))
                }
                ControlButton(
                    icon = if (isSpeakerOn) Icons.AutoMirrored.Filled.VolumeUp else Icons.AutoMirrored.Filled.VolumeOff,
                    contentDescription = "Speaker", onClick = onSpeakerToggle, isActive = isSpeakerOn
                )
            }
        }
        IconButton(onClick = onBackClick, modifier = Modifier.padding(16.dp).padding(top = 24.dp).align(Alignment.TopStart)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
        }
    }
}

/**
 * Chat-only mode — full-screen chat when network is too poor for audio/video.
 */
@Composable
private fun ChatModeScreen(
    doctorName: String,
    chatMessages: List<ChatMessageUi>,
    chatInput: String,
    onChatInputChange: (String) -> Unit,
    onSendMessage: () -> Unit,
    onEndCall: () -> Unit,
    onBackClick: () -> Unit,
    modeBanner: String?,
    onSwitchMode: (ConsultationMode) -> Unit
) {
    val listState = rememberLazyListState()

    LaunchedEffect(chatMessages.size) {
        if (chatMessages.isNotEmpty()) {
            listState.animateScrollToItem(chatMessages.lastIndex)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF07101F),
                        Color(0xFF0D1730),
                        Color(0xFF13233F)
                    )
                )
            )
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0A1426).copy(alpha = 0.86f))
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .padding(top = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(doctorName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                Text("Chat Consultation", fontSize = 12.sp, color = Color(0xFF4C8DFF))
            }
            FloatingActionButton(onClick = onEndCall, containerColor = Color(0xFFE57373), shape = CircleShape, modifier = Modifier.size(40.dp)) {
                Icon(Icons.Default.CallEnd, contentDescription = "End", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }

        if (modeBanner != null) {
            Box(modifier = Modifier.fillMaxWidth().background(Color(0xFFFFC107).copy(alpha = 0.9f)).padding(8.dp)) {
                Text(text = modeBanner, color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.align(Alignment.Center))
            }
        }

        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), contentAlignment = Alignment.Center) {
            ConsultationModeSelector(currentMode = ConsultationMode.CHAT, onSwitchMode = onSwitchMode)
        }

        // Messages
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (chatMessages.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillParentMaxWidth()
                            .padding(top = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Send a message to continue", color = Color.White.copy(alpha = 0.4f), fontSize = 14.sp)
                    }
                }
            } else {
                items(chatMessages, key = { it.id }) { msg ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .align(if (msg.isMe) Alignment.CenterEnd else Alignment.CenterStart)
                            .background(
                                if (msg.isMe) Color(0xFF4C8DFF) else Color.White.copy(alpha = 0.08f),
                                RoundedCornerShape(16.dp)
                            )
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Column {
                                Text(msg.message, color = Color.White, fontSize = 14.sp)
                                Text(formatChatTimestamp(msg.timestamp), color = Color.White.copy(alpha = 0.5f), fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
        }

        // Input
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0A1426).copy(alpha = 0.86f))
                .padding(WindowInsets.ime.asPaddingValues())
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = chatInput,
                onValueChange = onChatInputChange,
                placeholder = { Text("Type a message...", color = Color.White.copy(alpha = 0.4f)) },
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF4C8DFF),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color.White
                ),
                shape = RoundedCornerShape(24.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = onSendMessage, modifier = Modifier.size(48.dp).background(Color(0xFF4C8DFF), CircleShape)) {
                @Suppress("DEPRECATION")
                Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(24.dp))
            }
        }
    }
}

/**
 * Placeholder shown when the remote doctor hasn't connected yet.
 */
@Composable
private fun DoctorVideoPlaceholder(doctorName: String, status: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.background(Color.Transparent),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color.White.copy(alpha = 0.08f))
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Text(
                    text = if (status.contains("Connected", ignoreCase = true)) "Consultation live" else "Secure teleconsultation",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.84f),
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(modifier = Modifier.height(24.dp))
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                Color(0xFF4C8DFF),
                                Color(0xFF2DD4BF)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color.White
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = doctorName,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (status.contains("Connected", ignoreCase = true)) "The consultation is live on both sides." else "We are holding the room until the doctor fully joins.",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.68f)
            )
            Spacer(modifier = Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ConsultationMiniPill(label = status)
                ConsultationMiniPill(label = "Chat fallback ready")
            }
        }
    }
}

/**
 * Placeholder for self-video when camera is off or not yet started.
 */
@Composable
private fun SelfVideoPlaceholder(isCameraOff: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(width = 112.dp, height = 156.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF16233B))
            .border(2.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                if (isCameraOff) Icons.Default.VideocamOff else Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = Color.White.copy(alpha = 0.7f)
            )
            Text(
                if (isCameraOff) "Camera Off" else "You",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.74f),
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun VideoCallControls(
    isMicMuted: Boolean,
    isCameraOff: Boolean,
    isSpeakerOn: Boolean,
    currentMode: ConsultationMode,
    accentColor: Color,
    surfaceColor: Color,
    onMicToggle: () -> Unit,
    onCameraToggle: () -> Unit,
    onEndCall: () -> Unit,
    onCameraFlip: () -> Unit,
    onSpeakerToggle: () -> Unit,
    onSwitchMode: (ConsultationMode) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(Color(0xFF09111F).copy(alpha = 0.94f))
            .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(30.dp))
                .background(Color.White.copy(alpha = 0.07f))
                .padding(horizontal = 12.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                ControlButton(
                    icon = if (isMicMuted) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = if (isMicMuted) "Unmute" else "Mute",
                    onClick = onMicToggle,
                    isActive = !isMicMuted,
                    activeColor = surfaceColor,
                    inactiveColor = Color(0xFFB91C1C)
                )

                ControlButton(
                    icon = if (isCameraOff) Icons.Default.VideocamOff else Icons.Default.Videocam,
                    contentDescription = if (isCameraOff) "Turn camera on" else "Turn camera off",
                    onClick = onCameraToggle,
                    isActive = !isCameraOff,
                    activeColor = surfaceColor,
                    inactiveColor = Color(0xFFB91C1C)
                )

                FloatingActionButton(
                    onClick = onEndCall,
                    modifier = Modifier.size(62.dp),
                    containerColor = Color(0xFFEF4444),
                    shape = CircleShape,
                    elevation = FloatingActionButtonDefaults.elevation(3.dp)
                ) {
                    Icon(
                        Icons.Default.CallEnd,
                        contentDescription = "End Call",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }

                ControlButton(
                    icon = Icons.Default.Cameraswitch,
                    contentDescription = "Flip Camera",
                    onClick = onCameraFlip,
                    activeColor = surfaceColor,
                    inactiveColor = surfaceColor
                )

                ControlButton(
                    icon = if (isSpeakerOn) Icons.AutoMirrored.Filled.VolumeUp else Icons.AutoMirrored.Filled.VolumeOff,
                    contentDescription = if (isSpeakerOn) "Speaker on" else "Speaker off",
                    onClick = onSpeakerToggle,
                    isActive = isSpeakerOn,
                    activeColor = surfaceColor,
                    inactiveColor = Color(0xFF2B364D)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))
        ConsultationModeSelector(
            currentMode = currentMode,
            accentColor = accentColor,
            onSwitchMode = onSwitchMode
        )
    }
}

@Composable
private fun ConsultationModeSelector(
    currentMode: ConsultationMode,
    accentColor: Color = Color(0xFF3F51B5),
    onSwitchMode: (ConsultationMode) -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(22.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(horizontal = 6.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ConsultationMode.values().forEach { mode ->
            val isSelected = mode == currentMode
            AssistChip(
                onClick = { onSwitchMode(mode) },
                label = {
                    Text(
                        when (mode) {
                            ConsultationMode.VIDEO -> "Video"
                            ConsultationMode.AUDIO -> "Voice"
                            ConsultationMode.CHAT -> "Chat"
                        },
                        color = if (isSelected) Color.White else Color.White.copy(alpha = 0.8f)
                    )
                },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = if (isSelected) accentColor else Color.White.copy(alpha = 0.12f),
                    labelColor = if (isSelected) Color.White else Color.White.copy(alpha = 0.8f)
                )
            )
        }
    }
}

private fun formatChatTimestamp(raw: String): String {
    return runCatching {
        val instant = java.time.Instant.parse(raw)
        java.time.format.DateTimeFormatter.ofPattern("hh:mm a")
            .withZone(java.time.ZoneId.systemDefault())
            .format(instant)
    }.getOrDefault(raw)
}

private fun formatCallDuration(seconds: Long): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%02d:%02d".format(mins, secs)
}

@Composable
private fun ConsultationMiniPill(label: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.08f))
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(
            text = label,
            color = Color.White.copy(alpha = 0.78f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun ControlButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    isActive: Boolean = true,
    activeColor: Color = Color.White.copy(alpha = 0.16f),
    inactiveColor: Color = Color.White.copy(alpha = 0.3f)
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(52.dp)
            .background(
                if (isActive) activeColor else inactiveColor,
                CircleShape
            )
    ) {
        Icon(
            icon,
            contentDescription = contentDescription,
            tint = Color.White,
            modifier = Modifier.size(28.dp)
        )
    }
}
