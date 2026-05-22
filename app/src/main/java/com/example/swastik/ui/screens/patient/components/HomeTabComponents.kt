package com.example.swastik.ui.screens.patient.components

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.KeyboardArrowRight
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
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.graphicsLayer
import java.util.Locale
import com.example.swastik.ui.components.bounceClick

import com.example.swastik.R
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import com.example.swastik.ui.theme.*
import androidx.compose.ui.draw.shadow
import androidx.compose.material.icons.filled.Emergency
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.CalendarMonth

@Composable
fun EmergencyQuickCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF0F0)) // Light red/pink
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color(0xFFFFD6D6), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "✱", // Asterisk or you can use an Icon
                    color = Color.Red,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Emergency / SOS",
                    color = Color.Red,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Tap to call ambulance or alert contacts",
                    color = Color.DarkGray,
                    fontSize = 12.sp
                )
            }
            Icon(
                Icons.Default.KeyboardArrowRight,
                contentDescription = null,
                tint = Color.Red,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// Extension for UI compatibility
val Doctor.imageEmoji: String get() = "👨‍⚕️"
val Doctor.specialty: String get() = specialization
val Doctor.experience: String? get() = experienceYears?.takeIf { it > 0 }?.let { "$it years" }
val Doctor.rating: String? get() = averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) }

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
            .bounceClick { onClick() },
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
                        .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(14.dp)),
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

            doctor.recommendationReason?.let { reason ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = reason,
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.tertiary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

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

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = "In-person",
                        fontSize = 9.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
                if (doctor.videoConsultationFee != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Video",
                            fontSize = 9.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
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
    val infiniteTransition = rememberInfiniteTransition(label = "mic_glow")
    
    val fullText = "Hi, how are you feeling today?"
    var displayedText by remember { mutableStateOf("") }
    
    LaunchedEffect(Unit) {
        while(true) {
            for (i in 0..fullText.length) {
                displayedText = fullText.substring(0, i)
                kotlinx.coroutines.delay(100)
            }
            kotlinx.coroutines.delay(2000)
            displayedText = ""
        }
    }

    val micScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "mic_scale"
    )
    
    val ringAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ring_alpha"
    )

    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 8.dp,
                    shape = RoundedCornerShape(20.dp),
                    spotColor = Color(0xFF00F2FE).copy(alpha = 0.2f)
                )
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364))
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
                .border(
                    width = 1.dp,
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.1f),
                            Color(0xFF00F2FE).copy(alpha = 0.2f),
                            Color.White.copy(alpha = 0.05f)
                        )
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
                .clickable { onChatbotClick() }
                .padding(8.dp)
        ) {
            // Decorative particles
            Canvas(modifier = Modifier.matchParentSize()) {
                drawCircle(Color.White.copy(alpha = 0.05f), radius = 1f, center = center.copy(x = size.width * 0.15f, y = size.height * 0.15f))
                drawCircle(Color(0xFF00F2FE).copy(alpha = 0.05f), radius = 1.2f, center = center.copy(x = size.width * 0.85f, y = size.height * 0.2f))
            }

            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Left Top Icon Badge (Reduced)
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .shadow(2.dp, CircleShape, spotColor = Color(0xFF00F2FE))
                                .background(Color(0xFF2C5364).copy(alpha = 0.6f), CircleShape)
                                .border(1.dp, Color(0xFF00F2FE).copy(alpha = 0.2f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.ai_icon),
                                contentDescription = "AI Assistant",
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        // Title Text Block (More Compact)
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Vaididea AI Assistant",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    maxLines = 1
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text("✨", fontSize = 10.sp)
                            }
                            Text(
                                text = "Your personal health companion",
                                fontSize = 9.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                fontWeight = FontWeight.Medium,
                                maxLines = 1
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    // Mic Action Button Section (Reduced)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.width(IntrinsicSize.Min)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            // Outer Glow rings
                            Box(
                                modifier = Modifier
                                    .size(52.dp)
                                    .graphicsLayer {
                                        scaleX = 1f + (1f - ringAlpha) * 0.15f
                                        scaleY = 1f + (1f - ringAlpha) * 0.15f
                                        alpha = ringAlpha * 0.15f
                                    }
                                    .border(1.dp, Color(0xFF00F2FE).copy(alpha = 0.2f), CircleShape)
                            )
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .graphicsLayer {
                                        val delayAlpha = (ringAlpha + 0.5f).let { if (it > 1f) it - 1f else it }
                                        scaleX = 1f + (1f - delayAlpha) * 0.12f
                                        scaleY = 1f + (1f - delayAlpha) * 0.12f
                                        alpha = delayAlpha * 0.25f
                                    }
                                    .border(1.dp, Color(0xFF4FACFE).copy(alpha = 0.2f), CircleShape)
                            )
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .graphicsLayer {
                                        scaleX = micScale
                                        scaleY = micScale
                                    }
                                    .shadow(3.dp, CircleShape, spotColor = Color(0xFF00F2FE))
                                    .background(Color.White, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Mic,
                                    contentDescription = "Voice",
                                    tint = Color(0xFF203A43),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "Tap to talk",
                            fontSize = 8.sp,
                            color = Color(0xFF00F2FE),
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Query/Input Bubble (Reduced)
                Surface(
                    color = Color.White.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(30.dp),
                    border = BorderStroke(0.6.dp, Color.White.copy(alpha = 0.06f))
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 10.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text(
                            text = displayedText,
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
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

@Composable
fun SearchBar(onSearchClick: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onSearchClick() }
    ) {
        OutlinedTextField(
            value = "",
            onValueChange = { },
            enabled = false,
            placeholder = {
                Text("Search Specialists & Conditions", color = Color.Gray, fontSize = 15.sp)
            },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(24.dp))
            },
            modifier = Modifier
                .fillMaxWidth()
                .shadow(elevation = 6.dp, shape = RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                disabledBorderColor = Color.Transparent,
                disabledContainerColor = MaterialTheme.colorScheme.surface,
                disabledTextColor = MaterialTheme.colorScheme.onSurface,
                disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
                disabledLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant
            ),
            singleLine = true
        )
    }
}

@Composable
fun HealthCardQuickCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(76.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFF264653), Color(0xFF2A9D8F)) // Teal gradient
                    )
                )
                .padding(12.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.QrCode,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Digital\nHealth Card",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
fun VitalsQuickCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(76.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFF4361EE), Color(0xFF4CC9F0)) // Blue/Azure gradient
                    )
                )
                .padding(12.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.MonitorHeart,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Vitals &\nReminders",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
fun InPersonFeatureCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(260.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFE3F2FD), Color(0xFF90CAF9)) // Light Blue gradient
                    )
                )
        ) {
            // Header Tag
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "IN-PERSON\nVISIT",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF1565C0),
                    lineHeight = 14.sp
                )
                Surface(
                    color = Color(0xFF1565C0).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Text(
                        "NEARBY",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1565C0)
                    )
                }
            }

            // Illustration Placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                // Use a hospital icon or emoji as illustration
                Text("🏥", fontSize = 64.sp)
            }

            // Content Area
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Text(
                    "IN-PERSON VISIT",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.Black
                )
                Text(
                    "Find doctors with open appointments nearby",
                    fontSize = 11.sp,
                    color = Color.DarkGray,
                    lineHeight = 13.sp,
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(34.dp),
                    contentPadding = PaddingValues(0.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("SEE SLOTS TODAY", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.ArrowForward, null, tint = Color.Black, modifier = Modifier.size(12.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun VideoConsultFeatureCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(260.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFE8F5E9), Color(0xFFA5D6A7)) // Light Green gradient
                    )
                )
        ) {
            // Header Tag
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "INSTANT\nVIDEO CONSULT",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF2E7D32),
                    lineHeight = 14.sp
                )
                Surface(
                    color = Color(0xFF2E7D32).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.size(6.dp).background(Color(0xFF2E7D32), CircleShape))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "LIVE NOW",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF2E7D32)
                        )
                    }
                }
            }

            // Illustration Placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("👨‍⚕️📱", fontSize = 64.sp)
            }

            // Content Area
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Text(
                    "VIDEO CONSULT",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.Black
                )
                Text(
                    "Connect with a specialist instantly online",
                    fontSize = 11.sp,
                    color = Color.DarkGray,
                    lineHeight = 13.sp,
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(34.dp),
                    contentPadding = PaddingValues(0.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Text("START CONSULTATION", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun SummaryActionCard(
    title: String,
    description: String,
    buttonText: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(130.dp) // Fixed height to ensure both cards are exactly the same size
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Text(
                title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                color = Color.Black
            )
            
            Spacer(modifier = Modifier.height(10.dp))
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0xFFF3F4F6), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = SwastikPrimary, modifier = Modifier.size(22.dp))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    description,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    lineHeight = 16.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                Surface(
                    onClick = onClick,
                    color = Color(0xFFF3F4F6),
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Text(
                        buttonText,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.DarkGray
                    )
                }
            }
        }
    }
}

@Composable
fun CommunityQASection(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.Forum,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Community Q&A",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Ask health questions, get answers from doctors",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    maxLines = 2
                )
            }
            Icon(
                Icons.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
