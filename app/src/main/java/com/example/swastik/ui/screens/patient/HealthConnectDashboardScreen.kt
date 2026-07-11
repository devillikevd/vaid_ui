package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
