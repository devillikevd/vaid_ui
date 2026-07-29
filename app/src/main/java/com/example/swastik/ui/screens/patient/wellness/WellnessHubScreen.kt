package com.example.swastik.ui.screens.patient.wellness

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Store
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
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.FitnessCenterDto
import com.example.swastik.data.remote.dto.TrustedSupplementDto
import com.example.swastik.data.remote.dto.WellnessChallengeDto
import com.example.swastik.data.remote.dto.WellnessCoachDto
import com.example.swastik.data.remote.dto.WellnessGroupDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import com.example.swastik.ui.viewmodel.WellnessViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessHubScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDietTracker: () -> Unit,
    onNavigateToHealthConnectDashboard: () -> Unit,
    onNavigateToEmergency: () -> Unit,
    onNavigateToFitnessCenters: () -> Unit,
    onNavigateToFitnessCenterDetail: (String) -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()

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
                    IconButton(onClick = viewModel::refresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { WellnessHero() }
            item { JourneyStrip() }
            item {
                WellnessDashboardCard(
                    workoutCount = state.workoutPlans.size,
                    coachCount = state.coaches.size,
                    centerCount = state.fitnessCenters.size,
                    communityCount = state.groups.size + state.challenges.size,
                    onLogMeal = onNavigateToDietTracker,
                    onHealthData = onNavigateToHealthConnectDashboard
                )
            }
            item {
                EcosystemOverviewGrid(
                    workoutCount = state.workoutPlans.size,
                    exerciseCount = state.exercises.size,
                    coachCount = state.coaches.size,
                    centerCount = state.fitnessCenters.size,
                    communityCount = state.groups.size + state.challenges.size,
                    supplementCount = state.supplements.size,
                    onLogMeal = onNavigateToDietTracker,
                    onHealthData = onNavigateToHealthConnectDashboard,
                    onMarketplace = onNavigateToFitnessCenters,
                    onEmergency = onNavigateToEmergency
                )
            }

            if (state.isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }

            state.error?.let { error ->
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(error, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
                            OutlinedButton(onClick = viewModel::refresh) { Text("Retry") }
                        }
                    }
                }
            }

            item {
                WorkoutSection(plans = state.workoutPlans)
            }
            item {
                ExerciseAnimationSection(exercises = state.exercises)
            }
            item {
                CoachSection(coaches = state.coaches)
            }
            item {
                MarketplaceSection(
                    centers = state.fitnessCenters,
                    onCenterClick = onNavigateToFitnessCenterDetail
                )
            }
            item {
                CommunitySection(groups = state.groups, challenges = state.challenges)
            }
            item {
                SupplementSection(supplements = state.supplements)
            }
            item {
                WellnessSafetyFooter()
            }
        }
    }
}

@Composable
private fun WellnessHero() {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFF047857), Color(0xFF14532D))))
                .padding(18.dp)
        ) {
            Text("VAIDIDEA FIT", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(
                "Assess, plan, act, track, improve and achieve with real data from your VAIDIDEA ecosystem.",
                color = Color(0xFFE7F8EE),
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
        }
    }
}

@Composable
private fun JourneyStrip() {
    val steps = listOf(
        "Assess" to Icons.Default.TrackChanges,
        "Plan" to Icons.Default.CheckCircle,
        "Act" to Icons.Default.FitnessCenter,
        "Track" to Icons.Default.TrendingUp,
        "Improve" to Icons.Outlined.SelfImprovement,
        "Achieve" to Icons.Default.LocalFireDepartment
    )
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(steps) { (label, icon) ->
            AssistChip(
                onClick = {},
                label = { Text(label, fontWeight = FontWeight.SemiBold) },
                leadingIcon = { Icon(icon, null, modifier = Modifier.size(18.dp), tint = Color(0xFF047857)) }
            )
        }
    }
}

@Composable
private fun WellnessDashboardCard(
    workoutCount: Int,
    coachCount: Int,
    centerCount: Int,
    communityCount: Int,
    onLogMeal: () -> Unit,
    onHealthData: () -> Unit
) {
    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text("Wellness Dashboard", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DashboardMetric("Workouts", workoutCount.toString(), Icons.Default.FitnessCenter, Color(0xFF047857), Modifier.weight(1f))
                DashboardMetric("Experts", coachCount.toString(), Icons.Default.Groups, Color(0xFF6A5AE0), Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                DashboardMetric("Gyms", centerCount.toString(), Icons.Default.Store, Color(0xFF2563EB), Modifier.weight(1f))
                DashboardMetric("Community", communityCount.toString(), Icons.Default.TrendingUp, Color(0xFFE65100), Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                HubShortcut("Log Meal", Icons.Default.CameraAlt, Color(0xFFE65100), Modifier.weight(1f), onLogMeal)
                HubShortcut("Health Data", Icons.Default.Watch, Color(0xFF0F766E), Modifier.weight(1f), onHealthData)
            }
        }
    }
}

@Composable
private fun EcosystemOverviewGrid(
    workoutCount: Int,
    exerciseCount: Int,
    coachCount: Int,
    centerCount: Int,
    communityCount: Int,
    supplementCount: Int,
    onLogMeal: () -> Unit,
    onHealthData: () -> Unit,
    onMarketplace: () -> Unit,
    onEmergency: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Wellness Ecosystem", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        OverviewRow {
            FeatureOverviewCard(
                number = "1",
                title = "Dashboard",
                icon = Icons.Default.TrackChanges,
                tint = Color(0xFF047857),
                lines = listOf("Real counts from backend", "$workoutCount plans", "$coachCount experts"),
                modifier = Modifier.weight(1f)
            )
            FeatureOverviewCard(
                number = "2",
                title = "Assessment",
                icon = Icons.Default.CheckCircle,
                tint = Color(0xFF6A5AE0),
                lines = listOf("Goals", "Bio + equipment", "Health screening"),
                modifier = Modifier.weight(1f)
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "3",
                title = "Workout",
                icon = Icons.Default.FitnessCenter,
                tint = Color(0xFF047857),
                lines = listOf("$workoutCount plans", "$exerciseCount exercise assets", "Timers + tracking ready"),
                modifier = Modifier.weight(1f)
            )
            FeatureOverviewCard(
                number = "4",
                title = "Nutrition",
                icon = Icons.Default.Restaurant,
                tint = Color(0xFFE65100),
                lines = listOf("Food logging", "Macros + water", "Meal plans"),
                modifier = Modifier.weight(1f),
                onClick = onLogMeal
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "5",
                title = "Health Tracking",
                icon = Icons.Default.MedicalServices,
                tint = Color(0xFF0F766E),
                lines = listOf("Weight, BP, sugar", "Sleep + hydration", "Progress charts"),
                modifier = Modifier.weight(1f),
                onClick = onHealthData
            )
            FeatureOverviewCard(
                number = "6",
                title = "Wearables",
                icon = Icons.Default.Watch,
                tint = Color(0xFF2563EB),
                lines = listOf("Google Health Connect", "Steps + calories", "Sleep + heart rate"),
                modifier = Modifier.weight(1f),
                onClick = onHealthData
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "7",
                title = "AI Coach",
                icon = Icons.Outlined.SelfImprovement,
                tint = Color(0xFF7C3AED),
                lines = listOf("Daily guidance", "Adherence insights", "Medical escalation"),
                modifier = Modifier.weight(1f)
            )
            FeatureOverviewCard(
                number = "8",
                title = "Experts",
                icon = Icons.Default.Groups,
                tint = Color(0xFF6A5AE0),
                lines = listOf("$coachCount approved experts", "Video/audio/chat", "Plan adjustments"),
                modifier = Modifier.weight(1f)
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "9",
                title = "Marketplace",
                icon = Icons.Default.Store,
                tint = Color(0xFF2563EB),
                lines = listOf("$centerCount gyms/studios", "Booking + check-in", "Facilities + ratings"),
                modifier = Modifier.weight(1f),
                onClick = onMarketplace
            )
            FeatureOverviewCard(
                number = "10",
                title = "Community",
                icon = Icons.Default.TrendingUp,
                tint = Color(0xFFE65100),
                lines = listOf("$communityCount groups/challenges", "Badges", "Leaderboards"),
                modifier = Modifier.weight(1f)
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "11",
                title = "Supplements",
                icon = Icons.Default.ShoppingCart,
                tint = Color(0xFF9333EA),
                lines = listOf("$supplementCount products", "QR authenticity", "Safety suitability"),
                modifier = Modifier.weight(1f)
            )
            FeatureOverviewCard(
                number = "12",
                title = "Safety",
                icon = Icons.Default.LocalHospital,
                tint = Color(0xFFE53935),
                lines = listOf("Pre-exercise screening", "Doctor/physio referral", "I feel unwell"),
                modifier = Modifier.weight(1f),
                onClick = onEmergency
            )
        }
        OverviewRow {
            FeatureOverviewCard(
                number = "13",
                title = "Reports",
                icon = Icons.Default.Verified,
                tint = Color(0xFF4F46E5),
                lines = listOf("Workout summary", "Nutrition summary", "Recovery trends"),
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun OverviewRow(content: @Composable RowScope.() -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        content()
    }
}

@Composable
private fun FeatureOverviewCard(
    number: String,
    title: String,
    icon: ImageVector,
    tint: Color,
    lines: List<String>,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val clickableModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    Card(
        modifier = clickableModifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(12.dp), color = tint.copy(alpha = 0.12f)) {
                    Icon(icon, null, tint = tint, modifier = Modifier.padding(7.dp).size(18.dp))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("$number. $title", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
            lines.take(3).forEach { line ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = tint, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(line, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun DashboardMetric(label: String, value: String, icon: ImageVector, tint: Color, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .background(tint.copy(alpha = 0.10f), RoundedCornerShape(14.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HubShortcut(label: String, icon: ImageVector, tint: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier = modifier
            .height(48.dp)
            .background(tint.copy(alpha = 0.10f), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(19.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(label, color = tint, fontWeight = FontWeight.Bold, fontSize = 12.sp)
    }
}

@Composable
private fun WorkoutSection(plans: List<WellnessWorkoutPlanDto>) {
    WellnessSection(title = "Workout & Training", emptyText = "Workout plans will appear here after backend publishes them.", isEmpty = plans.isEmpty()) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(plans) { plan ->
                DataCard(
                    title = plan.title,
                    subtitle = listOfNotNull(plan.goal, plan.level, plan.minutesPerSession?.let { "$it min" }).joinToString(" • "),
                    icon = Icons.Default.FitnessCenter,
                    tint = Color(0xFF047857)
                )
            }
        }
    }
}

@Composable
private fun ExerciseAnimationSection(exercises: List<ExerciseLibraryDto>) {
    WellnessSection(
        title = "Exercise Animations",
        emptyText = "Licensed exercise animations will appear here after exercise_library is populated.",
        isEmpty = exercises.isEmpty()
    ) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(exercises) { exercise ->
                ExerciseAnimationCard(exercise)
            }
        }
    }
}

@Composable
private fun ExerciseAnimationCard(exercise: ExerciseLibraryDto) {
    val previewUrl = exercise.thumbnailUrl ?: exercise.animationUrl
    Card(
        modifier = Modifier.width(230.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF047857).copy(alpha = 0.08f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(118.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFE7F8EE)),
                contentAlignment = Alignment.Center
            ) {
                if (!previewUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = previewUrl,
                        contentDescription = exercise.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(Icons.Default.FitnessCenter, null, tint = Color(0xFF047857), modifier = Modifier.size(36.dp))
                }

                if (!exercise.videoUrl.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(24.dp),
                        color = Color.Black.copy(alpha = 0.55f),
                        modifier = Modifier.align(Alignment.Center)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Video", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(exercise.name, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            val tags = listOfNotNull(
                exercise.targetMuscle?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.ROOT) else it.toString() },
                if (exercise.bodyPart != exercise.targetMuscle) exercise.bodyPart?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.ROOT) else it.toString() } else null,
                exercise.level?.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.ROOT) else it.toString() }
            )
            if (tags.isNotEmpty()) {
                Row(
                    modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    tags.forEach { tag ->
                        SmallTag(tag, Color(0xFF047857))
                    }
                }
            }
            val equipment = exercise.equipment?.map { it.replace("_", " ") }?.take(2)?.joinToString(", ") ?: ""
            if (equipment.isNotBlank()) {
                Text(equipment, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (!exercise.animationUrl.isNullOrBlank() || !exercise.videoUrl.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (!exercise.animationUrl.isNullOrBlank()) {
                        SmallTag("Animation", Color(0xFF047857))
                    }
                    if (!exercise.videoUrl.isNullOrBlank()) {
                        SmallTag("Video", Color(0xFF2563EB))
                    }
                }
            }
            val source = listOfNotNull(exercise.assetLicense, exercise.assetCredit).joinToString(" • ")
            if (source.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(source, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun CoachSection(coaches: List<WellnessCoachDto>) {
    WellnessSection(title = "Trainers & Experts", emptyText = "Verified trainers and experts will appear after admin approval.", isEmpty = coaches.isEmpty()) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(coaches) { coach ->
                DataCard(
                    title = coach.name,
                    subtitle = listOfNotNull(
                        coach.specialties?.firstOrNull(),
                        coach.sessionFee?.let { "₹${it.toInt()}" },
                        coach.rating?.let { "${String.format("%.1f", it)} ★" }
                    ).joinToString(" • "),
                    icon = Icons.Default.Groups,
                    tint = Color(0xFF6A5AE0)
                )
            }
        }
    }
}

@Composable
private fun MarketplaceSection(
    centers: List<FitnessCenterDto>,
    onCenterClick: (String) -> Unit
) {
    WellnessSection(title = "Gym & Fitness Marketplace", emptyText = "Approved gyms, yoga studios and fitness centers will appear here.", isEmpty = centers.isEmpty()) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(centers) { center ->
                DataCard(
                    title = center.name,
                    subtitle = listOfNotNull(center.centerType, center.city, center.rating?.let { "${String.format("%.1f", it)} ★" }).joinToString(" • "),
                    icon = Icons.Default.Store,
                    tint = Color(0xFF2563EB),
                    onClick = { onCenterClick(center.id) }
                )
            }
        }
    }
}

@Composable
private fun CommunitySection(groups: List<WellnessGroupDto>, challenges: List<WellnessChallengeDto>) {
    WellnessSection(title = "Community & Challenges", emptyText = "Communities and challenges will appear when available.", isEmpty = groups.isEmpty() && challenges.isEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            groups.take(4).forEach { group ->
                FullWidthDataRow(
                    group.name,
                    listOfNotNull(group.goalTag, group.memberCount?.let { "$it members" }).joinToString(" • "),
                    Icons.Default.Groups,
                    Color(0xFF047857)
                )
            }
            challenges.take(4).forEach { challenge ->
                FullWidthDataRow(challenge.title, listOfNotNull(challenge.challengeType, challenge.targetUnit).joinToString(" • "), Icons.Default.DirectionsRun, Color(0xFFE65100))
            }
        }
    }
}

@Composable
private fun SupplementSection(supplements: List<TrustedSupplementDto>) {
    WellnessSection(title = "Supplements Store", emptyText = "Trusted supplements will appear after catalogue approval.", isEmpty = supplements.isEmpty()) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(supplements) { supplement ->
                DataCard(
                    title = supplement.name,
                    subtitle = listOfNotNull(supplement.brand, supplement.category, if (supplement.isVerified == true) "Verified" else null).joinToString(" • "),
                    icon = Icons.Default.ShoppingCart,
                    tint = Color(0xFF9333EA)
                )
            }
        }
    }
}

@Composable
private fun WellnessSection(title: String, emptyText: String, isEmpty: Boolean, content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(10.dp))
            if (isEmpty) {
                EmptyState(emptyText)
            } else {
                content()
            }
        }
    }
}

@Composable
private fun DataCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    tint: Color,
    onClick: (() -> Unit)? = null
) {
    val cardModifier = if (onClick != null) {
        Modifier.width(190.dp).clickable(onClick = onClick)
    } else {
        Modifier.width(190.dp)
    }
    Card(
        modifier = cardModifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = tint.copy(alpha = 0.08f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text(title, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (subtitle.isNotBlank()) {
                Text(subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun FullWidthDataRow(title: String, subtitle: String, icon: ImageVector, tint: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(tint.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (subtitle.isNotBlank()) {
                Text(subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SmallTag(label: String, tint: Color) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = tint.copy(alpha = 0.12f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            color = tint,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun EmptyState(text: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    ) {
        Text(
            text,
            modifier = Modifier.padding(14.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun WellnessSafetyFooter() {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text("Seamless. Safe. Personalized.", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
            Text("Wellness connects fitness with healthcare consent, safety checks, and expert support.", fontSize = 12.sp, color = Color(0xFF475569))
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                SmallTag("Preventive First", Color(0xFF047857))
                SmallTag("Data Privacy", Color(0xFF2563EB))
                SmallTag("Expert Backed", Color(0xFF9333EA))
            }
        }
    }
}
