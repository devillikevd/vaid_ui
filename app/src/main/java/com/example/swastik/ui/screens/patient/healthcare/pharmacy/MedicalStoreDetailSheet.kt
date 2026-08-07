package com.example.swastik.ui.screens.patient.healthcare.pharmacy

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.ui.components.AddressCard
import com.example.swastik.ui.components.InfoCard as SharedInfoCard
import com.example.swastik.ui.screens.patient.healthcare.finder.QuickActionButton
import com.example.swastik.ui.screens.patient.healthcare.finder.StatusBadge
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper
import kotlinx.coroutines.delay

@Composable
internal fun MedicalStoreDetailSheet(
    facility: MedicalFacility,
    inventoryItems: List<PharmacyInventoryItemDto> = emptyList(),
    isInventoryLoading: Boolean = false,
    onInventorySearch: (String) -> Unit = {},
    onAddInventoryToCart: (PharmacyInventoryItemDto) -> Unit = {},
    cartItemCount: Int = 0,
    onViewCart: () -> Unit = {},
    onViewOrders: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDarkMode: Boolean,
    onOpenBookingFlow: (isPrescription: Boolean) -> Unit = {}
) {
    val storeContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) Color.Gray else Color.Gray
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFE2F0FC)

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f
    var inventorySearchQuery by remember { mutableStateOf("") }

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                        modifier = Modifier.size(80.dp).align(Alignment.Center)
                    )
                }
            }
        }

                item {
                    Column(
                        modifier = Modifier
                            .offset(y = (-24).dp)
                            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .fillMaxWidth()
                    ) {
                Spacer(modifier = Modifier.height(24.dp))
                Spacer(modifier = Modifier.height(24.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.LocalPharmacy,
                                        contentDescription = null,
                                        tint = Color(0xFF4CAF50),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = facility.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = stringResource(R.string.medical_store),
                                        fontSize = 14.sp,
                                        color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = Color(0xFFFFC107),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(" ${facility.rating}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Outlined.LocationOn,
                                        contentDescription = null,
                                        tint = Color(0xFF4CAF50),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }

                        val badges = buildList {
                            if (facility.isOpen) add(Triple(Icons.Default.CheckCircle, "Open Now", Color(0xFF4CAF50)))
                            if (facility.isEmergencyAvailable) add(Triple(Icons.Default.LocalHospital, "Emergency", Color(0xFFE53935)))
                        }
                        if (badges.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(badges.size) { index ->
                                    com.example.swastik.ui.screens.patient.healthcare.finder.FeatureBadge(
                                        icon = badges[index].first,
                                        text = badges[index].second,
                                        color = badges[index].third
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        QuickActionButton(
                            icon = Icons.Default.Call, label = "Call", color = Color(0xFF4CAF50),
                            modifier = Modifier.weight(1f),
                            onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(storeContext, facility.phone) }
                        )
                        QuickActionButton(
                            icon = Icons.Default.Directions, label = "Directions", color = Color(0xFF2196F3),
                            modifier = Modifier.weight(1f),
                            onClick = { NavigationHelper.openDirections(storeContext, facility.latitude, facility.longitude, facility.name) }
                        )
                        QuickActionButton(
                            icon = Icons.Default.Message,
                            label = "WhatsApp",
                            color = Color(0xFF25D366),
                            modifier = Modifier.weight(1f),
                            onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(storeContext, facility.phone) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SharedInfoCard(
                        icon = Icons.Outlined.AccessTime,
                        title = "Timings",
                        value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                        modifier = Modifier.weight(1f),
                        isDark = isDarkMode
                    )
                    SharedInfoCard(
                        icon = Icons.Outlined.Phone,
                        title = "Contact",
                        value = facility.phone.ifBlank { "N/A" },
                        modifier = Modifier.weight(1f),
                        isDark = isDarkMode
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                AddressCard(facility = facility, isDark = isDarkMode, onDirectionsClick = {
                    NavigationHelper.openDirections(storeContext, facility.latitude, facility.longitude, facility.name)
                })

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).clickable { onViewDetails() },
                    colors = CardDefaults.cardColors(containerColor = cardColor),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF2196F3))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(stringResource(R.string.details_about_pharmacy), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColor)
                        }
                        Icon(Icons.Default.ArrowForwardIos, contentDescription = null, tint = subtextColor, modifier = Modifier.size(16.dp))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = stringResource(R.string.order_medicines),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = textColor
                    )

                    OutlinedTextField(
                            value = inventorySearchQuery,
                            onValueChange = { query ->
                                inventorySearchQuery = query
                                onInventorySearch(query)
                            },
                            placeholder = { Text(stringResource(R.string.search_medicines)) },
                            leadingIcon = {
                                Icon(Icons.Default.Search, contentDescription = null, tint = SwastikPrimary)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = SwastikPrimary,
                                unfocusedBorderColor = if (isDarkMode) Color(0xFF334155) else Color(0xFFE2E8F0)
                            )
                        )

                        when {
                            isInventoryLoading -> {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(140.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = SwastikPrimary)
                                }
                            }
                            inventoryItems.isEmpty() -> {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(120.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = stringResource(R.string.no_medicines_found),
                                        color = subtextColor,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                            else -> {
                                inventoryItems.forEach { item ->
                                    PharmacyInventoryCard(
                                        item = item,
                                        isDarkMode = isDarkMode,
                                        onAddToCart = { onAddInventoryToCart(item) }
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }

                        if (cartItemCount > 0) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SwastikPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "$cartItemCount item${if (cartItemCount == 1) "" else "s"}",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Text(
                                        text = stringResource(R.string.view_cart),
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(Color.White.copy(alpha = 0.2f))
                                            .clickable { onViewCart() }
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                    Button(
                        onClick = { onOpenBookingFlow(false) },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Medication, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.book_medicines), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                if (facility.phone.isNotBlank()) {
                                    NavigationHelper.openDialer(storeContext, facility.phone)
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = Brush.linearGradient(listOf(Color(0xFF4CAF50), Color(0xFF4CAF50)))
                            )
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null, tint = Color(0xFF4CAF50))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.call_store), color = Color(0xFF4CAF50))
                        }
                        Button(
                            onClick = {
                                NavigationHelper.openDirections(
                                    context = storeContext,
                                    destLat = facility.latitude,
                                    destLng = facility.longitude,
                                    label = facility.name
                                )
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                        ) {
                            Icon(Icons.Default.Directions, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.directions))
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun PharmacyInventoryCard(
    item: PharmacyInventoryItemDto,
    isDarkMode: Boolean,
    onAddToCart: () -> Unit = {}
) {
    val textColor = if (isDarkMode) Color.White else Color.Black
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFE2F0FC)
    var showAdded by remember { mutableStateOf(false) }

    LaunchedEffect(showAdded) {
        if (showAdded) {
            delay(1500)
            showAdded = false
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        if (item.inStock) Color(0xFF4CAF50).copy(alpha = 0.1f)
                        else Color(0xFFE53935).copy(alpha = 0.1f),
                        RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Medication,
                    contentDescription = null,
                    tint = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.displayName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = textColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (item.requiresPrescription == true) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFF9800).copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Text(stringResource(R.string.rx), fontSize = 9.sp, color = Color(0xFFFF9800), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (item.manufacturer != null) {
                    Text(item.manufacturer, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (item.category != null) {
                        Text(item.category, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.string_1), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(
                        "Stock: ${item.quantity ?: 0} ${item.unit ?: "units"}",
                        fontSize = 11.sp,
                        color = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    item.effectivePrice.let { if (item.price != null) "₹$it" else "Price unavailable" },
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = textColor
                )
                val strikePrice = when {
                    item.hasActiveCampaign -> item.price
                    else -> item.mrp
                }
                if (strikePrice != null && strikePrice > item.effectivePrice) {
                    Text(
                        if (item.hasActiveCampaign) "₹$strikePrice" else "MRP ₹$strikePrice",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textDecoration = TextDecoration.LineThrough
                    )
                }
                if (item.discountPercentage > 0) {
                    Text(
                        "${item.discountPercentage.toInt()}% OFF",
                        fontSize = 10.sp,
                        color = Color(0xFF2E7D32),
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                if (item.inStock) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (showAdded) Color(0xFF4CAF50) else SwastikPrimary
                            )
                            .clickable {
                                onAddToCart()
                                showAdded = true
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (showAdded) Icons.Default.Check else Icons.Default.AddShoppingCart,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                if (showAdded) "Added!" else "Add",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(stringResource(R.string.out_of_stock), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}
