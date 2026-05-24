package com.example.swastik.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.swastik.data.repository.VitalsRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class BootCompletedReceiver : BroadcastReceiver() {

    @Inject
    lateinit var vitalsRepository: VitalsRepository

    @Inject
    lateinit var alarmScheduler: ReminderAlarmScheduler

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED || intent?.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.d("BootCompletedReceiver", "Re-scheduling alarms after reboot/update")
            scope.launch {
                // Fetch reminders from backend to reschedule
                val result = vitalsRepository.getReminders(isActive = true)
                if (result is com.example.swastik.data.repository.Result.Success) {
                    val reminders = result.data.map { dto ->
                        com.example.swastik.data.model.Reminder(
                            id = dto.id,
                            title = dto.title,
                            time = dto.time,
                            type = try {
                                com.example.swastik.data.model.ReminderType.valueOf(dto.type.uppercase())
                            } catch (e: Exception) {
                                com.example.swastik.data.model.ReminderType.MEDICINE
                            },
                            days = dto.days ?: emptyList(),
                            notes = dto.notes,
                            snoozeUntil = dto.snoozeUntil,
                            isCompleted = dto.isCompleted
                        )
                    }
                    reminders.forEach { alarmScheduler.schedule(it) }
                    Log.d("BootCompletedReceiver", "Rescheduled \${reminders.size} alarms")
                }
            }
        }
    }
}
