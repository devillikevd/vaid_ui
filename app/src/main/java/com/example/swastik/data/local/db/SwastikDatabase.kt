package com.example.swastik.data.local.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Room Database for offline caching of healthcare data.
 * Caches doctors, appointments, notifications, prescriptions, medicines, and hospitals
 * for offline access and faster loading.
 * v2: Added PendingSyncAction for offline write queue.
 */
@Database(
    entities = [
        CachedDoctor::class,
        CachedAppointment::class,
        CachedNotification::class,
        CachedPrescription::class,
        CachedMedicine::class,
        CachedHospital::class,
        PendingSyncAction::class
    ],
    version = 3,
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

    companion object {
        @Volatile
        private var INSTANCE: SwastikDatabase? = null

        fun getDatabase(context: Context): SwastikDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SwastikDatabase::class.java,
                    "swastik_cache_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
