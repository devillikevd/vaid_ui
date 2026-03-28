package com.example.swastik.ambulance.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.swastik.ambulance.data.remote.dto.UserDto
import com.example.swastik.ambulance.ui.screens.dashboard.DashboardScreen
import com.example.swastik.ambulance.ui.screens.emergency.EmergencyDetailScreen
import com.example.swastik.ambulance.ui.screens.emergency.EmergencyListScreen
import com.example.swastik.ambulance.ui.screens.login.ApprovalStatusScreen
import com.example.swastik.ambulance.ui.screens.login.LoginScreen
import com.example.swastik.ambulance.ui.screens.login.RegisterScreen
import com.example.swastik.ambulance.ui.screens.profile.ProfileScreen
import com.example.swastik.ambulance.ui.viewmodel.AuthViewModel
import com.example.swastik.ambulance.ui.viewmodel.DashboardViewModel
import com.example.swastik.ambulance.ui.viewmodel.ProfileViewModel

sealed class Screen(val route: String) {
    object SessionGate : Screen("session-gate")
    object Login : Screen("login")
    object Register : Screen("register")
    object Approval : Screen("approval")
    object Dashboard : Screen("dashboard")
    object Emergencies : Screen("emergencies")
    object Profile : Screen("profile")
    object EmergencyDetail : Screen("emergency/{requestId}") {
        fun createRoute(requestId: String) = "emergency/$requestId"
    }
}

private fun UserDto?.requiresApprovalGate(): Boolean {
    return this?.role == "ambulance_operator" && !(this.approvalStatus ?: "").equals("approved", ignoreCase = true)
}

@Composable
fun AmbulanceNavGraph() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.uiState.collectAsState()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val publicRoutes = remember {
        setOf(Screen.SessionGate.route, Screen.Login.route, Screen.Register.route)
    }

    LaunchedEffect(
        authState.isSessionResolved,
        authState.isLoggedIn,
        authState.user?.role,
        authState.user?.approvalStatus,
        currentRoute
    ) {
        if (!authState.isSessionResolved) return@LaunchedEffect

        when {
            !authState.isLoggedIn -> {
                val shouldShowLogin = currentRoute == null ||
                    currentRoute == Screen.SessionGate.route ||
                    currentRoute !in publicRoutes

                if (shouldShowLogin) {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }

            authState.user.requiresApprovalGate() -> {
                if (currentRoute !in setOf(Screen.Approval.route, Screen.Profile.route)) {
                    navController.navigate(Screen.Approval.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }

            currentRoute in publicRoutes || currentRoute == Screen.Approval.route -> {
                navController.navigate(Screen.Dashboard.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.SessionGate.route
    ) {
        composable(Screen.SessionGate.route) {
            SessionGateScreen(isLoading = !authState.isSessionResolved || authState.isLoading)
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onLoginSuccess = {}
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Approval.route) {
            ApprovalStatusScreen(
                user = authState.user,
                isRefreshing = authState.isLoading,
                errorMessage = authState.error,
                onOpenProfile = { navController.navigate(Screen.Profile.route) },
                onRefresh = { authViewModel.refreshApprovalStatus() },
                onLogout = { authViewModel.logout() }
            )
        }

        composable(Screen.Dashboard.route) {
            val parentEntry = navController.currentBackStackEntry ?: return@composable
            val dashboardViewModel: DashboardViewModel = hiltViewModel(parentEntry)

            LaunchedEffect(Unit) {
                dashboardViewModel.sessionExpired.collect {
                    authViewModel.logout()
                }
            }

            DashboardScreen(
                dashboardViewModel = dashboardViewModel,
                onNavigateToEmergencies = {
                    navController.navigate(Screen.Emergencies.route)
                },
                onNavigateToEmergencyDetail = { requestId ->
                    navController.navigate(Screen.EmergencyDetail.createRoute(requestId))
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onLogout = { authViewModel.logout() }
            )
        }

        composable(Screen.Emergencies.route) { emergencyEntry ->
            val dashboardEntry = remember(emergencyEntry) {
                navController.getBackStackEntry(Screen.Dashboard.route)
            }
            val dashboardViewModel: DashboardViewModel = hiltViewModel(dashboardEntry)

            LaunchedEffect(Unit) {
                dashboardViewModel.sessionExpired.collect {
                    authViewModel.logout()
                }
            }

            EmergencyListScreen(
                viewModel = dashboardViewModel,
                onBack = { navController.popBackStack() },
                onEmergencyDetail = { requestId ->
                    navController.navigate(Screen.EmergencyDetail.createRoute(requestId))
                }
            )
        }

        composable(Screen.Profile.route) {
            val profileViewModel: ProfileViewModel = hiltViewModel()
            val profileState by profileViewModel.state.collectAsState()

            ProfileScreen(
                profileState = profileState,
                onBack = { navController.popBackStack() },
                onSelectVehicle = { profileViewModel.selectVehicle(it) },
                onChangePassword = { current, newPwd ->
                    profileViewModel.changePassword(current, newPwd)
                },
                onSaveProfile = { request ->
                    profileViewModel.updateProfile(request)
                },
                onUploadLicenseDocument = { part ->
                    profileViewModel.uploadLicenseDocument(part)
                },
                onRefresh = {
                    profileViewModel.loadProfile()
                    profileViewModel.loadVehicles()
                },
                onDismissFeedback = { profileViewModel.clearTransientMessages() }
            )
        }

        composable(
            route = Screen.EmergencyDetail.route,
            arguments = listOf(navArgument("requestId") { type = NavType.StringType })
        ) { backStackEntry ->
            val requestId = backStackEntry.arguments?.getString("requestId") ?: return@composable
            val dashboardEntry = remember(backStackEntry) {
                navController.getBackStackEntry(Screen.Dashboard.route)
            }
            val viewModel: DashboardViewModel = hiltViewModel(dashboardEntry)
            val detailState by viewModel.emergencyDetailState.collectAsState()
            val dashboardState by viewModel.dashboardState.collectAsState()

            LaunchedEffect(Unit) {
                viewModel.sessionExpired.collect {
                    authViewModel.logout()
                }
            }

            LaunchedEffect(requestId) {
                viewModel.loadEmergencyDetail(requestId)
            }

            EmergencyDetailScreen(
                emergency = detailState.emergency,
                isLoading = detailState.isLoading,
                isActionInProgress = dashboardState.actionRequestId == requestId,
                onBack = { navController.popBackStack() },
                onUpdateStatus = { status ->
                    viewModel.updateEmergencyStatus(requestId, status)
                }
            )
        }
    }
}

@Composable
private fun SessionGateScreen(isLoading: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF3E1010),
                        Color(0xFF7F1D1D),
                        Color(0xFFB91C1C)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color.White)
            }
            Text(
                text = "SWASTIK Ambulance",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Checking operator access and dispatch status",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.84f)
            )
        }
    }
}
