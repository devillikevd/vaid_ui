package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.NearbyMedicineDto
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPurple

import com.example.swastik.ui.components.MedicineListShimmer

import com.example.swastik.data.model.PatientProfile

/**
 * Medicine Tab Content
 * Provides medicine search and filtering functionality via ViewModel + API
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
    val nearbyHighlights = viewModel.getFilteredNearbyMedicines().take(6)
    val showNearbyHighlights = searchQuery.isBlank() && nearbyHighlights.isNotEmpty()

    cartState.pharmacyConflict?.let { conflict ->
        AlertDialog(
            onDismissRequest = { viewModel.resolvePharmacyConflict(false) },
            title = { Text(stringResource(R.string.change_pharmacy_title), fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    stringResource(
                        R.string.pharmacy_conflict_message,
                        conflict.newPharmacyName ?: stringResource(R.string.pharmacy_conflict_fallback)
                    )
                )
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.resolvePharmacyConflict(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                ) {
                    Text(stringResource(R.string.clear_and_add))
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.resolvePharmacyConflict(false) }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colorScheme.background)
    ) {
        // Header
        MedicineFinderHeader(
            profile = profile,
            unreadCount = unreadNotificationsCount,
            cartItemCount = cartState.totalItems,
            onNotificationClick = onNotificationClick,
            onCartClick = onNavigateToCart
        )

        // Main Content Card
        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 8.dp),
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 24.dp)
            ) {
                Text(
                    text = stringResource(R.string.medicine_finder),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                MedicineSearchBar(
                    searchQuery = searchQuery,
                    onSearchChange = {
                        searchQuery = it
                        viewModel.searchMedicines(it)
                    }
                )

                Spacer(modifier = Modifier.height(16.dp))

                MedicineCategoryFilter(
                    selectedCategory = state.selectedCategory,
                    onCategorySelected = { viewModel.setCategory(it) }
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (state.isLoading) {
                    MedicineListShimmer()
                } else if (state.error != null) {
                    // Error state with retry
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
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
                                color = colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.loadPopularMedicines() },
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                } else if (filteredMedicines.isEmpty()) {
                    if (showNearbyHighlights) {
                        MedicineDiscoveryContent(
                            medicines = filteredMedicines,
                            nearbyHighlights = nearbyHighlights,
                            onMedicineClick = onMedicineClick,
                            onPharmacyClick = onPharmacyClick
                        )
                    } else {
                        EmptyMedicineState(
                            searchQuery = searchQuery,
                            selectedCategory = state.selectedCategory,
                            onClearFilters = {
                                searchQuery = ""
                                viewModel.setCategory(null)
                                viewModel.searchMedicines("")
                            },
                            onReloadCatalog = { viewModel.loadPopularMedicines() }
                        )
                    }
                } else {
                    MedicineDiscoveryContent(
                        medicines = filteredMedicines,
                        nearbyHighlights = if (showNearbyHighlights) nearbyHighlights else emptyList(),
                        onMedicineClick = onMedicineClick,
                        onPharmacyClick = onPharmacyClick
                    )
                }
            }
        }
    }
}

@Composable
private fun MedicineFinderHeader(
    profile: PatientProfile?,
    unreadCount: Int,
    cartItemCount: Int,
    onNotificationClick: () -> Unit = {},
    onCartClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(45.dp)
                .clip(CircleShape)
                .background(SwastikPurple.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                profile?.initials?.ifEmpty { "👤" } ?: "👤",
                fontSize = if (profile?.initials?.isNotEmpty() == true) 16.sp else 24.sp,
                fontWeight = FontWeight.Bold,
                color = SwastikPurple
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column {
            Text(
                text = profile?.name?.split(" ")?.firstOrNull()?.ifEmpty { "User" } ?: "User",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = colorScheme.onSurface
            )
            Text(
                text = "Patient",
                fontSize = 13.sp,
                color = colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        BadgedBox(
            badge = {
                if (cartItemCount > 0) {
                    Badge { Text(cartItemCount.toString()) }
                }
            }
        ) {
            IconButton(onClick = onCartClick) {
                Icon(
                    Icons.Outlined.ShoppingCart,
                    contentDescription = "Cart",
                    tint = colorScheme.onSurface
                )
            }
        }

        Box {
            IconButton(onClick = onNotificationClick) {
                Icon(
                    Icons.Outlined.Notifications,
                    contentDescription = "Notifications",
                    tint = colorScheme.onSurface
                )
            }
            if (unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(Color.Red, CircleShape)
                        .align(Alignment.TopEnd)
                        .offset(x = (-8).dp, y = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun MedicineSearchBar(
    searchQuery: String,
    onSearchChange: (String) -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val colorScheme = MaterialTheme.colorScheme
    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchChange,
        placeholder = { Text(stringResource(R.string.search_for_medicines_1), color = colorScheme.onSurfaceVariant) },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null, tint = colorScheme.onSurfaceVariant)
        },
        trailingIcon = {
            if (searchQuery.isNotEmpty()) {
                IconButton(onClick = { onSearchChange("") }) {
                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = colorScheme.onSurfaceVariant)
                }
            } else {
                IconButton(onClick = {
                    android.widget.Toast.makeText(context, context.getString(R.string.voice_search_unavailable), android.widget.Toast.LENGTH_SHORT).show()
                }) {
                    Icon(Icons.Default.Mic, contentDescription = "Voice Search", tint = SwastikPurple)
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .shadow(2.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = colorScheme.onSurface,
            unfocusedTextColor = colorScheme.onSurface,
            focusedPlaceholderColor = colorScheme.onSurfaceVariant,
            unfocusedPlaceholderColor = colorScheme.onSurfaceVariant,
            focusedLeadingIconColor = colorScheme.onSurfaceVariant,
            unfocusedLeadingIconColor = colorScheme.onSurfaceVariant,
            focusedTrailingIconColor = colorScheme.onSurfaceVariant,
            unfocusedTrailingIconColor = colorScheme.onSurfaceVariant,
            unfocusedBorderColor = colorScheme.outline.copy(alpha = 0.6f),
            focusedBorderColor = SwastikPurple,
            unfocusedContainerColor = colorScheme.surface,
            focusedContainerColor = colorScheme.surface
        ),
        singleLine = true
    )
}

@Composable
private fun MedicineCategoryFilter(
    selectedCategory: MedicineCategory?,
    onCategorySelected: (MedicineCategory?) -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedCategory == null,
                onClick = { onCategorySelected(null) },
                label = { Text(stringResource(R.string.filter_all), fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SwastikPurple,
                    selectedLabelColor = Color.White,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                )
            )
        }
        items(MedicineCategory.entries.toTypedArray()) { category ->
            FilterChip(
                selected = selectedCategory == category,
                onClick = { onCategorySelected(if (selectedCategory == category) null else category) },
                label = {
                    Text(
                        category.name.lowercase().replaceFirstChar { it.uppercase() },
                        fontSize = 12.sp
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SwastikPurple,
                    selectedLabelColor = Color.White,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

@Composable
private fun MedicineDiscoveryContent(
    medicines: List<Medicine>,
    nearbyHighlights: List<NearbyMedicineDto>,
    onMedicineClick: (String) -> Unit,
    onPharmacyClick: (String?, String?) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        if (nearbyHighlights.isNotEmpty()) {
            item {
                NearbyInventorySection(
                    nearbyHighlights = nearbyHighlights,
                    hasCatalogResults = medicines.isNotEmpty(),
                    onMedicineClick = onMedicineClick,
                    onPharmacyClick = onPharmacyClick
                )
            }
        }

        if (medicines.isNotEmpty()) {
            item {
                Text(
                    text = if (nearbyHighlights.isNotEmpty()) "Popular catalog" else "Popular medicines",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = if (nearbyHighlights.isNotEmpty()) 8.dp else 0.dp, bottom = 8.dp)
                )
            }
        }

        items(items = medicines, key = { it.id }) { medicine ->
            MedicineListItem(
                medicine = medicine,
                onClick = { onMedicineClick(medicine.id) },
                onPharmacyClick = { onPharmacyClick(medicine.nearbyPharmacyId, medicine.nearbyPharmacy) }
            )
        }
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun NearbyInventorySection(
    nearbyHighlights: List<NearbyMedicineDto>,
    hasCatalogResults: Boolean,
    onMedicineClick: (String) -> Unit,
    onPharmacyClick: (String?, String?) -> Unit
) {
    Column {
        Text(
            "Nearby pharmacies with stock",
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 8.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            if (hasCatalogResults) {
                "Live inventory from connected stores near the patient."
            } else {
                "Catalog results are light right now, but live pharmacy inventory is still available."
            },
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(nearbyHighlights) { nearbyMed ->
                NearbyMedicineCard(
                    nearbyMed = nearbyMed,
                    onClick = { onMedicineClick(nearbyMed.medicineId ?: nearbyMed.id) },
                    onPharmacyClick = {
                        onPharmacyClick(nearbyMed.pharmacyId, nearbyMed.pharmacyName)
                    }
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun NearbyMedicineCard(
    nearbyMed: NearbyMedicineDto,
    onClick: () -> Unit,
    onPharmacyClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier
            .width(252.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        border = BorderStroke(1.dp, colorScheme.outline.copy(alpha = 0.18f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = nearbyMed.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "₹${nearbyMed.price}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = SwastikPurple
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onPharmacyClick() }
            ) {
                Icon(
                    Icons.Outlined.Store,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = nearbyMed.pharmacyName ?: "Linked pharmacy",
                    fontSize = 13.sp,
                    color = colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Surface(
                color = Color(0xFFE8F5E9),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = "${nearbyMed.quantity} left in stock",
                    fontSize = 11.sp,
                    color = Color(0xFF2E7D32),
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

private fun MedicineCategory.displayLabel(): String =
    name.lowercase().replaceFirstChar { it.uppercase() }

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
        selectedCategory != null -> "No ${selectedCategory.displayLabel()} medicines found"
        else -> "Medicine catalog is still syncing"
    }
    val supportingText = when {
        searchQuery.isNotBlank() -> "Try a brand name, generic name, or reset the search."
        selectedCategory != null -> "Clear the filter or try a broader category."
        else -> "No medicines are available from connected pharmacies yet. Refresh to check again."
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
            Text(
                title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                supportingText,
                fontSize = 13.sp,
                color = colorScheme.onSurfaceVariant,
                lineHeight = 18.sp
            )
            Spacer(modifier = Modifier.height(16.dp))
            if (hasActiveFilters) {
                TextButton(onClick = onClearFilters) {
                    Text(stringResource(R.string.clear_filters_1), color = SwastikPurple)
                }
            }
            OutlinedButton(onClick = onReloadCatalog) {
                Icon(Icons.Default.Refresh, contentDescription = null, tint = SwastikPurple)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.refresh_catalog_1), color = SwastikPurple)
            }
        }
    }
}

@Composable
private fun MedicineListItem(
    medicine: Medicine,
    onClick: () -> Unit,
    onPharmacyClick: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = medicine.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (medicine.requiresPrescription) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = Color(0xFFFFF3E0),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "Rx",
                                fontSize = 10.sp,
                                color = Color(0xFFE67E22),
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
                Text(
                    text = medicine.price?.let { "₹$it" } ?: "Price pending",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface
                )
                Text(
                    text = medicine.genericName ?: medicine.manufacturer ?: "Medicine details syncing",
                    fontSize = 14.sp,
                    color = colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = if (medicine.inStock) "In stock" else "Out of stock",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (medicine.inStock) Color(0xFF4CAF50) else Color(0xFFE53935)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onPharmacyClick() }
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = SwastikPurple,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = medicine.nearbyPharmacy ?: "Find pharmacy",
                        fontSize = 13.sp,
                        color = SwastikPurple,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.35f))
    }
}
