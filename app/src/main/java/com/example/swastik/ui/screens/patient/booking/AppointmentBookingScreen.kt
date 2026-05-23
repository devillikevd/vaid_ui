package com.example.swastik.ui.screens.patient.booking

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.LoadState
import androidx.paging.compose.itemContentType
import androidx.paging.compose.itemKey
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.model.Doctor
import com.example.swastik.data.model.TimeSlot
import com.example.swastik.ui.theme.SwastikPrimary
import com.example.swastik.ui.theme.SwastikPrimaryLight
import com.example.swastik.ui.viewmodel.AppointmentViewModel
import com.example.swastik.ui.viewmodel.AppointmentUiState
import com.example.swastik.ui.viewmodel.DoctorSearchViewModel
import com.example.swastik.ui.viewmodel.DoctorSearchUiState
import com.example.swastik.ui.viewmodel.NextAvailableSlotSuggestion
import com.example.swastik.ui.viewmodel.PatientDashboardViewModel
import com.example.swastik.ui.components.DoctorProfileBottomSheet
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*
import androidx.compose.ui.res.stringResource
import com.example.swastik.R

/**
 * Multi-step Appointment Booking Screen:
 * Step 1 → Search & select a doctor
 * Step 2 → Pick date & time slot
 * Step 3 → Choose type, add notes, confirm & book
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentBookingScreen(
    onBackClick: () -> Unit,
    onBookingComplete: () -> Unit,
    preselectedDoctorId: String? = null,
    preselectedHospitalId: String? = null,
    preselectedClinicId: String? = null,
    preselectedSpecialization: String? = null,
    consultationMode: String? = null,
    preselectedSearch: String? = null,
    doctorSearchViewModel: DoctorSearchViewModel = hiltViewModel(),
    appointmentViewModel: AppointmentViewModel = hiltViewModel(),
    patientDashboardViewModel: PatientDashboardViewModel = hiltViewModel()
) {
    // booking wizard state — skip Step 1 when doctor is preselected
    var currentStep by remember { mutableIntStateOf(if (!preselectedDoctorId.isNullOrBlank()) 0 else 1) }
    var selectedDoctor by remember { mutableStateOf<Doctor?>(null) }
    var selectedDate by remember { mutableStateOf<LocalDate?>(null) }
    var selectedTimeSlot by remember { mutableStateOf<String?>(null) }
    var selectedType by remember { mutableStateOf(consultationMode ?: "video") }
    var notes by remember { mutableStateOf("") }
    var showDoctorProfile by remember { mutableStateOf<Doctor?>(null) }
    val availableDates = remember { (0..13).map { LocalDate.now().plusDays(it.toLong()) } }

    val patientProfile by patientDashboardViewModel.patientProfile.collectAsState()

    LaunchedEffect(preselectedHospitalId, preselectedClinicId, preselectedSpecialization, consultationMode, preselectedSearch, patientProfile?.location) {
        if (consultationMode == "in_person" && patientProfile?.location != null) {
            doctorSearchViewModel.setPatientLocation(0.0, 0.0, patientProfile?.location)
        }

        if (!preselectedHospitalId.isNullOrBlank() || !preselectedClinicId.isNullOrBlank() || !preselectedSpecialization.isNullOrBlank() || !preselectedSearch.isNullOrBlank()) {
            doctorSearchViewModel.updateFilters(
                hospitalId = preselectedHospitalId,
                clinicId = preselectedClinicId,
                specialization = preselectedSpecialization,
                search = preselectedSearch
            )
        } else if (preselectedDoctorId.isNullOrBlank()) {
            // Only search all doctors if we DON'T have a preselected doctor
            doctorSearchViewModel.searchDoctors(resetList = true)
        }
    }

    LaunchedEffect(preselectedDoctorId) {
        if (!preselectedDoctorId.isNullOrBlank()) {
            doctorSearchViewModel.selectDoctor(preselectedDoctorId)
        }
    }

    val doctorState by doctorSearchViewModel.uiState.collectAsState()
    val appointmentState = appointmentViewModel.uiState

    // When preselected doctor loads, auto-advance to Step 2
    LaunchedEffect(preselectedDoctorId, doctorState.selectedDoctor?.doctor?.id) {
        val preselected = preselectedDoctorId ?: return@LaunchedEffect
        val doctor = doctorState.selectedDoctor?.doctor ?: return@LaunchedEffect
        if (doctor.id == preselected && selectedDoctor?.id != doctor.id) {
            selectedDoctor = doctor
            currentStep = 2
        }
    }

    // Handle successful booking
    LaunchedEffect(appointmentState.bookingSuccess) {
        if (appointmentState.bookingSuccess) {
            appointmentViewModel.resetBookingState()
            onBookingComplete()
        }
    }

    val stepTitle = when (currentStep) {
        0 -> "Loading..."
        1 -> "Select Doctor"
        2 -> "Consultation Details"
        3 -> "Pick Date & Time"
        4 -> stringResource(R.string.confirm_booking)
        else -> "Book Appointment"
    }

    val blurRadius by androidx.compose.animation.core.animateDpAsState(
        targetValue = if (showDoctorProfile != null) 12.dp else 0.dp,
        label = "blur"
    )

    Scaffold(
        modifier = Modifier.blur(blurRadius),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stepTitle, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                        Text(
                            "Step $currentStep of 4",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        when (currentStep) {
                            0 -> onBackClick()
                            1 -> onBackClick()
                            2 -> {
                                // If doctor was preselected, go back to dashboard instead of step 1
                                if (!preselectedDoctorId.isNullOrBlank()) {
                                    onBackClick()
                                } else {
                                    currentStep = 1
                                }
                            }
                            3 -> {
                                currentStep = 2
                                selectedDate = null
                                selectedTimeSlot = null
                                appointmentViewModel.resetSlotSelectionState()
                            }
                            4 -> currentStep = 3
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Step indicator bar
            StepIndicator(currentStep = currentStep)

            // Error banner
            appointmentState.error?.let { error ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.weight(1f),
                            fontSize = 13.sp
                        )
                        TextButton(onClick = { appointmentViewModel.clearError() }) {
                            Text(stringResource(R.string.dismiss))
                        }
                    }
                }
            }

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    slideInHorizontally { if (targetState > initialState) it else -it } + fadeIn() togetherWith
                            slideOutHorizontally { if (targetState > initialState) -it else it } + fadeOut()
                },
                label = "step_animation"
            ) { step ->
                when (step) {
                    0 -> {
                        // Loading state while doctor is being fetched
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(color = SwastikPrimary)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("Loading doctor details...", color = Color.Gray)
                            }
                        }
                    }
                    1 -> DoctorSelectionStep(
                        doctorSearchViewModel = doctorSearchViewModel,
                        uiState = doctorState,
                        onDoctorSelected = { doctor, isDirectBooking ->
                            if (isDirectBooking) {
                                selectedDoctor = doctor
                                currentStep = 2
                            } else {
                                showDoctorProfile = doctor
                            }
                        }
                    )
                    2 -> ConsultationDetailsStep(
                        consultationMode = consultationMode,
                        selectedType = selectedType,
                        notes = notes,
                        onTypeChanged = { selectedType = it },
                        onNotesChanged = { notes = it },
                        onContinue = { currentStep = 3 }
                    )
                    3 -> DateTimeSelectionStep(
                        doctor = selectedDoctor!!,
                        availableDates = availableDates,
                        appointmentState = appointmentState,
                        selectedDate = selectedDate,
                        selectedTimeSlot = selectedTimeSlot,
                        onDateSelected = { date ->
                            selectedDate = date
                            selectedTimeSlot = null
                            val formatted = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                            val fallbackDates = availableDates
                                .filter { it.isAfter(date) }
                                .map { it.format(DateTimeFormatter.ISO_LOCAL_DATE) }
                            appointmentViewModel.loadTimeSlots(
                                selectedDoctor!!.id,
                                formatted,
                                fallbackDates
                            )
                        },
                        onTimeSlotSelected = { slot -> selectedTimeSlot = slot },
                        onContinue = { currentStep = 4 }
                    )
                    4 -> ConfirmationStep(
                        doctor = selectedDoctor!!,
                        date = selectedDate!!,
                        timeSlot = selectedTimeSlot!!,
                        selectedType = selectedType,
                        notes = notes,
                        isBooking = appointmentState.isBooking,
                        onConfirm = {
                            val formatted =
                                selectedDate!!.format(DateTimeFormatter.ISO_LOCAL_DATE)
                            appointmentViewModel.bookAppointment(
                                doctorId = selectedDoctor!!.id,
                                date = formatted,
                                timeSlot = selectedTimeSlot!!,
                                type = selectedType,
                                notes = notes.ifBlank { null },
                                hospitalId = preselectedHospitalId,
                                clinicId = preselectedClinicId
                            )
                        }
                    )
                }
            }
        }
        
        if (showDoctorProfile != null) {
            DoctorProfileBottomSheet(
                doctor = showDoctorProfile!!,
                onDismiss = { showDoctorProfile = null },
                onBookClick = {
                    val doctorToBook = showDoctorProfile
                    showDoctorProfile = null
                    selectedDoctor = doctorToBook
                    currentStep = 2
                }
            )
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Step Indicator
// ────────────────────────────────────────────────────────────────
@Composable
private fun StepIndicator(currentStep: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (step in 1..4) {
            val isActive = step <= currentStep
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(
                        if (isActive) SwastikPrimary
                        else Color.LightGray.copy(alpha = 0.5f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (step < currentStep) {
                    Icon(
                        Icons.Outlined.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                } else {
                    Text(
                        "$step",
                        color = if (isActive) Color.White else Color.Gray,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
            if (step < 4) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(3.dp)
                        .padding(horizontal = 4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (step < currentStep) SwastikPrimary
                            else Color.LightGray.copy(alpha = 0.3f)
                        )
                )
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// STEP 1 — Doctor Search & Selection
// ────────────────────────────────────────────────────────────────
@Composable
private fun DoctorSelectionStep(
    doctorSearchViewModel: DoctorSearchViewModel,
    uiState: DoctorSearchUiState,
    onDoctorSelected: (Doctor, Boolean) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedSpecialization by remember { mutableStateOf<String?>(null) }
    
    val speechLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val spokenText = result.data
                ?.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
            if (!spokenText.isNullOrBlank()) {
                searchQuery = spokenText
                doctorSearchViewModel.updateFilters(search = spokenText)
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = {
                searchQuery = it
                doctorSearchViewModel.updateFilters(search = it.ifBlank { null })
            },
            placeholder = { Text(stringResource(R.string.search_doctors_hint)) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { 
                        searchQuery = ""
                        doctorSearchViewModel.updateFilters(search = null)
                    }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                } else {
                    IconButton(onClick = {
                        val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, java.util.Locale.getDefault())
                        }
                        try {
                            speechLauncher.launch(intent)
                        } catch (e: Exception) {
                            // ignore
                        }
                    }) {
                        Icon(Icons.Default.Mic, contentDescription = "Voice Search", tint = SwastikPrimary)
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )



        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = SwastikPrimary)
                }
            }
            uiState.error != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                doctorSearchViewModel.searchDoctors(resetList = true)
                            }
                        ) {
                            Text(stringResource(R.string.retry))
                        }
                    }
                }
            }
            else -> {
                val pagedDoctors = doctorSearchViewModel.pagedDoctors.collectAsLazyPagingItems()
                val isLoadingPaging = pagedDoctors.loadState.refresh is LoadState.Loading

                if (isLoadingPaging) {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(3) {
                            // Note: There is no DoctorCardShimmer here, but we can reuse CircularProgressIndicator or build one.
                            Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        }
                    }
                } else if (pagedDoctors.itemCount == 0) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.PersonSearch,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(stringResource(R.string.no_doctors_found), color = Color.Gray, fontSize = 16.sp)
                            Text(
                                "Try a different search",
                                color = Color.LightGray,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(
                            count = pagedDoctors.itemCount,
                            key = pagedDoctors.itemKey { it.id },
                            contentType = pagedDoctors.itemContentType { "Doctor" }
                        ) { index ->
                            val doctor = pagedDoctors[index]
                            if (doctor != null) {
                                DoctorBookingCard(
                                    doctor = doctor,
                                    onSelect = { onDoctorSelected(doctor, true) }, // Pass true to indicate direct booking
                                    onViewProfile = { onDoctorSelected(doctor, false) } // false for viewing profile
                                )
                            }
                        }
                        
                        if (pagedDoctors.loadState.append is LoadState.Loading) {
                            item {
                                CircularProgressIndicator(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp)
                                        .wrapContentWidth(Alignment.CenterHorizontally)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DoctorBookingCard(
    doctor: Doctor,
    onSelect: () -> Unit,
    onViewProfile: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(SwastikPrimaryLight, RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = "Doctor",
                        modifier = Modifier.size(32.dp),
                        tint = SwastikPrimary
                    )
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Verified",
                        tint = SwastikPrimary,
                        modifier = Modifier
                            .size(20.dp)
                            .align(Alignment.BottomEnd)
                            .offset(x = 6.dp, y = 6.dp)
                            .background(Color.White, CircleShape)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = doctor.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = doctor.specialization,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = SwastikPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = doctor.experienceYears?.let { "$it+ Yrs Exp" } ?: "8+ Yrs Exp",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
                // Rating badge
                Surface(
                    color = Color(0xFFFFF8E1),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            Icons.Filled.Star,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFFFFB800)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = doctor.averageRating?.let {
                                String.format(Locale.US, "%.1f", it)
                            } ?: "4.8",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFB28900)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text(
                        text = "Consultation Fee",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = doctor.consultationFee?.let { "₹$it" } ?: "Free",
                        color = SwastikPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
                
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onViewProfile,
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SwastikPrimary),
                        border = BorderStroke(1.5.dp, SwastikPrimary),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Text(stringResource(R.string.view_profile), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                    Button(
                        onClick = onSelect,
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary, contentColor = Color.White),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Text(stringResource(R.string.book), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
// ────────────────────────────────────────────────────────────────
// STEP 2 — Date & Time Slot Selection
// ────────────────────────────────────────────────────────────────
@Composable
private fun DateTimeSelectionStep(
    doctor: Doctor,
    availableDates: List<LocalDate>,
    appointmentState: AppointmentUiState,
    selectedDate: LocalDate?,
    selectedTimeSlot: String?,
    onDateSelected: (LocalDate) -> Unit,
    onTimeSlotSelected: (String) -> Unit,
    onContinue: () -> Unit
) {
    val today = LocalDate.now()
    val hasAvailableSlots = appointmentState.timeSlots.any { it.isAvailable }
    val availableSlotCount = appointmentState.timeSlots.count { it.isAvailable }
    val bookedSlotCount = appointmentState.timeSlots.count { !it.isAvailable }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Doctor summary header
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = SwastikPrimaryLight.copy(alpha = 0.3f)
                )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(SwastikPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(stringResource(R.string.string_2), fontSize = 22.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            doctor.name,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp
                        )
                        Text(
                            doctor.specialization,
                            fontSize = 13.sp,
                            color = SwastikPrimary
                        )
                    }
                }
            }
        }

        // Date selector
        item {
            Text(
                "📅 Select Date",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(availableDates) { date ->
                    val isSelected = date == selectedDate
                    val isToday = date == today
                    Surface(
                        modifier = Modifier
                            .width(68.dp)
                            .clickable { onDateSelected(date) },
                        shape = RoundedCornerShape(14.dp),
                        color = if (isSelected) SwastikPrimary
                        else if (isToday) SwastikPrimaryLight.copy(alpha = 0.3f)
                        else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isToday && !isSelected)
                            BorderStroke(1.dp, SwastikPrimary)
                        else null
                    ) {
                        Column(
                            modifier = Modifier.padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = date.dayOfWeek.getDisplayName(
                                    TextStyle.SHORT,
                                    Locale.getDefault()
                                ),
                                fontSize = 12.sp,
                                color = if (isSelected) Color.White else Color.Gray
                            )
                            Text(
                                text = "${date.dayOfMonth}",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White
                                else MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = date.month.getDisplayName(
                                    TextStyle.SHORT,
                                    Locale.getDefault()
                                ),
                                fontSize = 11.sp,
                                color = if (isSelected) Color.White.copy(alpha = 0.8f)
                                else Color.Gray
                            )
                        }
                    }
                }
            }
        }

        // Time slot grid
        item {
            if (selectedDate != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "🕐 Available Time Slots",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                when {
                    appointmentState.isLoadingSlots -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = SwastikPrimary,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                    appointmentState.timeSlots.isEmpty() -> {
                        NoSlotsAvailableCard(
                            selectedDate = selectedDate,
                            bookedSlotCount = bookedSlotCount,
                            suggestion = appointmentState.nextAvailableSuggestion,
                            isSearchingNextAvailable = appointmentState.isSearchingNextAvailable,
                            onJumpToSuggestedDate = { suggested ->
                                onDateSelected(LocalDate.parse(suggested.date))
                            }
                        )
                    }
                    !hasAvailableSlots -> {
                        NoSlotsAvailableCard(
                            selectedDate = selectedDate,
                            bookedSlotCount = bookedSlotCount,
                            suggestion = appointmentState.nextAvailableSuggestion,
                            isSearchingNextAvailable = appointmentState.isSearchingNextAvailable,
                            onJumpToSuggestedDate = { suggested ->
                                onDateSelected(LocalDate.parse(suggested.date))
                            }
                        )
                    }
                    else -> {
                        SlotAvailabilitySummary(
                            availableSlotCount = availableSlotCount,
                            bookedSlotCount = bookedSlotCount
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TimeSlotGrid(
                            slots = appointmentState.timeSlots,
                            selectedSlot = selectedTimeSlot,
                            onSlotSelected = onTimeSlotSelected
                        )
                    }
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                            .copy(alpha = 0.5f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(stringResource(R.string.string_5), fontSize = 32.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Select a date above to see available slots",
                            fontSize = 14.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        // Continue button
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                enabled = selectedDate != null && selectedTimeSlot != null,
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) {
                Text(
                    "Continue",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            }
        }
    }
}

@Composable
private fun SlotAvailabilitySummary(
    availableSlotCount: Int,
    bookedSlotCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Surface(
            color = Color(0xFFE8F5E9),
            shape = RoundedCornerShape(999.dp)
        ) {
            Text(
                text = "$availableSlotCount open",
                color = Color(0xFF2E7D32),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
            )
        }
        if (bookedSlotCount > 0) {
            Surface(
                color = Color(0xFFFFF3E0),
                shape = RoundedCornerShape(999.dp)
            ) {
                Text(
                    text = "$bookedSlotCount booked",
                    color = Color(0xFFB26A00),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                )
            }
        }
    }
}

@Composable
private fun NoSlotsAvailableCard(
    selectedDate: LocalDate?,
    bookedSlotCount: Int,
    suggestion: NextAvailableSlotSuggestion?,
    isSearchingNextAvailable: Boolean,
    onJumpToSuggestedDate: (NextAvailableSlotSuggestion) -> Unit
) {
    val formattedDate = selectedDate?.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(stringResource(R.string.string_6), fontSize = 32.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (formattedDate != null) "No open slots on $formattedDate" else "No open slots available",
                fontWeight = FontWeight.Medium,
                fontSize = 15.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = when {
                    bookedSlotCount > 0 -> "All $bookedSlotCount published slots are already taken."
                    else -> "This doctor has not published available times for the selected day."
                },
                fontSize = 13.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )

            when {
                isSearchingNextAvailable -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    CircularProgressIndicator(
                        color = SwastikPrimary,
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Checking the next available dates",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                suggestion != null -> {
                    Spacer(modifier = Modifier.height(16.dp))
                    FilledTonalButton(
                        onClick = { onJumpToSuggestedDate(suggestion) },
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = SwastikPrimaryLight.copy(alpha = 0.5f),
                            contentColor = SwastikPrimary
                        )
                    ) {
                        Text(
                            "Jump to ${LocalDate.parse(suggestion.date).format(DateTimeFormatter.ofPattern("EEE, d MMM"))}"
                        )
                    }
                    suggestion.firstAvailableSlot?.let { firstSlot ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "${suggestion.availableSlotCount} open slots from $firstSlot",
                            fontSize = 12.sp,
                            color = SwastikPrimary,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center
                        )
                    }
                }
                else -> {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "No open slots found in the next two weeks. Try another doctor or facility.",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun TimeSlotGrid(
    slots: List<TimeSlot>,
    selectedSlot: String?,
    onSlotSelected: (String) -> Unit
) {
    val availableSlots = slots.filter { it.isAvailable }
    val unavailableSlots = slots.filter { !it.isAvailable }

    Column {
        if (availableSlots.isNotEmpty()) {
            SlotChunkRows(
                slots = availableSlots,
                selectedSlot = selectedSlot,
                enabled = true,
                onSlotSelected = onSlotSelected
            )
        }
        if (unavailableSlots.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Booked",
                fontSize = 12.sp,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            SlotChunkRows(
                slots = unavailableSlots,
                selectedSlot = null,
                enabled = false,
                onSlotSelected = {}
            )
        }
    }
}

@Composable
private fun SlotChunkRows(
    slots: List<TimeSlot>,
    selectedSlot: String?,
    enabled: Boolean,
    onSlotSelected: (String) -> Unit
) {
    val chunked = slots.chunked(4)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        chunked.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { slot ->
                    val isSelected = slot.time == selectedSlot
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .then(
                                if (enabled) Modifier.clickable {
                                    onSlotSelected(slot.time)
                                } else Modifier
                            ),
                        shape = RoundedCornerShape(10.dp),
                        color = when {
                            isSelected -> SwastikPrimary
                            !enabled -> Color.LightGray.copy(alpha = 0.3f)
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        border = if (isSelected) null
                        else BorderStroke(
                            1.dp,
                            if (enabled) SwastikPrimary.copy(alpha = 0.3f)
                            else Color.LightGray.copy(alpha = 0.2f)
                        )
                    ) {
                        Text(
                            text = slot.time,
                            modifier = Modifier.padding(
                                vertical = 10.dp,
                                horizontal = 4.dp
                            ),
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold
                            else FontWeight.Normal,
                            color = when {
                                isSelected -> Color.White
                                !enabled -> Color.Gray.copy(alpha = 0.5f)
                                else -> MaterialTheme.colorScheme.onSurface
                            },
                            textAlign = TextAlign.Center,
                            maxLines = 1
                        )
                    }
                }
                // Fill remaining weight if row < 4
                repeat(4 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// STEP 2 — Consultation Details
// ────────────────────────────────────────────────────────────────
@Composable
private fun ConsultationDetailsStep(
    consultationMode: String?,
    selectedType: String,
    notes: String,
    onTypeChanged: (String) -> Unit,
    onNotesChanged: (String) -> Unit,
    onContinue: () -> Unit
) {
    val types = if (consultationMode == "video") {
        listOf(Triple("video", "📹", "Video Consultation"))
    } else {
        listOf(
            Triple("video", "📹", "Video Consultation"),
            Triple("in_person", "🏥", "In-Person Visit")
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                stringResource(R.string.consultation_type),
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                types.forEach { (type, emoji, label) ->
                    val isSelected = selectedType == type
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onTypeChanged(type) },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) SwastikPrimary
                        else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (!isSelected) BorderStroke(
                            1.dp,
                            SwastikPrimary.copy(alpha = 0.2f)
                        ) else null
                    ) {
                        Row(
                            modifier = Modifier.padding(
                                vertical = 14.dp,
                                horizontal = 12.dp
                            ),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(emoji, fontSize = 24.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = label,
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold
                                else FontWeight.Medium,
                                color = if (isSelected) Color.White
                                else MaterialTheme.colorScheme.onSurface,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        item {
            Text(
                "Notes (optional)",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = notes,
                onValueChange = onNotesChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                placeholder = {
                    Text(stringResource(R.string.describe_symptoms_visit))
                },
                shape = RoundedCornerShape(12.dp),
                maxLines = 4
            )
        }
        
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SwastikPrimary)
            ) {
                Text(
                    "Continue",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp
                )
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// STEP 4 — Confirmation
// ────────────────────────────────────────────────────────────────
@Composable
private fun ConfirmationStep(
    doctor: Doctor,
    date: LocalDate,
    timeSlot: String,
    selectedType: String,
    notes: String,
    isBooking: Boolean,
    onConfirm: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Flight Ticket style summary card
        item {
            androidx.compose.material3.Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = com.example.swastik.ui.components.TicketShape(
                    cornerRadius = 16.dp,
                    cutoutRadius = 12.dp,
                    cutoutPositionRatio = 0.65f
                ),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                shadowElevation = 2.dp
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Top part of ticket
                    Column(modifier = Modifier.padding(24.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                stringResource(R.string.boarding_pass),
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                color = SwastikPrimary,
                                letterSpacing = 2.sp
                            )
                            Icon(
                                Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = SwastikPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(stringResource(R.string.patient_uppercase), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.you), fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Icon(Icons.Outlined.ArrowForward, contentDescription = null, tint = Color.LightGray)
                            Column(horizontalAlignment = Alignment.End) {
                                Text(stringResource(R.string.doctor_uppercase), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Text(doctor.name, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.date_uppercase), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Text(
                                    date.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.time_uppercase), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Text(timeSlot, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                            }
                            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                                Text(stringResource(R.string.fee_uppercase), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                Text(doctor.consultationFee?.let { "₹$it" } ?: stringResource(R.string.free), fontSize = 15.sp, fontWeight = FontWeight.Medium, color = SwastikPrimary)
                            }
                        }

                        if (selectedType.isNotBlank()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Start
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(stringResource(R.string.consultation_type).uppercase(), fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                    Text(if (selectedType == "video") "📹 Video" else "🏥 In-Person", fontSize = 15.sp, fontWeight = FontWeight.Medium, color = SwastikPrimary)
                                }
                            }
                        }
                    }

                    // Dotted line separator
                    androidx.compose.foundation.Canvas(
                        modifier = Modifier.fillMaxWidth().height(1.dp)
                    ) {
                        drawLine(
                            color = Color.Gray.copy(alpha = 0.3f),
                            start = androidx.compose.ui.geometry.Offset(x = 12.dp.toPx(), y = 0f),
                            end = androidx.compose.ui.geometry.Offset(x = size.width - 12.dp.toPx(), y = 0f),
                            strokeWidth = 2f,
                            pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                        )
                    }

                    // Bottom part of ticket (Barcode simulation)
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "|||| ||| ||||| |||| || ||| ||||",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Light,
                            letterSpacing = 4.sp,
                            color = Color.Gray.copy(alpha = 0.6f),
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            stringResource(R.string.swastik_healthcare),
                            fontSize = 10.sp,
                            letterSpacing = 2.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }

        // Confirm button
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onConfirm,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(14.dp),
                enabled = !isBooking,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SwastikPrimary
                )
            ) {
                if (isBooking) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        stringResource(R.string.booking_ellipsis),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                } else {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        stringResource(R.string.confirm_booking),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SummaryRow(icon: String, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(icon, fontSize = 18.sp)
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            label,
            fontSize = 14.sp,
            color = Color.Gray,
            modifier = Modifier.width(80.dp)
        )
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
