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

data class AppSettings(
    val themePreference: ThemePreference = ThemePreference.SYSTEM,
    val language: String = "en",
    val notificationPreferences: NotificationPreferences = NotificationPreferences(),
    val chatbotLanguage: String = "en",
    val chatbotTtsEnabled: Boolean = true
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
                _settings.value = AppSettings(
                    themePreference = theme,
                    language = language,
                    notificationPreferences = notificationPreferences,
                    chatbotLanguage = prefs[CHATBOT_LANGUAGE_KEY] ?: "en",
                    chatbotTtsEnabled = prefs[CHATBOT_TTS_KEY] ?: true
                )
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
}
