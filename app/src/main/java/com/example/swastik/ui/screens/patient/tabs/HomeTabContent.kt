package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import com.example.swastik.ui.screens.patient.components.*
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.Doctor

/**
 * Home Tab Content
 * Contains the main dashboard view
 */
@Composable
fun HomeTabContent(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    doctors: List<Doctor> = emptyList(),
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
    onFindDoctorSpecialityClick: (String) -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(paddingValues)
            .verticalScroll(rememberScrollState())
    ) {
        // Redesigned Header for Home Tab
        DashboardHeader(
            profile = profile,
            unreadNotificationsCount = unreadNotificationsCount,
            onNotificationClick = onNotificationClick,
            onProfileClick = onProfileClick,
            onLocationUpdate = onLocationUpdate,
            isHomeTab = true
        )
        
        Spacer(modifier = Modifier.height(4.dp))

        // Large Search Bar
        SearchBar(onSearchClick = onSearchClick)
        
        Spacer(modifier = Modifier.height(16.dp))

        // AI Assistant Section (Moved here and updated)
        EnhancedChatBotSection(
            onChatbotClick = onNavigateToChatbot
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // Row 1: Emergency & Health Card
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            EmergencyQuickCard(
                modifier = Modifier.weight(1f),
                onClick = onNavigateToEmergency
            )
            HealthCardQuickCard(
                modifier = Modifier.weight(1f),
                onClick = onNavigateToHealthCard
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Row 2: In-Person & Video Consult
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            InPersonFeatureCard(
                modifier = Modifier.weight(1f),
                onClick = onSearchClick // Changed from onNavigateToClinics to onSearchClick
            )
            VideoConsultFeatureCard(
                modifier = Modifier.weight(1f),
                onClick = onStartVideoConsultation
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Row 3: My Reports & My Appointments
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SummaryActionCard(
                title = "MY REPORTS",
                description = "Medical History",
                buttonText = "VIEW ALL",
                icon = Icons.Outlined.Folder,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToReports
            )
            SummaryActionCard(
                title = "MY APPOINTMENTS",
                description = "Past & Upcoming",
                buttonText = "MANAGE",
                icon = Icons.Outlined.CalendarMonth,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToAppointments
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Re-adding Book Doctor by Speciality
        FindDoctorsBySpecialitySection(
            onSpecialityClick = onFindDoctorSpecialityClick
        )

        Spacer(modifier = Modifier.height(32.dp))

        DoctorRecommendationSection(
            doctors = doctors,
            onDoctorClick = { doctor -> onNavigateToBooking(doctor.id) },
            onBookClick = { doctor -> onNavigateToBooking(doctor.id) },
            onSeeAllClick = onNavigateToAppointments
        )

        Spacer(modifier = Modifier.height(24.dp))

        CareDirectorySection(
            onHospitalClick = onNavigateToHospitals,
            onClinicClick = onNavigateToClinics,
            onPharmacyClick = onNavigateToPharmacies,
            onDiagnosticClick = onNavigateToDiagnostic
        )

        Spacer(modifier = Modifier.height(32.dp))
        
        TrustSignalsStrip()

        // Reduced bottom spacing to prevent over-scrolling
        Spacer(modifier = Modifier.height(32.dp))
    }
}
