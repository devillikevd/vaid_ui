package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.example.swastik.data.remote.dto.WorkoutExerciseLogDto
import com.example.swastik.ui.viewmodel.WorkoutPlayerViewModel
import kotlinx.coroutines.delay
import java.util.Locale

private val WellnessGreen = Color(0xFF2E7D32)
private val WellnessGreenLight = Color(0xFFE8F5E9)

// Dummy Exercise UI model for the player
data class PlayerExercise(
    val id: String,
    val name: String,
    val sets: Int,
    val reps: Int? = null,
    val durationSeconds: Int? = null,
    val gifUrl: String = "https://i.pinimg.com/originals/a0/0a/6a/a00a6a48d88e441bc2c2b640a3d463d1.gif"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutPlayerScreen(
    planId: String?,
    onBackClick: () -> Unit,
    viewModel: WorkoutPlayerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    // We'll create a dummy list of exercises to play through
    val exercises = remember {
        listOf(
            PlayerExercise("e1", "Jumping Jacks", sets = 1, durationSeconds = 30),
            PlayerExercise("e2", "Push Ups", sets = 3, reps = 15),
            PlayerExercise("e3", "Squats", sets = 3, reps = 20),
            PlayerExercise("e4", "Plank", sets = 1, durationSeconds = 60)
        )
    }

    var currentExerciseIndex by remember { mutableIntStateOf(0) }
    var isResting by remember { mutableStateOf(false) }
    var restTimeRemaining by remember { mutableIntStateOf(30) }
    
    var exerciseTimer by remember { mutableIntStateOf(0) }
    var isTimerRunning by remember { mutableStateOf(false) }

    var isFinished by remember { mutableStateOf(false) }
    var showLogDialog by remember { mutableStateOf(false) }

    LaunchedEffect(planId) {
        viewModel.loadDummySession(planId)
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
                // Auto finish time-based exercise
                handleExerciseComplete(
                    isLast = currentExerciseIndex == exercises.size - 1,
                    onNext = { 
                        isResting = true
                        restTimeRemaining = 15 // 15s rest
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
                // Create dummy logs
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
                    durationMinutes = 45, // mock
                    caloriesBurned = 320.0, // mock
                    perceivedIntensity = intensity,
                    exercises = logs
                )
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.session?.title ?: "Workout Player", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { showLogDialog = true }) {
                        Text("Finish", color = Color.White, fontWeight = FontWeight.Bold)
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
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.EmojiEvents, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(80.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("Workout Complete!", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = WellnessGreen)
                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = { showLogDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(0.6f).height(50.dp)
                    ) {
                        Text("Log Workout", fontSize = 16.sp, fontWeight = FontWeight.Bold)
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
                // Video/Image area
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(4f/3f)
                        .background(Color.Black)
                ) {
                    AsyncImage(
                        model = currentEx.gifUrl,
                        contentDescription = currentEx.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    
                    if (isResting) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.7f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Rest", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                Text("$restTimeRemaining", color = WellnessGreen, fontSize = 64.sp, fontWeight = FontWeight.ExtraBold)
                                Spacer(Modifier.height(16.dp))
                                TextButton(
                                    onClick = {
                                        isResting = false
                                        currentExerciseIndex++
                                        if (currentExerciseIndex >= exercises.size) isFinished = true
                                    },
                                    colors = ButtonDefaults.textButtonColors(contentColor = Color.White)
                                ) {
                                    Text("Skip Rest")
                                }
                            }
                        }
                    }
                }

                // Exercise Info
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "${currentExerciseIndex + 1} / ${exercises.size}",
                        color = Color.Gray,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = currentEx.name,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF1B5E20)
                    )
                    Spacer(Modifier.height(16.dp))
                    
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        InfoChip(Icons.Filled.FitnessCenter, "${currentEx.sets} Sets")
                        if (currentEx.reps != null) {
                            InfoChip(Icons.Filled.Repeat, "${currentEx.reps} Reps")
                        }
                        if (currentEx.durationSeconds != null) {
                            InfoChip(Icons.Filled.Timer, "${currentEx.durationSeconds} Secs")
                        }
                    }

                    Spacer(Modifier.height(40.dp))

                    if (!isResting) {
                        if (currentEx.durationSeconds != null) {
                            // Timer UI
                            Text(
                                String.format(Locale.US, "%02d:%02d", exerciseTimer / 60, exerciseTimer % 60),
                                fontSize = 56.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = WellnessGreen
                            )
                            Spacer(Modifier.height(20.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                IconButton(
                                    onClick = { isTimerRunning = !isTimerRunning },
                                    modifier = Modifier
                                        .size(64.dp)
                                        .background(WellnessGreenLight, CircleShape)
                                ) {
                                    Icon(
                                        if (isTimerRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                        contentDescription = null,
                                        tint = WellnessGreen,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                                IconButton(
                                    onClick = { 
                                        handleExerciseComplete(
                                            isLast = currentExerciseIndex == exercises.size - 1,
                                            onNext = { 
                                                isResting = true
                                                restTimeRemaining = 15
                                            },
                                            onFinish = { isFinished = true }
                                        )
                                    },
                                    modifier = Modifier
                                        .size(64.dp)
                                        .background(Color(0xFFE3F2FD), CircleShape)
                                ) {
                                    Icon(Icons.Filled.SkipNext, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(32.dp))
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
                                            restTimeRemaining = 15
                                        },
                                        onFinish = { isFinished = true }
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth(0.8f)
                                    .height(60.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen),
                                shape = RoundedCornerShape(30.dp)
                            ) {
                                Text("Done", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                
                Spacer(Modifier.weight(1f))
                
                // Upcoming list
                if (currentExerciseIndex + 1 < exercises.size) {
                    val nextEx = exercises[currentExerciseIndex + 1]
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Next Up", color = Color.Gray, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(nextEx.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun handleExerciseComplete(isLast: Boolean, onNext: () -> Unit, onFinish: () -> Unit) {
    if (isLast) onFinish() else onNext()
}

@Composable
private fun InfoChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFFEEEEEE)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.DarkGray)
            Spacer(Modifier.width(6.dp))
            Text(text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color.DarkGray)
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
        title = { Text("Log Workout", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("How was your workout?", color = Color.Gray)
                Spacer(Modifier.height(16.dp))
                val intensities = listOf("Low", "Medium", "High", "Extreme")
                intensities.forEach { intensity ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedIntensity = intensity }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedIntensity == intensity,
                            onClick = { selectedIntensity = intensity },
                            colors = RadioButtonDefaults.colors(selectedColor = WellnessGreen)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(intensity)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedIntensity) },
                colors = ButtonDefaults.buttonColors(containerColor = WellnessGreen)
            ) {
                Text("Submit")
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
        Icon(Icons.Filled.CheckCircleOutline, contentDescription = null, tint = Color.White, modifier = Modifier.size(100.dp))
        Spacer(Modifier.height(24.dp))
        Text("Great Job!", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        Spacer(Modifier.height(8.dp))
        Text("Your workout has been logged successfully.", color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center)
        
        Spacer(Modifier.height(48.dp))
        Button(
            onClick = onBackClick,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = WellnessGreen),
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Back to Hub", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
    }
}
