package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.BookWellnessSessionRequest
import com.example.swastik.data.remote.dto.WellnessCoachDetailDto
import com.example.swastik.ui.viewmodel.WellnessSessionBookingViewModel
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private val StepperGreen = Color(0xFF2E7D32)
private val StepperGray = Color(0xFFE0E0E0)
private val ConfirmedGreen = Color(0xFF4CAF50)
private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

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
    var selectedDate by remember { mutableStateOf<LocalDate?>(null) }
    var selectedTime by remember { mutableStateOf<LocalTime?>(null) }
    var patientNotes by remember { mutableStateOf("") }
    var selectedDuration by remember { mutableIntStateOf(45) }

    LaunchedEffect(coachId) { viewModel.loadCoach(coachId) }

    // When booking is successful, move to step 4 (confirmation)
    LaunchedEffect(bookingState.bookedSession) {
        bookingState.bookedSession?.let { currentStep = 4 }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Book Wellness Session", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WellnessGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Stepper
            BookingStepper(currentStep)

            when {
                coachState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                coachState.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(coachState.error ?: "Error loading coach", color = Color.Red)
                    }
                }
                coachState.coach != null -> {
                    val coach = coachState.coach!!

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                    ) {
                        AnimatedContent(
                            targetState = currentStep,
                            transitionSpec = {
                                slideInHorizontally { if (targetState > initialState) it else -it } + fadeIn() togetherWith
                                        slideOutHorizontally { if (targetState > initialState) -it else it } + fadeOut()
                            },
                            label = "step"
                        ) { step ->
                            when (step) {
                                1 -> Step1SessionType(
                                    coach = coach,
                                    selectedType = selectedSessionType,
                                    selectedDuration = selectedDuration,
                                    onTypeSelected = { selectedSessionType = it },
                                    onDurationSelected = { selectedDuration = it }
                                )
                                2 -> Step2DateTimeSelection(
                                    coach = coach,
                                    selectedDate = selectedDate,
                                    selectedTime = selectedTime,
                                    onDateSelected = { selectedDate = it },
                                    onTimeSelected = { selectedTime = it }
                                )
                                3 -> Step3ReviewConfirm(
                                    coach = coach,
                                    sessionType = selectedSessionType,
                                    date = selectedDate,
                                    time = selectedTime,
                                    duration = selectedDuration,
                                    notes = patientNotes,
                                    onNotesChanged = { patientNotes = it },
                                    isBooking = bookingState.isBooking,
                                    bookingError = bookingState.error
                                )
                                4 -> Step4Confirmation(
                                    session = bookingState.bookedSession,
                                    coachName = coach.name
                                )
                            }
                        }
                    }

                    // Bottom button
                    if (currentStep < 4) {
                        Surface(shadowElevation = 8.dp, color = Color.White) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                if (currentStep > 1) {
                                    OutlinedButton(
                                        onClick = { currentStep-- },
                                        modifier = Modifier.weight(1f).height(50.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = WellnessGreen)
                                    ) {
                                        Text("Back", fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                Button(
                                    onClick = {
                                        when (currentStep) {
                                            1 -> currentStep = 2
                                            2 -> if (selectedDate != null && selectedTime != null) currentStep = 3
                                            3 -> {
                                                val scheduledAt = ZonedDateTime.of(
                                                    selectedDate!!, selectedTime!!, ZoneId.of("Asia/Kolkata")
                                                ).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                                                viewModel.bookSession(
                                                    BookWellnessSessionRequest(
                                                        coachId = coachId,
                                                        scheduledAt = scheduledAt,
                                                        sessionType = selectedSessionType,
                                                        durationMinutes = selectedDuration,
                                                        notes = patientNotes.ifBlank { null }
                                                    )
                                                )
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(if (currentStep > 1) 2f else 1f).height(50.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                    shape = RoundedCornerShape(14.dp),
                                    enabled = when (currentStep) {
                                        2 -> selectedDate != null && selectedTime != null
                                        3 -> !bookingState.isBooking
                                        else -> true
                                    }
                                ) {
                                    if (bookingState.isBooking) {
                                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                    } else {
                                        Text(
                                            when (currentStep) {
                                                1 -> "Select Date & Time"
                                                2 -> "Review Booking"
                                                3 -> "Confirm Booking"
                                                else -> "Next"
                                            },
                                            fontWeight = FontWeight.Bold, fontSize = 16.sp
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // Step 4 done button
                        Surface(shadowElevation = 8.dp, color = Color.White) {
                            Button(
                                onClick = {
                                    bookingState.bookedSession?.id?.let { onSessionBooked(it) }
                                        ?: onBackClick()
                                },
                                modifier = Modifier.fillMaxWidth().padding(16.dp).height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("View My Sessions", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BookingStepper(currentStep: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().background(Color(0xFFFAFAFA)).padding(horizontal = 24.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        val steps = listOf("Type", "Schedule", "Confirm", "Done")
        steps.forEachIndexed { index, label ->
            val step = index + 1
            val isActive = step <= currentStep
            val isCurrent = step == currentStep
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(if (isCurrent) 32.dp else 28.dp)
                        .clip(CircleShape)
                        .background(if (isActive) StepperGreen else StepperGray),
                    contentAlignment = Alignment.Center
                ) {
                    if (step < currentStep) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text("$step", color = if (isActive) Color.White else Color.Gray, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(label, fontSize = 10.sp, color = if (isActive) StepperGreen else Color.Gray, fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal)
            }
        }
    }
}

@Composable
private fun Step1SessionType(
    coach: WellnessCoachDetailDto,
    selectedType: String,
    selectedDuration: Int,
    onTypeSelected: (String) -> Unit,
    onDurationSelected: (Int) -> Unit
) {
    Column(modifier = Modifier.padding(16.dp)) {
        // Coach mini card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = WellnessGreenLight),
            shape = RoundedCornerShape(14.dp)
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(50.dp).clip(CircleShape).background(Color.White)) {
                    if (!coach.profileImageUrl.isNullOrBlank()) {
                        AsyncImage(model = coach.profileImageUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    } else {
                        Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.align(Alignment.Center).size(28.dp), tint = WellnessGreen)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(coach.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(coach.coachTypes?.joinToString(", ") { it.replaceFirstChar { c -> c.titlecase(Locale.getDefault()) } } ?: "Coach",
                        style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Text("Select Session Type", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(12.dp))

        val modes = coach.sessionModes.orEmpty().ifEmpty { listOf("video") }
        modes.forEach { mode ->
            val icon: ImageVector
            val label: String
            val desc: String
            val fee: Double
            when (mode) {
                "video" -> { icon = Icons.Filled.Videocam; label = "Video Session"; desc = "Face-to-face video call"; fee = coach.videoSessionFee ?: coach.sessionFee ?: 0.0 }
                "audio" -> { icon = Icons.Filled.Phone; label = "Audio Call"; desc = "Voice-only call"; fee = coach.sessionFee ?: 0.0 }
                "chat" -> { icon = Icons.AutoMirrored.Filled.Chat; label = "Chat Session"; desc = "Text-based consultation"; fee = coach.sessionFee ?: 0.0 }
                "in_person" -> { icon = Icons.Filled.PersonPin; label = "In-Person"; desc = "Meet at gym or studio"; fee = coach.sessionFee ?: 0.0 }
                else -> { icon = Icons.Filled.Videocam; label = mode; desc = "Consultation session"; fee = coach.sessionFee ?: 0.0 }
            }
            val isSelected = selectedType == mode
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    .clickable { onTypeSelected(mode) }
                    .border(2.dp, if (isSelected) WellnessGreen else Color.Transparent, RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = if (isSelected) WellnessGreenLight else Color.White),
                elevation = CardDefaults.cardElevation(if (isSelected) 2.dp else 1.dp),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(icon, contentDescription = null, tint = if (isSelected) WellnessGreen else Color.Gray, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(label, fontWeight = FontWeight.SemiBold)
                        Text(desc, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                    Text(if (fee > 0) "₹${fee.toInt()}" else "Free", fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 16.sp)
                    if (isSelected) {
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(22.dp))
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Text("Session Duration", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(12.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(30, 45, 60).forEach { duration ->
                val isSelected = selectedDuration == duration
                FilterChip(
                    selected = isSelected,
                    onClick = { onDurationSelected(duration) },
                    label = { Text("$duration min", fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = WellnessGreen,
                        selectedLabelColor = Color.White
                    ),
                    leadingIcon = if (isSelected) {{ Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }} else null
                )
            }
        }
    }
}

@Composable
private fun Step2DateTimeSelection(
    coach: WellnessCoachDetailDto,
    selectedDate: LocalDate?,
    selectedTime: LocalTime?,
    onDateSelected: (LocalDate) -> Unit,
    onTimeSelected: (LocalTime) -> Unit
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Select Date", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(12.dp))

        // Show next 14 days
        val today = LocalDate.now()
        val availableDays = coach.availableDays.orEmpty()

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            (0 until 14).chunked(7).forEach { chunk ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    chunk.forEach { dayOffset ->
                        val date = today.plusDays(dayOffset.toLong())
                        val dayName = date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                        val isDayAvailable = availableDays.isEmpty() || availableDays.any {
                            it.equals(dayName, ignoreCase = true) || dayName.startsWith(it, ignoreCase = true)
                        }
                        val isSelected = selectedDate == date
                        Surface(
                            modifier = Modifier.weight(1f).clickable(enabled = isDayAvailable) { onDateSelected(date) },
                            shape = RoundedCornerShape(10.dp),
                            color = when {
                                isSelected -> WellnessGreen
                                !isDayAvailable -> Color(0xFFF5F5F5)
                                else -> Color.White
                            },
                            border = if (!isSelected && isDayAvailable) androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE0E0E0)) else null,
                            shadowElevation = if (isSelected) 2.dp else 0.dp
                        ) {
                            Column(modifier = Modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                                    fontSize = 10.sp,
                                    color = when { isSelected -> Color.White; !isDayAvailable -> Color.LightGray; else -> Color.Gray }
                                )
                                Text(
                                    "${date.dayOfMonth}",
                                    fontWeight = FontWeight.Bold, fontSize = 16.sp,
                                    color = when { isSelected -> Color.White; !isDayAvailable -> Color.LightGray; else -> Color.Black }
                                )
                                Text(
                                    date.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                                    fontSize = 9.sp,
                                    color = when { isSelected -> Color.White.copy(alpha = 0.8f); !isDayAvailable -> Color.LightGray; else -> Color.Gray }
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Select Time", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(12.dp))

        // Dynamic time slots from coach's available_hours (e.g. ["09:00-12:00", "14:00-17:00"])
        // Falls back to default business hours if coach hasn't configured their schedule.
        val coachHourRanges = remember(coach.availableHours) {
            val raw = coach.availableHours
            val ranges = mutableListOf<Pair<LocalTime, LocalTime>>()
            try {
                when {
                    raw == null || raw.isJsonNull -> {} // no schedule set
                    raw.isJsonArray -> raw.asJsonArray.forEach { el ->
                        val s = el.asString
                        if (s.contains("-")) {
                            val parts = s.split("-")
                            ranges.add(LocalTime.parse(parts[0].trim()) to LocalTime.parse(parts[1].trim()))
                        }
                    }
                    raw.isJsonPrimitive -> raw.asString.split(",").forEach { s ->
                        val t = s.trim()
                        if (t.contains("-")) {
                            val parts = t.split("-")
                            ranges.add(LocalTime.parse(parts[0].trim()) to LocalTime.parse(parts[1].trim()))
                        }
                    }
                }
            } catch (_: Exception) {}
            ranges.ifEmpty {
                // Default fallback: morning + afternoon + evening blocks
                listOf(
                    LocalTime.of(9, 0) to LocalTime.of(12, 0),
                    LocalTime.of(14, 0) to LocalTime.of(17, 0),
                    LocalTime.of(18, 0) to LocalTime.of(20, 0)
                )
            }
        }

        // Generate 30-minute slots only within coach's available ranges
        val timeSlots = remember(coachHourRanges) {
            val slots = mutableListOf<String>()
            coachHourRanges.forEach { (start, end) ->
                var current = start
                while (current.isBefore(end)) {
                    slots.add(current.format(DateTimeFormatter.ofPattern("HH:mm")))
                    current = current.plusMinutes(30)
                }
            }
            slots.ifEmpty {
                listOf("09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
                    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30")
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            timeSlots.chunked(4).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    row.forEach { slot ->
                        val time = LocalTime.parse(slot)
                        val isSelected = selectedTime == time
                        val isPast = selectedDate == LocalDate.now() && time.isBefore(LocalTime.now())
                        Surface(
                            modifier = Modifier.weight(1f).clickable(enabled = !isPast) { onTimeSelected(time) },
                            shape = RoundedCornerShape(10.dp),
                            color = when {
                                isSelected -> WellnessGreen
                                isPast -> Color(0xFFF5F5F5)
                                else -> Color.White
                            },
                            border = if (!isSelected && !isPast) androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE0E0E0)) else null
                        ) {
                            Text(
                                slot,
                                modifier = Modifier.padding(vertical = 10.dp),
                                textAlign = TextAlign.Center,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = when { isSelected -> Color.White; isPast -> Color.LightGray; else -> Color.Black },
                                fontSize = 14.sp
                            )
                        }
                    }
                    // Fill remaining space if row has fewer than 4
                    repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun Step3ReviewConfirm(
    coach: WellnessCoachDetailDto,
    sessionType: String,
    date: LocalDate?,
    time: LocalTime?,
    duration: Int,
    notes: String,
    onNotesChanged: (String) -> Unit,
    isBooking: Boolean,
    bookingError: String?
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Review & Confirm", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = WellnessGreenLight),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Coach info
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White)) {
                        if (!coach.profileImageUrl.isNullOrBlank()) {
                            AsyncImage(model = coach.profileImageUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        } else {
                            Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.align(Alignment.Center).size(24.dp), tint = WellnessGreen)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(coach.name, fontWeight = FontWeight.Bold)
                        Text(coach.coachTypes?.firstOrNull()?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Coach",
                            style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = WellnessGreen.copy(alpha = 0.2f))

                ReviewRow(Icons.Filled.Videocam, "Session Type", sessionType.replaceFirstChar { it.titlecase(Locale.getDefault()) })
                ReviewRow(Icons.Filled.CalendarMonth, "Date", date?.format(DateTimeFormatter.ofPattern("EEE, dd MMM yyyy")) ?: "—")
                ReviewRow(Icons.Filled.AccessTime, "Time", time?.format(DateTimeFormatter.ofPattern("hh:mm a")) ?: "—")
                ReviewRow(Icons.Filled.Timer, "Duration", "$duration minutes")

                val fee = when (sessionType) {
                    "video" -> coach.videoSessionFee ?: coach.sessionFee ?: 0.0
                    else -> coach.sessionFee ?: 0.0
                }
                ReviewRow(Icons.Filled.CurrencyRupee, "Fee", if (fee > 0) "₹${fee.toInt()}" else "Free")
            }
        }

        Spacer(Modifier.height(16.dp))
        OutlinedTextField(
            value = notes,
            onValueChange = onNotesChanged,
            label = { Text("Notes for coach (optional)") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = WellnessGreen, cursorColor = WellnessGreen),
            minLines = 3,
            maxLines = 5
        )

        if (bookingError != null) {
            Spacer(Modifier.height(12.dp))
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)), shape = RoundedCornerShape(8.dp)) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(bookingError, color = Color.Red, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun ReviewRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Text(label, color = Color.Gray, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

@Composable
private fun Step4Confirmation(
    session: com.example.swastik.data.remote.dto.WellnessSessionDto?,
    coachName: String
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

        // Success animation
        Box(
            modifier = Modifier.size(100.dp).clip(CircleShape)
                .background(Brush.radialGradient(listOf(ConfirmedGreen.copy(alpha = 0.2f), Color.Transparent))),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier.size(72.dp).clip(CircleShape).background(ConfirmedGreen),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(40.dp))
            }
        }

        Spacer(Modifier.height(24.dp))
        Text("Session Booked!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
        Spacer(Modifier.height(8.dp))
        Text(
            "Your wellness session with $coachName has been confirmed.",
            textAlign = TextAlign.Center,
            color = Color.Gray, fontSize = 14.sp
        )

        Spacer(Modifier.height(24.dp))

        session?.let { s ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = WellnessGreenLight),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Session Details", fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
                    Spacer(Modifier.height(8.dp))
                    DetailRow("Session ID", s.sessionNumber ?: s.id.take(8))
                    DetailRow("Type", s.sessionType?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Video")
                    DetailRow("Duration", "${s.durationMinutes ?: 45} minutes")
                    DetailRow("Status", s.status?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Scheduled")
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(label, color = Color.Gray, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}
