package com.example.swastik.data.remote

import android.net.Uri
import android.os.Build
import com.example.swastik.BuildConfig

/**
 * API Configuration constants
 *
 * Base URL is set via build.gradle buildConfigField:
 *   - debug:   http://10.0.2.2:5001/api/  (Android Emulator -> host localhost)
 *   - release: https://api.vaididea.in/api/  (production default)
 *
 * To test on a physical device from a locally built APK, override in local.properties:
 *   API_BASE_URL=http://192.168.x.x:5001/api/
 *   AI_WS_BASE_URL=ws://192.168.x.x:8000   // optional; derived automatically if omitted
 *   TURN_URL=turn:x.x.x.x:3478?transport=udp
 *   TURN_USERNAME=your_turn_username
 *   TURN_CREDENTIAL=your_turn_password
 */
object ApiConfig {
    private const val EMULATOR_BASE_URL = "http://10.0.2.2:5001/api/"
    private const val EMULATOR_AI_WS_URL = "ws://10.0.2.2:8000"

    private fun isProbablyEmulator(): Boolean {
        return Build.FINGERPRINT.startsWith("generic") ||
            Build.FINGERPRINT.lowercase().contains("emulator") ||
            Build.MODEL.contains("Emulator") ||
            Build.MODEL.contains("Android SDK built for") ||
            Build.MANUFACTURER.contains("Genymotion") ||
            Build.HARDWARE.contains("goldfish") ||
            Build.HARDWARE.contains("ranchu") ||
            Build.PRODUCT.contains("sdk")
    }

    val BASE_URL: String = if (BuildConfig.DEBUG && isProbablyEmulator()) {
        EMULATOR_BASE_URL
    } else {
        BuildConfig.API_BASE_URL
    }

    /** Socket URL is the server root (scheme + host + port, without /api path). */
    val SOCKET_URL: String = run {
        val uri = Uri.parse(BASE_URL)
        val port = if (uri.port > 0) ":${uri.port}" else ""
        "${uri.scheme}://${uri.host}$port"
    }

    /**
     * AI vitals WebSocket root.
     *
     * Priority:
     * 1. Emulator-specific dev endpoint
     * 2. Explicit build config override (local.properties / release config)
     * 3. Derived from API host:
     *    - dev API on :5001 -> AI service on :8000
     *    - prod HTTPS API -> same host over WSS
     */
    val AI_WS_URL: String = run {
        if (BuildConfig.DEBUG && isProbablyEmulator()) return@run EMULATOR_AI_WS_URL

        val configured = BuildConfig.AI_WS_BASE_URL.trim().removeSuffix("/")
        if (configured.isNotEmpty()) return@run configured

        val apiUri = Uri.parse(BASE_URL)
        val wsScheme = if (apiUri.scheme.equals("https", ignoreCase = true)) "wss" else "ws"
        val derivedPort = when (apiUri.port) {
            5001 -> 8000
            80, 443, -1 -> null
            else -> apiUri.port
        }
        val portPart = derivedPort?.let { ":$it" } ?: ""
        "$wsScheme://${apiUri.host}$portPart"
    }

    val TURN_URL: String = BuildConfig.TURN_URL.trim()
    val TURN_USERNAME: String = BuildConfig.TURN_USERNAME.trim()
    val TURN_CREDENTIAL: String = BuildConfig.TURN_CREDENTIAL.trim()

    const val CONNECT_TIMEOUT = 30L
    const val READ_TIMEOUT = 30L
    const val WRITE_TIMEOUT = 30L
}
