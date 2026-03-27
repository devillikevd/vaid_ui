package com.example.swastik.ui.screens.consultation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
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
    chatMessages: List<ChatMessageUi> = emptyList(),
    onBackClick: () -> Unit,
    onEndCall: () -> Unit,
    onMicToggle: () -> Unit = {},
    onCameraToggle: () -> Unit = {},
    onCameraFlip: () -> Unit = {},
    onSpeakerToggle: () -> Unit = {},
    onSendChatMessage: (String) -> Unit = {},
    onSwitchMode: (ConsultationMode) -> Unit = {}
) {
    var chatInput by remember { mutableStateOf("") }
    val screenBackground = Color(0xFF111827)
    val surfaceColor = Color(0xFF1F2937)
    val accentColor = Color(0xFF3B82F6)
    val warningColor = Color(0xFFF59E0B)

    Box(modifier = Modifier.fillMaxSize().background(screenBackground)) {
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
                Column(modifier = Modifier.fillMaxSize()) {
                    ConsultationTopBar(
                        title = doctorName,
                        connectionStatus = connectionStatus,
                        statusAccent = if (hasRemoteVideo) Color(0xFF22C55E) else warningColor,
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

                        if (!hasRemoteVideo) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .padding(top = 20.dp)
                                    .background(Color.Black.copy(alpha = 0.45f), RoundedCornerShape(18.dp))
                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = connectionStatus,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        if (!isCameraOff && localVideoTrack != null && eglBaseContext != null) {
                            Box(
                                modifier = Modifier
                                    .padding(end = 16.dp, bottom = 24.dp)
                                    .align(Alignment.BottomEnd)
                                    .size(width = 112.dp, height = 156.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .border(2.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                            ) {
                                WebRTCVideoView(
                                    videoTrack = localVideoTrack,
                                    eglContext = eglBaseContext,
                                    mirror = true,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        } else {
                            SelfVideoPlaceholder(
                                isCameraOff = isCameraOff,
                                modifier = Modifier
                                    .padding(end = 16.dp, bottom = 24.dp)
                                    .align(Alignment.BottomEnd)
                            )
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
private fun ConsultationTopBar(
    title: String,
    connectionStatus: String,
    statusAccent: Color,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .background(Color(0xFF1F2937))
            .padding(horizontal = 12.dp, vertical = 12.dp)
            .padding(top = 24.dp),
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
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(statusAccent)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = connectionStatus,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Text(
            text = title,
            color = Color.White.copy(alpha = 0.72f),
            fontSize = 13.sp
        )
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

    AndroidView(
        factory = {
            SurfaceViewRenderer(context).apply {
                init(eglContext, null)
                setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL)
                setMirror(mirror)
                setEnableHardwareScaler(true)
                videoTrack.addSink(this)
            }
        },
        update = { renderer ->
            renderer.setMirror(mirror)
        },
        onRelease = { renderer ->
            try {
                videoTrack.removeSink(renderer)
            } catch (_: Exception) { }
            renderer.release()
        },
        modifier = modifier
    )
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
        modifier = Modifier.fillMaxSize().background(Color(0xFF1A1A2E)),
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
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF00897B)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(60.dp), tint = Color.White)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(doctorName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Audio Consultation", fontSize = 14.sp, color = Color(0xFF4CAF50))
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

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFF1A1A2E))) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth().background(Color(0xFF16213E)).padding(horizontal = 16.dp, vertical = 12.dp).padding(top = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(doctorName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                Text("Chat Consultation", fontSize = 12.sp, color = Color(0xFF64B5F6))
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
                                    if (msg.isMe) Color(0xFF3F51B5) else Color(0xFF2D2D44),
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
            modifier = Modifier.fillMaxWidth().background(Color(0xFF16213E)).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = chatInput,
                onValueChange = onChatInputChange,
                placeholder = { Text("Type a message...", color = Color.White.copy(alpha = 0.4f)) },
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF3F51B5),
                    unfocusedBorderColor = Color(0xFF2D2D44),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color.White
                ),
                shape = RoundedCornerShape(24.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = onSendMessage, modifier = Modifier.size(48.dp).background(Color(0xFF3F51B5), CircleShape)) {
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
        modifier = modifier.background(Color(0xFF111827)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2563EB)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp),
                    tint = Color.White
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = if (status.contains("Connected", ignoreCase = true)) doctorName else "Waiting for doctor",
                fontSize = 21.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (status.contains("Connected", ignoreCase = true)) "The consultation is live" else "The consultation will begin shortly",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.55f)
            )
            if (!status.contains("Connected", ignoreCase = true)) {
                Spacer(modifier = Modifier.height(18.dp))
                Text(
                    text = doctorName,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.72f),
                    fontWeight = FontWeight.Medium
                )
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
            .background(Color(0xFF1F2937))
            .border(2.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
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
                color = Color.White.copy(alpha = 0.72f),
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
            .background(Color(0xFF1F2937))
            .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 14.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ControlButton(
                icon = if (isMicMuted) Icons.Default.MicOff else Icons.Default.Mic,
                contentDescription = if (isMicMuted) "Unmute" else "Mute",
                onClick = onMicToggle,
                isActive = !isMicMuted,
                activeColor = surfaceColor,
                inactiveColor = Color(0xFFDC2626)
            )

            ControlButton(
                icon = if (isCameraOff) Icons.Default.VideocamOff else Icons.Default.Videocam,
                contentDescription = if (isCameraOff) "Turn camera on" else "Turn camera off",
                onClick = onCameraToggle,
                isActive = !isCameraOff,
                activeColor = surfaceColor,
                inactiveColor = Color(0xFFDC2626)
            )

            FloatingActionButton(
                onClick = onEndCall,
                modifier = Modifier.size(58.dp),
                containerColor = Color(0xFFEF4444),
                shape = CircleShape,
                elevation = FloatingActionButtonDefaults.elevation(4.dp)
            ) {
                Icon(
                    Icons.Default.CallEnd,
                    contentDescription = "End Call",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp)
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
                inactiveColor = Color(0xFF374151)
            )
        }

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
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        ConsultationMode.values().forEach { mode ->
            val isSelected = mode == currentMode
            AssistChip(
                onClick = { onSwitchMode(mode) },
                label = {
                    Text(
                        when (mode) {
                            ConsultationMode.VIDEO -> "Video"
                            ConsultationMode.AUDIO -> "Audio"
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
            .size(56.dp)
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
