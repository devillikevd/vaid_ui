package com.example.swastik.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.EmergencyRequest
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.data.remote.dto.AddEmergencyContactRequest
import com.example.swastik.data.remote.dto.AddFamilyMemberRequest
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
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import com.example.swastik.navigation.Screen
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
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
    val searchSuggestions: List<String> = listOf("Fever", "Headache", "General Physician", "Dermatologist", "Dentist", "Gynecologist")
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
    private val guardianRepository: com.example.swastik.data.repository.GuardianRepository
) : ViewModel() {

    val healthConnectManager = HealthConnectManager(context)

    // Add Fitness state
    val fitnessLog = fitnessRepository.getTodayLog()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.example.swastik.data.model.DailyFitnessLog())

    val guardianSettings = AppSettingsStore.settings

    val guardianEnabled = AppSettingsStore.settings
        .combine(MutableStateFlow(Unit)) { settings, _ -> settings.guardianEnabled }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val liveTelemetry = guardianRepository.telemetryFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.example.swastik.data.local.GuardianTelemetry())

    val guardianEvents = guardianRepository.getAllEvents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

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
        pushNotificationCoordinator.registerCurrentDeviceIfPossible()
        loadDashboard()
        collectRealtimeNotifications()
        collectProviderCatalogUpdates()
        collectPrescriptionUpdates()
        observeSocketReconnects()
        scheduleAlarms()
    }

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

    private fun collectProviderCatalogUpdates() {
        // Disabled automatic refresh to prevent rate-limiting loops.
        // Dashboard will refresh on next manual pull-to-refresh or app restart.
    }

    private fun collectPrescriptionUpdates() {
        // Disabled automatic refresh to prevent rate-limiting loops.
    }

    private fun observeSocketReconnects() {
        // Disabled automatic refresh on socket reconnect to prevent rate-limiting loops
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
            } catch (e: Exception) {
                Log.e("DashboardVM", "Load dashboard failed", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Connection failed. Please check your internet or server."
                )
            }
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
                    is Result.Loading -> { }
                }
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
                    loadDashboard()
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
                    loadDashboard()
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
            if (!healthConnectManager.hasAllPermissions()) {
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

                if (payload.isNotEmpty()) {
                    when (val result = patientRepository.syncHealthConnectData(payload)) {
                        is Result.Success -> {
                            _healthConnectSyncState.value = ProfileUpdateState.Success("Health Connect data synced!")
                            com.example.swastik.data.local.AppSettingsStore.updateLastHealthSync(java.time.Instant.now().toString())
                            refresh()
                        }
                        is Result.Error -> _healthConnectSyncState.value = ProfileUpdateState.Error(result.message)
                        is Result.Loading -> {}
                    }
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
}

sealed class ProfileUpdateState {
    data object Idle : ProfileUpdateState()
    data object Loading : ProfileUpdateState()
    data class Success(val message: String) : ProfileUpdateState()
    data class Error(val message: String) : ProfileUpdateState()
}
