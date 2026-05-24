package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.material3.MaterialTheme
import com.example.swastik.ui.screens.patient.components.*
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.data.model.Doctor

@Composable
fun HomeTabContent(
    profile: PatientProfile?,
    unreadNotificationsCount: Int,
    doctors: List<Doctor> = emptyList(),
    searchSuggestions: List<String> = emptyList(),
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
    onFindDoctorSpecialityClick: (String) -> Unit = {},
    onNavigateToCommunityQA: () -> Unit = {}
) {
    var selectedDoctorForProfile by remember { mutableStateOf<Doctor?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
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
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Search Bar overlay
        GlobalSearchBar(
            doctors = doctors,
            searchSuggestions = searchSuggestions,
            onDoctorSelect = { doc -> onNavigateToBooking(doc.id) },
            onSpecialitySelect = { spec -> onFindDoctorSpecialityClick(spec) }
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Emergency SOS
        EmergencySOSBanner(onClick = onNavigateToEmergency)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Swastik AI Assistant Banner
        SwastikAIBanner(onClick = onNavigateToChatbot)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Primary Actions (Clinic, Video, Health Card)
        PrimaryActionsGrid(
            onClinicClick = onStartInPersonConsultation,
            onVideoClick = onStartVideoConsultation,
            onHealthCardClick = onNavigateToHealthCard
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Secondary Actions (Reports, Appointments, Community Q&A)
        SecondaryActionsGrid(
            onReportsClick = onNavigateToReports,
            onAppointmentsClick = onNavigateToAppointments,
            onCommunityQAClick = onNavigateToCommunityQA
        )
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Book Doctor by Speciality
        FindDoctorsBySpecialitySection(onSpecialityClick = onFindDoctorSpecialityClick)
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Healthcare Services
        HealthcareServicesSection(
            onHospitalsClick = onNavigateToHospitals,
            onClinicsClick = onNavigateToClinics,
            onPharmacyClick = onNavigateToPharmacies,
            onDiagnosticsClick = onNavigateToDiagnostic
        )
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Recommended Doctors
        if (doctors.isNotEmpty()) {
            RecommendedDoctorsSection(
                doctors = doctors,
                onBookClick = { onNavigateToBooking(it.id) },
                onViewProfile = { selectedDoctorForProfile = it }
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }

    selectedDoctorForProfile?.let { doctor ->
        com.example.swastik.ui.components.DoctorProfileBottomSheet(
            doctor = doctor,
            onDismiss = { selectedDoctorForProfile = null },
            onBookClick = {
                selectedDoctorForProfile = null
                onNavigateToBooking(doctor.id)
            }
        )
    }
}
