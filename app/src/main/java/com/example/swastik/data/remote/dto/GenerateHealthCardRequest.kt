package com.example.swastik.data.remote.dto

import com.google.gson.annotations.SerializedName

data class GenerateHealthCardRequest(
    @SerializedName("guardian_analytics")
    val guardianAnalyticsJson: String? = null
)
