package com.example.swastik.ambulance.ui.screens.dashboard

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ambulance.data.remote.dto.DashboardStats
import com.example.swastik.ambulance.data.remote.dto.EmergencyDto
import com.example.swastik.ambulance.service.LocationTrackingService
import com.example.swastik.ambulance.ui.components.StatusStepper
import com.example.swastik.ambulance.ui.components.pulsingEffect
import com.example.swastik.ambulance.ui.components.shimmerEffect
import com.example.swastik.ambulance.ui.viewmodel.AuthViewModel
import com.example.swastik.ambulance.ui.viewmodel.DashboardViewModel
import kotlinx.coroutines.launch

/** Check whether our foreground service is actually running. */
private fun isServiceRunning(context: Context): Boolean {
    val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    @Suppress("DEPRECATION")
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
            text = { Text("Are you sure you want to log out? You will stop receiving emergency broadcasts.") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    if (isTracking) {
                        stopTracking(context)
                        isTracking = false
                    }
                    authViewModel.logout()
                    onLogout()
                }) { Text("Logout", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            }
        )
    }

    val permissionsToRequest = mutableListOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ).apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (locationGranted) {
            startTracking(context)
            isTracking = true
            dashboardViewModel.toggleVehicleStatus(true)
        } else {
            scope.launch { snackbarHostState.showSnackbar("Location permission required to go online") }
        }
    }

    fun requestPermissionsAndGoOnline() {
        if (permissionsToRequest.all { hasPermission(context, it) }) {
            startTracking(context)
            isTracking = true
            dashboardViewModel.toggleVehicleStatus(true)
        } else {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    fun goOffline() {
        stopTracking(context)
        isTracking = false
        dashboardViewModel.toggleVehicleStatus(false)
    }

    LaunchedEffect(Unit) {
        dashboardViewModel.loadDashboard()
        dashboardViewModel.userMessage.collect { msg ->
            if (msg.isNotEmpty()) {
                snackbarHostState.showSnackbar(msg)
            }
        }
    }

    val vehicle = dashboardState.vehicles.firstOrNull()
    // Sync tracking state based on vehicle backend status when loaded
    LaunchedEffect(vehicle?.status) {
        if (vehicle?.status == "available" && !isTracking) {
            if (permissionsToRequest.all { hasPermission(context, it) }) {
                startTracking(context)
                isTracking = true
            }
        } else if (vehicle?.status == "offline" && isTracking) {
            stopTracking(context)
            isTracking = false
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Vaididea Responder", fontWeight = FontWeight.Bold) },
                actions = {
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
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (dashboardState.isLoading) {
                SkeletonDashboard(PaddingValues(0.dp))
            } else if (dashboardState.error != null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
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
                        .background(MaterialTheme.colorScheme.background),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Vehicle Header with Online/Offline Toggle
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(16.dp)),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            vehicle?.vehicleNumber ?: "Unknown Vehicle",
                                            style = MaterialTheme.typography.titleLarge,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            vehicle?.type?.replace("_", " ")?.uppercase() ?: "Standard Ambulance",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .size(12.dp)
                                            .clip(CircleShape)
                                            .background(if (isTracking) Color(0xFF4CAF50) else Color.Red)
                                    )
                                }
                                Spacer(modifier = Modifier.height(16.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Button(
                                        onClick = { if (isTracking) goOffline() else requestPermissionsAndGoOnline() },
                                        modifier = Modifier.fillMaxWidth().height(56.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isTracking) Color(0xFFD32F2F) else Color(0xFF4CAF50)
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Icon(
                                            if (isTracking) Icons.Default.CloudOff else Icons.Default.CloudUpload,
                                            contentDescription = null
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            if (isTracking) "GO OFFLINE" else "GO ONLINE",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Stats Row
                    item {
                        dashboardState.stats?.let { stats ->
                            StatsRow(stats)
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
                                },
                                onNavigateToPatient = {
                                    if (emergency.latitude != null && emergency.longitude != null) {
                                        val uri = Uri.parse("google.navigation:q=${emergency.latitude},${emergency.longitude}")
                                        val mapIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                                            setPackage("com.google.android.apps.maps")
                                        }
                                        if (mapIntent.resolveActivity(context.packageManager) != null) {
                                            context.startActivity(mapIntent)
                                        } else {
                                            // Fallback to browser
                                            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${emergency.latitude},${emergency.longitude}"))
                                            context.startActivity(browserIntent)
                                        }
                                    }
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
        Box(modifier = Modifier.fillMaxWidth().height(160.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
            Box(modifier = Modifier.weight(1f).height(80.dp).clip(RoundedCornerShape(16.dp)).shimmerEffect())
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
                "Online & Ready",
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
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Max),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(modifier = Modifier.weight(1f).fillMaxHeight(), label = "Total Trips", value = "${stats.completedToday}", color = Color(0xFF4CAF50))
        StatCard(modifier = Modifier.weight(1f).fillMaxHeight(), label = "Active", value = "${stats.activeEmergencies}", color = Color(0xFFE53935))
        StatCard(modifier = Modifier.weight(1f).fillMaxHeight(), label = "Response", value = stats.avgResponseTime.replace(" min", "m").take(5), color = Color(0xFF2196F3))
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
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(value, style = MaterialTheme.typography.headlineMedium, color = color, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
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
    onUpdateStatus: (String) -> Unit,
    onNavigateToPatient: () -> Unit
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
                        emergency.emergencyType?.replaceFirstChar { it.uppercase() } ?: "Emergency Request",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    statusText,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
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
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Start Route", style = MaterialTheme.typography.labelLarge) }
                        
                        OutlinedButton(
                            onClick = onNavigateToPatient,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { 
                            Icon(Icons.Default.Navigation, null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Navigate")
                        }
                    }
                    "en_route" -> {
                        Button(
                            onClick = { onUpdateStatus("arrived") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800)),
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Arrived at Location", style = MaterialTheme.typography.labelLarge) }
                        
                        OutlinedButton(
                            onClick = onNavigateToPatient,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { 
                            Icon(Icons.Default.Navigation, null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Map")
                        }
                    }
                    "arrived" -> {
                        Button(
                            onClick = { onUpdateStatus("picked_up") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9C27B0)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Patient Picked Up", style = MaterialTheme.typography.labelLarge) }
                    }
                    "picked_up" -> {
                        Button(
                            onClick = { onUpdateStatus("en_route_hospital") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00897B)),
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Head to Hospital", style = MaterialTheme.typography.labelLarge) }
                    }
                    "en_route_hospital" -> {
                        Button(
                            onClick = { onUpdateStatus("arrived_hospital") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1B5E20)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Arrived at Hospital", style = MaterialTheme.typography.labelLarge) }
                    }
                    "arrived_hospital" -> {
                        Button(
                            onClick = { onUpdateStatus("completed") },
                            enabled = !isActionInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Complete Emergency", style = MaterialTheme.typography.labelLarge) }
                    }
                }
            }
        }
    }
}
