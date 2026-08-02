package com.example.swastik.ui.screens.patient.medicine
import kotlinx.coroutines.launch
import android.widget.Toast

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import coil.compose.AsyncImage
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.theme.SwastikPrimaryDark
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.ui.components.shimmerEffect

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
    onConfirmOrder: (address: String, phone: String, items: List<Pair<PharmacyInventoryItemDto, Int>>, isPrescription: Boolean, bitmap: android.graphics.Bitmap?) -> Unit,
    patientDashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    var currentStep by remember { mutableIntStateOf(initialStep) }
    var selectedItems by remember { mutableStateOf<List<Pair<PharmacyInventoryItemDto, Int>>>(emptyList()) }
    var deliveryAddress by remember { mutableStateOf("") }
    var patientPhone by remember { mutableStateOf("") }
    var localIsPrescriptionBased by remember { mutableStateOf(isPrescriptionBased) }
    var capturedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }

    val patientProfile by patientDashboardViewModel.patientProfile.collectAsState()
    
    LaunchedEffect(Unit) {
        patientDashboardViewModel.loadDashboard()
        onInventorySearch("")
    }

    LaunchedEffect(patientProfile) {
        if (patientPhone.isBlank() && !patientProfile?.phoneNumber.isNullOrBlank()) {
            patientPhone = patientProfile?.phoneNumber ?: ""
        }
    }

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
                    title = {
                        val titleText = when {
                            localIsPrescriptionBased && currentStep == 3 -> "Delivery Details"
                            localIsPrescriptionBased && currentStep == 4 -> "Confirm Order"
                            else -> "Book Medicines"
                        }
                        Text(titleText, fontWeight = FontWeight.Bold)
                    },
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
                val currentVisualStep = if (!localIsPrescriptionBased) currentStep else currentStep - 2
                BookingStepperRedesigned(currentVisualStep = currentVisualStep, isPrescription = localIsPrescriptionBased)

                // Content
                Box(modifier = Modifier.weight(1f).padding(16.dp)) {
                    when (currentStep) {
                        1 -> Step1Medicines(
                            items = inventoryItems,
                            selected = selectedItems,
                            isInventoryLoading = isInventoryLoading,
                            onAdd = { item, qty -> selectedItems = selectedItems + (item to qty) },
                            onRemove = { item -> selectedItems = selectedItems.filter { it.first.id != item.id } },
                            onSearch = onInventorySearch,
                            onPrescriptionUpload = { bmp ->
                                capturedBitmap = bmp
                                localIsPrescriptionBased = true
                                currentStep = 3
                            },
                            patientDashboardViewModel = patientDashboardViewModel
                        )
                        2 -> Step2Cart(selectedItems, onRemove = { item -> selectedItems = selectedItems.filter { it.first.id != item.id } })
                        3 -> Step3Location(deliveryAddress, patientPhone, onAddressChange = { deliveryAddress = it }, onPhoneChange = { patientPhone = it })
                        4 -> Step4Confirmation(facility, selectedItems, localIsPrescriptionBased, deliveryAddress, patientPhone, capturedBitmap)
                    }
                }

                // Bottom Bar Action
                BottomAppBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Button(
                        onClick = {
                            if (currentStep == 4) onConfirmOrder(deliveryAddress, patientPhone, selectedItems, localIsPrescriptionBased, capturedBitmap)
                            else if (currentStep == 1 && selectedItems.isNotEmpty()) currentStep++
                            else if (currentStep == 2) currentStep++
                            else if (currentStep == 3 && deliveryAddress.isNotBlank() && patientPhone.isNotBlank()) currentStep++
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
fun StepIndicator(step: Int, currentStep: Int, label: String, modifier: Modifier = Modifier) {
    val isCompleted = step < currentStep
    val isActive = step == currentStep
    val color = if (isCompleted || isActive) SwastikPrimary else Color.Gray

    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(androidx.compose.foundation.shape.CircleShape)
                .background(if (isCompleted) SwastikPrimary else Color.Transparent)
                .border(2.dp, color, androidx.compose.foundation.shape.CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step.toString(),
                color = if (isCompleted) Color.White else color,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = if (isActive) SwastikPrimary else Color.Gray,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Step1Medicines(
    items: List<PharmacyInventoryItemDto>,
    selected: List<Pair<PharmacyInventoryItemDto, Int>>,
    isInventoryLoading: Boolean = false,
    onAdd: (PharmacyInventoryItemDto, Int) -> Unit,
    onRemove: (PharmacyInventoryItemDto) -> Unit,
    onSearch: (String) -> Unit,
    onPrescriptionUpload: (android.graphics.Bitmap?) -> Unit,
    patientDashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel? = null
) {
    var query by remember { mutableStateOf("") }
    var isUploading by remember { mutableStateOf(false) }
    var uploadSuccess by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            selectedUri = it
            isUploading = true
            coroutineScope.launch {
                try {
                    val bitmap = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        android.graphics.ImageDecoder.decodeBitmap(android.graphics.ImageDecoder.createSource(context.contentResolver, it))
                    } else {
                        android.provider.MediaStore.Images.Media.getBitmap(context.contentResolver, it)
                    }
                    onPrescriptionUpload(bitmap)
                    uploadSuccess = true
                } catch (e: Exception) { e.printStackTrace() }
                isUploading = false
            }
        }
    }
    
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            isUploading = true
            coroutineScope.launch {
                onPrescriptionUpload(bitmap)
                uploadSuccess = true
                isUploading = false
            }
        }
    }

    var showCameraPermissionRationale by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        if (isGranted) {
            try { cameraLauncher.launch(null) } catch (e: Exception) { e.printStackTrace() }
        } else {
            showCameraPermissionRationale = true
        }
    }

    var showRecordsSheet by remember { mutableStateOf(false) }
    
    if (showCameraPermissionRationale) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showCameraPermissionRationale = false },
            title = { Text(stringResource(R.string.permission_required)) },
            text = { Text(stringResource(R.string.camera_permission_is_required_to)) },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = { showCameraPermissionRationale = false }) {
                    Text(stringResource(R.string.ok_1))
                }
            }
        )
    }

    if (showRecordsSheet) {
        androidx.compose.material3.ModalBottomSheet(onDismissRequest = { showRecordsSheet = false }) {
            val uiState by patientDashboardViewModel?.uiState?.collectAsState() ?: remember { mutableStateOf(null) }
            val prescriptions = uiState?.dashboard?.recentPrescriptions ?: emptyList()
            
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth().verticalScroll(rememberScrollState())) {
                Text(stringResource(R.string.select_a_prescription_record), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                if (prescriptions.isEmpty()) {
                    Text(stringResource(R.string.no_records_found), color = Color.Gray)
                } else {
                    prescriptions.forEach { prescription ->
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                                showRecordsSheet = false
                                // Simulate selection
                                isUploading = true
                                coroutineScope.launch {
                                    kotlinx.coroutines.delay(1500)
                                    isUploading = false
                                    uploadSuccess = true
                                }
                            },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(prescription.diagnosis.takeIf { it.isNotBlank() } ?: prescription.doctor?.name ?: "Prescription", fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.date_format, prescription.createdAt), fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it; onSearch(it) },
            label = { Text(stringResource(R.string.search_medicines_1)) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(modifier = Modifier.weight(1f)) {
            if (isInventoryLoading && items.isEmpty()) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(6) {
                        Card(
                            modifier = Modifier.fillMaxWidth().height(220.dp),
                            shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                Box(modifier = Modifier.fillMaxWidth().height(100.dp).clip(RoundedCornerShape(8.dp)).shimmerEffect())
                                Spacer(modifier = Modifier.height(8.dp))
                                Box(modifier = Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(4.dp)).shimmerEffect())
                                Spacer(modifier = Modifier.height(4.dp))
                                Box(modifier = Modifier.fillMaxWidth(0.5f).height(14.dp).clip(RoundedCornerShape(4.dp)).shimmerEffect())
                            }
                        }
                    }
                }
            } else if (items.isEmpty()) {
                Text(stringResource(R.string.no_medicines_found_1), modifier = Modifier.align(Alignment.Center), color = Color.Gray)
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(items) { item ->
                        val isSelected = selected.any { it.first.id == item.id }
                        val packSize = item.packSize ?: 1
                        val unitType = item.unitType ?: "unit"
                        
                        var showQuantityDialog by remember { mutableStateOf(false) }

                        if (showQuantityDialog) {
                            var quantityText by remember { mutableStateOf("1") }

                            AlertDialog(
                                onDismissRequest = { showQuantityDialog = false },
                                title = { Text(stringResource(R.string.select_quantity)) },
                                text = {
                                    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                                        Text(
                                            text = "Buy Full Unit ($unitType" + if (packSize > 1) " - contains $packSize pieces)" else ")",
                                            modifier = Modifier.padding(bottom = 8.dp),
                                            fontWeight = FontWeight.Bold
                                        )
                                        OutlinedTextField(
                                            value = quantityText,
                                            onValueChange = { quantityText = it },
                                            label = { Text(stringResource(R.string.number_of_units)) },
                                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                                        )
                                    }
                                },
                                confirmButton = {
                                    TextButton(onClick = {
                                        val qty = quantityText.toIntOrNull() ?: 1
                                        onAdd(item, qty)
                                        showQuantityDialog = false
                                    }) {
                                        Text(stringResource(R.string.add))
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showQuantityDialog = false }) {
                                        Text(stringResource(R.string.cancel))
                                    }
                                }
                            )
                        }

                        Card(
                            onClick = { if (isSelected) onRemove(item) else showQuantityDialog = true },
                            modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Max),
                            shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(100.dp)
                                        .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                                ) {
                                    if (!item.imageUrl.isNullOrBlank()) {
                                        AsyncImage(
                                            model = item.imageUrl,
                                            contentDescription = item.displayName,
                                            contentScale = ContentScale.Fit,
                                            modifier = Modifier.fillMaxSize().padding(8.dp)
                                        )
                                    } else {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = item.displayName.take(1).uppercase(),
                                                fontSize = 40.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = SwastikPrimary.copy(alpha = 0.5f)
                                            )
                                        }
                                    }
                                    if (isSelected) {
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = "Selected",
                                            tint = SwastikPrimary,
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(4.dp)
                                                .size(24.dp)
                                                .background(Color.White, CircleShape)
                                        )
                                    } else {
                                        Icon(
                                            Icons.Outlined.AddCircleOutline,
                                            contentDescription = "Add",
                                            tint = SwastikPrimary,
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(4.dp)
                                                .size(24.dp)
                                                .background(Color.White, CircleShape)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(item.displayName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = SwastikPrimaryDark, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(stringResource(R.string.rupee_format, (item.price ?: 0).toString()), color = SwastikPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(stringResource(R.string.pack_format, packSize.toString(), unitType), fontSize = 11.sp, color = Color.Gray)
                                Text(stringResource(R.string.stock_format, (item.quantity ?: 0).toString()), fontSize = 11.sp, color = if ((item.quantity ?: 0) > 0) Color(0xFF4CAF50) else Color.Red)
                            }
                        }
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(stringResource(R.string.or_order_via_prescription), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))
        
        if (isUploading) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = SwastikPrimary)
                Spacer(modifier = Modifier.width(12.dp))
                Text(stringResource(R.string.uploading_1), color = SwastikPrimary)
            }
        } else if (uploadSuccess) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50))
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.uploaded_successfully), color = Color(0xFF4CAF50), fontWeight = FontWeight.SemiBold)
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = { galleryLauncher.launch(arrayOf("image/*", "application/pdf")) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(stringResource(R.string.gallery), fontSize = 11.sp)
                }
                OutlinedButton(
                    onClick = { permissionLauncher.launch(android.Manifest.permission.CAMERA) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(stringResource(R.string.camera), fontSize = 11.sp)
                }
                OutlinedButton(
                    onClick = { showRecordsSheet = true },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Folder, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(stringResource(R.string.records), fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
fun Step2Cart(selected: List<Pair<PharmacyInventoryItemDto, Int>>, onRemove: (PharmacyInventoryItemDto) -> Unit) {
    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
        Text(stringResource(R.string.your_cart), fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            selected.forEach { (item, qty) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.displayName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            val itemTotalPrice = (item.price ?: 0f) * qty
                            Text(stringResource(R.string.units_total_format, qty, "%.2f".format(item.price ?: 0f), "%.2f".format(itemTotalPrice)), color = SwastikPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        IconButton(
                            onClick = { onRemove(item) },
                            modifier = Modifier.background(Color.Red.copy(alpha = 0.1f), androidx.compose.foundation.shape.CircleShape)
                        ) { 
                            Icon(Icons.Default.Delete, tint = Color.Red, contentDescription = "Remove") 
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun Step3Location(address: String, phone: String, onAddressChange: (String) -> Unit, onPhoneChange: (String) -> Unit) {
    Column(modifier = Modifier.verticalScroll(androidx.compose.foundation.rememberScrollState())) {
        Text(stringResource(R.string.delivery_details), fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        if (address.isBlank()) {
            com.example.swastik.ui.screens.patient.components.HomeAddressEditor(
                initialAddress = "",
                onAddressSaved = onAddressChange
            )
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.LocationOn, tint = SwastikPrimary, contentDescription = null)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = address,
                        modifier = Modifier.weight(1f),
                        fontSize = 14.sp
                    )
                    TextButton(
                        onClick = { onAddressChange("") },
                        modifier = Modifier.padding(start = 8.dp)
                    ) {
                        Text(stringResource(R.string.change_address), color = SwastikPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = onPhoneChange,
            label = { Text(stringResource(R.string.phone_number_1)) },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone),
            singleLine = true,
            isError = phone.isBlank()
        )
    }
}

@Composable
fun Step4Confirmation(
    facility: MedicalFacility, 
    selected: List<Pair<PharmacyInventoryItemDto, Int>>, 
    isPrescription: Boolean, 
    address: String, 
    phone: String,
    bitmap: android.graphics.Bitmap?
) {
    // qty is in units. Total price = unit price * qty
    val totalPrice = selected.sumOf { (item, qty) ->
        val price = (item.price ?: 0f).toDouble()
        price * qty.toDouble()
    }
    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
        Text(stringResource(R.string.review_order), fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(stringResource(R.string.pharmacy_name_format, facility.name), fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                if (isPrescription) {
                    Text(stringResource(R.string.order_method_prescription_uploaded), color = SwastikPrimary, fontWeight = FontWeight.Bold)
                } else {
                    Text(stringResource(R.string.items_count_format, selected.size), color = SwastikPrimary)
                    val total = totalPrice
                    Text(stringResource(R.string.total_amount_format, "%.2f".format(total)), fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(stringResource(R.string.delivery_address_format, address), fontSize = 14.sp)
                Text(stringResource(R.string.phone_number_format, phone), fontSize = 14.sp)
            }
        }
        if (isPrescription) {
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, tint = Color(0xFF4CAF50), contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.prescription_verified_for_processing))
            }
            if (bitmap != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Attached Prescription:", fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(8.dp))
                androidx.compose.foundation.Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "Prescription",
                    modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}


@Composable
private fun BookingStepperRedesigned(currentVisualStep: Int, isPrescription: Boolean) {
    val stepLabels = if (!isPrescription) {
        listOf("Medicines", "Cart", "Location", "Confirm")
    } else {
        listOf("Location", "Confirm")
    }

    val StepperGreen = Color(0xFF00796B)
    val StepperGray = Color(0xFFE0E0E0)
    val StepperTextGray = Color(0xFF9E9E9E)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        stepLabels.forEachIndexed { index, label ->
            val stepNumber = index + 1
            val isCompleted = stepNumber < currentVisualStep
            val isActive = stepNumber == currentVisualStep

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .then(
                            if (!isCompleted && !isActive) {
                                Modifier.border(1.dp, StepperTextGray, CircleShape)
                                        .background(MaterialTheme.colorScheme.surface)
                            } else {
                                Modifier.background(StepperGreen)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            Icons.Outlined.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    } else {
                        Text(
                            "$stepNumber",
                            color = if (isActive) Color.White else StepperTextGray,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = label,
                    fontSize = 11.sp,
                    fontWeight = if (isActive || isCompleted) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (isActive || isCompleted) StepperGreen else StepperTextGray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (index < stepLabels.lastIndex) {
                Box(
                    modifier = Modifier
                        .weight(0.6f)
                        .height(3.dp)
                        .offset(y = (-8).dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (stepNumber < currentVisualStep) StepperGreen
                            else StepperGray
                        )
                )
            }
        }
    }
}

