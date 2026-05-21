package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.MedicineOrderDto
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.MedicineViewModel
import kotlinx.coroutines.flow.collectLatest
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    onBackClick: () -> Unit,
    viewModel: MedicineViewModel = hiltViewModel()
) {
    val historyState by viewModel.orderHistoryState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("All", "Pending", "Confirmed", "Processing", "Ready", "Dispatched", "Delivered", "Cancelled")
    val statusFilters = listOf(null, "pending", "confirmed", "processing", "ready", "dispatched", "delivered", "cancelled")
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.loadOrderHistory()
    }

    // Cancel success snackbar
    LaunchedEffect(historyState.cancelSuccess) {
        if (historyState.cancelSuccess) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearOrderHistoryError()
        }
    }

    // Real-time order status update notifications via Socket.IO
    LaunchedEffect(Unit) {
        viewModel.realtimeOrderEvent.collectLatest { update ->
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
                title = { Text(stringResource(R.string.my_orders), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadOrderHistory(statusFilters[selectedTab]) }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab filter row
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.primary,
                edgePadding = 8.dp
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = {
                            selectedTab = index
                            viewModel.loadOrderHistory(statusFilters[index])
                        },
                        text = { Text(title, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }

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
                historyState.orders.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.ShoppingBag, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(stringResource(R.string.no_orders_found), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(stringResource(R.string.your_medicine_orders_will_appear_here), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(historyState.orders, key = { it.id }) { order ->
                            OrderHistoryCard(
                                order = order,
                                onCancel = { viewModel.cancelOrder(order.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderHistoryCard(
    order: MedicineOrderDto,
    onCancel: () -> Unit
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

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(2.dp),
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
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Order #${order.id.take(8)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp
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
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Medication, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${order.items?.size ?: 0} item(s)", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                order.totalAmount?.let {
                    Text("₹${it.toInt()}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 15.sp)
                }
            }

            // Date
            order.createdAt?.let {
                Spacer(Modifier.height(4.dp))
                Text(formatDateShort(it), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
