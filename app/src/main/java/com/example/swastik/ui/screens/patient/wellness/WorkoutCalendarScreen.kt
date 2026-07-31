package com.example.swastik.ui.screens.patient.wellness

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.ui.viewmodel.WorkoutCalendarViewModel
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)
private val StreakOrange = Color(0xFFFF6D00)
private val StreakGold = Color(0xFFFFC107)

private data class WorkoutLogUi(
    val id: String,
    val date: LocalDate?,
    val planTitle: String?,
    val sessionTitle: String?,
    val durationMinutes: Int?,
    val calories: Int?,
    val intensity: String?
)

private data class CoachingSessionUi(
    val id: String,
    val scheduledAt: String?,
    val sessionType: String?,
    val status: String?,
    val coachName: String?,
    val coachImageUrl: String?
)

private data class ActivePlanUi(
    val id: String,
    val title: String?
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutCalendarScreen(onBackClick: () -> Unit) {
    val viewModel: WorkoutCalendarViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()

    val today = remember { LocalDate.now() }
    var selectedMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf<LocalDate?>(today) }

    val workoutLogs = remember(uiState.calendar) { parseWorkoutLogs(uiState.calendar) }
    val recentLogs = remember(workoutLogs) { workoutLogs.sortedByDescending { it.date } }
    val coachingSessions = remember(uiState.calendar) { parseCoachingSessions(uiState.calendar) }
    val activePlans = remember(uiState.calendar) { parseActivePlans(uiState.calendar) }
    val workoutDates = remember(workoutLogs) { workoutLogs.mapNotNull { it.date }.toSet() }
    val workoutsCompleted = remember(uiState.progress) {
        uiState.progress?.obj("metrics")?.int("workoutsCompleted") ?: 0
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Workout Calendar", fontWeight = FontWeight.Bold) },
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
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = WellnessGreen)
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(Color(0xFFF8FAF8)),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    uiState.error?.let { error ->
                        item { ErrorRetryCard(error) { viewModel.refresh() } }
                    }

                    item {
                        StreakBanner(
                            currentStreak = uiState.streaks?.currentStreak ?: 0,
                            longestStreak = uiState.streaks?.longestStreak ?: 0,
                            activeDays = uiState.streaks?.activeDaysTotal ?: 0,
                            workoutsCompleted = workoutsCompleted
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = { selectedMonth = selectedMonth.minusMonths(1) }) {
                                Icon(Icons.Filled.ChevronLeft, contentDescription = "Previous month")
                            }
                            Text(
                                "${selectedMonth.month.getDisplayName(TextStyle.FULL, Locale.getDefault())} ${selectedMonth.year}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                            IconButton(onClick = { selectedMonth = selectedMonth.plusMonths(1) }) {
                                Icon(Icons.Filled.ChevronRight, contentDescription = "Next month")
                            }
                        }
                    }

                    item {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun").forEach { day ->
                                Text(
                                    day,
                                    modifier = Modifier.weight(1f),
                                    textAlign = TextAlign.Center,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.Gray
                                )
                            }
                        }
                    }

                    item {
                        val firstOfMonth = selectedMonth.atDay(1)
                        val daysInMonth = selectedMonth.lengthOfMonth()
                        val startDayOfWeek = (firstOfMonth.dayOfWeek.value - 1)

                        Column {
                            var dayCounter = 1 - startDayOfWeek
                            for (week in 0..5) {
                                if (dayCounter > daysInMonth) break
                                Row(modifier = Modifier.fillMaxWidth()) {
                                    for (weekDay in 0..6) {
                                        if (dayCounter < 1 || dayCounter > daysInMonth) {
                                            Spacer(Modifier.weight(1f).aspectRatio(1f))
                                        } else {
                                            val date = selectedMonth.atDay(dayCounter)
                                            val hasWorkout = workoutDates.contains(date)
                                            val isToday = date == today
                                            val isSelected = date == selectedDate

                                            Box(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .aspectRatio(1f)
                                                    .padding(2.dp)
                                                    .clip(CircleShape)
                                                    .background(
                                                        when {
                                                            isSelected -> WellnessGreen
                                                            hasWorkout -> WellnessGreenLight
                                                            else -> Color.Transparent
                                                        }
                                                    )
                                                    .then(
                                                        if (isToday && !isSelected) Modifier.border(2.dp, WellnessGreen, CircleShape)
                                                        else Modifier
                                                    )
                                                    .clickable { selectedDate = date },
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                    Text(
                                                        "$dayCounter",
                                                        fontSize = 14.sp,
                                                        fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                                                        color = when {
                                                            isSelected -> Color.White
                                                            isToday -> WellnessGreen
                                                            else -> Color.DarkGray
                                                        }
                                                    )
                                                    if (hasWorkout && !isSelected) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(6.dp)
                                                                .background(WellnessGreen, CircleShape)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                        dayCounter++
                                    }
                                }
                            }
                        }
                    }

                    selectedDate?.let { date ->
                        val dayLogs = workoutLogs.filter { it.date == date }
                        item { SelectedDayCard(date = date, today = today, logs = dayLogs) }
                    }

                    item { SectionHeader("Recent Workouts") }
                    if (recentLogs.isEmpty()) {
                        item {
                            EmptyStateCard(
                                Icons.Filled.EventBusy,
                                "No workouts yet",
                                "Complete a workout to see it here"
                            )
                        }
                    } else {
                        items(recentLogs.take(10)) { log -> WorkoutLogItem(log) }
                    }

                    item { SectionHeader("Upcoming Coaching Sessions") }
                    if (coachingSessions.isEmpty()) {
                        item {
                            EmptyStateCard(
                                Icons.Filled.CalendarMonth,
                                "No coaching sessions",
                                "Upcoming sessions will appear here"
                            )
                        }
                    } else {
                        items(coachingSessions) { session -> CoachingSessionItem(session) }
                    }

                    item { SectionHeader("Active Plans") }
                    if (activePlans.isEmpty()) {
                        item {
                            EmptyStateCard(
                                Icons.Filled.FitnessCenter,
                                "No active plans",
                                "Assigned workout plans will appear here"
                            )
                        }
                    } else {
                        items(activePlans) { plan -> ActivePlanItem(plan) }
                    }
                }
            }
        }
    }
}

@Composable
private fun StreakBanner(currentStreak: Int, longestStreak: Int, activeDays: Int, workoutsCompleted: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(WellnessGreen, Color(0xFF1B5E20))
                    ),
                    RoundedCornerShape(20.dp)
                )
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("🔥 Current Streak", color = StreakGold, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text("$currentStreak", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 48.sp)
                        Spacer(Modifier.width(6.dp))
                        Text("days", color = Color.White.copy(alpha = 0.8f), fontSize = 18.sp,
                            modifier = Modifier.padding(bottom = 8.dp))
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    StreakStatItem("Best", "$longestStreak days", StreakGold)
                    Spacer(Modifier.height(12.dp))
                    StreakStatItem("Active Days", "$activeDays", Color(0xFF81C784))
                    Spacer(Modifier.height(12.dp))
                    StreakStatItem("This Period", "$workoutsCompleted", Color.White)
                }
            }
        }
    }
}

@Composable
private fun StreakStatItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp)
        Text(value, color = color, fontWeight = FontWeight.Bold, fontSize = 13.sp)
    }
}

@Composable
private fun ErrorRetryCard(message: String, onRetry: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = Color(0xFFE53935), modifier = Modifier.size(32.dp))
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Couldn't load your calendar", fontWeight = FontWeight.Bold)
                Text(message, color = Color.Gray, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            TextButton(onClick = onRetry) {
                Text("Retry", color = WellnessGreen)
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
}

@Composable
private fun SelectedDayCard(date: LocalDate, today: LocalDate, logs: List<WorkoutLogUi>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "${date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault())}, ${date.dayOfMonth} ${date.month.getDisplayName(TextStyle.FULL, Locale.getDefault())}",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
            Spacer(Modifier.height(12.dp))
            if (logs.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    logs.forEach { log ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(WellnessGreenLight, RoundedCornerShape(12.dp))
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(32.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(log.planTitle ?: log.sessionTitle ?: "Workout", fontWeight = FontWeight.Bold)
                                Text("${log.durationMinutes ?: 0} min • ${log.calories ?: 0} kcal", color = Color.Gray, fontSize = 13.sp)
                            }
                        }
                    }
                }
            } else if (!date.isAfter(today)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFFFF3E0), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.EventBusy, contentDescription = null, tint = StreakOrange, modifier = Modifier.size(32.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Rest day", fontWeight = FontWeight.Bold)
                        Text("No workouts recorded for this day", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFE3F2FD), RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.FitnessCenter, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(32.dp))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Upcoming", fontWeight = FontWeight.Bold)
                        Text("Stay on track with your plan!", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkoutLogItem(log: WorkoutLogUi) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(WellnessGreenLight)) {
                Icon(Icons.Filled.FitnessCenter, contentDescription = null, tint = WellnessGreen, modifier = Modifier.align(Alignment.Center).size(22.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(log.planTitle ?: log.sessionTitle ?: "Workout", fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                log.date?.let { Text(formatDate(it), color = Color.Gray, fontSize = 12.sp) }
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text("${log.durationMinutes ?: 0} min", fontWeight = FontWeight.SemiBold, color = WellnessGreen, fontSize = 14.sp)
                Text("${log.calories ?: 0} kcal", color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun CoachingSessionItem(session: CoachingSessionUi) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(WellnessGreenLight)) {
                    if (!session.coachImageUrl.isNullOrBlank()) {
                        AsyncImage(model = session.coachImageUrl, contentDescription = null,
                            modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    } else {
                        Icon(Icons.Filled.Person, contentDescription = null,
                            modifier = Modifier.align(Alignment.Center).size(24.dp), tint = WellnessGreen)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(session.coachName ?: "Wellness Coach", fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
                        Text(session.sessionType?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Session",
                            fontSize = 12.sp, color = Color.Gray)
                    }
                    Text(formatDateTime(session.scheduledAt), fontSize = 12.sp, color = Color(0xFF424242))
                }
                Spacer(Modifier.width(8.dp))
                val color = sessionStatusColor(session.status)
                Surface(shape = RoundedCornerShape(6.dp), color = color.copy(alpha = 0.12f)) {
                    Text(
                        session.status?.replaceFirstChar { it.titlecase(Locale.getDefault()) } ?: "Scheduled",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = color, fontWeight = FontWeight.SemiBold, fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun ActivePlanItem(plan: ActivePlanUi) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.FitnessCenter, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text(plan.title ?: "Untitled Plan", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun EmptyStateCard(icon: ImageVector, title: String, subtitle: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color.Gray)
            Text(subtitle, fontSize = 12.sp, color = Color.LightGray, textAlign = TextAlign.Center)
        }
    }
}

private fun sessionStatusColor(status: String?): Color = when (status) {
    "scheduled", "confirmed" -> Color(0xFF1565C0)
    "in_progress" -> WellnessGreen
    "completed" -> Color(0xFF4CAF50)
    "cancelled", "no_show" -> Color(0xFFE53935)
    else -> Color.Gray
}

private fun formatDate(date: LocalDate): String =
    "${date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())}, ${date.dayOfMonth} ${date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())}"

private fun formatDateTime(value: String?): String {
    if (value.isNullOrBlank()) return "—"
    runCatching {
        return ZonedDateTime.parse(value).format(DateTimeFormatter.ofPattern("EEE, dd MMM yyyy • hh:mm a"))
    }
    return parseDatePart(value)?.let { formatDate(it) } ?: value
}

private fun parseWorkoutLogs(calendar: JsonObject?): List<WorkoutLogUi> {
    val logs = calendar?.arr("workoutLogs") ?: return emptyList()
    return logs.mapNotNull { elem ->
        if (!elem.isJsonObject) return@mapNotNull null
        val obj = elem.asJsonObject
        val plan = obj.obj("plan")
        val session = obj.obj("session")
        WorkoutLogUi(
            id = obj.str("id") ?: "",
            date = parseDatePart(obj.str("completed_at")),
            planTitle = plan?.str("title"),
            sessionTitle = session?.str("title"),
            durationMinutes = obj.int("duration_minutes"),
            calories = obj.int("calories_burned"),
            intensity = obj.str("perceived_intensity")
        )
    }
}

private fun parseCoachingSessions(calendar: JsonObject?): List<CoachingSessionUi> {
    val sessions = calendar?.arr("coachingSessions") ?: return emptyList()
    return sessions.mapNotNull { elem ->
        if (!elem.isJsonObject) return@mapNotNull null
        val obj = elem.asJsonObject
        val coach = obj.obj("coach")
        CoachingSessionUi(
            id = obj.str("id") ?: "",
            scheduledAt = obj.str("scheduled_at"),
            sessionType = obj.str("session_type"),
            status = obj.str("status"),
            coachName = coach?.str("name"),
            coachImageUrl = coach?.str("profile_image_url")
        )
    }
}

private fun parseActivePlans(calendar: JsonObject?): List<ActivePlanUi> {
    val plans = calendar?.arr("activePlans") ?: return emptyList()
    return plans.mapNotNull { elem ->
        if (!elem.isJsonObject) return@mapNotNull null
        val obj = elem.asJsonObject
        val plan = obj.obj("plan")
        ActivePlanUi(
            id = plan?.str("id") ?: obj.str("id") ?: "",
            title = plan?.str("title")
        )
    }
}

private fun parseDatePart(value: String?): LocalDate? {
    if (value.isNullOrBlank()) return null
    return runCatching { LocalDate.parse(value.take(10)) }.getOrNull()
}

private fun JsonObject?.str(key: String): String? =
    this?.get(key)?.takeIf { !it.isJsonNull }?.takeIf { it.isJsonPrimitive }?.asString

private fun JsonObject?.int(key: String): Int? =
    this?.get(key)?.takeIf { !it.isJsonNull }
        ?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }
        ?.let { runCatching { it.asInt }.getOrNull() }

private fun JsonObject?.obj(key: String): JsonObject? =
    this?.get(key)?.takeIf { !it.isJsonNull }?.takeIf { it.isJsonObject }?.asJsonObject

private fun JsonObject?.arr(key: String): JsonArray? =
    this?.get(key)?.takeIf { !it.isJsonNull }?.takeIf { it.isJsonArray }?.asJsonArray
