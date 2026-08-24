package com.example.swastik.util

import android.os.Build
import com.example.swastik.data.remote.ApiConfig

/**
 * Universal Media URL Resolver for Vaididea Ecosystem.
 * Ensures relative paths (/uploads/..., uploads/...) and local emulator URLs (localhost -> 10.0.2.2)
 * are properly transformed into fully qualified, loadable URLs for Coil and ExoPlayer.
 */
object MediaUrlResolver {

    private fun isProbablyEmulator(): Boolean {
        return Build.FINGERPRINT.startsWith("generic") ||
            Build.FINGERPRINT.lowercase().contains("emulator") ||
            Build.MODEL.contains("Emulator") ||
            Build.MODEL.contains("Android SDK built for") ||
            Build.MANUFACTURER.contains("Genymotion") ||
            Build.HARDWARE.contains("goldfish") ||
            Build.HARDWARE.contains("ranchu") ||
            Build.PRODUCT.contains("sdk")
    }

    /**
     * Resolves a media (image, video, document) URL into a valid loadable URL.
     */
    fun resolve(rawUrl: String?): String? {
        if (rawUrl.isNullOrBlank()) return null
        val trimmed = rawUrl.trim()

        // Local content/file URLs are already absolute
        if (trimmed.startsWith("content://") || trimmed.startsWith("file://") || trimmed.startsWith("data:")) {
            return trimmed
        }

        // Handle full HTTP / HTTPS URLs
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return if (isProbablyEmulator()) {
                trimmed
                    .replace("http://localhost:", "http://10.0.2.2:")
                    .replace("https://localhost:", "https://10.0.2.2:")
                    .replace("http://127.0.0.1:", "http://10.0.2.2:")
                    .replace("https://127.0.0.1:", "https://10.0.2.2:")
            } else {
                trimmed
            }
        }

        // Relative path: prefix with server socket root (e.g. http://10.0.2.2:5001 or https://api.vaididea.in)
        val socketRoot = ApiConfig.SOCKET_URL.removeSuffix("/")
        val path = if (trimmed.startsWith("/")) trimmed else "/$trimmed"
        return "$socketRoot$path"
    }
}

/**
 * Convenient Kotlin extension function to resolve media URLs.
 */
fun String?.toResolvedMediaUrl(): String? = MediaUrlResolver.resolve(this)

/**
 * Extension function for lists of media URLs.
 */
fun List<String>?.toResolvedMediaUrls(): List<String> =
    this.orEmpty().mapNotNull { MediaUrlResolver.resolve(it) }
