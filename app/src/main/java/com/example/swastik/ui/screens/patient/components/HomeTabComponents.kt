package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
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
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import com.example.swastik.ui.theme.*
import java.util.Locale

@Composable
fun EmergencySOSBanner(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            modifier = Modifier
                .background(androidx.compose.ui.graphics.Brush.horizontalGradient(
                    colors = listOf(Color(0xFFFFF0F0), Color(0xFFFFE6E6))
                ))
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(Color(0xFFFFD6D6), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.LocalHospital, null, tint = SwastikRed, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Emergency / SOS",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = SwastikRed
                )
                Text(
                    "Tap to call ambulance or alert contacts",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(Icons.Filled.ChevronRight, null, tint = SwastikRed)
        }
    }
}

@Composable
fun SwastikAIBanner(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Image(
                painter = painterResource(id = R.drawable.ai_icon),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .size(120.dp)
                    .alpha(0.12f),
                contentScale = ContentScale.Fit
            )
            Column(
                modifier = Modifier
                    .background(androidx.compose.ui.graphics.Brush.linearGradient(
                        colors = listOf(Color(0xFF00796B), Color(0xFF004D40))
                    ))
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.SmartToy, null, tint = Color.White, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Vaididea AI Assistant", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                    Text("Check symptoms, book doctors, ask anything.", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Hi, how are you feeling today?", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Icon(Icons.Filled.Mic, null, tint = Color(0xFF00796B), modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}
}

private val InPersonCardBg = Color(0xFFE8F5F3)
private val InPersonAccent = Color(0xFF1B5E4B)
private val VideoCardBg = Color(0xFFF3F0FF)
private val VideoAccent = Color(0xFF6A5AE0)
private val HealthIdTeal = Color(0xFF00796B)
private val ConsultationCardHeight = 132.dp

@Composable
private fun ConsultationPromoCard(
    backgroundColor: Color,
    imageRes: Int,
    badge: @Composable () -> Unit,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    status: (@Composable () -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(ConsultationCardHeight)
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alignment = Alignment.CenterEnd
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            colorStops = arrayOf(
                                0f to backgroundColor,
                                0.48f to backgroundColor,
                                0.72f to backgroundColor.copy(alpha = 0.55f),
                                1f to Color.Transparent
                            )
                        )
                    )
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth(0.58f)
                    .align(Alignment.TopStart)
                    .padding(start = 12.dp, top = 10.dp, end = 8.dp)
            ) {
                badge()
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1A1A1A),
                    lineHeight = 20.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = Color(0xFF5F6B6A),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            status?.let { statusContent ->
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 12.dp, bottom = 10.dp)
                ) {
                    statusContent()
                }
            }
        }
    }
}

@Composable
fun InPersonConsultationCard(onClick: () -> Unit) {
    ConsultationPromoCard(
        backgroundColor = InPersonCardBg,
        imageRes = R.drawable.clinicvisit,
        badge = {
            Surface(
                color = Color.White.copy(alpha = 0.9f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = InPersonAccent,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = "Nearby",
                        fontSize = 10.sp,
                        color = InPersonAccent,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        title = "In-person Consultation",
        subtitle = "Find trusted doctors near you",
        onClick = onClick
    )
}

@Composable
fun VideoConsultationCard(onClick: () -> Unit) {
    ConsultationPromoCard(
        backgroundColor = VideoCardBg,
        imageRes = R.drawable.video_consult,
        badge = {
            Surface(
                color = Color.White.copy(alpha = 0.9f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.Videocam,
                        contentDescription = null,
                        tint = VideoAccent,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        "Live Now",
                        fontSize = 10.sp,
                        color = VideoAccent,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        title = "Video Consultation",
        subtitle = "Connect instantly with a doctor",
        onClick = onClick,
        status = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.AccessTime,
                    contentDescription = null,
                    tint = VideoAccent,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = VideoAccent, fontWeight = FontWeight.Medium)) {
                            append("Connect in ")
                        }
                        withStyle(SpanStyle(color = VideoAccent, fontWeight = FontWeight.Bold)) {
                            append("15 mins")
                        }
                    },
                    fontSize = 10.sp
                )
            }
        }
    )
}

@Composable
fun CompactHealthIdCard(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = com.example.swastik.ui.theme.HealthIdCardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, com.example.swastik.ui.theme.HealthIdCardBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.QrCode2,
                    contentDescription = null,
                    tint = Color(0xFF1A1A1A),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Digital Health ID",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1A1A1A),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Verified,
                                contentDescription = null,
                                tint = Color(0xFF2E7D32),
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                "Verified",
                                fontSize = 10.sp,
                                color = Color(0xFF2E7D32),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "View your vitals, history & more",
                    fontSize = 11.sp,
                    color = Color(0xFF5F6B6A)
                )
            }

            TextButton(
                onClick = onClick,
                contentPadding = PaddingValues(horizontal = 2.dp, vertical = 0.dp)
            ) {
                Text(
                    "View Vitals",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = HealthIdTeal
                )
                Icon(
                    Icons.Filled.ChevronRight,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = HealthIdTeal
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
fun SecondaryActionsGrid(
    onReportsClick: () -> Unit,
    onAppointmentsClick: () -> Unit,
    onCommunityQAClick: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Reports Card
            Card(
                modifier = Modifier.weight(1f).fillMaxHeight().clickable(onClick = onReportsClick),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF0F4F8)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Description, null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            "Reports", 
                            fontWeight = FontWeight.Bold, 
                            fontSize = 14.sp, 
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            "History", 
                            fontSize = 11.sp, 
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Appointments Card
            Card(
                modifier = Modifier.weight(1f).fillMaxHeight().clickable(onClick = onAppointmentsClick),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF0F4F8)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Schedule, null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            "Appointments", 
                            fontWeight = FontWeight.Bold, 
                            fontSize = 14.sp, 
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            "Upcoming", 
                            fontSize = 11.sp, 
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        // Community QA Action
        Card(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onCommunityQAClick),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE8F5E9)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Outlined.Forum, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Community Q&A", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("Ask doctors & view discussions", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Filled.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun SpecialitySection(onSpecialityClick: (String) -> Unit) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Book Doctor by Speciality", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
        }

        val specialities = listOf(
            Triple("General Physician", Icons.Filled.MedicalServices, Color(0xFFE8EAF6)),
            Triple("Women's Health", Icons.Filled.PregnantWoman, Color(0xFFFCE4EC)),
            Triple("Skin Specialist", Icons.Filled.Face, Color(0xFFFBE9E7)),
            Triple("Dentist", Icons.Filled.Mood, Color(0xFFE0F7FA)),
            Triple("Eye Specialist", Icons.Filled.Visibility, Color(0xFFE8EAF6)),
            Triple("Ear, Nose & Throat", Icons.Filled.Hearing, Color(0xFFF3E5F5))
        )

        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            items(specialities) { spec ->
                val imageRes = when (spec.first) {
                    "General Physician" -> R.drawable.generalphysician
                    "Women's Health" -> R.drawable.womenhealth
                    "Skin Specialist" -> R.drawable.skinnspecialist
                    "Child Care" -> R.drawable.childspecialist
                    "Dentist" -> R.drawable.dentists
                    "Eye Specialist" -> R.drawable.eyespecialist
                    "Ear, Nose & Throat" -> R.drawable.eatspecialist
                    "Mental Wellness" -> R.drawable.mentalwelnness
                    else -> null
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(70.dp).clickable { onSpecialityClick(spec.first) }) {
                    Box(modifier = Modifier.size(60.dp).background(spec.third, CircleShape), contentAlignment = Alignment.Center) {
                        if (imageRes != null) {
                            Image(
                                painter = painterResource(id = imageRes),
                                contentDescription = null,
                                modifier = Modifier.size(40.dp).clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(spec.second, null, tint = SwastikPrimary)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(spec.first, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center, maxLines = 2)
                }
            }
        }
    }
}

private val HealthcareServiceCardHeight = 128.dp

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
                    .fillMaxWidth(if (imageWidthFraction < 1f) 0.55f else 0.62f)
                    .align(Alignment.TopStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF1A1A1A),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 17.sp
                )
                if (!subtitle.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = subtitle,
                        fontSize = 11.sp,
                        color = Color(0xFF5F6B6A),
                        maxLines = 2,
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
            Text("Healthcare Services", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
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
                    imageRes = R.drawable.findhospital,
                    title = "Find Hospitals",
                    subtitle = "Discover hospitals near you & book visits",
                    onClick = onHospitalsClick
                )
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFE8F5F3),
                    imageRes = R.drawable.clinicvisit,
                    title = "Book Clinic",
                    subtitle = "Book OPD slots with clinic doctors",
                    onClick = onClinicsClick
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
                    title = "Order Medicine",
                    subtitle = "Upload prescription & get meds delivered",
                    onClick = onPharmacyClick,
                    imageWidthFraction = 0.56f,
                    imageContentScale = ContentScale.Fit
                )
                HealthcareServiceCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = Color(0xFFF3EEFA),
                    imageRes = R.drawable.book_test_lab,
                    title = "Book Lab Tests",
                    subtitle = "Schedule blood tests & health checkups",
                    onClick = onDiagnosticsClick
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
    onRetry: () -> Unit = {}
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Recommended for You", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
            if (doctors.isEmpty()) {
                TextButton(onClick = onRetry) {
                    Text("Retry", color = SwastikPrimary)
                }
            }
        }

        if (doctors.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .padding(horizontal = 16.dp)
                    .background(Color.Gray.copy(alpha = 0.05f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("No recommendations found. Tap retry.", color = Color.Gray, fontSize = 14.sp)
            }
        } else {
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                items(doctors) { doctor ->
                    DoctorCard(
                        doctor = doctor,
                        onBookClick = { onBookClick(doctor) },
                        onViewProfile = { onViewProfile(doctor) }
                    )
                }
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
            .width(220.dp)
            .clickable(onClick = onViewProfile),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Box {
                    Box(modifier = Modifier.size(50.dp).background(SwastikPrimaryLight, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                        if (!doctor.profileImageUrl.isNullOrBlank()) {
                            coil.compose.AsyncImage(
                                model = doctor.profileImageUrl,
                                contentDescription = "Doctor Profile",
                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text("👨‍⚕️", fontSize = 24.sp)
                        }
                    }
                    Icon(Icons.Filled.Verified, null, tint = SwastikPrimary, modifier = Modifier.align(Alignment.BottomEnd).offset(4.dp, 4.dp).size(16.dp).background(MaterialTheme.colorScheme.surface, CircleShape))
                }
                Surface(color = Color(0xFFE8F5E9), shape = RoundedCornerShape(12.dp)) {
                    Text("Today", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = SwastikGreen, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(doctor.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(doctor.specialization, fontSize = 13.sp, color = SwastikPrimary, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Star, null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                val ratingText = doctor.averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) } ?: "New"
                val experienceText = doctor.experienceYears?.takeIf { it > 0 }?.let { "$it Yrs" } ?: "Exp not listed"
                Text(" $ratingText • $experienceText", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onViewProfile,
                    modifier = Modifier.weight(1f).height(36.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = SwastikPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SwastikPrimary),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text("Profile", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
                Button(
                    onClick = onBookClick,
                    modifier = Modifier.weight(1f).height(36.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary, contentColor = Color.White),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text("Book", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}
