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
        val notes = intent.getStringExtra("EXTRA_REMINDER_NOTES") ?: ""

        // Check if course has expired based on notes (e.g. "until Aug 25, 2026")
        var isCourseCompleted = false
        if (notes.isNotBlank() && notes.contains("until ")) {
            try {
                val untilIndex = notes.indexOf("until ") + 6
                val datePart = notes.substring(untilIndex).trim().removeSuffix(")")
                val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy", java.util.Locale.US)
                val endDate = java.time.LocalDate.parse(datePart, formatter)
                val today = java.time.LocalDate.now()
                if (today.isAfter(endDate)) {
                    isCourseCompleted = true
                }
            } catch (_: Exception) {}
        }

        if (isCourseCompleted) {
            // Send Course Completed celebration notification!
            pushNotificationCoordinator.showNotification(
                title = "🎉 Course Completed: $title",
                message = "Congratulations! You've finished your prescribed medicine course. Stay healthy!",
                type = "medicine_reminder",
                data = mapOf(
                    "reminder_id" to reminderId,
                    "reminder_time" to time,
                    "reminder_type" to typeStr
                )
            )
            // Do NOT reschedule next alarm (auto-expired!)
            return
        }

        // Map the type to the notification routing type used in PushNotificationCoordinator
        val notificationType = when (typeStr) {
            "MEDICINE" -> "medicine_reminder"
            "APPOINTMENT" -> "appointment_reminder"
            "TEST" -> "health_task_reminder"
            else -> "medicine_reminder"
        }

        val mealTag = when {
            notes.contains("Empty Stomach") -> "⚠️ Empty Stomach (Morning)"
            notes.contains("Before Food") -> "🍽️ 30m Before Food"
            notes.contains("After Food") -> "🍽️ After Food"
            notes.contains("Bedtime") -> "🛌 At Bedtime"
            else -> ""
        }

        val displayTitle = if (typeStr == "MEDICINE") "💊 Take $title" else "⏰ Time for your ${typeStr.lowercase()}"
        val displayMessage = if (mealTag.isNotBlank()) "$mealTag • Scheduled for $time" else "$title is scheduled for $time"

        pushNotificationCoordinator.showNotification(
            title = displayTitle,
            message = displayMessage,
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
            notes = notes,
            isCompleted = false
        )
        alarmScheduler.schedule(mockReminder)
    }
}
