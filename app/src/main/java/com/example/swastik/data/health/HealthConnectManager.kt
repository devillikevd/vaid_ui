package com.example.swastik.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthConnectManager(private val context: Context) {

    val healthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(BodyTemperatureRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class)
    )

    fun checkAvailability(): Int {
        return HealthConnectClient.getSdkStatus(context)
    }

    suspend fun hasPermissions(): Boolean {
        return try {
            val granted = healthConnectClient.permissionController.getGrantedPermissions()
            granted.isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }

    suspend fun hasAllPermissions(): Boolean {
        return try {
            val granted = healthConnectClient.permissionController.getGrantedPermissions()
            granted.containsAll(permissions)
        } catch (e: Exception) {
            false
        }
    }

    suspend fun revokeAllPermissions() {
        try {
            healthConnectClient.permissionController.revokeAllPermissions()
        } catch (e: Exception) {
            // Ignore
        }
    }

    suspend fun fetchVitalsData(days: Long = 1): VitalsData {
        val endTime = Instant.now()
        val startTime = endTime.minus(days, ChronoUnit.DAYS)
        val timeRangeFilter = TimeRangeFilter.between(startTime, endTime)

        // Read Steps grouped by day
        val stepsPoints = try {
            val stepsRequest = androidx.health.connect.client.request.AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = timeRangeFilter,
                timeRangeSlicer = java.time.Period.ofDays(1)
            )
            val stepsResponse = healthConnectClient.aggregateGroupByPeriod(stepsRequest)
            stepsResponse.mapNotNull { group ->
                val total = group.result[StepsRecord.COUNT_TOTAL]
                if (total != null && total in 1..MAX_DAILY_HEALTH_CONNECT_STEPS) {
                    VitalsPoint(total, group.startTime.atZone(java.time.ZoneId.systemDefault()).toInstant())
                } else null
            }
        } catch (e: Exception) { emptyList() }

        // Read Heart Rate (All points in the time range)
        val hrPoints = try {
            val hrRequest = ReadRecordsRequest(
                recordType = HeartRateRecord::class,
                timeRangeFilter = timeRangeFilter
            )
            val hrResponse = healthConnectClient.readRecords(hrRequest)
            hrResponse.records.flatMap { record ->
                record.samples.map { sample -> VitalsPoint(sample.beatsPerMinute, sample.time) }
            }.sortedBy { it.time }
        } catch (e: Exception) { emptyList() }

        // Read Body Temp (All points in the time range)
        val tempPoints = try {
            val tempRequest = ReadRecordsRequest(
                recordType = BodyTemperatureRecord::class,
                timeRangeFilter = timeRangeFilter
            )
            val tempResponse = healthConnectClient.readRecords(tempRequest)
            tempResponse.records.map { VitalsPoint(it.temperature.inCelsius, it.time) }
                .sortedBy { it.time }
        } catch (e: Exception) { emptyList() }

        val distanceMeters = try {
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = timeRangeFilter
                )
            )
            response.records.sumOf { it.distance.inMeters }
        } catch (e: Exception) { 0.0 }

        val activeCalories = try {
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = ActiveCaloriesBurnedRecord::class,
                    timeRangeFilter = timeRangeFilter
                )
            )
            response.records.sumOf { it.energy.inKilocalories }
        } catch (e: Exception) { 0.0 }

        val totalCalories = try {
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = TotalCaloriesBurnedRecord::class,
                    timeRangeFilter = timeRangeFilter
                )
            )
            response.records.sumOf { it.energy.inKilocalories }
        } catch (e: Exception) { 0.0 }

        val exerciseSessions = try {
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = timeRangeFilter
                )
            )
            response.records
        } catch (e: Exception) { emptyList() }

        val exerciseMinutes = exerciseSessions.sumOf {
            ChronoUnit.MINUTES.between(it.startTime, it.endTime).coerceAtLeast(0)
        }

        val sleepMinutes = try {
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = timeRangeFilter
                )
            )
            response.records.sumOf {
                ChronoUnit.MINUTES.between(it.startTime, it.endTime).coerceAtLeast(0)
            }
        } catch (e: Exception) { 0L }

        return VitalsData(
            dailySteps = stepsPoints,
            recentHeartRates = hrPoints,
            recentTemperatures = tempPoints,
            distanceMeters = distanceMeters,
            activeCalories = activeCalories,
            totalCalories = totalCalories,
            activeMinutes = exerciseMinutes,
            exerciseMinutes = exerciseMinutes,
            workoutsCount = exerciseSessions.size,
            sleepMinutes = sleepMinutes
        )
    }

    companion object {
        const val MAX_DAILY_HEALTH_CONNECT_STEPS = 70_000L
    }
}

data class VitalsPoint<T>(
    val value: T,
    val time: Instant
)

data class VitalsData(
    val dailySteps: List<VitalsPoint<Long>>,
    val recentHeartRates: List<VitalsPoint<Long>>,
    val recentTemperatures: List<VitalsPoint<Double>>,
    val distanceMeters: Double = 0.0,
    val activeCalories: Double = 0.0,
    val totalCalories: Double = 0.0,
    val activeMinutes: Long = 0,
    val exerciseMinutes: Long = 0,
    val workoutsCount: Int = 0,
    val sleepMinutes: Long = 0
)
