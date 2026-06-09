package com.example.swastik.ui.screens.patient.medicine

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import com.example.swastik.ui.screens.patient.components.shimmerEffect
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.remote.dto.NearbyMedicineDto
import com.example.swastik.data.model.MedicineCategory
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import java.util.Locale

/**
 * Main Medicine Screen accessible from bottom navigation
 * Shows medicine finder with location-based pharmacy availability via ViewModel + API
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineScreen(
    userName: String = "User",
    onBackClick: () -> Unit = {},
    onMedicineClick: (String) -> Unit = {},
    onPharmacyClick: (String?, String?) -> Unit = { _, _ -> },
    onNavigateToHome: () -> Unit = {},
    onNavigateToRecords: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    onNavigateToCart: () -> Unit = {},
    viewModel: MedicineViewModel = hiltViewModel()
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedTab by remember { mutableIntStateOf(1) } // Medicine tab selected

    val state by viewModel.uiState.collectAsState()
    val filteredMedicines = viewModel.getFilteredMedicines()
    val filteredNearbyMedicines = viewModel.getFilteredNearbyMedicines()
    val cartState by viewModel.cartState.collectAsState()
    val isDarkMode = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val bgColor = if (isDarkMode) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.surface
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surface

    cartState.pharmacyConflict?.let { conflict ->
        AlertDialog(
            onDismissRequest = { viewModel.resolvePharmacyConflict(false) },
            title = { Text(stringResource(R.string.change_pharmacy_title), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.pharmacy_conflict_message, conflict.newPharmacyName ?: stringResource(R.string.pharmacy_conflict_fallback))) },
            confirmButton = {
                Button(
                    onClick = { viewModel.resolvePharmacyConflict(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) { Text(stringResource(R.string.clear_and_add)) }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.resolvePharmacyConflict(false) }) { Text(stringResource(R.string.cancel)) }
            }
        )
    }

    Scaffold(
        containerColor = bgColor,
        bottomBar = {
            MedicineBottomNavBar(
                selectedTab = selectedTab,
                onTabSelected = { tab ->
                    selectedTab = tab
                    when (tab) {
                        0 -> onNavigateToHome()
                        2 -> { /* FAB action */ }
                        3 -> onNavigateToRecords()
                        4 -> onNavigateToProfile()
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Header with User Profile
            MedicineScreenHeader(
                userName = userName,
                onBackClick = onBackClick,
                onCartClick = onNavigateToCart,
                cartItemCount = viewModel.cartState.collectAsState().value.totalItems
            )

            // Main Content Card
            Card(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 8.dp),
                shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
                colors = CardDefaults.cardColors(containerColor = cardColor),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = 24.dp)
                ) {
                    // Title
                    Text(
                        text = stringResource(id = R.string.medicine_finder),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 20.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Voice search launcher
                    val speechLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.StartActivityForResult()
                    ) { result ->
                        if (result.resultCode == Activity.RESULT_OK) {
                            val spokenText = result.data
                                ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                                ?.firstOrNull() ?: ""
                            if (spokenText.isNotBlank()) {
                                searchQuery = spokenText
                                viewModel.searchMedicines(spokenText)
                            }
                        }
                    }

                    // Search Bar
                    MedicineSearchBar(
                        searchQuery = searchQuery,
                        onSearchChange = {
                            searchQuery = it
                            viewModel.searchMedicines(it)
                        },
                        onVoiceSearch = {
                            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                putExtra(RecognizerIntent.EXTRA_PROMPT, "Say a medicine name...")
                            }
                            try { speechLauncher.launch(intent) } catch (_: Exception) { }
                        }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Category Filter
                    MedicineCategoryFilter(
                        selectedCategory = state.selectedCategory,
                        onCategorySelected = { viewModel.setCategory(it) }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Medicine List
                    if (state.isLoading) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            repeat(5) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(100.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .shimmerEffect()
                                )
                            }
                        }
                    } else if (filteredMedicines.isEmpty() && filteredNearbyMedicines.isEmpty()) {
                        MedicineEmptyState(
                            onResetFilters = {
                                searchQuery = ""
                                viewModel.setCategory(null)
                                viewModel.loadPopularMedicines()
                            }
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            if (searchQuery.isBlank() && filteredNearbyMedicines.isNotEmpty()) {
                                item {
                                    Text(
                                        stringResource(id = R.string.available_near_you),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        color = SwastikPrimary,
                                        modifier = Modifier.padding(bottom = 8.dp, top = 8.dp)
                                    )
                                }
                                item {
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        contentPadding = PaddingValues(bottom = 16.dp)
                                    ) {
                                        items(filteredNearbyMedicines) { nearbyMed ->
                                            NearbyMedicineCard(
                                                nearbyMed = nearbyMed,
                                                onClick = { onMedicineClick(nearbyMed.medicineId ?: "") },
                                                onPharmacyClick = {
                                                    onPharmacyClick(nearbyMed.pharmacyId, nearbyMed.pharmacyName)
                                                }
                                            )
                                        }
                                    }
                                }
                                item {
                                    Text(
                                        stringResource(id = R.string.global_catalog_popular),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                }
                            }

                            items(
                                items = filteredMedicines,
                                key = { it.id }
                            ) { med ->
                                MedicineListItem(
                                    medicine = med,
                                    onClick = { onMedicineClick(med.id) },
                                    onPharmacyClick = {
                                        onPharmacyClick(med.nearbyPharmacyId, med.nearbyPharmacy)
                                    }
                                )
                            }

                            item {
                                Spacer(modifier = Modifier.height(16.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== HEADER ====================
@Composable
private fun MedicineScreenHeader(
    userName: String,
    onBackClick: () -> Unit,
    onCartClick: () -> Unit = {},
    cartItemCount: Int = 0
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBackClick) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // User Avatar
        Box(
            modifier = Modifier
                .size(45.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(stringResource(R.string.string_10), fontSize = 24.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column {
            Text(
                text = userName,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Patient",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Cart Icon
        Box {
            IconButton(onClick = onCartClick) {
                Icon(
                    Icons.Outlined.ShoppingCart,
                    contentDescription = "Cart",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
            if (cartItemCount > 0) {
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .background(MaterialTheme.colorScheme.error, CircleShape)
                        .align(Alignment.TopEnd)
                        .offset(x = (-4).dp, y = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$cartItemCount",
                        color = MaterialTheme.colorScheme.surface,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Notification Icon
        Box {
            IconButton(onClick = onCartClick) {
                Icon(
                    Icons.Outlined.Notifications,
                    contentDescription = "Notifications",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
            // Only show badge when there are cart items (something actionable)
            if (cartItemCount > 0) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(MaterialTheme.colorScheme.error, CircleShape)
                        .align(Alignment.TopEnd)
                        .offset(x = (-8).dp, y = 8.dp)
                )
            }
        }
    }
}

// ==================== SEARCH BAR ====================
@Composable
private fun MedicineSearchBar(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onVoiceSearch: () -> Unit = {}
) {
    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchChange,
        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
        placeholder = {
            Text(
                "Search for medicines",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        leadingIcon = {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        trailingIcon = {
            if (searchQuery.isNotEmpty()) {
                IconButton(onClick = { onSearchChange("") }) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Clear",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                IconButton(onClick = onVoiceSearch) {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = "Voice Search",
                        tint = SwastikPrimary
                    )
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .shadow(2.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
            focusedBorderColor = SwastikPrimary,
            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            focusedContainerColor = MaterialTheme.colorScheme.surface
        ),
        singleLine = true
    )
}

// ==================== CATEGORY FILTER ====================
@Composable
private fun MedicineCategoryFilter(
    selectedCategory: MedicineCategory?,
    onCategorySelected: (MedicineCategory?) -> Unit
) {
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
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
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
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    }
}

// ==================== MEDICINE LIST ITEM ====================
@Composable
private fun MedicineListItem(
    medicine: Medicine,
    onClick: () -> Unit,
    onPharmacyClick: () -> Unit
) {
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
                // Medicine Name with Rx badge if needed
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = medicine.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (medicine.requiresPrescription) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .background(
                                    MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f),
                                    RoundedCornerShape(4.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                "Rx",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Price
                Text(
                    text = "₹${medicine.price}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // Manufacturer
                Text(
                    text = medicine.manufacturer ?: "",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Right side - Stock status and pharmacy
            Column(horizontalAlignment = Alignment.End) {
                // Stock Status
                Text(
                    text = if (medicine.inStock) "In stock" else "Out of stock",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (medicine.inStock) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Medical Store with Location
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onPharmacyClick() }
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = SwastikPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = medicine.nearbyPharmacy ?: "",
                        fontSize = 13.sp,
                        color = SwastikPrimary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Divider
        HorizontalDivider(modifier = Modifier.padding(top = 12.dp), color = MaterialTheme.colorScheme.surfaceVariant)
    }
}

// ==================== NEARBY MEDICINE CARD (HYBRID) ====================
@Composable
private fun NearbyMedicineCard(
    nearbyMed: NearbyMedicineDto,
    onClick: () -> Unit,
    onPharmacyClick: () -> Unit
) {
    val cardColor = if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surface
    Card(
        modifier = Modifier
            .width(260.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant)
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
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "₹${nearbyMed.price}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = SwastikPrimary
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onPharmacyClick() }
            ) {
                Icon(Icons.Outlined.Store, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = nearbyMed.pharmacyName ?: "Local Pharmacy",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "${nearbyMed.quantity} Left in Stock",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
// ==================== EMPTY STATE ====================
@Composable
private fun MedicineEmptyState(
    onResetFilters: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(stringResource(R.string.string_11), fontSize = 50.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            "No medicines found",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "Try searching with different keywords or reset filters",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedButton(
            onClick = onResetFilters,
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                Icons.Default.Refresh,
                contentDescription = null,
                tint = SwastikPrimary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.reset_filters), color = SwastikPrimary)
        }
    }
}

// ==================== BOTTOM NAVIGATION ====================
@Composable
private fun MedicineBottomNavBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        modifier = Modifier
            .shadow(8.dp)
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
    ) {
        NavigationBarItem(
            selected = selectedTab == 0,
            onClick = { onTabSelected(0) },
            icon = {
                Icon(
                    if (selectedTab == 0) Icons.Filled.Home else Icons.Outlined.Home,
                    contentDescription = "Home"
                )
            },
            label = { Text(stringResource(R.string.home), fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = SwastikPrimary,
                selectedTextColor = SwastikPrimary,
                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                indicatorColor = MaterialTheme.colorScheme.surface
            )
        )

        NavigationBarItem(
            selected = selectedTab == 1,
            onClick = { onTabSelected(1) },
            icon = {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            if (selectedTab == 1) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                            RoundedCornerShape(10.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Medication,
                        contentDescription = "Medicine",
                        tint = if (selectedTab == 1) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            label = {
                Text(
                    "Medicine",
                    fontSize = 11.sp,
                    color = if (selectedTab == 1) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            colors = NavigationBarItemDefaults.colors(
                indicatorColor = Color.Transparent
            )
        )

        // Center FAB placeholder
        NavigationBarItem(
            selected = false,
            onClick = { onTabSelected(2) },
            icon = {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .offset(y = (-10).dp)
                        .background(SwastikPrimary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "Add",
                        tint = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.size(28.dp)
                    )
                }
            },
            label = { },
            colors = NavigationBarItemDefaults.colors(
                indicatorColor = Color.Transparent
            )
        )

        NavigationBarItem(
            selected = selectedTab == 3,
            onClick = { onTabSelected(3) },
            icon = {
                Icon(
                    if (selectedTab == 3) Icons.Filled.Description else Icons.Outlined.Description,
                    contentDescription = "Records"
                )
            },
            label = { Text(stringResource(R.string.records), fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = SwastikPrimary,
                selectedTextColor = SwastikPrimary,
                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                indicatorColor = MaterialTheme.colorScheme.surface
            )
        )

        NavigationBarItem(
            selected = selectedTab == 4,
            onClick = { onTabSelected(4) },
            icon = {
                Icon(
                    if (selectedTab == 4) Icons.Filled.Person else Icons.Outlined.Person,
                    contentDescription = "Profile"
                )
            },
            label = { Text(stringResource(R.string.profile), fontSize = 11.sp) },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = SwastikPrimary,
                selectedTextColor = SwastikPrimary,
                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                indicatorColor = MaterialTheme.colorScheme.surface
            )
        )
    }
}
