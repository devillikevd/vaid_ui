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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    viewModel: MedicineViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val cartState by viewModel.cartState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
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
                            columns = GridCells.Fixed(2),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Category Row (full width span)
                            item(span = { GridItemSpan(2) }) {
                                LazyRow(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    contentPadding = PaddingValues(horizontal = 4.dp)
                                ) {
                                    items(categoryLabels) { cat ->
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

                            // Section header
                            if (itemCount > 0) {
                                item(span = { GridItemSpan(2) }) {
                                    Column(modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)) {
                                        Text(
                                            text = if (isSearchActive) "Search Results" else "Browse & Request Medicines",
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
                                    GlobalMedicineCard(
                                        medicine = medicine,
                                        isInCart = isInCart,
                                        cartQuantity = cartState.items.find { it.medicine.id == medicine.id }?.quantity ?: 0,
                                        onClick = { onMedicineClick(medicine.id) },
                                        onAddToCart = {
                                            viewModel.addToCart(medicine, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onIncrement = {
                                            viewModel.addToCart(medicine, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onDecrement = {
                                            viewModel.removeFromCart(medicine.id)
                                        }
                                    )
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
                .background(
                    if (isSelected) SwastikPrimary.copy(alpha = 0.15f)
                    else colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = if (isSelected) SwastikPrimary else colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = if (isSelected) SwastikPrimary else colorScheme.onSurfaceVariant,
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
private fun GlobalMedicineCard(
    medicine: Medicine,
    isInCart: Boolean,
    cartQuantity: Int,
    onClick: () -> Unit,
    onAddToCart: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Image / Icon section
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SwastikPrimary.copy(alpha = 0.06f)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    // Fallback: category-based emoji
                    Text(
                        text = getMedicineCategoryEmoji(medicine.category.name),
                        fontSize = 40.sp
                    )
                }

                // Rx badge
                if (medicine.requiresPrescription) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp),
                        color = colorScheme.tertiaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Rx",
                            fontSize = 9.sp,
                            color = colorScheme.onTertiaryContainer,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Medicine name
            Text(
                text = medicine.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 18.sp
            )

            // Manufacturer
            Text(
                text = medicine.manufacturer ?: medicine.genericName ?: "",
                fontSize = 12.sp,
                color = colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Price + Cart action
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = medicine.price?.let { "₹${it.toInt()}" } ?: "On request",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = SwastikPrimary
                )

                if (isInCart && cartQuantity > 0) {
                    // Inline stepper
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = SwastikPrimary,
                        modifier = Modifier.height(32.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        ) {
                            IconButton(
                                onClick = onDecrement,
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                            Text(
                                "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 6.dp)
                            )
                            IconButton(
                                onClick = onIncrement,
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Increase", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                } else {
                    // Add button
                    FilledTonalButton(
                        onClick = onAddToCart,
                        modifier = Modifier.height(32.dp),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = SwastikPrimary.copy(alpha = 0.12f),
                            contentColor = SwastikPrimary
                        )
                    ) {
                        Text("ADD", fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
