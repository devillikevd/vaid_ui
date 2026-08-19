package com.example.swastik.data.model

import com.google.gson.annotations.SerializedName

data class AiChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val isUser: Boolean,
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val quickPrompts: List<String> = emptyList()
)

data class AiReadinessScoreDto(
    val score: Int = 85,
    val category: String = "Optimal Recovery 🟢",
    val summary: String = "Your biometrics show great recovery! Perfect day for moderate-to-high intensity workouts."
)

data class AiChatRequest(
    val message: String,
    val history: List<Map<String, String>> = emptyList(),
    val persona: String = "ATHLETE"
)

data class AiChatResponse(
    val reply: String,
    val persona: String? = "ATHLETE",
    @SerializedName("quickPrompts") val quickPrompts: List<String> = emptyList(),
    val timestamp: String? = null
)

data class SmartPlanRequest(
    val goal: String = "GENERAL_FITNESS",
    val level: String = "BEGINNER",
    val dietType: String = "BALANCED"
)

data class SmartPlanResponse(
    val title: String,
    val goal: String,
    val level: String,
    val dietType: String,
    @SerializedName("planContent") val planContent: String
)

data class DailyGuidanceItem(
    val id: String,
    val title: String,
    val time: String,
    val desc: String,
    val isDone: Boolean = false
)
