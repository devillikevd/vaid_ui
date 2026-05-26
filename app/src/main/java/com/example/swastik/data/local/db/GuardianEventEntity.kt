package com.example.swastik.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "guardian_events")
data class GuardianEventEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val eventType: String, // FALL_DETECTED, CANCELLED_BY_USER, SOS_TRIGGERED, GAIT_ANOMALY, HIGH_HR_STILL
    val timestamp: Long,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationContext: String? = null, // e.g., "Industrial Zone", "Home"
    val sensorDataSnippet: String? = null // e.g., JSON string of G-force or gyroscope readings
)
