package com.example.swastik.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import com.example.swastik.data.repository.VitalsRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@AndroidEntryPoint
class ReminderActionReceiver : BroadcastReceiver() {

    @Inject
    lateinit var vitalsRepository: VitalsRepository

    @Inject
    lateinit var alarmScheduler: ReminderAlarmScheduler

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        const val ACTION_MARK_DONE = "com.example.swastik.ACTION_MARK_DONE"
        const val ACTION_SNOOZE = "com.example.swastik.ACTION_SNOOZE"
        const val ACTION_SKIP = "com.example.swastik.ACTION_SKIP"

        const val EXTRA_REMINDER_ID = "EXTRA_REMINDER_ID"
        const val EXTRA_SCHEDULED_AT = "EXTRA_SCHEDULED_AT"
        const val EXTRA_SNOOZE_MINS = "EXTRA_SNOOZE_MINS"
        const val EXTRA_NOTIFICATION_ID = "EXTRA_NOTIFICATION_ID"
        const val EXTRA_REMINDER_TITLE = "EXTRA_REMINDER_TITLE"
        const val EXTRA_REMINDER_TIME = "EXTRA_REMINDER_TIME"
        const val EXTRA_REMINDER_TYPE = "EXTRA_REMINDER_TYPE"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        val action = intent.action ?: return
        val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val scheduledAt = intent.getStringExtra(EXTRA_SCHEDULED_AT) ?: LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME)
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)
        val title = intent.getStringExtra(EXTRA_REMINDER_TITLE) ?: "Reminder"
        val time = intent.getStringExtra(EXTRA_REMINDER_TIME) ?: ""
        val typeStr = intent.getStringExtra(EXTRA_REMINDER_TYPE) ?: "MEDICINE"

        // Dismiss the notification immediately
        if (notificationId != -1) {
            NotificationManagerCompat.from(context).cancel(notificationId)
        }

        val pendingResult = goAsync()

        scope.launch {
            try {
                when (action) {
                    ACTION_MARK_DONE -> {
                        Log.d("ReminderActionReceiver", "Marking $reminderId as done")
                        vitalsRepository.actOnReminder(reminderId, "taken", scheduledAt)
                    }
                    ACTION_SNOOZE -> {
                        val snoozeMins = intent.getIntExtra(EXTRA_SNOOZE_MINS, 15)
                        Log.d("ReminderActionReceiver", "Snoozing $reminderId for $snoozeMins mins")
                        val result = vitalsRepository.actOnReminder(reminderId, "snooze", scheduledAt, snoozeMins)
                        
                        // Schedule the snoozed alarm locally
                        val reminderType = try { ReminderType.valueOf(typeStr) } catch(e: Exception) { ReminderType.MEDICINE }
                        val mockReminder = Reminder(
                            id = reminderId,
                            title = title,
                            type = reminderType,
                            time = time,
                            days = emptyList(),
                            isCompleted = false,
                            snoozeUntil = LocalDateTime.now().plusMinutes(snoozeMins.toLong()).format(DateTimeFormatter.ISO_DATE_TIME)
                        )
                        alarmScheduler.schedule(mockReminder)
                    }
                    ACTION_SKIP -> {
                        Log.d("ReminderActionReceiver", "Skipping $reminderId")
                        vitalsRepository.actOnReminder(reminderId, "skip", scheduledAt)
                    }
                }
            } catch (e: Exception) {
                Log.e("ReminderActionReceiver", "Failed to perform action: ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }
}
