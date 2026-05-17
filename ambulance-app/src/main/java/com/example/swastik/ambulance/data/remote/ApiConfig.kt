package com.example.swastik.ambulance.data.remote

import android.net.Uri
import android.os.Build
import android.util.Log
import com.example.swastik.ambulance.BuildConfig

object ApiConfig {
    private const val TAG = "ApiConfig"
    private const val EMULATOR_BASE_URL = "http://10.0.2.2:5001/api/"

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

    val BASE_URL: String = normalizeBaseUrl(
        if (BuildConfig.DEBUG && isProbablyEmulator()) {
            EMULATOR_BASE_URL
        } else {
            val deviceOverride = if (BuildConfig.DEBUG) BuildConfig.DEVICE_API_BASE_URL else ""
            if (deviceOverride.isNotBlank()) {
                deviceOverride
            } else {
                if (BuildConfig.DEBUG && BuildConfig.API_BASE_URL.contains("10.0.2.2")) {
                    Log.w(TAG, "Physical device is using emulator base URL. Set API_BASE_URL_DEVICE in local.properties.")
                }
                BuildConfig.API_BASE_URL
            }
        }
    )

    /** Socket URL is the server root (scheme + host + port, without /api path). */
    val SOCKET_URL: String = run {
        val uri = Uri.parse(BASE_URL)
        if (!BuildConfig.DEBUG && uri.scheme != "https") {
            throw IllegalStateException("Release builds must use HTTPS base URL")
        }
        val port = if (uri.port > 0) ":${uri.port}" else ""
        "${uri.scheme}://${uri.host}$port"
    }

    val API_HOST: String = run {
        val uri = Uri.parse(BASE_URL)
        uri.host ?: ""
    }

    private fun normalizeBaseUrl(url: String): String {
        return if (url.endsWith("/")) url else "$url/"
    }

}
