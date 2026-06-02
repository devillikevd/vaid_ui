package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE53935)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
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
                    "Emergency / SOS",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color.White
                )
                Text(
                    "Tap to call ambulance",
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }
            Icon(
                Icons.Filled.Call, 
                contentDescription = null, 
                tint = Color.White, 
                modifier = Modifier.size(18.dp)
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
                    "Vaididea AI Assistant",
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
                        "Hi, how are you feeling today?",
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
fun ConsultationTypeCard(
    title: String,
    imageRes: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(0.92f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            // Glassy gradient overlay at the bottom
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.6f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.White.copy(alpha = 0.7f),
                                Color.White.copy(alpha = 0.95f)
                            )
                        )
                    )
            )
            Text(
                text = title,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp),
                lineHeight = 22.sp
            )
        }
    }
}

@Composable
fun InPersonConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        title = "In-person\nConsultation",
        imageRes = R.drawable.inperson_consultation,
        onClick = onClick
    )
}

@Composable
fun VideoConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    ConsultationTypeCard(
        modifier = modifier,
        title = "Video\nConsultation",
        imageRes = R.drawable.video_consultation,
        onClick = onClick
    )
}

@Composable
fun CompactHealthIdCard(modifier: Modifier = Modifier, profile: PatientProfile? = null, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon Background
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(Color(0xFFEEF4FA), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.QrCode2,
                    contentDescription = "QR Code",
                    tint = SwastikPrimary,
                    modifier = Modifier.size(32.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Text Details
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Digital Health ID",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B)
                    )
                }
                
                Spacer(modifier = Modifier.height(2.dp))

                if (profile?.abhaNumber?.isNotEmpty() == true) {
                    val abha = profile.abhaNumber
                    val d = abha.replace(Regex("[^0-9]"), "")
                    val formattedAbha = if (d.length == 14) {
                        "${d.substring(0, 2)}-${d.substring(2, 6)}-${d.substring(6, 10)}-${d.substring(10, 14)}"
                    } else abha
                    
                    Text(
                        text = formattedAbha,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                } else {
                    Text(
                        text = "View your vitals, history & more",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
            }

            // View Vitals
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "View Vitals",
                    color = Color(0xFF00796B),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "Open",
                    tint = Color(0xFF00796B),
                    modifier = Modifier.size(16.dp)
                )
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
                    "Quick Actions",
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
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
                                MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
                                MaterialTheme.colorScheme.surface
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
                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).border(2.dp, Color.White, CircleShape).align(Alignment.CenterStart), contentAlignment = Alignment.Center) { Text("👨‍⚕️", fontSize = 18.sp) }
                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).border(2.dp, Color.White, CircleShape).align(Alignment.CenterEnd), contentAlignment = Alignment.Center) { Text("👩‍⚕️", fontSize = 18.sp) }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF4CAF50)))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Community Q&A",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = Color(0xFF1E293B)
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "Get answers from verified doctors",
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
                        .size(52.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.report_icon),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        "Reports",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.5.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "History",
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
                        .size(52.dp)
                        .background(Color(0xFFF1F5F9), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.appoinment_icon),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        "Appointments",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.5.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Upcoming",
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
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Healthcare Services", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = MaterialTheme.colorScheme.onSurface)
        }

        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFE8F4FD),
                    imageRes = R.drawable.find_hospital,
                    title = "Find Hospitals",
                    subtitle = "Discover hospitals near you & book visits",
                    onClick = onHospitalsClick,
                    imageContentScale = ContentScale.Fit
                )
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFE8F5F3),
                    imageRes = R.drawable.clinic_visit,
                    title = "Book Clinics",
                    subtitle = "Schedule appointments with doctors",
                    onClick = onClinicsClick,
                    imageContentScale = ContentScale.Fit
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFFFF3E8),
                    imageRes = R.drawable.order_medicine,
                    title = "Order Medicines",
                    subtitle = "Get medicines delivered home",
                    onClick = onPharmacyClick,
                    imageContentScale = ContentScale.Fit
                )
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFF3EEFA),
                    imageRes = R.drawable.book_test_lab,
                    title = "Book Lab Tests",
                    subtitle = "Schedule blood tests & health checkups",
                    onClick = onDiagnosticsClick,
                    imageContentScale = ContentScale.Fit
                )
            }
        }
    }
}

@Composable
fun RecommendedDoctorsSection(
    doctors: List<Doctor>,
    onBookClick: (Doctor) -> Unit,
    onViewProfile: (Doctor) -> Unit,
    onViewAllClick: () -> Unit,
    onRetry: () -> Unit = {}
) {
    if (doctors.isEmpty()) return

    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Recommended Doctor", 
                fontWeight = FontWeight.Bold, 
                fontSize = 17.sp, 
                color = MaterialTheme.colorScheme.onSurface
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onViewAllClick() }
            ) {
                Text(
                    "View all", 
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

        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            doctors.take(3).forEach { doctor ->
                DoctorCard(
                    doctor = doctor,
                    onBookClick = { onBookClick(doctor) },
                    onViewProfile = { onViewProfile(doctor) }
                )
            }
        }
    }
}

@Composable
fun DoctorCard(
    doctor: Doctor,
    onBookClick: () -> Unit,
    onViewProfile: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onViewProfile),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                // Profile Image with Verified Badge
                Box(contentAlignment = Alignment.BottomEnd) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF8FAFC)),
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
                            Text("👨‍⚕️", fontSize = 32.sp)
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .background(Color.White, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Verified, 
                            null, 
                            tint = Color(0xFF00796B), 
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                // Info Column
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            doctor.name, 
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp, 
                            color = Color(0xFF1E293B),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Star, null, tint = Color(0xFFFFB300), modifier = Modifier.size(14.dp))
                            val ratingText = doctor.averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) } ?: "New"
                            Text(" $ratingText", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                        }
                    }
                    
                    Text(
                        doctor.specialization, 
                        fontSize = 13.sp, 
                        color = Color(0xFF00796B),
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "${doctor.experienceYears ?: 5} Yrs Exp",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF475569)
                            )
                        }
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = doctor.qualification ?: doctor.qualifications?.firstOrNull() ?: "MBBS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF475569),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            androidx.compose.material3.HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Consultation Fee", fontSize = 11.sp, color = Color(0xFF64748B))
                    Text(
                        "₹${doctor.consultationFee ?: 500}", 
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold, 
                        color = Color(0xFF1E293B)
                    )
                }
                
                Button(
                    onClick = onBookClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00796B)),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                    modifier = Modifier.height(40.dp)
                ) {
                    Text("Book Visit", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
