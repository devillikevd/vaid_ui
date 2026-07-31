package com.example.swastik.ui.screens.patient.wellness

import android.net.Uri
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
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
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.ExerciseLibraryDto
import com.example.swastik.data.remote.dto.WellnessWorkoutPlanDto
import com.example.swastik.ui.viewmodel.WellnessViewModel

private val WellnessGreen = Color(0xFF047857)
private val WellnessGreenLight = Color(0xFFE8F8EF)

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

    LaunchedEffect(Unit) { viewModel.refreshWorkouts() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Workouts & Training", fontWeight = FontWeight.Bold) },
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
                        text = { Text(title, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = WellnessGreen)
                }
            } else {
                when (selectedTab) {
                    0 -> WorkoutPlansTab(plans = state.workoutPlans, onNavigateToWorkoutPlayer = onNavigateToWorkoutPlayer)
                    1 -> ExerciseLibraryTab(exercises = state.exercises)
                }
            }
        }
    }
}

@Composable
private fun WorkoutPlansTab(
    plans: List<WellnessWorkoutPlanDto>,
    onNavigateToWorkoutPlayer: (String) -> Unit
) {
    if (plans.isEmpty()) {
        EmptyStateCard(
            icon = Icons.Default.FitnessCenter,
            title = "No Workout Plans Yet",
            message = "Workout plans will appear here once published by your wellness team."
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(plans) { plan ->
                WorkoutPlanCard(plan, onClick = { onNavigateToWorkoutPlayer(plan.id) })
            }
        }
    }
}

@Composable
private fun WorkoutPlanCard(plan: WellnessWorkoutPlanDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Cover Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
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
                            .background(
                                Brush.horizontalGradient(
                                    listOf(WellnessGreen, Color(0xFF14532D))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.FitnessCenter,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.4f),
                            modifier = Modifier.size(64.dp)
                        )
                    }
                }
                // Gradient overlay at bottom of image
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))
                            )
                        )
                )
                // Level badge
                plan.level?.let { level ->
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = when (level.lowercase()) {
                            "beginner" -> Color(0xFF4CAF50)
                            "intermediate" -> Color(0xFFFFA726)
                            "advanced" -> Color(0xFFF44336)
                            else -> WellnessGreen
                        }
                    ) {
                        Text(
                            level.replaceFirstChar { it.uppercase() },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            // Content
            Column(modifier = Modifier.padding(16.dp)) {
                Text(plan.title, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                plan.description?.let {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Spacer(modifier = Modifier.height(12.dp))
                // Metadata chips
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    plan.goal?.let { MetadataChip(icon = Icons.Default.Flag, text = it.replaceFirstChar { c -> c.uppercase() }) }
                    plan.minutesPerSession?.let { MetadataChip(icon = Icons.Default.Timer, text = "${it} min") }
                    plan.durationWeeks?.let { MetadataChip(icon = Icons.Default.CalendarMonth, text = "${it} weeks") }
                }
                plan.daysPerWeek?.let { days ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MetadataChip(icon = Icons.Default.DateRange, text = "$days days/week")
                        plan.locationType?.let { MetadataChip(icon = Icons.Default.Place, text = it.replace("_", " ").replaceFirstChar { c -> c.uppercase() }) }
                    }
                }
                // Equipment
                if (!plan.equipment.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Equipment", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        plan.equipment.take(4).forEach { equip ->
                            Surface(shape = RoundedCornerShape(20.dp), color = WellnessGreen.copy(alpha = 0.1f)) {
                                Text(
                                    equip.replace("_", " ").replaceFirstChar { it.uppercase() },
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = WellnessGreen
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExerciseLibraryTab(exercises: List<ExerciseLibraryDto>) {
    if (exercises.isEmpty()) {
        EmptyStateCard(
            icon = Icons.Default.SportsGymnastics,
            title = "No Exercises Yet",
            message = "Exercise animations and videos will appear here once the exercise library is populated."
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(exercises) { exercise ->
                ExerciseDetailCard(exercise)
            }
        }
    }
}

@Composable
private fun ExerciseDetailCard(exercise: ExerciseLibraryDto) {
    var showVideo by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.animateContentSize()) {
            // Preview Image / Animation / Video
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
            ) {
                val previewUrl = exercise.thumbnailUrl ?: exercise.animationUrl
                if (showVideo && !exercise.videoUrl.isNullOrBlank()) {
                    ExoPlayerVideoView(videoUrl = exercise.videoUrl)
                } else if (!previewUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(previewUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = exercise.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(WellnessGreenLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.FitnessCenter, null, tint = WellnessGreen, modifier = Modifier.size(48.dp))
                    }
                }

                // Play video button
                if (!exercise.videoUrl.isNullOrBlank() && !showVideo) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .clickable { showVideo = true },
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.6f)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = "Play Video",
                            tint = Color.White,
                            modifier = Modifier.padding(12.dp).size(32.dp)
                        )
                    }
                }

                // Close video button
                if (showVideo) {
                    IconButton(
                        onClick = { showVideo = false },
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
                    ) {
                        Surface(shape = CircleShape, color = Color.Black.copy(alpha = 0.6f)) {
                            Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.padding(4.dp).size(20.dp))
                        }
                    }
                }

                // Media type badges
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (!exercise.animationUrl.isNullOrBlank()) {
                        MediaBadge("Animation", Color(0xFF047857))
                    }
                    if (!exercise.videoUrl.isNullOrBlank()) {
                        MediaBadge("Video", Color(0xFF2563EB))
                    }
                }
            }

            // Content
            Column(modifier = Modifier.padding(16.dp)) {
                Text(exercise.name, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)

                Spacer(modifier = Modifier.height(8.dp))

                // Tags row
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    exercise.targetMuscle?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, WellnessGreen)
                    }
                    exercise.bodyPart?.takeIf { it != exercise.targetMuscle }?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, Color(0xFF6A5AE0))
                    }
                    exercise.level?.let {
                        TagChip(it.replaceFirstChar { c -> c.uppercase() }, when (it.lowercase()) {
                            "beginner" -> Color(0xFF4CAF50)
                            "intermediate" -> Color(0xFFFFA726)
                            "advanced" -> Color(0xFFF44336)
                            else -> WellnessGreen
                        })
                    }
                }

                // Equipment
                exercise.equipment?.takeIf { it.isNotEmpty() }?.let { equips ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Equipment: ${equips.joinToString(", ") { it.replace("_", " ") }}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                // Instructions
                exercise.instructions?.takeIf { it.isNotEmpty() }?.let { instructions ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Instructions", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    instructions.forEachIndexed { index, instruction ->
                        Text("${index + 1}. $instruction", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp)
                    }
                }

                // Safety Notes
                exercise.safetyNotes?.takeIf { it.isNotEmpty() }?.let { notes ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFFF3E0)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warning, null, tint = Color(0xFFE65100), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Safety Notes", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFFE65100))
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            notes.forEach { note ->
                                Text("• $note", fontSize = 11.sp, color = Color(0xFF795548))
                            }
                        }
                    }
                }

                // Credits
                val source = listOfNotNull(exercise.assetLicense, exercise.assetCredit).joinToString(" • ")
                if (source.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(source, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                }
            }
        }
    }
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
        onDispose { exoPlayer.release() }
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

@Composable
private fun MetadataChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = WellnessGreen.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = WellnessGreen, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = WellnessGreen)
        }
    }
}

@Composable
private fun MediaBadge(label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.9f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            color = Color.White,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun TagChip(label: String, color: Color) {
    Surface(shape = RoundedCornerShape(20.dp), color = color.copy(alpha = 0.12f)) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            color = color,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun EmptyStateCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    message: String
) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = WellnessGreen.copy(alpha = 0.1f),
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = WellnessGreen, modifier = Modifier.size(40.dp))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}
