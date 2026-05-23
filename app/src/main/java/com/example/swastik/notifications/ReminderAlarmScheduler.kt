package com.example.swastik.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.example.swastik.data.model.Reminder
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import javax.inject.Inject

interface ReminderAlarmScheduler {
    fun schedule(reminder: Reminder)
    fun cancel(reminder: Reminder)
    fun cancelAll()
}

class AndroidAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context
) : ReminderAlarmScheduler {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun schedule(reminder: Reminder) {
        if (reminder.isCompleted) return

        try {
            // Parse time from "HH:mm"
            val parts = reminder.time.split(":")
            if (parts.size != 2) return
            val hour = parts[0].toInt()
            val minute = parts[1].toInt()

            var alarmTime = LocalDateTime.now().withHour(hour).withMinute(minute).withSecond(0)

            // If time has already passed today, schedule for tomorrow
            if (alarmTime.isBefore(LocalDateTime.now())) {
                alarmTime = alarmTime.plusDays(1)
            }

            val intent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("EXTRA_REMINDER_ID", reminder.id)
                putExtra("EXTRA_REMINDER_TITLE", reminder.title)
                putExtra("EXTRA_REMINDER_TIME", reminder.time)
                putExtra("EXTRA_REMINDER_TYPE", reminder.type.name)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminder.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val timeInMillis = alarmTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                // If permission denied, use inexact alarm
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    timeInMillis,
                    pendingIntent
                )
            }
            Log.d("AndroidAlarmScheduler", "Scheduled alarm for reminder \${reminder.id} at \$alarmTime")

        } catch (e: Exception) {
            Log.e("AndroidAlarmScheduler", "Failed to schedule alarm: \${e.message}")
        }
    }

    override fun cancel(reminder: Reminder) {
        val intent = Intent(context, ReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminder.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
        Log.d("AndroidAlarmScheduler", "Cancelled alarm for reminder \${reminder.id}")
    }

    override fun cancelAll() {
        // To cancel all, we would need to know their IDs, or we cancel them explicitly when iterating.
        // For complete "cancel all" (e.g. on logout), we might just clear stored reminders, which won't 
        // cancel the OS alarms immediately unless we iterate through them. We'll rely on the ViewModel
        // to pass the list of reminders to cancel.
    }
}
