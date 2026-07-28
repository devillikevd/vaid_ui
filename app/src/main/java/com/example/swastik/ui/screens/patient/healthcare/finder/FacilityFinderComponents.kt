package com.example.swastik.ui.screens.patient.healthcare.finder

import androidx.compose.foundation.*
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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.BorderStroke
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.components.MapMarkerData
import com.example.swastik.ui.screens.patient.components.shimmerEffect
import org.osmdroid.util.GeoPoint

internal const val DEFAULT_DISCOVERY_RADIUS_KM = 10f
internal const val MAX_DISCOVERY_RADIUS_KM = 25f

// ==================== MAP VIEW ====================
@Composable
internal fun EnhancedMapView(
    facilities: List<MedicalFacility>,
    userLat: Double = 0.0,
    userLng: Double = 0.0,
    focusedFacilityId: String? = null,
    onFacilityClick: (MedicalFacility) -> Unit
) {
    val positionedFacilities = facilities.filter(::hasValidMapCoordinates)
    val focusedFacility = focusedFacilityId?.let { targetId ->
        positionedFacilities.firstOrNull { it.id == targetId }
    }
    val centerLat = focusedFacility?.latitude ?: if (userLat != 0.0) userLat
        else positionedFacilities
            .map { it.latitude }.average().takeIf { !it.isNaN() } ?: 20.5937
    val centerLng = focusedFacility?.longitude ?: if (userLng != 0.0) userLng
        else positionedFacilities
            .map { it.longitude }.average().takeIf { !it.isNaN() } ?: 78.9629

    val mapMarkers = positionedFacilities.map { facility ->
        val iconRes = when (facility.type) {
            FacilityType.HOSPITAL -> R.drawable.ic_map_hospital
            FacilityType.CLINIC -> R.drawable.ic_map_clinic
            FacilityType.MEDICAL_STORE -> R.drawable.ic_map_pharmacy
            FacilityType.DIAGNOSTIC_CENTER -> R.drawable.ic_map_diagnostic
            FacilityType.NURSING_HOME -> R.drawable.ic_map_hospital
        }
        val color = when (facility.type) {
            FacilityType.HOSPITAL -> android.graphics.Color.parseColor("#D32F2F")
            FacilityType.CLINIC -> android.graphics.Color.parseColor("#4CAF50")
            FacilityType.MEDICAL_STORE -> android.graphics.Color.parseColor("#2196F3")
            FacilityType.DIAGNOSTIC_CENTER -> android.graphics.Color.parseColor("#7C3AED")
            FacilityType.NURSING_HOME -> android.graphics.Color.parseColor("#FF9800")
        }
        MapMarkerData(
            id = facility.id,
            latitude = facility.latitude,
            longitude = facility.longitude,
            title = facility.name,
            snippet = "${facility.type.name} • ${if (facility.isOpen) "Open" else "Closed"}",
            markerColor = color,
            iconRes = iconRes,
            onClick = { onFacilityClick(facility) }
        )
    }

    OsmMapView(
        modifier = Modifier.fillMaxSize(),
        center = GeoPoint(centerLat, centerLng),
        zoom = when {
            focusedFacility != null -> 15.5
            positionedFacilities.isNotEmpty() -> 13.0
            userLat != 0.0 && userLng != 0.0 -> 14.0
            else -> 5.0
        },
        markers = mapMarkers,
        showUserLocation = userLat != 0.0 && userLng != 0.0,
        userLatitude = userLat,
        userLongitude = userLng
    )
}

// ==================== FILTER BOTTOM SHEET ====================
@Composable
internal fun FilterBottomSheet(
    distanceFilter: Float,
    onDistanceChange: (Float) -> Unit,
    openNowOnly: Boolean,
    onOpenNowChange: (Boolean) -> Unit,
    minimumRating: Float,
    onRatingChange: (Float) -> Unit,
    hospitalTypeFilter: String?,
    onHospitalTypeChange: (String?) -> Unit,
    emergencyServicesOnly: Boolean,
    onEmergencyServicesChange: (Boolean) -> Unit,
    bedsAvailableOnly: Boolean,
    onBedsAvailableChange: (Boolean) -> Unit,
    showHospitalTypeFilter: Boolean,
    onApplyFilters: () -> Unit,
    isDarkMode: Boolean
) {
    val colorScheme = MaterialTheme.colorScheme
    val textColor = colorScheme.onSurface
    val cardColor = if (isDarkMode) colorScheme.surfaceVariant else Color(0xFFE2F0FC)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                stringResource(R.string.filters),
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            TextButton(onClick = {
                onDistanceChange(DEFAULT_DISCOVERY_RADIUS_KM)
                onOpenNowChange(false)
                onRatingChange(0f)
                onHospitalTypeChange(null)
                onEmergencyServicesChange(false)
                onBedsAvailableChange(false)
            }) {
                Text(stringResource(R.string.reset), color = SwastikPrimary)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        FilterSectionCard(
            icon = Icons.Outlined.Place,
            title = "Distance",
            cardColor = cardColor
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(stringResource(R.string.n_1_km), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${distanceFilter.toInt()} km",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = SwastikPrimary
                    )
                    Text("${MAX_DISCOVERY_RADIUS_KM.toInt()} km", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Slider(
                    value = distanceFilter,
                    onValueChange = onDistanceChange,
                    valueRange = 1f..MAX_DISCOVERY_RADIUS_KM,
                    steps = 23,
                    colors = SliderDefaults.colors(
                        thumbColor = SwastikPrimary,
                        activeTrackColor = SwastikPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        FilterSectionCard(
            icon = Icons.Outlined.AccessTime,
            title = "Open Now",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.show_only_open_facilities),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                )
                Switch(
                    checked = openNowOnly,
                    onCheckedChange = onOpenNowChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = SwastikPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        FilterSectionCard(
            icon = Icons.Default.Star,
            title = "Minimum Rating",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(0f, 3f, 3.5f, 4f, 4.5f).forEach { rating ->
                    FilterChip(
                        selected = minimumRating == rating,
                        onClick = { onRatingChange(rating) },
                        label = {
                            Text(
                                if (rating == 0f) "All" else "${rating}+",
                                fontSize = 12.sp
                            )
                        },
                        leadingIcon = if (rating > 0f) {
                            {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = if (minimumRating == rating) Color.White else Color(0xFFFFC107)
                                )
                            }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SwastikPrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (showHospitalTypeFilter) {
            Spacer(modifier = Modifier.height(12.dp))

            FilterSectionCard(
                icon = Icons.Outlined.LocalHospital,
                title = "Hospital Type",
                cardColor = cardColor
            ) {
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FacilityType.HOSPITAL_SUB_TYPES.forEach { (type, label) ->
                            FilterChip(
                                selected = hospitalTypeFilter == type,
                                onClick = { onHospitalTypeChange(type) },
                                label = { Text(label, fontSize = 13.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SwastikPrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        FilterSectionCard(
            icon = Icons.Default.MedicalServices,
            title = "Emergency Services",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.only_with_emergency_services),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                )
                Switch(
                    checked = emergencyServicesOnly,
                    onCheckedChange = onEmergencyServicesChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFFE53935)
                    )
                )
            }
        }

        if (showHospitalTypeFilter) {
            Spacer(modifier = Modifier.height(12.dp))

            FilterSectionCard(
                icon = Icons.Default.Bed,
                title = "Beds Available",
                cardColor = cardColor
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(R.string.only_hospitals_with_available_beds),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                    )
                    Switch(
                        checked = bedsAvailableOnly,
                        onCheckedChange = onBedsAvailableChange,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = SwastikPrimary
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onApplyFilters,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Icon(Icons.Default.FilterList, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.apply_filters), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
internal fun FilterSectionCard(
    icon: ImageVector,
    title: String,
    cardColor: Color,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SwastikPrimary
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

// ==================== SEARCH BAR ====================
@Composable
internal fun SearchBarSection(
    selectedFacilityType: FacilityType?,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onFilterClick: () -> Unit,
    isDarkMode: Boolean
) {
    val containerColor = MaterialTheme.colorScheme.primaryContainer
    val placeholderText = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "Search hospitals..."
        FacilityType.CLINIC -> "Search clinics..."
        FacilityType.MEDICAL_STORE -> "Search medical stores..."
        FacilityType.DIAGNOSTIC_CENTER -> "Search diagnostic centers..."
        FacilityType.NURSING_HOME -> "Search nursing homes..."
        null -> "Search hospitals, clinics, stores..."
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
            placeholder = {
                Text(
                    placeholderText,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            leadingIcon = {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                } else {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = "Voice Search",
                        tint = SwastikPrimary
                    )
                }
            },
            modifier = Modifier
                .weight(1f)
                .shadow(4.dp, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Transparent,
                focusedBorderColor = SwastikPrimary,
                unfocusedContainerColor = containerColor,
                focusedContainerColor = containerColor
            ),
            singleLine = true
        )

        Spacer(modifier = Modifier.width(8.dp))

        IconButton(
            onClick = onFilterClick,
            modifier = Modifier
                .size(50.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .background(containerColor, RoundedCornerShape(12.dp))
        ) {
            Icon(
                Icons.Default.Tune,
                contentDescription = "Filter",
                tint = SwastikPrimary
            )
        }
    }
}

// ==================== FEATURE BADGE ====================
@Composable
internal fun FeatureBadge(
    icon: ImageVector,
    text: String,
    color: Color
) {
    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text,
            fontSize = 12.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== MAP EMPTY STATE ====================
@Composable
internal fun MapEmptyStateCard(
    activeRadiusKm: Int,
    modifier: Modifier = Modifier,
    selectedFacilityType: FacilityType? = null,
    facilitiesMissingMapCoordinates: Int = 0,
    onResetFilters: () -> Unit,
    onRefreshNearby: () -> Unit
) {
    val emptyLabel = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "hospitals"
        FacilityType.CLINIC -> "clinics"
        FacilityType.MEDICAL_STORE -> "medical stores"
        FacilityType.DIAGNOSTIC_CENTER -> "diagnostic centers"
        FacilityType.NURSING_HOME -> "nursing homes"
        null -> "facilities"
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "No $emptyLabel found within $activeRadiusKm km",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                if (facilitiesMissingMapCoordinates > 0) {
                    "We found $facilitiesMissingMapCoordinates matching $emptyLabel, but they don't have usable map coordinates yet. Refresh nearby results or switch to list view to keep browsing."
                } else {
                    "The map is centered on your current location. Refresh location or reset filters to try again."
                },
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onRefreshNearby,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.refresh))
                }
                OutlinedButton(
                    onClick = onResetFilters,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.reset), color = SwastikPrimary)
                }
            }
        }
    }
}

// ==================== UTILITY ====================
internal fun hasValidMapCoordinates(facility: MedicalFacility): Boolean {
    if (facility.latitude == 0.0 && facility.longitude == 0.0) return false
    if (facility.latitude !in -90.0..90.0) return false
    if (facility.longitude !in -180.0..180.0) return false
    return true
}

// ==================== FACILITY MAP CARD ====================
@Composable
internal fun FacilityMapCard(
    facility: MedicalFacility,
    onClick: () -> Unit,
    isDarkMode: Boolean
) {
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    val textColor = MaterialTheme.colorScheme.onPrimaryContainer
    val mapCardContext = LocalContext.current

    Card(
        modifier = Modifier
            .width(300.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(facility.type.getMarkerColor().copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor(),
                        modifier = Modifier.size(26.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = facility.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = textColor,
                            modifier = Modifier.weight(1f)
                        )
                        if (facility.isEmergencyAvailable) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFFE53935), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    stringResource(R.string.str_247),
                                    fontSize = 9.sp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                    Text(
                        text = facility.type.getDisplayName(),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = " ${facility.rating} • ${facility.distance}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusBadge(facility = facility, small = true)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            if (facility.phone.isNotBlank()) {
                                NavigationHelper.openDialer(mapCardContext, facility.phone)
                            } else {
                                NavigationHelper.openDialer(mapCardContext, "108")
                            }
                        },
                    color = if (facility.phone.isNotBlank()) Color(0xFF4CAF50).copy(alpha = 0.1f) else Color(0xFFFFA726).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Call",
                            tint = if (facility.phone.isNotBlank()) Color(0xFF4CAF50) else Color(0xFFF57C00),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (facility.phone.isNotBlank()) "Call" else "Call 108",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (facility.phone.isNotBlank()) Color(0xFF4CAF50) else Color(0xFFF57C00)
                        )
                    }
                }

                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            NavigationHelper.openDirections(
                                mapCardContext,
                                facility.latitude,
                                facility.longitude,
                                facility.name
                            )
                        },
                    color = Color(0xFF2196F3).copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Navigate",
                            tint = Color(0xFF2196F3),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.navigate),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF2196F3)
                        )
                    }
                }

                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onClick() },
                    color = SwastikPrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = "Details",
                            tint = SwastikPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.details),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = SwastikPrimary
                        )
                    }
                }
            }
        }
    }
}

// ==================== SHIMMER FACILITY CARD ====================
@Composable
internal fun ShimmerFacilityCard(isDarkMode: Boolean) {
    val colorScheme = MaterialTheme.colorScheme
    val cardBg = if (isDarkMode) colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    val shimmerBase = if (isDarkMode) Color(0xFF334155) else Color(0xFFE2E8F0)
    val shimmerHighlight = if (isDarkMode) Color(0xFF475569) else Color(0xFFF1F5F9)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(140.dp)
                    .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
            )
            Column(modifier = Modifier.weight(1f).padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.7f)
                                .height(16.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.4f)
                                .height(12.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .width(80.dp)
                            .height(24.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                    )
                    Box(
                        modifier = Modifier
                            .width(60.dp)
                            .height(24.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .shimmerEffect(baseColor = shimmerBase, highlightColor = shimmerHighlight)
                    )
                }
            }
        }
    }
}

// ==================== FACILITY LIST CARD ====================
@Composable
internal fun FacilityListCard(
    facility: MedicalFacility,
    onClick: () -> Unit,
    isDarkMode: Boolean
) {
    val colorScheme = MaterialTheme.colorScheme
    val accentColor = facility.type.getMarkerColor()
    val cardBg = if (isDarkMode) colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    val titleColor = if (isDarkMode) Color(0xFFF1F5F9) else Color(0xFF0F172A)
    val subtitleColor = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)
    val facilityCardContext = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(accentColor, RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp))
            )

            Column(modifier = Modifier.weight(1f).padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(accentColor.copy(alpha = 0.08f)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!facility.imageUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(facilityCardContext)
                                    .data(facility.imageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = facility.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp))
                            )
                        } else {
                            Icon(
                                imageVector = facility.type.getMarkerIcon(),
                                contentDescription = null,
                                tint = accentColor,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = facility.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                color = titleColor
                            )
                            if (facility.type != FacilityType.DIAGNOSTIC_CENTER && facility.type != FacilityType.MEDICAL_STORE) {
                                StatusBadge(facility = facility)
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = facility.type.getDisplayName(),
                                fontSize = 12.sp,
                                color = subtitleColor
                            )
                            if (facility.hospitalSubType != null) {
                                Text(" • ", fontSize = 12.sp, color = subtitleColor)
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = accentColor.copy(alpha = 0.1f)
                                ) {
                                    Text(
                                        text = facility.hospitalSubType,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = accentColor,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                            Text(" ${facility.rating}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = titleColor)
                            Text(" (${facility.reviewCount})", fontSize = 11.sp, color = subtitleColor)
                            Spacer(modifier = Modifier.width(12.dp))
                            Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = accentColor, modifier = Modifier.size(14.dp))
                            Text(" ${facility.distance}", fontSize = 12.sp, color = subtitleColor)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Outlined.Place, contentDescription = null, tint = subtitleColor, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = facility.address,
                        fontSize = 12.sp,
                        color = subtitleColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                val badges = mutableListOf<Triple<String, Color, Color>>()
                if (facility.isEmergencyAvailable) {
                    badges.add(Triple("🔴 Emergency", Color(0xFFFEE2E2), Color(0xFFDC2626)))
                    if (facility.erWaitTimeMinutes != null) {
                        badges.add(Triple("🕒 ER Wait: ${facility.erWaitTimeMinutes}m", Color(0xFFFEF3C7), Color(0xFFD97706)))
                    }
                }
                if (facility.bedsAvailable != null && facility.bedsAvailable > 0) {
                    badges.add(Triple("🛏 ${facility.bedsAvailable} Beds", Color(0xFFDBEAFE), Color(0xFF2563EB)))
                }
                if (facility.is24Hours) {
                    badges.add(Triple("24/7", Color(0xFFD1FAE5), Color(0xFF059669)))
                }
                if (badges.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        badges.forEach { (text, bg, fg) ->
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (isDarkMode) fg.copy(alpha = 0.15f) else bg
                            ) {
                                Text(
                                    text = text,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = fg,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }
                }

                if (facility.specializations.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(facility.specializations.take(4)) { spec ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = accentColor.copy(alpha = 0.08f)
                            ) {
                                Text(
                                    text = spec,
                                    fontSize = 10.sp,
                                    color = accentColor,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable {
                                if (facility.phone.isNotBlank()) {
                                    NavigationHelper.openDialer(facilityCardContext, facility.phone)
                                }
                            },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isDarkMode) Color(0xFF1E3A5F) else Color(0xFFEFF6FF),
                        border = BorderStroke(1.dp, if (isDarkMode) Color(0xFF334155) else Color(0xFFBFDBFE))
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(stringResource(R.string.call), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF2563EB))
                        }
                    }
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable {
                                NavigationHelper.openDirections(facilityCardContext, facility.latitude, facility.longitude, facility.name)
                            },
                        shape = RoundedCornerShape(8.dp),
                        color = accentColor
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Directions, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(stringResource(R.string.directions), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

// ==================== STATUS BADGE ====================
@Composable
internal fun StatusBadge(facility: MedicalFacility, small: Boolean = false) {
    var statusText = if (facility.isOpen) "Open" else "Closed"
    var statusColor = if (facility.isOpen) Color(0xFF4CAF50) else Color(0xFFE53935)
    var bgColor = if (facility.isOpen) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)

    if (facility.isOpen && !facility.closeTime.isNullOrBlank()) {
        try {
            val closeParts = facility.closeTime.split(":")
            if (closeParts.size >= 2) {
                val closeHour = closeParts[0].toInt()
                val closeMinute = closeParts[1].toInt()

                val calendar = java.util.Calendar.getInstance()
                val currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
                val currentMinute = calendar.get(java.util.Calendar.MINUTE)

                val currentMinutesTotal = currentHour * 60 + currentMinute
                var closeMinutesTotal = closeHour * 60 + closeMinute

                if (closeMinutesTotal < currentMinutesTotal && closeHour < 12) {
                    closeMinutesTotal += 24 * 60
                }

                val diff = closeMinutesTotal - currentMinutesTotal
                if (diff in 0..60) {
                    statusText = "Closing Soon"
                    statusColor = Color(0xFFFF9800)
                    bgColor = Color(0xFFFFF3E0)
                }
            }
        } catch (_: Exception) {
        }
    }

    Box(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(if (small) 4.dp else 6.dp))
            .padding(
                horizontal = if (small) 6.dp else 8.dp,
                vertical = if (small) 2.dp else 4.dp
            )
    ) {
        Text(
            text = statusText,
            fontSize = if (small) 10.sp else 11.sp,
            color = statusColor,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== QUICK ACTION BUTTON ====================
@Composable
internal fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(color.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            fontSize = 12.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}
