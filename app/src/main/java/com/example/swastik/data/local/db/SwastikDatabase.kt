package com.example.swastik.data.local.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Room Database for offline caching of healthcare data.
 * Caches doctors, appointments, notifications, prescriptions, medicines, and hospitals
 * for offline access and faster loading.
 * v2: Added PendingSyncAction for offline write queue.
 * v3: Added CachedHospital entity.
 */
@Database(
    entities = [
        CachedDoctor::class,
        CachedAppointment::class,
        CachedNotification::class,
        CachedPrescription::class,
        CachedMedicine::class,
        CachedHospital::class,
        PendingSyncAction::class,
        com.example.swastik.data.model.DailyFitnessLog::class,
        GuardianEventEntity::class
    ],
    version = 7,
    exportSchema = false
)
abstract class SwastikDatabase : RoomDatabase() {

    abstract fun doctorDao(): DoctorDao
    abstract fun appointmentDao(): AppointmentDao
    abstract fun notificationDao(): NotificationDao
    abstract fun prescriptionDao(): PrescriptionDao
    abstract fun medicineDao(): MedicineDao
    abstract fun hospitalDao(): HospitalDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun fitnessDao(): FitnessDao
    abstract fun guardianDao(): GuardianDao

    companion object {
        @Volatile
        private var INSTANCE: SwastikDatabase? = null

        /**
         * Migration from v1 to v2: adds pending_sync_actions table.
         * Fix #5: This was missing, causing crashes for users upgrading from v1.
         */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `pending_sync_actions` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `action` TEXT NOT NULL,
                        `endpoint` TEXT NOT NULL,
                        `payload` TEXT NOT NULL,
                        `createdAt` INTEGER NOT NULL DEFAULT 0,
                        `retryCount` INTEGER NOT NULL DEFAULT 0,
                        `status` TEXT NOT NULL DEFAULT 'pending'
                    )
                """.trimIndent())
            }
        }

        /**
         * Migration from v2 to v3: adds cached_hospitals table.
         * Uses addMigrations() instead of fallbackToDestructiveMigration()
         * to preserve the offline sync queue (PendingSyncAction) across upgrades.
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `cached_hospitals` (
                        `id` TEXT NOT NULL PRIMARY KEY,
                        `name` TEXT NOT NULL,
                        `address` TEXT NOT NULL,
                        `phone` TEXT,
                        `imageUrl` TEXT,
                        `latitude` REAL,
                        `longitude` REAL,
                        `emergencyServices` INTEGER,
                        `ambulanceService` INTEGER,
                        `rating` REAL NOT NULL DEFAULT 0,
                        `reviewCount` INTEGER NOT NULL DEFAULT 0,
                        `specializations` TEXT,
                        `hospitalType` TEXT,
                        `cachedAt` INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `cached_notifications` ADD COLUMN `actionLabel` TEXT")
                db.execSQL("ALTER TABLE `cached_notifications` ADD COLUMN `actionRoute` TEXT")
            }
        }

        /**
         * Migration from v4 to v5: adds daily_fitness_logs table.
         */
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `daily_fitness_logs` (
                        `date` TEXT NOT NULL PRIMARY KEY,
                        `totalSteps` INTEGER NOT NULL DEFAULT 0,
                        `activeMinutes` INTEGER NOT NULL DEFAULT 0,
                        `distanceMeters` REAL NOT NULL DEFAULT 0.0,
                        `caloriesBurned` REAL NOT NULL DEFAULT 0.0,
                        `initialSensorSteps` INTEGER NOT NULL DEFAULT -1,
                        `lastUpdated` INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `guardian_events` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `eventType` TEXT NOT NULL,
                        `timestamp` INTEGER NOT NULL,
                        `latitude` REAL,
                        `longitude` REAL,
                        `locationContext` TEXT,
                        `sensorDataSnippet` TEXT
                    )
                """.trimIndent())
            }
        }

        fun getDatabase(context: Context): SwastikDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SwastikDatabase::class.java,
                    "swastik_cache_db"
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
