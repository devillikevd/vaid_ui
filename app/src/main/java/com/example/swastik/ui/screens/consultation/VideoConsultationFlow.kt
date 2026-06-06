package com.example.swastik.ui.screens.consultation

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.activity.compose.BackHandler

import android.content.Context
import android.content.ContextWrapper
import android.app.Activity

import com.example.swastik.ui.viewmodel.VideoConsultationViewModel

tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

/**
 * Main Video Consultation Flow
 * Handles navigation between:
 * 1. ConsultationPrepareScreen - Welcome screen before starting
 * 2. VideoCallScreen - Active video call with doctor (real WebRTC)
 * 3. ConsultationCompletionDialog - Success dialog after call ends
 */
@Composable
fun VideoConsultationFlow(
    appointmentId: String = "",
    doctorName: String = "Doctor",
    isPipMode: Boolean = false,
    onBackClick: () -> Unit,
    onConsultationComplete: () -> Unit,
    viewModel: VideoConsultationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val localVideoTrack by viewModel.localVideoTrack.collectAsState()
    val remoteVideoTrack by viewModel.remoteVideoTrack.collectAsState()
    var showCompletionDialog by remember { mutableStateOf(false) }
    var hasBeenConnected by remember { mutableStateOf(false) }

    // Intercept physical back button if connected or in a session
    val context = LocalContext.current
    val activity = context.findActivity()

    BackHandler(enabled = uiState.isConnected || uiState.session != null) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val params = android.app.PictureInPictureParams.Builder().setAspectRatio(android.util.Rational(9, 16)).build()
            activity?.enterPictureInPictureMode(params)
        } else {
            activity?.moveTaskToBack(true)
        }
    }

    // Get patient name from shared repository
    val patientName = viewModel.patientName.collectAsState().value

    // EGL context for video renderers
    val eglBaseContext = viewModel.eglBaseContext
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] == true
        val micGranted = permissions[Manifest.permission.RECORD_AUDIO] == true
        if (!cameraGranted || !micGranted) {
            android.widget.Toast.makeText(context, "Permissions denied. Falling back to restricted mode.", android.widget.Toast.LENGTH_LONG).show()
        }
        // Continue with joining consultation regardless, WebRTCManager will handle missing camera/mic gracefully now
        viewModel.joinConsultation(appointmentId)
    }

    // Track when user was connected
    LaunchedEffect(uiState.isConnected) {
        if (uiState.isConnected) {
            hasBeenConnected = true
        }
    }

    LaunchedEffect(appointmentId) {
        if (appointmentId.isNotBlank()) {
            viewModel.loadMedicalRecordAccess(appointmentId)
        }
    }

    // If was connected and now disconnected, show completion
    LaunchedEffect(uiState.consultationCompleted, hasBeenConnected) {
        if (hasBeenConnected && uiState.consultationCompleted) {
            if (isPipMode) {
                // Cannot show dialog in PiP mode without crashing, just finish safely
                viewModel.dismissCompletion()
                onConsultationComplete()
            } else {
                showCompletionDialog = true
            }
        }
    }

    // Connection status message
    val statusMessage = when {
        uiState.isWaitingForDoctor -> "Waiting for doctor to start consultation"
        uiState.isConnecting -> "Preparing secure connection"
        uiState.isConnected && uiState.hasRemoteVideo -> "Consultation live"
        uiState.isConnected || uiState.session != null -> "Doctor will join shortly"
        uiState.error != null -> uiState.error ?: "Error"
        else -> "Ready"
    }

    // Determine current screen — show video/audio/chat based on connectionMode
    if (uiState.isConnected || uiState.session != null || uiState.connectionMode == com.example.swastik.ui.viewmodel.ConsultationMode.CHAT) {
        VideoCallScreen(
            doctorName = doctorName,
            connectionStatus = statusMessage,
            isMicMuted = !uiState.isMicEnabled,
            isCameraOff = !uiState.isCameraEnabled,
            isSpeakerOn = uiState.isSpeakerOn,
            localVideoTrack = localVideoTrack,
            remoteVideoTrack = remoteVideoTrack,
            eglBaseContext = eglBaseContext,
            hasRemoteVideo = uiState.hasRemoteVideo,
            connectionMode = uiState.connectionMode,
            modeBanner = uiState.modeBanner,
            callDurationSeconds = uiState.callDuration,
            chatMessages = uiState.chatMessages,
            hasMedicalRecordAccess = uiState.hasMedicalRecordAccess,
            medicalRecordAccessExpiresAt = uiState.medicalRecordAccessExpiresAt,
            isMedicalRecordAccessLoading = uiState.isMedicalRecordAccessLoading,
            medicalRecordAccessMessage = uiState.medicalRecordAccessMessage,
            guardianAnalyticsSharingAllowed = uiState.guardianAnalyticsSharingAllowed,
            isAiVitalsEnabled = uiState.hasConsentedToVisionAnalysis,
            isPipMode = isPipMode,
            onBackClick = {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    val params = android.app.PictureInPictureParams.Builder().setAspectRatio(android.util.Rational(9, 16)).build()
                    activity?.enterPictureInPictureMode(params)
                } else {
                    activity?.moveTaskToBack(true)
                }
            },
            onEndCall = {
                viewModel.endCall()
            },
            onGrantMedicalRecordAccess = { viewModel.grantMedicalRecordAccess(it) },
            onRevokeMedicalRecordAccess = { viewModel.revokeMedicalRecordAccess() },
            onAiVitalsToggle = { viewModel.setVisionAnalysisConsent(it) },
            onMicToggle = { viewModel.toggleMic() },
            onCameraToggle = { viewModel.toggleCamera() },
            onCameraFlip = { viewModel.switchCamera() },
            onSpeakerToggle = { viewModel.toggleSpeaker() },
            onSendChatMessage = { viewModel.sendChatMessage(it) },
            onSwitchMode = { viewModel.switchMode(it) }
        )
    } else {
        ConsultationPrepareScreen(
            userName = patientName,
            doctorName = doctorName,
            isConnecting = uiState.isConnecting || uiState.isWaitingForDoctor,
            statusMessage = statusMessage,
            hasMedicalRecordAccess = uiState.hasMedicalRecordAccess,
            medicalRecordAccessExpiresAt = uiState.medicalRecordAccessExpiresAt,
            isMedicalRecordAccessLoading = uiState.isMedicalRecordAccessLoading,
            medicalRecordAccessMessage = uiState.medicalRecordAccessMessage,
            guardianAnalyticsSharingAllowed = uiState.guardianAnalyticsSharingAllowed,
            onBackClick = onBackClick,
            onGrantMedicalRecordAccess = { viewModel.grantMedicalRecordAccess(it) },
            onRevokeMedicalRecordAccess = { viewModel.revokeMedicalRecordAccess() },
            onStartConsultation = { allowAiVitals ->
                val hasCamera = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                val hasMic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

                // Pass the consent value to viewModel
                viewModel.setVisionAnalysisConsent(allowAiVitals)

                if (hasCamera && hasMic) {
                    viewModel.joinConsultation(appointmentId)
                } else {
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.CAMERA,
                            Manifest.permission.RECORD_AUDIO
                        )
                    )
                }
            }
        )
    }

    if (showCompletionDialog) {
        ConsultationCompletionDialog(
            userName = patientName,
            doctorName = doctorName,
            onDismiss = {
                showCompletionDialog = false
                viewModel.dismissCompletion()
                onConsultationComplete()
            },
            onSubmitReview = { rating, comment ->
                viewModel.submitReview(rating, comment) {
                    showCompletionDialog = false
                    viewModel.dismissCompletion()
                    onConsultationComplete()
                }
            }
        )
    }
}
