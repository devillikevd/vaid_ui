package com.example.swastik.data.repository

import android.util.Log
import com.example.swastik.data.local.TokenManager
import com.example.swastik.data.local.db.SwastikDatabase
import com.example.swastik.data.remote.ApiService
import com.example.swastik.data.remote.SocketManager
import com.example.swastik.data.remote.dto.*
import com.example.swastik.notifications.PushNotificationCoordinator
import kotlinx.coroutines.flow.Flow
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
    private val database: SwastikDatabase,
    private val chatbotRepository: ChatbotRepository,
    private val pushNotificationCoordinator: PushNotificationCoordinator
) {
    companion object {
        private const val TAG = "AuthRepository"
    }

    /**
     * Login with email and password.
     * Backend returns JWT tokens on success.
     */
    fun loginWithEmail(email: String, password: String): Flow<Result<Boolean>> = flow {
        emit(Result.Loading)
        try {
            val normalizedEmail = email.trim()
            val response = apiService.login(LoginRequest(email = normalizedEmail, password = password, role = "patient"))
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
                    pushNotificationCoordinator.registerCurrentDeviceIfPossible()
                    emit(Result.Success(true))
                } else {
                    emit(Result.Error(body?.message ?: "Login failed"))
                }
            } else {
                val failure = parseApiFailure(response.errorBody()?.string())
                emit(Result.Error(failure?.message ?: "Login failed", failure))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Login failed", e)
            emit(Result.Error(userFriendlyErrorMessage(e)))
        }
    }

    /**
     * Register a new patient account.
     * Backend no longer returns tokens — requires email OTP verification first.
     */
    fun register(name: String, phone: String?, email: String, password: String = ""): Flow<Result<Boolean>> = flow {
        emit(Result.Loading)
        try {
            val request = RegisterRequest(
                name = name,
                phone = phone?.takeIf { it.isNotBlank() },
                email = email.trim(),
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
                val failure = parseApiFailure(response.errorBody()?.string())
                emit(Result.Error(failure?.message ?: "Registration failed", failure))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Registration failed", e)
            emit(Result.Error(userFriendlyErrorMessage(e)))
        }
    }

    /**
     * Resend email verification OTP.
     */
    suspend fun resendVerification(email: String): Result<String> {
        return try {
            val response = apiService.resendVerification(ResendVerificationRequest(email = email.trim()))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.message ?: "Verification code sent. Please check your inbox.")
            } else {
                val errorBody = response.errorBody()?.string()
                val failure = parseApiFailure(errorBody)
                Result.Error(
                    response.body()?.message ?: failure?.message ?: "Failed to resend verification code",
                    failure
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Resend verification failed", e)
            Result.Error(userFriendlyErrorMessage(e))
        }
    }

    suspend fun verifyEmailOtp(email: String, otp: String): Result<Boolean> {
        return try {
            val response = apiService.verifyEmailOtp(VerifyEmailOtpRequest(email = email.trim(), otp = otp.trim()))
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
                    pushNotificationCoordinator.registerCurrentDeviceIfPossible()
                    Result.Success(true)
                } else {
                    Result.Error(body?.message ?: "Failed to verify email")
                }
            } else {
                val errorBody = response.errorBody()?.string()
                val failure = parseApiFailure(errorBody)
                Result.Error(
                    response.body()?.message ?: failure?.message ?: "Failed to verify email",
                    failure
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Verify email OTP failed", e)
            Result.Error(userFriendlyErrorMessage(e))
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
            try {
                pushNotificationCoordinator.unregisterCurrentDeviceIfPossible()
            } catch (_: Exception) {
                // Best effort
            }
            tokenManager.clearAll()
            socketManager.disconnect()
            chatbotRepository.clearSession()
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
     * Forgot password - sends an email OTP.
     */
    suspend fun forgotPassword(email: String): Result<String> {
        return try {
            val response = apiService.forgotPassword(ForgotPasswordRequest(email = email.trim(), role = "patient"))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.message ?: "Password reset code sent.")
            } else {
                val errorBody = response.errorBody()?.string()
                val failure = parseApiFailure(errorBody)
                Result.Error(
                    response.body()?.message ?: failure?.message ?: "Failed to send reset email",
                    failure
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Forgot password failed", e)
            Result.Error(userFriendlyErrorMessage(e))
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

    /**
     * Get current authenticated user from the server.
     * GET /api/auth/me
     */
    suspend fun getCurrentUser(): Result<com.example.swastik.data.remote.dto.UserDto> {
        return try {
            val response = apiService.getCurrentUser()
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()?.data
                if (user != null) {
                    // Update cached user info
                    tokenManager.saveUserInfo(
                        userId = user.id,
                        role = user.role,
                        name = user.name ?: "",
                        phone = user.phone
                    )
                    Result.Success(user)
                } else {
                    Result.Error("User data not found")
                }
            } else {
                Result.Error(response.body()?.message ?: "Failed to fetch user")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fetching current user failed", e)
            Result.Error(userFriendlyErrorMessage(e))
        }
    }

    /**
     * Reset password with token from legacy email link.
     */
    suspend fun resetPassword(token: String, newPassword: String): Result<Boolean> {
        return try {
            val response = apiService.resetPassword(
                com.example.swastik.data.remote.dto.ResetPasswordRequest(token = token, newPassword = newPassword, role = "patient")
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(true)
            } else {
                Result.Error(response.body()?.message ?: "Failed to reset password")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Reset password failed", e)
            Result.Error(userFriendlyErrorMessage(e))
        }
    }

    suspend fun resetPasswordWithOtp(email: String, otp: String, newPassword: String): Result<Boolean> {
        return try {
            val response = apiService.resetPassword(
                com.example.swastik.data.remote.dto.ResetPasswordRequest(
                    email = email.trim(),
                    otp = otp.trim(),
                    newPassword = newPassword,
                    role = "patient"
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(true)
            } else {
                val failure = parseApiFailure(response.errorBody()?.string())
                Result.Error(response.body()?.message ?: failure?.message ?: "Failed to reset password", failure)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Reset password with OTP failed", e)
            Result.Error(userFriendlyErrorMessage(e))
        }
    }

    private fun parseApiFailure(errorBody: String?): AuthApiException? {
        if (errorBody == null) return null
        return try {
            val json = org.json.JSONObject(errorBody)
            val message = when {
                json.has("message") && !json.isNull("message") -> json.optString("message")
                json.has("error") && !json.isNull("error") -> json.optString("error")
                else -> null
            } ?: return null
            AuthApiException(
                message = message,
                code = json.optString("code").takeIf { it.isNotBlank() }
            )
        } catch (_: Exception) {
            AuthApiException(errorBody)
        }
    }

    private fun userFriendlyErrorMessage(exception: Exception): String {
        val rawMessage = exception.message
        if (exception is ClassCastException && rawMessage?.contains("ParameterizedType") == true) {
            return "This APK has an incompatible login build. Install the latest app build and try again."
        }
        return rawMessage ?: "Network error"
    }
}
