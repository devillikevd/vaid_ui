package com.example.swastik.ui.screens.patient.diagnostic

import android.Manifest
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.DiagnosticCenterDto
import com.example.swastik.data.remote.dto.DiagnosticTestDto
import com.example.swastik.ui.viewmodel.DiagnosticViewModel
import java.util.Locale
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import com.example.swastik.ui.components.shimmerEffect
import androidx.compose.material3.MaterialTheme

private val DiagnosticAccent = Color(0xFF00695C)
private val DiagnosticAccentLight = Color(0xFFE0F2F1)
private val DiagnosticAccentDark = Color(0xFF004D40)

/**
 * Diagnostic Booking Screen — search centers, view tests, and book.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticBookingScreen(
    onBackClick: () -> Unit,
    initialCenterId: String? = null,
    onNavigateToBookingHistory: () -> Unit = {},
    viewModel: DiagnosticViewModel = hiltViewModel(),
    patientDashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = hiltViewModel()
) {
    val patientProfile by patientDashboardViewModel.patientProfile.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var filterHomeCollection by remember { mutableStateOf(false) }
    var showBookingDialog by remember { mutableStateOf(false) }
    var isPrescriptionBooking by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        patientDashboardViewModel.loadDashboard()
    }

    // DC3: Use location-aware search on initial load when possible
    val context = LocalContext.current
    LaunchedEffect(initialCenterId) {
        if (!initialCenterId.isNullOrBlank()) {
            viewModel.openCenter(initialCenterId)
            return@LaunchedEffect
        }

        val hasLocationPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasLocationPermission) {
            try {
                val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as? LocationManager
                val location = locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (location != null) {
                    viewModel.findNearbyCenters(location.latitude, location.longitude)
                } else {
                    viewModel.searchCenters()
                }
            } catch (_: SecurityException) {
                viewModel.searchCenters()
            }
        } else {
            viewModel.searchCenters()
        }
    }

    // Booking success dialog
    if (uiState.bookingSuccess) {
        AlertDialog(
            onDismissRequest = {
                viewModel.resetBooking()
                onBackClick()
            },
            icon = { Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(48.dp)) },
            title = { Text(stringResource(R.string.request_submitted), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.booking_request_sent)) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.resetBooking()
                        onBackClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DiagnosticAccent)
                ) { Text(stringResource(R.string.done)) }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        viewModel.resetBooking()
                        onNavigateToBookingHistory()
                    }
                ) {
                    Text(stringResource(R.string.view_my_tests))
                }
            }
        )
    }

    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.diagnostic_centers), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DiagnosticAccent, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.searchCenters(it)
                },
                placeholder = { Text(stringResource(R.string.search_centers_tests)) },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
            
            // Filters
            if (uiState.selectedCenter == null) {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                    FilterChip(
                        selected = filterHomeCollection,
                        onClick = { filterHomeCollection = !filterHomeCollection },
                        label = { Text("Home Collection Available") },
                        leadingIcon = if (filterHomeCollection) {
                            { Icon(Icons.Default.Check, contentDescription = "Checked", modifier = Modifier.size(16.dp)) }
                        } else null
                    )
                }
            }

            if (uiState.isLoading) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    repeat(5) {
                        Card(
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            shape = RoundedCornerShape(12.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Row(modifier = Modifier.fillMaxSize().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(64.dp).clip(RoundedCornerShape(8.dp)).shimmerEffect())
                                Spacer(modifier = Modifier.width(16.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Box(modifier = Modifier.fillMaxWidth(0.7f).height(16.dp).clip(RoundedCornerShape(4.dp)).shimmerEffect())
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Box(modifier = Modifier.fillMaxWidth(0.4f).height(12.dp).clip(RoundedCornerShape(4.dp)).shimmerEffect())
                                }
                            }
                        }
                    }
                }
            } else if (uiState.selectedCenter != null) {
                // Show tests for selected center
                CenterTestsView(
                    center = uiState.selectedCenter!!,
                    tests = uiState.tests,
                    selectedTest = uiState.selectedTest,
                    onTestSelect = { viewModel.selectTest(it) },
                    onBookClick = { 
                        isPrescriptionBooking = false
                        viewModel.selectPrescription(null)
                        showBookingDialog = true 
                    },
                    onPrescriptionUploadClick = { prescriptionId ->
                        isPrescriptionBooking = true
                        viewModel.selectPrescription(prescriptionId)
                        showBookingDialog = true
                    },
                    onBackToList = {
                        viewModel.searchCenters(searchQuery)
                        viewModel.resetBooking()
                    },
                    patientDashboardViewModel = patientDashboardViewModel
                )
            } else {
                // Show centers list
                val displayCenters = if (filterHomeCollection) {
                    uiState.centers.filter { it.homeCollectionAvailable == true }
                } else {
                    uiState.centers
                }
                
                if (displayCenters.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Biotech, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(stringResource(R.string.no_diagnostic_centers), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(displayCenters) { center ->
                            CenterCard(center = center, onClick = { viewModel.selectCenter(center) })
                        }
                    }
                }
            }
        }
    }

    // Booking Dialog
    if (showBookingDialog && (uiState.selectedTest != null || isPrescriptionBooking)) {
        DiagnosticBookingFlow(
            testName = uiState.selectedTest?.name,
            testPrice = uiState.selectedTest?.price,
            isPrescriptionBooking = isPrescriptionBooking,
            prescriptionId = uiState.selectedPrescriptionId,
            initialPhone = patientProfile?.phoneNumber ?: "",
            onDismiss = { showBookingDialog = false },
            onConfirm = { date, time, colType, address, phone, prescId ->
                viewModel.bookTest(
                    bookingDate = date,
                    bookingTime = time,
                    collectionType = colType,
                    collectionAddress = address,
                    patientPhone = phone,
                    prescriptionId = prescId
                )
                showBookingDialog = false
                onNavigateToBookingHistory()
            }
        )
    }
    // Error snackbar
    uiState.error?.let { error ->
        LaunchedEffect(error) {
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
            viewModel.clearError()
        }
    }

}

@Composable
private fun CenterCard(center: DiagnosticCenterDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF7C3AED).copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Science,
                        contentDescription = null,
                        tint = Color(0xFF7C3AED),
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = center.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Text(
                        text = stringResource(R.string.diagnostic_center),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        center.rating?.let {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFC107),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = " ${String.format(Locale.US, "%.1f", it)} (${center.totalReviews ?: 0})",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                        }
                        center.distance?.let {
                            Icon(
                                Icons.Outlined.LocationOn,
                                contentDescription = null,
                                tint = DiagnosticAccent,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = " ${String.format(Locale.US, "%.1f", it)} km",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.Top) {
                Icon(
                    Icons.Outlined.Place,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = center.address ?: "Address not available",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (!center.specialties.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(center.specialties!!.take(3)) { spec ->
                        Box(
                            modifier = Modifier
                                .background(
                                    Color(0xFF7C3AED).copy(alpha = 0.1f),
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(text = spec, fontSize = 11.sp, color = Color(0xFF7C3AED))
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CenterTestsView(
    center: DiagnosticCenterDto,
    tests: List<DiagnosticTestDto>,
    selectedTest: DiagnosticTestDto?,
    onTestSelect: (DiagnosticTestDto) -> Unit,
    onBookClick: () -> Unit,
    onPrescriptionUploadClick: (String?) -> Unit,
    onBackToList: () -> Unit,
    patientDashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel? = null,
    onNavigateToBookingHistory: () -> Unit = {}
) {
    var isUploading by remember { mutableStateOf(false) }
    var uploadSuccess by remember { mutableStateOf(false) }
    var showRecordsSheet by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    var selectedUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var selectedPrescriptionId by remember { mutableStateOf<String?>(null) }
    
    val galleryLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.OpenDocument()
    ) { uri: android.net.Uri? ->
        uri?.let {
            selectedUri = it
            selectedPrescriptionId = null
            isUploading = true
            coroutineScope.launch {
                kotlinx.coroutines.delay(1500)
                isUploading = false
                uploadSuccess = true
            }
        }
    }
    
    val cameraLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            selectedPrescriptionId = null
            isUploading = true
            coroutineScope.launch {
                kotlinx.coroutines.delay(1500)
                isUploading = false
                uploadSuccess = true
            }
        }
    }

    var showCameraPermissionRationale by remember { mutableStateOf(false) }
    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            try { cameraLauncher.launch(null) } catch (e: Exception) { e.printStackTrace() }
        } else {
            showCameraPermissionRationale = true
        }
    }

    if (showCameraPermissionRationale) {
        AlertDialog(
            onDismissRequest = { showCameraPermissionRationale = false },
            title = { Text(stringResource(R.string.permission_required)) },
            text = { Text(stringResource(R.string.camera_permission_is_required_to)) },
            confirmButton = {
                TextButton(onClick = { showCameraPermissionRationale = false }) {
                    Text(stringResource(R.string.ok_1))
                }
            }
        )
    }

    if (showRecordsSheet) {
        ModalBottomSheet(onDismissRequest = { showRecordsSheet = false }) {
            val uiState by patientDashboardViewModel?.uiState?.collectAsState() ?: remember { mutableStateOf(null) }
            val prescriptions = uiState?.dashboard?.recentPrescriptions ?: emptyList()
            
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth().verticalScroll(rememberScrollState())) {
                Text(stringResource(R.string.select_a_prescription_record), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                if (prescriptions.isEmpty()) {
                    Text(stringResource(R.string.no_records_found), color = Color.Gray)
                } else {
                    prescriptions.forEach { testRecord ->
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                                showRecordsSheet = false
                                selectedPrescriptionId = testRecord.id
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
                                Text(testRecord.doctor?.name ?: "Prescription", fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.date_format, testRecord.createdAt), fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Center header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackToList) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back to list")
            }
            Text(center.name, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

        if (tests.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.no_tests_available), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(tests) { test ->
                    TestCard(
                        test = test,
                        isSelected = selectedTest?.id == test.id,
                        onSelect = { onTestSelect(test) }
                    )
                }
            }

            // Book button
            if (selectedTest != null) {
                Button(
                    onClick = onBookClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DiagnosticAccent),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.EventAvailable, null)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.book_test_name, selectedTest.name), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
            
            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            Text(
                stringResource(R.string.or_order_via_prescription),
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            if (isUploading) {
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = DiagnosticAccent)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(stringResource(R.string.uploading_1), color = DiagnosticAccent)
                }
            } else if (uploadSuccess) {
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.uploaded_successfully), color = Color(0xFF4CAF50), fontWeight = FontWeight.SemiBold)
                }
                LaunchedEffect(Unit) {
                    kotlinx.coroutines.delay(1000)
                    onPrescriptionUploadClick(selectedPrescriptionId)
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).padding(bottom = 8.dp)
                ) {
                    OutlinedButton(
                        onClick = { galleryLauncher.launch(arrayOf("image/*", "application/pdf")) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, DiagnosticAccent)
                    ) {
                        Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = DiagnosticAccent, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.gallery), color = DiagnosticAccent, fontSize = 11.sp)
                    }
                    OutlinedButton(
                        onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, DiagnosticAccent)
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, tint = DiagnosticAccent, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.camera), color = DiagnosticAccent, fontSize = 11.sp)
                    }
                    OutlinedButton(
                        onClick = { showRecordsSheet = true },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, DiagnosticAccent)
                    ) {
                        Icon(Icons.Default.Folder, contentDescription = null, tint = DiagnosticAccent, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.records), color = DiagnosticAccent, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun TestCard(
    test: DiagnosticTestDto,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Card(
        onClick = { onSelect() },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        colors = CardDefaults.cardColors(
            containerColor = DiagnosticAccentLight
        )
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (!test.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = test.imageUrl,
                        contentDescription = test.name,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize().padding(4.dp)
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = test.name.take(1).uppercase(),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = DiagnosticAccent.copy(alpha = 0.5f)
                        )
                    }
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(test.name, fontWeight = FontWeight.SemiBold, color = DiagnosticAccentDark)
                test.category?.let { Text(it, color = DiagnosticAccent.copy(alpha = 0.7f), fontSize = 12.sp) }
                val turnaroundLabel = test.reportTime
                    ?: test.turnaroundHours?.let { hours ->
                        if (hours == 24) "24 hours" else "$hours hours"
                    }
                turnaroundLabel?.let { Text(stringResource(R.string.report_in, it), color = DiagnosticAccent.copy(alpha = 0.7f), fontSize = 12.sp) }
                test.sampleType?.let { Text(stringResource(R.string.sample_label, it), color = DiagnosticAccent.copy(alpha = 0.7f), fontSize = 12.sp) }
            }
            test.price?.let {
                Text(stringResource(R.string.rupee_format, it.toInt().toString()), fontWeight = FontWeight.Bold, color = DiagnosticAccent, fontSize = 16.sp)
            }
            Spacer(Modifier.width(8.dp))
            if (isSelected) {
                Icon(Icons.Default.CheckCircle, null, tint = DiagnosticAccent, modifier = Modifier.size(24.dp))
            } else {
                Icon(Icons.Outlined.RadioButtonUnchecked, null, tint = DiagnosticAccent.copy(alpha = 0.4f), modifier = Modifier.size(24.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticBookingFlow(
    testName: String?,
    testPrice: Float?,
    isPrescriptionBooking: Boolean,
    prescriptionId: String?,
    initialPhone: String,
    onDismiss: () -> Unit,
    onConfirm: (bookingDate: String, bookingTime: String?, collectionType: String, collectionAddress: String?, patientPhone: String?, prescriptionId: String?) -> Unit
) {
    var currentStep by remember { mutableIntStateOf(1) }
    var bookingDate by remember { mutableStateOf("") }
    var bookingTime by remember { mutableStateOf("") }
    var collectionType by remember { mutableStateOf("walk_in") }
    var collectionAddress by remember { mutableStateOf("") }
    var patientPhone by remember { mutableStateOf(initialPhone) }
    
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                TopAppBar(
                    title = {
                        val titleText = when (currentStep) {
                            1 -> "Select Date & Time"
                            2 -> "Collection Details"
                            3 -> "Confirm Booking"
                            else -> "Book Test"
                        }
                        Text(titleText, fontWeight = FontWeight.Bold)
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            if (currentStep > 1) {
                                currentStep--
                            } else {
                                onDismiss()
                            }
                        }) {
                            Icon(Icons.Default.ArrowBack, "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = DiagnosticAccent, titleContentColor = Color.White, navigationIconContentColor = Color.White)
                )

                // Stepper
                BookingStepperRedesigned(currentVisualStep = currentStep, isPrescription = false)

                // Content
                Box(modifier = Modifier.weight(1f).padding(16.dp)) {
                    when (currentStep) {
                        1 -> {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                if (isPrescriptionBooking) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.UploadFile, contentDescription = null, tint = DiagnosticAccent)
                                        Spacer(Modifier.width(8.dp))
                                        Text(stringResource(R.string.prescription_uploaded), fontWeight = FontWeight.Bold, color = DiagnosticAccent)
                                    }
                                } else {
                                    Text(stringResource(R.string.test_label, testName ?: ""), fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                                    testPrice?.let {
                                        Text(stringResource(R.string.price_format, it.toInt().toString()), color = DiagnosticAccent, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    }
                                }
                                
                                OutlinedTextField(
                                    value = bookingDate,
                                    onValueChange = { },
                                    label = { Text(stringResource(R.string.select_date)) },
                                    modifier = Modifier.fillMaxWidth().clickable { showDatePicker = true },
                                    enabled = false,
                                    trailingIcon = {
                                        IconButton(onClick = { showDatePicker = true }) {
                                            Icon(Icons.Outlined.CalendarMonth, contentDescription = "Pick Date", tint = DiagnosticAccent)
                                        }
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        disabledTextColor = MaterialTheme.colorScheme.onSurface,
                                        disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                        disabledBorderColor = MaterialTheme.colorScheme.outline,
                                        disabledTrailingIconColor = DiagnosticAccent
                                    ),
                                    singleLine = true
                                )
                                OutlinedTextField(
                                    value = bookingTime,
                                    onValueChange = { },
                                    label = { Text(stringResource(R.string.select_time)) },
                                    modifier = Modifier.fillMaxWidth().clickable { showTimePicker = true },
                                    enabled = false,
                                    trailingIcon = {
                                        IconButton(onClick = { showTimePicker = true }) {
                                            Icon(Icons.Outlined.AccessTime, contentDescription = "Pick Time", tint = DiagnosticAccent)
                                        }
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        disabledTextColor = MaterialTheme.colorScheme.onSurface,
                                        disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                        disabledBorderColor = MaterialTheme.colorScheme.outline,
                                        disabledTrailingIconColor = DiagnosticAccent
                                    ),
                                    singleLine = true
                                )
                            }
                        }
                        2 -> {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text(stringResource(R.string.collection_type), fontWeight = FontWeight.Medium, fontSize = 16.sp)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = collectionType == "walk_in",
                                        onClick = { collectionType = "walk_in" },
                                        label = { Text(stringResource(R.string.walk_in)) }
                                    )
                                    FilterChip(
                                        selected = collectionType == "home_collection",
                                        onClick = { collectionType = "home_collection" },
                                        label = { Text(stringResource(R.string.home_collection)) }
                                    )
                                }
                                
                                if (collectionType == "home_collection") {
                                    OutlinedTextField(
                                        value = patientPhone,
                                        onValueChange = { patientPhone = it },
                                        label = { Text(stringResource(R.string.phone_number) + " *") },
                                        modifier = Modifier.fillMaxWidth(),
                                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone),
                                        singleLine = true,
                                        isError = patientPhone.isBlank()
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    
                                    if (collectionAddress.isBlank()) {
                                        com.example.swastik.ui.screens.patient.components.SwiggyAddressEditor(
                                            initialAddress = "",
                                            onAddressSaved = { address ->
                                                collectionAddress = address
                                            }
                                        )
                                    } else {
                                        androidx.compose.material3.Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
                                            colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                                            elevation = androidx.compose.material3.CardDefaults.cardElevation(defaultElevation = 2.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(16.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.LocationOn, tint = DiagnosticAccent, contentDescription = null)
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Text(
                                                    text = collectionAddress,
                                                    modifier = Modifier.weight(1f),
                                                    fontSize = 14.sp
                                                )
                                                TextButton(
                                                    onClick = { collectionAddress = "" },
                                                    modifier = Modifier.padding(start = 8.dp)
                                                ) {
                                                    Text(stringResource(R.string.change_address), color = DiagnosticAccent, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        3 -> {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("Order Summary", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Date & Time", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("$bookingDate, ${if(bookingTime.isNotBlank()) bookingTime else "Anytime"}", fontWeight = FontWeight.Medium)
                                        }
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Collection Type", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(if (collectionType == "walk_in") "Walk In" else "Home Collection", fontWeight = FontWeight.Medium)
                                        }
                                        if (collectionType == "home_collection") {
                                            HorizontalDivider(Modifier.padding(vertical = 4.dp))
                                            Text("Delivery Address", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                            Text(collectionAddress, fontSize = 14.sp)
                                            Text(patientPhone, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Bottom Bar Action
                BottomAppBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Button(
                        onClick = {
                            if (currentStep == 3) {
                                onConfirm(
                                    bookingDate,
                                    if(bookingTime.isNotBlank()) bookingTime else null,
                                    collectionType,
                                    if (collectionType == "home_collection") collectionAddress else null,
                                    if (collectionType == "home_collection") patientPhone else null,
                                    if (isPrescriptionBooking) prescriptionId else null
                                )
                            }
                            else if (currentStep == 1 && bookingDate.isNotBlank()) currentStep++
                            else if (currentStep == 2 && (collectionType == "walk_in" || (collectionAddress.isNotBlank() && patientPhone.isNotBlank()))) currentStep++
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DiagnosticAccent),
                        enabled = when (currentStep) {
                            1 -> bookingDate.isNotBlank()
                            2 -> collectionType == "walk_in" || (collectionAddress.isNotBlank() && patientPhone.isNotBlank())
                            else -> true
                        }
                    ) {
                        Text(if (currentStep == 3) stringResource(R.string.confirm_booking) else "Continue", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }

    // DatePicker Dialog
    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val calendar = java.util.Calendar.getInstance().apply { timeInMillis = millis }
                        bookingDate = String.format(
                            Locale.US,
                            "%04d-%02d-%02d",
                            calendar.get(java.util.Calendar.YEAR),
                            calendar.get(java.util.Calendar.MONTH) + 1,
                            calendar.get(java.util.Calendar.DAY_OF_MONTH)
                        )
                    }
                    showDatePicker = false
                }) { Text(stringResource(R.string.ok), color = DiagnosticAccent) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.cancel)) }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // TimePicker Dialog
    if (showTimePicker) {
        val timePickerState = rememberTimePickerState()
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text(stringResource(R.string.select_time)) },
            text = {
                TimePicker(state = timePickerState)
            },
            confirmButton = {
                TextButton(onClick = {
                    bookingTime = String.format(Locale.US, "%02d:%02d", timePickerState.hour, timePickerState.minute)
                    showTimePicker = false
                }) { Text(stringResource(R.string.ok), color = DiagnosticAccent) }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) { Text(stringResource(R.string.cancel)) }
            }
        )
    }
}

@Composable
private fun BookingStepperRedesigned(currentVisualStep: Int, isPrescription: Boolean) {
    val stepLabels = listOf("Time", "Address", "Confirm")

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
