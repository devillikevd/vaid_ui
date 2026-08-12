package com.example.swastik.data.fitness

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.swastik.data.repository.FitnessRepository
import com.example.swastik.util.ConsultationPerformanceState
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@AndroidEntryPoint
class StepCounterService : Service(), SensorEventListener {

    @Inject
    lateinit var fitnessRepository: FitnessRepository

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var activityManager: ActivityRecognitionManager

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        activityManager = ActivityRecognitionManager(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundService()

        stepSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
            Log.d("StepCounterService", "Step sensor registered")
        } ?: Log.e("StepCounterService", "Step sensor not found!")

        // Also start activity tracking
        activityManager.startTracking()

        return START_STICKY
    }

    private fun startForegroundService() {
        val channelId = "fitness_tracker_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Fitness Tracker",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Fitness Tracker Active")
            .setContentText(getString(R.string.tracking_your_daily_steps_and))
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setOngoing(true)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(1001, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
            } else {
                startForeground(1001, notification)
            }
        } catch (e: Exception) {
            Log.e("StepCounterService", "Foreground service start failed", e)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && e is android.app.ForegroundServiceStartNotAllowedException) {
                // Ignore, this happens if system restarts a START_STICKY service while app is in background
            }
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_STEP_COUNTER) {
            if (ConsultationPerformanceState.isVideoConsultationActive) return
            val totalSteps = event.values[0].toInt()
            scope.launch {
                try {
                    fitnessRepository.updateSteps(totalSteps)
                } catch (e: Exception) {
                    Log.e("StepCounterService", "Failed to update steps", e)
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
        activityManager.stopTracking()
        Log.d("StepCounterService", "Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
