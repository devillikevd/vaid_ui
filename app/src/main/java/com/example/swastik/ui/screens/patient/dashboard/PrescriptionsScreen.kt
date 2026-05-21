package com.example.swastik.ui.screens.patient.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DateRange
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.LocalHospital
import androidx.compose.material.icons.outlined.LocalPharmacy
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Medication
import androidx.compose.material.icons.outlined.NearMe
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Rule
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.MedicalFacility
import com.example.swastik.data.model.Prescription
import com.example.swastik.data.model.PrescriptionItem
import com.example.swastik.ui.theme.SwastikPurple
import com.example.swastik.ui.viewmodel.RecordsViewModel
import com.example.swastik.utils.NavigationHelper
import java.time.LocalDate
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun PrescriptionsScreen(
    onBackClick: () -> Unit = {},
    onPrescriptionClick: ((Prescription) -> Unit)? = null,
    onNavigateToOrderHistory: () -> Unit = {},
    viewModel: RecordsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val prescriptions = uiState.prescriptions
    var selectedFilter by remember { mutableStateOf("All") }
    var selectedPrescription by remember { mutableStateOf<Prescription?>(null) }
    val filters = listOf("All", "Active", "Completed")
    val filteredPrescriptions = remember(prescriptions, selectedFilter) {
        prescriptions.filter { prescriptionMatchesFilter(it, selectedFilter) }
    }

    selectedPrescription?.let { prescription ->
        PrescriptionDetailScreen(
            prescription = prescription,
            onBackClick = { selectedPrescription = null },
            onNavigateToOrderHistory = onNavigateToOrderHistory,
            viewModel = viewModel
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.my_prescriptions), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SwastikPurple),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${prescriptions.size}",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "${prescriptions.count { prescriptionMatchesFilter(it, "Active") }} active prescriptions",
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                    Icon(
                        Icons.Outlined.Receipt,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.size(60.dp)
                    )
                }
            }

            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filters) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SwastikPurple,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SwastikPurple)
                    }
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Outlined.Warning,
                            contentDescription = null,
                            tint = Color.LightGray,
                            modifier = Modifier.size(80.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Unable to Load Prescriptions",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            uiState.error ?: "Something went wrong while loading your prescriptions.",
                            fontSize = 14.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }
                filteredPrescriptions.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Outlined.Receipt,
                            contentDescription = null,
                            tint = Color.LightGray,
                            modifier = Modifier.size(80.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            if (prescriptions.isEmpty()) "No Prescriptions Yet" else "No Prescriptions in This Filter",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Your real prescriptions from completed consultations will appear here.",
                            fontSize = 14.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filteredPrescriptions) { prescription ->
                            PrescriptionListCard(
                                prescription = prescription,
                                onClick = {
                                    if (onPrescriptionClick != null) {
                                        onPrescriptionClick(prescription)
                                    } else {
                                        selectedPrescription = prescription
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PrescriptionListCard(prescription: Prescription, onClick: () -> Unit) {
    val medicineCount = prescription.medicines.orEmpty().size

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(SwastikPurple.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Medication,
                        contentDescription = null,
                        tint = SwastikPurple,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = prescription.doctor?.name ?: "Doctor prescription",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                    Text(
                        text = prescription.doctor?.specialization ?: "Consultation prescription",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = prescription.createdAt.take(10),
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = prescriptionStatusContainerColor(prescription)
                    ) {
                        Text(
                            text = prescriptionStatusLabel(prescription),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = prescriptionStatusTextColor(prescription),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 12.dp),
                color = Color.LightGray.copy(alpha = 0.5f)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.LocalHospital,
                    contentDescription = null,
                    tint = SwastikPurple,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = prescription.diagnosis.ifBlank { "Prescription details" },
                    fontSize = 13.sp,
                    color = Color.Black
                )
            }

            if (medicineCount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    prescription.medicines.orEmpty().take(3).forEach { medicine ->
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color(0xFFF5F5F5)
                        ) {
                            Text(
                                text = medicine.medicineName.split(" ").first(),
                                fontSize = 11.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                    if (medicineCount > 3) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = SwastikPurple.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = "+${medicineCount - 3}",
                                fontSize = 11.sp,
                                color = SwastikPurple,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun PrescriptionDetailScreen(
    prescription: Prescription,
    onBackClick: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    viewModel: RecordsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val canForwardToPharmacy = isPrescriptionForwardable(prescription)
    var showForwardSheet by remember(prescription.id) { mutableStateOf(false) }
    var selectedPharmacyId by remember(prescription.id) { mutableStateOf<String?>(null) }
    var selectedPharmacyName by remember(prescription.id) { mutableStateOf<String?>(null) }
    var selectedPharmacyPhone by remember(prescription.id) { mutableStateOf<String?>(null) }
    var pharmacyQuery by remember(prescription.id) { mutableStateOf("") }
    var deliveryAddress by remember(prescription.id) { mutableStateOf("") }

    androidx.compose.runtime.LaunchedEffect(showForwardSheet, uiState.patientDefaultDeliveryAddress) {
        if (showForwardSheet && deliveryAddress.isBlank() && !uiState.patientDefaultDeliveryAddress.isNullOrBlank()) {
            deliveryAddress = uiState.patientDefaultDeliveryAddress.orEmpty()
        }
    }

    uiState.prescriptionForwardSuccess?.let { successState ->
        AlertDialog(
            onDismissRequest = {
                viewModel.clearPrescriptionForwardSuccess()
                showForwardSheet = false
                viewModel.clearPrescriptionPharmacies()
            },
            icon = {
                Icon(
                    Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(36.dp)
                )
            },
            title = { Text(stringResource(R.string.sent_to_pharmacy), fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(successState.message)

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = SwastikPurple.copy(alpha = 0.08f)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp)
                        ) {
                            Text(
                                text = "Selected Pharmacy",
                                fontSize = 12.sp,
                                color = SwastikPurple
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = selectedPharmacyName ?: "Chosen pharmacy",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.Black
                            )
                            selectedPharmacyPhone
                                ?.takeIf { it.isNotBlank() }
                                ?.let { phone ->
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = phone,
                                        fontSize = 12.sp,
                                        color = Color.Gray
                                    )
                                }
                        }
                    }

                    if (!successState.orderId.isNullOrBlank()) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFFF5F5F5)
                        ) {
                            Text(
                                text = "Order ID: ${successState.orderId.take(8)}",
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                fontSize = 13.sp,
                                color = Color.Black,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearPrescriptionForwardSuccess()
                        showForwardSheet = false
                        viewModel.clearPrescriptionPharmacies()
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = SwastikPurple)
                ) {
                    Text(stringResource(R.string.done))
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(
                        onClick = {
                            selectedPharmacyPhone
                                ?.takeIf { it.isNotBlank() }
                                ?.let { phone ->
                                    NavigationHelper.openDialer(context, phone)
                                }
                        },
                        enabled = !selectedPharmacyPhone.isNullOrBlank()
                    ) {
                        Text(stringResource(R.string.call_pharmacy))
                    }
                    TextButton(
                        onClick = {
                            viewModel.clearPrescriptionForwardSuccess()
                            showForwardSheet = false
                            viewModel.clearPrescriptionPharmacies()
                            onNavigateToOrderHistory()
                        }
                    ) {
                        Text(stringResource(R.string.view_my_orders))
                    }
                }
            }
        )
    }

    if (showForwardSheet) {
        ModalBottomSheet(
            onDismissRequest = {
                showForwardSheet = false
                viewModel.clearPrescriptionForwardError()
                viewModel.clearPrescriptionPharmacies()
            }
        ) {
            ForwardPrescriptionSheet(
                pharmacies = uiState.prescriptionPharmacies,
                isLoading = uiState.loadingPrescriptionPharmacies,
                sourceLabel = uiState.prescriptionPharmacySourceLabel,
                pharmacyLookupError = uiState.prescriptionPharmacyError,
                forwardError = uiState.prescriptionForwardError,
                selectedPharmacyId = selectedPharmacyId,
                searchQuery = pharmacyQuery,
                deliveryAddress = deliveryAddress,
                isSubmitting = uiState.forwardingPrescription,
                onSearchQueryChange = { query ->
                    pharmacyQuery = query
                    if (query.isBlank() || query.length >= 2) {
                        viewModel.loadPrescriptionPharmacies(query)
                    }
                },
                onSelectPharmacy = { pharmacy ->
                    selectedPharmacyId = pharmacy.id
                    selectedPharmacyName = pharmacy.name
                    selectedPharmacyPhone = pharmacy.phone
                },
                onDeliveryAddressChange = { deliveryAddress = it },
                onSubmit = {
                    viewModel.forwardPrescriptionToPharmacy(
                        prescriptionId = prescription.id,
                        pharmacyId = selectedPharmacyId.orEmpty(),
                        pharmacyName = selectedPharmacyName ?: "selected pharmacy",
                        deliveryAddress = deliveryAddress
                    )
                }
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.prescription_details), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        android.widget.Toast.makeText(
                            context,
                            "Prescription download not available yet",
                            android.widget.Toast.LENGTH_SHORT
                        ).show()
                    }) {
                        Icon(Icons.Outlined.Download, contentDescription = "Download")
                    }
                    IconButton(onClick = {
                        val shareText = buildString {
                            append("Prescription from ${prescription.doctor?.name ?: "your doctor"}\n")
                            append("Date: ${prescription.createdAt.take(10)}\n")
                            append("Diagnosis: ${prescription.diagnosis}\n")
                            prescription.medicines.orEmpty().forEachIndexed { index, item ->
                                append("${index + 1}. ${item.medicineName} - ${item.dosage} - ${item.frequency}\n")
                            }
                            if (!prescription.instructions.isNullOrBlank()) {
                                append("Instructions: ${prescription.instructions}\n")
                            }
                        }
                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                        }
                        context.startActivity(
                            android.content.Intent.createChooser(shareIntent, "Share Prescription")
                        )
                    }) {
                        Icon(Icons.Outlined.Share, contentDescription = "Share")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape)
                                .background(SwastikPurple.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Medication,
                                contentDescription = null,
                                tint = SwastikPurple,
                                modifier = Modifier.size(30.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = prescription.doctor?.name ?: "Doctor prescription",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Black
                            )
                            Text(
                                text = prescription.doctor?.specialization ?: "Consultation prescription",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Outlined.CalendarMonth,
                                    contentDescription = null,
                                    tint = SwastikPurple,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = prescription.createdAt.take(10),
                                    fontSize = 12.sp,
                                    color = SwastikPurple
                                )
                            }
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.LocalHospital,
                            contentDescription = null,
                            tint = Color(0xFF1976D2),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Diagnosis",
                                fontSize = 12.sp,
                                color = Color(0xFF1976D2)
                            )
                            Text(
                                text = prescription.diagnosis.ifBlank { "Prescription details" },
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF0D47A1)
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = prescriptionStatusContainerColor(prescription))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.Verified,
                            contentDescription = null,
                            tint = prescriptionStatusTextColor(prescription),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Status",
                                fontSize = 12.sp,
                                color = prescriptionStatusTextColor(prescription)
                            )
                            Text(
                                text = prescriptionStatusLabel(prescription),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = prescriptionStatusTextColor(prescription)
                            )
                        }
                    }
                }
            }

            if (prescription.medicines.orEmpty().isNotEmpty()) {
                item {
                    PrescriptionForwardCard(
                        canForwardToPharmacy = canForwardToPharmacy,
                        onSendToPharmacy = {
                            selectedPharmacyId = null
                            selectedPharmacyName = null
                            selectedPharmacyPhone = null
                            pharmacyQuery = ""
                            deliveryAddress = ""
                            showForwardSheet = true
                            viewModel.clearPrescriptionForwardError()
                            viewModel.loadPrescriptionPharmacies()
                        }
                    )
                }
            }

            item {
                Text(
                    text = "Prescribed Medicines",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }

            if (prescription.medicines.isNullOrEmpty()) {
                item {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.White
                    ) {
                        Text(
                            text = "No medicines were attached to this prescription.",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                }
            } else {
                items(prescription.medicines.orEmpty()) { medicine ->
                    MedicineDetailCard(medicine)
                }
            }

            if (!prescription.notes.isNullOrBlank()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF8E1))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                Icons.Outlined.Info,
                                contentDescription = null,
                                tint = Color(0xFFFF9800),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Doctor's Notes",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFE65100)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = prescription.notes.orEmpty(),
                                    fontSize = 13.sp,
                                    color = Color(0xFF5D4037)
                                )
                            }
                        }
                    }
                }
            }

            if (!prescription.instructions.isNullOrBlank()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                Icons.Outlined.Rule,
                                contentDescription = null,
                                tint = Color(0xFF2E7D32),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Instructions",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF2E7D32)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = prescription.instructions.orEmpty(),
                                    fontSize = 13.sp,
                                    color = Color(0xFF1B5E20)
                                )
                            }
                        }
                    }
                }
            }

            if (prescription.followUpDate != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SwastikPurple.copy(alpha = 0.1f))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Outlined.Event,
                                contentDescription = null,
                                tint = SwastikPurple,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Follow-up Appointment",
                                    fontSize = 12.sp,
                                    color = SwastikPurple
                                )
                                Text(
                                    text = prescription.followUpDate,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SwastikPurple
                                )
                            }
                        }
                    }
                }
            }

            if (prescription.validUntil != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Outlined.Schedule,
                                contentDescription = null,
                                tint = Color.Gray,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Valid Until",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                                Text(
                                    text = prescription.validUntil,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.Black
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun PrescriptionForwardCard(
    canForwardToPharmacy: Boolean,
    onSendToPharmacy: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (canForwardToPharmacy) Color(0xFFF1F8E9) else Color(0xFFF5F5F5)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.LocalPharmacy,
                    contentDescription = null,
                    tint = if (canForwardToPharmacy) Color(0xFF2E7D32) else Color.Gray,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Send To Pharmacy",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = if (canForwardToPharmacy) {
                            "Choose a medical store and send this prescription directly."
                        } else {
                            "Only active prescriptions with medicines can be sent to a pharmacy."
                        },
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = onSendToPharmacy,
                enabled = canForwardToPharmacy,
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = SwastikPurple,
                    disabledContainerColor = Color.LightGray
                )
            ) {
                Text(stringResource(R.string.choose_pharmacy))
            }
        }
    }
}

@Composable
private fun ForwardPrescriptionSheet(
    pharmacies: List<MedicalFacility>,
    isLoading: Boolean,
    sourceLabel: String?,
    pharmacyLookupError: String?,
    forwardError: String?,
    selectedPharmacyId: String?,
    searchQuery: String,
    deliveryAddress: String,
    isSubmitting: Boolean,
    onSearchQueryChange: (String) -> Unit,
    onSelectPharmacy: (MedicalFacility) -> Unit,
    onDeliveryAddressChange: (String) -> Unit,
    onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .padding(bottom = 24.dp)
    ) {
        Text(
            text = "Send Prescription",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Black
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Pick a pharmacy and optionally add a delivery address.",
            fontSize = 13.sp,
            color = Color.Gray
        )

        if (!sourceLabel.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = SwastikPurple.copy(alpha = 0.08f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.NearMe,
                        contentDescription = null,
                        tint = SwastikPurple,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = sourceLabel,
                        fontSize = 12.sp,
                        color = SwastikPurple,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text(stringResource(R.string.search_pharmacy_by_name)) },
            leadingIcon = {
                Icon(Icons.Outlined.Search, contentDescription = null, tint = Color.Gray)
            },
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = SwastikPurple,
                unfocusedBorderColor = Color.LightGray
            )
        )

        if (!pharmacyLookupError.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFFEBEE)
            ) {
                Text(
                    text = pharmacyLookupError,
                    modifier = Modifier.padding(12.dp),
                    fontSize = 12.sp,
                    color = Color(0xFFC62828)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = SwastikPurple)
                }
            }

            pharmacies.isEmpty() -> {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White
                ) {
                    Text(
                        text = "No pharmacies available for this search yet.",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        fontSize = 13.sp,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 280.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(pharmacies, key = { it.id }) { pharmacy ->
                        PharmacySelectionCard(
                            pharmacy = pharmacy,
                            isSelected = selectedPharmacyId == pharmacy.id,
                            onClick = { onSelectPharmacy(pharmacy) }
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = deliveryAddress,
            onValueChange = onDeliveryAddressChange,
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
            placeholder = {
                Text(
                    if (deliveryAddress.isBlank()) "Delivery address (optional)"
                    else deliveryAddress
                )
            },
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = SwastikPurple,
                unfocusedBorderColor = Color.LightGray
            )
        )

        if (!forwardError.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFFEBEE)
            ) {
                Text(
                    text = forwardError,
                    modifier = Modifier.padding(12.dp),
                    fontSize = 12.sp,
                    color = Color(0xFFC62828)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onSubmit,
            enabled = !isSubmitting && !selectedPharmacyId.isNullOrBlank(),
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = SwastikPurple)
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    color = Color.White,
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Text(stringResource(R.string.send_prescription))
            }
        }
    }
}

@Composable
private fun PharmacySelectionCard(
    pharmacy: MedicalFacility,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .border(
                width = if (isSelected) 1.5.dp else 1.dp,
                color = if (isSelected) SwastikPurple else Color(0xFFE0E0E0),
                shape = RoundedCornerShape(14.dp)
            ),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) SwastikPurple.copy(alpha = 0.06f) else Color.White
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.LocalPharmacy,
                    contentDescription = null,
                    tint = if (isSelected) SwastikPurple else Color(0xFF4CAF50),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pharmacy.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                    Text(
                        text = pharmacy.distance,
                        fontSize = 12.sp,
                        color = if (pharmacy.distanceKm > 0.0) SwastikPurple else Color.Gray
                    )
                }
                if (isSelected) {
                    Icon(
                        Icons.Outlined.CheckCircle,
                        contentDescription = null,
                        tint = SwastikPurple,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            if (pharmacy.address.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(
                        Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = pharmacy.address,
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            if (pharmacy.phone.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Call,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = pharmacy.phone,
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}

private fun prescriptionMatchesFilter(prescription: Prescription, filter: String): Boolean {
    val status = (prescription.status ?: "").lowercase()
    return when (filter) {
        "Active" -> {
            prescription.isDispensed != true &&
                status !in setOf("dispensed", "fulfilled", "expired", "cancelled", "completed")
        }
        "Completed" -> {
            prescription.isDispensed == true ||
                status in setOf("dispensed", "fulfilled", "expired", "cancelled", "completed")
        }
        else -> true
    }
}

private fun prescriptionStatusLabel(prescription: Prescription): String {
    val status = if (prescription.isDispensed == true) {
        "dispensed"
    } else {
        prescription.status ?: "active"
    }
    return status.replaceFirstChar { it.uppercase() }
}

private fun prescriptionStatusContainerColor(prescription: Prescription): Color {
    return when (prescriptionStatusLabel(prescription).lowercase()) {
        "active" -> Color(0xFFE8F5E9)
        "dispensed", "fulfilled", "completed" -> Color(0xFFE3F2FD)
        "expired", "cancelled" -> Color(0xFFFFEBEE)
        else -> SwastikPurple.copy(alpha = 0.1f)
    }
}

private fun prescriptionStatusTextColor(prescription: Prescription): Color {
    return when (prescriptionStatusLabel(prescription).lowercase()) {
        "active" -> Color(0xFF2E7D32)
        "dispensed", "fulfilled", "completed" -> Color(0xFF1565C0)
        "expired", "cancelled" -> Color(0xFFC62828)
        else -> SwastikPurple
    }
}

private fun isPrescriptionForwardable(prescription: Prescription): Boolean {
    val status = (prescription.status ?: "active").lowercase()
    val isExpiredByDate = prescription.validUntil
        ?.let { validUntil ->
            runCatching { LocalDate.parse(validUntil).isBefore(LocalDate.now()) }.getOrDefault(false)
        }
        ?: false

    return prescription.medicines.orEmpty().isNotEmpty() &&
        prescription.isDispensed != true &&
        status !in setOf("dispensed", "fulfilled", "expired", "cancelled", "completed") &&
        !isExpiredByDate
}

@Composable
private fun MedicineDetailCard(medicine: PrescriptionItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFFE8F5E9)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.Medication,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50),
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = medicine.medicineName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Medication,
                            contentDescription = null,
                            tint = SwastikPurple,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = medicine.dosage, fontSize = 12.sp, color = Color.Gray)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Schedule,
                            contentDescription = null,
                            tint = SwastikPurple,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = medicine.frequency, fontSize = 12.sp, color = Color.Gray)
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.DateRange,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Duration: ${medicine.duration}",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}
