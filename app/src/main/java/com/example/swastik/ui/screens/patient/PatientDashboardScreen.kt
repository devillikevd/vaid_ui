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
    onFindDoctorSpecialityClick: (String) -> Unit = {}
) {
    var selectedTab by remember(initialTab) { mutableIntStateOf(initialTab.coerceIn(0, 3)) }
    var showNotificationPanel by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Handle back button when Profile tab is selected
    androidx.activity.compose.BackHandler(enabled = selectedTab != 0) {
        selectedTab = 0
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Collect data from ViewModel
    val profile by viewModel.patientProfile.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val doctors by viewModel.recommendedDoctors.collectAsState()
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
                        0 -> HomeTabContent(
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            doctors = doctors,
                            paddingValues = paddingValues,
                            onNotificationClick = { showNotificationPanel = true },
                            onProfileClick = { selectedTab = 3 },
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
                            onFindDoctorSpecialityClick = onFindDoctorSpecialityClick
                        )
                        1 -> MedicineTabContent(
                            modifier = Modifier.padding(paddingValues),
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            onMedicineClick = onNavigateToMedicineDetail,
                            onPharmacyClick = onNavigateToPharmacy,
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToCart = onNavigateToMedicineCart
                        )
                        2 -> RecordsTabContent(
                            modifier = Modifier.padding(paddingValues),
                            profile = profile,
                            unreadNotificationsCount = unreadCount,
                            onNotificationClick = { showNotificationPanel = true },
                            onNavigateToPrescriptions = onNavigateToPrescriptions,
                            onNavigateToReports = onNavigateToReports
                        )
                        3 -> ProfileTabContent(
                            modifier = Modifier.padding(paddingValues),
                            profile = profile,
                            stats = stats,
                            unreadNotificationsCount = unreadCount,
                            onNotificationClick = { showNotificationPanel = true },
                            onLogout = onLogout,
                            onNavigateToVitals = onNavigateToVitals,
                            viewModel = viewModel
                        )
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
                    if (notification.actionRoute == Screen.VitalsReminders.route) {
                        onNavigateToVitals()
                    } else {
                        notification.actionRoute?.let(onNotificationActionRoute)
                    }
                    showNotificationPanel = false
                }
            )
        }
    }
}
