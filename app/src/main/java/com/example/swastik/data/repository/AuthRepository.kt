package com.example.swastik.data.repository

import com.example.swastik.data.local.TokenManager
import com.example.swastik.data.local.db.SwastikDatabase
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.*import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Auth Repository - handles authentication with the backend API.
 * Uses email/password login with email verification flow.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager,
    private val socketManager: SocketManager,
    private val database: SwastikDatabase
) {

    /**
     * Login with email and password.
     * Backend returns JWT tokens on success.
     */
    fun loginWithEmail(email: String, password: String): Flow<Result<Boolean>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.login(LoginRequest(email = email, password = password))
            if (response.isSuccessful) {
                val body = response.body()
                val token = body?.resolvedAccessToken()
                if (body?.success == true && token != null) {
                    // Save tokens
                    tokenManager.saveTokens(
                        accessToken = token,
                        refreshToken = body.resolvedRefreshToken() ?: "",
                        expiresInSeconds = body.resolvedExpiresIn()
                    )
                    // Save user info
                    body.resolvedUser()?.let { user ->
                        tokenManager.saveUserInfo(
                            userId = user.id,
                            role = user.role,
                            name = user.name ?: "",
                            phone = user.phone
                        )
                    }
                    // Connect socket after login
                    socketManager.connect()
                    emit(Result.Success(true))
                } else {
                    emit(Result.Error(body?.message ?: "Login failed"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                emit(Result.Error(parseErrorMessage(errorBody) ?: "Login failed"))
            }
        } catch (e: Exception) {
            emit(Result.Error(e.message ?: "Network error"))
        }
    }

    /**
     * Register a new patient account.
     * Backend no longer returns tokens — requires email verification first.
     */
    fun register(name: String, phone: String, email: String, password: String = ""): Flow<Result<Boolean>> = flow {
        emit(Result.Loading)
        try {
            val request = RegisterRequest(
                name = name,
                phone = phone,
                email = email,
                password = password,
                role = "patient"
            )
            val response = apiService.register(request)
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true) {
                    // Registration successful — user needs to verify email before logging in
                    emit(Result.Success(true))
                } else {
                    emit(Result.Error(body?.message ?: "Registration failed"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                emit(Result.Error(parseErrorMessage(errorBody) ?: "Registration failed"))
            }
        } catch (e: Exception) {
            emit(Result.Error(e.message ?: "Network error"))
        }
    }

    /**
     * Resend email verification link.
     */
    suspend fun resendVerification(email: String): Result<Boolean> {
        return try {
            val response = apiService.resendVerification(ResendVerificationRequest(email = email))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(true)
            } else {
                Result.Error(response.body()?.message ?: "Failed to resend verification email")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Logout - clear tokens and disconnect socket.
     */
    suspend fun logout() {
        try {
            val refreshToken = tokenManager.refreshToken ?: ""
            apiService.logout(LogoutRequest(refreshToken = refreshToken))
        } catch (_: Exception) {
            // Best effort
        } finally {
            tokenManager.clearAll()
            socketManager.disconnect()
            // Clear all Room DB caches
            try {
                database.doctorDao().clearAll()
                database.appointmentDao().clearAll()
                database.notificationDao().clearAll()
                database.prescriptionDao().clearAll()
                database.medicineDao().clearAll()
                database.hospitalDao().clearAll()
            } catch (_: Exception) {}
        }
    }

    /**
     * Forgot password.
     */
    suspend fun forgotPassword(email: String): Result<Boolean> {
        return try {
            val response = apiService.forgotPassword(ForgotPasswordRequest(email = email))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(true)
            } else {
                Result.Error(response.body()?.message ?: "Failed to send reset email")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    /**
     * Check if user is currently logged in.
     */
    fun isLoggedIn(): Boolean = tokenManager.isAuthenticated()

    /**
     * Get current user role.
     */
    fun getUserRole(): String? = tokenManager.userRole

    /**
     * Get current user name.
     */
    fun getUserName(): String? = tokenManager.userName

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody == null) return null
        return try {
            val json = org.json.JSONObject(errorBody)
            json.optString("message", json.optString("error", null))
        } catch (_: Exception) {
            errorBody
        }
    }
}
