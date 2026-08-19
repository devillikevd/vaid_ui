package com.example.swastik.ui.screens.patient

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import com.example.swastik.data.health.HealthConnectManager
import com.example.swastik.data.health.VitalsData
import com.example.swastik.ui.screens.patient.components.BezierCurveChart
import com.example.swastik.ui.viewmodel.RecordsViewModel
import kotlinx.coroutines.launch
import java.util.Locale

private val HealthGreen = Color(0xFF047857)
private val HealthGreenLight = Color(0xFFE8F8EF)
private val HealthBlue = Color(0xFF2563EB)
private val HealthOrange = Color(0xFFEA580C)
private val HealthPurple = Color(0xFF7C3AED)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthConnectDashboardScreen(
    onNavigateBack: () -> Unit,
    recordsViewModel: RecordsViewModel
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val healthConnectManager = remember { HealthConnectManager(context) }

    val recordsState by recordsViewModel.uiState.collectAsState()
    var localVitalsData by remember { mutableStateOf<VitalsData?>(recordsState.vitalsData) }
    var sdkStatus by remember { mutableIntStateOf(healthConnectManager.checkAvailability()) }
    var hasPermissions by remember { mutableStateOf(false) }
    var isSyncing by remember { mutableStateOf(false) }

    // Check permissions and load data on entry
    LaunchedEffect(Unit) {
        if (sdkStatus == HealthConnectClient.SDK_AVAILABLE) {
            hasPermissions = healthConnectManager.hasAllPermissions()
            if (hasPermissions) {
                isSyncing = true
                try {
                    val data = healthConnectManager.fetchVitalsData(days = 7)
                    localVitalsData = data
                } catch (_: Exception) {}
                isSyncing = false
            }
        }
        recordsViewModel.loadRecords()
    }

    // Permission launcher contract
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        scope.launch {
            if (granted.containsAll(healthConnectManager.permissions)) {
                hasPermissions = true
                isSyncing = true
                try {
                    val data = healthConnectManager.fetchVitalsData(days = 7)
                    localVitalsData = data
                } catch (_: Exception) {}
                isSyncing = false
                recordsViewModel.loadRecords()
            }
        }
    }

    val displayVitals = localVitalsData ?: recordsState.vitalsData

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart Health & Wearables Hub", fontWeight = FontWeight.ExtraBold, fontSize = 17.5.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (hasPermissions) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    isSyncing = true
                                    try {
                                        val data = healthConnectManager.fetchVitalsData(days = 7)
                                        localVitalsData = data
                                    } catch (_: Exception) {}
                                    isSyncing = false
                                    recordsViewModel.loadRecords()
                                }
                            }
                        ) {
                            if (isSyncing) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = HealthGreen)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = "Sync Vitals", tint = HealthGreen)
                            }
                        }
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
                .background(Color(0xFFF8FAFC))
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Connection & Permission Hero Card
            when {
                sdkStatus != HealthConnectClient.SDK_AVAILABLE -> {
                    UnavailableHealthConnectBanner(onInstall = {
                        val uri = Uri.parse("market://details?id=com.google.android.apps.healthdata")
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        try { context.startActivity(intent) } catch (_: Exception) {}
                    })
                }
                !hasPermissions -> {
                    PermissionRequestHeroCard(onConnect = {
                        permissionLauncher.launch(healthConnectManager.permissions)
                    })
                }
                else -> {
                    ConnectedSmartwatchStatusBanner(isSyncing = isSyncing, onManualSync = {
                        scope.launch {
                            isSyncing = true
                            try {
                                val data = healthConnectManager.fetchVitalsData(days = 7)
                                localVitalsData = data
                            } catch (_: Exception) {}
                            isSyncing = false
                            recordsViewModel.loadRecords()
                        }
                    })
                }
            }

            // 2. Doctor Consultation Live Telemetry Card
            DoctorTelemetrySharingCard()

            // 3. Living Activity Metric Rings (4 Top Cards)
            val totalSteps = displayVitals?.dailySteps?.sumOf { it.value } ?: 0L
            val distanceKm = (displayVitals?.distanceMeters ?: 0.0) / 1000.0
            val activeCalories = displayVitals?.activeCalories?.toInt() ?: 0
            val activeMinutes = displayVitals?.activeMinutes ?: 0L
            val sleepMinutes = displayVitals?.sleepMinutes ?: 0L

            Text(
                "Live Wearables Telemetry 📊",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                ActivityMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Daily Steps",
                    primaryValue = if (totalSteps > 0) String.format(Locale.getDefault(), "%,d", totalSteps) else "0 Steps",
                    subtitle = if (distanceKm > 0) String.format(Locale.getDefault(), "%.1f km covered", distanceKm) else "Target: 10,000",
                    progress = (totalSteps.toFloat() / 10000f).coerceIn(0f, 1f),
                    icon = Icons.Default.DirectionsWalk,
                    tint = HealthGreen,
                    bgGradient = listOf(Color(0xFFE8F8EF), Color(0xFFF0FDF4))
                )
                ActivityMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Active Burn",
                    primaryValue = if (activeCalories > 0) "$activeCalories kcal" else "0 kcal",
                    subtitle = "Target: 500 kcal",
                    progress = (activeCalories.toFloat() / 500f).coerceIn(0f, 1f),
                    icon = Icons.Default.LocalFireDepartment,
                    tint = HealthOrange,
                    bgGradient = listOf(Color(0xFFFFEDD5), Color(0xFFFFF7ED))
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                ActivityMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Active Zone",
                    primaryValue = if (activeMinutes > 0) "${activeMinutes}m" else "0 min",
                    subtitle = "Workout / Movement",
                    progress = (activeMinutes.toFloat() / 60f).coerceIn(0f, 1f),
                    icon = Icons.Default.Timer,
                    tint = HealthBlue,
                    bgGradient = listOf(Color(0xFFDBEAFE), Color(0xFFEFF6FF))
                )
                ActivityMetricCard(
                    modifier = Modifier.weight(1f),
                    label = "Sleep & Rest",
                    primaryValue = if (sleepMinutes > 0) "${sleepMinutes / 60}h ${sleepMinutes % 60}m" else "0h 0m",
                    subtitle = if (sleepMinutes >= 420) "Optimal Recovery" else "Rest Duration",
                    progress = (sleepMinutes.toFloat() / 480f).coerceIn(0f, 1f),
                    icon = Icons.Default.Bedtime,
                    tint = HealthPurple,
                    bgGradient = listOf(Color(0xFFEDE9FE), Color(0xFFF5F3FF))
                )
            }

            // 4. Clinical 7-Day Trend Charts
            Text(
                "Clinical Trends & Safe Ranges 🩺",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Heart Rate Trend Card
            val hrDataPoints = displayVitals?.recentHeartRates?.map { it.value.toFloat() } ?: emptyList()
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = CircleShape, color = Color(0xFFFEE2E2), modifier = Modifier.size(34.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Favorite, null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Heart Rate (BPM)", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text("Resting Normal Range: 60 - 100 BPM", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                        if (hrDataPoints.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = HealthGreenLight
                            ) {
                                Text(
                                    "${hrDataPoints.last().toInt()} BPM",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    color = HealthGreen,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    BezierCurveChart(
                        dataPoints = hrDataPoints,
                        title = "Heart Rate Over Last 7 Days",
                        subtitle = if (hrDataPoints.isEmpty()) "Connect smartwatch to record continuous pulse trends" else "Sensor telemetry from Google Health Connect",
                        containerColor = Color(0xFFF8FAFC),
                        lineColor = Color(0xFFDC2626)
                    )
                }
            }

            // Body Temperature Trend Card
            val tempPoints = displayVitals?.recentTemperatures?.map { it.value.toFloat() } ?: emptyList()
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = CircleShape, color = Color(0xFFFEF3C7), modifier = Modifier.size(34.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Thermostat, null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Body Temperature (°C)", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text("Baseline Normal: 36.5°C - 37.5°C (98.6°F)", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                        if (tempPoints.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (tempPoints.last() > 38.0f) Color(0xFFFEE2E2) else HealthGreenLight
                            ) {
                                Text(
                                    String.format(Locale.getDefault(), "%.1f°C", tempPoints.last()),
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    color = if (tempPoints.last() > 38.0f) Color(0xFFDC2626) else HealthGreen,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    BezierCurveChart(
                        dataPoints = tempPoints,
                        title = "Temperature Variation Over 7 Days",
                        subtitle = if (tempPoints.isEmpty()) "Skin & core temperature sensors sync automatically" else "Clinical grade thermal log",
                        containerColor = Color(0xFFF8FAFC),
                        lineColor = Color(0xFFD97706)
                    )
                }
            }
        }
    }
}

// ==================== SUB-COMPONENTS ====================

@Composable
private fun PermissionRequestHeroCard(onConnect: () -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFF0F766E), Color(0xFF047857), Color(0xFF15803D))
                    )
                )
                .padding(18.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = Color.White.copy(alpha = 0.2f),
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Watch, null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Connect Google Health & Smartwatch ⌚", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                    Text("Galaxy Watch, Fitbit, Mi Band, Noise & Apple Watch", color = Color.White.copy(alpha = 0.85f), fontSize = 11.5.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Enable 1-tap Google Health Connect sync to stream live heart rate, daily steps, sleep quality, and vitals to your consulting doctor in real-time.",
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 12.sp,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onConnect,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                Icon(Icons.Default.Link, contentDescription = null, tint = HealthGreen, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Grant Permissions & Connect ➔", color = HealthGreen, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun ConnectedSmartwatchStatusBanner(
    isSyncing: Boolean,
    onManualSync: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFF0FDF4),
        border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Surface(shape = CircleShape, color = HealthGreen, modifier = Modifier.size(10.dp)) {}
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Google Health Connect Synced 🟢", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = Color(0xFF166534))
                    Text("Live telemetry auto-syncs with doctor", fontSize = 11.sp, color = Color(0xFF15803D))
                }
            }
            TextButton(onClick = onManualSync, enabled = !isSyncing) {
                Text(if (isSyncing) "Syncing..." else "Sync Now", fontWeight = FontWeight.Bold, color = HealthGreen, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun UnavailableHealthConnectBanner(onInstall: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFFFFBEB),
        border = BorderStroke(1.dp, Color(0xFFFDE68A)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text("Google Health Connect Required", fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF92400E))
            Spacer(modifier = Modifier.height(4.dp))
            Text("Install Google Health Connect to bridge your smartwatch with Swastik.", fontSize = 11.5.sp, color = Color(0xFFB45309))
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onInstall,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Get Health Connect on Google Play", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun DoctorTelemetrySharingCard() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("swastik_health_prefs", android.content.Context.MODE_PRIVATE) }
    var isSharingEnabled by remember { mutableStateOf(prefs.getBoolean("doctor_vitals_sharing_enabled", false)) }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSharingEnabled) Color(0xFFF0FDF4) else Color(0xFFF8FAFC)
        ),
        border = BorderStroke(
            1.dp,
            if (isSharingEnabled) Color(0xFFBBF7D0) else Color(0xFFE2E8F0)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Surface(
                        shape = CircleShape,
                        color = if (isSharingEnabled) Color(0xFFDCFCE7) else Color(0xFFE2E8F0),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                if (isSharingEnabled) Icons.Default.VerifiedUser else Icons.Default.Lock,
                                contentDescription = null,
                                tint = if (isSharingEnabled) HealthGreen else Color(0xFF64748B),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            if (isSharingEnabled) "Doctor Vitals Sharing: ENABLED 🟢" else "Doctor Vitals Sharing: OFF 🔒",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 13.sp,
                            color = if (isSharingEnabled) Color(0xFF166534) else Color(0xFF334155)
                        )
                        Text(
                            if (isSharingEnabled) "Active consent for booked appointments" else "Private (strictly on your device)",
                            fontSize = 11.sp,
                            color = if (isSharingEnabled) Color(0xFF15803D) else Color(0xFF64748B)
                        )
                    }
                }

                Switch(
                    checked = isSharingEnabled,
                    onCheckedChange = { checked ->
                        isSharingEnabled = checked
                        prefs.edit().putBoolean("doctor_vitals_sharing_enabled", checked).apply()
                    },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = HealthGreen
                    )
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = if (isSharingEnabled) Color(0xFFDCFCE7) else Color(0xFFE2E8F0))
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                if (isSharingEnabled)
                    "✓ Explicit Consent: During your confirmed video/in-person appointments, your doctor can view your synced heart rate and vitals. You can turn this OFF anytime."
                else
                    "🔒 Privacy Protected: In compliance with ABDM & Medical Data Privacy Laws, your vitals are NOT shared with anyone unless you turn this toggle ON.",
                fontSize = 10.5.sp,
                color = if (isSharingEnabled) Color(0xFF166534) else Color(0xFF64748B),
                lineHeight = 14.5.sp
            )
        }
    }
}

@Composable
private fun ActivityMetricCard(
    modifier: Modifier = Modifier,
    label: String,
    primaryValue: String,
    subtitle: String,
    progress: Float,
    icon: ImageVector,
    tint: Color,
    bgGradient: List<Color>
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(bgGradient))
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = tint.copy(alpha = 0.15f),
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
                    }
                }
                Text(label, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(primaryValue, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFF0F172A), maxLines = 1)
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, fontSize = 10.5.sp, color = Color(0xFF64748B))

            Spacer(modifier = Modifier.height(10.dp))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)),
                color = tint,
                trackColor = tint.copy(alpha = 0.2f)
            )
        }
    }
}
