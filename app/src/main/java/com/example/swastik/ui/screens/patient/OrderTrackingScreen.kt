package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DeliveryDining
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.components.MapMarkerData
import com.example.swastik.ui.viewmodel.OrderTrackingViewModel
import org.osmdroid.util.GeoPoint
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    trackingToken: String,
    destLat: Double,
    destLng: Double,
    agentName: String? = null,
    agentPhone: String? = null,
    onNavigateBack: () -> Unit,
    viewModel: OrderTrackingViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(trackingToken) {
        viewModel.startTracking(trackingToken, destLat, destLng)
    }

    val mapCenter = state.agentLocation ?: GeoPoint(destLat, destLng)
    
    val markers = buildList {
        // Destination Marker
        add(
            MapMarkerData(
                id = "dest",
                latitude = destLat,
                longitude = destLng,
                title = "Destination",
                snippet = "Your Location",
                markerColor = android.graphics.Color.parseColor("#4CAF50") // Green
            )
        )
        // Agent Marker
        if (state.agentLocation != null) {
            add(
                MapMarkerData(
                    id = "agent",
                    latitude = state.agentLocation!!.latitude,
                    longitude = state.agentLocation!!.longitude,
                    title = "Delivery Agent",
                    snippet = "Live Location",
                    markerColor = android.graphics.Color.parseColor("#673AB7"),
                    iconRes = com.example.swastik.R.drawable.ic_delivery_bike
                )
            )
        }
    }

    var mapRoute by remember { mutableStateOf<List<GeoPoint>>(emptyList()) }

    LaunchedEffect(state.agentLocation, destLat, destLng) {
        val agentPoint = state.agentLocation?.let { GeoPoint(it.latitude, it.longitude) }
        val destPoint = GeoPoint(destLat, destLng)
        if (agentPoint != null) {
            val route = com.example.swastik.utils.RoutingUtils.fetchRoute(agentPoint, destPoint)
            if (route.isNotEmpty()) {
                mapRoute = route
            } else {
                mapRoute = listOf(agentPoint, destPoint)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.track_delivery)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
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
                    showUserLocation = false
                )
                
                // Overlay for agent status
                if (state.agentLocation != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .align(Alignment.BottomCenter),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.DeliveryDining,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                                Column {
                                    Text(
                                        agentName ?: "Agent is on the way",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (agentPhone != null) {
                                        Text(
                                            "Phone: $agentPhone",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    } else {
                                        Text(
                                            stringResource(R.string.live_tracking_is_active),
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                
                                Spacer(modifier = Modifier.weight(1f))
                                
                                if (agentPhone != null) {
                                    val context = androidx.compose.ui.platform.LocalContext.current
                                    IconButton(
                                        onClick = {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_DIAL).apply {
                                                data = android.net.Uri.parse("tel:$agentPhone")
                                            }
                                            context.startActivity(intent)
                                        },
                                        modifier = Modifier
                                            .size(48.dp)
                                            .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(12.dp))
                                    ) {
                                        Icon(
                                            androidx.compose.material.icons.Icons.Default.Phone,
                                            contentDescription = "Call Agent",
                                            tint = MaterialTheme.colorScheme.onSecondaryContainer
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                    Card(
                        modifier = Modifier
                            .padding(16.dp)
                            .align(Alignment.TopCenter),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
                        )
                    ) {
                        Text(
                            stringResource(R.string.waiting_for_agent_location),
                            modifier = Modifier.padding(16.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}
