package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.ChartPointDto
import com.example.swastik.data.remote.dto.CoachPatientDto
import com.example.swastik.data.remote.dto.CreateReminderRequest
import com.example.swastik.data.remote.dto.FitnessCenterDto
import com.example.swastik.data.remote.dto.FitnessClassDto
import com.example.swastik.data.remote.dto.LeaderboardEntryDto
import com.example.swastik.data.remote.dto.QrCheckInRequest
import com.example.swastik.data.remote.dto.UpdateCoachAvailabilityRequest
import com.example.swastik.data.remote.dto.UpdateChallengeProgressRequest
import com.example.swastik.data.remote.dto.UpdateReminderRequest
import com.example.swastik.data.remote.dto.WellnessChatMessageDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.data.remote.dto.WellnessSessionDto
import com.example.swastik.data.remote.dto.WellnessStreakDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.VitalsRepository
import com.example.swastik.data.repository.WellnessRepository
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

// ==================== Workout Calendar ====================

data class WorkoutCalendarUiState(
    val isLoading: Boolean = true,
    val calendar: JsonObject? = null,
    val streaks: WellnessStreakDto? = null,
    val progress: JsonObject? = null,
    val error: String? = null
)

@HiltViewModel
class WorkoutCalendarViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutCalendarUiState())
    val uiState: StateFlow<WorkoutCalendarUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = WorkoutCalendarUiState(isLoading = true)
            val calendarResult = wellnessRepository.getWorkoutCalendar()
            val streaksResult = wellnessRepository.getWellnessStreaks()
            val progressResult = wellnessRepository.getWorkoutProgress()
            _uiState.value = WorkoutCalendarUiState(
                isLoading = false,
                calendar = (calendarResult as? Result.Success)?.data,
                streaks = (streaksResult as? Result.Success)?.data,
                progress = (progressResult as? Result.Success)?.data,
                error = listOf(calendarResult, streaksResult, progressResult)
                    .filterIsInstance<Result.Error>()
                    .firstOrNull()?.message
            )
        }
    }

    fun refresh() = load()
}

// ==================== Gym Class Schedule ====================

data class GymClassScheduleUiState(
    val isLoading: Boolean = true,
    val centerId: String? = null,
    val centerName: String? = null,
    val classes: List<FitnessClassDto> = emptyList(),
    val isBooking: Boolean = false,
    val bookingMessage: String? = null,
    val error: String? = null
)

@HiltViewModel
class GymClassScheduleViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GymClassScheduleUiState())
    val uiState: StateFlow<GymClassScheduleUiState> = _uiState.asStateFlow()

    fun load(centerId: String, centerName: String?) {
        _uiState.value = _uiState.value.copy(centerId = centerId, centerName = centerName)
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getGymClassSchedule(centerId)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, classes = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun bookClass(classId: String) {
        val centerId = _uiState.value.centerId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBooking = true, bookingMessage = null, error = null)
            when (val result = wellnessRepository.bookGymClass(centerId, classId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isBooking = false, bookingMessage = "Class booked successfully!")
                    load(centerId, _uiState.value.centerName)
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isBooking = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearBookingMessage() {
        _uiState.value = _uiState.value.copy(bookingMessage = null)
    }
}

// ==================== Challenge Leaderboard ====================

data class ChallengeLeaderboardUiState(
    val isLoading: Boolean = true,
    val challengeId: String? = null,
    val challengeTitle: String? = null,
    val entries: List<LeaderboardEntryDto> = emptyList(),
    val totalEntries: Int = 0,
    val isJoining: Boolean = false,
    val joined: Boolean = false,
    val isUpdating: Boolean = false,
    val progressMessage: String? = null,
    val error: String? = null
)

@HiltViewModel
class ChallengeLeaderboardViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChallengeLeaderboardUiState())
    val uiState: StateFlow<ChallengeLeaderboardUiState> = _uiState.asStateFlow()

    fun load(challengeId: String, challengeTitle: String? = null) {
        viewModelScope.launch {
            _uiState.value = ChallengeLeaderboardUiState(isLoading = true, challengeId = challengeId, challengeTitle = challengeTitle)
            when (val result = wellnessRepository.getChallengeLeaderboard(challengeId)) {
                is Result.Success -> {
                    val entries = result.data
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        entries = entries,
                        totalEntries = entries.size,
                        joined = entries.any { it.isSelf }
                    )
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun joinChallenge() {
        val challengeId = _uiState.value.challengeId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isJoining = true, progressMessage = null, error = null)
            when (val result = wellnessRepository.joinChallenge(challengeId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isJoining = false, joined = true, progressMessage = "Joined the challenge!")
                    load(challengeId)
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isJoining = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun updateProgress(value: Double, unit: String?) {
        val challengeId = _uiState.value.challengeId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true, progressMessage = null, error = null)
            val result = wellnessRepository.updateChallengeProgress(
                challengeId,
                UpdateChallengeProgressRequest(progressValue = value, sourceMetric = unit)
            )
            _uiState.value = _uiState.value.copy(
                isUpdating = false,
                progressMessage = if (result is Result.Success) "Progress updated!" else null,
                error = (result as? Result.Error)?.message
            )
            if (result is Result.Success) load(challengeId)
        }
    }

    fun clearProgressMessage() {
        _uiState.value = _uiState.value.copy(progressMessage = null)
    }
}

// ==================== Reminders ====================

data class RemindersUiState(
    val isLoading: Boolean = true,
    val reminders: List<com.example.swastik.data.remote.dto.ReminderDto> = emptyList(),
    val isSubmitting: Boolean = false,
    val successMessage: String? = null,
    val error: String? = null
)

@HiltViewModel
class RemindersViewModel @Inject constructor(
    private val vitalsRepository: VitalsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RemindersUiState())
    val uiState: StateFlow<RemindersUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load(type: String? = null, isActive: Boolean? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = vitalsRepository.getReminders(type, isActive)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, reminders = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun create(request: CreateReminderRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, successMessage = null, error = null)
            when (val result = vitalsRepository.createReminder(request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isSubmitting = false, successMessage = "Reminder created")
                    load()
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isSubmitting = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun update(id: String, request: UpdateReminderRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, successMessage = null, error = null)
            when (val result = vitalsRepository.updateReminder(id, request)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isSubmitting = false, successMessage = "Reminder updated")
                    load()
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isSubmitting = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, successMessage = null, error = null)
            when (val result = vitalsRepository.deleteReminder(id)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(isSubmitting = false, successMessage = "Reminder deleted")
                    load()
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isSubmitting = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun act(id: String, action: String, scheduledAt: String, snoozeMinutes: Int? = null) {
        viewModelScope.launch {
            when (val result = vitalsRepository.actOnReminder(id, action, scheduledAt, snoozeMinutes)) {
                is Result.Success -> load()
                is Result.Error -> _uiState.value = _uiState.value.copy(error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(successMessage = null, error = null)
    }
}

// ==================== Wellness Reels ====================

data class WellnessReelsUiState(
    val isLoading: Boolean = true,
    val reels: List<WellnessReelDto> = emptyList(),
    val likedIds: Set<String> = emptySet(),
    val error: String? = null
)

@HiltViewModel
class WellnessReelsViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WellnessReelsUiState())
    val uiState: StateFlow<WellnessReelsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load(category: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getWellnessReels(category)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, reels = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun like(reelId: String) {
        viewModelScope.launch {
            when (val result = wellnessRepository.likeWellnessReel(reelId)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(
                    likedIds = _uiState.value.likedIds + reelId,
                    reels = _uiState.value.reels.map {
                        if (it.id == reelId) it.copy(likesCount = (it.likesCount ?: 0) + 1) else it
                    }
                )
                is Result.Error -> _uiState.value = _uiState.value.copy(error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun recordView(reelId: String) {
        viewModelScope.launch {
            wellnessRepository.viewWellnessReel(reelId)
        }
    }
}

// ==================== Wellness Session Chat ====================

data class WellnessChatUiState(
    val isLoading: Boolean = true,
    val sessions: List<WellnessSessionDto> = emptyList(),
    val selectedSessionId: String? = null,
    val messages: List<WellnessChatMessageDto> = emptyList(),
    val isTyping: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class WellnessChatViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository,
    private val socketManager: SocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(WellnessChatUiState())
    val uiState: StateFlow<WellnessChatUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            socketManager.wellnessChatMessages.collect { message ->
                val messages = _uiState.value.messages
                _uiState.value = _uiState.value.copy(
                    messages = if (message.message.isNullOrEmpty() && message.timestamp.isNullOrEmpty()) {
                        messages + WellnessChatMessageDto(
                            userId = message.senderId,
                            role = message.role,
                            message = message.message,
                            timestamp = message.timestamp
                        )
                    } else {
                        messages
                            .filterNot { it.timestamp.isNullOrEmpty() && it.message == message.message }
                            .plus(
                                WellnessChatMessageDto(
                                    userId = message.senderId,
                                    role = message.role,
                                    message = message.message,
                                    timestamp = message.timestamp
                                )
                            )
                    },
                    isTyping = false
                )
            }
        }
        viewModelScope.launch {
            socketManager.wellnessChatTyping.collect { typing ->
                _uiState.value = _uiState.value.copy(isTyping = typing.isTyping)
            }
        }
        loadSessions()
    }

    fun loadSessions(status: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getWellnessSessions(status)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isLoading = false, sessions = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun selectSession(sessionId: String) {
        val previous = _uiState.value.selectedSessionId
        if (previous == sessionId) return
        previous?.let { socketManager.leaveWellnessChat(it) }
        socketManager.joinWellnessChat(sessionId)
        _uiState.value = _uiState.value.copy(selectedSessionId = sessionId, messages = emptyList(), isTyping = false)
        viewModelScope.launch {
            when (val result = wellnessRepository.getWellnessSessionMessages(sessionId)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(messages = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearSession() {
        _uiState.value.selectedSessionId?.let { socketManager.leaveWellnessChat(it) }
        _uiState.value = _uiState.value.copy(selectedSessionId = null, messages = emptyList(), isTyping = false)
    }

    fun sendMessage(text: String) {
        val sessionId = _uiState.value.selectedSessionId ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        socketManager.sendWellnessChatMessage(sessionId, trimmed)
        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + WellnessChatMessageDto(
                userId = "",
                role = "patient",
                message = trimmed,
                timestamp = ""
            )
        )
    }

    fun setTyping(isTyping: Boolean) {
        _uiState.value.selectedSessionId?.let { socketManager.sendWellnessChatTyping(it, isTyping) }
    }

    override fun onCleared() {
        _uiState.value.selectedSessionId?.let { socketManager.leaveWellnessChat(it) }
        super.onCleared()
    }
}

// ==================== QR Gym Check-in ====================

data class QrCheckInUiState(
    val isLoading: Boolean = true,
    val centers: List<FitnessCenterDto> = emptyList(),
    val selectedCenterId: String? = null,
    val isCheckingIn: Boolean = false,
    val checkInResult: JsonObject? = null,
    val error: String? = null
)

@HiltViewModel
class QrCheckInViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(QrCheckInUiState())
    val uiState: StateFlow<QrCheckInUiState> = _uiState.asStateFlow()

    init {
        loadCenters()
    }

    fun loadCenters() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = wellnessRepository.getFitnessCenters()) {
                is Result.Success -> {
                    val centers = result.data
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        centers = centers,
                        selectedCenterId = _uiState.value.selectedCenterId ?: centers.firstOrNull()?.id
                    )
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun selectCenter(centerId: String) {
        _uiState.value = _uiState.value.copy(selectedCenterId = centerId, checkInResult = null)
    }

    fun checkIn(qrToken: String? = null) {
        val centerId = _uiState.value.selectedCenterId ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCheckingIn = true, checkInResult = null, error = null)
            val request = QrCheckInRequest(centerId = centerId, qrToken = qrToken)
            when (val result = wellnessRepository.qrGymCheckIn(request)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(isCheckingIn = false, checkInResult = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(isCheckingIn = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearResult() {
        _uiState.value = _uiState.value.copy(checkInResult = null, error = null)
    }
}

// ==================== Coach Dashboard ====================

data class CoachDashboardUiState(
    val isLoading: Boolean = true,
    val profile: WellnessCoachDto? = null,
    val patients: List<CoachPatientDto> = emptyList(),
    val sessions: List<WellnessSessionDto> = emptyList(),
    val selectedPatientId: String? = null,
    val analytics: JsonObject? = null,
    val isUpdatingAvailability: Boolean = false,
    val successMessage: String? = null,
    val error: String? = null
)

@HiltViewModel
class CoachDashboardViewModel @Inject constructor(
    private val wellnessRepository: WellnessRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CoachDashboardUiState())
    val uiState: StateFlow<CoachDashboardUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = CoachDashboardUiState(isLoading = true)
            val profileResult = wellnessRepository.getMyCoachProfile()
            val patientsResult = wellnessRepository.getCoachPatients()
            val sessionsResult = wellnessRepository.getWellnessSessions()
            _uiState.value = CoachDashboardUiState(
                isLoading = false,
                profile = (profileResult as? Result.Success)?.data,
                patients = (patientsResult as? Result.Success)?.data ?: emptyList(),
                sessions = (sessionsResult as? Result.Success)?.data ?: emptyList(),
                error = listOf(profileResult, patientsResult, sessionsResult)
                    .filterIsInstance<Result.Error>()
                    .firstOrNull()?.message
            )
        }
    }

    fun selectPatient(patientId: String) {
        _uiState.value = _uiState.value.copy(selectedPatientId = patientId, analytics = null)
        viewModelScope.launch {
            when (val result = wellnessRepository.getCoachPatientAnalytics(patientId)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(analytics = result.data)
                is Result.Error -> _uiState.value = _uiState.value.copy(error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun toggleAvailability(isAvailable: Boolean, isAcceptingClients: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdatingAvailability = true, successMessage = null, error = null)
            val request = UpdateCoachAvailabilityRequest(
                isAvailable = isAvailable,
                isAcceptingClients = isAcceptingClients
            )
            when (val result = wellnessRepository.updateCoachAvailability(request)) {
                is Result.Success -> _uiState.value = _uiState.value.copy(
                    isUpdatingAvailability = false,
                    successMessage = "Availability updated"
                )
                is Result.Error -> _uiState.value = _uiState.value.copy(isUpdatingAvailability = false, error = result.message)
                is Result.Loading -> {}
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(successMessage = null, error = null)
    }
}

// Helper to parse typed report sections from the reports JsonObject
fun parseReportSections(report: JsonObject?): List<com.example.swastik.data.remote.dto.WellnessReportSectionDto> {
    if (report == null) return emptyList()
    val sections = mutableListOf<com.example.swastik.data.remote.dto.WellnessReportSectionDto>()
    val gson = com.google.gson.Gson()

    report.getAsJsonObject("workoutSummary")?.let { summary ->
        sections += com.example.swastik.data.remote.dto.WellnessReportSectionDto(
            title = "Workout Summary",
            type = "workout",
            value = summary.get("completed")?.asDouble ?: 0.0,
            unit = "workouts",
            chartData = listOf(
                ChartPointDto("Completed", summary.get("completed")?.asDouble ?: 0.0),
                ChartPointDto("Minutes", summary.get("totalMinutes")?.asDouble ?: 0.0),
                ChartPointDto("Calories", summary.get("totalCalories")?.asDouble ?: 0.0)
            )
        )
    }

    report.getAsJsonObject("wearableSummary")?.let { summary ->
        val avgSleep = summary.get("averageSleepMinutes")?.takeIf { !it.isJsonNull }?.asDouble
        sections += com.example.swastik.data.remote.dto.WellnessReportSectionDto(
            title = "Wearable Summary",
            type = "sleep",
            value = avgSleep ?: 0.0,
            unit = "min avg sleep",
            chartData = (summary.getAsJsonArray("trend")?.takeIf { it.size() > 0 })
                ?.mapNotNull { element ->
                    runCatching {
                        val obj = element.asJsonObject
                        ChartPointDto(
                            label = obj.get("date")?.asString ?: "",
                            value = obj.get("steps")?.asDouble ?: 0.0
                        )
                    }.getOrNull()
                }
        )
    }

    report.getAsJsonArray("badges")?.let { badges ->
        sections += com.example.swastik.data.remote.dto.WellnessReportSectionDto(
            title = "Badges Earned",
            type = "recovery",
            value = badges.size().toDouble(),
            unit = "badges"
        )
    }

    report.getAsJsonArray("coachingSessions")?.let { sessions ->
        sections += com.example.swastik.data.remote.dto.WellnessReportSectionDto(
            title = "Coaching Sessions",
            type = "workout",
            value = sessions.size().toDouble(),
            unit = "sessions"
        )
    }

    report.getAsJsonArray("aiInsights")?.let { insights ->
        sections += com.example.swastik.data.remote.dto.WellnessReportSectionDto(
            title = "AI Insights",
            type = "nutrition",
            value = insights.size().toDouble(),
            unit = "insights"
        )
    }

    return sections
}
