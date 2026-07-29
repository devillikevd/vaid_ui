package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.animation.core.animateFloat
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import kotlinx.coroutines.delay
import kotlinx.coroutines.yield
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.ui.res.painterResource
import androidx.compose.runtime.getValue
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.zIndex
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.DailyFitnessLog
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.ui.theme.*
import java.util.Locale
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.res.stringResource

private val HomeSoftSurface = Color(0xFFF8FBFB)
private val EmergencyRed = Color(0xFFFF5252)
private val EmergencyTextRed = Color(0xFFD32F2F)
private val EmergencySoftRed = Color(0xFFFFEBEE)
private val AssistantDarkGreen = Color(0xFF00796B)

@Composable
fun EmergencySOSBanner(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), // Added slight shadow
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDA4AF).copy(alpha = 0.5f)) // Subtle red border
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFFFFF0F0), Color(0xFFFFEAEA)) // Very soft pastel pink/red
                    )
                )
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ambulance_icon),
                        contentDescription = "Ambulance",
                        modifier = Modifier.size(24.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.emergency_sos_1),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = Color(0xFFD32F2F) // Calm but readable dark red
                    )
                    Text(
                        stringResource(R.string.tap_to_call_ambulance),
                        fontSize = 12.sp,
                        color = Color(0xFFD32F2F).copy(alpha = 0.8f)
                    )
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Call, 
                        contentDescription = null, 
                        tint = Color(0xFFD32F2F), 
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SwastikAIBanner(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), // Added slight shadow
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC).copy(alpha = 0.5f)) // Subtle green border
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFFF0FDF4), Color(0xFFDCFCE7)) // Restored softer green to keep it light
                    )
                )
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("V", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Color(0xFF15803D))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.vaididea_ai_assistant),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = Color(0xFF14532D) // Green 900
                    )
                    Text(
                        stringResource(R.string.hi_how_are_you_feeling),
                        fontSize = 12.sp,
                        color = Color(0xFF166534).copy(alpha = 0.85f), // Green 800
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Mic,
                        contentDescription = null,
                        tint = Color(0xFF15803D), // Green 700
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

private val HealthIdTeal = Color(0xFF00796B)

@Composable
private fun ConsultationTypeCard(
    imageRes: Int,
    bgColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(115.dp) // Slightly taller to prevent excessive cropping, while still keeping it compact
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Image(
            painter = painterResource(id = imageRes),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop, // Fills the card perfectly
            alignment = Alignment.TopCenter // Ensures the top of the image (where the text is) is NEVER cropped!
        )
    }
}

@Composable
fun InPersonConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        imageRes = R.drawable.inpersonconsultation_new, // New webp image
        bgColor = Color(0xFFDDF2FF),
        onClick = onClick
    )
}

@Composable
fun VideoConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        imageRes = R.drawable.videoconsultation_new, // New webp image
        bgColor = Color(0xFFE2EEFF), // Assuming #2EEFF meant #E2EEFF
        onClick = onClick
    )
}

@Composable
fun CompactHealthIdCard(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    fitnessLog: DailyFitnessLog? = null,
    onClick: () -> Unit,
    onNutritionClick: () -> Unit = {}
) {
    val steps = fitnessLog?.totalSteps?.takeIf { it > 0 }
    val calories = fitnessLog?.caloriesBurned?.takeIf { it > 0f }
    val activeMinutes = fitnessLog?.activeMinutes?.takeIf { it > 0 }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFFE8F8EF), Color(0xFFF8FBFF))
                    )
                )
                .padding(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(Color.White, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.QrCode2, null, tint = Color(0xFF047857), modifier = Modifier.size(26.dp))
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Smart Health Hub",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = profile?.name?.takeIf { it.isNotBlank() }?.let { "Wellness, records and connected health for $it" }
                            ?: "Wellness, records and connected health",
                        fontSize = 11.sp,
                        color = Color(0xFF475569),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Open", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF047857))
                    Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF047857), modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                HubMetricPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.DirectionsWalk,
                    label = "Steps",
                    value = steps?.let { String.format(Locale.getDefault(), "%,d", it) } ?: "Connect"
                )
                HubMetricPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.LocalFireDepartment,
                    label = "Calories",
                    value = calories?.let { "${it.toInt()} kcal" } ?: "Track"
                )
                HubMetricPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.Timer,
                    label = "Active",
                    value = activeMinutes?.let { "${it}m" } ?: "Today"
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                HubActionPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.CameraAlt,
                    label = "Log Meal",
                    tint = Color(0xFFE65100),
                    bg = Color(0xFFFFF3E0),
                    onClick = onNutritionClick
                )
                HubActionPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.FitnessCenter,
                    label = "Workout",
                    tint = Color(0xFF2563EB),
                    bg = Color(0xFFEFF6FF),
                    onClick = onClick
                )
                HubActionPill(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Filled.Sync,
                    label = "Sync",
                    tint = Color(0xFF6A5AE0),
                    bg = Color(0xFFF0EFFF),
                    onClick = onClick
                )
            }
        }
    }
}

@Composable
private fun HubMetricPill(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    value: String
) {
    Column(
        modifier = modifier
            .heightIn(min = 58.dp)
            .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(12.dp))
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Color(0xFF047857), modifier = Modifier.size(15.dp))
            Text(label, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1)
        }
        Text(
            value,
            fontSize = 11.sp,
            color = Color(0xFF0F172A),
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun HubActionPill(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    tint: Color,
    bg: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = modifier
            .height(38.dp)
            .background(bg, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            label,
            fontSize = 10.sp,
            color = tint,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun DietTrackerCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)), // Warm amber/orange tint
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(Color.White, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.CameraAlt,
                    contentDescription = "Diet Tracker",
                    tint = Color(0xFFE65100),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.snap_track_meal),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = stringResource(R.string.aipowered_diet_nutrition_analysis),
                    fontSize = 11.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.scan_food),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE65100)
                )
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFFE65100), modifier = Modifier.size(14.dp))
            }
        }
    }
}


@Composable
fun PrimaryActionsGrid(
    onClinicClick: () -> Unit,
    onVideoClick: () -> Unit,
    onHealthCardClick: () -> Unit
) {
    // Deprecated
}

@Composable
fun HealthServicesSection(
    onClinicClick: () -> Unit,
    onPharmacyClick: () -> Unit,
    onLabTestsClick: () -> Unit,
    onHospitalsClick: () -> Unit,
    showTitle: Boolean = true
) {
    Column(modifier = Modifier.padding(vertical = if (showTitle) 8.dp else 12.dp)) {
        if (showTitle) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.quick_actions),
                    fontWeight = FontWeight.ExtraBold, 
                    fontSize = 16.sp, 
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Row 1: Find Hospital | Book Clinic (OPD)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                QuickActionGridCard(
                    modifier = Modifier.weight(1f),
                    title = "Find\nHospitals",
                    imageRes = R.drawable.find_hospital,
                    onClick = onHospitalsClick
                )
                QuickActionGridCard(
                    modifier = Modifier.weight(1f),
                    title = "Book Clinic\n(OPD)",
                    imageRes = R.drawable.clinic_visit,
                    onClick = onClinicClick
                )
            }
            // Row 2: Order Medicine | Book Lab Test
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                QuickActionGridCard(
                    modifier = Modifier.weight(1f),
                    title = "Order\nMedicine",
                    imageRes = R.drawable.order_medicine,
                    onClick = onPharmacyClick
                )
                QuickActionGridCard(
                    modifier = Modifier.weight(1f),
                    title = "Book\nLab Test",
                    imageRes = R.drawable.book_test_lab,
                    onClick = onLabTestsClick
                )
            }
        }
    }
}

private data class QuickActionItem(
    val title: String,
    val imageRes: Int,
    val onClick: () -> Unit
)

@Composable
fun QuickActionGridCard(
    modifier: Modifier = Modifier,
    title: String,
    imageRes: Int,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(130.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alignment = Alignment.TopCenter
            )

            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(60.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.90f),
                                MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                    )
            )
            
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 16.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = androidx.compose.ui.text.style.TextAlign.Start,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 12.dp, end = 12.dp, bottom = 12.dp)
            )
        }
    }
}

@Composable
fun CommunityQABanner(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatars overlap
            Box(modifier = Modifier.width(54.dp).height(36.dp)) {
                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).border(2.dp, Color.White, CircleShape).align(Alignment.CenterStart), contentAlignment = Alignment.Center) { Text(stringResource(R.string.string_2), fontSize = 18.sp) }
                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).border(2.dp, Color.White, CircleShape).align(Alignment.CenterEnd), contentAlignment = Alignment.Center) { Text(stringResource(R.string.str_key_1), fontSize = 18.sp) }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF4CAF50)))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        stringResource(R.string.community_qa),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = Color(0xFF1E293B)
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    stringResource(R.string.get_answers_from_verified_doctors),
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }

            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = Color(0xFF94A3B8),
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
fun SecondaryActionsGrid(
    modifier: Modifier = Modifier,
    onReportsClick: () -> Unit,
    onAppointmentsClick: () -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 62.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Reports Card
        Card(
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 62.dp)
                .clickable(onClick = onReportsClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.report_icon),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        stringResource(R.string.filter_reports),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        stringResource(R.string.history),
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }

        // Appointments Card
        Card(
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 62.dp)
                .clickable(onClick = onAppointmentsClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.appoinment_icon),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        stringResource(R.string.appointments),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        stringResource(R.string.upcoming),
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
fun TertiaryActionsGrid(
    modifier: Modifier = Modifier,
    onOrdersClick: () -> Unit,
    onBookingsClick: () -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 62.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // My Orders Card
        Card(
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 62.dp)
                .clickable(onClick = onOrdersClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.my_orders_icon),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        stringResource(R.string.my_orders),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        stringResource(R.string.filter_medicines),
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }

        // My Bookings Card
        Card(
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 62.dp)
                .clickable(onClick = onBookingsClick),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.my_bookings_icon),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        stringResource(R.string.my_bookings),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        stringResource(R.string.lab_tests),
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }
    }
}

private val HealthcareServiceCardHeight = 150.dp

@Composable
private fun HealthcareServiceCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color,
    imageRes: Int,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
    imageWidthFraction: Float = 1f,
    imageContentScale: ContentScale = ContentScale.Crop
) {
    Card(
        modifier = modifier
            .height(HealthcareServiceCardHeight)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (imageWidthFraction >= 1f) {
                Image(
                    painter = painterResource(id = imageRes),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = imageContentScale,
                    alignment = Alignment.CenterEnd
                )
            } else {
                Image(
                    painter = painterResource(id = imageRes),
                    contentDescription = null,
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .fillMaxHeight()
                        .fillMaxWidth(imageWidthFraction)
                        .padding(end = 4.dp),
                    contentScale = imageContentScale,
                    alignment = Alignment.CenterEnd
                )
            }

            val gradientStops = if (imageWidthFraction < 1f) {
                arrayOf(
                    0f to backgroundColor,
                    0.4f to backgroundColor,
                    0.52f to backgroundColor.copy(alpha = 0.95f),
                    1f to backgroundColor.copy(alpha = 0.2f)
                )
            } else {
                arrayOf(
                    0f to backgroundColor,
                    0.5f to backgroundColor,
                    0.78f to backgroundColor.copy(alpha = 0.5f),
                    1f to Color.Transparent
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.horizontalGradient(colorStops = gradientStops))
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth(if (imageWidthFraction < 1f) 0.65f else 0.75f)
                    .align(Alignment.TopStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 15.sp
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        fontSize = 11.sp,
                        lineHeight = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
fun TopHealthcareServicesRow(
    onHospitalsClick: () -> Unit,
    onClinicsClick: () -> Unit,
    onPharmacyClick: () -> Unit,
    onDiagnosticsClick: () -> Unit,
    onFitnessClick: () -> Unit = {}
) {
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    // Screen width - padding (16dp*2) - spacing (8dp*3) divided by 4
    val itemWidth = (configuration.screenWidthDp.dp - 32.dp - 24.dp) / 4

    androidx.compose.foundation.lazy.LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            TopServiceIconCard(
                modifier = Modifier.width(itemWidth),
                imageRes = R.drawable.find_hospital,
                backgroundColor = Color(0xFFE8F1FC), // Light blue
                imageAlignment = androidx.compose.ui.BiasAlignment(0f, 0.7f), // Shift UP significantly to crop top location icon
                onClick = onHospitalsClick
            )
        }
        item {
            TopServiceIconCard(
                modifier = Modifier.width(itemWidth),
                imageRes = R.drawable.clinic_visit,
                backgroundColor = Color(0xFFE8F5E9), // Light green
                imageAlignment = androidx.compose.ui.BiasAlignment(0f, -0.5f), // Shift slightly UP from TopCenter
                onClick = onClinicsClick
            )
        }
        item {
            TopServiceIconCard(
                modifier = Modifier.width(itemWidth),
                imageRes = R.drawable.order_medicine,
                backgroundColor = Color(0xFFFFF0E6), // Light peach
                imageAlignment = androidx.compose.ui.BiasAlignment(0f, -0.5f), // Shift slightly UP from TopCenter
                onClick = onPharmacyClick
            )
        }
        item {
            TopServiceIconCard(
                modifier = Modifier.width(itemWidth),
                imageRes = R.drawable.book_test_lab,
                backgroundColor = Color(0xFFF4EBF7), // Light purple
                imageAlignment = androidx.compose.ui.BiasAlignment(0f, -0.5f), // Shift slightly UP from TopCenter
                onClick = onDiagnosticsClick
            )
        }
    }
}

@Composable
fun TopServiceIconCard(
    modifier: Modifier = Modifier,
    imageRes: Int,
    backgroundColor: Color,
    imageAlignment: Alignment = Alignment.Center,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .aspectRatio(1.25f) // Wider rectangle makes the cards shorter! This automatically crops out the vertical margins!
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Image(
            painter = painterResource(id = imageRes),
            contentDescription = imageRes.toString(),
            contentScale = ContentScale.Crop, // Magically zooms past the baked-in white margins
            alignment = imageAlignment, // Allows shifting hospital to bottom
            modifier = Modifier.fillMaxSize(), // No padding guarantees 0 borders!
            colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(
                color = backgroundColor,
                blendMode = androidx.compose.ui.graphics.BlendMode.Multiply
            )
        )
    }
}

@Composable
fun HealthcareServicesSection(
    onHospitalsClick: () -> Unit,
    onClinicsClick: () -> Unit,
    onPharmacyClick: () -> Unit,
    onDiagnosticsClick: () -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 12.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.healthcare_services),
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = SwastikPrimary.copy(alpha = 0.1f)
            ) {
                Text(
                    text = "See All",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SwastikPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PremiumServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Hospitals",
                    subtitle = "Emergency, IPD & OPD",
                    imageRes = R.drawable.find_hospital,
                    icon = Icons.Default.LocalHospital,
                    gradient = listOf(Color(0xFF00695C), Color(0xFF00897B)),
                    onClick = onHospitalsClick
                )
                PremiumServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Clinics",
                    subtitle = "Consult specialists",
                    imageRes = R.drawable.clinic_visit,
                    icon = Icons.Default.MedicalServices,
                    gradient = listOf(Color(0xFF1565C0), Color(0xFF1E88E5)),
                    onClick = onClinicsClick
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PremiumServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Medicine",
                    subtitle = "Home delivery",
                    imageRes = R.drawable.order_medicine,
                    icon = Icons.Default.Medication,
                    gradient = listOf(Color(0xFFE65100), Color(0xFFFB8C00)),
                    onClick = onPharmacyClick
                )
                PremiumServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Lab Tests",
                    subtitle = "Book at home",
                    imageRes = R.drawable.book_test_lab,
                    icon = Icons.Default.Science,
                    gradient = listOf(Color(0xFF6A1B9A), Color(0xFF8E24AA)),
                    onClick = onDiagnosticsClick
                )
            }
        }
    }
}

@Composable
private fun PremiumServiceCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    imageRes: Int,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    gradient: List<Color>,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(170.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.25f))))
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Column {
                    Text(
                        text = title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        lineHeight = 13.sp
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun RecommendedDoctorsSection(
    doctors: List<Doctor>,
    onBookClick: (Doctor) -> Unit,
    onViewProfile: (Doctor) -> Unit,
    onViewAllClick: () -> Unit,
    onRetry: () -> Unit = {}
) {
    if (doctors.isEmpty()) return

    val pagerState = rememberPagerState(pageCount = { doctors.size })

    // Auto-scroll logic
    LaunchedEffect(Unit) {
        while (true) {
            yield()
            delay(3000) // 3 seconds delay between slides
            val nextPage = (pagerState.currentPage + 1) % doctors.size
            pagerState.animateScrollToPage(nextPage)
        }
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                stringResource(R.string.recommended_doctor), 
                fontWeight = FontWeight.Bold, 
                fontSize = 17.sp, 
                color = MaterialTheme.colorScheme.onSurface
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onViewAllClick() }
            ) {
                Text(
                    stringResource(R.string.view_all_1), 
                    fontSize = 13.sp, 
                    color = MaterialTheme.colorScheme.onSurface, 
                    fontWeight = FontWeight.Bold
                )
                Icon(
                    Icons.Filled.ChevronRight, 
                    null, 
                    tint = MaterialTheme.colorScheme.onSurfaceVariant, 
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 16.dp),
            pageSpacing = 12.dp,
            modifier = Modifier.fillMaxWidth()
        ) { page ->
            val doctor = doctors[page]
            DoctorCard(
                modifier = Modifier.fillMaxWidth(),
                doctor = doctor,
                onBookClick = { onBookClick(doctor) },
                onViewProfile = { onViewProfile(doctor) }
            )
        }
        
        // Page Indicators
        Row(
            Modifier
                .height(20.dp)
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            repeat(doctors.size) { iteration ->
                val color = if (pagerState.currentPage == iteration) SwastikPrimary else SwastikPrimary.copy(alpha = 0.2f)
                Box(
                    modifier = Modifier
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(color)
                        .size(6.dp)
                )
            }
        }
    }
}

@Composable
fun DoctorCard(
    doctor: Doctor,
    modifier: Modifier = Modifier.fillMaxWidth(),
    onBookClick: () -> Unit,
    onViewProfile: () -> Unit
) {
    Card(
        modifier = modifier
            .clickable(onClick = onViewProfile),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Image with Verified Badge
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    if (!doctor.profileImageUrl.isNullOrBlank()) {
                        coil.compose.AsyncImage(
                            model = doctor.profileImageUrl,
                            contentDescription = "Doctor Profile",
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Doctor avatar",
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .background(MaterialTheme.colorScheme.surface, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Verified, 
                        null, 
                        tint = Color(0xFF00796B), 
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Info Column
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    doctor.name, 
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp, 
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    doctor.specialization, 
                    fontSize = 12.sp, 
                    color = Color(0xFF00796B),
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${doctor.experienceYears ?: 5} Yrs Exp • ${doctor.qualification ?: doctor.qualifications?.firstOrNull() ?: "MBBS"}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            
            Spacer(modifier = Modifier.width(8.dp))

            // Rating & Price Column
            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Star, null, tint = Color(0xFFFFB300), modifier = Modifier.size(14.dp))
                    val ratingText = doctor.averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) } ?: "New"
                    Text(" $ratingText", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "₹${doctor.consultationFee ?: 500}", 
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold, 
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Book Button
            Button(
                onClick = onBookClick,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00796B)),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                modifier = Modifier.height(32.dp).defaultMinSize(minWidth = 1.dp)
            ) {
                Text(stringResource(R.string.book), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
