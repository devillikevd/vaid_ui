package com.example.swastik.ui.screens.patient.medicine

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.ui.theme.SwastikPrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PharmacyBookingFlow(
    facility: MedicalFacility,
    initialStep: Int = 1,
    isPrescriptionBased: Boolean = false,
    inventoryItems: List<PharmacyInventoryItemDto> = emptyList(),
    isInventoryLoading: Boolean = false,
    onInventorySearch: (String) -> Unit = {},
    onDismiss: () -> Unit,
    onConfirmOrder: (address: String, phone: String, items: List<PharmacyInventoryItemDto>, isPrescription: Boolean) -> Unit
) {
    var currentStep by remember { mutableIntStateOf(initialStep) }
    var selectedItems by remember { mutableStateOf<List<PharmacyInventoryItemDto>>(emptyList()) }
    var deliveryAddress by remember { mutableStateOf("") }
    var patientPhone by remember { mutableStateOf("") }
    var localIsPrescriptionBased by remember { mutableStateOf(isPrescriptionBased) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                TopAppBar(
                    title = { Text(if (localIsPrescriptionBased) "Upload Prescription" else "Book Medicines", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = {
                            if (currentStep > 1 && !(localIsPrescriptionBased && currentStep == 3)) {
                                currentStep--
                            } else {
                                onDismiss()
                            }
                        }) {
                            Icon(Icons.Default.ArrowBack, "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = SwastikPrimary, titleContentColor = Color.White, navigationIconContentColor = Color.White)
                )

                // Steps Progress
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    if (!localIsPrescriptionBased) {
                        StepIndicator(step = 1, currentStep = currentStep, label = "Medicines")
                        StepIndicator(step = 2, currentStep = currentStep, label = "Cart")
                    }
                    StepIndicator(step = 3, currentStep = currentStep, label = "Location")
                    StepIndicator(step = 4, currentStep = currentStep, label = "Confirm")
                }

                // Content
                Box(modifier = Modifier.weight(1f).padding(16.dp)) {
                    when (currentStep) {
                        1 -> Step1Medicines(
                            items = inventoryItems,
                            selected = selectedItems,
                            onAdd = { selectedItems = selectedItems + it },
                            onRemove = { selectedItems = selectedItems - it },
                            onSearch = onInventorySearch,
                            onPrescriptionUpload = {
                                localIsPrescriptionBased = true
                                currentStep = 3
                            }
                        )
                        2 -> Step2Cart(selectedItems, onRemove = { selectedItems = selectedItems - it })
                        3 -> Step3Location(deliveryAddress, patientPhone, onAddressChange = { deliveryAddress = it }, onPhoneChange = { patientPhone = it })
                        4 -> Step4Confirmation(facility, selectedItems, localIsPrescriptionBased, deliveryAddress, patientPhone)
                    }
                }

                // Bottom Bar Action
                BottomAppBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Button(
                        onClick = {
                            if (currentStep < 4) {
                                currentStep++
                            } else {
                                onConfirmOrder(deliveryAddress, patientPhone, selectedItems, localIsPrescriptionBased)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                        enabled = when (currentStep) {
                            1 -> selectedItems.isNotEmpty()
                            2 -> selectedItems.isNotEmpty()
                            3 -> deliveryAddress.isNotBlank() && patientPhone.isNotBlank()
                            else -> true
                        }
                    ) {
                        Text(if (currentStep == 4) "Place Order" else "Continue", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun StepIndicator(step: Int, currentStep: Int, label: String) {
    val color = if (step <= currentStep) SwastikPrimary else Color.Gray
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(modifier = Modifier.size(24.dp).clip(androidx.compose.foundation.shape.CircleShape).background(color), contentAlignment = Alignment.Center) {
            Text(step.toString(), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        Text(label, fontSize = 10.sp, color = color)
    }
}

@Composable
fun Step1Medicines(
    items: List<PharmacyInventoryItemDto>,
    selected: List<PharmacyInventoryItemDto>,
    onAdd: (PharmacyInventoryItemDto) -> Unit,
    onRemove: (PharmacyInventoryItemDto) -> Unit,
    onSearch: (String) -> Unit,
    onPrescriptionUpload: () -> Unit
) {
    var query by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it; onSearch(it) },
            label = { Text("Search Medicines") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(modifier = Modifier.weight(1f)) {
            if (items.isEmpty()) {
                Text("No medicines found.", modifier = Modifier.align(Alignment.Center), color = Color.Gray)
            } else {
                LazyColumn {
                    items(items) { item ->
                        val isSelected = selected.contains(item)
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.displayName, fontWeight = FontWeight.Bold)
                                Text("₹${item.price ?: 0}", color = SwastikPrimary)
                            }
                            if (isSelected) {
                                IconButton(onClick = { onRemove(item) }) { Icon(Icons.Default.RemoveCircle, tint = Color.Red, contentDescription = "Remove") }
                            } else {
                                IconButton(onClick = { onAdd(item) }) { Icon(Icons.Default.AddCircle, tint = SwastikPrimary, contentDescription = "Add") }
                            }
                        }
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))
        
        Text("Or Order via Prescription", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = onPrescriptionUpload,
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Gallery/Camera", fontSize = 12.sp)
            }
            OutlinedButton(
                onClick = onPrescriptionUpload,
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Folder, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("App Records", fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun Step2Cart(selected: List<PharmacyInventoryItemDto>, onRemove: (PharmacyInventoryItemDto) -> Unit) {
    Column {
        Text("Your Cart", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        LazyColumn {
            items(selected) { item ->
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.displayName, fontWeight = FontWeight.Bold)
                        Text("₹${item.price ?: 0}", color = SwastikPrimary)
                    }
                    IconButton(onClick = { onRemove(item) }) { Icon(Icons.Default.Delete, tint = Color.Red, contentDescription = "Remove") }
                }
            }
        }
    }
}

@Composable
fun Step3Location(address: String, phone: String, onAddressChange: (String) -> Unit, onPhoneChange: (String) -> Unit) {
    Column {
        Text("Delivery Details", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = address,
            onValueChange = onAddressChange,
            label = { Text("Delivery Address *") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = onPhoneChange,
            label = { Text("Phone Number *") },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun Step4Confirmation(facility: MedicalFacility, selected: List<PharmacyInventoryItemDto>, isPrescription: Boolean, address: String, phone: String) {
    Column {
        Text("Review Order", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Pharmacy: ${facility.name}", fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                if (isPrescription) {
                    Text("Order Method: Prescription Uploaded", color = SwastikPrimary, fontWeight = FontWeight.Bold)
                } else {
                    Text("Items: ${selected.size}", color = SwastikPrimary)
                    val total = selected.sumOf { (it.price ?: 0f).toDouble() }
                    Text("Total: ₹$total", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text("Delivery Address:\n$address", fontSize = 14.sp)
                Text("Phone:\n$phone", fontSize = 14.sp)
            }
        }
        if (isPrescription) {
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, tint = Color(0xFF4CAF50), contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Prescription verified for processing.")
            }
        }
    }
}
