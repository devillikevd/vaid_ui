package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.FacilityType
import com.example.swastik.ui.theme.SwastikGreen
import com.example.swastik.ui.theme.SwastikOrange
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PharmacyDetailScreen(
    pharmacyId: String,
    onBackClick: () -> Unit,
    onNavigateToHospital: (String) -> Unit = {},
    onNavigateToClinic: (String) -> Unit,
    onNavigateToOrderHistory: () -> Unit = {},
    viewModel: PharmacyDetailViewModel = hiltViewModel(),
    hospitalViewModel: com.example.swastik.ui.viewmodel.HospitalFinderViewModel = hiltViewModel(),
    medicineViewModel: com.example.swastik.ui.viewmodel.MedicineViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val hospitalState by hospitalViewModel.uiState.collectAsState()
    var showPharmacyBookingDialog by remember { mutableStateOf(false) }
    val colorScheme = MaterialTheme.colorScheme
    val isDarkSurface = colorScheme.surface.luminance() < 0.5f
    val bgColor = if (isDarkSurface) colorScheme.background else Color(0xFFF8FAFC)
    val context = LocalContext.current

    LaunchedEffect(pharmacyId) {
        viewModel.loadPharmacyDetails(pharmacyId)
        hospitalViewModel.loadPharmacyInventory(pharmacyId)
    }

    Scaffold(
        containerColor = bgColor,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.pharmacy_details), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.surface,
                    titleContentColor = colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            if (uiState.facility != null) {
                val facility = uiState.facility!!
                Surface(
                    color = colorScheme.surface,
                    tonalElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.padding(16.dp)) {
                        Button(
                            onClick = { showPharmacyBookingDialog = true },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                        ) {
                            Icon(Icons.Default.MedicalServices, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.order_medicines), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (uiState.error != null) {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.ErrorOutline, null, modifier = Modifier.size(64.dp), tint = colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(uiState.error ?: "", color = colorScheme.error, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = { viewModel.loadPharmacyDetails(pharmacyId) }) {
                        Text(stringResource(R.string.retry))
                    }
                }
            } else if (uiState.facility != null) {
                val facility = uiState.facility!!

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Header Card
                        item {
                            val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                            val valueColor = if (isDarkSurface) Color(0xFF94A3B8) else Color(0xFF64748B)
                            val iconBgColor = if (isDarkSurface) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9)

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer
                                ),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(56.dp)
                                                .background(iconBgColor, CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = facility.type.getMarkerIcon(),
                                                contentDescription = null,
                                                tint = facility.type.getMarkerColor(),
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = facility.name,
                                                fontWeight = FontWeight.ExtraBold,
                                                fontSize = 20.sp,
                                                color = titleColor
                                                // Fixed truncation issue: Removed maxLines and overflow
                                            )
                                            Text(
                                                text = stringResource(R.string.pharmacy_store),
                                                fontSize = 14.sp,
                                                color = valueColor
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.Star,
                                                contentDescription = null,
                                                tint = SwastikOrange,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Text(
                                                " ${facility.rating} (${facility.reviewCount} reviews)",
                                                fontSize = 13.sp,
                                                color = valueColor
                                            )
                                        }
                                        if (facility.distanceKm > 0) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    Icons.Outlined.LocationOn,
                                                    contentDescription = null,
                                                    tint = SwastikPrimary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Text(" ${facility.distance}", fontSize = 13.sp, color = valueColor)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Quick Actions
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        if (facility.phone.isNotBlank()) NavigationHelper.openDialer(context, facility.phone)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(stringResource(R.string.call), fontSize = 13.sp)
                                }
                                OutlinedButton(
                                    onClick = {
                                        NavigationHelper.openDirections(context, facility.latitude, facility.longitude, facility.name)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(stringResource(R.string.directions), fontSize = 13.sp)
                                }
                            }
                        }

                        // Info Section
                        item {
                            Text(
                                text = stringResource(R.string.pharmacy_information),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
                            )
                            
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                DetailInfoCard(
                                    icon = Icons.Outlined.Place,
                                    title = "Address",
                                    value = facility.address
                                )

                                if (facility.phone.isNotBlank()) {
                                    DetailInfoCard(
                                        icon = Icons.Outlined.Phone,
                                        title = "Contact",
                                        value = facility.phone
                                    )
                                }
                                
                                DetailInfoCard(
                                    icon = Icons.Outlined.LocalShipping,
                                    title = "Home Delivery",
                                    value = if (facility.deliveryAvailable) "Available" else "Not Available"
                                )
                                
                                if (facility.minOrderDelivery != null) {
                                    DetailInfoCard(
                                        icon = Icons.Outlined.Payments,
                                        title = "Min Delivery Order",
                                        value = "₹${facility.minOrderDelivery}"
                                    )
                                }
                            }
                        }
                        // Reviews Section
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            PharmacyReviewSection(
                                facilityId = facility.id,
                                uiState = uiState,
                                onClearState = { viewModel.clearReviewState() },
                                onSubmitReview = { rating, comment ->
                                    viewModel.submitPharmacyReview(facility.id, rating, comment)
                                }
                            )
                        }
                    }
                }
            
            if (showPharmacyBookingDialog && uiState.facility != null) {
                val facility = uiState.facility!!
                PharmacyBookingFlow(
                    facility = facility,
                    initialStep = 1,
                    isPrescriptionBased = false,
                    inventoryItems = hospitalState.pharmacyInventory,
                    isInventoryLoading = hospitalState.isPharmacyInventoryLoading,
                    onInventorySearch = { query -> hospitalViewModel.loadPharmacyInventory(facility.id, query) },
                    onDismiss = { showPharmacyBookingDialog = false },
                    onConfirmOrder = { address, phone, items, isRx, bitmap ->
                        medicineViewModel.clearCart(com.example.swastik.ui.viewmodel.CartType.PHARMACY)
                        medicineViewModel.setPharmacy(com.example.swastik.ui.viewmodel.CartType.PHARMACY, facility.id, facility.name)
                        medicineViewModel.setDeliveryAddress(com.example.swastik.ui.viewmodel.CartType.PHARMACY, address)
                        medicineViewModel.setPatientPhone(com.example.swastik.ui.viewmodel.CartType.PHARMACY, phone)
                        
                        if (!isRx) {
                            items.forEach { (item, orderQuantity) ->
                                val medicine = com.example.swastik.data.model.Medicine(
                                    id = item.medicineId ?: item.id,
                                    inventoryItemId = item.id,
                                    name = item.displayName,
                                    manufacturer = item.manufacturer ?: "Unknown",
                                    price = item.price,
                                    requiresPrescription = item.requiresPrescription ?: false,
                                    inStock = true,
                                    stockCount = item.quantity ?: 0
                                )
                                medicineViewModel.addToCart(com.example.swastik.ui.viewmodel.CartType.PHARMACY, medicine, facility.id, facility.name)
                                medicineViewModel.updateCartQuantity(com.example.swastik.ui.viewmodel.CartType.PHARMACY, item.id, orderQuantity)
                            }
                        }
                        medicineViewModel.placeOrder(com.example.swastik.ui.viewmodel.CartType.PHARMACY, context, bitmap)
                        showPharmacyBookingDialog = false
                        onNavigateToOrderHistory()
                    }
                )
            }
        }
    }
}

@Composable
private fun DetailInfoCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val isDarkSurface = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val valueColor = if (isDarkSurface) Color(0xFF94A3B8) else Color(0xFF64748B)
    val iconBgColor = if (isDarkSurface) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(iconBgColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                Text(
                    title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp,
                    color = titleColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    value,
                    fontSize = 13.sp,
                    color = valueColor,
                    fontWeight = FontWeight.Medium
                    // No maxLines so it wraps fully!
                )
            }
        }
    }
}

@Composable
fun PharmacyReviewSection(
    facilityId: String,
    uiState: PharmacyDetailUiState,
    onClearState: () -> Unit,
    onSubmitReview: (Int, String?) -> Unit
) {
    var showReviewForm by remember { androidx.compose.runtime.mutableStateOf(false) }
    var userRating by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    var userComment by remember { androidx.compose.runtime.mutableStateOf("") }
    val colorScheme = MaterialTheme.colorScheme
    val isDarkSurface = colorScheme.surface.luminance() < 0.5f
    val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val isLoggedIn = true // Assume true for now

    val rating = uiState.facility?.rating ?: 0f
    val reviewCount = uiState.facility?.reviewCount ?: 0

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(stringResource(R.string.reviews), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Text(
                            "$reviewCount reviews • ${String.format(java.util.Locale.US, "%.1f", rating)} avg",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (!showReviewForm) {
                        if (isLoggedIn) {
                            OutlinedButton(
                                onClick = { showReviewForm = true },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.RateReview, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(stringResource(R.string.write_review), fontSize = 13.sp)
                            }
                        } else {
                            Text(
                                stringResource(R.string.login_to_write_a_review),
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                if (showReviewForm) {
                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(stringResource(R.string.your_rating), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Star rating
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        for (i in 1..5) {
                            IconButton(
                                onClick = { userRating = i },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(
                                    if (i <= userRating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                    contentDescription = "Rate $i stars",
                                    tint = if (i <= userRating) SwastikOrange else colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = userComment,
                        onValueChange = { userComment = it },
                        label = { Text(stringResource(R.string.your_review_optional_1)) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.reviewError != null) {
                        Text(
                            uiState.reviewError,
                            color = colorScheme.error,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (uiState.reviewSuccess) {
                        Text(
                            stringResource(R.string.review_submitted_successfully),
                            color = SwastikGreen,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                        LaunchedEffect(Unit) {
                            kotlinx.coroutines.delay(2000)
                            showReviewForm = false
                            onClearState()
                        }
                    } else {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    showReviewForm = false
                                    userRating = 0
                                    userComment = ""
                                    onClearState()
                                },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(stringResource(R.string.cancel))
                            }
                            Button(
                                onClick = {
                                    if (userRating > 0) {
                                        onSubmitReview(userRating, userComment.ifBlank { null })
                                    }
                                },
                                enabled = userRating > 0 && !uiState.reviewSubmitting,
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (uiState.reviewSubmitting) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                } else {
                                    Text(stringResource(R.string.submit))
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // ==================== Existing Reviews List ====================
        if (uiState.reviews.isNotEmpty() || uiState.reviewsLoading) {
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            Text(stringResource(R.string.patient_reviews), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))

            if (uiState.reviewsLoading) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                }
            } else {
                uiState.reviews.forEach { review ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        // Avatar
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(SwastikPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                (review.patient?.name?.firstOrNull() ?: 'A').uppercase(),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = SwastikPrimary
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = review.patient?.name ?: "Anonymous Patient",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                // Star rating
                                Row {
                                    repeat(5) { i ->
                                        Icon(
                                            if (i < review.rating) Icons.Default.Star else Icons.Outlined.StarOutline,
                                            contentDescription = null,
                                            tint = SwastikOrange,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                            }
                            if (!review.comment.isNullOrBlank()) {
                                Text(
                                    review.comment,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        } else if (!uiState.reviewsLoading && uiState.reviews.isEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                stringResource(R.string.no_reviews_yet_be_the),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
