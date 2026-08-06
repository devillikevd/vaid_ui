package com.example.swastik.ui.screens.patient

import android.Manifest
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.clip
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
import com.example.swastik.ui.screens.patient.booking.formatTimeSlot
import com.example.swastik.ui.screens.patient.booking.appointmentDateTime
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
    onNavigateToFitnessCenters: () -> Unit = {},
    onNavigateToHospitalDetail: (String) -> Unit = {},
    onNavigateToClinicDetail: (String) -> Unit = {},
    onNavigateToPharmacyDetail: (String) -> Unit = {},
    onNavigateToDiagnosticDetail: (String) -> Unit = {},
    onNavigateToFitnessCenterDetail: (String) -> Unit = {},
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
    onNavigateToWellnessHub: () -> Unit = {},
    onNavigateToWellnessSessions: () -> Unit = {},
    onNavigateToHealthConnectDashboard: () -> Unit = {},

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
    onNavigateToAllRecommendedDoctors: () -> Unit = {},
    onNavigateToActiveBooking: (String) -> Unit = {},
    onJoinVideoConsultation: (String, String) -> Unit = { _, _ -> }
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

    // Refresh silently when the dashboard returns to the foreground so socket
    // events missed while the app was backgrounded are picked up automatically.
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                viewModel.refreshOnResume()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var activeServiceTab by remember { mutableStateOf(HomeServiceTab.HOME) }

    BackHandler(enabled = selectedTab == 0 && activeServiceTab != HomeServiceTab.HOME) {
        activeServiceTab = HomeServiceTab.HOME
    }

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
                Column {
                    val upcomingAppointments = uiState.dashboard?.upcomingAppointments ?: emptyList()
                    val activeBooking = upcomingAppointments.firstOrNull { 
                        val s = it.status.lowercase()
                        s == "scheduled" || s == "confirmed" || s == "in_progress" 
                    }
                    val showCard = activeBooking != null && selectedTab == 0
                    var showAllConsultations by remember { mutableStateOf(false) }
                    if (showCard && activeBooking != null) {
                        val infiniteTransition = rememberInfiniteTransition(label = "racing_border")
                        val angle by infiniteTransition.animateFloat(
                            initialValue = 0f,
                            targetValue = 360f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(2500, easing = LinearEasing),
                                repeatMode = RepeatMode.Restart
                            ),
                            label = "racing_border_rotation"
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 0.dp)
                                .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomStart = 0.dp, bottomEnd = 0.dp))
                                .drawWithContent {
                                    val canvasSize = size.width.coerceAtLeast(size.height) * 2f
                                    rotate(angle) {
                                        drawRect(
                                            brush = Brush.sweepGradient(
                                                colors = listOf(Color.Transparent, SwastikPrimary, Color.Transparent),
                                                center = center
                                            ),
                                            topLeft = Offset(center.x - canvasSize/2, center.y - canvasSize/2),
                                            size = androidx.compose.ui.geometry.Size(canvasSize, canvasSize)
                                        )
                                    }
                                    drawContent()
                                }
                        ) {
                            val isConfirmed = activeBooking.status.lowercase() == "confirmed" || activeBooking.status.lowercase() == "in_progress"
                            val isInProgress = activeBooking.status.lowercase() == "in_progress"
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(2.dp)
                                    .clickable {
                                        // If multiple upcoming consultations, expand list; else navigate directly
                                        if (upcomingAppointments.count { s -> s.status.lowercase().let { it == "scheduled" || it == "confirmed" || it == "in_progress" } } > 1) {
                                            showAllConsultations = !showAllConsultations
                                        } else {
                                            onNavigateToActiveBooking(activeBooking.id)
                                        }
                                    },
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp, bottomStart = 0.dp, bottomEnd = 0.dp),
                                color = Color(0xFFF0FDF4), // Light greenish background
                                shadowElevation = 8.dp
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = if (isConfirmed) 16.dp else 12.dp, horizontal = 16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    val iconOffset by infiniteTransition.animateFloat(
                                        initialValue = -4f,
                                        targetValue = 4f,
                                        animationSpec = infiniteRepeatable(
                                            animation = tween(1000, easing = FastOutSlowInEasing),
                                            repeatMode = RepeatMode.Reverse
                                        ),
                                        label = "icon_bounce"
                                    )
                                    val iconFlip by infiniteTransition.animateFloat(
                                        initialValue = 0f,
                                        targetValue = 180f,
                                        animationSpec = infiniteRepeatable(
                                            animation = tween(1000, easing = FastOutSlowInEasing),
                                            repeatMode = RepeatMode.Reverse
                                        ),
                                        label = "icon_flip"
                                    )
                                    Box(
                                        modifier = Modifier
                                            .size(if (isConfirmed) 42.dp else 36.dp)
                                            .background(Color.White, androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                                            .border(1.dp, Color(0xFFE0E0E0), androidx.compose.foundation.shape.RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = if (isConfirmed) Icons.Default.CheckCircle else Icons.Default.HourglassTop,
                                            contentDescription = "Active Booking",
                                            tint = SwastikPrimary,
                                            modifier = Modifier
                                                .size(20.dp)
                                                .offset(y = if (isConfirmed) 0.dp else iconOffset.dp)
                                                .graphicsLayer {
                                                    rotationY = if (isConfirmed) 0f else iconFlip
                                                }
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        var now by remember { mutableStateOf(java.time.LocalDateTime.now()) }
                                        LaunchedEffect(Unit) {
                                            while (true) {
                                                delay(30000L)
                                                now = java.time.LocalDateTime.now()
                                            }
                                        }
                                        val scheduledAt = appointmentDateTime(activeBooking.date, activeBooking.timeSlot)
                                        val passed = scheduledAt != null && now.isAfter(scheduledAt)
                                        Text(
                                            text = when {
                                                isInProgress -> "Consultation is live — join now"
                                                isConfirmed && passed -> "Waiting for new schedule by doctor"
                                                isConfirmed -> "Your appointment at ${formatTimeSlot(activeBooking.timeSlot)}"
                                                else -> "Waiting approval by doctor"
                                            },
                                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                            color = Color.Black
                                        )
                                            if (isConfirmed) {
                                                val isVideo = activeBooking.type.lowercase().contains("video")
                                                
                                                if (isInProgress && isVideo) {
                                                    Spacer(modifier = Modifier.height(8.dp))
                                                    Button(
                                                        onClick = { 
                                                            onJoinVideoConsultation(
                                                                activeBooking.id, 
                                                                activeBooking.doctor?.name ?: "Doctor"
                                                            ) 
                                                        },
                                                        modifier = Modifier.fillMaxWidth().height(36.dp),
                                                        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                                        contentPadding = PaddingValues(0.dp)
                                                    ) {
                                                        Icon(Icons.Default.VideoCall, contentDescription = null, modifier = Modifier.size(16.dp))
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Text("Join Consultation", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                } else {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(
                                                            Icons.Default.Timer,
                                                            contentDescription = "Timer",
                                                            tint = if (passed) MaterialTheme.colorScheme.error else SwastikPrimary,
                                                            modifier = Modifier.size(14.dp)
                                                        )
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            text = if (passed) {
                                                                "Doctor will provide a new schedule"
                                                            } else {
                                                                val minutesLeft = if (scheduledAt != null) java.time.Duration.between(now, scheduledAt).toMinutes() else 0L
                                                                if (minutesLeft >= 60) "Starts in ${minutesLeft / 60}h ${minutesLeft % 60}m"
                                                                else "Starts in ${minutesLeft.coerceAtLeast(0)} min"
                                                            },
                                                            style = MaterialTheme.typography.bodySmall,
                                                            color = if (passed) MaterialTheme.colorScheme.error else SwastikPrimary,
                                                            fontWeight = FontWeight.SemiBold
                                                        )
                                                    }
                                                }
                                            } else {
                                            Text(
                                                text = "${activeBooking.date} • Dr. ${activeBooking.doctor?.name ?: "Unknown"}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                    Icon(
                                        imageVector = Icons.Default.ChevronRight,
                                        contentDescription = "Details",
                                        tint = Color.Gray,
                                        modifier = Modifier
                                            .size(24.dp)
                                            .background(Color(0xFFF5F5F5), CircleShape)
                                            .padding(4.dp)
                                    )
                                }
                            }
                        }

                        // Expanded list of all upcoming consultations
                        if (showAllConsultations) {
                            Surface(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                color = Color.White,
                                shadowElevation = 6.dp,
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp)
                            ) {
                                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                                    Text(
                                        text = "All Upcoming Consultations",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold),
                                        color = Color.Black,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    upcomingAppointments
                                        .filter { s -> s.status.lowercase().let { it == "scheduled" || it == "confirmed" || it == "in_progress" } }
                                        .forEach { appt ->
                                            Surface(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 4.dp)
                                                    .clickable {
                                                        showAllConsultations = false
                                                        onNavigateToActiveBooking(appt.id)
                                                    },
                                                shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                                                color = Color(0xFFF0FDF4),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBBF7D0))
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(12.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        imageVector = if (appt.status.lowercase() == "in_progress") Icons.Default.VideoCall else Icons.Default.CalendarMonth,
                                                        contentDescription = null,
                                                        tint = SwastikPrimary,
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(10.dp))
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(
                                                            text = "Dr. ${appt.doctor?.name ?: "Unknown"}",
                                                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                                                            color = Color.Black
                                                        )
                                                        Text(
                                                            text = "${appt.date} • ${formatTimeSlot(appt.timeSlot)}",
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = Color.Gray
                                                        )
                                                    }
                                                    val statusColor = when (appt.status.lowercase()) {
                                                        "confirmed", "in_progress" -> Color(0xFF16A34A)
                                                        else -> Color(0xFFD97706)
                                                    }
                                                    Text(
                                                        text = appt.status.replaceFirstChar { it.uppercase() },
                                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                                        color = statusColor
                                                    )
                                                }
                                            }
                                        }
                                }
                            }
                        }
                    }
                    PatientBottomNavigation(
                        selectedTab = selectedTab,
                        onTabSelected = { viewModel.setTab(it) },
                        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = if (showCard) 0.dp else 12.dp, bottom = 12.dp),
                        shape = if (showCard) androidx.compose.foundation.shape.RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp) else androidx.compose.foundation.shape.RoundedCornerShape(24.dp)
                    )
                }
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
                            val totalCommunityQuestions by viewModel.totalCommunityQuestions.collectAsState()
                            HomeTabContent(
                                activeServiceTab = activeServiceTab,
                                onServiceTabChange = { activeServiceTab = it },
                                profile = profile,
                                unreadNotificationsCount = unreadCount,
                                doctors = doctors,
                                searchSuggestions = uiState.searchSuggestions,
                                fitnessLog = fitnessLog,
                                guardianEnabled = guardianEnabled,
                                totalCommunityQuestions = totalCommunityQuestions,
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
                            onNavigateToFitnessCenters = onNavigateToFitnessCenters,
                            onNavigateToHospitalDetail = onNavigateToHospitalDetail,
                            onNavigateToClinicDetail = onNavigateToClinicDetail,
                            onNavigateToPharmacyDetail = onNavigateToPharmacyDetail,
                            onNavigateToDiagnosticDetail = onNavigateToDiagnosticDetail,
                            onNavigateToFitnessCenterDetail = onNavigateToFitnessCenterDetail,
                            onNavigateToEmergency = onNavigateToEmergency,
                            onNavigateToChatbot = onNavigateToChatbot,
                            onNavigateToDiagnostic = onNavigateToDiagnostic,
                            onNavigateToHealthCard = onNavigateToHealthCard,
                            onNavigateToDietTracker = onNavigateToDietTracker,
                            onNavigateToWellnessHub = onNavigateToWellnessHub,
                            onNavigateToHealthConnectDashboard = onNavigateToHealthConnectDashboard,
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
                onMarkAllRead = {
                    viewModel.markAllNotificationsRead()
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
