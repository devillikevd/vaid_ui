package com.example.swastik.ui.screens.patient.wellness

import androidx.compose.animation.animateContentSize
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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

private val AssessmentGreen = Color(0xFF047857)
private val AssessmentPurple = Color(0xFF6A5AE0)
private val AssessmentOrange = Color(0xFFE65100)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessAssessmentScreen(
    onNavigateBack: () -> Unit,
    viewModel: WellnessViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var currentStep by remember { mutableIntStateOf(0) } // 0=Overview, 1=Goals, 2=Bio, 3=Health

    // Check if assessment already completed
    val assessment = state.assessment
    val isCompleted = assessment?.status == "completed"

    // Reset submit state on enter
    LaunchedEffect(Unit) { viewModel.clearSubmitState() }

    // Load existing assessment on first composition
    LaunchedEffect(Unit) { viewModel.refreshAssessment() }

    // Auto-advance on successful submission
    LaunchedEffect(state.submitSuccess) {
        if (state.submitSuccess) {
            if (currentStep < 3) currentStep++
            viewModel.clearSubmitState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (currentStep) {
                            0 -> "Wellness Assessment"
                            1 -> "Step 1: Goals"
                            2 -> "Step 2: Bio & Equipment"
                            3 -> "Step 3: Health Screening"
                            else -> "Assessment"
                        },
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep > 0) currentStep-- else onNavigateBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFE8F8EF))
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Progress indicator
            if (currentStep > 0) {
                LinearProgressIndicator(
                    progress = { currentStep / 3f },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    color = AssessmentGreen,
                    trackColor = AssessmentGreen.copy(alpha = 0.1f)
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
                    onComplete = onNavigateBack
                )
            }
        }
    }
}

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
        // Hero
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(listOf(AssessmentGreen, Color(0xFF14532D))))
                        .padding(20.dp)
                ) {
                    Text(
                        if (isCompleted) "Assessment Complete ✓" else "Get Started",
                        color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        "Complete your wellness assessment to get personalized workout plans, nutrition guidance, and expert-matched coaching.",
                        color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp, lineHeight = 18.sp
                    )
                }
            }
        }

        // Steps overview
        item {
            AssessmentStepCard(
                stepNumber = 1,
                title = "Fitness Goals",
                description = "Set your primary goal, target weight, workout frequency, and preferred training types.",
                icon = Icons.Default.Flag,
                color = AssessmentGreen,
                isComplete = assessment?.goals != null
            )
        }
        item {
            AssessmentStepCard(
                stepNumber = 2,
                title = "Bio & Equipment",
                description = "Your body measurements, fitness level, available equipment, dietary preferences, and allergies.",
                icon = Icons.Default.Person,
                color = AssessmentPurple,
                isComplete = assessment?.bio != null
            )
        }
        item {
            AssessmentStepCard(
                stepNumber = 3,
                title = "Health Screening",
                description = "Medical conditions, injuries, medications, and pre-exercise safety screening (PAR-Q).",
                icon = Icons.Default.LocalHospital,
                color = AssessmentOrange,
                isComplete = assessment?.healthScreening != null
            )
        }

        // Start / Continue button
        item {
            Button(
                onClick = onStartAssessment,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AssessmentGreen)
            ) {
                Text(
                    if (isCompleted) "Update Assessment" else if (assessment != null) "Continue Assessment" else "Start Assessment",
                    fontWeight = FontWeight.Bold, fontSize = 16.sp
                )
            }
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
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = if (isComplete) Color(0xFF4CAF50).copy(alpha = 0.15f) else color.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isComplete) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(26.dp))
                    } else {
                        Icon(icon, null, tint = color, modifier = Modifier.size(26.dp))
                    }
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("Step $stepNumber: $title", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
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
    val goalOptions = listOf("weight_loss", "muscle_gain", "endurance", "flexibility", "general_fitness", "stress_relief", "rehabilitation")
    val activityLevels = listOf("sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active")
    val workoutTypes = listOf("strength", "cardio", "yoga", "HIIT", "pilates", "swimming", "running", "cycling", "CrossFit", "martial_arts")
    val timeOptions = listOf("morning", "afternoon", "evening", "night")

    var primaryGoal by remember { mutableStateOf(existingGoals?.primaryGoal ?: "") }
    var secondaryGoals by remember { mutableStateOf(existingGoals?.secondaryGoals?.toSet() ?: emptySet()) }
    var targetWeight by remember { mutableStateOf(existingGoals?.targetWeight?.toString() ?: "") }
    var activityLevel by remember { mutableStateOf(existingGoals?.activityLevel ?: "") }
    var workoutFrequency by remember { mutableStateOf(existingGoals?.workoutFrequency?.toString() ?: "3") }
    var preferredTime by remember { mutableStateOf(existingGoals?.preferredWorkoutTime ?: "") }
    var selectedWorkoutTypes by remember { mutableStateOf(existingGoals?.preferredWorkoutTypes?.toSet() ?: emptySet()) }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("What's your primary fitness goal?", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = goalOptions,
                selected = setOf(primaryGoal),
                onSelect = { primaryGoal = it.first() },
                singleSelect = true,
                color = AssessmentGreen
            )
        }

        item {
            Text("Secondary goals (optional)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = goalOptions.filter { it != primaryGoal },
                selected = secondaryGoals,
                onSelect = { secondaryGoals = it },
                singleSelect = false,
                color = AssessmentPurple
            )
        }

        item {
            OutlinedTextField(
                value = targetWeight,
                onValueChange = { targetWeight = it },
                label = { Text("Target Weight (kg)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                shape = RoundedCornerShape(14.dp)
            )
        }

        item {
            Text("Activity Level", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = activityLevels,
                selected = setOf(activityLevel),
                onSelect = { activityLevel = it.first() },
                singleSelect = true,
                color = AssessmentGreen
            )
        }

        item {
            OutlinedTextField(
                value = workoutFrequency,
                onValueChange = { workoutFrequency = it },
                label = { Text("Workouts per week") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(14.dp)
            )
        }

        item {
            Text("Preferred workout time", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = timeOptions,
                selected = setOf(preferredTime),
                onSelect = { preferredTime = it.first() },
                singleSelect = true,
                color = AssessmentGreen
            )
        }

        item {
            Text("Preferred workout types", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = workoutTypes,
                selected = selectedWorkoutTypes,
                onSelect = { selectedWorkoutTypes = it },
                singleSelect = false,
                color = AssessmentPurple
            )
        }

        error?.let {
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFFEBEE)) {
                    Text(it, modifier = Modifier.padding(12.dp), color = Color(0xFFE53935), fontSize = 13.sp)
                }
            }
        }

        item {
            Button(
                onClick = {
                    viewModel.submitGoals(
                        CreateAssessmentGoalsRequest(
                            primaryGoal = primaryGoal,
                            secondaryGoals = secondaryGoals.toList(),
                            targetWeight = targetWeight.toDoubleOrNull(),
                            activityLevel = activityLevel.ifBlank { "moderately_active" },
                            workoutFrequency = workoutFrequency.toIntOrNull() ?: 3,
                            preferredWorkoutTime = preferredTime.ifBlank { null },
                            preferredWorkoutTypes = selectedWorkoutTypes.toList()
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AssessmentGreen),
                enabled = primaryGoal.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                else Text("Save Goals & Continue", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
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
    val fitnessLevels = listOf("beginner", "intermediate", "advanced", "athlete")
    val equipmentOptions = listOf("dumbbells", "barbell", "kettlebell", "resistance_bands", "pull_up_bar", "bench", "treadmill", "stationary_bike", "yoga_mat", "foam_roller", "cable_machine", "none")
    val locationOptions = listOf("home", "gym", "outdoor", "studio", "anywhere")
    val dietOptions = listOf("vegetarian", "vegan", "non_vegetarian", "eggetarian", "pescatarian", "keto", "paleo", "gluten_free")

    var height by remember { mutableStateOf(existingBio?.height?.toString() ?: "") }
    var weight by remember { mutableStateOf(existingBio?.weight?.toString() ?: "") }
    var age by remember { mutableStateOf(existingBio?.age?.toString() ?: "") }
    var gender by remember { mutableStateOf(existingBio?.gender ?: "") }
    var bodyFat by remember { mutableStateOf(existingBio?.bodyFatPercentage?.toString() ?: "") }
    var fitnessLevel by remember { mutableStateOf(existingBio?.fitnessLevel ?: "") }
    var equipment by remember { mutableStateOf(existingBio?.availableEquipment?.toSet() ?: emptySet()) }
    var workoutLocation by remember { mutableStateOf(existingBio?.workoutLocation ?: "") }
    var dietPrefs by remember { mutableStateOf(existingBio?.dietaryPreferences?.toSet() ?: emptySet()) }
    var allergies by remember { mutableStateOf(existingBio?.allergies?.joinToString(", ") ?: "") }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = height, onValueChange = { height = it },
                    label = { Text("Height (cm)") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedTextField(
                    value = weight, onValueChange = { weight = it },
                    label = { Text("Weight (kg)") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = age, onValueChange = { age = it },
                    label = { Text("Age") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedTextField(
                    value = bodyFat, onValueChange = { bodyFat = it },
                    label = { Text("Body Fat %") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        item {
            Text("Gender", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = listOf("male", "female", "other"),
                selected = setOf(gender),
                onSelect = { gender = it.first() },
                singleSelect = true,
                color = AssessmentPurple
            )
        }

        item {
            Text("Fitness Level", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = fitnessLevels,
                selected = setOf(fitnessLevel),
                onSelect = { fitnessLevel = it.first() },
                singleSelect = true,
                color = AssessmentGreen
            )
        }

        item {
            Text("Available Equipment", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = equipmentOptions,
                selected = equipment,
                onSelect = { equipment = it },
                singleSelect = false,
                color = AssessmentGreen
            )
        }

        item {
            Text("Workout Location", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = locationOptions,
                selected = setOf(workoutLocation),
                onSelect = { workoutLocation = it.first() },
                singleSelect = true,
                color = AssessmentPurple
            )
        }

        item {
            Text("Dietary Preferences", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            FlowChipSelector(
                options = dietOptions,
                selected = dietPrefs,
                onSelect = { dietPrefs = it },
                singleSelect = false,
                color = AssessmentOrange
            )
        }

        item {
            OutlinedTextField(
                value = allergies, onValueChange = { allergies = it },
                label = { Text("Allergies (comma separated)") },
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

        item {
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
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AssessmentPurple),
                enabled = height.isNotBlank() && weight.isNotBlank() && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                else Text("Save Bio & Continue", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
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
    val conditionOptions = listOf("diabetes", "hypertension", "heart_disease", "asthma", "arthritis", "thyroid", "PCOS", "back_pain", "obesity", "none")
    val injuryOptions = listOf("knee", "shoulder", "back", "ankle", "wrist", "hip", "neck", "elbow", "none")

    var hasMedicalConditions by remember { mutableStateOf(existingScreening?.hasMedicalConditions ?: false) }
    var conditions by remember { mutableStateOf(existingScreening?.medicalConditions?.toSet() ?: emptySet()) }
    var hasInjuries by remember { mutableStateOf(existingScreening?.hasInjuries ?: false) }
    var injuries by remember { mutableStateOf(existingScreening?.injuries?.toSet() ?: emptySet()) }
    var isPregnant by remember { mutableStateOf(existingScreening?.isPregnant ?: false) }
    var takesMedication by remember { mutableStateOf(existingScreening?.takesMedication ?: false) }
    var medications by remember { mutableStateOf(existingScreening?.medications?.joinToString(", ") ?: "") }
    var doctorClearance by remember { mutableStateOf(existingScreening?.doctorClearance ?: false) }

    // Auto-complete success
    LaunchedEffect(viewModel.uiState.collectAsState().value.submitSuccess) {
        val currentState = viewModel.uiState.value
        if (currentState.submitSuccess && currentState.assessment?.healthScreening != null) {
            onComplete()
        }
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFFFF3E0)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.HealthAndSafety, null, tint = AssessmentOrange, modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "This information helps ensure your safety during exercise. All data is kept confidential.",
                        fontSize = 12.sp, color = Color(0xFF795548), modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Medical conditions
        item {
            ToggleQuestion("Do you have any medical conditions?", hasMedicalConditions) { hasMedicalConditions = it }
        }
        if (hasMedicalConditions) {
            item {
                FlowChipSelector(
                    options = conditionOptions,
                    selected = conditions,
                    onSelect = { conditions = it },
                    singleSelect = false,
                    color = AssessmentOrange
                )
            }
        }

        // Injuries
        item {
            ToggleQuestion("Do you have any current injuries?", hasInjuries) { hasInjuries = it }
        }
        if (hasInjuries) {
            item {
                FlowChipSelector(
                    options = injuryOptions,
                    selected = injuries,
                    onSelect = { injuries = it },
                    singleSelect = false,
                    color = Color(0xFFE53935)
                )
            }
        }

        // Pregnancy
        item {
            ToggleQuestion("Are you pregnant?", isPregnant) { isPregnant = it }
        }

        // Medications
        item {
            ToggleQuestion("Do you take any medication?", takesMedication) { takesMedication = it }
        }
        if (takesMedication) {
            item {
                OutlinedTextField(
                    value = medications, onValueChange = { medications = it },
                    label = { Text("List medications (comma separated)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        // Doctor clearance
        item {
            ToggleQuestion("Do you have doctor clearance for exercise?", doctorClearance) { doctorClearance = it }
        }

        error?.let {
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFFEBEE)) {
                    Text(it, modifier = Modifier.padding(12.dp), color = Color(0xFFE53935), fontSize = 13.sp)
                }
            }
        }

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
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AssessmentOrange),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                else Text("Complete Assessment", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

// ==================== SHARED COMPONENTS ====================

@Composable
private fun ToggleQuestion(question: String, value: Boolean, onChange: (Boolean) -> Unit) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(question, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Switch(
                checked = value,
                onCheckedChange = onChange,
                colors = SwitchDefaults.colors(checkedThumbColor = AssessmentGreen, checkedTrackColor = AssessmentGreen.copy(alpha = 0.3f))
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowChipSelector(
    options: List<String>,
    selected: Set<String>,
    onSelect: (Set<String>) -> Unit,
    singleSelect: Boolean,
    color: Color
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEach { option ->
            val isSelected = option in selected
            FilterChip(
                selected = isSelected,
                onClick = {
                    onSelect(
                        if (singleSelect) setOf(option)
                        else if (isSelected) selected - option else selected + option
                    )
                },
                label = {
                    Text(
                        option.replace("_", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } },
                        fontSize = 12.sp
                    )
                },
                leadingIcon = if (isSelected) {{ Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }} else null,
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = color.copy(alpha = 0.15f),
                    selectedLabelColor = color,
                    selectedLeadingIconColor = color
                )
            )
        }
    }
}
