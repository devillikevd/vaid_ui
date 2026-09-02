package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import androidx.compose.foundation.lazy.grid.items
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary

import com.example.swastik.ui.components.MedicineListShimmer
import com.example.swastik.ui.screens.patient.medicine.getMedicineEmoji
import com.example.swastik.data.model.PatientProfile

/**
 * Medicine Tab Content — Global Catalogue Only
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
    var isGridView by remember { mutableStateOf(true) }
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
            "all" to Icons.Default.GridView,
            "general" to Icons.Default.Medication,
            "general medicine" to Icons.Default.Medication,
            "antibiotic" to Icons.Default.Biotech,
            "antibiotics" to Icons.Default.Biotech,
            "painkiller" to Icons.Default.Healing,
            "pain relief" to Icons.Default.Healing,
            "vitamin" to Icons.Default.Spa,
            "vitamins" to Icons.Default.Spa,
            "cardiac" to Icons.Default.FavoriteBorder,
            "diabetes" to Icons.Default.Bloodtype,
            "skin" to Icons.Default.Face,
            "skin care" to Icons.Default.Face,
            "respiratory" to Icons.Default.Air,
            "digestive" to Icons.Default.Restaurant,
            "ayurvedic" to Icons.Default.Eco,
            "recovery" to Icons.Default.LocalHospital,
            "device" to Icons.Default.MedicalServices,
            "devices" to Icons.Default.MedicalServices,
            "first aid" to Icons.Default.Healing,
            "baby care" to Icons.Default.ChildCare,
            "personal care" to Icons.Default.Spa,
            "eye care" to Icons.Default.Visibility,
            "dental" to Icons.Default.Mood,
            "immunity" to Icons.Default.Shield,
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

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top section: Title + Cart + Search
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(elevation = 4.dp, shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
                    .background(colorScheme.surface, RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
                    .padding(top = 16.dp, bottom = 20.dp)
            ) {
                // Title + Cart badge
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.medicine_finder),
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = colorScheme.onSurface
                        )
                        Text(
                            text = "Search & request from nearby pharmacies",
                            fontSize = 13.sp,
                            color = colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                    // Favorites Button
                    val favCount = favorites.size
                    if (favCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = SwastikPrimary) {
                                    Text("$favCount", color = Color.White, fontSize = 11.sp)
                                }
                            },
                            modifier = Modifier.padding(end = 12.dp)
                        ) {
                            IconButton(onClick = onNavigateToFavorites) {
                                Icon(
                                    Icons.Filled.Favorite,
                                    contentDescription = "Favorites",
                                    tint = Color.Red,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    } else {
                        IconButton(onClick = onNavigateToFavorites) {
                            Icon(
                                Icons.Outlined.FavoriteBorder,
                                contentDescription = "Favorites",
                                tint = colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                    if (cartState.totalItems > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = SwastikPrimary) {
                                    Text("${cartState.totalItems}", color = Color.White, fontSize = 11.sp)
                                }
                            }
                        ) {
                            IconButton(onClick = onNavigateToCart) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = SwastikPrimary,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Search bar
                MedicineSearchBar(
                    searchQuery = searchQuery,
                    onSearchChange = {
                        searchQuery = it
                        viewModel.searchMedicines(it)
                    }
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Main content
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
                            columns = GridCells.Fixed(if (isGridView) 2 else 1),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(
                                start = 12.dp,
                                end = 12.dp,
                                top = 8.dp,
                                bottom = if (cartState.totalItems > 0) 84.dp else 24.dp
                            ),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Hero Promo Banner (full width span)
                            if (searchQuery.isBlank() && state.selectedCategory == null) {
                                item(span = { GridItemSpan(if (isGridView) 2 else 1) }) {
                                    HeroPromoCard(onClick = { viewModel.setCategoryByName("vitamin") })
                                }
                            }

                            // Nearby pharmacies strip (full width span)
                            if (!isSearchActive && nearbyPharmacies.isNotEmpty()) {
                                item(span = { GridItemSpan(if (isGridView) 2 else 1) }) {
                                    NearbyPharmaciesSection(
                                        pharmacies = nearbyPharmacies,
                                        onPharmacyClick = onPharmacyClick
                                    )
                                }
                            }

                            // Category Horizontal Carousel (full width span)
                            item(span = { GridItemSpan(if (isGridView) 2 else 1) }) {
                                if (backendCategories.isNotEmpty()) {
                                    Surface(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(bottom = 4.dp),
                                        shape = RoundedCornerShape(16.dp),
                                        color = Color.White,
                                        shadowElevation = 2.dp
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 14.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "Order by Category",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 17.sp,
                                                    color = colorScheme.onSurface
                                                )
                                                if (state.selectedCategory != null) {
                                                    Text(
                                                        text = "Clear filter ✕",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = SwastikPrimary,
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .clickable { viewModel.setCategoryByName(null) }
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }

                                            LazyRow(
                                                modifier = Modifier.fillMaxWidth(),
                                                contentPadding = PaddingValues(horizontal = 16.dp),
                                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                                            ) {
                                                item {
                                                    CategoryChip(
                                                        label = "All",
                                                        icon = Icons.Default.GridView,
                                                        isSelected = state.selectedCategory == null,
                                                        onClick = { viewModel.setCategoryByName(null) }
                                                    )
                                                }

                                                items(backendCategories) { catDto ->
                                                    val catName = catDto.name.lowercase()
                                                    val displayName = formatCategoryDisplayName(catName, catDto.displayName)
                                                    val isSelected = state.selectedCategory?.lowercase() == catName
                                                    CategoryChip(
                                                        label = displayName,
                                                        icon = categoryIconMap[catName] ?: Icons.Default.Medication,
                                                        isSelected = isSelected,
                                                        onClick = {
                                                            if (isSelected) {
                                                                viewModel.setCategoryByName(null)
                                                            } else {
                                                                viewModel.setCategoryByName(catName)
                                                            }
                                                        }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Section header
                            if (itemCount > 0) {
                                item(span = { GridItemSpan(if (isGridView) 2 else 1) }) {
                                    Column(modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)) {
                                        Text(
                                            text = if (isSearchActive) "Search Results" else "Most Frequently Ordered Medicines",
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
                            if (isSearchActive) {
                                val searchList = displayMedicines ?: emptyList()
                                items(
                                    items = searchList,
                                    key = { it.id }
                                ) { medicine ->
                                    val isInCart = cartState.items.any { it.medicine.id == medicine.id }
                                    val isFav = favorites.any { it.id == medicine.id }
                                    val toggleFav = { viewModel.toggleFavorite(medicine) }
                                    val cartQty = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0
                                    if (isGridView) {
                                        GlobalMedicineCard(
                                            medicine = medicine,
                                            isInCart = isInCart,
                                            cartQuantity = cartQty,
                                            isFavorite = isFav,
                                            onToggleFavorite = toggleFav,
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
                                    } else {
                                        GlobalMedicineListCard(
                                            medicine = medicine,
                                            isInCart = isInCart,
                                            cartQuantity = cartQty,
                                            isFavorite = isFav,
                                            onToggleFavorite = toggleFav,
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
                            } else {
                                items(
                                    count = pagedMedicines.itemCount,
                                    key = pagedMedicines.itemKey { it.id }
                                ) { index ->
                                    val medicine = pagedMedicines[index]
                                    if (medicine != null) {
                                        val isInCart = cartState.items.any { it.medicine.id == medicine.id }
                                        val isFav = favorites.any { it.id == medicine.id }
                                        val toggleFav = { viewModel.toggleFavorite(medicine) }
                                        val cartQty = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0
                                        if (isGridView) {
                                            GlobalMedicineCard(
                                                medicine = medicine,
                                                isInCart = isInCart,
                                                cartQuantity = cartQty,
                                                isFavorite = isFav,
                                                onToggleFavorite = toggleFav,
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
                                        } else {
                                            GlobalMedicineListCard(
                                                medicine = medicine,
                                                isInCart = isInCart,
                                                cartQuantity = cartQty,
                                                isFavorite = isFav,
                                                onToggleFavorite = toggleFav,
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
                                }
                            }

                            if (displayPaged?.loadState?.append is androidx.paging.LoadState.Loading) {
                                item(span = { GridItemSpan(if (isGridView) 2 else 1) }) {
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

                            item(span = { GridItemSpan(if (isGridView) 2 else 1) }) { Spacer(modifier = Modifier.height(16.dp)) }
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

private fun formatCategoryDisplayName(rawName: String, displayName: String?): String {
    if (!displayName.isNullOrBlank()) return displayName
    return rawName.split(" ", "_", "-")
        .filter { it.isNotBlank() }
        .joinToString(" ") { word ->
            word.lowercase().replaceFirstChar { it.uppercase() }
        }
}

@Composable
private fun CategoryChip(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme

    // Vibrant category background & icon palettes
    val bgColors = listOf(
        Color(0xFFFCE4EC), // Soft Pink
        Color(0xFFFFF3E0), // Soft Orange
        Color(0xFFFFF8E1), // Soft Warm Yellow
        Color(0xFFE8F5E9), // Soft Mint Green
        Color(0xFFE0F2F1), // Soft Teal
        Color(0xFFE3F2FD), // Soft Sky Blue
        Color(0xFFF3E5F5), // Soft Purple / Lavender
        Color(0xFFE0F7FA), // Soft Cyan
        Color(0xFFFBE9E7)  // Soft Coral
    )
    val iconColors = listOf(
        Color(0xFFE91E63), // Pink
        Color(0xFFF57C00), // Orange
        Color(0xFFFFA000), // Amber
        Color(0xFF2E7D32), // Green
        Color(0xFF00897B), // Teal
        Color(0xFF1976D2), // Blue
        Color(0xFF8E24AA), // Purple
        Color(0xFF0097A7), // Cyan
        Color(0xFFD84315)  // Coral
    )

    val isAll = label.equals("all", ignoreCase = true)
    val colorIndex = kotlin.math.abs(label.lowercase().trim().hashCode()) % bgColors.size
    val bgColor = if (isAll) Color(0xFFF1F5F9) else bgColors[colorIndex]
    val iconColor = if (isAll) Color(0xFF475569) else iconColors[colorIndex]

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(74.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(if (isSelected) SwastikPrimary else bgColor)
                .then(
                    if (isSelected) {
                        Modifier.shadow(elevation = 6.dp, shape = CircleShape)
                    } else {
                        Modifier.border(width = 1.dp, color = Color(0x15000000), shape = CircleShape)
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) Color.White else iconColor,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 11.5.sp,
            lineHeight = 14.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) SwastikPrimary else colorScheme.onSurface,
            textAlign = TextAlign.Center,
            maxLines = 2,
            minLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 2.dp)
        )
    }
}

@Composable
private fun MedicineSearchBar(
    searchQuery: String,
    onSearchChange: (String) -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchChange,
        placeholder = { Text(stringResource(R.string.search_for_medicines_1), color = colorScheme.onSurfaceVariant) },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null, tint = colorScheme.onSurfaceVariant)
        },
        trailingIcon = {
            if (searchQuery.isNotBlank()) {
                IconButton(onClick = { onSearchChange("") }) {
                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = colorScheme.onSurfaceVariant)
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedTextColor = colorScheme.onSurface,
            unfocusedBorderColor = colorScheme.outline.copy(alpha = 0.4f),
            focusedBorderColor = SwastikPrimary,
            unfocusedContainerColor = colorScheme.surfaceVariant.copy(alpha = 0.3f),
            focusedContainerColor = colorScheme.surface
        ),
        singleLine = true
    )
}

// ==================== NEW FEATURE COMPONENTS (kept from commit 003ab06) ====================

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
                            color = SwastikPrimary.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "24x7",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SwastikPrimary,
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

// ==================== MEDICINE CARDS (with campaign/discount support) ====================

private fun discountPercent(price: Float?, mrp: Float?): Int? {
    if (price == null || mrp == null) return null
    if (price <= 0f || mrp <= price) return null
    return ((mrp - price) / mrp * 100).toInt().coerceIn(1, 95)
}

/**
 * A premium 3-column grid medicine card.
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
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(0.5.dp, Color(0x18000000))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Image Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(105.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(6.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = getMedicineCategoryEmoji(medicine.safeCategoryName),
                            fontSize = 42.sp
                        )
                    }
                }

                // Discount badge
                if (discount != null) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp),
                        color = Color(0xFF2E7D32),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "$discount% OFF",
                            fontSize = 9.sp,
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }

                // Rx badge
                if (medicine.requiresPrescription) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(6.dp),
                        color = Color(0xFFE0F2F1),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Rx",
                            fontSize = 9.sp,
                            color = Color(0xFF00796B),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }

                // Heart icon
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.92f))
                        .clickable {
                            onToggleFavorite()
                            if (!isFavorite) {
                                Toast.makeText(context, "Added to favorites", Toast.LENGTH_SHORT).show()
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorite) Color.Red else colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Medicine Name
            Text(
                text = medicine.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 16.sp,
                modifier = Modifier.height(34.dp)
            )

            // Manufacturer
            Text(
                text = medicine.manufacturer?.takeIf { it.isNotBlank() } ?: "Generic",
                fontSize = 10.sp,
                color = colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 1.dp)
            )

            // Dosage / Generic
            if (!packLine.isNullOrBlank()) {
                Text(
                    text = packLine,
                    fontSize = 10.sp,
                    color = colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                Spacer(modifier = Modifier.height(13.dp))
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Price and Add Button row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f, fill = false)) {
                    if (currentPrice > 0) {
                        Text(
                            text = "₹${currentPrice.toInt()}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color(0xFF1B5E20)
                        )
                        if (strikePrice != null && strikePrice > currentPrice) {
                            Text(
                                text = "₹${strikePrice.toInt()}",
                                fontSize = 10.sp,
                                color = colorScheme.onSurfaceVariant,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                    } else {
                        Text("Request", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SwastikPrimary)
                    }
                }

                Spacer(modifier = Modifier.width(6.dp))

                // Robust Add Button / Stepper
                if (isInCart && cartQuantity > 0) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SwastikPrimary,
                        modifier = Modifier.height(30.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .clickable { onDecrement() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Remove,
                                    contentDescription = "Decrease",
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                            Text(
                                text = "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 6.dp)
                            )
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .clickable { onIncrement() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Increase",
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SwastikPrimary,
                        shadowElevation = 1.dp,
                        modifier = Modifier
                            .height(30.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onAddToCart() }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(horizontal = 10.dp)
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "ADD",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                                letterSpacing = 0.5.sp
                            )
                        }
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
                        text = getMedicineCategoryEmoji(medicine.safeCategoryName),
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

                    // Stepper / Add button
                    if (isInCart && cartQuantity > 0) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = SwastikPrimary,
                            modifier = Modifier.height(30.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier.padding(horizontal = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .clickable { onDecrement() },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Remove,
                                        contentDescription = "Decrease",
                                        tint = Color.White,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                                Text(
                                    text = "$cartQuantity",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp)
                                )
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .clickable { onIncrement() },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = "Increase",
                                        tint = Color.White,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = SwastikPrimary,
                            shadowElevation = 1.dp,
                            modifier = Modifier
                                .height(30.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onAddToCart() }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            ) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = "ADD",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// Helper function to get emoji based on category
private fun getMedicineCategoryEmoji(category: String?): String {
    return getMedicineEmoji(category)
}
