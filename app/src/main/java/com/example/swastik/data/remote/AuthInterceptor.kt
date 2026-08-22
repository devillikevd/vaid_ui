package com.example.swastik.data.remote

import android.util.Log
import com.example.swastik.data.local.TokenManager
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.util.concurrent.locks.ReentrantLock
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.concurrent.withLock

/**
 * OkHttp interceptor that automatically attaches JWT Bearer token
 * to all outgoing API requests and handles transparent token refresh.
 *
 * Includes automatic retry with exponential backoff for transient
 * network failures (IOException) to avoid showing "Unable to reach
 * server" on brief connectivity hiccups.
 *
 * Thread-safety: a [ReentrantLock] ensures that only one thread
 * performs a refresh at a time; concurrent 401s re-read the already-
 * refreshed token instead of duplicating the refresh call.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
    private val socketManager: SocketManager
) : Interceptor {

    companion object {
        private const val TAG = "AuthInterceptor"
        private const val MAX_RETRIES = 2
        private val RETRY_DELAYS_MS = longArrayOf(500L, 1500L)
    }

    private val refreshLock = ReentrantLock()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth header for login/register/public endpoints
        val path = originalRequest.url.encodedPath
        if (path.endsWith("auth/login") || path.endsWith("auth/register") || path.endsWith("auth/send-registration-otp") || path.endsWith("auth/verify-registration-otp") || path.endsWith("auth/forgot-password") || path.endsWith("auth/resend-verification") || path.endsWith("auth/verify-email") || path.endsWith("auth/verify-email-otp")) {
            return proceedWithRetry(chain, originalRequest) ?: Response.Builder()
                .request(originalRequest)
                .protocol(okhttp3.Protocol.HTTP_1_1)
                .code(503)
                .message("Network error")
                .body("""{"success":false,"message":"Unable to reach server. Please check your connection."}""".toResponseBody("application/json".toMediaTypeOrNull()))
                .build()
        }

        val token = tokenManager.getAccessTokenSync()

        val request = if (!token.isNullOrEmpty()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        val response = proceedWithRetry(chain, request) ?: run {
            // All retries exhausted — return synthetic 503
            Log.w(TAG, "All retries exhausted for ${originalRequest.url.encodedPath}")
            return Response.Builder()
                .request(originalRequest)
                .protocol(okhttp3.Protocol.HTTP_1_1)
                .code(503)
                .message("Network error")
                .body("""{"success":false,"message":"Unable to reach server. Please check your connection."}""".toResponseBody("application/json".toMediaTypeOrNull()))
                .build()
        }

        // If 401 Unauthorized, attempt token refresh (thread-safe)
        if (response.code == 401 && !path.endsWith("auth/refresh-token")) {
            response.close()

            // Synchronize refresh: only one thread refreshes at a time
            val newToken = refreshLock.withLock {
                // Re-read token — another thread may have already refreshed it
                val currentToken = tokenManager.getAccessTokenSync()
                if (currentToken != null && currentToken != token) {
                    // Another thread already refreshed; reuse the new token
                    currentToken
                } else {
                    // We are the first thread to reach here — do the refresh
                    performTokenRefresh(chain, originalRequest)
                }
            }

            if (!newToken.isNullOrEmpty()) {
                // Retry original request with the (possibly new) token
                val retryRequest = originalRequest.newBuilder()
                    .header("Authorization", "Bearer $newToken")
                    .build()
                return proceedWithRetry(chain, retryRequest) ?: Response.Builder()
                    .request(originalRequest)
                    .protocol(okhttp3.Protocol.HTTP_1_1)
                    .code(503)
                    .message("Network error")
                    .body("""{"success":false,"message":"Unable to reach server. Please check your connection."}""".toResponseBody("application/json".toMediaTypeOrNull()))
                    .build()
            }

            // Refresh failed — return synthetic 401 so the UI can redirect to login
            return Response.Builder()
                .request(originalRequest)
                .protocol(okhttp3.Protocol.HTTP_1_1)
                .code(401)
                .message("Session expired")
                .body("""{"success":false,"message":"Session expired"}""".toResponseBody("application/json".toMediaTypeOrNull()))
                .build()
        }

        return response
    }

    /**
     * Execute the request with automatic retry on transient IOExceptions.
     * Returns the [Response] on success, or null if all retries are exhausted.
     */
    private fun proceedWithRetry(chain: Interceptor.Chain, request: okhttp3.Request): Response? {
        var lastException: java.io.IOException? = null

        for (attempt in 0..MAX_RETRIES) {
            try {
                return chain.proceed(request)
            } catch (e: java.io.IOException) {
                lastException = e
                if (attempt < MAX_RETRIES) {
                    val delay = RETRY_DELAYS_MS.getOrElse(attempt) { 1000L }
                    Log.w(TAG, "Retry ${attempt + 1}/$MAX_RETRIES for ${request.url.encodedPath} after ${delay}ms (${e.javaClass.simpleName}: ${e.message})")
                    try {
                        Thread.sleep(delay)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                        break
                    }
                } else {
                    Log.e(TAG, "Final attempt failed for ${request.url.encodedPath}: ${e.javaClass.simpleName}: ${e.message}")
                }
            }
        }
        return null
    }

    /**
     * Attempt a synchronous token refresh. Returns the new access token on success, null on failure.
     * MUST be called inside [refreshLock].
     */
    private fun performTokenRefresh(chain: Interceptor.Chain, originalRequest: okhttp3.Request): String? {
        val refreshToken = tokenManager.refreshToken
        if (refreshToken.isNullOrEmpty()) {
            socketManager.disconnect()
            tokenManager.clearAll(emitSessionExpired = true)
            return null
        }

        return try {
            val refreshBody = org.json.JSONObject().apply {
                put("refreshToken", refreshToken)
            }.toString()

            val refreshRequest = originalRequest.newBuilder()
                .url(originalRequest.url.newBuilder()
                    .encodedPath("/api/auth/refresh-token")
                    .build())
                .post(
                    refreshBody.toRequestBody("application/json".toMediaTypeOrNull())
                )
                .removeHeader("Authorization")
                .build()

            val refreshResponse = chain.proceed(refreshRequest)
            if (refreshResponse.isSuccessful) {
                val body = refreshResponse.body?.string()
                refreshResponse.close()

                val json = org.json.JSONObject(body ?: "{}")
                // Backend nests tokens inside "data": { accessToken, refreshToken }
                val dataObj = json.optJSONObject("data") ?: json
                val newAccessToken = dataObj.optString("access_token", dataObj.optString("accessToken", ""))
                val newRefreshToken = dataObj.optString("refresh_token", dataObj.optString("refreshToken", refreshToken))
                val expiresIn = dataObj.optLong("expiresIn", 604800L)

                if (newAccessToken.isNotEmpty()) {
                    tokenManager.saveTokens(newAccessToken, newRefreshToken, expiresIn)
                    socketManager.reconnect()
                    Log.i(TAG, "Token refresh successful")
                    newAccessToken
                } else {
                    Log.w(TAG, "Token refresh returned empty access token")
                    socketManager.disconnect()
                    tokenManager.clearAll(emitSessionExpired = true)
                    null
                }
            } else {
                val statusCode = refreshResponse.code
                refreshResponse.close()
                Log.w(TAG, "Token refresh failed with status $statusCode")
                if (statusCode == 401 || statusCode == 403) {
                    socketManager.disconnect()
                    tokenManager.clearAll(emitSessionExpired = true)
                }
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh exception: ${e.message}")
            socketManager.disconnect()
            null
        }
    }
}
