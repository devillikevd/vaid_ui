package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.FitnessClassDto
import com.example.swastik.ui.viewmodel.GymClassScheduleViewModel
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GymClassScheduleScreen(
    centerId: String,
    centerName: String,
    onBackClick: () -> Unit
) {
    val viewModel: GymClassScheduleViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(centerId) {
        viewModel.load(centerId, centerName)
    }

    LaunchedEffect(uiState.bookingMessage) {
        uiState.bookingMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearBookingMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(centerName.ifBlank { "Class Schedule" }, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Class Schedule", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
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
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAF8))
        ) {
            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                uiState.error != null -> {
                    ErrorCard(
                        message = uiState.error ?: "Something went wrong",
                        onRetry = { viewModel.load(centerId, centerName) }
                    )
                }
                uiState.classes.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.EventBusy, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                            Spacer(Modifier.height(8.dp))
                            Text("No classes found", fontWeight = FontWeight.Bold, color = Color.Gray)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.classes) { gymClass ->
                            ClassCard(
                                gymClass = gymClass,
                                isBooking = uiState.isBooking,
                                onBook = { gymClass.id?.let { viewModel.bookClass(it) } }
                            )
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorCard(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(8.dp))
                Text(message, color = Color.Gray, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen)) {
                    Text("Retry")
                }
            }
        }
    }
}

@Composable
private fun ClassCard(
    gymClass: FitnessClassDto,
    isBooking: Boolean,
    onBook: () -> Unit
) {
    val capacity = gymClass.capacity ?: 0
    val bookedCount = gymClass.bookedCount ?: 0
    val spotsLeft = capacity - bookedCount
    val isFull = spotsLeft <= 0
    val price = gymClass.price ?: 0.0
    val isActive = gymClass.status.isNullOrBlank() || gymClass.status.equals("active", ignoreCase = true)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(
                    modifier = Modifier
                        .width(64.dp)
                        .background(WellnessGreenLight, RoundedCornerShape(12.dp))
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(formatTime(gymClass.startsAt), fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = WellnessGreen)
                    Text(formatTime(gymClass.endsAt), fontSize = 12.sp, color = Color.Gray)
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        gymClass.title ?: "Class",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (!gymClass.classType.isNullOrBlank()) {
                            Surface(shape = RoundedCornerShape(6.dp), color = WellnessGreen.copy(alpha = 0.12f)) {
                                Text(
                                    gymClass.classType.replaceFirstChar { it.uppercase() },
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = WellnessGreen
                                )
                            }
                        }
                        if (!gymClass.level.isNullOrBlank()) {
                            Surface(shape = RoundedCornerShape(6.dp), color = getLevelColor(gymClass.level).copy(alpha = 0.15f)) {
                                Text(
                                    gymClass.level.replaceFirstChar { it.uppercase() },
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = getLevelColor(gymClass.level)
                                )
                            }
                        }
                    }
                }
            }

            if (!gymClass.description.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(gymClass.description, fontSize = 12.sp, color = Color.Gray, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }

            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = Color(0xFFF0F0F0))
            Spacer(Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.CalendarMonth, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(formatDateTime(gymClass.startsAt), fontSize = 13.sp, color = Color(0xFF424242))
            }

            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "$bookedCount/$capacity booked",
                    fontSize = 12.sp,
                    color = if (spotsLeft <= 3) Color.Red else Color.Gray,
                    fontWeight = if (spotsLeft <= 3) FontWeight.Bold else FontWeight.Normal
                )
                if (spotsLeft in 1..3) {
                    Spacer(Modifier.width(4.dp))
                    Text("• $spotsLeft spots left", fontSize = 12.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.weight(1f))
                if (price > 0) {
                    Text("₹${price.toInt()}", fontWeight = FontWeight.Bold, color = WellnessGreen)
                } else {
                    Text("FREE", fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 13.sp)
                }
            }

            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (!gymClass.status.isNullOrBlank()) {
                    Surface(shape = RoundedCornerShape(6.dp), color = getStatusColor(gymClass.status).copy(alpha = 0.12f)) {
                        Text(
                            gymClass.status.replaceFirstChar { it.uppercase() },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = getStatusColor(gymClass.status)
                        )
                    }
                }
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = onBook,
                    enabled = !isFull && !isBooking && isActive,
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    if (isBooking) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = Color.White)
                        Spacer(Modifier.width(6.dp))
                        Text("Booking...", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Text(if (isFull) "Full" else "Book", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

private fun formatDateTime(raw: String?): String {
    if (raw.isNullOrBlank()) return "—"
    return runCatching {
        val formatter = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy • hh:mm a")
        val parsed: java.time.temporal.TemporalAccessor? = runCatching { OffsetDateTime.parse(raw) }.getOrNull()
            ?: runCatching { LocalDateTime.parse(raw) }.getOrNull()
        parsed?.let { formatter.format(it) } ?: raw
    }.getOrElse { raw }
}

private fun formatTime(raw: String?): String {
    if (raw.isNullOrBlank()) return "--:--"
    return runCatching {
        val formatter = DateTimeFormatter.ofPattern("hh:mm a")
        val parsed: java.time.temporal.TemporalAccessor? = runCatching { OffsetDateTime.parse(raw) }.getOrNull()
            ?: runCatching { LocalDateTime.parse(raw) }.getOrNull()
        parsed?.let { formatter.format(it) } ?: raw
    }.getOrElse { raw }
}

private fun getLevelColor(level: String): Color = when (level.lowercase()) {
    "beginner" -> Color(0xFF4CAF50)
    "intermediate" -> Color(0xFFFFA726)
    "advanced" -> Color(0xFFF44336)
    else -> Color(0xFF2196F3)
}

private fun getStatusColor(status: String): Color = when (status.lowercase()) {
    "active", "upcoming", "scheduled", "open" -> Color(0xFF2E7D32)
    "full" -> Color(0xFFF44336)
    "cancelled", "canceled", "closed" -> Color(0xFFE53935)
    else -> Color(0xFF2196F3)
}
