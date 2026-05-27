package com.example.swastik.data.fitness

import com.example.swastik.data.model.DailyFitnessLog

object FitnessStepSanitizer {
    const val MAX_DAILY_STEPS = 70_000
    const val MAX_ACTIVE_MINUTES_PER_DAY = 16 * 60
    private const val MAX_STEPS_PER_MINUTE = 260
    private const val MAX_SINGLE_UPDATE_STEPS = 1_500
    private const val METERS_PER_STEP = 0.762f
    private const val KCAL_PER_STEP = 0.04f

    data class Decision(
        val log: DailyFitnessLog,
        val accepted: Boolean,
        val reason: String? = null
    )

    fun sanitizeStoredLog(log: DailyFitnessLog): DailyFitnessLog {
        val safeSteps = if (log.totalSteps in 0..MAX_DAILY_STEPS) log.totalSteps else 0
        val safeActiveMinutes = log.activeMinutes.coerceIn(0, MAX_ACTIVE_MINUTES_PER_DAY)
        return log.copy(
            totalSteps = safeSteps,
            activeMinutes = safeActiveMinutes,
            distanceMeters = distanceForSteps(safeSteps),
            caloriesBurned = caloriesForSteps(safeSteps)
        )
    }

    fun applySensorReading(
        rawLog: DailyFitnessLog,
        currentSensorSteps: Int,
        nowMs: Long
    ): Decision {
        if (currentSensorSteps < 0) {
            return Decision(sanitizeStoredLog(rawLog), accepted = false, reason = "negative_sensor_value")
        }

        val hasCorruptCounters = rawLog.totalSteps !in 0..MAX_DAILY_STEPS ||
            rawLog.activeMinutes !in 0..MAX_ACTIVE_MINUTES_PER_DAY
        val log = sanitizeStoredLog(rawLog)
        if (hasCorruptCounters) {
            return Decision(
                log.copy(initialSensorSteps = currentSensorSteps, lastUpdated = nowMs),
                accepted = false,
                reason = "corrupt_log_reset"
            )
        }

        val lastSensorSteps = log.initialSensorSteps
        if (lastSensorSteps == -1) {
            return Decision(
                log.copy(initialSensorSteps = currentSensorSteps, lastUpdated = nowMs),
                accepted = false,
                reason = "baseline_set"
            )
        }

        val stepsToAdd = if (currentSensorSteps >= lastSensorSteps) {
            currentSensorSteps - lastSensorSteps
        } else {
            currentSensorSteps
        }

        if (stepsToAdd <= 0) {
            return Decision(log.copy(initialSensorSteps = currentSensorSteps, lastUpdated = nowMs), accepted = false)
        }

        val elapsedMinutes = ((nowMs - log.lastUpdated).coerceAtLeast(0L) / 60_000L).toInt()
        val allowedByElapsedTime = maxOf(
            MAX_SINGLE_UPDATE_STEPS,
            (elapsedMinutes + 1) * MAX_STEPS_PER_MINUTE
        )

        if (stepsToAdd > allowedByElapsedTime || log.totalSteps + stepsToAdd > MAX_DAILY_STEPS) {
            return Decision(
                log.copy(initialSensorSteps = currentSensorSteps, lastUpdated = nowMs),
                accepted = false,
                reason = "unrealistic_step_spike"
            )
        }

        val newTotalSteps = log.totalSteps + stepsToAdd
        return Decision(
            log.copy(
                totalSteps = newTotalSteps,
                initialSensorSteps = currentSensorSteps,
                distanceMeters = distanceForSteps(newTotalSteps),
                caloriesBurned = caloriesForSteps(newTotalSteps),
                lastUpdated = nowMs
            ),
            accepted = true
        )
    }

    fun distanceForSteps(steps: Int): Float = steps * METERS_PER_STEP

    fun caloriesForSteps(steps: Int): Float = steps * KCAL_PER_STEP
}
