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
    }

    Scaffold(
        containerColor = bgColor,
        topBar = {
            TopAppBar(
                title = { Text("Pharmacy Details", maxLines = 1, overflow = TextOverflow.Ellipsis) },
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
            if (uiState is PharmacyDetailUiState.Success) {
                val facility = (uiState as PharmacyDetailUiState.Success).facility
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
                            Text("Order Medicines", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            when (val state = uiState) {
                is PharmacyDetailUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is PharmacyDetailUiState.Error -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.ErrorOutline, null, modifier = Modifier.size(64.dp), tint = colorScheme.error)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(state.message, color = colorScheme.error, textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = { viewModel.loadPharmacyDetails(pharmacyId) }) {
                            Text("Retry")
                        }
                    }
                }
                is PharmacyDetailUiState.Success -> {
                    val facility = state.facility

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
                                                text = "Pharmacy & Store",
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
                                text = "Pharmacy Information",
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
                    }
                }
            }
            
            if (showPharmacyBookingDialog && uiState is PharmacyDetailUiState.Success) {
                val facility = (uiState as PharmacyDetailUiState.Success).facility
                PharmacyBookingFlow(
                    facility = facility,
                    initialStep = 1,
                    isPrescriptionBased = false,
                    inventoryItems = hospitalState.pharmacyInventory,
                    isInventoryLoading = hospitalState.isPharmacyInventoryLoading,
                    onInventorySearch = { query -> hospitalViewModel.loadPharmacyInventory(facility.id, query) },
                    onDismiss = { showPharmacyBookingDialog = false },
                    onConfirmOrder = { address, phone, items, isRx, bitmap ->
                        medicineViewModel.clearCart()
                        medicineViewModel.setPharmacy(facility.id, facility.name)
                        medicineViewModel.setDeliveryAddress(address)
                        medicineViewModel.setPatientPhone(phone)
                        
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
                                medicineViewModel.addToCart(medicine, facility.id, facility.name)
                                medicineViewModel.updateCartQuantity(item.id, orderQuantity)
                            }
                        }
                        medicineViewModel.placeOrder(context, bitmap)
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
