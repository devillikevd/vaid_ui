package com.example.swastik.ui.screens.consultation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Analytics
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ConsultationPrepareScreen(
    userName: String = "Patient",
    doctorName: String = "Doctor",
    isConnecting: Boolean = false,
    statusMessage: String = "",
    hasMedicalRecordAccess: Boolean = false,
    medicalRecordAccessExpiresAt: String? = null,
    isMedicalRecordAccessLoading: Boolean = false,
    medicalRecordAccessMessage: String? = null,
    guardianAnalyticsSharingAllowed: Boolean = false,
    onBackClick: () -> Unit,
    onGrantMedicalRecordAccess: (Boolean) -> Unit = {},
    onRevokeMedicalRecordAccess: () -> Unit = {},
    onStartConsultation: (Boolean) -> Unit
) {
    var allowAiVitals by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(true) }

    val backgroundBrush = Brush.verticalGradient(
        listOf(
            Color(0xFF07101F),
            Color(0xFF0D1730),
            Color(0xFF13233F)
        )
    )
    val accentBlue = Color(0xFF4C8DFF)
    val accentTeal = Color(0xFF2DD4BF)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush)
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 72.dp, y = 12.dp)
                .size(220.dp)
                .clip(CircleShape)
                .background(accentBlue.copy(alpha = 0.16f))
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-48).dp, y = (-48).dp)
                .size(180.dp)
                .clip(CircleShape)
                .background(accentTeal.copy(alpha = 0.10f))
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 28.dp)
        ) {
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBackClick,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.08f))
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Consultation Room",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Secure video session with live chat fallback",
                        color = Color.White.copy(alpha = 0.66f),
                        fontSize = 12.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.08f))
                        .padding(horizontal = 12.dp, vertical = 7.dp)
                ) {
                    Text(
                        text = "Encrypted",
                        color = Color.White.copy(alpha = 0.82f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(36.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(18.dp))
                            .background(accentBlue.copy(alpha = 0.16f))
                            .border(1.dp, accentBlue.copy(alpha = 0.22f), RoundedCornerShape(18.dp))
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "Now connecting to Dr. $doctorName",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = "Ready when you are, $userName",
                        color = Color.White,
                        fontSize = 30.sp,
                        lineHeight = 36.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Your consultation stays in one secure room. If the network weakens, we keep audio and chat available so the session does not break.",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 15.sp,
                        lineHeight = 24.sp
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 18.dp, vertical = 18.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(
                                                accentBlue,
                                                accentTeal
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = doctorName.take(1).uppercase(),
                                    color = Color.White,
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Dr. $doctorName",
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Consultation will open in video first, with voice and chat available whenever needed.",
                                    color = Color.White.copy(alpha = 0.66f),
                                    fontSize = 12.sp,
                                    lineHeight = 18.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        ConsultationPrepFeatureCard(
                            icon = Icons.Outlined.Videocam,
                            title = "Camera and mic check",
                            description = "Video starts first so the doctor can see and hear you clearly."
                        )
                        ConsultationPrepFeatureCard(
                            icon = Icons.Outlined.ChatBubbleOutline,
                            title = "Smart Network Fallback",
                            description = "If the connection drops, AI smoothly transitions your call to audio or chat without disconnecting."
                        )
                        ConsultationPrepFeatureCard(
                            icon = Icons.Outlined.Analytics,
                            title = "Real-time AI Vitals",
                            description = "Live AI checks run with the video visit. Older records and Guardian analytics are shared only when you choose to share them."
                        )
                        ConsultationPrepFeatureCard(
                            icon = Icons.Outlined.Description,
                            title = "Notes stay in your history",
                            description = "Prescriptions and consultation context remain linked to your records."
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Outlined.Lock,
                                    contentDescription = null,
                                    tint = if (hasMedicalRecordAccess) accentTeal else Color(0xFFFFD166),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = if (hasMedicalRecordAccess) "Medical records shared" else "Past medical history stays private",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = if (hasMedicalRecordAccess) {
                                            if (medicalRecordAccessExpiresAt.isNullOrBlank()) {
                                                "Only Dr. $doctorName can currently review your past reports, prescriptions, and consultations."
                                            } else {
                                                "Only Dr. $doctorName can review your past reports, prescriptions, and consultations for 24 hours unless you revoke access earlier."
                                            }
                                        } else {
                                            "Share only if you want Dr. $doctorName to review older reports, prescriptions, and consultations for this visit."
                                        },
                                        color = Color.White.copy(alpha = 0.68f),
                                        fontSize = 12.sp,
                                        lineHeight = 18.sp
                                    )
                                }
                            }

                            medicalRecordAccessMessage?.takeIf { it.isNotBlank() }?.let { message ->
                                Text(
                                    text = message,
                                    color = Color.White.copy(alpha = 0.72f),
                                    fontSize = 12.sp
                                )
                            }

                            if (!hasMedicalRecordAccess) {
                                var includeGuardianAnalytics by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
                                androidx.compose.runtime.LaunchedEffect(guardianAnalyticsSharingAllowed) {
                                    if (!guardianAnalyticsSharingAllowed) includeGuardianAnalytics = false
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    androidx.compose.material3.Checkbox(
                                        checked = includeGuardianAnalytics,
                                        enabled = guardianAnalyticsSharingAllowed,
                                        onCheckedChange = { includeGuardianAnalytics = it && guardianAnalyticsSharingAllowed },
                                        colors = androidx.compose.material3.CheckboxDefaults.colors(
                                            checkedColor = accentTeal,
                                            uncheckedColor = Color.White.copy(alpha = 0.6f),
                                            checkmarkColor = Color.White
                                        )
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Column {
                                        Text(
                                            text = "Include Guardian Analytics",
                                            color = Color.White.copy(alpha = if (guardianAnalyticsSharingAllowed) 0.8f else 0.45f),
                                            fontSize = 13.sp
                                        )
                                        Text(
                                            text = if (guardianAnalyticsSharingAllowed) {
                                                "Adds sources, reliability notes, and selected Guardian signals."
                                            } else {
                                                "Disabled until patient enables Guardian doctor sharing in Health Card."
                                            },
                                            color = Color.White.copy(alpha = 0.58f),
                                            fontSize = 11.sp,
                                            lineHeight = 15.sp
                                        )
                                    }
                                }
                                Button(
                                    onClick = { onGrantMedicalRecordAccess(includeGuardianAnalytics) },
                                    enabled = !isMedicalRecordAccessLoading,
                                    colors = ButtonDefaults.buttonColors(containerColor = accentTeal)
                                ) {
                                    if (isMedicalRecordAccessLoading) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Share 24h record access")
                                    }
                                }
                            } else {
                                OutlinedButton(
                                    onClick = onRevokeMedicalRecordAccess,
                                    enabled = !isMedicalRecordAccessLoading,
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                                ) {
                                    if (isMedicalRecordAccessLoading) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Revoke doctor access")
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))
                    

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            androidx.compose.material3.Switch(
                                checked = allowAiVitals,
                                onCheckedChange = { allowAiVitals = it },
                                colors = androidx.compose.material3.SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = accentBlue,
                                    uncheckedThumbColor = Color.White.copy(alpha = 0.8f),
                                    uncheckedTrackColor = Color.White.copy(alpha = 0.2f),
                                    uncheckedBorderColor = Color.Transparent
                                )
                            )
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Enable Real-time AI Vitals",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "Allow your camera to securely analyze micro-movements for heart rate and breathing without recording.",
                                    color = Color.White.copy(alpha = 0.68f),
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }

                    if (statusMessage.isNotBlank()) {
                        Spacer(modifier = Modifier.height(18.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(18.dp))
                                .background(Color.White.copy(alpha = 0.08f))
                                .padding(horizontal = 14.dp, vertical = 9.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Outlined.Lock,
                                    contentDescription = null,
                                    tint = accentTeal,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = statusMessage,
                                    color = Color.White.copy(alpha = 0.82f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }

            Button(
                onClick = { onStartConsultation(allowAiVitals) },
                enabled = !isConnecting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp),
                shape = RoundedCornerShape(22.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = accentBlue,
                    disabledContainerColor = accentBlue.copy(alpha = 0.72f)
                )
            ) {
                if (isConnecting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = statusMessage.ifEmpty { "Preparing consultation..." },
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                } else {
                    Text(
                        text = "Start Consultation",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun ConsultationPrepFeatureCard(
    icon: ImageVector,
    title: String,
    description: String
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White.copy(alpha = 0.08f),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4C8DFF).copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = Color(0xFF9FC0FF),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    color = Color.White.copy(alpha = 0.62f),
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }
        }
    }
}
