package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.LogWorkoutRequest
import com.example.swastik.data.remote.dto.WorkoutExerciseLogDto
import com.example.swastik.data.remote.dto.WorkoutSessionDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.WellnessRepository
import com.example.swastik.ui.screens.patient.wellness.PlayerExercise
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkoutPlayerUiState(
    val isLoading: Boolean = false,
    val session: WorkoutSessionDto? = null,
    val exercises: List<PlayerExercise> = emptyList(),
    val isLogging: Boolean = false,
    val isCompleted: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class WorkoutPlayerViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutPlayerUiState())
    val uiState: StateFlow<WorkoutPlayerUiState> = _uiState.asStateFlow()

    fun loadSession(planId: String?) {
        viewModelScope.launch {
            _uiState.value = WorkoutPlayerUiState(isLoading = true)

            if (planId.isNullOrBlank()) {
                val defaultExercises = getDefaultExercises("General Fitness")
                val fallbackSession = WorkoutSessionDto(
                    id = "default_sess",
                    title = "Full Body Vitality",
                    category = "FITNESS",
                    durationMinutes = 30,
                    intensity = "Medium",
                    instructions = "Maintain steady breathing and focus on proper range of motion."
                )
                _uiState.value = WorkoutPlayerUiState(isLoading = false, session = fallbackSession, exercises = defaultExercises)
                return@launch
            }

            when (val result = wellnessRepository.getWorkoutPlan(planId)) {
                is Result.Success -> {
                    val plan = result.data
                    val activeSession = plan.sessions?.firstOrNull() ?: WorkoutSessionDto(
                        id = plan.id,
                        planId = plan.id,
                        title = plan.title,
                        category = plan.goal ?: "FITNESS",
                        durationMinutes = plan.minutesPerSession ?: 30,
                        intensity = plan.level ?: "Medium",
                        instructions = plan.description ?: "Focus on controlled reps and steady form."
                    )

                    // Parse exercises from session or generate dynamic exercises matching plan goal
                    val parsedExercises = parseSessionExercises(activeSession, plan.title, plan.goal)
                    _uiState.value = WorkoutPlayerUiState(
                        isLoading = false,
                        session = activeSession,
                        exercises = parsedExercises
                    )
                }
                is Result.Error -> {
                    // Fallback to dynamic exercises matching plan title
                    val fallbackExercises = getDefaultExercises("Custom Workout")
                    val fallbackSession = WorkoutSessionDto(
                        id = planId,
                        title = "Personalized Workout",
                        category = "FITNESS",
                        durationMinutes = 30,
                        intensity = "Medium",
                        instructions = "Maintain steady breathing and focus on proper range of motion."
                    )
                    _uiState.value = WorkoutPlayerUiState(
                        isLoading = false,
                        session = fallbackSession,
                        exercises = fallbackExercises
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun loadDummySession(planId: String?) {
        loadSession(planId)
    }

    private fun parseSessionExercises(session: WorkoutSessionDto, planTitle: String, goal: String?): List<PlayerExercise> {
        val list = mutableListOf<PlayerExercise>()
        
        try {
            val exElement = session.exercises
            if (exElement != null && exElement.isJsonArray) {
                val arr = exElement.asJsonArray
                arr.forEachIndexed { idx, item ->
                    if (item.isJsonObject) {
                        val obj = item.asJsonObject
                        val id = obj.get("id")?.asString ?: "ex_$idx"
                        val name = obj.get("name")?.asString ?: obj.get("title")?.asString ?: "Exercise ${idx + 1}"
                        val sets = obj.get("sets")?.asInt ?: 3
                        val reps = obj.get("reps")?.asInt
                        val duration = obj.get("durationSeconds")?.asInt ?: obj.get("duration")?.asInt
                        val gifUrl = obj.get("gifUrl")?.asString ?: obj.get("animation_url")?.asString ?: "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0003-1ZFqTDN.gif"
                        val tip = obj.get("coachTip")?.asString ?: obj.get("safety_notes")?.asString ?: "Keep your core braced and breathe rhythmically."
                        
                        list.add(PlayerExercise(id, name, sets, reps, duration, gifUrl, tip))
                    }
                }
            }
        } catch (_: Exception) {}

        return if (list.isNotEmpty()) list else getDefaultExercises(goal ?: planTitle)
    }

    private fun getDefaultExercises(goal: String): List<PlayerExercise> {
        val goalLower = goal.lowercase()
        return when {
            goalLower.contains("yoga") || goalLower.contains("mobility") || goalLower.contains("stretch") -> listOf(
                PlayerExercise(
                    id = "ex_cat_cow",
                    name = "Cat-Cow Spinal Stretch",
                    sets = 2,
                    durationSeconds = 45,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0469-WkWm39J.gif",
                    coachTip = "Inhale as you arch your spine (Cow), exhale deeply as you round your back (Cat)."
                ),
                PlayerExercise(
                    id = "ex_down_dog",
                    name = "Downward-Facing Dog",
                    sets = 2,
                    durationSeconds = 45,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1458-lD9l94Z.gif",
                    coachTip = "Push ground away with open palms, lengthening spine and pressing heels down."
                ),
                PlayerExercise(
                    id = "ex_warrior",
                    name = "Warrior II Pose",
                    sets = 2,
                    durationSeconds = 30,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0003-1ZFqTDN.gif",
                    coachTip = "Sink hips down, keep front knee stacked above ankle, extend arms parallel to floor."
                ),
                PlayerExercise(
                    id = "ex_child_pose",
                    name = "Restorative Child's Pose",
                    sets = 1,
                    durationSeconds = 60,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0025-a1N4Z8J.gif",
                    coachTip = "Rest forehead on mat, surrender your shoulders and breathe into your lower back."
                )
            )
            goalLower.contains("strength") || goalLower.contains("muscle") -> listOf(
                PlayerExercise(
                    id = "ex_pushups",
                    name = "Standard Push Ups",
                    sets = 3,
                    reps = 12,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0025-a1N4Z8J.gif",
                    coachTip = "Keep core tight, spine neutral, and exhale powerfully as you push upwards."
                ),
                PlayerExercise(
                    id = "ex_squats",
                    name = "Tempo Goblet Squats",
                    sets = 3,
                    reps = 15,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1458-lD9l94Z.gif",
                    coachTip = "Descend for 3 seconds, keep chest upright, drive through your heels."
                ),
                PlayerExercise(
                    id = "ex_lunges",
                    name = "Alternating Walking Lunges",
                    sets = 3,
                    reps = 20,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0003-1ZFqTDN.gif",
                    coachTip = "Lower back knee until it hovers 1 inch above the floor. Keep torso vertical."
                ),
                PlayerExercise(
                    id = "ex_plank",
                    name = "Weighted Isometric Plank",
                    sets = 3,
                    durationSeconds = 45,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0469-WkWm39J.gif",
                    coachTip = "Squeeze glutes, push into elbows, maintain a solid straight line from head to heels."
                )
            )
            else -> listOf(
                PlayerExercise(
                    id = "ex_jj",
                    name = "Dynamic Jumping Jacks",
                    sets = 2,
                    durationSeconds = 30,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0003-1ZFqTDN.gif",
                    coachTip = "Land softly on the balls of your feet to protect your knee joints."
                ),
                PlayerExercise(
                    id = "ex_pushups",
                    name = "Chest Push Ups",
                    sets = 3,
                    reps = 15,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0025-a1N4Z8J.gif",
                    coachTip = "Keep your core engaged, spine neutral, and exhale as you push up."
                ),
                PlayerExercise(
                    id = "ex_squats",
                    name = "Bodyweight Squats",
                    sets = 3,
                    reps = 20,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1458-lD9l94Z.gif",
                    coachTip = "Keep your chest tall, push knees outward, and drive power through your heels."
                ),
                PlayerExercise(
                    id = "ex_plank",
                    name = "Core Plank Hold",
                    sets = 2,
                    durationSeconds = 45,
                    gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0469-WkWm39J.gif",
                    coachTip = "Tighten your abdomen and glutes, keeping a straight line from neck to ankles."
                )
            )
        }
    }

    fun finishWorkout(
        planId: String?,
        sessionId: String?,
        durationMinutes: Int,
        caloriesBurned: Double?,
        perceivedIntensity: String,
        exercises: List<WorkoutExerciseLogDto>
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLogging = true)
            val request = LogWorkoutRequest(
                planId = planId,
                sessionId = sessionId,
                durationMinutes = durationMinutes,
                caloriesBurned = caloriesBurned,
                perceivedIntensity = perceivedIntensity,
                exercises = exercises
            )
            when (val result = wellnessRepository.logWorkout(request)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLogging = false, isCompleted = true)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLogging = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun logSafetyIncident(
        symptom: String,
        muscleGroup: String? = null,
        severity: String = "moderate",
        workoutName: String? = null,
        currentHeartRate: Int? = null,
        onComplete: (() -> Unit)? = null
    ) {
        viewModelScope.launch {
            val req = com.example.swastik.data.remote.dto.SafetyIncidentRequest(
                symptom = symptom,
                muscleGroup = muscleGroup,
                severity = severity,
                workoutName = workoutName,
                currentHeartRate = currentHeartRate
            )
            wellnessRepository.logSafetyIncident(req)
            onComplete?.invoke()
        }
    }
}
