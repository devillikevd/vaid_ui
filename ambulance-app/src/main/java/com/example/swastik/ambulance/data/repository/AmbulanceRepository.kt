package com.example.swastik.ambulance.data.repository

import android.util.Log
import com.example.swastik.ambulance.data.local.OfflineQueue
import com.example.swastik.ambulance.data.remote.ApiErrorParser
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.SocketManager
import com.example.swastik.ambulance.data.remote.dto.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AmbulanceRepository @Inject constructor(
    private val apiService: ApiService,
    private val socketManager: SocketManager,
    private val offlineQueue: OfflineQueue
) {
    data class UploadedDocumentRef(
        val persistentUrl: String,
        val resolvedUrl: String? = null
    )

    init {
        // Register reconnect callback to replay queued offline actions
        socketManager.onConnectCallback = { replayOfflineQueue() }
    }

    /** Replay queued status & location updates after reconnect. */
    private fun replayOfflineQueue() {
        val actions = offlineQueue.drain()
        if (actions.isEmpty()) return
        Log.d(TAG, "Replaying ${actions.size} offline action(s)")
        for (action in actions) {
            try {
                when (action.optString("type")) {
                    OfflineQueue.TYPE_STATUS -> {
                        val reqId = action.optString("requestId")
                        val status = action.optString("status")
                        if (reqId.isNotEmpty() && status.isNotEmpty()) {
                            socketManager.emitStatusUpdate(reqId, status)
                        }
                    }
                    OfflineQueue.TYPE_LOCATION -> {
                        val lat = action.optDouble("latitude")
                        val lng = action.optDouble("longitude")
                        val reqId = if (action.has("requestId")) action.optString("requestId") else null
                        socketManager.sendLocationUpdate(lat, lng, requestId = reqId)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to replay queued action", e)
            }
        }
    }

    // ==================== Dashboard ====================

    suspend fun getDashboard(): Result<DashboardResponse> {
        return try {
            Log.d(TAG, "Fetching ambulance dashboard")
            val response = apiService.getDashboard()
            if (response.isSuccessful && response.body() != null) {
                Log.d(TAG, "Dashboard loaded with ${response.body()?.activeEmergencies?.size ?: 0} active emergencies")
                response.body()?.let { Result.success(it) }
                    ?: Result.failure(Exception("Dashboard data was null"))
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to load dashboard")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDashboard error", e)
            Result.failure(e)
        }
    }

    // ==================== Vehicles ====================

    suspend fun getVehicles(): Result<List<VehicleDto>> {
        return try {
            val response = apiService.getVehicles()
            if (response.isSuccessful) {
                Result.success(response.body()?.vehicles ?: emptyList())
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to load vehicles")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getVehicles error", e)
            Result.failure(e)
        }
    }

    // ==================== Emergencies ====================

    suspend fun getEmergencyHistory(status: String? = null): Result<List<EmergencyDto>> {
        return try {
            val response = apiService.getRequestHistory(status)
            if (response.isSuccessful) {
                Result.success(response.body()?.data ?: emptyList())
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to load history")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getHistory error", e)
            Result.failure(e)
        }
    }

    suspend fun getEmergencyById(requestId: String): Result<EmergencyDto> {
        return try {
            val response = apiService.getRequestById(requestId)
            if (response.isSuccessful && response.body()?.data != null) {
                response.body()?.data?.let { Result.success(it) }
                    ?: Result.failure(Exception("Emergency data was null"))
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Emergency not found")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getRequestById error", e)
            Result.failure(e)
        }
    }

    suspend fun acceptRequest(requestId: String): Result<Unit> {
        return try {
            Log.d(TAG, "Accept request api call request=$requestId")
            val response = apiService.acceptRequest(requestId)
            if (response.isSuccessful) {
                // Set active request so location updates include the requestId
                socketManager.setActiveRequest(requestId)
                Log.d(TAG, "Accept request succeeded request=$requestId")
                Result.success(Unit)
            } else {
                val errorMsg = ApiErrorParser.from(response, "Failed to accept request")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "acceptRequest error", e)
            Result.failure(e)
        }
    }

    suspend fun rejectRequest(requestId: String): Result<Unit> {
        return try {
            val response = apiService.rejectRequest(requestId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to reject request")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "rejectRequest error", e)
            Result.failure(e)
        }
    }

    suspend fun updateRequestStatus(
        requestId: String,
        status: String,
        vehicleId: String? = null
    ): Result<Unit> {
        return try {
            Log.d(TAG, "Update request status api call request=$requestId status=$status")
            val response = apiService.updateRequestStatus(
                requestId,
                StatusUpdateRequest(status, vehicleId)
            )
            if (response.isSuccessful) {
                // Track active request for location routing
                if (status in listOf("completed", "cancelled")) {
                    socketManager.clearActiveRequest()
                } else {
                    socketManager.setActiveRequest(requestId)
                }
                // Also notify via socket for real-time update to patient
                if (socketManager.isConnected) {
                    socketManager.emitStatusUpdate(requestId, status)
                } else {
                    offlineQueue.enqueueStatusUpdate(requestId, status)
                }
                Log.d(TAG, "Update request status succeeded request=$requestId status=$status")
                Result.success(Unit)
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to update status")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateStatus error", e)
            Result.failure(e)
        }
    }

    // ==================== Location ====================

    suspend fun updateLocationViaApi(latitude: Double, longitude: Double, vehicleId: String? = null): Result<Unit> {
        return try {
            val response = apiService.updateLocation(
                LocationUpdateRequest(latitude, longitude, vehicleId)
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to update location")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateLocation API error", e)
            Result.failure(e)
        }
    }

    /**
     * Send location via Socket.IO for real-time tracking (preferred for frequent updates).
     */
    fun sendLocationViaSocket(latitude: Double, longitude: Double, requestId: String? = null) {
        if (socketManager.isConnected) {
            socketManager.sendLocationUpdate(latitude, longitude, requestId = requestId)
        } else {
            offlineQueue.enqueueLocation(latitude, longitude, requestId)
        }
    }

    // ==================== Profile ====================

    suspend fun getProfile(): Result<com.example.swastik.ambulance.data.remote.dto.UserDto> {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to load profile")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getProfile error", e)
            Result.failure(e)
        }
    }

    suspend fun updateProfile(request: UpdateProfileRequest): Result<Unit> {
        return try {
            val response = apiService.updateProfile(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to update profile")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateProfile error", e)
            Result.failure(e)
        }
    }

    suspend fun uploadLicenseDocument(filePart: MultipartBody.Part): Result<UploadedDocumentRef> {
        return try {
            val providerType = "ambulance".toRequestBody("text/plain".toMediaTypeOrNull())
            val response = apiService.uploadLicenseDocument(filePart, providerType)
            if (response.isSuccessful && response.body()?.data != null) {
                val persistentUrl = response.body()?.data?.persistentUrl()
                val resolvedUrl = response.body()?.data?.resolvedUrl()
                if (!persistentUrl.isNullOrBlank()) {
                    Result.success(
                        UploadedDocumentRef(
                            persistentUrl = persistentUrl,
                            resolvedUrl = resolvedUrl ?: persistentUrl
                        )
                    )
                } else {
                    Result.failure(Exception("Upload succeeded but no document URL was returned"))
                }
            } else {
                Result.failure(Exception(ApiErrorParser.from(response, "Failed to upload document")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "uploadLicenseDocument error", e)
            Result.failure(e)
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> {
        return try {
            val response = apiService.changePassword(
                com.example.swastik.ambulance.data.remote.dto.ChangePasswordRequest(currentPassword, newPassword)
            )
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val msg = ApiErrorParser.from(response, "Failed to change password")
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "changePassword error", e)
            Result.failure(e)
        }
    }

    companion object {
        private const val TAG = "AmbulanceRepo"
    }
}
