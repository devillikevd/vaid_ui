package com.example.swastik.ambulance

import android.app.Application
import android.os.StrictMode
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
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build()
            )
            StrictMode.setVmPolicy(
                StrictMode.VmPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build()
            )
        }
        // Initialize osmdroid map configuration
        Configuration.getInstance().apply {
            userAgentValue = packageName
            osmdroidBasePath = cacheDir
            osmdroidTileCache = java.io.File(cacheDir, "osmdroid/tiles")
        }
        pushNotificationCoordinator.ensureNotificationChannel()
    }
}
