package com.example.swastik.data.local

import com.google.android.gms.location.DetectedActivity

data class GuardianTelemetry(
    val speedKmh: Float = 0f,
    val activityType: Int = DetectedActivity.UNKNOWN,
    val isUpright: Boolean = true,
    val isMonitoringActive: Boolean = false
) {
    fun getActivityName(): String {
        return when (activityType) {
            DetectedActivity.IN_VEHICLE -> "In Vehicle"
            DetectedActivity.ON_BICYCLE -> "On Bicycle"
            DetectedActivity.ON_FOOT -> "On Foot"
            DetectedActivity.RUNNING -> "Running"
            DetectedActivity.STILL -> "Still"
            DetectedActivity.TILTING -> "Tilting"
            DetectedActivity.WALKING -> "Walking"
            else -> "Unknown"
        }
    }
}
