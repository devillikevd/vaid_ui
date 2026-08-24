package com.example.swastik.data.repository

import android.net.Uri
import android.content.Context
import com.example.swastik.data.remote.dto.ChatMessage
import com.example.swastik.data.remote.dto.ChatMessageRequest
import com.example.swastik.data.remote.dto.ChatSession
import com.example.swastik.data.remote.dto.ChatbotMessageResult
import com.example.swastik.data.remote.dto.SymptomAnalysis
import com.example.swastik.data.remote.dto.SymptomAnalysisRequest
import com.example.swastik.data.remote.dto.HealthTip
import com.example.swastik.data.remote.dto.AiProviderStatus
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.ApiResponse
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.example.swastik.utils.ImageCompressor
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

@Singleton
class ChatbotRepository @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) {
    private val preferences = context.getSharedPreferences(CHATBOT_PREFS, Context.MODE_PRIVATE)
    private var currentSessionId: String? = preferences.getString(KEY_CURRENT_SESSION_ID, null)
    private val gson = Gson()

    companion object {
        private const val CHATBOT_PREFS = "swastik_chatbot_prefs"
        private const val KEY_CURRENT_SESSION_ID = "current_session_id"
        private const val KEY_CACHED_SESSIONS = "cached_sessions"
        private const val KEY_SESSION_MESSAGES_PREFIX = "session_msgs_"
    }

    private fun persistCurrentSession(sessionId: String?) {
        currentSessionId = sessionId
        preferences.edit().putString(KEY_CURRENT_SESSION_ID, sessionId).apply()
    }

    fun getLocalSessions(): List<ChatSession> {
        val json = preferences.getString(KEY_CACHED_SESSIONS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<ChatSession>>() {}.type
            gson.fromJson<List<ChatSession>>(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveLocalSessions(sessions: List<ChatSession>) {
        val json = gson.toJson(sessions)
        preferences.edit().putString(KEY_CACHED_SESSIONS, json).apply()
    }

    fun getLocalSessionMessages(sessionId: String): List<ChatMessage> {
        val json = preferences.getString(KEY_SESSION_MESSAGES_PREFIX + sessionId, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<ChatMessage>>() {}.type
            gson.fromJson<List<ChatMessage>>(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveLocalSessionMessages(sessionId: String, messages: List<ChatMessage>) {
        val json = gson.toJson(messages)
        preferences.edit().putString(KEY_SESSION_MESSAGES_PREFIX + sessionId, json).apply()
    }

    fun recordMessageInLocalSession(sessionId: String, userContent: String, assistantSummary: String? = null) {
        val currentMessages = getLocalSessionMessages(sessionId).toMutableList()
        val userMsg = ChatMessage(
            id = "user_${System.currentTimeMillis()}",
            role = "user",
            content = userContent,
            timestamp = System.currentTimeMillis().toString(),
            audioUrl = null
        )
        currentMessages.add(userMsg)

        if (!assistantSummary.isNullOrBlank()) {
            val aiMsg = ChatMessage(
                id = "ai_${System.currentTimeMillis()}",
                role = "assistant",
                content = assistantSummary,
                timestamp = System.currentTimeMillis().toString(),
                audioUrl = null
            )
            currentMessages.add(aiMsg)
        }
        saveLocalSessionMessages(sessionId, currentMessages)

        // Update session list
        val currentSessions = getLocalSessions().toMutableList()
        val existingIndex = currentSessions.indexOfFirst { it.sessionId == sessionId }
        val preview = assistantSummary ?: userContent
        val updatedSession = ChatSession(
            sessionId = sessionId,
            lastMessage = preview,
            updatedAt = System.currentTimeMillis().toString(),
            messageCount = currentMessages.size
        )
        if (existingIndex >= 0) {
            currentSessions[existingIndex] = updatedSession
        } else {
            currentSessions.add(0, updatedSession)
        }
        saveLocalSessions(currentSessions)
    }

    suspend fun startSession(): Result<ChatSession> {
        return try {
            val response = apiService.startChatSession()
            if (response.isSuccessful && response.body()?.success == true) {
                val session = response.body()?.data ?: return Result.Error("Data was null")
                persistCurrentSession(session.sessionId)

                val currentSessions = getLocalSessions().toMutableList()
                if (currentSessions.none { it.sessionId == session.sessionId }) {
                    currentSessions.add(0, session)
                    saveLocalSessions(currentSessions)
                }
                Result.Success(session)
            } else {
                val localId = "session_local_${System.currentTimeMillis()}"
                val localSession = ChatSession(sessionId = localId, message = "Chat session started", messageCount = 0)
                persistCurrentSession(localId)
                val currentSessions = getLocalSessions().toMutableList()
                currentSessions.add(0, localSession)
                saveLocalSessions(currentSessions)
                Result.Success(localSession)
            }
        } catch (e: Exception) {
            val localId = "session_local_${System.currentTimeMillis()}"
            val localSession = ChatSession(sessionId = localId, message = "Chat session started", messageCount = 0)
            persistCurrentSession(localId)
            val currentSessions = getLocalSessions().toMutableList()
            currentSessions.add(0, localSession)
            saveLocalSessions(currentSessions)
            Result.Success(localSession)
        }
    }

    /**
     * Send a message to the AI chatbot.
     * Returns the full structured response including AI analysis,
     * severity, specialist recommendation, and emergency detection.
     *
     * @param message The user's message text
     * @param messageType "text" (routes to HuggingFace) or "voice" (routes to Groq)
     * @param language "en" (English) or "hi" (Hindi) — controls AI response language
     */
    suspend fun sendMessage(message: String, messageType: String = "text", language: String = "en"): Result<ChatbotMessageResult> {
        if (currentSessionId == null) {
            val sessionResult = startSession()
            if (sessionResult is Result.Error) {
                return Result.Error("Could not establish chat session")
            }
        }

        val sessionId = currentSessionId ?: return Result.Error("No active session")

        return try {
            val request = ChatMessageRequest(
                sessionId = sessionId,
                message = message,
                messageType = messageType,
                language = language
            )
            val response = apiService.sendChatMessage(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: return Result.Error("Data was null")
                recordMessageInLocalSession(sessionId, message, data.response.summary)
                Result.Success(data)
            } else {
                recordMessageInLocalSession(sessionId, message, null)
                Result.Error(response.body()?.message ?: "Failed to send message")
            }
        } catch (e: Exception) {
            recordMessageInLocalSession(sessionId, message, null)
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Send an image for AI analysis.
     * Uses multipart upload to POST /api/chatbot/analyze-image
     *
     * @param imageUri URI of the image from gallery or camera
     * @param description Optional text description from the user
     */
    suspend fun sendImage(imageUri: Uri, description: String = ""): Result<ChatbotMessageResult> {
        if (currentSessionId == null) {
            val sessionResult = startSession()
            if (sessionResult is Result.Error) {
                return Result.Error("Could not establish chat session")
            }
        }

        return try {
            val sessionId = currentSessionId
                ?: return Result.Error("No active session")

            // Read image bytes from URI
            val inputStream = context.contentResolver.openInputStream(imageUri)
                ?: return Result.Error("Could not read image")
            val originalBytes = inputStream.readBytes()
            inputStream.close()

            // Compress image before upload to save bandwidth
            val compressed = ImageCompressor.compress(originalBytes)
            val imageBytes = compressed?.bytes ?: originalBytes
            val mimeType = compressed?.mimeType ?: (context.contentResolver.getType(imageUri) ?: "image/jpeg")

            // Build multipart request
            val imagePart = MultipartBody.Part.createFormData(
                "image",
                "image.${if (mimeType.contains("png")) "png" else "jpg"}",
                imageBytes.toRequestBody(mimeType.toMediaTypeOrNull())
            )
            val sessionIdBody = if (!currentSessionId.isNullOrBlank()) {
                currentSessionId!!.toRequestBody("text/plain".toMediaTypeOrNull())
            } else null
            
            val descriptionBody = if (description.isNotBlank()) {
                description.toRequestBody("text/plain".toMediaTypeOrNull())
            } else null

            val response = apiService.analyzeImage(imagePart, sessionIdBody, descriptionBody)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: return Result.Error("Data was null")
                val promptText = if (description.isNotBlank()) "Photo: $description" else "Photo shared"
                recordMessageInLocalSession(sessionId, promptText, data.response.summary)
                Result.Success(data)
            } else {
                val promptText = if (description.isNotBlank()) "Photo: $description" else "Photo shared"
                recordMessageInLocalSession(sessionId, promptText, null)
                Result.Error(response.body()?.message ?: "Failed to analyze image")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Analyze symptoms using AI chatbot.
     * POST /api/chatbot/analyze-symptoms
     */
    suspend fun analyzeSymptoms(
        symptoms: List<String>,
        duration: String? = null,
        severity: String? = null
    ): Result<SymptomAnalysis> {
        if (currentSessionId == null) {
            val sessionResult = startSession()
            if (sessionResult is Result.Error) {
                return Result.Error("Could not establish chat session")
            }
        }

        return try {
            val sessionId = currentSessionId
                ?: return Result.Error("No active session")
            val request = SymptomAnalysisRequest(
                sessionId = sessionId,
                symptoms = symptoms,
                duration = duration,
                severity = severity
            )
            val response = apiService.analyzeSymptoms(request)

            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: return Result.Error("Data was null"))
            } else {
                Result.Error(response.body()?.message ?: "Failed to analyze symptoms")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get health tips by category.
     * GET /api/chatbot/health-tips?category=...
     */
    suspend fun getHealthTips(category: String? = null): Result<List<HealthTip>> {
        return try {
            val response = apiService.getHealthTips(category)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error(response.body()?.message ?: "Failed to load health tips")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get AI provider status for monitoring.
     */
    suspend fun getProviderStatus(): Result<List<AiProviderStatus>> {
        return try {
            val response = apiService.getAiProviderStatus()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error("Failed to get provider status")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get the current session ID (for external use).
     */
    fun getCurrentSessionId(): String? = currentSessionId

    fun setCurrentSession(sessionId: String?) {
        persistCurrentSession(sessionId)
    }

    /**
     * Clear the current session — must be called on logout so the next login
     * starts a fresh chat session instead of reusing the old one.
     */
    fun clearSession() {
        persistCurrentSession(null)
    }

    /**
     * Get chat history for a specific session.
     * GET /api/chatbot/session/:sessionId
     */
    suspend fun getChatHistory(sessionId: String): Result<List<ChatMessage>> {
        val localMessages = getLocalSessionMessages(sessionId)
        return try {
            val response = apiService.getChatHistory(sessionId)
            if (response.isSuccessful && response.body()?.success == true) {
                val serverMessages = response.body()?.data ?: emptyList()
                if (serverMessages.isNotEmpty()) {
                    saveLocalSessionMessages(sessionId, serverMessages)
                    Result.Success(serverMessages)
                } else if (localMessages.isNotEmpty()) {
                    Result.Success(localMessages)
                } else {
                    Result.Success(emptyList())
                }
            } else if (localMessages.isNotEmpty()) {
                Result.Success(localMessages)
            } else {
                Result.Error(response.body()?.message ?: "Failed to load chat history")
            }
        } catch (e: Exception) {
            if (localMessages.isNotEmpty()) {
                Result.Success(localMessages)
            } else {
                Result.Error(e.message ?: "Network error")
            }
        }
    }

    /**
     * Get all past chat sessions for the current patient.
     * GET /api/chatbot/sessions
     */
    suspend fun getChatSessions(): Result<List<ChatSession>> {
        val localSessions = getLocalSessions()
        return try {
            val response = apiService.getChatSessions()
            if (response.isSuccessful && response.body()?.success == true) {
                val serverSessions = response.body()?.data ?: emptyList()
                val merged = (serverSessions + localSessions)
                    .distinctBy { it.sessionId }
                    .sortedByDescending { it.updatedAt ?: "" }
                saveLocalSessions(merged)
                Result.Success(merged)
            } else if (localSessions.isNotEmpty()) {
                Result.Success(localSessions)
            } else {
                Result.Success(emptyList())
            }
        } catch (e: Exception) {
            if (localSessions.isNotEmpty()) {
                Result.Success(localSessions)
            } else {
                Result.Success(emptyList())
            }
        }
    }

    /**
     * End a chat session explicitly.
     * POST /api/chatbot/session/:sessionId/end
     */
    suspend fun endChatSession(sessionId: String): Result<Unit> {
        return try {
            val response = apiService.endChatSession(sessionId)
            if (response.isSuccessful && response.body()?.success == true) {
                if (sessionId == currentSessionId) persistCurrentSession(null)
                Result.Success(Unit)
            } else {
                Result.Error(response.body()?.message ?: "Failed to end session")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }
}
