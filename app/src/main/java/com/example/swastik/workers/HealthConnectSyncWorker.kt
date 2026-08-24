package com.example.swastik.workers

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.swastik.data.health.HealthConnectManager
import com.example.swastik.data.remote.dto.WearableSummaryRequest
import com.example.swastik.data.repository.PatientRepository
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import java.time.LocalDate
import java.util.concurrent.TimeUnit

/**
 * Background WorkManager worker that periodically syncs smartwatch/wearable
 * data (Sleep, Heart Rate, Steps, Calories) from Android Health Connect to Swastik backend.
 */
class HealthConnectSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface HealthConnectSyncWorkerEntryPoint {
        fun patientRepository(): PatientRepository
    }

    override suspend fun doWork(): androidx.work.ListenableWorker.Result {
        return try {
            val hiltEntryPoint = EntryPointAccessors.fromApplication(
                applicationContext,
                HealthConnectSyncWorkerEntryPoint::class.java
            )
            val patientRepository = hiltEntryPoint.patientRepository()
            val healthConnectManager = HealthConnectManager(applicationContext)

            if (!healthConnectManager.hasPermissions()) {
                Log.d(TAG, "Health Connect permissions not granted. Skipping background sync.")
                return androidx.work.ListenableWorker.Result.success()
            }

            val vitals = healthConnectManager.fetchVitalsData()
            val steps = vitals.dailySteps.sumOf { it.value }
                .coerceAtMost(HealthConnectManager.MAX_DAILY_HEALTH_CONNECT_STEPS)
            val heartRates = vitals.recentHeartRates.map { it.value }

            val hasWearableSummary = steps > 0 ||
                vitals.distanceMeters > 0.0 ||
                vitals.activeCalories > 0.0 ||
                vitals.totalCalories > 0.0 ||
                vitals.activeMinutes > 0 ||
                vitals.exerciseMinutes > 0 ||
                vitals.workoutsCount > 0 ||
                vitals.sleepMinutes > 0 ||
                heartRates.isNotEmpty()

            if (hasWearableSummary) {
                val wellnessSummary = WearableSummaryRequest(
                    summaryDate = LocalDate.now().toString(),
                    steps = steps,
                    distanceMeters = vitals.distanceMeters,
                    activeCalories = vitals.activeCalories,
                    totalCalories = vitals.totalCalories,
                    activeMinutes = vitals.activeMinutes,
                    exerciseMinutes = vitals.exerciseMinutes,
                    workoutsCount = vitals.workoutsCount,
                    heartRateAvg = heartRates.takeIf { it.isNotEmpty() }?.average(),
                    heartRateMin = heartRates.minOrNull(),
                    heartRateMax = heartRates.maxOrNull(),
                    sleepMinutes = vitals.sleepMinutes.takeIf { it > 0 },
                    metadata = mapOf("source_app" to "android_background_worker")
                )
                patientRepository.syncWearableSummary(wellnessSummary)
                Log.d(TAG, "Background Health Connect sync succeeded: $steps steps, ${vitals.sleepMinutes} min sleep")
            }

            androidx.work.ListenableWorker.Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Background Health Connect sync failed: ${e.message}", e)
            androidx.work.ListenableWorker.Result.retry()
        }
    }

    companion object {
        private const val TAG = "HealthConnectSyncWorker"
        const val WORK_NAME = "periodic_health_connect_sync"

        /**
         * Schedules the periodic background sync to run every 6 hours
         * whenever connected to any working network.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<HealthConnectSyncWorker>(
                6, TimeUnit.HOURS,
                15, TimeUnit.MINUTES // Flex interval
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
            Log.d(TAG, "Scheduled periodic background Health Connect sync (every 6 hours).")
        }
    }
}
