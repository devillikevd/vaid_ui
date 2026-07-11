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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.ui.screens.patient.components.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.painterResource
import com.example.swastik.R

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeTabContent(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    doctors: List<Doctor> = emptyList(),
    searchSuggestions: List<String> = emptyList(),
    fitnessLog: DailyFitnessLog? = null,
    guardianEnabled: Boolean = false,
    onGuardianToggle: (Boolean) -> Unit = {},
    paddingValues: PaddingValues,
    onNotificationClick: () -> Unit,
    onProfileClick: () -> Unit,
    onStartInPersonConsultation: () -> Unit,
    onStartVideoConsultation: () -> Unit,
    onNavigateToAppointments: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToHospitals: () -> Unit,
    onNavigateToClinics: () -> Unit,
    onNavigateToPharmacies: () -> Unit,
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
    onLocationUpdate: (String) -> Unit = {},
    onAddAddressClick: () -> Unit = {},
    onRefresh: () -> Unit = {},
    onFindDoctorSpecialityClick: (String) -> Unit = {},
    onNavigateToCommunityQA: () -> Unit = {},
    onDoctorClick: (String) -> Unit = {},
    onNavigateToAllRecommendedDoctors: () -> Unit = {},
    onNavigateToAISettings: () -> Unit = {},
    onNavigateToDietTracker: () -> Unit = {}
) {
    val homeBgColor = if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) {
        MaterialTheme.colorScheme.background
    } else {
        Color(0xFFF8FAFC) // Light Gray
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(homeBgColor)
            .padding(paddingValues)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
        // Redesigned Header for Home Tab
        item {
            DashboardHeader(
                profile = profile,
                unreadNotificationsCount = unreadNotificationsCount,
                onNotificationClick = onNotificationClick,
                onProfileClick = onProfileClick,
                onLocationUpdate = onLocationUpdate,
                onAddAddressClick = onAddAddressClick,
                isHomeTab = true,
                onEmergencyClick = onNavigateToEmergency,
                onChatbotClick = onNavigateToChatbot
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
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
                        .padding(bottom = 12.dp)
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
                CompactHealthIdCard(onClick = onNavigateToHealthCard)

                // Diet & Nutrition Tracker Card
                DietTrackerCard(onClick = onNavigateToDietTracker)



                // My Activity Section Title
                Text(
                    text = stringResource(R.string.my_activity),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 12.dp, top = 0.dp)
                )

                // Secondary Actions (Reports, Appointments)
                SecondaryActionsGrid(
                    onReportsClick = onNavigateToReports,
                    onAppointmentsClick = onNavigateToAppointments
                )
                
                // Tertiary Actions (Orders, Bookings)
                TertiaryActionsGrid(
                    onOrdersClick = onNavigateToOrderHistory,
                    onBookingsClick = onNavigateToBookingHistory
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Quick Actions Group
            HealthcareServicesSection(
                onClinicsClick = onNavigateToClinics,
                onPharmacyClick = onNavigateToPharmacies,
                onDiagnosticsClick = onNavigateToDiagnostic,
                onHospitalsClick = onNavigateToHospitals
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Recommended Doctors
            RecommendedDoctorsSection(
                doctors = doctors,
                onBookClick = { onNavigateToBooking(it.id) },
                onViewProfile = { onDoctorClick(it.id) },
                onViewAllClick = onNavigateToAllRecommendedDoctors,
                onRetry = onRefresh
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // 4. Book Doctor by Speciality Group
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
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
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Community Q&A Banner (Moved to the bottom)
            CommunityQABanner(onClick = onNavigateToCommunityQA)
            
            Spacer(modifier = Modifier.height(32.dp)) // Extra space at bottom
        }
    }
    
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

    // Demo notification state (can be passed as parameter later)
    val hasAINotification = true
        
    // Floating AI Chatbot Button (Bottom-Right)
    Box(
        modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .size(72.dp),
            contentAlignment = Alignment.Center
        ) {
            // Hallo Effect & Pulse
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(2.dp, Color(0xFF00796B).copy(alpha = 0.2f), androidx.compose.foundation.shape.CircleShape)
            )
            
            // Pulsing Ring
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .scale(pulseScale)
                    .background(Color(0xFF00796B).copy(alpha = pulseAlpha), androidx.compose.foundation.shape.CircleShape)
            )
            
            Box(contentAlignment = Alignment.TopEnd) {
                androidx.compose.material3.FloatingActionButton(
                    onClick = onNavigateToChatbot,
                    modifier = Modifier.size(56.dp),
                    containerColor = Color(0xFF00796B),
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
