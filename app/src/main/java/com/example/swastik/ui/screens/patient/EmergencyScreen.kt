package com.example.swastik.ui.screens.patient

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.components.MapMarkerData
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.viewmodel.EmergencyUiState
import com.example.swastik.ui.viewmodel.EmergencyViewModel
import com.example.swastik.utils.NavigationHelper
import org.osmdroid.util.GeoPoint
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

private val EmergencyCanvas = Color(0xFFF8F2EB)
private val EmergencySurface = Color(0xFFFFFBF7)
private val EmergencyInk = Color(0xFF1F2937)
private val EmergencyMuted = Color(0xFF6B7280)
private val EmergencyAlert = Color(0xFFB91C1C)
private val EmergencyAlertStrong = Color(0xFFDC2626)
private val EmergencyAccent = Color(0xFFF97316)
private val EmergencySuccess = Color(0xFF15803D)
private val EmergencyRoute = Color(0xFF4F46E5)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmergencyScreen(
    onBackClick: () -> Unit = {},
    viewModel: EmergencyViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // ===== LOCATION PERMISSION =====
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.fetchLocation()
        }
    }

    // Request permission as soon as screen opens
    LaunchedEffect(Unit) {
        if (!uiState.locationAvailable) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.emergency_network), fontWeight = FontWeight.Bold)
                        Text(
                            "Ambulance dispatch and live response",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.82f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = EmergencyAlert,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        when {
            uiState.activeEmergency != null -> {
                // Show active emergency tracking
                ActiveEmergencyView(
                    uiState = uiState,
                    onCancel = { reason -> viewModel.cancelEmergency(reason) },
                    modifier = Modifier.padding(paddingValues)
                )
            }
            uiState.requestSent -> {
                // Show confirmation
                EmergencyConfirmation(
                    uiState = uiState,
                    onCancel = { reason -> viewModel.cancelEmergency(reason) },
                    modifier = Modifier.padding(paddingValues)
                )
            }
            else -> {
                // Show emergency type selection
                EmergencyTypeSelection(
                    uiState = uiState,
                    onRequestEmergency = { type, description ->
                        viewModel.requestEmergency(type, description)
                    },
                    onCheckActive = { viewModel.checkActiveEmergency() },
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun EmergencyTypeSelection(
    uiState: EmergencyUiState,
    onRequestEmergency: (String, String) -> Unit,
    onCheckActive: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedType by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var showConfirmDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val colorScheme = MaterialTheme.colorScheme

    LaunchedEffect(Unit) { onCheckActive() }

    val emergencyTypes = listOf(
        EmergencyTypeItem(
            icon = Icons.Filled.LocalHospital,
            label = "General",
            value = "general",
            description = "Sudden illness, collapse, fever, breathlessness",
            color = EmergencyAlertStrong
        ),
        EmergencyTypeItem(
            icon = Icons.Filled.Warning,
            label = "Accident",
            value = "accident",
            description = "Road trauma, bleeding, falls, fractures",
            color = EmergencyAccent
        ),
        EmergencyTypeItem(
            icon = Icons.Filled.Favorite,
            label = "Cardiac",
            value = "cardiac",
            description = "Chest pain, stroke signs, unconsciousness",
            color = MaterialTheme.colorScheme.onSurface
        ),
        EmergencyTypeItem(
            icon = Icons.Filled.Person,
            label = "Pregnancy",
            value = "pregnancy",
            description = "Labour pain, urgent maternal transport",
            color = MaterialTheme.colorScheme.onSurface
        ),
        EmergencyTypeItem(
            icon = Icons.Filled.MedicalServices,
            label = "Other",
            value = "other",
            description = "Any urgent condition needing ambulance pickup",
            color = MaterialTheme.colorScheme.onSurface
        )
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(
                                Color(0xFF7F1D1D),
                                EmergencyAlertStrong,
                                EmergencyAccent
                            )
                        )
                    )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(Color.White.copy(alpha = 0.18f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.LocalHospital,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(
                        "Emergency ambulance, built for real response",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp,
                        lineHeight = 30.sp
                    )
                    Text(
                        "Choose the emergency lane, share live GPS, and keep the dispatch journey visible from first alert to hospital handoff.",
                        color = Color.White.copy(alpha = 0.86f),
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        EmergencyFeatureChip("Live GPS")
                        EmergencyFeatureChip("Driver contact")
                        EmergencyFeatureChip("Hospital-ready")
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (uiState.locationAvailable) {
                        colorScheme.secondaryContainer.copy(alpha = 0.7f)
                    } else {
                        colorScheme.tertiaryContainer.copy(alpha = 0.7f)
                    }
                ),
                shape = RoundedCornerShape(18.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        if (uiState.locationAvailable) Icons.Filled.MyLocation else Icons.Filled.LocationDisabled,
                        contentDescription = null,
                        tint = if (uiState.locationAvailable) EmergencySuccess else EmergencyAccent,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            if (uiState.locationAvailable) "Location locked for dispatch" else "Live location still needed",
                            fontWeight = FontWeight.SemiBold,
                            color = if (uiState.locationAvailable) colorScheme.onSecondaryContainer else colorScheme.onTertiaryContainer
                        )
                        Text(
                            if (uiState.locationAvailable) {
                                "Your current GPS will keep updating so the responding ambulance follows you, not a stale pin."
                            } else {
                                "Enable GPS so dispatch and the nearest driver can navigate to you accurately."
                            },
                            fontSize = 12.sp,
                            color = colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        item {
            Text(
                "Choose the emergency lane",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        items(emergencyTypes.chunked(2)) { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowItems.forEach { item ->
                    EmergencyTypeCard(
                        item = item,
                        isSelected = selectedType == item.value,
                        onClick = { selectedType = item.value },
                        modifier = Modifier.weight(1f)
                    )
                }
                if (rowItems.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        item {
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(stringResource(R.string.tell_dispatch)) },
                placeholder = { Text(stringResource(R.string.dispatch_placeholder)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmergencyAlertStrong,
                    unfocusedBorderColor = colorScheme.outline.copy(alpha = 0.6f),
                    focusedTextColor = colorScheme.onSurface,
                    unfocusedTextColor = colorScheme.onSurface,
                    cursorColor = EmergencyAlertStrong,
                    focusedContainerColor = colorScheme.surface,
                    unfocusedContainerColor = colorScheme.surface
                )
            )
        }

        if (uiState.error != null) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = colorScheme.errorContainer.copy(alpha = 0.85f)),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        uiState.error,
                        color = colorScheme.onErrorContainer,
                        modifier = Modifier.padding(14.dp),
                        fontSize = 14.sp
                    )
                }
            }
        }

        item {
            Button(
                onClick = { showConfirmDialog = true },
                enabled = selectedType.isNotBlank() && !uiState.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmergencyAlertStrong),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Filled.LocalHospital, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.dispatch_ambulance_now), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }

        item {
            OutlinedButton(
                onClick = { NavigationHelper.openDialer(context, "108") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = EmergencyAlert),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmergencyAlert.copy(alpha = 0.24f)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Call, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.call_108_directly), fontWeight = FontWeight.SemiBold)
            }
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text(stringResource(R.string.confirm_emergency_request)) },
            text = {
                Text(
                    "This will trigger the ambulance response flow with your current location so the nearest available vehicle can be routed to you."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirmDialog = false
                        onRequestEmergency(selectedType, description)
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = EmergencyAlertStrong)
                ) {
                    Text(stringResource(R.string.yes_request_now))
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
}

@Composable
private fun EmergencyTypeCard(
    item: EmergencyTypeItem,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) item.color.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, item.color) else null,
        elevation = CardDefaults.cardElevation(if (isSelected) 6.dp else 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(item.color.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        item.icon,
                        contentDescription = null,
                        tint = item.color,
                        modifier = Modifier.size(26.dp)
                    )
                }
                if (isSelected) {
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = item.color,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            Text(
                item.label,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = if (isSelected) item.color else MaterialTheme.colorScheme.onSurface
            )
            Text(
                item.description,
                fontSize = 12.sp,
                lineHeight = 17.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                minLines = 2
            )
            Text(
                if (isSelected) "Selected for dispatch" else "Tap to choose",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = if (isSelected) item.color else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
private fun EmergencyFeatureChip(label: String) {
    Surface(
        color = Color.White.copy(alpha = 0.16f),
        shape = RoundedCornerShape(999.dp)
    ) {
        Text(
            text = label,
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun ActiveEmergencyHeroCard(
    requestId: String?,
    statusText: String,
    statusSubtext: String,
    isTrackingAmbulance: Boolean,
    resolvedDriverName: String?,
    resolvedVehicleNumber: String?,
    trackingSummary: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(6.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF3F0D12),
                            EmergencyAlert,
                            EmergencyAlertStrong
                        )
                    )
                )
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            color = Color.White.copy(alpha = 0.16f),
                            shape = RoundedCornerShape(999.dp)
                        ) {
                            Text(
                                text = "Request ${requestId ?: "Pending"}",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                            )
                        }
                        if (isTrackingAmbulance) {
                            Surface(
                                color = Color.White.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(999.dp)
                            ) {
                                Text(
                                    text = "Live GPS Active",
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                                )
                            }
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(58.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(Color.White.copy(alpha = 0.14f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.LocalShipping,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = statusText,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 24.sp,
                        lineHeight = 30.sp
                    )
                    Text(
                        text = statusSubtext,
                        color = Color.White.copy(alpha = 0.86f),
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    EmergencyMetricTile(
                        modifier = Modifier.weight(1f),
                        label = "Driver",
                        value = resolvedDriverName ?: "Assigning now"
                    )
                    EmergencyMetricTile(
                        modifier = Modifier.weight(1f),
                        label = "Vehicle",
                        value = resolvedVehicleNumber ?: "Preparing"
                    )
                }

                if (!trackingSummary.isNullOrBlank()) {
                    Surface(
                        color = Color.White.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Outlined.Route,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = trackingSummary,
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmergencyMetricTile(
    modifier: Modifier = Modifier,
    label: String,
    value: String
) {
    Surface(
        modifier = modifier,
        color = Color.White.copy(alpha = 0.14f),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label,
                color = Color.White.copy(alpha = 0.76f),
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = value,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun ActiveEmergencyView(
    uiState: EmergencyUiState,
    onCancel: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showCancelDialog by remember { mutableStateOf(false) }

    val emergency = uiState.activeEmergency
    val resolvedStatus = uiState.ambulanceStatus ?: emergency?.resolvedStatus() ?: "pending"
    val resolvedDriverName = uiState.driverName ?: emergency?.resolvedDriverName()
    val resolvedDriverPhone = uiState.driverPhone ?: emergency?.resolvedDriverPhone()
    val resolvedVehicleNumber = uiState.vehicleNumber ?: emergency?.resolvedVehicleNumber()
    val colorScheme = MaterialTheme.colorScheme
    val canPatientCancel = resolvedStatus in listOf(
        "pending",
        "broadcasting",
        "assigned",
        "accepted",
        "dispatched",
        "en_route"
    )

    val statusText = when (resolvedStatus) {
        "pending" -> "Finding Ambulance..."
        "broadcasting" -> "Searching Nearby Ambulances..."
        "assigned", "accepted", "dispatched" -> "Ambulance Confirmed"
        "en_route" -> "Ambulance On The Way"
        "arrived" -> "Ambulance Arrived!"
        "picked_up" -> "You've Been Picked Up"
        "en_route_hospital" -> "On The Way to Hospital"
        "arrived_hospital" -> "Arrived at Hospital"
        "completed" -> "Emergency Completed"
        "timeout" -> "Search Timed Out — Retrying..."
        "no_ambulance" -> "No Ambulance Available"
        else -> "Ambulance On The Way"
    }

    val statusSubtext = when (resolvedStatus) {
        "pending", "broadcasting" -> "We're notifying nearby ambulance drivers"
        "assigned", "accepted", "dispatched" -> "Your ambulance team has confirmed this emergency request"
        "en_route" -> "Help is coming to your location"
        "arrived" -> "The ambulance is at your pickup point"
        "picked_up" -> "Heading to the nearest hospital"
        "en_route_hospital" -> "Transporting to the hospital"
        "arrived_hospital" -> "You've arrived at the hospital"
        "timeout", "no_ambulance" -> "Please call 108 for immediate help"
        else -> "Help is coming to your location"
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            ActiveEmergencyHeroCard(
                requestId = emergency?.resolvedRequestId(),
                statusText = statusText,
                statusSubtext = statusSubtext,
                isTrackingAmbulance = uiState.isTrackingAmbulance,
                resolvedDriverName = resolvedDriverName,
                resolvedVehicleNumber = resolvedVehicleNumber,
                trackingSummary = listOfNotNull(
                    uiState.ambulanceDistanceKm?.let { String.format(java.util.Locale.US, "%.1f km away", it) },
                    uiState.ambulanceEta
                ).takeIf { it.isNotEmpty() }?.joinToString(" • ")
            )
        }

        if (uiState.isTrackingAmbulance) {
            item {
                val trackingPulse = rememberInfiniteTransition(label = "tracking")
                val dotAlpha by trackingPulse.animateFloat(
                    initialValue = 0.35f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(700),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "trackingDot"
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.secondaryContainer.copy(alpha = 0.72f))
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF22C55E).copy(alpha = dotAlpha))
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Live response tracking is active",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colorScheme.onSecondaryContainer
                            )
                            Text(
                                "Dispatch, driver movement, and your pickup location will keep syncing here.",
                                fontSize = 12.sp,
                                color = colorScheme.onSurfaceVariant
                            )
                        }
                        if (uiState.ambulanceLatitude != null && uiState.ambulanceLongitude != null) {
                            Text(
                                "${(uiState.ambulanceSpeed * 3.6f).toInt()} km/h",
                                fontSize = 12.sp,
                                color = EmergencySuccess,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        item {
            PatientEmergencyOverviewCard(
                uiState = uiState,
                statusText = statusText,
                statusSubtext = statusSubtext,
                resolvedDriverName = resolvedDriverName,
                resolvedVehicleNumber = resolvedVehicleNumber,
                resolvedDriverPhone = resolvedDriverPhone
            )
        }

        if (uiState.ambulanceLatitude != null && uiState.ambulanceLongitude != null) {
            val ambLat = uiState.ambulanceLatitude
            val ambLng = uiState.ambulanceLongitude
            val midLat = (uiState.latitude + ambLat) / 2
            val midLng = (uiState.longitude + ambLng) / 2

            val trackingMarkers = listOf(
                MapMarkerData(
                    id = "patient",
                    latitude = uiState.latitude,
                    longitude = uiState.longitude,
                    title = "Your Location",
                    markerColor = android.graphics.Color.parseColor("#7C3AED")
                ),
                MapMarkerData(
                    id = "ambulance",
                    latitude = ambLat,
                    longitude = ambLng,
                    title = "Ambulance",
                    snippet = uiState.ambulanceStatus ?: "En Route",
                    markerColor = android.graphics.Color.parseColor("#D32F2F")
                )
            )

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Outlined.Map, contentDescription = null, tint = EmergencyRoute)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(stringResource(R.string.live_route_view), fontWeight = FontWeight.Bold, color = colorScheme.onSurface)
                                Text(stringResource(R.string.live_route_desc), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                            }
                        }
                        Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
                            OsmMapView(
                                modifier = Modifier.fillMaxSize(),
                                center = GeoPoint(midLat, midLng),
                                zoom = 14.0,
                                markers = trackingMarkers,
                                route = uiState.route ?: emptyList(),
                                showUserLocation = false
                            )
                        }
                    }
                }
            }
        } else if (uiState.latitude != 0.0 && uiState.longitude != 0.0) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Outlined.MyLocation, contentDescription = null, tint = EmergencyRoute)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(stringResource(R.string.pickup_point_ready), fontWeight = FontWeight.Bold, color = colorScheme.onSurface)
                                Text(stringResource(R.string.pickup_point_desc), fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                            }
                        }
                        Box(modifier = Modifier.fillMaxWidth().height(180.dp)) {
                            OsmMapView(
                                modifier = Modifier.fillMaxSize(),
                                center = GeoPoint(uiState.latitude, uiState.longitude),
                                zoom = 15.0,
                                markers = emptyList(),
                                showUserLocation = true,
                                userLatitude = uiState.latitude,
                                userLongitude = uiState.longitude
                            )
                        }
                    }
                }
            }
        }

        if (emergency != null) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(stringResource(R.string.dispatch_details), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = colorScheme.onSurface)
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        InfoRow("Request #", emergency.resolvedRequestId())
                        InfoRow("Status", resolvedStatus)
                        InfoRow("Type", emergency.emergencyType ?: "Emergency")
                        if (emergency.estimatedArrival != null) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            InfoRow("ETA", emergency.estimatedArrival)
                        }
                        if (resolvedDriverName != null) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            InfoRow("Driver", resolvedDriverName)
                            if (resolvedVehicleNumber != null) InfoRow("Vehicle", resolvedVehicleNumber)
                            if (resolvedDriverPhone != null) InfoRow("Phone", resolvedDriverPhone)
                        }
                    }
                }
            }
        }

        item {
            PatientResponseJourneyCard(currentStatus = resolvedStatus)
        }

        if (uiState.ambulanceLatitude != null && uiState.ambulanceLongitude != null) {
            val ambulanceLat = uiState.ambulanceLatitude
            val ambulanceLng = uiState.ambulanceLongitude
            val distanceKm = NavigationHelper.calculateDistanceKm(
                uiState.latitude, uiState.longitude,
                ambulanceLat, ambulanceLng
            )
            val distanceText = NavigationHelper.formatDistance(distanceKm)
            val etaMinutes = NavigationHelper.estimateEtaMinutes(distanceKm, 50.0)
            val dirArrow = NavigationHelper.getDirectionArrow(
                uiState.latitude, uiState.longitude,
                ambulanceLat, ambulanceLng
            )

            item {
                val context = LocalContext.current
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.primaryContainer.copy(alpha = 0.55f)),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            "$dirArrow Ambulance is $distanceText away",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = EmergencyRoute
                        )
                        Text(
                            "Estimated arrival: ${uiState.ambulanceEta ?: "~$etaMinutes min"}",
                            fontSize = 14.sp,
                            color = colorScheme.onPrimaryContainer
                        )
                        Button(
                            onClick = {
                                NavigationHelper.openDirectionsFromTo(
                                    context,
                                    uiState.latitude, uiState.longitude,
                                    ambulanceLat, ambulanceLng,
                                    "Ambulance Location"
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = EmergencyRoute),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.open_live_route_maps), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        if (!resolvedDriverPhone.isNullOrBlank()) {
            item {
                val context = LocalContext.current
                Button(
                    onClick = { NavigationHelper.openDialer(context, resolvedDriverPhone) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = EmergencySuccess),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Call, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.call_ambulance_driver), fontWeight = FontWeight.Bold)
                }
            }
        }

        item {
            OutlinedButton(
                onClick = { showCancelDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = EmergencyAlert),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmergencyAlert.copy(alpha = 0.24f)),
                shape = RoundedCornerShape(14.dp),
                enabled = !uiState.isLoading && canPatientCancel
            ) {
                Text(
                    if (canPatientCancel) {
                        stringResource(R.string.cancel_emergency_request)
                    } else {
                        "Call driver to close request"
                    }
                )
            }
        }
    }

    if (showCancelDialog) {
        EmergencyCancellationDialog(
            onDismiss = { showCancelDialog = false },
            onConfirm = { reason ->
                showCancelDialog = false
                onCancel(reason)
            }
        )
    }
}

@Composable
private fun PatientEmergencyOverviewCard(
    uiState: EmergencyUiState,
    statusText: String,
    statusSubtext: String,
    resolvedDriverName: String?,
    resolvedVehicleNumber: String?,
    resolvedDriverPhone: String?
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Emergency response in progress",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = colorScheme.onSurface
            )

            Text(
                text = statusText,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                color = EmergencyAlertStrong,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = statusSubtext,
                fontSize = 13.sp,
                color = colorScheme.onSurfaceVariant
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SummaryPill(
                    modifier = Modifier.weight(1f),
                    title = "Driver",
                    value = resolvedDriverName ?: "Matching...",
                    accent = EmergencyRoute
                )
                SummaryPill(
                    modifier = Modifier.weight(1f),
                    title = "Vehicle",
                    value = resolvedVehicleNumber ?: "Pending",
                    accent = EmergencyAccent
                )
            }

            if (!resolvedDriverPhone.isNullOrBlank()) {
                SummaryPill(
                    modifier = Modifier.fillMaxWidth(),
                    title = "Contact",
                    value = resolvedDriverPhone,
                    accent = EmergencySuccess
                )
            }

            if (uiState.ambulanceDistanceKm != null || uiState.ambulanceEta != null) {
                SummaryPill(
                    modifier = Modifier.fillMaxWidth(),
                    title = "Tracking",
                    value = listOfNotNull(
                        uiState.ambulanceDistanceKm?.let { String.format(java.util.Locale.US, "%.1f km away", it) },
                        uiState.ambulanceEta
                    ).joinToString(" • "),
                    accent = EmergencyAlertStrong
                )
            }
        }
    }
}

@Composable
private fun SummaryPill(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    accent: Color
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = accent.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, fontSize = 11.sp, color = accent, fontWeight = FontWeight.SemiBold)
            Text(value, fontSize = 13.sp, color = colorScheme.onSurface, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun PatientResponseJourneyCard(currentStatus: String) {
    val colorScheme = MaterialTheme.colorScheme
    val stages = listOf(
        "pending" to "Request created",
        "broadcasting" to "Nearby ambulances alerted",
        "assigned" to "Ambulance confirmed",
        "en_route" to "Ambulance en route",
        "arrived" to "Ambulance arrived",
        "picked_up" to "Patient onboard",
        "en_route_hospital" to "To hospital",
        "arrived_hospital" to "At hospital",
        "completed" to "Completed"
    )

    val normalizedStatus = when (currentStatus.lowercase()) {
        "accepted", "dispatched" -> "assigned"
        else -> currentStatus.lowercase()
    }

    val currentIndex = stages.indexOfFirst { it.first == normalizedStatus }.coerceAtLeast(0)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(stringResource(R.string.response_journey), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = colorScheme.onSurface)

            stages.forEachIndexed { index, (_, label) ->
                val active = index <= currentIndex
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .clip(CircleShape)
                            .background(if (active) EmergencyAlertStrong else colorScheme.outline.copy(alpha = 0.35f))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        label,
                        color = if (active) colorScheme.onSurface else colorScheme.onSurfaceVariant,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun EmergencyConfirmation(
    uiState: EmergencyUiState,
    onCancel: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colorScheme = MaterialTheme.colorScheme
    var showCancelDialog by remember { mutableStateOf(false) }
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        val infiniteTransition = rememberInfiniteTransition(label = "pulse")
        val alpha by infiniteTransition.animateFloat(
            initialValue = 0.5f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(800),
                repeatMode = RepeatMode.Reverse
            ),
            label = "alpha"
        )

        Icon(
            Icons.Filled.CheckCircle,
            contentDescription = null,
            tint = EmergencySuccess,
            modifier = Modifier
                .size(80.dp)
                .alpha(alpha)
        )

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Emergency Request Sent!",
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            color = colorScheme.onSurface
        )
        Text(
            "An ambulance is being dispatched to your location",
            textAlign = TextAlign.Center,
            color = colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, start = 32.dp, end = 32.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedButton(
            onClick = { showCancelDialog = true },
            colors = ButtonDefaults.outlinedButtonColors(contentColor = EmergencyAlert),
            border = androidx.compose.foundation.BorderStroke(1.dp, EmergencyAlert.copy(alpha = 0.24f)),
            shape = RoundedCornerShape(14.dp),
            enabled = !uiState.isLoading
        ) {
            Text(stringResource(R.string.cancel_request))
        }
    }

    if (showCancelDialog) {
        EmergencyCancellationDialog(
            onDismiss = { showCancelDialog = false },
            onConfirm = { reason ->
                showCancelDialog = false
                onCancel(reason)
            }
        )
    }
}

@Composable
private fun EmergencyCancellationDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    val reasons = listOf(
        "Accidental SOS trigger",
        "Patient is stable now",
        "Private transport arranged",
        "Duplicate request"
    )
    var selectedReason by remember { mutableStateOf(reasons.first()) }
    var details by remember { mutableStateOf("") }
    var acceptedNotice by remember { mutableStateOf(false) }
    val finalReason = listOf(selectedReason, details.trim())
        .filter { it.isNotBlank() }
        .joinToString(": ")
        .take(500)
    val canConfirm = acceptedNotice && finalReason.length >= 12

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel Emergency Request?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "This will cancel the ambulance dispatch and notify the ambulance team with your reason.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                reasons.forEach { reason ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedReason = reason },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedReason == reason,
                            onClick = { selectedReason = reason }
                        )
                        Text(reason, modifier = Modifier.padding(start = 4.dp))
                    }
                }
                OutlinedTextField(
                    value = details,
                    onValueChange = { details = it.take(300) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Reason details") },
                    minLines = 2,
                    maxLines = 4
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { acceptedNotice = !acceptedNotice },
                    verticalAlignment = Alignment.Top
                ) {
                    Checkbox(
                        checked = acceptedNotice,
                        onCheckedChange = { acceptedNotice = it }
                    )
                    Text(
                        "I understand false or repeated SOS misuse can be reviewed and may lead to action under emergency-service policy.",
                        modifier = Modifier.padding(top = 12.dp),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(finalReason) },
                enabled = canConfirm,
                colors = ButtonDefaults.textButtonColors(contentColor = EmergencyAlertStrong)
            ) {
                Text("Confirm Cancel")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Keep Request")
            }
        }
    )
}

@Composable
private fun InfoRow(label: String, value: String) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = colorScheme.onSurfaceVariant, fontSize = 14.sp)
        Text(value, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = colorScheme.onSurface)
    }
}

private data class EmergencyTypeItem(
    val icon: ImageVector,
    val label: String,
    val value: String,
    val description: String,
    val color: Color
)
