package com.example.swastik

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.*
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
import com.example.swastik.data.local.TokenManager
import com.example.swastik.navigation.Screen
import com.example.swastik.ui.screens.auth.*
import com.example.swastik.ui.screens.consultation.VideoConsultationFlow
import com.example.swastik.ui.screens.doctor.DoctorPortalScreen
import com.example.swastik.ui.screens.patient.AppointmentHistoryScreen
import com.example.swastik.ui.screens.patient.EmergencyScreen
import com.example.swastik.ui.screens.patient.HospitalFinderScreen
import com.example.swastik.ui.screens.patient.HospitalDetailScreen
import com.example.swastik.ui.screens.patient.PatientDashboardScreen
import com.example.swastik.ui.screens.patient.booking.AppointmentBookingScreen
import com.example.swastik.ui.screens.patient.dashboard.ChatbotScreen
import com.example.swastik.ui.screens.patient.dashboard.PrescriptionsScreen
import com.example.swastik.ui.screens.patient.dashboard.ReportsScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineDetailScreen
import com.example.swastik.ui.screens.patient.medicine.MedicineCartScreen
import com.example.swastik.ui.screens.patient.medicine.OrderHistoryScreen
import com.example.swastik.ui.screens.patient.diagnostic.BookingHistoryScreen
import com.example.swastik.ui.screens.patient.diagnostic.DiagnosticBookingScreen
import com.example.swastik.ui.screens.patient.vitals.VitalsRemindersScreen
import com.example.swastik.ui.theme.SwastikTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SwastikApp(tokenManager)
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
            navController.navigate(Screen.Home.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}

@Composable
fun SwastikApp(tokenManager: TokenManager) {
    val navController = rememberNavController()
    val appSettings by AppSettingsStore.settings.collectAsState()
    val darkTheme = when (appSettings.themePreference) {
        ThemePreference.DARK -> true
        ThemePreference.LIGHT -> false
        ThemePreference.SYSTEM -> isSystemInDarkTheme()
    }

    // Apply Android internal localization when preference changes
    LaunchedEffect(appSettings.language) {
        val languageTag = when (appSettings.language) {
            "Hindi" -> "hi"
            "Bengali" -> "bn"
            "Telugu" -> "te"
            "Tamil" -> "ta"
            "Kannada" -> "kn"
            "Marathi" -> "mr"
            else -> "en"
        }
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(languageTag))
    }

    SwastikTheme(darkTheme = darkTheme) {
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route
        ) {

        // ── Auth ──────────────────────────────────────────
        composable(Screen.Home.route) {
            HomeScreen(
                onPatientRegisterClick = { navController.navigate(Screen.PatientRegister.route) },
                onPatientLoginClick = { navController.navigate(Screen.PatientLogin.route) }
            )
        }

        composable(Screen.PatientRegister.route) {
            PatientRegisterScreen(
                onLoginClick = {
                    navController.navigate(Screen.PatientLogin.route) {
                        popUpTo(Screen.PatientRegister.route) { inclusive = true }
                    }
                },
                onBackClick = { navController.popBackStack() },
                onRegisterSuccess = { email ->
                    navController.navigate(Screen.EmailVerificationPending.createRoute(email)) {
                        popUpTo(Screen.PatientRegister.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.PatientLogin.route) {
            PatientLoginScreen(
                onRegisterClick = {
                    navController.navigate(Screen.PatientRegister.route) {
                        popUpTo(Screen.PatientLogin.route) { inclusive = true }
                    }
                },
                onBackClick = { navController.popBackStack() },
                onLoginSuccess = {
                    navController.navigate(Screen.PatientDashboard.createRoute()) {
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
                onBackClick = { navController.popBackStack() },
                onGoToLogin = {
                    navController.navigate(Screen.PatientLogin.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
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
                navDeepLink { uriPattern = "swastik://dashboard" },
                navDeepLink { uriPattern = "https://swastik.health/dashboard" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
            val initialTab = backStackEntry.arguments?.getInt("tab") ?: 0
            PatientDashboardScreen(
                initialTab = initialTab,
                onLogout = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToAppointments = { navController.navigate(Screen.AppointmentHistory.route) },
                onNavigateToHospitals = { navController.navigate(Screen.HospitalFinder.createRoute(FacilityType.HOSPITAL)) },
                onNavigateToClinics = { navController.navigate(Screen.HospitalFinder.createRoute(FacilityType.CLINIC)) },
                onNavigateToPharmacies = { navController.navigate(Screen.HospitalFinder.createRoute(FacilityType.MEDICAL_STORE)) },
                onNavigateToPharmacy = { pharmacyId, pharmacyName ->
                    navController.navigate(
                        Screen.HospitalFinder.createRoute(
                            type = FacilityType.MEDICAL_STORE,
                            focusFacilityId = pharmacyId,
                            focusFacilityName = pharmacyName
                        )
                    )
                },
                onNavigateToReports = { navController.navigate(Screen.Reports.route) },
                onNavigateToPrescriptions = { navController.navigate(Screen.Prescriptions.route) },
                onNavigateToChatbot = { navController.navigate(Screen.Chatbot.route) },
                onNavigateToBooking = { doctorId ->
                    navController.navigate(Screen.AppointmentBooking.createRoute(doctorId = doctorId))
                },
                onNavigateToEmergency = { navController.navigate(Screen.Emergency.route) },
                onNavigateToDiagnostic = { navController.navigate(Screen.DiagnosticBooking.createRoute()) },
                onNavigateToVitals = { navController.navigate(Screen.VitalsReminders.route) },
                onNavigateToOrderHistory = { navController.navigate(Screen.OrderHistory.route) },
                onNavigateToBookingHistory = { navController.navigate(Screen.BookingHistory.route) },
                onNavigateToMedicineDetail = { medicineId ->
                    navController.navigate(Screen.MedicineDetail.createRoute(medicineId))
                },
                onNavigateToMedicineCart = { navController.navigate(Screen.MedicineCart.route) },
                onSearchClick = { navController.navigate(Screen.AppointmentBooking.route) },
                onNotificationActionRoute = { route -> navController.navigate(route) }
            )
            }
        }

        // ── Patient Feature Screens ───────────────────────
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
                }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val doctorId = backStackEntry.arguments?.getString("doctorId")?.takeIf { it.isNotBlank() }
                val hospitalId = backStackEntry.arguments?.getString("hospitalId")?.takeIf { it.isNotBlank() }
                val clinicId = backStackEntry.arguments?.getString("clinicId")?.takeIf { it.isNotBlank() }
                AppointmentBookingScreen(
                    onBackClick = { navController.popBackStack() },
                    onBookingComplete = { navController.popBackStack() },
                    preselectedDoctorId = doctorId,
                    preselectedHospitalId = hospitalId,
                    preselectedClinicId = clinicId
                )
            }
        }

        composable(
            route = Screen.AppointmentHistory.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://appointments" },
                navDeepLink { uriPattern = "https://swastik.health/appointments" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            AppointmentHistoryScreen(
                onBackClick = { navController.popBackStack() },
                onStartConsultation = { appointment ->
                    navController.navigate(
                        Screen.VideoConsultation.createRoute(
                            appointment.id,
                            appointment.doctor?.name ?: "Doctor"
                        )
                    )
                },
                onNavigateToPrescriptions = { navController.navigate(Screen.Prescriptions.route) },
                onNavigateToBooking = { navController.navigate(Screen.AppointmentBooking.createRoute()) }
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
                        navController.navigate(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                hospitalId = facility.id.takeIf { facility.type == FacilityType.HOSPITAL && it.isNotBlank() },
                                clinicId = facility.id.takeIf { facility.type == FacilityType.CLINIC && it.isNotBlank() }
                            )
                        )
                    },
                    onHospitalClick = { hospitalId ->
                        navController.navigate(Screen.HospitalDetail.createRoute(hospitalId))
                    },
                    onClinicClick = { clinicId ->
                        navController.navigate(Screen.ClinicDetail.createRoute(clinicId))
                    },
                    onMedicineClick = { medicineId ->
                        navController.navigate(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onNavigateToCart = {
                        navController.navigate(Screen.MedicineCart.route)
                    },
                    onNavigateToOrders = {
                        navController.navigate(Screen.OrderHistory.route)
                    },
                    onNavigateToDiagnosticBooking = { centerId ->
                        navController.navigate(Screen.DiagnosticBooking.createRoute(centerId))
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
                        navController.navigate(
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
                        navController.navigate(
                            Screen.AppointmentBooking.createRoute(
                                doctorId = doctor.id.ifBlank { null },
                                clinicId = facility.id.ifBlank { null }
                            )
                        )
                    }
                )
            }
        }

        composable(Screen.MedicineFinder.route) {
            AuthGuard(navController, tokenManager) {
                MedicineScreen(
                    onBackClick = { navController.popBackStack() },
                    onMedicineClick = { medicineId ->
                        navController.navigate(Screen.MedicineDetail.createRoute(medicineId))
                    },
                    onPharmacyClick = { pharmacyId, pharmacyName ->
                        navController.navigate(
                            Screen.HospitalFinder.createRoute(
                                type = FacilityType.MEDICAL_STORE,
                                focusFacilityId = pharmacyId,
                                focusFacilityName = pharmacyName
                            )
                        )
                    },
                    onNavigateToHome = { navController.popBackStack() },
                    onNavigateToRecords = { navController.navigate(Screen.Reports.route) },
                    onNavigateToProfile = { navController.navigate(Screen.PatientDashboard.createRoute(3)) },
                    onNavigateToCart = { navController.navigate(Screen.MedicineCart.route) }
                )
            }
        }

        composable(
            route = Screen.MedicineDetail.route,
            arguments = listOf(
                navArgument("medicineId") { type = NavType.StringType }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://medicine/{medicineId}" },
                navDeepLink { uriPattern = "https://swastik.health/medicine/{medicineId}" }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
            val medicineId = backStackEntry.arguments?.getString("medicineId") ?: ""
            MedicineDetailScreen(
                medicineId = medicineId,
                onBackClick = { navController.popBackStack() },
                onNavigateToCart = { navController.navigate(Screen.MedicineCart.route) }
            )
            }
        }

        composable(
            route = Screen.VideoConsultation.route,
            arguments = listOf(
                navArgument("appointmentId") { type = NavType.StringType },
                navArgument("doctorName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            AuthGuard(navController, tokenManager) {
                val appointmentId = backStackEntry.arguments?.getString("appointmentId") ?: ""
                val doctorName = java.net.URLDecoder.decode(
                    backStackEntry.arguments?.getString("doctorName") ?: "Doctor", "UTF-8"
                )
                VideoConsultationFlow(
                    appointmentId = appointmentId,
                    doctorName = doctorName,
                    onBackClick = { navController.popBackStack() },
                    onConsultationComplete = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.Reports.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://reports" },
                navDeepLink { uriPattern = "https://swastik.health/reports" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            ReportsScreen(
                onBackClick = { navController.popBackStack() }
            )
            }
        }

        composable(
            route = Screen.Prescriptions.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://prescriptions" },
                navDeepLink { uriPattern = "https://swastik.health/prescriptions" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            PrescriptionsScreen(
                onBackClick = { navController.popBackStack() },
                onNavigateToOrderHistory = { navController.navigate(Screen.OrderHistory.route) }
            )
            }
        }

        composable(
            route = Screen.Chatbot.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://chatbot" },
                navDeepLink { uriPattern = "https://swastik.health/chatbot" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
            ChatbotScreen(
                onBackClick = { navController.popBackStack() },
                onNavigateToEmergency = { navController.navigate(Screen.Emergency.route) }
            )
            }
        }

        composable(
            route = Screen.Emergency.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://emergency" },
                navDeepLink { uriPattern = "https://swastik.health/emergency" }
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
                    onNavigateToBookingHistory = { navController.navigate(Screen.BookingHistory.route) }
                )
            }
        }

        composable(
            route = Screen.VitalsReminders.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://vitals" },
                navDeepLink { uriPattern = "https://swastik.health/vitals" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                VitalsRemindersScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(Screen.MedicineCart.route) {
            AuthGuard(navController, tokenManager) {
                MedicineCartScreen(
                    onBackClick = { navController.popBackStack() },
                    onOrderComplete = { navController.popBackStack() },
                    onNavigateToOrderHistory = { navController.navigate(Screen.OrderHistory.route) }
                )
            }
        }

        composable(
            route = Screen.OrderHistory.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://orders" },
                navDeepLink { uriPattern = "https://swastik.health/orders" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                OrderHistoryScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        composable(
            route = Screen.BookingHistory.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "swastik://tests" },
                navDeepLink { uriPattern = "https://swastik.health/tests" }
            )
        ) {
            AuthGuard(navController, tokenManager) {
                BookingHistoryScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
        }

        // ── Doctor (Web portal route) ─────────────────────
        composable(Screen.DoctorLogin.route) {
            DoctorPortalScreen(
                onBackClick = { navController.popBackStack() }
            )
        }
        }
    }
}
