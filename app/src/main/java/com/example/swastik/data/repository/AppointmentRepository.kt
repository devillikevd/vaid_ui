package com.example.swastik.data.repository

import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.*
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.local.db.AppointmentDao
import com.example.swastik.data.local.db.CachedAppointment
import com.example.swastik.data.local.db.PendingSyncAction
import com.example.swastik.data.local.db.SyncQueueDao
import com.example.swastik.utils.NetworkObserver
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import okhttp3.ResponseBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Appointment Repository - handles appointment operations with Room caching
 * and offline write queue.
 * - getAppointments: network-first with cache fallback on network failure
 * - Write operations: network first, queue to SyncQueue on network failure
 */
@Singleton
class AppointmentRepository @Inject constructor(
    private val apiService: ApiService,
    private val socketManager: SocketManager,
    private val appointmentDao: AppointmentDao,
    private val syncQueueDao: SyncQueueDao,
    private val networkObserver: NetworkObserver
) {
    
    companion object {
        private const val TAG = "AppointmentRepository"
    }

    private val gson = Gson()

    private fun parseApiErrorMessage(errorBody: ResponseBody?): String? {
        return try {
            val raw = errorBody?.string()?.trim().orEmpty()
            if (raw.isBlank()) return null
            val json = JSONObject(raw)
            json.optString("message").ifBlank { null }
                ?: json.optString("error").ifBlank { null }
        } catch (_: Exception) {
            null
        }
    }
    
    /**
     * Get all appointments with optional filters.
     * Network-first: fetch from API, cache locally, fallback to cache on failure.
     */
    suspend fun getAppointments(
        status: String? = null,
        upcoming: Boolean? = null,
        page: Int = 1
    ): Result<List<Appointment>> {
        // Try network first
        try {
            val queryStatus = status
            val response = apiService.getPatientAppointments(status = queryStatus, page = page)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val appointments = response.body()?.data ?: emptyList()
                // Cache appointments
                try {
                    val cached = appointments.map { it.toCachedAppointment() }
                    appointmentDao.clearAll()
                    appointmentDao.insertAppointments(cached)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to cache appointments: ${e.message}")
                }
                return Result.Success(appointments)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network error, falling back to cache: ${e.message}")
        }

        // Fallback to cache
        return try {
            val cached = if (upcoming == true) {
                appointmentDao.getUpcomingAppointmentsSync()
            } else {
                appointmentDao.getAllAppointmentsSync()
            }
            if (cached.isNotEmpty()) {
                val activeStatuses = setOf("scheduled", "confirmed", "in_progress")
                val appointments = cached
                    .let { list ->
                        when (status) {
                            "active", "upcoming" -> list.filter { it.status.lowercase() in activeStatuses }
                            null -> list
                            else -> list.filter { it.status == status }
                        }
                    }
                    .map { it.toDomainAppointment() }
                Result.Success(appointments)
            } else {
                Result.Error("No internet connection and no cached appointments")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cache fallback also failed: ${e.message}")
            Result.Error("Failed to load appointments")
        }
    }
    
    /**
     * Get time slots for a doctor
     */
    suspend fun getDoctorTimeSlots(doctorId: String, date: String, type: String? = null): Result<List<TimeSlot>> {
        return try {
            val response = apiService.getDoctorSlots(doctorId, date, type)
            if (response.isSuccessful && response.body()?.success == true) {
                val slots = response.body()?.data?.slots ?: emptyList()
                Result.Success(slots)
            } else {
                Result.Error(response.body()?.message ?: "Failed to load time slots")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Create a new appointment — queues offline if no network.
     */
    suspend fun createAppointment(
        doctorId: String, 
        date: String, 
        timeSlot: String, 
        type: String, 
        notes: String?,
        hospitalId: String?,
        clinicId: String?,
        reason: String? = null,
        symptoms: List<String>? = null,
        patientNotes: String? = null,
        severity: String? = null,
        onsetType: String? = null,
        symptomDuration: String? = null,
        symptomPattern: String? = null,
        severityCurrent: Int? = null,
        severityWorst: Int? = null,
        knownAllergies: List<String>? = null,
        currentMedications: String? = null,
        medicalHistory: String? = null,
        voiceNoteUrl: String? = null,
        supportingDocuments: List<String>? = null,
        reasonForVisit: String? = null
    ): Result<Appointment> {
        val request = CreateAppointmentRequest(
            doctorId = doctorId,
            date = date,
            timeSlot = timeSlot,
            type = type,
            notes = notes,
            hospitalId = hospitalId,
            clinicId = clinicId,
            reason = reason,
            symptoms = symptoms,
            patientNotes = patientNotes,
            severity = severity,
            onsetType = onsetType,
            symptomDuration = symptomDuration,
            symptomPattern = symptomPattern,
            severityCurrent = severityCurrent,
            severityWorst = severityWorst,
            knownAllergies = knownAllergies,
            currentMedications = currentMedications,
            medicalHistory = medicalHistory,
            voiceNoteUrl = voiceNoteUrl,
            supportingDocuments = supportingDocuments,
            reasonForVisit = reasonForVisit
        )

        // If no network, queue for later sync
        if (!networkObserver.isConnected) {
            return try {
                syncQueueDao.enqueue(
                    PendingSyncAction(
                        actionType = "book_appointment",
                        payload = gson.toJson(request)
                    )
                )
                Log.d(TAG, "Appointment queued for offline sync")
                Result.Error("No internet — appointment will be booked when you're back online")
            } catch (e: Exception) {
                Result.Error("Failed to queue appointment: ${e.message}")
            }
        }

        return try {
            val response = apiService.bookAppointment(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val appointment = response.body()?.data
                if (appointment != null) {
                    // Invalidate cache so next fetch gets fresh data
                    try { appointmentDao.clearAll() } catch (_: Exception) {}
                    Result.Success(appointment)
                } else {
                    Result.Error("Failed to parse appointment data")
                }
            } else {
                val backendMessage = parseApiErrorMessage(response.errorBody())
                Result.Error(backendMessage ?: response.body()?.message ?: "Failed to book appointment")
            }
        } catch (e: Exception) {
            // Network error during call — queue for sync
            try {
                syncQueueDao.enqueue(
                    PendingSyncAction(
                        actionType = "book_appointment",
                        payload = gson.toJson(request)
                    )
                )
                Result.Error("Connection lost — appointment will be booked when you're back online")
            } catch (qe: Exception) {
                Result.Error(e.message ?: "Network error")
            }
        }
    }

    /**
     * Cancel an appointment — queues offline if no network.
     */
    suspend fun cancelAppointment(appointmentId: String, reason: String?): Result<Appointment> {
        val cancelReason = reason ?: "Cancelled by user"

        // If no network, queue for later sync
        if (!networkObserver.isConnected) {
            return try {
                val payload = gson.toJson(mapOf("appointmentId" to appointmentId, "reason" to cancelReason))
                syncQueueDao.enqueue(
                    PendingSyncAction(
                        actionType = "cancel_appointment",
                        payload = payload
                    )
                )
                Log.d(TAG, "Cancellation queued for offline sync")
                Result.Error("No internet — cancellation will be processed when you're back online")
            } catch (e: Exception) {
                Result.Error("Failed to queue cancellation: ${e.message}")
            }
        }

        return try {
            val request = CancelRequest(reason = cancelReason)
            val response = apiService.cancelAppointment(appointmentId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                 val appointment = response.body()?.data
                if (appointment != null) {
                    try { appointmentDao.clearAll() } catch (_: Exception) {}
                    Result.Success(appointment)
                } else {
                    Result.Error("Failed to parse appointment data")
                }
            } else {
                Result.Error(response.body()?.message ?: "Failed to cancel appointment")
            }
        } catch (e: Exception) {
            // Network error — queue for sync
            try {
                val payload = gson.toJson(mapOf("appointmentId" to appointmentId, "reason" to cancelReason))
                syncQueueDao.enqueue(
                    PendingSyncAction(actionType = "cancel_appointment", payload = payload)
                )
                Result.Error("Connection lost — cancellation will be processed when you're back online")
            } catch (qe: Exception) {
                Result.Error(e.message ?: "Network error")
            }
        }
    }

    /**
     * Reschedule an appointment — queues offline if no network.
     */
    suspend fun rescheduleAppointment(
        appointmentId: String,
        date: String,
        timeSlot: String,
        reason: String? = null
    ): Result<Appointment> {
        // If no network, queue for later sync
        if (!networkObserver.isConnected) {
            return try {
                val payload = gson.toJson(
                    mapOf(
                        "appointmentId" to appointmentId,
                        "date" to date,
                        "timeSlot" to timeSlot,
                        "reason" to (reason ?: "")
                    )
                )
                syncQueueDao.enqueue(
                    PendingSyncAction(actionType = "reschedule_appointment", payload = payload)
                )
                Log.d(TAG, "Reschedule queued for offline sync")
                Result.Error("No internet — reschedule will be processed when you're back online")
            } catch (e: Exception) {
                Result.Error("Failed to queue reschedule: ${e.message}")
            }
        }

        return try {
            val request = RescheduleRequest(date = date, timeSlot = timeSlot, reason = reason)
            val response = apiService.rescheduleAppointment(appointmentId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                val appointment = response.body()?.data
                if (appointment != null) {
                    try { appointmentDao.clearAll() } catch (_: Exception) {}
                    Result.Success(appointment)
                } else {
                    Result.Error("Failed to parse appointment data")
                }
            } else {
                Result.Error(response.body()?.message ?: "Failed to reschedule appointment")
            }
        } catch (e: Exception) {
            // Network error — queue for sync
            try {
                val payload = gson.toJson(
                    mapOf("appointmentId" to appointmentId, "date" to date, "timeSlot" to timeSlot, "reason" to (reason ?: ""))
                )
                syncQueueDao.enqueue(
                    PendingSyncAction(actionType = "reschedule_appointment", payload = payload)
                )
                Result.Error("Connection lost — reschedule will be processed when you're back online")
            } catch (qe: Exception) {
                Result.Error(e.message ?: "Network error")
            }
        }
    }

    /**
     * Get single appointment details
     * GET /api/appointments/:id
     */
    suspend fun getAppointmentDetails(appointmentId: String): Result<Appointment> {
        return try {
            val response = apiService.getAppointmentDetails(appointmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                val appointment = response.body()?.data
                if (appointment != null) {
                    Result.Success(appointment)
                } else {
                    Result.Error("Appointment not found")
                }
            } else {
                Result.Error(response.body()?.message ?: "Failed to load appointment")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getMedicalRecordAccess(appointmentId: String): Result<MedicalRecordAccessDto> {
        return try {
            val response = apiService.getMedicalRecordAccess(appointmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { Result.Success(it) }
                    ?: Result.Error("Failed to load medical record access")
            } else {
                Result.Error(response.body()?.message ?: parseApiErrorMessage(response.errorBody()) ?: "Failed to load medical record access")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun grantMedicalRecordAccess(appointmentId: String, guardianAnalytics: String? = null): Result<MedicalRecordAccessDto> {
        return try {
            val requestMap = if (guardianAnalytics != null) mapOf("guardianAnalytics" to guardianAnalytics) else emptyMap()
            val response = apiService.grantMedicalRecordAccess(appointmentId, requestMap)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { Result.Success(it) }
                    ?: Result.Error("Failed to share medical records")
            } else {
                Result.Error(response.body()?.message ?: parseApiErrorMessage(response.errorBody()) ?: "Failed to share medical records")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun revokeMedicalRecordAccess(appointmentId: String): Result<MedicalRecordAccessDto> {
        return try {
            val response = apiService.revokeMedicalRecordAccess(appointmentId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { Result.Success(it) }
                    ?: Result.Error("Failed to revoke medical record access")
            } else {
                Result.Error(response.body()?.message ?: parseApiErrorMessage(response.errorBody()) ?: "Failed to revoke medical record access")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Join a video consultation
     * Returns a token or room ID for the video call
     */
    // Expose flows
    val signalingEvents = socketManager.signalingEvents
    val chatMessages = socketManager.chatMessages

    fun joinVideoRoom(roomId: String) = socketManager.joinVideoRoom(roomId)
    fun sendOffer(roomId: String, sdp: String, type: String) = socketManager.sendOffer(roomId, sdp, type)
    fun sendAnswer(roomId: String, sdp: String, type: String) = socketManager.sendAnswer(roomId, sdp, type)
    fun sendIceCandidate(roomId: String, sdpMid: String, sdpMLineIndex: Int, candidate: String) = socketManager.sendIceCandidate(roomId, sdpMid, sdpMLineIndex, candidate)
    fun sendChatMessage(consultationId: String, message: String) = socketManager.sendChatMessage(consultationId, message)
    fun joinChat(consultationId: String) = socketManager.joinChat(consultationId)

    /**
     * Join a video consultation
     * 1. Calls backend POST /consultations/:appointmentId/join to register participation
     * 2. Connects socket
     * Returns the consultation session info
     */
    suspend fun joinVideoConsultation(appointmentId: String): Result<VideoCallSession> {
        return try {
            // 1. Call the backend REST API to formally join the consultation
            val joinResponse = apiService.joinConsultation(appointmentId)
            val consultationId: String

            if (joinResponse.isSuccessful && joinResponse.body()?.success == true) {
                val consultation = joinResponse.body()?.data
                consultationId = consultation?.id ?: appointmentId
                Log.d(TAG, "Joined consultation: $consultationId")
            } else {
                // Join failed — don't silently fall back, surface the error
                val errorMsg = joinResponse.body()?.message
                    ?: parseApiErrorMessage(joinResponse.errorBody())
                    ?: "Consultation hasn't started yet. Please wait for the doctor."
                Log.w(TAG, "Backend join failed: $errorMsg")
                return Result.Error(errorMsg)
            }

            // 2. Ensure socket is connected
            socketManager.connect()
            
            // Wait for connection (up to 5 seconds)
            if (socketManager.getSocket()?.connected() != true) {
                try {
                    kotlinx.coroutines.withTimeout(5000) {
                        socketManager.connectionState.first { connected -> connected }
                    }
                } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
                    Log.w(TAG, "Socket connection timed out, proceeding anyway")
                    // Proceed — the REST join already succeeded, socket is best-effort
                }
            }
            
            // Expose the room/session details back to the caller first.
            // The ViewModel joins the socket rooms only after its session state
            // is set, which prevents signaling callbacks from racing with a null roomId.
            val roomId = consultationId

            Result.Success(
                VideoCallSession(
                    sessionId = roomId,
                    token = roomId,
                    roomName = "Consultation Room",
                    consultationId = consultationId
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to join video call: ${e.message}")
            Result.Error(e.message ?: "Failed to join video call")
        }
    }

    /**
     * End/Leave a video consultation.
     * Patients call POST /consultations/:id/leave (signal they left the call).
     * Doctors call PUT /consultations/:id/end (terminates the consultation).
     * Since this is a patient app, we call the leave endpoint.
     */
    suspend fun endConsultation(consultationId: String): Result<Unit> {
        return try {
            val response = apiService.leaveConsultation(consultationId)
            if (response.isSuccessful && response.body()?.success == true) {
                Log.d(TAG, "Left consultation on server: $consultationId")
                Result.Success(Unit)
            } else {
                Log.w(TAG, "Failed to leave consultation on server: ${response.body()?.message}")
                Result.Success(Unit) // Still succeed locally even if backend fails
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error leaving consultation: ${e.message}")
            Result.Success(Unit) // Don't block user from leaving call
        }
    }

    /**
     * Get full consultation details by ID.
     * GET /api/consultations/:id
     */
    suspend fun getConsultationDetails(consultationId: String): Result<com.example.swastik.data.remote.dto.ConsultationDto> {
        return try {
            val response = apiService.getConsultationDetails(consultationId)
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.let { Result.Success(it) }
                    ?: Result.Error("Consultation not found")
            } else {
                Result.Error(response.body()?.message ?: "Failed to load consultation details")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Fetch ICE servers for WebRTC.
     * GET /api/consultations/:id/ice-servers
     */
    suspend fun getConsultationIceServers(consultationId: String): Result<List<org.webrtc.PeerConnection.IceServer>> {
        return try {
            val response = apiService.getConsultationIceServers(consultationId)
            if (response.isSuccessful && response.body()?.success == true) {
                val servers = response.body()?.data?.iceServers.orEmpty().mapNotNull { dto ->
                    val urls = dto.urls.filter { it.isNotBlank() }
                    if (urls.isEmpty()) return@mapNotNull null
                    val builder = org.webrtc.PeerConnection.IceServer.builder(urls)
                    if (!dto.username.isNullOrBlank()) builder.setUsername(dto.username)
                    if (!dto.credential.isNullOrBlank()) builder.setPassword(dto.credential)
                    builder.createIceServer()
                }
                Result.Success(servers)
            } else {
                Result.Error(response.body()?.message ?: "Failed to load ICE servers")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // ==================== REVIEWS ====================

    suspend fun submitDoctorReview(doctorId: String, consultationId: String?, rating: Int, comment: String? = null): Result<Unit> {
        return try {
            val request = com.example.swastik.data.remote.dto.ReviewRequest(
                doctorId = doctorId,
                consultationId = consultationId,
                rating = rating,
                comment = comment
            )
            val response = apiService.submitDoctorReview(doctorId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(response.body()?.message ?: "Failed to submit review")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Upload voice note to S3 via backend. Returns the uploaded file URL.
     */
    suspend fun uploadVoiceNote(filePart: okhttp3.MultipartBody.Part): Result<String> {
        return try {
            val response = apiService.uploadVoiceNote(filePart)
            if (response.isSuccessful) {
                val data = response.body()?.data
                val url = data?.url ?: data?.fileUrl ?: data?.storageUrl ?: data?.resolvedUrl
                if (url != null) {
                    Result.Success(url)
                } else {
                    Result.Error("No URL in response")
                }
            } else {
                Result.Error("Upload failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Upload error: ${e.message}")
        }
    }

    // ==================== Cache Mapping Extensions ====================

    private fun Appointment.toCachedAppointment() = CachedAppointment(
        id = id,
        patientId = patientId,
        doctorId = doctorId,
        doctorName = doctor?.name,
        doctorSpecialization = doctor?.specialization,
        date = date,
        timeSlot = timeSlot,
        type = type,
        status = status,
        notes = notes,
        cancellationReason = cancellationReason,
        cancelledBy = cancelledBy,
        isReviewed = isReviewed
    )

    private fun CachedAppointment.toDomainAppointment() = Appointment(
        id = id,
        appointmentNumber = null,
        patientId = patientId,
        doctorId = doctorId,
        date = date,
        timeSlot = timeSlot,
        type = type,
        status = status,
        reason = null,
        notes = notes,
        consultationFee = null,
        cancellationReason = cancellationReason,
        cancelledBy = cancelledBy,
        isReviewed = isReviewed,
        doctor = if (doctorName != null) Doctor(
            id = doctorId,
            name = doctorName,
            specialization = doctorSpecialization ?: "",
            profileImageUrl = null,
            experienceYears = null,
            qualification = null,
            consultationFee = null,
            videoConsultationFee = null,
            averageRating = null,
            totalReviews = null,
            isAvailable = true
        ) else null,
        patient = null
    )
}

// Domain Helper Models
data class VideoCallSession(
    val sessionId: String,
    val token: String,
    val roomName: String,
    val consultationId: String = ""
)
