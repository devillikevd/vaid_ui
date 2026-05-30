package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.local.GuardianFeaturePreferences
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.isSystemInDarkTheme

@Composable
fun SwastikGuardianCard(
    modifier: Modifier = Modifier,
    containerColor: Color = Color.White,
    isActive: Boolean,
    consentAccepted: Boolean,
    consentAcceptedAt: String?,
    featurePreferences: GuardianFeaturePreferences,
    onToggle: (Boolean) -> Unit,
    onConsentAccepted: (GuardianFeaturePreferences) -> Unit,
    onFeaturePreferencesChange: (GuardianFeaturePreferences) -> Unit
) {
    var showLearnMore by remember { mutableStateOf(false) }

    if (showLearnMore) {
        GuardianLearnMoreDialog(
            initialPreferences = featurePreferences,
            consentAccepted = consentAccepted,
            onDismiss = { showLearnMore = false },
            onProceed = { selectedFeatures ->
                onConsentAccepted(selectedFeatures)
                onFeaturePreferencesChange(selectedFeatures)
                showLearnMore = false
                // Auto-enable after setup if features were chosen
                if (selectedFeatures.hasAnyMonitoringFeature()) {
                    onToggle(true)
                }
            }
        )
    }

    val isDark = isSystemInDarkTheme()
    val boxBg = if (isDark) MaterialTheme.colorScheme.surface else Color.White

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left side: Icon and Titles
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .weight(1f)
                        .clickable { showLearnMore = true } 
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(boxBg)
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Vaididea Guardian",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Fall alerts • Crash SOS",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Switch(
                    checked = isActive,
                    onCheckedChange = { enabled ->
                        if (enabled) {
                            showLearnMore = true
                        } else {
                            onFeaturePreferencesChange(
                                GuardianFeaturePreferences(
                                    fallDetection = false,
                                    crashDetection = false,
                                    mobilityAnalysis = false,
                                    respiratoryTracker = false,
                                    doctorQrSharing = false
                                )
                            )
                            onToggle(false)
                        }
                    },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF6A5AE0),
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                    )
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Feature Grid (Matching Image Exactly)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (isDark) MaterialTheme.colorScheme.surface else Color.White, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                GuardianFeatureItem(
                    icon = Icons.Default.Hiking,
                    label = "Fall Alert",
                    status = if (featurePreferences.fallDetection) "Allowed" else "Off",
                    isAllowed = featurePreferences.fallDetection,
                    modifier = Modifier.weight(1f)
                )
                Box(modifier = Modifier.height(40.dp).width(1.dp).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)))
                GuardianFeatureItem(
                    icon = Icons.Default.DirectionsCar,
                    label = "Crash SOS",
                    status = if (featurePreferences.crashDetection) "Allowed" else "Off",
                    isAllowed = featurePreferences.crashDetection,
                    modifier = Modifier.weight(1f)
                )
                Box(modifier = Modifier.height(40.dp).width(1.dp).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)))
                GuardianFeatureItem(
                    icon = Icons.Default.Man,
                    label = "Mobility",
                    status = if (featurePreferences.mobilityAnalysis) "Allowed" else "Off",
                    isAllowed = featurePreferences.mobilityAnalysis,
                    modifier = Modifier.weight(1f)
                )
                Box(modifier = Modifier.height(40.dp).width(1.dp).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)))
                GuardianFeatureItem(
                    icon = Icons.Default.BarChart,
                    label = "Data Sharing",
                    status = if (featurePreferences.doctorQrSharing) "Allowed" else "Off",
                    isAllowed = featurePreferences.doctorQrSharing,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Professional Footer Row
            Surface(
                onClick = { showLearnMore = true },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = if (isDark) MaterialTheme.colorScheme.surface.copy(alpha = 0.5f) else Color(0xFFF3F4F6).copy(alpha = 0.5f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Learn more about Guardian",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun GuardianFeatureItem(
    icon: ImageVector,
    label: String,
    status: String,
    isAllowed: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (isAllowed) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        Text(
            text = status,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = if (isAllowed) (if (isSystemInDarkTheme()) Color(0xFF81C784) else Color(0xFF2E7D32)) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
    }
}

@Composable
fun GuardianLearnMoreDialog(
    initialPreferences: GuardianFeaturePreferences,
    consentAccepted: Boolean,
    onDismiss: () -> Unit,
    onProceed: (GuardianFeaturePreferences) -> Unit
) {
    var selectedFeatures by remember(initialPreferences) { mutableStateOf(initialPreferences) }
    var understood by remember { mutableStateOf(consentAccepted) }
    val scrollState = rememberScrollState()
    
    val canProceed = understood
    val latestOnProceed by rememberUpdatedState(onProceed)

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            val widthFraction = if (maxWidth < 600.dp) 1f else 0.78f
            val heightFraction = if (maxHeight < 720.dp) 1f else 0.9f
            Surface(
                modifier = Modifier
                    .fillMaxWidth(widthFraction)
                    .fillMaxHeight(heightFraction),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Guardian Learn More",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Choose features and agree to unlock protection.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(scrollState),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        ExplainerSection(
                            title = "Vision Alignment",
                            body = "Guardian is built for preventive-care: emergency response, telemedicine context, and patient-controlled sharing."
                        )

                        HorizontalDivider()

                        FeatureConsentItem(
                            icon = Icons.Default.Warning,
                            title = "1. Fall Detection Alerts",
                            reliability = "Firebase notification to emergency contacts only.",
                            checked = selectedFeatures.fallDetection,
                            onCheckedChange = { selectedFeatures = selectedFeatures.copy(fallDetection = it) },
                            description = "Uses motion sensors to detect verified falls and notifies your emergency contacts. It does not trigger SOS or ambulance dispatch."
                        )

                        FeatureConsentItem(
                            icon = Icons.Default.DirectionsCar,
                            title = "2. Vehicle Crash Detection",
                            reliability = "Tightened high-speed impact detection.",
                            checked = selectedFeatures.crashDetection,
                            onCheckedChange = { selectedFeatures = selectedFeatures.copy(crashDetection = it) },
                            description = "Monitors for severe impacts at vehicle speeds. If the countdown is not cancelled, it triggers SOS ambulance dispatch and notifies emergency contacts."
                        )

                        FeatureConsentItem(
                            icon = Icons.Default.DirectionsWalk,
                            title = "3. Mobility Analysis",
                            reliability = "Screening for walking pattern changes.",
                            checked = selectedFeatures.mobilityAnalysis,
                            onCheckedChange = { selectedFeatures = selectedFeatures.copy(mobilityAnalysis = it) },
                            description = "Analyzes your walking pattern to help doctors track recovery."
                        )

                        FeatureConsentItem(
                            icon = Icons.Default.Info,
                            title = "Doctor Sharing",
                            reliability = "Private data sharing.",
                            checked = selectedFeatures.doctorQrSharing,
                            onCheckedChange = { selectedFeatures = selectedFeatures.copy(doctorQrSharing = it) },
                            description = "Allow your doctor to see analytics during a consultation."
                        )

                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = understood,
                            onCheckedChange = { understood = it }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "I understand and agree to these features.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Close")
                        }
                        Button(
                            onClick = { latestOnProceed(selectedFeatures) },
                            enabled = canProceed,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Agree & Proceed")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExplainerSection(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = title,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = body,
            fontSize = 13.sp,
            lineHeight = 19.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun FeatureConsentItem(
    icon: ImageVector,
    title: String,
    reliability: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    description: String
) {
    Row(verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text(reliability, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
                }
                Switch(checked = checked, onCheckedChange = onCheckedChange)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(description, fontSize = 13.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
