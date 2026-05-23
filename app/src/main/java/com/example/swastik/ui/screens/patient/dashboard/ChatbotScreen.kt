package com.example.swastik.ui.screens.patient.dashboard

import androidx.compose.ui.graphics.graphicsLayer
import com.example.swastik.ui.theme.SwastikPrimaryLight

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.ChatSession
import com.example.swastik.data.remote.dto.HealthTip
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.ChatLanguage
import com.example.swastik.ui.viewmodel.ChatUiMessage
import java.io.File
import java.util.Locale
import androidx.compose.ui.res.stringResource
import com.example.swastik.R


data class ChatQuickAction(
    val icon: ImageVector,
    val label: String,
    val query: String
)

data class ChatFeatureAction(
    val icon: ImageVector,
    val label: String,
    val helper: String,
    val onClick: () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChatbotScreen(
    onBackClick: () -> Unit = {},
    onNavigateToEmergency: () -> Unit = {},
    viewModel: com.example.swastik.ui.viewmodel.ChatbotViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val messages = uiState.messages
    val isLoading = uiState.isLoading
    val isSending = uiState.isSending
    val selectedLanguage = uiState.selectedLanguage

    var inputText by remember { mutableStateOf("") }
    var showSymptomChecker by remember { mutableStateOf(false) }
    var showTipsSheet by remember { mutableStateOf(false) }
    var showHistorySheet by remember { mutableStateOf(false) }
    var selectedTipCategory by remember { mutableStateOf("general") }
    val listState = rememberLazyListState()
    // ==================== TTS ENGINE ====================
    var ttsReady by remember { mutableStateOf(false) }
    var isSpeaking by remember { mutableStateOf(false) }
    val tts = remember {
        var engine: TextToSpeech? = null
        engine = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true
            }
        }
        engine
    }

    // Update TTS language when selected language changes
    LaunchedEffect(selectedLanguage, ttsReady) {
        if (ttsReady && tts != null) {
            val locale = when (selectedLanguage) {
                ChatLanguage.HINDI -> Locale("hi", "IN")
                ChatLanguage.ENGLISH -> Locale("en", "IN")
            }
            tts.setLanguage(locale)
        }
    }

    // Auto-speak AI responses when ttsEnabled
    LaunchedEffect(uiState.lastAiMessageToSpeak) {
        val msgId = uiState.lastAiMessageToSpeak
        if (msgId != null && ttsReady && tts != null) {
            val msg = messages.find { it.id == msgId }
            if (msg != null && !msg.isUser) {
                tts.stop()
                tts.speak(msg.content, TextToSpeech.QUEUE_FLUSH, null, msgId)
                isSpeaking = true
            }
            viewModel.clearSpeakFlag()
        }
    }

    // Cleanup TTS on dispose
    DisposableEffect(Unit) {
        onDispose {
            tts?.stop()
            tts?.shutdown()
        }
    }

    // ==================== VOICE INPUT STATE ====================
    var isListening by remember { mutableStateOf(false) }
    var voicePartialResult by remember { mutableStateOf("") }
    var voiceErrorMessage by remember { mutableStateOf<String?>(null) }
    val speechRecognizer = remember { SpeechRecognizer.createSpeechRecognizer(context) }

    // ==================== IMAGE PICKER STATE ====================
    var showAttachMenu by remember { mutableStateOf(false) }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var showImagePreview by remember { mutableStateOf(false) }
    var imageDescription by remember { mutableStateOf("") }
    var cameraImageUri by remember { mutableStateOf<Uri?>(null) }

    // Gallery picker launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            showImagePreview = true
        }
    }

    // Camera launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success && cameraImageUri != null) {
            selectedImageUri = cameraImageUri
            showImagePreview = true
        }
    }

    // Permission launcher for camera
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            val file = File(context.cacheDir, "camera_photo_${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
            cameraImageUri = uri
            cameraLauncher.launch(uri)
        }
    }

    // Permission launcher for microphone
    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                val msg = if (selectedLanguage == ChatLanguage.HINDI) {
                    "इस डिवाइस पर वॉइस रिकग्निशन उपलब्ध नहीं है"
                } else {
                    "Voice recognition is not available on this device"
                }
                voiceErrorMessage = msg
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                return@rememberLauncherForActivityResult
            }
            try {
                startVoiceRecognition(speechRecognizer, context, selectedLanguage)
                isListening = true
            } catch (e: Exception) {
                val msg = if (selectedLanguage == ChatLanguage.HINDI) {
                    "माइक शुरू नहीं हो सका। फिर से प्रयास करें।"
                } else {
                    "Could not start microphone. Please try again."
                }
                voiceErrorMessage = msg
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            }
        } else {
            val msg = if (selectedLanguage == ChatLanguage.HINDI) {
                "माइक अनुमति अस्वीकृत है"
            } else {
                "Microphone permission denied"
            }
            voiceErrorMessage = msg
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
        }
    }

    // Setup SpeechRecognizer listener
    DisposableEffect(speechRecognizer) {
        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                voiceErrorMessage = null
                voicePartialResult = if (selectedLanguage == ChatLanguage.HINDI) "सुन रहा हूँ..." else "Listening..."
            }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { isListening = false }
            override fun onError(error: Int) {
                isListening = false
                voicePartialResult = ""
                val msg = when (error) {
                    SpeechRecognizer.ERROR_NETWORK,
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> if (selectedLanguage == ChatLanguage.HINDI) "नेटवर्क समस्या। दोबारा कोशिश करें।" else "Network issue. Please try again."
                    SpeechRecognizer.ERROR_NO_MATCH,
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> if (selectedLanguage == ChatLanguage.HINDI) "आवाज़ स्पष्ट नहीं मिली। फिर से बोलें।" else "Could not hear clearly. Please speak again."
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> if (selectedLanguage == ChatLanguage.HINDI) "माइक अनुमति आवश्यक है" else "Microphone permission is required"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> if (selectedLanguage == ChatLanguage.HINDI) "वॉइस सेवा व्यस्त है। एक सेकंड बाद कोशिश करें।" else "Voice service is busy. Try again in a second."
                    else -> if (selectedLanguage == ChatLanguage.HINDI) "वॉइस इनपुट विफल हुआ" else "Voice input failed"
                }
                voiceErrorMessage = msg
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            }
            override fun onResults(results: Bundle?) {
                isListening = false
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val transcript = matches?.firstOrNull() ?: ""
                voicePartialResult = ""
                if (transcript.isNotBlank()) {
                    viewModel.sendMessage(transcript, "voice")
                }
            }
            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                voicePartialResult = matches?.firstOrNull() ?: ""
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        onDispose { speechRecognizer.destroy() }
    }

    // Emergency auto-navigation trigger
    LaunchedEffect(uiState.emergencyTriggered) {
        if (uiState.emergencyTriggered) {
            viewModel.acknowledgeEmergency()
            onNavigateToEmergency()
        }
    }

    LaunchedEffect(showTipsSheet, selectedTipCategory) {
        if (showTipsSheet) {
            viewModel.getHealthTips(selectedTipCategory)
        }
    }

    LaunchedEffect(showHistorySheet) {
        if (showHistorySheet) {
            viewModel.loadSessionList()
        }
    }

    // Auto-scroll logic
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val quickActions = remember {
        listOf(
            ChatQuickAction(Icons.Outlined.Thermostat, "I have fever", "I'm experiencing fever symptoms"),
            ChatQuickAction(Icons.Outlined.Favorite, "Chest pain", "I'm having chest pain"),
            ChatQuickAction(Icons.Outlined.Event, "Book appointment", "I want to book an appointment"),
            ChatQuickAction(Icons.Outlined.Medication, "Medicine info", "I need information about medicines"),
            ChatQuickAction(Icons.Outlined.Description, "View reports", "I want to see my medical reports"),
            ChatQuickAction(Icons.Outlined.LocalHospital, "Find hospital", "Help me find a nearby hospital")
        )
    }

    val featureActions = remember {
        listOf(
            ChatFeatureAction(
                icon = Icons.Outlined.Thermostat,
                label = "Symptom check",
                helper = "Structured triage",
                onClick = { showSymptomChecker = true }
            ),
            ChatFeatureAction(
                icon = Icons.Outlined.Lightbulb,
                label = "Health tips",
                helper = "Daily guidance",
                onClick = { showTipsSheet = true }
            ),
            ChatFeatureAction(
                icon = Icons.Outlined.History,
                label = "Chat history",
                helper = "Resume older chat",
                onClick = { showHistorySheet = true }
            )
        )
    }

    fun sendMessage(text: String, messageType: String = "text") {
        if (text.isBlank()) return
        viewModel.sendMessage(text, messageType)
        inputText = ""
    }

    Scaffold(
        modifier = Modifier.statusBarsPadding(),
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.linearGradient(
                                        colors = listOf(SwastikPrimary, Color(0xFF9C27B0))
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) { Text(stringResource(R.string.ud83e_udd16), fontSize = 18.sp) }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(stringResource(R.string.chatbot), fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(6.dp).background(Color(0xFF4CAF50), CircleShape))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("AI \u2022 Voice \u2022 Vision", fontSize = 10.sp, color = Color(0xFF4CAF50))
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(20.dp))
                    }
                },
                actions = {
                    // Language toggle chip
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = SwastikPrimary.copy(alpha = 0.1f),
                        modifier = Modifier.clickable { viewModel.toggleLanguage() }
                    ) {
                        Text(
                            text = if (selectedLanguage == ChatLanguage.ENGLISH) "EN" else "HI",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                    // TTS toggle
                    IconButton(onClick = { viewModel.toggleTts() }, modifier = Modifier.size(36.dp)) {
                        Icon(
                            imageVector = if (uiState.ttsEnabled) Icons.AutoMirrored.Filled.VolumeUp else Icons.Filled.VolumeOff,
                            contentDescription = "Toggle voice",
                            tint = if (uiState.ttsEnabled) SwastikPrimary else Color.Gray,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    // Clear chat
                    IconButton(onClick = { viewModel.clearChat() }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Outlined.DeleteSweep, contentDescription = "Clear", modifier = Modifier.size(20.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            Column {
                // Voice listening indicator
                AnimatedVisibility(
                    visible = isListening,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut() + scaleOut()
                ) {
                    VoiceListeningBar(
                        partialResult = voicePartialResult,
                        language = selectedLanguage,
                        onStop = {
                            speechRecognizer.stopListening()
                            isListening = false
                            voicePartialResult = ""
                        }
                    )
                }

                ChatInputBar(
                    value = inputText,
                    onValueChange = { inputText = it },
                    onSend = { sendMessage(inputText) },
                    onVoiceClick = {
                        if (isListening) {
                            speechRecognizer.stopListening()
                            isListening = false
                            voicePartialResult = ""
                        } else {
                            // Stop any TTS first
                            tts?.stop()
                            isSpeaking = false
                            val hasPermission = ContextCompat.checkSelfPermission(
                                context, Manifest.permission.RECORD_AUDIO
                            ) == PackageManager.PERMISSION_GRANTED
                            if (hasPermission) {
                                if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                                    val msg = if (selectedLanguage == ChatLanguage.HINDI) {
                                        "इस डिवाइस पर वॉइस रिकग्निशन उपलब्ध नहीं है"
                                    } else {
                                        "Voice recognition is not available on this device"
                                    }
                                    voiceErrorMessage = msg
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                } else {
                                    try {
                                        startVoiceRecognition(speechRecognizer, context, selectedLanguage)
                                        isListening = true
                                    } catch (e: Exception) {
                                        val msg = if (selectedLanguage == ChatLanguage.HINDI) {
                                            "माइक शुरू नहीं हो सका। फिर से प्रयास करें।"
                                        } else {
                                            "Could not start microphone. Please try again."
                                        }
                                        voiceErrorMessage = msg
                                        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                    }
                                }
                            } else {
                                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        }
                    },
                    onAttachClick = { showAttachMenu = true },
                    isLoading = isSending || isLoading,
                    inputEnabled = !uiState.rateLimited,
                    isListening = isListening,
                    language = selectedLanguage
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF5F5F5))
                .padding(paddingValues)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Rate limit warning
                if (uiState.rateLimited) {
                    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFFFF3E0)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Outlined.Warning, contentDescription = null, tint = Color(0xFFFF9800), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Message limit reached. Start a new session or try again later.",
                                fontSize = 12.sp,
                                color = Color(0xFFE65100),
                                modifier = Modifier.weight(1f)
                            )
                            TextButton(onClick = { viewModel.startFreshSession() }) {
                                Text(stringResource(R.string.new_chat), color = Color(0xFFE65100))
                            }
                        }
                    }
                }

                // Voice recognition warning
                if (!voiceErrorMessage.isNullOrBlank()) {
                    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFFFEBEE)) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Warning, contentDescription = null, tint = Color(0xFFD32F2F), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(voiceErrorMessage!!, fontSize = 12.sp, color = Color(0xFFD32F2F))
                        }
                    }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 16.dp)
                ) {
                    item {
                        SessionStatusCard(
                            sessionId = uiState.activeSessionId,
                            selectedLanguage = selectedLanguage,
                            featureActions = featureActions
                        )
                    }
                    items(messages, key = { it.id }) { message ->
                        ChatBubble(
                            message = message,
                            onSpeakClick = { msgId ->
                                if (ttsReady && tts != null) {
                                    val msg = messages.find { it.id == msgId }
                                    if (msg != null) {
                                        tts.stop()
                                        tts.speak(msg.content, TextToSpeech.QUEUE_FLUSH, null, msgId)
                                        isSpeaking = true
                                    }
                                }
                            }
                        )
                    }
                    if (messages.size == 1) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(stringResource(R.string.quick_actions), fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.Gray, modifier = Modifier.padding(vertical = 8.dp))
                            QuickActionsGrid(actions = quickActions, onActionClick = { action -> sendMessage(action.query) })
                        }
                    }
                    if (isSending || isLoading) {
                        item { TypingIndicator() }
                    }
                }
            }

            // Attachment bottom sheet
            if (showAttachMenu) {
                AttachmentMenu(
                    onDismiss = { showAttachMenu = false },
                    onCameraClick = {
                        showAttachMenu = false
                        val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                        if (hasPermission) {
                            val file = File(context.cacheDir, "camera_photo_${System.currentTimeMillis()}.jpg")
                            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
                            cameraImageUri = uri
                            cameraLauncher.launch(uri)
                        } else {
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    },
                    onGalleryClick = {
                        showAttachMenu = false
                        galleryLauncher.launch("image/*")
                    }
                )
            }

            // Image preview dialog
            if (showImagePreview && selectedImageUri != null) {
                ImagePreviewDialog(
                    imageUri = selectedImageUri!!,
                    description = imageDescription,
                    onDescriptionChange = { imageDescription = it },
                    onSend = {
                        viewModel.sendImage(selectedImageUri!!, imageDescription)
                        showImagePreview = false
                        selectedImageUri = null
                        imageDescription = ""
                    },
                    onDismiss = {
                        showImagePreview = false
                        selectedImageUri = null
                        imageDescription = ""
                    }
                )
            }

            if (showSymptomChecker) {
                SymptomCheckerSheet(
                    onDismiss = { showSymptomChecker = false },
                    onAnalyze = { symptoms, duration, severity ->
                        viewModel.analyzeSymptoms(symptoms, duration, severity)
                        showSymptomChecker = false
                    }
                )
            }

            if (showTipsSheet) {
                HealthTipsSheet(
                    tips = uiState.healthTips,
                    isLoading = uiState.isLoadingHealthTips,
                    selectedCategory = selectedTipCategory,
                    onCategorySelected = { selectedTipCategory = it },
                    onDismiss = { showTipsSheet = false }
                )
            }

            if (showHistorySheet) {
                ChatHistorySheet(
                    sessions = uiState.availableSessions,
                    isLoading = uiState.isLoadingSessions,
                    activeSessionId = uiState.activeSessionId,
                    onDismiss = { showHistorySheet = false },
                    onNewChat = {
                        viewModel.startFreshSession()
                        showHistorySheet = false
                    },
                    onSessionSelected = { session ->
                        viewModel.openSession(session.sessionId)
                        showHistorySheet = false
                    }
                )
            }
        }
    }
}

@Composable
private fun SessionStatusCard(
    sessionId: String?,
    selectedLanguage: ChatLanguage,
    featureActions: List<ChatFeatureAction>
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.smart_care_assistant), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    Text(
                        text = "Live chat, symptom triage, image analysis, and bilingual support in ${selectedLanguage.nativeLabel}",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        lineHeight = 16.sp
                    )
                }
                if (!sessionId.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = SwastikPrimary.copy(alpha = 0.08f)
                    ) {
                        Text(
                            text = "Active",
                            color = SwastikPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                featureActions.forEach { action ->
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { action.onClick() },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F8FF))
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(action.icon, contentDescription = action.label, tint = SwastikPrimary, modifier = Modifier.size(18.dp))
                            Text(action.label, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            Text(action.helper, fontSize = 11.sp, color = Color.Gray, lineHeight = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

// ==================== VOICE LISTENING BAR ====================

@Composable
private fun VoiceListeningBar(partialResult: String, language: ChatLanguage, onStop: () -> Unit) {
    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFE8F5E9)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val infiniteTransition = rememberInfiniteTransition(label = "pulse")
            val scale by infiniteTransition.animateFloat(
                initialValue = 0.8f, targetValue = 1.2f,
                animationSpec = infiniteRepeatable(animation = tween(600), repeatMode = RepeatMode.Reverse),
                label = "scale"
            )
            Box(modifier = Modifier.size((12 * scale).dp).background(Color(0xFFD32F2F), CircleShape))
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = partialResult.ifBlank {
                        if (language == ChatLanguage.HINDI) "\uD83C\uDFA4 सुन रहा हूँ..." else "\uD83C\uDFA4 Listening..."
                    },
                    fontSize = 14.sp, color = Color(0xFF2E7D32), maxLines = 2
                )
                Text(
                    text = if (language == ChatLanguage.HINDI) "हिन्दी में बोलें" else "Speak in English",
                    fontSize = 11.sp, color = Color(0xFF66BB6A)
                )
            }
            IconButton(
                onClick = onStop,
                modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFD32F2F))
            ) {
                Icon(Icons.Filled.Stop, contentDescription = "Stop listening", tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }
    }
}

// ==================== ATTACHMENT MENU ====================

@Composable
private fun AttachmentMenu(onDismiss: () -> Unit, onCameraClick: () -> Unit, onGalleryClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)).clickable { onDismiss() })
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { },
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            color = MaterialTheme.colorScheme.surface, shadowElevation = 16.dp
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Box(modifier = Modifier.align(Alignment.CenterHorizontally).width(40.dp).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Color.LightGray))
                Spacer(modifier = Modifier.height(20.dp))
                Text(stringResource(R.string.share_for_analysis), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(stringResource(R.string.take_a_photo_or_choose_from_gallery_for_ai_analysis), fontSize = 13.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(20.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    AttachmentOption(Icons.Outlined.CameraAlt, "Camera", "Take photo", Color(0xFF2196F3), onCameraClick)
                    AttachmentOption(Icons.Outlined.PhotoLibrary, "Gallery", "Choose photo", Color(0xFF4CAF50), onGalleryClick)
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun AttachmentOption(icon: ImageVector, label: String, subtitle: String, color: Color, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clip(RoundedCornerShape(16.dp)).clickable { onClick() }.padding(16.dp)
    ) {
        Box(modifier = Modifier.size(60.dp).clip(CircleShape).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        Text(subtitle, fontSize = 11.sp, color = Color.Gray)
    }
}

// ==================== IMAGE PREVIEW DIALOG ====================

@Composable
private fun ImagePreviewDialog(
    imageUri: Uri,
    description: String,
    onDescriptionChange: (String) -> Unit,
    onSend: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.ud83d_udcf7_analyze_image), fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", modifier = Modifier.size(20.dp))
                }
            }
        },
        text = {
            Column {
                Surface(
                    modifier = Modifier.fillMaxWidth().height(160.dp),
                    shape = RoundedCornerShape(12.dp), color = Color(0xFFF0F0F0)
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(imageUri)
                            .crossfade(true)
                            .build(),
                        contentDescription = "Selected image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(stringResource(R.string.add_a_description_optional), fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = description, onValueChange = onDescriptionChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(stringResource(R.string.describe_symptoms_or_concern), fontSize = 13.sp) },
                    textStyle = TextStyle(fontSize = 14.sp),
                    shape = RoundedCornerShape(12.dp), maxLines = 3
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(stringResource(R.string.u2695_ufe0f_ai_will_analyze_for_skin_conditions_wounds_or_abnormalities_always_consult_a_doctor), fontSize = 11.sp, color = Color.Gray, lineHeight = 16.sp)
            }
        },
        confirmButton = {
            Button(onClick = onSend, colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary), shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(stringResource(R.string.analyze))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
        shape = RoundedCornerShape(20.dp)
    )
}

// ==================== SEVERITY BADGE ====================

@Composable
private fun SeverityBadge(severity: String) {
    val (color, label) = when (severity.lowercase()) {
        "critical" -> Color(0xFFD32F2F) to "\uD83D\uDEA8 Critical"
        "high" -> Color(0xFFFF5722) to "\u26A0\uFE0F High"
        "medium" -> Color(0xFFFF9800) to "\uD83D\uDFE1 Medium"
        else -> Color(0xFF4CAF50) to "\uD83D\uDFE2 Low"
    }
    Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f), modifier = Modifier.padding(top = 8.dp)) {
        Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = color, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

// ==================== SPECIALIST CHIP ====================

@Composable
private fun SpecialistChip(specialist: String) {
    Surface(shape = RoundedCornerShape(12.dp), color = SwastikPrimary.copy(alpha = 0.1f), modifier = Modifier.padding(top = 4.dp)) {
        Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.ud83e_ude7a), fontSize = 11.sp)
            Spacer(modifier = Modifier.width(4.dp))
            Text(text = specialist, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = SwastikPrimary)
        }
    }
}

@Composable
private fun ChatBubble(message: ChatUiMessage, onSpeakClick: (String) -> Unit = {}) {
    val alignment = if (message.isUser) Alignment.CenterEnd else Alignment.CenterStart

    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = alignment) {
        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.widthIn(max = 300.dp)) {
            if (!message.isUser) {
                Box(
                    modifier = Modifier.size(32.dp).clip(CircleShape).background(
                        if (message.isEmergency) MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                        else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                    ),
                    contentAlignment = Alignment.Center
                ) { Text(if (message.isEmergency) "\uD83D\uDEA8" else "\uD83E\uDD16", fontSize = 16.sp) }
                Spacer(modifier = Modifier.width(8.dp))
            }

            Card(
                shape = RoundedCornerShape(
                    topStart = 18.dp, topEnd = 18.dp,
                    bottomStart = if (message.isUser) 18.dp else 4.dp,
                    bottomEnd = if (message.isUser) 4.dp else 18.dp
                ),
                colors = CardDefaults.cardColors(
                    containerColor = Color.Transparent
                ),
                elevation = CardDefaults.cardElevation(0.dp),
                modifier = (if (message.isEmergency) {
                    Modifier.border(1.dp, Color(0xFFD32F2F).copy(alpha = 0.3f),
                        RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomStart = 4.dp, bottomEnd = 16.dp))
                } else Modifier)
                .background(
                    brush = when {
                        message.isUser -> Brush.linearGradient(listOf(SwastikPrimary, Color(0xFF5E35B1)))
                        message.isEmergency -> Brush.linearGradient(listOf(MaterialTheme.colorScheme.errorContainer, Color(0xFFFFCDD2)))
                        else -> Brush.linearGradient(listOf(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.surfaceVariant))
                    },
                    shape = RoundedCornerShape(
                        topStart = 18.dp, topEnd = 18.dp,
                        bottomStart = if (message.isUser) 18.dp else 4.dp,
                        bottomEnd = if (message.isUser) 4.dp else 18.dp
                    )
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    // Show image indicator for user image messages
                    if (message.isUser && message.imageUri != null) {
                        Surface(
                            modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp, max = 220.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = Color.White.copy(alpha = 0.2f)
                        ) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(message.imageUri)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Uploaded image",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                    }

                    Text(text = message.content, fontSize = 15.sp, color = if (message.isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)

                    if (!message.isUser) {
                        if (message.severity != null && message.severity != "low") { SeverityBadge(severity = message.severity) }
                        if (message.recommendedSpecialist != null && message.recommendedSpecialist != "General Physician") { SpecialistChip(specialist = message.recommendedSpecialist) }
                        if (!message.possibleConditions.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                message.possibleConditions.take(3).forEach { condition ->
                                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF5F5F5)) {
                                        Text(text = condition, fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                    }
                                }
                            }
                        }
                        if (message.followUpQuestion != null) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(text = message.followUpQuestion, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary)
                        }
                        // Speaker button on AI messages
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                                modifier = Modifier.size(28.dp).clickable { onSpeakClick(message.id) }
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.VolumeUp,
                                        contentDescription = "Read aloud",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (message.isUser) {
                Spacer(modifier = Modifier.width(8.dp))
                Box(modifier = Modifier.size(32.dp).clip(CircleShape).background(SwastikPrimary.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.ud83d_udc64), fontSize = 16.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun SymptomCheckerSheet(
    onDismiss: () -> Unit,
    onAnalyze: (symptoms: List<String>, duration: String?, severity: String?) -> Unit
) {
    val presetSymptoms = listOf(
        "Fever", "Cough", "Headache", "Chest pain", "Breathlessness",
        "Body ache", "Vomiting", "Stomach pain", "Dizziness", "Weakness"
    )
    val selectedSymptoms = remember { mutableStateListOf<String>() }
    var customSymptoms by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("") }
    var selectedSeverity by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(stringResource(R.string.symptom_checker), fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text(
                "Share the symptoms you have right now. The assistant will suggest urgency, next steps, and a likely specialist.",
                color = Color.Gray,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                presetSymptoms.forEach { symptom ->
                    FilterChip(
                        selected = selectedSymptoms.contains(symptom),
                        onClick = {
                            if (selectedSymptoms.contains(symptom)) {
                                selectedSymptoms.remove(symptom)
                            } else {
                                selectedSymptoms.add(symptom)
                            }
                        },
                        label = { Text(symptom) }
                    )
                }
            }

            OutlinedTextField(
                value = customSymptoms,
                onValueChange = { customSymptoms = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.add_other_symptoms)) },
                placeholder = { Text(stringResource(R.string.example_sore_throat_fatigue)) },
                maxLines = 3
            )

            OutlinedTextField(
                value = duration,
                onValueChange = { duration = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.duration)) },
                placeholder = { Text(stringResource(R.string.example_2_days)) },
                singleLine = true
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.how_severe_does_it_feel), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("mild", "moderate", "severe").forEach { option ->
                        FilterChip(
                            selected = selectedSeverity == option,
                            onClick = { selectedSeverity = option },
                            label = { Text(option.replaceFirstChar { it.uppercase() }) }
                        )
                    }
                }
            }

            Button(
                onClick = {
                    val combinedSymptoms = buildList {
                        addAll(selectedSymptoms)
                        addAll(
                            customSymptoms.split(",")
                                .map { it.trim() }
                                .filter { it.isNotBlank() }
                        )
                    }.distinct()
                    onAnalyze(combinedSymptoms, duration.ifBlank { null }, selectedSeverity)
                },
                enabled = selectedSymptoms.isNotEmpty() || customSymptoms.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(stringResource(R.string.analyze_symptoms))
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun HealthTipsSheet(
    tips: List<HealthTip>,
    isLoading: Boolean,
    selectedCategory: String,
    onCategorySelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val categories = listOf(
        "general" to "General",
        "diabetes" to "Diabetes",
        "heart" to "Heart",
        "mental" to "Mental",
        "pregnancy" to "Pregnancy"
    )

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(stringResource(R.string.health_tips), fontWeight = FontWeight.Bold, fontSize = 20.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.forEach { (key, label) ->
                    FilterChip(
                        selected = selectedCategory == key,
                        onClick = { onCategorySelected(key) },
                        label = { Text(label) }
                    )
                }
            }

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 12.dp)
                ) {
                    items(tips, key = { it.id }) { tip ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(1.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(tip.title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text(tip.content, color = Color.Gray, fontSize = 13.sp, lineHeight = 18.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatHistorySheet(
    sessions: List<ChatSession>,
    isLoading: Boolean,
    activeSessionId: String?,
    onDismiss: () -> Unit,
    onNewChat: () -> Unit,
    onSessionSelected: (ChatSession) -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(stringResource(R.string.chat_history), fontWeight = FontWeight.Bold, fontSize = 20.sp)
                TextButton(onClick = onNewChat) {
                    Text(stringResource(R.string.new_chat))
                }
            }

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (sessions.isEmpty()) {
                Text(stringResource(R.string.no_previous_chat_sessions_yet), color = Color.Gray, fontSize = 13.sp)
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 12.dp)
                ) {
                    items(sessions, key = { it.sessionId }) { session ->
                        val preview = session.lastMessage ?: session.message ?: "Resume this chat"
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSessionSelected(session) },
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (session.sessionId == activeSessionId) {
                                    SwastikPrimary.copy(alpha = 0.08f)
                                } else {
                                    MaterialTheme.colorScheme.surface
                                }
                            )
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = if (session.sessionId == activeSessionId) "Current chat" else "Previous chat",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp
                                )
                                Text(preview, color = Color.Gray, fontSize = 13.sp, lineHeight = 18.sp)
                                Text(
                                    "${session.messageCount ?: 0} messages",
                                    color = SwastikPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickActionsGrid(actions: List<ChatQuickAction>, onActionClick: (ChatQuickAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        actions.chunked(2).forEach { rowActions ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                rowActions.forEach { action ->
                    QuickActionCard(action = action, onClick = { onActionClick(action) }, modifier = Modifier.weight(1f))
                }
                if (rowActions.size == 1) { Spacer(modifier = Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun QuickActionCard(action: ChatQuickAction, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(SwastikPrimary.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(action.icon, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = action.label, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun TypingIndicator() {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 40.dp)) {
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Row(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(3) { index -> TypingOrb(delay = index * 200) }
            }
        }
    }
}

@Composable
private fun TypingOrb(delay: Int) {
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.6f, targetValue = 1.2f,
        animationSpec = infiniteRepeatable(animation = tween(600, delayMillis = delay), repeatMode = RepeatMode.Reverse),
        label = "scale"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f, targetValue = 1f,
        animationSpec = infiniteRepeatable(animation = tween(600, delayMillis = delay), repeatMode = RepeatMode.Reverse),
        label = "alpha"
    )
    Box(
        modifier = Modifier
            .size(8.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                this.alpha = alpha
            }
            .background(
                Brush.radialGradient(listOf(SwastikPrimaryLight, SwastikPrimary)),
                CircleShape
            )
    )
}

@Composable
private fun ChatInputBar(
    value: String, onValueChange: (String) -> Unit,
    onSend: () -> Unit, onVoiceClick: () -> Unit,
    onAttachClick: () -> Unit, isLoading: Boolean, inputEnabled: Boolean, isListening: Boolean,
    language: ChatLanguage = ChatLanguage.ENGLISH
) {
    Surface(modifier = Modifier.fillMaxWidth(), shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            // Camera/attach button
            IconButton(onClick = onAttachClick, enabled = inputEnabled && !isLoading, modifier = Modifier.size(40.dp)) {
                Icon(Icons.Outlined.CameraAlt, contentDescription = "Attach image", tint = if (inputEnabled && !isLoading) SwastikPrimary else Color.LightGray)
            }
            // Input field
            Box(
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFFF5F5F5)).padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                BasicTextField(
                    value = value,
                    onValueChange = { if (inputEnabled) onValueChange(it) },
                    enabled = inputEnabled && !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
                    decorationBox = { innerTextField ->
                        if (value.isEmpty()) {
                            Text(
                                text = if (!inputEnabled) {
                                    "Start a new chat to continue"
                                } else if (language == ChatLanguage.HINDI) {
                                    "टाइप करें, बोलें या फ़ोटो भेजें..."
                                } else {
                                    "Type, speak, or send a photo..."
                                },
                                fontSize = 14.sp, color = Color.Gray
                            )
                        }
                        innerTextField()
                    }
                )
            }
            Spacer(modifier = Modifier.width(4.dp))
            // Voice / Send button
            if (value.isBlank()) {
                IconButton(
                    onClick = onVoiceClick, enabled = inputEnabled && !isLoading,
                    modifier = Modifier.size(44.dp).clip(CircleShape).background(
                        when {
                            isListening -> Color(0xFFD32F2F)
                            inputEnabled && !isLoading -> Color(0xFF4CAF50)
                            else -> Color.LightGray
                        }
                    )
                ) {
                    Icon(
                        if (isListening) Icons.Filled.Stop else Icons.Filled.Mic,
                        contentDescription = if (isListening) "Stop listening" else "Voice input",
                        tint = Color.White, modifier = Modifier.size(22.dp)
                    )
                }
            } else {
                IconButton(
                    onClick = onSend, enabled = inputEnabled && value.isNotBlank() && !isLoading,
                    modifier = Modifier.size(44.dp).clip(CircleShape).background(
                        if (inputEnabled && value.isNotBlank() && !isLoading) SwastikPrimary else Color.LightGray
                    )
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

// ==================== HELPER ====================

private fun startVoiceRecognition(
    speechRecognizer: SpeechRecognizer,
    context: android.content.Context,
    language: ChatLanguage = ChatLanguage.ENGLISH
) {
    val speechCode = language.speechCode // "en-IN" or "hi-IN"
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, speechCode)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, speechCode)
        putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, speechCode)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }
    speechRecognizer.startListening(intent)
}
