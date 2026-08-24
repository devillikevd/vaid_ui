package com.example.swastik.ui.viewmodel

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import android.net.Uri
import androidx.lifecycle.ViewModel
import com.example.swastik.R
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.FacilityType
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.remote.dto.ChatMessage
import com.example.swastik.data.remote.dto.ChatSession
import com.example.swastik.data.remote.dto.HealthTip
import com.example.swastik.data.remote.dto.SymptomAnalysis
import com.example.swastik.data.repository.ChatbotRepository
import com.example.swastik.data.repository.HospitalRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.utils.LocationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.Locale
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * UI model for a chat message displayed in the chatbot screen.
 */
data class ChatUiMessage(
    val id: String,
    val content: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val severity: String? = null,
    val possibleConditions: List<String>? = null,
    val recommendedSpecialist: String? = null,
    val requiresEmergency: Boolean = false,
    val isEmergency: Boolean = false,
    val confidenceScore: Float? = null,
    val followUpQuestion: String? = null,
    val provider: String? = null,
    val imageUri: Uri? = null
)

enum class ChatLanguage(val code: String, val label: String, val nativeLabel: String, val speechCode: String) {
    ENGLISH("en", "English", "English", "en-IN"),
    HINDI("hi", "Hindi", "हिन्दी", "hi-IN");

    companion object {
        fun fromCode(code: String?): ChatLanguage = entries.firstOrNull { it.code == code } ?: ENGLISH
    }
}

data class ChatbotUiState(
    val messages: List<ChatUiMessage> = emptyList(),
    val isLoading: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val sessionStarted: Boolean = false,
    val activeSessionId: String? = null,
    val availableSessions: List<ChatSession> = emptyList(),
    val isLoadingSessions: Boolean = false,
    val symptomAnalysis: SymptomAnalysis? = null,
    val healthTips: List<HealthTip> = emptyList(),
    val isLoadingHealthTips: Boolean = false,
    val emergencyTriggered: Boolean = false,
    val rateLimited: Boolean = false,
    val selectedLanguage: ChatLanguage = ChatLanguage.ENGLISH,
    val ttsEnabled: Boolean = false,
    val lastAiMessageToSpeak: String? = null
)

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val chatbotRepository: ChatbotRepository,
    private val hospitalRepository: HospitalRepository,
    private val locationHelper: LocationHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ChatbotUiState(
            selectedLanguage = ChatLanguage.fromCode(AppSettingsStore.settings.value.chatbotLanguage),
            ttsEnabled = AppSettingsStore.settings.value.chatbotTtsEnabled
        )
    )
    val uiState: StateFlow<ChatbotUiState> = _uiState.asStateFlow()

    init {
        restoreOrStartSession()
        loadSessionList()
    }

    private fun buildWelcomeMessage(isConnected: Boolean): ChatUiMessage {
        val content = if (isConnected) {
            context.getString(R.string.chatbot_welcome_connected)
        } else {
            context.getString(R.string.chatbot_welcome_disconnected)
        }

        return ChatUiMessage(
            id = "welcome",
            content = content,
            isUser = false
        )
    }

    private suspend fun createFreshSession() {
        when (val result = chatbotRepository.startSession()) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    sessionStarted = true,
                    activeSessionId = result.data.sessionId,
                    messages = emptyList(),
                    error = null,
                    rateLimited = false
                )
                loadSessionList()
            }
            is Result.Error -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                    sessionStarted = false,
                    activeSessionId = null,
                    messages = listOf(buildWelcomeMessage(isConnected = false))
                )
            }
            is Result.Loading -> Unit
        }
    }

    private fun mapHistoryMessage(message: ChatMessage): ChatUiMessage? {
        if (message.role == "system") return null
        return ChatUiMessage(
            id = message.id ?: "${message.role}_${System.currentTimeMillis()}",
            content = message.content,
            isUser = message.role == "user"
        )
    }

    private fun restoreOrStartSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val restoredSessionId = chatbotRepository.getCurrentSessionId()
            if (!restoredSessionId.isNullOrBlank()) {
                when (val historyResult = chatbotRepository.getChatHistory(restoredSessionId)) {
                    is Result.Success -> {
                        val restoredMessages = historyResult.data.mapNotNull(::mapHistoryMessage)
                        if (restoredMessages.isNotEmpty()) {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                sessionStarted = true,
                                activeSessionId = restoredSessionId,
                                messages = restoredMessages,
                                error = null,
                                rateLimited = false
                            )
                            return@launch
                        }
                        chatbotRepository.clearSession()
                    }
                    is Result.Error -> chatbotRepository.clearSession()
                    is Result.Loading -> Unit
                }
            }

            createFreshSession()
        }
    }

    fun loadSessionList() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingSessions = true)
            when (val result = chatbotRepository.getChatSessions()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        availableSessions = result.data,
                        isLoadingSessions = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingSessions = false,
                        error = _uiState.value.error ?: result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun openSession(sessionId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            chatbotRepository.setCurrentSession(sessionId)
            when (val result = chatbotRepository.getChatHistory(sessionId)) {
                is Result.Success -> {
                    val restoredMessages = result.data.mapNotNull(::mapHistoryMessage)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        sessionStarted = true,
                        activeSessionId = sessionId,
                        messages = restoredMessages,
                        rateLimited = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun sendMessage(content: String, messageType: String = "text") {
        if (content.isBlank() || _uiState.value.rateLimited) return

        if (messageType == "text" && handleLocalFacilityAgent(content)) {
            return
        }

        val userMessage = ChatUiMessage(
            id = "user_${System.currentTimeMillis()}",
            content = content,
            isUser = true
        )

        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMessage,
            isSending = true,
            error = null
        )

        val language = _uiState.value.selectedLanguage.code

        viewModelScope.launch {
            when (val result = chatbotRepository.sendMessage(content, messageType, language)) {
                is Result.Success -> {
                    val data = result.data
                    val response = data.response
                    val aiMsgId = "ai_${System.currentTimeMillis()}"

                    val aiMessage = ChatUiMessage(
                        id = aiMsgId,
                        content = response.summary,
                        isUser = false,
                        severity = response.severity,
                        possibleConditions = response.possibleConditions,
                        recommendedSpecialist = response.recommendedSpecialist,
                        requiresEmergency = response.requiresEmergency,
                        isEmergency = data.isEmergency == true,
                        confidenceScore = response.confidenceScore,
                        followUpQuestion = response.followUpQuestion,
                        provider = data.provider
                    )

                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + aiMessage,
                        isSending = false,
                        emergencyTriggered = response.requiresEmergency,
                        rateLimited = data.rateLimited == true,
                        activeSessionId = chatbotRepository.getCurrentSessionId(),
                        lastAiMessageToSpeak = if (_uiState.value.ttsEnabled) aiMsgId else null
                    )
                    loadSessionList()
                }
                is Result.Error -> {
                    val errorMessage = ChatUiMessage(
                        id = "error_${System.currentTimeMillis()}",
                        content = result.message.ifBlank { "Sorry, I couldn't process your message. Please try again." },
                        isUser = false
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + errorMessage,
                        isSending = false,
                        error = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    private fun handleLocalFacilityAgent(content: String): Boolean {
        val facilityType = detectFacilityIntent(content) ?: return false
        val userMessage = ChatUiMessage(
            id = "user_${System.currentTimeMillis()}",
            content = content,
            isUser = true
        )

        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMessage,
            isSending = true,
            error = null
        )

        viewModelScope.launch {
            val aiMessage = try {
                val location = locationHelper.getLastLocation()
                if (location == null) {
                    ChatUiMessage(
                        id = "facility_${System.currentTimeMillis()}",
                        content = "I can search VAIDIDEA facilities once location permission is available. Please allow location, then ask again or open the ${facilityType.getDisplayName()} map from the app.",
                        isUser = false,
                        followUpQuestion = "Open the map view to call, navigate, or book.",
                        provider = "local_facility_agent"
                    )
                } else {
                    val facilities = loadNearbyFacilities(facilityType, location.latitude, location.longitude)
                    ChatUiMessage(
                        id = "facility_${System.currentTimeMillis()}",
                        content = buildFacilityAgentReply(facilityType, facilities),
                        isUser = false,
                        followUpQuestion = "Open the ${facilityType.getDisplayName()} map to call, navigate, or book.",
                        provider = "local_facility_agent"
                    )
                }
            } catch (error: Exception) {
                ChatUiMessage(
                    id = "facility_error_${System.currentTimeMillis()}",
                    content = "I could not load nearby ${facilityType.getDisplayName().lowercase(Locale.ROOT)} options right now. Please try again in a moment from the map view.",
                    isUser = false,
                    provider = "local_facility_agent"
                )
            }

            _uiState.value = _uiState.value.copy(
                messages = _uiState.value.messages + aiMessage,
                isSending = false,
                lastAiMessageToSpeak = if (_uiState.value.ttsEnabled) aiMessage.id else null
            )

            val currentSession = chatbotRepository.getCurrentSessionId()
            if (!currentSession.isNullOrBlank()) {
                chatbotRepository.recordMessageInLocalSession(currentSession, content, aiMessage.content)
                loadSessionList()
            }
        }

        return true
    }

    private fun detectFacilityIntent(content: String): FacilityType? {
        val text = content.lowercase(Locale.ROOT)
        val wantsNearby = listOf(
            "nearby", "near me", "near", "around me", "closest", "find", "search", "locate", "map",
            "nzdik", "nazdik", "najdik", "paas", "पास", "नजदीक", "नज़दीक"
        ).any { text.contains(it) }
        if (!wantsNearby) return null

        return when {
            listOf("diagnostic", "diagnostics", "lab", "pathology", "test center", "scan").any { text.contains(it) } ->
                FacilityType.DIAGNOSTIC_CENTER
            listOf("gym", "gyms", "fitness center", "fitness studio", "yoga studio", "studio", "workout center").any { text.contains(it) } ->
                FacilityType.FITNESS_CENTER
            listOf("pharmacy", "medical store", "medicine shop", "chemist").any { text.contains(it) } ->
                FacilityType.MEDICAL_STORE
            listOf("clinic", "clinics").any { text.contains(it) } ->
                FacilityType.CLINIC
            listOf("hospital", "hospitals").any { text.contains(it) } ->
                FacilityType.HOSPITAL
            else -> null
        }
    }

    private suspend fun loadNearbyFacilities(
        facilityType: FacilityType,
        latitude: Double,
        longitude: Double
    ): List<MedicalFacility> {
        return when (facilityType) {
            FacilityType.HOSPITAL, FacilityType.NURSING_HOME -> hospitalRepository.getNearbyHospitals(latitude, longitude, radius = 25)
            FacilityType.CLINIC -> hospitalRepository.getNearbyClinics(latitude, longitude, radius = 25)
            FacilityType.MEDICAL_STORE -> hospitalRepository.getNearbyPharmacies(latitude, longitude, radius = 25)
            FacilityType.DIAGNOSTIC_CENTER -> hospitalRepository.getNearbyDiagnosticCenters(latitude, longitude, radius = 25)
            FacilityType.FITNESS_CENTER -> hospitalRepository.getNearbyFitnessCenters(latitude, longitude, radius = 25)
        }
    }

    private fun buildFacilityAgentReply(
        facilityType: FacilityType,
        facilities: List<MedicalFacility>
    ): String {
        val topFacilities = facilities
            .sortedWith(compareBy<MedicalFacility> { it.distanceKm <= 0.0 }.thenBy { it.distanceKm })
            .take(5)

        if (topFacilities.isEmpty()) {
            return "I could not find nearby ${facilityType.getDisplayName().lowercase(Locale.ROOT)} options in VAIDIDEA for your current location. Try increasing the radius from the map view."
        }

        return buildString {
            append("Found ${topFacilities.size} nearby ${facilityType.getDisplayName().lowercase(Locale.ROOT)} options in VAIDIDEA:")
            topFacilities.forEachIndexed { index, facility ->
                append("\n\n")
                append(index + 1)
                append(". ")
                append(facility.name)
                append(" - ")
                append(facility.distance.ifBlank { "distance unavailable" })
                append(" - ")
                append(if (facility.isOpen) "Open" else "Closed")
                if (facility.address.isNotBlank()) {
                    append("\nAddress: ")
                    append(facility.address)
                }
                if (facility.phone.isNotBlank()) {
                    append("\nPhone: ")
                    append(facility.phone)
                }
            }
        }
    }

    fun startFreshSession() {
        val selectedLanguage = _uiState.value.selectedLanguage
        val ttsEnabled = _uiState.value.ttsEnabled
        val cachedTips = _uiState.value.healthTips

        viewModelScope.launch {
            chatbotRepository.clearSession()
            _uiState.value = ChatbotUiState(
                selectedLanguage = selectedLanguage,
                ttsEnabled = ttsEnabled,
                healthTips = cachedTips,
                isLoading = true
            )
            createFreshSession()
        }
    }

    fun clearChat() {
        startFreshSession()
    }

    fun sendImage(imageUri: Uri, description: String = "") {
        if (_uiState.value.rateLimited) return

        val userMessage = ChatUiMessage(
            id = "user_img_${System.currentTimeMillis()}",
            content = if (description.isNotBlank()) "Photo shared: $description" else "Photo shared for analysis",
            isUser = true,
            imageUri = imageUri
        )

        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMessage,
            isSending = true,
            error = null
        )

        viewModelScope.launch {
            if (chatbotRepository.getCurrentSessionId() == null) {
                createFreshSession()
            }
            // Proceed only if we have a valid session now
            if (chatbotRepository.getCurrentSessionId() == null) {
                _uiState.value = _uiState.value.copy(
                    isSending = false,
                    error = "Failed to start a session for image analysis."
                )
                return@launch
            }

            when (val result = chatbotRepository.sendImage(imageUri, description)) {
                is Result.Success -> {
                    val data = result.data
                    val response = data.response
                    val aiImgMsgId = "ai_img_${System.currentTimeMillis()}"

                    val aiMessage = ChatUiMessage(
                        id = aiImgMsgId,
                        content = response.summary,
                        isUser = false,
                        severity = response.severity,
                        possibleConditions = response.possibleConditions,
                        recommendedSpecialist = response.recommendedSpecialist,
                        requiresEmergency = response.requiresEmergency,
                        confidenceScore = response.confidenceScore,
                        followUpQuestion = response.followUpQuestion,
                        provider = data.provider
                    )

                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + aiMessage,
                        isSending = false,
                        emergencyTriggered = response.requiresEmergency,
                        rateLimited = data.rateLimited == true,
                        activeSessionId = chatbotRepository.getCurrentSessionId(),
                        lastAiMessageToSpeak = if (_uiState.value.ttsEnabled) aiImgMsgId else null
                    )
                    loadSessionList()
                }
                is Result.Error -> {
                    val errorMessage = ChatUiMessage(
                        id = "error_${System.currentTimeMillis()}",
                        content = result.message.ifBlank { "Sorry, I couldn't analyze the image. Please try again or describe your symptoms in text." },
                        isUser = false
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + errorMessage,
                        isSending = false,
                        error = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun acknowledgeEmergency() {
        _uiState.value = _uiState.value.copy(emergencyTriggered = false)
    }

    fun analyzeSymptoms(symptoms: List<String>, duration: String? = null, severity: String? = null) {
        if (symptoms.isEmpty() || _uiState.value.rateLimited) return

        val userPrompt = buildString {
            append("Symptom check")
            append(": ")
            append(symptoms.joinToString(", "))
            if (!duration.isNullOrBlank()) append(" for $duration")
            if (!severity.isNullOrBlank()) append(" ($severity)")
        }

        val userMessage = ChatUiMessage(
            id = "user_symptoms_${System.currentTimeMillis()}",
            content = userPrompt,
            isUser = true
        )

        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMessage,
            isSending = true,
            error = null
        )

        viewModelScope.launch {
            when (val result = chatbotRepository.analyzeSymptoms(symptoms, duration, severity)) {
                is Result.Success -> {
                    val analysis = result.data
                    val content = buildString {
                        append("I analyzed the symptoms you shared.")
                        if (analysis.suggestions.isNotEmpty()) {
                            append("\n\nNext steps:")
                            analysis.suggestions.take(3).forEach { suggestion ->
                                append("\n• $suggestion")
                            }
                        }
                        if (analysis.seekImmediateCare) {
                            append("\n\nThis needs urgent attention. Please use SOS or call 102/108 now.")
                        }
                    }

                    val aiMessage = ChatUiMessage(
                        id = "analysis_${System.currentTimeMillis()}",
                        content = content,
                        isUser = false,
                        severity = analysis.severity,
                        possibleConditions = analysis.possibleConditions.map { it.name },
                        recommendedSpecialist = analysis.recommendedSpecialties.firstOrNull(),
                        requiresEmergency = analysis.seekImmediateCare,
                        followUpQuestion = analysis.suggestions.firstOrNull(),
                        provider = "symptom_analysis"
                    )

                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + aiMessage,
                        isSending = false,
                        symptomAnalysis = analysis,
                        emergencyTriggered = analysis.seekImmediateCare,
                        activeSessionId = chatbotRepository.getCurrentSessionId()
                    )
                    loadSessionList()
                }
                is Result.Error -> {
                    val errorMessage = ChatUiMessage(
                        id = "error_${System.currentTimeMillis()}",
                        content = result.message.ifBlank { "Unable to analyze symptoms right now. Please try again or consult a doctor directly." },
                        isUser = false
                    )
                    _uiState.value = _uiState.value.copy(
                        messages = _uiState.value.messages + errorMessage,
                        isSending = false,
                        error = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun getHealthTips(category: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingHealthTips = true)
            when (val result = chatbotRepository.getHealthTips(category)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        healthTips = result.data,
                        isLoadingHealthTips = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingHealthTips = false,
                        error = result.message
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun toggleLanguage() {
        val newLanguage = if (_uiState.value.selectedLanguage == ChatLanguage.ENGLISH) {
            ChatLanguage.HINDI
        } else {
            ChatLanguage.ENGLISH
        }
        AppSettingsStore.updateChatbotLanguage(newLanguage.code)
        _uiState.value = _uiState.value.copy(selectedLanguage = newLanguage)
    }

    fun setLanguage(language: ChatLanguage) {
        AppSettingsStore.updateChatbotLanguage(language.code)
        _uiState.value = _uiState.value.copy(selectedLanguage = language)
    }

    fun toggleTts() {
        val enabled = !_uiState.value.ttsEnabled
        AppSettingsStore.updateChatbotTtsEnabled(enabled)
        _uiState.value = _uiState.value.copy(ttsEnabled = enabled)
    }

    fun clearSpeakFlag() {
        _uiState.value = _uiState.value.copy(lastAiMessageToSpeak = null)
    }

    fun speakMessage(messageId: String) {
        _uiState.value = _uiState.value.copy(lastAiMessageToSpeak = messageId)
    }
}
