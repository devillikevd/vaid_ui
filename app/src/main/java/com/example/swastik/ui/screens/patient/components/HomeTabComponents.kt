package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.zIndex
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.BlendMode
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
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFB91C1C)), // Matched with EmergencyAlert in EmergencyScreen
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = R.drawable.sosicon),
                contentDescription = "SOS",
                modifier = Modifier
                    .size(32.dp),
                contentScale = ContentScale.Fit
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    stringResource(R.string.emergency_sos_1),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color.White
                )
                Text(
                    stringResource(R.string.tap_to_call_ambulance),
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.85f)
                )
            }
            Icon(
                Icons.Filled.Call, 
                contentDescription = null, 
                tint = Color.White, 
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
fun SwastikAIBanner(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AssistantDarkGreen),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 12.dp)
            ) {
                Icon(Icons.Filled.SmartToy, null, tint = Color.White, modifier = Modifier.size(17.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    stringResource(R.string.vaididea_ai_assistant),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = Color.White
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp)
                    .height(36.dp)
                    .background(HomeSoftSurface, RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        stringResource(R.string.hi_how_are_you_feeling),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )
                    Icon(
                        Icons.Filled.Mic,
                        null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(11.dp)
                    )
                }
            }
        }
    }
}

private val HealthIdTeal = Color(0xFF00796B)

@Composable
private fun ConsultationTypeCard(
    title: String,
    subtitle: String,
    imageRes: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    backgroundColor: Color
) {
    Card(
        modifier = modifier
            .height(190.dp) // Increased size
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Image Layer
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth(0.7f)
                    .fillMaxHeight(0.6f)
                    .align(Alignment.BottomEnd)
                    .padding(end = 4.dp, bottom = 4.dp),
                contentScale = ContentScale.Fit,
                alignment = Alignment.BottomEnd
            )

            // Text Layer
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalArrangement = Arrangement.Top
            ) {
                Text(
                    text = title,
                    fontSize = 14.sp, // Reduced to prevent cut-off and wrap issues
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF1E293B),
                    lineHeight = 16.sp,
                    minLines = 2,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 14.sp,
                    minLines = 2,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun InPersonConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        title = stringResource(R.string.in_person_consultation_multiline),
        subtitle = stringResource(R.string.visit_doctor_at_clinic),
        imageRes = R.drawable.inpersoncons,
        backgroundColor = Color(0xFFF1F8F7), // Light teal
        onClick = onClick
    )
}

@Composable
fun VideoConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        title = stringResource(R.string.video_consultation_multiline),
        subtitle = stringResource(R.string.consult_doctor_from_home),
        imageRes = R.drawable.videocons,
        backgroundColor = Color(0xFFF6F3FF), // Light purple
        onClick = onClick
    )
}

@Composable
fun CompactHealthIdCard(modifier: Modifier = Modifier, profile: PatientProfile? = null, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEBF9F1)), // Mint green
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
                Icon(Icons.Filled.QrCode2, null, tint = Color.Black, modifier = Modifier.size(24.dp))
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.digital_health_id),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = stringResource(R.string.view_your_vitals_history_more),
                    fontSize = 11.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.view_vitals),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF00796B)
                )
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF00796B), modifier = Modifier.size(14.dp))
            }
        }
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
fun HealthcareServicesSection(
    onHospitalsClick: () -> Unit,
    onClinicsClick: () -> Unit,
    onPharmacyClick: () -> Unit,
    onDiagnosticsClick: () -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 12.dp)) {
        Text(
            text = stringResource(R.string.healthcare_services),
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)
        )

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
                ServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Find Hospitals",
                    subtitle = "Emergency care, IPD, OPD & specialists",
                    imageRes = R.drawable.find_hospital,
                    icon = Icons.Default.LocalHospital,
                    backgroundColor = Color(0xFFE3F2FD), // Light blue
                    iconColor = Color(0xFF1976D2),
                    onClick = onHospitalsClick
                )
                ServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Book Clinics",
                    subtitle = "Doctor appointments & consultations",
                    imageRes = R.drawable.clinic_visit,
                    icon = Icons.Default.MedicalServices,
                    backgroundColor = Color(0xFFE8F5E9), // Light green
                    iconColor = Color(0xFF388E3C),
                    onClick = onClinicsClick
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Order Medicines",
                    subtitle = "Order medicines & home delivery",
                    imageRes = R.drawable.order_medicine,
                    icon = Icons.Default.Medication,
                    backgroundColor = Color(0xFFFFF3E0), // Light orange
                    iconColor = Color(0xFFF57C00),
                    onClick = onPharmacyClick
                )
                ServiceCard(
                    modifier = Modifier.weight(1f),
                    title = "Book Lab Tests",
                    subtitle = "Book lab tests & home sample collection",
                    imageRes = R.drawable.book_test_lab,
                    icon = Icons.Default.Science,
                    backgroundColor = Color(0xFFF3E5F5), // Light purple
                    iconColor = Color(0xFF7B1FA2),
                    onClick = onDiagnosticsClick
                )
            }
        }
    }
}

@Composable
private fun ServiceCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    imageRes: Int,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    backgroundColor: Color,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(180.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0).copy(alpha = 0.5f))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Image Content - Anchored to bottom right, limited width
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth(0.55f) // Take up 55% width
                    .fillMaxHeight(0.75f) // Take up 75% height
                    .align(Alignment.BottomEnd)
                    .padding(end = 4.dp, bottom = 4.dp),
                contentScale = ContentScale.Fit,
                alignment = Alignment.BottomEnd,
                colorFilter = ColorFilter.tint(backgroundColor, BlendMode.Multiply)
            )

            // Text Content - Limited to left 65% to ensure NO overlap
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.Top
            ) {
                Column(modifier = Modifier.fillMaxWidth(0.65f)) {
                    // Small Icon Box
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(Color.White, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = iconColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Text(
                        text = title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B),
                        lineHeight = 16.sp
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Text(
                        text = subtitle,
                        fontSize = 10.sp,
                        color = Color(0xFF64748B),
                        lineHeight = 12.sp
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
                        Text(stringResource(R.string.string_2), fontSize = 28.sp)
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
