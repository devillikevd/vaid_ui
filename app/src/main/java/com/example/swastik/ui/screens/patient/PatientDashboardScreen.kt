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
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.core.content.ContextCompat
import com.example.swastik.data.remote.dto.UpdateProfileRequest
import com.example.swastik.ui.screens.patient.components.*
import com.example.swastik.ui.screens.patient.profile.SavedAddressesDialog
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
    onNavigateToEmergency: () -> Unit = {},
    onNavigateToDiagnostic: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onNavigateToBookingHistory: () -> Unit = {},
    onNavigateToHealthCard: () -> Unit = {},
    onNavigateToMedicineDetail: (String) -> Unit = {},
    onNavigateToMedicineCart: () -> Unit = {},
    onNavigateToVitals: () -> Unit = {},
    onStartInPersonConsultation: () -> Unit = {},
    onStartVideoConsultation: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onNotificationActionRoute: (String) -> Unit = {},
    onFindDoctorSpecialityClick: (String) -> Unit = {},
    onNavigateToCommunityQA: () -> Unit = {}
) {
    var selectedTab by remember(initialTab) { mutableIntStateOf(initialTab.coerceIn(0, 4)) }
    var showNotificationPanel by remember { mutableStateOf(false) }
    var showAddressesDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Handle back button when Profile tab is selected
    androidx.activity.compose.BackHandler(enabled = selectedTab != 0) {
        selectedTab = 0
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

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
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
            bottomBar = {
                PatientBottomNavigation(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it }
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
                    animationSpec = tween(300),
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
                            onProfileClick = { selectedTab = 4 },
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
                            onNavigateToOrderHistory = onNavigateToOrderHistory,
                            onNavigateToBookingHistory = onNavigateToBookingHistory,
                            onNavigateToHealthCard = onNavigateToHealthCard,
                            onNavigateToVitals = onNavigateToVitals,
                            onNavigateToPrescriptions = onNavigateToPrescriptions,
                            onNavigateToBooking = onNavigateToBooking,
                            onNavigateToMedicineDetail = onNavigateToMedicineDetail,
                            onSearchClick = onSearchClick,
                            onLocationUpdate = { newLocation ->
                                viewModel.updateProfile(UpdateProfileRequest(location = newLocation))
                            },
                            onAddAddressClick = { showAddressesDialog = true },
                            onRefresh = { viewModel.refresh() },
                            onFindDoctorSpecialityClick = onFindDoctorSpecialityClick,
                            onNavigateToCommunityQA = onNavigateToCommunityQA
                        )
                        }
                        1 -> RemindersTabContent(
                            modifier = Modifier.padding(paddingValues),
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
                            modifier = Modifier.padding(paddingValues),
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            onMedicineClick = onNavigateToMedicineDetail,
                            onPharmacyClick = onNavigateToPharmacy,
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToCart = onNavigateToMedicineCart
                        )
                        3 -> RecordsTabContent(
                            modifier = Modifier.padding(paddingValues),
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToPrescriptions = onNavigateToPrescriptions,
                            onNavigateToReports = onNavigateToReports
                        )
                        4 -> {
                            ProfileTabContent(
                                modifier = Modifier.padding(paddingValues),
                                profile = profile,
                                stats = stats,
                                unreadNotificationsCount = unreadCount,
                                onNotificationClick = { showNotificationPanel = true },
                                onLogout = onLogout,
                                onAddressesClick = { showAddressesDialog = true },
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
                        selectedTab = 1
                    } else {
                        notification.actionRoute?.let(onNotificationActionRoute)
                    }
                    showNotificationPanel = false
                }
            )
        }

        // Saved Addresses Dialog
        if (showAddressesDialog) {
            SavedAddressesDialog(
                addresses = profile?.savedAddresses ?: emptyList(),
                onDismiss = { showAddressesDialog = false },
                onAddAddress = { label, address ->
                    viewModel?.addAddress(label, address)
                },
                onDeleteAddress = { addressId ->
                    viewModel?.deleteAddress(addressId)
                }
            )
        }
    }
}
