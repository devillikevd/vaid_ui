package com.example.swastik.ui.screens.patient.finder.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.LocalHospital
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.FacilityType
import com.example.swastik.ui.theme.SwastikPrimary

const val DEFAULT_DISCOVERY_RADIUS_KM = 10f
const val MAX_DISCOVERY_RADIUS_KM = 25f

@Composable
fun FilterBottomSheet(
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
    showHospitalTypeFilter: Boolean,
    onApplyFilters: () -> Unit,
    isDarkMode: Boolean
) {
    val colorScheme = MaterialTheme.colorScheme
    val textColor = colorScheme.onSurface
    val cardColor = colorScheme.primaryContainer

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // Header
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
            }) {
                Text(stringResource(R.string.reset), color = SwastikPrimary)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Distance Slider
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

        // Open Now Toggle
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

        // Rating Filter
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
                androidx.compose.foundation.lazy.LazyRow(
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

        // Emergency Services Toggle
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

        Spacer(modifier = Modifier.height(24.dp))

        // Apply Filters Button
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
fun FilterSectionCard(
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
