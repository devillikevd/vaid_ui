package com.example.swastik

import android.app.Application
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.sync.SyncManager
import com.example.swastik.notifications.PushNotificationCoordinator
import dagger.hilt.android.HiltAndroidApp
import org.osmdroid.config.Configuration
import javax.inject.Inject

/**
 * Application class with Hilt dependency injection
 */
@HiltAndroidApp
class SwastikApplication : Application() {

    @Inject
    lateinit var syncManager: SyncManager

    @Inject
    lateinit var pushNotificationCoordinator: PushNotificationCoordinator

    override fun onCreate() {
        super.onCreate()
        AppSettingsStore.init(this)
        // Initialize osmdroid map configuration with valid User-Agent to prevent 403 errors
        val validUserAgent = "SwastikHealth-Telemedicine/2.0 ($packageName; contact: support@swastikhealth.in)"
        Configuration.getInstance().apply {
            userAgentValue = validUserAgent
            additionalHttpRequestProperties["User-Agent"] = validUserAgent
            osmdroidBasePath = cacheDir
            osmdroidTileCache = java.io.File(cacheDir, "osmdroid/tiles")
        }

        // Purge any stale 403 error tiles cached from previous failed sessions
        try {
            val tileCacheDir = java.io.File(cacheDir, "osmdroid/tiles")
            if (tileCacheDir.exists()) {
                tileCacheDir.deleteRecursively()
            }
        } catch (_: Exception) {}

        // Start SyncManager to drain offline queue when network restores
        syncManager.startObserving()
        pushNotificationCoordinator.ensureNotificationChannel()
        pushNotificationCoordinator.registerCurrentDeviceIfPossible()
    }
}
