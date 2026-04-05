package com.example.swastik.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.swastik.MainActivity
import com.example.swastik.R
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.TokenManager
import com.example.swastik.data.repository.PatientRepository
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@Singleton
class PushNotificationCoordinator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val patientRepository: PatientRepository,
    private val tokenManager: TokenManager
) {
    companion object {
        private const val TAG = "PushNotifications"
        const val CHANNEL_ID = "swastik_default"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "SWASTIK Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Consultations, reminders, prescriptions, and emergency alerts"
            }
        )
    }

    fun registerCurrentDeviceIfPossible() {
        scope.launch {
            if (!tokenManager.isAuthenticated()) return@launch
            val token = getFirebaseTokenOrNull() ?: return@launch
            patientRepository.registerDeviceForPush(token)
        }
    }

    suspend fun unregisterCurrentDeviceIfPossible() {
        if (!tokenManager.isAuthenticated()) return
        val token = getFirebaseTokenOrNull() ?: return
        patientRepository.unregisterDeviceForPush(token)
    }

    fun onNewToken(token: String) {
        if (!tokenManager.isAuthenticated() || token.isBlank()) return
        scope.launch {
            patientRepository.registerDeviceForPush(token)
        }
    }

    fun showNotification(
        title: String,
        message: String,
        type: String,
        data: Map<String, String> = emptyMap()
    ) {
        val preferences = AppSettingsStore.settings.value.notificationPreferences
        if (!shouldDisplayNotification(type, preferences)) return

        ensureNotificationChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val destination = resolvePatientNotificationDestination(type, data)
        val pendingIntent = destination.deepLink?.let(::buildDeepLinkIntent)

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title.ifBlank { context.getString(R.string.app_name) })
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setSilent(!preferences.sound)
            .build()

        NotificationManagerCompat.from(context).notify(
            ("$type:$title:$message").hashCode(),
            notification
        )
    }

    private suspend fun getFirebaseTokenOrNull(): String? {
        if (!ensureFirebaseConfigured()) return null
        return try {
            FirebaseMessaging.getInstance().token.await().takeIf { it.isNotBlank() }
        } catch (error: Exception) {
            Log.w(TAG, "Skipping FCM registration: ${error.message}")
            null
        }
    }

    private fun ensureFirebaseConfigured(): Boolean {
        return try {
            if (FirebaseApp.getApps(context).isNotEmpty()) {
                true
            } else {
                FirebaseApp.initializeApp(context) != null
            }
        } catch (error: Exception) {
            Log.w(TAG, "Firebase client config missing: ${error.message}")
            false
        }
    }

    private fun buildDeepLinkIntent(deepLink: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink), context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        return PendingIntent.getActivity(
            context,
            deepLink.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun shouldDisplayNotification(
        rawType: String,
        preferences: com.example.swastik.data.local.NotificationPreferences
    ): Boolean {
        return when (rawType.lowercase()) {
            "appointment",
            "appointment_booked",
            "appointment_confirmed",
            "appointment_reminder",
            "follow_up_reminder",
            "appointment_status_changed",
            "appointment_rescheduled",
            "appointment_cancelled" -> preferences.appointments

            "medicine",
            "medicine_reminder",
            "medicine_missed",
            "health_task_reminder",
            "care_plan_reminder" -> preferences.medicines

            "report",
            "report_ready",
            "report_uploaded",
            "diagnostic_result",
            "diagnostic_test_reminder",
            "report_review_reminder",
            "prescription",
            "prescription_created",
            "prescription_expiry_reminder" -> preferences.reports

            "offer",
            "promotion",
            "promo",
            "discount" -> preferences.promotions

            else -> true
        }
    }
}
