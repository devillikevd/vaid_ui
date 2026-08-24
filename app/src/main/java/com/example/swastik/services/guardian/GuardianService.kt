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
import kotlin.math.max

import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import com.example.swastik.data.remote.dto.EmergencyContactAlertRequest
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.GuardianRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.util.ConsultationPerformanceState
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@AndroidEntryPoint
class GuardianService : Service(), SensorEventListener {

    @Inject
    lateinit var guardianRepository: GuardianRepository

    @Inject
    lateinit var emergencyRepository: EmergencyRepository

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var proximitySensor: Sensor? = null
    private var lightSensor: Sensor? = null
    private var pressureSensor: Sensor? = null     // V2: Barometer for elevation change
    private var stepCounterSensor: Sensor? = null  // V2: Step counter verification

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    private var isVerificationPhase = false
    private var lastAcceleration = 0f
    private var lastImpactMagnitude = 0f
    private var lastImpactDelta = 0f
    private var impactActivityType: Int = DetectedActivity.UNKNOWN
    private var impactSpeedKmh: Float = 0f
    private var lastEmergencyAlertMs: Long = 0L

    // BUG 1+7 FIX: Time-normalized angular speed tracking
    private var angularSpeedSum = 0f
    private var lastGyroTimestampNs: Long = 0L
    private var lastImpactTriggerMs: Long = 0L
    
    // BUG 2 FIX: Sticky vehicle session
    private var vehicleSessionLockedUntilMs: Long = 0L
    private var isInVehicleSession: Boolean = false
    
    // V2: Freefall detection ring buffer (stores last 500ms of accel magnitudes)
    private val freefallBuffer = ArrayDeque<AccelSample>(50)
    private var hadFreefallBeforeImpact = false
    
    // V2: Impact waveform analysis (stores samples around impact for duration measurement)
    private val impactWaveformBuffer = ArrayDeque<AccelSample>(100)
    private var impactWaveformDurationMs: Long = 0L
    
    // V2: Barometer for elevation change
    private var baselinePressureHpa: Float? = null
    private var currentPressureHpa: Float? = null
    private var pressureAtImpact: Float? = null
    
    // V2: Step counter verification
    private var stepsAtImpact: Int = -1
    private var currentStepCount: Int = -1
    
    // V2: Speed history for deceleration rate (crash detection)
    private val speedHistory = ArrayDeque<SpeedSample>(30)
    private var maxDecelerationMpsPerSec: Float = 0f
    
    // V2: Multi-axis impact pattern
    private var lastImpactX: Float = 0f
    private var lastImpactY: Float = 0f
    private var lastImpactZ: Float = 0f
    
    // V2: Post-impact orientation tracking
    private var wasUprightBeforeImpact: Boolean = true
    private var isHorizontalAfterImpact: Boolean = false
    
    // V2: Post-crash silence detection
    private var postCrashAccelVariance: Float = 0f
    
    // V2: Audio crash analysis
    private var audioImpactDetected: Boolean = false
    
    // V2: Enhanced gait — walking session tracking
    private var walkSessionStartMs: Long = 0L
    private var walkSessionStartSteps: Int = -1
    private var walkSessionStartLocation: Location? = null
    private val gaitVariabilityWindows = mutableListOf<Float>()  // Track variability over time for fatigue
    private var turnCount: Int = 0
    private var turnInstabilitySum: Float = 0f
    private var lastLateralAccel: Float = 0f
    
    // GPS & Activity Recognition
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var lastKnownSpeed: Float = 0f // in m/s
    private var maxVehicleSpeedMps: Float = 0f
    private var lastLocationUpdateMs: Long = 0L

    // Fix 2: Dynamic sensor sampling rate (50Hz vs 5Hz for battery sentinel)
    private var currentSensorDelay: Int = SensorManager.SENSOR_DELAY_GAME
    private var isSensorThrottled: Boolean = false

    // Fix 4: Sensor capability tier for budget phones
    private var sensorCapabilityLevel: String = "FULL" // FULL, STANDARD, BASIC

    // Fix 6: Extreme sports tracking
    private val highGWindow = ArrayDeque<Long>(20)
    private var isExtremeSportsContext: Boolean = false

    // Fix 3: Soft fall baseline heart rate & steps tracking
    private var baselineRestingHeartRate: Long? = null
    private var lastSoftFallAlertMs: Long = 0L
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
                val rawActivity = intent.getIntExtra(EXTRA_ACTIVITY_TYPE, DetectedActivity.UNKNOWN)
                
                // BUG 2 FIX: Sticky vehicle session — don't let flicker override vehicle context
                val now = System.currentTimeMillis()
                if (rawActivity == DetectedActivity.IN_VEHICLE) {
                    // Entering or refreshing vehicle session
                    isInVehicleSession = true
                    vehicleSessionLockedUntilMs = now + 60_000L  // Lock for 60s
                    currentActivityType = DetectedActivity.IN_VEHICLE
                } else if (isInVehicleSession && now < vehicleSessionLockedUntilMs) {
                    // Vehicle session locked — ignore TILTING/STILL/UNKNOWN flicker
                    Log.d(TAG, "Activity flicker ignored ($rawActivity), vehicle session locked")
                    return
                } else if (isInVehicleSession && lastKnownSpeed * 3.6f < 5f) {
                    // Vehicle session expired AND speed is low — allow exit
                    isInVehicleSession = false
                    currentActivityType = rawActivity
                } else if (isInVehicleSession) {
                    // Session expired but still moving — extend lock
                    vehicleSessionLockedUntilMs = now + 30_000L
                    Log.d(TAG, "Vehicle session extended, still moving at ${lastKnownSpeed * 3.6f} km/h")
                    return
                } else {
                    currentActivityType = rawActivity
                }
                
                guardianRepository.updateTelemetry { it.copy(activityType = currentActivityType) }
                if (ConsultationPerformanceState.isVideoConsultationActive) return
                Log.d(TAG, "Current Activity Updated: $currentActivityType (raw=$rawActivity, vehicleSession=$isInVehicleSession)")
            }
        }
    }
    
    private var previousLocation: Location? = null
    private var previousLocationTimeMs: Long = 0L

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            super.onLocationResult(result)
            result.lastLocation?.let { loc ->
                val nowMs = System.currentTimeMillis()
                var calculatedSpeedMps = 0f

                // 1. Direct hardware speed if available
                if (loc.hasSpeed() && loc.speed > 0.1f) {
                    calculatedSpeedMps = loc.speed
                } else {
                    // 2. Fallback: coordinate delta calculation (crucial for Samsung/Qualcomm Fused Location chips)
                    previousLocation?.let { prevLoc ->
                        val timeDeltaSec = (loc.time - prevLoc.time) / 1000f
                        if (timeDeltaSec in 0.5f..15f) {
                            val distMeters = prevLoc.distanceTo(loc)
                            // Filter out GPS drift jitter
                            val accuracyJitter = if (loc.hasAccuracy() && prevLoc.hasAccuracy()) {
                                (loc.accuracy + prevLoc.accuracy) * 0.25f
                            } else 5f

                            if (distMeters > accuracyJitter || distMeters > 3f) {
                                val rawSpeed = distMeters / timeDeltaSec
                                if (rawSpeed in 0.5f..80f) { // Up to ~288 km/h
                                    calculatedSpeedMps = rawSpeed
                                }
                            }
                        }
                    }
                }

                previousLocation = loc
                previousLocationTimeMs = nowMs
                lastKnownLocation = loc
                lastLocationUpdateMs = nowMs

                var finalSpeedMps = calculatedSpeedMps
                val speedKmh = finalSpeedMps * 3.6f

                // If moving at vehicle speeds (> 20 km/h), auto-promote activity to IN_VEHICLE
                if (speedKmh >= 20f && currentActivityType != DetectedActivity.IN_VEHICLE) {
                    currentActivityType = DetectedActivity.IN_VEHICLE
                    guardianRepository.updateTelemetry { it.copy(activityType = currentActivityType) }
                }

                val isPoorAccuracy = loc.hasAccuracy() && loc.accuracy > 50f
                val isVehicle = currentActivityType == DetectedActivity.IN_VEHICLE ||
                                currentActivityType == DetectedActivity.ON_BICYCLE ||
                                speedKmh > 15f

                // Only clamp if poor accuracy AND low speed AND stationary context
                if (isPoorAccuracy && !isVehicle && finalSpeedMps < 2f) {
                    finalSpeedMps = 0f
                }

                lastKnownSpeed = finalSpeedMps // speed in m/s
                val finalSpeedKmh = finalSpeedMps * 3.6f
                guardianRepository.updateTelemetry { 
                    it.copy(
                        speedKmh = finalSpeedKmh,
                        locationAgeSec = 0L,
                        locationAccuracyM = loc.accuracy
                    ) 
                }

                if (isVehicle || finalSpeedKmh >= 20f) {
                    maxVehicleSpeedMps = maxOf(maxVehicleSpeedMps * 0.95f, finalSpeedMps)
                } else {
                    maxVehicleSpeedMps *= 0.8f
                }

                // V2: Record speed history for deceleration analysis
                speedHistory.addLast(SpeedSample(nowMs, finalSpeedMps))
                while (speedHistory.size > 30) speedHistory.removeFirst()
                maxDecelerationMpsPerSec = calculateMaxDeceleration()

                Log.d(TAG, "Location update: speed=${finalSpeedKmh}km/h (mps=$finalSpeedMps, decel=${maxDecelerationMpsPerSec}m/s², acc=${loc.accuracy}m, act=$currentActivityType)")
            }
        }
    }

    companion object {
        const val CHANNEL_ID = "GuardianServiceChannel"
        private const val TAG = "GuardianService"
        private const val CRASH_ALERT_CHANNEL_ID = "GuardianCrashAlertChannel"
        private const val CRASH_ALERT_NOTIFICATION_ID = 1003
        private const val GENTLE_ALERT_CHANNEL_ID = "GuardianGentleAlertChannel"
        private const val GENTLE_ALERT_NOTIFICATION_ID = 1004

        // Thresholds based on sensitivity
        private const val THRESHOLD_HIGH = 35f // Approx 3.5g
        private const val THRESHOLD_MEDIUM = 45f // Approx 4.5g
        private const val THRESHOLD_LOW = 60f // Only extreme impacts

        private const val TUMBLE_THRESHOLD = 4.8f // Rad/s over the recent sample period
        private const val CRASH_TUMBLE_THRESHOLD = 6.0f
        private const val CRASH_SPEED_KMH = 45f
        private const val FALL_MAX_SPEED_KMH = 12f
        private const val FALL_MIN_IMPACT_DELTA = 48f
        private const val CRASH_MIN_IMPACT_DELTA = 55f
        private const val MIN_ALERT_INTERVAL_MS = 2 * 60 * 1000L
        private const val TABLE_LIGHT_LUX = 80f
        private const val GAIT_ANALYSIS_WINDOW_MS = 20_000L
        private const val MIN_GAIT_LOG_INTERVAL_MS = 15 * 60 * 1000L
        private const val MIN_RESPIRATORY_LOG_INTERVAL_MS = 15 * 60 * 1000L
        private const val HIGH_RESTING_HEART_RATE_BPM = 120L
        
        // V2: Freefall & Impact waveform constants
        private const val FREEFALL_THRESHOLD_G = 2.0f      // Below ~0.2G = freefall (magnitude ~2.0 vs 9.8 normal)
        private const val FREEFALL_MIN_DURATION_MS = 80L    // Minimum 80ms of freefall
        private const val IMPACT_WAVEFORM_FALL_MAX_MS = 300L  // Fall impacts are wider (~200ms)
        private const val IMPACT_WAVEFORM_DROP_MAX_MS = 80L   // Phone drops are sharper (~50ms)
        
        // V2: Barometer elevation change
        private const val FALL_ELEVATION_CHANGE_M = 0.3f    // ~30cm height loss detectable
        private const val HPA_PER_METER = 0.12f              // Rough conversion at sea level
        
        // V2: Crash deceleration
        private const val CRASH_DECELERATION_THRESHOLD = 8.0f  // m/s² deceleration rate
        
        // V2: Post-crash silence
        private const val POST_CRASH_SILENCE_VARIANCE = 1.5f  // Very low accel variance = phone stationary
        
        // V2: Audio impact
        private const val AUDIO_IMPACT_THRESHOLD = 25000  // Raw amplitude threshold for loud crash
        
        // V2: Gait turn detection
        private const val TURN_LATERAL_SPIKE_THRESHOLD = 4.0f  // m/s² lateral acceleration = turn
        private const val GAIT_FATIGUE_VARIABILITY_INCREASE = 0.4f  // 40% increase = fatigue

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
        pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)       // V2: Barometer
        stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) // V2: Steps

        // Fix 4: Evaluate sensor capability tier for budget phones
        val hasAccel = accelerometer != null
        val hasGyro = gyroscope != null
        val hasBaro = pressureSensor != null
        sensorCapabilityLevel = when {
            hasAccel && hasGyro && hasBaro -> "FULL"
            hasAccel && hasGyro -> "STANDARD"
            else -> "BASIC"
        }
        guardianRepository.updateTelemetry { it.copy(sensorCapabilityLevel = sensorCapabilityLevel) }
        Log.i(TAG, "Guardian Hardware Capability Tier: $sensorCapabilityLevel (accel=$hasAccel, gyro=$hasGyro, baro=$hasBaro)")
        
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

        // Fix 1c: Schedule periodic keepalive watchdog to survive aggressive OEM background kills
        GuardianWatchdogWorker.schedule(this)

        createNotificationChannel()
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaididea Guardian Active")
            .setContentText(getString(R.string.monitoring_for_falls_and_accidents))
            .setSmallIcon(android.R.drawable.ic_menu_directions)
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
            val healthConnectManager = com.example.swastik.data.health.HealthConnectManager(this@GuardianService)
            while (true) {
                delay(30000) // Run every 30 seconds
                val settings = AppSettingsStore.settings.value
                if (!settings.guardianEnabled || !settings.guardianConsentAccepted) {
                    stopSelf()
                    return@launch
                }
                if (ConsultationPerformanceState.isVideoConsultationActive) {
                    continue
                }

                // 1. Sync wearable heart rate & steps from Health Connect (Fix 8: Permission monitoring)
                var latestHr: Long? = null
                try {
                    val hasHCPermissions = healthConnectManager.hasPermissions()
                    guardianRepository.updateTelemetry { it.copy(isHealthConnectConnected = hasHCPermissions) }

                    if (hasHCPermissions) {
                        val vitals = healthConnectManager.fetchVitalsData(days = 1)
                        val tenMinAgo = java.time.Instant.now().minusSeconds(600)
                        latestHr = vitals.recentHeartRates.filter { it.time.isAfter(tenMinAgo) }.lastOrNull()?.value
                        val todaySteps = vitals.dailySteps.sumOf { it.value }
                        guardianRepository.updateTelemetry { 
                            it.copy(
                                wearableHeartRateBpm = latestHr,
                                wearableSteps = if (todaySteps > 0) todaySteps else it.wearableSteps
                            )
                        }

                        // Fix 3: Check for wearable-assisted soft/slow falls (HR spike + still horizontal posture)
                        checkWearableAssistedSoftFall(latestHr)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Health Connect live sync failed: ${e.message}")
                    guardianRepository.updateTelemetry { it.copy(isHealthConnectConnected = false) }
                }

                // 2. Battery & Power Sentinel Mode (Fix 2: Actually throttle sensors when eco mode is active)
                try {
                    val bFilter = android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED)
                    val bIntent = registerReceiver(null, bFilter)
                    val level = bIntent?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
                    val scale = bIntent?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
                    val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100
                    val isStationary = currentActivityType == DetectedActivity.STILL
                    val isPowerSaver = batteryPct <= 15 || (isStationary && proximityNear == false && (ambientLightLux ?: 0f) >= TABLE_LIGHT_LUX)
                    
                    // Fix 2: Dynamically re-register sensors at SENSOR_DELAY_NORMAL (5Hz) to actually save power
                    adjustSensorSamplingRate(isPowerSaver)

                    // Fix 5: Compute GPS freshness & accuracy
                    val nowMs = System.currentTimeMillis()
                    val locAge = if (lastLocationUpdateMs > 0L) (nowMs - lastLocationUpdateMs) / 1000L
                                 else if (lastKnownLocation != null) (nowMs - lastKnownLocation!!.time) / 1000L
                                 else 9999L
                    val locAcc = lastKnownLocation?.accuracy ?: 0f

                    guardianRepository.updateTelemetry {
                        it.copy(
                            batteryLevelPercent = batteryPct,
                            isPowerSaverMode = isPowerSaver,
                            locationAgeSec = locAge,
                            locationAccuracyM = locAcc
                        )
                    }
                } catch (_: Exception) {}

                if (settings.guardianFeatures.mobilityAnalysis) {
                    analyzeGaitAndMobility()
                }
                if (settings.guardianFeatures.respiratoryTracker) {
                    analyzeRespiratoryDistress()
                }
            }
        }
    }

    // Fix 2: Adjust hardware sensor sampling rate (50Hz GAME vs 5Hz NORMAL)
    private fun adjustSensorSamplingRate(isPowerSaver: Boolean) {
        val targetDelay = if (isPowerSaver) SensorManager.SENSOR_DELAY_NORMAL else SensorManager.SENSOR_DELAY_GAME
        if (currentSensorDelay == targetDelay) return

        currentSensorDelay = targetDelay
        isSensorThrottled = isPowerSaver

        // Re-register accelerometer & gyroscope with updated delay
        accelerometer?.let {
            sensorManager.unregisterListener(this, it)
            sensorManager.registerListener(this, it, currentSensorDelay)
        }
        gyroscope?.let {
            sensorManager.unregisterListener(this, it)
            sensorManager.registerListener(this, it, currentSensorDelay)
        }
        guardianRepository.updateTelemetry { it.copy(isSensorThrottled = isSensorThrottled) }
        Log.i(TAG, "Sensor sampling rate dynamically adjusted: delay=$currentSensorDelay (isPowerSaver=$isPowerSaver, throttled=$isSensorThrottled)")
    }

    // Fix 3: Soft fall wearable correlation
    private suspend fun checkWearableAssistedSoftFall(latestHr: Long?) {
        if (latestHr == null) return
        val features = AppSettingsStore.settings.value.guardianFeatures
        if (!features.fallDetection) return

        if (currentActivityType == DetectedActivity.STILL && (baselineRestingHeartRate == null || baselineRestingHeartRate == 0L)) {
            baselineRestingHeartRate = latestHr
        } else if (currentActivityType == DetectedActivity.STILL && latestHr < (baselineRestingHeartRate ?: 80L)) {
            baselineRestingHeartRate = ((baselineRestingHeartRate ?: 75L) * 0.9f + latestHr * 0.1f).toLong()
        }

        val baseline = baselineRestingHeartRate ?: 75L
        val hrSpike = latestHr >= (baseline * 1.40f).toLong() // >40% pulse spike
        val isStillOrUnknown = currentActivityType == DetectedActivity.STILL || currentActivityType == DetectedActivity.UNKNOWN
        val isHorizontal = !guardianRepository.telemetryFlow.value.isUpright
        val now = System.currentTimeMillis()

        if (hrSpike && isStillOrUnknown && isHorizontal && (now - lastSoftFallAlertMs > MIN_ALERT_INTERVAL_MS)) {
            lastSoftFallAlertMs = now
            Log.w(TAG, "⚠️ Wearable-assisted SOFT FALL detected: HR=$latestHr (baseline=$baseline), Activity=$currentActivityType, Horizontal=$isHorizontal")
            guardianRepository.logEvent(
                eventType = "SOFT_FALL_SUSPECTED",
                latitude = lastKnownLocation?.latitude,
                longitude = lastKnownLocation?.longitude,
                locationContext = "Soft slump/fall identified via wearable HR spike + stationary horizontal posture",
                sensorDataSnippet = JSONObject()
                    .put("heart_rate_bpm", latestHr)
                    .put("baseline_hr", baseline)
                    .put("is_horizontal", isHorizontal)
                    .put("activity", currentActivityType)
                    .toString()
            )
            launchGentleSoftFallAlert(latestHr)
        }
    }

    // Fix 3: Gentle alert for soft fall
    private fun launchGentleSoftFallAlert(hr: Long) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? android.os.VibratorManager
            vm?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(android.os.VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400), -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(longArrayOf(0, 400, 200, 400), -1)
        }

        val intent = Intent(this, com.example.swastik.ui.screens.patient.guardian.EmergencyCountdownActivity::class.java).apply {
            putExtra("GRACE_PERIOD", 45) // Longer grace period for soft fall
            putExtra("EMERGENCY_TYPE", "Soft Fall / Health Anomaly")
            lastKnownLocation?.let {
                putExtra("LATITUDE", it.latitude)
                putExtra("LONGITUDE", it.longitude)
            }
            putExtra("SPEED_KMH", 0f)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            GENTLE_ALERT_NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, GENTLE_ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Are you feeling unwell? 🩺")
            .setContentText("A sudden pulse spike ($hr BPM) and stationary horizontal posture were detected. Tap if you need assistance.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(GENTLE_ALERT_NOTIFICATION_ID, notification)
    }
    
    private suspend fun analyzeGaitAndMobility() {
        val isWalkingOrRunning = currentActivityType == DetectedActivity.WALKING || 
                                 currentActivityType == DetectedActivity.RUNNING
        
        if (!isWalkingOrRunning || gaitSamples.size < 40) return
        
        // BUG 6 FIX: Skip gait analysis if moving at vehicle speeds
        if (lastKnownSpeed * 3.6f > 10f || isInVehicleSession) return

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

        // Step peak detection for walking cadence
        var stepPeaks = 0
        for (i in 1 until samples.size - 1) {
            val prev = samples[i - 1].magnitude
            val curr = samples[i].magnitude
            val next = samples[i + 1].magnitude
            if (curr > 11.2f && curr > prev && curr > next) {
                stepPeaks++
            }
        }
        val windowDurationSec = ((samples.last().timestampMs - samples.first().timestampMs) / 1000f).coerceAtLeast(1f)
        val cadenceSpm = ((stepPeaks / windowDurationSec) * 60f).toInt().coerceIn(40, 200)
        val symmetryPercent = ((1.0f - asymmetry) * 100f).coerceIn(0f, 100f).toInt()

        // V2: Walking speed from GPS
        val walkingSpeedKmh = lastKnownSpeed * 3.6f
        
        // V2: Stride length estimation (GPS distance / step count)
        var strideLengthM: Float? = null
        val sessionSteps = if (walkSessionStartSteps >= 0 && currentStepCount >= 0) {
            currentStepCount - walkSessionStartSteps
        } else 0
        val sessionLocation = walkSessionStartLocation
        if (sessionSteps > 5 && sessionLocation != null && lastKnownLocation != null) {
            val distanceM = sessionLocation.distanceTo(lastKnownLocation!!)
            if (distanceM > 5f && distanceM < 2000f) {  // Sanity check
                strideLengthM = distanceM / sessionSteps.toFloat()
            }
        }
        
        // V2: Fatigue scoring — track variability increase over the walk
        gaitVariabilityWindows.add(variability)
        val fatigueScore = if (gaitVariabilityWindows.size >= 3) {
            val firstHalf = gaitVariabilityWindows.take(gaitVariabilityWindows.size / 2).average().toFloat()
            val secondHalf = gaitVariabilityWindows.takeLast(gaitVariabilityWindows.size / 2).average().toFloat()
            if (firstHalf > 0f) ((secondHalf - firstHalf) / firstHalf).coerceIn(0f, 1f) else 0f
        } else 0f
        
        // V2: Turn instability score
        val turnInstabilityScore = if (turnCount > 0) turnInstabilitySum / turnCount else 0f
        
        // V2: Multi-window trend — compare against historical average
        val sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000L
        val historicalAvgSymmetry = guardianRepository.getAverageSymmetrySince(sevenDaysAgo)
        val trendDelta = if (historicalAvgSymmetry != null && historicalAvgSymmetry > 0f) {
            symmetryPercent - historicalAvgSymmetry
        } else null

        val isAnomalous = asymmetry > 0.42f && variability > 2.8f
        
        // Always log (even normal sessions for trending), but at different intervals
        lastGaitLogMs = now
        
        // V2: Save gait session to Room for trending
        val session = com.example.swastik.data.local.db.GaitSessionEntity(
            timestamp = now,
            durationSec = windowDurationSec,
            cadenceSpm = cadenceSpm,
            symmetryPercent = symmetryPercent,
            lateralAsymmetry = asymmetry,
            accelerationVariability = variability,
            sampleCount = samples.size,
            strideLengthMeters = strideLengthM,
            walkingSpeedKmh = if (walkingSpeedKmh > 0.5f) walkingSpeedKmh else null,
            fatigueScore = fatigueScore,
            variabilityTrend = trendDelta?.toFloat(),
            turnCount = turnCount,
            turnInstabilityScore = if (turnCount > 0) turnInstabilityScore else null,
            activityType = currentActivityType,
            latitude = lastKnownLocation?.latitude,
            longitude = lastKnownLocation?.longitude,
            isAnomalous = isAnomalous
        )
        guardianRepository.saveGaitSession(session)
        
        if (isAnomalous) {
            guardianRepository.logEvent(
                eventType = "GAIT_ANOMALY",
                latitude = lastKnownLocation?.latitude,
                longitude = lastKnownLocation?.longitude,
                locationContext = "Walking/running sensor window",
                sensorDataSnippet = JSONObject()
                    .put("sample_count", samples.size)
                    .put("lateral_asymmetry", asymmetry)
                    .put("symmetry_percent", symmetryPercent)
                    .put("cadence_spm", cadenceSpm)
                    .put("acceleration_variability", variability)
                    .put("activity", currentActivityType)
                    // V2 metrics
                    .put("v2_walking_speed_kmh", walkingSpeedKmh)
                    .put("v2_stride_length_m", strideLengthM)
                    .put("v2_fatigue_score", fatigueScore)
                    .put("v2_turn_count", turnCount)
                    .put("v2_turn_instability", turnInstabilityScore)
                    .put("v2_7day_symmetry_trend", trendDelta)
                    .put("v2_session_steps", sessionSteps)
                    .toString()
            )
        }
    }
    
    // V2: Save completed walking session
    private suspend fun saveGaitSession() {
        if (gaitSamples.size < 40) return
        val samples = gaitSamples.toList()
        val magnitudes = samples.map { it.magnitude }
        val mean = magnitudes.average().toFloat()
        val variance = magnitudes.map { (it - mean) * (it - mean) }.average().toFloat()
        val variability = sqrt(variance.toDouble()).toFloat()
        val positiveLateral = samples.filter { it.x > 0f }.map { abs(it.x) }.averageOrZero()
        val negativeLateral = samples.filter { it.x < 0f }.map { abs(it.x) }.averageOrZero()
        val lateralTotal = positiveLateral + negativeLateral
        val asymmetry = if (lateralTotal > 0f) abs(positiveLateral - negativeLateral) / lateralTotal else 0f
        val windowDurationSec = ((samples.last().timestampMs - samples.first().timestampMs) / 1000f).coerceAtLeast(1f)
        val symmetryPercent = ((1.0f - asymmetry) * 100f).coerceIn(0f, 100f).toInt()
        var stepPeaks = 0
        for (i in 1 until samples.size - 1) {
            if (samples[i].magnitude > 11.2f && samples[i].magnitude > samples[i-1].magnitude && samples[i].magnitude > samples[i+1].magnitude) {
                stepPeaks++
            }
        }
        val cadenceSpm = ((stepPeaks / windowDurationSec) * 60f).toInt().coerceIn(40, 200)
        
        val session = com.example.swastik.data.local.db.GaitSessionEntity(
            timestamp = System.currentTimeMillis(),
            durationSec = windowDurationSec,
            cadenceSpm = cadenceSpm,
            symmetryPercent = symmetryPercent,
            lateralAsymmetry = asymmetry,
            accelerationVariability = variability,
            sampleCount = samples.size,
            walkingSpeedKmh = if (lastKnownSpeed * 3.6f > 0.5f) lastKnownSpeed * 3.6f else null,
            activityType = currentActivityType,
            latitude = lastKnownLocation?.latitude,
            longitude = lastKnownLocation?.longitude,
            isAnomalous = asymmetry > 0.42f && variability > 2.8f
        )
        guardianRepository.saveGaitSession(session)
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
        val hasFine = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (hasFine || hasCoarse) {
            val priority = if (hasFine) Priority.PRIORITY_HIGH_ACCURACY else Priority.PRIORITY_BALANCED_POWER_ACCURACY
            val locationRequest = LocationRequest.Builder(priority, 1000L)
                .setMinUpdateIntervalMillis(500L)
                .setMinUpdateDistanceMeters(0f)
                .setMaxUpdateDelayMillis(1500L)
                .setWaitForAccurateLocation(false)
                .build()

            try {
                fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
                
                // Immediately seed with last known location
                fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                    loc?.let {
                        lastKnownLocation = it
                        previousLocation = it
                        if (it.hasSpeed() && it.speed > 0f) {
                            val spdKmh = it.speed * 3.6f
                            lastKnownSpeed = it.speed
                            guardianRepository.updateTelemetry { t -> t.copy(speedKmh = spdKmh) }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting location updates", e)
            }
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
        // BUG 5 FIX: Use SENSOR_DELAY_GAME (~20ms) for consistent timing across devices
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroscope?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        proximitySensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        lightSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        // V2: Barometer for elevation change detection
        pressureSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        // V2: Step counter for post-impact verification
        stepCounterSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }
    
    // V2: Calculate max deceleration from speed history
    private fun calculateMaxDeceleration(): Float {
        if (speedHistory.size < 2) return 0f
        var maxDecel = 0f
        val samples = speedHistory.toList()
        for (i in 1 until samples.size) {
            val dt = (samples[i].timestampMs - samples[i-1].timestampMs) / 1000f
            if (dt > 0.1f && dt < 10f) {
                val decel = (samples[i-1].speedMps - samples[i].speedMps) / dt
                if (decel > maxDecel) maxDecel = decel
            }
        }
        return maxDecel
    }
    
    // V2: Detect freefall phase in recent buffer
    private fun detectFreefallPhase(): Boolean {
        if (freefallBuffer.size < 3) return false
        val samples = freefallBuffer.toList()
        // Look for consecutive samples below freefall threshold
        var freefallStartMs = 0L
        var freefallEndMs = 0L
        for (sample in samples) {
            if (sample.magnitude < FREEFALL_THRESHOLD_G) {
                if (freefallStartMs == 0L) freefallStartMs = sample.timestampMs
                freefallEndMs = sample.timestampMs
            } else {
                if (freefallEndMs - freefallStartMs >= FREEFALL_MIN_DURATION_MS) {
                    return true  // Found freefall phase!
                }
                freefallStartMs = 0L
            }
        }
        return (freefallEndMs - freefallStartMs) >= FREEFALL_MIN_DURATION_MS
    }
    
    // V2: Measure impact waveform duration (time above threshold)
    private fun measureImpactDuration(threshold: Float): Long {
        if (impactWaveformBuffer.isEmpty()) return 0L
        val samples = impactWaveformBuffer.toList()
        var startMs = 0L
        var endMs = 0L
        for (sample in samples) {
            val delta = abs(sample.magnitude - 9.8f)  // Deviation from 1G
            if (delta > threshold * 0.5f) {
                if (startMs == 0L) startMs = sample.timestampMs
                endMs = sample.timestampMs
            }
        }
        return if (startMs > 0L) endMs - startMs else 0L
    }
    
    // V2: Check if multi-axis spike (all axes spiked = real crash, Z-only = road bump)
    private fun isMultiAxisImpact(): Boolean {
        val xSpike = abs(lastImpactX) > 8f
        val ySpike = abs(lastImpactY) > 8f
        val zSpike = abs(lastImpactZ) > 8f
        val axisCount = listOf(xSpike, ySpike, zSpike).count { it }
        return axisCount >= 2  // At least 2 axes spiked
    }
    
    // V2: Estimate elevation change from barometer
    private fun getElevationChangeMetersSinceBaseline(): Float {
        val baseline = baselinePressureHpa ?: return 0f
        val current = pressureAtImpact ?: currentPressureHpa ?: return 0f
        return (baseline - current) / HPA_PER_METER  // Positive = went down
    }
    
    // V2: Quick audio peak detection for crash sounds
    private fun detectAudioImpact() {
        scope.launch {
            try {
                if (ActivityCompat.checkSelfPermission(this@GuardianService, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return@launch
                val recorder = android.media.AudioRecord(
                    android.media.MediaRecorder.AudioSource.MIC,
                    8000, // Low sample rate for efficiency
                    android.media.AudioFormat.CHANNEL_IN_MONO,
                    android.media.AudioFormat.ENCODING_PCM_16BIT,
                    4096
                )
                if (recorder.state != android.media.AudioRecord.STATE_INITIALIZED) {
                    recorder.release()
                    return@launch
                }
                recorder.startRecording()
                val buffer = ShortArray(2048)
                val read = recorder.read(buffer, 0, buffer.size)
                recorder.stop()
                recorder.release()
                if (read > 0) {
                    val maxAmplitude = buffer.take(read).maxOfOrNull { abs(it.toInt()) } ?: 0
                    audioImpactDetected = maxAmplitude > AUDIO_IMPACT_THRESHOLD
                    Log.d(TAG, "V2 Audio impact check: maxAmplitude=$maxAmplitude, detected=$audioImpactDetected")
                }
            } catch (e: Exception) {
                Log.w(TAG, "V2 Audio impact detection failed: ${e.message}")
            }
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (ConsultationPerformanceState.isVideoConsultationActive) {
            guardianRepository.updateTelemetry { it.copy(isConsultationPaused = true) }
            return
        }

        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            
            // Push upright status and 3D device tilt angles
            val isCurrentlyUpright = y > 5f
            val magnitude = sqrt((x * x + y * y + z * z).toDouble()).toFloat()
            val gForce = magnitude / 9.80665f
            val now = System.currentTimeMillis()

            val pitchDeg = (Math.atan2(-x.toDouble(), sqrt((y * y + z * z).toDouble())) * 180.0 / Math.PI).toFloat()
            val rollDeg = (Math.atan2(y.toDouble(), z.toDouble()) * 180.0 / Math.PI).toFloat()

            // Fix 6: Extreme sports tracking (sustained high-G detection)
            if (gForce > 2.5f) {
                highGWindow.addLast(now)
                while (highGWindow.isNotEmpty() && now - highGWindow.first() > 3000L) highGWindow.removeFirst()
                isExtremeSportsContext = highGWindow.size >= 12 && 
                    (currentActivityType == DetectedActivity.ON_BICYCLE || 
                     currentActivityType == DetectedActivity.ON_FOOT || 
                     currentActivityType == DetectedActivity.RUNNING)
            } else {
                while (highGWindow.isNotEmpty() && now - highGWindow.first() > 3000L) highGWindow.removeFirst()
                if (highGWindow.isEmpty()) isExtremeSportsContext = false
            }

            guardianRepository.updateTelemetry { 
                it.copy(
                    isUpright = isCurrentlyUpright,
                    currentGForce = gForce,
                    pitchDegrees = pitchDeg,
                    rollDegrees = rollDeg,
                    isMonitoringActive = true,
                    isConsultationPaused = false,
                    isExtremeActivityDetected = isExtremeSportsContext
                ) 
            }
            
            // V2: Record into freefall ring buffer (last ~500ms)
            freefallBuffer.addLast(AccelSample(now, magnitude))
            while (freefallBuffer.size > 50) freefallBuffer.removeFirst()
            
            // V2: Record into impact waveform buffer (last ~2s)
            impactWaveformBuffer.addLast(AccelSample(now, magnitude))
            while (impactWaveformBuffer.size > 100) impactWaveformBuffer.removeFirst()
            
            // V2: Track lateral acceleration for turn detection in gait
            lastLateralAccel = abs(x)
            
            val features = AppSettingsStore.settings.value.guardianFeatures
            if (features.mobilityAnalysis) {
                recordGaitSample(x, y, z, magnitude)
            }
            if (!features.fallDetection && !features.crashDetection) return

            // Calculate delta acceleration (jerk)
            val delta = Math.abs(magnitude - lastAcceleration)
            lastAcceleration = magnitude

            // BUG 2 FIX: Skip impact detection entirely during vehicle sessions
            if (isInVehicleSession || lastKnownSpeed * 3.6f > 15f) return

            val sensitivity = AppSettingsStore.settings.value.guardianSensitivity
            val threshold = when (sensitivity) {
                "LOW" -> THRESHOLD_LOW
                "MEDIUM" -> THRESHOLD_MEDIUM
                "HIGH" -> THRESHOLD_HIGH
                else -> THRESHOLD_MEDIUM
            }

            // BUG 7 FIX: Auto-reset angular speed after 5s of no impact triggers
            if (now - lastImpactTriggerMs > 5000L && lastImpactTriggerMs > 0L) {
                angularSpeedSum = 0f
            }

            if (delta > threshold) {
                // Fix 4: Budget phone fallback if gyroscope is missing/simulated
                val effectiveTumbleThreshold = if (sensorCapabilityLevel == "BASIC") TUMBLE_THRESHOLD * 0.6f else TUMBLE_THRESHOLD
                val hasTumble = angularSpeedSum > effectiveTumbleThreshold || 
                    (sensorCapabilityLevel == "BASIC" && delta > threshold * 1.35f)

                // Potential impact detected, check gyroscope tumbling
                if (hasTumble) {
                    lastImpactTriggerMs = now
                    lastImpactMagnitude = magnitude
                    lastImpactDelta = delta
                    impactActivityType = currentActivityType
                    impactSpeedKmh = maxOf(lastKnownSpeed, maxVehicleSpeedMps) * 3.6f
                    
                    // V2: Capture multi-axis impact pattern
                    lastImpactX = x
                    lastImpactY = y
                    lastImpactZ = z
                    
                    // V2: Detect freefall phase before this impact
                    hadFreefallBeforeImpact = detectFreefallPhase()
                    
                    // V2: Measure impact waveform duration
                    impactWaveformDurationMs = measureImpactDuration(threshold)
                    
                    // V2: Capture pressure at impact for elevation comparison
                    pressureAtImpact = currentPressureHpa
                    
                    // V2: Record orientation before impact
                    wasUprightBeforeImpact = isCurrentlyUpright
                    
                    // V2: Record steps at impact
                    stepsAtImpact = currentStepCount
                    
                    // V2: Trigger audio analysis
                    detectAudioImpact()
                    
                    triggerVerificationPhase()
                }
            }
        } else if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            val rx = event.values[0]
            val ry = event.values[1]
            val rz = event.values[2]
            
            // Angular speed magnitude
            val angularSpeed = sqrt((rx * rx + ry * ry + rz * rz).toDouble()).toFloat()
            val angularDps = angularSpeed * 57.2958f // rad/s to deg/s
            
            guardianRepository.updateTelemetry { 
                it.copy(
                    angularVelocityDps = angularDps,
                    isConsultationPaused = false
                ) 
            }
            
            // BUG 1 FIX: Time-normalized angular speed accumulation
            val nowNs = event.timestamp
            if (lastGyroTimestampNs > 0L) {
                val dtSec = (nowNs - lastGyroTimestampNs) / 1_000_000_000f
                val decayFactor = Math.pow(0.1, dtSec.toDouble()).toFloat()
                angularSpeedSum = (angularSpeedSum * decayFactor + angularSpeed * dtSec * 50f).coerceAtMost(20f)
            }
            lastGyroTimestampNs = nowNs
        } else if (event.sensor.type == Sensor.TYPE_PROXIMITY) {
            val maxRange = event.sensor.maximumRange
            proximityNear = event.values.firstOrNull()?.let { it < maxRange }
            guardianRepository.updateTelemetry { 
                it.copy(isProximityNear = proximityNear ?: false) 
            }
        } else if (event.sensor.type == Sensor.TYPE_LIGHT) {
            ambientLightLux = event.values.firstOrNull()
            guardianRepository.updateTelemetry { 
                it.copy(ambientLightLux = ambientLightLux ?: 0f) 
            }
        } else if (event.sensor.type == Sensor.TYPE_PRESSURE) {
            // V2: Barometer for elevation tracking
            val pressure = event.values.firstOrNull() ?: return
            currentPressureHpa = pressure
            if (baselinePressureHpa == null) {
                baselinePressureHpa = pressure
            } else {
                // Slowly adjust baseline (weighted moving average)
                baselinePressureHpa = baselinePressureHpa!! * 0.999f + pressure * 0.001f
            }
            guardianRepository.updateTelemetry { 
                it.copy(pressureHpa = pressure) 
            }
        } else if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            // V2: Step counter tracking
            currentStepCount = event.values.firstOrNull()?.toInt() ?: currentStepCount
            guardianRepository.updateTelemetry { 
                it.copy(currentStepCount = currentStepCount) 
            }
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
            
            // V2: Track walking session start for stride/speed calculation
            if (walkSessionStartMs == 0L) {
                walkSessionStartMs = now
                walkSessionStartSteps = currentStepCount
                walkSessionStartLocation = lastKnownLocation?.let { Location(it) }  // Clone
                gaitVariabilityWindows.clear()
                turnCount = 0
                turnInstabilitySum = 0f
            }
            
            // V2: Turn detection — detect sudden lateral acceleration spikes
            if (lastLateralAccel > TURN_LATERAL_SPIKE_THRESHOLD) {
                turnCount++
                turnInstabilitySum += lastLateralAccel
            }
        } else {
            // Walking stopped — reset session
            if (walkSessionStartMs > 0L && gaitSamples.size >= 40) {
                // Save the session data before clearing
                scope.launch {
                    saveGaitSession()
                }
            }
            gaitSamples.clear()
            walkSessionStartMs = 0L
            walkSessionStartSteps = -1
            walkSessionStartLocation = null
            gaitVariabilityWindows.clear()
            turnCount = 0
            turnInstabilitySum = 0f
        }
    }

    private fun triggerVerificationPhase() {
        if (isVerificationPhase) {
            Log.d(TAG, "Already verifying an impact, ignoring subsequent bounces...")
            return
        }

        if (isLikelyPhoneOnlyImpact()) {
            Log.d(TAG, "Impact rejected by table/pocket context filter")
            angularSpeedSum = 0f
            return
        }

        val emergencyType = classifyPotentialEmergency()
        if (emergencyType == null) {
            Log.d(TAG, "Impact rejected by tightened fall/crash classifier")
            angularSpeedSum = 0f
            return
        }

        val now = System.currentTimeMillis()
        if (now - lastEmergencyAlertMs < MIN_ALERT_INTERVAL_MS) {
            Log.d(TAG, "Impact ignored because Guardian alert cooldown is active")
            angularSpeedSum = 0f
            return
        }

        Log.d(TAG, "Impact + Tumble detected! Speed: $lastKnownSpeed m/s. Entering 10s verification phase...")
        isVerificationPhase = true

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
            // Fix 6: In extreme sports contexts (biking, intense motion), extend verification to 15s to filter transient maneuvers
            val verificationDelayMs = if (isExtremeSportsContext) 15000L else 10000L
            delay(verificationDelayMs)
            
            // Check Activity Recognition API to verify STILL state
            verifyStillStateAndLaunchUI(emergencyType)
        }
    }

    private fun classifyPotentialEmergency(): String? {
        // BUG 2 FIX: Use sticky vehicle session for reliable context
        val isVehicleContext = isInVehicleSession ||
            impactActivityType == DetectedActivity.IN_VEHICLE ||
            currentActivityType == DetectedActivity.IN_VEHICLE

        // V2: Enhanced crash classification with deceleration + multi-axis
        val hasHighDeceleration = maxDecelerationMpsPerSec >= CRASH_DECELERATION_THRESHOLD
        val hasMultiAxisImpact = isMultiAxisImpact()
        
        if (
            isVehicleContext &&
            impactSpeedKmh >= CRASH_SPEED_KMH &&
            lastImpactDelta >= CRASH_MIN_IMPACT_DELTA &&
            angularSpeedSum >= CRASH_TUMBLE_THRESHOLD
        ) {
            return "Crash Detected"
        }
        
        // V2: Also classify as crash if extreme deceleration + multi-axis even with slightly lower thresholds
        if (
            isVehicleContext &&
            hasHighDeceleration &&
            hasMultiAxisImpact &&
            impactSpeedKmh >= CRASH_SPEED_KMH * 0.7f &&  // Allow slightly lower speed
            lastImpactDelta >= CRASH_MIN_IMPACT_DELTA * 0.8f
        ) {
            return "Crash Detected"
        }

        val isVehicleLikeActivity = isInVehicleSession ||
            impactActivityType == DetectedActivity.IN_VEHICLE ||
            impactActivityType == DetectedActivity.ON_BICYCLE ||
            currentActivityType == DetectedActivity.IN_VEHICLE ||
            currentActivityType == DetectedActivity.ON_BICYCLE

        if (isVehicleLikeActivity) return null

        // Fix 4: For basic phones with limited sensors, adapt fall thresholds
        val effectiveTumble = if (sensorCapabilityLevel == "BASIC") TUMBLE_THRESHOLD * 0.6f else TUMBLE_THRESHOLD

        if (
            impactSpeedKmh <= FALL_MAX_SPEED_KMH &&
            lastImpactDelta >= FALL_MIN_IMPACT_DELTA &&
            angularSpeedSum >= effectiveTumble
        ) {
            return "Fall Detected"
        }

        return null
    }

    private fun verifyStillStateAndLaunchUI(emergencyType: String) {
        val isCrash = emergencyType == "Crash Detected"
        val isMovementDismissal = currentActivityType == DetectedActivity.WALKING ||
            currentActivityType == DetectedActivity.RUNNING ||
            currentActivityType == DetectedActivity.ON_BICYCLE
        
        // V2: Check step counter — if steps increased by 5+ in 10s, user is walking
        val stepsAfterImpact = if (stepsAtImpact >= 0 && currentStepCount >= 0) currentStepCount - stepsAtImpact else 0
        val userWalkedAway = stepsAfterImpact >= 5
        
        // V2: Check post-impact orientation — phone should be horizontal after real fall
        val phoneIsHorizontal = !guardianRepository.telemetryFlow.value.isUpright
        
        // V2: Post-crash silence — check if accel was very still after crash (phone/car stationary)
        val recentSamples = impactWaveformBuffer.toList().takeLast(20)
        postCrashAccelVariance = if (recentSamples.size > 5) {
            val mean = recentSamples.map { it.magnitude }.average().toFloat()
            recentSamples.map { (it.magnitude - mean) * (it.magnitude - mean) }.average().toFloat()
        } else 10f
        val isPostCrashSilent = postCrashAccelVariance < POST_CRASH_SILENCE_VARIANCE
        
        val isConfirmed = if (isCrash) {
            // V2: Enhanced crash confirmation with deceleration + silence + audio
            val baseConfirmed = !isMovementDismissal && impactSpeedKmh >= CRASH_SPEED_KMH
            // Also confirm if post-crash silence detected (phone stationary = real crash)
            baseConfirmed || (!isMovementDismissal && isPostCrashSilent && audioImpactDetected)
        } else {
            // Fall: user must be still, not walked away, preferably horizontal
            val isStillState = (currentActivityType == DetectedActivity.STILL || currentActivityType == DetectedActivity.UNKNOWN)
            isStillState &&
                !userWalkedAway &&
                impactSpeedKmh <= FALL_MAX_SPEED_KMH &&
                !isInVehicleSession
        }

        if (isConfirmed) {
            Log.d(TAG, "Guardian event verified. Type: $emergencyType [V2: freefall=$hadFreefallBeforeImpact, waveform=${impactWaveformDurationMs}ms, steps=$stepsAfterImpact, horizontal=$phoneIsHorizontal, silence=$isPostCrashSilent, audio=$audioImpactDetected, decel=$maxDecelerationMpsPerSec, elevation=${getElevationChangeMetersSinceBaseline()}m, tier=$sensorCapabilityLevel]")
            lastEmergencyAlertMs = System.currentTimeMillis()
            scope.launch {
                guardianRepository.logEvent(
                    eventType = if (isCrash) "CRASH_DETECTED" else "FALL_DETECTED",
                    latitude = lastKnownLocation?.latitude,
                    longitude = lastKnownLocation?.longitude,
                    locationContext = "Post-impact activity=$currentActivityType, tier=$sensorCapabilityLevel",
                    sensorDataSnippet = JSONObject()
                        .put("impact_delta", lastImpactDelta)
                        .put("impact_magnitude", lastImpactMagnitude)
                        .put("angular_speed_score", angularSpeedSum)
                        .put("speed_kmh", impactSpeedKmh)
                        .put("activity_at_impact", impactActivityType)
                        .put("post_impact_activity", currentActivityType)
                        .put("proximity_near", proximityNear)
                        .put("ambient_light_lux", ambientLightLux)
                        .put("vehicle_session", isInVehicleSession)
                        // V2 signals
                        .put("v2_freefall_detected", hadFreefallBeforeImpact)
                        .put("v2_waveform_duration_ms", impactWaveformDurationMs)
                        .put("v2_multi_axis_impact", isMultiAxisImpact())
                        .put("v2_elevation_change_m", getElevationChangeMetersSinceBaseline())
                        .put("v2_steps_after_impact", stepsAfterImpact)
                        .put("v2_phone_horizontal", phoneIsHorizontal)
                        .put("v2_deceleration_mps2", maxDecelerationMpsPerSec)
                        .put("v2_post_crash_silence", isPostCrashSilent)
                        .put("v2_audio_impact", audioImpactDetected)
                        .put("sensor_tier", sensorCapabilityLevel)
                        .toString()
                )
            }
            // Launch full-screen countdown activity with loud siren & vibration
            // Patient has 30s grace period to tap "I'M OK" to cancel before community broadcast
            launchEmergencyCountdown(emergencyType)
        } else {
            Log.d(TAG, "Guardian event dismissed [V2: activity=$currentActivityType, steps=$stepsAfterImpact, walkedAway=$userWalkedAway, vehicle=$isInVehicleSession]")
        }
        
        // Reset and resume monitoring
        angularSpeedSum = 0f
        lastGyroTimestampNs = 0L
        isVerificationPhase = false
        audioImpactDetected = false
    }

    private fun notifyEmergencyContactsForFall() {
        val sourceId = "fall-${System.currentTimeMillis()}"
        scope.launch {
            val request = EmergencyContactAlertRequest(
                alertType = "fall_detected",
                latitude = lastKnownLocation?.latitude,
                longitude = lastKnownLocation?.longitude,
                notes = "Guardian fall detection verified after post-impact stillness.",
                sourceId = sourceId
            )

            when (val result = emergencyRepository.notifyEmergencyContacts(request)) {
                is Result.Success -> {
                    guardianRepository.logEvent(
                        eventType = "FALL_CONTACTS_NOTIFIED",
                        latitude = lastKnownLocation?.latitude,
                        longitude = lastKnownLocation?.longitude,
                        locationContext = "notified=${result.data.notifiedUserCount}, matched=${result.data.matchedUserCount}",
                        sensorDataSnippet = sourceId
                    )
                }
                is Result.Error -> {
                    guardianRepository.logEvent(
                        eventType = "FALL_CONTACTS_NOTIFY_FAILED",
                        latitude = lastKnownLocation?.latitude,
                        longitude = lastKnownLocation?.longitude,
                        locationContext = result.message,
                        sensorDataSnippet = sourceId
                    )
                }
                is Result.Loading -> Unit
            }
        }
    }

    private fun isLikelyPhoneOnlyImpact(): Boolean {
        val notVehicleCrash = impactSpeedKmh < CRASH_SPEED_KMH
        
        // V2: Freefall is a STRONG indicator of real fall, not phone drop
        // Phones dropped from pocket don't go through 0G freefall phase
        if (hadFreefallBeforeImpact && impactWaveformDurationMs > IMPACT_WAVEFORM_DROP_MAX_MS) {
            Log.d(TAG, "V2: Freefall + wide waveform detected — likely REAL fall, not phone drop")
            return false  // This is NOT a phone-only impact
        }
        
        // V2: Short sharp waveform + no freefall = phone drop
        val isSharpWaveform = impactWaveformDurationMs in 1..IMPACT_WAVEFORM_DROP_MAX_MS
        
        // V2: Elevation drop detected = body fell, not phone
        val elevationDrop = getElevationChangeMetersSinceBaseline()
        val hasSignificantElevationDrop = elevationDrop > FALL_ELEVATION_CHANGE_M
        if (hasSignificantElevationDrop) {
            Log.d(TAG, "V2: Significant elevation drop (${elevationDrop}m) — likely REAL fall")
            return false
        }
        
        val wasStationary = impactActivityType == DetectedActivity.STILL ||
            impactActivityType == DetectedActivity.UNKNOWN
        val isFarFromBody = proximityNear == false
        val isBright = (ambientLightLux ?: 0f) >= TABLE_LIGHT_LUX
        val isLowAngularSpeed = angularSpeedSum < TUMBLE_THRESHOLD * 1.5f
        val isLowImpactDelta = lastImpactDelta < FALL_MIN_IMPACT_DELTA * 1.3f

        var confidenceScore = 0
        if (wasStationary) confidenceScore++
        if (isFarFromBody) confidenceScore++
        if (isBright) confidenceScore++
        if (isLowAngularSpeed) confidenceScore++
        if (isLowImpactDelta) confidenceScore++
        if (!hadFreefallBeforeImpact) confidenceScore++  // V2: No freefall = more likely phone drop
        if (isSharpWaveform) confidenceScore++            // V2: Sharp waveform = phone drop
        
        // Fix 4: For budget phones with fewer available sensors, require 2 signals instead of 3
        val minRequiredConfidence = if (sensorCapabilityLevel == "BASIC") 2 else 3
        return notVehicleCrash && confidenceScore >= minRequiredConfidence
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
        val pendingIntent = PendingIntent.getActivity(
            this,
            CRASH_ALERT_NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CRASH_ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Crash SOS detected")
            .setContentText(getString(R.string.unlock_not_required_cancel_if))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(CRASH_ALERT_NOTIFICATION_ID, notification)

        try {
            startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "Crash countdown activity launch deferred to full-screen notification: ${e.message}")
        }
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
            val crashAlertChannel = NotificationChannel(
                CRASH_ALERT_CHANNEL_ID,
                "Guardian Crash SOS Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                description = "Full-screen crash SOS countdown alerts"
            }
            val gentleAlertChannel = NotificationChannel(
                GENTLE_ALERT_CHANNEL_ID,
                "Guardian Gentle Health Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                description = "Gentle health alert prompts for soft falls and high resting pulse"
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
            manager?.createNotificationChannel(crashAlertChannel)
            manager?.createNotificationChannel(gentleAlertChannel)
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
    
    // V2: Accelerometer sample for freefall/waveform buffers
    private data class AccelSample(
        val timestampMs: Long,
        val magnitude: Float
    )
    
    // V2: Speed sample for deceleration tracking
    private data class SpeedSample(
        val timestampMs: Long,
        val speedMps: Float
    )

    private fun List<Float>.averageOrZero(): Float =
        if (isEmpty()) 0f else average().toFloat()
}
