package com.example.swastik.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * LocationHelper — wraps FusedLocationProviderClient for the entire patient app.
 *
 * Usage:
 *   1. Check `hasLocationPermission()` from the UI
 *   2. If false → launch permission request (ActivityResultContracts)
 *   3. If true  → call `getLastLocation()` (one-shot) or `requestLocationUpdates()` (stream)
 */
@Singleton
class LocationHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val LAST_LOCATION_TIMEOUT_MS = 3_000L
        private const val FRESH_LOCATION_TIMEOUT_MS = 12_000L
        private const val MAX_CACHED_LOCATION_AGE_MS = 2 * 60 * 1000L
        private const val MAX_REASONABLE_ACCURACY_METERS = 500f
    }

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    /** Quick check — both FINE and COARSE are declared in the manifest. */
    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun isLocationUsable(location: Location?): Boolean {
        if (location == null) return false
        if (location.latitude !in -90.0..90.0 || location.longitude !in -180.0..180.0) return false
        return !location.hasAccuracy() || location.accuracy <= MAX_REASONABLE_ACCURACY_METERS
    }

    private fun isLocationFresh(location: Location, maxAgeMs: Long = MAX_CACHED_LOCATION_AGE_MS): Boolean {
        val ageMs = (System.currentTimeMillis() - location.time).coerceAtLeast(0L)
        return ageMs <= maxAgeMs
    }

    @Suppress("MissingPermission")
    private suspend fun readCachedLocation(): Location? {
        return withTimeoutOrNull(LAST_LOCATION_TIMEOUT_MS) {
            suspendCancellableCoroutine { cont ->
                fusedClient.lastLocation
                    .addOnSuccessListener { location ->
                        if (cont.isActive) cont.resume(location)
                    }
                    .addOnFailureListener {
                        if (cont.isActive) cont.resume(null)
                    }
            }
        }
    }

    @Suppress("MissingPermission")
    private suspend fun requestFreshLocation(
        timeoutMs: Long = FRESH_LOCATION_TIMEOUT_MS,
        priority: Int = Priority.PRIORITY_HIGH_ACCURACY
    ): Location? {
        return withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val request = LocationRequest.Builder(priority, 1_000L)
                    .setMinUpdateIntervalMillis(500L)
                    .setMaxUpdates(1)
                    .build()

                val callback = object : LocationCallback() {
                    override fun onLocationResult(result: LocationResult) {
                        fusedClient.removeLocationUpdates(this)
                        if (cont.isActive) {
                            cont.resume(result.lastLocation)
                        }
                    }
                }

                fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
                cont.invokeOnCancellation { fusedClient.removeLocationUpdates(callback) }
            }
        }
    }

    /**
     * One-shot location lookup used by nearby care, medicine, SOS, and records flows.
     * Returns a recent cached fix when it is still trustworthy, otherwise forces a fresh fix.
     */
    @Suppress("MissingPermission")
    suspend fun getLastLocation(): Location? {
        if (!hasLocationPermission()) return null

        val cachedLocation = readCachedLocation()
        if (isLocationUsable(cachedLocation) && cachedLocation != null && isLocationFresh(cachedLocation)) {
            return cachedLocation
        }

        val freshLocation = requestFreshLocation()
        return when {
            isLocationUsable(freshLocation) -> freshLocation
            isLocationUsable(cachedLocation) -> cachedLocation
            else -> null
        }
    }

    /**
     * Continuous stream of location updates (for ambulance tracking, live map, etc.).
     * Emits every [intervalMs]. Caller collects in a coroutine scope.
     */
    @Suppress("MissingPermission")
    fun requestLocationUpdates(
        intervalMs: Long = 5_000L,
        priority: Int = Priority.PRIORITY_HIGH_ACCURACY
    ): Flow<Location> = callbackFlow {
        if (!hasLocationPermission()) {
            close(SecurityException("Location permission not granted"))
            return@callbackFlow
        }

        val request = LocationRequest.Builder(priority, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { trySend(it) }
            }
        }

        fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())

        awaitClose { fusedClient.removeLocationUpdates(callback) }
    }
}
