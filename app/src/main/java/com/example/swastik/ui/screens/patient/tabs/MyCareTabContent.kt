package com.example.swastik.ui.screens.patient.tabs

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.R
import com.example.swastik.data.model.PatientProfile
import com.example.swastik.data.model.PatientStats
import com.example.swastik.data.model.Reminder
import com.example.swastik.data.model.ReminderType
import com.example.swastik.data.model.Appointment
import com.example.swastik.data.model.ConsultationRecord
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.RecordsViewModel

@Composable
fun MyCareTabContent(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    stats: PatientStats? = null,
    reminders: List<Reminder> = emptyList(),
    unreadNotificationsCount: Int = 0,
    onNotificationClick: () -> Unit = {},
    onNavigateToPrescriptions: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToAppointments: () -> Unit = {},
    onNavigateToOrderHistory: () -> Unit = {},
    onNavigateToBookingHistory: () -> Unit = {},
    onNavigateToWellnessSessions: () -> Unit = {},
    favoriteDoctorsCount: Int = 0,
    favoriteHospitalsCount: Int = 0,
    favoriteClinicsCount: Int = 0,
    favoriteDiagnosticsCount: Int = 0,
    favoritePharmaciesCount: Int = 0,
    recentConsultations: List<ConsultationRecord> = emptyList(),
    upcomingAppointments: List<Appointment> = emptyList(),
    recentPrescriptions: List<com.example.swastik.data.model.Prescription> = emptyList(),
    onNavigateToFavoriteDoctors: () -> Unit = {},
    onNavigateToFavoriteMedicines: () -> Unit = {},
    onNavigateToFavoriteFacilities: (String) -> Unit = {},
    recordsViewModel: RecordsViewModel = hiltViewModel()
) {
    var currentView by remember { mutableStateOf("CARDS") }
    var initialRecordsFilter by remember { mutableStateOf(com.example.swastik.ui.screens.patient.tabs.RecordFilter.ALL) }

    if (currentView == "CARDS") {
        MyCareCardsView(
            modifier = modifier,
            profile = profile,
            stats = stats,
            reminders = reminders,
            onNavigateToReports = onNavigateToReports,
            onNavigateToAppointments = onNavigateToAppointments,
            onNavigateToOrderHistory = onNavigateToOrderHistory,
            onNavigateToBookingHistory = onNavigateToBookingHistory,
            onNavigateToWellnessSessions = onNavigateToWellnessSessions,
            onNavigateToMedicalRecords = { filter ->
                initialRecordsFilter = filter
                currentView = "RECORDS" 
            },
            favoriteDoctorsCount = favoriteDoctorsCount,
            favoriteHospitalsCount = favoriteHospitalsCount,
            favoriteClinicsCount = favoriteClinicsCount,
            favoriteDiagnosticsCount = favoriteDiagnosticsCount,
            favoritePharmaciesCount = favoritePharmaciesCount,
            onNavigateToFavoriteDoctors = onNavigateToFavoriteDoctors,
            onNavigateToFavoriteMedicines = onNavigateToFavoriteMedicines,
            onNavigateToFavoriteFacilities = onNavigateToFavoriteFacilities,
            recentConsultations = recentConsultations,
            upcomingAppointments = upcomingAppointments,
            recentPrescriptions = recentPrescriptions,
            onNavigateToPrescriptions = onNavigateToPrescriptions
        )
    } else {
        androidx.activity.compose.BackHandler {
            currentView = "CARDS"
        }
        Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            // Back Button Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { currentView = "CARDS" }) {
                    Icon(Icons.Outlined.ArrowBack, contentDescription = "Back")
                }
            }
            
            RecordsTabContent(
                modifier = Modifier.weight(1f),
                profile = profile,
                unreadNotificationsCount = unreadNotificationsCount,
                onNotificationClick = onNotificationClick,
                onNavigateToPrescriptions = onNavigateToPrescriptions,
                onNavigateToReports = onNavigateToReports,
                viewModel = recordsViewModel,
                initialFilter = initialRecordsFilter
            )
        }
    }
}

@Composable
fun MyCareCardsView(
    modifier: Modifier = Modifier,
    profile: PatientProfile? = null,
    stats: PatientStats? = null,
    reminders: List<Reminder> = emptyList(),
    onNavigateToReports: () -> Unit,
    onNavigateToAppointments: () -> Unit,
    onNavigateToOrderHistory: () -> Unit,
    onNavigateToBookingHistory: () -> Unit,
    onNavigateToWellnessSessions: () -> Unit = {},
    onNavigateToMedicalRecords: (com.example.swastik.ui.screens.patient.tabs.RecordFilter) -> Unit,
    favoriteDoctorsCount: Int = 0,
    favoriteHospitalsCount: Int = 0,
    favoriteClinicsCount: Int = 0,
    favoriteDiagnosticsCount: Int = 0,
    favoritePharmaciesCount: Int = 0,
    onNavigateToFavoriteDoctors: () -> Unit = {},
    onNavigateToFavoriteMedicines: () -> Unit = {},
    onNavigateToFavoriteFacilities: (String) -> Unit = {},
    recentConsultations: List<ConsultationRecord> = emptyList(),
    upcomingAppointments: List<Appointment> = emptyList(),
    recentPrescriptions: List<com.example.swastik.data.model.Prescription> = emptyList(),
    onNavigateToPrescriptions: () -> Unit = {}
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)) // Very light gray background matching image
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // 1. Header Section
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color.White, CircleShape)
                    .border(1.dp, Color(0xFFE2E8F0), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = com.example.swastik.R.drawable.vaididea_logo),
                    contentDescription = "App Logo",
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "My Care",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF1E293B)
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            // User specifically requested NO notification bell here.
        }

        // 2. Health Overview Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Health Score
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            progress = { 92f / 100f },
                            modifier = Modifier.size(60.dp),
                            color = SwastikPrimary,
                            trackColor = Color(0xFFE2E8F0),
                            strokeWidth = 6.dp
                        )
                        Icon(Icons.Filled.Favorite, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(24.dp))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Health Score \u24D8", fontSize = 10.sp, color = Color(0xFF64748B))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text("92", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                        Text("/100", fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.padding(bottom = 2.dp))
                    }
                    Text("Excellent", fontSize = 11.sp, color = SwastikPrimary, fontWeight = FontWeight.SemiBold)
                }
                
                // Divider removed
                
                // Next Appointment
                Column(modifier = Modifier.align(Alignment.Top)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Event, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Next Appointment", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    val nextAppt = upcomingAppointments.firstOrNull()
                    if (nextAppt != null) {
                        Text(nextAppt.date, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(nextAppt.timeSlot, fontSize = 12.sp, color = Color(0xFF1E293B))
                        Text("Dr. ${nextAppt.doctor?.name ?: "Unknown"}", fontSize = 11.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    } else {
                        Text("None Scheduled", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                    }
                }
                
                // Divider removed
                
                // Medicine Reminder
                Column(modifier = Modifier.align(Alignment.Top)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Medication, contentDescription = null, tint = Color(0xFFF97316), modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Medicine Reminder", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    val medReminders = reminders.filter { it.type == ReminderType.MEDICINE }
                    val nextMed = medReminders.firstOrNull { !it.isCompleted } ?: medReminders.firstOrNull()
                    if (nextMed != null) {
                        Text(nextMed.time, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        Text(nextMed.title, fontSize = 12.sp, color = Color(0xFF1E293B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        val medCount = medReminders.size
                        Text("$medCount Medicines", fontSize = 11.sp, color = Color(0xFF64748B))
                    } else {
                        Text("None Active", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                    }
                }
            }
        }

        // 3. Quick Access
        SectionHeader("Quick Access", null)
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            QuickAccessCard(
                modifier = Modifier.weight(1f),
                title = "Appointments",
                subtitle = "Upcoming & Past",
                icon = Icons.Outlined.Event,
                iconTint = SwastikPrimary,
                bgColor = Color(0xFFF0FDF4),
                onClick = onNavigateToAppointments
            )
            QuickAccessCard(
                modifier = Modifier.weight(1f),
                title = "Lab Tests",
                subtitle = "Bookings & Reports",
                icon = Icons.Outlined.Science,
                iconTint = Color(0xFF8B5CF6),
                bgColor = Color(0xFFF5F3FF),
                onClick = onNavigateToBookingHistory
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            QuickAccessCard(
                modifier = Modifier.weight(1f),
                title = "Medicine Orders",
                subtitle = "Orders & Deliveries",
                icon = Icons.Outlined.LocalPharmacy,
                iconTint = Color(0xFFF97316),
                bgColor = Color(0xFFFFF7ED),
                onClick = onNavigateToOrderHistory
            )
            QuickAccessCard(
                modifier = Modifier.weight(1f),
                title = "Wellness Sessions",
                subtitle = "Coach consultations",
                icon = Icons.Outlined.SelfImprovement,
                iconTint = Color(0xFF2E7D32),
                bgColor = Color(0xFFE8F5E9),
                onClick = onNavigateToWellnessSessions
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            QuickAccessCard(
                modifier = Modifier.weight(1f),
                title = "Reports",
                subtitle = "Your health reports",
                icon = Icons.Outlined.Description,
                iconTint = Color(0xFF3B82F6),
                bgColor = Color(0xFFEFF6FF),
                onClick = onNavigateToReports
            )
        }

        // 4. Medical Records Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = { onNavigateToMedicalRecords(com.example.swastik.ui.screens.patient.tabs.RecordFilter.ALL) }),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(Color(0xFFDCFCE7), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Folder, contentDescription = null, tint = SwastikPrimary, modifier = Modifier.size(32.dp))
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Medical Records", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                        Text("All your medical documents in one place", fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                    Icon(
                        Icons.Outlined.ChevronRight,
                        contentDescription = null,
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier
                            .size(28.dp)
                            .background(Color(0xFFF1F5F9), CircleShape)
                            .padding(4.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("Prescriptions", "Discharge Summary", "Vaccination", "Documents")) { tag ->
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(tag, fontSize = 11.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }

        // 5. Recent Activity
        SectionHeader("Recent Activity", null)
        
        val recentActivities = remember(recentConsultations, upcomingAppointments) {
            val activities = mutableListOf<Pair<Long, @Composable () -> Unit>>()
            
            recentConsultations.forEach { consultation ->
                // Basic sorting heuristic by string if date is formatted simply. Or just default 0.
                val timestamp = 0L 
                activities.add(
                    timestamp to { 
                        ActivityCard(
                            title = "Consultation Completed", 
                            subtitle = "Dr. ${consultation.doctorName}", 
                            time = consultation.date, 
                            icon = Icons.Outlined.Science, 
                            iconTint = SwastikPrimary, 
                            bgColor = Color(0xFFDCFCE7),
                            onClick = { onNavigateToMedicalRecords(com.example.swastik.ui.screens.patient.tabs.RecordFilter.CONSULTATIONS) }
                        ) 
                    }
                )
            }
            
            upcomingAppointments.forEach { appointment ->
                val timestamp = 1L
                activities.add(
                    timestamp to { 
                        ActivityCard(
                            title = "Appointment Booked", 
                            subtitle = "Dr. ${appointment.doctor?.name ?: "Unknown"}", 
                            time = "${appointment.date} • ${appointment.timeSlot}", 
                            icon = Icons.Outlined.Event, 
                            iconTint = Color(0xFF3B82F6), 
                            bgColor = Color(0xFFEFF6FF),
                            onClick = onNavigateToAppointments
                        ) 
                    }
                )
            }
            
            recentPrescriptions.forEach { prescription ->
                val timestamp = 2L
                activities.add(
                    timestamp to { 
                        ActivityCard(
                            title = "Prescription Generated", 
                            subtitle = prescription.diagnosis, 
                            time = prescription.createdAt, 
                            icon = Icons.Outlined.Description, 
                            iconTint = Color(0xFFF97316), 
                            bgColor = Color(0xFFFFF7ED),
                            onClick = onNavigateToPrescriptions
                        ) 
                    }
                )
            }
            
            activities.sortedByDescending { it.first }.map { it.second }
        }

        if (recentActivities.isEmpty()) {
            Text(
                text = "No recent activity",
                fontSize = 14.sp,
                color = Color(0xFF64748B),
                modifier = Modifier.padding(vertical = 12.dp)
            )
        } else {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(recentActivities.size) { index ->
                    recentActivities[index]()
                }
            }
        }

        // 6. Saved & Quick Links
        SectionHeader("Saved & Quick Links", null)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Doctors", "$favoriteDoctorsCount Doctors", Icons.Filled.Favorite, SwastikPrimary, Color(0xFFDCFCE7), onClick = onNavigateToFavoriteDoctors)
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Hospitals", "$favoriteHospitalsCount Hospitals", Icons.Filled.LocalHospital, Color(0xFF3B82F6), Color(0xFFEFF6FF), onClick = { onNavigateToFavoriteFacilities("HOSPITAL") })
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Clinics", "$favoriteClinicsCount Clinics", Icons.Filled.MedicalServices, Color(0xFF8B5CF6), Color(0xFFF3E8FF), onClick = { onNavigateToFavoriteFacilities("CLINIC") })
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Diagnostics", "$favoriteDiagnosticsCount Centers", Icons.Filled.Science, Color(0xFFF59E0B), Color(0xFFFEF3C7), onClick = { onNavigateToFavoriteFacilities("DIAGNOSTIC_CENTER") })
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Pharmacies", "$favoritePharmaciesCount Stores", Icons.Filled.LocalPharmacy, Color(0xFF10B981), Color(0xFFD1FAE5), onClick = { onNavigateToFavoriteFacilities("MEDICAL_STORE") })
                SavedLinkCard(modifier = Modifier.weight(1f), "Saved Medicines", "Saved", Icons.Filled.Medication, Color(0xFFF97316), Color(0xFFFFF7ED), onClick = onNavigateToFavoriteMedicines)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun SectionHeader(title: String, actionText: String?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
        if (actionText != null) {
            Text(actionText, fontSize = 12.sp, color = SwastikPrimary, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun QuickAccessCard(
    modifier: Modifier,
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    bgColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(110.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Box(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            Column {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(28.dp))
                Spacer(modifier = Modifier.weight(1f))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                Text(subtitle, fontSize = 10.sp, color = Color(0xFF64748B))
            }
        }
    }
}

@Composable
private fun ActivityCard(title: String, subtitle: String, time: String, icon: androidx.compose.ui.graphics.vector.ImageVector, iconTint: Color, bgColor: Color, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier.width(260.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(bgColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                Text(subtitle, fontSize = 11.sp, color = Color(0xFF64748B))
                Text(time, fontSize = 10.sp, color = Color(0xFF94A3B8))
            }
        }
    }
}

@Composable
private fun SavedLinkCard(modifier: Modifier, title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector, iconTint: Color, bgColor: Color, onClick: () -> Unit = {}) {
    Card(
        modifier = modifier.height(115.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(
            modifier = Modifier.padding(12.dp).fillMaxSize(),
            verticalArrangement = Arrangement.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(32.dp).background(bgColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(16.dp))
                }
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 11.sp, lineHeight = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, color = Color(0xFF1E293B))
            Text(subtitle, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Color(0xFF64748B))
        }
    }
}
