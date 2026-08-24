package com.example.swastik.ui.screens.patient

import android.Manifest
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.*
import com.example.swastik.ui.viewmodel.HospitalFinderViewModel
import com.example.swastik.ui.viewmodel.MedicineViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.components.EmptyStateView
import com.example.swastik.ui.screens.patient.healthcare.finder.EnhancedMapView
import com.example.swastik.ui.screens.patient.healthcare.finder.FacilityListCard
import com.example.swastik.ui.screens.patient.healthcare.finder.FilterBottomSheet
import com.example.swastik.ui.screens.patient.healthcare.finder.MapEmptyStateCard
import com.example.swastik.ui.screens.patient.healthcare.finder.SearchBarSection
import com.example.swastik.ui.screens.patient.healthcare.finder.ShimmerFacilityCard
import com.example.swastik.ui.screens.patient.healthcare.finder.hasValidMapCoordinates
import com.example.swastik.ui.screens.patient.healthcare.emergency.EmergencyFacilityDetailSheet
import com.example.swastik.ui.screens.patient.healthcare.emergency.EmergencyModeContent
import com.example.swastik.ui.screens.patient.healthcare.emergency.EmergencyTopBar
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import com.example.swastik.R

private const val DEFAULT_DISCOVERY_RADIUS_KM = 10f
private const val MAX_DISCOVERY_RADIUS_KM = 25f

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
    onFitnessCenterDetailClick: (String) -> Unit = {},
    onMedicineClick: (String) -> Unit = {},
    onNavigateToCart: () -> Unit = {},
    onNavigateToPharmacyCart: () -> Unit = {},
    onNavigateToOrders: () -> Unit = {},
    onNavigateToDiagnosticBooking: (String?) -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    isDarkMode: Boolean = false,
    isEmbedded: Boolean = false,
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
    var isMapView by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var hasAutoSwitchedToList by remember { mutableStateOf(false) }
    var isEmergencyMode by remember { mutableStateOf(false) }
    var hasTriggeredFocusedSearch by remember(requestedFocusFacilityId, requestedFocusFacilityName) {
        mutableStateOf(false)
    }



    if (isMapView) {
        BackHandler {
            isMapView = false
        }
    }

    var distanceFilter by remember { mutableFloatStateOf(DEFAULT_DISCOVERY_RADIUS_KM) }
    var openNowOnly by remember { mutableStateOf(false) }
    var minimumRating by remember { mutableFloatStateOf(0f) }
    var hospitalTypeFilter by remember { mutableStateOf<String?>(null) }
    var emergencyServicesOnly by remember { mutableStateOf(false) }
    var bedsAvailableOnly by remember { mutableStateOf(false) }

    val hospitalState by viewModel.uiState.collectAsState()
    
    val selectedFacility = hospitalState.selectedFacilityForSheet
    val showBottomSheet = hospitalState.activeSheetType != null

    val handleFacilityClick: (MedicalFacility) -> Unit = { facility ->
        if (isEmergencyMode && facility.isEmergencyAvailable) {
            viewModel.openFacilitySheet(facility, "EMERGENCY")
        } else {
            when (facility.type) {
                FacilityType.HOSPITAL, FacilityType.NURSING_HOME -> onHospitalClick(facility.id)
                FacilityType.CLINIC -> onClinicClick(facility.id)
                FacilityType.MEDICAL_STORE -> onPharmacyDetailClick(facility.id)
                FacilityType.DIAGNOSTIC_CENTER -> onDiagnosticDetailClick(facility.id)
                FacilityType.FITNESS_CENTER -> onFitnessCenterDetailClick(facility.id)
            }
        }
    }
    val facilities = hospitalState.facilities
    val selectedFacilityType = selectedFacilityTypeOverride
    val isDarkSurface = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val resolvedDarkMode = isDarkMode || isDarkSurface
    val screenTitle = when (selectedFacilityType) {
        FacilityType.HOSPITAL -> "Hospitals"
        FacilityType.CLINIC -> "Clinics"
        FacilityType.MEDICAL_STORE -> "Medical Stores"
        FacilityType.DIAGNOSTIC_CENTER -> stringResource(R.string.diagnostic_centers)
        FacilityType.FITNESS_CENTER -> "Gyms & Studios"
        FacilityType.NURSING_HOME -> "Nursing Homes"
        null -> "Nearby Care"
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.fetchLocationAndLoad(selectedFacilityType)
        }
    }

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
            handleFacilityClick(targetFacility)
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

    LaunchedEffect(selectedFacilityType) {
        if (hospitalState.locationAvailable) {
            viewModel.loadNearbyFacilities(facilityType = selectedFacilityType)
        }
    }

    val bgColor = MaterialTheme.colorScheme.background

    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current

    Scaffold(
        modifier = Modifier.pointerInput(Unit) {
            detectTapGestures(onTap = {
                focusManager.clearFocus()
            })
        },
        containerColor = bgColor,
        topBar = {
            if (isEmergencyMode) {
                EmergencyTopBar(onExitEmergency = { isEmergencyMode = false })
            } else if (!isEmbedded) {
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
                        if (
                            selectedFacilityType != FacilityType.MEDICAL_STORE &&
                            selectedFacilityType != FacilityType.DIAGNOSTIC_CENTER &&
                            selectedFacilityType != FacilityType.FITNESS_CENTER
                        ) {
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
                    handleFacilityClick(it)
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
                        if (newQuery.isEmpty()) {
                            viewModel.searchFacilities("")
                        }
                    },
                    onFilterClick = { showFilterSheet = true },
                    isDarkMode = resolvedDarkMode
                )

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
                            ShimmerFacilityCard(isDarkMode = resolvedDarkMode)
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
                                handleFacilityClick(facility)
                            }
                        )

                        FloatingActionButton(
                            onClick = { viewModel.fetchLocationAndLoad(selectedFacilityType) },
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(16.dp)
                                .padding(bottom = 80.dp),
                            containerColor = surfaceColor,
                            contentColor = MaterialTheme.colorScheme.primary
                        ) {
                            Icon(Icons.Default.MyLocation, contentDescription = "My Location")
                        }
                    }
                } else if (filteredFacilities.isEmpty()) {
                    EmptyStateView(
                        title = "No facilities found",
                        subtitle = "Try adjusting your filters or radius",
                        icon = Icons.Default.SearchOff
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
                                    handleFacilityClick(facility)
                                },
                                isDarkMode = resolvedDarkMode
                            )
                        }
                    }
                }
            }
        }

        // Emergency Detail Bottom Sheet (only for emergency mode)
        if (showBottomSheet && selectedFacility != null && isEmergencyMode && selectedFacility.isEmergencyAvailable) {
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
                EmergencyFacilityDetailSheet(
                    facility = facility,
                    isDarkMode = resolvedDarkMode
                )
            }
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
