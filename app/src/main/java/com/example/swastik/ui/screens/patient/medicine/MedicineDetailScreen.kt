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
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.R
import com.example.swastik.data.model.Medicine
import com.example.swastik.ui.theme.SwastikGreen
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikRed

/**
 * Medicine Detail Screen — Global Catalogue Only
 * Shows detailed info about a medicine and allows adding to cart for broadcast request.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineDetailScreen(
    medicineId: String,
    onBackClick: () -> Unit,
    onNavigateToCart: () -> Unit = {},
    viewModel: MedicineViewModel = hiltViewModel()
) {
    LaunchedEffect(medicineId) {
        viewModel.loadMedicineDetail(medicineId)
    }

    val detailState by viewModel.detailState.collectAsState()
    val cartState by viewModel.globalCartState.collectAsState()
    val medicine = detailState.medicine
    val colorScheme = MaterialTheme.colorScheme
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
            // Sticky bottom bar
            Surface(
                shadowElevation = 12.dp,
                tonalElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colorScheme.surface)
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Quantity stepper
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

                    // Add to Cart button
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
            // Hero Image / Icon section
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
                        text = getMedicineCategoryEmoji(medicine.category.name),
                        fontSize = 72.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Info Section
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Name + Rx badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
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

                    // Generic name / Manufacturer
                    if (!medicine.genericName.isNullOrBlank()) {
                        Text(
                            text = medicine.genericName!!,
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
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = medicine.price?.let { "₹${it.toInt()}" } ?: "Price on request",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = SwastikPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Category info row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        InfoChip(
                            icon = Icons.Outlined.Category,
                            label = medicine.category.name.lowercase().replaceFirstChar { it.uppercase() },
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

            // Description Card
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

            // How it works card
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
