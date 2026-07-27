package com.example.swastik.ui.screens.patient.healthcare.emergency

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.components.AddressCard
import com.example.swastik.ui.components.EmergencyBadge
import com.example.swastik.ui.components.InfoCard as SharedInfoCard
import com.example.swastik.ui.screens.patient.healthcare.finder.StatusBadge
import com.example.swastik.utils.NavigationHelper

@Composable
internal fun EmergencyModeContent(
    facilities: List<MedicalFacility>,
    isLoading: Boolean,
    selectedFacilityType: FacilityType?,
    onFacilityClick: (MedicalFacility) -> Unit,
    modifier: Modifier = Modifier
) {
    EmergencyFacilitiesList(
        facilities = facilities,
        onFacilityClick = onFacilityClick,
        selectedFacilityType = selectedFacilityType,
        modifier = modifier,
        isLoading = isLoading
    )
}

@Composable
internal fun EmergencyTopBar(onExitEmergency: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.onSurface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    stringResource(R.string.emergency_mode),
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            TextButton(
                onClick = onExitEmergency,
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onPrimary)
            ) {
                Text(stringResource(R.string.exit), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
internal fun EmergencyFacilitiesList(
    facilities: List<MedicalFacility>,
    onFacilityClick: (MedicalFacility) -> Unit,
    selectedFacilityType: FacilityType?,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A))
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE53935)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.LocalHospital,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    stringResource(R.string.need_emergency_help),
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                val facilityLabel = if (selectedFacilityType == FacilityType.CLINIC) "clinics" else "hospitals"
                Text(
                    "We're showing nearest emergency $facilityLabel",
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                val emergencyCallContext = LocalContext.current
                Button(
                    onClick = { NavigationHelper.openDialer(emergencyCallContext, "108") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Icon(
                        Icons.Default.Call,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.call_ambulance_108_1),
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }
            }
        }

        val titleLabel = if (selectedFacilityType == FacilityType.CLINIC) "Nearest Emergency Clinics" else "Nearest Emergency Hospitals"
        Text(
            titleLabel,
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onSurface)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(facilities) { facility ->
                    EmergencyHospitalCard(
                        facility = facility,
                        onClick = { onFacilityClick(facility) }
                    )
                }
            }
        }
    }
}

@Composable
internal fun EmergencyHospitalCard(
    facility: MedicalFacility,
    onClick: () -> Unit
) {
    val cardContext = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A)),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(2.dp, Color(0xFFE53935))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(Color(0xFFE53935), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.LocalHospital,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        facility.name,
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (facility.distance.isNotBlank()) facility.distance else "Distance unavailable",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (facility.distanceKm > 0) {
                            val etaMin = NavigationHelper.estimateEtaMinutes(facility.distanceKm, 50.0)
                            Text(
                                " • ~${etaMin} min",
                                fontSize = 12.sp,
                                color = Color(0xFFFFA726),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.str_247_emergency_services),
                            color = Color(0xFF4CAF50),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        if (facility.erWaitTimeMinutes != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "• ER Wait: ${facility.erWaitTimeMinutes}m",
                                color = Color(0xFFFFA726),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    if (facility.phone.isNotBlank()) {
                        Text(
                            "📞 ${facility.phone}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        if (facility.phone.isNotBlank()) {
                            NavigationHelper.openDialer(cardContext, facility.phone)
                        } else {
                            NavigationHelper.openDialer(cardContext, "108")
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        if (facility.phone.isNotBlank()) "Call" else "Call 108",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Button(
                    onClick = {
                        NavigationHelper.openDirections(
                            cardContext,
                            facility.latitude,
                            facility.longitude,
                            facility.name
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                    shape = RoundedCornerShape(10.dp),
                    enabled = facility.latitude != 0.0 && facility.longitude != 0.0
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.navigate), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
internal fun EmergencyFacilityDetailSheet(
    facility: MedicalFacility,
    isDarkMode: Boolean
) {
    val emergencyContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.Gray

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFE53935).copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.LocalHospital,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(30.dp)
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = facility.name,
                            color = textColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (facility.distance.isNotBlank()) "${facility.distance} away" else "Distance unavailable",
                            color = subtextColor,
                            fontSize = 13.sp
                        )
                    }
                    StatusBadge(facility = facility)
                }

                Spacer(modifier = Modifier.height(14.dp))

                EmergencyBadge(isDark = isDarkMode)

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {
                            if (facility.phone.isNotBlank()) {
                                NavigationHelper.openDialer(emergencyContext, facility.phone)
                            } else {
                                NavigationHelper.openDialer(emergencyContext, "108")
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                    ) {
                        Icon(Icons.Default.Call, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (facility.phone.isNotBlank()) "Call Hospital" else "Call 108", fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = {
                            NavigationHelper.openDirections(
                                emergencyContext,
                                facility.latitude,
                                facility.longitude,
                                facility.name
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                        enabled = facility.latitude != 0.0 && facility.longitude != 0.0
                    ) {
                        Icon(Icons.Default.Navigation, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.navigate), fontWeight = FontWeight.SemiBold)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                AddressCard(
                    facility = facility,
                    isDark = isDarkMode,
                    onDirectionsClick = {
                        NavigationHelper.openDirections(
                            emergencyContext,
                            facility.latitude,
                            facility.longitude,
                            facility.name
                        )
                    }
                )

                Spacer(modifier = Modifier.height(8.dp))
                SharedInfoCard(
                    icon = Icons.Filled.Phone,
                    title = "Emergency Contact",
                    value = facility.phone.ifBlank { "N/A (fallback: 108)" },
                    isDark = isDarkMode,
                    onClick = {
                        val phone = if (facility.phone.isNotBlank()) facility.phone else "108"
                        NavigationHelper.openDialer(emergencyContext, phone)
                    }
                )
            }
        }
    }
}
