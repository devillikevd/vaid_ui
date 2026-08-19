package com.example.swastik.ui.screens.patient.guardian

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.viewmodel.EmergencyNetworkViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmergencyActiveResponseScreen(
    broadcastId: String,
    onNavigateBack: () -> Unit,
    viewModel: EmergencyNetworkViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    var selectedTriage by remember { mutableStateOf("RED") }
    var notesText by remember { mutableStateOf("") }
    var showAmbulanceSuccessDialog by remember { mutableStateOf(false) }

    LaunchedEffect(broadcastId) {
        viewModel.loadBroadcast(broadcastId)
    }

    val broadcast = uiState.activeBroadcast

    // CPR metronome pulsing animation (110 BPM => ~545ms cycle)
    val infiniteTransition = rememberInfiniteTransition(label = "cprMetronome")
    val cprPulse by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(272, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cprHeartbeat"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Active Emergency Response",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Live Status Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        if (uiState.hasArrivedOnScene)
                            Brush.linearGradient(listOf(Color(0xFF065F46), Color(0xFF047857)))
                        else
                            Brush.linearGradient(listOf(Color(0xFF1E3A8A), Color(0xFF2563EB)))
                    )
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(if (uiState.hasArrivedOnScene) "🩺" else "🏃", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                if (uiState.hasArrivedOnScene) "ON SCENE • ADMINISTERING FIRST-AID" else "EN ROUTE TO VICTIM",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                if (uiState.hasArrivedOnScene) "Follow trauma guidelines below" else "Target spot: ~${(broadcast?.distanceMeters ?: 300.0).toInt()}m ahead",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 12.sp
                            )
                        }
                    }

                    if (!uiState.hasArrivedOnScene) {
                        Button(
                            onClick = { viewModel.markArrivedOnScene(broadcastId) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                "I Have Arrived 📍",
                                color = Color(0xFF1E3A8A),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // Direct Turn-by-Turn Google Maps Navigation Card
            val context = androidx.compose.ui.platform.LocalContext.current
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF0F172A)
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🧭", fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    "Live GPS Navigation HUD",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    "Turn-by-turn voice guidance to exact incident pin",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF0284C7).copy(alpha = 0.2f)
                        ) {
                            Text(
                                "${(broadcast?.distanceMeters ?: 350.0).toInt()}m • ~${broadcast?.etaSeconds ?: 45}s",
                                color = Color(0xFF38BDF8),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.5.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Text(
                        "📍 Target Spot: ${broadcast?.addressText ?: "Exact GPS Collision Coordinate"}",
                        color = Color(0xFFE2E8F0),
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Button(
                        onClick = {
                            val lat = broadcast?.latitude ?: 28.6139
                            val lng = broadcast?.longitude ?: 77.2090
                            val navUri = android.net.Uri.parse("google.navigation:q=$lat,$lng")
                            val mapIntent = android.content.Intent(android.content.Intent.ACTION_VIEW, navUri).apply {
                                setPackage("com.google.android.apps.maps")
                            }
                            try {
                                context.startActivity(mapIntent)
                            } catch (_: Exception) {
                                val geoUri = android.net.Uri.parse("geo:$lat,$lng?q=$lat,$lng(Emergency Incident Spot)")
                                context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, geoUri))
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF0284C7)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Navigation, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Open Turn-by-Turn in Google Maps 🗺️ ➔",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.5.sp
                        )
                    }
                }
            }

            // Victim Profile Summary
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Victim Medical Snapshot", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Blood Group", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(broadcast?.victimBloodGroup ?: "B+ Positive", fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                        }
                        Column {
                            Text("Incident Type", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(broadcast?.incidentType ?: "CRASH_DETECTED", fontWeight = FontWeight.Bold)
                        }
                        Column {
                            Text("Status", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(if (uiState.hasArrivedOnScene) "On Scene 🟢" else "En Route 🔵", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // CPR Metronome Tool
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1E1B4B)
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("💓", fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Live CPR Metronome (110 BPM)",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }

                        Switch(
                            checked = uiState.cprMetronomeActive,
                            onCheckedChange = { viewModel.toggleCprMetronome() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF6366F1)
                            )
                        )
                    }

                    if (uiState.cprMetronomeActive) {
                        Box(
                            modifier = Modifier
                                .size(70.dp)
                                .scale(cprPulse)
                                .clip(CircleShape)
                                .background(Color(0xFFEF4444)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("💓", fontSize = 28.sp)
                        }

                        Text(
                            "Push Hard & Fast: At least 2 inches deep • 100-120 BPM",
                            color = Color(0xFFA5B4FC),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    } else {
                        Text(
                            "Turn switch ON to activate rhythmic pulse guide for chest compressions.",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // First Aid & Trauma Clinical Checklist
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Clinical On-Scene Action Guide",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )

                    FirstAidItem(
                        icon = "🩸",
                        title = "Severe Arterial Bleed",
                        desc = "Apply direct pressure with clean cloth. If bleeding does not stop on limb, apply tourniquet 2-3 inches above wound until bleeding ceases."
                    )

                    FirstAidItem(
                        icon = "🦴",
                        title = "Neck & Spinal (C-Spine) Safety",
                        desc = "Do NOT move victim's neck or head if crash impact was severe. Keep spine neutral to prevent spinal cord injury."
                    )

                    FirstAidItem(
                        icon = "🫁",
                        title = "Airway & Breathing",
                        desc = "Check for clear airway (tilt head/chin lift if no neck injury). If unconscious but breathing, turn into Recovery Position."
                    )
                }
            }

            // Verified Ambulance Dispatch Section
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF450A0A).copy(alpha = 0.15f)
                ),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFDC2626)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🚑", fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                "Dispatch Verified Ambulance & Pre-Alert ER",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFDC2626),
                                fontSize = 14.sp
                            )
                            Text(
                                "1-Tap certified call triggers nearest 108/ALS ambulance and preps hospital trauma room",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Triage selection
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TriageChip(
                            label = "🔴 RED (Critical Life Threat)",
                            isSelected = selectedTriage == "RED",
                            onClick = { selectedTriage = "RED" },
                            modifier = Modifier.weight(1f)
                        )
                        TriageChip(
                            label = "🟡 YELLOW (Urgent)",
                            isSelected = selectedTriage == "YELLOW",
                            onClick = { selectedTriage = "YELLOW" },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = notesText,
                        onValueChange = { notesText = it },
                        label = { Text("Triage Notes for Hospital ER Team") },
                        placeholder = { Text("e.g. Compound leg fracture, tourniquet placed, conscious") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Button(
                        onClick = {
                            viewModel.dispatchAmbulance(
                                broadcastId = broadcastId,
                                triageLevel = selectedTriage,
                                notes = notesText,
                                onDispatched = { showAmbulanceSuccessDialog = true }
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDC2626)
                        ),
                        enabled = !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.LocalHospital, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("DISPATCH AMBULANCE & PRE-ALERT HOSPITAL 🚨", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    if (showAmbulanceSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showAmbulanceSuccessDialog = false },
            title = { Text("Ambulance & ER Pre-Alert Dispatched! 🚑") },
            text = {
                Text(
                    "Nearest ALS/BLS Emergency Ambulance has been dispatched to this exact GPS location. The nearest Hospital Trauma Team is receiving live patient telemetry and preparing the emergency room."
                )
            },
            confirmButton = {
                Button(onClick = { showAmbulanceSuccessDialog = false }) {
                    Text("OK")
                }
            }
        )
    }
}

@Composable
private fun FirstAidItem(icon: String, title: String, desc: String) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Text(icon, fontSize = 20.sp)
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun TriageChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) Color(0xFFDC2626) else MaterialTheme.colorScheme.surfaceVariant)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            textAlign = TextAlign.Center
        )
    }
}
