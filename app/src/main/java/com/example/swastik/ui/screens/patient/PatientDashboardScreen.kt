package com.example.swastik.ui.screens.patient

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.core.content.ContextCompat
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.ui.screens.patient.components.*
import com.example.swastik.ui.screens.patient.location.AddLocationDetailsBottomSheet
import com.example.swastik.data.model.SavedAddress
import com.example.swastik.ui.screens.patient.tabs.*
import com.example.swastik.ui.theme.*
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.navigation.Screen
import kotlinx.coroutines.delay

/**
 * Main Patient Dashboard Screen
 * This is the entry point for the patient section of the app.
 *
 * The dashboard is organized into 4 tabs:
 * - Home: Health overview, quick actions, doctor recommendations
 * - Medicine: Medicine finder functionality
 * - Records: Medical records and consultation history
 * - Profile: User profile and settings
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PatientDashboardScreen(
    viewModel: PatientDashboardViewModel = hiltViewModel(),
    initialTab: Int = 0,
    onLogout: () -> Unit = {},
    onNavigateToAppointments: () -> Unit = {},
    onNavigateToHospitals: () -> Unit = {},
    onNavigateToClinics: () -> Unit = {},
    onNavigateToPharmacies: () -> Unit = {},
    onNavigateToPharmacy: (String?, String?) -> Unit = { _, _ -> },
    onNavigateToReports: () -> Unit = {},
    onNavigateToPrescriptions: () -> Unit = {},
    onNavigateToChatbot: () -> Unit = {},
    onNavigateToBooking: (String?) -> Unit = {},
    onNavigateToLocationSelection: () -> Unit = {},
    onNavigateToEmergency: () -> Unit = {},
    onNavigateToDiagnostic: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onNavigateToBookingHistory: () -> Unit = {},
    onNavigateToHealthCard: () -> Unit = {},
    onNavigateToDietTracker: () -> Unit = {},

    onNavigateToMedicineDetail: (String) -> Unit = {},
    onNavigateToMedicineCart: (String) -> Unit = {},
    onNavigateToFavoriteMedicines: () -> Unit = {},
    onNavigateToFavoriteDoctors: () -> Unit = {},
    onNavigateToFavoriteFacilities: (String) -> Unit = {},
    onNavigateToVitals: () -> Unit = {},
    onStartInPersonConsultation: () -> Unit = {},
    onStartVideoConsultation: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onNotificationActionRoute: (String) -> Unit = {},
    onFindDoctorSpecialityClick: (String) -> Unit = {},
    onNavigateToCommunityQA: () -> Unit = {},
    onDoctorClick: (String) -> Unit = {},
    onNavigateToAllRecommendedDoctors: () -> Unit = {}
) {
    val selectedTab by viewModel.selectedTab.collectAsState()
    var showNotificationPanel by remember { mutableStateOf(false) }
    var showAddressesDialog by remember { mutableStateOf(false) }  // add/edit bottom sheet
    var showAddressListDialog by remember { mutableStateOf(false) } // list of addresses
    var addressToEdit by remember { mutableStateOf<SavedAddress?>(null) }
    val context = LocalContext.current
    val fusedLocationClient = remember {
        com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
    }
    var pendingAddressLocationCallback by remember { mutableStateOf<((String) -> Unit)?>(null) }
    
    val favoriteDoctorsCount by viewModel.favoriteDoctorsCount.collectAsState()
    val favoriteHospitalsCount by viewModel.favoriteHospitalsCount.collectAsState()
    val favoriteClinicsCount by viewModel.favoriteClinicsCount.collectAsState()
    val favoriteDiagnosticsCount by viewModel.favoriteDiagnosticsCount.collectAsState()
    val favoritePharmaciesCount by viewModel.favoritePharmaciesCount.collectAsState()
    val consultations by viewModel.consultations.collectAsState()

    // Initialize tab from initialTab only once
    LaunchedEffect(initialTab) {
        if (initialTab != 0) {
            viewModel.setTab(initialTab)
        }
    }

    // Handle back button when Profile tab is selected
    androidx.activity.compose.BackHandler(enabled = selectedTab != 0) {
        viewModel.setTab(0)
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { }

    val activityRecognitionPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.startFitnessTrackingService()
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        
        if (fineGranted || coarseGranted) {
            viewModel.fetchAndUpdateLocation()
        } else {
            com.example.swastik.ui.components.SnackbarManager.showError(
                "Location permission is highly recommended for accurate doctor recommendations and SOS services."
            )
        }
    }


    // Location permission launcher for saving addresses (from profile tab)
    val addressLocationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                      permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    if (location != null) {
                        val geocoder = android.location.Geocoder(context, java.util.Locale.getDefault())
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            geocoder.getFromLocation(location.latitude, location.longitude, 1) { addrs ->
                                val addr = addrs.firstOrNull()
                                if (addr != null) {
                                    val parts = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea, addr.postalCode).filter { it.isNotBlank() }
                                    val text = if (parts.isNotEmpty()) parts.joinToString(", ") else addr.getAddressLine(0) ?: ""
                                    pendingAddressLocationCallback?.invoke(text)
                                    pendingAddressLocationCallback = null
                                }
                            }
                        } else {
                            @Suppress("DEPRECATION")
                            val addrs = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                            val addr = addrs?.firstOrNull()
                            if (addr != null) {
                                val parts = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea, addr.postalCode).filter { it.isNotBlank() }
                                val text = if (parts.isNotEmpty()) parts.joinToString(", ") else addr.getAddressLine(0) ?: ""
                                pendingAddressLocationCallback?.invoke(text)
                                pendingAddressLocationCallback = null
                            }
                        }
                    }
                }
            } catch (e: SecurityException) { /* ignore */ }
        }
    }

    LaunchedEffect(Unit) {
        // Allow the first frame to render before firing permission requests
        // and system service calls that cause frame drops.
        delay(200)

        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        // Request Location Permission
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!hasFine && !hasCoarse) {
            locationPermissionLauncher.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ))
        } else {
            viewModel.fetchAndUpdateLocation()
        }


        // Request Activity Recognition Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                activityRecognitionPermissionLauncher.launch(Manifest.permission.ACTIVITY_RECOGNITION)
            } else {
                viewModel.startFitnessTrackingService()
            }
        } else {
            viewModel.startFitnessTrackingService()
        }
    }
    
    val guardianPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true || permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        val activityGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) permissions[Manifest.permission.ACTIVITY_RECOGNITION] == true else true
        
        if (locationGranted && activityGranted) {
            viewModel.toggleGuardian(true)
        } else {
            android.widget.Toast.makeText(context, "Location and Activity Recognition permissions required for Guardian", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    val profile by viewModel.patientProfile.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val doctors by viewModel.recommendedDoctors.collectAsState()
    val reminders by viewModel.reminders.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isOnline by viewModel.isOnline.collectAsState()

    val unreadCount = notifications.count { !it.isRead }

    // Pull-to-refresh state
    val pullToRefreshState = rememberPullToRefreshState()
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(pullToRefreshState) {
            viewModel.refresh()
        }
    }
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing && pullToRefreshState.isRefreshing) {
            // Keep the indicator visible briefly to avoid a flicker on fast refreshes.
            delay(250)
            pullToRefreshState.endRefresh()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            contentWindowInsets = WindowInsets(0.dp), // Fix: Prevents Scaffold from consuming status bar insets!
            bottomBar = {
                PatientBottomNavigation(
                    selectedTab = selectedTab,
                    onTabSelected = { viewModel.setTab(it) }
                )
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .nestedScroll(pullToRefreshState.nestedScrollConnection)
            ) {
                Crossfade(
                    targetState = selectedTab,
                    animationSpec = tween(150),
                    label = "tab_crossfade"
                ) { tab ->
                    when (tab) {
                        0 -> {
                            val fitnessLog by viewModel.fitnessLog.collectAsState()
                            val guardianEnabled by viewModel.guardianEnabled.collectAsState()
                            HomeTabContent(
                                profile = profile,
                                unreadNotificationsCount = unreadCount,
                                doctors = doctors,
                                searchSuggestions = uiState.searchSuggestions,
                                fitnessLog = fitnessLog,
                                guardianEnabled = guardianEnabled,
                                onGuardianToggle = { enabled -> 
                                    if (enabled) {
                                        val permissions = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                            permissions.add(Manifest.permission.ACTIVITY_RECOGNITION)
                                        }
                                        guardianPermissionLauncher.launch(permissions.toTypedArray())
                                    } else {
                                        viewModel.toggleGuardian(false)
                                    }
                                },
                                paddingValues = paddingValues,
                            onNotificationClick = { showNotificationPanel = true },
                            onProfileClick = { viewModel.setTab(4) },
                            onStartInPersonConsultation = onStartInPersonConsultation,
                            onStartVideoConsultation = onStartVideoConsultation,
                            onNavigateToAppointments = onNavigateToAppointments,
                            onNavigateToReports = onNavigateToReports,
                            onNavigateToHospitals = onNavigateToHospitals,
                            onNavigateToClinics = onNavigateToClinics,
                            onNavigateToPharmacies = onNavigateToPharmacies,
                            onNavigateToEmergency = onNavigateToEmergency,
                            onNavigateToChatbot = onNavigateToChatbot,
                            onNavigateToDiagnostic = onNavigateToDiagnostic,
                            onNavigateToHealthCard = onNavigateToHealthCard,
                            onNavigateToDietTracker = onNavigateToDietTracker,
                            onNavigateToOrderHistory = onNavigateToOrderHistory,
                            onNavigateToBookingHistory = onNavigateToBookingHistory,
                            onNavigateToVitals = onNavigateToVitals,
                            onNavigateToPrescriptions = onNavigateToPrescriptions,
                            onNavigateToBooking = onNavigateToBooking,
                            onNavigateToMedicineDetail = onNavigateToMedicineDetail,
                            onSearchClick = onSearchClick,
                            onLocationClick = onNavigateToLocationSelection,
                            onAddAddressClick = { showAddressesDialog = true },
                            onRefresh = { viewModel.refresh() },
                            onFindDoctorSpecialityClick = onFindDoctorSpecialityClick,
                            onNavigateToCommunityQA = onNavigateToCommunityQA,
                            onDoctorClick = onDoctorClick,
                            onNavigateToAllRecommendedDoctors = onNavigateToAllRecommendedDoctors
                        )
                        }
                        1 -> RemindersTabContent(
                            modifier = Modifier.padding(paddingValues).statusBarsPadding(),
                            profile = profile,
                            reminders = reminders,
                            isLoading = uiState.isLoading,
                            unreadNotificationsCount = unreadCount,
                            onNotificationClick = { showNotificationPanel = true },
                            onCreateReminder = { title, time, type, days, notes -> viewModel.createReminder(title, time, type, days, notes) },
                            onMarkDone = { id, time -> viewModel.markReminderDone(id, time) },
                            onSnooze = { id, time, snoozeMins -> viewModel.snoozeReminder(id, time, snoozeMins) },
                            onSkip = { id, time -> viewModel.skipReminder(id, time) },
                            onDelete = { id -> viewModel.deleteReminder(id) }
                        )
                        2 -> MedicineTabContent(
                            modifier = Modifier.padding(paddingValues).statusBarsPadding(),
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            onMedicineClick = onNavigateToMedicineDetail,
                            onPharmacyClick = onNavigateToPharmacy,
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToCart = { onNavigateToMedicineCart("GLOBAL") },
                            onNavigateToFavorites = onNavigateToFavoriteMedicines
                        )
                        3 -> MyCareTabContent(
                            modifier = Modifier.padding(paddingValues).statusBarsPadding(),
                            profile = profile,
                            stats = stats,
                            reminders = reminders,
                            unreadNotificationsCount = unreadCount,
                            favoriteDoctorsCount = favoriteDoctorsCount,
                            favoriteHospitalsCount = favoriteHospitalsCount,
                            favoriteClinicsCount = favoriteClinicsCount,
                            favoriteDiagnosticsCount = favoriteDiagnosticsCount,
                            favoritePharmaciesCount = favoritePharmaciesCount,
                            recentConsultations = consultations,
                            upcomingAppointments = uiState.dashboard?.upcomingAppointments ?: emptyList(),
                            recentPrescriptions = uiState.dashboard?.recentPrescriptions ?: emptyList(),
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToPrescriptions = onNavigateToPrescriptions,
                            onNavigateToReports = onNavigateToReports,
                            onNavigateToAppointments = onNavigateToAppointments,
                            onNavigateToOrderHistory = onNavigateToOrderHistory,
                            onNavigateToBookingHistory = onNavigateToBookingHistory,
                            onNavigateToFavoriteDoctors = onNavigateToFavoriteDoctors,
                            onNavigateToFavoriteMedicines = onNavigateToFavoriteMedicines,
                            onNavigateToFavoriteFacilities = onNavigateToFavoriteFacilities
                        )
                        4 -> {
                            ProfileTabContent(
                                modifier = Modifier.padding(paddingValues).statusBarsPadding(),
                                profile = profile,
                                stats = stats,
                                unreadNotificationsCount = unreadCount,
                                onNotificationClick = { showNotificationPanel = true },
                                onLogout = onLogout,
                        onAddressesClick = {
                            showAddressListDialog = true
                        },
                                viewModel = viewModel
                            )
                        }
                    }
                }

                // Pull-to-refresh indicator
                PullToRefreshContainer(
                    state = pullToRefreshState,
                    modifier = Modifier.align(Alignment.TopCenter),
                    containerColor = SwastikPrimaryLight,
                    contentColor = SwastikPrimary
                )
            }
        }

        // Offline banner — overlaid at the top
        com.example.swastik.ui.components.OfflineBanner(
            isOffline = !isOnline,
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // Emergency SOS Button removed - users can use the Quick Action "Ambulance" or Emergency feature within the dashboard.

        // Notification Panel
        if (showNotificationPanel) {
            NotificationPanelDialog(
                notifications = notifications,
                onDismiss = { showNotificationPanel = false },
                onClearAll = {
                    viewModel.clearAllNotifications()
                },
                onMarkAsRead = { notificationId ->
                    viewModel.markNotificationRead(notificationId)
                },
                onActionClick = { notification ->
                    viewModel.markNotificationRead(notification.id)
                    if (notification.actionRoute?.contains("reminder", ignoreCase = true) == true) {
                        viewModel.setTab(1)
                    } else {
                        notification.actionRoute?.let(onNotificationActionRoute)
                    }
                    showNotificationPanel = false
                }
            )
        }

        // Saved Addresses List Dialog — shows all saved addresses with edit/delete
        if (showAddressListDialog) {
            val savedAddresses = profile?.savedAddresses ?: emptyList()
            androidx.compose.ui.window.Dialog(
                onDismissRequest = { showAddressListDialog = false }
            ) {
                Surface(
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Saved Addresses",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                            IconButton(onClick = { showAddressListDialog = false }) {
                                Icon(Icons.Filled.Close, contentDescription = "Close")
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        if (savedAddresses.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "No saved addresses yet.",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        } else {
                            savedAddresses.forEach { addr ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        if (addr.label.equals("Home", ignoreCase = true))
                                            Icons.Filled.Home
                                        else if (addr.label.equals("Office", ignoreCase = true) || addr.label.equals("Work", ignoreCase = true))
                                            Icons.Filled.Work
                                        else
                                            Icons.Outlined.LocationOn,
                                        contentDescription = null,
                                        tint = SwastikPrimary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            addr.label,
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold
                                        )
                                        Text(
                                            addr.address,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    IconButton(onClick = {
                                        addressToEdit = addr
                                        showAddressListDialog = false
                                        showAddressesDialog = true
                                    }) {
                                        Icon(Icons.Outlined.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    IconButton(onClick = {
                                        viewModel?.deleteAddress(addr.id)
                                    }) {
                                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                addressToEdit = null
                                showAddressListDialog = false
                                showAddressesDialog = true
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Filled.Add, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Add New Address")
                        }
                    }
                }
            }
        }

        // Add/Edit Address Bottom Sheet — using the same modern bottom sheet as LocationSelectionScreen
        if (showAddressesDialog) {
            AddLocationDetailsBottomSheet(
                initialLabel = addressToEdit?.label ?: "",
                initialAddress = addressToEdit?.address ?: "",
                onDismiss = {
                    showAddressesDialog = false
                    addressToEdit = null
                },
                onSaveAddress = { label, address ->
                    addressToEdit?.let { old -> viewModel?.deleteAddress(old.id) }
                    viewModel?.addAddress(label, address)
                    showAddressesDialog = false
                    addressToEdit = null
                },
                onFetchLocation = { onLocationFetched ->
                    pendingAddressLocationCallback = onLocationFetched
                    val hasFine = androidx.core.content.ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
                    val hasCoarse = androidx.core.content.ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
                    if (hasFine || hasCoarse) {
                        try {
                            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                                if (location != null) {
                                    val geocoder = android.location.Geocoder(context, java.util.Locale.getDefault())
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                                        geocoder.getFromLocation(location.latitude, location.longitude, 1) { addrs ->
                                            val addr = addrs.firstOrNull()
                                            if (addr != null) {
                                                val parts = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea, addr.postalCode).filter { it.isNotBlank() }
                                                val text = if (parts.isNotEmpty()) parts.joinToString(", ") else addr.getAddressLine(0) ?: ""
                                                onLocationFetched(text)
                                                pendingAddressLocationCallback = null
                                            }
                                        }
                                    } else {
                                        @Suppress("DEPRECATION")
                                        val addrs = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                                        val addr = addrs?.firstOrNull()
                                        if (addr != null) {
                                            val parts = listOfNotNull(addr.subLocality, addr.locality, addr.adminArea, addr.postalCode).filter { it.isNotBlank() }
                                            val text = if (parts.isNotEmpty()) parts.joinToString(", ") else addr.getAddressLine(0) ?: ""
                                            onLocationFetched(text)
                                            pendingAddressLocationCallback = null
                                        }
                                    }
                                }
                            }
                        } catch (e: SecurityException) { /* ignore */ }
                    } else {
                        addressLocationPermissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                }
            )
        }
    }
}
