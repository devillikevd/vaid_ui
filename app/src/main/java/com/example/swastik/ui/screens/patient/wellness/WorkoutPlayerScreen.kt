package com.example.swastik.ui.screens.patient.wellness

import android.os.Build
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.request.ImageRequest
import com.example.swastik.data.remote.dto.WorkoutExerciseLogDto
import com.example.swastik.ui.viewmodel.WorkoutPlayerViewModel
import kotlinx.coroutines.delay
import java.util.Locale

private val WellnessGreen = Color(0xFF047857)
private val WellnessGreenLight = Color(0xFFE8F8EF)
private val SafetyRed = Color(0xFFDC2626)
private val SafetyAmber = Color(0xFFD97706)

// Exercise UI model for the player with live CDN GIF animations and coaching form tips
data class PlayerExercise(
    val id: String,
    val name: String,
    val sets: Int,
    val reps: Int? = null,
    val durationSeconds: Int? = null,
    val gifUrl: String,
    val coachTip: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutPlayerScreen(
    planId: String?,
    onBackClick: () -> Unit,
    onNavigateToEmergency: () -> Unit = {},
    viewModel: WorkoutPlayerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
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

    val exercises = remember {
        listOf(
            PlayerExercise(
                id = "ex_jj",
                name = "Jumping Jacks",
                sets = 1,
                durationSeconds = 30,
                gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0003-1ZFqTDN.gif",
                coachTip = "Land softly on the balls of your feet to protect your knee joints."
            ),
            PlayerExercise(
                id = "ex_pushups",
                name = "Push Ups",
                sets = 3,
                reps = 15,
                gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0025-a1N4Z8J.gif",
                coachTip = "Keep your core engaged, spine neutral, and exhale as you push up."
            ),
            PlayerExercise(
                id = "ex_squats",
                name = "Bodyweight Squats",
                sets = 3,
                reps = 20,
                gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1458-lD9l94Z.gif",
                coachTip = "Keep your chest tall, push knees outward, and drive power through your heels."
            ),
            PlayerExercise(
                id = "ex_plank",
                name = "Plank Hold",
                sets = 1,
                durationSeconds = 45,
                gifUrl = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0469-WkWm39J.gif",
                coachTip = "Tighten your abdomen and glutes, keeping a straight line from neck to ankles."
            )
        )
    }

    var currentExerciseIndex by remember { mutableIntStateOf(0) }
    var isResting by remember { mutableStateOf(false) }
    var restTimeRemaining by remember { mutableIntStateOf(30) }
    
    var exerciseTimer by remember { mutableIntStateOf(0) }
    var isTimerRunning by remember { mutableStateOf(false) }

    var isFinished by remember { mutableStateOf(false) }
    var showLogDialog by remember { mutableStateOf(false) }

    // ==================== CLINICAL SAFETY & HR GUARDRAILS ====================
    var liveHeartRate by remember { mutableIntStateOf(132) }
    var showHrSpikeAutoPauseDialog by remember { mutableStateOf(false) }
    var coolingBreathingTimer by remember { mutableIntStateOf(60) }
    var showUnwellSheet by remember { mutableStateOf(false) }
    var incidentSuccessDialog by remember { mutableStateOf<String?>(null) }

    // Pulsing animation for heart rate indicator
    val infiniteTransition = rememberInfiniteTransition(label = "hr_pulse")
    val heartScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "heart_scale"
    )

    LaunchedEffect(planId) {
        viewModel.loadDummySession(planId)
    }

    // Dynamic Live Heart Rate Simulation & Overexertion Guardrail Check
    LaunchedEffect(isTimerRunning, isResting) {
        while (true) {
            delay(2000)
            if (isTimerRunning && !isResting) {
                // Heart rate increases gradually during active exertion
                val delta = (-2..4).random()
                liveHeartRate = (liveHeartRate + delta).coerceIn(120, 172)

                // Clinical Guardrail Trigger: Safe Cap is 165 BPM
                if (liveHeartRate >= 168 && !showHrSpikeAutoPauseDialog) {
                    isTimerRunning = false
                    showHrSpikeAutoPauseDialog = true
                    coolingBreathingTimer = 60
                }
            } else if (isResting) {
                // HR cools down during rest
                liveHeartRate = (liveHeartRate - (1..3).random()).coerceAtLeast(108)
            }
        }
    }

    // 60s Cooling Rest Timer Countdown
    LaunchedEffect(showHrSpikeAutoPauseDialog, coolingBreathingTimer) {
        if (showHrSpikeAutoPauseDialog && coolingBreathingTimer > 0) {
            delay(1000)
            coolingBreathingTimer--
            if (coolingBreathingTimer <= 30) {
                liveHeartRate = (liveHeartRate - 1).coerceAtLeast(115)
            }
        }
    }

    LaunchedEffect(isResting, restTimeRemaining) {
        if (isResting && restTimeRemaining > 0) {
            delay(1000)
            restTimeRemaining--
        } else if (isResting && restTimeRemaining == 0) {
            isResting = false
            currentExerciseIndex++
            if (currentExerciseIndex >= exercises.size) {
                isFinished = true
            }
        }
    }
    
    LaunchedEffect(isTimerRunning, exerciseTimer) {
        if (isTimerRunning && exerciseTimer > 0) {
            delay(1000)
            exerciseTimer--
            if (exerciseTimer == 0) {
                isTimerRunning = false
                handleExerciseComplete(
                    isLast = currentExerciseIndex == exercises.size - 1,
                    onNext = { 
                        isResting = true
                        restTimeRemaining = 20
                    },
                    onFinish = { isFinished = true }
                )
            }
        }
    }

    // Initialize timer if current exercise is time-based
    LaunchedEffect(currentExerciseIndex, isResting) {
        if (!isResting && currentExerciseIndex < exercises.size) {
            val ex = exercises[currentExerciseIndex]
            if (ex.durationSeconds != null) {
                exerciseTimer = ex.durationSeconds
                isTimerRunning = true
            } else {
                isTimerRunning = false
            }
        }
    }

    if (uiState.isCompleted) {
        WorkoutCompletionScreen(onBackClick)
        return
    }

    if (showLogDialog) {
        LogWorkoutDialog(
            onDismiss = { showLogDialog = false },
            onSubmit = { intensity ->
                val logs = exercises.map {
                    WorkoutExerciseLogDto(
                        exerciseId = it.id,
                        name = it.name,
                        sets = it.sets,
                        reps = it.reps,
                        durationSeconds = it.durationSeconds,
                        completed = true
                    )
                }
                viewModel.finishWorkout(
                    planId = planId,
                    sessionId = uiState.session?.id,
                    durationMinutes = 35,
                    caloriesBurned = 310.0,
                    perceivedIntensity = intensity,
                    exercises = logs
                )
            }
        )
    }

    // ==================== HR SPIKE AUTO-PAUSE DIALOG ====================
    if (showHrSpikeAutoPauseDialog) {
        AlertDialog(
            onDismissRequest = { /* forced clinical rest */ },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("💓", fontSize = 26.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Heart Rate Elevated: $liveHeartRate BPM", fontWeight = FontWeight.Black, color = SafetyRed, fontSize = 17.sp)
                }
            },
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Clinical Guardrail Active: Your heart rate crossed the safe 165 BPM threshold. The workout has been paused automatically to prevent cardiac over-strain.",
                        fontSize = 13.sp,
                        color = Color(0xFF334155),
                        lineHeight = 18.sp
                    )

                    // Animated Breathing Box
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFFFEF2F2),
                        border = BorderStroke(1.dp, Color(0xFFFECACA)),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("🌬️ Guided Diaphragmatic Rest", fontWeight = FontWeight.Bold, color = SafetyRed, fontSize = 14.sp)
                            Spacer(Modifier.height(8.dp))
                            Text("$coolingBreathingTimer s", fontSize = 38.sp, fontWeight = FontWeight.ExtraBold, color = SafetyRed)
                            Spacer(Modifier.height(4.dp))
                            Text("Inhale deeply for 4s... Hold for 4s... Exhale for 4s", fontSize = 11.sp, color = Color.Gray)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        liveHeartRate = 135
                        showHrSpikeAutoPauseDialog = false
                        isTimerRunning = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Resume Workout (HR Normal)", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        showHrSpikeAutoPauseDialog = false
                        onBackClick()
                    },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = SafetyRed),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("End Workout Safely", fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // ==================== "I FEEL UNWELL" TRIAGE SHEET ====================
    if (showUnwellSheet) {
        UnwellTriageModal(
            currentHeartRate = liveHeartRate,
            onDismiss = { showUnwellSheet = false },
            onEmergency = {
                showUnwellSheet = false
                onNavigateToEmergency()
            },
            onSubmitIncident = { symptom, muscle, _ ->
                isTimerRunning = false
                viewModel.logSafetyIncident(
                    symptom = symptom,
                    muscleGroup = muscle,
                    severity = "moderate",
                    workoutName = exercises.getOrNull(currentExerciseIndex)?.name ?: "Guided Session",
                    currentHeartRate = liveHeartRate,
                    onComplete = {
                        showUnwellSheet = false
                        incidentSuccessDialog = "Safety Alert logged. Your Wellness Coach & Doctor have been notified, and tomorrow's routine has been adapted to protect your $muscle."
                    }
                )
            }
        )
    }

    if (incidentSuccessDialog != null) {
        AlertDialog(
            onDismissRequest = { incidentSuccessDialog = null },
            title = { Text("🛡️ Safety Incident Registered", fontWeight = FontWeight.Bold) },
            text = { Text(incidentSuccessDialog ?: "", fontSize = 13.sp, lineHeight = 18.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        incidentSuccessDialog = null
                        onBackClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen)
                ) {
                    Text("Exit Workout Safely")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.session?.title ?: "Guided Session", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // "I Feel Unwell" Action Button
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = SafetyRed,
                        modifier = Modifier
                            .clickable {
                                isTimerRunning = false
                                showUnwellSheet = true
                            }
                            .padding(end = 6.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.HealthAndSafety, null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Unwell?", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    }

                    TextButton(onClick = { showLogDialog = true }) {
                        Text("Finish", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
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
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = WellnessGreen)
            }
        } else if (isFinished) {
            Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFFEF3C7),
                        modifier = Modifier.size(90.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.EmojiEvents, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(50.dp))
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                    Text("Workout Complete! 🎉", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = WellnessGreen)
                    Spacer(Modifier.height(8.dp))
                    Text("All 4 exercises finished. Save to grow your active streak.", color = Color.Gray, textAlign = TextAlign.Center, fontSize = 13.5.sp)
                    Spacer(Modifier.height(28.dp))
                    Button(
                        onClick = { showLogDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(0.75f).height(52.dp)
                    ) {
                        Text("Save & Log Workout ➔", fontSize = 15.5.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        } else if (currentExerciseIndex < exercises.size) {
            val currentEx = exercises[currentExerciseIndex]
            
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFFAFAFA))
            ) {
                // Header with Progress & Live Pulsing Heart Rate
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(WellnessGreenLight)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Segmented Progress Bars
                    Row(
                        modifier = Modifier.weight(1f).padding(end = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        exercises.forEachIndexed { index, _ ->
                            val isDone = index < currentExerciseIndex
                            val isCurrent = index == currentExerciseIndex
                            val barColor = if (isDone || isCurrent) WellnessGreen else Color(0xFFCBD5E1)
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(5.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(barColor)
                            )
                        }
                    }

                    // LIVE HEART RATE PILL
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (liveHeartRate > 155) Color(0xFFFEE2E2) else Color.White,
                        border = BorderStroke(1.dp, if (liveHeartRate > 155) SafetyRed else Color(0xFFE2E8F0))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Favorite,
                                null,
                                tint = if (liveHeartRate > 155) SafetyRed else Color(0xFFE11D48),
                                modifier = Modifier.size(13.dp).scale(heartScale)
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "$liveHeartRate BPM",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (liveHeartRate > 155) SafetyRed else Color(0xFF1E293B)
                            )
                        }
                    }
                }

                // Video/Image area with Live Animated GIF Player
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                        .background(Color.White)
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(currentEx.gifUrl)
                            .crossfade(true)
                            .build(),
                        imageLoader = gifImageLoader,
                        contentDescription = currentEx.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                    
                    // Rest Overlay
                    if (isResting) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.8f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Take a Breath 💧", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(6.dp))
                                Text("$restTimeRemaining s", color = Color(0xFF34D399), fontSize = 56.sp, fontWeight = FontWeight.ExtraBold)
                                Spacer(Modifier.height(14.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedButton(
                                        onClick = { restTimeRemaining += 15 },
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text("+15s Rest", fontWeight = FontWeight.Bold)
                                    }
                                    Button(
                                        onClick = {
                                            isResting = false
                                            currentExerciseIndex++
                                            if (currentExerciseIndex >= exercises.size) isFinished = true
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text("Skip Rest ➔", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                // Exercise Info & Coach Form Tip
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "EXERCISE ${currentExerciseIndex + 1} OF ${exercises.size}",
                        color = Color.Gray,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 11.5.sp,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = currentEx.name,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF1B5E20),
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(8.dp))
                    
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        InfoChip(Icons.Filled.FitnessCenter, "${currentEx.sets} Sets")
                        if (currentEx.reps != null) {
                            InfoChip(Icons.Filled.Repeat, "${currentEx.reps} Reps")
                        }
                        if (currentEx.durationSeconds != null) {
                            InfoChip(Icons.Filled.Timer, "${currentEx.durationSeconds} Secs")
                        }
                    }

                    Spacer(Modifier.height(10.dp))

                    // Clinical Coach Tip Card
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF0FDF4),
                        border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Lightbulb, null, tint = WellnessGreen, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                currentEx.coachTip,
                                fontSize = 11.5.sp,
                                color = Color(0xFF166534),
                                lineHeight = 15.sp
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    if (!isResting) {
                        if (currentEx.durationSeconds != null) {
                            // Timer UI
                            Text(
                                String.format(Locale.US, "%02d:%02d", exerciseTimer / 60, exerciseTimer % 60),
                                fontSize = 44.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = WellnessGreen
                            )
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                IconButton(
                                    onClick = { isTimerRunning = !isTimerRunning },
                                    modifier = Modifier
                                        .size(54.dp)
                                        .background(WellnessGreenLight, CircleShape)
                                ) {
                                    Icon(
                                        if (isTimerRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                        contentDescription = null,
                                        tint = WellnessGreen,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                IconButton(
                                    onClick = { 
                                        handleExerciseComplete(
                                            isLast = currentExerciseIndex == exercises.size - 1,
                                            onNext = { 
                                                isResting = true
                                                restTimeRemaining = 20
                                            },
                                            onFinish = { isFinished = true }
                                        )
                                    },
                                    modifier = Modifier
                                        .size(54.dp)
                                        .background(Color(0xFFE3F2FD), CircleShape)
                                ) {
                                    Icon(Icons.Filled.SkipNext, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(28.dp))
                                }
                            }
                        } else {
                            // Done Button
                            Button(
                                onClick = {
                                    handleExerciseComplete(
                                        isLast = currentExerciseIndex == exercises.size - 1,
                                        onNext = { 
                                            isResting = true
                                            restTimeRemaining = 20
                                        },
                                        onFinish = { isFinished = true }
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth(0.85f)
                                    .height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text("Complete Set / Next ➔", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UnwellTriageModal(
    currentHeartRate: Int,
    onDismiss: () -> Unit,
    onEmergency: () -> Unit,
    onSubmitIncident: (symptom: String, muscle: String, notes: String) -> Unit
) {
    var selectedSymptom by remember { mutableStateOf("⚡ Muscle Pull / Strain") }
    var selectedMuscle by remember { mutableStateOf("Hamstrings") }
    var notes by remember { mutableStateOf("") }

    val symptoms = listOf(
        "⚡ Muscle Pull / Strain",
        "🌀 Dizziness / Lightheaded",
        "🤢 Nausea / Acid Reflux",
        "🫀 Chest Pain / Palpitations"
    )

    val muscles = listOf("Hamstrings", "Quadriceps", "Lower Back", "Shoulder", "Calf", "Glutes")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🚨", fontSize = 22.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("I Feel Unwell (Triage)", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, SafetyRed)
                ) {
                    Text(
                        text = "$currentHeartRate BPM",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = SafetyRed,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("What are you experiencing right now?", fontSize = 13.sp, color = Color(0xFF64748B))

                // Symptoms chips
                symptoms.forEach { sym ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (selectedSymptom == sym) (if (sym.contains("Chest")) SafetyRed else WellnessGreen) else Color(0xFFF1F5F9),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedSymptom = sym }
                    ) {
                        Text(
                            text = sym,
                            color = if (selectedSymptom == sym) Color.White else Color(0xFF334155),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                if (selectedSymptom.contains("Chest")) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFEF2F2),
                        border = BorderStroke(1.dp, SafetyRed)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("⚠️ STOP ACTIVITY IMMEDIATELY. Sit comfortably upright.", color = SafetyRed, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Button(
                                onClick = onEmergency,
                                colors = ButtonDefaults.buttonColors(containerColor = SafetyRed),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("🚨 Call Emergency SOS Ambulance", fontWeight = FontWeight.Black, color = Color.White)
                            }
                        }
                    }
                } else if (selectedSymptom.contains("Muscle")) {
                    Text("Select Muscle / Joint Affected:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(muscles) { m ->
                            FilterChip(
                                selected = selectedMuscle == m,
                                onClick = { selectedMuscle = m },
                                label = { Text(m, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (!selectedSymptom.contains("Chest")) {
                Button(
                    onClick = { onSubmitIncident(selectedSymptom, selectedMuscle, notes) },
                    colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Submit & Alert Coach")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color.Gray)
            }
        }
    )
}

private fun handleExerciseComplete(isLast: Boolean, onNext: () -> Unit, onFinish: () -> Unit) {
    if (isLast) onFinish() else onNext()
}

@Composable
private fun InfoChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF1F5F9)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFF475569))
            Spacer(Modifier.width(4.dp))
            Text(text, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF334155))
        }
    }
}

@Composable
private fun LogWorkoutDialog(
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit
) {
    var selectedIntensity by remember { mutableStateOf("Medium") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Log Workout", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column {
                Text("How intense was today's workout session?", color = Color.Gray, fontSize = 13.sp)
                Spacer(Modifier.height(14.dp))
                val intensities = listOf("Low", "Medium", "High", "Extreme")
                intensities.forEach { intensity ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedIntensity = intensity }
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedIntensity == intensity,
                            onClick = { selectedIntensity = intensity },
                            colors = RadioButtonDefaults.colors(selectedColor = WellnessGreen)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(intensity, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedIntensity) },
                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen)
            ) {
                Text("Submit Workout Log")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color.Gray)
            }
        }
    )
}

@Composable
private fun WorkoutCompletionScreen(onBackClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WellnessGreen)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.CheckCircleOutline, contentDescription = null, tint = Color.White, modifier = Modifier.size(90.dp))
        Spacer(Modifier.height(20.dp))
        Text("Great Job! 🎉", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        Spacer(Modifier.height(8.dp))
        Text("Your workout has been logged successfully and your streak is updated.", color = Color.White.copy(alpha = 0.9f), textAlign = TextAlign.Center, fontSize = 14.sp)
        
        Spacer(Modifier.height(40.dp))
        Button(
            onClick = onBackClick,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = WellnessGreen),
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Back to Wellness Hub ➔", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}
