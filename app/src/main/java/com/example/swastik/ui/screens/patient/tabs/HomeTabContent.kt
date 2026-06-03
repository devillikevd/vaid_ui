package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.model.*
import com.example.swastik.ui.screens.patient.components.*

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
    onDoctorClick: (String) -> Unit = {}
) {
    val homeBgColor = if (isSystemInDarkTheme()) {
        MaterialTheme.colorScheme.background
    } else {
        Color(0xFFF4FBF9)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(homeBgColor)
            .padding(paddingValues)
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
                isHomeTab = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Search Bar sticky header
        stickyHeader {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(homeBgColor)
                    .padding(vertical = 8.dp)
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
                    }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(12.dp))

            // 1. Emergency SOS & AI Assistant Group
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                EmergencySOSBanner(onClick = onNavigateToEmergency)
                SwastikAIBanner(onClick = onNavigateToChatbot)
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
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

                // Secondary Actions (Reports, Appointments)
                SecondaryActionsGrid(
                    onReportsClick = onNavigateToReports,
                    onAppointmentsClick = onNavigateToAppointments
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
                onViewAllClick = { onNavigateToBooking(null) },
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
                    "Book Doctor by Speciality",
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
}
