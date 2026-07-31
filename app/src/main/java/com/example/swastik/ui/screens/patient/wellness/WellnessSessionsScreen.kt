package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WellnessSessionDto
import com.example.swastik.ui.viewmodel.WellnessSessionsViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSessionsScreen(
    onBackClick: () -> Unit,
    onJoinVideoCall: (sessionId: String, coachName: String) -> Unit,
    viewModel: WellnessSessionsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedFilter by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(selectedFilter) { viewModel.loadSessions(selectedFilter) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Wellness Sessions", fontWeight = FontWeight.SemiBold) },
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
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            // Filter chips
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf(null to "All", "scheduled" to "Upcoming", "completed" to "Completed", "cancelled" to "Cancelled")
                filters.forEach { (value, label) ->
                    FilterChip(
                        selected = selectedFilter == value,
                        onClick = { selectedFilter = value },
                        label = { Text(label, fontSize = 13.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = WellnessGreen,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = WellnessGreen)
                    }
                }
                uiState.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(uiState.error ?: "Something went wrong", color = Color.Gray)
                            Spacer(Modifier.height(12.dp))
                            TextButton(onClick = { viewModel.loadSessions(selectedFilter) }) {
                                Text("Retry", color = WellnessGreen)
                            }
                        }
                    }
                }
                uiState.sessions.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.EventBusy, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No sessions yet", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color.Gray)
                            Text("Book a session with a coach to get started", fontSize = 14.sp, color = Color.LightGray)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(uiState.sessions, key = { it.id }) { session ->
                            SessionCard(
                                session = session,
                                onJoinVideo = {
                                    val coachName = session.coach?.name ?: "Coach"
                                    onJoinVideoCall(session.id, coachName)
                                }
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
private fun SessionCard(
    session: WellnessSessionDto,
    onJoinVideo: () -> Unit
) {
    val statusColor = when (session.status) {
        "scheduled", "confirmed" -> Color(0xFF1565C0)
        "in_progress" -> Color(0xFF2E7D32)
        "completed" -> Color(0xFF4CAF50)
        "cancelled", "no_show" -> Color(0xFFE53935)
        else -> Color.Gray
    }

    val canJoinVideo = session.sessionType == "video" && session.status in listOf("scheduled", "confirmed", "in_progress")

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Top row: Coach + Status
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(WellnessGreenLight)) {
                    if (!session.coach?.profileImageUrl.isNullOrBlank()) {
                        AsyncImage(model = session.coach?.profileImageUrl, contentDescription = null,
                            modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    } else {
                        Icon(Icons.Filled.Person, contentDescription = null,
                            modifier = Modifier.align(Alignment.Center).size(24.dp), tint = WellnessGreen)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(session.coach?.name ?: "Wellness Coach", fontWeight = FontWeight.Bold, fontSize = 15.sp,
                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val typeIcon = when (session.sessionType) {
                            "video" -> Icons.Filled.Videocam
                            "audio" -> Icons.Filled.Phone
                            "chat" -> Icons.Filled.Chat
                            "in_person" -> Icons.Filled.PersonPin
                            else -> Icons.Filled.Videocam
                        }
                        Icon(typeIcon, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color.Gray)
                        Spacer(Modifier.width(4.dp))
                        Text(session.sessionType?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Video",
                            fontSize = 12.sp, color = Color.Gray)
                        Text(" • ${session.durationMinutes ?: 45} min", fontSize = 12.sp, color = Color.Gray)
                    }
                }
                Surface(shape = RoundedCornerShape(6.dp), color = statusColor.copy(alpha = 0.12f)) {
                    Text(
                        session.status?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Scheduled",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = statusColor, fontWeight = FontWeight.SemiBold, fontSize = 12.sp
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF0F0F0))
            Spacer(Modifier.height(10.dp))

            // Date/Time row
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.CalendarMonth, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                val formattedDate = try {
                    val zdt = ZonedDateTime.parse(session.scheduledAt)
                    zdt.format(DateTimeFormatter.ofPattern("EEE, dd MMM yyyy • hh:mm a"))
                } catch (e: Exception) {
                    session.scheduledAt ?: "—"
                }
                Text(formattedDate, fontSize = 13.sp, color = Color(0xFF424242))

                Spacer(Modifier.weight(1f))

                if (session.fee != null && session.fee > 0) {
                    Text("₹${session.fee.toInt()}", fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 15.sp)
                } else {
                    Text("Free", fontWeight = FontWeight.Bold, color = WellnessGreen, fontSize = 15.sp)
                }
            }

            // Session notes
            if (!session.patientNotes.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text("Notes: ${session.patientNotes}", fontSize = 12.sp, color = Color.Gray, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }

            // Coach notes
            if (!session.coachNotes.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF8E1)), shape = RoundedCornerShape(8.dp)) {
                    Row(modifier = Modifier.padding(8.dp)) {
                        Icon(Icons.Filled.Note, contentDescription = null, tint = Color(0xFFF57F17), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Coach: ${session.coachNotes}", fontSize = 12.sp, color = Color(0xFF795548), maxLines = 2)
                    }
                }
            }

            // Join video button
            if (canJoinVideo) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = onJoinVideo,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Filled.Videocam, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Join Video Call", fontWeight = FontWeight.Bold)
                }
            }

            // Session number
            session.sessionNumber?.let { num ->
                Spacer(Modifier.height(6.dp))
                Text("ID: $num", fontSize = 11.sp, color = Color.LightGray)
            }
        }
    }
}
