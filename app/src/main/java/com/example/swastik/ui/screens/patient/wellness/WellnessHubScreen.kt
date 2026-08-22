package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Watch
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.PatientWorkoutPlanDto
import com.example.swastik.data.remote.dto.WellnessReelDto
import com.example.swastik.ui.viewmodel.WellnessViewModel
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessHubScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDietTracker: () -> Unit,
    onNavigateToHealthConnectDashboard: () -> Unit,
    onNavigateToEmergency: () -> Unit,
    onNavigateToFitnessCenters: () -> Unit,
    onNavigateToFitnessCenterDetail: (String) -> Unit,
    onNavigateToWorkouts: () -> Unit = {},
    onNavigateToExperts: () -> Unit = {},
    onNavigateToCommunity: () -> Unit = {},
    onNavigateToChallenges: () -> Unit = {},
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

    LaunchedEffect(Unit) {
        if (!state.hasLoaded) viewModel.refreshHub()
    }

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

    var selectedTab by rememberSaveable { mutableStateOf(WellnessHubTab.OVERVIEW) }

    val isEmptyFailure = state.error != null &&
        state.workoutPlanCount == 0 && state.exerciseCount == 0 &&
        state.coachCount == 0 && state.fitnessCenterCount == 0 &&
        state.communityCount == 0 && state.supplementCount == 0 &&
        state.activePlan == null && state.reels.isEmpty()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Wellness Hub",
                        fontWeight = FontWeight.ExtraBold,
                        color = WellnessTheme.TealDeep,
                        fontSize = 20.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = WellnessTheme.TealDeep
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToBadges) {
                        Icon(
                            Icons.Filled.EmojiEvents,
                            contentDescription = "Badges",
                            tint = WellnessTheme.StarYellow
                        )
                    }
                    IconButton(onClick = onNavigateToReminders) {
                        Icon(
                            Icons.Filled.Notifications,
                            contentDescription = "Reminders",
                            tint = WellnessTheme.TealDark
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
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
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // 1️⃣ Flagship Hero with Circular Metric Rings
                        item {
                            WellnessHero(
                                patientName = state.patientName,
                                steps = state.stepsToday,
                                activeCalories = state.activeCaloriesToday,
                                streak = state.streakDays,
                                workoutsCompletedToday = state.workoutsCompletedToday
                            )
                        }

                        // 2️⃣ Live Biometrics Performance Row
                        item {
                            TodayBiometricsRow(
                                steps = state.stepsToday,
                                activeCalories = state.activeCaloriesToday,
                                activeMinutes = state.activeMinutesToday
                            )
                        }

                        // 3️⃣ Sleek Segmented Tab Switcher
                        item {
                            WellnessSegmentedTabBar(
                                selectedTab = selectedTab,
                                onTabSelected = { selectedTab = it }
                            )
                        }

                        // 4️⃣ Dynamic Content with 60fps Fluid Crossfade Animation
                        item {
                            AnimatedContent(
                                targetState = selectedTab,
                                transitionSpec = {
                                    fadeIn(animationSpec = tween(220)) togetherWith fadeOut(animationSpec = tween(180))
                                },
                                label = "WellnessTabTransition"
                            ) { currentTab ->
                                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                    when (currentTab) {
                                        WellnessHubTab.OVERVIEW -> {
                                            // 🤖 AI Daily Readiness & Micro-Guidance
                                            AiDailyReadinessBanner(
                                                readiness = state.aiReadinessScore,
                                                guidance = state.dailyGuidanceItems.firstOrNull(),
                                                onClick = onNavigateToAICoach
                                            )

                                            JourneyStrip(
                                                onAssess = onNavigateToAssessment,
                                                onPlan = onNavigateToWorkouts,
                                                onAct = {
                                                    val activePlanId = state.activePlan?.id
                                                    if (activePlanId != null) {
                                                        onNavigateToWorkoutPlayer(activePlanId)
                                                    } else {
                                                        onNavigateToWorkoutCalendar()
                                                    }
                                                },
                                                onTrack = onNavigateToReports,
                                                onImprove = onNavigateToAICoach,
                                                onAchieve = onNavigateToBadges
                                            )

                                            state.activePlan?.let { activePlan ->
                                                ActiveWorkoutPlanWidget(
                                                    activePlan = activePlan,
                                                    onContinue = { planId -> onNavigateToWorkoutPlayer(planId) }
                                                )
                                            }

                                            if (state.reels.isNotEmpty()) {
                                                ReelsPreviewStrip(
                                                    reels = state.reels,
                                                    onOpenReels = onNavigateToReels
                                                )
                                            }

                                            DailyEssentialsGrid(
                                                workoutCount = state.workoutPlanCount,
                                                onNavigateToWorkouts = onNavigateToWorkouts,
                                                onLogMeal = onNavigateToDietTracker,
                                                onNavigateToAICoach = onNavigateToAICoach,
                                                onHealthData = onNavigateToHealthConnectDashboard
                                            )

                                            QuickActionsCard(
                                                onCalendar = onNavigateToWorkoutCalendar,
                                                onQrCheckIn = onNavigateToQrCheckIn,
                                                onTypedReports = onNavigateToTypedReports,
                                                onReels = onNavigateToReels,
                                                onCoachDashboard = onNavigateToCoachDashboard
                                            )

                                            WellnessSafetyFooter()
                                        }

                                        WellnessHubTab.ACTIVITY -> {
                                            state.activePlan?.let { activePlan ->
                                                ActiveWorkoutPlanWidget(
                                                    activePlan = activePlan,
                                                    onContinue = { planId -> onNavigateToWorkoutPlayer(planId) }
                                                )
                                            }

                                            // 💧 1-Tap Quick Hydration Tracker
                                            QuickHydrationCard()

                                            ActivityZoneSection(
                                                workoutCount = state.workoutPlanCount,
                                                exerciseCount = state.exerciseCount,
                                                coachCount = state.coachCount,
                                                onNavigateToWorkouts = onNavigateToWorkouts,
                                                onLogMeal = onNavigateToDietTracker,
                                                onNavigateToAICoach = onNavigateToAICoach,
                                                onNavigateToExperts = onNavigateToExperts
                                            )

                                            if (state.reels.isNotEmpty()) {
                                                ReelsPreviewStrip(
                                                    reels = state.reels,
                                                    onOpenReels = onNavigateToReels
                                                )
                                            }

                                            QuickActionsCard(
                                                onCalendar = onNavigateToWorkoutCalendar,
                                                onQrCheckIn = onNavigateToQrCheckIn,
                                                onTypedReports = onNavigateToTypedReports,
                                                onReels = onNavigateToReels,
                                                onCoachDashboard = onNavigateToCoachDashboard
                                            )
                                        }

                                        WellnessHubTab.EXPLORE -> {
                                            ExploreZoneSection(
                                                supplementCount = state.supplementCount,
                                                centerCount = state.fitnessCenterCount,
                                                communityCount = state.communityCount,
                                                onNavigateToSupplements = onNavigateToSupplements,
                                                onMarketplace = onNavigateToFitnessCenters,
                                                onNavigateToCommunity = onNavigateToCommunity,
                                                onNavigateToChallenges = onNavigateToChallenges
                                            )

                                            if (state.reels.isNotEmpty()) {
                                                ReelsPreviewStrip(
                                                    reels = state.reels,
                                                    onOpenReels = onNavigateToReels
                                                )
                                            }

                                            QuickActionsCard(
                                                onCalendar = onNavigateToWorkoutCalendar,
                                                onQrCheckIn = onNavigateToQrCheckIn,
                                                onTypedReports = onNavigateToTypedReports,
                                                onReels = onNavigateToReels,
                                                onCoachDashboard = onNavigateToCoachDashboard
                                            )
                                        }

                                        WellnessHubTab.CLINICAL -> {
                                            ClinicalZoneSection(
                                                onNavigateToReports = onNavigateToReports,
                                                onNavigateToAssessment = onNavigateToAssessment,
                                                onNavigateToSafety = onNavigateToSafety,
                                                onHealthData = onNavigateToHealthConnectDashboard
                                            )

                                            QuickActionsCard(
                                                onCalendar = onNavigateToWorkoutCalendar,
                                                onQrCheckIn = onNavigateToQrCheckIn,
                                                onTypedReports = onNavigateToTypedReports,
                                                onReels = onNavigateToReels,
                                                onCoachDashboard = onNavigateToCoachDashboard
                                            )

                                            WellnessSafetyFooter()
                                        }
                                    }
                                }
                            }
                        }

                        if (isRefreshing) {
                            item { RefreshingIndicator() }
                        }

                        state.error?.let { error ->
                            item {
                                HubErrorCard(error = error, onRetry = { viewModel.refreshHub() })
                            }
                        }
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

// ==================== 1️⃣ HERO BANNER WITH CIRCULAR METRIC RINGS ====================

@Composable
private fun WellnessHero(
    patientName: String?,
    steps: Int,
    activeCalories: Int,
    streak: Int,
    workoutsCompletedToday: Int
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier
            .fillMaxWidth()
            .shadow(12.dp, RoundedCornerShape(24.dp), spotColor = WellnessTheme.TealPrimary.copy(alpha = 0.35f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(WellnessTheme.HeroGradient)
                .padding(20.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(WellnessTheme.TealMint)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = greetingText().uppercase(),
                                color = WellnessTheme.TealMint,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = patientName?.takeIf { it.isNotBlank() } ?: "Vaididea Athlete",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.White.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Filled.LocalFireDepartment,
                                contentDescription = null,
                                tint = if (streak > 0) WellnessTheme.YogaAmber else Color.White.copy(alpha = 0.7f),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = if (streak > 0) "$streak Day Streak" else "Start Streak",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = todayDateText(),
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(20.dp))

                // 3 Interactive Metric Progress Rings
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val stepProgress = (steps.toFloat() / 10000f).coerceIn(0f, 1f)
                    val calorieProgress = (activeCalories.toFloat() / 500f).coerceIn(0f, 1f)
                    val goalProgress = if (workoutsCompletedToday > 0) 1f else if (streak > 0) ((streak % 30).toFloat() / 30f).coerceIn(0.1f, 1f) else 0f

                    HeroProgressRing(
                        progress = stepProgress,
                        value = if (steps >= 1000) String.format("%.1fk", steps / 1000f) else steps.toString(),
                        label = "Steps",
                        icon = Icons.AutoMirrored.Filled.DirectionsRun,
                        ringColor = WellnessTheme.TealMint
                    )

                    HeroProgressRing(
                        progress = calorieProgress,
                        value = activeCalories.toString(),
                        label = "Active Cal",
                        icon = Icons.Default.LocalFireDepartment,
                        ringColor = WellnessTheme.FitnessCoral
                    )

                    HeroProgressRing(
                        progress = goalProgress,
                        value = if (workoutsCompletedToday > 0) "$workoutsCompletedToday Done" else if (streak > 0) "$streak Days" else "0/3 Goals",
                        label = "Daily Goal",
                        icon = Icons.Default.FitnessCenter,
                        ringColor = WellnessTheme.YogaAmber
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroProgressRing(
    progress: Float,
    value: String,
    label: String,
    icon: ImageVector,
    ringColor: Color,
    size: Dp = 76.dp
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "heroProgress"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier.size(size),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val strokeWidth = 5.5.dp.toPx()
                // Track
                drawArc(
                    color = Color.White.copy(alpha = 0.15f),
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
                // Progress Arc
                drawArc(
                    color = ringColor,
                    startAngle = -90f,
                    sweepAngle = animatedProgress * 360f,
                    useCenter = false,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = ringColor,
                    modifier = Modifier.size(15.dp)
                )
                Text(
                    text = value,
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        Text(
            text = label,
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== 2️⃣ TODAY'S BIOMETRICS ROW ====================

@Composable
private fun TodayBiometricsRow(steps: Int, activeCalories: Int, activeMinutes: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        BiometricStatCard(
            title = "Steps",
            value = String.format(Locale.getDefault(), "%,d", steps),
            unit = "/ 10k",
            icon = Icons.AutoMirrored.Filled.DirectionsRun,
            accentColor = WellnessTheme.TealPrimary,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        )
        BiometricStatCard(
            title = "Burned",
            value = activeCalories.toString(),
            unit = "kcal",
            icon = Icons.Default.LocalFireDepartment,
            accentColor = WellnessTheme.FitnessCoral,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        )
        BiometricStatCard(
            title = "Active",
            value = activeMinutes.toString(),
            unit = "mins",
            icon = Icons.Default.Timer,
            accentColor = WellnessTheme.YogaAmber,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        )
    }
}

@Composable
private fun BiometricStatCard(
    title: String,
    value: String,
    unit: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2F5F3)),
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(WellnessTheme.TealSurface.copy(alpha = 0.8f), Color.White)))
                .padding(horizontal = 10.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = accentColor.copy(alpha = 0.12f)
                ) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier
                            .padding(5.dp)
                            .size(14.dp)
                    )
                }
                Text(
                    text = title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = WellnessTheme.TealDeep.copy(alpha = 0.7f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = buildAnnotatedString {
                    withStyle(
                        SpanStyle(
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = WellnessTheme.TealDeep
                        )
                    ) {
                        append(value)
                    }
                    if (unit.isNotBlank()) {
                        withStyle(
                            SpanStyle(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF64748B)
                            )
                        ) {
                            append(if (unit.startsWith("/")) " $unit" else " $unit")
                        }
                    }
                },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

// ==================== 3️⃣ CONNECTED GLOWING JOURNEY STEPPER ====================

@Composable
private fun JourneyStrip(
    onAssess: () -> Unit,
    onPlan: () -> Unit,
    onAct: () -> Unit,
    onTrack: () -> Unit,
    onImprove: () -> Unit,
    onAchieve: () -> Unit
) {
    data class Step(val label: String, val icon: ImageVector, val onClick: () -> Unit, val stepNum: String)
    val steps = listOf(
        Step("Assess", Icons.Default.TrackChanges, onAssess, "1"),
        Step("Plan", Icons.Default.CheckCircle, onPlan, "2"),
        Step("Act", Icons.Default.FitnessCenter, onAct, "3"),
        Step("Track", Icons.AutoMirrored.Filled.TrendingUp, onTrack, "4"),
        Step("Improve", Icons.Outlined.SelfImprovement, onImprove, "5"),
        Step("Achieve", Icons.Default.EmojiEvents, onAchieve, "6")
    )

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Personal Wellness Journey",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = WellnessTheme.TealDeep
            )
            Text(
                text = "6 Steps",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = WellnessTheme.TealPrimary
            )
        }

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 2.dp, vertical = 2.dp)
        ) {
            items(steps) { step ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, WellnessTheme.TealBorder.copy(alpha = 0.7f)),
                    shadowElevation = 1.5.dp,
                    modifier = Modifier.clickable { step.onClick() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = WellnessTheme.TealSurfaceVariant
                        ) {
                            Text(
                                text = step.stepNum,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = WellnessTheme.TealDark,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Icon(
                            step.icon,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = WellnessTheme.TealDark
                        )
                        Text(
                            text = step.label,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = WellnessTheme.TealDeep
                        )
                    }
                }
            }
        }
    }
}

// ==================== 4️⃣ ACTIVE WORKOUT PLAN WIDGET ====================

@Composable
fun ActiveWorkoutPlanWidget(
    activePlan: PatientWorkoutPlanDto,
    onContinue: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(20.dp), spotColor = WellnessTheme.TealPrimary.copy(alpha = 0.25f))
            .clickable { activePlan.planId?.let { onContinue(it) } },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.2.dp, WellnessTheme.TealMint.copy(alpha = 0.5f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(WellnessTheme.HeroGradient)
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(WellnessTheme.TealMint)
                        )
                        Text(
                            text = "CURRENT ACTIVE PROGRAM",
                            color = WellnessTheme.TealMint,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = activePlan.plan?.title ?: "Personalized Training",
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    val adherence = activePlan.adherencePercent?.toInt() ?: 0
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "$adherence% Adherence",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${activePlan.streakDays ?: 0} Day Streak",
                            color = WellnessTheme.YogaAmber,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { (adherence / 100f).coerceIn(0f, 1f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = WellnessTheme.TealMint,
                        trackColor = Color.White.copy(alpha = 0.2f),
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Surface(
                    shape = CircleShape,
                    color = Color.White,
                    shadowElevation = 4.dp,
                    modifier = Modifier.size(52.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Filled.PlayArrow,
                            contentDescription = "Continue",
                            tint = WellnessTheme.TealDark,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                }
            }
        }
    }
}

// ==================== 5️⃣ VIDEO REELS CAROUSEL ====================

@Composable
private fun ReelsPreviewStrip(reels: List<WellnessReelDto>, onOpenReels: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Wellness Reels", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = WellnessTheme.TealDeep)
                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFCE4EC)) {
                    Text("HD", color = Color(0xFFE91E63), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp))
                }
            }
            TextButton(onClick = onOpenReels) {
                Text("See All", color = WellnessTheme.TealPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
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
            .width(140.dp)
            .height(190.dp)
            .clickable(onClick = onClick)
            .shadow(4.dp, RoundedCornerShape(18.dp)),
        shape = RoundedCornerShape(18.dp),
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
                    .fillMaxSize()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.75f))))
            )
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(42.dp)
                    .background(Color.White.copy(alpha = 0.85f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.PlayArrow, null, tint = WellnessTheme.TealDeep, modifier = Modifier.size(24.dp))
            }
            reel.title?.let { title ->
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(10.dp)
                )
            }
        }
    }
}

// ==================== 5.5 AI DAILY READINESS & HYDRATION WIDGETS ====================

@Composable
private fun AiDailyReadinessBanner(
    readiness: com.example.swastik.data.model.AiReadinessScoreDto,
    guidance: com.example.swastik.data.model.DailyGuidanceItem?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = BorderStroke(1.dp, WellnessTheme.TealBorder.copy(alpha = 0.6f)),
        shadowElevation = 2.dp,
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            WellnessTheme.TealSurface,
                            Color.White
                        )
                    )
                )
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = WellnessTheme.TealPrimary.copy(alpha = 0.12f)
                    ) {
                        Icon(
                            Icons.Outlined.SelfImprovement,
                            contentDescription = null,
                            tint = WellnessTheme.TealPrimary,
                            modifier = Modifier.padding(6.dp).size(20.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "AI Daily Readiness",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = WellnessTheme.TealDeep
                        )
                        Text(
                            text = "${readiness.score}% • ${readiness.category}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (readiness.score >= 80) Color(0xFF059669) else Color(0xFFD97706)
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = WellnessTheme.TealSurfaceVariant
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "Ask AI",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = WellnessTheme.TealDark
                        )
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            tint = WellnessTheme.TealDark,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            // Micro Guidance Pill
            val tipText = guidance?.desc ?: readiness.summary
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                border = BorderStroke(1.dp, Color(0xFFE2F3F0))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("💡", fontSize = 13.sp)
                    Text(
                        text = tipText,
                        fontSize = 11.5.sp,
                        color = Color(0xFF334155),
                        lineHeight = 15.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickHydrationCard(
    modifier: Modifier = Modifier
) {
    var waterGlasses by rememberSaveable { mutableStateOf(5) }
    val targetGlasses = 12

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        shadowElevation = 1.5.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color(0xFFF0FDF4),
                            Color.White
                        )
                    )
                )
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF0284C7).copy(alpha = 0.12f)
                ) {
                    Text(
                        "💧",
                        fontSize = 18.sp,
                        modifier = Modifier.padding(6.dp)
                    )
                }
                Column {
                    Text(
                        "Hydration Tracker",
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WellnessTheme.TealDeep
                    )
                    val currentLiters = String.format(Locale.US, "%.2f", waterGlasses * 0.25)
                    Text(
                        "$currentLiters L / 3.0 L ($waterGlasses of $targetGlasses glasses)",
                        fontSize = 11.5.sp,
                        color = Color(0xFF0284C7),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = WellnessTheme.TealPrimary,
                modifier = Modifier.clickable {
                    if (waterGlasses < targetGlasses) waterGlasses++
                }
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        "+250ml",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}

// ==================== 6️⃣ SEGMENTED TAB BAR & ZONE SECTIONS ====================

enum class WellnessHubTab(val label: String, val icon: ImageVector) {
    OVERVIEW("All", Icons.Default.TrackChanges),
    ACTIVITY("Activity", Icons.Default.FitnessCenter),
    EXPLORE("Explore", Icons.Default.Store),
    CLINICAL("Clinical", Icons.Default.LocalHospital)
}

@Composable
private fun WellnessSegmentedTabBar(
    selectedTab: WellnessHubTab,
    onTabSelected: (WellnessHubTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = WellnessTheme.TealSurface,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            WellnessHubTab.entries.forEach { tab ->
                val isSelected = tab == selectedTab
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelected) WellnessTheme.TealPrimary else Color.Transparent,
                    shadowElevation = if (isSelected) 2.dp else 0.dp,
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onTabSelected(tab) }
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = 10.dp, horizontal = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = null,
                            tint = if (isSelected) Color.White else WellnessTheme.TealDark,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = tab.label,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                            color = if (isSelected) Color.White else WellnessTheme.TealDeep,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DailyEssentialsGrid(
    workoutCount: Int,
    onNavigateToWorkouts: () -> Unit,
    onLogMeal: () -> Unit,
    onNavigateToAICoach: () -> Unit,
    onHealthData: () -> Unit
) {
    ZoneSection(title = "🔥 Daily Essentials & Coaching") {
        OverviewRow {
            EcosystemCard(
                title = "Workouts & Plans",
                subtitle = if (workoutCount > 0) "$workoutCount active plans" else "Personalized routines",
                pillText = "Live",
                icon = Icons.Default.FitnessCenter,
                tint = WellnessTheme.FitnessCoral,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToWorkouts
            )
            EcosystemCard(
                title = "Nutrition & Diet",
                subtitle = "Log meals & water intake",
                pillText = "Food AI",
                icon = Icons.Default.Restaurant,
                tint = WellnessTheme.YogaAmber,
                modifier = Modifier.weight(1f),
                onClick = onLogMeal
            )
        }
        OverviewRow {
            EcosystemCard(
                title = "AI Health Coach",
                subtitle = "24/7 AI wellness guidance",
                pillText = "24/7 AI",
                icon = Icons.Outlined.SelfImprovement,
                tint = Color(0xFF7C3AED),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToAICoach
            )
            EcosystemCard(
                title = "Health Connect",
                subtitle = "Smartwatch & vitals sync",
                pillText = "Real-Time",
                icon = Icons.Default.Watch,
                tint = WellnessTheme.TealPrimary,
                modifier = Modifier.weight(1f),
                onClick = onHealthData
            )
        }
    }
}

@Composable
private fun ActivityZoneSection(
    workoutCount: Int,
    exerciseCount: Int,
    coachCount: Int,
    onNavigateToWorkouts: () -> Unit,
    onLogMeal: () -> Unit,
    onNavigateToAICoach: () -> Unit,
    onNavigateToExperts: () -> Unit
) {
    ZoneSection(title = "🔥 Daily Activity, Workouts & Coaching") {
        OverviewRow {
            EcosystemCard(
                title = "Workouts & Library",
                subtitle = if (workoutCount > 0) "$workoutCount plans • $exerciseCount exercises" else "Personalized workout routines",
                pillText = "Live Tracker",
                icon = Icons.Default.FitnessCenter,
                tint = WellnessTheme.FitnessCoral,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToWorkouts
            )
            EcosystemCard(
                title = "Nutrition & Macros",
                subtitle = "Log meals, water & calorie burn",
                pillText = "Food AI",
                icon = Icons.Default.Restaurant,
                tint = WellnessTheme.YogaAmber,
                modifier = Modifier.weight(1f),
                onClick = onLogMeal
            )
        }
        OverviewRow {
            EcosystemCard(
                title = "AI Health Coach",
                subtitle = "24/7 instant guidance & smart plans",
                pillText = "24/7 AI",
                icon = Icons.Outlined.SelfImprovement,
                tint = Color(0xFF7C3AED),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToAICoach
            )
            EcosystemCard(
                title = "1-on-1 Experts",
                subtitle = if (coachCount > 0) "$coachCount verified coaches" else "Consult top fitness coaches",
                pillText = "Video/Chat",
                icon = Icons.Default.Groups,
                tint = Color(0xFF0284C7),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToExperts
            )
        }
    }
}

@Composable
private fun ExploreZoneSection(
    supplementCount: Int,
    centerCount: Int,
    communityCount: Int,
    onNavigateToSupplements: () -> Unit,
    onMarketplace: () -> Unit,
    onNavigateToCommunity: () -> Unit,
    onNavigateToChallenges: () -> Unit
) {
    ZoneSection(title = "🏪 Discovery, Gyms & Community") {
        OverviewRow {
            EcosystemCard(
                title = "Wellness Store",
                subtitle = if (supplementCount > 0) "$supplementCount lab-tested items" else "Supplements & wellness gear",
                pillText = "Express",
                icon = Icons.Default.Store,
                tint = WellnessTheme.TealPrimary,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToSupplements
            )
            EcosystemCard(
                title = "Gyms & Centers",
                subtitle = if (centerCount > 0) "$centerCount fitness centers nearby" else "Explore partner gyms & passes",
                pillText = "Passes & QR",
                icon = Icons.Default.FitnessCenter,
                tint = Color(0xFF0D9488),
                modifier = Modifier.weight(1f),
                onClick = onMarketplace
            )
        }
        OverviewRow {
            EcosystemCard(
                title = "Community Tribes",
                subtitle = if (communityCount > 0) "$communityCount active groups" else "Join health tribes & share goals",
                pillText = "Social Feed",
                icon = Icons.AutoMirrored.Filled.TrendingUp,
                tint = Color(0xFFDB2777),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToCommunity
            )
            EcosystemCard(
                title = "Challenges & Ranks",
                subtitle = "Compete & unlock reward badges",
                pillText = "Leaderboards",
                icon = Icons.Default.EmojiEvents,
                tint = WellnessTheme.StarYellow,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToChallenges
            )
        }
    }
}

@Composable
private fun ClinicalZoneSection(
    onNavigateToReports: () -> Unit,
    onNavigateToAssessment: () -> Unit,
    onNavigateToSafety: () -> Unit,
    onHealthData: () -> Unit
) {
    ZoneSection(title = "📊 Clinical Intelligence & Safety") {
        OverviewRow {
            EcosystemCard(
                title = "Reports & Analytics",
                subtitle = "Workout summary & recovery trends",
                pillText = "Biometrics",
                icon = Icons.Default.BarChart,
                tint = WellnessTheme.TealDark,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToReports
            )
            EcosystemCard(
                title = "Health Assessment",
                subtitle = "Fitness goals, bio & screening",
                pillText = "Profile 100%",
                icon = Icons.Default.CheckCircle,
                tint = Color(0xFF059669),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToAssessment
            )
        }
        OverviewRow {
            EcosystemCard(
                title = "Clinical Safety",
                subtitle = "Pre-exercise clearance & alerts",
                pillText = "Doctor Verified",
                icon = Icons.Default.LocalHospital,
                tint = Color(0xFFDC2626),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToSafety
            )
            EcosystemCard(
                title = "Health Connect",
                subtitle = "Smartwatch, vitals & sleep sync",
                pillText = "Real-Time",
                icon = Icons.Default.Watch,
                tint = WellnessTheme.TealPrimary,
                modifier = Modifier.weight(1f),
                onClick = onHealthData
            )
        }
    }
}

@Composable
private fun ZoneSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = title,
            fontSize = 15.sp,
            fontWeight = FontWeight.ExtraBold,
            color = WellnessTheme.TealDeep
        )
        content()
    }
}

@Composable
private fun OverviewRow(content: @Composable RowScope.() -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        content()
    }
}

@Composable
private fun EcosystemCard(
    title: String,
    subtitle: String,
    pillText: String,
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2F3F0)),
        shadowElevation = 1.5.dp,
        modifier = modifier
            .height(132.dp)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFFF8FDFD), Color.White)))
                .padding(13.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = tint.copy(alpha = 0.12f),
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            icon,
                            contentDescription = null,
                            tint = tint,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                if (pillText.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = tint.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = pillText,
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = tint,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.5.sp,
                    color = WellnessTheme.TealDeep,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 14.5.sp,
                    minLines = 2,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// ==================== 7️⃣ QUICK ACTIONS LAUNCHPAD ====================

@Composable
private fun QuickActionsCard(
    onCalendar: () -> Unit,
    onQrCheckIn: () -> Unit,
    onTypedReports: () -> Unit,
    onReels: () -> Unit,
    onCoachDashboard: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = BorderStroke(1.dp, WellnessTheme.TealBorder.copy(alpha = 0.5f)),
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    Icons.Default.TrackChanges,
                    contentDescription = null,
                    tint = WellnessTheme.TealPrimary,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    "Quick Access Launchpad",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = WellnessTheme.TealDeep
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                QuickActionChip(
                    icon = Icons.Filled.CalendarMonth,
                    label = "Calendar",
                    color = WellnessTheme.TealDark,
                    onClick = onCalendar
                )
                QuickActionChip(
                    icon = Icons.Filled.QrCodeScanner,
                    label = "QR Pass",
                    color = WellnessTheme.TealPrimary,
                    onClick = onQrCheckIn
                )
                QuickActionChip(
                    icon = Icons.Filled.BarChart,
                    label = "Reports",
                    color = Color(0xFF0F766E),
                    onClick = onTypedReports
                )
                QuickActionChip(
                    icon = Icons.Filled.PlayCircleOutline,
                    label = "Reels",
                    color = Color(0xFFE11D48),
                    onClick = onReels
                )
                QuickActionChip(
                    icon = Icons.Filled.SwapHoriz,
                    label = "Coach Hub",
                    color = Color(0xFF7C3AED),
                    onClick = onCoachDashboard
                )
            }
        }
    }
}

@Composable
fun QuickActionChip(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Surface(
            shape = CircleShape,
            color = color.copy(alpha = 0.12f),
            modifier = Modifier.size(46.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(22.dp))
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

// ==================== 8️⃣ SKELETON / EMPTY / ERROR / SAFETY STATES ====================

@Composable
private fun HubSkeleton(modifier: Modifier = Modifier) {
    val shimmerBrush = rememberShimmerBrush()

    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Placeholder
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(shimmerBrush)
        )

        // 3 Biometric Cards Placeholder
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(modifier = Modifier.weight(1f).height(74.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
            Box(modifier = Modifier.weight(1f).height(74.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
            Box(modifier = Modifier.weight(1f).height(74.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
        }

        // Stepper Placeholder
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(shimmerBrush)
        )

        // Ecosystem Cards Placeholder
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(modifier = Modifier.weight(1f).height(110.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
            Box(modifier = Modifier.weight(1f).height(110.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(modifier = Modifier.weight(1f).height(110.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
            Box(modifier = Modifier.weight(1f).height(110.dp).clip(RoundedCornerShape(18.dp)).background(shimmerBrush))
        }
    }
}

@Composable
private fun HubEmptyState(error: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.padding(24.dp), contentAlignment = Alignment.Center) {
        Card(
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(3.dp)
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Filled.ErrorOutline,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(52.dp)
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    "Unable to load wellness dashboard",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 17.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    error,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(18.dp))
                OutlinedButton(onClick = onRetry) { Text("Try Again") }
            }
        }
    }
}

@Composable
private fun HubErrorCard(error: String, onRetry: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                error,
                color = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.weight(1f),
                fontSize = 12.sp
            )
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
        CircularProgressIndicator(
            modifier = Modifier.size(18.dp),
            strokeWidth = 2.dp,
            color = WellnessTheme.TealPrimary
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            "Syncing real-time biometrics…",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun WellnessSafetyFooter() {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = WellnessTheme.TealSurfaceVariant.copy(alpha = 0.4f),
        border = BorderStroke(1.dp, WellnessTheme.TealBorder.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                Icons.Default.LocalHospital,
                contentDescription = null,
                tint = WellnessTheme.TealDark,
                modifier = Modifier.size(20.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    "Clinical Safety & Medical Disclaimer",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp,
                    color = WellnessTheme.TealDeep
                )
                Text(
                    "Consult your certified physician before starting any intense physical regimen. If you experience discomfort, stop immediately and seek emergency medical attention.",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 15.sp
                )
            }
        }
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
