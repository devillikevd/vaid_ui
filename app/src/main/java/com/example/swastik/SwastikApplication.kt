package com.example.swastik

import android.app.Application
import android.os.Build
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.VideoFrameDecoder
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.sync.SyncManager
import com.example.swastik.notifications.PushNotificationCoordinator
import dagger.hilt.android.HiltAndroidApp
import org.osmdroid.config.Configuration
import javax.inject.Inject

/**
 * Application class with Hilt dependency injection & Global Coil Media Pipeline
 */
@HiltAndroidApp
class SwastikApplication : Application(), ImageLoaderFactory {

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

    /**
     * Universal ImageLoader for Vaididea:
     * - Automatic Video Frame extraction for MP4/WebM (.mp4 -> thumbnail)
     * - Full GIF & animated WebP playback support (ImageDecoder / GifDecoder)
     * - 25% RAM memory cache + 50MB disk cache with crossfade
     */
    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .components {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
                add(VideoFrameDecoder.Factory())
            }
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(50L * 1024 * 1024) // 50 MB
                    .build()
            }
            .crossfade(true)
            .build()
    }
}
