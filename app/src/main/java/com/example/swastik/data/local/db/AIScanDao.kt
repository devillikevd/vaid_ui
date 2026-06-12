package com.example.swastik.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface AIScanDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(scan: AIScanEntity)

    @Query("SELECT * FROM ai_scans ORDER BY timestamp DESC")
    fun getAllScans(): Flow<List<AIScanEntity>>

    @Query("SELECT * FROM ai_scans WHERE modelType = :modelType ORDER BY timestamp DESC")
    fun getScansByType(modelType: String): Flow<List<AIScanEntity>>

    @Query("SELECT * FROM ai_scans WHERE id = :scanId LIMIT 1")
    suspend fun getScanById(scanId: String): AIScanEntity?

    @Query("UPDATE ai_scans SET isSharedWithDoctor = :isShared, uploadedUrl = :url WHERE id = :scanId")
    suspend fun updateShareStatus(scanId: String, isShared: Boolean, url: String)

    @Query("DELETE FROM ai_scans")
    suspend fun clearAll()
}
