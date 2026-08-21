package com.example.swastik.ui.screens.patient.profile

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.ui.viewmodel.EmergencyNetworkViewModel

@Composable
fun GuardianSettingsDialog(
    onDismiss: () -> Unit,
    onNavigateToVolunteerRegistration: () -> Unit = {},
    onNavigateToGuardianDashboard: () -> Unit = {},
    emergencyViewModel: EmergencyNetworkViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val emergencyState by emergencyViewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        emergencyViewModel.loadProfile()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.90f),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFEF4444).copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Security,
                                    contentDescription = null,
                                    tint = Color(0xFFEF4444),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Guardian SOS & Responder",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // ==================== 1. FIRST RESPONDER & COMMUNITY HERO ====================
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (emergencyState.isRegistered) Color(0xFFF0FDF4) else Color(0xFFFFF1F2)
                        ),
                        border = BorderStroke(
                            1.dp,
                            if (emergencyState.isRegistered) Color(0xFF86EFAC) else Color(0xFFFDA4AF)
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.VolunteerActivism,
                                        contentDescription = null,
                                        tint = if (emergencyState.isRegistered) Color(0xFF16A34A) else Color(0xFFE11D48),
                                        modifier = Modifier.size(22.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "First Responder Network",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp,
                                        color = if (emergencyState.isRegistered) Color(0xFF14532D) else Color(0xFF881337)
                                    )
                                }

                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (emergencyState.isRegistered) Color(0xFFDCFCE7) else Color(0xFFFFE4E6)
                                ) {
                                    Text(
                                        text = if (emergencyState.isRegistered) "VERIFIED ✓" else "NOT ACTIVE",
                                        color = if (emergencyState.isRegistered) Color(0xFF15803D) else Color(0xFFBE123C),
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            if (emergencyState.isRegistered) {
                                Text(
                                    text = "Tier: ${emergencyState.profile?.tier ?: "Volunteer Hero"} • You will be alerted for sudden medical emergencies within 1.5 km.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF166534),
                                    lineHeight = 16.sp
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color.White, RoundedCornerShape(12.dp))
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            "On-Duty Status",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF1F2937)
                                        )
                                        Text(
                                            if (emergencyState.isOnDuty) "Ready for dispatch 🟢" else "Offline / Rest mode ⚪",
                                            fontSize = 11.sp,
                                            color = Color(0xFF4B5563)
                                        )
                                    }
                                    Switch(
                                        checked = emergencyState.isOnDuty,
                                        onCheckedChange = { emergencyViewModel.toggleDutyStatus(it) }
                                    )
                                }
                            } else {
                                Text(
                                    text = "Doctors, nurses, CPR volunteers & Good Samaritans get automatically dispatched to nearby cardiac / crash emergencies before the ambulance arrives.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF4B5563),
                                    lineHeight = 16.sp
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = {
                                        onDismiss()
                                        onNavigateToVolunteerRegistration()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.VolunteerActivism, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Join As A First Responder Hero ➔", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    // ==================== 2. FULL GUARDIAN DASHBOARD LINK ====================
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Live Safety Shield & Logs", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("View gait analysis, crash radar & incidents", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            OutlinedButton(
                                onClick = {
                                    onDismiss()
                                    onNavigateToGuardianDashboard()
                                },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Open Dashboard", fontSize = 12.sp)
                            }
                        }
                    }

                    // ==================== 3. SENSITIVITY & TIMERS ====================
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = stringResource(R.string.fall_detection_sensitivity),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = stringResource(R.string.adjust_based_on_your_daily),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))

                        val sensitivities = listOf("High", "Medium", "Low")
                        var selectedSensitivity by remember { mutableStateOf("Medium") }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            sensitivities.forEach { level ->
                                FilterChip(
                                    selected = selectedSensitivity == level,
                                    onClick = { selectedSensitivity = level },
                                    label = { Text(level) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }

                    // Grace Period Timer
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = stringResource(R.string.grace_period_timer),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = stringResource(R.string.time_allowed_to_cancel_the),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))

                        val gracePeriods = listOf(15, 30, 60)
                        var selectedGracePeriod by remember { mutableStateOf(30) }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            gracePeriods.forEach { seconds ->
                                FilterChip(
                                    selected = selectedGracePeriod == seconds,
                                    onClick = { selectedGracePeriod = seconds },
                                    label = { Text("${seconds}s") },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }

                    // Test Siren
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.VolumeUp, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.test_crash_sos_siren), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(stringResource(R.string.preview_the_sound_used_only), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Button(
                                onClick = {
                                    val intent = Intent(context, com.example.swastik.ui.screens.patient.guardian.EmergencyCountdownActivity::class.java).apply {
                                        putExtra("is_test", true)
                                        putExtra("EMERGENCY_TYPE", "Crash Detected")
                                    }
                                    context.startActivity(intent)
                                },
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(stringResource(R.string.test_1))
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(stringResource(R.string.save_settings))
                }
            }
        }
    }
}
