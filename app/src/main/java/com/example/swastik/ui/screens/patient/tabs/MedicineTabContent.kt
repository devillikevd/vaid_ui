package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
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
    var isCategoriesExpanded by remember { mutableStateOf(false) }
    val colorScheme = MaterialTheme.colorScheme
    val filteredMedicines = viewModel.getFilteredMedicines()
    val pagedMedicines = viewModel.pagedMedicines.collectAsLazyPagingItems()

    LaunchedEffect(Unit) {
        pagedMedicines.refresh()
        viewModel.loadPopularMedicines(forceRefresh = true)
    }

    val categoryIcons = remember {
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

    val categoryLabels = remember {
        listOf("general", "antibiotic", "painkiller", "vitamin", "cardiac", "diabetes", "skin", "respiratory", "digestive", "ayurvedic")
    }

    // Pharmacy conflict dialog removed since carts are now completely decoupled

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
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SwastikPrimary)
                    }
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
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Category Expandable Grid (full width span)
                            item(span = { GridItemSpan(2) }) {
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
                                            .padding(horizontal = 12.dp, vertical = 16.dp)
                                            .animateContentSize()
                                    ) {
                                        Text(
                                            text = "Order by Category",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 17.sp,
                                            color = colorScheme.onSurface,
                                            modifier = Modifier.padding(bottom = 16.dp)
                                        )
                                    
                                    // Row 1 (first 5 categories)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        categoryLabels.take(5).forEach { cat ->
                                            val isSelected = state.selectedCategory?.name?.equals(cat, ignoreCase = true) == true
                                            CategoryChip(
                                                label = cat.replaceFirstChar { it.uppercase() },
                                                icon = categoryIcons[cat] ?: Icons.Default.Medication,
                                                isSelected = isSelected,
                                                onClick = {
                                                    if (isSelected) {
                                                        viewModel.setCategory(null)
                                                    } else {
                                                        val mc = try { MedicineCategory.valueOf(cat.uppercase()) } catch (_: Exception) { null }
                                                        viewModel.setCategory(mc)
                                                    }
                                                }
                                            )
                                        }
                                    }
                                    
                                    // Row 2 (remaining categories)
                                    if (isCategoriesExpanded) {
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            categoryLabels.drop(5).take(5).forEach { cat ->
                                                val isSelected = state.selectedCategory?.name?.equals(cat, ignoreCase = true) == true
                                                CategoryChip(
                                                    label = cat.replaceFirstChar { it.uppercase() },
                                                    icon = categoryIcons[cat] ?: Icons.Default.Medication,
                                                    isSelected = isSelected,
                                                    onClick = {
                                                        if (isSelected) {
                                                            viewModel.setCategory(null)
                                                        } else {
                                                            val mc = try { MedicineCategory.valueOf(cat.uppercase()) } catch (_: Exception) { null }
                                                            viewModel.setCategory(mc)
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    }
                                    
                                    // Explore More / Show Less Button
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { isCategoriesExpanded = !isCategoriesExpanded }
                                            .padding(top = 16.dp, bottom = 4.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = if (isCategoriesExpanded) "Show Less" else "Explore More",
                                            fontSize = 12.sp,
                                            color = SwastikPrimary,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Icon(
                                            imageVector = if (isCategoriesExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                            contentDescription = null,
                                            tint = SwastikPrimary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    } // End Row
                                } // End Column
                            } // End Surface
                        } // End item

                            // Section header
                            if (itemCount > 0) {
                                item(span = { GridItemSpan(2) }) {
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
                            items(
                                count = itemCount,
                                key = { index -> displayMedicines?.get(index)?.id ?: displayPaged?.get(index)?.id ?: index }
                            ) { index ->
                                val medicine = displayMedicines?.get(index) ?: displayPaged?.get(index)
                                if (medicine != null) {
                                    val isInCart = cartState.items.any { it.medicine.id == medicine.id }
                                    val isFav = viewModel.favoriteMedicines.collectAsState().value.any { it.id == medicine.id }
                                    val toggleFav = { viewModel.toggleFavorite(medicine) }
                                    if (isGridView) {
                                        GlobalMedicineCard(
                                            medicine = medicine,
                                            isInCart = isInCart,
                                            cartQuantity = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0,
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
                                            cartQuantity = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0,
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

                            if (displayPaged?.loadState?.append is androidx.paging.LoadState.Loading) {
                                item(span = { GridItemSpan(2) }) {
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

                            item(span = { GridItemSpan(2) }) { Spacer(modifier = Modifier.height(16.dp)) }
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

@Composable
private fun CategoryChip(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    
    // Generate vibrant colors based on the label
    val bgColors = listOf(
        Color(0xFFE8F5E9), // Light Green
        Color(0xFFE3F2FD), // Light Blue
        Color(0xFFFFF3E0), // Light Orange
        Color(0xFFFCE4EC), // Light Pink
        Color(0xFFF3E5F5), // Light Purple
        Color(0xFFE0F2F1), // Light Teal
        Color(0xFFFFF8E1), // Light Yellow
        Color(0xFFFFEBEE)  // Light Red
    )
    val iconColors = listOf(
        Color(0xFF2E7D32), // Dark Green
        Color(0xFF1565C0), // Dark Blue
        Color(0xFFEF6C00), // Dark Orange
        Color(0xFFC2185B), // Dark Pink
        Color(0xFF6A1B9A), // Dark Purple
        Color(0xFF00695C), // Dark Teal
        Color(0xFFF57F17), // Dark Yellow
        Color(0xFFC62828)  // Dark Red
    )
    
    val colorIndex = kotlin.math.abs(label.hashCode()) % bgColors.size
    val bgColor = bgColors[colorIndex]
    val iconColor = iconColors[colorIndex]
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable { onClick() }
            .padding(horizontal = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(if (isSelected) SwastikPrimary else bgColor)
                .then(
                    if (isSelected) Modifier.shadow(4.dp, CircleShape) else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = if (isSelected) Color.White else iconColor,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
            color = if (isSelected) SwastikPrimary else colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
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

@Composable
private fun EmptyMedicineState(
    searchQuery: String,
    selectedCategory: MedicineCategory?,
    onClearFilters: () -> Unit,
    onReloadCatalog: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val hasActiveFilters = searchQuery.isNotBlank() || selectedCategory != null
    val title = when {
        searchQuery.isNotBlank() -> "No matches for \"$searchQuery\""
        selectedCategory != null -> "No ${selectedCategory.name.lowercase().replaceFirstChar { it.uppercase() }} medicines found"
        else -> "Medicine catalog is still syncing"
    }
    val supportingText = when {
        searchQuery.isNotBlank() -> "Try a brand name, generic name, or reset the search."
        selectedCategory != null -> "Clear the filter or try a broader category."
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

/**
 * A premium 2-column grid medicine card.
 * Displays image from backend (or category-based fallback), name, manufacturer, price, and inline cart stepper.
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
    val isAvailable = true
    val alpha = if (isAvailable) 1f else 0.5f
    val context = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Image Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(110.dp)
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .alpha(alpha),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = getMedicineCategoryEmoji(medicine.category.name),
                            fontSize = 48.sp,
                            modifier = Modifier.alpha(alpha)
                        )
                    }
                }

                // Discount Tag (Top Left)
                val currentPrice = medicine.price?.toDouble() ?: 0.0
                val mrpPrice = currentPrice * 1.12
                if (currentPrice > 0) {
                    val discountPercent = ((mrpPrice - currentPrice) / mrpPrice * 100).toInt()
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .offset(x = (-12).dp, y = (-12).dp)
                            .background(SwastikPrimary, shape = RoundedCornerShape(topStart = 12.dp, bottomEnd = 12.dp))
                            .padding(horizontal = 6.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "$discountPercent%\nOFF",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            lineHeight = 11.sp
                        )
                    }
                }

                // Heart icon
                IconButton(
                    onClick = { 
                        onToggleFavorite()
                        if (!isFavorite) {
                            Toast.makeText(context, "Added to favorites. View fav medicines", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(32.dp)
                        .background(Color.White.copy(alpha = 0.9f), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorite) Color.Red else colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
                
                // Rx Badge at bottom center
                if (medicine.requiresPrescription) {
                    Text(
                        text = "Rx",
                        fontSize = 12.sp,
                        color = Color(0xFF00897B),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.BottomCenter)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Medicine Name
            Text(
                text = medicine.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 16.sp,
                modifier = Modifier.defaultMinSize(minHeight = 32.dp)
            )

            Text(
                text = medicine.manufacturer ?: medicine.genericName ?: "Unknown",
                fontSize = 11.sp,
                color = colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Price and Add Button row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    val currentPrice = medicine.price?.toDouble() ?: 0.0
                    val mrpPrice = currentPrice * 1.12
                    
                    if (currentPrice > 0) {
                        Text(
                            text = "₹${currentPrice.toInt()}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color.Black
                        )
                        Text(
                            text = "₹${mrpPrice.toInt()}",
                            fontSize = 11.sp,
                            color = Color.Gray,
                            textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                        )
                    } else {
                        Text("Request", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                // Green Add Button
                val buttonModifier = Modifier.height(30.dp).width(75.dp)
                if (isInCart && cartQuantity > 0) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = SwastikPrimary,
                        modifier = buttonModifier
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        ) {
                            IconButton(onClick = onDecrement, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                            Text(
                                "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 13.sp
                            )
                            IconButton(onClick = onIncrement, modifier = Modifier.size(24.dp), enabled = isAvailable) {
                                Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                } else {
                    Button(
                        onClick = onAddToCart,
                        modifier = buttonModifier,
                        shape = RoundedCornerShape(50),
                        enabled = isAvailable,
                        contentPadding = PaddingValues(0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SwastikPrimary,
                            contentColor = Color.White
                        )
                    ) {
                        Text("Add", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
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
    val isAvailable = true
    val alpha = if (isAvailable) 1f else 0.5f
    val context = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Image Box
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .alpha(alpha),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text(
                        text = getMedicineCategoryEmoji(medicine.category.name),
                        fontSize = 36.sp,
                        modifier = Modifier.alpha(alpha)
                    )
                }

                // Rx Badge
                if (medicine.requiresPrescription) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(4.dp),
                        color = colorScheme.errorContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Rx",
                            fontSize = 8.sp,
                            color = colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Details section
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = medicine.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { 
                            onToggleFavorite()
                            if (!isFavorite) {
                                Toast.makeText(context, "Added to favorites. View fav medicines", Toast.LENGTH_SHORT).show()
                            }
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = "Favorite",
                            tint = if (isFavorite) Color.Red else colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Text(
                    text = medicine.manufacturer ?: medicine.genericName ?: "Unknown",
                    fontSize = 12.sp,
                    color = colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Genuine tag
                Surface(
                    color = SwastikPrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Genuine",
                            tint = SwastikPrimary,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Genuine Medicine",
                            fontSize = 9.sp,
                            color = SwastikPrimary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        val currentPrice = medicine.price?.toDouble() ?: 0.0
                        val mrpPrice = currentPrice * 1.12
                        val discount = mrpPrice - currentPrice

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = SwastikPrimary,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (currentPrice > 0) "₹${currentPrice.toInt()}" else "Request",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            if (currentPrice > 0) {
                                Text(
                                    text = "₹${mrpPrice.toInt()}",
                                    fontSize = 11.sp,
                                    color = colorScheme.onSurfaceVariant,
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                                )
                            }
                        }
                        if (currentPrice > 0) {
                            Text(
                                text = "₹${discount.toInt()} OFF",
                                fontSize = 10.sp,
                                color = SwastikPrimary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }

                    val buttonModifier = Modifier.height(34.dp).width(80.dp)
                    
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
                                IconButton(onClick = onDecrement, modifier = Modifier.size(26.dp)) {
                                    Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(14.dp))
                                }
                                Text(
                                    "$cartQuantity",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 13.sp
                                )
                                IconButton(onClick = onIncrement, modifier = Modifier.size(26.dp), enabled = isAvailable) {
                                    Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    } else {
                        Button(
                            onClick = onAddToCart,
                            modifier = buttonModifier,
                            shape = RoundedCornerShape(50),
                            enabled = isAvailable,
                            contentPadding = PaddingValues(0.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SwastikPrimary,
                                contentColor = Color.White
                            )
                        ) {
                            Text(
                                text = if (isAvailable) "Add" else "N/A", 
                                fontSize = 13.sp, 
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
    return when (category.uppercase()) {
        "TABLET" -> "💊"
        "CAPSULE" -> "💊"
        "SYRUP" -> "🧴"
        "INJECTION" -> "💉"
        "OINTMENT" -> "🧴"
        "DROPS" -> "💧"
        "POWDER" -> "🥄"
        else -> "💊"
    }
}
