package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.CreateAssessmentBioRequest
import com.example.swastik.data.remote.dto.CreateAssessmentGoalsRequest
import com.example.swastik.data.remote.dto.CreateHealthScreeningRequest
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.PatientWorkoutPlanDto
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.data.remote.dto.WellnessAssessmentDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.data.remote.dto.WellnessHubDto
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.WellnessRepository
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WellnessUiState(
    val isLoading: Boolean = false,
    val hasLoaded: Boolean = false,
    val error: String? = null,
    // Hub aggregate (single GET /wellness/hub call)
    val patientName: String? = null,
    val workoutPlanCount: Int = 0,
    val exerciseCount: Int = 0,
    val coachCount: Int = 0,
    val fitnessCenterCount: Int = 0,
    val communityCount: Int = 0,
    val supplementCount: Int = 0,
    val workoutsCompletedToday: Int = 0,
    val stepsToday: Int = 0,
    val activeCaloriesToday: Int = 0,
    val streakDays: Int = 0,
    val activePlan: PatientWorkoutPlanDto? = null,
    val reels: List<WellnessReelDto> = emptyList(),
    // Sub-screen list payloads
    val workoutPlans: List<WellnessWorkoutPlanDto> = emptyList(),
    val exercises: List<ExerciseLibraryDto> = emptyList(),
    val coaches: List<WellnessCoachDto> = emptyList(),
    val groups: List<WellnessGroupDto> = emptyList(),
    val challenges: List<WellnessChallengeDto> = emptyList(),
    val supplements: List<TrustedSupplementDto> = emptyList(),
    val assessment: WellnessAssessmentDto? = null,
    val badges: List<JsonObject> = emptyList(),
    val aiInsights: List<JsonObject> = emptyList(),
    val reports: JsonObject? = null,
    val workoutProgress: JsonObject? = null,
    // Assessment submission state
    val isSubmitting: Boolean = false,
    val submitSuccess: Boolean = false,
    val submitError: String? = null
)

@HiltViewModel
class WellnessViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(WellnessUiState())
    val uiState: StateFlow<WellnessUiState> = _uiState.asStateFlow()

    // ==================== Smart Health Hub (single aggregate call) ====================

    fun refreshHub() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getHubSummary()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true).applyHub(result.data)
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                }
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    private fun WellnessUiState.applyHub(hub: WellnessHubDto?): WellnessUiState = copy(
        patientName = hub?.patient?.name,
        workoutPlanCount = hub?.counts?.workoutPlans ?: 0,
        exerciseCount = hub?.counts?.exercises ?: 0,
        coachCount = hub?.counts?.coaches ?: 0,
        fitnessCenterCount = hub?.counts?.fitnessCenters ?: 0,
        communityCount = (hub?.counts?.groups ?: 0) + (hub?.counts?.challenges ?: 0),
        supplementCount = hub?.counts?.supplements ?: 0,
        workoutsCompletedToday = hub?.workoutsCompletedToday ?: 0,
        stepsToday = hub?.todayStats?.steps ?: 0,
        activeCaloriesToday = hub?.todayStats?.activeCalories ?: 0,
        streakDays = hub?.activeWorkoutPlan?.streakDays ?: 0,
        activePlan = hub?.activeWorkoutPlan,
        reels = hub?.reels ?: emptyList()
    )

    // ==================== Sub-screen targeted refreshers ====================

    fun refreshWorkouts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val plansDeferred = async { wellnessRepository.getWorkoutPlans() }
            val exercisesDeferred = async { wellnessRepository.getExercises() }
            val plans = plansDeferred.await()
            val exercises = exercisesDeferred.await()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                hasLoaded = true,
                error = listOf(plans, exercises).filterIsInstance<Result.Error>().firstOrNull()?.message,
                workoutPlans = plans.getOrNull().orEmpty(),
                exercises = exercises.getOrNull().orEmpty()
            )
        }
    }

    fun refreshExperts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getCoaches()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, coaches = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun refreshCommunity() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val groupsDeferred = async { wellnessRepository.getGroups() }
            val challengesDeferred = async { wellnessRepository.getChallenges() }
            val badgesDeferred = async { wellnessRepository.getBadges() }
            val groups = groupsDeferred.await()
            val challenges = challengesDeferred.await()
            val badges = badgesDeferred.await()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                hasLoaded = true,
                error = listOf(groups, challenges, badges).filterIsInstance<Result.Error>().firstOrNull()?.message,
                groups = groups.getOrNull().orEmpty(),
                challenges = challenges.getOrNull().orEmpty(),
                badges = badges.getOrNull().orEmpty()
            )
        }
    }

    fun refreshSupplements() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getSupplements()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, supplements = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun refreshReports() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val hubDeferred = async { wellnessRepository.getHubSummary() }
            val reportsDeferred = async { wellnessRepository.getReports() }
            val progressDeferred = async { wellnessRepository.getWorkoutProgress() }
            val hubResult = hubDeferred.await()
            val reportsResult = reportsDeferred.await()
            val progressResult = progressDeferred.await()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                hasLoaded = true,
                error = listOf(reportsResult, progressResult).filterIsInstance<Result.Error>().firstOrNull()?.message,
                reports = reportsResult.getOrNull(),
                workoutProgress = progressResult.getOrNull()
            ).applyHub(hubResult.getOrNull())
        }
    }

    fun refreshAiCoach() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getAiInsights()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, aiInsights = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun refreshAssessment() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getAssessment()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, assessment = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun refreshBadges() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getBadges()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, badges = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun refreshTypedReports() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getReports()) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, reports = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true, error = result.message)
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    // ==================== Coach Filtering ====================

    fun getCoachesByType(type: String): List<WellnessCoachDto> {
        return _uiState.value.coaches.filter { coach ->
            coach.coachTypes?.any { it.equals(type, ignoreCase = true) } == true
        }
    }

    fun getPersonalTrainers(): List<WellnessCoachDto> = getCoachesByType("personal_trainer")
    fun getYogaInstructors(): List<WellnessCoachDto> = getCoachesByType("yoga_instructor")
    fun getNutritionists(): List<WellnessCoachDto> = getCoachesByType("nutritionist")

    fun getOtherCoaches(): List<WellnessCoachDto> {
        val knownTypes = setOf("personal_trainer", "yoga_instructor", "nutritionist")
        return _uiState.value.coaches.filter { coach ->
            coach.coachTypes?.none { it.lowercase() in knownTypes } != false
        }
    }

    fun getCoachCategories(): List<String> {
        return _uiState.value.coaches
            .flatMap { it.coachTypes.orEmpty() }
            .distinct()
            .map { type ->
                type.replace("_", " ").split(" ")
                    .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
            }
    }

    // ==================== Supplement Filtering ====================

    fun getSupplementCategories(): List<String> {
        return _uiState.value.supplements
            .mapNotNull { it.category }
            .distinct()
    }

    fun getSupplementsByCategory(category: String): List<TrustedSupplementDto> {
        return _uiState.value.supplements.filter { it.category == category }
    }

    // ==================== Assessment Submission ====================

    fun submitGoals(request: CreateAssessmentGoalsRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, submitError = null, submitSuccess = false)
            when (val result = wellnessRepository.submitGoals(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitSuccess = true,
                        assessment = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitError = result.message
                    )
                }
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun submitBio(request: CreateAssessmentBioRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, submitError = null, submitSuccess = false)
            when (val result = wellnessRepository.submitBio(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitSuccess = true,
                        assessment = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitError = result.message
                    )
                }
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun submitHealthScreening(request: CreateHealthScreeningRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, submitError = null, submitSuccess = false)
            when (val result = wellnessRepository.submitHealthScreening(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitSuccess = true,
                        assessment = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitError = result.message
                    )
                }
                is Result.Loading -> { /* already handled */ }
            }
        }
    }

    fun clearSubmitState() {
        _uiState.value = _uiState.value.copy(submitSuccess = false, submitError = null)
    }
}
