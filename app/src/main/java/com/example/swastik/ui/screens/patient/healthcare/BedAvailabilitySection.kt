package com.example.swastik.ui.screens.patient.healthcare

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.WardBedAvailability
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.HisPatientViewModel

/**
 * Embeddable composable that shows ward-wise bed availability for a hospital.
 * Call from FacilityDetailScreen or any hospital detail page.
 */
@Composable
fun BedAvailabilitySection(
    hospitalId: String,
    viewModel: HisPatientViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(hospitalId) {
        viewModel.fetchBedAvailability(hospitalId)
    }

    val bedData = uiState.bedAvailability ?: return

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Bed, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Bed Availability", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.weight(1f))
                // Overall occupancy badge
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (bedData.occupancyPercent > 85) SwastikRed.copy(alpha = 0.12f) else SwastikGreen.copy(alpha = 0.12f)
                ) {
                    Text(
                        "${bedData.totalAvailable}/${bedData.totalBeds} available",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = if (bedData.occupancyPercent > 85) SwastikRed else SwastikGreen,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Ward rows
            bedData.wards.forEach { ward ->
                WardAvailabilityRow(ward)
                Spacer(modifier = Modifier.height(6.dp))
            }

            if (bedData.wards.isEmpty()) {
                Text(
                    "No ward information available",
                    color = TextSecondary,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun WardAvailabilityRow(ward: WardBedAvailability) {
    val occupancy = ward.occupancyPercent
    val barColor = when {
        occupancy >= 90 -> SwastikRed
        occupancy >= 70 -> SwastikOrange
        else -> SwastikGreen
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Ward name + type
        Column(modifier = Modifier.width(100.dp)) {
            Text(
                ward.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1
            )
            Text(
                ward.wardType.replace("_", " ").uppercase(),
                fontSize = 10.sp,
                color = TextSecondary
            )
        }

        // Occupancy bar
        Box(
            modifier = Modifier
                .weight(1f)
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color(0xFFF1F1F1))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = (occupancy / 100f).coerceIn(0f, 1f))
                    .clip(RoundedCornerShape(4.dp))
                    .background(barColor)
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Available count
        Text(
            "${ward.availableBeds}/${ward.totalBeds}",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = barColor,
            modifier = Modifier.width(40.dp)
        )

        // Price if available
        if (ward.chargePerDay != null) {
            Text(
                "₹${ward.chargePerDay.toInt()}/d",
                fontSize = 10.sp,
                color = TextSecondary,
                modifier = Modifier.width(55.dp)
            )
        }
    }
}
