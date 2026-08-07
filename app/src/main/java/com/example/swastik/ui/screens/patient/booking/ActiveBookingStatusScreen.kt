package com.example.swastik.ui.screens.patient.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.viewmodel.AppointmentViewModel
import com.example.swastik.ui.screens.patient.AppointmentCancellationFlow
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay

private fun parseTimeSlot(timeSlot: String?): LocalTime? {
    if (timeSlot.isNullOrBlank()) return null
    val timeString = timeSlot.trim()
    return try {
        when {
            timeString.uppercase().contains("M") -> LocalTime.parse(timeString.uppercase(), DateTimeFormatter.ofPattern("h:mm a"))
            timeString.count { it == ':' } == 2 -> LocalTime.parse(timeString, DateTimeFormatter.ofPattern("HH:mm:ss"))
            else -> LocalTime.parse(timeString, DateTimeFormatter.ofPattern("HH:mm"))
        }
    } catch (e: Exception) {
        null
    }
}

fun formatTimeSlot(timeSlot: String?): String {
    val parsed = parseTimeSlot(timeSlot) ?: return timeSlot?.trim().orEmpty()
    return parsed.format(DateTimeFormatter.ofPattern("hh:mm a"))
}

fun appointmentDateTime(date: String?, timeSlot: String?): java.time.LocalDateTime? {
    val time = parseTimeSlot(timeSlot) ?: return null
    return try {
        java.time.LocalDateTime.of(java.time.LocalDate.parse(date), time)
    } catch (e: Exception) {
        null
    }
}

@Composable
fun getConfirmationStatusMessage(date: String, timeSlot: String, status: String): String {
    var now by remember { mutableStateOf(java.time.LocalDateTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30000L)
            now = java.time.LocalDateTime.now()
        }
    }
    val scheduledTime = appointmentDateTime(date, timeSlot)
    val formattedTime = formatTimeSlot(timeSlot)
    
    return if (status.lowercase() == "cancelled") {
        "Booking Cancelled"
    } else if (status.lowercase() == "completed") {
        "Consultation Completed"
    } else if (scheduledTime == null) {
        if (status.lowercase() == "confirmed") "Doctor assigned for $timeSlot" else "Waiting for confirmation by $timeSlot"
    } else if (now.isAfter(scheduledTime) && status.lowercase() != "confirmed") {
        "Waiting for new schedule by doctor"
    } else if (status.lowercase() == "confirmed") {
        "Doctor assigned for $formattedTime"
    } else {
        "Waiting for confirmation by $formattedTime"
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveBookingStatusScreen(
    appointmentId: String,
    onNavigateBack: () -> Unit,
    onNavigateToDoctorProfile: (String) -> Unit = {},
    viewModel: PatientDashboardViewModel = hiltViewModel(),
    appointmentViewModel: AppointmentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val profile by viewModel.patientProfile.collectAsState()

    if (uiState.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = SwastikPrimary)
        }
        return
    }

    val appointment = uiState.dashboard?.upcomingAppointments?.find { it.id == appointmentId }

    var showMenu by remember { mutableStateOf(false) }
    var showCancelDialog by remember { mutableStateOf(false) }

    if (appointment == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Booking not found.")
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More", tint = Color.White)
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Help / Support") },
                                onClick = { showMenu = false }
                            )
                            DropdownMenuItem(
                                text = { Text("Cancel Booking") },
                                onClick = { 
                                    showMenu = false
                                    showCancelDialog = true 
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SwastikPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F9FA))
                .verticalScroll(rememberScrollState())
        ) {
            // Green Header Section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SwastikPrimary)
                    .padding(top = paddingValues.calculateTopPadding(), bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Success",
                        tint = SwastikPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = if (appointment.status.lowercase() == "confirmed") "Booking confirmed" else "Booking scheduled",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Main Content Area
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Status Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFF00C853))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = getConfirmationStatusMessage(appointment.date, appointment.timeSlot ?: "", appointment.status),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // OTP Card — only show when consultation is in progress
                if (appointment.status.lowercase() == "in_progress" && !appointment.completionOtp.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFFF3CD),
                        border = BorderStroke(1.5.dp, Color(0xFFFFC107))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = Color(0xFFF57C00),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Consultation is in progress",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color(0xFFF57C00)
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Your Completion OTP",
                                fontSize = 12.sp,
                                color = Color(0xFF795548)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            // OTP digits displayed in boxes
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                appointment.completionOtp!!.forEach { digit ->
                                    Surface(
                                        modifier = Modifier.size(44.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color.White,
                                        border = BorderStroke(1.5.dp, Color(0xFFFFC107))
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = digit.toString(),
                                                fontSize = 22.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color(0xFFF57C00)
                                            )
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Share this OTP with your doctor to complete the consultation.",
                                fontSize = 12.sp,
                                color = Color(0xFF795548),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 18.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Doctor Details Card
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable {
                        appointment.doctor?.id?.let { doctorId ->
                            onNavigateToDoctorProfile(doctorId)
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 2.dp
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (!appointment.doctor?.profileImageUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(appointment.doctor?.profileImageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Doctor Profile Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(50.dp)
                                    .clip(CircleShape)
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(50.dp)
                                    .background(Color(0xFFF0F4F8), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Outlined.Person, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(24.dp))
                            }
                        }
                        
                        Spacer(modifier = Modifier.width(16.dp))
                        
                        Column {
                            val rawDocName = appointment.doctor?.name ?: "Unknown"
                            val cleanDocName = rawDocName.replace(Regex("^(Dr\\.?\\s*|Doctor\\s+)", RegexOption.IGNORE_CASE), "").trim()
                            val docFirstName = cleanDocName.split("\\s+".toRegex()).firstOrNull() ?: "Unknown"
                            
                            Text(
                                text = "Your booking is with Dr. $docFirstName",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = appointment.hospital?.name ?: appointment.clinic?.name ?: "Online Consultation",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Booking Summary Card
                var showBookingSummaryDialog by remember { mutableStateOf(false) }
                
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable(onClick = { showBookingSummaryDialog = true }),
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 2.dp
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFF0F4F8), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Outlined.Description, contentDescription = null, tint = Color.Gray)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "Booking summary",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Booking id - ${appointment.id.takeLast(10)}",
                                    color = Color.Gray,
                                    fontSize = 12.sp
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "1 service in this booking",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                            Surface(
                                color = Color(0xFFF5F5F5),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = appointment.status.replaceFirstChar { it.uppercase() },
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    fontSize = 12.sp,
                                    color = Color.DarkGray
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFE3F2FD)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.LocalHospital, contentDescription = null, tint = Color(0xFF1976D2))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = appointment.type?.replaceFirstChar { it.uppercase() } ?: "Consultation",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Dr. ${appointment.doctor?.name ?: "Unknown"}",
                                    color = Color.Gray,
                                    fontSize = 13.sp
                                )
                            }
                            Text(
                                text = "₹${appointment.consultationFee ?: 500}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        HorizontalDivider(color = Color(0xFFF0F0F0))
                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "View booking summary",
                            color = SwastikPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
                
                if (showBookingSummaryDialog) {
                    AlertDialog(
                        onDismissRequest = { showBookingSummaryDialog = false },
                        title = { Text("Booking Summary & Payment") },
                        text = { 
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Consultation Fee:")
                                    Text("₹${appointment.consultationFee ?: 500}")
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Platform Fee:")
                                    Text("₹0")
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total Amount Paid:", fontWeight = FontWeight.Bold)
                                    Text("₹${appointment.consultationFee ?: 500}", fontWeight = FontWeight.Bold, color = SwastikPrimary)
                                }
                            }
                        },
                        confirmButton = {
                            TextButton(onClick = { showBookingSummaryDialog = false }) {
                                Text("Close")
                            }
                        },
                        containerColor = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Modify Booking Card
                var showModifyInfoDialog by remember { mutableStateOf(false) }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    shadowElevation = 2.dp
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = "Modify your booking",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Free cancellations allowed up to 2 hours before booking time.",
                            color = Color.Gray,
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Learn more ->",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.clickable(onClick = { showModifyInfoDialog = true }),
                            color = SwastikPrimary
                        )
                    }
                }
                
                if (showModifyInfoDialog) {
                    AlertDialog(
                        onDismissRequest = { showModifyInfoDialog = false },
                        title = { Text("Modify your booking") },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("• Free cancellation is allowed up to 2 hours before the scheduled time.")
                                Text("• To reschedule, you must cancel this booking and create a new one.")
                                Text("• Late cancellations may incur a nominal platform fee.")
                                Text("• In case of a no-show by the doctor, a full refund will be automatically initiated.")
                            }
                        },
                        confirmButton = {
                            TextButton(onClick = { showModifyInfoDialog = false }) {
                                Text("Got it")
                            }
                        },
                        containerColor = Color.White
                    )
                }
                
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
    
    if (showCancelDialog && appointment != null) {
        AppointmentCancellationFlow(
            appointment = appointment,
            onDismiss = { showCancelDialog = false },
            onConfirmCancellation = { reason ->
                appointmentViewModel.cancelAppointment(appointment.id, reason)
                showCancelDialog = false
            },
            onBookAgain = { onNavigateBack() },
            onFindAnotherSpecialist = { onNavigateBack() }
        )
    }

    val apptState = appointmentViewModel.uiState
    LaunchedEffect(apptState.cancelSuccess) {
        if (apptState.cancelSuccess) {
            onNavigateBack()
        }
    }
}
