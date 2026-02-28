package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import com.example.swastik.ui.theme.*

// Extension for UI compatibility
val Doctor.imageEmoji: String get() = "👨‍⚕️"
val Doctor.specialty: String get() = specialization
val Doctor.experience: String get() = "${experienceYears ?: 0} years"
val Doctor.rating: String get() = "${averageRating ?: 0.0}"

// ==================== SMART REMINDERS ====================
@Composable
fun SmartReminderSection(
    reminders: List<Reminder>,
    onViewAllClick: () -> Unit = {}
) {

    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Today's Reminders",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            TextButton(onClick = onViewAllClick) {
                Text("View All", color = SwastikPurple, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (reminders.isEmpty()) {
            // Empty state
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("📅", fontSize = 40.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "No reminders for today",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                    Text(
                        "Your upcoming appointments and medicine reminders will appear here",
                        fontSize = 12.sp,
                        color = Color.LightGray,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    reminders.take(3).forEachIndexed { index, reminder ->
                        ReminderItem(reminder)
                        if (index < minOf(reminders.size - 1, 2)) {
                            HorizontalDivider(
                                modifier = Modifier.padding(vertical = 12.dp),
                                color = Color.LightGray.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReminderItem(reminder: Reminder) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(
                    when (reminder.type) {
                        ReminderType.MEDICINE -> Color(0xFFE8F5E9)
                        ReminderType.APPOINTMENT -> Color(0xFFE3F2FD)
                        ReminderType.TEST -> Color(0xFFFFF3E0)
                    },
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = when (reminder.type) {
                    ReminderType.MEDICINE -> Icons.Outlined.Medication
                    ReminderType.APPOINTMENT -> Icons.Outlined.Event
                    ReminderType.TEST -> Icons.Outlined.Science
                },
                contentDescription = "${reminder.type.name} reminder",
                tint = when (reminder.type) {
                    ReminderType.MEDICINE -> Color(0xFF4CAF50)
                    ReminderType.APPOINTMENT -> SwastikPurple
                    ReminderType.TEST -> Color(0xFFFF9800)
                },
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = reminder.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = if (reminder.isCompleted) Color.Gray else Color.Black
            )
            Text(
                text = reminder.time,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }

        if (reminder.isCompleted) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Completed",
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(24.dp)
            )
        } else {
            Icon(
                Icons.Outlined.Circle,
                contentDescription = "Pending",
                tint = Color.LightGray,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

// ==================== QUICK ACTIONS ====================
@Composable
fun QuickActionsSection(
    onHospitalClick: () -> Unit = {},
    onAmbulanceClick: () -> Unit = {},
    onHelpClick: () -> Unit = {},
    onDiagnosticClick: () -> Unit = {},
    onVitalsClick: () -> Unit = {},
    onOrderHistoryClick: () -> Unit = {},
    onBookingHistoryClick: () -> Unit = {},
    onPrescriptionClick: () -> Unit = {}
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            text = "Quick Actions",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            QuickActionButton(
                icon = Icons.Outlined.LocalHospital,
                label = "Hospital",
                iconTint = Color(0xFF2196F3),
                bgColor = Color(0xFF2196F3).copy(alpha = 0.12f),
                onClick = { onHospitalClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.DirectionsCar,
                label = "Ambulance",
                iconTint = Color(0xFFE53935),
                bgColor = Color(0xFFE53935).copy(alpha = 0.12f),
                onClick = { onAmbulanceClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.Biotech,
                label = "Diagnostic",
                iconTint = Color(0xFF9C27B0),
                bgColor = Color(0xFF9C27B0).copy(alpha = 0.12f),
                onClick = { onDiagnosticClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.MonitorHeart,
                label = "Vitals",
                iconTint = Color(0xFF4CAF50),
                bgColor = Color(0xFF4CAF50).copy(alpha = 0.12f),
                onClick = { onVitalsClick() }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            QuickActionButton(
                icon = Icons.Outlined.Receipt,
                label = "Prescription",
                iconTint = Color(0xFFFF9800),
                bgColor = Color(0xFFFF9800).copy(alpha = 0.12f),
                onClick = onPrescriptionClick
            )
            QuickActionButton(
                icon = Icons.Outlined.HelpOutline,
                label = "Help",
                iconTint = SwastikPurple,
                bgColor = SwastikPurple.copy(alpha = 0.12f),
                onClick = { onHelpClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.ShoppingBag,
                label = "My Orders",
                iconTint = Color(0xFF00897B),
                bgColor = Color(0xFF00897B).copy(alpha = 0.12f),
                onClick = { onOrderHistoryClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.Science,
                label = "My Tests",
                iconTint = Color(0xFF5C6BC0),
                bgColor = Color(0xFF5C6BC0).copy(alpha = 0.12f),
                onClick = { onBookingHistoryClick() }
            )
        }
    }
}

@Composable
private fun PrescriptionQuickAction(onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .border(1.5.dp, Color.LightGray, CircleShape)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.Receipt,
                contentDescription = "Prescription",
                tint = Color.Gray,
                modifier = Modifier.size(26.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text("Prescription", fontSize = 11.sp, color = Color.Gray)
    }
}

@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    iconTint: Color = Color.Gray,
    bgColor: Color = Color.White,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(bgColor),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = label, tint = iconTint, modifier = Modifier.size(26.dp))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, fontSize = 12.sp, color = Color.DarkGray, fontWeight = FontWeight.Medium)
    }
}

// ==================== DOCTOR RECOMMENDATIONS ====================
@Composable
fun DoctorRecommendationSection(
    doctors: List<Doctor>,
    onDoctorClick: (Doctor) -> Unit = {},
    onBookClick: (Doctor) -> Unit = {},
    onSeeAllClick: () -> Unit = {}
) {

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Recommended for You",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            TextButton(onClick = onSeeAllClick) {
                Text("See All", color = SwastikPurple, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (doctors.isEmpty()) {
            // Empty state
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("👨‍⚕️", fontSize = 40.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Doctor recommendations coming soon",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                    Text(
                        "We'll suggest doctors based on your health profile",
                        fontSize = 12.sp,
                        color = Color.LightGray,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            androidx.compose.foundation.lazy.LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(horizontal = 20.dp)
            ) {
                items(doctors.size) { index ->
                    DoctorCard(
                        doctor = doctors[index],
                        onClick = { onDoctorClick(doctors[index]) },
                        onBookClick = { onBookClick(doctors[index]) }
                    )
                }
            }
        }
    }
}

@Composable
private fun DoctorCard(
    doctor: Doctor,
    onClick: () -> Unit = {},
    onBookClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .width(160.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .background(SwastikPurple.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(doctor.imageEmoji, fontSize = 30.sp)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = doctor.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black,
                textAlign = TextAlign.Center
            )

            Text(
                text = doctor.specialty,
                fontSize = 12.sp,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Star,
                    contentDescription = "Doctor rating",                    tint = Color(0xFFFFC107),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "${doctor.rating}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = " • ${doctor.experience}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onBookClick,
                modifier = Modifier.fillMaxWidth().height(36.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple),
                contentPadding = PaddingValues(0.dp)
            ) {
                Text("Book", fontSize = 12.sp)
            }
        }
    }
}

// ==================== ENHANCED CHATBOT ====================
@Composable
fun EnhancedChatBotSection(
    onChatbotClick: () -> Unit = {}
) {
    val quickOptions = listOf(
        "🤒 I have fever",
        "💔 Chest pain",
        "📅 Book doctor",
        "💊 Medicine info"
    )

    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            text = "AI Health Assistant",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black
        )

        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onChatbotClick() },
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(Color(0xFFE3F2FD), Color(0xFFBBDEFB))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🤖", fontSize = 32.sp)
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = "How can I help you today?",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.Black
                        )
                        Text(
                            text = "Describe your symptoms or ask a question",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    quickOptions.take(2).forEach { option ->
                        ChatOptionChip(text = option, onClick = onChatbotClick, modifier = Modifier.weight(1f))
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    quickOptions.drop(2).forEach { option ->
                        ChatOptionChip(text = option, onClick = onChatbotClick, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatOptionChip(text: String, onClick: () -> Unit = {}, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() },
        color = SwastikPurple.copy(alpha = 0.1f),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            fontSize = 13.sp,
            color = SwastikPurple,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center
        )
    }
}

// ==================== TRUST SIGNALS ====================
@Composable
fun TrustSignalsStrip() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.06f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TrustBadge(Icons.Default.Verified, "Verified\nDoctors", Color(0xFF4CAF50))
            TrustBadge(Icons.Default.Lock, "Data\nEncrypted", SwastikPurple)
            TrustBadge(Icons.Default.Security, "ABDM\nCompliant", Color(0xFF2196F3))
        }
    }
}

@Composable
private fun TrustBadge(icon: ImageVector, text: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = icon,
            contentDescription = text.replace("\n", " "),
            tint = color,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = text,
            fontSize = 10.sp,
            color = Color.DarkGray,
            textAlign = TextAlign.Center,
            lineHeight = 12.sp
        )
    }
}

// ==================== EMERGENCY SOS ====================
@Composable
fun EmergencySOSButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    FloatingActionButton(
        onClick = onClick,
        modifier = modifier.size((56 * scale).dp),
        containerColor = Color(0xFFD32F2F),
        shape = CircleShape,
        elevation = FloatingActionButtonDefaults.elevation(8.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.LocalHospital,
                contentDescription = "Emergency SOS",
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
            Text(
                "SOS",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}

@Composable
fun EmergencyDialog(
    onDismiss: () -> Unit,
    onNavigateToEmergency: () -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                Icons.Default.Warning,
                contentDescription = "Emergency warning",
                tint = Color.Red,
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                "Emergency SOS",
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Choose an emergency action:",
                    textAlign = TextAlign.Center,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Primary: Navigate to full Emergency Screen for ambulance dispatch
                Button(
                    onClick = {
                        onNavigateToEmergency()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.LocalHospital, contentDescription = "Request ambulance")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Request Ambulance")
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Fallback: Direct phone dialer
                OutlinedButton(
                    onClick = {
                        com.example.swastik.utils.NavigationHelper.openDialer(context, "108")
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Call, contentDescription = "Call ambulance", tint = Color.Red)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Call Ambulance (108)", color = Color.Red)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(android.content.Intent.EXTRA_TEXT, "🚨 EMERGENCY SOS! I need help. Please contact emergency services. - Sent from Swastik Health")
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Alert Contacts"))
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.People, contentDescription = "Alert emergency contacts", tint = SwastikPurple)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Alert Emergency Contacts", color = SwastikPurple)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(android.content.Intent.EXTRA_TEXT, "📍 I am sharing my live location for an emergency. Track me on Google Maps.")
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Location"))
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = "Share live location", tint = SwastikPurple)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Share Live Location", color = SwastikPurple)
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
