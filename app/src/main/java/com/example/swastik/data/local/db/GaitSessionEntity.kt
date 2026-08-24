package com.example.swastik.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Stores per-session gait analysis metrics for multi-day trending.
 * Each record represents one walking/running analysis window.
 */
@Entity(tableName = "gait_sessions")
data class GaitSessionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: Long,
    val durationSec: Float,
    
    // Core gait metrics
    val cadenceSpm: Int,           // Steps per minute
    val symmetryPercent: Int,      // 0-100 (100 = perfect symmetry)
    val lateralAsymmetry: Float,   // 0.0-1.0
    val accelerationVariability: Float,
    val sampleCount: Int,
    
    // V2: Stride & walking speed
    val strideLengthMeters: Float? = null,     // GPS distance / step count
    val walkingSpeedKmh: Float? = null,        // Average walking speed
    
    // V2: Fatigue scoring
    val fatigueScore: Float? = null,           // 0.0-1.0 (1.0 = very fatigued)
    val variabilityTrend: Float? = null,       // Positive = getting worse over walk
    
    // V2: Turn stability
    val turnCount: Int = 0,
    val turnInstabilityScore: Float? = null,   // Average lateral spike during turns
    
    // Context
    val activityType: Int = 0,                 // DetectedActivity type
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isAnomalous: Boolean = false           // True if thresholds exceeded
)
