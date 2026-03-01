package com.example.swastik.data.remote

import android.net.Uri
import com.example.swastik.BuildConfig

/**
 * API Configuration constants
 *
 * Base URL is set via build.gradle buildConfigField:
 *   - debug:   http://10.0.2.2:5001/api/  (Android Emulator → host localhost)
 *   - release: https://api.swastik.health/api/  (production)
 *
 * To test on a physical device in debug, override in local.properties:
 *   API_BASE_URL=http://192.168.x.x:5001/api/
 */
object ApiConfig {
    val BASE_URL: String = BuildConfig.API_BASE_URL

    /** Socket URL is the server root (scheme + host + port, without /api path). */
    val SOCKET_URL: String = run {
        val uri = Uri.parse(BASE_URL)
        val port = if (uri.port > 0) ":${uri.port}" else ""
        "${uri.scheme}://${uri.host}$port"
    }

    const val CONNECT_TIMEOUT = 30L
    const val READ_TIMEOUT = 30L
    const val WRITE_TIMEOUT = 30L
}
