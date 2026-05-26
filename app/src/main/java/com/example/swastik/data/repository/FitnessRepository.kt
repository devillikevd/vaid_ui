package com.example.swastik.data.repository

import android.content.Context
import android.util.Log
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
        return fitnessDao.getLogForDate(today).map { it ?: DailyFitnessLog(date = today) }
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
        
        val lastSensorSteps = log.initialSensorSteps
        if (lastSensorSteps == -1) {
            // First time tracking today, just record the baseline
            fitnessDao.updateLog(log.copy(initialSensorSteps = currentSensorSteps))
            Log.d("FitnessRepository", "Setting baseline steps for today to: $currentSensorSteps")
            return
        }

        // Calculate steps taken since last update
        val stepsToAdd = if (currentSensorSteps >= lastSensorSteps) {
            currentSensorSteps - lastSensorSteps
        } else {
            // The device was rebooted, so the sensor reset to 0
            currentSensorSteps
        }

        // Only update if steps increased
        if (stepsToAdd > 0) {
            val newTotalSteps = log.totalSteps + stepsToAdd
            // Simple calculations for distance and calories
            // Avg stride length = ~0.762 meters
            // Calories = roughly 0.04 kcal per step
            val distance = newTotalSteps * 0.762f
            val calories = newTotalSteps * 0.04f

            fitnessDao.updateLog(
                log.copy(
                    totalSteps = newTotalSteps,
                    initialSensorSteps = currentSensorSteps, // Treat it as last known sensor steps
                    distanceMeters = distance,
                    caloriesBurned = calories,
                    lastUpdated = System.currentTimeMillis()
                )
            )
            Log.d("FitnessRepository", "Added $stepsToAdd steps. Total: $newTotalSteps")
        }
    }

    suspend fun addActiveTime(minutes: Int) {
        if (minutes <= 0) return
        val log = getTodayLogSync()
        fitnessDao.updateLog(
            log.copy(
                activeMinutes = log.activeMinutes + minutes,
                lastUpdated = System.currentTimeMillis()
            )
        )
        Log.d("FitnessRepository", "Added $minutes active minutes. Total: ${log.activeMinutes + minutes}")
    }
}
