package com.example.swastik.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class ReminderReceiver : BroadcastReceiver() {

    @Inject
    lateinit var pushNotificationCoordinator: PushNotificationCoordinator

    @Inject
    lateinit var tokenManager: com.example.swastik.data.local.TokenManager

    @Inject
    lateinit var alarmScheduler: ReminderAlarmScheduler

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (!tokenManager.isAuthenticated()) return

        val reminderId = intent.getStringExtra("EXTRA_REMINDER_ID") ?: return
        val title = intent.getStringExtra("EXTRA_REMINDER_TITLE") ?: "Reminder"
        val time = intent.getStringExtra("EXTRA_REMINDER_TIME") ?: ""
        val typeStr = intent.getStringExtra("EXTRA_REMINDER_TYPE") ?: "MEDICINE"
        val daysArray = intent.getStringArrayExtra("EXTRA_REMINDER_DAYS") ?: emptyArray()

        // Map the type to the notification routing type used in PushNotificationCoordinator
        val notificationType = when (typeStr) {
            "MEDICINE" -> "medicine_reminder"
            "APPOINTMENT" -> "appointment_reminder"
            "TEST" -> "health_task_reminder"
            else -> "medicine_reminder"
        }

        pushNotificationCoordinator.showNotification(
            title = "Time for your ${typeStr.lowercase()}",
            message = "$title is scheduled for $time",
            type = notificationType,
            data = mapOf(
                "reminder_id" to reminderId,
                "reminder_time" to time,
                "reminder_type" to typeStr
            )
        )

        // Schedule the next occurrence
        val mockReminder = Reminder(
            id = reminderId,
            title = title,
            type = try { ReminderType.valueOf(typeStr) } catch(e: Exception) { ReminderType.MEDICINE },
            time = time,
            days = daysArray.toList(),
            isCompleted = false
        )
        alarmScheduler.schedule(mockReminder)
    }
}
