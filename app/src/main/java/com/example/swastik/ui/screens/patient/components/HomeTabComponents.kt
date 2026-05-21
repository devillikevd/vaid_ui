package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.animateContentSize
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import java.util.Locale

import com.example.swastik.R
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import com.example.swastik.ui.theme.*

// Extension for UI compatibility
val Doctor.imageEmoji: String get() = "👨‍⚕️"
val Doctor.specialty: String get() = specialization
val Doctor.experience: String? get() = experienceYears?.takeIf { it > 0 }?.let { "$it years" }
val Doctor.rating: String? get() = averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) }

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
                text = stringResource(R.string.todays_reminders),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            TextButton(onClick = onViewAllClick) {
                Text(stringResource(R.string.view_all), color = SwastikPrimary, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (reminders.isEmpty()) {
            // Empty state
            com.example.swastik.ui.components.EmptyStateView(
                title = stringResource(R.string.no_reminders_today),
                subtitle = stringResource(R.string.reminders_description),
                icon = Icons.Outlined.Notifications
            )
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    reminders.take(3).forEachIndexed { index, reminder ->
                        ReminderItem(reminder)
                        if (index < minOf(reminders.size - 1, 2)) {
                            HorizontalDivider(
                                modifier = Modifier.padding(vertical = 12.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
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
                .size(44.dp)
                .background(
                    when (reminder.type) {
                        ReminderType.MEDICINE -> Color(0xFFF3E5F5)
                        ReminderType.APPOINTMENT -> SwastikPrimaryLight
                        ReminderType.TEST -> Color(0xFFE0F2F1)
                    },
                    RoundedCornerShape(12.dp)
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
                    ReminderType.MEDICINE -> Color(0xFF8E24AA)
                    ReminderType.APPOINTMENT -> SwastikPrimary
                    ReminderType.TEST -> Color(0xFF00897B)
                },
                modifier = Modifier.size(22.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = reminder.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = if (reminder.isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = reminder.time,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (reminder.isCompleted) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Completed",
                tint = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.size(24.dp)
            )
        } else {
            Icon(
                Icons.Outlined.Circle,
                contentDescription = "Pending",
                tint = MaterialTheme.colorScheme.outlineVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

// ==================== QUICK ACTIONS ====================
@Composable
fun QuickActionsSection(
    onAmbulanceClick: () -> Unit = {},
    onHelpClick: () -> Unit = {},
    onVitalsClick: () -> Unit = {},
    onOrderHistoryClick: () -> Unit = {},
    onBookingHistoryClick: () -> Unit = {},
    onPrescriptionClick: () -> Unit = {}
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            text = stringResource(R.string.quick_actions),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            QuickActionButton(
                icon = Icons.Outlined.DirectionsCar,
                label = stringResource(R.string.ambulance),
                iconTint = MaterialTheme.colorScheme.error,
                bgColor = MaterialTheme.colorScheme.error.copy(alpha = 0.12f),
                onClick = { onAmbulanceClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.MonitorHeart,
                label = stringResource(R.string.vitals),
                iconTint = MaterialTheme.colorScheme.secondary,
                bgColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f),
                onClick = { onVitalsClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.Receipt,
                label = stringResource(R.string.prescription),
                iconTint = MaterialTheme.colorScheme.tertiary,
                bgColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f),
                onClick = onPrescriptionClick
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            QuickActionButton(
                icon = Icons.Outlined.HelpOutline,
                label = stringResource(R.string.help),
                iconTint = SwastikPrimary,
                bgColor = SwastikPrimary.copy(alpha = 0.12f),
                onClick = { onHelpClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.ShoppingBag,
                label = stringResource(R.string.my_orders),
                iconTint = Color(0xFF00897B),
                bgColor = Color(0xFF00897B).copy(alpha = 0.12f),
                onClick = { onOrderHistoryClick() }
            )
            QuickActionButton(
                icon = Icons.Outlined.Science,
                label = stringResource(R.string.my_tests),
                iconTint = Color(0xFF5C6BC0),
                bgColor = Color(0xFF5C6BC0).copy(alpha = 0.12f),
                onClick = { onBookingHistoryClick() }
            )
        }
    }
}

// ==================== CARE DIRECTORY ====================
@Composable
fun CareDirectorySection(
    onHospitalClick: () -> Unit = {},
    onClinicClick: () -> Unit = {},
    onPharmacyClick: () -> Unit = {},
    onDiagnosticClick: () -> Unit = {}
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            text = "Healthcare Services",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CareDirectoryCard(
                modifier = Modifier.weight(1f),
                title = "Hospitals",
                subtitle = "Multi-speciality",
                icon = Icons.Outlined.LocalHospital,
                onClick = onHospitalClick
            )
            CareDirectoryCard(
                modifier = Modifier.weight(1f),
                title = "Clinics",
                subtitle = "Primary Care",
                icon = Icons.Outlined.MedicalServices,
                onClick = onClinicClick
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CareDirectoryCard(
                modifier = Modifier.weight(1f),
                title = "Pharmacy",
                subtitle = "Medicines & Care",
                icon = Icons.Outlined.LocalPharmacy,
                onClick = onPharmacyClick
            )
            CareDirectoryCard(
                modifier = Modifier.weight(1f),
                title = "Diagnostics",
                subtitle = "Tests & Scans",
                icon = Icons.Outlined.Science,
                onClick = onDiagnosticClick
            )
        }
    }
}

@Composable
private fun CareDirectoryCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SwastikNeutral),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = title,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
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
                .border(1.5.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surface),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.Receipt,
                contentDescription = "Prescription",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(26.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(stringResource(R.string.prescription), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    iconTint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    bgColor: Color = MaterialTheme.colorScheme.surface,
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
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
    }
}

// ==================== DOCTOR RECOMMENDATIONS ====================
@Composable
fun DoctorRecommendationSection(
    doctors: List<Doctor>,
    isLoading: Boolean = false,
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
                text = stringResource(R.string.recommended_for_you),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            TextButton(onClick = onSeeAllClick) {
                Text(stringResource(R.string.see_all), color = SwastikPrimary, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            androidx.compose.foundation.lazy.LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(horizontal = 20.dp)
            ) {
                items(3) {
                    Box(modifier = Modifier.width(280.dp)) {
                        com.example.swastik.ui.components.DoctorCardShimmer()
                    }
                }
            }
        } else if (doctors.isEmpty()) {
            // Empty state
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(stringResource(R.string.string_2), fontSize = 40.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.no_doctor_recommendations),
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        stringResource(R.string.recommendations_description),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.outlineVariant,
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
            .width(200.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(SwastikPrimaryLight, RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(doctor.imageEmoji, fontSize = 28.sp)
                    // Verified Badge overlay
                    Icon(
                        Icons.Default.Verified,
                        contentDescription = "Verified",
                        tint = SwastikPrimary,
                        modifier = Modifier
                            .size(18.dp)
                            .align(Alignment.BottomEnd)
                            .offset(x = 4.dp, y = 4.dp)
                            .background(Color.White, CircleShape)
                    )
                }
                
                Surface(
                    color = Color(0xFFE8F5E9),
                    shape = RoundedCornerShape(100.dp)
                ) {
                    Text(
                        "Today", 
                        fontSize = 10.sp, 
                        color = Color(0xFF2E7D32),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = doctor.name,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = doctor.specialty,
                fontSize = 13.sp,
                color = SwastikPrimary,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Star,
                    contentDescription = "Doctor rating",
                    tint = Color(0xFFFFC107),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = doctor.rating ?: "4.8",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = " • ${doctor.experience ?: "8+ Yrs"}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onBookClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, SwastikPrimary.copy(alpha = 0.5f)),
                contentPadding = PaddingValues(0.dp)
            ) {
                Text(stringResource(R.string.book), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ==================== ENHANCED CHATBOT ====================
@Composable
fun EnhancedChatBotSection(
    onChatbotClick: () -> Unit = {}
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onChatbotClick() },
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = SwastikPrimaryDark),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.SmartToy, contentDescription = "AI Assistant", tint = Color.White, modifier = Modifier.size(28.dp))
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Swastik AI Assistant",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Check symptoms, book doctors, ask anything.",
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.8f),
                            lineHeight = 18.sp
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Chat bubble preview
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(topStart = 4.dp, topEnd = 16.dp, bottomStart = 16.dp, bottomEnd = 16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Hi, how are you feeling today?",
                            fontSize = 14.sp,
                            color = TextPrimary,
                            modifier = Modifier.weight(1f)
                        )
                        Box(
                            modifier = Modifier.size(36.dp).clip(CircleShape).background(SwastikPrimaryLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Mic, contentDescription = "Voice", tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
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
        colors = CardDefaults.cardColors(containerColor = SwastikPrimary.copy(alpha = 0.06f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TrustBadge(Icons.Default.Verified, stringResource(R.string.verified_doctors), MaterialTheme.colorScheme.secondary)
            TrustBadge(Icons.Default.Lock, stringResource(R.string.data_encrypted), SwastikPrimary)
            TrustBadge(Icons.Default.Security, stringResource(R.string.abdm_compliant), Color(0xFF2196F3))
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
            color = MaterialTheme.colorScheme.onSurface,
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
                tint = MaterialTheme.colorScheme.surface,
                modifier = Modifier.size(24.dp)
            )
            Text(
                "SOS",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.surface
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
                stringResource(R.string.emergency_sos),
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    stringResource(R.string.choose_emergency_action),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
                    Text(stringResource(R.string.request_ambulance))
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
                    Text(stringResource(R.string.call_ambulance_108_1), color = Color.Red)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(android.content.Intent.EXTRA_TEXT, "🚨 EMERGENCY SOS! I need help. Please contact emergency services. - Sent from VAIDIDEA Health")
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Alert Contacts"))
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.People, contentDescription = "Alert emergency contacts", tint = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.alert_emergency_contacts), color = SwastikPrimary)
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
                    Icon(Icons.Default.LocationOn, contentDescription = "Share live location", tint = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.share_live_location), color = SwastikPrimary)
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

// ==================== EMERGENCY DOCK ====================
@Composable
fun EmergencySOSDock(onEmergencyClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .clickable { onEmergencyClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SwastikRed.copy(alpha = 0.08f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(SwastikRed.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Emergency,
                    contentDescription = "Emergency",
                    tint = SwastikRed,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Emergency / SOS",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = SwastikRed
                )
                Text(
                    text = "Tap to call ambulance or alert contacts",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Icon(
                Icons.Default.ArrowForwardIos,
                contentDescription = null,
                tint = SwastikRed.copy(alpha = 0.6f),
                modifier = Modifier.size(16.dp)
            )
        }
    }
}
