package com.example.swastik.services.guardian

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.example.swastik.data.local.AppSettingsStore
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.DetectedActivity
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.ArrayDeque
import kotlin.math.abs
import kotlin.math.sqrt

import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import com.example.swastik.data.repository.GuardianRepository

@AndroidEntryPoint
class GuardianService : Service(), SensorEventListener {

    @Inject
    lateinit var guardianRepository: GuardianRepository

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var proximitySensor: Sensor? = null
    private var lightSensor: Sensor? = null

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    private var isVerificationPhase = false
    private var lastAcceleration = 0f
    private var lastImpactMagnitude = 0f
    private var lastImpactDelta = 0f
    private var impactActivityType: Int = DetectedActivity.UNKNOWN
    private var impactSpeedKmh: Float = 0f

    // We keep track of angular speed to verify tumbling
    private var angularSpeedSum = 0f
    
    // GPS & Activity Recognition
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var lastKnownSpeed: Float = 0f // in m/s
    private var maxVehicleSpeedMps: Float = 0f
    private var lastKnownLocation: Location? = null
    private var currentActivityType: Int = DetectedActivity.UNKNOWN
    private var proximityNear: Boolean? = null
    private var ambientLightLux: Float? = null
    private var lastGaitLogMs = 0L
    private var lastRespiratoryLogMs = 0L
    private val gaitSamples = ArrayDeque<MotionSample>()
    
    private val activityReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_ACTIVITY_UPDATE) {
                currentActivityType = intent.getIntExtra(EXTRA_ACTIVITY_TYPE, DetectedActivity.UNKNOWN)
                Log.d(TAG, "Current Activity Updated: $currentActivityType")
            }
        }
    }
    
    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            super.onLocationResult(result)
            result.lastLocation?.let { loc ->
                lastKnownLocation = loc
                if (loc.hasSpeed()) {
                    lastKnownSpeed = loc.speed // speed in m/s
                    if (currentActivityType == DetectedActivity.IN_VEHICLE) {
                        maxVehicleSpeedMps = maxOf(maxVehicleSpeedMps * 0.92f, loc.speed)
                    } else {
                        maxVehicleSpeedMps *= 0.75f
                    }
                }
            }
        }
    }

    companion object {
        const val CHANNEL_ID = "GuardianServiceChannel"
        private const val TAG = "GuardianService"

        // Thresholds based on sensitivity
        private const val THRESHOLD_HIGH = 25f // Very sensitive, lower G force required (approx 2.5g)
        private const val THRESHOLD_MEDIUM = 35f // Approx 3.5g
        private const val THRESHOLD_LOW = 45f // Only extreme impacts (approx 4.5g)

        private const val TUMBLE_THRESHOLD = 3.0f // Rad/s over the sample period
        private const val CRASH_SPEED_KMH = 30f
        private const val TABLE_LIGHT_LUX = 80f
        private const val GAIT_ANALYSIS_WINDOW_MS = 20_000L
        private const val MIN_GAIT_LOG_INTERVAL_MS = 15 * 60 * 1000L
        private const val MIN_RESPIRATORY_LOG_INTERVAL_MS = 15 * 60 * 1000L
        private const val HIGH_RESTING_HEART_RATE_BPM = 120L
        
        const val ACTION_ACTIVITY_UPDATE = "com.example.swastik.guardian.ACTIVITY_UPDATE"
        const val EXTRA_ACTIVITY_TYPE = "EXTRA_ACTIVITY_TYPE"
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        // Register receiver for activity updates from GuardianActivityReceiver
        val filter = IntentFilter(ACTION_ACTIVITY_UPDATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(activityReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(activityReceiver, filter)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val settings = AppSettingsStore.settings.value
        if (!settings.guardianConsentAccepted || !settings.guardianFeatures.hasAnyMonitoringFeature()) {
            Log.w(TAG, "Guardian start blocked: consent or feature permissions missing")
            stopSelf()
            return START_NOT_STICKY
        }

        createNotificationChannel()
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaididea Guardian Active")
            .setContentText("Monitoring for falls and accidents")
            .setSmallIcon(android.R.drawable.ic_menu_directions) // Update with better icon later
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            val type = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH or 
                       android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            try {
                startForeground(1002, notification, type)
            } catch (e: Exception) {
                startForeground(1002, notification)
            }
        } else {
            startForeground(1002, notification)
        }

        registerSensors()
        startLocationUpdates()
        startActivityUpdates()
        startBackgroundAnalysisLoop()
        return START_STICKY
    }
    
    private fun startBackgroundAnalysisLoop() {
        scope.launch {
            while (true) {
                delay(60000) // Run every 60 seconds
                val settings = AppSettingsStore.settings.value
                if (!settings.guardianEnabled || !settings.guardianConsentAccepted) {
                    stopSelf()
                    return@launch
                }
                if (settings.guardianFeatures.mobilityAnalysis) {
                    analyzeGaitAndMobility()
                }
                if (settings.guardianFeatures.respiratoryTracker) {
                    analyzeRespiratoryDistress()
                }
            }
        }
    }
    
    private suspend fun analyzeGaitAndMobility() {
        // 3. Gait & Mobility Analysis (For Telemedicine & Recovery)
        // Checks if user is WALKING or RUNNING and analyzes accelerometer symmetry
        val isWalkingOrRunning = currentActivityType == DetectedActivity.WALKING || 
                                 currentActivityType == DetectedActivity.RUNNING
        
        if (!isWalkingOrRunning || gaitSamples.size < 40) return

        val now = System.currentTimeMillis()
        if (now - lastGaitLogMs < MIN_GAIT_LOG_INTERVAL_MS) return

        val samples = gaitSamples.toList()
        val magnitudes = samples.map { it.magnitude }
        val mean = magnitudes.average().toFloat()
        val variance = magnitudes.map { (it - mean) * (it - mean) }.average().toFloat()
        val variability = sqrt(variance.toDouble()).toFloat()
        val positiveLateral = samples.filter { it.x > 0f }.map { abs(it.x) }.averageOrZero()
        val negativeLateral = samples.filter { it.x < 0f }.map { abs(it.x) }.averageOrZero()
        val lateralTotal = positiveLateral + negativeLateral
        val asymmetry = if (lateralTotal > 0f) abs(positiveLateral - negativeLateral) / lateralTotal else 0f

        if (asymmetry > 0.42f && variability > 2.8f) {
            lastGaitLogMs = now
            guardianRepository.logEvent(
                eventType = "GAIT_ANOMALY",
                latitude = lastKnownLocation?.latitude,
                longitude = lastKnownLocation?.longitude,
                locationContext = "Walking/running sensor window",
                sensorDataSnippet = JSONObject()
                    .put("sample_count", samples.size)
                    .put("lateral_asymmetry", asymmetry)
                    .put("acceleration_variability", variability)
                    .put("activity", currentActivityType)
                    .toString()
            )
        }
    }
    
    private suspend fun analyzeRespiratoryDistress() {
        // 4. Asthma / Respiratory Distress Tracker (Location Contextual)
        // Detects low-activity state plus high wearable heart-rate from Health Connect.
        val isStill = currentActivityType == DetectedActivity.STILL || 
                      currentActivityType == DetectedActivity.UNKNOWN
        
        if (!isStill) return
        val now = System.currentTimeMillis()
        if (now - lastRespiratoryLogMs < MIN_RESPIRATORY_LOG_INTERVAL_MS) return

        val healthConnectManager = com.example.swastik.data.health.HealthConnectManager(this)
        if (!healthConnectManager.hasAllPermissions()) return

        val vitals = healthConnectManager.fetchVitalsData(days = 1)
        val tenMinutesAgo = java.time.Instant.now().minusSeconds(10 * 60)
        val recentHighHr = vitals.recentHeartRates
            .filter { it.time.isAfter(tenMinutesAgo) }
            .maxByOrNull { it.value }

        if (recentHighHr != null && recentHighHr.value >= HIGH_RESTING_HEART_RATE_BPM) {
            lastRespiratoryLogMs = now
            guardianRepository.logEvent(
                eventType = "HIGH_HR_STILL",
                latitude = lastKnownLocation?.latitude,
                longitude = lastKnownLocation?.longitude,
                locationContext = "Low activity with high wearable heart rate",
                sensorDataSnippet = JSONObject()
                    .put("heart_rate_bpm", recentHighHr.value)
                    .put("activity", currentActivityType)
                    .put("latitude", lastKnownLocation?.latitude)
                    .put("longitude", lastKnownLocation?.longitude)
                    .toString()
            )
        }
    }
    
    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L).build()
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        }
    }
    
    private fun startActivityUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) {
            val intent = Intent(this, GuardianActivityReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            ActivityRecognition.getClient(this).requestActivityUpdates(3000L, pendingIntent)
        }
    }

    private fun registerSensors() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
        proximitySensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        lightSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || isVerificationPhase) return

        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            // Calculate magnitude of acceleration vector (G-Force)
            val magnitude = sqrt((x * x + y * y + z * z).toDouble()).toFloat()
            val features = AppSettingsStore.settings.value.guardianFeatures
            if (features.mobilityAnalysis) {
                recordGaitSample(x, y, z, magnitude)
            }
            if (!features.fallDetection && !features.crashDetection) return

            // Calculate delta acceleration (jerk)
            val delta = Math.abs(magnitude - lastAcceleration)
            lastAcceleration = magnitude

            val sensitivity = AppSettingsStore.settings.value.guardianSensitivity
            val threshold = when (sensitivity) {
                "LOW" -> THRESHOLD_LOW
                "MEDIUM" -> THRESHOLD_MEDIUM
                "HIGH" -> THRESHOLD_HIGH
                else -> THRESHOLD_MEDIUM
            }

            if (delta > threshold) {
                // Potential impact detected, check gyroscope tumbling
                if (angularSpeedSum > TUMBLE_THRESHOLD) {
                    lastImpactMagnitude = magnitude
                    lastImpactDelta = delta
                    impactActivityType = currentActivityType
                    impactSpeedKmh = maxOf(lastKnownSpeed, maxVehicleSpeedMps) * 3.6f
                    triggerVerificationPhase()
                }
            }
        } else if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            val rx = event.values[0]
            val ry = event.values[1]
            val rz = event.values[2]
            
            // Angular speed magnitude
            val angularSpeed = sqrt((rx * rx + ry * ry + rz * rz).toDouble()).toFloat()
            
            // Keep a decaying sum of angular speed to represent recent tumbling
            angularSpeedSum = angularSpeedSum * 0.9f + angularSpeed
        } else if (event.sensor.type == Sensor.TYPE_PROXIMITY) {
            val maxRange = event.sensor.maximumRange
            proximityNear = event.values.firstOrNull()?.let { it < maxRange }
        } else if (event.sensor.type == Sensor.TYPE_LIGHT) {
            ambientLightLux = event.values.firstOrNull()
        }
    }

    private fun recordGaitSample(x: Float, y: Float, z: Float, magnitude: Float) {
        val isWalkingOrRunning = currentActivityType == DetectedActivity.WALKING ||
            currentActivityType == DetectedActivity.RUNNING
        val now = System.currentTimeMillis()
        if (isWalkingOrRunning) {
            gaitSamples.addLast(MotionSample(now, x, y, z, magnitude))
            while (gaitSamples.isNotEmpty() && now - gaitSamples.first().timestampMs > GAIT_ANALYSIS_WINDOW_MS) {
                gaitSamples.removeFirst()
            }
        } else {
            gaitSamples.clear()
        }
    }

    private fun triggerVerificationPhase() {
        if (isLikelyPhoneOnlyImpact()) {
            Log.d(TAG, "Impact rejected by table/pocket context filter")
            angularSpeedSum = 0f
            return
        }

        Log.d(TAG, "Impact + Tumble detected! Speed: $lastKnownSpeed m/s. Entering 10s verification phase...")
        isVerificationPhase = true
        
        // Determine Emergency Type
        val emergencyType = if (
            impactActivityType == DetectedActivity.IN_VEHICLE &&
            impactSpeedKmh >= CRASH_SPEED_KMH
        ) "Crash Detected" else "Fall Detected"

        val features = AppSettingsStore.settings.value.guardianFeatures
        val featureAllowed = if (emergencyType == "Crash Detected") {
            features.crashDetection
        } else {
            features.fallDetection
        }
        if (!featureAllowed) {
            Log.d(TAG, "$emergencyType ignored because this Guardian feature is disabled by patient consent")
            angularSpeedSum = 0f
            isVerificationPhase = false
            return
        }
        
        scope.launch {
            // Wait for 10 seconds to let the dust settle and check if user gets up
            delay(10000)
            
            // Check Activity Recognition API to verify STILL state
            verifyStillStateAndLaunchUI(emergencyType)
        }
    }

    private fun verifyStillStateAndLaunchUI(emergencyType: String) {
        // We check Activity Recognition. If the user is WALKING or RUNNING, it's a false positive.
        // If the user is STILL or we don't have permission/data, we trigger the alarm to be safe.
        
        val isStill = currentActivityType == DetectedActivity.STILL || 
                      currentActivityType == DetectedActivity.UNKNOWN ||
                      currentActivityType == DetectedActivity.IN_VEHICLE
                      
        val isWalkingOrRunning = currentActivityType == DetectedActivity.WALKING || 
                                 currentActivityType == DetectedActivity.RUNNING || 
                                 currentActivityType == DetectedActivity.ON_BICYCLE

        if (isStill || !isWalkingOrRunning) {
            Log.d(TAG, "Device is STILL. Triggering Grace Period UI! Type: $emergencyType")
            scope.launch {
                guardianRepository.logEvent(
                    eventType = if (emergencyType == "Crash Detected") "CRASH_DETECTED" else "FALL_DETECTED",
                    latitude = lastKnownLocation?.latitude,
                    longitude = lastKnownLocation?.longitude,
                    locationContext = "Post-impact activity=$currentActivityType",
                    sensorDataSnippet = JSONObject()
                        .put("impact_delta", lastImpactDelta)
                        .put("impact_magnitude", lastImpactMagnitude)
                        .put("angular_speed_score", angularSpeedSum)
                        .put("speed_kmh", impactSpeedKmh)
                        .put("activity_at_impact", impactActivityType)
                        .put("post_impact_activity", currentActivityType)
                        .put("proximity_near", proximityNear)
                        .put("ambient_light_lux", ambientLightLux)
                        .toString()
                )
            }
            launchEmergencyCountdown(emergencyType)
        } else {
            Log.d(TAG, "User is moving ($currentActivityType). False positive dismissed.")
        }
        
        // Reset and resume monitoring
        angularSpeedSum = 0f
        isVerificationPhase = false
    }

    private fun isLikelyPhoneOnlyImpact(): Boolean {
        val speedKmh = maxOf(lastKnownSpeed, maxVehicleSpeedMps) * 3.6f
        val wasStationary = impactActivityType == DetectedActivity.STILL ||
            impactActivityType == DetectedActivity.UNKNOWN
        val isFarFromBody = proximityNear == false
        val isBright = (ambientLightLux ?: 0f) >= TABLE_LIGHT_LUX
        val notVehicleCrash = speedKmh < CRASH_SPEED_KMH

        return wasStationary && isFarFromBody && isBright && notVehicleCrash
    }

    private fun launchEmergencyCountdown(emergencyType: String) {
        val gracePeriod = AppSettingsStore.settings.value.guardianGracePeriod
        
        val intent = Intent(this, com.example.swastik.ui.screens.patient.guardian.EmergencyCountdownActivity::class.java).apply {
            putExtra("GRACE_PERIOD", gracePeriod)
            putExtra("EMERGENCY_TYPE", emergencyType)
            lastKnownLocation?.let {
                putExtra("LATITUDE", it.latitude)
                putExtra("LONGITUDE", it.longitude)
            }
            putExtra("SPEED_KMH", impactSpeedKmh)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(intent)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not used
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Guardian Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
        unregisterReceiver(activityReceiver)
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) {
            val intent = Intent(this, GuardianActivityReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            ActivityRecognition.getClient(this).removeActivityUpdates(pendingIntent)
        }
        
        job.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private data class MotionSample(
        val timestampMs: Long,
        val x: Float,
        val y: Float,
        val z: Float,
        val magnitude: Float
    )

    private fun List<Float>.averageOrZero(): Float =
        if (isEmpty()) 0f else average().toFloat()
}
