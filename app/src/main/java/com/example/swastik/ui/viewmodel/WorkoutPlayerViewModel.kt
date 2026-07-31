package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.LogWorkoutRequest
import com.example.swastik.data.remote.dto.WorkoutExerciseLogDto
import com.example.swastik.data.remote.dto.WorkoutSessionDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.WellnessRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkoutPlayerUiState(
    val isLoading: Boolean = false,
    val session: WorkoutSessionDto? = null,
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

    // Simulated dummy session since there's no explicit endpoint for fetching a single WorkoutSessionDto by id yet.
    fun loadDummySession(planId: String?) {
        viewModelScope.launch {
            _uiState.value = WorkoutPlayerUiState(isLoading = true)
            // Simulating network delay
            kotlinx.coroutines.delay(1000)
            
            val dummySession = WorkoutSessionDto(
                id = "sess_123",
                planId = planId,
                title = "Full Body HIIT",
                category = "HIIT",
                durationMinutes = 30,
                intensity = "High",
                instructions = "Push yourself, but maintain good form."
            )
            _uiState.value = WorkoutPlayerUiState(isLoading = false, session = dummySession)
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
}
