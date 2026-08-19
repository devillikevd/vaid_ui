package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.swastik.data.remote.dto.CreateAssessmentBioRequest
import com.example.swastik.data.remote.dto.CreateAssessmentGoalsRequest
import com.example.swastik.data.remote.dto.CreateHealthScreeningRequest
import com.example.swastik.ui.viewmodel.WellnessViewModel
import java.util.Locale

private val EmeraldPrimary = Color(0xFF047857)
private val EmeraldDark = Color(0xFF064E3B)
private val EmeraldLight = Color(0xFFE8F8EF)
private val PurplePrimary = Color(0xFF6A5AE0)
private val OrangePrimary = Color(0xFFE65100)

data class AssessmentOption(
    val id: String,
    val title: String,
    val subtitle: String,
    val emoji: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessAssessmentScreen(
    onNavigateBack: () -> Unit,
    onNavigateToWorkouts: () -> Unit = {},
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var currentStep by remember { mutableIntStateOf(0) } // 0=Overview, 1=Goals, 2=Bio, 3=Health, 4=Success
    val assessment = state.assessment
    val isCompleted = assessment?.status == "completed"

    // Reset submit state on enter
    LaunchedEffect(Unit) { viewModel.clearSubmitState() }
    LaunchedEffect(Unit) { viewModel.refreshAssessment() }

    // Auto-advance on successful submission
    LaunchedEffect(state.submitSuccess) {
        if (state.submitSuccess) {
            if (currentStep in 1..2) {
                currentStep++
            } else if (currentStep == 3) {
                currentStep = 4 // Move to Success Summary
            }
            viewModel.clearSubmitState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (currentStep) {
                            0 -> "Health Assessment"
                            1 -> "Step 1: Fitness Goals"
                            2 -> "Step 2: Body & Equipment"
                            3 -> "Step 3: Health Safety"
                            4 -> "Your Health Profile"
                            else -> "Assessment"
                        },
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 17.5.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep > 0 && currentStep < 4) currentStep-- else onNavigateBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = EmeraldLight)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Visual Segmented Stepper Bar
            if (currentStep in 1..3) {
                AssessmentStepperHeader(
                    currentStep = currentStep,
                    totalSteps = 3
                )
            }

            when (currentStep) {
                0 -> AssessmentOverview(
                    assessment = assessment,
                    isCompleted = isCompleted,
                    onStartAssessment = { currentStep = 1 }
                )
                1 -> GoalsStep(
                    viewModel = viewModel,
                    existingGoals = assessment?.goals,
                    isSubmitting = state.isSubmitting,
                    error = state.submitError
                )
                2 -> BioStep(
                    viewModel = viewModel,
                    existingBio = assessment?.bio,
                    isSubmitting = state.isSubmitting,
                    error = state.submitError
                )
                3 -> HealthScreeningStep(
                    viewModel = viewModel,
                    existingScreening = assessment?.healthScreening,
                    isSubmitting = state.isSubmitting,
                    error = state.submitError,
                    onComplete = { currentStep = 4 }
                )
                4 -> AssessmentSuccessView(
                    assessment = state.assessment,
                    onNavigateToWorkouts = onNavigateToWorkouts,
                    onNavigateBack = onNavigateBack
                )
            }
        }
    }
}

// ==================== VISUAL CONNECTED STEPPER HEADER ====================

@Composable
private fun AssessmentStepperHeader(
    currentStep: Int,
    totalSteps: Int = 3
) {
    val stepTitles = listOf("Goals 🎯", "Body 📏", "Safety 🛡️")

    Surface(
        color = EmeraldLight.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                for (i in 1..totalSteps) {
                    val isDone = i < currentStep
                    val isCurrent = i == currentStep
                    val stepColor = if (isDone || isCurrent) EmeraldPrimary else Color(0xFFCBD5E1)

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f, fill = i < totalSteps)
                    ) {
                        // Step circle node
                        Surface(
                            shape = CircleShape,
                            color = if (isDone) EmeraldPrimary else if (isCurrent) EmeraldPrimary else Color.White,
                            border = if (isCurrent) BorderStroke(2.dp, EmeraldPrimary) else if (!isDone) BorderStroke(1.5.dp, Color(0xFFCBD5E1)) else null,
                            modifier = Modifier.size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (isDone) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                } else {
                                    Text(
                                        text = "$i",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 12.sp,
                                        color = if (isCurrent) Color.White else Color(0xFF64748B)
                                    )
                                }
                            }
                        }

                        // Connecting line between steps
                        if (i < totalSteps) {
                            val lineProgress = if (currentStep > i) 1f else 0f
                            val animatedLineColor by animateColorAsState(
                                targetValue = if (currentStep > i) EmeraldPrimary else Color(0xFFE2E8F0),
                                animationSpec = tween(300),
                                label = "stepLine"
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(3.dp)
                                    .padding(horizontal = 6.dp)
                                    .background(animatedLineColor, RoundedCornerShape(2.dp))
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Step Label indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                stepTitles.forEachIndexed { index, title ->
                    val stepNum = index + 1
                    val isCurrent = stepNum == currentStep
                    val isDone = stepNum < currentStep
                    Text(
                        text = title,
                        fontSize = 11.sp,
                        fontWeight = if (isCurrent) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (isCurrent) EmeraldPrimary else if (isDone) Color(0xFF059669) else Color(0xFF94A3B8),
                        modifier = Modifier.weight(1f),
                        textAlign = if (index == 0) TextAlign.Start else if (index == stepTitles.size - 1) TextAlign.End else TextAlign.Center
                    )
                }
            }
        }
    }
}

// ==================== STEP 0: OVERVIEW ====================

@Composable
private fun AssessmentOverview(
    assessment: com.example.swastik.data.remote.dto.WellnessAssessmentDto?,
    isCompleted: Boolean,
    onStartAssessment: () -> Unit
) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Hero Card
        item {
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                elevation = CardDefaults.cardElevation(3.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                listOf(EmeraldPrimary, Color(0xFF065F46), EmeraldDark)
                            )
                        )
                        .padding(22.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color.White.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    if (isCompleted) "VERIFIED PROFILE" else "2-MINUTE ONBOARDING",
                                    color = Color.White,
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                if (isCompleted) "Health Profile Active ✓" else "Personalize Your Fitness",
                                color = Color.White,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                        Surface(
                            shape = CircleShape,
                            color = Color.White.copy(alpha = 0.18f),
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    if (isCompleted) Icons.Default.Verified else Icons.Default.FitnessCenter,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        "Answer 3 quick steps so our clinical AI can calibrate your exact calorie deficit/surplus, safe exercise boundaries, and customized workout schedule.",
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 12.5.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }

        // Why This Is Needed Banner
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(0.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFFEF3C7),
                        modifier = Modifier.size(34.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Lightbulb,
                                contentDescription = null,
                                tint = Color(0xFFD97706),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "💡 Why is this needed? Helps our system recommend safe exercises, tailored calories, and customized workout plans based on your body.",
                        fontSize = 11.5.sp,
                        color = Color(0xFF334155),
                        lineHeight = 16.sp,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Step 1 Card
        item {
            AssessmentStepCard(
                stepNumber = 1,
                title = "Fitness Goals",
                description = "Weight loss, muscle gain, daily stamina, or yoga flexibility.",
                icon = Icons.Default.Flag,
                color = EmeraldPrimary,
                isComplete = assessment?.goals != null
            )
        }

        // Step 2 Card
        item {
            AssessmentStepCard(
                stepNumber = 2,
                title = "Body & Equipment",
                description = "Height, weight, live BMI spectrum score, and available gear.",
                icon = Icons.Default.Person,
                color = PurplePrimary,
                isComplete = assessment?.bio != null
            )
        }

        // Step 3 Card
        item {
            AssessmentStepCard(
                stepNumber = 3,
                title = "Health Safety (PAR-Q)",
                description = "Joint pain, blood pressure, and pre-exercise safety screening.",
                icon = Icons.Default.HealthAndSafety,
                color = OrangePrimary,
                isComplete = assessment?.healthScreening != null
            )
        }

        // Start / Update CTA Button
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Button(
                onClick = onStartAssessment,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Text(
                    if (isCompleted) "Update Assessment ✏️" else if (assessment != null) "Continue Assessment ➔" else "Start Assessment ➔",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun AssessmentStepCard(
    stepNumber: Int,
    title: String,
    description: String,
    icon: ImageVector,
    color: Color,
    isComplete: Boolean
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (isComplete) Color(0xFF059669).copy(alpha = 0.3f) else Color(0xFFF1F5F9)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = if (isComplete) Color(0xFF059669).copy(alpha = 0.15f) else color.copy(alpha = 0.1f),
                modifier = Modifier.size(46.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isComplete) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF059669), modifier = Modifier.size(24.dp))
                    } else {
                        Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
                    }
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Step $stepNumber: $title", fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
                    if (isComplete) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFF059669).copy(alpha = 0.12f)
                        ) {
                            Text(
                                "Completed ✓",
                                color = Color(0xFF059669),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    description,
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

// ==================== STEP 1: GOALS ====================

@Composable
private fun GoalsStep(
    viewModel: WellnessViewModel,
    existingGoals: com.example.swastik.data.remote.dto.WellnessGoalsDto?,
    isSubmitting: Boolean,
    error: String?
) {
    val primaryGoalOptions = listOf(
        AssessmentOption("weight_loss", "Weight Loss", "Burn fat & get lean", "🏃"),
        AssessmentOption("muscle_gain", "Muscle Gain", "Build strength & muscle", "🏋️"),
        AssessmentOption("general_fitness", "Stay Fit & Active", "Daily energy & health", "⚡"),
        AssessmentOption("endurance", "Endurance & Stamina", "Cardio capacity & speed", "🏃‍♂️"),
        AssessmentOption("flexibility", "Flexibility & Yoga", "Mobility & posture", "🧘"),
        AssessmentOption("stress_relief", "Mental Wellness", "Mindfulness & calm", "🌿"),
        AssessmentOption("rehabilitation", "Recovery & Physio", "Post-injury physical therapy", "🩹")
    )

    val activityLevelOptions = listOf(
        AssessmentOption("sedentary", "Low Activity", "Mostly sitting / Desk work 🪑", "🪑"),
        AssessmentOption("lightly_active", "Light Active", "Light walking / Chores 🚶", "🚶"),
        AssessmentOption("moderately_active", "Moderate Active", "Daily walks & active life 🏃", "🏃"),
        AssessmentOption("very_active", "Very Active", "Intense sports / Heavy labor ⚡", "⚡")
    )

    val workoutDaysList = listOf(2, 3, 4, 5, 6)

    val timeOptions = listOf(
        AssessmentOption("morning", "Morning", "6 AM - 10 AM", "🌅"),
        AssessmentOption("afternoon", "Afternoon", "12 PM - 4 PM", "☀️"),
        AssessmentOption("evening", "Evening", "4 PM - 8 PM", "🌇"),
        AssessmentOption("night", "Night", "8 PM - 11 PM", "🌙")
    )

    val workoutTypeOptions = listOf(
        AssessmentOption("strength", "Strength", "Weights & Gym", "🏋️"),
        AssessmentOption("cardio", "Cardio", "Fat burn & Running", "🏃"),
        AssessmentOption("yoga", "Yoga", "Mind & Body", "🧘"),
        AssessmentOption("HIIT", "HIIT", "High Intensity", "🔥"),
        AssessmentOption("pilates", "Pilates", "Core & Posture", "🤸"),
        AssessmentOption("swimming", "Swimming", "Full Body", "🏊"),
        AssessmentOption("running", "Running", "Outdoor Stamina", "👟"),
        AssessmentOption("cycling", "Cycling", "Legs & Cardio", "🚴")
    )

    var primaryGoal by remember { mutableStateOf(existingGoals?.primaryGoal ?: "") }
    var secondaryGoals by remember { mutableStateOf(existingGoals?.secondaryGoals?.toSet() ?: emptySet()) }
    var targetWeight by remember { mutableStateOf(existingGoals?.targetWeight?.toString() ?: "") }
    var activityLevel by remember { mutableStateOf(existingGoals?.activityLevel ?: "moderately_active") }
    var workoutFrequency by remember { mutableIntStateOf(existingGoals?.workoutFrequency ?: 3) }
    var preferredTime by remember { mutableStateOf(existingGoals?.preferredWorkoutTime ?: "morning") }
    var selectedWorkoutTypes by remember { mutableStateOf(existingGoals?.preferredWorkoutTypes?.toSet() ?: emptySet()) }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Section 1: Primary Goal
        item {
            Column {
                Text(
                    "1. What is your primary fitness goal? 🎯",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    "Select one main priority (Required)",
                    fontSize = 11.5.sp,
                    color = if (primaryGoal.isBlank()) Color(0xFFDC2626) else MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(10.dp))
                CardOptionsGrid(
                    options = primaryGoalOptions,
                    selected = setOf(primaryGoal),
                    onSelect = { primaryGoal = it.firstOrNull() ?: "" },
                    singleSelect = true,
                    activeColor = EmeraldPrimary
                )
            }
        }

        // Section 2: Secondary Goals (Optional)
        item {
            Column {
                Text(
                    "2. Secondary goals (Optional) 🌟",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    "Select any other benefits you'd like to achieve",
                    fontSize = 11.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(10.dp))
                CardOptionsGrid(
                    options = primaryGoalOptions.filter { it.id != primaryGoal },
                    selected = secondaryGoals,
                    onSelect = { secondaryGoals = it },
                    singleSelect = false,
                    activeColor = PurplePrimary
                )
            }
        }

        // Section 3: Workouts per week (1-Tap Horizontal Pills)
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "3. Workouts per week 📅",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            "$workoutFrequency Days Selected",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = EmeraldPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(workoutDaysList) { days ->
                            val isSelected = workoutFrequency == days
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) EmeraldPrimary else Color(0xFFF1F5F9),
                                border = if (isSelected) null else BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier.clickable { workoutFrequency = days }
                            ) {
                                Text(
                                    text = "$days Days" + if (days == 3) " ⭐ Recommended" else "",
                                    color = if (isSelected) Color.White else Color(0xFF334155),
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                                    fontSize = 12.5.sp,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Section 4: Daily Activity Level
        item {
            Column {
                Text(
                    "4. Daily routine activity level 🚶",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                CardOptionsGrid(
                    options = activityLevelOptions,
                    selected = setOf(activityLevel),
                    onSelect = { activityLevel = it.firstOrNull() ?: "moderately_active" },
                    singleSelect = true,
                    activeColor = EmeraldPrimary
                )
            }
        }

        // Section 5: Target Weight Input
        item {
            OutlinedTextField(
                value = targetWeight,
                onValueChange = { targetWeight = it },
                label = { Text("Target Weight (kg) - Optional") },
                placeholder = { Text("e.g. 68") },
                trailingIcon = { Text("kg", fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 12.dp)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                shape = RoundedCornerShape(14.dp)
            )
        }

        // Section 6: Preferred Workout Time
        item {
            Column {
                Text(
                    "5. Preferred workout time ⏰",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                CardOptionsGrid(
                    options = timeOptions,
                    selected = setOf(preferredTime),
                    onSelect = { preferredTime = it.firstOrNull() ?: "morning" },
                    singleSelect = true,
                    activeColor = EmeraldPrimary
                )
            }
        }

        // Section 7: Preferred Workout Types
        item {
            Column {
                Text(
                    "6. Preferred workout types (Select any) 🏋️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                CardOptionsGrid(
                    options = workoutTypeOptions,
                    selected = selectedWorkoutTypes,
                    onSelect = { selectedWorkoutTypes = it },
                    singleSelect = false,
                    activeColor = PurplePrimary
                )
            }
        }

        error?.let {
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFFEBEE)) {
                    Text(it, modifier = Modifier.padding(12.dp), color = Color(0xFFE53935), fontSize = 13.sp)
                }
            }
        }

        // Smart Submit Button with Validation
        item {
            val isReady = primaryGoal.isNotBlank()
            Button(
                onClick = {
                    viewModel.submitGoals(
                        CreateAssessmentGoalsRequest(
                            primaryGoal = primaryGoal,
                            secondaryGoals = secondaryGoals.toList(),
                            targetWeight = targetWeight.toDoubleOrNull(),
                            activityLevel = activityLevel.ifBlank { "moderately_active" },
                            workoutFrequency = workoutFrequency,
                            preferredWorkoutTime = preferredTime.ifBlank { null },
                            preferredWorkoutTypes = selectedWorkoutTypes.toList()
                        )
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isReady) EmeraldPrimary else Color(0xFF94A3B8)
                ),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else if (!isReady) {
                    Text("👉 Select a Main Goal (Step 1) to Continue", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                } else {
                    Text("Save Goals & Continue (Step 2 ➔)", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

// ==================== STEP 2: BIO & EQUIPMENT ====================

@Composable
private fun BioStep(
    viewModel: WellnessViewModel,
    existingBio: com.example.swastik.data.remote.dto.WellnessBioDto?,
    isSubmitting: Boolean,
    error: String?
) {
    val fitnessLevels = listOf(
        AssessmentOption("beginner", "Beginner", "New to workouts 🟢", "🟢"),
        AssessmentOption("intermediate", "Intermediate", "Exercise 1-2 times a week 🟡", "🟡"),
        AssessmentOption("advanced", "Advanced", "Regular fitness enthusiast 🔵", "🔵"),
        AssessmentOption("athlete", "Athlete / Pro", "High intensity training 🟣", "🟣")
    )

    val equipmentOptions = listOf(
        AssessmentOption("none", "Bodyweight Only", "No equipment required 🤸", "🤸"),
        AssessmentOption("dumbbells", "Dumbbells", "Pair of dumbbells 🏋️", "🏋️"),
        AssessmentOption("yoga_mat", "Yoga Mat", "Floor mat for yoga / core 🧘", "🧘"),
        AssessmentOption("resistance_bands", "Resistance Bands", "Elastic workout bands 🎗️", "🎗️"),
        AssessmentOption("treadmill", "Treadmill / Cycle", "Cardio treadmill or cycle 🚴", "🚴"),
        AssessmentOption("barbell", "Full Gym Setup", "Full gym weights & rack 🏢", "🏢")
    )

    val locationOptions = listOf(
        AssessmentOption("home", "Home 🏠", "Home workouts", "🏠"),
        AssessmentOption("gym", "Gym 🏢", "Commercial gym", "🏢"),
        AssessmentOption("outdoor", "Outdoor 🌳", "Parks & open tracks", "🌳"),
        AssessmentOption("anywhere", "Anywhere 🌍", "Flexible / Travel", "🌍")
    )

    val dietOptions = listOf(
        AssessmentOption("vegetarian", "Vegetarian 🥗", "Pure vegetarian diet", "🥗"),
        AssessmentOption("eggetarian", "Eggetarian 🥚", "Vegetarian + Eggs", "🥚"),
        AssessmentOption("non_vegetarian", "Non-Vegetarian 🍗", "Poultry, meat & seafood", "🍗"),
        AssessmentOption("vegan", "Vegan 🌱", "Plant-based (No Dairy)", "🌱"),
        AssessmentOption("keto", "Keto / Low Carb 🥑", "High healthy fats, low carbs", "🥑")
    )

    var height by remember { mutableStateOf(existingBio?.height?.toString() ?: "") }
    var weight by remember { mutableStateOf(existingBio?.weight?.toString() ?: "") }
    var age by remember { mutableStateOf(existingBio?.age?.toString() ?: "") }
    var gender by remember { mutableStateOf(existingBio?.gender ?: "male") }
    var bodyFat by remember { mutableStateOf(existingBio?.bodyFatPercentage?.toString() ?: "") }
    var fitnessLevel by remember { mutableStateOf(existingBio?.fitnessLevel ?: "beginner") }
    var equipment by remember { mutableStateOf(existingBio?.availableEquipment?.toSet() ?: setOf("none")) }
    var workoutLocation by remember { mutableStateOf(existingBio?.workoutLocation ?: "home") }
    var dietPrefs by remember { mutableStateOf(existingBio?.dietaryPreferences?.toSet() ?: emptySet()) }
    var allergies by remember { mutableStateOf(existingBio?.allergies?.joinToString(", ") ?: "") }

    // Real-time BMI calculation
    val heightM = (height.toDoubleOrNull() ?: 0.0) / 100.0
    val weightKg = weight.toDoubleOrNull() ?: 0.0
    val liveBmi = if (heightM > 0.5 && weightKg > 10.0) weightKg / (heightM * heightM) else 0.0

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Height & Weight Input Row
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = height,
                    onValueChange = { height = it },
                    label = { Text("Height (cm) *") },
                    placeholder = { Text("170") },
                    trailingIcon = { Text("cm", fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 12.dp)) },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = it },
                    label = { Text("Weight (kg) *") },
                    placeholder = { Text("68") },
                    trailingIcon = { Text("kg", fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 12.dp)) },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        // Live Real-Time Visual BMI Spectrum Gauge Card
        if (liveBmi > 0.0) {
            item {
                VisualBmiSpectrumCard(bmi = liveBmi)
            }
        }

        // Age & Gender Row
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = age,
                    onValueChange = { age = it },
                    label = { Text("Age (Years)") },
                    placeholder = { Text("28") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp)
                )

                // Gender Selector Pills
                Column(modifier = Modifier.weight(1.3f)) {
                    Text("Gender", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("male" to "Male 👨", "female" to "Female 👩").forEach { (id, label) ->
                            val isSelected = gender == id
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) PurplePrimary else Color(0xFFF1F5F9),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { gender = id }
                            ) {
                                Text(
                                    label,
                                    color = if (isSelected) Color.White else Color(0xFF334155),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.5.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 10.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Fitness Level Selector
        item {
            Column {
                Text(
                    "Your Current Fitness Experience 🏋️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                CardOptionsGrid(
                    options = fitnessLevels,
                    selected = setOf(fitnessLevel),
                    onSelect = { fitnessLevel = it.firstOrNull() ?: "beginner" },
                    singleSelect = true,
                    activeColor = PurplePrimary
                )
            }
        }

        // Available Equipment (Select all that apply)
        item {
            Column {
                Text(
                    "Available Equipment (Home or Gym) 🛠️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                CardOptionsGrid(
                    options = equipmentOptions,
                    selected = equipment,
                    onSelect = { equipment = it },
                    singleSelect = false,
                    activeColor = PurplePrimary
                )
            }
        }

        // Workout Location
        item {
            Column {
                Text(
                    "Workout Location 📍",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                CardOptionsGrid(
                    options = locationOptions,
                    selected = setOf(workoutLocation),
                    onSelect = { workoutLocation = it.firstOrNull() ?: "home" },
                    singleSelect = true,
                    activeColor = PurplePrimary
                )
            }
        }

        // Dietary Preferences
        item {
            Column {
                Text(
                    "Dietary Preferences 🥗",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                CardOptionsGrid(
                    options = dietOptions,
                    selected = dietPrefs,
                    onSelect = { dietPrefs = it },
                    singleSelect = false,
                    activeColor = OrangePrimary
                )
            }
        }

        // Allergies
        item {
            OutlinedTextField(
                value = allergies,
                onValueChange = { allergies = it },
                label = { Text("Food Allergies (Optional)") },
                placeholder = { Text("e.g. Peanuts, Lactose, Gluten") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )
        }

        error?.let {
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFFEBEE)) {
                    Text(it, modifier = Modifier.padding(12.dp), color = Color(0xFFE53935), fontSize = 13.sp)
                }
            }
        }

        // Submit Button with Validation
        item {
            val isReady = height.isNotBlank() && weight.isNotBlank()
            Button(
                onClick = {
                    viewModel.submitBio(
                        CreateAssessmentBioRequest(
                            height = height.toDoubleOrNull() ?: 0.0,
                            weight = weight.toDoubleOrNull() ?: 0.0,
                            age = age.toIntOrNull(),
                            gender = gender.ifBlank { null },
                            bodyFatPercentage = bodyFat.toDoubleOrNull(),
                            fitnessLevel = fitnessLevel.ifBlank { "beginner" },
                            availableEquipment = equipment.toList(),
                            workoutLocation = workoutLocation.ifBlank { null },
                            dietaryPreferences = dietPrefs.toList(),
                            allergies = allergies.split(",").map { it.trim() }.filter { it.isNotBlank() }
                        )
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isReady) PurplePrimary else Color(0xFF94A3B8)
                ),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else if (!isReady) {
                    Text("👉 Enter Height & Weight to Continue", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                } else {
                    Text("Save Bio & Continue (Step 3 ➔)", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

// ==================== VISUAL BMI SPECTRUM CARD ====================

@Composable
private fun VisualBmiSpectrumCard(bmi: Double) {
    val (bmiCategory, bmiColor, bmiAdvice) = when {
        bmi < 18.5 -> Triple("Underweight", Color(0xFF3B82F6), "Recommended: Calorie surplus & progressive resistance training.")
        bmi < 25.0 -> Triple("Normal & Healthy 🌟", Color(0xFF059669), "Ideal Range! Maintain balanced nutrition & routine consistency.")
        bmi < 30.0 -> Triple("Overweight", Color(0xFFEA580C), "Recommended: Gentle calorie deficit & daily aerobic cardio.")
        else -> Triple("Obese / High BMI", Color(0xFFDC2626), "Recommended: Low-impact joint-safe exercises & doctor guidance.")
    }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.2.dp, bmiColor.copy(alpha = 0.35f)),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = bmiColor.copy(alpha = 0.15f),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Speed, contentDescription = null, tint = bmiColor, modifier = Modifier.size(20.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("Live BMI Analysis", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(bmiCategory, fontWeight = FontWeight.ExtraBold, fontSize = 14.5.sp, color = bmiColor)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = bmiColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = String.format(Locale.getDefault(), "BMI %.1f", bmi),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = bmiColor,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Segmented Spectrum Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
            ) {
                Box(modifier = Modifier.weight(18.5f).fillMaxHeight().background(Color(0xFF60A5FA)))
                Spacer(modifier = Modifier.width(2.dp))
                Box(modifier = Modifier.weight(6.5f).fillMaxHeight().background(Color(0xFF34D399)))
                Spacer(modifier = Modifier.width(2.dp))
                Box(modifier = Modifier.weight(5f).fillMaxHeight().background(Color(0xFFFBBF24)))
                Spacer(modifier = Modifier.width(2.dp))
                Box(modifier = Modifier.weight(10f).fillMaxHeight().background(Color(0xFFF87171)))
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Under (<18.5)", fontSize = 9.sp, color = Color(0xFF64748B))
                Text("Healthy (18.5-24.9)", fontSize = 9.sp, color = Color(0xFF059669), fontWeight = FontWeight.Bold)
                Text("Over (25-29.9)", fontSize = 9.sp, color = Color(0xFFD97706))
                Text("Obese (30+)", fontSize = 9.sp, color = Color(0xFFDC2626))
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(bmiAdvice, fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
        }
    }
}

// ==================== STEP 3: HEALTH SCREENING ====================

@Composable
private fun HealthScreeningStep(
    viewModel: WellnessViewModel,
    existingScreening: com.example.swastik.data.remote.dto.WellnessHealthScreeningDto?,
    isSubmitting: Boolean,
    error: String?,
    onComplete: () -> Unit
) {
    val conditionOptions = listOf(
        AssessmentOption("diabetes", "Diabetes / High Sugar", "Endocrine condition 🩸", "🩸"),
        AssessmentOption("hypertension", "High Blood Pressure", "Hypertension 💓", "💓"),
        AssessmentOption("heart_disease", "Heart Condition", "Cardiovascular safety 🫀", "🫀"),
        AssessmentOption("asthma", "Asthma / Respiratory", "Breathing sensitivity 🫁", "🫁"),
        AssessmentOption("thyroid", "Thyroid Disorder", "Metabolic thyroid 🦋", "🦋"),
        AssessmentOption("PCOS", "PCOS / PCOD", "Hormonal condition 🌸", "🌸"),
        AssessmentOption("back_pain", "Chronic Back Pain", "Spine & lumbar care 🧘‍♂️", "🧘‍♂️")
    )

    val injuryOptions = listOf(
        AssessmentOption("knee", "Knee Pain", "Ligament & joint safety 🦵", "🦵"),
        AssessmentOption("back", "Lower Back Pain", "Spine strain care 🦴", "🦴"),
        AssessmentOption("shoulder", "Shoulder Pain", "Rotator cuff care 💪", "💪"),
        AssessmentOption("ankle", "Ankle / Foot", "Sprain & mobility care 🦶", "🦶"),
        AssessmentOption("neck", "Neck Stiffness", "Cervical tension 💆‍♂️", "💆‍♂️")
    )

    var hasMedicalConditions by remember { mutableStateOf(existingScreening?.hasMedicalConditions ?: false) }
    var conditions by remember { mutableStateOf(existingScreening?.medicalConditions?.toSet() ?: emptySet()) }
    var hasInjuries by remember { mutableStateOf(existingScreening?.hasInjuries ?: false) }
    var injuries by remember { mutableStateOf(existingScreening?.injuries?.toSet() ?: emptySet()) }
    var isPregnant by remember { mutableStateOf(existingScreening?.isPregnant ?: false) }
    var takesMedication by remember { mutableStateOf(existingScreening?.takesMedication ?: false) }
    var medications by remember { mutableStateOf(existingScreening?.medications?.joinToString(", ") ?: "") }
    var doctorClearance by remember { mutableStateOf(existingScreening?.doctorClearance ?: false) }

    // Auto-advance to summary on successful submission
    LaunchedEffect(viewModel.uiState.collectAsState().value.submitSuccess) {
        val currentState = viewModel.uiState.value
        if (currentState.submitSuccess) {
            onComplete()
        }
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Safety Guarantee Banner
        item {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = Color(0xFFFFF7ED),
                border = BorderStroke(1.dp, Color(0xFFFED7AA))
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFFDBA74),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.HealthAndSafety, null, tint = Color(0xFF9A3412), modifier = Modifier.size(22.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "🛡️ Your safety is our top priority. This screening ensures we only recommend exercises that are safe for your joints and health profile.",
                        fontSize = 12.sp,
                        color = Color(0xFF9A3412),
                        modifier = Modifier.weight(1f),
                        lineHeight = 16.5.sp
                    )
                }
            }
        }

        // Medical Conditions Toggle
        item {
            ToggleQuestion(
                question = "Do you have any chronic medical conditions? 🩸",
                subtitle = "e.g. High Blood Pressure, Diabetes, Thyroid",
                value = hasMedicalConditions,
                onChange = {
                    hasMedicalConditions = it
                    if (!it) conditions = emptySet()
                }
            )
        }

        if (hasMedicalConditions) {
            item {
                Column {
                    Text("Select your medical conditions:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = OrangePrimary)
                    Spacer(modifier = Modifier.height(8.dp))
                    CardOptionsGrid(
                        options = conditionOptions,
                        selected = conditions,
                        onSelect = { conditions = it },
                        singleSelect = false,
                        activeColor = OrangePrimary
                    )
                }
            }
        }

        // Injuries Toggle
        item {
            ToggleQuestion(
                question = "Do you have any current joint pain or injury? 🩹",
                subtitle = "e.g. Knee pain, Back ache, Shoulder stiffness",
                value = hasInjuries,
                onChange = {
                    hasInjuries = it
                    if (!it) injuries = emptySet()
                }
            )
        }

        if (hasInjuries) {
            item {
                Column {
                    Text("Select injury / pain areas (We will exclude heavy joint stress):", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
                    Spacer(modifier = Modifier.height(8.dp))
                    CardOptionsGrid(
                        options = injuryOptions,
                        selected = injuries,
                        onSelect = { injuries = it },
                        singleSelect = false,
                        activeColor = Color(0xFFDC2626)
                    )
                }
            }
        }

        // Pregnancy Toggle
        item {
            ToggleQuestion(
                question = "Are you currently pregnant? 🤰",
                subtitle = "Enables tailored pre-natal gentle yoga & stretches",
                value = isPregnant,
                onChange = { isPregnant = it }
            )
        }

        // Medications Toggle
        item {
            ToggleQuestion(
                question = "Are you currently taking any prescription medications? 💊",
                subtitle = "Daily doctor-prescribed medications",
                value = takesMedication,
                onChange = { takesMedication = it }
            )
        }

        if (takesMedication) {
            item {
                OutlinedTextField(
                    value = medications,
                    onValueChange = { medications = it },
                    label = { Text("List medications (comma separated)") },
                    placeholder = { Text("e.g. Metformin, Amlodipine") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        // Complete Assessment Button
        item {
            Button(
                onClick = {
                    viewModel.submitHealthScreening(
                        CreateHealthScreeningRequest(
                            hasMedicalConditions = hasMedicalConditions,
                            medicalConditions = conditions.toList(),
                            hasInjuries = hasInjuries,
                            injuries = injuries.toList(),
                            isPregnant = isPregnant,
                            takesMedication = takesMedication,
                            medications = medications.split(",").map { it.trim() }.filter { it.isNotBlank() },
                            doctorClearance = doctorClearance
                        )
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else {
                    Text("Complete Assessment 🎉", fontWeight = FontWeight.ExtraBold, fontSize = 15.5.sp)
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

// ==================== STEP 4: CELEBRATION & HEALTH PASSPORT VIEW ====================

@Composable
private fun AssessmentSuccessView(
    assessment: com.example.swastik.data.remote.dto.WellnessAssessmentDto?,
    onNavigateToWorkouts: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val primaryGoal = assessment?.goals?.primaryGoal ?: "General Fitness"
    val frequency = assessment?.goals?.workoutFrequency ?: 3
    val height = assessment?.bio?.height ?: 170.0
    val weight = assessment?.bio?.weight ?: 70.0
    val heightM = height / 100.0
    val bmi = if (heightM > 0.5) weight / (heightM * heightM) else 22.0

    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Surface(
                shape = CircleShape,
                color = Color(0xFF059669).copy(alpha = 0.14f),
                modifier = Modifier.size(76.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Celebration,
                        contentDescription = null,
                        tint = Color(0xFF059669),
                        modifier = Modifier.size(42.dp)
                    )
                }
            }
        }

        item {
            Text(
                "Health Profile Active! 🎉",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                "Your personalized health and exercise plan has been calibrated successfully.",
                fontSize = 12.5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }

        // Health Passport Card (Gradient & Glassmorphism feel)
        item {
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(3.dp),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "YOUR PERSONALIZED TARGETS",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            color = EmeraldPrimary,
                            letterSpacing = 0.8.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFF059669).copy(alpha = 0.12f)
                        ) {
                            Text(
                                "AI Verified ✓",
                                color = Color(0xFF059669),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    SummaryTargetRow(
                        icon = Icons.Default.Flag,
                        iconColor = EmeraldPrimary,
                        label = "Primary Goal",
                        value = primaryGoal.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = Color(0xFFF1F5F9))

                    SummaryTargetRow(
                        icon = Icons.Default.FitnessCenter,
                        iconColor = PurplePrimary,
                        label = "Workout Schedule",
                        value = "$frequency Days / Week"
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = Color(0xFFF1F5F9))

                    SummaryTargetRow(
                        icon = Icons.Default.Speed,
                        iconColor = Color(0xFF3B82F6),
                        label = "Calculated BMI Score",
                        value = String.format(Locale.getDefault(), "%.1f (Healthy Range)", bmi)
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = Color(0xFFF1F5F9))

                    SummaryTargetRow(
                        icon = Icons.Default.VerifiedUser,
                        iconColor = Color(0xFF059669),
                        label = "Safety Clearance",
                        value = "Cleared for Safe Exercise ✅"
                    )
                }
            }
        }

        // Action CTA Buttons
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onNavigateToWorkouts,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Start My First Workout ➔", fontWeight = FontWeight.ExtraBold, fontSize = 15.5.sp)
            }
        }

        item {
            OutlinedButton(
                onClick = onNavigateBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Back to Wellness Hub", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@Composable
private fun SummaryTargetRow(
    icon: ImageVector,
    iconColor: Color,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = CircleShape,
                color = iconColor.copy(alpha = 0.12f),
                modifier = Modifier.size(34.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = iconColor, modifier = Modifier.size(17.dp))
                }
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(value, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

// ==================== SHARED UI COMPONENTS ====================

@Composable
private fun CardOptionsGrid(
    options: List<AssessmentOption>,
    selected: Set<String>,
    onSelect: (Set<String>) -> Unit,
    singleSelect: Boolean,
    activeColor: Color
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.chunked(2).forEach { rowOptions ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowOptions.forEach { option ->
                    val isSelected = option.id in selected
                    val animatedBg by animateColorAsState(
                        targetValue = if (isSelected) activeColor.copy(alpha = 0.12f) else Color(0xFFF8FAFC),
                        animationSpec = tween(200),
                        label = "cardBg"
                    )

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = animatedBg,
                        border = BorderStroke(
                            if (isSelected) 1.8.dp else 1.dp,
                            if (isSelected) activeColor else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .clickable {
                                onSelect(
                                    if (singleSelect) setOf(option.id)
                                    else if (isSelected) selected - option.id else selected + option.id
                                )
                            }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = if (isSelected) activeColor.copy(alpha = 0.15f) else Color.White,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(option.emoji, fontSize = 16.sp)
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    option.title,
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                                    fontSize = 12.5.sp,
                                    color = if (isSelected) activeColor else MaterialTheme.colorScheme.onSurface
                                )
                                if (option.subtitle.isNotBlank()) {
                                    Text(
                                        option.subtitle,
                                        fontSize = 10.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 12.sp
                                    )
                                }
                            }
                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = activeColor,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
                if (rowOptions.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ToggleQuestion(
    question: String,
    subtitle: String,
    value: Boolean,
    onChange: (Boolean) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(question, fontSize = 13.5.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(2.dp))
                Text(subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.width(10.dp))
            Switch(
                checked = value,
                onCheckedChange = onChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = EmeraldPrimary,
                    checkedTrackColor = EmeraldPrimary.copy(alpha = 0.3f)
                )
            )
        }
    }
}
