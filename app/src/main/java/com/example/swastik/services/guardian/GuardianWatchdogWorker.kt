package com.example.swastik.services.guardian

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.swastik.data.local.AppSettingsStore
import java.util.concurrent.TimeUnit

/**
 * WorkManager-based watchdog that ensures GuardianService stays alive.
 * 
 * OEM battery optimizations (Xiaomi MIUI, Oppo ColorOS, Samsung OneUI) can kill
 * foreground services after 10-30 minutes of screen-off time, even with START_STICKY.
 * 
 * This worker runs every 15 minutes (WorkManager's minimum periodic interval) and
 * checks if GuardianService is running. If it's dead but the user has Guardian enabled,
 * it restarts the service.
 * 
 * WorkManager is more resilient than AlarmManager because it uses JobScheduler internally,
 * which OEMs are less aggressive about killing.
 */
class GuardianWatchdogWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "GuardianWatchdog"
        private const val WORK_NAME = "guardian_watchdog"

        /**
         * Schedule the periodic watchdog. Uses KEEP policy so duplicate scheduling is idempotent.
         */
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<GuardianWatchdogWorker>(
                15, TimeUnit.MINUTES  // Minimum WorkManager periodic interval
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.d(TAG, "Watchdog scheduled (15-minute periodic check)")
        }

        /**
         * Cancel the watchdog when Guardian is disabled.
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Watchdog cancelled")
        }
    }

    override suspend fun doWork(): Result {
        val settings = AppSettingsStore.settings.value

        // Only restart if user has explicitly enabled Guardian with consent
        if (!settings.guardianEnabled || !settings.guardianConsentAccepted) {
            Log.d(TAG, "Guardian disabled or no consent — watchdog skipping")
            return Result.success()
        }

        if (!settings.guardianFeatures.hasAnyMonitoringFeature()) {
            Log.d(TAG, "No monitoring features enabled — watchdog skipping")
            return Result.success()
        }

        if (!isGuardianServiceRunning()) {
            Log.w(TAG, "⚠️ GuardianService is NOT running! Restarting...")
            try {
                val intent = Intent(applicationContext, GuardianService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    applicationContext.startForegroundService(intent)
                } else {
                    applicationContext.startService(intent)
                }
                Log.d(TAG, "GuardianService restart initiated by watchdog")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restart GuardianService: ${e.message}")
                return Result.retry()
            }
        } else {
            Log.d(TAG, "GuardianService is alive ✓")
        }

        return Result.success()
    }

    @Suppress("DEPRECATION")
    private fun isGuardianServiceRunning(): Boolean {
        val manager = applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        
        // Check running services (limited to own process on Android 8+)
        for (service in manager.getRunningServices(50)) {
            if (service.service.className == GuardianService::class.java.name) {
                return true
            }
        }
        return false
    }
}
