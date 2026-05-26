package com.example.swastik.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

enum class ThemePreference {
    LIGHT, DARK, SYSTEM
}

data class NotificationPreferences(
    val appointments: Boolean = true,
    val medicines: Boolean = true,
    val reports: Boolean = true,
    val promotions: Boolean = true,
    val sound: Boolean = true
)

data class GuardianFeaturePreferences(
    val fallDetection: Boolean = true,
    val crashDetection: Boolean = true,
    val mobilityAnalysis: Boolean = false,
    val respiratoryTracker: Boolean = false,
    val doctorQrSharing: Boolean = false
) {
    fun hasAnyMonitoringFeature(): Boolean {
        return fallDetection || crashDetection || mobilityAnalysis || respiratoryTracker
    }
}

data class AppSettings(
    val themePreference: ThemePreference = ThemePreference.SYSTEM,
    val language: String = "en",
    val notificationPreferences: NotificationPreferences = NotificationPreferences(),
    val chatbotLanguage: String = "en",
    val chatbotTtsEnabled: Boolean = true,
    val guardianEnabled: Boolean = false,
    val guardianConsentAccepted: Boolean = false,
    val guardianConsentAcceptedAt: String? = null,
    val guardianFeatures: GuardianFeaturePreferences = GuardianFeaturePreferences(),
    val guardianSensitivity: String = "HIGH", // LOW, MEDIUM, HIGH
    val guardianGracePeriod: Int = 30, // 15, 30, 60
    val lastHealthSync: String? = null
)

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "app_settings")

object AppSettingsStore {

    private val THEME_KEY = stringPreferencesKey("theme_preference")
    private val LANGUAGE_KEY = stringPreferencesKey("language")
    private val NOTIF_APPOINTMENTS_KEY = booleanPreferencesKey("notif_appointments")
    private val NOTIF_MEDICINES_KEY = booleanPreferencesKey("notif_medicines")
    private val NOTIF_REPORTS_KEY = booleanPreferencesKey("notif_reports")
    private val NOTIF_PROMOTIONS_KEY = booleanPreferencesKey("notif_promotions")
    private val NOTIF_SOUND_KEY = booleanPreferencesKey("notif_sound")
    private val CHATBOT_LANGUAGE_KEY = stringPreferencesKey("chatbot_language")
    private val CHATBOT_TTS_KEY = booleanPreferencesKey("chatbot_tts")
    private val GUARDIAN_ENABLED_KEY = booleanPreferencesKey("guardian_enabled")
    private val GUARDIAN_CONSENT_ACCEPTED_KEY = booleanPreferencesKey("guardian_consent_accepted")
    private val GUARDIAN_CONSENT_ACCEPTED_AT_KEY = stringPreferencesKey("guardian_consent_accepted_at")
    private val GUARDIAN_FALL_DETECTION_KEY = booleanPreferencesKey("guardian_fall_detection")
    private val GUARDIAN_CRASH_DETECTION_KEY = booleanPreferencesKey("guardian_crash_detection")
    private val GUARDIAN_MOBILITY_ANALYSIS_KEY = booleanPreferencesKey("guardian_mobility_analysis")
    private val GUARDIAN_RESPIRATORY_TRACKER_KEY = booleanPreferencesKey("guardian_respiratory_tracker")
    private val GUARDIAN_DOCTOR_QR_SHARING_KEY = booleanPreferencesKey("guardian_doctor_qr_sharing")
    private val GUARDIAN_SENSITIVITY_KEY = stringPreferencesKey("guardian_sensitivity")
    private val GUARDIAN_GRACE_PERIOD_KEY = androidx.datastore.preferences.core.intPreferencesKey("guardian_grace_period")
    private val LAST_HEALTH_SYNC_KEY = stringPreferencesKey("last_health_sync")

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private lateinit var appContext: Context

    // Called from SwastikApplication.onCreate()
    fun init(context: Context) {
        appContext = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.data.collect { prefs ->
                val theme = when (prefs[THEME_KEY]) {
                    "DARK" -> ThemePreference.DARK
                    "LIGHT" -> ThemePreference.LIGHT
                    else -> ThemePreference.SYSTEM
                }
                val language = com.example.swastik.util.LanguageConfig.normalizeStoredLanguage(prefs[LANGUAGE_KEY])
                val notificationPreferences = NotificationPreferences(
                    appointments = prefs[NOTIF_APPOINTMENTS_KEY] ?: true,
                    medicines = prefs[NOTIF_MEDICINES_KEY] ?: true,
                    reports = prefs[NOTIF_REPORTS_KEY] ?: true,
                    promotions = prefs[NOTIF_PROMOTIONS_KEY] ?: true,
                    sound = prefs[NOTIF_SOUND_KEY] ?: true
                )
                val guardianFeatures = GuardianFeaturePreferences(
                    fallDetection = prefs[GUARDIAN_FALL_DETECTION_KEY] ?: true,
                    crashDetection = prefs[GUARDIAN_CRASH_DETECTION_KEY] ?: true,
                    mobilityAnalysis = prefs[GUARDIAN_MOBILITY_ANALYSIS_KEY] ?: false,
                    respiratoryTracker = prefs[GUARDIAN_RESPIRATORY_TRACKER_KEY] ?: false,
                    doctorQrSharing = prefs[GUARDIAN_DOCTOR_QR_SHARING_KEY] ?: false
                )
                _settings.value = AppSettings(
                    themePreference = theme,
                    language = language,
                    notificationPreferences = notificationPreferences,
                    chatbotLanguage = prefs[CHATBOT_LANGUAGE_KEY] ?: "en",
                    chatbotTtsEnabled = prefs[CHATBOT_TTS_KEY] ?: true,
                    guardianEnabled = prefs[GUARDIAN_ENABLED_KEY] ?: false,
                    guardianConsentAccepted = prefs[GUARDIAN_CONSENT_ACCEPTED_KEY] ?: false,
                    guardianConsentAcceptedAt = prefs[GUARDIAN_CONSENT_ACCEPTED_AT_KEY],
                    guardianFeatures = guardianFeatures,
                    guardianSensitivity = prefs[GUARDIAN_SENSITIVITY_KEY] ?: "HIGH",
                    guardianGracePeriod = prefs[GUARDIAN_GRACE_PERIOD_KEY] ?: 30,
                    lastHealthSync = prefs[LAST_HEALTH_SYNC_KEY]
                )
            }
        }
    }

    fun updateLastHealthSync(time: String) {
        _settings.value = _settings.value.copy(lastHealthSync = time)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[LAST_HEALTH_SYNC_KEY] = time
            }
        }
    }

    fun updateTheme(theme: ThemePreference) {
        _settings.value = _settings.value.copy(themePreference = theme)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[THEME_KEY] = theme.name
            }
        }
    }

    fun updateLanguage(language: String) {
        val normalized = com.example.swastik.util.LanguageConfig.normalizeStoredLanguage(language)
        _settings.value = _settings.value.copy(language = normalized)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[LANGUAGE_KEY] = normalized
            }
        }
    }

    fun updateNotificationPreferences(notificationPreferences: NotificationPreferences) {
        _settings.value = _settings.value.copy(notificationPreferences = notificationPreferences)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[NOTIF_APPOINTMENTS_KEY] = notificationPreferences.appointments
                prefs[NOTIF_MEDICINES_KEY] = notificationPreferences.medicines
                prefs[NOTIF_REPORTS_KEY] = notificationPreferences.reports
                prefs[NOTIF_PROMOTIONS_KEY] = notificationPreferences.promotions
                prefs[NOTIF_SOUND_KEY] = notificationPreferences.sound
            }
        }
    }

    fun updateChatbotLanguage(language: String) {
        _settings.value = _settings.value.copy(chatbotLanguage = language)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[CHATBOT_LANGUAGE_KEY] = language
            }
        }
    }

    fun updateChatbotTtsEnabled(enabled: Boolean) {
        _settings.value = _settings.value.copy(chatbotTtsEnabled = enabled)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[CHATBOT_TTS_KEY] = enabled
            }
        }
    }

    fun updateGuardianEnabled(enabled: Boolean) {
        _settings.value = _settings.value.copy(guardianEnabled = enabled)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[GUARDIAN_ENABLED_KEY] = enabled
            }
        }
    }

    fun acceptGuardianConsent(features: GuardianFeaturePreferences) {
        val acceptedAt = java.time.Instant.now().toString()
        _settings.value = _settings.value.copy(
            guardianConsentAccepted = true,
            guardianConsentAcceptedAt = acceptedAt,
            guardianFeatures = features
        )
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[GUARDIAN_CONSENT_ACCEPTED_KEY] = true
                prefs[GUARDIAN_CONSENT_ACCEPTED_AT_KEY] = acceptedAt
                prefs[GUARDIAN_FALL_DETECTION_KEY] = features.fallDetection
                prefs[GUARDIAN_CRASH_DETECTION_KEY] = features.crashDetection
                prefs[GUARDIAN_MOBILITY_ANALYSIS_KEY] = features.mobilityAnalysis
                prefs[GUARDIAN_RESPIRATORY_TRACKER_KEY] = features.respiratoryTracker
                prefs[GUARDIAN_DOCTOR_QR_SHARING_KEY] = features.doctorQrSharing
            }
        }
    }

    fun updateGuardianFeaturePreferences(features: GuardianFeaturePreferences) {
        _settings.value = _settings.value.copy(guardianFeatures = features)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[GUARDIAN_FALL_DETECTION_KEY] = features.fallDetection
                prefs[GUARDIAN_CRASH_DETECTION_KEY] = features.crashDetection
                prefs[GUARDIAN_MOBILITY_ANALYSIS_KEY] = features.mobilityAnalysis
                prefs[GUARDIAN_RESPIRATORY_TRACKER_KEY] = features.respiratoryTracker
                prefs[GUARDIAN_DOCTOR_QR_SHARING_KEY] = features.doctorQrSharing
            }
        }
    }

    suspend fun readGuardianEnabled(): Boolean {
        if (!::appContext.isInitialized) return _settings.value.guardianEnabled
        return appContext.dataStore.data.first()[GUARDIAN_ENABLED_KEY] ?: _settings.value.guardianEnabled
    }

    suspend fun readGuardianConsentAccepted(): Boolean {
        if (!::appContext.isInitialized) return _settings.value.guardianConsentAccepted
        return appContext.dataStore.data.first()[GUARDIAN_CONSENT_ACCEPTED_KEY]
            ?: _settings.value.guardianConsentAccepted
    }

    fun updateGuardianSensitivity(sensitivity: String) {
        _settings.value = _settings.value.copy(guardianSensitivity = sensitivity)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[GUARDIAN_SENSITIVITY_KEY] = sensitivity
            }
        }
    }

    fun updateGuardianGracePeriod(seconds: Int) {
        _settings.value = _settings.value.copy(guardianGracePeriod = seconds)
        CoroutineScope(Dispatchers.IO).launch {
            appContext.dataStore.edit { prefs ->
                prefs[GUARDIAN_GRACE_PERIOD_KEY] = seconds
            }
        }
    }
}
