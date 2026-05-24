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
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.Watch
import androidx.compose.foundation.shape.CircleShape
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
import kotlinx.coroutines.launch
import androidx.activity.compose.rememberLauncherForActivityResult

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

    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    val permissionsLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.health.connect.client.PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.containsAll(dashboardViewModel.healthConnectManager.permissions)) {
            dashboardViewModel.syncHealthConnectData()
        } else {
            // The ViewModel will show "Permissions not granted" if they were denied
            dashboardViewModel.syncHealthConnectData()
        }
    }

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
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(16.dp)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "Digital Health Card",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                "Valid through 12/25",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            if (hcState.isLoading) {
                                CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                            } else if (hcState.hasActiveCard && hcState.url != null) {
                                Box(
                                    modifier = Modifier
                                        .background(Color.White, RoundedCornerShape(8.dp)) // Keep QR background white so it scans
                                        .padding(8.dp)
                                ) {
                                    AsyncImage(
                                        model = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${Uri.encode(hcState.url)}",
                                        contentDescription = "QR Code",
                                        modifier = Modifier.size(150.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { dashboardViewModel.revokeHealthCard() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Text("Revoke Access")
                                }
                            } else {
                                Button(
                                    onClick = { dashboardViewModel.generateHealthCard() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
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

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.align(Alignment.TopEnd)
                        ) {
                            Icon(
                                Icons.Filled.Person,
                                contentDescription = "Profile",
                                tint = Color.White,
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(MaterialTheme.colorScheme.primary, CircleShape)
                                    .padding(8.dp)
                            )
                            Text(
                                "Patient",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            "How to use Digital Health Card:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        Row(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Outlined.QrCodeScanner, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("1. Present the QR code at the check-in desk.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Outlined.VerifiedUser, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("2. Your medical profile will be scanned and verified.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Outlined.List, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("3. Access your health records and benefits.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Outlined.Event, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("4. Manage appointments and prescriptions seamlessly.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Health Connect Sync Section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Outlined.Favorite,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            "Google Health Connect",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            fontSize = 20.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { 
                            val status = dashboardViewModel.healthConnectManager.checkAvailability()
                            if (status != androidx.health.connect.client.HealthConnectClient.SDK_AVAILABLE) {
                                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                                intent.setPackage("com.android.vending")
                                intent.data = android.net.Uri.parse("market://details?id=com.google.android.apps.healthdata")
                                intent.putExtra("overlay", true)
                                intent.putExtra("callerId", context.packageName)
                                try {
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))
                                }
                                return@Button
                            }

                            coroutineScope.launch {
                                if (dashboardViewModel.healthConnectManager.hasAllPermissions()) {
                                    dashboardViewModel.syncHealthConnectData()
                                } else {
                                    permissionsLauncher.launch(dashboardViewModel.healthConnectManager.permissions)
                                }
                            }
                        },
                        enabled = syncState !is ProfileUpdateState.Loading,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                        shape = RoundedCornerShape(25.dp)
                    ) {
                        if (syncState is ProfileUpdateState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Syncing...", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        } else {
                            Text("Sync Now", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    
                    if (syncState is ProfileUpdateState.Success) {
                        Text(
                            text = (syncState as ProfileUpdateState.Success).message,
                            color = Color(0xFF4CAF50),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally)
                        )
                    } else if (syncState is ProfileUpdateState.Error) {
                        Text(
                            text = (syncState as ProfileUpdateState.Error).message,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally)
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        "How to connect your Smartwatch or Phone:",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Outlined.Watch, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.secondary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("1. Ensure your wearable or phone has Health Connect enabled.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Outlined.Favorite, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.secondary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("2. Open your device's Health app and allow data sharing.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Outlined.Sync, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.secondary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("3. Tap 'Sync Now' above to link and import your health data automatically.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Dynamic Charts Section
            if (vitalsData != null) {
                if (vitalsData.recentHeartRates.isNotEmpty()) {
                    BezierCurveChart(
                        dataPoints = vitalsData.recentHeartRates.map { it.value.toFloat() },
                        title = "Heart Rate Trend",
                        subtitle = "BPM over last 7 days",
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
                if (vitalsData.recentTemperatures.isNotEmpty()) {
                    BezierCurveChart(
                        dataPoints = vitalsData.recentTemperatures.map { it.value.toFloat() },
                        title = "Body Temperature Trend",
                        subtitle = "Celsius over last 7 days",
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }
        }
    }
}
