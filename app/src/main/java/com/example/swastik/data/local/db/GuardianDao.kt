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

    // V2: Gait session persistence for trending
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGaitSession(session: GaitSessionEntity): Long

    @Query("SELECT * FROM gait_sessions WHERE timestamp >= :sinceTimestamp ORDER BY timestamp DESC")
    suspend fun getGaitSessionsSince(sinceTimestamp: Long): List<GaitSessionEntity>

    @Query("SELECT * FROM gait_sessions ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentGaitSessions(limit: Int = 50): List<GaitSessionEntity>

    @Query("SELECT AVG(cadenceSpm) FROM gait_sessions WHERE timestamp >= :sinceTimestamp")
    suspend fun getAverageCadenceSince(sinceTimestamp: Long): Float?

    @Query("SELECT AVG(symmetryPercent) FROM gait_sessions WHERE timestamp >= :sinceTimestamp")
    suspend fun getAverageSymmetrySince(sinceTimestamp: Long): Float?

    @Query("SELECT AVG(walkingSpeedKmh) FROM gait_sessions WHERE timestamp >= :sinceTimestamp AND walkingSpeedKmh IS NOT NULL")
    suspend fun getAverageWalkingSpeedSince(sinceTimestamp: Long): Float?

    @Query("SELECT AVG(strideLengthMeters) FROM gait_sessions WHERE timestamp >= :sinceTimestamp AND strideLengthMeters IS NOT NULL")
    suspend fun getAverageStrideLengthSince(sinceTimestamp: Long): Float?

    @Query("SELECT COUNT(*) FROM gait_sessions WHERE isAnomalous = 1 AND timestamp >= :sinceTimestamp")
    suspend fun countAnomalousSessionsSince(sinceTimestamp: Long): Int
}

