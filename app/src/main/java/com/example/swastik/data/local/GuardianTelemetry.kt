package com.example.swastik.data.local

import com.google.android.gms.location.DetectedActivity

data class GuardianTelemetry(
    val speedKmh: Float = 0f,
    val activityType: Int = DetectedActivity.UNKNOWN,
    val isUpright: Boolean = true,
    val isMonitoringActive: Boolean = false,
    val currentGForce: Float = 1.0f,
    val angularVelocityDps: Float = 0f,
    val currentCadenceSpm: Int = 0,
    val currentStepCount: Int = 0,
    val pressureHpa: Float = 1013.25f,
    val ambientLightLux: Float = 0f,
    val isProximityNear: Boolean = false,
    val lastDecelerationMps2: Float = 0f,
    val isConsultationPaused: Boolean = false,
    val lastEventSnippet: String? = null,
    val pitchDegrees: Float = 0f,
    val rollDegrees: Float = 0f,
    val wearableHeartRateBpm: Long? = null,
    val wearableSteps: Long? = null,
    val isPowerSaverMode: Boolean = false,
    val batteryLevelPercent: Int = 100,
    val isHealthConnectConnected: Boolean = true,
    val sensorCapabilityLevel: String = "FULL",  // FULL, STANDARD, BASIC
    val locationAgeSec: Long = 0L,
    val locationAccuracyM: Float = 0f,
    val isSensorThrottled: Boolean = false,
    val isExtremeActivityDetected: Boolean = false
) {
    fun getActivityName(): String {
        return when (activityType) {
            DetectedActivity.IN_VEHICLE -> "In Vehicle 🚗"
            DetectedActivity.ON_BICYCLE -> "On Bicycle 🚲"
            DetectedActivity.ON_FOOT -> "On Foot 🚶"
            DetectedActivity.RUNNING -> "Running 🏃"
            DetectedActivity.STILL -> "Still 🛑"
            DetectedActivity.TILTING -> "Tilting 📐"
            DetectedActivity.WALKING -> "Walking 🚶"
            else -> "Detecting..."
        }
    }
}
