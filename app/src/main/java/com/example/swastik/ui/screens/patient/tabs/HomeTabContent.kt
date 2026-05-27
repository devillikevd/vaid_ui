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
    fitnessLog: com.example.swastik.data.model.DailyFitnessLog? = null,
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
            onAddAddressClick = onAddAddressClick,
            isHomeTab = true
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Search Bar overlay
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

        Spacer(modifier = Modifier.height(12.dp))

        // Emergency SOS
        EmergencySOSBanner(onClick = onNavigateToEmergency)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Swastik AI Assistant Banner
        SwastikAIBanner(onClick = onNavigateToChatbot)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Primary Actions (Redesigned side-by-side)
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
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
        
        Spacer(modifier = Modifier.height(12.dp))
        
        CompactHealthIdCard(onClick = onNavigateToHealthCard)
        
        Spacer(modifier = Modifier.height(10.dp))
        
        // Secondary Actions (Reports, Appointments)
        SecondaryActionsGrid(
            onReportsClick = onNavigateToReports,
            onAppointmentsClick = onNavigateToAppointments
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Redesigned Health Services Row (Moved to Community Q&A spot)
        HealthServicesSection(
            onClinicClick = onNavigateToClinics,
            onPharmacyClick = onNavigateToPharmacies,
            onLabTestsClick = onNavigateToDiagnostic,
            onHospitalsClick = onNavigateToHospitals
        )
        
        Spacer(modifier = Modifier.height(20.dp))

        // Recommended Doctors (Moved up as requested)
        RecommendedDoctorsSection(
            doctors = doctors,
            onBookClick = { onNavigateToBooking(it.id) },
            onViewProfile = { selectedDoctorForProfile = it },
            onViewAllClick = { onNavigateToBooking(null) },
            onRetry = onRefresh
        )
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Book Doctor by Speciality
        FindDoctorsBySpecialitySection(
            onSpecialityClick = onFindDoctorSpecialityClick
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Community Q&A Banner (Moved to the bottom)
        CommunityQABanner(onClick = onNavigateToCommunityQA)
        
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
