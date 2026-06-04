package com.example.swastik.ambulance.data.remote.dto

data class RouteDto(
    val coordinates: List<List<Double>>,
    val distanceMeters: Double,
    val durationSeconds: Double
)
