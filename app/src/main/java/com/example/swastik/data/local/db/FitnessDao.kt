package com.example.swastik.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.swastik.data.model.DailyFitnessLog
import kotlinx.coroutines.flow.Flow

@Dao
interface FitnessDao {
    @Query("SELECT * FROM daily_fitness_logs WHERE date = :date")
    fun getLogForDate(date: String): Flow<DailyFitnessLog?>

    @Query("SELECT * FROM daily_fitness_logs WHERE date = :date")
    suspend fun getLogForDateSync(date: String): DailyFitnessLog?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertLog(log: DailyFitnessLog): Long

    @Update
    suspend fun updateLog(log: DailyFitnessLog)
}
