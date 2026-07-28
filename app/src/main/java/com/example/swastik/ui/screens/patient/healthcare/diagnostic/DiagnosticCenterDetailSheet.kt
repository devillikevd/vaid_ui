package com.example.swastik.ui.screens.patient.healthcare.diagnostic

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.components.AddressCard
import com.example.swastik.ui.components.EmergencyBadge
import com.example.swastik.ui.components.InfoCard as SharedInfoCard
import com.example.swastik.ui.screens.patient.healthcare.finder.QuickActionButton
import com.example.swastik.ui.screens.patient.healthcare.finder.StatusBadge
import com.example.swastik.ui.components.HospitalReelsSection
import com.example.swastik.ui.components.VideoReelPlayer
import com.example.swastik.data.model.HospitalReel
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.example.swastik.utils.NavigationHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DiagnosticCenterDetailSheet(
    facility: MedicalFacility,
    onBookTest: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDarkMode: Boolean
) {
    val dcContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) Color.Gray else Color.Gray
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    var selectedReel by remember { mutableStateOf<HospitalReel?>(null) }

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                        modifier = Modifier.size(80.dp).align(Alignment.Center)
                    )
                }
            }
        }

        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Science, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(28.dp))
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = facility.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                                    )
                                    Text(stringResource(R.string.diagnostic_center), fontSize = 14.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.rating}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }

                        if (facility.specializations.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(facility.specializations) { spec ->
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF7C3AED).copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(spec, fontSize = 11.sp, color = Color(0xFF7C3AED), fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        QuickActionButton(
                            icon = Icons.Default.Call, label = "Call", color = Color(0xFF4CAF50),
                            modifier = Modifier.weight(1f),
                            onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(dcContext, facility.phone) }
                        )
                        QuickActionButton(
                            icon = Icons.Default.Directions, label = "Directions", color = Color(0xFF2196F3),
                            modifier = Modifier.weight(1f),
                            onClick = { NavigationHelper.openDirections(dcContext, facility.latitude, facility.longitude, facility.name) }
                        )
                        QuickActionButton(
                            icon = Icons.Default.Message,
                            label = "WhatsApp",
                            color = Color(0xFF25D366),
                            modifier = Modifier.weight(1f),
                            onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(dcContext, facility.phone) }
                        )
                    }
                    if (facility.isEmergencyAvailable) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            QuickActionButton(
                                icon = Icons.Default.LocalHospital, label = "Emergency", color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f),
                                onClick = { NavigationHelper.openDialer(dcContext, "108") }
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SharedInfoCard(
                        icon = Icons.Outlined.AccessTime,
                        title = "Timings",
                        value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                        modifier = Modifier.weight(1f),
                        isDark = isDarkMode
                    )
                    SharedInfoCard(
                        icon = Icons.Outlined.Phone,
                        title = "Contact",
                        value = facility.phone.ifBlank { "N/A" },
                        modifier = Modifier.weight(1f),
                        isDark = isDarkMode
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                AddressCard(facility = facility, isDark = isDarkMode, onDirectionsClick = {
                    NavigationHelper.openDirections(dcContext, facility.latitude, facility.longitude, facility.name)
                })

                if (facility.isEmergencyAvailable) {
                    Spacer(modifier = Modifier.height(12.dp))
                    EmergencyBadge(isDark = isDarkMode, modifier = Modifier.padding(horizontal = 20.dp))
                }

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).clickable { onViewDetails() },
                    colors = CardDefaults.cardColors(containerColor = cardColor),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF2196F3))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(stringResource(R.string.details_about_diagnostic), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColor)
                        }
                        Icon(Icons.Default.ArrowForwardIos, contentDescription = null, tint = subtextColor, modifier = Modifier.size(16.dp))
                    }
                }

                if (facility.reels.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    HospitalReelsSection(
                        reels = facility.reels,
                        isDark = isDarkMode,
                        sectionTitle = "Diagnostic Videos",
                        onReelClick = { reel -> selectedReel = reel }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onBookTest,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Science, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.book_a_test_1), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (selectedReel != null) {
        ModalBottomSheet(
            onDismissRequest = { selectedReel = null },
            containerColor = Color.Black,
            dragHandle = null,
            modifier = Modifier.fillMaxHeight(0.92f)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight()
                    .background(Color.Black)
            ) {
                selectedReel?.videoUrl?.let { videoUrl ->
                    VideoReelPlayer(
                        videoUrl = videoUrl,
                        modifier = Modifier.fillMaxSize(),
                        playWhenReady = true
                    )
                }
                IconButton(
                    onClick = { selectedReel = null },
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(16.dp)
                        .size(40.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
