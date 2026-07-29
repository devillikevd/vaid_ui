package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.ui.screens.patient.components.BezierCurveChart
import com.example.swastik.ui.viewmodel.RecordsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthConnectDashboardScreen(
    onNavigateBack: () -> Unit,
    recordsViewModel: RecordsViewModel
) {
    val recordsState by recordsViewModel.uiState.collectAsState()
    val vitalsData = recordsState.vitalsData
    val healthCardMainBg = MaterialTheme.colorScheme.primaryContainer

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Health Connect Dashboard", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                HealthMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Steps",
                    value = vitalsData?.dailySteps?.sumOf { it.value }?.takeIf { it > 0 }?.toString() ?: "No data",
                    icon = Icons.Default.DirectionsWalk,
                    tint = Color(0xFF047857)
                )
                HealthMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Active",
                    value = vitalsData?.activeMinutes?.takeIf { it > 0 }?.let { "${it}m" } ?: "No data",
                    icon = Icons.Default.Timer,
                    tint = Color(0xFF2563EB)
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                HealthMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Calories",
                    value = vitalsData?.activeCalories?.takeIf { it > 0.0 }?.let { "${it.toInt()} kcal" } ?: "No data",
                    icon = Icons.Default.LocalFireDepartment,
                    tint = Color(0xFFE65100)
                )
                HealthMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Sleep",
                    value = vitalsData?.sleepMinutes?.takeIf { it > 0 }?.let { "${it / 60}h ${it % 60}m" } ?: "No data",
                    icon = Icons.Default.Bedtime,
                    tint = Color(0xFF6A5AE0)
                )
            }

            BezierCurveChart(
                dataPoints = vitalsData?.recentHeartRates?.map { it.value.toFloat() } ?: emptyList(),
                title = "Heart Rate Trend",
                subtitle = "BPM over last 7 days",
                containerColor = healthCardMainBg,
                lineColor = MaterialTheme.colorScheme.primary
            )
            
            BezierCurveChart(
                dataPoints = vitalsData?.recentTemperatures?.map { it.value.toFloat() } ?: emptyList(),
                title = "Body Temperature Trend",
                subtitle = "Celsius over last 7 days",
                containerColor = healthCardMainBg,
                lineColor = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun HealthMetricCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: ImageVector,
    tint: Color
) {
    Card(
        modifier = modifier,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = tint.copy(alpha = 0.10f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, maxLines = 1)
            }
        }
    }
}
