package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.*
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.BookWellnessSessionRequest
import com.example.swastik.data.remote.dto.WellnessCoachDetailDto
import com.example.swastik.ui.viewmodel.WellnessSessionBookingViewModel
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSessionBookingScreen(
    coachId: String,
    onBackClick: () -> Unit,
    onSessionBooked: (sessionId: String) -> Unit,
    viewModel: WellnessSessionBookingViewModel = hiltViewModel()
) {
    val coachState by viewModel.coachState.collectAsState()
    val bookingState by viewModel.bookingState.collectAsState()

    var currentStep by remember { mutableIntStateOf(1) }
    var selectedSessionType by remember { mutableStateOf("video") }
    var selectedDate by remember { mutableStateOf<LocalDate?>(LocalDate.now().plusDays(1)) }
    var selectedTime by remember { mutableStateOf<LocalTime?>(LocalTime.of(10, 0)) }
    var selectedDuration by remember { mutableIntStateOf(45) }
    var patientNotes by remember { mutableStateOf("") }
    var selectedGoal by remember { mutableStateOf("Weight Management & Fitness") }

    LaunchedEffect(coachId) { viewModel.loadCoach(coachId) }

    LaunchedEffect(bookingState.bookedSession) {
        bookingState.bookedSession?.let { currentStep = 4 }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Book Session", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = WellnessTheme.TealDeep)
                        Text(
                            when (currentStep) {
                                1 -> "Step 1 of 3: Choose Mode & Duration"
                                2 -> "Step 2 of 3: Select Date & Time"
                                3 -> "Step 3 of 3: Review & Confirm"
                                else -> "Booking Confirmed"
                            },
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep > 1 && currentStep < 4) {
                            currentStep -= 1
                        } else {
                            onBackClick()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = WellnessTheme.TealDeep)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = WellnessTheme.TealSurface)
            )
        },
        containerColor = WellnessTheme.TealSurface
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Stepper Header (Steps 1 to 3)
            if (currentStep < 4) {
                BookingStepperBar(currentStep = currentStep)
            }

            when {
                coachState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessTheme.TealDark)
                    }
                }
                coachState.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(coachState.error ?: "Error loading coach details", color = Color.Red)
                    }
                }
                coachState.coach != null -> {
                    val coach = coachState.coach!!

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        AnimatedContent(
                            targetState = currentStep,
                            transitionSpec = {
                                slideInHorizontally { if (targetState > initialState) it else -it } + fadeIn() togetherWith
                                        slideOutHorizontally { if (targetState > initialState) -it else it } + fadeOut()
                            },
                            label = "bookingStep"
                        ) { step ->
                            when (step) {
                                1 -> Step1ModeAndDuration(
                                    coach = coach,
                                    selectedType = selectedSessionType,
                                    selectedDuration = selectedDuration,
                                    onTypeSelected = { selectedSessionType = it },
                                    onDurationSelected = { selectedDuration = it },
                                    onNext = { currentStep = 2 }
                                )
                                2 -> Step2DateAndSegmentedTime(
                                    selectedDate = selectedDate,
                                    selectedTime = selectedTime,
                                    onDateSelected = { selectedDate = it },
                                    onTimeSelected = { selectedTime = it },
                                    onNext = { currentStep = 3 }
                                )
                                3 -> Step3ReviewAndHealthContext(
                                    coach = coach,
                                    sessionType = selectedSessionType,
                                    date = selectedDate,
                                    time = selectedTime,
                                    duration = selectedDuration,
                                    notes = patientNotes,
                                    selectedGoal = selectedGoal,
                                    onGoalChanged = { selectedGoal = it },
                                    onNotesChanged = { patientNotes = it },
                                    isBooking = bookingState.isBooking,
                                    bookingError = bookingState.error,
                                    onConfirmBooking = {
                                        if (selectedDate != null && selectedTime != null) {
                                            val zdt = ZonedDateTime.of(selectedDate, selectedTime, ZoneId.systemDefault())
                                            val isoString = zdt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                                            val fullNotes = "Goal: $selectedGoal\n${patientNotes.trim()}".trim()
                                            viewModel.bookSession(
                                                BookWellnessSessionRequest(
                                                    coachId = coach.id,
                                                    scheduledAt = isoString,
                                                    durationMinutes = selectedDuration,
                                                    sessionType = selectedSessionType,
                                                    notes = fullNotes
                                                )
                                            )
                                        }
                                    }
                                )
                                4 -> Step4Celebration(
                                    coach = coach,
                                    date = selectedDate,
                                    time = selectedTime,
                                    sessionType = selectedSessionType,
                                    sessionId = bookingState.bookedSession?.id ?: "",
                                    onDone = {
                                        onSessionBooked(bookingState.bookedSession?.id ?: "")
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== STEPPER COMPONENT ====================

@Composable
private fun BookingStepperBar(currentStep: Int) {
    Surface(
        color = Color.White,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val steps = listOf("Mode", "Date & Slot", "Confirm")
            steps.forEachIndexed { index, title ->
                val stepNum = index + 1
                val isCompleted = currentStep > stepNum
                val isActive = currentStep == stepNum

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(
                        shape = CircleShape,
                        color = when {
                            isCompleted -> WellnessTheme.SuccessGreen
                            isActive -> WellnessTheme.TealDark
                            else -> Color(0xFFE2E8F0)
                        },
                        modifier = Modifier.size(26.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (isCompleted) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            } else {
                                Text(
                                    "$stepNum",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isActive) Color.White else Color(0xFF64748B)
                                )
                            }
                        }
                    }
                    Text(
                        title,
                        fontSize = 12.sp,
                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                        color = if (isActive) WellnessTheme.TealDeep else Color(0xFF64748B)
                    )
                }

                if (index < steps.size - 1) {
                    Box(
                        modifier = Modifier
                            .width(28.dp)
                            .height(2.dp)
                            .background(if (currentStep > stepNum) WellnessTheme.SuccessGreen else Color(0xFFE2E8F0))
                    )
                }
            }
        }
    }
}

// ==================== STEP 1: MODE & DURATION ====================

@Composable
private fun Step1ModeAndDuration(
    coach: WellnessCoachDetailDto,
    selectedType: String,
    selectedDuration: Int,
    onTypeSelected: (String) -> Unit,
    onDurationSelected: (Int) -> Unit,
    onNext: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Select Consultation Mode", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)

        val modes = listOf(
            Triple("video", "HD Video Consultation", "Private 1-on-1 video call with live posture & form check"),
            Triple("chat", "Dedicated Chat Session", "Real-time diet Q&A and personalized macro audit"),
            Triple("in_person", "In-Person Consultation", "Direct hands-on physical evaluation & consultation"),
            Triple("gym_personal_training", "Gym Personal Training", "Workout session at partner fitness center")
        )

        modes.forEach { (modeKey, title, desc) ->
            val isSelected = selectedType == modeKey
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isSelected) WellnessTheme.TealSurfaceVariant else Color.White,
                border = androidx.compose.foundation.BorderStroke(
                    1.5.dp,
                    if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealBorderLight
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onTypeSelected(modeKey) }
                    .shadow(1.dp, RoundedCornerShape(16.dp), spotColor = WellnessTheme.TealBorder)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealSurface,
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = when (modeKey) {
                                    "video" -> Icons.Default.Videocam
                                    "chat" -> Icons.AutoMirrored.Filled.Chat
                                    "in_person" -> Icons.Default.Person
                                    else -> Icons.Default.FitnessCenter
                                },
                                contentDescription = null,
                                tint = if (isSelected) Color.White else WellnessTheme.TealDark,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = WellnessTheme.TealDeep)
                        Text(desc, fontSize = 11.sp, color = Color(0xFF64748B))
                    }

                    RadioButton(
                        selected = isSelected,
                        onClick = { onTypeSelected(modeKey) },
                        colors = RadioButtonDefaults.colors(selectedColor = WellnessTheme.TealDark)
                    )
                }
            }
        }

        Spacer(Modifier.height(4.dp))
        Text("Session Duration", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            listOf(30 to "30 Mins", 45 to "45 Mins (Recommended)", 60 to "60 Mins").forEach { (duration, label) ->
                val isSelected = selectedDuration == duration
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelected) WellnessTheme.TealDark else Color.White,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealBorder
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onDurationSelected(duration) }
                ) {
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) Color.White else WellnessTheme.TealDeep,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onNext,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark)
        ) {
            Text("Proceed to Date & Slot", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

// ==================== STEP 2: DATE & SEGMENTED TIME ====================

@Composable
private fun Step2DateAndSegmentedTime(
    selectedDate: LocalDate?,
    selectedTime: LocalTime?,
    onDateSelected: (LocalDate) -> Unit,
    onTimeSelected: (LocalTime) -> Unit,
    onNext: () -> Unit
) {
    val next14Days = remember { (0..13).map { LocalDate.now().plusDays(it.toLong()) } }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Choose Date", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)

        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(next14Days) { date ->
                val isSelected = selectedDate == date
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (isSelected) WellnessTheme.TealDark else Color.White,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealBorder
                    ),
                    modifier = Modifier.clickable { onDateSelected(date) }
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            date.format(DateTimeFormatter.ofPattern("EEE")),
                            fontSize = 11.sp,
                            color = if (isSelected) Color(0xFFCCFBF1) else Color(0xFF64748B)
                        )
                        Text(
                            date.format(DateTimeFormatter.ofPattern("d")),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else WellnessTheme.TealDeep
                        )
                        Text(
                            date.format(DateTimeFormatter.ofPattern("MMM")),
                            fontSize = 10.sp,
                            color = if (isSelected) Color.White else Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(4.dp))
        Text("Available Time Slots", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)

        // Segment 1: Morning
        SlotSegmentCard(
            title = "Morning (7:00 AM - 12:00 PM)",
            icon = Icons.Default.WbSunny,
            slots = listOf(LocalTime.of(7, 30), LocalTime.of(9, 0), LocalTime.of(10, 30), LocalTime.of(11, 15)),
            selectedTime = selectedTime,
            onTimeSelected = onTimeSelected
        )

        // Segment 2: Afternoon
        SlotSegmentCard(
            title = "Afternoon (12:00 PM - 5:00 PM)",
            icon = Icons.Default.LightMode,
            slots = listOf(LocalTime.of(12, 30), LocalTime.of(14, 0), LocalTime.of(15, 30), LocalTime.of(16, 45)),
            selectedTime = selectedTime,
            onTimeSelected = onTimeSelected
        )

        // Segment 3: Evening
        SlotSegmentCard(
            title = "Evening (5:00 PM - 9:00 PM)",
            icon = Icons.Default.NightsStay,
            slots = listOf(LocalTime.of(17, 30), LocalTime.of(18, 15), LocalTime.of(19, 0), LocalTime.of(20, 0)),
            selectedTime = selectedTime,
            onTimeSelected = onTimeSelected
        )

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onNext,
            enabled = selectedDate != null && selectedTime != null,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark)
        ) {
            Text("Review Consultation Details", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

@Composable
private fun SlotSegmentCard(
    title: String,
    icon: ImageVector,
    slots: List<LocalTime>,
    selectedTime: LocalTime?,
    onTimeSelected: (LocalTime) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.dp, RoundedCornerShape(16.dp), spotColor = WellnessTheme.TealBorder)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(icon, contentDescription = null, tint = WellnessTheme.TealDark, modifier = Modifier.size(16.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = WellnessTheme.TealDeep)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                slots.forEach { slot ->
                    val isSelected = selectedTime == slot
                    val timeStr = slot.format(DateTimeFormatter.ofPattern("h:mm a"))
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealSurface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealBorder
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onTimeSelected(slot) }
                    ) {
                        Text(
                            text = timeStr,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color.White else WellnessTheme.TealDeep,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

// ==================== STEP 3: REVIEW & HEALTH CONTEXT ====================

@Composable
private fun Step3ReviewAndHealthContext(
    coach: WellnessCoachDetailDto,
    sessionType: String,
    date: LocalDate?,
    time: LocalTime?,
    duration: Int,
    notes: String,
    selectedGoal: String,
    onGoalChanged: (String) -> Unit,
    onNotesChanged: (String) -> Unit,
    isBooking: Boolean,
    bookingError: String?,
    onConfirmBooking: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Summary Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
            modifier = Modifier
                .fillMaxWidth()
                .shadow(2.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Session Summary", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, WellnessTheme.TealMint, CircleShape)
                    ) {
                        if (!coach.profileImageUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current).data(coach.profileImageUrl).build(),
                                contentDescription = coach.name,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(modifier = Modifier.fillMaxSize().background(WellnessTheme.TealSurfaceVariant), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Person, null, tint = WellnessTheme.TealDark)
                            }
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(coach.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = WellnessTheme.TealDeep)
                        Text(coach.headline ?: "Clinical Wellness Expert", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }

                HorizontalDivider(color = Color(0xFFF1F5F9))

                // Detail Rows
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Consultation Mode", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(sessionType.replace("_", " ").uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDark)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Date & Time", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(
                        "${date?.format(DateTimeFormatter.ofPattern("EEE, d MMM"))} at ${time?.format(DateTimeFormatter.ofPattern("h:mm a"))}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = WellnessTheme.TealDeep
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Duration", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text("$duration Minutes", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDeep)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Consultation Fee", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(
                        if ((coach.sessionFee ?: 0.0) > 0) "₹${coach.sessionFee?.toInt()}" else "Free",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WellnessTheme.TealDeep
                    )
                }
            }
        }

        // Auto-Synced Health Context Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorderLight),
            modifier = Modifier
                .fillMaxWidth()
                .shadow(2.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.HealthAndSafety, contentDescription = null, tint = WellnessTheme.TealDark, modifier = Modifier.size(18.dp))
                    Text("Primary Goal & Health Notes", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = WellnessTheme.TealDeep)
                }

                val goals = listOf("Weight Management & Fitness", "PCOS / Hormone Health", "Strength & Posture Rehab", "Stress & Sleep Balance")
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    goals.take(2).forEach { g ->
                        val isSelected = selectedGoal == g
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) WellnessTheme.TealDark else WellnessTheme.TealSurface,
                            modifier = Modifier.weight(1f).clickable { onGoalChanged(g) }
                        ) {
                            Text(
                                g,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else WellnessTheme.TealDeep,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(6.dp)
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = notes,
                    onValueChange = onNotesChanged,
                    placeholder = { Text("Any specific conditions, injuries or dietary preferences...", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = WellnessTheme.TealDark,
                        unfocusedBorderColor = WellnessTheme.TealBorder
                    )
                )
            }
        }

        if (bookingError != null) {
            Text(bookingError, color = Color.Red, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }

        Button(
            onClick = onConfirmBooking,
            enabled = !isBooking,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark)
        ) {
            if (isBooking) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
            } else {
                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Confirm & Book Session", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

// ==================== STEP 4: CELEBRATION SCREEN ====================

@Composable
private fun Step4Celebration(
    coach: WellnessCoachDetailDto,
    date: LocalDate?,
    time: LocalTime?,
    sessionType: String,
    sessionId: String,
    onDone: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Success Ring Animation Icon
        Surface(
            shape = CircleShape,
            color = WellnessTheme.SuccessGreen.copy(alpha = 0.12f),
            modifier = Modifier.size(88.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = WellnessTheme.SuccessGreen, modifier = Modifier.size(52.dp))
            }
        }

        Text("Session Confirmed!", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = WellnessTheme.TealDeep)
        Text(
            "Your appointment with Dr./Coach ${coach.name} has been booked.",
            fontSize = 13.sp,
            color = Color(0xFF64748B),
            textAlign = TextAlign.Center
        )

        // Session Ticket Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            border = androidx.compose.foundation.BorderStroke(1.dp, WellnessTheme.TealBorder),
            modifier = Modifier
                .fillMaxWidth()
                .shadow(3.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Date", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(date?.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")) ?: "", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDeep)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Time", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(time?.format(DateTimeFormatter.ofPattern("h:mm a")) ?: "", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDeep)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Type", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text(sessionType.replace("_", " ").uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WellnessTheme.TealDark)
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = onDone,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = WellnessTheme.TealDark)
        ) {
            Text("Go to My Sessions", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
