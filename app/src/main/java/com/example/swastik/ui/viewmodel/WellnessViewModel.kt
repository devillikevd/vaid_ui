package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.FitnessCenterDto
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.WellnessRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WellnessUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val workoutPlans: List<WellnessWorkoutPlanDto> = emptyList(),
    val exercises: List<ExerciseLibraryDto> = emptyList(),
    val coaches: List<WellnessCoachDto> = emptyList(),
    val fitnessCenters: List<FitnessCenterDto> = emptyList(),
    val groups: List<WellnessGroupDto> = emptyList(),
    val challenges: List<WellnessChallengeDto> = emptyList(),
    val supplements: List<TrustedSupplementDto> = emptyList()
)

@HiltViewModel
class WellnessViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(WellnessUiState(isLoading = true))
    val uiState: StateFlow<WellnessUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val plansDeferred = async { wellnessRepository.getWorkoutPlans() }
            val exercisesDeferred = async { wellnessRepository.getExercises() }
            val coachesDeferred = async { wellnessRepository.getCoaches() }
            val centersDeferred = async { wellnessRepository.getFitnessCenters() }
            val groupsDeferred = async { wellnessRepository.getGroups() }
            val challengesDeferred = async { wellnessRepository.getChallenges() }
            val supplementsDeferred = async { wellnessRepository.getSupplements() }

            val plans = plansDeferred.await()
            val exercises = exercisesDeferred.await()
            val coaches = coachesDeferred.await()
            val centers = centersDeferred.await()
            val groups = groupsDeferred.await()
            val challenges = challengesDeferred.await()
            val supplements = supplementsDeferred.await()

            val firstError = listOf(plans, exercises, coaches, centers, groups, challenges, supplements)
                .filterIsInstance<Result.Error>()
                .firstOrNull()

            _uiState.value = WellnessUiState(
                isLoading = false,
                error = firstError?.message,
                workoutPlans = plans.getOrNull().orEmpty(),
                exercises = exercises.getOrNull().orEmpty(),
                coaches = coaches.getOrNull().orEmpty(),
                fitnessCenters = centers.getOrNull().orEmpty(),
                groups = groups.getOrNull().orEmpty(),
                challenges = challenges.getOrNull().orEmpty(),
                supplements = supplements.getOrNull().orEmpty()
            )
        }
    }
}
