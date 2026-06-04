package com.example.swastik.ambulance.ui.screens.dashboard

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ambulance.data.remote.dto.DashboardStats
import com.example.swastik.ambulance.data.remote.dto.EmergencyDto
import com.example.swastik.ambulance.service.LocationTrackingService
import com.example.swastik.ambulance.ui.components.MapMarkerData
import com.example.swastik.ambulance.ui.components.OsmMapView
import com.example.swastik.ambulance.ui.components.StatusStepper
import com.example.swastik.ambulance.ui.components.pulsingEffect
import com.example.swastik.ambulance.ui.components.shimmerEffect
import com.example.swastik.ambulance.ui.viewmodel.AuthViewModel
import com.example.swastik.ambulance.ui.viewmodel.DashboardViewModel
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import org.json.JSONObject

/** Check whether our foreground service is actually running. */
private fun isServiceRunning(context: Context): Boolean {
    val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    @Suppress("DEPRECATION") // still works for own-process services
    return manager.getRunningServices(Int.MAX_VALUE)
        .any { it.service.className == LocationTrackingService::class.java.name }
}

private fun startTracking(context: Context) {
    val intent = Intent(context, LocationTrackingService::class.java).apply {
        action = LocationTrackingService.ACTION_START
    }
    ContextCompat.startForegroundService(context, intent)
}

private fun stopTracking(context: Context) {
    val intent = Intent(context, LocationTrackingService::class.java).apply {
        action = LocationTrackingService.ACTION_STOP
    }
    context.startService(intent)
}

private fun hasPermission(context: Context, permission: String): Boolean {
    return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToEmergencies: () -> Unit,
    onNavigateToEmergencyDetail: (String) -> Unit,
    onNavigateToProfile: () -> Unit = {},
    onNavigateToInvites: () -> Unit = {},
    onLogout: () -> Unit,
    dashboardViewModel: DashboardViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val dashboardState by dashboardViewModel.dashboardState.collectAsState()
    val context = LocalContext.current
    var isTracking by remember { mutableStateOf(isServiceRunning(context)) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Confirm Logout", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to logout? Active tracking will be stopped.") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    stopTracking(context)
                    authViewModel.logout()
                    onLogout()
                }) {
                    Text("Logout", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // --- Permission launchers ---
    val backgroundLocationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            scope.launch {
                snackbarHostState.showSnackbar("Background location denied. Tracking works while app is open.")
            }
        }
        startTracking(context)
        isTracking = true
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            scope.launch {
                snackbarHostState.showSnackbar("Notifications denied. You may miss emergency alerts.")
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            startTracking(context)
            isTracking = true
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocation = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (fineLocation) {
            if (Build.VERSION.SDK_INT >= Build.VERSION.SDK_INT) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            } else {
                startTracking(context)
                isTracking = true
            }
        } else {
            scope.launch {
                snackbarHostState.showSnackbar("Location permission is required to start GPS tracking.")
            }
        }
    }

    fun requestPermissionsAndTrack() {
        val hasFineLocation = hasPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val hasNotification = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            hasPermission(context, Manifest.permission.POST_NOTIFICATIONS)
        val hasBackground = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            hasPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)

        when {
            !hasFineLocation -> locationPermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            !hasNotification -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            !hasBackground -> backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            else -> {
                startTracking(context)
                isTracking = true
            }
        }
    }

    var livePatientLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var lastKnownLocation by remember { mutableStateOf<android.location.Location?>(null) }
    
    LaunchedEffect(Unit) {
        if (hasPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION)) {
            try {
                val fusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        lastKnownLocation = location
                    }
                }
            } catch (e: SecurityException) {
                // Ignore
            }
        }
    }
    
    val currentLocation by LocationTrackingService.currentLocation.collectAsState()
    val effectiveLocation = currentLocation ?: lastKnownLocation
    
    val topEmergency = dashboardState.activeEmergencies.firstOrNull {
        it.latitude != null && it.longitude != null
    } ?: dashboardState.activeEmergencies.firstOrNull()

    LaunchedEffect(Unit) {
        launch {
            dashboardViewModel.userMessage.collect { msg ->
                snackbarHostState.showSnackbar(msg, duration = SnackbarDuration.Short)
            }
        }
        launch {
            dashboardViewModel.patientLocationUpdate.collect { data ->
                data?.let {
                    try {
                        val json = JSONObject(it)
                        val lat = json.optDouble("latitude")
                        val lng = json.optDouble("longitude")
                        if (!lat.isNaN() && !lng.isNaN()) livePatientLocation = Pair(lat, lng)
                    } catch (e: Exception) {}
                }
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Dashboard", style = MaterialTheme.typography.titleLarge)
                        Text(
                            text = if (isTracking) "GPS tracking active" else "GPS tracking is off",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isTracking) Color(0xFFB9F6CA) else Color(0xFFFFCDD2)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        if (isTracking) { stopTracking(context); isTracking = false } 
                        else requestPermissionsAndTrack()
                    }) {
                        Icon(
                            Icons.Default.MyLocation,
                            contentDescription = "Toggle GPS",
                            tint = if (isTracking) Color(0xFF4CAF50) else Color.White.copy(alpha = 0.5f)
                        )
                    }
                    IconButton(onClick = { dashboardViewModel.loadDashboard() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Person, contentDescription = "Profile")
                    }
                    IconButton(onClick = { showLogoutDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        if (dashboardState.isLoading) {
            SkeletonDashboard(padding)
        } else if (dashboardState.error != null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ErrorOutline, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(dashboardState.error ?: "Error", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { dashboardViewModel.loadDashboard() }) {
                        Text("Retry")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    dashboardState.stats?.let { stats ->
                        StatsRow(stats)
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ActionCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Warning,
                            title = "Emergency",
                            color1 = Color(0xFFD32F2F),
                            color2 = Color(0xFFC62828),
                            onClick = onNavigateToEmergencies
                        )
                        ActionCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Business,
                            title = "Invites",
                            color1 = Color(0xFF7B1FA2),
                            color2 = Color(0xFF4A148C),
                            onClick = onNavigateToInvites
                        )
                        ActionCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.MyLocation,
                            title = if (isTracking) "Stop GPS" else "Start GPS",
                            color1 = if (isTracking) Color(0xFF388E3C) else Color(0xFF1976D2),
                            color2 = if (isTracking) Color(0xFF2E7D32) else Color(0xFF1565C0),
                            onClick = {
                                if (isTracking) { stopTracking(context); isTracking = false } 
                                else requestPermissionsAndTrack()
                            }
                        )
                    }
                }

                // Always-visible map section
                item {
                    val hasEmergency = topEmergency != null && (topEmergency.latitude != null || livePatientLocation != null)
                    

                    val ambLat = effectiveLocation?.latitude
                    val ambLng = effectiveLocation?.longitude
                    
                    val patientLat = livePatientLocation?.first ?: topEmergency?.latitude
                    val patientLng = livePatientLocation?.second ?: topEmergency?.longitude
                    
                    // Center on ambulance if available, otherwise on patient, else default
                    val displayLat = ambLat ?: patientLat ?: 20.5937
                    val displayLng = ambLng ?: patientLng ?: 78.9629

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (hasEmergency) MaterialTheme.colorScheme.primary
                                            else Color(0xFF4CAF50)
                                        )
                                        .run { if (hasEmergency) pulsingEffect() else this }
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (hasEmergency) "Live Pickup Monitoring" else "Live Map",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            if (hasEmergency && dashboardState.distance != null) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = topEmergency?.address ?: topEmergency?.location ?: "Tracking pickup route",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.weight(1f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    val distance = dashboardState.distance
                                    if (distance != null) {
                                        val distKm = String.format("%.1f km", distance / 1000.0)
                                        val etaMins = (dashboardState.eta ?: 0.0) / 60.0
                                        val etaStr = if (etaMins > 0) String.format("%.0f min", etaMins) else "--"
                                        Text(
                                            text = "$distKm • $etaStr",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            } else {
                                Text(
                                    text = if (hasEmergency)
                                        topEmergency?.address ?: topEmergency?.location ?: "Pickup location tracking active"
                                    else
                                        "No active emergencies — showing your area",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(220.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            ) {
                                val markers = mutableListOf<MapMarkerData>()
                                
                                if (hasEmergency && patientLat != null && patientLng != null) {
                                    markers.add(
                                        MapMarkerData(
                                            id = topEmergency?.id ?: "patient",
                                            latitude = patientLat,
                                            longitude = patientLng,
                                            title = topEmergency?.patientName ?: "Patient pickup",
                                            snippet = topEmergency?.emergencyType ?: "Emergency request",
                                            markerColor = android.graphics.Color.parseColor("#D32F2F")
                                        )
                                    )
                                }
                                
                                if (ambLat != null && ambLng != null) {
                                    markers.add(
                                        MapMarkerData(
                                            id = "ambulance_self",
                                            latitude = ambLat,
                                            longitude = ambLng,
                                            title = "You",
                                            snippet = "Current Location",
                                            markerColor = android.graphics.Color.parseColor("#1976D2")
                                        )
                                    )
                                }

                                OsmMapView(
                                    modifier = Modifier.fillMaxSize(),
                                    center = GeoPoint(displayLat, displayLng),
                                    zoom = if (hasEmergency) 15.0 else 14.0,
                                    markers = markers,
                                    route = dashboardState.route ?: emptyList()
                                )
                                // Inner shadow overlay for premium feel
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.15f)),
                                                startY = 140f
                                            )
                                        )
                                )
                            }
                        }
                    }
                }

                if (dashboardState.activeEmergencies.isNotEmpty()) {
                    item {
                        Text(
                            "Active Emergencies",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    items(dashboardState.activeEmergencies) { emergency ->
                        EmergencyCard(
                            emergency = emergency,
                            isActionInProgress = dashboardState.actionRequestId == emergency.id,
                            onTap = { onNavigateToEmergencyDetail(emergency.id) },
                            onAccept = { dashboardViewModel.acceptEmergency(emergency.id) },
                            onReject = if (emergency.status in listOf("pending", "broadcasting", "requested")) {
                                { dashboardViewModel.rejectEmergency(emergency.id) }
                            } else null,
                            onUpdateStatus = { status ->
                                dashboardViewModel.updateEmergencyStatus(emergency.id, status)
                            }
                        )
                    }
                } else {
                    item {
                        EmptyStateIllustration()
                    }
                }
            }
        }
    }
}

@Composable
fun SkeletonDashboard(padding: PaddingValues) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.weight(1f).height(100.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(100.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(100.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
        }
        Box(modifier = Modifier.fillMaxWidth().height(260.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
        Box(modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
    }
}

@Composable
fun EmptyStateIllustration() {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(40.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.CheckCircleOutline,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "All Clear",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "No pending emergencies or active dispatches. Stay alert.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
private fun StatsRow(stats: DashboardStats) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(modifier = Modifier.weight(1f), label = "Active", value = "${stats.activeEmergencies}", color = Color(0xFFE53935))
        StatCard(modifier = Modifier.weight(1f), label = "Vehicles", value = "${stats.availableVehicles}", color = Color(0xFF2196F3))
        StatCard(modifier = Modifier.weight(1f), label = "Completed", value = "${stats.completedToday}", color = Color(0xFF4CAF50))
    }
}

@Composable
private fun StatCard(modifier: Modifier, label: String, value: String, color: Color) {
    Card(
        modifier = modifier.shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, style = MaterialTheme.typography.headlineMedium, color = color)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ActionCard(
    modifier: Modifier,
    icon: ImageVector,
    title: String,
    color1: Color,
    color2: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.shadow(6.dp, RoundedCornerShape(16.dp)).clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(listOf(color1, color2)))
                .padding(vertical = 20.dp, horizontal = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(28.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text(title, color = Color.White, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun EmergencyCard(
    emergency: EmergencyDto,
    isActionInProgress: Boolean,
    onTap: () -> Unit,
    onAccept: () -> Unit,
    onReject: (() -> Unit)? = null,
    onUpdateStatus: (String) -> Unit
) {
    val isCritical = emergency.priority == "critical"
    val isBroadcast = emergency.dispatchMode == "sos_broadcast"
    val statusText = emergency.status?.replace("_", " ")?.uppercase() ?: "PENDING"
    
    val cardColor = if (isCritical && emergency.status in listOf("pending", "broadcasting", "requested")) {
        MaterialTheme.colorScheme.errorContainer
    } else {
        MaterialTheme.colorScheme.surface
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(6.dp, RoundedCornerShape(16.dp))
            .clickable(onClick = onTap),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (isCritical) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                            .run { if (emergency.status == "broadcasting" || isCritical) pulsingEffect() else this }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        emergency.emergencyType ?: "Emergency request",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Text(
                    statusText,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Badges
            if (isBroadcast && emergency.status == "broadcasting") {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFFF3E0))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.WifiTethering, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFFE65100))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "SOS Broadcast — Accept to respond",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFFE65100)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Details
            if (emergency.patientName != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.PersonOutline, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(emergency.patientName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            if (emergency.address != null || emergency.location != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        emergency.address ?: emergency.location ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Interactive Stepper for tracking
            if (emergency.status !in listOf("pending", "broadcasting", "requested", "cancelled", "timeout", "no_ambulance")) {
                Spacer(modifier = Modifier.height(20.dp))
                StatusStepper(currentStatus = emergency.status ?: "assigned")
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                when (emergency.status) {
                    "pending", "requested", "broadcasting" -> {
                        Button(
                            onClick = onAccept,
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Accept Request", style = MaterialTheme.typography.labelLarge) }
                        if (onReject != null) {
                            OutlinedButton(
                                onClick = onReject,
                                enabled = !isActionInProgress,
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) { Text("Decline", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelLarge) }
                        }
                    }
                    "assigned", "accepted", "dispatched" -> {
                        Button(
                            onClick = { onUpdateStatus("en_route") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1976D2)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Start Route", style = MaterialTheme.typography.labelLarge) }
                    }
                    "en_route" -> {
                        Button(
                            onClick = { onUpdateStatus("arrived") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Arrived at Location", style = MaterialTheme.typography.labelLarge) }
                    }
                    "arrived" -> {
                        Button(
                            onClick = { onUpdateStatus("picked_up") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Patient Picked Up", style = MaterialTheme.typography.labelLarge) }
                    }
                    "picked_up" -> {
                        Button(
                            onClick = { onUpdateStatus("en_route_hospital") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00897B)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Heading to Hospital", style = MaterialTheme.typography.labelLarge) }
                    }
                    "en_route_hospital" -> {
                        Button(
                            onClick = { onUpdateStatus("arrived_hospital") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1B5E20)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Arrived at Hospital", style = MaterialTheme.typography.labelLarge) }
                    }
                    "arrived_hospital" -> {
                        Button(
                            onClick = { onUpdateStatus("completed") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text(if (isActionInProgress) "Working..." else "Complete Emergency", style = MaterialTheme.typography.labelLarge) }
                    }
                }
            }
        }
    }
}
