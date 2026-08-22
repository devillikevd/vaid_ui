package com.example.swastik

import android.os.Bundle
import android.annotation.SuppressLint
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.example.swastik.data.local.AppSettingsStore
import com.example.swastik.data.local.ThemePreference
import com.example.swastik.data.model.FacilityType
import androidx.compose.material3.ExperimentalMaterial3Api

import com.example.swastik.ui.components.SnackbarManager
import com.example.swastik.utils.NetworkObserver

import com.example.swastik.data.local.TokenManager
import com.example.swastik.navigation.Screen
import com.example.swastik.ui.screens.auth.*
import com.example.swastik.ui.screens.splash.SplashScreen
import com.example.swastik.ui.screens.consultation.VideoConsultationFlow
import com.example.swastik.ui.screens.patient.AppointmentHistoryScreen
import com.example.swastik.ui.screens.patient.EmergencyScreen
import com.example.swastik.ui.screens.patient.HospitalFinderScreen
import com.example.swastik.ui.screens.patient.FacilityDetailScreen
import com.example.swastik.ui.screens.patient.PatientDashboardScreen
import com.example.swastik.ui.screens.patient.booking.AppointmentBookingScreen
import com.example.swastik.ui.screens.patient.booking.FindDoctorsCategoriesScreen
import com.example.swastik.ui.screens.patient.DoctorProfileScreen
import com.example.swastik.ui.screens.patient.booking.AllSpecialitiesScreen
import com.example.swastik.ui.screens.patient.dashboard.ChatbotScreen
import com.example.swastik.ui.screens.patient.dashboard.PrescriptionsScreen
import com.example.swastik.ui.screens.patient.dashboard.ReportsScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineDetailScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineCartScreen
import com.example.swastik.ui.screens.patient.medicine.OrderHistoryScreen
import com.example.swastik.ui.screens.patient.diagnostic.BookingHistoryScreen
import com.example.swastik.ui.screens.patient.diagnostic.DiagnosticBookingScreen
import com.example.swastik.utils.navigateSafe

import android.view.WindowManager
import com.example.swastik.ui.theme.SwastikTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.flow.collectLatest

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var tokenManager: TokenManager
    @Inject lateinit var networkObserver: NetworkObserver

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_Swastik) // Revert from Splash theme to normal theme
        super.onCreate(savedInstanceState)
        
        // Disable secure screen (screenshots & screen recording)
        // Commented out to fix black screen in screenshots/mirroring during testing
        /* window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        ) */

        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false) // Enable edge-to-edge

        // Schedule periodic background smartwatch/Health Connect sync
        com.example.swastik.workers.HealthConnectSyncWorker.schedule(this)
        com.example.swastik.workers.HydrationReminderWorker.schedule(this)

        setContent {
            SwastikApp(tokenManager, networkObserver)
        }
    }
}

/**
 * Composable wrapper that guards deep-linked screens behind authentication.
 * If the user is not authenticated, they're redirected to Home (login/register).
 */
@Composable
private fun AuthGuard(
    navController: androidx.navigation.NavHostController,
    tokenManager: TokenManager,
    content: @Composable () -> Unit
) {
    if (tokenManager.isAuthenticated()) {
        content()
    } else {
        LaunchedEffect(Unit) {
            navController.navigateSafe(Screen.Splash.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}

@android.annotation.SuppressLint("MissingPermission")
private fun fetchCurrentLocationDirectly(
    context: android.content.Context,
    fusedLocationClient: com.google.android.gms.location.FusedLocationProviderClient,
    onLocationFetched: (String) -> Unit
) {
    try {
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                val geocoder = android.location.Geocoder(context, java.util.Locale.getDefault())
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    geocoder.getFromLocation(location.latitude, location.longitude, 1) { addresses ->
                        val address = addresses.firstOrNull()
                        if (address != null) {
                            val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                            onLocationFetched(locality)
                        }
                    }
                } else {
                    @Suppress("DEPRECATION")
                    val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                    val address = addresses?.firstOrNull()
                    if (address != null) {
                        val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                        onLocationFetched(locality)
                    }
                }
            }
        }
    } catch (e: Exception) {
        // Ignore or handle
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Composable
fun SwastikApp(tokenManager: TokenManager, networkObserver: NetworkObserver) {
    val navController = rememberNavController()
    val appSettings by AppSettingsStore.settings.collectAsState()

    // Apply Android internal localization when preference changes
    LaunchedEffect(appSettings.language) {
        // appSettings.language is now a BCP-47 tag (e.g. "en", "hi", "bn")
        // directly usable by AppCompatDelegate
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(appSettings.language))
    }

    LaunchedEffect(tokenManager, navController) {
        tokenManager.sessionExpired.collectLatest {
            navController.navigateSafe(Screen.PatientLogin.route) {
                launchSingleTop = true
                popUpTo(0) { inclusive = true }
            }
        }
    }

    SwastikTheme {
        val nextDestination = remember(tokenManager) {
            if (tokenManager.isAuthenticated()) {
                Screen.PatientDashboard.createRoute()
            } else {
                Screen.Splash.route
            }
        }
        val startDestination = Screen.Splash.route
        val snackbarHostState = remember { SnackbarHostState() }
        val isNetworkAvailable by networkObserver.observe().collectAsState(initial = true)

        LaunchedEffect(snackbarHostState) {
            SnackbarManager.messages.collect { message ->
                snackbarHostState.showSnackbar(message.message)
            }
        }

        LaunchedEffect(isNetworkAvailable) {
            if (!isNetworkAvailable) {
                SnackbarManager.showError("You are currently offline. Some features may not work.")
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = startDestination,
                // modifier = Modifier.padding(paddingValues), // Removed to allow edge-to-edge drawing
                enterTransition = {
                    slideInHorizontally(
                        initialOffsetX = { fullWidth -> fullWidth },
                        animationSpec = tween(300)
                    )
                },
                exitTransition = {
                    slideOutHorizontally(
                        targetOffsetX = { fullWidth -> -fullWidth / 3 },
                        animationSpec = tween(300)
                    ) + fadeOut(animationSpec = tween(300))
                },
                popEnterTransition = {
                    slideInHorizontally(
                        initialOffsetX = { fullWidth -> -fullWidth / 3 },
                        animationSpec = tween(300)
                    ) + fadeIn(animationSpec = tween(300))
                },
                popExitTransition = {
                    slideOutHorizontally(
                        targetOffsetX = { fullWidth -> fullWidth },
                        animationSpec = tween(300)
                    )
                }
            ) {

        // ── Splash & Auth ──────────────────────────────────────────
        composable(Screen.Splash.route) {
            val isAuthenticated = tokenManager.isAuthenticated()
            SplashScreen(
                isAuthenticated = isAuthenticated,
                onAutoNavigate = {
                    navController.navigateSafe(Screen.PatientDashboard.createRoute()) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onPatientRegisterClick = { navController.navigateSafe(Screen.PatientRegister.route) },
                onPatientLoginClick = { navController.navigateSafe(Screen.PatientLogin.route) }
            )
        }

        composable(Screen.PatientRegister.route) {
            PatientRegisterScreen(
                onLoginClick = {
                    navController.navigateSafe(Screen.PatientLogin.route) {
                        popUpTo(Screen.PatientRegister.route) { inclusive = true }
                    }
                },
                onBackClick = { navController.popBackStack() },
                onRegisterSuccess = { email, name, phone, password ->
                    navController.navigateSafe(Screen.EmailVerificationPending.createRoute(email, name, phone, password)) {
                        popUpTo(Screen.PatientRegister.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.PatientLogin.route) {
            PatientLoginScreen(
                onRegisterClick = {
                    navController.navigateSafe(Screen.PatientRegister.route) {
                        popUpTo(Screen.PatientLogin.route) { inclusive = true }
                    }
                },
                onBackClick = { navController.popBackStack() },
                onLoginSuccess = {
                    navController.navigateSafe(Screen.PatientDashboard.createRoute()) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.EmailVerificationPending.route,
            arguments = listOf(
                androidx.navigation.navArgument("email") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("name") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("phone") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("password") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email")?.let {
                try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
            } ?: ""
            val name = backStackEntry.arguments?.getString("name")?.let {
                try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
            } ?: ""
            val phone = backStackEntry.arguments?.getString("phone")?.let {
                try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
            } ?: ""
            val password = backStackEntry.arguments?.getString("password")?.let {
                try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
            } ?: ""
            EmailVerificationPendingScreen(
                email = email,
                name = name,
                phone = phone,
                password = password,
                onBackClick = { 
                    navController.navigateSafe(Screen.Splash.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onLoginSuccess = {
                    navController.navigateSafe(Screen.PatientDashboard.createRoute()) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.LocationSelection.route) {
            AuthGuard(navController, tokenManager) {
                val dashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                val profile by dashboardViewModel.patientProfile.collectAsState()
                var showAddressesDialog by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
                var addressToEdit by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<com.example.swastik.data.model.SavedAddress?>(null) }
                
                val context = androidx.compose.ui.platform.LocalContext.current
                val fusedLocationClient = androidx.compose.runtime.remember { 
                    com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context) 
                }
                var pendingLocationCallback by androidx.compose.runtime.remember { 
                    androidx.compose.runtime.mutableStateOf<((String) -> Unit)?>(null) 
                }
                val locationPermissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                    contract = androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
                ) { permissions ->
                    val isGranted = permissions[android.Manifest.permission.ACCESS_FINE_LOCATION] == true || 
                                    permissions[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true
                    if (isGranted) {
                        try {
                            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                                if (location != null) {
                                    val geocoder = android.location.Geocoder(context, java.util.Locale.getDefault())
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                                        geocoder.getFromLocation(location.latitude, location.longitude, 1) { addresses ->
                                            val address = addresses.firstOrNull()
                                            if (address != null) {
                                                val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                                                pendingLocationCallback?.invoke(locality)
                                                pendingLocationCallback = null
                                            }
                                        }
                                    } else {
                                        @Suppress("DEPRECATION")
                                        val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                                        val address = addresses?.firstOrNull()
                                        if (address != null) {
                                            val locality = address.locality ?: address.subAdminArea ?: address.adminArea ?: "Unknown"
                                            pendingLocationCallback?.invoke(locality)
                                            pendingLocationCallback = null
                                        }
                                    }
                                }
                            }
                        } catch (e: SecurityException) {
                            // Permission was revoked
                        }
                    }
                }
                
                Box(modifier = Modifier.fillMaxSize()) {
                    com.example.swastik.ui.screens.patient.location.LocationSelectionScreen(
                        profile = profile,
                        onBackClick = { navController.popBackStack() },
                        onLocationSelected = { newLocation ->
                            dashboardViewModel.updateProfile(com.example.swastik.data.remote.dto.UpdateProfileRequest(location = newLocation))
                            navController.popBackStack()
                        },
                        onAddAddressClick = { 
                            addressToEdit = null
                            showAddressesDialog = true 
                        },
                        onEditAddressClick = { address ->
                            addressToEdit = address
                            showAddressesDialog = true
                        },
                        onDeleteAddressClick = { addressId ->
                            dashboardViewModel.deleteAddress(addressId)
                        }
                    )

                    if (showAddressesDialog) {
                        com.example.swastik.ui.screens.patient.location.AddLocationDetailsBottomSheet(
                            initialLabel = addressToEdit?.label ?: "",
                            initialAddress = addressToEdit?.address ?: "",
                            onDismiss = { showAddressesDialog = false },
                            onSaveAddress = { label, address ->
                                addressToEdit?.let { oldAddress ->
                                    dashboardViewModel.deleteAddress(oldAddress.id)
                                }
                                dashboardViewModel.addAddress(label, address)
                            },
                            onFetchLocation = { onLocationFetched ->
                                pendingLocationCallback = onLocationFetched
                                val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                                                   androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
                                
                                if (hasPermission) {
                                    fetchCurrentLocationDirectly(context, fusedLocationClient) { locality ->
                                        pendingLocationCallback?.invoke(locality)
                                        pendingLocationCallback = null
                                    }
                                } else {
                                    locationPermissionLauncher.launch(
                                        arrayOf(
                                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                                            android.Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                }
                            }
                        )
                    }
                }
            }
        }

        // ── Patient Dashboard ─────────────────────────────
        composable(
            route = Screen.PatientDashboard.route,
            arguments = listOf(
                navArgument("tab") {
                    type = NavType.IntType
                    defaultValue = 0
                }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://dashboard" },
                navDeepLink { uriPattern = "vaididea://dashboard?tab={tab}" },
                navDeepLink { uriPattern = "https://vaididea.in/dashboard" },
                navDeepLink { uriPattern = "https://vaididea.in/dashboard?tab={tab}" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
            val initialTab = backStackEntry.arguments?.getInt("tab") ?: 0
            PatientDashboardScreen(
                initialTab = initialTab,
                onLogout = {
                    navController.navigateSafe(Screen.Splash.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToAppointments = {
                    navController.navigateSafe(Screen.AppointmentHistory.createRoute())
                },
                onStartInPersonConsultation = {
                    navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("in_person"))
                },
                onStartVideoConsultation = {
                    navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("video"))
                },
                onNavigateToHospitals = { navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.HOSPITAL)) },
                onNavigateToClinics = { navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.CLINIC)) },
                onNavigateToPharmacies = { navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.MEDICAL_STORE)) },
                onNavigateToFitnessCenters = { navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.FITNESS_CENTER)) },
                onNavigateToHospitalDetail = { hospitalId -> navController.navigateSafe(Screen.HospitalDetail.createRoute(hospitalId)) },
                onNavigateToClinicDetail = { clinicId -> navController.navigateSafe(Screen.ClinicDetail.createRoute(clinicId)) },
                onNavigateToPharmacyDetail = { pharmacyId -> navController.navigateSafe(Screen.PharmacyDetail.createRoute(pharmacyId)) },
                onNavigateToDiagnosticDetail = { diagnosticId -> navController.navigateSafe(Screen.DiagnosticDetail.createRoute(diagnosticId)) },
                onNavigateToFitnessCenterDetail = { fitnessId -> navController.navigateSafe(Screen.FitnessCenterDetail.createRoute(fitnessId)) },
                onJoinVideoConsultation = { appointmentId, doctorName -> 
                    navController.navigateSafe(Screen.VideoConsultation.createRoute(appointmentId, doctorName)) 
                },
                onNavigateToPharmacy = { pharmacyId, pharmacyName ->
                    navController.navigateSafe(
                        Screen.HospitalFinder.createRoute(
                            type = FacilityType.MEDICAL_STORE,
                            focusFacilityId = pharmacyId,
                            focusFacilityName = pharmacyName
                        )
                    )
                },
                onNavigateToReports = { navController.navigateSafe(Screen.Reports.route) },
                onNavigateToPrescriptions = { navController.navigateSafe(Screen.Prescriptions.createRoute()) },
                onNavigateToChatbot = { navController.navigateSafe(Screen.Chatbot.route) },
                onNavigateToBookingHistory = { navController.navigateSafe(Screen.BookingHistory.route) },
                onNavigateToWellnessSessions = { navController.navigateSafe(Screen.WellnessSessions.route) },
                onNavigateToBooking = { doctorId ->
                    if (doctorId != null) {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(doctorId = doctorId))
                    } else {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute())
                    }
                },
                onNavigateToActiveBooking = { appointmentId ->
                    navController.navigateSafe(Screen.ActiveBookingStatus.createRoute(appointmentId))
                },
                onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) },
                onNavigateToLocationSelection = { navController.navigateSafe(Screen.LocationSelection.route) },
                onNavigateToDiagnostic = {
                    navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.DIAGNOSTIC_CENTER))
                },
                onNavigateToVitals = { /* handled internally or unused */ },
                onNavigateToHealthCard = { navController.navigateSafe(Screen.HealthCard.route) },
                onNavigateToOrderHistory = { navController.navigateSafe(Screen.OrderHistory.createRoute(0)) },
                onNavigateToDietTracker = { navController.navigateSafe(Screen.DietTracker.route) },
                onNavigateToWellnessHub = { navController.navigateSafe(Screen.WellnessHub.createRoute()) },
                onNavigateToHealthConnectDashboard = { navController.navigateSafe(Screen.HealthConnectDashboard.route) },
                onNavigateToMedicineDetail = { medicineId ->
                    navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                },
                onNavigateToMedicineCart = { cartType -> navController.navigateSafe(Screen.MedicineCart.createRoute(cartType)) },
                onNavigateToFavoriteMedicines = { navController.navigateSafe(Screen.FavoriteMedicines.route) },
                onNavigateToFavoriteDoctors = { navController.navigateSafe(Screen.FavoriteDoctors.route) },
                onNavigateToFavoriteFacilities = { type -> navController.navigateSafe(Screen.FavoriteFacilities.createRoute(type)) },
                onSearchClick = { navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("in_person")) },
                onNotificationActionRoute = { route -> navController.navigateSafe(route) },
                onFindDoctorSpecialityClick = { speciality ->
                    val (mappedSpecialization, mappedSearch) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(speciality)
                    navController.navigateSafe(Screen.SpecialityDetail.createRoute(
                        specialization = mappedSpecialization ?: speciality,
                        search = mappedSearch,
                        mode = "in_person"
                    ))
                },
                onNavigateToCommunityQA = { navController.navigateSafe(Screen.CommunityQA.route) },
                onDoctorClick = { doctorId -> 
                    navController.navigateSafe(Screen.DoctorProfile.createRoute(doctorId))
                },
                onNavigateToAllRecommendedDoctors = {
                    navController.navigateSafe(Screen.AppointmentBooking.createRoute(consultationMode = "recommended"))
                },
                onNavigateToGuardianDashboard = {
                    navController.navigateSafe(Screen.GuardianDashboard.route)
                },
                onNavigateToVolunteerRegistration = {
                    navController.navigateSafe(Screen.HeroVolunteerRegistration.route)
                }
            )
            }
        }

        composable(Screen.FavoriteDoctors.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.FavoriteDoctorsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onDoctorClick = { doctorId -> 
                        navController.navigateSafe(Screen.DoctorProfile.createRoute(doctorId))
                    }
                )
            }
        }

        composable(
            route = Screen.FavoriteFacilities.route,
            arguments = listOf(
                navArgument("type") {
                    type = NavType.StringType
                    defaultValue = ""
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val type = backStackEntry.arguments?.getString("type") ?: ""
                com.example.swastik.ui.screens.patient.FavoriteFacilitiesScreen(
                    facilityTypeStr = type,
                    onNavigateBack = { navController.popBackStack() },
                    onFacilityClick = { facilityId, facilityType ->
                        navController.navigateSafe(Screen.FacilityDetail.createRoute(facilityId, facilityType))
                    }
                )
            }
        }

        composable(Screen.FavoriteMedicines.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.FavoriteMedicinesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToMedicineDetail = { medicineId ->
                        navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.createRoute("GLOBAL")) }
                )
            }
        }

        composable(Screen.CommunityQA.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.community.CommunityQAScreen(
                    navController = navController
                )
            }
        }

        composable(Screen.AskQuestion.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.community.AskQuestionScreen(
                    navController = navController
                )
            }
        }

        composable(
            route = Screen.CommunityQADetails.route,
            arguments = listOf(
                navArgument("questionId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val questionId = backStackEntry.arguments?.getString("questionId") ?: ""
                com.example.swastik.ui.screens.patient.community.CommunityQADetailsScreen(
                    navController = navController,
                    questionId = questionId
                )
            }
        }

        composable(
            route = Screen.ActiveBookingStatus.route,
            arguments = listOf(
                navArgument("appointmentId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val appointmentId = backStackEntry.arguments?.getString("appointmentId") ?: ""
                com.example.swastik.ui.screens.patient.booking.ActiveBookingStatusScreen(
                    appointmentId = appointmentId,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToDoctorProfile = { doctorId ->
                        navController.navigate(Screen.DoctorProfile.createRoute(doctorId))
                    }
                )
            }
        }

        // ── Patient Feature Screens ───────────────────────
        composable(
            route = Screen.FindDoctorsCategories.route,
            arguments = listOf(
                navArgument("mode") {
                    type = NavType.StringType
                    defaultValue = "in_person"
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val mode = backStackEntry.arguments?.getString("mode") ?: "in_person"
                FindDoctorsCategoriesScreen(
                    mode = mode,
                    onBackClick = { navController.popBackStack() },
                    onSpecialityClick = { specialization, search ->
                        navController.navigateSafe(Screen.SpecialityDetail.createRoute(
                            specialization = specialization ?: "General Physician",
                            search = search,
                            mode = mode
                        ))
                    },
                    onViewAllSpecialities = {
                        navController.navigateSafe(Screen.AllSpecialities.createRoute(mode))
                    },
                    onViewAllCategories = {
                        navController.navigateSafe(Screen.AllCategories.route)
                    }
                )
            }
        }

        composable(route = Screen.AllCategories.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.booking.AllCategoriesScreen(
                    onBackClick = { navController.popBackStack() },
                    onCategoryClick = { specialization, search ->
                        navController.navigateSafe(Screen.SpecialityDetail.createRoute(
                            specialization = specialization ?: "General Physician",
                            search = search,
                            mode = "in_person"
                        ))
                    }
                )
            }
        }

        composable(
            route = Screen.DoctorProfile.route,
            arguments = listOf(navArgument("doctorId") { type = NavType.StringType })
        ) { backStackEntry ->
            val doctorId = backStackEntry.arguments?.getString("doctorId") ?: ""
            DoctorProfileScreen(
                doctorId = doctorId,
                onBackClick = { navController.popBackStack() },
                onBookClick = {
                    navController.navigateSafe(
                        Screen.AppointmentBooking.createRoute(doctorId = it)
                    )
                },
                onHospitalClick = { hospitalId ->
                    navController.navigateSafe(Screen.HospitalDetail.createRoute(hospitalId))
                },
                onClinicClick = { clinicId ->
                    navController.navigateSafe(Screen.ClinicDetail.createRoute(clinicId))
                }
            )
        }

        composable(
            route = Screen.AllSpecialities.route,
            arguments = listOf(
                navArgument("mode") {
                    type = NavType.StringType
                    defaultValue = "in_person"
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val mode = backStackEntry.arguments?.getString("mode") ?: "in_person"
                AllSpecialitiesScreen(
                    mode = mode,
                    onBackClick = { navController.popBackStack() },
                    onSpecialityClick = { specialization, search ->
                        navController.navigateSafe(Screen.SpecialityDetail.createRoute(
                            specialization = specialization ?: "General Physician",
                            search = search,
                            mode = mode
                        ))
                    }
                )
            }
        }

        composable(
            route = Screen.SpecialityDetail.route,
            arguments = listOf(
                navArgument("specialization") {
                    type = NavType.StringType
                    defaultValue = "General Physician"
                },
                navArgument("search") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("mode") {
                    type = NavType.StringType
                    defaultValue = "in_person"
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val specialization = backStackEntry.arguments?.getString("specialization") ?: "General Physician"
                val search = backStackEntry.arguments?.getString("search")
                val mode = backStackEntry.arguments?.getString("mode") ?: "in_person"
                com.example.swastik.ui.screens.patient.booking.SpecialityDetailScreen(
                    specialization = specialization,
                    search = search,
                    mode = mode,
                    onBackClick = { navController.popBackStack() },
                    onConsultClick = { spec, q, m ->
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(
                            specialization = spec,
                            search = q,
                            consultationMode = m
                        ))
                    }
                )
            }
        }

        composable(
            route = Screen.AppointmentBooking.route,
            arguments = listOf(
                androidx.navigation.navArgument("doctorId") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("hospitalId") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("clinicId") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("specialization") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("consultationMode") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                },
                androidx.navigation.navArgument("search") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val doctorId = backStackEntry.arguments?.getString("doctorId")?.takeIf { it.isNotBlank() }
                val hospitalId = backStackEntry.arguments?.getString("hospitalId")?.takeIf { it.isNotBlank() }
                val clinicId = backStackEntry.arguments?.getString("clinicId")?.takeIf { it.isNotBlank() }
                val specialization = backStackEntry.arguments?.getString("specialization")?.let { java.net.URLDecoder.decode(it, "UTF-8") }?.takeIf { it.isNotBlank() }
                val consultationMode = backStackEntry.arguments?.getString("consultationMode")?.takeIf { it.isNotBlank() }
                val search = backStackEntry.arguments?.getString("search")?.let { java.net.URLDecoder.decode(it, "UTF-8") }?.takeIf { it.isNotBlank() }

                AppointmentBookingScreen(
                    onBackClick = { navController.popBackStack() },
                    onBookingComplete = {
                        navController.popBackStack()
                        navController.navigateSafe(Screen.AppointmentHistory.createRoute("upcoming"))
                    },
                    onNavigateToHistory = {
                        navController.navigateSafe(Screen.AppointmentHistory.createRoute("upcoming"))
                    },
                    onNavigateToDoctorProfile = { doctorId ->
                        navController.navigateSafe(Screen.DoctorProfile.createRoute(doctorId))
                    },
                    preselectedDoctorId = doctorId,
                    preselectedHospitalId = hospitalId,
                    preselectedClinicId = clinicId,
                    preselectedSpecialization = specialization,
                    consultationMode = consultationMode,
                    preselectedSearch = search
                )
            }
        }

        composable(
            route = Screen.AppointmentHistory.route,
            arguments = listOf(
                navArgument("filter") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://appointments" },
                navDeepLink { uriPattern = "https://vaididea.in/appointments" }
            )
        ) { backStackEntry ->
            val initialFilter = backStackEntry.arguments?.getString("filter")
            AuthGuard(navController, tokenManager) {
            AppointmentHistoryScreen(
                initialFilter = initialFilter,
                onBackClick = { navController.popBackStack() },
                onStartConsultation = { appointment ->
                    navController.navigateSafe(
                        Screen.VideoConsultation.createRoute(
                            appointment.id,
                            appointment.doctor?.name ?: "Doctor"
                        )
                    )
                },
                onNavigateToPrescriptions = { appointmentId -> 
                    if (appointmentId != null) {
                        navController.navigateSafe(Screen.Prescriptions.createRoute(appointmentId = appointmentId))
                    } else {
                        navController.navigateSafe(Screen.Prescriptions.createRoute()) 
                    }
                },
                onNavigateToBooking = { doctorId -> 
                    if (doctorId != null) {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(doctorId = doctorId))
                    } else {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute())
                    }
                }
            )
            }
        }

        composable(
            route = Screen.HospitalFinder.route,
            arguments = listOf(
                navArgument("type") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("focusFacilityId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("focusFacilityName") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val initialFacilityType = backStackEntry.arguments
                    ?.getString("type")
                    ?.let { value -> runCatching { FacilityType.valueOf(value) }.getOrNull() }
                val focusedFacilityId = backStackEntry.arguments?.getString("focusFacilityId")
                val focusedFacilityName = backStackEntry.arguments
                    ?.getString("focusFacilityName")
                    ?.let { value -> java.net.URLDecoder.decode(value, "UTF-8") }
                HospitalFinderScreen(
                    initialFacilityType = initialFacilityType,
                    focusedFacilityId = focusedFacilityId,
                    focusedFacilityName = focusedFacilityName,
                    onBackClick = { navController.popBackStack() },
                    onDoctorBookClick = { doctor, facility ->
                        navController.navigateSafe(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                hospitalId = facility.id.takeIf { facility.type == FacilityType.HOSPITAL && it.isNotBlank() },
                                clinicId = facility.id.takeIf { facility.type == FacilityType.CLINIC && it.isNotBlank() }
                            )
                        )
                    },
                    onHospitalClick = { hospitalId ->
                        navController.navigateSafe(Screen.HospitalDetail.createRoute(hospitalId))
                    },
                    onClinicClick = { clinicId ->
                        navController.navigateSafe(Screen.ClinicDetail.createRoute(clinicId))
                    },
                    onPharmacyDetailClick = { pharmacyId ->
                        navController.navigateSafe(Screen.PharmacyDetail.createRoute(pharmacyId))
                    },
                    onDiagnosticDetailClick = { centerId ->
                    navController.navigateSafe(Screen.DiagnosticDetail.createRoute(centerId))
                    },
                    onFitnessCenterDetailClick = { centerId ->
                        navController.navigateSafe(Screen.FitnessCenterDetail.createRoute(centerId))
                    },
                    onMedicineClick = { medicineId ->
                        navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onNavigateToCart = {
                        navController.navigateSafe(Screen.MedicineCart.createRoute("GLOBAL"))
                    },
                    onNavigateToPharmacyCart = {
                        navController.navigateSafe(Screen.MedicineCart.createRoute("PHARMACY"))
                    },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(centerId))
                    }
                )
            }
        }

        composable(
            Screen.FacilityDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("facilityId") {
                    type = androidx.navigation.NavType.StringType
                },
                androidx.navigation.navArgument("facilityType") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val facilityId = backStackEntry.arguments?.getString("facilityId") ?: return@AuthGuard
                val typeStr = backStackEntry.arguments?.getString("facilityType") ?: return@AuthGuard
                val type = runCatching { FacilityType.valueOf(typeStr) }.getOrNull() ?: FacilityType.HOSPITAL

                FacilityDetailScreen(
                    facilityId = facilityId,
                    facilityType = type,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { doctor, facility ->
                        navController.navigateSafe(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                hospitalId = if (type == FacilityType.HOSPITAL) facility.id.ifBlank { null } else null,
                                clinicId = if (type == FacilityType.CLINIC) facility.id.ifBlank { null } else null
                            )
                        )
                    },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    }
                )
            }
        }

        composable(
            Screen.HospitalDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("hospitalId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val hospitalId = backStackEntry.arguments?.getString("hospitalId") ?: return@AuthGuard
                FacilityDetailScreen(
                    facilityId = hospitalId,
                    facilityType = FacilityType.HOSPITAL,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { doctor, facility ->
                        navController.navigateSafe(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                hospitalId = facility.id.ifBlank { null }
                            )
                        )
                    },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(centerId))
                    }
                )
            }
        }

        composable(
            Screen.ClinicDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("clinicId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val clinicId = backStackEntry.arguments?.getString("clinicId") ?: return@AuthGuard
                FacilityDetailScreen(
                    facilityId = clinicId,
                    facilityType = FacilityType.CLINIC,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { doctor, facility ->
                        navController.navigateSafe(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                clinicId = facility.id.ifBlank { null }
                            )
                        )
                    },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(centerId))
                    }
                )
            }
        }

        composable(
            Screen.PharmacyDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("pharmacyId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val pharmacyId = backStackEntry.arguments?.getString("pharmacyId") ?: return@AuthGuard
                FacilityDetailScreen(
                    facilityId = pharmacyId,
                    facilityType = FacilityType.MEDICAL_STORE,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { _, _ -> },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(centerId))
                    }
                )
            }
        }

        composable(
            Screen.DiagnosticDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("centerId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val centerId = backStackEntry.arguments?.getString("centerId") ?: return@AuthGuard
                FacilityDetailScreen(
                    facilityId = centerId,
                    facilityType = FacilityType.DIAGNOSTIC_CENTER,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { _, _ -> },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.OrderHistory.createRoute(0))
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(centerId))
                    }
                )
            }
        }

        composable(
            Screen.FitnessCenterDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("centerId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val centerId = backStackEntry.arguments?.getString("centerId") ?: return@AuthGuard
                FacilityDetailScreen(
                    facilityId = centerId,
                    facilityType = FacilityType.FITNESS_CENTER,
                    onBackClick = { navController.popBackStack() },
                    isLoggedIn = tokenManager.isAuthenticated(),
                    onDoctorBookClick = { _, _ -> },
                    onNavigateToOrders = {
                        navController.navigateSafe(Screen.BookingHistory.route)
                    },
                    onNavigateToDiagnosticBooking = { diagnosticCenterId ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(diagnosticCenterId))
                    }
                )
            }
        }

        composable(Screen.MedicineFinder.route) {
            AuthGuard(navController, tokenManager) {
                MedicineScreen(
                    onBackClick = { navController.popBackStack() },
                    onMedicineClick = { medicineId ->
                        navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onPharmacyClick = { pharmacyId, pharmacyName ->
                        navController.navigateSafe(
                            Screen.HospitalFinder.createRoute(
                                type = FacilityType.MEDICAL_STORE,
                                focusFacilityId = pharmacyId,
                                focusFacilityName = pharmacyName
                            )
                        )
                    },
                    onNavigateToHome = { navController.popBackStack() },
                    onNavigateToRecords = { navController.navigateSafe(Screen.Reports.route) },
                    onNavigateToProfile = { navController.navigateSafe(Screen.PatientDashboard.createRoute(4)) },
                    onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.createRoute("GLOBAL")) }
                )
            }
        }

        composable(
            route = Screen.MedicineDetail.route,
            arguments = listOf(
                navArgument("medicineId") { type = NavType.StringType }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://medicine/{medicineId}" },
                navDeepLink { uriPattern = "https://vaididea.in/medicine/{medicineId}" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
            val medicineId = backStackEntry.arguments?.getString("medicineId") ?: ""
            MedicineDetailScreen(
                medicineId = medicineId,
                onBackClick = { navController.popBackStack() },
                onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.createRoute("GLOBAL")) },
                onNavigateToPharmacyCart = { navController.navigateSafe(Screen.MedicineCart.createRoute("PHARMACY")) },
                onMedicineClick = { id -> navController.navigateSafe("medicine_detail/$id") }
            )
            }
        }

        composable(
            route = Screen.VideoConsultation.route,
            arguments = listOf(
                navArgument("appointmentId") { type = NavType.StringType },
                navArgument("doctorName") { type = NavType.StringType }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://consultation/{appointmentId}/{doctorName}" },
                navDeepLink { uriPattern = "https://vaididea.in/consultation/{appointmentId}/{doctorName}" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val appointmentId = backStackEntry.arguments?.getString("appointmentId") ?: ""
                val doctorName = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("doctorName") ?: "Doctor", "UTF-8"
                )
                
                val context = androidx.compose.ui.platform.LocalContext.current
                LaunchedEffect(appointmentId) {
                    val intent = android.content.Intent(context, com.example.swastik.ui.screens.consultation.ConsultationActivity::class.java).apply {
                        putExtra("appointmentId", appointmentId)
                        putExtra("doctorName", doctorName)
                    }
                    context.startActivity(intent)
                    navController.popBackStack()
                }
            }
        }

        composable(
            route = Screen.Reports.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://reports" },
                navDeepLink { uriPattern = "https://vaididea.in/reports" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                ReportsScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }



        composable(
            route = "prescriptions?appointmentId={appointmentId}",
            arguments = listOf(
                androidx.navigation.navArgument("appointmentId") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://prescriptions" },
                navDeepLink { uriPattern = "https://vaididea.in/prescriptions" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
            val appointmentId = backStackEntry.arguments?.getString("appointmentId")
            PrescriptionsScreen(
                initialAppointmentId = appointmentId,
                onBackClick = { navController.popBackStack() },
                onNavigateToOrderHistory = { navController.navigateSafe(Screen.OrderHistory.createRoute(0)) }
            )
            }
        }

        composable(
            route = Screen.Chatbot.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://chatbot" },
                navDeepLink { uriPattern = "https://vaididea.in/chatbot" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            ChatbotScreen(
                onBackClick = { navController.popBackStack() },
                onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) }
            )
            }
        }

        composable(
            route = Screen.Emergency.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://emergency" },
                navDeepLink { uriPattern = "https://vaididea.in/emergency" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            EmergencyScreen(
                onBackClick = { navController.popBackStack() }
            )
            }
        }

        // ── New Feature Screens ───────────────────────────
        composable(
            route = Screen.DiagnosticBooking.route,
            arguments = listOf(
                androidx.navigation.navArgument("centerId") {
                    type = androidx.navigation.NavType.StringType
                    defaultValue = ""
                    nullable = true
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val centerId = backStackEntry.arguments?.getString("centerId")?.takeIf { it.isNotBlank() }
                DiagnosticBookingScreen(
                    onBackClick = { navController.popBackStack() },
                    initialCenterId = centerId,
                    onNavigateToBookingHistory = { navController.navigateSafe(Screen.BookingHistory.route) }
                )
            }
        }


        composable(
            route = Screen.HealthCard.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://health-card" },
                navDeepLink { uriPattern = "https://vaididea.in/health-card" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                val dashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                val recordsViewModel: com.example.swastik.ui.viewmodel.RecordsViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.HealthCardScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToGuardianDashboard = { navController.navigateSafe(Screen.GuardianDashboard.route) },
                    onNavigateToHealthConnectDashboard = { navController.navigateSafe(Screen.HealthConnectDashboard.route) },
                    onNavigateToDietTracker = { navController.navigateSafe(Screen.DietTracker.route) },
                    onNavigateToWellnessHub = { navController.navigateSafe(Screen.WellnessHub.route) },
                    dashboardViewModel = dashboardViewModel,
                    recordsViewModel = recordsViewModel
                )
            }
        }

        composable(Screen.HealthConnectDashboard.route) {
            AuthGuard(navController, tokenManager) {
                val recordsViewModel: com.example.swastik.ui.viewmodel.RecordsViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.HealthConnectDashboardScreen(
                    onNavigateBack = { navController.popBackStack() },
                    recordsViewModel = recordsViewModel
                )
            }
        }

        composable(Screen.GuardianDashboard.route) {
            AuthGuard(navController, tokenManager) {
                val dashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.guardian.GuardianDashboardScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = dashboardViewModel,
                    onNavigateToVolunteerRegistration = { navController.navigateSafe(Screen.HeroVolunteerRegistration.route) }
                )
            }
        }

        composable(Screen.HeroVolunteerRegistration.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.guardian.HeroVolunteerRegistrationScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.EmergencyIncomingAlarm.route,
            arguments = listOf(
                androidx.navigation.navArgument("broadcastId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            val broadcastId = backStackEntry.arguments?.getString("broadcastId") ?: ""
            com.example.swastik.ui.screens.patient.guardian.EmergencyIncomingAlarmScreen(
                broadcastId = broadcastId,
                onAccepted = {
                    navController.navigateSafe(Screen.EmergencyActiveResponse.createRoute(broadcastId))
                },
                onDeclined = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.EmergencyActiveResponse.route,
            arguments = listOf(
                androidx.navigation.navArgument("broadcastId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            val broadcastId = backStackEntry.arguments?.getString("broadcastId") ?: ""
            com.example.swastik.ui.screens.patient.guardian.EmergencyActiveResponseScreen(
                broadcastId = broadcastId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.WellnessHub.route,
            arguments = listOf(
                androidx.navigation.navArgument("section") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                val section = backStackEntry.arguments?.getString("section")
                com.example.swastik.ui.screens.patient.wellness.WellnessHubScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToDietTracker = { navController.navigateSafe(Screen.DietTracker.route) },
                    onNavigateToHealthConnectDashboard = { navController.navigateSafe(Screen.HealthConnectDashboard.route) },
                    onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) },
                    onNavigateToFitnessCenters = { navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.FITNESS_CENTER)) },
                    onNavigateToFitnessCenterDetail = { centerId -> navController.navigateSafe(Screen.FitnessCenterDetail.createRoute(centerId)) },
                    onNavigateToWorkouts = { navController.navigateSafe(Screen.WellnessWorkouts.route) },
                    onNavigateToExperts = { navController.navigateSafe(Screen.WellnessExperts.route) },
                    onNavigateToCommunity = { navController.navigateSafe(Screen.WellnessCommunity.route) },
                    onNavigateToChallenges = { navController.navigateSafe(Screen.WellnessChallenges.route) },
                    onNavigateToSupplements = { navController.navigateSafe(Screen.WellnessSupplements.route) },
                    onNavigateToReports = { navController.navigateSafe(Screen.WellnessReports.route) },
                    onNavigateToAICoach = { navController.navigateSafe(Screen.WellnessAICoach.route) },
                    onNavigateToAssessment = { navController.navigateSafe(Screen.WellnessAssessment.route) },
                    onNavigateToWorkoutPlayer = { planId -> navController.navigateSafe(Screen.WorkoutPlayer.createRoute(planId)) },
                    onNavigateToWorkoutCalendar = { navController.navigateSafe(Screen.WorkoutCalendar.route) },
                    onNavigateToQrCheckIn = { navController.navigateSafe(Screen.QrGymCheckIn.route) },
                    onNavigateToTypedReports = { navController.navigateSafe(Screen.WellnessTypedReports.route) },
                    onNavigateToCoachDashboard = { navController.navigateSafe(Screen.CoachDashboard.route) },
                    onNavigateToReminders = { navController.navigateSafe(Screen.WellnessReminders.route) },
                    onNavigateToBadges = { navController.navigateSafe(Screen.WellnessBadges.route) },
                    onNavigateToReels = { navController.navigateSafe(Screen.WellnessReels.route) },
                    onNavigateToSafety = { navController.navigateSafe(Screen.WellnessSafety.route) },
                    initialSection = section,
                    viewModel = wellnessViewModel
                )
            }
        }

        // ==================== Wellness Sub-Screens (Separate Pages) ====================

        composable(Screen.WellnessWorkouts.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessWorkoutScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorkoutPlayer = { planId -> navController.navigateSafe(Screen.WorkoutPlayer.createRoute(planId)) },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(
            route = Screen.WorkoutPlayer.route,
            arguments = listOf(navArgument("planId") { type = NavType.StringType })
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val planId = backStackEntry.arguments?.getString("planId") ?: return@AuthGuard
                com.example.swastik.ui.screens.patient.wellness.WorkoutPlayerScreen(
                    planId = planId,
                    onBackClick = { navController.popBackStack() },
                    onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) }
                )
            }
        }

        composable(Screen.WellnessExperts.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessExpertsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onCoachClick = { coachId -> navController.navigateSafe(Screen.WellnessCoachDetail.createRoute(coachId)) },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessCommunity.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessCommunityScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessChallenges.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessChallengesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessSupplements.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessSupplementsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessReports.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessReportsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorkouts = { navController.navigateSafe(Screen.WellnessWorkouts.route) },
                    onNavigateToDietTracker = { navController.navigateSafe(Screen.DietTracker.route) },
                    onNavigateToHealthConnect = { navController.navigateSafe(Screen.HealthConnectDashboard.route) },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessAICoach.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessAICoachScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = wellnessViewModel,
                    onNavigateToAssessment = { navController.navigateSafe(Screen.WellnessAssessment.route) },
                    onNavigateToDoctorSearch = { navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("in_person")) }
                )
            }
        }

        composable(Screen.WellnessAssessment.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessAssessmentScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorkouts = { navController.navigate(Screen.WellnessWorkouts.route) },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessSafety.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessSafetyScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) },
                    onNavigateToAssessment = { navController.navigateSafe(Screen.WellnessAssessment.route) },
                    onNavigateToDoctorConsult = { navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("online")) },
                    viewModel = wellnessViewModel
                )
            }
        }

        // ==================== Wellness Coach Detail & Sessions ====================

        composable(
            route = Screen.WellnessCoachDetail.route,
            arguments = listOf(navArgument("coachId") { type = NavType.StringType })
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val coachId = backStackEntry.arguments?.getString("coachId") ?: return@AuthGuard
                com.example.swastik.ui.screens.patient.wellness.WellnessCoachDetailScreen(
                    coachId = coachId,
                    onBackClick = { navController.popBackStack() },
                    onBookSession = { id -> navController.navigateSafe(Screen.WellnessSessionBooking.createRoute(id)) }
                )
            }
        }

        composable(
            route = Screen.WellnessSessionBooking.route,
            arguments = listOf(navArgument("coachId") { type = NavType.StringType })
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val coachId = backStackEntry.arguments?.getString("coachId") ?: return@AuthGuard
                com.example.swastik.ui.screens.patient.wellness.WellnessSessionBookingScreen(
                    coachId = coachId,
                    onBackClick = { navController.popBackStack() },
                    onSessionBooked = { navController.navigateSafe(Screen.WellnessSessions.route) {
                        popUpTo(Screen.WellnessHub.route) { inclusive = false }
                    }}
                )
            }
        }

        composable(Screen.WellnessSessions.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.WellnessSessionsScreen(
                    onBackClick = { navController.popBackStack() },
                    onJoinVideoCall = { sessionId, coachName ->
                        navController.navigateSafe(Screen.WellnessVideoCall.createRoute(sessionId, coachName))
                    },
                    onChatWithCoach = { sessionId, coachName ->
                        navController.navigateSafe(Screen.WellnessChat.createRoute(sessionId, coachName))
                    },
                    onBookNewSession = {
                        navController.navigateSafe(Screen.WellnessExperts.route)
                    },
                    onCoachDetailClick = { coachId ->
                        navController.navigateSafe(Screen.WellnessCoachDetail.createRoute(coachId))
                    }
                )
            }
        }

        composable(
            route = Screen.WellnessVideoCall.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.StringType },
                navArgument("coachName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val sessionId = backStackEntry.arguments?.getString("sessionId") ?: return@AuthGuard
                val coachName = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("coachName") ?: "Coach", "UTF-8"
                )
                // Reuse existing VideoConsultationFlow with wellness session room
                com.example.swastik.ui.screens.consultation.VideoConsultationFlow(
                    appointmentId = sessionId,
                    doctorName = coachName,
                    onBackClick = { navController.popBackStack() },
                    onConsultationComplete = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.CoachDashboard.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.CoachDashboardScreen(
                    onSwitchToPatient = { navController.popBackStack() },
                    onStartSession = { sessionId, patientName -> 
                        navController.navigateSafe(Screen.WellnessVideoCall.createRoute(sessionId, patientName))
                    },
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        // ==================== Phase 2 — High Value Screens ====================

        composable(Screen.WorkoutCalendar.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.WorkoutCalendarScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.GymClassSchedule.route,
            arguments = listOf(
                navArgument("centerId") { type = NavType.StringType },
                navArgument("centerName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val centerId = backStackEntry.arguments?.getString("centerId") ?: return@AuthGuard
                val centerName = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("centerName") ?: "Gym", "UTF-8"
                )
                com.example.swastik.ui.screens.patient.wellness.GymClassScheduleScreen(
                    centerId = centerId,
                    centerName = centerName,
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.WellnessTypedReports.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.WellnessTypedReportsScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.ChallengeLeaderboard.route,
            arguments = listOf(
                navArgument("challengeId") { type = NavType.StringType },
                navArgument("challengeTitle") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val challengeId = backStackEntry.arguments?.getString("challengeId") ?: return@AuthGuard
                val challengeTitle = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("challengeTitle") ?: "Challenge", "UTF-8"
                )
                com.example.swastik.ui.screens.patient.wellness.ChallengeLeaderboardScreen(
                    challengeId = challengeId,
                    challengeTitle = challengeTitle,
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        // ==================== Phase 3 — Differentiator Screens ====================

        composable(Screen.QrGymCheckIn.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.QrGymCheckInScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.WellnessChat.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.StringType },
                navArgument("coachName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val sessionId = backStackEntry.arguments?.getString("sessionId") ?: return@AuthGuard
                val coachName = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("coachName") ?: "Coach", "UTF-8"
                )
                com.example.swastik.ui.screens.patient.wellness.WellnessChatScreen(
                    sessionId = sessionId,
                    coachName = coachName,
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.WellnessReminders.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.WellnessRemindersScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.WellnessBadges.route) {
            AuthGuard(navController, tokenManager) {
                val wellnessViewModel: com.example.swastik.ui.viewmodel.WellnessViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.wellness.WellnessBadgesScreen(
                    onBackClick = { navController.popBackStack() },
                    viewModel = wellnessViewModel
                )
            }
        }

        composable(Screen.WellnessReels.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.wellness.WellnessReelsScreen(
                    onBackClick = { navController.popBackStack() },
                    onNavigateToCoach = { coachId -> navController.navigateSafe(Screen.WellnessCoachDetail.createRoute(coachId)) }
                )
            }
        }


        composable(Screen.DietTracker.route) {
            AuthGuard(navController, tokenManager) {
                com.example.swastik.ui.screens.patient.diet.DietTrackerScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.MedicineCart.route,
            arguments = listOf(
                navArgument("type") {
                    type = NavType.StringType
                    defaultValue = "PHARMACY"
                }
            )
        ) { backStackEntry ->
            val typeStr = backStackEntry.arguments?.getString("type") ?: "PHARMACY"
            val cartType = try {
                com.example.swastik.ui.viewmodel.CartType.valueOf(typeStr)
            } catch (e: Exception) {
                com.example.swastik.ui.viewmodel.CartType.PHARMACY
            }
            AuthGuard(navController, tokenManager) {
                MedicineCartScreen(
                    cartType = cartType,
                    onBackClick = { navController.popBackStack() },
                    onOrderComplete = { navController.popBackStack() },
                    onNavigateToOrderHistory = { tab -> navController.navigateSafe(Screen.OrderHistory.createRoute(tab)) }
                )
            }
        }

        composable(
            route = Screen.OrderHistory.route,
            arguments = listOf(
                navArgument("tab") { 
                    type = NavType.IntType 
                    defaultValue = 0 
                }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://orders" },
                navDeepLink { uriPattern = "https://vaididea.in/orders" }
            )
        ) { backStackEntry ->
            val tab = backStackEntry.arguments?.getInt("tab") ?: 0
            AuthGuard(navController, tokenManager) {
                OrderHistoryScreen(
                    onBackClick = { navController.popBackStack() },
                    onNavigateToCart = {
                        navController.navigateSafe(Screen.MedicineCart.createRoute("GLOBAL"))
                    },
                    initialTab = tab
                )
            }
        }

        composable(
            route = Screen.BookingHistory.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "vaididea://tests" },
                navDeepLink { uriPattern = "https://vaididea.in/tests" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                BookingHistoryScreen(
                    onBackClick = { navController.popBackStack() },
                    onNavigateToTracking = { token, lat, lng, agentName, agentPhone ->
                        val urlName = agentName?.let { java.net.URLEncoder.encode(it, "UTF-8") } ?: "Unknown"
                        val urlPhone = agentPhone ?: "Unknown"
                        navController.navigate("order_tracking/$token/$lat/$lng/$urlName/$urlPhone")
                    }
                )
            }
        }

        composable(
            route = "order_tracking/{trackingToken}/{destLat}/{destLng}/{agentName}/{agentPhone}",
            arguments = listOf(
                navArgument("trackingToken") { type = NavType.StringType },
                navArgument("destLat") { type = NavType.FloatType },
                navArgument("destLng") { type = NavType.FloatType },
                navArgument("agentName") { type = NavType.StringType },
                navArgument("agentPhone") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val token = backStackEntry.arguments?.getString("trackingToken") ?: ""
                val lat = backStackEntry.arguments?.getFloat("destLat")?.toDouble() ?: 0.0
                val lng = backStackEntry.arguments?.getFloat("destLng")?.toDouble() ?: 0.0
                val agentNameUrl = backStackEntry.arguments?.getString("agentName")
                val agentPhone = backStackEntry.arguments?.getString("agentPhone")?.takeIf { it != "Unknown" }
                val agentName = agentNameUrl?.takeIf { it != "Unknown" }?.let { java.net.URLDecoder.decode(it, "UTF-8") }

                com.example.swastik.ui.screens.patient.OrderTrackingScreen(
                    trackingToken = token,
                    destLat = lat,
                    destLng = lng,
                    agentName = agentName,
                    agentPhone = agentPhone,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
}
}
