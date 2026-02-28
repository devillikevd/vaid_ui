package com.example.swastik.ambulance.data.repository

import android.util.Log
import com.example.swastik.ambulance.data.local.TokenManager
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.SocketManager
import com.example.swastik.ambulance.data.remote.dto.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager,
    private val socketManager: SocketManager
) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()
                val accessToken = body?.resolvedAccessToken()
                val refreshToken = body?.resolvedRefreshToken()
                val user = body?.resolvedUser()

                if (accessToken != null && refreshToken != null && user != null) {
                    if (user.role != "ambulance_operator") {
                        return Result.failure(Exception("This app is for ambulance operators only"))
                    }
                    val expiresIn = body?.resolvedExpiresIn() ?: 604800L
                    tokenManager.saveTokens(accessToken, refreshToken, expiresIn)
                    tokenManager.saveUserId(user.id)
                    tokenManager.saveUserName(user.name ?: user.email)

                    // Connect socket for real-time updates
                    socketManager.connect(accessToken, user.id)

                    Result.success(user)
                } else {
                    Result.failure(Exception(body?.message ?: "Login failed"))
                }
            } else {
                val errorMsg = try {
                    val errorBody = response.errorBody()?.string()
                    val json = org.json.JSONObject(errorBody ?: "{}")
                    json.optString("message", "Login failed")
                } catch (_: Exception) { "Login failed" }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Login error", e)
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                apiService.logout(LogoutRequest(refreshToken))
            }
        } catch (e: Exception) {
            Log.e("AuthRepo", "Logout API error", e)
        }
        socketManager.disconnect()
        tokenManager.clearAll()
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
                    val expiresIn = refreshBody?.resolvedExpiresIn() ?: 604800L
                    tokenManager.saveTokens(newAccess, newRefresh, expiresIn)
                    return true
                }
            }
            false
        } catch (e: Exception) {
            Log.e("AuthRepo", "Refresh token error", e)
            false
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
    fun isAuthenticated(): Boolean = tokenManager.isAuthenticated()

    fun getUserId(): String? = tokenManager.getUserId()
    fun getUserName(): String? = tokenManager.getUserName()
    fun getAccessToken(): String? = tokenManager.getAccessToken()
}
