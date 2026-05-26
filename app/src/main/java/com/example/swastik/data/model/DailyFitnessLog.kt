package com.example.swastik.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate

@Entity(tableName = "daily_fitness_logs")
data class DailyFitnessLog(
    @PrimaryKey val date: String = LocalDate.now().toString(),
    val totalSteps: Int = 0,
    val activeMinutes: Int = 0,
    val distanceMeters: Float = 0f,
    val caloriesBurned: Float = 0f,
    val initialSensorSteps: Int = -1, // Stores the step counter value when tracking first started today
    val lastUpdated: Long = System.currentTimeMillis()
)
