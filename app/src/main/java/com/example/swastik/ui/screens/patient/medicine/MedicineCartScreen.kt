
package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.CartItem
import androidx.compose.ui.text.style.TextAlign
import com.example.swastik.ui.viewmodel.MedicineViewModel

enum class CheckoutStep(val title: String) {
    CART("Review Cart"),
    ADDRESS("Delivery"),
    PAYMENT("Confirm")
}

@Composable
private fun CheckoutStepper(currentStep: CheckoutStep) {
    val steps = CheckoutStep.entries
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        steps.forEachIndexed { index, step ->
            val isActive = step.ordinal <= currentStep.ordinal
            val isCurrent = step == currentStep
            
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(if (isActive) SwastikPrimary else MaterialTheme.colorScheme.outlineVariant),
                    contentAlignment = Alignment.Center
                ) {
                    if (step.ordinal < currentStep.ordinal) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp))
                    } else {
                        Text("${index + 1}", color = if (isActive) Color.White else Color.Gray, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(step.title, fontSize = 12.sp, color = if (isActive) SwastikPrimary else Color.Gray, fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal, textAlign = TextAlign.Center)
            }
            
            if (index < steps.size - 1) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(2.dp)
                        .offset(y = (-10).dp)
                        .background(if (steps[index + 1].ordinal <= currentStep.ordinal) SwastikPrimary else MaterialTheme.colorScheme.outlineVariant)
                )
            }
        }
    }
}

/**
 * Medicine Cart & Order Screen — Full checkout flow for global catalogue requests.
 * Steps: Review Cart → Delivery Address → Confirm & Broadcast
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineCartScreen(
    onBackClick: () -> Unit,
    onOrderComplete: () -> Unit = {},
    onNavigateToOrderHistory: (Int) -> Unit = {},
    viewModel: MedicineViewModel = hiltViewModel(),
    patientDashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = hiltViewModel()
) {
    val patientProfile by patientDashboardViewModel.patientProfile.collectAsState()
    val cartState by viewModel.cartState.collectAsState()
    var currentStep by remember { mutableStateOf(CheckoutStep.CART) }
    val context = LocalContext.current
    
    LaunchedEffect(patientProfile) {
        if (cartState.patientPhone.isBlank() && !patientProfile?.phoneNumber.isNullOrBlank()) {
            viewModel.setPatientPhone(patientProfile?.phoneNumber ?: "")
        }
    }

    // Order success dialog
    if (cartState.orderSuccess) {
        val orderResult = cartState.orderResult
        val isGlobalRequest = cartState.selectedPharmacyId == "GLOBAL_REQUEST"
        val pharmacyName = orderResult?.pharmacy?.name ?: cartState.selectedPharmacyName ?: if (isGlobalRequest) "Nearby Pharmacies" else "Chosen pharmacy"
        val pharmacyPhone = orderResult?.pharmacy?.phone

        AlertDialog(
            onDismissRequest = {
                viewModel.resetOrderSuccess()
                onNavigateToOrderHistory(if (isGlobalRequest) 1 else 0)
            },
            icon = { Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(48.dp)) },
            title = { Text(if (isGlobalRequest) "Request Broadcasted!" else stringResource(R.string.order_placed), fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(if (isGlobalRequest) "Your medicine request has been broadcasted to nearby pharmacies within 15km. They will review it and a pharmacy will accept & deliver to your address." else stringResource(R.string.your_medicine_order_has_been_placed_successfully_the_pharmacy_will_prepare_your_order_shortly))

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp)
                        ) {
                            Text(
                                text = if (isGlobalRequest) "Broadcasted To" else stringResource(R.string.selected_pharmacy),
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = pharmacyName,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (cartState.deliveryAddress.isNotBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "📍 ${cartState.deliveryAddress.take(60)}",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    if (isGlobalRequest) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f)
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Once a pharmacy accepts, you'll receive a confirmation. The pharmacy will then dispatch delivery to your location.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }

                    orderResult?.id?.takeIf { it.isNotBlank() }?.let { orderId ->
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "Request ID: ${orderId.take(8)}",
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.resetOrderSuccess()
                        onNavigateToOrderHistory(if (isGlobalRequest) 1 else 0)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                ) { Text(stringResource(R.string.done)) }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(
                        onClick = {
                            pharmacyPhone
                                ?.takeIf { it.isNotBlank() }
                                ?.let { phone ->
                                    NavigationHelper.openDialer(context, phone)
                                }
                        },
                        enabled = !pharmacyPhone.isNullOrBlank()
                    ) {
                        Text(stringResource(R.string.call_pharmacy))
                    }
                    TextButton(
                        onClick = {
                            viewModel.resetOrderSuccess()
                            onNavigateToOrderHistory(if (isGlobalRequest) 1 else 0)
                        }
                    ) {
                        Text(stringResource(R.string.view_my_orders))
                    }
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.medicine_cart), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep != CheckoutStep.CART) {
                            currentStep = when (currentStep) {
                                CheckoutStep.PAYMENT -> CheckoutStep.ADDRESS
                                CheckoutStep.ADDRESS -> CheckoutStep.CART
                                else -> currentStep
                            }
                        } else {
                            onBackClick()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary, navigationIconContentColor = MaterialTheme.colorScheme.onPrimary)
            )
        }
    ) { padding ->
        if (cartState.items.isEmpty() && !cartState.orderSuccess) {
            // Empty cart
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ShoppingCart, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(80.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(stringResource(R.string.cart_empty), fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(4.dp))
                    Text(stringResource(R.string.add_medicines_from_the_medicine_finder), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = onBackClick,
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                    ) { Text(stringResource(R.string.browse_medicines)) }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // Always show stepper now — global flow also has full steps
                CheckoutStepper(currentStep)
                
                // Cart items
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    when (currentStep) {
                        CheckoutStep.CART -> {
                            // Broadcast info header
                            if (cartState.selectedPharmacyId == "GLOBAL_REQUEST") {
                                item {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.CellTower, null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                            Spacer(Modifier.width(12.dp))
                                            Column {
                                                Text("Medicine Request", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                                Spacer(Modifier.height(4.dp))
                                                Text("Your request will be broadcasted to nearby pharmacies within 15km. A pharmacy will accept and deliver.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSecondaryContainer, lineHeight = 18.sp)
                                            }
                                        }
                                    }
                                }
                            }

                            items(cartState.items) { item ->
                                val itemKey = item.medicine.inventoryItemId ?: item.medicine.id
                                CartItemCard(
                                    item = item,
                                    onQuantityChange = { viewModel.updateCartQuantity(itemKey, it) },
                                    onRemove = { viewModel.removeFromCart(itemKey) }
                                )
                            }
                        }
                        
                        CheckoutStep.ADDRESS -> {
                            // Delivery address step
                            item {
                                Text("Delivery Details", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Spacer(Modifier.height(4.dp))
                                Text("Enter your delivery address so the pharmacy knows where to deliver", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(16.dp))
                                
                                OutlinedTextField(
                                    value = cartState.patientPhone,
                                    onValueChange = { viewModel.setPatientPhone(it) },
                                    label = { Text("Phone Number *") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone),
                                    singleLine = true,
                                    isError = cartState.patientPhone.isBlank(),
                                    leadingIcon = { Icon(Icons.Default.Phone, null) }
                                )
                                Spacer(Modifier.height(12.dp))
                                
                                if (cartState.deliveryAddress.isBlank()) {
                                    com.example.swastik.ui.screens.patient.components.SwiggyAddressEditor(
                                        initialAddress = "",
                                        onAddressSaved = { address ->
                                            viewModel.setDeliveryAddress(address)
                                        }
                                    )
                                } else {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                    ) {
                                        Column(Modifier.padding(16.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.LocationOn, null, tint = SwastikPrimary, modifier = Modifier.size(20.dp))
                                                Spacer(Modifier.width(8.dp))
                                                Text("Delivery Address", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                            }
                                            Spacer(Modifier.height(8.dp))
                                            Text(
                                                text = cartState.deliveryAddress,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Spacer(Modifier.height(8.dp))
                                            TextButton(
                                                onClick = { viewModel.setDeliveryAddress("") },
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("Change Address", color = SwastikPrimary, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        CheckoutStep.PAYMENT -> {
                            item {
                                Text("Confirm & Broadcast", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Spacer(Modifier.height(16.dp))
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Items", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${cartState.totalItems}")
                                        }
                                        Spacer(Modifier.height(8.dp))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Phone", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(cartState.patientPhone)
                                        }
                                        Spacer(Modifier.height(8.dp))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Delivery", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(cartState.deliveryAddress.take(25) + if (cartState.deliveryAddress.length > 25) "..." else "", maxLines = 1)
                                        }
                                        Spacer(Modifier.height(16.dp))
                                        HorizontalDivider()
                                        Spacer(Modifier.height(16.dp))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Estimated MRP", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                            Text("₹${cartState.totalPrice.toInt()}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SwastikPrimary)
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            "Final price will be confirmed by the accepting pharmacy",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }

                                Spacer(Modifier.height(16.dp))

                                // How delivery works
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f))
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Text("What happens next?", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Spacer(Modifier.height(8.dp))
                                        DeliveryStep("1", "Nearby pharmacies within 15km receive your request")
                                        DeliveryStep("2", "A pharmacy accepts and confirms the price")
                                        DeliveryStep("3", "Pharmacy dispatches a delivery agent to your location")
                                        DeliveryStep("4", "Delivery agent receives your address via WhatsApp link")
                                    }
                                }
                            }
                        }
                    }
                }

                // Bottom Actions
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(8.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        cartState.orderError?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            Spacer(Modifier.height(8.dp))
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            if (currentStep != CheckoutStep.CART) {
                                OutlinedButton(
                                    onClick = {
                                        currentStep = when (currentStep) {
                                            CheckoutStep.PAYMENT -> CheckoutStep.ADDRESS
                                            CheckoutStep.ADDRESS -> CheckoutStep.CART
                                            else -> currentStep
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(56.dp),
                                    shape = RoundedCornerShape(14.dp)
                                ) {
                                    Text(stringResource(R.string.back), fontWeight = FontWeight.SemiBold)
                                }
                            }
                            
                            Button(
                                onClick = { 
                                    when (currentStep) {
                                        CheckoutStep.CART -> currentStep = CheckoutStep.ADDRESS
                                        CheckoutStep.ADDRESS -> {
                                            if (cartState.deliveryAddress.isNotBlank() && cartState.patientPhone.isNotBlank()) {
                                                currentStep = CheckoutStep.PAYMENT
                                            }
                                        }
                                        CheckoutStep.PAYMENT -> viewModel.broadcastCartBundle()
                                    }
                                },
                                modifier = Modifier
                                    .weight(if (currentStep != CheckoutStep.CART) 2f else 1f)
                                    .height(56.dp),
                                enabled = !cartState.isOrdering && cartState.items.isNotEmpty() && 
                                          (currentStep != CheckoutStep.ADDRESS || (cartState.deliveryAddress.isNotBlank() && cartState.patientPhone.isNotBlank())),
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                if (cartState.isOrdering) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                                } else {
                                    when (currentStep) {
                                        CheckoutStep.PAYMENT -> {
                                            Icon(Icons.Default.CellTower, null, tint = Color.White)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Broadcast to Pharmacies", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                                        }
                                        else -> {
                                            Text(stringResource(R.string.str_continue), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                            Spacer(Modifier.width(8.dp))
                                            Icon(Icons.Default.ArrowForward, null)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DeliveryStep(step: String, text: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(22.dp)
                .background(SwastikPrimary.copy(alpha = 0.2f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(step, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SwastikPrimary)
        }
        Spacer(Modifier.width(8.dp))
        Text(text, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, lineHeight = 16.sp)
    }
}

@Composable
private fun CartItemCard(
    item: CartItem,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Medication, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(24.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.medicine.name, fontWeight = FontWeight.SemiBold, maxLines = 1)
                Text(item.medicine.price?.toInt()?.let { "₹$it each" } ?: "Price on request", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            // Quantity controls
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { onQuantityChange(item.quantity - 1) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Remove, null, modifier = Modifier.size(18.dp))
                }
                Text(
                    "${item.quantity}",
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
                IconButton(
                    onClick = { onQuantityChange(item.quantity + 1) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.width(4.dp))
            Text("₹${item.totalPrice.toInt()}", fontWeight = FontWeight.Bold, color = SwastikPrimary)
            IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Close, "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
            }
        }
    }
}
