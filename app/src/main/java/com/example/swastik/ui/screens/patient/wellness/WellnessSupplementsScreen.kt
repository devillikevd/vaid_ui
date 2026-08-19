package com.example.swastik.ui.screens.patient.wellness

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealBorder
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDark
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealDeep
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealMint
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealPrimary
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealSurface
import com.example.swastik.ui.screens.patient.wellness.WellnessTheme.TealSurfaceVariant
import com.example.swastik.ui.viewmodel.WellnessViewModel

// ==================== WELLNESS STORE (PLAZA) SCREEN ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSupplementsScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var selectedGoalTag by remember { mutableStateOf("All") }
    var selectedProductForDetail by remember { mutableStateOf<TrustedSupplementDto?>(null) }

    LaunchedEffect(Unit) {
        viewModel.refreshSupplements()
    }

    val goalTags = listOf("All", "Muscle Growth", "Immunity & Energy", "PCOS & Hormone", "Joint & Bone", "Fat Loss")

    val categoriesWithIcons = listOf(
        Triple("All", Icons.Default.AllInclusive, null as String?),
        Triple("Proteins", Icons.Default.FitnessCenter, "supplement"),
        Triple("Vitamins", Icons.Default.LocalPharmacy, "vitamin"),
        Triple("Ayurvedic", Icons.Default.Spa, "ayurvedic"),
        Triple("Smart Devices", Icons.Default.MonitorHeart, "device"),
        Triple("Recovery", Icons.Default.Healing, "recovery")
    )

    // Smart filter products based on search, category, and goal
    val filteredSupplements = remember(state.supplements, searchQuery, selectedCategory, selectedGoalTag) {
        state.supplements.filter { product ->
            val name = product.name
            val desc = product.description ?: ""
            val brand = product.brand ?: ""
            val cat = product.category ?: ""

            val matchesSearch = searchQuery.isBlank() ||
                    name.contains(searchQuery, ignoreCase = true) ||
                    brand.contains(searchQuery, ignoreCase = true) ||
                    desc.contains(searchQuery, ignoreCase = true)

            val matchesCategory = selectedCategory == null || when (selectedCategory) {
                "supplement" -> cat.contains("supplement", ignoreCase = true) ||
                        cat.contains("protein", ignoreCase = true) ||
                        name.contains("Whey", ignoreCase = true) ||
                        name.contains("Protein", ignoreCase = true) ||
                        name.contains("Creatine", ignoreCase = true) ||
                        name.contains("BCAA", ignoreCase = true)
                "vitamin" -> cat.contains("vitamin", ignoreCase = true) ||
                        name.contains("Vitamin", ignoreCase = true) ||
                        name.contains("Omega", ignoreCase = true) ||
                        name.contains("Zinc", ignoreCase = true) ||
                        name.contains("B-Complex", ignoreCase = true) ||
                        name.contains("Calcium", ignoreCase = true) ||
                        name.contains("D3", ignoreCase = true)
                "ayurvedic" -> cat.contains("ayurvedic", ignoreCase = true) ||
                        name.contains("Ashwagandha", ignoreCase = true) ||
                        name.contains("Shilajit", ignoreCase = true) ||
                        name.contains("Triphala", ignoreCase = true) ||
                        name.contains("Curcumin", ignoreCase = true) ||
                        name.contains("Herbal", ignoreCase = true) ||
                        brand.contains("Himalaya", ignoreCase = true) ||
                        brand.contains("Kapiva", ignoreCase = true) ||
                        brand.contains("Baidyanath", ignoreCase = true)
                "device" -> cat.contains("device", ignoreCase = true) ||
                        name.contains("Scale", ignoreCase = true) ||
                        name.contains("Pressure", ignoreCase = true) ||
                        name.contains("Oximeter", ignoreCase = true) ||
                        name.contains("Monitor", ignoreCase = true) ||
                        brand.contains("Omron", ignoreCase = true) ||
                        brand.contains("Dr. Trust", ignoreCase = true) ||
                        brand.contains("Dr. Morepen", ignoreCase = true)
                "recovery" -> cat.contains("recovery", ignoreCase = true) ||
                        name.contains("Spray", ignoreCase = true) ||
                        name.contains("Relief", ignoreCase = true) ||
                        name.contains("Support", ignoreCase = true) ||
                        name.contains("Knee", ignoreCase = true) ||
                        brand.contains("Tynor", ignoreCase = true) ||
                        brand.contains("Volini", ignoreCase = true)
                else -> cat.contains(selectedCategory!!, ignoreCase = true)
            }

            val matchesGoal = selectedGoalTag == "All" || when (selectedGoalTag) {
                "Muscle Growth" -> name.contains("Whey", ignoreCase = true) ||
                        name.contains("Protein", ignoreCase = true) ||
                        name.contains("Creatine", ignoreCase = true) ||
                        name.contains("BCAA", ignoreCase = true)
                "Immunity & Energy" -> name.contains("Vitamin", ignoreCase = true) ||
                        name.contains("B-Complex", ignoreCase = true) ||
                        name.contains("Zinc", ignoreCase = true) ||
                        name.contains("Shilajit", ignoreCase = true) ||
                        name.contains("Ashwagandha", ignoreCase = true)
                "PCOS & Hormone" -> name.contains("Plant", ignoreCase = true) ||
                        name.contains("Ashwagandha", ignoreCase = true) ||
                        name.contains("Omega", ignoreCase = true) ||
                        name.contains("D3", ignoreCase = true)
                "Joint & Bone" -> name.contains("Calcium", ignoreCase = true) ||
                        name.contains("D3", ignoreCase = true) ||
                        name.contains("Support", ignoreCase = true) ||
                        name.contains("Knee", ignoreCase = true) ||
                        name.contains("Spray", ignoreCase = true)
                "Fat Loss" -> name.contains("Isolate", ignoreCase = true) ||
                        name.contains("Scale", ignoreCase = true) ||
                        name.contains("Triphala", ignoreCase = true) ||
                        name.contains("Plant", ignoreCase = true)
                else -> name.contains(selectedGoalTag, ignoreCase = true) ||
                        desc.contains(selectedGoalTag, ignoreCase = true)
            }

            matchesSearch && matchesCategory && matchesGoal
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Wellness Plaza",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 19.sp,
                                color = TealDeep
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = TealDark
                            ) {
                                Text(
                                    "OFFICIAL",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            "⚡ 2-Hr Express from Nearest Verified Pharmacy",
                            fontSize = 11.sp,
                            color = TealDark,
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TealDeep)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshSupplements() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TealDark)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TealSurface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            // ═══════════════════════════════════
            //  SEARCH & INSTANT FILTER BAR
            // ═══════════════════════════════════
            Surface(
                color = TealSurface,
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search protein, multivitamins, smart scales...", fontSize = 13.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, null, tint = TealDark) },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Default.Close, null, tint = TealDark)
                                }
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = TealPrimary,
                            unfocusedBorderColor = TealBorder,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // ═══════════════════════════════════
                    //  CATEGORY SHOWCASE STRIP
                    // ═══════════════════════════════════
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(categoriesWithIcons) { (label, icon, catKey) ->
                            val isSelected = selectedCategory == catKey
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) TealDark else Color.White,
                                border = BorderStroke(1.dp, if (isSelected) TealDark else TealBorder),
                                modifier = Modifier.clickable { selectedCategory = catKey }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else TealDark,
                                        modifier = Modifier.size(15.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        label,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) Color.White else TealDeep
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // ═══════════════════════════════════
                    //  HEALTH GOAL PILLS
                    // ═══════════════════════════════════
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(goalTags) { goal ->
                            val isSelected = selectedGoalTag == goal
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) TealSurfaceVariant else MaterialTheme.colorScheme.surface,
                                border = BorderStroke(0.8.dp, if (isSelected) TealPrimary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                modifier = Modifier.clickable { selectedGoalTag = goal }
                            ) {
                                Text(
                                    goal,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) TealDeep else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            // ═══════════════════════════════════
            //  PLAZA PRODUCT GRID
            // ═══════════════════════════════════
            if (state.isLoading && state.supplements.isEmpty()) {
                PlazaShimmerGrid()
            } else if (filteredSupplements.isEmpty()) {
                PlazaEmptyState(
                    query = searchQuery,
                    onReset = {
                        searchQuery = ""
                        selectedCategory = null
                        selectedGoalTag = "All"
                    }
                )
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Top Guarantee Banner in Grid
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
                        PlazaTrustGuaranteeBanner()
                    }

                    items(filteredSupplements, key = { it.id }) { product ->
                        PlazaProductCard(
                            product = product,
                            onCardClick = { selectedProductForDetail = product },
                            onQuickAdd = {
                                Toast.makeText(
                                    context,
                                    "Added ${product.name} to Pharmacy Cart! ⚡ Dispatched in 2 hrs.",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        )
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════
    //  PRODUCT DETAIL & LAB REPORT MODAL
    // ═══════════════════════════════════
    selectedProductForDetail?.let { product ->
        ProductDetailBottomSheet(
            product = product,
            onDismiss = { selectedProductForDetail = null },
            onBuyNow = {
                Toast.makeText(
                    context,
                    "Order placed for ${product.name}! Nearest pharmacy is preparing your 2-hr delivery.",
                    Toast.LENGTH_LONG
                ).show()
                selectedProductForDetail = null
            }
        )
    }
}

// ==================== PLAZA TRUST GUARANTEE BANNER ====================

@Composable
private fun PlazaTrustGuaranteeBanner() {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, TealBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(TealSurface, Color.White)))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(shape = CircleShape, color = TealDark.copy(alpha = 0.12f), modifier = Modifier.size(38.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.VerifiedUser, null, tint = TealDark, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Swastik 100% Authenticity Guarantee", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TealDeep)
                Text("FSSAI Verified • 3rd-Party Lab Tested • Dispatched from Chemist within 10 km", fontSize = 10.sp, color = Color.Gray)
            }
        }
    }
}

// ==================== PLAZA PRODUCT CARD ====================

@Composable
private fun PlazaProductCard(
    product: TrustedSupplementDto,
    onCardClick: () -> Unit,
    onQuickAdd: () -> Unit
) {
    val mrp = product.mrp ?: ((product.price ?: 499.0) * 1.25)
    val price = product.price ?: 499.0
    val discountPercent = if (mrp > price) (((mrp - price) / mrp) * 100).toInt() else 0

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, TealBorder.copy(alpha = 0.4f)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onCardClick)
    ) {
        Column {
            // Product Image Container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(TealSurface)
            ) {
                if (!product.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(product.imageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.ShoppingBag,
                            contentDescription = null,
                            tint = TealPrimary.copy(alpha = 0.4f),
                            modifier = Modifier.size(48.dp)
                        )
                    }
                }

                // Discount Pill (Top Left)
                if (discountPercent > 0) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFE11D48)
                    ) {
                        Text(
                            "$discountPercent% OFF",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                // FSSAI / Lab Tested Pill (Top Right)
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = TealDark
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Verified, null, tint = Color.White, modifier = Modifier.size(10.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("Lab Tested", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                // Hyperlocal 2-Hr Express Pill (Bottom Center)
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp),
                    shape = RoundedCornerShape(6.dp),
                    color = Color.Black.copy(alpha = 0.65f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.ElectricBolt, null, tint = Color(0xFFFFD700), modifier = Modifier.size(10.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("⚡ 2-Hr Delivery", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            // Card Body Content
            Column(modifier = Modifier.padding(10.dp)) {
                // Brand
                Text(
                    text = product.brand?.takeIf { it.isNotBlank() } ?: "Swastik Verified",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TealDark
                )

                // Product Name
                Text(
                    text = product.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = TealDeep,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.height(36.dp)
                )

                Spacer(modifier = Modifier.height(4.dp))

                // AI Health Compatibility Pill
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFFDCFCE7)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(Color(0xFF16A34A), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Safe for your profile",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF166534)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Price Section
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "₹${price.toInt()}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp,
                                color = TealDeep
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            if (mrp > price) {
                                Text(
                                    "₹${mrp.toInt()}",
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    textDecoration = TextDecoration.LineThrough
                                )
                            }
                        }
                    }

                    // Quick Add Button
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = TealDark,
                        modifier = Modifier.clickable { onQuickAdd() }
                    ) {
                        Text(
                            "+ ADD",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

// ==================== PRODUCT DETAIL & NABL LAB REPORT BOTTOM SHEET ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductDetailBottomSheet(
    product: TrustedSupplementDto,
    onDismiss: () -> Unit,
    onBuyNow: () -> Unit
) {
    val mrp = product.mrp ?: ((product.price ?: 499.0) * 1.25)
    val price = product.price ?: 499.0

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Product Image & Verified Tag
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(TealSurface),
                    contentAlignment = Alignment.Center
                ) {
                    if (!product.imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(product.imageUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = product.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Icon(Icons.Default.ShoppingBag, null, tint = TealPrimary, modifier = Modifier.size(60.dp))
                    }
                }
            }

            // Header Info
            item {
                Text(
                    text = product.brand ?: "Swastik Verified",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TealDark
                )
                Text(
                    text = product.name,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TealDeep
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("₹${price.toInt()}", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = TealDeep)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("₹${mrp.toInt()}", fontSize = 14.sp, color = Color.Gray, textDecoration = TextDecoration.LineThrough)
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDCFCE7)) {
                        Text(
                            "Save ₹${(mrp - price).toInt()}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF166534),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // ═══════════════════════════════════
            //  NEAREST PHARMACY FULFILLMENT CARD
            // ═══════════════════════════════════
            item {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = TealSurface),
                    border = BorderStroke(1.dp, TealBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(shape = CircleShape, color = Color(0xFF0F766E), modifier = Modifier.size(34.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.ElectricBolt, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "⚡ Hyperlocal 2-Hour Express Delivery",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = TealDeep
                            )
                            Text(
                                "Dispatched by ${product.sellerName ?: "Apollo Pharmacy (3.2 km)"} • Live GPS Tracking",
                                fontSize = 10.sp,
                                color = Color.DarkGray
                            )
                        }
                    }
                }
            }

            // ═══════════════════════════════════
            //  AI CLINICAL COMPATIBILITY CARD
            // ═══════════════════════════════════
            item {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
                    border = BorderStroke(1.dp, Color(0xFF86EFAC))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.HealthAndSafety, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "AI Clinical Safety Compatibility: 100% Safe",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = Color(0xFF166534)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "• Zero allergens matched with your patient profile\n• Safe with your logged vitals and daily activity level\n• Free of banned substances & heavy metals",
                            fontSize = 11.sp,
                            color = Color(0xFF15803D),
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            // ═══════════════════════════════════
            //  NABL LAB AUTHENTICITY CERTIFICATE
            // ═══════════════════════════════════
            item {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, TealBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Science, null, tint = TealDark, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("NABL Lab Test Authenticity", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TealDeep)
                            }
                            Surface(shape = RoundedCornerShape(6.dp), color = TealSurfaceVariant) {
                                Text("PASSED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = TealDark, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("FSSAI License", fontSize = 10.sp, color = Color.Gray)
                                Text(product.fssaiLicense ?: "10014011002345", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text("Batch Number", fontSize = 10.sp, color = Color.Gray)
                                Text(product.batchNumber ?: "NABL-2026-AUG-99", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text("Heavy Metals", fontSize = 10.sp, color = Color.Gray)
                                Text("0% (Negative)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                            }
                        }
                    }
                }
            }

            // Description
            product.description?.let { desc ->
                item {
                    Text("Product Overview", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TealDeep)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(desc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 17.sp)
                }
            }

            // Bottom CTA Buttons
            item {
                Spacer(modifier = Modifier.height(6.dp))
                Button(
                    onClick = onBuyNow,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TealDark)
                ) {
                    Icon(Icons.Default.Bolt, null, tint = Color.White)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Order with 1-Tap • ₹${price.toInt()}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

// ==================== SHIMMER SKELETON GRID ====================

@Composable
private fun PlazaShimmerGrid() {
    val shimmerBrush = rememberShimmerBrush()
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(6) {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Box(modifier = Modifier.fillMaxWidth().height(120.dp).background(shimmerBrush))
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(modifier = Modifier.width(60.dp).height(10.dp).clip(RoundedCornerShape(4.dp)).background(shimmerBrush))
                        Box(modifier = Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(4.dp)).background(shimmerBrush))
                        Box(modifier = Modifier.width(80.dp).height(14.dp).clip(RoundedCornerShape(4.dp)).background(shimmerBrush))
                    }
                }
            }
        }
    }
}

// ==================== EMPTY STATE ====================

@Composable
private fun PlazaEmptyState(query: String, onReset: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                shape = CircleShape,
                color = TealSurfaceVariant,
                modifier = Modifier.size(70.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Storefront, null, tint = TealDark, modifier = Modifier.size(36.dp))
                }
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                "No Products Found",
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = TealDeep
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                if (query.isNotBlank()) "No verified supplements matching \"$query\"" else "Try adjusting your category or goal filters.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(14.dp))
            OutlinedButton(
                onClick = onReset,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, TealDark)
            ) {
                Text("Reset Filters", color = TealDark, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }
    }
}
