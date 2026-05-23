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
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.combine
import com.example.swastik.navigation.Screen
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.example.swastik.data.repository.VitalsRepository
import com.example.swastik.data.remote.dto.CreateReminderRequest
import com.example.swastik.notifications.ReminderAlarmScheduler

/**
 * UI State for Patient Dashboard
 */
data class PatientDashboardUiState(
    val isLoading: Boolean = true,
    val dashboard: PatientDashboard? = null,
    val error: String? = null,
    val activeEmergency: EmergencyResponse? = null
)

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
    @ApplicationContext private val context: Context
) : ViewModel() {

    val healthConnectManager = HealthConnectManager(context)

    private val _uiState = MutableStateFlow(PatientDashboardUiState())
    val uiState: StateFlow<PatientDashboardUiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    /** Emits false when the device has no internet */
    val isOnline: StateFlow<Boolean> = networkObserver.observe()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private var hasObservedSocketConnection = false

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
        viewModelScope.launch {
            socketManager.providerCatalogUpdates.collect {
                refresh()
            }
        }
    }

    private fun collectPrescriptionUpdates() {
        viewModelScope.launch {
            socketManager.prescriptionNew.collect {
                // BUG-06 Fix: Refresh dashboard to update recent prescriptions list in Room DB
                // when a doctor creates a new prescription
                refresh()
            }
        }
    }

    private fun observeSocketReconnects() {
        viewModelScope.launch {
            socketManager.connectionState.collect { connected ->
                if (!hasObservedSocketConnection) {
                    hasObservedSocketConnection = true
                    return@collect
                }
                if (connected) {
                    refresh()
                }
            }
        }
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            when (val result = patientRepository.getDashboard()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        dashboard = result.data,
                        activeEmergency = result.data.activeEmergency
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {
                    // Already handled above
                }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            when (val result = patientRepository.getDashboard()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        dashboard = result.data,
                        activeEmergency = result.data.activeEmergency
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
            _isRefreshing.value = false
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
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        activeEmergency = result.data
                    )
                    // BUG-05 Fix: Start socket ambulance tracking so dashboard
                    // quick-action SOS also receives real-time location updates
                    val requestId = result.data.resolvedRequestId()
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

    fun updateProfile(request: UpdateProfileRequest) {
        viewModelScope.launch {
            _profileUpdateState.value = ProfileUpdateState.Loading
            when (val result = patientRepository.updateProfile(request)) {
                is Result.Success -> {
                    _profileUpdateState.value = ProfileUpdateState.Success("Profile updated successfully!")
                    // Refresh the entire dashboard so updated profile data
                    // (name, age, blood group, etc.) reflects everywhere in the app
                    loadDashboard()
                }
                is Result.Error -> {
                    _profileUpdateState.value = ProfileUpdateState.Error(result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resetProfileUpdateState() {
        _profileUpdateState.value = ProfileUpdateState.Idle
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
                    _profileUpdateState.value = ProfileUpdateState.Success("Family member removed successfully!")
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
            when (val result = patientRepository.generateHealthCard()) {
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
                
                if (vitals.totalSteps > 0) {
                    payload.add(mapOf("type" to "steps", "value" to vitals.totalSteps.toString()))
                }
                vitals.recentHeartRates.forEach { hr ->
                    payload.add(mapOf("type" to "heart_rate", "value" to hr.toString()))
                }
                vitals.recentTemperatures.forEach { temp ->
                    payload.add(mapOf("type" to "temperature", "value" to temp.toString()))
                }

                if (payload.isNotEmpty()) {
                    when (val result = patientRepository.syncHealthConnectData(payload)) {
                        is Result.Success -> {
                            _healthConnectSyncState.value = ProfileUpdateState.Success("Health Connect data synced!")
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

    // ── Reminders ───────────────────────────────────────────────

    fun createReminder(title: String, time: String, type: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val request = CreateReminderRequest(
                title = title,
                type = type,
                time = time
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
            when (val result = vitalsRepository.actOnReminder(reminderId, "taken", scheduledAt)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder marked as taken")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun snoozeReminder(reminderId: String, scheduledAt: String, snoozeMinutes: Int = 15) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = vitalsRepository.actOnReminder(reminderId, "snoozed", scheduledAt, snoozeMinutes)) {
                is Result.Success -> {
                    com.example.swastik.ui.components.SnackbarManager.showMessage("Reminder snoozed")
                    refresh()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    fun skipReminder(reminderId: String, scheduledAt: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = vitalsRepository.actOnReminder(reminderId, "skipped", scheduledAt)) {
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
}

sealed class ProfileUpdateState {
    data object Idle : ProfileUpdateState()
    data object Loading : ProfileUpdateState()
    data class Success(val message: String) : ProfileUpdateState()
    data class Error(val message: String) : ProfileUpdateState()
}
