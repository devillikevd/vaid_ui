package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.EmergencyRequest
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.data.remote.dto.AddEmergencyContactRequest
import com.example.swastik.data.remote.dto.AddFamilyMemberRequest
import com.example.swastik.data.remote.dto.WearableSummaryRequest
import com.example.swastik.data.remote.dto.ReferralConsentDto
import com.example.swastik.data.repository.Result
import com.example.swastik.data.repository.PatientRepository
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.AuthRepository
import com.example.swastik.notifications.PushNotificationCoordinator
import com.example.swastik.utils.NetworkObserver
import com.example.swastik.data.health.HealthConnectManager
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.GuardianFeaturePreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import com.example.swastik.navigation.Screen
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject

import com.example.swastik.data.repository.VitalsRepository
import com.example.swastik.data.remote.dto.CreateReminderRequest
import com.example.swastik.notifications.ReminderAlarmScheduler

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import android.location.Geocoder
import java.util.Locale
import android.util.Log
/**
 * UI State for Patient Dashboard
 */
data class PatientDashboardUiState(
    val isLoading: Boolean = true,
    val dashboard: PatientDashboard? = null,
    val error: String? = null,
    val activeEmergency: EmergencyResponse? = null,
    val searchSuggestions: List<String> = emptyList()
)

private fun isTerminalEmergencyStatus(status: String?): Boolean =
    status in listOf("completed", "cancelled", "timeout", "no_ambulance")

private fun terminalEmergencyMessage(status: String?, message: String? = null): String? {
    val backendMessage = message?.takeIf { it.isNotBlank() }
    return when (status) {
        "timeout" -> backendMessage ?: "Ambulance search timed out. Please try again or call 108."
        "no_ambulance" -> backendMessage ?: "No ambulance is currently available nearby. Please call 108 immediately."
        "cancelled" -> backendMessage ?: "Your SOS request has been cancelled."
        else -> null
    }
}

/**
 * Patient Dashboard ViewModel
 */
@HiltViewModel
class PatientDashboardViewModel @Inject constructor(
    private val patientRepository: PatientRepository,
    private val vitalsRepository: VitalsRepository,
    private val authRepository: AuthRepository,
    private val emergencyRepository: EmergencyRepository,
    private val socketManager: SocketManager,
    private val pushNotificationCoordinator: PushNotificationCoordinator,
    private val alarmScheduler: ReminderAlarmScheduler,
    networkObserver: NetworkObserver,
    @ApplicationContext private val context: Context,
    private val fitnessRepository: com.example.swastik.data.repository.FitnessRepository,
    private val guardianRepository: com.example.swastik.data.repository.GuardianRepository,
    private val favoriteDoctorsStore: com.example.swastik.data.repository.FavoriteDoctorsStore,
    private val favoriteFacilitiesStore: com.example.swastik.data.repository.FavoriteFacilitiesStore,
    private val communityRepository: com.example.swastik.data.repository.CommunityRepository
) : ViewModel() {

    val healthConnectManager = HealthConnectManager(context)

    // Add Fitness state
    val fitnessLog = fitnessRepository.getTodayLog()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.example.swastik.data.model.DailyFitnessLog())

    val guardianEnabled = AppSettingsStore.settings
        .combine(MutableStateFlow(Unit)) { settings, _ -> settings.guardianEnabled }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val liveTelemetry = guardianRepository.telemetryFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.example.swastik.data.local.GuardianTelemetry())

    val guardianSettings = AppSettingsStore.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.example.swastik.data.local.AppSettings())

    private val _totalCommunityQuestions = MutableStateFlow<Int?>(null)
    val totalCommunityQuestions = _totalCommunityQuestions.asStateFlow()

    val guardianEvents = guardianRepository.getAllEvents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _pendingConsents = MutableStateFlow<List<ReferralConsentDto>>(emptyList())
    val pendingConsents: StateFlow<List<ReferralConsentDto>> = _pendingConsents.asStateFlow()

    private val _isConsentLoading = MutableStateFlow(false)
    val isConsentLoading: StateFlow<Boolean> = _isConsentLoading.asStateFlow()

    private val _consentActionMessage = MutableStateFlow<String?>(null)
    val consentActionMessage: StateFlow<String?> = _consentActionMessage.asStateFlow()

    private val _consentActionError = MutableStateFlow<String?>(null)
    val consentActionError: StateFlow<String?> = _consentActionError.asStateFlow()

    private val _uiState = MutableStateFlow(PatientDashboardUiState())
    val uiState: StateFlow<PatientDashboardUiState> = _uiState.asStateFlow()

    private val _selectedTab = MutableStateFlow(0)
    val selectedTab: StateFlow<Int> = _selectedTab.asStateFlow()

    fun setTab(index: Int) {
        _selectedTab.value = index.coerceIn(0, 4)
    }

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    /** Emits false when the device has no internet */
    val isOnline: StateFlow<Boolean> = networkObserver.observe()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private var hasObservedSocketConnection = false
    private var loadJob: kotlinx.coroutines.Job? = null
    private var lastRequestTime = 0L
    private val MIN_REQUEST_INTERVAL = 3000L // 3 seconds

    val patientProfile = patientRepository.patientProfile
    val stats = patientRepository.stats
    val reminders = patientRepository.reminders
    val recommendedDoctors = patientRepository.recommendedDoctors
    val consultations = patientRepository.consultations

    val favoriteDoctors: StateFlow<Set<com.example.swastik.data.model.Doctor>> = favoriteDoctorsStore.favorites

    val favoriteDoctorsCount: StateFlow<Int> = favoriteDoctorsStore.favorites.map { it.size }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val favoriteHospitalsCount: StateFlow<Int> = favoriteFacilitiesStore.favorites.map { list -> list.count { it.type == com.example.swastik.data.model.FacilityType.HOSPITAL } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val favoriteFacilities: StateFlow<Set<com.example.swastik.data.model.MedicalFacility>> = favoriteFacilitiesStore.favorites

    val favoriteClinicsCount: StateFlow<Int> = favoriteFacilitiesStore.favorites.map { list -> list.count { it.type == com.example.swastik.data.model.FacilityType.CLINIC } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val favoriteDiagnosticsCount: StateFlow<Int> = favoriteFacilitiesStore.favorites.map { list -> list.count { it.type == com.example.swastik.data.model.FacilityType.DIAGNOSTIC_CENTER } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val favoritePharmaciesCount: StateFlow<Int> = favoriteFacilitiesStore.favorites.map { list -> list.count { it.type == com.example.swastik.data.model.FacilityType.MEDICAL_STORE } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val notifications: StateFlow<List<NotificationItem>> = patientRepository.notifications
        .combine(patientRepository.reminders) { notifs, rems ->
            val uncompleted = rems.filter { !it.isCompleted }
            if (uncompleted.isNotEmpty()) {
                val summaryNotif = NotificationItem(
                    id = "reminders_summary_virtual",
                    title = "Today's Reminders",
                    message = "You have ${uncompleted.size} pending health tasks. Tap to view.",
                    time = "Today",
                    type = NotificationType.MEDICINE_REMINDER,
                    isRead = false,
                    actionLabel = "View Reminders",
                    actionRoute = "reminders_tab"
                )
                // Filter out any existing virtual summary and prepend the new one
                listOf(summaryNotif) + notifs.filter { it.id != "reminders_summary_virtual" }
            } else {
                notifs.filter { it.id != "reminders_summary_virtual" }
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Stagger init work slightly so the first UI frame can compose
        // without competing with network I/O and database reads.
        viewModelScope.launch {
            kotlinx.coroutines.delay(100)
            pushNotificationCoordinator.registerCurrentDeviceIfPossible()
            loadDashboard()
            fetchPendingConsents()
        }
        fetchDashboardData()
        fetchTotalQuestions()
        collectRealtimeNotifications()
        observeRealtimeDashboardUpdates()
        scheduleAlarms()
    }

    suspend fun submitFeedback(
        rating: Int,
        category: String,
        feedbackText: String,
        allowContact: Boolean,
        screenshotFile: java.io.File?
    ): com.example.swastik.data.repository.Result<Unit> {
        return patientRepository.submitFeedback(rating, category, feedbackText, allowContact, screenshotFile)
    }

    // ==================== INITIAL LOAD ====================
    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            alarmScheduler.cancelAll()
            onComplete()
        }
    }


    private fun scheduleAlarms() {
        viewModelScope.launch {
            reminders.collect { currentReminders ->
                currentReminders.forEach { reminder ->
                    if (!reminder.isCompleted) {
                        alarmScheduler.schedule(reminder)
                    } else {
                        alarmScheduler.cancel(reminder)
                    }
                }
            }
        }
    }

    /**
     * Collect real-time notifications from Socket.IO and merge into notification list
     */
    private fun collectRealtimeNotifications() {
        viewModelScope.launch {
            patientRepository.realtimeNotifications.collect { socketNotification ->
                patientRepository.applyRealtimeNotification(socketNotification)
                patientRepository.fetchNotifications()
            }
        }
    }

    /**
     * Listen to all real-time socket events that affect dashboard data and
     * trigger a silent (spinner-less) rate-limited refresh so the home screen
     * updates automatically without requiring manual pull-to-refresh or restart.
     * The shared MIN_REQUEST_INTERVAL guard prevents rate-limiting loops when
     * several events arrive in quick succession.
     */
    private fun observeRealtimeDashboardUpdates() {
        viewModelScope.launch {
            socketManager.appointmentUpdates.collect {
                silentRefreshDashboard("appointment:${it.status}")
            }
        }
        viewModelScope.launch {
            socketManager.consultationStarted.collect {
                // Consultation started — force-fetch the dashboard straight from
                // the network (bypassing the rate limiter) so the card flips to
                // Live/Join without relying on local/room caching.
                forceRefreshDashboardFromNetwork("consultation:started")
            }
        }
        viewModelScope.launch {
            socketManager.consultationEnded.collect {
                silentRefreshDashboard("consultation:ended")
            }
        }
        viewModelScope.launch {
            socketManager.prescriptionNew.collect {
                silentRefreshDashboard("prescription:new")
            }
        }
        viewModelScope.launch {
            socketManager.providerCatalogUpdates.collect {
                silentRefreshDashboard("catalog:refresh")
            }
        }
        viewModelScope.launch {
            socketManager.diagnosticUpdates.collect {
                silentRefreshDashboard("diagnostic:${it.status}")
            }
        }
        viewModelScope.launch {
            socketManager.orderUpdates.collect {
                silentRefreshDashboard("order:${it.status}")
            }
        }
        viewModelScope.launch {
            // Replay(1) emits the current connection state on subscribe; at that
            // point init already triggered loadDashboard(), so the rate limiter
            // absorbs the duplicate. Later reconnects refresh to recover any
            // events missed while offline.
            socketManager.connectionState.collect { connected ->
                if (connected) {
                    silentRefreshDashboard("socket:reconnect")
                }
            }
        }
    }

    /**
     * Refresh dashboard data silently (without toggling the full-screen loading spinner),
     * so real-time socket updates apply without flicker on active screens.
     */
    private fun silentRefreshDashboard(reason: String) {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastRequestTime < MIN_REQUEST_INTERVAL) {
            return
        }
        lastRequestTime = currentTime

        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            try {
                Log.d("PatientDashboard", "Realtime event: $reason — refreshing dashboard")
                fetchDashboardIntoState()
            } catch (e: Exception) {
                Log.e("DashboardVM", "Silent dashboard refresh failed", e)
                _uiState.value = _uiState.value.copy(error = "Refresh failed. Server might be unreachable.")
            }
        }
    }

    /**
     * Force-fetch the dashboard from the network, bypassing the rate limiter.
     * Used for high-priority realtime events (e.g. consultation:started) where
     * a skipped refresh would leave the patient card stale.
     */
    private fun forceRefreshDashboardFromNetwork(reason: String) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            try {
                Log.d("PatientDashboard", "Force realtime refresh: $reason — fetching from network")
                fetchDashboardIntoState()
            } catch (e: Exception) {
                Log.e("DashboardVM", "Force dashboard refresh failed", e)
            }
        }
    }

    /**
     * Triggered when the dashboard screen returns to the foreground, so events
     * missed while the app was backgrounded (socket disconnect, paused socket)
     * are picked up without a manual pull-to-refresh.
     */
    fun refreshOnResume() {
        silentRefreshDashboard("onResume")
    }

    fun loadDashboard() {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastRequestTime < MIN_REQUEST_INTERVAL) {
            return
        }
        lastRequestTime = currentTime

        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                fetchDashboardIntoState()
            } catch (e: Exception) {
                Log.e("DashboardVM", "Load dashboard failed", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Connection failed. Please check your internet or server."
                )
            }
        }
    }

    private suspend fun fetchDashboardIntoState() {
        coroutineScope {
            val suggestionsJob = async {
                try { patientRepository.getSearchSuggestions() } catch (e: Exception) { Result.Error("Failed") }
            }

            when (val result = patientRepository.getDashboard()) {
                is Result.Success -> {
                    val suggestionsResult = suggestionsJob.await()
                    val newSuggestions = if (suggestionsResult is Result.Success<*>) {
                        @Suppress("UNCHECKED_CAST")
                        val list = suggestionsResult.data as? List<String>
                        if (!list.isNullOrEmpty()) list else _uiState.value.searchSuggestions
                    } else {
                        _uiState.value.searchSuggestions
                    }

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        dashboard = result.data,
                        activeEmergency = result.data.activeEmergency,
                        searchSuggestions = newSuggestions
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
            fetchPendingConsents()
        }
    }

    fun refresh() {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastRequestTime < MIN_REQUEST_INTERVAL) {
            _isRefreshing.value = false
            return
        }
        lastRequestTime = currentTime

        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            try {
                _isRefreshing.value = true
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                fetchDashboardIntoState()
            } catch (e: Exception) {
                Log.e("DashboardVM", "Refresh failed", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Refresh failed. Server might be unreachable."
                )
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun requestEmergency(
        latitude: Double,
        longitude: Double,
        address: String?,
        emergencyType: String,
        description: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val request = EmergencyRequest(
                latitude = latitude,
                longitude = longitude,
                address = address,
                emergencyType = emergencyType,
                notes = description
            )
            
            when (val result = emergencyRepository.requestEmergency(request)) {
                is Result.Success -> {
                    val emergency = result.data
                    if (isTerminalEmergencyStatus(emergency.resolvedStatus())) {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            activeEmergency = null,
                            error = terminalEmergencyMessage(emergency.resolvedStatus(), emergency.message)
                        )
                        return@launch
                    }

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        activeEmergency = emergency
                    )
                    // BUG-05 Fix: Start socket ambulance tracking so dashboard
                    // quick-action SOS also receives real-time location updates
                    val requestId = emergency.resolvedRequestId()
                    if (requestId.isNotEmpty()) {
                        socketManager.connect()
                        socketManager.trackAmbulance(requestId)
                    }
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun cancelEmergency(emergencyId: String, reason: String) {
        viewModelScope.launch {
            when (val result = emergencyRepository.cancelEmergency(emergencyId, reason)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(activeEmergency = null)
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    // ── Notification Actions ────────────────────────────────────

    fun markNotificationRead(notificationId: String) {
        viewModelScope.launch {
            patientRepository.markNotificationRead(notificationId)
            // Refresh notifications list to reflect the change
            patientRepository.fetchNotifications()
        }
    }

    fun markAllNotificationsRead() {
        viewModelScope.launch {
            patientRepository.markAllNotificationsRead()
            // Refresh notifications list to reflect the change
            patientRepository.fetchNotifications()
        }
    }

    fun clearAllNotifications() {
        viewModelScope.launch {
            patientRepository.deleteAllNotifications()
            // No need to fetch, repository already cleared the flow
        }
    }

    // ── Profile Update ──────────────────────────────────────────

    private val _profileUpdateState = MutableStateFlow<ProfileUpdateState>(ProfileUpdateState.Idle)
    val profileUpdateState: StateFlow<ProfileUpdateState> = _profileUpdateState.asStateFlow()

    fun updateProfile(request: UpdateProfileRequest, silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) {
                _profileUpdateState.value = ProfileUpdateState.Loading
            }
            when (val result = patientRepository.updateProfile(request)) {
                is Result.Success -> {
                    if (!silent) {
                        _profileUpdateState.value = ProfileUpdateState.Success("Profile updated successfully!")
                    }
                    // Refresh the entire dashboard so updated profile data
                    // (name, age, blood group, etc.) reflects everywhere in the app
                    loadDashboard()
                }
                is Result.Error -> {
                    if (!silent) {
                        _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resetProfileUpdateState() {
        _profileUpdateState.value = ProfileUpdateState.Idle
    }

    // ── Location Auto-Fetch ─────────────────────────────────────

    fun fetchAndUpdateLocation() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return // Permissions not granted
        }

        try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    try {
                        val geocoder = Geocoder(context, Locale.getDefault())
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            geocoder.getFromLocation(location.latitude, location.longitude, 1) { addresses ->
                                val address = addresses.firstOrNull()
                                if (address != null) {
                                    val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                                    val city = address.locality ?: address.subAdminArea ?: address.adminArea
                                    handleLocationUpdate(locality, city)
                                }
                            }
                        } else {
                            @Suppress("DEPRECATION")
                            val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            val address = addresses?.firstOrNull()
                            if (address != null) {
                                val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                                val city = address.locality ?: address.subAdminArea ?: address.adminArea
                                handleLocationUpdate(locality, city)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("LocationFetch", "Geocoder failed", e)
                    }
                }
            }.addOnFailureListener { e ->
                Log.e("LocationFetch", "Failed to fetch location", e)
            }
        } catch (e: Exception) {
            Log.e("LocationFetch", "Error initializing location client", e)
        }
    }

    private fun handleLocationUpdate(locality: String, city: String?) {
        val currentProfile = patientProfile.value
        // Only update if location has actually changed to save API calls
        if (currentProfile?.location != locality) {
            updateProfile(UpdateProfileRequest(
                location = locality,
                city = city
            ), silent = true)
        }
    }

    // ── Profile Image Upload ────────────────────────────────────

    private val _imageUploadState = MutableStateFlow<ProfileUpdateState>(ProfileUpdateState.Idle)
    val imageUploadState: StateFlow<ProfileUpdateState> = _imageUploadState.asStateFlow()

    fun uploadProfileImage(imagePart: okhttp3.MultipartBody.Part) {
        viewModelScope.launch {
            _imageUploadState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.uploadProfileImage(imagePart)) {
                is Result.Success -> {
                    _imageUploadState.value = ProfileUpdateState.Success("Profile photo updated!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _imageUploadState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteProfileImage() {
        viewModelScope.launch {
            _imageUploadState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.deleteProfileImage()) {
                is Result.Success -> {
                    _imageUploadState.value = ProfileUpdateState.Success("Profile photo removed!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _imageUploadState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resetImageUploadState() {
        _imageUploadState.value = ProfileUpdateState.Idle
    }

    // ── Change Password ─────────────────────────────────────────

    private val _changePasswordState = MutableStateFlow<ProfileUpdateState>(ProfileUpdateState.Idle)
    val changePasswordState: StateFlow<ProfileUpdateState> = _changePasswordState.asStateFlow()

    fun changePassword(currentPassword: String, newPassword: String) {
        viewModelScope.launch {
            _changePasswordState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.changePassword(currentPassword, newPassword)) {
                is Result.Success -> {
                    _changePasswordState.value = ProfileUpdateState.Success("Password changed successfully!")
                }
                is Result.Error -> {
                    _changePasswordState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resetChangePasswordState() {
        _changePasswordState.value = ProfileUpdateState.Idle
    }

    // ── Emergency Contacts CRUD ─────────────────────────────────

    fun addEmergencyContact(name: String, phone: String, relation: String) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.addEmergencyContact(
                AddEmergencyContactRequest(name = name, phone = phone, relation = relation)
            )) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Emergency contact added successfully!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteEmergencyContact(contactId: String) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.deleteEmergencyContact(contactId)) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Emergency contact removed successfully!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    // ── Family Members CRUD ─────────────────────────────────────

    fun addFamilyMember(name: String, relation: String, phone: String?) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.addFamilyMember(
                AddFamilyMemberRequest(name = name, relation = relation, phone = phone)
            )) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Family member added successfully!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteFamilyMember(memberId: String) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.deleteFamilyMember(memberId)) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Family member deleted successfully!")
                    loadDashboard()
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun addAddress(label: String, address: String) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.addSavedAddress(
                com.example.swastik.data.remote.dto.AddSavedAddressRequest(label = label, address = address)
            )) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Address added successfully!")
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteAddress(addressId: String) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.deleteSavedAddress(addressId)) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Address deleted successfully!")
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    // ── Health Card QR ──────────────────────────────────────────

    data class HealthCardState(
        val isLoading: Boolean = false,
        val url: String? = null,
        val token: String? = null,
        val expiresAt: String? = null,
        val hasActiveCard: Boolean = false,
        val hasCheckedStatus: Boolean = false,
        val error: String? = null
    )

    private val _healthCardState = MutableStateFlow(HealthCardState())
    val healthCardState: StateFlow<HealthCardState> = _healthCardState.asStateFlow()

    fun generateHealthCard() {
        viewModelScope.launch {
            _healthCardState.value = _healthCardState.value.copy(isLoading = true, error = null)
            
            var analyticsJson: String? = null
            if (com.example.swastik.data.local.AppSettingsStore.settings.value.guardianFeatures.doctorQrSharing) {
                analyticsJson = guardianRepository.generateAnalyticsReportJson()
            }
            
            when (val result = patientRepository.generateHealthCard(analyticsJson)) {
                is Result.Success -> {
                    _healthCardState.value = HealthCardState(
                        url = result.data.url,
                        token = result.data.token,
                        expiresAt = result.data.expiresAt,
                        hasActiveCard = true,
                        hasCheckedStatus = true
                    )
                }
                is Result.Error -> {
                    _healthCardState.value = _healthCardState.value.copy(
                        isLoading = false,
                        hasCheckedStatus = true,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun checkHealthCardStatus() {
        viewModelScope.launch {
            _healthCardState.value = _healthCardState.value.copy(isLoading = true, error = null)
            when (val result = patientRepository.getHealthCardStatus()) {
                is Result.Success -> {
                    _healthCardState.value = HealthCardState(
                        isLoading = false,
                        hasActiveCard = result.data.hasActiveCard,
                        url = result.data.url,
                        token = result.data.url?.substringAfterLast("/"),
                        expiresAt = result.data.expiresAt,
                        hasCheckedStatus = true
                    )
                }
                is Result.Error -> {
                    _healthCardState.value = _healthCardState.value.copy(
                        isLoading = false,
                        hasCheckedStatus = true,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun revokeHealthCard() {
        viewModelScope.launch {
            _healthCardState.value = _healthCardState.value.copy(isLoading = true)
            when (patientRepository.revokeHealthCard()) {
                is Result.Success -> {
                    _healthCardState.value = HealthCardState(hasCheckedStatus = true)
                }
                is Result.Error -> {
                    _healthCardState.value = _healthCardState.value.copy(
                        isLoading = false,
                        hasCheckedStatus = true,
                        error = "Failed to revoke"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    // ── Health Connect ──────────────────────────────────────────
    private val _healthConnectSyncState = MutableStateFlow<ProfileUpdateState>(ProfileUpdateState.Idle)
    val healthConnectSyncState: StateFlow<ProfileUpdateState> = _healthConnectSyncState.asStateFlow()

    fun syncHealthConnectData() {
        viewModelScope.launch {
            _healthConnectSyncState.value = ProfileUpdateState.Loading
            if (!healthConnectManager.hasPermissions()) {
                _healthConnectSyncState.value = ProfileUpdateState.Error("Permissions not granted")
                return@launch
            }
            try {
                val vitals = healthConnectManager.fetchVitalsData()
                // Convert to Vitals list for backend
                val payload = mutableListOf<Map<String, String>>()
                
                vitals.dailySteps.forEach { stepCount ->
                    payload.add(mapOf("type" to "steps", "value" to stepCount.value.toString(), "recorded_at" to stepCount.time.toString()))
                }
                vitals.recentHeartRates.forEach { hr ->
                    payload.add(mapOf("type" to "heart_rate", "value" to hr.value.toString(), "recorded_at" to hr.time.toString()))
                }
                vitals.recentTemperatures.forEach { temp ->
                    payload.add(mapOf("type" to "temperature", "value" to temp.value.toString(), "recorded_at" to temp.time.toString()))
                }

                val steps = vitals.dailySteps.sumOf { it.value }.coerceAtMost(com.example.swastik.data.health.HealthConnectManager.MAX_DAILY_HEALTH_CONNECT_STEPS)
                val heartRates = vitals.recentHeartRates.map { it.value }
                val hasWearableSummary = steps > 0 ||
                    vitals.distanceMeters > 0.0 ||
                    vitals.activeCalories > 0.0 ||
                    vitals.totalCalories > 0.0 ||
                    vitals.activeMinutes > 0 ||
                    vitals.exerciseMinutes > 0 ||
                    vitals.workoutsCount > 0 ||
                    vitals.sleepMinutes > 0 ||
                    heartRates.isNotEmpty()

                val wellnessSummary = if (hasWearableSummary) {
                    WearableSummaryRequest(
                        summaryDate = java.time.LocalDate.now().toString(),
                        steps = steps,
                        distanceMeters = vitals.distanceMeters,
                        activeCalories = vitals.activeCalories,
                        totalCalories = vitals.totalCalories,
                        activeMinutes = vitals.activeMinutes,
                        exerciseMinutes = vitals.exerciseMinutes,
                        workoutsCount = vitals.workoutsCount,
                        heartRateAvg = heartRates.takeIf { it.isNotEmpty() }?.average(),
                        heartRateMin = heartRates.minOrNull(),
                        heartRateMax = heartRates.maxOrNull(),
                        sleepMinutes = vitals.sleepMinutes.takeIf { it > 0 },
                        metadata = mapOf("source_app" to "android")
                    )
                } else {
                    null
                }

                if (payload.isNotEmpty()) {
                    when (val result = patientRepository.syncHealthConnectData(payload)) {
                        is Result.Error -> {
                            _healthConnectSyncState.value = ProfileUpdateState.Error(result.message)
                            return@launch
                        }
                        is Result.Success, is Result.Loading -> {}
                    }
                }

                if (wellnessSummary != null) {
                    when (val result = patientRepository.syncWearableSummary(wellnessSummary)) {
                        is Result.Success -> {
                            _healthConnectSyncState.value = ProfileUpdateState.Success("Health Connect data synced!")
                            com.example.swastik.data.local.AppSettingsStore.updateLastHealthSync(java.time.Instant.now().toString())
                            refresh()
                        }
                        is Result.Error -> _healthConnectSyncState.value = ProfileUpdateState.Error(result.message)
                        is Result.Loading -> {}
                    }
                } else if (payload.isNotEmpty()) {
                    _healthConnectSyncState.value = ProfileUpdateState.Success("Health Connect data synced!")
                    com.example.swastik.data.local.AppSettingsStore.updateLastHealthSync(java.time.Instant.now().toString())
                    refresh()
                } else {
                    _healthConnectSyncState.value = ProfileUpdateState.Success("No new health data found.")
                }
            } catch (e: Exception) {
                _healthConnectSyncState.value = ProfileUpdateState.Error(e.message ?: "Sync failed")
            }
        }
    }

    fun resetHealthConnectSyncState() {
        _healthConnectSyncState.value = ProfileUpdateState.Idle
    }

    fun revokeHealthConnectAccess() {
        viewModelScope.launch {
            _healthConnectSyncState.value = ProfileUpdateState.Loading
            try {
                healthConnectManager.revokeAllPermissions()
                // Clear the sync state after revoke
                _healthConnectSyncState.value = ProfileUpdateState.Idle
            } catch (e: Exception) {
                _healthConnectSyncState.value = ProfileUpdateState.Error("Failed to revoke permissions.")
            }
        }
    }

    fun startFitnessTrackingService() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val hasActivityRecognition = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.ACTIVITY_RECOGNITION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            
            if (hasActivityRecognition) {
                val intent = android.content.Intent(context, com.example.swastik.data.fitness.StepCounterService::class.java)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            }
        } else {
            val intent = android.content.Intent(context, com.example.swastik.data.fitness.StepCounterService::class.java)
            context.startService(intent)
        }
    }

    // ── Reminders ───────────────────────────────────────────────

    fun fetchDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = patientRepository.getDashboard()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        dashboard = result.data,
                        error = null
                    )
                    // Fetch real data from backend for Smart Health Hub
                    when (val summariesResult = patientRepository.getWearableSummaries(1)) {
                        is Result.Success -> {
                            summariesResult.data.firstOrNull()?.let { summary ->
                                fitnessRepository.syncWithBackendData(summary)
                            }
                        }
                        else -> {} // ignore errors silently for this background sync
                    }
                }
                is Result.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message
                )
                is Result.Loading -> {}
            }
        }
    }

    private fun fetchTotalQuestions() {
        viewModelScope.launch {
            communityRepository.getQuestions(page = 1, limit = 1).collect { result ->
                if (result is Result.Success) {
                    _totalCommunityQuestions.value = result.data.total
                }
            }
        }
    }

    private fun formatScheduledAt(time: String): String {
        return try {
            val parts = time.split(":")
            if (parts.size >= 2) {
                val hour = parts[0].toIntOrNull() ?: 0
                val minute = parts[1].toIntOrNull() ?: 0
                LocalDateTime.now().withHour(hour).withMinute(minute).withSecond(0).withNano(0)
                    .atZone(ZoneId.systemDefault()).toInstant().toString()
            } else {
                Instant.now().toString()
            }
        } catch (e: Exception) {
            Instant.now().toString()
        }
    }

    fun createReminder(title: String, time: String, type: String, days: List<String> = emptyList(), notes: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val request = CreateReminderRequest(
                title = title,
                type = type,
                time = time,
                days = days,
                notes = notes
            )
            when (val result = vitalsRepository.createReminder(request)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder created successfully")
                    refresh() // Refresh to update list
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun markReminderDone(reminderId: String, scheduledAt: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val formattedTime = formatScheduledAt(scheduledAt)
            when (val result = vitalsRepository.actOnReminder(reminderId, "taken", formattedTime)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder marked as taken")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                    com.example.swastik.ui.components.SnackbarManager.showError(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun snoozeReminder(reminderId: String, scheduledAt: String, snoozeMinutes: Int = 15) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val formattedTime = formatScheduledAt(scheduledAt)
            when (val result = vitalsRepository.actOnReminder(reminderId, "snooze", formattedTime, snoozeMinutes)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder snoozed for $snoozeMinutes minutes")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                    com.example.swastik.ui.components.SnackbarManager.showError(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun skipReminder(reminderId: String, scheduledAt: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val formattedTime = formatScheduledAt(scheduledAt)
            when (val result = vitalsRepository.actOnReminder(reminderId, "skip", formattedTime)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder skipped")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteReminder(reminderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = vitalsRepository.deleteReminder(reminderId)) {
                is Result.Success -> {
                    alarmScheduler.cancelById(reminderId)
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder deleted")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun toggleGuardian(enabled: Boolean) {
        val settings = com.example.swastik.data.local.AppSettingsStore.settings.value
        if (enabled && (!settings.guardianConsentAccepted || !settings.guardianFeatures.hasAnyMonitoringFeature())) {
            com.example.swastik.ui.components.SnackbarManager.showMessage("Read and accept Guardian details before enabling it.")
            com.example.swastik.data.local.AppSettingsStore.updateGuardianEnabled(false)
            return
        }

        com.example.swastik.data.local.AppSettingsStore.updateGuardianEnabled(enabled)
        if (enabled) {
            val intent = android.content.Intent(context, com.example.swastik.services.guardian.GuardianService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } else {
            val intent = android.content.Intent(context, com.example.swastik.services.guardian.GuardianService::class.java)
            context.stopService(intent)
        }
    }

    fun acceptGuardianConsent(features: GuardianFeaturePreferences) {
        com.example.swastik.data.local.AppSettingsStore.acceptGuardianConsent(features)
    }

    fun updateGuardianFeaturePreferences(features: GuardianFeaturePreferences) {
        com.example.swastik.data.local.AppSettingsStore.updateGuardianFeaturePreferences(features)
    }

    suspend fun getGuardianAnalytics(): String {
        return guardianRepository.generateAnalyticsReportJson()
    }

    // ── Referral Consent Actions ───────────────────────────────────

    fun fetchPendingConsents() {
        viewModelScope.launch {
            when (val result = patientRepository.getPendingReferralConsents()) {
                is Result.Success -> {
                    _pendingConsents.value = result.data
                }
                is Result.Error -> {
                    Log.e("PatientDashboardVM", "Failed to fetch pending consents: ${result.message}")
                }
                else -> Unit
            }
        }
    }

    fun approveConsent(referralId: String, onResult: ((Boolean, String) -> Unit)? = null) {
        if (_isConsentLoading.value) return
        viewModelScope.launch {
            _isConsentLoading.value = true
            _consentActionError.value = null
            when (val result = patientRepository.approveReferralConsent(referralId)) {
                is Result.Success -> {
                    _isConsentLoading.value = false
                    _pendingConsents.value = _pendingConsents.value.filter { it.id != referralId }
                    val msg = "Consent granted"
                    _consentActionMessage.value = msg
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Consent granted: The referral can now be securely shared with the receiving provider.")
                    onResult?.invoke(true, msg)
                }
                is Result.Error -> {
                    _isConsentLoading.value = false
                    val errorMsg = result.message ?: "Unable to process your decision. Please try again."
                    _consentActionError.value = errorMsg
                    com.example.swastik.ui.components.SnackbarManager.showError(errorMsg)
                    onResult?.invoke(false, errorMsg)
                }
                else -> {
                    _isConsentLoading.value = false
                }
            }
        }
    }

    fun declineConsent(referralId: String, onResult: ((Boolean, String) -> Unit)? = null) {
        if (_isConsentLoading.value) return
        viewModelScope.launch {
            _isConsentLoading.value = true
            _consentActionError.value = null
            when (val result = patientRepository.declineReferralConsent(referralId)) {
                is Result.Success -> {
                    _isConsentLoading.value = false
                    _pendingConsents.value = _pendingConsents.value.filter { it.id != referralId }
                    val msg = "Consent declined"
                    _consentActionMessage.value = msg
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Consent declined")
                    onResult?.invoke(true, msg)
                }
                is Result.Error -> {
                    _isConsentLoading.value = false
                    val errorMsg = result.message ?: "Unable to process your decision. Please try again."
                    _consentActionError.value = errorMsg
                    com.example.swastik.ui.components.SnackbarManager.showError(errorMsg)
                    onResult?.invoke(false, errorMsg)
                }
                else -> {
                    _isConsentLoading.value = false
                }
            }
        }
    }

    fun clearConsentMessage() {
        _consentActionMessage.value = null
        _consentActionError.value = null
    }
}

sealed class ProfileUpdateState {
    data object Idle : ProfileUpdateState()
    data object Loading : ProfileUpdateState()
    data class Success(val message: String) : ProfileUpdateState()
    data class Error(val message: String) : ProfileUpdateState()
}
