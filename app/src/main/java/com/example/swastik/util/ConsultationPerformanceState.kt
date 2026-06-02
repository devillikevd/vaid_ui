package com.example.swastik.util

/**
 * Lightweight in-process signal used to shed nonessential background work while
 * a live video consultation is active.
 */
object ConsultationPerformanceState {
    @Volatile
    var isVideoConsultationActive: Boolean = false
}
