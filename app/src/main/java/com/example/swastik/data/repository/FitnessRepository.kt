package com.example.swastik.data.repository

import android.content.Context
import android.util.Log
import com.example.swastik.data.fitness.FitnessStepSanitizer
import com.example.swastik.data.local.db.FitnessDao
import com.example.swastik.data.model.DailyFitnessLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

class FitnessRepository @Inject constructor(
    private val fitnessDao: FitnessDao,
    private val context: Context
) {
    private val scope = CoroutineScope(Dispatchers.IO)

    fun getTodayLog(): Flow<DailyFitnessLog> {
        val today = LocalDate.now().toString()
        // Ensure a log exists for today before returning
        scope.launch {
            if (fitnessDao.getLogForDateSync(today) == null) {
                fitnessDao.insertLog(DailyFitnessLog(date = today))
            }
        }
        return fitnessDao.getLogForDate(today).map {
            FitnessStepSanitizer.sanitizeStoredLog(it ?: DailyFitnessLog(date = today))
        }
    }

    suspend fun getTodayLogSync(): DailyFitnessLog {
        val today = LocalDate.now().toString()
        var log = fitnessDao.getLogForDateSync(today)
        if (log == null) {
            log = DailyFitnessLog(date = today)
            fitnessDao.insertLog(log)
        }
        return log
    }

    suspend fun updateSteps(currentSensorSteps: Int) {
        val log = getTodayLogSync()
        val decision = FitnessStepSanitizer.applySensorReading(
            rawLog = log,
            currentSensorSteps = currentSensorSteps,
            nowMs = System.currentTimeMillis()
        )

        if (decision.log != log) {
            fitnessDao.updateLog(decision.log)
        }

        if (decision.accepted) {
            Log.d("FitnessRepository", "Updated steps. Total: ${decision.log.totalSteps}")
        } else if (decision.reason != null) {
            Log.d("FitnessRepository", "Step update ignored: ${decision.reason}")
        }
    }

    suspend fun addActiveTime(minutes: Int) {
        if (minutes <= 0) return
        val log = getTodayLogSync()
        val sanitizedLog = FitnessStepSanitizer.sanitizeStoredLog(log)
        val safeMinutes = minutes.coerceAtMost(180)
        val newActiveMinutes = (sanitizedLog.activeMinutes + safeMinutes)
            .coerceAtMost(FitnessStepSanitizer.MAX_ACTIVE_MINUTES_PER_DAY)
        fitnessDao.updateLog(
            sanitizedLog.copy(
                activeMinutes = newActiveMinutes,
                lastUpdated = System.currentTimeMillis()
            )
        )
        Log.d("FitnessRepository", "Added $safeMinutes active minutes. Total: $newActiveMinutes")
    }

    suspend fun syncWithBackendData(backendLog: com.example.swastik.data.remote.dto.WearableDailySummaryDto) {
        val today = java.time.LocalDate.now().toString()
        // Ensure we only sync today's log
        if (backendLog.summaryDate != today) return
        
        val localLog = getTodayLogSync()
        // Use the max of local or backend data to prevent losing progress if backend is stale
        val updatedSteps = maxOf(localLog.totalSteps, backendLog.steps?.toInt() ?: 0)
        val updatedCalories = maxOf(localLog.caloriesBurned, backendLog.totalCalories?.toFloat() ?: 0f)
        val updatedActiveMins = maxOf(localLog.activeMinutes, backendLog.activeMinutes?.toInt() ?: 0)
        
        if (updatedSteps > localLog.totalSteps || updatedCalories > localLog.caloriesBurned || updatedActiveMins > localLog.activeMinutes) {
            fitnessDao.updateLog(
                localLog.copy(
                    totalSteps = updatedSteps,
                    caloriesBurned = updatedCalories,
                    activeMinutes = updatedActiveMins,
                    lastUpdated = System.currentTimeMillis()
                )
            )
            Log.d("FitnessRepository", "Synced with backend data: Steps=$updatedSteps")
        }
    }
}
