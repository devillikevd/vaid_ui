package com.example.swastik.notifications

import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.util.Log
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.theme.SwastikTheme
import dagger.hilt.android.AndroidEntryPoint
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@AndroidEntryPoint
class ReminderAlarmActivity : ComponentActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        turnScreenOnAndKeyguardOff()

        val reminderId = intent.getStringExtra(ReminderActionReceiver.EXTRA_REMINDER_ID) ?: ""
        val title = intent.getStringExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE) ?: "Reminder"
        val time = intent.getStringExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME) ?: ""
        val scheduledAt = intent.getStringExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT) ?: ""
        val typeStr = intent.getStringExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE) ?: "MEDICINE"
        val notificationId = intent.getIntExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, -1)

        playAlarmSound()

        setContent {
            SwastikTheme {
                AlarmScreen(
                    title = title,
                    time = time,
                    typeStr = typeStr,
                    onTaken = {
                        sendAction(ReminderActionReceiver.ACTION_MARK_DONE, reminderId, scheduledAt, notificationId, title, time, typeStr)
                        finish()
                    },
                    onSnooze = {
                        sendAction(ReminderActionReceiver.ACTION_SNOOZE, reminderId, scheduledAt, notificationId, title, time, typeStr)
                        finish()
                    },
                    onSkip = {
                        sendAction(ReminderActionReceiver.ACTION_SKIP, reminderId, scheduledAt, notificationId, title, time, typeStr)
                        finish()
                    }
                )
            }
        }
    }

    private fun turnScreenOnAndKeyguardOff() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "Swastik:AlarmWakeLock"
        )
        wakeLock?.acquire(10 * 60 * 1000L /*10 minutes*/)
    }

    private fun playAlarmSound() {
        try {
            val alert = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@ReminderAlarmActivity, alert)
                setAudioAttributes(
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e("ReminderAlarmActivity", "Error playing alarm", e)
        }
    }

    private fun sendAction(
        actionStr: String,
        reminderId: String,
        scheduledAt: String,
        notificationId: Int,
        title: String,
        time: String,
        typeStr: String
    ) {
        val actionIntent = Intent(this, ReminderActionReceiver::class.java).apply {
            action = actionStr
            putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminderId)
            putExtra(ReminderActionReceiver.EXTRA_SCHEDULED_AT, scheduledAt)
            putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, notificationId)
            putExtra(ReminderActionReceiver.EXTRA_REMINDER_TITLE, title)
            putExtra(ReminderActionReceiver.EXTRA_REMINDER_TIME, time)
            putExtra(ReminderActionReceiver.EXTRA_REMINDER_TYPE, typeStr)
            if (actionStr == ReminderActionReceiver.ACTION_SNOOZE) {
                putExtra(ReminderActionReceiver.EXTRA_SNOOZE_MINS, 15)
            }
        }
        sendBroadcast(actionIntent)
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
    }
}

@Composable
fun AlarmScreen(
    title: String,
    time: String,
    typeStr: String,
    onTaken: () -> Unit,
    onSnooze: () -> Unit,
    onSkip: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Alarm,
                contentDescription = "Alarm",
                modifier = Modifier.size(50.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = time,
            fontSize = 48.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = title,
            fontSize = 24.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Time for your ${typeStr.lowercase()}",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        Button(
            onClick = onTaken,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Text(stringResource(R.string.mark_as_taken), fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedButton(
                onClick = onSnooze,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp)
            ) {
                Text(stringResource(R.string.snooze_15m), fontSize = 16.sp)
            }
            
            OutlinedButton(
                onClick = onSkip,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text(stringResource(R.string.skip), fontSize = 16.sp)
            }
        }
    }
}
