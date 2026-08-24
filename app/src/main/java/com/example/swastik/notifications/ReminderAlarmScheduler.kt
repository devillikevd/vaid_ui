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
    fun cancelById(id: String)
    fun cancelAll()
}

class AndroidAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context
) : ReminderAlarmScheduler {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun schedule(reminder: Reminder) {
        if (reminder.isCompleted) return

        try {
            var finalTimeInMillis: Long? = null

            // 1. Check if snoozed
            if (reminder.snoozeUntil != null) {
                try {
                    val snoozeTime = java.time.Instant.parse(reminder.snoozeUntil)
                    if (snoozeTime.isAfter(java.time.Instant.now())) {
                        finalTimeInMillis = snoozeTime.toEpochMilli()
                        Log.d("AndroidAlarmScheduler", "Using snooze time for reminder ${reminder.id}")
                    }
                } catch (e: Exception) {
                    Log.e("AndroidAlarmScheduler", "Failed to parse snooze time: ${e.message}")
                }
            }

            // 2. If not snoozed, calculate regular schedule
            if (finalTimeInMillis == null) {
                val timePair = parseReminderTime(reminder.time) ?: return
                val hour = timePair.first
                val minute = timePair.second

                var alarmTime = LocalDateTime.now().withHour(hour).withMinute(minute).withSecond(0).withNano(0)

                if (reminder.days.isEmpty()) {
                    // Daily reminder
                    if (alarmTime.isBefore(LocalDateTime.now())) {
                        alarmTime = alarmTime.plusDays(1)
                    }
                } else {
                    // Recurring days reminder
                    val targetDays = reminder.days.mapNotNull { dayStr ->
                        when (dayStr.lowercase().take(3)) {
                            "mon" -> java.time.DayOfWeek.MONDAY
                            "tue" -> java.time.DayOfWeek.TUESDAY
                            "wed" -> java.time.DayOfWeek.WEDNESDAY
                            "thu" -> java.time.DayOfWeek.THURSDAY
                            "fri" -> java.time.DayOfWeek.FRIDAY
                            "sat" -> java.time.DayOfWeek.SATURDAY
                            "sun" -> java.time.DayOfWeek.SUNDAY
                            else -> null
                        }
                    }
                    if (targetDays.isNotEmpty()) {
                        var daysAdded = 0
                        while (daysAdded < 7) {
                            if (targetDays.contains(alarmTime.dayOfWeek)) {
                                if (daysAdded > 0 || alarmTime.isAfter(LocalDateTime.now())) {
                                    break // Found the next valid time
                                }
                            }
                            alarmTime = alarmTime.plusDays(1)
                            daysAdded++
                        }
                    } else {
                        // Fallback if mapping failed
                        if (alarmTime.isBefore(LocalDateTime.now())) {
                            alarmTime = alarmTime.plusDays(1)
                        }
                    }
                }
                finalTimeInMillis = alarmTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                Log.d("AndroidAlarmScheduler", "Calculated next schedule for ${reminder.id} at $alarmTime")
            }

            val intent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("EXTRA_REMINDER_ID", reminder.id)
                putExtra("EXTRA_REMINDER_TITLE", reminder.title)
                putExtra("EXTRA_REMINDER_TIME", reminder.time)
                putExtra("EXTRA_REMINDER_TYPE", reminder.type.name)
                putExtra("EXTRA_REMINDER_DAYS", reminder.days.toTypedArray())
                putExtra("EXTRA_REMINDER_NOTES", reminder.notes)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminder.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                // If exact alarms permission is still denied, fallback to setAlarmClock which might work,
                // or just use setAndAllowWhileIdle
                val alarmClockInfo = AlarmManager.AlarmClockInfo(finalTimeInMillis, pendingIntent)
                try {
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                } catch (e: SecurityException) {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        finalTimeInMillis,
                        pendingIntent
                    )
                }
            } else {
                val alarmClockInfo = AlarmManager.AlarmClockInfo(finalTimeInMillis, pendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            }
            Log.d("AndroidAlarmScheduler", "Scheduled alarm for reminder ${reminder.id} at $finalTimeInMillis")

        } catch (e: Exception) {
            Log.e("AndroidAlarmScheduler", "Failed to schedule alarm: ${e.message}")
        }
    }

    override fun cancel(reminder: Reminder) {
        cancelById(reminder.id)
    }

    override fun cancelById(id: String) {
        val intent = Intent(context, ReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
        Log.d("AndroidAlarmScheduler", "Cancelled alarm for reminder $id")
    }

    override fun cancelAll() {
        // To cancel all, we would need to know their IDs, or we cancel them explicitly when iterating.
        // For complete "cancel all" (e.g. on logout), we might just clear stored reminders, which won't 
        // cancel the OS alarms immediately unless we iterate through them. We'll rely on the ViewModel
        // to pass the list of reminders to cancel.
    }
}

/**
 * Resilient time parser for both 12-hour (AM/PM) and 24-hour time strings.
 */
private fun parseReminderTime(raw: String): Pair<Int, Int>? {
    val trimmed = raw.trim()
    // 12-hour format: "08:00 AM", "8:30 pm", "8:00PM", "08:00am"
    val amPmRegex = """(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)""".toRegex()
    val matchAmPm = amPmRegex.find(trimmed)
    if (matchAmPm != null) {
        val (hStr, mStr, period) = matchAmPm.destructured
        var h = hStr.toIntOrNull() ?: return null
        val m = mStr.toIntOrNull() ?: return null
        if (period.equals("PM", ignoreCase = true) && h < 12) h += 12
        if (period.equals("AM", ignoreCase = true) && h == 12) h = 0
        if (h in 0..23 && m in 0..59) return Pair(h, m)
    }

    // 24-hour format: "08:00", "20:30", "8:00"
    val h24Regex = """(\d{1,2}):(\d{2})""".toRegex()
    val match24 = h24Regex.find(trimmed)
    if (match24 != null) {
        val (hStr, mStr) = match24.destructured
        val h = hStr.toIntOrNull() ?: return null
        val m = mStr.toIntOrNull() ?: return null
        if (h in 0..23 && m in 0..59) return Pair(h, m)
    }

    return null
}

