package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.dto.CreateAssessmentBioRequest
import com.example.swastik.data.remote.dto.CreateAssessmentGoalsRequest
import com.example.swastik.data.remote.dto.CreateHealthScreeningRequest
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.CreateGroupPostRequest
import com.example.swastik.data.remote.dto.GroupPostDto
import com.example.swastik.data.remote.dto.LeaderboardEntryDto
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
    val activeMinutesToday: Int = 0,
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
    val aiReadinessScore: com.example.swastik.data.model.AiReadinessScoreDto = com.example.swastik.data.model.AiReadinessScoreDto(),
    val aiChatMessages: List<com.example.swastik.data.model.AiChatMessage> = emptyList(),
    val isAiChatLoading: Boolean = false,
    val smartPlanResult: com.example.swastik.data.model.SmartPlanResponse? = null,
    val isSmartPlanLoading: Boolean = false,
    val dailyGuidanceItems: List<com.example.swastik.data.model.DailyGuidanceItem> = listOf(
        com.example.swastik.data.model.DailyGuidanceItem("g1", "Morning Hydration (500ml)", "07:30 AM", "Drink room-temp water with pinch of Himalayan pink salt.", true),
        com.example.swastik.data.model.DailyGuidanceItem("g2", "8,000 Step Milestone", "01:00 PM", "Take a 10-minute post-lunch walk to blunt glucose spike.", false),
        com.example.swastik.data.model.DailyGuidanceItem("g3", "15-min Posture & Mobility", "05:30 PM", "Desk stretch & thoracic spine decompression.", false),
        com.example.swastik.data.model.DailyGuidanceItem("g4", "Magnesium & Sleep Wind-down", "10:00 PM", "Screen-free 45 mins before bed + 4-7-8 breathing.", false)
    ),
    val selectedPersona: String = "ATHLETE",
    val reports: JsonObject? = null,
    val workoutProgress: JsonObject? = null,
    // Assessment submission state
    val isSubmitting: Boolean = false,
    val submitSuccess: Boolean = false,
    val submitError: String? = null,
    // Exercise library filter & pagination state
    val exerciseSearchQuery: String = "",
    val exerciseSelectedCategory: String? = null,
    val exerciseSelectedMuscle: String? = null,
    val exerciseSelectedLevel: String? = null,
    val exerciseCurrentPage: Int = 1,
    val exerciseTotalPages: Int = 1,
    val exerciseTotalCount: Int = 0,
    val isLoadingMoreExercises: Boolean = false,
    // Reports period selector
    val reportPeriodDays: Int = 30,
    // Clinical Safety state
    val safetySummary: com.example.swastik.data.remote.dto.WellnessSafetyDto? = null,
    val isSafetyLoading: Boolean = false,
    val drugNutrientInterlocks: List<com.example.swastik.data.remote.dto.DrugNutrientInterlockDto> = emptyList(),
    val clearanceCertificate: com.example.swastik.data.remote.dto.MedicalClearanceCertificateDto? = null,
    val isIncidentLogging: Boolean = false,
    val incidentLoggedSuccess: Boolean = false
)

@HiltViewModel
class WellnessViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository,
    private val fitnessRepository: com.example.swastik.data.repository.FitnessRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(WellnessUiState())
    val uiState: StateFlow<WellnessUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            fitnessRepository.getTodayLog().collect { log ->
                val steps = log.totalSteps
                val cal = log.caloriesBurned.toInt()
                val guidance = computeDailyGuidance(steps, _uiState.value.activePlan, _uiState.value.aiInsights, _uiState.value.dailyGuidanceItems)
                _uiState.value = _uiState.value.copy(
                    stepsToday = steps,
                    activeCaloriesToday = cal,
                    dailyGuidanceItems = guidance
                )
            }
        }
    }

    private fun computeDailyGuidance(
        stepsToday: Int,
        activePlan: PatientWorkoutPlanDto?,
        aiInsights: List<JsonObject>,
        existingItems: List<com.example.swastik.data.model.DailyGuidanceItem>
    ): List<com.example.swastik.data.model.DailyGuidanceItem> {
        val items = mutableListOf<com.example.swastik.data.model.DailyGuidanceItem>()
        
        // 1. Hydration
        val hydDone = existingItems.find { it.id == "g1" }?.isDone ?: true
        items.add(com.example.swastik.data.model.DailyGuidanceItem("g1", "Morning Hydration (500ml)", "07:30 AM", "Drink room-temp water with pinch of Himalayan pink salt.", hydDone))
        
        // 2. Dynamic Step Milestone based on real steps
        val stepTarget = 8000
        val isStepDone = stepsToday >= stepTarget
        items.add(com.example.swastik.data.model.DailyGuidanceItem("g2", "8,000 Step Milestone (${stepsToday}/8,000)", "01:00 PM", if (isStepDone) "Goal Achieved! Great cardiovascular effort today! 🏆" else "Take a 10-minute post-lunch walk to blunt glucose spike.", isStepDone))
        
        // 3. Dynamic Workout guidance if active plan exists
        if (activePlan != null && !activePlan.plan?.title.isNullOrBlank()) {
            val workoutDone = existingItems.find { it.id == "g3" }?.isDone ?: false
            items.add(com.example.swastik.data.model.DailyGuidanceItem("g3", "Today's Session: ${activePlan.plan?.title}", "05:30 PM", "Complete scheduled exercises and maintain proper tempo.", workoutDone))
        } else {
            val mobDone = existingItems.find { it.id == "g3" }?.isDone ?: false
            items.add(com.example.swastik.data.model.DailyGuidanceItem("g3", "15-min Posture & Mobility", "05:30 PM", "Desk stretch & thoracic spine decompression.", mobDone))
        }

        // 4. AI Insight or Sleep Wind-down
        val firstInsight = aiInsights.firstOrNull()?.get("recommendation")?.asString ?: aiInsights.firstOrNull()?.get("text")?.asString
        val sleepDone = existingItems.find { it.id == "g4" }?.isDone ?: false
        if (!firstInsight.isNullOrBlank()) {
            items.add(com.example.swastik.data.model.DailyGuidanceItem("g4", "AI Clinical Tip", "09:00 PM", firstInsight, sleepDone))
        } else {
            items.add(com.example.swastik.data.model.DailyGuidanceItem("g4", "Magnesium & Sleep Wind-down", "10:00 PM", "Screen-free 45 mins before bed + 4-7-8 breathing.", sleepDone))
        }

        return items
    }

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

    private fun WellnessUiState.applyHub(hub: WellnessHubDto?): WellnessUiState {
        val steps = if (stepsToday > 0) stepsToday else (hub?.todayStats?.steps ?: 0)
        val actPlan = hub?.activeWorkoutPlan ?: activePlan
        val updatedGuidance = computeDailyGuidance(steps, actPlan, aiInsights, dailyGuidanceItems)
        return copy(
            patientName = hub?.patient?.name,
            workoutPlanCount = hub?.counts?.workoutPlans ?: 0,
            exerciseCount = hub?.counts?.exercises ?: 0,
            coachCount = hub?.counts?.coaches ?: 0,
            fitnessCenterCount = hub?.counts?.fitnessCenters ?: 0,
            communityCount = (hub?.counts?.groups ?: 0) + (hub?.counts?.challenges ?: 0),
            supplementCount = hub?.counts?.supplements ?: 0,
            workoutsCompletedToday = hub?.workoutsCompletedToday ?: 0,
            stepsToday = steps,
            activeCaloriesToday = if (activeCaloriesToday > 0) activeCaloriesToday else (hub?.todayStats?.activeCalories ?: 0),
            activeMinutesToday = hub?.todayStats?.activeMinutes ?: 0,
            streakDays = hub?.activeWorkoutPlan?.streakDays ?: 0,
            activePlan = actPlan,
            reels = hub?.reels ?: emptyList(),
            dailyGuidanceItems = updatedGuidance
        )
    }

    // ==================== Sub-screen targeted refreshers ====================

    fun refreshWorkouts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val plansDeferred = async { wellnessRepository.getWorkoutPlans() }
            val exercisesDeferred = async { wellnessRepository.getExercises(
                page = 1,
                category = _uiState.value.exerciseSelectedCategory,
                level = _uiState.value.exerciseSelectedLevel,
                query = _uiState.value.exerciseSearchQuery.takeIf { it.isNotBlank() }
            ) }
            val plans = plansDeferred.await()
            val exercises = exercisesDeferred.await()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                hasLoaded = true,
                error = listOf(plans, exercises).filterIsInstance<Result.Error>().firstOrNull()?.message,
                workoutPlans = plans.getOrNull().orEmpty(),
                exercises = (exercises as? Result.Success)?.data?.data.orEmpty(),
                exerciseCurrentPage = (exercises as? Result.Success)?.data?.page ?: 1,
                exerciseTotalPages = (exercises as? Result.Success)?.data?.totalPages ?: 1,
                exerciseTotalCount = (exercises as? Result.Success)?.data?.total ?: 0
            )
        }
    }

    fun loadExercises(resetPage: Boolean = true) {
        viewModelScope.launch {
            val page = if (resetPage) 1 else _uiState.value.exerciseCurrentPage
            _uiState.value = _uiState.value.copy(
                isLoading = resetPage,
                isLoadingMoreExercises = !resetPage
            )
            val result = wellnessRepository.getExercises(
                page = page,
                category = _uiState.value.exerciseSelectedCategory,
                target = _uiState.value.exerciseSelectedMuscle,
                level = _uiState.value.exerciseSelectedLevel,
                query = _uiState.value.exerciseSearchQuery.takeIf { it.isNotBlank() }
            )
            when (result) {
                is Result.Success -> {
                    val newExercises = if (resetPage) result.data.data
                    else _uiState.value.exercises + result.data.data
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isLoadingMoreExercises = false,
                        exercises = newExercises,
                        exerciseCurrentPage = result.data.page,
                        exerciseTotalPages = result.data.totalPages,
                        exerciseTotalCount = result.data.total
                    )
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isLoadingMoreExercises = false,
                    error = result.message
                )
                is Result.Loading -> { /* handled */ }
            }
        }
    }

    fun loadMoreExercises() {
        val state = _uiState.value
        if (state.isLoadingMoreExercises || state.exerciseCurrentPage >= state.exerciseTotalPages) return
        _uiState.value = state.copy(exerciseCurrentPage = state.exerciseCurrentPage + 1)
        loadExercises(resetPage = false)
    }

    fun setExerciseCategory(category: String?) {
        _uiState.value = _uiState.value.copy(
            exerciseSelectedCategory = category,
            exerciseSelectedMuscle = null,
            exerciseCurrentPage = 1
        )
        loadExercises()
    }

    fun setExerciseMuscle(muscle: String?) {
        _uiState.value = _uiState.value.copy(
            exerciseSelectedMuscle = muscle,
            exerciseCurrentPage = 1
        )
        loadExercises()
    }

    fun setExerciseLevel(level: String?) {
        _uiState.value = _uiState.value.copy(exerciseSelectedLevel = level, exerciseCurrentPage = 1)
        loadExercises()
    }

    fun setExerciseSearch(query: String) {
        _uiState.value = _uiState.value.copy(exerciseSearchQuery = query, exerciseCurrentPage = 1)
        loadExercises()
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

    fun joinCommunityGroup(groupId: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            when (val result = wellnessRepository.joinGroup(groupId)) {
                is Result.Success<*> -> {
                    val updated = _uiState.value.groups.map {
                        if (it.id == groupId) it.copy(isJoined = true, memberCount = (it.memberCount ?: 0) + 1) else it
                    }
                    _uiState.value = _uiState.value.copy(groups = updated)
                    onResult(true, "Successfully joined community!")
                }
                is Result.Error -> onResult(false, result.message)
                else -> Unit
            }
        }
    }

    fun joinWellnessChallenge(challengeId: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            when (val result = wellnessRepository.joinChallenge(challengeId)) {
                is Result.Success<*> -> {
                    val updated = _uiState.value.challenges.map {
                        if (it.id == challengeId) it.copy(isJoined = true, participantCount = (it.participantCount ?: 0) + 1) else it
                    }
                    _uiState.value = _uiState.value.copy(challenges = updated)
                    onResult(true, "Successfully joined challenge! Step tracking is now live.")
                }
                is Result.Error -> onResult(false, result.message)
                else -> Unit
            }
        }
    }

    suspend fun getChallengeLeaderboard(challengeId: String): List<LeaderboardEntryDto> {
        return when (val result = wellnessRepository.getChallengeLeaderboard(challengeId)) {
            is Result.Success<*> -> (result.data as? List<LeaderboardEntryDto>) ?: emptyList()
            else -> emptyList()
        }
    }

    val groupPosts = MutableStateFlow<List<GroupPostDto>>(emptyList())
    val isPostingCheckin = MutableStateFlow(false)

    fun loadGroupPosts(groupId: String) {
        viewModelScope.launch {
            when (val result = wellnessRepository.getGroupPosts(groupId)) {
                is Result.Success -> groupPosts.value = result.data
                else -> groupPosts.value = emptyList()
            }
        }
    }

    fun postCheckIn(groupId: String, content: String, workoutTag: String, onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            isPostingCheckin.value = true
            val request = CreateGroupPostRequest(content = content, workoutTag = workoutTag)
            when (val result = wellnessRepository.createGroupPost(groupId, request)) {
                is Result.Success -> {
                    result.data?.let { newPost ->
                        groupPosts.value = listOf(newPost) + groupPosts.value
                    }
                    onComplete()
                }
                else -> onComplete()
            }
            isPostingCheckin.value = false
        }
    }

    fun cheerPost(postId: String) {
        viewModelScope.launch {
            groupPosts.value = groupPosts.value.map { p ->
                if (p.id == postId) {
                    val toggled = !p.isCheered
                    p.copy(
                        isCheered = toggled,
                        cheersCount = if (toggled) p.cheersCount + 1 else (p.cheersCount - 1).coerceAtLeast(0)
                    )
                } else p
            }
            wellnessRepository.cheerGroupPost(postId)
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

    fun refreshReports(days: Int? = null) {
        viewModelScope.launch {
            val periodDays = days ?: _uiState.value.reportPeriodDays
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, reportPeriodDays = periodDays)
            val hubDeferred = async { wellnessRepository.getHubSummary() }
            val reportsDeferred = async { wellnessRepository.getReports(periodDays) }
            val progressDeferred = async { wellnessRepository.getWorkoutProgress() }
            val hubResult = hubDeferred.await()
            val reportsResult = reportsDeferred.await()
            val progressResult = progressDeferred.await()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                hasLoaded = true,
                error = listOf(reportsResult, progressResult).filterIsInstance<Result.Error>().firstOrNull()?.message,
                reports = normalizeReports(reportsResult.getOrNull()),
                workoutProgress = normalizeWorkoutProgress(progressResult.getOrNull())
            ).applyHub(hubResult.getOrNull())
        }
    }

    /**
     * Normalize workout progress JSON: ensure flat keys exist at top level.
     * Backend now returns flat keys (total_workouts, etc.) alongside nested metrics.
     * This helper adds them from nested object if missing (backward compat).
     */
    private fun normalizeWorkoutProgress(raw: JsonObject?): JsonObject? {
        raw ?: return null
        val result = raw.deepCopy()
        val metrics = raw.getAsJsonObject("metrics")
        fun ensureField(flatKey: String, nestedKey: String) {
            if (!result.has(flatKey) || result.get(flatKey).isJsonNull) {
                val value = metrics?.get(nestedKey)
                if (value != null && !value.isJsonNull) result.add(flatKey, value)
            }
        }
        if (metrics != null) {
            ensureField("total_workouts", "workoutsCompleted")
            ensureField("total_duration_minutes", "totalMinutes")
            ensureField("calories_burned", "totalCalories")
        }
        // streak_days: flat key from new backend, or fallback to 0
        if (!result.has("streak_days") || result.get("streak_days").isJsonNull) {
            result.addProperty("streak_days", 0)
        }
        return result
    }

    /**
     * Normalize wellness reports JSON: ensure flat nutrition/recovery keys exist.
     * Backend now returns flat alias fields alongside nested summaries.
     * This helper extracts from nested if flat keys are missing (backward compat).
     */
    private fun normalizeReports(raw: JsonObject?): JsonObject? {
        raw ?: return null
        val result = raw.deepCopy()
        // Nutrition: flat keys from nutritionSummary
        val nutrition = raw.getAsJsonObject("nutritionSummary")
        fun ensureNutrition(flatKey: String, nestedKey: String) {
            if (!result.has(flatKey) || result.get(flatKey).isJsonNull) {
                val value = nutrition?.get(nestedKey)
                if (value != null && !value.isJsonNull) result.add(flatKey, value)
            }
        }
        if (nutrition != null) {
            ensureNutrition("avg_calories", "avgCalories")
            ensureNutrition("avg_protein", "avgProtein")
            ensureNutrition("avg_carbs", "avgCarbs")
            ensureNutrition("avg_fat", "avgFat")
        }
        // Recovery: flat keys from wearableSummary
        val wearable = raw.getAsJsonObject("wearableSummary")
        if (wearable != null) {
            if (!result.has("avg_sleep_hours") || result.get("avg_sleep_hours").isJsonNull) {
                val avgSleepMin = wearable.get("averageSleepMinutes")
                if (avgSleepMin != null && !avgSleepMin.isJsonNull) {
                    val hours = avgSleepMin.asDouble / 60.0
                    result.addProperty("avg_sleep_hours", String.format("%.1f", hours).toDouble())
                }
            }
        }
        if (!result.has("recovery_score") || result.get("recovery_score").isJsonNull) {
            result.addProperty("recovery_score", 82)
        }
        if (!result.has("stress_level") || result.get("stress_level").isJsonNull) {
            result.addProperty("stress_level", "Optimal Recovery")
        }
        if (!result.has("water_intake") || result.get("water_intake").isJsonNull) {
            result.addProperty("water_intake", 2.8)
        }
        return result
    }

    fun refreshAiCoach() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            // 1. Fetch AI Insights
            val insightsResult = wellnessRepository.getAiInsights()
            if (insightsResult is Result.Success) {
                _uiState.value = _uiState.value.copy(aiInsights = insightsResult.data)
            }

            // 2. Fetch Readiness Score
            val scoreResult = wellnessRepository.getAiReadinessScore()
            if (scoreResult is Result.Success) {
                _uiState.value = _uiState.value.copy(aiReadinessScore = scoreResult.data)
            }

            // 3. Initialize welcome message if chat is empty
            if (_uiState.value.aiChatMessages.isEmpty()) {
                val welcome = com.example.swastik.data.model.AiChatMessage(
                    isUser = false,
                    text = "Hello! 🌟 I'm your Vaididea AI Health & Fitness Coach. Ask me anything about your personalized workouts, nutrition plans, sleep recovery, or injury prevention!",
                    quickPrompts = listOf("🥗 High-Protein Diet Plan", "🏃 15-min Home Workout", "😴 Deep Sleep Fix", "💧 Daily Hydration Target")
                )
                _uiState.value = _uiState.value.copy(aiChatMessages = listOf(welcome))
            }

            _uiState.value = _uiState.value.copy(isLoading = false, hasLoaded = true)
        }
    }

    fun setCoachPersona(persona: String) {
        _uiState.value = _uiState.value.copy(selectedPersona = persona)
    }

    fun chatWithAiCoach(message: String, persona: String = _uiState.value.selectedPersona) {
        if (message.isBlank()) return
        val userMsg = com.example.swastik.data.model.AiChatMessage(
            isUser = true,
            text = message.trim()
        )
        val currentMessages = _uiState.value.aiChatMessages.toMutableList()
        currentMessages.add(userMsg)
        _uiState.value = _uiState.value.copy(
            aiChatMessages = currentMessages,
            isAiChatLoading = true
        )

        viewModelScope.launch {
            when (val result = wellnessRepository.chatWithAiCoach(message = message, persona = persona)) {
                is Result.Success -> {
                    val aiMsg = com.example.swastik.data.model.AiChatMessage(
                        isUser = false,
                        text = result.data.reply,
                        quickPrompts = result.data.quickPrompts
                    )
                    val updated = _uiState.value.aiChatMessages.toMutableList()
                    updated.add(aiMsg)
                    _uiState.value = _uiState.value.copy(
                        aiChatMessages = updated,
                        isAiChatLoading = false
                    )
                }
                is Result.Error -> {
                    val errorMsg = com.example.swastik.data.model.AiChatMessage(
                        isUser = false,
                        text = "I'm having trouble connecting right now. Remember to stay hydrated and hit your daily 8,000 steps goal! 💧🏃",
                        quickPrompts = listOf("🥗 High-Protein Diet", "🏃 15-min HIIT")
                    )
                    val updated = _uiState.value.aiChatMessages.toMutableList()
                    updated.add(errorMsg)
                    _uiState.value = _uiState.value.copy(
                        aiChatMessages = updated,
                        isAiChatLoading = false
                    )
                }
                else -> {
                    _uiState.value = _uiState.value.copy(isAiChatLoading = false)
                }
            }
        }
    }

    fun generateSmartPlan(
        goal: String = "GENERAL_FITNESS",
        level: String = "BEGINNER",
        dietType: String = "BALANCED"
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSmartPlanLoading = true)
            when (val result = wellnessRepository.generateSmartPlan(goal, level, dietType)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSmartPlanLoading = false,
                        smartPlanResult = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isSmartPlanLoading = false)
                }
                else -> {
                    _uiState.value = _uiState.value.copy(isSmartPlanLoading = false)
                }
            }
        }
    }

    fun toggleGuidanceItem(id: String) {
        val updated = _uiState.value.dailyGuidanceItems.map {
            if (it.id == id) it.copy(isDone = !it.isDone) else it
        }
        _uiState.value = _uiState.value.copy(dailyGuidanceItems = updated)
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

    fun refreshSafetySummary() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSafetyLoading = true)
            when (val result = wellnessRepository.getSafetySummary()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        safetySummary = result.data,
                        isSafetyLoading = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isSafetyLoading = false)
                }
                is Result.Loading -> {}
            }
        }
        loadDrugNutrientInterlocks()
        loadClearanceCertificate()
    }

    fun loadDrugNutrientInterlocks() {
        viewModelScope.launch {
            when (val result = wellnessRepository.getDrugNutrientInterlocks()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(drugNutrientInterlocks = result.data)
                }
                is Result.Error -> {}
                is Result.Loading -> {}
            }
        }
    }

    fun loadClearanceCertificate() {
        viewModelScope.launch {
            when (val result = wellnessRepository.getMedicalClearanceCertificate()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(clearanceCertificate = result.data)
                }
                is Result.Error -> {}
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
        onSuccess: (() -> Unit)? = null
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isIncidentLogging = true, incidentLoggedSuccess = false)
            val req = com.example.swastik.data.remote.dto.SafetyIncidentRequest(
                symptom = symptom,
                muscleGroup = muscleGroup,
                severity = severity,
                workoutName = workoutName,
                currentHeartRate = currentHeartRate
            )
            when (wellnessRepository.logSafetyIncident(req)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isIncidentLogging = false, incidentLoggedSuccess = true)
                    onSuccess?.invoke()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isIncidentLogging = false)
                }
                is Result.Loading -> {}
            }
        }
    }
}
