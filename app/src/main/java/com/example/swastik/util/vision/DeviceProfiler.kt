package com.example.swastik.util.vision

import android.app.ActivityManager
import android.content.Context
import android.os.Build

object DeviceProfiler {
    fun getTier2IntervalMs(context: Context): Long {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am.getMemoryInfo(memInfo)
        
        val totalRamGb = memInfo.totalMem / (1024.0 * 1024.0 * 1024.0)
        val cores = Runtime.getRuntime().availableProcessors()
        
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
}
