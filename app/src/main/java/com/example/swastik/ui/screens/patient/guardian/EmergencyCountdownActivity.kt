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
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.example.swastik.R
import com.example.swastik.data.repository.EmergencyRepository
import com.example.swastik.data.repository.GuardianRepository
import com.example.swastik.data.repository.Result
import com.example.swastik.utils.LocationHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

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
    private var isTestMode = false

    companion object {
        private const val CRASH_ALERT_NOTIFICATION_ID = 1003
        // Fix 9: Process-level SOS deduplication — prevents duplicate broadcasts
        // even if multiple Activity instances are created from notification + startActivity
        private val sosDispatchLock = AtomicBoolean(false)
        private var lastSosDispatchMs = 0L
        private const val SOS_DEDUP_COOLDOWN_MS = 60_000L // 60 seconds
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

        // Both crash and fall use the configured grace period (default 30s) so user has sufficient time to cancel
        val effectiveGracePeriod = gracePeriod

        startAlarmAndVibration()

        setContent {
            MaterialTheme {
                EmergencyCountdownScreen(
                    gracePeriodSeconds = effectiveGracePeriod,
                    emergencyType = emergencyType,
                    onCancel = { 
                        lifecycleScope.launch {
                            guardianRepository.logEvent(
                                eventType = "EMERGENCY_CANCELLED_BY_USER",
                                locationContext = "$emergencyType cancelled by user tap within grace period. No alerts dispatched."
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
        // Fix 9: Process-level dedup — AtomicBoolean CAS ensures only one dispatch
        val now = System.currentTimeMillis()
        if (now - lastSosDispatchMs < SOS_DEDUP_COOLDOWN_MS) return
        if (!sosDispatchLock.compareAndSet(false, true)) return
        lastSosDispatchMs = now
        stopAlarm()

        if (isTestMode) {
            lifecycleScope.launch {
                guardianRepository.logEvent(
                    eventType = "SOS_TEST_COMPLETED",
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

            val speedKmh = intent.getFloatExtra("SPEED_KMH", 0f)
            val isCrash = isCrashEmergency(emergencyType)
            val incidentCode = if (isCrash) "CRASH_DETECTED" else "FALL_DETECTED"

            val notes = "Vaididea Guardian Emergency: $emergencyType. " +
                "User did not cancel within grace period. Speed=${"%.1f".format(speedKmh)} km/h. " +
                "Community First Responder Alert dispatched for immediate on-scene CPR/first-aid."

            guardianRepository.logEvent(
                eventType = if (isCrash) "CRASH_COMMUNITY_ALERTED" else "FALL_COMMUNITY_ALERTED",
                latitude = latitude,
                longitude = longitude,
                locationContext = emergencyType,
                sensorDataSnippet = notes
            )

            // 1. Alert nearby Community First Responders (Heroes)
            if (latitude != null && longitude != null && (latitude != 0.0 || longitude != 0.0)) {
                try {
                    emergencyRepository.broadcastEmergency(
                        com.example.swastik.data.model.EmergencyBroadcastRequest(
                            latitude = latitude,
                            longitude = longitude,
                            incidentType = incidentCode,
                            addressText = "Emergency incident site (GPS: ${"%.4f".format(latitude)}, ${"%.4f".format(longitude)})",
                            radiusMeters = if (isCrash) 2500 else 1500
                        )
                    )
                    guardianRepository.logEvent(
                        eventType = "COMMUNITY_HEROES_BROADCAST_SUCCESS",
                        latitude = latitude,
                        longitude = longitude,
                        locationContext = "Radius: ${if (isCrash) 2500 else 1500}m"
                    )
                } catch (e: Exception) {
                    guardianRepository.logEvent(
                        eventType = "COMMUNITY_HEROES_BROADCAST_FAILED",
                        latitude = latitude,
                        longitude = longitude,
                        locationContext = e.message
                    )
                }
            }

            // 2. Notify Designated Emergency Contacts with live coordinates
            try {
                val contactRequest = com.example.swastik.data.remote.dto.EmergencyContactAlertRequest(
                    alertType = if (isCrash) "crash_detected" else "fall_detected",
                    latitude = latitude,
                    longitude = longitude,
                    notes = notes,
                    sourceId = "guardian-${System.currentTimeMillis()}"
                )
                when (val result = emergencyRepository.notifyEmergencyContacts(contactRequest)) {
                    is Result.Success -> guardianRepository.logEvent(
                        eventType = "EMERGENCY_CONTACTS_NOTIFIED",
                        latitude = latitude,
                        longitude = longitude,
                        locationContext = "notified=${result.data.notifiedUserCount}, matched=${result.data.matchedUserCount}"
                    )
                    is Result.Error -> guardianRepository.logEvent(
                        eventType = "EMERGENCY_CONTACTS_NOTIFY_FAILED",
                        locationContext = result.message
                    )
                    is Result.Loading -> Unit
                }
            } catch (e: Exception) {
                guardianRepository.logEvent(
                    eventType = "EMERGENCY_CONTACTS_NOTIFY_EXCEPTION",
                    locationContext = e.message
                )
            }

            // Release the dispatch lock after completion
            sosDispatchLock.set(false)
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
                fontWeight = FontWeight.Medium,
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
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "🚨 $emergencyType",
                    color = Color(0xFFFF6B6B),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Alerting nearby Community First Responders in ${timeLeft}s...",
                    color = Color.White,
                    fontSize = 14.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            // ==================== IN-COUNTDOWN CPR & FIRST-AID METRONOME GUIDE ====================
            var showCprGuide by remember { mutableStateOf(false) }
            val cprTransition = rememberInfiniteTransition(label = "CPR_Pulse")
            val cprPulseScale by cprTransition.animateFloat(
                initialValue = 0.9f,
                targetValue = 1.25f,
                animationSpec = infiniteRepeatable(
                    animation = tween(545, easing = LinearEasing), // 110 BPM standard CPR rate (~545ms per beat)
                    repeatMode = RepeatMode.Reverse
                ),
                label = "CprScale"
            )

            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.Black.copy(alpha = 0.45f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showCprGuide = !showCprGuide }
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .scale(cprPulseScale),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("❤️", fontSize = 16.sp)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Hands-Only CPR Metronome (110 BPM)",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color(0xFFFCA5A5)
                                )
                                Text(
                                    text = if (showCprGuide) "Tap to collapse emergency instructions" else "Tap for step-by-step first-aid guide",
                                    fontSize = 10.sp,
                                    color = Color.White.copy(alpha = 0.75f)
                                )
                            }
                        }
                        Text(if (showCprGuide) "▲" else "▼", color = Color.White, fontSize = 12.sp)
                    }

                    if (showCprGuide) {
                        Spacer(modifier = Modifier.height(10.dp))
                        androidx.compose.material3.HorizontalDivider(color = Color.White.copy(alpha = 0.15f))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "1. Check responsiveness & pulse.\n2. If unconscious, place hands on the center of chest.\n3. Push hard & fast (2 inches deep) matching the pulsating ❤️ beat (100–120 BPM).\n4. Continue until Hero Responder arrives on scene.",
                            fontSize = 11.sp,
                            color = Color(0xFFF1F5F9),
                            lineHeight = 15.sp
                        )
                    }
                }
            }
            
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
                    Text(stringResource(R.string.text_i_am_okncancel), color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Button(
                    onClick = onSendSos,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                    modifier = Modifier.weight(1f).height(64.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(stringResource(R.string.text_sendnsos_now), color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold)
                }
            }
            
            Spacer(modifier = Modifier.height(36.dp))
        }
    }
}
