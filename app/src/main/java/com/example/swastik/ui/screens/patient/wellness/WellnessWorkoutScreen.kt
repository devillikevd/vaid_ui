package com.example.swastik.ui.screens.patient.wellness

import android.net.Uri
import android.os.Build
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.PatientWorkoutPlanDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import com.example.swastik.ui.viewmodel.WellnessViewModel
import kotlinx.coroutines.delay
import java.util.Locale

private val WellnessGreen = Color(0xFF047857)
private val WellnessGreenLight = Color(0xFFE8F8EF)
private val WellnessGreenDark = Color(0xFF14532D)

// Comprehensive categories mapping to all 1,324 exercises across all muscle groups
private val BODY_PART_CATEGORIES = listOf(
    "All" to "🌟 All (1,324)",
    "abs" to "🧘 Abs & Core",
    "arms" to "💪 Arms & Biceps",
    "chest" to "🥋 Chest & Pectorals",
    "back" to "🔙 Back & Lats",
    "shoulders" to "🏔️ Shoulders & Delts",
    "legs" to "🦵 Legs & Quads",
    "glutes" to "🍑 Glutes & Hips",
    "calves" to "🦿 Calves & Shins",
    "cardio" to "❤️ Cardio & HIIT",
    "stretching" to "🤸 Flexibility & Mobility"
)

data class SubMuscleItem(
    val key: String?,
    val label: String,
    val count: String
)

private val REGION_SUB_MUSCLES: Map<String, List<SubMuscleItem>> = mapOf(
    "arms" to listOf(
        SubMuscleItem(null, "All Arms", "329"),
        SubMuscleItem("biceps", "🥊 Biceps", "151"),
        SubMuscleItem("triceps", "⚡ Triceps", "141"),
        SubMuscleItem("forearms", "🤲 Forearms", "37")
    ),
    "legs" to listOf(
        SubMuscleItem(null, "All Legs", "286"),
        SubMuscleItem("glutes", "🍑 Glutes & Hips", "144"),
        SubMuscleItem("quads", "🦵 Quads (Thighs)", "44"),
        SubMuscleItem("calves", "🦿 Calves", "59"),
        SubMuscleItem("hamstrings", "🏃 Hamstrings", "28")
    ),
    "back" to listOf(
        SubMuscleItem(null, "All Back", "203"),
        SubMuscleItem("upper back", "📐 Upper Back", "88"),
        SubMuscleItem("lats", "🦇 Lats & Wings", "81"),
        SubMuscleItem("spine", "📏 Lower Back & Spine", "19"),
        SubMuscleItem("traps", "🏔️ Trapezius", "15")
    ),
    "abs" to listOf(
        SubMuscleItem(null, "All Core", "169"),
        SubMuscleItem("abs", "🍫 6-Pack Abs", "120"),
        SubMuscleItem("waist", "🌀 Obliques & Waist", "49")
    ),
    "chest" to listOf(
        SubMuscleItem(null, "All Chest", "163"),
        SubMuscleItem("pectorals", "🥋 Pectorals", "158"),
        SubMuscleItem("serratus anterior", "🪽 Serratus Ribs", "5")
    ),
    "shoulders" to listOf(
        SubMuscleItem(null, "All Shoulders", "143"),
        SubMuscleItem("delts", "🏔️ Deltoids", "143")
    ),
    "cardio" to listOf(
        SubMuscleItem(null, "All Cardio", "56"),
        SubMuscleItem("cardiovascular system", "❤️ Aerobic Endurance", "29"),
        SubMuscleItem("plyometrics", "⚡ Plyometrics / Jump", "27")
    ),
    "stretching" to listOf(
        SubMuscleItem(null, "All Mobility", "58"),
        SubMuscleItem("stretching", "🧘 Full Body Stretches", "57"),
        SubMuscleItem("yoga", "🕉️ Yoga Alignment", "1")
    )
)

private val LEVEL_OPTIONS = listOf("All", "Beginner", "Intermediate", "Advanced")

private val PLAN_GOAL_FILTERS = listOf(
    "All" to "🌟 All Plans",
    "strength" to "🏋️ Strength",
    "yoga" to "🧘 Yoga & Mobility",
    "weight_loss" to "🏃 Fat Loss",
    "home" to "🏠 Home Only"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessWorkoutScreen(
    onNavigateBack: () -> Unit,
    onNavigateToWorkoutPlayer: (String) -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Workout Plans", "Exercise Library")

    var selectedPlanForPreview by remember { mutableStateOf<WellnessWorkoutPlanDto?>(null) }
    var selectedExerciseForPractice by remember { mutableStateOf<ExerciseLibraryDto?>(null) }

    LaunchedEffect(Unit) { viewModel.refreshWorkouts() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Workouts & Training", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshWorkouts) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = WellnessGreenLight)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = WellnessGreenLight,
                contentColor = WellnessGreen,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = WellnessGreen
                    )
                }
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                title,
                                fontWeight = if (selectedTab == index) FontWeight.ExtraBold else FontWeight.Medium,
                                fontSize = 14.sp
                            )
                        }
                    )
                }
            }

            when (selectedTab) {
                0 -> {
                    if (state.isLoading) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = WellnessGreen)
                        }
                    } else {
                        WorkoutPlansTab(
                            plans = state.workoutPlans,
                            activePlan = state.activePlan,
                            onPlanClick = { plan -> selectedPlanForPreview = plan }
                        )
                    }
                }
                1 -> ExerciseLibraryTab(
                    state = state,
                    viewModel = viewModel,
                    onPracticeClick = { exercise -> selectedExerciseForPractice = exercise }
                )
            }
        }

        // Plan Preview Modal / Bottom Sheet
        selectedPlanForPreview?.let { plan ->
            PlanPreviewModal(
                plan = plan,
                onDismiss = { selectedPlanForPreview = null },
                onStartPlan = {
                    selectedPlanForPreview = null
                    onNavigateToWorkoutPlayer(plan.id)
                }
            )
        }

        // Quick Practice Exercise Modal
        selectedExerciseForPractice?.let { exercise ->
            QuickExercisePracticeModal(
                exercise = exercise,
                onDismiss = { selectedExerciseForPractice = null }
            )
        }
    }
}

// ==================== WORKOUT PLANS TAB ====================

@Composable
private fun WorkoutPlansTab(
    plans: List<WellnessWorkoutPlanDto>,
    activePlan: PatientWorkoutPlanDto?,
    onPlanClick: (WellnessWorkoutPlanDto) -> Unit
) {
    var selectedGoalFilter by remember { mutableStateOf("All") }

    val filteredPlans = remember(plans, selectedGoalFilter) {
        if (selectedGoalFilter == "All") {
            plans
        } else {
            plans.filter { plan ->
                val goal = (plan.goal ?: "").lowercase()
                val planType = (plan.planType ?: "").lowercase()
                val location = (plan.locationType ?: "").lowercase()
                when (selectedGoalFilter) {
                    "strength" -> goal.contains("strength") || planType.contains("strength")
                    "yoga" -> goal.contains("yoga") || goal.contains("stress") || planType.contains("yoga")
                    "weight_loss" -> goal.contains("weight") || goal.contains("fat") || planType.contains("walking")
                    "home" -> location.contains("home")
                    else -> true
                }
            }
        }
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Active Assigned Plan Hero Card (If user has one active)
        if (activePlan != null) {
            item {
                ActivePlanHeroCard(
                    activePlan = activePlan,
                    onResumeWorkout = {
                        val plan = activePlan.plan
                        if (plan != null) onPlanClick(plan)
                    }
                )
            }
        }

        // Goal Filter Pills
        item {
            Column {
                Text(
                    "Browse Training Programs 📋",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PLAN_GOAL_FILTERS) { (id, label) ->
                        val isSelected = selectedGoalFilter == id
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) WellnessGreen else Color(0xFFF1F5F9),
                            border = if (isSelected) null else BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.clickable { selectedGoalFilter = id }
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) Color.White else Color(0xFF334155),
                                fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                            )
                        }
                    }
                }
            }
        }

        if (filteredPlans.isEmpty()) {
            item {
                EmptyStateCard(
                    icon = Icons.Default.FitnessCenter,
                    title = "No Plans for this Category",
                    message = "Try selecting 'All Plans' to view all available workout routines."
                )
            }
        } else {
            items(filteredPlans) { plan ->
                WorkoutPlanCard(plan, onClick = { onPlanClick(plan) })
            }
        }
    }
}

@Composable
private fun ActivePlanHeroCard(
    activePlan: PatientWorkoutPlanDto,
    onResumeWorkout: () -> Unit
) {
    val planTitle = activePlan.plan?.title ?: "My Active Workout Program"
    val streakDays = activePlan.streakDays ?: 0

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFF065F46), Color(0xFF047857), Color(0xFF0F766E))
                    )
                )
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color.White.copy(alpha = 0.2f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("ACTIVE PROGRAM 🔥", color = Color.White, fontSize = 10.5.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
                if (streakDays > 0) {
                    Text("🔥 $streakDays Day Streak", color = Color(0xFFFDE047), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(planTitle, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color.White)
            Spacer(modifier = Modifier.height(4.dp))
            Text("Keep your momentum going! Complete today's guided session.", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f))

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = onResumeWorkout,
                modifier = Modifier.fillMaxWidth().height(46.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = WellnessGreen, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Resume Today's Workout ➔", color = WellnessGreen, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun WorkoutPlanCard(plan: WellnessWorkoutPlanDto, onClick: () -> Unit) {
    val (thematicGradient, thematicIcon, categoryBadgeColor) = getPlanTheme(plan.goal, plan.planType)

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Cover Header with Thematic Illustration & Gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            ) {
                if (!plan.coverImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(plan.coverImageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = plan.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(thematicGradient),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Surface(
                                shape = CircleShape,
                                color = Color.White.copy(alpha = 0.2f),
                                modifier = Modifier.size(60.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        thematicIcon,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                formatGoalTag(plan.goal),
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Level badge top right
                plan.level?.let { level ->
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = when (level.lowercase()) {
                            "beginner" -> Color(0xFF059669)
                            "intermediate" -> Color(0xFFD97706)
                            "advanced" -> Color(0xFFDC2626)
                            else -> categoryBadgeColor
                        }
                    ) {
                        Text(
                            level.replaceFirstChar { it.uppercase() },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                }
            }

            // Content Body
            Column(modifier = Modifier.padding(16.dp)) {
                Text(plan.title, fontWeight = FontWeight.ExtraBold, fontSize = 17.5.sp)
                plan.description?.let {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        it,
                        fontSize = 12.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 17.sp
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Metadata chips (Clean formatted tags using FlowRow)
                @OptIn(ExperimentalLayoutApi::class)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    MetadataChip(icon = Icons.Default.Flag, text = formatGoalTag(plan.goal))
                    plan.minutesPerSession?.let { MetadataChip(icon = Icons.Default.Timer, text = "${it} min") }
                    plan.durationWeeks?.let { MetadataChip(icon = Icons.Default.CalendarMonth, text = "${it} wks") }
                    plan.daysPerWeek?.let { days ->
                        MetadataChip(icon = Icons.Default.DateRange, text = "$days days/wk")
                    }
                    val estCalories = (plan.minutesPerSession ?: 30) * 10
                    MetadataChip(icon = Icons.Default.LocalFireDepartment, text = "~$estCalories kcal")
                    plan.locationType?.let {
                        MetadataChip(icon = Icons.Default.Place, text = it.replace("_", " ").split(" ").joinToString(" ") { c -> c.replaceFirstChar { ch -> ch.uppercase() } })
                    }
                }

                // Equipment Tags
                if (!plan.equipment.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("Gear:", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        plan.equipment.take(3).forEach { equip ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = categoryBadgeColor.copy(alpha = 0.08f)
                            ) {
                                Text(
                                    formatEquipmentTag(equip),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = categoryBadgeColor
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Direct Action CTA Button
                Button(
                    onClick = onClick,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = categoryBadgeColor)
                ) {
                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Explore Plan Details ➔", fontWeight = FontWeight.ExtraBold, fontSize = 13.5.sp)
                }
            }
        }
    }
}

// ==================== PLAN PREVIEW BOTTOM SHEET MODAL ====================

@Composable
private fun PlanPreviewModal(
    plan: WellnessWorkoutPlanDto,
    onDismiss: () -> Unit,
    onStartPlan: () -> Unit
) {
    val (_, _, themeColor) = getPlanTheme(plan.goal, plan.planType)

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(6.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                // Top Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = themeColor.copy(alpha = 0.12f)
                    ) {
                        Text(
                            formatGoalTag(plan.goal),
                            color = themeColor,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, null, tint = Color.Gray)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text(plan.title, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    plan.description ?: "Structured multi-week clinical training routine designed for steady progression.",
                    fontSize = 12.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 17.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Stats Matrix
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PlanStatBox("Duration", "${plan.durationWeeks ?: 4} Weeks", Icons.Default.CalendarMonth, Modifier.weight(1f))
                    PlanStatBox("Schedule", "${plan.daysPerWeek ?: 3} Days/Wk", Icons.Default.DateRange, Modifier.weight(1f))
                    PlanStatBox("Session", "${plan.minutesPerSession ?: 30} Mins", Icons.Default.Timer, Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 4-Week Syllabus Roadmap
                Text("4-Week Program Roadmap", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Spacer(modifier = Modifier.height(8.dp))

                val roadmap = listOf(
                    "Week 1: Movement Basics & Form Foundation",
                    "Week 2: Gradual Rep & Intensity Progression",
                    "Week 3: Core Strength & Endurance Peak",
                    "Week 4: Consolidation & Active Deload"
                )
                roadmap.forEachIndexed { index, step ->
                    Row(
                        modifier = Modifier.padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(shape = CircleShape, color = themeColor.copy(alpha = 0.15f), modifier = Modifier.size(18.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("${index + 1}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = themeColor)
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(step, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Start Day 1 CTA Button
                Button(
                    onClick = onStartPlan,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = themeColor)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Day 1 Session ➔", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                }
            }
        }
    }
}

@Composable
private fun PlanStatBox(label: String, value: String, icon: ImageVector, modifier: Modifier) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF8FAFC),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
            Text(label, fontSize = 10.sp, color = Color(0xFF64748B))
        }
    }
}

// ==================== EXERCISE LIBRARY TAB ====================

@Composable
private fun ExerciseLibraryTab(
    state: com.example.swastik.ui.viewmodel.WellnessUiState,
    viewModel: WellnessViewModel,
    onPracticeClick: (ExerciseLibraryDto) -> Unit
) {
    val context = LocalContext.current
    val gifImageLoader = remember {
        ImageLoader.Builder(context)
            .components {
                if (Build.VERSION.SDK_INT >= 28) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
            }
            .build()
    }

    val listState = rememberLazyListState()
    var searchText by remember { mutableStateOf("") }
    var selectedLevelIndex by remember { mutableIntStateOf(0) }

    // Detect scroll to end for pagination
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            val totalItems = listState.layoutInfo.totalItemsCount
            lastVisibleItem >= totalItems - 3 && totalItems > 0
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) viewModel.loadMoreExercises()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Search Bar
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(10.dp))
                BasicTextField(
                    value = searchText,
                    onValueChange = { newText ->
                        searchText = newText
                        viewModel.setExerciseSearch(newText)
                    },
                    singleLine = true,
                    textStyle = TextStyle(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(WellnessGreen),
                    modifier = Modifier.weight(1f),
                    decorationBox = { innerTextField ->
                        if (searchText.isEmpty()) {
                            Text("Search 1,300+ exercises...", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                        }
                        innerTextField()
                    }
                )
                if (searchText.isNotEmpty()) {
                    IconButton(onClick = { searchText = ""; viewModel.setExerciseSearch("") }, modifier = Modifier.size(20.dp)) {
                        Icon(Icons.Default.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // Category Chips (Horizontal Scroll)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 6.dp)
        ) {
            items(BODY_PART_CATEGORIES) { (categoryKey, displayLabel) ->
                val isSelected = (categoryKey == "All" && state.exerciseSelectedCategory == null)
                    || state.exerciseSelectedCategory == categoryKey
                FilterChip(
                    selected = isSelected,
                    onClick = {
                        viewModel.setExerciseCategory(if (categoryKey == "All") null else categoryKey)
                    },
                    label = {
                        Text(
                            displayLabel,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = WellnessGreen,
                        selectedLabelColor = Color.White
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
            }
        }

        // Level 2 Sub-Muscle Filter Chips (Smart Drilldown)
        val currentSubMuscles = remember(state.exerciseSelectedCategory) {
            state.exerciseSelectedCategory?.let { REGION_SUB_MUSCLES[it] }
        }
        AnimatedVisibility(
            visible = currentSubMuscles != null,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            if (currentSubMuscles != null) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(bottom = 6.dp)
                ) {
                    items(currentSubMuscles) { subItem ->
                        val isSubSelected = state.exerciseSelectedMuscle == subItem.key
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isSubSelected) Color(0xFF0F766E) else Color(0xFFF1F5F9),
                            border = if (isSubSelected) null else BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            modifier = Modifier.clickable {
                                viewModel.setExerciseMuscle(subItem.key)
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    subItem.label,
                                    fontSize = 11.5.sp,
                                    fontWeight = if (isSubSelected) FontWeight.ExtraBold else FontWeight.Medium,
                                    color = if (isSubSelected) Color.White else Color(0xFF334155)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "(${subItem.count})",
                                    fontSize = 10.sp,
                                    color = if (isSubSelected) Color.White.copy(alpha = 0.8f) else Color(0xFF64748B),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // Level Filter Row (Single-line wrapping fix)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Level:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            LEVEL_OPTIONS.forEachIndexed { index, level ->
                val isSelected = index == selectedLevelIndex
                val badgeColor = when (level.lowercase()) {
                    "beginner" -> Color(0xFF059669)
                    "intermediate" -> Color(0xFFD97706)
                    "advanced" -> Color(0xFFDC2626)
                    else -> WellnessGreen
                }
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (isSelected) badgeColor else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.clickable {
                        selectedLevelIndex = index
                        viewModel.setExerciseLevel(if (level == "All") null else level.lowercase())
                    }
                ) {
                    Text(
                        level,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                        fontSize = 11.5.sp,
                        fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
        }

        // Exercise Count Badge
        AnimatedVisibility(visible = state.exerciseTotalCount > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.FitnessCenter, null, tint = WellnessGreen, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "${state.exerciseTotalCount} exercises found",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = WellnessGreen
                )
            }
        }

        // Exercise List
        if (state.exercises.isEmpty() && !state.isLoading) {
            EmptyStateCard(
                icon = Icons.Default.SearchOff,
                title = "No Exercises Found",
                message = "Try clearing filters or searching for different keywords."
            )
        } else {
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(state.exercises) { exercise ->
                    ExerciseCard(
                        exercise = exercise,
                        imageLoader = gifImageLoader,
                        onPracticeClick = { onPracticeClick(exercise) }
                    )
                }

                // Loading more indicator
                if (state.isLoadingMoreExercises) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = WellnessGreen, modifier = Modifier.size(24.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExerciseCard(
    exercise: ExerciseLibraryDto,
    imageLoader: ImageLoader,
    onPracticeClick: () -> Unit
) {
    var showAnimation by remember { mutableStateOf(false) }
    var showVideo by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            // Media Container (GIF / Video)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(Color(0xFFF8FAFC))
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
                    .clickable {
                        if (!exercise.animationUrl.isNullOrBlank() && !showVideo) {
                            showAnimation = !showAnimation
                        }
                    }
            ) {
                if (showVideo && !exercise.videoUrl.isNullOrBlank()) {
                    ExoPlayerVideoView(videoUrl = exercise.videoUrl)
                } else if (!exercise.animationUrl.isNullOrBlank() && showAnimation) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(exercise.animationUrl)
                            .crossfade(true)
                            .build(),
                        imageLoader = imageLoader,
                        contentDescription = exercise.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                } else if (!exercise.thumbnailUrl.isNullOrBlank() || !exercise.animationUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(exercise.thumbnailUrl ?: exercise.animationUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = exercise.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.FitnessCenter, null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                    }
                }

                // Center Play button (only shown when NOT animating)
                if (!exercise.animationUrl.isNullOrBlank() && !showVideo && !showAnimation) {
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.Center)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = "Play Animation",
                            tint = Color.White,
                            modifier = Modifier.padding(14.dp).size(28.dp)
                        )
                    }
                }

                // Floating pause indicator pill when playing
                if (showAnimation && !showVideo) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Pause, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Pause", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Video toggle button
                if (!exercise.videoUrl.isNullOrBlank() && !showVideo) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(10.dp)
                            .clickable { showVideo = true; showAnimation = false },
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF2563EB).copy(alpha = 0.9f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Videocam, null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Video", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }

                // Media type badge top-left
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (!exercise.animationUrl.isNullOrBlank()) {
                        MediaBadge("GIF", Color(0xFF047857))
                    }
                    if (!exercise.videoUrl.isNullOrBlank()) {
                        MediaBadge("Video", Color(0xFF2563EB))
                    }
                }
            }

            // Exercise Details Body
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        exercise.name.replaceFirstChar { it.uppercase() },
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 17.sp,
                        modifier = Modifier.weight(1f)
                    )
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = WellnessGreen.copy(alpha = 0.12f),
                        modifier = Modifier.clickable { onPracticeClick() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Timer, null, tint = WellnessGreen, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Practice ⏱️", fontSize = 11.5.sp, fontWeight = FontWeight.ExtraBold, color = WellnessGreen)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Tags row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    exercise.targetMuscle?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, WellnessGreen)
                    }
                    exercise.bodyPart?.takeIf { it != exercise.targetMuscle }?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, Color(0xFF6A5AE0))
                    }
                    exercise.level?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, when (it.lowercase()) {
                            "beginner" -> Color(0xFF059669)
                            "intermediate" -> Color(0xFFD97706)
                            "advanced" -> Color(0xFFDC2626)
                            else -> WellnessGreen
                        })
                    }
                }

                // Equipment
                exercise.equipment?.takeIf { it.isNotEmpty() }?.let { equips ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Equipment: ${equips.joinToString(", ") { formatEquipmentTag(it) }}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Instructions (Expandable with animation)
                exercise.instructions?.takeIf { it.isNotEmpty() }?.let { instructions ->
                    var isExpanded by remember { mutableStateOf(false) }
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .animateContentSize()
                            .clickable { isExpanded = !isExpanded }
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.MenuBook, null, tint = WellnessGreen, modifier = Modifier.size(15.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "Form & Execution Guide",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFF334155)
                                    )
                                }
                                Icon(
                                    if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = Color(0xFF64748B),
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            if (isExpanded) {
                                Spacer(modifier = Modifier.height(8.dp))
                                HorizontalDivider(color = Color(0xFFE2E8F0))
                                Spacer(modifier = Modifier.height(8.dp))
                                instructions.forEachIndexed { index, instruction ->
                                    Text(
                                        "${index + 1}. $instruction",
                                        fontSize = 11.5.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 16.sp,
                                        modifier = Modifier.padding(vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== QUICK EXERCISE PRACTICE MODAL ====================

@Composable
private fun QuickExercisePracticeModal(
    exercise: ExerciseLibraryDto,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val gifImageLoader = remember {
        ImageLoader.Builder(context)
            .components {
                if (Build.VERSION.SDK_INT >= 28) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
            }
            .build()
    }

    var timerSeconds by remember { mutableIntStateOf(30) }
    var isRunning by remember { mutableStateOf(true) }
    var isFinished by remember { mutableStateOf(false) }

    LaunchedEffect(isRunning, timerSeconds) {
        if (isRunning && timerSeconds > 0) {
            delay(1000)
            timerSeconds--
            if (timerSeconds == 0) {
                isRunning = false
                isFinished = true
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(6.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Quick Practice ⏱️", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = WellnessGreen)
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, null, tint = Color.Gray)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    exercise.name.replaceFirstChar { it.uppercase() },
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Animated GIF preview
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFFF8FAFC))
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(exercise.animationUrl ?: exercise.thumbnailUrl)
                            .crossfade(true)
                            .build(),
                        imageLoader = gifImageLoader,
                        contentDescription = exercise.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                if (isFinished) {
                    Surface(shape = CircleShape, color = Color(0xFFE8F8EF), modifier = Modifier.size(60.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.CheckCircle, null, tint = WellnessGreen, modifier = Modifier.size(36.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Great Form! 🎉", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = WellnessGreen)
                    Text("Practice set completed.", fontSize = 12.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen)
                    ) {
                        Text("Done", fontWeight = FontWeight.Bold)
                    }
                } else {
                    // Timer Display
                    Text(
                        String.format(Locale.US, "%02d:%02d", timerSeconds / 60, timerSeconds % 60),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WellnessGreen
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        IconButton(
                            onClick = { isRunning = !isRunning },
                            modifier = Modifier.size(54.dp).background(WellnessGreenLight, CircleShape)
                        ) {
                            Icon(if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow, null, tint = WellnessGreen)
                        }
                        IconButton(
                            onClick = { timerSeconds = 30; isRunning = true; isFinished = false },
                            modifier = Modifier.size(54.dp).background(Color(0xFFF1F5F9), CircleShape)
                        ) {
                            Icon(Icons.Default.RestartAlt, null, tint = Color(0xFF475569))
                        }
                    }
                }
            }
        }
    }
}

private fun getPlanTheme(goal: String?, planType: String?): Triple<Brush, ImageVector, Color> {
    val key = "${goal ?: ""} ${planType ?: ""}".lowercase()
    return when {
        key.contains("yoga") || key.contains("stress") || key.contains("mobility") ->
            Triple(
                Brush.linearGradient(listOf(Color(0xFF4338CA), Color(0xFF6D28D9))),
                Icons.Default.SelfImprovement,
                Color(0xFF6D28D9)
            )
        key.contains("weight") || key.contains("walk") || key.contains("fat") || key.contains("cardio") ->
            Triple(
                Brush.linearGradient(listOf(Color(0xFFC2410C), Color(0xFFEA580C))),
                Icons.Default.DirectionsRun,
                Color(0xFFEA580C)
            )
        key.contains("strength") || key.contains("muscle") ->
            Triple(
                Brush.linearGradient(listOf(Color(0xFF065F46), Color(0xFF047857))),
                Icons.Default.FitnessCenter,
                Color(0xFF047857)
            )
        else ->
            Triple(
                Brush.linearGradient(listOf(Color(0xFF0F766E), Color(0xFF0D9488))),
                Icons.Default.SportsGymnastics,
                Color(0xFF0F766E)
            )
    }
}

private fun formatGoalTag(goal: String?): String = when (goal?.lowercase()?.trim()) {
    "general_fitness" -> "⚡ General Fitness"
    "stress_reduction", "stress_relief" -> "🧘 Stress Relief"
    "weight_loss" -> "🔥 Fat Loss"
    "muscle_gain" -> "🏋️ Muscle Gain"
    "endurance" -> "🏃 Endurance"
    "flexibility" -> "🤸 Flexibility"
    "rehabilitation" -> "🩹 Recovery"
    else -> goal?.replace("_", " ")?.split(" ")?.joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } } ?: "Fitness"
}

private fun formatEquipmentTag(equip: String): String = when (equip.lowercase().trim()) {
    "bodyweight", "body_weight" -> "Bodyweight"
    "mat", "yoga_mat" -> "Yoga Mat"
    "walking_shoes" -> "Walking Shoes"
    "dumbbells", "dumbbell" -> "Dumbbells"
    "resistance_bands" -> "Resistance Bands"
    else -> equip.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
}

@Composable
fun ExoPlayerVideoView(videoUrl: String) {
    val context = LocalContext.current
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
            prepare()
            playWhenReady = true
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = exoPlayer
                useController = true
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

// ==================== SHARED MICRO-COMPONENTS ====================

@Composable
private fun MetadataChip(icon: ImageVector, text: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFF1F5F9)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = Color(0xFF64748B), modifier = Modifier.size(13.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF334155),
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

@Composable
private fun TagChip(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.12f)
    ) {
        Text(
            text = text,
            color = color,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

@Composable
private fun MediaBadge(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.9f)
    ) {
        Text(
            text = text,
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 9.5.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
private fun EmptyStateCard(icon: ImageVector, title: String, message: String) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth().padding(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(message, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}
