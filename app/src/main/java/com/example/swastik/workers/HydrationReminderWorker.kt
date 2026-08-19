package com.example.swastik.workers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.swastik.MainActivity
import com.example.swastik.R
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Intelligent background worker that checks daily hydration and streak progress,
 * delivering clinical habit reminders at key intervals (e.g. 3:00 PM mid-day hydration).
 */
class HydrationReminderWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): androidx.work.ListenableWorker.Result {
        return try {
            val calendar = Calendar.getInstance()
            val hourOfDay = calendar.get(Calendar.HOUR_OF_DAY)

            // Check if current slot is mid-afternoon (around 14:00 - 16:00 / 3:00 PM) or evening (19:00 - 21:00)
            if (hourOfDay in 14..16) {
                showHydrationNotification(
                    title = "💧 3:00 PM Hydration Check",
                    message = "Stay energized & support muscle recovery: Drink 500ml water now to stay on track for your 2.8L daily goal."
                )
            } else if (hourOfDay in 19..21) {
                showHydrationNotification(
                    title = "🔥 Daily Streak Saver",
                    message = "Complete a quick 10-minute mobility stretch or log today's dinner to keep your active streak alive!"
                )
            }

            androidx.work.ListenableWorker.Result.success()
        } catch (e: Exception) {
            Log.w(TAG, "Hydration reminder check failed: ${e.message}")
            androidx.work.ListenableWorker.Result.success()
        }
    }

    private fun showHydrationNotification(title: String, message: String) {
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "wellness_habit_reminders"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Wellness & Habit Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Daily hydration, streak saver, and recovery alerts"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(1042, notification)
    }

    companion object {
        private const val TAG = "HydrationReminderWorker"
        private const val WORK_NAME = "hydration_habit_reminder_work"

        fun schedule(context: Context) {
            val workRequest = PeriodicWorkRequestBuilder<HydrationReminderWorker>(
                3, TimeUnit.HOURS // checks every 3 hours for relevant time-of-day slots
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
            Log.d(TAG, "Scheduled HydrationReminderWorker successfully.")
        }
    }
}
