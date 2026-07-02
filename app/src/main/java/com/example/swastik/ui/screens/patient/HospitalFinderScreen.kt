package com.example.swastik.ui.screens.patient

import androidx.compose.ui.graphics.graphicsLayer

import android.Manifest
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.example.swastik.ui.screens.patient.components.shimmerEffect
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.*
import com.example.swastik.data.remote.dto.ClinicDoctorDto
import com.example.swastik.data.remote.dto.PharmacyInventoryItemDto
import com.example.swastik.ui.viewmodel.HospitalFinderViewModel
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.utils.NavigationHelper
import com.example.swastik.ui.components.OsmMapView
import com.example.swastik.ui.components.MapMarkerData
import org.osmdroid.util.GeoPoint
import androidx.compose.ui.res.stringResource
import com.example.swastik.R
import androidx.compose.material3.MaterialTheme

private const val DEFAULT_DISCOVERY_RADIUS_KM = 10f
private const val MAX_DISCOVERY_RADIUS_KM = 25f

// ==================== MAIN SCREEN ====================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HospitalFinderScreen(
    initialFacilityType: FacilityType? = null,
    focusedFacilityId: String? = null,
    focusedFacilityName: String? = null,
    onBackClick: () -> Unit,
    onDoctorBookClick: (HospitalDoctor, MedicalFacility) -> Unit = { _, _ -> },
    onHospitalClick: (String) -> Unit = {},
    onClinicClick: (String) -> Unit = {},
    onPharmacyDetailClick: (String) -> Unit = {},
    onDiagnosticDetailClick: (String) -> Unit = {},
    onMedicineClick: (String) -> Unit = {},
    onNavigateToCart: () -> Unit = {},
    onNavigateToOrders: () -> Unit = {},
    onNavigateToDiagnosticBooking: (String?) -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    isDarkMode: Boolean = false,
    viewModel: HospitalFinderViewModel = hiltViewModel(),
    medicineViewModel: MedicineViewModel = hiltViewModel()
) {
    @Suppress("UNUSED_VARIABLE")
    val _unusedOnMedicineClick = onMedicineClick
    val appContext = LocalContext.current
    val requestedFocusFacilityId = focusedFacilityId?.takeIf { it.isNotBlank() }
    val requestedFocusFacilityName = focusedFacilityName?.takeIf { it.isNotBlank() }
    var selectedFacilityTypeOverride by remember { mutableStateOf<FacilityType?>(initialFacilityType) }
    
    var showFilterSheet by remember { mutableStateOf(false) }
    var isMapView by remember { mutableStateOf(false) } // Defaulting to List View as requested
    var searchQuery by remember { mutableStateOf("") }
    var hasAutoSwitchedToList by remember { mutableStateOf(false) }
    var isEmergencyMode by remember { mutableStateOf(false) }
    var hasTriggeredFocusedSearch by remember(requestedFocusFacilityId, requestedFocusFacilityName) {
        mutableStateOf(false)
    }

    // Pharmacy Booking Flow States
    var showPharmacyBookingDialog by remember { mutableStateOf(false) }
    var pharmacyBookingIsPrescription by remember { mutableStateOf(false) }

    // Handle back button when in map view
    if (isMapView) {
        BackHandler {
            isMapView = false
        }
    }

    // Filter states
    var distanceFilter by remember { mutableFloatStateOf(DEFAULT_DISCOVERY_RADIUS_KM) }
    var openNowOnly by remember { mutableStateOf(false) }
    var minimumRating by remember { mutableFloatStateOf(0f) }
    var hospitalTypeFilter by remember { mutableStateOf<String?>(null) }
    var emergencyServicesOnly by remember { mutableStateOf(false) }
    var bedsAvailableOnly by remember { mutableStateOf(false) }

    val hospitalState by viewModel.uiState.collectAsState()
    
    // Instead of local state, we use ViewModel state for rotation persistence
    val selectedFacility = hospitalState.selectedFacilityForSheet
    val showBottomSheet = hospitalState.activeSheetType != null
    val facilities = hospitalState.facilities
    val selectedFacilityType = selectedFacilityTypeOverride
    val isDarkSurface = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val resolvedDarkMode = isDarkMode || isDarkSurface
    val screenTitle = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "Hospitals"
        FacilityType.CLINIC -> "Clinics"
        FacilityType.MEDICAL_STORE -> "Medical Stores"
        FacilityType.DIAGNOSTIC_CENTER -> stringResource(R.string.diagnostic_centers)
        null -> "Nearby Care"
    }

    // ===== LOCATION PERMISSION =====
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.fetchLocationAndLoad(selectedFacilityType)
        }
    }

    // Request permission or fetch location on first composition
    LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        
        if (hasFine || hasCoarse) {
            viewModel.fetchLocationAndLoad(selectedFacilityType)
        } else if (!hospitalState.locationAvailable && hospitalState.facilities.isEmpty()) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    val filteredFacilities = facilities.filter { facility ->
        val typeMatch = selectedFacilityType == null || facility.type == selectedFacilityType
        val searchMatch = searchQuery.isEmpty() || facility.name.contains(searchQuery, ignoreCase = true)
        val openMatch = !openNowOnly || facility.isOpen
        val ratingMatch = facility.rating >= minimumRating
        val emergencyMatch = !emergencyServicesOnly || facility.isEmergencyAvailable
        val distanceMatch = facility.distanceKm <= 0.0 || facility.distanceKm <= distanceFilter
        val hospitalTypeMatch = hospitalTypeFilter == null || (
            facility.type == FacilityType.HOSPITAL &&
                facility.hospitalSubType.equals(hospitalTypeFilter, ignoreCase = true)
            )
        val bedsMatch = !bedsAvailableOnly || (facility.bedsAvailable != null && facility.bedsAvailable > 0)

        typeMatch && searchMatch && openMatch && ratingMatch && emergencyMatch && distanceMatch && hospitalTypeMatch && bedsMatch
    }

    // Automatically ensure list view is shown if results are found near user
    LaunchedEffect(hospitalState.isLoading, filteredFacilities.isNotEmpty()) {
        if (!hospitalState.isLoading && filteredFacilities.isNotEmpty() && !hasAutoSwitchedToList) {
            isMapView = false
            hasAutoSwitchedToList = true
        }
    }

    val mappableFacilities = filteredFacilities.filter(::hasValidMapCoordinates)
    val facilitiesMissingMapCoordinates = filteredFacilities.size - mappableFacilities.size

    LaunchedEffect(
        requestedFocusFacilityId,
        requestedFocusFacilityName,
        facilities,
        hospitalState.isLoading
    ) {
        if (requestedFocusFacilityId == null && requestedFocusFacilityName == null) return@LaunchedEffect
        if (hospitalState.isLoading) return@LaunchedEffect

        val targetFacility = facilities.firstOrNull { facility ->
            (requestedFocusFacilityId != null && facility.id == requestedFocusFacilityId) ||
                (requestedFocusFacilityName != null && facility.name.equals(requestedFocusFacilityName, ignoreCase = true))
        }

        if (targetFacility != null) {
            viewModel.openFacilitySheet(targetFacility, targetFacility.type.name)
            isMapView = true
            if (searchQuery != targetFacility.name) {
                searchQuery = targetFacility.name
            }
            hasTriggeredFocusedSearch = true
            return@LaunchedEffect
        }

        if (!hasTriggeredFocusedSearch && !requestedFocusFacilityName.isNullOrBlank()) {
            searchQuery = requestedFocusFacilityName
            hasTriggeredFocusedSearch = true
        }
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Colors based on MaterialTheme
    val colorScheme = MaterialTheme.colorScheme
    val backgroundColor = colorScheme.background
    val surfaceColor = colorScheme.surface
    val textColor = colorScheme.onBackground
    val resetFilters = {
        selectedFacilityTypeOverride = null
        searchQuery = ""
        distanceFilter = hospitalState.activeRadiusKm.toFloat()
        openNowOnly = false
        minimumRating = 0f
        emergencyServicesOnly = false
        hospitalTypeFilter = null
    }

    LaunchedEffect(hospitalState.activeRadiusKm, facilities.size, filteredFacilities.size) {
        val onlyDistanceIsHidingResults =
            facilities.isNotEmpty() &&
                filteredFacilities.isEmpty() &&
                searchQuery.isEmpty() &&
                !openNowOnly &&
                minimumRating == 0f &&
                !emergencyServicesOnly &&
                hospitalTypeFilter == null &&
                distanceFilter < hospitalState.activeRadiusKm.toFloat()

        if (onlyDistanceIsHidingResults) {
            distanceFilter = hospitalState.activeRadiusKm.toFloat()
        }
    }

    // Load initial facilities ONLY once per type change
    LaunchedEffect(selectedFacilityType) {
        if (hospitalState.locationAvailable) {
            viewModel.loadNearbyFacilities(facilityType = selectedFacilityType)
        }
    }

    val bgColor = MaterialTheme.colorScheme.background

    Scaffold(
        containerColor = bgColor,
        topBar = {
            if (isEmergencyMode) {
                EmergencyTopBar(onExitEmergency = { isEmergencyMode = false })
            } else {
                TopAppBar(
                    title = {
                        Text(
                            screenTitle,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp,
                            color = textColor
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            if (isMapView) isMapView = false else onBackClick()
                        }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = textColor
                            )
                        }
                    },
                    actions = {
                        // Emergency Mode Toggle
                        if (selectedFacilityType != FacilityType.MEDICAL_STORE && selectedFacilityType != FacilityType.DIAGNOSTIC_CENTER) {
                            IconButton(onClick = { isEmergencyMode = true }) {
                                Icon(
                                    Icons.Default.LocalHospital,
                                    contentDescription = "Emergency",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        IconButton(onClick = { isMapView = !isMapView }) {
                            Icon(
                                if (isMapView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.Map,
                                contentDescription = "Toggle View",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        IconButton(onClick = onNavigateToNotifications) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = "Notifications",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = backgroundColor)
                )
            }
        }
    ) { paddingValues ->
        if (isEmergencyMode) {
            // Load emergency hospitals from dedicated server endpoint on toggle
            LaunchedEffect(isEmergencyMode) {
                viewModel.loadEmergencyHospitals()
            }
            EmergencyModeContent(
                facilities = hospitalState.emergencyFacilities.ifEmpty {
                    facilities.filter { it.isEmergencyAvailable }
                },
                isLoading = hospitalState.isEmergencyLoading,
                selectedFacilityType = selectedFacilityType,
                onFacilityClick = { 
                    viewModel.openFacilitySheet(it, it.type.name)
                },
                modifier = Modifier.padding(paddingValues)
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                SearchBarSection(
                    selectedFacilityType = selectedFacilityType,
                    searchQuery = searchQuery,
                    onSearchChange = { newQuery ->
                        searchQuery = newQuery
                        // Debounced search is handled by LaunchedEffect below
                        if (newQuery.isEmpty()) {
                            viewModel.searchFacilities("") // restores full list immediately
                        }
                    },
                    onFilterClick = { showFilterSheet = true },
                    isDarkMode = resolvedDarkMode
                )

                // Debounce search: wait 400ms after last keystroke before firing API call
                LaunchedEffect(searchQuery, selectedFacilityType) {
                    if (searchQuery.length >= 3) {
                        kotlinx.coroutines.delay(400L)
                        viewModel.searchFacilities(searchQuery, selectedFacilityType)
                    }
                }



                if (hospitalState.isLoading) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        repeat(4) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(24.dp))
                                    .shimmerEffect(baseColor = MaterialTheme.colorScheme.surfaceVariant, highlightColor = Color.Gray.copy(alpha=0.1f))
                            )
                        }
                    }
                } else if (hospitalState.error != null) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(32.dp)
                        ) {
                            Icon(
                                Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                hospitalState.error ?: "Something went wrong",
                                color = textColor,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.fetchLocationAndLoad(selectedFacilityType) },
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                            ) {
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                } else if (isMapView) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        EnhancedMapView(
                            facilities = mappableFacilities,
                            userLat = hospitalState.userLatitude,
                            userLng = hospitalState.userLongitude,
                            focusedFacilityId = selectedFacility?.id ?: requestedFocusFacilityId,
                            onFacilityClick = { facility ->
                                viewModel.openFacilitySheet(facility, facility.type.name)
                            }
                        )

                        FloatingActionButton(
                            onClick = { viewModel.fetchLocationAndLoad(selectedFacilityType) },
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(16.dp)
                                .padding(bottom = 80.dp), // Adjusted padding since bottom cards are removed
                            containerColor = surfaceColor,
                            contentColor = MaterialTheme.colorScheme.primary
                        ) {
                            Icon(Icons.Default.MyLocation, contentDescription = "My Location")
                        }
                    }
                } else if (filteredFacilities.isEmpty()) {
                    EmptyStateView(
                        selectedFacilityType = selectedFacilityType,
                        activeRadiusKm = hospitalState.activeRadiusKm,
                        onResetFilters = resetFilters,
                        onRefreshNearby = { viewModel.loadNearbyFacilities(facilityType = selectedFacilityType) }
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filteredFacilities) { facility ->
                            FacilityListCard(
                                facility = facility,
                                onClick = {
                                    viewModel.openFacilitySheet(facility, facility.type.name)
                                },
                                isDarkMode = resolvedDarkMode
                            )
                        }
                    }
                }
            }
        }

        // Facility Detail Bottom Sheet
        if (showBottomSheet && selectedFacility != null) {
            val facility = selectedFacility ?: return@Scaffold
            ModalBottomSheet(
                onDismissRequest = { 
                    viewModel.closeFacilitySheet()
                    viewModel.clearPharmacyMedicines()
                    viewModel.clearSelectedHospitalDetails()
                    viewModel.clearClinicDoctors()
                    viewModel.clearPharmacyInventory()
                },
                sheetState = sheetState,
                containerColor = surfaceColor
            ) {
                val sheetFacility = if (facility.type == FacilityType.HOSPITAL) {
                    mergeFacilityDetails(
                        baseFacility = facility,
                        loadedDetails = hospitalState.selectedHospitalDetails?.takeIf { it.id == facility.id }
                    )
                } else {
                    facility
                }
                val cartState by medicineViewModel.cartState.collectAsState()
                cartState.pharmacyConflict?.let { conflict ->
                    AlertDialog(
                        onDismissRequest = { medicineViewModel.resolvePharmacyConflict(false) },
                        title = { Text(stringResource(R.string.change_pharmacy_title), fontWeight = FontWeight.Bold) },
                        text = {
                            Text(stringResource(R.string.pharmacy_conflict_message, conflict.newPharmacyName ?: stringResource(R.string.pharmacy_conflict_fallback)))
                        },
                        confirmButton = {
                            Button(
                                onClick = { medicineViewModel.resolvePharmacyConflict(true) },
                                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
                            ) { Text(stringResource(R.string.clear_and_add)) }
                        },
                        dismissButton = {
                            TextButton(onClick = { medicineViewModel.resolvePharmacyConflict(false) }) { Text(stringResource(R.string.cancel)) }
                        }
                    )
                }

                if (isEmergencyMode && facility.isEmergencyAvailable) {
                    EmergencyFacilityDetailSheet(
                        facility = facility,
                        isDarkMode = resolvedDarkMode
                    )
                } else when (facility.type) {
                    FacilityType.MEDICAL_STORE -> {
                        // Load inventory when pharmacy sheet opens
                        LaunchedEffect(facility.id) {
                            viewModel.loadPharmacyInventory(facility.id)
                            // Pre-set the pharmacy in cart so orders go to this store
                            medicineViewModel.setPharmacy(facility.id, facility.name)
                        }
                        val pharmacyCartState by medicineViewModel.cartState.collectAsState()
                        MedicalStoreDetailSheet(
                            facility = facility,
                            inventoryItems = hospitalState.pharmacyInventory,
                            isInventoryLoading = hospitalState.isPharmacyInventoryLoading,
                            onInventorySearch = { query -> viewModel.loadPharmacyInventory(facility.id, query) },
                            onAddInventoryToCart = { item ->
                                // Convert PharmacyInventoryItemDto → Medicine → add to cart
                                val medicine = Medicine(
                                    id = item.medicineId ?: item.id,
                                    inventoryItemId = item.id,
                                    name = item.displayName,
                                    genericName = null,
                                    manufacturer = item.manufacturer,
                                    price = item.price,
                                    requiresPrescription = item.requiresPrescription ?: false,
                                    category = MedicineCategory.TABLET,
                                    description = null,
                                    inStock = item.inStock,
                                    stockCount = item.quantity ?: 0,
                                    nearbyPharmacy = facility.name,
                                    pharmacyDistance = facility.distance
                                )
                                medicineViewModel.addToCart(medicine, facility.id, facility.name)
                            },
                            cartItemCount = pharmacyCartState.totalItems,
                            onViewCart = {
                                viewModel.closeFacilitySheet()
                                onNavigateToCart()
                            },
                            onViewOrders = {
                                viewModel.closeFacilitySheet()
                                onNavigateToOrders()
                            },
                            onViewDetails = {
                                viewModel.closeFacilitySheet()
                                onPharmacyDetailClick(facility.id)
                            },
                            isDarkMode = resolvedDarkMode,
                            onOpenBookingFlow = { isPrescription ->
                                pharmacyBookingIsPrescription = isPrescription
                                showPharmacyBookingDialog = true
                            }
                        )
                    }
                    FacilityType.HOSPITAL -> {
                        LaunchedEffect(facility.id) {
                            viewModel.loadHospitalDetails(facility.id)
                        }
                        FacilityDetailSheet(
                            facility = sheetFacility,
                            isDetailsLoading = hospitalState.isHospitalDetailsLoading,
                            detailsError = hospitalState.hospitalDetailsError,
                            onDoctorBook = { doctor ->
                                viewModel.closeFacilitySheet()
                                onDoctorBookClick(doctor, sheetFacility)
                            },
                            onBookAppointment = {
                                val preferredDoctor = sheetFacility.doctors.firstOrNull()
                                when {
                                    hospitalState.isHospitalDetailsLoading && preferredDoctor == null -> {
                                        android.widget.Toast.makeText(
                                            appContext,
                                            "Loading hospital doctors...",
                                            android.widget.Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    preferredDoctor != null -> {
                                        viewModel.closeFacilitySheet()
                                        onDoctorBookClick(preferredDoctor, sheetFacility)
                                    }
                                    else -> {
                                        android.widget.Toast.makeText(
                                            appContext,
                                            "No doctors available for booking right now",
                                            android.widget.Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                }
                            },
                            onViewDetails = {
                                viewModel.closeFacilitySheet()
                                onHospitalClick(facility.id)
                            },
                            isDarkMode = resolvedDarkMode
                        )
                    }
                    FacilityType.CLINIC -> {
                        // Load clinic doctors when sheet opens
                        LaunchedEffect(facility.id) {
                            viewModel.loadClinicDoctors(facility.id)
                        }
                        ClinicDetailSheet(
                            facility = facility,
                            clinicDoctors = hospitalState.clinicDoctors,
                            isDoctorsLoading = hospitalState.isClinicDoctorsLoading,
                            onDoctorBook = { doctor ->
                                viewModel.closeFacilitySheet()
                                onDoctorBookClick(doctor, facility)
                            },
                            onViewDetails = {
                                viewModel.closeFacilitySheet()
                                onClinicClick(facility.id)
                            },
                            onBookAppointment = {
                                val preferredDoctor = hospitalState.clinicDoctors.firstOrNull()?.let { doc ->
                                    HospitalDoctor(
                                        id = doc.id,
                                        name = doc.name,
                                        specialization = doc.specialization ?: "Specialization not listed",
                                        experience = doc.experienceYears?.takeIf { it > 0 }?.let { "$it yrs" } ?: "Experience not listed",
                                        rating = doc.resolvedRating,
                                        consultationFee = doc.consultationFee ?: 0
                                    )
                                } ?: facility.doctors.firstOrNull()

                                if (preferredDoctor != null) {
                                    viewModel.closeFacilitySheet()
                                    onDoctorBookClick(preferredDoctor, facility)
                                } else {
                                    android.widget.Toast.makeText(
                                        appContext,
                                        "No doctors available for booking right now",
                                        android.widget.Toast.LENGTH_SHORT
                                    ).show()
                                }
                            },
                            isDarkMode = resolvedDarkMode
                        )
                    }
                    FacilityType.DIAGNOSTIC_CENTER -> {
                        DiagnosticCenterDetailSheet(
                            facility = facility,
                            onBookTest = {
                                viewModel.closeFacilitySheet()
                                onNavigateToDiagnosticBooking(facility.id)
                            },
                            onViewDetails = {
                                viewModel.closeFacilitySheet()
                                onDiagnosticDetailClick(facility.id)
                            },
                            isDarkMode = resolvedDarkMode
                        )
                    }
                }
            }
        }

        // Pharmacy Booking Full-Screen Flow
        if (showPharmacyBookingDialog && selectedFacility != null && selectedFacility?.type == FacilityType.MEDICAL_STORE) {
            com.example.swastik.ui.screens.patient.medicine.PharmacyBookingFlow(
                facility = selectedFacility!!,
                initialStep = if (pharmacyBookingIsPrescription) 3 else 1,
                isPrescriptionBased = pharmacyBookingIsPrescription,
                inventoryItems = hospitalState.pharmacyInventory,
                isInventoryLoading = hospitalState.isPharmacyInventoryLoading,
                onInventorySearch = { query -> viewModel.loadPharmacyInventory(selectedFacility!!.id, query) },
                onDismiss = { showPharmacyBookingDialog = false },
                onConfirmOrder = { address, phone, items, isRx, bitmap ->
                    // Actually place the order via MedicineViewModel
                    medicineViewModel.clearCart()
                    medicineViewModel.setPharmacy(selectedFacility!!.id, selectedFacility!!.name)
                    medicineViewModel.setDeliveryAddress(address)
                    medicineViewModel.setPatientPhone(phone)
                    // If not prescription, add selected items to cart
                    if (!isRx) {
                        items.forEach { (item, orderQuantity) ->
                            val medicine = Medicine(
                                id = item.medicineId ?: item.id,
                                inventoryItemId = item.id,
                                name = item.displayName,
                                manufacturer = item.manufacturer ?: "Unknown",
                                price = item.price,
                                requiresPrescription = item.requiresPrescription ?: false,
                                inStock = true,
                                stockCount = item.quantity ?: 0
                            )
                            medicineViewModel.addToCart(medicine, selectedFacility!!.id, selectedFacility!!.name)
                            medicineViewModel.updateCartQuantity(item.id, orderQuantity)
                        }
                    }
                    medicineViewModel.placeOrder(appContext, bitmap)
                    showPharmacyBookingDialog = false
                    viewModel.closeFacilitySheet()
                    onNavigateToOrders()
                }
            )
        }

        // Filter Bottom Sheet
        if (showFilterSheet) {
            ModalBottomSheet(
                onDismissRequest = { showFilterSheet = false },
                sheetState = filterSheetState,
                containerColor = surfaceColor
            ) {
                FilterBottomSheet(
                    distanceFilter = distanceFilter,
                    onDistanceChange = { distanceFilter = it },
                    openNowOnly = openNowOnly,
                    onOpenNowChange = { openNowOnly = it },
                    minimumRating = minimumRating,
                    onRatingChange = { minimumRating = it },
                    hospitalTypeFilter = hospitalTypeFilter,
                    onHospitalTypeChange = { hospitalTypeFilter = it },
                    emergencyServicesOnly = emergencyServicesOnly,
                    onEmergencyServicesChange = { emergencyServicesOnly = it },
                    bedsAvailableOnly = bedsAvailableOnly,
                    onBedsAvailableChange = { bedsAvailableOnly = it },
                    showHospitalTypeFilter = selectedFacilityType == null || selectedFacilityType == FacilityType.HOSPITAL,
                    onApplyFilters = { 
                        showFilterSheet = false
                        // If user requested a distance greater than currently loaded, trigger a reload
                        if (distanceFilter > hospitalState.activeRadiusKm) {
                            viewModel.loadNearbyFacilities(
                                radius = distanceFilter.toInt(),
                               facilityType = selectedFacilityType
                            )
                        }
                    },
                    isDarkMode = resolvedDarkMode
                )
            }
        }
    }
}

// ==================== 1️⃣ REAL OPENSTREETMAP VIEW ====================
@Composable
private fun EnhancedMapView(
    facilities: List<MedicalFacility>,
    userLat: Double = 0.0,
    userLng: Double = 0.0,
    focusedFacilityId: String? = null,
    onFacilityClick: (MedicalFacility) -> Unit
) {
    // Use actual user GPS location as map center (if available), fallback to facility centroid
    val positionedFacilities = facilities.filter(::hasValidMapCoordinates)
    val focusedFacility = focusedFacilityId?.let { targetId ->
        positionedFacilities.firstOrNull { it.id == targetId }
    }
    val centerLat = focusedFacility?.latitude ?: if (userLat != 0.0) userLat
        else positionedFacilities
            .map { it.latitude }.average().takeIf { !it.isNaN() } ?: 20.5937
    val centerLng = focusedFacility?.longitude ?: if (userLng != 0.0) userLng
        else positionedFacilities
            .map { it.longitude }.average().takeIf { !it.isNaN() } ?: 78.9629

    val mapMarkers = positionedFacilities.map { facility ->
        val color = when (facility.type) {
            FacilityType.HOSPITAL -> android.graphics.Color.parseColor("#D32F2F")       // Red
            FacilityType.CLINIC -> android.graphics.Color.parseColor("#4CAF50")         // Green (matches model)
            FacilityType.MEDICAL_STORE -> android.graphics.Color.parseColor("#2196F3")  // Blue (matches model)
            FacilityType.DIAGNOSTIC_CENTER -> android.graphics.Color.parseColor("#7C3AED") // Purple
        }
        MapMarkerData(
            id = facility.id,
            latitude = facility.latitude,
            longitude = facility.longitude,
            title = facility.name,
            snippet = "${facility.type.name} • ${if (facility.isOpen) "Open" else "Closed"}",
            markerColor = color,
            onClick = { onFacilityClick(facility) }
        )
    }

    OsmMapView(
        modifier = Modifier.fillMaxSize(),
        center = GeoPoint(centerLat, centerLng),
        zoom = when {
            focusedFacility != null -> 15.5
            positionedFacilities.isNotEmpty() -> 13.0
            userLat != 0.0 && userLng != 0.0 -> 14.0
            else -> 5.0
        },
        markers = mapMarkers,
        showUserLocation = userLat != 0.0 && userLng != 0.0,
        userLatitude = userLat,
        userLongitude = userLng
    )
}

// ==================== 2️⃣ ADVANCED FILTER BOTTOM SHEET ====================
@Composable
private fun FilterBottomSheet(
    distanceFilter: Float,
    onDistanceChange: (Float) -> Unit,
    openNowOnly: Boolean,
    onOpenNowChange: (Boolean) -> Unit,
    minimumRating: Float,
    onRatingChange: (Float) -> Unit,
    hospitalTypeFilter: String?,
    onHospitalTypeChange: (String?) -> Unit,
    emergencyServicesOnly: Boolean,
    onEmergencyServicesChange: (Boolean) -> Unit,
    bedsAvailableOnly: Boolean,
    onBedsAvailableChange: (Boolean) -> Unit,
    showHospitalTypeFilter: Boolean,
    onApplyFilters: () -> Unit,
    isDarkMode: Boolean
) {
    val colorScheme = MaterialTheme.colorScheme
    val textColor = colorScheme.onSurface
    val cardColor = colorScheme.primaryContainer

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                stringResource(R.string.filters),
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            TextButton(onClick = {
                onDistanceChange(DEFAULT_DISCOVERY_RADIUS_KM)
                onOpenNowChange(false)
                onRatingChange(0f)
                onHospitalTypeChange(null)
                onEmergencyServicesChange(false)
                onBedsAvailableChange(false)
            }) {
                Text(stringResource(R.string.reset), color = SwastikPrimary)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Distance Slider
        FilterSectionCard(
            icon = Icons.Outlined.Place,
            title = "Distance",
            cardColor = cardColor
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(stringResource(R.string.n_1_km), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${distanceFilter.toInt()} km",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = SwastikPrimary
                    )
                    Text("${MAX_DISCOVERY_RADIUS_KM.toInt()} km", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Slider(
                    value = distanceFilter,
                    onValueChange = onDistanceChange,
                    valueRange = 1f..MAX_DISCOVERY_RADIUS_KM,
                    steps = 23,
                    colors = SliderDefaults.colors(
                        thumbColor = SwastikPrimary,
                        activeTrackColor = SwastikPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Open Now Toggle
        FilterSectionCard(
            icon = Icons.Outlined.AccessTime,
            title = "Open Now",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.show_only_open_facilities),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                )
                Switch(
                    checked = openNowOnly,
                    onCheckedChange = onOpenNowChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = SwastikPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Rating Filter
        FilterSectionCard(
            icon = Icons.Default.Star,
            title = "Minimum Rating",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(0f, 3f, 3.5f, 4f, 4.5f).forEach { rating ->
                    FilterChip(
                        selected = minimumRating == rating,
                        onClick = { onRatingChange(rating) },
                        label = {
                            Text(
                                if (rating == 0f) "All" else "${rating}+",
                                fontSize = 12.sp
                            )
                        },
                        leadingIcon = if (rating > 0f) {
                            {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = if (minimumRating == rating) Color.White else Color(0xFFFFC107)
                                )
                            }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SwastikPrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (showHospitalTypeFilter) {
            Spacer(modifier = Modifier.height(12.dp))

            FilterSectionCard(
                icon = Icons.Outlined.LocalHospital,
                title = "Hospital Type",
                cardColor = cardColor
            ) {
                androidx.compose.foundation.lazy.LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        listOf(null, "Government", "Private", "Multi-Specialty", "General").forEach { type ->
                            FilterChip(
                                selected = hospitalTypeFilter == type,
                                onClick = { onHospitalTypeChange(type) },
                                label = { Text(type ?: "All", fontSize = 13.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SwastikPrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Emergency Services Toggle
        FilterSectionCard(
            icon = Icons.Default.MedicalServices,
            title = "Emergency Services",
            cardColor = cardColor
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.only_with_emergency_services),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                )
                Switch(
                    checked = emergencyServicesOnly,
                    onCheckedChange = onEmergencyServicesChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFFE53935)
                    )
                )
            }
        }

        if (showHospitalTypeFilter) {
            Spacer(modifier = Modifier.height(12.dp))

            // Beds Available Toggle
            FilterSectionCard(
                icon = Icons.Default.Bed,
                title = "Beds Available",
                cardColor = cardColor
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(R.string.only_hospitals_with_available_beds),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.DarkGray
                    )
                    Switch(
                        checked = bedsAvailableOnly,
                        onCheckedChange = onBedsAvailableChange,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = SwastikPrimary
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Apply Filters Button
        Button(
            onClick = onApplyFilters,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Icon(Icons.Default.FilterList, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.apply_filters), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun FilterSectionCard(
    icon: ImageVector,
    title: String,
    cardColor: Color,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = SwastikPrimary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SwastikPrimary
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

// ==================== 3️⃣ HOSPITAL DETAIL BOTTOM SHEET ====================
@Composable
private fun FacilityDetailSheet(
    facility: MedicalFacility,
    onDoctorBook: (HospitalDoctor) -> Unit,
    onBookAppointment: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDetailsLoading: Boolean = false,
    detailsError: String? = null,
    isDarkMode: Boolean
) {
    val textColor = MaterialTheme.colorScheme.onSurface
    val subtextColor = MaterialTheme.colorScheme.onSurfaceVariant
    val cardColor = MaterialTheme.colorScheme.primaryContainer
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                     Icon(
                         imageVector = facility.type.getMarkerIcon(),
                         contentDescription = null,
                         tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                         modifier = Modifier.size(80.dp).align(Alignment.Center)
                     )
                }
            }
        }
        
        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                // Sticky Header Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = facility.type.getMarkerIcon(),
                                        contentDescription = null,
                                        tint = facility.type.getMarkerColor(),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = facility.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = facility.type.getDisplayName(),
                                        fontSize = 14.sp,
                                        color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Rating and Distance
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = Color(0xFFFFC107),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        " ${facility.rating} (${facility.reviewCount} reviews)",
                                        fontSize = 13.sp,
                                        color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)
                                    )
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Outlined.LocationOn,
                                        contentDescription = null,
                                        tint = SwastikPrimary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }
                    }
                }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Action Buttons
        val actionContext = LocalContext.current
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.Call,
                    label = "Call",
                    color = Color(0xFF4CAF50),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(actionContext, facility.phone) }
                )
                QuickActionButton(
                    icon = Icons.Default.Directions,
                    label = "Directions",
                    color = Color(0xFF2196F3),
                    modifier = Modifier.weight(1f),
                    onClick = { NavigationHelper.openDirections(actionContext, facility.latitude, facility.longitude, facility.name) }
                )
                QuickActionButton(
                    icon = androidx.compose.material.icons.Icons.Default.Message,
                    label = "WhatsApp",
                    color = Color(0xFF25D366),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(actionContext, facility.phone) }
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.CalendarMonth,
                    label = stringResource(R.string.book),
                    color = SwastikPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onBookAppointment
                )
                QuickActionButton(
                    icon = Icons.Default.Info,
                    label = "Details",
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                    onClick = onViewDetails
                )
                if (facility.isEmergencyAvailable) {
                    QuickActionButton(
                        icon = Icons.Default.LocalHospital,
                        label = "Emergency",
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                        onClick = { NavigationHelper.openDialer(actionContext, "108") }
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(modifier = Modifier.height(16.dp))

        // Info Cards
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            InfoCard(
                icon = Icons.Outlined.AccessTime,
                title = "Timings",
                value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
            InfoCard(
                icon = Icons.Outlined.Phone,
                title = "Contact",
                value = facility.phone.ifBlank { "N/A" },
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Address Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Outlined.Place,
                    contentDescription = null,
                    tint = SwastikPrimary
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.address),
                        fontSize = 12.sp,
                        color = subtextColor
                    )
                    Text(
                        facility.address,
                        fontSize = 14.sp,
                        color = textColor
                    )
                }
                val dirContext = LocalContext.current
                IconButton(onClick = {
                    NavigationHelper.openDirections(dirContext, facility.latitude, facility.longitude, facility.name)
                }) {
                    Icon(
                        Icons.Default.Directions,
                        contentDescription = "Directions",
                        tint = SwastikPrimary
                    )
                }
            }
        }

        // Emergency Badge
        if (facility.isEmergencyAvailable) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(
                        Color(0xFFE53935).copy(alpha = 0.1f),
                        RoundedCornerShape(12.dp)
                    )
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocalHospital,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        stringResource(R.string.emergency_services_available),
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 14.sp
                    )
                    Text(
                        stringResource(R.string.str_247_emergency_care_with_ambulance),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    )
                }
            }
        }

        if (facility.departments.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.departments),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = textColor,
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(facility.departments) { department ->
                    Box(
                        modifier = Modifier
                            .background(SwastikPrimary.copy(alpha = 0.1f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = department,
                            fontSize = 12.sp,
                            color = SwastikPrimary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        if (facility.type == FacilityType.HOSPITAL && isDetailsLoading && facility.doctors.isEmpty()) {
            Spacer(modifier = Modifier.height(20.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = SwastikPrimary
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = stringResource(R.string.loading_hospital_team),
                    fontSize = 13.sp,
                    color = subtextColor
                )
            }
        }

        if (facility.type == FacilityType.HOSPITAL && detailsError != null && facility.doctors.isEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = detailsError,
                    modifier = Modifier.padding(14.dp),
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // Doctor Listing (only for hospitals and clinics)
        if ((facility.type == FacilityType.HOSPITAL || facility.type == FacilityType.CLINIC) && facility.doctors.isNotEmpty()) {
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = stringResource(R.string.available_doctors),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = textColor,
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                facility.doctors.forEach { doctor ->
                    DoctorCard(
                        doctor = doctor,
                        onBook = { onDoctorBook(doctor) },
                        isDarkMode = isDarkMode
                    )
                }
            }
        } else if (facility.type == FacilityType.HOSPITAL && !isDetailsLoading && detailsError == null) {
            Spacer(modifier = Modifier.height(20.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = stringResource(R.string.no_doctors_listed_at_this),
                    fontSize = 14.sp,
                    color = subtextColor,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = stringResource(R.string.you_can_still_open_details),
                    fontSize = 12.sp,
                    color = subtextColor,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
}

}

private fun mergeFacilityDetails(
    baseFacility: MedicalFacility,
    loadedDetails: MedicalFacility?
): MedicalFacility {
    if (loadedDetails == null) return baseFacility

    return loadedDetails.copy(
        latitude = loadedDetails.latitude.takeIf { it != 0.0 } ?: baseFacility.latitude,
        longitude = loadedDetails.longitude.takeIf { it != 0.0 } ?: baseFacility.longitude,
        distance = if (loadedDetails.distance == "N/A" && baseFacility.distance != "N/A") {
            baseFacility.distance
        } else {
            loadedDetails.distance
        },
        distanceKm = loadedDetails.distanceKm.takeIf { it > 0.0 } ?: baseFacility.distanceKm,
        rating = loadedDetails.rating.takeIf { it > 0f } ?: baseFacility.rating,
        reviewCount = loadedDetails.reviewCount.takeIf { it > 0 } ?: baseFacility.reviewCount,
        phone = loadedDetails.phone.ifBlank { baseFacility.phone },
        isOpen = loadedDetails.isOpen || baseFacility.isOpen,
        isEmergencyAvailable = loadedDetails.isEmergencyAvailable || baseFacility.isEmergencyAvailable,
        specializations = (loadedDetails.specializations + baseFacility.specializations).distinct(),
        hospitalSubType = loadedDetails.hospitalSubType ?: baseFacility.hospitalSubType,
        departments = (loadedDetails.departments + baseFacility.departments).distinct()
    )
}

// ==================== 4️⃣ DOCTOR LISTING CARD ====================
@Composable
private fun DoctorCard(
    doctor: HospitalDoctor,
    onBook: () -> Unit,
    isDarkMode: Boolean
) {
    val isDarkSurface = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val valueColor = if (isDarkSurface) Color(0xFF94A3B8) else Color(0xFF64748B)
    val iconBgColor = if (isDarkSurface) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(iconBgColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (!doctor.profileImageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = doctor.profileImageUrl,
                        contentDescription = "Doctor Image",
                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    Text(doctor.imageEmoji, fontSize = 28.sp)
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Doctor Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = doctor.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 15.sp,
                    color = titleColor
                )
                Text(
                    text = doctor.specialization,
                    fontSize = 13.sp,
                    color = valueColor
                )
                Spacer(modifier = Modifier.height(4.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        tint = Color(0xFFFFC107),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        " ${doctor.rating}",
                        fontSize = 12.sp,
                        color = valueColor
                    )
                    Text(
                        " • ₹${doctor.consultationFee}",
                        fontSize = 12.sp,
                        color = valueColor
                    )
                }
                // Next available slot
                if (doctor.availableSlots.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF4CAF50), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Next: ${doctor.availableSlots.first()}",
                            fontSize = 12.sp,
                            color = Color(0xFF4CAF50),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Book Button
            Button(
                onClick = onBook,
                modifier = Modifier.height(40.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                contentPadding = PaddingValues(horizontal = 20.dp)
            ) {
                Text(stringResource(R.string.book), fontSize = 14.sp)
            }
        }
    }
}

// ==================== 5️⃣ MEDICAL STORE DETAIL SHEET ====================
@Composable
private fun MedicalStoreDetailSheet(
    facility: MedicalFacility,
    inventoryItems: List<PharmacyInventoryItemDto> = emptyList(),
    isInventoryLoading: Boolean = false,
    onInventorySearch: (String) -> Unit = {},
    onAddInventoryToCart: (PharmacyInventoryItemDto) -> Unit = {},
    cartItemCount: Int = 0,
    onViewCart: () -> Unit = {},
    onViewOrders: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDarkMode: Boolean,
    onOpenBookingFlow: (isPrescription: Boolean) -> Unit = {}
) {
    val storeContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) Color.Gray else Color.Gray
    val cardColor = MaterialTheme.colorScheme.primaryContainer

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                     Icon(
                         imageVector = facility.type.getMarkerIcon(),
                         contentDescription = null,
                         tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                         modifier = Modifier.size(80.dp).align(Alignment.Center)
                     )
                }
            }
        }
        
        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                Spacer(modifier = Modifier.height(24.dp))
                // Sticky Header Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.LocalPharmacy,
                                        contentDescription = null,
                                        tint = Color(0xFF4CAF50),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = facility.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = stringResource(R.string.medical_store),
                                        fontSize = 14.sp,
                                        color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Rating and Distance
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = Color(0xFFFFC107),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(" ${facility.rating}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Outlined.LocationOn,
                                        contentDescription = null,
                                        tint = Color(0xFF4CAF50),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }

                        // Features Badges
                        val badges = buildList {
                            if (facility.isOpen) add(Triple(Icons.Default.CheckCircle, "Open Now", Color(0xFF4CAF50)))
                            if (facility.isEmergencyAvailable) add(Triple(Icons.Default.LocalHospital, "Emergency", Color(0xFFE53935)))
                        }
                        if (badges.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(badges.size) { index ->
                                    FeatureBadge(
                                        icon = badges[index].first,
                                        text = badges[index].second,
                                        color = badges[index].third
                                    )
                                }
                            }
                        }
                    }
                }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Actions
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.Call, label = "Call", color = Color(0xFF4CAF50),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) com.example.swastik.utils.NavigationHelper.openDialer(storeContext, facility.phone) }
                )
                QuickActionButton(
                    icon = Icons.Default.Directions, label = "Directions", color = Color(0xFF2196F3),
                    modifier = Modifier.weight(1f),
                    onClick = { com.example.swastik.utils.NavigationHelper.openDirections(storeContext, facility.latitude, facility.longitude, facility.name) }
                )
                QuickActionButton(
                    icon = androidx.compose.material.icons.Icons.Default.Message,
                    label = "WhatsApp",
                    color = Color(0xFF25D366),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) com.example.swastik.utils.NavigationHelper.openWhatsApp(storeContext, facility.phone) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(modifier = Modifier.height(16.dp))

        // Info Cards - Timings & Contact
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            InfoCard(
                icon = Icons.Outlined.AccessTime,
                title = "Timings",
                value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
            InfoCard(
                icon = Icons.Outlined.Phone,
                title = "Contact",
                value = facility.phone.ifBlank { "N/A" },
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Address
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, contentDescription = null, tint = Color(0xFF4CAF50))
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.address), fontSize = 12.sp, color = subtextColor)
                    Text(facility.address, fontSize = 14.sp, color = textColor)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Details Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).clickable { onViewDetails() },
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF2196F3))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(stringResource(R.string.details_about_pharmacy), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColor)
                }
                Icon(Icons.Default.ArrowForwardIos, contentDescription = null, tint = subtextColor, modifier = Modifier.size(16.dp))
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Actions
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Button(
                onClick = { onOpenBookingFlow(false) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Medication, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.book_medicines), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        if (facility.phone.isNotBlank()) {
                            NavigationHelper.openDialer(storeContext, facility.phone)
                        }
                    },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = Brush.linearGradient(listOf(Color(0xFF4CAF50), Color(0xFF4CAF50)))
                    )
                ) {
                    Icon(Icons.Default.Call, contentDescription = null, tint = Color(0xFF4CAF50))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.call_store), color = Color(0xFF4CAF50))
                }
                Button(
                    onClick = {
                        NavigationHelper.openDirections(
                            context = storeContext,
                            destLat = facility.latitude,
                            destLng = facility.longitude,
                            label = facility.name
                        )
                    },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                ) {
                    Icon(Icons.Default.Directions, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.directions))
                }
            }
        }
            }
        }
    }
}

@Composable
private fun FeatureBadge(
    icon: ImageVector,
    text: String,
    color: Color
) {
    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text,
            fontSize = 12.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== PHARMACY INVENTORY CARD ====================
@Composable
private fun PharmacyInventoryCard(
    item: PharmacyInventoryItemDto,
    isDarkMode: Boolean,
    onAddToCart: () -> Unit = {}
) {
    val textColor = if (isDarkMode) Color.White else Color.Black
    val cardColor = MaterialTheme.colorScheme.primaryContainer
    var showAdded by remember { mutableStateOf(false) }

    LaunchedEffect(showAdded) {
        if (showAdded) {
            kotlinx.coroutines.delay(1500)
            showAdded = false
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        if (item.inStock) Color(0xFF4CAF50).copy(alpha = 0.1f)
                        else Color(0xFFE53935).copy(alpha = 0.1f),
                        RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Medication,
                    contentDescription = null,
                    tint = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.displayName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = textColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (item.requiresPrescription == true) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFF9800).copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Text(stringResource(R.string.rx), fontSize = 9.sp, color = Color(0xFFFF9800), fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (item.manufacturer != null) {
                    Text(item.manufacturer, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (item.category != null) {
                        Text(item.category, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(stringResource(R.string.string_1), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(
                        "Stock: ${item.quantity ?: 0} ${item.unit ?: "units"}",
                        fontSize = 11.sp,
                        color = if (item.inStock) Color(0xFF4CAF50) else Color(0xFFE53935)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    item.price?.let { "₹$it" } ?: "Price unavailable",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = textColor
                )
                if (item.mrp != null && item.mrp != item.price) {
                    Text(
                        "MRP ₹${item.mrp}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Normal
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                // Add to Cart button (replaces the old static badge)
                if (item.inStock) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (showAdded) Color(0xFF4CAF50) else SwastikPrimary
                            )
                            .clickable {
                                onAddToCart()
                                showAdded = true
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (showAdded) Icons.Default.Check else Icons.Default.AddShoppingCart,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                if (showAdded) "Added!" else "Add",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(stringResource(R.string.out_of_stock), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

// ==================== CLINIC DETAIL SHEET ====================
@Composable
private fun ClinicDetailSheet(
    facility: MedicalFacility,
    clinicDoctors: List<ClinicDoctorDto> = emptyList(),
    isDoctorsLoading: Boolean = false,
    onDoctorBook: (HospitalDoctor) -> Unit = {},
    onViewDetails: () -> Unit = {},
    onBookAppointment: () -> Unit = {},
    isDarkMode: Boolean
) {
    val clinicContext = LocalContext.current
    val textColor = MaterialTheme.colorScheme.onSurface
    val subtextColor = MaterialTheme.colorScheme.onSurfaceVariant
    val cardColor = MaterialTheme.colorScheme.primaryContainer

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                     Icon(
                         imageVector = facility.type.getMarkerIcon(),
                         contentDescription = null,
                         tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                         modifier = Modifier.size(80.dp).align(Alignment.Center)
                     )
                }
            }
        }
        
        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                Spacer(modifier = Modifier.height(24.dp))
                // Sticky Header Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.MedicalServices, contentDescription = null, tint = Color(0xFF4CAF50), modifier = Modifier.size(28.dp))
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(facility.name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B))
                                    Text(stringResource(R.string.clinic), fontSize = 14.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Rating, Distance
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.rating}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = Color(0xFF4CAF50), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }

                        // Specialization badges
                        if (facility.specializations.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(facility.specializations) { spec ->
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF4CAF50).copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(spec, fontSize = 11.sp, color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }
                }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Actions
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.Call, label = "Call", color = Color(0xFF4CAF50),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(clinicContext, facility.phone) }
                )
                QuickActionButton(
                    icon = Icons.Default.Directions, label = "Directions", color = Color(0xFF2196F3),
                    modifier = Modifier.weight(1f),
                    onClick = { NavigationHelper.openDirections(clinicContext, facility.latitude, facility.longitude, facility.name) }
                )
                QuickActionButton(
                    icon = androidx.compose.material.icons.Icons.Default.Message,
                    label = "WhatsApp",
                    color = Color(0xFF25D366),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(clinicContext, facility.phone) }
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.CalendarMonth, label = stringResource(R.string.book), color = SwastikPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onBookAppointment
                )
                QuickActionButton(
                    icon = Icons.Default.Info,
                    label = "Details",
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                    onClick = onViewDetails
                )
                Spacer(modifier = Modifier.weight(1f))
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(modifier = Modifier.height(16.dp))

        // Info Cards - Timings & Contact
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            InfoCard(
                icon = Icons.Outlined.AccessTime,
                title = "Timings",
                value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
            InfoCard(
                icon = Icons.Outlined.Phone,
                title = "Contact",
                value = facility.phone.ifBlank { "N/A" },
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Address
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, contentDescription = null, tint = Color(0xFF4CAF50))
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.address), fontSize = 12.sp, color = subtextColor)
                    Text(facility.address, fontSize = 14.sp, color = textColor)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Clinic Doctors
        Text(
            stringResource(R.string.available_doctors),
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = textColor,
            modifier = Modifier.padding(horizontal = 20.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isDoctorsLoading) {
            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF4CAF50))
            }
        } else if (clinicDoctors.isEmpty() && facility.doctors.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(stringResource(R.string.string_2), fontSize = 32.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text(stringResource(R.string.no_doctors_listed_at_this_clinic_yet), fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
        } else {
            // Show dynamically loaded clinic doctors (deduplicated)
            val apiDoctorIds = clinicDoctors.map { it.id }.toSet()
            val embeddedDoctors = facility.doctors.filter { it.id !in apiDoctorIds }

            LazyColumn(
                modifier = Modifier.heightIn(max = 350.dp),
                contentPadding = PaddingValues(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // API-loaded clinic doctors (preferred source)
                items(clinicDoctors) { doc ->
                    val hospitalDoctor = HospitalDoctor(
                        id = doc.id,
                        name = doc.name,
                        specialization = doc.specialization ?: "Specialization not listed",
                        experience = doc.experienceYears?.takeIf { it > 0 }?.let { "$it yrs" } ?: "Experience not listed",
                        rating = doc.resolvedRating,
                        consultationFee = doc.consultationFee ?: 0
                    )
                    DoctorCard(doctor = hospitalDoctor, onBook = { onDoctorBook(hospitalDoctor) }, isDarkMode = isDarkMode)
                }
                // Embedded doctors not already returned by API
                items(embeddedDoctors) { doctor ->
                    DoctorCard(doctor = doctor, onBook = { onDoctorBook(doctor) }, isDarkMode = isDarkMode)
                }
            }
        }
            }
        }
    }
}

// ==================== DIAGNOSTIC CENTER DETAIL SHEET ====================
@Composable
private fun DiagnosticCenterDetailSheet(
    facility: MedicalFacility,
    onBookTest: () -> Unit = {},
    onViewDetails: () -> Unit = {},
    isDarkMode: Boolean
) {
    val dcContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) Color.Gray else Color.Gray
    val cardColor = MaterialTheme.colorScheme.primaryContainer

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                     Icon(
                         imageVector = facility.type.getMarkerIcon(),
                         contentDescription = null,
                         tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                         modifier = Modifier.size(80.dp).align(Alignment.Center)
                     )
                }
            }
        }
        
        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                // Sticky Header Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
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
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .background(if (isDarkMode) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Science, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(28.dp))
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = facility.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = if (isDarkMode) Color(0xFFE2E8F0) else Color(0xFF1E293B)
                                    )
                                    Text(stringResource(R.string.diagnostic_center), fontSize = 14.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Rating and Distance
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.rating}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(16.dp))
                                    Text(" ${facility.distance}", fontSize = 13.sp, color = if (isDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B))
                                }
                            }
                            StatusBadge(facility = facility)
                        }

                        // Specialties
                        if (facility.specializations.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(facility.specializations) { spec ->
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF7C3AED).copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(spec, fontSize = 11.sp, color = Color(0xFF7C3AED), fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))



        // Quick Actions
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    icon = Icons.Default.Call, label = "Call", color = Color(0xFF4CAF50),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openDialer(dcContext, facility.phone) }
                )
                QuickActionButton(
                    icon = Icons.Default.Directions, label = "Directions", color = Color(0xFF2196F3),
                    modifier = Modifier.weight(1f),
                    onClick = { NavigationHelper.openDirections(dcContext, facility.latitude, facility.longitude, facility.name) }
                )
                QuickActionButton(
                    icon = androidx.compose.material.icons.Icons.Default.Message,
                    label = "WhatsApp",
                    color = Color(0xFF25D366),
                    modifier = Modifier.weight(1f),
                    onClick = { if (facility.phone.isNotBlank()) NavigationHelper.openWhatsApp(dcContext, facility.phone) }
                )
            }
            if (facility.isEmergencyAvailable) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    QuickActionButton(
                        icon = Icons.Default.LocalHospital, label = "Emergency", color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                        onClick = { NavigationHelper.openDialer(dcContext, "108") }
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 20.dp))
        Spacer(modifier = Modifier.height(16.dp))

        // Info Cards
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            InfoCard(
                icon = Icons.Outlined.AccessTime,
                title = "Timings",
                value = if (facility.openTime == "24 hrs") "24x7" else "${facility.openTime ?: "N/A"} - ${facility.closeTime ?: ""}",
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
            InfoCard(
                icon = Icons.Outlined.Phone,
                title = "Contact",
                value = facility.phone.ifBlank { "N/A" },
                modifier = Modifier.weight(1f),
                cardColor = cardColor,
                textColor = textColor
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Address
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Place, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.address), fontSize = 12.sp, color = subtextColor)
                    Text(facility.address, fontSize = 14.sp, color = textColor)
                }
                IconButton(onClick = {
                    NavigationHelper.openDirections(dcContext, facility.latitude, facility.longitude, facility.name)
                }) {
                    Icon(Icons.Default.Directions, contentDescription = "Directions", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // Emergency badge
        if (facility.isEmergencyAvailable) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(Color(0xFFE53935).copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.LocalHospital, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(stringResource(R.string.emergency_services_available), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
                    Text(stringResource(R.string.n_24_7_emergency_diagnostic_services), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Details Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).clickable { onViewDetails() },
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF2196F3))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(stringResource(R.string.details_about_diagnostic), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColor)
                }
                Icon(Icons.Default.ArrowForwardIos, contentDescription = null, tint = subtextColor, modifier = Modifier.size(16.dp))
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Book Test Button
        Button(
            onClick = onBookTest,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.Science, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.book_a_test_1), fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
            }
        }
    }
}

// ==================== 6️⃣ EMERGENCY MODE UI ====================
@Composable
private fun EmergencyModeContent(
    facilities: List<MedicalFacility>,
    isLoading: Boolean,
    selectedFacilityType: FacilityType?,
    onFacilityClick: (MedicalFacility) -> Unit,
    modifier: Modifier = Modifier
) {
    EmergencyFacilitiesList(
        facilities = facilities,
        onFacilityClick = onFacilityClick,
        selectedFacilityType = selectedFacilityType,
        modifier = modifier,
        isLoading = isLoading
    )
}

@Composable
private fun EmergencyTopBar(onExitEmergency: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.onSurface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    stringResource(R.string.emergency_mode),
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            TextButton(
                onClick = onExitEmergency,
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onPrimary)
            ) {
                Text(stringResource(R.string.exit), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun EmergencyFacilitiesList(
    facilities: List<MedicalFacility>,
    onFacilityClick: (MedicalFacility) -> Unit,
    selectedFacilityType: FacilityType?,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A))
    ) {
        // Emergency Banner
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE53935)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.LocalHospital,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    stringResource(R.string.need_emergency_help),
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                val facilityLabel = if (selectedFacilityType == FacilityType.CLINIC) "clinics" else "hospitals"
                Text(
                    "We're showing nearest emergency $facilityLabel",
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                val emergencyCallContext = LocalContext.current
                Button(
                    onClick = { NavigationHelper.openDialer(emergencyCallContext, "108") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Icon(
                        Icons.Default.Call,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.call_ambulance_108_1),
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }
            }
        }

        // Emergency Facilities List
        val titleLabel = if (selectedFacilityType == FacilityType.CLINIC) "Nearest Emergency Clinics" else "Nearest Emergency Hospitals"
        Text(
            titleLabel,
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onSurface)
            }
        } else {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(facilities) { facility ->
                EmergencyHospitalCard(
                    facility = facility,
                    onClick = { onFacilityClick(facility) }
                )
            }
        }
        } // end else
    }
}

@Composable
private fun EmergencyHospitalCard(
    facility: MedicalFacility,
    onClick: () -> Unit
) {
    val cardContext = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A)),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(2.dp, Color(0xFFE53935))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(Color(0xFFE53935), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.LocalHospital,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        facility.name,
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (facility.distance.isNotBlank()) facility.distance else "Distance unavailable",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        // ETA estimate
                        if (facility.distanceKm > 0) {
                            val etaMin = NavigationHelper.estimateEtaMinutes(facility.distanceKm, 50.0)
                            Text(
                                " • ~${etaMin} min",
                                fontSize = 12.sp,
                                color = Color(0xFFFFA726),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.str_247_emergency_services),
                        color = Color(0xFF4CAF50),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    // Show phone number inline
                    if (facility.phone.isNotBlank()) {
                        Text(
                            "📞 ${facility.phone}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action buttons: Call + Navigate
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Call button
                Button(
                    onClick = {
                        if (facility.phone.isNotBlank()) {
                            NavigationHelper.openDialer(cardContext, facility.phone)
                        } else {
                            NavigationHelper.openDialer(cardContext, "108")
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        if (facility.phone.isNotBlank()) "Call" else "Call 108",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Navigate button
                Button(
                    onClick = {
                        NavigationHelper.openDirections(
                            cardContext,
                            facility.latitude,
                            facility.longitude,
                            facility.name
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                    shape = RoundedCornerShape(10.dp),
                    enabled = facility.latitude != 0.0 && facility.longitude != 0.0
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.navigate), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun EmergencyFacilityDetailSheet(
    facility: MedicalFacility,
    isDarkMode: Boolean
) {
    val emergencyContext = LocalContext.current
    val textColor = if (isDarkMode) Color.White else Color.Black
    val subtextColor = if (isDarkMode) MaterialTheme.colorScheme.outlineVariant else Color.Gray
    val cardColor = MaterialTheme.colorScheme.primaryContainer

    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scrollOffset = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else 300f

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .graphicsLayer {
                        translationY = scrollOffset * 0.5f
                        alpha = 1f - (scrollOffset / 300f).coerceIn(0f, 1f)
                    }
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                facility.type.getMarkerColor().copy(alpha = 0.3f),
                                Color.Transparent
                            )
                        )
                    )
            ) {
                if (!facility.imageUrl.isNullOrBlank()) {
                    coil.compose.AsyncImage(
                        model = facility.imageUrl,
                        contentDescription = facility.name,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.3f)
                                    )
                                )
                            )
                    )
                } else {
                     Icon(
                         imageVector = facility.type.getMarkerIcon(),
                         contentDescription = null,
                         tint = facility.type.getMarkerColor().copy(alpha = 0.6f),
                         modifier = Modifier.size(80.dp).align(Alignment.Center)
                     )
                }
            }
        }
        
        item {
            Column(
                modifier = Modifier
                    .offset(y = (-24).dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .fillMaxWidth()
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFE53935).copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.LocalHospital,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(30.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = facility.name,
                    color = textColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (facility.distance.isNotBlank()) "${facility.distance} away" else "Distance unavailable",
                    color = subtextColor,
                    fontSize = 13.sp
                )
            }
            StatusBadge(facility = facility)
        }

        Spacer(modifier = Modifier.height(14.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE53935).copy(alpha = 0.1f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(stringResource(R.string.emergency_ready_facility_1), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    Text(stringResource(R.string.quick_call_and_turn_by_turn_navigation), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f))
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = {
                    if (facility.phone.isNotBlank()) {
                        NavigationHelper.openDialer(emergencyContext, facility.phone)
                    } else {
                        NavigationHelper.openDialer(emergencyContext, "108")
                    }
                },
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
            ) {
                Icon(Icons.Default.Call, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (facility.phone.isNotBlank()) "Call Hospital" else "Call 108", fontWeight = FontWeight.SemiBold)
            }

            Button(
                onClick = {
                    NavigationHelper.openDirections(
                        emergencyContext,
                        facility.latitude,
                        facility.longitude,
                        facility.name
                    )
                },
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                enabled = facility.latitude != 0.0 && facility.longitude != 0.0
            ) {
                Icon(Icons.Default.Navigation, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.navigate), fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            colors = CardDefaults.cardColors(containerColor = cardColor),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Place, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(facility.address.ifBlank { "Address unavailable" }, color = textColor, fontSize = 14.sp)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Phone, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(facility.phone.ifBlank { "N/A (fallback: 108)" }, color = textColor, fontSize = 14.sp)
                }
            }
        }
            }
        }
    }
}

// ==================== 7️⃣ EMPTY STATE DESIGN ====================
@Composable
private fun EmptyStateView(
    selectedFacilityType: FacilityType? = null,
    activeRadiusKm: Int,
    onResetFilters: () -> Unit,
    onRefreshNearby: () -> Unit
) {
    val emptyLabel = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "hospitals"
        FacilityType.CLINIC -> "clinics"
        FacilityType.MEDICAL_STORE -> "medical stores"
        FacilityType.DIAGNOSTIC_CENTER -> "diagnostic centers"
        null -> "facilities"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Medical Illustration
        Box(
            modifier = Modifier
                .size(150.dp)
                .background(SwastikPrimary.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.string_3), fontSize = 60.sp)
                Text(stringResource(R.string.string_4), fontSize = 30.sp)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            "No $emptyLabel found nearby",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "No approved results were found within $activeRadiusKm km of your current location. Try refreshing location or resetting filters.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onRefreshNearby,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
        ) {
            Icon(
                Icons.Default.MyLocation,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.refresh_nearby), color = MaterialTheme.colorScheme.onPrimary)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onResetFilters,
            shape = RoundedCornerShape(12.dp),
            border = ButtonDefaults.outlinedButtonBorder.copy(
                brush = Brush.linearGradient(listOf(SwastikPrimary, SwastikPrimary))
            )
        ) {
            Icon(
                Icons.Default.Refresh,
                contentDescription = null,
                tint = SwastikPrimary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.reset_filters), color = SwastikPrimary)
        }
    }
}

@Composable
private fun MapEmptyStateCard(
    activeRadiusKm: Int,
    modifier: Modifier = Modifier,
    selectedFacilityType: FacilityType? = null,
    facilitiesMissingMapCoordinates: Int = 0,
    onResetFilters: () -> Unit,
    onRefreshNearby: () -> Unit
) {
    val emptyLabel = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "hospitals"
        FacilityType.CLINIC -> "clinics"
        FacilityType.MEDICAL_STORE -> "medical stores"
        FacilityType.DIAGNOSTIC_CENTER -> "diagnostic centers"
        null -> "facilities"
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "No $emptyLabel found within $activeRadiusKm km",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                if (facilitiesMissingMapCoordinates > 0) {
                    "We found $facilitiesMissingMapCoordinates matching $emptyLabel, but they don't have usable map coordinates yet. Refresh nearby results or switch to list view to keep browsing."
                } else {
                    "The map is centered on your current location. Refresh location or reset filters to try again."
                },
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onRefreshNearby,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.refresh))
                }
                OutlinedButton(
                    onClick = onResetFilters,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = SwastikPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.reset), color = SwastikPrimary)
                }
            }
        }
    }
}

private fun hasValidMapCoordinates(facility: MedicalFacility): Boolean {
    if (facility.latitude == 0.0 && facility.longitude == 0.0) return false
    if (facility.latitude !in -90.0..90.0) return false
    if (facility.longitude !in -180.0..180.0) return false
    return true
}

// ==================== HELPER COMPONENTS ====================
@Composable
private fun SearchBarSection(
    selectedFacilityType: FacilityType?,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onFilterClick: () -> Unit,
    isDarkMode: Boolean
) {
    val containerColor = MaterialTheme.colorScheme.primaryContainer
    val placeholderText = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "Search hospitals..."
        FacilityType.CLINIC -> "Search clinics..."
        FacilityType.MEDICAL_STORE -> "Search medical stores..."
        FacilityType.DIAGNOSTIC_CENTER -> "Search diagnostic centers..."
        null -> "Search hospitals, clinics, stores..."
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
            placeholder = {
                Text(
                    placeholderText,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            leadingIcon = {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                } else {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = "Voice Search",
                        tint = SwastikPrimary
                    )
                }
            },
            modifier = Modifier
                .weight(1f)
                .shadow(4.dp, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Color.Transparent,
                focusedBorderColor = SwastikPrimary,
                unfocusedContainerColor = containerColor,
                focusedContainerColor = containerColor
            ),
            singleLine = true
        )

        Spacer(modifier = Modifier.width(8.dp))

        // Filter Button
        IconButton(
            onClick = onFilterClick,
            modifier = Modifier
                .size(50.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .background(containerColor, RoundedCornerShape(12.dp))
        ) {
            Icon(
                Icons.Default.Tune,
                contentDescription = "Filter",
                tint = SwastikPrimary
            )
        }
    }
}

@Suppress("UNUSED_PARAMETER")
@Composable
private fun FilterChipsSection(
    selectedType: FacilityType?,
    onTypeSelected: (FacilityType?) -> Unit,
    isDarkMode: Boolean
) {
    LazyRow(
        modifier = Modifier.padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedType == null,
                onClick = { onTypeSelected(null) },
                label = { Text(stringResource(R.string.filter_all)) },
                leadingIcon = {
                    if (selectedType == null) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SwastikPrimary,
                    selectedLabelColor = Color.White
                )
            )
        }
        items(FacilityType.entries.toTypedArray()) { type ->
            FilterChip(
                selected = selectedType == type,
                onClick = { onTypeSelected(if (selectedType == type) null else type) },
                label = { Text(type.getDisplayName()) },
                leadingIcon = {
                    Icon(
                        imageVector = type.getMarkerIcon(),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (selectedType == type) Color.White else type.getMarkerColor()
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = type.getMarkerColor(),
                    selectedLabelColor = Color.White
                )
            )
        }
    }
}

@Composable
private fun FacilityMapCard(
    facility: MedicalFacility,
    onClick: () -> Unit,
    isDarkMode: Boolean
) {
    val cardColor = MaterialTheme.colorScheme.primaryContainer
    val textColor = MaterialTheme.colorScheme.onPrimaryContainer
    val mapCardContext = LocalContext.current

    Card(
        modifier = Modifier
            .width(300.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(facility.type.getMarkerColor().copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor(),
                        modifier = Modifier.size(26.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = facility.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = textColor,
                            modifier = Modifier.weight(1f)
                        )
                        if (facility.isEmergencyAvailable) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFFE53935), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    stringResource(R.string.str_247),
                                    fontSize = 9.sp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                    Text(
                        text = facility.type.getDisplayName(),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = " ${facility.rating} • ${facility.distance}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusBadge(facility = facility, small = true)
                    }
                }
            }

            // Quick action row: Call + Navigate + View Details
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Call
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            if (facility.phone.isNotBlank()) {
                                NavigationHelper.openDialer(mapCardContext, facility.phone)
                            } else {
                                NavigationHelper.openDialer(mapCardContext, "108")
                            }
                        },
                    color = if (facility.phone.isNotBlank()) Color(0xFF4CAF50).copy(alpha = 0.1f) else Color(0xFFFFA726).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Call",
                            tint = if (facility.phone.isNotBlank()) Color(0xFF4CAF50) else Color(0xFFF57C00),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (facility.phone.isNotBlank()) "Call" else "Call 108",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (facility.phone.isNotBlank()) Color(0xFF4CAF50) else Color(0xFFF57C00)
                        )
                    }
                }

                // Navigate
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            NavigationHelper.openDirections(
                                mapCardContext,
                                facility.latitude,
                                facility.longitude,
                                facility.name
                            )
                        },
                    color = Color(0xFF2196F3).copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Navigate",
                            tint = Color(0xFF2196F3),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.navigate),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF2196F3)
                        )
                    }
                }

                // View Details
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onClick() },
                    color = SwastikPrimary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = "Details",
                            tint = SwastikPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.details),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = SwastikPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FacilityListCard(
    facility: MedicalFacility,
    onClick: () -> Unit,
    isDarkMode: Boolean
) {
    val cardColor = MaterialTheme.colorScheme.primaryContainer
    val textColor = MaterialTheme.colorScheme.onPrimaryContainer

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(facility.type.getMarkerColor().copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = facility.type.getMarkerIcon(),
                        contentDescription = null,
                        tint = facility.type.getMarkerColor(),
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
                            text = facility.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = textColor
                        )
                        if (facility.type != FacilityType.DIAGNOSTIC_CENTER && facility.type != FacilityType.MEDICAL_STORE) {
                            StatusBadge(facility = facility)
                        }
                    }
                    Text(
                        text = facility.type.getDisplayName(),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFC107),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = " ${facility.rating} (${facility.reviewCount})",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = null,
                            tint = SwastikPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = " ${facility.distance}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
                    text = facility.address,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (facility.specializations.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(facility.specializations.take(3)) { spec ->
                        Box(
                            modifier = Modifier
                                .background(
                                    facility.type.getMarkerColor().copy(alpha = 0.1f),
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(text = spec, fontSize = 11.sp, color = facility.type.getMarkerColor())
                        }
                    }
                }
            }

            if (facility.isEmergencyAvailable) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        Icons.Default.LocalHospital,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = stringResource(R.string.str_247_emergency_available),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(facility: MedicalFacility, small: Boolean = false) {
    var statusText = if (facility.isOpen) "Open" else "Closed"
    var statusColor = if (facility.isOpen) Color(0xFF4CAF50) else Color(0xFFE53935)
    var bgColor = if (facility.isOpen) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)

    if (facility.isOpen && !facility.closeTime.isNullOrBlank()) {
        try {
            val closeParts = facility.closeTime.split(":")
            if (closeParts.size >= 2) {
                val closeHour = closeParts[0].toInt()
                val closeMinute = closeParts[1].toInt()
                
                val calendar = java.util.Calendar.getInstance()
                val currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
                val currentMinute = calendar.get(java.util.Calendar.MINUTE)
                
                val currentMinutesTotal = currentHour * 60 + currentMinute
                var closeMinutesTotal = closeHour * 60 + closeMinute
                
                if (closeMinutesTotal < currentMinutesTotal && closeHour < 12) {
                    closeMinutesTotal += 24 * 60
                }
                
                val diff = closeMinutesTotal - currentMinutesTotal
                if (diff in 0..60) {
                    statusText = "Closing Soon"
                    statusColor = Color(0xFFFF9800) // Orange
                    bgColor = Color(0xFFFFF3E0) // Light Orange
                }
            }
        } catch (e: Exception) {
            // Ignore parsing errors
        }
    }

    Box(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(if (small) 4.dp else 6.dp))
            .padding(
                horizontal = if (small) 6.dp else 8.dp,
                vertical = if (small) 2.dp else 4.dp
            )
    ) {
        Text(
            text = statusText,
            fontSize = if (small) 10.sp else 11.sp,
            color = statusColor,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(color.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            fontSize = 12.sp,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun InfoCard(
    icon: ImageVector,
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    cardColor: Color = MaterialTheme.colorScheme.primaryContainer,
    textColor: Color = Color.Unspecified // Unused now, we use specific colors based on theme
) {
    val isDarkSurface = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val titleColor = if (isDarkSurface) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val valueColor = if (isDarkSurface) Color(0xFF94A3B8) else Color(0xFF64748B)
    val iconBgColor = if (isDarkSurface) MaterialTheme.colorScheme.surface else Color(0xFFF1F5F9)

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
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
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                Text(
                    title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    color = titleColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    value,
                    fontSize = 10.sp,
                    color = valueColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// Note: getMarkerIcon() and getMarkerColor() are defined in MedicalModels.kt (FacilityType enum)
