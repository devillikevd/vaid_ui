package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.runtime.*
import androidx.compose.animation.core.animateFloat
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.ui.screens.patient.components.*
import com.example.swastik.ui.screens.patient.WellnessHubActions
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.painterResource
import com.example.swastik.R

import com.example.swastik.ui.screens.patient.HospitalFinderScreen
import com.example.swastik.data.model.FacilityType
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.onSizeChanged

enum class HomeServiceTab {
    HOME, HOSPITAL, CLINIC, PHARMACY, DIAGNOSTIC, FITNESS
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeTabContent(
    activeServiceTab: HomeServiceTab = HomeServiceTab.HOME,
    onServiceTabChange: (HomeServiceTab) -> Unit = {},
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    doctors: List<Doctor> = emptyList(),
    searchSuggestions: List<String> = emptyList(),
    fitnessLog: DailyFitnessLog? = null,
    guardianEnabled: Boolean = false,
    totalCommunityQuestions: Int? = 0,
    onGuardianToggle: (Boolean) -> Unit = {},
    paddingValues: PaddingValues,
    onNotificationClick: () -> Unit,
    onProfileClick: () -> Unit,
    onStartInPersonConsultation: () -> Unit,
    onStartVideoConsultation: () -> Unit,
    onNavigateToAppointments: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToHospitals: () -> Unit = {},
    onNavigateToClinics: () -> Unit = {},
    onNavigateToPharmacies: () -> Unit = {},
    onNavigateToFitnessCenters: () -> Unit = {},
    onNavigateToHospitalDetail: (String) -> Unit = {},
    onNavigateToClinicDetail: (String) -> Unit = {},
    onNavigateToPharmacyDetail: (String) -> Unit = {},
    onNavigateToDiagnosticDetail: (String) -> Unit = {},
    onNavigateToFitnessCenterDetail: (String) -> Unit = {},
    onNavigateToEmergency: () -> Unit = {},
    onNavigateToChatbot: () -> Unit,
    onNavigateToDiagnostic: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onNavigateToBookingHistory: () -> Unit = {},
    onNavigateToHealthCard: () -> Unit = {},
    onNavigateToVitals: () -> Unit = {},
    onNavigateToPrescriptions: () -> Unit = {},
    onNavigateToBooking: (String?) -> Unit = {},
    onNavigateToMedicineDetail: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onLocationClick: () -> Unit = {},
    onAddAddressClick: () -> Unit = {},
    onRefresh: () -> Unit = {},
    onFindDoctorSpecialityClick: (String) -> Unit = {},
    onNavigateToCommunityQA: () -> Unit = {},
    onDoctorClick: (String) -> Unit = {},
    onNavigateToAllRecommendedDoctors: () -> Unit = {},
    onNavigateToAISettings: () -> Unit = {},
    onNavigateToDietTracker: () -> Unit = {},
    onNavigateToWellnessHub: () -> Unit = {},
    onNavigateToHealthConnectDashboard: () -> Unit = {}
) {
    val homeBgColor = if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) {
        MaterialTheme.colorScheme.background
    } else {
        Color(0xFFF8FAFC) // Light Gray
    }

    val targetTopColor = when (activeServiceTab) {
        HomeServiceTab.HOME -> Color(0xFF00695C)
        HomeServiceTab.HOSPITAL -> Color(0xFF1976D2) // Blue
        HomeServiceTab.CLINIC -> Color(0xFF388E3C) // Green
        HomeServiceTab.PHARMACY -> Color(0xFFF57C00) // Orange
        HomeServiceTab.DIAGNOSTIC -> Color(0xFF7B1FA2) // Purple
        HomeServiceTab.FITNESS -> Color(0xFF0288D1) // Sky blue
    }

    val animatedTopColor by androidx.compose.animation.animateColorAsState(
        targetValue = targetTopColor.copy(alpha = 0.22f),
        animationSpec = androidx.compose.animation.core.tween(durationMillis = 500),
        label = "TopColor"
    )
    val animatedMidColor by androidx.compose.animation.animateColorAsState(
        targetValue = targetTopColor.copy(alpha = 0.08f),
        animationSpec = androidx.compose.animation.core.tween(durationMillis = 500),
        label = "MidColor"
    )

    val gradientBrush = androidx.compose.ui.graphics.Brush.verticalGradient(
        colors = listOf(animatedTopColor, animatedMidColor, Color.Transparent),
        startY = 0f,
        endY = 600f // Bound the gradient so it doesn't stretch infinitely
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(homeBgColor)
    ) {
        // Static gradient background behind everything so it draws under the status bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(gradientBrush)
        )

        var topBarHeightPx by remember { mutableFloatStateOf(0f) }
        var topBarOffsetHeightPx by remember { mutableFloatStateOf(0f) }

        val nestedScrollConnection = remember {
            object : androidx.compose.ui.input.nestedscroll.NestedScrollConnection {
                override fun onPreScroll(available: androidx.compose.ui.geometry.Offset, source: androidx.compose.ui.input.nestedscroll.NestedScrollSource): androidx.compose.ui.geometry.Offset {
                    val delta = available.y
                    val newOffset = topBarOffsetHeightPx + delta
                    val previousOffset = topBarOffsetHeightPx
                    topBarOffsetHeightPx = newOffset.coerceIn(-topBarHeightPx, 0f)
                    val consumed = topBarOffsetHeightPx - previousOffset
                    return androidx.compose.ui.geometry.Offset(0f, consumed)
                }
            }
        }

        // Main Content Area
        Box(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .clipToBounds()
                .nestedScroll(nestedScrollConnection)
        ) {
            val density = androidx.compose.ui.platform.LocalDensity.current
            val topBarOffsetDp = with(density) { topBarOffsetHeightPx.toDp() }
            val topBarHeightDp = with(density) { topBarHeightPx.toDp() }

            // Scrollable Content Area below tabs
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = topBarHeightDp + topBarOffsetDp)
            ) {
                androidx.compose.animation.Crossfade(targetState = activeServiceTab, label = "TabCrossfade") { tab ->
                    when (tab) {
                        HomeServiceTab.HOME -> {
                            Box(modifier = Modifier.fillMaxSize()) {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(bottom = paddingValues.calculateBottomPadding())
                                ) {
        
        // Search Bar sticky header
        stickyHeader {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(homeBgColor)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp, bottom = 12.dp)
                ) {
                    GlobalSearchBar(
                        doctors = doctors,
                        searchSuggestions = searchSuggestions,
                        onDoctorSelect = { doc -> onNavigateToBooking(doc.id) },
                        onSpecialitySelect = { spec -> onFindDoctorSpecialityClick(spec) },
                        onServiceSelect = { service ->
                            when (service.lowercase()) {
                                "hospitals" -> onNavigateToHospitals()
                                "clinics" -> onNavigateToClinics()
                                "pharmacy" -> onNavigateToPharmacies()
                                "diagnostics", "lab tests" -> onNavigateToDiagnostic()
                                "gyms", "gym & studios", "fitness centers", "yoga studios", "wellness" -> onNavigateToFitnessCenters()
                                "appointments" -> onNavigateToAppointments()
                                "reports" -> onNavigateToReports()
                                "prescriptions" -> onNavigateToPrescriptions()
                                "vitals" -> onNavigateToVitals()
                                "health card" -> onNavigateToHealthCard()
                                "emergency", "sos", "ambulance" -> onNavigateToEmergency()
                                "ai assistant", "chatbot" -> onNavigateToChatbot()
                            }
                        },
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(12.dp))
            
            
            // 2. Consultations, Health ID, and Actions Group
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Primary Actions (Consultation cards side-by-side)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    InPersonConsultationCard(
                        modifier = Modifier.weight(1f),
                        onClick = onStartInPersonConsultation
                    )
                    VideoConsultationCard(
                        modifier = Modifier.weight(1f),
                        onClick = onStartVideoConsultation
                    )
                }

                // Digital Health ID Card
                CompactHealthIdCard(
                    profile = profile,
                    fitnessLog = fitnessLog,
                    onClick = onNavigateToHealthCard,
                    onNutritionClick = onNavigateToDietTracker
                )
                
                WellnessHubActions(
                    onWellnessHubClick = onNavigateToWellnessHub
                )
            }

            Spacer(modifier = Modifier.height(8.dp)) // Reduced from 16.dp

            // Recommended Doctors
            RecommendedDoctorsSection(
                doctors = doctors,
                onBookClick = { onNavigateToBooking(it.id) },
                onViewProfile = { onDoctorClick(it.id) },
                onViewAllClick = onNavigateToAllRecommendedDoctors,
                onRetry = onRefresh
            )
            
            Spacer(modifier = Modifier.height(8.dp)) // Reduced from 16.dp
            
            // 4. Book Doctor by Speciality Group
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp), // Reduced vertical padding from 8.dp
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stringResource(R.string.book_doctor_by_speciality),
                    fontWeight = FontWeight.Bold, 
                    fontSize = 17.sp, 
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            FindDoctorsBySpecialitySection(
                onSpecialityClick = onFindDoctorSpecialityClick,
                showTitle = false
            )
            
            // Community Q&A Banner (Moved to the bottom)
            CommunityQABanner(totalQuestions = totalCommunityQuestions, onClick = onNavigateToCommunityQA)
            
            Spacer(modifier = Modifier.height(32.dp)) // Extra space at bottom
        }
                                }
                            }
                        }
                        HomeServiceTab.HOSPITAL -> {
                            HospitalFinderScreen(
                                isEmbedded = true,
                                initialFacilityType = FacilityType.HOSPITAL,
                                onBackClick = {},
                                onDoctorBookClick = { doc, fac -> onNavigateToBooking(doc.id) },
                                onHospitalClick = onNavigateToHospitalDetail, // Routes to detail screen
                                onNavigateToDiagnosticBooking = { _ -> onNavigateToDiagnostic() },
                                onNavigateToCart = onNavigateToOrderHistory,
                                onNavigateToNotifications = onNotificationClick
                            )
                        }
                        HomeServiceTab.CLINIC -> {
                            HospitalFinderScreen(
                                isEmbedded = true,
                                initialFacilityType = FacilityType.CLINIC,
                                onBackClick = {},
                                onDoctorBookClick = { doc, fac -> onNavigateToBooking(doc.id) },
                                onClinicClick = onNavigateToClinicDetail, // Routes to detail
                                onNavigateToDiagnosticBooking = { _ -> onNavigateToDiagnostic() },
                                onNavigateToCart = onNavigateToOrderHistory,
                                onNavigateToNotifications = onNotificationClick
                            )
                        }
                        HomeServiceTab.PHARMACY -> {
                            HospitalFinderScreen(
                                isEmbedded = true,
                                initialFacilityType = FacilityType.MEDICAL_STORE,
                                onBackClick = {},
                                onPharmacyDetailClick = onNavigateToPharmacyDetail, // Route to detail
                                onNavigateToDiagnosticBooking = { _ -> onNavigateToDiagnostic() },
                                onNavigateToCart = onNavigateToOrderHistory,
                                onNavigateToPharmacyCart = onNavigateToOrderHistory,
                                onNavigateToNotifications = onNotificationClick
                            )
                        }
                        HomeServiceTab.DIAGNOSTIC -> {
                            com.example.swastik.ui.screens.patient.diagnostic.DiagnosticBookingScreen(
                                isEmbedded = true,
                                onBackClick = {},
                                onNavigateToBookingHistory = onNavigateToBookingHistory,
                                onCenterClick = onNavigateToDiagnosticDetail
                            )
                        }
                        HomeServiceTab.FITNESS -> {
                            HospitalFinderScreen(
                                isEmbedded = true,
                                initialFacilityType = FacilityType.FITNESS_CENTER,
                                onBackClick = {},
                                onFitnessCenterDetailClick = onNavigateToFitnessCenterDetail, // Route to detail
                                onNavigateToDiagnosticBooking = { _ -> onNavigateToDiagnostic() },
                                onNavigateToCart = onNavigateToOrderHistory,
                                onNavigateToNotifications = onNotificationClick
                            )
                        }
                    }
                }
            }

            // Fixed Header and Tabs (now collapsing, drawn on top)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .onSizeChanged { topBarHeightPx = it.height.toFloat() }
                    .offset(y = topBarOffsetDp)
                    .background(Color.Transparent)
            ) {
                DashboardHeader(
                    profile = profile,
                    unreadNotificationsCount = unreadNotificationsCount,
                    onNotificationClick = onNotificationClick,
                    onProfileClick = onProfileClick,
                    onLocationClick = onLocationClick,
                    onAddAddressClick = onAddAddressClick,
                    isHomeTab = true,
                    onEmergencyClick = onNavigateToEmergency,
                    onChatbotClick = onNavigateToChatbot
                )
                
                // Top Healthcare Services Row acts as Tabs
                TopHealthcareServicesRow(
                    activeServiceTab = activeServiceTab,
                    onHospitalsClick = { onServiceTabChange(HomeServiceTab.HOSPITAL) },
                    onClinicsClick = { onServiceTabChange(HomeServiceTab.CLINIC) },
                    onPharmacyClick = { onServiceTabChange(HomeServiceTab.PHARMACY) },
                    onDiagnosticsClick = { onServiceTabChange(HomeServiceTab.DIAGNOSTIC) },
                    onFitnessClick = { onServiceTabChange(HomeServiceTab.FITNESS) }
                )
            }
        } // Closes inner Box (Main Content Area)
    
    // Pulse Animation for AI Button
    val infiniteTransition = androidx.compose.animation.core.rememberInfiniteTransition(label = "Pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1f,
        animationSpec = androidx.compose.animation.core.infiniteRepeatable(
            animation = androidx.compose.animation.core.keyframes {
                durationMillis = 8000 // 8 seconds
                1f at 0
                1f at 7000
                1.3f at 7500
                1f at 8000
            },
            repeatMode = androidx.compose.animation.core.RepeatMode.Restart
        ),
        label = "PulseScale"
    )
    
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 0f,
        animationSpec = androidx.compose.animation.core.infiniteRepeatable(
            animation = androidx.compose.animation.core.keyframes {
                durationMillis = 8000
                0f at 0
                0f at 7000
                0.5f at 7001
                0f at 8000
            },
            repeatMode = androidx.compose.animation.core.RepeatMode.Restart
        ),
        label = "PulseAlpha"
    )

    val hasAINotification = unreadNotificationsCount > 0
        
    // Floating AI Chatbot Button (Bottom-Right)
    Box(
        modifier = Modifier
            .align(Alignment.BottomEnd)
            .padding(
                end = 16.dp,
                bottom = paddingValues.calculateBottomPadding() + 4.dp
            )
            .size(72.dp),
        contentAlignment = Alignment.Center
    ) {
            // Hallo Effect & Pulse
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(2.dp, Color(0xFF3949AB).copy(alpha = 0.3f), androidx.compose.foundation.shape.CircleShape)
            )
            
            // Pulsing Ring
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .scale(pulseScale)
                    .background(Color(0xFF3949AB).copy(alpha = pulseAlpha), androidx.compose.foundation.shape.CircleShape)
            )
            
            Box(contentAlignment = Alignment.TopEnd) {
                androidx.compose.material3.FloatingActionButton(
                    onClick = onNavigateToChatbot,
                    modifier = Modifier.size(56.dp),
                    containerColor = Color(0xFF3949AB),
                    contentColor = Color.White,
                    shape = androidx.compose.foundation.shape.CircleShape,
                    elevation = androidx.compose.material3.FloatingActionButtonDefaults.elevation(6.dp)
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = androidx.compose.material.icons.Icons.Filled.SmartToy,
                        contentDescription = "AI Assistant",
                        modifier = Modifier.size(30.dp)
                    )
                }
                
                // Notification Dot
                if (hasAINotification) {
                    Box(
                        modifier = Modifier
                            .padding(top = 2.dp, end = 2.dp)
                            .size(12.dp)
                            .background(Color(0xFF4CAF50), androidx.compose.foundation.shape.CircleShape)
                            .border(2.dp, Color.White, androidx.compose.foundation.shape.CircleShape) // White stroke
                    )
                }
            }
        }
    }
}
