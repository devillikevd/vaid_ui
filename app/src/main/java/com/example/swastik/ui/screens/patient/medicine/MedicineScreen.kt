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
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import com.example.swastik.ui.screens.patient.components.shimmerEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.remote.dto.MedicineCategoryDto
import com.example.swastik.data.remote.dto.NearbyMedicineDto
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikGreen
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import coil.compose.AsyncImage

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
    var selectedTab by remember { mutableIntStateOf(1) }

    val state by viewModel.uiState.collectAsState()
    val filteredMedicines = viewModel.getFilteredMedicines()
    val filteredNearbyMedicines = viewModel.getFilteredNearbyMedicines()
    val cartState by viewModel.globalCartState.collectAsState()
    val isDarkMode = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val bgColor = if (isDarkMode) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.surface
    val cardColor = if (isDarkMode) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surface

    val isRefreshing = state.isLoading
    val pullToRefreshState = rememberPullToRefreshState()
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(pullToRefreshState) {
            viewModel.refresh()
        }
    }
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing && pullToRefreshState.isRefreshing) {
            kotlinx.coroutines.delay(250)
            pullToRefreshState.endRefresh()
        }
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
                        2 -> { }
                        3 -> onNavigateToRecords()
                        4 -> onNavigateToProfile()
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .nestedScroll(pullToRefreshState.nestedScrollConnection)
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                MedicineScreenHeader(
                    userName = userName,
                    onBackClick = onBackClick,
                    onCartClick = onNavigateToCart,
                    cartItemCount = viewModel.globalCartState.collectAsState().value.totalItems
                )

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
                        Text(
                            text = stringResource(id = R.string.medicine_finder),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 20.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

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

                        MedicineSearchBar(
                            searchQuery = searchQuery,
                            onSearchChange = {
                                searchQuery = it
                                viewModel.searchMedicines(it)
                            },
                            onVoiceSearch = {
                                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, java.util.Locale.getDefault())
                                    putExtra(RecognizerIntent.EXTRA_PROMPT, "Say a medicine name...")
                                }
                                try { speechLauncher.launch(intent) } catch (_: Exception) { }
                            }
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        MedicineCategoryFilter(
                            categories = state.categories,
                            selectedCategory = state.selectedCategory,
                            onCategorySelectedByName = { viewModel.setCategoryByName(it) }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        if (state.error != null) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 20.dp, vertical = 32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    Icons.Outlined.ErrorOutline,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = MaterialTheme.colorScheme.error
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = state.error ?: "",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 14.sp
                                )
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = { viewModel.refresh() },
                                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                                ) {
                                    Text(stringResource(R.string.retry))
                                }
                            }
                        } else if (state.isLoading) {
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
                                    viewModel.setCategoryByName(null)
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
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                            contentPadding = PaddingValues(bottom = 12.dp)
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
                                    val isInCart = cartState.items.any { it.medicine.id == med.id }
                                    val cartQty = cartState.items.find { it.medicine.id == med.id }?.quantity ?: 0
                                    CompactMedicineListItem(
                                        medicine = med,
                                        isInCart = isInCart,
                                        cartQuantity = cartQty,
                                        onClick = { onMedicineClick(med.id) },
                                        onAddToCart = {
                                            viewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, med, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onIncrement = {
                                            viewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, med, "GLOBAL_REQUEST", "Global Request")
                                        },
                                        onDecrement = {
                                            viewModel.removeFromCart(com.example.swastik.ui.viewmodel.CartType.GLOBAL, med.id)
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

            PullToRefreshContainer(
                state = pullToRefreshState,
                modifier = Modifier,
                containerColor = SwastikPrimaryLight,
                contentColor = SwastikPrimary
            )
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
                text = stringResource(R.string.patient_label),
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.weight(1f))

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

        Box {
            IconButton(onClick = onCartClick) {
                Icon(
                    Icons.Outlined.Notifications,
                    contentDescription = "Notifications",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
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
                stringResource(R.string.search_for_medicines_1),
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

// ==================== CATEGORY FILTER (Backend-powered) ====================
@Composable
private fun MedicineCategoryFilter(
    categories: List<MedicineCategoryDto>,
    selectedCategory: String?,
    onCategorySelectedByName: (String?) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedCategory.isNullOrBlank(),
                onClick = { onCategorySelectedByName(null) },
                label = { Text(stringResource(R.string.filter_all), fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
        if (categories.isNotEmpty()) {
            items(categories) { cat ->
                val categoryName = cat.name.lowercase()
                val displayName = cat.displayName ?: cat.name.replaceFirstChar { it.uppercase() }
                FilterChip(
                    selected = selectedCategory?.lowercase() == categoryName,
                    onClick = { onCategorySelectedByName(categoryName) },
                    leadingIcon = {
                        Text(cat.icon.ifBlank { getMedicineEmoji(categoryName) }, fontSize = 14.sp)
                    },
                    label = {
                        Text(displayName, fontSize = 12.sp)
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        }
    }
}

// ==================== COMPACT MEDICINE LIST ITEM (Blinkit-style) ====================
@Composable
private fun CompactMedicineListItem(
    medicine: Medicine,
    isInCart: Boolean = false,
    cartQuantity: Int = 0,
    onClick: () -> Unit,
    onAddToCart: () -> Unit = {},
    onIncrement: () -> Unit = {},
    onDecrement: () -> Unit = {}
) {

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Medicine image or emoji fallback
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    Text(getMedicineEmoji(medicine.category.name), fontSize = 26.sp)
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Middle: Name, generic, manufacturer
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = medicine.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (medicine.requiresPrescription) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(
                                    MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f),
                                    RoundedCornerShape(3.dp)
                                )
                                .padding(horizontal = 4.dp, vertical = 1.dp)
                        ) {
                            Text(
                                "Rx",
                                fontSize = 8.sp,
                                color = MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                if (!medicine.genericName.isNullOrBlank()) {
                    Text(
                        text = medicine.genericName,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Text(
                    text = medicine.manufacturer ?: "",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Right: Price & Add Button
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${medicine.effectivePrice.toInt()}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = SwastikPrimary
                )
                if (medicine.discountPercentage > 0) {
                    Text(
                        text = "${medicine.discountPercentage.toInt()}% OFF",
                        fontSize = 9.sp,
                        color = SwastikGreen,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                if (isInCart && cartQuantity > 0) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = SwastikPrimary,
                        modifier = Modifier.height(28.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(22.dp)
                                    .clip(CircleShape)
                                    .clickable { onDecrement() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                            Text(
                                "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 4.dp)
                            )
                            Box(
                                modifier = Modifier
                                    .size(22.dp)
                                    .clip(CircleShape)
                                    .clickable { onIncrement() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = SwastikPrimary,
                        shadowElevation = 1.dp,
                        modifier = Modifier
                            .height(28.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .clickable { onAddToCart() }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("ADD", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

// ==================== NEARBY MEDICINE CARD (Compact) ====================
@Composable
private fun NearbyMedicineCard(
    nearbyMed: NearbyMedicineDto,
    onClick: () -> Unit,
    onPharmacyClick: () -> Unit
) {

    Card(
        modifier = Modifier
            .width(200.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Medicine image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .clip(RoundedCornerShape(10.dp))
            ) {
                if (!nearbyMed.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = nearbyMed.imageUrl,
                        contentDescription = "Medicine image",
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(getMedicineEmoji(nearbyMed.category ?: "tablet"), fontSize = 36.sp)
                    }
                }
                // Discount badge removed — will be added later via admin panel business model
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Name
            Text(
                text = nearbyMed.name,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            // Generic name
            if (!nearbyMed.genericName.isNullOrBlank()) {
                Text(
                    text = nearbyMed.genericName,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Price row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "₹${nearbyMed.price.toInt()}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = SwastikPrimary
                )
                if (nearbyMed.requiresPrescription) {
                    Box(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f), RoundedCornerShape(3.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text("Rx", fontSize = 8.sp, color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Pharmacy name
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onPharmacyClick() }
            ) {
                Icon(Icons.Outlined.Store, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = nearbyMed.pharmacyName ?: "Local Pharmacy",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
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
            stringResource(R.string.no_medicines_found),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            stringResource(R.string.try_searching_with_different_keywords),
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
                    stringResource(R.string.medicine),
                    fontSize = 11.sp,
                    color = if (selectedTab == 1) SwastikPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            colors = NavigationBarItemDefaults.colors(
                indicatorColor = Color.Transparent
            )
        )

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
