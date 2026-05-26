package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.local.GuardianFeaturePreferences

@Composable
fun SwastikGuardianCard(
    modifier: Modifier = Modifier,
    isActive: Boolean,
    consentAccepted: Boolean,
    consentAcceptedAt: String?,
    featurePreferences: GuardianFeaturePreferences,
    onToggle: (Boolean) -> Unit,
    onConsentAccepted: (GuardianFeaturePreferences) -> Unit,
    onFeaturePreferencesChange: (GuardianFeaturePreferences) -> Unit,
    onLearnMoreClick: () -> Unit = {}
) {
    var showLearnMore by remember { mutableStateOf(false) }
    val canUseToggle = consentAccepted && featurePreferences.hasAnyMonitoringFeature()

    if (showLearnMore) {
        GuardianLearnMoreDialog(
            initialPreferences = featurePreferences,
            consentAccepted = consentAccepted,
            onDismiss = { showLearnMore = false },
            onProceed = { selectedFeatures ->
                onConsentAccepted(selectedFeatures)
                onFeaturePreferencesChange(selectedFeatures)
                showLearnMore = false
            }
        )
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Guardian",
                        tint = if (isActive) Color(0xFF2E7D32) else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Vaididea Guardian",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (consentAccepted) {
                                "Consent completed. Choose exactly what Guardian may monitor and share."
                            } else {
                                "Locked until you read, understand, and agree to the full safety explainer."
                            },
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Switch(
                    checked = isActive,
                    enabled = canUseToggle,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF2E7D32)
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (isActive) {
                ActiveGuardianStatus()
            } else {
                Text(
                    text = if (canUseToggle) {
                        "Ready. Turn on only when you want Guardian to monitor the selected features."
                    } else {
                        "Read Learn more first. The toggle will unlock after you agree."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                BenefitItem("Auto-SOS is gated by impact, tumble, stillness, siren timer, and user cancel.")
                BenefitItem("Doctor/QR analytics are attached only when you explicitly allow sharing.")
                BenefitItem("No feature runs just because the card exists. Disabled features stay off.")
            }

            Spacer(modifier = Modifier.height(12.dp))

            FeatureSummaryRow("Fall SOS", featurePreferences.fallDetection)
            FeatureSummaryRow("Crash SOS", featurePreferences.crashDetection)
            FeatureSummaryRow("Mobility analysis", featurePreferences.mobilityAnalysis)
            FeatureSummaryRow("Respiratory tracker", featurePreferences.respiratoryTracker)
            FeatureSummaryRow("Doctor/QR analytics sharing", featurePreferences.doctorQrSharing)

            if (consentAcceptedAt != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Accepted: $consentAcceptedAt",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.72f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    onClick = {
                        onLearnMoreClick()
                        showLearnMore = true
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Learn More",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (consentAccepted) "Review / edit consent" else "Learn more", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ActiveGuardianStatus() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        val infiniteTransition = rememberInfiniteTransition()
        val alpha by infiniteTransition.animateFloat(
            initialValue = 0.4f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(1000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            )
        )
        Box(
            modifier = Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(Color(0xFF2E7D32).copy(alpha = alpha))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "Active. Monitoring only selected Guardian features.",
            color = Color(0xFF2E7D32),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun BenefitItem(text: String) {
    Text(
        text = "- $text",
        fontSize = 13.sp,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.82f),
        modifier = Modifier.padding(vertical = 2.dp)
    )
}

@Composable
private fun FeatureSummaryRow(label: String, enabled: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = if (enabled) "Allowed" else "Off",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) Color(0xFF2E7D32) else MaterialTheme.colorScheme.onSurfaceVariant
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
    val hasReadToEnd by remember {
        derivedStateOf { scrollState.maxValue == 0 || scrollState.value >= scrollState.maxValue - 24 }
    }
    val canProceed = hasReadToEnd && understood && selectedFeatures.hasAnyMonitoringFeature()
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
                                text = "Read to the end, choose features, then agree to unlock the toggle.",
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
                        body = "Guardian is built for Swastik/Vaididea's preventive-care vision: emergency response, telemedicine context, recovery tracking, and patient-controlled sharing. The goal is not to silently collect everything. The goal is to let the patient choose which safety signals can run and which signals can be shared during care."
                    )

                    HorizontalDivider()

                    FeatureConsentItem(
                        icon = Icons.Default.Warning,
                        title = "1. Auto-SOS and Fall Detection",
                        reliability = "Implementation: 85%. Production reliability: medium-high after real-device calibration.",
                        checked = selectedFeatures.fallDetection,
                        onCheckedChange = { selectedFeatures = selectedFeatures.copy(fallDetection = it) },
                        description = "Uses accelerometer impact, gyroscope tumble, post-impact STILL state, proximity/light filtering, GPS, and a loud grace-period countdown. If the user taps I AM OK, SOS cancels. If the user does not respond, the app sends emergency type and location to the ambulance/SOS pipeline."
                    )

                    FeatureConsentItem(
                        icon = Icons.Default.DirectionsCar,
                        title = "2. Vehicle Crash Detection",
                        reliability = "Implementation: 80%. Production reliability: medium until road testing.",
                        checked = selectedFeatures.crashDetection,
                        onCheckedChange = { selectedFeatures = selectedFeatures.copy(crashDetection = it) },
                        description = "Runs only when motion context looks like IN_VEHICLE and GPS speed crosses the crash threshold. It combines sudden deceleration with tumble/impact and then uses the same grace-period emergency UI before dispatch."
                    )

                    FeatureConsentItem(
                        icon = Icons.Default.DirectionsWalk,
                        title = "3. Gait and Mobility Analysis",
                        reliability = "Implementation: 70%. Reliability: screening signal only, not diagnosis.",
                        checked = selectedFeatures.mobilityAnalysis,
                        onCheckedChange = { selectedFeatures = selectedFeatures.copy(mobilityAnalysis = it) },
                        description = "When Activity Recognition says WALKING or RUNNING, the app analyzes accelerometer windows for lateral asymmetry and acceleration variability. Useful for doctor review in recovery, Parkinsonism, arthritis, frailty, or knee-surgery follow-up."
                    )

                    FeatureConsentItem(
                        icon = Icons.Default.Security,
                        title = "4. Respiratory Distress Context",
                        reliability = "Implementation: 65%. Depends on Health Connect permission and wearable heart-rate availability.",
                        checked = selectedFeatures.respiratoryTracker,
                        onCheckedChange = { selectedFeatures = selectedFeatures.copy(respiratoryTracker = it) },
                        description = "When the user is STILL or low-activity, Guardian can read recent Health Connect heart-rate data. If heart rate is unusually high, it stores context with location so a doctor can look for environmental triggers such as pollution zones."
                    )

                    HorizontalDivider()

                    ExplainerSection(
                        title = "Technical Terms",
                        body = "Accelerometer means motion force. Gyroscope means rotation or tumble. Activity Recognition means Google's on-device estimate such as STILL, WALKING, RUNNING, or IN_VEHICLE. Sensor fusion means Guardian does not trust one signal alone. It combines multiple signals before acting."
                    )

                    ExplainerSection(
                        title = "False-Positive Reduction",
                        body = "Guardian never promises zero false positives. It reduces false alarms with multiple checks: high impact plus tumble, post-impact stillness for 10 seconds, phone-only impact filtering with proximity/light sensors, vehicle speed checks for crashes, and a loud 30-second I AM OK countdown before dispatch."
                    )

                    FeatureConsentItem(
                        icon = Icons.Default.Info,
                        title = "Doctor and QR Sharing Permission",
                        reliability = "Sharing reliability: high. Data is attached only when this permission is on.",
                        checked = selectedFeatures.doctorQrSharing,
                        onCheckedChange = { selectedFeatures = selectedFeatures.copy(doctorQrSharing = it) },
                        description = "If enabled, Guardian analytics can be attached to QR/share text or consultation chat with sources and reliability notes. If disabled, the doctor still gets normal record access only when you grant it, but Guardian analytics stay private."
                    )

                    ExplainerSection(
                        title = "Fallbacks and Limits",
                        body = "If GPS, internet, Activity Recognition, Health Connect, or wearable data is unavailable, that part of the feature may be skipped or less accurate. SOS still tries the available location fallback. Doctor sharing expires/revokes through the record-sharing flow, but chat messages already sent may remain in the consultation record."
                    )

                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = understood,
                            onCheckedChange = { understood = it },
                            enabled = hasReadToEnd
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (hasReadToEnd) {
                                "I understand how Guardian works and agree to these selected features."
                            } else {
                                "Scroll to the end to enable agreement."
                            },
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

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
                            Text(if (consentAccepted) "Save consent" else "Agree & proceed")
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
