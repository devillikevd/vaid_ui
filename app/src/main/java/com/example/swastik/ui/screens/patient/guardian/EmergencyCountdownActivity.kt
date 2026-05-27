package com.example.swastik.ui.screens.patient.guardian

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.example.swastik.data.remote.dto.EmergencyRequest
import com.example.swastik.data.repository.GuardianRepository
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.utils.LocationHelper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@AndroidEntryPoint
class EmergencyCountdownActivity : ComponentActivity() {

    @Inject
    lateinit var guardianRepository: GuardianRepository

    @Inject
    lateinit var emergencyRepository: EmergencyRepository

    @Inject
    lateinit var locationHelper: LocationHelper

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var sosRequestInFlight = false
    private var isTestMode = false

    companion object {
        private const val CRASH_ALERT_NOTIFICATION_ID = 1003
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        getSystemService(NotificationManager::class.java)?.cancel(CRASH_ALERT_NOTIFICATION_ID)
        
        // Turn screen on and show over lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )

        val gracePeriod = intent.getIntExtra("GRACE_PERIOD", 30)
        val emergencyType = intent.getStringExtra("EMERGENCY_TYPE") ?: "Emergency Detected"
        isTestMode = intent.getBooleanExtra("is_test", false)

        if (!isCrashEmergency(emergencyType) && !isTestMode) {
            lifecycleScope.launch {
                guardianRepository.logEvent(
                    eventType = "NON_CRASH_SOS_BLOCKED",
                    locationContext = emergencyType
                )
            }
            finish()
            return
        }

        startAlarmAndVibration()

        setContent {
            MaterialTheme {
                EmergencyCountdownScreen(
                    gracePeriodSeconds = gracePeriod,
                    emergencyType = emergencyType,
                    onCancel = { 
                        lifecycleScope.launch {
                            guardianRepository.logEvent(
                                if (isCrashEmergency(emergencyType)) "CRASH_SOS_CANCELLED" else "SOS_TEST_CANCELLED"
                            )
                        }
                        finishAndStopAlarm() 
                    },
                    onSendSos = {
                        triggerAutoSos(emergencyType)
                    }
                )
            }
        }
    }

    private fun triggerAutoSos(emergencyType: String) {
        if (sosRequestInFlight) return
        sosRequestInFlight = true
        stopAlarm()

        if (isTestMode || !isCrashEmergency(emergencyType)) {
            lifecycleScope.launch {
                guardianRepository.logEvent(
                    eventType = if (isTestMode) "SOS_TEST_COMPLETED" else "NON_CRASH_SOS_BLOCKED",
                    locationContext = emergencyType
                )
            }
            finish()
            return
        }

        lifecycleScope.launch {
            val freshLocation = try {
                locationHelper.getLastLocation()
            } catch (_: SecurityException) {
                null
            }

            val latitude = freshLocation?.latitude
                ?: intent.takeIf { it.hasExtra("LATITUDE") }?.getDoubleExtra("LATITUDE", 0.0)
            val longitude = freshLocation?.longitude
                ?: intent.takeIf { it.hasExtra("LONGITUDE") }?.getDoubleExtra("LONGITUDE", 0.0)

            if (latitude == null || longitude == null || latitude == 0.0 && longitude == 0.0) {
                guardianRepository.logEvent(
                    eventType = "SOS_FAILED_LOCATION",
                    locationContext = emergencyType
                )
                finish()
                return@launch
            }

            val apiEmergencyType = "accident"
            val speedKmh = intent.getFloatExtra("SPEED_KMH", 0f)
            val notes = "Vaididea Guardian auto-SOS: $emergencyType. " +
                "Grace period expired without user cancellation. Speed=${"%.1f".format(speedKmh)} km/h."

            guardianRepository.logEvent(
                eventType = "SOS_TRIGGERED",
                latitude = latitude,
                longitude = longitude,
                locationContext = emergencyType,
                sensorDataSnippet = notes
            )

            val request = EmergencyRequest(
                latitude = latitude,
                longitude = longitude,
                address = null,
                emergencyType = apiEmergencyType,
                notes = notes
            )

            when (val result = emergencyRepository.requestEmergency(request)) {
                is Result.Success -> {
                    guardianRepository.logEvent(
                        eventType = "SOS_DISPATCHED",
                        latitude = latitude,
                        longitude = longitude,
                        locationContext = result.data.resolvedStatus(),
                        sensorDataSnippet = result.data.resolvedRequestId()
                    )
                }
                is Result.Error -> {
                    guardianRepository.logEvent(
                        eventType = "SOS_FAILED_NETWORK",
                        latitude = latitude,
                        longitude = longitude,
                        locationContext = result.message
                    )
                }
                is Result.Loading -> Unit
            }

            finish()
        }
    }

    private fun startAlarmAndVibration() {
        try {
            // Play loud alarm
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@EmergencyCountdownActivity, alarmUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }

            // Start intense vibration
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val timings = longArrayOf(0, 500, 500)
                val amplitudes = intArrayOf(0, 255, 0)
                vibrator?.vibrate(VibrationEffect.createWaveform(timings, amplitudes, 0))
            } else {
                vibrator?.vibrate(longArrayOf(0, 500, 500), 0)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun isCrashEmergency(emergencyType: String): Boolean {
        return emergencyType.contains("crash", ignoreCase = true) ||
            emergencyType.contains("accident", ignoreCase = true)
    }

    private fun finishAndStopAlarm() {
        stopAlarm()
        finish()
    }

    private fun stopAlarm() {
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {}
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
    }

    override fun onDestroy() {
        super.onDestroy()
        finishAndStopAlarm()
    }
}

@Composable
fun EmergencyCountdownScreen(
    gracePeriodSeconds: Int,
    emergencyType: String,
    onCancel: () -> Unit,
    onSendSos: () -> Unit
) {
    var timeLeft by remember { mutableStateOf(gracePeriodSeconds) }
    
    // Pulsing animation for the ring
    val infiniteTransition = rememberInfiniteTransition()
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    LaunchedEffect(key1 = timeLeft) {
        if (timeLeft > 0) {
            delay(1000L)
            timeLeft--
        } else {
            onSendSos()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF8B0000), Color(0xFF1A1A1A))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().padding(24.dp)
        ) {
            Text(
                text = "VAIDIDEA\nGUARDIAN",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                letterSpacing = 2.sp
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Timer Circle
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(200.dp)
                    .border(width = 8.dp, color = Color.Red.copy(alpha = pulseAlpha), shape = CircleShape)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.3f))
            ) {
                Text(
                    text = "${timeLeft}s",
                    color = Color.White,
                    fontSize = 64.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = "$emergencyType!\nAuto-calling ambulance...",
                color = Color.White,
                fontSize = 20.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontWeight = FontWeight.Medium
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Button(
                    onClick = onCancel,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                    modifier = Modifier.weight(1f).height(64.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("I AM OK\n(Cancel)", color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Button(
                    onClick = onSendSos,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                    modifier = Modifier.weight(1f).height(64.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("SEND\nSOS NOW", color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold)
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
