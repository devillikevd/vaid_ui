package com.example.swastik.ambulance.data.repository

import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.swastik.ambulance.data.local.TokenManager
import com.example.swastik.ambulance.notifications.AmbulancePushNotificationCoordinator
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.SocketManager
import com.example.swastik.ambulance.data.remote.dto.*
import com.example.swastik.ambulance.service.LocationTrackingService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val apiService: ApiService,
    private val tokenManager: TokenManager,
    private val socketManager: SocketManager,
    private val pushNotificationCoordinator: AmbulancePushNotificationCoordinator
) {
    class AuthApiException(message: String, val code: String? = null) : Exception(message)

    private fun parseApiFailure(responseBody: String?, fallback: String): AuthApiException {
        if (responseBody.isNullOrBlank()) return AuthApiException(fallback)
        return try {
            val json = org.json.JSONObject(responseBody)
            val message = when {
                json.has("message") && !json.isNull("message") -> json.optString("message")
                json.has("error") && !json.isNull("error") -> json.optString("error")
                else -> fallback
            }.ifBlank { fallback }
            val code = json.optString("code").takeIf { it.isNotBlank() }
            AuthApiException(message, code)
        } catch (_: Exception) {
            AuthApiException(fallback)
        }
    }

    private fun shouldEnableRealtime(user: UserDto): Boolean {
        return user.role == "ambulance_driver" ||
            (user.role == "ambulance_operator" && user.approvalStatus.equals("approved", ignoreCase = true))
    }

    private fun syncRealtimeConnection(user: UserDto, accessToken: String? = tokenManager.getAccessToken()) {
        if (shouldEnableRealtime(user) && !accessToken.isNullOrBlank()) {
            if (socketManager.isConnected) {
                socketManager.reconnect(accessToken)
            } else {
                socketManager.connect(accessToken, user.id)
            }
        } else if (socketManager.isConnected) {
            socketManager.disconnect()
        }
    }

    suspend fun registerOperator(
        name: String,
        email: String,
        phone: String,
        password: String,
        companyName: String?,
        registrationNumber: String?,
        address: String?,
        city: String?,
        state: String?,
        alternatePhone: String?,
        licenseDocumentUrl: String?,
        licenseExpiry: String?,
        vehicleNumber: String?,
        vehicleType: String?
    ): Result<String> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    email = email.trim(),
                    phone = phone.trim(),
                    password = password,
                    name = name.trim(),
                    companyName = companyName?.trim()?.takeIf { it.isNotBlank() },
                    registrationNumber = registrationNumber?.trim()?.takeIf { it.isNotBlank() },
                    address = address?.trim()?.takeIf { it.isNotBlank() },
                    city = city?.trim()?.takeIf { it.isNotBlank() },
                    state = state?.trim()?.takeIf { it.isNotBlank() },
                    alternatePhone = alternatePhone?.trim()?.takeIf { it.isNotBlank() },
                    licenseDocumentUrl = licenseDocumentUrl?.trim()?.takeIf { it.isNotBlank() },
                    licenseExpiry = licenseExpiry?.trim()?.takeIf { it.isNotBlank() },
                    vehicleNumber = vehicleNumber?.trim()?.takeIf { it.isNotBlank() },
                    vehicleType = vehicleType?.trim()?.takeIf { it.isNotBlank() }
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(
                    response.body()?.data?.message
                        ?: "Registration submitted. Enter the email verification code, then wait for admin approval."
                )
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), response.body()?.message ?: "Registration failed")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Register error", e)
            Result.failure(e)
        }
    }

    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = run {
                val operatorAttempt = apiService.login(LoginRequest(email, password, role = "ambulance_operator"))
                if (operatorAttempt.isSuccessful || operatorAttempt.code() != 403) {
                    operatorAttempt
                } else {
                    apiService.login(LoginRequest(email, password, role = "ambulance_driver"))
                }
            }
            if (response.isSuccessful) {
                val body = response.body()
                val accessToken = body?.resolvedAccessToken()
                val refreshToken = body?.resolvedRefreshToken()
                val user = body?.resolvedUser()

                if (accessToken != null && refreshToken != null && user != null) {
                    if (user.role !in listOf("ambulance_operator", "ambulance_driver")) {
                        return Result.failure(Exception("This app is for ambulance operators and drivers only"))
                    }
                    val expiresIn = body.resolvedExpiresIn()
                    tokenManager.saveTokens(accessToken, refreshToken, expiresIn)
                    val hydratedUser = getProfile().getOrNull() ?: user
                    tokenManager.saveUserId(hydratedUser.id)
                    tokenManager.saveUserName(hydratedUser.name ?: hydratedUser.email)
                    syncRealtimeConnection(hydratedUser, accessToken)
                    pushNotificationCoordinator.registerCurrentDeviceIfPossible()

                    Result.success(hydratedUser)
                } else {
                    Result.failure(Exception(body?.message ?: "Login failed"))
                }
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), "Login failed")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Login error", e)
            Result.failure(e)
        }
    }

    suspend fun resendVerification(email: String): Result<String> {
        return try {
            val response = apiService.resendVerification(ResendVerificationRequest(email.trim()))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()?.message ?: "Verification code sent.")
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), "Failed to resend verification code")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Resend verification error", e)
            Result.failure(e)
        }
    }

    suspend fun verifyEmailOtp(email: String, otp: String): Result<Boolean> {
        return try {
            val response = apiService.verifyEmailOtp(VerifyEmailOtpRequest(email.trim(), otp.trim()))
            if (response.isSuccessful) {
                val body = response.body()
                val token = body?.resolvedAccessToken()
                if (body?.success == true) {
                    Result.success(true)
                } else {
                    Result.failure(Exception(body?.message ?: "Failed to verify email"))
                }
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), "Failed to verify email")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Verify email OTP error", e)
            Result.failure(e)
        }
    }

    suspend fun forgotPassword(email: String): Result<String> {
        return try {
            val response = apiService.forgotPassword(ForgotPasswordRequest(email.trim(), role = "ambulance_operator"))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()?.message ?: "Reset code sent.")
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), "Failed to send reset code")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Forgot password error", e)
            Result.failure(e)
        }
    }

    suspend fun resetPasswordWithOtp(email: String, otp: String, password: String): Result<String> {
        return try {
            val response = apiService.resetPassword(
                ResetPasswordRequest(email = email.trim(), otp = otp.trim(), password = password, role = "ambulance_operator")
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()?.message ?: "Password reset successfully.")
            } else {
                val failure = parseApiFailure(response.errorBody()?.string(), "Failed to reset password")
                Result.failure(failure)
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Reset password error", e)
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            pushNotificationCoordinator.unregisterCurrentDeviceIfPossible()
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                apiService.logout(LogoutRequest(refreshToken))
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Logout API error", e)
        }
        stopTrackingService()
        socketManager.disconnect()
        tokenManager.clearAll()
    }

    private fun stopTrackingService() {
        val intent = Intent(appContext, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        appContext.startService(intent)
    }

    suspend fun refreshToken(): Boolean {
        return try {
            val refreshToken = tokenManager.getRefreshToken() ?: return false
            val response = apiService.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful) {
                val refreshBody = response.body()
                val newAccess = refreshBody?.resolvedAccessToken()
                val newRefresh = refreshBody?.resolvedRefreshToken() ?: refreshToken
                if (newAccess != null) {
                    val expiresIn = refreshBody.resolvedExpiresIn()
                    tokenManager.saveTokens(newAccess, newRefresh, expiresIn)
                    socketManager.reconnect(newAccess)
                    return true
                }
            }
            false
        } catch (e: Exception) {
            Log.e("AuthRepo", "Refresh token error", e)
            false
        }
    }

    suspend fun restoreSession(): Result<UserDto> {
        val result = getProfile()
        result.onSuccess { user ->
            tokenManager.saveUserId(user.id)
            tokenManager.saveUserName(user.name ?: user.email)
            syncRealtimeConnection(user)
            pushNotificationCoordinator.registerCurrentDeviceIfPossible()
        }
        return result
    }

    suspend fun getProfile(): Result<UserDto> {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                if (response.code() == 401 && !tokenManager.isAuthenticated()) {
                    socketManager.disconnect()
                    tokenManager.clearAll()
                }
                Result.failure(parseApiFailure(response.errorBody()?.string(), "Failed to load profile"))
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Get profile error", e)
            Result.failure(e)
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
    fun isAuthenticated(): Boolean = tokenManager.isAuthenticated()

    fun getUserId(): String? = tokenManager.getUserId()
    fun getUserName(): String? = tokenManager.getUserName()
    fun getAccessToken(): String? = tokenManager.getAccessToken()
}
