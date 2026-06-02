package com.example.swastik.util.vision

import android.app.ActivityManager
import android.content.Context
import android.os.Build

object DeviceProfiler {
    private fun isBudgetVideoDevice(): Boolean {
        val model = Build.MODEL.lowercase()
        val device = Build.DEVICE.lowercase()
        val product = Build.PRODUCT.lowercase()
        val hardware = Build.HARDWARE.lowercase()
        val board = Build.BOARD.lowercase()

        return listOf(model, device, product, hardware, board).any { value ->
            value.contains("a217") || // Galaxy A21s
                value.contains("a21s") ||
                value.contains("universal3830") || // Exynos 850 family
                value.contains("exynos850")
        }
    }

    fun getTier2IntervalMs(context: Context): Long {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am.getMemoryInfo(memInfo)
        
        val totalRamGb = memInfo.totalMem / (1024.0 * 1024.0 * 1024.0)
        val cores = Runtime.getRuntime().availableProcessors()

        // Some budget SoCs report enough RAM/cores to look "mid-range", but still
        // cannot run WebRTC encode/decode plus MediaPipe CPU analysis smoothly.
        if (isBudgetVideoDevice()) {
            return 150L
        }
        
        // Low-end devices (e.g. Redmi 12C with 4GB RAM): limit to 10 FPS (100ms) to prevent thermal throttling and WebRTC drops
        if (totalRamGb <= 4.1 || cores < 6) {
            return 100L
        }
        
        // Mid-range devices: 15 FPS (66ms) is optimal
        if (totalRamGb < 6.0 || cores < 8) {
            return 66L
        }
        
        // High-end devices: can comfortably run 15 FPS without sweating, 
        // no need to go higher as 15 FPS is sufficient for rPPG.
        return 66L
    }

    fun getKeyframeIntervalMs(context: Context): Long {
        return if (getTier2IntervalMs(context) >= 100L) 2_500L else 750L
    }
}
