package com.example.swastik.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface GuardianDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: GuardianEventEntity): Long

    @Query("SELECT * FROM guardian_events ORDER BY timestamp DESC")
    fun getAllEvents(): Flow<List<GuardianEventEntity>>

    @Query("SELECT * FROM guardian_events WHERE timestamp >= :sinceTimestamp ORDER BY timestamp DESC")
    suspend fun getEventsSince(sinceTimestamp: Long): List<GuardianEventEntity>

    @Query("SELECT COUNT(*) FROM guardian_events WHERE eventType = :eventType AND timestamp >= :sinceTimestamp")
    suspend fun countEventsByTypeSince(eventType: String, sinceTimestamp: Long): Int

    @Query("DELETE FROM guardian_events")
    suspend fun clearAllEvents()
}
