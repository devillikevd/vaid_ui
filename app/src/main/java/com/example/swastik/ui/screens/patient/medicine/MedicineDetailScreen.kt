package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.Medicine
import com.example.swastik.data.remote.dto.MedicineAvailabilityDto
import com.example.swastik.ui.theme.SwastikGreen
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineDetailScreen(
    medicineId: String,
    onBackClick: () -> Unit,
    onNavigateToCart: () -> Unit = {},
    onNavigateToPharmacyCart: () -> Unit = {},
    onMedicineClick: (String) -> Unit = {},
    viewModel: MedicineViewModel = hiltViewModel()
) {
    LaunchedEffect(medicineId) {
        viewModel.loadMedicineDetail(medicineId)
    }

    val detailState by viewModel.detailState.collectAsState()
    val cartState by viewModel.globalCartState.collectAsState()
    val pharmacyCartState by viewModel.pharmacyCartState.collectAsState()
    val medicine = detailState.medicine
    val colorScheme = MaterialTheme.colorScheme
    val context = LocalContext.current
    var requestQuantity by remember { mutableIntStateOf(1) }
    var addedToCart by remember { mutableStateOf(false) }

    if (detailState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize().background(colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = SwastikPrimary)
        }
        return
    }

    if (medicine == null) {
        Box(
            modifier = Modifier.fillMaxSize().background(colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.Warning, null, modifier = Modifier.size(48.dp), tint = colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(12.dp))
                Text("Medicine not found", fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(onClick = onBackClick) { Text("Go Back") }
            }
        }
        return
    }

    val cartItem = cartState.items.find { it.medicine.id == medicine.id }
    val isInCart = cartItem != null

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = colorScheme.onSurface
                        )
                    }
                },
                actions = {
                    if (cartState.totalItems > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = SwastikPrimary) {
                                    Text("${cartState.totalItems}", color = Color.White, fontSize = 10.sp)
                                }
                            }
                        ) {
                            IconButton(onClick = onNavigateToCart) {
                                Icon(Icons.Outlined.ShoppingCart, "Cart", tint = colorScheme.onSurface)
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = colorScheme.surface)
            )
        },
        bottomBar = {
            Surface(
                shadowElevation = 12.dp,
                tonalElevation = 2.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colorScheme.surface)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, colorScheme.outlineVariant)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            IconButton(
                                onClick = { if (requestQuantity > 1) requestQuantity-- },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(Icons.Default.Remove, "Decrease", modifier = Modifier.size(18.dp))
                            }
                            Text(
                                "$requestQuantity",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                modifier = Modifier
                                    .padding(horizontal = 12.dp)
                                    .widthIn(min = 24.dp),
                                textAlign = TextAlign.Center
                            )
                            IconButton(
                                onClick = { requestQuantity++ },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(Icons.Default.Add, "Increase", modifier = Modifier.size(18.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Button(
                        onClick = {
                            viewModel.addToCart(
                                com.example.swastik.ui.viewmodel.CartType.GLOBAL,
                                medicine = medicine,
                                pharmacyId = "GLOBAL_REQUEST",
                                pharmacyName = "Global Request",
                                quantity = requestQuantity
                            )
                            addedToCart = true
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (addedToCart || isInCart) SwastikGreen else SwastikPrimary
                        )
                    ) {
                        Icon(
                            if (addedToCart || isInCart) Icons.Default.CheckCircle else Icons.Default.AddShoppingCart,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (addedToCart || isInCart) "Added to Cart" else "Add to Cart",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp
                        )
                    }
                }
            }
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
        ) {
            // Hero Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(SwastikPrimary.copy(alpha = 0.06f)),
                contentAlignment = Alignment.Center
            ) {
                if (!medicine.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = medicine.imageUrl,
                        contentDescription = medicine.name,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text(
                        text = getMedicineCategoryEmoji(medicine.safeCategoryName),
                        fontSize = 72.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Info Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = medicine.name,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = colorScheme.onSurface,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        if (medicine.requiresPrescription) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                color = colorScheme.tertiaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    stringResource(R.string.rx_required),
                                    fontSize = 11.sp,
                                    color = colorScheme.onTertiaryContainer,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    if (!medicine.genericName.isNullOrBlank()) {
                        Text(
                            text = medicine.genericName,
                            fontSize = 14.sp,
                            color = colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    Text(
                        text = "by ${medicine.manufacturer ?: "Unknown"}",
                        fontSize = 13.sp,
                        color = colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Price row
                    Text(
                        text = medicine.effectivePrice.let { if (medicine.price != null) "₹${it.toInt()}" else "Price on request" },
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = SwastikPrimary
                    )
                    val detailStrikePrice = when {
                        medicine.hasActiveCampaign -> medicine.price
                        else -> medicine.mrp
                    }
                    if (detailStrikePrice != null && detailStrikePrice > medicine.effectivePrice) {
                        Text(
                            text = "₹${detailStrikePrice.toInt()}",
                            fontSize = 14.sp,
                            color = colorScheme.onSurfaceVariant,
                            textDecoration = TextDecoration.LineThrough
                        )
                    }
                    if (medicine.discountPercentage > 0) {
                        Surface(
                            color = SwastikGreen.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "${medicine.discountPercentage.toInt()}% OFF",
                                fontSize = 11.sp,
                                color = SwastikGreen,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Trust badges
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Surface(
                            color = SwastikGreen.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.Verified, contentDescription = null, tint = SwastikGreen, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Genuine Medicine", fontSize = 11.sp, color = SwastikGreen, fontWeight = FontWeight.Medium)
                            }
                        }
                        Surface(
                            color = SwastikPrimary.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.LocalShipping, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Fast Delivery", fontSize = 11.sp, color = SwastikPrimary, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        InfoChip(
                            icon = Icons.Outlined.Category,
                            label = (medicine.category?.name ?: "TABLET").lowercase().replaceFirstChar { it.uppercase() },
                            color = SwastikPrimary
                        )
                        InfoChip(
                            icon = Icons.Default.CellTower,
                            label = "Available on Request",
                            color = colorScheme.secondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Description
            if (!medicine.description.isNullOrBlank()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            stringResource(R.string.description),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            medicine.description!!,
                            fontSize = 14.sp,
                            color = colorScheme.onSurfaceVariant,
                            lineHeight = 22.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // ===== AVAILABILITY SECTION =====
            if (detailState.availability.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.Store,
                                contentDescription = null,
                                tint = SwastikPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Available at Nearby Pharmacies",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                            if (pharmacyCartState.totalItems > 0) {
                                TextButton(onClick = onNavigateToPharmacyCart) {
                                    Icon(
                                        Icons.Outlined.ShoppingCart,
                                        contentDescription = null,
                                        tint = SwastikPrimary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        "View Cart (${pharmacyCartState.totalItems})",
                                        fontSize = 12.sp,
                                        color = SwastikPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "${detailState.availability.size} pharmacy${if (detailState.availability.size > 1) "s" else ""} found",
                            fontSize = 12.sp,
                            color = colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(10.dp))

                        detailState.availability.forEach { avail ->
                            val inCartQty = pharmacyCartState.items
                                .firstOrNull { it.medicine.inventoryItemId == avail.inventoryItemId }
                                ?.quantity ?: 0
                            val addToPharmacyCart: () -> Unit = {
                                val pharmMedicine = medicine.copy(
                                    inventoryItemId = avail.inventoryItemId,
                                    price = avail.price,
                                    mrp = null,
                                    inStock = avail.inStock
                                )
                                val ok = viewModel.addToCart(
                                    com.example.swastik.ui.viewmodel.CartType.PHARMACY,
                                    pharmMedicine,
                                    avail.pharmacyId,
                                    avail.pharmacyName
                                )
                                if (!ok) {
                                    Toast.makeText(
                                        context,
                                        "Items from another pharmacy are in your cart. Clear it first.",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                            AvailabilityPharmacyRow(
                                availability = avail,
                                isInCart = inCartQty > 0,
                                cartQuantity = inCartQty,
                                onAddToCart = addToPharmacyCart,
                                onIncrement = addToPharmacyCart,
                                onDecrement = {
                                    val key = avail.inventoryItemId
                                    if (key != null) {
                                        if (inCartQty <= 1) {
                                            viewModel.removeFromCart(com.example.swastik.ui.viewmodel.CartType.PHARMACY, key)
                                        } else {
                                            viewModel.updateCartQuantity(com.example.swastik.ui.viewmodel.CartType.PHARMACY, key, inCartQty - 1)
                                        }
                                    }
                                }
                            )
                            if (avail != detailState.availability.last()) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 6.dp),
                                    color = colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // ===== ALTERNATIVES SECTION =====
            if (detailState.alternatives.isNotEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = colorScheme.secondaryContainer.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.SwapHoriz,
                                contentDescription = null,
                                tint = SwastikOrange,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Alternative Medicines",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Similar medicines with same generic composition",
                            fontSize = 12.sp,
                            color = colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(10.dp))

                        detailState.alternatives.forEach { alt ->
                            AlternativeMedicineRow(alt, onClick = { onMedicineClick(alt.id) })
                            if (alt != detailState.alternatives.last()) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 6.dp),
                                    color = colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // How it works
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.secondaryContainer.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "How it works",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    HowItWorksStep(
                        step = "1",
                        title = "Add to Cart",
                        description = "Add medicines you need to your cart",
                        color = SwastikPrimary
                    )
                    HowItWorksStep(
                        step = "2",
                        title = "Set Delivery Address",
                        description = "Enter your delivery location so pharmacies know where to deliver",
                        color = SwastikOrange
                    )
                    HowItWorksStep(
                        step = "3",
                        title = "Broadcast Request",
                        description = "Your request is sent to pharmacies within 15km",
                        color = colorScheme.secondary
                    )
                    HowItWorksStep(
                        step = "4",
                        title = "Pharmacy Accepts & Delivers",
                        description = "A pharmacy accepts your request, confirms pricing, and delivers to you",
                        color = SwastikGreen
                    )
                }
            }

            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

// ==================== AVAILABILITY ROW ====================
@Composable
private fun AvailabilityPharmacyRow(
    availability: MedicineAvailabilityDto,
    isInCart: Boolean,
    cartQuantity: Int,
    onAddToCart: () -> Unit,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Pharmacy icon
        Box(
            modifier = Modifier
                .size(36.dp)
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

        Spacer(modifier = Modifier.width(10.dp))

        // Pharmacy info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = availability.pharmacyName,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                color = colorScheme.onSurface
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (!availability.address.isNullOrBlank()) {
                    Icon(
                        Icons.Outlined.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = availability.address,
                        fontSize = 11.sp,
                        color = colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
                if (availability.distance != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${String.format("%.1f", availability.distance)} km",
                        fontSize = 11.sp,
                        color = colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Price + Stock + Add
        Column(horizontalAlignment = Alignment.End) {
            if (availability.price != null) {
                Text(
                    text = "₹${availability.price.toInt()}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = SwastikPrimary
                )
                if (availability.mrp != null && availability.mrp > availability.price) {
                    Text(
                        text = "₹${availability.mrp.toInt()}",
                        fontSize = 10.sp,
                        color = colorScheme.onSurfaceVariant,
                        textDecoration = TextDecoration.LineThrough
                    )
                }
            }
            Box(
                modifier = Modifier
                    .background(
                        if (availability.inStock) Color(0xFF2E7D32).copy(alpha = 0.1f) else SwastikRed.copy(alpha = 0.1f),
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = if (availability.inStock) "In Stock" else "Out of Stock",
                    fontSize = 10.sp,
                    color = if (availability.inStock) Color(0xFF2E7D32) else SwastikRed,
                    fontWeight = FontWeight.Medium
                )
            }
            if (availability.inStock) {
                Spacer(modifier = Modifier.height(6.dp))
                if (isInCart && cartQuantity > 0) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = SwastikPrimary
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        ) {
                            IconButton(onClick = onDecrement, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(11.dp))
                            }
                            Text(
                                "$cartQuantity",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp
                            )
                            IconButton(onClick = onIncrement, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(11.dp))
                            }
                        }
                    }
                } else {
                    Button(
                        onClick = onAddToCart,
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SwastikPrimary,
                            contentColor = Color.White
                        ),
                        modifier = Modifier.height(24.dp)
                    ) {
                        Text("Add", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        }
    }
}

// ==================== ALTERNATIVE MEDICINE ROW ====================
@Composable
private fun AlternativeMedicineRow(alternative: Medicine, onClick: () -> Unit) {
    val colorScheme = MaterialTheme.colorScheme

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Image or emoji
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
            contentAlignment = Alignment.Center
        ) {
            if (!alternative.imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = alternative.imageUrl,
                    contentDescription = alternative.name,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop
                )
            } else {
                Text(getMedicineCategoryEmoji(alternative.safeCategoryName), fontSize = 22.sp)
            }
        }

        Spacer(modifier = Modifier.width(10.dp))

        // Name + generic
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = alternative.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = colorScheme.onSurface,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                if (alternative.requiresPrescription) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .background(colorScheme.tertiary.copy(alpha = 0.1f), RoundedCornerShape(3.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text("Rx", fontSize = 8.sp, color = colorScheme.tertiary, fontWeight = FontWeight.Bold)
                    }
                }
            }
            if (!alternative.genericName.isNullOrBlank()) {
                Text(
                    text = alternative.genericName,
                    fontSize = 11.sp,
                    color = colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Price
        Text(
            text = "₹${alternative.price?.toInt() ?: 0}",
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            color = SwastikPrimary
        )
    }
}

// ==================== HELPER COMPOSABLES ====================

@Composable
private fun HowItWorksStep(
    step: String,
    title: String,
    description: String,
    color: Color
) {
    Row(
        modifier = Modifier.padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(color, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(step, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun InfoChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color
) {
    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(label, fontSize = 13.sp, color = color, fontWeight = FontWeight.Medium)
    }
}

private fun getMedicineCategoryEmoji(category: String?): String {
    return getMedicineEmoji(category)
}
