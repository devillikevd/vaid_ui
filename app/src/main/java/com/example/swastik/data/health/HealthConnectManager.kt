package com.example.swastik.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthConnectManager(private val context: Context) {

    val healthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(BodyTemperatureRecord::class)
    )

    fun checkAvailability(): Int {
        return HealthConnectClient.getSdkStatus(context)
    }

    suspend fun hasAllPermissions(): Boolean {
        return try {
            val granted = healthConnectClient.permissionController.getGrantedPermissions()
            granted.containsAll(permissions)
        } catch (e: Exception) {
            false
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

        return VitalsData(
            dailySteps = stepsPoints,
            recentHeartRates = hrPoints,
            recentTemperatures = tempPoints
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
    val recentTemperatures: List<VitalsPoint<Double>>
)
