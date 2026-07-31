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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.CoachPatientDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessSessionDto
import com.example.swastik.ui.viewmodel.CoachDashboardViewModel
import com.google.gson.JsonObject
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val CoachBlue = Color(0xFF1565C0)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoachDashboardScreen(
    onSwitchToPatient: () -> Unit,
    onStartSession: (sessionId: String, patientName: String) -> Unit,
    onBackClick: () -> Unit
) {
    val viewModel: CoachDashboardViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()
    var isAvailable by remember { mutableStateOf(false) }
    var isAcceptingClients by remember { mutableStateOf(false) }

    val today = remember { LocalDate.now() }
    val formatter = remember { DateTimeFormatter.ofPattern("MMM dd, yyyy") }

    val upcomingSessions = uiState.sessions
        .filter { session -> sessionDate(session.scheduledAt)?.let { !it.isBefore(today) } == true }
        .sortedBy { it.scheduledAt }
    val todaySessionsCount = upcomingSessions.count { sessionDate(it.scheduledAt) == today }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Coach Dashboard", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onSwitchToPatient) {
                        Icon(Icons.Filled.SwapHoriz, contentDescription = "Switch Role")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CoachBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF4F6F9))
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = CoachBlue
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    uiState.successMessage?.let { message ->
                        item { MessageCard(message, isError = false, onDismiss = viewModel::clearMessages) }
                    }
                    uiState.error?.let { message ->
                        item {
                            MessageCard(
                                message = message,
                                isError = true,
                                onDismiss = viewModel::clearMessages,
                                onRetry = viewModel::load
                            )
                        }
                    }

                    item { RoleSwitcherBanner(onSwitchToPatient = onSwitchToPatient) }

                    item {
                        CoachHeaderCard(
                            profile = uiState.profile,
                            isAvailable = isAvailable,
                            isAcceptingClients = isAcceptingClients,
                            isUpdating = uiState.isUpdatingAvailability,
                            onToggleAvailable = { available ->
                                isAvailable = available
                                viewModel.toggleAvailability(available, isAcceptingClients)
                            },
                            onToggleAccepting = { accepting ->
                                isAcceptingClients = accepting
                                viewModel.toggleAvailability(isAvailable, accepting)
                            }
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CoachStatCard(
                                title = "Today's Sessions",
                                value = todaySessionsCount.toString(),
                                icon = Icons.Filled.Event,
                                color = CoachBlue,
                                modifier = Modifier.weight(1f)
                            )
                            CoachStatCard(
                                title = "Active Clients",
                                value = uiState.patients.size.toString(),
                                icon = Icons.Filled.People,
                                color = WellnessGreen,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Today's Schedule", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(today.format(formatter), fontSize = 14.sp, color = Color.Gray)
                        }
                    }

                    if (upcomingSessions.isEmpty()) {
                        item {
                            EmptyStateCard(
                                icon = Icons.Filled.EventBusy,
                                title = "No sessions scheduled",
                                subtitle = "Sessions with your patients will show up here"
                            )
                        }
                    } else {
                        items(upcomingSessions, key = { it.id }) { session ->
                            SessionItemCard(session = session, onStartSession = onStartSession)
                        }
                    }

                    item {
                        Spacer(Modifier.height(8.dp))
                        Text("My Clients", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }

                    if (uiState.patients.isEmpty()) {
                        item {
                            EmptyStateCard(
                                icon = Icons.Filled.People,
                                title = "No clients yet",
                                subtitle = "Patients assigned to you will appear here"
                            )
                        }
                    } else {
                        items(uiState.patients, key = { it.id ?: it.userId ?: it.name ?: it.hashCode().toString() }) { patient ->
                            val patientId = patient.id ?: patient.userId
                            if (patientId != null) {
                                val isSelected = uiState.selectedPatientId == patientId
                                PatientCard(
                                    patient = patient,
                                    isSelected = isSelected,
                                    onSelect = { viewModel.selectPatient(patientId) }
                                )
                                if (isSelected) {
                                    AnalyticsCard(analytics = uiState.analytics)
                                }
                            }
                        }
                    }

                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun RoleSwitcherBanner(onSwitchToPatient: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSwitchToPatient() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(CoachBlue.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Autorenew, contentDescription = null, tint = CoachBlue)
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Switch to Patient View", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("Access your personal wellness hub", fontSize = 12.sp, color = Color.Gray)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Gray)
        }
    }
}

@Composable
private fun CoachHeaderCard(
    profile: WellnessCoachDto?,
    isAvailable: Boolean,
    isAcceptingClients: Boolean,
    isUpdating: Boolean,
    onToggleAvailable: (Boolean) -> Unit,
    onToggleAccepting: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(CoachBlue.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!profile?.profileImageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = profile?.profileImageUrl,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            profile?.name?.take(1)?.uppercase() ?: "C",
                            fontWeight = FontWeight.Bold,
                            color = CoachBlue,
                            fontSize = 22.sp
                        )
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(profile?.name ?: "Coach Dashboard", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    profile?.headline?.let {
                        Text(it, fontSize = 13.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        profile?.rating?.let {
                            Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFF9A825), modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(2.dp))
                            Text(String.format("%.1f", it), fontSize = 12.sp, color = Color.Gray)
                        }
                        profile?.city?.let {
                            if (profile.rating != null) Text(" • ", fontSize = 12.sp, color = Color.Gray)
                            Icon(Icons.Filled.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(12.dp))
                            Text(it, fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                    profile?.sessionFee?.let {
                        Spacer(Modifier.height(2.dp))
                        Text("₹${it.toInt()} / session", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = CoachBlue)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF0F0F0))
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Available", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Accept new session requests", fontSize = 12.sp, color = Color.Gray)
                }
                if (isUpdating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = CoachBlue
                    )
                    Spacer(Modifier.width(12.dp))
                }
                Switch(
                    checked = isAvailable,
                    onCheckedChange = onToggleAvailable,
                    colors = SwitchDefaults.colors(checkedTrackColor = CoachBlue)
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Accepting New Clients", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Show in search & accept bookings", fontSize = 12.sp, color = Color.Gray)
                }
                Switch(
                    checked = isAcceptingClients,
                    onCheckedChange = onToggleAccepting,
                    colors = SwitchDefaults.colors(checkedTrackColor = WellnessGreen)
                )
            }
        }
    }
}

@Composable
private fun CoachStatCard(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(12.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 28.sp)
            Text(title, fontSize = 13.sp, color = Color.Gray)
        }
    }
}

@Composable
private fun SessionItemCard(session: WellnessSessionDto, onStartSession: (String, String) -> Unit) {
    val patientName = session.patient?.name ?: "Patient"
    val startable = session.status == "scheduled" || session.status == "confirmed" || session.status == "in_progress"
    val statusColor = when (session.status) {
        "scheduled", "confirmed" -> CoachBlue
        "in_progress" -> WellnessGreen
        "completed" -> Color(0xFF4CAF50)
        "cancelled", "no_show" -> Color(0xFFE53935)
        else -> Color.Gray
    }
    val timeParts = formatSessionTime(session.scheduledAt).split(" ")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp)) {
                Text(timeParts[0], fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (timeParts.size > 1) Text(timeParts[1], fontSize = 12.sp, color = Color.Gray)
            }

            Divider(
                modifier = Modifier
                    .height(40.dp)
                    .width(1.dp)
                    .padding(horizontal = 8.dp),
                color = Color.LightGray
            )

            Spacer(Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(patientName, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    session.sessionType?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Session",
                    fontSize = 13.sp,
                    color = CoachBlue
                )
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.12f),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Text(
                        session.status?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Scheduled",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        color = statusColor,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp
                    )
                }
            }

            if (startable) {
                IconButton(
                    onClick = { onStartSession(session.id, patientName) },
                    modifier = Modifier
                        .size(40.dp)
                        .background(CoachBlue, CircleShape)
                ) {
                    Icon(Icons.Filled.Videocam, contentDescription = "Start Session", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
private fun PatientCard(patient: CoachPatientDto, isSelected: Boolean, onSelect: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE0E0E0)),
                contentAlignment = Alignment.Center
            ) {
                if (!patient.profileImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = patient.profileImageUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        patient.name?.take(1)?.uppercase() ?: "?",
                        fontWeight = FontWeight.Bold,
                        color = Color.DarkGray,
                        fontSize = 18.sp
                    )
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(patient.name ?: "Patient", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    listOfNotNull(
                        patient.city,
                        "${patient.totalSessions} sessions",
                        "${patient.activePlans} plans"
                    ).joinToString(" • "),
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }
            Icon(
                if (isSelected) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = if (isSelected) CoachBlue else Color.Gray
            )
        }
    }
}

@Composable
private fun AnalyticsCard(analytics: JsonObject?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Insights, contentDescription = null, tint = CoachBlue, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Patient Analytics", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = CoachBlue)
            }
            Spacer(Modifier.height(12.dp))

            val metrics = analytics?.get("metrics")?.takeIf { it.isJsonObject }
            if (metrics == null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = CoachBlue
                    )
                    Spacer(Modifier.width(12.dp))
                    Text("Loading analytics...", fontSize = 13.sp, color = Color.Gray)
                }
            } else {
                val metricList = listOf(
                    Metric("Workouts", analytics.metricInt("workoutsCompleted").toString(), Icons.Filled.FitnessCenter, CoachBlue),
                    Metric("Active Days", analytics.metricInt("activeDays").toString(), Icons.Filled.EventAvailable, WellnessGreen),
                    Metric("Minutes", analytics.metricInt("totalMinutes").toString(), Icons.Filled.Schedule, CoachBlue),
                    Metric("Calories", String.format("%,d", analytics.metricInt("totalCalories")), Icons.Filled.LocalFireDepartment, Color(0xFFEF6C00)),
                    Metric("Avg Steps", String.format("%,d", analytics.metricInt("avgDailySteps")), Icons.Filled.DirectionsWalk, WellnessGreen),
                    Metric("Avg Sleep", formatMinutes(analytics.metricInt("avgSleepMinutes")), Icons.Filled.Bedtime, CoachBlue),
                    Metric("Current Streak", "${analytics.metricInt("currentStreak")}d", Icons.Filled.LocalFireDepartment, Color(0xFFEF6C00)),
                    Metric("Longest Streak", "${analytics.metricInt("longestStreak")}d", Icons.Filled.EmojiEvents, WellnessGreen)
                )
                metricList.chunked(2).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        row.forEach { metric ->
                            MetricTile(metric = metric, modifier = Modifier.weight(1f))
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(10.dp))
                }

                Spacer(Modifier.height(2.dp))
                HorizontalDivider(color = Color(0xFFF0F0F0))
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.FitnessCenter, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Recent workouts: ${analytics.recentWorkoutsCount()}",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = Color(0xFF424242)
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricTile(metric: Metric, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F9FB))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(metric.icon, contentDescription = null, tint = metric.color, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(metric.label, fontSize = 11.sp, color = Color.Gray)
            }
            Spacer(Modifier.height(6.dp))
            Text(
                metric.value,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun EmptyStateCard(icon: ImageVector, title: String, subtitle: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(12.dp))
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color.Gray)
            Text(subtitle, fontSize = 12.sp, color = Color.LightGray)
        }
    }
}

@Composable
private fun MessageCard(
    message: String,
    isError: Boolean,
    onDismiss: () -> Unit,
    onRetry: (() -> Unit)? = null
) {
    val container = if (isError) Color(0xFFFDECEA) else Color(0xFFE8F5E9)
    val content = if (isError) Color(0xFFC62828) else WellnessGreen
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = container)
    ) {
        Row(
            modifier = Modifier.padding(start = 16.dp, top = 8.dp, end = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                if (isError) Icons.Filled.ErrorOutline else Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = content,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                message,
                modifier = Modifier.weight(1f),
                color = content,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (isError && onRetry != null) {
                TextButton(onClick = onRetry) {
                    Text("Retry", color = content, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Filled.Close, contentDescription = "Dismiss", tint = content, modifier = Modifier.size(16.dp))
            }
        }
    }
}

private fun sessionDate(scheduledAt: String?): LocalDate? {
    if (scheduledAt.isNullOrBlank()) return null
    return try {
        ZonedDateTime.parse(scheduledAt).toLocalDate()
    } catch (e: Exception) {
        null
    }
}

private fun formatSessionTime(scheduledAt: String?): String {
    if (scheduledAt.isNullOrBlank()) return "--:--"
    return try {
        ZonedDateTime.parse(scheduledAt).format(DateTimeFormatter.ofPattern("hh:mm a"))
    } catch (e: Exception) {
        "--:--"
    }
}

private fun formatMinutes(totalMinutes: Int): String {
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
}

private fun JsonObject?.metricInt(key: String): Int {
    val metrics = this?.get("metrics")?.takeIf { it.isJsonObject }?.asJsonObject ?: return 0
    val element = metrics.get(key) ?: return 0
    return if (element.isJsonPrimitive) {
        try {
            element.asJsonPrimitive.asInt
        } catch (e: Exception) {
            0
        }
    } else 0
}

private fun JsonObject?.recentWorkoutsCount(): Int {
    val element = this?.get("recentWorkouts") ?: return 0
    return if (element.isJsonArray) element.asJsonArray.size() else 0
}

private data class Metric(
    val label: String,
    val value: String,
    val icon: ImageVector,
    val color: Color
)
