package com.example.swastik.ambulance.utils

import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics

object CrashReporter {
    private const val TAG = "CrashReporter"

    fun log(message: String) {
        try {
            FirebaseCrashlytics.getInstance().log(message)
        } catch (e: Exception) {
            Log.w(TAG, "Crashlytics log failed: ${e.message}")
        }
    }

    fun recordException(throwable: Throwable, context: String? = null) {
        try {
            if (!context.isNullOrBlank()) {
                FirebaseCrashlytics.getInstance().log(context)
            }
            FirebaseCrashlytics.getInstance().recordException(throwable)
        } catch (e: Exception) {
            Log.w(TAG, "Crashlytics record failed: ${e.message}")
        }
    }
}
