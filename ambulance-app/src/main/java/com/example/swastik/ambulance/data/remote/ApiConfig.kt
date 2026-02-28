package com.example.swastik.ambulance.data.remote

import com.example.swastik.ambulance.BuildConfig

object ApiConfig {
    val BASE_URL: String = BuildConfig.API_BASE_URL

    /** Socket URL is the server root (without /api/) */
    val SOCKET_URL: String = BASE_URL.replace("/api/", "").replace("/api", "")
}
