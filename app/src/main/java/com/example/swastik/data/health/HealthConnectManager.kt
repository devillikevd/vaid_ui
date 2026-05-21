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

    suspend fun fetchVitalsData(days: Long = 7): VitalsData {
        val endTime = Instant.now()
        val startTime = endTime.minus(days, ChronoUnit.DAYS)
        val timeRangeFilter = TimeRangeFilter.between(startTime, endTime)

        // Read Steps
        val totalSteps = try {
            val stepsRequest = ReadRecordsRequest(
                recordType = StepsRecord::class,
                timeRangeFilter = timeRangeFilter
            )
            val stepsResponse = healthConnectClient.readRecords(stepsRequest)
            stepsResponse.records.sumOf { it.count }
        } catch (e: Exception) { 0L }

        // Read Heart Rate
        val hrPoints = try {
            val hrRequest = ReadRecordsRequest(
                recordType = HeartRateRecord::class,
                timeRangeFilter = timeRangeFilter
            )
            val hrResponse = healthConnectClient.readRecords(hrRequest)
            hrResponse.records.flatMap { record ->
                record.samples.map { sample -> sample.beatsPerMinute }
            }.takeLast(10) // taking last 10 points for the chart
        } catch (e: Exception) { emptyList() }

        // Read Body Temp
        val tempPoints = try {
            val tempRequest = ReadRecordsRequest(
                recordType = BodyTemperatureRecord::class,
                timeRangeFilter = timeRangeFilter
            )
            val tempResponse = healthConnectClient.readRecords(tempRequest)
            tempResponse.records.map { it.temperature.inCelsius }.takeLast(10)
        } catch (e: Exception) { emptyList() }

        return VitalsData(
            totalSteps = totalSteps,
            recentHeartRates = hrPoints,
            recentTemperatures = tempPoints
        )
    }
}

data class VitalsData(
    val totalSteps: Long,
    val recentHeartRates: List<Long>,
    val recentTemperatures: List<Double>
)
