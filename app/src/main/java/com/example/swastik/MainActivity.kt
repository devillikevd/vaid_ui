package com.example.swastik

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.padding
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
import com.example.swastik.ui.screens.consultation.VideoConsultationFlow
import com.example.swastik.ui.screens.patient.AppointmentHistoryScreen
import com.example.swastik.ui.screens.patient.EmergencyScreen
import com.example.swastik.ui.screens.patient.HospitalFinderScreen
import com.example.swastik.ui.screens.patient.HospitalDetailScreen
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

import com.example.swastik.ui.theme.SwastikTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.flow.collectLatest

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var tokenManager: TokenManager
    @Inject lateinit var networkObserver: NetworkObserver

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
            navController.navigateSafe(Screen.Home.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
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
        val startDestination = remember(tokenManager) {
            if (tokenManager.isAuthenticated()) {
                Screen.PatientDashboard.createRoute()
            } else {
                Screen.Home.route
            }
        }
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
                modifier = Modifier.padding(paddingValues),
                enterTransition = {
                    fadeIn(animationSpec = tween(200))
                },
                exitTransition = {
                    fadeOut(animationSpec = tween(200))
                },
                popEnterTransition = {
                    fadeIn(animationSpec = tween(150))
                },
                popExitTransition = {
                    fadeOut(animationSpec = tween(150))
                }
            ) {

        // ── Auth ──────────────────────────────────────────
        composable(Screen.Home.route) {
            HomeScreen(
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
                onRegisterSuccess = { email ->
                    navController.navigateSafe(Screen.EmailVerificationPending.createRoute(email)) {
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
                        popUpTo(Screen.Home.route) { inclusive = true }
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
                }
            )
        ) { backStackEntry ->
            val email = backStackEntry.arguments?.getString("email")?.let {
                java.net.URLDecoder.decode(it, "UTF-8")
            } ?: ""
            EmailVerificationPendingScreen(
                email = email,
                onBackClick = { 
                    navController.navigate(Screen.Home.route) {
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
                    navController.navigateSafe(Screen.Home.route) {
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
                onNavigateToBooking = { doctorId ->
                    if (doctorId != null) {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(doctorId = doctorId))
                    } else {
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute())
                    }
                },
                onNavigateToEmergency = { navController.navigateSafe(Screen.Emergency.route) },
                onNavigateToDiagnostic = {
                    navController.navigateSafe(Screen.HospitalFinder.createRoute(FacilityType.DIAGNOSTIC_CENTER))
                },
                onNavigateToVitals = { /* handled internally or unused */ },
                onNavigateToHealthCard = { navController.navigateSafe(Screen.HealthCard.route) },
                onNavigateToOrderHistory = { navController.navigateSafe(Screen.OrderHistory.createRoute(0)) },
                onNavigateToDietTracker = { navController.navigateSafe(Screen.DietTracker.route) },
                onNavigateToMedicineDetail = { medicineId ->
                    navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                },
                onNavigateToMedicineCart = { navController.navigateSafe(Screen.MedicineCart.route) },
                onNavigateToFavoriteMedicines = { navController.navigateSafe(Screen.FavoriteMedicines.route) },
                onSearchClick = { navController.navigateSafe(Screen.FindDoctorsCategories.createRoute("in_person")) },
                onNotificationActionRoute = { route -> navController.navigateSafe(route) },
                onFindDoctorSpecialityClick = { speciality ->
                    val (mappedSpecialization, mappedSearch) = com.example.swastik.utils.SpecializationMapper.mapToSearchParams(speciality)
                    navController.navigateSafe(Screen.AppointmentBooking.createRoute(
                        specialization = mappedSpecialization,
                        search = mappedSearch
                    ))
                },
                onNavigateToCommunityQA = { navController.navigateSafe(Screen.CommunityQA.route) },
                onDoctorClick = { doctorId -> 
                    navController.navigateSafe(Screen.DoctorProfile.createRoute(doctorId))
                },
                onNavigateToAllRecommendedDoctors = {
                    navController.navigateSafe(Screen.AppointmentBooking.createRoute(consultationMode = "recommended"))
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
                    onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.route) }
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
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(
                            specialization = specialization,
                            search = search,
                            consultationMode = mode
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
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(
                            specialization = specialization,
                            search = search
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
                        navController.navigateSafe(Screen.AppointmentBooking.createRoute(
                            specialization = specialization,
                            search = search,
                            consultationMode = mode
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
                    onMedicineClick = { medicineId ->
                        navController.navigateSafe(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onNavigateToCart = {
                        navController.navigateSafe(Screen.MedicineCart.route)
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
            Screen.HospitalDetail.route,
            arguments = listOf(
                androidx.navigation.navArgument("hospitalId") {
                    type = androidx.navigation.NavType.StringType
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val hospitalId = backStackEntry.arguments?.getString("hospitalId") ?: return@AuthGuard
                HospitalDetailScreen(
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
                HospitalDetailScreen(
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
                com.example.swastik.ui.screens.patient.medicine.PharmacyDetailScreen(
                    pharmacyId = pharmacyId,
                    onBackClick = { navController.popBackStack() },
                    onNavigateToHospital = { hId -> navController.navigateSafe(Screen.HospitalDetail.createRoute(hId)) },
                    onNavigateToClinic = { cId -> navController.navigateSafe(Screen.ClinicDetail.createRoute(cId)) },
                    onNavigateToOrderHistory = { navController.navigateSafe(Screen.OrderHistory.createRoute(0)) }
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
                com.example.swastik.ui.screens.patient.diagnostic.DiagnosticDetailScreen(
                    centerId = centerId,
                    onBackClick = { navController.popBackStack() },
                    onBookTestsClick = { facility ->
                        navController.navigateSafe(Screen.DiagnosticBooking.createRoute(facility.id))
                    },
                    onNavigateToHospital = { hId -> navController.navigateSafe(Screen.HospitalDetail.createRoute(hId)) },
                    onNavigateToClinic = { cId -> navController.navigateSafe(Screen.ClinicDetail.createRoute(cId)) }
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
                    onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.route) }
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
                onNavigateToCart = { navController.navigateSafe(Screen.MedicineCart.route) }
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
                    dashboardViewModel = dashboardViewModel,
                    recordsViewModel = recordsViewModel
                )
            }
        }

        composable(Screen.GuardianDashboard.route) {
            AuthGuard(navController, tokenManager) {
                val dashboardViewModel: com.example.swastik.ui.viewmodel.PatientDashboardViewModel = androidx.hilt.navigation.compose.hiltViewModel()
                com.example.swastik.ui.screens.patient.guardian.GuardianDashboardScreen(
                    onNavigateBack = { navController.popBackStack() },
                    viewModel = dashboardViewModel
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

        composable(Screen.MedicineCart.route) {
            AuthGuard(navController, tokenManager) {
                MedicineCartScreen(
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
                        navController.navigateSafe(Screen.MedicineCart.route)
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
