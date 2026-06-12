package com.example.swastik.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ai_scans")
data class AIScanEntity(
    @PrimaryKey
    val id: String,
    val modelType: String,
    val imageLocalPath: String,
    val predictionResult: String,
    val confidence: Float,
    val timestamp: Long,
    val isSharedWithDoctor: Boolean = false,
    val uploadedUrl: String? = null
)
