package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
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
    reminders: List<Reminder> = emptyList(),
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
    onNavigateToVitals: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onNavigateToBookingHistory: () -> Unit = {},
    onNavigateToHealthCard: () -> Unit = {},
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
            .background(MaterialTheme.colorScheme.background)
            .padding(paddingValues)
            .verticalScroll(rememberScrollState())
    ) {
        // 1. Greeting + profile + location
        DashboardHeader(
            profile = profile,
            unreadNotificationsCount = unreadNotificationsCount,
            onNotificationClick = onNotificationClick,
            onProfileClick = onProfileClick,
            onLocationUpdate = onLocationUpdate
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        // 2. Search doctors / symptoms
        SearchBar(onSearchClick = onSearchClick)
        
        Spacer(modifier = Modifier.height(20.dp))

        // 3. Emergency / SOS access
        EmergencySOSDock(onEmergencyClick = onNavigateToEmergency)
        
        Spacer(modifier = Modifier.height(24.dp))

        // 4. Digital Health Card
        DigitalHealthCardSection(
            onCardClick = onNavigateToHealthCard
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 5. Main consultation cards
        MainCardsSection(
            onStartInPersonConsultation = onStartInPersonConsultation,
            onStartVideoConsultation = onStartVideoConsultation,
            onNavigateToAppointments = onNavigateToAppointments,
            onNavigateToReports = onNavigateToReports,
            onFindDoctors = onSearchClick
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 5. Doctor by speciality
        FindDoctorsBySpecialitySection(
            onSpecialityClick = onFindDoctorSpecialityClick
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 6. Upcoming appointments/reminders
        SmartReminderSection(
            reminders = reminders,
            onViewAllClick = onNavigateToVitals
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 7. AI Assistant
        EnhancedChatBotSection(
            onChatbotClick = onNavigateToChatbot
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 8. Healthcare services
        CareDirectorySection(
            onHospitalClick = onNavigateToHospitals,
            onClinicClick = onNavigateToClinics,
            onPharmacyClick = onNavigateToPharmacies,
            onDiagnosticClick = onNavigateToDiagnostic
        )
        
        Spacer(modifier = Modifier.height(24.dp))

        // 9. Recommended doctors
        DoctorRecommendationSection(
            doctors = doctors,
            onDoctorClick = { doctor -> onNavigateToBooking(doctor.id) },
            onBookClick = { doctor -> onNavigateToBooking(doctor.id) },
            onSeeAllClick = onNavigateToAppointments
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // 10. Health insights / Trust signals
        TrustSignalsStrip()

        // Extra bottom spacing for bottom nav
        Spacer(modifier = Modifier.height(140.dp))
    }
}
