package com.example.swastik.ui.screens.patient.diagnostic

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.LoadState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.DiagnosticBookingDto
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.DiagnosticViewModel
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.graphics.luminance
import androidx.compose.foundation.shape.CircleShape
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.components.MapMarkerData
import org.osmdroid.util.GeoPoint
import com.example.swastik.ui.viewmodel.OrderTrackingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingHistoryScreen(
    onBackClick: () -> Unit,
    onNavigateToTracking: (String, Double, Double, String?, String?) -> Unit = { _, _, _, _, _ -> },
    viewModel: DiagnosticViewModel = hiltViewModel(),
    trackingVm: OrderTrackingViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val historyState by viewModel.bookingHistoryState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val pagedBookings = viewModel.getPagedBookings().collectAsLazyPagingItems()
    
    // Only show active tracking map if an agent is actually assigned and tracking
    val activeBooking = historyState.bookings.firstOrNull { it.status in listOf("assigned", "on_the_way") && !it.trackingToken.isNullOrEmpty() }
    var showHistoryOnly by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadBookingHistory()
    }

    LaunchedEffect(historyState.cancelSuccess) {
        if (historyState.cancelSuccess) {
            pagedBookings.refresh()
            kotlinx.coroutines.delay(2000)
            viewModel.clearBookingHistoryError()
        }
    }

    val bgColor = MaterialTheme.colorScheme.background
    Scaffold(
        containerColor = bgColor,
        topBar = {
            TopAppBar(
                title = { Text(if (showHistoryOnly) stringResource(R.string.booking_history) else "Diagnostic Bookings", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { 
                        viewModel.loadBookingHistory() 
                        pagedBookings.refresh()
                    }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = bgColor,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                    navigationIconContentColor = MaterialTheme.colorScheme.onBackground,
                    actionIconContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Cancel success banner
            AnimatedVisibility(visible = historyState.cancelSuccess) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF4CAF50))
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.booking_cancelled_successfully), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    }
                }
            }

            // Error banner
            historyState.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(8.dp))
                        Text(error, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                        TextButton(onClick = { viewModel.clearBookingHistoryError() }) {
                            Text(stringResource(R.string.dismiss))
                        }
                    }
                }
            }

            when {
                historyState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SwastikPrimary)
                    }
                }
                activeBooking != null && !showHistoryOnly -> {
                    ActiveBookingTrackingView(
                        booking = activeBooking,
                        onViewHistory = { showHistoryOnly = true },
                        onNavigateToTracking = onNavigateToTracking,
                        trackingVm = trackingVm
                    )
                }
                historyState.bookings.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Science, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(stringResource(R.string.no_bookings_found_1), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(stringResource(R.string.your_diagnostic_bookings_will_appear_here), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                            
                            if (activeBooking != null) {
                                Spacer(Modifier.height(16.dp))
                                Button(onClick = { showHistoryOnly = false }) {
                                    Text(stringResource(R.string.back_to_active_booking))
                                }
                            }
                        }
                    }
                }
                else -> {
                    Column {
                        if (activeBooking != null) {
                            Button(
                                onClick = { showHistoryOnly = false },
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                            ) {
                                Icon(Icons.Default.Map, null)
                                Spacer(Modifier.width(8.dp))
                                Text(stringResource(R.string.back_to_active_tracking))
                            }
                        } else {
                            OutlinedButton(
                                onClick = { /* Already in history view */ },
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.History, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text(stringResource(R.string.see_your_history))
                            }
                        }
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(count = pagedBookings.itemCount, key = { pagedBookings[it]?.id ?: it }) { index ->
                                val booking = pagedBookings[index]
                                if (booking != null) {
                                    BookingHistoryCard(
                                        booking = booking,
                                        onCancel = { viewModel.cancelBooking(booking.id) },
                                        onTrack = {
                                            if (!booking.trackingToken.isNullOrEmpty()) {
                                                onNavigateToTracking(
                                                    booking.trackingToken,
                                                    0.0,
                                                    0.0,
                                                    booking.deliveryAgent?.name,
                                                    booking.deliveryAgent?.phone
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                            
                            if (pagedBookings.loadState.append is LoadState.Loading) {
                                item {
                                    Box(
                                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(modifier = Modifier.size(36.dp), color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveBookingTrackingView(
    booking: DiagnosticBookingDto,
    onViewHistory: () -> Unit,
    onNavigateToTracking: (String, Double, Double, String?, String?) -> Unit,
    trackingVm: OrderTrackingViewModel
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val trackingState by trackingVm.state.collectAsState()
    
    LaunchedEffect(booking.trackingToken) {
        if (!booking.trackingToken.isNullOrEmpty()) {
            trackingVm.startTracking(booking.trackingToken, 0.0, 0.0)
        }
    }

    val isWalkIn = booking.collectionType == "walk_in" || booking.collectionType == "other"
    val centerLat = booking.center?.latitude ?: 0.0
    val centerLng = booking.center?.longitude ?: 0.0

    var destLat by remember { mutableStateOf(if (isWalkIn) centerLat else 0.0) }
    var destLng by remember { mutableStateOf(if (isWalkIn) centerLng else 0.0) }

    LaunchedEffect(isWalkIn) {
        if (!isWalkIn) {
            try {
                val fusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        destLat = location.latitude
                        destLng = location.longitude
                    }
                }
            } catch (e: SecurityException) {
                // Ignore if permission denied
            }
        }
    }

    val isWaitingForAgent = !isWalkIn && trackingState.agentLocation == null

    val mapCenter = if (isWalkIn) {
        GeoPoint(centerLat, centerLng)
    } else if (isWaitingForAgent) {
        GeoPoint(if (destLat != 0.0) destLat else centerLat, if (destLng != 0.0) destLng else centerLng)
    } else {
        GeoPoint(
            (destLat + trackingState.agentLocation!!.latitude) / 2.0,
            (destLng + trackingState.agentLocation!!.longitude) / 2.0
        )
    }
    
    val markers = buildList {
        // Diagnostic center marker (blue)
        if (centerLat != 0.0 && centerLng != 0.0) {
            add(
                MapMarkerData(
                    id = "center",
                    latitude = centerLat,
                    longitude = centerLng,
                    title = booking.center?.name ?: "Diagnostic Center",
                    snippet = if (isWalkIn) "Drop-off Location" else "Center Location",
                    markerColor = android.graphics.Color.parseColor(if (isWalkIn) "#E91E63" else "#1976D2")
                )
            )
        }
        
        // Patient location marker (green) - only for home collection
        if (!isWalkIn && destLat != 0.0) {
            add(
                MapMarkerData(
                    id = "dest",
                    latitude = destLat,
                    longitude = destLng,
                    title = "Your Location",
                    snippet = "Sample Collection",
                    markerColor = android.graphics.Color.parseColor("#4CAF50")
                )
            )
        }
        
        // Phlebotomist marker (orange)
        if (!isWalkIn && trackingState.agentLocation != null) {
            add(
                MapMarkerData(
                    id = "agent",
                    latitude = trackingState.agentLocation!!.latitude,
                    longitude = trackingState.agentLocation!!.longitude,
                    title = "Phlebotomist",
                    snippet = "Live Location",
                    markerColor = android.graphics.Color.parseColor("#F59E0B"),
                    iconRes = com.example.swastik.R.drawable.ic_delivery_bike,
                )
            )
        }
    }

    var mapRoute by remember { mutableStateOf<List<GeoPoint>>(emptyList()) }
    var initialAgentStartPoint by remember { mutableStateOf<GeoPoint?>(null) }

    LaunchedEffect(trackingState.agentLocation, centerLat, centerLng, destLat, destLng, isWalkIn) {
        val centerPoint = if (centerLat != 0.0 && centerLng != 0.0) GeoPoint(centerLat, centerLng) else null
        val userPoint = if (destLat != 0.0) GeoPoint(destLat, destLng) else null

        if (isWalkIn) {
            // User moving to center
            if (userPoint != null && centerPoint != null && mapRoute.isEmpty()) {
                val route = com.example.swastik.utils.RoutingUtils.fetchRoute(userPoint, centerPoint)
                if (route.isNotEmpty()) {
                    mapRoute = route
                } else {
                    mapRoute = listOfNotNull(userPoint, centerPoint).distinct()
                }
            }
        } else {
            // Agent moving to user
            if (initialAgentStartPoint == null && trackingState.agentLocation != null) {
                initialAgentStartPoint = GeoPoint(trackingState.agentLocation!!.latitude, trackingState.agentLocation!!.longitude)
            }
            val startPoint = centerPoint ?: initialAgentStartPoint
            if (startPoint != null && userPoint != null && mapRoute.isEmpty()) {
                val route = com.example.swastik.utils.RoutingUtils.fetchRoute(startPoint, userPoint)
                if (route.isNotEmpty()) {
                    mapRoute = route
                } else {
                    val agentPoint = trackingState.agentLocation?.let { GeoPoint(it.latitude, it.longitude) }
                    mapRoute = listOfNotNull(centerPoint, agentPoint, userPoint).distinct()
                }
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (isWalkIn) {
            // For Walk-In, just show a card with center info and a button to open Google Maps
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(32.dp)
                ) {
                    Icon(
                        Icons.Default.DirectionsWalk,
                        contentDescription = "Walk In",
                        modifier = Modifier.size(64.dp),
                        tint = SwastikPrimary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Visit Diagnostic Center",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = booking.center?.name ?: "Center",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = {
                            val uri = Uri.parse("google.navigation:q=$centerLat,$centerLng")
                            val mapIntent = Intent(Intent.ACTION_VIEW, uri)
                            mapIntent.setPackage("com.google.android.apps.maps")
                            if (mapIntent.resolveActivity(context.packageManager) != null) {
                                context.startActivity(mapIntent)
                            } else {
                                // Fallback to browser
                                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$centerLat,$centerLng"))
                                context.startActivity(browserIntent)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                    ) {
                        Icon(Icons.Default.Directions, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Navigate with Google Maps", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            // Home Collection Tracking
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                OsmMapView(
                    modifier = Modifier.fillMaxSize(),
                    center = mapCenter,
                    zoom = 15.0,
                    markers = markers,
                    route = mapRoute,
                    showUserLocation = false,
                    currentTrackerLocation = trackingState.agentLocation?.let { GeoPoint(it.latitude, it.longitude) }
                )
                
                Card(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(16.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)),
                    elevation = CardDefaults.cardElevation(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(if (isWaitingForAgent) Color(0xFFF59E0B) else SwastikPrimary, CircleShape)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = if (isWaitingForAgent) "Locating Phlebotomist..." else "Agent on the way",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
        
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            shadowElevation = 16.dp,
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Science, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Status: ${booking.status?.replaceFirstChar { it.uppercase() }}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = booking.test?.name ?: "Diagnostic Test",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    if (!booking.trackingToken.isNullOrEmpty() && booking.status in listOf("dispatched", "out_for_delivery")) {
                        IconButton(
                            onClick = { 
                                onNavigateToTracking(
                                    booking.trackingToken,
                                    0.0,
                                    0.0,
                                    booking.deliveryAgent?.name,
                                    booking.deliveryAgent?.phone
                                ) 
                            },
                            modifier = Modifier.background(MaterialTheme.colorScheme.secondaryContainer, CircleShape)
                        ) {
                            Icon(Icons.Default.Fullscreen, contentDescription = "Full map", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                        }
                    }
                }
                
                booking.deliveryAgent?.let { agent ->
                    Spacer(Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(agent.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                Text(stringResource(R.string.phlebotomist_agent), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            }
                            IconButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${agent.phone}"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.background(MaterialTheme.colorScheme.primary, CircleShape)
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = "Call Agent", tint = Color.White)
                            }
                        }
                    }
                }
                
                Spacer(Modifier.height(24.dp))
                HorizontalDivider()
                Spacer(Modifier.height(16.dp))
                
                OutlinedButton(
                    onClick = onViewHistory,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.History, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.see_your_history))
                }
            }
        }
    }
}

@Composable
private fun BookingHistoryCard(
    booking: DiagnosticBookingDto,
    onCancel: () -> Unit,
    onTrack: () -> Unit = {}
) {
    val context = LocalContext.current
    var expanded by remember { mutableStateOf(false) }
    val statusColor = when (booking.status) {
        "pending", "booked" -> Color(0xFFFB8C00)
        "confirmed" -> Color(0xFF1976D2)
        "dispatched" -> Color(0xFF00838F)
        "sample_collected" -> Color(0xFFFFA000)
        "processing" -> Color(0xFF7B1FA2)
        "completed" -> Color(0xFF4CAF50)
        "cancelled" -> Color(0xFFE53935)
        else -> Color.Gray
    }
    val statusLabel = when (booking.status) {
        "pending", "booked" -> "Pending"
        "confirmed" -> "Confirmed"
        "dispatched" -> "Dispatched"
        "sample_collected" -> "Sample Collected"
        "processing" -> "Processing"
        "completed" -> "Completed"
        "cancelled" -> "Cancelled"
        else -> booking.status?.replaceFirstChar { it.uppercase() } ?: "Unknown"
    }

    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val textColorPrimary = if (isDark) Color(0xFFF8FAFC) else Color(0xFF1E293B)
    val textColorSecondary = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
        onClick = { expanded = !expanded }
    ) {
        Column(Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        booking.test?.name ?: "Diagnostic Test",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = textColorPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        booking.center?.name ?: "Diagnostic Center",
                        color = textColorSecondary,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    booking.bookingNumber?.let { bookingNumber ->
                        Spacer(Modifier.height(4.dp))
                        Text(
                            bookingNumber,
                            color = textColorSecondary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(statusLabel, color = statusColor, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                }
            }

            Spacer(Modifier.height(8.dp))

            // Date & price row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, null, tint = SwastikPrimary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = buildString {
                            append(formatBookingDate(booking.bookingDate))
                            if (booking.bookingTime != null) append(" at ${booking.bookingTime}")
                        },
                        fontSize = 13.sp,
                        color = textColorSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.width(8.dp))
                booking.test?.price?.let {
                    Text("₹${it.toInt()}", fontWeight = FontWeight.Bold, color = textColorPrimary, fontSize = 15.sp, maxLines = 1)
                }
            }

            // Expanded details
            AnimatedVisibility(visible = expanded) {
                Column(Modifier.padding(top = 12.dp)) {
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))

                    // Collection type
                    booking.collectionType?.let { ct ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocalShipping, null, tint = textColorSecondary, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "Collection: ${ct.replace("_", " ").replaceFirstChar { it.uppercase() }}",
                                fontSize = 13.sp,
                                color = textColorSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    // Test category
                    booking.test?.category?.let { cat ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Category, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.category_label, cat), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    // Report time
                    booking.test?.reportTime?.let { rt ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Timer, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.report_type_format, rt), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    // Result status
                    booking.resultStatus?.let { rs ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Assignment, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "Result: ${rs.replace("_", " ").replaceFirstChar { it.uppercase() }}",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    booking.resultUploadedAt?.let { uploadedAt ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Verified, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.uploaded_label, formatBookingDate(uploadedAt)), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    // Notes
                    booking.notes?.let { notes ->
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Default.Notes, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(notes, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    booking.resultNotes?.takeIf { it.isNotBlank() }?.let { resultNotes ->
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Default.Description, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(resultNotes, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    // Center phone
                    booking.center?.phone?.let { phone ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Phone, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(phone, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    booking.resultUrl?.takeIf { it.isNotBlank() }?.let { resultUrl ->
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = {
                                try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(resultUrl)))
                                } catch (_: Exception) {
                                    Toast.makeText(context, context.getString(R.string.unable_open_report), Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.OpenInNew, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.view_report))
                        }
                    }

                    // Cancel button (only before collection begins)
                    if (booking.status in setOf("pending", "booked", "confirmed")) {
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = onCancel,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE53935)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Cancel, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.cancel_booking))
                        }
                    }

                    // Track Delivery button (for dispatched home collections)
                    if (booking.collectionType == "home_collection" && !booking.trackingToken.isNullOrEmpty() && booking.status in listOf("dispatched", "out_for_delivery")) {
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = onTrack,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.track_agent))
                        }
                    }

                    // Navigate button (for walk_in bookings)
                    if (booking.collectionType == "walk_in" && booking.status in listOf("pending", "booked", "confirmed")) {
                        val lat = booking.center?.latitude
                        val lng = booking.center?.longitude
                        if (lat != null && lng != null) {
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    try {
                                        val uri = Uri.parse("google.navigation:q=$lat,$lng")
                                        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                                            setPackage("com.google.android.apps.maps")
                                        }
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Google Maps is not installed", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Directions, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(stringResource(R.string.navigate_to_center))
                            }
                        }
                    }
                }
            }

            // Expand toggle
            Icon(
                if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                "Toggle details",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

private fun formatBookingDate(dateStr: String?): String {
    if (dateStr == null) return "N/A"
    return try {
        val parts = dateStr.take(10).split("-")
        if (parts.size == 3) "${parts[2]}/${parts[1]}/${parts[0]}" else dateStr.take(10)
    } catch (_: Exception) { dateStr.take(10) }
}
