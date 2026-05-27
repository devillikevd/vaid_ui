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
import androidx.compose.runtime.*
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
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF5F5)), // ultra light red
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.05f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Compact icon box
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color.Red, RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Add, null, tint = Color.White, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Emergency / SOS",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    color = Color.Red
                )
                Text(
                    "Tap to call ambulance",
                    fontSize = 10.sp,
                    color = Color.Gray
                )
            }
            // Small red phone icon on right
            Box(
                modifier = Modifier
                    .size(26.dp)
                    .background(Color.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.Call, 
                    null, 
                    tint = Color.Red, 
                    modifier = Modifier.size(14.dp)
                )
            }
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
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF004D40)), // Dark green
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 12.dp)
            ) {
                Icon(Icons.Filled.SmartToy, null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Vaididea AI Assistant",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp)
                    .height(38.dp)
                    .background(Color.White, RoundedCornerShape(8.dp))
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
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                    Icon(
                        Icons.Filled.Mic,
                        null,
                        tint = Color(0xFF00796B),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

private val HealthIdTeal = Color(0xFF00796B)

@Composable
fun InPersonConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .height(158.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8F7)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFD9EEEA))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = R.drawable.inperson_consultation),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alignment = Alignment.Center
            )

            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(58.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color(0xFFF1F8F7).copy(alpha = 0.92f),
                                Color(0xFFF1F8F7)
                            )
                        )
                    )
            )
            
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "In-person\nConsultation",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF1A1A2E),
                    lineHeight = 17.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Clip,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun VideoConsultationCard(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .height(158.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF6F3FF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFE3DAFF))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = R.drawable.video_consultation),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alignment = Alignment.Center
            )

            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(58.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color(0xFFF6F3FF).copy(alpha = 0.92f),
                                Color(0xFFF6F3FF)
                            )
                        )
                    )
            )
            
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Video\nConsultation",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF1A1A2E),
                    lineHeight = 17.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Clip,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun CompactHealthIdCard(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEBF9F1)), // Light mint green
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFCFEBDD))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 70.dp)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .background(Color.White, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.QrCode2, null, tint = Color(0xFF333333), modifier = Modifier.size(24.dp))
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Digital Health ID",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1A1A2E),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Filled.Verified,
                        contentDescription = "Verified",
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Verified",
                        fontSize = 9.sp,
                        color = Color(0xFF4CAF50),
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(start = 2.dp)
                    )
                }
                Text(
                    text = "View your vitals, history & more",
                    fontSize = 11.sp,
                    color = Color(0xFF5F6B6A)
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable(onClick = onClick)
            ) {
                Text(
                    "View Vitals",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF00796B)
                )
                Icon(
                    Icons.Filled.ChevronRight,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = Color(0xFF00796B)
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
    onHospitalsClick: () -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
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
                color = Color(0xFF1A1A1A)
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ServiceSquareCard(
                modifier = Modifier.weight(1f),
                title = "Book Clinic\n(OPD)",
                icon = Icons.Outlined.CalendarToday,
                bgColor = Color(0xFFF1F9F1), // Soft green
                iconColor = Color(0xFF2E7D32),
                onClick = onClinicClick
            )
            ServiceSquareCard(
                modifier = Modifier.weight(1f),
                title = "Order\nMedicine",
                icon = Icons.Outlined.ShoppingBag,
                bgColor = Color(0xFFF9FBF1), // Soft lime
                iconColor = Color(0xFF558B2F),
                onClick = onPharmacyClick
            )
            ServiceSquareCard(
                modifier = Modifier.weight(1f),
                title = "Book\nLab Test",
                icon = Icons.Outlined.Science,
                bgColor = Color(0xFFF3F0FF), // Soft purple/blue
                iconColor = Color(0xFF6A5AE0),
                onClick = onLabTestsClick
            )
            ServiceSquareCard(
                modifier = Modifier.weight(1f),
                title = "Find\nHospitals",
                icon = Icons.Outlined.Business,
                bgColor = Color(0xFFF1F9F9), // Soft teal
                iconColor = Color(0xFF00796B),
                onClick = onHospitalsClick
            )
        }
    }
}

@Composable
private fun ServiceSquareCard(
    modifier: Modifier = Modifier,
    title: String,
    icon: ImageVector,
    bgColor: Color,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .aspectRatio(0.85f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, iconColor.copy(alpha = 0.05f))
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = iconColor, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 14.sp
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEAF8F3)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFD3EFE5))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 84.dp)
                .padding(start = 8.dp, top = 10.dp, end = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.Forum,
                    contentDescription = null,
                    tint = Color(0xFF00796B),
                    modifier = Modifier.size(26.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    "Community Q&A",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color(0xFF152E2A),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "Ask questions, get answers from verified doctors",
                    fontSize = 10.sp,
                    color = Color(0xFF63736F),
                    lineHeight = 12.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = Color(0xFF00796B),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
fun SecondaryActionsGrid(
    onReportsClick: () -> Unit,
    onAppointmentsClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(66.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Reports Card
        Card(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .clickable(onClick = onReportsClick),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F4F8)),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            border = BorderStroke(1.dp, Color(0xFFE2E8EF))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.report_icon),
                        contentDescription = null,
                        modifier = Modifier.size(22.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Reports",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color(0xFF1A1A2E),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "History",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF7D8A99), modifier = Modifier.size(15.dp))
            }
        }

        // Appointments Card
        Card(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .clickable(onClick = onAppointmentsClick),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F4F8)),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            border = BorderStroke(1.dp, Color(0xFFE2E8EF))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.appoinment_icon),
                        contentDescription = null,
                        modifier = Modifier.size(22.dp),
                        contentScale = ContentScale.Fit
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Appointments",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFF1A1A2E),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Upcoming",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFF7D8A99), modifier = Modifier.size(15.dp))
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
                    imageRes = R.drawable.inperson_consultation,
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
    onViewAllClick: () -> Unit,
    onRetry: () -> Unit = {}
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Recommended Doctor", 
                fontWeight = FontWeight.ExtraBold, 
                fontSize = 17.sp, 
                color = Color(0xFF1A1A1A)
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onViewAllClick() }
            ) {
                Text(
                    "View all", 
                    fontSize = 13.sp, 
                    color = Color(0xFF00796B), 
                    fontWeight = FontWeight.Bold
                )
                Icon(
                    Icons.Filled.ChevronRight, 
                    null, 
                    tint = Color(0xFF00796B), 
                    modifier = Modifier.size(16.dp)
                )
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
                TextButton(onClick = onRetry) {
                    Text("No recommendations. Tap to retry.", color = SwastikPrimary)
                }
            }
        } else {
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
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color.LightGray.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Image with Verified Badge
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF0F4F8)),
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
                        .background(Color.White, CircleShape)
                        .padding(2.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.CheckCircle, 
                        null, 
                        tint = Color(0xFF00796B), 
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Info Column
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        doctor.name, 
                        fontWeight = FontWeight.Bold, 
                        fontSize = 15.sp, 
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Verified, null, tint = Color(0xFF2E7D32), modifier = Modifier.size(10.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("Verified", fontSize = 8.sp, color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                
                Text(
                    doctor.specialization, 
                    fontSize = 12.sp, 
                    color = Color(0xFF00796B), 
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = "${doctor.qualifications ?: "MBBS, MS"} • ${doctor.experienceYears ?: 5} Years Exp.",
                    fontSize = 11.sp,
                    color = Color.Gray
                )

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                    Icon(Icons.Filled.Star, null, tint = Color(0xFFFFC107), modifier = Modifier.size(12.dp))
                    val ratingText = doctor.averageRating?.takeIf { it > 0f }?.let { String.format(Locale.US, "%.1f", it) } ?: "New"
                    Text(" $ratingText", fontSize = 11.sp, color = Color.Gray)
                }
            }

            // Right side: Price and Action
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Consultation Fee", fontSize = 10.sp, color = Color.Gray)
                    Text(
                        "₹${doctor.consultationFee ?: 500}", 
                        fontSize = 17.sp, 
                        fontWeight = FontWeight.ExtraBold, 
                        color = Color(0xFF00796B)
                    )
                }
                
                Button(
                    onClick = onBookClick,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF004D40)),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Book Now", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
