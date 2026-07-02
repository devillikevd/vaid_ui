package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.LoadState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Intent
import android.net.Uri
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.MedicineOrderDto
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.MedicineViewModel
import kotlinx.coroutines.flow.collectLatest
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.components.MapMarkerData
import org.osmdroid.util.GeoPoint
import com.example.swastik.ui.viewmodel.OrderTrackingViewModel
import androidx.compose.foundation.shape.CircleShape
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    onBackClick: () -> Unit,
    onNavigateToTracking: (String, Double, Double, String?, String?) -> Unit = { _, _, _, _, _ -> },
    viewModel: MedicineViewModel = hiltViewModel(),
    trackingVm: OrderTrackingViewModel = hiltViewModel()
) {
    val historyState by viewModel.orderHistoryState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val pagedOrders = viewModel.getPagedOrders().collectAsLazyPagingItems()
    
    // Only show active tracking map if an agent is actually assigned and tracking
    val activeOrder = historyState.orders.firstOrNull { it.status in listOf("dispatched", "out_for_delivery") && !it.trackingToken.isNullOrEmpty() }
    var showHistoryOnly by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadOrderHistory()
    }

    // Cancel success snackbar
    LaunchedEffect(historyState.cancelSuccess) {
        if (historyState.cancelSuccess) {
            pagedOrders.refresh()
            kotlinx.coroutines.delay(2000)
            viewModel.clearOrderHistoryError()
        }
    }

    // Real-time order status update notifications via Socket.IO
    LaunchedEffect(Unit) {
        viewModel.realtimeOrderEvent.collectLatest { update ->
            pagedOrders.refresh()
            val statusEmoji = when (update.status) {
                "confirmed" -> "🧾"
                "processing" -> "🔄"
                "ready" -> "📦"
                "dispatched" -> "🚚"
                "delivered" -> "✅"
                "cancelled" -> "❌"
                else -> "📦"
            }
            snackbarHostState.showSnackbar(
                message = "$statusEmoji Order updated: ${update.status.replaceFirstChar { it.uppercase() }}",
                duration = SnackbarDuration.Short
            )
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        topBar = {
            TopAppBar(
                title = { Text(if (showHistoryOnly) stringResource(R.string.order_history) else "Medicine Orders", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { 
                        viewModel.loadOrderHistory() 
                        pagedOrders.refresh()
                    }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
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
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.secondary)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.order_cancelled_successfully), color = MaterialTheme.colorScheme.onSecondaryContainer, fontWeight = FontWeight.Medium)
                    }
                }
            }

            // Error banner
            historyState.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.width(8.dp))
                        Text(error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
                        TextButton(onClick = { viewModel.clearOrderHistoryError() }) {
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
                activeOrder != null && !showHistoryOnly -> {
                    // Swiggy-style active order tracking
                    ActiveOrderTrackingView(
                        order = activeOrder,
                        onViewHistory = { showHistoryOnly = true },
                        onNavigateToTracking = onNavigateToTracking,
                        trackingVm = trackingVm
                    )
                }
                historyState.orders.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.ShoppingBag, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(stringResource(R.string.no_orders_found), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(stringResource(R.string.your_medicine_orders_will_appear_here), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                            
                            if (activeOrder != null) {
                                Spacer(Modifier.height(16.dp))
                                Button(onClick = { showHistoryOnly = false }) {
                                    Text(stringResource(R.string.back_to_active_order))
                                }
                            }
                        }
                    }
                }
                else -> {
                    Column {
                        if (activeOrder != null) {
                            Button(
                                onClick = { showHistoryOnly = false },
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
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
                            items(count = pagedOrders.itemCount, key = { pagedOrders[it]?.id ?: it }) { index ->
                                val order = pagedOrders[index]
                                if (order != null) {
                                    OrderHistoryCard(
                                        order = order,
                                        onCancel = { viewModel.cancelOrder(order.id) },
                                        onTrack = {
                                            if (!order.trackingToken.isNullOrEmpty()) {
                                                onNavigateToTracking(
                                                    order.trackingToken,
                                                    0.0,
                                                    0.0,
                                                    order.deliveryAgent?.name,
                                                    order.deliveryAgent?.phone
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                            
                            if (pagedOrders.loadState.append is LoadState.Loading) {
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
private fun ActiveOrderTrackingView(
    order: MedicineOrderDto,
    onViewHistory: () -> Unit,
    onNavigateToTracking: (String, Double, Double, String?, String?) -> Unit,
    trackingVm: OrderTrackingViewModel
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val trackingState by trackingVm.state.collectAsState()
    
    var destLat by remember { mutableStateOf(0.0) }
    var destLng by remember { mutableStateOf(0.0) }
    var hasDestination by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val fusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    destLat = location.latitude
                    destLng = location.longitude
                    hasDestination = true
                } else {
                    destLat = 20.5937
                    destLng = 78.9629
                    hasDestination = true
                }
            }.addOnFailureListener {
                destLat = 20.5937
                destLng = 78.9629
                hasDestination = true
            }
        } catch (e: SecurityException) {
            destLat = 20.5937
            destLng = 78.9629
            hasDestination = true
        }
    }

    LaunchedEffect(order.trackingToken, hasDestination) {
        if (!order.trackingToken.isNullOrEmpty() && hasDestination) {
            trackingVm.startTracking(order.trackingToken, destLat, destLng)
        }
    }

    val isWaitingForAgent = trackingState.agentLocation == null

    val mapCenter = if (isWaitingForAgent) {
        GeoPoint(if (hasDestination) destLat else 20.5937, if (hasDestination) destLng else 78.9629)
    } else {
        GeoPoint(
            (destLat + trackingState.agentLocation!!.latitude) / 2.0,
            (destLng + trackingState.agentLocation!!.longitude) / 2.0
        )
    }
    
    val markers = buildList {
        // Pharmacy origin marker (blue)
        val pharmLat = order.pharmacy?.latitude
        val pharmLng = order.pharmacy?.longitude
        if (pharmLat != null && pharmLng != null && pharmLat != 0.0 && pharmLng != 0.0) {
            add(
                MapMarkerData(
                    id = "pharmacy",
                    latitude = pharmLat,
                    longitude = pharmLng,
                    title = order.pharmacy?.name ?: "Pharmacy",
                    snippet = "Order Origin",
                    markerColor = android.graphics.Color.parseColor("#1976D2")
                )
            )
        }
        // Patient destination marker (green)
        if (hasDestination) {
            add(
                MapMarkerData(
                    id = "dest",
                    latitude = destLat,
                    longitude = destLng,
                    title = "Delivery Location",
                    snippet = "Your Location",
                    markerColor = android.graphics.Color.parseColor("#4CAF50")
                )
            )
        }
        // Delivery agent marker (orange)
        if (trackingState.agentLocation != null) {
            add(
                MapMarkerData(
                    id = "agent",
                    latitude = trackingState.agentLocation!!.latitude,
                    longitude = trackingState.agentLocation!!.longitude,
                    title = "Delivery Agent",
                    snippet = "Live Location",
                    markerColor = android.graphics.Color.parseColor("#F59E0B"),
                    iconRes = com.example.swastik.R.drawable.ic_delivery_bike
                )
            )
        }
    }

    var mapRoute by remember { mutableStateOf<List<GeoPoint>>(emptyList()) }

    LaunchedEffect(trackingState.agentLocation, order.pharmacy?.latitude, order.pharmacy?.longitude, destLat, destLng) {
        val pharmLat = order.pharmacy?.latitude
        val pharmLng = order.pharmacy?.longitude
        val pharmPoint = if (pharmLat != null && pharmLng != null && pharmLat != 0.0 && pharmLng != 0.0) GeoPoint(pharmLat, pharmLng) else null
        val agentPoint = trackingState.agentLocation?.let { GeoPoint(it.latitude, it.longitude) }
        val destPoint = if (hasDestination) GeoPoint(destLat, destLng) else null

        val startPoint = agentPoint ?: pharmPoint
        if (startPoint != null && destPoint != null) {
            val route = com.example.swastik.utils.RoutingUtils.fetchRoute(startPoint, destPoint)
            if (route.isNotEmpty()) {
                mapRoute = route
            } else {
                mapRoute = listOfNotNull(pharmPoint, agentPoint, destPoint).distinct()
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Map Section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            if (isWaitingForAgent && hasDestination) {
                // Show map with destination + pharmacy, waiting for agent
                OsmMapView(
                    modifier = Modifier.fillMaxSize(),
                    center = mapCenter,
                    zoom = 15.0,
                    markers = markers,
                    route = emptyList(),
                    showUserLocation = false
                )
            } else if (!isWaitingForAgent && hasDestination) {
                // Show live tracking map with full route
                OsmMapView(
                    modifier = Modifier.fillMaxSize(),
                    center = mapCenter,
                    zoom = 15.0,
                    markers = markers,
                    route = mapRoute,
                    showUserLocation = false
                )
            } else {
                // Loading state
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SwastikPrimary)
                }
            }
            
            // Floating pill for status
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
                        text = if (isWaitingForAgent) "Locating Agent..." else "Agent on the way",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
        
        // Order Status Details bottom sheet style
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
                        Icon(Icons.Default.DeliveryDining, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Order ${order.status.replaceFirstChar { it.uppercase() }}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = order.pharmacy?.name ?: "Pharmacy",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                    }
                    if (!order.trackingToken.isNullOrEmpty() && order.status in listOf("dispatched", "out_for_delivery")) {
                        IconButton(
                            onClick = { onNavigateToTracking(order.trackingToken, destLat, destLng, order.deliveryAgent?.name, order.deliveryAgent?.phone) },
                            modifier = Modifier.background(MaterialTheme.colorScheme.secondaryContainer, CircleShape)
                        ) {
                            Icon(Icons.Default.Fullscreen, contentDescription = "Full map", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                        }
                    }
                }
                
                order.deliveryAgent?.let { agent ->
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
                                Text(stringResource(R.string.delivery_agent), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
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
private fun OrderHistoryCard(
    order: MedicineOrderDto,
    onCancel: () -> Unit,
    onTrack: () -> Unit = {}
) {
    var expanded by remember { mutableStateOf(false) }
    val statusColor = when (order.status) {
        "pending" -> MaterialTheme.colorScheme.tertiary
        "confirmed" -> MaterialTheme.colorScheme.primary
        "processing" -> MaterialTheme.colorScheme.secondary
        "ready" -> MaterialTheme.colorScheme.tertiary
        "dispatched" -> MaterialTheme.colorScheme.secondary
        "delivered" -> MaterialTheme.colorScheme.primary
        "cancelled" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
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
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        order.pharmacy?.name ?: "Pharmacy",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = textColorPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Order #${order.id.take(8)}",
                        color = textColorSecondary,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                // Status badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        order.status.replaceFirstChar { it.uppercase() },
                        color = statusColor,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // Summary row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Medication, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${order.items?.size ?: 0} item(s)", fontSize = 13.sp, color = textColorSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.width(8.dp))
                order.totalAmount?.let {
                    Text("₹${it.toInt()}", fontWeight = FontWeight.Bold, color = textColorPrimary, fontSize = 15.sp, maxLines = 1)
                }
            }

            // Date
            order.createdAt?.let {
                Spacer(Modifier.height(4.dp))
                Text(formatDateShort(it), fontSize = 12.sp, color = textColorSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }

            // Expanded details
            AnimatedVisibility(visible = expanded) {
                Column(Modifier.padding(top = 12.dp)) {
                    HorizontalDivider()
                    Spacer(Modifier.height(8.dp))

                    // Items
                    Text(stringResource(R.string.items_1), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    order.items?.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "${item.name ?: "Medicine"} × ${item.quantity}",
                                fontSize = 13.sp,
                                modifier = Modifier.weight(1f)
                            )
                            item.subtotal?.let {
                                Text("₹${it.toInt()}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } ?: item.price?.let {
                                Text("₹${(it * item.quantity).toInt()}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    // Delivery address
                    order.deliveryAddress?.let { addr ->
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(addr, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    // Payment status
                    order.paymentStatus?.let { ps ->
                        Spacer(Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Payment, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Payment: ${ps.replaceFirstChar { it.uppercase() }}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    // Cancel button (only for pending/processing)
                    if (order.status in listOf("pending", "confirmed", "processing")) {
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = onCancel,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Cancel, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.cancel_order))
                        }
                    }

                    // Track Delivery button (for dispatched/out_for_delivery)
                    if (!order.trackingToken.isNullOrEmpty() && order.status in listOf("dispatched", "out_for_delivery")) {
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = onTrack,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.track_delivery))
                        }
                    }
                }
            }

            // Expand indicator
            Icon(
                if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                "Toggle details",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

private fun formatDateShort(dateStr: String): String {
    return try {
        val parts = dateStr.take(10).split("-")
        if (parts.size == 3) "${parts[2]}/${parts[1]}/${parts[0]}" else dateStr.take(10)
    } catch (_: Exception) { dateStr.take(10) }
}
