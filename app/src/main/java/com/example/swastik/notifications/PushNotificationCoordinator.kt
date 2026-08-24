package com.example.swastik.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
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
    @param:ApplicationContext private val context: Context,
    private val patientRepository: PatientRepository,
    private val tokenManager: TokenManager,
) {
    companion object {
        private const val TAG = "PushNotifications"
        const val CHANNEL_ID = "swastik_default"
        const val ALARM_CHANNEL_ID = "swastik_alarms"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "VAIDIDEA Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Consultations, prescriptions, and general alerts"
                }
            )
        }

        if (manager.getNotificationChannel(ALARM_CHANNEL_ID) == null) {
            val audioAttributes = android.media.AudioAttributes.Builder()
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .build()
                
            manager.createNotificationChannel(
                NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "VAIDIDEA Reminders",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Medication and appointment reminders"
                    setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM), audioAttributes)
                    setBypassDnd(true)
                }
            )
        }
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

        val notificationId = ("$type:$title:$message").hashCode()

        val channelIdToUse = if (type == "medicine_reminder" || type == "appointment_reminder" || type == "health_task_reminder") {
            ALARM_CHANNEL_ID
        } else {
            CHANNEL_ID
        }

        val builder = NotificationCompat.Builder(context, channelIdToUse)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title.ifBlank { context.getString(R.string.app_name) })
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setSilent(!preferences.sound)

        if (channelIdToUse == ALARM_CHANNEL_ID) {
            builder.setCategory(NotificationCompat.CATEGORY_ALARM)
            
            // Launch ReminderAlarmActivity for full-screen ringing experience
            val reminderId = data["reminder_id"]
            val reminderTime = data["reminder_time"] ?: ""
            val reminderType = data["reminder_type"] ?: "MEDICINE"
            
            val scheduledAt = try {
                if (reminderTime.contains("T") && reminderTime.endsWith("Z")) reminderTime else {
                    val parts = reminderTime.split(":")
                    if (parts.size >= 2) {
                        val cal = java.util.Calendar.getInstance()
                        cal.set(java.util.Calendar.HOUR_OF_DAY, parts[0].toInt())
                        cal.set(java.util.Calendar.MINUTE, parts[1].toInt())
                        cal.set(java.util.Calendar.SECOND, 0)
                        cal.set(java.util.Calendar.MILLISECOND, 0)
                        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                        format.format(cal.time)
                    } else {
                        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                        format.format(java.util.Date())
                    }
                }
            } catch (e: Exception) {
                val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                format.format(java.util.Date())
            }

            val fullScreenIntent = Intent(context, ReminderAlarmActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminderId)
                putExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT, scheduledAt)
                putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, notificationId)
                putExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE, title)
                putExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME, reminderTime)
                putExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE, reminderType)
            }
            
            val fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                "fs_alarm_$notificationId".hashCode(),
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            builder.setFullScreenIntent(fullScreenPendingIntent, true)
        }

        if (preferences.sound) {
            if (channelIdToUse != ALARM_CHANNEL_ID) {
                builder.setDefaults(NotificationCompat.DEFAULT_ALL)
            } else {
                builder.setDefaults(NotificationCompat.DEFAULT_LIGHTS or NotificationCompat.DEFAULT_VIBRATE)
            }
        }

        // Add Quick Actions for Reminders
        if (type == "medicine_reminder" || type == "appointment_reminder" || type == "health_task_reminder") {
            val reminderId = data["reminder_id"]
            val reminderTime = data["reminder_time"] ?: ""
            val reminderType = data["reminder_type"] ?: "MEDICINE"
            if (reminderId != null) {
                val scheduledAt = try {
                    if (reminderTime.contains("T") && reminderTime.endsWith("Z")) reminderTime else {
                        val parts = reminderTime.split(":")
                        if (parts.size >= 2) {
                            val cal = java.util.Calendar.getInstance()
                            cal.set(java.util.Calendar.HOUR_OF_DAY, parts[0].toInt())
                            cal.set(java.util.Calendar.MINUTE, parts[1].toInt())
                            cal.set(java.util.Calendar.SECOND, 0)
                            cal.set(java.util.Calendar.MILLISECOND, 0)
                            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                            format.format(cal.time)
                        } else {
                            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                            format.format(java.util.Date())
                        }
                    }
                } catch (e: Exception) {
                    val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    format.timeZone = java.util.TimeZone.getTimeZone("UTC")
                    format.format(java.util.Date())
                }

                val takenIntent = Intent(context, ReminderActionReceiver::class.java).apply {
                    action = ReminderActionReceiver.ACTION_MARK_DONE
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminderId)
                    putExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT, scheduledAt)
                    putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, notificationId)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE, title)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME, reminderTime)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE, reminderType)
                }
                val takenPendingIntent = PendingIntent.getBroadcast(
                    context,
                    "taken_$reminderId".hashCode(),
                    takenIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                builder.addAction(0, "✅ Taken", takenPendingIntent)

                val snoozeIntent = Intent(context, ReminderActionReceiver::class.java).apply {
                    action = ReminderActionReceiver.ACTION_SNOOZE
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminderId)
                    putExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT, scheduledAt)
                    putExtra(ReminderActionReceiver.EXTRA_SNOOZE_MINS, 15)
                    putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, notificationId)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE, title)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME, reminderTime)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE, reminderType)
                }
                val snoozePendingIntent = PendingIntent.getBroadcast(
                    context,
                    "snooze_$reminderId".hashCode(),
                    snoozeIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                builder.addAction(0, "⏳ Snooze 15m", snoozePendingIntent)

                val skipIntent = Intent(context, ReminderActionReceiver::class.java).apply {
                    action = ReminderActionReceiver.ACTION_SKIP
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminderId)
                    putExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT, scheduledAt)
                    putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, notificationId)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE, title)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME, reminderTime)
                    putExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE, reminderType)
                }
                val skipPendingIntent = PendingIntent.getBroadcast(
                    context,
                    "skip_$reminderId".hashCode(),
                    skipIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                builder.addAction(0, "❌ Skip", skipPendingIntent)
            }
        }

        NotificationManagerCompat.from(context).notify(
            notificationId,
            builder.build()
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
        val intent = Intent(Intent.ACTION_VIEW, deepLink.toUri(), context, MainActivity::class.java).apply {
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
            "consultation_started",
            "appointment_status_changed",
            "appointment_rescheduled",
            "appointment_cancelled" ->
                preferences.appointments

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
