package com.example.swastik.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class ReminderReceiver : BroadcastReceiver() {

    @Inject
    lateinit var pushNotificationCoordinator: PushNotificationCoordinator

    @Inject
    lateinit var tokenManager: com.example.swastik.data.local.TokenManager

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (!tokenManager.isAuthenticated()) return

        val reminderId = intent.getStringExtra("EXTRA_REMINDER_ID") ?: return
        val title = intent.getStringExtra("EXTRA_REMINDER_TITLE") ?: "Reminder"
        val time = intent.getStringExtra("EXTRA_REMINDER_TIME") ?: ""
        val typeStr = intent.getStringExtra("EXTRA_REMINDER_TYPE") ?: "MEDICINE"

        // Map the type to the notification routing type used in PushNotificationCoordinator
        val notificationType = when (typeStr) {
            "MEDICINE" -> "medicine_reminder"
            "APPOINTMENT" -> "appointment_reminder"
            "TEST" -> "health_task_reminder"
            else -> "medicine_reminder"
        }

        pushNotificationCoordinator.showNotification(
            title = "Time for your \${typeStr.lowercase()}",
            message = "\$title is scheduled for \$time",
            type = notificationType,
            data = mapOf("reminder_id" to reminderId)
        )
    }
}
