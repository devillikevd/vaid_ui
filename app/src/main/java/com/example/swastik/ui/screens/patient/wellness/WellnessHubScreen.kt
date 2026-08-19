package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Watch
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.ui.viewmodel.WellnessViewModel
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessHubScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDietTracker: () -> Unit,
    onNavigateToHealthConnectDashboard: () -> Unit,
    onNavigateToEmergency: () -> Unit,
    onNavigateToFitnessCenters: () -> Unit,
    onNavigateToFitnessCenterDetail: (String) -> Unit,
    // New navigation callbacks for separate pages
    onNavigateToWorkouts: () -> Unit = {},
    onNavigateToExperts: () -> Unit = {},
    onNavigateToCommunity: () -> Unit = {},
    onNavigateToSupplements: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToAICoach: () -> Unit = {},
    onNavigateToAssessment: () -> Unit = {},
    onNavigateToWorkoutPlayer: (String) -> Unit = {},
    onNavigateToWorkoutCalendar: () -> Unit = {},
    onNavigateToQrCheckIn: () -> Unit = {},
    onNavigateToTypedReports: () -> Unit = {},
    onNavigateToCoachDashboard: () -> Unit = {},
    onNavigateToReminders: () -> Unit = {},
    onNavigateToBadges: () -> Unit = {},
    onNavigateToReels: () -> Unit = {},
    onNavigateToSafety: () -> Unit = {},
    initialSection: String? = null,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()

    // Load the aggregate once on first composition; skip when returning from sub-screens.
    LaunchedEffect(Unit) {
        if (!state.hasLoaded) viewModel.refreshHub()
    }

    // Direct navigation for deep links from home screen cards
    LaunchedEffect(initialSection) {
        when (initialSection) {
            "workouts" -> onNavigateToWorkouts()
            "experts" -> onNavigateToExperts()
            "community" -> onNavigateToCommunity()
            "supplements" -> onNavigateToSupplements()
            "reports" -> onNavigateToReports()
            "ai_coach" -> onNavigateToAICoach()
            "assessment" -> onNavigateToAssessment()
            "safety" -> onNavigateToSafety()
        }
    }

    val isFirstLoading = state.isLoading && !state.hasLoaded
    val isRefreshing = state.isLoading && state.hasLoaded

    // Pull-to-refresh (Material3 pulltorefresh, same pattern as Patient Dashboard)
    val pullToRefreshState = rememberPullToRefreshState()
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(pullToRefreshState) {
            viewModel.refreshHub()
        }
    }
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing && pullToRefreshState.isRefreshing) {
            delay(250)
            pullToRefreshState.endRefresh()
        }
    }

    val isEmptyFailure = state.error != null &&
        state.workoutPlanCount == 0 && state.exerciseCount == 0 &&
        state.coachCount == 0 && state.fitnessCenterCount == 0 &&
        state.communityCount == 0 && state.supplementCount == 0 &&
        state.activePlan == null && state.reels.isEmpty()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wellness Hub", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToBadges) {
                        Icon(Icons.Filled.EmojiEvents, contentDescription = "Badges", tint = Color(0xFFFFD700))
                    }
                    IconButton(onClick = onNavigateToReminders) {
                        Icon(Icons.Filled.Notifications, contentDescription = "Reminders")
                    }
                    IconButton(onClick = viewModel::refreshHub) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        when {
            isFirstLoading -> {
                HubSkeleton(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                )
            }
            isEmptyFailure -> {
                HubEmptyState(
                    error = state.error ?: "Something went wrong",
                    onRetry = { viewModel.refreshHub() },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                )
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .nestedScroll(pullToRefreshState.nestedScrollConnection)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.background),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                    item {
                        WellnessHero(
                            patientName = state.patientName,
                            steps = state.stepsToday,
                            workouts = state.workoutsCompletedToday,
                            streak = state.streakDays
                        )
                    }
                    item {
                        JourneyStrip(
                            onAssess = onNavigateToAssessment,
                            onPlan = onNavigateToWorkouts,
                            onAct = onNavigateToWorkouts,
                            onTrack = onNavigateToReports,
                            onImprove = onNavigateToAICoach,
                            onAchieve = onNavigateToBadges
                        )
                    }

                    if (state.activePlan != null) {
                        item {
                            ActiveWorkoutPlanWidget(
                                activePlan = state.activePlan!!,
                                onContinue = { planId -> onNavigateToWorkoutPlayer(planId) }
                            )
                        }
                    }

                    if (state.reels.isNotEmpty()) {
                        item {
                            ReelsPreviewStrip(reels = state.reels, onOpenReels = onNavigateToReels)
                        }
                    }

                    item {
                        EcosystemOverviewGrid(
                            workoutCount = state.workoutPlanCount,
                            exerciseCount = state.exerciseCount,
                            coachCount = state.coachCount,
                            centerCount = state.fitnessCenterCount,
                            communityCount = state.communityCount,
                            supplementCount = state.supplementCount,
                            onNavigateToWorkouts = onNavigateToWorkouts,
                            onNavigateToExperts = onNavigateToExperts,
                            onNavigateToCommunity = onNavigateToCommunity,
                            onNavigateToSupplements = onNavigateToSupplements,
                            onNavigateToReports = onNavigateToReports,
                            onNavigateToAICoach = onNavigateToAICoach,
                            onNavigateToAssessment = onNavigateToAssessment,
                            onLogMeal = onNavigateToDietTracker,
                            onHealthData = onNavigateToHealthConnectDashboard,
                            onMarketplace = onNavigateToFitnessCenters,
                            onEmergency = onNavigateToEmergency,
                            onNavigateToSafety = onNavigateToSafety
                        )
                    }

                    item {
                        QuickActionsCard(
                            onCalendar = onNavigateToWorkoutCalendar,
                            onQrCheckIn = onNavigateToQrCheckIn,
                            onTypedReports = onNavigateToTypedReports,
                            onReels = onNavigateToReels,
                            onCoachDashboard = onNavigateToCoachDashboard
                        )
                    }

                    if (isRefreshing) {
                        item { RefreshingIndicator() }
                    }

                    state.error?.let { error ->
                        item {
                            HubErrorCard(error = error, onRetry = { viewModel.refreshHub() })
                        }
                    }

                    item { WellnessSafetyFooter() }
                    }

                    PullToRefreshContainer(
                        modifier = Modifier.align(Alignment.TopCenter),
                        state = pullToRefreshState
                    )
                }
            }
        }
    }
}

@Composable
private fun WellnessHero(patientName: String?, steps: Int, workouts: Int, streak: Int) {
    Card(
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFF047857), Color(0xFF14532D))))
                .padding(18.dp)
        ) {
            Text(greetingText(), color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Text(
                text = patientName?.takeIf { it.isNotBlank() }?.let { "$it — VAIDIDEA FIT" } ?: "VAIDIDEA FIT",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = todayDateText(),
                color = Color(0xFFE7F8EE),
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                HeroStat("Steps", steps.toString(), Icons.Default.DirectionsRun)
                HeroStat("Workouts Today", workouts.toString(), Icons.Default.FitnessCenter)
                HeroStat("Day Streak", streak.toString(), Icons.Default.LocalFireDepartment)
            }
        }
    }
}

@Composable
private fun HeroStat(label: String, value: String, icon: ImageVector) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Color(0xFFE7F8EE), modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(value, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
        Text(label, color = Color.White.copy(alpha = 0.75f), fontSize = 11.sp)
    }
}

private fun greetingText(): String {
    return when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
        in 5..11 -> "Good Morning"
        in 12..16 -> "Good Afternoon"
        in 17..20 -> "Good Evening"
        else -> "Good Night"
    }
}

private fun todayDateText(): String =
    SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date())

@Composable
private fun JourneyStrip(
    onAssess: () -> Unit,
    onPlan: () -> Unit,
    onAct: () -> Unit,
    onTrack: () -> Unit,
    onImprove: () -> Unit,
    onAchieve: () -> Unit
) {
    data class Step(val label: String, val icon: ImageVector, val onClick: () -> Unit)
    val steps = listOf(
        Step("Assess", Icons.Default.TrackChanges, onAssess),
        Step("Plan", Icons.Default.CheckCircle, onPlan),
        Step("Act", Icons.Default.FitnessCenter, onAct),
        Step("Track", Icons.Default.TrendingUp, onTrack),
        Step("Improve", Icons.Outlined.SelfImprovement, onImprove),
        Step("Achieve", Icons.Default.LocalFireDepartment, onAchieve)
    )
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(steps) { step ->
            AssistChip(
                onClick = step.onClick,
                label = { Text(step.label, fontWeight = FontWeight.SemiBold) },
                leadingIcon = { Icon(step.icon, null, modifier = Modifier.size(18.dp), tint = WellnessGreen) }
            )
        }
    }
}

// ==================== ECOSYSTEM GRID — NAVIGATES TO SEPARATE PAGES ====================

@Composable
private fun EcosystemOverviewGrid(
    workoutCount: Int,
    exerciseCount: Int,
    coachCount: Int,
    centerCount: Int,
    communityCount: Int,
    supplementCount: Int,
    onNavigateToWorkouts: () -> Unit,
    onNavigateToExperts: () -> Unit,
    onNavigateToCommunity: () -> Unit,
    onNavigateToSupplements: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToAICoach: () -> Unit,
    onNavigateToAssessment: () -> Unit,
    onLogMeal: () -> Unit,
    onHealthData: () -> Unit,
    onMarketplace: () -> Unit,
    onEmergency: () -> Unit,
    onNavigateToSafety: () -> Unit = {}
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Wellness Ecosystem", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        OverviewRow {
            FeatureOverviewCard(
                number = "1", title = "Dashboard",
                icon = Icons.Default.TrackChanges, tint = Color(0xFF14B8A6), bgColor = Color(0xFFE6F8F5),
                lines = listOf("Workout summary", "Nutrition summary", "Recovery and health"),
                modifier = Modifier.weight(1f), onClick = onNavigateToReports
            )
            FeatureOverviewCard(
                number = "2", title = "Assessment",
                icon = Icons.Default.CheckCircle, tint = Color(0xFF6366F1), bgColor = Color(0xFFEEF2FF),
                lines = listOf("Goals", "Bio + equipment", "Health screening"),
                modifier = Modifier.weight(1f), onClick = onNavigateToAssessment
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "3", title = "Workout",
                icon = Icons.Default.FitnessCenter, tint = Color(0xFFFF7E67), bgColor = Color(0xFFFFEFE5),
                lines = listOf("$workoutCount plans", "$exerciseCount exercise assets", "Timers + tracking ready"),
                modifier = Modifier.weight(1f), onClick = onNavigateToWorkouts
            )
            FeatureOverviewCard(
                number = "4", title = "Nutrition",
                icon = Icons.Default.Restaurant, tint = Color(0xFFFFB300), bgColor = Color(0xFFFFF8E1),
                lines = listOf("Food logging", "Macros + water", "Meal plans"),
                modifier = Modifier.weight(1f), onClick = onLogMeal
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "5", title = "Habits & Streaks",
                icon = Icons.Default.CheckCircle, tint = Color(0xFF00ACC1), bgColor = Color(0xFFE0F7FA),
                lines = listOf("Daily water & sleep", "Mindfulness streak", "Consistency score"),
                modifier = Modifier.weight(1f), onClick = onNavigateToReports
            )
            FeatureOverviewCard(
                number = "6", title = "AI Coach",
                icon = Icons.Outlined.SelfImprovement, tint = Color(0xFF7E57C2), bgColor = Color(0xFFEDE7F6),
                lines = listOf("Daily guidance", "Adherence insights", "Medical escalation"),
                modifier = Modifier.weight(1f), onClick = onNavigateToAICoach
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "7", title = "Experts",
                icon = Icons.Default.Groups, tint = Color(0xFF3F51B5), bgColor = Color(0xFFE8EAF6),
                lines = listOf("$coachCount approved experts", "Video/audio/chat", "Plan adjustments"),
                modifier = Modifier.weight(1f), onClick = onNavigateToExperts
            )
            FeatureOverviewCard(
                number = "8", title = "Wellness Store",
                icon = Icons.Default.Store, tint = Color(0xFF0F766E), bgColor = Color(0xFFE0F2F1),
                lines = listOf("$supplementCount verified products", "FSSAI & NABL Lab tested", "⚡ 2-Hr Pharmacy Express"),
                modifier = Modifier.weight(1f), onClick = onNavigateToSupplements
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "9", title = "Community",
                icon = Icons.Default.TrendingUp, tint = Color(0xFFEC407A), bgColor = Color(0xFFFCE4EC),
                lines = listOf("$communityCount groups/challenges", "Badges", "Leaderboards"),
                modifier = Modifier.weight(1f), onClick = onNavigateToCommunity
            )
            FeatureOverviewCard(
                number = "10", title = "Reports & Analytics",
                icon = Icons.Default.Verified, tint = Color(0xFF64748B), bgColor = Color(0xFFF1F5F9),
                lines = listOf("Workout & diet summary", "Vitals & recovery trends", "Health connect sync"),
                modifier = Modifier.weight(1f), onClick = onNavigateToReports
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "11", title = "Clinical Safety",
                icon = Icons.Default.LocalHospital, tint = Color(0xFFE53935), bgColor = Color(0xFFFFEBEE),
                lines = listOf("Pre-exercise screening", "Doctor/physio referral", "I feel unwell alert"),
                modifier = Modifier.weight(1f), onClick = onNavigateToSafety
            )
        }
    }
}

@Composable
private fun OverviewRow(content: @Composable RowScope.() -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Max)
    ) {
        content()
    }
}

@Composable
private fun FeatureOverviewCard(
    number: String,
    title: String,
    icon: ImageVector,
    tint: Color,
    bgColor: Color = MaterialTheme.colorScheme.surface,
    lines: List<String>,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val clickableModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    Card(
        modifier = clickableModifier.fillMaxHeight(),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .background(Brush.linearGradient(listOf(bgColor, Color.White)))
                .padding(12.dp), 
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(12.dp), color = tint.copy(alpha = 0.12f)) {
                    Icon(icon, null, tint = tint, modifier = Modifier.padding(7.dp).size(18.dp))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("$number. $title", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
            lines.forEach { line ->
                Text("• $line", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

// ==================== LATEST REELS ====================

@Composable
private fun ReelsPreviewStrip(reels: List<WellnessReelDto>, onOpenReels: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Latest Reels", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
            TextButton(onClick = onOpenReels) { Text("See all") }
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(reels, key = { it.id }) { reel ->
                ReelThumb(reel = reel, onClick = onOpenReels)
            }
        }
    }
}

@Composable
private fun ReelThumb(reel: WellnessReelDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .width(150.dp)
            .height(200.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            val imageUrl = reel.thumbnailUrl ?: reel.videoUrl
            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = reel.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(44.dp)
                    .background(Color.Black.copy(alpha = 0.45f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.PlayArrow, null, tint = Color.White, modifier = Modifier.size(24.dp))
            }
            reel.title?.let { title ->
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = title,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.35f), RoundedCornerShape(6.dp))
                            .padding(4.dp)
                    )
                }
            }
        }
    }
}

// ==================== QUICK ACTIONS ====================

@Composable
private fun QuickActionsCard(
    onCalendar: () -> Unit,
    onQrCheckIn: () -> Unit,
    onTypedReports: () -> Unit,
    onReels: () -> Unit,
    onCoachDashboard: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Quick Actions", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                QuickActionChip(
                    icon = Icons.Filled.CalendarMonth,
                    label = "Calendar",
                    color = WellnessGreen,
                    onClick = onCalendar
                )
                QuickActionChip(
                    icon = Icons.Filled.QrCodeScanner,
                    label = "QR Check-in",
                    color = Color(0xFF1565C0),
                    onClick = onQrCheckIn
                )
                QuickActionChip(
                    icon = Icons.Filled.BarChart,
                    label = "Reports",
                    color = Color(0xFFFF6D00),
                    onClick = onTypedReports
                )
                QuickActionChip(
                    icon = Icons.Filled.PlayCircleOutline,
                    label = "Reels",
                    color = Color(0xFFE91E63),
                    onClick = onReels
                )
                QuickActionChip(
                    icon = Icons.Filled.SwapHoriz,
                    label = "Coach View",
                    color = Color(0xFF1565C0),
                    onClick = onCoachDashboard
                )
            }
        }
    }
}

@Composable
fun QuickActionChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(color.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
    }
}

// ==================== ACTIVE PLAN WIDGET ====================

@Composable
fun ActiveWorkoutPlanWidget(
    activePlan: com.example.swastik.data.remote.dto.PatientWorkoutPlanDto,
    onContinue: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { activePlan.planId?.let { onContinue(it) } },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = WellnessGreen),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Active Plan",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = activePlan.plan?.title ?: "Workout Plan",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocalFireDepartment, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${activePlan.streakDays ?: 0} day streak", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.BarChart, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${activePlan.adherencePercent?.toInt() ?: 0}% adherence", color = Color.White, fontSize = 12.sp)
                    }
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(Color.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = "Continue", tint = WellnessGreen, modifier = Modifier.size(28.dp))
            }
        }
    }
}

// ==================== SKELETON / EMPTY / ERROR STATES ====================

@Composable
private fun HubSkeleton(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "hubSkeleton")
    val alpha by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.75f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "hubSkeletonAlpha"
    )
    Column(modifier = modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SkeletonBox(Modifier.fillMaxWidth().height(120.dp), alpha)
        SkeletonBox(Modifier.fillMaxWidth().height(40.dp), alpha)
        SkeletonBox(Modifier.fillMaxWidth().height(88.dp), alpha)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBox(Modifier.weight(1f).height(120.dp), alpha)
            SkeletonBox(Modifier.weight(1f).height(120.dp), alpha)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonBox(Modifier.weight(1f).height(120.dp), alpha)
            SkeletonBox(Modifier.weight(1f).height(120.dp), alpha)
        }
        SkeletonBox(Modifier.fillMaxWidth().height(140.dp), alpha)
    }
}

@Composable
private fun SkeletonBox(modifier: Modifier = Modifier, alpha: Float) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha))
    )
}

@Composable
private fun HubEmptyState(error: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.padding(24.dp), contentAlignment = Alignment.Center) {
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Filled.ErrorOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(48.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text("Couldn't load your wellness hub", fontWeight = FontWeight.Bold, fontSize = 16.sp, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(4.dp))
                Text(error, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(onClick = onRetry) { Text("Try Again") }
            }
        }
    }
}

@Composable
private fun HubErrorCard(error: String, onRetry: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = onRetry) { Text("Retry") }
        }
    }
}

@Composable
private fun RefreshingIndicator() {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
        Spacer(modifier = Modifier.width(8.dp))
        Text("Refreshing…", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ==================== SAFETY FOOTER ====================

@Composable
private fun WellnessSafetyFooter() {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text("⚠ Safety Notice", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Consult your doctor before starting any new exercise or diet program. If you feel unwell, stop immediately and seek medical help.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp
            )
        }
    }
}
