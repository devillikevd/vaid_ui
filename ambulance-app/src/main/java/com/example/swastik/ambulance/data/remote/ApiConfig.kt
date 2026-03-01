package com.example.swastik.ambulance.data.remote

import android.net.Uri
import com.example.swastik.ambulance.BuildConfig

object ApiConfig {
    val BASE_URL: String = BuildConfig.API_BASE_URL

    /** Socket URL is the server root (scheme + host + port, without /api path). */
    val SOCKET_URL: String = run {
        val uri = Uri.parse(BASE_URL)
        val port = if (uri.port > 0) ":${uri.port}" else ""
        "${uri.scheme}://${uri.host}$port"
    }
}
