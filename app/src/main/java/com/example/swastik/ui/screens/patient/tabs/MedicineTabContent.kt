package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import android.widget.Toast
import androidx.compose.ui.platform.LocalContext
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.compose.collectAsLazyPagingItems
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary

import com.example.swastik.ui.components.MedicineListShimmer
import com.example.swastik.ui.screens.patient.medicine.getMedicineEmoji
import com.example.swastik.data.model.PatientProfile

private val HeaderTopColor = Color(0xFF7E22CE)
private val HeaderBottomColor = Color(0xFF4A148C)
private val HeaderBadgeColor = Color(0xFF4A148C)

/**
 * Medicine Tab Content — Global Catalogue Only (Plazza-style redesign)
 * Patient browses the global medicine catalogue,
 * adds to cart, and broadcasts a request to nearby pharmacies.
 */
@Composable
fun MedicineTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    onMedicineClick: (String) -> Unit = {},
    onPharmacyClick: (String?, String?) -> Unit = { _, _ -> },
    onNotificationClick: () -> Unit = {},
    onNavigateToCart: () -> Unit = {},
    onNavigateToFavorites: () -> Unit = {},
    viewModel: MedicineViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val cartState by viewModel.globalCartState.collectAsState()
    val favorites by viewModel.favoriteMedicines.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    val colorScheme = MaterialTheme.colorScheme
    val filteredMedicines = viewModel.getFilteredMedicines()
    val pagedMedicines = viewModel.pagedMedicines.collectAsLazyPagingItems()

    LaunchedEffect(Unit) {
        pagedMedicines.refresh()
        viewModel.loadPopularMedicines(forceRefresh = true)
    }

    val backendCategories = state.categories
    val categoryIconMap = remember {
        mapOf(
            "general" to Icons.Default.Medication,
            "antibiotic" to Icons.Default.Biotech,
            "painkiller" to Icons.Default.Healing,
            "vitamin" to Icons.Default.Spa,
            "cardiac" to Icons.Default.FavoriteBorder,
            "diabetes" to Icons.Default.Bloodtype,
            "skin" to Icons.Default.Face,
            "respiratory" to Icons.Default.Air,
            "digestive" to Icons.Default.Restaurant,
            "ayurvedic" to Icons.Default.Eco,
        )
    }

    // Group nearby medicines into per-pharmacy summaries (real inventory data)
    val nearbyPharmacies = remember(state.nearbyMedicines) {
        state.nearbyMedicines
            .groupBy { it.pharmacyId ?: "unknown" }
            .mapNotNull { (_, items) ->
                items.firstOrNull()?.let { first ->
                    PharmacySummary(
                        pharmacyId = first.pharmacyId,
                        name = first.pharmacyName ?: "Nearby Pharmacy",
                        inStockCount = items.count { it.inStock },
                        totalCount = items.size,
                        distanceText = first.distanceText
                            ?: first.distance?.let { String.format("%.1f km", it) },
                        is24Hours = first.pharmacyIs24Hours == true,
                        deliveryAvailable = first.pharmacyDeliveryAvailable == true
                    )
                }
            }
            .sortedByDescending { it.inStockCount }
            .take(6)
    }

    val deliveryLabel = remember(profile) {
        profile?.savedAddresses?.firstOrNull { it.isDefault }?.label
            ?: profile?.city?.takeIf { it.isNotBlank() }
            ?: profile?.location?.takeIf { it.isNotBlank() }
            ?: "Select Delivery Location"
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ===== HEADER (Plazza-style gradient) =====
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 4.dp,
                        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                    )
                    .background(
                        brush = Brush.verticalGradient(listOf(HeaderTopColor, HeaderBottomColor)),
                        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                    )
                    .padding(top = 12.dp, bottom = 14.dp)
            ) {
                // Row 1: Location pill + favorites + notifications + cart
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Location pill
                    Surface(
                        color = Color.White.copy(alpha = 0.16f),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clickable { /* navigate to saved addresses */ }
                                .padding(horizontal = 10.dp, vertical = 7.dp)
                        ) {
                            Icon(
                                Icons.Filled.LocationOn,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = deliveryLabel,
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Favorites
                    val favCount = favorites.size
                    if (favCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = Color.White, contentColor = HeaderBadgeColor) {
                                    Text("$favCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            },
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            IconButton(onClick = onNavigateToFavorites) {
                                Icon(
                                    Icons.Filled.Favorite,
                                    contentDescription = "Favorites",
                                    tint = Color(0xFFFF80AB),
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                    } else {
                        IconButton(
                            onClick = onNavigateToFavorites,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            Icon(
                                Icons.Outlined.FavoriteBorder,
                                contentDescription = "Favorites",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                    // Notifications
                    if (unreadNotificationsCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = Color.White, contentColor = HeaderBadgeColor) {
                                    Text(
                                        if (unreadNotificationsCount > 99) "99+" else "$unreadNotificationsCount",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            },
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            IconButton(onClick = onNotificationClick) {
                                Icon(
                                    Icons.Outlined.Notifications,
                                    contentDescription = "Notifications",
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                    } else {
                        IconButton(
                            onClick = onNotificationClick,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            Icon(
                                Icons.Outlined.Notifications,
                                contentDescription = "Notifications",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                    // Cart
                    if (cartState.totalItems > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = Color.White, contentColor = HeaderBadgeColor) {
                                    Text("${cartState.totalItems}", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            },
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            IconButton(onClick = onNavigateToCart) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    } else {
                        IconButton(
                            onClick = onNavigateToCart,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            Icon(
                                Icons.Outlined.ShoppingCart,
                                contentDescription = "Cart",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Search bar (white, on gradient)
                PlazzaSearchBar(
                    searchQuery = searchQuery,
                    onSearchChange = {
                        searchQuery = it
                        viewModel.searchMedicines(it)
                    }
                )

                // Horizontal category pills
                if (backendCategories.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(backendCategories.size) { index ->
                            val catDto = backendCategories[index]
                            val catName = catDto.name.lowercase()
                            val displayName = catDto.displayName ?: catName.replaceFirstChar { it.uppercase() }
                            val isSelected = state.selectedCategory?.lowercase() == catName
                            CategoryPillTab(
                                label = displayName,
                                icon = categoryIconMap[catName] ?: Icons.Default.Medication,
                                isSelected = isSelected,
                                onClick = { viewModel.setCategoryByName(catName) }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ===== MAIN CONTENT =====
            Box(modifier = Modifier.fillMaxSize()) {
                if (state.isLoading && pagedMedicines.itemCount == 0) {
                    MedicineListShimmer()
                } else if (!state.error.isNullOrBlank() && pagedMedicines.itemCount == 0) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.Warning,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = state.error ?: "Something went wrong",
                                fontSize = 14.sp,
                                color = colorScheme.onSurfaceVariant,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { pagedMedicines.refresh() },
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                } else {
                    val isSearchActive = searchQuery.isNotBlank() || state.selectedCategory != null
                    val displayMedicines = if (isSearchActive) filteredMedicines else null
                    val displayPaged = if (!isSearchActive) pagedMedicines else null
                    val itemCount = displayMedicines?.size ?: displayPaged?.itemCount ?: 0

                    if (itemCount == 0 && !state.isLoading) {
                        EmptyMedicineState(
                            searchQuery = searchQuery,
                            selectedCategory = state.selectedCategory,
                            onClearFilters = {
                                searchQuery = ""
                                viewModel.setCategory(null)
                                viewModel.searchMedicines("")
                            },
                            onReloadCatalog = { pagedMedicines.refresh() }
                        )
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Hero Promo Banner (full width span)
                            if (!isSearchActive) {
                                item(span = { GridItemSpan(3) }) {
                                    HeroPromoCard(onClick = { viewModel.setCategoryByName("vitamin") })
                                }
                            }

                            // Nearby pharmacies strip (full width span)
                            if (!isSearchActive && nearbyPharmacies.isNotEmpty()) {
                                item(span = { GridItemSpan(3) }) {
                                    NearbyPharmaciesSection(
                                        pharmacies = nearbyPharmacies,
                                        onPharmacyClick = onPharmacyClick
                                    )
                                }
                            }

                            // Section header
                            if (itemCount > 0) {
                                item(span = { GridItemSpan(3) }) {
                                    Column(modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)) {
                                        Text(
                                            text = if (isSearchActive) "Search Results" else "Most Frequently Ordered",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 17.sp,
                                            color = colorScheme.onSurface
                                        )
                                        Text(
                                            text = "$itemCount medicines available",
                                            fontSize = 13.sp,
                                            color = colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }

                            // Medicine grid cards
                            items(
                                count = itemCount,
                                key = { index -> displayMedicines?.get(index)?.id ?: displayPaged?.get(index)?.id ?: index }
                            ) { index ->
                                val medicine = displayMedicines?.get(index) ?: displayPaged?.get(index)
                                if (medicine != null) {
                                    val isInCart = cartState.items.any { it.medicine.id == medicine.id }
                                    val isFav = viewModel.favoriteMedicines.collectAsState().value.any { it.id == medicine.id }
                                    GlobalMedicineCard(
                                        medicine = medicine,
                                        isInCart = isInCart,
                                        cartQuantity = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0,
                                        isFavorite = isFav,
                                        onToggleFavorite = { viewModel.toggleFavorite(medicine) },
                                        onClick = { onMedicineClick(medicine.id) },
                                        onAddToCart = {
                                            viewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, medicine, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onIncrement = {
                                            viewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, medicine, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onDecrement = {
                                            viewModel.removeFromCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, medicine.id)
                                        }
                                    )
                                }
                            }

                            if (displayPaged?.loadState?.append is androidx.paging.LoadState.Loading) {
                                item(span = { GridItemSpan(3) }) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(color = SwastikPrimary)
                                    }
                                }
                            }

                            item(span = { GridItemSpan(3) }) { Spacer(modifier = Modifier.height(16.dp)) }
                        }
                    }
                }
            }
        }

        // Floating cart button when items in cart
        AnimatedVisibility(
            visible = cartState.totalItems > 0,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        ) {
            Button(
                onClick = onNavigateToCart,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp)
            ) {
                Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    "${cartState.totalItems} item${if (cartState.totalItems > 1) "s" else ""} • View Cart",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    "₹${cartState.totalPrice.toInt()}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
    }
}

private data class PharmacySummary(
    val pharmacyId: String?,
    val name: String,
    val inStockCount: Int,
    val totalCount: Int,
    val distanceText: String? = null,
    val is24Hours: Boolean = false,
    val deliveryAvailable: Boolean = false
)

// ==================== HEADER COMPONENTS ====================

@Composable
private fun PlazzaSearchBar(
    searchQuery: String,
    onSearchChange: (String) -> Unit
) {
    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchChange,
        placeholder = { Text(stringResource(R.string.search_for_medicines_1), color = Color(0xFF9E9E9E)) },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null, tint = HeaderBottomColor)
        },
        trailingIcon = {
            if (searchQuery.isNotBlank()) {
                IconButton(onClick = { onSearchChange("") }) {
                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = HeaderBottomColor)
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Color(0xFF1A1A1A),
            unfocusedTextColor = Color(0xFF1A1A1A),
            focusedBorderColor = Color.White,
            unfocusedBorderColor = Color.Transparent,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
            cursorColor = HeaderBottomColor
        ),
        singleLine = true
    )
}

@Composable
private fun CategoryPillTab(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val selectedBg = Color.White
    val unselectedBg = Color.White.copy(alpha = 0.16f)
    val textColor = if (isSelected) HeaderBottomColor else Color.White
    Surface(
        color = if (isSelected) selectedBg else unselectedBg,
        shape = RoundedCornerShape(20.dp),
        onClick = onClick
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = textColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = textColor,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun HeroPromoCard(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(listOf(Color(0xFFFF7043), Color(0xFFEC407A)))
                )
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "FLAT 20% OFF",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White.copy(alpha = 0.9f),
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Medicines at\nyour doorstep",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    lineHeight = 22.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Search from 1000+ verified medicines • 15 min delivery",
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.9f)
                )
            }
            Text("💊", fontSize = 48.sp)
        }
    }
}

@Composable
private fun NearbyPharmaciesSection(
    pharmacies: List<PharmacySummary>,
    onPharmacyClick: (String?, String?) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 2.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Order from nearby stores",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Pharmacies with live stock within 25 km",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Outlined.Store,
                contentDescription = null,
                tint = SwastikPrimary,
                modifier = Modifier.size(22.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(horizontal = 2.dp)
        ) {
            items(pharmacies.size) { index ->
                val pharmacy = pharmacies[index]
                NearbyPharmacyCard(
                    pharmacy = pharmacy,
                    onClick = {
                        onPharmacyClick(pharmacy.pharmacyId, pharmacy.name)
                    }
                )
            }
        }
    }
}

@Composable
private fun NearbyPharmacyCard(
    pharmacy: PharmacySummary,
    onClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .width(180.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .background(SwastikPrimary.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Store,
                        contentDescription = null,
                        tint = SwastikPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pharmacy.name,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Pharmacy",
                        fontSize = 10.sp,
                        color = colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "${pharmacy.inStockCount} medicine${if (pharmacy.inStockCount == 1) "" else "s"} in stock",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF2E7D32)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.LocationOn,
                    contentDescription = null,
                    tint = colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = pharmacy.distanceText ?: "Nearby",
                    fontSize = 10.sp,
                    color = colorScheme.onSurfaceVariant
                )
                if (pharmacy.is24Hours || pharmacy.deliveryAvailable) {
                    Spacer(modifier = Modifier.weight(1f))
                    if (pharmacy.is24Hours) {
                        Surface(
                            color = HeaderBottomColor.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "24x7",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = HeaderBottomColor,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    if (pharmacy.deliveryAvailable) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Surface(
                            color = SwastikPrimary.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Delivery",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SwastikPrimary,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Order directly or compare prices",
                fontSize = 10.sp,
                color = colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun EmptyMedicineState(
    searchQuery: String,
    selectedCategory: String?,
    onClearFilters: () -> Unit,
    onReloadCatalog: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val hasActiveFilters = searchQuery.isNotBlank() || !selectedCategory.isNullOrBlank()
    val title = when {
        searchQuery.isNotBlank() -> "No matches for \"$searchQuery\""
        !selectedCategory.isNullOrBlank() -> "No ${selectedCategory.replaceFirstChar { it.uppercase() }} medicines found"
        else -> "Medicine catalog is still syncing"
    }
    val supportingText = when {
        searchQuery.isNotBlank() -> "Try a brand name, generic name, or reset the search."
        !selectedCategory.isNullOrBlank() -> "Clear the filter or try a broader category."
        else -> "No medicines are available yet. Refresh to check again."
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Outlined.SearchOff,
                contentDescription = null,
                tint = colorScheme.onSurfaceVariant,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Medium, color = colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(8.dp))
            Text(supportingText, fontSize = 13.sp, color = colorScheme.onSurfaceVariant, lineHeight = 18.sp)
            Spacer(modifier = Modifier.height(16.dp))
            if (hasActiveFilters) {
                TextButton(onClick = onClearFilters) {
                    Text(stringResource(R.string.clear_filters_1), color = SwastikPrimary)
                }
            }
            OutlinedButton(onClick = onReloadCatalog) {
                Icon(Icons.Default.Refresh, contentDescription = null, tint = SwastikPrimary)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.refresh_catalog_1), color = SwastikPrimary)
            }
        }
    }
}

private fun discountPercent(price: Float?, mrp: Float?): Int? {
    if (price == null || mrp == null) return null
    if (price <= 0f || mrp <= price) return null
    return ((mrp - price) / mrp * 100).toInt().coerceIn(1, 95)
}

/**
 * A premium 3-column Plazza-style grid medicine card.
 * Displays image, name, manufacturer + pack, MRP with discount, and inline cart stepper.
 */
@Composable
fun GlobalMedicineCard(
    medicine: Medicine,
    isInCart: Boolean,
    cartQuantity: Int,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onClick: () -> Unit,
    onAddToCart: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val context = LocalContext.current
    val discount = medicine.discountPercentage.takeIf { it > 0 }
        ?: discountPercent(medicine.price, medicine.mrp)
    val currentPrice = medicine.effectivePrice.toDouble()
    val strikePrice = when {
        medicine.hasActiveCampaign -> (medicine.price ?: medicine.mrp ?: 0f).toDouble()
        else -> medicine.mrp?.toDouble()
    }
    val packLine = medicine.dosageForm
        ?.takeIf { it.isNotBlank() }
        ?: medicine.genericName

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            // Image Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(4.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = getMedicineCategoryEmoji(medicine.category?.name ?: "TABLET"),
                            fontSize = 36.sp
                        )
                    }
                }

                // Discount badge
                if (discount != null) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(4.dp),
                        color = Color(0xFF2E7D32),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "$discount% OFF",
                            fontSize = 8.sp,
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }

                // Rx badge
                if (medicine.requiresPrescription) {
                    Text(
                        text = "Rx",
                        fontSize = 9.sp,
                        color = Color(0xFF00897B),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.BottomCenter)
                    )
                }

                // Heart icon
                IconButton(
                    onClick = {
                        onToggleFavorite()
                        if (!isFavorite) {
                            Toast.makeText(context, "Added to favorites", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(2.dp)
                        .size(26.dp)
                        .background(Color.White.copy(alpha = 0.9f), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorite) Color.Red else colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(13.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Medicine Name
            Text(
                text = medicine.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 14.sp,
                modifier = Modifier.defaultMinSize(minHeight = 28.dp)
            )

            Text(
                text = medicine.manufacturer ?: "",
                fontSize = 9.sp,
                color = colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 1.dp)
            )

            if (!packLine.isNullOrBlank()) {
                Text(
                    text = packLine,
                    fontSize = 9.sp,
                    color = colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Price and Add Button row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    if (currentPrice > 0) {
                        Text(
                            text = "₹${currentPrice.toInt()}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp,
                            color = Color.Black
                        )
                        if (strikePrice != null && strikePrice > currentPrice) {
                            Text(
                                text = "₹${strikePrice.toInt()}",
                                fontSize = 9.sp,
                                color = colorScheme.onSurfaceVariant,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                    } else {
                        Text("Request", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }

                // Green Add Button
                val buttonModifier = Modifier.height(26.dp).width(60.dp)
                if (isInCart && cartQuantity > 0) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = SwastikPrimary,
                        modifier = buttonModifier
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            IconButton(onClick = onDecrement, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                            Text(
                                "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp
                            )
                            IconButton(onClick = onIncrement, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                } else {
                    Button(
                        onClick = onAddToCart,
                        modifier = buttonModifier,
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SwastikPrimary,
                            contentColor = Color.White
                        )
                    ) {
                        Text("Add", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        }
    }
}

@Composable
fun GlobalMedicineListCard(
    medicine: Medicine,
    isInCart: Boolean,
    cartQuantity: Int,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onClick: () -> Unit,
    onAddToCart: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val context = LocalContext.current
    val discount = medicine.discountPercentage.takeIf { it > 0 }
        ?: discountPercent(medicine.price, medicine.mrp)
    val packLine = medicine.dosageForm
        ?.takeIf { it.isNotBlank() }
        ?: medicine.genericName

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Image Box
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(6.dp)
                            .clip(RoundedCornerShape(6.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text(
                        text = getMedicineCategoryEmoji(medicine.category?.name ?: "TABLET"),
                        fontSize = 28.sp
                    )
                }

                // Rx Badge
                if (medicine.requiresPrescription) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(3.dp),
                        color = colorScheme.errorContainer,
                        shape = RoundedCornerShape(3.dp)
                    ) {
                        Text(
                            text = "Rx",
                            fontSize = 7.sp,
                            color = colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 3.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Details section
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = medicine.name,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                        lineHeight = 15.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(
                        onClick = {
                            onToggleFavorite()
                            if (!isFavorite) {
                                Toast.makeText(context, "Added to favorites", Toast.LENGTH_SHORT).show()
                            }
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = "Favorite",
                            tint = if (isFavorite) Color.Red else colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = medicine.manufacturer ?: "",
                        fontSize = 11.sp,
                        color = colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (!packLine.isNullOrBlank()) {
                        Text(
                            text = " • $packLine",
                            fontSize = 10.sp,
                            color = colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Genuine tag + discount
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = SwastikPrimary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(3.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Genuine",
                                tint = SwastikPrimary,
                                modifier = Modifier.size(9.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "Genuine",
                                fontSize = 8.sp,
                                color = SwastikPrimary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    if (discount != null) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            color = Color(0xFF2E7D32).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(3.dp)
                        ) {
                            Text(
                                text = "$discount% OFF",
                                fontSize = 8.sp,
                                color = Color(0xFF2E7D32),
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        val currentPrice = medicine.effectivePrice.toDouble()
                        val strikePrice = when {
                            medicine.hasActiveCampaign -> (medicine.price ?: medicine.mrp ?: 0f).toDouble()
                            else -> medicine.mrp?.toDouble()
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = SwastikPrimary,
                                shape = RoundedCornerShape(5.dp)
                            ) {
                                Text(
                                    text = if (currentPrice > 0) "₹${currentPrice.toInt()}" else "Request",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                            if (strikePrice != null && currentPrice > 0 && strikePrice > currentPrice) {
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "₹${strikePrice.toInt()}",
                                    fontSize = 10.sp,
                                    color = colorScheme.onSurfaceVariant,
                                    textDecoration = TextDecoration.LineThrough
                                )
                            }
                        }
                    }

                    val buttonModifier = Modifier.height(28.dp).width(64.dp)

                    if (isInCart && cartQuantity > 0) {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = SwastikPrimary,
                            modifier = buttonModifier
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.padding(horizontal = 2.dp)
                            ) {
                                IconButton(onClick = onDecrement, modifier = Modifier.size(22.dp)) {
                                    Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(12.dp))
                                }
                                Text(
                                    "$cartQuantity",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 11.sp
                                )
                                IconButton(onClick = onIncrement, modifier = Modifier.size(22.dp)) {
                                    Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(12.dp))
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = onAddToCart,
                            modifier = buttonModifier,
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(0.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SwastikPrimary,
                                contentColor = Color.White
                            )
                        ) {
                            Text(
                                text = "Add",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// Helper function to get emoji based on category
private fun getMedicineCategoryEmoji(category: String): String {
    return getMedicineEmoji(category)
}
