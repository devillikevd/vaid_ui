package com.example.swastik.data.local

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token manager using EncryptedSharedPreferences
 * Falls back to regular SharedPreferences if encryption is not supported (e.g., on some emulators)
 */
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val sharedPreferences: SharedPreferences = createSharedPreferences(context)

    private fun createSharedPreferences(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to regular SharedPreferences if encryption fails
            // This can happen on some emulators or devices without hardware-backed keystore
            Log.w("TokenManager", "EncryptedSharedPreferences failed, using regular SharedPreferences", e)
            context.getSharedPreferences(PREFS_NAME_FALLBACK, Context.MODE_PRIVATE)
        }
    }

    companion object {
        private const val PREFS_NAME = "swastik_secure_prefs"
        private const val PREFS_NAME_FALLBACK = "swastik_prefs_fallback"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_TOKEN_EXPIRY = "token_expiry"
    }

    // Access Token
    var accessToken: String?
        get() = sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
        set(value) = sharedPreferences.edit().putString(KEY_ACCESS_TOKEN, value).apply()

    // Refresh Token
    var refreshToken: String?
        get() = sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
        set(value) = sharedPreferences.edit().putString(KEY_REFRESH_TOKEN, value).apply()

    // User ID
    var userId: String?
        get() = sharedPreferences.getString(KEY_USER_ID, null)
        set(value) = sharedPreferences.edit().putString(KEY_USER_ID, value).apply()

    // User Role
    var userRole: String?
        get() = sharedPreferences.getString(KEY_USER_ROLE, null)
        set(value) = sharedPreferences.edit().putString(KEY_USER_ROLE, value).apply()

    // User Name
    var userName: String?
        get() = sharedPreferences.getString(KEY_USER_NAME, null)
        set(value) = sharedPreferences.edit().putString(KEY_USER_NAME, value).apply()

    // User Phone
    var userPhone: String?
        get() = sharedPreferences.getString(KEY_USER_PHONE, null)
        set(value) = sharedPreferences.edit().putString(KEY_USER_PHONE, value).apply()

    // Login status
    var isLoggedIn: Boolean
        get() = sharedPreferences.getBoolean(KEY_IS_LOGGED_IN, false)
        set(value) = sharedPreferences.edit().putBoolean(KEY_IS_LOGGED_IN, value).apply()

    // Token expiry timestamp
    var tokenExpiry: Long
        get() = sharedPreferences.getLong(KEY_TOKEN_EXPIRY, 0)
        set(value) = sharedPreferences.edit().putLong(KEY_TOKEN_EXPIRY, value).apply()

    /**
     * Check if token is expired
     */
    fun isTokenExpired(): Boolean {
        val expiry = tokenExpiry
        if (expiry == 0L) return true
        return System.currentTimeMillis() >= expiry
    }

    /**
     * Save tokens after successful login
     */
    fun saveTokens(
        accessToken: String,
        refreshToken: String,
        expiresInSeconds: Long = 604800 // Default 7 days (matches server JWT config)
    ) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.tokenExpiry = System.currentTimeMillis() + (expiresInSeconds * 1000)
        this.isLoggedIn = true
    }

    /**
     * Save user info after successful login
     */
    fun saveUserInfo(
        userId: String,
        role: String,
        name: String,
        phone: String
    ) {
        this.userId = userId
        this.userRole = role
        this.userName = name
        this.userPhone = phone
    }

    /**
     * Clear all stored data (logout)
     */
    fun clearAll() {
        sharedPreferences.edit().clear().apply()
    }

    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return isLoggedIn && !accessToken.isNullOrEmpty() && !isTokenExpired()
    }

    /**
     * Get access token synchronously (for interceptor)
     */
    fun getAccessTokenSync(): String? {
        return accessToken
    }
}
