package com.example.swastik.ui.screens.patient

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.Appointment
import com.example.swastik.ui.theme.SwastikPurple
import com.example.swastik.ui.viewmodel.AppointmentViewModel

enum class AppointmentFilter {
    ALL, UPCOMING, COMPLETED, CANCELLED
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentHistoryScreen(
    onBackClick: () -> Unit,
    onAppointmentClick: (Appointment) -> Unit = {},
    onStartConsultation: (Appointment) -> Unit = {},
    onNavigateToPrescriptions: () -> Unit = {},
    onNavigateToBooking: () -> Unit = {},
    viewModel: AppointmentViewModel = hiltViewModel()
) {
    var selectedFilter by remember { mutableStateOf(AppointmentFilter.ALL) }
    var showCancelDialog by remember { mutableStateOf<Appointment?>(null) }
    val uiState = viewModel.uiState
    val colorScheme = MaterialTheme.colorScheme

    LaunchedEffect(selectedFilter) {
        val statusQuery = when (selectedFilter) {
            AppointmentFilter.ALL -> null
            AppointmentFilter.UPCOMING -> "scheduled"
            AppointmentFilter.COMPLETED -> "completed"
            AppointmentFilter.CANCELLED -> "cancelled"
        }
        viewModel.loadAppointments(statusQuery)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Appointment History", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.surface,
                    titleContentColor = colorScheme.onSurface,
                    navigationIconContentColor = colorScheme.onSurface
                )
            )
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            FilterChipsRow(selectedFilter = selectedFilter, onFilterSelected = { selectedFilter = it })
            Spacer(modifier = Modifier.height(16.dp))

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SwastikPurple)
                    }
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            uiState.error.orEmpty().ifBlank { "Something went wrong" },
                            fontSize = 16.sp,
                            color = colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadAppointments() }, colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)) { Text("Retry") }
                    }
                }
                uiState.appointments.isEmpty() -> EmptyAppointmentsView(
                    selectedFilter = selectedFilter,
                    onBookClick = onNavigateToBooking
                )
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(uiState.appointments) { appointment ->
                            AppointmentCard(
                                appointment = appointment,
                                onClick = { onAppointmentClick(appointment) },
                                onStartConsultation = { onStartConsultation(appointment) },
                                onPrescriptionClick = onNavigateToPrescriptions,
                                onBookAgainClick = onNavigateToBooking,
                                onCancelClick = { showCancelDialog = appointment }
                            )
                        }
                        item { Spacer(modifier = Modifier.height(20.dp)) }
                    }
                }
            }
        }
    }

    // Cancel Appointment Dialog
    showCancelDialog?.let { appointment ->
        AlertDialog(
            onDismissRequest = { showCancelDialog = null },
            title = { Text("Cancel Appointment", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Are you sure you want to cancel your appointment with ${appointment.doctor?.name ?: "the doctor"}?")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Date: ${appointment.date} at ${appointment.timeSlot}",
                        fontSize = 13.sp,
                        color = colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.cancelAppointment(appointment.id)
                        showCancelDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colorScheme.error)
                ) {
                    Text("Cancel Appointment")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = null }) {
                    Text("Keep Appointment")
                }
            }
        )
    }
}

@Composable
private fun FilterChipsRow(selectedFilter: AppointmentFilter, onFilterSelected: (AppointmentFilter) -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AppointmentFilter.entries.forEach { filter ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                label = { Text(text = filter.name.lowercase().replaceFirstChar { it.uppercase() }, fontSize = 13.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SwastikPurple,
                    selectedLabelColor = Color.White,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = colorScheme.outline.copy(alpha = 0.5f),
                    selectedBorderColor = SwastikPurple,
                    enabled = true,
                    selected = selectedFilter == filter
                )
            )
        }
    }
}

@Composable
private fun AppointmentCard(
    appointment: Appointment,
    onClick: () -> Unit,
    onStartConsultation: () -> Unit,
    onPrescriptionClick: () -> Unit = {},
    onBookAgainClick: () -> Unit = {},
    onCancelClick: () -> Unit = {}
) {
    val colorScheme = MaterialTheme.colorScheme
    val status = appointment.status.lowercase()
    val isUpcoming = status == "scheduled" || status == "confirmed"
    val isCompleted = status == "completed"
    val isCancelled = status == "cancelled"
    val doctorName = appointment.doctor?.name ?: "Doctor"
    val doctorSpecialty = appointment.doctor?.specialization ?: ""
    val isVideo = appointment.type.lowercase().contains("video")
    val facilityName = appointment.clinic?.name ?: appointment.hospital?.name
    val facilityLabel = when {
        appointment.clinic != null -> "Clinic"
        appointment.hospital != null -> "Hospital"
        isVideo -> "Consultation"
        else -> "Visit"
    }
    val inPersonVisitLabel = when {
        facilityName != null -> "$facilityLabel visit at $facilityName"
        else -> "In-person visit scheduled"
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                val (bgColor, txtColor, statusText) = when {
                    isCompleted -> Triple(Color(0xFFE8F5E9), Color(0xFF4CAF50), "Completed")
                    isUpcoming -> Triple(Color(0xFFE3F2FD), SwastikPurple, "Upcoming")
                    isCancelled -> Triple(Color(0xFFFFEBEE), Color(0xFFE53935), "Cancelled")
                    else -> Triple(colorScheme.surfaceVariant, colorScheme.onSurfaceVariant, appointment.status.replaceFirstChar { it.uppercase() })
                }
                Box(modifier = Modifier.background(bgColor, RoundedCornerShape(8.dp)).padding(horizontal = 12.dp, vertical = 6.dp)) {
                    Text(text = statusText, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = txtColor)
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.background(colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 6.dp)) {
                    Icon(if (isVideo) Icons.Outlined.VideoCall else Icons.Outlined.Person, contentDescription = null, tint = colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = if (isVideo) "Video" else "In-Person", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(60.dp).clip(CircleShape).background(SwastikPurple.copy(alpha = 0.1f)).border(2.dp, SwastikPurple.copy(alpha = 0.3f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(30.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = doctorName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colorScheme.onSurface)
                    if (doctorSpecialty.isNotEmpty()) Text(text = doctorSpecialty, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                    if (!facilityName.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (appointment.clinic != null) Icons.Default.MedicalServices else Icons.Default.LocalHospital,
                                contentDescription = null,
                                tint = SwastikPurple,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$facilityLabel • $facilityName",
                                fontSize = 12.sp,
                                color = SwastikPurple,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.35f))
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = appointment.date, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.AccessTime, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = appointment.timeSlot, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                }
            }
            if (isUpcoming) {
                Spacer(modifier = Modifier.height(16.dp))
                if (isVideo) {
                    Button(onClick = onStartConsultation, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)) {
                        Icon(Icons.Default.VideoCall, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Start Video Consultation", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = colorScheme.primaryContainer,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.EventAvailable, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = inPersonVisitLabel,
                                fontSize = 13.sp,
                                color = colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onCancelClick,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(colorScheme.error))
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = colorScheme.error, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Cancel Appointment", color = colorScheme.error, fontSize = 13.sp)
                }
            }
            if (isCompleted) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = onPrescriptionClick, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(12.dp), border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(SwastikPurple))) {
                        Icon(Icons.Outlined.Description, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Prescription", color = SwastikPurple, fontSize = 12.sp)
                    }
                    OutlinedButton(onClick = onBookAgainClick, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(12.dp), border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(SwastikPurple))) {
                        Icon(Icons.Outlined.Replay, contentDescription = null, tint = SwastikPurple, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Book Again", color = SwastikPurple, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyAppointmentsView(selectedFilter: AppointmentFilter, onBookClick: () -> Unit = {}) {
    val colorScheme = MaterialTheme.colorScheme
    Column(modifier = Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        AppointmentEmptyIcon()
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = when (selectedFilter) {
                AppointmentFilter.ALL -> "No Appointments Yet"
                AppointmentFilter.UPCOMING -> "No Upcoming Appointments"
                AppointmentFilter.COMPLETED -> "No Completed Appointments"
                AppointmentFilter.CANCELLED -> "No Cancelled Appointments"
            },
            fontSize = 20.sp, fontWeight = FontWeight.Bold, color = colorScheme.onSurface, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = when (selectedFilter) {
                AppointmentFilter.ALL -> "Book your first appointment with a doctor"
                AppointmentFilter.UPCOMING -> "You don't have any scheduled appointments"
                AppointmentFilter.COMPLETED -> "Your completed consultations will appear here"
                AppointmentFilter.CANCELLED -> "No cancelled appointments to show"
            },
            fontSize = 14.sp, color = colorScheme.onSurfaceVariant, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = onBookClick, modifier = Modifier.fillMaxWidth(0.6f).height(50.dp), shape = RoundedCornerShape(25.dp), colors = ButtonDefaults.buttonColors(containerColor = SwastikPurple)) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Book Appointment", fontSize = 15.sp)
        }
    }
}

@Composable
private fun AppointmentEmptyIcon() {
    Box(modifier = Modifier.size(140.dp), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(color = SwastikPurple, radius = 5.dp.toPx(), center = Offset(size.width * 0.85f, size.height * 0.15f))
            drawCircle(color = SwastikPurple, radius = 3.dp.toPx(), center = Offset(size.width * 0.75f, size.height * 0.22f))
            drawCircle(color = SwastikPurple, radius = 4.dp.toPx(), center = Offset(size.width * 0.12f, size.height * 0.7f))
        }
        Box(modifier = Modifier.size(120.dp).clip(CircleShape).background(SwastikPurple.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Box(modifier = Modifier.size(90.dp).clip(CircleShape).background(SwastikPurple), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = Color.White, modifier = Modifier.size(45.dp))
            }
        }
    }
}
