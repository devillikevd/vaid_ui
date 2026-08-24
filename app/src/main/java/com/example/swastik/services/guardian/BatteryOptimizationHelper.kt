package com.example.swastik.services.guardian

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * Helper for OEM battery optimization exemption.
 * Many OEMs (Xiaomi/MIUI, Vivo/FuntouchOS, Oppo/ColorOS, Samsung/OneUI) aggressively
 * kill background services even with START_STICKY and foreground notifications.
 * 
 * This helper:
 * 1. Checks if app is already exempt from battery optimizations
 * 2. Requests exemption via system dialog (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
 * 3. Provides OEM-specific intents for deeper autostart/background permissions
 */
object BatteryOptimizationHelper {

    private const val TAG = "BatteryOptimizationHelper"

    /**
     * Returns true if the app is already whitelisted from battery optimizations.
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
    }

    /**
     * Creates an intent to request battery optimization exemption.
     * Shows the Android system dialog asking user to whitelist this app.
     * Should be called when Guardian is enabled for the first time.
     */
    fun createBatteryOptimizationIntent(context: Context): Intent {
        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }

    /**
     * Tries to launch OEM-specific autostart/background permission settings.
     * Returns true if an OEM-specific intent was found and launched.
     * Falls back to standard Android battery optimization dialog if no OEM intent works.
     */
    fun requestBatteryOptimization(context: Context): Boolean {
        if (isIgnoringBatteryOptimizations(context)) {
            Log.d(TAG, "Already whitelisted from battery optimizations")
            return true
        }

        // Try OEM-specific intents first (Xiaomi, Oppo, Vivo, Samsung, Huawei)
        val oemIntents = listOf(
            // Xiaomi MIUI — AutoStart Manager
            Intent().setClassName(
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity"
            ),
            // Oppo ColorOS — Battery Optimization
            Intent().setClassName(
                "com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity"
            ),
            // Vivo FuntouchOS — Background Activity Manager
            Intent().setClassName(
                "com.vivo.permissionmanager",
                "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
            ),
            // Samsung OneUI — Battery settings
            Intent().setClassName(
                "com.samsung.android.lool",
                "com.samsung.android.sm.battery.ui.BatteryActivity"
            ),
            // Huawei EMUI — Startup Manager
            Intent().setClassName(
                "com.huawei.systemmanager",
                "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
            )
        )

        for (intent in oemIntents) {
            try {
                if (context.packageManager.resolveActivity(intent, 0) != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    Log.d(TAG, "Launched OEM autostart settings: ${intent.component}")
                    return true
                }
            } catch (e: Exception) {
                Log.d(TAG, "OEM intent failed: ${e.message}")
            }
        }

        // Fallback to standard Android battery optimization dialog
        try {
            val standardIntent = createBatteryOptimizationIntent(context)
            standardIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(standardIntent)
            Log.d(TAG, "Launched standard battery optimization dialog")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch battery optimization dialog: ${e.message}")
            return false
        }
    }
}
