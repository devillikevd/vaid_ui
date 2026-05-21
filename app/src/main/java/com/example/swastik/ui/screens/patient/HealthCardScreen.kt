package com.example.swastik.ui.screens.patient

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.ui.screens.patient.components.BezierCurveChart
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.viewmodel.ProfileUpdateState
import com.example.swastik.ui.viewmodel.RecordsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthCardScreen(
    onNavigateBack: () -> Unit,
    dashboardViewModel: PatientDashboardViewModel,
    recordsViewModel: RecordsViewModel
) {
    val hcState by dashboardViewModel.healthCardState.collectAsState()
    val syncState by dashboardViewModel.healthConnectSyncState.collectAsState()
    val recordsState by recordsViewModel.uiState.collectAsState()
    val vitalsData = recordsState.vitalsData

    LaunchedEffect(Unit) {
        dashboardViewModel.checkHealthCardStatus()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.health_identity)) },
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
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // QR Code Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Digital Health Card",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (hcState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                    } else if (hcState.hasActiveCard && hcState.url != null) {
                        Text(
                            "Show this QR to your doctor for real-time vitals and records access.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )
                        Box(
                            modifier = Modifier
                                .background(Color.White, RoundedCornerShape(8.dp))
                                .padding(16.dp)
                        ) {
                            AsyncImage(
                                model = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${Uri.encode(hcState.url)}",
                                contentDescription = "QR Code",
                                modifier = Modifier.size(250.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(
                            onClick = { dashboardViewModel.revokeHealthCard() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Revoke Access")
                        }
                    } else {
                        Text(
                            "Generate a temporary secure QR code to share your health records and real-time vitals.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(bottom = 16.dp)
                        )
                        Button(
                            onClick = { dashboardViewModel.generateHealthCard() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Generate QR Code")
                        }
                    }

                    if (hcState.error != null) {
                        Text(
                            hcState.error!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Health Connect Sync Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Favorite,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Google Health Connect",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontSize = 16.sp
                            )
                            Text(
                                "Sync vitals for Outbreak Intelligence",
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                                fontSize = 12.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { dashboardViewModel.syncHealthConnectData() },
                        enabled = syncState !is ProfileUpdateState.Loading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        if (syncState is ProfileUpdateState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Syncing...", color = MaterialTheme.colorScheme.onPrimary)
                        } else {
                            Icon(Icons.Outlined.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sync Now", color = MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                    if (syncState is ProfileUpdateState.Success) {
                        Text(
                            text = (syncState as ProfileUpdateState.Success).message,
                            color = Color(0xFF4CAF50),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    } else if (syncState is ProfileUpdateState.Error) {
                        Text(
                            text = (syncState as ProfileUpdateState.Error).message,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Dynamic Charts Section
            if (vitalsData != null) {
                if (vitalsData.recentHeartRates.isNotEmpty()) {
                    BezierCurveChart(
                        dataPoints = vitalsData.recentHeartRates.map { it.toFloat() },
                        title = "Heart Rate Trend",
                        subtitle = "BPM over last 7 days",
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
                if (vitalsData.recentTemperatures.isNotEmpty()) {
                    BezierCurveChart(
                        dataPoints = vitalsData.recentTemperatures.map { it.toFloat() },
                        title = "Body Temperature Trend",
                        subtitle = "Celsius over last 7 days",
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }
        }
    }
}
