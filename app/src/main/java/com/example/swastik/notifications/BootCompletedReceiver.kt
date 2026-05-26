package com.example.swastik.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.services.guardian.GuardianService
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
            val appContext = context?.applicationContext ?: return
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
                    Log.d("BootCompletedReceiver", "Rescheduled ${reminders.size} alarms")
                }

                restartGuardianIfEnabled(appContext)
            }
        }
    }

    private suspend fun restartGuardianIfEnabled(context: Context) {
        val enabled = AppSettingsStore.readGuardianEnabled()
        if (!enabled) return
        val consentAccepted = AppSettingsStore.readGuardianConsentAccepted()
        if (!consentAccepted) {
            Log.w("BootCompletedReceiver", "Guardian enabled flag exists but consent has not been accepted")
            return
        }

        val hasActivityRecognition = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.ACTIVITY_RECOGNITION
            ) == PackageManager.PERMISSION_GRANTED
        val hasLocation = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

        if (!hasActivityRecognition || !hasLocation) {
            Log.w("BootCompletedReceiver", "Guardian enabled but required permissions are missing")
            return
        }

        val serviceIntent = Intent(context, GuardianService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
        Log.d("BootCompletedReceiver", "Guardian service restarted after reboot/update")
    }
}
