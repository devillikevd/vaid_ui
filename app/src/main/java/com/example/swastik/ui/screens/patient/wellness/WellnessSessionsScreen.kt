package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.ui.draw.drawBehind

import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.swastik.data.remote.dto.WellnessSessionDto
import com.example.swastik.ui.viewmodel.WellnessSessionsViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

enum class WellnessFilter {
    ALL, UPCOMING, COMPLETED, CANCELLED
}

@Suppress("UNUSED_PARAMETER")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessSessionsScreen(
    onBackClick: () -> Unit,
    onJoinVideoCall: (sessionId: String, coachName: String) -> Unit,
    onChatWithCoach: (sessionId: String, coachName: String) -> Unit = { _, _ -> },
    onBookNewSession: () -> Unit = {},
    onCoachDetailClick: (coachId: String) -> Unit = {},
    viewModel: WellnessSessionsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedFilter by remember { mutableStateOf(WellnessFilter.ALL) }
    val colorScheme = MaterialTheme.colorScheme

    // Load sessions whenever filter tab changes
    val statusQuery = remember(selectedFilter) {
        when (selectedFilter) {
            WellnessFilter.ALL -> null
            WellnessFilter.UPCOMING -> "scheduled"
            WellnessFilter.COMPLETED -> "completed"
            WellnessFilter.CANCELLED -> "cancelled"
        }
    }

    LaunchedEffect(statusQuery) {
        viewModel.loadSessions(statusQuery)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wellness Sessions", fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
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
            WellnessFilterChipsRow(selectedFilter = selectedFilter, onFilterSelected = { selectedFilter = it })
            Spacer(modifier = Modifier.height(16.dp))

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                uiState.error != null && uiState.sessions.isEmpty() -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            uiState.error ?: "Something went wrong",
                            fontSize = 16.sp,
                            color = colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadSessions(statusQuery) },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Retry")
                        }
                    }
                }
                uiState.sessions.isEmpty() -> EmptyWellnessView(
                    selectedFilter = selectedFilter,
                    onBookClick = onBookNewSession
                )
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp, start = 8.dp, end = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(uiState.sessions, key = { it.id }) { session ->
                            val isLast = session == uiState.sessions.last()
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .drawBehind {
                                        if (!isLast) {
                                            val strokeWidth = 1.5.dp.toPx()
                                            val xOffset = 13.dp.toPx()
                                            val yStart = 24.dp.toPx()
                                            drawLine(
                                                color = colorScheme.outlineVariant.copy(alpha = 0.5f),
                                                start = Offset(xOffset, yStart),
                                                end = Offset(xOffset, size.height + 16.dp.toPx()),
                                                strokeWidth = strokeWidth
                                            )
                                        }
                                    }
                            ) {
                                Row(modifier = Modifier.fillMaxWidth()) {
                                    // Timeline Node
                                    val status = session.status?.lowercase() ?: ""
                                    Box(
                                        modifier = Modifier
                                            .padding(top = 28.dp, start = 8.dp)
                                            .size(10.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when(status) {
                                                    "completed" -> Color(0xFF4CAF50)
                                                    "cancelled", "no_show" -> colorScheme.error
                                                    else -> MaterialTheme.colorScheme.primary
                                                }
                                            )
                                    )

                                    Spacer(modifier = Modifier.width(16.dp))

                                    Box(modifier = Modifier.weight(1f)) {
                                        WellnessSessionCard(
                                            session = session,
                                            onJoinVideo = {
                                                val coachName = session.coach?.name ?: "Wellness Coach"
                                                onJoinVideoCall(session.id, coachName)
                                            },
                                            onChatClick = {
                                                val coachName = session.coach?.name ?: "Wellness Coach"
                                                onChatWithCoach(session.id, coachName)
                                            },
                                            onBookAgain = onBookNewSession
                                        )
                                    }
                                }
                            }
                        }
                        item { Spacer(modifier = Modifier.height(20.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun WellnessFilterChipsRow(selectedFilter: WellnessFilter, onFilterSelected: (WellnessFilter) -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    LazyRow(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(WellnessFilter.entries) { filter ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                label = {
                    Text(
                        text = when (filter) {
                            WellnessFilter.ALL -> "All"
                            WellnessFilter.UPCOMING -> "Upcoming"
                            WellnessFilter.COMPLETED -> "Completed"
                            WellnessFilter.CANCELLED -> "Cancelled"
                        },
                        fontSize = 13.sp,
                        maxLines = 1
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.surface,
                    containerColor = colorScheme.surface,
                    labelColor = colorScheme.onSurfaceVariant
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = colorScheme.outline.copy(alpha = 0.5f),
                    selectedBorderColor = MaterialTheme.colorScheme.primary,
                    enabled = true,
                    selected = selectedFilter == filter
                )
            )
        }
    }
}

@Composable
private fun WellnessSessionCard(
    session: WellnessSessionDto,
    onJoinVideo: () -> Unit,
    onChatClick: () -> Unit,
    onBookAgain: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val status = session.status?.lowercase() ?: ""
    val isUpcoming = status in listOf("scheduled", "confirmed", "in_progress")
    val isInProgress = status == "in_progress"
    val isCompleted = status == "completed"
    val isCancelled = status in listOf("cancelled", "no_show")

    val coachName = session.coach?.name ?: "Wellness Coach"
    val coachSpecialty = session.coach?.headline ?: ""
    val isVideo = session.sessionType?.lowercase()?.contains("video") == true
    val isChat = session.sessionType?.lowercase()?.contains("chat") == true

    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val textColorPrimary = if (isDark) Color(0xFFF8FAFC) else Color(0xFF1E293B)
    val textColorSecondary = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569)

    // Format date
    val formattedDate = try {
        val zdt = ZonedDateTime.parse(session.scheduledAt)
        zdt.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
    } catch (_: Exception) {
        session.scheduledAt ?: "—"
    }

    // Format time
    val formattedTime = try {
        val zdt = ZonedDateTime.parse(session.scheduledAt)
        zdt.format(DateTimeFormatter.ofPattern("hh:mm a"))
    } catch (_: Exception) {
        "${session.durationMinutes ?: 45} min"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            // Status & Type chips row
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                val (bgColor, txtColor, statusText) = when {
                    isCompleted -> Triple(MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.secondary, "Completed")
                    isInProgress -> Triple(Color(0xFFE8F5E9), Color(0xFF2E7D32), "In Progress")
                    isUpcoming -> Triple(Color(0xFFE3F2FD), MaterialTheme.colorScheme.primary, "Upcoming")
                    isCancelled -> Triple(MaterialTheme.colorScheme.errorContainer, MaterialTheme.colorScheme.error, "Cancelled")
                    else -> Triple(colorScheme.surfaceVariant, colorScheme.onSurfaceVariant, status.replaceFirstChar { it.uppercase() })
                }
                Box(modifier = Modifier.background(bgColor, RoundedCornerShape(8.dp)).padding(horizontal = 12.dp, vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (isInProgress) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF4CAF50))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                        }
                        Text(text = statusText, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = txtColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.background(colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 6.dp)) {
                    Icon(
                        when {
                            isVideo -> Icons.Outlined.VideoCall
                            isChat -> Icons.Outlined.ChatBubbleOutline
                            else -> Icons.Outlined.Person
                        },
                        contentDescription = null, tint = colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = when {
                            isVideo -> "Video Session"
                            isChat -> "Chat Session"
                            else -> "In-Person"
                        },
                        fontSize = 12.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            // Coach avatar + name
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                        .border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Outlined.FitnessCenter, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = coachName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = textColorPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (coachSpecialty.isNotEmpty()) Text(text = coachSpecialty, fontSize = 13.sp, color = textColorSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (session.fee != null && session.fee > 0) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CurrencyRupee, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "₹${session.fee.toInt()}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = colorScheme.outline.copy(alpha = 0.35f))
            Spacer(modifier = Modifier.height(16.dp))

            // Date & Time row
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = formattedDate, fontSize = 13.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.AccessTime, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = formattedTime, fontSize = 13.sp, color = colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }

            // Cancelled info
            if (isCancelled) {
                Spacer(modifier = Modifier.height(16.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFFFF1F0),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFFFA39E).copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Cancel, contentDescription = null, tint = Color(0xFFCF1322), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Session Cancelled",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFCF1322)
                            )
                        }
                    }
                }
            }

            // Upcoming actions
            if (isUpcoming) {
                Spacer(modifier = Modifier.height(16.dp))

                if (isVideo || isChat) {
                    Button(
                        onClick = if (isVideo) onJoinVideo else onChatClick,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isInProgress) Color(0xFF2E7D32) else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(
                            if (isVideo) Icons.Default.VideoCall else Icons.Default.ChatBubbleOutline,
                            contentDescription = null, modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (isVideo) {
                                if (isInProgress) "Resume Video Session" else "Start Video Session"
                            } else {
                                if (isInProgress) "Continue Chat" else "Start Chat Session"
                            },
                            fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis
                        )
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
                            Icon(Icons.Default.EventAvailable, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "In-person session scheduled",
                                fontSize = 13.sp,
                                color = colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Medium,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Completed actions
            if (isCompleted) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // View Guidance (instead of Prescription)
                    OutlinedButton(
                        onClick = onChatClick,
                        modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = ButtonDefaults.outlinedButtonBorder.copy(brush = SolidColor(MaterialTheme.colorScheme.primary)),
                        contentPadding = PaddingValues(horizontal = 4.dp)
                    ) {
                        Icon(Icons.Outlined.Description, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Guidance",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    // Rate Coach (same as Rate Doctor)
                    Button(
                        onClick = { /* Rate coach placeholder */ },
                        modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        contentPadding = PaddingValues(horizontal = 4.dp)
                    ) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "Rate Coach",
                            color = Color.White,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onBookAgain,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = SolidColor(MaterialTheme.colorScheme.primary)),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    Icon(Icons.Outlined.Replay, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Book Again",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Cancelled: Book Again
            if (isCancelled) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onBookAgain,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = SolidColor(MaterialTheme.colorScheme.primary)),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    Icon(Icons.Outlined.Replay, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Book Again",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyWellnessView(selectedFilter: WellnessFilter, onBookClick: () -> Unit = {}) {
    val colorScheme = MaterialTheme.colorScheme
    Column(modifier = Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        WellnessEmptyIcon()
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = when (selectedFilter) {
                WellnessFilter.ALL -> "No Wellness Sessions Yet"
                WellnessFilter.UPCOMING -> "No Upcoming Sessions"
                WellnessFilter.COMPLETED -> "No Completed Sessions"
                WellnessFilter.CANCELLED -> "No Cancelled Sessions"
            },
            fontSize = 20.sp, fontWeight = FontWeight.Bold, color = colorScheme.onSurface, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = when (selectedFilter) {
                WellnessFilter.ALL -> "Book your first session with a wellness coach"
                WellnessFilter.UPCOMING -> "You don't have any scheduled sessions"
                WellnessFilter.COMPLETED -> "Your completed sessions will appear here"
                WellnessFilter.CANCELLED -> "No cancelled sessions to show"
            },
            fontSize = 14.sp, color = colorScheme.onSurfaceVariant, textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onBookClick,
            modifier = Modifier.fillMaxWidth().heightIn(min = 50.dp),
            shape = RoundedCornerShape(25.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Book Wellness Session", fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun WellnessEmptyIcon() {
    Box(modifier = Modifier.size(140.dp), contentAlignment = Alignment.Center) {
        val primaryColor = MaterialTheme.colorScheme.primary
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(color = primaryColor, radius = 5.dp.toPx(), center = Offset(size.width * 0.85f, size.height * 0.15f))
            drawCircle(color = primaryColor, radius = 3.dp.toPx(), center = Offset(size.width * 0.75f, size.height * 0.22f))
            drawCircle(color = primaryColor, radius = 4.dp.toPx(), center = Offset(size.width * 0.12f, size.height * 0.7f))
        }
        Box(modifier = Modifier.size(120.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Box(modifier = Modifier.size(90.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.FitnessCenter, contentDescription = null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(45.dp))
            }
        }
    }
}
