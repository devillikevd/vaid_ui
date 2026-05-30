package com.example.swastik.ui.screens.patient.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.swastik.data.fitness.FitnessStepSanitizer
import com.example.swastik.data.model.DailyFitnessLog
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.theme.SwastikRed
import androidx.compose.foundation.isSystemInDarkTheme

@Composable
fun FitnessTrackingCard(
    fitnessLog: DailyFitnessLog?,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface
) {
    if (fitnessLog == null) return
    val displayLog = FitnessStepSanitizer.sanitizeStoredLog(fitnessLog)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Activity & Fitness",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Today",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                FitnessStatItem(
                    icon = Icons.Default.DirectionsRun,
                    value = "${displayLog.totalSteps}",
                    label = "Steps",
                    color = MaterialTheme.colorScheme.primary
                )
                FitnessStatItem(
                    icon = Icons.Default.Timer,
                    value = "${displayLog.activeMinutes}m",
                    label = "Active",
                    color = SwastikOrange
                )
                FitnessStatItem(
                    icon = Icons.Default.LocalFireDepartment,
                    value = "${displayLog.caloriesBurned.toInt()} kcal",
                    label = "Burned",
                    color = SwastikRed
                )
            }
        }
    }
}

@Composable
private fun FitnessStatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String,
    color: Color
) {
    val isDark = isSystemInDarkTheme()
    val boxBg = if (isDark) MaterialTheme.colorScheme.surface else Color.White

    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(boxBg)
                .border(1.dp, color.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
