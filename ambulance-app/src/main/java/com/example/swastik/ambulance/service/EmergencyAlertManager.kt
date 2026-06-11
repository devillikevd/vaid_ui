package com.example.swastik.ambulance.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.swastik.ambulance.MainActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Plays urgent alert sound + vibration pattern and shows a high-priority heads-up 
 * notification when an incoming SOS emergency request is received.
 */
@Singleton
class EmergencyAlertManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var mediaPlayer: MediaPlayer? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    private val autoStopRunnable = Runnable { stopAlert() }

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    /** Vibration pattern: wait 0ms, vibrate 400ms, pause 200ms, vibrate 400ms, pause 200ms, vibrate 400ms */
    private val vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Emergency Dispatch Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent alerts for incoming emergency requests"
                enableVibration(true)
                vibrationPattern = this@EmergencyAlertManager.vibrationPattern
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Trigger an urgent alert: vibration + alarm sound + heads-up notification.
     * Safe to call from any thread.
     */
    fun triggerEmergencyAlert() {
        try {
            vibrate()
            playAlertSound()
            showNotification()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to trigger alert", e)
        }
    }

    /**
     * Stop any playing alert and remove notification (e.g., when user taps Accept or Reject).
     */
    fun stopAlert() {
        handler.removeCallbacks(autoStopRunnable)
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
            mediaPlayer = null
            notificationManager.cancel(NOTIFICATION_ID)
            
            // Stop vibration
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop alert", e)
        }
    }

    private fun showNotification() {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("🚨 EMERGENCY SOS 🚨")
            .setContentText("A new emergency requires your immediate attention! Tap to accept.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    private fun vibrate() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            vibrator?.let { v ->
                // Make it loop! (repeat index 1) until stopped
                v.vibrate(VibrationEffect.createWaveform(vibrationPattern, 1))
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibration failed", e)
        }
    }

    private fun playAlertSound() {
        try {
            stopAlert()

            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
                setDataSource(context, alarmUri)
                isLooping = true // Loop the alarm sound!
                prepare()
                start()
            }

            // Auto-stop after 30 seconds to avoid indefinite ringing (increased from 5s)
            handler.removeCallbacks(autoStopRunnable)
            handler.postDelayed(autoStopRunnable, 30_000)
        } catch (e: Exception) {
            Log.w(TAG, "Alert sound failed", e)
        }
    }

    companion object {
        private const val TAG = "EmergencyAlert"
        private const val CHANNEL_ID = "emergency_alerts_channel"
        private const val NOTIFICATION_ID = 2002
    }
}
