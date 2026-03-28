package com.example.swastik.ambulance

import android.app.Application
import com.example.swastik.ambulance.notifications.AmbulancePushNotificationCoordinator
import dagger.hilt.android.HiltAndroidApp
import org.osmdroid.config.Configuration
import javax.inject.Inject

@HiltAndroidApp
class AmbulanceApp : Application() {
    @Inject
    lateinit var pushNotificationCoordinator: AmbulancePushNotificationCoordinator

    override fun onCreate() {
        super.onCreate()
        // Initialize osmdroid map configuration
        Configuration.getInstance().apply {
            userAgentValue = packageName
            osmdroidBasePath = cacheDir
            osmdroidTileCache = java.io.File(cacheDir, "osmdroid/tiles")
        }
        pushNotificationCoordinator.ensureNotificationChannel()
    }
}
