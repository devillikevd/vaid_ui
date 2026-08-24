package com.example.swastik.data.repository

import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.dto.*
import com.example.swastik.notifications.ReminderAlarmScheduler
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for Vitals & Reminders — record vitals, CRUD reminders.
 */
@Singleton
class VitalsRepository @Inject constructor(
    private val apiService: ApiService,
    private val alarmScheduler: ReminderAlarmScheduler
) {

    // ==================== VITALS ====================

    /**
     * Get patient vitals history.
     */
    suspend fun getVitals(page: Int = 1, limit: Int = 20): Result<List<VitalDto>> {
        return try {
            val response = apiService.getPatientVitals(page, limit)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error("Failed to load vitals")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Record a new vital measurement.
     */
    suspend fun recordVital(request: CreateVitalRequest): Result<VitalDto> {
        return try {
            val response = apiService.recordVital(request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to save vital")
            } else {
                Result.Error(response.body()?.message ?: "Failed to record vital")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // ==================== REMINDERS ====================

    /**
     * Get all reminders, optionally filtered by type.
     */
    suspend fun getReminders(type: String? = null, isActive: Boolean? = null): Result<List<ReminderDto>> {
        return try {
            val response = apiService.getReminders(type, isActive)
            if (response.isSuccessful && response.body()?.success == true) {
                val list = response.body()?.data ?: emptyList()
                // Sync OS alarms for active reminders
                list.filter { !it.isCompleted }.forEach { r ->
                    try {
                        alarmScheduler.schedule(
                            com.example.swastik.data.model.Reminder(
                                id = r.id,
                                title = r.title,
                                type = when (r.type.lowercase()) {
                                    "appointment" -> com.example.swastik.data.model.ReminderType.APPOINTMENT
                                    "test" -> com.example.swastik.data.model.ReminderType.TEST
                                    else -> com.example.swastik.data.model.ReminderType.MEDICINE
                                },
                                time = r.time,
                                days = r.days.orEmpty(),
                                snoozeUntil = r.snoozeUntil,
                                isCompleted = r.isCompleted
                            )
                        )
                    } catch (_: Exception) {}
                }
                Result.Success(list)
            } else {
                Result.Error("Failed to load reminders")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Create a new reminder.
     */
    suspend fun createReminder(request: CreateReminderRequest): Result<ReminderDto> {
        return try {
            val response = apiService.createReminder(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val reminderDto = response.body()?.data
                if (reminderDto != null) {
                    try {
                        alarmScheduler.schedule(
                            com.example.swastik.data.model.Reminder(
                                id = reminderDto.id,
                                title = reminderDto.title,
                                type = when (reminderDto.type.lowercase()) {
                                    "appointment" -> com.example.swastik.data.model.ReminderType.APPOINTMENT
                                    "test" -> com.example.swastik.data.model.ReminderType.TEST
                                    else -> com.example.swastik.data.model.ReminderType.MEDICINE
                                },
                                time = reminderDto.time,
                                days = reminderDto.days.orEmpty(),
                                snoozeUntil = reminderDto.snoozeUntil,
                                isCompleted = reminderDto.isCompleted
                            )
                        )
                    } catch (_: Exception) {}
                    Result.Success(reminderDto)
                } else {
                    Result.Error("Failed to create reminder")
                }
            } else {
                Result.Error(response.body()?.message ?: "Failed to create reminder")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Persist a reminder adherence action.
     */
    suspend fun actOnReminder(
        id: String,
        action: String,
        scheduledAt: String,
        snoozeMinutes: Int? = null
    ): Result<ReminderActionResultDto> {
        return try {
            val response = apiService.actOnReminder(
                id = id,
                request = ReminderActionRequest(
                    action = action,
                    snoozeMinutes = snoozeMinutes,
                    scheduledAt = scheduledAt
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to save reminder action")
            } else {
                Result.Error(response.body()?.message ?: "Failed to save reminder action")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Update an existing reminder.
     */
    suspend fun updateReminder(id: String, request: UpdateReminderRequest): Result<ReminderDto> {
        return try {
            val response = apiService.updateReminder(id, request)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let {
                    Result.Success(it)
                } ?: Result.Error("Failed to update reminder")
            } else {
                Result.Error(response.body()?.message ?: "Failed to update reminder")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Delete a reminder.
     */
    suspend fun deleteReminder(id: String): Result<Unit> {
        return try {
            val response = apiService.deleteReminder(id)
            if (response.isSuccessful && response.body()?.success == true) {
                alarmScheduler.cancelById(id)
                Result.Success(Unit)
            } else {
                Result.Error(response.body()?.message ?: "Failed to delete reminder")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }
}
