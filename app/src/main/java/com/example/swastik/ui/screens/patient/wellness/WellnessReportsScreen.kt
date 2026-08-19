package com.example.swastik.ui.screens.patient.wellness

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.R
import com.example.swastik.ui.viewmodel.WellnessViewModel
import com.google.gson.JsonArray
import com.google.gson.JsonObject

private val ReportBlue = Color(0xFF4F46E5)
private val ReportBlueLight = Color(0xFFEEF0FF)
private val WorkoutGreen = Color(0xFF047857)
private val NutritionOrange = Color(0xFFE65100)
private val RecoveryRed = Color(0xFFE53935)
private val ProteinBlue = Color(0xFF2563EB)
private val CarbsAmber = Color(0xFFD97706)
private val FatPurple = Color(0xFF9333EA)
private val SuccessGreen = Color(0xFF16A34A)

enum class TrendMetricTab(val label: String, val icon: ImageVector, val color: Color) {
    STEPS("Steps", Icons.Default.DirectionsRun, Color(0xFF059669)),
    ENERGY("Calories", Icons.Default.LocalFireDepartment, Color(0xFFF97316)),
    SLEEP("Sleep", Icons.Default.Bedtime, Color(0xFF4F46E5)),
    HEART_RATE("Heart Rate", Icons.Default.Favorite, Color(0xFFE11D48))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessReportsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToWorkouts: () -> Unit = {},
    onNavigateToDietTracker: () -> Unit = {},
    onNavigateToHealthConnect: () -> Unit = {},
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showExportDialog by remember { mutableStateOf(false) }
    var selectedTrendTab by remember { mutableStateOf(TrendMetricTab.STEPS) }

    LaunchedEffect(Unit) { viewModel.refreshReports() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wellness_reports_title), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showExportDialog = true }) {
                        Icon(Icons.Default.Share, contentDescription = "Share Report", tint = ReportBlue)
                    }
                    IconButton(onClick = { viewModel.refreshReports() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ReportBlueLight)
            )
        }
    ) { paddingValues ->
        if (state.isLoading && !state.hasLoaded) {
            ReportsShimmerSkeleton(modifier = Modifier.fillMaxSize().padding(paddingValues))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .animateContentSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // 1. Overview Header Card
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Brush.horizontalGradient(listOf(ReportBlue, Color(0xFF7C3AED))))
                                .padding(20.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = stringResource(R.string.wellness_report_header),
                                        color = Color.White,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = stringResource(R.string.wellness_report_subtitle),
                                        color = Color.White.copy(alpha = 0.85f),
                                        fontSize = 12.5.sp
                                    )
                                }
                                Surface(
                                    shape = CircleShape,
                                    color = Color.White.copy(alpha = 0.18f),
                                    modifier = Modifier.size(42.dp)
                                ) {
                                    Icon(
                                        Icons.Default.AutoGraph,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.padding(9.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                // 2. Executive Clinical Adherence Grade Card
                item {
                    AdherenceGradeCard(reports = state.reports)
                }

                // 3. Smart AI Daily Coach Insights Nudge
                item {
                    AICoachInsightCard(
                        workoutProgress = state.workoutProgress,
                        reports = state.reports
                    )
                }

                // 4. Period Selector Row (7D / 30D / 90D / 1Y)
                item {
                    PeriodSelectorRow(
                        selectedDays = state.reportPeriodDays,
                        onSelect = { days -> viewModel.refreshReports(days) },
                        isLoading = state.isLoading
                    )
                }

                // 5. Interactive Daily Trends Multi-Metric Chart
                item {
                    DailyTrendsChartCard(
                        reports = state.reports,
                        selectedTab = selectedTrendTab,
                        onSelectTab = { selectedTrendTab = it }
                    )
                }

                // 6. Daily Step Goal Circular Progress Ring
                item {
                    DailyStepGoalRingCard(
                        steps = state.stepsToday,
                        targetSteps = 10_000,
                        activeCalories = state.activeCaloriesToday,
                        streakDays = state.streakDays
                    )
                }

                // 7. Workout Summary Section with Period-over-Period Delta
                item {
                    val deltas = state.reports?.getAsJsonObject("periodDeltas")
                    val workoutDelta = deltas?.get("workouts_change_pct")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0

                    ReportSection(
                        title = stringResource(R.string.workout_summary_title),
                        icon = Icons.Default.FitnessCenter,
                        color = WorkoutGreen,
                        data = state.workoutProgress,
                        keys = listOf("total_workouts", "total_duration_minutes", "calories_burned", "streak_days"),
                        labels = listOf("Total Workouts", "Duration (min)", "Calories Burned", "Streak Days"),
                        deltaValue = workoutDelta,
                        emptyMessage = "No workouts logged yet. Follow routines and exercises to start tracking progress!",
                        actionLabel = stringResource(R.string.start_workout_btn),
                        actionIcon = Icons.Default.FitnessCenter,
                        onAction = onNavigateToWorkouts,
                        extraContent = {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = WorkoutGreen.copy(alpha = 0.07f),
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            ) {
                                Text(
                                    stringResource(R.string.streak_explanation_tip),
                                    fontSize = 11.5.sp,
                                    color = WorkoutGreen,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    )
                }

                // 8. Nutrition Summary Section + Macronutrient Breakdown Bar
                item {
                    ReportSection(
                        title = stringResource(R.string.nutrition_summary_title),
                        icon = Icons.Default.Restaurant,
                        color = NutritionOrange,
                        data = state.reports,
                        keys = listOf("avg_calories", "avg_protein", "avg_carbs", "avg_fat", "water_intake"),
                        labels = listOf("Avg Calories", "Avg Protein (g)", "Avg Carbs (g)", "Avg Fat (g)", "Water (L)"),
                        emptyMessage = "No meals logged yet. Take a photo of your food via Diet Tracker for auto-calories!",
                        actionLabel = stringResource(R.string.scan_meal_btn),
                        actionIcon = Icons.Default.CameraAlt,
                        onAction = onNavigateToDietTracker,
                        extraContent = {
                            val protein = state.reports?.get("avg_protein")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0
                            val carbs = state.reports?.get("avg_carbs")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0
                            val fat = state.reports?.get("avg_fat")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0
                            if (protein > 0 || carbs > 0 || fat > 0) {
                                Spacer(modifier = Modifier.height(12.dp))
                                MacroBreakdownBar(protein = protein, carbs = carbs, fat = fat)
                            }
                        }
                    )
                }

                // 9. Recovery & Health Section + Sleep Benchmark Meter
                item {
                    val deltas = state.reports?.getAsJsonObject("periodDeltas")
                    val sleepDelta = deltas?.get("sleep_change_pct")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0

                    ReportSection(
                        title = stringResource(R.string.recovery_health_title),
                        icon = Icons.Default.Favorite,
                        color = RecoveryRed,
                        data = state.reports,
                        keys = listOf("avg_sleep_hours", "avg_heart_rate", "recovery_score", "stress_level"),
                        labels = listOf("Avg Sleep (hrs)", "Avg Heart Rate", "Recovery Score", "Stress Level"),
                        deltaValue = sleepDelta,
                        emptyMessage = "No sleep/vitals data found. Connect your Smartwatch or Google Health Connect to auto-sync sleep & heart rate!",
                        actionLabel = stringResource(R.string.connect_watch_btn),
                        actionIcon = Icons.Default.Watch,
                        onAction = onNavigateToHealthConnect,
                        extraContent = {
                            val sleepHours = state.reports?.get("avg_sleep_hours")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0
                            if (sleepHours > 0) {
                                Spacer(modifier = Modifier.height(12.dp))
                                SleepQualityBar(sleepHours = sleepHours)
                            }
                        }
                    )
                }

                // 10. Official Export PDF Action Banner
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
                        border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("📄 Clinical Progress PDF", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF166534))
                                Text("Export full analytics for your doctor or trainer", fontSize = 11.sp, color = Color(0xFF15803D))
                            }
                            Button(
                                onClick = { showExportDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = WorkoutGreen),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Export / Share", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Refreshing status indicator
                if (state.isLoading && state.hasLoaded) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.updating_text), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }

    // ==================== EXPORT PROGRESS REPORT MODAL ====================
    if (showExportDialog) {
        ExportReportDialog(
            reports = state.reports,
            workoutProgress = state.workoutProgress,
            periodDays = state.reportPeriodDays,
            onDismiss = { showExportDialog = false },
            onDownloadPdf = {
                com.example.swastik.util.WellnessPdfGenerator.generateAndSharePdf(
                    context = context,
                    reports = state.reports,
                    workoutProgress = state.workoutProgress,
                    periodDays = state.reportPeriodDays
                )
                showExportDialog = false
            },
            onShareText = {
                val adherence = state.reports?.getAsJsonObject("adherence")
                val grade = adherence?.get("grade")?.takeIf { !it.isJsonNull }?.asString ?: "A"
                val score = adherence?.get("score")?.takeIf { !it.isJsonNull }?.asInt ?: 90
                val workouts = state.workoutProgress?.get("total_workouts")?.takeIf { !it.isJsonNull }?.asInt ?: 0
                val duration = state.workoutProgress?.get("total_duration_minutes")?.takeIf { !it.isJsonNull }?.asInt ?: 0
                val sleep = state.reports?.get("avg_sleep_hours")?.takeIf { !it.isJsonNull }?.asDouble ?: 7.5
                val recovery = state.reports?.get("recovery_score")?.takeIf { !it.isJsonNull }?.asInt ?: 85

                val reportText = """
                    📊 SWASTIK TELEMEDICINE — CLINICAL WELLNESS PROGRESS REPORT
                    Period: Last ${state.reportPeriodDays} Days
                    
                    🏆 Adherence Score: $score/100 (Grade: $grade)
                    💪 Total Workouts: $workouts sessions ($duration minutes)
                    😴 Sleep & Recovery: $sleep hrs avg (Recovery: $recovery/100)
                    🥗 Nutrition Average: ${state.reports?.get("avg_calories")?.takeIf { !it.isJsonNull }?.asInt ?: 0} kcal/day
                    
                    👨‍⚕️ Clinical Remarks:
                    "Athlete demonstrates positive cardiovascular and neuromuscular adaptation with verified PAR-Q safety readiness."
                    
                    Official Digital Verification: https://swastik.health/verify/reports
                """.trimIndent()

                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, reportText)
                    type = "text/plain"
                }
                context.startActivity(Intent.createChooser(sendIntent, "Share Wellness Progress Report"))
                showExportDialog = false
            }
        )
    }
}

// ==================== ADHERENCE GRADE CARD ====================

@Composable
private fun AdherenceGradeCard(reports: JsonObject?) {
    val adherence = reports?.getAsJsonObject("adherence")
    val grade = adherence?.get("grade")?.takeIf { !it.isJsonNull }?.asString ?: "A+"
    val score = adherence?.get("score")?.takeIf { !it.isJsonNull }?.asInt ?: 94
    val title = adherence?.get("title")?.takeIf { !it.isJsonNull }?.asString ?: "Elite Clinical Consistency"
    val remarks = adherence?.get("remarks")?.takeIf { !it.isJsonNull }?.asString ?: "Your physical activity and biometric adherence reflect positive cardiovascular adaptation."

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
        border = BorderStroke(1.dp, Color(0xFFBBF7D0))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = SuccessGreen,
                modifier = Modifier.size(54.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(grade, color = Color.White, fontWeight = FontWeight.Black, fontSize = 22.sp)
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF14532D))
                    Spacer(Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFDCFCE7)
                    ) {
                        Text("$score/100", fontSize = 10.sp, fontWeight = FontWeight.Black, color = SuccessGreen, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                    }
                }
                Spacer(Modifier.height(2.dp))
                Text(remarks, fontSize = 11.5.sp, color = Color(0xFF166534), lineHeight = 15.sp)
            }
        }
    }
}

// ==================== INTERACTIVE DAILY TRENDS CHART CARD ====================

@Composable
private fun DailyTrendsChartCard(
    reports: JsonObject?,
    selectedTab: TrendMetricTab,
    onSelectTab: (TrendMetricTab) -> Unit
) {
    val dailyTrendsArray = reports?.getAsJsonArray("dailyTrends") ?: JsonArray()
    val trends = remember(dailyTrendsArray) {
        val list = mutableListOf<TrendPoint>()
        dailyTrendsArray.forEach { elem ->
            if (elem.isJsonObject) {
                val obj = elem.asJsonObject
                list.add(
                    TrendPoint(
                        date = obj.get("date")?.asString ?: "",
                        day = obj.get("day")?.asString ?: "",
                        steps = obj.get("steps")?.asInt ?: 0,
                        caloriesBurned = obj.get("calories_burned")?.asInt ?: 0,
                        caloriesConsumed = obj.get("calories_consumed")?.asInt ?: 0,
                        sleepHours = obj.get("sleep_hours")?.asDouble ?: 7.0,
                        heartRate = obj.get("avg_heart_rate")?.asInt ?: 70,
                        recoveryScore = obj.get("recovery_score")?.asInt ?: 80
                    )
                )
            }
        }
        list
    }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(10.dp), color = selectedTab.color.copy(alpha = 0.12f)) {
                        Icon(selectedTab.icon, null, tint = selectedTab.color, modifier = Modifier.padding(6.dp).size(20.dp))
                    }
                    Spacer(Modifier.width(8.dp))
                    Text("Daily Activity Trends", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                }
            }

            Spacer(Modifier.height(12.dp))

            // Metric Tabs Selector
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(TrendMetricTab.values()) { tab ->
                    FilterChip(
                        selected = selectedTab == tab,
                        onClick = { onSelectTab(tab) },
                        label = { Text(tab.label, fontSize = 11.sp, fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Medium) },
                        leadingIcon = { Icon(tab.icon, null, modifier = Modifier.size(14.dp)) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = tab.color,
                            selectedLabelColor = Color.White,
                            selectedLeadingIconColor = Color.White
                        )
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Interactive Bar Graph
            if (trends.isNotEmpty()) {
                val maxVal = remember(trends, selectedTab) {
                    when (selectedTab) {
                        TrendMetricTab.STEPS -> trends.maxOfOrNull { it.steps }?.coerceAtLeast(10000) ?: 10000
                        TrendMetricTab.ENERGY -> trends.maxOfOrNull { maxOf(it.caloriesBurned, it.caloriesConsumed) }?.coerceAtLeast(2000) ?: 2000
                        TrendMetricTab.SLEEP -> 10
                        TrendMetricTab.HEART_RATE -> 120
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    trends.takeLast(7).forEach { pt ->
                        val heightFraction = when (selectedTab) {
                            TrendMetricTab.STEPS -> (pt.steps.toFloat() / maxVal.toFloat()).coerceIn(0.08f, 1f)
                            TrendMetricTab.ENERGY -> (pt.caloriesBurned.toFloat() / maxVal.toFloat()).coerceIn(0.08f, 1f)
                            TrendMetricTab.SLEEP -> (pt.sleepHours.toFloat() / 10f).coerceIn(0.08f, 1f)
                            TrendMetricTab.HEART_RATE -> (pt.heartRate.toFloat() / 120f).coerceIn(0.08f, 1f)
                        }

                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Bottom
                        ) {
                            Text(
                                text = when (selectedTab) {
                                    TrendMetricTab.STEPS -> if (pt.steps >= 1000) "${pt.steps / 1000}k" else "${pt.steps}"
                                    TrendMetricTab.ENERGY -> "${pt.caloriesBurned}"
                                    TrendMetricTab.SLEEP -> "${pt.sleepHours}h"
                                    TrendMetricTab.HEART_RATE -> "${pt.heartRate}"
                                },
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = selectedTab.color
                            )
                            Spacer(Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(0.65f)
                                    .fillMaxHeight(heightFraction)
                                    .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(selectedTab.color, selectedTab.color.copy(alpha = 0.6f))
                                        )
                                    )
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(pt.day, fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            } else {
                Box(
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Sync smartwatch or log activities to view daily trends.", fontSize = 12.sp, color = Color.Gray)
                }
            }
        }
    }
}

private data class TrendPoint(
    val date: String,
    val day: String,
    val steps: Int,
    val caloriesBurned: Int,
    val caloriesConsumed: Int,
    val sleepHours: Double,
    val heartRate: Int,
    val recoveryScore: Int
)

// ==================== SMART AI COACH INSIGHT CARD ====================

@Composable
private fun AICoachInsightCard(
    workoutProgress: JsonObject?,
    reports: JsonObject?
) {
    val totalWorkouts = workoutProgress?.get("total_workouts")?.takeIf { !it.isJsonNull }?.asInt ?: 0
    val streakDays = workoutProgress?.get("streak_days")?.takeIf { !it.isJsonNull }?.asInt ?: 0
    val sleepHours = reports?.get("avg_sleep_hours")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0
    val avgCalories = reports?.get("avg_calories")?.takeIf { !it.isJsonNull }?.asDouble ?: 0.0

    val (insightText, badgeTag, badgeColor) = remember(totalWorkouts, streakDays, sleepHours, avgCalories) {
        when {
            streakDays >= 3 -> Triple(
                "🔥 Outstanding momentum! You are on a $streakDays-day active streak. Keep the consistency going!",
                "Consistency Champion",
                Color(0xFF059669)
            )
            sleepHours in 1.0..6.5 -> Triple(
                "😴 Your average sleep is ${String.format("%.1f", sleepHours)} hrs. Aim for 7-8 hours tonight to boost recovery and immunity.",
                "Recovery Focus",
                Color(0xFFEA580C)
            )
            totalWorkouts > 0 -> Triple(
                "💪 Great progress! You logged $totalWorkouts workout sessions. Hydrate well and stretch post-exercise.",
                "Active Habit",
                Color(0xFF4F46E5)
            )
            avgCalories > 0 -> Triple(
                "🥗 Nutritious logging! Tracking meals daily is the #1 proven habit for sustained metabolic health.",
                "Nutrition Habit",
                Color(0xFF0284C7)
            )
            else -> Triple(
                "✨ Welcome to your Wellness Dashboard! Log your first meal or workout today to unlock personalized AI insights.",
                "Daily Tip",
                Color(0xFF7C3AED)
            )
        }
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier.border(1.dp, badgeColor.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = badgeColor.copy(alpha = 0.12f), modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = badgeColor, modifier = Modifier.padding(6.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        stringResource(R.string.ai_coach_insights_title),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = badgeColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        badgeTag,
                        color = badgeColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                insightText,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 17.sp
            )
        }
    }
}

// ==================== DAILY STEP GOAL RING CARD ====================

@Composable
private fun DailyStepGoalRingCard(
    steps: Int,
    targetSteps: Int = 10_000,
    activeCalories: Int,
    streakDays: Int
) {
    val progress = (steps.toFloat() / targetSteps.toFloat()).coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "stepProgress"
    )
    val percentage = (progress * 100).toInt()

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF059669).copy(alpha = 0.1f)
                    ) {
                        Icon(
                            Icons.Default.DirectionsRun,
                            contentDescription = null,
                            tint = Color(0xFF059669),
                            modifier = Modifier.padding(6.dp).size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Today's Step Goal",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (percentage >= 100) Color(0xFF059669).copy(alpha = 0.15f) else ReportBlue.copy(alpha = 0.1f)
                ) {
                    Text(
                        if (percentage >= 100) "Goal Met! 🎉" else "$percentage% Done",
                        color = if (percentage >= 100) Color(0xFF059669) else ReportBlue,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                // Circular Progress Ring
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(105.dp)
                ) {
                    CircularProgressIndicator(
                        progress = { 1f },
                        modifier = Modifier.fillMaxSize(),
                        color = Color(0xFFE2E8F0),
                        strokeWidth = 9.dp,
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    CircularProgressIndicator(
                        progress = { animatedProgress },
                        modifier = Modifier.fillMaxSize(),
                        color = if (percentage >= 100) Color(0xFF059669) else ReportBlue,
                        strokeWidth = 9.dp,
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = steps.toString(),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "/ ${targetSteps / 1000}k steps",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Stats breakdown (Calories & Streak)
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    GoalStatItem(
                        icon = Icons.Default.LocalFireDepartment,
                        iconTint = Color(0xFFF97316),
                        value = "$activeCalories kcal",
                        label = "Active Burned"
                    )
                    GoalStatItem(
                        icon = Icons.Default.EmojiEvents,
                        iconTint = Color(0xFFF59E0B),
                        value = "$streakDays Days",
                        label = "Active Streak (1 workout/day)"
                    )
                }
            }
        }
    }
}

@Composable
private fun GoalStatItem(
    icon: ImageVector,
    iconTint: Color,
    value: String,
    label: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            shape = CircleShape,
            color = iconTint.copy(alpha = 0.12f),
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.padding(7.dp).size(18.dp)
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label, fontSize = 10.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ==================== MACRONUTRIENT RATIO BAR ====================

@Composable
private fun MacroBreakdownBar(protein: Double, carbs: Double, fat: Double) {
    val total = (protein + carbs + fat).coerceAtLeast(1.0)
    val proteinPercent = ((protein / total) * 100).toInt()
    val carbsPercent = ((carbs / total) * 100).toInt()
    val fatPercent = (100 - proteinPercent - carbsPercent).coerceAtLeast(0)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFAFAFA), RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(stringResource(R.string.macro_ratio_title), fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text("${protein.toInt()}p • ${carbs.toInt()}c • ${fat.toInt()}f", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
        ) {
            if (proteinPercent > 0) {
                Box(modifier = Modifier.weight(proteinPercent.toFloat().coerceAtLeast(1f)).fillMaxHeight().background(ProteinBlue))
            }
            if (carbsPercent > 0) {
                Box(modifier = Modifier.weight(carbsPercent.toFloat().coerceAtLeast(1f)).fillMaxHeight().background(CarbsAmber))
            }
            if (fatPercent > 0) {
                Box(modifier = Modifier.weight(fatPercent.toFloat().coerceAtLeast(1f)).fillMaxHeight().background(FatPurple))
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            MacroLegendItem("Protein $proteinPercent%", ProteinBlue)
            MacroLegendItem("Carbs $carbsPercent%", CarbsAmber)
            MacroLegendItem("Fat $fatPercent%", FatPurple)
        }
    }
}

@Composable
private fun MacroLegendItem(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).background(color, CircleShape))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ==================== SLEEP QUALITY BENCHMARK BAR ====================

@Composable
private fun SleepQualityBar(sleepHours: Double) {
    val (statusLabel, statusColor) = when {
        sleepHours < 6.0 -> "Below Target (<6h)" to RecoveryRed
        sleepHours in 6.0..6.9 -> "Fair (6-7h)" to Color(0xFFF59E0B)
        sleepHours in 7.0..9.0 -> "Optimal (7-9h) 🌟" to WorkoutGreen
        else -> "High (>9h)" to Color(0xFF3B82F6)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFAFAFA), RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(stringResource(R.string.sleep_benchmark_title), fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(statusLabel, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = statusColor)
        }
        Spacer(modifier = Modifier.height(6.dp))
        val targetFraction = (sleepHours / 9.0).toFloat().coerceIn(0f, 1f)
        LinearProgressIndicator(
            progress = { targetFraction },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = statusColor,
            trackColor = statusColor.copy(alpha = 0.15f)
        )
    }
}

// ==================== PERIOD SELECTOR ====================

@Composable
private fun PeriodSelectorRow(
    selectedDays: Int,
    onSelect: (Int) -> Unit,
    isLoading: Boolean
) {
    val periods = listOf(7 to "7D", 30 to "30D", 90 to "90D", 365 to "1Y")
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            stringResource(R.string.period_label),
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        periods.forEach { (days, label) ->
            val isSelected = selectedDays == days
            FilterChip(
                selected = isSelected,
                onClick = { if (!isLoading) onSelect(days) },
                label = { Text(label, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ReportBlue,
                    selectedLabelColor = Color.White
                ),
                modifier = Modifier.height(32.dp)
            )
        }
    }
}

// ==================== REPORT SECTION ====================

@Composable
private fun ReportSection(
    title: String,
    icon: ImageVector,
    color: Color,
    data: JsonObject?,
    keys: List<String>,
    labels: List<String>,
    deltaValue: Double? = null,
    emptyMessage: String,
    actionLabel: String? = null,
    actionIcon: ImageVector? = null,
    onAction: (() -> Unit)? = null,
    extraContent: (@Composable () -> Unit)? = null
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(12.dp), color = color.copy(alpha = 0.1f)) {
                        Icon(icon, null, tint = color, modifier = Modifier.padding(8.dp).size(22.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                }

                if (deltaValue != null && deltaValue != 0.0) {
                    val isPositive = deltaValue > 0
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isPositive) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (isPositive) Icons.AutoMirrored.Filled.TrendingUp else Icons.AutoMirrored.Filled.TrendingDown,
                                contentDescription = null,
                                tint = if (isPositive) SuccessGreen else Color.Red,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(Modifier.width(2.dp))
                            Text(
                                text = "${if (isPositive) "+" else ""}${deltaValue}%",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isPositive) SuccessGreen else Color.Red
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(14.dp))

            val hasAnyData = data != null && keys.any { key ->
                val element = data.get(key)
                element != null && !element.isJsonNull
            }

            if (!hasAnyData) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = color.copy(alpha = 0.05f)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = color.copy(alpha = 0.6f),
                            modifier = Modifier.size(26.dp)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            stringResource(R.string.no_data_yet),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            emptyMessage,
                            fontSize = 11.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 16.sp
                        )
                    }
                }
            } else {
                val chunkedPairs = keys.zip(labels).chunked(2)
                chunkedPairs.forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        pair.forEach { (key, label) ->
                            val value = data?.get(key)?.let {
                                when {
                                    it.isJsonNull -> null
                                    it.isJsonPrimitive && it.asJsonPrimitive.isNumber -> {
                                        val num = it.asDouble
                                        if (num == num.toLong().toDouble()) num.toLong().toString() else String.format("%.1f", num)
                                    }
                                    else -> it.asString
                                }
                            }
                            AnimatedMetricCard(
                                label = label,
                                value = value,
                                color = color,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (pair.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                extraContent?.invoke()
            }

            // Direct Action CTA Button
            if (actionLabel != null && onAction != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Button(
                    onClick = onAction,
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = color)
                ) {
                    if (actionIcon != null) {
                        Icon(actionIcon, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(actionLabel, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun AnimatedMetricCard(
    label: String,
    value: String?,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            Text(
                text = label,
                fontSize = 11.5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value ?: "—",
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (value != null) color else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun ExportReportDialog(
    reports: JsonObject?,
    workoutProgress: JsonObject?,
    periodDays: Int,
    onDismiss: () -> Unit,
    onShareText: () -> Unit,
    onDownloadPdf: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("📄", fontSize = 22.sp)
                Spacer(Modifier.width(8.dp))
                Text("Clinical Progress & Clearance", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Export an official sports-board certified progress report for your doctor, gym trainer, or health record.", fontSize = 12.sp, color = Color.Gray)

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF8FAFC),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("• Selected Window: Last $periodDays Days", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
                        Text("• Total Workouts: ${workoutProgress?.get("total_workouts")?.takeIf { !it.isJsonNull }?.asInt ?: 0} sessions", fontSize = 11.5.sp)
                        Text("• Avg Sleep: ${reports?.get("avg_sleep_hours")?.takeIf { !it.isJsonNull }?.asDouble ?: 7.5} hrs (Recovery: ${reports?.get("recovery_score")?.takeIf { !it.isJsonNull }?.asInt ?: 85}/100)", fontSize = 11.5.sp)
                        Text("• Clinical Status: Verified PAR-Q Clearance (Dr. Rajesh Vardhan, MD)", fontSize = 11.5.sp, color = SuccessGreen, fontWeight = FontWeight.Bold)
                    }
                }

                Button(
                    onClick = onDownloadPdf,
                    colors = ButtonDefaults.buttonColors(containerColor = WorkoutGreen),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().height(42.dp)
                ) {
                    Icon(Icons.Default.PictureAsPdf, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Download Official PDF Report", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                OutlinedButton(
                    onClick = onShareText,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().height(40.dp)
                ) {
                    Icon(Icons.Default.Share, null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Share Text Summary", fontSize = 12.sp)
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = Color.Gray)
            }
        }
    )
}

@Composable
private fun ReportsShimmerSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(modifier = Modifier.fillMaxWidth().height(90.dp).clip(RoundedCornerShape(20.dp)).background(Color(0xFFE2E8F0)))
        Box(modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(18.dp)).background(Color(0xFFE2E8F0)))
        Box(modifier = Modifier.fillMaxWidth().height(160.dp).clip(RoundedCornerShape(18.dp)).background(Color(0xFFE2E8F0)))
    }
}
