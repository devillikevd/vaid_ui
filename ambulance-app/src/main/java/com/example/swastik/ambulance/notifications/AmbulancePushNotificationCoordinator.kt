package com.example.swastik.ambulance.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.swastik.ambulance.MainActivity
import com.example.swastik.ambulance.R
import com.example.swastik.ambulance.data.local.TokenManager
import com.example.swastik.ambulance.data.remote.ApiService
import com.example.swastik.ambulance.data.remote.dto.PushDeviceRequest
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@Singleton
class AmbulancePushNotificationCoordinator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    companion object {
        private const val TAG = "AmbulancePush"
        private const val CHANNEL_ID = "swastik_ambulance_alerts"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Ambulance Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "SOS dispatches, status updates, and approval alerts"
            }
        )
    }

    fun registerCurrentDeviceIfPossible() {
        scope.launch {
            if (!tokenManager.isAuthenticated()) return@launch
            val token = getFirebaseTokenOrNull() ?: return@launch
            runCatching {
                apiService.registerDeviceForPush(PushDeviceRequest(fcmToken = token))
            }.onFailure { error ->
                Log.w(TAG, "FCM registration skipped: ${error.message}")
            }
        }
    }

    suspend fun unregisterCurrentDeviceIfPossible() {
        if (!tokenManager.isAuthenticated()) return
        val token = getFirebaseTokenOrNull() ?: return
        runCatching {
            apiService.unregisterDeviceForPush(PushDeviceRequest(fcmToken = token))
        }.onFailure { error ->
            Log.w(TAG, "FCM unregister skipped: ${error.message}")
        }
    }

    fun onNewToken(token: String) {
        if (!tokenManager.isAuthenticated() || token.isBlank()) return
        scope.launch {
            runCatching {
                apiService.registerDeviceForPush(PushDeviceRequest(fcmToken = token))
            }.onFailure { error ->
                Log.w(TAG, "New FCM token registration failed: ${error.message}")
            }
        }
    }

    fun showNotification(title: String, message: String) {
        ensureNotificationChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title.ifBlank { context.getString(R.string.app_name) })
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(
            ("ambulance:$title:$message").hashCode(),
            notification
        )
    }

    private suspend fun getFirebaseTokenOrNull(): String? {
        if (!ensureFirebaseConfigured()) return null
        return try {
            FirebaseMessaging.getInstance().token.await().takeIf { it.isNotBlank() }
        } catch (error: Exception) {
            Log.w(TAG, "Skipping ambulance FCM token fetch: ${error.message}")
            null
        }
    }

    private fun ensureFirebaseConfigured(): Boolean {
        return try {
            if (FirebaseApp.getApps(context).isNotEmpty()) {
                true
            } else {
                FirebaseApp.initializeApp(context) != null
            }
        } catch (error: Exception) {
            Log.w(TAG, "Ambulance Firebase client config missing: ${error.message}")
            false
        }
    }
}
